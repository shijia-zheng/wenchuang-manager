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

    // 收集所有图片
    const allImages = [];
    if (image_url) allImages.push(image_url);
    if (product.product_images) {
      product.product_images.forEach(function (img) {
        if (img.image_url !== image_url) {
          allImages.push(img.image_url);
        }
      });
    }

    const card = utils.createElement('div', {
      className: 'product-card',
      dataset: { productId: product.id, tier: tier },
    });

    // --- 图片区 ---
    const imageSection = createImageSection(allImages, tier, status);

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

  function createImageSection(images, tier, status) {
    const imageDiv = utils.createElement('div', { className: 'product-card-image' });

    if (images.length === 0) {
      const noImg = utils.createElement('div', { className: 'no-image' });
      noImg.innerHTML = '<span class="no-image-icon">🖼️</span><span>暂无图片</span>';
      imageDiv.appendChild(noImg);
    } else {
      let currentIdx = 0;

      // 图片
      const img = utils.createElement('img', {
        src: images[0],
        alt: '',
        loading: 'lazy',
        style: { cursor: 'zoom-in' },
        onClick: function (e) {
          e.stopPropagation();
          openLightbox(images, currentIdx);
        },
      });
      imageDiv.appendChild(img);

      // 多图：左右箭头
      if (images.length > 1) {
        const prevBtn = utils.createElement('button', {
          className: 'carousel-arrow carousel-prev',
          onClick: function (e) {
            e.stopPropagation();
            currentIdx = (currentIdx - 1 + images.length) % images.length;
            img.src = images[currentIdx];
            updateDots();
          },
        }, '‹');
        const nextBtn = utils.createElement('button', {
          className: 'carousel-arrow carousel-next',
          onClick: function (e) {
            e.stopPropagation();
            currentIdx = (currentIdx + 1) % images.length;
            img.src = images[currentIdx];
            updateDots();
          },
        }, '›');
        imageDiv.appendChild(prevBtn);
        imageDiv.appendChild(nextBtn);

        // 小圆点
        const dots = utils.createElement('div', { className: 'carousel-dots' });
        images.forEach(function (_, i) {
          const dot = utils.createElement('span', {
            className: 'carousel-dot' + (i === 0 ? ' active' : ''),
            onClick: function (e) {
              e.stopPropagation();
              currentIdx = i;
              img.src = images[i];
              updateDots();
            },
          });
          dots.appendChild(dot);
        });
        imageDiv.appendChild(dots);

        function updateDots() {
          const allDots = dots.querySelectorAll('.carousel-dot');
          allDots.forEach(function (d, i) {
            d.classList.toggle('active', i === currentIdx);
          });
        }
      }
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

    // 存储图片数据供灯箱使用
    imageDiv._allImages = images;

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

  let _lightboxImages = [];
  let _lightboxIdx = 0;

  function openLightbox(images, startIdx) {
    const overlay = document.querySelector('#lightbox-overlay');
    const img = document.querySelector('#lightbox-image');
    if (!overlay || !img) return;

    // 支持单图（旧格式）或多图（新格式）
    if (Array.isArray(images)) {
      _lightboxImages = images;
      _lightboxIdx = startIdx || 0;
    } else {
      _lightboxImages = [images];
      _lightboxIdx = 0;
    }

    updateLightboxImage();
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // 更新导航按钮可见性
    const prevBtn = document.querySelector('#lightbox-prev');
    const nextBtn = document.querySelector('#lightbox-next');
    const counter = document.querySelector('#lightbox-counter');
    if (prevBtn && nextBtn) {
      const showNav = _lightboxImages.length > 1;
      prevBtn.style.display = showNav ? '' : 'none';
      nextBtn.style.display = showNav ? '' : 'none';
      if (counter) {
        counter.style.display = showNav ? '' : 'none';
        counter.textContent = `${_lightboxIdx + 1} / ${_lightboxImages.length}`;
      }
    }
  }

  function navigateLightbox(direction) {
    if (_lightboxImages.length <= 1) return;
    _lightboxIdx = (_lightboxIdx + direction + _lightboxImages.length) % _lightboxImages.length;
    updateLightboxImage();
    const counter = document.querySelector('#lightbox-counter');
    if (counter) {
      counter.textContent = `${_lightboxIdx + 1} / ${_lightboxImages.length}`;
    }
  }

  function updateLightboxImage() {
    const img = document.querySelector('#lightbox-image');
    if (img) img.src = _lightboxImages[_lightboxIdx] || '';
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
    const prevBtn = document.querySelector('#lightbox-prev');
    const nextBtn = document.querySelector('#lightbox-next');
    if (!overlay) return;

    // 点击遮罩关闭
    overlay.addEventListener('click', closeLightbox);
    // 关闭按钮
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    // 前后翻页
    if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); navigateLightbox(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); navigateLightbox(1); });
    // 键盘左右
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.style.display !== 'none') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft' && overlay.style.display !== 'none') {
        navigateLightbox(-1);
      } else if (e.key === 'ArrowRight' && overlay.style.display !== 'none') {
        navigateLightbox(1);
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
