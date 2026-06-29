/* ============================================================
   文创品管理平台 - 产品列表渲染
   依赖: state.js, product-card.js
   ============================================================ */

(function () {
  'use strict';

  const productList = {};
  const state = window.WCM.state;
  const utils = window.WCM.utils;

  /** 每页数量 */
  const PAGE_SIZE = window.WCM.config.PAGE_SIZE || 20;

  /** 当前各标签页的页码 */
  const _pageState = {
    self_designed: 1,
    curated: 1,
    general: 1,
  };

  /** 渲染产品列表 */
  productList.render = function (tier) {
    tier = tier || state.currentTier;
    const gridEl = document.querySelector(`#product-grid-${tier}`);
    if (!gridEl) return;

    const products = state.products;
    const page = _pageState[tier] || 1;

    // 加载中状态
    if (state.loading) {
      gridEl.innerHTML = `
        <div class="product-grid-loading">
          <div class="loading-spinner">加载中...</div>
        </div>
      `;
      return;
    }

    // 空状态
    if (!products || products.length === 0) {
      gridEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">暂无产品</div>
          <button class="btn btn-primary" id="btn-empty-add-${tier}">＋ 添加第一个产品</button>
        </div>
      `;
      // 绑定空状态按钮
      const addBtn = document.querySelector(`#btn-empty-add-${tier}`);
      if (addBtn) {
        addBtn.addEventListener('click', function () {
          window.WCM.productForm.open(tier, null);
        });
      }
      renderPagination(tier, 0);
      return;
    }

    // 分页切片
    const totalPages = Math.ceil(products.length / PAGE_SIZE);
    const startIdx = (page - 1) * PAGE_SIZE;
    const pageProducts = products.slice(startIdx, startIdx + PAGE_SIZE);

    // 清空并渲染卡片
    gridEl.innerHTML = '';
    pageProducts.forEach(function (product) {
      const card = window.WCM.productCard.create(product);
      gridEl.appendChild(card);
    });

    // 渲染分页
    renderPagination(tier, totalPages);
  };

  /** 渲染分页控件 */
  function renderPagination(tier, totalPages) {
    const pagEl = document.querySelector(`#pagination-${tier}`);
    if (!pagEl) return;

    if (totalPages <= 1) {
      pagEl.innerHTML = '';
      return;
    }

    const page = _pageState[tier] || 1;

    pagEl.innerHTML = `
      <button ${page <= 1 ? 'disabled' : ''} data-page="prev">← 上一页</button>
      <span class="page-info">${page} / ${totalPages}</span>
      <button ${page >= totalPages ? 'disabled' : ''} data-page="next">下一页 →</button>
    `;

    pagEl.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.dataset.page === 'prev' && page > 1) {
          _pageState[tier] = page - 1;
        } else if (btn.dataset.page === 'next' && page < totalPages) {
          _pageState[tier] = page + 1;
        }
        productList.render(tier);
        // 滚动到顶部
        document.querySelector(`#tab-${tier}`).scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /** 重置页码 */
  productList.resetPage = function (tier) {
    _pageState[tier || state.currentTier] = 1;
  };

  // 监听产品数据变化
  state.subscribe('productsChange', function () {
    _pageState[state.currentTier] = 1; // 数据变化时重置页码
  });

  // ============ 导出 ============
  window.WCM = window.WCM || {};
  window.WCM.productList = productList;
})();
