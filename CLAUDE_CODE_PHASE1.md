# Grove 3D: Phase 1 Build Instructions
## For Claude Code

---

## Context

You're building a 3D money tree visualization for a financial wellness app called Grove. This isn't a chart with a tree skin-it's a living organism that IS the user's finances.

**Read these files for full context:**
- `/Users/david/Documents/Claude_Vault/Art_by_Claude/grove_creative_vision.md` - The soul
- `/Users/david/Documents/Fawkes/Products and Services/Financial Orchestrator/flow/GROVE_3D_DEVELOPMENT_PLAN.md` - The plan
- `/Users/david/Documents/Fawkes/Products and Services/Financial Orchestrator/flow/DESIGN_VISION_MIDNIGHT_LAGOON.md` - The palette

---

## Phase 1 Objective

Get a 3D tree on screen that users can rotate. Dark, atmospheric, alive.

**Success looks like:**
- Canvas renders in place of the current Sankey diagram
- User can orbit/rotate the view with mouse drag
- Dark gradient background (#0a1628 → #134e5e)
- A trunk with 2-3 placeholder branches
- Soft lighting that suggests bioluminescence
- It feels like midnight at a lagoon, not a 3D demo

---

## Step 1: Install Dependencies

```bash
cd '/Users/david/Documents/Fawkes/Products and Services/Financial Orchestrator/flow'
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing gsap leva
npm install -D @types/three
```

---

## Step 2: Create the Tree Component

Create `src/components/tree/MoneyTree.tsx`:

```tsx
'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Float } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Suspense } from 'react'

// Placeholder trunk
function Trunk() {
  return (
    <mesh position={[0, 1, 0]}>
      <cylinderGeometry args={[0.15, 0.3, 2.5, 12]} />
      <meshStandardMaterial 
        color="#3d6b5a" 
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
}

// Placeholder branch
function Branch({ 
  position, 
  rotation, 
  length = 1 
}: { 
  position: [number, number, number]
  rotation: [number, number, number]
  length?: number 
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Branch */}
      <mesh position={[length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.08, length, 8]} />
        <meshStandardMaterial color="#3d6b5a" roughness={0.8} />
      </mesh>
      
      {/* Glowing leaf node */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh position={[length, 0, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial 
            color="#64ffda" 
            emissive="#64ffda"
            emissiveIntensity={0.5}
            roughness={0.2}
          />
        </mesh>
      </Float>
    </group>
  )
}

// The scene
function TreeScene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} color="#64ffda" />
      <pointLight position={[5, 5, 5]} intensity={0.3} color="#ffffff" />
      <pointLight position={[-3, 2, -3]} intensity={0.2} color="#64ffda" />
      
      {/* Fog for atmosphere */}
      <fog attach="fog" args={['#0a1628', 8, 25]} />
      
      {/* The tree */}
      <group>
        <Trunk />
        
        {/* Placeholder branches - will be generated from data */}
        <Branch 
          position={[0, 1.8, 0]} 
          rotation={[0, 0, -0.4]} 
          length={1.2} 
        />
        <Branch 
          position={[0, 1.4, 0]} 
          rotation={[0, Math.PI * 0.6, -0.5]} 
          length={1.0} 
        />
        <Branch 
          position={[0, 1.0, 0]} 
          rotation={[0, Math.PI * 1.2, -0.3]} 
          length={0.8} 
        />
        <Branch 
          position={[0, 0.6, 0]} 
          rotation={[0, Math.PI * 1.8, -0.6]} 
          length={1.1} 
        />
      </group>
      
      {/* Ground plane (will become water) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial 
          color="#0d2137" 
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
      
      {/* Controls */}
      <OrbitControls 
        enablePan={false}
        minDistance={4}
        maxDistance={12}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
      />
    </>
  )
}

// Main component
export function MoneyTree({ className }: { className?: string }) {
  return (
    <div 
      className={className}
      style={{ 
        background: 'linear-gradient(180deg, #0a1628 0%, #0d2137 50%, #134e5e 100%)',
        borderRadius: '0.5rem',
        overflow: 'hidden'
      }}
    >
      <Canvas
        camera={{ 
          position: [0, 2, 6], 
          fov: 45,
          near: 0.1,
          far: 100
        }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0a1628']} />
        <Suspense fallback={null}>
          <TreeScene />
          
          {/* Post-processing for glow */}
          <EffectComposer>
            <Bloom 
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              intensity={0.6}
              radius={0.8}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  )
}

export default MoneyTree
```

---

## Step 3: Create Loading Fallback

Create `src/components/tree/TreeLoading.tsx`:

```tsx
export function TreeLoading() {
  return (
    <div 
      className="flex items-center justify-center h-full"
      style={{ 
        background: 'linear-gradient(180deg, #0a1628 0%, #0d2137 50%, #134e5e 100%)',
        borderRadius: '0.5rem'
      }}
    >
      <div className="text-center">
        <div 
          className="w-3 h-3 rounded-full mx-auto mb-3 animate-pulse"
          style={{ backgroundColor: '#64ffda' }}
        />
        <p style={{ color: '#64ffda', opacity: 0.7 }}>
          Growing...
        </p>
      </div>
    </div>
  )
}
```

---

## Step 4: Create Dynamic Import Wrapper

Create `src/components/tree/index.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'
import { TreeLoading } from './TreeLoading'

export const MoneyTree = dynamic(
  () => import('./MoneyTree').then(mod => mod.MoneyTree),
  { 
    ssr: false,
    loading: () => <TreeLoading />
  }
)
```

---

## Step 5: Update the Page

In `src/app/page.tsx`, find where the Sankey diagram / "Your Money Tree" card is rendered.

Replace the content inside that card with:

```tsx
import { MoneyTree } from '@/components/tree'

// Inside the card that currently shows the Sankey diagram:
<div className="h-[400px]">
  <MoneyTree className="w-full h-full" />
</div>
```

Keep the card header ("Your Money Tree" / "Watch your income branch into your goals").

---

## Step 6: Verify

1. Run `npm run dev`
2. Navigate to http://localhost:3000
3. You should see:
   - A dark canvas with gradient background
   - A 3D tree with trunk and branches
   - Glowing cyan nodes at branch tips
   - Ability to rotate the view by dragging
   - Subtle bloom/glow effect
   - Ground plane suggesting water

---

## What NOT to Do Yet

- Don't connect to real bucket data (Phase 2)
- Don't add growth animations (Phase 3)
- Don't add water reflections (Phase 4)
- Don't add particles/fireflies (Phase 4)
- Don't add click interactions (Phase 3)

Just get the foundation solid. We iterate from there.

---

## Quality Checklist

Before considering Phase 1 complete:

- [ ] No console errors
- [ ] Canvas is responsive (fills container)
- [ ] Rotation feels smooth (dampingFactor working)
- [ ] Can't rotate below the ground plane
- [ ] Glow effect visible on leaf nodes
- [ ] Dark atmosphere feels like "midnight lagoon"
- [ ] Mobile touch rotation works

---

## Troubleshooting

**"Cannot use import statement outside a module"**
- Make sure MoneyTree.tsx has `'use client'` at the top
- Use dynamic import with `ssr: false`

**Black screen / nothing renders**
- Check browser console for WebGL errors
- Ensure Canvas has explicit height

**Glow not working**
- EffectComposer may need specific import path
- Try reducing Bloom intensity

**Performance issues**
- Reduce geometry segments (cylinderGeometry args)
- Disable antialiasing on mobile

---

## File Summary

Create these files:
1. `src/components/tree/MoneyTree.tsx` - Main 3D component
2. `src/components/tree/TreeLoading.tsx` - Loading state
3. `src/components/tree/index.tsx` - Dynamic export

Modify:
1. `src/app/page.tsx` - Import and use MoneyTree

---

End of Phase 1 instructions.


## Related
- [[Products and Services Canon]]
- [[GARDEN_INTERACTION_SPEC]]
- [[GROVE_3D_SPECIFICATION]]
- [[Foundation Canon]]
