const https = require('https')

const USPTO_SEARCH_URL = 'https://tmsearch.uspto.gov/prod-v1-0-0/tmsearch'
const DEFAULT_LIMIT = 6
const DEFAULT_TIMEOUT_MS = 12000
const TRADEMARK_IMAGE_SOURCE_LABEL = 'USPTO/TSDR official record image'
const GENERIC_PRODUCT_WORDS = new Set([
  'logo',
  'bottle',
  'cup',
  'mug',
  'shirt',
  'tshirt',
  't-shirt',
  'shoe',
  'shoes',
  'phone',
  'case',
  'cover',
  'holder',
  'bag',
  'toy',
  'travel',
  'running',
  'product',
  'style',
  'badge',
  'label',
])

function shouldSearchUspto(input) {
  const countryRegion = String(input && input.countryRegion || '').toLowerCase()
  return countryRegion.includes('美国') ||
    countryRegion.includes('united states') ||
    countryRegion === 'us' ||
    countryRegion === 'usa'
}

function buildTrademarkSearchTerms(input) {
  const source = input || {}
  const phrases = []
  const explicitMarks = []

  addMany(explicitMarks, source.extractedMarks)
  addMany(explicitMarks, source.trademarkSignals && source.trademarkSignals.wordMarks)
  addMany(explicitMarks, source.trademarkSignals && source.trademarkSignals.searchTerms)
  addMany(phrases, explicitMarks)
  if (!explicitMarks.length) {
    addMany(phrases, extractBrandLikeTitlePhrases(source.productTitle))
  }
  addPhrase(phrases, source.productTitle)
  addMany(phrases, splitLoosePhrases(source.keywordText))
  addMany(phrases, splitLoosePhrases(source.copyText))
  addPhrase(phrases, source.caseBrand)
  addPhrase(phrases, source.category)

  return uniquePhrases(phrases).slice(0, 8)
}

function buildUsptoSearchPayload(terms, options) {
  const limit = Math.max(1, Math.min(20, Number(options && options.limit) || DEFAULT_LIMIT))
  const should = uniquePhrases(terms || []).flatMap((term) => ([
    { match: { wordmark: { query: term, boost: 5 } } },
    { match: { wordmarkPseudoText: { query: term, boost: 4 } } },
    { match: { markDescription: { query: term, boost: 2 } } },
    { match: { goodsAndServices: { query: term, boost: 1 } } },
  ]))

  return {
    query: {
      bool: {
        should: should.length ? should : [{ match_all: {} }],
        minimum_should_match: should.length ? 1 : 0,
      },
    },
    from: 0,
    size: limit,
    track_total_hits: true,
  }
}

async function searchUsptoTrademarks(input, options) {
  if (!shouldSearchUspto(input)) {
    return {
      terms: [],
      candidates: [],
      warnings: [],
    }
  }

  const terms = buildTrademarkSearchTerms(input)
  if (!terms.length) {
    return {
      terms,
      candidates: [],
      warnings: ['未提取到可用于 USPTO 检索的商标词或图形描述。'],
    }
  }

  const config = options || {}
  const queryTerms = terms.slice(0, Number(config.termLimit) || 3)
  const limit = Number(config.limit) || DEFAULT_LIMIT
  const warnings = []

  try {
    const responses = await Promise.all(queryTerms.map((term) => {
      const payload = buildUsptoSearchPayload([term], { limit })
      return postUsptoSearch(payload, config)
    }))

    const candidates = rankTrademarkCandidates(dedupeCandidates(responses.flatMap((response) => (
      normalizeTrademarkCandidates(response, limit)
    ))), terms)
      .filter(hasCandidateEvidence)
      .slice(0, limit)

    if (!candidates.length) {
      warnings.push('USPTO 未返回包含序列号、权利人、商品服务或官方图像的可靠候选记录。')
    }

    return {
      terms,
      candidates,
      warnings,
    }
  } catch (error) {
    warnings.push(`USPTO 检索暂时失败：${error.message || 'unknown error'}`)
    return {
      terms,
      candidates: [],
      warnings,
    }
  }
}

