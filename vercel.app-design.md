---
version: alpha
name: Vercel Minimal
description: A clean, high-contrast developer system with spacious layouts, rounded pill controls, and restrained monochrome structure.
colors:
  primary: "#171717"
  secondary: "#6B7280"
  tertiary: "#FFFFFF"
  neutral: "#FAFAFA"
  surface: "#FFFFFF"
  on-surface: "#171717"
  error: "#DC2626"
  border: "#E5E7EB"
  muted: "#F3F4F6"
  accent: "#000000"
typography:
  headline-display:
    fontFamily: Geist
    fontSize: 35px
    fontWeight: 600
    lineHeight: 46.0687px
    letterSpacing: -1.945px
  headline-lg:
    fontFamily: Geist
    fontSize: 29px
    fontWeight: 500
    lineHeight: 35px
    letterSpacing: -0.28px
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: 500
    lineHeight: 32px
    letterSpacing: -0.96px
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0px
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  label-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 500
    lineHeight: 24px
    letterSpacing: 0px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 500
    lineHeight: 20px
    letterSpacing: 0px
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 0px
  caption:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: 0px
  link-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 20px
  full: 9999px
spacing:
  xs: 2px
  sm: 10px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 198px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.tertiary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "13px 14px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.tertiary}"
    rounded: "{rounded.full}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "13px 14px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: "0px"
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.full}"
    padding: "13px 14px"
  chip:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: "6px 10px"
---

# Vercel Minimal

## Overview
This system feels modern, spare, and highly engineered, with a strong developer-first tone. The composition is spacious and centered, balancing editorial headline treatment with practical product marketing. It favors clarity over ornament: high contrast, soft neutrals, and pill-shaped controls keep the interface approachable while still feeling premium.

## Colors
- **Primary (#171717):** The core ink tone used for the strongest text, prominent buttons, and key contrast moments. It reads as near-black without feeling harsh.
- **Secondary (#6B7280):** A muted gray for supporting copy, navigation labels, and secondary information. It preserves hierarchy without drawing attention away from primary actions.
- **Tertiary (#FFFFFF):** Pure white used for text on dark buttons and for clean card/button surfaces.
- **Neutral (#FAFAFA):** The main page canvas and card base, creating a bright, airy backdrop that lets the content and hero graphic breathe.
- **Surface (#FFFFFF):** Elevated white used for controls, inputs, and plain surfaces that need to sit above the background.
- **On-surface (#171717):** The default readable text color on light surfaces; it anchors the system’s monochrome voice.
- **Border (#E5E7EB):** A soft divider and outline color for cards, buttons, and subtle structure. It is visible but intentionally understated.
- **Muted (#F3F4F6):** A gentle pale gray for hover states, chips, or low-emphasis containers.
- **Error (#DC2626):** A clear alert color reserved for validation and destructive states; it should remain rare.
- **Accent (#000000):** True black for the most severe contrast points and experimental use, though the interface typically prefers the softer `primary`.

## Typography
Geist is the exclusive voice of the interface: crisp, contemporary, and highly legible. Headlines use tighter tracking and heavier weight to create a confident editorial presence, while body text stays regular-weight and comfortable for longer reading. Labels and button text lean medium-weight to feel actionable without becoming visually loud.

- `headline-display` and `headline-lg` are for hero messaging and major section titles.
- `headline-md` and `headline-sm` support subordinate headings, card titles, and feature callouts.
- `body-lg` and `body-md` handle paragraph copy, product descriptions, and supporting marketing text.
- `body-sm` and `caption` are for tertiary metadata, disclaimers, and compact helper text.
- `label-md` and `label-sm` are used for buttons, pills, nav items, and compact UI controls.
- The style is mostly sentence case; there is no strong uppercase convention, and letter spacing remains subtle rather than decorative.

## Layout & Spacing
The layout is centered and fixed-feeling rather than fully fluid, with a generous content column and large surrounding whitespace. Vertical rhythm is based on a small set of clean increments: 2px for fine tuning, 10px for tight gaps, 16px and 24px for routine composition, and 40px for larger separations. A very large gutter value supports the broad hero framing and the immersive visual block below the fold.

Section padding is generous and symmetrical, especially around the hero and feature areas. Cards and controls avoid cramped edges, using compact but breathable internal padding. The overall impression is a highly structured marketing page with enough whitespace to emphasize typography and product imagery.

## Elevation & Depth
The interface is intentionally flat. Instead of heavy shadows, hierarchy comes from contrast, thin borders, and tonal separation between background, surface, and text. Subtle inset or outline treatment is used sparingly, and most depth is created by spacing and placement rather than layering.

Buttons and cards may use a faint border or minimal shadow, but the system avoids dramatic elevation. This keeps the page feeling fast, technical, and modern.

## Shapes
The shape language is soft and rounded, especially for interactive elements. Buttons, pills, and inputs use fully rounded ends, giving the interface a calm, polished feel even when the content is dense. Cards use a smaller radius for a quieter architectural frame, while most other edges remain clean and simple.

Overall, the system blends precision with friendliness: geometric structure underneath, rounded controls on top.

## Components
Buttons are the most expressive component in the system.

- **Primary buttons (`button-primary`):** Dark filled pills with white text. Use them for the main call to action, such as “Start Deploying.” They should be compact, around 40px tall, with medium-weight label text and full rounding.
- **Secondary buttons (`button-secondary`):** White filled pills with a subtle border/outline feel. Use them for alternate actions like “Get a Demo.” They should match the primary button’s size and padding for visual parity.
- **Hover states (`button-primary-hover`, `button-secondary-hover`):** Keep transitions restrained; the system prefers slight tonal changes over large motion or shadow effects.
- **Link buttons (`button-link`):** Plain text links with underline treatment for low-emphasis navigation or inline actions.

Cards (`card`) are simple, bordered containers with `rounded.sm`, `padding: 16px`, and no obvious shadow. Use them for feature blocks, testimonials, or compact content groupings. They should feel like panels rather than floating surfaces.

Inputs follow the same soft pill geometry as buttons, with white surfaces, subtle outlines, and comfortable internal padding. Avoid hard corners or oversized field chrome.

Chips are small rounded badges for tags like the “Events” pill in the hero. They should be lightweight, low-contrast, and use `label-sm` text.

Navigation items should stay understated: medium-sized labels, minimal decoration, and strong spacing rather than heavy styling. If an icon is present, keep it small and secondary to the text.

## Do's and Don'ts
- Do keep the interface monochrome first, with color used sparingly for emphasis and illustration.
- Do use Geist across all text styles to preserve the system’s unified voice.
- Do rely on spacing, alignment, and typography for hierarchy before adding shadows or borders.
- Do keep primary actions in full-rounded dark pills and secondary actions in matching white pills.
- Don't introduce bright brand colors into core UI chrome unless they are clearly non-structural accents.
- Don't use sharp corners on buttons or inputs; the rounded pill language is a defining feature.
- Don't add heavy shadows, glass effects, or dense gradients to standard components.
- Don't over-decorate labels with uppercase or wide tracking; the style is restrained and editorial.