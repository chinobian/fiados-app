export function generarId(): string {
  return crypto.randomUUID()
}

export function formatearMonto(monto: number): string {
  return monto.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  })
}

export function formatearFecha(fecha: Date): string {
  return new Date(fecha).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
