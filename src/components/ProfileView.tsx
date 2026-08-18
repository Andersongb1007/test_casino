import { useEffect, useState } from "react"
import { LogOut, History, User, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { useCasino } from "@/context/CasinoContext"
import { validateProfileForBetlink } from "@/lib/betlink/bettor"
import type { DocumentTypeId, WalletMovementType } from "@/lib/types"
import { formatMoney } from "@/lib/utils"

const LABELS: Record<WalletMovementType, string> = {
  inicio: "Inicio",
  entrada: "Entrada a juego",
  retiro: "Retiro a wallet",
  apuesta: "Apuesta",
  premio: "Premio",
  sin_premio: "Sin premio",
  ticket: "Compra de ticket",
  premio_loteria: "Premio lotería",
}

const DOC_TYPES: { value: DocumentTypeId; label: string }[] = [
  { value: "V", label: "V — Venezolano" },
  { value: "E", label: "E — Extranjero" },
  { value: "J", label: "J — Jurídico" },
  { value: "P", label: "P — Pasaporte" },
  { value: "G", label: "G — Gobierno" },
]

export function ProfileView() {
  const { user, logout, updateProfile } = useAuth()
  const { balance, movements, tickets, session, withdrawToWallet, resetWallet } =
    useCasino()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [documentTypeId, setDocumentTypeId] = useState<DocumentTypeId>("V")
  const [documentId, setDocumentId] = useState("")
  const [address, setAddress] = useState("")
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.profile) return
    setFirstName(user.profile.firstName)
    setLastName(user.profile.lastName)
    setPhone(user.profile.phone)
    setDocumentTypeId(user.profile.documentTypeId)
    setDocumentId(user.profile.documentId)
    setAddress(user.profile.address)
  }, [user])

  const profileComplete = user ? validateProfileForBetlink(user) === null : false

  const onSaveProfile = () => {
    updateProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      documentTypeId,
      documentId: documentId.replace(/\D/g, ""),
      address: address.trim(),
    })
    setSavedMsg("Perfil guardado")
    setTimeout(() => setSavedMsg(null), 2500)
  }

  const onLogout = () => {
    if (session) {
      withdrawToWallet()
    }
    logout()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>{user?.name}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
            <Button variant="destructive" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Saldo wallet</p>
            <p className="text-2xl font-semibold">{formatMoney(balance)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tickets</p>
            <p className="text-2xl font-semibold">{tickets.length}</p>
          </div>
          {session && (
            <Badge variant="warning">
              Mesa abierta · retira antes de salir
            </Badge>
          )}
          {profileComplete ? (
            <Badge variant="success">Perfil BetLink completo</Badge>
          ) : (
            <Badge variant="warning">Completa tu perfil para jugar</Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={Boolean(session)}
            onClick={resetWallet}
          >
            Reiniciar saldo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos para remisión BetLink</CardTitle>
          <CardDescription>
            Nombre, documento, teléfono y correo que se envían al Validador en cada
            ticket.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-first">Nombre</Label>
            <Input
              id="profile-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-last">Apellido</Label>
            <Input
              id="profile-last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="profile-email">Correo</Label>
            <Input id="profile-email" value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Teléfono</Label>
            <Input
              id="profile-phone"
              inputMode="tel"
              placeholder="04141234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-doctype">Tipo documento</Label>
            <select
              id="profile-doctype"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={documentTypeId}
              onChange={(e) =>
                setDocumentTypeId(e.target.value as DocumentTypeId)
              }
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-doc">Número documento</Label>
            <Input
              id="profile-doc"
              inputMode="numeric"
              placeholder="12345678"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="profile-address">Dirección</Label>
            <Input
              id="profile-address"
              placeholder="Caracas, Venezuela"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Button onClick={onSaveProfile}>
              <Save className="h-4 w-4" />
              Guardar perfil
            </Button>
            {savedMsg && (
              <p className="text-sm text-success">{savedMsg}</p>
            )}
            {!profileComplete && user && (
              <p className="text-sm text-amber-700">
                {validateProfileForBetlink(user)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Historial de movimientos
          </CardTitle>
          <CardDescription>
            Entradas, retiros, tickets y premios de tu wallet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin movimientos aún.</p>
          ) : (
            <ul className="divide-y">
              {movements.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0"
                >
                  <div>
                    <p className="font-medium">{m.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {LABELS[m.type]} ·{" "}
                      {new Date(m.timestamp).toLocaleString("es-VE")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={
                        m.amount > 0
                          ? "font-semibold text-success"
                          : m.amount < 0
                            ? "font-semibold text-amber-600"
                            : "font-semibold text-muted-foreground"
                      }
                    >
                      {m.type === "sin_premio"
                        ? "—"
                        : `${m.amount > 0 ? "+" : ""}${formatMoney(m.amount)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(m.balanceAfter)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
