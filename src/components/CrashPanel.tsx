import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useCasino } from "@/context/CasinoContext"
import { cn, formatMoney } from "@/lib/utils"

export function CrashPanel() {
  const {
    session,
    crashLive,
    lastResult,
    startCrash,
    cashOutCrash,
    crashBusted,
  } = useCasino()
  const [amount, setAmount] = useState("100")
  const [mult, setMult] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!crashLive?.running) {
      setMult(1)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000
      const current = Number((1 + elapsed * 0.55).toFixed(2))
      if (current >= crashLive.crashAt) {
        setMult(crashLive.crashAt)
        crashBusted()
        return
      }
      setMult(current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [crashLive, crashBusted])

  if (!session || session.gameId !== "crash") return null

  const running = Boolean(crashLive?.running)
  const last = lastResult?.outcome?.gameId === "crash" ? lastResult.outcome : null

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Crash</CardTitle>
            <CardDescription>
              El multiplicador sube. Cobra antes del crash.
            </CardDescription>
          </div>
          {running && <Badge variant="warning">En vivo</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={cn(
            "flex h-48 flex-col items-center justify-center rounded-2xl border text-center",
            running
              ? "border-amber-400 bg-slate-950 text-amber-300"
              : last?.detail.won
                ? "border-success/40 bg-success/10"
                : "bg-slate-900 text-white",
          )}
        >
          <p className="text-xs uppercase tracking-widest opacity-70">
            Multiplicador
          </p>
          <p className="text-6xl font-bold tabular-nums">
            {running ? `${mult.toFixed(2)}x` : last ? `${(last.detail.cashedAt ?? last.detail.crashAt).toFixed(2)}x` : "1.00x"}
          </p>
          {running && <p className="mt-2 text-sm text-amber-200/80">Cobra ahora</p>}
          {!running && last && (
            <p className="mt-2 text-sm">
              {last.detail.won
                ? `Cobraste a ${last.detail.cashedAt?.toFixed(2)}x`
                : `Crash en ${last.detail.crashAt.toFixed(2)}x`}
            </p>
          )}
        </div>

        {!running && (
          <>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Fichas: {formatMoney(session.sessionBalance)}
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="w-full"
              size="lg"
              onClick={() => setError(startCrash(Number(amount)))}
            >
              Apostar
            </Button>
          </>
        )}

        {running && crashLive && (
          <Button
            className="w-full"
            size="lg"
            variant="success"
            onClick={() => setError(cashOutCrash(mult))}
          >
            Cobrar {formatMoney(crashLive.amount * mult)}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
