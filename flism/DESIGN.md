---
name: Flism
colors:
  surface: '#fcf8f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf8f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0edec'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#434656'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#737688'
  outline-variant: '#c3c5d9'
  surface-tint: '#004ced'
  primary: '#003ec7'
  on-primary: '#ffffff'
  primary-container: '#0052ff'
  on-primary-container: '#dfe3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#006875'
  on-secondary: '#ffffff'
  secondary-container: '#00e3fd'
  on-secondary-container: '#00616d'
  tertiary: '#484f56'
  on-tertiary: '#ffffff'
  tertiary-container: '#60676e'
  on-tertiary-container: '#dfe6ee'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001452'
  on-primary-fixed-variant: '#0038b6'
  secondary-fixed: '#9cf0ff'
  secondary-fixed-dim: '#00daf3'
  on-secondary-fixed: '#001f24'
  on-secondary-fixed-variant: '#004f58'
  tertiary-fixed: '#dce3eb'
  tertiary-fixed-dim: '#c0c7cf'
  on-tertiary-fixed: '#151c22'
  on-tertiary-fixed-variant: '#40484e'
  background: '#fcf8f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.05em
  action-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 120px
---

## Brand & Style

This design system is engineered for the next generation of financial autonomy. It balances the high-energy "Electric Light Blue" of a tech-native start-up with the clinical "White" of a trusted institution. The aesthetic is rooted in **Modern Minimalism** with a **High-Contrast** edge to ensure every interaction feels instantaneous and deliberate.

The visual narrative focuses on "Velocity and Clarity." By stripping away unnecessary ornamentation and utilizing vast whitespace, we create a safe environment where university students can manage capital without cognitive overwhelm. The style is fast, confident, and unapologetically digital, evoking the precision of a high-end fintech tool while maintaining a welcoming, student-centric freshness.

## Colors

The palette is anchored by **Electric Blue** (#00E5FF) and **Action Blue** (#0052FF). The Action Blue is reserved for primary conversions, providing a stable, high-contrast anchor against white surfaces. Electric Blue is used as a highlight and brand accent to inject energy and "speed" into the interface.

**Surface Strategy:**
- **Primary Surface:** Pure #FFFFFF (White) for a crisp, medical-grade cleanliness.
- **Secondary Surface:** #F0F7FF (Soft Blue) used for background containers to differentiate information blocks without adding visual weight.
- **Text:** High-contrast #0A0A0A for maximum readability, ensuring safety and legibility in all lighting conditions (e.g., walking to class).

## Typography

This design system utilizes **Plus Jakarta Sans** exclusively to maintain a cohesive, modern, and friendly identity. The typographic scale is aggressive; headlines are heavy and tightly spaced to communicate confidence and "Financial Power."

**Usage Guidelines:**
- **Headlines:** Use ExtraBold (800) for hero sections and Bold (700) for standard page titles. Negative letter spacing is essential at large sizes to maintain the "fast" aesthetic.
- **Body:** Regular (400) weight ensures high legibility for transaction histories and terms.
- **Labels:** Use Bold (700) with a slight tracking increase for micro-copy and section headers to provide clear structural signposts.

## Layout & Spacing

The layout philosophy is built on a **12-column fluid grid** for desktop and a **4-column grid** for mobile. We utilize a strict 8px spacing rhythm to ensure mathematical harmony across all components.

**Key Principles:**
- **Generous Margins:** Large horizontal margins on desktop (120px) focus the user's attention on the central financial data, mirroring the focus-driven lifestyle of a student.
- **Vertical Rhythm:** Use the `lg` (48px) and `xl` (80px) units to separate major content sections, preventing the "cluttered dashboard" look common in legacy banking.
- **Density:** While the overall layout is airy, functional groups (like card details or transaction rows) should use `sm` (12px) spacing to feel tightly coupled and efficient.

## Elevation & Depth

To maintain a clean, minimalist vibe, this design system avoids heavy, muddy shadows. Instead, it utilizes **Tonal Layers** and **Subtle Glassmorphism** to create depth.

- **The Ground:** The base layer is always pure white or the soft blue background tint.
- **Elevated Surfaces:** Use a "High-Contrast Outline" approach—1px borders in a very light blue-gray (#E2E8F0) rather than shadows for secondary containers.
- **Active State Depth:** For primary buttons and "Active" cards, use a vibrant, tinted glow: an Electric Blue shadow with 20% opacity and a high blur radius (20px-40px). This makes the element appear to emit light, reinforcing the "Electric" brand theme.
- **Overlays:** Modals and bottom sheets should use a 20px backdrop blur to maintain context while keeping the focus on the foreground action.

## Shapes

The shape language is defined by **Medium Roundedness**. A corner radius of `0.5rem` (8px) is the standard for cards and input fields, striking a balance between the "sharpness" of high-speed finance and the "softness" required for an approachable student brand.

**Standardized Radii:**
- **Buttons & Inputs:** `0.5rem` (rounded) for a precise, modern feel.
- **Large Cards:** `1rem` (rounded-lg) to provide a soft container for complex data.
- **Chips/Badges:** `3rem` (pill-shaped) to distinguish them from actionable buttons and interactive cards.

## Components

**Buttons:**
- **Primary:** Background in `Action Blue`, text in `White`. No border. High-energy hover state using the `Electric Blue` glow.
- **Secondary:** Transparent background, `Action Blue` 1.5px border, and `Action Blue` text.

**Input Fields:**
- High-contrast white background with a 1px soft blue border. On focus, the border transitions to `Electric Blue` with a subtle outer glow to signify "Speed/Readiness."

**Cards (The "Balance" Card):**
- Should be the most visually striking element. Use a gradient from `Action Blue` to `Electric Blue`. Typography inside should be White (Headline-lg) to ensure the balance is the first thing seen.

**Transaction Lists:**
- Clean, borderless rows with `body-md` text. Icons should be simplified, utilizing the `Electric Blue` for positive cash flow and `Neutral` for expenses. Avoid red where possible to reduce student anxiety; use weight and contrast for warnings instead.

**Progress Bars:**
- Used for savings goals. Background in `Soft Blue` with a high-contrast `Electric Blue` fill to visualize "charging up" a goal.