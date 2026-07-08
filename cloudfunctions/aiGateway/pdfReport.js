const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')
const PDFDocument = require('pdfkit')

const DEFAULT_FONT_PATH = path.join(__dirname, 'assets', 'fonts', 'NotoSansSC-VF.ttf')
const FALLBACK_FONT_PATH = 'C:/Windows/Fonts/NotoSansSC-VF.ttf'

const COLORS = {
  ink: '#111827',
  muted: '#64748b',
  soft: '#f8fafc',
  line: '#dbe3ef',
  blue: '#1d4ed8',
  blueSoft: '#e8f0ff',
  red: '#dc2626',
  redSoft: '#fee2e2',
  amber: '#b45309',
  amberSoft: '#fef3c7',
  green: '#047857',
  greenSoft: '#d1fae5',
}

async function generatePdfReportBuffer(report, options) {
  const config = options || {}
  const doc = new PDFDocument({
    size: 'A4',
    margin: 42,
    info: {
      Title: 'Professional IP/TRO Risk Screening Report',
      Author: 'GGKJ',
      Creator: 'aiGateway',
    },
  })
  const chunks = []

  doc.on('data', (chunk) => chunks.push(chunk))

  const fontPath = pickFontPath(config.fontPath)
  if (fontPath) {
    doc.registerFont('body', fontPath)
    doc.registerFont('bold', fontPath)
    doc.font('body')
  }

  renderCover(doc, report)
  await renderImageComparison(doc, report, config)
  renderTrademarkCandidates(doc, report)
  renderRiskAnalysis(doc, report)
  renderEvidenceChecklist(doc)

  doc.end()

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
}

function renderCover(doc, report) {
  const input = report.input || {}
  const result = report.result || {}
  const level = getRiskLevel(result)
  const score = Number(result.score || 0)

  drawCoverHeader(doc)

  doc.font('bold').fontSize(22).fillColor(COLORS.ink)
    .text('专业侵权风险初筛报告', 42, 138, { width: 330 })
  doc.font('body').fontSize(10).fillColor(COLORS.muted)
    .text('Professional IP/TRO Risk Screening Report', 42, 166, { width: 330 })

  drawScoreCard(doc, 402, 124, 150, 96, score, level)

  drawInfoGrid(doc, 42, 242, [
    ['检测对象', input.productTitle || input.productUrl || input.copyText || '用户上传商标/商品素材'],
    ['平台 / 市场', `${input.platform || '未填写'} / ${input.countryRegion || '未填写'}`],
    ['检测模式', formatMode(input.mode || 'risk_detect')],
    ['生成时间', report.generatedAt || new Date().toISOString()],
    ['报告来源', result.source || 'AI + 公开商标检索 + 本地规则'],
    ['初筛结论', result.canPublish ? '可继续复核后上架' : '建议暂缓上架并先处理风险点'],
  ])

  sectionTitle(doc, '专业结论摘要', 42, 430)
  const summary = buildExecutiveSummary(report)
  drawBulletPanel(doc, 42, 462, 510, summary, {
    markerColor: level.color,
    title: '核心判断',
  })

  sectionTitle(doc, '报告使用边界', 42, 650)
  doc.font('body').fontSize(9).fillColor(COLORS.muted)
    .text(
      '本报告用于跨境电商上架前风险初筛、证据整理和律师复核准备。报告不构成法律意见，也不等同于法院、平台或权利人的最终判断。高风险结果建议交由知识产权律师结合权利状态、商品类别、实际使用方式和平台规则复核。',
      42,
      680,
      { width: 510, lineGap: 5 }
    )

  drawFooter(doc, 'Confidential - GGKJ Risk Screening')
}

