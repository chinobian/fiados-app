import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { formatearMonto, formatearFecha } from '../utils'

type Orden = 'deuda' | 'tasa' | 'tiempo'

interface ClienteStats {
  id: string
  nombre: string
  deudaActual: number
  totalFiado: number
  totalPagado: number
  tasaPago: number
  tiempoPromedio: number // días
  color: 'verde' | 'amarillo' | 'rojo'
  ultimoPago: Date | null
}

export default function ReporteFiados() {
  const [orden, setOrden] = useState<Orden>('deuda')

  const clientes = useLiveQuery(() => db.clientes.toArray())
  const movimientos = useLiveQuery(() => db.movimientos.toArray())

  if (!clientes || !movimientos) return null

  const ahora = new Date()
  const hace30dias = new Date(ahora)
  hace30dias.setDate(hace30dias.getDate() - 30)

  // Calcular stats por cliente
  const stats: ClienteStats[] = []
  for (const c of clientes) {
    const movs = movimientos
      .filter((m) => m.clienteId === c.id)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

    const totalFiado = movs.filter((m) => m.tipo === 'fiado').reduce((s, m) => s + m.monto, 0)
    const totalPagado = movs.filter((m) => m.tipo === 'pago').reduce((s, m) => s + m.monto, 0)

    if (totalFiado === 0) continue // sin fiados, no incluir

    const deudaActual = totalFiado - totalPagado
    const tasaPago = totalFiado > 0 ? (totalPagado / totalFiado) * 100 : 0

    // Tiempo promedio de pago (aprox)
    const pagos = movs.filter((m) => m.tipo === 'pago')
    const fiados = movs.filter((m) => m.tipo === 'fiado')
    let sumaDias = 0
    let contPagos = 0
    let saldoAcum = 0
    let fiadoIdx = 0
    for (const pago of pagos) {
      // Encontrar el fiado más antiguo sin pagar al momento del pago
      while (fiadoIdx < fiados.length && new Date(fiados[fiadoIdx].fecha) <= new Date(pago.fecha)) {
        saldoAcum += fiados[fiadoIdx].monto
        fiadoIdx++
      }
      if (fiadoIdx > 0) {
        const diasDesde = Math.floor(
          (new Date(pago.fecha).getTime() - new Date(fiados[0].fecha).getTime()) / (1000 * 60 * 60 * 24),
        )
        sumaDias += Math.max(0, diasDesde)
        contPagos++
      }
    }
    const tiempoPromedio = contPagos > 0 ? Math.round(sumaDias / contPagos) : 0

    const ultimoPago = pagos.length > 0 ? new Date(pagos[pagos.length - 1].fecha) : null
    const tienePagoReciente = ultimoPago && ultimoPago >= hace30dias

    let color: 'verde' | 'amarillo' | 'rojo'
    if (tasaPago > 80 && deudaActual <= 0) {
      color = 'verde'
    } else if (tasaPago > 50 || (deudaActual > 0 && tienePagoReciente)) {
      color = 'amarillo'
    } else {
      color = 'rojo'
    }

    stats.push({
      id: c.id,
      nombre: c.nombre,
      deudaActual: Math.max(0, deudaActual),
      totalFiado,
      totalPagado,
      tasaPago,
      tiempoPromedio,
      color,
      ultimoPago,
    })
  }

  // Ordenar
  const statsOrdenados = [...stats].sort((a, b) => {
    switch (orden) {
      case 'deuda': return b.deudaActual - a.deudaActual
      case 'tasa': return a.tasaPago - b.tasaPago
      case 'tiempo': return b.tiempoPromedio - a.tiempoPromedio
    }
  })

  const deudaTotal = stats.reduce((s, c) => s + c.deudaActual, 0)
  const clientesConDeuda = stats.filter((c) => c.deudaActual > 0)
  const deudaPromedio = clientesConDeuda.length > 0 ? deudaTotal / clientesConDeuda.length : 0
  const mayorDeudor = clientesConDeuda.sort((a, b) => b.deudaActual - a.deudaActual)[0]

  // Fiados vencidos (>30 días sin pago)
  const fiadosVencidos: { clienteNombre: string; descripcion: string; monto: number; dias: number; fecha: Date }[] = []
  for (const c of clientes) {
    const movs = movimientos.filter((m) => m.clienteId === c.id)
    const fiados = movs.filter((m) => m.tipo === 'fiado')
    const totalPagado = movs.filter((m) => m.tipo === 'pago').reduce((s, m) => s + m.monto, 0)
    let restante = totalPagado

    // Descontar pagos de fiados más antiguos primero
    for (const f of fiados.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())) {
      if (restante >= f.monto) {
        restante -= f.monto
      } else {
        const montoImpago = f.monto - restante
        restante = 0
        const dias = Math.floor((ahora.getTime() - new Date(f.fecha).getTime()) / (1000 * 60 * 60 * 24))
        if (dias > 30) {
          fiadosVencidos.push({
            clienteNombre: c.nombre,
            descripcion: f.descripcion,
            monto: montoImpago,
            dias,
            fecha: new Date(f.fecha),
          })
        }
      }
    }
  }
  fiadosVencidos.sort((a, b) => b.dias - a.dias)

  const colorEmoji = { verde: '🟢', amarillo: '🟡', rojo: '🔴' }

  return (
    <div>
      {/* Métricas principales */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white rounded-xl shadow p-3">
          <p className="text-xs text-gray-400">Deuda total</p>
          <p className="text-lg font-bold text-red-600">{formatearMonto(deudaTotal)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-3">
          <p className="text-xs text-gray-400">Clientes con deuda</p>
          <p className="text-lg font-bold text-[#1e3a5f]">{clientesConDeuda.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-3">
          <p className="text-xs text-gray-400">Deuda promedio</p>
          <p className="text-lg font-bold text-[#1e3a5f]">{formatearMonto(deudaPromedio)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-3">
          <p className="text-xs text-gray-400">Mayor deudor</p>
          {mayorDeudor ? (
            <>
              <p className="text-sm font-bold text-[#1e3a5f] truncate">{mayorDeudor.nombre}</p>
              <p className="text-xs text-red-600 font-bold">{formatearMonto(mayorDeudor.deudaActual)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </div>
      </div>

      {/* Ranking de clientes */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-bold text-gray-700">Ranking de clientes</p>
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value as Orden)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white"
          >
            <option value="deuda">Mayor deuda</option>
            <option value="tasa">Menor tasa pago</option>
            <option value="tiempo">Mayor tiempo pago</option>
          </select>
        </div>

        {statsOrdenados.length === 0 ? (
          <p className="text-gray-400 text-center py-4">📭 No hay clientes con fiados.</p>
        ) : (
          <div className="space-y-3">
            {statsOrdenados.map((c) => (
              <div key={c.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-800">
                    {colorEmoji[c.color]} {c.nombre}
                  </span>
                  <span className={`font-bold text-sm ${c.deudaActual > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatearMonto(c.deudaActual)}
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-gray-400">
                  <span>Fiado: {formatearMonto(c.totalFiado)}</span>
                  <span>Pagado: {formatearMonto(c.totalPagado)}</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-400">
                  <span>Tasa: {c.tasaPago.toFixed(0)}%</span>
                  <span>Tiempo prom: {c.tiempoPromedio} días</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deudas vencidas */}
      <div className="bg-white rounded-xl shadow p-4">
        <p className="text-sm font-bold text-gray-700 mb-3">⚠️ Deudas vencidas (+30 días)</p>
        {fiadosVencidos.length === 0 ? (
          <p className="text-gray-400 text-center py-4">✅ No hay fiados vencidos.</p>
        ) : (
          <div className="space-y-3">
            {fiadosVencidos.map((f, i) => (
              <div key={i} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{f.clienteNombre}</p>
                    <p className="text-xs text-gray-400">{f.descripcion}</p>
                    <p className="text-xs text-gray-400">{formatearFecha(f.fecha)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600 text-sm">{formatearMonto(f.monto)}</p>
                    <p className="text-xs text-red-400">hace {f.dias} días</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
