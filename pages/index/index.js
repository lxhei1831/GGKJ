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
})
