const cloud = require('wx-server-sdk')
const https = require('https')
const http = require('http')
const {
  searchUsptoTrademarks,
  shouldSearchUspto,
} = require('./usptoSearch')
const {
  generatePdfReportBuffer,
} = require('./pdfReport')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const DEFAULT_BASE_URL = 'https://newapi.lxhei.xyz/v1'
const DEFAULT_MODEL = 'gpt-5.5'
const DEFAULT_TIMEOUT_MS = 30000
const DEFAULT_AI_TIMEOUT_MS = 20000

exports.main = async (event) => {
  try {
    const task = normalizeTask(event && (event.task || event.scene))
    const input = event && (event.input || event.payload || {})
    const context = await buildTaskContext(task, input)
    const data = await buildTaskData(task, input, context)

    return {
      ok: true,
      data: await enrichTaskResponse(task, data, input, context),
    }
  } catch (error) {
    console.error('[aiGateway] failed', error)
    return {
      ok: false,
      error: {
        message: error.message || 'AI detection failed',
      },
    }
  }
}

async function buildTaskContext(task, input) {
  const context = {
    imageUrls: [],
    trademarkSignals: null,
    trademarkSearchTerms: [],
    trademarkCandidates: [],
    warnings: [],
  }

  try {
    context.imageUrls = await resolveImageUrls(input)
  } catch (error) {
    context.warnings.push(`图片临时链接解析失败：${error.message || 'unknown error'}`)
  }

  if (task !== 'risk_detect' || !shouldSearchUspto(input)) {
    return context
  }

  return context
}

async function buildTaskData(task, input, context) {
  try {
    const modelResult = await requestModel(task, input, context)
    return normalizeTaskResult(task, modelResult, input)
  } catch (error) {
    if (task === 'risk_detect') {
      context.warnings.push(`AI风险检测暂时失败：${error.message || 'unknown error'}`)
      return buildFallbackRiskDetectionResult(input, error)
    }

    throw error
  }
}

async function enrichTaskResponse(task, data, input, context) {
  if (task !== 'risk_detect') return data

  await completeTrademarkContext(input, context, data)

  const trademarkSignals = context.trademarkSignals || data.trademarkSignals || null
  const enriched = Object.assign({}, data, {
    trademarkSignals,
    trademarkSearchTerms: context.trademarkSearchTerms,
    trademarkCandidates: context.trademarkCandidates,
    usptoWarnings: context.warnings,
  })

  try {
    const pdfBuffer = await generatePdfReportBuffer({
      input,
      result: enriched,
      imageUrls: context.imageUrls,
      trademarkSignals,
      trademarkCandidates: context.trademarkCandidates,
      warnings: context.warnings,
      generatedAt: formatReportTime(),
    })
    return Object.assign(enriched, await uploadPdfReport(pdfBuffer))
  } catch (error) {
    return Object.assign(enriched, {
      pdfReportError: error.message || 'PDF report generation failed',
    })
  }
}

async function completeTrademarkContext(input, context, data) {
  if (!shouldSearchUspto(input) || (context.trademarkCandidates || []).length) {
    return
  }

  const signals = data && data.trademarkSignals
    ? data.trademarkSignals
    : context.trademarkSignals
  const trademarkSignals = signals ? normalizeTrademarkSignals(signals) : null
  if (trademarkSignals) {
    context.trademarkSignals = trademarkSignals
  }

  try {
    const usptoResult = await searchUsptoTrademarks(Object.assign({}, input, {
      trademarkSignals: context.trademarkSignals,
    }))
    context.trademarkSearchTerms = usptoResult.terms || []
    context.trademarkCandidates = usptoResult.candidates || []
    context.warnings = context.warnings.concat(usptoResult.warnings || [])
  } catch (error) {
    context.warnings.push(`USPTO search failed: ${error.message || 'unknown error'}`)
  }
}