async function renderImageComparison(doc, report, config) {
  doc.addPage()
  pageHeader(doc, '图片风险标注与权利图对比', 'Visual Evidence Board')

  const userImageUrl = first(report.imageUrls)
  const candidate = first(report.trademarkCandidates)
  const officialImageUrl = candidate && candidate.markImageUrl
  const findings = buildVisualEvidenceFindings(report)
  const userImage = config.fetchImages === false ? null : await fetchImageBuffer(userImageUrl).catch(() => null)
  const officialImage = config.fetchImages === false ? null : await fetchImageBuffer(officialImageUrl).catch(() => null)

  drawRiskNote(doc, 42, 94, '标注说明', '红色编号框为系统根据模型识别线索、USPTO候选商标和风险项生成的疑似关注区域。标注用于辅助复核，不代表最终侵权认定。')

  const top = 154
  const boxWidth = 245
  const boxHeight = 220
  drawImageBox(doc, 42, top, boxWidth, boxHeight, '用户上传图 - 疑似风险区域', userImage, userImageUrl, findings, 'userRegion')
  drawImageBox(doc, 307, top, boxWidth, boxHeight, '候选权利图 - 对比参照', officialImage, officialImageUrl, findings, 'officialRegion')

  doc.y = top + boxHeight + 24
  sectionSubtitle(doc, '编号证据说明')
  findings.forEach((finding) => {
    drawFindingRow(doc, finding)
  })

  ensurePageSpace(doc, 170, '相似性评估矩阵', 'Similarity Matrix Continued')
  sectionSubtitle(doc, '相似性评估矩阵')
  drawSimilarityMatrix(doc, buildSimilarityMatrix(report))

  drawFooter(doc, 'Visual comparison uses AI extraction + USPTO candidate data')
}

function renderTrademarkCandidates(doc, report) {
  doc.addPage()
  pageHeader(doc, '权威候选商标检索', 'USPTO Candidate Review')

  const candidates = report.trademarkCandidates || []
  if (!candidates.length) {
    drawRiskNote(doc, 42, 112, '检索结果', '当前未获取到可展示的 USPTO 候选商标。若检测对象面向美国市场，建议补充更清晰的商标词、图案说明或商品类目后重新检测。')
    drawFooter(doc, 'USPTO candidate section')
    return
  }

  candidates.slice(0, 6).forEach((candidate, index) => {
    ensurePageSpace(doc, 118)
    drawCandidateCard(doc, candidate, index)
  })

  drawFooter(doc, 'Candidate data is sourced from public USPTO search results')
}

function renderRiskAnalysis(doc, report) {
  doc.addPage()
  pageHeader(doc, '风险结论与行动方案', 'Risk Analysis and Action Plan')

  const result = report.result || {}
  const riskItems = result.riskItems || []

  sectionSubtitle(doc, '风险点拆解')
  if (riskItems.length) {
    riskItems.forEach((item, index) => drawRiskItem(doc, item, index))
  } else {
    drawRiskNote(doc, doc.x, doc.y, '风险提示', '模型未返回明确风险点，建议人工复核商标、版权、外观专利和平台投诉规则。')
  }

  ensurePageSpace(doc, 160)
  sectionSubtitle(doc, '建议动作优先级')
  drawActionPlan(doc, result.suggestions || [])

  const warnings = report.warnings || result.usptoWarnings || []
  if (warnings.length) {
    ensurePageSpace(doc, 110)
    sectionSubtitle(doc, '系统提示')
    drawBulletPanel(doc, doc.x, doc.y, 510, warnings, {
      markerColor: COLORS.amber,
    })
  }

  drawFooter(doc, 'Risk conclusion is for screening and evidence preparation')
}

function renderEvidenceChecklist(doc) {
  doc.addPage()
  pageHeader(doc, '证据清单与复核路径', 'Evidence Checklist')

  sectionSubtitle(doc, '建议立即留存的材料')
  drawChecklist(doc, [
    '上传检测的原图、设计源文件、拍摄底稿和修改记录。',
    '供应链授权、设计委托合同、采购凭证和素材授权证明。',
    '平台链接、标题、五点描述、Search Terms、类目和发布时间记录。',
    'USPTO候选商标截图、TSDR链接、权利人信息和商品类别说明。',
    '如已收到投诉或TRO材料，保存平台通知、法院文件、冻结截图和销售数据。',
  ])

  ensurePageSpace(doc, 150)
  sectionSubtitle(doc, '复核路径')
  drawProcessSteps(doc, [
    ['1', '先处理高风险视觉元素', '移除或重绘被标注的图形、文字、Logo和角色元素。'],
    ['2', '复查商品类别与使用方式', '判断候选商标的商品服务范围是否与当前Listing存在关联。'],
    ['3', '补充权利与原创证据', '整理授权链、原创证明和修改前后对比图。'],
    ['4', '律师复核后再发布', '高风险或已发生投诉的SKU，建议律师复核后再继续销售。'],
  ])

  sectionSubtitle(doc, '免责声明')
  doc.font('body').fontSize(9).fillColor(COLORS.muted)
    .text(
      '本报告为自动化初筛材料，不构成法律意见、授权判断或最终侵权认定。平台处理结果、法院文件、权利人主张和律师意见应优先适用。',
      42,
      doc.y,
      { width: 510, lineGap: 5 }
    )

  drawFooter(doc, 'Evidence checklist and legal disclaimer')
}

