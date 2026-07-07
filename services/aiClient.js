const AI_CLOUD_FUNCTION_NAME = 'aiGateway'
const AI_CONTRACT_VERSION = 'v1'

function callAiTask(task, input, options) {
  const config = options || {}
  const cloud = config.cloud || (typeof wx !== 'undefined' && wx.cloud ? wx.cloud : null)

  if (!cloud || typeof cloud.callFunction !== 'function') {
    return Promise.reject(new Error('wx.cloud.callFunction is unavailable'))
  }

  return cloud.callFunction({
    name: config.cloudFunctionName || AI_CLOUD_FUNCTION_NAME,
    data: {
      task,
      scene: getLegacyScene(task),
      version: AI_CONTRACT_VERSION,
      input: input || {},
    },
  }).then((res) => {
    const result = res && res.result

    if (result && result.ok && result.data) {
      return result.data
    }

    if (result && !result.ok) {
      const message = result.error
        ? (result.error.message || result.error)
        : 'AI cloud function failed'
      throw new Error(message)
    }

    if (result) {
      return result
    }

    throw new Error('AI cloud function returned an empty result')
  })
}

function getLegacyScene(task) {
  if (task === 'risk_detect') return 'cross_border_ip_risk_detection'
  return task
}

module.exports = {
  AI_CLOUD_FUNCTION_NAME,
  AI_CONTRACT_VERSION,
  callAiTask,
}
