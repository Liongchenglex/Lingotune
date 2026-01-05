# LingoTune Visual Style Guide

## Design Philosophy

LingoTune employs a modern, playful, and music-centric design language that makes language learning feel like an enjoyable musical journey. The design balances clarity with delight, using smooth animations, soft shadows, and a cohesive color palette.

---

## Color System

### Primary Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Primary** | `#0DCCF2` | Primary actions, active states, highlights, brand color |
| **Primary Dark** | `#0BB4D6` / `#0AB8DA` | Hover states, darker variant |

### Background Colors

| Color | Light Mode | Dark Mode |
|-------|------------|-----------|
| **Background** | `#F5F8F8` | `#101F22` |
| **Surface/Card** | `#FFFFFF` | `#1A2C30` |

### Text Colors

| Color | Light Mode | Dark Mode |
|-------|------------|-----------|
| **Main Text** | `#0D191C` | `#E0F7FA` |
| **Secondary Text** | `#498E9C` | `#8EBCC6` |

### Semantic Colors

- **Streak/Fire**: Orange (`text-orange-500`)
- **Success**: Green (`#10B981`)
- **Lock/Disabled**: Gray (`#9CA3AF`)
- **Gradient Accent**: `#E0F7FA` to `#F5F8F8` (light), `#15282D` to `#101F22` (dark)

---

## Typography

### Font Families

- **Display Font**: `Spline Sans` (300, 400, 500, 600, 700)
  - Used for: Headings, buttons, navigation, all UI text
  - Character: Clean, modern, slightly rounded

- **Body Font**: `Noto Sans` (400, 500, 700)
  - Used for: Body text, paragraphs (secondary)
  - Character: Readable, international language support

### Text Hierarchy

| Element | Font | Size | Weight | Usage |
|---------|------|------|--------|-------|
| **H1** | Spline Sans | 24px (2xl) | Bold (700) | Page titles, song names |
| **H2** | Spline Sans | 18-20px (lg-xl) | Bold (700) | Section headers, greetings |
| **H3** | Spline Sans | 16-18px (lg) | Bold (700) | Subsection headers |
| **H4** | Spline Sans | 14-16px (base) | Bold (700) | Card titles, module names |
| **Body** | Spline Sans | 14px (sm-base) | Medium (500) | Primary content |
| **Caption** | Spline Sans | 12px (xs) | Medium (500) | Metadata, subtitles |
| **Micro** | Spline Sans | 10px (2xs) | Medium/Bold | Navigation labels, tags |

### Text Styling

- **Tracking**: `-0.015em` for headings (tight)
- **Leading**: `tight` for headings, `relaxed` for body
- **Anti-aliasing**: Always enabled
- **Selection**: Primary background with white text

---

## Spacing & Layout

### Container

- **Max Width**: `480px` (mobile-first)
- **Padding**: `20px` (px-5) horizontal on main content
- **Bottom Spacing**: `96px` (pb-24) to accommodate floating nav

### Spacing Scale

- **xs**: `4px`
- **sm**: `8px`
- **md**: `12px`
- **lg**: `16px`
- **xl**: `24px`
- **2xl**: `32px`
- **3xl**: `48px`

### Content Gaps

- Section gap: `24px` (gap-6)
- Card gap: `16px` (gap-4)
- Element gap: `12px` (gap-3)
- Tight gap: `8px` (gap-2)

---

## Border Radius

| Size | Value | Usage |
|------|-------|-------|
| **Default** | `16px` (1rem) | Standard cards, inputs |
| **Large** | `24px` (1.5rem) | Large cards, hero sections |
| **XL** | `32px` (2rem) | Special containers |
| **2XL** | `40px` (2.5rem) | Bottom nav, rounded sections |
| **Full** | `9999px` | Pills, avatars, buttons, badges |

---

## Shadows & Elevation

### Shadow Types

