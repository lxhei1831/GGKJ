const assert = require('assert')
const http = require('http')
const Module = require('module')

function readUploadedContent(fileContent) {
  if (Buffer.isBuffer(fileContent)) return Promise.resolve(fileContent.length)

  return new Promise((resolve, reject) => {
    let bytes = 0
    fileContent.on('data', (chunk) => {
      bytes += chunk.length
    })
    fileContent.on('error', reject)
    fileContent.on('end', () => resolve(bytes))
  })
}

async function run() {
  const originalConsoleError = console.error
  console.error = () => {}

  const aiRequests = []
  const aiResponses = [{
    choices: [{
      message: {
        content: JSON.stringify({
          score: 74,
          riskItems: [{
            title: '候选商标需复核',
            detail: '上传图中的 BEEHAHA 字样需要结合 USPTO 候选商标复核。',
            level: 'high',
          }],
          suggestions: ['先核查 USPTO 候选记录再决定是否上架。'],
          jurisdiction: 'Amazon / 美国',
          canPublish: false,
          trademarkSignals: {
            wordMarks: ['BEEHAHA', 'BEHAHA'],
            searchTerms: ['BEEHAHA', 'BEHAHA'],
            visualElements: ['large red front wordmark'],
            colors: ['red', 'white'],
            composition: ['centered wordmark'],
            markRegions: [{
              label: 'front wordmark',
              type: 'wordmark',
              region: { x: 0.22, y: 0.24, w: 0.56, h: 0.2 },
              confidence: 0.91,
            }],
          },
          visualFindings: [],
        }),
      },
    }],
  }]

  const aiServer = http.createServer((req, res) => {
    let raw = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      aiRequests.push(JSON.parse(raw))
      const body = aiResponses.shift()
      res.statusCode = body ? 200 : 500
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(body || { error: { message: 'unexpected extra AI request' } }))
    })
  })

  await new Promise((resolve) => aiServer.listen(0, '127.0.0.1', resolve))

  const usptoInputs = []
  const uploaded = []
  const originalLoad = Module._load
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'wx-server-sdk') {
      return {
        DYNAMIC_CURRENT_ENV: 'mock-env',
        init() {},
        getTempFileURL({ fileList }) {
          return Promise.resolve({
            fileList: (fileList || []).map((fileID, index) => ({
              fileID,
              tempFileURL: `https://example.com/uploaded-${index}.png`,
            })),
          })
        },
        async uploadFile({ cloudPath, fileContent }) {
          const bytes = await readUploadedContent(fileContent)
          uploaded.push({ cloudPath, bytes })
          return { fileID: `cloud://mock/${cloudPath}` }
        },
      }
    }

    if (request === './usptoSearch') {
      return {
        shouldSearchUspto: () => true,
        searchUsptoTrademarks(input) {
          usptoInputs.push(input)
          return Promise.resolve({
            terms: input.trademarkSignals ? input.trademarkSignals.searchTerms : [],
            warnings: [],
            candidates: [{
              wordmark: 'BEEHAHA',
              serialNumber: '98000001',
              registrationNumber: '6200001',
              ownerName: 'Beehaha Labs LLC',
              status: 'LIVE',
              goodsAndServices: 'Toys; novelty goods.',
              markImageUrl: 'https://tsdr.uspto.gov/img/98000001/large',
              markImageSourceLabel: 'USPTO/TSDR official record image',
              markImageSourceTrust: 'official-public',
              sourceUrl: 'https://tsdr.uspto.gov/#caseNumber=98000001&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch',
            }],
          })
        },
      }
    }

    return originalLoad.apply(this, arguments)
  }

  try {
    process.env.AI_API_KEY = 'test-key'
    process.env.AI_BASE_URL = `http://127.0.0.1:${aiServer.address().port}/v1`
    process.env.AI_MODEL = 'test-vision-model'

    const gateway = require('../cloudfunctions/aiGateway/index')
    const result = await gateway.main({
      task: 'risk_detect',
      input: {
        mode: 'image',
        platform: 'Amazon',
        countryRegion: '美国',
        productTitle: 'BEHAHA toy logo',
        copyText: 'BEHAHA',
        imageFileIDs: ['cloud://mock/uploaded-image.png'],
      },
    })

    assert.strictEqual(result.ok, true, 'image risk detection should complete')
    assert.strictEqual(aiRequests.length, 1, 'image detection should avoid cloud timeout by using one combined AI request')
    assert.strictEqual(usptoInputs.length, 1, 'USPTO search should run once for US image detections')
    assert.deepStrictEqual(
      usptoInputs[0].trademarkSignals.searchTerms.slice(0, 2),
      ['BEEHAHA', 'BEHAHA'],
      'USPTO search should receive AI-extracted image wordmarks instead of losing image signals'
    )
    assert.strictEqual(result.data.trademarkCandidates[0].serialNumber, '98000001', 'real USPTO candidate serial number should be returned')
    assert.strictEqual(result.data.trademarkCandidates[0].ownerName, 'Beehaha Labs LLC', 'real USPTO candidate owner should be returned')
    assert(result.data.trademarkCandidates[0].goodsAndServices.includes('Toys'), 'real USPTO goods/services should be returned')
    assert(uploaded[0].bytes > 1000, 'PDF should still be generated after candidate enrichment')
  } finally {
    console.error = originalConsoleError
    Module._load = originalLoad
    aiServer.close()
    delete process.env.AI_API_KEY
    delete process.env.AI_BASE_URL
    delete process.env.AI_MODEL
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
