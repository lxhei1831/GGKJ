const AI_CONFIG = {
  enableRemoteModel: false,
  endpoint: 'https://your-domain.com/api/risk-detect',
  timeout: 20000,
}

const MODEL_INTEGRATION_STATUS = {
  name: '大模型检测接口',
  status: '待接入',
  desc: '当前使用本地规则模拟评分；后续替换AI_CONFIG.endpoint并开启enableRemoteModel即可。',
}

const highRiskTerms = [
  'disney',
  'marvel',
  'stanley',
  'lego',
  'nike',
  'adidas',
  'harley',
  'pokemon',
  'nfl',
  'taylor swift',
  'popsocket',
  'smiley',
]

const mediumRiskTerms = [
  'compatible with',
  'inspired',
  'dupe',
  'cartoon',
  'celebrity',
  'luxury',
  'logo',
  'brand style',
  'pod',
  'fan merch',
]

const regionProfiles = {
  美国: {
    scoreDelta: 8,
    note: '美国市场TRO、商标和版权执法活跃，建议重点核查品牌词、授权链路和诉讼历史。',
  },
  欧盟: {
    scoreDelta: 6,
    note: '欧盟市场建议同步核查欧盟商标、外观设计和版权素材授权。',
  },
  英国: {
    scoreDelta: 5,
    note: '英国市场建议关注UKIPO商标、外观设计以及平台本地投诉规则。',
  },
  加拿大: {
    scoreDelta: 4,
    note: '加拿大市场建议核对商标权利人、版权素材来源和跨境销售授权。',
  },
  澳大利亚: {
    scoreDelta: 4,
    note: '澳大利亚市场建议核查商标、设计权和消费者误认风险。',
  },
  日本: {
    scoreDelta: 5,
    note: '日本市场建议关注商标近似、动漫IP、角色图案和外观设计。',
  },
  韩国: {
    scoreDelta: 4,
    note: '韩国市场建议重点核查品牌词、偶像肖像、角色IP和设计权。',
  },
  东南亚: {
    scoreDelta: 3,
    note: '东南亚市场规则差异较大，建议按具体站点复核平台投诉标准。',
  },
  中国香港: {
    scoreDelta: 3,
    note: '中国香港市场建议关注商标、版权和授权证明材料完整性。',
  },
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function hitTerms(text, terms) {
  return terms.filter((term) => text.indexOf(term) > -1)
}

function getLevel(score) {
  if (score >= 75) return { text: '高风险', key: 'high' }
  if (score >= 45) return { text: '中风险', key: 'medium' }
  return { text: '低风险', key: 'low' }
}

function getShortLevel(level) {
  if (level === 'high') return '高'
  if (level === 'medium') return '中'
  return '低'
}

function decorateRiskItems(items) {
  return (items || []).map((item) => Object.assign({}, item, {
    levelText: item.levelText || getShortLevel(item.level),
  }))
}

function runLocalDetection(payload) {
  const mode = payload.mode || 'product'
  const countryRegion = payload.countryRegion || '美国'
  const regionProfile = regionProfiles[countryRegion] || regionProfiles['美国']
  const combinedText = [
    payload.platform,
    countryRegion,
    payload.productUrl,
    payload.productTitle,
    payload.keywordText,
    payload.copyText,
    payload.category,
    payload.caseBrand,
  ].map(normalizeText).join(' ')

  const highHits = hitTerms(combinedText, highRiskTerms)
  const mediumHits = hitTerms(combinedText, mediumRiskTerms)
  const hasImage = Number(payload.imageCount || 0) > 0
  const hasBatchFile = Boolean(payload.batchFileName)

  let score = 16 + regionProfile.scoreDelta
  score += highHits.length * 18
  score += mediumHits.length * 9
  if (mode === 'image' && hasImage) score += 18
  if (mode === 'patent' && hasImage) score += 12
  if (mode === 'batch' && hasBatchFile) score += 10
  if (combinedText.length > 180) score += 8
  score = Math.min(score, 96)

  const level = getLevel(score)
  const riskItems = [{
    title: `${countryRegion}市场规则提示`,
    detail: regionProfile.note,
    level: countryRegion === '美国' || countryRegion === '欧盟' ? 'medium' : 'low',
  }]

  if (highHits.length) {
    riskItems.push({
      title: '命中高危品牌或IP词',
      detail: highHits.join('、'),
      level: 'high',
    })
  }

  if (mediumHits.length) {
    riskItems.push({
      title: '存在模糊关联或仿牌表达',
      detail: mediumHits.join('、'),
      level: 'medium',
    })
  }

  if (mode === 'image' || mode === 'patent') {
    riskItems.push({
      title: hasImage ? '图片已进入视觉风险队列' : '尚未上传图片',
      detail: hasImage ? '后续可接入Logo、角色、肖像和外观专利相似度模型。' : '建议上传主图、细节图或POD图案后再检测。',
      level: hasImage ? 'medium' : 'low',
    })
  }

  if (riskItems.length === 1 && !highHits.length && !mediumHits.length) {
    riskItems.push({
      title: '未发现明显高危命中',
      detail: '仍建议在上架前核查商标、版权、外观专利和平台规则。',
      level: 'low',
    })
  }

  const suggestions = [
    `按${countryRegion}市场优先核查商标、版权、外观设计和平台投诉规则。`,
    '删除或替换可能构成品牌关联的关键词。',
    '避免使用官方Logo、IP角色、名人肖像和受保护图案。',
    '对高分产品先下架复核，再补充权利检索和授权证明。',
  ]

  if (level.key === 'low') {
    suggestions.unshift('可继续完善Listing，但建议保留原创素材和供应链授权记录。')
  }

  return {
    score,
    level,
    riskItems: decorateRiskItems(riskItems),
    suggestions,
    canPublish: score < 45,
    jurisdiction: `${payload.platform || '平台'} · ${countryRegion}`,
    generatedAt: formatNow(),
    source: 'local-rule',
  }
}

// 大模型/后端检测接口统一从这里接入，页面层不要直接 wx.request。
function callModelDetection(payload, options) {
  const config = Object.assign({}, AI_CONFIG, options || {})

  return new Promise((resolve, reject) => {
    wx.request({
      url: config.endpoint,
      method: 'POST',
      timeout: config.timeout,
      header: {
        'content-type': 'application/json',
      },
      data: {
        scene: 'cross_border_ip_risk_detection',
        version: 'v1',
        input: payload,
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }
        reject(new Error(`Model API status ${res.statusCode}`))
      },
      fail(err) {
        reject(err)
      },
    })
  })
}

function mergeModelResult(localResult, modelResult) {
  if (!modelResult) return localResult

  const modelScore = Number(modelResult.score)
  const score = !isNaN(modelScore) ? Math.max(localResult.score, modelScore) : localResult.score
  const level = getLevel(score)

  return Object.assign({}, localResult, {
    score,
    level,
    modelRaw: modelResult,
    source: 'local-rule+model',
    riskItems: decorateRiskItems(modelResult.riskItems || localResult.riskItems),
    suggestions: modelResult.suggestions || localResult.suggestions,
    jurisdiction: modelResult.jurisdiction || localResult.jurisdiction,
  })
}

function detectRisk(payload) {
  const localResult = runLocalDetection(payload)

  if (!AI_CONFIG.enableRemoteModel) {
    return Promise.resolve(localResult)
  }

  return callModelDetection(payload)
    .then((modelResult) => mergeModelResult(localResult, modelResult))
    .catch(() => Object.assign({}, localResult, {
      modelFallback: true,
      source: 'local-rule-fallback',
    }))
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
  AI_CONFIG,
  MODEL_INTEGRATION_STATUS,
  detectRisk,
  runLocalDetection,
  callModelDetection,
  mergeModelResult,
}
