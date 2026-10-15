import type { LevelDef, PlatformKind, SimEvent, Vec3 } from "./types";

export const HW = 0.28;
export const HD = 0.28;
export const HEIGHT = 1.18;
export const MOVE_SPEED = 8.2;
export const AIR_SPEED = 7.6;
export const ACCEL = 58;
export const AIR_ACCEL = 34;
export const GRAVITY_UP = 28;
export const GRAVITY_DOWN = 50;
export const JUMP_VEL = 12.4;
export const DOUBLE_JUMP_VEL = 11.2;
export const TERM = 26;
export const COYOTE = 0.1;
export const JUMP_BUFFER = 0.13;

type V3 = { x: number; y: number; z: number };

function v3(src: Vec3): V3 {
  return { x: src[0], y: src[1], z: src[2] };
}

export type PlatformRt = {
  rest: V3;
  size: V3;
  off: V3;
  prevOff: V3;
  motion: { axis: "x" | "y" | "z"; amp: number; period: number; phase: number } | null;
  kind: PlatformKind;
};

export type Player = {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  grounded: boolean;
  jumpsLeft: number;
  coyote: number;
  jumpBuffer: number;
  jumpCut: boolean;
  onPlat: number;
  dead: boolean;
  deathKind: "hazard" | "fall" | null;
  invuln: number;
  squash: number;
  runPhase: number;
};

export type World = {
  def: LevelDef;
  time: number;
  platforms: PlatformRt[];
  coins: { pos: V3; taken: boolean }[];
  hazards: { pos: V3; size: V3 }[];
  checkpoints: { pos: V3; active: boolean }[];
  flag: V3;
  flagTaken: boolean;
  spawn: V3;
  spawnYaw: number;
  killY: number;
  coinsTaken: number;
};

export function createWorld(def: LevelDef): World {
  return {
    def,
    time: 0,
    platforms: def.platforms.map((p) => ({
      rest: v3(p.pos),
      size: v3(p.size),
      off: { x: 0, y: 0, z: 0 },
      prevOff: { x: 0, y: 0, z: 0 },
      motion: p.motion
        ? {
            axis: p.motion.axis,
            amp: p.motion.amp,
            period: p.motion.period,
            phase: p.motion.phase ?? 0,
          }
        : null,
      kind: p.kind ?? "grass",
    })),
    coins: def.coins.map((c) => ({ pos: v3(c), taken: false })),
    hazards: def.hazards.map((h) => ({ pos: v3(h.pos), size: v3(h.size) })),
    checkpoints: def.checkpoints.map((c) => ({ pos: v3(c), active: false })),
    flag: v3(def.flag),
    flagTaken: false,
    spawn: v3(def.spawn),
    spawnYaw: def.spawnYaw,
    killY: def.killY,
    coinsTaken: 0,
  };
}

export function createPlayer(world: World): Player {
  return {
    x: world.spawn.x,
    y: world.spawn.y,
    z: world.spawn.z,
    px: world.spawn.x,
    py: world.spawn.y,
    pz: world.spawn.z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: world.spawnYaw,
    grounded: false,
    jumpsLeft: 2,
    coyote: 0,
    jumpBuffer: 0,
    jumpCut: false,
    onPlat: -1,
    dead: false,
    deathKind: null,
    invuln: 0,
    squash: 1,
    runPhase: 0,
  };
}

export function respawnPlayer(player: Player, world: World) {
  player.x = world.spawn.x;
  player.y = world.spawn.y;
  player.z = world.spawn.z;
  player.px = player.x;
  player.py = player.y;
  player.pz = player.z;
  player.vx = 0;
  player.vy = 0;
  player.vz = 0;
  player.yaw = world.spawnYaw;
  player.grounded = false;
  player.jumpsLeft = 2;
  player.coyote = 0;
  player.jumpBuffer = 0;
  player.jumpCut = false;
  player.onPlat = -1;
  player.dead = false;
  player.deathKind = null;
  player.invuln = 0.85;
  player.squash = 1;
}

type AABB = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

function overlap(a: AABB, b: AABB) {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  );
}

function playerBox(p: Player): AABB {
  return {
    minX: p.x - HW,
    maxX: p.x + HW,
    minY: p.y,
    maxY: p.y + HEIGHT,
    minZ: p.z - HD,
    maxZ: p.z + HD,
  };
}

export function platBox(p: PlatformRt): AABB {
  const x = p.rest.x + p.off.x;
  const y = p.rest.y + p.off.y;
  const z = p.rest.z + p.off.z;
  return {
    minX: x - p.size.x * 0.5,
    maxX: x + p.size.x * 0.5,
    minY: y - p.size.y * 0.5,
    maxY: y + p.size.y * 0.5,
    minZ: z - p.size.z * 0.5,
    maxZ: z + p.size.z * 0.5,
  };
}

