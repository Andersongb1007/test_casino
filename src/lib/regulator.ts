let hucCounter = 1

export function generateHuc(date = new Date()): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const seq = String(hucCounter++).padStart(8, "0")
  return `${yyyy}-${mm}-${dd}-${seq}`
}

export function createTicketId(): string {
  return `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}
