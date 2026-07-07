const assert = require('assert')

const {
  AI_CONFIG,
  callModelDetection,
  detectRisk,
} = require('../services/riskEngine')

async function run() {
  assert.strictEqual(AI_CONFIG.enableRemoteModel, true, 'remote model should be enabled through a cloud function')
  assert.strictEqual(AI_CONFIG.cloudFunctionName, 'aiGateway', 'risk detection should call the aiGateway cloud function')

  let callArgs = null
  const cloud = {
    callFunction(args) {
      callArgs = args
      return Promise.resolve({
        result: {
          ok: true,
          data: {
            score: 86,
            riskItems: [{
              title: 'AI brand risk',
              detail: 'The listing uses a protected brand reference.',
              level: 'high',
            }],
            suggestions: ['Remove protected brand references before publishing.'],
            jurisdiction: 'Amazon / US',
          },
        },
      })
    },
  }

  const modelResult = await callModelDetection({
    platform: 'Amazon',
    productTitle: 'Disney inspired cup',
  }, { cloud })

  assert.strictEqual(callArgs.name, 'aiGateway', 'callModelDetection should use wx.cloud.callFunction')
  assert.strictEqual(callArgs.data.scene, 'cross_border_ip_risk_detection', 'cloud call should include the detection scene')
  assert.strictEqual(callArgs.data.version, 'v1', 'cloud call should include the API contract version')
  assert.strictEqual(callArgs.data.input.productTitle, 'Disney inspired cup', 'cloud call should pass the detection payload')
  assert.strictEqual(modelResult.score, 86, 'cloud function data should be unwrapped for the page service')

  const fallbackResult = await detectRisk({
    platform: 'Amazon',
    productTitle: 'Disney inspired cup',
  }, {
    cloud: {
      callFunction() {
        return Promise.reject(new Error('cloud unavailable'))
      },
    },
  })

  assert.strictEqual(fallbackResult.modelFallback, true, 'detectRisk should keep local scoring when the cloud function fails')
  assert.strictEqual(fallbackResult.source, 'local-rule-fallback', 'fallback result should identify the local fallback source')
  assert(
    fallbackResult.suggestions[0].startsWith('[本地规则]'),
    'fallback result should clearly label the first visible suggestion as local rules'
  )
  assert(fallbackResult.score > 0, 'fallback result should still contain a usable score')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
