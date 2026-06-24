Page({
  data: {
    lawyer: {
      name: '王磊磊律师',
      firm: '北京国舜律师事务所',
      role: '专职律师',
      location: '江苏连云港',
      education: '江苏海洋大学经济学、法学双学士',
      license: '2019年取得律师资格证书，2020年开始律师职业',
      consultWeChat: '15961302421',
      highlights: [
        '北京国舜律师事务所专职律师',
        '江苏省连云港市人民检察院人民监督员',
        '擅长领域：刑事犯罪、民商法',
        '公开资料显示年均办案数量约70件',
      ],
      honors: [
        '江苏省司法厅2021年度村居法律顾问项目二等奖',
        '连云港市人民检察院人民监督员',
        '海州区执法监督专家库成员、企业合规专家库成员',
        '连云区检察院壹心为公志愿者及听证员',
      ],
      cases: [
        '江苏省首例涉干细胞类刑事犯罪案件，全案犯罪嫌疑人解除取保候审措施',
        '强奸罪未遂辩护为中止、坦白辩护为自首，辩护意见被采纳',
        '诈骗罪辩护为合同诈骗罪，公开介绍称被告人刑期大幅下降',
      ],
    },
    serviceScenes: [
      'TRO案件材料初审与风险沟通',
      '冻结金额、销售记录和涉案链接资料整理',
      '和解策略、证据链和平台沟通建议',
      '律师预约、进度跟踪和下一步动作提醒',
    ],
  },
  requestConsult() {
    const wechat = this.data.lawyer.consultWeChat
    wx.setClipboardData({
      data: wechat,
      success: () => {
        wx.showModal({
          title: '微信号已复制',
          content: `请打开微信添加 ${wechat} 进行咨询。`,
          showCancel: false,
        })
      },
      fail: () => {
        wx.showToast({
          title: `微信号：${wechat}`,
          icon: 'none',
        })
      },
    })
  },
})
