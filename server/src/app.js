// Configura Express: JSON, CORS, rutas del API y, en producción, la página de React.
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const rutas = require('./routes');
const manejarErrores = require('./middlewares/errores');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', rutas);
app.use('/api', (req, res) => res.status(404).json({ mensaje: `No existe la ruta ${req.method} ${req.originalUrl}` }));

// En Render, el mismo servidor entrega el frontend ya compilado (client/dist)
const carpetaReact = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(carpetaReact)) {
  app.use(express.static(carpetaReact));
  // Cualquier otra URL (ej. /admin/equipos) la resuelve React Router
  app.use((req, res) => res.sendFile(path.join(carpetaReact, 'index.html')));
}

app.use(manejarErrores);

module.exports = app;
