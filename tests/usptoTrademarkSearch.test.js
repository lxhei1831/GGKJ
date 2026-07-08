const assert = require('assert')

const {
  buildTrademarkSearchTerms,
  buildUsptoSearchPayload,
  normalizeTrademarkCandidates,
  shouldSearchUspto,
} = require('../cloudfunctions/aiGateway/usptoSearch')

const terms = buildTrademarkSearchTerms({
  countryRegion: '美国',
  productTitle: 'Blue Moon Logo bottle',
  keywordText: 'moon bottle, travel cup',
  copyText: 'A round blue moon badge appears on the front.',
  extractedMarks: ['Blue Moon', 'Moon Badge'],
})

assert.deepStrictEqual(
  terms.slice(0, 4),
  ['Blue Moon', 'Moon Badge', 'Blue Moon Logo bottle', 'moon bottle'],
  'search terms should prefer extracted marks, then listing title and keyword phrases'
)
assert(terms.length <= 8, 'term extraction should cap the number of USPTO search phrases')

assert.strictEqual(
  shouldSearchUspto({ countryRegion: '美国', productTitle: 'Blue Moon' }),
  true,
  'US market detections should search USPTO'
)
assert.strictEqual(
  shouldSearchUspto({ countryRegion: '欧盟', productTitle: 'Blue Moon' }),
  false,
  'non-US market detections should not call USPTO in the first version'
)

const payload = buildUsptoSearchPayload(['Blue Moon'], { limit: 5 })
assert.strictEqual(payload.size, 5, 'USPTO payload should respect the requested limit')
assert(
  JSON.stringify(payload).includes('wordmark'),
  'USPTO payload should search wordmark-like fields'
)
assert(
  JSON.stringify(payload).includes('Blue Moon'),
  'USPTO payload should contain the selected query phrase'
)

const candidates = normalizeTrademarkCandidates({
  hits: {
    hits: [{
      _source: {
        wordmark: 'BLUE MOON',
        serialNumber: '90000001',
        registrationNumber: '5000001',
        ownerName: 'Blue Moon Brewing Company',
        markStatus: 'LIVE',
        goodsAndServices: 'Beer; ale; lager.',
        markDrawingCode: '3',
        designSearchCode: ['01.11.25'],
      },
      _score: 17.5,
    }],
  },
}, 3)

assert.deepStrictEqual(candidates, [{
  wordmark: 'BLUE MOON',
  serialNumber: '90000001',
  registrationNumber: '5000001',
  ownerName: 'Blue Moon Brewing Company',
  status: 'LIVE',
  goodsAndServices: 'Beer; ale; lager.',
  markDrawingCode: '3',
  designSearchCode: ['01.11.25'],
  score: 17.5,
  markImageUrl: 'https://tsdr.uspto.gov/img/90000001/large',
  sourceUrl: 'https://tsdr.uspto.gov/#caseNumber=90000001&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch',
}], 'USPTO candidates should normalize source fields for AI and PDF use')
