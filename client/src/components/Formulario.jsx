// Formulario genérico: dibuja los campos que describe config/recursos.js.
// Los errores que devuelve el BACKEND se muestran debajo de cada campo.
import { useState } from 'react';
import CampoSelect from './CampoSelect';
import useDatos from '../utils/useDatos';
import { hoy } from '../utils/formato';

export default function Formulario({ config, inicial, esEdicion, errores, guardando, onGuardar, onCancelar }) {
  const [valores, setValores] = useState(inicial);
  const [sinValidarNavegador, setSinValidarNavegador] = useState(false);

  // Al cambiar un campo se vacían los que dependen de él (cascada)
  function cambiar(nombre, valor) {
    const nuevos = { ...valores, [nombre]: valor };
    const limpiarHijos = (padre) => {
      config.campos
        .filter((c) => c.dependeDe?.includes(padre))
        .forEach((hijo) => { nuevos[hijo.nombre] = ''; limpiarHijos(hijo.nombre); });
    };
    limpiarHijos(nombre);
    setValores(nuevos);
  }

  // Aviso del servidor (ej. "HP NO cubre Teclado: la paga EOS")
  const aviso = config.aviso;
  const listoAviso = aviso && aviso.necesita.every((n) => valores[n]);
  const urlAviso = listoAviso ? `${aviso.url}?${new URLSearchParams(aviso.necesita.map((n) => [n, valores[n]]))}` : null;
  const { datos: datosAviso } = useDatos(urlAviso);

  const visibles = config.campos.filter((c) =>
    !(esEdicion && c.soloCrear) && !(!esEdicion && c.soloEditar) && (!c.visibleSi || c.visibleSi(valores)));

  function enviar(e) {
    e.preventDefault();
    onGuardar(valores);
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate={sinValidarNavegador}>
      <div className="formulario__grilla">
        {visibles.map((campo) => {
          const requerido = campo.requerido && !sinValidarNavegador;
          const control = {
            id: campo.nombre,
            className: 'formulario__control',
            value: valores[campo.nombre] ?? '',
            onChange: (e) => cambiar(campo.nombre, e.target.value),
            required: requerido,
          };
          return (
            <div key={campo.nombre} className={`formulario__campo ${campo.tipo === 'textarea' ? 'formulario__campo--ancho' : ''}`}>
              {campo.tipo === 'checkbox' ? (
                <label className="formulario__casilla">
                  <input type="checkbox" checked={Boolean(valores[campo.nombre])}
                    onChange={(e) => cambiar(campo.nombre, e.target.checked)} />
                  {campo.etiqueta}
                </label>
              ) : (
                <>
                  <label className="formulario__etiqueta" htmlFor={campo.nombre}>
                    {campo.etiqueta} {campo.requerido && <span className="formulario__requerido">*</span>}
                  </label>
                  {campo.tipo === 'select' && (
                    <CampoSelect campo={campo} valores={valores} valor={valores[campo.nombre]}
                      requerido={requerido} onChange={(v) => cambiar(campo.nombre, v)} />
                  )}
                  {campo.tipo === 'textarea' && <textarea {...control} rows={3} />}
                  {!['select', 'textarea'].includes(campo.tipo) && (
                    <input
                      {...control}
                      type={campo.tipo || 'text'}
                      step={campo.tipo === 'number' ? '0.01' : undefined}
                      min={sinValidarNavegador ? undefined : campo.min}
                      max={campo.max === 'hoy' && !sinValidarNavegador ? hoy() : undefined}
                      pattern={sinValidarNavegador ? undefined : campo.patron}
                    />
                  )}
                </>
              )}
              {campo.ayuda && <small className="formulario__ayuda">{campo.ayuda}</small>}
              {errores?.[campo.nombre] && <small className="formulario__error">{errores[campo.nombre]}</small>}
            </div>
          );
        })}
      </div>

      {datosAviso?.mensaje && (
        <p className={`alerta ${datosAviso.cubre === false ? 'alerta--peligro' : 'alerta--info'}`}>{datosAviso.mensaje}</p>
      )}

      <div className="formulario__pie">
        <label className="formulario__casilla formulario__casilla--demo">
          <input type="checkbox" checked={sinValidarNavegador} onChange={(e) => setSinValidarNavegador(e.target.checked)} />
          Quitar validación del navegador (para probar la del servidor)
        </label>
        <div className="barra">
          <button type="button" className="boton boton--secundario" onClick={onCancelar}>Cancelar</button>
          <button type="submit" className="boton boton--primario" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </form>
  );
}
