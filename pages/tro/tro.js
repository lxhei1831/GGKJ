const {
  platforms,
  troModules,
  troChecklist,
} = require('../../data/mock')

const defaultCaseForm = {
  caseNo: '',
  brand: '',
  freezeAmount: '',
}

Page({
  data: {
    platforms,
    platformIndex: 0,
    selectedPlatform: platforms[0],
    modules: troModules,
    checklist: troChecklist,
    caseForm: Object.assign({}, defaultCaseForm),
    caseResult: null,
  },
  bindPlatformChange(event) {
    const platformIndex = Number(event.detail.value)
    this.setData({
      platformIndex,
      selectedPlatform: this.data.platforms[platformIndex],
    })
  },
  bindInput(event) {
    const field = event.currentTarget.dataset.field
    this.setData({
      [`caseForm.${field}`]: event.detail.value,
    })
  },
  analyzeCase() {
    const form = this.data.caseForm

    if (!form.caseNo && !form.brand && !form.freezeAmount) {
      wx.showToast({
        title: '请先填写案件信息',
        icon: 'none',
      })
      return
    }

    const amount = Number(form.freezeAmount || 0)
    const brandText = String(form.brand || '').toLowerCase()
    const highBrand = ['stanley', 'disney', 'lego', 'popsockets', 'harley', 'smiley'].some((item) => brandText.indexOf(item) > -1)
    let score = 35

    if (form.caseNo) score += 12
    if (highBrand) score += 24
    if (amount >= 20000) score += 24
    if (amount >= 50000) score += 12

    const high = score >= 75
    const medium = score >= 50 && score < 75

    this.setData({
      caseResult: {
        title: high ? '建议立即进入律师复核流程' : medium ? '建议尽快补齐材料并评估和解区间' : '建议保留证据并持续观察',
        desc: `${this.data.selectedPlatform} · 初步风险分 ${Math.min(score, 96)}`,
        level: high ? 'high' : medium ? 'medium' : 'low',
        levelText: high ? '高风险' : medium ? '中风险' : '低风险',
        actions: [
          '确认涉案链接和冻结账户，先停止新增销售。',
          '整理平台通知、法院文件、销售记录和冻结截图。',
          '核对是否存在品牌词、图片素材或外观设计争议。',
          '需要和解时，先评估销售额、库存、初犯情况和证据强弱。',
        ],
      },
    })
  },
  openLibrary() {
    wx.showToast({
      title: '品牌库接口待接入',
      icon: 'none',
    })
  },
  openLawyerProfile() {
    wx.navigateTo({
      url: '/pages/lawyer/lawyer',
    })
  },
})
