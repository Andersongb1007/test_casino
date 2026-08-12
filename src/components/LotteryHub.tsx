import { useMemo, useState } from "react"
import { Clock, Ticket, X, Printer, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useCasino } from "@/context/CasinoContext"
import {
  ANIMAL_BRANDS,
  ANIMALITOS,
  ANIMALITOS_PAYOUT,
  DRAW_HOURS,
  DUPLETA_PAYOUT,
  NUMBER_BRANDS,
  NUMBER_MODALITIES,
  NUMBER_TURNS,
  getAnimalitoByCode,
  nextDrawSuggestion,
} from "@/lib/lottery"
import type { LotteryTicket } from "@/lib/types"
import { cn, formatMoney } from "@/lib/utils"
import { IMAGES } from "@/lib/images"

const QUICK_AMOUNTS = [50, 100, 500, 1000]

export function LotteryHub() {
  const [tab, setTab] = useState<"animalitos" | "cifras" | "tickets">("animalitos")
  const [ticket, setTicket] = useState<LotteryTicket | null>(null)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border shadow-sm">
        <img
          src={IMAGES.animalitosHero}
          alt="Lotería"
          className="h-36 w-full object-cover md:h-44"
        />
      </div>

      <div className="flex gap-1 rounded-xl bg-secondary p-1">
        {(
          [
            ["animalitos", "Animalitos"],
            ["cifras", "Cifras"],
            ["tickets", "Tickets"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
              tab === id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "animalitos" && <AnimalitosPlay onTicket={setTicket} />}
      {tab === "cifras" && <CifrasPlay onTicket={setTicket} />}
      {tab === "tickets" && <TicketsList onOpen={setTicket} />}

      {ticket && (
        <TicketModal
          ticketId={ticket.id}
          onClose={() => setTicket(null)}
          onAgain={() => setTicket(null)}
        />
      )}
    </div>
  )
}

function AnimalitosPlay({ onTicket }: { onTicket: (t: LotteryTicket) => void }) {
  const { balance, buyAnimalitosTicket } = useCasino()
  const [brandId, setBrandId] = useState(ANIMAL_BRANDS[0].id)
  const [drawTime, setDrawTime] = useState(nextDrawSuggestion())
  const [mode, setMode] = useState<"simple" | "dupleta">("simple")
  const [animalA, setAnimalA] = useState("11")
  const [animalB, setAnimalB] = useState("10")
  const [picking, setPicking] = useState<"A" | "B">("A")
  const [amount, setAmount] = useState("100")
  const [error, setError] = useState<string | null>(null)

  const a = getAnimalitoByCode(animalA)
  const b = getAnimalitoByCode(animalB)
  const brand = ANIMAL_BRANDS.find((x) => x.id === brandId)!
  const possibleWin =
    Number(amount || 0) * (mode === "dupleta" ? DUPLETA_PAYOUT : ANIMALITOS_PAYOUT)

  const onSelectAnimal = (code: string) => {
    if (mode === "dupleta" && picking === "B") setAnimalB(code)
    else setAnimalA(code)
  }

  const onPlay = () => {
    const res = buyAnimalitosTicket({
      brandId,
      drawTime,
      animalCode: animalA,
      animalCodeB: mode === "dupleta" ? animalB : undefined,
      amount: Number(amount),
      mode,
    })
    setError(res.error)
    if (res.ticket) onTicket(res.ticket)
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Top: lotería + hora */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-amber-50/80 px-3 py-3">
        <select
          className="h-10 rounded-lg border bg-white px-3 text-sm font-semibold"
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
        >
          {ANIMAL_BRANDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <select
            className="h-10 rounded-lg border bg-white px-3 text-sm font-semibold text-foreground"
            value={drawTime}
            onChange={(e) => setDrawTime(e.target.value)}
          >
            {DRAW_HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex rounded-lg bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setMode("simple")
              setPicking("A")
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold",
              mode === "simple" ? "bg-primary text-primary-foreground" : "",
            )}
          >
            Simple {ANIMALITOS_PAYOUT}x
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("dupleta")
              setPicking("A")
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold",
              mode === "dupleta" ? "bg-primary text-primary-foreground" : "",
            )}
          >
            Dupleta {DUPLETA_PAYOUT}x
          </button>
        </div>
      </div>

      {/* Selected preview */}
      <div className="flex items-center justify-center gap-4 bg-gradient-to-b from-amber-50 to-card px-4 py-5">
        <SelectedAnimal animal={a} label={mode === "dupleta" ? "1º" : "Tu jugada"} active={picking === "A"} onClick={() => setPicking("A")} />
        {mode === "dupleta" && (
          <>
            <span className="text-2xl font-bold text-muted-foreground">+</span>
            <SelectedAnimal animal={b} label="2º" active={picking === "B"} onClick={() => setPicking("B")} />
          </>
        )}
      </div>

      {mode === "dupleta" && (
        <p className="px-4 pb-2 text-center text-xs text-muted-foreground">
          Toca 1º o 2º y luego elige en la grilla
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-4 gap-2 p-3 sm:grid-cols-6 md:grid-cols-8">
        {ANIMALITOS.map((item) => {
          const selected =
            item.code === animalA || (mode === "dupleta" && item.code === animalB)
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => onSelectAnimal(item.code)}
              className={cn(
                "flex flex-col items-center rounded-xl border bg-white p-2 transition hover:border-amber-400 hover:shadow-sm",
                selected && "border-amber-500 bg-amber-50 ring-2 ring-amber-400/40",
              )}
            >
              <span className="text-2xl leading-none">{item.emoji}</span>
              <span className="mt-1 font-mono text-xs font-bold">{item.code}</span>
              <span className="line-clamp-1 text-[10px] text-muted-foreground">
                {item.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Sticky bet bar */}
      <div className="sticky bottom-0 space-y-3 border-t bg-card/95 p-4 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(String(n))}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-semibold",
                Number(amount) === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-secondary",
              )}
            >
              Bs. {n}
            </button>
          ))}
          <Input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 w-24"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p className="text-muted-foreground">
              {brand.name} · {drawTime} · saldo {formatMoney(balance)}
            </p>
            <p className="font-semibold text-success">
              Posible premio {formatMoney(possibleWin || 0)}
            </p>
          </div>
          <Button size="lg" className="min-w-40" onClick={onPlay}>
            Jugar
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}

