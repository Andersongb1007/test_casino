import { LogOut, History, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useCasino } from "@/context/CasinoContext"
import type { WalletMovementType } from "@/lib/types"
import { formatMoney } from "@/lib/utils"

const LABELS: Record<WalletMovementType, string> = {
  inicio: "Inicio",
  entrada: "Entrada a juego",
  retiro: "Retiro a wallet",
  apuesta: "Apuesta",
  premio: "Premio",
  sin_premio: "Sin premio",
  ticket: "Compra de ticket",
  premio_loteria: "Premio lotería",
}

export function ProfileView() {
  const { user, logout } = useAuth()
  const { balance, movements, tickets, session, withdrawToWallet, resetWallet } =
    useCasino()

  const onLogout = () => {
    if (session) {
      withdrawToWallet()
    }
    logout()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>{user?.name}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
            <Button variant="destructive" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Saldo wallet</p>
            <p className="text-2xl font-semibold">{formatMoney(balance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tickets</p>
            <p className="text-2xl font-semibold">{tickets.length}</p>
          </div>
          {session && (
            <Badge variant="warning">
              Mesa abierta · retira antes de salir
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={Boolean(session)}
            onClick={resetWallet}
          >
            Reiniciar saldo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Historial de movimientos
          </CardTitle>
          <CardDescription>
            Entradas, retiros, tickets y premios de tu wallet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin movimientos aún.</p>
          ) : (
            <ul className="divide-y">
              {movements.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0"
                >
                  <div>
                    <p className="font-medium">{m.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {LABELS[m.type]} ·{" "}
                      {new Date(m.timestamp).toLocaleString("es-VE")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        m.amount > 0
                          ? "font-semibold text-success"
                          : m.amount < 0
                            ? "font-semibold text-amber-600"
                            : "font-semibold text-muted-foreground"
                      }
                    >
                      {m.type === "sin_premio"
                        ? "—"
                        : `${m.amount > 0 ? "+" : ""}${formatMoney(m.amount)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(m.balanceAfter)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
