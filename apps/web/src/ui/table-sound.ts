import type { Preferences } from "./shared";

export type TableSoundKind = "damage" | "equip" | "unequip" | "heal";

const urls: Record<TableSoundKind, string> = {
  damage: new URL(
    "../../../../assets/audio/generated/damage.wav",
    import.meta.url,
  ).href,
  equip: new URL(
    "../../../../assets/audio/generated/equip.wav",
    import.meta.url,
  ).href,
  unequip: new URL(
    "../../../../assets/audio/generated/unequip.wav",
    import.meta.url,
  ).href,
  heal: new URL("../../../../assets/audio/generated/heal.wav", import.meta.url)
    .href,
};

const kinds = Object.keys(urls) as TableSoundKind[];
const maxVoices = 4;
let context: AudioContext | undefined;
let enabled = true;
let volume = 0.3;
let playbackGeneration = 0;
const buffers = new Map<TableSoundKind, Promise<AudioBuffer | null>>();
const voices = new Map<AudioBufferSourceNode, GainNode>();

function audioContext(): AudioContext | undefined {
  if (context) return context;
  try {
    context = new AudioContext();
  } catch {
    return undefined;
  }
  return context;
}

function loadBuffer(kind: TableSoundKind, audio: AudioContext) {
  const prior = buffers.get(kind);
  if (prior) return prior;
  const loading = fetch(urls[kind])
    .then((response) => {
      if (!response.ok) throw new Error("Sound file unavailable");
      return response.arrayBuffer();
    })
    .then((data) => audio.decodeAudioData(data))
    .catch(() => {
      buffers.delete(kind);
      return null;
    });
  buffers.set(kind, loading);
  return loading;
}

export function preloadTableSounds() {
  if (!enabled) return;
  const audio = audioContext();
  if (!audio) return;
  for (const kind of kinds) void loadBuffer(kind, audio);
}

export function tableSoundReady() {
  return context?.state === "running";
}

export async function unlockTableSound() {
  if (!enabled) return false;
  const audio = audioContext();
  if (!audio) return false;
  try {
    await audio.resume();
  } catch {
    return false;
  }
  if (audio.state !== "running") return false;
  preloadTableSounds();
  return true;
}

export function stopTableSounds() {
  playbackGeneration++;
  for (const [source, gain] of voices) {
    source.onended = null;
    try {
      source.stop();
    } catch {
      // A completed sound needs no further action.
    }
    source.disconnect();
    gain.disconnect();
  }
  voices.clear();
}

export function configureTableSounds(preferences: Preferences) {
  enabled = preferences.tableSound;
  volume = Number.isFinite(preferences.volume)
    ? Math.max(0, Math.min(1, preferences.volume))
    : 0;
  if (!enabled || volume === 0) stopTableSounds();
  else for (const gain of voices.values()) gain.gain.value = volume * 0.5;
}

export function playTableSound(
  kind: TableSoundKind,
  preferences: Preferences,
): void {
  configureTableSounds(preferences);
  if (!enabled || volume === 0) return;
  const audio = audioContext();
  if (!audio || audio.state !== "running") return;
  const generation = playbackGeneration;
  void loadBuffer(kind, audio).then((buffer) => {
    if (
      !buffer ||
      generation !== playbackGeneration ||
      !enabled ||
      volume === 0 ||
      audio.state !== "running"
    )
      return;
    try {
      if (voices.size >= maxVoices) {
        const oldest = voices.keys().next().value;
        if (oldest) oldest.stop();
      }
      const source = audio.createBufferSource();
      const gain = audio.createGain();
      source.buffer = buffer;
      gain.gain.value = volume * 0.5;
      source.connect(gain);
      gain.connect(audio.destination);
      voices.set(source, gain);
      source.onended = () => {
        voices.delete(source);
        source.disconnect();
        gain.disconnect();
      };
      source.start();
    } catch {
      // Audio is cosmetic and never blocks a confirmed game event.
    }
  });
}
