# Card Surface Design

## Goal

Unify all card-like surfaces in the mini program around the selected A direction: the current light card language with white surfaces, visible-but-restrained gradients, fine borders, and restrained shadows.

## Decision

Do not import or copy the Gitee liquid-glass CSS. The referenced repository is GPL-2.0, and the selected A direction is visually the existing light card style rather than the stronger liquid-glass treatment.

## Scope

Update card-like WXSS selectors across the app:

- Global surfaces: `.card`, `.hero-panel`, `.input-card`
- Independent page surfaces: `.mode-card`, `.upload-panel`, `.model-note`, `.risk-block`, `.profile-card`, `.lawyer-hero`, `.contact-card`, `.stat-strip`
- Page-specific variants that currently override background should keep their layout and content behavior while using the same light surface tokens.

## Visual Rules

- Background uses a near-white vertical gradient plus a visible blue/slate diagonal tint.
- Border uses `#e5eaf3` or the active-state color when selected.
- Shadow uses a soft slate shadow, never `box-shadow: none` on card-like surfaces.
- Radius stays at `16rpx` for app cards to match the existing visual system.
- Active mode cards can keep a stronger blue border and blue-tinted shadow.

## Testing

Add a Node-based stylesheet test that parses app and page WXSS text and verifies that core card-like selectors include the approved surface traits. Keep existing data and route tests passing.
