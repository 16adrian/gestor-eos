// Capa MODELO: cada tabla de la base de datos descrita en pocas líneas.
// La clave (empresas, marcas...) es también la ruta del API: /api/empresas, /api/marcas...
const Modelo = require('./Modelo');

module.exports = {
  empresas: new Modelo({
    tabla: 'empresas',
    columnas: ['nombre', 'ruc', 'activa'],
    buscarEn: ['nombre', 'ruc'],
    orden: 'nombre',
  }),

  marcas: new Modelo({
    tabla: 'marcas',
    columnas: ['nombre'],
    buscarEn: ['nombre'],
    orden: 'nombre',
    // Dropdown en cascada: solo las marcas que tienen modelos de ese tipo
    filtros: { tipo_id: 'id IN (SELECT marca_id FROM modelos WHERE tipo_id = ?)' },
  }),

  'tipos-equipo': new Modelo({
    tabla: 'tipos_equipo',
    columnas: ['nombre'],
    buscarEn: ['nombre'],
    orden: 'nombre',
  }),

  modelos: new Modelo({
    tabla: 'modelos',
    vista: 'v_modelos',
    columnas: ['marca_id', 'tipo_id', 'nombre', 'costo_compra', 'costo_estimado'],
    buscarEn: ['nombre', 'marca', 'tipo'],
    orden: 'marca, nombre',
    filtros: { marca_id: 'marca_id = ?', tipo_id: 'tipo_id = ?' },
  }),

  piezas: new Modelo({
    tabla: 'piezas',
    columnas: ['nombre'],
    buscarEn: ['nombre'],
    orden: 'nombre',
  }),

  coberturas: new Modelo({
    tabla: 'coberturas',
    vista: 'v_coberturas',
    columnas: ['marca_id', 'pieza_id', 'cubre', 'costo_min', 'costo_max'],
    buscarEn: ['marca', 'pieza'],
    orden: 'marca, pieza',
    etiqueta: "marca || ' - ' || pieza",
    filtros: { marca_id: 'marca_id = ?', pieza_id: 'pieza_id = ?' },
  }),

  equipos: new Modelo({
    tabla: 'equipos',
    vista: 'v_equipos',
    columnas: ['serie', 'modelo_id', 'empresa_id', 'tarifa_mensual', 'fecha_entrega', 'n_factura', 'estado'],
    buscarEn: ['serie', 'modelo', 'marca', 'empresa'],
    orden: 'serie',
    etiqueta: 'serie',
    bajaLogica: "estado = 'baja'", // eliminar = dar de baja (el historial se conserva)
    filtros: {
      marca_id: 'marca_id = ?',
      modelo_id: 'modelo_id = ?',
      tipo_id: 'tipo_id = ?',
      empresa_id: 'empresa_id = ?',
      estado: 'estado = ?',
      // Para el drill-down del core:
      vencido_al: "estado = 'activo' AND fecha_vencimiento <= ?::date",
      vence_mes: "estado = 'activo' AND to_char(fecha_vencimiento, 'YYYY-MM') = ?",
      vence_desde: "estado = 'activo' AND fecha_vencimiento > ?::date",
      vence_hasta: "estado = 'activo' AND fecha_vencimiento <= ?::date",
    },
  }),

  incidentes: new Modelo({
    tabla: 'incidentes',
    vista: 'v_incidentes',
    // cubierto, costo_eos y perdida_neta los llena el servidor (services/perdidas.js)
    columnas: ['equipo_id', 'pieza_id', 'tipo', 'fecha', 'descripcion', 'estado',
      'cubierto', 'costo_eos', 'recuperado', 'perdida_neta'],
    buscarEn: ['serie', 'modelo', 'descripcion', 'pieza'],
    orden: 'fecha DESC NULLS LAST, id DESC',
    etiqueta: "serie || ' - ' || tipo",
    filtros: {
      tipo: 'tipo = ?',
      marca_id: 'marca_id = ?',
      modelo_id: 'modelo_id = ?',
      pieza_id: 'pieza_id = ?',
      equipo_id: 'equipo_id = ?',
      cubierto: 'cubierto = ?::boolean',
      anio: 'EXTRACT(YEAR FROM fecha) = ?::int',
    },
  }),

  ventas: new Modelo({
    tabla: 'ventas',
    vista: 'v_ventas',
    columnas: ['equipo_id', 'empresa_id', 'comprador', 'identificacion', 'condicion', 'precio', 'fecha'],
    buscarEn: ['serie', 'modelo', 'comprador', 'empresa'],
    orden: 'fecha DESC NULLS LAST, id DESC',
    etiqueta: 'serie',
    filtros: { marca_id: 'marca_id = ?', modelo_id: 'modelo_id = ?', empresa_id: 'empresa_id = ?', equipo_id: 'equipo_id = ?' },
  }),
};
