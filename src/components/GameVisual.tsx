import { useEffect, useMemo, useState } from "react"
import {
  SLOT_SYMBOLS,
  WHEEL_ORDER,
  rouletteColor,
  type GameOutcome,
  type PlayingCard,
  type RouletteColor,
} from "@/lib/games"
import type { GameId } from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  gameId: GameId
  outcome: GameOutcome | null
  playing: boolean
  choice?: RouletteColor
}

export function GameVisual({ gameId, outcome, playing, choice = "rojo" }: Props) {
  if (gameId === "crash") return null

  if (gameId === "slots") {
    return (
      <SlotsBoard
        playing={playing}
        symbols={
          outcome?.gameId === "slots" ? outcome.detail.symbols : null
        }
        won={outcome?.gameId === "slots" ? outcome.detail.won : false}
        showResult={!playing && Boolean(outcome)}
      />
    )
  }

  if (gameId === "roulette") {
    return (
      <RouletteBoard
        playing={playing}
        number={outcome?.gameId === "roulette" ? outcome.detail.number : null}
        landed={outcome?.gameId === "roulette" ? outcome.detail.landed : null}
        choice={
          outcome?.gameId === "roulette" ? outcome.detail.choice : choice
        }
        won={outcome?.gameId === "roulette" ? outcome.detail.won : false}
        showResult={!playing && Boolean(outcome)}
      />
    )
  }

  return (
    <CardsBoard
      playing={playing}
      outcome={outcome?.gameId === "cards" ? outcome.detail : null}
      showResult={!playing && Boolean(outcome)}
    />
  )
}

/* ───────────────── SLOTS ───────────────── */

