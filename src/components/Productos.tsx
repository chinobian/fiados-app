import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { generarId, formatearMonto } from '../utils'

export default function Productos() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editPrecio, setEditPrecio] = useState('')

  const productos = useLiveQuery(() => db.productos.toArray())

  if (!productos) return null

  const productosFiltrados = productos
    .filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  async function agregarProducto(e: React.FormEvent) {
    e.preventDefault()
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) return
    const precioNum = parseFloat(precio.replace(',', '.'))
    if (isNaN(precioNum) || precioNum <= 0) {
      alert('Ingresá un precio válido mayor a cero.')
      return
    }
    await db.productos.add({
      id: generarId(),
      nombre: nombreLimpio,
      precio: precioNum,
      creadoEn: new Date(),
    })
    setNombre('')
    setPrecio('')
    setMostrarForm(false)
  }

  function abrirEdicion(id: string, nom: string, pre: number) {
    setEditandoId(id)
    setEditNombre(nom)
    setEditPrecio(String(pre))
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault()
    if (!editandoId) return
    const nombreLimpio = editNombre.trim()
    if (!nombreLimpio) return
    const precioNum = parseFloat(editPrecio.replace(',', '.'))
    if (isNaN(precioNum) || precioNum <= 0) {
      alert('Ingresá un precio válido mayor a cero.')
      return
    }
    await db.productos.update(editandoId, {
      nombre: nombreLimpio,
      precio: precioNum,
    })
    setEditandoId(null)
  }

  async function eliminarProducto(id: string) {
    if (!confirm('¿Eliminar este producto?')) return
    await db.productos.delete(id)
  }

  return (
    <div className="p-4 pb-24">
      <button
        onClick={() => navigate('/ventas')}
        className="text-[#1e3a5f] mb-3 inline-block text-lg"
      >
        ← Volver a Ventas
      </button>

      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-4">⚙️ Productos</h1>

      <input
        type="text"
        placeholder="Buscar producto..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
      />

      <button
        onClick={() => { setMostrarForm(!mostrarForm); setEditandoId(null) }}
        className="w-full bg-[#1e3a5f] text-white rounded-xl py-3 text-lg font-medium mb-4 active:bg-[#152d4a]"
      >
        {mostrarForm ? 'Cancelar' : '+ Nuevo producto'}
      </button>

      {mostrarForm && (
        <form
          onSubmit={agregarProducto}
          className="bg-white rounded-xl shadow p-4 mb-4 space-y-3"
        >
          <input
            type="text"
            placeholder="Nombre del producto *"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Precio ($)"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <button
            type="submit"
            className="w-full bg-green-600 text-white rounded-lg py-3 text-lg font-medium active:bg-green-700"
          >
            Guardar producto
          </button>
        </form>
      )}

      {productosFiltrados.length === 0 ? (
        <p className="text-gray-400 text-center mt-8">
          {busqueda ? 'No se encontraron productos.' : 'No hay productos todavía.'}
        </p>
      ) : (
        <div className="space-y-2">
          {productosFiltrados.map((p) =>
            editandoId === p.id ? (
              <form
                key={p.id}
                onSubmit={guardarEdicion}
                className="bg-white rounded-xl shadow p-4 space-y-3"
              >
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={editPrecio}
                  onChange={(e) => setEditPrecio(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#1e3a5f] text-white rounded-lg py-2 font-medium"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditandoId(null)}
                    className="flex-1 bg-gray-200 text-gray-700 rounded-lg py-2 font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div
                key={p.id}
                className="bg-white rounded-xl shadow p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-gray-800">{p.nombre}</p>
                  <p className="text-sm text-[#1e3a5f] font-bold">
                    {formatearMonto(p.precio)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => abrirEdicion(p.id, p.nombre, p.precio)}
                    className="text-gray-400 hover:text-[#1e3a5f] text-lg px-1"
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => eliminarProducto(p.id)}
                    className="text-gray-300 hover:text-red-500 text-xl px-1"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
