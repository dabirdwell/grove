'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Text,
} from '@react-three/drei';
import * as THREE from 'three';

// Types
interface BranchInput {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface Branch extends BranchInput {
  angle: number;
  height: number;
  length: number;
}

interface MoneyTree3DProps {
  branches: BranchInput[];
  totalIncome: number;
  healthScore: number;
  onBranchClick?: (branch: BranchInput) => void;
  autoRotate?: boolean;
  sapFlowActive?: boolean;
  onSapFlowComplete?: () => void;
}

// ─── ORGANIC TRUNK ─────────────────────────────────────────────────────
// Tapered, slightly twisted trunk with bark-like appearance

function OrganicTrunk({ height, healthScore }: { height: number; healthScore: number }) {
  const baseRadius = 0.12 + (healthScore / 100) * 0.06;
  
  const curve = useMemo(() => {
    const points = [
      new THREE.Vector3(0, -0.3, 0),
      new THREE.Vector3(0.03, height * 0.2, 0.02),
      new THREE.Vector3(-0.02, height * 0.45, -0.01),
      new THREE.Vector3(0.02, height * 0.7, 0.01),
      new THREE.Vector3(-0.01, height * 0.9, -0.02),
      new THREE.Vector3(0, height, 0),
    ];
    return new THREE.CatmullRomCurve3(points);
  }, [height]);

  // Stacked tubes for taper effect (thick base → thin top)
  const segments = useMemo(() => {
    const segs = [];
    const count = 5;
    for (let i = 0; i < count; i++) {
      const t0 = i / count;
      const t1 = (i + 1) / count;
      const points = [];
      for (let j = 0; j <= 6; j++) {
        const t = t0 + (j / 6) * (t1 - t0);
        points.push(curve.getPoint(t));
      }
      const segCurve = new THREE.CatmullRomCurve3(points);
      // Taper: wider at base, flared at very bottom
      const baseFlair = i === 0 ? 1.6 : 1;
      const taper = 1 - ((t0 + t1) / 2) * 0.65;
      segs.push({ curve: segCurve, radius: baseRadius * taper * baseFlair });
    }
    return segs;
  }, [curve, baseRadius]);

  return (
    <group>
      {segments.map((seg, i) => (
        <mesh key={i}>
          <tubeGeometry args={[seg.curve, 10, seg.radius, 10, false]} />
          <meshStandardMaterial 
            color="#2a4a3a"
            roughness={0.95}
            metalness={0.0}
          />
        </mesh>
      ))}
    </group>
  );
}


// ─── VISIBLE ROOTS ─────────────────────────────────────────────────────
// Roots spreading from trunk base into the water

function Roots({ healthScore }: { healthScore: number }) {
  const roots = useMemo(() => {
    const rootData = [];
    const count = 5 + Math.floor(healthScore / 20);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const length = 0.4 + Math.random() * 0.6;
      const droop = 0.3 + Math.random() * 0.4;
      
      const points = [];
      const segs = 6;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        points.push(new THREE.Vector3(
          Math.sin(angle) * length * t * (1 + Math.sin(t * 2) * 0.15),
          -0.3 - t * droop,
          Math.cos(angle) * length * t * (1 + Math.cos(t * 3) * 0.1)
        ));
      }
      rootData.push({
        curve: new THREE.CatmullRomCurve3(points),
        thickness: 0.02 + Math.random() * 0.025
      });
    }
    return rootData;
  }, [healthScore]);

  return (
    <group>
      {roots.map((root, i) => (
        <mesh key={i}>
          <tubeGeometry args={[root.curve, 8, root.thickness, 6, false]} />
          <meshStandardMaterial color="#1e3a2c" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// ─── ORGANIC BRANCH ────────────────────────────────────────────────────
// Thick, tapered branches with sub-branches and leaf clusters

function createOrganicBranchCurve(
  startY: number,
  angle: number,
  length: number
): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  const segments = 10;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Branch rises and reaches outward
    const reach = length * t;
    const rise = length * 0.35 * t * (1 - t * 0.3); // Rises then levels
    // Natural wobble
    const wobbleX = Math.sin(t * Math.PI * 2.5 + angle) * 0.05;
    const wobbleZ = Math.cos(t * Math.PI * 1.8 + angle * 2) * 0.04;
    
    points.push(new THREE.Vector3(
      Math.sin(angle) * reach + wobbleX,
      startY + rise,
      Math.cos(angle) * reach + wobbleZ
    ));
  }
  
  return new THREE.CatmullRomCurve3(points);
}


// ─── LEAF CLUSTER ──────────────────────────────────────────────────────
// Clusters of leaves that create the canopy volume

function LeafCluster({ 
  position, 
  color = '#2d6b4a',
  size = 0.3,
  density = 8,
  seed = 0
}: { 
  position: THREE.Vector3;
  color?: string;
  size?: number;
  density?: number;
  seed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  const leaves = useMemo(() => {
    const arr = [];
    const rng = (s: number) => {
      // Simple seeded pseudo-random
      const x = Math.sin(s * 127.1 + seed * 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    
    for (let i = 0; i < density; i++) {
      const leafSize = size * (0.4 + rng(i) * 0.6);
      const offset = new THREE.Vector3(
        (rng(i * 3) - 0.5) * size * 1.5,
        (rng(i * 3 + 1) - 0.5) * size * 0.8,
        (rng(i * 3 + 2) - 0.5) * size * 1.5
      );
      const rotX = rng(i * 7) * Math.PI * 0.5 - 0.2;
      const rotY = rng(i * 11) * Math.PI * 2;
      const rotZ = rng(i * 13) * 0.5 - 0.25;
      
      // Vary green shades
      const shade = rng(i * 17);
      let leafColor;
      if (shade < 0.3) leafColor = '#1a5c38';
      else if (shade < 0.6) leafColor = '#2d6b4a';
      else if (shade < 0.85) leafColor = '#3a7d5c';
      else leafColor = '#4a9b6e'; // Occasional bright new growth
      
      arr.push({ offset, rotX, rotY, rotZ, leafSize, leafColor });
    }
    return arr;
  }, [size, density, seed]);

  useFrame((state) => {
    if (groupRef.current) {
      // Very gentle rustling
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.7 + seed) * 0.015;
      groupRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.5 + seed * 2) * 0.01;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {leaves.map((leaf, i) => (
        <mesh 
          key={i} 
          position={[leaf.offset.x, leaf.offset.y, leaf.offset.z]}
          rotation={[leaf.rotX, leaf.rotY, leaf.rotZ]}
        >
          {/* Ellipsoid leaf shape */}
          <sphereGeometry args={[leaf.leafSize, 6, 4]} />
          <meshStandardMaterial
            color={leaf.leafColor}
            roughness={0.7}
            metalness={0.05}
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* Soft volume glow for canopy depth */}
      <mesh>
        <sphereGeometry args={[size * 0.9, 8, 8]} />
        <meshStandardMaterial 
          color={color}
          transparent 
          opacity={0.15}
          roughness={1}
        />
      </mesh>
    </group>
  );
}


// ─── GLOWING FRUIT ─────────────────────────────────────────────────────
// Budget orbs as bioluminescent fruit hanging from branches

function GlowingFruit({
  position,
  color,
  size = 0.08,
  amount,
  name,
  onClick,
  isPulsing = false
}: {
  position: THREE.Vector3;
  color: string;
  size?: number;
  amount: number;
  name: string;
  onClick?: () => void;
  isPulsing?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);
  const pulseStartRef = useRef(0);
  const [localPulsing, setLocalPulsing] = useState(false);

  useEffect(() => {
    if (isPulsing && !localPulsing) {
      setLocalPulsing(true);
      pulseStartRef.current = 0;
    }
  }, [isPulsing, localPulsing]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Gentle hanging sway
    meshRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime * 1.2 + position.x * 5) * 0.01;
    
    let scale = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    
    if (localPulsing) {
      if (pulseStartRef.current === 0) pulseStartRef.current = state.clock.elapsedTime;
      const elapsed = state.clock.elapsedTime - pulseStartRef.current;
      if (elapsed < 0.6) {
        scale = 1 + Math.sin(elapsed * Math.PI * 5) * 0.5;
        if (lightRef.current) lightRef.current.intensity = 3 + Math.sin(elapsed * Math.PI * 5) * 2;
      } else {
        setLocalPulsing(false);
        pulseStartRef.current = 0;
        if (lightRef.current) lightRef.current.intensity = hovered ? 1.5 : 0.8;
      }
    }
    
    meshRef.current.scale.setScalar(hovered ? scale * 1.2 : scale);
  });

  return (
    <group position={position}>
      <pointLight ref={lightRef} color={color} intensity={localPulsing ? 3 : 0.8} distance={2} />
      
      {/* Inner core - bright */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={localPulsing ? 2 : hovered ? 1.2 : 0.6}
          transparent
          opacity={0.95}
        />
      </mesh>
      
      {/* Outer glow */}
      <mesh scale={1.8}>
        <sphereGeometry args={[size, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={localPulsing ? 0.3 : 0.12} />
      </mesh>
      
      {/* Stem connecting fruit to branch */}
      <mesh position={[0, size + 0.02, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.04, 4]} />
        <meshStandardMaterial color="#2a4a3a" />
      </mesh>

      {hovered && (
        <Text
          position={[0, size + 0.25, 0]}
          fontSize={0.1}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {name}: ${amount.toLocaleString()}
        </Text>
      )}
    </group>
  );
}


// ─── ANIMATED BRANCH WITH SUB-BRANCHES & LEAVES ────────────────────────

function OrganicBranch({
  branch,
  trunkHeight,
  isNew = false,
  onClick,
  isPulsing = false
}: {
  branch: Branch;
  trunkHeight: number;
  isNew?: boolean;
  onClick?: () => void;
  isPulsing?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [growthProgress, setGrowthProgress] = useState(isNew ? 0 : 1);
  const [visible, setVisible] = useState(!isNew);

  const startY = branch.height * trunkHeight;
  
  const mainCurve = useMemo(() => 
    createOrganicBranchCurve(startY, branch.angle, branch.length),
    [startY, branch.angle, branch.length]
  );
  
  const endPoint = useMemo(() => mainCurve.getPoint(1), [mainCurve]);
  const midPoint = useMemo(() => mainCurve.getPoint(0.55), [mainCurve]);
  
  // Sub-branches for organic complexity
  const subBranches = useMemo(() => {
    const subs = [];
    const subCount = 2 + Math.floor(branch.percentage / 25);
    for (let i = 0; i < Math.min(subCount, 4); i++) {
      const t = 0.4 + (i / subCount) * 0.5;
      const base = mainCurve.getPoint(t);
      const subAngle = branch.angle + (i - subCount / 2) * 0.6;
      const subLen = branch.length * (0.25 + Math.random() * 0.2);
      const subPoints = [];
      for (let s = 0; s <= 5; s++) {
        const st = s / 5;
        subPoints.push(new THREE.Vector3(
          base.x + Math.sin(subAngle) * subLen * st,
          base.y + subLen * 0.2 * st * (1 - st * 0.5),
          base.z + Math.cos(subAngle) * subLen * st
        ));
      }
      subs.push({
        curve: new THREE.CatmullRomCurve3(subPoints),
        endPoint: subPoints[subPoints.length - 1],
        thickness: 0.015 + Math.random() * 0.01
      });
    }
    return subs;
  }, [mainCurve, branch.angle, branch.length, branch.percentage]);

  // Grow animation
  useEffect(() => {
    if (isNew) {
      setVisible(true);
      const interval = setInterval(() => {
        setGrowthProgress(prev => {
          if (prev >= 1) { clearInterval(interval); return 1; }
          return prev + 0.04;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [isNew]);

  useFrame((state) => {
    if (groupRef.current) {
      // Natural sway
      const sway = Math.sin(state.clock.elapsedTime * 0.4 + branch.angle * 2) * 0.012;
      groupRef.current.rotation.z = sway;
      groupRef.current.rotation.x = sway * 0.5;
    }
  });

  // Branch thickness tapers from base
  const branchThickness = 0.03 + (branch.percentage / 100) * 0.02;
  
  // Fruit size scales with percentage
  const fruitSize = 0.06 + (branch.percentage / 100) * 0.1;

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      {/* Main branch */}
      <mesh>
        <tubeGeometry args={[mainCurve, 16, branchThickness, 8, false]} />
        <meshStandardMaterial color="#2a4a3a" roughness={0.9} />
      </mesh>
      
      {/* Sub-branches */}
      {growthProgress > 0.5 && subBranches.map((sub, i) => (
        <group key={i}>
          <mesh>
            <tubeGeometry args={[sub.curve, 8, sub.thickness, 6, false]} />
            <meshStandardMaterial color="#2d5240" roughness={0.9} />
          </mesh>
          {/* Leaf cluster at sub-branch end */}
          {growthProgress > 0.7 && (
            <LeafCluster 
              position={new THREE.Vector3(sub.endPoint.x, sub.endPoint.y, sub.endPoint.z)}
              size={0.15 + (branch.percentage / 100) * 0.1}
              density={5}
              seed={i + branch.angle * 100}
            />
          )}
        </group>
      ))}
      
      {/* Main leaf cluster at branch tip */}
      {growthProgress > 0.6 && (
        <LeafCluster 
          position={endPoint}
          size={0.25 + (branch.percentage / 100) * 0.15}
          density={10 + Math.floor(branch.percentage / 10)}
          seed={branch.angle * 50}
        />
      )}
      
      {/* Secondary leaf cluster at mid-branch */}
      {growthProgress > 0.7 && (
        <LeafCluster 
          position={midPoint}
          size={0.15 + (branch.percentage / 100) * 0.08}
          density={6}
          seed={branch.angle * 30 + 1}
        />
      )}
      
      {/* Glowing fruit near branch tip */}
      {growthProgress > 0.8 && (
        <GlowingFruit
          position={new THREE.Vector3(
            endPoint.x + Math.sin(branch.angle + 0.3) * 0.08,
            endPoint.y - 0.08,
            endPoint.z + Math.cos(branch.angle + 0.3) * 0.08
          )}
          color={branch.color}
          size={fruitSize}
          amount={branch.amount}
          name={branch.name}
          onClick={onClick}
          isPulsing={isPulsing}
        />
      )}
    </group>
  );
}


// ─── LAGOON WATER ──────────────────────────────────────────────────────
// Reflective water plane with subtle animation

function LagoonWater() {
  const meshRef = useRef<THREE.Mesh>(null);
  const originalPositions = useRef<Float32Array | null>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    const positions = meshRef.current.geometry.attributes.position;

    // Store original positions on first frame
    if (!originalPositions.current) {
      originalPositions.current = new Float32Array(positions.array as Float32Array);
    }

    const t = state.clock.elapsedTime * 0.3;
    const orig = originalPositions.current;
    const arr = positions.array as Float32Array;

    // Vertex displacement for gentle waves
    // PlaneGeometry lies in XY, rotated -PI/2 around X → local Z becomes world Y
    for (let i = 0; i < positions.count; i++) {
      const x = orig[i * 3];
      const y = orig[i * 3 + 1];
      arr[i * 3 + 2] = Math.sin(x * 1.5 + t) * Math.cos(y * 1.5 + t * 0.7) * 0.05
        + Math.sin(x * 3 + t * 1.3) * 0.02;
    }

    positions.needsUpdate = true;
  });

  return (
    <group>
      {/* Main water surface with wave displacement */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[12, 12, 32, 32]} />
        <meshStandardMaterial
          color="#0D2137"
          metalness={0.85}
          roughness={0.15}
          transparent
          opacity={0.85}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* Surface highlights — subtle teal shimmer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.34, 0]}>
        <circleGeometry args={[4, 48]} />
        <meshStandardMaterial
          color="#134E5E"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.12}
        />
      </mesh>

      {/* Deeper water layer for depth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <circleGeometry args={[6, 32]} />
        <meshStandardMaterial color="#061520" roughness={1} />
      </mesh>
    </group>
  );
}

// ─── BIOLUMINESCENT WATER PARTICLES ────────────────────────────────────

function WaterGlow() {
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 15; i++) {
      arr.push({
        pos: [
          (Math.random() - 0.5) * 5,
          -0.3 - Math.random() * 0.2,
          (Math.random() - 0.5) * 5
        ] as [number, number, number],
        speed: 0.05 + Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
        drift: Math.random() * 0.1
      });
    }
    return arr;
  }, []);

  return (
    <>
      {particles.map((p, i) => (
        <WaterGlowParticle key={i} {...p} />
      ))}
    </>
  );
}

function WaterGlowParticle({ pos, speed, phase, drift }: {
  pos: [number, number, number];
  speed: number;
  phase: number;
  drift: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime * speed + phase;
      ref.current.position.x = pos[0] + Math.sin(t) * drift;
      ref.current.position.z = pos[2] + Math.cos(t * 1.3) * drift;
      const opacity = 0.15 + Math.sin(t * 1.5) * 0.2;
      (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0.05, opacity);
    }
  });

  return (
    <mesh ref={ref} position={pos}>
      <sphereGeometry args={[0.012, 6, 6]} />
      <meshBasicMaterial color="#4adfb5" transparent opacity={0.2} />
    </mesh>
  );
}

// ─── HANGING MOSS / VINES ──────────────────────────────────────────────
// Organic detail hanging from branches for grotto atmosphere

function HangingMoss({ position, length = 0.3 }: { position: THREE.Vector3; length?: number }) {
  const ref = useRef<THREE.Group>(null);
  
  const strands = useMemo(() => {
    const arr = [];
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const points = [];
      const segs = 5;
      const offsetX = (Math.random() - 0.5) * 0.06;
      const offsetZ = (Math.random() - 0.5) * 0.06;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        points.push(new THREE.Vector3(
          offsetX + Math.sin(t * 2 + i) * 0.02,
          -t * length * (0.6 + Math.random() * 0.4),
          offsetZ + Math.cos(t * 3 + i) * 0.015
        ));
      }
      arr.push(new THREE.CatmullRomCurve3(points));
    }
    return arr;
  }, [length]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.6 + position.x * 3) * 0.02;
    }
  });

  return (
    <group ref={ref} position={position}>
      {strands.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 6, 0.004, 4, false]} />
          <meshStandardMaterial color="#1a4a32" roughness={0.9} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}


// ─── CANOPY CROWN ──────────────────────────────────────────────────────
// Additional leaf mass at top of tree for full, lush canopy

function CanopyCrown({ height, healthScore }: { height: number; healthScore: number }) {
  const clusters = useMemo(() => {
    const arr = [];
    const count = 3 + Math.floor(healthScore / 20);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 0.15 + Math.random() * 0.2;
      arr.push({
        position: new THREE.Vector3(
          Math.sin(angle) * r,
          height - 0.1 + Math.random() * 0.2,
          Math.cos(angle) * r
        ),
        size: 0.2 + (healthScore / 100) * 0.15,
        density: 6 + Math.floor(healthScore / 15),
        seed: i * 42
      });
    }
    return arr;
  }, [height, healthScore]);

  return (
    <group>
      {clusters.map((c, i) => (
        <LeafCluster key={i} {...c} />
      ))}
    </group>
  );
}

// ─── GROTTO ROCKS ──────────────────────────────────────────────────────
// Subtle rock formations around the base for grotto atmosphere

function GrottoRocks() {
  const rocks = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.4;
      const dist = 1.5 + Math.random() * 1.5;
      arr.push({
        position: [
          Math.sin(angle) * dist,
          -0.4 + Math.random() * 0.1,
          Math.cos(angle) * dist
        ] as [number, number, number],
        scale: [
          0.15 + Math.random() * 0.2,
          0.1 + Math.random() * 0.15,
          0.15 + Math.random() * 0.2
        ] as [number, number, number],
        rotation: Math.random() * Math.PI * 2
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {rocks.map((rock, i) => (
        <mesh key={i} position={rock.position} rotation={[0, rock.rotation, 0]} scale={rock.scale}>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color="#1a2e2a" roughness={0.95} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}


// ─── AMBIENT PARTICLES ────────────────────────────────────────────────
// Very faint particle dust floating upward — underwater bubbles / pollen

function AmbientParticles({ count = 80 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const speeds = useMemo(() => {
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      s[i] = 0.003 + Math.random() * 0.007;
    }
    return s;
  }, [count]);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = Math.random() * 5 - 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
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
      // Slow upward drift
      arr[i * 3 + 1] += speeds[i];

      // Wrap around when above scene
      if (arr[i * 3 + 1] > 5) {
        arr[i * 3 + 1] = -0.5;
        arr[i * 3] = (Math.random() - 0.5) * 8;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#64FFDA"
        size={0.012}
        transparent
        opacity={0.15}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─── FIREFLY IMPORT ────────────────────────────────────────────────────
import { FireflySwarm } from './lazy-firefly';

// ─── SAP FLOW IMPORT ───────────────────────────────────────────────────
import SapFlow from './sap-flow';

// ─── SCENE PROPS ───────────────────────────────────────────────────────
interface MoneyTreeSceneProps {
  branches: Branch[];
  healthScore: number;
  onBranchClick?: (branch: BranchInput) => void;
  autoRotate?: boolean;
  sapFlowActive?: boolean;
  onSapFlowComplete?: () => void;
}

// ─── MAIN SCENE ────────────────────────────────────────────────────────

function MoneyTreeScene({
  branches,
  healthScore,
  onBranchClick,
  autoRotate = false,
  sapFlowActive = false,
  onSapFlowComplete
}: MoneyTreeSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [pulsingBranches, setPulsingBranches] = useState<Set<string>>(new Set());

  const treeHeight = 1.0 + (healthScore / 100) * 1.5;

  const handleNodePulse = (branchId: string) => {
    setPulsingBranches(prev => new Set([...prev, branchId]));
    setTimeout(() => {
      setPulsingBranches(prev => {
        const next = new Set(prev);
        next.delete(branchId);
        return next;
      });
    }, 600);
  };

  const branchTargets = useMemo(() =>
    branches.map(b => ({
      id: b.id,
      percentage: b.percentage,
      height: b.height,
      angle: b.angle,
      length: b.length,
      color: b.color
    })),
    [branches]
  );

  // Places to hang moss - derived from branch midpoints
  const mossPositions = useMemo(() => {
    return branches.slice(0, 3).map(b => {
      const startY = b.height * treeHeight;
      const curve = createOrganicBranchCurve(startY, b.angle, b.length);
      return curve.getPoint(0.6);
    });
  }, [branches, treeHeight]);

  return (
    <>
      {/* Ambient grotto lighting */}
      <ambientLight intensity={0.15} color="#4a7a6a" />
      
      {/* Key light - warm moonlight from above-right */}
      <directionalLight 
        position={[3, 6, 2]} 
        intensity={0.4} 
        color="#c8e6dc"
        castShadow={false}
      />
      
      {/* Fill light - cool from below-left */}
      <pointLight position={[-3, 0, -2]} intensity={0.2} color="#2a8a7a" distance={8} />
      
      {/* Rim light for tree silhouette */}
      <pointLight position={[0, 4, -3]} intensity={0.3} color="#64ffda" distance={10} />

      {/* Moon */}
      <mesh position={[3.5, 4.5, -6]}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial color="#e0f0ea" />
        <pointLight color="#d0e8e0" intensity={0.8} distance={15} />
      </mesh>

      {/* Sap Flow Animation */}
      <SapFlow
        active={sapFlowActive}
        trunkHeight={treeHeight}
        branches={branchTargets}
        onNodePulse={handleNodePulse}
        onComplete={onSapFlowComplete}
      />

      {/* Tree */}
      <group ref={groupRef}>
        <OrganicTrunk height={treeHeight} healthScore={healthScore} />
        <Roots healthScore={healthScore} />
        <CanopyCrown height={treeHeight} healthScore={healthScore} />

        {branches.map((branch) => (
          <OrganicBranch
            key={branch.id}
            branch={branch}
            trunkHeight={treeHeight}
            onClick={() => onBranchClick?.(branch)}
            isPulsing={pulsingBranches.has(branch.id)}
          />
        ))}
        
        {/* Hanging moss from branches */}
        {mossPositions.map((pos, i) => (
          <HangingMoss key={i} position={pos} length={0.2 + Math.random() * 0.15} />
        ))}
      </group>

      {/* Environment */}
      <LagoonWater />
      <WaterGlow />
      <GrottoRocks />
      
      {/* Fireflies */}
      <FireflySwarm
        count={30}
        center={[0, 1.5, 0]}
        spread={{ x: 3, y: 2.5, z: 3 }}
        bounds={{ x: 2.5, y: 1.5, z: 2.5 }}
      />
      
      {/* Ambient particles — faint upward-drifting dust */}
      <AmbientParticles count={80} />
      
      {/* Controls */}
      <OrbitControls
        target={[0, 1, 0]}
        enablePan={false}
        minDistance={3}
        maxDistance={9}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate={autoRotate}
        autoRotateSpeed={0.3}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}


// ─── WRAPPER COMPONENT ─────────────────────────────────────────────────

export function MoneyTree3D({
  branches,
  totalIncome,
  healthScore,
  onBranchClick,
  autoRotate = true,
  sapFlowActive = false,
  onSapFlowComplete
}: MoneyTree3DProps) {
  const treeBranches: Branch[] = useMemo(() => {
    if (!branches || branches.length === 0) return [];
    const angleStep = (Math.PI * 2) / Math.max(branches.length, 1);
    return branches.map((b, i): Branch => ({
      ...b,
      angle: i * angleStep + Math.PI / 4,
      height: 0.3 + (i % 3) * 0.22,
      length: 0.6 + (b.percentage / 100) * 0.7
    }));
  }, [branches]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden" style={{ background: 'linear-gradient(to bottom, #0A1628, #0D2137, #070B14)' }}>
      <Canvas
        camera={{ position: [3.5, 2.5, 5], fov: 38 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={(state) => {
          const canvas = state.gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('WebGL context lost - will attempt restore');
          });
          canvas.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
          });
        }}
        frameloop="always"
      >
        <color attach="background" args={['#0A1628']} />
        <fogExp2 attach="fog" args={['#0A1628', 0.03]} />

        <MoneyTreeScene
          branches={treeBranches}
          healthScore={healthScore}
          onBranchClick={onBranchClick}
          autoRotate={autoRotate}
          sapFlowActive={sapFlowActive}
          onSapFlowComplete={onSapFlowComplete}
        />
      </Canvas>
    </div>
  );
}

export default MoneyTree3D;
