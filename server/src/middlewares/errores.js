// Manejador único de errores: todos salen con el mismo formato
// { mensaje, campos? } para que el formulario muestre el motivo junto a cada campo.
const ErrorApp = require('../utils/ErrorApp');

// Traduce los errores de restricciones de PostgreSQL (la segunda red de validación)
function errorDePostgres(err) {
  const campo = (err.detail || '').match(/Key \((\w+)/)?.[1]; // "Key (serie)=(X) already exists."
  switch (err.code) {
    case '23505': // UNIQUE
      return new ErrorApp(409, 'Ya existe un registro con ese valor', campo ? { [campo]: 'Ya existe, debe ser único' } : undefined);
    case '23503': // FOREIGN KEY
      return (err.detail || '').includes('is still referenced')
        ? new ErrorApp(409, 'No se puede eliminar: otros registros lo usan')
        : new ErrorApp(400, 'El registro relacionado no existe');
    case '23514': // CHECK
      return new ErrorApp(400, `La base de datos rechazó un valor (${err.constraint})`);
    case '22P02': case '22007': case '22008': // formato de número o fecha
      return new ErrorApp(400, 'Formato de dato inválido');
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
  const error = err instanceof ErrorApp ? err : errorDePostgres(err);
  if (!error) {
    console.error(err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
  res.status(error.status).json({ mensaje: error.message, campos: error.campos });
}

module.exports = manejarErrores;