function normalizeTrademarkCandidates(response, limit) {
  const hits = response && response.hits && Array.isArray(response.hits.hits)
    ? response.hits.hits
    : []

  return hits.slice(0, limit || DEFAULT_LIMIT).map((hit) => {
    const source = hit.source || hit._source || {}
    const serialNumber = firstValue(source.serialNumber || source.serial || source.id)
    const registrationNumber = firstValue(source.registrationNumber || source.registrationId)
    const ownerName = firstValue(source.ownerName || source.ownerFullText)
    const goodsAndServices = joinValues(source.goodsAndServices)
    const status = firstValue(source.markStatus || source.statusDescription) ||
      (source.alive === true ? 'LIVE' : source.alive === false ? 'DEAD' : '')
    const designSearchCode = normalizeArray(
      source.designSearchCode ||
      source.designCodeDescription ||
      splitCommaList(source.designCode)
    )

    const markImageUrl = serialNumber ? buildTsdrPublicImageUrl(serialNumber) : ''
    const markImageSources = markImageUrl
      ? [{
          label: TRADEMARK_IMAGE_SOURCE_LABEL,
          trust: 'official-public',
          url: markImageUrl,
        }]
      : []

    return {
      wordmark: firstValue(source.wordmark || source.markName),
      serialNumber,
      registrationNumber,
      ownerName,
      status,
      goodsAndServices,
      markDrawingCode: String(firstValue(source.markDrawingCode || source.drawingCode) || ''),
      designSearchCode,
      score: typeof hit.score === 'number' ? hit.score : hit._score,
      markImageUrl,
      markImageSourceLabel: markImageUrl ? TRADEMARK_IMAGE_SOURCE_LABEL : '',
      markImageSourceTrust: markImageUrl ? 'official-public' : '',
      markImageSources,
      sourceUrl: serialNumber ? buildTsdrSourceUrl(serialNumber) : '',
    }
  }).filter((candidate) => candidate.wordmark || candidate.serialNumber)
}

function rankTrademarkCandidates(candidates, terms) {
  const searchTerms = uniquePhrases(terms || [])
  return (candidates || []).slice().sort((left, right) => (
    scoreCandidate(right, searchTerms) - scoreCandidate(left, searchTerms)
  ))
}

function hasCandidateEvidence(candidate) {
  if (!candidate) return false
  return Boolean(
    String(candidate.serialNumber || '').trim() ||
    String(candidate.registrationNumber || '').trim() ||
    String(candidate.ownerName || '').trim() ||
    String(candidate.goodsAndServices || '').trim() ||
    String(candidate.markImageUrl || '').trim() ||
    String(candidate.sourceUrl || '').trim()
  )
}

function scoreCandidate(candidate, terms) {
  const status = String(candidate.status || '').toUpperCase()
  const wordmark = String(candidate.wordmark || '')
  const goods = String(candidate.goodsAndServices || '')
  const drawingCode = String(candidate.markDrawingCode || '')
  const score = Number(candidate.score) || 0

  let rank = 0
  if (/REGISTERED|LIVE|ACTIVE|PUBLISHED|PENDING/.test(status)) rank += 45
  if (/ABANDONED|CANCELLED|DEAD|EXPIRED/.test(status)) rank -= 35
  rank += bestWordmarkMatchScore(wordmark, terms)
  if (Array.isArray(candidate.designSearchCode) && candidate.designSearchCode.length) rank += 12
  if (drawingCode && drawingCode !== '4') rank += 8
  rank += goodsMatchScore(goods, terms)
  rank += Math.min(12, Math.max(0, score / 12))

  return rank
}

function bestWordmarkMatchScore(wordmark, terms) {
  const mark = normalizeForMatch(wordmark)
  if (!mark) return 0

  return Math.max(0, ...terms.map((term) => {
    const query = normalizeForMatch(term)
    if (!query) return 0
    if (mark === query) return 170
    if (mark.startsWith(`${query} `)) return 65
    if (mark.includes(` ${query} `) || mark.endsWith(` ${query}`)) return 36
    if (query.includes(mark)) {
      return mark.length > 4 ? 22 : 8
    }
    if (mark.includes(query)) {
      return mark.length > 4 && query.length > 4 ? 34 : 12
    }

    const markTokens = tokenizeForMatch(mark)
    const queryTokens = tokenizeForMatch(query).filter((token) => !GENERIC_PRODUCT_WORDS.has(token))
    if (!queryTokens.length) return 0
    const overlap = queryTokens.filter((token) => markTokens.includes(token)).length
    return Math.round((overlap / queryTokens.length) * 30)
  }))
}

