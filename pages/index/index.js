const {
  dashboardMetrics,
  successCases,
} = require('../../data/mock')

Page({
  data: {
    metrics: dashboardMetrics,
    successCases,
  },
  goDetect() {
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
