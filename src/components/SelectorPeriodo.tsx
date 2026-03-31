import { useState } from 'react'

export type FiltroRapido = 'hoy' | 'ayer' | 'semana' | 'mes' | 'mes_pasado' | 'personalizado'

export interface Periodo {
  desde: Date
  hasta: Date
  filtro: FiltroRapido
}

function inicioDelDia(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

export function calcularPeriodo(filtro: FiltroRapido, desdeCustom?: Date, hastaCustom?: Date): Periodo {
  const ahora = new Date()
  const hoy = inicioDelDia(ahora)
  const manana = new Date(hoy)
  manana.setDate(manana.getDate() + 1)

  switch (filtro) {
    case 'hoy':
      return { desde: hoy, hasta: manana, filtro }
    case 'ayer': {
      const ayer = new Date(hoy)
      ayer.setDate(ayer.getDate() - 1)
      return { desde: ayer, hasta: hoy, filtro }
    }
    case 'semana': {
      const inicio = new Date(hoy)
      inicio.setDate(inicio.getDate() - inicio.getDay())
      return { desde: inicio, hasta: manana, filtro }
    }
    case 'mes': {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      return { desde: inicio, hasta: manana, filtro }
    }
    case 'mes_pasado': {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      return { desde: inicio, hasta: fin, filtro }
    }
    case 'personalizado':
      return {
        desde: desdeCustom ? inicioDelDia(desdeCustom) : hoy,
        hasta: hastaCustom ? (() => { const d = inicioDelDia(hastaCustom); d.setDate(d.getDate() + 1); return d })() : manana,
        filtro,
      }
  }
}

export function calcularPeriodoAnterior(periodo: Periodo): { desde: Date; hasta: Date } {
  const duracion = periodo.hasta.getTime() - periodo.desde.getTime()
  const desde = new Date(periodo.desde.getTime() - duracion)
  const hasta = new Date(periodo.desde)
  return { desde, hasta }
}

interface Props {
  periodo: Periodo
  onChange: (p: Periodo) => void
}

export default function SelectorPeriodo({ periodo, onChange }: Props) {
  const [mostrarCustom, setMostrarCustom] = useState(periodo.filtro === 'personalizado')
  const [desdeStr, setDesdeStr] = useState('')
  const [hastaStr, setHastaStr] = useState('')

  const filtros: { val: FiltroRapido; label: string }[] = [
    { val: 'hoy', label: 'Hoy' },
    { val: 'ayer', label: 'Ayer' },
    { val: 'semana', label: 'Semana' },
    { val: 'mes', label: 'Mes' },
    { val: 'mes_pasado', label: 'Mes pasado' },
  ]

  function seleccionar(f: FiltroRapido) {
    setMostrarCustom(false)
    onChange(calcularPeriodo(f))
  }

  function aplicarCustom() {
    if (!desdeStr || !hastaStr) return
    onChange(calcularPeriodo('personalizado', new Date(desdeStr), new Date(hastaStr)))
  }

  return (
    <div className="mb-4">
      <div className="flex gap-1 flex-wrap mb-2">
        {filtros.map(({ val, label }) => (
          <button
            key={val}
            onClick={() => seleccionar(val)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              periodo.filtro === val && !mostrarCustom ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setMostrarCustom(!mostrarCustom)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            mostrarCustom ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-600'
          }`}
        >
          📅 Rango
        </button>
      </div>
      {mostrarCustom && (
        <div className="flex gap-2 items-end">
          <input
            type="date"
            value={desdeStr}
            onChange={(e) => setDesdeStr(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <input
            type="date"
            value={hastaStr}
            onChange={(e) => setHastaStr(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <button
            onClick={aplicarCustom}
            className="bg-[#1e3a5f] text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  )
}