```css
/* Soft Shadow - Subtle elevation */
shadow-soft: 0 4px 20px -2px rgba(0, 0, 0, 0.05)
Usage: Cards, floating elements

/* Card Shadow - Very subtle */
shadow-card: 0 2px 10px rgba(0, 0, 0, 0.03)
Usage: List items, module cards

/* Glow Effect - Primary color */
shadow-glow: 0 0 15px rgba(13, 204, 242, 0.3)
Usage: Primary CTA buttons, active elements

/* Bottom Nav Shadow */
shadow: 0 -5px 20px -5px rgba(0, 0, 0, 0.1)
Usage: Bottom navigation only
```

### Elevation Levels

- **Level 0**: No shadow (flat elements)
- **Level 1**: `shadow-sm` (subtle hover states)
- **Level 2**: `shadow-card` (resting cards)
- **Level 3**: `shadow-soft` (elevated cards)
- **Level 4**: `shadow-2xl` (floating nav, modals)

---

## Component Patterns

### Cards

**Standard Card:**
- Background: `surface-light` / `surface-dark`
- Border: `1px solid #E5E7EB` (light) / `#374151` (dark)
- Radius: `16px` (rounded-2xl)
- Padding: `16px` (p-4)
- Shadow: `shadow-soft` or `shadow-card`

**Active/Current Card:**
- Border: `2px solid primary/20`
- Left accent: `6px primary` vertical bar
- Enhanced shadow

**Locked Card:**
- Background: Reduced opacity (60%)
- Border: Dashed `#D1D5DB`
- Icon: Gray lock

### Buttons

**Primary CTA (Large):**
```
Height: 64px (h-16)
Background: Linear gradient with primary
Border radius: Full (rounded-full)
Shadow: Glow effect
Text: 20px, bold, white
Icon: 28px
Hover: Darker primary, scale
Active: scale-95
```

**Secondary Button:**
```
Background: Transparent or primary/10
Text: Primary color
Hover: Background opacity increase
```

**Icon Button:**
```
Size: 40px (size-10)
Rounded: Full
Background: White/card-dark
Hover: Gray background
Active: Scale animation
```

### Pills & Badges

**Stat Pill (Streak/Currency):**
```
Padding: 12px horizontal, 6px vertical
Rounded: Full
Background: White with subtle border
Icon + Text combination
Icon: 18px
Text: 14px, bold
Shadow: Subtle
```

**Tag/Label:**
```
Padding: 8px horizontal, 4px vertical
Rounded: md
Background: Primary/10 or gray/10
Text: 12px, bold, uppercase
```

### Avatars

**Profile Avatar:**
```
Size: 48px (size-12)
Rounded: Full
Border: 2px white ring
Shadow: Subtle
Status indicator: 16px dot, absolute positioned
```

**Mascot/Bot Avatar:**
```
Size: 48px
Rounded: Full
Border: 2px white
Glow: Pulsing primary/30 background
```

### Navigation

**Bottom Navigation (Floating):**
```
Position: Fixed bottom with centered offset
Width: calc(100% - 40px)
Max Width: 440px
Background: Surface with border
Rounded: Full (rounded-full)
Padding: 24px horizontal, 12px vertical
Shadow: Heavy (shadow-2xl)
Items: Icon + Label, vertical stack
Active State: Primary background pill, primary text
```

### Progress Indicators

**Progress Bar:**
```
Height: 12px
Background: background-light/dark
Fill: Primary gradient
Rounded: Full
Transition: Smooth (duration-1000)
Label: Percentage on right
```

**Streak Counter:**
```
Display: Horizontal pill
Icon: Fire emoji or icon
Number: Bold
Animation: Subtle pulse on update
```

---

## Icons

### Icon System

- **Library**: Material Symbols Outlined
- **Default Weight**: 500
- **Fill**: 1 (filled icons)
- **Optical Size**: 24px

### Icon Sizes

- **Small**: 18-20px (navigation labels, inline)
- **Medium**: 24px (standard UI)
- **Large**: 28px (primary CTAs)
- **XLarge**: 32px+ (hero sections)