async function requestModel(task, input, context) {
  const runtime = getAiRuntimeConfig()

  return postJson(`${runtime.baseUrl}/chat/completions`, {
    model: runtime.model,
    messages: buildMessages(task, input, context),
  }, runtime.apiKey)
    .then(extractMessageContent)
    .then(parseJsonContent)
}

async function requestTrademarkSignals(input, imageUrls) {
  const runtime = getAiRuntimeConfig()

  return postJson(`${runtime.baseUrl}/chat/completions`, {
    model: runtime.model,
    messages: [
      {
        role: 'system',
        content: [
          '你是商标检索线索提取助手。',
          '根据用户上传的图片、标题、关键词和说明，提取适合去 USPTO 检索的商标词、图形元素、颜色和构图。',
          '只返回一个JSON对象，不要返回Markdown或额外解释。',
          'JSON字段包含: wordMarks, searchTerms, visualElements, colors, composition, markRegions。',
          '除markRegions外，每个字段都是字符串数组，最多8项；无法识别时返回空数组。',
          'markRegions为数组，最多4项；每项包含label、type、region、confidence，region使用0到1之间的归一化坐标{x,y,w,h}，定位用户上传图中的商标词、Logo或核心图形。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: buildUserContent({
          task: 'trademark_signal_extract',
          input: buildPromptInput(input, { imageUrls }),
        }, imageUrls, []),
      },
    ],
  }, runtime.apiKey)
    .then(extractMessageContent)
    .then(parseJsonContent)
    .then(normalizeTrademarkSignals)
}

function buildMessages(task, input, context) {
  const config = getTaskConfig(task)
  const promptInput = buildPromptInput(input, context)

  return [
    {
      role: 'system',
      content: config.systemPrompt,
    },
    {
      role: 'user',
      content: buildUserContent({
        task,
        input: promptInput,
      }, context.imageUrls, context.trademarkCandidates),
    },
  ]
}

function getTaskConfig(task) {
  if (task === 'general_chat') {
    return {
      systemPrompt: [
        '你是港港跨境 AI 助手，面向跨境电商卖家、知识产权风险、平台申诉、TRO应急和合规材料整理场景。',
        '请像正常聊天助手一样回答用户，但要优先围绕跨境电商、平台规则、申诉证据、侵权初筛和维权材料给出可执行建议。',
        '如果消息附带图片，请直接检查图片中的Logo、商标、IP角色、肖像、图案、包装、外观设计、平台通知截图和证据要点。',
        '如果输入中只有文件名或文件元数据，请明确说明你只能基于文件名和用户文字判断，不能假装已经读取文件正文。',
        '涉及法律风险时要谨慎表述，说明这是初步分析，不能替代律师正式意见。',
        '只返回一个JSON对象，不要返回Markdown、代码块或额外解释。',
        'JSON字段必须包含: reply, quickReplies。',
        'reply为中文字符串；quickReplies为0到4条中文短句数组，用于建议用户下一步可以继续问什么。',
      ].join('\n'),
    }
  }

  if (task === 'tro_advice') {
    return {
      systemPrompt: [
        '你是跨境电商TRO案件应急处理助手。',
        '请根据平台、案件号、原告品牌/IP和冻结金额，生成初步应急建议。',
        '建议必须谨慎，不能替代律师意见；需要提醒用户正式处理前找律师复核。',
        '只返回一个JSON对象，不要返回Markdown、代码块或额外解释。',
        'JSON字段必须包含: title, desc, score, level, levelText, actions。',
        'score为0到100的数字；level只能是low、medium、high；levelText用中文低风险/中风险/高风险；actions为3到5条字符串数组。',
      ].join('\n'),
    }
  }

  return {
      systemPrompt: [
        '你是跨境电商知识产权和TRO风险检测助手。',
        '请根据用户提交的商品、平台、市场、关键词、文案、图片说明以及随消息附带的图片判断侵权风险。',
        '如果消息附带图片，请直接检查图片中的Logo、IP角色、肖像、图案、包装、外观设计和视觉相似风险。',
        '如果输入中包含USPTO候选商标和官方商标图，请把用户上传图与官方候选图进行近似度对比，重点判断文字、构图、图形元素、商品类别和实际使用场景。',
        '输出要谨慎表述为风险初筛，不要宣称已经构成法律意义上的最终侵权。',
        '只返回一个JSON对象，不要返回Markdown、代码块或额外解释。',
        'JSON字段必须包含: score, riskItems, suggestions, jurisdiction, canPublish, trademarkSignals, visualFindings。',
        'score为0到100的数字；riskItems为数组，每项包含title、detail、level，level只能是low、medium、high；suggestions为字符串数组；canPublish为布尔值。',
        'trademarkSignals为对象，用于后续USPTO检索，包含wordMarks、searchTerms、visualElements、colors、composition、markRegions；无法识别时返回空数组。',
        'visualFindings为0到4项数组，用于PDF自适应红框；每项包含title、detail、evidence、level、confidence、userRegion、officialRegion。',
        '如果输入中没有trademarkCandidates，请将visualFindings返回为空数组；可定位的用户上传图疑似区域请放入trademarkSignals.markRegions。',
        'userRegion是用户上传图中的疑似侵权区域，officialRegion是候选权利图中的对应区域；坐标必须是0到1之间的归一化{x,y,w,h}。无法可靠定位时返回空数组，不要编造固定坐标。',
    ].join('\n'),
  }
}

