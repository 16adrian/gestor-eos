// CONTROLADOR del core: lee la fecha de corte y responde las comparativas.
const core = require('../models/coreModel');
const { consultar } = require('../config/db');
const ErrorApp = require('../utils/ErrorApp');

// Fecha de corte: ?corte=2026-10-16 o, si no viene, la fecha de hoy (AAAA-MM-DD)
function leerCorte(req) {
  const corte = req.query.corte || new Date().toLocaleDateString('en-CA');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(corte)) throw new ErrorApp(400, 'La fecha de corte debe ser AAAA-MM-DD');
  return corte;
}

module.exports = {
  resumen: async (req, res) => res.json(await core.resumen(leerCorte(req))),

  comparar: async (req, res) => {
    const ids = String(req.query.ids || '').split(',').filter(Boolean).map(Number);
    res.json(await core.comparar(req.query.dimension, ids, leerCorte(req)));
  },

  vencimientos: async (req, res) => res.json(await core.vencimientos(leerCorte(req))),

  perdidas: async (req, res) => res.json(await core.perdidas()),

  anual: async (req, res) => res.json(await core.anual()),

  ranking: async (req, res) => res.json(await core.ranking(leerCorte(req))),

  fichaEquipo: async (req, res) => {
    const ficha = await core.fichaEquipo(req.params.id, leerCorte(req));
    if (!ficha) throw new ErrorApp(404, 'Equipo no encontrado');
    res.json(ficha);
  },

  // Renovar: el equipo se vuelve a entregar hoy -> la BD recalcula su vencimiento (+36 meses)
  renovar: async (req, res) => {
    const filas = await consultar(
      "UPDATE equipos SET fecha_entrega = CURRENT_DATE WHERE id = $1 AND estado = 'activo' RETURNING id, fecha_vencimiento",
      [req.params.id],
    );
    if (!filas.length) throw new ErrorApp(400, 'Solo se pueden renovar equipos activos');
    res.json({ mensaje: 'Equipo renovado por 36 meses', ...filas[0] });
  },

  // Ayuda del formulario de incidentes: ¿la marca cubre esta pieza?
  consultarCobertura: async (req, res) => {
    const [c] = await consultar(
      `SELECT c.*, ma.nombre AS marca, p.nombre AS pieza FROM coberturas c
       JOIN marcas ma ON ma.id = c.marca_id JOIN piezas p ON p.id = c.pieza_id
       WHERE c.marca_id = $1 AND c.pieza_id = $2`,
      [req.query.marca_id, req.query.pieza_id],
    );
    if (!c) return res.json({ mensaje: 'Sin regla para esta pieza: se asume cubierta por la garantía.' });
    const costo = c.costo_min !== null ? ` Costo para EOS: $${c.costo_min} - $${c.costo_max}.` : ' Costo por definir.';
    res.json({
      cubre: c.cubre,
      mensaje: c.cubre ? `${c.marca} SÍ cubre ${c.pieza}: pérdida $0 (salvo garantía rechazada).`
        : `${c.marca} NO cubre ${c.pieza}: la paga EOS.${costo}`,
    });
  },
};
