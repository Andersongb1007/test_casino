import { IMAGES } from "@/lib/images"

export type GameId = "slots" | "roulette" | "cards" | "crash"
export type PlatformSection = "casino" | "loteria" | "perfil"
export type LotteryKind = "animalitos" | "dupleta" | "tripleta" | "quiniela"

export type WalletMovementType =
  | "inicio"
  | "entrada"
  | "retiro"
  | "apuesta"
  | "premio"
  | "sin_premio"
  | "ticket"
  | "premio_loteria"

export type WalletMovement = {
  id: string
  type: WalletMovementType
  amount: number
  balanceAfter: number
  gameId: GameId | null
  huc: string | null
  label: string
  timestamp: string
}

export type TicketStatus = "Pendiente" | "Premiado" | "No premiado"

export type LotteryTicket = {
  id: string
  code: string
  kind: LotteryKind
  productName: string
  drawLabel: string
  drawTime: string
  selection: string
  selectionDetail: string
  amount: number
  payout: number
  status: TicketStatus
  drawnResult: string | null
  createdAt: string
  settledAt: string | null
  /** Campos internos BetLink — no mostrar en UI */
  externalTicketKey?: string | null
  betlinkTicketId?: string | null
  betlinkHuc?: string | null
  betlinkSerial?: string | null
  betlinkTicketNumber?: string | null
}

export type GameSessionData = {
  gameId: GameId
  sessionBalance: number
  enteredAmount: number
  betlinkTicketId?: string | null
  betlinkHuc?: string | null
  betlinkSerial?: string | null
  betlinkExternalKey?: string | null
}

export type UserAccount = {
  id: string
  name: string
  email: string
  password: string
  balance: number
  movements: WalletMovement[]
  gameSession: GameSessionData | null
  tickets: LotteryTicket[]
}

export type GameMeta = {
  id: GameId
  section: "casino"
  name: string
  description: string
  image: string
}

export const CASINO_GAMES: GameMeta[] = [
  {
    id: "slots",
    section: "casino",
    name: "Tragamonedas",
    description: "Gira los carretes y apunta a la línea ganadora",
    image: IMAGES.gameSlots,
  },
  {
    id: "roulette",
    section: "casino",
    name: "Ruleta",
    description: "Apuesta a rojo o negro y mira la rueda",
    image: IMAGES.gameRoulette,
  },
  {
    id: "cards",
    section: "casino",
    name: "Cartas",
    description: "Mano contra la casa. Mayor sin pasarse gana",
    image: IMAGES.gameCards,
  },
  {
    id: "crash",
    section: "casino",
    name: "Crash",
    description: "Multiplicador en subida. Cobra antes del crash",
    image: IMAGES.casinoHero,
  },
]

export const ALL_GAMES = CASINO_GAMES
export const GAMES = CASINO_GAMES

export const OPERATOR = "PlayZone"
export const INITIAL_BALANCE = 100_000

export const GAME_LABELS: Record<GameId, string> = {
  slots: "Tragamonedas",
  roulette: "Ruleta",
  cards: "Cartas",
  crash: "Crash",
}
