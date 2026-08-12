import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { GameVisual } from "@/components/GameVisual"
import { useCasino } from "@/context/CasinoContext"
import type { RouletteColor } from "@/lib/games"
import { GAME_LABELS } from "@/lib/types"
import { cn, formatMoney } from "@/lib/utils"
import { IMAGES } from "@/lib/images"

export function GamePanel() {
  const { session, activeRound, lastResult, placeBet } = useCasino()
  const [amount, setAmount] = useState("100")
  const [choice, setChoice] = useState<RouletteColor>("rojo")
  const [error, setError] = useState<string | null>(null)

  if (!session || session.gameId === "crash") return null

  const activeGame = session.gameId
  const playing = activeRound?.phase === "playing"
  const displayOutcome = activeRound?.outcome ?? lastResult?.outcome ?? null
  const won = displayOutcome ? displayOutcome.payout > 0 : false
  const showLastBanner = !playing && Boolean(lastResult?.outcome)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{GAME_LABELS[activeGame]}</CardTitle>
            <CardDescription>
              Quédate en la mesa y apuesta varias veces. Retira cuando quieras.
            </CardDescription>
          </div>
          {playing && <Badge variant="warning">Jugando…</Badge>}
          {showLastBanner && (
            <Badge variant={won ? "success" : "destructive"}>
              {won ? "Ganaste" : "Perdiste"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <GameVisual
          gameId={activeGame}
          outcome={displayOutcome}
          playing={playing}
          choice={choice}
        />

        {showLastBanner && lastResult?.outcome && (
          <div
            className={cn(
              "flex items-center gap-4 rounded-xl border p-4",
              won
                ? "border-success/40 bg-success/10"
                : "border-destructive/40 bg-destructive/10",
            )}
          >
            <img
              src={won ? IMAGES.walletWin : IMAGES.walletLose}
              alt=""
              className="h-14 w-14 rounded-lg object-cover shadow"
            />
            <div>
              <p className="font-semibold">
                {won
                  ? `+${formatMoney(lastResult.outcome.payout)} a tus fichas`
                  : "Sin premio en esta jugada"}
              </p>
              <p className="text-sm text-muted-foreground">
                Sigue jugando o retira a tu wallet.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="bet-amount">Monto</Label>
          <Input
            id="bet-amount"
            type="number"
            min={1}
            value={amount}
            disabled={playing}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Fichas: {formatMoney(session.sessionBalance)}
          </p>
        </div>

        {activeGame === "roulette" && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={choice === "rojo" ? "destructive" : "outline"}
              disabled={playing}
              onClick={() => setChoice("rojo")}
            >
              Rojo
            </Button>
            <Button
              type="button"
              variant={choice === "negro" ? "default" : "outline"}
              className={choice === "negro" ? "bg-slate-800 hover:bg-slate-700" : ""}
              disabled={playing}
              onClick={() => setChoice("negro")}
            >
              Negro
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          className="w-full"
          size="lg"
          disabled={playing}
          onClick={() => setError(placeBet(Number(amount), { rouletteChoice: choice }))}
        >
          {playing ? "Jugada en curso…" : "Apostar"}
        </Button>
      </CardContent>
    </Card>
  )
}
