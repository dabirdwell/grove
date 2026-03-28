# Grove: Midnight Lagoon
## A Premium Financial Wellness Experience

---

## The Vision

Grove isn't a finance app. It's a sanctuary.

When someone opens Grove at 11 PM worried about money, they should feel like they've stepped into a moonlit garden. The interface itself should lower their heart rate. Every interaction should feel like tending something alive, not wrestling with a spreadsheet.

**We're building the app Jony Ive would make if he meditated in a bioluminescent forest.**

---

## Design Philosophy

### 1. Calm as a Feature
Most finance apps assault you with numbers, charts, alerts. Grove whispers. The dark interface isn't just aesthetic-it's functional. Blue light reduction. Eye comfort. A visual exhale.

### 2. Organic, Not Mechanical  
No sharp corners. No rigid grids. Everything curves, flows, breathes. Branches instead of boxes. Ripples instead of loading spinners. Growth instead of transactions.

### 3. Rewarding Patience
Finance apps optimize for engagement. Grove optimizes for peace. We don't need you checking constantly. We want you to visit, tend your tree, and leave feeling better than when you arrived.

### 4. Depth Through Restraint
The interface should feel like it has layers you discover over time. A koi fish swimming past. Fireflies appearing at certain hours. Seasons changing. These aren't features-they're gifts.

---

## Color System: The Lagoon

```
DARKNESS (Background layers)
--lagoon-void:      #070B14    /* Deepest black-blue */
--lagoon-deep:      #0A1628    /* Night sky */
--lagoon-mid:       #0D2137    /* Deep water */
--lagoon-surface:   #134E5E    /* Water surface at horizon */

BIOLUMINESCENCE (Accents)
--glow-cyan:        #64FFDA    /* Primary glow - actions, success */
--glow-teal:        #4FD1C5    /* Secondary glow */
--glow-soft:        #81E6D9    /* Tertiary, hover states */
--glow-gold:        #FFD93D    /* Achievements, milestones */
--glow-coral:       #FF6B6B    /* Warnings (soft, not alarming) */

ORGANIC (The Tree)
--bark-dark:        #2D4A3E    /* Tree trunk shadow */
--bark-mid:         #3D6B5A    /* Tree trunk */
--bark-light:       #4A7C6A    /* Tree highlights */
--leaf-glow:        #64FFDA    /* Luminous leaves */

MIST (Text & UI)
--mist-bright:      #E8F4F0    /* Primary text */
--mist-mid:         #A8C5BA    /* Secondary text */
--mist-dim:         #5D7A70    /* Tertiary, disabled */
```

