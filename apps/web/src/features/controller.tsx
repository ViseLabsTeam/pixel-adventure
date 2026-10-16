import { useEffect, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Dices,
  Swords,
  Shield,
  Sparkles,
  Backpack,
  Hand,
  Shirt,
  Footprints,
  FlaskConical,
  CircleHelp,
  ChevronRight,
} from "lucide-react";
import { classes, equipmentSlots, abilities } from "@umbral/content";
import type { Session, GameView } from "@umbral/protocol";
import type { CampaignConnection } from "../connection/use-campaign";
import { ResourceBar } from "../ui/resource-bar";
import { Health } from "../ui/shared";
export function Controller({
  connection,
  session,
}: {
  connection: CampaignConnection;
  session: Session;
}) {
  const { game, connected, pending, command, select } = connection;
  const [target, setTarget] = useState("");
  useEffect(() => {
    if (game && !game.enemies.some((e) => e.id === target && e.hp > 0)) {
      const next = game.enemies.find((e) => e.hp > 0)?.id ?? "";
      setTarget(next);
      if (next) select(next);
    }
  }, [game?.enemies.map((e) => `${e.id}:${e.hp}`).join()]);
  if (!game) return null;
  const player = game.players.find((p) => p.id === session.playerId);
  if (!player) return <p>No encontramos tu personaje.</p>;
  const current = game.players.find((p) => p.id === game.activePlayerId),
    active = current?.id === player.id && game.status === "ACTIVE";
  const enabled =
    active && connected && !pending && !connection.animating && !game.paused && !game.storageError;
  const canMove = enabled && game.phase === "MOVEMENT" && game.movementLeft > 0,
    canAct = enabled && !game.actionUsed;
  const lastDice = [...game.events].reverse().find((e) => e.dice)?.dice;
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
      <div className={`turn-banner ${active ? "my-turn" : ""}`}>
        <span className="live-dot" />
        <div>
          <strong>
            {connection.animating ? "Animación en curso" : game.status === "WON"
              ? "Encuentro completado"
              : game.status === "LOST"
                ? "La expedición ha caído"
                : active
                  ? "Es tu turno"
                  : `Turno de ${current?.name ?? "la mesa"}`}
          </strong>
          <small>
            RONDA {game.round} ·{" "}
            {connection.animating ? "ESPERANDO A QUE TERMINE" : game.actionUsed
              ? "ACCIÓN REALIZADA"
              : game.phase === "MOVEMENT"
                ? "MOVIMIENTO"
                : "ACCIÓN"}
          </small>
        </div>
        <span className="pill">#{player.slot + 1}</span>
      </div>
      <section className={`character-card ${player.classId}`}>
        <div className="character-copy">
          <span className="eyebrow">
            {classes[player.classId].name} · NIVEL 1
          </span>
          <h1>{player.name}</h1>
          <p>{classes[player.classId].title}</p>
          <Health hp={player.hp} max={player.stats.maxHp} label />
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
      <p className="demo-note">
        <CircleHelp size={12} /> Estadísticas de demo. El equipo suma sus
        bonificaciones.
      </p>
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
            <Dices size={29} />
            <div>
              <b>
                {game.movementRoll === null
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
              onClick={() => command({ type: "MOVE_STEP", direction: "LEFT" })}
            >
              <ArrowLeft />
            </button>
            <span className="dpad-center">✦</span>
            <button
              className="right"
              aria-label="Mover derecha"
              disabled={!canMove}
              onClick={() => command({ type: "MOVE_STEP", direction: "RIGHT" })}
            >
              <ArrowRight />
            </button>
            <button
              className="down"
              aria-label="Mover abajo"
              disabled={!canMove}
              onClick={() => command({ type: "MOVE_STEP", direction: "DOWN" })}
            >
              <ArrowDown />
            </button>
          </div>
          <p className="muted centered">
            Mirá el desplazamiento en la pantalla de la mesa.
          </p>
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
            {game.enemies
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
            {!game.enemies.some((e) => e.hp > 0) && (
              <p className="muted">El patio está despejado.</p>
            )}
          </div>
          <button
            className="button gold full attack-roll"
            disabled={!canAct || !target || !game.targets[target]?.valid}
            onClick={() => command({ type: "ATTACK", targetId: target })}
          >
            <span className="die-label">d20</span>
            <span className="die-label">d6</span>Tirar ataque
          </button>
          <small className="muted">
            Impacto, daño y dados se resuelven al confirmar.
          </small>
          <p className="muted">Ataque básico: +1/3 de la barra.</p>
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
        </section>
      </div>
      <section className="panel interactions">
        <div className="panel-heading">
          <h2>A tu alrededor</h2>
          <span>ZONAS Y COFRES</span>
        </div>
        {[
          ...game.chests.map((c) => ({
            ...c,
            name: c.opened ? "Cofre abierto" : "Cofre sellado",
          })),
          ...game.zones,
        ].map((object) => (
          <button
            key={object.id}
            className="button small"
            disabled={
              !canAct ||
              Math.abs(player.x - object.x) + Math.abs(player.y - object.y) > 1
            }
            onClick={() => command({ type: "INTERACT", targetId: object.id })}
          >
            {object.name}
          </button>
        ))}
        <p className="muted">
          La fuente recupera vida una vez. Los cofres se abren al limpiar el
          patio.
        </p>
      </section>
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
        <p className="muted">
          En esta demo, equipar, desequipar o usar un objeto consume la acción.
        </p>
      </section>
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
