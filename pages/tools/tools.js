const {
  buildTimelineShareMessage,
  buildShareMessage,
} = require('../../services/shareConfig')

Page({
  data: {
    platformTemplates: [
      { platform: 'Amazon', desc: '侵权申诉、盗图投诉、品牌滥用说明' },
      { platform: 'Temu', desc: '商品下架申诉、证据说明、整改承诺' },
      { platform: 'TikTok Shop', desc: '内容版权、商标投诉和店铺处罚申诉' },
      { platform: 'eBay', desc: 'VeRO投诉、反通知和授权证明' },
    ],
  },
  openTemplateGenerator(event) {
    const platform = event.currentTarget.dataset.platform

    wx.navigateTo({
      url: `/pages/appeal-template/appeal-template?platform=${encodeURIComponent(platform)}`,
    })
  },
  openAiAssistant() {
    wx.navigateTo({
      url: '/pages/ai-chat/ai-chat',
    })
  },
  onShareAppMessage() {
    return buildShareMessage('/pages/tools/tools')
  },
  onShareTimeline() {
    return buildTimelineShareMessage('/pages/tools/tools')
  },
})
