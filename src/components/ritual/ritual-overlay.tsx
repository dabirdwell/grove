'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

// ─── TYPES ──────────────────────────────────────────────────────────────

type RitualStep = 'invite' | 'open' | 'breathe' | 'rotate' | 'tend' | 'close' | 'done';

interface RitualBranch {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface TendInsight {
  icon: string;
  title: string;
  detail: string;
}

interface RitualOverlayProps {
  branches: RitualBranch[];
  streak: number;
  onComplete: () => void;
  onSkip: () => void;
}

// ─── UTILITIES ──────────────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Resolve CSS var() references to hex for Three.js materials */
function resolveColor(color: string): string {
  if (!color || !color.startsWith('var(')) return color || '#64FFDA';
  try {
    const varName = color.replace('var(', '').replace(')', '').trim();
    const computed = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    return computed || '#64FFDA';
  } catch {
    return '#64FFDA';
  }
}

// ─── TEND INSIGHT ───────────────────────────────────────────────────────

function computeTendInsight(): TendInsight {
  try {
    const today = new Date();
    const todayDay = today.getDate();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // Check bills due today or tomorrow
    const billsRaw = localStorage.getItem('grove-bills');
    if (billsRaw) {
      const bills: Array<{ name: string; amount: number; dueDay: number; paidDates: string[] }> = JSON.parse(billsRaw);
      for (const bill of bills) {
        const isPaid = bill.paidDates?.includes(currentMonth);
        if (!isPaid) {
          const daysUntil = bill.dueDay - todayDay;
          if (daysUntil === 0) {
            return { icon: '📋', title: `${bill.name} is due today`, detail: `$${bill.amount}` };
          }
          if (daysUntil === 1) {
            return { icon: '📋', title: `${bill.name} is due tomorrow`, detail: `$${bill.amount}` };
          }
        }
      }
    }

    // Check goal progress
    const goalsRaw = localStorage.getItem('grove-savings-goals');
    if (goalsRaw) {
      const goals: Array<{ name: string; targetAmount: number; currentAmount: number }> = JSON.parse(goalsRaw);
      for (const goal of goals) {
        if (goal.targetAmount > 0) {
          const pct = Math.round((goal.currentAmount / goal.targetAmount) * 100);
          if (pct >= 100) {
            return { icon: '✨', title: `${goal.name} is fully funded!`, detail: 'Congratulations!' };
          }
          if (pct >= 75) {
            return { icon: '🎯', title: `${goal.name} is ${pct}% funded`, detail: 'Almost there!' };
          }
        }
      }
    }
  } catch { /* ignore parse errors */ }

  return { icon: '🌿', title: "You're on track", detail: 'Your tree is healthy and growing.' };
}

// ─── AMBIENT SOUND ──────────────────────────────────────────────────────

class RitualAmbience {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sources: (AudioBufferSourceNode | OscillatorNode)[] = [];

  start() {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0;
      this.masterGain.connect(this.ctx.destination);

      // Brown noise → gentle water ambience
      const bufferSize = this.ctx.sampleRate * 30;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;

      noise.connect(filter);
      filter.connect(this.masterGain);
      noise.start();
      this.sources.push(noise);

      // Low drone — night ambience
      const drone = this.ctx.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = 85;
      const droneGain = this.ctx.createGain();
      droneGain.gain.value = 0.08;
      drone.connect(droneGain);
      droneGain.connect(this.masterGain);
      drone.start();
      this.sources.push(drone);

      // Fade in over 3 seconds
      this.masterGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 3);
    } catch { /* Web Audio not available */ }
  }

  fadeOut() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 3);
    }
  }

  stop() {
    for (const s of this.sources) {
      try { s.stop(); } catch { /* ignore */ }
    }
    try { this.ctx?.close(); } catch { /* ignore */ }
    this.sources = [];
    this.ctx = null;
    this.masterGain = null;
  }
}

// ─── 3D: CAMERA ─────────────────────────────────────────────────────────

