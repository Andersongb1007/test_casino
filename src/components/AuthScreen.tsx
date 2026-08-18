import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { IMAGES } from "@/lib/images"
import type { DocumentTypeId } from "@/lib/types"

const DOC_TYPES: { value: DocumentTypeId; label: string }[] = [
  { value: "V", label: "V — Venezolano" },
  { value: "E", label: "E — Extranjero" },
  { value: "J", label: "J — Jurídico" },
  { value: "P", label: "P — Pasaporte" },
  { value: "G", label: "G — Gobierno" },
]

const emptyRegister = () => ({
  firstName: "",
  lastName: "",
  phone: "",
  documentTypeId: "V" as DocumentTypeId,
  documentId: "",
  address: "",
})

export function AuthScreen() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [profile, setProfile] = useState(emptyRegister)
  const [error, setError] = useState<string | null>(null)

  const switchMode = (next: "login" | "register") => {
    setMode(next)
    setError(null)
    if (next === "register") setProfile(emptyRegister())
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const err =
      mode === "login"
        ? login(email, password)
        : register(
            {
              ...profile,
              firstName: profile.firstName.trim(),
              lastName: profile.lastName.trim(),
              phone: profile.phone.trim(),
              documentId: profile.documentId.replace(/\D/g, ""),
              address: profile.address.trim(),
            },
            email,
            password,
          )
    setError(err)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <img
        src={IMAGES.casinoHero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/70" />

      <Card className="relative z-10 w-full max-w-lg border-white/10 bg-card/95 shadow-2xl backdrop-blur">
        <CardHeader>
          <CardTitle>
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Entra con tu email y contraseña."
              : "Completa tus datos. Se usan en las remisiones BetLink y empiezas con Bs. 100.000."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            {mode === "register" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reg-first">Nombre</Label>
                  <Input
                    id="reg-first"
                    value={profile.firstName}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, firstName: e.target.value }))
                    }
                    placeholder="Laura"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-last">Apellido</Label>
                  <Input
                    id="reg-last"
                    value={profile.lastName}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, lastName: e.target.value }))
                    }
                    placeholder="López"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-doctype">Tipo documento</Label>
                  <select
                    id="reg-doctype"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={profile.documentTypeId}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        documentTypeId: e.target.value as DocumentTypeId,
                      }))
                    }
                    required
                  >
                    {DOC_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-doc">Número documento</Label>
                  <Input
                    id="reg-doc"
                    inputMode="numeric"
                    value={profile.documentId}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        documentId: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    placeholder="26834000"
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone">Teléfono</Label>
                  <Input
                    id="reg-phone"
                    inputMode="tel"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="04141234567"
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="reg-address">Dirección</Label>
                  <Input
                    id="reg-address"
                    value={profile.address}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, address: e.target.value }))
                    }
                    placeholder="Caracas, Venezuela"
                    required
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@demo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 4 caracteres"
                minLength={4}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" size="lg">
              {mode === "login" ? "Entrar" : "Registrarme"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Regístrate" : "Inicia sesión"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