function SelectedAnimal({
  animal,
  label,
  active,
  onClick,
}: {
  animal: ReturnType<typeof getAnimalitoByCode>
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-28 flex-col items-center rounded-2xl border-2 bg-white px-4 py-3 shadow-sm transition",
        active ? "border-primary ring-2 ring-primary/20" : "border-transparent",
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-5xl leading-none">{animal.emoji}</span>
      <span className="mt-1 font-mono text-lg font-bold">{animal.code}</span>
      <span className="text-sm font-medium">{animal.name}</span>
    </button>
  )
}

function CifrasPlay({ onTicket }: { onTicket: (t: LotteryTicket) => void }) {
  const { balance, buyNumberTicket } = useCasino()
  const [brandId, setBrandId] = useState(NUMBER_BRANDS[0].id)
  const [turnId, setTurnId] = useState(NUMBER_TURNS[0].id)
  const [modalityId, setModalityId] = useState(NUMBER_MODALITIES[0].id)
  const [pick, setPick] = useState("")
  const [amount, setAmount] = useState("100")
  const [error, setError] = useState<string | null>(null)

  const modality = useMemo(
    () => NUMBER_MODALITIES.find((m) => m.id === modalityId)!,
    [modalityId],
  )
  const turn = NUMBER_TURNS.find((t) => t.id === turnId)!
  const brand = NUMBER_BRANDS.find((b) => b.id === brandId)!
  const possibleWin = Number(amount || 0) * modality.payout

  const pushDigit = (d: string) => {
    setPick((prev) => (prev + d).slice(0, modality.digits))
  }
  const backspace = () => setPick((prev) => prev.slice(0, -1))
  const randomPick = () => {
    let s = ""
    for (let i = 0; i < modality.digits; i++) s += Math.floor(Math.random() * 10)
    setPick(s)
  }

  const onPlay = () => {
    const res = buyNumberTicket({
      brandId,
      turnId,
      modalityId,
      pick,
      amount: Number(amount),
    })
    setError(res.error)
    if (res.ticket) onTicket(res.ticket)
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50 px-3 py-3">
        <select
          className="h-10 rounded-lg border bg-white px-3 text-sm font-semibold"
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
        >
          {NUMBER_BRANDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-lg border bg-white px-3 text-sm font-semibold"
          value={turnId}
          onChange={(e) => setTurnId(e.target.value)}
        >
          {NUMBER_TURNS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} {t.time}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-3">
        {NUMBER_MODALITIES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setModalityId(m.id)
              setPick("")
            }}
            className={cn(
              "rounded-xl border p-3 text-left transition",
              modalityId === m.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "hover:border-primary/30",
            )}
          >
            <p className="font-semibold">{m.name}</p>
            <p className="text-xs text-muted-foreground">{m.payout}x</p>
          </button>
        ))}
      </div>

      <div className="px-4 py-6 text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Tu número · {modality.digits} dígitos
        </p>
        <p className="mt-2 font-mono text-5xl font-bold tracking-[0.25em] text-foreground">
          {pick.padEnd(modality.digits, "–")}
        </p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={randomPick}>
          <Sparkles className="h-4 w-4" />
          Al azar
        </Button>
      </div>

      <div className="mx-auto grid max-w-xs grid-cols-3 gap-2 px-4 pb-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) =>
          key === "" ? (
            <div key="empty" />
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => (key === "⌫" ? backspace() : pushDigit(key))}
              className="h-14 rounded-xl border bg-secondary text-xl font-semibold transition hover:bg-secondary/70 active:scale-95"
            >
              {key}
            </button>
          ),
        )}
      </div>

      <div className="sticky bottom-0 space-y-3 border-t bg-card/95 p-4 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(String(n))}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-semibold",
                Number(amount) === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-secondary",
              )}
            >
              Bs. {n}
            </button>
          ))}
          <Input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 w-24"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p className="text-muted-foreground">
              {brand.name} · {turn.label} · saldo {formatMoney(balance)}
            </p>
            <p className="font-semibold text-success">
              Posible premio {formatMoney(possibleWin || 0)}
            </p>
          </div>
          <Button
            size="lg"
            className="min-w-40"
            disabled={pick.length !== modality.digits}
            onClick={onPlay}
          >
            Jugar
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}

