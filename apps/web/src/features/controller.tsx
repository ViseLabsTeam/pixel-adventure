import { useEffect, useState, type CSSProperties } from "react";
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
  Crosshair,
  Wind,
  WandSparkles,
  MoveHorizontal,
  Eye,
} from "lucide-react";
import { classes, equipmentSlots, abilities } from "@umbral/content";
import type { Session, GameView } from "@umbral/protocol";
import type { CampaignConnection } from "../connection/use-campaign";
import { ResourceBar } from "../ui/resource-bar";
import { Health } from "../ui/shared";
import { useImpactPresentation } from "../ui/use-impact-presentation";
import { DiceRoll } from "../ui/dice-roll";
import { InventoryDialog, type InventorySelection } from "./inventory-dialog";
import { perceivedEnemies, perceptionRange } from "./perceived-enemies";
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
  const [selectedAbility, setSelectedAbility] = useState<
    "basic" | "special" | "ultimate"
  >("basic");
  const [view, setView] = useState<"character" | "inventory">("character");
  const [inventorySelection, setInventorySelection] =
    useState<InventorySelection | null>(null);
  useEffect(() => {
    setInventorySelection(null);
  }, [game?.revision, game?.activePlayerId]);
  const { prior, resultHidden, attackInFlight } = useImpactPresentation(game);
  const newRoll =
    game && (game.animationPending || game.animationUntil > game.serverNow)
      ? [...game.events]
          .reverse()
          .find(
            (event) =>
              event.id.startsWith(`${game.id}:${game.revision}:`) &&
              event.actorId === session.playerId &&
              ["DICE", "ATTACK_D20", "ATTACK_MISS_ROLL", "ATTACK_D6"].includes(
                event.kind,
              ),
          )
      : undefined;
  const [recentRoll, setRecentRoll] = useState<
    GameView["events"][number] | null
  >(null);
  const [resolvedRollId, setResolvedRollId] = useState<string | null>(null);
  const [dismissedRollId, setDismissedRollId] = useState<string | null>(null);
  useEffect(
    () => setSelectedAbility("basic"),
    [game?.activePlayerId, game?.round],
  );
  useEffect(() => {
    if (!resolvedRollId) return;
    const timer = window.setTimeout(
      () => setDismissedRollId(resolvedRollId),
      1250,
    );
    return () => window.clearTimeout(timer);
  }, [resolvedRollId]);
  useEffect(() => {
    if (!game || game.activePlayerId !== session.playerId) {
      setRecentRoll(null);
    } else if (newRoll) {
      setRecentRoll(newRoll);
    }
  }, [game?.activePlayerId, newRoll?.id, session.playerId]);
  const actor = game?.players.find((player) => player.id === session.playerId);
  const enemiesInRange =
    actor && game ? perceivedEnemies(actor, game.enemies) : [];
  const enemyIdsInRange = enemiesInRange.map((enemy) => enemy.id);
  useEffect(() => {
    if (!game || !actor || attackInFlight || game.pendingAttack) return;
    const next = enemyIdsInRange.includes(target)
      ? target
      : (enemyIdsInRange[0] ?? "");
    if (next !== target) setTarget(next);
    if (
      game.activePlayerId === actor.id &&
      game.selectedTarget !== (next || null)
    )
      select(next || null);
  }, [
    game?.revision,
    game?.activePlayerId,
    game?.selectedTarget,
    actor?.x,
    actor?.y,
    enemyIdsInRange.join("|"),
    attackInFlight,
    game?.pendingAttack?.targetId,
  ]);
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
    !game.storageError;
  const canMove = enabled && game.phase === "MOVEMENT" && game.movementLeft > 0,
    canAct = enabled && !game.actionUsed;
  const selectedItem = inventorySelection
    ? game.items[inventorySelection.itemId]
    : undefined;
  const replacedId = selectedItem?.slot
    ? player.equipment[selectedItem.slot]
    : null;
  const shownRoll =
    newRoll ?? (game.activePlayerId === player.id ? recentRoll : null);
  const movementRolling = newRoll?.kind === "DICE";
  const visibleEvents =
    (movementRolling || resultHidden) && prior ? prior.events : game.events;
  const lastDice = [...visibleEvents].reverse().find((e) => e.dice)?.dice;
  const shownEnemies = enemiesInRange.map((enemy) => ({
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
    ...game.interactables.filter((object) => !object.used),
  ].filter(
    (object) =>
      Math.abs(player.x - object.x) + Math.abs(player.y - object.y) <= 1,
  );
  const classInfo = classes[player.classId];
  const stats = [
    { label: "Precisión", value: player.stats.accuracy, Icon: Crosshair },
    { label: "Esquive", value: player.stats.dodge, Icon: Eye },
    { label: "Agilidad", value: player.stats.agility, Icon: Wind },
    { label: "Defensa física", value: player.stats.defense, Icon: Shield },
    {
      label: "Resistencia mágica",
      value: player.stats.resistance,
      Icon: Sparkles,
    },
    { label: "Alcance", value: player.stats.range, Icon: MoveHorizontal },
    {
      label: "Daño físico",
      value: player.stats.physicalDamage ?? classInfo.demoDamage.physical,
      Icon: Swords,
    },
    {
      label: "Daño mágico",
      value: player.stats.magicDamage ?? classInfo.demoDamage.magic,
      Icon: WandSparkles,
    },
  ];
  const itemIcon = (
    item: GameView["items"][string] | undefined,
    slot = item?.slot,
  ) =>
    item?.heal ? (
      <FlaskConical />
    ) : slot === "gloves" ? (
      <Hand />
    ) : slot === "pants" || slot === "boots" ? (
      <Footprints />
    ) : slot === "chest" ? (
      <Shirt />
    ) : slot === "weapon" ? (
      player.classId === "mage" ? (
        <WandSparkles />
      ) : player.classId === "archer" ? (
        <Crosshair />
      ) : player.classId === "paladin" ? (
        <Shield />
      ) : (
        <Swords />
      )
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
        {shownRoll && shownRoll.id !== dismissedRollId && (
          <div
            className="character-dice-overlay"
            data-testid="character-dice-overlay"
          >
            <DiceRoll
              key={shownRoll.id}
              event={shownRoll}
              kind={
                shownRoll.kind === "DICE"
                  ? "movement"
                  : shownRoll.kind === "ATTACK_D6"
                    ? "d6"
                    : "d20"
              }
              reveal
              reducedMotion={preferences.reducedMotion}
              onResolved={() => setResolvedRollId(shownRoll.id)}
            />
          </div>
        )}
        <section className={`character-card ${player.classId}`}>
          <div className="character-copy">
            <span className="eyebrow">
              {classes[player.classId].name} · NIVEL 1
            </span>
            <h1>{player.name}</h1>
            <p>{classes[player.classId].title}</p>
            <Health hp={shownHp} max={player.stats.maxHp} label />
            <div className="stat-grid" aria-label="Estadísticas del personaje">
              {stats.map(({ label, value, Icon }) => (
                <div
                  className="stat-entry"
                  key={label}
                  title={`${label}: ${value} de 10`}
                >
                  <Icon size={13} aria-hidden="true" />
                  <span>{label}</span>
                  <b>{value}</b>
                  <i
                    className="stat-meter"
                    style={
                      {
                        "--stat-fill": `${Math.min(value, 10) * 10}%`,
                      } as CSSProperties
                    }
                  />
                </div>
              ))}
            </div>
          </div>
          <img
            src={classInfo.idlePortrait}
            alt={classes[player.classId].name}
          />
          <ResourceBar classId={player.classId} value={player.resource} />
        </section>
        <div className="control-columns">
          <section className="panel movement-panel">
            <div className="panel-heading">
              <h2>Movimiento</h2>
              <span>{game.movementLeft} CASILLAS</span>
            </div>
            <button
              className="dice-button"
              aria-label="Tirar movimiento D6"
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
              <span className="die-button-label">
                {game.movementRoll === null || movementRolling
                  ? "Tirar D6"
                  : `D6: ${game.movementRoll}`}
              </span>
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
              {shownEnemies.map((enemy) => (
                <button
                  key={enemy.id}
                  disabled={!!game.pendingAttack}
                  aria-pressed={target === enemy.id}
                  className={target === enemy.id ? "selected" : ""}
                  onClick={() => {
                    if (game.pendingAttack) return;
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
              {shownEnemies.length === 0 && (
                <p className="muted">
                  {game.enemies.some((enemy) => enemy.hp > 0)
                    ? `No percibís enemigos a ${perceptionRange} casillas.`
                    : "El patio está despejado."}
                </p>
              )}
            </div>
            <div className="special-actions">
              {(["special", "ultimate"] as const).map((ability) => (
                <button
                  key={ability}
                  className={`button ability-button ${selectedAbility === ability ? "selected" : ""}`}
                  aria-pressed={selectedAbility === ability}
                  disabled={
                    !canAct ||
                    !!game.pendingAttack ||
                    !enemyIdsInRange.includes(target) ||
                    !game.targets[target]?.valid ||
                    player.resource < (ability === "special" ? 100 : 300)
                  }
                  onClick={() =>
                    setSelectedAbility(
                      selectedAbility === ability ? "basic" : ability,
                    )
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
            <div className="attack-dice-pair" aria-label="Dados de ataque">
              <button
                className="die-button attack-die"
                aria-label={`Tirar D20 para ${selectedAbility === "basic" ? "ataque básico" : selectedAbility === "special" ? "especial" : "ulti"}`}
                disabled={
                  !canAct ||
                  !!game.pendingAttack ||
                  !enemyIdsInRange.includes(target) ||
                  !game.targets[target]?.valid ||
                  player.resource <
                    (selectedAbility === "special"
                      ? 100
                      : selectedAbility === "ultimate"
                        ? 300
                        : 0)
                }
                onClick={() =>
                  command({
                    type: "ATTACK",
                    targetId: target,
                    ability: selectedAbility,
                  })
                }
              >
                <img src="/assets/dados/generated/d20.png" alt="" />
                <span>D20 · ataque</span>
              </button>
              <button
                className="die-button attack-die"
                aria-label="Tirar D6 para calcular el daño"
                disabled={
                  !enabled ||
                  !game.pendingAttack ||
                  game.pendingAttack.actorId !== player.id
                }
                onClick={() => command({ type: "ROLL_ATTACK_D6" })}
              >
                <img src="/assets/dados/generated/d6.png" alt="" />
                <span>D6 · daño</span>
              </button>
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
        <section className="panel potion-panel" aria-label="Pociones">
          <div className="panel-heading">
            <h2>Pociones</h2>
            <span>{player.potions.filter(Boolean).length} / 4</span>
          </div>
          <div className="quick-items" aria-label="Consumibles rápidos">
            {player.potions.map((id, index) => {
              const item = id ? game.items[id] : undefined;
              const usable =
                !!item && (item.heal > 0 || item.restoreResource > 0);
              return (
                <button
                  key={index}
                  disabled={!canAct || !usable}
                  onClick={() =>
                    item &&
                    setInventorySelection({
                      origin: "potion",
                      itemId: item.id,
                      revision: game.revision,
                    })
                  }
                  title={
                    usable
                      ? `Usar ${item.name}`
                      : `Espacio ${index + 1} sin consumible`
                  }
                >
                  <FlaskConical size={15} aria-hidden="true" />
                  <span>{usable ? item.name : `Poción ${index + 1}`}</span>
                </button>
              );
            })}
          </div>
        </section>
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
                  title={
                    item
                      ? `${item.name} · ${item.allowedClasses.map((id) => classes[id].name).join(", ")}`
                      : "Espacio vacío"
                  }
                  disabled={
                    !canAct ||
                    !item ||
                    !item.allowedClasses.includes(player.classId)
                  }
                  onClick={() =>
                    item &&
                    setInventorySelection({
                      origin: "bag",
                      itemId: item.id,
                      revision: game.revision,
                    })
                  }
                >
                  <span className="bag-index">0{index + 1}</span>
                  {item ? itemIcon(item) : <PlusMark />}
                  <span>{item?.name ?? "Vacío"}</span>
                  {item && <small>Ver acciones</small>}
                </button>
              );
            })}
          </div>
          <div className="panel-heading equipment-title">
            <h3>Equipo</h3>
            <span>SOLO MODIFICA ESTADÍSTICAS</span>
          </div>
          <div className="equipment-stage">
            <div className="inventory-portrait" aria-hidden="true">
              <img src={classInfo.idlePortrait} alt="" />
            </div>
            <div className="equipment-column">
              <div className="equipment-grid">
                {Object.entries(equipmentSlots).map(([slot, label]) => {
                  const id =
                      player.equipment[slot as keyof typeof equipmentSlots],
                    item = id ? game.items[id] : undefined;
                  return (
                    <button
                      className={`equipment-slot equipment-slot-${slot} ${item ? "filled" : ""}`}
                      key={slot}
                      disabled={!canAct || !item}
                      onClick={() =>
                        item &&
                        setInventorySelection({
                          origin: "equipment",
                          slot: slot as keyof typeof equipmentSlots,
                          itemId: item.id,
                          revision: game.revision,
                        })
                      }
                    >
                      <span>
                        {slot === "weapon" && player.classId === "paladin"
                          ? "Escudo"
                          : label}
                      </span>
                      {itemIcon(item, slot as keyof typeof equipmentSlots)}
                      <b>{item?.name ?? "Sin equipar"}</b>
                      {item && (
                        <small>
                          {[
                            item.defense && `+${item.defense} DEF`,
                            item.resistance && `+${item.resistance} RES`,
                            item.physicalDamage &&
                              `+${item.physicalDamage} daño físico`,
                            item.magicDamage &&
                              `+${item.magicDamage} daño mágico`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      )}
                    </button>
                  );
                })}
              </div>
              {(player.equipment.gloves || player.equipment.pants) && (
                <div className="legacy-equipment">
                  {(["gloves", "pants"] as const).map((slot) => {
                    const id = player.equipment[slot],
                      item = id ? game.items[id] : undefined;
                    return item ? (
                      <button
                        key={slot}
                        disabled={!canAct}
                        onClick={() =>
                          setInventorySelection({
                            origin: "equipment",
                            slot,
                            itemId: item.id,
                            revision: game.revision,
                          })
                        }
                      >
                        {slot === "gloves" ? "Guantes" : "Pantalones"}{" "}
                        anteriores: {item.name}
                      </button>
                    ) : null;
                  })}
                </div>
              )}
            </div>
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
      {inventorySelection && selectedItem && (
        <InventoryDialog
          key={inventorySelection.itemId}
          selection={inventorySelection}
          item={selectedItem}
          replacedItem={
            inventorySelection.origin === "bag" && replacedId
              ? game.items[replacedId]
              : undefined
          }
          bagPosition={player.inventory.indexOf(inventorySelection.itemId)}
          hasSpace={player.inventory.includes(null)}
          enabled={canAct && inventorySelection.revision === game.revision}
          onCancel={() => setInventorySelection(null)}
          onConfirm={(action) => {
            command(action, inventorySelection.revision);
            setInventorySelection(null);
          }}
        />
      )}
    </main>
  );
}
function PlusMark() {
  return <span className="empty-plus">+</span>;
}
