// CORE: consultas analíticas en PostgreSQL. Todas parten de fn_equipos(corte)
// (ver db/schema.sql), que calcula para cada equipo sus ingresos, pérdidas,
// ganancia y si está vencido a la fecha de corte.
// Técnicas: CTE (WITH), agregados con FILTER, funciones de ventana
// (RANK, LAG, SUM OVER) y generate_series.
const { consultar } = require('../config/db');

// "Próximos 12 meses" = el mes del corte y los 11 siguientes (igual que la matriz de vencimientos)
const FIN_VENTANA = "(date_trunc('month', $1::date) + INTERVAL '12 months')";

// Indicadores generales para la página de inicio
async function resumen(corte) {
  const [fila] = await consultar(`
    SELECT
      COUNT(*) FILTER (WHERE estado = 'activo')::int                     AS activos,
      COALESCE(SUM(tarifa) FILTER (WHERE estado = 'activo'), 0)          AS ingreso_mensual,
      COUNT(*) FILTER (WHERE situacion = 'vencido')::int                 AS vencidos,
      COUNT(*) FILTER (WHERE estado = 'activo' AND fecha_vencimiento > $1
                         AND fecha_vencimiento < ${FIN_VENTANA})::int                 AS por_vencer_12m,
      COALESCE(SUM(tarifa) FILTER (WHERE estado = 'activo'
                         AND fecha_vencimiento < ${FIN_VENTANA}), 0)                  AS ingreso_en_riesgo,
      SUM(ingreso_renta)                                                 AS ingreso_renta,
      COUNT(*) FILTER (WHERE estado = 'vendido')::int                    AS vendidos,
      SUM(precio_venta)                                                  AS ingreso_ventas,
      SUM(perdidas)                                                      AS perdidas,
      SUM(ganancia)                                                      AS ganancia
    FROM fn_equipos($1)`, [corte]);
  return fila;
}

// Comparativa lado a lado por marca o por modelo (el usuario elige cuáles)
const DIMENSIONES = {
  marca: { id: 'marca_id', nombre: 'marca' },
  modelo: { id: 'modelo_id', nombre: 'modelo' },
};

async function comparar(dimension, ids, corte) {
  const d = DIMENSIONES[dimension] || DIMENSIONES.marca; // lista blanca: nunca se pega texto del usuario
  return consultar(`
    WITH e AS (SELECT * FROM fn_equipos($1)),
    grupos AS (
      SELECT ${d.id} AS id, ${d.nombre} AS nombre,
        COUNT(*) FILTER (WHERE estado = 'activo')::int               AS activos,
        COALESCE(SUM(tarifa) FILTER (WHERE estado = 'activo'), 0)    AS ingreso_mensual,
        ROUND(AVG(tarifa) FILTER (WHERE estado = 'activo'), 2)       AS tarifa_media,
        SUM(ingreso_renta)                                           AS ingreso_renta,
        COUNT(*) FILTER (WHERE estado = 'vendido')::int              AS vendidos,
        SUM(precio_venta)                                            AS ingreso_ventas,
        SUM(costo_compra)                                            AS inversion,
        COUNT(*) FILTER (WHERE situacion = 'vencido')::int           AS vencidos,
        COUNT(*) FILTER (WHERE estado = 'activo' AND fecha_vencimiento > $1
                           AND fecha_vencimiento < ${FIN_VENTANA})::int AS por_vencer_12m,
        SUM(ganancia)                                                AS ganancia
      FROM e
      WHERE $2::int[] IS NULL OR ${d.id} = ANY($2::int[])
      GROUP BY 1, 2
    ),
    inc AS (
      SELECT e.${d.id} AS id,
        COUNT(*) FILTER (WHERE i.tipo = 'garantia')::int                       AS garantias,
        COUNT(*) FILTER (WHERE i.tipo = 'garantia' AND NOT i.cubierto)::int    AS no_cubiertas,
        COALESCE(SUM(i.perdida_neta) FILTER (WHERE i.tipo = 'garantia'), 0)    AS perdida_garantias,
        COUNT(*) FILTER (WHERE i.tipo = 'robo')::int                           AS robos,
        COALESCE(SUM(i.perdida_neta) FILTER (WHERE i.tipo = 'robo'), 0)        AS perdida_robos
      FROM incidentes i JOIN e ON e.id = i.equipo_id
      GROUP BY 1
    )
    SELECT g.*,
      COALESCE(inc.garantias, 0) AS garantias,
      COALESCE(inc.no_cubiertas, 0) AS no_cubiertas,
      COALESCE(inc.perdida_garantias, 0) AS perdida_garantias,
      COALESCE(inc.robos, 0) AS robos,
      COALESCE(inc.perdida_robos, 0) AS perdida_robos,
      -- Normalizados por cada 100 equipos activos (Lenovo tiene ~5 veces más equipos que HP)
      ROUND(COALESCE(inc.robos, 0) * 100.0 / NULLIF(g.activos, 0), 1)       AS robos_por_100,
      ROUND(COALESCE(inc.garantias, 0) * 100.0 / NULLIF(g.activos, 0), 1)   AS garantias_por_100,
      ROUND(g.vencidos * 100.0 / NULLIF(g.activos, 0), 1)                   AS pct_vencido,
      ROUND(g.ingreso_renta / NULLIF(g.activos, 0), 2)                      AS ingreso_por_equipo,
      ROUND(COALESCE(inc.perdida_garantias, 0) / NULLIF(g.activos, 0), 2)   AS perdida_garantia_por_equipo,
      ROUND(g.ganancia * 100.0 / NULLIF(g.ingreso_renta + g.ingreso_ventas, 0), 1) AS margen
    FROM grupos g LEFT JOIN inc ON inc.id = g.id
    ORDER BY g.activos DESC`, [corte, ids && ids.length ? ids : null]);
}

