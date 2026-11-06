// Punto de entrada: carga las variables de entorno y enciende el servidor.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = require('./app');

const PUERTO = process.env.PORT || 4000;
app.listen(PUERTO, () => {
  console.log(`Gestor EOS API escuchando en http://localhost:${PUERTO}/api`);
});
