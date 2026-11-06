// Rutas de la aplicación (VISTA del MVC).
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Comparativa from './pages/Comparativa';
import Vencimientos from './pages/Vencimientos';
import Perdidas from './pages/Perdidas';
import Ranking from './pages/Ranking';
import FichaEquipo from './pages/FichaEquipo';
import Admin from './pages/Admin';

// Si no hay sesión iniciada, manda al login
function Protegida({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protegida><Layout /></Protegida>}>
        <Route index element={<Inicio />} />
        <Route path="core/comparativa" element={<Comparativa />} />
        <Route path="core/vencimientos" element={<Vencimientos />} />
        <Route path="core/perdidas" element={<Perdidas />} />
        <Route path="core/ranking" element={<Ranking />} />
        <Route path="equipos/:id" element={<FichaEquipo />} />
        <Route path="admin/:recurso" element={<Admin />} />
        <Route path="*" element={<p className="alerta alerta--peligro">Página no encontrada</p>} />
      </Route>
    </Routes>
  );
}
