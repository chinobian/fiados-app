import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { formatearMonto } from '../utils'
import SelectorPeriodo, { calcularPeriodo, type Periodo } from './SelectorPeriodo'

export default function ReporteProductos() {
  const [periodo, setPeriodo] = useState<Periodo>(calcularPeriodo('mes'))
  const [verTodos, setVerTodos] = useState(false)
  const [verTodosFact, setVerTodosFact] = useState(false)

  const ventas = useLiveQuery(() => db.ventas.toArray())
  const productos = useLiveQuery(() => db.productos.toArray())

  if (!ventas || !productos) return null

  const ventasPeriodo = ventas.filter((v) => {
    const f = new Date(v.fecha)
    return f >= periodo.desde && f < periodo.hasta
  })

  // Agregar stats por producto
  const prodStats = new Map<string, { nombre: string; unidades: number; monto: number }>()
  const productosVendidosIds = new Set<string>()

  for (const v of ventasPeriodo) {
    for (const item of v.items) {
      const key = item.productoId ?? `manual:${item.descripcion}`
      const nombre = item.descripcion
      const existing = prodStats.get(key) ?? { nombre, unidades: 0, monto: 0 }
      existing.unidades += item.cantidad
      existing.monto += item.cantidad * item.precioUnitario
      prodStats.set(key, existing)
      if (item.productoId) productosVendidosIds.add(item.productoId)
    }
  }

  // Ranking por unidades
  const porUnidades = Array.from(prodStats.values()).sort((a, b) => b.unidades - a.unidades)
  const mostrarUnidades = verTodos ? porUnidades : porUnidades.slice(0, 10)

  // Ranking por facturación
  const porFacturacion = Array.from(prodStats.values()).sort((a, b) => b.monto - a.monto)
  const mostrarFacturacion = verTodosFact ? porFacturacion : porFacturacion.slice(0, 10)

  // Productos sin movimiento
  const sinMovimiento = productos.filter((p) => !productosVendidosIds.has(p.id)).sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <div>
      <SelectorPeriodo periodo={periodo} onChange={setPeriodo} />

      {porUnidades.length === 0 ? (
        <p className="text-gray-400 text-center mt-8">📭 No hay ventas de productos en este período.</p>
      ) : (
        <>
          {/* Ranking por unidades */}
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <p className="text-sm font-bold text-gray-700 mb-3">🏆 Más vendidos (por unidades)</p>
            <div className="space-y-2">
              {mostrarUnidades.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-gray-400 w-6 text-right">#{i + 1}</span>
                    <span className="text-sm text-gray-800 truncate">{p.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <span className="text-xs text-gray-400">{p.unidades} uds</span>
                    <span className="text-sm font-bold text-[#1e3a5f] w-24 text-right">{formatearMonto(p.monto)}</span>
                  </div>
                </div>
              ))}
            </div>
            {porUnidades.length > 10 && !verTodos && (
              <button
                onClick={() => setVerTodos(true)}
                className="w-full mt-3 text-sm text-[#1e3a5f] font-medium"
              >
                Ver todos ({porUnidades.length})
              </button>
            )}
          </div>

          {/* Ranking por facturación */}
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <p className="text-sm font-bold text-gray-700 mb-3">💰 Más facturan</p>
            <div className="space-y-2">
              {mostrarFacturacion.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-gray-400 w-6 text-right">#{i + 1}</span>
                    <span className="text-sm text-gray-800 truncate">{p.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3 ml-2">
                    <span className="text-xs text-gray-400">{p.unidades} uds</span>
                    <span className="text-sm font-bold text-[#1e3a5f] w-24 text-right">{formatearMonto(p.monto)}</span>
                  </div>
                </div>
              ))}
            </div>
            {porFacturacion.length > 10 && !verTodosFact && (
              <button
                onClick={() => setVerTodosFact(true)}
                className="w-full mt-3 text-sm text-[#1e3a5f] font-medium"
              >
                Ver todos ({porFacturacion.length})
              </button>
            )}
          </div>
        </>
      )}

      {/* Productos sin movimiento */}
      <div className="bg-white rounded-xl shadow p-4">
        <p className="text-sm font-bold text-gray-700 mb-3">⚠️ Sin movimiento en el período</p>
        {sinMovimiento.length === 0 ? (
          <p className="text-gray-400 text-center py-4">✅ Todos los productos tuvieron ventas.</p>
        ) : (
          <div className="space-y-2">
            {sinMovimiento.map((p) => (
              <div key={p.id} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{p.nombre}</span>
                <span className="text-xs text-gray-400">{formatearMonto(p.precio)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
