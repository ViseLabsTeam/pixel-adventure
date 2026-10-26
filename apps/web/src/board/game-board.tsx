import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import {
  actorRecipes,
  animationTimings,
  classes,
  combatPresentation,
  courtyardSpawns,
  diceTimings,
  movementStepMs,
} from "@umbral/content";
import type { GameView } from "@umbral/protocol";
import type { Preferences } from "../ui/shared";
import { facingOriginX } from "./sprite-facing";
import { impactKnockback, isDamagingImpact } from "./impact-knockback";
import {
  BOARD_OFFSET as OFFSET,
  TILE_SIZE as TILE,
  cameraScrollRange,
  centeredScroll,
  followScroll,
  initialFocusTile,
  scrollToWorldOrigin,
  tileCenter,
  worldOriginToScroll,
  worldViewport,
  zoomForExtraTiles,
} from "./camera-geometry";
import treeLayers from "../../../../assets/mapas/generated/trees.json";
const actorArt = { ...actorRecipes.players, ...actorRecipes.enemies };
type ActorArtId = keyof typeof actorArt;
type ImpactVisual = Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
type Clip = {
  duration: number;
  delays: number[];
  count: number;
  originX: number;
  originY: number;
  scale: number;
};
const ART_VERSION = "passive-20261019";
class Courtyard extends Phaser.Scene {
  snapshot: GameView;
  preferences: Preferences;
  actors = new Map<string, Phaser.GameObjects.Container>();
  grid?: Phaser.GameObjects.Graphics;
  highlights?: Phaser.GameObjects.Graphics;
  decor?: Phaser.GameObjects.Container;
  private gridSignature = "";
  private scenerySignature = "";
  private initialCameraCenter: { x: number; y: number };
  private cameraStateSignature = "";
  ready = false;
  positions = new Map<string, { x: number; y: number }>();
  displayedHp = new Map<string, number>();
  displayedMaxHp = new Map<string, number>();
  pendingImpacts = new Map<string, number>();
  private impactVisuals = new Map<
    string,
    {
      visual: ImpactVisual;
      baseX: number;
      baseY: number;
      offset: { x: number; y: number };
      timer: Phaser.Time.TimerEvent;
      knockbackTween?: Phaser.Tweens.Tween;
      returnTween?: Phaser.Tweens.Tween;
      restoreColor: () => void;
    }
  >();
  seen = new Set<string>();
  initialized = false;
  visualJobs = new Set<() => void>();
  finishPresentation() {
    if (this.visualJobs.size === 0 && this.snapshot.animationPending)
      this.onAnimationComplete(this.snapshot.revision);
  }
  setActorDepth(actor: Phaser.GameObjects.Container) {
    actor.setDepth(
      10 + (actor.y + 25 - OFFSET) / TILE - this.snapshot.map.minY,
    );
  }
  beginVisual() {
    const done = () => {
      if (!this.visualJobs.delete(done)) return;
      this.finishPresentation();
    };
    this.visualJobs.add(done);
    return done;
  }
  face(actor: Phaser.GameObjects.Container, fromX: number, targetX: number) {
    if (fromX === targetX) return;
    const sprite = actor.getByName(
      "sprite",
    ) as Phaser.GameObjects.Sprite | null;
    if (sprite) {
      const sourceOriginX = sprite.flipX ? 1 - sprite.originX : sprite.originX;
      const facingLeft = targetX < fromX;
      sprite
        .setFlipX(facingLeft)
        .setOrigin(facingOriginX(sourceOriginX, facingLeft), sprite.originY);
    }
    const marker = (actor.getByName("facing") ??
      (
        actor.getByName("impact-visual") as Phaser.GameObjects.Container | null
      )?.getByName("facing")) as Phaser.GameObjects.Text | null;
    marker?.setText(targetX < fromX ? "◀" : "▶");
  }
  private syncImpactMarker() {
    const host = this.game.canvas.parentElement;
    if (!host) return;
    const first = this.impactVisuals.entries().next().value;
    if (!first) {
      delete host.dataset.impactTargetId;
      delete host.dataset.impactOffsetX;
      delete host.dataset.impactOffsetY;
      return;
    }
    const [id, impact] = first;
    host.dataset.impactTargetId = id;
    host.dataset.impactOffsetX = String(impact.offset.x);
    host.dataset.impactOffsetY = String(impact.offset.y);
  }
  private clearImpactVisual(id: string) {
    const impact = this.impactVisuals.get(id);
    if (!impact) return;
    impact.timer.remove();
    impact.knockbackTween?.stop();
    impact.returnTween?.stop();
    impact.visual.setPosition(impact.baseX, impact.baseY);
    impact.restoreColor();
    this.impactVisuals.delete(id);
    this.syncImpactMarker();
  }
  private showHitReaction(
    event: GameView["events"][number],
    target: Phaser.GameObjects.Container,
    entityId: string,
    attacker: { x: number; y: number },
    defender: { x: number; y: number },
  ) {
    if (!isDamagingImpact(event, this.preferences.reducedMotion)) return;
    this.clearImpactVisual(entityId);
    const sprite = target.getByName(
      "sprite",
    ) as Phaser.GameObjects.Sprite | null;
    const fallback = target.getByName(
      "impact-visual",
    ) as Phaser.GameObjects.Container | null;
    const visual: ImpactVisual | null = sprite ?? fallback;
    if (!visual) return;
    const baseX = visual.x;
    const baseY = visual.y;
    const offset = impactKnockback(attacker, defender);
    let restoreColor: () => void;
    if (sprite) {
      sprite.setTint(0xff0000).setTintMode(Phaser.TintModes.FILL);
      restoreColor = () => sprite.clearTint();
    } else {
      const body = fallback?.getByName(
        "fallback-body",
      ) as Phaser.GameObjects.Arc | null;
      const symbol = fallback?.getByName(
        "fallback-symbol",
      ) as Phaser.GameObjects.Text | null;
      const marker = fallback?.getByName(
        "facing",
      ) as Phaser.GameObjects.Text | null;
      body?.setFillStyle(0xff0000).setStrokeStyle(2, 0xff0000);
      symbol?.setColor("#ff0000");
      marker?.setColor("#ff0000");
      restoreColor = () => {
        body?.setFillStyle(0x943e43).setStrokeStyle(2, 0xe9a49a);
        symbol?.setColor("#ffe3ca");
        marker?.setColor("#ffe3ca");
      };
    }
    const timer = this.time.delayedCall(1000, () =>
      this.clearImpactVisual(entityId),
    );
    this.impactVisuals.set(entityId, {
      visual,
      baseX,
      baseY,
      offset,
      timer,
      restoreColor,
    });
    this.syncImpactMarker();
    const impact = this.impactVisuals.get(entityId)!;
    impact.knockbackTween = this.tweens.add({
      targets: visual,
      x: baseX + offset.x,
      y: baseY + offset.y,
      duration: 120,
      ease: "Sine.easeOut",
      onComplete: () => {
        if (this.impactVisuals.get(entityId) !== impact) return;
        impact.returnTween = this.tweens.add({
          targets: visual,
          x: baseX,
          y: baseY,
          duration: 240,
          ease: "Sine.easeOut",
        });
      },
    });
  }
  moveCamera(x: number, y: number, duration = 0) {
    const camera = this.cameras.main;
    const viewport = worldViewport(camera, camera.zoom);
    const range = cameraScrollRange(
      this.snapshot.map,
      viewport,
      this.initialCameraCenter,
    );
    const nextOrigin = followScroll(
      tileCenter({ x, y }),
      scrollToWorldOrigin(
        { x: camera.scrollX, y: camera.scrollY },
        camera,
        viewport,
      ),
      viewport,
      camera.zoom,
      range,
    );
    const next = worldOriginToScroll(nextOrigin, camera, viewport);
    this.tweens.killTweensOf(camera);
    if (duration && !this.preferences.reducedMotion)
      this.tweens.add({
        targets: camera,
        scrollX: next.x,
        scrollY: next.y,
        duration,
      });
    else camera.setScroll(next.x, next.y);
  }
  configureCamera(center = false) {
    const camera = this.cameras.main;
    if (!camera.width || !camera.height) return;
    camera.setZoom(zoomForExtraTiles(camera));
    const viewport = worldViewport(camera, camera.zoom);
    const range = cameraScrollRange(
      this.snapshot.map,
      viewport,
      this.initialCameraCenter,
    );
    camera.setBounds(
      range.minX,
      range.minY,
      range.maxX - range.minX + viewport.width,
      range.maxY - range.minY + viewport.height,
    );
    if (center) {
      const scroll = worldOriginToScroll(
        centeredScroll(this.initialCameraCenter, viewport),
        camera,
        viewport,
      );
      camera.setScroll(scroll.x, scroll.y);
    }
  }
  update() {
    if (!this.ready) return;
    const camera = this.cameras.main;
    const viewport = worldViewport(camera, camera.zoom);
    const origin = scrollToWorldOrigin(
      { x: camera.scrollX, y: camera.scrollY },
      camera,
      viewport,
    );
    const signature = [
      camera.zoom,
      origin.x,
      origin.y,
      viewport.width,
      viewport.height,
    ].join(":");
    if (signature === this.cameraStateSignature) return;
    this.cameraStateSignature = signature;
    const host = this.game.canvas.parentElement;
    if (!host) return;
    host.dataset.cameraZoom = String(camera.zoom);
    host.dataset.cameraLeft = String(origin.x);
    host.dataset.cameraTop = String(origin.y);
    host.dataset.cameraWorldWidth = String(viewport.width);
    host.dataset.cameraWorldHeight = String(viewport.height);
  }
  drawHealth(
    actor: Phaser.GameObjects.Container,
    entity: GameView["players"][number] | GameView["enemies"][number],
    hp: number,
  ) {
    const player = "classId" in entity;
    let health = actor.getByName(
      "health",
    ) as Phaser.GameObjects.Graphics | null;
    if (!health) {
      health = this.add.graphics().setName("health");
      actor.add(health);
    }
    health.clear();
    const healthY = player ? (entity.classId === "paladin" ? -96 : -89) : -48;
    const max = player ? entity.stats.maxHp : entity.maxHp;
    health.fillStyle(0x101915, 0.95).fillRoundedRect(-24, healthY, 48, 5, 2);
    health
      .fillStyle(player ? 0x7eb99b : 0xd67b6e)
      .fillRoundedRect(-24, healthY, 48 * Math.max(0, hp / max), 5, 2);
  }
  showImpact(
    event: GameView["events"][number],
    target: Phaser.GameObjects.Container,
    entity: GameView["players"][number] | GameView["enemies"][number],
    hp: number,
    attacker: { x: number; y: number } | undefined,
  ) {
    const finishHealth = () => {
      this.displayedHp.set(entity.id, hp);
      this.drawHealth(target, entity, hp);
      target.setAlpha(hp <= 0 ? 0.25 : 1);
      const remaining = (this.pendingImpacts.get(entity.id) ?? 1) - 1;
      if (remaining > 0) this.pendingImpacts.set(entity.id, remaining);
      else this.pendingImpacts.delete(entity.id);
    };
    if (this.preferences.reducedMotion) {
      finishHealth();
      return;
    }
    if (attacker)
      this.showHitReaction(event, target, entity.id, attacker, entity);
    const done = this.beginVisual();
    const fx = this.add
      .circle(
        target.x,
        target.y,
        15,
        event.ability === "ultimate" ? 0xffd261 : 0xa7def2,
        0.7,
      )
      .setDepth(100 + this.snapshot.map.height);
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
        event.kind === "MISS" ? "Fallo" : "-" + (event.amount ?? 0),
        {
          fontFamily: "Pixel Operator",
          fontSize: "21px",
          color: "#fff2cf",
          stroke: "#241b15",
          strokeThickness: 4,
        },
      )
      .setOrigin(0.5)
      .setDepth(101 + this.snapshot.map.height);
    this.time.delayedCall(combatPresentation.resultMs, () => {
      const current = this.displayedHp.get(entity.id) ?? hp;
      if (current === hp) {
        finishHealth();
        return;
      }
      const meter = { value: current };
      this.tweens.add({
        targets: meter,
        value: hp,
        duration: combatPresentation.lingerMs,
        onUpdate: () => {
          this.displayedHp.set(entity.id, meter.value);
          this.drawHealth(target, entity, meter.value);
        },
        onComplete: finishHealth,
      });
    });
    this.tweens.add({
      targets: label,
      y: target.y - 85,
      alpha: 0,
      duration: combatPresentation.totalMs,
      onComplete: () => {
        label.destroy();
        done();
      },
    });
  }
  animate(
    actor: Phaser.GameObjects.Container,
    classId: ActorArtId,
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
      .setOrigin(facingOriginX(clip.originX, sprite.flipX), clip.originY)
      .setScale(clip.scale)
      .play(classId + "-" + action);
  }
  idle(actor: Phaser.GameObjects.Container, classId: ActorArtId) {
    if (
      this.preferences.reducedMotion ||
      !this.anims.exists(classId + "-idle")
    ) {
      const sprite = actor.getByName("sprite") as Phaser.GameObjects.Sprite;
      sprite.stop().setTexture(classId).setOrigin(0.5, 1);
      const height = actorArt[classId].height;
      sprite.setDisplaySize((sprite.width / sprite.height) * height, height);
    } else this.animate(actor, classId, "idle");
  }
  constructor(
    snapshot: GameView,
    preferences: Preferences,
    private report: (status: string) => void,
    private onAnimationComplete: (revision: number) => void,
  ) {
    super("courtyard");
    this.snapshot = snapshot;
    this.preferences = preferences;
    const focus = initialFocusTile(
      snapshot.players,
      courtyardSpawns,
      snapshot.activePlayerId,
      snapshot.round,
    );
    this.initialCameraCenter = tileCenter(focus ?? { x: 0, y: 0 });
  }
  preload() {
    this.load.on("loaderror", () =>
      this.report("No se pudieron cargar todos los gráficos."),
    );
    this.load.image("courtyard", "/assets/mapas/generated/courtyard.webp");
    for (const layer of treeLayers)
      this.load.image("tree-" + layer.id, `/assets/${layer.image}`);
    for (const id of Object.keys(actorArt) as ActorArtId[]) {
      const recipe = actorArt[id];
      if (id in classes)
        this.load.image(id, classes[id as keyof typeof classes].portrait);
      else
        this.load.image(id, `/assets/${recipe.folder}/generated/portrait.png`);
      this.load.json(
        id + "-clips",
        `/assets/${recipe.folder}/generated/animations.json?v=${ART_VERSION}`,
      );
      for (const action of Object.keys(recipe.clips))
        this.load.spritesheet(
          id + "-" + action,
          `/assets/${recipe.folder}/generated/${action}.png?v=${ART_VERSION}`,
          { frameWidth: 256, frameHeight: 256 },
        );
    }
  }
  create() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const id of [...this.impactVisuals.keys()])
        this.clearImpactVisual(id);
    });
    for (const id of Object.keys(actorArt) as ActorArtId[]) {
      const clips = this.cache.json.get(id + "-clips") as Record<string, Clip>;
      for (const [action, clip] of Object.entries(clips ?? {}))
        if (this.textures.exists(id + "-" + action))
          this.anims.create({
            key: id + "-" + action,
            frames: Array.from({ length: clip.count }, (_, frame) => ({
              key: id + "-" + action,
              frame,
              duration: Math.max(0, clip.delays[frame] - 1),
            })),
            frameRate: 1000,
            repeat: action === "idle" ? -1 : 0,
          });
    }
    if (this.textures.exists("courtyard"))
      this.add
        .image(
          OFFSET - 494 * (TILE / 16),
          OFFSET - 366 * (TILE / 16),
          "courtyard",
        )
        .setOrigin(0, 0)
        .setScale(TILE / 16);
    for (const layer of treeLayers) {
      if (!this.textures.exists("tree-" + layer.id)) continue;
      const image = this.add
        .image(
          OFFSET + (layer.left - 494) * (TILE / 16),
          OFFSET + (layer.top - 366) * (TILE / 16),
          "tree-" + layer.id,
        )
        .setOrigin(0, 0)
        .setScale(TILE / 16);
      image.setDepth(10 + (layer.footY - 366) / 16 - this.snapshot.map.minY);
    }
    this.grid = this.add.graphics();
    this.highlights = this.add.graphics();
    this.decor = this.add.container(0, 0);
    this.configureCamera(true);
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
    if (this.preferences.reducedMotion) {
      for (const id of [...this.impactVisuals.keys()])
        this.clearImpactVisual(id);
      for (const done of this.visualJobs) done();
    }
    const grid = this.grid!;
    const gridSignature = `${this.preferences.grid}:${state.map.minX}:${state.map.minY}:${state.map.width}:${state.map.height}`;
    if (gridSignature !== this.gridSignature) {
      this.gridSignature = gridSignature;
      grid.clear();
      if (this.preferences.grid) {
        grid.lineStyle(1, 0xd2ddbb, 0.21);
        for (
          let x = state.map.minX;
          x <= state.map.minX + state.map.width;
          x++
        ) {
          grid.lineBetween(
            OFFSET + x * TILE,
            OFFSET + state.map.minY * TILE,
            OFFSET + x * TILE,
            OFFSET + (state.map.minY + state.map.height) * TILE,
          );
        }
        for (
          let y = state.map.minY;
          y <= state.map.minY + state.map.height;
          y++
        ) {
          grid.lineBetween(
            OFFSET + state.map.minX * TILE,
            OFFSET + y * TILE,
            OFFSET + (state.map.minX + state.map.width) * TILE,
            OFFSET + y * TILE,
          );
        }
      }
    }
    const highlights = this.highlights!;
    highlights.clear();
    const scenerySignature = JSON.stringify([
      state.chests,
      state.zones,
      state.interactables,
    ]);
    if (scenerySignature !== this.scenerySignature) {
      this.scenerySignature = scenerySignature;
      this.decor!.removeAll(true);
      const label = (x: number, y: number, text: string, color = "#f5df9b") =>
        this.decor!.add(
          this.add
            .text(OFFSET + x * TILE + 35, OFFSET + y * TILE + 35, text, {
              fontFamily: "Pixel Operator",
              fontSize: "29px",
              color,
              stroke: "#102018",
              strokeThickness: 3,
            })
            .setOrigin(0.5),
        );
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
      for (const object of state.interactables) {
        if (object.used) continue;
        const x = OFFSET + object.x * TILE + 35;
        const y = OFFSET + object.y * TILE + 35;
        const g = this.add.graphics();
        g.fillStyle(object.kind === "plant" ? 0x7dbb68 : 0x9ab7b0).fillCircle(
          x,
          y,
          13,
        );
        g.lineStyle(2, 0xf3eab8).strokeCircle(x, y, 13);
        this.decor!.add(g);
        label(object.x, object.y, object.kind === "plant" ? "✿" : "✦");
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
    }
    const active = state.players.find((p) => p.id === state.activePlayerId);
    if (active) {
      highlights
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
    const freshImpacts = state.events.filter(
      (event) =>
        !this.seen.has(event.id) &&
        this.initialized &&
        event.actorId &&
        event.targetId &&
        ["ATTACK", "ENEMY", "MISS"].includes(event.kind),
    );
    for (const event of freshImpacts) {
      const targetId = event.targetId;
      if (!targetId) continue;
      this.pendingImpacts.set(
        targetId,
        (this.pendingImpacts.get(targetId) ?? 0) + 1,
      );
    }
    const movementDurations = new Map<string, number>();
    let cameraDuration = 0;
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
          const height = actorArt[entity.classId].height;
          image.setDisplaySize((image.width / image.height) * height, height);
          actor.add(image);
          this.idle(actor, entity.classId);
        } else if (
          entity.archetypeId in actorRecipes.enemies &&
          this.textures.exists(entity.archetypeId)
        ) {
          const image = this.add
            .sprite(0, 25, entity.archetypeId)
            .setName("sprite");
          actor.add(image);
          this.idle(
            actor,
            entity.archetypeId as keyof typeof actorRecipes.enemies,
          );
        } else {
          const visual = this.add.container(0, 0).setName("impact-visual");
          visual.add(
            this.add
              .circle(0, -5, 19, 0x943e43)
              .setStrokeStyle(2, 0xe9a49a)
              .setName("fallback-body"),
          );
          visual.add(
            this.add
              .text(0, -5, "✦", { fontSize: "25px", color: "#ffe3ca" })
              .setName("fallback-symbol")
              .setOrigin(0.5),
          );
          visual.add(
            this.add
              .text(0, 12, "▶", { fontSize: "12px", color: "#ffe3ca" })
              .setName("facing")
              .setOrigin(0.5),
          );
          actor.add(visual);
        }
        actor.add(
          this.add
            .text(0, 34, player ? entity.name : entity.name.split(" ")[0], {
              fontFamily: "Pixel Operator",
              fontSize: "16px",
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
        const clips = player ? actorArt[entity.classId].clips : null;
        const walkAction =
          player && entity.y < previous.y && clips && "walkUp" in clips
            ? "walkUp"
            : player && entity.y > previous.y && clips && "walkDown" in clips
              ? "walkDown"
              : player && clips && "walk" in clips
                ? "walk"
                : "idle";
        const moveDuration = movementStepMs;
        movementDurations.set(entity.id, moveDuration);
        if (entity.id === state.activePlayerId) cameraDuration = moveDuration;
        this.face(actor, previous.x, entity.x);
        if (player) {
          this.animate(actor, entity.classId, walkAction);
          const sprite = actor.getByName("sprite") as Phaser.GameObjects.Sprite;
          if (
            walkAction !== "idle" &&
            sprite.anims.isPlaying &&
            sprite.anims.currentAnim?.key === entity.classId + "-" + walkAction
          ) {
            const clipDone = this.beginVisual();
            sprite.once("animationcomplete", () => {
              this.idle(actor!, entity.classId);
              clipDone();
            });
          }
        }
        if (
          player &&
          entity.classId === "warrior" &&
          walkAction === "idle" &&
          !this.preferences.reducedMotion
        ) {
          const sprite = actor.getByName("sprite");
          this.tweens.killTweensOf(sprite);
          this.tweens.add({
            targets: sprite,
            y: 19,
            duration: 200,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
              (sprite as Phaser.GameObjects.Sprite).y = 25;
            },
          });
        }
        this.tweens.killTweensOf(actor);
        const done = this.beginVisual();
        this.tweens.add({
          targets: actor,
          x,
          y,
          duration: this.preferences.reducedMotion ? 0 : moveDuration,
          onUpdate: () => this.setActorDepth(actor!),
          onComplete: () => {
            this.setActorDepth(actor!);
            done();
            if (player) {
              const sprite = actor!.getByName(
                "sprite",
              ) as Phaser.GameObjects.Sprite;
              const key = sprite.anims.currentAnim?.key ?? "";
              if (!sprite.anims.isPlaying || key.endsWith("-idle"))
                this.idle(actor!, entity.classId);
            } else if (entity.archetypeId in actorRecipes.enemies) {
              this.idle(
                actor!,
                entity.archetypeId as keyof typeof actorRecipes.enemies,
              );
            }
          },
          ease: "Sine.easeOut",
        });
      }
      if (player && this.preferences.reducedMotion)
        this.idle(actor, entity.classId);
      if (!(previous && (previous.x !== entity.x || previous.y !== entity.y))) {
        const opponents = player ? state.enemies : state.players;
        const nearest = opponents
          .filter((opponent) => opponent.hp > 0 && opponent.x !== entity.x)
          .sort(
            (a, b) =>
              (a.y === entity.y ? 0 : 100) +
              Math.abs(a.x - entity.x) +
              Math.abs(a.y - entity.y) -
              ((b.y === entity.y ? 0 : 100) +
                Math.abs(b.x - entity.x) +
                Math.abs(b.y - entity.y)),
          )[0];
        if (nearest) this.face(actor, entity.x, nearest.x);
      }
      actor.setAlpha(
        (this.pendingImpacts.has(entity.id)
          ? (this.displayedHp.get(entity.id) ?? entity.hp)
          : entity.hp) <= 0
          ? 0.25
          : 1,
      );
      this.setActorDepth(actor);
      const shownHp = this.pendingImpacts.has(entity.id)
        ? (this.displayedHp.get(entity.id) ?? entity.hp)
        : entity.hp;
      const previousHp = this.displayedHp.get(entity.id);
      const maxHp = player ? entity.stats.maxHp : entity.maxHp;
      const previousMaxHp = this.displayedMaxHp.get(entity.id);
      this.displayedHp.set(entity.id, shownHp);
      this.displayedMaxHp.set(entity.id, maxHp);
      if (
        previousHp !== shownHp ||
        previousMaxHp !== maxHp ||
        !actor.getByName("health")
      )
        this.drawHealth(actor, entity, shownHp);
      if (state.selectedTarget === entity.id) {
        highlights.lineStyle(2, 0xe88c7d, 0.95).strokeCircle(x, y, 29);
      }
    }
    if (active) this.moveCamera(active.x, active.y, cameraDuration);
    const stagedHp = new Map<string, number>();
    let attackDelay = movementDurations.size ? movementStepMs : 0;
    for (const event of state.events) {
      if (this.seen.has(event.id)) continue;
      this.seen.add(event.id);
      if (
        this.initialized &&
        ["DICE", "ATTACK_D20", "ATTACK_MISS_ROLL", "ATTACK_D6"].includes(
          event.kind,
        )
      ) {
        const rollDuration =
          event.kind === "DICE"
            ? diceTimings.d6
            : event.kind === "ATTACK_D6"
              ? diceTimings.d6 + 1250
              : diceTimings.d20 + 1250;
        if (!this.preferences.reducedMotion) {
          const done = this.beginVisual();
          this.time.delayedCall(rollDuration, done);
        }
        if (event.kind === "ATTACK_D6") attackDelay += rollDuration;
        continue;
      }
      if (["ATTACK_D20", "ATTACK_MISS_ROLL", "ATTACK_D6"].includes(event.kind))
        continue;
      if (!this.initialized || !event.actorId || !event.targetId) continue;
      const actor = this.actors.get(event.actorId),
        target = this.actors.get(event.targetId);
      const player = state.players.find((p) => p.id === event.actorId);
      const entity = [...state.players, ...state.enemies].find(
        (item) => item.id === event.targetId,
      );
      if (!actor || !target || !entity) continue;
      const beforeHp =
        stagedHp.get(entity.id) ?? this.displayedHp.get(entity.id) ?? entity.hp;
      const afterHp = Math.max(0, beforeHp - (event.amount ?? 0));
      stagedHp.set(entity.id, afterHp);
      const from = [...state.players, ...state.enemies].find(
        (item) => item.id === event.actorId,
      );
      if (from) this.face(actor, from.x, entity.x);
      const enemyArtId = state.enemies.find(
        (enemy) => enemy.id === event.actorId,
      )?.archetypeId;
      const classId =
        player?.classId ??
        (enemyArtId && enemyArtId in actorRecipes.enemies
          ? (enemyArtId as keyof typeof actorRecipes.enemies)
          : null);
      const startAttack = () => {
        const show = () =>
          this.showImpact(event, target, entity, afterHp, from);
        const sprite = actor.getByName(
          "sprite",
        ) as Phaser.GameObjects.Sprite | null;
        if (
          classId &&
          sprite &&
          !this.preferences.reducedMotion &&
          this.anims.exists(classId + "-" + (event.ability ?? "basic"))
        ) {
          const done = this.beginVisual();
          sprite.once("animationcomplete", () => {
            show();
            this.idle(actor, classId);
            done();
          });
          this.animate(actor, classId, event.ability ?? "basic");
        } else if (!this.preferences.reducedMotion) {
          const done = this.beginVisual();
          this.time.delayedCall(1100, () => {
            show();
            done();
          });
        } else show();
      };
      const delay = attackDelay;
      attackDelay +=
        (classId && classId in actorRecipes.enemies
          ? animationTimings[classId as keyof typeof actorRecipes.enemies].basic
          : player
            ? animationTimings[player.classId][event.ability ?? "basic"]
            : 1100) + combatPresentation.totalMs;
      if (delay && !this.preferences.reducedMotion) {
        const done = this.beginVisual();
        this.time.delayedCall(delay, () => {
          startAttack();
          done();
        });
      } else startAttack();
    }
    this.initialized = true;
    this.finishPresentation();
    for (const [id, actor] of this.actors)
      if (!visible.has(id)) {
        this.clearImpactVisual(id);
        actor.destroy();
        this.actors.delete(id);
        this.positions.delete(id);
        this.displayedHp.delete(id);
        this.displayedMaxHp.delete(id);
        this.pendingImpacts.delete(id);
      }
    const currentEvents = new Set(state.events.map((event) => event.id));
    for (const id of this.seen)
      if (!currentEvents.has(id)) this.seen.delete(id);
  }
}
export default function GameBoard({
  game,
  preferences,
  onAnimationComplete,
}: {
  game: GameView;
  preferences: Preferences;
  onAnimationComplete: (revision: number) => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState("loading");
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<Courtyard | null>(null);
  useEffect(() => {
    if (!host.current) return;
    setStatus("loading");
    let mounted = true;
    const level = new Courtyard(
      game,
      preferences,
      (status) => {
        if (mounted) setStatus(status);
      },
      onAnimationComplete,
    );
    scene.current = level;
    const engine = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      width: host.current.clientWidth,
      height: host.current.clientHeight,
      backgroundColor: "#101b16",
      pixelArt: true,
      scene: level,
      scale: { mode: Phaser.Scale.RESIZE },
      audio: { noAudio: true },
    });
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width && height) {
        engine.scale.resize(width, height);
        if (level.ready) level.configureCamera();
        const active = level.snapshot.players.find(
          (player) => player.id === level.snapshot.activePlayerId,
        );
        if (level.ready && active) level.moveCamera(active.x, active.y);
      }
    });
    observer.observe(host.current);
    const timeout = window.setTimeout(() => {
      if (!level.ready) setStatus("El tablero está tardando en cargar.");
    }, 15000);
    return () => {
      mounted = false;
      observer.disconnect();
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
