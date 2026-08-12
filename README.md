# Casino Demo — Control Simplificado de Jugadas

React + Vite + Tailwind + shadcn/ui.

## Cómo correr

```bash
npm install
npm run dev
```

## Flujo

1. Elige un juego (Tragamonedas, Ruleta, Cartas).
2. Apuesta → se descuenta de la wallet y se remite el ticket (`Remitido` + HUC).
3. Ves el resultado del juego.
4. Sales → se cierra el ticket con el mismo HUC y, si ganaste, el premio vuelve a la wallet.
