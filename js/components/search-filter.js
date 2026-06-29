/* ============================================================
   文创品管理平台 - 搜索 & 筛选
   依赖: state.js, product-list.js
   ============================================================ */

(function () {
  'use strict';

  const searchFilter = {};
  const state = window.WCM.state;
  const utils = window.WCM.utils;

  /** 初始化所有搜索和筛选控件 */
  searchFilter.init = function () {
    // 为每个产品标签页的搜索框绑定事件
    ['self_designed', 'curated', 'general'].forEach(function (tier) {
      const searchInput = document.querySelector(`#tab-${tier} .search-input`);
      if (searchInput) {
        // 防抖搜索
        const debouncedSearch = utils.debounce(function () {
          state.filters = { searchTerm: searchInput.value.trim() };
          state.refreshProducts(tier).then(function () {
            window.WCM.productList.render(tier);
          });
        }, 300);

        searchInput.addEventListener('input', debouncedSearch);
      }

      // 材质/排序/状态下拉筛选
      const selects = document.querySelectorAll(`#tab-${tier} .filter-select`);
      selects.forEach(function (sel) {
        sel.addEventListener('change', function () {
          const filterType = sel.dataset.filter;
          const newFilters = {};
          newFilters[filterType] = sel.value;
          state.filters = newFilters;
          state.refreshProducts(tier).then(function () {
            window.WCM.productList.render(tier);
          });
        });
      });
    });
  };

  /** 更新材质筛选下拉选项 */
  searchFilter.updateMaterialFilter = function () {
    const categories = state.categories;

    ['self_designed', 'curated', 'general'].forEach(function (tier) {
      const sel = document.querySelector(`#tab-${tier} .filter-select[data-filter="material"]`);
      if (!sel) return;

      const currentValue = sel.value;
      sel.innerHTML = '<option value="">全部材质</option>';
      categories.forEach(function (cat) {
        sel.innerHTML += `<option value="${cat.id}">${utils.escapeHtml(cat.name)}</option>`;
      });
      sel.value = currentValue; // 保留之前的选择
    });
  };

  // 监听分类变化，自动更新筛选下拉
  state.subscribe('categoriesChange', function () {
    searchFilter.updateMaterialFilter();
  });

  // ============ 导出 ============
  window.WCM = window.WCM || {};
  window.WCM.searchFilter = searchFilter;
})();
