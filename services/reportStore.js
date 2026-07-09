const REPORT_STORAGE_KEY = 'riskDetectionReports'
const MAX_REPORTS = 10

const modeLabelMap = {
  product: '产品链接',
  image: '图片识别',
  keyword: '关键词',
  copy: '文案版权',
  patent: '外观专利',
  batch: '批量检测',
}

function getStorage(adapter) {
  if (adapter) return adapter
  if (typeof wx !== 'undefined') return wx
  return null
}

function getRecentReports(adapter, limit) {
  const storage = getStorage(adapter)
  if (!storage || typeof storage.getStorageSync !== 'function') return []

  try {
    const reports = storage.getStorageSync(REPORT_STORAGE_KEY)
    if (!Array.isArray(reports)) return []
    return reports.slice(0, limit || MAX_REPORTS)
  } catch (error) {
    return []
  }
}

function getReportById(id, adapter) {
  const reportId = String(id || '').trim()
  if (!reportId) return null

  return getRecentReports(adapter, MAX_REPORTS)
    .find((report) => report && report.id === reportId) || null
}

function deleteReportById(id, adapter) {
  const reportId = String(id || '').trim()
  if (!reportId) return false

  const storage = getStorage(adapter)
  if (!storage || typeof storage.setStorageSync !== 'function') return false

  try {
    const reports = getRecentReports(storage, MAX_REPORTS)
    const nextReports = reports.filter((report) => report && report.id !== reportId)
    if (nextReports.length === reports.length) return false

    storage.setStorageSync(REPORT_STORAGE_KEY, nextReports)
    return true
  } catch (error) {
    return false
  }
}

function saveDetectionReport(payload, result, options, adapter) {
  if (!result) return null

  const storage = getStorage(adapter)
  if (!storage || typeof storage.setStorageSync !== 'function') return null

  const record = createReportRecord(payload || {}, result, options || {})
  const reports = [record].concat(getRecentReports(storage)).slice(0, MAX_REPORTS)

  storage.setStorageSync(REPORT_STORAGE_KEY, reports)
  return record
}

function createReportRecord(payload, result, options) {
  const type = options.modeLabel || modeLabelMap[payload.mode] || '智能检测'
  const platform = payload.platform || '平台'
  const countryRegion = payload.countryRegion || ''
  const level = result.level || {}
  const payloadSnapshot = cloneSerializable(payload)
  const resultSnapshot = cloneSerializable(result)

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `${platform}${type}检测`,
    date: result.generatedAt || formatNow(),
    type,
    platform,
    countryRegion,
    jurisdiction: result.jurisdiction || [platform, countryRegion].filter(Boolean).join(' · '),
    score: Number(result.score || 0),
    level: level.key || 'low',
    levelText: level.text || '低风险',
    source: result.source || 'local-rule',
    pdfReportFileID: result.pdfReportFileID || '',
    pdfReportCloudPath: result.pdfReportCloudPath || '',
    pdfReportError: result.pdfReportError || '',
    trademarkCandidates: cloneSerializable(result.trademarkCandidates || []),
    payload: payloadSnapshot,
    result: resultSnapshot,
  }
}

function cloneSerializable(value) {
  try {
    return JSON.parse(JSON.stringify(value || {}))
  } catch (error) {
    return Array.isArray(value) ? [] : {}
  }
}

function formatNow() {
  const date = new Date()
  const pad = (value) => {
    const text = String(value)
    return text.length < 2 ? `0${text}` : text
  }
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

module.exports = {
  MAX_REPORTS,
  REPORT_STORAGE_KEY,
  createReportRecord,
  deleteReportById,
  getReportById,
  getRecentReports,
  saveDetectionReport,
}
