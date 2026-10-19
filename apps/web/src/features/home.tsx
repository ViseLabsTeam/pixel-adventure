import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Plus,
  Users,
  RotateCcw,
  Shield,
  Swords,
  Sparkles,
  Crosshair,
  Smartphone,
  Monitor,
  ChevronLeft,
} from "lucide-react";
import { classes, type ClassId } from "@umbral/content";
import type { ClassAvailability, Session } from "@umbral/protocol";
import { api, loadSession } from "../connection/use-campaign";
function newReservationToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export function Home({
  onSession,
}: {
  onSession: (session: Session, recoveryCode?: string) => void;
}) {
  const [masterActive, setMasterActive] = useState(false);
  const masterInteraction = {
    onMouseEnter: () => setMasterActive(true),
    onMouseLeave: () => setMasterActive(false),
    onFocus: () => setMasterActive(true),
    onBlur: () => setMasterActive(false),
  };
  const hash = location.hash.split("/");
  const [page, setPage] = useState<"home" | "join" | "recover">(
    hash[1] === "join" ? "join" : "home",
  );
  const [name, setName] = useState(""),
    [code, setCode] = useState(hash[2] ?? ""),
    [classId, setClassId] = useState<ClassId | null>(null),
    [availability, setAvailability] = useState<ClassAvailability | null>(null),
    [selectionBusy, setSelectionBusy] = useState(false),
    [recovery, setRecovery] = useState(""),
    [claimCode, setClaimCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const reservationToken = useRef<string>("");
  if (!reservationToken.current)
    reservationToken.current = newReservationToken();
  const currentCode = useRef(code);
  currentCode.current = code;
  useEffect(() => {
    if (page !== "join" || code.length !== 6) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      try {
        const next = await api("class-availability", {
          code,
          reservationToken: reservationToken.current,
        });
        if (!cancelled) {
          setAvailability(next);
          if (
            classId &&
            (next.occupied.includes(classId) || next.reserved.includes(classId))
          )
            setClassId(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setAvailability(null);
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudo consultar la mesa.",
          );
        }
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [page, code, classId]);
  useEffect(() => {
    if (page !== "join" || !classId || code.length !== 6) return;
    const timer = setInterval(() => {
      void api("reserve-class", {
        code,
        classId,
        reservationToken: reservationToken.current,
      }).catch((cause) => {
        setClassId(null);
        setError(
          cause instanceof Error ? cause.message : "Se perdió la reserva.",
        );
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [page, code, classId]);
  async function selectClass(id: ClassId) {
    if (code.length !== 6 || selectionBusy) return;
    setSelectionBusy(true);
    setError("");
    try {
      await api("reserve-class", {
        code,
        classId: id,
        reservationToken: reservationToken.current,
      });
      if (currentCode.current === code) {
        setClassId(id);
        setAvailability(
          await api("class-availability", {
            code,
            reservationToken: reservationToken.current,
          }),
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo elegir el personaje.",
      );
      setAvailability(
        await api("class-availability", {
          code,
          reservationToken: reservationToken.current,
        }).catch(() => null),
      );
    } finally {
      setSelectionBusy(false);
    }
  }
  function releaseSelection(previousCode = code) {
    if (classId && previousCode.length === 6) {
      const oldToken = reservationToken.current;
      reservationToken.current = newReservationToken();
      void api("release-class", {
        code: previousCode,
        reservationToken: oldToken,
      }).catch(() => undefined);
    }
    setClassId(null);
  }
  async function run(
    operation: () => Promise<{ session: Session; recoveryCode?: string }>,
  ) {
    setBusy(true);
    setError("");
    try {
      const result = await operation();
      onSession(result.session, result.recoveryCode);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo abrir la mesa.",
      );
    } finally {
      setBusy(false);
    }
  }
  const last = loadSession();
  return (
    <main className="home">
      <section className="hero" hidden={page !== "home"}>
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-rule" /> CAPÍTULO I · EL LLAMADO
          </span>
          <h1>
            Toda aventura
            <br />
            empieza con
            <br />
            <em>una mesa.</em>
          </h1>
          <p>
            Reuní a tu grupo. Elegí tu destino.
            <br />
            El Anfitrión ya los está esperando.
          </p>
          <div className="hero-actions">
            <button
              className="button gold"
              {...masterInteraction}
              disabled={busy}
              onClick={() => void run(() => api("campaigns"))}
            >
              <Plus size={18} />
              {busy ? "Preparando la mesa…" : "Crear una partida"}
              <ArrowRight size={18} />
            </button>
            <button
              className="button"
              {...masterInteraction}
              onClick={() => {
                setPage("join");
                setError("");
              }}
            >
              <Users size={18} />
              Unirse a una partida
            </button>
          </div>
          <button className="text-link" onClick={() => setPage("recover")}>
            <RotateCcw size={14} /> Continuar una aventura guardada
          </button>
          <div className="hero-meta">
            <span>
              <Users size={16} />
              2–3 viajeros
            </span>
            <span>
              <Monitor size={16} />
              Una pantalla compartida
            </span>
            <span>
              <Smartphone size={16} />
              Tu celular es el control
            </span>
          </div>
        </div>
        <div className="hero-art">
          <img
            className="master-illustration"
            src={
              masterActive
                ? "/assets/maestro/maestro.PNG"
                : "/assets/maestro/maestro2.PNG"
            }
            alt="El Anfitrión, maestro de ceremonias"
          />
          <div className="guide-quote">
            <span>EL ANFITRIÓN</span>
            <p>
              «Acérquense. Siempre hay
              <br />
              un lugar más en mi mesa.»
            </p>
            <i>✦</i>
          </div>
          <span className="art-caption">EL UMBRAL AGUARDA</span>
        </div>
      </section>
      {error && (
        <p role="alert" className="error-banner">
          {error}
        </p>
      )}
      {page !== "home" && (
        <section className="entry-panel" id="entry">
          <button
            className="text-link"
            onClick={() => {
              releaseSelection();
              setPage("home");
            }}
          >
            <ChevronLeft size={15} /> Volver
          </button>
          <span className="eyebrow">
            {page === "join" ? "TU LUGAR EN LA MESA" : "VOLVÉ AL CAMINO"}
          </span>
          <h2>
            {page === "join"
              ? "Elegí quién vas a ser."
              : "Continuar la aventura."}
          </h2>
          {page === "join" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (classId)
                  void run(() =>
                    api("join", {
                      code,
                      name,
                      classId,
                      reservationToken: reservationToken.current,
                    }),
                  );
              }}
            >
              <div className="form-grid">
                <label>
                  Código de la mesa
                  <input
                    autoFocus
                    placeholder="ABC234"
                    value={code}
                    onChange={(e) => {
                      releaseSelection(code);
                      setCode(e.target.value.toUpperCase());
                      setAvailability(null);
                      setError("");
                    }}
                    maxLength={6}
                    required
                    autoComplete="off"
                  />
                </label>
                <label>
                  Nombre del viajero
                  <input
                    placeholder="¿Cómo te llaman?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    minLength={2}
                    maxLength={20}
                    required
                  />
                </label>
              </div>
              <div
                className="class-selection"
                role="radiogroup"
                aria-label="Personaje"
              >
                {(Object.keys(classes) as ClassId[]).map((id) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={classId === id}
                    className={`class-option ${classId === id ? "selected" : ""}`}
                    disabled={
                      selectionBusy ||
                      code.length !== 6 ||
                      !availability ||
                      availability.status !== "LOBBY" ||
                      availability.occupied.includes(id) ||
                      availability.reserved.includes(id)
                    }
                    onClick={() => void selectClass(id)}
                    key={id}
                  >
                    <img src={classes[id].portrait} alt="" />
                    <span>
                      {classes[id].name}
                      <small>
                        {availability?.occupied.includes(id)
                          ? "Ocupado"
                          : availability?.reserved.includes(id)
                            ? "Reservado"
                            : `Alcance ${classes[id].range}`}
                      </small>
                    </span>
                    <i>{classId === id ? "✦" : "○"}</i>
                  </button>
                ))}
              </div>
              <button
                className="button gold"
                disabled={
                  busy ||
                  selectionBusy ||
                  !classId ||
                  availability?.status !== "LOBBY"
                }
              >
                Sentarme a la mesa <ArrowRight size={17} />
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => api("recover", { recoveryCode: recovery }));
              }}
            >
              <label>
                Código privado de recuperación
                <input
                  autoFocus
                  placeholder="El código que guardó el coordinador"
                  value={recovery}
                  onChange={(e) => setRecovery(e.target.value)}
                  required
                  autoComplete="off"
                />
              </label>
              <p className="muted">
                Es diferente al código público de la mesa. Recupera personajes,
                turno e inventario.
              </p>
              <button className="button gold" disabled={busy}>
                Recuperar mesa
              </button>
              {last && (
                <button
                  className="button"
                  type="button"
                  onClick={() => onSession(last)}
                >
                  Volver con este dispositivo
                </button>
              )}
            </form>
          )}
          {page === "recover" && (
            <form
              className="claim-form"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => api("claim", { claimCode }));
              }}
            >
              <h3>Recuperar mi personaje</h3>
              <label>
                Código de control
                <input
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                  minLength={16}
                  maxLength={16}
                  placeholder="Pedíselo al coordinador"
                  required
                  autoComplete="off"
                />
              </label>
              <button className="button" disabled={busy}>
                Recuperar personaje
              </button>
            </form>
          )}
        </section>
      )}
      <section className="roster-preview" hidden={page !== "home"}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">CUATRO CAMINOS. UN MISMO DESTINO.</span>
            <h2>¿Quién cruzará el umbral?</h2>
          </div>
          <span className="demo-badge">DEMO JUGABLE · VALORES DE PRUEBA</span>
        </div>
        <div className="preview-grid">
          {(Object.keys(classes) as ClassId[]).map((id, index) => {
            const Icon = [Shield, Swords, Sparkles, Crosshair][index];
            return (
              <article className={`preview-card ${id}`} key={id}>
                <div>
                  <Icon size={20} />
                  <h3>{classes[id].name}</h3>
                  <span>{classes[id].title}</span>
                  <p>{classes[id].description}</p>
                </div>
                <img src={classes[id].portrait} alt={classes[id].name} />
              </article>
            );
          })}
        </div>
      </section>
      <footer>
        UNA MESA, VARIOS DESTINOS.<span>UMBRAL / PROTOTIPO 0.1</span>
      </footer>
    </main>
  );
}
