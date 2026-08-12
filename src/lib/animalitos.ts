/** 38 figuras: 00 Ballena + 0–36 (estructura tipo animalitos VE) */
export type Animalito = {
  number: number /** 0–36, o -1 para representar 00 */
  code: string
  name: string
  emoji: string
}

export const ANIMALITOS: Animalito[] = [
  { number: -1, code: "00", name: "Ballena", emoji: "🐋" },
  { number: 0, code: "0", name: "Delfín", emoji: "🐬" },
  { number: 1, code: "01", name: "Carnero", emoji: "🐏" },
  { number: 2, code: "02", name: "Toro", emoji: "🐂" },
  { number: 3, code: "03", name: "Ciempiés", emoji: "🐛" },
  { number: 4, code: "04", name: "Alacrán", emoji: "🦂" },
  { number: 5, code: "05", name: "León", emoji: "🦁" },
  { number: 6, code: "06", name: "Rana", emoji: "🐸" },
  { number: 7, code: "07", name: "Perico", emoji: "🦜" },
  { number: 8, code: "08", name: "Ratón", emoji: "🐭" },
  { number: 9, code: "09", name: "Águila", emoji: "🦅" },
  { number: 10, code: "10", name: "Tigre", emoji: "🐯" },
  { number: 11, code: "11", name: "Gato", emoji: "🐱" },
  { number: 12, code: "12", name: "Caballo", emoji: "🐴" },
  { number: 13, code: "13", name: "Mono", emoji: "🐵" },
  { number: 14, code: "14", name: "Paloma", emoji: "🕊️" },
  { number: 15, code: "15", name: "Zorro", emoji: "🦊" },
  { number: 16, code: "16", name: "Oso", emoji: "🐻" },
  { number: 17, code: "17", name: "Pavo", emoji: "🦃" },
  { number: 18, code: "18", name: "Burro", emoji: "🫏" },
  { number: 19, code: "19", name: "Chivo", emoji: "🐐" },
  { number: 20, code: "20", name: "Cochino", emoji: "🐷" },
  { number: 21, code: "21", name: "Gallo", emoji: "🐓" },
  { number: 22, code: "22", name: "Camello", emoji: "🐫" },
  { number: 23, code: "23", name: "Cebra", emoji: "🦓" },
  { number: 24, code: "24", name: "Iguana", emoji: "🦎" },
  { number: 25, code: "25", name: "Gallina", emoji: "🐔" },
  { number: 26, code: "26", name: "Vaca", emoji: "🐮" },
  { number: 27, code: "27", name: "Perro", emoji: "🐶" },
  { number: 28, code: "28", name: "Zamuro", emoji: "🦅" },
  { number: 29, code: "29", name: "Elefante", emoji: "🐘" },
  { number: 30, code: "30", name: "Caimán", emoji: "🐊" },
  { number: 31, code: "31", name: "Lapa", emoji: "🐿️" },
  { number: 32, code: "32", name: "Ardilla", emoji: "🐿️" },
  { number: 33, code: "33", name: "Pescado", emoji: "🐟" },
  { number: 34, code: "34", name: "Venado", emoji: "🦌" },
  { number: 35, code: "35", name: "Jirafa", emoji: "🦒" },
  { number: 36, code: "36", name: "Culebra", emoji: "🐍" },
]

export const ANIMALITOS_PAYOUT = 30
export const DUPLETA_PAYOUT = 1000

export function getAnimalitoByCode(code: string): Animalito {
  return ANIMALITOS.find((a) => a.code === code) ?? ANIMALITOS[1]
}

export function drawAnimalitoCode(): string {
  const i = Math.floor(Math.random() * ANIMALITOS.length)
  return ANIMALITOS[i].code
}

/** Horarios tipo sorteo cada hora (demo) */
export const DRAW_HOURS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
]

/** Marcas ficticias — mismo funcionamiento que animalitos VE */
export const ANIMAL_BRANDS = [
  {
    id: "ruleta-viva",
    name: "Ruleta Viva",
    tagline: "Sorteos cada hora · 38 figuras",
  },
  {
    id: "granja-plus",
    name: "Granja Plus",
    tagline: "Jugada rápida · ticket al instante",
  },
  {
    id: "zoo-activo",
    name: "Zoo Activo",
    tagline: "Tradicional y Dupleta",
  },
]
