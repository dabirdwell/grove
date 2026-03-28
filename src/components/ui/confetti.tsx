'use client';

import { useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

export type ConfettiType = 'celebration' | 'milestone' | 'goal' | 'streak' | 'subtle';

// Money colors - green tones (US dollar bill colors)
const MONEY_COLORS = ['#85bb65', '#3d6b3d', '#228b22', '#006400', '#4a7c23'];

// Cache for dollar bill shapes
let dollarBillShape: confetti.Shape | null = null;
let dollarEmojiShape: confetti.Shape | null = null;
let moneyBagShape: confetti.Shape | null = null;

// Get rectangular bill shape
function getDollarBillShape(): confetti.Shape {
  if (!dollarBillShape) {
    // Rectangle with 2.3:1 aspect ratio (like real US bills)
    dollarBillShape = confetti.shapeFromPath({
      path: 'M0 0 L46 0 L46 20 L0 20 Z',
    });
  }
  return dollarBillShape;
}

// Get dollar emoji shape 💵
function getDollarEmojiShape(): confetti.Shape {
  if (!dollarEmojiShape) {
    dollarEmojiShape = confetti.shapeFromText({ text: '💵', scalar: 2 });
  }
  return dollarEmojiShape;
}

// Get money bag emoji shape 💰
function getMoneyBagShape(): confetti.Shape {
  if (!moneyBagShape) {
    moneyBagShape = confetti.shapeFromText({ text: '💰', scalar: 2 });
  }
  return moneyBagShape;
}

// Get all money shapes for variety
function getMoneyShapes(): confetti.Shape[] {
  return [getDollarEmojiShape(), getDollarEmojiShape(), getMoneyBagShape()];
}

interface ConfettiOptions {
  type?: ConfettiType;
  duration?: number;
  colors?: string[];
}

const CONFETTI_CONFIGS: Record<ConfettiType, confetti.Options> = {
  celebration: {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6'],
  },
  milestone: {
    particleCount: 50,
    spread: 60,
    origin: { y: 0.5 },
    colors: ['#22C55E', '#86efac', '#dcfce7'],
  },
  goal: {
    particleCount: 200,
    spread: 120,
    origin: { y: 0.6 },
    startVelocity: 45,
    colors: ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B'],
    shapes: ['circle', 'square'],
    ticks: 200,
  },
  streak: {
    particleCount: 30,
    angle: 90,
    spread: 45,
    origin: { y: 0.8 },
    colors: ['#F59E0B', '#FBBF24', '#FCD34D'],
  },
  subtle: {
    particleCount: 20,
    spread: 40,
    origin: { y: 0.7 },
    colors: ['#3B82F6', '#60A5FA'],
    gravity: 0.8,
  },
};

export function useConfetti() {
  const cannonRef = useRef<confetti.CreateTypes | null>(null);

  useEffect(() => {
    // Create a canvas element for confetti
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    cannonRef.current = confetti.create(canvas, {
      resize: true,
      useWorker: true,
    });

    return () => {
      cannonRef.current?.reset();
      canvas.remove();
    };
  }, []);

  const fire = useCallback((options: ConfettiOptions = {}) => {
    const { type = 'celebration', duration = 3000, colors } = options;
    const config = { ...CONFETTI_CONFIGS[type] };

    if (colors) {
      config.colors = colors;
    }

    if (!cannonRef.current) return;

    const cannon = cannonRef.current;

    // Fire confetti
    cannon(config);

    // For goal completion, do a more elaborate display
    if (type === 'goal') {
      setTimeout(() => {
        cannon({
          ...config,
          origin: { x: 0.2, y: 0.6 },
          angle: 60,
        });
        cannon({
          ...config,
          origin: { x: 0.8, y: 0.6 },
          angle: 120,
        });
      }, 250);

      setTimeout(() => {
        cannon({
          ...config,
          particleCount: 100,
          origin: { x: 0.5, y: 0.3 },
        });
      }, 500);
    }

    // For celebration, do continuous bursts
    if (type === 'celebration') {
      const end = Date.now() + duration;

      const interval = setInterval(() => {
        if (Date.now() > end) {
          clearInterval(interval);
          return;
        }

        cannon({
          ...config,
          particleCount: 30,
          origin: {
            x: Math.random(),
            y: Math.random() * 0.4 + 0.3,
          },
        });
      }, 200);
    }
  }, []);

  const fireAtElement = useCallback((element: HTMLElement, options: ConfettiOptions = {}) => {
    const rect = element.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    const { type = 'subtle' } = options;
    const config = { ...CONFETTI_CONFIGS[type], origin: { x, y } };

    cannonRef.current?.(config);
  }, []);

  return { fire, fireAtElement };
}

// Component wrapper for declarative usage
interface ConfettiTriggerProps {
  trigger: boolean;
  type?: ConfettiType;
  duration?: number;
  colors?: string[];
  onComplete?: () => void;
}

export function ConfettiTrigger({
  trigger,
  type = 'celebration',
  duration = 3000,
  colors,
  onComplete,
}: ConfettiTriggerProps) {
  const { fire } = useConfetti();
  const hasFired = useRef(false);

  useEffect(() => {
    if (trigger && !hasFired.current) {
      hasFired.current = true;
      fire({ type, duration, colors });

      if (onComplete) {
        setTimeout(onComplete, duration);
      }
    }

    if (!trigger) {
      hasFired.current = false;
    }
  }, [trigger, type, duration, colors, fire, onComplete]);

  return null;
}

// Preset celebration functions
export const celebrations = {
  bucketCreated: () => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const myConfetti = confetti.create(canvas, { resize: true });

    myConfetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: ['#3B82F6', '#60A5FA'],
      gravity: 1.2,
    });

    setTimeout(() => {
      canvas.remove();
    }, 2000);
  },

  allocationComplete: () => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const myConfetti = confetti.create(canvas, { resize: true });

    const moneyShapes = getMoneyShapes();

    // Main burst of dollar bills 💵 and money bags 💰
    myConfetti({
      particleCount: 60,
      spread: 80,
      origin: { y: 0.6 },
      shapes: moneyShapes,
      scalar: 2,
      gravity: 0.7, // Fall slower for better visibility
      ticks: 300, // Last longer
      flat: true, // Keep emojis flat (not rotating in 3D)
    });

    // Second wave from sides
    setTimeout(() => {
      myConfetti({
        particleCount: 35,
        spread: 70,
        origin: { x: 0.2, y: 0.6 },
        angle: 60,
        shapes: moneyShapes,
        scalar: 2,
        gravity: 0.6,
        flat: true,
      });
      myConfetti({
        particleCount: 35,
        spread: 70,
        origin: { x: 0.8, y: 0.6 },
        angle: 120,
        shapes: moneyShapes,
        scalar: 2,
        gravity: 0.6,
        flat: true,
      });
    }, 200);

    // Final shower from top
    setTimeout(() => {
      myConfetti({
        particleCount: 30,
        spread: 120,
        origin: { y: 0.2 },
        shapes: moneyShapes,
        scalar: 2.5, // Bigger for the finale
        gravity: 0.8,
        drift: 0,
        flat: true,
      });
    }, 400);

    setTimeout(() => {
      canvas.remove();
    }, 4000);
  },

  firstAllocation: () => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const myConfetti = confetti.create(canvas, { resize: true });
    const moneyShapes = getMoneyShapes();

    // Three bursts from different angles - extra special!
    myConfetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6, x: 0.3 },
      shapes: moneyShapes,
      scalar: 2.5,
      gravity: 0.6,
      flat: true,
    });

    setTimeout(() => {
      myConfetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6, x: 0.7 },
        shapes: moneyShapes,
        scalar: 2.5,
        gravity: 0.6,
        flat: true,
      });
    }, 200);

    setTimeout(() => {
      myConfetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5, x: 0.5 },
        shapes: moneyShapes,
        scalar: 3,
        gravity: 0.5,
        flat: true,
        ticks: 400,
      });
    }, 400);

    setTimeout(() => {
      canvas.remove();
    }, 5000);
  },

  goalMilestone: (percent: number) => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const myConfetti = confetti.create(canvas, { resize: true });

    const intensity = percent / 100;

    myConfetti({
      particleCount: Math.floor(50 * intensity),
      spread: 60 + 30 * intensity,
      origin: { y: 0.6 },
      colors: percent >= 100
        ? ['#22C55E', '#86efac', '#dcfce7', '#F59E0B']
        : ['#22C55E', '#86efac'],
    });

    if (percent >= 100) {
      // Extra celebration for 100%
      setTimeout(() => {
        myConfetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.5 },
          startVelocity: 50,
        });
      }, 300);
    }

    setTimeout(() => {
      canvas.remove();
    }, 3000);
  },

  streakContinued: (count: number) => {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const myConfetti = confetti.create(canvas, { resize: true });

    // More particles for longer streaks
    const particleCount = Math.min(20 + count * 5, 100);

    myConfetti({
      particleCount,
      angle: 90,
      spread: 45,
      origin: { y: 0.8 },
      colors: ['#F59E0B', '#FBBF24', '#FCD34D'],
    });

    setTimeout(() => {
      canvas.remove();
    }, 2000);
  },
};
