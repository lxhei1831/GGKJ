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
    wx.showToast({
      title: `${event.currentTarget.dataset.title}待接入`,
      icon: 'none',
    })
  },
  openMember() {
    wx.showToast({
      title: '会员支付待接入',
      icon: 'none',
    })
  },
  contactService() {
    wx.showToast({
      title: '客服接口待接入',
      icon: 'none',
    })
  },
})
