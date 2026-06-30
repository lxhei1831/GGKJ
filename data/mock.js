const dashboardMetrics = [
  { label: '高危品牌', value: '128', change: '今日新增 9 个', level: 'high' },
  { label: '高危关键词', value: '2,460', change: '近 7 日更新', level: 'medium' },
  { label: '近期TRO案件', value: '36', change: '重点关注 11 件', level: 'high' },
]

const quickActions = [
  { title: '产品快速检测', desc: '链接、标题、图片与类目综合评估', mode: 'product', tone: 'teal' },
  { title: '图片快速检测', desc: 'Logo、IP角色、图案和外观元素识别', mode: 'image', tone: 'blue' },
  { title: '关键词快速检测', desc: '商标词、品牌词、IP词和TRO词筛查', mode: 'keyword', tone: 'amber' },
  { title: '店铺批量检测', desc: 'Excel批量导入，输出分级处理建议', mode: 'batch', tone: 'slate' },
]

const successCases = [
  {
    id: 'amazon-light-string-image-review',
    title: 'Amazon美国站灯串主图复核',
    tag: 'Amazon美国站 / 家居灯串',
    result: '3个SKU主图命中相似外观，律师建议下架2款、重拍1款，避开上架后投诉。',
    steps: ['初筛命中', '律师复核', '换图上架'],
    overview: {
      seller: '匿名家居类卖家',
      scene: '新品上架前主图复核',
      riskType: '外观专利与图片相似风险',
      material: '3个灯串SKU、6张主图、竞品链接截图',
    },
    finding: {
      title: '主图角度和灯罩装饰元素相似',
      detail: '小程序检测发现2张主图与同类在售款构图接近，灯罩轮廓、挂线角度和场景布置容易被平台投诉材料引用。',
      evidence: ['主图构图相似', '灯罩轮廓接近', '详情页卖点引用同类表达'],
    },
    lawyerReview: {
      title: '律师按外观近似和投诉材料完整度复核',
      detail: '律师复核后认为其中2款继续使用原主图风险偏高，建议先下架对应素材；另1款通过重拍角度、删除对比性卖点后可继续上架前复查。',
      actions: ['下架2款高相似主图', '重拍1款产品图', '保留供应链和拍摄底稿'],
    },
    process: [
      { stage: '提交检测', desc: '卖家上传3个SKU链接、主图和目标市场。' },
      { stage: '初筛命中', desc: '系统标记主图构图、外观元素和描述语的相似点。' },
      { stage: '律师复核', desc: '律师结合平台投诉习惯判断证据链是否容易成立。' },
      { stage: '调整素材', desc: '下架高相似图片，重拍角度并改写容易被引用的卖点。' },
      { stage: '复查上架', desc: '重新检测后保留合规记录，再进入上架流程。' },
    ],
    outcome: '卖家没有直接带风险素材上架，提前完成图片替换和证据留存，降低后续平台投诉、链接下架和申诉被动风险。',
    professionalTips: [
      '外观风险不只看产品本体，也要看主图角度、装饰元素和场景化构图。',
      '上架前保存原始拍摄文件、供应链凭证和修改记录，后续申诉会更有材料基础。',
    ],
  },
  {
    id: 'temu-jewelry-keyword-cleanup',
    title: 'Temu饰品Listing关键词清理',
    tag: 'Temu / 饰品Listing',
    result: '批量检测标出2个疑似品牌关键词，律师给出替换词表，发布前完成标题和五点改写。',
    steps: ['批量筛词', '词表替换', '改写发布'],
    overview: {
      seller: '匿名饰品类卖家',
      scene: '批量发布前关键词复核',
      riskType: '商标词与TRO高危词风险',
      material: '28条Listing标题、五点描述和Search Terms',
    },
    finding: {
      title: '标题和Search Terms中出现疑似品牌词',
      detail: '批量检测在2条Listing里标出疑似品牌关键词，并发现部分描述使用“同款”“风格款”等容易形成关联的表达。',
      evidence: ['疑似品牌关键词', 'Search Terms重复命中', '关联性描述偏强'],
    },
    lawyerReview: {
      title: '律师按商标使用方式和平台审核口径复核',
      detail: '律师确认相关词不宜作为标题卖点或搜索词使用，建议改成材质、场景、尺寸等中性描述，并保留替换前后的版本记录。',
      actions: ['删除疑似品牌词', '替换为中性属性词', '同步改写标题和五点'],
    },
    process: [
      { stage: '导入表格', desc: '卖家上传批量Listing表，包含标题、五点和关键词字段。' },
      { stage: '批量筛词', desc: '系统标记疑似品牌词、TRO高危词和关联性表达。' },
      { stage: '律师标注', desc: '律师区分必须删除、建议替换和可保留的表达。' },
      { stage: '词表替换', desc: '将品牌联想词替换成材质、尺寸、使用场景等中性词。' },
      { stage: '发布复查', desc: '发布前再次检测，确认标题和搜索词没有重复命中。' },
    ],
    outcome: '卖家在发布前完成关键词清理，避免把疑似品牌词带入标题、五点和搜索词，减少后续TRO投诉或平台审核拦截风险。',
    professionalTips: [
      '关键词风险常同时出现在标题、五点和Search Terms，不能只检查前台可见标题。',
      '替换词应回到材质、规格、适用场景，不建议使用“同款”“明星风”等暗示性表达。',
    ],
  },
]