function TicketsList({ onOpen }: { onOpen: (t: LotteryTicket) => void }) {
  const { tickets } = useCasino()

  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card py-16 text-center">
        <Ticket className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 font-medium">Aún no tienes tickets</p>
        <p className="text-sm text-muted-foreground">
          Juega Animalitos o Cifras para generar uno.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tickets.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onOpen(t)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
        >
          <div>
            <p className="font-semibold">{t.productName}</p>
            <p className="text-sm text-muted-foreground">
              {t.selection} · {t.drawTime} · {t.code}
            </p>
          </div>
          <div className="text-right">
            <Badge
              variant={
                t.status === "Premiado"
                  ? "success"
                  : t.status === "Pendiente"
                    ? "warning"
                    : "destructive"
              }
            >
              {t.status}
            </Badge>
            <p className="mt-1 text-sm font-medium">{formatMoney(t.amount)}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

function TicketModal({
  ticketId,
  onClose,
  onAgain,
}: {
  ticketId: string
  onClose: () => void
  onAgain: () => void
}) {
  const { tickets, runTicketDraw } = useCasino()
  const ticket = tickets.find((t) => t.id === ticketId)
  if (!ticket) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-4 shadow-2xl animate-pop">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Tu ticket</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div
          id="ticket-print"
          className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-5 text-slate-900"
        >
          <div className="border-b border-dashed pb-3 text-center">
            <p className="text-xs uppercase tracking-widest text-slate-500">
              PlayZone
            </p>
            <p className="text-lg font-bold">{ticket.productName}</p>
            <p className="text-sm text-slate-600">{ticket.drawLabel}</p>
          </div>
          <div className="space-y-2 py-4 text-sm">
            <Row label="Ticket" value={ticket.code} mono />
            <Row label="Sorteo" value={ticket.drawTime} />
            <Row label="Jugada" value={ticket.selection} bold />
            <p className="text-center text-base">{ticket.selectionDetail}</p>
            <Row label="Monto" value={formatMoney(ticket.amount)} />
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Estado</span>
              <Badge
                variant={
                  ticket.status === "Premiado"
                    ? "success"
                    : ticket.status === "Pendiente"
                      ? "warning"
                      : "destructive"
                }
              >
                {ticket.status}
              </Badge>
            </div>
            {ticket.drawnResult && (
              <div className="rounded-lg bg-slate-100 p-3 text-center">
                <p className="text-xs text-slate-500">Resultado</p>
                <p className="text-xl font-bold">{ticket.drawnResult}</p>
                {ticket.status === "Premiado" && (
                  <p className="mt-1 font-semibold text-emerald-600">
                    Premio {formatMoney(ticket.payout)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {ticket.status === "Pendiente" && (
            <Button
              size="lg"
              onClick={() => runTicketDraw(ticket.id)}
            >
              Consultar resultado
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="secondary" onClick={onAgain}>
              Jugar otra
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
  bold,
}: {
  label: string
  value: string
  mono?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={cn(mono && "font-mono", bold && "font-bold")}>{value}</span>
    </div>
  )
}
