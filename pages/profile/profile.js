const {
  profileMenus,
} = require('../../data/mock')
const {
  getRecentReports,
} = require('../../services/reportStore')

Page({
  data: {
    menus: buildProfileMenus([]),
    summary: [
      { label: '本月检测', value: '42' },
      { label: '剩余额度', value: '158' },
      { label: '风险报告', value: '12' },
      { label: 'TRO案件', value: '2' },
    ],
  },
  onShow() {
    const reports = getRecentReports()
    this.setData({
      menus: buildProfileMenus(reports),
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

function buildProfileMenus(reports) {
  const count = Array.isArray(reports) ? reports.length : 0

  return profileMenus.map((item) => {
    if (item.key !== 'reports') return item

    return Object.assign({}, item, {
      status: count ? `最近 ${count} 条` : '暂无记录',
      statusKey: count ? 'info' : 'low',
    })
  })
}
