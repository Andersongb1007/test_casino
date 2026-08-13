import crypto from "node:crypto"

export type BetlinkEnv = {
  baseUrl: string
  operatorId: string
  apiKey: string
  signingSecret: string
}

export function readBetlinkEnv(
  source: Record<string, string | undefined> = process.env,
): BetlinkEnv {
  return {
    baseUrl: source.BETLINK_BASE_URL || "https://validador.betlink.com.ve/api/v1",
    operatorId: source.BETLINK_OPERATOR_ID || "",
    apiKey: source.BETLINK_API_KEY || "",
    signingSecret: source.BETLINK_SIGNING_SECRET || "",
  }
}

export function hmacSign(canonicalObject: unknown, signingSecret: string): string {
  const canonicalJson = JSON.stringify(canonicalObject)
  return crypto
    .createHmac("sha256", signingSecret)
    .update(canonicalJson, "utf8")
    .digest("hex")
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortKeysDeep(obj[key])
    }
    return out
  }
  return value
}

export function buildPrizeCanonical(body: Record<string, unknown>) {
  const bets = Array.isArray(body.bets) ? [...body.bets] : []
  bets.sort((a, b) => {
    const ai = Number((a as { betIndex?: number }).betIndex ?? 0)
    const bi = Number((b as { betIndex?: number }).betIndex ?? 0)
    return ai - bi
  })
  return {
    eventType: "PRIZE",
    operatorId: body.operatorId,
    currency: body.currency,
    serial: body.serial,
    paidAmount: body.paidAmount,
    expectedPayoutAmount: body.expectedPayoutAmount,
    prizedAt: body.prizedAt,
    externalTicketKey: body.externalTicketKey,
    originalTicketId: body.originalTicketId,
    originalHuc: body.originalHuc,
    bets: bets.map((bet) => sortKeysDeep(bet)),
    metadata: sortKeysDeep(body.metadata ?? {}),
  }
}

export async function forwardToBetlink(
  env: BetlinkEnv,
  path: string,
  body: unknown,
  idempotencyKey: string,
) {
  const url = `${env.baseUrl.replace(/\/$/, "")}${path}`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": env.apiKey,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }
  return { status: response.status, data }
}

export type BetlinkRoute =
  | "ingest"
  | "prize"
  | "pending/certification"
  | "pending/prize"

export async function handleBetlinkRoute(
  route: BetlinkRoute,
  body: Record<string, unknown>,
  idempotencyKey: string,
  env = readBetlinkEnv(),
) {
  if (!env.apiKey || !env.operatorId) {
    return { status: 500, data: { error: "betlink_env_missing" } }
  }
  if (
    (route === "prize" || route === "pending/prize") &&
    !env.signingSecret
  ) {
    return { status: 500, data: { error: "betlink_signing_secret_missing" } }
  }

  const payload = {
    ...body,
    operatorId: env.operatorId || body.operatorId,
  }

  if (route === "ingest") {
    return forwardToBetlink(env, "/bets/ingest", payload, idempotencyKey)
  }

  if (route === "prize") {
    const signature = hmacSign(buildPrizeCanonical(payload), env.signingSecret)
    return forwardToBetlink(
      env,
      "/bets/prize",
      { ...payload, signature },
      idempotencyKey,
    )
  }

  if (route === "pending/certification") {
    return forwardToBetlink(
      env,
      "/pending-remittance/certification",
      payload,
      idempotencyKey,
    )
  }

  if (route === "pending/prize") {
    const signature = hmacSign(buildPrizeCanonical(payload), env.signingSecret)
    return forwardToBetlink(
      env,
      "/pending-remittance/prize",
      { ...payload, signature },
      idempotencyKey,
    )
  }

  return { status: 404, data: { error: "not_found" } }
}
