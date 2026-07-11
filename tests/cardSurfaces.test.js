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

function assertWebAlignedSurface(file, selector) {
  const block = selectorBlock(read(file), selector)
  assertWebAlignedBackground(file, selector)
  assert(block.includes('border: 1rpx solid rgba(148, 163, 184, 0.26)'), `${selector} should use the web app's light slate border`)
  assert(block.includes('box-shadow: 0 12rpx 30rpx rgba(37, 99, 235, 0.08)'), `${selector} should use the web app's lighter blue-tinted shadow`)
  assert(!block.includes('1rpx double'), `${selector} should not keep the old refractive double border`)
  assert(!block.includes('backdrop-filter'), `${selector} should not keep the old heavy glass blur`)
  assert(!block.includes('inset 2rpx'), `${selector} should not keep the old inner glass edge`)
}

function assertWebAlignedBackground(file, selector) {
  const block = selectorBlock(read(file), selector)
  assert(block.includes('#ffffff'), `${selector} should use a clean white base like the web app`)
  assert(block.includes('#f3f9ff') || block.includes('#f8fbff') || block.includes('#fff7ed'), `${selector} should include the web app's pale blue/orange tint`)
  assert(!block.includes('linear-gradient(45deg'), `${selector} should not keep the old diagonal liquid-glass highlight`)
  assert(!block.includes('rgba(255, 255, 255, 0.44)'), `${selector} should not keep the old translucent glass base`)
}

function assertPageShellGradient() {
  const block = selectorBlock(read('app.wxss'), '.page-shell')
  assert(block.includes('radial-gradient'), '.page-shell should use a more visible ambient gradient')
  assert(block.includes('#eef7ff'), '.page-shell should include the web app pale blue stop')
  assert(block.includes('#fff8ed'), '.page-shell should include the web app pale orange stop')
}

assertPageShellGradient()
assertWebAlignedSurface('app.wxss', '.card')
assertWebAlignedSurface('app.wxss', '.hero-panel')
assertWebAlignedSurface('app.wxss', '.input-card')
assertWebAlignedSurface('pages/profile/profile.wxss', '.profile-card')
assertWebAlignedSurface('pages/lawyer/lawyer.wxss', '.lawyer-hero')
assertWebAlignedSurface('pages/lawyer/lawyer.wxss', '.contact-card')
assertWebAlignedBackground('pages/case-detail/case-detail.wxss', '.case-detail-hero')

;[
  ['pages/index/index.wxss', '.quick-detect-card'],
  ['pages/index/index.wxss', '.case-card'],
  ['pages/case-detail/case-detail.wxss', '.case-detail-hero'],
  ['pages/detect/detect.wxss', '.detect-hero'],
  ['pages/detect/detect.wxss', '.mode-card'],
  ['pages/detect/detect.wxss', '.mode-card-active'],
  ['pages/detect/detect.wxss', '.upload-panel'],
  ['pages/detect/detect.wxss', '.risk-block'],
  ['pages/tro/tro.wxss', '.tro-hero'],
  ['pages/tro/tro.wxss', '.lawyer-service-card'],
  ['pages/tools/tools.wxss', '.tools-hero'],
  ['pages/tools/tools.wxss', '.assistant-card'],
  ['pages/profile/profile.wxss', '.summary-card'],
  ['pages/profile/profile.wxss', '.contact-card'],
].forEach(([file, selector]) => assertWebAlignedBackground(file, selector))
