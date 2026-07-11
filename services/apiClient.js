const {
  API_TOKEN_STORAGE_KEY,
  CLOUD_API_GATEWAY_NAME,
  buildApiUrl,
  getApiBaseUrl,
  normalizeApiBaseUrl,
} = require('./apiConfig')

class ApiError extends Error {
  constructor(statusCode, message, data) {
    super(message || `API request failed: ${statusCode}`)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.data = data
  }
}

function getWx(adapter) {
  if (adapter && adapter.wx) return adapter.wx
  if (typeof wx !== 'undefined') return wx
  return null
}

function getAppInstance(adapter) {
  if (adapter && adapter.app) return adapter.app
  if (typeof getApp === 'function') return getApp()
  return null
}

function getStoredToken(wxAdapter) {
  if (!wxAdapter || typeof wxAdapter.getStorageSync !== 'function') return ''
  try {
    return wxAdapter.getStorageSync(API_TOKEN_STORAGE_KEY) || ''
  } catch (error) {
    return ''
  }
}

function request(path, options, adapter) {
  const wxAdapter = getWx(adapter)
  if (!wxAdapter) {
    return Promise.reject(new Error('wx is unavailable'))
  }

  const requestOptions = options || {}
  const app = getAppInstance(adapter)
  const baseUrl = requestOptions.baseUrl || getApiBaseUrl(app)
  const token = requestOptions.token !== undefined ? requestOptions.token : getStoredToken(wxAdapter)
  const header = Object.assign({
    'content-type': 'application/json',
  }, requestOptions.header || {})

  if (token && !header.Authorization) {
    header.Authorization = `Bearer ${token}`
  }

  if (shouldUseCloudApiProxy(baseUrl, wxAdapter)) {
    return requestViaCloudProxy(path, requestOptions, token, wxAdapter)
  }

  if (typeof wxAdapter.request !== 'function') {
    return Promise.reject(new Error('wx.request is unavailable'))
  }

  return new Promise((resolve, reject) => {
    wxAdapter.request({
      url: buildApiUrl(baseUrl, path),
      method: requestOptions.method || 'GET',
      data: requestOptions.data || {},
      header,
      timeout: requestOptions.timeout || 15000,
      success(response) {
        const statusCode = Number(response.statusCode || 0)
        if (statusCode >= 200 && statusCode < 300) {
          resolve(response.data)
          return
        }

        const data = response.data || {}
        reject(new ApiError(statusCode, data.detail || data.message || '', data))
      },
      fail(error) {
        reject(new Error(error && error.errMsg ? error.errMsg : 'API request failed'))
      },
    })
  })
}

function shouldUseCloudApiProxy(baseUrl, wxAdapter) {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl)
  return /^http:\/\//i.test(normalizedBaseUrl) &&
    wxAdapter &&
    wxAdapter.cloud &&
    typeof wxAdapter.cloud.callFunction === 'function'
}

function normalizeApiPath(path) {
  const value = String(path || '').trim()
  if (!value) return '/'
  return value.startsWith('/') ? value : `/${value}`
}

function requestViaCloudProxy(path, requestOptions, token, wxAdapter) {
  return wxAdapter.cloud.callFunction({
    name: CLOUD_API_GATEWAY_NAME,
    data: {
      path: normalizeApiPath(path),
      method: requestOptions.method || 'GET',
      data: requestOptions.data || {},
      token,
    },
  }).then((response) => {
    const result = response && response.result ? response.result : {}
    const statusCode = Number(result.statusCode || 0)
    const data = result.data || {}
    if (statusCode >= 200 && statusCode < 300) {
      return data
    }
    throw new ApiError(statusCode, data.detail || data.message || result.message || '', data)
  })
}

module.exports = {
  ApiError,
  request,
}