function RitualCamera({ step }: { step: RitualStep }) {
  const { camera } = useThree();
  const clockRef = useRef(new THREE.Clock());
  const prevStepRef = useRef<RitualStep>(step);

  // Reset timer on step change
  if (step !== prevStepRef.current) {
    clockRef.current = new THREE.Clock();
    prevStepRef.current = step;
  }

  useFrame(() => {
    const elapsed = clockRef.current.getElapsedTime();

    switch (step) {
      case 'invite': {
        camera.position.set(6, 3.5, 8);
        camera.lookAt(0, 1, 0);
        break;
      }
      case 'open': {
        const t = easeInOutCubic(Math.min(elapsed / 3, 1));
        camera.position.lerpVectors(
          new THREE.Vector3(6, 3.5, 8),
          new THREE.Vector3(2.5, 2, 3.5),
          t,
        );
        camera.lookAt(0, 1.2, 0);
        break;
      }
      case 'breathe': {
        const drift = Math.sin(elapsed * 0.5) * 0.05;
        camera.position.set(2.5 + drift, 2, 3.5);
        camera.lookAt(0, 1.2, 0);
        break;
      }
      case 'rotate': {
        const t = easeInOutCubic(Math.min(elapsed / 8, 1));
        const radius = Math.sqrt(2.5 * 2.5 + 3.5 * 3.5); // ~4.3
        const startAngle = Math.atan2(2.5, 3.5);
        const angle = startAngle + t * (Math.PI / 2);
        camera.position.set(
          radius * Math.sin(angle),
          2,
          radius * Math.cos(angle),
        );
        camera.lookAt(0, 1.2, 0);
        break;
      }
      case 'tend': {
        const radius = Math.sqrt(2.5 * 2.5 + 3.5 * 3.5);
        const endAngle = Math.atan2(2.5, 3.5) + Math.PI / 2;
        const drift = Math.sin(elapsed * 0.3) * 0.03;
        camera.position.set(
          radius * Math.sin(endAngle) + drift,
          2,
          radius * Math.cos(endAngle),
        );
        camera.lookAt(0, 1.2, 0);
        break;
      }
      case 'close': {
        const t = easeInOutCubic(Math.min(elapsed / 4, 1));
        const radius = Math.sqrt(2.5 * 2.5 + 3.5 * 3.5);
        const endAngle = Math.atan2(2.5, 3.5) + Math.PI / 2;
        const from = new THREE.Vector3(
          radius * Math.sin(endAngle),
          2,
          radius * Math.cos(endAngle),
        );
        const to = new THREE.Vector3(5, 3, 6);
        camera.position.lerpVectors(from, to, t);
        const lookTarget = new THREE.Vector3().lerpVectors(
          new THREE.Vector3(0, 1.2, 0),
          new THREE.Vector3(0, 1, 0),
          t,
        );
        camera.lookAt(lookTarget);
        break;
      }
    }
  });

  return null;
}

// ─── 3D: TREE ELEMENTS ──────────────────────────────────────────────────

