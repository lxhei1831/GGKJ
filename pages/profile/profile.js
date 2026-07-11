const {
  getRecentReports,
} = require('../../services/reportStore')
const {
  buildProfileMenus,
  buildProfileSummary,
} = require('../../services/profileSummary')
const {
  clearAuth,
  getStoredAuth,
  getWechatLoginCode,
  loginWithWechatPhone,
  updateProfile,
  uploadAvatar,
} = require('../../services/authService')

Page({
  data: {
    isLoggedIn: false,
    currentUser: null,
    loginError: '',
    isLoggingIn: false,
    showProfileEditor: false,
    profileNickname: '',
    profileAvatarUrl: '',
    profileError: '',
    isSavingProfile: false,
    menus: buildProfileMenus([]),
    summary: buildProfileSummary([]),
  },
  onShow() {
    const reports = getRecentReports()
    const auth = getStoredAuth()

    this.setData({
      isLoggedIn: Boolean(auth.token && auth.user),
      currentUser: auth.user || null,
      menus: buildProfileMenus(reports),
      summary: buildProfileSummary(reports),
    })
  },
  noop() {},
  handlePhoneLogin(event) {
    if (this.data.isLoggingIn) return

    const detail = event && event.detail ? event.detail : {}
    const phoneCode = detail.code
    const errMsg = detail.errMsg || ''

    if (errMsg && errMsg.indexOf('ok') === -1) {
      this.setData({ loginError: '已取消手机号授权' })
      return
    }

    if (!phoneCode) {
      this.setData({ loginError: '未获取到手机号授权，请重试' })
      return
    }

    this.setData({
      isLoggingIn: true,
      loginError: '',
    })

    getWechatLoginCode()
      .catch(() => '')
      .then((loginCode) => loginWithWechatPhone({
        phoneCode,
        loginCode,
      }))
      .then((result) => {
        if (!result || !result.ok || !result.user) {
          this.setData({ loginError: '手机号登录失败，请稍后再试' })
          return
        }

        this.setData({
          isLoggedIn: true,
          currentUser: result.user,
        })
        wx.showToast({
          title: '登录成功',
          icon: 'success',
        })
      })
      .catch((error) => {
        const isMissingEndpoint = error && error.statusCode === 404
        this.setData({
          loginError: isMissingEndpoint ? '手机号登录接口暂未开通' : '手机号登录失败，请稍后再试',
        })
      })
      .finally(() => {
        this.setData({ isLoggingIn: false })
      })
  },
  handleLogout() {
    clearAuth()
    this.setData({
      isLoggedIn: false,
      currentUser: null,
      loginError: '',
      showProfileEditor: false,
      profileNickname: '',
      profileAvatarUrl: '',
      profileError: '',
    })
    wx.showToast({
      title: '已退出登录',
      icon: 'none',
    })
  },
  openProfileEditor() {
    if (!this.data.isLoggedIn || this.data.isSavingProfile) return

    const user = this.data.currentUser || {}
    this.setData({
      showProfileEditor: true,
      profileNickname: user.name || user.nickname || '',
      profileAvatarUrl: user.avatarUrl || '',
      profileError: '',
    })
  },
  closeProfileEditor() {
    if (this.data.isSavingProfile) return
    this.setData({
      showProfileEditor: false,
      profileError: '',
    })
  },
  onChooseProfileAvatar(event) {
    const avatarUrl = event && event.detail ? event.detail.avatarUrl : ''
    this.setData({
      profileAvatarUrl: avatarUrl,
      profileError: '',
    })
  },
  onProfileNicknameInput(event) {
    this.setData({
      profileNickname: event.detail.value,
      profileError: '',
    })
  },
  saveWechatProfile() {
    if (this.data.isSavingProfile) return

    const name = String(this.data.profileNickname || '').trim()
    const avatarUrl = String(this.data.profileAvatarUrl || '').trim()

    if (!name) {
      this.setData({ profileError: '请填写微信昵称' })
      return
    }

    this.setData({
      isSavingProfile: true,
      profileError: '',
    })

    const needsUpload = avatarUrl && avatarUrl.indexOf('/uploads/avatars/') !== 0 && !/^https?:\/\//.test(avatarUrl)
    const avatarTask = needsUpload ? uploadAvatar(avatarUrl).then((result) => result.avatarUrl || '') : Promise.resolve(avatarUrl)

    avatarTask
      .then((storedAvatarUrl) => updateProfile({
        name,
        avatarUrl: storedAvatarUrl,
      }))
      .then((result) => {
        const user = result && result.user ? result.user : null
        if (!user) {
          this.setData({ profileError: '资料保存失败，请稍后再试' })
          return
        }

        this.setData({
          currentUser: user,
          showProfileEditor: false,
          profileNickname: '',
          profileAvatarUrl: '',
        })
        wx.showToast({
          title: '资料已同步',
          icon: 'success',
        })
      })
      .catch(() => {
        this.setData({ profileError: '资料保存失败，请稍后再试' })
      })
      .finally(() => {
        this.setData({ isSavingProfile: false })
      })
  },
  openMenu(event) {
    const path = event.currentTarget.dataset.path

    if (!path) {
      wx.showToast({
        title: '页面准备中',
        icon: 'none',
      })
      return
    }

    wx.navigateTo({
      url: path,
    })
  },
  openMember() {
    wx.showToast({
      title: '会员支付待接入',
      icon: 'none',
    })
  },
})
