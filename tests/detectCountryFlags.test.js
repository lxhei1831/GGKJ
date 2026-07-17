const assert = require('assert')
const fs = require('fs')
const path = require('path')

const {
  countryRegions,
  countryRegionOptions,
} = require('../data/mock')

assert(Array.isArray(countryRegions), 'countryRegions should remain available as plain country names')
assert.strictEqual(countryRegions[0], '美国', 'plain country name should remain unchanged for detection payloads')

assert(Array.isArray(countryRegionOptions), 'countryRegionOptions should provide flag-enhanced picker data')
assert.deepStrictEqual(
  countryRegionOptions[0],
  {
    name: '美国',
    flagKey: 'us',
    label: '美国',
  },
  'US option should expose a graphical flag key, plain name, and text-only label'
)
assert(
  countryRegionOptions.every((item) => item && item.name && item.flagKey && item.label === item.name),
  'each country option should keep flags as style keys, not emoji text'
)
assert(
  !JSON.stringify(countryRegionOptions).match(/🇺🇸|🇪🇺|🇬🇧|🇨🇦|🇦🇺|🇯🇵|🇰🇷|🇭🇰/),
  'country option data should not store emoji text flags'
)

const detectJs = fs.readFileSync(path.join(__dirname, '../pages/detect/detect.js'), 'utf8')
const detectWxml = fs.readFileSync(path.join(__dirname, '../pages/detect/detect.wxml'), 'utf8')
const detectWxss = fs.readFileSync(path.join(__dirname, '../pages/detect/detect.wxss'), 'utf8')

assert(detectJs.includes('countryRegionOptions'), 'detect page should load flag-enhanced country options')
assert(detectJs.includes('selectedCountryFlagKey'), 'detect page should keep selected graphical flag key separate from plain country name')
assert(detectJs.includes('openCountrySelector'), 'detect page should use a custom selector so rows can render graphical flag badges')
assert(detectJs.includes('selectCountry'), 'detect page should select countries from graphical rows')
assert(
  /countryRegion:\s*this\.data\.selectedCountryRegion/.test(detectJs),
  'detection payload should still submit the plain country name only'
)

assert(
  !detectWxml.includes('range="{{countryRegionOptions}}"'),
  'country selector should not rely on native picker text rows for flags'
)
assert(detectWxml.includes('country-selector-panel'), 'country selector should render a custom panel with graphical rows')
assert(detectWxml.includes('flag-art flag-art-{{item.flagKey}}'), 'country rows should render graphical flag art by style key')
assert(detectWxss.includes('.country-picker-field'), 'selected country field should have dedicated polished layout styles')
assert(detectWxss.includes('.flag-art-us'), 'WXSS should define a graphical US flag style')
assert(detectWxss.includes('.flag-art-eu'), 'WXSS should define a graphical EU flag style')
