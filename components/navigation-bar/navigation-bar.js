Component({
  options: {
    multipleSlots: true,
  },
  properties: {
    extClass: {
      type: String,
      value: '',
    },
    title: {
      type: String,
      value: '',
    },
    background: {
      type: String,
      value: '',
    },
    color: {
      type: String,
      value: '',
    },
    back: {
      type: Boolean,
      value: true,
    },
    loading: {
      type: Boolean,
      value: false,
    },
    homeButton: {
      type: Boolean,
      value: false,
    },
    animated: {
      type: Boolean,
      value: true,
    },
    show: {
      type: Boolean,
      value: true,
      observer: '_showChange',
    },
    delta: {
      type: Number,
      value: 1,
    },
  },
  data: {
    displayStyle: '',
  },
  lifetimes: {
    attached() {
      const rect = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : { left: 0 }
      const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : wx.getSystemInfoSync()
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const platform = deviceInfo.platform
      const isAndroid = platform === 'android'
      const isDevtools = platform === 'devtools'
      const windowWidth = windowInfo.windowWidth || 375
      const top = (windowInfo.safeArea && windowInfo.safeArea.top) || windowInfo.statusBarHeight || 0
      const menuRight = rect.left ? windowWidth - rect.left : 96

      this.setData({
        ios: !isAndroid,
        innerPaddingRight: `padding-right: ${menuRight}px`,
        leftWidth: `width: ${menuRight}px`,
        safeAreaTop: isDevtools || isAndroid ? `height: calc(var(--height) + ${top}px); padding-top: ${top}px` : '',
      })
    },
  },
  methods: {
    _showChange(show) {
      const animated = this.data.animated
      let displayStyle = ''

      if (animated) {
        displayStyle = `opacity: ${show ? '1' : '0'}; transition: opacity 0.5s;`
      } else {
        displayStyle = `display: ${show ? '' : 'none'}`
      }

      this.setData({
        displayStyle,
      })
    },
    back() {
      const data = this.data

      if (data.delta) {
        wx.navigateBack({
          delta: data.delta,
        })
      }

      this.triggerEvent('back', { delta: data.delta }, {})
    },
    home() {
      wx.switchTab({
        url: '/pages/index/index',
      })
    },
  },
})
