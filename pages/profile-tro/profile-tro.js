Page({
  data: {
    materialList: [
      '法院文件或平台通知截图',
      '冻结账户和金额截图',
      '涉案产品链接、SKU和销售记录',
      '供应链合同、授权证明或下架整改记录',
    ],
    futureFields: [
      { label: '案件状态', value: '暂无案件' },
      { label: '下一步动作', value: '暂无待办' },
      { label: '截止时间', value: '--' },
      { label: '冻结金额', value: '--' },
    ],
    process: [
      { title: '提交案件信息', desc: '填写平台、案件号、品牌和冻结金额。' },
      { title: '材料完整度检查', desc: '整理法院文件、账户冻结截图和销售记录。' },
      { title: '律师复核建议', desc: '判断是否需要异议、和解或账户解冻动作。' },
    ],
  },
  goTroEmergency() {
    wx.switchTab({
      url: '/pages/tro/tro',
    })
  },
})
