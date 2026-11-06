// Error con código HTTP y, si aplica, el motivo de cada campo del formulario.
// Ejemplo: throw new ErrorApp(400, 'Datos inválidos', { ruc: 'Dígito verificador incorrecto' })
class ErrorApp extends Error {
  constructor(status, mensaje, campos) {
    super(mensaje);
    this.status = status;
    this.campos = campos;
  }
}

module.exports = ErrorApp;
