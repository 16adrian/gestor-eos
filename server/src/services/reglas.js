// Reglas de negocio y validaciones de cada tabla, ANTES de grabar en la base de datos.
// `validar(cuerpo, actual)` recibe lo que mandó el formulario (y el registro actual si
// es una edición) y devuelve solo los datos limpios y permitidos. Si algo está mal,
// `revisar` lanza un error 400 con el motivo de cada campo.
const { consultar } = require('../config/db');
const { calcularPerdida } = require('./perdidas');
const {
  validarRuc, validarIdentificacion, validarSerie, esFechaFutura, revisar,
} = require('../utils/validaciones');

// ---------- Ayudas para limpiar lo que llega del formulario ----------
const texto = (v) => (v === undefined || v === null ? '' : String(v).trim());
const numero = (v) => (texto(v) === '' ? null : Number(v));
const booleano = (v) => v === true || v === 'true' || v === 'si';
const vacioANull = (v) => (texto(v) === '' ? null : texto(v));

function exigirTexto(errores, campo, valor, etiqueta) {
  if (!valor) errores[campo] = `${etiqueta} es obligatorio`;
}

function exigirFecha(errores, campo, valor) {
  if (!valor) errores[campo] = 'La fecha es obligatoria';
  else if (Number.isNaN(Date.parse(valor))) errores[campo] = 'Fecha inválida';
  else if (esFechaFutura(valor)) errores[campo] = 'La fecha no puede ser futura';
}

async function existe(tabla, id) {
  if (!id) return false;
  const filas = await consultar(`SELECT 1 FROM ${tabla} WHERE id = $1`, [id]);
  return filas.length > 0;
}

// Para catálogos que solo tienen nombre (marcas, tipos, piezas)
function soloNombre(cuerpo) {
  const datos = { nombre: texto(cuerpo.nombre) };
  const errores = {};
  exigirTexto(errores, 'nombre', datos.nombre, 'El nombre');
  revisar(errores);
  return datos;
}

