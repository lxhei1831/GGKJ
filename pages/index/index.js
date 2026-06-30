const {
  dashboardMetrics,
  quickActions,
  successCases,
} = require('../../data/mock')

Page({
  data: {
    metrics: dashboardMetrics,
    quickActions,
    successCases,
  },
  goDetect(event) {
    const mode = event.currentTarget.dataset.mode || 'product'
    wx.setStorageSync('pendingDetectMode', mode)
    wx.navigateTo({
      url: '/pages/detect/detect',
    })
  },
  openCase(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/case-detail/case-detail?id=${id}`,
    })
  },
})
