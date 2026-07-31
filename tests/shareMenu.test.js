const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SHARE_ENABLED_PAGES = [
  'pages/index/index',
  'pages/detect/detect',
  'pages/tro/tro',
  'pages/tools/tools',
  'pages/profile/profile',
]

const SHARE_DISABLED_PAGES = [
  'pages/case-detail/case-detail',
  'pages/lawyer/lawyer',
  'pages/appeal-template/appeal-template',
  'pages/ai-chat/ai-chat',
  'pages/profile-tro/profile-tro',
  'pages/profile-reports/profile-reports',
  'pages/report-detail/report-detail',
  'pages/profile-orders/profile-orders',
  'pages/profile-messages/profile-messages',
  'pages/profile-settings/profile-settings',
]

function readPageScript(pagePath) {
  return fs.readFileSync(path.join(ROOT, pagePath + '.js'), 'utf8')
}

function readPageMarkup(pagePath) {
  const wxmlPath = path.join(ROOT, pagePath + '.wxml')
  return fs.existsSync(wxmlPath) ? fs.readFileSync(wxmlPath, 'utf8') : ''
}

SHARE_ENABLED_PAGES.forEach((pagePath) => {
  const script = readPageScript(pagePath)
  assert(script.includes('buildShareMessage'), `${pagePath} should use the shared menu-share config`)
  assert(script.includes('buildTimelineShareMessage'), `${pagePath} should use the shared timeline-share config`)
  assert(script.includes('onShareAppMessage'), `${pagePath} should support WeChat top-right menu share`)
  assert(script.includes('onShareTimeline'), `${pagePath} should support WeChat Moments share from the top-right menu`)
  assert(script.includes(`'/${pagePath}'`) || script.includes(`"/${pagePath}"`), `${pagePath} should share back to itself`)

  const markup = readPageMarkup(pagePath)
  assert(!markup.includes('open-type="share"'), `${pagePath} should not add an in-page share button`)
})

SHARE_DISABLED_PAGES.forEach((pagePath) => {
  const script = readPageScript(pagePath)
  assert(!script.includes('onShareAppMessage'), `${pagePath} should not add share support for this scoped change`)
  assert(!script.includes('onShareTimeline'), `${pagePath} should not add Moments share support for this scoped change`)
})

const shareConfig = require('../services/shareConfig')
const message = shareConfig.buildShareMessage('/pages/detect/detect')
assert.strictEqual(message.path, '/pages/detect/detect', 'shared menu-share config should preserve the requested path')
assert(message.title.includes('港港跨境'), 'shared menu-share title should use the product brand')

const timelineMessage = shareConfig.buildTimelineShareMessage('/pages/detect/detect')
assert(!Object.prototype.hasOwnProperty.call(timelineMessage, 'path'), 'Moments share config should not use unsupported path fields')
assert(timelineMessage.query.includes('from=timeline'), 'Moments share config should mark timeline traffic')
assert(timelineMessage.title.includes('港港跨境'), 'Moments share title should use the product brand')
