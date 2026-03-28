'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Sap Flow Animation System
 *
 * Creates luminous particles that flow from trunk base up through branches.
 * Particles split proportionally at branch junctions based on allocation percentages.
 *
 * Animation timeline (~2.5s total):
 * - 0.0-0.3s: Shimmer at trunk base
 * - 0.3-1.3s: Sap rises through trunk
 * - 1.3-1.8s: Sap splits into branches
 * - 1.8-2.3s: Nodes pulse as sap arrives
 * - 2.3-2.5s: Tree settles into healthy glow
 * 
 * PERFORMANCE: Uses refs for all animation state - no React re-renders during animation.
 */

interface BranchTarget {
  id: string;
  percentage: number;
  height: number;
  angle: number;
  length: number;
  color: string;
}

interface SapFlowProps {
  active: boolean;
  trunkHeight: number;
  branches: BranchTarget[];
  onNodePulse?: (branchId: string) => void;
  onComplete?: () => void;
}

interface SapParticle {
  id: number;
  position: THREE.Vector3;
  targetBranchId: string | null;
  progress: number;
  size: number;
  opacity: number;
  color: THREE.Color;
  phase: 'trunk' | 'branch' | 'arrived';
  branchProgress: number;
  pulsed: boolean; // Track if we've already triggered pulse for this particle
}

type AnimationPhase = 'idle' | 'shimmer' | 'rising' | 'splitting' | 'arriving' | 'settling';

const SAP_COLOR = new THREE.Color('#64ffda');
const PARTICLE_COUNT = 40;

