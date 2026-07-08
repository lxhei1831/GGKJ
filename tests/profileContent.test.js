const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const profileTemplate = read('pages/profile/profile.wxml')
const { profileMenus } = require('../data/mock')

const troIndex = profileMenus.findIndex((item) => item.title === '我的TRO案件')
const reportIndex = profileMenus.findIndex((item) => item.title === '我的检测报告')

assert(reportIndex > -1, 'profile function menu should include my detection reports')
assert.strictEqual(reportIndex, troIndex + 1, 'my detection reports should appear directly below my TRO cases')
assert.strictEqual(profileMenus[reportIndex].path, '/pages/profile-reports/profile-reports', 'my detection reports should open the report list page')
assert(!profileTemplate.includes('<text class="section-title">最近检测报告</text>'), 'profile page should not render a standalone recent reports section')
assert(!profileTemplate.includes('records.length'), 'profile page should not keep report rows outside the function menu')
