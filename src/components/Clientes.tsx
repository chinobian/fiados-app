import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { generarId, formatearMonto } from '../utils'

export default function Clientes() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')

  const clientes = useLiveQuery(() => db.clientes.toArray())
  const movimientos = useLiveQuery(() => db.movimientos.toArray())

  if (!clientes || !movimientos) return null

  const saldos = new Map<string, number>()
  for (const m of movimientos) {
    const actual = saldos.get(m.clienteId) ?? 0
    saldos.set(m.clienteId, actual + (m.tipo === 'fiado' ? m.monto : -m.monto))
  }

  const clientesFiltrados = clientes
    .filter((c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  async function agregarCliente(e: React.FormEvent) {
    e.preventDefault()
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) return
    await db.clientes.add({
      id: generarId(),
      nombre: nombreLimpio,
      telefono: telefono.trim(),
      creadoEn: new Date(),
    })
    setNombre('')
    setTelefono('')
    setMostrarForm(false)
  }

  async function eliminarCliente(id: string) {
    const saldo = saldos.get(id) ?? 0
    if (saldo > 0) {
      alert('No se puede eliminar un cliente con deuda pendiente.')
      return
    }
    if (!confirm('¿Eliminar este cliente y todos sus movimientos?')) return
    await db.movimientos.where('clienteId').equals(id).delete()
    await db.clientes.delete(id)
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-4">👤 Clientes</h1>

      <input
        type="text"
        placeholder="Buscar cliente..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
      />

      <button
        onClick={() => setMostrarForm(!mostrarForm)}
        className="w-full bg-[#1e3a5f] text-white rounded-xl py-3 text-lg font-medium mb-4 active:bg-[#152d4a]"
      >
        {mostrarForm ? 'Cancelar' : '+ Nuevo cliente'}
      </button>

      {mostrarForm && (
        <form
          onSubmit={agregarCliente}
          className="bg-white rounded-xl shadow p-4 mb-4 space-y-3"
        >
          <input
            type="text"
            placeholder="Nombre *"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <input
            type="tel"
            placeholder="Teléfono (opcional)"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <button
            type="submit"
            className="w-full bg-green-600 text-white rounded-lg py-3 text-lg font-medium active:bg-green-700"
          >
            Guardar cliente
          </button>
        </form>
      )}

      {clientesFiltrados.length === 0 ? (
        <p className="text-gray-400 text-center mt-8">
          {busqueda ? 'No se encontraron clientes.' : 'No hay clientes todavía.'}
        </p>
      ) : (
        <div className="space-y-2">
          {clientesFiltrados.map((c) => {
            const saldo = saldos.get(c.id) ?? 0
            const tieneDeuda = saldo > 0
            return (
              <div
                key={c.id}
                className="bg-white rounded-xl shadow p-4 flex items-center justify-between"
              >
                <button
                  onClick={() => navigate(`/cliente/${c.id}`)}
                  className="flex-1 text-left"
                >
                  <p className="font-medium text-gray-800">{c.nombre}</p>
                  {c.telefono && (
                    <p className="text-sm text-gray-400">{c.telefono}</p>
                  )}
                </button>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-bold ${tieneDeuda ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {formatearMonto(saldo)}
                  </span>
                  <button
                    onClick={() => eliminarCliente(c.id)}
                    className="text-gray-300 hover:text-red-500 text-xl px-1"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