function buildExecutiveSummary(report) {
  const input = report.input || {}
  const result = report.result || {}
  const candidate = first(report.trademarkCandidates)
  const findings = buildVisualEvidenceFindings(report)
  const score = Number(result.score || 0)

  return [
    `综合风险分 ${score}/100，${result.canPublish ? '当前可继续复核，但仍建议保留证据链。' : '建议暂缓上架，先处理高风险素材和关键词。'}`,
    candidate
      ? `系统匹配到候选权利标识 ${candidate.wordmark || candidate.serialNumber || 'USPTO候选商标'}，需重点核查权利状态、商品类别和实际使用方式。`
      : '当前未形成明确候选商标结论，建议补充更清晰的图片、品牌词或商品类目信息。',
    findings.length
      ? `图片对比页已标注 ${findings.length} 个疑似侵权关注点，可作为后续修改素材和律师复核的定位依据。`
      : '当前图片线索较弱，建议补充正面图、细节图和图案来源说明。',
    input.platform ? `${input.platform} 平台通常会结合商品页面整体展示、消费者混淆可能性和权利人投诉材料判断风险。` : '平台审核通常会结合页面整体展示、消费者混淆可能性和权利人投诉材料判断风险。',
  ]
}

function buildVisualEvidenceFindings(report) {
  const result = report.result || {}
  const signals = report.trademarkSignals || {}
  const candidate = first(report.trademarkCandidates) || {}
  const wordMarks = normalizeList(signals.wordMarks || signals.searchTerms)
  const visuals = normalizeList(signals.visualElements)
  const colors = normalizeList(signals.colors)
  const composition = normalizeList(signals.composition)
  const riskItems = normalizeList((result.riskItems || []).map((item) => item && item.title))
  const wordmark = candidate.wordmark || first(wordMarks) || '候选商标'
  const goods = candidate.goodsAndServices || '相关商品/服务类别'

  return [
    {
      id: 1,
      title: '疑似侵权区域 1 - 文字/商标词',
      detail: `${wordMarks.length ? wordMarks.join('、') : wordmark} 与候选商标 ${wordmark} 存在文字或来源识别层面的近似关注点。`,
      evidence: riskItems[0] || '文字标识与候选商标形成来源联想。',
      level: 'high',
      userRegion: { x: 0.14, y: 0.18, w: 0.72, h: 0.2 },
      officialRegion: { x: 0.16, y: 0.18, w: 0.68, h: 0.2 },
    },
    {
      id: 2,
      title: '疑似侵权区域 2 - 图形/Logo元素',
      detail: `${visuals.length ? visuals.join('、') : '图形、徽章或Logo元素'} 与候选权利图在核心视觉元素上需要进一步人工复核。`,
      evidence: candidate.designSearchCode && candidate.designSearchCode.length
        ? `候选商标含设计检索代码：${candidate.designSearchCode.join('、')}`
        : '图形元素可能构成消费者来源识别信号。',
      level: 'high',
      userRegion: { x: 0.24, y: 0.42, w: 0.52, h: 0.38 },
      officialRegion: { x: 0.24, y: 0.4, w: 0.52, h: 0.38 },
    },
    {
      id: 3,
      title: '疑似侵权区域 3 - 颜色/构图与使用场景',
      detail: `${colors.length || composition.length ? `${colors.concat(composition).join('、')}` : '颜色、构图和展示方式'} 与候选标识的商业呈现方式存在关联性，需要结合商品页面整体判断。`,
      evidence: `候选商品/服务范围：${truncate(goods, 120)}`,
      level: 'medium',
      userRegion: { x: 0.08, y: 0.08, w: 0.84, h: 0.84 },
      officialRegion: { x: 0.08, y: 0.08, w: 0.84, h: 0.84 },
    },
  ]
}