// Vencimientos: cuántos equipos vencen por marca y mes (12 meses) + los ya vencidos
async function vencimientos(corte) {
  const meses = await consultar(`
    SELECT to_char(m, 'YYYY-MM') AS mes
    FROM generate_series(date_trunc('month', $1::date), date_trunc('month', $1::date) + INTERVAL '11 months',
                         INTERVAL '1 month') AS m`, [corte]);
  const celdas = await consultar(`
    SELECT marca_id, marca,
      CASE WHEN fecha_vencimiento <= $1 THEN 'vencido' ELSE to_char(fecha_vencimiento, 'YYYY-MM') END AS columna,
      COUNT(*)::int AS cantidad,
      SUM(tarifa) AS ingreso
    FROM fn_equipos($1)
    WHERE estado = 'activo'
      AND fecha_vencimiento < ${FIN_VENTANA}
    GROUP BY 1, 2, 3
    ORDER BY 2`, [corte]);
  return { meses: meses.map((m) => m.mes), celdas };
}

// Pérdidas por garantía: pieza x marca, separando lo que cubrió la marca de lo que pagó EOS
async function perdidas() {
  const piezas = await consultar(`
    SELECT i.pieza_id, i.pieza, i.marca_id, i.marca,
      COUNT(*)::int                                   AS casos,
      COUNT(*) FILTER (WHERE NOT i.cubierto)::int     AS pagados_eos,
      SUM(i.perdida_neta)                             AS perdida,
      SUM(c.costo_min) FILTER (WHERE NOT i.cubierto)  AS perdida_min,
      SUM(c.costo_max) FILTER (WHERE NOT i.cubierto)  AS perdida_max
    FROM v_incidentes i
    LEFT JOIN coberturas c ON c.marca_id = i.marca_id AND c.pieza_id = i.pieza_id
    WHERE i.tipo = 'garantia'
    GROUP BY 1, 2, 3, 4
    ORDER BY 2, 4`);
  const robos = await consultar(`
    WITH activos AS (SELECT marca_id, COUNT(*) AS n FROM v_equipos WHERE estado = 'activo' GROUP BY 1)
    SELECT i.marca_id, i.marca, COUNT(*)::int AS robos, SUM(i.perdida_neta) AS perdida,
           ROUND(COUNT(*) * 100.0 / NULLIF(a.n, 0), 1) AS robos_por_100
    FROM v_incidentes i LEFT JOIN activos a ON a.marca_id = i.marca_id
    WHERE i.tipo = 'robo'
    GROUP BY 1, 2, a.n
    ORDER BY robos DESC`);
  return { piezas, robos };
}

