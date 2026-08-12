/** Tasa BCV oficial vigente para 2026-08-12 */
export const BCV_RATE_DATE = "2026-08-12"
export const BCV_USD_VES = 764.35

export function formatVesAmount(amount: number): string {
  return Number(amount).toFixed(2)
}
