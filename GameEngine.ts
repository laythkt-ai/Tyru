import * as THREE from "three";
import { audio } from "./audio";
import { input } from "./input";
import { LEVELS } from "./levels";
import {
  createPlayer,
  createWorld,
  horizSpeed,
  lerpAngle,
  respawnPlayer,
  stepSim,
  type Player,
  type World,
} from "./sim";
import { useGameStore } from "./store";
import {
  buildLevelVisuals,
  burst,
  createHero,
  createMaterials,
  createParticlePool,
  createSea,
  createSky,
  groundYUnder,
  stepParticles,
  syncHero,
  syncLevelVisuals,
  type LevelVisuals,
  type Materials,
  type Particle,
} from "./visuals";

const FIXED = 1 / 60;
const MAX_ACC = 0.25;

export class GameEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private hero: THREE.Group;
  private mats: Materials;
  private world: World;
  private player: Player;
  private vis: LevelVisuals | null = null;
  private particles: Particle[];
  private blob: THREE.Mesh;
  private sea: THREE.Mesh;
  private acc = 0;
  private last = 0;
  private camYaw = 0;
  private camOffset = 0;
  private trauma = 0;
  private deathTimer = 0;
  private disposed = false;
  private reduced = false;
  private unsub: () => void;
  private runId = -1;
  private pauseEdge = false;
  private tmpLook = new THREE.Vector3();
  private tmpCam = new THREE.Vector3();

  constructor(private canvas: HTMLCanvasElement) {
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x4a7a90, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x8aa8b4, 38, 130);

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 220);
    this.camera.position.set(0, 6, 12);

    this.mats = createMaterials();
    this.scene.add(createSky());
    this.sea = createSea();
    this.scene.add(this.sea);

    const hemi = new THREE.HemisphereLight(0x9ec8dc, 0x3d4a38, 0.85);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.35);
    sun.position.set(-18, 34, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0x6a7a88, 0.22));

    this.hero = createHero(this.mats);
    this.scene.add(this.hero);

    const blobMat = new THREE.MeshBasicMaterial({
      color: 0x0a1018,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), blobMat);
    this.blob.rotation.x = -Math.PI / 2;
    this.scene.add(this.blob);

    this.particles = createParticlePool(48);
    for (const p of this.particles) this.scene.add(p.mesh);

    this.world = createWorld(LEVELS[0]);
    this.player = createPlayer(this.world);
    this.mountLevel(0, false);

    input.attach();
    this.resize();
    window.addEventListener("resize", this.resize);

    this.unsub = useGameStore.subscribe((s) => {
      if (s.runId !== this.runId && s.phase === "playing") {
        this.runId = s.runId;
        this.mountLevel(s.levelIndex, true);
      }
      audio.setMuted(s.muted);
    });

    this.wireProbe();
    useGameStore.getState().setReady(true);
  }

  private mountLevel(index: number, play: boolean) {
    const def = LEVELS[index] ?? LEVELS[0];
    if (this.vis) {
      this.scene.remove(this.vis.root);
      this.vis = null;
    }
    this.world = createWorld(def);
    this.player = createPlayer(this.world);
    this.vis = buildLevelVisuals(this.world, this.mats);
    this.scene.add(this.vis.root);
    this.camYaw = this.player.yaw;
    this.camOffset = 0;
    this.trauma = 0;
    this.deathTimer = 0;
    this.acc = 0;
    useGameStore.getState().setHud({
      coins: 0,
      totalCoins: def.coins.length,
      lives: play ? 3 : useGameStore.getState().lives,
    });
    if (play) {
      this.snapCamera();
    }
  }

  private snapCamera() {
    const dist = 9.2;
    const height = 4.4;
    const yaw = this.camYaw;
    this.camera.position.set(
      this.player.x + Math.sin(yaw) * dist,
      this.player.y + height,
      this.player.z + Math.cos(yaw) * dist,
    );
    this.camera.lookAt(this.player.x, this.player.y + 1.15, this.player.z);
  }

  private wireProbe() {
    window.__controlsTest = {
      getYaw: () => this.player.yaw,
      getSpeed: () => horizSpeed(this.player),
      setKeys: (codes) => input.setKeys(codes),
    };
  }

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
  };

  start() {
    this.last = performance.now();
    this.renderer.setAnimationLoop(this.loop);
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    const raw = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    const phase = useGameStore.getState().phase;

    const sampled = input.sample();
    const pauseNow = input.pausePressed();
    if (pauseNow && !this.pauseEdge) {
      if (phase === "playing") useGameStore.getState().pause();
      else if (phase === "paused") useGameStore.getState().resume();
    }
    this.pauseEdge = pauseNow;

    const playing = phase === "playing";
    const dt = playing ? raw : raw * (phase === "menu" || phase === "levels" ? 0.35 : 0);

    if (playing) {
      this.acc += dt;
      if (this.acc > MAX_ACC) this.acc = MAX_ACC;
      const frameInput = {
        moveX: sampled.moveX,
        moveZ: sampled.moveZ,
        jumpHeld: sampled.jumpHeld,
        jumpPressed: input.jumpPressed,
      };
      let first = true;
      while (this.acc >= FIXED) {
        const ev = stepSim(
          this.world,
          this.player,
          first ? frameInput : { ...frameInput, jumpPressed: false },
          FIXED,
          this.camYaw,
        );
        this.handleEvents(ev);
        first = false;
        this.acc -= FIXED;
        if (this.player.dead) break;
      }
      if (this.player.dead) {
        this.deathTimer += dt;
        if (this.deathTimer > 0.72) {
          this.deathTimer = 0;
          const lives = useGameStore.getState().lives - 1;
          if (lives <= 0) {
            useGameStore.getState().setHud({ lives: 0 });
            useGameStore.getState().gameOver();
          } else {
            useGameStore.getState().setHud({ lives });
            respawnPlayer(this.player, this.world);
          }
        }
      }
    } else if (phase === "menu" || phase === "levels") {
      this.acc += raw;
      while (this.acc >= FIXED) {
        stepSim(
          this.world,
          this.player,
          { moveX: 0, moveZ: 0, jumpHeld: false, jumpPressed: false },
          FIXED,
          this.camYaw,
        );
        this.acc -= FIXED;
      }
    }

    const alpha = playing ? this.acc / FIXED : 1;
    this.updateCamera(raw, phase, sampled.moveX, alpha);
    this.updateVisuals(now / 1000, alpha, raw);
    this.renderer.render(this.scene, this.camera);
  };

  private handleEvents(events: ReturnType<typeof stepSim>) {
    const store = useGameStore.getState();
    for (const e of events) {
      if (e.type === "jump") {
        audio.jump();
        this.trauma = Math.min(1, this.trauma + 0.08);
      } else if (e.type === "doubleJump") {
        audio.doubleJump();
        burst(this.particles, this.player.x, this.player.y + 0.4, this.player.z, 0xd6e6ec, 8, 3.2);
      } else if (e.type === "land") {
        audio.land(e.hard);
        burst(this.particles, this.player.x, this.player.y + 0.05, this.player.z, 0x7a6550, e.hard ? 10 : 5, 2.2);
        if (e.hard) this.trauma = Math.min(1, this.trauma + 0.18);
      } else if (e.type === "coin") {
        audio.coin();
        burst(this.particles, this.player.x, this.player.y + 1, this.player.z, 0x8fd4e0, 10, 3.8);
        store.setHud({ coins: this.world.coinsTaken });
      } else if (e.type === "checkpoint") {
        audio.checkpoint();
        burst(this.particles, this.player.x, this.player.y + 1.2, this.player.z, 0x9ee0c0, 12, 3);
      } else if (e.type === "hazard" || e.type === "fall") {
        audio.death();
        this.trauma = 0.85;
        burst(this.particles, this.player.x, this.player.y + 0.6, this.player.z, 0xc45c5c, 14, 4);
      } else if (e.type === "win") {
        audio.win();
        burst(this.particles, this.player.x, this.player.y + 1.4, this.player.z, 0xd6e6ec, 18, 4.5);
        store.win(this.world.coinsTaken);
      }
    }
  }

  private updateCamera(dt: number, phase: string, _moveX: number, alpha: number) {
    const x = this.player.px + (this.player.x - this.player.px) * alpha;
    const y = this.player.py + (this.player.y - this.player.py) * alpha;
    const z = this.player.pz + (this.player.z - this.player.pz) * alpha;

    if (phase === "menu" || phase === "levels") {
      const t = performance.now() / 1000;
      const dist = 14;
      this.camera.position.set(Math.sin(t * 0.18) * dist, 7.5, Math.cos(t * 0.18) * dist + 2);
      this.camera.lookAt(0, 1.2, -6);
      return;
    }

    this.camOffset += input.camOrbit * 1.8 * dt;
    const targetYaw = this.camOffset;
    this.camYaw = lerpAngle(this.camYaw, targetYaw, 1 - Math.exp(-6 * dt));

    const dist = 9.2;
    const height = 4.35;
    this.tmpCam.set(
      x + Math.sin(this.camYaw) * dist,
      y + height + Math.max(0, this.player.vy) * 0.04,
      z + Math.cos(this.camYaw) * dist,
    );
    const k = 1 - Math.exp(-4.8 * dt);
    this.camera.position.lerp(this.tmpCam, k);

    this.tmpLook.set(x, y + 1.2, z);
    this.tmpLook.x += this.player.vx * 0.12;
    this.tmpLook.z += this.player.vz * 0.12;
    this.camera.lookAt(this.tmpLook);

    if (!this.reduced) {
      this.trauma = Math.max(0, this.trauma - dt * 1.7);
      const shake = this.trauma * this.trauma;
      if (shake > 0.002) {
        this.camera.position.x += (Math.random() - 0.5) * shake * 0.4;
        this.camera.position.y += (Math.random() - 0.5) * shake * 0.28;
      }
    }
  }

  private updateVisuals(t: number, alpha: number, dt: number) {
    if (this.vis) syncLevelVisuals(this.vis, this.world, this.mats, t);
    syncHero(this.hero, this.player, alpha, this.reduced);
    const x = this.hero.position.x;
    const y = this.hero.position.y;
    const z = this.hero.position.z;
    const gy = groundYUnder(this.world, x, y + 0.2, z);
    if (gy !== null) {
      this.blob.visible = true;
      this.blob.position.set(x, gy + 0.03, z);
      const dist = Math.max(0.15, y - gy);
      const s = Math.max(0.25, 1.1 - dist * 0.18);
      this.blob.scale.set(s, s, 1);
      (this.blob.material as THREE.MeshBasicMaterial).opacity = Math.max(0.06, 0.3 - dist * 0.04);
    } else {
      this.blob.visible = false;
    }
    stepParticles(this.particles, dt);
    const seaMat = this.sea.material as THREE.ShaderMaterial;
    seaMat.uniforms.uTime.value = t;
    if (this.vis) {
      this.vis.root.traverse((ch) => {
        if (ch.userData.drift) {
          ch.position.x += Math.sin(t * ch.userData.drift) * 0.004;
        }
      });
    }
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", this.resize);
    input.detach();
    this.unsub();
    this.renderer.dispose();
    if (window.__controlsTest) delete window.__controlsTest;
  }
}