export function SapFlow({
  active,
  trunkHeight,
  branches,
  onNodePulse,
  onComplete
}: SapFlowProps) {
  // All animation state in refs - no useState for animation
  const particlesRef = useRef<SapParticle[]>([]);
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const phaseRef = useRef<AnimationPhase>('idle');
  const startTimeRef = useRef<number>(0);
  const completedRef = useRef(false);
  const initializedRef = useRef(false);
  const shimmerLightRef = useRef<THREE.PointLight>(null);

  // Pre-compute trunk curve
  const trunkCurve = useMemo(() => {
    const points = [
      new THREE.Vector3(0, -0.5, 0),
      new THREE.Vector3(0.02, trunkHeight * 0.3, 0.01),
      new THREE.Vector3(-0.01, trunkHeight * 0.6, -0.01),
      new THREE.Vector3(0.01, trunkHeight * 0.9, 0.02),
      new THREE.Vector3(0, trunkHeight, 0),
    ];
    return new THREE.CatmullRomCurve3(points);
  }, [trunkHeight]);

  // Pre-compute branch curves
  const branchCurves = useMemo(() => {
    const curves: Map<string, THREE.CatmullRomCurve3> = new Map();
    branches.forEach(branch => {
      const startY = branch.height * trunkHeight;
      const startPoint = new THREE.Vector3(0, startY, 0);
      const points: THREE.Vector3[] = [startPoint];
      const segments = 6;

      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const x = Math.sin(branch.angle) * branch.length * t + Math.sin(t * Math.PI * 0.3) * 0.15;
        const y = startY + t * branch.length * 0.5 + Math.sin(t * Math.PI) * 0.2;
        const z = Math.cos(branch.angle) * branch.length * t + Math.cos(t * Math.PI * 0.3) * 0.15;
        points.push(new THREE.Vector3(x, y, z));
      }
      curves.set(branch.id, new THREE.CatmullRomCurve3(points));
    });
    return curves;
  }, [branches, trunkHeight]);

  // Initialize/reset when active changes
  useEffect(() => {
    if (active && phaseRef.current === 'idle') {
      completedRef.current = false;
      startTimeRef.current = 0;
      initializedRef.current = false;
      phaseRef.current = 'shimmer';

      // Create particles
      const particles: SapParticle[] = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          id: i,
          position: new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            -0.5 + Math.random() * 0.1,
            (Math.random() - 0.5) * 0.1
          ),
          targetBranchId: null,
          progress: 0,
          size: 0.02 + Math.random() * 0.02,
          opacity: 0.8 + Math.random() * 0.2,
          color: SAP_COLOR.clone(),
          phase: 'trunk',
          branchProgress: 0,
          pulsed: false
        });
      }
      particlesRef.current = particles;
      initializedRef.current = true;
    }

    if (!active && phaseRef.current !== 'idle') {
      phaseRef.current = 'idle';
      particlesRef.current = [];
      initializedRef.current = false;
    }
  }, [active]);

  // Assign particles to branches based on percentage
  const assignParticlesToBranches = () => {
    const particles = particlesRef.current;
    if (particles.length === 0 || branches.length === 0) return;
    
    const totalPercentage = branches.reduce((sum, b) => sum + b.percentage, 0);
    if (totalPercentage === 0) return;

    let particleIndex = 0;
    branches.forEach(branch => {
      const branchParticleCount = Math.floor((branch.percentage / totalPercentage) * particles.length);
      for (let i = 0; i < branchParticleCount && particleIndex < particles.length; i++) {
        particles[particleIndex].targetBranchId = branch.id;
        particles[particleIndex].color = new THREE.Color(branch.color);
        particleIndex++;
      }
    });

    // Assign remaining to random branches
    while (particleIndex < particles.length) {
      const randomBranch = branches[Math.floor(Math.random() * branches.length)];
      particles[particleIndex].targetBranchId = randomBranch.id;
      particles[particleIndex].color = new THREE.Color(randomBranch.color);
      particleIndex++;
    }
  };

  useFrame((state) => {
    const phase = phaseRef.current;
    if (phase === 'idle' || !initializedRef.current) return;

    if (startTimeRef.current === 0) {
      startTimeRef.current = state.clock.elapsedTime;
    }

    const elapsed = state.clock.elapsedTime - startTimeRef.current;
    const particles = particlesRef.current;

    // Phase transitions - using refs, not setState
    if (elapsed < 0.3) {
      phaseRef.current = 'shimmer';
    } else if (elapsed < 1.3) {
      phaseRef.current = 'rising';
    } else if (elapsed < 1.8) {
      if (phaseRef.current !== 'splitting') {
        phaseRef.current = 'splitting';
        assignParticlesToBranches();
      }
    } else if (elapsed < 2.3) {
      phaseRef.current = 'arriving';
    } else if (elapsed < 2.5) {
      phaseRef.current = 'settling';
    } else if (!completedRef.current) {
      completedRef.current = true;
      phaseRef.current = 'idle';
      particlesRef.current = [];
      initializedRef.current = false;
      onComplete?.();
      return;
    }

    const currentPhase = phaseRef.current;

    // Update shimmer light
    if (shimmerLightRef.current) {
      shimmerLightRef.current.intensity = currentPhase === 'shimmer' ? 2 : 0;
    }

    // Update particles
    particles.forEach((particle, index) => {
      switch (currentPhase) {
        case 'shimmer':
          particle.position.x += (Math.random() - 0.5) * 0.01;
          particle.position.z += (Math.random() - 0.5) * 0.01;
          particle.opacity = 0.5 + Math.sin(elapsed * 10 + index) * 0.3;
          break;

        case 'rising':
          particle.progress = Math.min(1, (elapsed - 0.3) / 1.0);
          const trunkPoint = trunkCurve.getPoint(particle.progress * 0.9);
          const variance = Math.sin(elapsed * 5 + index * 0.5) * 0.02;
          particle.position.x = trunkPoint.x + variance;
          particle.position.y = trunkPoint.y;
          particle.position.z = trunkPoint.z + variance;
          particle.opacity = 0.8 + Math.sin(elapsed * 8 + index) * 0.2;
          break;

        case 'splitting':
          if (particle.targetBranchId && particle.phase === 'trunk') {
            particle.phase = 'branch';
            particle.branchProgress = 0;
          }
          if (particle.phase === 'branch' && particle.targetBranchId) {
            const branchCurve = branchCurves.get(particle.targetBranchId);
            if (branchCurve) {
              particle.branchProgress = Math.min(1, (elapsed - 1.3) / 0.5);
              const branchPoint = branchCurve.getPoint(particle.branchProgress * 0.7);
              particle.position.copy(branchPoint);
            }
          }
          break;

        case 'arriving':
          if (particle.phase === 'branch' && particle.targetBranchId) {
            const branchCurve = branchCurves.get(particle.targetBranchId);
            if (branchCurve) {
              particle.branchProgress = Math.min(1, 0.7 + (elapsed - 1.8) / 0.5 * 0.3);
              const branchPoint = branchCurve.getPoint(particle.branchProgress);
              particle.position.copy(branchPoint);

              if (particle.branchProgress >= 0.95 && !particle.pulsed) {
                particle.pulsed = true;
                particle.phase = 'arrived';
                onNodePulse?.(particle.targetBranchId);
              }
            }
          }
          particle.opacity = 0.9;
          break;

        case 'settling':
          particle.opacity = Math.max(0, 1 - (elapsed - 2.3) / 0.2);
          break;
      }

      // Update mesh
      const mesh = meshRefs.current[index];
      if (mesh) {
        mesh.position.copy(particle.position);
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = particle.opacity;
        material.color = particle.color;
        const scale = particle.size * (1 + Math.sin(elapsed * 10 + index) * 0.2);
        mesh.scale.setScalar(scale * 50);
      }
    });
  });

  // Don't render anything if idle
  if (phaseRef.current === 'idle' && particlesRef.current.length === 0) {
    return null;
  }

  return (
    <group>
      {particlesRef.current.map((particle, index) => (
        <mesh
          key={particle.id}
          ref={(el) => { if (el) meshRefs.current[index] = el; }}
          position={particle.position}
        >
          <sphereGeometry args={[particle.size, 8, 8]} />
          <meshBasicMaterial
            color={particle.color}
            transparent
            opacity={particle.opacity}
          />
        </mesh>
      ))}
      
      {/* Base shimmer light */}
      <pointLight
        ref={shimmerLightRef}
        position={[0, -0.4, 0]}
        color="#64ffda"
        intensity={0}
        distance={1}
      />
    </group>
  );
}

export default SapFlow;
