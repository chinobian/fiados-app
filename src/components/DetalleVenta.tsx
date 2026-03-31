import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { formatearMonto, formatearFecha } from '../utils'

const iconoMetodo = { efectivo: '💵', transferencia: '📱', fiado: '📝' }
const labelMetodo = { efectivo: 'Efectivo', transferencia: 'Transferencia', fiado: 'Fiado' }

export default function DetalleVenta() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const venta = useLiveQuery(() => (id ? db.ventas.get(id) : undefined), [id])
  const clientes = useLiveQuery(() => db.clientes.toArray())

  if (venta === undefined || !clientes) return null

  if (venta === null) {
    return (
      <div className="p-4 text-center mt-8">
        <p className="text-gray-500">Venta no encontrada.</p>
        <button onClick={() => navigate('/ventas')} className="mt-4 text-[#1e3a5f] underline">
          Volver a Ventas
        </button>
      </div>
    )
  }

  const cliente = venta.clienteId ? clientes.find((c) => c.id === venta.clienteId) : null
  const fecha = new Date(venta.fecha)
  const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="p-4 pb-24">
      <button
        onClick={() => navigate('/ventas')}
        className="text-[#1e3a5f] mb-3 inline-block text-lg"
      >
        ← Volver
      </button>

      <div className="bg-white rounded-xl shadow p-5 mb-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-sm text-gray-400">{formatearFecha(fecha)} — {hora}</p>
            {cliente && <p className="text-gray-600 mt-1">👤 {cliente.nombre}</p>}
          </div>
          <span className="bg-gray-100 rounded-lg px-3 py-1 text-sm font-medium">
            {iconoMetodo[venta.metodoPago]} {labelMetodo[venta.metodoPago]}
          </span>
        </div>
        <p className="text-3xl font-bold text-[#1e3a5f]">{formatearMonto(venta.total)}</p>
      </div>

      <h2 className="text-lg font-bold text-gray-700 mb-2">Detalle de ítems</h2>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {venta.items.map((item, i) => (
          <div
            key={i}
            className="px-4 py-3 flex justify-between items-center border-b border-gray-100 last:border-b-0"
          >
            <div>
              <p className="text-gray-800">{item.descripcion}</p>
              <p className="text-xs text-gray-400">
                {item.cantidad} × {formatearMonto(item.precioUnitario)}
              </p>
            </div>
            <span className="font-bold text-gray-800">
              {formatearMonto(item.cantidad * item.precioUnitario)}
            </span>
          </div>
        ))}
        <div className="px-4 py-3 flex justify-between items-center bg-gray-50">
          <span className="font-bold">Total</span>
          <span className="font-bold text-[#1e3a5f] text-lg">{formatearMonto(venta.total)}</span>
        </div>
      </div>
    </div>
  )
}
