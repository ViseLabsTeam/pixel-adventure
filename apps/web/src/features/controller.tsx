import { useEffect, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Swords,
  Shield,
  Sparkles,
  Backpack,
  Hand,
  Shirt,
  Footprints,
  FlaskConical,
  ChevronRight,
} from "lucide-react";
import { classes, equipmentSlots, abilities } from "@umbral/content";
import type { Session, GameView } from "@umbral/protocol";
import type { CampaignConnection } from "../connection/use-campaign";
import { ResourceBar } from "../ui/resource-bar";
import { Health } from "../ui/shared";
import { useImpactPresentation } from "../ui/use-impact-presentation";
import { DiceRoll } from "../ui/dice-roll";
import type { Preferences } from "../ui/shared";
export function Controller({
  connection,
  session,
  preferences,
}: {
  connection: CampaignConnection;
  session: Session;
  preferences: Preferences;
}) {
  const { game, connected, pending, command, select } = connection;
  const [target, setTarget] = useState("");
  const [view, setView] = useState<"character" | "inventory">("character");
  const { prior, resultHidden, attackInFlight } = useImpactPresentation(game);
  const newRoll =
    game?.animationPending && prior
      ? [...game.events]
          .reverse()
          .find(
            (event) =>
              !prior.events.some((old) => old.id === event.id) &&
              ((event.kind === "DICE" &&
                game.activePlayerId === session.playerId) ||
                (event.actorId === session.playerId && !!event.targetId)),
          )
      : undefined;
  const [recentRoll, setRecentRoll] = useState<
    GameView["events"][number] | null
  >(null);
  useEffect(() => {
    if (!game || game.activePlayerId !== session.playerId) {
      setRecentRoll(null);
    } else if (newRoll) {
      setRecentRoll(newRoll);
    }
  }, [game?.activePlayerId, newRoll?.id, session.playerId]);
  useEffect(() => {
    if (attackInFlight) return;
    if (game && !game.enemies.some((e) => e.id === target && e.hp > 0)) {
      const next = game.enemies.find((e) => e.hp > 0)?.id ?? "";
      setTarget(next);
      if (next) select(next);
    }
  }, [game?.enemies.map((e) => `${e.id}:${e.hp}`).join(), attackInFlight]);
  if (!game) return null;
  const player = game.players.find((p) => p.id === session.playerId);
  if (!player) return <p>No encontramos tu personaje.</p>;
  const shownHp =
    attackInFlight &&
    prior &&
    game.events.some(
      (event) =>
        event.actorId &&
        event.targetId === player.id &&
        !prior.events.some((old) => old.id === event.id),
    )
      ? (prior.players.find((old) => old.id === player.id)?.hp ?? player.hp)
      : player.hp;
  const current = game.players.find((p) => p.id === game.activePlayerId),
    active = current?.id === player.id && game.status === "ACTIVE";
  const enabled =
    active &&
    connected &&
    !pending &&
    !connection.animating &&
    !game.paused &&
    !game.storageError;
  const canMove = enabled && game.phase === "MOVEMENT" && game.movementLeft > 0,
    canAct = enabled && !game.actionUsed;
  const shownRoll =
    newRoll ?? (game.activePlayerId === player.id ? recentRoll : null);
  const movementRolling = newRoll?.kind === "DICE";
  const visibleEvents =
    (movementRolling || resultHidden) && prior ? prior.events : game.events;
  const lastDice = [...visibleEvents].reverse().find((e) => e.dice)?.dice;
  const shownEnemies = game.enemies.map((enemy) => ({
    ...enemy,
    hp:
      attackInFlight && prior
        ? (prior.enemies.find((old) => old.id === enemy.id)?.hp ?? enemy.hp)
        : enemy.hp,
  }));
  const nearby = [
    ...game.chests.map((chest) => ({
      ...chest,
      name: chest.opened ? "Cofre abierto" : "Cofre sellado",
    })),
    ...game.zones,
  ].filter(
    (object) =>
      Math.abs(player.x - object.x) + Math.abs(player.y - object.y) <= 1,
  );
  const itemIcon = (item: GameView["items"][string] | undefined) =>
    item?.heal ? (
      <FlaskConical />
    ) : item?.slot === "gloves" ? (
      <Hand />
    ) : item?.slot === "pants" ? (
      <Footprints />
    ) : item?.slot === "chest" ? (
      <Shirt />
    ) : (
      <Shield />
    );
  return (
    <main className="controller">
      <nav
        className="controller-tabs"
        role="tablist"
        aria-label="Secciones del control"
      >
        <button
          id="tab-character"
          role="tab"
          aria-selected={view === "character"}
          aria-controls="panel-character"
          onClick={() => setView("character")}
        >
          <Swords size={16} /> Personaje
        </button>
        <button
          id="tab-inventory"
          role="tab"
          aria-selected={view === "inventory"}
          aria-controls="panel-inventory"
          onClick={() => setView("inventory")}
        >
          <Backpack size={16} /> Inventario
          <small>{player.inventory.filter(Boolean).length}/4</small>
        </button>
      </nav>
      <div
        id="panel-character"
        className="controller-screen character-screen"
        role="tabpanel"
        aria-labelledby="tab-character"
        hidden={view !== "character"}
      >
        <div className={`turn-banner ${active ? "my-turn" : ""}`}>
          <span className="live-dot" />
          <div>
            <strong>
              {connection.animating
                ? "Animación en curso"
                : game.status === "WON"
                  ? "Encuentro completado"
                  : game.status === "LOST"
                    ? "La expedición ha caído"
                    : active
                      ? "Es tu turno"
                      : `Turno de ${current?.name ?? "la mesa"}`}
            </strong>
            <small>
              RONDA {game.round} ·{" "}
              {connection.animating
                ? "ESPERANDO A QUE TERMINE"
                : game.actionUsed
                  ? "ACCIÓN REALIZADA"
                  : game.phase === "MOVEMENT"
                    ? "MOVIMIENTO"
                    : "ACCIÓN"}
            </small>
          </div>
          <span className="pill">#{player.slot + 1}</span>
        </div>
        {shownRoll && (
          <DiceRoll
            key={shownRoll.id}
            event={shownRoll}
            kind={shownRoll.kind === "DICE" ? "movement" : "attack"}
            reveal={
              shownRoll.kind === "DICE" ? !connection.animating : !resultHidden
            }
            reducedMotion={preferences.reducedMotion}
          />
        )}
        <section className={`character-card ${player.classId}`}>
          <div className="character-copy">
            <span className="eyebrow">
              {classes[player.classId].name} · NIVEL 1
            </span>
            <h1>{player.name}</h1>
            <p>{classes[player.classId].title}</p>
            <Health hp={shownHp} max={player.stats.maxHp} label />
          </div>
          <img
            src={classes[player.classId].portrait}
            alt={classes[player.classId].name}
          />
        </section>
        <ResourceBar classId={player.classId} value={player.resource} />
        <div className="stat-grid">
          {[
            ["Precisión", player.stats.accuracy],
            ["Esquive", player.stats.dodge],
            ["Agilidad", player.stats.agility],
            ["Defensa", player.stats.defense],
            ["Res. mágica", player.stats.resistance],
            ["Alcance", player.stats.range],
          ].map(([label, value]) => (
            <div key={label}>
              <b>{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="control-columns">
          <section className="panel movement-panel">
            <div className="panel-heading">
              <h2>Movimiento</h2>
              <span>{game.movementLeft} CASILLAS</span>
            </div>
            <button
              className="dice-button"
              disabled={
                !enabled ||
                game.phase !== "MOVEMENT" ||
                game.movementRoll !== null
              }
              onClick={() => command({ type: "ROLL_MOVEMENT" })}
            >
              <img
                className="die-button-icon"
                src="/assets/dados/generated/d6.png"
                alt=""
              />
              <div>
                <b>
                  {game.movementRoll === null || movementRolling
                    ? "Tirar movimiento"
                    : `d6 · ${game.movementRoll}`}
                </b>
                <small>2 casillas + bonificación del dado</small>
              </div>
            </button>
            <div className="dpad">
              <button
                className="up"
                aria-label="Mover arriba"
                disabled={!canMove}
                onClick={() => command({ type: "MOVE_STEP", direction: "UP" })}
              >
                <ArrowUp />
              </button>
              <button
                className="left"
                aria-label="Mover izquierda"
                disabled={!canMove}
                onClick={() =>
                  command({ type: "MOVE_STEP", direction: "LEFT" })
                }
              >
                <ArrowLeft />
              </button>
              <span className="dpad-center">✦</span>
              <button
                className="right"
                aria-label="Mover derecha"
                disabled={!canMove}
                onClick={() =>
                  command({ type: "MOVE_STEP", direction: "RIGHT" })
                }
              >
                <ArrowRight />
              </button>
              <button
                className="down"
                aria-label="Mover abajo"
                disabled={!canMove}
                onClick={() =>
                  command({ type: "MOVE_STEP", direction: "DOWN" })
                }
              >
                <ArrowDown />
              </button>
            </div>
            <button
              className="text-link"
              disabled={!enabled || game.phase !== "MOVEMENT"}
              onClick={() => command({ type: "FINISH_MOVEMENT" })}
            >
              Terminar movimiento <ChevronRight size={15} />
            </button>
          </section>
          <section className="panel attack-panel">
            <div className="panel-heading">
              <h2>Tu acción</h2>
              <span>UNA POR TURNO</span>
            </div>
            <div className="attack-name">
              <Swords />
              <div>
                <h3>{classes[player.classId].attack}</h3>
                <small>
                  Alcance: {player.stats.range}{" "}
                  {player.stats.range === 1 ? "casilla" : "casillas"}
                </small>
              </div>
            </div>
            <label className="field-label">Elegí un objetivo</label>
            <div className="target-list">
              {shownEnemies
                .filter((e) => e.hp > 0)
                .map((enemy) => (
                  <button
                    key={enemy.id}
                    aria-pressed={target === enemy.id}
                    className={target === enemy.id ? "selected" : ""}
                    onClick={() => {
                      setTarget(enemy.id);
                      select(enemy.id);
                    }}
                  >
                    <span>
                      {enemy.name}
                      <small>
                        {enemy.hp}/{enemy.maxHp} vida
                      </small>
                    </span>
                    <b>
                      {game.targets[enemy.id]?.valid
                        ? `${game.targets[enemy.id].chance}%`
                        : "Lejos"}
                    </b>
                  </button>
                ))}
              {!shownEnemies.some((e) => e.hp > 0) && (
                <p className="muted">El patio está despejado.</p>
              )}
            </div>
            <button
              className="button gold full attack-roll"
              disabled={!canAct || !target || !game.targets[target]?.valid}
              onClick={() => command({ type: "ATTACK", targetId: target })}
            >
              <img
                className="die-button-icon"
                src="/assets/dados/generated/d20.png"
                alt=""
              />
              <img
                className="die-button-icon"
                src="/assets/dados/generated/d6.png"
                alt=""
              />
              Tirar ataque
            </button>
            <div className="special-actions">
              {(["special", "ultimate"] as const).map((ability) => (
                <button
                  key={ability}
                  className="button ability-button"
                  disabled={
                    !canAct ||
                    !game.targets[target]?.valid ||
                    player.resource < (ability === "special" ? 100 : 300)
                  }
                  onClick={() =>
                    command({ type: "ATTACK", targetId: target, ability })
                  }
                >
                  <Sparkles size={16} />
                  <span>
                    {abilities[player.classId][ability]}
                    <small>
                      {ability === "special"
                        ? "Especial · consume 1/3"
                        : "Ulti · consume 3/3"}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            {nearby.length > 0 && active && !game.actionUsed && (
              <div
                className="nearby-actions"
                aria-label="Interacciones disponibles"
              >
                {nearby.map((object) => (
                  <button
                    key={object.id}
                    className="button small"
                    disabled={!canAct}
                    onClick={() =>
                      command({ type: "INTERACT", targetId: object.id })
                    }
                  >
                    Interactuar: {object.name}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      <div
        id="panel-inventory"
        className="controller-screen inventory-screen"
        role="tabpanel"
        aria-labelledby="tab-inventory"
        hidden={view !== "inventory"}
      >
        <section className="panel inventory">
          <div className="panel-heading">
            <h2>
              <Backpack size={18} /> Inventario
            </h2>
            <span>{player.inventory.filter(Boolean).length} / 4 ESPACIOS</span>
          </div>
          <div className="bag-grid">
            {player.inventory.map((id, index) => {
              const item = id ? game.items[id] : undefined;
              return (
                <button
                  key={index}
                  className={`bag-slot ${item ? "filled" : ""}`}
                  title={item?.name ?? "Espacio vacío"}
                  disabled={!canAct || !item}
                  onClick={() =>
                    item &&
                    command(
                      item.heal || item.restoreResource
                        ? { type: "USE_ITEM", itemId: item.id }
                        : { type: "EQUIP", itemId: item.id },
                    )
                  }
                >
                  <span className="bag-index">0{index + 1}</span>
                  {item ? itemIcon(item) : <PlusMark />}
                  <span>{item?.name ?? "Vacío"}</span>
                  {item && (
                    <small>
                      {item.heal
                        ? `Usar · +${item.heal} vida y +1/3 de barra`
                        : "Equipar"}
                    </small>
                  )}
                </button>
              );
            })}
          </div>
          <div className="panel-heading equipment-title">
            <h3>Equipo</h3>
            <span>SOLO MODIFICA ESTADÍSTICAS</span>
          </div>
          <div className="equipment-grid">
            {Object.entries(equipmentSlots).map(([slot, label]) => {
              const id = player.equipment[slot as keyof typeof equipmentSlots],
                item = id ? game.items[id] : undefined;
              return (
                <button
                  className={`equipment-slot ${item ? "filled" : ""}`}
                  key={slot}
                  disabled={!canAct || !item}
                  onClick={() =>
                    command({
                      type: "UNEQUIP",
                      slot: slot as keyof typeof equipmentSlots,
                    })
                  }
                >
                  <span>{label}</span>
                  {itemIcon(item)}
                  <b>{item?.name ?? "Sin equipar"}</b>
                  {item && (
                    <small>
                      +{item.defense} DEF · +{item.resistance} RES
                    </small>
                  )}
                </button>
              );
            })}
          </div>
          <div className="inventory-portrait" aria-hidden="true">
            <img src={classes[player.classId].portrait} alt="" />
          </div>
        </section>
      </div>
      <div className="controller-footer">
        <span>
          {lastDice
            ? `Últimos dados: ${lastDice.join(" · ")}`
            : "Los dados esperan su momento."}
        </span>
        <button
          className="button gold"
          disabled={!enabled}
          onClick={() => command({ type: "END_TURN" })}
        >
          Finalizar turno <ArrowRight size={16} />
        </button>
      </div>
    </main>
  );
}
function PlusMark() {
  return <span className="empty-plus">+</span>;
}
