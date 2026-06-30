const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const homeTemplate = read('pages/index/index.wxml')
const homeScript = read('pages/index/index.js')
const { successCases } = require('../data/mock')

assert(!homeTemplate.includes('最近检测报告'), 'risk overview should hide the recent reports section until real local results are connected')
assert(!homeTemplate.includes('recentReports'), 'risk overview should not render mock recent report rows')
assert(!homeTemplate.includes('紧急TRO案件咨询'), 'risk overview should not show the emergency TRO consultation module')
assert(!homeTemplate.includes('goTro'), 'risk overview should not keep a TRO emergency entry point')

assert(!homeScript.includes('recentReports'), 'home data should not import or expose mock recent reports')
assert(!homeScript.includes('goTro'), 'home script should not keep unused TRO navigation')

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
})
