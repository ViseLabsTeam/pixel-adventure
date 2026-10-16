import { Compass, Heart, Settings2, Volume2, VolumeX, X } from "lucide-react";
import { useState } from "react";
export function Health({
  hp,
  max,
  label = false,
}: {
  hp: number;
  max: number;
  label?: boolean;
}) {
  return (
    <div className="health-wrap">
      {label && (
        <span>
          <Heart size={13} /> VIDA{" "}
          <strong>
            {hp} / {max}
          </strong>
        </span>
      )}
      <div
        className="health-track"
        role="progressbar"
        aria-label="Vida"
        aria-valuenow={hp}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <i style={{ width: `${Math.max(0, (hp / max) * 100)}%` }} />
      </div>
    </div>
  );
}
export interface Preferences {
  sound: boolean;
  volume: number;
  reducedMotion: boolean;
  grid: boolean;
}
export function readPreferences(): Preferences {
  try {
    return {
      ...{ sound: false, volume: 0.3, reducedMotion: false, grid: true },
      ...JSON.parse(localStorage.getItem("umbral.preferences") ?? "{}"),
    };
  } catch {
    return { sound: false, volume: 0.3, reducedMotion: false, grid: true };
  }
}
export function Header({
  onHome,
  onSettings,
  connected,
}: {
  onHome: () => void;
  onSettings: () => void;
  connected?: boolean;
}) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onHome}>
        <Compass size={29} />
        <span>
          UMBRAL<small>LA MESA DE LOS DESTINOS</small>
        </span>
      </button>
      <div className="header-right">
        <span className="status-dot">
          <i className={connected === false ? "offline" : ""} />
          {connected === undefined
            ? "AVENTURA COOPERATIVA"
            : connected
              ? "CONECTADO"
              : "RECONECTANDO"}
        </span>
        <button
          className="icon-button"
          aria-label="Configuración"
          onClick={onSettings}
        >
          <Settings2 size={19} />
        </button>
      </div>
    </header>
  );
}
export function Settings({
  value,
  onChange,
  onClose,
}: {
  value: Preferences;
  onChange: (value: Preferences) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="icon-button close"
          aria-label="Cerrar configuración"
          onClick={onClose}
        >
          <X />
        </button>
        <span className="eyebrow">TU EXPERIENCIA</span>
        <h2 id="settings-title">Configuración</h2>
        <p>Estos ajustes se guardan en este dispositivo.</p>
        <label className="setting-row">
          <span>
            {value.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}{" "}
            Sonidos de los controles
          </span>
          <input
            type="checkbox"
            checked={value.sound}
            onChange={(e) => onChange({ ...value, sound: e.target.checked })}
          />
        </label>
        <label className="setting-row">
          <span>Volumen</span>
          <input
            aria-label="Volumen"
            type="range"
            min="0"
            max="1"
            step=".05"
            value={value.volume}
            onChange={(e) =>
              onChange({ ...value, volume: Number(e.target.value) })
            }
          />
        </label>
        <label className="setting-row">
          <span>Reducir movimiento</span>
          <input
            type="checkbox"
            checked={value.reducedMotion}
            onChange={(e) =>
              onChange({ ...value, reducedMotion: e.target.checked })
            }
          />
        </label>
        <label className="setting-row">
          <span>Mostrar cuadrícula del tablero</span>
          <input
            type="checkbox"
            checked={value.grid}
            onChange={(e) => onChange({ ...value, grid: e.target.checked })}
          />
        </label>
        <button className="button gold full" onClick={onClose}>
          Guardar y volver
        </button>
      </section>
    </div>
  );
}
export function CopyButton({
  text,
  label = "Copiar",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="button small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          window.prompt("Copiá este texto:", text);
        }
      }}
    >
      {copied ? "Copiado" : label}
    </button>
  );
}
let audio: AudioContext | undefined;
export function clickSound(preferences: Preferences) {
  if (!preferences.sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      220,
      audio.currentTime + 0.1,
    );
    gain.gain.setValueAtTime(preferences.volume * 0.12, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.13);
  } catch {
    /* Audio is optional and never blocks a command. */
  }
}