function buildSimilarityMatrix(report) {
  const result = report.result || {}
  const signals = report.trademarkSignals || {}
  const candidate = first(report.trademarkCandidates) || {}
  const score = Number(result.score || 0)
  const level = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low'
  const wordMarks = normalizeList(signals.wordMarks || signals.searchTerms)
  const visuals = normalizeList(signals.visualElements)
  const composition = normalizeList(signals.composition)

  return [
    {
      dimension: '文字/商标词',
      assessment: wordMarks.length || candidate.wordmark ? levelText(level) : '待补充',
      evidence: wordMarks.length
        ? `识别到 ${wordMarks.join('、')}；候选商标为 ${candidate.wordmark || '未命名商标'}。`
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
      evidence: composition.length
        ? `构图线索包括 ${composition.join('、')}。`
        : '未提取到稳定构图线索。',
      level: score >= 60 ? 'medium' : 'low',
    },
    {
      dimension: '商品类别/使用场景',
      assessment: candidate.goodsAndServices ? levelText(score >= 60 ? 'medium' : 'low') : '待补充',
      evidence: candidate.goodsAndServices
        ? `候选商标商品/服务：${truncate(candidate.goodsAndServices, 160)}`
        : '未获取到候选商品服务范围，需人工检索补充。',
      level: score >= 60 ? 'medium' : 'low',
    },
  ]
}

function drawCoverHeader(doc) {
  doc.save()
  doc.rect(0, 0, doc.page.width, 98).fill('#0f172a')
  doc.fillColor('#ffffff').font('bold').fontSize(18).text('GGKJ RISK INTELLIGENCE', 42, 30)
  doc.font('body').fontSize(9).fillColor('#bfdbfe').text('Cross-border IP and TRO screening report', 42, 56)
  doc.roundedRect(422, 30, 130, 34, 17).fill('#1d4ed8')
  doc.fillColor('#ffffff').fontSize(10).text('Pre-listing Review', 442, 41, { width: 90, align: 'center' })
  doc.restore()
}

function pageHeader(doc, title, subtitle) {
  doc.font('bold').fontSize(16).fillColor(COLORS.ink).text(title, 42, 42, { width: 360 })
  doc.font('body').fontSize(9).fillColor(COLORS.muted).text(subtitle, 42, 65, { width: 360 })
  doc.moveTo(42, 82).lineTo(552, 82).strokeColor(COLORS.line).lineWidth(1).stroke()
  doc.y = 104
}

function drawFooter(doc, label) {
  const y = doc.page.height - 52
  const previousY = doc.y
  doc.moveTo(42, y - 8).lineTo(552, y - 8).strokeColor('#e5eaf3').lineWidth(1).stroke()
  doc.font('body').fontSize(8).fillColor('#94a3b8')
    .text(label, 42, y, {
      width: 360,
      height: 12,
      lineBreak: false,
    })
  doc.y = previousY
}

function drawScoreCard(doc, x, y, width, height, score, level) {
  doc.save()
  doc.roundedRect(x, y, width, height, 12).fill(level.soft)
  doc.roundedRect(x, y, width, height, 12).strokeColor(level.color).lineWidth(1).stroke()
  doc.font('body').fontSize(9).fillColor(level.color).text('综合风险分', x + 16, y + 14)
  doc.font('bold').fontSize(34).fillColor(level.color).text(String(score), x + 16, y + 30, { width: 70 })
  doc.font('bold').fontSize(11).fillColor(level.color).text(level.text, x + 88, y + 42, { width: 48, align: 'right' })
  doc.restore()
}

function drawInfoGrid(doc, x, y, rows) {
  const width = 510
  const rowHeight = 34
  rows.forEach(([key, value], index) => {
    const rowY = y + index * rowHeight
    doc.roundedRect(x, rowY, width, rowHeight - 6, 6).fill(index % 2 === 0 ? '#f8fafc' : '#ffffff')
    doc.font('body').fontSize(9).fillColor(COLORS.muted).text(key, x + 12, rowY + 9, { width: 86 })
    doc.font('body').fontSize(9).fillColor(COLORS.ink).text(String(value || '-'), x + 110, rowY + 9, { width: width - 124 })
  })
}

