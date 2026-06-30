const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const appConfig = JSON.parse(read('app.json'))
const homeTemplate = read('pages/index/index.wxml')
const homeScript = read('pages/index/index.js')
const detailTemplate = read('pages/case-detail/case-detail.wxml')
const detailScript = read('pages/case-detail/case-detail.js')
const detailConfig = JSON.parse(read('pages/case-detail/case-detail.json'))
const { successCases } = require('../data/mock')

assert(appConfig.pages.includes('pages/case-detail/case-detail'), 'app should register the success case detail page')

assert(homeTemplate.includes('bindtap="openCase"'), 'home success case cards should be tappable')
assert(homeTemplate.includes('data-id="{{item.id}}"'), 'home success case cards should pass the case id')
assert(homeTemplate.includes('查看详情'), 'home success case cards should expose a detail affordance')
assert(homeScript.includes('/pages/case-detail/case-detail?id='), 'home should navigate to the case detail page')

assert.strictEqual(detailConfig.navigationBarTitleText, '成功案例详情', 'detail page should have a clear navigation title')
assert(detailScript.includes('successCases'), 'detail page should load success case data')
assert(detailScript.includes('onLoad'), 'detail page should resolve a case by route id on load')

;[
  '案例概况',
  '检测发现',
  '律师复核',
  '处理流程',
  '处理结果',
  '专业提示',
].forEach((label) => {
  assert(detailTemplate.includes(label), `detail page should include ${label}`)
})

successCases.forEach((item) => {
  assert(item.id, 'each success case should have a stable route id')
  assert(item.overview, 'each success case should include overview details')
  assert(item.finding, 'each success case should include detection findings')
  assert(item.lawyerReview, 'each success case should include lawyer review details')
  assert(Array.isArray(item.process), 'each success case should include a detailed process timeline')
  assert(item.process.length >= 4, 'each success case process should include at least four steps')
  assert(item.outcome, 'each success case should include a professional outcome summary')
  assert(Array.isArray(item.professionalTips), 'each success case should include professional tips')
  assert(item.professionalTips.length >= 2, 'each success case should include at least two professional tips')
})
