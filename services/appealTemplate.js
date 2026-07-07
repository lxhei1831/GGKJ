const REQUIRED_APPEAL_FIELDS = [
  {
    key: 'caseSummary',
    label: '平台通知/处罚原因',
    placeholder: '例如：图片版权争议、商标误判、商品合规提示',
  },
  {
    key: 'actionTaken',
    label: '已完成整改动作',
    placeholder: '例如：已下架争议内容，替换图片并完成内部复核',
  },
  {
    key: 'evidenceReady',
    label: '可提供证明材料',
    placeholder: '例如：原创文件、授权证明、整改前后截图',
  },
]

function cleanText(value) {
  return String(value || '').trim()
}

function normalizeAppealForm(form) {
  return REQUIRED_APPEAL_FIELDS.reduce((nextForm, field) => {
    nextForm[field.key] = cleanText(form && form[field.key])
    return nextForm
  }, {})
}

function validateAppealForm(form) {
  const normalizedForm = normalizeAppealForm(form)
  const missing = REQUIRED_APPEAL_FIELDS.find((field) => !normalizedForm[field.key])

  if (missing) {
    return {
      valid: false,
      missingKey: missing.key,
      missingField: missing.label,
      form: normalizedForm,
    }
  }

  return {
    valid: true,
    form: normalizedForm,
  }
}

function buildPlatformAppealTemplate(platform, form) {
  const targetPlatform = cleanText(platform) || 'Platform'
  const normalizedForm = normalizeAppealForm(form)

  return [
    `Dear ${targetPlatform} Review Team,`,
    '',
    `Subject: Request for Reconsideration and Compliance Review`,
    '',
    `We are writing to respectfully request a manual reconsideration of the recent enforcement action or complaint notice. We fully understand and respect the policies of ${targetPlatform} regarding intellectual property protection, listing accuracy, product compliance, and customer trust.`,
    '',
    `Case summary: ${normalizedForm.caseSummary}`,
    '',
    `Corrective actions taken: ${normalizedForm.actionTaken}`,
    '',
    `Supporting evidence available: ${normalizedForm.evidenceReady}`,
    '',
    `Based on the actions above, we believe the issue has been addressed in good faith and in a manner consistent with platform compliance expectations. We have strengthened our internal review process to prevent similar concerns from occurring again, including additional pre-listing checks, evidence retention, and escalation review for potentially sensitive content.`,
    '',
    `We respectfully request a manual reconsideration of this matter and ask that the affected listing, account function, or enforcement status be reviewed again in light of the corrective measures and supporting documentation. If any additional information is required, we will provide it promptly and cooperate fully with the review process.`,
    '',
    `Thank you for your time and careful consideration.`,
    '',
    `Sincerely,`,
    `Compliance Team`,
  ].join('\n')
}

function getTemplateBlockType(content, index) {
  if (index === 0 && content.startsWith('Dear ')) {
    return 'salutation'
  }

  if (content.startsWith('Subject:')) {
    return 'subject'
  }

  if (content.startsWith('Sincerely,')) {
    return 'closing'
  }

  return 'paragraph'
}

function formatAppealTemplateBlocks(template) {
  return cleanText(template)
    .split(/\n\s*\n/)
    .map((content) => cleanText(content))
    .filter(Boolean)
    .map((content, index) => ({
      id: `template-block-${index}`,
      type: getTemplateBlockType(content, index),
      content,
    }))
}

module.exports = {
  REQUIRED_APPEAL_FIELDS,
  formatAppealTemplateBlocks,
  validateAppealForm,
  buildPlatformAppealTemplate,
}
