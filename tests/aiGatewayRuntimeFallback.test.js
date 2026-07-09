const assert = require('assert')
const http = require('http')
const Module = require('module')

function readUploadedContent(fileContent) {
  if (Buffer.isBuffer(fileContent)) {
    return Promise.resolve(fileContent.length)
  }

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
  const aiServer = http.createServer((req, res) => {
    req.resume()
    req.on('end', () => {
      res.statusCode = 500
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: { message: 'upstream model unavailable' } }))
    })
  })

  await new Promise((resolve) => aiServer.listen(0, '127.0.0.1', resolve))

  process.env.AI_API_KEY = 'test-key'
  process.env.AI_BASE_URL = `http://127.0.0.1:${aiServer.address().port}/v1`

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
          assert(Buffer.isBuffer(fileContent), 'PDF cloud upload should use a Buffer to avoid runtime stream/temp-file instability')
          const bytes = await readUploadedContent(fileContent)
          uploaded.push({ cloudPath, bytes })
          return { fileID: `cloud://mock/${cloudPath}` }
        },
      }
    }

    return originalLoad.apply(this, arguments)
  }

  try {
    const gateway = require('../cloudfunctions/aiGateway/index')
    const result = await gateway.main({
      task: 'risk_detect',
      input: {
        platform: 'Amazon',
        countryRegion: 'EU',
        productTitle: 'AI outage fallback sample',
        mode: 'image',
        imageFileIDs: ['cloud://mock/source.png'],
      },
    })

    assert.strictEqual(result.ok, true, 'risk detection should still complete when the AI model request fails')
    assert.strictEqual(result.data.modelFallback, true, 'fallback result should clearly identify AI model fallback')
    assert(result.data.modelError.includes('upstream model unavailable'), 'fallback result should keep the AI failure reason')
    assert(result.data.pdfReportFileID, 'fallback risk detection should still upload and return a PDF file ID')
    assert(uploaded[0].bytes > 1000, 'uploaded fallback PDF should contain visible report content')
  } finally {
    Module._load = originalLoad
    aiServer.close()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
