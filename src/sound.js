// A tiny synthesized sound engine using the Web Audio API.
// No audio files required — every sound is generated on the fly, which keeps
// the app self-contained and lets hit sounds rise in pitch with your combo.

class SoundEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.enabled = true
  }

  // The AudioContext must be created/resumed from a user gesture (browser rule).
  // Call this on the first click / when starting a game.
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    this.ctx = new AudioCtx()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.5
    this.master.connect(this.ctx.destination)
  }

  setEnabled(on) {
    this.enabled = on
  }

  get available() {
    return !!this.ctx && this.enabled
  }

  // Core tone helper: an oscillator with a fast attack/decay envelope.
  _tone({ freq = 440, type = 'sine', duration = 0.15, gain = 0.3, glideTo = null }) {
    if (!this.available) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const env = this.ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + duration)

    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(gain, t + 0.008)
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration)

    osc.connect(env)
    env.connect(this.master)
    osc.start(t)
    osc.stop(t + duration + 0.02)
  }

  // Short noise burst (used for the "miss" thud).
  _noise({ duration = 0.18, gain = 0.25, freq = 800 }) {
    if (!this.available) return
    const t = this.ctx.currentTime
    const bufferSize = Math.floor(this.ctx.sampleRate * duration)
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = freq
    const env = this.ctx.createGain()
    env.gain.setValueAtTime(gain, t)
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration)

    src.connect(filter)
    filter.connect(env)
    env.connect(this.master)
    src.start(t)
    src.stop(t + duration)
  }

  // Satisfying body-hit "pop" — pitch climbs with the current combo.
  hit(combo = 0) {
    const base = 520
    const freq = base + Math.min(combo, 20) * 42
    this._tone({ freq, glideTo: freq * 1.6, type: 'triangle', duration: 0.12, gain: 0.35 })
    this._tone({ freq: freq * 2, type: 'sine', duration: 0.08, gain: 0.12 })
  }

  // Headshot — a brighter, bell-like double "ding" that cuts through.
  headshot(combo = 0) {
    const base = 900 + Math.min(combo, 20) * 30
    this._tone({ freq: base, type: 'sine', duration: 0.14, gain: 0.32 })
    this._tone({ freq: base * 1.5, type: 'sine', duration: 0.18, gain: 0.22 })
    setTimeout(() => this._tone({ freq: base * 2, type: 'sine', duration: 0.12, gain: 0.16 }), 45)
  }

  // Short, punchy gunshot played on every trigger pull.
  gunshot() {
    this._noise({ duration: 0.09, gain: 0.28, freq: 2600 })
    this._tone({ freq: 220, glideTo: 90, type: 'square', duration: 0.07, gain: 0.14 })
  }

  // A target that ducked back before you could tag it.
  escape() {
    this._tone({ freq: 300, glideTo: 160, type: 'sine', duration: 0.16, gain: 0.12 })
  }

  miss() {
    this._noise({ duration: 0.2, gain: 0.22, freq: 500 })
    this._tone({ freq: 150, glideTo: 80, type: 'sawtooth', duration: 0.18, gain: 0.12 })
  }

  // Golden snitch appears — a quick shimmer so a sharp-eared player knows to
  // look for it even off-screen.
  snitchAppear() {
    this._tone({ freq: 1400, glideTo: 1800, type: 'sine', duration: 0.12, gain: 0.13 })
    this._tone({ freq: 2100, glideTo: 2600, type: 'sine', duration: 0.1, gain: 0.07 })
  }

  // Caught it — a bright ascending chime distinct from a normal headshot.
  snitchCatch() {
    const notes = [880, 1174, 1568, 2093]
    notes.forEach((f, i) => {
      setTimeout(() => this._tone({ freq: f, type: 'sine', duration: 0.16, gain: 0.24 }), i * 55)
    })
  }

  start() {
    this._tone({ freq: 330, glideTo: 660, type: 'square', duration: 0.18, gain: 0.2 })
  }

  countdownTick() {
    this._tone({ freq: 880, type: 'sine', duration: 0.06, gain: 0.15 })
  }

  gameOver(win = false) {
    if (win) {
      // Little ascending arpeggio for a completed run.
      const notes = [523, 659, 784, 1047]
      notes.forEach((f, i) => {
        setTimeout(() => this._tone({ freq: f, type: 'triangle', duration: 0.2, gain: 0.28 }), i * 90)
      })
    } else {
      const notes = [440, 349, 262]
      notes.forEach((f, i) => {
        setTimeout(() => this._tone({ freq: f, type: 'sawtooth', duration: 0.25, gain: 0.22 }), i * 120)
      })
    }
  }
}

// Single shared instance for the whole app.
export const sound = new SoundEngine()
