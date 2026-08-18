import type {
  GameSessionData,
  LotteryTicket,
  UserAccount,
  UserProfile,
  WalletMovement,
} from "./types"
import { INITIAL_BALANCE } from "./types"
import { defaultProfile, normalizeProfile } from "./betlink/bettor"

const USERS_KEY = "casino_users_v3"
const SESSION_KEY = "casino_session_v3"

export type { GameSessionData }

function makeId(): string {
  return `USR-${Date.now()}-${Math.floor(Math.random() * 9999)}`
}

function initialMovement(): WalletMovement {
  return {
    id: `MOV-${Date.now()}`,
    type: "inicio",
    amount: INITIAL_BALANCE,
    balanceAfter: INITIAL_BALANCE,
    gameId: null,
    huc: null,
    label: "Saldo inicial",
    timestamp: new Date().toISOString(),
  }
}

function normalizeUser(raw: UserAccount): UserAccount {
  const sess = raw.gameSession
  const profile = normalizeProfile(raw)
  const name =
    raw.name?.trim() ||
    `${profile.firstName} ${profile.lastName}`.trim() ||
    raw.email
  return {
    ...raw,
    name,
    profile,
    gameSession: sess
      ? {
          gameId: sess.gameId,
          sessionBalance: sess.sessionBalance,
          enteredAmount:
            typeof sess.enteredAmount === "number"
              ? sess.enteredAmount
              : sess.sessionBalance,
          betlinkTicketId: sess.betlinkTicketId ?? null,
          betlinkHuc: sess.betlinkHuc ?? null,
          betlinkSerial: sess.betlinkSerial ?? null,
          betlinkExternalKey: sess.betlinkExternalKey ?? null,
        }
      : null,
    movements: raw.movements ?? [],
    tickets: raw.tickets ?? [],
  }
}

export function loadUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as UserAccount[]).map(normalizeUser)
  } catch {
    return []
  }
}

function saveUsers(users: UserAccount[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export function setSessionUserId(id: string | null) {
  if (id) localStorage.setItem(SESSION_KEY, id)
  else localStorage.removeItem(SESSION_KEY)
}

export function registerUser(
  name: string,
  email: string,
  password: string,
): { ok: true; user: UserAccount } | { ok: false; error: string } {
  const users = loadUsers()
  const normalized = email.trim().toLowerCase()
  if (!name.trim()) return { ok: false, error: "Nombre requerido" }
  if (!normalized.includes("@")) return { ok: false, error: "Email inválido" }
  if (password.length < 4) return { ok: false, error: "Mínimo 4 caracteres" }
  if (users.some((u) => u.email === normalized)) {
    return { ok: false, error: "Ese email ya está registrado" }
  }

  const user: UserAccount = {
    id: makeId(),
    name: name.trim(),
    email: normalized,
    password,
    profile: defaultProfile(name.trim()),
    balance: INITIAL_BALANCE,
    movements: [initialMovement()],
    gameSession: null,
    tickets: [],
  }
  users.push(user)
  saveUsers(users)
  setSessionUserId(user.id)
  return { ok: true, user }
}

export function loginUser(
  email: string,
  password: string,
): { ok: true; user: UserAccount } | { ok: false; error: string } {
  const users = loadUsers()
  const normalized = email.trim().toLowerCase()
  const user = users.find((u) => u.email === normalized)
  if (!user || user.password !== password) {
    return { ok: false, error: "Email o contraseña incorrectos" }
  }
  setSessionUserId(user.id)
  return { ok: true, user: normalizeUser(user) }
}

export function getUserById(id: string): UserAccount | null {
  const user = loadUsers().find((u) => u.id === id)
  return user ? normalizeUser(user) : null
}

export function updateUserData(
  userId: string,
  patch: Partial<
    Pick<
      UserAccount,
      "balance" | "movements" | "gameSession" | "tickets" | "profile" | "name"
    >
  >,
) {
  const users = loadUsers()
  const idx = users.findIndex((u) => u.id === userId)
  if (idx < 0) return
  users[idx] = normalizeUser({ ...users[idx], ...patch })
  saveUsers(users)
}

export function updateUserProfile(userId: string, patch: Partial<UserProfile>) {
  const users = loadUsers()
  const idx = users.findIndex((u) => u.id === userId)
  if (idx < 0) return
  const profile = normalizeProfile({
    ...users[idx],
    profile: { ...users[idx].profile, ...patch },
  })
  const name = `${profile.firstName} ${profile.lastName}`.trim()
  users[idx] = normalizeUser({
    ...users[idx],
    profile,
    name: name || users[idx].name,
  })
  saveUsers(users)
}

export function updateUserWallet(
  userId: string,
  balance: number,
  movements: WalletMovement[],
) {
  updateUserData(userId, { balance, movements })
}

export function logoutUser() {
  setSessionUserId(null)
}

export type { LotteryTicket }
