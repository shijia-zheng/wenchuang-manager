/* ============================================================
   文创品管理平台 - 工具函数
   依赖: 无
   ============================================================ */

(function () {
  'use strict';

  const utils = {};

  // ============ 格式化函数 ============

  /** 格式化价格 */
  utils.formatPrice = function (value) {
    if (value === null || value === undefined || value === '') return '—';
    const num = parseFloat(value);
    if (isNaN(num)) return '—';
    return '¥' + num.toFixed(2);
  };

  /** 格式化日期 */
  utils.formatDate = function (dateStr, format) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    if (format === 'short') {
      return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
    if (format === 'datetime') {
      return d.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    }
    // default: relative
    return utils.timeAgo(d);
  };

  /** 相对时间 */
  utils.timeAgo = function (date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 30) return date.toLocaleDateString('zh-CN');
    if (days > 0) return `${days} 天前`;
    if (hours > 0) return `${hours} 小时前`;
    if (minutes > 0) return `${minutes} 分钟前`;
    return '刚刚';
  };

  /** 转义 HTML */
  utils.escapeHtml = function (str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  // ============ DOM 辅助 ============

  /** 创建 DOM 元素 */
  utils.createElement = function (tag, attrs, children) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'className') {
          el.className = value;
        } else if (key === 'dataset') {
          Object.entries(value).forEach(([k, v]) => {
            el.dataset[k] = v;
          });
        } else if (key === 'style' && typeof value === 'object') {
          Object.assign(el.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
          el.setAttribute(key, value);
        }
      });
    }
    if (children) {
      if (typeof children === 'string') {
        el.innerHTML = children;
      } else if (Array.isArray(children)) {
        children.forEach(child => {
          if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
          } else if (child instanceof Node) {
            el.appendChild(child);
          }
        });
      } else if (children instanceof Node) {
        el.appendChild(children);
      }
    }
    return el;
  };

  /** 按 ID 获取元素（带类型检查的便捷方法） */
  utils.$ = function (selector) {
    return document.querySelector(selector);
  };

  utils.$$ = function (selector) {
    return document.querySelectorAll(selector);
  };

  // ============ Toast 通知 ============

  let toastTimer = null;

  utils.showToast = function (message, type) {
    type = type || 'info'; // info | success | error | warning
    const container = utils.$('#toast-container');
    if (!container) return;

    // 清除上一个 toast
    if (toastTimer) clearTimeout(toastTimer);
    const existing = container.querySelector('.toast');
    if (existing) existing.remove();

    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    const toast = utils.createElement('div', {
      className: `toast toast-${type}`,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: '12px 20px',
        borderRadius: 'var(--radius-md)',
        background: type === 'error' ? 'var(--color-danger)' :
                    type === 'success' ? 'var(--color-success)' :
                    type === 'warning' ? 'var(--color-warning)' : 'var(--color-text)',
        color: '#fff',
        fontSize: 'var(--font-size-sm)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'toastSlideIn 0.3s ease',
        pointerEvents: 'auto',
      },
    }, `${icons[type] || ''} ${message}`);

    container.appendChild(toast);

    toastTimer = setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // ============ 确认对话框 ============

  utils.confirmDialog = function (message, title) {
    return new Promise(function (resolve) {
      title = title || '确认操作';
      const overlay = utils.createElement('div', {
        className: 'modal-overlay',
        style: { zIndex: '1100' },
      });
      const dialog = utils.createElement('div', {
        className: 'modal confirm-dialog',
        style: {
          maxWidth: '420px',
          padding: 'var(--space-lg)',
          textAlign: 'center',
        },
      });

      dialog.innerHTML = `
        <h3 style="margin-bottom:var(--space-md);font-size:var(--font-size-lg)">${title}</h3>
        <p style="margin-bottom:var(--space-lg);color:var(--color-text-secondary)">${message}</p>
        <div style="display:flex;gap:var(--space-sm);justify-content:center">
          <button class="btn btn-secondary" data-action="cancel">取消</button>
          <button class="btn btn-danger" data-action="confirm">确认</button>
        </div>
      `;

      dialog.addEventListener('click', function (e) {
        const action = e.target.dataset.action;
        if (action === 'confirm') {
          overlay.remove();
          resolve(true);
        } else if (action === 'cancel') {
          overlay.remove();
          resolve(false);
        }
      });

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
    });
  };

  // ============ 防抖 ============

  utils.debounce = function (fn, delay) {
    delay = delay || 300;
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  };

  // ============ 生成 UUID ============

  utils.generateId = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // ============ 文件处理 ============

  /** 读取文件为 Base64 Data URL */
  utils.readFileAsDataURL = function (file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /** 验证图片文件 */
  utils.validateImageFile = function (file) {
    const cfg = window.WCM.config.IMAGE_UPLOAD;
    if (!cfg.allowedTypes.includes(file.type)) {
      return { valid: false, error: '仅支持 JPG、PNG、WebP、GIF 格式' };
    }
    if (file.size > cfg.maxSize) {
      return { valid: false, error: `文件大小不能超过 ${cfg.maxSize / 1024 / 1024}MB` };
    }
    return { valid: true };
  };

  // ============ 导出 ============

  window.WCM = window.WCM || {};
  window.WCM.utils = utils;
})();
