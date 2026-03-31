import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { db } from '../db'
import { formatearMonto } from '../utils'
import SelectorPeriodo, { calcularPeriodo, calcularPeriodoAnterior, type Periodo } from './SelectorPeriodo'

export default function ReporteVentas() {
  const [periodo, setPeriodo] = useState<Periodo>(calcularPeriodo('mes'))

  const ventas = useLiveQuery(() => db.ventas.toArray())
  if (!ventas) return null

  const ventasPeriodo = ventas.filter((v) => {
    const f = new Date(v.fecha)
    return f >= periodo.desde && f < periodo.hasta
  })

  const totalVendido = ventasPeriodo.reduce((s, v) => s + v.total, 0)
  const cantidadVentas = ventasPeriodo.length
  const ticketPromedio = cantidadVentas > 0 ? totalVendido / cantidadVentas : 0

  const efectivo = ventasPeriodo.filter((v) => v.metodoPago === 'efectivo').reduce((s, v) => s + v.total, 0)
  const transferencia = ventasPeriodo.filter((v) => v.metodoPago === 'transferencia').reduce((s, v) => s + v.total, 0)
  const fiado = ventasPeriodo.filter((v) => v.metodoPago === 'fiado').reduce((s, v) => s + v.total, 0)
  const pctEfectivo = totalVendido > 0 ? (efectivo / totalVendido) * 100 : 0
  const pctTransferencia = totalVendido > 0 ? (transferencia / totalVendido) * 100 : 0
  const pctFiado = totalVendido > 0 ? (fiado / totalVendido) * 100 : 0

  // Período anterior
  const periodoAnt = calcularPeriodoAnterior(periodo)
  const ventasAnt = ventas.filter((v) => {
    const f = new Date(v.fecha)
    return f >= periodoAnt.desde && f < periodoAnt.hasta
  })
  const totalAnt = ventasAnt.reduce((s, v) => s + v.total, 0)
  const cantidadAnt = ventasAnt.length
  const diffPesos = totalVendido - totalAnt
  const diffPct = totalAnt > 0 ? ((totalVendido - totalAnt) / totalAnt) * 100 : totalVendido > 0 ? 100 : 0

  // Datos por día para gráfico
  const ventasPorDia = new Map<string, { fecha: string; total: number; cantidad: number }>()
  for (const v of ventasPeriodo) {
    const f = new Date(v.fecha)
    const key = `${f.getDate().toString().padStart(2, '0')}/${(f.getMonth() + 1).toString().padStart(2, '0')}`
    const existing = ventasPorDia.get(key) ?? { fecha: key, total: 0, cantidad: 0 }
    existing.total += v.total
    existing.cantidad += 1
    ventasPorDia.set(key, existing)
  }
  const datosGrafico = Array.from(ventasPorDia.values())

  return (
    <div>
      <SelectorPeriodo periodo={periodo} onChange={setPeriodo} />

      {/* Métricas principales */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-xs text-gray-400">Total vendido</p>
          <p className="text-lg font-bold text-[#1e3a5f]">{formatearMonto(totalVendido)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-xs text-gray-400">Ventas</p>
          <p className="text-lg font-bold text-[#1e3a5f]">{cantidadVentas}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-xs text-gray-400">Ticket prom.</p>
          <p className="text-lg font-bold text-[#1e3a5f]">{formatearMonto(ticketPromedio)}</p>
        </div>
      </div>

      {/* Desglose por método */}
      {totalVendido > 0 && (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <p className="text-sm font-bold text-gray-700 mb-2">Método de pago</p>
          <div className="flex h-4 rounded-full overflow-hidden mb-3">
            {pctEfectivo > 0 && <div className="bg-green-500" style={{ width: `${pctEfectivo}%` }} />}
            {pctTransferencia > 0 && <div className="bg-violet-500" style={{ width: `${pctTransferencia}%` }} />}
            {pctFiado > 0 && <div className="bg-orange-500" style={{ width: `${pctFiado}%` }} />}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2" />💵 Efectivo</span>
              <span className="font-medium">{formatearMonto(efectivo)} ({pctEfectivo.toFixed(0)}%)</span>
            </div>
            <div className="flex justify-between">
              <span><span className="inline-block w-3 h-3 rounded-full bg-violet-500 mr-2" />📱 Transferencia</span>
              <span className="font-medium">{formatearMonto(transferencia)} ({pctTransferencia.toFixed(0)}%)</span>
            </div>
            <div className="flex justify-between">
              <span><span className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-2" />📝 Fiado</span>
              <span className="font-medium">{formatearMonto(fiado)} ({pctFiado.toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Comparación con período anterior */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <p className="text-sm font-bold text-gray-700 mb-2">vs. período anterior</p>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400">Actual</p>
            <p className="font-bold text-[#1e3a5f]">{formatearMonto(totalVendido)}</p>
            <p className="text-xs text-gray-400">{cantidadVentas} ventas</p>
          </div>
          <div className="text-center px-3">
            <p className={`font-bold text-lg ${diffPesos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diffPesos >= 0 ? '▲' : '▼'} {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%
            </p>
            <p className={`text-xs ${diffPesos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diffPesos >= 0 ? '+' : ''}{formatearMonto(diffPesos)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Anterior</p>
            <p className="font-bold text-gray-500">{formatearMonto(totalAnt)}</p>
            <p className="text-xs text-gray-400">{cantidadAnt} ventas</p>
          </div>
        </div>
      </div>

      {/* Gráfico de barras */}
      {datosGrafico.length > 0 ? (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <p className="text-sm font-bold text-gray-700 mb-3">Ventas por día</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={datosGrafico}>
              <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value) => [formatearMonto(Number(value)), 'Total']}
                labelFormatter={(label) => `Día ${label}`}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {datosGrafico.map((_, i) => (
                  <Cell key={i} fill="#1e3a5f" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-gray-400 text-center mt-4">📭 No hay ventas en este período.</p>
      )}
    </div>
  )
}
