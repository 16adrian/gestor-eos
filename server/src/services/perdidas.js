// Regla de negocio del core: cuánto pierde EOS en cada incidente.
// La usan el admin (al registrar un incidente) y el seed (al cargar el Excel),
// así el cálculo vive en un solo lugar.
//
//  - Robo: EOS repone el equipo -> pérdida = costo del equipo - deducible cobrado.
//  - Garantía de una pieza que la marca SÍ cubre -> pérdida 0.
//  - Garantía de una pieza que la marca NO cubre (ej. teclado HP) -> pérdida = costo de la pieza.
//  - Garantía rechazada por el fabricante -> la reparación va a pérdida.
//  - Si la marca no tiene regla para esa pieza -> se asume cubierta (garantía estándar).
// Cuando la empresa da un rango (teclado HP $45-60) se usa el promedio.

const redondear = (n) => Math.round(n * 100) / 100;

function promedio(minimo, maximo) {
  const a = Number(minimo ?? maximo ?? 0);
  const b = Number(maximo ?? minimo ?? 0);
  return (a + b) / 2;
}

function calcularPerdida({ tipo, estado, cobertura, costoEquipo, recuperado = 0 }) {
  let cubierto = false;
  let costo = 0;

  if (tipo === 'robo') {
    costo = Number(costoEquipo || 0);
  } else if (!cobertura || (cobertura.cubre && estado !== 'rechazado')) {
    cubierto = true;
  } else {
    costo = promedio(cobertura.costo_min, cobertura.costo_max);
  }

  return {
    cubierto,
    costo_eos: redondear(costo),
    perdida_neta: redondear(Math.max(costo - Number(recuperado || 0), 0)),
  };
}

module.exports = { calcularPerdida };