async function resolveImageUrls(input) {
  const imageFileIDs = Array.isArray(input && input.imageFileIDs)
    ? input.imageFileIDs.filter(Boolean)
    : []
  const imageUrls = Array.isArray(input && input.imageUrls)
    ? input.imageUrls.filter(Boolean)
    : []

  if (!imageFileIDs.length) return imageUrls

  const result = await cloud.getTempFileURL({
    fileList: imageFileIDs,
  })

  const tempUrls = (result.fileList || [])
    .map((file) => file.tempFileURL)
    .filter(Boolean)

  return imageUrls.concat(tempUrls)
}

function buildPromptInput(input, context) {
  const imageUrls = Array.isArray(context && context.imageUrls) ? context.imageUrls : []
  const trademarkCandidates = Array.isArray(context && context.trademarkCandidates)
    ? context.trademarkCandidates
    : []
  const promptInput = Object.assign({}, input || {})
  delete promptInput.imageFileIDs
  delete promptInput.imageUrls

  if (imageUrls.length) {
    promptInput.imageCount = imageUrls.length
    promptInput.imageStatus = 'image_url attachments included in this message'
  }

  if (context && context.trademarkSignals) {
    promptInput.trademarkSignals = context.trademarkSignals
  }

  if (context && Array.isArray(context.trademarkSearchTerms) && context.trademarkSearchTerms.length) {
    promptInput.trademarkSearchTerms = context.trademarkSearchTerms
  }

  if (trademarkCandidates.length) {
    promptInput.trademarkCandidates = trademarkCandidates.map((candidate) => ({
      wordmark: candidate.wordmark,
      serialNumber: candidate.serialNumber,
      registrationNumber: candidate.registrationNumber,
      ownerName: candidate.ownerName,
      status: candidate.status,
      goodsAndServices: candidate.goodsAndServices,
      markDrawingCode: candidate.markDrawingCode,
      designSearchCode: candidate.designSearchCode,
      markImageUrl: candidate.markImageUrl,
      markImageSourceLabel: candidate.markImageSourceLabel,
      markImageSourceTrust: candidate.markImageSourceTrust,
      sourceUrl: candidate.sourceUrl,
    }))
    promptInput.officialTrademarkImageStatus = 'USPTO/TSDR official record images are attached after the user uploaded images when markImageUrl is available'
  }

  if (context && Array.isArray(context.warnings) && context.warnings.length) {
    promptInput.lookupWarnings = context.warnings
  }

  return promptInput
}

