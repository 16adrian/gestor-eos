// CONTROLADOR genérico del admin: recibe la petición HTTP, llama a las reglas
// (services/reglas.js) y al modelo (models/), y responde JSON.
// Un solo controlador sirve a las 9 tablas.
const modelos = require('../models');
const reglas = require('../services/reglas');

function crearControlador(nombre) {
  const modelo = modelos[nombre];
  const regla = reglas[nombre];

  return {
    listar: async (req, res) => res.json(await modelo.listar(req.query)),

    opciones: async (req, res) => res.json(await modelo.opciones(req.query)),

    obtener: async (req, res) => res.json(await modelo.obtener(req.params.id)),

    crear: async (req, res) => {
      const datos = await regla.validar(req.body || {}, null);
      const nuevo = await modelo.crear(datos);
      if (regla.despuesDeGuardar) await regla.despuesDeGuardar(nuevo);
      res.status(201).json(nuevo);
    },

    actualizar: async (req, res) => {
      const actual = await modelo.obtener(req.params.id);
      const datos = await regla.validar(req.body || {}, actual);
      const editado = await modelo.actualizar(req.params.id, datos);
      if (regla.despuesDeGuardar) await regla.despuesDeGuardar(editado);
      res.json(editado);
    },

    eliminar: async (req, res) => {
      const eliminado = await modelo.eliminar(req.params.id);
      if (regla.despuesDeEliminar) await regla.despuesDeEliminar(eliminado);
      res.json({ mensaje: modelo.bajaLogica ? 'Equipo dado de baja' : 'Registro eliminado' });
    },
  };
}

module.exports = crearControlador;
