const REQUIRED_APPEAL_FIELDS = [
  { key: 'noticeNo', label: '投诉编号/通知编号' },
  { key: 'shopName', label: '店铺名称' },
  { key: 'complaintReason', label: '被投诉原因' },
  { key: 'rectification', label: '已整改动作' },
  { key: 'evidence', label: '证据材料说明' },
  { key: 'contact', label: '联系方式' },
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
  const targetPlatform = cleanText(platform) || '平台'
  const normalizedForm = normalizeAppealForm(form)

  return [
    `${targetPlatform}平台审核团队：`,
    '',
    `您好，我们是${normalizedForm.shopName}。关于贵平台通知/投诉编号 ${normalizedForm.noticeNo}，我们已第一时间完成内部核查。`,
    '',
    `一、情况说明`,
    `本次被投诉或审核提示的原因是：${normalizedForm.complaintReason}。我们理解平台对知识产权、商品合规和消费者体验的审核要求，并已针对该问题进行处理。`,
    '',
    `二、整改动作`,
    `${normalizedForm.rectification}。后续我们会继续加强上架前审核，避免类似问题再次发生。`,
    '',
    `三、证据材料`,
    `我们可提供或已准备的材料包括：${normalizedForm.evidence}。如平台需要进一步补充材料，我们会积极配合提交。`,
    '',
    `四、处理请求`,
    `请协助重新审核本次投诉/通知事项，并根据我们已完成的整改情况恢复相关权限或告知下一步处理要求。`,
    '',
    `联系人/联系方式：${normalizedForm.contact}`,
    '',
    `感谢审核。`,
  ].join('\n')
}

module.exports = {
  REQUIRED_APPEAL_FIELDS,
  validateAppealForm,
  buildPlatformAppealTemplate,
}
