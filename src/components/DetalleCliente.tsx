import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { jsPDF } from 'jspdf'
import { db } from '../db'
import type { Cliente, Movimiento } from '../db'
import { generarId, formatearMonto, formatearFecha } from '../utils'

export default function DetalleCliente() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [modo, setModo] = useState<'fiado' | 'pago' | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [mostrarAjuste, setMostrarAjuste] = useState(false)
  const [porcentaje, setPorcentaje] = useState('')
  const [editando, setEditando] = useState(false)
  const [editNombre, setEditNombre] = useState('')
  const [editTelefono, setEditTelefono] = useState('')

  const cliente = useLiveQuery(() =>
    id ? db.clientes.get(id) : undefined,
    [id],
  )
  const movimientos = useLiveQuery(
    () =>
      id
        ? db.movimientos.where('clienteId').equals(id).reverse().sortBy('fecha')
        : [],
    [id],
  )

  if (cliente === undefined || !movimientos) return null

  if (cliente === null) {
    return (
      <div className="p-4 text-center mt-8">
        <p className="text-gray-500">Cliente no encontrado.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-[#1e3a5f] underline"
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  const saldo = movimientos.reduce(
    (acc, m) => acc + (m.tipo === 'fiado' ? m.monto : -m.monto),
    0,
  )

  async function registrarMovimiento(e: React.FormEvent) {
    e.preventDefault()
    if (!modo || !id) return
    const montoNum = parseFloat(monto.replace(',', '.'))
    if (isNaN(montoNum) || montoNum <= 0) {
      alert('Ingresá un monto válido mayor a cero.')
      return
    }
    const desc =
      descripcion.trim() ||
      (modo === 'pago' ? 'Pago' : 'Fiado')
    await db.movimientos.add({
      id: generarId(),
      clienteId: id,
      tipo: modo,
      descripcion: desc,
      monto: montoNum,
      fecha: new Date(),
    })
    setDescripcion('')
    setMonto('')
    setModo(null)
  }

  const hace30dias = new Date()
  hace30dias.setDate(hace30dias.getDate() - 30)
  const tieneDeudaVieja =
    saldo > 0 &&
    movimientos.some(
      (m) => m.tipo === 'fiado' && new Date(m.fecha) <= hace30dias,
    )

  async function aplicarAjuste(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    const pct = parseFloat(porcentaje.replace(',', '.'))
    if (isNaN(pct) || pct <= 0) {
      alert('Ingresá un porcentaje válido mayor a cero.')
      return
    }
    const ajuste = Math.round(saldo * (pct / 100) * 100) / 100
    await db.movimientos.add({
      id: generarId(),
      clienteId: id,
      tipo: 'fiado',
      descripcion: `Ajuste por inflación (${pct}%)`,
      monto: ajuste,
      fecha: new Date(),
    })
    setPorcentaje('')
    setMostrarAjuste(false)
  }

  function abrirEdicion() {
    if (!cliente) return
    setEditNombre(cliente.nombre)
    setEditTelefono(cliente.telefono)
    setEditando(true)
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    const nombre = editNombre.trim()
    if (!nombre) return
    await db.clientes.update(id, { nombre, telefono: editTelefono.trim() })
    setEditando(false)
  }

  const movimientosOrdenados = [...movimientos].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  )

  function generarPDF(cli: Cliente, movs: Movimiento[], saldoActual: number): jsPDF {
    const doc = new jsPDF()
    const margen = 20
    let y = 20

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Estado de cuenta', margen, y)
    y += 10

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Fecha: ${formatearFecha(new Date())}`, margen, y)
    y += 12

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(cli.nombre, margen, y)
    y += 7
    if (cli.telefono) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(cli.telefono, margen, y)
      y += 7
    }

    y += 5
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text(`Saldo adeudado: ${formatearMonto(saldoActual)}`, margen, y)
    y += 12

    doc.setDrawColor(200)
    doc.line(margen, y, 190, y)
    y += 8

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Detalle de movimientos', margen, y)
    y += 8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Fecha', margen, y)
    doc.text('Descripción', 55, y)
    doc.text('Monto', 170, y, { align: 'right' })
    y += 2
    doc.line(margen, y, 190, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    for (const m of movs) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      const signo = m.tipo === 'fiado' ? '+' : '-'
      doc.text(formatearFecha(m.fecha), margen, y)
      const descTexto = m.descripcion.length > 40 ? m.descripcion.substring(0, 40) + '...' : m.descripcion
      doc.text(descTexto, 55, y)
      doc.text(`${signo} ${formatearMonto(m.monto)}`, 170, y, { align: 'right' })
      y += 6
    }

    y += 5
    doc.line(margen, y, 190, y)
    y += 7
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(`Total adeudado: ${formatearMonto(saldoActual)}`, margen, y)

    return doc
  }

  async function enviarPorWhatsApp() {
    if (!cliente) return
    const doc = generarPDF(cliente, movimientosOrdenados, saldo)
    const blob = doc.output('blob')
    const archivo = new File([blob], `deuda-${cliente.nombre.replace(/\s+/g, '-')}.pdf`, {
      type: 'application/pdf',
    })

    if (navigator.share && navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({
          title: `Deuda de ${cliente.nombre}`,
          text: `Hola ${cliente.nombre}, te envío tu estado de cuenta. Saldo: ${formatearMonto(saldo)}`,
          files: [archivo],
        })
        return
      } catch {
        // usuario canceló o falló, caemos al fallback
      }
    }

    // Fallback: descargar PDF y abrir WhatsApp con mensaje de texto
    doc.save(`deuda-${cliente.nombre.replace(/\s+/g, '-')}.pdf`)
    const texto = encodeURIComponent(
      `Hola ${cliente.nombre}, te envío tu estado de cuenta.\nSaldo adeudado: ${formatearMonto(saldo)}\n(PDF adjunto descargado)`,
    )
    const tel = cliente.telefono.replace(/[^0-9]/g, '')
    const url = tel
      ? `https://wa.me/${tel}?text=${texto}`
      : `https://wa.me/?text=${texto}`
    window.open(url, '_blank')
  }

  return (
    <div className="p-4 pb-24">
      <button
        onClick={() => navigate(-1)}
        className="text-[#1e3a5f] mb-3 inline-block text-lg"
      >
        ← Volver
      </button>

      <div className="bg-white rounded-xl shadow p-5 mb-4">
        {editando ? (
          <form onSubmit={guardarEdicion} className="space-y-3">
            <input
              type="text"
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              placeholder="Nombre"
            />
            <input
              type="tel"
              value={editTelefono}
              onChange={(e) => setEditTelefono(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              placeholder="Teléfono (opcional)"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-[#1e3a5f] text-white rounded-lg py-3 text-lg font-medium"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setEditando(false)}
                className="flex-1 bg-gray-200 text-gray-700 rounded-lg py-3 text-lg font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#1e3a5f]">{cliente.nombre}</h1>
                {cliente.telefono && (
                  <p className="text-gray-400 text-sm">{cliente.telefono}</p>
                )}
              </div>
              <button
                onClick={abrirEdicion}
                className="text-gray-400 hover:text-[#1e3a5f] text-xl px-1"
                title="Editar"
              >
                ✏️
              </button>
            </div>
            <div className="mt-3">
              <p className="text-sm text-gray-500">Saldo actual</p>
              <p
                className={`text-3xl font-bold ${saldo > 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                {formatearMonto(saldo)}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setModo(modo === 'fiado' ? null : 'fiado'); setMostrarAjuste(false) }}
          className={`flex-1 rounded-xl py-3 text-lg font-medium ${
            modo === 'fiado'
              ? 'bg-red-600 text-white'
              : 'bg-white text-red-600 border-2 border-red-600'
          }`}
        >
          📝 Fiado
        </button>
        <button
          onClick={() => { setModo(modo === 'pago' ? null : 'pago'); setMostrarAjuste(false) }}
          className={`flex-1 rounded-xl py-3 text-lg font-medium ${
            modo === 'pago'
              ? 'bg-green-600 text-white'
              : 'bg-white text-green-600 border-2 border-green-600'
          }`}
        >
          💰 Pago
        </button>
      </div>

      {tieneDeudaVieja && (
        <div className="mb-4">
          <button
            onClick={() => { setMostrarAjuste(!mostrarAjuste); setModo(null) }}
            className={`w-full rounded-xl py-3 text-lg font-medium ${
              mostrarAjuste
                ? 'bg-amber-600 text-white'
                : 'bg-white text-amber-600 border-2 border-amber-600'
            }`}
          >
            📈 Ajustar por inflación
          </button>
          {mostrarAjuste && (
            <form
              onSubmit={aplicarAjuste}
              className="bg-white rounded-xl shadow p-4 mt-2 space-y-3"
            >
              <p className="text-sm text-gray-500">
                Deuda actual: <span className="font-bold text-red-600">{formatearMonto(saldo)}</span>
              </p>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Porcentaje de ajuste (%)"
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {porcentaje && !isNaN(parseFloat(porcentaje.replace(',', '.'))) && parseFloat(porcentaje.replace(',', '.')) > 0 && (
                <p className="text-sm text-gray-500">
                  Se sumará: <span className="font-bold text-amber-600">
                    {formatearMonto(Math.round(saldo * (parseFloat(porcentaje.replace(',', '.')) / 100) * 100) / 100)}
                  </span>
                </p>
              )}
              <button
                type="submit"
                className="w-full bg-amber-600 text-white rounded-lg py-3 text-lg font-medium active:bg-amber-700"
              >
                Aplicar ajuste
              </button>
            </form>
          )}
        </div>
      )}

      {modo && (
        <form
          onSubmit={registrarMovimiento}
          className="bg-white rounded-xl shadow p-4 mb-4 space-y-3"
        >
          <input
            type="text"
            placeholder={
              modo === 'fiado'
                ? 'Ej: 2 kg pan, 1 leche'
                : 'Ej: Pago parcial'
            }
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Monto ($)"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
          />
          <button
            type="submit"
            className={`w-full text-white rounded-lg py-3 text-lg font-medium ${
              modo === 'fiado'
                ? 'bg-red-600 active:bg-red-700'
                : 'bg-green-600 active:bg-green-700'
            }`}
          >
            {modo === 'fiado' ? 'Registrar fiado' : 'Registrar pago'}
          </button>
        </form>
      )}

      {saldo > 0 && (
        <button
          onClick={enviarPorWhatsApp}
          className="w-full bg-[#25D366] text-white rounded-xl py-3 text-lg font-medium mb-4 active:bg-[#1da851]"
        >
          📄 Enviar deuda por WhatsApp
        </button>
      )}

      <h2 className="text-lg font-bold text-gray-700 mb-2">Historial</h2>

      {movimientosOrdenados.length === 0 ? (
        <p className="text-gray-400 text-center mt-4">
          No hay movimientos todavía.
        </p>
      ) : (
        <div className="space-y-2">
          {movimientosOrdenados.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-xl shadow p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-800">
                  {m.tipo === 'fiado' ? '📝' : '💰'} {m.descripcion}
                </p>
                <p className="text-sm text-gray-400">
                  {formatearFecha(m.fecha)}
                </p>
              </div>
              <span
                className={`font-bold text-lg ${
                  m.tipo === 'fiado' ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {m.tipo === 'fiado' ? '+' : '-'} {formatearMonto(m.monto)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
