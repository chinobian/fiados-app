import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import Clientes from './components/Clientes'
import DetalleCliente from './components/DetalleCliente'
import Ventas from './components/Ventas'
import NuevaVenta from './components/NuevaVenta'
import DetalleVenta from './components/DetalleVenta'
import Productos from './components/Productos'
import Reportes from './components/Reportes'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-[#f5f5f5] max-w-lg mx-auto relative">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/ventas/nueva" element={<NuevaVenta />} />
          <Route path="/ventas/:id" element={<DetalleVenta />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/cliente/:id" element={<DetalleCliente />} />
          <Route path="/reportes" element={<Reportes />} />
        </Routes>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="max-w-lg mx-auto flex">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex-1 py-3 text-center text-base font-medium ${
                  isActive ? 'text-[#1e3a5f] bg-blue-50' : 'text-gray-400'
                }`
              }
            >
              🏠 Inicio
            </NavLink>
            <NavLink
              to="/ventas"
              className={({ isActive }) =>
                `flex-1 py-3 text-center text-base font-medium ${
                  isActive ? 'text-[#1e3a5f] bg-blue-50' : 'text-gray-400'
                }`
              }
            >
              💲 Ventas
            </NavLink>
            <NavLink
              to="/clientes"
              className={({ isActive }) =>
                `flex-1 py-3 text-center text-base font-medium ${
                  isActive ? 'text-[#1e3a5f] bg-blue-50' : 'text-gray-400'
                }`
              }
            >
              👤 Clientes
            </NavLink>
            <NavLink
              to="/reportes"
              className={({ isActive }) =>
                `flex-1 py-3 text-center text-base font-medium ${
                  isActive ? 'text-[#1e3a5f] bg-blue-50' : 'text-gray-400'
                }`
              }
            >
              📊 Reportes
            </NavLink>
          </div>
        </nav>
      </div>
    </HashRouter>
  )
}
