import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { classes } from "@umbral/content";
import type { GameView } from "@umbral/protocol";
import type { Preferences } from "../ui/shared";
const categories = { paladin: "paladin", warrior: "guerrero", mage: "mago" };
const actions = {
  paladin: ["idle", "walk", "walkUp", "basic", "special", "ultimate"],
  warrior: ["idle", "basic", "special", "ultimate"],
  mage: ["walk", "basic", "special", "ultimate"],
};
type Clip = { duration:number; delays:number[]; count: number; originX: number; originY: number; scale: number };
const TILE = 70,
  OFFSET = 30;
class Courtyard extends Phaser.Scene {
  snapshot: GameView;
  preferences: Preferences;
  actors = new Map<string, Phaser.GameObjects.Container>();
  grid?: Phaser.GameObjects.Graphics;
  decor?: Phaser.GameObjects.Container;
  ready = false;
  positions = new Map<string, { x: number; y: number }>();
  seen = new Set<string>();
  initialized = false;
  animate(
    actor: Phaser.GameObjects.Container,
    classId: keyof typeof categories,
    action: string,
  ) {
    const sprite = actor.getByName("sprite") as Phaser.GameObjects.Sprite;
    const meta = this.cache.json.get(classId + "-clips") as Record<
      string,
      Clip
    >;
    const clip = meta?.[action];
    if (
      !sprite ||
      !clip ||
      !this.anims.exists(classId + "-" + action) ||
      this.preferences.reducedMotion
    )
      return;
    sprite
      .setOrigin(clip.originX, clip.originY)
      .setScale(clip.scale)
      .play(classId + "-" + action);
  }
  idle(actor: Phaser.GameObjects.Container, classId: keyof typeof categories) {
    if (
      classId === "mage" ||
      this.preferences.reducedMotion ||
      !this.anims.exists(classId + "-idle")
    ) {
      const sprite = actor.getByName("sprite") as Phaser.GameObjects.Sprite;
      sprite.stop().setTexture(classId).setOrigin(0.5, 1);
      const height=classId === "paladin" ? 112 : 105;
      sprite.setDisplaySize((sprite.width / sprite.height) * height, height);
    } else this.animate(actor, classId, "idle");
  }
  constructor(
    snapshot: GameView,
    preferences: Preferences,
    private report: (status: string) => void,
  ) {
    super("courtyard");
    this.snapshot = snapshot;
    this.preferences = preferences;
  }
  preload() {
    this.load.on("loaderror", () =>
      this.report("No se pudieron cargar todos los gráficos."),
    );
    this.load.image("courtyard", "/assets/mapas/generated/courtyard.webp");
    for (const [id, value] of Object.entries(classes)) {
      this.load.image(id, value.portrait);
      this.load.json(
        id + "-clips",
        "/assets/" +
          categories[id as keyof typeof categories] +
          "/generated/animations.json",
      );
      for (const action of actions[id as keyof typeof actions])
        this.load.spritesheet(
          id + "-" + action,
          "/assets/" +
            categories[id as keyof typeof categories] +
            "/generated/" +
            action +
            ".png",
          { frameWidth: 256, frameHeight: 256 },
        );
    }
  }
  create() {
    for (const id of Object.keys(categories) as (keyof typeof categories)[]) {
      const clips = this.cache.json.get(id + "-clips") as Record<string, Clip>;
      for (const [action, clip] of Object.entries(clips ?? {}))
        if (this.textures.exists(id + "-" + action))
          this.anims.create({
            key: id + "-" + action,
            frames: this.anims.generateFrameNumbers(id + "-" + action, {
              start: 0,
              end: clip.count - 1,
            }),
            frameRate: 1000,
          repeat: action === "idle" ? -1 : 0,
          });
    }
    if (this.textures.exists("courtyard"))
      this.add
        .image(380, 380, "courtyard")
        .setDisplaySize(760, 760)
        .setAlpha(0.63);
    this.add.rectangle(380, 380, 760, 760, 0x0c1714, 0.16);
    this.grid = this.add.graphics();
    this.decor = this.add.container(0, 0);
    this.ready = true;
    this.paint(this.snapshot);
    this.report(
      this.textures.exists("courtyard")
        ? "ready"
        : "No se pudo cargar la imagen del mapa.",
    );
  }
  paint(state: GameView) {
    this.snapshot = state;
    if (!this.ready) return;
    const grid = this.grid!;
    grid.clear();
    if (this.preferences.grid) {
      grid.lineStyle(1, 0xd2ddbb, 0.21);
      for (let x = 0; x <= 10; x++) {
        grid.lineBetween(
          OFFSET + x * TILE,
          OFFSET,
          OFFSET + x * TILE,
          OFFSET + 10 * TILE,
        );
        grid.lineBetween(
          OFFSET,
          OFFSET + x * TILE,
          OFFSET + 10 * TILE,
          OFFSET + x * TILE,
        );
      }
    }
    this.decor!.removeAll(true);
    const label = (x: number, y: number, text: string, color = "#f5df9b") =>
      this.decor!.add(
        this.add
          .text(OFFSET + x * TILE + 35, OFFSET + y * TILE + 35, text, {
            fontFamily: "Georgia",
            fontSize: "29px",
            color,
            stroke: "#102018",
            strokeThickness: 3,
          })
          .setOrigin(0.5),
      );
    for (const wall of state.map.walls) {
      const g = this.add.graphics();
      g.fillStyle(0x253830, 0.96).fillRoundedRect(
        OFFSET + wall.x * TILE + 4,
        OFFSET + wall.y * TILE + 4,
        62,
        62,
        5,
      );
      g.lineStyle(2, 0x83917c, 0.55).strokeRoundedRect(
        OFFSET + wall.x * TILE + 4,
        OFFSET + wall.y * TILE + 4,
        62,
        62,
        5,
      );
      this.decor!.add(g);
      label(wall.x, wall.y, "▰", "#8a9985");
    }
    for (const chest of state.chests) {
      const x = OFFSET + chest.x * TILE + 35,
        y = OFFSET + chest.y * TILE + 35,
        g = this.add.graphics();
      g.fillStyle(chest.opened ? 0x625338 : 0xb68b43).fillRoundedRect(
        x - 19,
        y - 13,
        38,
        28,
        3,
      );
      g.lineStyle(3, 0xead08a).lineBetween(x - 19, y - 2, x + 19, y - 2);
      g.fillStyle(0x202b20).fillRect(x - 3, y - 4, 6, 10);
      this.decor!.add(g);
    }
    for (const zone of state.zones) {
      const x = OFFSET + zone.x * TILE + 35,
        y = OFFSET + zone.y * TILE + 35,
        g = this.add.graphics();
      g.lineStyle(
        2,
        zone.kind === "exit" ? 0xddc982 : 0x77cab4,
        0.9,
      ).strokeCircle(x, y, 23);
      this.decor!.add(g);
      label(
        zone.x,
        zone.y,
        zone.kind === "exit" ? "◇" : "✧",
        zone.kind === "exit" ? "#ead794" : "#8ee3d0",
      );
    }
    const active = state.players.find((p) => p.id === state.activePlayerId);
    if (active) {
      grid
        .lineStyle(3, 0xf1d48d, 1)
        .strokeRoundedRect(
          OFFSET + active.x * TILE + 2,
          OFFSET + active.y * TILE + 2,
          66,
          66,
          5,
        );
    }
    const visible = new Set<string>();
    for (const entity of [...state.players, ...state.enemies]) {
      visible.add(entity.id);
      const player = "classId" in entity;
      let actor = this.actors.get(entity.id);
      if (!actor) {
        actor = this.add.container(0, 0);
        if (player) {
          const image = this.add
            .sprite(0, 25, entity.classId)
            .setName("sprite")
            .setOrigin(0.5, 1);
          const height=entity.classId === "paladin" ? 112 : 105;
          image.setDisplaySize((image.width / image.height) * height,height);
          actor.add(image);
          this.idle(actor, entity.classId);
        } else {
          const body = this.add.graphics();
          body.fillStyle(0x943e43).fillCircle(0, -5, 19);
          body.lineStyle(2, 0xe9a49a).strokeCircle(0, -5, 19);
          actor.add(body);
          actor.add(
            this.add
              .text(0, -5, "✦", { fontSize: "25px", color: "#ffe3ca" })
              .setOrigin(0.5),
          );
        }
        actor.add(
          this.add
            .text(0, 34, player ? entity.name : entity.name.split(" ")[0], {
              fontFamily: "Arial",
              fontSize: "11px",
              color: "#fff8dc",
              stroke: "#102018",
              strokeThickness: 3,
            })
            .setOrigin(0.5),
        );
        this.actors.set(entity.id, actor);
        actor.setPosition(
          OFFSET + entity.x * TILE + 35,
          OFFSET + entity.y * TILE + 30,
        );
      }
      const x = OFFSET + entity.x * TILE + 35,
        y = OFFSET + entity.y * TILE + 30;
      const previous = this.positions.get(entity.id);
      this.positions.set(entity.id, { x: entity.x, y: entity.y });
      if (previous && (previous.x !== entity.x || previous.y !== entity.y)) {
        if (player)
          this.animate(
            actor,
            entity.classId,
            entity.classId === "paladin" && entity.y < previous.y
              ? "walkUp"
              : "walk",
          );
        if (
          player &&
          entity.classId === "warrior" &&
          !this.preferences.reducedMotion
        ) {
          const sprite = actor.getByName("sprite");
          this.tweens.killTweensOf(sprite);
          this.tweens.add({
            targets: sprite,
            y: 19,
            duration: 95,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
              (sprite as Phaser.GameObjects.Sprite).y = 25;
            },
          });
        }
        this.tweens.killTweensOf(actor);
        this.tweens.add({
          targets: actor,
          x,
          y,
          duration: this.preferences.reducedMotion ? 0 : player ? ((this.cache.json.get(entity.classId+"-clips") as Record<string,Clip> | undefined)?.[entity.classId==="paladin" && entity.y<(previous?.y??entity.y)?"walkUp":"walk"]?.duration ?? 790) : 790,
          onComplete: () => {
            if (player) {
              const sprite = actor!.getByName(
                "sprite",
              ) as Phaser.GameObjects.Sprite;
              const key = sprite.anims.currentAnim?.key ?? "";
              if (
                !sprite.anims.isPlaying ||
                key.endsWith("-idle") ||
                key.includes("-walk")
              )
                this.idle(actor!, entity.classId);
            }
          },
          ease: "Sine.easeOut",
        });
      }
      if (player && this.preferences.reducedMotion)
        this.idle(actor, entity.classId);
      actor.setAlpha(entity.hp <= 0 ? 0.25 : 1);
      actor.setDepth(10 + entity.y);
      const max = player ? entity.stats.maxHp : entity.maxHp;
      (
        actor.getByName("health") as Phaser.GameObjects.Graphics | null
      )?.destroy();
      const health = this.add.graphics().setName("health");
      const healthY=player ? (entity.classId === "paladin" ? -96 : -89) : -48;
      health.fillStyle(0x101915, 0.95).fillRoundedRect(-24, healthY, 48, 5, 2);
      health
        .fillStyle(player ? 0x7eb99b : 0xd67b6e)
        .fillRoundedRect(-24, healthY, 48 * Math.max(0, entity.hp / max), 5, 2);
      actor.add(health);
      if (state.selectedTarget === entity.id) {
        grid.lineStyle(2, 0xe88c7d, 0.95).strokeCircle(x, y, 29);
      }
    }
    for (const event of state.events) {
      if (this.seen.has(event.id)) continue;
      this.seen.add(event.id);
      if (
        !this.initialized ||
        !event.actorId ||
        !event.targetId ||
        this.preferences.reducedMotion
      )
        continue;
      const actor = this.actors.get(event.actorId),
        target = this.actors.get(event.targetId);
      const player = state.players.find((p) => p.id === event.actorId);
      if (actor && player) {
        this.animate(actor, player.classId, event.ability ?? "basic");
        const sprite = actor.getByName("sprite") as Phaser.GameObjects.Sprite;
        sprite.once("animationcomplete", () =>
          this.idle(actor, player.classId),
        );
      }
      if (target) {
        const fx = this.add
          .circle(
            target.x,
            target.y,
            15,
            event.ability === "ultimate" ? 0xffd261 : 0xa7def2,
            0.7,
          )
          .setDepth(100);
        this.tweens.add({
          targets: fx,
          scale: 2.5,
          alpha: 0,
          duration: 650,
          onComplete: () => fx.destroy(),
        });
        const label = this.add
          .text(
            target.x,
            target.y - 40,
            event.amount ? "-" + event.amount : "Fallo",
            {
              fontSize: "21px",
              color: "#fff2cf",
              stroke: "#241b15",
              strokeThickness: 4,
            },
          )
          .setOrigin(0.5)
          .setDepth(101);
        this.tweens.add({
          targets: label,
          y: target.y - 85,
          alpha: 0,
          duration: 1100,
          onComplete: () => label.destroy(),
        });
      }
    }
    this.initialized = true;
    for (const [id, actor] of this.actors)
      if (!visible.has(id)) {
        actor.destroy();
        this.actors.delete(id);
      }
  }
}
export default function GameBoard({
  game,
  preferences,
}: {
  game: GameView;
  preferences: Preferences;
}) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("loading");
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<Courtyard | null>(null);
  useEffect(() => {
    if (!host.current) return;
    setStatus("loading");
    let mounted = true;
    const level = new Courtyard(game, preferences, (status) => {
      if (mounted) setStatus(status);
    });
    scene.current = level;
    const engine = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      width: 760,
      height: 760,
      backgroundColor: "#101b16",
      pixelArt: true,
      scene: level,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      audio: { noAudio: true },
    });
    const timeout = window.setTimeout(() => {
      if (!level.ready) setStatus("El tablero está tardando en cargar.");
    }, 15000);
    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      engine.destroy(true);
      scene.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    if (scene.current) {
      scene.current.preferences = preferences;
      scene.current.paint(game);
    }
  }, [game, preferences]);
  return (
    <>
      {status !== "ready" && (
        <div className="board-load-status" role="status">
          {status === "loading" ? "Cargando mapa y personajes…" : status}
          {status !== "loading" && (
            <button
              className="button small"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Reintentar gráficos
            </button>
          )}
        </div>
      )}
      <div
        data-board-status={status}
        className="game-canvas"
        ref={host}
        role="img"
        aria-label={`Tablero por casillas. Ronda ${game.round}. ${game.players.map((p) => `${p.name}: casilla ${p.x},${p.y}`).join(". ")}`}
      />
    </>
  );
}
