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
import { getAnimalitoByCode } from "@/lib/animalitos"
import type { LotteryTicket } from "@/lib/types"

const LOTTERY_CODE_BY_BRAND: Record<string, string> = {
  "ruleta-viva": "RULETA",
  "granja-plus": "GRANJA",
  "zoo-activo": "ZOO",
}

export function mapAnimalitosIngest(ticket: LotteryTicket) {
  const codes = ticket.selection.split("+")
  const primary = getAnimalitoByCode(codes[0]!)
  const drawDate = todayVeDate()
  const externalTicketKey = ticket.externalTicketKey ?? newExternalKey("ANI")
  const serial = ticket.betlinkSerial ?? newSerial("AS")
  const ticketNumber = ticket.betlinkTicketNumber ?? newTicketNumber("A")
  const lotteryCode =
    LOTTERY_CODE_BY_BRAND[
      ticket.productName === "Ruleta Viva"
        ? "ruleta-viva"
        : ticket.productName === "Granja Plus"
          ? "granja-plus"
          : ticket.productName === "Zoo Activo"
            ? "zoo-activo"
            : ""
    ] ?? "GRANJA"

  return {
    operatorId: BETLINK_OPERATOR_ID,
    channel: "web",
    amount: ticket.amount,
    currency: "VES",
    externalTicketKey,
    ticket: {
      ticketNumber,
      serial,
      issuedAt: ticket.createdAt.includes("-04:00")
        ? ticket.createdAt
        : nowVeIso(),
      bettor: { ...BURNED_BETTOR },
      paymentMethod: "Saldo jugador",
    },
    selections: [
      {
        betType: "animalitos",
        amount: ticket.amount,
        description: primary.name.toUpperCase(),
        pickText: `NUM ${primary.code}`,
        eventDateLabel: eventDateLabel(drawDate),
        lotteryCode,
        drawCode: `A-${ticket.drawTime.replace(":", "")}`,
        drawDate,
        lotteryNumbers: codes,
        lotteryGameType:
          ticket.kind === "dupleta" ? "dupleta" : "animalito",
      },
    ],
    metadata: {
      sourceSystem: "playzone-demo",
      terminalId: "WEB-01",
    },
  }
}

export function mapLoteriaIngest(ticket: LotteryTicket) {
  const drawDate = todayVeDate()
  const externalTicketKey = ticket.externalTicketKey ?? newExternalKey("LOT")
  const serial = ticket.betlinkSerial ?? newSerial("LS")
  const ticketNumber = ticket.betlinkTicketNumber ?? newTicketNumber("L")
  const lotteryGameType = ticket.productName.toLowerCase().includes("terminal")
    ? "terminal"
    : ticket.productName.toLowerCase().includes("punta")
      ? "punta"
      : "triple"

  const brandName = ticket.productName.split("·")[0]?.trim() ?? "CIFRAS"
  const lotteryCode = brandName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .toUpperCase()
    .slice(0, 16)

  return {
    operatorId: BETLINK_OPERATOR_ID,
    channel: "web",
    amount: ticket.amount,
    currency: "VES",
    externalTicketKey,
    ticket: {
      ticketNumber,
      serial,
      issuedAt: ticket.createdAt.includes("-04:00")
        ? ticket.createdAt
        : nowVeIso(),
      bettor: { ...BURNED_BETTOR },
      paymentMethod: "Saldo jugador",
    },
    selections: [
      {
        betType: "loteria",
        amount: ticket.amount,
        description: ticket.productName.toUpperCase(),
        pickText: ticket.selection,
        eventDateLabel: eventDateLabel(drawDate),
        lotteryCode,
        drawCode: `T-${ticket.drawTime.replace(":", "")}`,
        drawDate,
        lotteryNumbers: [ticket.selection],
        lotteryGameType,
      },
    ],
    metadata: {
      sourceSystem: "playzone-demo",
      terminalId: "WEB-01",
    },
  }
}

export function mapPrizeFromTicket(opts: {
  ticket: LotteryTicket
  ticketId: string
  huc: string
  paidAmount: number
  settlementResult: "WON" | "LOST"
}) {
  const { ticket, ticketId, huc, paidAmount, settlementResult } = opts
  return {
    operatorId: BETLINK_OPERATOR_ID,
    currency: "VES",
    serial: ticket.betlinkSerial ?? newSerial("S"),
    paidAmount: formatVesAmount(paidAmount),
    expectedPayoutAmount: formatVesAmount(paidAmount),
    prizedAt: nowVeIso(),
    externalTicketKey: ticket.externalTicketKey ?? newExternalKey("PRZ"),
    originalTicketId: ticketId,
    originalHuc: huc,
    bets: [
      {
        betIndex: 0,
        settlementResult,
        paidAmount: formatVesAmount(paidAmount),
      },
    ],
    metadata: {
      sourceSystem: "playzone-demo",
      terminalId: "WEB-01",
    },
  }
}
