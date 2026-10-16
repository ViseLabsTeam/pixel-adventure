import { useState } from "react";
import type { GameView, Session } from "@umbral/protocol";
import { api } from "../connection/use-campaign";
import { CopyButton } from "../ui/shared";
export function Recovery({
  game,
  session,
}: {
  game: GameView;
  session: Session;
}) {
  const [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function issue(playerId: string) {
    setBusy(true);
    setCode("");
    setError("");
    try {
      const result = await api<{ claimCode: string }>(
        "reclaim",
        { playerId },
        session.token,
      );
      setCode(result.claimCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo recuperar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="panel recovery-panel">
      <summary>Recuperar un control perdido</summary>
      <p>
        Elegí al viajero. En su celular, abrí «Continuar una aventura guardada»
        y pegá el código en «Recuperar mi personaje».
      </p>
      <div className="recovery-buttons">
        {game.players.map((p) => (
          <button
            className="button small"
            disabled={busy}
            key={p.id}
            onClick={() => void issue(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
      {code && (
        <div>
          <p>
            Código privado de un solo uso. Vence en 10 minutos. Reemplaza el
            control anterior al usarlo.
          </p>
          <code>{code}</code>
          <CopyButton text={code} />
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
