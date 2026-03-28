import Dexie, { type Table } from 'dexie'

export interface Cliente {
  id: string
  nombre: string
  telefono: string
  creadoEn: Date
}

export interface Movimiento {
  id: string
  clienteId: string
  tipo: 'fiado' | 'pago'
  descripcion: string
  monto: number
  fecha: Date
}

class FiadosDB extends Dexie {
  clientes!: Table<Cliente>
  movimientos!: Table<Movimiento>

  constructor() {
    super('FiadosDB')
    this.version(1).stores({
      clientes: 'id, nombre',
      movimientos: 'id, clienteId, fecha',
    })
  }
}

export const db = new FiadosDB()

export async function seedDatos() {
  const count = await db.clientes.count()
  if (count > 0) return

  const jorge = crypto.randomUUID()
  const marta = crypto.randomUUID()
  const carlos = crypto.randomUUID()

  await db.clientes.bulkAdd([
    { id: jorge, nombre: 'Jorge Ramírez', telefono: '2355642740', creadoEn: new Date('2026-02-10') },
    { id: marta, nombre: 'Marta López', telefono: '', creadoEn: new Date('2026-03-15') },
    { id: carlos, nombre: 'Carlos Giménez', telefono: '11-9876-5432', creadoEn: new Date('2026-03-20') },
  ])

  await db.movimientos.bulkAdd([
    { id: crypto.randomUUID(), clienteId: jorge, tipo: 'fiado', descripcion: '1 kg milanesas, 2 cocas', monto: 8500, fecha: new Date('2026-02-15') },
    { id: crypto.randomUUID(), clienteId: jorge, tipo: 'fiado', descripcion: '3 kg pan, 1 queso cremoso', monto: 4200, fecha: new Date('2026-02-20') },
    { id: crypto.randomUUID(), clienteId: jorge, tipo: 'pago', descripcion: 'Pago parcial', monto: 5000, fecha: new Date('2026-03-22') },

    { id: crypto.randomUUID(), clienteId: marta, tipo: 'fiado', descripcion: '2 leches, 1 manteca, 1 docena huevos', monto: 6300, fecha: new Date('2026-03-16') },
    { id: crypto.randomUUID(), clienteId: marta, tipo: 'pago', descripcion: 'Pago total', monto: 6300, fecha: new Date('2026-03-25') },

    { id: crypto.randomUUID(), clienteId: carlos, tipo: 'fiado', descripcion: '5 kg pan, 2 gaseosas, 1 fiambre', monto: 12000, fecha: new Date('2026-03-21') },
    { id: crypto.randomUUID(), clienteId: carlos, tipo: 'fiado', descripcion: '1 aceite, 2 fideos, 1 salsa', monto: 5800, fecha: new Date('2026-03-26') },
    { id: crypto.randomUUID(), clienteId: carlos, tipo: 'pago', descripcion: 'Pago parcial', monto: 3000, fecha: new Date('2026-03-27') },
  ])
}
