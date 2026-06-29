/* ============================================================
   文创品管理平台 - 产品卡片工厂
   依赖: utils.js, state.js
   ============================================================ */

(function () {
  'use strict';

  const productCard = {};
  const utils = window.WCM.utils;
  const state = window.WCM.state;
  const cfg = window.WCM.config;

  /** 创建产品卡片 DOM 元素 */
  productCard.create = function (product) {
    const { tier, name, image_url, status, material_category_id,
            size, inventory_quantity, listed_price, cost_price,
            reference_price, source_url, submitter, description } = product;

    const card = utils.createElement('div', {
      className: 'product-card',
      dataset: { productId: product.id, tier: tier },
    });

    // --- 图片区 ---
    const imageSection = createImageSection(image_url, tier, status);

    // --- 信息区 ---
    const body = utils.createElement('div', { className: 'product-card-body' });

    // 产品名
    body.appendChild(utils.createElement('div', {
      className: 'product-card-name',
    }, utils.escapeHtml(name)));

    // 徽章行
    const badges = utils.createElement('div', { className: 'product-card-badges' });

    // 材质徽章
    const materialName = state.getCategoryName(material_category_id);
    badges.appendChild(utils.createElement('span', {
      className: 'badge badge-material',
    }, materialName));

    // 层级徽章
    const tierLabel = cfg.TIER_LABELS[tier] || tier;
    const tierClass = `badge-tier-${tier === 'self_designed' ? 'self' : tier === 'curated' ? 'curated' : 'general'}`;
    badges.appendChild(utils.createElement('span', {
      className: `badge ${tierClass}`,
    }, tierLabel));

    body.appendChild(badges);

    // 详情行（根据层级不同）
    const details = utils.createElement('div', { className: 'product-card-details' });

    if (tier === 'self_designed') {
      // 自设计品字段
      if (size) {
        details.appendChild(createDetailRow('📐 尺寸:', size));
      }
      if (submitter) {
        details.appendChild(createDetailRow('👤 负责人:', submitter));
      }
      // 库存状态
      const stockLevel = inventory_quantity === 0 ? 'out' :
                         inventory_quantity < 10 ? 'low' : 'normal';
      const stockLabel = inventory_quantity === 0 ? '售罄' :
                         inventory_quantity < 10 ? '库存紧张' : '库存充足';
      const stockColor = inventory_quantity === 0 ? 'var(--color-danger)' :
                         inventory_quantity < 10 ? 'var(--color-warning)' : 'var(--color-success)';
      const stockRow = utils.createElement('div', { className: 'product-card-detail-row' });
      stockRow.innerHTML = `
        <span class="stock-indicator ${stockLevel}"></span>
        <span class="detail-value" style="color:${stockColor}">${stockLabel}（${inventory_quantity} 件）</span>
      `;
      details.appendChild(stockRow);
    } else {
      // 严选品/泛选品字段
      if (submitter) {
        details.appendChild(createDetailRow('👤 提交人:', submitter));
      }
      if (reference_price) {
        details.appendChild(createDetailRow('💰 参考价:', utils.formatPrice(reference_price)));
      }
      // 状态（严选品特有）
      if (tier === 'curated' && status) {
        const statusLabel = cfg.STATUS_LABELS[status] || status;
        const statusColor = cfg.STATUS_COLORS[status] || { bg: '#f1f5f9', text: '#64748b' };
        details.appendChild(utils.createElement('div', {
          className: 'product-card-detail-row',
        }, `<span class="badge" style="background:${statusColor.bg};color:${statusColor.text}">${statusLabel}</span>`));
      }
    }

    body.appendChild(details);

    // 描述（如果有）
    if (description) {
      body.appendChild(utils.createElement('div', {
        className: 'product-card-meta',
      }, utils.escapeHtml(description)));
    }

    // 价格
    if (tier === 'self_designed' && listed_price) {
      const priceDiv = utils.createElement('div', { className: 'product-card-price' });
      priceDiv.innerHTML = `${utils.formatPrice(listed_price)}`;
      if (cost_price) {
        priceDiv.innerHTML += `<span class="price-cost">成本 ${utils.formatPrice(cost_price)}</span>`;
      }
      body.appendChild(priceDiv);
    }

    // 来源链接（严选/泛选）
    if ((tier === 'curated' || tier === 'general') && source_url) {
      const sourceDiv = utils.createElement('div', { className: 'product-card-source' });
      sourceDiv.innerHTML = `<a href="${utils.escapeHtml(source_url)}" target="_blank" rel="noopener">🔗 查看来源</a>`;
      body.appendChild(sourceDiv);
    }

    card.appendChild(imageSection);
    card.appendChild(body);

    // --- 操作按钮区 ---
    const footer = utils.createElement('div', { className: 'product-card-footer' });

    footer.appendChild(utils.createElement('button', {
      className: 'btn btn-secondary btn-sm',
      onClick: function () { window.WCM.productForm.open(tier, product); },
    }, '✏️ 编辑'));

    // 泛选品提升按钮
    if (tier === 'general') {
      footer.appendChild(utils.createElement('button', {
        className: 'btn btn-sm btn-promote',
        onClick: function () { handlePromote(product); },
      }, '⬆️ 提升为严选品'));
    }

    footer.appendChild(utils.createElement('button', {
      className: 'btn btn-sm',
      style: { color: 'var(--color-danger)', flex: '0' },
      onClick: function () { handleDelete(product); },
    }, '🗑️'));

    card.appendChild(footer);

    return card;
  };

  // ============ 辅助函数 ============

  function createImageSection(imageUrl, tier, status) {
    const imageDiv = utils.createElement('div', { className: 'product-card-image' });

    if (imageUrl) {
      const img = utils.createElement('img', {
        src: imageUrl,
        alt: '',
        loading: 'lazy',
        style: { cursor: 'zoom-in' },
        onClick: function (e) {
          e.stopPropagation();
          openLightbox(imageUrl);
        },
      });
      imageDiv.appendChild(img);
    } else {
      const noImg = utils.createElement('div', { className: 'no-image' });
      noImg.innerHTML = '<span class="no-image-icon">🖼️</span><span>暂无图片</span>';
      imageDiv.appendChild(noImg);
    }

    // 状态角标
    if (status && status !== 'active') {
      const statusLabel = cfg.STATUS_LABELS[status] || status;
      const statusColor = cfg.STATUS_COLORS[status] || { bg: '#f1f5f9', text: '#64748b' };
      const badge = utils.createElement('span', {
        className: 'product-card-status',
        style: { background: statusColor.bg, color: statusColor.text },
      }, statusLabel);
      imageDiv.appendChild(badge);
    }

    return imageDiv;
  }

  function createDetailRow(label, value) {
    const row = utils.createElement('div', { className: 'product-card-detail-row' });
    row.innerHTML = `<span class="detail-label">${label}</span><span class="detail-value">${utils.escapeHtml(String(value))}</span>`;
    return row;
  }

  async function handleDelete(product) {
    const confirmed = await utils.confirmDialog(
      `确定要删除「${product.name}」吗？此操作不可恢复。`,
      '删除产品'
    );
    if (!confirmed) return;

    try {
      // 尝试删除关联图片
      if (product.image_url) {
        await window.WCM.api.deleteImage(product.image_url);
      }
      await window.WCM.api.deleteProduct(product.id);
      utils.showToast('产品已删除', 'success');
      // 刷新当前列表
      await state.refreshProducts();
      window.WCM.productList.render(state.currentTier);
      // 如果当前在仪表盘，也刷新
      if (window.WCM.router.getCurrentTab() === 'dashboard') {
        window.WCM.dashboard.render();
      }
    } catch (err) {
      utils.showToast('删除失败: ' + err.message, 'error');
    }
  }

  async function handlePromote(product) {
    const confirmed = await utils.confirmDialog(
      `将「${product.name}」提升为严选品？提升后状态为"待审核"，可在严选品标签页查看。`,
      '提升为严选品'
    );
    if (!confirmed) return;

    try {
      await window.WCM.api.promoteProduct(product.id);
      utils.showToast('已提升为严选品', 'success');
      await state.refreshProducts();
      window.WCM.productList.render(state.currentTier);
    } catch (err) {
      utils.showToast('操作失败: ' + err.message, 'error');
    }
  }

  // ============ 灯箱 ============

  function openLightbox(imageUrl) {
    const overlay = document.querySelector('#lightbox-overlay');
    const img = document.querySelector('#lightbox-image');
    if (!overlay || !img) return;

    img.src = imageUrl;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const overlay = document.querySelector('#lightbox-overlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  // 初始化灯箱关闭事件（只绑定一次）
  let _lightboxInitialized = false;
  function initLightbox() {
    if (_lightboxInitialized) return;
    _lightboxInitialized = true;

    const overlay = document.querySelector('#lightbox-overlay');
    const closeBtn = document.querySelector('#lightbox-close');
    if (!overlay) return;

    // 点击遮罩关闭
    overlay.addEventListener('click', closeLightbox);
    // 关闭按钮
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    // ESC 键关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.style.display !== 'none') {
        closeLightbox();
      }
    });
  }

  // DOM 就绪后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLightbox);
  } else {
    initLightbox();
  }

  // ============ 导出 ============
  window.WCM = window.WCM || {};
  window.WCM.productCard = productCard;
})();