function drawBulletPanel(doc, x, y, width, items, options) {
  const config = options || {}
  const list = normalizeList(items)
  const height = Math.max(66, list.length * 33 + (config.title ? 36 : 18))
  drawPanel(doc, x, y, width, height, '#ffffff', COLORS.line)

  let cursorY = y + 16
  if (config.title) {
    doc.font('bold').fontSize(11).fillColor(COLORS.ink).text(config.title, x + 16, cursorY, { width: width - 32 })
    cursorY += 26
  }

  list.forEach((item) => {
    doc.circle(x + 22, cursorY + 6, 3).fill(config.markerColor || COLORS.blue)
    doc.font('body').fontSize(9).fillColor(COLORS.ink).text(item, x + 34, cursorY, { width: width - 50, lineGap: 4 })
    cursorY += Math.max(28, doc.heightOfString(item, { width: width - 50, lineGap: 4 }) + 8)
  })

  doc.y = y + height + 8
}

function drawRiskNote(doc, x, y, title, text) {
  const height = Math.max(70, doc.heightOfString(text, { width: 450, lineGap: 4 }) + 38)
  drawPanel(doc, x, y, 510, height, COLORS.blueSoft, '#bfdbfe')
  doc.font('bold').fontSize(10).fillColor(COLORS.blue).text(title, x + 16, y + 14, { width: 130 })
  doc.font('body').fontSize(9).fillColor(COLORS.ink).text(text, x + 118, y + 14, { width: 374, lineGap: 4 })
  doc.y = y + height + 12
}

function drawImageBox(doc, x, y, width, height, title, imageBuffer, url, findings, regionKey) {
  drawPanel(doc, x, y, width, height, '#ffffff', COLORS.line)
  doc.font('bold').fontSize(10).fillColor(COLORS.ink).text(title, x + 12, y + 12, { width: width - 24 })
  if (!imageBuffer) {
    doc.font('body').fontSize(7.5).fillColor(COLORS.muted)
      .text(url ? `图片暂未嵌入：${truncate(url, 72)}` : '暂无图片', x + 12, y + 27, {
        width: width - 24,
        lineBreak: false,
      })
  }

  const imageX = x + 12
  const imageY = y + 42
  const imageW = width - 24
  const imageH = height - 56

  doc.roundedRect(imageX, imageY, imageW, imageH, 8).fill(COLORS.soft)
  doc.roundedRect(imageX, imageY, imageW, imageH, 8).strokeColor('#cbd5e1').lineWidth(1).stroke()

  if (imageBuffer) {
    doc.image(imageBuffer, imageX + 4, imageY + 4, {
      fit: [imageW - 8, imageH - 8],
      align: 'center',
      valign: 'center',
    })
  }

  drawAnnotationOverlay(doc, imageX, imageY, imageW, imageH, findings, regionKey)
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
    doc.roundedRect(rx, ry, rw, rh, 5).strokeColor(COLORS.red).lineWidth(1.6).stroke()
    doc.circle(rx + 10, ry + 10, 9).fill(COLORS.red)
    doc.font('bold').fontSize(8).fillColor('#ffffff')
      .text(String(finding.id), rx + 5, ry + 5, { width: 10, align: 'center' })
    doc.restore()
  })
}

function drawFindingRow(doc, finding) {
  ensurePageSpace(doc, 64)
  const y = doc.y
  doc.circle(52, y + 12, 10).fill(COLORS.red)
  doc.font('bold').fontSize(9).fillColor('#ffffff').text(String(finding.id), 47, y + 7, { width: 10, align: 'center' })
  doc.font('bold').fontSize(10).fillColor(COLORS.ink).text(finding.title, 72, y, { width: 430 })
  doc.font('body').fontSize(9).fillColor(COLORS.muted).text(finding.detail, 72, y + 17, { width: 430, lineGap: 3 })
  doc.font('body').fontSize(8).fillColor(COLORS.blue).text(`证据依据：${finding.evidence}`, 72, y + 42, { width: 430, lineGap: 3 })
  doc.y = y + 66
}

