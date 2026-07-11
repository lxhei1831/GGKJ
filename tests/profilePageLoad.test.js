const assert = require('assert')
const path = require('path')

const pagePath = path.join(__dirname, '..', 'pages', 'profile', 'profile.js')
let capturedPage = null

global.Page = (config) => {
  capturedPage = config
}
global.wx = {}

delete require.cache[require.resolve(pagePath)]
require(pagePath)

assert(capturedPage, 'profile page should register with Page()')
assert(Array.isArray(capturedPage.data.menus), 'profile page should initialize menus')
assert(Array.isArray(capturedPage.data.summary), 'profile page should initialize summary')
assert.strictEqual(typeof capturedPage.handlePhoneLogin, 'function', 'profile page should expose phone login handler')
assert.strictEqual(typeof capturedPage.openProfileEditor, 'function', 'profile page should expose profile editor handler')

delete global.Page
delete global.wx
