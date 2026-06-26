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
  const blueTint = block.match(/rgba\(37,\s*99,\s*235,\s*([0-9.]+)\)/)
  assert(block.includes('rgba(255, 255, 255, 0.99)'), `${selector} should keep the selected A white surface`)
  assert(block.includes('linear-gradient(135deg'), `${selector} should include a subtle directional tint`)
  assert(blueTint, `${selector} should include a blue base gradient`)
  assert(Number(blueTint[1]) >= 0.06, `${selector} should make the blue base gradient visible`)
  assert(block.includes('border: 1rpx solid #e5eaf3'), `${selector} should use the shared fine border`)
  assert(/box-shadow:\s*0\s+(8|10)rpx\s+(22|26)rpx\s+rgba\(15,\s*23,\s*42,\s*0\.0(35|5)\)/.test(block), `${selector} should use the shared soft slate shadow`)
  assert(!block.includes('box-shadow: none'), `${selector} should not remove card depth`)
}

function assertPageShellGradient() {
  const block = selectorBlock(read('app.wxss'), '.page-shell')
  assert(block.includes('radial-gradient'), '.page-shell should use a more visible ambient gradient')
  assert(block.includes('#e4efff'), '.page-shell should include a stronger blue base stop')
}

assertPageShellGradient()
assertLightSurface('app.wxss', '.card')
assertLightSurface('app.wxss', '.hero-panel')
assertLightSurface('app.wxss', '.input-card')
assertLightSurface('pages/profile/profile.wxss', '.profile-card')
assertLightSurface('pages/lawyer/lawyer.wxss', '.lawyer-hero')
assertLightSurface('pages/risk-detail/risk-detail.wxss', '.stat-strip')
assertLightSurface('pages/lawyer/lawyer.wxss', '.contact-card')
