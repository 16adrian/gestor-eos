// Administración (CRUD) de cualquier tabla: /admin/equipos, /admin/empresas...
// Lo que cambia entre tablas está en config/recursos.js.
// Los filtros vienen en la URL; así los números del core abren aquí su detalle
// (ej. /admin/equipos?marca_id=6&vencido_al=2026-10-16).
import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api, { mensajeDeError } from '../api/cliente';
import recursos from '../config/recursos';
import Formulario from '../components/Formulario';
import useDatos from '../utils/useDatos';
import { formatear } from '../utils/formato';

export default function Admin() {
  const { recurso } = useParams();
  const config = recursos[recurso];
  const [params, setParams] = useSearchParams();
  const navegar = useNavigate();

  const [editando, setEditando] = useState(null); // null | { fila, inicial }
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState(null);   // { tipo: 'exito' | 'peligro', texto }
  const [guardando, setGuardando] = useState(false);

  // Filtros para el API = todo lo de la URL menos lo que es solo de la pantalla
  const filtros = new URLSearchParams([...params].filter(([clave]) => clave !== 'nota' && !clave.startsWith('crear_')));
  const { datos, cargando, error, recargar } = useDatos(config ? `/${recurso}?${filtros}` : null);

  // Al cambiar de tabla se cierra el formulario. Si la URL trae crear_xxx
  // (ej. desde la ficha: "Registrar incidente"), se abre "Nuevo" con esos valores.
  const precargados = new URLSearchParams([...params].filter(([c]) => c.startsWith('crear_')).map(([c, v]) => [c.slice(6), v]));
  useEffect(() => {
    setMensaje(null);
    const hay = precargados.size > 0;
    setEditando(hay ? { fila: null, inicial: valoresIniciales(config, Object.fromEntries(precargados)) } : null);
  }, [recurso, precargados.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!config) return <p className="alerta alerta--peligro">No existe la tabla «{recurso}».</p>;

  function abrir(fila) {
    setErrores({});
    setMensaje(null);
    setEditando({ fila, inicial: valoresIniciales(config, fila || {}) });
  }

  async function guardar(valores) {
    setGuardando(true);
    try {
      if (editando.fila) await api.put(`/${recurso}/${editando.fila.id}`, valores);
      else await api.post(`/${recurso}`, valores);
      setEditando(null);
      setMensaje({ tipo: 'exito', texto: `Se guardó el ${config.singular}.` });
      recargar();
    } catch (e) {
      setErrores(e.response?.data?.campos || {});
      setMensaje({ tipo: 'peligro', texto: `El servidor rechazó los datos: ${mensajeDeError(e)}` });
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(fila) {
    if (!window.confirm(`¿${config.textoEliminar || 'Eliminar'} este ${config.singular}?`)) return;
    try {
      const r = await api.delete(`/${recurso}/${fila.id}`);
      setMensaje({ tipo: 'exito', texto: r.data.mensaje });
      recargar();
    } catch (e) {
      setMensaje({ tipo: 'peligro', texto: mensajeDeError(e) });
    }
  }

  async function ejecutarAccion(accion, fila) {
    if (accion.ir) return navegar(accion.ir(fila));
    try {
      const r = await api.post(accion.post(fila));
      setMensaje({ tipo: 'exito', texto: r.data.mensaje });
      recargar();
    } catch (e) {
      setMensaje({ tipo: 'peligro', texto: mensajeDeError(e) });
    }
  }

  function cambiarParametro(clave, valor) {
    if (valor) params.set(clave, valor); else params.delete(clave);
    if (clave !== 'pagina') params.delete('pagina');
    setParams(params);
  }

  function buscar(e) {
    e.preventDefault();
    cambiarParametro('q', new FormData(e.target).get('q'));
  }

  return (
    <section>
      <div className="encabezado">
        <h1 className="encabezado__titulo">{config.titulo}</h1>
        <button type="button" className="boton boton--primario" onClick={() => abrir(null)}>
          + Nuevo {config.singular}
        </button>
      </div>

      {params.get('nota') && (
        <p className="alerta alerta--info">
          Detalle: <strong>{params.get('nota')}</strong> · <Link to={`/admin/${recurso}`}>Quitar filtros</Link>
        </p>
      )}
      {mensaje && <p className={`alerta alerta--${mensaje.tipo}`}>{mensaje.texto}</p>}

      {editando && (
        <div className="panel">
          <h2 className="panel__titulo">{editando.fila ? `Editar ${config.singular}` : `Nuevo ${config.singular}`}</h2>
          <Formulario
            key={editando.fila?.id || 'nuevo'}
            config={config}
            inicial={editando.inicial}
            esEdicion={Boolean(editando.fila)}
            errores={errores}
            guardando={guardando}
            onGuardar={guardar}
            onCancelar={() => setEditando(null)}
          />
        </div>
      )}

      <form className="barra barra--busqueda" onSubmit={buscar}>
        <input name="q" className="formulario__control" placeholder="Buscar..." defaultValue={params.get('q') || ''} key={params.get('q')} />
        <button type="submit" className="boton boton--secundario">Buscar</button>
        {datos && <span className="barra__total">{formatear(datos.total, 'numero')} registros</span>}
      </form>

      {error && <p className="alerta alerta--peligro">{error}</p>}
      {cargando && !datos && <p>Cargando...</p>}

      {datos && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                {config.columnas.map((c) => <th key={c.campo}>{c.titulo}</th>)}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datos.filas.map((fila) => (
                <tr key={fila.id}>
                  {config.columnas.map((c) => (
                    <td key={c.campo}>
                      <Celda columna={c} fila={fila} />
                    </td>
                  ))}
                  <td className="tabla__acciones">
                    {(config.acciones || []).filter((a) => a.si(fila)).map((a) => (
                      <button key={a.texto} type="button" className="boton boton--chico boton--secundario"
                        onClick={() => ejecutarAccion(a, fila)}>{a.texto}</button>
                    ))}
                    <button type="button" className="boton boton--chico" onClick={() => abrir(fila)}>Editar</button>
                    <button type="button" className="boton boton--chico boton--peligro" onClick={() => eliminar(fila)}>
                      {config.textoEliminar || 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
              {datos.filas.length === 0 && (
                <tr><td colSpan={config.columnas.length + 1} className="tabla__vacia">No hay registros</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {datos && datos.paginas > 1 && (
        <div className="paginacion">
          <button type="button" className="boton boton--chico boton--secundario" disabled={datos.pagina <= 1}
            onClick={() => cambiarParametro('pagina', datos.pagina - 1)}>Anterior</button>
          <span>Página {datos.pagina} de {datos.paginas}</span>
          <button type="button" className="boton boton--chico boton--secundario" disabled={datos.pagina >= datos.paginas}
            onClick={() => cambiarParametro('pagina', datos.pagina + 1)}>Siguiente</button>
        </div>
      )}
    </section>
  );
}

// Una celda del listado: texto, enlace o etiqueta de color
function Celda({ columna, fila }) {
  const valor = fila[columna.campo];
  const texto = formatear(valor, columna.formato);
  if (columna.etiqueta && valor) return <span className={`etiqueta etiqueta--${valor}`}>{valor}</span>;
  if (columna.enlace) return <Link to={columna.enlace(fila)}>{texto}</Link>;
  return texto;
}

// Valores con los que se abre el formulario (null -> '' para que los inputs funcionen)
function valoresIniciales(config, fila) {
  const valores = { ...fila };
  for (const campo of config.campos) {
    if (valores[campo.nombre] === null || valores[campo.nombre] === undefined) {
      valores[campo.nombre] = campo.tipo === 'checkbox' ? Boolean(campo.porDefecto) : '';
    }
  }
  return valores;
}