function buildUserContent(payload, imageUrls, trademarkCandidates) {
  const text = JSON.stringify(payload)

  const userImageUrls = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : []
  const officialImageUrls = (trademarkCandidates || [])
    .map((candidate) => candidate && candidate.markImageUrl)
    .filter(Boolean)
    .slice(0, 3)

  if (!userImageUrls.length && !officialImageUrls.length) {
    return text
  }

  const content = [{
    type: 'text',
    text,
  }]

  if (userImageUrls.length) {
    content.push({
      type: 'text',
      text: '用户上传的待检测图片如下：',
    })
  }
  userImageUrls.forEach((url) => content.push({
    type: 'image_url',
    image_url: {
      url,
    },
  }))

  if (officialImageUrls.length) {
    content.push({
      type: 'text',
      text: 'USPTO 官方候选商标图如下，顺序对应 trademarkCandidates：',
    })
  }
  officialImageUrls.forEach((url) => content.push({
    type: 'image_url',
    image_url: {
      url,
    },
  }))

  return content
}

function normalizeTaskResult(task, result, input) {
  if (task === 'tro_advice') {
    return normalizeTroAdviceResult(result, input)
  }

  if (task === 'general_chat') {
    return normalizeChatResult(result)
  }

  return normalizeRiskDetectionResult(result, input)
}

function normalizeRiskDetectionResult(result, input) {
  const score = clampScore(result.score)
  const riskItems = Array.isArray(result.riskItems)
    ? result.riskItems.map(normalizeRiskItem).filter(Boolean)
    : []
  const suggestions = Array.isArray(result.suggestions)
    ? result.suggestions.map((item) => String(item || '').trim()).filter(Boolean)
    : []

  return {
    score,
    riskItems: riskItems.length ? riskItems : [{
      title: 'AI风险判断',
      detail: '模型未返回明确风险项，建议人工复核商标、版权、外观专利和平台投诉规则。',
      level: score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low',
    }],
    suggestions: suggestions.length ? suggestions : [
      '上架前复核商标、版权、外观专利和平台知识产权投诉规则。',
      '保留原创素材、供应链授权和可追溯证明。',
    ],
    jurisdiction: result.jurisdiction || `${input.platform || '平台'} / ${input.countryRegion || '目标市场'}`,
    canPublish: typeof result.canPublish === 'boolean' ? result.canPublish : score < 45,
    trademarkSignals: normalizeTrademarkSignals(result.trademarkSignals || result),
    visualFindings: normalizeVisualFindings(result.visualFindings),
    source: 'ai-cloud-function',
  }
}

function buildFallbackRiskDetectionResult(input, error) {
  const hasImage = Boolean(
    Number(input && input.imageCount || 0) ||
    (Array.isArray(input && input.imageFileIDs) && input.imageFileIDs.length) ||
    (Array.isArray(input && input.imageUrls) && input.imageUrls.length)
  )
  const score = hasImage ? 58 : 48
  const reason = error && error.message ? error.message : 'unknown error'

  return {
    score,
    riskItems: [{
      title: 'AI检测暂时不可用',
      detail: `本次远程AI检测未完成（${reason}）。系统已生成保守初筛报告，请结合上传素材、平台规则和人工复核继续判断。`,
      level: hasImage ? 'medium' : 'low',
    }, {
      title: hasImage ? '图片材料已进入人工复核建议' : '材料信息不足',
      detail: hasImage
        ? '已收到上传图片，但模型分析暂时不可用。建议优先复核Logo、文字商标、包装图案、角色元素和外观设计相似度。'
        : '建议补充商品标题、品牌词、主图、细节图和目标市场后重新检测。',
      level: hasImage ? 'medium' : 'low',
    }],
    suggestions: [
      '暂缓直接上架高价值或疑似品牌关联素材，先完成人工商标、版权和外观设计复核。',
      '保留原图、设计源文件、授权链路、供应商证明和修改前后对比图。',
      'AI接口恢复后建议重新检测，以获得更完整的模型分析和候选权利对比。',
    ],
    jurisdiction: `${input.platform || '平台'} / ${input.countryRegion || '目标市场'}`,
    canPublish: false,
    source: 'ai-cloud-fallback',
    modelFallback: true,
    modelError: reason,
    visualFindings: [],
  }
}

