const assert = require('assert')

const {
  buildLocalTroAdvice,
  generateTroAdvice,
} = require('../services/troAdvice')

async function run() {
  const form = {
    caseNo: '24-cv-12345',
    brand: 'Disney',
    freezeAmount: '30000',
  }

  const localResult = buildLocalTroAdvice('Amazon', form)
  assert(!localResult.title.startsWith('[本地规则]'), 'plain local helper should not add fallback labels by itself')
  assert.strictEqual(localResult.level, 'high', 'local TRO scoring should still detect high-risk cases')

  let taskName = null
  const aiResult = await generateTroAdvice('Amazon', form, {
    aiClient(task, input) {
      taskName = task
      assert.strictEqual(input.platform, 'Amazon', 'TRO AI input should include the selected platform')
      assert.strictEqual(input.brand, 'Disney', 'TRO AI input should include the plaintiff brand')
      return Promise.resolve({
        title: '建议立即准备和解与异议材料',
        desc: 'Amazon / AI评估风险分 88',
        level: 'high',
        levelText: '高风险',
        actions: ['整理法院文件和平台通知。'],
      })
    },
  })

  assert.strictEqual(taskName, 'tro_advice', 'TRO advice should use the shared AI task name')
  assert.strictEqual(aiResult.title, '建议立即准备和解与异议材料', 'AI result should be used when the model succeeds')
  assert(!aiResult.title.startsWith('[本地规则]'), 'successful AI result should not be marked as local rules')

  const fallbackResult = await generateTroAdvice('Amazon', form, {
    aiClient() {
      return Promise.reject(new Error('model unavailable'))
    },
  })

  assert(fallbackResult.title.startsWith('[本地规则]'), 'TRO fallback title should start with the local-rule marker')
  assert.strictEqual(fallbackResult.modelFallback, true, 'TRO fallback should expose modelFallback for diagnostics')
  assert(Array.isArray(fallbackResult.actions), 'TRO fallback should still include action suggestions')
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
