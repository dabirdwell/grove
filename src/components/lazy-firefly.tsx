'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * A lazy firefly that drifts organically and flashes like real fireflies do.
 * 
 * Real firefly behavior:
 * - Drift lazily, almost aimlessly (random walk, not circular)
 * - Flash pattern: quick bright pulse, slow fade (mating signal)
 * - Sometimes pause mid-air
 * - Each firefly is independent, not synchronized
 * 
 * PERFORMANCE: Uses emissive material only, no individual pointLights.
 */

interface LazyFireflyProps {
  initialPosition: [number, number, number];
  bounds?: { x: number; y: number; z: number };
}

export function LazyFirefly({ 
  initialPosition,
  bounds = { x: 2, y: 1.5, z: 2 }
}: LazyFireflyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Velocity for random walk - persists between frames
  const velocityRef = useRef(new THREE.Vector3(
    (Math.random() - 0.5) * 0.01,
    (Math.random() - 0.5) * 0.005,
    (Math.random() - 0.5) * 0.01
  ));
  
  // Each firefly gets unique characteristics
  const characteristics = useMemo(() => ({
    // Slow pulse: 2-4 second cycle
    pulseSpeed: 1.5 + Math.random() * 1.5,
    // Random phase offset
    pulsePhase: Math.random() * Math.PI * 2,
    // How strongly it responds to random impulses
    jitter: 0.0005 + Math.random() * 0.0005,
    // Damping factor (lower = more momentum, higher = more responsive)
    damping: 0.98 + Math.random() * 0.015,
    // Max speed
    maxSpeed: 0.015 + Math.random() * 0.01,
  }), []);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const t = state.clock.elapsedTime;
    const { jitter, damping, maxSpeed } = characteristics;
    const velocity = velocityRef.current;
    const position = meshRef.current.position;
    
    // Random walk: add small random impulse each frame
    velocity.x += (Math.random() - 0.5) * jitter;
    velocity.y += (Math.random() - 0.5) * jitter * 0.5; // Less vertical movement
    velocity.z += (Math.random() - 0.5) * jitter;
    
    // Apply damping (gradual slowdown)
    velocity.multiplyScalar(damping);
    
    // Clamp speed
    const speed = velocity.length();
    if (speed > maxSpeed) {
      velocity.multiplyScalar(maxSpeed / speed);
    }
    
    // Update position
    position.add(velocity);
    
    // Soft boundary enforcement - push back toward center when near edges
    const centerX = initialPosition[0];
    const centerY = initialPosition[1];
    const centerZ = initialPosition[2];
    
    const pullStrength = 0.001;
    
    if (Math.abs(position.x - centerX) > bounds.x) {
      velocity.x -= Math.sign(position.x - centerX) * pullStrength;
    }
    if (Math.abs(position.y - centerY) > bounds.y) {
      velocity.y -= Math.sign(position.y - centerY) * pullStrength;
    }
    if (Math.abs(position.z - centerZ) > bounds.z) {
      velocity.z -= Math.sign(position.z - centerZ) * pullStrength;
    }
    
    // Slow sine pulsing: opacity 0.3 to 0.8 over 2-4 seconds
    const { pulseSpeed, pulsePhase } = characteristics;
    const pulse = (Math.sin(t * pulseSpeed + pulsePhase) + 1) / 2;
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 0.5 + pulse * 1.5;
    material.opacity = 0.3 + pulse * 0.5;
  });

  return (
    <mesh ref={meshRef} position={initialPosition}>
      <sphereGeometry args={[0.02, 6, 6]} />
      <meshStandardMaterial
        color="#64FFDA"
        emissive="#64FFDA"
        emissiveIntensity={0.1}
        transparent
        opacity={0.4}
      />
    </mesh>
  );
}

/**
 * A group of lazy fireflies scattered around a point
 */
interface FireflySwarmProps {
  count?: number;
  center?: [number, number, number];
  spread?: { x: number; y: number; z: number };
  bounds?: { x: number; y: number; z: number };
}

export function FireflySwarm({
  count = 12,
  center = [0, 1.5, 0],
  spread = { x: 3, y: 1.5, z: 3 },
  bounds = { x: 1.5, y: 0.8, z: 1.5 }
}: FireflySwarmProps) {
  // Random positions for swarm
  const fireflies = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      arr.push([
        center[0] + (Math.random() - 0.5) * spread.x * 2,
        center[1] + (Math.random() - 0.5) * spread.y * 2,
        center[2] + (Math.random() - 0.5) * spread.z * 2,
      ]);
    }
    return arr;
  }, [count, center, spread]);

  return (
    <>
      {fireflies.map((pos, i) => (
        <LazyFirefly 
          key={i} 
          initialPosition={pos}
          bounds={bounds}
        />
      ))}
    </>
  );
}

export default LazyFirefly;