function RitualTrunk() {
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.2, 0),
      new THREE.Vector3(0.02, 0.3, 0.01),
      new THREE.Vector3(-0.01, 0.7, -0.01),
      new THREE.Vector3(0.01, 1.1, 0.01),
      new THREE.Vector3(0, 1.5, 0),
    ]);
  }, []);

  // Flared base + tapered top — two segments
  const segments = useMemo(() => {
    const pts1 = [];
    const pts2 = [];
    for (let j = 0; j <= 8; j++) {
      const t = j / 8;
      if (t <= 0.5) pts1.push(curve.getPoint(t));
      if (t >= 0.4) pts2.push(curve.getPoint(t));
    }
    return [
      { curve: new THREE.CatmullRomCurve3(pts1), radius: 0.13 },
      { curve: new THREE.CatmullRomCurve3(pts2), radius: 0.07 },
    ];
  }, [curve]);

  return (
    <group>
      {segments.map((seg, i) => (
        <mesh key={i}>
          <tubeGeometry args={[seg.curve, 12, seg.radius, 10, false]} />
          <meshStandardMaterial color="#2a4a3a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function RitualBranch({
  angle,
  height,
  length,
  color,
  glowing,
}: {
  angle: number;
  height: number;
  length: number;
  color: string;
  glowing: boolean;
}) {
  const fruitRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const resolvedColor = useMemo(() => resolveColor(color), [color]);

  const curve = useMemo(() => {
    const dir = new THREE.Vector3(Math.sin(angle), 0.3, Math.cos(angle));
    const start = new THREE.Vector3(0, height, 0);
    const mid = start.clone().add(dir.clone().multiplyScalar(length * 0.5)).add(new THREE.Vector3(0, 0.15, 0));
    const end = start.clone().add(dir.clone().multiplyScalar(length)).add(new THREE.Vector3(0, 0.05, 0));
    return new THREE.CatmullRomCurve3([start, mid, end]);
  }, [angle, height, length]);

  const tipPos = useMemo(() => curve.getPoint(1), [curve]);

  // Leaf cluster at tip
  const leaves = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 5; i++) {
      arr.push({
        offset: new THREE.Vector3(
          (Math.random() - 0.5) * 0.12,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.12,
        ),
        scale: 0.02 + Math.random() * 0.02,
      });
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!fruitRef.current || !lightRef.current) return;
    const t = clock.getElapsedTime();
    const baseScale = glowing ? 1.5 : 1;
    const pulse = Math.sin(t * 2) * 0.15 + 1;
    fruitRef.current.scale.setScalar(baseScale * pulse);
    lightRef.current.intensity = glowing ? 3 : 0.8;
  });

  return (
    <group>
      {/* Branch tube */}
      <mesh>
        <tubeGeometry args={[curve, 10, 0.025, 8, false]} />
        <meshStandardMaterial color="#3D6B5A" roughness={0.85} />
      </mesh>

      {/* Glowing fruit at tip */}
      <mesh ref={fruitRef} position={tipPos}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          color={resolvedColor}
          emissive={resolvedColor}
          emissiveIntensity={glowing ? 0.9 : 0.3}
          transparent
          opacity={0.9}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        position={tipPos}
        color={resolvedColor}
        intensity={0.8}
        distance={1.5}
      />

      {/* Leaf cluster */}
      {leaves.map((leaf, i) => (
        <mesh
          key={i}
          position={[
            tipPos.x + leaf.offset.x,
            tipPos.y + leaf.offset.y,
            tipPos.z + leaf.offset.z,
          ]}
        >
          <sphereGeometry args={[leaf.scale, 8, 8]} />
          <meshStandardMaterial
            color="#2d6b4a"
            emissive="#1a5c38"
            emissiveIntensity={glowing ? 0.4 : 0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function RitualRoots() {
  const roots = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.3;
      const spread = 0.4 + Math.random() * 0.4;
      const droop = 0.15 + Math.random() * 0.15;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.1, 0),
        new THREE.Vector3(
          Math.sin(angle) * spread * 0.4,
          -0.15 - droop * 0.3,
          Math.cos(angle) * spread * 0.4,
        ),
        new THREE.Vector3(
          Math.sin(angle) * spread,
          -0.2 - droop,
          Math.cos(angle) * spread,
        ),
      ]);
      arr.push(curve);
    }
    return arr;
  }, []);

  return (
    <group>
      {roots.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 8, 0.02 - i * 0.002, 6, false]} />
          <meshStandardMaterial color="#2a4a3a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─── 3D: ENVIRONMENT ────────────────────────────────────────────────────

function RitualWater() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.PlaneGeometry | null>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || !geoRef.current) return;
    const positions = geoRef.current.attributes.position;
    const t = clock.getElapsedTime();
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      positions.setY(
        i,
        Math.sin(x * 2 + t * 0.5) * 0.02 + Math.cos(z * 1.5 + t * 0.3) * 0.015,
      );
    }
    positions.needsUpdate = true;
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.2, 0]}
    >
      <planeGeometry
        ref={geoRef}
        args={[14, 14, 32, 32]}
      />
      <meshStandardMaterial
        color="#0a2a3a"
        metalness={0.85}
        roughness={0.15}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

