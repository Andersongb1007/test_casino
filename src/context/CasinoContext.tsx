import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useAuth } from "@/context/AuthContext"
import { playAnyGame, type GameOutcome, type RouletteColor } from "@/lib/games"
import {
  ANIMAL_BRANDS,
  ANIMALITOS_PAYOUT,
  DUPLETA_PAYOUT,
  NUMBER_BRANDS,
  NUMBER_MODALITIES,
  NUMBER_TURNS,
  getAnimalitoByCode,
  makeTicketCode,
  settleAnimalLine,
  settleDupleta,
  settleNumberPick,
} from "@/lib/lottery"
import { createTicketId, generateHuc } from "@/lib/regulator"
import {
  flushPendingRemittances,
  remitIngest,
  remitPrize,
} from "@/lib/betlink/client"
import { newSerial } from "@/lib/betlink/constants"
import { buildBettor, validateProfileForBetlink } from "@/lib/betlink/bettor"
import { mapCasinoIngest, mapCasinoPrize } from "@/lib/betlink/mapCasino"
import {
  mapAnimalitosIngest,
  mapLoteriaIngest,
  mapPrizeFromTicket,
} from "@/lib/betlink/mapLottery"
import {
  GAME_LABELS,
  INITIAL_BALANCE,
  type GameId,
  type GameSessionData,
  type LotteryTicket,
  type PlatformSection,
  type WalletMovement,
} from "@/lib/types"

export type RoundPhase = "idle" | "playing" | "result"

type ActiveRound = {
  ticketId: string
  gameId: GameId
  amount: number
  huc: string
  phase: RoundPhase
  outcome: GameOutcome | null
}

type GameSession = GameSessionData

type CrashLive = {
  amount: number
  crashAt: number
  running: boolean
}

type CasinoContextValue = {
  balance: number
  movements: WalletMovement[]
  tickets: LotteryTicket[]
  section: PlatformSection
  setSection: (s: PlatformSection) => void
  session: GameSession | null
  activeRound: ActiveRound | null
  lastResult: ActiveRound | null
  crashLive: CrashLive | null
  enterGame: (gameId: GameId, buyIn: number) => string | null
  topUpSession: (amount: number) => string | null
  placeBet: (
    amount: number,
    opts?: { rouletteChoice?: RouletteColor },
  ) => string | null
  startCrash: (amount: number) => string | null
  cashOutCrash: (mult: number) => string | null
  crashBusted: () => void
  withdrawToWallet: () => string | null
  resetWallet: () => void
  buyAnimalitosTicket: (opts: {
    brandId: string
    drawTime: string
    animalCode: string
    amount: number
    mode?: "simple" | "dupleta"
    animalCodeB?: string
  }) => { error: string | null; ticket: LotteryTicket | null }
  buyNumberTicket: (opts: {
    brandId: string
    turnId: string
    modalityId: string
    pick: string
    amount: number
    zodiac?: string
  }) => { error: string | null; ticket: LotteryTicket | null }
  runTicketDraw: (ticketId: string) => string | null
}

const CasinoContext = createContext<CasinoContextValue | null>(null)

