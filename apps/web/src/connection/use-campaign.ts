import { useEffect, useRef, useState } from "react";
import { Client, type Room } from "@colyseus/sdk";
import type { Command, GameView, Receipt, Session } from "@umbral/protocol";
import { SESSION_REPLACED } from "@umbral/protocol";
export async function api<T>(
  path: string,
  body: unknown = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.message ?? "No se pudo completar la operación.");
  return result;
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
  try {
    return JSON.parse(
      sessionStorage.getItem("umbral.session") ??
        localStorage.getItem("umbral.lastSession") ??
        "null",
    ) as Session | null;
  } catch {
    return null;
  }
}
export function useCampaign(session: Session | null) {
  const [game, setGame] = useState<GameView | null>(null),
    [connected, setConnected] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState<Command | null>(null);
  const [animating,setAnimating]=useState(false);
  useEffect(()=>{const remaining=game ? Math.max(0,game.animationUntil-game.serverNow) : 0;setAnimating(remaining>0);const timer=setTimeout(()=>setAnimating(false),remaining);return ()=>clearTimeout(timer);},[game?.animationUntil,game?.serverNow]);
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
      pendingRef.current = JSON.parse(
        sessionStorage.getItem(storageKey) ?? "null",
      );
      setPending(pendingRef.current);
    } catch {
      pendingRef.current = null;
    }
    const connect = async () => {
      try {
        const { roomId } = await api<{ roomId: string }>(
          "connect",
          {},
          session.token,
        );
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
        joined.onMessage("state", (state: GameView) => {
          if (!gameRef.current || state.revision >= gameRef.current.revision) {
            gameRef.current = state;
            setGame(state);
          }
        });
        joined.onMessage("receipt", (receipt: Receipt) => {
          if (pendingRef.current?.commandId === receipt.commandId) {
            pendingRef.current = null;
            setPending(null);
            sessionStorage.removeItem(storageKey);
          }
          setError("");
        });
        joined.onMessage(
          "failure",
          (failure: { code: string; message: string }) => {
            setError(failure.message);
            if (failure.code !== "STORAGE_UNAVAILABLE") {
              pendingRef.current = null;
              setPending(null);
              sessionStorage.removeItem(storageKey);
            }
            joined.send("sync");
          },
        );
        joined.onMessage("storage-error", (failure: { message: string }) => {
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
  function command(action: Command["action"]) {
    if (!room.current || !gameRef.current || pendingRef.current || animating) return;
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
    animating,
    game,
    connected,
    error,
    pending,
    command,
    retry,
    select: (id: string) => room.current?.send("select", id),
  };
}
export type CampaignConnection = ReturnType<typeof useCampaign>;
