function normalizeChosenImages(result) {
  if (result && Array.isArray(result.tempFiles)) {
    return result.tempFiles
      .map((file) => normalizeImageFile(file && file.tempFilePath, file && file.name))
      .filter(Boolean)
  }

  if (result && Array.isArray(result.tempFilePaths)) {
    return result.tempFilePaths
      .map((tempFilePath) => normalizeImageFile(tempFilePath))
      .filter(Boolean)
  }

  return []
}

function uploadDetectionImages(imageFiles, options) {
  const files = Array.isArray(imageFiles) ? imageFiles : []
  if (!files.length) return Promise.resolve([])

  const config = options || {}
  const cloud = config.cloud || (typeof wx !== 'undefined' && wx.cloud ? wx.cloud : null)

  if (!cloud || typeof cloud.uploadFile !== 'function') {
    return Promise.reject(new Error('wx.cloud.uploadFile is unavailable'))
  }

  const now = config.now || (() => Date.now())
  const random = config.random || createRandomId
  const timestamp = now()

  return Promise.all(files.map((file, index) => {
    const safeName = sanitizeFileName(file.name || getFileName(file.tempFilePath) || `image-${index}.jpg`)

    return cloud.uploadFile({
      cloudPath: `detection-images/${timestamp}-${random()}-${index}-${safeName}`,
      filePath: file.tempFilePath,
    }).then((res) => res.fileID)
  }))
}

function normalizeImageFile(tempFilePath, name) {
  const path = String(tempFilePath || '').trim()
  if (!path) return null

  return {
    tempFilePath: path,
    name: String(name || getFileName(path) || 'image.jpg').trim(),
  }
}

function getFileName(filePath) {
  const text = String(filePath || '')
  const parts = text.split(/[\\/]/)
  return parts[parts.length - 1] || ''
}

function sanitizeFileName(name) {
  const text = String(name || 'image.jpg')
    .replace(/[^\w.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return text || 'image.jpg'
}

function createRandomId() {
  return Math.random().toString(36).slice(2, 10)
}

module.exports = {
  normalizeChosenImages,
  uploadDetectionImages,
}
