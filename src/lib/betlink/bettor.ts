import type { DocumentTypeId, UserAccount, UserProfile } from "@/lib/types"

/** Payload bettor exigido por el Validador BetLink. */
export type BettorPayload = {
  firstName: string
  lastName: string
  documentId: string
  documentTypeId: DocumentTypeId
  address: string
  phone: string
  email: string
}

export function defaultProfile(name: string): UserProfile {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] ?? ""
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName
  return {
    firstName,
    lastName,
    phone: "",
    documentTypeId: "V",
    documentId: "",
    address: "",
  }
}

export function normalizeProfile(
  raw: UserAccount | Partial<UserAccount>,
): UserProfile {
  if (raw.profile) {
    return {
      firstName: raw.profile.firstName?.trim() ?? "",
      lastName: raw.profile.lastName?.trim() ?? "",
      phone: raw.profile.phone?.trim() ?? "",
      documentTypeId: raw.profile.documentTypeId ?? "V",
      documentId: raw.profile.documentId?.replace(/\D/g, "") ?? "",
      address: raw.profile.address?.trim() ?? "",
    }
  }
  return defaultProfile(raw.name ?? "")
}

/** Arma el objeto bettor tal como lo espera POST /bets/ingest. */
export function buildBettor(user: UserAccount): BettorPayload {
  const p = normalizeProfile(user)
  return {
    firstName: p.firstName,
    lastName: p.lastName,
    documentId: p.documentId,
    documentTypeId: p.documentTypeId,
    address: p.address,
    phone: p.phone.replace(/\D/g, ""),
    email: user.email.trim().toLowerCase(),
  }
}

export function validateProfileForBetlink(user: UserAccount): string | null {
  const p = normalizeProfile(user)
  if (!p.firstName) return "Completa tu nombre en Mi perfil"
  if (!p.lastName) return "Completa tu apellido en Mi perfil"
  if (!user.email.includes("@")) return "Email inválido en tu perfil"
  if (!p.phone.replace(/\D/g, "")) return "Completa tu teléfono en Mi perfil"
  if (p.phone.replace(/\D/g, "").length < 10)
    return "Teléfono inválido (mínimo 10 dígitos)"
  if (!p.documentId || p.documentId.length < 6)
    return "Completa tu documento en Mi perfil"
  if (!p.address) return "Completa tu dirección en Mi perfil"
  return null
}
