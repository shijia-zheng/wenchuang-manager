/* ============================================================
   文创品管理平台 - API 层（Supabase 数据库操作）
   依赖: config.js
   ============================================================ */

(function () {
  'use strict';

  const api = {};
  const cfg = window.WCM.config;

  // ============ 内部辅助 ============

  /** 判断是否使用模拟数据 */
  function isMock() {
    return cfg.isMock || !cfg.supabase;
  }

  // ============ 材质分类 API ============

  /** 获取所有材质分类 */
  api.fetchCategories = async function () {
    if (isMock()) {
      return [...window.WCM.mock.categories];
    }
    const { data, error } = await cfg.supabase
      .from('material_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data;
  };

  /** 创建材质分类 */
  api.createCategory = async function (name) {
    if (isMock()) {
      const cat = {
        id: 'm' + Date.now(),
        name: name,
        sort_order: window.WCM.mock.categories.length + 1,
        created_at: new Date().toISOString(),
      };
      window.WCM.mock.categories.push(cat);
      return cat;
    }
    const { data, error } = await cfg.supabase
      .from('material_categories')
      .insert({ name: name })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  /** 删除材质分类 */
  api.deleteCategory = async function (id) {
    if (isMock()) {
      const idx = window.WCM.mock.categories.findIndex(c => c.id === id);
      if (idx !== -1) window.WCM.mock.categories.splice(idx, 1);
      return true;
    }
    const { error } = await cfg.supabase
      .from('material_categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  };

  // ============ 产品 API ============

  /** 构建产品查询 */
  function buildProductQuery(tier, filters) {
    let mockProducts = [...window.WCM.mock.products];
    if (tier && tier !== 'all') {
      mockProducts = mockProducts.filter(p => p.tier === tier);
    }
    if (filters) {
      if (filters.materialId) {
        mockProducts = mockProducts.filter(p => p.material_category_id === filters.materialId);
      }
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        mockProducts = mockProducts.filter(p =>
          p.name.toLowerCase().includes(term) ||
          (p.description && p.description.toLowerCase().includes(term)) ||
          (p.submitter && p.submitter.toLowerCase().includes(term))
        );
      }
      if (filters.status) {
        mockProducts = mockProducts.filter(p => p.status === filters.status);
      }
      if (filters.sortBy) {
        const sortMap = {
          newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
          oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at),
          name_asc: (a, b) => a.name.localeCompare(b.name, 'zh'),
          price_asc: (a, b) => (a.listed_price || a.reference_price || 0) - (b.listed_price || b.reference_price || 0),
          price_desc: (a, b) => (b.listed_price || b.reference_price || 0) - (a.listed_price || a.reference_price || 0),
          stock_asc: (a, b) => (a.inventory_quantity || 0) - (b.inventory_quantity || 0),
        };
        mockProducts.sort(sortMap[filters.sortBy] || sortMap.newest);
      }
    }
    return mockProducts;
  }

  /** 获取产品列表 */
  api.fetchProducts = async function (tier, filters) {
    if (isMock()) {
      // 模拟网络延迟
      await new Promise(r => setTimeout(r, 200));
      return buildProductQuery(tier, filters);
    }

    let query = cfg.supabase.from('products').select(`
      *,
      material_category:material_category_id (id, name)
    `);

    if (tier && tier !== 'all') {
      query = query.eq('tier', tier);
    }
    if (filters) {
      if (filters.materialId) {
        query = query.eq('material_category_id', filters.materialId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.searchTerm) {
        query = query.or(`name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
      }
      // 排序
      const sortMap = {
        newest: { column: 'created_at', ascending: false },
        oldest: { column: 'created_at', ascending: true },
        name_asc: { column: 'name', ascending: true },
        stock_asc: { column: 'inventory_quantity', ascending: true },
      };
      const sort = sortMap[filters.sortBy] || sortMap.newest;
      query = query.order(sort.column, { ascending: sort.ascending });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  /** 获取单个产品 */
  api.fetchProductById = async function (id) {
    if (isMock()) {
      return window.WCM.mock.products.find(p => p.id === id) || null;
    }
    const { data, error } = await cfg.supabase
      .from('products')
      .select('*, material_category:material_category_id (id, name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  };

  /** 创建产品 */
  api.createProduct = async function (productData) {
    if (isMock()) {
      const product = {
        id: 'p' + Date.now(),
        ...productData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      window.WCM.mock.products.unshift(product);
      return product;
    }
    const { data, error } = await cfg.supabase
      .from('products')
      .insert(productData)
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  /** 更新产品 */
  api.updateProduct = async function (id, productData) {
    if (isMock()) {
      const idx = window.WCM.mock.products.findIndex(p => p.id === id);
      if (idx !== -1) {
        window.WCM.mock.products[idx] = {
          ...window.WCM.mock.products[idx],
          ...productData,
          updated_at: new Date().toISOString(),
        };
        return window.WCM.mock.products[idx];
      }
      return null;
    }
    const { data, error } = await cfg.supabase
      .from('products')
      .update({ ...productData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  /** 删除产品 */
  api.deleteProduct = async function (id) {
    if (isMock()) {
      const idx = window.WCM.mock.products.findIndex(p => p.id === id);
      if (idx !== -1) window.WCM.mock.products.splice(idx, 1);
      return true;
    }
    const { error } = await cfg.supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  };

  /** 提升产品层级（泛选 -> 严选） */
  api.promoteProduct = async function (id) {
    return api.updateProduct(id, {
      tier: 'curated',
      status: 'pending_review',
    });
  };

  // ============ 仪表盘统计 ============

  /** 获取仪表盘统计数据 */
  api.getDashboardStats = async function () {
    if (isMock()) {
      const products = window.WCM.mock.products;
      const categories = window.WCM.mock.categories;
      return {
        total: products.length,
        byTier: {
          self_designed: products.filter(p => p.tier === 'self_designed').length,
          curated: products.filter(p => p.tier === 'curated').length,
          general: products.filter(p => p.tier === 'general').length,
        },
        byMaterial: categories.map(cat => ({
          name: cat.name,
          count: products.filter(p => p.material_category_id === cat.id).length,
        })).filter(m => m.count > 0),
        lowStock: products.filter(p =>
          p.tier === 'self_designed' && p.inventory_quantity > 0 && p.inventory_quantity < 10
        ),
        recentProducts: [...products]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5),
      };
    }

    // Supabase 聚合查询
    const { data: products, error } = await cfg.supabase
      .from('products')
      .select('tier, material_category_id, inventory_quantity, status, name, created_at');

    if (error) throw error;

    const { data: categories } = await cfg.supabase
      .from('material_categories')
      .select('id, name');

    const byTier = {
      self_designed: products.filter(p => p.tier === 'self_designed').length,
      curated: products.filter(p => p.tier === 'curated').length,
      general: products.filter(p => p.tier === 'general').length,
    };

    const byMaterial = (categories || []).map(cat => ({
      name: cat.name,
      count: products.filter(p => p.material_category_id === cat.id).length,
    })).filter(m => m.count > 0);

    return {
      total: products.length,
      byTier,
      byMaterial,
      lowStock: products.filter(p =>
        p.tier === 'self_designed' && p.inventory_quantity > 0 && p.inventory_quantity < 10
      ),
      recentProducts: products
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5),
    };
  };

  // ============ 图片上传 ============

  /** 上传图片到 Supabase Storage */
  api.uploadImage = async function (file, tier) {
    if (isMock()) {
      // 模拟：返回 Data URL 作为"上传后的 URL"
      const dataUrl = await window.WCM.utils.readFileAsDataURL(file);
      return { publicUrl: dataUrl, path: 'mock/' + file.name };
    }

    const ext = file.name.split('.').pop().toLowerCase();
    const path = `${tier}/${crypto.randomUUID()}_${Date.now()}.${ext}`;

    const { data, error } = await cfg.supabase.storage
      .from(cfg.IMAGE_UPLOAD.bucket)
      .upload(path, file, {
        upsert: false,
        contentType: file.type,
      });

    if (error) throw error;

    const { data: urlData } = cfg.supabase.storage
      .from(cfg.IMAGE_UPLOAD.bucket)
      .getPublicUrl(path);

    return { publicUrl: urlData.publicUrl, path: path };
  };

  /** 删除图片 */
  api.deleteImage = async function (url) {
    if (isMock() || !url || url.startsWith('data:')) return true;

    try {
      // 从 URL 中提取存储路径
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/product-images\/(.+)/);
      if (pathMatch) {
        const path = decodeURIComponent(pathMatch[1]);
        await cfg.supabase.storage
          .from(cfg.IMAGE_UPLOAD.bucket)
          .remove([path]);
      }
    } catch (e) {
      console.warn('[API] 删除图片失败:', e.message);
    }
    return true;
  };

  // ============ 导出 ============
  window.WCM = window.WCM || {};
  window.WCM.api = api;
})();
