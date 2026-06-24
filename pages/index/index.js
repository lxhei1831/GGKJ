const {
  dashboardMetrics,
  quickActions,
  alertGroups,
  recentReports,
} = require('../../data/mock')

Page({
  data: {
    metrics: dashboardMetrics,
    quickActions,
    alertGroups,
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
