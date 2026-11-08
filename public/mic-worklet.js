class MicTap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.have = 0;
    this.sum = 0;
    this.buf = new Float32Array(7680);
    this.n = 0;
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i += 1) {
      this.sum += ch[i];
      this.have += 1;
      if (this.have + 1e-6 < this.ratio) continue;
      const v = this.sum / this.have;
      this.sum = 0;
      this.have -= this.ratio;
      this.buf[this.n] = v;
      this.n += 1;
      if (this.n === this.buf.length) {
        this.port.postMessage(this.buf);
        this.buf = new Float32Array(7680);
        this.n = 0;
      }
    }
    return true;
  }
}

registerProcessor("mic-tap", MicTap);
