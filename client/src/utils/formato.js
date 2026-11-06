// Formatos de números y fechas para mostrar en pantalla (estilo Ecuador).

export const dinero = (n) =>
  n === null || n === undefined ? '—' : Number(n).toLocaleString('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const numero = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('es-EC'));

export const decimal = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('es-EC', { maximumFractionDigits: 1 }));

export const porcentaje = (n) => (n === null || n === undefined ? '—' : `${decimal(n)} %`);

export const fecha = (f) => (f ? f.split('-').reverse().join('/') : '—'); // 2026-10-16 -> 16/10/2026

export const siNo = (v) => (v ? 'Sí' : 'No');

const formatos = { dinero, numero, decimal, porcentaje, fecha, siNo };

// Formatea un valor según el nombre del formato ('dinero', 'fecha'...)
export function formatear(valor, formato) {
  return formatos[formato] ? formatos[formato](valor) : valor ?? '—';
}

// Fecha de hoy en formato AAAA-MM-DD (hora local)
export const hoy = () => new Date().toLocaleDateString('en-CA');

// Último día de la ventana de 12 meses (mes del corte + 11 meses), igual que en el servidor
export function finVentana(fechaTexto) {
  const [anio, mes] = fechaTexto.split('-').map(Number);
  return new Date(anio, mes - 1 + 12, 0).toLocaleDateString('en-CA');
}

// Nombre corto del mes: '2026-10' -> 'oct 26'
export function nombreMes(anioMes) {
  const [anio, mes] = anioMes.split('-');
  const nombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${nombres[Number(mes) - 1]} ${anio.slice(2)}`;
}
