import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sampleRate = 22_050;
const output = resolve(import.meta.dirname, "../assets/audio/generated");
const clamp = (value) => Math.max(-1, Math.min(1, value));
const decay = (time, duration, power = 2) =>
  Math.pow(Math.max(0, 1 - time / duration), power);

function wave(duration, sound) {
  const count = Math.round(duration * sampleRate);
  const data = Buffer.alloc(44 + count * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(data.length - 8, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(sampleRate, 24);
  data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(count * 2, 40);
  for (let index = 0; index < count; index++) {
    const time = index / sampleRate;
    const fadeIn = Math.min(1, time / 0.004);
    data.writeInt16LE(
      Math.round(clamp(sound(time, duration, index) * fadeIn) * 32767),
      44 + index * 2,
    );
  }
  return data;
}

function noise(index, seed) {
  let value = Math.imul(index + seed, 1_664_525) + 1_013_904_223;
  value ^= value >>> 13;
  value = Math.imul(value, 1_274_126_177);
  return ((value >>> 0) / 0xffffffff) * 2 - 1;
}

const sounds = {
  damage: wave(0.28, (time, duration, index) => {
    const kick = Math.sin(2 * Math.PI * (185 * time - 175 * time * time));
    const crack = noise(index, 41) * decay(time, 0.11, 4);
    return (kick * 0.58 + crack * 0.38) * decay(time, duration, 2.8);
  }),
  equip: wave(0.48, (time, duration, index) => {
    const shimmer =
      Math.sin(2 * Math.PI * 660 * time) * 0.35 +
      Math.sin(2 * Math.PI * 990 * time) * 0.24 +
      Math.sin(2 * Math.PI * 1320 * time) * 0.14;
    const second =
      time < 0.105
        ? 0
        : Math.sin(2 * Math.PI * 880 * (time - 0.105)) *
          decay(time - 0.105, duration - 0.105, 1.8) *
          0.3;
    return (
      shimmer * decay(time, duration, 1.8) +
      second +
      noise(index, 73) * decay(time, 0.025, 3) * 0.07
    );
  }),
  unequip: wave(0.34, (time, duration, index) => {
    const slide = Math.sin(2 * Math.PI * (710 * time - 560 * time * time));
    const metallic = Math.sin(2 * Math.PI * 1140 * time) * 0.18;
    return (
      (slide * 0.54 + metallic) * decay(time, duration, 2.5) +
      noise(index, 109) * decay(time, 0.04, 4) * 0.15
    );
  }),
  heal: wave(0.72, (time, duration) => {
    const notes = [440, 554.37, 659.25, 880];
    let voice = 0;
    for (let index = 0; index < notes.length; index++) {
      const start = index * 0.12;
      if (time < start) continue;
      const local = time - start;
      voice +=
        Math.sin(2 * Math.PI * notes[index] * local) *
        Math.min(1, local / 0.018) *
        decay(local, duration - start, 2) *
        0.19;
    }
    return voice * decay(time, duration, 0.6);
  }),
};

await mkdir(output, { recursive: true });
for (const [name, data] of Object.entries(sounds))
  await writeFile(resolve(output, `${name}.wav`), data);
