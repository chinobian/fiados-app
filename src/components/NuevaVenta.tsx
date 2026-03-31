import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { VentaItem } from '../db'
import { generarId, formatearMonto } from '../utils'

interface CarritoItem extends VentaItem {
  key: string
}

export default function NuevaVenta() {
  const navigate = useNavigate()
  const [carrito, setCarrito] = useState<CarritoItem[]>([])
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'fiado'>('efectivo')
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [busquedaProd, setBusquedaProd] = useState('')
  const [modoLibre, setModoLibre] = useState(false)
  const [libreDesc, setLibreDesc] = useState('')
  const [libreMonto, setLibreMonto] = useState('')

  const productos = useLiveQuery(() => db.productos.toArray())
  const clientes = useLiveQuery(() => db.clientes.toArray())

  if (!productos || !clientes) return null

  const productosFiltrados = busquedaProd
    ? productos
        .filter((p) => p.nombre.toLowerCase().includes(busquedaProd.toLowerCase()))
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .slice(0, 8)
    : []

  const total = carrito.reduce((sum, item) => sum + item.cantidad * item.precioUnitario, 0)

  function agregarProducto(prodId: string, nombre: string, precio: number) {
    const existente = carrito.find((c) => c.productoId === prodId)
    if (existente) {
      setCarrito(
        carrito.map((c) =>
          c.key === existente.key ? { ...c, cantidad: c.cantidad + 1 } : c,
        ),
      )
    } else {
      setCarrito([
        ...carrito,
        {
          key: generarId(),
          productoId: prodId,
          descripcion: nombre,
          cantidad: 1,
          precioUnitario: precio,
        },
      ])
    }
    setBusquedaProd('')
  }

  function agregarLibre(e: React.FormEvent) {
    e.preventDefault()
    const desc = libreDesc.trim()
    if (!desc) return
    const monto = parseFloat(libreMonto.replace(',', '.'))
    if (isNaN(monto) || monto <= 0) {
      alert('Ingresá un monto válido.')
      return
    }
    setCarrito([
      ...carrito,
      {
        key: generarId(),
        productoId: null,
        descripcion: desc,
        cantidad: 1,
        precioUnitario: monto,
      },
    ])
    setLibreDesc('')
    setLibreMonto('')
    setModoLibre(false)
  }

  function cambiarCantidad(key: string, nueva: number) {
    if (nueva < 1) return
    setCarrito(carrito.map((c) => (c.key === key ? { ...c, cantidad: nueva } : c)))
  }

  function eliminarItem(key: string) {
    setCarrito(carrito.filter((c) => c.key !== key))
  }

  async function confirmarVenta() {
    if (carrito.length === 0) {
      alert('Agregá al menos un ítem.')
      return
    }
    if (metodoPago === 'fiado' && !clienteId) {
      alert('Para ventas fiadas, tenés que seleccionar un cliente.')
      return
    }

    const ventaId = generarId()
    const items = carrito.map(({ productoId, descripcion, cantidad, precioUnitario }) => ({
      productoId,
      descripcion,
      cantidad,
      precioUnitario,
    }))

    await db.ventas.add({
      id: ventaId,
      items,
      clienteId: clienteId || null,
      metodoPago,
      total,
      fecha: new Date(),
    })

    // Si es fiado, crear movimiento en la tabla de movimientos
    if (metodoPago === 'fiado' && clienteId) {
      const descItems = carrito
        .map((c) => (c.cantidad > 1 ? `${c.cantidad}x ${c.descripcion}` : c.descripcion))
        .join(', ')
      await db.movimientos.add({
        id: generarId(),
        clienteId,
        tipo: 'fiado',
        descripcion: descItems,
        monto: total,
        fecha: new Date(),
      })
    }

    navigate('/ventas')
  }

  return (
    <div className="p-4 pb-24">
      <button
        onClick={() => navigate('/ventas')}
        className="text-[#1e3a5f] mb-3 inline-block text-lg"
      >
        ← Volver
      </button>

      <h1 className="text-2xl font-bold text-[#1e3a5f] mb-4">➕ Nueva venta</h1>

      {/* Buscar producto */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busquedaProd}
          onChange={(e) => setBusquedaProd(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
        />
        {productosFiltrados.length > 0 && (
          <div className="bg-white rounded-xl shadow mt-1 overflow-hidden">
            {productosFiltrados.map((p) => (
              <button
                key={p.id}
                onClick={() => agregarProducto(p.id, p.nombre, p.precio)}
                className="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0"
              >
                <span className="text-gray-800">{p.nombre}</span>
                <span className="text-[#1e3a5f] font-bold text-sm">{formatearMonto(p.precio)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Agregar texto libre */}
      <button
        onClick={() => setModoLibre(!modoLibre)}
        className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-500 rounded-xl py-3 text-lg mb-4 active:bg-gray-50"
      >
        {modoLibre ? 'Cancelar' : '✏️ Agregar ítem manual'}
      </button>

      {modoLibre && (
        <form onSubmit={agregarLibre} className="bg-white rounded-xl shadow p-4 mb-4 space-y-3">
          <input
            type="text"
            placeholder="Descripción (ej: Fiambre suelto)"
            value={libreDesc}
            onChange={(e) => setLibreDesc(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Monto ($)"
            value={libreMonto}
            onChange={(e) => setLibreMonto(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <button
            type="submit"
            className="w-full bg-[#1e3a5f] text-white rounded-lg py-3 text-lg font-medium"
          >
            Agregar al carrito
          </button>
        </form>
      )}

      {/* Carrito */}
      {carrito.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <h2 className="font-bold text-gray-700 mb-3">Carrito</h2>
          <div className="space-y-3">
            {carrito.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 text-sm truncate">{item.descripcion}</p>
                  <p className="text-xs text-gray-400">
                    {formatearMonto(item.precioUnitario)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => cambiarCantidad(item.key, item.cantidad - 1)}
                    className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-medium">{item.cantidad}</span>
                  <button
                    onClick={() => cambiarCantidad(item.key, item.cantidad + 1)}
                    className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <span className="font-bold text-sm w-24 text-right">
                  {formatearMonto(item.cantidad * item.precioUnitario)}
                </span>
                <button
                  onClick={() => eliminarItem(item.key)}
                  className="text-gray-300 hover:text-red-500 text-lg"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-lg text-[#1e3a5f]">{formatearMonto(total)}</span>
          </div>
        </div>
      )}

      {/* Método de pago */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <h2 className="font-bold text-gray-700 mb-3">Método de pago</h2>
        <div className="flex gap-2">
          {([
            { val: 'efectivo' as const, label: '💵 Efectivo' },
            { val: 'transferencia' as const, label: '📱 Transf.' },
            { val: 'fiado' as const, label: '📝 Fiado' },
          ]).map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setMetodoPago(val)}
              className={`flex-1 rounded-xl py-3 text-sm font-medium ${
                metodoPago === val
                  ? 'bg-[#1e3a5f] text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cliente */}
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <h2 className="font-bold text-gray-700 mb-2">
          Cliente {metodoPago === 'fiado' ? '(obligatorio)' : '(opcional)'}
        </h2>
        <select
          value={clienteId ?? ''}
          onChange={(e) => setClienteId(e.target.value || null)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] bg-white"
        >
          <option value="">Sin cliente</option>
          {clientes
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
        </select>
      </div>

      {/* Confirmar */}
      <button
        onClick={confirmarVenta}
        disabled={carrito.length === 0}
        className="w-full bg-green-600 text-white rounded-xl py-4 text-xl font-bold active:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500"
      >
        ✅ Confirmar venta — {formatearMonto(total)}
      </button>
    </div>
  )
}
