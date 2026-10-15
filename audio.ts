type OscType = OscillatorType;

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  muted = false;

  unlock() {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!this.ctx) {
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.8;
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.02);
    }
  }

  private tone(
    freq: number,
    dur: number,
    type: OscType,
    gain: number,
    slide = 0,
    delay = 0,
  ) {
    if (!this.ctx || !this.sfx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  jump() {
    const r = 1 + (Math.random() * 0.08 - 0.04);
    this.tone(390 * r, 0.09, "square", 0.05, 180);
  }

  doubleJump() {
    const r = 1 + (Math.random() * 0.08 - 0.04);
    this.tone(520 * r, 0.08, "square", 0.045, 240);
    this.tone(780 * r, 0.07, "triangle", 0.03, 120, 0.03);
  }

  land(hard: boolean) {
    this.tone(hard ? 90 : 120, 0.07, "sine", hard ? 0.06 : 0.03, -40);
  }

  coin() {
    const r = 1 + (Math.random() * 0.06 - 0.03);
    this.tone(880 * r, 0.08, "triangle", 0.05, 40);
    this.tone(1320 * r, 0.12, "sine", 0.035, 80, 0.05);
  }

  checkpoint() {
    this.tone(440, 0.12, "sine", 0.05, 80);
    this.tone(554, 0.14, "sine", 0.04, 40, 0.08);
    this.tone(659, 0.18, "triangle", 0.035, 20, 0.16);
  }

  death() {
    this.tone(220, 0.18, "sawtooth", 0.05, -140);
    this.tone(140, 0.28, "sine", 0.06, -80, 0.05);
  }

  win() {
    this.tone(523, 0.14, "triangle", 0.05);
    this.tone(659, 0.14, "triangle", 0.045, 0, 0.12);
    this.tone(784, 0.22, "sine", 0.05, 40, 0.24);
    this.tone(1046, 0.28, "sine", 0.04, 20, 0.38);
  }
}

export const audio = new GameAudio();
