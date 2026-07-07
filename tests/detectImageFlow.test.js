const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

const detectScript = read('pages/detect/detect.js')
const detectTemplate = read('pages/detect/detect.wxml')
const riskEngineScript = read('services/riskEngine.js')
const cloudFunctionScript = read('cloudfunctions/aiGateway/index.js')

assert(detectScript.includes("require('../../services/imageUpload')"), 'detect page should use the image upload service')
assert(detectScript.includes('imageFiles'), 'detect form should keep selected image file paths, not only image counts')
assert(detectScript.includes('uploadDetectionImages'), 'detect page should upload selected images before calling AI')
assert(detectScript.includes('imageFileIDs'), 'detect page should pass uploaded cloud file IDs to the AI payload')

assert(!detectScript.includes('MODEL_INTEGRATION_STATUS'), 'detect page should not expose AI integration status copy')
assert(!detectScript.includes('modelStatus'), 'detect page data should not keep model status copy')
assert(!detectTemplate.includes('modelStatus'), 'detect page template should not render model status copy')
assert(!detectTemplate.includes('model-note'), 'detect page template should not render the AI integration note')
assert(!riskEngineScript.includes('MODEL_INTEGRATION_STATUS'), 'risk engine should not keep unused AI integration status copy')

assert(cloudFunctionScript.includes('getTempFileURL'), 'aiGateway should resolve cloud file IDs to temporary image URLs')
assert(cloudFunctionScript.includes('image_url'), 'aiGateway should send image_url content to a vision-capable model')
assert(cloudFunctionScript.includes('imageFileIDs'), 'aiGateway should read image file IDs from the detection payload')
