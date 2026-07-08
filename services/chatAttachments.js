function normalizeChosenMedia(result) {
  const files = result && Array.isArray(result.tempFiles) ? result.tempFiles : []

  return files
    .map((file, index) => normalizeAttachment({
      type: 'image',
      tempFilePath: file && file.tempFilePath,
      name: file && file.name,
      size: file && file.size,
    }, index))
    .filter(Boolean)
}

function normalizeChosenFiles(result) {
  const files = result && Array.isArray(result.tempFiles) ? result.tempFiles : []

  return files
    .map((file, index) => normalizeAttachment({
      type: 'file',
      tempFilePath: file && (file.path || file.tempFilePath),
      name: file && file.name,
      size: file && file.size,
    }, index))
    .filter(Boolean)
}

function uploadChatAttachments(attachments, options) {
  const files = Array.isArray(attachments) ? attachments : []
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
    if (file.fileID) {
      return Promise.resolve(normalizeUploadedAttachment(file, file.fileID))
    }

    const tempFilePath = file.tempFilePath || file.path
    const safeName = sanitizeFileName(file.name || getFileName(tempFilePath) || `attachment-${index}`)

    return cloud.uploadFile({
      cloudPath: `ai-chat-attachments/${timestamp}-${random()}-${index}-${safeName}`,
      filePath: tempFilePath,
    }).then((res) => normalizeUploadedAttachment(file, res.fileID))
  }))
}

function normalizeAttachment(file, index) {
  const tempFilePath = String(file && file.tempFilePath || '').trim()
  if (!tempFilePath) return null

  return {
    type: file.type === 'image' ? 'image' : 'file',
    name: String(file.name || getFileName(tempFilePath) || `attachment-${index}`).trim(),
    size: Number(file.size) || 0,
    tempFilePath,
  }
}

function normalizeUploadedAttachment(file, fileID) {
  return {
    type: file.type === 'image' ? 'image' : 'file',
    name: String(file.name || '附件').trim(),
    size: Number(file.size) || 0,
    fileID,
  }
}

function getFileName(filePath) {
  const text = String(filePath || '')
  const parts = text.split(/[\\/]/)
  return parts[parts.length - 1] || ''
}

function sanitizeFileName(name) {
  const text = String(name || 'attachment')
    .replace(/[^\w.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return text || 'attachment'
}

function createRandomId() {
  return Math.random().toString(36).slice(2, 10)
}

module.exports = {
  normalizeChosenFiles,
  normalizeChosenMedia,
  uploadChatAttachments,
}
