const http = require('http')
const https = require('https')

const DEFAULT_BACKEND_BASE_URL = 'http://62.234.77.140'
const DEFAULT_TIMEOUT_MS = 15000

const ALLOWED_REQUESTS = [
  ['POST', '/api/auth/wechat/phone-login'],
  ['GET', '/api/auth/me'],
  ['POST', '/api/auth/profile'],
]

exports.main = async (event) => {
  const method = normalizeMethod(event && event.method)
  const path = normalizePath(event && event.path)

  if (!isAllowedRequest(method, path)) {
    return {
      statusCode: 403,
      data: { detail: 'Forbidden' },
    }
  }

  try {
    return await forwardJsonRequest({
      method,
      path,
      data: event && event.data,
      token: event && event.token,
    })
  } catch (error) {
    return {
      statusCode: 502,
      data: { detail: error.message || 'API proxy failed' },
    }
  }
}

function normalizeMethod(method) {
  return String(method || 'GET').trim().toUpperCase()
}

function normalizePath(path) {
  const value = String(path || '').trim()
  if (!value || /^https?:\/\//i.test(value)) return ''
  const withSlash = value.startsWith('/') ? value : `/${value}`
  return withSlash.replace(/\/{2,}/g, '/')
}

function isAllowedRequest(method, path) {
  const normalizedMethod = normalizeMethod(method)
  const normalizedPath = normalizePath(path)
  if (!normalizedPath) return false
  const pathname = normalizedPath.split('?', 1)[0]
  return ALLOWED_REQUESTS.some(([allowedMethod, allowedPath]) => (
    allowedMethod === normalizedMethod && allowedPath === pathname
  ))
}

function forwardJsonRequest(request) {
  const backendBaseUrl = trimTrailingSlash(process.env.GGKJ_API_BASE_URL || DEFAULT_BACKEND_BASE_URL)
  const target = new URL(`${backendBaseUrl}${request.path}`)
  const client = target.protocol === 'http:' ? http : https
  const body = JSON.stringify(request.data || {})
  const headers = {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
  }

  if (request.token) {
    headers.authorization = `Bearer ${request.token}`
  }

  return new Promise((resolve, reject) => {
    const req = client.request({
      method: request.method,
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      headers,
      timeout: Number(process.env.GGKJ_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    }, (res) => {
      let raw = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        raw += chunk
      })
      res.on('end', () => {
        let data = {}
        try {
          data = raw ? JSON.parse(raw) : {}
        } catch (error) {
          data = { detail: raw || 'Non-JSON response' }
        }

        resolve({
          statusCode: Number(res.statusCode || 0),
          data,
        })
      })
    })

    req.on('timeout', () => {
      req.destroy(new Error('API proxy request timed out'))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

exports.__test = {
  isAllowedRequest,
  normalizePath,
}
