// Inicio: los números principales del negocio. Cada tarjeta abre su detalle.
import { Link } from 'react-router-dom';
import Encabezado, { useCorte } from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import useDatos from '../utils/useDatos';
import { dinero, numero, finVentana } from '../utils/formato';

export default function Inicio() {
  const [corte] = useCorte();
  const { datos: r, error } = useDatos(`/core/resumen?corte=${corte}`);

  return (
    <section>
      <Encabezado titulo="Resumen del negocio"
        descripcion="EOS compra equipos, los renta ~36 meses a empresas y luego los vende como usados." />

      {error && <p className="alerta alerta--peligro">{error}</p>}
      {r && (
        <div className="grilla">
          <Tarjeta titulo="Equipos activos" valor={numero(r.activos)} enlace="/admin/equipos?estado=activo&nota=Equipos activos" />
          <Tarjeta titulo="Ingreso mensual por renta" valor={dinero(r.ingreso_mensual)} enlace="/core/comparativa" />
          <Tarjeta titulo="Ya vencidos" valor={numero(r.vencidos)} detalle="Cumplieron 36 meses"
            enlace={`/admin/equipos?vencido_al=${corte}&nota=Equipos vencidos`} />
          <Tarjeta titulo="Vencen en 12 meses" valor={numero(r.por_vencer_12m)} detalle={`${dinero(r.ingreso_en_riesgo)}/mes en riesgo`}
            enlace={`/admin/equipos?vence_desde=${corte}&vence_hasta=${finVentana(corte)}&nota=Equipos que vencen en 12 meses`} />
          <Tarjeta titulo="Ingreso acumulado por renta" valor={dinero(r.ingreso_renta)} />
          <Tarjeta titulo="Ingreso por ventas" valor={dinero(r.ingreso_ventas)} detalle={`${numero(r.vendidos)} equipos vendidos`} enlace="/admin/ventas" />
          <Tarjeta titulo="Pérdidas por incidentes" valor={dinero(r.perdidas)} detalle="Garantías no cubiertas + robos" enlace="/core/perdidas" />
          <Tarjeta titulo="Ganancia neta a la fecha" valor={dinero(r.ganancia)} detalle="Renta + ventas - costo de compra - pérdidas" enlace="/core/ranking" />
        </div>
      )}

      <h2 className="encabezado__subtitulo">¿Qué responde el core?</h2>
      <div className="grilla grilla--dos">
        <Link to="/core/comparativa" className="tarjeta tarjeta--enlace">
          <strong>Comparativa</strong>
          <span className="tarjeta__detalle">¿Cuánto gana y pierde EOS con HP frente a Lenovo? Marca vs marca y modelo vs modelo.</span>
        </Link>
        <Link to="/core/vencimientos" className="tarjeta tarjeta--enlace">
          <strong>Vencimientos</strong>
          <span className="tarjeta__detalle">¿Qué equipos cumplen 36 meses y cuándo? Matriz marca x mes.</span>
        </Link>
        <Link to="/core/perdidas" className="tarjeta tarjeta--enlace">
          <strong>Pérdidas</strong>
          <span className="tarjeta__detalle">¿Cuánto cuesta lo que la garantía no cubre? Pieza x marca, robos y año vs año.</span>
        </Link>
        <Link to="/core/ranking" className="tarjeta tarjeta--enlace">
          <strong>Ranking de modelos</strong>
          <span className="tarjeta__detalle">¿Qué modelos conviene renovar o dejar de comprar? Riesgo y Pareto.</span>
        </Link>
      </div>
    </section>
  );
}
