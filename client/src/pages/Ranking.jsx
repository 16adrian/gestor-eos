// CORE: ranking de modelos por ganancia, con su nivel de riesgo y el Pareto de pérdidas.
// Se pueden marcar hasta 3 modelos y compararlos lado a lado.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Encabezado, { useCorte } from '../components/Encabezado';
import useDatos from '../utils/useDatos';
import { dinero, decimal, numero, porcentaje } from '../utils/formato';

export default function Ranking() {
  const [corte] = useCorte();
  const { datos, error } = useDatos(`/core/ranking?corte=${corte}`);
  const [riesgo, setRiesgo] = useState('');
  const [elegidos, setElegidos] = useState([]);
  const navegar = useNavigate();

  if (error) return <p className="alerta alerta--peligro">{error}</p>;
  if (!datos) return <p>Calculando...</p>;

  const filas = riesgo ? datos.filter((m) => m.riesgo === riesgo) : datos;

  function alternar(id) {
    setElegidos(elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id].slice(-3));
  }

  return (
    <section>
      <Encabezado titulo="Ranking de modelos"
        descripcion="Riesgo ALTO: 10 o más robos por cada 100 equipos o la mitad del parque vencido. Pareto: % acumulado de las pérdidas." />

      <div className="barra">
        <select className="formulario__control" value={riesgo} onChange={(e) => setRiesgo(e.target.value)}>
          <option value="">Todos los riesgos</option>
          <option value="alto">Riesgo alto</option>
          <option value="medio">Riesgo medio</option>
          <option value="bajo">Riesgo bajo</option>
        </select>
        <button type="button" className="boton boton--primario" disabled={elegidos.length < 2}
          onClick={() => navegar(`/core/comparativa?dimension=modelo&ids=${elegidos.join(',')}&corte=${corte}`)}>
          Comparar {elegidos.length} modelos
        </button>
        <span className="barra__total">Marca 2 o 3 modelos para compararlos</span>
      </div>

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th />
              <th>#</th>
              <th>Modelo</th>
              <th>Activos</th>
              <th>Ingreso mensual</th>
              <th>Ingreso acumulado</th>
              <th>Ventas</th>
              <th>Robos x 100</th>
              <th>% vencido</th>
              <th>Meses para recuperar</th>
              <th>Ganancia neta</th>
              <th>Riesgo</th>
              <th>Pareto pérdidas</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((m) => (
              <tr key={m.modelo_id}>
                <td><input type="checkbox" checked={elegidos.includes(m.modelo_id)} onChange={() => alternar(m.modelo_id)} /></td>
                <td>{m.puesto}</td>
                <td>
                  <Link to={`/admin/equipos?modelo_id=${m.modelo_id}&nota=Equipos ${m.modelo}`}>{m.modelo}</Link>
                  <small className="tabla__nota">{m.marca}</small>
                </td>
                <td className="tabla__numero">{numero(m.activos)}</td>
                <td className="tabla__numero">{dinero(m.ingreso_mensual)}</td>
                <td className="tabla__numero">{dinero(m.ingreso_renta)}</td>
                <td className="tabla__numero">{dinero(m.ingreso_ventas)}</td>
                <td className="tabla__numero">
                  {m.robos > 0
                    ? <Link to={`/admin/incidentes?tipo=robo&modelo_id=${m.modelo_id}&nota=Robos ${m.modelo}`}>{decimal(m.robos_por_100)}</Link>
                    : '0'}
                </td>
                <td className="tabla__numero">{porcentaje(m.pct_vencido)}</td>
                <td className="tabla__numero">{decimal(m.meses_recuperacion)}</td>
                <td className={`tabla__numero ${m.ganancia < 0 ? 'tabla__celda--peor' : ''}`}>{dinero(m.ganancia)}</td>
                <td><span className={`etiqueta etiqueta--${m.riesgo}`}>{m.riesgo}</span></td>
                <td className="tabla__numero">{porcentaje(m.pareto_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
