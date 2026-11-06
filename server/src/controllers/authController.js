// Login del administrador: compara la clave con el hash guardado y entrega un token JWT.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { consultar } = require('../config/db');
const ErrorApp = require('../utils/ErrorApp');

async function login(req, res) {
  const cuerpo = req.body || {};
  const email = String(cuerpo.email || '').trim().toLowerCase();
  const password = String(cuerpo.password || '');
  if (!email || !password) throw new ErrorApp(400, 'Ingresa tu correo y tu contraseña');

  const [usuario] = await consultar('SELECT * FROM usuarios WHERE email = $1', [email]);
  const claveCorrecta = usuario && (await bcrypt.compare(password, usuario.password_hash));
  if (!claveCorrecta) throw new ErrorApp(401, 'Correo o contraseña incorrectos');

  const token = jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );
  res.json({ token, usuario: { nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } });
}

module.exports = { login };
