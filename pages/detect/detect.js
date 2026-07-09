const {
  detectionModes,
  platforms,
  countryRegions,
} = require('../../data/mock')
const {
  detectRisk,
} = require('../../services/riskEngine')
const {
  deleteReportById,
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

const DETECT_REPORT_PREVIEW_LIMIT = 3

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
    pdfOpening: false,
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
      recentReports: getRecentReports(null, DETECT_REPORT_PREVIEW_LIMIT),
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
      pdfOpening: false,
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
      .then((imageFileIDs) => {
        const detectionPayload = this.buildDetectionPayload(payload, imageFileIDs)
        return detectRisk(detectionPayload).then((result) => ({
          detectionPayload,
          result,
        }))
      })
      .then(({ detectionPayload, result }) => {
        saveDetectionReport(detectionPayload, result, {
          modeLabel: this.data.activeModeLabel,
        })
        this.setData({
          result: null,
          recentReports: getRecentReports(null, DETECT_REPORT_PREVIEW_LIMIT),
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
  viewReportPdf(event) {
    if (this.data.pdfOpening) return

    const fileID = event.currentTarget.dataset.fileId
    if (!fileID) {
      wx.showToast({
        title: '暂无PDF报告',
        icon: 'none',
      })
      return
    }

    if (!wx.cloud || typeof wx.cloud.downloadFile !== 'function') {
      wx.showToast({
        title: '云文件下载不可用',
        icon: 'none',
      })
      return
    }

    this.setData({ pdfOpening: true })
    wx.cloud.downloadFile({
      fileID,
    })
      .then((res) => this.openPdfDocument(res.tempFilePath))
      .catch(() => {
        wx.showToast({
          title: 'PDF打开失败，请稍后重试',
          icon: 'none',
        })
      })
      .then(() => {
        this.setData({ pdfOpening: false })
      })
  },
  openPdfDocument(filePath) {
    return new Promise((resolve, reject) => {
      wx.openDocument({
        filePath,
        fileType: 'pdf',
        success: resolve,
        fail: reject,
      })
    })
  },
  openReportList() {
    wx.navigateTo({
      url: '/pages/profile-reports/profile-reports',
    })
  },
  openReportDetail(event) {
    const id = event.currentTarget.dataset.id
    if (!id) return

    wx.navigateTo({
      url: `/pages/report-detail/report-detail?id=${encodeURIComponent(id)}`,
    })
  },
  confirmDeleteReport(event) {
    const id = event.currentTarget.dataset.id
    if (!id) return

    wx.showModal({
      title: '删除报告',
      content: '删除后仅移除本机保存的检测记录，已生成的云端PDF文件不会被删除。',
      confirmText: '删除',
      confirmColor: '#dc2626',
      success: (res) => {
        if (!res.confirm) return

        const removed = deleteReportById(id)
        this.loadRecentReports()
        wx.showToast({
          title: removed ? '已删除' : '报告不存在',
          icon: removed ? 'success' : 'none',
        })
      },
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
