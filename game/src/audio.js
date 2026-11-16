// All sound is synthesised with WebAudio: no audio files, nothing to load.
// The engine stays silent until the first user gesture unlocks the context,
// and every effect is a short oscillator or filtered-noise burst.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function unlock() {
    if (context !== null) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.32;
    master.connect(context.destination);
  }

  function tone(freqFrom, freqTo, seconds, type, volume, delay = 0) {
    if (context === null || muted) return;
    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(24, freqTo), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  function noise(seconds, volume, filterFreq) {
    if (context === null || muted) return;
    const start = context.currentTime;
    const length = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    shoot() {
      tone(880, 320, 0.07, 'square', 0.05);
    },
    hit() {
      tone(240, 140, 0.05, 'triangle', 0.06);
    },
    explosion(big) {
      noise(big ? 0.5 : 0.22, big ? 0.5 : 0.22, big ? 900 : 1400);
      tone(big ? 120 : 180, 40, big ? 0.5 : 0.25, 'sawtooth', big ? 0.3 : 0.12);
    },
    pickup() {
      tone(660, 990, 0.09, 'sine', 0.09);
    },
    hurt() {
      tone(200, 60, 0.28, 'sawtooth', 0.28);
      noise(0.2, 0.2, 700);
    },
    dash() {
      noise(0.16, 0.12, 2400);
      tone(300, 720, 0.14, 'sine', 0.05);
    },
    levelUp() {
      tone(523, 523, 0.12, 'triangle', 0.14);
      tone(659, 659, 0.12, 'triangle', 0.14, 0.1);
      tone(784, 1046, 0.22, 'triangle', 0.16, 0.2);
    },
    waveClear() {
      tone(392, 392, 0.14, 'triangle', 0.12);
      tone(587, 880, 0.26, 'triangle', 0.14, 0.12);
    },
    gameOver() {
      tone(320, 48, 1.1, 'sawtooth', 0.24);
    },
    victory() {
      const notes = [523, 659, 784, 1046, 784, 1046];
      notes.forEach((freq, i) => tone(freq, freq, 0.24, 'triangle', 0.15, i * 0.13));
    },
  };
}
