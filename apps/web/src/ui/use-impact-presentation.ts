import { useEffect, useRef, useState } from "react";
import { animationGraceMs, combatPresentation } from "@umbral/content";
import type { GameView } from "@umbral/protocol";

export function useImpactPresentation(game: GameView | null) {
  const presented = useRef<GameView | null>(null);
  const [revealedRevision, setRevealedRevision] = useState(-1);
  const [healthRevision, setHealthRevision] = useState(-1);

  useEffect(() => {
    if (game && !game.animationPending) presented.current = game;
  }, [game]);

  useEffect(() => {
    if (!game?.animationPending) return;
    const animationEnd = Math.max(
      0,
      game.animationUntil -
        game.serverNow -
        animationGraceMs -
        combatPresentation.totalMs,
    );
    const resultTimer = window.setTimeout(
      () => setRevealedRevision(game.revision),
      animationEnd,
    );
    const healthTimer = window.setTimeout(
      () => setHealthRevision(game.revision),
      animationEnd + combatPresentation.resultMs,
    );
    return () => {
      window.clearTimeout(resultTimer);
      window.clearTimeout(healthTimer);
    };
  }, [
    game?.revision,
    game?.animationPending,
    game?.animationUntil,
    game?.serverNow,
  ]);

  const prior = presented.current;
  const hasImpact = Boolean(
    game?.animationPending &&
      prior &&
      game.events.some(
        (event) =>
          event.actorId &&
          event.targetId &&
          !prior.events.some((old) => old.id === event.id),
      ),
  );
  return {
    prior,
    resultHidden: hasImpact && revealedRevision !== game?.revision,
    attackInFlight: hasImpact && healthRevision !== game?.revision,
  };
}
