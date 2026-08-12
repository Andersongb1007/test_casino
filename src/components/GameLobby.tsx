import { CASINO_GAMES, type GameMeta } from "@/lib/types"
import { EnterGame } from "@/components/EnterGame"
import { IMAGES } from "@/lib/images"

export function GameLobby({ onPick }: { onPick: (game: GameMeta) => void }) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border shadow-sm">
        <img
          src={IMAGES.casinoHero}
          alt="Casino"
          className="h-40 w-full object-cover md:h-52"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CASINO_GAMES.map((game) => (
          <button
            key={game.id}
            type="button"
            onClick={() => onPick(game)}
            className="group overflow-hidden rounded-xl border-2 border-transparent bg-card text-left shadow-sm transition hover:border-primary/40"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={game.image}
                alt={game.name}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <p className="font-semibold">{game.name}</p>
                <p className="text-xs text-white/80">{game.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function PendingEnter({
  game,
  onBack,
}: {
  game: GameMeta
  onBack: () => void
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-primary hover:underline"
      >
        ← Volver al casino
      </button>
      <EnterGame game={game} />
    </div>
  )
}
