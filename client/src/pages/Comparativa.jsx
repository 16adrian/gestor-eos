// CORE: comparativa lado a lado (marca vs marca o modelo vs modelo).
// Se resalta la mejor celda (verde) y la peor (roja) de cada indicador.
// Cada número subrayado abre la lista de registros que lo forman.
import { Link, useSearchParams } from 'react-router-dom';
import Encabezado, { useCorte } from '../components/Encabezado';
import indicadores from '../config/indicadores';
import useDatos from '../utils/useDatos';
import { formatear } from '../utils/formato';

export default function Comparativa() {
  const [params, setParams] = useSearchParams();
  const [corte] = useCorte();
  const dimension = params.get('dimension') || 'marca';
  const ids = params.get('ids') || '';
  const filtro = dimension === 'marca' ? 'marca_id' : 'modelo_id';

  const { datos: opciones } = useDatos(`/${dimension === 'marca' ? 'marcas' : 'modelos'}/opciones`);
  // Por modelo hay que elegir cuáles (son más de 70); por marca, sin elegir se muestran todas
  const faltaElegir = dimension === 'modelo' && !ids;
  const { datos: grupos, cargando, error } = useDatos(faltaElegir ? null : `/core/comparar?dimension=${dimension}&ids=${ids}&corte=${corte}`);

  const elegidos = ids ? ids.split(',') : [];

  function cambiar(clave, valor) {
    params.set(clave, valor);
    if (clave === 'dimension') params.delete('ids');
    setParams(params);
  }

  function alternar(id) {
    const nuevos = elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id];
    cambiar('ids', nuevos.join(','));
  }

  // Si se comparan exactamente 2 grupos, se muestra la diferencia
  const conDiferencia = grupos?.length === 2;

  return (
    <section>
      <Encabezado titulo="Comparativa" descripcion="¿Cuánto gana y cuánto pierde EOS con cada marca o modelo? Valores absolutos y por cada 100 equipos." />

      <div className="panel">
        <div className="barra">
          <span>Comparar por:</span>
          {['marca', 'modelo'].map((d) => (
            <button key={d} type="button" onClick={() => cambiar('dimension', d)}
              className={`boton boton--chico ${dimension === d ? 'boton--primario' : 'boton--secundario'}`}>
              {d === 'marca' ? 'Marca' : 'Modelo'}
            </button>
          ))}
          <span className="barra__total">
            {elegidos.length ? `${elegidos.length} elegidos` : (dimension === 'marca' ? 'Sin elegir: se muestran todas' : 'Elige 2 o 3 modelos')}
          </span>
        </div>
        <div className="selector">
          {(opciones || []).map((o) => (
            <label key={o.id} className="selector__opcion">
              <input type="checkbox" checked={elegidos.includes(String(o.id))} onChange={() => alternar(String(o.id))} />
              {o.nombre}
            </label>
          ))}
        </div>
      </div>

      {faltaElegir && <p className="alerta alerta--info">Marca 2 o 3 modelos arriba (o desde el Ranking) para compararlos.</p>}
      {error && <p className="alerta alerta--peligro">{error}</p>}
      {cargando && !grupos && <p>Calculando...</p>}

      {grupos && grupos.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla tabla--comparativa">
            <thead>
              <tr>
                <th>Indicador</th>
                {grupos.map((g) => <th key={g.id}>{g.nombre}</th>)}
                {conDiferencia && <th>Diferencia</th>}
              </tr>
            </thead>
            <tbody>
              {indicadores.map((ind) => ind.seccion ? (
                <tr key={ind.seccion} className="tabla__seccion">
                  <td colSpan={grupos.length + 2}>{ind.seccion}</td>
                </tr>
              ) : (
                <FilaIndicador key={ind.clave} ind={ind} grupos={grupos} filtro={filtro} corte={corte} conDiferencia={conDiferencia} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FilaIndicador({ ind, grupos, filtro, corte, conDiferencia }) {
  const valores = grupos.map((g) => Number(g[ind.clave] ?? 0));
  const mejor = ind.mejor === 'alto' ? Math.max(...valores) : Math.min(...valores);
  const peor = ind.mejor === 'alto' ? Math.min(...valores) : Math.max(...valores);

  function clase(valor) {
    if (!ind.mejor || grupos.length < 2 || mejor === peor) return '';
    if (valor === mejor) return 'tabla__celda--mejor';
    if (valor === peor) return 'tabla__celda--peor';
    return '';
  }

  return (
    <tr>
      <td>{ind.titulo}</td>
      {grupos.map((g, i) => (
        <td key={g.id} className={`tabla__numero ${clase(valores[i])}`}>
          {ind.detalle && valores[i] > 0
            ? <Link to={ind.detalle(g, filtro, corte)}>{formatear(g[ind.clave], ind.formato)}</Link>
            : formatear(g[ind.clave], ind.formato)}
        </td>
      ))}
      {conDiferencia && <td className="tabla__numero">{formatear(valores[0] - valores[1], ind.formato)}</td>}
    </tr>
  );
}
