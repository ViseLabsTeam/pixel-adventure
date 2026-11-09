import type { GameView } from "@umbral/protocol";

export function GameOver({
  game,
  onHome,
}: {
  game: GameView;
  onHome: () => void;
}) {
  return (
    <main className="game-over" aria-labelledby="game-over-title">
      <div className="game-over-card">
        <span className="game-over-mark" aria-hidden="true">
          ✦
        </span>
        <p className="game-over-eyebrow">FIN DE LA EXPEDICIÓN</p>
        <h1 id="game-over-title">El grupo ha caído</h1>
        <p className="game-over-message">
          Ningún viajero sobrevivió. El umbral guarda sus secretos.
        </p>
        <p className="game-over-round">Ronda {game.round}</p>
        <button className="game-over-action" onClick={onHome}>
          Volver al inicio
        </button>
      </div>
    </main>
  );
}
