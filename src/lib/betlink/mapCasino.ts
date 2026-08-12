import type { GameId } from "@/lib/types"
import { GAME_LABELS } from "@/lib/types"
import { formatVesAmount } from "./money"
import {
  BETLINK_OPERATOR_ID,
  BURNED_BETTOR,
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
  documentId?: string
}) {
  const drawDate = todayVeDate()
  const externalTicketKey = newExternalKey("CASINO")
  const serial = newSerial("CS")
  const ticketNumber = newTicketNumber("C")
  const documentId =
    (opts.documentId ?? "").replace(/\D/g, "") || BURNED_BETTOR.documentId
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
      bettor: {
        ...BURNED_BETTOR,
        documentId,
      },
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

/** Prize al retirar solo si hubo ganancia. paidAmount = total con el que salió. */
export function mapCasinoPrize(opts: {
  serial: string
  externalTicketKey: string
  ticketId: string
  huc: string
  salioCon: number
}) {
  const paidAmount = formatVesAmount(opts.salioCon)
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
