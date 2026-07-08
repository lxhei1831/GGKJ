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
assert(detectScript.includes('viewPdfReport'), 'detect page should expose a handler for previewing generated PDF reports')
assert(detectScript.includes('downloadFile'), 'detect page should download a generated cloud PDF before previewing it')
assert(detectScript.includes('openDocument'), 'detect page should open generated risk report PDFs in the mini program')
assert(detectScript.includes("fileType: 'pdf'"), 'detect page should tell WeChat the downloaded report is a PDF')
assert(detectTemplate.includes('pdfReportFileID'), 'detect page template should render a PDF action only when the result has a PDF file ID')
assert(detectTemplate.includes('viewPdfReport'), 'detect page template should wire the PDF action to the preview handler')

assert(!detectScript.includes('MODEL_INTEGRATION_STATUS'), 'detect page should not expose AI integration status copy')
assert(!detectScript.includes('modelStatus'), 'detect page data should not keep model status copy')
assert(!detectTemplate.includes('modelStatus'), 'detect page template should not render model status copy')
assert(!detectTemplate.includes('model-note'), 'detect page template should not render the AI integration note')
assert(!riskEngineScript.includes('MODEL_INTEGRATION_STATUS'), 'risk engine should not keep unused AI integration status copy')

assert(cloudFunctionScript.includes('getTempFileURL'), 'aiGateway should resolve cloud file IDs to temporary image URLs')
assert(cloudFunctionScript.includes('image_url'), 'aiGateway should send image_url content to a vision-capable model')
assert(cloudFunctionScript.includes('imageFileIDs'), 'aiGateway should read image file IDs from the detection payload')
assert(cloudFunctionScript.includes('searchUsptoTrademarks'), 'aiGateway should enrich US risk detection with USPTO trademark candidates')
assert(cloudFunctionScript.includes('generatePdfReportBuffer'), 'aiGateway should generate PDF report content for completed detections')
assert(cloudFunctionScript.includes('pdfReportFileID'), 'aiGateway should return the uploaded PDF report file ID to the frontend')
