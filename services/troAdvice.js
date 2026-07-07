const {
  callAiTask,
} = require('./aiClient')
const {
  withLocalRulePrefix,
} = require('./localRuleLabel')

const highRiskBrands = ['stanley', 'disney', 'lego', 'popsockets', 'harley', 'smiley']

function normalizeCaseForm(form) {
  return {
    caseNo: cleanText(form && form.caseNo),
    brand: cleanText(form && form.brand),
    freezeAmount: cleanText(form && form.freezeAmount),
  }
}

function buildLocalTroAdvice(platform, form) {
  const targetPlatform = cleanText(platform) || '平台'
  const normalizedForm = normalizeCaseForm(form)
  const amount = Number(normalizedForm.freezeAmount || 0)
  const brandText = normalizedForm.brand.toLowerCase()
  const highBrand = highRiskBrands.some((item) => brandText.indexOf(item) > -1)
  let score = 35

  if (normalizedForm.caseNo) score += 12
  if (highBrand) score += 24
  if (amount >= 20000) score += 24
  if (amount >= 50000) score += 12

  score = Math.min(score, 96)
  const high = score >= 75
  const medium = score >= 50 && score < 75

  return {
    title: high ? '建议立即进入律师复核流程' : medium ? '建议尽快补齐材料并评估和解区间' : '建议保留证据并持续观察',
    desc: `${targetPlatform} · 初步风险分 ${score}`,
    level: high ? 'high' : medium ? 'medium' : 'low',
    levelText: high ? '高风险' : medium ? '中风险' : '低风险',
    actions: [
      '确认涉案链接和冻结账户，先停止新增销售。',
      '整理平台通知、法院文件、销售记录和冻结截图。',
      '核对是否存在品牌词、图片素材或外观设计争议。',
      '需要和解时，先评估销售额、库存、初犯情况和证据强弱。',
    ],
    score,
    source: 'local-rule',
  }
}

function generateTroAdvice(platform, form, options) {
  const config = options || {}
  const normalizedForm = normalizeCaseForm(form)
  const localResult = buildLocalTroAdvice(platform, normalizedForm)
  const aiClient = config.aiClient || callAiTask

  return aiClient('tro_advice', Object.assign({
    platform: cleanText(platform) || '平台',
  }, normalizedForm), config)
    .then((modelResult) => normalizeTroAdviceResult(modelResult, localResult))
    .catch(() => Object.assign({}, markLocalTroAdvice(localResult), {
      modelFallback: true,
      source: 'local-rule-fallback',
    }))
}

function normalizeTroAdviceResult(result, localResult) {
  const score = normalizeScore(result && result.score, localResult.score)
  const level = normalizeLevel(result && result.level, localResult.level)
  const actions = Array.isArray(result && result.actions)
    ? result.actions.map(cleanText).filter(Boolean)
    : []

  return {
    title: cleanText(result && result.title) || localResult.title,
    desc: cleanText(result && result.desc) || localResult.desc,
    level,
    levelText: cleanText(result && result.levelText) || getLevelText(level),
    actions: actions.length ? actions : localResult.actions,
    score,
    source: 'ai-cloud-function',
    modelRaw: result,
  }
}

function markLocalTroAdvice(result) {
  return Object.assign({}, result, {
    title: withLocalRulePrefix(result.title),
  })
}

function normalizeLevel(level, fallback) {
  const value = String(level || '').toLowerCase()
  if (value === 'high' || value === 'medium' || value === 'low') return value
  return fallback || 'medium'
}

function normalizeScore(score, fallback) {
  const value = Number(score)
  if (Number.isNaN(value)) return fallback
  return Math.max(0, Math.min(100, Math.round(value)))
}

function getLevelText(level) {
  if (level === 'high') return '高风险'
  if (level === 'medium') return '中风险'
  return '低风险'
}

function cleanText(value) {
  return String(value || '').trim()
}

module.exports = {
  buildLocalTroAdvice,
  generateTroAdvice,
  markLocalTroAdvice,
  normalizeTroAdviceResult,
}
