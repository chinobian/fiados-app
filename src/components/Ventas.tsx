import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { formatearMonto } from '../utils'

type Filtro = 'hoy' | 'ayer' | 'semana' | 'mes'
type FiltroMetodo = 'todos' | 'efectivo' | 'transferencia' | 'fiado'

const iconoMetodo = { efectivo: '💵', transferencia: '📱', fiado: '📝' }

function inicioDelDia(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function getRangoFecha(filtro: Filtro): { desde: Date; hasta: Date } {
  const ahora = new Date()
  const hoy = inicioDelDia(ahora)
  const manana = new Date(hoy)
  manana.setDate(manana.getDate() + 1)

  switch (filtro) {
    case 'hoy':
      return { desde: hoy, hasta: manana }
    case 'ayer': {
      const ayer = new Date(hoy)
      ayer.setDate(ayer.getDate() - 1)
      return { desde: ayer, hasta: hoy }
    }
    case 'semana': {
      const inicioSemana = new Date(hoy)
      inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay())
      return { desde: inicioSemana, hasta: manana }
    }
    case 'mes': {
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      return { desde: inicioMes, hasta: manana }
    }
  }
}

export default function Ventas() {
  const navigate = useNavigate()
  const [filtroFecha, setFiltroFecha] = useState<Filtro>('hoy')
  const [filtroMetodo, setFiltroMetodo] = useState<FiltroMetodo>('todos')

  const ventas = useLiveQuery(() => db.ventas.toArray())
  const clientes = useLiveQuery(() => db.clientes.toArray())

  if (!ventas || !clientes) return null

  const clientesMap = new Map(clientes.map((c) => [c.id, c.nombre]))
  const { desde, hasta } = getRangoFecha(filtroFecha)

  const ventasFiltradas = ventas
    .filter((v) => {
      const f = new Date(v.fecha)
      if (f < desde || f >= hasta) return false
      if (filtroMetodo !== 'todos' && v.metodoPago !== filtroMetodo) return false
      return true
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  // Resumen del día (siempre sobre las ventas de hoy, independiente del filtro)
  const hoyDesde = inicioDelDia(new Date())
  const hoyHasta = new Date(hoyDesde)
  hoyHasta.setDate(hoyHasta.getDate() + 1)
  const ventasHoy = ventas.filter((v) => {
    const f = new Date(v.fecha)
    return f >= hoyDesde && f < hoyHasta
  })

  const totalHoy = ventasHoy.reduce((s, v) => s + v.total, 0)
  const efectivoHoy = ventasHoy.filter((v) => v.metodoPago === 'efectivo').reduce((s, v) => s + v.total, 0)
  const transferenciaHoy = ventasHoy.filter((v) => v.metodoPago === 'transferencia').reduce((s, v) => s + v.total, 0)
  const fiadoHoy = ventasHoy.filter((v) => v.metodoPago === 'fiado').reduce((s, v) => s + v.total, 0)

  function resumenItems(items: { descripcion: string; cantidad: number }[]): string {
    const primeros = items.slice(0, 3).map((i) => (i.cantidad > 1 ? `${i.cantidad}x ${i.descripcion}` : i.descripcion))
    return primeros.join(', ') + (items.length > 3 ? '...' : '')
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-4">💲 Ventas</h1>

      {/* Resumen del día */}
      <div className="bg-white rounded-xl shadow p-5 mb-4">
        <p className="text-sm text-gray-500 mb-1">Ventas de hoy</p>
        <p className="text-3xl font-bold text-[#1e3a5f]">{formatearMonto(totalHoy)}</p>
        <p className="text-xs text-gray-400 mt-1">{ventasHoy.length} venta{ventasHoy.length !== 1 && 's'}</p>
        <div className="flex gap-3 mt-3 text-xs">
          <span className="text-gray-500">💵 {formatearMonto(efectivoHoy)}</span>
          <span className="text-gray-500">📱 {formatearMonto(transferenciaHoy)}</span>
          <span className="text-gray-500">📝 {formatearMonto(fiadoHoy)}</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => navigate('/ventas/nueva')}
          className="flex-1 bg-green-600 text-white rounded-xl py-3 text-lg font-medium active:bg-green-700"
        >
          ➕ Nueva venta
        </button>
        <button
          onClick={() => navigate('/productos')}
          className="bg-white border-2 border-[#1e3a5f] text-[#1e3a5f] rounded-xl py-3 px-4 text-lg font-medium active:bg-gray-50"
        >
          ⚙️
        </button>
      </div>

      {/* Filtros fecha */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {([
          { val: 'hoy' as const, label: 'Hoy' },
          { val: 'ayer' as const, label: 'Ayer' },
          { val: 'semana' as const, label: 'Semana' },
          { val: 'mes' as const, label: 'Mes' },
        ]).map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setFiltroFecha(val)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              filtroFecha === val ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtros método */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {([
          { val: 'todos' as const, label: 'Todos' },
          { val: 'efectivo' as const, label: '💵 Efectivo' },
          { val: 'transferencia' as const, label: '📱 Transf.' },
          { val: 'fiado' as const, label: '📝 Fiado' },
        ]).map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setFiltroMetodo(val)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              filtroMetodo === val ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista de ventas */}
      {ventasFiltradas.length === 0 ? (
        <p className="text-gray-400 text-center mt-8">No hay ventas en este período.</p>
      ) : (
        <div className="space-y-2">
          {ventasFiltradas.map((v) => {
            const fecha = new Date(v.fecha)
            const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
            const nombreCliente = v.clienteId ? clientesMap.get(v.clienteId) : null
            return (
              <button
                key={v.id}
                onClick={() => navigate(`/ventas/${v.id}`)}
                className="w-full bg-white rounded-xl shadow p-4 text-left active:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-400">{hora}</p>
                    <p className="text-gray-800 truncate">{resumenItems(v.items)}</p>
                    {nombreCliente && (
                      <p className="text-xs text-gray-400 mt-1">👤 {nombreCliente}</p>
                    )}
                  </div>
                  <div className="text-right ml-3">
                    <p className="font-bold text-[#1e3a5f]">{formatearMonto(v.total)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {iconoMetodo[v.metodoPago]}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
