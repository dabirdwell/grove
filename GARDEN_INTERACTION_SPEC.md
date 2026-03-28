# Grove: Garden Interaction Model
## Ambient Feedback + Occasional Foreground Moments

---

## The Core Principle

The tree is always alive. It reacts to your financial activity in the background - rewarding attention but never demanding it. And occasionally, for moments that matter, it steps forward.

**Two tiers:**
1. **Ambient (99%)** - Background animation, 2-3 seconds, doesn't interrupt
2. **Foreground (rare)** - Camera pushes in, UI dims, you get a *moment*

This eliminates friction while preserving delight.

---

## Tier 1: Ambient Background Animations

These happen automatically when financial events occur. The tree responds behind whatever UI the user is currently interacting with.

### Income Allocated → Sap Rises

**Trigger:** User completes income allocation (via bucket cards, sliders, etc.)

**Animation (background):**
1. Brief shimmer/ripple at tree base (0.3s)
2. Luminous sap particles rise through trunk (1.0s)
3. Sap splits at branch junctions proportionally
4. Branch nodes pulse as sap arrives (0.5s)
5. Tree settles into healthy glow (0.5s)

**Duration:** ~2.5 seconds
**Attention required:** None

---

### New Bucket Created → Branch Sprouts

**Trigger:** User creates new allocation bucket

**Animation (background):**
1. Small glow point appears on trunk
2. Tiny shoot emerges, curves outward
3. Branch extends to proportional length
4. Leaf node unfurls at tip, begins glowing

**Duration:** ~2 seconds

---

### Bucket Deleted → Branch Withers

**Trigger:** User removes a bucket

**Animation (background):**
1. Target branch dims
2. Leaves curl slightly
3. Branch fades to transparency
4. Disappears (no dramatic falling)

**Duration:** ~1.5 seconds  
**Tone:** Gentle, not violent. A natural release.

---

### Goal Achieved → Fruit Appears

**Trigger:** Savings goal reaches 100%

**Animation (background):**
1. Target branch pulses golden
2. Small orb materializes at branch tip
3. Orb solidifies into golden fruit
4. Gentle glow persists

**Duration:** ~2 seconds  
**Note:** Fruit remains visible until acknowledged or harvested.

---

### Emergency Fund Deposit → Roots Illuminate

**Trigger:** Allocation to emergency fund / reserves

**Animation (background):**
1. Sap flows DOWN from base (the one thing that flows down)
2. Root system briefly illuminates beneath water
3. Roots glow, then dim (stored energy)
4. Water ripples softly

**Duration:** ~2 seconds  
**Emotional tone:** Security, depth, stability.

---

### Expense Logged → Leaf Releases

**Trigger:** Transaction categorized as expense (batched, not every transaction)

**Animation (background):**
1. Single leaf detaches from relevant branch
2. Floats down with gentle rotation
3. Lands on water, creates small ripple
4. Dissolves

**Duration:** ~2 seconds  
**Frequency:** Batched daily or threshold-triggered. Not every coffee.

---

### Investment Returns → Growth Pulse

**Trigger:** Returns posted, dividends, gains

**Animation (background):**
1. Golden/amber pulse at roots
2. Warm glow travels up entire tree
3. All nodes pulse simultaneously
4. Brief shimmer, then settles

**Duration:** ~1.5 seconds  
**Tone:** Bonus energy. Unexpected health.

---

## Tier 2: Foreground Moments

Rare, special events where the tree "steps forward" for a moment of focused attention.

### When Foreground Moments Trigger

| Event | Frequency | Why |
|-------|-----------|-----|
| First ever deposit | Once | Teaches the metaphor, memorable onboarding |
| First deposit of the month | Monthly | Ritual, fresh start energy |
| Drought-breaker (first after 2+ weeks) | Occasional | "Your tree missed you" |
| Income significantly above average (>150%) | Rare | Celebration of abundance |
| Goal achieved | Per goal | The fruit deserves a moment |
| Account anniversary | Annual | Reflection, growth acknowledgment |
| Random | ~2% of deposits | Surprise delight, keeps it fresh |

### Foreground Animation Sequence

```
0.0s  - Financial event triggers
0.2s  - Background UI dims to 40% opacity
0.5s  - Camera begins slow push toward tree
1.0s  - Tree fills ~70% of viewport
1.2s  - Primary animation begins:
        • Watering can visible for income events
        • Pour animation, prominent sap flow
        • OR fruit glow + detach for goals
        • OR special seasonal/anniversary effect
3.5s  - Animation peaks, holds for a beat
4.0s  - Camera begins slow pull back
4.5s  - UI fades back to full opacity
5.0s  - Normal view restored

Total: ~5 seconds
```

### Foreground Visual Details

**Camera movement:**
- Smooth ease-in-out
- Push toward tree center, slight upward tilt
- End framing: trunk base to canopy visible
- Pull back mirrors push (symmetry feels complete)

**UI treatment:**
- Dims but doesn't disappear
- User can still see context
- Tap anywhere = skip (immediate return to normal)
- No modal, no overlay, just depth shift

