const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const appConfig = require('../app.json')
const { profileMenus } = require('../data/mock')
const profileScript = read('pages/profile/profile.js')
const profileTemplate = read('pages/profile/profile.wxml')

const expectedMenus = [
  { title: '我的TRO案件', path: '/pages/profile-tro/profile-tro', emptyText: '暂无TRO案件' },
  { title: '我的订单', path: '/pages/profile-orders/profile-orders', emptyText: '暂无订单' },
  { title: '消息通知', path: '/pages/profile-messages/profile-messages', emptyText: '暂无消息' },
  { title: '账号设置', path: '/pages/profile-settings/profile-settings', emptyText: '账号资料' },
]
const pageExplanationPhrases = [
  '后续展示字段',
  '后续展示内容',
  '展示规则',
  '当前先展示设置结构',
  '账号能力准备中',
]

assert.strictEqual(profileMenus.length, 4, 'profile function menu should contain exactly four modules')
assert(profileScript.includes('wx.navigateTo'), 'profile menu should navigate to feature pages')
assert(profileTemplate.includes('data-path="{{item.path}}"'), 'profile menu rows should carry target page paths')
assert(profileTemplate.includes('menu-mark'), 'profile menu should render a visual mark for each module')
assert(!profileScript.includes('`${event.currentTarget.dataset.title}待接入`'), 'profile menu should not keep placeholder toasts')

expectedMenus.forEach((expected) => {
  const menu = profileMenus.find((item) => item.title === expected.title)
  assert(menu, `${expected.title} should exist in profileMenus`)
  assert.strictEqual(menu.path, expected.path, `${expected.title} should point to its own page`)
  assert(menu.key, `${expected.title} should expose a stable key`)
  assert(menu.mark, `${expected.title} should expose an entry mark`)
  assert(menu.status, `${expected.title} should expose a designed current status`)

  const appPagePath = expected.path.replace(/^\//, '')
  assert(appConfig.pages.includes(appPagePath), `${expected.title} page should be registered in app.json`)

  const pageRoot = path.join(root, appPagePath)
  ;['js', 'json', 'wxml', 'wxss'].forEach((ext) => {
    assert(fs.existsSync(`${pageRoot}.${ext}`), `${expected.title} should include ${ext} file`)
  })

  const pageTemplate = read(`${appPagePath}.wxml`)
  assert(pageTemplate.includes(expected.emptyText), `${expected.title} should show its initial empty state`)
  assert(pageTemplate.includes('hero-panel'), `${expected.title} should use the existing hero style`)
  assert(pageTemplate.includes('section-title'), `${expected.title} should use existing section layout`)

  pageExplanationPhrases.forEach((phrase) => {
    assert(!pageTemplate.includes(phrase), `${expected.title} should not expose page-design explanation phrase: ${phrase}`)
  })
})
