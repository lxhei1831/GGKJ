const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')
const PDFDocument = require('pdfkit')

const DEFAULT_FONT_PATH = path.join(__dirname, 'assets', 'fonts', 'NotoSansSC-VF.ttf')
const FALLBACK_FONT_PATH = 'C:/Windows/Fonts/NotoSansSC-VF.ttf'
const WATERMARK_PATH = path.join(__dirname, 'assets', 'watermark.png')

const REPORT_SECTION_TITLES = [
  '报告结论',
  '图片对比与疑似侵权标注',
  '侵权风险分析与整改建议',
  '证据清单与复核路径',
]

const TYPOGRAPHY = {
  bodyColor: '#111827',
  mutedColor: '#334155',
  bodyStrokeWidth: 0.08,
  titleStrokeWidth: 0.11,
}

const COLORS = {
  ink: '#0f172a',
  body: TYPOGRAPHY.bodyColor,
  muted: TYPOGRAPHY.mutedColor,
  faint: '#f8fafc',
  line: '#d8e0ec',
  blue: '#1557b0',
  blueSoft: '#eaf2ff',
  red: '#c81e1e',
  redSoft: '#fee2e2',
  amber: '#a16207',
  amberSoft: '#fef3c7',
  green: '#047857',
  greenSoft: '#d1fae5',
  white: '#ffffff',
}

const PAGE = {
  margin: 44,
  contentWidth: 507,
  bottom: 770,
}
const MAX_IMAGE_BYTES = 6 * 1024 * 1024

async function generatePdfReportBuffer(report, options) {
  const config = buildRenderConfig(options)
  const doc = new PDFDocument({
    autoFirstPage: false,
    size: 'A4',
    margin: PAGE.margin,
    bufferPages: false,
    info: {
      Title: 'GGKJ Professional IP Risk Screening Report',
      Author: '港港跨境',
      Creator: 'aiGateway',
    },
  })
  const chunks = []

  doc.on('data', (chunk) => chunks.push(chunk))

  if (config.fontPath) {
    doc.registerFont('body', config.fontPath)
    doc.registerFont('bold', config.fontPath)
  } else {
    installBuiltinFontFallback(doc)
  }

  renderConclusionSection(doc, report, config)
  await renderVisualEvidenceSection(doc, report, config)
  renderRiskActionSection(doc, report, config)
  renderEvidenceSection(doc, report, config)

  doc.end()

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
}

function buildRenderConfig(options) {
  const config = options || {}
  const watermarkPath = config.watermarkPath || WATERMARK_PATH

  return {
    fetchImages: config.fetchImages !== false,
    fontPath: pickFontPath(config.fontPath),
    watermarkPath,
    watermarkBuffer: readOptionalFile(watermarkPath),
  }
}

function renderConclusionSection(doc, report, config) {
  addSectionPage(doc, config, REPORT_SECTION_TITLES[0], 'Executive conclusion')

  const input = report.input || {}
  const result = report.result || {}
  const score = clampScore(result.score)
  const level = getRiskLevel(result)

  drawHeroBand(doc, level, score)

  doc.font('bold').fontSize(20).fillColor(COLORS.ink)
  drawFauxBoldText(doc, '专业侵权风险初筛报告', 44, 124, {
    width: 330,
    fauxBoldStrokeWidth: TYPOGRAPHY.titleStrokeWidth,
  })
  doc.font('body').fontSize(11).fillColor(COLORS.muted)
  drawFauxBoldText(doc, 'Professional IP/TRO Risk Screening Report', 44, 154, {
    width: 330,
    fauxBoldStrokeWidth: TYPOGRAPHY.bodyStrokeWidth,
  })

  drawInfoGrid(doc, 44, 218, [
    ['检测对象', input.productTitle || input.productUrl || input.copyText || '用户上传素材'],
    ['平台/市场', `${input.platform || '未填写'} / ${input.countryRegion || '未填写'}`],
    ['检测类型', formatMode(input.mode || 'risk_detect')],
    ['生成时间', report.generatedAt || formatNow()],
    ['报告来源', formatReportSource(result.source)],
  ])

  doc.y = 418
  drawSectionLabel(doc, config, '结论摘要', REPORT_SECTION_TITLES[0], 'Executive conclusion continued')
  drawReadableList(doc, buildExecutiveSummary(report), {
    pageConfig: config,
    pageTitle: REPORT_SECTION_TITLES[0],
    pageSubtitle: 'Executive conclusion continued',
    markerColor: level.color,
    itemGap: 11,
  })

  ensureSpace(doc, config, 122, REPORT_SECTION_TITLES[0], 'Executive conclusion continued')
  drawCallout(doc, config, {
    title: '报告边界',
    text: '本报告用于跨境电商上架前风险初筛、素材整改和律师复核准备。报告不构成正式法律意见，也不等同于平台、法院或权利人的最终判断。高风险结果建议由知识产权律师结合权利状态、商品类别、实际使用方式和平台规则复核。',
    level: 'info',
  })

  drawFooter(doc, 'Confidential - GGKJ professional screening')
}

async function renderVisualEvidenceSection(doc, report, config) {
  addSectionPage(doc, config, REPORT_SECTION_TITLES[1], 'Visual comparison and suspected infringement markups')

  const userImageUrl = first(report.imageUrls)
  const candidate = firstCandidateReference(report.trademarkCandidates)
  const findings = buildVisualEvidenceFindings(report)
  const userImage = config.fetchImages ? await fetchImageBuffer(userImageUrl).catch(() => null) : null
  const officialImageResult = config.fetchImages ? await resolveCandidateImage(candidate).catch(() => null) : null
  const officialImage = officialImageResult && officialImageResult.buffer
  const officialImageUrl = officialImageResult && officialImageResult.source
    ? officialImageResult.source.url
    : candidate && candidate.markImageUrl
  const candidateBoxTitle = candidate ? '候选权利图 - 对比参照' : '官方候选结果 - 未匹配'

  drawCallout(doc, config, {
    title: '阅读说明',
    text: '红色编号框为系统根据上传图片、模型识别线索、候选商标数据和风险项生成的重点复核区域。标注用于定位问题素材，不代表已经形成最终侵权认定。',
    level: 'info',
  })

  const imageTop = doc.y + 6
  drawImageBox(doc, 44, imageTop, 244, 214, '用户上传图 - 待复核区域', userImage, userImageUrl, findings, 'userRegion')
  drawImageBox(doc, 307, imageTop, 244, 214, candidateBoxTitle, officialImage, officialImageUrl, findings, 'officialRegion', {
    candidate,
    fallbackKind: 'candidateReference',
    sourceLabel: officialImageResult && officialImageResult.source && officialImageResult.source.label,
    overlayOnFallback: false,
  })

  doc.y = imageTop + 234
  drawSectionLabel(doc, config, '编号证据说明', REPORT_SECTION_TITLES[1], 'Evidence findings continued')
  findings.forEach((finding) => drawFindingRow(doc, config, finding))

  ensureSpace(doc, config, 178, REPORT_SECTION_TITLES[1], 'Similarity assessment continued')
  drawSectionLabel(doc, config, '相似性评估矩阵', REPORT_SECTION_TITLES[1], 'Similarity assessment continued')
  drawSimilarityMatrix(doc, config, buildSimilarityMatrix(report))

  drawFooter(doc, 'Visual evidence board')
}

