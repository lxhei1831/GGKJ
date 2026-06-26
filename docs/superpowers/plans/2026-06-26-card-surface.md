# Liquid Glass Card Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply source-inspired liquid glass styling consistently to all card-like mini program surfaces.

**Architecture:** Keep the styling centralized in WXSS by treating `app.wxss` as the global liquid-glass surface source and page WXSS files as variant overrides. Add a small Node test that guards the approved liquid-glass traits so future page-specific styles do not silently fall back to flat panels.

**Tech Stack:** WeChat mini program WXML/WXSS, Node.js assertion tests.

---

## File Structure

- Create `tests/cardSurfaces.test.js` to validate liquid-glass card surface declarations in WXSS.
- Modify `app.wxss` for global `.card`, `.hero-panel`, and `.input-card` surface tokens.
- Modify page WXSS files where independent card-like selectors currently bypass the global card style.
- Modify or create `.gitignore` to keep `.superpowers/` preview artifacts out of source control.

### Task 1: Liquid Glass Surface Regression Test

**Files:**
- Create: `tests/cardSurfaces.test.js`

- [ ] **Step 1: Write the failing test**

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

function selectorBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'))
  assert(match, `${selector} should exist`)
  return match[1]
}

function assertLiquidGlassSurface(file, selector) {
  const block = selectorBlock(read(file), selector)
  assert(block.includes('linear-gradient(45deg'), `${selector} should include the liquid-glass diagonal highlight`)
  assert(block.includes('rgba(255, 255, 255, 0.44)'), `${selector} should use a translucent glass base`)
  assert(block.includes('border: 1rpx double rgba(51, 65, 85, 0.16)'), `${selector} should use a source-inspired double refractive edge`)
  assert(block.includes('backdrop-filter: blur(12px) saturate(150%)'), `${selector} should blur the backdrop like glass`)
  assert(!block.includes('box-shadow: none'), `${selector} should not remove card depth`)
}

assertLiquidGlassSurface('app.wxss', '.card')
assertLiquidGlassSurface('app.wxss', '.hero-panel')
assertLiquidGlassSurface('app.wxss', '.input-card')
assertLiquidGlassSurface('pages/profile/profile.wxss', '.profile-card')
assertLiquidGlassSurface('pages/lawyer/lawyer.wxss', '.lawyer-hero')
assertLiquidGlassSurface('pages/risk-detail/risk-detail.wxss', '.stat-strip')
assertLiquidGlassSurface('pages/lawyer/lawyer.wxss', '.contact-card')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests\cardSurfaces.test.js`

Expected: fail because the current card selectors do not all include liquid-glass highlights, backdrop blur, double borders, and inset edge shadows.

### Task 2: Apply Shared Liquid Glass Surface

**Files:**
- Modify: `app.wxss`
- Modify: `pages/profile/profile.wxss`
- Modify: `pages/lawyer/lawyer.wxss`
- Modify: `pages/risk-detail/risk-detail.wxss`
- Modify: `.gitignore`

- [ ] **Step 1: Update global surfaces**

Ensure `.card`, `.hero-panel`, and `.input-card` use the self-authored liquid-glass material: translucent base, diagonal highlight, double border, inset edge shadows, outer depth, and backdrop blur.

- [ ] **Step 2: Update independent page cards**

Change `.profile-card`, `.lawyer-hero`, `.stat-strip`, and `.contact-card` so they match the same liquid-glass material and do not use `box-shadow: none`.

- [ ] **Step 3: Ignore visual companion artifacts**

Add `.superpowers/` to `.gitignore` so local preview screens are not accidentally committed.

- [ ] **Step 4: Run the card surface test**

Run: `node tests\cardSurfaces.test.js`

Expected: pass with exit code 0.

### Task 3: Full Verification

**Files:**
- Test: `tests/riskDetails.test.js`
- Test: `tests/riskDetailRoute.test.js`
- Test: `tests/cardSurfaces.test.js`

- [ ] **Step 1: Run all project tests**

Run:

```powershell
node tests\riskDetails.test.js
node tests\riskDetailRoute.test.js
node tests\cardSurfaces.test.js
```

Expected: all commands exit 0.