function SlotsBoard({
  playing,
  symbols,
  won,
  showResult,
}: {
  playing: boolean
  symbols: string[] | null
  won: boolean
  showResult: boolean
}) {
  const [reels, setReels] = useState(["🍒", "🍋", "🔔"])
  const [stopped, setStopped] = useState([true, true, true])

  useEffect(() => {
    if (!playing || !symbols) {
      if (symbols) {
        setReels(symbols)
        setStopped([true, true, true])
      }
      return
    }

    setStopped([false, false, false])
    const spin = window.setInterval(() => {
      setReels([
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      ])
    }, 80)

    const t1 = window.setTimeout(() => {
      setReels((r) => [symbols[0], r[1], r[2]])
      setStopped([true, false, false])
    }, 1200)
    const t2 = window.setTimeout(() => {
      setReels((r) => [symbols[0], symbols[1], r[2]])
      setStopped([true, true, false])
    }, 2000)
    const t3 = window.setTimeout(() => {
      setReels(symbols)
      setStopped([true, true, true])
      window.clearInterval(spin)
    }, 2800)

    return () => {
      window.clearInterval(spin)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [playing, symbols])

  return (
    <div className="overflow-hidden rounded-2xl border-4 border-amber-500/80 bg-gradient-to-b from-slate-800 to-slate-950 p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="rounded bg-amber-400 px-2 py-0.5 text-xs font-bold text-slate-900">
          SLOTS
        </span>
        <span className="text-xs text-amber-200/80">3 carretes · premio al azar</span>
      </div>

      <div className="relative rounded-xl bg-black/40 p-3 ring-2 ring-amber-400/40">
        <div className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-0.5 -translate-y-1/2 bg-amber-400/70" />
        <div className="grid grid-cols-3 gap-2">
          {reels.map((s, i) => (
            <div
              key={i}
              className={cn(
                "relative flex h-28 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-white to-slate-100 text-5xl shadow-inner",
                !stopped[i] && "animate-reel-blur",
                showResult && won && "ring-2 ring-amber-400 animate-win-pulse",
              )}
            >
              <span className={cn(!stopped[i] && "scale-110")}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {SLOT_SYMBOLS.map((s) => (
          <span
            key={s}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-lg"
          >
            {s}
          </span>
        ))}
      </div>

      {showResult && (
        <p
          className={cn(
            "mt-3 text-center text-sm font-semibold",
            won ? "text-amber-300" : "text-slate-300",
          )}
        >
          {won ? "¡Línea ganadora!" : "Sin línea · prueba otra vez"}
        </p>
      )}
      {!playing && !showResult && (
        <p className="mt-3 text-center text-sm text-slate-400">
          Apuesta para girar los carretes
        </p>
      )}
    </div>
  )
}

/* ───────────────── ROULETTE ───────────────── */

function RouletteBoard({
  playing,
  number,
  landed,
  choice,
  won,
  showResult,
}: {
  playing: boolean
  number: number | null
  landed: RouletteColor | null
  choice: RouletteColor
  won: boolean
  showResult: boolean
}) {
  const wheelBg = useMemo(() => {
    const slice = 360 / WHEEL_ORDER.length
    const parts = WHEEL_ORDER.map((n, i) => {
      const color =
        n === 0 ? "#16a34a" : rouletteColor(n) === "rojo" ? "#dc2626" : "#0f172a"
      const start = i * slice
      const end = (i + 1) * slice
      return `${color} ${start}deg ${end}deg`
    })
    return `conic-gradient(from -90deg, ${parts.join(", ")})`
  }, [])

  const targetAngle = useMemo(() => {
    if (number === null) return 0
    const idx = WHEEL_ORDER.indexOf(number)
    const slice = 360 / WHEEL_ORDER.length
    // pointer at top; rotate so that segment center lands under pointer
    return 360 * 5 + (360 - (idx * slice + slice / 2))
  }, [number])

  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    if (playing && number !== null) {
      setRotation(0)
      const id = requestAnimationFrame(() => setRotation(targetAngle))
      return () => cancelAnimationFrame(id)
    }
    if (showResult && number !== null) {
      setRotation(targetAngle)
    }
  }, [playing, number, targetAngle, showResult])

  return (
    <div className="rounded-2xl border bg-emerald-950 p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded bg-emerald-500 px-2 py-0.5 text-xs font-bold text-white">
          RULETA
        </span>
        <div className="flex items-center gap-2 text-xs text-emerald-100">
          <span>Tu color:</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-semibold uppercase",
              choice === "rojo" ? "bg-red-600 text-white" : "bg-slate-900 text-white",
            )}
          >
            {choice}
          </span>
        </div>
      </div>

      <div className="relative mx-auto h-56 w-56">
        {/* pointer */}
        <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
          <div className="h-0 w-0 border-l-[10px] border-r-[10px] border-t-[18px] border-l-transparent border-r-transparent border-t-amber-300 drop-shadow" />
        </div>

        <div
          className="absolute inset-0 rounded-full border-4 border-amber-400 shadow-2xl"
          style={{
            background: wheelBg,
            transform: `rotate(${rotation}deg)`,
            transition: playing
              ? "transform 3s cubic-bezier(0.12, 0.75, 0.15, 1)"
              : "none",
          }}
        >
          <div className="absolute inset-[28%] rounded-full border-2 border-amber-300/50 bg-emerald-900 shadow-inner" />
          <div className="absolute inset-[42%] rounded-full bg-amber-400" />
        </div>

        {/* ball hint on result */}
        {showResult && number !== null && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={cn(
                "z-30 flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white shadow-lg animate-pop ring-4",
                number === 0
                  ? "bg-green-600 ring-green-300"
                  : landed === "rojo"
                    ? "bg-red-600 ring-red-300"
                    : "bg-slate-900 ring-slate-300",
              )}
            >
              {number}
            </div>
          </div>
        )}
      </div>

      {/* color chips row */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div
          className={cn(
            "rounded-lg border-2 p-3 text-center text-sm font-semibold text-white",
            choice === "rojo" ? "border-amber-300 bg-red-600" : "border-transparent bg-red-700/60",
          )}
        >
          ROJO
        </div>
        <div
          className={cn(
            "rounded-lg border-2 p-3 text-center text-sm font-semibold text-white",
            choice === "negro" ? "border-amber-300 bg-slate-900" : "border-transparent bg-slate-800/60",
          )}
        >
          NEGRO
        </div>
      </div>

      {playing && (
        <p className="mt-3 text-center text-sm text-emerald-100 animate-pulse">
          La bola está girando…
        </p>
      )}
      {showResult && landed && (
        <p
          className={cn(
            "mt-3 text-center text-sm font-semibold",
            won ? "text-amber-300" : "text-emerald-100",
          )}
        >
          Cayó {number} ({landed}) · {won ? "¡Acertaste el color!" : "No coincidió"}
        </p>
      )}
      {!playing && !showResult && (
        <p className="mt-3 text-center text-sm text-emerald-200/70">
          Elige color, apuesta y mira la rueda
        </p>
      )}
    </div>
  )
}

/* ───────────────── CARDS ───────────────── */

function PlayingCardView({
  card,
  faceDown,
  delay = 0,
}: {
  card?: PlayingCard
  faceDown?: boolean
  delay?: number
}) {
  const red = card && (card.suit === "♥" || card.suit === "♦")

  if (faceDown || !card) {
    return (
      <div
        className="h-28 w-20 rounded-xl border-2 border-white/20 bg-[linear-gradient(135deg,#1e3a8a_25%,#1d4ed8_25%,#1d4ed8_50%,#1e3a8a_50%,#1e3a8a_75%,#1d4ed8_75%)] bg-[length:12px_12px] shadow-lg animate-deal"
        style={{ animationDelay: `${delay}ms` }}
      />
    )
  }

  return (
    <div
      className={cn(
        "relative flex h-28 w-20 flex-col justify-between rounded-xl border bg-white p-2 shadow-lg animate-deal",
        red ? "text-red-600" : "text-slate-900",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-left leading-none">
        <div className="text-lg font-bold">{card.rank}</div>
        <div className="text-base">{card.suit}</div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-90">
        {card.suit}
      </div>
      <div className="rotate-180 text-left leading-none">
        <div className="text-lg font-bold">{card.rank}</div>
        <div className="text-base">{card.suit}</div>
      </div>
    </div>
  )
}

function CardsBoard({
  playing,
  outcome,
  showResult,
}: {
  playing: boolean
  outcome: Extract<GameOutcome, { gameId: "cards" }>["detail"] | null
  showResult: boolean
}) {
  const [dealStep, setDealStep] = useState(0)

  useEffect(() => {
    if (!playing) {
      setDealStep(showResult ? 99 : 0)
      return
    }
    setDealStep(0)
    const timers = [400, 800, 1200, 1600, 2200].map((ms, i) =>
      window.setTimeout(() => setDealStep(i + 1), ms),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [playing, showResult])

  const playerCards = outcome?.playerCards ?? []
  const houseCards = outcome?.houseCards ?? []

  const showHouse = (i: number) =>
    showResult || (playing && dealStep > i + 1)
  const showPlayer = (i: number) =>
    showResult || (playing && dealStep > i)

  return (
    <div className="rounded-2xl border border-emerald-800 bg-[radial-gradient(ellipse_at_center,_#166534_0%,_#052e16_70%)] p-4 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded bg-emerald-400 px-2 py-0.5 text-xs font-bold text-emerald-950">
          CARTAS
        </span>
        <span className="text-xs text-emerald-100/80">Mesa · jugador vs casa</span>
      </div>

      {/* House */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-emerald-100">
          <span className="font-medium">Casa</span>
          {(showResult || dealStep >= 4) && outcome && (
            <span className="rounded-full bg-black/30 px-2 py-0.5 font-bold">
              {outcome.house}
            </span>
          )}
        </div>
        <div className="flex min-h-28 flex-wrap justify-center gap-2">
          {(houseCards.length ? houseCards : [undefined, undefined]).map((card, i) => (
            <PlayingCardView
              key={`h-${i}`}
              card={card}
              faceDown={!showHouse(i)}
              delay={i * 120}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto mb-6 h-px w-2/3 bg-emerald-400/30" />

      {/* Player */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-emerald-100">
          <span className="font-medium">Tú</span>
          {(showResult || dealStep >= 2) && outcome && (
            <span className="rounded-full bg-black/30 px-2 py-0.5 font-bold">
              {outcome.player}
            </span>
          )}
        </div>
        <div className="flex min-h-28 flex-wrap justify-center gap-2">
          {(playerCards.length ? playerCards : [undefined, undefined]).map((card, i) => (
            <PlayingCardView
              key={`p-${i}`}
              card={card}
              faceDown={playing ? !showPlayer(i) : !card}
              delay={i * 120}
            />
          ))}
        </div>
      </div>

      {playing && (
        <p className="mt-4 text-center text-sm text-emerald-100 animate-pulse">
          Repartiendo cartas…
        </p>
      )}
      {showResult && outcome && (
        <p
          className={cn(
            "mt-4 text-center text-sm font-semibold",
            outcome.won ? "text-amber-300" : "text-emerald-100",
          )}
        >
          {outcome.won
            ? `Ganaste ${outcome.player} vs ${outcome.house}`
            : `Perdiste ${outcome.player} vs ${outcome.house}`}
        </p>
      )}
      {!playing && !showResult && (
        <p className="mt-4 text-center text-sm text-emerald-200/70">
          Apuesta para repartir la mano
        </p>
      )}
    </div>
  )
}
