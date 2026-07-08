const assert = require('assert')

const {
  normalizeChosenFiles,
  normalizeChosenMedia,
  uploadChatAttachments,
} = require('../services/chatAttachments')

async function run() {
  assert.deepStrictEqual(
    normalizeChosenMedia({
      tempFiles: [
        { tempFilePath: 'tmp/a.png', size: 1200 },
      ],
    }),
    [
      {
        type: 'image',
        name: 'a.png',
        size: 1200,
        tempFilePath: 'tmp/a.png',
      },
    ],
    'media picker results should normalize to image attachments'
  )

  assert.deepStrictEqual(
    normalizeChosenFiles({
      tempFiles: [
        { path: 'tmp/evidence.pdf', name: 'evidence.pdf', size: 2048 },
      ],
    }),
    [
      {
        type: 'file',
        name: 'evidence.pdf',
        size: 2048,
        tempFilePath: 'tmp/evidence.pdf',
      },
    ],
    'message file picker results should normalize to file attachments'
  )

  const uploads = []
  const result = await uploadChatAttachments([
    { type: 'image', name: 'notice image.png', tempFilePath: 'tmp/notice.png', size: 1 },
    { type: 'file', name: 'evidence.pdf', tempFilePath: 'tmp/evidence.pdf', size: 2 },
  ], {
    now: () => 123,
    random: () => 'abc',
    cloud: {
      uploadFile(args) {
        uploads.push(args)
        return Promise.resolve({ fileID: `cloud://${args.cloudPath}` })
      },
    },
  })

  assert.strictEqual(uploads.length, 2, 'all pending chat attachments should upload')
  assert(uploads[0].cloudPath.startsWith('ai-chat-attachments/123-abc-0-notice-image.png'), 'upload path should be stable and sanitized')
  assert.strictEqual(result[0].fileID, `cloud://${uploads[0].cloudPath}`, 'uploaded attachments should keep cloud file IDs')
  assert.strictEqual(result[1].type, 'file', 'uploaded file attachments should keep their type')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
