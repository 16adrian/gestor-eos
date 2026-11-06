// RUTAS: conectan cada URL con su controlador.
const express = require('express');
const requiereLogin = require('../middlewares/auth');
const { login } = require('../controllers/authController');
const core = require('../controllers/coreController');
const crearControlador = require('../controllers/crudController');
const modelos = require('../models');

const router = express.Router();

// Públicas
router.get('/salud', (req, res) => res.json({ estado: 'ok', hora: new Date() }));
router.post('/auth/login', login);

// De aquí en adelante hay que haber iniciado sesión
router.use(requiereLogin);

// Core (comparativas y resultados)
router.get('/core/resumen', core.resumen);
router.get('/core/comparar', core.comparar);
router.get('/core/vencimientos', core.vencimientos);
router.get('/core/perdidas', core.perdidas);
router.get('/core/anual', core.anual);
router.get('/core/ranking', core.ranking);
router.get('/core/equipos/:id', core.fichaEquipo);
router.post('/equipos/:id/renovar', core.renovar);
router.get('/coberturas/consulta', core.consultarCobertura);

// Admin: el mismo CRUD para cada tabla -> /api/empresas, /api/equipos, ...
for (const nombre of Object.keys(modelos)) {
  const c = crearControlador(nombre);
  router.get(`/${nombre}`, c.listar);
  router.get(`/${nombre}/opciones`, c.opciones);
  router.get(`/${nombre}/:id`, c.obtener);
  router.post(`/${nombre}`, c.crear);
  router.put(`/${nombre}/:id`, c.actualizar);
  router.delete(`/${nombre}/:id`, c.eliminar);
}

module.exports = router;
