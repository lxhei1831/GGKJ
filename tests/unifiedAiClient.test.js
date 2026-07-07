const assert = require('assert')

const {
  AI_CLOUD_FUNCTION_NAME,
  callAiTask,
} = require('../services/aiClient')

async function run() {
  assert.strictEqual(AI_CLOUD_FUNCTION_NAME, 'aiGateway', 'all AI tasks should share the aiGateway cloud function')

  let callArgs = null
  const result = await callAiTask('tro_advice', {
    platform: 'Amazon',
    caseNo: '24-cv-12345',
  }, {
    cloud: {
      callFunction(args) {
        callArgs = args
        return Promise.resolve({
          result: {
            ok: true,
            data: {
              title: 'AI TRO advice',
              actions: ['Preserve the platform notice.'],
            },
          },
        })
      },
    },
  })

  assert.strictEqual(callArgs.name, 'aiGateway', 'AI client should call the shared cloud function')
  assert.strictEqual(callArgs.data.task, 'tro_advice', 'AI client should pass the task type')
  assert.strictEqual(callArgs.data.version, 'v1', 'AI client should pass the contract version')
  assert.strictEqual(callArgs.data.input.caseNo, '24-cv-12345', 'AI client should pass task input')
  assert.strictEqual(result.title, 'AI TRO advice', 'AI client should unwrap successful cloud function data')

  await assert.rejects(
    () => callAiTask('tro_advice', {}, {
      cloud: {
        callFunction() {
          return Promise.resolve({
            result: {
              ok: false,
              error: {
                message: 'model unavailable',
              },
            },
          })
        },
      },
    }),
    /model unavailable/,
    'AI client should reject failed cloud function results with the server message'
  )
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
