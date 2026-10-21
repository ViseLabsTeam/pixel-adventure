import { useCallback, useEffect, useRef, useState } from "react";
import { classes } from "@umbral/content";
import type { GameView } from "@umbral/protocol";
import { DiceRoll } from "../ui/dice-roll";

type GameEvent = GameView["events"][number];
type Roll = {
  event: GameEvent;
  revision: number;
  kind: "movement" | "d20" | "d6" | "attack";
  actorName: string;
  actorLabel: string;
  portrait?: string;
  result: string;
};

function isRoll(event: GameEvent) {
  return (
    ["DICE", "ATTACK_D20", "ATTACK_MISS_ROLL", "ATTACK_D6"].includes(
      event.kind,
    ) ||
    (Boolean(event.actorId && event.targetId) &&
      ["ENEMY", "MISS"].includes(event.kind))
  );
}

function describeRoll(game: GameView, event: GameEvent): Roll {
  const player = game.players.find((item) => item.id === event.actorId);
  const enemy = game.enemies.find((item) => item.id === event.actorId);
  const target = [...game.players, ...game.enemies].find(
    (item) => item.id === event.targetId,
  );
  const kind =
    event.kind === "DICE"
      ? "movement"
      : event.kind === "ATTACK_D6"
        ? "d6"
        : ["ATTACK_D20", "ATTACK_MISS_ROLL"].includes(event.kind)
          ? "d20"
          : "attack";
  return {
    event,
    revision: game.revision,
    kind,
    actorName: player?.name ?? enemy?.name ?? event.text.split(":")[0],
    actorLabel: player ? classes[player.classId].name : "Enemigo",
    portrait: player ? classes[player.classId].portrait : undefined,
    result:
      kind === "movement"
        ? event.text.split(": ").slice(1).join(": ") || event.text
        : ["MISS", "ATTACK_MISS_ROLL"].includes(event.kind)
          ? "El ataque falló"
          : kind === "d20"
            ? "Impactó. Ahora tirá el D6."
            : `${event.amount ?? 0} de daño a ${target?.name ?? "su objetivo"}`,
  };
}

function RollCard({
  roll,
  reveal,
  reducedMotion,
  onFinished,
}: {
  roll: Roll;
  reveal: boolean;
  reducedMotion: boolean;
  onFinished: () => void;
}) {
  const [resolved, setResolved] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const markResolved = useCallback(() => setResolved(true), []);

  useEffect(() => {
    if (!resolved) return;
    const leaveTimer = window.setTimeout(() => setLeaving(true), 900);
    const finishTimer = window.setTimeout(onFinished, 1250);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(finishTimer);
    };
  }, [resolved, onFinished]);

  return (
    <div
      className={`table-dice-spotlight ${leaving ? "leaving" : ""} ${reducedMotion ? "reduced" : ""}`}
      data-testid="table-dice"
      data-event-kind={roll.event.kind}
      role="status"
      aria-live="polite"
    >
      {roll.portrait && (
        <img className="table-dice-portrait" src={roll.portrait} alt="" />
      )}
      <div className="table-dice-content">
        <span className="eyebrow">
          {roll.actorLabel} ·{" "}
          {roll.kind === "movement" ? "Movimiento" : "Ataque"}
        </span>
        <strong>{roll.actorName} lanza los dados</strong>
        <DiceRoll
          event={roll.event}
          kind={roll.kind}
          reveal={reveal}
          reducedMotion={reducedMotion}
          onResolved={markResolved}
        />
        <p className={resolved ? "revealed" : ""}>
          {resolved ? roll.result : "El destino aún no está escrito"}
        </p>
      </div>
    </div>
  );
}

export function TableDiceSpotlight({
  game,
  resultHidden,
  reducedMotion,
}: {
  game: GameView;
  resultHidden: boolean;
  reducedMotion: boolean;
}) {
  const previousIds = useRef(new Set(game.events.map((event) => event.id)));
  const [queue, setQueue] = useState<Roll[]>([]);
  const finish = useCallback(() => setQueue((current) => current.slice(1)), []);

  useEffect(() => {
    const fresh = game.events.filter(
      (event) => !previousIds.current.has(event.id) && isRoll(event),
    );
    previousIds.current = new Set(game.events.map((event) => event.id));
    if (fresh.length)
      setQueue((current) => [
        ...current,
        ...fresh.map((event) => describeRoll(game, event)),
      ]);
  }, [game.events]);

  const roll = queue[0];
  if (!roll) return null;
  const reveal =
    game.revision > roll.revision ||
    (roll.kind === "attack" ? !resultHidden : true);
  return (
    <RollCard
      key={roll.event.id}
      roll={roll}
      reveal={reveal}
      reducedMotion={reducedMotion}
      onFinished={finish}
    />
  );
}
