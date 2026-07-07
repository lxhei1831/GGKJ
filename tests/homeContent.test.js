const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const homeTemplate = read('pages/index/index.wxml')
const homeScript = read('pages/index/index.js')
const homeStyles = read('pages/index/index.wxss')
const mockData = require('../data/mock')
const { successCases } = mockData

function selectorBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm'))
  assert(match, `${selector} should exist`)
  return match[1]
}

assert(!homeTemplate.includes('最近检测报告'), 'risk overview should hide the recent reports section until real local results are connected')
assert(!homeTemplate.includes('recentReports'), 'risk overview should not render mock recent report rows')
assert(!homeTemplate.includes('紧急TRO案件咨询'), 'risk overview should not show the emergency TRO consultation module')
assert(!homeTemplate.includes('goTro'), 'risk overview should not keep a TRO emergency entry point')

assert(!homeScript.includes('recentReports'), 'home data should not import or expose mock recent reports')
assert(!homeScript.includes('goTro'), 'home script should not keep unused TRO navigation')

assert(!homeTemplate.includes('quickActions'), 'quick detection should not render duplicated scenario cards')
assert(!homeTemplate.includes('wx:for="{{quickActions}}"'), 'quick detection should not loop over detection scenarios')
assert(!homeTemplate.includes('data-mode'), 'single quick detection button should not preselect a detection mode')
assert(homeTemplate.includes('quick-detect-button'), 'risk overview should render one clear quick detection button')
assert(homeTemplate.includes('开始快捷检测'), 'risk overview should use one primary quick detection action')
assert(!homeScript.includes('quickActions'), 'home data should not import or expose quick detection cards')
assert(!homeScript.includes('pendingDetectMode'), 'home navigation should not set a duplicated detection mode')
assert(!Object.prototype.hasOwnProperty.call(mockData, 'quickActions'), 'mock data should not export removed quick detection cards')

assert(homeTemplate.includes('成功案例'), 'risk overview should show a success cases module')
assert(homeTemplate.includes('successCases'), 'risk overview should render success cases from page data')
assert(homeScript.includes('successCases'), 'home data should expose success cases')

assert(Array.isArray(successCases), 'mock data should export success cases')
assert.strictEqual(successCases.length, 2, 'home should show two anonymous success cases')
successCases.forEach((item) => {
  assert(item.title, 'each success case should have a title')
  assert(item.tag, 'each success case should have an anonymized scene tag')
  assert(item.result, 'each success case should explain the outcome')
  assert(Array.isArray(item.steps), 'each success case should describe the app and lawyer service flow')
  assert.strictEqual(item.steps.length, 3, 'each success case should use a three-step flow')
  assert(/Amazon|Temu|TikTok Shop|美国站|英国站|欧盟站/.test(`${item.tag}${item.result}`), 'each success case should name an anonymized platform or market')
  assert(/SKU|Listing|主图|关键词|侵权函|律所邮件|冻结|下架/.test(item.result), 'each success case should include a concrete risk trigger or action')
  assert(!/继续销售|减少后续投诉隐患|高风险图片|可替换表达/.test(item.result), 'success case copy should avoid broad credibility-light wording')
  item.steps.forEach((step) => {
    assert(Array.from(step).length <= 5, 'case flow labels should stay short enough for one-line display')
  })
})

const caseFlowBlock = selectorBlock(homeStyles, '.case-flow')
assert(caseFlowBlock.includes('flex-wrap: nowrap'), 'case flow should keep steps on one line')

const caseStepTextBlock = selectorBlock(homeStyles, '.case-step-text')
assert(caseStepTextBlock.includes('white-space: nowrap'), 'case step text should not wrap')
