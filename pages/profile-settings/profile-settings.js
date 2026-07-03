Page({
  data: {
    accountRows: [
      { label: '手机号', value: '待登录后绑定' },
      { label: '邮箱', value: '待登录后绑定' },
      { label: '会员身份', value: '专业会员' },
      { label: '数据同步', value: '待检测后同步报告与案件' },
    ],
    settingGroups: [
      {
        title: '通知偏好',
        items: ['检测报告生成提醒', 'TRO案件截止时间提醒', '客服与律师回复提醒'],
      },
      {
        title: '安全与隐私',
        items: ['登录设备管理', '隐私协议与服务条款', '检测数据导出与删除'],
      },
    ],
  },
  showPreparing() {
    wx.showToast({
      title: '设置项暂未开放',
      icon: 'none',
    })
  },
})
