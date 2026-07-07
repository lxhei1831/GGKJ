const cloud = require('wx-server-sdk')
const https = require('https')
const http = require('http')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const DEFAULT_BASE_URL = 'https://newapi.lxhei.xyz/v1'
const DEFAULT_MODEL = 'gpt-5.5'
const DEFAULT_TIMEOUT_MS = 30000

exports.main = async (event) => {
  try {
    const task = normalizeTask(event && (event.task || event.scene))
    const input = event && (event.input || event.payload || {})
    const modelResult = await requestModel(task, input)

    return {
      ok: true,
      data: normalizeTaskResult(task, modelResult, input),
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

async function requestModel(task, input) {
  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    throw new Error('Missing AI_API_KEY environment variable')
  }

  const baseUrl = trimTrailingSlash(process.env.AI_BASE_URL || DEFAULT_BASE_URL)
  const model = process.env.AI_MODEL || DEFAULT_MODEL
  const imageUrls = await resolveImageUrls(input)

  return postJson(`${baseUrl}/chat/completions`, {
    model,
    messages: buildMessages(task, input, imageUrls),
  }, apiKey)
    .then(extractMessageContent)
    .then(parseJsonContent)
}

function buildMessages(task, input, imageUrls) {
  const config = getTaskConfig(task)
  const promptInput = buildPromptInput(input, imageUrls)

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
      }, imageUrls),
    },
  ]
}

function getTaskConfig(task) {
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
        '只返回一个JSON对象，不要返回Markdown、代码块或额外解释。',
        'JSON字段必须包含: score, riskItems, suggestions, jurisdiction, canPublish。',
        'score为0到100的数字；riskItems为数组，每项包含title、detail、level，level只能是low、medium、high；suggestions为字符串数组；canPublish为布尔值。',
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

function buildPromptInput(input, imageUrls) {
  const promptInput = Object.assign({}, input || {})
  delete promptInput.imageFileIDs
  delete promptInput.imageUrls

  if (imageUrls.length) {
    promptInput.imageCount = imageUrls.length
    promptInput.imageStatus = 'image_url attachments included in this message'
  }

  return promptInput
}

function buildUserContent(payload, imageUrls) {
  const text = JSON.stringify(payload)

  if (!imageUrls.length) {
    return text
  }

  return [{
    type: 'text',
    text,
  }].concat(imageUrls.map((url) => ({
    type: 'image_url',
    image_url: {
      url,
    },
  })))
}

function normalizeTaskResult(task, result, input) {
  if (task === 'tro_advice') {
    return normalizeTroAdviceResult(result, input)
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
    source: 'ai-cloud-function',
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

function postJson(urlString, body, apiKey) {
  const url = new URL(urlString)
  const client = url.protocol === 'http:' ? http : https
  const timeout = Number(process.env.AI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)
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

function normalizeTask(task) {
  if (task === 'cross_border_ip_risk_detection' || task === 'risk_detect') return 'risk_detect'
  if (task === 'tro_advice') return 'tro_advice'
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

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}
