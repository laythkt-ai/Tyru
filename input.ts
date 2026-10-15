const MOVE_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyQ",
  "KeyE",
  "Escape",
]);

export class Input {
  keys = new Set<string>();
  injected: string[] | null = null;
  touchMoveX = 0;
  touchMoveZ = 0;
  touchJump = false;
  jumpPressed = false;
  private prevJump = false;
  camOrbit = 0;

  attach() {
    const down = (e: KeyboardEvent) => {
      if (MOVE_CODES.has(e.code)) e.preventDefault();
      this.keys.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    const clear = () => {
      this.keys.clear();
      this.prevJump = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });
    this.detach = () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }

  detach = () => {};

  setKeys(codes: string[]) {
    this.injected = codes.length === 0 ? null : codes;
  }

  private held(code: string) {
    if (this.injected) return this.injected.includes(code);
    return this.keys.has(code);
  }

  sample() {
    let moveX = this.touchMoveX;
    let moveZ = this.touchMoveZ;
    if (this.held("KeyA") || this.held("ArrowLeft")) moveX -= 1;
    if (this.held("KeyD") || this.held("ArrowRight")) moveX += 1;
    if (this.held("KeyW") || this.held("ArrowUp")) moveZ += 1;
    if (this.held("KeyS") || this.held("ArrowDown")) moveZ -= 1;
    const len = Math.hypot(moveX, moveZ);
    if (len > 1) {
      moveX /= len;
      moveZ /= len;
    }

    const jumpHeld = this.touchJump || this.held("Space");
    this.jumpPressed = jumpHeld && !this.prevJump;
    this.prevJump = jumpHeld;

    let orbit = 0;
    if (this.held("KeyQ")) orbit += 1;
    if (this.held("KeyE")) orbit -= 1;
    this.camOrbit = orbit;

    return { moveX, moveZ, jumpHeld };
  }

  pausePressed() {
    return this.held("Escape");
  }
}

export const input = new Input();
