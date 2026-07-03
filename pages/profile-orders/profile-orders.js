Page({
  data: {
    serviceTypes: [
      { title: '单次风险检测', desc: '适合单个Listing、图片或关键词复核。', badge: '检测服务' },
      { title: '会员检测套餐', desc: '适合批量上新、定期复查和报告留存。', badge: '会员权益' },
      { title: '律师复核服务', desc: '适合TRO、投诉申诉和高风险链接复核。', badge: '专业服务' },
      { title: '报告导出服务', desc: '适合PDF/Excel归档、内部审查和申诉材料。', badge: '资料服务' },
    ],
    orderFields: [
      '暂无已支付订单',
      '暂无进行中服务',
      '暂无可下载报告',
      '暂无售后记录',
    ],
  },
  goContact() {
    wx.showToast({
      title: '服务购买暂未开放',
      icon: 'none',
    })
  },
})
