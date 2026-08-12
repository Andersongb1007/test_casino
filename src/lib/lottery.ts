import {
  ANIMALITOS_PAYOUT,
  DUPLETA_PAYOUT,
  DRAW_HOURS,
  drawAnimalitoCode,
  getAnimalitoByCode,
} from "./animalitos"

export {
  ANIMALITOS,
  ANIMALITOS_PAYOUT,
  DUPLETA_PAYOUT,
  DRAW_HOURS,
  ANIMAL_BRANDS,
  getAnimalitoByCode,
  drawAnimalitoCode,
} from "./animalitos"

export type NumberModality = {
  id: string
  name: string
  digits: number
  payout: number
  description: string
}

/** Modalidades tipo cifras VE (nombres ficticios) */
export const NUMBER_MODALITIES: NumberModality[] = [
  {
    id: "triple-fijo",
    name: "Triple fijo",
    digits: 3,
    payout: 600,
    description: "3 cifras en orden exacto · 600x",
  },
  {
    id: "terminal",
    name: "Terminal",
    digits: 2,
    payout: 60,
    description: "Últimas 2 cifras · 60x",
  },
  {
    id: "punta",
    name: "Punta",
    digits: 2,
    payout: 60,
    description: "Primeras 2 cifras · 60x",
  },
]

export const NUMBER_BRANDS = [
  { id: "triple-facil", name: "Triple Fácil" },
  { id: "chance-express", name: "Chance Express" },
  { id: "cifras-dia", name: "Cifras del Día" },
]

export const NUMBER_TURNS = [
  { id: "medio", label: "Mediodía", time: "13:00" },
  { id: "tarde", label: "Tarde", time: "16:30" },
  { id: "noche", label: "Noche", time: "19:00" },
]

export const ZODIAC = [
  "Aries",
  "Tauro",
  "Géminis",
  "Cáncer",
  "Leo",
  "Virgo",
  "Libra",
  "Escorpio",
  "Sagitario",
  "Capricornio",
  "Acuario",
  "Piscis",
]

export function makeTicketCode(prefix: string): string {
  const n = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0")
  const t = Date.now().toString().slice(-4)
  return `${prefix}-${t}-${n}`
}

export function randomDigits(count: number): string {
  let s = ""
  for (let i = 0; i < count; i++) s += Math.floor(Math.random() * 10)
  return s
}

export function settleAnimalLine(
  pickCode: string,
  amount: number,
): { drawn: string; won: boolean; payout: number; label: string } {
  const drawn = drawAnimalitoCode()
  const animal = getAnimalitoByCode(drawn)
  const won = drawn === pickCode
  return {
    drawn,
    won,
    payout: won ? Number((amount * ANIMALITOS_PAYOUT).toFixed(2)) : 0,
    label: `${animal.code} ${animal.emoji} ${animal.name}`,
  }
}

export function settleDupleta(
  a: string,
  b: string,
  amount: number,
): { drawn: string; won: boolean; payout: number; label: string } {
  const d1 = drawAnimalitoCode()
  const d2 = drawAnimalitoCode()
  const won = d1 === a && d2 === b
  const a1 = getAnimalitoByCode(d1)
  const a2 = getAnimalitoByCode(d2)
  return {
    drawn: `${d1}-${d2}`,
    won,
    payout: won ? Number((amount * DUPLETA_PAYOUT).toFixed(2)) : 0,
    label: `${a1.code} ${a1.name} + ${a2.code} ${a2.name}`,
  }
}

export function settleNumberPick(
  pick: string,
  amount: number,
  payoutMult: number,
): { drawn: string; won: boolean; payout: number } {
  const drawn = randomDigits(pick.length)
  const won = drawn === pick
  return {
    drawn,
    won,
    payout: won ? Number((amount * payoutMult).toFixed(2)) : 0,
  }
}

export function nextDrawSuggestion(): string {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  for (const h of DRAW_HOURS) {
    const [hh, mm] = h.split(":").map(Number)
    if (hh * 60 + mm > mins) return h
  }
  return DRAW_HOURS[0]
}
