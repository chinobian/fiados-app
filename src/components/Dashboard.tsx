import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { formatearMonto } from '../utils'

export default function Dashboard() {
  const navigate = useNavigate()

  const clientes = useLiveQuery(() => db.clientes.toArray())
  const movimientos = useLiveQuery(() => db.movimientos.toArray())
  const ventas = useLiveQuery(() => db.ventas.toArray())

  if (!clientes || !movimientos || !ventas) return null

  const saldos = new Map<string, number>()
  for (const m of movimientos) {
    const actual = saldos.get(m.clienteId) ?? 0
    saldos.set(m.clienteId, actual + (m.tipo === 'fiado' ? m.monto : -m.monto))
  }

  const totalDeuda = Array.from(saldos.values()).reduce(
    (sum, s) => sum + Math.max(0, s),
    0,
  )

  const clientesConDeuda = clientes
    .filter((c) => (saldos.get(c.id) ?? 0) > 0)
    .sort((a, b) => (saldos.get(b.id) ?? 0) - (saldos.get(a.id) ?? 0))

  // Ventas de hoy
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const manana = new Date(hoy)
  manana.setDate(manana.getDate() + 1)
  const ventasHoy = ventas.filter((v) => {
    const f = new Date(v.fecha)
    return f >= hoy && f < manana
  })
  const totalVentasHoy = ventasHoy.reduce((s, v) => s + v.total, 0)
  const efectivoHoy = ventasHoy.filter((v) => v.metodoPago === 'efectivo').reduce((s, v) => s + v.total, 0)
  const transferenciaHoy = ventasHoy.filter((v) => v.metodoPago === 'transferencia').reduce((s, v) => s + v.total, 0)
  const fiadoHoy = ventasHoy.filter((v) => v.metodoPago === 'fiado').reduce((s, v) => s + v.total, 0)

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-4">🏠 Inicio</h1>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <p className="text-sm text-gray-500 mb-1">Deuda total</p>
        <p className="text-3xl font-bold text-red-600">
          {formatearMonto(totalDeuda)}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {clientes.length} cliente{clientes.length !== 1 && 's'}
        </p>
      </div>

      {clientesConDeuda.length === 0 ? (
        <p className="text-gray-400 text-center mt-8 mb-6">
          No hay clientes con deuda.
        </p>
      ) : (
        <div className="space-y-2 mb-6">
          {clientesConDeuda.map((c) => {
            const saldo = saldos.get(c.id) ?? 0
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/cliente/${c.id}`)}
                className="w-full bg-white rounded-xl shadow p-4 flex items-center justify-between active:bg-gray-50 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="font-medium text-gray-800">{c.nombre}</span>
                </div>
                <span className="font-bold text-lg text-red-600">
                  {formatearMonto(saldo)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Ventas de hoy */}
      <h2 className="text-lg font-bold text-[#1e3a5f] mb-3">📊 Ventas de hoy</h2>
      <div className="bg-white rounded-xl shadow p-5">
        <p className="text-3xl font-bold text-[#1e3a5f]">{formatearMonto(totalVentasHoy)}</p>
        <p className="text-xs text-gray-400 mt-1">
          {ventasHoy.length} venta{ventasHoy.length !== 1 && 's'}
        </p>
        <div className="flex gap-3 mt-3 text-xs">
          <span className="text-gray-500">💵 {formatearMonto(efectivoHoy)}</span>
          <span className="text-gray-500">📱 {formatearMonto(transferenciaHoy)}</span>
          <span className="text-gray-500">📝 {formatearMonto(fiadoHoy)}</span>
        </div>
      </div>
    </div>
  )
}
