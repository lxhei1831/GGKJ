const {
  successCases,
} = require('../../data/mock')

Page({
  data: {
    caseDetail: null,
  },
  onLoad(options) {
    const id = options && options.id
    const caseDetail = successCases.find((item) => item.id === id) || successCases[0]

    this.setData({
      caseDetail,
    })
  },
})
