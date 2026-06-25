const assert = require('assert')
const fs = require('fs')
const path = require('path')

const appConfig = require('../app.json')

const pagePath = 'pages/risk-detail/risk-detail'
const pageRoot = path.join(__dirname, '..', 'pages', 'risk-detail')

assert(appConfig.pages.includes(pagePath), 'app.json should register the risk detail page')

;['js', 'json', 'wxml', 'wxss'].forEach((ext) => {
  const filePath = path.join(pageRoot, `risk-detail.${ext}`)
  assert(fs.existsSync(filePath), `risk detail page should include ${ext} file`)
})
