# Liquid Glass Card Surface Design

## Goal

Unify all card-like surfaces in the mini program around a source-inspired liquid glass treatment: translucent surfaces, diagonal highlights, refractive inner edges, backdrop blur, and stronger depth.

## Decision

Do not import or copy the Gitee liquid-glass CSS verbatim. The referenced repository is GPL-2.0, so the project uses a self-authored WXSS implementation that recreates the visual ingredients: translucent base layers, multi-layer highlights, double borders, inset edge shadows, and backdrop blur.

## Scope

Update card-like WXSS selectors across the app:

- Global surfaces: `.card`, `.hero-panel`, `.input-card`
- Independent page surfaces: `.mode-card`, `.upload-panel`, `.model-note`, `.risk-block`, `.profile-card`, `.lawyer-hero`, `.contact-card`, `.stat-strip`
- Page-specific variants that currently override background should keep their layout and content behavior while using the same light surface tokens.

## Visual Rules

- Background uses a 45-degree white highlight, a radial top-left sheen, a translucent white base layer, and a blue/slate diagonal tint.
- Border uses a `double` refractive edge, with active-state cards allowed to strengthen the blue edge.
- Shadow uses multiple inset highlights plus outer depth, never `box-shadow: none` on card-like surfaces.
- Backdrop blur uses both standard and WebKit-prefixed properties for broader mini program WebView coverage.
- Radius stays at `16rpx` for app cards to match the existing visual system.
- Active mode cards can keep a stronger blue border and blue-tinted shadow.

## Testing

Add a Node-based stylesheet test that parses app and page WXSS text and verifies that core card-like selectors include liquid-glass traits. Keep existing data and route tests passing.
