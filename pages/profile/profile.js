const {
  getRecentReports,
} = require('../../services/reportStore')
const {
  buildProfileMenus,
  buildProfileSummary,
} = require('../../services/profileSummary')

Page({
  data: {
    menus: buildProfileMenus([]),
    summary: buildProfileSummary([]),
  },
  onShow() {
    const reports = getRecentReports()
    this.setData({
      menus: buildProfileMenus(reports),
      summary: buildProfileSummary(reports),
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