function renderRiskActionSection(doc, report, config) {
  addSectionPage(doc, config, REPORT_SECTION_TITLES[2], 'Risk analysis and remediation plan')

  const result = report.result || {}
  const riskItems = Array.isArray(result.riskItems) ? result.riskItems : []
  const candidates = Array.isArray(report.trademarkCandidates) ? report.trademarkCandidates : []

  drawSectionLabel(doc, config, '核心风险分析', REPORT_SECTION_TITLES[2], 'Risk analysis continued')
  if (riskItems.length) {
    riskItems.slice(0, 5).forEach((item, index) => drawRiskItem(doc, config, item, index))
  } else {
    drawCallout(doc, config, {
      title: '风险提示',
      text: '模型未返回明确风险项。建议补充更清晰的正面图、细节图、标题关键词和商品类目信息后再次检测。',
      level: 'warning',
    })
  }

  ensureSpace(doc, config, 142, REPORT_SECTION_TITLES[2], 'Candidate trademark review continued')
  drawSectionLabel(doc, config, '候选权利依据', REPORT_SECTION_TITLES[2], 'Candidate trademark review continued')
  if (candidates.length) {
    candidates.slice(0, 3).forEach((candidate, index) => drawCandidateSummary(doc, config, candidate, index))
  } else {
    drawCallout(doc, config, {
      title: '候选商标',
      text: '当前未获得可展示的候选商标。若商品面向美国市场，建议补充品牌词、图案说明、商品类别后重新检测，并由人工复核 USPTO/TSDR 结果。',
      level: 'warning',
    })
  }

  ensureSpace(doc, config, 170, REPORT_SECTION_TITLES[2], 'Action plan continued')
  drawSectionLabel(doc, config, '整改优先级', REPORT_SECTION_TITLES[2], 'Action plan continued')
  drawActionPlan(doc, config, result.suggestions || [])

  drawFooter(doc, 'Risk analysis and remediation plan')
}

function renderEvidenceSection(doc, report, config) {
  addSectionPage(doc, config, REPORT_SECTION_TITLES[3], 'Evidence checklist and review path')

  drawSectionLabel(doc, config, '建议立即留存', REPORT_SECTION_TITLES[3], 'Evidence checklist continued')
  drawChecklist(doc, config, [
    '本次上传检测的原图、设计源文件、拍摄底稿和修改记录。',
    '供应链授权、设计委托合同、采购凭证和素材授权证明。',
    '平台链接、标题、五点描述、Search Terms、类目和发布时间记录。',
    '候选商标截图、TSDR链接、权利人信息和商品服务类别说明。',
    '如已收到投诉或TRO材料，保存平台通知、法院文件、冻结截图和销售数据。',
  ])

  ensureSpace(doc, config, 172, REPORT_SECTION_TITLES[3], 'Review path continued')
  drawSectionLabel(doc, config, '复核路径', REPORT_SECTION_TITLES[3], 'Review path continued')
  drawProcessSteps(doc, config, [
    ['1', '先处理被标注的高风险视觉元素', '移除或重绘可能形成来源识别的图形、文字、Logo、角色和包装元素。'],
    ['2', '复查商品类别与使用场景', '判断候选商标的商品服务范围是否与当前Listing存在消费者混淆可能。'],
    ['3', '补充权利与原创证据', '整理授权链、原创证明和修改前后对比图，形成可提交给平台或律师的证据包。'],
    ['4', '律师复核后再发布', '高风险或已发生投诉的SKU，建议律师复核后再继续销售或恢复上架。'],
  ])

  ensureSpace(doc, config, 96, REPORT_SECTION_TITLES[3], 'Disclaimer continued')
  drawCallout(doc, config, {
    title: '免责声明',
    text: '本报告为自动化初筛材料，不构成法律意见、授权判断或最终侵权认定。平台处理结果、法院文件、权利人主张和律师意见应优先适用。',
    level: 'info',
  })

  drawFooter(doc, 'Evidence checklist and legal disclaimer')
}

function buildExecutiveSummary(report) {
  const input = report.input || {}
  const result = report.result || {}
  const candidate = firstCandidateReference(report.trademarkCandidates)
  const findings = buildVisualEvidenceFindings(report)
  const score = clampScore(result.score)
  const publishText = result.canPublish
    ? '当前可继续复核，但仍建议保留完整证据链。'
    : '建议暂缓上架，先处理高风险素材、关键词和候选权利冲突。'

  return [
    `综合风险分 ${score}/100。${publishText}`,
    candidate
      ? `系统匹配到候选权利标识 ${candidate.wordmark || candidate.serialNumber || 'USPTO候选商标'}，需重点核查权利状态、商品类别和实际使用方式。`
      : '当前未形成明确候选商标结论，建议补充清晰图片、品牌词或商品类目信息后复核。',
    `图片对比页已标注 ${findings.length} 个疑似侵权关注点，可作为修改素材和律师复核的定位依据。`,
    `${input.platform || '目标平台'} 通常会结合页面整体展示、消费者混淆可能性和权利人投诉材料判断风险。`,
  ]
}

function buildVisualEvidenceFindings(report) {
  const explicitFindings = normalizeVisualFindings(
    (report.result && report.result.visualFindings) || report.visualFindings
  )
  if (explicitFindings.length) return explicitFindings

  const signalFindings = buildSignalRegionFindings(report)
  if (signalFindings.length) return signalFindings

  return buildGenericVisualEvidenceFindings(report)
}

