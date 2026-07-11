const assert = require('assert')

const {
  DEFAULT_API_BASE_URL,
  API_TOKEN_STORAGE_KEY,
  buildApiUrl,
  normalizeApiBaseUrl,
} = require('../services/apiConfig')
const {
  ApiError,
  request,
} = require('../services/apiClient')

function createWxMock(response) {
  const calls = []
  const storage = {
    [API_TOKEN_STORAGE_KEY]: 'stored-token',
  }

  return {
    calls,
    getStorageSync(key) {
      return storage[key]
    },
    request(options) {
      calls.push(options)
      if (response.fail) {
        options.fail(response.fail)
        return
      }
      options.success(response)
    },
  }
}

assert.strictEqual(DEFAULT_API_BASE_URL, 'http://62.234.77.140', 'mini program API should default to the temporary VPS address')
assert.strictEqual(normalizeApiBaseUrl(' http://62.234.77.140/ '), 'http://62.234.77.140', 'base URL should be trimmed and remove trailing slash')
assert.strictEqual(buildApiUrl(DEFAULT_API_BASE_URL, '/api/auth/me'), 'http://62.234.77.140/api/auth/me', 'API URL should combine base and path')

const wxSuccess = createWxMock({
  statusCode: 200,
  data: { ok: true },
})

request('/api/auth/me', {}, {
  wx: wxSuccess,
  app: { globalData: { apiBaseUrl: 'http://62.234.77.140/' } },
}).then((data) => {
  assert.deepStrictEqual(data, { ok: true }, 'request should resolve successful response data')
  assert.strictEqual(wxSuccess.calls[0].url, 'http://62.234.77.140/api/auth/me', 'request should use normalized app API base URL')
  assert.strictEqual(wxSuccess.calls[0].header.Authorization, 'Bearer stored-token', 'request should attach stored token by default')
})

const wxServerError = createWxMock({
  statusCode: 401,
  data: { detail: 'Unauthorized' },
})

request('/api/auth/me', {}, {
  wx: wxServerError,
}).then(() => {
  throw new Error('request should reject failed API responses')
}).catch((error) => {
  assert(error instanceof ApiError, 'failed API responses should reject with ApiError')
  assert.strictEqual(error.statusCode, 401, 'ApiError should expose status code')
  assert.strictEqual(error.message, 'Unauthorized', 'ApiError should expose backend detail')
})
