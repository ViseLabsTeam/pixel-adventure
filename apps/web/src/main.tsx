import { Recovery } from "./features/recovery";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import type { Session } from "@umbral/protocol";
import {
  Header,
  Settings,
  readPreferences,
  clickSound,
  type Preferences,
} from "./ui/shared";
import { Home } from "./features/home";
import { Lobby } from "./features/lobby";
import { Controller } from "./features/controller";
import { Table } from "./features/table";
import {
  loadSession,
  saveSession,
  useCampaign,
} from "./connection/use-campaign";
import "./styles.css";
function App() {
  const [session, setSession] = useState<Session | null>(() =>
    location.hash.startsWith("#/session") ? loadSession() : null,
  );
  const [settings, setSettings] = useState(false),
    [preferences, setPreferences] = useState(readPreferences),
    [recoveryCode, setRecoveryCode] = useState<string | null>(() =>
      sessionStorage.getItem(`umbral.recovery.${session?.campaignId}`),
    );
  const connection = useCampaign(session);
  function enter(next: Session, recovery?: string) {
    saveSession(next);
    setSession(next);
    location.hash = "/session";
    setRecoveryCode(
      recovery ?? sessionStorage.getItem(`umbral.recovery.${next.campaignId}`),
    );
    if (recovery) {
      sessionStorage.setItem(`umbral.recovery.${next.campaignId}`, recovery);
    }
    window.scrollTo(0, 0);
  }
  function home() {
    setSession(null);
    location.hash = "/";
    window.scrollTo(0, 0);
  }
  function configure(next: Preferences) {
    setPreferences(next);
    localStorage.setItem("umbral.preferences", JSON.stringify(next));
    clickSound(next);
  }
  const activeConnection = {
    ...connection,
    command: (action: Parameters<typeof connection.command>[0]) => {
      clickSound(preferences);
      connection.command(action);
    },
  };
  const tableMode =
    !!session &&
    session.role !== "PLAYER" &&
    !!connection.game &&
    connection.game.status !== "LOBBY";
  return (
    <div
      className={`app ${tableMode ? "table-mode" : ""} ${preferences.reducedMotion ? "reduced-motion" : ""}`}
    >
      <Header
        onHome={home}
        onSettings={() => setSettings(true)}
        connected={session ? connection.connected : undefined}
      />
      {!tableMode && session && connection.error && (
        <div className="error-banner" role="alert">
          {connection.error}
          <button onClick={connection.retry}>Reintentar</button>
        </div>
      )}
      {!tableMode && session && connection.game?.paused && (
        <div className="pause-banner">
          La mesa está esperando que vuelva el jugador activo. El turno está
          guardado.
        </div>
      )}
      {!session ? (
        <Home onSession={enter} />
      ) : !connection.game ? (
        <main className="loading">
          <span className="loading-rune">✦</span>Conectando con tu mesa…
          <button className="text-link" onClick={home}>
            Volver al inicio
          </button>
        </main>
      ) : connection.game.status === "LOBBY" ? (
        <Lobby
          connection={activeConnection}
          session={session}
          recoveryCode={recoveryCode}
        />
      ) : session.role === "PLAYER" ? (
        <Controller
          connection={activeConnection}
          session={session}
          preferences={preferences}
        />
      ) : (
        <Table
          connection={activeConnection}
          session={session}
          preferences={preferences}
        />
      )}
      {session?.role === "COORDINATOR" &&
        connection.game?.status === "LOBBY" && (
          <Recovery game={connection.game} session={session} />
        )}
      {settings && (
        <Settings
          value={preferences}
          onChange={configure}
          onClose={() => setSettings(false)}
        />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
