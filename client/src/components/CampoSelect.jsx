// Dropdown que carga sus opciones del API. Si depende de otros campos (cascada),
// espera a que estén elegidos y pide solo las opciones filtradas por ellos.
// Ej.: Modelo depende de Marca -> GET /api/modelos/opciones?marca_id=6
import useDatos from '../utils/useDatos';

export default function CampoSelect({ campo, valores, valor, onChange, requerido }) {
  const dependencias = campo.dependeDe || [];
  const faltante = dependencias.find((d) => !valores[d]);

  let url = null;
  if (campo.recurso && !faltante) {
    const filtros = new URLSearchParams(campo.fijos || {});
    dependencias.forEach((d) => filtros.set(d, valores[d]));
    url = `/${campo.recurso}/opciones?${filtros}`;
  }
  const { datos } = useDatos(url);
  const opciones = campo.opciones || datos || [];

  return (
    <select
      id={campo.nombre}
      className="formulario__control"
      value={valor ?? ''}
      onChange={(e) => onChange(e.target.value)}
      required={requerido}
      disabled={Boolean(faltante)}
    >
      <option value="">{faltante ? 'Primero elige el campo anterior' : '-- Elige --'}</option>
      {opciones.map((o) => (
        <option key={o.id} value={o.id}>{o.nombre}</option>
      ))}
    </select>
  );
}
