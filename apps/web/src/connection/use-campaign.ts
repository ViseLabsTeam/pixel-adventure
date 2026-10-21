import { useEffect, useRef, useState } from "react";
import { Client, type Room } from "@colyseus/sdk";
import type {
  Command,
  GameView,
  Session,
  ApiPath,
  ApiResponse,
} from "@umbral/protocol";
import {
  SESSION_REPLACED,
  apiResponseSchemas,
  commandSchema,
  failureSchema,
  gameViewSchema,
  receiptSchema,
  sessionSchema,
  storageErrorSchema,
} from "@umbral/protocol";
export async function api<Path extends ApiPath>(
  path: Path,
  body: unknown = {},
  token?: string,
): Promise<ApiResponse<Path>> {
  const response = await fetch(`/api/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = storageErrorSchema.safeParse(result);
    throw new Error(
      failure.success
        ? failure.data.message
        : "No se pudo completar la operación.",
    );
  }
  const parsed = apiResponseSchemas[path].safeParse(result);
  if (!parsed.success) throw new Error("La respuesta de la mesa no es válida.");
  return parsed.data as ApiResponse<Path>;
}
function newCommandId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function saveSession(session: Session) {
  sessionStorage.setItem("umbral.session", JSON.stringify(session));
  localStorage.setItem("umbral.lastSession", JSON.stringify(session));
}
export function loadSession() {
  for (const saved of [
    sessionStorage.getItem("umbral.session"),
    localStorage.getItem("umbral.lastSession"),
  ]) {
    if (!saved) continue;
    try {
      const parsed = sessionSchema.safeParse(JSON.parse(saved));
      if (parsed.success) return parsed.data;
    } catch {
      // Try the other saved session.
    }
  }
  return null;
}
export function useCampaign(session: Session | null) {
  const [game, setGame] = useState<GameView | null>(null),
    [connected, setConnected] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState<Command | null>(null);
  const [animating, setAnimating] = useState(false);
  useEffect(() => {
    const remaining = game
      ? Math.max(0, game.animationUntil - game.serverNow)
      : 0;
    setAnimating(!!game?.animationPending || remaining > 0);
    const timer = setTimeout(
      () => setAnimating(!!game?.animationPending),
      remaining,
    );
    return () => clearTimeout(timer);
  }, [game?.animationUntil, game?.serverNow, game?.animationPending]);
  const room = useRef<Room | null>(null),
    gameRef = useRef<GameView | null>(null),
    pendingRef = useRef<Command | null>(null);
  const storageKey = `umbral.pending.${session?.campaignId}.${session?.playerId ?? session?.role}`;
  useEffect(() => {
    if (!session) return;
    let disposed = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      current: Room | undefined;
    try {
      const saved: unknown = JSON.parse(
        sessionStorage.getItem(storageKey) ?? "null",
      );
      const parsed = commandSchema.safeParse(saved);
      pendingRef.current = parsed.success ? parsed.data : null;
      if (!parsed.success) sessionStorage.removeItem(storageKey);
      setPending(pendingRef.current);
    } catch {
      pendingRef.current = null;
      sessionStorage.removeItem(storageKey);
    }
    const connect = async () => {
      try {
        const { roomId } = await api("connect", {}, session.token);
        if (disposed) return;
        const joined = await new Client(`${location.origin}/realtime`).joinById(
          roomId,
          { token: session.token },
        );
        if (disposed) {
          void joined.leave();
          return;
        }
        current = joined;
        // Rejoin using our durable token, including after a backend restart.
        joined.reconnection.enabled = false;
        room.current = joined;
        setConnected(true);
        setError("");
        joined.onMessage("state", (input: unknown) => {
          const parsed = gameViewSchema.safeParse(input);
          if (!parsed.success) {
            setError("El estado recibido de la mesa no es válido.");
            return;
          }
          const state = parsed.data;
          if (!gameRef.current || state.revision >= gameRef.current.revision) {
            gameRef.current = state;
            setGame(state);
          }
        });
        joined.onMessage("receipt", (input: unknown) => {
          const parsed = receiptSchema.safeParse(input);
          if (!parsed.success) {
            setError("El recibo recibido de la mesa no es válido.");
            return;
          }
          const receipt = parsed.data;
          if (pendingRef.current?.commandId === receipt.commandId) {
            pendingRef.current = null;
            setPending(null);
            sessionStorage.removeItem(storageKey);
          }
          setError("");
        });
        joined.onMessage("failure", (input: unknown) => {
          const parsed = failureSchema.safeParse(input);
          if (!parsed.success) {
            setError("La respuesta de la mesa no es válida.");
            return;
          }
          const failure = parsed.data;
          setError(failure.message);
          if (failure.code !== "STORAGE_UNAVAILABLE") {
            pendingRef.current = null;
            setPending(null);
            sessionStorage.removeItem(storageKey);
          }
          joined.send("sync");
        });
        joined.onMessage("storage-error", (input: unknown) => {
          const parsed = storageErrorSchema.safeParse(input);
          if (!parsed.success) return;
          const failure = parsed.data;
          setError(failure.message);
          setGame((previous) =>
            previous ? { ...previous, storageError: true } : null,
          );
        });
        joined.onLeave((code: number) => {
          if (disposed) return;
          setConnected(false);
          room.current = null;
          if (code === SESSION_REPLACED) {
            setError(
              "Este control fue reemplazado. Recuperá tu personaje desde la mesa.",
            );
            return;
          }
          timer = setTimeout(connect, 1500);
        });
        joined.onError((_code: number, message?: string) =>
          setError(message ?? "Conexión interrumpida."),
        );
        joined.send("sync");
        if (pendingRef.current) joined.send("command", pendingRef.current);
      } catch (cause) {
        if (!disposed) {
          setConnected(false);
          setError(
            cause instanceof Error ? cause.message : "No se pudo conectar.",
          );
          timer = setTimeout(connect, 2500);
        }
      }
    };
    void connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      room.current = null;
      gameRef.current = null;
      setGame(null);
      setConnected(false);
      void current?.leave();
    };
  }, [session?.token]);
  function command(action: Command["action"], expectedRevision?: number) {
    if (!room.current || !gameRef.current || pendingRef.current || animating)
      return;
    if (
      expectedRevision !== undefined &&
      expectedRevision !== gameRef.current.revision
    ) {
      setError(
        "La partida cambió. Revisá el objeto antes de confirmar otra vez.",
      );
      return;
    }
    const next: Command = {
      commandId: newCommandId(),
      expectedRevision: gameRef.current.revision,
      action,
    };
    pendingRef.current = next;
    setPending(next);
    setError("");
    sessionStorage.setItem(storageKey, JSON.stringify(next));
    room.current.send("command", next);
  }
  function retry() {
    if (room.current) {
      room.current.send("sync");
      if (pendingRef.current) room.current.send("command", pendingRef.current);
    }
  }
  return {
    animationComplete: (revision: number) =>
      room.current?.send("animation-complete", revision),
    animating,
    game,
    connected,
    error,
    pending,
    command,
    retry,
    select: (id: string | null) => room.current?.send("select", id),
  };
}
export type CampaignConnection = ReturnType<typeof useCampaign>;
