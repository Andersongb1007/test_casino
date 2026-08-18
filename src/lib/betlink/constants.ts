export const BETLINK_OPERATOR_ID =
  "0dc7e6f2-bbc8-4a7a-b079-b0fc08bcc776"

export const BURNED_BETTOR = {
  firstName: "Prueba",
  lastName: "Casino",
  documentId: "00000000",
  documentTypeId: "V",
  address: "Caracas, Venezuela",
  phone: "04141234567",
  email: "prueba.casino@ejemplo.test",
} as const

export function nowVeIso(): string {
  const d = new Date()
  const offset = -4 * 60
  const local = new Date(d.getTime() + offset * 60_000)
  const iso = local.toISOString().replace("Z", "")
  return `${iso.slice(0, 19)}-04:00`
}

export function todayVeDate(): string {
  return nowVeIso().slice(0, 10)
}

export function eventDateLabel(date = todayVeDate()): string {
  const [, m, day] = date.split("-")
  return `F:${day}/${m}`
}

export function newExternalKey(prefix: string): string {
  const stamp = nowVeIso().replace(/[-:T]/g, "").slice(0, 14)
  const rnd = Math.floor(Math.random() * 900 + 100)
  return `${prefix}-${stamp}-${rnd}`
}

export function newSerial(prefix: string): string {
  return `${prefix}-${Date.now().toString().slice(-8)}`
}

export function newTicketNumber(prefix: string): string {
  return `${prefix}-${Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0")}`
}
