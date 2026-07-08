const assert = require('assert')

const {
  generatePdfReportBuffer,
} = require('../cloudfunctions/aiGateway/pdfReport')

async function run() {
  const buffer = await generatePdfReportBuffer({
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
    trademarkCandidates: [{
      wordmark: 'BLUE MOON',
      serialNumber: '90000001',
      registrationNumber: '5000001',
      ownerName: 'Blue Moon Brewing Company',
      status: 'LIVE',
      goodsAndServices: 'Beer; ale; lager.',
      sourceUrl: 'https://tsdr.uspto.gov/#caseNumber=90000001&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch',
    }],
    imageUrls: ['https://example.com/uploaded-logo.png'],
    warnings: [],
    generatedAt: '2026-07-08 14:30',
  }, {
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
