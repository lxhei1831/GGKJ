const {
  profileMenus,
} = require('../data/mock')

const UNLIMITED_QUOTA_TEXT = '无限'

function buildProfileSummary(reports, currentDate) {
  const safeReports = normalizeReports(reports)

  return [
    { label: '本月检测', value: String(countMonthlyReports(safeReports, currentDate)) },
    { label: '剩余额度', value: UNLIMITED_QUOTA_TEXT },
    { label: '风险报告', value: String(countRiskReports(safeReports)) },
    { label: 'TRO案件', value: String(countTroCases(safeReports)) },
  ]
}

function buildProfileMenus(reports, menus) {
  const safeReports = normalizeReports(reports)
  const reportCount = safeReports.length
  const troCount = countTroCases(safeReports)

  return (menus || profileMenus).map((item) => {
    if (item.key === 'reports') {
      return Object.assign({}, item, {
        status: reportCount ? `最近 ${reportCount} 条` : '暂无记录',
        statusKey: reportCount ? 'info' : 'low',
      })
    }

    if (item.key === 'tro') {
      return Object.assign({}, item, {
        status: `${troCount} 件`,
        statusKey: troCount ? 'info' : 'low',
      })
    }

    return item
  })
}

function countMonthlyReports(reports, currentDate) {
  const safeReports = normalizeReports(reports)
  const now = currentDate instanceof Date ? currentDate : new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  return safeReports.filter((report) => {
    const reportDate = parseReportDate(report && report.date, currentYear)
    if (!reportDate) return false

    return reportDate.year === currentYear && reportDate.month === currentMonth
  }).length
}

function countRiskReports(reports) {
  return normalizeReports(reports).length
}

function countTroCases(reports) {
  return normalizeReports(reports).filter(isTroCaseReport).length
}

function isTroCaseReport(report) {
  if (!report) return false

  const payload = report.payload || {}
  const result = report.result || {}
  const modelRaw = result.modelRaw || report.modelRaw || {}

  return Boolean(
    isTroMode(payload.mode) ||
    isTroMode(report.mode) ||
    hasCaseIdentity(payload) ||
    hasCaseIdentity(result) ||
    hasCaseIdentity(modelRaw) ||
    containsTroCaseText(report.type) ||
    containsTroCaseText(report.name) ||
    containsTroCaseText(report.title)
  )
}

function normalizeReports(reports) {
  return Array.isArray(reports) ? reports.filter(Boolean) : []
}

function parseReportDate(value, fallbackYear) {
  const text = String(value || '').trim()
  if (!text) return null

  const withYear = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (withYear) {
    return {
      year: Number(withYear[1]),
      month: Number(withYear[2]),
      day: Number(withYear[3]),
    }
  }

  const monthDay = text.match(/^(\d{1,2})[-/](\d{1,2})/)
  if (monthDay) {
    return {
      year: fallbackYear,
      month: Number(monthDay[1]),
      day: Number(monthDay[2]),
    }
  }

  return null
}

function isTroMode(mode) {
  return String(mode || '').toLowerCase() === 'tro'
}

function hasCaseIdentity(value) {
  if (!value || typeof value !== 'object') return false

  return Boolean(
    clean(value.caseNo) ||
    clean(value.caseNumber) ||
    clean(value.caseId) ||
    clean(value.caseBrand) ||
    clean(value.plaintiffBrand)
  )
}

function containsTroCaseText(value) {
  return /tro.*案件|案件.*tro/i.test(String(value || ''))
}

function clean(value) {
  return String(value || '').trim()
}

module.exports = {
  UNLIMITED_QUOTA_TEXT,
  buildProfileMenus,
  buildProfileSummary,
  countMonthlyReports,
  countRiskReports,
  countTroCases,
  isTroCaseReport,
}
