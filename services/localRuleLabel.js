const LOCAL_RULE_PREFIX = '[本地规则]'

function withLocalRulePrefix(value) {
  const text = String(value || '').trim()
  if (!text) return LOCAL_RULE_PREFIX
  if (text.indexOf(LOCAL_RULE_PREFIX) === 0) return text
  return `${LOCAL_RULE_PREFIX} ${text}`
}

function markFirstListItem(items, fallbackText) {
  const nextItems = Array.isArray(items) ? items.slice() : []

  if (nextItems.length) {
    nextItems[0] = withLocalRulePrefix(nextItems[0])
    return nextItems
  }

  return [withLocalRulePrefix(fallbackText)]
}

module.exports = {
  LOCAL_RULE_PREFIX,
  withLocalRulePrefix,
  markFirstListItem,
}
