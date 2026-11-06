// Estructura de todas las páginas: cabecera, menú y contenido.
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const MENU = [
  {
    grupo: 'Core',
    enlaces: [
      ['/', 'Inicio'], ['/core/comparativa', 'Comparativa'], ['/core/vencimientos', 'Vencimientos'],
      ['/core/perdidas', 'Pérdidas'], ['/core/ranking', 'Ranking de modelos'],
    ],
  },
  {
    grupo: 'Administración',
    enlaces: [
      ['/admin/equipos', 'Equipos'], ['/admin/incidentes', 'Incidentes'], ['/admin/ventas', 'Ventas'],
      ['/admin/empresas', 'Empresas'], ['/admin/modelos', 'Modelos'], ['/admin/coberturas', 'Coberturas'],
      ['/admin/marcas', 'Marcas'], ['/admin/tipos-equipo', 'Tipos'], ['/admin/piezas', 'Piezas'],
    ],
  },
];

export default function Layout() {
  const navegar = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  function salir() {
    localStorage.clear();
    navegar('/login');
  }

  return (
    <div className="pagina">
      <header className="cabecera">
        <span className="cabecera__marca">Gestor <strong>EOS</strong></span>
        <div className="cabecera__usuario">
          <span>{usuario.nombre}</span>
          <button type="button" className="boton boton--chico boton--secundario" onClick={salir}>Salir</button>
        </div>
      </header>

      <nav className="menu">
        {MENU.map(({ grupo, enlaces }) => (
          <div key={grupo} className="menu__grupo">
            <span className="menu__titulo">{grupo}</span>
            {enlaces.map(([ruta, texto]) => (
              <NavLink key={ruta} to={ruta} end={ruta === '/'}
                className={({ isActive }) => `menu__enlace ${isActive ? 'menu__enlace--activo' : ''}`}>
                {texto}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
