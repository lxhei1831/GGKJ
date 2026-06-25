const assert = require('assert')

const {
  dashboardMetrics,
} = require('../data/mock')
const {
  riskDetailMap,
  getRiskDetail,
} = require('../data/riskDetails')

const expectedTypes = ['brands', 'keywords', 'tro']

expectedTypes.forEach((type) => {
  const detail = getRiskDetail(type)

  assert(detail, `${type} detail should exist`)
  assert.strictEqual(detail.type, type, `${type} detail should expose its type`)
  assert(detail.title.length > 0, `${type} detail should have title`)
  assert(detail.summary.length > 0, `${type} detail should have summary`)
  assert(detail.sourceNote.length > 0, `${type} detail should explain source basis`)
  assert(detail.updatedAt.length > 0, `${type} detail should expose updatedAt`)
  assert(detail.stats.length >= 3, `${type} detail should include summary stats`)
  assert(detail.items.length >= 3, `${type} detail should include real entries`)

  detail.items.forEach((item) => {
    assert(item.name.length > 0, `${type} item should have name`)
    assert(item.levelKey, `${item.name} should have levelKey`)
    assert(item.levelText, `${item.name} should have levelText`)
    assert(item.rights.length > 0, `${item.name} should include rights`)
    assert(item.analysis.length > 0, `${item.name} should include analysis`)
    assert(item.violations.length >= 2, `${item.name} should include violations`)
    assert(item.actions.length >= 2, `${item.name} should include actions`)
    assert(item.sourceName.length > 0, `${item.name} should include sourceName`)
    assert(/^https?:\/\//.test(item.sourceUrl), `${item.name} should include sourceUrl`)
  })
})

dashboardMetrics.forEach((metric) => {
  assert(expectedTypes.includes(metric.detailType), `${metric.label} should map to detail type`)
  assert.strictEqual(metric.value, String(riskDetailMap[metric.detailType].items.length), `${metric.label} count should match detail data`)
})

assert.strictEqual(getRiskDetail('missing'), riskDetailMap.brands)
