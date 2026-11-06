// Indicadores de la comparativa lado a lado.
//   mejor: 'alto' o 'bajo' -> qué celda se pinta de verde (mejor) y de rojo (peor)
//   detalle(grupo, filtro, corte) -> URL con los registros que forman ese número (drill-down)
import { finVentana } from '../utils/formato';

const equipos = (g, f, extra, nota) => `/admin/equipos?${f}=${g.id}&${extra}&nota=${nota} de ${g.nombre}`;
const incidentes = (g, f, extra, nota) => `/admin/incidentes?${f}=${g.id}&${extra}&nota=${nota} de ${g.nombre}`;
const ventas = (g, f) => `/admin/ventas?${f}=${g.id}&nota=Ventas de ${g.nombre}`;

const indicadores = [
  { seccion: 'Parque de equipos' },
  { clave: 'activos', titulo: 'Equipos activos', formato: 'numero', detalle: (g, f) => equipos(g, f, 'estado=activo', 'Equipos activos') },
  { clave: 'vencidos', titulo: 'Equipos vencidos (36 meses cumplidos)', formato: 'numero', mejor: 'bajo', detalle: (g, f, c) => equipos(g, f, `vencido_al=${c}`, 'Equipos vencidos') },
  { clave: 'pct_vencido', titulo: '% del parque vencido', formato: 'porcentaje', mejor: 'bajo' },
  { clave: 'por_vencer_12m', titulo: 'Vencen en los próximos 12 meses', formato: 'numero', detalle: (g, f, c) => equipos(g, f, `vence_desde=${c}&vence_hasta=${finVentana(c)}`, 'Equipos que vencen en 12 meses') },

  { seccion: 'Ingresos (ganancias)' },
  { clave: 'ingreso_mensual', titulo: 'Ingreso mensual por renta', formato: 'dinero', mejor: 'alto' },
  { clave: 'tarifa_media', titulo: 'Tarifa media por equipo', formato: 'dinero', mejor: 'alto' },
  { clave: 'ingreso_renta', titulo: 'Ingreso acumulado por renta', formato: 'dinero', mejor: 'alto' },
  { clave: 'ingreso_por_equipo', titulo: 'Ingreso acumulado por equipo activo', formato: 'dinero', mejor: 'alto' },
  { clave: 'vendidos', titulo: 'Equipos vendidos', formato: 'numero', detalle: (g, f) => ventas(g, f) },
  { clave: 'ingreso_ventas', titulo: 'Ingreso por ventas', formato: 'dinero', mejor: 'alto', detalle: (g, f) => ventas(g, f) },

  { seccion: 'Pérdidas' },
  { clave: 'no_cubiertas', titulo: 'Garantías NO cubiertas por la marca', formato: 'numero', mejor: 'bajo', detalle: (g, f) => incidentes(g, f, 'tipo=garantia&cubierto=false', 'Garantías no cubiertas') },
  { clave: 'perdida_garantias', titulo: 'Pérdida por piezas no cubiertas', formato: 'dinero', mejor: 'bajo', detalle: (g, f) => incidentes(g, f, 'tipo=garantia&cubierto=false', 'Garantías no cubiertas') },
  { clave: 'perdida_garantia_por_equipo', titulo: 'Pérdida por garantías por equipo', formato: 'dinero', mejor: 'bajo' },
  { clave: 'robos', titulo: 'Robos', formato: 'numero', mejor: 'bajo', detalle: (g, f) => incidentes(g, f, 'tipo=robo', 'Robos') },
  { clave: 'robos_por_100', titulo: 'Robos por cada 100 equipos', formato: 'decimal', mejor: 'bajo' },
  { clave: 'perdida_robos', titulo: 'Pérdida por robos (reposición - deducible)', formato: 'dinero', mejor: 'bajo', detalle: (g, f) => incidentes(g, f, 'tipo=robo', 'Robos') },

  { seccion: 'Resultado' },
  { clave: 'inversion', titulo: 'Inversión (costo de compra de los equipos)', formato: 'dinero' },
  { clave: 'ganancia', titulo: 'Ganancia neta (ingresos - inversión - pérdidas)', formato: 'dinero', mejor: 'alto' },
  { clave: 'margen', titulo: 'Margen sobre ingresos', formato: 'porcentaje', mejor: 'alto' },
];

export default indicadores;