function makeMovement(
  partial: Omit<WalletMovement, "id" | "timestamp">,
): WalletMovement {
  return {
    ...partial,
    id: `MOV-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    timestamp: new Date().toISOString(),
  }
}

function nestedSerial(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const ticket = (payload as { ticket?: { serial?: string } }).ticket
  return ticket?.serial ?? null
}

export function CasinoProvider({ children }: { children: ReactNode }) {
  const { user, persistState } = useAuth()
  const [balance, setBalance] = useState(INITIAL_BALANCE)
  const [movements, setMovements] = useState<WalletMovement[]>([])
  const [tickets, setTickets] = useState<LotteryTicket[]>([])
  const [section, setSection] = useState<PlatformSection>("casino")
  const [session, setSession] = useState<GameSession | null>(null)
  const [activeRound, setActiveRound] = useState<ActiveRound | null>(null)
  const [lastResult, setLastResult] = useState<ActiveRound | null>(null)
  const [crashLive, setCrashLive] = useState<CrashLive | null>(null)
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const balanceRef = useRef(balance)
  const movementsRef = useRef(movements)
  const sessionRef = useRef(session)
  const ticketsRef = useRef(tickets)
  const userRef = useRef(user)

  useEffect(() => {
    balanceRef.current = balance
    movementsRef.current = movements
    sessionRef.current = session
    ticketsRef.current = tickets
    userRef.current = user
  }, [balance, movements, session, tickets, user])

  const profileError = useCallback((): string | null => {
    const u = userRef.current
    if (!u) return "Sesión no válida"
    return validateProfileForBetlink(u)
  }, [])

  useEffect(() => {
    void flushPendingRemittances()
  }, [])

  useEffect(() => {
    if (!user) return
    if (hydratedUserId === user.id) return
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setBalance(user.balance)
    setMovements(user.movements)
    setTickets(user.tickets)
    setSession(
      user.gameSession
        ? {
            ...user.gameSession,
            enteredAmount:
              user.gameSession.enteredAmount ?? user.gameSession.sessionBalance,
          }
        : null,
    )
    setActiveRound(null)
    setLastResult(null)
    setCrashLive(null)
    setHydratedUserId(user.id)
  }, [user, hydratedUserId])

  const save = useCallback(
    (patch: {
      balance?: number
      movements?: WalletMovement[]
      gameSession?: GameSession | null
      tickets?: LotteryTicket[]
    }) => {
      if (patch.balance !== undefined) setBalance(patch.balance)
      if (patch.movements !== undefined) setMovements(patch.movements)
      if (patch.gameSession !== undefined) setSession(patch.gameSession)
      if (patch.tickets !== undefined) setTickets(patch.tickets)
      persistState(patch)
    },
    [persistState],
  )

  const patchTicketBetlink = useCallback(
    (
      ticketId: string,
      fields: Partial<
        Pick<
          LotteryTicket,
          | "externalTicketKey"
          | "betlinkTicketId"
          | "betlinkHuc"
          | "betlinkSerial"
          | "betlinkTicketNumber"
        >
      >,
    ) => {
      const nextTickets = ticketsRef.current.map((t) =>
        t.id === ticketId ? { ...t, ...fields } : t,
      )
      save({ tickets: nextTickets })
    },
    [save],
  )

  const remitLotteryExit = useCallback(
    async (ticket: LotteryTicket, won: boolean, payout: number) => {
      const u = userRef.current
      if (!u) return
      const err = validateProfileForBetlink(u)
      if (err) return
      const bettor = buildBettor(u)
      const isAnimal =
        ticket.kind === "animalitos" || ticket.kind === "dupleta"
      const payload = isAnimal
        ? mapAnimalitosIngest(ticket, bettor)
        : mapLoteriaIngest(ticket, bettor)

      const ingest = await remitIngest(payload)
      const serial = ingest.serial || nestedSerial(payload)
      patchTicketBetlink(ticket.id, {
        externalTicketKey: ingest.externalTicketKey,
        betlinkTicketId: ingest.ticketId,
        betlinkHuc: ingest.huc,
        betlinkSerial: serial,
        betlinkTicketNumber: payload.ticket.ticketNumber,
      })

      if (won && ingest.ok && ingest.huc && ingest.ticketId) {
        await remitPrize(
          mapPrizeFromTicket({
            ticket: {
              ...ticket,
              externalTicketKey: ingest.externalTicketKey,
              betlinkSerial: serial,
            },
            ticketId: ingest.ticketId,
            huc: ingest.huc,
            paidAmount: payout,
            settlementResult: "WON",
          }),
        )
      }
    },
    [patchTicketBetlink],
  )

  const enterGame = useCallback(
    (gameId: GameId, buyIn: number): string | null => {
      const profileErr = profileError()
      if (profileErr) return profileErr
      const u = userRef.current!
      const bettor = buildBettor(u)
      if (sessionRef.current) return "Ya estás en un juego. Retira a wallet primero."
      if (activeRound?.phase === "playing" || crashLive?.running)
        return "Espera la jugada"
      if (!Number.isFinite(buyIn) || buyIn <= 0) return "Monto inválido"
      if (buyIn > balanceRef.current) return "Saldo insuficiente"

      const nextBalance = Number((balanceRef.current - buyIn).toFixed(2))
      const nextMovements = [
        makeMovement({
          type: "entrada",
          amount: -buyIn,
          balanceAfter: nextBalance,
          gameId,
          huc: null,
          label: `Entrada a ${GAME_LABELS[gameId]}`,
        }),
        ...movementsRef.current,
      ]
      save({
        balance: nextBalance,
        movements: nextMovements,
        gameSession: {
          gameId,
          sessionBalance: buyIn,
          enteredAmount: buyIn,
        },
      })
      setLastResult(null)
      setActiveRound(null)

      void (async () => {
        const payload = mapCasinoIngest({ gameId, entroCon: buyIn, bettor })
        const ingest = await remitIngest(payload)
        const current = sessionRef.current
        if (!current || current.gameId !== gameId) return
        save({
          gameSession: {
            ...current,
            betlinkTicketId: ingest.ticketId,
            betlinkHuc: ingest.huc,
            betlinkSerial: ingest.serial || payload.ticket.serial,
            betlinkExternalKey:
              ingest.externalTicketKey || payload.externalTicketKey,
          },
        })
      })()

      return null
    },
    [activeRound, crashLive, profileError, save],
  )

  const topUpSession = useCallback(
    (amount: number): string | null => {
      const sess = sessionRef.current
      if (!sess) return "No hay mesa activa"
      if (activeRound?.phase === "playing" || crashLive?.running)
        return "Espera la jugada"
      if (!Number.isFinite(amount) || amount <= 0) return "Monto inválido"
      if (amount > balanceRef.current) return "Saldo insuficiente"

      const nextBalance = Number((balanceRef.current - amount).toFixed(2))
      const nextMovements = [
        makeMovement({
          type: "entrada",
          amount: -amount,
          balanceAfter: nextBalance,
          gameId: sess.gameId,
          huc: null,
          label: `Recarga · ${GAME_LABELS[sess.gameId]}`,
        }),
        ...movementsRef.current,
      ]
      save({
        balance: nextBalance,
        movements: nextMovements,
        gameSession: {
          ...sess,
          sessionBalance: Number((sess.sessionBalance + amount).toFixed(2)),
          enteredAmount: Number(
            ((sess.enteredAmount ?? sess.sessionBalance) + amount).toFixed(2),
          ),
        },
      })
      return null
    },
    [activeRound, crashLive, save],
  )

  const settleRound = useCallback(
    (round: ActiveRound) => {
      const sess = sessionRef.current
      if (!round.outcome || !sess) return
      const won = round.outcome.payout > 0
      const payout = round.outcome.payout
      save({
        gameSession: {
          ...sess,
          sessionBalance: Number(
            (sess.sessionBalance + (won ? payout : 0)).toFixed(2),
          ),
        },
      })
      setLastResult({ ...round, phase: "result" })
      setActiveRound(null)
    },
    [save],
  )

  const placeBet = useCallback(
    (
      amount: number,
      opts?: { rouletteChoice?: RouletteColor },
    ): string | null => {
      const sess = sessionRef.current
      if (!sess) return "Entra al juego primero"
      if (sess.gameId === "crash") return "Usa el panel Crash"
      if (activeRound?.phase === "playing") return "Espera la jugada"
      if (!Number.isFinite(amount) || amount <= 0) return "Monto inválido"
      if (amount > sess.sessionBalance) return "Fichas insuficientes"

      save({
        gameSession: {
          ...sess,
          sessionBalance: Number((sess.sessionBalance - amount).toFixed(2)),
          enteredAmount: sess.enteredAmount,
        },
      })
      setLastResult(null)

      const outcome = playAnyGame(sess.gameId, amount, opts)
      const round: ActiveRound = {
        ticketId: createTicketId(),
        gameId: sess.gameId,
        amount,
        huc: generateHuc(),
        phase: "playing",
        outcome,
      }
      setActiveRound(round)
      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => settleRound(round), 3200)
      return null
    },
    [activeRound, save, settleRound],
  )

  const startCrash = useCallback(
    (amount: number): string | null => {
      const sess = sessionRef.current
      if (!sess || sess.gameId !== "crash") return "Entra a Crash primero"
      if (crashLive?.running) return "Ronda en curso"
      if (!Number.isFinite(amount) || amount <= 0) return "Monto inválido"
      if (amount > sess.sessionBalance) return "Fichas insuficientes"

      const crashAt = playAnyGame("crash", amount).detail
      if (!("crashAt" in crashAt)) return "Error"
      save({
        gameSession: {
          ...sess,
          sessionBalance: Number((sess.sessionBalance - amount).toFixed(2)),
          enteredAmount: sess.enteredAmount,
        },
      })
      setCrashLive({ amount, crashAt: crashAt.crashAt, running: true })
      setLastResult(null)
      return null
    },
    [crashLive, save],
  )

  const cashOutCrash = useCallback(
    (mult: number): string | null => {
      const live = crashLive
      const sess = sessionRef.current
      if (!live?.running || !sess) return "No hay ronda"
      if (mult >= live.crashAt) return "Ya crasheó"
      const payout = Number((live.amount * mult).toFixed(2))
      const outcome: GameOutcome = {
        gameId: "crash",
        detail: {
          crashAt: live.crashAt,
          cashedAt: mult,
          won: true,
          multiplier: mult,
        },
        payout,
      }
      save({
        gameSession: {
          ...sess,
          sessionBalance: Number((sess.sessionBalance + payout).toFixed(2)),
        },
      })
      setLastResult({
        ticketId: createTicketId(),
        gameId: "crash",
        amount: live.amount,
        huc: generateHuc(),
        phase: "result",
        outcome,
      })
      setCrashLive(null)
      return null
    },
    [crashLive, save],
  )

  const crashBusted = useCallback(() => {
    const live = crashLive
    if (!live) return
    setLastResult({
      ticketId: createTicketId(),
      gameId: "crash",
      amount: live.amount,
      huc: generateHuc(),
      phase: "result",
      outcome: {
        gameId: "crash",
        detail: {
          crashAt: live.crashAt,
          cashedAt: null,
          won: false,
          multiplier: 0,
        },
        payout: 0,
      },
    })
    setCrashLive(null)
  }, [crashLive])

  const withdrawToWallet = useCallback(
    (): string | null => {
      const profileErr = profileError()
      if (profileErr) return profileErr
      const bettor = buildBettor(userRef.current!)
      const sess = sessionRef.current
      if (!sess) return "No hay mesa activa"
      if (activeRound?.phase === "playing" || crashLive?.running)
        return "Espera a que termine la jugada"

      const salioCon = Number(sess.sessionBalance.toFixed(2))
      const entroCon = Number((sess.enteredAmount || sess.sessionBalance).toFixed(2))
      const gano = salioCon > entroCon
      const nextBalance = Number((balanceRef.current + salioCon).toFixed(2))
      const nextMovements = [
        makeMovement({
          type: "retiro",
          amount: salioCon,
          balanceAfter: nextBalance,
          gameId: sess.gameId,
          huc: null,
          label: `Retiro · ${GAME_LABELS[sess.gameId]}`,
        }),
        ...movementsRef.current,
      ]
      if (timerRef.current) window.clearTimeout(timerRef.current)
      const certified = {
        ticketId: sess.betlinkTicketId,
        huc: sess.betlinkHuc,
        serial: sess.betlinkSerial,
        externalKey: sess.betlinkExternalKey,
        gameId: sess.gameId,
      }
      save({ balance: nextBalance, movements: nextMovements, gameSession: null })
      setActiveRound(null)
      setLastResult(null)
      setCrashLive(null)

      void (async () => {
        // Solo premiamos si salió con ganancia. La salida no se registra aparte.
        if (!gano) return

        let ticketId = certified.ticketId
        let huc = certified.huc
        let serial = certified.serial
        let externalKey = certified.externalKey

        // Si el ingest de entrada aún no llegó, certifica el stake y luego prize.
        if (!ticketId || !huc) {
          const payload = mapCasinoIngest({
            gameId: certified.gameId,
            entroCon,
            bettor,
          })
          const ingest = await remitIngest(payload)
          ticketId = ingest.ticketId
          huc = ingest.huc
          serial = ingest.serial || payload.ticket.serial
          externalKey = ingest.externalTicketKey || payload.externalTicketKey
        }

        if (ticketId && huc) {
          await remitPrize(
            mapCasinoPrize({
              serial: serial || newSerial("CS"),
              externalTicketKey: externalKey || "",
              ticketId,
              huc,
              entroCon,
              salioCon,
            }),
          )
        }
      })()

      return null
    },
    [activeRound, crashLive, profileError, save],
  )

  const resetWallet = useCallback(() => {
    if (sessionRef.current || activeRound?.phase === "playing") return
    save({
      balance: INITIAL_BALANCE,
      movements: [
        makeMovement({
          type: "inicio",
          amount: INITIAL_BALANCE,
          balanceAfter: INITIAL_BALANCE,
          gameId: null,
          huc: null,
          label: "Saldo reiniciado",
        }),
      ],
      gameSession: null,
      tickets: [],
    })
  }, [activeRound, save])

  const buyAnimalitosTicket = useCallback(
    (opts: {
      brandId: string
      drawTime: string
      animalCode: string
      amount: number
      mode?: "simple" | "dupleta"
      animalCodeB?: string
    }) => {
      const profileErr = profileError()
      if (profileErr) return { error: profileErr, ticket: null }
      const brand = ANIMAL_BRANDS.find((b) => b.id === opts.brandId)
      if (!brand) return { error: "Lotería inválida", ticket: null }
      if (!Number.isFinite(opts.amount) || opts.amount <= 0)
        return { error: "Monto inválido", ticket: null }
      if (opts.amount > balanceRef.current)
        return { error: "Saldo insuficiente", ticket: null }

      const a = getAnimalitoByCode(opts.animalCode)
      const mode = opts.mode ?? "simple"
      if (mode === "dupleta") {
        if (!opts.animalCodeB)
          return { error: "Elige el segundo animalito", ticket: null }
      }

      const b =
        mode === "dupleta" && opts.animalCodeB
          ? getAnimalitoByCode(opts.animalCodeB)
          : null

      const nextBalance = Number((balanceRef.current - opts.amount).toFixed(2))
      const selection =
        mode === "dupleta" && b ? `${a.code}+${b.code}` : a.code
      const ticket: LotteryTicket = {
        id: `TK-${Date.now()}`,
        code: makeTicketCode(mode === "dupleta" ? "DP" : "AN"),
        kind: mode === "dupleta" ? "dupleta" : "animalitos",
        productName: brand.name,
        drawLabel:
          mode === "dupleta"
            ? `Dupleta · sorteos ${opts.drawTime}`
            : `Sorteo ${opts.drawTime}`,
        drawTime: opts.drawTime,
        selection,
        selectionDetail:
          mode === "dupleta" && b
            ? `${a.emoji} ${a.name} + ${b.emoji} ${b.name} · ${DUPLETA_PAYOUT}x`
            : `${a.emoji} ${a.name} · ${ANIMALITOS_PAYOUT}x`,
        amount: opts.amount,
        payout: 0,
        status: "Pendiente",
        drawnResult: null,
        createdAt: new Date().toISOString(),
        settledAt: null,
      }
      const nextMovements = [
        makeMovement({
          type: "ticket",
          amount: -opts.amount,
          balanceAfter: nextBalance,
          gameId: null,
          huc: null,
          label: `${brand.name} · ${ticket.selectionDetail} · ${opts.drawTime}`,
        }),
        ...movementsRef.current,
      ]
      save({
        balance: nextBalance,
        movements: nextMovements,
        tickets: [ticket, ...ticketsRef.current],
      })
      return { error: null, ticket }
    },
    [profileError, save],
  )

  const buyNumberTicket = useCallback(
    (opts: {
      brandId: string
      turnId: string
      modalityId: string
      pick: string
      amount: number
      zodiac?: string
    }) => {
      const profileErr = profileError()
      if (profileErr) return { error: profileErr, ticket: null }
      const brand = NUMBER_BRANDS.find((b) => b.id === opts.brandId)
      const turn = NUMBER_TURNS.find((t) => t.id === opts.turnId)
      const modality = NUMBER_MODALITIES.find((m) => m.id === opts.modalityId)
      if (!brand || !turn || !modality)
        return { error: "Selección inválida", ticket: null }
      if (!Number.isFinite(opts.amount) || opts.amount <= 0)
        return { error: "Monto inválido", ticket: null }
      if (opts.amount > balanceRef.current)
        return { error: "Saldo insuficiente", ticket: null }
      if (!new RegExp(`^\\d{${modality.digits}}$`).test(opts.pick))
        return { error: `Ingresa ${modality.digits} dígitos`, ticket: null }

      const nextBalance = Number((balanceRef.current - opts.amount).toFixed(2))
      const ticket: LotteryTicket = {
        id: `TK-${Date.now()}`,
        code: makeTicketCode("CF"),
        kind: modality.digits === 3 ? "tripleta" : "quiniela",
        productName: `${brand.name} · ${modality.name}`,
        drawLabel: `${turn.label} · ${turn.time}`,
        drawTime: turn.time,
        selection: opts.pick,
        selectionDetail: opts.zodiac
          ? `${modality.description} · Signo ${opts.zodiac}`
          : modality.description,
        amount: opts.amount,
        payout: 0,
        status: "Pendiente",
        drawnResult: null,
        createdAt: new Date().toISOString(),
        settledAt: null,
      }
      const nextMovements = [
        makeMovement({
          type: "ticket",
          amount: -opts.amount,
          balanceAfter: nextBalance,
          gameId: null,
          huc: null,
          label: `${ticket.productName} · ${opts.pick} · ${turn.time}`,
        }),
        ...movementsRef.current,
      ]
      save({
        balance: nextBalance,
        movements: nextMovements,
        tickets: [ticket, ...ticketsRef.current],
      })
      return { error: null, ticket }
    },
    [profileError, save],
  )

  const runTicketDraw = useCallback(
    (ticketId: string): string | null => {
      const ticket = ticketsRef.current.find((t) => t.id === ticketId)
      if (!ticket) return "Ticket no encontrado"
      if (ticket.status !== "Pendiente") return "Este ticket ya fue sorteado"

      let drawnResult = ""
      let payout = 0
      let won = false

      if (ticket.kind === "animalitos") {
        const res = settleAnimalLine(ticket.selection, ticket.amount)
        drawnResult = res.label
        payout = res.payout
        won = res.won
      } else if (ticket.kind === "dupleta") {
        const [a, b] = ticket.selection.split("+")
        const res = settleDupleta(a, b, ticket.amount)
        drawnResult = res.label
        payout = res.payout
        won = res.won
      } else {
        const modality = NUMBER_MODALITIES.find((m) =>
          ticket.productName.includes(m.name),
        )
        const mult =
          modality?.payout ?? (ticket.kind === "tripleta" ? 600 : 60)
        const res = settleNumberPick(ticket.selection, ticket.amount, mult)
        drawnResult = `Salió ${res.drawn}`
        payout = res.payout
        won = res.won
      }

      const nextBalance = won
        ? Number((balanceRef.current + payout).toFixed(2))
        : balanceRef.current
      const updated: LotteryTicket = {
        ...ticket,
        status: won ? "Premiado" : "No premiado",
        payout,
        drawnResult,
        settledAt: new Date().toISOString(),
      }
      const nextTickets = ticketsRef.current.map((t) =>
        t.id === ticketId ? updated : t,
      )
      const nextMovements = won
        ? [
            makeMovement({
              type: "premio_loteria",
              amount: payout,
              balanceAfter: nextBalance,
              gameId: null,
              huc: null,
              label: `Premio · ${ticket.productName}`,
            }),
            ...movementsRef.current,
          ]
        : [
            makeMovement({
              type: "sin_premio",
              amount: 0,
              balanceAfter: nextBalance,
              gameId: null,
              huc: null,
              label: `Sin acierto · ${ticket.productName}`,
            }),
            ...movementsRef.current,
          ]

      save({
        balance: nextBalance,
        movements: nextMovements,
        tickets: nextTickets,
      })

      void remitLotteryExit(updated, won, payout)
      return null
    },
    [remitLotteryExit, save],
  )

  const value = useMemo(
    () => ({
      balance,
      movements,
      tickets,
      section,
      setSection,
      session,
      activeRound,
      lastResult,
      crashLive,
      enterGame,
      topUpSession,
      placeBet,
      startCrash,
      cashOutCrash,
      crashBusted,
      withdrawToWallet,
      resetWallet,
      buyAnimalitosTicket,
      buyNumberTicket,
      runTicketDraw,
    }),
    [
      balance,
      movements,
      tickets,
      section,
      session,
      activeRound,
      lastResult,
      crashLive,
      enterGame,
      topUpSession,
      placeBet,
      startCrash,
      cashOutCrash,
      crashBusted,
      withdrawToWallet,
      resetWallet,
      buyAnimalitosTicket,
      buyNumberTicket,
      runTicketDraw,
    ],
  )

  return <CasinoContext.Provider value={value}>{children}</CasinoContext.Provider>
}

export function useCasino() {
  const ctx = useContext(CasinoContext)
  if (!ctx) throw new Error("useCasino debe usarse dentro de CasinoProvider")
  return ctx
}
