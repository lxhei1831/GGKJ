const {
  API_TOKEN_STORAGE_KEY,
  API_USER_STORAGE_KEY,
  buildApiUrl,
  getApiBaseUrl,
} = require('./apiConfig')
const {
  request,
} = require('./apiClient')

function getWx(adapter) {
  if (adapter && adapter.wx) return adapter.wx
  if (adapter && typeof adapter.getStorageSync === 'function') return adapter
  if (typeof wx !== 'undefined') return wx
  return null
}

function getAppInstance(adapter) {
  if (adapter && adapter.app) return adapter.app
  if (typeof getApp === 'function') return getApp()
  return null
}

function saveAuth(token, user, adapter) {
  const wxAdapter = getWx(adapter)
  if (!wxAdapter || typeof wxAdapter.setStorageSync !== 'function') return
  wxAdapter.setStorageSync(API_TOKEN_STORAGE_KEY, token || '')
  wxAdapter.setStorageSync(API_USER_STORAGE_KEY, user || null)
}

function getStoredAuth(adapter) {
  const wxAdapter = getWx(adapter)
  if (!wxAdapter || typeof wxAdapter.getStorageSync !== 'function') {
    return { token: '', user: null }
  }

  try {
    return {
      token: wxAdapter.getStorageSync(API_TOKEN_STORAGE_KEY) || '',
      user: wxAdapter.getStorageSync(API_USER_STORAGE_KEY) || null,
    }
  } catch (error) {
    return { token: '', user: null }
  }
}

function clearAuth(adapter) {
  const wxAdapter = getWx(adapter)
  if (!wxAdapter || typeof wxAdapter.removeStorageSync !== 'function') return
  wxAdapter.removeStorageSync(API_TOKEN_STORAGE_KEY)
  wxAdapter.removeStorageSync(API_USER_STORAGE_KEY)
}

function getWechatLoginCode(adapter) {
  const wxAdapter = getWx(adapter)
  if (!wxAdapter || typeof wxAdapter.login !== 'function') {
    return Promise.reject(new Error('wx.login is unavailable'))
  }

  return new Promise((resolve, reject) => {
    wxAdapter.login({
      success(response) {
        if (response && response.code) {
          resolve(response.code)
          return
        }
        reject(new Error('wx.login did not return code'))
      },
      fail(error) {
        reject(new Error(error && error.errMsg ? error.errMsg : 'wx.login failed'))
      },
    })
  })
}

function loginWithWechatPhone(payload, adapter) {
  const loginPayload = payload || {}
  const data = {
    phoneCode: loginPayload.phoneCode,
  }

  if (loginPayload.loginCode) {
    data.loginCode = loginPayload.loginCode
  }

  return request('/api/auth/wechat/phone-login', {
    method: 'POST',
    data,
    token: '',
  }, adapter).then((result) => {
    if (result && result.ok && result.token && result.user) {
      saveAuth(result.token, result.user, getWx(adapter))
    }
    return result
  })
}

function updateProfile(profile, adapter) {
  const payload = profile || {}

  return request('/api/auth/profile', {
    method: 'POST',
    data: {
      name: payload.name || '',
      avatarUrl: payload.avatarUrl || '',
    },
  }, adapter).then((result) => {
    if (result && result.user) {
      const auth = getStoredAuth(adapter)
      saveAuth(auth.token, result.user, getWx(adapter))
    }
    return result
  })
}

function parseUploadData(data) {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch (error) {
      return {}
    }
  }
  return data || {}
}

function uploadAvatar(filePath, adapter) {
  const wxAdapter = getWx(adapter)
  if (!wxAdapter || typeof wxAdapter.uploadFile !== 'function') {
    return Promise.reject(new Error('wx.uploadFile is unavailable'))
  }

  const auth = getStoredAuth(adapter)
  const app = getAppInstance(adapter)
  const url = buildApiUrl(getApiBaseUrl(app), '/api/auth/profile/avatar')
  const header = {}
  if (auth.token) {
    header.Authorization = `Bearer ${auth.token}`
  }

  return new Promise((resolve, reject) => {
    wxAdapter.uploadFile({
      url,
      filePath,
      name: 'file',
      header,
      timeout: 15000,
      success(response) {
        const statusCode = Number(response.statusCode || 0)
        const data = parseUploadData(response.data)
        if (statusCode >= 200 && statusCode < 300) {
          if (data && data.user) {
            saveAuth(auth.token, data.user, wxAdapter)
          }
          resolve(data)
          return
        }
        reject(new Error(data.detail || data.message || 'Avatar upload failed'))
      },
      fail(error) {
        reject(new Error(error && error.errMsg ? error.errMsg : 'Avatar upload failed'))
      },
    })
  })
}

function getMe(adapter) {
  return request('/api/auth/me', {}, adapter)
}

module.exports = {
  clearAuth,
  getMe,
  getStoredAuth,
  getWechatLoginCode,
  loginWithWechatPhone,
  saveAuth,
  updateProfile,
  uploadAvatar,
}
