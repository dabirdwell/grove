# Grove 3D: Unified Design Specification
## The Living Money Tree

---

> *"What if managing money felt like tending a bonsai at midnight?"*

---

## Part I: The Soul

### Why This Exists

People don't hate budgeting because it's hard. They hate it because it makes them feel small.

Grove says: "Look what you're growing. It's alive. It's yours."

**The tree doesn't REPRESENT your finances. The tree IS your finances.**

When you add a savings bucket, you're not "creating a data entry that displays as a branch." You're growing a branch.

### The Feeling We're Building

**Calm capability.**

- If a feature increases engagement but decreases calm, cut it.
- If a feature is technically impressive but doesn't feel alive, cut it.
- If a feature is practical but breaks the spell, find another way.

### The Ritual

Open the app. Breathe. Rotate the tree slowly. Notice what's glowing, what's dim. Tend what needs tending. Close the app.

- **Time:** 30 seconds to 2 minutes
- **Frequency:** Daily or weekly. The tree is patient.
- **Outcome:** You know where you stand. You feel capable. You leave.

---

## Part II: Visual Design System

### Color Palette: The Midnight Lagoon

```css
/* DARKNESS (Background layers) */
--lagoon-void:      #070B14;    /* Deepest black-blue */
--lagoon-deep:      #0A1628;    /* Night sky */
--lagoon-mid:       #0D2137;    /* Deep water */
--lagoon-surface:   #134E5E;    /* Water surface at horizon */

/* BIOLUMINESCENCE (Accents) */
--glow-cyan:        #64FFDA;    /* Primary glow - actions, success */
--glow-teal:        #4FD1C5;    /* Secondary glow */
--glow-soft:        #81E6D9;    /* Tertiary, hover states */
--glow-gold:        #FFD93D;    /* Achievements, milestones */
--glow-coral:       #FF6B6B;    /* Warnings (soft, not alarming) */

/* ORGANIC (The Tree) */
--bark-dark:        #2D4A3E;    /* Tree trunk shadow */
--bark-mid:         #3D6B5A;    /* Tree trunk */
--bark-light:       #4A7C6A;    /* Tree highlights */
--leaf-glow:        #64FFDA;    /* Luminous leaves */

/* MIST (Text & UI) */
--mist-bright:      #E8F4F0;    /* Primary text */
--mist-mid:         #A8C5BA;    /* Secondary text */
--mist-dim:         #5D7A70;    /* Tertiary, disabled */
```

### Usage Rules

- **Never pure white.** Brightest element is `--mist-bright`
- **Never pure black.** Darkest background is `--lagoon-void`
- **Glow sparingly.** Bioluminescence loses magic if overused
- **Gold is earned.** Only for achievements and milestones

### Glow as Information

The glow isn't decoration-it's status:

| Glow State | Meaning | Color |
|------------|---------|-------|
| Bright cyan | On track | `#64FFDA` |
| Soft teal | Needs attention | `#4FD1C5` |
| Dim | Struggling | `#5D7A70` opacity |
| Golden | Goal achieved | `#FFD93D` |

You never read a status. You feel it.

---

## Part III: Data → Tree Mapping

### Core Mappings

| Financial Concept | Tree Element | Visual Property |
|-------------------|--------------|-----------------|
| Net worth | Trunk | Height (0.8 → 2.5 units) |
| Health score | Trunk | Thickness (scales with score) |
| Monthly income | Roots | Depth, spread (future) |
| Savings rate | Canopy | Foliage density (future) |

### Branch Mappings

| Bucket Property | Branch Property | How It Manifests |
|-----------------|-----------------|------------------|
| `percentage` | Thickness | 0.03 → 0.15 radius |
| `amount` | Length | 0.5 → 1.3 units |
| `priority` | Height on trunk | Higher priority = lower on trunk |
| `health` (0-1) | Glow intensity | `emissiveIntensity` 0.3 → 1.0 |
| `goalAchieved` | Fruit | Golden orb appears |

### Branch Generation Algorithm

```typescript
// Golden angle distribution for natural branch placement
const angleStep = (Math.PI * 2) / branches.length;
const goldenAngle = 137.5 * (Math.PI / 180);

branches.forEach((bucket, i) => ({
  angle: i * goldenAngle,
  height: 0.3 + (i % 3) * 0.25,  // Vary heights naturally
  length: 0.5 + (bucket.percentage / 100) * 0.8,
  thickness: 0.03 + (bucket.percentage / 100) * 0.12
}));
```

---

## Part IV: The Moments

These are the experiences that make Grove memorable. Each is specified with timing and implementation notes.

### 1. The First Sprout

**When:** User creates their first bucket

**What happens:**
1. Trunk pulses (scale 1.0 → 1.05 → 1.0, 300ms)
2. Point of light appears at branch origin (fade in 200ms)
3. Light swells, trembles (scale wobble 400ms)
4. Branch unfurls along curve (pathLength 0 → 1, 1200ms ease-out)
5. Existing branches sway (rotation ±2°, 800ms)
6. Single firefly drifts past

