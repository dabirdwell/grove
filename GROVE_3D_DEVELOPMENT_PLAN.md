# Grove 3D: The Living Money Tree
## Development Plan for Three.js Interactive Visualization

---

## The Vision

The money tree isn't a chart. It's a living organism that IS your financial health.

- **Rotate it** - spin to see branches from all angles
- **Watch it grow** - trunk thickens as net worth increases
- **Branches appear** - new allocations sprout from the trunk
- **Branches wither** - deleted buckets gracefully fade
- **Leaves glow** - brightness indicates allocation health
- **Roots deepen** - emergency fund grows underground
- **Seasons change** - quarterly visual evolution

**The tree should feel like it's BREATHING.**

---

## Technical Architecture

### Stack
```
Three.js          - 3D rendering engine
React Three Fiber - React bindings for Three.js  
Drei              - Useful Three.js helpers
GSAP              - Animation (or Framer Motion 3D)
Leva              - Debug controls during dev
```

### Why Three.js over SVG?
- True 3D rotation and perspective
- GPU-accelerated rendering
- Particle systems (fireflies, pollen)
- Post-processing effects (bloom, depth of field)
- Complex lighting (bioluminescence!)

---

## Data Model → Tree Mapping

```typescript
interface FinancialTree {
  // Core metrics drive tree appearance
  netWorth: number;           // → Trunk height & thickness
  monthlyIncome: number;      // → Root system depth
  savingsRate: number;        // → Foliage density
  
  // Branches = Allocation categories
  branches: Branch[];
}

interface Branch {
  id: string;
  name: string;               // "Savings", "Rent", etc.
  percentage: number;         // → Branch thickness
  amount: number;             // → Branch length
  priority: number;           // → Vertical position on trunk
  color: string;              // → Leaf/node glow color
  health: number;             // 0-1, affects glow intensity
  children?: Branch[];        // Sub-allocations
}
```

### Visual Mappings

| Financial Concept | Tree Element | Visual Property |
|-------------------|--------------|-----------------|
| Net worth | Trunk | Height, thickness |
| Monthly income | Roots | Depth, spread |
| Savings rate | Canopy | Density, fullness |
| Allocation % | Branch | Thickness |
| Allocation $ | Branch | Length |
| Priority | Branch | Height on trunk |
| Health/on-track | Leaves | Glow intensity |
| Goal achieved | Fruit | Golden orb appears |
| Emergency fund | Roots | Visible underwater |

---

## Component Architecture

```
src/
├── components/
│   └── tree/
│       ├── MoneyTree.tsx        # Main Three.js canvas
│       ├── Trunk.tsx            # Procedural trunk mesh
│       ├── Branch.tsx           # Single branch with leaves
│       ├── BranchSystem.tsx     # Manages all branches
│       ├── Leaf.tsx             # Glowing leaf/node
│       ├── Roots.tsx            # Underground root system
│       ├── Water.tsx            # Reflective water plane
│       ├── Environment.tsx      # Sky, lighting, fog
│       ├── Particles.tsx        # Fireflies, pollen
│       └── CameraController.tsx # Orbit controls
├── hooks/
│   ├── useTreeGrowth.ts         # Animate growth over time
│   ├── useBranchSpring.ts       # Organic branch movement
│   └── useFinancialMapping.ts   # Data → visual properties
├── utils/
│   ├── proceduralTree.ts        # L-system tree generation
│   ├── curveHelpers.ts          # Bezier branch curves
│   └── colorPalette.ts          # Lagoon color system
└── shaders/
    ├── glow.glsl                # Bioluminescent effect
    ├── water.glsl               # Reflective water
    └── bark.glsl                # Organic bark texture
```

---

## Phase 1: Foundation (Week 1)
### Goal: Get a 3D tree on screen that you can rotate

**Tasks:**
1. Install dependencies:
   ```bash
   npm install three @react-three/fiber @react-three/drei gsap
   npm install -D @types/three
   ```

