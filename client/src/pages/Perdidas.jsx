// CORE: pérdidas por incidentes.
//  1) Garantías: pieza x marca, separando lo que cubrió la marca de lo que pagó EOS.
//  2) Robos por marca (absoluto y por cada 100 equipos).
//  3) Año contra año, con la variación % frente al año anterior.
import { Link } from 'react-router-dom';
import Encabezado from '../components/Encabezado';
import useDatos from '../utils/useDatos';
import { dinero, decimal, porcentaje } from '../utils/formato';

export default function Perdidas() {
  const { datos, error } = useDatos('/core/perdidas');
  const { datos: anual } = useDatos('/core/anual');

  if (error) return <p className="alerta alerta--peligro">{error}</p>;
  if (!datos) return <p>Calculando...</p>;

  const marcas = [...new Set(datos.piezas.map((p) => p.marca))];
  const piezas = [...new Set(datos.piezas.map((p) => p.pieza))];
  const celda = (pieza, marca) => datos.piezas.find((p) => p.pieza === pieza && p.marca === marca);
  const totalMarca = (marca, campo) => datos.piezas.filter((p) => p.marca === marca).reduce((s, p) => s + Number(p[campo] || 0), 0);

  return (
    <section>
      <Encabezado titulo="Incidentes y pérdidas" conCorte={false}
        descripcion="Lo que la garantía de cada marca NO cubre lo paga EOS. Clic en un número para ver los incidentes." />

      <div className="encabezado">
        <h2 className="encabezado__subtitulo">Garantías: pieza x marca</h2>
        <Link to="/admin/incidentes?crear_tipo=garantia" className="boton boton--primario">+ Registrar incidente</Link>
      </div>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>Pieza</th>
              {marcas.map((m) => <th key={m}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {piezas.map((pieza) => (
              <tr key={pieza}>
                <td>{pieza}</td>
                {marcas.map((marca) => {
                  const c = celda(pieza, marca);
                  if (!c) return <td key={marca} />;
                  return (
                    <td key={marca} className={c.pagados_eos > 0 ? 'tabla__celda--peor' : ''}>
                      <Link to={`/admin/incidentes?tipo=garantia&marca_id=${c.marca_id}&pieza_id=${c.pieza_id}&nota=Garantías de ${pieza} en ${marca}`}>
                        {c.casos} {c.casos === 1 ? 'caso' : 'casos'}
                      </Link>
                      <small className="tabla__nota">{explicar(c)}</small>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="tabla__total">
              <td>Pérdida total</td>
              {marcas.map((m) => (
                <td key={m}>
                  {dinero(totalMarca(m, 'perdida'))}
                  <small className="tabla__nota">rango {dinero(totalMarca(m, 'perdida_min'))}–{dinero(totalMarca(m, 'perdida_max'))}</small>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="encabezado__subtitulo">Robos por marca</h2>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr><th>Marca</th><th>Robos</th><th>Por cada 100 equipos</th><th>Pérdida (reposición - deducible)</th></tr>
          </thead>
          <tbody>
            {datos.robos.map((r) => (
              <tr key={r.marca}>
                <td>{r.marca}</td>
                <td className="tabla__numero">
                  <Link to={`/admin/incidentes?tipo=robo&marca_id=${r.marca_id}&nota=Robos de ${r.marca}`}>{r.robos}</Link>
                </td>
                <td className="tabla__numero">{decimal(r.robos_por_100)}</td>
                <td className="tabla__numero">{dinero(r.perdida)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="encabezado__subtitulo">Año contra año</h2>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr><th>Año</th><th>Garantías</th><th>Robos</th><th>Variación robos</th><th>Pérdida total</th><th>Variación pérdida</th></tr>
          </thead>
          <tbody>
            {(anual || []).map((a) => (
              <tr key={a.anio}>
                <td>{a.anio}</td>
                <td className="tabla__numero"><Link to={`/admin/incidentes?tipo=garantia&anio=${a.anio}&nota=Garantías ${a.anio}`}>{a.garantias}</Link></td>
                <td className="tabla__numero"><Link to={`/admin/incidentes?tipo=robo&anio=${a.anio}&nota=Robos ${a.anio}`}>{a.robos}</Link></td>
                <td className="tabla__numero"><Variacion valor={a.var_robos} /></td>
                <td className="tabla__numero">{dinero(a.perdida)}</td>
                <td className="tabla__numero"><Variacion valor={a.var_perdida} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Texto de una celda: quién pagó y cuánto
function explicar(c) {
  if (c.pagados_eos === 0) return 'Cubierto por la marca';
  if (c.perdida_min === null) return `Paga EOS: ${c.pagados_eos} (costo por definir)`;
  return `Paga EOS: ${dinero(c.perdida)} (${dinero(c.perdida_min)}–${dinero(c.perdida_max)})`;
}

// Subir pérdidas o robos es malo (rojo); bajar es bueno (verde)
function Variacion({ valor }) {
  if (valor === null || valor === undefined) return '—';
  const sube = Number(valor) > 0;
  return <span className={`variacion variacion--${sube ? 'sube' : 'baja'}`}>{sube ? '▲' : '▼'} {porcentaje(Math.abs(valor))}</span>;
}
