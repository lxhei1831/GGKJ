const assert = require('assert')

const {
  normalizeChatResponse,
  sendChatMessage,
} = require('../services/chatAssistant')

async function run() {
  assert.deepStrictEqual(
    normalizeChatResponse({
      reply: '可以先整理平台通知和证据。',
      quickReplies: ['继续分析图片'],
    }),
    {
      reply: '可以先整理平台通知和证据。',
      quickReplies: ['继续分析图片'],
      source: 'ai-cloud-function',
    },
    'chat assistant should normalize model replies'
  )

  assert.strictEqual(
    normalizeChatResponse({ answer: '用 answer 字段也能兼容。' }).reply,
    '用 answer 字段也能兼容。',
    'chat assistant should accept compatible answer fields'
  )

  let callArgs = null
  const result = await sendChatMessage({
    text: '帮我看这个投诉怎么申诉',
    messages: [
      { role: 'assistant', content: '你好，我是港港跨境 AI 助手。' },
      { role: 'user', content: '上一轮问题' },
    ],
    attachments: [
      { type: 'image', name: 'notice.png', fileID: 'cloud://notice' },
      { type: 'file', name: 'evidence.pdf', fileID: 'cloud://evidence' },
    ],
  }, {
    aiClient(task, input) {
      callArgs = { task, input }
      return Promise.resolve({
        reply: '建议先确认投诉类型，再准备授权和整改说明。',
      })
    },
  })

  assert.strictEqual(callArgs.task, 'general_chat', 'chat assistant should use the shared general chat task')
  assert.strictEqual(callArgs.input.text, '帮我看这个投诉怎么申诉', 'chat assistant should pass the current user text')
  assert.strictEqual(callArgs.input.messages.length, 2, 'chat assistant should pass conversation context')
  assert.deepStrictEqual(callArgs.input.imageFileIDs, ['cloud://notice'], 'chat assistant should pass uploaded image file IDs to the model')
  assert.strictEqual(callArgs.input.attachments[1].name, 'evidence.pdf', 'chat assistant should pass uploaded file metadata')
  assert.strictEqual(result.reply, '建议先确认投诉类型，再准备授权和整改说明。', 'chat assistant should return normalized replies')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
