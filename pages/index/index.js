const {
  dashboardMetrics,
  quickActions,
  recentReports,
} = require('../../data/mock')

Page({
  data: {
    metrics: dashboardMetrics,
    quickActions,
    recentReports,
  },
  goDetect(event) {
    const mode = event.currentTarget.dataset.mode || 'product'
    wx.setStorageSync('pendingDetectMode', mode)
    wx.navigateTo({
      url: '/pages/detect/detect',
    })
  },
  goTro() {
    wx.switchTab({
      url: '/pages/tro/tro',
    })
  },
})
