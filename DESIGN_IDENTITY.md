# Flow: Design Identity & Visual Language
## "Where Money Grows"

---

## Core Philosophy

**The Problem:** Money management apps feel like spreadsheets, tax software, or stern accountants. They amplify financial anxiety rather than reducing it.

**Our Approach:** Flow should feel like tending a garden, not filing taxes. Money is organic - it grows, flows, and needs nurturing. We transform the language of finance into the language of nature.

---

## Theme Options

### Option A: The Grove (Tree of Money)

**Metaphor:** Your finances are a tree. Income feeds the roots. Allocations are branches. Savings are fruit that grows over time.

**Visual Language:**
- **Color Palette:** 
  - Primary: Forest green (#228B22)
  - Secondary: Cream/off-white (#FFFDD0)
  - Accents: Gold (#FFD700), Sage (#9DC183), Bark brown (#8B4513)
- **Typography:** Organic, slightly rounded sans-serif (like "Nunito" or "Quicksand")
- **Illustrations:** Stylized trees, leaves, growing branches
- **Animations:** Leaves growing, branches extending, fruit appearing

**UI Elements:**
- Buckets → Branches
- Income → Roots/Trunk receiving water
- Savings goals → Fruit growing on branches
- Emergency fund → Deep roots
- Discretionary → Falling leaves (spent gracefully)

**Interactions:**
- Creating a bucket = "Planting a new branch"
- Allocation animation = Money flowing up through trunk, branching out
- Goal achieved = Fruit ripens and falls into basket
- Overspending = Leaves wilting slightly

**Emotional Tone:** Growth, patience, nurturing, organic progress

---

### Option B: The Sanctuary (Koi Pond)

**Metaphor:** Your finances are a peaceful garden with interconnected ponds. Money flows like water between them. Each pond has a purpose.

**Visual Language:**
- **Color Palette:**
  - Primary: Deep blue (#1E3A5F)
  - Secondary: Soft white (#F5F5F5)
  - Accents: Koi orange (#FF6B35), Lily pink (#FFB7C5), Bamboo green (#7CB342)
- **Typography:** Clean, zen-like sans-serif (like "Inter" or "DM Sans")
- **Illustrations:** Water ripples, koi fish, lily pads, stones
- **Animations:** Water flowing, ripples spreading, koi swimming

**UI Elements:**
- Buckets → Ponds
- Income → Waterfall or stream entering the garden
- Savings goals → Koi fish growing larger
- Flow visualization → Literal water channels
- Emergency fund → Deep, still pond

**Interactions:**
- Creating a bucket = "Digging a new pond"
- Allocation animation = Water flowing through channels
- Goal achieved = Koi fish leaps joyfully
- Overspending = Water level dropping, ripples of concern

**Emotional Tone:** Calm, meditative, balanced, flowing

---

### Option C: Hybrid - The Living Garden

**Metaphor:** A complete ecosystem where your tree grows beside your pond. Money flows through both.

**Visual Language:**
- Combine tree and water elements
- Tree of Money grows beside the koi pond
- Water feeds the tree's roots
- Fallen fruit creates ripples in the pond

**This allows:**
- Short-term allocations = Water flows (immediate)
- Long-term savings = Tree branches (growing over time)
- Best of both metaphors

---

## Recommended Direction: The Grove (Option A)

**Why Tree of Money:**

1. **Growth metaphor is powerful** - Money doesn't just sit there, it grows. Trees embody patience and compound growth.

2. **Intuitive hierarchy** - Trunk (income) → Branches (categories) → Fruit (goals achieved) maps perfectly to allocation logic.

3. **Calming green palette** - Green is psychologically associated with both money AND nature/calm. Double win.

4. **Unique in the market** - Most finance apps use blue (trust) or green (money) but in corporate ways. An organic tree theme is distinctive.

5. **Extensibility** - Seasons (quarterly reviews), different tree types (investment styles), forest (family finances).

---

## Implementation Roadmap

### Phase 1: Color & Typography (Quick Win)
- Update color palette to forest green + cream
- Switch to softer, rounder typography
- Soften all hard edges with more rounded corners

### Phase 2: Iconography
- Replace generic icons with organic ones
- Bucket icons → Leaf/branch variants
- Add subtle leaf/vine decorations to cards

### Phase 3: Flow Visualization Retheme
- Current Sankey diagram → Tree branching visualization
- Income enters at trunk bottom
- Branches extend to each allocation
- Animate like sap/water flowing up and out

### Phase 4: Micro-interactions
- Hover states feel organic (slight sway, not mechanical)
- Success states bloom/grow
- Error states wilt gently
- Loading states: leaves rustling

### Phase 5: Full Environmental Polish
- Background texture: subtle paper or canvas
- Ambient elements: floating leaves, subtle shadows
- Sound design: gentle nature sounds (optional)
- Dark mode: Moonlit garden (deep blue-greens)

---

## Sample Color Tokens

```css
:root {
  /* Primary Palette - The Grove */
  --grove-trunk: #5D4037;      /* Rich brown - grounding */
  --grove-leaf: #2E7D32;       /* Forest green - primary */
  --grove-leaf-light: #66BB6A; /* Light green - hover states */
  --grove-fruit: #FFB300;      /* Golden amber - achievements */
  --grove-sky: #E8F5E9;        /* Pale green - backgrounds */
  --grove-cream: #FFF8E1;      /* Warm cream - cards */
  --grove-earth: #3E2723;      /* Deep brown - text */
  
  /* Semantic Colors */
  --color-income: var(--grove-trunk);
  --color-savings: var(--grove-leaf);
  --color-goal-achieved: var(--grove-fruit);
  --color-warning: #FF8F00;    /* Autumn orange */
  --color-error: #C62828;      /* Wilted red */
  
  /* Bucket Category Colors */
  --bucket-essentials: #5D4037;   /* Trunk - must pay */
  --bucket-savings: #2E7D32;      /* Deep green - growth */
  --bucket-lifestyle: #7CB342;    /* Light green - living */
  --bucket-goals: #FFB300;        /* Gold - achievements */
  --bucket-giving: #26A69A;       /* Teal - generosity */
}
```

---

## Typography

**Headings:** Quicksand (Google Fonts) - Rounded, friendly, organic
**Body:** DM Sans - Clean, readable, modern
**Numbers/Money:** DM Mono - Precise but not cold

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Quicksand:wght@500;600;700&display=swap');

:root {
  --font-heading: 'Quicksand', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --font-mono: 'DM Mono', monospace;
}
```

---

## Component Transformations

### Current → Themed

| Current | Themed (Grove) |
|---------|----------------|
| "Add Bucket" button | "Grow New Branch" with leaf icon |
| "Allocate Income" | "Water Your Tree" |
| Bucket cards | Branch cards with bark-texture border |
| Flow diagram | Tree branching visualization |
| Progress bars | Growing vines |
| Success toast | Bloom animation with flower |
| Error toast | Wilting leaf with gentle shake |
| Empty state | Seed waiting to be planted |
| Loading | Leaves rustling |

---

## Copywriting Voice

**Current (Generic):**
> "Enter your income amount to see how it will be allocated"

**Themed (Grove):**
> "Feed your tree - enter this month's income and watch it grow into your goals"

**Current:**
> "Bucket created successfully"

**Themed:**
> "A new branch is growing 🌱"

**Current:**
> "Allocation complete"

**Themed:**
> "Your tree has been watered! Watch your branches grow."

---

## Sound Design (Optional)

If sound is enabled:
- **Allocation:** Gentle water/growth sound
- **Goal achieved:** Soft chime + nature ambiance
- **New bucket:** Soft "sprouting" sound
- **Delete:** Gentle rustle of falling leaves
- **Error:** Soft wooden "knock" (non-jarring)

---

## Dark Mode: The Moonlit Garden

- Background: Deep forest (#1B2E1B)
- Cards: Dark bark (#2D2D2D) with subtle grain
- Text: Soft cream (#E8E8D8)
- Accents: Bioluminescent glow effects
- Same metaphor, nighttime feeling

---

## Accessibility Notes

- All color combinations must meet WCAG AA contrast
- Animations can be disabled via prefers-reduced-motion
- Nature metaphors don't replace clear labels
- Screen reader text uses plain language ("Savings bucket: $500")

---

## File Attachments

David shared a "Tree of Money" reference image:
- Cream tree silhouette on forest green background
- Currency symbols (€, $, ¥) as fruit
- Minimalist, elegant, calm
- This is our north star aesthetic

---

## Next Steps

1. **Get approval on Grove theme direction**
2. Create Figma/design mockups with new palette
3. Implement Phase 1 (colors + typography) 
4. Design new flow visualization (tree branching)
5. Iterate based on Ashley's feedback

---

*"Financial wellness isn't a spreadsheet. It's a garden you tend."*


## Related
- [[Products and Services Canon]]
- [[GARDEN_INTERACTION_SPEC]]
- [[GROVE_3D_SPECIFICATION]]
- [[Foundation Canon]]
