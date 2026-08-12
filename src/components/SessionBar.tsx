import { useState } from "react"
import { Wallet, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useCasino } from "@/context/CasinoContext"
import { GAME_LABELS } from "@/lib/types"
import { formatMoney } from "@/lib/utils"

export function SessionBar() {
  const { session, balance, activeRound, crashLive, topUpSession, withdrawToWallet } =
    useCasino()
  const [topUp, setTopUp] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [showTopUp, setShowTopUp] = useState(false)
  const [showCedula, setShowCedula] = useState(false)
  const [cedula, setCedula] = useState("")

  if (!session) return null

  const busy = activeRound?.phase === "playing" || Boolean(crashLive?.running)

  const confirmWithdraw = () => {
    const digits = cedula.replace(/\D/g, "")
    if (digits.length < 6) {
      setMsg("Ingresa tu cédula")
      return
    }
    const err = withdrawToWallet(digits)
    setMsg(err)
    if (!err) {
      setShowCedula(false)
      setCedula("")
    }
  }

  return (
    <div className="sticky top-2 z-30 space-y-2 rounded-xl border border-primary/20 bg-card/95 p-3 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            En mesa · {GAME_LABELS[session.gameId]}
          </p>
          <p className="text-xl font-semibold">
            Fichas: {formatMoney(session.sessionBalance)}
          </p>
          <p className="text-xs text-muted-foreground">
            Wallet: {formatMoney(balance)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {busy && <Badge variant="warning">Jugada…</Badge>}
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setShowTopUp((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            Recargar
          </Button>
          <Button
            variant="success"
            size="sm"
            disabled={busy}
            onClick={() => {
              setMsg(null)
              setShowCedula(true)
            }}
          >
            <Wallet className="h-4 w-4" />
            Retirar a wallet
          </Button>
        </div>
      </div>
      {showTopUp && (
        <div className="flex flex-wrap items-end gap-2 border-t pt-2">
          <Input
            type="number"
            min={1}
            className="w-32"
            value={topUp}
            disabled={busy}
            onChange={(e) => setTopUp(e.target.value)}
          />
          <Button
            size="sm"
            disabled={busy}
            onClick={() => {
              const err = topUpSession(Number(topUp))
              setMsg(err)
              if (!err) setShowTopUp(false)
            }}
          >
            Traer de wallet
          </Button>
        </div>
      )}
      {showCedula && (
        <div className="space-y-2 border-t pt-3">
          <Label htmlFor="cedula-retiro">Cédula para retirar</Label>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              id="cedula-retiro"
              inputMode="numeric"
              placeholder="V-12345678"
              className="w-44"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
            />
            <Button size="sm" onClick={confirmWithdraw}>
              Confirmar retiro
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowCedula(false)
                setMsg(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {msg && <p className="text-sm text-destructive">{msg}</p>}
    </div>
  )
}