function normalizeTroAdviceResult(result, input) {
  const score = clampScore(result.score)
  const level = normalizeLevel(result.level || scoreToLevel(score))
  const actions = Array.isArray(result.actions)
    ? result.actions.map((item) => String(item || '').trim()).filter(Boolean)
    : []

  return {
    title: String(result.title || getDefaultTroTitle(level)).trim(),
    desc: String(result.desc || `${input.platform || '平台'} / AI评估风险分 ${score}`).trim(),
    score,
    level,
    levelText: String(result.levelText || getLevelText(level)).trim(),
    actions: actions.length ? actions : [
      '先保存平台通知、法院文件、冻结截图和后台销售数据。',
      '暂停新增涉案商品销售，避免扩大潜在损失。',
      '尽快让律师复核案件号、原告主体、涉案链接和和解空间。',
    ],
    source: 'ai-cloud-function',
  }
}

function normalizeChatResult(result) {
  const quickReplies = Array.isArray(result.quickReplies)
    ? result.quickReplies.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4)
    : []

  return {
    reply: String(result.reply || result.answer || result.content || result.message || '我暂时没有生成有效回复，请换一种说法再发一次。').trim(),
    quickReplies,
    source: 'ai-cloud-function',
  }
}

function normalizeTrademarkSignals(result) {
  return {
    wordMarks: normalizeStringArray(result && result.wordMarks).slice(0, 8),
    searchTerms: normalizeStringArray(result && result.searchTerms).slice(0, 8),
    visualElements: normalizeStringArray(result && result.visualElements).slice(0, 8),
    colors: normalizeStringArray(result && result.colors).slice(0, 8),
    composition: normalizeStringArray(result && result.composition).slice(0, 8),
    markRegions: normalizeMarkRegions(result && result.markRegions).slice(0, 4),
  }
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return value ? [String(value).trim()].filter(Boolean) : []
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

function getAiRuntimeConfig() {
  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    throw new Error('Missing AI_API_KEY environment variable')
  }

  return {
    apiKey,
    baseUrl: trimTrailingSlash(process.env.AI_BASE_URL || DEFAULT_BASE_URL),
    model: process.env.AI_MODEL || DEFAULT_MODEL,
  }
}

async function uploadPdfReport(pdfBuffer) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 10)
  const fileName = `risk-report-${timestamp}-${random}.pdf`
  const cloudPath = `risk-reports/${fileName}`

  const result = await cloud.uploadFile({
    cloudPath,
    fileContent: pdfBuffer,
  })

  if (!result || !result.fileID) {
    throw new Error('PDF upload did not return fileID')
  }

  return {
    pdfReportFileID: result.fileID,
    pdfReportCloudPath: cloudPath,
  }
}

