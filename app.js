// app.js
const CLOUD_ENV = 'cloudbase-d3glhr32of4631ade'

App({
  onLaunch() {
    if (wx.cloud) {
      const cloudOptions = {
        traceUser: true,
      }
      if (CLOUD_ENV) {
        cloudOptions.env = CLOUD_ENV
      }
      wx.cloud.init(cloudOptions)
    }
  },
  globalData: {
    appName: '跨境侵权风险检测',
    apiBaseUrl: '',
  },
})