### Common Icons

- Home: `home`
- Play: `play_arrow` / `play_circle`
- Music: `music_note` / `queue_music`
- Lock: `lock`
- Check: `check`
- Fire (Streak): `local_fire_department`
- Profile: `person`
- Leaderboard: `leaderboard`
- Back: `arrow_back`
- More: `more_vert`

---

## Animations & Transitions

### Standard Transitions

```css
Hover: transition-colors duration-300
Scale: transition-transform duration-300
Active: scale-95
Shadow: transition-shadow duration-300
Background: transition-all duration-300
```

### Special Animations

**Bounce (Speech Bubble):**
```
Animation: bounce
Duration: 3000ms
```

**Spin (Vinyl Record):**
```
Animation: spin (slow)
Duration: 20s
Linear infinite
```

**Pulse (Mascot Glow):**
```
Animation: pulse
Blur effect on background
```

**Scale on Hover:**
```
Transform: scale(1.05)
Duration: 500ms
Easing: ease-out
```

---

## Dark Mode

### Implementation

- Theme toggle: `class="dark"` on `<html>`
- All colors use semantic tokens
- Dark mode uses adjusted opacity and blur
- Borders become more subtle
- Shadows use lighter values

### Dark Mode Adjustments

- Reduce saturation slightly
- Use blur effects more liberally
- Lighter borders (white/5-10%)
- Softer shadows

---

## Accessibility

### Contrast Ratios

- Text on background: Minimum 4.5:1
- Large text: Minimum 3:1
- Interactive elements: Clear focus states
- Icons: Paired with labels when possible

### Touch Targets

- Minimum: 44x44px
- Buttons: 48px+ height recommended
- Navigation items: 40px+

### Focus States

- Ring: 2px primary color
- Offset: 2px
- Rounded to match element

---

## Layout Patterns

### Screen Structure

```
┌─────────────────────────┐
│  Sticky Header (90%)    │ ← Blurred background
├─────────────────────────┤
│                         │
│   Scrollable Content    │
│   (Main)                │
│                         │
│                         │
│                         │
├─────────────────────────┤
│  Floating Bottom Nav    │ ← Fixed, rounded
└─────────────────────────┘
```

### Content Patterns

**Hero Section:**
- Large visual (mascot, album art)
- Gradient background
- Floating CTA overlapping bottom
- Speech bubble (optional)

**List Pattern (Path/Modules):**
- Vertical timeline with connecting line
- Icons as nodes
- Cards for each item
- State indicators (active, locked, completed)

**Header Pattern:**
- Avatar + Greeting
- Stats pills on right
- Sticky with blur backdrop

---

## Special Effects

### Glassmorphism

```
Background: surface/90 (90% opacity)
Backdrop: blur-md
Border: Subtle
```

### Gradient Overlays

```
From: Lighter primary tint
To: Background color
Direction: Top to bottom
Usage: Hero sections, mascot containers
```

### Vinyl Record Effect

```
Rotating disc
Center hole
Shadow/glow underneath
Slow infinite spin
```

---

## Responsive Behavior

### Breakpoints

- **Mobile First**: Base styles for 320px+
- **Max Width**: 480px container
- **Tablet**: Centered with shadows
- **Desktop**: Remains mobile-sized, centered

### Safe Areas

- Top: Account for notch (pt-6)
- Bottom: 96px for floating nav
- Horizontal: 20px padding minimum

---

## Code References

For implementation examples, see:
- `sample-homescreen.html` - Home screen patterns
- `sample-learning-dashboard.html` - Dashboard patterns

---

## Design Tokens (for React Native)

When implementing in React Native:

- Use `StyleSheet.create()` for static styles
- Extract colors to theme file
- Use `Platform.select()` for iOS/Android differences
- Implement dark mode with `useColorScheme()`
- Use `Animated` API for transitions
- Shadows: Use `elevation` (Android) and `shadowColor` (iOS)