// Año contra año: incidentes y pérdidas con la variación % frente al año anterior (LAG)
async function anual() {
  return consultar(`
    WITH a AS (
      SELECT EXTRACT(YEAR FROM fecha)::int AS anio,
        COUNT(*) FILTER (WHERE tipo = 'garantia')::int AS garantias,
        COUNT(*) FILTER (WHERE tipo = 'robo')::int     AS robos,
        SUM(perdida_neta)                              AS perdida
      FROM incidentes
      WHERE fecha IS NOT NULL
      GROUP BY 1
    )
    SELECT a.*,
      ROUND((robos - LAG(robos) OVER w) * 100.0 / NULLIF(LAG(robos) OVER w, 0), 1)       AS var_robos,
      ROUND((perdida - LAG(perdida) OVER w) * 100.0 / NULLIF(LAG(perdida) OVER w, 0), 1) AS var_perdida
    FROM a
    WINDOW w AS (ORDER BY anio)
    ORDER BY anio`);
}

// Ranking de modelos: rentabilidad, riesgo y Pareto de pérdidas
async function ranking(corte) {
  return consultar(`
    WITH e AS (SELECT * FROM fn_equipos($1)),
    m AS (
      SELECT modelo_id, modelo, marca,
        COUNT(*) FILTER (WHERE estado = 'activo')::int             AS activos,
        COALESCE(SUM(tarifa) FILTER (WHERE estado = 'activo'), 0)  AS ingreso_mensual,
        ROUND(AVG(tarifa), 2)                                      AS tarifa_media,
        MAX(costo_compra)                                          AS costo_compra,
        SUM(ingreso_renta)                                         AS ingreso_renta,
        SUM(precio_venta)                                          AS ingreso_ventas,
        SUM(perdidas)                                              AS perdidas,
        SUM(ganancia)                                              AS ganancia,
        COUNT(*) FILTER (WHERE situacion = 'vencido')::int         AS vencidos
      FROM e GROUP BY 1, 2, 3
    ),
    r AS (
      SELECT modelo_id, COUNT(*)::int AS robos FROM v_incidentes WHERE tipo = 'robo' GROUP BY 1
    ),
    indicadores AS (
      SELECT m.*, COALESCE(r.robos, 0) AS robos,
        ROUND(COALESCE(r.robos, 0) * 100.0 / NULLIF(m.activos, 0), 1) AS robos_por_100,
        ROUND(m.vencidos * 100.0 / NULLIF(m.activos, 0), 1)           AS pct_vencido,
        ROUND(m.costo_compra / NULLIF(m.tarifa_media, 0), 1)          AS meses_recuperacion
      FROM m LEFT JOIN r ON r.modelo_id = m.modelo_id
      WHERE m.activos > 0 OR r.robos > 0
    )
    SELECT *,
      CASE WHEN robos_por_100 >= 10 OR pct_vencido >= 50 OR (activos = 0 AND robos > 0) THEN 'alto'
           WHEN robos_por_100 >= 5 OR pct_vencido >= 25 THEN 'medio'
           ELSE 'bajo' END                                        AS riesgo,
      RANK() OVER (ORDER BY ganancia DESC)                         AS puesto,
      -- Pareto: % acumulado de las pérdidas (¿qué pocos modelos causan la mayoría?)
      ROUND(SUM(perdidas) OVER (ORDER BY perdidas DESC, modelo_id) * 100.0
            / NULLIF(SUM(perdidas) OVER (), 0), 1)                 AS pareto_pct
    FROM indicadores
    ORDER BY puesto`, [corte]);
}

// Ficha de un equipo: sus datos, su resultado económico y su historial
async function fichaEquipo(id, corte) {
  const [equipo] = await consultar('SELECT * FROM fn_equipos($1) WHERE id = $2', [corte, id]);
  if (!equipo) return null;
  const incidentes = await consultar('SELECT * FROM v_incidentes WHERE equipo_id = $1 ORDER BY fecha DESC', [id]);
  const [venta] = await consultar('SELECT * FROM v_ventas WHERE equipo_id = $1', [id]);
  return { equipo, incidentes, venta: venta || null };
}

module.exports = { resumen, comparar, vencimientos, perdidas, anual, ranking, fichaEquipo };
