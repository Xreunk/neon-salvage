// Synthesized sound effects only: every sound is built from oscillators and filtered noise
// in code, so the game ships no audio files. The context is created lazily on the first user
// gesture (browsers block audio before one); screenshot mode never gestures, so it stays silent.

const MUTE_KEY = 'neon-salvage.muted';

export function createAudio() {
  let context = null;
  let muted = false;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    muted = false;
  }

  function ensure() {
    if (context === null) {
      try {
        const AudioContext = window.AudioContext ?? window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = null;
      }
    }
    if (context !== null && context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  function tone({ type = 'sine', from = 440, to = null, duration = 0.12, volume = 0.16, delay = 0 }) {
    const audio = ensure();
    if (audio === null || muted) return;
    const start = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    if (to !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noise({ duration = 0.2, volume = 0.2, from = 1200, to = 200, delay = 0 }) {
    const audio = ensure();
    if (audio === null || muted) return;
    const start = audio.currentTime + delay;
    const length = Math.max(1, Math.floor(audio.sampleRate * duration));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    const gain = audio.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start(start);
  }

  return {
    /** Call from a real user gesture so the browser unlocks audio. */
    unlock() {
      ensure();
    },
    pickup(combo) {
      const base = 520 + combo * 70;
      tone({ type: 'sine', from: base, to: base * 1.5, duration: 0.1, volume: 0.14 });
      tone({ type: 'triangle', from: base * 2, duration: 0.07, volume: 0.06, delay: 0.02 });
    },
    core() {
      tone({ type: 'sine', from: 660, duration: 0.12, volume: 0.16 });
      tone({ type: 'sine', from: 880, duration: 0.12, volume: 0.16, delay: 0.09 });
      tone({ type: 'sine', from: 1320, duration: 0.2, volume: 0.14, delay: 0.18 });
    },
    waveClear() {
      tone({ type: 'triangle', from: 523, duration: 0.14, volume: 0.15 });
      tone({ type: 'triangle', from: 784, duration: 0.2, volume: 0.15, delay: 0.11 });
    },
    hit() {
      tone({ type: 'sawtooth', from: 220, to: 55, duration: 0.3, volume: 0.22 });
      noise({ duration: 0.25, volume: 0.22, from: 900, to: 120 });
    },
    dash() {
      noise({ duration: 0.18, volume: 0.12, from: 400, to: 3200 });
    },
    win() {
      [523, 659, 784, 1047].forEach((frequency, index) => {
        tone({ type: 'triangle', from: frequency, duration: 0.22, volume: 0.16, delay: index * 0.12 });
      });
    },
    lose() {
      [392, 330, 262, 196].forEach((frequency, index) => {
        tone({ type: 'sawtooth', from: frequency, duration: 0.24, volume: 0.12, delay: index * 0.13 });
      });
    },
    toggleMute() {
      muted = !muted;
      try {
        window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
      } catch {
        // Storage can be off: the mute then lasts this visit only.
      }
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
