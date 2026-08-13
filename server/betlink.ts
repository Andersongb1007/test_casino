import crypto from "node:crypto"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin } from "vite"
import { loadEnv } from "vite"
import {
  handleBetlinkRoute,
  hmacSign,
  readBetlinkEnv,
  type BetlinkRoute,
} from "./betlink-core.ts"

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

function routeFromPath(pathname: string): BetlinkRoute | null {
  if (pathname === "/api/betlink/ingest") return "ingest"
  if (pathname === "/api/betlink/prize") return "prize"
  if (pathname === "/api/betlink/pending/certification")
    return "pending/certification"
  if (pathname === "/api/betlink/pending/prize") return "pending/prize"
  return null
}

export function betlinkPlugin(mode = "development"): Plugin {
  verifyHmacVectors()

  const resolveEnv = () => {
    const fileEnv = loadEnv(mode, process.cwd(), "")
    const env = readBetlinkEnv({ ...process.env, ...fileEnv })
    return env
  }

  return {
    name: "betlink-proxy",
    configureServer(server) {
      const boot = resolveEnv()
      console.info(
        `[betlink] proxy → ${boot.baseUrl} (key ${boot.apiKey.slice(0, 12)}…)`,
      )

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

        const route = routeFromPath(url.pathname)
        if (!route) {
          sendJson(res, 404, { error: "not_found" })
          return
        }

        try {
          const env = resolveEnv()
          const body = (await readJsonBody(req)) as Record<string, unknown>
          const idempotencyKey =
            (req.headers["x-idempotency-key"] as string | undefined) ||
            crypto.randomUUID()
          const result = await handleBetlinkRoute(
            route,
            body,
            idempotencyKey,
            env,
          )
          sendJson(res, result.status, result.data)
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
