// Carga inicial: crea las tablas (schema.sql) y las llena con los datos del Excel
// de EOS (datos-excel.json, generado por herramientas/excel_a_json.py).
// Uso:  npm run seed      (¡borra y vuelve a crear todo!)
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const { pool, consultar } = require('../src/config/db');
const { calcularPerdida } = require('../src/services/perdidas');

const datos = JSON.parse(fs.readFileSync(path.join(__dirname, 'datos-excel.json'), 'utf8'));

// Reglas de garantía informadas por la empresa: [pieza, cubre, costo mínimo, costo máximo]
const PIEZAS = ['Teclado', 'Carcasa', 'Cargador', 'Pantalla', 'Mainboard', 'Batería', 'Ventilador', 'Touchpad',
  'Memoria RAM', 'Tarjeta de red', 'Puerto de carga', 'Diagnóstico general', 'Cables', 'Tintas'];
const COBERTURAS = {
  HP: [['Teclado', false, 45, 60], ['Carcasa', false, 80, 80], ['Cargador', false, 30, 40]],
  Lenovo: [['Teclado', true, null, null], ['Carcasa', false, 100, 120], ['Cargador', false, 30, 50]],
  // Chuwi solo cubre la mainboard: lo demás en la práctica es reemplazar el equipo
  Chuwi: PIEZAS.filter((p) => !['Mainboard', 'Cables', 'Tintas'].includes(p)).map((p) => [p, false, 180, 320])
    .concat([['Mainboard', true, null, null]]),
  Epson: [['Cables', false, null, null], ['Tintas', false, null, null]],
};

// Inserta muchas filas en UNA sola consulta: se manda un JSON y PostgreSQL lo convierte en filas
async function insertarLote(sql, filas) {
  if (filas.length) await consultar(sql, [JSON.stringify(filas)]);
}

