import * as THREE from "three";
import type { World } from "./sim";
import { HEIGHT, platBox, type Player } from "./sim";

const BOX = new THREE.BoxGeometry(1, 1, 1);
const SPHERE = new THREE.SphereGeometry(1, 14, 10);
const CONE = new THREE.ConeGeometry(0.28, 0.7, 7);
const OCTA = new THREE.OctahedronGeometry(0.32, 0);
const CYL = new THREE.CylinderGeometry(0.07, 0.09, 3.2, 8);

export type Materials = {
  grass: THREE.MeshStandardMaterial;
  dirt: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  coin: THREE.MeshStandardMaterial;
  spike: THREE.MeshStandardMaterial;
  flag: THREE.MeshStandardMaterial;
  pole: THREE.MeshStandardMaterial;
  crystal: THREE.MeshStandardMaterial;
  crystalOn: THREE.MeshStandardMaterial;
  cloud: THREE.MeshStandardMaterial;
  heroSkin: THREE.MeshStandardMaterial;
  heroCloth: THREE.MeshStandardMaterial;
  heroScarf: THREE.MeshStandardMaterial;
  heroDark: THREE.MeshStandardMaterial;
  heroPack: THREE.MeshStandardMaterial;
};

export function createMaterials(): Materials {
  return {
    grass: new THREE.MeshStandardMaterial({ color: 0x3f6d5c, roughness: 0.78 }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x7a6550, roughness: 0.9 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x6d7886, roughness: 0.82 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b5344, roughness: 0.72 }),
    sand: new THREE.MeshStandardMaterial({ color: 0xb89a78, roughness: 0.86 }),
    coin: new THREE.MeshStandardMaterial({
      color: 0x8fd4e0,
      emissive: 0x1a5a66,
      emissiveIntensity: 0.65,
      roughness: 0.28,
      metalness: 0.35,
    }),
    spike: new THREE.MeshStandardMaterial({ color: 0x6a3030, roughness: 0.45, metalness: 0.2 }),
    flag: new THREE.MeshStandardMaterial({ color: 0xd6e6ec, roughness: 0.55 }),
    pole: new THREE.MeshStandardMaterial({ color: 0x3a414c, roughness: 0.5, metalness: 0.3 }),
    crystal: new THREE.MeshStandardMaterial({
      color: 0x5a6a78,
      emissive: 0x1a2430,
      roughness: 0.35,
    }),
    crystalOn: new THREE.MeshStandardMaterial({
      color: 0x9ee0c0,
      emissive: 0x2a6a50,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    }),
    cloud: new THREE.MeshStandardMaterial({
      color: 0xd8e4ee,
      roughness: 1,
      transparent: true,
      opacity: 0.72,
    }),
    heroSkin: new THREE.MeshStandardMaterial({ color: 0xc47a5a, roughness: 0.55 }),
    heroCloth: new THREE.MeshStandardMaterial({ color: 0x3d5a62, roughness: 0.7 }),
    heroScarf: new THREE.MeshStandardMaterial({ color: 0xd6e6ec, roughness: 0.45 }),
    heroDark: new THREE.MeshStandardMaterial({ color: 0x2a2422, roughness: 0.6 }),
    heroPack: new THREE.MeshStandardMaterial({ color: 0x6a5344, roughness: 0.7 }),
  };
}

export function createHero(mats: Materials): THREE.Group {
  const g = new THREE.Group();
  g.name = "hero";

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.4, 4, 10), mats.heroCloth);
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), mats.heroSkin);
  head.position.y = 1.04;
  head.castShadow = true;
  g.add(head);

  const eyeG = new THREE.SphereGeometry(0.05, 8, 8);
  const eyeL = new THREE.Mesh(eyeG, mats.heroDark);
  eyeL.position.set(-0.09, 1.07, -0.2);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.09;
  g.add(eyeL, eyeR);

  const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.52), mats.heroScarf);
  scarf.name = "scarf";
  scarf.position.set(0.14, 0.8, 0.14);
  scarf.rotation.y = 0.35;
  g.add(scarf);

  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.15), mats.heroPack);
  pack.position.set(0, 0.6, 0.28);
  pack.castShadow = true;
  g.add(pack);

  const bootG = new THREE.SphereGeometry(0.1, 8, 8);
  const bootL = new THREE.Mesh(bootG, mats.heroDark);
  bootL.position.set(-0.12, 0.1, -0.05);
  const bootR = bootL.clone();
  bootR.position.x = 0.12;
  g.add(bootL, bootR);

  const armG = new THREE.CapsuleGeometry(0.07, 0.22, 3, 6);
  const armL = new THREE.Mesh(armG, mats.heroSkin);
  armL.name = "armL";
  armL.position.set(-0.34, 0.58, 0);
  const armR = armL.clone();
  armR.name = "armR";
  armR.position.x = 0.34;
  g.add(armL, armR);

  return g;
}

