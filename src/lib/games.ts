import type { GameId } from "./types"

export type SlotsOutcome = {
  symbols: string[]
  won: boolean
  multiplier: number
}

export type RouletteColor = "rojo" | "negro"

export type RouletteOutcome = {
  choice: RouletteColor
  landed: RouletteColor
  number: number
  won: boolean
  multiplier: number
}

export type PlayingCard = {
  rank: string
  suit: "♠" | "♥" | "♦" | "♣"
  value: number
}

export type CardsOutcome = {
  playerCards: PlayingCard[]
  houseCards: PlayingCard[]
  player: number
  house: number
  won: boolean
  multiplier: number
}

export type CrashOutcome = {
  crashAt: number
  cashedAt: number | null
  won: boolean
  multiplier: number
}

export type GameOutcome =
  | { gameId: "slots"; detail: SlotsOutcome; payout: number }
  | { gameId: "roulette"; detail: RouletteOutcome; payout: number }
  | { gameId: "cards"; detail: CardsOutcome; payout: number }
  | { gameId: "crash"; detail: CrashOutcome; payout: number }

export const SLOT_SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "7️⃣"] as const

export const ROULETTE_REDS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
])

export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]

const RANKS: { rank: string; value: number }[] = [
  { rank: "A", value: 11 },
  { rank: "2", value: 2 },
  { rank: "3", value: 3 },
  { rank: "4", value: 4 },
  { rank: "5", value: 5 },
  { rank: "6", value: 6 },
  { rank: "7", value: 7 },
  { rank: "8", value: 8 },
  { rank: "9", value: 9 },
  { rank: "10", value: 10 },
  { rank: "J", value: 10 },
  { rank: "Q", value: 10 },
  { rank: "K", value: 10 },
]

const SUITS: PlayingCard["suit"][] = ["♠", "♥", "♦", "♣"]

function randInt(max: number): number {
  return Math.floor(Math.random() * max)
}

function drawCard(): PlayingCard {
  const { rank, value } = RANKS[randInt(RANKS.length)]
  return { rank, suit: SUITS[randInt(SUITS.length)], value }
}

function handTotal(cards: PlayingCard[]): number {
  let total = cards.reduce((s, c) => s + c.value, 0)
  let aces = cards.filter((c) => c.rank === "A").length
  while (total > 21 && aces > 0) {
    total -= 10
    aces -= 1
  }
  return total
}

function dealHand(): { cards: PlayingCard[]; total: number } {
  const count = 2 + (Math.random() < 0.35 ? 1 : 0)
  const cards = Array.from({ length: count }, () => drawCard())
  return { cards, total: handTotal(cards) }
}

export function playSlots(amount: number): GameOutcome {
  const symbols = [
    SLOT_SYMBOLS[randInt(SLOT_SYMBOLS.length)],
    SLOT_SYMBOLS[randInt(SLOT_SYMBOLS.length)],
    SLOT_SYMBOLS[randInt(SLOT_SYMBOLS.length)],
  ]
  const counts = symbols.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})
  const maxSame = Math.max(...Object.values(counts))
  const won = maxSame >= 2
  const multiplier = maxSame === 3 ? 5 : won ? 2.5 : 0
  return {
    gameId: "slots",
    detail: { symbols, won, multiplier },
    payout: won ? Number((amount * multiplier).toFixed(2)) : 0,
  }
}

export function playRoulette(
  amount: number,
  choice: RouletteColor,
): GameOutcome {
  const number = randInt(37)
  const landed: RouletteColor =
    number === 0
      ? Math.random() < 0.5
        ? "rojo"
        : "negro"
      : ROULETTE_REDS.has(number)
        ? "rojo"
        : "negro"
  const won = number !== 0 && landed === choice
  return {
    gameId: "roulette",
    detail: { choice, landed, number, won, multiplier: won ? 2 : 0 },
    payout: won ? Number((amount * 2).toFixed(2)) : 0,
  }
}

export function playCards(amount: number): GameOutcome {
  const playerHand = dealHand()
  const houseHand = dealHand()
  const player = playerHand.total
  const house = houseHand.total
  const playerBust = player > 21
  const houseBust = house > 21
  const won =
    (!playerBust && houseBust) || (!playerBust && !houseBust && player > house)
  return {
    gameId: "cards",
    detail: {
      playerCards: playerHand.cards,
      houseCards: houseHand.cards,
      player,
      house,
      won,
      multiplier: won ? 2 : 0,
    },
    payout: won ? Number((amount * 2).toFixed(2)) : 0,
  }
}

/** Punto de crash aleatorio (distribución simple) */
export function randomCrashPoint(): number {
  const r = Math.random()
  if (r < 0.45) return Number((1 + Math.random() * 1.5).toFixed(2))
  if (r < 0.8) return Number((2.5 + Math.random() * 3).toFixed(2))
  return Number((5.5 + Math.random() * 20).toFixed(2))
}

export function playGame(
  gameId: Exclude<GameId, "crash">,
  amount: number,
  rouletteChoice?: RouletteColor,
): GameOutcome {
  if (gameId === "slots") return playSlots(amount)
  if (gameId === "roulette") return playRoulette(amount, rouletteChoice ?? "rojo")
  return playCards(amount)
}

export function playAnyGame(
  gameId: GameId,
  amount: number,
  opts?: { rouletteChoice?: RouletteColor },
): GameOutcome {
  if (gameId === "crash") {
    const crashAt = randomCrashPoint()
    return {
      gameId: "crash",
      detail: { crashAt, cashedAt: null, won: false, multiplier: 0 },
      payout: 0,
    }
  }
  return playGame(gameId, amount, opts?.rouletteChoice)
}

export function rouletteColor(n: number): "rojo" | "negro" | "verde" {
  if (n === 0) return "verde"
  return ROULETTE_REDS.has(n) ? "rojo" : "negro"
}