2. Create basic canvas component:
   ```tsx
   // src/components/tree/MoneyTree.tsx
   import { Canvas } from '@react-three/fiber'
   import { OrbitControls, Environment } from '@react-three/drei'
   
   export function MoneyTree() {
     return (
       <Canvas camera={{ position: [0, 2, 8], fov: 45 }}>
         <ambientLight intensity={0.2} />
         <pointLight position={[10, 10, 10]} intensity={0.5} />
         
         {/* Placeholder tree */}
         <mesh position={[0, 1, 0]}>
           <cylinderGeometry args={[0.2, 0.4, 2, 8]} />
           <meshStandardMaterial color="#3d6b5a" />
         </mesh>
         
         <OrbitControls 
           enablePan={false}
           minDistance={4}
           maxDistance={15}
           minPolarAngle={Math.PI / 6}
           maxPolarAngle={Math.PI / 2}
         />
         
         <Environment preset="night" />
       </Canvas>
     )
   }
   ```

3. Replace Sankey diagram area with MoneyTree component

4. Add dark gradient background to canvas container

**Deliverable:** Rotating placeholder cylinder (trunk) in 3D space

---

## Phase 2: Procedural Tree (Week 2)
### Goal: Generate organic tree shape from data

**Tasks:**
1. Implement L-system or recursive branch generation:
   ```typescript
   // Simplified branch generation
   function generateBranches(
     allocations: Allocation[],
     trunkHeight: number
   ): BranchData[] {
     return allocations.map((alloc, i) => {
       const heightRatio = (i + 1) / (allocations.length + 1);
       const angle = (i * 137.5) * (Math.PI / 180); // Golden angle
       
       return {
         startY: trunkHeight * heightRatio,
         angle: angle,
         length: alloc.amount / 1000, // Scale to reasonable size
         thickness: alloc.percentage / 100,
         curve: generateBezierCurve(angle, alloc.amount),
       };
     });
   }
   ```

2. Create Branch component with TubeGeometry for organic curves:
   ```tsx
   function Branch({ curve, thickness, color }) {
     return (
       <mesh>
         <tubeGeometry args={[curve, 20, thickness * 0.1, 8, false]} />
         <meshStandardMaterial color={color} />
       </mesh>
     )
   }
   ```

3. Add glowing leaf nodes at branch endpoints

4. Implement trunk that scales with data

**Deliverable:** Tree with branches that match actual bucket data

---

## Phase 3: Animation & Interaction (Week 3)
### Goal: Tree responds to changes, user can interact

**Tasks:**
1. **Branch growth animation:**
   - New bucket → branch sprouts from trunk
   - Use GSAP or useSpring for organic easing
   ```tsx
   const { scale } = useSpring({
     scale: isNew ? [0, 0, 0] : [1, 1, 1],
     config: { mass: 2, tension: 100, friction: 30 }
   });
   ```

2. **Branch deletion animation:**
   - Bucket deleted → branch withers, fades, falls
   - Leaves detach and drift down

3. **Click interaction:**
   - Click branch → select that bucket for editing
   - Hover branch → show tooltip with details
   ```tsx
   <mesh 
     onClick={() => onSelectBucket(bucket.id)}
     onPointerOver={() => setHovered(true)}
   >
   ```

4. **Gentle sway animation:**
   - Continuous subtle movement (wind effect)
   - Use noise function for organic feel

5. **Income flow visualization:**
   - When "Allocate" pressed, luminous particles flow up trunk
   - Split at each branch proportionally

**Deliverable:** Interactive tree that animates with data changes

---

## Phase 4: Environment & Polish (Week 4)
### Goal: Full Midnight Lagoon atmosphere

**Tasks:**
1. **Water reflection:**
   ```tsx
   import { MeshReflectorMaterial } from '@react-three/drei'
   
   <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
     <planeGeometry args={[50, 50]} />
     <MeshReflectorMaterial
       blur={[300, 100]}
       resolution={1024}
       mixBlur={1}
       mixStrength={50}
       roughness={1}
       depthScale={1.2}
       color="#0d2137"
       metalness={0.5}
     />
   </mesh>
   ```

2. **Bioluminescent glow:**
   - Custom shader for leaves
   - Bloom post-processing effect
   ```tsx
   import { EffectComposer, Bloom } from '@react-three/postprocessing'
   
   <EffectComposer>
     <Bloom 
       luminanceThreshold={0.2}
       luminanceSmoothing={0.9}
       intensity={0.5}
     />
   </EffectComposer>
   ```

3. **Particle systems:**
   - Fireflies above water (golden, pulsing)
   - Bioluminescent particles in water
   - Pollen/energy particles when allocating