**Total duration:** 2.5 seconds

**Implementation:**
```typescript
// Growth animation using GSAP or spring physics
const growBranch = (branch: Branch) => {
  gsap.timeline()
    .to(trunk, { scale: 1.05, duration: 0.15 })
    .to(trunk, { scale: 1.0, duration: 0.15 })
    .fromTo(branchLight, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1.2, duration: 0.2 })
    .to(branchLight, { scale: 1, duration: 0.4, ease: "elastic.out" })
    .fromTo(branchMesh, { pathLength: 0 }, { pathLength: 1, duration: 1.2, ease: "power2.out" })
    .to(otherBranches, { rotationZ: "+=0.03", duration: 0.4, stagger: 0.1 }, "-=0.8");
};
```

### 2. The Flow

**When:** User allocates income

**What happens:**
1. Luminous particles spawn at trunk base
2. Particles rise through trunk (1.5s to reach top)
3. At each branch junction, particles split proportionally
4. Particles follow branch curves to leaf nodes
5. Leaf nodes brighten as particles arrive
6. Brief pulse at each node (scale 1.0 → 1.2 → 1.0)

**Implementation:**
```typescript
interface FlowParticle {
  position: Vector3;
  velocity: Vector3;
  targetBranch: string | null;
  progress: number;  // 0-1 along path
}

// Spawn particles proportional to allocation
const spawnFlow = (amount: number, allocations: Allocation[]) => {
  const particleCount = Math.min(50, Math.floor(amount / 100));
  // ... particle system logic
};
```

### 3. The Harvest

**When:** Savings goal is reached

**What happens:**
1. Branch glows gold (transition 500ms)
2. Small fruit bud appears at leaf node
3. Fruit grows over 2 seconds (scale 0 → 1, with slight wobble)
4. Fruit pulses gently until tapped
5. On tap: fruit detaches, falls with physics
6. Lands in water with ripple effect
7. Fades into reflection

**Fruit geometry:** Icosahedron with emission shader

### 4. The Reflection

**When:** Always visible (water surface)

**What:** The reflected tree is slightly more mature-fuller branches, more fruit.

**Implementation:** Render tree twice, second pass with:
- Y position mirrored
- Scale 1.1x
- Additional procedural branches at 20% opacity
- Blur/distortion shader

**Purpose:** This is your potential. The version that's coming if you keep going.

### 5. The Koi

**When:** Random, rare (~1% chance per session, max once per week)

**What:** Orange and white koi swims through the reflection. Silent. Gone before you're sure you saw it.

**Implementation:** Pre-animated path, triggered by timer + random check

### 6. The Waiting

**When:** App idle for 60+ seconds

**What:** Camera slowly, almost imperceptibly pushes in (0.5 units over 30 seconds)

**Purpose:** The app is waiting with you.

---

## Part V: Environment

### Lighting

```typescript
// Primary: Cool ambient
<ambientLight intensity={0.2} color="#64ffda" />

// Key: Warm moonlight from above-right
<pointLight position={[5, 5, 5]} intensity={0.5} color="#e8f4f0" />

// Fill: Cool accent from left
<pointLight position={[-3, 2, -3]} intensity={0.3} color="#64ffda" />

// Rim: Subtle backlight
<pointLight position={[0, 1, -5]} intensity={0.2} color="#4fd1c5" />
```

### Fog

```typescript
<fog attach="fog" args={['#0a1628', 5, 15]} />
```

Creates depth, hides horizon, focuses attention on tree.

### Moon

- Position: Upper right quadrant
- Geometry: Sphere with basic material (no shadows)
- **Future:** Position syncs with real lunar cycle

### Water Surface

```typescript
<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
  <planeGeometry args={[20, 20, 64, 64]} />
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

### Fireflies

Behavior (from `lazy-firefly.tsx`):
- Drift lazily, almost aimlessly
- Flash pattern: quick bright pulse (5% of cycle), slow fade (10%), dim rest
- Each independent, not synchronized
- Avoid cursor (shy)

### Particles

- **Above water:** Fireflies (golden, `#ffd93d`)
- **In water:** Bioluminescent specks (cyan, `#64ffda`, smaller, slower)
- **During allocation:** Flow particles (cyan, following trunk/branch paths)

---

## Part VI: Interaction

### Camera Controls

```typescript
<OrbitControls
  enablePan={false}           // No panning, just rotation
  minDistance={3}             // Can't get too close
  maxDistance={8}             // Can't pull too far back
  minPolarAngle={Math.PI / 6} // Can't look from below
  maxPolarAngle={Math.PI / 2.2} // Can't look straight down
  enableDamping={true}
  dampingFactor={0.05}
  rotateSpeed={0.5}
  autoRotate={true}           // Gentle spin when not interacting
  autoRotateSpeed={0.3}
/>
```

### Branch Interaction

