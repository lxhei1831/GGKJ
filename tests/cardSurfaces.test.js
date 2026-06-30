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
  assertLiquidGlassBackground(file, selector)
  assert(block.includes('border: 1rpx double rgba(51, 65, 85, 0.16)'), `${selector} should use a source-inspired double refractive edge`)
  assert(block.includes('backdrop-filter: blur(12px) saturate(150%)'), `${selector} should blur the backdrop like glass`)
  assert(block.includes('-webkit-backdrop-filter: blur(12px) saturate(150%)'), `${selector} should include the WebKit backdrop blur`)
  assert(block.includes('inset 2rpx -2rpx 1rpx -1rpx rgba(255, 255, 255, 0.92)'), `${selector} should include the bright inner glass edge`)
  assert(block.includes('inset 0 0 3rpx rgba(15, 23, 42, 0.28)'), `${selector} should include inner depth`)
  assert(!block.includes('box-shadow: none'), `${selector} should not remove card depth`)
}

function assertLiquidGlassBackground(file, selector) {
  const block = selectorBlock(read(file), selector)
  assert(block.includes('linear-gradient(45deg'), `${selector} should include the liquid-glass diagonal highlight`)
  assert(block.includes('rgba(255, 255, 255, 0.44)'), `${selector} should use a translucent glass base`)
}

function assertPageShellGradient() {
  const block = selectorBlock(read('app.wxss'), '.page-shell')
  assert(block.includes('radial-gradient'), '.page-shell should use a more visible ambient gradient')
  assert(block.includes('#e4efff'), '.page-shell should include a stronger blue base stop')
}

assertPageShellGradient()
assertLiquidGlassSurface('app.wxss', '.card')
assertLiquidGlassSurface('app.wxss', '.hero-panel')
assertLiquidGlassSurface('app.wxss', '.input-card')
assertLiquidGlassSurface('pages/profile/profile.wxss', '.profile-card')
assertLiquidGlassSurface('pages/lawyer/lawyer.wxss', '.lawyer-hero')
assertLiquidGlassSurface('pages/lawyer/lawyer.wxss', '.contact-card')
assertLiquidGlassBackground('pages/case-detail/case-detail.wxss', '.case-detail-hero')

;[
  ['pages/index/index.wxss', '.action-card'],
  ['pages/index/index.wxss', '.case-card'],
  ['pages/case-detail/case-detail.wxss', '.case-detail-hero'],
  ['pages/detect/detect.wxss', '.detect-hero'],
  ['pages/detect/detect.wxss', '.mode-card'],
  ['pages/detect/detect.wxss', '.mode-card-active'],
  ['pages/detect/detect.wxss', '.upload-panel'],
  ['pages/detect/detect.wxss', '.model-note'],
  ['pages/detect/detect.wxss', '.risk-block'],
  ['pages/tro/tro.wxss', '.tro-hero'],
  ['pages/tro/tro.wxss', '.lawyer-service-card'],
  ['pages/tro/tro.wxss', '.brand-library'],
  ['pages/tools/tools.wxss', '.tools-hero'],
  ['pages/tools/tools.wxss', '.tool-card'],
  ['pages/tools/tools.wxss', '.assistant-card'],
  ['pages/profile/profile.wxss', '.summary-card'],
  ['pages/profile/profile.wxss', '.contact-card'],
].forEach(([file, selector]) => assertLiquidGlassBackground(file, selector))
