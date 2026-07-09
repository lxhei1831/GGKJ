const assert = require('assert')
const childProcess = require('child_process')
const fs = require('fs')
const http = require('http')
const path = require('path')
const stream = require('stream')

const {
  REPORT_SECTION_TITLES,
  TYPOGRAPHY,
  WATERMARK_PATH,
  buildCandidateReferenceSummary,
  buildSimilarityMatrix,
  buildVisualEvidenceFindings,
  formatReportSource,
  generatePdfReportBuffer,
} = require('../cloudfunctions/aiGateway/pdfReport')

async function run() {
  const report = {
    input: {
      platform: 'Amazon',
      countryRegion: '美国',
      productTitle: 'Blue Moon bottle logo',
      mode: 'image',
    },
    result: {
      score: 82,
      jurisdiction: 'Amazon / 美国',
      canPublish: false,
      riskItems: [{
        title: '疑似商标图形近似',
        detail: '上传图形与候选商标在圆形月亮图案和主文字上存在接近表达。',
        level: 'high',
      }],
      suggestions: ['先暂停上架，并补充授权或重新设计图形。'],
      visualFindings: [{
        title: 'AI定位的疑似商标词区域',
        detail: '上传图左上角文字与候选商标 BLUE MOON 的主商标词接近。',
        evidence: '模型返回的视觉坐标来自用户图与候选权利图的相似区域。',
        level: 'high',
        confidence: 0.82,
        userRegion: { x: 0.31, y: 0.22, w: 0.42, h: 0.18 },
        officialRegion: { x: 0.28, y: 0.26, w: 0.48, h: 0.2 },
      }],
    },
    trademarkSignals: {
      wordMarks: ['BLUE MOON'],
      searchTerms: ['Blue Moon bottle'],
      visualElements: ['round moon badge', 'blue circular logo', 'large front wordmark'],
      colors: ['blue', 'white'],
      composition: ['centered badge', 'wordmark above graphic'],
      markRegions: [{
        label: 'front wordmark',
        type: 'wordmark',
        region: { x: 0.2, y: 0.16, w: 0.58, h: 0.22 },
      }],
    },
    trademarkCandidates: [{
      wordmark: 'BLUE MOON',
      serialNumber: '90000001',
      registrationNumber: '5000001',
      ownerName: 'Blue Moon Brewing Company',
      status: 'LIVE',
      goodsAndServices: 'Beer; ale; lager.',
      designSearchCode: ['01.11.25', '26.01.21'],
      sourceUrl: 'https://tsdr.uspto.gov/#caseNumber=90000001&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch',
    }],
    imageUrls: ['https://example.com/uploaded-logo.png'],
    warnings: [],
    generatedAt: '2026-07-08 14:30',
  }

  assert.deepStrictEqual(REPORT_SECTION_TITLES, [
    '报告结论',
    '图片对比与疑似侵权标注',
    '侵权风险分析与整改建议',
    '证据清单与复核路径',
  ], 'PDF report should be constrained to four stable professional sections')
  assert(WATERMARK_PATH && WATERMARK_PATH.replace(/\\/g, '/').endsWith('assets/watermark.png'), 'PDF report should use the bundled GGKJ watermark image')
  assert(fs.existsSync(WATERMARK_PATH), 'GGKJ watermark image should exist in the cloud function assets')
  assert.strictEqual(TYPOGRAPHY.bodyColor, '#111827', 'PDF body text should use a darker, clearer ink color')
  assert(TYPOGRAPHY.bodyStrokeWidth > 0, 'PDF body text should apply a light stroke weight for clearer rendering')
  assert(TYPOGRAPHY.titleStrokeWidth > TYPOGRAPHY.bodyStrokeWidth, 'PDF headings should be slightly stronger than body text')
  assert.strictEqual(formatReportSource('ai-cloud-function'), '港港跨境知识产权检测', 'PDF report source should show the GGKJ professional detection brand instead of an internal source key')
  assert.strictEqual(formatReportSource('ai-cloud-fallback'), '港港跨境知识产权检测', 'fallback PDF reports should also show the GGKJ professional detection brand')
  assert.strictEqual(formatReportSource(''), '港港跨境知识产权检测', 'PDF report source should default to the GGKJ professional detection brand')

  const candidateReference = buildCandidateReferenceSummary(report.trademarkCandidates[0])
  assert.strictEqual(candidateReference.wordmark, 'BLUE MOON', 'candidate fallback reference should preserve the rights wordmark')
  assert.strictEqual(candidateReference.status, 'LIVE', 'candidate fallback reference should preserve the rights status')
  assert(candidateReference.serialLine.includes('90000001'), 'candidate fallback reference should include serial number for comparison')
  assert(candidateReference.ownerLine.includes('Blue Moon Brewing Company'), 'candidate fallback reference should include rights owner context')
  assert(candidateReference.goodsLine.includes('Beer; ale; lager.'), 'candidate fallback reference should include goods and services context')
  assert.strictEqual(candidateReference.hasOfficialImageUrl, false, 'candidate without markImageUrl should be treated as an official-image fallback')

  const visualFindings = buildVisualEvidenceFindings(report)
  assert.strictEqual(visualFindings.length, 1, 'AI visual coordinates should replace generic fixed findings')
  assert.strictEqual(visualFindings[0].id, 1, 'visual findings should be numbered for PDF callouts')
  assert(visualFindings[0].title.includes('AI定位'), 'visual findings should preserve AI-provided finding titles')
  assert.deepStrictEqual(
    visualFindings[0].userRegion,
    { x: 0.31, y: 0.22, w: 0.42, h: 0.18 },
    'visual findings should use model-provided user-image coordinates instead of fixed regions'
  )
  assert(visualFindings.some((item) => item.detail.includes('BLUE MOON')), 'visual findings should cite the candidate trademark context')
  visualFindings.forEach((item) => {
    assert(item.userRegion && typeof item.userRegion.x === 'number', 'each visual finding should include a user-image annotation region')
    assert(item.officialRegion && typeof item.officialRegion.x === 'number', 'each visual finding should include an official-image comparison region')
  })

  const similarityMatrix = buildSimilarityMatrix(report)
  assert(similarityMatrix.some((item) => item.dimension === '文字/商标词'), 'similarity matrix should assess wordmark similarity')
  assert(similarityMatrix.some((item) => item.dimension === '图形元素'), 'similarity matrix should assess visual element similarity')
  assert(similarityMatrix.some((item) => item.dimension === '商品类别/使用场景'), 'similarity matrix should assess goods and use context')
  assert(similarityMatrix.every((item) => item.assessment && item.evidence), 'similarity matrix rows should contain assessment and evidence')

  const signalFallbackFindings = buildVisualEvidenceFindings(Object.assign({}, report, {
    result: Object.assign({}, report.result, {
      visualFindings: [],
    }),
  }))
  assert(signalFallbackFindings[0].detail.includes('front wordmark'), 'signal-region fallback should cite the detected uploaded-image region')
  assert.deepStrictEqual(
    signalFallbackFindings[0].userRegion,
    { x: 0.16, y: 0.12, w: 0.66, h: 0.3 },
    'signal-region fallback should expand the AI-extracted uploaded-image region rather than use the old fixed frame'
  )

  const buffer = await generatePdfReportBuffer(report, {
    fontPath: 'C:/Windows/Fonts/NotoSansSC-VF.ttf',
  })

  assert(Buffer.isBuffer(buffer), 'PDF report generator should return a Buffer')
  assert.strictEqual(buffer.slice(0, 4).toString('ascii'), '%PDF', 'generated report should be a PDF file')
  assert(buffer.length > 1000, 'generated report should contain visible report content')

  const originalHttpGet = http.get
  const invalidImageUrl = 'http://mock.invalid/uploaded-image'
  http.get = (options, callback) => {
    const response = new stream.Readable({
      read() {},
    })
    response.statusCode = 200

    process.nextTick(() => {
      callback(response)
      response.push(Buffer.from('not a supported pdfkit image'))
      response.push(null)
    })

    return {
      on() { return this },
      destroy() {},
    }
  }

  try {
    const invalidImageBuffer = await generatePdfReportBuffer(Object.assign({}, report, {
      imageUrls: [invalidImageUrl],
      trademarkCandidates: report.trademarkCandidates.map((candidate) => Object.assign({}, candidate, {
        markImageUrl: invalidImageUrl,
      })),
    }))

    assert.strictEqual(invalidImageBuffer.slice(0, 4).toString('ascii'), '%PDF', 'unsupported uploaded image content should not prevent PDF generation')
  } finally {
    http.get = originalHttpGet
  }

  const missingFontProbe = childProcess.execFileSync(process.execPath, ['-e', `
    const fs = require('fs')
    const originalExistsSync = fs.existsSync
    fs.existsSync = function patchedExistsSync(filePath) {
      const normalized = String(filePath || '').replace(/\\\\/g, '/')
      if (normalized.endsWith('/cloudfunctions/aiGateway/assets/fonts/NotoSansSC-VF.ttf') || normalized.endsWith('/Windows/Fonts/NotoSansSC-VF.ttf')) {
        return false
      }
      return originalExistsSync.apply(this, arguments)
    }
    const { generatePdfReportBuffer } = require(${JSON.stringify(path.join(__dirname, '..', 'cloudfunctions', 'aiGateway', 'pdfReport'))})
    generatePdfReportBuffer({
      input: { platform: 'Amazon', countryRegion: 'US', productTitle: 'Missing font fallback', mode: 'image' },
      result: { score: 72, riskItems: [], suggestions: ['Review listing before publishing.'], canPublish: false },
      imageUrls: [],
      trademarkCandidates: [],
      trademarkSignals: {},
      warnings: []
    }, { fetchImages: false }).then((buffer) => {
      process.stdout.write(buffer.slice(0, 4).toString('ascii') + ':' + buffer.length)
    }).catch((error) => {
      console.error(error && error.stack || error)
      process.exit(1)
    })
  `], {
    encoding: 'utf8',
  })

  assert(missingFontProbe.startsWith('%PDF:'), 'PDF generator should still return a PDF when the bundled font asset is missing online')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
