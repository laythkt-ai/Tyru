import { create } from "zustand";
import type { Phase } from "./types";
import { LEVELS } from "./levels";

const SAVE_KEY = "ufuq-save-v1";

type Save = {
  v: 1;
  unlocked: number;
  best: number[];
};

function loadSave(): Save {
  const empty: Save = { v: 1, unlocked: 0, best: LEVELS.map(() => 0) };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Save;
    if (parsed.v !== 1) return empty;
    return {
      v: 1,
      unlocked: Math.max(0, Math.min(LEVELS.length - 1, parsed.unlocked ?? 0)),
      best: LEVELS.map((_, i) => parsed.best?.[i] ?? 0),
    };
  } catch {
    return empty;
  }
}

function persist(unlocked: number, best: number[]) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, unlocked, best } satisfies Save));
  } catch {
    /* ignore quota */
  }
}

export type GameStore = {
  phase: Phase;
  levelIndex: number;
  coins: number;
  totalCoins: number;
  lives: number;
  runId: number;
  unlocked: number;
  best: number[];
  muted: boolean;
  ready: boolean;
  setReady: (v: boolean) => void;
  setPhase: (phase: Phase) => void;
  setHud: (patch: Partial<Pick<GameStore, "coins" | "totalCoins" | "lives">>) => void;
  startLevel: (index: number) => void;
  retry: () => void;
  openLevels: () => void;
  openMenu: () => void;
  pause: () => void;
  resume: () => void;
  win: (coins: number) => void;
  gameOver: () => void;
  toggleMute: () => void;
  hydrate: () => void;
};

const initial = { unlocked: 0, best: LEVELS.map(() => 0) };

export const useGameStore = create<GameStore>((set, get) => ({
  phase: "menu",
  levelIndex: 0,
  coins: 0,
  totalCoins: LEVELS[0]?.coins.length ?? 0,
  lives: 3,
  runId: 0,
  unlocked: initial.unlocked,
  best: initial.best,
  muted: false,
  ready: false,
  setReady: (v) => set({ ready: v }),
  setPhase: (phase) => set({ phase }),
  setHud: (patch) => set(patch),
  startLevel: (index) => {
    const i = Math.max(0, Math.min(LEVELS.length - 1, index));
    if (i > get().unlocked) return;
    set({
      phase: "playing",
      levelIndex: i,
      coins: 0,
      totalCoins: LEVELS[i].coins.length,
      lives: 3,
      runId: get().runId + 1,
    });
  },
  retry: () => {
    const { levelIndex } = get();
    set({
      phase: "playing",
      coins: 0,
      totalCoins: LEVELS[levelIndex].coins.length,
      lives: 3,
      runId: get().runId + 1,
    });
  },
  openLevels: () => set({ phase: "levels" }),
  openMenu: () => set({ phase: "menu" }),
  pause: () => {
    if (get().phase === "playing") set({ phase: "paused" });
  },
  resume: () => {
    if (get().phase === "paused") set({ phase: "playing" });
  },
  win: (coins) => {
    const { levelIndex, best, unlocked } = get();
    const nextBest = best.map((b, i) => (i === levelIndex ? Math.max(b, coins) : b));
    const nextUnlocked = Math.max(unlocked, Math.min(LEVELS.length - 1, levelIndex + 1));
    persist(nextUnlocked, nextBest);
    set({ phase: "won", best: nextBest, unlocked: nextUnlocked, coins });
  },
  gameOver: () => set({ phase: "dead" }),
  toggleMute: () => set({ muted: !get().muted }),
  hydrate: () => {
    const saved = loadSave();
    set({ unlocked: saved.unlocked, best: saved.best });
  },
}));
