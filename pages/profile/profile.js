const {
  profileMenus,
} = require('../../data/mock')
const {
  getRecentReports,
} = require('../../services/reportStore')

Page({
  data: {
    menus: profileMenus,
    summary: [
      { label: '本月检测', value: '42' },
      { label: '剩余额度', value: '158' },
      { label: '风险报告', value: '12' },
      { label: 'TRO案件', value: '2' },
    ],
    records: [],
  },
  onShow() {
    this.setData({
      records: getRecentReports(),
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