export function createSky(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x163044) },
      mid: { value: new THREE.Color(0x4a7a90) },
      bot: { value: new THREE.Color(0xc9bba6) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vPos;
      uniform vec3 top;
      uniform vec3 mid;
      uniform vec3 bot;
      void main() {
        float h = normalize(vPos).y;
        vec3 col = mix(bot, mid, smoothstep(-0.35, 0.12, h));
        col = mix(col, top, smoothstep(0.12, 0.82, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(180, 24, 16), mat);
}

export function createSea(): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      a: { value: new THREE.Color(0x1c3344) },
      b: { value: new THREE.Color(0x4d7a88) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 a;
      uniform vec3 b;
      void main() {
        float w = sin(vUv.x * 48.0 + uTime * 0.35) * 0.5
                + sin(vUv.y * 36.0 - uTime * 0.22) * 0.5;
        vec3 col = mix(a, b, 0.45 + 0.25 * w);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -7.2;
  mesh.receiveShadow = true;
  return mesh;
}

function addClouds(parent: THREE.Group, mats: Materials) {
  const geo = new THREE.SphereGeometry(1, 10, 8);
  for (let i = 0; i < 18; i++) {
    const c = new THREE.Mesh(geo, mats.cloud);
    const s = 3.5 + Math.random() * 6;
    c.scale.set(s * 1.6, s * 0.55, s);
    c.position.set((Math.random() - 0.5) * 90, 4 + Math.random() * 16, -20 - Math.random() * 110);
    c.userData.drift = 0.15 + Math.random() * 0.25;
    parent.add(c);
  }
}

export type LevelVisuals = {
  root: THREE.Group;
  platforms: THREE.Object3D[];
  coins: THREE.Object3D[];
  checkpoints: THREE.Object3D[];
  flagCloth: THREE.Object3D | null;
  hazards: THREE.Object3D[];
};

export function buildLevelVisuals(world: World, mats: Materials): LevelVisuals {
  const root = new THREE.Group();
  const platforms: THREE.Object3D[] = [];
  const coins: THREE.Object3D[] = [];
  const checkpoints: THREE.Object3D[] = [];
  const hazards: THREE.Object3D[] = [];
  let flagCloth: THREE.Object3D | null = null;

  for (const plat of world.platforms) {
    const g = new THREE.Group();
    const bodyH = Math.max(0.12, plat.size.y - 0.1);
    const body = new THREE.Mesh(
      BOX,
      plat.kind === "wood" ? mats.wood : plat.kind === "stone" ? mats.stone : plat.kind === "sand" ? mats.sand : mats.dirt,
    );
    body.scale.set(plat.size.x, bodyH, plat.size.z);
    body.position.y = -plat.size.y * 0.5 + bodyH * 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    if (plat.kind === "grass" || plat.kind === "sand") {
      const top = new THREE.Mesh(BOX, plat.kind === "sand" ? mats.sand : mats.grass);
      top.scale.set(plat.size.x + 0.08, 0.1, plat.size.z + 0.08);
      top.position.y = plat.size.y * 0.5 - 0.02;
      top.receiveShadow = true;
      top.castShadow = true;
      g.add(top);
    }

    g.position.set(plat.rest.x, plat.rest.y, plat.rest.z);
    root.add(g);
    platforms.push(g);
  }

  for (const coin of world.coins) {
    const m = new THREE.Mesh(OCTA, mats.coin);
    m.position.set(coin.pos.x, coin.pos.y, coin.pos.z);
    m.castShadow = true;
    root.add(m);
    coins.push(m);
  }

  for (const h of world.hazards) {
    const group = new THREE.Group();
    const nx = Math.max(1, Math.round(h.size.x / 0.55));
    const nz = Math.max(1, Math.round(h.size.z / 0.55));
    for (let ix = 0; ix < nx; ix++) {
      for (let iz = 0; iz < nz; iz++) {
        const spike = new THREE.Mesh(CONE, mats.spike);
        const ox = (ix - (nx - 1) / 2) * 0.5;
        const oz = (iz - (nz - 1) / 2) * 0.5;
        spike.position.set(ox, 0.15, oz);
        spike.castShadow = true;
        group.add(spike);
      }
    }
    group.position.set(h.pos.x, h.pos.y - h.size.y * 0.25, h.pos.z);
    root.add(group);
    hazards.push(group);
  }

  for (const cp of world.checkpoints) {
    const g = new THREE.Group();
    const a = new THREE.Mesh(OCTA, mats.crystal);
    a.scale.setScalar(1.15);
    const b = new THREE.Mesh(OCTA, mats.crystal);
    b.scale.setScalar(0.7);
    b.position.y = 0.7;
    b.rotation.y = Math.PI / 4;
    g.add(a, b);
    g.position.set(cp.pos.x, cp.pos.y, cp.pos.z);
    root.add(g);
    checkpoints.push(g);
  }

  {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(CYL, mats.pole);
    pole.position.y = 1.5;
    pole.castShadow = true;
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.7, 0.06), mats.flag);
    cloth.position.set(0.62, 2.55, 0);
    cloth.castShadow = true;
    g.add(pole, cloth);
    g.position.set(world.flag.x, world.flag.y, world.flag.z);
    root.add(g);
    flagCloth = cloth;
  }

  addClouds(root, mats);

  return { root, platforms, coins, checkpoints, flagCloth, hazards };
}

export function syncLevelVisuals(
  vis: LevelVisuals,
  world: World,
  mats: Materials,
  t: number,
) {
  for (let i = 0; i < vis.platforms.length; i++) {
    const plat = world.platforms[i];
    const mesh = vis.platforms[i];
    mesh.position.set(plat.rest.x + plat.off.x, plat.rest.y + plat.off.y, plat.rest.z + plat.off.z);
  }
  for (let i = 0; i < vis.coins.length; i++) {
    const coin = world.coins[i];
    const mesh = vis.coins[i];
    mesh.visible = !coin.taken;
    if (!coin.taken) {
      mesh.rotation.y = t * 2.2;
      mesh.position.y = coin.pos.y + Math.sin(t * 3 + i) * 0.12;
    }
  }
  for (let i = 0; i < vis.checkpoints.length; i++) {
    const cp = world.checkpoints[i];
    const mesh = vis.checkpoints[i];
    mesh.rotation.y = t * 0.8;
    const s = 1 + Math.sin(t * 3.2) * 0.06;
    mesh.scale.setScalar(s);
    mesh.traverse((ch) => {
      if (ch instanceof THREE.Mesh) {
        ch.material = cp.active ? mats.crystalOn : mats.crystal;
      }
    });
  }
  if (vis.flagCloth) {
    vis.flagCloth.rotation.y = Math.sin(t * 3.4) * 0.22;
  }
}

export function syncHero(
  hero: THREE.Group,
  player: Player,
  alpha: number,
  reduced: boolean,
) {
  const x = player.px + (player.x - player.px) * alpha;
  const y = player.py + (player.y - player.py) * alpha;
  const z = player.pz + (player.z - player.pz) * alpha;
  hero.position.set(x, y, z);
  hero.rotation.y = player.yaw;
  const sq = reduced ? 1 : player.squash;
  hero.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  hero.visible = player.invuln <= 0 || Math.floor(player.invuln * 16) % 2 === 0;

  const armL = hero.getObjectByName("armL");
  const armR = hero.getObjectByName("armR");
  const scarf = hero.getObjectByName("scarf");
  const swing = player.grounded ? Math.sin(player.runPhase) * 0.55 : 0.25;
  if (armL) armL.rotation.x = swing;
  if (armR) armR.rotation.x = -swing;
  if (scarf) scarf.rotation.z = Math.sin(player.runPhase * 0.5) * 0.15;
}

export function groundYUnder(world: World, x: number, y: number, z: number): number | null {
  let best: number | null = null;
  for (const plat of world.platforms) {
    const b = platBox(plat);
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && b.maxY <= y + 0.05) {
      if (best === null || b.maxY > best) best = b.maxY;
    }
  }
  return best;
}

