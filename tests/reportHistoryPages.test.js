const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const homeTemplate = read('pages/index/index.wxml')
const detectTemplate = read('pages/detect/detect.wxml')
const detectScript = read('pages/detect/detect.js')
const profileTemplate = read('pages/profile/profile.wxml')
const profileScript = read('pages/profile/profile.js')

assert(!homeTemplate.includes('最近检测报告'), 'home should not show the report history module')

assert(detectScript.includes('saveDetectionReport'), 'detect page should save a report after successful detection')
assert(detectScript.includes('getRecentReports'), 'detect page should load local report history')
assert(detectTemplate.includes('最近检测报告'), 'detect page should show recent report history')
assert(detectTemplate.includes('recentReports'), 'detect page should render recent local reports')

assert(profileScript.includes('getRecentReports'), 'profile page should load local report history')
assert(!profileScript.includes('TikTok Shop关键词检测'), 'profile page should not keep mock report records')
assert(profileTemplate.includes('records.length'), 'profile page should branch on real local records')
assert(profileTemplate.includes('完成一次检测后会在这里展示'), 'profile page should show an empty state before real reports exist')