function drawSimilarityMatrix(doc, rows) {
  const x = 42
  const width = 510
  const columns = [118, 104, 288]
  let y = doc.y

  drawPanel(doc, x, y, width, 28, '#0f172a', '#0f172a')
  doc.font('bold').fontSize(9).fillColor('#ffffff').text('维度', x + 10, y + 9, { width: columns[0] })
  doc.text('评估', x + columns[0] + 10, y + 9, { width: columns[1] })
  doc.text('依据', x + columns[0] + columns[1] + 10, y + 9, { width: columns[2] - 20 })
  y += 28

  rows.forEach((row) => {
    const rowHeight = Math.max(44, doc.heightOfString(row.evidence, { width: columns[2] - 20, lineGap: 3 }) + 22)
    ensurePageSpace(doc, rowHeight + 6)
    drawPanel(doc, x, y, width, rowHeight, '#ffffff', '#e5eaf3')
    doc.font('bold').fontSize(9).fillColor(COLORS.ink).text(row.dimension, x + 10, y + 12, { width: columns[0] - 16 })
    doc.font('bold').fontSize(9).fillColor(levelColor(row.level)).text(row.assessment, x + columns[0] + 10, y + 12, { width: columns[1] - 16 })
    doc.font('body').fontSize(8.5).fillColor(COLORS.muted).text(row.evidence, x + columns[0] + columns[1] + 10, y + 12, { width: columns[2] - 20, lineGap: 3 })
    y += rowHeight
  })

  doc.y = y + 10
}

function drawCandidateCard(doc, candidate, index) {
  const x = 42
  const y = doc.y
  const width = 510
  const height = 108
  drawPanel(doc, x, y, width, height, '#ffffff', COLORS.line)

  doc.circle(x + 18, y + 20, 11).fill(COLORS.blue)
  doc.font('bold').fontSize(9).fillColor('#ffffff').text(String(index + 1), x + 13, y + 15, { width: 10, align: 'center' })
  doc.font('bold').fontSize(12).fillColor(COLORS.ink).text(candidate.wordmark || '未命名商标', x + 38, y + 12, { width: 300 })
  drawSmallBadge(doc, x + 408, y + 12, candidate.status || 'UNKNOWN', candidate.status === 'LIVE' ? 'green' : 'amber')

  doc.font('body').fontSize(8.5).fillColor(COLORS.muted)
  doc.text(`Serial: ${candidate.serialNumber || '-'}    Registration: ${candidate.registrationNumber || '-'}`, x + 38, y + 36, { width: 450 })
  doc.text(`Owner: ${candidate.ownerName || '-'}`, x + 38, y + 51, { width: 450 })
  doc.text(`Goods/Services: ${truncate(candidate.goodsAndServices || '-', 220)}`, x + 38, y + 66, { width: 450 })
  if (candidate.sourceUrl) {
    doc.fillColor(COLORS.blue).text(`TSDR: ${truncate(candidate.sourceUrl, 125)}`, x + 38, y + 86, { width: 450 })
  }

  doc.y = y + height + 12
}

function drawRiskItem(doc, item, index) {
  ensurePageSpace(doc, 76)
  const y = doc.y
  const level = item.level || 'medium'
  const height = Math.max(68, doc.heightOfString(item.detail || '', { width: 410, lineGap: 4 }) + 40)
  drawPanel(doc, 42, y, 510, height, '#ffffff', COLORS.line)
  doc.font('bold').fontSize(10).fillColor(COLORS.ink)
    .text(`${index + 1}. ${item.title || '风险提示'}`, 58, y + 14, { width: 330 })
  drawSmallBadge(doc, 462, y + 12, item.levelText || levelText(level), level)
  doc.font('body').fontSize(9).fillColor(COLORS.muted)
    .text(item.detail || '建议人工复核该风险点。', 58, y + 34, { width: 430, lineGap: 4 })
  doc.y = y + height + 12
}

function drawActionPlan(doc, suggestions) {
  const list = normalizeList(suggestions)
  const fallback = [
    '暂缓发布或下架高风险素材，先完成图片、文字和关键词修改。',
    '补充原创设计、供应商授权和平台页面修改前后截图。',
    '高风险SKU建议交给知识产权律师复核后再恢复销售。',
  ]
  const actions = list.length ? list : fallback

  actions.forEach((item, index) => {
    ensurePageSpace(doc, 52)
    const y = doc.y
    doc.roundedRect(42, y, 510, 44, 10).fill(index === 0 ? COLORS.redSoft : COLORS.soft)
    doc.circle(60, y + 22, 10).fill(index === 0 ? COLORS.red : COLORS.blue)
    doc.font('bold').fontSize(8).fillColor('#ffffff').text(String(index + 1), 55, y + 17, { width: 10, align: 'center' })
    doc.font('body').fontSize(9.5).fillColor(COLORS.ink).text(item, 82, y + 13, { width: 450, lineGap: 4 })
    doc.y = y + 54
  })
}