function buildSignalRegionFindings(report) {
  const signals = report.trademarkSignals || {}
  const candidate = firstCandidateReference(report.trademarkCandidates) || {}
  const wordmark = candidate.wordmark || first(normalizeList(signals.wordMarks || signals.searchTerms)) || '疑似商标词'
  const regions = normalizeMarkRegions(signals.markRegions)

  return regions.slice(0, 3).map((item, index) => ({
    id: index + 1,
    title: `疑似侵权区域 ${index + 1} - ${formatRegionType(item.type)}`,
    detail: candidate.wordmark
      ? `${item.label || formatRegionType(item.type)} 与候选商标 ${wordmark} 存在来源识别层面的近似关注点。`
      : `${item.label || formatRegionType(item.type)} 识别为疑似商标词 ${wordmark}，但尚未匹配到官方候选权利记录。`,
    evidence: item.evidence || '该区域来自上传图的商标/Logo视觉线索定位，候选权利图区域仍需结合官方图人工复核。',
    level: item.level || (index === 0 ? 'high' : 'medium'),
    confidence: item.confidence,
    userRegion: expandRegion(item.region, 0.04),
    officialRegion: inferOfficialRegion(index),
  }))
}

function buildGenericVisualEvidenceFindings(report) {
  const result = report.result || {}
  const signals = report.trademarkSignals || {}
  const candidate = firstCandidateReference(report.trademarkCandidates) || {}
  const wordMarks = normalizeList(signals.wordMarks || signals.searchTerms)
  const visuals = normalizeList(signals.visualElements)
  const colors = normalizeList(signals.colors)
  const composition = normalizeList(signals.composition)
  const riskItems = normalizeList((result.riskItems || []).map((item) => item && item.title))
  const wordmark = candidate.wordmark || first(wordMarks) || '疑似商标词'
  const goods = candidate.goodsAndServices || '相关商品/服务类别'

  return [{
    id: 1,
    title: '疑似侵权主体复核区域',
    detail: candidate.wordmark
      ? `${wordMarks.length ? wordMarks.join('、') : wordmark} 与候选商标 ${wordmark} 存在来源识别层面的近似关注点。`
      : `${wordMarks.length ? wordMarks.join('、') : wordmark} 被识别为疑似商标词，但尚未匹配到官方候选权利记录。`,
    evidence: [
      riskItems[0],
      visuals.length ? `视觉线索：${visuals.join('、')}` : '',
      colors.length || composition.length ? `呈现线索：${colors.concat(composition).join('、')}` : '',
      `候选商品/服务范围：${truncate(goods, 90)}`,
    ].filter(Boolean).join('；') || '模型未返回精确坐标，以下标注为主体复核范围，需人工核验。',
    level: 'medium',
    userRegion: { x: 0.12, y: 0.12, w: 0.76, h: 0.76 },
    officialRegion: { x: 0.12, y: 0.12, w: 0.76, h: 0.76 },
  }]
}

function buildSimilarityMatrix(report) {
  const result = report.result || {}
  const signals = report.trademarkSignals || {}
  const candidate = firstCandidateReference(report.trademarkCandidates) || {}
  const score = clampScore(result.score)
  const level = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low'
  const wordMarks = normalizeList(signals.wordMarks || signals.searchTerms)
  const visuals = normalizeList(signals.visualElements)
  const composition = normalizeList(signals.composition)

  return [
    {
      dimension: '文字/商标词',
      assessment: wordMarks.length || candidate.wordmark ? levelText(level) : '待补充',
      evidence: wordMarks.length
        ? `识别到 ${wordMarks.join('、')}；${candidate.wordmark ? `候选商标为 ${candidate.wordmark}` : '尚未匹配到官方候选商标'}。`
        : '未识别到明确文字标识，建议补充更清晰的正面图。',
      level,
    },
    {
      dimension: '图形元素',
      assessment: visuals.length ? levelText(level) : '待人工复核',
      evidence: visuals.length
        ? `图形线索包括 ${visuals.join('、')}。`
        : '当前图形线索不足，建议补充细节图和图案来源说明。',
      level,
    },
    {
      dimension: '颜色/构图',
      assessment: composition.length ? levelText(score >= 60 ? 'medium' : 'low') : '中性观察',
      evidence: composition.length ? `构图线索包括 ${composition.join('、')}。` : '未提取到稳定构图线索。',
      level: score >= 60 ? 'medium' : 'low',
    },
    {
      dimension: '商品类别/使用场景',
      assessment: candidate.goodsAndServices ? levelText(score >= 60 ? 'medium' : 'low') : '待补充',
      evidence: candidate.goodsAndServices
        ? `候选商标商品/服务：${truncate(candidate.goodsAndServices, 160)}`
        : '未获得候选商品服务范围，需要人工检索补充。',
      level: score >= 60 ? 'medium' : 'low',
    },
  ]
}

function normalizeVisualFindings(values) {
  if (!Array.isArray(values)) return []

  return values.map((item, index) => {
    if (!item) return null
    const userRegion = normalizeRegion(item.userRegion || item.region)
    const officialRegion = normalizeRegion(item.officialRegion)
    if (!userRegion && !officialRegion) return null

    return {
      id: index + 1,
      title: String(item.title || `疑似侵权区域 ${index + 1}`).trim(),
      detail: String(item.detail || '模型定位到需要人工复核的视觉相似区域。').trim(),
      evidence: String(item.evidence || '该区域由AI根据上传图与候选权利图的相似点生成。').trim(),
      level: normalizeLevel(item.level || 'medium'),
      confidence: normalizeConfidence(item.confidence),
      userRegion,
      officialRegion,
    }
  }).filter(Boolean).slice(0, 4)
}