module.exports = {
  marcas: { validar: soloNombre },
  'tipos-equipo': { validar: soloNombre },
  piezas: { validar: soloNombre },

  // 🚨 DATO SENSIBLE: RUC de la empresa cliente
  empresas: {
    validar(cuerpo) {
      const datos = {
        nombre: texto(cuerpo.nombre).toUpperCase(),
        ruc: texto(cuerpo.ruc),
        activa: cuerpo.activa === undefined ? true : booleano(cuerpo.activa),
      };
      const errores = {};
      exigirTexto(errores, 'nombre', datos.nombre, 'El nombre');
      const errorRuc = validarRuc(datos.ruc);
      if (errorRuc) errores.ruc = errorRuc;
      revisar(errores);
      return datos;
    },
  },

  modelos: {
    async validar(cuerpo) {
      const datos = {
        marca_id: numero(cuerpo.marca_id),
        tipo_id: numero(cuerpo.tipo_id),
        nombre: texto(cuerpo.nombre),
        costo_compra: numero(cuerpo.costo_compra),
        costo_estimado: booleano(cuerpo.costo_estimado),
      };
      const errores = {};
      if (!(await existe('marcas', datos.marca_id))) errores.marca_id = 'Elige una marca de la lista';
      if (!(await existe('tipos_equipo', datos.tipo_id))) errores.tipo_id = 'Elige un tipo de la lista';
      exigirTexto(errores, 'nombre', datos.nombre, 'El nombre');
      if (!(datos.costo_compra > 0)) errores.costo_compra = 'El costo debe ser mayor a 0';
      revisar(errores);
      return datos;
    },
  },

  coberturas: {
    async validar(cuerpo) {
      const datos = {
        marca_id: numero(cuerpo.marca_id),
        pieza_id: numero(cuerpo.pieza_id),
        cubre: booleano(cuerpo.cubre),
        costo_min: numero(cuerpo.costo_min),
        costo_max: numero(cuerpo.costo_max),
      };
      const errores = {};
      if (!(await existe('marcas', datos.marca_id))) errores.marca_id = 'Elige una marca de la lista';
      if (!(await existe('piezas', datos.pieza_id))) errores.pieza_id = 'Elige una pieza de la lista';
      if (datos.costo_min !== null && datos.costo_min < 0) errores.costo_min = 'No puede ser negativo';
      if (datos.costo_min !== null && datos.costo_max !== null && datos.costo_min > datos.costo_max) {
        errores.costo_max = 'El costo máximo debe ser mayor o igual al mínimo';
      }
      revisar(errores);
      return datos;
    },
  },

  equipos: {
    async validar(cuerpo, actual) {
      const datos = {
        serie: texto(cuerpo.serie).toUpperCase(),
        modelo_id: numero(cuerpo.modelo_id),
        empresa_id: numero(cuerpo.empresa_id),
        tarifa_mensual: numero(cuerpo.tarifa_mensual),
        fecha_entrega: vacioANull(cuerpo.fecha_entrega),
        n_factura: vacioANull(cuerpo.n_factura),
        estado: actual ? texto(cuerpo.estado) || actual.estado : 'activo',
        // fecha_vencimiento NO se acepta: la calcula PostgreSQL (entrega + 36 meses)
      };
      const errores = {};
      const errorSerie = validarSerie(datos.serie);
      if (errorSerie) errores.serie = errorSerie;

      // El modelo debe existir y pertenecer a la marca y al tipo elegidos
      const [modelo] = datos.modelo_id
        ? await consultar('SELECT marca_id, tipo_id FROM modelos WHERE id = $1', [datos.modelo_id]) : [];
      if (!modelo) errores.modelo_id = 'Elige un modelo de la lista';
      else if (cuerpo.marca_id && Number(cuerpo.marca_id) !== modelo.marca_id) errores.modelo_id = 'El modelo no pertenece a la marca elegida';
      else if (cuerpo.tipo_id && Number(cuerpo.tipo_id) !== modelo.tipo_id) errores.modelo_id = 'El modelo no es del tipo elegido';

      if (!(await existe('empresas', datos.empresa_id))) errores.empresa_id = 'Elige una empresa de la lista';
      if (!(datos.tarifa_mensual > 0 && datos.tarifa_mensual <= 1000)) errores.tarifa_mensual = 'La tarifa debe estar entre $0,01 y $1.000';
      exigirFecha(errores, 'fecha_entrega', datos.fecha_entrega);
      if (!['activo', 'vendido', 'robado', 'baja'].includes(datos.estado)) errores.estado = 'Estado no permitido';
      revisar(errores);
      return datos;
    },
  },

  incidentes: {
    async validar(cuerpo) {
      const datos = {
        equipo_id: numero(cuerpo.equipo_id),
        pieza_id: numero(cuerpo.pieza_id),
        tipo: texto(cuerpo.tipo),
        fecha: vacioANull(cuerpo.fecha),
        descripcion: texto(cuerpo.descripcion).slice(0, 250),
        estado: texto(cuerpo.estado) || 'abierto',
        recuperado: numero(cuerpo.recuperado) || 0,
      };
      const errores = {};
      const [equipo] = datos.equipo_id
        ? await consultar('SELECT marca_id, costo_compra FROM v_equipos WHERE id = $1', [datos.equipo_id]) : [];
      if (!equipo) errores.equipo_id = 'Elige un equipo de la lista';
      if (!['garantia', 'robo'].includes(datos.tipo)) errores.tipo = 'Elige garantía o robo';
      if (datos.tipo === 'garantia' && !(await existe('piezas', datos.pieza_id))) errores.pieza_id = 'En una garantía hay que elegir la pieza';
      if (datos.tipo === 'robo') datos.pieza_id = null;
      if (!['abierto', 'cerrado', 'rechazado'].includes(datos.estado)) errores.estado = 'Estado no permitido';
      if (datos.recuperado < 0) errores.recuperado = 'No puede ser negativo';
      exigirFecha(errores, 'fecha', datos.fecha);
      revisar(errores);

      // El servidor calcula la pérdida; lo que mande el navegador se ignora.
      const [cobertura] = await consultar(
        'SELECT cubre, costo_min, costo_max FROM coberturas WHERE marca_id = $1 AND pieza_id = $2',
        [equipo.marca_id, datos.pieza_id],
      );
      return {
        ...datos,
        ...calcularPerdida({ ...datos, cobertura, costoEquipo: equipo.costo_compra }),
      };
    },
    // Un robo deja al equipo fuera de servicio
    async despuesDeGuardar(incidente) {
      if (incidente.tipo === 'robo') {
        await consultar("UPDATE equipos SET estado = 'robado' WHERE id = $1", [incidente.equipo_id]);
      }
    },
  },

  // 🚨 DATO SENSIBLE: cédula o RUC del comprador
  ventas: {
    async validar(cuerpo, actual) {
      const datos = {
        equipo_id: actual ? actual.equipo_id : numero(cuerpo.equipo_id), // el equipo no cambia al editar
        empresa_id: numero(cuerpo.empresa_id),
        comprador: texto(cuerpo.comprador),
        identificacion: texto(cuerpo.identificacion),
        condicion: texto(cuerpo.condicion) || 'usado',
        precio: numero(cuerpo.precio),
        fecha: vacioANull(cuerpo.fecha),
      };
      const errores = {};
      if (!actual) {
        const [equipo] = datos.equipo_id
          ? await consultar('SELECT estado FROM equipos WHERE id = $1', [datos.equipo_id]) : [];
        if (!equipo) errores.equipo_id = 'Elige un equipo de la lista';
        else if (equipo.estado !== 'activo') errores.equipo_id = `Este equipo está ${equipo.estado}, no se puede vender`;
      }
      if (datos.empresa_id && !(await existe('empresas', datos.empresa_id))) errores.empresa_id = 'Elige una empresa de la lista';
      exigirTexto(errores, 'comprador', datos.comprador, 'El comprador');
      const errorId = validarIdentificacion(datos.identificacion);
      if (errorId) errores.identificacion = errorId;
      if (!['nuevo', 'usado'].includes(datos.condicion)) errores.condicion = 'Elige nuevo o usado';
      if (!(datos.precio > 0)) errores.precio = 'El precio debe ser mayor a 0';
      exigirFecha(errores, 'fecha', datos.fecha);
      revisar(errores);
      return datos;
    },
    // Vender cambia el estado del equipo; anular la venta lo devuelve a activo
    async despuesDeGuardar(venta) {
      await consultar("UPDATE equipos SET estado = 'vendido' WHERE id = $1", [venta.equipo_id]);
    },
    async despuesDeEliminar(venta) {
      await consultar("UPDATE equipos SET estado = 'activo' WHERE id = $1", [venta.equipo_id]);
    },
  },
};
