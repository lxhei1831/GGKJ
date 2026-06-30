const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const toolsTemplate = read('pages/tools/tools.wxml')
const toolsScript = read('pages/tools/tools.js')
const toolsStyles = read('pages/tools/tools.wxss')
const { toolCards } = require('../data/mock')

assert(!toolsTemplate.includes('知识产权服务'), 'tools page should not show an IP service module')
assert(!toolsTemplate.includes('services'), 'tools page should not render the removed service list')
assert(!toolsTemplate.includes('跟卖'), 'tools page should not mention follow-sell monitoring after removal')
assert(!toolsScript.includes('services:'), 'tools page data should not keep removed service pills')
assert(!toolsStyles.includes('.service-card'), 'tools page should not keep removed service card styles')
assert(!toolsStyles.includes('.service-pill'), 'tools page should not keep removed service pill styles')

assert(!toolCards.some((item) => item.title === '知识产权服务'), 'tool entry data should not include the IP service card')
assert(!toolCards.some((item) => item.title === '跟卖监控'), 'tool entry data should not include the follow-sell monitoring card')
assert.strictEqual(toolCards.length, 4, 'tools page should keep a balanced 2x2 tool entry grid')
assert(toolsTemplate.includes('tools-grid'), 'tools page should use a dedicated balanced tool grid')
assert(toolsStyles.includes('.tools-grid'), 'tools page should define a dedicated balanced tool grid')
assert(toolsStyles.includes('.tools-grid .grid-item'), 'tools page should stabilize tool grid item sizing')
