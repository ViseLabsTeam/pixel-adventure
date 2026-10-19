import { format } from "prettier";
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const recipes = JSON.parse(
  await readFile("packages/content/actor-recipes.json", "utf8"),
);
const catalog = { ...recipes.players, ...recipes.enemies };
const movementStepMs = 2000;
const timings = {};
for (const [id, recipe] of Object.entries(catalog)) {
  const { folder, clips: actions } = recipe;
  const metadata = {};
  timings[id] = {};
  const dir = "assets/" + folder + "/generated";
  await mkdir(dir, { recursive: true });
  for (const [action, file] of Object.entries(actions)) {
    const source = "assets/" + folder + "/" + file;
    const info = await sharp(source).metadata();
    const count = info.pages ?? 1;
    const indices = Array.from({ length: count }, (_, i) =>
      Math.floor((i * (info.pages ?? 1)) / count),
    );
    const first = await sharp(source, { page: 0 })
      .trim({ background: "#00000000" })
      .toBuffer({ resolveWithObject: true });
    let delays = Array.from(
      { length: count },
      (_, i) => info.delay?.[i] || 100,
    );
    if (action.startsWith("walk")) {
      const target = movementStepMs;
      const original = delays.reduce((sum, ms) => sum + ms, 0);
      delays = delays.map((ms) =>
        Math.max(1, Math.round((ms * target) / original)),
      );
      delays[delays.length - 1] +=
        target - delays.reduce((sum, ms) => sum + ms, 0);
    }
    const duration = delays.reduce((sum, ms) => sum + ms, 0);
    timings[id][action] = duration;
    const decoded = await sharp(source, { animated: true })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const frameHeight = info.pageHeight ?? info.height;
    const frameBytes = info.width * frameHeight * 4;
    const frames = [];
    for (let i = 0; i < count; i++)
      frames.push({
        input: await sharp(
          decoded.subarray(i * frameBytes, (i + 1) * frameBytes),
          { raw: { width: info.width, height: frameHeight, channels: 4 } },
        )
          .resize(256, 256, {
            fit: "contain",
            background: "#00000000",
            kernel: "nearest",
          })
          .png()
          .toBuffer(),
        left: (i % 16) * 256,
        top: Math.floor(i / 16) * 256,
      });
    await sharp({
      create: {
        width: 4096,
        height: Math.ceil(count / 16) * 256,
        channels: 4,
        background: "#00000000",
      },
    })
      .composite(frames)
      .png()
      .toFile(dir + "/" + action + ".png");
    const ratio = 256 / info.width;
    const pad = (256 - info.height * ratio) / 2;
    metadata[action] = {
      count,
      delays,
      duration,
      originX:
        (-(first.info.trimOffsetLeft ?? 0) + first.info.width / 2) / info.width,
      originY:
        (pad + (-(first.info.trimOffsetTop ?? 0) + first.info.height) * ratio) /
        256,
      scale: recipe.height / (first.info.height * ratio),
      source: file,
      indices,
    };
    console.log(id, action, count);
  }
  await writeFile(
    dir + "/animations.json",
    JSON.stringify(metadata, null, 2) + "\n",
  );
}

await writeFile(
  "packages/content/src/animation-timings.ts",
  await format(
    "// Generated from the original GIF delays by assets:prepare.\nexport const movementStepMs = " +
      movementStepMs +
      ";\nexport const animationTimings = " +
      JSON.stringify(timings, null, 2) +
      " as const;\n",
    { parser: "typescript" },
  ),
);
