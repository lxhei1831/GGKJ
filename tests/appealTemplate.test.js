const assert = require('assert')

const {
  REQUIRED_APPEAL_FIELDS,
  validateAppealForm,
  buildPlatformAppealTemplate,
} = require('../services/appealTemplate')

const completeForm = {
  noticeNo: 'CASE-20260707',
  shopName: 'GGKJ Store',
  complaintReason: '平台提示商品图片存在疑似版权或商标争议',
  rectification: '已立即下架相关内容，替换争议素材，并完成内部复核',
  evidence: '原创设计源文件、供应商授权说明、整改前后截图',
  contact: 'compliance@example.com',
}

assert.deepStrictEqual(
  REQUIRED_APPEAL_FIELDS.map((field) => field.key),
  ['noticeNo', 'shopName', 'complaintReason', 'rectification', 'evidence', 'contact'],
  'appeal form should require only the agreed user-completed fields'
)

assert.strictEqual(
  validateAppealForm(Object.assign({}, completeForm, { evidence: '' })).missingField,
  '证据材料说明',
  'validation should ask the user to complete missing required information before generation'
)

assert.strictEqual(
  validateAppealForm(completeForm).valid,
  true,
  'complete appeal form should pass validation'
)

const template = buildPlatformAppealTemplate('Amazon', completeForm)

assert(template.includes('Amazon平台审核团队'), 'template should address the selected platform')
assert(template.includes('CASE-20260707'), 'template should include the complaint or notice number')
assert(template.includes('GGKJ Store'), 'template should include the shop name')
assert(template.includes('已立即下架相关内容'), 'template should include rectification actions')
assert(template.includes('原创设计源文件'), 'template should include evidence description')
assert(template.includes('compliance@example.com'), 'template should include contact information')
assert(template.includes('请协助重新审核'), 'template should include a direct review request')
assert(!template.includes('产品链接'), 'template should not include a product link section')
assert(!template.toLowerCase().includes('http'), 'template should not include URLs')