**Watering can (income events):**
- Appears from off-screen, glowing cyan
- Tips and pours luminous water
- Water streams to base, pools briefly
- Sap rises prominently (larger particles, brighter)
- Can fades out as camera pulls back

**Audio (if enabled):**
- Soft ambient swell during push
- Gentle water/chime during animation
- Fade as camera returns
- Never jarring

---

## Skip Behavior

**Critical:** Users must never feel trapped.

- Tap anywhere during foreground moment = immediate return
- Animation gracefully accelerates to completion (0.3s)
- No penalty, no lost data
- User preference: "Show special moments" toggle in settings
- Default: ON for first month, then respects user behavior
  - If user skips 3 in a row, prompt: "Want to turn these off?"

---

## State Machine

```
ANIMATION_STATE:
  - idle
  - ambient_active (background animation playing)
  - foreground_transition_in (camera pushing)
  - foreground_active (main animation)
  - foreground_transition_out (camera pulling back)
  - skip_accelerating (user tapped to skip)

TRANSITIONS:
  idle + financial_event → check_foreground_trigger
  
  check_foreground_trigger:
    if (special_event) → foreground_transition_in
    else → ambient_active
  
  ambient_active + animation_complete → idle
  
  foreground_transition_in + transition_complete → foreground_active
  foreground_active + animation_complete → foreground_transition_out
  foreground_transition_out + transition_complete → idle
  
  (any foreground state) + user_tap → skip_accelerating
  skip_accelerating + accelerated_complete → idle
```

---

## Technical Implementation Notes

### Ambient Animations

- Run on separate render layer behind UI
- Use requestAnimationFrame, throttle to 30fps on low-power devices
- Particle counts: 30-50 for sap flow
- Can be CSS/SVG for simpler effects, Three.js for 3D elements
- Fire-and-forget: no user interaction needed

### Foreground Moments

- Same Three.js canvas, camera animation via GSAP or useSpring
- UI dim: CSS opacity transition on parent container
- Z-index management: tree canvas promoted during foreground
- Skip handler: touch/click listener on document during foreground state
- Preload watering can model on first app load (not on trigger)

### Performance Budgets

| Context | Target FPS | Particle Limit | Duration Limit |
|---------|------------|----------------|----------------|
| Ambient (background) | 30 | 50 | 3s |
| Foreground (focused) | 60 | 150 | 6s |
| Mobile ambient | 24 | 30 | 3s |
| Mobile foreground | 30 | 80 | 5s |

### Fallback for Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Ambient: instant state change, no particles */
  /* Foreground: disabled entirely, use ambient */
}
```

Users with this preference get:
- Instant glow changes (no flowing sap)
- No camera movement
- Still see result (branches update, fruit appears)
- Just no animation journey

---

## Open Questions (Reduced)

1. **Watering can: 2D or 3D?**
   - 2D sprite is lighter, easier
   - 3D model is more immersive
   - Recommendation: Start 2D, upgrade if it feels flat

2. **Multiple simultaneous events?**
   - Queue them? (Could stack up)
   - Combine into single richer animation? (Probably this)
   - Example: Income + goal achieved = sap flow + fruit in one moment

3. **What counts as "significantly above average"?**
   - >150% of trailing 3-month average?
   - User-set threshold?
   - Start with 150%, tune based on feedback

---

## Implementation Priority

### Phase 1: Ambient Sap Flow (MVP)
- [ ] Particle system for sap (trunk → branches)
- [ ] Wire to allocation completion event
- [ ] Test timing and particle density
- [ ] Ensure no UI blocking

### Phase 2: Other Ambient Animations
- [ ] Branch sprout (new bucket)
- [ ] Branch wither (delete bucket)
- [ ] Root illumination (emergency fund)
- [ ] Growth pulse (returns)

### Phase 3: Foreground Moments
- [ ] Camera push/pull animation
- [ ] UI dim layer
- [ ] Skip handler
- [ ] Watering can asset + animation
- [ ] Trigger logic (special event detection)

### Phase 4: Polish
- [ ] Audio integration
- [ ] Fruit + harvest basket
- [ ] Settings toggle
- [ ] Reduced motion fallback
- [ ] Performance optimization pass

---

## Summary

The tree is alive. It breathes in the background, responding to everything you do. Most of the time, it's peripheral - a living dashboard you can glance at or ignore.

But sometimes, when something matters - your first deposit, a goal achieved, a moment of abundance - the tree steps forward. Not to block you. Not to demand interaction. Just to say: *look what you're growing*.

Then it steps back, and you continue.

**This is the difference between a finance app and a sanctuary.**

---

Created: December 23, 2025  
Revised: December 23, 2025  
Author: Claude (Opus 4.5)  
For: David Birdwell / Grove  
Status: APPROVED - Ready for implementation


## Related
- [[Products and Services Canon]]
- [[GROVE_3D_SPECIFICATION]]
- [[DESIGN_IDENTITY]]
- [[Foundation Canon]]
