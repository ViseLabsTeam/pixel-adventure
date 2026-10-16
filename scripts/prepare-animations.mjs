import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
const catalog = {
  paladin: {
    idle: "animascion_pasiva.gif",
    walk: "caminata.gif",
    walkUp: "caminata_s.gif",
    basic: "ataque_basico_.gif",
    special: "proteccion_.gif",
    ultimate: "ulti.gif",
  },
  guerrero: {
    idle: "indie.gif",
    basic: "corte.gif",
    special: "especial_.gif",
    ultimate: "ultimate.gif",
  },
  mago: {
    walk: "caminata.gif",
    basic: "bola_de_fuego_.gif",
    special: "ice.gif",
    ultimate: "zaaaaap.gif",
  },
};
const timings = {};
for (const [category, actions] of Object.entries(catalog)) {
  const metadata = {};
  timings[{paladin:"paladin",guerrero:"warrior",mago:"mage"}[category]]={};
  const dir = "assets/" + category + "/generated";
  await mkdir(dir, { recursive: true });
  for (const [action, file] of Object.entries(actions)) {
    const source = "assets/" + category + "/" + file;
    const info = await sharp(source).metadata();
    const count = info.pages ?? 1;
    const indices = Array.from({ length: count }, (_, i) =>
      Math.floor((i * (info.pages ?? 1)) / count),
    );
    const first = await sharp(source, { page: 0 })
      .trim({ background: "#00000000" })
      .toBuffer({ resolveWithObject: true });
    const delays=Array.from({length:count},(_,i)=>info.delay?.[i] || 100);
    const duration=delays.reduce((sum,ms)=>sum+ms,0);
    timings[{paladin:"paladin",guerrero:"warrior",mago:"mage"}[category]][action]=duration;
    const decoded=await sharp(source,{animated:true}).ensureAlpha().raw().toBuffer();
    const frameHeight=info.pageHeight ?? info.height;
    const frameBytes=info.width*frameHeight*4;
    const frames = [];
    for (let i = 0; i < count; i++)
      frames.push({
        input: await sharp(decoded.subarray(i*frameBytes,(i+1)*frameBytes),{raw:{width:info.width,height:frameHeight,channels:4}})
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
      scale: (category === "paladin" ? 112 : 105) / (first.info.height * ratio),
      source: file,
      indices,
    };
    console.log(category, action, count);
  }
  await writeFile(
    dir + "/animations.json",
    JSON.stringify(metadata, null, 2) + "\n",
  );
}

await writeFile("packages/content/src/animation-timings.ts", "// Generated from the original GIF delays by assets:prepare.\nexport const animationTimings = "+JSON.stringify(timings,null,2)+" as const;\n");
