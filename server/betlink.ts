import crypto from "node:crypto"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin } from "vite"
import { loadEnv } from "vite"

type Env = {
  baseUrl: string
  operatorId: string
  apiKey: string
  signingSecret: string
}

function readEnv(mode: string): Env {
  const env = loadEnv(mode, process.cwd(), "")
  return {
    baseUrl: env.BETLINK_BASE_URL || "https://validador.betlink.com.ve/api/v1",
    operatorId: env.BETLINK_OPERATOR_ID || "",
    apiKey: env.BETLINK_API_KEY || "",
    signingSecret: env.BETLINK_SIGNING_SECRET || "",
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

function buildPrizeCanonical(body: Record<string, unknown>) {
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

function verifyHmacVectors(signingSecretForTest = "test-secret-0123456789abcdef") {
  const cancelCanonical = {
    eventType: "CANCELLATION",
    operatorId: "op",
    originalTicketId: "t1",
    originalHuc: "h1",
    externalTicketKey: "e1",
    reasonCode: "CUSTOMER_CANCELLED",
    reasonDescription: "x",
    cancelledAt: "2026-01-01T00:00:00-04:00",
    operatorUser: "caja-01",
  }
  const cancelSig = hmacSign(cancelCanonical, signingSecretForTest)
  const expectedCancel =
    "036a96d7f2649776ec13454ce90af5abea845420535753878881217c4279702d"

  const prizeCanonical = {
    eventType: "PRIZE",
    operatorId: "op",
    currency: "VES",
    serial: "S-1",
    paidAmount: "200.00",
    expectedPayoutAmount: "200.00",
    prizedAt: "2026-01-01T12:00:00-04:00",
    externalTicketKey: "e1",
    originalTicketId: "t1",
    originalHuc: "h1",
    bets: [{ betIndex: 0, paidAmount: "200.00", settlementResult: "WON" }],
    metadata: { sourceSystem: "integracion-externa", terminalId: "POS-01" },
  }
  const prizeSig = hmacSign(prizeCanonical, signingSecretForTest)
  const expectedPrize =
    "4c9ecab1e56f9a64fa667f7ee0290562fe07a95e28c0724c1e4b0a2e550170e3"

  if (cancelSig !== expectedCancel || prizeSig !== expectedPrize) {
    console.warn("[betlink] HMAC test vectors mismatch", {
      cancelSig,
      prizeSig,
    })
  } else {
    console.info("[betlink] HMAC test vectors OK")
  }
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString("utf8")
  if (!raw) return {}
  return JSON.parse(raw) as unknown
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(body)
}

async function forwardToBetlink(
  env: Env,
  path: string,
  body: unknown,
  idempotencyKey: string,
) {
  const url = `${env.baseUrl.replace(/\/$/, "")}${path}`
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.apiKey,
      "x-idempotency-key": idempotencyKey,
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

export function betlinkPlugin(mode = "development"): Plugin {
  const env = readEnv(mode)
  verifyHmacVectors()

  return {
    name: "betlink-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.method) return next()
        const url = new URL(req.url, "http://localhost")
        if (!url.pathname.startsWith("/api/betlink/")) return next()

        if (req.method === "OPTIONS") {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method !== "POST") {
          sendJson(res, 405, { error: "method_not_allowed" })
          return
        }

        if (!env.apiKey || !env.operatorId || !env.signingSecret) {
          sendJson(res, 500, { error: "betlink_env_missing" })
          return
        }

        try {
          const body = (await readJsonBody(req)) as Record<string, unknown>
          const idempotencyKey =
            (req.headers["x-idempotency-key"] as string | undefined) ||
            crypto.randomUUID()

          if (url.pathname === "/api/betlink/ingest") {
            const payload = {
              ...body,
              operatorId: body.operatorId || env.operatorId,
            }
            const result = await forwardToBetlink(
              env,
              "/bets/ingest",
              payload,
              idempotencyKey,
            )
            sendJson(res, result.status, result.data)
            return
          }

          if (url.pathname === "/api/betlink/prize") {
            const payload = {
              ...body,
              operatorId: body.operatorId || env.operatorId,
            }
            const canonical = buildPrizeCanonical(payload)
            const signature = hmacSign(canonical, env.signingSecret)
            const withSig = { ...payload, signature }
            const result = await forwardToBetlink(
              env,
              "/bets/prize",
              withSig,
              idempotencyKey,
            )
            sendJson(res, result.status, result.data)
            return
          }

          if (url.pathname === "/api/betlink/pending/certification") {
            const payload = {
              ...body,
              operatorId: body.operatorId || env.operatorId,
            }
            const result = await forwardToBetlink(
              env,
              "/pending-remittance/certification",
              payload,
              idempotencyKey,
            )
            sendJson(res, result.status, result.data)
            return
          }

          if (url.pathname === "/api/betlink/pending/prize") {
            const payload = {
              ...body,
              operatorId: body.operatorId || env.operatorId,
            }
            const canonical = buildPrizeCanonical(payload)
            const signature = hmacSign(canonical, env.signingSecret)
            const withSig = { ...payload, signature }
            const result = await forwardToBetlink(
              env,
              "/pending-remittance/prize",
              withSig,
              idempotencyKey,
            )
            sendJson(res, result.status, result.data)
            return
          }

          sendJson(res, 404, { error: "not_found" })
        } catch (err) {
          sendJson(res, 502, {
            error: "betlink_proxy_failed",
            message: err instanceof Error ? err.message : "unknown",
          })
        }
      })
    },
  }
}
