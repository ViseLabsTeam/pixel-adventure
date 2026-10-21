import { useEffect, useState } from "react";
import { diceTimings } from "@umbral/content";
import type { GameView } from "@umbral/protocol";

type RollEvent = GameView["events"][number];

export function DiceRoll({
  event,
  kind,
  reveal,
  reducedMotion,
  onResolved,
}: {
  event: RollEvent;
  kind: "movement" | "d20" | "d6" | "attack";
  reveal: boolean;
  reducedMotion: boolean;
  onResolved?: () => void;
}) {
  const dice =
    kind === "movement" || kind === "d6"
      ? [6]
      : kind === "d20"
        ? [20]
        : [20, 6];
  const [playing, setPlaying] = useState(!reducedMotion);
  const [loaded, setLoaded] = useState<number[]>([]);
  const [failed, setFailed] = useState<number[]>([]);
  useEffect(() => {
    if (reducedMotion) {
      setPlaying(false);
      return;
    }
    if (loaded.length < dice.length) return;
    const timer = window.setTimeout(
      () => setPlaying(false),
      kind === "movement" || kind === "d6" ? diceTimings.d6 : diceTimings.d20,
    );
    return () => window.clearTimeout(timer);
  }, [event.id, kind, reducedMotion, loaded.length]);
  useEffect(() => {
    if (reveal && !playing) onResolved?.();
  }, [reveal, playing, onResolved]);

  return (
    <div
      className={`dice-presentation ${kind} ${playing ? "rolling" : "resolved"}`}
      role="status"
      aria-live="polite"
    >
      <div className="dice-presentation-art" aria-hidden="true">
        {dice.map((sides) => (
          <span className="die-art" key={`${event.id}-${sides}`}>
            <img
              src={
                playing && !failed.includes(sides)
                  ? `/assets/dados/D${sides}.gif?roll=${encodeURIComponent(event.id)}`
                  : `/assets/dados/generated/d${sides}.png`
              }
              alt=""
              onLoad={
                playing && !failed.includes(sides)
                  ? () =>
                      setLoaded((previous) =>
                        previous.includes(sides)
                          ? previous
                          : [...previous, sides],
                      )
                  : undefined
              }
              onError={() => {
                setFailed((previous) =>
                  previous.includes(sides) ? previous : [...previous, sides],
                );
                setLoaded((previous) =>
                  previous.includes(sides) ? previous : [...previous, sides],
                );
              }}
            />
            <small aria-hidden="true">D{sides}</small>
          </span>
        ))}
      </div>
      <strong>
        {reveal && !playing
          ? event.kind === "ATTACK_MISS_ROLL" || event.kind === "MISS"
            ? "¡Falló el ataque!"
            : event.dice?.length
              ? `${event.dice.map((value, index) => `d${dice[index]}: ${value}`).join(" · ")}${kind === "d6" ? ` · ${event.amount ?? 0} de daño final` : ""}`
              : "Fallo"
          : playing
            ? "Dados girando…"
            : kind === "movement"
              ? "Esperando el resultado de la tirada…"
              : "Esperando el resultado del ataque…"}
      </strong>
    </div>
  );
}
