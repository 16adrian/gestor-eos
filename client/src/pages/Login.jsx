// Inicio de sesión del administrador.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { mensajeDeError } from '../api/cliente';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navegar = useNavigate();

  async function entrar(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
      navegar('/');
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }

  return (
    <main className="login">
      <form className="login__caja" onSubmit={entrar}>
        <h1 className="login__titulo">Gestor <strong>EOS</strong></h1>
        <p className="login__texto">Administración de equipos en renta</p>
        {error && <p className="alerta alerta--peligro">{error}</p>}
        <label className="formulario__etiqueta" htmlFor="email">Correo</label>
        <input id="email" type="email" className="formulario__control" value={email} required
          onChange={(e) => setEmail(e.target.value)} />
        <label className="formulario__etiqueta" htmlFor="password">Contraseña</label>
        <input id="password" type="password" className="formulario__control" value={password} required
          onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="boton boton--primario login__boton">Entrar</button>
      </form>
    </main>
  );
}
