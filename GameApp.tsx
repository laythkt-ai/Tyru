import { useEffect, useRef } from "react";
import { Overlay } from "./ui/Overlay";
import { TouchControls } from "./ui/TouchControls";
import { audio } from "./audio";
import { useGameStore } from "./store";

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    useGameStore.getState().hydrate();

    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let engine: { dispose: () => void; start: () => void } | null = null;

    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);

    import("./GameEngine").then(({ GameEngine }) => {
      if (!canvasRef.current) return;
      const inst = new GameEngine(canvasRef.current);
      if (disposed) {
        inst.dispose();
        return;
      }
      engine = inst;
      engine.start();
    });

    return () => {
      disposed = true;
      engine?.dispose();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  return (
    <div className="game-root relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full touch-none"
        onContextMenu={(e) => e.preventDefault()}
      />
      <Overlay />
      <TouchControls />
    </div>
  );
}
