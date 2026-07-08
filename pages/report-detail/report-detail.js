const {
  getReportById,
} = require('../../services/reportStore')

Page({
  data: {
    report: null,
    pdfOpening: false,
  },
  onLoad(options) {
    const report = getReportById(options && options.id)

    if (!report) {
      wx.showToast({
        title: '报告不存在',
        icon: 'none',
      })
      return
    }

    this.setData({ report })
  },
  viewPdfReport() {
    if (this.data.pdfOpening) return

    const fileID = this.data.report && this.data.report.pdfReportFileID
    if (!fileID) {
      wx.showToast({
        title: '暂无PDF报告',
        icon: 'none',
      })
      return
    }

    if (!wx.cloud || typeof wx.cloud.downloadFile !== 'function') {
      wx.showToast({
        title: '云文件下载不可用',
        icon: 'none',
      })
      return
    }

    this.setData({ pdfOpening: true })
    wx.cloud.downloadFile({
      fileID,
    })
      .then((res) => this.openPdfDocument(res.tempFilePath))
      .catch(() => {
        wx.showToast({
          title: 'PDF打开失败，请稍后重试',
          icon: 'none',
        })
      })
      .then(() => {
        this.setData({ pdfOpening: false })
      })
  },
  openPdfDocument(filePath) {
    return new Promise((resolve, reject) => {
      wx.openDocument({
        filePath,
        fileType: 'pdf',
        success: resolve,
        fail: reject,
      })
    })
  },
})
