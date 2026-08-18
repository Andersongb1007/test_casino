import type { GameId } from "@/lib/types"
import { GAME_LABELS } from "@/lib/types"
import { formatVesAmount } from "./money"
import type { BettorPayload } from "./bettor"
import {
  BETLINK_OPERATOR_ID,
  eventDateLabel,
  newExternalKey,
  newSerial,
  newTicketNumber,
  nowVeIso,
  todayVeDate,
} from "./constants"

const CASINO_CODE: Record<GameId, string> = {
  slots: "SLOTS",
  roulette: "ROULETTE",
  cards: "BLACKJACK",
  crash: "CRASH",
}

/** Certifica el stake al entrar a mesa. amount = con cuánto ENTRÓ. */
export function mapCasinoIngest(opts: {
  gameId: GameId
  entroCon: number
  bettor: BettorPayload
}) {
  const drawDate = todayVeDate()
  const externalTicketKey = newExternalKey("CASINO")
  const serial = newSerial("CS")
  const ticketNumber = newTicketNumber("C")
  const code = CASINO_CODE[opts.gameId]

  return {
    operatorId: BETLINK_OPERATOR_ID,
    channel: "web",
    amount: opts.entroCon,
    currency: "VES",
    externalTicketKey,
    ticket: {
      ticketNumber,
      serial,
      issuedAt: nowVeIso(),
      bettor: opts.bettor,
      paymentMethod: "Saldo jugador",
    },
    selections: [
      {
        betType: "casino",
        amount: opts.entroCon,
        description: GAME_LABELS[opts.gameId],
        pickText: `MESA ${code}`,
        eventDateLabel: eventDateLabel(drawDate),
        casinoGameCode: code,
        casinoProvider: "PlayZone",
        casinoSessionId: `sess-${Date.now()}`,
        casinoRoundId: `round-${Math.floor(Math.random() * 9999)}`,
      },
    ],
    metadata: {
      sourceSystem: "playzone-demo",
      terminalId: "WEB-01",
    },
  }
}

/** Prize al retirar solo si hubo ganancia. paidAmount = ganancia neta (salió − entró). */
export function mapCasinoPrize(opts: {
  serial: string
  externalTicketKey: string
  ticketId: string
  huc: string
  entroCon: number
  salioCon: number
}) {
  const ganancia = Number((opts.salioCon - opts.entroCon).toFixed(2))
  const paidAmount = formatVesAmount(ganancia)
  return {
    operatorId: BETLINK_OPERATOR_ID,
    currency: "VES",
    serial: opts.serial,
    paidAmount,
    expectedPayoutAmount: paidAmount,
    prizedAt: nowVeIso(),
    externalTicketKey: opts.externalTicketKey,
    originalTicketId: opts.ticketId,
    originalHuc: opts.huc,
    bets: [
      {
        betIndex: 0,
        settlementResult: "WON" as const,
        paidAmount,
      },
    ],
    metadata: {
      sourceSystem: "playzone-demo",
      terminalId: "WEB-01",
    },
  }
}
