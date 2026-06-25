const {
  getRiskDetail,
} = require('../../data/riskDetails')

Page({
  data: {
    detail: getRiskDetail('brands'),
  },
  onLoad(options) {
    const detail = getRiskDetail(options.type)

    this.setData({ detail })
    wx.setNavigationBarTitle({
      title: detail.title,
    })
  },
  copySource(event) {
    const sourceUrl = event.currentTarget.dataset.url

    wx.setClipboardData({
      data: sourceUrl,
      success() {
        wx.showToast({
          title: '来源链接已复制',
          icon: 'success',
        })
      },
    })
  },
})
