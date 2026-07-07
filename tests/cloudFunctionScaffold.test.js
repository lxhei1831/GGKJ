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
assert(!functionScript.includes('sk-'), 'cloud function source should not contain a hard-coded API key')

assert.strictEqual(functionPackage.main, 'index.js', 'cloud function package should point at index.js')
assert(functionPackage.dependencies['wx-server-sdk'], 'cloud function should depend on wx-server-sdk')