4. **Fog and atmosphere:**
   ```tsx
   <fog attach="fog" args={['#0a1628', 5, 30]} />
   ```

5. **Moon and stars:**
   - Skybox or simple geometry
   - Subtle moon glow

**Deliverable:** Complete atmospheric environment

---

## Phase 5: Advanced Features (Ongoing)

### Growth Over Time
- Tree "remembers" its history
- Trunk shows growth rings (view in settings?)
- Time-lapse mode to see growth

### Seasons
- Spring: Buds appearing (new goals)
- Summer: Full foliage (peak savings)
- Autumn: Golden leaves (harvest/withdrawals)
- Winter: Bare branches (reset, planning)

### Achievements as Fruit
- Goal met → golden fruit appears on branch
- Fruit can be "harvested" (acknowledged)
- Trophy room shows collected fruit

### Sound Design
- Gentle ambient (water, night sounds)
- Growth sounds (soft whoosh)
- Achievement sounds (chime)
- All optional, off by default

### Mobile Optimization
- Touch-to-rotate
- Pinch-to-zoom
- Simplified geometry for performance
- Option to fall back to 2D

---

## File Checklist

### To Create:
- [ ] `src/components/tree/MoneyTree.tsx`
- [ ] `src/components/tree/Trunk.tsx`
- [ ] `src/components/tree/Branch.tsx`
- [ ] `src/components/tree/BranchSystem.tsx`
- [ ] `src/components/tree/Leaf.tsx`
- [ ] `src/components/tree/Water.tsx`
- [ ] `src/components/tree/Environment.tsx`
- [ ] `src/components/tree/Particles.tsx`
- [ ] `src/hooks/useTreeData.ts`
- [ ] `src/utils/proceduralTree.ts`

### To Modify:
- [ ] `src/app/page.tsx` - Replace Sankey with MoneyTree
- [ ] `src/app/globals.css` - Add canvas container styles
- [ ] `package.json` - Add Three.js dependencies

---

## Claude Code Instructions

### Phase 1 Prompt:
```
Read /Users/david/Documents/Fawkes/Products and Services/Financial Orchestrator/flow/GROVE_3D_DEVELOPMENT_PLAN.md

Implement Phase 1: Foundation

1. Install Three.js dependencies
2. Create MoneyTree.tsx component with:
   - Canvas with dark background
   - OrbitControls for rotation (constrained)
   - Placeholder cylinder trunk
   - Point light for basic illumination
   - Night environment preset
3. Replace the Sankey diagram in page.tsx with MoneyTree
4. Ensure canvas is responsive and fills container

Do not proceed to Phase 2 yet. Just get a rotating 3D trunk on screen.
```

---

## Success Metrics

**Phase 1 Complete When:**
- [ ] 3D canvas renders without errors
- [ ] Can rotate view with mouse/touch
- [ ] Dark background matches Lagoon palette
- [ ] Trunk placeholder visible and lit

**Phase 2 Complete When:**
- [ ] Branches generated from actual bucket data
- [ ] Branch count matches bucket count
- [ ] Branch thickness reflects allocation percentage
- [ ] Glowing nodes at branch tips

**Phase 3 Complete When:**
- [ ] New bucket → animated branch growth
- [ ] Delete bucket → animated branch removal
- [ ] Click branch → bucket selected
- [ ] Tree gently sways

**Phase 4 Complete When:**
- [ ] Water reflection visible
- [ ] Bloom effect on glowing elements
- [ ] Fireflies animate
- [ ] Full atmosphere achieved

---

## Notes

- **Performance:** Monitor FPS, especially on mobile. Be ready to reduce geometry complexity.
- **Accessibility:** Provide 2D fallback for users who prefer reduced motion or have older devices.
- **State Management:** Tree visualization reads from same state as bucket cards - single source of truth.
- **Testing:** Hard to unit test 3D visuals. Focus on integration tests and visual regression.

---

Created: December 16, 2025
Project: Grove Financial Orchestrator
Author: Claude (Opus 4.5)
For: David Birdwell / Humanity and AI LLC


## Related
- [[Products and Services Canon]]
- [[GARDEN_INTERACTION_SPEC]]
- [[GROVE_3D_SPECIFICATION]]
- [[Foundation Canon]]
