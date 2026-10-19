import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  LockKeyhole,
  Users,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { classes, guide } from "@umbral/content";
import type { Session } from "@umbral/protocol";
import type { CampaignConnection } from "../connection/use-campaign";
import { CopyButton } from "../ui/shared";
export function Lobby({
  connection,
  session,
  recoveryCode,
}: {
  connection: CampaignConnection;
  session: Session;
  recoveryCode: string | null;
}) {
  const { game, connected, pending, command } = connection;
  const [reveal, setReveal] = useState(false),
    [shareOrigin, setShareOrigin] = useState(location.origin);
  if (!game) return <div className="loading">Preparando la mesa…</div>;
  const isHost = session.role === "COORDINATOR",
    me = game.players.find((p) => p.id === session.playerId),
    joinUrl = `${shareOrigin.replace(/\/$/, "")}/#/join/${game.code}`;
  return (
    <main className="lobby">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ANTES DE CRUZAR</span>
          <h1>La mesa está servida.</h1>
          <p>
            Cada viajero se une desde su celular. El tablero queda en esta
            pantalla.
          </p>
        </div>
        <span className="pill">
          <Users size={16} />
          {game.players.length} /{" "}
          {Math.max(Object.keys(classes).length, game.players.length)} viajeros
        </span>
      </div>
      <div className="lobby-grid">
        <section className="panel travelers">
          <div className="panel-heading">
            <h2>Tu compañía</h2>
            <span>ORDEN DE LOS TURNOS</span>
          </div>
          {Array.from(
            {
              length: Math.max(
                Object.keys(classes).length,
                game.players.length,
              ),
            },
            (_, slot) => {
              const player = game.players[slot];
              return (
                <div
                  className={`traveler ${!player ? "empty" : ""}`}
                  key={slot}
                >
                  <b className="slot-number">0{slot + 1}</b>
                  {player ? (
                    <>
                      <img src={classes[player.classId].portrait} alt="" />
                      <div>
                        <h3>
                          {player.name}
                          {player.id === session.playerId && (
                            <small> · Vos</small>
                          )}
                        </h3>
                        <span>{classes[player.classId].name}</span>
                      </div>
                      <span
                        className={`connection-label ${game.onlinePlayerIds.includes(player.id) ? "online" : ""}`}
                      >
                        {game.onlinePlayerIds.includes(player.id)
                          ? "Listo"
                          : "Sin conexión"}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="empty-avatar">
                        <Users />
                      </div>
                      <div>
                        <h3>Un lugar espera</h3>
                        <span>Invitá a otro viajero</span>
                      </div>
                    </>
                  )}
                </div>
              );
            },
          )}
          <div className="lobby-start">
            {isHost ? (
              <>
                <button
                  className="button gold full"
                  disabled={
                    game.players.length < 2 ||
                    game.players.some(
                      (p) => !game.onlinePlayerIds.includes(p.id),
                    ) ||
                    !connected ||
                    !!pending
                  }
                  onClick={() => command({ type: "START" })}
                >
                  Comenzar la aventura <ArrowRight size={18} />
                </button>
                <small>Se necesitan al menos 2 viajeros conectados.</small>
              </>
            ) : (
              <div className="waiting">
                <ShieldCheck />
                <p>
                  {me?.name}, tu lugar está reservado.
                  <br />
                  <span>Esperando que el coordinador abra el umbral.</span>
                </p>
              </div>
            )}
          </div>
        </section>
        <aside>
          <section className="panel invitation">
            <span className="eyebrow">INVITACIÓN A LA MESA</span>
            <p>Escaneá desde tu celular</p>
            <div className="qr">
              <QRCodeSVG
                value={joinUrl}
                size={146}
                bgColor="#f3ecd9"
                fgColor="#15221c"
              />
            </div>
            <span className="room-code" data-testid="room-code">
              {game.code}
            </span>
            <CopyButton text={joinUrl} label="Copiar invitación" />
            <details>
              <summary>Conectar celulares en la misma red</summary>
              <p>
                Si abriste localhost, reemplazalo por la IP de la computadora.
                Mantené el puerto.
              </p>
              <label>
                Dirección de la pantalla
                <input
                  value={shareOrigin}
                  onChange={(e) => setShareOrigin(e.target.value)}
                  placeholder="http://192.168.1.10:8088"
                />
              </label>
            </details>
          </section>
          {isHost && recoveryCode && (
            <section className="panel private-code">
              <LockKeyhole size={17} />
              <div>
                <h3>Conservá tu aventura</h3>
                <p>El código privado permite recuperar esta mesa.</p>
                <button
                  className="text-link"
                  onClick={() => setReveal(!reveal)}
                >
                  {reveal ? "Ocultar código privado" : "Ver código privado"}
                </button>
                {reveal && (
                  <>
                    <code>{recoveryCode}</code>
                    <CopyButton text={recoveryCode} />
                  </>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>
      <section className="guide-strip">
        <img src={guide.portrait} alt="El Anfitrión" />
        <div>
          <span>EL ANFITRIÓN</span>
          <p>
            «No importa qué camino eligieron para llegar. Lo importante es que
            ahora están aquí.»
          </p>
        </div>
        <Smartphone size={22} />
      </section>
    </main>
  );
}
