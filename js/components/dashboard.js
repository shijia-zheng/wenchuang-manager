/* ============================================================
   文创品管理平台 - 仪表盘组件
   依赖: state.js, api.js, utils.js, Chart.js (CDN)
   ============================================================ */

(function () {
  'use strict';

  const dashboard = {};
  const api = window.WCM.api;
  const state = window.WCM.state;
  const utils = window.WCM.utils;
  const cfg = window.WCM.config;

  /** Chart.js 实例引用（用于销毁） */
  let _chartTier = null;
  let _chartMaterial = null;

  /** 渲染仪表盘 */
  dashboard.render = async function () {
    try {
      const stats = await api.getDashboardStats();
      renderStatCards(stats);
      renderCharts(stats);
      renderAlerts(stats);
      renderRecentProducts(stats);
    } catch (err) {
      console.error('[Dashboard] 渲染失败:', err);
      utils.showToast('加载仪表盘失败: ' + err.message, 'error');
    }
  };

  // ============ 统计卡片 ============

  function renderStatCards(stats) {
    const { total, byTier } = stats;

    animateValue('stat-total', total);
    animateValue('stat-self', byTier?.self_designed || 0);
    animateValue('stat-curated', byTier?.curated || 0);
    animateValue('stat-general', byTier?.general || 0);

    // 副标题
    updateStatSub();
  }

  function animateValue(elementId, targetValue) {
    const el = document.querySelector(`#${elementId}`);
    if (!el) return;

    const currentValue = parseInt(el.textContent, 10) || 0;
    if (currentValue === targetValue) {
      el.textContent = targetValue;
      return;
    }

    const duration = 600; // ms
    const startTime = performance.now();

    function step(timestamp) {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(currentValue + (targetValue - currentValue) * eased);
      el.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  function updateStatSub() {
    // 可以根据实际数据更新副标题
    const lowStockCount = state.products.filter(function (p) {
      return p.tier === 'self_designed' && p.status === 'low_stock';
    }).length;

    const pendingCount = state.products.filter(function (p) {
      return p.tier === 'curated' && p.status === 'pending_review';
    }).length;

    const subEls = document.querySelectorAll('.stat-sub');
    if (subEls.length >= 4) {
      subEls[1].textContent = lowStockCount > 0 ? `${lowStockCount} 个库存不足` : '库存状态正常';
      subEls[2].textContent = pendingCount > 0 ? `${pendingCount} 个待审核` : '';
    }
  }

  // ============ 图表 ============

  function renderCharts(stats) {
    renderTierChart(stats);
    renderMaterialChart(stats);
  }

  function renderTierChart(stats) {
    const canvas = document.querySelector('#chart-tier');
    if (!canvas) return;

    // 销毁旧图表
    if (_chartTier) {
      _chartTier.destroy();
      _chartTier = null;
    }

    const ctx = canvas.getContext('2d');
    const { byTier } = stats;

    const labels = [cfg.TIER_LABELS.self_designed, cfg.TIER_LABELS.curated, cfg.TIER_LABELS.general];
    const data = [
      byTier?.self_designed || 0,
      byTier?.curated || 0,
      byTier?.general || 0,
    ];
    const colors = [cfg.CHART_COLORS[0], cfg.CHART_COLORS[1], cfg.CHART_COLORS[2]];

    _chartTier = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverBorderWidth: 4,
          hoverBorderColor: '#ffffff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyleWidth: 10,
              font: { family: getComputedStyle(document.documentElement).fontFamily, size: 13 },
              generateLabels: function (chart) {
                const ds = chart.data.datasets[0];
                return chart.data.labels.map(function (label, i) {
                  return {
                    text: `${label}  (${ds.data[i]})`,
                    fillStyle: ds.backgroundColor[i],
                    strokeStyle: ds.backgroundColor[i],
                    lineWidth: 0,
                    hidden: false,
                    index: i,
                    pointStyle: 'circle',
                    pointStyleWidth: 10,
                  };
                });
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                const value = context.parsed;
                const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${value} 个 (${pct}%)`;
              },
            },
          },
        },
        cutout: '60%',
      },
    });
  }

  function renderMaterialChart(stats) {
    const canvas = document.querySelector('#chart-material');
    if (!canvas) return;

    // 销毁旧图表
    if (_chartMaterial) {
      _chartMaterial.destroy();
      _chartMaterial = null;
    }

    const ctx = canvas.getContext('2d');
    const { byMaterial } = stats;

    if (!byMaterial || byMaterial.length === 0) {
      // 无数据时显示提示
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2);
      return;
    }

    const labels = byMaterial.map(function (m) { return m.name; });
    const data = byMaterial.map(function (m) { return m.count; });
    const colors = cfg.CHART_COLORS.slice(0, byMaterial.length);

    _chartMaterial = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 10,
              font: { family: getComputedStyle(document.documentElement).fontFamily, size: 12 },
              generateLabels: function (chart) {
                const ds = chart.data.datasets[0];
                return chart.data.labels.map(function (label, i) {
                  return {
                    text: `${label}  (${ds.data[i]})`,
                    fillStyle: ds.backgroundColor[i],
                    strokeStyle: ds.backgroundColor[i],
                    lineWidth: 0,
                    hidden: false,
                    index: i,
                    pointStyle: 'circle',
                  };
                });
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return ` ${context.label}: ${context.parsed} 个产品`;
              },
            },
          },
        },
      },
    });
  }

  // ============ 库存预警 ============

  function renderAlerts(stats) {
    const alertList = document.querySelector('#alert-list');
    if (!alertList) return;

    const lowStock = stats.lowStock || [];

    if (lowStock.length === 0) {
      alertList.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:var(--space-lg)">✅ 暂无库存预警，所有产品库存充足</p>';
      return;
    }

    alertList.innerHTML = lowStock.map(function (product) {
      const isCritical = product.inventory_quantity <= 5;
      const materialName = state.getCategoryName(product.material_category_id);
      return `
        <div class="alert-item ${isCritical ? 'critical' : ''}">
          <span class="alert-item-icon">${isCritical ? '🚨' : '⚠️'}</span>
          <div class="alert-item-info">
            <div class="alert-item-name">${utils.escapeHtml(product.name)}</div>
            <div class="alert-item-meta">${materialName} | 仅剩 ${product.inventory_quantity} 件</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ============ 最近添加 ============

  function renderRecentProducts(stats) {
    const recentList = document.querySelector('#recent-list');
    if (!recentList) return;

    const recent = stats.recentProducts || [];

    if (recent.length === 0) {
      recentList.innerHTML = '<p style="color:var(--color-text-muted);text-align:center;padding:var(--space-lg)">暂无产品</p>';
      return;
    }

    recentList.innerHTML = recent.map(function (product) {
      const tierLabel = cfg.TIER_LABELS[product.tier] || product.tier;
      const tierBg = product.tier === 'self_designed' ? 'var(--color-tier-self-bg)' :
                     product.tier === 'curated' ? 'var(--color-tier-curated-bg)' : 'var(--color-tier-general-bg)';
      const tierColor = product.tier === 'self_designed' ? 'var(--color-tier-self)' :
                        product.tier === 'curated' ? 'var(--color-tier-curated)' : 'var(--color-tier-general)';
      const materialName = state.getCategoryName(product.material_category_id);
      const timeStr = utils.formatDate(product.created_at);

      return `
        <div class="recent-item">
          <div class="recent-item-image" style="cursor:${product.image_url ? 'pointer' : 'default'}">
            ${product.image_url
              ? `<img src="${utils.escapeHtml(product.image_url)}" alt="" onclick="event.stopPropagation();document.querySelector('#lightbox-image').src='${utils.escapeHtml(product.image_url)}';document.querySelector('#lightbox-overlay').style.display='flex';document.body.style.overflow='hidden';">`
              : '<div class="no-img">📦</div>'}
          </div>
          <div class="recent-item-info">
            <div class="recent-item-name">${utils.escapeHtml(product.name)}</div>
            <div class="recent-item-meta">${materialName} · ${timeStr}</div>
          </div>
          <span class="recent-item-tier" style="background:${tierBg};color:${tierColor}">${tierLabel}</span>
        </div>
      `;
    }).join('');
  }

  /** 销毁图表实例（切换标签时调用） */
  dashboard.destroy = function () {
    if (_chartTier) { _chartTier.destroy(); _chartTier = null; }
    if (_chartMaterial) { _chartMaterial.destroy(); _chartMaterial = null; }
  };

  // ============ 导出 ============
  window.WCM = window.WCM || {};
  window.WCM.dashboard = dashboard;
})();
