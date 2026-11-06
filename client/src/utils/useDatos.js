// Hook para pedir datos al API: devuelve { datos, cargando, error, recargar }.
// Se vuelve a pedir solo cuando cambia la URL.
import { useEffect, useState, useCallback } from 'react';
import api, { mensajeDeError } from '../api/cliente';

export default function useDatos(url) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const recargar = useCallback(() => {
    if (!url) { setDatos(null); setCargando(false); return; } // nada que pedir todavía
    setCargando(true);
    api.get(url)
      .then((r) => { setDatos(r.data); setError(''); })
      .catch((e) => setError(mensajeDeError(e)))
      .finally(() => setCargando(false));
  }, [url]);

  useEffect(recargar, [recargar]);

  return { datos, cargando, error, recargar };
}
