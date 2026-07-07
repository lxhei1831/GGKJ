const assert = require('assert')

const {
  REQUIRED_APPEAL_FIELDS,
  formatAppealTemplateBlocks,
  validateAppealForm,
  buildPlatformAppealTemplate,
} = require('../services/appealTemplate')

const completeForm = {
  caseSummary: 'The listing was flagged for a suspected copyright or trademark issue related to product images.',
  actionTaken: 'We immediately removed the disputed material, replaced the images, and completed an internal compliance review.',
  evidenceReady: 'Original design files, supplier authorization, and before-and-after screenshots are ready for review.',
}

assert.deepStrictEqual(
  REQUIRED_APPEAL_FIELDS.map((field) => field.key),
  ['caseSummary', 'actionTaken', 'evidenceReady'],
  'appeal form should require only three compact user-completed fields'
)

assert.strictEqual(
  validateAppealForm(Object.assign({}, completeForm, { evidenceReady: '' })).missingField,
  '可提供证明材料',
  'validation should ask the user to complete missing required information before generation'
)

assert.strictEqual(
  validateAppealForm(completeForm).valid,
  true,
  'complete appeal form should pass validation'
)

const template = buildPlatformAppealTemplate('Amazon', completeForm)

assert(template.includes('Dear Amazon Review Team,'), 'template should address the selected platform in English')
assert(template.includes('Request for Reconsideration'), 'template should include a professional English subject line')
assert(template.includes('The listing was flagged'), 'template should include the user-provided case summary')
assert(template.includes('We immediately removed'), 'template should include rectification actions')
assert(template.includes('Original design files'), 'template should include evidence description')
assert(template.includes('respectfully request a manual reconsideration'), 'template should include a persuasive review request')
assert(template.includes('Sincerely,'), 'template should include a formal English closing')
assert(!/[一二三四]、/.test(template), 'template should not use Chinese numbered sections')
assert(!template.includes('您好'), 'template should not include Chinese greeting text')
assert(!template.includes('产品链接'), 'template should not include a product link section')
assert(!template.toLowerCase().includes('http'), 'template should not include URLs')

const blocks = formatAppealTemplateBlocks(template)

assert(blocks.length >= 8, 'formatted template should expose every visible letter section')
assert.deepStrictEqual(
  blocks.map((block) => block.id),
  blocks.map((_, index) => `template-block-${index}`),
  'formatted template blocks should have stable ids for rendering'
)
assert.strictEqual(blocks[0].type, 'salutation', 'first block should render as the letter salutation')
assert.strictEqual(blocks[1].type, 'subject', 'subject block should be visually distinguishable')
assert.strictEqual(blocks[blocks.length - 1].type, 'closing', 'final block should render as the formal closing')
assert(blocks.every((block) => block.content.trim()), 'formatted template blocks should not include blank visual rows')
assert(blocks.some((block) => block.content.includes('manual reconsideration')), 'formatted blocks should preserve complete template content')
