# Card Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the selected A card direction consistently to all card-like mini program surfaces.

**Architecture:** Keep the styling centralized in WXSS by treating `app.wxss` as the global surface source and page WXSS files as variant overrides. Add a small Node test that guards the approved card surface traits so future page-specific styles do not silently fall back to flat panels.

**Tech Stack:** WeChat mini program WXML/WXSS, Node.js assertion tests.

---

## File Structure

- Create `tests/cardSurfaces.test.js` to validate approved card surface declarations in WXSS.
- Modify `app.wxss` for global `.card`, `.hero-panel`, and `.input-card` surface tokens.
- Modify page WXSS files where independent card-like selectors currently bypass the global card style.
- Modify or create `.gitignore` to keep `.superpowers/` preview artifacts out of source control.

### Task 1: Card Surface Regression Test

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

function assertLightSurface(file, selector) {
  const block = selectorBlock(read(file), selector)
  assert(block.includes('rgba(255, 255, 255, 0.99)'), `${selector} should keep the selected A white surface`)
  assert(block.includes('linear-gradient(135deg'), `${selector} should include a subtle directional tint`)
  assert(block.includes('border: 1rpx solid #e5eaf3'), `${selector} should use the shared fine border`)
  assert(/box-shadow:\s*0\s+(8|10)rpx\s+(22|26)rpx\s+rgba\(15,\s*23,\s*42,\s*0\.0(35|5)\)/.test(block), `${selector} should use the shared soft slate shadow`)
  assert(!block.includes('box-shadow: none'), `${selector} should not remove card depth`)
}

assertLightSurface('app.wxss', '.card')
assertLightSurface('app.wxss', '.hero-panel')
assertLightSurface('app.wxss', '.input-card')
assertLightSurface('pages/profile/profile.wxss', '.profile-card')
assertLightSurface('pages/lawyer/lawyer.wxss', '.lawyer-hero')
assertLightSurface('pages/risk-detail/risk-detail.wxss', '.stat-strip')
assertLightSurface('pages/lawyer/lawyer.wxss', '.contact-card')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests\cardSurfaces.test.js`

Expected: fail because `.profile-card`, `.lawyer-hero`, `.stat-strip`, and `.contact-card` do not all include the shared A shadow and/or exact surface traits.

### Task 2: Apply Shared Light Card Surface

**Files:**
- Modify: `app.wxss`
- Modify: `pages/profile/profile.wxss`
- Modify: `pages/lawyer/lawyer.wxss`
- Modify: `pages/risk-detail/risk-detail.wxss`
- Modify: `.gitignore`

- [ ] **Step 1: Update global surfaces**

Ensure `.card`, `.hero-panel`, and `.input-card` keep the selected A material: near-white gradient, faint directional tint, `#e5eaf3` border, and soft slate shadow.

- [ ] **Step 2: Update independent page cards**

Change `.profile-card`, `.lawyer-hero`, `.stat-strip`, and `.contact-card` so they match the same A material and do not use `box-shadow: none`.

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
