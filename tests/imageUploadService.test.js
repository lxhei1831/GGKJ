const assert = require('assert')

const {
  normalizeChosenImages,
  uploadDetectionImages,
} = require('../services/imageUpload')

async function run() {
  assert.deepStrictEqual(
    normalizeChosenImages({
      tempFiles: [
        { tempFilePath: 'wxfile://first.png', name: 'first.png' },
        { tempFilePath: 'wxfile://second.jpg' },
      ],
    }),
    [
      { tempFilePath: 'wxfile://first.png', name: 'first.png' },
      { tempFilePath: 'wxfile://second.jpg', name: 'second.jpg' },
    ],
    'chooseMedia results should keep every selected image path'
  )

  assert.deepStrictEqual(
    normalizeChosenImages({
      tempFilePaths: ['wxfile://legacy-a.png', 'wxfile://legacy-b.jpg'],
    }),
    [
      { tempFilePath: 'wxfile://legacy-a.png', name: 'legacy-a.png' },
      { tempFilePath: 'wxfile://legacy-b.jpg', name: 'legacy-b.jpg' },
    ],
    'chooseImage results should be normalized to image file objects'
  )

  const uploaded = []
  const fileIDs = await uploadDetectionImages([
    { tempFilePath: 'wxfile://first.png', name: 'first.png' },
    { tempFilePath: 'wxfile://second.jpg', name: 'second.jpg' },
  ], {
    cloud: {
      uploadFile(args) {
        uploaded.push(args)
        return Promise.resolve({ fileID: `cloud://${args.cloudPath}` })
      },
    },
    now: () => 1783408000000,
    random: () => 'abc123',
  })

  assert.strictEqual(uploaded.length, 2, 'each selected image should be uploaded before detection')
  assert(uploaded[0].cloudPath.includes('detection-images/1783408000000-abc123-0-first.png'), 'cloud path should be deterministic and grouped for detection images')
  assert.deepStrictEqual(fileIDs, [
    'cloud://detection-images/1783408000000-abc123-0-first.png',
    'cloud://detection-images/1783408000000-abc123-1-second.jpg',
  ], 'uploadDetectionImages should return cloud file IDs for the AI payload')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
