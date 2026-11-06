// Modelo genérico: una sola clase sabe listar, buscar, filtrar, paginar, crear,
// editar y eliminar en cualquier tabla. Cada tabla solo describe sus columnas
// (ver models/index.js). Así no se repite el mismo SQL nueve veces (principio DRY).
const { consultar } = require('../config/db');
const ErrorApp = require('../utils/ErrorApp');

class Modelo {
  constructor({ tabla, vista, columnas, buscarEn = [], orden = 'id', etiqueta = 'nombre', filtros = {}, bajaLogica }) {
    this.tabla = tabla;              // tabla donde se graba
    this.vista = vista || tabla;     // de dónde se lee (las vistas traen nombres en vez de ids)
    this.columnas = columnas;        // columnas que se pueden grabar (lista blanca)
    this.buscarEn = buscarEn;        // columnas donde busca el cuadro "Buscar"
    this.orden = orden;
    this.etiqueta = etiqueta;        // texto que se muestra en los dropdowns
    this.filtros = filtros;          // filtros permitidos: { nombre: 'condición SQL con ?' }
    this.bajaLogica = bajaLogica;    // si existe, "eliminar" cambia el estado en vez de borrar
  }

  // Arma el WHERE con la búsqueda y los filtros que vengan en la URL (?marca_id=2&estado=activo)
  armarWhere(consulta) {
    const condiciones = [];
    const valores = [];

    if (consulta.q && this.buscarEn.length > 0) {
      valores.push(`%${consulta.q}%`);
      const columnas = this.buscarEn.map((c) => `${c}::text ILIKE $${valores.length}`);
      condiciones.push(`(${columnas.join(' OR ')})`);
    }

    for (const [nombre, condicion] of Object.entries(this.filtros)) {
      const valor = consulta[nombre];
      if (valor === undefined || valor === '') continue; // filtro no usado
      valores.push(valor);
      condiciones.push(condicion.replaceAll('?', `$${valores.length}`));
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
    return { where, valores };
  }

  async listar(consulta = {}) {
    const pagina = Math.max(Number(consulta.pagina) || 1, 1);
    const limite = Math.min(Number(consulta.limite) || 20, 100);
    const { where, valores } = this.armarWhere(consulta);

    const [{ total }] = await consultar(`SELECT COUNT(*)::int AS total FROM ${this.vista} ${where}`, valores);
    const filas = await consultar(
      `SELECT * FROM ${this.vista} ${where} ORDER BY ${this.orden}
       LIMIT ${limite} OFFSET ${(pagina - 1) * limite}`,
      valores,
    );
    return { filas, total, pagina, paginas: Math.max(Math.ceil(total / limite), 1) };
  }

  // Lista corta { id, nombre } para llenar un dropdown (acepta los mismos filtros)
  async opciones(consulta = {}) {
    const { where, valores } = this.armarWhere(consulta);
    return consultar(
      `SELECT id, ${this.etiqueta} AS nombre FROM ${this.vista} ${where} ORDER BY 2 LIMIT 2000`,
      valores,
    );
  }

  async obtener(id) {
    const [fila] = await consultar(`SELECT * FROM ${this.vista} WHERE id = $1`, [id]);
    if (!fila) throw new ErrorApp(404, 'Registro no encontrado');
    return fila;
  }

  async crear(datos) {
    const columnas = this.columnas.filter((c) => datos[c] !== undefined);
    const valores = columnas.map((c) => datos[c]);
    const marcadores = columnas.map((_, i) => `$${i + 1}`);
    const [fila] = await consultar(
      `INSERT INTO ${this.tabla} (${columnas.join(', ')}) VALUES (${marcadores.join(', ')}) RETURNING id`,
      valores,
    );
    return this.obtener(fila.id);
  }

  async actualizar(id, datos) {
    const columnas = this.columnas.filter((c) => datos[c] !== undefined);
    const valores = columnas.map((c) => datos[c]);
    const cambios = columnas.map((c, i) => `${c} = $${i + 1}`);
    await consultar(
      `UPDATE ${this.tabla} SET ${cambios.join(', ')} WHERE id = $${columnas.length + 1}`,
      [...valores, id],
    );
    return this.obtener(id);
  }

  async eliminar(id) {
    const fila = await this.obtener(id);
    if (this.bajaLogica) {
      await consultar(`UPDATE ${this.tabla} SET ${this.bajaLogica} WHERE id = $1`, [id]);
    } else {
      await consultar(`DELETE FROM ${this.tabla} WHERE id = $1`, [id]);
    }
    return fila;
  }
}

module.exports = Modelo;