function formatReportTime() {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function postJson(urlString, body, apiKey) {
  const url = new URL(urlString)
  const client = url.protocol === 'http:' ? http : https
  const timeout = Number(process.env.AI_TIMEOUT_MS || DEFAULT_AI_TIMEOUT_MS)
  const data = JSON.stringify(body)

  return new Promise((resolve, reject) => {
    const req = client.request({
      method: 'POST',
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        'content-length': Buffer.byteLength(data),
      },
      timeout,
    }, (res) => {
      let raw = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        raw += chunk
      })
      res.on('end', () => {
        let parsed = {}
        try {
          parsed = raw ? JSON.parse(raw) : {}
        } catch (error) {
          reject(new Error(`AI API returned non-JSON response, status ${res.statusCode}`))
          return
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const message = parsed.error
            ? (parsed.error.message || parsed.error)
            : `AI API status ${res.statusCode}`
          reject(new Error(message))
          return
        }

        resolve(parsed)
      })
    })

    req.on('timeout', () => {
      req.destroy(new Error('AI API request timed out'))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function extractMessageContent(data) {
  const choice = data && data.choices && data.choices[0]
  const content = choice && choice.message && choice.message.content

  if (Array.isArray(content)) {
    return content.map((item) => item.text || '').join('')
  }

  if (typeof content === 'string') {
    return content
  }

  if (typeof data.output_text === 'string') {
    return data.output_text
  }

  throw new Error('AI API response missing message content')
}

function parseJsonContent(content) {
  const text = String(content || '').trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')

  if (start < 0 || end < start) {
    throw new Error('AI response is not a JSON object')
  }

  return JSON.parse(text.slice(start, end + 1))
}

function normalizeRiskItem(item) {
  if (!item) return null

  return {
    title: String(item.title || '风险提示').trim(),
    detail: String(item.detail || '建议人工复核该风险点。').trim(),
    level: normalizeLevel(item.level),
  }
}

function normalizeVisualFindings(value) {
  if (!Array.isArray(value)) return []
  return value.map((item, index) => {
    if (!item) return null
    const userRegion = normalizeRegion(item.userRegion || item.region)
    const officialRegion = normalizeRegion(item.officialRegion)
    if (!userRegion && !officialRegion) return null

    return {
      title: String(item.title || `疑似侵权区域 ${index + 1}`).trim(),
      detail: String(item.detail || '模型定位到需要人工复核的视觉相似区域。').trim(),
      evidence: String(item.evidence || '该区域由AI根据上传图与候选权利图的相似点生成。').trim(),
      level: normalizeLevel(item.level),
      confidence: normalizeConfidence(item.confidence),
      userRegion,
      officialRegion,
    }
  }).filter(Boolean).slice(0, 4)
}

function normalizeMarkRegions(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (!item) return null
    const region = normalizeRegion(item.region || item.userRegion)
    if (!region) return null

    return {
      label: String(item.label || item.title || '商标/Logo区域').trim(),
      type: String(item.type || 'logo').trim(),
      confidence: normalizeConfidence(item.confidence),
      region,
    }
  }).filter(Boolean)
}

function normalizeRegion(region) {
  if (!region) return null
  const x = Number(region.x)
  const y = Number(region.y)
  const w = Number(region.w)
  const h = Number(region.h)
  if ([x, y, w, h].some((item) => Number.isNaN(item))) return null
  if (w <= 0 || h <= 0) return null

  const safeX = clampUnit(x)
  const safeY = clampUnit(y)
  return {
    x: roundUnit(safeX),
    y: roundUnit(safeY),
    w: roundUnit(Math.min(clampUnit(w), 1 - safeX)),
    h: roundUnit(Math.min(clampUnit(h), 1 - safeY)),
  }
}

function normalizeConfidence(value) {
  const score = Number(value)
  if (Number.isNaN(score)) return undefined
  return roundUnit(clampUnit(score))
}

function normalizeTask(task) {
  if (task === 'cross_border_ip_risk_detection' || task === 'risk_detect') return 'risk_detect'
  if (task === 'tro_advice') return 'tro_advice'
  if (task === 'general_chat' || task === 'ai_chat') return 'general_chat'
  return 'risk_detect'
}

function normalizeLevel(level) {
  const value = String(level || '').toLowerCase()
  if (value === 'high' || value === 'medium' || value === 'low') return value
  return 'medium'
}

function scoreToLevel(score) {
  if (score >= 75) return 'high'
  if (score >= 45) return 'medium'
  return 'low'
}

function getLevelText(level) {
  if (level === 'high') return '高风险'
  if (level === 'medium') return '中风险'
  return '低风险'
}

function getDefaultTroTitle(level) {
  if (level === 'high') return '建议立即进入律师复核流程'
  if (level === 'medium') return '建议尽快补齐材料并评估和解区间'
  return '建议保留证据并持续观察'
}

function clampScore(score) {
  const value = Number(score)
  if (Number.isNaN(value)) return 45
  return Math.max(0, Math.min(100, Math.round(value)))
}

function clampUnit(value) {
  return Math.max(0, Math.min(1, Number(value)))
}

function roundUnit(value) {
  return Math.round(Number(value) * 1000) / 1000
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}
