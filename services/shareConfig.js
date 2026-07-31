const DEFAULT_SHARE_TITLE = '港港跨境｜上架前先查侵权风险'
const DEFAULT_SHARE_PATH = '/pages/index/index'

function buildShareMessage(pagePath) {
  return {
    title: DEFAULT_SHARE_TITLE,
    path: normalizeSharePath(pagePath),
  }
}

function buildTimelineShareMessage(pagePath) {
  return {
    title: DEFAULT_SHARE_TITLE,
    query: `from=timeline&sharePath=${encodeURIComponent(normalizeSharePath(pagePath))}`,
  }
}

function normalizeSharePath(pagePath) {
  const value = String(pagePath || '').trim()
  if (!value) return DEFAULT_SHARE_PATH
  return value.startsWith('/') ? value : `/${value}`
}

module.exports = {
  DEFAULT_SHARE_TITLE,
  buildShareMessage,
  buildTimelineShareMessage,
  normalizeSharePath,
}