async function main() {
  console.log('1) Creando tablas...');
  await consultar(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

  console.log('2) Catálogos...');
  const marcas = [...new Set(datos.modelos.map((m) => m.marca).concat(Object.keys(COBERTURAS)))];
  const tipos = [...new Set(datos.modelos.map((m) => m.tipo))];
  await insertarLote('INSERT INTO marcas (nombre) SELECT x FROM json_array_elements_text($1) x', marcas);
  await insertarLote('INSERT INTO tipos_equipo (nombre) SELECT x FROM json_array_elements_text($1) x', tipos);
  await insertarLote('INSERT INTO piezas (nombre) SELECT x FROM json_array_elements_text($1) x', PIEZAS);
  await insertarLote('INSERT INTO empresas (nombre) SELECT x FROM json_array_elements_text($1) x', datos.empresas);

  const coberturas = Object.entries(COBERTURAS).flatMap(([marca, reglas]) =>
    reglas.map(([pieza, cubre, costo_min, costo_max]) => ({ marca, pieza, cubre, costo_min, costo_max })));
  await insertarLote(`
    INSERT INTO coberturas (marca_id, pieza_id, cubre, costo_min, costo_max)
    SELECT ma.id, p.id, x.cubre, x.costo_min, x.costo_max
    FROM json_to_recordset($1) AS x(marca text, pieza text, cubre boolean, costo_min numeric, costo_max numeric)
    JOIN marcas ma ON ma.nombre = x.marca JOIN piezas p ON p.nombre = x.pieza`, coberturas);

  await insertarLote(`
    INSERT INTO modelos (marca_id, tipo_id, nombre, costo_compra, costo_estimado)
    SELECT ma.id, t.id, x.modelo, x.costo_compra, x.costo_estimado
    FROM json_to_recordset($1) AS x(marca text, tipo text, modelo text, costo_compra numeric, costo_estimado boolean)
    JOIN marcas ma ON ma.nombre = x.marca JOIN tipos_equipo t ON t.nombre = x.tipo`, datos.modelos);

  console.log('3) Equipos, ventas e incidentes...');
  await insertarLote(`
    INSERT INTO equipos (serie, modelo_id, empresa_id, tarifa_mensual, fecha_entrega, n_factura, estado)
    SELECT x.serie, mo.id, em.id, x.tarifa_mensual, x.fecha_entrega, x.n_factura, x.estado
    FROM json_to_recordset($1) AS x(serie text, marca text, modelo text, empresa text,
         tarifa_mensual numeric, fecha_entrega date, n_factura text, estado text)
    JOIN marcas ma  ON ma.nombre = x.marca
    JOIN modelos mo ON mo.marca_id = ma.id AND mo.nombre = x.modelo
    LEFT JOIN empresas em ON em.nombre = x.empresa`, datos.equipos);

  await insertarLote(`
    INSERT INTO ventas (equipo_id, empresa_id, comprador, condicion, precio, fecha)
    SELECT e.id, em.id, x.comprador, x.condicion, x.precio, x.fecha
    FROM json_to_recordset($1) AS x(serie text, empresa text, comprador text, condicion text, precio numeric, fecha date)
    JOIN equipos e ON e.serie = x.serie
    LEFT JOIN empresas em ON em.nombre = x.empresa`, datos.ventas);

  // La pérdida de cada incidente se calcula con la MISMA regla que usa el admin
  const equipos = await consultar('SELECT serie, marca, costo_compra FROM v_equipos');
  const coberturasBD = await consultar('SELECT marca, pieza, cubre, costo_min, costo_max FROM v_coberturas');
  const porSerie = Object.fromEntries(equipos.map((e) => [e.serie, e]));
  const incidentes = datos.incidentes.map((inc) => {
    const equipo = porSerie[inc.serie];
    const cobertura = coberturasBD.find((c) => c.marca === equipo.marca && c.pieza === inc.pieza);
    return { ...inc, ...calcularPerdida({ ...inc, cobertura, costoEquipo: equipo.costo_compra }) };
  });
  await insertarLote(`
    INSERT INTO incidentes (equipo_id, pieza_id, tipo, fecha, descripcion, estado, cubierto, costo_eos, perdida_neta)
    SELECT e.id, p.id, x.tipo, x.fecha, x.descripcion, x.estado, x.cubierto, x.costo_eos, x.perdida_neta
    FROM json_to_recordset($1) AS x(serie text, pieza text, tipo text, fecha date, descripcion text, estado text,
         cubierto boolean, costo_eos numeric, perdida_neta numeric)
    JOIN equipos e ON e.serie = x.serie
    LEFT JOIN piezas p ON p.nombre = x.pieza`, incidentes);

  console.log('4) Usuario administrador...');
  const email = (process.env.ADMIN_EMAIL || 'admin@eos.com').toLowerCase();
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin123*', 10);
  await consultar('INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1, $2, $3)', ['Administrador', email, hash]);

  // Resumen final: comprueba que se cargó lo esperado
  const [t] = await consultar(`SELECT
    (SELECT COUNT(*) FROM equipos)::int AS equipos,
    (SELECT COUNT(*) FROM equipos WHERE estado = 'activo')::int AS activos,
    (SELECT COUNT(*) FROM ventas)::int AS ventas,
    (SELECT COUNT(*) FROM incidentes WHERE tipo = 'garantia')::int AS garantias,
    (SELECT COUNT(*) FROM incidentes WHERE tipo = 'robo')::int AS robos,
    (SELECT COUNT(*) FROM modelos)::int AS modelos,
    (SELECT COUNT(*) FROM empresas)::int AS empresas`);
  console.log('\nListo:', t);
  console.log('Problemas del Excel detectados y corregidos:');
  for (const [tipo, lista] of Object.entries(datos.reporte)) console.log(`  - ${tipo}: ${lista.length}`);
  console.log(`\nEntra con: ${email} / ${process.env.ADMIN_PASSWORD || 'Admin123*'}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error("Error en el seed:", err.message);
  await pool.end();
  process.exit(1);
});
