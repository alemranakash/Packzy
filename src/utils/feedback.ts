/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Safe browser helper to play sound synthesizer beeps and trigger haptic events
class FeedbackService {
  private audioCtx: AudioContext | null = null;

  private initAudio() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    // Resume context if paused (browsers block initial audio without interaction)
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public playSuccessBeep() {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      
      // Professional logistic scanner sound: Two quick rising pleasant tones
      // Note 1
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(950, now); // Sweet high chime pitch
      
      gain1.gain.setValueAtTime(0.0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Note 2 - timed slightly after note 1
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1300, now + 0.06); // High pitch upward chirp
      
      gain2.gain.setValueAtTime(0.0, now + 0.06);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      
      osc2.start(now + 0.06);
      osc2.stop(now + 0.22);
    } catch (e) {
      console.warn('Audio feedback failed to play', e);
    }
  }

  public playErrorBeep() {
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.type = 'sawtooth'; // Warning buzz
      osc.frequency.setValueAtTime(180, now); // Low hazard warning pitch
      
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio feedback failed to play', e);
    }
  }

  public triggerHapticFeedback() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(75); // Standard tactile physical feedback length
      } catch (e) {
        // Safe to ignore if permissions/iframes block it
      }
    }
  }
}

export const feedback = new FeedbackService();
