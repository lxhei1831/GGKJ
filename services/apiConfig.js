const DEFAULT_API_BASE_URL = 'http://62.234.77.140'
const CLOUD_API_GATEWAY_NAME = 'apiGateway'
const API_TOKEN_STORAGE_KEY = 'ggkjApiToken'
const API_USER_STORAGE_KEY = 'ggkjApiUser'

function normalizeApiBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function getApiBaseUrl(app) {
  const configured = app && app.globalData ? normalizeApiBaseUrl(app.globalData.apiBaseUrl) : ''
  return configured || DEFAULT_API_BASE_URL
}

function buildApiUrl(baseUrl, path) {
  const base = normalizeApiBaseUrl(baseUrl) || DEFAULT_API_BASE_URL
  const apiPath = String(path || '')
  return `${base}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`
}

module.exports = {
  API_TOKEN_STORAGE_KEY,
  API_USER_STORAGE_KEY,
  CLOUD_API_GATEWAY_NAME,
  DEFAULT_API_BASE_URL,
  buildApiUrl,
  getApiBaseUrl,
  normalizeApiBaseUrl,
}
