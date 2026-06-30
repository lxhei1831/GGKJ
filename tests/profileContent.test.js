const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const profileTemplate = read('pages/profile/profile.wxml')
const { profileMenus } = require('../data/mock')

assert(!profileMenus.some((item) => item.title === '我的风险报告'), 'profile function menu should not include duplicated risk report entry')
assert(!profileMenus.some((item) => item.title === '我的检测记录'), 'profile function menu should not include duplicated detection record entry')
assert(profileTemplate.includes('最近检测报告'), 'profile page should keep the recent detection reports section')
