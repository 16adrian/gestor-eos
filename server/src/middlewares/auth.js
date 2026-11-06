// Protege el API: solo pasa quien envía un token válido (Authorization: Bearer <token>).
const jwt = require('jsonwebtoken');
const ErrorApp = require('../utils/ErrorApp');

function requiereLogin(req, res, next) {
  const [tipo, token] = String(req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) throw new ErrorApp(401, 'Inicia sesión para continuar');
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    throw new ErrorApp(401, 'Tu sesión expiró, vuelve a iniciar sesión');
  }
}

module.exports = requiereLogin;
