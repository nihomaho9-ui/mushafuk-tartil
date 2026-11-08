class MicTap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.pos = 0;
    this.lp = 0;
    this.dcIn = 0;
    this.dcOut = 0;
    this.env = 0.0004;
    this.gain = 1;
    this.buf = new Float32Array(7680);
    this.n = 0;
    this.lpA = 1 - Math.exp((-2 * Math.PI * 7400) / sampleRate);
  }

  push(x) {
    const blocked = x - this.dcIn + 0.995 * this.dcOut;
    this.dcIn = x;
    this.dcOut = blocked;
    this.env = this.env * 0.9996 + blocked * blocked * 0.0004;
    const rms = Math.sqrt(this.env);
    const target = rms > 0.0014 ? Math.min(10, 0.075 / rms) : 1;
    this.gain += (target - this.gain) * 0.0008;
    const y = Math.tanh(blocked * this.gain);
    this.buf[this.n] = y;
    this.n += 1;
    if (this.n === this.buf.length) {
      const out = this.buf;
      this.buf = new Float32Array(7680);
      this.n = 0;
      this.port.postMessage(out, [out.buffer]);
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
