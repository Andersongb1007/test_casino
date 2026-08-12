const QUEUE_KEY = "betlink_pending_v1"

export type PendingKind = "certification" | "prize"

export type PendingItem = {
  id: string
  kind: PendingKind
  idempotencyKey: string
  payload: unknown
  attempts: number
  createdAt: string
}

function loadQueue(): PendingItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PendingItem[]
  } catch {
    return []
  }
}

function saveQueue(items: PendingItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
}

export function enqueuePending(
  kind: PendingKind,
  idempotencyKey: string,
  payload: unknown,
) {
  const items = loadQueue()
  if (items.some((i) => i.idempotencyKey === idempotencyKey)) return
  items.push({
    id: `PQ-${Date.now()}`,
    kind,
    idempotencyKey,
    payload,
    attempts: 3,
    createdAt: new Date().toISOString(),
  })
  saveQueue(items)
}

async function postLocal(
  path: string,
  payload: unknown,
  idempotencyKey: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    })
    let data: unknown = null
    try {
      data = await res.json()
    } catch {
      data = null
    }
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}

export type IngestResult = {
  ok: boolean
  ticketId: string | null
  huc: string | null
  serial: string | null
  externalTicketKey: string | null
  status: number
  data: unknown
}

function pickField(data: unknown, keys: string[]): string | null {
  if (!data || typeof data !== "object") return null
  const obj = data as Record<string, unknown>
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === "string" && v) return v
  }
  const nested = obj.ticket
  if (nested && typeof nested === "object") {
    const t = nested as Record<string, unknown>
    for (const key of keys) {
      const v = t[key]
      if (typeof v === "string" && v) return v
    }
  }
  return null
}

async function postWithRetries(
  path: string,
  payload: unknown,
  idempotencyKey: string,
  maxAttempts = 3,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  let last = { ok: false, status: 0, data: null as unknown }
  for (let i = 0; i < maxAttempts; i++) {
    last = await postLocal(path, payload, idempotencyKey)
    if (last.ok || (last.status >= 400 && last.status < 500 && last.status !== 0)) {
      return last
    }
  }
  return last
}

export async function remitIngest(payload: unknown): Promise<IngestResult> {
  const externalTicketKey = pickField(payload, ["externalTicketKey"])
  const idempotencyKey = crypto.randomUUID()
  const result = await postWithRetries("/api/betlink/ingest", payload, idempotencyKey)

  if (!result.ok && (result.status === 0 || result.status >= 500)) {
    enqueuePending("certification", idempotencyKey, payload)
  }

  const nestedSerial =
    payload &&
    typeof payload === "object" &&
    typeof (payload as { ticket?: { serial?: unknown } }).ticket?.serial ===
      "string"
      ? (payload as { ticket: { serial: string } }).ticket.serial
      : null

  return {
    ok: result.ok,
    ticketId: pickField(result.data, ["ticketId", "id"]),
    huc: pickField(result.data, ["huc", "HUC"]),
    serial: pickField(result.data, ["serial"]) || nestedSerial,
    externalTicketKey:
      pickField(result.data, ["externalTicketKey"]) || externalTicketKey,
    status: result.status,
    data: result.data,
  }
}

export async function remitPrize(payload: unknown): Promise<boolean> {
  const idempotencyKey = crypto.randomUUID()
  const result = await postWithRetries("/api/betlink/prize", payload, idempotencyKey)
  if (!result.ok && (result.status === 0 || result.status >= 500)) {
    enqueuePending("prize", idempotencyKey, payload)
    return false
  }
  return result.ok
}

export async function flushPendingRemittances() {
  const items = loadQueue()
  if (items.length === 0) return
  const remaining: PendingItem[] = []
  for (const item of items) {
    const path =
      item.kind === "certification"
        ? "/api/betlink/pending/certification"
        : "/api/betlink/pending/prize"
    const result = await postLocal(path, item.payload, item.idempotencyKey)
    if (!result.ok) remaining.push(item)
  }
  saveQueue(remaining)
}
