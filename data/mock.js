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
    title: 'Amazon美国站灯串主图复核',
    tag: 'Amazon美国站 / 家居灯串',
    result: '3个SKU主图命中相似外观，律师建议下架2款、重拍1款，避开上架后投诉。',
    steps: ['初筛命中', '律师复核', '换图上架'],
  },
  {
    title: 'Temu饰品Listing关键词清理',
    tag: 'Temu / 饰品Listing',
    result: '批量检测标出2个疑似品牌关键词，律师给出替换词表，发布前完成标题和五点改写。',
    steps: ['批量筛词', '词表替换', '改写发布'],
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
  toolCards,
  profileMenus,
}
