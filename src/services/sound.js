// Emergency Sound Generator using Web Audio API
// Generates dual-tone alarm siren, chimes, and beeps without requiring external audio files.

class EmergencySoundService {
  constructor() {
    this.audioCtx = null;
    this.sirenOscillator1 = null;
    this.sirenGain = null;
    this.sirenInterval = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.pendingSiren = false;
    this.isBlocked = false;

    // Load muted state from localStorage
    try {
      const savedMute = localStorage.getItem('emergency_audio_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
    } catch {
      // Ignore localStorage errors
    }

    // Auto-unlock audio context on first user interaction anywhere on the window
    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlockAudio();
      };
      window.addEventListener('click', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
      window.addEventListener('touchstart', unlockHandler, { passive: true });
    }
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    return this.audioCtx;
  }

  // Attempt to resume audio context, especially when blocked by browser autoplay policy
  async unlockAudio() {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.isBlocked = false;
      if (this.pendingSiren && !this.isMuted) {
        this.startSiren();
      }
      return true;
    } catch (err) {
      console.warn('AudioContext resume was blocked or failed:', err);
      this.isBlocked = true;
      return false;
    }
  }

  isAutoplayBlocked() {
    const ctx = this.audioCtx;
    return Boolean(ctx && ctx.state === 'suspended');
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
    try {
      localStorage.setItem('emergency_audio_muted', String(this.isMuted));
    } catch {
      // Ignore localStorage errors
    }
    if (this.isMuted && this.isPlaying) {
      this.stopSiren();
    }
    return this.isMuted;
  }

  toggleMute() {
    return this.setMuted(!this.isMuted);
  }

  // Dual-tone alternating emergency siren (960Hz <-> 770Hz)
  startSiren() {
    if (this.isMuted) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      this.pendingSiren = true;
      this.isBlocked = true;
      ctx.resume().then(() => {
        this.isBlocked = false;
        if (this.pendingSiren && !this.isPlaying && !this.isMuted) {
          this._playSirenInternal(ctx);
        }
      }).catch(() => {
        this.isBlocked = true;
      });
      return;
    }

    if (this.isPlaying) return;
    this._playSirenInternal(ctx);
  }

  _playSirenInternal(ctx) {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(960, ctx.currentTime);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();

      let toggle = false;
      this.sirenInterval = setInterval(() => {
        if (!this.isPlaying) return;
        const targetFreq = toggle ? 960 : 770;
        try {
          osc.frequency.setValueAtTime(targetFreq, ctx.currentTime);
        } catch {
          // Context may have closed
        }
        toggle = !toggle;
      }, 350);

      this.sirenOscillator1 = osc;
      this.sirenGain = gain;
      this.isPlaying = true;
      this.pendingSiren = false;
      this.isBlocked = false;
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }

  stopSiren() {
    this.pendingSiren = false;
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
    if (this.sirenOscillator1) {
      try {
        this.sirenOscillator1.stop();
        this.sirenOscillator1.disconnect();
      } catch {
        // Ignore
      }
      this.sirenOscillator1 = null;
    }
    if (this.sirenGain) {
      try {
        this.sirenGain.disconnect();
      } catch {
        // Ignore
      }
      this.sirenGain = null;
    }
    this.isPlaying = false;
  }

  // Short notification chime when alert is acknowledged
  playSuccessChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx || ctx.state === 'suspended') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.15); // C6

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Ignore
    }
  }

  // Quick test beep
  async playTestBeep() {
    try {
      await this.unlockAudio();
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Ignore
    }
  }
}

export const soundService = new EmergencySoundService();
