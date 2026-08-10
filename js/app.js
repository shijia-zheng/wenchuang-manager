/* ============================================================
   文创品管理平台 - 应用启动入口
   依赖: 所有模块
   ============================================================ */

(function () {
  'use strict';

  const app = {};
  const state = window.WCM.state;
  const router = window.WCM.router;
  const dashboard = window.WCM.dashboard;
  const productList = window.WCM.productList;
  const searchFilter = window.WCM.searchFilter;
  const utils = window.WCM.utils;

  /** 应用初始化 */
  app.init = async function () {
    console.log('[文创品] 正在初始化...');
    updateStorageBadge();

    // 1. 加载材质分类（共享数据，需在其他模块之前加载）
    await state.refreshCategories();

    // 2. 初始化搜索筛选（会监听分类变化更新下拉）
    searchFilter.init();

    // 3. 初始化路由（根据 URL hash 切换标签、加载数据、渲染界面）
    //    路由是唯一的数据加载入口，避免重复刷新
    router.init();

    // 4. 绑定全局按钮事件
    bindGlobalEvents();

    // 5. 监听产品数据变化，更新仪表盘统计副标题
    state.subscribe('productsChange', function () {
      updateStatSubCounts();
    });

    console.log('[文创品] 初始化完成 ✅');
  };

  /** 绑定全局事件 */
  function bindGlobalEvents() {
    // 「添加产品」按钮（每个标签页都有）
    ['self_designed', 'curated', 'general'].forEach(function (tier) {
      const addBtn = document.querySelector(`#btn-add-${tier}`);
      if (addBtn) {
        addBtn.addEventListener('click', function () {
          window.WCM.productForm.open(tier, null);
        });
      }
    });

    // 「管理分类」按钮（三个标签页各有一个）
    const catBtns = document.querySelectorAll(
      '#btn-manage-categories, #btn-manage-categories-2, #btn-manage-categories-3'
    );
    catBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.WCM.categoryManager.open();
      });
    });

    // 使用 MutationObserver 监听仪表盘标签的显示/隐藏
    // 仅在仪表盘可见时才渲染图表，隐藏时销毁以释放内存
    const dashboardTab = document.querySelector('#tab-dashboard');
    if (dashboardTab) {
      const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            if (dashboardTab.classList.contains('active')) {
              dashboard.render();
            } else {
              dashboard.destroy();
            }
          }
        });
      });
      observer.observe(dashboardTab, { attributes: true, attributeFilter: ['class'] });

      // 页面初始状态：如果仪表盘是激活的，立即渲染
      if (dashboardTab.classList.contains('active')) {
        dashboard.render();
      }
    }
  }

  /** 更新存储模式标识 */
  function updateStorageBadge() {
    const badge = document.querySelector('#header-storage-badge');
    if (!badge) return;
    if (window.WCM.config.isMock) {
      badge.textContent = '💾 本地模拟数据';
      badge.style.background = 'var(--color-warning-light)';
      badge.style.color = 'var(--color-warning)';
    } else {
      badge.textContent = '☁️ Supabase 云端存储';
      badge.style.background = 'var(--color-success-light)';
      badge.style.color = 'var(--color-success)';
    }
  }

  /** 更新统计副标题 */
  function updateStatSubCounts() {
    const products = state.products;

    const lowStockCount = products.filter(function (p) {
      return p.tier === 'self_designed' && p.inventory_quantity > 0 && p.inventory_quantity < 10;
    }).length;

    const pendingCount = products.filter(function (p) {
      return p.tier === 'curated' && p.status === 'pending_review';
    }).length;

    const subEls = document.querySelectorAll('.stat-sub');
    if (subEls.length >= 4) {
      if (subEls[1]) {
        subEls[1].textContent = lowStockCount > 0 ? `${lowStockCount} 个库存不足` : '库存状态正常';
      }
      if (subEls[2]) {
        subEls[2].textContent = pendingCount > 0 ? `${pendingCount} 个待审核` : '';
      }
    }
  }

  // ============ 启动 ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      app.init().catch(function (err) {
        console.error('[文创品] 启动失败:', err);
        utils.showToast('应用启动失败，请刷新页面重试', 'error');
      });
    });
  } else {
    app.init().catch(function (err) {
      console.error('[文创品] 启动失败:', err);
      utils.showToast('应用启动失败，请刷新页面重试', 'error');
    });
  }

  // ============ 导出 ============
  window.WCM = window.WCM || {};
  window.WCM.app = app;
})();