| Action | Result |
|--------|--------|
| Hover branch | Glow intensifies, tooltip appears |
| Click branch | Opens bucket edit panel |
| Long-press (mobile) | Same as click |

### Hover State

```typescript
onPointerOver={() => {
  // Glow intensity 0.8 → 1.2
  // Scale 1.0 → 1.05
  // Show tooltip: "{name}: ${amount}"
}}
```

---

## Part VII: Sound Design (Optional)

Off by default. When enabled:

| Event | Sound | Character |
|-------|-------|-----------|
| Ambient | Night sounds, distant water | Generative, never loops exactly |
| Allocation | Liquid flowing, faint | Stream you can't quite see |
| New branch | Breath-inhale | Something beginning |
| Branch complete | Breath-exhale | Something settling |
| Goal achieved | Singing bowl | Single tone, long decay |
| Koi appearance | Nothing | Silence is the point |

**Cricket frequency:** Varies with savings rate (thriving ecosystem = more crickets)

---

## Part VIII: Performance

### Budgets

| Metric | Target | Mobile Target |
|--------|--------|---------------|
| Triangle count | <50k | <20k |
| Draw calls | <30 | <15 |
| Frame rate | 60fps | 30fps |
| Initial load | <2s | <3s |

### Optimization Strategies

1. **LOD:** Reduce branch segments at distance
2. **Instancing:** Fireflies, water particles
3. **Conditional effects:** Disable bloom on low-power devices
4. **Fallback:** 2D SVG tree for `prefers-reduced-motion` or WebGL failure

### Mobile Considerations

- Touch rotation (pinch-to-zoom disabled)
- Simplified geometry (8-segment cylinders vs 12)
- Fewer fireflies (8 vs 15)
- No post-processing bloom

---

## Part IX: Accessibility

### Screen Reader Alternative

```html
<div role="img" aria-label="Your money tree has 5 branches: 
  Savings at $900 (20%, on track), 
  Rent at $1500 (33%, on track), 
  Utilities at $200 (4%, on track),
  Groceries at $400 (9%, needs attention),
  Fun Money at $300 (7%, on track).
  Overall financial health: 85%.">
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Disable all animations */
  /* Show static tree */
  /* Keep glow for status indication */
}
```

### Color Contrast

All text meets WCAG AA (4.5:1 minimum). Glow effects are decorative, not the only status indicator.

---

## Part X: Implementation Phases

### Phase 1: Foundation ✅
- [x] 3D canvas renders
- [x] Trunk and branches from data
- [x] Orbit controls
- [x] Basic lighting and fog
- [x] Fireflies

### Phase 2: Integration (CURRENT)
- [ ] Replace Sankey with MoneyTree3D in page.tsx
- [ ] Wire bucket data to branches
- [ ] Click-to-edit on branches
- [ ] Hover tooltips

### Phase 3: Animation
- [ ] Branch growth animation (The First Sprout)
- [ ] Branch deletion animation (wither/fall)
- [ ] Gentle sway (wind effect)

### Phase 4: The Flow
- [ ] Particle system for allocation
- [ ] Sap rising through trunk
- [ ] Branch brightening on receive

### Phase 5: Environment Polish
- [ ] True water reflection (MeshReflectorMaterial)
- [ ] Bloom post-processing
- [ ] Moon with lunar sync
- [ ] The Koi (easter egg)

### Phase 6: Harvest & Goals
- [ ] Fruit geometry and animation
- [ ] Goal achievement celebration
- [ ] Fruit fall physics and water ripple

---

## Part XI: File Structure

```
src/components/
├── tree/
│   ├── index.tsx              # Dynamic import wrapper
│   ├── MoneyTree.tsx          # Main canvas + scene
│   ├── Trunk.tsx              # Procedural trunk
│   ├── Branch.tsx             # Single branch with leaf
│   ├── BranchSystem.tsx       # Manages all branches
│   ├── GlowingNode.tsx        # Leaf/endpoint orb
│   ├── Water.tsx              # Reflective water plane
│   ├── Environment.tsx        # Lighting, fog, moon
│   ├── Fireflies.tsx          # Firefly swarm
│   ├── FlowParticles.tsx      # Allocation animation
│   └── TreeLoading.tsx        # Loading fallback
├── lazy-firefly.tsx           # Firefly behavior (exists)
└── money-tree-3d.tsx          # Current implementation
```

---

## Appendix: The Promise

When someone asks "What app do you use for budgeting?" a Grove user won't say:

*"It's this app with a tree visualization."*

They'll say:

*"There's this thing-it's hard to explain. It makes money feel... different. Like you're growing something instead of just tracking numbers. I don't know, you should just try it."*

That's the product.

---

*Created: December 20, 2025*
*Project: Grove Financial Orchestrator*
*Status: Living Document*



## Related
- [[Products and Services Canon]]
- [[GARDEN_INTERACTION_SPEC]]
- [[DESIGN_IDENTITY]]
- [[Foundation Canon]]
