// Título de las páginas del core + selector de la fecha de corte.
// La fecha vive en la URL (?corte=2026-10-16) para que los enlaces la conserven.
import { useSearchParams } from 'react-router-dom';
import { hoy } from '../utils/formato';

export function useCorte() {
  const [params, setParams] = useSearchParams();
  const corte = params.get('corte') || hoy();
  const cambiarCorte = (valor) => {
    params.set('corte', valor);
    setParams(params);
  };
  return [corte, cambiarCorte];
}

export default function Encabezado({ titulo, descripcion, conCorte = true }) {
  const [corte, cambiarCorte] = useCorte();
  return (
    <div className="encabezado">
      <div>
        <h1 className="encabezado__titulo">{titulo}</h1>
        {descripcion && <p className="encabezado__texto">{descripcion}</p>}
      </div>
      {conCorte && (
        <label className="encabezado__corte">
          Fecha de corte
          <input type="date" className="formulario__control" value={corte}
            onChange={(e) => e.target.value && cambiarCorte(e.target.value)} />
        </label>
      )}
    </div>
  );
}
