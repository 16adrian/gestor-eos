// Validaciones de datos sensibles. Se ejecutan en el SERVIDOR antes de grabar,
// así que no se pueden saltar desactivando el JavaScript del navegador.
const ErrorApp = require('./ErrorApp');

const soloDigitos = (valor, largo) => new RegExp(`^\\d{${largo}}$`).test(valor);
const provinciaValida = (dosDigitos) => {
  const p = Number(dosDigitos);
  return (p >= 1 && p <= 24) || p === 30; // 30 = ecuatorianos registrados en el exterior
};

// Cédula ecuatoriana: 10 dígitos, provincia válida y dígito verificador módulo 10.
function validarCedula(cedula) {
  if (!soloDigitos(cedula, 10)) return 'La cédula debe tener 10 números';
  if (!provinciaValida(cedula.slice(0, 2))) return 'Código de provincia inválido (01-24 o 30)';
  if (Number(cedula[2]) >= 6) return 'El tercer dígito de una cédula debe ser menor a 6';

  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let producto = Number(cedula[i]) * (i % 2 === 0 ? 2 : 1);
    if (producto > 9) producto -= 9;
    suma += producto;
  }
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === Number(cedula[9]) ? null : 'Dígito verificador de la cédula incorrecto';
}

// Módulo 11 que usa el SRI para RUC de sociedades.
function modulo11(digitos, coeficientes) {
  const suma = coeficientes.reduce((total, coef, i) => total + coef * Number(digitos[i]), 0);
  const residuo = suma % 11;
  return residuo === 0 ? 0 : 11 - residuo;
}

// RUC ecuatoriano (13 dígitos). Según el tercer dígito:
//   0-5 persona natural  -> los 10 primeros son una cédula válida + establecimiento (001)
//   6   sector público   -> módulo 11, verificador en la posición 9, termina en 0001
//   9   sociedad privada -> módulo 11, verificador en la posición 10, termina en 001
function validarRuc(ruc) {
  if (!soloDigitos(ruc, 13)) return 'El RUC debe tener 13 números';
  if (!provinciaValida(ruc.slice(0, 2))) return 'Código de provincia inválido (01-24 o 30)';
  const tercero = Number(ruc[2]);

  if (tercero < 6) {
    const errorCedula = validarCedula(ruc.slice(0, 10));
    if (errorCedula) return `RUC de persona natural inválido: ${errorCedula.toLowerCase()}`;
    return ruc.slice(10) === '000' ? 'El establecimiento no puede ser 000' : null;
  }
  if (tercero === 6) {
    if (modulo11(ruc, [3, 2, 7, 6, 5, 4, 3, 2]) !== Number(ruc[8])) return 'Dígito verificador del RUC público incorrecto';
    return ruc.slice(9) === '0000' ? 'El establecimiento no puede ser 0000' : null;
  }
  if (tercero === 9) {
    if (modulo11(ruc, [4, 3, 2, 7, 6, 5, 4, 3, 2]) !== Number(ruc[9])) return 'Dígito verificador del RUC de sociedad incorrecto';
    return ruc.slice(10) === '000' ? 'El establecimiento no puede ser 000' : null;
  }
  return 'El tercer dígito del RUC debe ser 0-5 (natural), 6 (pública) o 9 (sociedad)';
}

// Comprador de una venta: puede ser persona (cédula) o empresa (RUC).
function validarIdentificacion(valor) {
  if (valor.length === 10) return validarCedula(valor);
  if (valor.length === 13) return validarRuc(valor);
  return 'Ingresa una cédula (10 dígitos) o un RUC (13 dígitos)';
}

// Serie del equipo: letras y números (5 a 30), sin espacios.
function validarSerie(serie) {
  return /^[A-Z0-9-]{5,30}$/.test(serie) ? null : 'La serie debe tener de 5 a 30 letras o números, sin espacios';
}

function esFechaFutura(fecha) {
  return new Date(fecha) > new Date();
}

// Lanza un error 400 con todos los campos que fallaron (si hay alguno).
function revisar(errores) {
  if (Object.keys(errores).length > 0) {
    throw new ErrorApp(400, 'Revisa los campos marcados', errores);
  }
}

module.exports = {
  validarCedula, validarRuc, validarIdentificacion, validarSerie, esFechaFutura, revisar,
};