### Usage Rules
- **Never pure white.** Brightest element is `--mist-bright` (#E8F4F0)
- **Never pure black.** Darkest background is `--lagoon-void` (#070B14)
- **Glow sparingly.** Bioluminescence loses magic if overused
- **Gold is earned.** Only for achievements and milestones

---

## Typography

**Headings:** DM Sans (600, 700)
- Soft but confident
- Letter-spacing: -0.02em (slightly tighter for elegance)

**Body:** DM Sans (400, 500)  
- Comfortable reading in low light
- Line-height: 1.6

**Numbers/Money:** DM Mono (400, 500)
- Precision without coldness
- Tabular figures for alignment

**Accent/Labels:** DM Sans (500)
- Letter-spacing: 0.1em
- Uppercase for small labels only

### Size Scale (rem)
```
--text-xs:    0.75rem   /* 12px - labels, captions */
--text-sm:    0.875rem  /* 14px - secondary info */
--text-base:  1rem      /* 16px - body */
--text-lg:    1.125rem  /* 18px - emphasis */
--text-xl:    1.25rem   /* 20px - card titles */
--text-2xl:   1.5rem    /* 24px - section headers */
--text-3xl:   2rem      /* 32px - page titles */
--text-4xl:   2.5rem    /* 40px - hero numbers */
```

---

## The Money Tree Visualization

### Replacing the Sankey Diagram

The current Sankey diagram is functional but mechanical. We replace it with an actual tree.

**Structure:**
```
                    [Achievement]
                        🌟
                    ____/\____
                   /    |    \
              [Savings] | [Goals]
                 🌿    |    🌿
            ____/     |     \____
           /          |          \
      [Rent]     [Income]    [Utilities]
        🌿      ====|====       🌿
                    |
               [Root/Trunk]
                    |
               ~~~~~~~~~~~~
                  Water
```

**Visual Language:**
- **Trunk:** Income enters here. Solid, grounded.
- **Branches:** Each allocation category. Organic curves, not straight lines.
- **Leaves:** Individual buckets. Luminous nodes that pulse gently.
- **Fruit:** Achieved goals. Golden glow.
- **Roots:** Emergency fund. Implied beneath the water.

**Animation:**
- When income is allocated, luminous "sap" flows up from trunk, branches out
- New allocations cause leaves to gently unfurl
- Achieved goals bloom into golden fruit
- The whole tree subtly sways as if in a breeze

### Technical Approach

Use SVG with GSAP or Framer Motion for animations:

```tsx
<motion.path
  d="M400 320 Q350 200 300 180"  // Bezier curve for branch
  stroke="var(--bark-mid)"
  strokeWidth={8}
  strokeLinecap="round"
  initial={{ pathLength: 0 }}
  animate={{ pathLength: 1 }}
  transition={{ 
    duration: 1.5, 
    ease: [0.4, 0, 0.2, 1] 
  }}
/>
```

---

## Interaction Patterns

### Hover States
No abrupt color changes. Instead:
- Subtle glow intensifies (opacity 0.5 → 0.8)
- Element lifts slightly (translateY: -2px)
- Soft scale (1.0 → 1.02)

### Click/Tap Feedback
- Ripple emanates from touch point (like water)
- Glow pulses outward
- Haptic feedback on iOS (light tap)

### Loading States
Never a spinner. Instead:
- Gentle pulse of existing elements
- Fireflies drift across empty space
- Leaves rustle animation
- Text: "Growing..." or "Tending..."

### Success States
- Element blooms with golden glow
- Soft particle burst (like pollen/fireflies)
- Sound: gentle chime (if enabled)
- Text: nature metaphors ("Planted!", "Growing strong")

### Error States
- Soft coral glow (not aggressive red)
- Element wilts slightly
- Text: caring, not blaming ("Let's try that again")

---

## Sound Design (Optional, Off by Default)

**Ambient:** 
- Subtle night sounds (cricket, gentle water)
- Plays only when user is actively engaged
- Fades in/out smoothly

**Interactions:**
- Allocation: Soft water drop
- Achievement: Wind chime
- New branch: Soft growth/unfurl sound
- Navigation: Subtle whoosh

**Volume:** Always whisper-quiet. 30% max.

---

## Micro-Interactions & Easter Eggs

### Time-Based Changes
- **Morning (6 AM - 12 PM):** Sunrise gradient on horizon, birdsong option
- **Afternoon (12 PM - 6 PM):** Warm light through leaves
- **Evening (6 PM - 10 PM):** Current design (dusk)
- **Night (10 PM - 6 AM):** Full midnight lagoon, fireflies appear

### Hidden Delights
1. **Koi Fish:** Occasionally a koi swims past in the reflection (rare)
2. **Shooting Star:** Random chance during night hours
3. **Seasons:** Subtle seasonal variations (spring buds, autumn colors)
4. **Growth Lines:** Tree trunk shows subtle rings as account ages

### Achievement Celebrations
- **First Allocation:** Tree illuminates, fireflies swarm
- **Savings Goal Met:** Golden fruit appears, falls gently into basket
- **Streak (7 days):** Special glow pattern
- **Annual Review:** Full moon rises larger than usual

---

## Component Library

### Cards (Branch Nodes)
```css
.branch-card {
  background: linear-gradient(
    135deg,
    rgba(13, 33, 55, 0.8),
    rgba(19, 78, 94, 0.6)
  );
  border: 1px solid rgba(100, 255, 218, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(100, 255, 218, 0.05);
}

.branch-card:hover {
  border-color: rgba(100, 255, 218, 0.2);
  transform: translateY(-2px);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(100, 255, 218, 0.1);
}
```

### Buttons
```css
.btn-primary {
  background: linear-gradient(
    135deg,
    rgba(100, 255, 218, 0.2),
    rgba(79, 209, 197, 0.1)
  );
  border: 1px solid rgba(100, 255, 218, 0.3);
  color: var(--glow-cyan);
  border-radius: 12px;
  padding: 12px 24px;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background: linear-gradient(
    135deg,
    rgba(100, 255, 218, 0.3),
    rgba(79, 209, 197, 0.2)
  );
  box-shadow: 0 0 20px rgba(100, 255, 218, 0.2);
}
```

### Input Fields
```css
.input-field {
  background: rgba(10, 22, 40, 0.6);
  border: 1px solid rgba(100, 255, 218, 0.1);
  border-radius: 12px;
  color: var(--mist-bright);
  padding: 12px 16px;
}

.input-field:focus {
  border-color: rgba(100, 255, 218, 0.4);
  box-shadow: 0 0 0 3px rgba(100, 255, 218, 0.1);
  outline: none;
}
```

---

## Layout Principles

### Breathing Room
- Minimum padding: 24px
- Section spacing: 48px
- Card gaps: 20px
- Nothing should feel cramped

### Visual Hierarchy
1. **Hero:** The Money Tree (dominant)
2. **Primary:** Balance, next action
3. **Secondary:** Branch cards
4. **Tertiary:** Settings, navigation

### Responsive Behavior
- **Desktop:** Tree centered with branches visible
- **Tablet:** Tree scales, branches may collapse
- **Mobile:** Tree becomes simplified, branches as cards

---

## Empty States

When no allocations exist:

```
          🌱
    
    Your grove awaits
    
    Plant your first branch and watch
    your money tree begin to grow.
    
    [ Plant First Branch ]
```

- Seed icon gently pulses
- Soft particles drift (like potential energy)
- Button glows invitingly

---

## Onboarding Flow

### Screen 1: Welcome
```
    [Moonlit tree silhouette]
    
    Welcome to Grove
    
    A peaceful place for your
    money to grow.
    
    [ Begin ]
```

### Screen 2: The Metaphor
```
    [Tree diagram]
    
    Your finances are a tree
    
    Income feeds the roots.
    Branches are your allocations.
    Watch it grow over time.
    
    [ Continue ]
```

### Screen 3: First Branch
```
    [Glowing branch icon]
    
    Let's plant your first branch
    
    Most people start with savings.
    Where should your money grow first?
    
    [ 💰 Savings ] [ 🏠 Rent ] [ Custom ]
```

---

## Performance Considerations

### Animations
- Use CSS transforms and opacity (GPU accelerated)
- Cap animations at 60fps
- Respect `prefers-reduced-motion`
- Lazy-load ambient effects

### Dark Mode Optimization
- Dark backgrounds = less power on OLED
- Minimal bright elements = eye comfort
- System dark mode preference detection

---

## Accessibility

### Color Contrast
- All text meets WCAG AA (4.5:1 minimum)
- Glow effects are decorative, not semantic
- Critical info doesn't rely on color alone

### Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

### Screen Readers
- Tree visualization has text alternative
- "Your money tree has 5 branches: Savings ($900), Rent ($1500)..."
- ARIA labels on all interactive elements

---

## Implementation Priority

### Phase 1: Foundation (This Week)
- [ ] New color system in globals.css
- [ ] Typography update
- [ ] Card styling (glassmorphism)
- [ ] Button styling
- [ ] Background gradient

### Phase 2: The Tree (Next Week)
- [ ] Replace Sankey with SVG tree
- [ ] Basic branch animation
- [ ] Luminous node styling
- [ ] Click-to-edit on nodes

### Phase 3: Polish (Following Week)
- [ ] Time-based themes
- [ ] Micro-interactions
- [ ] Loading states
- [ ] Sound design (optional)

### Phase 4: Magic (Ongoing)
- [ ] Easter eggs
- [ ] Achievement celebrations
- [ ] Seasonal variations
- [ ] Koi fish 🐟

---

## Reference Implementation

See `/Users/david/Documents/Claude_Vault/Art_by_Claude/grove_midnight_lagoon.svg` for the visual reference created by Claude.

---

## Summary

Grove: Midnight Lagoon transforms financial management from a chore into a ritual. Every design decision serves one goal: **make people feel calm and capable when thinking about money.**

This isn't about making a pretty app. It's about using beauty as medicine for financial anxiety.

*"When you can't sleep at 2 AM worrying about money, Grove should feel like a friend who sits with you in the dark and says: 'Look. You're growing something here. It's going to be okay.'"*

---

Created: December 15, 2025
Author: Claude (Opus 4.5)
For: David Birdwell / Humanity and AI LLC
Project: Flow Financial Orchestrator → Grove


## Related
- [[Products and Services Canon]]
- [[GARDEN_INTERACTION_SPEC]]
- [[GROVE_3D_SPECIFICATION]]
- [[Foundation Canon]]