function RitualParticles({ count = 40 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const speeds = useMemo(() => {
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      s[i] = 0.002 + Math.random() * 0.005;
    }
    return s;
  }, [count]);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = Math.random() * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i];
      if (arr[i * 3 + 1] > 4) {
        arr[i * 3 + 1] = 0;
        arr[i * 3] = (Math.random() - 0.5) * 6;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#64FFDA"
        size={0.015}
        transparent
        opacity={0.2}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─── 3D: BREATHING TREE ─────────────────────────────────────────────────

function BreathingTree({
  step,
  branches,
}: {
  step: RitualStep;
  branches: RitualBranch[];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [glowingIndex, setGlowingIndex] = useState(-1);
  const rotateStartRef = useRef(0);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    // Breathing scale during the breathe step (~2.5s per cycle)
    if (step === 'breathe') {
      const breathCycle = Math.sin(clock.getElapsedTime() * Math.PI * 0.4) * 0.03;
      groupRef.current.scale.setScalar(1 + breathCycle);
    } else {
      groupRef.current.scale.setScalar(1);
    }
  });

  // Sequential branch glow during rotate step
  useEffect(() => {
    if (step === 'rotate' && branches.length > 0) {
      rotateStartRef.current = Date.now();
      const stepDuration = 8000;
      const perBranch = stepDuration / branches.length;

      const interval = setInterval(() => {
        const elapsed = Date.now() - rotateStartRef.current;
        const idx = Math.floor(elapsed / perBranch);
        if (idx < branches.length) {
          setGlowingIndex(idx);
        } else {
          setGlowingIndex(-1);
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
    setGlowingIndex(-1);
  }, [step, branches.length]);

  const angleStep = (Math.PI * 2) / Math.max(branches.length, 1);

  return (
    <group ref={groupRef}>
      <RitualTrunk />
      <RitualRoots />
      {branches.map((b, i) => (
        <RitualBranch
          key={b.id}
          angle={i * angleStep + Math.PI / 4}
          height={0.5 + (i % 3) * 0.3}
          length={0.5 + (b.percentage / 100) * 0.6}
          color={b.color}
          glowing={i === glowingIndex}
        />
      ))}
    </group>
  );
}

// ─── 3D: SCENE ──────────────────────────────────────────────────────────

function RitualScene({
  step,
  branches,
}: {
  step: RitualStep;
  branches: RitualBranch[];
}) {
  return (
    <>
      <color attach="background" args={['#070B14']} />
      <fogExp2 attach="fog" args={['#070B14', 0.04]} />

      {/* Lighting — subtle, atmospheric */}
      <ambientLight intensity={0.12} color="#4a7a6a" />
      <directionalLight position={[3, 6, 2]} color="#c8e6dc" intensity={0.3} />
      <pointLight position={[0, 4, -3]} intensity={0.25} color="#64ffda" distance={10} />
      <pointLight position={[-3, 0, -2]} intensity={0.15} color="#2a8a7a" distance={8} />

      {/* Moon */}
      <mesh position={[3.5, 4.5, -6]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial color="#e0f0ea" />
        <pointLight color="#d0e8e0" intensity={0.6} distance={15} />
      </mesh>

      {/* Tree */}
      <BreathingTree step={step} branches={branches} />

      {/* Environment */}
      <RitualWater />
      <RitualParticles />

      {/* Camera animation */}
      <RitualCamera step={step} />
    </>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────

export function RitualOverlay({ branches, streak, onComplete, onSkip }: RitualOverlayProps) {
  const [step, setStep] = useState<RitualStep>('invite');
  const [fading, setFading] = useState(false);
  const ambienceRef = useRef<RitualAmbience | null>(null);
  const reducedMotion = useRef(false);

  // Stable refs for callbacks
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onSkipRef = useRef(onSkip);
  onSkipRef.current = onSkip;

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Block body scroll while ritual is active
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const tendInsight = useMemo(() => computeTendInsight(), []);

  // Finalize ritual
  const handleComplete = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      ambienceRef.current?.stop();
      onCompleteRef.current();
    }, 800);
  }, []);

  const handleSkip = useCallback(() => {
    ambienceRef.current?.fadeOut();
    setFading(true);
    setTimeout(() => {
      ambienceRef.current?.stop();
      onSkipRef.current();
    }, 500);
  }, []);

  // Auto-advance through timed steps
  useEffect(() => {
    if (step === 'invite' || step === 'tend' || step === 'done') return;

    const durations: Record<string, number> = {
      open: 3000,
      breathe: 5000,
      rotate: 8000,
      close: 5000,
    };

    const base = durations[step];
    if (!base) return;
    const duration = reducedMotion.current ? Math.round(base * 0.4) : base;

    const next: Record<string, RitualStep> = {
      open: 'breathe',
      breathe: 'rotate',
      rotate: 'tend',
    };

    const timer = setTimeout(() => {
      if (step === 'close') {
        handleComplete();
      } else {
        const nextStep = next[step];
        if (nextStep) setStep(nextStep);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [step, handleComplete]);

  const handleBegin = useCallback(() => {
    setStep('open');
    ambienceRef.current = new RitualAmbience();
    ambienceRef.current.start();
  }, []);

  const handleAcknowledge = useCallback(() => {
    setStep('close');
    ambienceRef.current?.fadeOut();
  }, []);

  const newStreak = streak + 1;

  return (
    <motion.div
      className="fixed inset-0 z-[100]"
      initial={{ opacity: 0 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: fading ? 0.8 : 0.5 }}
      role="dialog"
      aria-label="Daily ritual — take a moment with your tree"
      aria-modal="true"
    >
      {/* 3D Scene — always rendering behind overlays */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [6, 3.5, 8], fov: 38 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'default',
            failIfMajorPerformanceCaveat: false,
          }}
          frameloop="always"
        >
          <RitualScene step={step} branches={branches} />
        </Canvas>
      </div>

      {/* Skip button — always accessible except on invite screen */}
      {step !== 'invite' && step !== 'done' && (
        <motion.button
          className="absolute top-6 right-6 z-10 text-sm tracking-wide transition-colors duration-300"
          style={{ color: '#5D7A70' }}
          onClick={handleSkip}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          aria-label="Skip ritual"
          onMouseEnter={(e) => { (e.currentTarget.style.color = '#A8C5BA'); }}
          onMouseLeave={(e) => { (e.currentTarget.style.color = '#5D7A70'); }}
        >
          Skip
        </motion.button>
      )}

      {/* Step-specific overlays */}
      <AnimatePresence mode="wait">
        {/* ── INVITE ── */}
        {step === 'invite' && (
          <motion.div
            key="invite"
            className="absolute inset-0 flex flex-col items-center justify-center z-10"
            style={{ background: 'rgba(7, 11, 20, 0.85)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.p
              className="text-2xl sm:text-3xl font-light tracking-wide text-center px-8"
              style={{ color: '#E8F4F0' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Take a moment with your tree.
            </motion.p>

            <motion.div
              className="mt-12 flex flex-col items-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <button
                onClick={handleBegin}
                className="px-8 py-3 rounded-xl text-base tracking-wide transition-all duration-300 min-h-[44px]"
                style={{
                  background: 'linear-gradient(135deg, rgba(100, 255, 218, 0.2), rgba(79, 209, 197, 0.1))',
                  border: '1px solid rgba(100, 255, 218, 0.3)',
                  color: '#64FFDA',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 24px rgba(100, 255, 218, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Begin
              </button>

              <button
                onClick={handleSkip}
                className="text-sm transition-colors duration-300 min-h-[44px]"
                style={{ color: '#5D7A70' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#A8C5BA'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#5D7A70'; }}
              >
                Skip for today
              </button>
            </motion.div>

            {streak > 0 && (
              <motion.p
                className="mt-8 text-xs tracking-widest uppercase"
                style={{ color: '#5D7A70' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                {streak} day streak
              </motion.p>
            )}
          </motion.div>
        )}

        {/* ── BREATHE ── */}
        {step === 'breathe' && (
          <motion.div
            key="breathe"
            className="absolute inset-0 flex items-end justify-center pb-24 z-10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <motion.p
              className="text-xl sm:text-2xl font-light tracking-wide"
              style={{ color: '#E8F4F0' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              Breathe with your tree.
            </motion.p>
          </motion.div>
        )}

        {/* ── TEND ── */}
        {step === 'tend' && (
          <motion.div
            key="tend"
            className="absolute inset-0 flex items-center justify-center z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="mx-6 max-w-sm w-full rounded-2xl p-6 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(13, 33, 55, 0.92), rgba(19, 78, 94, 0.75))',
                border: '1px solid rgba(100, 255, 218, 0.15)',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(100, 255, 218, 0.05)',
              }}
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            >
              <span className="text-3xl" role="img" aria-label={tendInsight.title}>
                {tendInsight.icon}
              </span>
              <p className="mt-3 text-lg font-medium" style={{ color: '#E8F4F0' }}>
                {tendInsight.title}
              </p>
              <p className="mt-1 text-sm" style={{ color: '#A8C5BA' }}>
                {tendInsight.detail}
              </p>
              <button
                onClick={handleAcknowledge}
                className="mt-5 px-6 py-2.5 rounded-xl text-sm tracking-wide transition-all duration-300 min-h-[44px]"
                style={{
                  background: 'linear-gradient(135deg, rgba(100, 255, 218, 0.2), rgba(79, 209, 197, 0.1))',
                  border: '1px solid rgba(100, 255, 218, 0.3)',
                  color: '#64FFDA',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(100, 255, 218, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Acknowledge
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── CLOSE ── */}
        {step === 'close' && (
          <motion.div
            key="close"
            className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          >
            <motion.p
              className="text-2xl sm:text-3xl font-light tracking-wide"
              style={{ color: '#E8F4F0' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
            >
              Your tree is growing.
            </motion.p>
            <motion.p
              className="mt-4 text-sm tracking-widest uppercase"
              style={{ color: '#64FFDA' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 1 }}
            >
              Day {newStreak} 🌿
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen reader live region for step announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {step === 'open' && 'Approaching your tree.'}
        {step === 'breathe' && 'Breathe with your tree.'}
        {step === 'rotate' && 'Exploring your branches.'}
        {step === 'tend' && `${tendInsight.title}. ${tendInsight.detail}`}
        {step === 'close' && `Your tree is growing. Day ${newStreak}.`}
      </div>
    </motion.div>
  );
}

export default RitualOverlay;
