const assert = require('assert')
const Module = require('module')

const originalLoad = Module._load
let pageDefinition = null

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '../../services/imageUpload') {
    throw new Error('simulated missing image upload service')
  }
  return originalLoad.call(this, request, parent, isMain)
}

global.wx = {
  cloud: {},
  getStorageSync() {
    return ''
  },
  removeStorageSync() {},
  showToast() {},
}
global.Page = (definition) => {
  pageDefinition = definition
}

try {
  require('../pages/detect/detect')
} finally {
  Module._load = originalLoad
}

assert(pageDefinition, 'detect page should still register even if optional image upload helpers are unavailable at load time')
assert.strictEqual(typeof pageDefinition.runDetection, 'function', 'detect page should expose the detection action')
