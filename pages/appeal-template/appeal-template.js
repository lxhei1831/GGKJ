const {
  REQUIRED_APPEAL_FIELDS,
  formatAppealTemplateBlocks,
  validateAppealForm,
  buildPlatformAppealTemplate,
} = require('../../services/appealTemplate')

const defaultAppealForm = REQUIRED_APPEAL_FIELDS.reduce((form, field) => {
  form[field.key] = ''
  return form
}, {})

Page({
  data: {
    platform: '平台',
    appealFields: REQUIRED_APPEAL_FIELDS,
    appealForm: Object.assign({}, defaultAppealForm),
    generatedTemplate: '',
    generatedTemplateBlocks: [],
  },
  onLoad(options) {
    const platform = options.platform ? decodeURIComponent(options.platform) : '平台'

    this.setData({ platform })
    wx.setNavigationBarTitle({
      title: `${platform}英文申诉模板`,
    })
  },
  bindAppealInput(event) {
    const field = event.currentTarget.dataset.field

    this.setData({
      [`appealForm.${field}`]: event.detail.value,
      generatedTemplate: '',
      generatedTemplateBlocks: [],
    })
  },
  generateAppealTemplate() {
    const validation = validateAppealForm(this.data.appealForm)

    if (!validation.valid) {
      wx.showToast({
        title: `请先补全${validation.missingField}`,
        icon: 'none',
      })
      return
    }

    const generatedTemplate = buildPlatformAppealTemplate(this.data.platform, validation.form)

    this.setData({
      generatedTemplate,
      generatedTemplateBlocks: formatAppealTemplateBlocks(generatedTemplate),
    })

    wx.showToast({
      title: '模板已生成',
      icon: 'success',
    })
  },
  copyGeneratedTemplate() {
    if (!this.data.generatedTemplate) {
      wx.showToast({
        title: '请先生成模板',
        icon: 'none',
      })
      return
    }

    wx.setClipboardData({
      data: this.data.generatedTemplate,
      success() {
        wx.showToast({
          title: '模板已复制',
          icon: 'success',
        })
      },
    })
  },
})