function normalizeMarkRegions(values) {
  if (!Array.isArray(values)) return []

  return values.map((item) => {
    const region = normalizeRegion(item && (item.region || item.userRegion))
    if (!region) return null
    return {
      label: String(item.label || item.title || '商标/Logo区域').trim(),
      type: String(item.type || 'logo').trim(),
      evidence: item.evidence ? String(item.evidence).trim() : '',
      level: normalizeLevel(item.level || 'medium'),
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
  if ([x, y, w, h].some((value) => Number.isNaN(value))) return null
  if (w <= 0 || h <= 0) return null

  return roundRegion({
    x: clampUnit(x),
    y: clampUnit(y),
    w: clampUnit(Math.min(w, 1 - clampUnit(x))),
    h: clampUnit(Math.min(h, 1 - clampUnit(y))),
  })
}

function expandRegion(region, padding) {
  const pad = Number(padding) || 0
  const x = Math.max(0, region.x - pad)
  const y = Math.max(0, region.y - pad)
  const right = Math.min(1, region.x + region.w + pad)
  const bottom = Math.min(1, region.y + region.h + pad)

  return roundRegion({
    x,
    y,
    w: Math.max(0.04, right - x),
    h: Math.max(0.04, bottom - y),
  })
}

function inferOfficialRegion(index) {
  const regions = [
    { x: 0.16, y: 0.18, w: 0.68, h: 0.24 },
    { x: 0.18, y: 0.38, w: 0.64, h: 0.42 },
    { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
  ]
  return regions[index] || regions[regions.length - 1]
}

function roundRegion(region) {
  return {
    x: roundUnit(region.x),
    y: roundUnit(region.y),
    w: roundUnit(region.w),
    h: roundUnit(region.h),
  }
}

function roundUnit(value) {
  return Math.round(Number(value) * 1000) / 1000
}

function clampUnit(value) {
  return Math.max(0, Math.min(1, Number(value)))
}

function normalizeConfidence(value) {
  const score = Number(value)
  if (Number.isNaN(score)) return undefined
  return clampUnit(score)
}

function normalizeLevel(level) {
  const value = String(level || '').toLowerCase()
  if (value === 'high' || value === 'medium' || value === 'low') return value
  return 'medium'
}

function formatRegionType(type) {
  const value = String(type || '').toLowerCase()
  if (value.includes('word')) return '文字/商标词'
  if (value.includes('logo') || value.includes('mark')) return 'Logo/商标图形'
  if (value.includes('shape') || value.includes('design')) return '图形/设计元素'
  return '商标/Logo区域'
}

function addSectionPage(doc, config, title, subtitle) {
  doc.addPage()
  drawPageWatermark(doc, config)
  drawPageHeader(doc, title, subtitle)
}

function drawPageWatermark(doc, config) {
  if (!config.watermarkBuffer) return

  const width = 360
  const x = (doc.page.width - width) / 2
  const y = 232
  doc.save()
  doc.opacity(0.055)
  doc.image(config.watermarkBuffer, x, y, { width })
  doc.opacity(1)
  doc.restore()
}

function drawPageHeader(doc, title, subtitle) {
  doc.font('bold').fontSize(16).fillColor(COLORS.ink)
  drawFauxBoldText(doc, title, 44, 42, { width: 330, fauxBoldStrokeWidth: TYPOGRAPHY.titleStrokeWidth })
  doc.font('body').fontSize(9.8).fillColor(COLORS.muted)
  drawFauxBoldText(doc, subtitle, 44, 66, { width: 330, fauxBoldStrokeWidth: TYPOGRAPHY.bodyStrokeWidth })
  doc.moveTo(44, 88).lineTo(551, 88).strokeColor(COLORS.line).lineWidth(1).stroke()
  doc.font('bold').fontSize(9).fillColor(COLORS.blue).text('GGKJ', 501, 43, { width: 50, align: 'right' })
  doc.y = 108
}

function drawHeroBand(doc, level, score) {
  drawPanel(doc, 388, 118, 163, 102, level.soft, level.color)
  doc.font('body').fontSize(10).fillColor(level.color).text('综合风险分', 408, 136)
  doc.font('bold').fontSize(35).fillColor(level.color).text(String(score), 408, 154, { width: 76 })
  doc.font('bold').fontSize(12).fillColor(level.color).text(level.text, 488, 164, { width: 42, align: 'right' })
}

function drawInfoGrid(doc, x, y, rows) {
  const width = PAGE.contentWidth
  const rowHeight = 36

  rows.forEach(([key, value], index) => {
    const rowY = y + index * rowHeight
    drawPanel(doc, x, rowY, width, rowHeight - 6, index % 2 === 0 ? COLORS.faint : COLORS.white, COLORS.line, 6)
    doc.font('bold').fontSize(9.5).fillColor(COLORS.muted).text(key, x + 12, rowY + 9, { width: 86 })
    doc.font('body').fontSize(10.4).fillColor(COLORS.body)
    drawFauxBoldText(doc, String(value || '-'), x + 112, rowY + 8, {
      width: width - 126,
      lineGap: 2,
    })
  })
}

function drawSectionLabel(doc, config, label, title, subtitle) {
  ensureSpace(doc, config, 34, title, subtitle)
  doc.font('bold').fontSize(13).fillColor(COLORS.ink)
  drawFauxBoldText(doc, label, 44, doc.y, { fauxBoldStrokeWidth: TYPOGRAPHY.titleStrokeWidth })
  doc.moveTo(44, doc.y + 6).lineTo(551, doc.y + 6).strokeColor(COLORS.line).lineWidth(1).stroke()
  doc.moveDown(0.85)
}

function drawReadableList(doc, items, options) {
  const config = options || {}
  normalizeList(items).forEach((item) => {
    const height = Math.max(34, doc.heightOfString(item, { width: 452, lineGap: 4 }) + 14)
    ensureSpace(doc, config.pageConfig, height, config.pageTitle, config.pageSubtitle)
    const y = doc.y
    doc.circle(54, y + 10, 4).fill(config.markerColor || COLORS.blue)
    doc.font('body').fontSize(11).fillColor(COLORS.body)
    drawFauxBoldText(doc, item, 70, y, {
      width: 452,
      lineGap: 4,
    })
    doc.y = y + height + (config.itemGap || 5)
  })
}

function drawCallout(doc, pageConfig, options) {
  const item = options || {}
  const level = item.level || 'info'
  const color = level === 'warning' ? COLORS.amber : COLORS.blue
  const fill = level === 'warning' ? COLORS.amberSoft : COLORS.blueSoft
  const height = Math.max(82, doc.heightOfString(item.text || '', { width: 370, lineGap: 5 }) + 38)
  ensureSpace(doc, pageConfig, height + 10, options && options.pageTitle, options && options.pageSubtitle)
  const y = doc.y

  drawPanel(doc, 44, y, PAGE.contentWidth, height, fill, color)
  doc.font('bold').fontSize(11).fillColor(color)
  drawFauxBoldText(doc, item.title || '提示', 62, y + 16, { width: 118, fauxBoldStrokeWidth: TYPOGRAPHY.titleStrokeWidth })
  doc.font('body').fontSize(10.6).fillColor(COLORS.body)
  drawFauxBoldText(doc, item.text || '', 176, y + 16, {
    width: 352,
    lineGap: 5,
  })
  doc.y = y + height + 16
}

function drawImageBox(doc, x, y, width, height, title, imageBuffer, url, findings, regionKey, options) {
  const config = options || {}
  drawPanel(doc, x, y, width, height, COLORS.white, COLORS.line)
  doc.font('bold').fontSize(10.4).fillColor(COLORS.ink)
  drawFauxBoldText(doc, title, x + 12, y + 12, { width: width - 24, fauxBoldStrokeWidth: TYPOGRAPHY.titleStrokeWidth })

  const imageX = x + 12
  const imageY = y + 42
  const imageW = width - 24
  const imageH = height - 56
  drawPanel(doc, imageX, imageY, imageW, imageH, COLORS.faint, '#cbd5e1', 8)

  const imageDrawn = imageBuffer && drawEmbeddedImage(doc, imageBuffer, imageX, imageY, imageW, imageH)
  if (imageDrawn && config.sourceLabel) {
    drawImageSourceCaption(doc, config.sourceLabel, imageX, imageY, imageW, imageH)
  }
  if (!imageDrawn) {
    if (config.fallbackKind === 'candidateReference') {
      drawCandidateReferenceCard(doc, config.candidate, imageX, imageY, imageW, imageH)
    } else {
      drawImagePlaceholder(doc, url, imageX, imageY, imageW, imageH)
    }
  }

  if (imageDrawn || config.overlayOnFallback !== false) {
    drawAnnotationOverlay(doc, imageX, imageY, imageW, imageH, findings, regionKey)
  }

  return Boolean(imageDrawn)
}

function drawImageSourceCaption(doc, label, imageX, imageY, imageW, imageH) {
  const text = `来源：${truncate(label, 42)}`
  const y = imageY + imageH - 17
  doc.save()
  doc.roundedRect(imageX + 8, y, imageW - 16, 12, 6).fill('#ffffff')
  doc.opacity(0.9)
  doc.font('body').fontSize(6.8).fillColor(COLORS.blue).text(text, imageX + 12, y + 3, {
    width: imageW - 24,
    align: 'center',
    lineBreak: false,
  })
  doc.opacity(1)
  doc.restore()
}

function drawEmbeddedImage(doc, imageBuffer, imageX, imageY, imageW, imageH) {
  try {
    doc.image(imageBuffer, imageX + 5, imageY + 5, {
      fit: [imageW - 10, imageH - 10],
      align: 'center',
      valign: 'center',
    })
    return true
  } catch (error) {
    return false
  }
}

function drawImagePlaceholder(doc, url, imageX, imageY, imageW, imageH) {
  const text = url
    ? '图片格式暂未嵌入\n请以原上传图为准'
    : '暂无图片'

  doc.font('body').fontSize(8.2).fillColor(COLORS.muted)
    .text(text, imageX + 12, imageY + imageH / 2 - 8, {
      width: imageW - 24,
      align: 'center',
    })
}

function drawCandidateReferenceCard(doc, candidate, imageX, imageY, imageW, imageH) {
  const summary = buildCandidateReferenceSummary(candidate)
  const cardX = imageX + 10
  const cardY = imageY + 10
  const cardW = imageW - 20
  const cardH = imageH - 20
  const wordmarkY = cardY + 38
  const wordmarkH = 42
  const wordmark = truncate(summary.wordmark, 30)
  const wordmarkFontSize = summary.isEmpty
    ? 15.5
    : wordmark.length > 22 ? 15 : wordmark.length > 14 ? 18 : 22

  drawPanel(doc, cardX, cardY, cardW, cardH, COLORS.white, '#bfd1e8', 8)
  doc.font('bold').fontSize(7.6).fillColor(COLORS.blue)
  drawFauxBoldText(doc, summary.note, cardX + 10, cardY + 10, {
    width: cardW - 20,
    fauxBoldStrokeWidth: TYPOGRAPHY.bodyStrokeWidth,
  })

  doc.roundedRect(cardX + 12, wordmarkY, cardW - 24, wordmarkH, 8)
    .fill('#eef6ff')
    .strokeColor('#9bbbe6')
    .lineWidth(1)
    .stroke()
  doc.font('bold').fontSize(wordmarkFontSize).fillColor(COLORS.ink)
  drawFauxBoldText(doc, wordmark, cardX + 20, wordmarkY + 11, {
    width: cardW - 40,
    align: 'center',
    lineBreak: false,
    fauxBoldStrokeWidth: 0.14,
    fauxBoldStrokeColor: COLORS.ink,
  })

  drawReferenceBadge(doc, cardX + 12, wordmarkY + wordmarkH + 8, summary.status)
  doc.font('body').fontSize(7.5).fillColor(COLORS.muted)
  drawFauxBoldText(doc, summary.serialLine, cardX + 80, wordmarkY + wordmarkH + 12, {
    width: cardW - 92,
    lineBreak: false,
  })

  doc.font('body').fontSize(7.2).fillColor(COLORS.body)
  drawFauxBoldText(doc, summary.ownerLine, cardX + 12, wordmarkY + wordmarkH + 29, {
    width: cardW - 24,
    lineBreak: false,
  })
  drawFauxBoldText(doc, summary.goodsLine, cardX + 12, wordmarkY + wordmarkH + 45, {
    width: cardW - 24,
    lineBreak: false,
  })
}

function drawReferenceBadge(doc, x, y, status) {
  const label = truncate(status || 'TO REVIEW', 13)
  const level = /LIVE|REGISTERED|ACTIVE/i.test(label) ? 'low' : 'medium'
  const color = levelColor(level)
  const soft = levelSoftColor(level)

  doc.save()
  doc.roundedRect(x, y, 58, 18, 9).fill(soft)
  doc.font('bold').fontSize(7.2).fillColor(color).text(label, x + 5, y + 5, {
    width: 48,
    align: 'center',
    lineBreak: false,
  })
  doc.restore()
}

function buildCandidateReferenceSummary(candidate) {
  const item = candidate || {}
  if (!hasCandidateReference(item)) {
    return {
      isEmpty: true,
      wordmark: '未匹配到官方候选',
      status: 'NO MATCH',
      serialLine: 'Serial: - | Reg: -',
      ownerLine: 'Owner: 未获得可核验权利人',
      goodsLine: 'Goods/Services: 未获得可核验商品/服务类别',
      sourceLine: 'Source: USPTO/TSDR 未返回可靠候选',
      hasOfficialImageUrl: false,
      note: '本次未匹配到可核验的官方候选商标图或注册记录。请结合检索词、商品类别和人工 USPTO/TSDR 复核继续确认。',
    }
  }

  const wordmark = String(item.wordmark || item.serialNumber || '候选权利标识').trim()
  const status = String(item.status || 'TO REVIEW').trim()
  const serialNumber = String(item.serialNumber || '-').trim()
  const registrationNumber = String(item.registrationNumber || '-').trim()
  const ownerName = String(item.ownerName || 'Rights owner pending review').trim()
  const goodsAndServices = String(item.goodsAndServices || 'Goods/services pending review').trim()
  const hasOfficialImageUrl = Boolean(String(item.markImageUrl || '').trim())
  const sourceLabel = String(item.markImageSourceLabel || (item.sourceUrl ? 'USPTO/TSDR official record' : 'Rights source pending review')).trim()

  return {
    wordmark,
    status,
    serialLine: `Serial: ${serialNumber} | Reg: ${registrationNumber}`,
    ownerLine: `Owner: ${truncate(ownerName, 50)}`,
    goodsLine: `Goods/Services: ${truncate(goodsAndServices, 70)}`,
    sourceLine: `Source: ${truncate(sourceLabel, 44)}`,
    hasOfficialImageUrl,
    note: hasOfficialImageUrl
      ? `官方图像暂未嵌入，以下为候选权利文字参照。来源：${truncate(sourceLabel, 24)}。`
      : `该候选记录暂无可用官方图像，以下为候选权利文字参照。来源：${truncate(sourceLabel, 24)}。`,
  }
}

function firstCandidateReference(candidates) {
  return (Array.isArray(candidates) ? candidates : []).find(hasCandidateReference) || null
}

function hasCandidateReference(candidate) {
  if (!candidate) return false
  return Boolean(
    String(candidate.serialNumber || '').trim() ||
    String(candidate.registrationNumber || '').trim() ||
    String(candidate.ownerName || '').trim() ||
    String(candidate.goodsAndServices || '').trim() ||
    String(candidate.markImageUrl || '').trim() ||
    String(candidate.sourceUrl || '').trim()
  )
}

function drawAnnotationOverlay(doc, x, y, width, height, findings, regionKey) {
  ;(findings || []).forEach((finding) => {
    const region = finding[regionKey]
    if (!region) return

    const rx = x + region.x * width
    const ry = y + region.y * height
    const rw = region.w * width
    const rh = region.h * height

    doc.save()
    doc.roundedRect(rx, ry, rw, rh, 5).strokeColor(COLORS.red).lineWidth(1.7).stroke()
    doc.circle(rx + 10, ry + 10, 9).fill(COLORS.red)
    doc.font('bold').fontSize(8).fillColor(COLORS.white)
      .text(String(finding.id), rx + 5, ry + 5, { width: 10, align: 'center' })
    doc.restore()
  })
}

function drawFindingRow(doc, config, finding) {
  doc.font('body').fontSize(10)
  const detailHeight = doc.heightOfString(finding.detail, { width: 420, lineGap: 4 })
  doc.font('body').fontSize(9.4)
  const evidenceHeight = doc.heightOfString(finding.evidence, { width: 420, lineGap: 3 })
  const height = Math.max(84, detailHeight + evidenceHeight + 58)
  ensureSpace(doc, config, height + 8, REPORT_SECTION_TITLES[1], 'Evidence findings continued')
  const y = doc.y

  doc.circle(55, y + 15, 11).fill(COLORS.red)
  doc.font('bold').fontSize(9).fillColor(COLORS.white).text(String(finding.id), 50, y + 9, { width: 10, align: 'center' })
  doc.font('bold').fontSize(10.7).fillColor(COLORS.ink)
  drawFauxBoldText(doc, finding.title, 74, y, { width: 420, fauxBoldStrokeWidth: TYPOGRAPHY.titleStrokeWidth })
  doc.font('body').fontSize(10).fillColor(COLORS.body)
  drawFauxBoldText(doc, finding.detail, 74, y + 19, { width: 420, lineGap: 4 })
  doc.font('body').fontSize(9.4).fillColor(COLORS.blue)
  drawFauxBoldText(doc, `依据：${finding.evidence}`, 74, y + 48 + detailHeight, {
    width: 420,
    lineGap: 3,
  })
  doc.y = y + height + 4
}

function drawSimilarityMatrix(doc, config, rows) {
  const x = 44
  const columns = [112, 96, 299]
  let y = doc.y

  drawPanel(doc, x, y, PAGE.contentWidth, 30, COLORS.ink, COLORS.ink, 8)
  doc.font('bold').fontSize(9.5).fillColor(COLORS.white).text('维度', x + 10, y + 10, { width: columns[0] })
  doc.text('评估', x + columns[0] + 10, y + 10, { width: columns[1] })
  doc.text('依据', x + columns[0] + columns[1] + 10, y + 10, { width: columns[2] - 20 })
  y += 30

  rows.forEach((row) => {
    const rowHeight = Math.max(50, doc.heightOfString(row.evidence, { width: columns[2] - 20, lineGap: 4 }) + 24)
    if (y + rowHeight > PAGE.bottom) {
      doc.y = y
      ensureSpace(doc, config, rowHeight + 42, REPORT_SECTION_TITLES[1], 'Similarity assessment continued')
      y = doc.y
    }
    drawPanel(doc, x, y, PAGE.contentWidth, rowHeight, COLORS.white, COLORS.line, 0)
    doc.font('bold').fontSize(9.7).fillColor(COLORS.ink)
    drawFauxBoldText(doc, row.dimension, x + 10, y + 13, { width: columns[0] - 16, fauxBoldStrokeWidth: TYPOGRAPHY.titleStrokeWidth })
    doc.font('bold').fontSize(9.7).fillColor(levelColor(row.level))
    drawFauxBoldText(doc, row.assessment, x + columns[0] + 10, y + 13, { width: columns[1] - 16, fauxBoldStrokeWidth: TYPOGRAPHY.titleStrokeWidth })
    doc.font('body').fontSize(9.7).fillColor(COLORS.body)
    drawFauxBoldText(doc, row.evidence, x + columns[0] + columns[1] + 10, y + 13, {
      width: columns[2] - 20,
      lineGap: 4,
    })
    y += rowHeight
  })

  doc.y = y + 16
}

function drawRiskItem(doc, config, item, index) {
  const detail = item.detail || '建议人工复核该风险点。'
  const height = Math.max(76, doc.heightOfString(detail, { width: 392, lineGap: 4 }) + 44)
  ensureSpace(doc, config, height + 8, REPORT_SECTION_TITLES[2], 'Risk analysis continued')
  const y = doc.y
  const level = item.level || 'medium'

  drawPanel(doc, 44, y, PAGE.contentWidth, height, COLORS.white, COLORS.line)
  doc.font('bold').fontSize(10.7).fillColor(COLORS.ink)
    .text(`${index + 1}. ${item.title || '风险提示'}`, 62, y + 16, { width: 330 })
  drawSmallBadge(doc, 462, y + 14, item.levelText || levelText(level), level)
  doc.font('body').fontSize(10.2).fillColor(COLORS.body)
  drawFauxBoldText(doc, detail, 62, y + 40, { width: 430, lineGap: 4 })
  doc.y = y + height + 12
}

function drawCandidateSummary(doc, config, candidate, index) {
  const goods = truncate(candidate.goodsAndServices || '-', 170)
  const height = Math.max(82, doc.heightOfString(goods, { width: 420, lineGap: 3 }) + 52)
  ensureSpace(doc, config, height + 8, REPORT_SECTION_TITLES[2], 'Candidate trademark review continued')
  const y = doc.y

  drawPanel(doc, 44, y, PAGE.contentWidth, height, COLORS.white, COLORS.line)
  doc.circle(62, y + 20, 11).fill(COLORS.blue)
  doc.font('bold').fontSize(9).fillColor(COLORS.white).text(String(index + 1), 57, y + 14, { width: 10, align: 'center' })
  doc.font('bold').fontSize(11).fillColor(COLORS.ink).text(candidate.wordmark || '未命名商标', 84, y + 12, { width: 280 })
  drawSmallBadge(doc, 462, y + 12, candidate.status || 'UNKNOWN', candidate.status === 'LIVE' ? 'green' : 'amber')
  doc.font('body').fontSize(9.4).fillColor(COLORS.muted)
  drawFauxBoldText(doc, `Serial: ${candidate.serialNumber || '-'}    Registration: ${candidate.registrationNumber || '-'}`, 84, y + 34, { width: 420 })
  drawFauxBoldText(doc, `Owner: ${candidate.ownerName || '-'}`, 84, y + 49, { width: 420 })
  doc.fillColor(COLORS.body)
  drawFauxBoldText(doc, `Goods/Services: ${goods}`, 84, y + 64, { width: 420, lineGap: 3 })
  doc.y = y + height + 12
}

function drawActionPlan(doc, config, suggestions) {
  const actions = normalizeList(suggestions).length ? normalizeList(suggestions) : [
    '暂缓发布或下架高风险素材，先完成图片、文字和关键词修改。',
    '补充原创设计、供应商授权和平台页面修改前后截图。',
    '高风险SKU建议交给知识产权律师复核后再恢复销售。',
  ]

  actions.slice(0, 5).forEach((action, index) => {
    const height = Math.max(48, doc.heightOfString(action, { width: 426, lineGap: 4 }) + 24)
    ensureSpace(doc, config, height + 8, REPORT_SECTION_TITLES[2], 'Action plan continued')
    const y = doc.y
    drawPanel(doc, 44, y, PAGE.contentWidth, height, index === 0 ? COLORS.redSoft : COLORS.faint, index === 0 ? '#fecaca' : COLORS.line)
    doc.circle(62, y + 22, 10).fill(index === 0 ? COLORS.red : COLORS.blue)
    doc.font('bold').fontSize(8.5).fillColor(COLORS.white).text(String(index + 1), 57, y + 16, { width: 10, align: 'center' })
    doc.font('body').fontSize(10.4).fillColor(COLORS.body)
    drawFauxBoldText(doc, action, 84, y + 13, { width: 426, lineGap: 4 })
    doc.y = y + height + 10
  })
}

function drawChecklist(doc, config, items) {
  normalizeList(items).forEach((item) => {
    const height = Math.max(36, doc.heightOfString(item, { width: 450, lineGap: 4 }) + 12)
    ensureSpace(doc, config, height + 6, REPORT_SECTION_TITLES[3], 'Evidence checklist continued')
    const y = doc.y
    doc.roundedRect(46, y + 2, 18, 18, 4).strokeColor(COLORS.blue).lineWidth(1.3).stroke()
    doc.moveTo(50, y + 12).lineTo(54, y + 16).lineTo(61, y + 7).strokeColor(COLORS.blue).lineWidth(1.4).stroke()
    doc.font('body').fontSize(10.7).fillColor(COLORS.body)
    drawFauxBoldText(doc, item, 76, y, { width: 450, lineGap: 4 })
    doc.y = y + height + 6
  })
}

function drawProcessSteps(doc, config, steps) {
  steps.forEach(([mark, title, desc]) => {
    const descHeight = doc.heightOfString(desc, { width: 410, lineGap: 4 })
    const height = Math.max(62, descHeight + 34)
    ensureSpace(doc, config, height + 8, REPORT_SECTION_TITLES[3], 'Review path continued')
    const y = doc.y
    doc.circle(60, y + 19, 15).fill(COLORS.blue)
    doc.font('bold').fontSize(10).fillColor(COLORS.white).text(mark, 53, y + 12, { width: 14, align: 'center' })
    doc.font('bold').fontSize(10.8).fillColor(COLORS.ink).text(title, 88, y + 2, { width: 420 })
    doc.font('body').fontSize(10).fillColor(COLORS.body)
    drawFauxBoldText(doc, desc, 88, y + 23, { width: 420, lineGap: 4 })
    doc.y = y + height + 8
  })
}

function drawPanel(doc, x, y, width, height, fill, stroke, radius) {
  const r = typeof radius === 'number' ? radius : 9
  doc.save()
  doc.roundedRect(x, y, width, height, r).fill(fill || COLORS.white)
  doc.roundedRect(x, y, width, height, r).strokeColor(stroke || COLORS.line).lineWidth(1).stroke()
  doc.restore()
}

function drawFauxBoldText(doc, text, x, y, options) {
  const drawOptions = Object.assign({}, options || {})
  const strokeWidth = typeof drawOptions.fauxBoldStrokeWidth === 'number'
    ? drawOptions.fauxBoldStrokeWidth
    : TYPOGRAPHY.bodyStrokeWidth
  const strokeColor = drawOptions.fauxBoldStrokeColor || COLORS.body
  delete drawOptions.fauxBoldStrokeWidth
  delete drawOptions.fauxBoldStrokeColor

  doc.save()
  doc.lineWidth(strokeWidth)
  doc.strokeColor(strokeColor)
  doc.text(text, x, y, Object.assign({}, drawOptions, {
    fill: true,
    stroke: strokeWidth > 0,
  }))
  const afterY = doc.y
  doc.restore()
  doc.y = afterY
}

function installBuiltinFontFallback(doc) {
  const originalFont = doc.font.bind(doc)
  const originalText = doc.text.bind(doc)

  doc.font = (fontName, ...args) => {
    if (fontName === 'body') return originalFont('Helvetica', ...args)
    if (fontName === 'bold') return originalFont('Helvetica-Bold', ...args)
    return originalFont(fontName, ...args)
  }

  doc.text = (text, ...args) => originalText(sanitizeBuiltinFontText(text), ...args)
}

function sanitizeBuiltinFontText(value) {
  const text = String(value == null ? '' : value)
  const ascii = text
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return ascii || '-'
}

function drawSmallBadge(doc, x, y, text, level) {
  const color = levelColor(level)
  const soft = levelSoftColor(level)
  doc.save()
  doc.roundedRect(x, y, 70, 23, 11).fill(soft)
  doc.font('bold').fontSize(8.5).fillColor(color).text(String(text || '-'), x + 8, y + 7, {
    width: 54,
    align: 'center',
  })
  doc.restore()
}

function ensureSpace(doc, config, needed, title, subtitle) {
  if (doc.y + needed < PAGE.bottom) return
  drawFooter(doc, 'Continued report section')
  if (config) {
    addSectionPage(doc, config, title || '报告续页', subtitle || 'Continued')
  } else {
    doc.addPage()
  }
}

function drawFooter(doc, label) {
  const y = doc.page.height - 52
  const previousY = doc.y
  doc.moveTo(44, y - 8).lineTo(551, y - 8).strokeColor('#e5eaf3').lineWidth(1).stroke()
  doc.font('body').fontSize(8.3).fillColor('#64748b').text(label, 44, y, {
    width: 360,
    height: 12,
    lineBreak: false,
  })
  doc.y = previousY
}

function getRiskLevel(result) {
  const score = clampScore(result && result.score)
  const key = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low'
  return {
    key,
    text: key === 'high' ? '高风险' : key === 'medium' ? '中风险' : '低风险',
    color: levelColor(key),
    soft: levelSoftColor(key),
  }
}

function levelText(level) {
  if (level === 'high') return '高风险'
  if (level === 'medium') return '中风险'
  if (level === 'low') return '低风险'
  return String(level || '待复核')
}

function levelColor(level) {
  if (level === 'high') return COLORS.red
  if (level === 'medium') return COLORS.amber
  if (level === 'low') return COLORS.green
  return COLORS.blue
}

function levelSoftColor(level) {
  if (level === 'high') return COLORS.redSoft
  if (level === 'medium') return COLORS.amberSoft
  if (level === 'low') return COLORS.greenSoft
  return COLORS.blueSoft
}

function formatMode(mode) {
  const map = {
    product: '产品链接检测',
    image: '图片识别检测',
    keyword: '关键词检测',
    copy: '文案版权检测',
    patent: '外观专利检测',
    batch: '批量检测',
    risk_detect: '智能风险检测',
  }
  return map[mode] || mode
}

async function resolveCandidateImage(candidate) {
  const sources = buildCandidateImageSources(candidate)
  for (const source of sources) {
    try {
      const buffer = await fetchImageBuffer(source.url)
      if (buffer) return { buffer, source }
    } catch (error) {
      // Try the next trusted candidate image source.
    }
  }
  return null
}

function buildCandidateImageSources(candidate) {
  const item = candidate || {}
  const sources = []
  if (Array.isArray(item.markImageSources)) {
    item.markImageSources.forEach((source) => {
      if (source && source.url) {
        sources.push({
          label: source.label || item.markImageSourceLabel || 'USPTO/TSDR official record image',
          trust: source.trust || item.markImageSourceTrust || 'official-public',
          url: source.url,
        })
      }
    })
  }
  if (item.markImageUrl) {
    sources.push({
      label: item.markImageSourceLabel || 'USPTO/TSDR official record image',
      trust: item.markImageSourceTrust || 'official-public',
      url: item.markImageUrl,
    })
  }

  const seen = new Set()
  return sources.filter((source) => {
    const key = String(source.url || '').trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function fetchImageBuffer(urlString, redirectCount) {
  const value = String(urlString || '').trim()
  if (!value) return Promise.resolve(null)

  const url = new URL(value)
  const client = url.protocol === 'http:' ? http : https
  const redirects = Number(redirectCount) || 0

  return new Promise((resolve, reject) => {
    const req = client.get({
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      headers: {
        accept: 'image/*,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0 (compatible; GGKJ-IP-Risk/1.0)',
      },
      timeout: 7000,
    }, (res) => {
      const headers = res.headers || {}
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && headers.location && redirects < 3) {
        res.resume()
        const nextUrl = new URL(headers.location, url).toString()
        fetchImageBuffer(nextUrl, redirects + 1).then(resolve).catch(reject)
        return
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume()
        reject(new Error(`image status ${res.statusCode}`))
        return
      }

      const chunks = []
      let total = 0
      res.on('data', (chunk) => {
        total += chunk.length
        if (total > MAX_IMAGE_BYTES) {
          req.destroy(new Error('image response too large'))
          return
        }
        chunks.push(chunk)
      })
      res.on('end', () => {
        const buffer = Buffer.concat(chunks)
        if (!isSupportedImageBuffer(buffer, headers['content-type'])) {
          reject(new Error('image response is not a supported image'))
          return
        }
        resolve(buffer)
      })
    })

    req.on('timeout', () => {
      req.destroy(new Error('image request timed out'))
    })
    req.on('error', reject)
  })
}

function isSupportedImageBuffer(buffer, contentType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return false
  const type = String(contentType || '').toLowerCase()
  const hasImageType = !type || type.includes('image/')
  const isPng = buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8
  return hasImageType && (isPng || isJpeg)
}

function pickFontPath(preferredPath) {
  const candidates = [preferredPath, DEFAULT_FONT_PATH, FALLBACK_FONT_PATH].filter(Boolean)
  return candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate)
    } catch (error) {
      return false
    }
  })
}

function readOptionalFile(filePath) {
  try {
    return filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath) : null
  } catch (error) {
    return null
  }
}

function first(values) {
  return Array.isArray(values) && values.length ? values[0] : null
}

function normalizeList(values) {
  if (!Array.isArray(values)) {
    return values ? [String(values).trim()].filter(Boolean) : []
  }

  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
}

function truncate(value, maxLength) {
  const text = String(value || '')
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}...`
}

function clampScore(score) {
  const value = Number(score)
  if (Number.isNaN(value)) return 45
  return Math.max(0, Math.min(100, Math.round(value)))
}

function formatReportSource(source) {
  const normalized = String(source || '').trim()
  if (!normalized || normalized === 'ai-cloud-function' || normalized === 'ai-cloud-fallback') {
    return '港港跨境知识产权检测'
  }

  return normalized
}

function formatNow() {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

module.exports = {
  REPORT_SECTION_TITLES,
  TYPOGRAPHY,
  WATERMARK_PATH,
  buildCandidateReferenceSummary,
  buildSimilarityMatrix,
  buildVisualEvidenceFindings,
  formatReportSource,
  generatePdfReportBuffer,
}
