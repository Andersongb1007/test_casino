import crypto from "node:crypto"
import { handleBetlinkRoute } from "../_lib/betlink-core.js"

function routeFromReq(req) {
  const pathParam = req.query.path
  const segments = Array.isArray(pathParam)
    ? pathParam
    : typeof pathParam === "string"
      ? [pathParam]
      : []
  const joined = segments.join("/")

  if (joined === "ingest") return "ingest"
  if (joined === "prize") return "prize"
  if (joined === "pending/certification") return "pending/certification"
  if (joined === "pending/prize") return "pending/prize"

  const url = req.url || ""
  if (url.includes("/ingest")) return "ingest"
  if (url.includes("pending/certification")) return "pending/certification"
  if (url.includes("pending/prize")) return "pending/prize"
  if (url.includes("/prize")) return "prize"
  return null
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-idempotency-key",
  )

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" })
    return
  }

  const route = routeFromReq(req)
  if (!route) {
    res.status(404).json({ error: "not_found" })
    return
  }

  try {
    const body = req.body || {}
    const idempotencyKey =
      req.headers["x-idempotency-key"] || crypto.randomUUID()
    const result = await handleBetlinkRoute(route, body, idempotencyKey)
    res.status(result.status).json(result.data)
  } catch (err) {
    res.status(502).json({
      error: "betlink_proxy_failed",
      message: err instanceof Error ? err.message : "unknown",
    })
  }
}
