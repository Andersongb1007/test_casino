import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  getSessionUserId,
  getUserById,
  loginUser,
  logoutUser,
  registerUser,
  updateUserData,
  updateUserProfile,
  type GameSessionData,
} from "@/lib/auth"
import type { LotteryTicket, UserAccount, UserProfile, WalletMovement } from "@/lib/types"

type AuthContextValue = {
  user: UserAccount | null
  ready: boolean
  login: (email: string, password: string) => string | null
  register: (name: string, email: string, password: string) => string | null
  logout: () => void
  updateProfile: (patch: Partial<UserProfile>) => string | null
  persistState: (patch: {
    balance?: number
    movements?: WalletMovement[]
    gameSession?: GameSessionData | null
    tickets?: LotteryTicket[]
  }) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = getSessionUserId()
    if (id) {
      const found = getUserById(id)
      if (found) setUser(found)
      else logoutUser()
    }
    setReady(true)
  }, [])

  const login = useCallback((email: string, password: string) => {
    const res = loginUser(email, password)
    if (!res.ok) return res.error
    setUser(res.user)
    return null
  }, [])

  const register = useCallback((name: string, email: string, password: string) => {
    const res = registerUser(name, email, password)
    if (!res.ok) return res.error
    setUser(res.user)
    return null
  }, [])

  const logout = useCallback(() => {
    logoutUser()
    setUser(null)
  }, [])

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev
      updateUserProfile(prev.id, patch)
      const next = getUserById(prev.id)
      return next ?? prev
    })
    return null
  }, [])

  const persistState = useCallback(
    (patch: {
      balance?: number
      movements?: WalletMovement[]
      gameSession?: GameSessionData | null
      tickets?: LotteryTicket[]
    }) => {
      setUser((prev) => {
        if (!prev) return prev
        const next = { ...prev, ...patch }
        updateUserData(prev.id, patch)
        return next
      })
    },
    [],
  )

  const value = useMemo(
    () => ({ user, ready, login, register, logout, updateProfile, persistState }),
    [user, ready, login, register, logout, updateProfile, persistState],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider")
  return ctx
}