function approach(cur: number, target: number, maxDelta: number) {
  if (cur < target) return Math.min(cur + maxDelta, target);
  return Math.max(cur - maxDelta, target);
}

export function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}

function updatePlatforms(world: World, dt: number) {
  world.time += dt;
  for (const p of world.platforms) {
    p.prevOff.x = p.off.x;
    p.prevOff.y = p.off.y;
    p.prevOff.z = p.off.z;
    if (!p.motion) continue;
    const w = (Math.PI * 2) / p.motion.period;
    const s = Math.sin(w * world.time + p.motion.phase) * p.motion.amp;
    p.off.x = 0;
    p.off.y = 0;
    p.off.z = 0;
    p.off[p.motion.axis] = s;
  }
}

function resolveXZ(player: Player, world: World, axis: "x" | "z") {
  const pb = playerBox(player);
  for (const plat of world.platforms) {
    const b = platBox(plat);
    if (!overlap(pb, b)) continue;
    if (axis === "x") {
      const cx = (b.minX + b.maxX) * 0.5;
      if (player.x < cx) player.x = b.minX - HW;
      else player.x = b.maxX + HW;
      player.vx = 0;
      pb.minX = player.x - HW;
      pb.maxX = player.x + HW;
    } else {
      const cz = (b.minZ + b.maxZ) * 0.5;
      if (player.z < cz) player.z = b.minZ - HD;
      else player.z = b.maxZ + HD;
      player.vz = 0;
      pb.minZ = player.z - HD;
      pb.maxZ = player.z + HD;
    }
  }
}

function resolveY(player: Player, world: World, events: SimEvent[], wasGrounded: boolean) {
  const pb = playerBox(player);
  for (let i = 0; i < world.platforms.length; i++) {
    const plat = world.platforms[i];
    const b = platBox(plat);
    if (!overlap(pb, b)) continue;
    if (player.vy > 0.04) {
      player.y = b.minY - HEIGHT;
      player.vy = 0;
      pb.minY = player.y;
      pb.maxY = player.y + HEIGHT;
    } else {
      player.y = b.maxY + 0.002;
      if (!wasGrounded && player.vy < -6) events.push({ type: "land", hard: player.vy < -14 });
      else if (!wasGrounded) events.push({ type: "land", hard: false });
      player.vy = 0;
      player.grounded = true;
      player.onPlat = i;
      pb.minY = player.y;
      pb.maxY = player.y + HEIGHT;
    }
  }
}

function boxAt(pos: V3, size: V3): AABB {
  return {
    minX: pos.x - size.x * 0.5,
    maxX: pos.x + size.x * 0.5,
    minY: pos.y - size.y * 0.5,
    maxY: pos.y + size.y * 0.5,
    minZ: pos.z - size.z * 0.5,
    maxZ: pos.z + size.z * 0.5,
  };
}

export type FrameInput = {
  moveX: number;
  moveZ: number;
  jumpHeld: boolean;
  jumpPressed: boolean;
};

