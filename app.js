(function () {
  'use strict';

  const P = window.LuminaProcessor;
  const PREVIEW_MAX_DIM = 1400;
  const MAX_HISTORY = 40;

  // --- DOM References ---
  const els = {
    fileInput: document.getElementById('fileInput'),
    sampleMenuBtn: document.getElementById('sampleMenuBtn'),
    sampleMenu: document.getElementById('sampleMenu'),
    trySampleBtn: document.getElementById('trySampleBtn'),

    undoBtn: document.getElementById('undoBtn'),
    redoBtn: document.getElementById('redoBtn'),
    splitToggleBtn: document.getElementById('splitToggleBtn'),
    holdCompareBtn: document.getElementById('holdCompareBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    zoomResetBtn: document.getElementById('zoomResetBtn'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    resetAllBtn: document.getElementById('resetAllBtn'),
    exportOpenBtn: document.getElementById('exportOpenBtn'),

    viewport: document.getElementById('viewport'),
    emptyState: document.getElementById('emptyState'),
    dropzoneCard: document.getElementById('dropzoneCard'),
    stageContainer: document.getElementById('stageContainer'),
    canvasWrapper: document.getElementById('canvasWrapper'),
    previewCanvas: document.getElementById('previewCanvas'),
    originalCanvas: document.getElementById('originalCanvas'),
    beforeLayer: document.getElementById('beforeLayer'),
    afterBadge: document.getElementById('afterBadge'),
    splitHandle: document.getElementById('splitHandle'),
    dragOverlay: document.getElementById('dragOverlay'),

    cropOverlay: document.getElementById('cropOverlay'),
    cropBox: document.getElementById('cropBox'),
    aspectPills: document.getElementById('aspectPills'),
    applyCropBtn: document.getElementById('applyCropBtn'),
    resetCropBtn: document.getElementById('resetCropBtn'),
    rotateLeftBtn: document.getElementById('rotateLeftBtn'),
    rotateRightBtn: document.getElementById('rotateRightBtn'),
    flipHBtn: document.getElementById('flipHBtn'),
    flipVBtn: document.getElementById('flipVBtn'),
    straighten: document.getElementById('straighten'),
    valStraighten: document.getElementById('val-straighten'),

    imageNameLabel: document.getElementById('imageNameLabel'),
    imageDimLabel: document.getElementById('imageDimLabel'),
    histogramCanvas: document.getElementById('histogramCanvas'),
    histMeta: document.getElementById('histMeta'),

    tabBtns: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),

    presetGrid: document.getElementById('presetGrid'),
    presetStrength: document.getElementById('presetStrength'),
    valPresetStrength: document.getElementById('val-presetStrength'),
    activePresetLabel: document.getElementById('activePresetLabel'),

    slidersLight: document.getElementById('sliders-light'),
    slidersColor: document.getElementById('sliders-color'),
    slidersDetail: document.getElementById('sliders-detail'),

    frameStylePills: document.getElementById('frameStylePills'),
    frameSize: document.getElementById('frameSize'),
    valFrameSize: document.getElementById('val-frameSize'),
    frameTitle: document.getElementById('frameTitle'),
    frameSubtitle: document.getElementById('frameSubtitle'),

    exportModal: document.getElementById('exportModal'),
    exportCloseBtn: document.getElementById('exportCloseBtn'),
    exportCancelBtn: document.getElementById('exportCancelBtn'),
    exportConfirmBtn: document.getElementById('exportConfirmBtn'),
    exportFilename: document.getElementById('exportFilename'),
    exportFormat: document.getElementById('exportFormat'),
    exportScale: document.getElementById('exportScale'),
    exportQuality: document.getElementById('exportQuality'),
    exportQualityRow: document.getElementById('exportQualityRow'),
    valExportQuality: document.getElementById('val-exportQuality'),
    exportOutDims: document.getElementById('exportOutDims'),
    exportOutSize: document.getElementById('exportOutSize'),

    toast: document.getElementById('toast'),
  };

  // --- App State ---
  function createDefaultState() {
    return {
      presetId: 'original',
      presetStrength: 100,
      adjustments: Object.assign({}, P.DEFAULT_ADJUSTMENTS),
      transform: {
        rotate: 0,
        flipH: false,
        flipV: false,
        straighten: 0,
        crop: { x: 0, y: 0, w: 1, h: 1 },
      },
      frame: {
        style: 'none',
        size: 6,
        title: '',
        subtitle: '',
      },
    };
  }

  function cloneState(s) {
    return JSON.parse(JSON.stringify(s));
  }

  let sourceImage = null; // HTMLImageElement or HTMLCanvasElement
  let imageFilename = 'lumina-photo';
  let state = createDefaultState();
  let history = [];
  let historyIndex = -1;

  // View / UI transient state
  let activeTab = 'presets';
  let splitCompare = false;
  let splitRatio = 0.5;
  let holdingOriginal = false;
  let zoom = 1; // 1 = fit to viewport
  let panX = 0;
  let panY = 0;
  let renderPending = false;
  let toastTimer = null;

  // Crop draft (normalized 0..1 on uncropped transformed image)
  let cropDraft = { x: 0, y: 0, w: 1, h: 1 };
  let cropAspect = null; // null = free, or number (width / height in display space)
  let exportEstimateTimer = null;

  // --- Utilities ---
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.classList.add('hidden');
    }, 2400);
  }

  function formatBytes(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  // --- History ---
  function pushHistory() {
    const snap = cloneState(state);
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    history.push(snap);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    els.undoBtn.disabled = !sourceImage || historyIndex <= 0;
    els.redoBtn.disabled = !sourceImage || historyIndex >= history.length - 1;
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    state = cloneState(history[historyIndex]);
    cropDraft = Object.assign({}, state.transform.crop);
    syncControlsFromState();
    scheduleRender();
    updateHistoryButtons();
    showToast('Đã hoàn tác');
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    state = cloneState(history[historyIndex]);
    cropDraft = Object.assign({}, state.transform.crop);
    syncControlsFromState();
    scheduleRender();
    updateHistoryButtons();
    showToast('Đã làm lại');
  }

  // --- Build Dynamic Controls ---
  function buildAdjustmentSliders() {
    const map = [
      ['light', els.slidersLight],
      ['color', els.slidersColor],
      ['detail', els.slidersDetail],
    ];

    map.forEach(([groupKey, container]) => {
      container.innerHTML = '';
      P.SLIDER_GROUPS[groupKey].forEach((cfg) => {
        const row = document.createElement('div');
        row.className = 'slider-row';

        const labelRow = document.createElement('div');
        labelRow.className = 'slider-label-row';

        const label = document.createElement('label');
        label.htmlFor = `adj-${cfg.key}`;
        label.textContent = cfg.label;
        label.title = 'Nhấn đúp để đặt về 0';

        const valEl = document.createElement('span');
        valEl.className = 'slider-val mono';
        valEl.id = `val-${cfg.key}`;
        valEl.textContent = '0';

        labelRow.appendChild(label);
        labelRow.appendChild(valEl);

        const input = document.createElement('input');
        input.type = 'range';
        input.id = `adj-${cfg.key}`;
        input.min = cfg.min;
        input.max = cfg.max;
        input.step = cfg.step;
        input.value = '0';

        const resetSingle = () => {
          if (state.adjustments[cfg.key] !== 0) {
            state.adjustments[cfg.key] = 0;
            input.value = '0';
            valEl.textContent = '0';
            pushHistory();
            scheduleRender();
          }
        };

        label.addEventListener('dblclick', resetSingle);
        input.addEventListener('dblclick', resetSingle);

        input.addEventListener('input', () => {
          const v = parseFloat(input.value);
          state.adjustments[cfg.key] = v;
          valEl.textContent = formatSliderValue(cfg.key, v);
          scheduleRender();
        });

        input.addEventListener('change', () => {
          pushHistory();
        });

        row.appendChild(labelRow);
        row.appendChild(input);
        container.appendChild(row);
      });
    });

    // Reset group buttons
    document.querySelectorAll('[data-reset-group]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!sourceImage) return;
        const grp = btn.dataset.resetGroup;
        const items = P.SLIDER_GROUPS[grp] || [];
        items.forEach((cfg) => {
          state.adjustments[cfg.key] = 0;
        });
        syncControlsFromState();
        pushHistory();
        scheduleRender();
        showToast('Đã đặt lại nhóm điều chỉnh');
      });
    });
  }

  function formatSliderValue(key, v) {
    if (key === 'blur') return v.toFixed(1);
    return (v > 0 && P.SLIDER_GROUPS.light.concat(P.SLIDER_GROUPS.color).some((s) => s.key === key))
      ? `+${v}`
      : String(v);
  }

  function buildPresetCards() {
    els.presetGrid.innerHTML = '';
    P.PRESETS.forEach((preset) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-card' + (preset.id === state.presetId ? ' active' : '');
      btn.dataset.presetId = preset.id;

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'preset-thumb-wrap';
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 240;
      thumbCanvas.height = 160;
      thumbWrap.appendChild(thumbCanvas);

      const meta = document.createElement('div');
      meta.className = 'preset-meta';
      meta.innerHTML = `<span class="preset-name">${preset.name}</span><span class="preset-desc">${preset.desc}</span>`;

      btn.appendChild(thumbWrap);
      btn.appendChild(meta);

      btn.addEventListener('click', () => {
        if (!sourceImage) return;
        state.presetId = preset.id;
        syncControlsFromState();
        pushHistory();
        scheduleRender();
      });

      els.presetGrid.appendChild(btn);
    });
  }

  function generatePresetThumbnails() {
    if (!sourceImage) return;

    // Create center-cropped 240x160 thumbnail canvas from sourceImage
    const tw = 240;
    const th = 160;
    const srcW = sourceImage.naturalWidth || sourceImage.width;
    const srcH = sourceImage.naturalHeight || sourceImage.height;
    const srcAspect = srcW / srcH;
    const dstAspect = tw / th;

    let sx = 0, sy = 0, sw = srcW, sh = srcH;
    if (srcAspect > dstAspect) {
      sw = srcH * dstAspect;
      sx = (srcW - sw) / 2;
    } else {
      sh = srcW / dstAspect;
      sy = (srcH - sh) / 2;
    }

    const baseThumb = document.createElement('canvas');
    baseThumb.width = tw;
    baseThumb.height = th;
    baseThumb.getContext('2d').drawImage(sourceImage, sx, sy, sw, sh, 0, 0, tw, th);

    const cards = els.presetGrid.querySelectorAll('.preset-card');
    cards.forEach((card) => {
      const id = card.dataset.presetId;
      const canvas = card.querySelector('canvas');
      const tempState = createDefaultState();
      tempState.presetId = id;
      tempState.presetStrength = 100;
      const res = P.renderPipeline(baseThumb, tempState, { includeFrame: false });
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, tw, th);
      ctx.drawImage(res.processedCanvas, 0, 0, tw, th);
    });
  }

  function syncControlsFromState() {
    // Adjustments
    for (const key in P.DEFAULT_ADJUSTMENTS) {
      const input = document.getElementById(`adj-${key}`);
      const valEl = document.getElementById(`val-${key}`);
      if (input && valEl) {
        const v = state.adjustments[key] || 0;
        input.value = String(v);
        valEl.textContent = formatSliderValue(key, v);
      }
    }

    // Presets
    els.presetStrength.value = String(state.presetStrength);
    els.valPresetStrength.textContent = `${state.presetStrength}%`;
    const activePreset = P.PRESETS.find((p) => p.id === state.presetId) || P.PRESETS[0];
    els.activePresetLabel.textContent = activePreset.name;
    els.presetGrid.querySelectorAll('.preset-card').forEach((card) => {
      card.classList.toggle('active', card.dataset.presetId === state.presetId);
    });

    // Transform
    els.straighten.value = String(state.transform.straighten || 0);
    els.valStraighten.textContent = `${state.transform.straighten || 0}°`;

    // Frame
    els.frameSize.value = String(state.frame.size || 6);
    els.valFrameSize.textContent = `${state.frame.size || 6}%`;
    els.frameTitle.value = state.frame.title || '';
    els.frameSubtitle.value = state.frame.subtitle || '';
    els.frameStylePills.querySelectorAll('.pill').forEach((p) => {
      p.classList.toggle('active', p.dataset.frame === state.frame.style);
    });
  }

  // --- Image Loading ---
  function loadSource(imgOrCanvas, name) {
    sourceImage = imgOrCanvas;
    imageFilename = (name || 'lumina-photo').replace(/\.[^.]+$/, '');
    state = createDefaultState();
    cropDraft = { x: 0, y: 0, w: 1, h: 1 };
    cropAspect = null;
    history = [];
    historyIndex = -1;
    splitCompare = false;
    holdingOriginal = false;
    zoom = 1;
    panX = 0;
    panY = 0;

    els.emptyState.classList.add('hidden');
    els.stageContainer.classList.remove('hidden');

    // Enable toolbar buttons
    [
      els.splitToggleBtn,
      els.holdCompareBtn,
      els.zoomOutBtn,
      els.zoomResetBtn,
      els.zoomInBtn,
      els.resetAllBtn,
      els.exportOpenBtn,
      els.applyCropBtn,
      els.resetCropBtn,
    ].forEach((b) => (b.disabled = false));

    els.splitToggleBtn.classList.remove('active');
    els.imageNameLabel.textContent = name || 'sample.jpg';
    els.exportFilename.value = `${imageFilename}-edited`;

    syncControlsFromState();
    pushHistory();
    generatePresetThumbnails();
    renderNow();
    updateCropOverlayVisibility();
    showToast(`Đã mở ảnh: ${name || 'Ảnh mẫu'}`);
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp ảnh hợp lệ (JPG, PNG, WebP...)');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      loadSource(img, file.name);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast('Không thể đọc tệp ảnh này');
    };
    img.src = url;
  }

  function loadSample(kind) {
    const names = {
      mountain: 'hoang-hon-nui-non.jpg',
      street: 'pho-dem-neon.jpg',
      portrait: 'studio-anh-sang.jpg',
    };
    const sampleCanvas = P.generateSampleImage(kind || 'mountain');
    loadSource(sampleCanvas, names[kind] || 'mau-studio.jpg');
  }

  // --- Rendering Pipeline ---
  function scheduleRender() {
    if (!sourceImage) return;
    if (!renderPending) {
      renderPending = true;
      requestAnimationFrame(() => {
        renderPending = false;
        renderNow();
      });
    }
  }

  function renderNow() {
    if (!sourceImage) return;

    const inCropMode = activeTab === 'crop';
    const renderState = cloneState(state);

    // When in Crop tab, show uncropped frame (without outer photo border) so user can freely adjust crop
    if (inCropMode) {
      renderState.transform.crop = { x: 0, y: 0, w: 1, h: 1 };
    }

    const needOrig = (splitCompare || holdingOriginal) && !inCropMode;
    const result = P.renderPipeline(sourceImage, renderState, {
      maxDim: PREVIEW_MAX_DIM,
      needOriginal: needOrig,
      includeFrame: !inCropMode,
    });

    const outCanvas = holdingOriginal && result.originalCanvas
      ? result.originalCanvas
      : result.processedCanvas;

    const pCanvas = els.previewCanvas;
    pCanvas.width = outCanvas.width;
    pCanvas.height = outCanvas.height;
    pCanvas.getContext('2d').drawImage(outCanvas, 0, 0);

    if (needOrig && result.originalCanvas) {
      const oCanvas = els.originalCanvas;
      oCanvas.width = result.originalCanvas.width;
      oCanvas.height = result.originalCanvas.height;
      oCanvas.getContext('2d').drawImage(result.originalCanvas, 0, 0);
    }

    // Fit canvas inside viewport
    fitCanvasToViewport();

    // Update dimensions badge (show true cropped dimensions)
    const trueW = Math.round(result.fullWidth * (inCropMode ? state.transform.crop.w : 1));
    const trueH = Math.round(result.fullHeight * (inCropMode ? state.transform.crop.h : 1));
    els.imageDimLabel.textContent = `${trueW} × ${trueH} px`;

    // Update Histogram
    const stats = P.drawHistogram(result.imageData, els.histogramCanvas);
    els.histMeta.textContent = `Sáng TB: ${stats.meanLum}%`;

    // Update split compare visuals
    updateSplitVisuals();

    // Update crop box visuals if in crop mode
    if (inCropMode) {
      updateCropBoxStyle();
    }
  }

  function fitCanvasToViewport() {
    if (!sourceImage) return;
    const stageRect = els.stageContainer.getBoundingClientRect();
    const availW = Math.max(120, stageRect.width - 56);
    const availH = Math.max(120, stageRect.height - 82);

    const cw = els.previewCanvas.width || 1;
    const ch = els.previewCanvas.height || 1;
    const fitScale = Math.min(availW / cw, availH / ch, 1);

    const displayW = Math.round(cw * fitScale);
    const displayH = Math.round(ch * fitScale);

    els.previewCanvas.style.width = `${displayW}px`;
    els.previewCanvas.style.height = `${displayH}px`;
    els.canvasWrapper.style.width = `${displayW}px`;
    els.canvasWrapper.style.height = `${displayH}px`;

    applyZoomTransform();
  }

  function applyZoomTransform() {
    els.canvasWrapper.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    els.zoomResetBtn.textContent = `${Math.round(zoom * 100)}%`;
  }

  function setZoom(newZoom) {
    zoom = clamp(Math.round(newZoom * 100) / 100, 0.25, 4);
    if (zoom <= 1) {
      panX = 0;
      panY = 0;
    }
    applyZoomTransform();
  }

  // --- Before / After Split ---
  function updateSplitVisuals() {
    const showSplit = splitCompare && !holdingOriginal && activeTab !== 'crop' && Boolean(sourceImage);
    els.beforeLayer.classList.toggle('hidden', !showSplit);
    els.afterBadge.classList.toggle('hidden', !showSplit);
    els.splitHandle.classList.toggle('hidden', !showSplit);

    if (showSplit) {
      const pct = clamp(splitRatio * 100, 0, 100);
      els.beforeLayer.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      els.splitHandle.style.left = `${pct}%`;
    }
  }

  function initSplitHandle() {
    let dragging = false;

    const updateFromClientX = (clientX) => {
      const rect = els.canvasWrapper.getBoundingClientRect();
      if (rect.width <= 0) return;
      splitRatio = clamp((clientX - rect.left) / rect.width, 0.02, 0.98);
      updateSplitVisuals();
    };

    els.splitHandle.addEventListener('pointerdown', (e) => {
      dragging = true;
      els.splitHandle.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });

    els.splitHandle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      updateFromClientX(e.clientX);
    });

    els.splitHandle.addEventListener('pointerup', () => {
      dragging = false;
    });

    els.splitHandle.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        splitRatio = clamp(splitRatio - 0.03, 0.02, 0.98);
        updateSplitVisuals();
      } else if (e.key === 'ArrowRight') {
        splitRatio = clamp(splitRatio + 0.03, 0.02, 0.98);
        updateSplitVisuals();
      }
    });
  }

  // --- Interactive Crop ---
  function updateCropOverlayVisibility() {
    const show = activeTab === 'crop' && Boolean(sourceImage);
    els.cropOverlay.classList.toggle('hidden', !show);
    if (show) {
      cropDraft = Object.assign({}, state.transform.crop);
      updateCropBoxStyle();
    }
  }

  function updateCropBoxStyle() {
    els.cropBox.style.left = `${cropDraft.x * 100}%`;
    els.cropBox.style.top = `${cropDraft.y * 100}%`;
    els.cropBox.style.width = `${cropDraft.w * 100}%`;
    els.cropBox.style.height = `${cropDraft.h * 100}%`;
  }

  function enforceCropAspect(aspect) {
    cropAspect = aspect;
    if (!aspect || !sourceImage) return;

    const cw = els.previewCanvas.width || 1;
    const ch = els.previewCanvas.height || 1;
    const imgAspect = cw / ch;
    // Normalized height/width ratio to achieve target pixel aspect:
    // (w * cw) / (h * ch) = aspect  =>  w / h = aspect / imgAspect
    const normRatio = aspect / imgAspect;

    const cx = cropDraft.x + cropDraft.w / 2;
    const cy = cropDraft.y + cropDraft.h / 2;
    let w = cropDraft.w;
    let h = w / normRatio;

    if (h > 1) {
      h = 1;
      w = h * normRatio;
    }
    if (w > 1) {
      w = 1;
      h = w / normRatio;
    }

    const x = clamp(cx - w / 2, 0, 1 - w);
    const y = clamp(cy - h / 2, 0, 1 - h);
    cropDraft = { x, y, w, h };
    updateCropBoxStyle();
  }

  function initCropInteractions() {
    let mode = null; // 'move' or handle name ('nw', 'se', etc.)
    let startX = 0;
    let startY = 0;
    let startCrop = null;

    els.cropBox.addEventListener('pointerdown', (e) => {
      if (!sourceImage) return;
      const handle = e.target.dataset && e.target.dataset.handle;
      mode = handle || 'move';
      startX = e.clientX;
      startY = e.clientY;
      startCrop = Object.assign({}, cropDraft);
      els.cropBox.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });

    els.cropBox.addEventListener('pointermove', (e) => {
      if (!mode || !startCrop) return;
      const rect = els.cropOverlay.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dx = (e.clientX - startX) / rect.width;
      const dy = (e.clientY - startY) / rect.height;
      const minSize = 0.08;

      if (mode === 'move') {
        cropDraft.x = clamp(startCrop.x + dx, 0, 1 - startCrop.w);
        cropDraft.y = clamp(startCrop.y + dy, 0, 1 - startCrop.h);
        updateCropBoxStyle();
        return;
      }

      let left = startCrop.x;
      let top = startCrop.y;
      let right = startCrop.x + startCrop.w;
      let bottom = startCrop.y + startCrop.h;

      if (mode.includes('w')) left = clamp(startCrop.x + dx, 0, right - minSize);
      if (mode.includes('e')) right = clamp(startCrop.x + startCrop.w + dx, left + minSize, 1);
      if (mode.includes('n')) top = clamp(startCrop.y + dy, 0, bottom - minSize);
      if (mode.includes('s')) bottom = clamp(startCrop.y + startCrop.h + dy, top + minSize, 1);

      let w = right - left;
      let h = bottom - top;

      if (cropAspect) {
        const cw = els.previewCanvas.width || 1;
        const ch = els.previewCanvas.height || 1;
        const normRatio = cropAspect / (cw / ch);

        if (mode === 'n' || mode === 's') {
          w = h * normRatio;
          if (left + w > 1) {
            w = 1 - left;
            h = w / normRatio;
          }
        } else {
          h = w / normRatio;
          if (mode.includes('n')) {
            top = bottom - h;
            if (top < 0) {
              top = 0;
              h = bottom;
              w = h * normRatio;
              if (mode.includes('w')) left = right - w;
            }
          } else if (top + h > 1) {
            h = 1 - top;
            w = h * normRatio;
            if (mode.includes('w')) left = right - w;
          }
        }
      }

      cropDraft = {
        x: clamp(left, 0, 1 - minSize),
        y: clamp(top, 0, 1 - minSize),
        w: clamp(w, minSize, 1 - clamp(left, 0, 1 - minSize)),
        h: clamp(h, minSize, 1 - clamp(top, 0, 1 - minSize)),
      };
      updateCropBoxStyle();
    });

    els.cropBox.addEventListener('pointerup', () => {
      mode = null;
      startCrop = null;
    });

    // Aspect ratio pills
    els.aspectPills.querySelectorAll('.pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        els.aspectPills.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const raw = pill.dataset.aspect;
        const aspect = raw === 'free' ? null : parseFloat(raw);
        enforceCropAspect(aspect);
      });
    });

    els.applyCropBtn.addEventListener('click', () => {
      if (!sourceImage) return;
      state.transform.crop = Object.assign({}, cropDraft);
      pushHistory();
      switchTab('adjust');
      showToast('Đã áp dụng vùng cắt');
    });

    els.resetCropBtn.addEventListener('click', () => {
      if (!sourceImage) return;
      cropDraft = { x: 0, y: 0, w: 1, h: 1 };
      state.transform.crop = { x: 0, y: 0, w: 1, h: 1 };
      state.transform.straighten = 0;
      els.straighten.value = '0';
      els.valStraighten.textContent = '0°';
      els.aspectPills.querySelectorAll('.pill').forEach((p) => {
        p.classList.toggle('active', p.dataset.aspect === 'free');
      });
      cropAspect = null;
      updateCropBoxStyle();
      pushHistory();
      scheduleRender();
      showToast('Đã khôi phục khung hình gốc');
    });
  }

  // --- Pan when zoomed ---
  function initPanZoom() {
    let panning = false;
    let startX = 0;
    let startY = 0;
    let origPanX = 0;
    let origPanY = 0;

    els.stageContainer.addEventListener('pointerdown', (e) => {
      if (!sourceImage || zoom <= 1) return;
      if (e.target.closest('.split-handle') || e.target.closest('.crop-box')) return;
      panning = true;
      startX = e.clientX;
      startY = e.clientY;
      origPanX = panX;
      origPanY = panY;
      els.stageContainer.style.cursor = 'grabbing';
    });

    window.addEventListener('pointermove', (e) => {
      if (!panning) return;
      panX = origPanX + (e.clientX - startX);
      panY = origPanY + (e.clientY - startY);
      applyZoomTransform();
    });

    window.addEventListener('pointerup', () => {
      if (panning) {
        panning = false;
        els.stageContainer.style.cursor = '';
      }
    });

    els.viewport.addEventListener('wheel', (e) => {
      if (!sourceImage) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoom(zoom + delta);
      }
    }, { passive: false });
  }

  // --- Tabs ---
  function switchTab(tabName) {
    activeTab = tabName;
    els.tabBtns.forEach((btn) => {
      const isAct = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isAct);
      btn.setAttribute('aria-selected', String(isAct));
    });
    els.tabPanes.forEach((pane) => {
      pane.classList.toggle('active', pane.id === `tab-${tabName}`);
    });
    updateCropOverlayVisibility();
    scheduleRender();
  }

  // --- Export Modal ---
  function renderExportCanvas() {
    const scaleVal = els.exportScale.value;
    let maxDim = null;
    if (scaleVal === '2048' || scaleVal === '1200') {
      maxDim = parseInt(scaleVal, 10);
    } else if (scaleVal !== '1') {
      const ratio = parseFloat(scaleVal);
      const srcW = sourceImage.naturalWidth || sourceImage.width;
      const srcH = sourceImage.naturalHeight || sourceImage.height;
      const rot = ((state.transform.rotate % 360) + 360) % 360;
      const swapped = rot === 90 || rot === 270;
      const baseW = (swapped ? srcH : srcW) * state.transform.crop.w;
      const baseH = (swapped ? srcW : srcH) * state.transform.crop.h;
      maxDim = Math.max(1, Math.round(Math.max(baseW, baseH) * ratio));
    }

    const res = P.renderPipeline(sourceImage, state, {
      maxDim,
      needOriginal: false,
      includeFrame: true,
    });
    return res.processedCanvas;
  }

  function updateExportEstimate() {
    if (!sourceImage || els.exportModal.classList.contains('hidden')) return;
    const fmt = els.exportFormat.value;
    const isPng = fmt === 'image/png';
    els.exportQualityRow.classList.toggle('hidden', isPng);
    els.exportOutSize.textContent = 'Đang tính...';

    clearTimeout(exportEstimateTimer);
    exportEstimateTimer = setTimeout(() => {
      const canvas = renderExportCanvas();
      els.exportOutDims.textContent = `${canvas.width} × ${canvas.height} px`;
      const quality = parseInt(els.exportQuality.value, 10) / 100;
      canvas.toBlob(
        (blob) => {
          els.exportOutSize.textContent = blob ? formatBytes(blob.size) : '—';
        },
        fmt,
        isPng ? undefined : quality
      );
    }, 120);
  }

  function openExportModal() {
    if (!sourceImage) return;
    els.exportModal.classList.remove('hidden');
    updateExportEstimate();
  }

  function closeExportModal() {
    els.exportModal.classList.add('hidden');
  }

  function performExport() {
    if (!sourceImage) return;
    const fmt = els.exportFormat.value;
    const ext = fmt === 'image/png' ? 'png' : fmt === 'image/webp' ? 'webp' : 'jpg';
    const quality = parseInt(els.exportQuality.value, 10) / 100;
    const rawName = (els.exportFilename.value || 'lumina-edited').trim().replace(/[<>:"/\\|?*]+/g, '-');

    const canvas = renderExportCanvas();
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          showToast('Lỗi khi tạo tệp ảnh');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${rawName}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        closeExportModal();
        showToast(`Đã tải xuống ${rawName}.${ext} (${formatBytes(blob.size)})`);
      },
      fmt,
      fmt === 'image/png' ? undefined : quality
    );
  }

  // --- Wire Events ---
  function bindEvents() {
    // File upload
    els.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        loadFile(e.target.files[0]);
        e.target.value = '';
      }
    });

    // Sample menu
    els.sampleMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      els.sampleMenu.classList.toggle('open');
    });
    document.addEventListener('click', () => {
      els.sampleMenu.classList.remove('open');
    });
    els.sampleMenu.querySelectorAll('.dropdown-item').forEach((item) => {
      item.addEventListener('click', () => {
        els.sampleMenu.classList.remove('open');
        loadSample(item.dataset.sample);
      });
    });
    els.trySampleBtn.addEventListener('click', () => loadSample('mountain'));

    // Drag & Drop
    let dragCounter = 0;
    els.viewport.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (sourceImage) {
        els.dragOverlay.classList.remove('hidden');
      } else {
        els.dropzoneCard.classList.add('drag-over');
      }
    });
    els.viewport.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    els.viewport.addEventListener('dragleave', () => {
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) {
        els.dragOverlay.classList.add('hidden');
        els.dropzoneCard.classList.remove('drag-over');
      }
    });
    els.viewport.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      els.dragOverlay.classList.add('hidden');
      els.dropzoneCard.classList.remove('drag-over');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) loadFile(file);
    });

    // Clipboard Paste
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const item of items) {
        if (item.type && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            loadFile(file);
            break;
          }
        }
      }
    });

    // Undo / Redo
    els.undoBtn.addEventListener('click', undo);
    els.redoBtn.addEventListener('click', redo);

    // Split Compare
    els.splitToggleBtn.addEventListener('click', () => {
      if (!sourceImage) return;
      if (activeTab === 'crop') switchTab('adjust');
      splitCompare = !splitCompare;
      els.splitToggleBtn.classList.toggle('active', splitCompare);
      scheduleRender();
    });

    // Hold to Compare Original
    const startHold = () => {
      if (!sourceImage) return;
      holdingOriginal = true;
      els.holdCompareBtn.classList.add('active');
      scheduleRender();
    };
    const endHold = () => {
      if (!holdingOriginal) return;
      holdingOriginal = false;
      els.holdCompareBtn.classList.remove('active');
      scheduleRender();
    };
    els.holdCompareBtn.addEventListener('pointerdown', startHold);
    window.addEventListener('pointerup', endHold);
    els.holdCompareBtn.addEventListener('pointerleave', endHold);

    // Zoom
    els.zoomInBtn.addEventListener('click', () => setZoom(zoom + 0.25));
    els.zoomOutBtn.addEventListener('click', () => setZoom(zoom - 0.25));
    els.zoomResetBtn.addEventListener('click', () => setZoom(1));

    // Reset All
    els.resetAllBtn.addEventListener('click', () => {
      if (!sourceImage) return;
      state = createDefaultState();
      cropDraft = { x: 0, y: 0, w: 1, h: 1 };
      syncControlsFromState();
      pushHistory();
      scheduleRender();
      showToast('Đã đặt lại tất cả chỉnh sửa');
    });

    // Tabs
    els.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Preset strength
    els.presetStrength.addEventListener('input', () => {
      state.presetStrength = parseInt(els.presetStrength.value, 10);
      els.valPresetStrength.textContent = `${state.presetStrength}%`;
      scheduleRender();
    });
    els.presetStrength.addEventListener('change', () => {
      if (sourceImage) pushHistory();
    });

    // Rotate / Flip / Straighten
    els.rotateLeftBtn.addEventListener('click', () => {
      if (!sourceImage) return;
      state.transform.rotate = (state.transform.rotate - 90 + 360) % 360;
      pushHistory();
      scheduleRender();
    });
    els.rotateRightBtn.addEventListener('click', () => {
      if (!sourceImage) return;
      state.transform.rotate = (state.transform.rotate + 90) % 360;
      pushHistory();
      scheduleRender();
    });
    els.flipHBtn.addEventListener('click', () => {
      if (!sourceImage) return;
      state.transform.flipH = !state.transform.flipH;
      pushHistory();
      scheduleRender();
    });
    els.flipVBtn.addEventListener('click', () => {
      if (!sourceImage) return;
      state.transform.flipV = !state.transform.flipV;
      pushHistory();
      scheduleRender();
    });
    els.straighten.addEventListener('input', () => {
      const deg = parseFloat(els.straighten.value);
      state.transform.straighten = deg;
      els.valStraighten.textContent = `${deg}°`;
      scheduleRender();
    });
    els.straighten.addEventListener('change', () => {
      if (sourceImage) pushHistory();
    });
    els.straighten.addEventListener('dblclick', () => {
      if (!sourceImage) return;
      state.transform.straighten = 0;
      els.straighten.value = '0';
      els.valStraighten.textContent = '0°';
      pushHistory();
      scheduleRender();
    });

    // Frame tab
    els.frameStylePills.querySelectorAll('.pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        if (!sourceImage) return;
        state.frame.style = pill.dataset.frame;
        syncControlsFromState();
        pushHistory();
        scheduleRender();
      });
    });
    els.frameSize.addEventListener('input', () => {
      state.frame.size = parseInt(els.frameSize.value, 10);
      els.valFrameSize.textContent = `${state.frame.size}%`;
      scheduleRender();
    });
    els.frameSize.addEventListener('change', () => {
      if (sourceImage) pushHistory();
    });
    els.frameTitle.addEventListener('input', () => {
      state.frame.title = els.frameTitle.value;
      scheduleRender();
    });
    els.frameTitle.addEventListener('change', () => {
      if (sourceImage) pushHistory();
    });
    els.frameSubtitle.addEventListener('input', () => {
      state.frame.subtitle = els.frameSubtitle.value;
      scheduleRender();
    });
    els.frameSubtitle.addEventListener('change', () => {
      if (sourceImage) pushHistory();
    });

    // Export Modal
    els.exportOpenBtn.addEventListener('click', openExportModal);
    els.exportCloseBtn.addEventListener('click', closeExportModal);
    els.exportCancelBtn.addEventListener('click', closeExportModal);
    els.exportConfirmBtn.addEventListener('click', performExport);
    els.exportModal.addEventListener('click', (e) => {
      if (e.target === els.exportModal) closeExportModal();
    });
    els.exportFormat.addEventListener('change', updateExportEstimate);
    els.exportScale.addEventListener('change', updateExportEstimate);
    els.exportQuality.addEventListener('input', () => {
      els.valExportQuality.textContent = `${els.exportQuality.value}%`;
      updateExportEstimate();
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (inInput) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (inInput) return;
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        els.fileInput.click();
      } else if (e.key === 'Escape' && !els.exportModal.classList.contains('hidden')) {
        closeExportModal();
      } else if (!inInput && e.key === '\\' && sourceImage && !holdingOriginal) {
        holdingOriginal = true;
        els.holdCompareBtn.classList.add('active');
        scheduleRender();
      } else if (!inInput && sourceImage && (e.key === '+' || e.key === '=')) {
        setZoom(zoom + 0.25);
      } else if (!inInput && sourceImage && e.key === '-') {
        setZoom(zoom - 0.25);
      } else if (!inInput && sourceImage && e.key === '0') {
        setZoom(1);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === '\\' && holdingOriginal) {
        holdingOriginal = false;
        els.holdCompareBtn.classList.remove('active');
        scheduleRender();
      }
    });

    window.addEventListener('resize', () => {
      fitCanvasToViewport();
    });
  }

  // --- Init ---
  buildAdjustmentSliders();
  buildPresetCards();
  initSplitHandle();
  initCropInteractions();
  initPanZoom();
  bindEvents();
  P.drawHistogram(null, els.histogramCanvas);
})();