export type Particle = {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
};

export function createParticlePool(n: number): Particle[] {
  const geo = new THREE.SphereGeometry(0.07, 6, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0x8fd4e0, transparent: true, opacity: 1 });
  const pool: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const mesh = new THREE.Mesh(geo, mat.clone());
    mesh.visible = false;
    pool.push({ mesh, vx: 0, vy: 0, vz: 0, life: 0, max: 0.4 });
  }
  return pool;
}

export function burst(
  pool: Particle[],
  x: number,
  y: number,
  z: number,
  color: number,
  count: number,
  speed: number,
) {
  let spawned = 0;
  for (const p of pool) {
    if (p.life > 0) continue;
    p.life = p.max = 0.35 + Math.random() * 0.2;
    p.mesh.visible = true;
    p.mesh.position.set(x, y, z);
    const mat = p.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(color);
    mat.opacity = 1;
    const th = Math.random() * Math.PI * 2;
    const sp = speed * (0.4 + Math.random());
    p.vx = Math.cos(th) * sp;
    p.vz = Math.sin(th) * sp;
    p.vy = speed * (0.4 + Math.random() * 0.8);
    spawned++;
    if (spawned >= count) break;
  }
}

export function stepParticles(pool: Particle[], dt: number) {
  for (const p of pool) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.mesh.visible = false;
      continue;
    }
    p.vy -= 12 * dt;
    p.mesh.position.x += p.vx * dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.position.z += p.vz * dt;
    const mat = p.mesh.material as THREE.MeshBasicMaterial;
    mat.opacity = p.life / p.max;
    p.mesh.scale.setScalar(0.6 + p.life / p.max);
  }
}

export function disposeObject(obj: THREE.Object3D) {
  obj.traverse((ch) => {
    if (ch instanceof THREE.Mesh) {
      if (ch.geometry && ch.geometry !== BOX && ch.geometry !== SPHERE && ch.geometry !== CONE && ch.geometry !== OCTA && ch.geometry !== CYL) {
        /* shared geos kept */
      }
      const mat = ch.material;
      if (Array.isArray(mat)) mat.forEach((m) => {
        /* shared */
      });
    }
  });
}

export { HEIGHT };
