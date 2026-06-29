/* ============================================================
   文创品管理平台 - 配置 & Supabase 客户端初始化
   依赖: supabase-js (CDN)
   ============================================================ */

(function () {
  'use strict';

  // ============ Supabase 配置 ============
  // ⚠️ 部署时请替换为你的 Supabase 项目 URL 和 anon key
  const SUPABASE_URL = 'https://strmjpcqmdswcrktjqzm.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0cm1qcGNxbWRzd2Nya3RqcXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MDc4MDksImV4cCI6MjA5ODI4MzgwOX0.krlje-LRbH01lrDuMEBYB9pTLDwcb_tVdDrtJxeUEzk';

  let supabaseClient = null;

  // 检测是否为占位符配置
  const isPlaceholder = SUPABASE_URL.includes('your-project-id') || SUPABASE_ANON_KEY === 'your-anon-key-here';

  try {
    if (!isPlaceholder && typeof supabase !== 'undefined') {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('[文创品] Supabase 客户端已初始化');
    } else if (isPlaceholder) {
      console.warn('[文创品] 检测到占位符 Supabase 配置，将使用本地模拟数据');
    } else {
      console.warn('[文创品] supabase-js 未加载，将使用本地模拟数据');
    }
  } catch (e) {
    console.warn('[文创品] Supabase 初始化失败:', e.message);
    supabaseClient = null;
  }

  // ============ 常量定义 ============

  /** 产品层级标签映射 */
  const TIER_LABELS = {
    self_designed: '自设计品',
    curated: '严选品',
    general: '泛选品',
  };

  /** 产品层级图标 */
  const TIER_ICONS = {
    self_designed: '🎨',
    curated: '✅',
    general: '🌐',
  };

  /** 状态标签映射 */
  const STATUS_LABELS = {
    active: '正常',
    low_stock: '库存不足',
    out_of_stock: '已售罄',
    pending_review: '待审核',
    approved: '已通过',
    rejected: '已驳回',
    promoted: '已提升',
    archived: '已归档',
  };

  /** 状态颜色映射 */
  const STATUS_COLORS = {
    active: { bg: '#d1fae5', text: '#065f46' },
    low_stock: { bg: '#fef3c7', text: '#92400e' },
    out_of_stock: { bg: '#fee2e2', text: '#991b1b' },
    pending_review: { bg: '#fef3c7', text: '#92400e' },
    approved: { bg: '#d1fae5', text: '#065f46' },
    rejected: { bg: '#fee2e2', text: '#991b1b' },
    promoted: { bg: '#ede9fe', text: '#5b21b6' },
    archived: { bg: '#f1f5f9', text: '#64748b' },
  };

  /** 图表配色 */
  const CHART_COLORS = [
    '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626',
    '#0891b2', '#4f46e5', '#be123c', '#65a30d', '#ca8a04',
  ];

  /** 图片上传限制 */
  const IMAGE_UPLOAD = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    bucket: 'product-images',
  };

  /** 分页大小 */
  const PAGE_SIZE = 20;

  // ============ 模拟数据（Supabase 未配置时使用） ============
  const MOCK_CATEGORIES = [
    { id: 'm1', name: '金属', sort_order: 1 },
    { id: 'm2', name: '纸质', sort_order: 2 },
    { id: 'm3', name: '布艺', sort_order: 3 },
    { id: 'm4', name: '亚克力', sort_order: 4 },
    { id: 'm5', name: '木质', sort_order: 5 },
    { id: 'm6', name: '陶瓷', sort_order: 6 },
    { id: 'm7', name: '皮革', sort_order: 7 },
    { id: 'm8', name: '玻璃', sort_order: 8 },
    { id: 'm9', name: '塑料', sort_order: 9 },
    { id: 'm10', name: '其他', sort_order: 10 },
  ];

  const MOCK_PRODUCTS = [
    {
      id: 'p1', tier: 'self_designed', name: '故宫文创金属书签',
      material_category_id: 'm1', image_url: '', description: '以故宫建筑元素为灵感',
      submitter: '张三', size: '12×3cm', inventory_quantity: 50,
      listed_price: 38.00, cost_price: 15.00, status: 'active',
      created_at: '2026-06-20T08:00:00Z',
    },
    {
      id: 'p2', tier: 'self_designed', name: '国潮纸质笔记本',
      material_category_id: 'm2', image_url: '', description: '封面采用传统纹样设计',
      submitter: '李四', size: 'A5', inventory_quantity: 100,
      listed_price: 25.00, cost_price: 8.00, status: 'active',
      created_at: '2026-06-18T10:00:00Z',
    },
    {
      id: 'p3', tier: 'self_designed', name: '文创帆布包',
      material_category_id: 'm3', image_url: '', description: '环保帆布材质，原创插画印花',
      submitter: '王五', size: '40×35cm', inventory_quantity: 3,
      listed_price: 68.00, cost_price: 28.00, status: 'low_stock',
      created_at: '2026-06-15T14:00:00Z',
    },
    {
      id: 'p4', tier: 'self_designed', name: '透明亚克力钥匙扣',
      material_category_id: 'm4', image_url: '', description: '双面印刷，可定制图案',
      submitter: '张三', size: '5×5cm', inventory_quantity: 200,
      listed_price: 12.00, cost_price: 4.50, status: 'active',
      created_at: '2026-06-22T09:00:00Z',
    },
    {
      id: 'p5', tier: 'curated', name: '复古黄铜印章',
      material_category_id: 'm1', image_url: '', description: '手工雕刻复古风格印章',
      submitter: '李四', reference_price: 88.00,
      source_url: 'https://example.com/source/1', status: 'pending_review',
      created_at: '2026-06-25T11:00:00Z',
    },
    {
      id: 'p6', tier: 'curated', name: '手绘陶瓷杯垫',
      material_category_id: 'm6', image_url: '', description: '景德镇手工绘制陶瓷杯垫',
      submitter: '王五', reference_price: 45.00,
      source_url: 'https://example.com/source/2', status: 'approved',
      created_at: '2026-06-24T16:00:00Z',
    },
    {
      id: 'p7', tier: 'general', name: '竹编书签套装',
      material_category_id: 'm5', image_url: '', description: '传统竹编工艺书签，三枚套装',
      submitter: '赵六', reference_price: 28.00,
      source_url: 'https://example.com/source/3', status: 'active',
      created_at: '2026-06-27T08:00:00Z',
    },
    {
      id: 'p8', tier: 'general', name: '故宫联名丝巾',
      material_category_id: 'm3', image_url: '', description: '故宫博物院联名款真丝方巾',
      submitter: '张三', reference_price: 168.00,
      source_url: 'https://example.com/source/4', status: 'active',
      created_at: '2026-06-28T15:00:00Z',
    },
  ];

  // ============ 导出到全局命名空间 ============
  window.WCM = window.WCM || {};
  Object.assign(window.WCM, {
    config: {
      supabase: supabaseClient,
      SUPABASE_URL,
      TIER_LABELS,
      TIER_ICONS,
      STATUS_LABELS,
      STATUS_COLORS,
      CHART_COLORS,
      IMAGE_UPLOAD,
      PAGE_SIZE,
      isMock: !supabaseClient,
    },
    mock: {
      categories: MOCK_CATEGORIES,
      products: MOCK_PRODUCTS,
    },
  });

  console.log(
    `[文创品] 配置加载完成 |` +
    `后端: ${supabaseClient ? 'Supabase 已连接' : '本地模拟数据'} |` +
    `时间: ${new Date().toLocaleString('zh-CN')}`
  );
})();
