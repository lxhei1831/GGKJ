const {
  toolCards,
} = require('../../data/mock')

Page({
  data: {
    tools: toolCards,
    platformTemplates: [
      { platform: 'Amazon', desc: '侵权申诉、盗图投诉、品牌滥用说明' },
      { platform: 'Temu', desc: '商品下架申诉、证据说明、整改承诺' },
      { platform: 'TikTok Shop', desc: '内容版权、商标投诉和店铺处罚申诉' },
      { platform: 'eBay', desc: 'VeRO投诉、反通知和授权证明' },
    ],
  },
  openTool(event) {
    wx.showToast({
      title: `${event.currentTarget.dataset.title}待接入`,
      icon: 'none',
    })
  },
  copyTemplate(event) {
    const platform = event.currentTarget.dataset.platform
    const content = `${platform}平台申诉模板：请补充投诉编号、涉案链接、权利证明、整改动作和联系方式。`

    wx.setClipboardData({
      data: content,
      success() {
        wx.showToast({
          title: '模板已复制',
          icon: 'success',
        })
      },
    })
  },
  openAppealAssistant() {
    wx.showToast({
      title: '申诉信AI接口待接入',
      icon: 'none',
    })
  },
})
