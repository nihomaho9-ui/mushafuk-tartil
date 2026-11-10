class MicTap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.pos = 0;
    this.lp = 0;
    this.x1 = 0;
    this.y1 = 0;
    this.hp = Math.exp((-2 * Math.PI * 80) / 16000);
    this.env = 0.0002;
    this.gain = 1;
    this.energy = 0;
    this.buf = new Float32Array(7680);
    this.n = 0;
    this.lpA = 1 - Math.exp((-2 * Math.PI * 7400) / sampleRate);
    this.port.onmessage = (ev) => {
      const room = ev.data && ev.data.room;
      if (typeof room === "number" && room >= 1 && room <= 18) this.gain = room;
    };
  }

  push(x) {
    const y = this.hp * (this.y1 + x - this.x1);
    this.x1 = x;
    this.y1 = y;
    this.energy += y * y;
    this.env = this.env * 0.9992 + y * y * 0.0008;
    const rms = Math.sqrt(this.env);
    const target = rms > 0.0011 ? Math.min(18, 0.12 / rms) : 1;
    const rate = target > this.gain ? 0.012 : 0.00035;
    this.gain += (target - this.gain) * rate;
    this.buf[this.n] = Math.tanh(y * this.gain);
    this.n += 1;
    if (this.n === this.buf.length) {
      const out = this.buf;
      const rms = Math.sqrt(this.energy / this.buf.length);
      this.buf = new Float32Array(7680);
      this.n = 0;
      this.energy = 0;
      this.port.postMessage({ rms, pcm: out }, [out.buffer]);
    }
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    if (this.ratio <= 1.02) {
      for (let i = 0; i < ch.length; i += 1) this.push(ch[i]);
      return true;
    }
    for (let i = 0; i < ch.length; i += 1) {
      this.lp += this.lpA * (ch[i] - this.lp);
      this.pos += 1;
      if (this.pos + 1e-4 < this.ratio) continue;
      this.pos -= this.ratio;
      this.push(this.lp);
    }
    return true;
  }
}

registerProcessor("mic-tap", MicTap);
