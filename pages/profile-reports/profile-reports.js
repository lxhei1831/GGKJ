const {
  deleteReportById,
  getRecentReports,
} = require('../../services/reportStore')

Page({
  data: {
    records: [],
  },
  onShow() {
    this.loadReports()
  },
  loadReports() {
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
  confirmDeleteReport(event) {
    const id = event.currentTarget.dataset.id
    if (!id) return

    wx.showModal({
      title: '删除报告',
      content: '删除后仅移除本机保存的检测记录，已生成的云端PDF文件不会被删除。',
      confirmText: '删除',
      confirmColor: '#dc2626',
      success: (res) => {
        if (!res.confirm) return

        const removed = deleteReportById(id)
        this.loadReports()
        wx.showToast({
          title: removed ? '已删除' : '报告不存在',
          icon: removed ? 'success' : 'none',
        })
      },
    })
  },
})
