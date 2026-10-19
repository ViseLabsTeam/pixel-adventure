import { lazy, Suspense, useState } from "react";
import { classes, guide } from "@umbral/content";
import type { GameView, Session } from "@umbral/protocol";
import { Health, type Preferences, CopyButton } from "../ui/shared";
import { ResourceBar } from "../ui/resource-bar";
import { Recovery } from "./recovery";
import type { CampaignConnection } from "../connection/use-campaign";
import { useImpactPresentation } from "../ui/use-impact-presentation";
import { TableDiceSpotlight } from "./table-dice-spotlight";
const GameBoard = lazy(() => import("../board/game-board"));
export function Table({
  connection,
  session,
  preferences,
}: {
  connection: CampaignConnection;
  session: Session;
  preferences: Preferences;
}) {
  const { game } = connection;
  const [showLog, setShowLog] = useState(true);
  const { prior, resultHidden, attackInFlight } = useImpactPresentation(game);
  if (!game) return null;
  const movementRolling = Boolean(
    game.animationPending &&
      prior &&
      game.events.some(
        (event) =>
          event.kind === "DICE" &&
          !prior.events.some((old) => old.id === event.id),
      ),
  );
  const visibleEvents =
    (resultHidden || movementRolling) && prior ? prior.events : game.events;
  const active = game.players.find((p) => p.id === game.activePlayerId);
  return (
    <main className="table-view">
      <aside className="table-sidebar" aria-label="Información de la mesa">
        <div className="table-heading">
          <span className="eyebrow">EXPEDICIÓN · CAPÍTULO I</span>
          <h1>El patio del umbral</h1>
          <div className="table-code">
            MESA <b>{game.code}</b>
            <span>RONDA {game.round}</span>
          </div>
        </div>
        {connection.error && (
          <div className="table-alert" role="alert">
            {connection.error}
            <button onClick={connection.retry}>Reintentar</button>
          </div>
        )}
        {game.paused && (
          <p className="table-alert">
            Esperando al jugador activo. Su turno está guardado.
          </p>
        )}
        <section className="party-bar" aria-label="Personajes de la partida">
          {game.players.map((player) => (
            <article
              key={player.id}
              className={player.id === active?.id ? "active" : ""}
              data-player-id={player.id}
            >
              <img src={classes[player.classId].portrait} alt="" />
              <div>
                <h3>
                  {player.name}
                  <span>
                    {player.id === active?.id
                      ? "SU TURNO"
                      : !game.onlinePlayerIds.includes(player.id)
                        ? "SIN CONEXIÓN"
                        : classes[player.classId].name}
                  </span>
                </h3>
                <Health
                  hp={
                    attackInFlight && prior
                      ? (prior.players.find((old) => old.id === player.id)
                          ?.hp ?? player.hp)
                      : player.hp
                  }
                  max={player.stats.maxHp}
                />
                <small>
                  {attackInFlight && prior
                    ? (prior.players.find((old) => old.id === player.id)?.hp ??
                      player.hp)
                    : player.hp}{" "}
                  / {player.stats.maxHp} VIDA
                </small>
                <ResourceBar
                  classId={player.classId}
                  value={player.resource}
                  compact
                />
              </div>
            </article>
          ))}
        </section>
        <section className="guide-mini">
          <img src={guide.portrait} alt="El Anfitrión" />
          <div>
            <span className="eyebrow">EL ANFITRIÓN</span>
            <p>
              {game.status === "WON"
                ? "«Hay muchas puertas esperándolos.»"
                : game.status === "LOST"
                  ? "«Quizás la próxima historia sea distinta.»"
                  : "«Las ruinas recuerdan a quienes caminan solos.»"}
            </p>
          </div>
        </section>
        <section className="table-chronicle">
          <div className="panel-heading">
            <h2>Crónica de la mesa</h2>
            <button
              className="text-link"
              aria-label={showLog ? "Ocultar crónica" : "Mostrar crónica"}
              onClick={() => setShowLog(!showLog)}
            >
              {showLog ? "−" : "+"}
            </button>
          </div>
          {showLog && (
            <ol className="event-log">
              {visibleEvents
                .slice(-5)
                .reverse()
                .map((event) => (
                  <li key={event.id}>
                    <span>
                      {event.kind === "DICE"
                        ? "⚄"
                        : event.kind === "ATTACK"
                          ? "⚔"
                          : "✦"}
                    </span>
                    <p>
                      {event.text}
                      {event.dice && (
                        <small>DADOS · {event.dice.join(" + ")}</small>
                      )}
                    </p>
                  </li>
                ))}
            </ol>
          )}
        </section>
        <div className="table-save">
          <span>● Autoguardado · revisión {game.revision}</span>
          <small>El último estado confirmado se conserva al salir.</small>
        </div>
        {session.role === "COORDINATOR" && (
          <Recovery game={game} session={session} />
        )}
        <CopyButton
          text={location.origin + "/#/join/" + game.code}
          label="Copiar invitación"
        />
      </aside>
      <section className="board-panel" aria-label="Mapa compartido">
        <div className="board-status">
          <span>
            <i />
            {game.status === "WON"
              ? "ENCUENTRO COMPLETADO"
              : game.status === "LOST"
                ? "EXPEDICIÓN TERMINADA"
                : game.paused
                  ? "ESPERANDO RECONEXIÓN"
                  : "TURNO DE " + active?.name.toUpperCase()}
          </span>
          <span>
            {movementRolling
              ? "DADOS GIRANDO"
              : connection.animating
                ? "ESPERANDO A QUE TERMINE"
                : game.actionUsed
                  ? "ACCIÓN REALIZADA"
                  : game.phase === "MOVEMENT"
                    ? "MOVIMIENTO · " + game.movementLeft + " CASILLAS"
                    : "FASE DE ACCIÓN"}
          </span>
        </div>
        <Suspense
          fallback={<div className="loading">Desplegando el tablero…</div>}
        >
          <GameBoard
            game={game}
            preferences={preferences}
            onAnimationComplete={connection.animationComplete}
          />
        </Suspense>
        <TableDiceSpotlight
          game={game}
          resultHidden={resultHidden}
          reducedMotion={preferences.reducedMotion}
        />
        <div className="board-legend">
          <span>✦ Enemigo</span>
          <span>▰ Cofre</span>
          <span>✧ Fuente</span>
          <span>◇ Salida</span>
        </div>
      </section>
    </main>
  );
}
