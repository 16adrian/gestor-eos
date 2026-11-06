// Conexión a PostgreSQL. Todo el SQL del proyecto pasa por `consultar`.
const { Pool, types } = require('pg');

// Por defecto pg devuelve los NUMERIC como texto y las fechas como objetos Date
// (que se corren un día por la zona horaria). Así llegan como número y '2026-10-16'.
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v))); // NUMERIC
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));  // BIGINT (COUNT)
types.setTypeParser(1082, (v) => v);                                    // DATE

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL en server/.env (mira server/.env.example)');
  process.exit(1);
}
// Neon agrega "channel_binding=require", que la librería pg no necesita: se quita.
const url = process.env.DATABASE_URL.replace(/[&?]channel_binding=require/, '');

const pool = new Pool({
  connectionString: url,
  // Neon y Render exigen conexión cifrada (SSL); en tu PC con Postgres local no.
  ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
});

// Ejecuta una consulta con parámetros ($1, $2...) y devuelve las filas.
// Usar parámetros evita la inyección SQL: nunca se pega texto del usuario en el SQL.
async function consultar(sql, parametros = []) {
  const resultado = await pool.query(sql, parametros);
  return resultado.rows;
}

module.exports = { pool, consultar };
