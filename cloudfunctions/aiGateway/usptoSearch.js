const https = require('https')

const USPTO_SEARCH_URL = 'https://tmsearch.uspto.gov/prod-v1-0-0/tmsearch'
const DEFAULT_LIMIT = 6
const DEFAULT_TIMEOUT_MS = 12000

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

  addMany(phrases, source.extractedMarks)
  addMany(phrases, source.trademarkSignals && source.trademarkSignals.wordMarks)
  addMany(phrases, source.trademarkSignals && source.trademarkSignals.searchTerms)
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

    return {
      terms,
      candidates: dedupeCandidates(responses.flatMap((response) => (
        normalizeTrademarkCandidates(response, limit)
      ))).slice(0, limit),
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
      markImageUrl: serialNumber ? `https://tsdr.uspto.gov/img/${encodeURIComponent(serialNumber)}/large` : '',
      sourceUrl: serialNumber ? buildTsdrSourceUrl(serialNumber) : '',
    }
  }).filter((candidate) => candidate.wordmark || candidate.serialNumber)
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
}
