// Tarjeta con un número grande (KPI). Si tiene enlace, al hacer clic abre su detalle.
import { Link } from 'react-router-dom';

export default function Tarjeta({ titulo, valor, enlace, detalle }) {
  const contenido = (
    <>
      <span className="tarjeta__titulo">{titulo}</span>
      <strong className="tarjeta__valor">{valor}</strong>
      {detalle && <span className="tarjeta__detalle">{detalle}</span>}
    </>
  );
  return enlace
    ? <Link to={enlace} className="tarjeta tarjeta--enlace">{contenido}</Link>
    : <div className="tarjeta">{contenido}</div>;
}
