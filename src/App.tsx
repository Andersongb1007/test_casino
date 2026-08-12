import { useState } from "react"
import { AuthProvider, useAuth } from "@/context/AuthContext"
import { CasinoProvider, useCasino } from "@/context/CasinoContext"
import { AuthScreen } from "@/components/AuthScreen"
import { WalletDropdown } from "@/components/WalletDropdown"
import { GameLobby, PendingEnter } from "@/components/GameLobby"
import { GamePanel } from "@/components/GamePanel"
import { CrashPanel } from "@/components/CrashPanel"
import { LotteryHub } from "@/components/LotteryHub"
import { ProfileView } from "@/components/ProfileView"
import { SessionBar } from "@/components/SessionBar"
import { Badge } from "@/components/ui/badge"
import { OPERATOR, type GameMeta, type PlatformSection } from "@/lib/types"
import { cn } from "@/lib/utils"

const NAV: { id: PlatformSection; label: string }[] = [
  { id: "casino", label: "Casino" },
  { id: "loteria", label: "Lotería" },
  { id: "perfil", label: "Mi perfil" },
]

function Shell() {
  const { user } = useAuth()
  const { activeRound, crashLive, session, section, setSection } = useCasino()
  const [pending, setPending] = useState<GameMeta | null>(null)
  const effectivePending = session ? null : pending

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            {OPERATOR}
          </p>
          <h1 className="text-2xl font-semibold md:text-3xl">
            Hola, {user?.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Casino, lotería venezolana y tu wallet en un solo lugar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(activeRound?.phase === "playing" || crashLive?.running) && (
            <Badge variant="warning">Jugada en curso</Badge>
          )}
          <WalletDropdown />
        </div>
      </header>

      {!session && (
        <nav className="flex flex-wrap gap-2">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSection(item.id)
                setPending(null)
              }}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition",
                section === item.id
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-secondary hover:bg-secondary/80",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}

      <SessionBar />

      {section === "casino" && (
        <>
          {!session && !effectivePending && (
            <GameLobby onPick={(g) => setPending(g)} />
          )}
          {effectivePending && (
            <PendingEnter
              game={effectivePending}
              onBack={() => setPending(null)}
            />
          )}
          {session?.gameId === "crash" && <CrashPanel />}
          {session && session.gameId !== "crash" && <GamePanel />}
        </>
      )}

      {section === "loteria" && !session && <LotteryHub />}
      {section === "perfil" && !session && <ProfileView />}

      {session && section !== "casino" && (
        <p className="text-center text-sm text-amber-700">
          Tienes una mesa abierta. Retira a wallet para cambiar de sección.
        </p>
      )}
    </div>
  )
}

function Gate() {
  const { user, ready } = useAuth()
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    )
  }
  if (!user) return <AuthScreen />
  return (
    <CasinoProvider>
      <Shell />
    </CasinoProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
