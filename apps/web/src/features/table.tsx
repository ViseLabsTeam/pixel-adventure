import { lazy, Suspense, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { classes } from "@umbral/content";
import type { Session } from "@umbral/protocol";
import { Health, type Preferences, CopyButton } from "../ui/shared";
import { ResourceBar } from "../ui/resource-bar";
import { Recovery } from "./recovery";
import type { CampaignConnection } from "../connection/use-campaign";
import { useImpactPresentation } from "../ui/use-impact-presentation";
import { TableDiceSpotlight } from "./table-dice-spotlight";
import { recentActionEvents } from "./table-chronicle";
import {
  chooseInvitationOrigin,
  invitationUrl,
  loadInvitationOrigin,
  saveInvitationOrigin,
} from "../connection/invitation";

const GameBoard = lazy(() => import("../board/game-board"));

export function Table({
  connection,
  session,
  preferences,
  onHome,
  onSettings,
}: {
  connection: CampaignConnection;
  session: Session;
  preferences: Preferences;
  onHome: () => void;
  onSettings: () => void;
}) {
  const { game } = connection;
  const [menuOpen, setMenuOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [shareOrigin, setShareOrigin] = useState("");

  useEffect(() => {
    if (!game) return;
    setShareOrigin(
      chooseInvitationOrigin({
        mode: game.mode,
        currentOrigin: location.origin,
        configuredOrigin:
          game.mode === "ONLINE"
            ? import.meta.env.VITE_ONLINE_ORIGIN
            : import.meta.env.VITE_SHARE_ORIGIN,
        savedOrigin: loadInvitationOrigin(game.id),
      }),
    );
  }, [game?.id, game?.mode]);

  useEffect(() => {
    if (!game) return;
    const receivedAt = performance.now();
    const update = () => {
      const remaining =
        game.turnDeadlineAt === null
          ? game.turnRemainingMs
          : Math.max(
              0,
              game.turnDeadlineAt -
                game.serverNow -
                (performance.now() - receivedAt),
            );
      setSecondsLeft(Math.ceil(remaining / 1000));
    };
    update();
    const timer = window.setInterval(update, 200);
    return () => window.clearInterval(timer);
  }, [game]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const { prior, resultHidden, attackInFlight } = useImpactPresentation(game);
  if (!game) return null;
  const joinUrl =
    invitationUrl(shareOrigin, game.code, game.mode) ??
    (game.mode === "LOCAL" ? `${location.origin}/#/join/${game.code}` : null);

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
  const actionEvents = recentActionEvents(visibleEvents);
  const active = game.players.find(
    (player) => player.id === game.activePlayerId,
  );
  const movementLabel = movementRolling
    ? "DADOS GIRANDO"
    : game.phase === "MOVEMENT"
      ? game.movementRoll === null
        ? "MOVIMIENTO · TIRADA PENDIENTE"
        : `MOVIMIENTO · ${game.movementLeft} CASILLAS`
      : connection.animating
        ? "ESPERANDO ANIMACIÓN"
        : game.actionUsed
          ? "ACCIÓN REALIZADA"
          : "FASE DE ACCIÓN";

  return (
    <main className="table-view">
      <section className="board-panel" aria-label="Mapa compartido">
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
      </section>

      <header className="table-hud" aria-label="Estado de la mesa">
        <div className="table-turn-summary">
          <span className="table-round">RONDA {game.round}</span>
          <strong>
            {game.status === "WON"
              ? "ENCUENTRO COMPLETADO"
              : game.status === "LOST"
                ? "EXPEDICIÓN TERMINADA"
                : `TURNO DE ${active?.name ?? "—"}`}
          </strong>
          {game.status === "ACTIVE" && (
            <>
              <span
                className="turn-countdown"
                role="timer"
                aria-label="Tiempo restante del turno"
                aria-live="off"
              >
                {game.turnDeadlineAt === null
                  ? `PAUSA · 00:${String(secondsLeft).padStart(2, "0")}`
                  : `00:${String(secondsLeft).padStart(2, "0")}`}
              </span>
              <span className="table-movement" title={movementLabel}>
                {movementLabel}
              </span>
            </>
          )}
        </div>

        <section className="party-bar" aria-label="Personajes de la partida">
          {game.players.map((player) => {
            const hp =
              attackInFlight && prior
                ? (prior.players.find((old) => old.id === player.id)?.hp ??
                  player.hp)
                : player.hp;
            const playerState =
              player.id === active?.id
                ? "SU TURNO"
                : !game.onlinePlayerIds.includes(player.id)
                  ? "SIN CONEXIÓN"
                  : classes[player.classId].name;
            return (
              <article
                key={player.id}
                className={player.id === active?.id ? "active" : ""}
                data-player-id={player.id}
                aria-label={`${player.name}, ${playerState}, ${hp} de ${player.stats.maxHp} de vida`}
              >
                <img src={classes[player.classId].portrait} alt="" />
                <div className="table-player-details">
                  <div className="table-player-heading">
                    <h2 title={player.name}>{player.name}</h2>
                    <span title={playerState}>{playerState}</span>
                  </div>
                  <Health hp={hp} max={player.stats.maxHp} />
                  <small>
                    {hp} / {player.stats.maxHp} VIDA
                  </small>
                  <ResourceBar
                    classId={player.classId}
                    value={player.resource}
                    compact
                  />
                </div>
              </article>
            );
          })}
        </section>

        <button
          className="table-menu-toggle icon-button"
          aria-label={
            menuOpen ? "Cerrar opciones de la mesa" : "Opciones de la mesa"
          }
          aria-controls="table-menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {connection.error && (
        <div className="table-alert" role="alert">
          {connection.error}
          <button onClick={connection.retry}>Reintentar</button>
        </div>
      )}

      {actionEvents.length > 0 && (
        <section className="table-chronicle" aria-label="Crónica de la mesa">
          <span className="eyebrow">CRÓNICA DE LA MESA</span>
          <ol className="event-log" aria-live="polite">
            {actionEvents.map((event) => (
              <li key={event.id}>
                <span aria-hidden="true">
                  {event.kind === "DICE"
                    ? "⚄"
                    : event.kind.startsWith("ATTACK") || event.kind === "ENEMY"
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
        </section>
      )}

      {menuOpen && (
        <button
          className="table-menu-backdrop"
          aria-label="Cerrar opciones de la mesa"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside id="table-menu" className="table-menu" hidden={!menuOpen}>
        <h2>Opciones de la mesa</h2>
        <div className="table-code">
          MESA {game.mode === "ONLINE" ? "ONLINE" : "LOCAL"} <b>{game.code}</b>
        </div>
        {joinUrl && <CopyButton text={joinUrl} label="Copiar invitación" />}
        {session.role === "COORDINATOR" && (
          <label className="invitation-address">
            {game.mode === "ONLINE"
              ? "Dirección pública para controles"
              : "Dirección para celulares"}
            <input
              value={shareOrigin}
              onChange={(event) => {
                setShareOrigin(event.target.value);
                saveInvitationOrigin(game.id, game.mode, event.target.value);
              }}
              placeholder={
                game.mode === "ONLINE"
                  ? "https://nombre-temporal.trycloudflare.com"
                  : "http://192.168.1.10:8088"
              }
            />
          </label>
        )}
        {game.mode === "ONLINE" && !joinUrl && (
          <p role="alert">Ingresá la dirección HTTPS del enlace temporal.</p>
        )}
        {session.role === "COORDINATOR" && (
          <Recovery game={game} session={session} />
        )}
        <button
          className="button small"
          onClick={() => {
            setMenuOpen(false);
            onSettings();
          }}
        >
          Configuración
        </button>
        <button className="button small" onClick={onHome}>
          Volver al inicio
        </button>
        <div className="table-menu-meta">
          <span>Autoguardado · revisión {game.revision}</span>
          <span>✦ Enemigo · ▰ Cofre · ✧ Fuente · ◇ Salida</span>
        </div>
      </aside>
    </main>
  );
}
