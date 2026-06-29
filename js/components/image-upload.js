/* ============================================================
   文创品管理平台 - 图片上传组件
   依赖: config.js, utils.js
   ============================================================ */

(function () {
  'use strict';

  const imageUpload = {};
  const utils = window.WCM.utils;
  const api = window.WCM.api;

  /**
   * 创建图片上传区域
   * @param {object} options
   * @param {string} options.tier - 产品层级
   * @param {string} [options.currentUrl] - 当前图片 URL（编辑模式）
   * @param {function} options.onChange - 图片变更回调 (url, file) => void
   * @returns {HTMLElement} 上传区域 DOM
   */
  imageUpload.create = function (options) {
    const { tier, currentUrl, onChange } = options;
    let currentImageUrl = currentUrl || '';

    const zone = utils.createElement('div', {
      className: 'image-upload-zone' + (currentImageUrl ? ' has-image' : ''),
    });

    // 图片预览或占位符
    const renderContent = function () {
      zone.innerHTML = '';
      if (currentImageUrl) {
        const img = utils.createElement('img', { src: currentImageUrl, alt: '产品图片' });
        zone.appendChild(img);

        // 操作按钮
        const actions = utils.createElement('div', { className: 'image-upload-actions' });
        const changeBtn = utils.createElement('button', {
          className: 'btn btn-sm btn-secondary',
          onClick: function (e) { e.stopPropagation(); fileInput.click(); },
        }, '🔄 更换');
        const removeBtn = utils.createElement('button', {
          className: 'btn btn-sm',
          style: { color: 'var(--color-danger)', background: 'var(--color-surface)' },
          onClick: function (e) {
            e.stopPropagation();
            currentImageUrl = '';
            zone.classList.remove('has-image');
            renderContent();
            if (onChange) onChange('', null);
          },
        }, '✕ 移除');
        actions.appendChild(changeBtn);
        actions.appendChild(removeBtn);
        zone.appendChild(actions);
      } else {
        const placeholder = utils.createElement('div', { className: 'image-upload-placeholder' });
        placeholder.innerHTML = `
          <span class="upload-icon">📷</span>
          <span class="upload-text">点击或拖拽上传产品图片</span>
          <span class="upload-hint">支持 JPG / PNG / WebP / GIF，最大 10MB</span>
        `;
        zone.appendChild(placeholder);
      }
    };

    renderContent();

    // 文件选择 input（隐藏）
    const fileInput = utils.createElement('input', {
      type: 'file',
      accept: 'image/jpeg,image/png,image/webp,image/gif',
      style: { display: 'none' },
    });

    zone.appendChild(fileInput);

    // 点击上传
    zone.addEventListener('click', function () {
      fileInput.click();
    });

    // 拖拽上传
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.style.borderColor = 'var(--color-primary)';
    });

    zone.addEventListener('dragleave', function () {
      zone.style.borderColor = '';
    });

    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    });

    // 文件选择处理
    fileInput.addEventListener('change', function () {
      const file = fileInput.files[0];
      if (file) processFile(file);
    });

    async function processFile(file) {
      // 验证文件
      const validation = utils.validateImageFile(file);
      if (!validation.valid) {
        utils.showToast(validation.error, 'error');
        return;
      }

      // 显示加载状态
      zone.style.opacity = '0.6';
      zone.style.pointerEvents = 'none';

      try {
        const result = await api.uploadImage(file, tier);
        currentImageUrl = result.publicUrl;
        zone.classList.add('has-image');
        renderContent();
        if (onChange) onChange(result.publicUrl, file);
        utils.showToast('图片上传成功', 'success');
      } catch (err) {
        utils.showToast('图片上传失败: ' + err.message, 'error');
      } finally {
        zone.style.opacity = '';
        zone.style.pointerEvents = '';
      }
    }

    /** 获取当前图片 URL */
    zone.getImageUrl = function () {
      return currentImageUrl;
    };

    return zone;
  };

  // ============ 导出 ============
  window.WCM = window.WCM || {};
  window.WCM.imageUpload = imageUpload;
})();
