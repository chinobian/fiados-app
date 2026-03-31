import { useState } from 'react'
import ReporteVentas from './ReporteVentas'
import ReporteFiados from './ReporteFiados'
import ReporteProductos from './ReporteProductos'

type Tab = 'ventas' | 'fiados' | 'productos'

export default function Reportes() {
  const [tab, setTab] = useState<Tab>('ventas')

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-4">📊 Reportes</h1>

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {([
          { val: 'ventas' as const, label: 'Ventas' },
          { val: 'fiados' as const, label: 'Fiados' },
          { val: 'productos' as const, label: 'Productos' },
        ]).map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === val ? 'bg-white text-[#1e3a5f] shadow' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'ventas' && <ReporteVentas />}
      {tab === 'fiados' && <ReporteFiados />}
      {tab === 'productos' && <ReporteProductos />}
    </div>
  )
}