function goodsMatchScore(goods, terms) {
  const text = normalizeForMatch(goods)
  if (!text) return 0
  const tokens = terms.flatMap((term) => tokenizeForMatch(term))
    .filter((token) => token.length > 2 && !GENERIC_PRODUCT_WORDS.has(token))
  const overlap = uniquePhrases(tokens).filter((token) => text.includes(token)).length
  return Math.min(10, overlap * 3)
}

function postUsptoSearch(payload, options) {
  const url = new URL(USPTO_SEARCH_URL)
  const timeout = Number(options && options.timeout) || DEFAULT_TIMEOUT_MS
  const data = JSON.stringify(payload)

  return new Promise((resolve, reject) => {
    const req = https.request({
      method: 'POST',
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        origin: 'https://tmsearch.uspto.gov',
        referer: 'https://tmsearch.uspto.gov/search/search-information',
        'user-agent': 'Mozilla/5.0 (compatible; GGKJ-IP-Risk/1.0)',
        'content-length': Buffer.byteLength(data),
      },
      timeout,
    }, (res) => {
      let raw = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        raw += chunk
      })
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`USPTO status ${res.statusCode}`))
          return
        }

        try {
          resolve(raw ? JSON.parse(raw) : {})
        } catch (error) {
          reject(new Error('USPTO returned non-JSON response'))
        }
      })
    })

    req.on('timeout', () => {
      req.destroy(new Error('USPTO request timed out'))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function buildTsdrSourceUrl(serialNumber) {
  return `https://tsdr.uspto.gov/#caseNumber=${encodeURIComponent(serialNumber)}&caseSearchType=US_APPLICATION&caseType=DEFAULT&searchType=statusSearch`
}

function buildTsdrPublicImageUrl(serialNumber) {
  return `https://tsdr.uspto.gov/img/${encodeURIComponent(serialNumber)}/large`
}

function extractBrandLikeTitlePhrases(value) {
  const words = cleanPhrase(value)
    .split(/\s+/)
    .filter(Boolean)
  const brandWords = []

  for (const word of words) {
    const normalized = normalizeForMatch(word)
    if (!normalized || GENERIC_PRODUCT_WORDS.has(normalized)) break
    brandWords.push(word)
    if (brandWords.length >= 3) break
  }

  const phrases = []
  if (brandWords.length >= 2) phrases.push(brandWords.slice(0, 2).join(' '))
  if (brandWords.length >= 1) phrases.push(brandWords[0])
  return phrases
}

function addMany(target, values) {
  normalizeArray(values).forEach((value) => addPhrase(target, value))
}

function addPhrase(target, value) {
  const phrase = cleanPhrase(value)
  if (phrase) target.push(phrase)
}

function splitLoosePhrases(value) {
  return String(value || '')
    .split(/[,;，；\n\r]+/)
    .map(cleanPhrase)
    .filter(Boolean)
}

function uniquePhrases(values) {
  const seen = new Set()
  const result = []

  normalizeArray(values).forEach((value) => {
    const phrase = cleanPhrase(value)
    const key = phrase.toLowerCase()
    if (phrase && !seen.has(key)) {
      seen.add(key)
      result.push(phrase)
    }
  })

  return result
}

function cleanPhrase(value) {
  return String(value || '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function normalizeForMatch(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeForMatch(value) {
  return normalizeForMatch(value)
    .split(/\s+/)
    .filter(Boolean)
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined)
  if (value === null || value === undefined || value === '') return []
  return [value]
}

function firstValue(value) {
  const values = normalizeArray(value)
  return values.length ? String(values[0] || '').trim() : ''
}

function joinValues(value) {
  return normalizeArray(value)
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('\n')
}

function splitCommaList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function dedupeCandidates(candidates) {
  const seen = new Set()
  const result = []

  candidates.forEach((candidate) => {
    const key = candidate.serialNumber || candidate.registrationNumber || candidate.wordmark
    if (key && !seen.has(key)) {
      seen.add(key)
      result.push(candidate)
    }
  })

  return result
}

module.exports = {
  USPTO_SEARCH_URL,
  shouldSearchUspto,
  buildTrademarkSearchTerms,
  buildUsptoSearchPayload,
  searchUsptoTrademarks,
  normalizeTrademarkCandidates,
  rankTrademarkCandidates,
  hasCandidateEvidence,
}
