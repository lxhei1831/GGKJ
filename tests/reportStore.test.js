const assert = require('assert')

const {
  MAX_REPORTS,
  REPORT_STORAGE_KEY,
  getRecentReports,
  saveDetectionReport,
} = require('../services/reportStore')

function createStorage(initialValue) {
  const state = {
    [REPORT_STORAGE_KEY]: initialValue,
  }

  return {
    getStorageSync(key) {
      return state[key]
    },
    setStorageSync(key, value) {
      state[key] = value
    },
    state,
  }
}

const invalidStorage = createStorage('broken')
assert.deepStrictEqual(getRecentReports(invalidStorage), [], 'invalid report storage should read as an empty report list')

const storage = createStorage([])
const record = saveDetectionReport({
  mode: 'product',
  platform: 'Amazon',
  countryRegion: '美国',
  productTitle: 'Portable LED lamp',
}, {
  score: 82,
  level: { key: 'high', text: '高风险' },
  generatedAt: '06-30 15:20',
  jurisdiction: 'Amazon · 美国',
}, {
  modeLabel: '产品链接',
}, storage)

assert.strictEqual(record.name, 'Amazon产品链接检测', 'saved report should build a compact report name')
assert.strictEqual(record.date, '06-30 15:20', 'saved report should keep the generated report time')
assert.strictEqual(record.type, '产品链接', 'saved report should expose the detection type')
assert.strictEqual(record.platform, 'Amazon', 'saved report should keep the platform')
assert.strictEqual(record.countryRegion, '美国', 'saved report should keep the market')
assert.strictEqual(record.score, 82, 'saved report should keep the score')
assert.strictEqual(record.level, 'high', 'saved report should keep the level key')
assert.strictEqual(record.levelText, '高风险', 'saved report should keep the level text')

const reports = getRecentReports(storage)
assert.strictEqual(reports.length, 1, 'saved report should be readable from storage')
assert.deepStrictEqual(reports[0], record, 'latest report should be first')

for (let index = 0; index < MAX_REPORTS + 2; index += 1) {
  saveDetectionReport({
    mode: 'keyword',
    platform: 'Temu',
    countryRegion: '美国',
    keywordText: `brand term ${index}`,
  }, {
    score: 40 + index,
    level: { key: 'medium', text: '中风险' },
    generatedAt: `06-30 16:${String(index).padStart(2, '0')}`,
  }, {
    modeLabel: '关键词',
  }, storage)
}

const cappedReports = getRecentReports(storage)
assert.strictEqual(cappedReports.length, MAX_REPORTS, 'report storage should keep only the latest reports')
assert.strictEqual(cappedReports[0].date, '06-30 16:11', 'newest report should stay first after capping')
assert.strictEqual(cappedReports[MAX_REPORTS - 1].date, '06-30 16:02', 'old reports should be trimmed from the tail')