function drawChecklist(doc, items) {
  normalizeList(items).forEach((item) => {
    ensurePageSpace(doc, 36)
    const y = doc.y
    doc.roundedRect(42, y, 18, 18, 4).strokeColor(COLORS.blue).lineWidth(1).stroke()
    doc.moveTo(46, y + 10).lineTo(50, y + 14).lineTo(56, y + 5).strokeColor(COLORS.blue).lineWidth(1.3).stroke()
    doc.font('body').fontSize(10).fillColor(COLORS.ink).text(item, 72, y, { width: 460, lineGap: 4 })
    doc.y = y + Math.max(34, doc.heightOfString(item, { width: 460, lineGap: 4 }) + 10)
  })
}

function drawProcessSteps(doc, steps) {
  steps.forEach(([mark, title, desc]) => {
    ensurePageSpace(doc, 62)
    const y = doc.y
    doc.circle(58, y + 18, 15).fill(COLORS.blue)
    doc.font('bold').fontSize(10).fillColor('#ffffff').text(mark, 51, y + 11, { width: 14, align: 'center' })
    doc.font('bold').fontSize(10).fillColor(COLORS.ink).text(title, 88, y + 2, { width: 420 })
    doc.font('body').fontSize(9).fillColor(COLORS.muted).text(desc, 88, y + 20, { width: 420, lineGap: 4 })
    doc.y = y + 58
  })
}

function sectionTitle(doc, text, x, y) {
  doc.font('bold').fontSize(14).fillColor(COLORS.ink).text(text, x, y)
  doc.moveTo(x, y + 22).lineTo(x + 510, y + 22).strokeColor(COLORS.line).lineWidth(1).stroke()
}

function sectionSubtitle(doc, text) {
  ensurePageSpace(doc, 38)
  doc.font('bold').fontSize(12).fillColor(COLORS.ink).text(text, 42, doc.y)
  doc.moveDown(0.45)
}

function drawPanel(doc, x, y, width, height, fill, stroke) {
  doc.save()
  doc.roundedRect(x, y, width, height, 10).fill(fill || '#ffffff')
  doc.roundedRect(x, y, width, height, 10).strokeColor(stroke || COLORS.line).lineWidth(1).stroke()
  doc.restore()
}

function drawSmallBadge(doc, x, y, text, level) {
  const color = levelColor(level)
  const soft = levelSoftColor(level)
  doc.save()
  doc.roundedRect(x, y, 74, 22, 11).fill(soft)
  doc.font('bold').fontSize(8).fillColor(color).text(String(text || '-'), x + 8, y + 7, { width: 58, align: 'center' })
  doc.restore()
}

function ensurePageSpace(doc, needed, title, subtitle) {
  if (doc.y + needed < doc.page.height - 58) return
  drawFooter(doc, 'Continued report section')
  doc.addPage()
  pageHeader(doc, title || '报告续页', subtitle || 'Continued')
}

function getRiskLevel(result) {
  const score = Number(result && result.score || 0)
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

function fetchImageBuffer(urlString) {
  const value = String(urlString || '').trim()
  if (!value) return Promise.resolve(null)

  const url = new URL(value)
  const client = url.protocol === 'http:' ? http : https

  return new Promise((resolve, reject) => {
    const req = client.get({
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; GGKJ-IP-Risk/1.0)' },
      timeout: 7000,
    }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume()
        reject(new Error(`image status ${res.statusCode}`))
        return
      }

      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })

    req.on('timeout', () => {
      req.destroy(new Error('image request timed out'))
    })
    req.on('error', reject)
  })
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
  return `${text.slice(0, maxLength - 1)}…`
}

module.exports = {
  buildSimilarityMatrix,
  buildVisualEvidenceFindings,
  generatePdfReportBuffer,
}
