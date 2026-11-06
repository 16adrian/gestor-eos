// CORE: matriz marca x mes de los equipos que vencen (36 meses) en los próximos 12 meses,
// más los que ya vencieron. Cada celda abre la lista de esos equipos (para renovar, vender o dar de baja).
import { Link } from 'react-router-dom';
import Encabezado, { useCorte } from '../components/Encabezado';
import Tarjeta from '../components/Tarjeta';
import useDatos from '../utils/useDatos';
import { dinero, nombreMes, numero } from '../utils/formato';

export default function Vencimientos() {
  const [corte] = useCorte();
  const { datos, error } = useDatos(`/core/vencimientos?corte=${corte}`);

  if (error) return <p className="alerta alerta--peligro">{error}</p>;
  if (!datos) return <p>Calculando...</p>;

  const columnas = ['vencido', ...datos.meses];
  // Se agrupan las celdas por marca: { HP: { id, vencido: {...}, '2026-11': {...} } }
  const marcas = {};
  for (const c of datos.celdas) {
    marcas[c.marca] ??= { id: c.marca_id };
    marcas[c.marca][c.columna] = c;
  }
  const total = (lista, campo) => lista.reduce((suma, c) => suma + Number(c?.[campo] || 0), 0);
  const ingresoEnRiesgo = total(datos.celdas, 'ingreso');

  // Enlace al detalle de una celda
  const detalle = (marcaId, marca, columna) => (columna === 'vencido'
    ? `/admin/equipos?marca_id=${marcaId}&vencido_al=${corte}&nota=Equipos ${marca} ya vencidos`
    : `/admin/equipos?marca_id=${marcaId}&vence_mes=${columna}&vence_desde=${corte}&nota=Equipos ${marca} que vencen en ${nombreMes(columna)}`);

  return (
    <section>
      <Encabezado titulo="Equipos por vencer" descripcion="Cada equipo se renta 36 meses. Clic en una celda para ver los equipos y renovarlos, venderlos o darlos de baja." />

      <div className="grilla">
        <Tarjeta titulo="Ya vencidos" valor={numero(total(datos.celdas.filter((c) => c.columna === 'vencido'), 'cantidad'))} />
        <Tarjeta titulo="Vencen en 12 meses" valor={numero(total(datos.celdas.filter((c) => c.columna !== 'vencido'), 'cantidad'))} />
        <Tarjeta titulo="Ingreso mensual en riesgo" valor={dinero(ingresoEnRiesgo)} />
      </div>

      <div className="tabla-contenedor">
        <table className="tabla matriz">
          <thead>
            <tr>
              <th>Marca</th>
              {columnas.map((c) => <th key={c}>{c === 'vencido' ? 'Vencidos' : nombreMes(c)}</th>)}
              <th>Total</th>
              <th>Ingreso en riesgo</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(marcas).map(([marca, fila]) => {
              const celdas = columnas.map((c) => fila[c]);
              return (
                <tr key={marca}>
                  <td>{marca}</td>
                  {columnas.map((c) => (
                    <td key={c} className={`matriz__celda ${nivel(fila[c]?.cantidad)} ${c === 'vencido' ? 'matriz__celda--vencido' : ''}`}>
                      {fila[c] ? <Link to={detalle(fila.id, marca, c)}>{fila[c].cantidad}</Link> : ''}
                    </td>
                  ))}
                  <td className="tabla__numero"><strong>{total(celdas, 'cantidad')}</strong></td>
                  <td className="tabla__numero">{dinero(total(celdas, 'ingreso'))}</td>
                </tr>
              );
            })}
            <tr className="tabla__total">
              <td>Total</td>
              {columnas.map((c) => <td key={c}>{total(datos.celdas.filter((x) => x.columna === c), 'cantidad') || ''}</td>)}
              <td className="tabla__numero">{total(datos.celdas, 'cantidad')}</td>
              <td className="tabla__numero">{dinero(ingresoEnRiesgo)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Color de la celda según cuántos equipos vencen (mapa de calor)
function nivel(cantidad = 0) {
  if (cantidad >= 20) return 'matriz__celda--alta';
  if (cantidad >= 8) return 'matriz__celda--media';
  if (cantidad > 0) return 'matriz__celda--baja';
  return '';
}