export function stepSim(
  world: World,
  player: Player,
  input: FrameInput,
  dt: number,
  camYaw: number,
): SimEvent[] {
  const events: SimEvent[] = [];
  player.px = player.x;
  player.py = player.y;
  player.pz = player.z;

  updatePlatforms(world, dt);

  if (player.dead) {
    player.vy -= GRAVITY_DOWN * dt;
    player.y += player.vy * dt;
    player.yaw += dt * 3.2;
    player.squash = Math.max(0.4, player.squash - dt * 1.4);
    return events;
  }

  if (player.invuln > 0) player.invuln -= dt;

  if (player.onPlat >= 0) {
    const plat = world.platforms[player.onPlat];
    if (plat) {
      player.x += plat.off.x - plat.prevOff.x;
      player.y += plat.off.y - plat.prevOff.y;
      player.z += plat.off.z - plat.prevOff.z;
    }
  }

  const s = Math.sin(camYaw);
  const c = Math.cos(camYaw);
  const fwdX = -s;
  const fwdZ = -c;
  const rightX = c;
  const rightZ = -s;
  let wishX = rightX * input.moveX + fwdX * input.moveZ;
  let wishZ = rightZ * input.moveX + fwdZ * input.moveZ;
  const wishLen = Math.hypot(wishX, wishZ);
  if (wishLen > 1) {
    wishX /= wishLen;
    wishZ /= wishLen;
  }

  const speed = player.grounded ? MOVE_SPEED : AIR_SPEED;
  const accel = player.grounded ? ACCEL : AIR_ACCEL;
  player.vx = approach(player.vx, wishX * speed, accel * dt);
  player.vz = approach(player.vz, wishZ * speed, accel * dt);

  const spd = Math.hypot(player.vx, player.vz);
  if (wishLen > 0.12) {
    const targetYaw = Math.atan2(-wishX, -wishZ);
    player.yaw = lerpAngle(player.yaw, targetYaw, 1 - Math.exp(-16 * dt));
  }
  if (player.grounded && spd > 0.6) player.runPhase += dt * spd * 2.4;
  player.squash += ((1 - player.squash) * (1 - Math.exp(-10 * dt)));

  if (player.grounded) {
    player.coyote = COYOTE;
    player.jumpsLeft = 2;
  } else {
    player.coyote -= dt;
  }
  if (input.jumpPressed) player.jumpBuffer = JUMP_BUFFER;
  player.jumpBuffer -= dt;

  if (player.jumpBuffer > 0) {
    if (player.grounded || player.coyote > 0) {
      player.vy = JUMP_VEL;
      player.grounded = false;
      player.coyote = 0;
      player.jumpsLeft = 1;
      player.jumpBuffer = 0;
      player.jumpCut = false;
      player.onPlat = -1;
      player.squash = 1.28;
      events.push({ type: "jump" });
    } else if (player.jumpsLeft > 0) {
      player.vy = DOUBLE_JUMP_VEL;
      player.jumpsLeft = 0;
      player.jumpBuffer = 0;
      player.jumpCut = false;
      player.squash = 1.22;
      events.push({ type: "doubleJump" });
    }
  }

  if (!input.jumpHeld && player.vy > 2 && !player.jumpCut) {
    player.vy *= 0.5;
    player.jumpCut = true;
  }

  const g =
    player.vy > 0.9 ? GRAVITY_UP : Math.abs(player.vy) < 1.35 ? GRAVITY_UP * 0.52 : GRAVITY_DOWN;
  player.vy -= g * dt;
  if (player.vy < -TERM) player.vy = -TERM;

  player.x += player.vx * dt;
  resolveXZ(player, world, "x");
  player.z += player.vz * dt;
  resolveXZ(player, world, "z");

  const wasGrounded = player.grounded;
  player.grounded = false;
  player.onPlat = -1;
  player.y += player.vy * dt;
  resolveY(player, world, events, wasGrounded);

  if (events.some((e) => e.type === "land")) {
    const land = events.find((e) => e.type === "land");
    if (land && land.type === "land") player.squash = land.hard ? 0.62 : 0.78;
  }

  const pb = playerBox(player);

  for (const coin of world.coins) {
    if (coin.taken) continue;
    const r = 0.55;
    const dx = player.x - coin.pos.x;
    const dy = player.y + HEIGHT * 0.5 - coin.pos.y;
    const dz = player.z - coin.pos.z;
    if (dx * dx + dy * dy + dz * dz < r * r) {
      coin.taken = true;
      world.coinsTaken += 1;
      events.push({ type: "coin" });
    }
  }

  if (player.invuln <= 0) {
    for (const h of world.hazards) {
      if (overlap(pb, boxAt(h.pos, h.size))) {
        player.dead = true;
        player.deathKind = "hazard";
        player.vy = 6;
        events.push({ type: "hazard" });
        break;
      }
    }
  }

  if (!player.dead && player.y < world.killY) {
    player.dead = true;
    player.deathKind = "fall";
    events.push({ type: "fall" });
  }

  for (const cp of world.checkpoints) {
    if (cp.active) continue;
    const dx = player.x - cp.pos.x;
    const dy = player.y + 0.6 - cp.pos.y;
    const dz = player.z - cp.pos.z;
    if (dx * dx + dy * dy + dz * dz < 1.6 * 1.6) {
      cp.active = true;
      world.spawn.x = cp.pos.x;
      world.spawn.y = cp.pos.y + 0.15;
      world.spawn.z = cp.pos.z;
      world.spawnYaw = player.yaw;
      events.push({ type: "checkpoint" });
    }
  }

  if (!world.flagTaken) {
    const dx = player.x - world.flag.x;
    const dy = player.y + 0.5 - world.flag.y;
    const dz = player.z - world.flag.z;
    if (dx * dx + dy * dy + dz * dz < 1.5 * 1.5) {
      world.flagTaken = true;
      events.push({ type: "win" });
    }
  }

  return events;
}

export function horizSpeed(player: Player) {
  return Math.hypot(player.vx, player.vz);
}
