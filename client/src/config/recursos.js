// Descripción de cada tabla del admin: columnas del listado y campos del formulario.
// La página Admin.jsx lee esta configuración, así no se repite una pantalla por tabla.
//
// Campos tipo 'select':
//   recurso   -> de dónde se cargan las opciones (GET /api/<recurso>/opciones)
//   dependeDe -> CASCADA: el dropdown espera a que se elijan esos campos y filtra por ellos
//                (como país -> provincia -> ciudad). Nunca se escribe una clave foránea a mano.
//   fijos     -> filtros que siempre se envían (ej. solo equipos activos)

const hoyMax = 'hoy'; // las fechas no pueden ser futuras (se valida también en el backend)

const ESTADOS_EQUIPO = [
  { id: 'activo', nombre: 'Activo' }, { id: 'vendido', nombre: 'Vendido' },
  { id: 'robado', nombre: 'Robado' }, { id: 'baja', nombre: 'De baja' },
];

const recursos = {
  equipos: {
    titulo: 'Equipos',
    singular: 'equipo',
    columnas: [
      { campo: 'serie', titulo: 'Serie', enlace: (f) => `/equipos/${f.id}` },
      { campo: 'marca', titulo: 'Marca' },
      { campo: 'modelo', titulo: 'Modelo' },
      { campo: 'empresa', titulo: 'Empresa' },
      { campo: 'tarifa_mensual', titulo: 'Tarifa', formato: 'dinero' },
      { campo: 'fecha_entrega', titulo: 'Entrega', formato: 'fecha' },
      { campo: 'fecha_vencimiento', titulo: 'Vence', formato: 'fecha' },
      { campo: 'estado', titulo: 'Estado', etiqueta: true },
    ],
    campos: [
      { nombre: 'serie', etiqueta: 'Serie', requerido: true, patron: '[A-Za-z0-9-]{5,30}', ayuda: '5 a 30 letras o números' },
      { nombre: 'tipo_id', etiqueta: 'Tipo de equipo', tipo: 'select', recurso: 'tipos-equipo', requerido: true },
      { nombre: 'marca_id', etiqueta: 'Marca', tipo: 'select', recurso: 'marcas', dependeDe: ['tipo_id'], requerido: true },
      { nombre: 'modelo_id', etiqueta: 'Modelo', tipo: 'select', recurso: 'modelos', dependeDe: ['tipo_id', 'marca_id'], requerido: true },
      { nombre: 'empresa_id', etiqueta: 'Empresa', tipo: 'select', recurso: 'empresas', requerido: true },
      { nombre: 'tarifa_mensual', etiqueta: 'Tarifa mensual ($)', tipo: 'number', requerido: true, min: 0.01 },
      { nombre: 'fecha_entrega', etiqueta: 'Fecha de entrega', tipo: 'date', requerido: true, max: hoyMax, ayuda: 'El vencimiento (+36 meses) lo calcula la base de datos' },
      { nombre: 'n_factura', etiqueta: 'N.º de factura' },
      { nombre: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: ESTADOS_EQUIPO, soloEditar: true },
    ],
    acciones: [
      { texto: 'Renovar', post: (f) => `/equipos/${f.id}/renovar`, si: (f) => f.estado === 'activo' },
      { texto: 'Vender', ir: (f) => `/admin/ventas?crear_empresa_id=${f.empresa_id}&crear_equipo_id=${f.id}`, si: (f) => f.estado === 'activo' },
    ],
    textoEliminar: 'Dar de baja',
  },

  incidentes: {
    titulo: 'Incidentes (garantías y robos)',
    singular: 'incidente',
    columnas: [
      { campo: 'fecha', titulo: 'Fecha', formato: 'fecha' },
      { campo: 'tipo', titulo: 'Tipo', etiqueta: true },
      { campo: 'serie', titulo: 'Equipo', enlace: (f) => `/equipos/${f.equipo_id}` },
      { campo: 'marca', titulo: 'Marca' },
      { campo: 'pieza', titulo: 'Pieza' },
      { campo: 'cubierto', titulo: '¿Cubre la marca?', formato: 'siNo' },
      { campo: 'perdida_neta', titulo: 'Pérdida EOS', formato: 'dinero' },
      { campo: 'estado', titulo: 'Estado', etiqueta: true },
    ],
    campos: [
      { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', requerido: true, opciones: [{ id: 'garantia', nombre: 'Garantía' }, { id: 'robo', nombre: 'Robo' }] },
      { nombre: 'marca_id', etiqueta: 'Marca', tipo: 'select', recurso: 'marcas', requerido: true, soloCrear: true },
      { nombre: 'modelo_id', etiqueta: 'Modelo', tipo: 'select', recurso: 'modelos', dependeDe: ['marca_id'], requerido: true, soloCrear: true },
      { nombre: 'equipo_id', etiqueta: 'Equipo (serie)', tipo: 'select', recurso: 'equipos', dependeDe: ['modelo_id'], fijos: { estado: 'activo' }, requerido: true, soloCrear: true },
      { nombre: 'pieza_id', etiqueta: 'Pieza dañada', tipo: 'select', recurso: 'piezas', requerido: true, visibleSi: (v) => v.tipo === 'garantia' },
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'date', requerido: true, max: hoyMax },
      { nombre: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: [{ id: 'abierto', nombre: 'Abierto' }, { id: 'cerrado', nombre: 'Cerrado' }, { id: 'rechazado', nombre: 'Garantía rechazada' }] },
      { nombre: 'recuperado', etiqueta: 'Deducible cobrado al cliente ($)', tipo: 'number', min: 0, visibleSi: (v) => v.tipo === 'robo' },
      { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea' },
    ],
    // Muestra si la marca cubre la pieza elegida (la pérdida la calcula el servidor)
    aviso: { url: '/coberturas/consulta', necesita: ['marca_id', 'pieza_id'] },
  },

  ventas: {
    titulo: 'Ventas',
    singular: 'venta',
    columnas: [
      { campo: 'fecha', titulo: 'Fecha', formato: 'fecha' },
      { campo: 'serie', titulo: 'Equipo', enlace: (f) => `/equipos/${f.equipo_id}` },
      { campo: 'marca', titulo: 'Marca' },
      { campo: 'modelo', titulo: 'Modelo' },
      { campo: 'comprador', titulo: 'Comprador' },
      { campo: 'condicion', titulo: 'Condición', etiqueta: true },
      { campo: 'precio', titulo: 'Precio', formato: 'dinero' },
    ],
    campos: [
      { nombre: 'empresa_id', etiqueta: 'Empresa', tipo: 'select', recurso: 'empresas', requerido: true },
      { nombre: 'equipo_id', etiqueta: 'Equipo (solo activos de esa empresa)', tipo: 'select', recurso: 'equipos', dependeDe: ['empresa_id'], fijos: { estado: 'activo' }, requerido: true, soloCrear: true },
      { nombre: 'comprador', etiqueta: 'Comprador', requerido: true },
      { nombre: 'identificacion', etiqueta: 'Cédula o RUC del comprador', requerido: true, patron: '[0-9]{10}|[0-9]{13}', ayuda: 'Se valida en el servidor (dígito verificador)' },
      { nombre: 'condicion', etiqueta: 'Condición', tipo: 'select', opciones: [{ id: 'usado', nombre: 'Usado' }, { id: 'nuevo', nombre: 'Nuevo' }] },
      { nombre: 'precio', etiqueta: 'Precio ($)', tipo: 'number', requerido: true, min: 0.01 },
      { nombre: 'fecha', etiqueta: 'Fecha de venta', tipo: 'date', requerido: true, max: hoyMax },
    ],
    textoEliminar: 'Anular',
  },

  empresas: {
    titulo: 'Empresas cliente',
    singular: 'empresa',
    columnas: [
      { campo: 'nombre', titulo: 'Nombre', enlace: (f) => `/admin/equipos?empresa_id=${f.id}&nota=Equipos de ${f.nombre}` },
      { campo: 'ruc', titulo: 'RUC' },
      { campo: 'activa', titulo: 'Activa', formato: 'siNo' },
    ],
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', requerido: true },
      { nombre: 'ruc', etiqueta: 'RUC', requerido: true, patron: '[0-9]{13}', ayuda: '13 dígitos. El servidor valida provincia y dígito verificador' },
      { nombre: 'activa', etiqueta: 'Empresa activa', tipo: 'checkbox', porDefecto: true },
    ],
  },

  modelos: {
    titulo: 'Modelos',
    singular: 'modelo',
    columnas: [
      { campo: 'marca', titulo: 'Marca' },
      { campo: 'nombre', titulo: 'Modelo', enlace: (f) => `/admin/equipos?modelo_id=${f.id}&nota=Equipos ${f.nombre}` },
      { campo: 'tipo', titulo: 'Tipo' },
      { campo: 'costo_compra', titulo: 'Costo de compra', formato: 'dinero' },
      { campo: 'costo_estimado', titulo: '¿Estimado?', formato: 'siNo' },
      { campo: 'equipos_activos', titulo: 'Equipos activos', formato: 'numero' },
    ],
    campos: [
      { nombre: 'marca_id', etiqueta: 'Marca', tipo: 'select', recurso: 'marcas', requerido: true },
      { nombre: 'tipo_id', etiqueta: 'Tipo de equipo', tipo: 'select', recurso: 'tipos-equipo', requerido: true },
      { nombre: 'nombre', etiqueta: 'Nombre del modelo', requerido: true },
      { nombre: 'costo_compra', etiqueta: 'Costo de compra ($)', tipo: 'number', requerido: true, min: 0.01 },
      { nombre: 'costo_estimado', etiqueta: 'El costo es estimado', tipo: 'checkbox' },
    ],
  },

  coberturas: {
    titulo: 'Coberturas de garantía',
    singular: 'cobertura',
    columnas: [
      { campo: 'marca', titulo: 'Marca' },
      { campo: 'pieza', titulo: 'Pieza' },
      { campo: 'cubre', titulo: '¿La marca cubre?', formato: 'siNo' },
      { campo: 'costo_min', titulo: 'Costo mín.', formato: 'dinero' },
      { campo: 'costo_max', titulo: 'Costo máx.', formato: 'dinero' },
    ],
    campos: [
      { nombre: 'marca_id', etiqueta: 'Marca', tipo: 'select', recurso: 'marcas', requerido: true },
      { nombre: 'pieza_id', etiqueta: 'Pieza', tipo: 'select', recurso: 'piezas', requerido: true },
      { nombre: 'cubre', etiqueta: 'La garantía de la marca la cubre', tipo: 'checkbox' },
      { nombre: 'costo_min', etiqueta: 'Costo mínimo ($)', tipo: 'number', min: 0 },
      { nombre: 'costo_max', etiqueta: 'Costo máximo ($)', tipo: 'number', min: 0 },
    ],
  },

  marcas: { titulo: 'Marcas', singular: 'marca', columnas: [{ campo: 'nombre', titulo: 'Nombre' }], campos: [{ nombre: 'nombre', etiqueta: 'Nombre', requerido: true }] },
  'tipos-equipo': { titulo: 'Tipos de equipo', singular: 'tipo', columnas: [{ campo: 'nombre', titulo: 'Nombre' }], campos: [{ nombre: 'nombre', etiqueta: 'Nombre', requerido: true }] },
  piezas: { titulo: 'Piezas', singular: 'pieza', columnas: [{ campo: 'nombre', titulo: 'Nombre' }], campos: [{ nombre: 'nombre', etiqueta: 'Nombre', requerido: true }] },
};

export default recursos;
