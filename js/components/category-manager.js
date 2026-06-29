/* ============================================================
   文创品管理平台 - 材质分类管理弹窗
   依赖: api.js, state.js, utils.js
   ============================================================ */

(function () {
  'use strict';

  const categoryManager = {};
  const api = window.WCM.api;
  const state = window.WCM.state;
  const utils = window.WCM.utils;

  /** 打开分类管理弹窗 */
  categoryManager.open = function () {
    renderContent();
    showModal();
    bindEvents();
  };

  /** 关闭分类管理弹窗 */
  categoryManager.close = function () {
    hideModal();
  };

  // ============ 内部函数 ============

  function renderContent() {
    const body = document.querySelector('#category-manager-body');
    if (!body) return;

    const categories = state.categories;

    body.innerHTML = `
      <div style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-lg)">
        <input type="text" class="form-input" id="new-category-name"
               placeholder="输入新分类名称，如：硅胶、树脂..." style="flex:1">
        <button class="btn btn-primary" id="btn-add-category">＋ 添加</button>
      </div>
      <div class="form-label" style="margin-bottom:var(--space-sm)">当前分类列表（${categories.length} 个）</div>
      <div id="category-list" style="max-height:300px;overflow-y:auto">
        ${categories.length === 0
          ? '<p class="empty-text" style="padding:var(--space-lg)">暂无分类</p>'
          : categories.map(function (cat, idx) {
              return `
                <div class="category-item" data-cat-id="${cat.id}"
                     style="display:flex;align-items:center;justify-content:space-between;
                            padding:10px 12px;border:1px solid var(--color-border);
                            border-radius:var(--radius-md);margin-bottom:4px;
                            transition:all var(--transition-fast)">
                  <span>
                    <span style="color:var(--color-text-muted);margin-right:8px">${idx + 1}.</span>
                    <span style="font-weight:500">${utils.escapeHtml(cat.name)}</span>
                  </span>
                  <button class="btn btn-sm"
                          style="color:var(--color-danger)"
                          data-action="delete-category" data-cat-id="${cat.id}"
                          data-cat-name="${utils.escapeHtml(cat.name)}">🗑️ 删除</button>
                </div>
              `;
            }).join('')
        }
      </div>
    `;
  }

  function showModal() {
    const overlay = document.querySelector('#modal-overlay');
    const modal = document.querySelector('#category-manager-modal');
    if (overlay) overlay.style.display = '';
    if (modal) modal.style.display = '';
  }

  function hideModal() {
    const overlay = document.querySelector('#modal-overlay');
    const modal = document.querySelector('#category-manager-modal');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
  }

  function bindEvents() {
    const overlay = document.querySelector('#modal-overlay');
    const closeBtn = document.querySelector('#btn-close-category');

    const close = function () { categoryManager.close(); };
    if (overlay) {
      overlay.onclick = function (e) {
        if (e.target === overlay) close();
      };
    }
    if (closeBtn) closeBtn.onclick = close;

    // ESC 关闭
    const escHandler = function (e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);

    // 添加分类
    const addBtn = document.querySelector('#btn-add-category');
    const nameInput = document.querySelector('#new-category-name');
    if (addBtn && nameInput) {
      addBtn.addEventListener('click', async function () {
        const name = nameInput.value.trim();
        if (!name) {
          utils.showToast('请输入分类名称', 'warning');
          nameInput.focus();
          return;
        }

        // 检查重复
        const exists = state.categories.some(function (c) {
          return c.name === name;
        });
        if (exists) {
          utils.showToast('该分类已存在', 'warning');
          return;
        }

        try {
          await api.createCategory(name);
          await state.refreshCategories();
          renderContent(); // 重新渲染列表
          bindEvents();    // 重新绑定事件
          nameInput.value = '';
          nameInput.focus();
          utils.showToast(`分类「${name}」已添加`, 'success');

          // 刷新筛选下拉
          if (window.WCM.searchFilter) {
            window.WCM.searchFilter.updateMaterialFilter();
          }
        } catch (err) {
          utils.showToast('添加失败: ' + err.message, 'error');
        }
      });

      // 回车添加
      nameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') addBtn.click();
      });
    }

    // 删除分类（事件委托）
    const listEl = document.querySelector('#category-list');
    if (listEl) {
      listEl.addEventListener('click', async function (e) {
        const btn = e.target.closest('[data-action="delete-category"]');
        if (!btn) return;

        const catId = btn.dataset.catId;
        const catName = btn.dataset.catName;

        // 检查是否有产品使用此分类
        const productsUsing = window.WCM.state.products.filter(function (p) {
          return p.material_category_id === catId;
        });

        let confirmMsg = `确定要删除分类「${catName}」吗？`;
        if (productsUsing.length > 0) {
          confirmMsg += `\n\n⚠️ 当前有 ${productsUsing.length} 个产品使用此分类，删除后它们将变为"未分类"。`;
        }

        const confirmed = await utils.confirmDialog(confirmMsg, '删除分类');
        if (!confirmed) return;

        try {
          await api.deleteCategory(catId);
          await state.refreshCategories();
          // 同时刷新产品列表（因为分类被 SET NULL）
          await state.refreshProducts();
          renderContent();
          bindEvents();
          utils.showToast(`分类「${catName}」已删除`, 'success');

          // 刷新产品列表和筛选下拉
          if (window.WCM.productList) {
            window.WCM.productList.render(state.currentTier);
          }
          if (window.WCM.searchFilter) {
            window.WCM.searchFilter.updateMaterialFilter();
          }
        } catch (err) {
          utils.showToast('删除失败: ' + err.message, 'error');
        }
      });
    }
  }

  // ============ 导出 ============
  window.WCM = window.WCM || {};
  window.WCM.categoryManager = categoryManager;
})();
