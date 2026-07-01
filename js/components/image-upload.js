/* ============================================================
   文创品管理平台 - 图片上传组件（支持多图）
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
   * @param {string[]} [options.existingImages] - 已有图片 URL 列表（编辑模式）
   * @param {function} options.onChange - 图片变更回调 (urls[]) => void
   * @returns {HTMLElement} 上传区域容器 DOM
   */
  imageUpload.create = function (options) {
    const { tier, existingImages, onChange } = options;
    let _imageUrls = existingImages && existingImages.length > 0 ? [...existingImages] : [];

    const container = utils.createElement('div', { className: 'image-upload-container' });

    // --- 缩略图网格 ---
    const thumbGrid = utils.createElement('div', { className: 'image-thumb-grid' });
    container.appendChild(thumbGrid);

    // --- 添加上传区域 ---
    const addZone = utils.createElement('div', { className: 'image-upload-add' });
    addZone.innerHTML = '<span style="font-size:28px;opacity:0.4">＋</span><span style="font-size:12px;color:var(--color-text-muted)">上传图片</span>';
    container.appendChild(addZone);

    // 隐藏的文件 input
    const fileInput = utils.createElement('input', {
      type: 'file',
      accept: 'image/jpeg,image/png,image/webp,image/gif',
      style: { display: 'none' },
      multiple: true,
    });
    container.appendChild(fileInput);

    // --- 渲染缩略图 ---
    function renderThumbs() {
      thumbGrid.innerHTML = '';
      _imageUrls.forEach(function (url, idx) {
        const thumb = utils.createElement('div', { className: 'image-thumb-item' });
        thumb.innerHTML = `<img src="${url}" alt="">`;

        const delBtn = utils.createElement('button', {
          className: 'image-thumb-delete',
          onClick: function (e) {
            e.stopPropagation();
            removeImage(idx);
          },
        }, '✕');
        thumb.appendChild(delBtn);

        // 点击缩略图打开灯箱
        thumb.addEventListener('click', function (e) {
          if (e.target === delBtn) return;
          const overlay = document.querySelector('#lightbox-overlay');
          const imgEl = document.querySelector('#lightbox-image');
          if (overlay && imgEl) {
            imgEl.src = url;
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
          }
        });

        thumbGrid.appendChild(thumb);
      });
    }

    function notifyChange() {
      if (onChange) onChange(_imageUrls.slice());
    }

    function removeImage(idx) {
      _imageUrls.splice(idx, 1);
      renderThumbs();
      notifyChange();
    }

    // --- 上传触发 ---
    function triggerUpload() {
      fileInput.click();
    }

    addZone.addEventListener('click', triggerUpload);

    // 拖拽上传
    addZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      addZone.style.borderColor = 'var(--color-primary)';
    });
    addZone.addEventListener('dragleave', function () {
      addZone.style.borderColor = '';
    });
    addZone.addEventListener('drop', function (e) {
      e.preventDefault();
      addZone.style.borderColor = '';
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) processFiles(files);
    });

    fileInput.addEventListener('change', function () {
      const files = Array.from(fileInput.files);
      if (files.length > 0) processFiles(files);
      fileInput.value = '';
    });

    async function processFiles(files) {
      let successCount = 0;
      const total = files.length;

      for (const file of files) {
        const validation = utils.validateImageFile(file);
        if (!validation.valid) {
          utils.showToast(validation.error, 'error');
          continue;
        }

        // 上传中状态：添加一个占位缩略图
        const placeIdx = _imageUrls.length;
        _imageUrls.push('__uploading__');
        renderThumbs();
        // 高亮占位
        const items = thumbGrid.querySelectorAll('.image-thumb-item');
        if (items[placeIdx]) items[placeIdx].style.opacity = '0.5';

        try {
          const result = await api.uploadImage(file, tier);
          _imageUrls[placeIdx] = result.publicUrl;
          successCount++;
        } catch (err) {
          _imageUrls.splice(placeIdx, 1);
          utils.showToast('图片上传失败: ' + err.message, 'error');
        }
      }

      renderThumbs();
      notifyChange();

      if (successCount > 0 && total > 1) {
        utils.showToast(`${successCount}/${total} 张图片上传成功`, 'success');
      } else if (successCount === 1) {
        utils.showToast('图片上传成功', 'success');
      }
    }

    /** 获取当前所有图片 URL 列表 */
    container.getImages = function () {
      return _imageUrls.slice();
    };

    // 初始渲染
    renderThumbs();

    return container;
  };

  // ============ 导出 ============
  window.WCM = window.WCM || {};
  window.WCM.imageUpload = imageUpload;
})();
