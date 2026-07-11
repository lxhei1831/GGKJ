const assert = require('assert')

const {
  buildProfileMenus,
  buildProfileSummary,
  countMonthlyReports,
  countRiskReports,
  countTroCases,
} = require('../services/profileSummary')

const currentDate = new Date(2026, 6, 11)
const reports = [
  {
    id: 'current-high-report',
    date: '07-01 09:00',
    level: 'high',
    payload: { mode: 'product' },
  },
  {
    id: 'current-low-report',
    date: '07-08 10:30',
    level: 'low',
    payload: { mode: 'image' },
  },
  {
    id: 'previous-month-risk-report',
    date: '06-30 18:20',
    level: 'medium',
    payload: { mode: 'keyword' },
  },
  {
    id: 'current-tro-case',
    date: '2026-07-10 12:00',
    level: 'medium',
    type: 'TRO案件',
    payload: {
      mode: 'tro',
      caseNo: '26-cv-1001',
      caseBrand: 'Stanley',
    },
  },
  {
    id: 'previous-year-risk-report',
    date: '2025-07-10 12:00',
    level: 'high',
    payload: { mode: 'product' },
  },
]

assert.strictEqual(countMonthlyReports(reports, currentDate), 3, 'monthly detection count should use the current month')
assert.strictEqual(countRiskReports(reports), 5, 'risk report count should include every saved risk report')
assert.strictEqual(countTroCases(reports), 1, 'TRO case count should only include explicit TRO case records')

assert.deepStrictEqual(
  buildProfileSummary(reports, currentDate),
  [
    { label: '本月检测', value: '3' },
    { label: '剩余额度', value: '无限' },
    { label: '风险报告', value: '5' },
    { label: 'TRO案件', value: '1' },
  ],
  'profile summary should reflect live report data and unlimited quota'
)

const menus = buildProfileMenus(reports)
const troMenu = menus.find((item) => item.key === 'tro')
const reportsMenu = menus.find((item) => item.key === 'reports')

assert.strictEqual(troMenu.status, '1 件', 'TRO menu badge should show the actual case count')
assert.strictEqual(troMenu.statusKey, 'info', 'TRO menu badge should use an active state when cases exist')
assert.strictEqual(reportsMenu.status, '最近 5 条', 'report menu badge should show the actual saved report count')

const emptyMenus = buildProfileMenus([])
assert.strictEqual(emptyMenus.find((item) => item.key === 'tro').status, '0 件', 'empty TRO menu should still show a numeric count')
