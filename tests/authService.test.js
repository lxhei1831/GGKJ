const assert = require('assert')

const {
  API_TOKEN_STORAGE_KEY,
  API_USER_STORAGE_KEY,
} = require('../services/apiConfig')
const {
  clearAuth,
  getStoredAuth,
  getWechatLoginCode,
  loginWithWechatPhone,
  updateProfile,
  uploadAvatar,
} = require('../services/authService')

function createWxRequestMock() {
  const calls = []
  const storage = {}

  return {
    calls,
    storage,
    getStorageSync(key) {
      return storage[key]
    },
    setStorageSync(key, value) {
      storage[key] = value
    },
    removeStorageSync(key) {
      delete storage[key]
    },
    request(options) {
      calls.push(options)
      options.success({
        statusCode: 200,
        data: {
          ok: true,
          token: 'wechat-login-token',
          user: {
            id: 1,
            mobile: '13800138000',
            name: '用户8000',
            avatarUrl: '/uploads/avatars/user-1.png',
            role: 'user',
          },
        },
      })
    },
    uploadFile(options) {
      calls.push(options)
      options.success({
        statusCode: 200,
        data: JSON.stringify({
          ok: true,
          avatarUrl: '/uploads/avatars/user-1.png',
          user: {
            id: 1,
            mobile: '13800138000',
            name: '用户8000',
            avatarUrl: '/uploads/avatars/user-1.png',
            role: 'user',
          },
        }),
      })
    },
  }
}

function createWxLoginMock() {
  return {
    login(options) {
      options.success({
        code: 'wx-login-code',
      })
    },
  }
}

getWechatLoginCode({ wx: createWxLoginMock() }).then((code) => {
  assert.strictEqual(code, 'wx-login-code', 'wechat login should resolve wx.login code')
})

const wxMock = createWxRequestMock()

loginWithWechatPhone({
  phoneCode: 'phone-number-code',
  loginCode: 'wx-login-code',
}, { wx: wxMock }).then((result) => {
  assert.strictEqual(result.ok, true, 'wechat login should resolve backend success response')
  assert.strictEqual(wxMock.calls[0].method, 'POST', 'wechat login should use POST')
  assert.strictEqual(wxMock.calls[0].url, 'http://62.234.77.140/api/auth/wechat/phone-login', 'phone login should call the mini-program phone login API')
  assert.deepStrictEqual(wxMock.calls[0].data, {
    phoneCode: 'phone-number-code',
    loginCode: 'wx-login-code',
  }, 'phone login should send phone authorization code and wx.login code')
  assert.strictEqual(wxMock.storage[API_TOKEN_STORAGE_KEY], 'wechat-login-token', 'wechat login should persist token')
  assert.strictEqual(wxMock.storage[API_USER_STORAGE_KEY].mobile, '13800138000', 'wechat login should persist user mobile')
  assert.strictEqual(getStoredAuth(wxMock).token, 'wechat-login-token', 'stored auth should be readable')

  clearAuth(wxMock)
  assert.strictEqual(wxMock.storage[API_TOKEN_STORAGE_KEY], undefined, 'clearAuth should remove token')
  assert.strictEqual(wxMock.storage[API_USER_STORAGE_KEY], undefined, 'clearAuth should remove user')
})

const profileWxMock = createWxRequestMock()
profileWxMock.storage[API_TOKEN_STORAGE_KEY] = 'stored-token'

updateProfile({
  name: '微信昵称',
  avatarUrl: '/uploads/avatars/user-1.png',
}, { wx: profileWxMock }).then((result) => {
  assert.strictEqual(profileWxMock.calls[0].method, 'POST', 'profile update should use POST')
  assert.strictEqual(profileWxMock.calls[0].url, 'http://62.234.77.140/api/auth/profile', 'profile update should call API profile endpoint')
  assert.deepStrictEqual(profileWxMock.calls[0].data, {
    name: '微信昵称',
    avatarUrl: '/uploads/avatars/user-1.png',
  }, 'profile update should send nickname and avatar URL')
  assert.strictEqual(result.user.avatarUrl, '/uploads/avatars/user-1.png', 'profile update should return avatar URL')
  assert.strictEqual(profileWxMock.storage[API_USER_STORAGE_KEY].avatarUrl, '/uploads/avatars/user-1.png', 'profile update should persist updated user')
})

const avatarWxMock = createWxRequestMock()
avatarWxMock.storage[API_TOKEN_STORAGE_KEY] = 'stored-token'

uploadAvatar('/tmp/avatar.png', { wx: avatarWxMock }).then((result) => {
  assert.strictEqual(avatarWxMock.calls[0].url, 'http://62.234.77.140/api/auth/profile/avatar', 'avatar upload should call API avatar endpoint')
  assert.strictEqual(avatarWxMock.calls[0].filePath, '/tmp/avatar.png', 'avatar upload should send selected local file')
  assert.strictEqual(avatarWxMock.calls[0].name, 'file', 'avatar upload should use expected file field')
  assert.strictEqual(avatarWxMock.calls[0].header.Authorization, 'Bearer stored-token', 'avatar upload should attach stored token')
  assert.strictEqual(result.avatarUrl, '/uploads/avatars/user-1.png', 'avatar upload should return stored avatar URL')
})
