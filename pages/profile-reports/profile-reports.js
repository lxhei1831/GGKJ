const {
  getRecentReports,
} = require('../../services/reportStore')

Page({
  data: {
    records: [],
  },
  onShow() {
    this.setData({
      records: getRecentReports(),
    })
  },
  openReportDetail(event) {
    const id = event.currentTarget.dataset.id
    if (!id) return

    wx.navigateTo({
      url: `/pages/report-detail/report-detail?id=${encodeURIComponent(id)}`,
    })
  },
})
