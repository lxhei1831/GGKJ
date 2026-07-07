const {
  detectionModes,
  platforms,
  countryRegions,
} = require('../../data/mock')
const {
  detectRisk,
} = require('../../services/riskEngine')
const {
  getRecentReports,
  saveDetectionReport,
} = require('../../services/reportStore')

const defaultForm = {
  productUrl: '',
  productTitle: '',
  keywordText: '',
  copyText: '',
  category: '',
  imageCount: 0,
  imageFiles: [],
  batchFileName: '',
}

Page({
  data: {
    modeTabs: detectionModes,
    platforms,
    countryRegions,
    platformIndex: 0,
    countryIndex: 0,
    selectedPlatform: platforms[0],
    selectedCountryRegion: countryRegions[0],
    activeMode: 'product',
    activeModeLabel: detectionModes[0].label,
    activeModeDesc: detectionModes[0].desc,
    form: Object.assign({}, defaultForm),
    result: null,
    recentReports: [],
    loading: false,
  },
  onShow() {
    const pendingMode = wx.getStorageSync('pendingDetectMode')
    if (pendingMode) {
      wx.removeStorageSync('pendingDetectMode')
      this.applyMode(pendingMode)
    }
    this.loadRecentReports()
  },
  loadRecentReports() {
    this.setData({
      recentReports: getRecentReports(),
    })
  },
  selectMode(event) {
    this.applyMode(event.currentTarget.dataset.mode)
  },
  applyMode(mode) {
    const nextMode = detectionModes.find((item) => item.key === mode) || detectionModes[0]
    this.setData({
      activeMode: nextMode.key,
      activeModeLabel: nextMode.label,
      activeModeDesc: nextMode.desc,
      result: null,
    })
  },
  bindPlatformChange(event) {
    const platformIndex = Number(event.detail.value)
    this.setData({
      platformIndex,
      selectedPlatform: this.data.platforms[platformIndex],
      result: null,
    })
  },
  bindCountryChange(event) {
    const countryIndex = Number(event.detail.value)
    this.setData({
      countryIndex,
      selectedCountryRegion: this.data.countryRegions[countryIndex],
      result: null,
    })
  },
  bindInput(event) {
    const field = event.currentTarget.dataset.field
    this.setData({
      [`form.${field}`]: event.detail.value,
    })
  },
  chooseImage() {
    const onSuccess = (res) => {
      const imageFiles = getImageUploadService().normalizeChosenImages(res)
      this.setData({
        'form.imageCount': imageFiles.length,
        'form.imageFiles': imageFiles,
        result: null,
      })
    }

    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 6,
        mediaType: ['image'],
        success: onSuccess,
      })
      return
    }

    wx.chooseImage({
      count: 6,
      success: onSuccess,
    })
  },
  chooseBatchFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xlsx', 'xls', 'csv'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        this.setData({
          'form.batchFileName': file ? file.name : '已选择批量文件',
          result: null,
        })
      },
    })
  },
  resetForm() {
    this.setData({
      form: Object.assign({}, defaultForm),
      result: null,
      loading: false,
    })
  },
  runDetection() {
    if (this.data.loading) return

    const payload = Object.assign({}, this.data.form, {
      mode: this.data.activeMode,
      platform: this.data.selectedPlatform,
      countryRegion: this.data.selectedCountryRegion,
    })

    if (!this.hasInput(payload)) {
      wx.showToast({
        title: '请先填写检测信息',
        icon: 'none',
      })
      return
    }

    this.setData({ loading: true })

    getImageUploadService().uploadDetectionImages(payload.imageFiles)
      .then((imageFileIDs) => detectRisk(this.buildDetectionPayload(payload, imageFileIDs)))
      .then((result) => {
        const reportPayload = this.buildDetectionPayload(payload, [])
        saveDetectionReport(reportPayload, result, {
          modeLabel: this.data.activeModeLabel,
        })
        this.setData({
          result,
          recentReports: getRecentReports(),
          loading: false,
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({
          title: '检测失败，请稍后重试',
          icon: 'none',
        })
      })
  },
  hasInput(payload) {
    return Boolean(
      payload.productUrl ||
      payload.productTitle ||
      payload.keywordText ||
      payload.copyText ||
      payload.imageCount ||
      payload.batchFileName
    )
  },
  buildDetectionPayload(payload, imageFileIDs) {
    const nextPayload = Object.assign({}, payload, {
      imageFileIDs: imageFileIDs || [],
    })
    delete nextPayload.imageFiles
    return nextPayload
  },
})

function getImageUploadService() {
  return require('../../services/imageUpload')
}