const detectionModes = [
  { key: 'product', label: '产品链接', mark: '链', desc: '链接、标题、品牌词、类目、TRO历史' },
  { key: 'image', label: '图片识别', mark: '图', desc: 'Logo、IP角色、名人肖像、POD图案' },
  { key: 'keyword', label: '关键词', mark: '词', desc: '商标词、品牌词、IP词、高危TRO词' },
  { key: 'copy', label: '文案版权', mark: '文', desc: '详情页、广告文案、A+页面版权风险' },
  { key: 'patent', label: '外观专利', mark: '外', desc: '产品图片外观专利相似度' },
  { key: 'batch', label: '批量检测', mark: '批', desc: '上传Excel批量输出风险分层' },
]

const platforms = ['Amazon', 'Temu', 'TikTok Shop', 'eBay', 'Walmart', 'Shopify']

const countryRegions = [
  '美国',
  '欧盟',
  '英国',
  '加拿大',
  '澳大利亚',
  '日本',
  '韩国',
  '东南亚',
  '中国香港',
]

const aiAgents = [
  '商标风险助手',
  '图片侵权助手',
  '外观专利助手',
  'Listing优化助手',
  'TRO案件分析助手',
  '英文申诉信助手',
  '平台规则助手',
  '跨境合规问答助手',
]

const troModules = [
  { title: 'TRO案件自查', desc: '平台、案件号、原告品牌、冻结金额综合判断' },
  { title: '案件号查询', desc: '展示案件详情、冻结金额、风险等级和建议' },
  { title: '冻结金额评估', desc: '根据销售额、产品数量、初犯情况预估和解区间' },
  { title: '律师对接', desc: '材料审核、预约律师、跟踪案件进度' },
]

const troChecklist = [
  '法院文件或平台通知',
  'PayPal/Stripe冻结截图',
  '涉案产品销售记录',
  '店铺主体与联系方式',
  '已下架或整改证明',
]

const toolCards = [
  { title: '被投诉申诉', desc: '生成平台申诉方案与材料清单' },
  { title: '平台投诉模板', desc: 'Amazon、Temu、TikTok Shop、eBay中英文模板' },
  { title: '盗图检测', desc: '原创图片盗用检测与投诉材料生成' },
  { title: '跟卖监控', desc: '监控价格、图片、标题复制情况' },
  { title: '英文申诉信助手', desc: '平台邮件、律师函回复和证据说明' },
  { title: '知识产权服务', desc: '商标注册、版权登记、外观专利和品牌备案' },
]

const profileMenus = [
  { title: '我的检测记录', desc: '查看历史检测、风险等级和报告' },
  { title: '我的风险报告', desc: 'PDF/Excel报告查看、分享和下载' },
  { title: '我的TRO案件', desc: '案件状态、下一步动作和截止时间' },
  { title: '我的订单', desc: '单次检测、会员订阅和律师服务订单' },
  { title: '消息通知', desc: '检测结果、TRO预警和投诉进度提醒' },
  { title: '账号设置', desc: '手机号、邮箱、密码与安全设置' },
]

module.exports = {
  dashboardMetrics,
  quickActions,
  successCases,
  detectionModes,
  platforms,
  countryRegions,
  aiAgents,
  troModules,
  troChecklist,
  toolCards,
  profileMenus,
}
