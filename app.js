(function () {
  'use strict';

  const P = window.LuminaProcessor;
  const AI = window.LuminaAI;
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
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIconMoon: document.getElementById('themeIconMoon'),
    themeIconSun: document.getElementById('themeIconSun'),
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
    presetCatPills: document.getElementById('presetCatPills'),
    presetStrength: document.getElementById('presetStrength'),
    valPresetStrength: document.getElementById('val-presetStrength'),
    activePresetLabel: document.getElementById('activePresetLabel'),

    autoEnhanceBtn: document.getElementById('autoEnhanceBtn'),
    adjustModeTabs: document.getElementById('adjustModeTabs'),
    adjPaneBasic: document.getElementById('adjPane-basic'),
    adjPaneHsl: document.getElementById('adjPane-hsl'),

    hslSwatches: document.getElementById('hslSwatches'),
    hslActiveSwatch: document.getElementById('hslActiveSwatch'),
    hslActiveName: document.getElementById('hslActiveName'),
    hslHue: document.getElementById('hslHue'),
    hslSat: document.getElementById('hslSat'),
    hslLum: document.getElementById('hslLum'),
    valHslHue: document.getElementById('val-hslHue'),
    valHslSat: document.getElementById('val-hslSat'),
    valHslLum: document.getElementById('val-hslLum'),
    hslResetChannelBtn: document.getElementById('hslResetChannelBtn'),
    hslResetAllBtn: document.getElementById('hslResetAllBtn'),

    slidersLight: document.getElementById('sliders-light'),
    slidersColor: document.getElementById('sliders-color'),
    slidersDetail: document.getElementById('sliders-detail'),

    mobileStageBar: document.getElementById('mobileStageBar'),
    mobileSplitBtn: document.getElementById('mobileSplitBtn'),
    mobileHoldOrigBtn: document.getElementById('mobileHoldOrigBtn'),
    mobileResetBtn: document.getElementById('mobileResetBtn'),
    stageDimChip: document.getElementById('stageDimChip'),

    mobileAdjTitle: document.getElementById('mobileAdjTitle'),
    mobileAdjVal: document.getElementById('mobileAdjVal'),
    mobileAdjRange: document.getElementById('mobileAdjRange'),
    mobileAdjResetSingle: document.getElementById('mobileAdjResetSingle'),
    mobileToolStrip: document.getElementById('mobileToolStrip'),

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

    // Floating AI Chat Bubble & Unified Assistant elements
    aiFab: document.getElementById('aiFab'),
    aiFabDot: document.getElementById('aiFabDot'),
    aiChatWindow: document.getElementById('aiChatWindow'),
    aiChatCloseBtn: document.getElementById('aiChatCloseBtn'),
    aiChatClearBtn: document.getElementById('aiChatClearBtn'),
    aiChatFeed: document.getElementById('aiChatFeed'),
    aiModeTabs: document.getElementById('aiModeTabs'),
    aiConfigBtn: document.getElementById('aiConfigBtn'),
    aiKeyDot: document.getElementById('aiKeyDot'),
    aiKeyLabel: document.getElementById('aiKeyLabel'),
    aiOpenEraserBtn: document.getElementById('aiOpenEraserBtn'),
    aiQuickChips: document.getElementById('aiQuickChips'),
    aiPromptForm: document.getElementById('aiPromptForm'),
    aiPromptInput: document.getElementById('aiPromptInput'),
    aiMicBtn: document.getElementById('aiMicBtn'),
    aiSendBtn: document.getElementById('aiSendBtn'),
    aiSpinner: document.getElementById('aiSpinner'),

    aiConfigModal: document.getElementById('aiConfigModal'),
    aiConfigCloseBtn: document.getElementById('aiConfigCloseBtn'),
    aiApiKeyInput: document.getElementById('aiApiKeyInput'),
    aiKeyClearBtn: document.getElementById('aiKeyClearBtn'),
    aiKeyTestBtn: document.getElementById('aiKeyTestBtn'),
    aiKeyTestStatus: document.getElementById('aiKeyTestStatus'),
    aiKeySaveBtn: document.getElementById('aiKeySaveBtn'),

    // Floating Magic Eraser elements
    aiEraseFloat: document.getElementById('aiEraseFloat'),
    eraserBackChatBtn: document.getElementById('eraserBackChatBtn'),
    eraserDoneBtn: document.getElementById('eraserDoneBtn'),
    eraserCanvas: document.getElementById('eraserCanvas'),
    brushCursor: document.getElementById('brushCursor'),
    eraserSize: document.getElementById('eraserSize'),
    valEraserSize: document.getElementById('val-eraserSize'),
    eraserUndoBtn: document.getElementById('eraserUndoBtn'),
  };

  // --- App State ---
  function createDefaultState() {
    return {
      presetId: 'original',
      presetStrength: 100,
      adjustments: Object.assign({}, P.DEFAULT_ADJUSTMENTS),
      hsl: P.createDefaultHSL(),
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

  let sourceImage = null; // Current active HTMLImageElement or HTMLCanvasElement
  let originalSourceImage = null; // Original uploaded image (preserved for Before/After & Reset)
  let imageFilename = 'lumina-photo';
  let state = createDefaultState();
  let history = [];
  let historyIndex = -1;

  // AI transient state
  let aiMode = 'color'; // 'color' | 'generative'
  let aiChatOpen = false;
  let eraserActive = false;
  let aiBusy = false;
  let aiPrevInteractionId = null;
  let geminiPaidImageBlocked = false;
  let eraserBrushPx = 22;

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
  let activeMobileTool = 'exposure';
  let activePresetCat = 'all';
  let activeHslChannel = 'orange';

  const MOBILE_TOOLS = [
    { key: 'exposure',    short: 'Độ sáng',    icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>' },
    { key: 'contrast',    short: 'Tương phản', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" stroke="none"/>' },
    { key: 'temperature', short: 'Độ ấm',      icon: '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>' },
    { key: 'skinGlow',    short: 'Tôn da VIP', icon: '<path d="M12 3l1.6 4.8L18.5 9.5l-4.9 1.7L12 16l-1.6-4.8L5.5 9.5l4.9-1.7L12 3z"/>' },
    { key: 'vibrance',    short: 'Độ tươi',    icon: '<polygon points="12 2 15 9 22 9.5 16.5 14 18.2 21 12 17.2 5.8 21 7.5 14 2 9.5 9 9 12 2"/>' },
    { key: 'clarity',     short: 'Trong trẻo', icon: '<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>' },
    { key: 'dehaze',      short: 'Khử sương',  icon: '<path d="M3 15h18M5 11h14M7 7h10M9 19h6"/>' },
    { key: 'glow',        short: 'Sáng mơ',    icon: '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8" stroke-dasharray="2 3"/>' },
    { key: 'bokeh',       short: 'Xóa phông',  icon: '<circle cx="12" cy="11" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/><circle cx="5" cy="6" r="1.3"/><circle cx="19" cy="7" r="1.5"/>' },
    { key: 'highlights',  short: 'Vùng sáng',  icon: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 3"/>' },
    { key: 'shadows',     short: 'Vùng tối',   icon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>' },
    { key: 'saturation',  short: 'Bão hòa',    icon: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>' },
    { key: 'sharpen',     short: 'Sắc nét',    icon: '<polygon points="12 3 21 19 3 19 12 3"/>' },
    { key: 'vignette',    short: 'Tối góc',    icon: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="5"/>' },
    { key: 'fade',        short: 'Phim mờ',    icon: '<path d="M3 17l6-6 4 4 8-8"/><path d="M3 21h18"/>' },
    { key: 'grain',       short: 'Hạt phim',   icon: '<circle cx="6" cy="6" r="1.2" fill="currentColor"/><circle cx="12" cy="8" r="1.2" fill="currentColor"/><circle cx="18" cy="6" r="1.2" fill="currentColor"/><circle cx="8" cy="14" r="1.2" fill="currentColor"/><circle cx="15" cy="13" r="1.2" fill="currentColor"/><circle cx="12" cy="18" r="1.2" fill="currentColor"/><circle cx="18" cy="18" r="1.2" fill="currentColor"/>' },
    { key: 'tint',        short: 'Sắc thái',   icon: '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>' },
    { key: 'whites',      short: 'Điểm trắng', icon: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/>' },
    { key: 'blacks',      short: 'Điểm đen',   icon: '<circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.25"/><circle cx="12" cy="12" r="8"/>' },
    { key: 'blur',        short: 'Làm mờ',     icon: '<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="4"/>' },
    { key: 'sepia',       short: 'Cổ điển',    icon: '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="M20 15l-5-5-9 9"/>' },
  ];

  function findSliderConfig(key) {
    const all = P.SLIDER_GROUPS.light.concat(P.SLIDER_GROUPS.color, P.SLIDER_GROUPS.detail);
    return all.find((c) => c.key === key) || all[0];
  }

  // --- Pro Precision Finger-Tracking Slider Controller ---
  const proSliderMap = new Map();

  function getBubbleTextForSlider(input, val) {
    const id = input.id;
    if (id === 'mobileAdjRange') return formatSliderValue(activeMobileTool, val);
    if (id === 'presetStrength' || id === 'frameSize' || id === 'exportQuality') return `${val}%`;
    if (id === 'eraserSize') return `${val}px`;
    if (id === 'straighten') return `${val}°`;
    if (id === 'hslHue' || id === 'hslSat' || id === 'hslLum') return val > 0 ? `+${val}` : String(val);
    if (id.startsWith('adj-')) return formatSliderValue(id.slice(4), val);
    return String(val);
  }

  function getDefaultResetForSlider(input) {
    const id = input.id;
    if (id === 'presetStrength') return 100;
    if (id === 'frameSize') return 6;
    if (id === 'exportQuality') return 92;
    if (id === 'eraserSize') return 22;
    return 0;
  }

  function syncProSlider(input) {
    const ui = proSliderMap.get(input);
    if (!ui) return;

    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const val = parseFloat(input.value);
    const span = max - min || 1;
    const pct = clamp(((val - min) / span) * 100, 0, 100);
    const isBipolar = min < 0 && max > 0;

    // Sync colored track mode (temperature, tint, hue)
    const trackType = input.dataset.track || (input.classList.contains('range-hue') ? 'hue' : '');
    if (trackType) ui.wrap.dataset.track = trackType;
    else delete ui.wrap.dataset.track;

    ui.zero.style.display = isBipolar ? 'block' : 'none';
    if (isBipolar) {
      const zeroPct = ((0 - min) / span) * 100;
      ui.zero.style.left = `${zeroPct}%`;
      const left = Math.min(zeroPct, pct);
      const width = Math.abs(pct - zeroPct);
      ui.fill.style.left = `${left}%`;
      ui.fill.style.width = `${width}%`;
    } else {
      ui.fill.style.left = '0%';
      ui.fill.style.width = `${pct}%`;
    }

    ui.thumb.style.left = `${pct}%`;
    ui.bubble.textContent = getBubbleTextForSlider(input, val);

    // Keep floating bubble inside viewport edges near 0% or 100%
    if (pct < 12) {
      ui.bubble.style.left = '100%';
    } else if (pct > 88) {
      ui.bubble.style.left = '0%';
    } else {
      ui.bubble.style.left = '50%';
    }
  }

  function syncAllProSliders() {
    proSliderMap.forEach((_, input) => syncProSlider(input));
  }

  function enhanceRangeSlider(input) {
    if (!input || proSliderMap.has(input)) return;
    const parent = input.parentNode;
    if (!parent) return;

    const wrap = document.createElement('div');
    wrap.className = 'pro-slider';

    const track = document.createElement('div');
    track.className = 'pro-slider-track';

    const ticks = document.createElement('div');
    ticks.className = 'pro-slider-ticks';
    const zero = document.createElement('div');
    zero.className = 'pro-slider-zero';
    const fill = document.createElement('div');
    fill.className = 'pro-slider-fill';

    track.appendChild(ticks);
    track.appendChild(zero);
    track.appendChild(fill);

    const thumb = document.createElement('div');
    thumb.className = 'pro-slider-thumb';
    const bubble = document.createElement('div');
    bubble.className = 'pro-slider-bubble';
    thumb.appendChild(bubble);

    parent.insertBefore(wrap, input);
    wrap.appendChild(track);
    wrap.appendChild(thumb);
    input.classList.add('pro-slider-native');
    wrap.appendChild(input);

    proSliderMap.set(input, { wrap, track, zero, fill, thumb, bubble });

    let dragging = false;
    let moved = false;
    let startVal = parseFloat(input.value);
    let lastTapTime = 0;

    const quantize = (raw, min, max, step) => {
      const steps = Math.round((raw - min) / step);
      const snapped = min + steps * step;
      // Avoid float noise like 0.30000000000000004
      const decimals = (String(step).split('.')[1] || '').length;
      return clamp(Number(snapped.toFixed(decimals)), min, max);
    };

    const updateFromClientX = (clientX) => {
      const rect = track.getBoundingClientRect();
      if (rect.width <= 0) return;
      const min = parseFloat(input.min);
      const max = parseFloat(input.max);
      const step = parseFloat(input.step) || 1;
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);

      let nextVal = quantize(min + ratio * (max - min), min, max, step);
      // Gentle magnetic feel right on exact center 0
      if (min < 0 && max > 0) {
        const zeroRatio = (0 - min) / (max - min);
        if (Math.abs(ratio - zeroRatio) < 0.007) {
          nextVal = 0;
        }
      }

      if (parseFloat(input.value) !== nextVal) {
        input.value = String(nextVal);
        syncProSlider(input);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        syncProSlider(input);
      }
    };

    wrap.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      if (now - lastTapTime < 280) {
        // Double-tap resets cleanly to default
        lastTapTime = 0;
        const resetVal = getDefaultResetForSlider(input);
        if (parseFloat(input.value) !== resetVal) {
          input.value = String(resetVal);
          syncProSlider(input);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      lastTapTime = now;

      dragging = true;
      moved = false;
      startVal = parseFloat(input.value);
      wrap.classList.add('dragging');
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch (_) {}
      updateFromClientX(e.clientX);
    });

    wrap.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      e.preventDefault();
      moved = true;
      updateFromClientX(e.clientX);
    });

    const finishDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      wrap.classList.remove('dragging');
      try {
        if (e && wrap.hasPointerCapture(e.pointerId)) {
          wrap.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      if (parseFloat(input.value) !== startVal || moved) {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    wrap.addEventListener('pointerup', finishDrag);
    wrap.addEventListener('pointercancel', finishDrag);

    // Keep synced if changed via keyboard or programmatically
    input.addEventListener('input', () => syncProSlider(input));
    syncProSlider(input);
  }

  function initAllProSliders() {
    document.querySelectorAll('input[type="range"]').forEach((input) => {
      enhanceRangeSlider(input);
    });
  }

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

  // --- History (supports both parameter edits and Gemini generative image edits!) ---
  function pushHistory() {
    const snap = { state: cloneState(state), source: sourceImage };
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

  function applyHistoryEntry(entry) {
    const prevSource = sourceImage;
    state = cloneState(entry.state);
    sourceImage = entry.source || originalSourceImage;
    cropDraft = Object.assign({}, state.transform.crop);
    if (sourceImage !== prevSource) {
      generatePresetThumbnails();
    }
    syncControlsFromState();
    scheduleRender();
    updateHistoryButtons();
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    applyHistoryEntry(history[historyIndex]);
    showToast('Đã hoàn tác');
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    applyHistoryEntry(history[historyIndex]);
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

    buildMobileToolStrip();
  }

  function buildMobileToolStrip() {
    if (!els.mobileToolStrip) return;
    els.mobileToolStrip.innerHTML = '';

    MOBILE_TOOLS.forEach((tool) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobile-tool-btn' + (tool.key === activeMobileTool ? ' active' : '');
      btn.dataset.toolKey = tool.key;
      btn.innerHTML = `
        <span class="mobile-tool-dot" aria-hidden="true"></span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${tool.icon}</svg>
        <span>${tool.short}</span>
      `;
      btn.addEventListener('click', () => {
        selectMobileTool(tool.key);
      });
      els.mobileToolStrip.appendChild(btn);
    });

    if (els.mobileAdjRange) {
      els.mobileAdjRange.addEventListener('input', () => {
        const v = parseFloat(els.mobileAdjRange.value);
        state.adjustments[activeMobileTool] = v;
        els.mobileAdjVal.textContent = formatSliderValue(activeMobileTool, v);
        // Sync desktop slider & modified dot
        const deskInput = document.getElementById(`adj-${activeMobileTool}`);
        const deskVal = document.getElementById(`val-${activeMobileTool}`);
        if (deskInput) deskInput.value = String(v);
        if (deskVal) deskVal.textContent = formatSliderValue(activeMobileTool, v);
        updateMobileToolDots();
        scheduleRender();
      });

      els.mobileAdjRange.addEventListener('change', () => {
        if (sourceImage) pushHistory();
      });
    }

    if (els.mobileAdjResetSingle) {
      els.mobileAdjResetSingle.addEventListener('click', () => {
        if (!sourceImage) return;
        if (state.adjustments[activeMobileTool] !== 0) {
          state.adjustments[activeMobileTool] = 0;
          syncControlsFromState();
          pushHistory();
          scheduleRender();
        }
      });
    }

    selectMobileTool(activeMobileTool);
  }

  function selectMobileTool(key) {
    activeMobileTool = key;
    const cfg = findSliderConfig(key);
    const meta = MOBILE_TOOLS.find((t) => t.key === key);
    if (!cfg || !els.mobileAdjRange) return;

    els.mobileAdjTitle.textContent = meta ? meta.short : cfg.label;
    els.mobileAdjRange.min = String(cfg.min);
    els.mobileAdjRange.max = String(cfg.max);
    els.mobileAdjRange.step = String(cfg.step);
    const cur = state.adjustments[key] || 0;
    els.mobileAdjRange.value = String(cur);
    els.mobileAdjRange.dataset.track = (key === 'temperature' || key === 'tint') ? key : '';
    els.mobileAdjVal.textContent = formatSliderValue(key, cur);
    syncProSlider(els.mobileAdjRange);

    els.mobileToolStrip.querySelectorAll('.mobile-tool-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.toolKey === key);
    });
  }

  function updateMobileToolDots() {
    if (!els.mobileToolStrip) return;
    els.mobileToolStrip.querySelectorAll('.mobile-tool-btn').forEach((b) => {
      const k = b.dataset.toolKey;
      b.classList.toggle('modified', Math.abs(state.adjustments[k] || 0) > 0.01);
    });
  }

  // --- Pro 8-Channel HSL Mixer UI ---
  function buildHslMixer() {
    if (!els.hslSwatches) return;
    els.hslSwatches.innerHTML = '';

    P.HSL_CHANNELS.forEach((ch) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hsl-swatch-btn' + (ch.id === activeHslChannel ? ' active' : '');
      btn.dataset.hslId = ch.id;
      btn.title = ch.name;
      btn.setAttribute('aria-label', ch.name);
      btn.innerHTML = `<span class="swatch-dot" style="background:${ch.color}"></span>`;
      btn.addEventListener('click', () => {
        activeHslChannel = ch.id;
        syncHslControls();
      });
      els.hslSwatches.appendChild(btn);
    });

    const bindHslSlider = (input, valEl, prop) => {
      if (!input) return;
      input.addEventListener('input', () => {
        const v = parseInt(input.value, 10);
        if (!state.hsl) state.hsl = P.createDefaultHSL();
        state.hsl[activeHslChannel][prop] = v;
        valEl.textContent = v > 0 ? `+${v}` : String(v);
        updateHslDots();
        scheduleRender();
      });
      input.addEventListener('change', () => {
        if (sourceImage) pushHistory();
      });
      input.addEventListener('dblclick', () => {
        if (!sourceImage) return;
        if (state.hsl[activeHslChannel][prop] !== 0) {
          state.hsl[activeHslChannel][prop] = 0;
          syncHslControls();
          pushHistory();
          scheduleRender();
        }
      });
    };

    bindHslSlider(els.hslHue, els.valHslHue, 'h');
    bindHslSlider(els.hslSat, els.valHslSat, 's');
    bindHslSlider(els.hslLum, els.valHslLum, 'l');

    if (els.hslResetChannelBtn) {
      els.hslResetChannelBtn.addEventListener('click', () => {
        if (!sourceImage) return;
        state.hsl[activeHslChannel] = { h: 0, s: 0, l: 0 };
        syncHslControls();
        pushHistory();
        scheduleRender();
        showToast('Đã đặt lại kênh màu');
      });
    }

    if (els.hslResetAllBtn) {
      els.hslResetAllBtn.addEventListener('click', () => {
        if (!sourceImage) return;
        state.hsl = P.createDefaultHSL();
        syncHslControls();
        pushHistory();
        scheduleRender();
        showToast('Đã đặt lại toàn bộ HSL');
      });
    }

    syncHslControls();
  }

  function syncHslControls() {
    if (!els.hslSwatches) return;
    if (!state.hsl) state.hsl = P.createDefaultHSL();
    const chMeta = P.HSL_CHANNELS.find((c) => c.id === activeHslChannel) || P.HSL_CHANNELS[1];
    const cur = state.hsl[activeHslChannel] || { h: 0, s: 0, l: 0 };

    els.hslActiveName.textContent = chMeta.name;
    els.hslActiveSwatch.style.background = chMeta.color;

    els.hslHue.value = String(cur.h || 0);
    els.hslSat.value = String(cur.s || 0);
    els.hslLum.value = String(cur.l || 0);
    els.valHslHue.textContent = cur.h > 0 ? `+${cur.h}` : String(cur.h || 0);
    els.valHslSat.textContent = cur.s > 0 ? `+${cur.s}` : String(cur.s || 0);
    els.valHslLum.textContent = cur.l > 0 ? `+${cur.l}` : String(cur.l || 0);
    syncProSlider(els.hslHue);
    syncProSlider(els.hslSat);
    syncProSlider(els.hslLum);

    els.hslSwatches.querySelectorAll('.hsl-swatch-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.hslId === activeHslChannel);
    });
    updateHslDots();
  }

  function updateHslDots() {
    if (!els.hslSwatches || !state.hsl) return;
    els.hslSwatches.querySelectorAll('.hsl-swatch-btn').forEach((btn) => {
      const vals = state.hsl[btn.dataset.hslId];
      const mod = vals && (Math.abs(vals.h) > 0 || Math.abs(vals.s) > 0 || Math.abs(vals.l) > 0);
      btn.classList.toggle('modified', Boolean(mod));
    });
  }

  function formatSliderValue(key, v) {
    if (key === 'exposure') {
      const ev = v / 50;
      return (ev > 0 ? '+' : '') + ev.toFixed(2) + ' EV';
    }
    if (key === 'blur') return v.toFixed(1);
    const signedKeys = ['contrast', 'highlights', 'shadows', 'whites', 'blacks', 'temperature', 'tint', 'vibrance', 'saturation', 'clarity', 'dehaze', 'vignette'];
    return v > 0 && signedKeys.includes(key) ? `+${v}` : String(v);
  }

  function buildPresetCards() {
    els.presetGrid.innerHTML = '';
    P.PRESETS.forEach((preset) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-card' + (preset.id === state.presetId ? ' active' : '');
      btn.dataset.presetId = preset.id;
      btn.dataset.cat = preset.cat || 'all';

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'preset-thumb-wrap';
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 240;
      thumbCanvas.height = 160;
      thumbWrap.appendChild(thumbCanvas);

      if (preset.badge) {
        const badge = document.createElement('span');
        badge.className = 'preset-vip-badge';
        badge.textContent = preset.badge;
        thumbWrap.appendChild(badge);
      }

      const meta = document.createElement('div');
      meta.className = 'preset-meta';
      meta.innerHTML = `<span class="preset-name">${preset.name}</span><span class="preset-desc">${preset.desc}</span>`;

      btn.appendChild(thumbWrap);
      btn.appendChild(meta);

      btn.addEventListener('click', () => {
        if (!sourceImage) {
          showToast('Hãy mở ảnh hoặc chọn Ảnh mẫu để áp dụng bộ lọc');
          return;
        }
        if (state.presetId !== preset.id) {
          state.presetId = preset.id;
          state.presetStrength = 100;
          syncControlsFromState();
          pushHistory();
          scheduleRender();
        }
      });

      els.presetGrid.appendChild(btn);
    });
    filterPresetCards();
  }

  function filterPresetCards() {
    els.presetGrid.querySelectorAll('.preset-card').forEach((card) => {
      const id = card.dataset.presetId;
      const cat = card.dataset.cat;
      const show = activePresetCat === 'all' || id === 'original' || cat === activePresetCat;
      card.classList.toggle('hidden', !show);
    });
  }

  function generatePresetThumbnails(customSource) {
    const src = customSource || sourceImage;
    if (!src) return;

    const tw = 240;
    const th = 160;
    const srcW = src.naturalWidth || src.width;
    const srcH = src.naturalHeight || src.height;
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
    baseThumb.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, tw, th);

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

    // Sync mobile single-slider dock, HSL mixer & visual precision sliders
    selectMobileTool(activeMobileTool);
    updateMobileToolDots();
    syncHslControls();
    syncAllProSliders();
  }

  // --- Image Loading ---
  function loadSource(imgOrCanvas, name) {
    sourceImage = imgOrCanvas;
    originalSourceImage = imgOrCanvas;
    aiPrevInteractionId = null;
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
    els.viewport.classList.add('has-image');
    document.body.classList.add('has-image');

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
      els.autoEnhanceBtn,
    ].forEach((b) => { if (b) b.disabled = false; });

    els.splitToggleBtn.classList.remove('active');
    if (els.mobileSplitBtn) els.mobileSplitBtn.classList.remove('active');
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
    const inEraseMode = eraserActive;
    const renderState = cloneState(state);

    // When in Crop tab, show uncropped frame (without outer photo border) so user can freely adjust crop
    if (inCropMode) {
      renderState.transform.crop = { x: 0, y: 0, w: 1, h: 1 };
    }

    const needOrig = (splitCompare || holdingOriginal) && !inCropMode;
    const dynamicMaxDim = window.innerWidth <= 780 ? 960 : 1280;
    const result = P.renderPipeline(sourceImage, renderState, {
      maxDim: dynamicMaxDim,
      needOriginal: needOrig,
      includeFrame: !inCropMode && !inEraseMode,
    });

    // If sourceImage was replaced by Gemini Generative AI, compare against true originalSourceImage!
    let origCanvasForCompare = result.originalCanvas;
    if (needOrig && originalSourceImage && sourceImage !== originalSourceImage) {
      const origBase = document.createElement('canvas');
      origBase.width = result.processedCanvas.width;
      origBase.height = result.processedCanvas.height;
      origBase.getContext('2d').drawImage(originalSourceImage, 0, 0, origBase.width, origBase.height);
      origCanvasForCompare = origBase;
    }

    const outCanvas = holdingOriginal && origCanvasForCompare
      ? origCanvasForCompare
      : result.processedCanvas;

    const pCanvas = els.previewCanvas;
    pCanvas.width = outCanvas.width;
    pCanvas.height = outCanvas.height;
    pCanvas.getContext('2d').drawImage(outCanvas, 0, 0);

    if (needOrig && origCanvasForCompare) {
      const oCanvas = els.originalCanvas;
      oCanvas.width = origCanvasForCompare.width;
      oCanvas.height = origCanvasForCompare.height;
      oCanvas.getContext('2d').drawImage(origCanvasForCompare, 0, 0);
    }

    // Fit canvas inside viewport
    fitCanvasToViewport();

    // Update dimensions badge (show true cropped dimensions)
    const trueW = Math.round(result.fullWidth * (inCropMode ? state.transform.crop.w : 1));
    const trueH = Math.round(result.fullHeight * (inCropMode ? state.transform.crop.h : 1));
    const dimText = `${trueW} × ${trueH} px`;
    els.imageDimLabel.textContent = dimText;
    if (els.stageDimChip) els.stageDimChip.textContent = dimText;

    // Update Histogram
    const stats = P.drawHistogram(result.imageData, els.histogramCanvas);
    els.histMeta.textContent = `Sáng TB: ${stats.meanLum}%`;

    // Update split compare visuals
    updateSplitVisuals();

    // Update crop box visuals if in crop mode
    if (inCropMode) {
      updateCropBoxStyle();
    }

    updateEraserOverlayVisibility();
  }

  function fitCanvasToViewport() {
    if (!sourceImage) return;
    const stageRect = els.stageContainer.getBoundingClientRect();
    const isMobile = window.innerWidth <= 780;
    const padW = isMobile ? 24 : 48;
    const padH = isMobile ? 58 : 68;
    const availW = Math.max(120, stageRect.width - padW);
    const availH = Math.max(120, stageRect.height - padH);

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
      syncProSlider(els.straighten);
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
      if (e.target.closest('.split-handle') || e.target.closest('.crop-box') || e.target.closest('.eraser-overlay')) return;
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
    updateEraserOverlayVisibility();
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

    // Split Compare (Desktop + Mobile quick bar)
    const toggleSplit = () => {
      if (!sourceImage) return;
      if (activeTab === 'crop') switchTab('adjust');
      splitCompare = !splitCompare;
      els.splitToggleBtn.classList.toggle('active', splitCompare);
      if (els.mobileSplitBtn) els.mobileSplitBtn.classList.toggle('active', splitCompare);
      scheduleRender();
    };
    els.splitToggleBtn.addEventListener('click', toggleSplit);
    if (els.mobileSplitBtn) els.mobileSplitBtn.addEventListener('click', toggleSplit);

    // Hold to Compare Original (Desktop + Mobile quick bar)
    const startHold = (e) => {
      if (!sourceImage) return;
      if (e && e.cancelable) e.preventDefault();
      holdingOriginal = true;
      els.holdCompareBtn.classList.add('active');
      if (els.mobileHoldOrigBtn) els.mobileHoldOrigBtn.classList.add('active');
      scheduleRender();
    };
    const endHold = () => {
      if (!holdingOriginal) return;
      holdingOriginal = false;
      els.holdCompareBtn.classList.remove('active');
      if (els.mobileHoldOrigBtn) els.mobileHoldOrigBtn.classList.remove('active');
      scheduleRender();
    };
    els.holdCompareBtn.addEventListener('pointerdown', startHold);
    if (els.mobileHoldOrigBtn) {
      els.mobileHoldOrigBtn.addEventListener('pointerdown', startHold);
      els.mobileHoldOrigBtn.addEventListener('pointercancel', endHold);
    }
    window.addEventListener('pointerup', endHold);
    els.holdCompareBtn.addEventListener('pointerleave', endHold);

    // Zoom
    els.zoomInBtn.addEventListener('click', () => setZoom(zoom + 0.25));
    els.zoomOutBtn.addEventListener('click', () => setZoom(zoom - 0.25));
    els.zoomResetBtn.addEventListener('click', () => setZoom(1));

    // Theme toggle (Light botanical default / Darkroom mode)
    const applyTheme = (theme) => {
      const isDark = theme === 'dark';
      document.body.dataset.theme = isDark ? 'dark' : 'light';
      els.themeIconMoon.classList.toggle('hidden', isDark);
      els.themeIconSun.classList.toggle('hidden', !isDark);
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) themeMeta.setAttribute('content', isDark ? '#0c0f0e' : '#edf6ef');
      try {
        localStorage.setItem('lumina-theme', isDark ? 'dark' : 'light');
      } catch (_) {}
    };

    try {
      const savedTheme = localStorage.getItem('lumina-theme');
      if (savedTheme === 'dark') applyTheme('dark');
    } catch (_) {}

    els.themeToggleBtn.addEventListener('click', () => {
      const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      showToast(next === 'dark' ? 'Chế độ Phòng tối' : 'Chế độ Sáng tự nhiên');
    });

    // Reset All (Desktop + Mobile quick bar)
    const resetAllEdits = () => {
      if (!sourceImage) return;
      const hadAiSrc = sourceImage !== originalSourceImage;
      sourceImage = originalSourceImage || sourceImage;
      aiPrevInteractionId = null;
      state = createDefaultState();
      cropDraft = { x: 0, y: 0, w: 1, h: 1 };
      if (hadAiSrc) generatePresetThumbnails();
      syncControlsFromState();
      pushHistory();
      scheduleRender();
      showToast('Đã đặt lại tất cả chỉnh sửa');
    };
    els.resetAllBtn.addEventListener('click', resetAllEdits);
    if (els.mobileResetBtn) els.mobileResetBtn.addEventListener('click', resetAllEdits);

    // Tabs
    els.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Preset category filter pills
    if (els.presetCatPills) {
      els.presetCatPills.querySelectorAll('.pill').forEach((pill) => {
        pill.addEventListener('click', () => {
          els.presetCatPills.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
          pill.classList.add('active');
          activePresetCat = pill.dataset.cat || 'all';
          filterPresetCards();
        });
      });
    }

    // Adjust sub-mode switch (Basic vs HSL 8-Color Mixer)
    if (els.adjustModeTabs) {
      els.adjustModeTabs.querySelectorAll('.seg-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.adjmode;
          els.adjustModeTabs.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('active', b === btn));
          els.adjPaneBasic.classList.toggle('active', mode === 'basic');
          els.adjPaneHsl.classList.toggle('active', mode === 'hsl');
        });
      });
    }

    // Auto Enhance 1-tap VIP (lives inside AI Chat Bubble)
    if (els.autoEnhanceBtn) {
      els.autoEnhanceBtn.addEventListener('click', () => {
        if (!sourceImage) return;
        const autoVals = P.analyzeAutoEnhance(sourceImage);
        Object.assign(state.adjustments, autoVals);
        syncControlsFromState();
        pushHistory();
        scheduleRender();
        appendChatMsg('ai', '✨ Đã tự động cân bằng ánh sáng, tương phản và màu chuẩn cho bức ảnh của bạn.', { showUndo: true });
        showToast('Đã tự động cân bằng ánh sáng & màu chuẩn');
      });
    }

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
      syncProSlider(els.straighten);
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
      } else if (e.key === 'Escape' && els.aiConfigModal && !els.aiConfigModal.classList.contains('hidden')) {
        els.aiConfigModal.classList.add('hidden');
      } else if (e.key === 'Escape' && aiChatOpen) {
        closeAiChat();
      } else if (e.key === 'Escape' && eraserActive) {
        setEraserMode(false, false);
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

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => fitCanvasToViewport());
      ro.observe(els.stageContainer);
    }

    // Enable smooth mouse-wheel horizontal scrolling on horizontal strips for desktop users
    document.querySelectorAll('.preset-grid, .mobile-tool-strip, .aspect-pills, .preset-cat-pills, .ai-chips').forEach((strip) => {
      strip.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && strip.scrollWidth > strip.clientWidth) {
          e.preventDefault();
          strip.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    });

    bindAiEvents();
  }

  // --- Floating AI Chat Bubble & Unified Assistant Controller ---
  function updateAiKeyBadge() {
    if (!AI) return;
    const hasKey = Boolean(AI.getApiKey());
    if (els.aiConfigBtn) els.aiConfigBtn.classList.toggle('connected', hasKey);
    if (els.aiFab) els.aiFab.classList.toggle('connected', hasKey);
    if (els.aiKeyLabel) {
      els.aiKeyLabel.textContent = hasKey ? 'Gemini ON' : 'Gemini API';
    }
  }

  function openAiChat() {
    if (!els.aiChatWindow) return;
    if (eraserActive) setEraserMode(false, false);
    aiChatOpen = true;
    els.aiChatWindow.classList.remove('hidden');
    if (els.aiFab) els.aiFab.classList.add('open');
    scrollChatToBottom();
  }

  function closeAiChat() {
    if (!els.aiChatWindow) return;
    aiChatOpen = false;
    els.aiChatWindow.classList.add('hidden');
    if (els.aiFab && !eraserActive) els.aiFab.classList.remove('open');
  }

  function setEraserMode(active, reopenChat) {
    if (active && !sourceImage) {
      showToast('Hãy mở ảnh hoặc chọn Ảnh mẫu trước khi dùng Cọ tẩy');
      return;
    }
    eraserActive = Boolean(active);
    if (els.aiEraseFloat) els.aiEraseFloat.classList.toggle('hidden', !eraserActive);
    if (eraserActive) {
      aiChatOpen = false;
      if (els.aiChatWindow) els.aiChatWindow.classList.add('hidden');
      if (els.aiFab) els.aiFab.classList.add('open');
      if (splitCompare) {
        splitCompare = false;
        els.splitToggleBtn.classList.remove('active');
        if (els.mobileSplitBtn) els.mobileSplitBtn.classList.remove('active');
      }
      if (activeTab === 'crop') switchTab('presets');
      showToast('Tô ngón tay hoặc chuột lên vật thể cần xóa');
    } else {
      if (reopenChat) {
        openAiChat();
      } else if (els.aiFab && !aiChatOpen) {
        els.aiFab.classList.remove('open');
      }
    }
    updateEraserOverlayVisibility();
    scheduleRender();
  }

  function scrollChatToBottom() {
    if (!els.aiChatFeed) return;
    requestAnimationFrame(() => {
      els.aiChatFeed.scrollTop = els.aiChatFeed.scrollHeight;
    });
  }

  function appendChatMsg(role, text, opts) {
    if (!els.aiChatFeed) return null;
    const options = opts || {};
    const wrap = document.createElement('div');
    wrap.className = `chat-msg ${role === 'user' ? 'chat-msg-user' : 'chat-msg-ai'}`;
    if (options.kind === 'error') wrap.classList.add('is-error');
    if (options.kind === 'loading') wrap.classList.add('is-loading');

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';

    const textEl = document.createElement('div');
    textEl.className = 'chat-bubble-text';
    textEl.textContent = text;
    bubble.appendChild(textEl);

    if (options.showUndo || options.showEraseJump) {
      const actions = document.createElement('div');
      actions.className = 'chat-bubble-actions';

      if (options.showUndo) {
        const undoChip = document.createElement('button');
        undoChip.type = 'button';
        undoChip.className = 'chat-mini-btn';
        undoChip.textContent = '↩ Hoàn tác';
        undoChip.addEventListener('click', () => undo());
        actions.appendChild(undoChip);
      }

      if (options.showEraseJump) {
        const eraseChip = document.createElement('button');
        eraseChip.type = 'button';
        eraseChip.className = 'chat-mini-btn primary';
        eraseChip.textContent = '🪄 Mở Cọ tẩy miễn phí';
        eraseChip.addEventListener('click', () => setEraserMode(true, false));
        actions.appendChild(eraseChip);
      }

      bubble.appendChild(actions);
    }

    wrap.appendChild(bubble);
    els.aiChatFeed.appendChild(wrap);
    scrollChatToBottom();
    return wrap;
  }

  function updateChatMsg(msgEl, text, opts) {
    if (!msgEl) return appendChatMsg('ai', text, opts);
    const options = opts || {};
    msgEl.classList.remove('is-error', 'is-loading');
    if (options.kind === 'error') msgEl.classList.add('is-error');
    if (options.kind === 'loading') msgEl.classList.add('is-loading');

    const bubble = msgEl.querySelector('.chat-bubble');
    if (!bubble) return msgEl;
    bubble.innerHTML = '';

    const textEl = document.createElement('div');
    textEl.className = 'chat-bubble-text';
    textEl.textContent = text;
    bubble.appendChild(textEl);

    if (options.showUndo || options.showEraseJump) {
      const actions = document.createElement('div');
      actions.className = 'chat-bubble-actions';

      if (options.showUndo) {
        const undoChip = document.createElement('button');
        undoChip.type = 'button';
        undoChip.className = 'chat-mini-btn';
        undoChip.textContent = '↩ Hoàn tác';
        undoChip.addEventListener('click', () => undo());
        actions.appendChild(undoChip);
      }

      if (options.showEraseJump) {
        const eraseChip = document.createElement('button');
        eraseChip.type = 'button';
        eraseChip.className = 'chat-mini-btn primary';
        eraseChip.textContent = '🪄 Mở Cọ tẩy miễn phí';
        eraseChip.addEventListener('click', () => setEraserMode(true, false));
        actions.appendChild(eraseChip);
      }

      bubble.appendChild(actions);
    }

    scrollChatToBottom();
    return msgEl;
  }

  function setAiMode(mode) {
    aiMode = mode === 'generative' ? 'generative' : 'color';
    if (els.aiModeTabs) {
      els.aiModeTabs.querySelectorAll('.seg-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.aimode === aiMode);
      });
    }
    if (els.aiPromptInput) {
      els.aiPromptInput.placeholder = aiMode === 'generative'
        ? 'VD: xoá dây chuyền trên cổ, đổi màu váy sang đỏ...'
        : 'Nhắn yêu cầu sửa ảnh cho AI...';
    }
  }

  // --- Free Client-Side Magic Eraser (Tẩy vật thể) ---
  function updateEraserOverlayVisibility() {
    if (!els.eraserCanvas) return;
    const active = eraserActive && Boolean(sourceImage) && !splitCompare;
    els.eraserCanvas.classList.toggle('hidden', !active);
    if (!active && els.brushCursor) {
      els.brushCursor.classList.add('hidden');
    }
    if (active) {
      const w = parseInt(els.previewCanvas.style.width, 10) || els.previewCanvas.clientWidth || 300;
      const h = parseInt(els.previewCanvas.style.height, 10) || els.previewCanvas.clientHeight || 300;
      if (els.eraserCanvas.width !== w || els.eraserCanvas.height !== h) {
        els.eraserCanvas.width = w;
        els.eraserCanvas.height = h;
      }
    }
  }

  /**
   * Maps a normalized [0..1] point on the displayed (cropped/rotated/flipped) canvas
   * back to normalized [0..1] coordinates on the underlying sourceImage.
   */
  function displayToSourceNorm(u, v, transform) {
    const crop = (transform && transform.crop) || { x: 0, y: 0, w: 1, h: 1 };
    let x = crop.x + u * crop.w;
    let y = crop.y + v * crop.h;

    if (transform && transform.flipH) x = 1 - x;
    if (transform && transform.flipV) y = 1 - y;

    const rot = (((transform && transform.rotate) || 0) % 360 + 360) % 360;
    if (rot === 90) {
      const nx = y;
      const ny = 1 - x;
      x = nx; y = ny;
    } else if (rot === 180) {
      x = 1 - x;
      y = 1 - y;
    } else if (rot === 270) {
      const nx = 1 - y;
      const ny = x;
      x = nx; y = ny;
    }

    return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
  }

  function initMagicEraser() {
    if (!els.eraserCanvas) return;
    let drawing = false;
    let dispPoints = [];

    const drawStrokeOverlay = () => {
      const ctx = els.eraserCanvas.getContext('2d');
      ctx.clearRect(0, 0, els.eraserCanvas.width, els.eraserCanvas.height);
      if (dispPoints.length === 0) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(61, 214, 138, 0.58)';
      ctx.fillStyle = 'rgba(61, 214, 138, 0.58)';
      ctx.lineWidth = eraserBrushPx;
      if (dispPoints.length === 1) {
        ctx.beginPath();
        ctx.arc(dispPoints[0].cx, dispPoints[0].cy, eraserBrushPx / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(dispPoints[0].cx, dispPoints[0].cy);
        for (let i = 1; i < dispPoints.length; i++) {
          ctx.lineTo(dispPoints[i].cx, dispPoints[i].cy);
        }
        ctx.stroke();
      }
      ctx.restore();
    };

    const getCanvasPos = (e) => {
      const rect = els.eraserCanvas.getBoundingClientRect();
      const u = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      const v = clamp((e.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
      return {
        u,
        v,
        cx: u * els.eraserCanvas.width,
        cy: v * els.eraserCanvas.height,
        rect,
      };
    };

    const updateCursor = (e) => {
      if (!els.brushCursor) return;
      const rect = els.eraserCanvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * els.eraserCanvas.offsetWidth;
      const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * els.eraserCanvas.offsetHeight;
      els.brushCursor.style.width = `${eraserBrushPx}px`;
      els.brushCursor.style.height = `${eraserBrushPx}px`;
      els.brushCursor.style.left = `${x}px`;
      els.brushCursor.style.top = `${y}px`;
      els.brushCursor.classList.remove('hidden');
    };

    els.eraserCanvas.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') updateCursor(e);
    });

    els.eraserCanvas.addEventListener('pointerleave', () => {
      if (!drawing && els.brushCursor) els.brushCursor.classList.add('hidden');
    });

    els.eraserCanvas.addEventListener('pointerdown', (e) => {
      if (!sourceImage) return;
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault();
      e.stopPropagation();

      drawing = true;
      dispPoints = [];
      try {
        els.eraserCanvas.setPointerCapture(e.pointerId);
      } catch (_) {}
      const pos = getCanvasPos(e);
      dispPoints.push(pos);
      updateCursor(e);
      drawStrokeOverlay();
    });

    els.eraserCanvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' || drawing) updateCursor(e);
      if (!drawing) return;
      e.preventDefault();
      const pos = getCanvasPos(e);
      const last = dispPoints[dispPoints.length - 1];
      if (!last || Math.hypot(pos.cx - last.cx, pos.cy - last.cy) >= 2) {
        dispPoints.push(pos);
        drawStrokeOverlay();
      }
    });

    const finishErase = (e) => {
      if (!drawing) return;
      drawing = false;
      try {
        if (e && els.eraserCanvas.hasPointerCapture(e.pointerId)) {
          els.eraserCanvas.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      const ctx = els.eraserCanvas.getContext('2d');
      ctx.clearRect(0, 0, els.eraserCanvas.width, els.eraserCanvas.height);

      if (dispPoints.length === 0 || !sourceImage) return;

      const srcPoints = dispPoints.map((pt) => displayToSourceNorm(pt.u, pt.v, state.transform));
      const crop = state.transform.crop || { x: 0, y: 0, w: 1, h: 1 };
      const minDisp = Math.min(els.eraserCanvas.width, els.eraserCanvas.height) || 300;
      const normRadius = ((eraserBrushPx * 0.5) / minDisp) * Math.min(crop.w, crop.h);

      dispPoints = [];

      // Run fast multi-scale content-aware inpainting at full image resolution
      const healed = P.inpaintStroke(sourceImage, srcPoints, normRadius);
      sourceImage = healed;
      generatePresetThumbnails();
      pushHistory();
      scheduleRender();
      showToast('Đã xóa vùng vừa tô! (Bấm Hoàn tác nếu muốn vẽ lại)');
    };

    els.eraserCanvas.addEventListener('pointerup', finishErase);
    els.eraserCanvas.addEventListener('pointercancel', finishErase);

    if (els.eraserSize) {
      els.eraserSize.addEventListener('input', () => {
        eraserBrushPx = parseInt(els.eraserSize.value, 10) || 22;
        if (els.valEraserSize) els.valEraserSize.textContent = `${eraserBrushPx}px`;
      });
    }

    if (els.eraserUndoBtn) {
      els.eraserUndoBtn.addEventListener('click', () => undo());
    }

    if (els.eraserBackChatBtn) {
      els.eraserBackChatBtn.addEventListener('click', () => setEraserMode(false, true));
    }

    if (els.eraserDoneBtn) {
      els.eraserDoneBtn.addEventListener('click', () => setEraserMode(false, false));
    }
  }

  function initDraggableAiFab() {
    if (!els.aiFab) return;
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;

    els.aiFab.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = els.aiFab.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      try {
        els.aiFab.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    els.aiFab.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 7) {
        moved = true;
        els.aiFab.classList.add('dragging-fab');
      }
      if (!moved) return;
      const rect = els.aiFab.getBoundingClientRect();
      const maxX = Math.max(8, window.innerWidth - rect.width - 8);
      const maxY = Math.max(8, window.innerHeight - rect.height - 8);
      const nextX = clamp(origLeft + dx, 8, maxX);
      const nextY = clamp(origTop + dy, 8, maxY);
      els.aiFab.style.left = `${nextX}px`;
      els.aiFab.style.top = `${nextY}px`;
      els.aiFab.style.right = 'auto';
      els.aiFab.style.bottom = 'auto';
    });

    const endFab = (e) => {
      if (!dragging) return;
      dragging = false;
      els.aiFab.classList.remove('dragging-fab');
      try {
        if (e && els.aiFab.hasPointerCapture(e.pointerId)) {
          els.aiFab.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      if (!moved) {
        if (aiChatOpen) closeAiChat();
        else openAiChat();
      }
    };

    els.aiFab.addEventListener('pointerup', endFab);
    els.aiFab.addEventListener('pointercancel', endFab);
  }

  function initVoiceInput() {
    if (!els.aiMicBtn) return;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let listening = false;

    els.aiMicBtn.addEventListener('click', () => {
      if (!SpeechRec) {
        showToast('Trình duyệt này chưa hỗ trợ micro giọng nói — hãy gõ trực tiếp nhé');
        return;
      }
      if (listening && recognition) {
        recognition.stop();
        return;
      }
      recognition = new SpeechRec();
      recognition.lang = 'vi-VN';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        listening = true;
        els.aiMicBtn.classList.add('listening');
        showToast('🎙️ Đang nghe... hãy nói yêu cầu sửa ảnh');
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (els.aiPromptInput) els.aiPromptInput.value = transcript.trim();
        const last = event.results[event.results.length - 1];
        if (last && last.isFinal && transcript.trim()) {
          executeAiPrompt(transcript.trim(), false);
        }
      };

      recognition.onerror = () => {
        showToast('Không nghe rõ giọng nói, bạn thử nói lại hoặc gõ nhé');
      };

      recognition.onend = () => {
        listening = false;
        els.aiMicBtn.classList.remove('listening');
      };

      try {
        recognition.start();
      } catch (_) {}
    });
  }

  function setAiBusy(busy) {
    aiBusy = busy;
    if (els.aiSendBtn) els.aiSendBtn.disabled = busy;
    if (els.aiPromptInput) els.aiPromptInput.disabled = busy;
    if (els.aiSpinner) els.aiSpinner.classList.toggle('hidden', !busy);
    const lbl = els.aiSendBtn && els.aiSendBtn.querySelector('.ai-send-label');
    if (lbl) lbl.classList.toggle('hidden', busy);
  }

  function openAiConfigModal() {
    if (!els.aiConfigModal) return;
    els.aiApiKeyInput.value = AI.getApiKey();
    if (els.aiKeyTestStatus) els.aiKeyTestStatus.classList.add('hidden');
    els.aiConfigModal.classList.remove('hidden');
  }

  function closeAiConfigModal() {
    if (!els.aiConfigModal) return;
    els.aiConfigModal.classList.add('hidden');
  }

  /**
   * Maps a Gemini Vision region plan from displayed (cropped/rotated) 0..1000 space
   * into underlying sourceImage 0..1000 space so automatic edits align pixel-accurately.
   */
  function mapVisionPlanToSource(plan, transform) {
    const mapPt = (p) => {
      const rawX = typeof p.x === 'number' ? p.x : p[0];
      const rawY = typeof p.y === 'number' ? p.y : p[1];
      const mapped = displayToSourceNorm(clamp(rawX, 0, 1000) / 1000, clamp(rawY, 0, 1000) / 1000, transform);
      return { x: mapped.x * 1000, y: mapped.y * 1000 };
    };

    const crop = (transform && transform.crop) || { x: 0, y: 0, w: 1, h: 1 };
    const widthScale = Math.min(crop.w, crop.h);

    return Object.assign({}, plan, {
      strokes: (plan.strokes || []).map((st) => ({
        width: Math.max(6, (st.width || 18) * widthScale),
        points: (st.points || []).map(mapPt),
      })),
      polygons: (plan.polygons || []).map((poly) => {
        const pts = Array.isArray(poly) ? poly : (poly.points || []);
        return { points: pts.map(mapPt) };
      }),
      boxes: (plan.boxes || []).map((b) => {
        if (!Array.isArray(b) || b.length !== 4) return b;
        const p1 = displayToSourceNorm(clamp(b[1], 0, 1000) / 1000, clamp(b[0], 0, 1000) / 1000, transform);
        const p2 = displayToSourceNorm(clamp(b[3], 0, 1000) / 1000, clamp(b[2], 0, 1000) / 1000, transform);
        return [
          Math.min(p1.y, p2.y) * 1000,
          Math.min(p1.x, p2.x) * 1000,
          Math.max(p1.y, p2.y) * 1000,
          Math.max(p1.x, p2.x) * 1000,
        ];
      }),
    });
  }

  async function executeAiPrompt(promptText, forceGenerative) {
    const prompt = (promptText || '').trim();
    if (!prompt || aiBusy) return;

    if (!aiChatOpen) openAiChat();
    appendChatMsg('user', prompt);
    if (els.aiPromptInput) els.aiPromptInput.value = '';

    if (!sourceImage) {
      appendChatMsg('ai', 'Bạn hãy chọn ảnh (hoặc bấm "Thử ảnh mẫu") trước để tôi bắt đầu sửa ảnh giúp bạn nhé!', { kind: 'error' });
      showToast('Hãy mở ảnh trước khi dùng AI');
      return;
    }

    const apiKey = AI.getApiKey();
    const wantsGen = AI.looksLikeGenerativeEdit(prompt);
    const useGenerative = forceGenerative || aiMode === 'generative' || (Boolean(apiKey) && wantsGen);

    // Generative / Object Removal / Regional Editing Mode
    if (useGenerative) {
      if (!apiKey) {
        appendChatMsg('ai', 'Hãy nhập Gemini API Key miễn phí (bấm "Gemini API" ở góc trên) để AI tự động định vị và xóa/sửa vật thể, hoặc dùng ngay Cọ tẩy miễn phí bên dưới.', { kind: 'error', showEraseJump: true });
        openAiConfigModal();
        return;
      }

      setAiMode('generative');
      setAiBusy(true);

      const rendered = P.renderPipeline(sourceImage, state, {
        maxDim: 1280,
        needOriginal: false,
        includeFrame: false,
      }).processedCanvas;

      const loadingMsg = appendChatMsg('ai', '✨ Đang phân tích ảnh và thực hiện yêu cầu của bạn...', { kind: 'loading' });

      // 1. Try Paid-Tier native Gemini Image Editing first (unless already known Free Tier limit=0)
      if (!geminiPaidImageBlocked) {
        try {
          const res = await AI.runGeminiImageEdit(prompt, rendered, apiKey, aiPrevInteractionId);
          aiPrevInteractionId = res.interactionId || aiPrevInteractionId;

          sourceImage = res.image;
          const keepFrame = cloneState(state.frame);
          state = createDefaultState();
          state.frame = keepFrame;
          cropDraft = { x: 0, y: 0, w: 1, h: 1 };

          generatePresetThumbnails();
          syncControlsFromState();
          pushHistory();
          scheduleRender();
          updateChatMsg(loadingMsg, `✨ ${res.message}`, { showUndo: true });
          showToast('Gemini AI đã sửa ảnh xong');
          setAiBusy(false);
          return;
        } catch (err) {
          if (err && err.isFreeTierImageLimit) {
            geminiPaidImageBlocked = true;
          } else {
            updateChatMsg(loadingMsg, `Lỗi Gemini AI: ${err.message || err}`, { kind: 'error', showEraseJump: true });
            showToast('Không thể kết nối Gemini AI');
            setAiBusy(false);
            return;
          }
        }
      }

      // 2. Automatic Free-Tier Mode: Gemini 4 Hydrogen Vision locates exact object -> Auto Inpaint / Recolor / Blur!
      updateChatMsg(loadingMsg, '✨ Gemini Vision đang tự dò chính xác vật thể trong ảnh và xử lý tự động...', { kind: 'loading' });
      try {
        const visionRes = await AI.runGeminiVisionRegionEdit(prompt, rendered, apiKey);
        const plan = visionRes.plan;

        if (!plan || plan.found === false) {
          updateChatMsg(loadingMsg, visionRes.message || 'AI không tìm thấy đối tượng tương ứng trong ảnh. Hãy mô tả rõ hơn vị trí vật thể cần sửa.', { kind: 'error', showEraseJump: true });
          showToast('AI không tìm thấy vật thể yêu cầu');
          setAiBusy(false);
          return;
        }

        const mappedPlan = mapVisionPlanToSource(plan, state.transform);
        const editResult = P.applyAiRegionEdit(sourceImage, mappedPlan);

        if (!editResult.applied) {
          updateChatMsg(loadingMsg, 'AI chưa khoanh được vùng cụ thể cho yêu cầu này. Hãy mô tả rõ hơn hoặc dùng Cọ tẩy miễn phí.', { kind: 'error', showEraseJump: true });
          setAiBusy(false);
          return;
        }

        sourceImage = editResult.canvas;
        generatePresetThumbnails();
        pushHistory();
        scheduleRender();
        updateChatMsg(loadingMsg, `✨ ${visionRes.message}`, { showUndo: true });
        showToast('AI đã tự động chỉnh sửa ảnh xong!');
      } catch (err) {
        updateChatMsg(loadingMsg, `Lỗi Gemini Vision AI: ${err.message || err}`, { kind: 'error', showEraseJump: true });
        showToast('Lỗi xử lý AI');
      } finally {
        setAiBusy(false);
      }
      return;
    }

    // Color & Smart Grading AI Mode
    if (apiKey && !wantsGen) {
      setAiBusy(true);
      const loadingMsg = appendChatMsg('ai', '✨ Gemini AI đang quan sát ảnh và cân chỉnh màu sắc...', { kind: 'loading' });
      try {
        const rendered = P.renderPipeline(sourceImage, state, {
          maxDim: 768,
          needOriginal: false,
          includeFrame: false,
        }).processedCanvas;

        const res = await AI.runGeminiColorAI(prompt, state, rendered, P, apiKey);
        state = res.state;
        syncControlsFromState();
        pushHistory();
        scheduleRender();
        updateChatMsg(loadingMsg, `✨ ${res.message}`, { showUndo: true });
        showToast('Gemini AI đã chỉnh màu xong');
        setAiBusy(false);
        return;
      } catch (err) {
        const fallback = AI.runLocalSmartAI(prompt, state, sourceImage, P);
        if (fallback.changed) {
          state = fallback.state;
          syncControlsFromState();
          pushHistory();
          scheduleRender();
        }
        updateChatMsg(loadingMsg, `${fallback.message} (Chế độ tức thì — Gemini: ${err.message})`, { kind: 'error', showUndo: fallback.changed });
        setAiBusy(false);
        return;
      }
    }

    // Instant Built-in Vietnamese AI (Zero latency, free, no API key required!)
    const res = AI.runLocalSmartAI(prompt, state, sourceImage, P);
    if (res.needsGeminiImage) {
      appendChatMsg('ai', res.message, { kind: 'error', showEraseJump: true });
      showToast('Gắn Gemini API Key hoặc dùng Cọ tẩy miễn phí!');
      return;
    }
    if (res.changed) {
      if (res.resetSource && originalSourceImage) {
        sourceImage = originalSourceImage;
        aiPrevInteractionId = null;
        generatePresetThumbnails();
      }
      state = res.state;
      cropDraft = Object.assign({}, state.transform.crop);
      syncControlsFromState();
      pushHistory();
      scheduleRender();
      appendChatMsg('ai', `✨ ${res.message}`, { showUndo: true });
      showToast('AI đã chỉnh ảnh theo yêu cầu');
    } else {
      appendChatMsg('ai', res.message);
    }
  }

  function bindAiEvents() {
    if (!AI) return;
    updateAiKeyBadge();
    initDraggableAiFab();
    initVoiceInput();

    if (els.aiChatCloseBtn) {
      els.aiChatCloseBtn.addEventListener('click', closeAiChat);
    }

    if (els.aiChatClearBtn) {
      els.aiChatClearBtn.addEventListener('click', () => {
        if (!els.aiChatFeed) return;
        els.aiChatFeed.innerHTML = '';
        appendChatMsg('ai', 'Đã xóa lịch sử trò chuyện. Hãy nhắn hoặc nói yêu cầu sửa ảnh tiếp theo nhé!');
      });
    }

    if (els.aiOpenEraserBtn) {
      els.aiOpenEraserBtn.addEventListener('click', () => setEraserMode(true, false));
    }

    if (els.aiModeTabs) {
      els.aiModeTabs.querySelectorAll('.seg-btn').forEach((btn) => {
        btn.addEventListener('click', () => setAiMode(btn.dataset.aimode));
      });
    }

    if (els.aiConfigBtn) {
      els.aiConfigBtn.addEventListener('click', openAiConfigModal);
    }
    if (els.aiConfigCloseBtn) {
      els.aiConfigCloseBtn.addEventListener('click', closeAiConfigModal);
    }
    if (els.aiConfigModal) {
      els.aiConfigModal.addEventListener('click', (e) => {
        if (e.target === els.aiConfigModal) closeAiConfigModal();
      });
    }
    if (els.aiKeySaveBtn) {
      els.aiKeySaveBtn.addEventListener('click', () => {
        AI.setApiKey(els.aiApiKeyInput.value);
        geminiPaidImageBlocked = false;
        updateAiKeyBadge();
        closeAiConfigModal();
        const hasKey = Boolean(AI.getApiKey());
        showToast(hasKey ? 'Đã kết nối Gemini AI thành công!' : 'Đã chuyển sang chế độ AI tức thì miễn phí');
      });
    }
    if (els.aiKeyTestBtn) {
      els.aiKeyTestBtn.addEventListener('click', async () => {
        const key = (els.aiApiKeyInput.value || '').trim();
        els.aiKeyTestStatus.classList.remove('hidden', 'is-error');
        els.aiKeyTestStatus.textContent = 'Đang kiểm tra kết nối tới Google Gemini API...';
        els.aiKeyTestBtn.disabled = true;
        try {
          await AI.testGeminiConnection(key);
          els.aiKeyTestStatus.textContent = '✅ Kết nối Gemini AI thành công! Hãy bấm "Lưu kết nối".';
        } catch (err) {
          els.aiKeyTestStatus.classList.add('is-error');
          els.aiKeyTestStatus.textContent = `❌ Lỗi kết nối: ${err.message || err}`;
        } finally {
          els.aiKeyTestBtn.disabled = false;
        }
      });
    }
    if (els.aiKeyClearBtn) {
      els.aiKeyClearBtn.addEventListener('click', () => {
        AI.setApiKey('');
        els.aiApiKeyInput.value = '';
        updateAiKeyBadge();
        closeAiConfigModal();
        showToast('Đã xóa Gemini API Key');
      });
    }

    if (els.aiQuickChips) {
      els.aiQuickChips.querySelectorAll('.ai-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          const prompt = chip.dataset.prompt || '';
          const isGen = chip.dataset.gen === 'true';
          setAiMode(isGen ? 'generative' : 'color');
          if (els.aiPromptInput) els.aiPromptInput.value = prompt;
          executeAiPrompt(prompt, isGen);
        });
      });
    }

    if (els.aiPromptForm) {
      els.aiPromptForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = els.aiPromptInput.value;
        executeAiPrompt(val, false);
      });
    }

    initMagicEraser();
  }

  // --- Init ---
  buildAdjustmentSliders();
  buildHslMixer();
  buildPresetCards();
  initAllProSliders();
  initSplitHandle();
  initCropInteractions();
  initPanZoom();
  bindEvents();
  P.drawHistogram(null, els.histogramCanvas);
  // Pre-render gorgeous sample thumbnails on preset cards immediately (no empty black boxes!)
  generatePresetThumbnails(P.generateSampleImage('mountain'));
})();
