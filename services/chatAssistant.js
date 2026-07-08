const {
  callAiTask,
} = require('./aiClient')

function sendChatMessage(message, options) {
  const config = options || {}
  const aiClient = config.aiClient || callAiTask

  return aiClient('general_chat', buildChatInput(message), config)
    .then(normalizeChatResponse)
}

function buildChatInput(message) {
  const source = message || {}
  const attachments = normalizeAttachments(source.attachments)

  return {
    text: cleanText(source.text),
    messages: normalizeMessages(source.messages).slice(-12),
    attachments,
    imageFileIDs: attachments
      .filter((item) => item.type === 'image' && item.fileID)
      .map((item) => item.fileID),
  }
}

function normalizeChatResponse(result) {
  const source = result || {}
  const reply = cleanText(source.reply || source.answer || source.content || source.message) ||
    '我暂时没有生成有效回复，请换一种说法再发一次。'
  const quickReplies = Array.isArray(source.quickReplies)
    ? source.quickReplies.map(cleanText).filter(Boolean).slice(0, 4)
    : []

  return {
    reply,
    quickReplies,
    source: cleanText(source.source) || 'ai-cloud-function',
  }
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return []

  return messages.map((message) => {
    const role = message && message.role === 'assistant' ? 'assistant' : 'user'
    const content = cleanText(message && (message.content || message.text))

    if (!content) return null
    return {
      role,
      content,
    }
  }).filter(Boolean)
}

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return []

  return attachments.map((attachment) => {
    const name = cleanText(attachment && attachment.name)
    const fileID = cleanText(attachment && attachment.fileID)
    const type = attachment && attachment.type === 'image' ? 'image' : 'file'

    if (!name && !fileID) return null
    return {
      type,
      name: name || '附件',
      size: Number(attachment && attachment.size) || 0,
      fileID,
    }
  }).filter(Boolean)
}

function cleanText(value) {
  return String(value || '').trim()
}

module.exports = {
  buildChatInput,
  normalizeChatResponse,
  sendChatMessage,
}
