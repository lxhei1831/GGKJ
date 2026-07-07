const {
  platforms,
} = require('../../data/mock')
const {
  generateTroAdvice,
} = require('../../services/troAdvice')

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
    caseForm: Object.assign({}, defaultCaseForm),
    caseResult: null,
    loading: false,
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
    if (this.data.loading) return

    const form = this.data.caseForm

    if (!form.caseNo && !form.brand && !form.freezeAmount) {
      wx.showToast({
        title: '请先填写案件信息',
        icon: 'none',
      })
      return
    }

    this.setData({ loading: true })

    generateTroAdvice(this.data.selectedPlatform, form)
      .then((caseResult) => {
        this.setData({
          caseResult,
          loading: false,
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({
          title: '生成失败，请稍后重试',
          icon: 'none',
        })
      })
  },
  openLawyerProfile() {
    wx.navigateTo({
      url: '/pages/lawyer/lawyer',
    })
  },
})
