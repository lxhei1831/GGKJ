const assert = require('assert')

const {
  buildSimilarityMatrix,
  buildVisualEvidenceFindings,
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
    },
    trademarkSignals: {
      wordMarks: ['BLUE MOON'],
      searchTerms: ['Blue Moon bottle'],
      visualElements: ['round moon badge', 'blue circular logo', 'large front wordmark'],
      colors: ['blue', 'white'],
      composition: ['centered badge', 'wordmark above graphic'],
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

  const visualFindings = buildVisualEvidenceFindings(report)
  assert(visualFindings.length >= 3, 'visual evidence should include multiple annotated risk findings')
  assert.strictEqual(visualFindings[0].id, 1, 'visual findings should be numbered for PDF callouts')
  assert(visualFindings[0].title.includes('疑似侵权区域'), 'visual findings should explicitly label suspected infringement areas')
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

  const buffer = await generatePdfReportBuffer(report, {
    fontPath: 'C:/Windows/Fonts/NotoSansSC-VF.ttf',
  })

  assert(Buffer.isBuffer(buffer), 'PDF report generator should return a Buffer')
  assert.strictEqual(buffer.slice(0, 4).toString('ascii'), '%PDF', 'generated report should be a PDF file')
  assert(buffer.length > 1000, 'generated report should contain visible report content')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
