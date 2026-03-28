'use client';

import { useCallback, useEffect, useState } from 'react';

type SoundType =
  | 'click'
  | 'success'
  | 'error'
  | 'notification'
  | 'whoosh'
  | 'coin'
  | 'celebration'
  | 'pop';

interface SoundEffectsOptions {
  enabled?: boolean;
  volume?: number;
}

// Web Audio API based sound generation (no external files needed)
class SoundGenerator {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private volume: number = 0.3;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', attack = 0.01, decay = 0.1) {
    if (!this.audioContext || !this.gainNode) return;

    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    envelope.gain.setValueAtTime(0, this.audioContext.currentTime);
    envelope.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + attack);
    envelope.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.connect(envelope);
    envelope.connect(this.gainNode);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  click() {
    this.playTone(800, 0.05, 'square', 0.001, 0.05);
  }

  success() {
    // Two ascending tones
    this.playTone(523.25, 0.15, 'sine'); // C5
    setTimeout(() => this.playTone(659.25, 0.2, 'sine'), 100); // E5
  }

  error() {
    // Two descending tones
    this.playTone(311.13, 0.2, 'sawtooth'); // Eb4
    setTimeout(() => this.playTone(261.63, 0.25, 'sawtooth'), 150); // C4
  }

  notification() {
    this.playTone(880, 0.1, 'sine');
    setTimeout(() => this.playTone(1046.5, 0.15, 'sine'), 100);
  }

  whoosh() {
    if (!this.audioContext || !this.gainNode) return;

    // White noise with frequency sweep
    const bufferSize = this.audioContext.sampleRate * 0.3;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2000, this.audioContext.currentTime + 0.15);
    filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);

    const envelope = this.audioContext.createGain();
    envelope.gain.setValueAtTime(0, this.audioContext.currentTime);
    envelope.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.05);
    envelope.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

    noise.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.gainNode);

    noise.start();
    noise.stop(this.audioContext.currentTime + 0.3);
  }

  coin() {
    // Classic coin sound - high pitched ascending
    this.playTone(987.77, 0.08, 'square'); // B5
    setTimeout(() => this.playTone(1318.51, 0.15, 'square'), 60); // E6
  }

  celebration() {
    // Fanfare-like sequence
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine'), i * 100);
    });
  }

  pop() {
    this.playTone(400, 0.05, 'sine', 0.001);
    setTimeout(() => this.playTone(600, 0.03, 'sine', 0.001), 30);
  }

  resume() {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// Singleton instance
let soundGenerator: SoundGenerator | null = null;

function getSoundGenerator(): SoundGenerator {
  if (!soundGenerator && typeof window !== 'undefined') {
    soundGenerator = new SoundGenerator();
  }
  return soundGenerator!;
}

export function useSoundEffects(options: SoundEffectsOptions = {}) {
  const { enabled: initialEnabled = false, volume: initialVolume = 0.3 } = options;

  const [enabled, setEnabled] = useState(initialEnabled);
  const [volume, setVolume] = useState(initialVolume);

  // Update generator volume when volume state changes
  useEffect(() => {
    const generator = getSoundGenerator();
    if (generator) {
      generator.setVolume(volume);
    }
  }, [volume]);

  // Resume audio context on user interaction
  useEffect(() => {
    const handleInteraction = () => {
      const generator = getSoundGenerator();
      if (generator) {
        generator.resume();
      }
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  const play = useCallback((sound: SoundType) => {
    if (!enabled) return;

    const generator = getSoundGenerator();
    if (!generator) return;

    switch (sound) {
      case 'click':
        generator.click();
        break;
      case 'success':
        generator.success();
        break;
      case 'error':
        generator.error();
        break;
      case 'notification':
        generator.notification();
        break;
      case 'whoosh':
        generator.whoosh();
        break;
      case 'coin':
        generator.coin();
        break;
      case 'celebration':
        generator.celebration();
        break;
      case 'pop':
        generator.pop();
        break;
    }
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled(prev => !prev);
  }, []);

  return {
    play,
    enabled,
    setEnabled,
    toggle,
    volume,
    setVolume,
  };
}

// Pre-defined sound effect hooks for specific actions
export function useClickSound() {
  const { play, enabled } = useSoundEffects({ enabled: false });
  return { playClick: () => play('click'), enabled };
}

export function useSuccessSound() {
  const { play, enabled } = useSoundEffects({ enabled: false });
  return { playSuccess: () => play('success'), enabled };
}

export function useCelebrationSound() {
  const { play, enabled } = useSoundEffects({ enabled: false });
  return { playCelebration: () => play('celebration'), enabled };
}
