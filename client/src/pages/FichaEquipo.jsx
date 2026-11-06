// Ficha de un equipo: datos, resultado económico (ganancia o pérdida) e historial.
import { Link, useParams } from 'react-router-dom';
import Encabezado, { useCorte } from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import useDatos from '../utils/useDatos';
import { dinero, fecha, numero, siNo } from '../utils/formato';

export default function FichaEquipo() {
  const { id } = useParams();
  const [corte] = useCorte();
  const { datos, error } = useDatos(`/core/equipos/${id}?corte=${corte}`);

  if (error) return <p className="alerta alerta--peligro">{error}</p>;
  if (!datos) return <p>Cargando...</p>;
  const { equipo: e, incidentes, venta } = datos;
  const situacion = { vencido: 'Vencido', por_vencer: 'Vence en menos de 90 días', vigente: 'Vigente' };

  return (
    <section>
      <Encabezado titulo={`Equipo ${e.serie}`} descripcion={`${e.marca} · ${e.modelo} · ${e.empresa || 'Sin empresa'}`} />

      <div className="barra">
        <span className={`etiqueta etiqueta--${e.estado}`}>{e.estado}</span>
        {e.situacion && <span className={`etiqueta etiqueta--${e.situacion}`}>{situacion[e.situacion]}</span>}
        <Link className="boton boton--secundario boton--chico" to={`/admin/equipos?q=${e.serie}`}>Editar</Link>
        {e.estado === 'activo' && (
          <Link className="boton boton--primario boton--chico"
            to={`/admin/incidentes?crear_tipo=garantia&crear_marca_id=${e.marca_id}&crear_modelo_id=${e.modelo_id}&crear_equipo_id=${e.id}`}>
            + Registrar incidente
          </Link>
        )}
      </div>

      <div className="grilla">
        <Tarjeta titulo="Ingreso por renta" valor={dinero(e.ingreso_renta)} detalle={`${e.meses_rentados} meses x ${dinero(e.tarifa)}`} />
        <Tarjeta titulo="Precio de venta" valor={dinero(e.precio_venta)} />
        <Tarjeta titulo="Costo de compra" valor={dinero(e.costo_compra)} />
        <Tarjeta titulo="Pérdidas por incidentes" valor={dinero(e.perdidas)} />
        <Tarjeta titulo="Ganancia neta" valor={dinero(e.ganancia)} detalle={e.ganancia < 0 ? 'Aún no recupera la inversión' : 'Ya recuperó la inversión'} />
        <Tarjeta titulo="Meses para recuperar" valor={e.tarifa ? numero(Math.ceil(e.costo_compra / e.tarifa)) : '—'} detalle="costo ÷ tarifa" />
      </div>

      <dl className="ficha">
        <dt>Tipo</dt><dd>{e.tipo}</dd>
        <dt>Entrega</dt><dd>{fecha(e.fecha_entrega)}</dd>
        <dt>Vencimiento (36 meses)</dt><dd>{fecha(e.fecha_vencimiento)}</dd>
        <dt>Tarifa mensual</dt><dd>{dinero(e.tarifa)}</dd>
      </dl>

      <h2 className="encabezado__subtitulo">Incidentes</h2>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Pieza</th><th>¿Cubre la marca?</th><th>Pérdida EOS</th><th>Descripción</th></tr></thead>
          <tbody>
            {incidentes.map((i) => (
              <tr key={i.id}>
                <td>{fecha(i.fecha)}</td>
                <td><span className={`etiqueta etiqueta--${i.tipo}`}>{i.tipo}</span></td>
                <td>{i.pieza || '—'}</td>
                <td>{i.tipo === 'robo' ? '—' : siNo(i.cubierto)}</td>
                <td className="tabla__numero">{dinero(i.perdida_neta)}</td>
                <td>{i.descripcion}</td>
              </tr>
            ))}
            {incidentes.length === 0 && <tr><td colSpan={6} className="tabla__vacia">Sin incidentes</td></tr>}
          </tbody>
        </table>
      </div>

      {venta && (
        <p className="alerta alerta--info">
          Vendido el {fecha(venta.fecha)} a {venta.comprador} por {dinero(venta.precio)} ({venta.condicion}).
        </p>
      )}
    </section>
  );
}
