/* ============================================================
   文创品管理平台 - 产品表单弹窗
   依赖: api.js, state.js, image-upload.js, utils.js
   ============================================================ */

(function () {
  'use strict';

  const productForm = {};
  const api = window.WCM.api;
  const state = window.WCM.state;
  const utils = window.WCM.utils;

  let _currentTier = null;
  let _editingProduct = null;
  let _imageUrl = '';

  /** 打开表单弹窗 */
  productForm.open = function (tier, product) {
    _currentTier = tier;
    _editingProduct = product || null;
    _imageUrl = product ? (product.image_url || '') : '';

    const isEdit = !!product;
    const tierLabel = window.WCM.config.TIER_LABELS[tier] || tier;

    // 更新弹窗标题
    const titleEl = document.querySelector('#product-form-title');
    if (titleEl) {
      titleEl.textContent = isEdit ? `编辑${tierLabel}` : `添加${tierLabel}`;
    }

    // 渲染表单内容
    renderForm(tier, product);

    // 显示弹窗
    showModal();

    // 绑定关闭按钮
    bindCloseButtons();

    // 绑定提交按钮
    bindSubmit(tier, product);
  };

  /** 关闭表单弹窗 */
  productForm.close = function () {
    hideModal();
    _currentTier = null;
    _editingProduct = null;
    _imageUrl = '';
  };

  // ============ 内部函数 ============

  function renderForm(tier, product) {
    const body = document.querySelector('#product-form-body');
    if (!body) return;

    const categories = state.categories;
    const isSelf = tier === 'self_designed';
    const isCuratedOrGeneral = tier === 'curated' || tier === 'general';

    const materialOptions = categories.map(function (c) {
      const selected = product && product.material_category_id === c.id ? 'selected' : '';
      return `<option value="${c.id}" ${selected}>${utils.escapeHtml(c.name)}</option>`;
    }).join('');

    let html = '';

    // === 通用字段 ===
    html += `
      <div class="form-group">
        <label class="form-label">产品名称 <span class="required">*</span></label>
        <input type="text" class="form-input" id="form-name"
               placeholder="请输入产品名称" value="${utils.escapeHtml(product ? product.name : '')}" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">材质分类</label>
          <select class="form-select" id="form-material">
            <option value="">请选择材质</option>
            ${materialOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">提交人</label>
          <input type="text" class="form-input" id="form-submitter"
                 placeholder="请输入提交人" value="${utils.escapeHtml(product ? (product.submitter || '') : '')}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">产品图片</label>
        <div id="form-image-upload-zone"></div>
      </div>

      <div class="form-group">
        <label class="form-label">描述说明</label>
        <textarea class="form-textarea" id="form-description"
                  placeholder="请输入产品描述...">${utils.escapeHtml(product ? (product.description || '') : '')}</textarea>
      </div>
    `;

    // === 自设计品专属字段 ===
    if (isSelf) {
      html += `
        <hr class="form-divider">
        <div class="form-section-title">📦 自设计品信息</div>

        <div class="form-group">
          <label class="form-label">产品尺寸</label>
          <input type="text" class="form-input" id="form-size"
                 placeholder="例如: 12×3cm、A5" value="${utils.escapeHtml(product ? (product.size || '') : '')}">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">标价 (¥) <span class="required">*</span></label>
            <input type="number" class="form-input" id="form-listed-price"
                   placeholder="0.00" step="0.01" min="0"
                   value="${product ? (product.listed_price || '') : ''}">
          </div>
          <div class="form-group">
            <label class="form-label">成本价 (¥)</label>
            <input type="number" class="form-input" id="form-cost-price"
                   placeholder="0.00" step="0.01" min="0"
                   value="${product ? (product.cost_price || '') : ''}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">库存数量 <span class="required">*</span></label>
          <input type="number" class="form-input" id="form-inventory"
                 placeholder="0" min="0"
                 value="${product ? (product.inventory_quantity || 0) : 0}">
        </div>
      `;
    }

    // === 严选品/泛选品专属字段 ===
    if (isCuratedOrGeneral) {
      html += `
        <hr class="form-divider">
        <div class="form-section-title">🔍 ${tier === 'curated' ? '严选品' : '泛选品'}信息</div>

        <div class="form-group">
          <label class="form-label">参考价格 (¥)</label>
          <input type="number" class="form-input" id="form-reference-price"
                 placeholder="0.00" step="0.01" min="0"
                 value="${product ? (product.reference_price || '') : ''}">
        </div>

        <div class="form-group">
          <label class="form-label">来源链接</label>
          <input type="url" class="form-input" id="form-source-url"
                 placeholder="https://..." value="${utils.escapeHtml(product ? (product.source_url || '') : '')}">
        </div>
      `;
    }

    // === 状态（编辑模式下显示） ===
    if (product) {
      html += `
        <hr class="form-divider">
        <div class="form-group">
          <label class="form-label">状态</label>
          <select class="form-select" id="form-status">
            ${getStatusOptions(tier, product.status)}
          </select>
        </div>
      `;
    }

    body.innerHTML = html;

    // 初始化图片上传组件
    initImageUpload(tier, product);
  }

  function getStatusOptions(tier, currentStatus) {
    let options = '';
    if (tier === 'self_designed') {
      const statuses = [
        ['active', '正常'], ['low_stock', '库存不足'], ['out_of_stock', '已售罄'],
      ];
      statuses.forEach(function ([val, label]) {
        options += `<option value="${val}" ${currentStatus === val ? 'selected' : ''}>${label}</option>`;
      });
    } else if (tier === 'curated') {
      const statuses = [
        ['pending_review', '待审核'], ['approved', '已通过'], ['rejected', '已驳回'],
      ];
      statuses.forEach(function ([val, label]) {
        options += `<option value="${val}" ${currentStatus === val ? 'selected' : ''}>${label}</option>`;
      });
    } else {
      const statuses = [
        ['active', '正常'], ['promoted', '已提升'], ['archived', '已归档'],
      ];
      statuses.forEach(function ([val, label]) {
        options += `<option value="${val}" ${currentStatus === val ? 'selected' : ''}>${label}</option>`;
      });
    }
    return options;
  }

  function initImageUpload(tier, product) {
    const zoneContainer = document.querySelector('#form-image-upload-zone');
    if (!zoneContainer) return;

    const uploadZone = window.WCM.imageUpload.create({
      tier: tier,
      currentUrl: product ? product.image_url : '',
      onChange: function (url) {
        _imageUrl = url;
      },
    });

    zoneContainer.appendChild(uploadZone);
  }

  function showModal() {
    const overlay = document.querySelector('#modal-overlay');
    const modal = document.querySelector('#product-form-modal');
    if (overlay) overlay.style.display = '';
    if (modal) modal.style.display = '';
  }

  function hideModal() {
    const overlay = document.querySelector('#modal-overlay');
    const modal = document.querySelector('#product-form-modal');
    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
  }

  function bindCloseButtons() {
    const overlay = document.querySelector('#modal-overlay');
    const closeBtn = document.querySelector('#btn-close-form');
    const cancelBtn = document.querySelector('#btn-cancel-form');

    const close = function () { productForm.close(); };
    if (overlay) {
      overlay.onclick = function (e) {
        if (e.target === overlay) close();
      };
    }
    if (closeBtn) closeBtn.onclick = close;
    if (cancelBtn) cancelBtn.onclick = close;

    // ESC 关闭
    const escHandler = function (e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
  }

  function bindSubmit(tier, product) {
    const submitBtn = document.querySelector('#btn-submit-form');
    if (!submitBtn) return;

    // 移除旧监听器（克隆节点）
    const newBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newBtn, submitBtn);

    newBtn.addEventListener('click', async function () {
      await handleSubmit(tier, product);
    });
  }

  async function handleSubmit(tier, product) {
    const isEdit = !!product;
    const isSelf = tier === 'self_designed';

    // 收集通用字段
    const nameEl = document.querySelector('#form-name');
    const name = nameEl ? nameEl.value.trim() : '';
    if (!name) {
      utils.showToast('请输入产品名称', 'warning');
      if (nameEl) nameEl.focus();
      return;
    }

    const materialEl = document.querySelector('#form-material');
    const materialId = materialEl ? materialEl.value : '';

    const submitterEl = document.querySelector('#form-submitter');
    const submitter = submitterEl ? submitterEl.value.trim() : '';

    const descEl = document.querySelector('#form-description');
    const description = descEl ? descEl.value.trim() : '';

    const formData = {
      tier: tier,
      name: name,
      material_category_id: materialId || null,
      image_url: _imageUrl || null,
      description: description,
      submitter: submitter,
    };

    // 收集层级特定字段
    if (isSelf) {
      const sizeEl = document.querySelector('#form-size');
      formData.size = sizeEl ? sizeEl.value.trim() : '';

      const listedPriceEl = document.querySelector('#form-listed-price');
      const listedPrice = listedPriceEl ? parseFloat(listedPriceEl.value) : 0;
      if (isNaN(listedPrice) || listedPrice < 0) {
        utils.showToast('请输入有效的标价', 'warning');
        if (listedPriceEl) listedPriceEl.focus();
        return;
      }
      formData.listed_price = listedPrice;

      const costPriceEl = document.querySelector('#form-cost-price');
      const costPrice = costPriceEl ? parseFloat(costPriceEl.value) : 0;
      formData.cost_price = isNaN(costPrice) ? 0 : costPrice;

      const inventoryEl = document.querySelector('#form-inventory');
      const inventory = inventoryEl ? parseInt(inventoryEl.value, 10) : 0;
      if (isNaN(inventory) || inventory < 0) {
        utils.showToast('请输入有效的库存数量', 'warning');
        return;
      }
      formData.inventory_quantity = inventory;

      // 自动设置库存状态
      if (inventory === 0) {
        formData.status = 'out_of_stock';
      } else if (inventory < 10 && product && product.status !== 'out_of_stock') {
        formData.status = 'low_stock';
      } else if (inventory >= 10 && product && product.status === 'low_stock') {
        formData.status = 'active';
      }
    } else {
      const refPriceEl = document.querySelector('#form-reference-price');
      const refPrice = refPriceEl ? parseFloat(refPriceEl.value) : null;
      formData.reference_price = (refPrice && !isNaN(refPrice)) ? refPrice : null;

      const sourceUrlEl = document.querySelector('#form-source-url');
      formData.source_url = sourceUrlEl ? sourceUrlEl.value.trim() : '';
    }

    // 编辑时获取状态
    if (isEdit) {
      const statusEl = document.querySelector('#form-status');
      if (statusEl) {
        formData.status = statusEl.value;
      }
    } else if (!formData.status) {
      formData.status = tier === 'curated' ? 'pending_review' : 'active';
    }

    // 提交
    const submitBtn = document.querySelector('#btn-submit-form');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '保存中...';
    }

    try {
      if (isEdit) {
        await api.updateProduct(product.id, formData);
        utils.showToast('产品更新成功', 'success');
      } else {
        await api.createProduct(formData);
        utils.showToast('产品添加成功', 'success');
      }

      productForm.close();

      // 刷新数据
      await state.refreshProducts(tier);
      window.WCM.productList.render(tier);
      if (window.WCM.searchFilter) {
        window.WCM.searchFilter.updateMaterialFilter();
      }
    } catch (err) {
      utils.showToast('保存失败: ' + err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 保存产品';
      }
    }
  }

  // ============ 导出 ============
  window.WCM = window.WCM || {};
  window.WCM.productForm = productForm;
})();
