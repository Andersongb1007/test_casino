import type { ReactNode } from "react"
import {
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CircleDollarSign,
  LogIn,
  Wallet,
  Ticket,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/context/AuthContext"
import { useCasino } from "@/context/CasinoContext"
import type { WalletMovementType } from "@/lib/types"
import { cn, formatMoney } from "@/lib/utils"
import { IMAGES } from "@/lib/images"

const TYPE_META: Record<WalletMovementType, { icon: ReactNode; tone: string }> = {
  apuesta: {
    icon: <ArrowUpRight className="h-4 w-4" />,
    tone: "text-amber-600 bg-amber-500/10",
  },
  premio: {
    icon: <ArrowDownLeft className="h-4 w-4" />,
    tone: "text-success bg-success/10",
  },
  sin_premio: {
    icon: <Ban className="h-4 w-4" />,
    tone: "text-destructive bg-destructive/10",
  },
  inicio: {
    icon: <CircleDollarSign className="h-4 w-4" />,
    tone: "text-primary bg-primary/10",
  },
  entrada: {
    icon: <LogIn className="h-4 w-4" />,
    tone: "text-blue-600 bg-blue-500/10",
  },
  retiro: {
    icon: <Wallet className="h-4 w-4" />,
    tone: "text-success bg-success/10",
  },
  ticket: {
    icon: <Ticket className="h-4 w-4" />,
    tone: "text-violet-600 bg-violet-500/10",
  },
  premio_loteria: {
    icon: <ArrowDownLeft className="h-4 w-4" />,
    tone: "text-success bg-success/10",
  },
}

export function WalletDropdown() {
  const { user } = useAuth()
  const { balance, movements, setSection } = useCasino()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-auto gap-3 border-primary/20 bg-card px-3 py-2 shadow-sm"
        >
          <img
            src={IMAGES.walletWin}
            alt=""
            className="h-9 w-9 rounded-md object-cover"
          />
          <div className="text-left">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {user?.name ?? "Wallet"}
            </p>
            <p className="text-lg font-semibold leading-none">{formatMoney(balance)}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[24rem]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Últimos movimientos</span>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setSection("perfil")}
          >
            Ver historial
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {movements.slice(0, 8).map((m) => {
          const meta = TYPE_META[m.type]
          return (
            <DropdownMenuItem key={m.id} className="flex-col items-stretch gap-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full",
                      meta.tone,
                    )}
                  >
                    {meta.icon}
                  </span>
                  <div>
                    <p className="font-medium">{m.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.timestamp).toLocaleTimeString("es-VE")}
                    </p>
                  </div>
                </div>
                <p
                  className={cn(
                    "font-semibold",
                    m.amount > 0 && "text-success",
                    m.amount < 0 && "text-amber-600",
                  )}
                >
                  {m.type === "sin_premio"
                    ? "—"
                    : `${m.amount > 0 ? "+" : ""}${formatMoney(m.amount)}`}
                </p>
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
