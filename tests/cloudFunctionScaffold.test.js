const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const projectConfig = require('../project.config.json')
assert.strictEqual(projectConfig.cloudfunctionRoot, 'cloudfunctions/', 'project should register the cloud function root')

const appScript = read('app.js')
assert(appScript.includes('wx.cloud.init'), 'app should initialize wx.cloud on launch')
assert(appScript.includes('traceUser: true'), 'cloud init should trace the current mini program user')

const functionScript = read('cloudfunctions/aiGateway/index.js')
const functionPackage = require('../cloudfunctions/aiGateway/package.json')

assert(functionScript.includes('process.env.AI_API_KEY'), 'cloud function should read the AI key from environment variables')
assert(functionScript.includes('process.env.AI_BASE_URL'), 'cloud function should read the AI base URL from environment variables')
assert(functionScript.includes('process.env.AI_MODEL'), 'cloud function should read the model name from environment variables')
assert(functionScript.includes('/chat/completions'), 'cloud function should call an OpenAI-compatible chat completions endpoint')
assert(functionScript.includes('exports.main'), 'cloud function should expose a main handler')
assert(functionScript.includes('tro_advice'), 'cloud function should support the TRO advice task')
assert(functionScript.includes('risk_detect'), 'cloud function should support the risk detection task')
assert(functionScript.includes('general_chat'), 'cloud function should support the general AI chat task')
assert(functionScript.includes('港港跨境 AI 助手'), 'cloud function should include the GGKJ AI assistant prompt')
assert(functionScript.includes('image_url'), 'cloud function should support vision image inputs')
assert(functionScript.includes('searchUsptoTrademarks'), 'cloud function should enrich US detections with USPTO trademark candidates')
assert(functionScript.includes('visualFindings'), 'cloud function should ask the model for adaptive visual finding coordinates')
assert(functionScript.includes('userRegion'), 'cloud function should document uploaded-image coordinate output')
assert(functionScript.includes('officialRegion'), 'cloud function should document candidate-image coordinate output')
assert(functionScript.includes('generatePdfReportBuffer'), 'cloud function should generate PDF reports')
assert(functionScript.includes('uploadPdfReport'), 'cloud function should upload generated PDF reports to cloud storage')
assert(functionScript.includes('fileContent: pdfBuffer'), 'cloud function should upload generated PDFs from the in-memory PDF Buffer')
assert(!functionScript.includes('fs.createReadStream(tempPath)'), 'cloud function PDF uploads should not depend on temp file streams')
assert(!functionScript.includes('filePath: tempPath'), 'cloud function PDF uploads should not use filePath because wx-server-sdk expects fileContent')
assert(!/sk-[A-Za-z0-9]{20,}/.test(functionScript), 'cloud function source should not contain a hard-coded API key')

assert.strictEqual(functionPackage.main, 'index.js', 'cloud function package should point at index.js')
assert(functionPackage.dependencies['wx-server-sdk'], 'cloud function should depend on wx-server-sdk')
assert(functionPackage.dependencies.pdfkit, 'cloud function should depend on pdfkit for report generation')
