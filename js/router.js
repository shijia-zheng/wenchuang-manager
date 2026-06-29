/* ============================================================
   文创品管理平台 - 路由模块
   依赖: state.js, product-list.js, dashboard.js
   ============================================================ */

(function () {
  'use strict';

  const router = {};
  const state = window.WCM.state;

  /** 当前激活的标签 */
  let _currentTab = 'dashboard';

  /** 初始化路由 */
  router.init = function () {
    // 监听标签栏点击
    const tabBar = document.querySelector('#tab-bar');
    if (tabBar) {
      tabBar.addEventListener('click', function (e) {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        const tab = btn.dataset.tab;
        if (tab) {
          router.navigate(tab);
        }
      });
    }

    // 同步 URL hash
    window.addEventListener('hashchange', function () {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['dashboard', 'self_designed', 'curated', 'general'].includes(hash)) {
        router.navigate(hash, true);
      }
    });

    // 从 URL hash 加载初始标签
    const initHash = window.location.hash.replace('#', '');
    if (initHash && ['dashboard', 'self_designed', 'curated', 'general'].includes(initHash)) {
      router.navigate(initHash, true);
    }
  };

  /** 导航到指定标签 */
  router.navigate = async function (tab, fromHash) {
    if (tab === _currentTab && !fromHash) return;

    _currentTab = tab;

    // 更新 URL hash
    if (!fromHash) {
      window.location.hash = tab;
    }

    // 更新标签栏激活状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // 切换内容区
    document.querySelectorAll('.tab-content').forEach(section => {
      section.classList.remove('active');
    });

    const contentEl = document.querySelector(`#tab-${tab}`);
    if (contentEl) {
      contentEl.classList.add('active');
    }

    // 根据标签类型执行操作
    if (tab === 'dashboard') {
      // 渲染仪表盘
      if (window.WCM.dashboard) {
        window.WCM.dashboard.render();
      }
    } else {
      // 产品标签页
      state.currentTier = tab;
      state.filters = { searchTerm: '', materialId: '', sortBy: 'newest', status: '' };

      // 重置搜索框和筛选器
      resetToolbarFilters(tab);

      await state.refreshProducts(tab);
      if (window.WCM.productList) {
        window.WCM.productList.render(tab);
      }
      // 更新材质筛选下拉
      if (window.WCM.searchFilter) {
        window.WCM.searchFilter.updateMaterialFilter(tab);
      }
    }
  };

  /** 获取当前标签 */
  router.getCurrentTab = function () {
    return _currentTab;
  };

  /** 重置工具栏筛选控件 */
  function resetToolbarFilters(tier) {
    const toolbar = document.querySelector(`#tab-${tier}`);
    if (!toolbar) return;

    const searchInput = toolbar.querySelector('.search-input');
    if (searchInput) searchInput.value = '';

    toolbar.querySelectorAll('.filter-select').forEach(sel => {
      sel.selectedIndex = 0;
    });
  }

  /** 跳转到某产品层级并打开添加表单 */
  router.navigateAndAdd = async function (tier) {
    await router.navigate(tier);
    if (window.WCM.productForm) {
      window.WCM.productForm.open(tier, null);
    }
  };

  // ============ 导出 ============
  window.WCM = window.WCM || {};
  window.WCM.router = router;
})();
