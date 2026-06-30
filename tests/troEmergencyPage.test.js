const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const template = read('pages/tro/tro.wxml')
const script = read('pages/tro/tro.js')
const styles = read('pages/tro/tro.wxss')

const sectionTitles = Array.from(template.matchAll(/class="section-title">([^<]+)/g), (match) => match[1])

assert.deepStrictEqual(sectionTitles, ['案件自查', '律师服务'], 'TRO page should only render case self-check and lawyer service sections')

;['应急功能', '材料清单', 'TRO高危品牌库', '案件号查询', '冻结金额评估'].forEach((copy) => {
  assert(!template.includes(copy), `TRO page should not render ${copy}`)
})

;['troModules', 'troChecklist', 'modules:', 'checklist:', 'openLibrary'].forEach((copy) => {
  assert(!script.includes(copy), `TRO page script should not keep ${copy}`)
})

;['.module-card', '.check-row', '.check-box', '.brand-library', '.library-button'].forEach((selector) => {
  assert(!styles.includes(selector), `TRO page styles should not keep unused ${selector}`)
})
