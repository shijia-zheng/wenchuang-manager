/* ============================================================
   文创品管理平台 - 状态管理（发布/订阅模式）
   依赖: api.js
   ============================================================ */

(function () {
  'use strict';

  const state = {};
  const api = window.WCM.api;

  // ============ 内部状态 ============

  /** 当前激活的标签页 */
  let _currentTier = 'self_designed';

  /** 产品列表缓存 */
  let _products = [];

  /** 材质分类缓存 */
  let _categories = [];

  /** 当前筛选条件 */
  let _filters = {
    searchTerm: '',
    materialId: '',
    sortBy: 'newest',
    status: '',
  };

  /** 加载状态 */
  let _loading = false;

  /** 订阅者 */
  const _listeners = {};

  // ============ 状态读写 ============

  Object.defineProperty(state, 'currentTier', {
    get() { return _currentTier; },
    set(val) {
      if (_currentTier !== val) {
        _currentTier = val;
        _notify('tierChange', val);
      }
    },
  });

  Object.defineProperty(state, 'products', {
    get() { return _products; },
  });

  Object.defineProperty(state, 'categories', {
    get() { return _categories; },
  });

  Object.defineProperty(state, 'filters', {
    get() { return { ..._filters }; },
    set(val) {
      _filters = { ..._filters, ...val };
      _notify('filtersChange', _filters);
    },
  });

  Object.defineProperty(state, 'loading', {
    get() { return _loading; },
  });

  // ============ 数据刷新 ============

  /** 刷新产品列表 */
  state.refreshProducts = async function (tier) {
    tier = tier || _currentTier;
    _loading = true;
    _notify('loadingStart');

    try {
      _products = await api.fetchProducts(tier, _filters);
      _notify('productsChange', _products);
    } catch (err) {
      console.error('[State] 加载产品失败:', err);
      window.WCM.utils.showToast('加载产品失败: ' + err.message, 'error');
      _products = [];
      _notify('productsChange', []);
    } finally {
      _loading = false;
      _notify('loadingEnd');
    }
  };

  /** 刷新材质分类 */
  state.refreshCategories = async function () {
    try {
      _categories = await api.fetchCategories();
      _notify('categoriesChange', _categories);
    } catch (err) {
      console.error('[State] 加载分类失败:', err);
      window.WCM.utils.showToast('加载分类失败: ' + err.message, 'error');
    }
  };

  /** 获取当前层级的产品数量 */
  state.getProductCount = function (tier) {
    if (tier) {
      return _products.filter(p => p.tier === tier).length;
    }
    return _products.length;
  };

  /** 根据 ID 查找产品 */
  state.getProductById = function (id) {
    return _products.find(p => p.id === id) || null;
  };

  /** 根据 ID 查找分类名 */
  state.getCategoryName = function (id) {
    const cat = _categories.find(c => c.id === id);
    return cat ? cat.name : '未分类';
  };

  // ============ 发布/订阅 ============

  function _notify(event, data) {
    if (_listeners[event]) {
      _listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error('[State] 订阅回调错误:', e); }
      });
    }
    // 同时通知 'change' 通用事件
    if (event !== 'change' && _listeners['change']) {
      _listeners['change'].forEach(cb => {
        try { cb(event, data); } catch (e) { console.error('[State] 订阅回调错误:', e); }
      });
    }
  }

  state.subscribe = function (event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
    // 返回取消订阅函数
    return function () {
      _listeners[event] = _listeners[event].filter(cb => cb !== callback);
    };
  };

  // ============ 导出 ============
  window.WCM = window.WCM || {};
  window.WCM.state = state;
})();
