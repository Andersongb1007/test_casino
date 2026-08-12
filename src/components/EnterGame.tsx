import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCasino } from "@/context/CasinoContext"
import type { GameMeta } from "@/lib/types"
import { formatMoney } from "@/lib/utils"

export function EnterGame({ game }: { game: GameMeta }) {
  const { balance, enterGame } = useCasino()
  const [buyIn, setBuyIn] = useState("")
  const [error, setError] = useState<string | null>(null)

  const onEnter = () => {
    setError(enterGame(game.id, Number(buyIn)))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar a {game.name}</CardTitle>
        <CardDescription>
          Cargas fichas desde tu wallet. Dentro del juego apuestas varias veces y al
          final retiras a la wallet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-xl">
          <img src={game.image} alt={game.name} className="h-40 w-full object-cover" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="buy-in">Monto a llevar al juego</Label>
          <Input
            id="buy-in"
            type="number"
            min={1}
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Wallet disponible: {formatMoney(balance)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1000, 5000, 10000, 25000].map((n) => (
            <Button key={n} type="button" variant="outline" size="sm" onClick={() => setBuyIn(String(n))}>
              {formatMoney(n)}
            </Button>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" size="lg" onClick={onEnter}>
          Entrar con {formatMoney(Number(buyIn) || 0)}
        </Button>
      </CardContent>
    </Card>
  )
}
