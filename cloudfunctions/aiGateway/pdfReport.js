const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')
const PDFDocument = require('pdfkit')

const DEFAULT_FONT_PATH = path.join(__dirname, 'assets', 'fonts', 'NotoSansSC-VF.ttf')
const FALLBACK_FONT_PATH = 'C:/Windows/Fonts/NotoSansSC-VF.ttf'

async function generatePdfReportBuffer(report, options) {
  const config = options || {}
  const doc = new PDFDocument({
    size: 'A4',
    margin: 42,
    info: {
      Title: 'TRO/IP Risk Analysis Report',
      Author: 'GGKJ',
      Creator: 'aiGateway',
    },
  })
  const chunks = []

  doc.on('data', (chunk) => chunks.push(chunk))

  const fontPath = pickFontPath(config.fontPath)
  if (fontPath) {
    doc.registerFont('body', fontPath)
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

  doc.fontSize(24).fillColor('#111827').text('TRO 侵权风险检测报告', { align: 'left' })
  doc.moveDown(0.6)
  doc.fontSize(12).fillColor('#64748b').text('Infringement Analysis Reference Report')
  doc.moveDown(1.6)
  drawKeyValue(doc, '检测对象', input.productTitle || input.productUrl || input.copyText || '用户上传商标/商品素材')
  drawKeyValue(doc, '平台 / 市场', `${input.platform || '未填写'} / ${input.countryRegion || '未填写'}`)
  drawKeyValue(doc, '检测模式', input.mode || 'risk_detect')
  drawKeyValue(doc, '生成时间', report.generatedAt || new Date().toISOString())
  drawKeyValue(doc, '综合风险分', String(result.score || 0))
  drawKeyValue(doc, '是否建议上架', result.canPublish ? '可继续复核' : '建议暂缓上架')
  doc.moveDown(1.2)
  doc.fontSize(10).fillColor('#6b7280').text(
    '说明：本报告由 AI、用户提交材料与公开商标检索信息生成，仅用于初筛和材料整理，不替代律师正式法律意见。',
    { lineGap: 5 }
  )
}

async function renderImageComparison(doc, report, config) {
  doc.addPage()
  sectionTitle(doc, '图片对比')

  const userImageUrl = first(report.imageUrls)
  const candidate = first(report.trademarkCandidates)
  const officialImageUrl = candidate && candidate.markImageUrl

  const userImage = config.fetchImages === false ? null : await fetchImageBuffer(userImageUrl).catch(() => null)
  const officialImage = config.fetchImages === false ? null : await fetchImageBuffer(officialImageUrl).catch(() => null)

  const top = doc.y + 8
  const boxWidth = 240
  const boxHeight = 170
  drawImageBox(doc, 42, top, boxWidth, boxHeight, '用户上传图', userImage, userImageUrl)
  drawImageBox(doc, 312, top, boxWidth, boxHeight, 'USPTO 官方候选图', officialImage, officialImageUrl)
  doc.y = top + boxHeight + 24

  const signals = report.trademarkSignals || {}
  sectionSubtitle(doc, 'AI 提取的检索/视觉线索')
  bulletList(doc, [
    `文字/商标词：${safeJoin(signals.wordMarks || signals.searchTerms, '、') || '未明确识别'}`,
    `视觉元素：${safeJoin(signals.visualElements, '、') || '未明确识别'}`,
    `颜色/构图：${safeJoin(signals.colors || signals.composition, '、') || '未明确识别'}`,
  ])
}

function renderTrademarkCandidates(doc, report) {
  doc.addPage()
  sectionTitle(doc, 'USPTO 候选商标')

  const candidates = report.trademarkCandidates || []
  if (!candidates.length) {
    doc.fontSize(10).fillColor('#64748b').text('未获取到可展示的 USPTO 候选商标。')
    return
  }

  candidates.slice(0, 6).forEach((candidate, index) => {
    doc.fontSize(12).fillColor('#111827').text(`${index + 1}. ${candidate.wordmark || '未命名商标'}`)
    doc.fontSize(9).fillColor('#475569')
    doc.text(`Serial: ${candidate.serialNumber || '-'}    Registration: ${candidate.registrationNumber || '-'}`)
    doc.text(`Owner: ${candidate.ownerName || '-'}`)
    doc.text(`Status: ${candidate.status || '-'}`)
    doc.text(`Goods/Services: ${truncate(candidate.goodsAndServices || '-', 260)}`, { lineGap: 3 })
    if (candidate.sourceUrl) doc.text(`Source: ${candidate.sourceUrl}`)
    doc.moveDown(0.8)
  })
}

function renderRiskAnalysis(doc, report) {
  doc.addPage()
  sectionTitle(doc, '风险结论与处理建议')

  const result = report.result || {}
  sectionSubtitle(doc, '风险点')
  const riskItems = result.riskItems || []
  if (riskItems.length) {
    riskItems.forEach((item, index) => {
      doc.fontSize(11).fillColor('#111827').text(`${index + 1}. ${item.title || '风险提示'} (${item.level || 'medium'})`)
      doc.fontSize(10).fillColor('#475569').text(item.detail || '建议人工复核该风险点。', { lineGap: 4 })
      doc.moveDown(0.5)
    })
  } else {
    doc.fontSize(10).fillColor('#475569').text('模型未返回明确风险点，建议人工复核商标、版权、外观专利和平台投诉规则。')
  }

  sectionSubtitle(doc, '建议动作')
  bulletList(doc, result.suggestions || [])

  const warnings = report.warnings || []
  if (warnings.length) {
    sectionSubtitle(doc, '系统提示')
    bulletList(doc, warnings)
  }
}

function renderEvidenceChecklist(doc) {
  doc.addPage()
  sectionTitle(doc, '证据清单与免责声明')
  bulletList(doc, [
    '保留原创设计稿、拍摄原图、供应链授权、修改记录和发布时间记录。',
    '如命中高风险候选商标，上架前应让律师复核近似程度、商品类别和实际使用方式。',
    '如平台已发生投诉或 TRO 案件，应以法院文件、平台通知和律师意见为准。',
    '本报告为自动化初筛材料，不构成法律意见或最终侵权判断。',
  ])
}

function drawImageBox(doc, x, y, width, height, title, imageBuffer, url) {
  doc.roundedRect(x, y, width, height, 6).strokeColor('#cbd5e1').lineWidth(1).stroke()
  doc.fontSize(10).fillColor('#111827').text(title, x + 10, y + 10, { width: width - 20 })

  if (imageBuffer) {
    doc.image(imageBuffer, x + 10, y + 32, {
      fit: [width - 20, height - 46],
      align: 'center',
      valign: 'center',
    })
    return
  }

  doc.fontSize(9).fillColor('#64748b').text(
    url ? `图片未嵌入，来源：${truncate(url, 120)}` : '暂无图片',
    x + 10,
    y + 64,
    { width: width - 20, lineGap: 4 }
  )
}

function sectionTitle(doc, text) {
  doc.fontSize(18).fillColor('#111827').text(text)
  doc.moveDown(0.6)
}

function sectionSubtitle(doc, text) {
  doc.moveDown(0.7)
  doc.fontSize(12).fillColor('#111827').text(text)
  doc.moveDown(0.3)
}

function drawKeyValue(doc, key, value) {
  doc.fontSize(10).fillColor('#64748b').text(key, { continued: true })
  doc.fillColor('#111827').text(`  ${value || '-'}`)
  doc.moveDown(0.45)
}

function bulletList(doc, items) {
  const list = (items || []).map((item) => String(item || '').trim()).filter(Boolean)
  if (!list.length) {
    doc.fontSize(10).fillColor('#64748b').text('暂无。')
    return
  }

  list.forEach((item) => {
    doc.fontSize(10).fillColor('#475569').text(`• ${item}`, { lineGap: 5 })
  })
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

function safeJoin(values, separator) {
  if (Array.isArray(values)) {
    return values.map((value) => String(value || '').trim()).filter(Boolean).join(separator)
  }
  return String(values || '').trim()
}

function truncate(value, maxLength) {
  const text = String(value || '')
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

module.exports = {
  generatePdfReportBuffer,
}
