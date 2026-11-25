(function (global) {
  'use strict';

  // --- Fast Accurate sRGB <-> Linear Light LUTs ---
  const SRGB_TO_LIN = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const v = i / 255;
    SRGB_TO_LIN[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  const LIN_LUT_SIZE = 4096;
  const LIN_TO_SRGB = new Uint8Array(LIN_LUT_SIZE + 1);
  for (let i = 0; i <= LIN_LUT_SIZE; i++) {
    const v = i / LIN_LUT_SIZE;
    const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    LIN_TO_SRGB[i] = Math.max(0, Math.min(255, Math.round(s * 255)));
  }

  function linToByte(v) {
    if (v <= 0) return 0;
    if (v >= 1) return 255;
    return LIN_TO_SRGB[(v * LIN_LUT_SIZE + 0.5) | 0];
  }

  // Soft photographic highlight roll-off (prevents harsh digital neon clipping)
  function softShoulder(x) {
    if (x <= 0.82) return x;
    const excess = x - 0.82;
    return 0.82 + (0.18 * excess) / (0.18 + excess * 0.85);
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function clamp255(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // --- 8-Channel Pro HSL Bands ---
  const HSL_CHANNELS = [
    { id: 'red',     name: 'Đỏ',      color: '#e5484d', center: 0,   width: 34 },
    { id: 'orange',  name: 'Cam / Da',color: '#f28b30', center: 30,  width: 32 },
    { id: 'yellow',  name: 'Vàng',    color: '#e8c23a', center: 60,  width: 34 },
    { id: 'green',   name: 'Xanh lá', color: '#46a758', center: 120, width: 58 },
    { id: 'aqua',    name: 'Ngọc',    color: '#2eb8ac', center: 180, width: 46 },
    { id: 'blue',    name: 'Dương',   color: '#3b82f6', center: 228, width: 46 },
    { id: 'purple',  name: 'Tím',     color: '#8b5cf6', center: 278, width: 44 },
    { id: 'magenta', name: 'Hồng',    color: '#ec4899', center: 326, width: 38 },
  ];

  function createDefaultHSL() {
    const hsl = {};
    HSL_CHANNELS.forEach((ch) => {
      hsl[ch.id] = { h: 0, s: 0, l: 0 };
    });
    return hsl;
  }

  const DEFAULT_ADJUSTMENTS = {
    // Light
    exposure: 0,     // -100..100 (mapped to -2.0..+2.0 EV)
    contrast: 0,     // -100..100 (filmic S-curve)
    highlights: 0,   // -100..100
    shadows: 0,      // -100..100
    whites: 0,       // -100..100
    blacks: 0,       // -100..100
    // Color & Skin
    temperature: 0,  // -100..100
    tint: 0,         // -100..100
    vibrance: 0,     // -100..100 (skin-protected)
    saturation: 0,   // -100..100
    skinGlow: 0,     // 0..100 (VIP portrait skin tone brightener & smoother)
    // Pro Detail & Effects
    clarity: 0,      // -100..100 (VIP local midtone micro-contrast)
    dehaze: 0,       // -100..100 (VIP atmospheric contrast & depth)
    sharpen: 0,      // 0..100
    glow: 0,         // 0..100 (VIP Pro-Mist / dreamy halation)
    vignette: 0,     // -100..100
    grain: 0,        // 0..100
    fade: 0,         // 0..100
    bokeh: 0,        // 0..100 (VIP Portrait / Background Blur)
    blur: 0,         // 0..20
    sepia: 0,        // 0..100
  };

  const SLIDER_GROUPS = {
    light: [
      { key: 'exposure',   label: 'Phơi sáng (EV)',       min: -100, max: 100, step: 1 },
      { key: 'contrast',   label: 'Tương phản',           min: -100, max: 100, step: 1 },
      { key: 'highlights', label: 'Vùng sáng (Highlights)', min: -100, max: 100, step: 1 },
      { key: 'shadows',    label: 'Vùng tối (Shadows)',   min: -100, max: 100, step: 1 },
      { key: 'whites',     label: 'Điểm trắng',           min: -100, max: 100, step: 1 },
      { key: 'blacks',     label: 'Điểm đen',             min: -100, max: 100, step: 1 },
    ],
    color: [
      { key: 'temperature', label: 'Nhiệt độ màu (K)',     min: -100, max: 100, step: 1 },
      { key: 'tint',        label: 'Sắc thái (Tint)',      min: -100, max: 100, step: 1 },
      { key: 'vibrance',    label: 'Độ tươi thông minh',   min: -100, max: 100, step: 1 },
      { key: 'saturation',  label: 'Độ bão hòa',           min: -100, max: 100, step: 1 },
      { key: 'skinGlow',    label: 'Tôn da rạng rỡ (VIP)', min: 0,    max: 100, step: 1 },
    ],
    detail: [
      { key: 'clarity',  label: 'Trong trẻo (Clarity)',   min: -100, max: 100, step: 1 },
      { key: 'dehaze',   label: 'Khử sương mù (Dehaze)',  min: -100, max: 100, step: 1 },
      { key: 'sharpen',  label: 'Độ sắc nét',             min: 0,    max: 100, step: 1 },
      { key: 'glow',     label: 'Ánh sáng mơ (Pro Mist)', min: 0,    max: 100, step: 1 },
      { key: 'bokeh',    label: 'Xóa phông nền (Bokeh)',  min: 0,    max: 100, step: 1 },
      { key: 'vignette', label: 'Làm tối góc',            min: -100, max: 100, step: 1 },
      { key: 'grain',    label: 'Hạt phim hữu cơ',        min: 0,    max: 100, step: 1 },
      { key: 'fade',     label: 'Phim mờ (Fade)',         min: 0,    max: 100, step: 1 },
      { key: 'blur',     label: 'Làm mờ mềm',             min: 0,    max: 20,  step: 0.5 },
      { key: 'sepia',    label: 'Nâu cổ điển (Sepia)',    min: 0,    max: 100, step: 1 },
    ],
  };

  // --- 16 Calibrated Leica Looks, Classic Film & Modern VIP Presets ---
  const PRESETS = [
    {
      id: 'original',
      name: 'Nguyên bản',
      desc: 'Màu gốc chuẩn',
      cat: 'all',
      values: {},
    },
    {
      id: 'leica_chrome',
      name: 'Leica Chrome',
      desc: 'Đỏ sâu, bóng ấm huyền thoại',
      cat: 'leica',
      badge: 'VIP',
      values: {
        contrast: 18,
        highlights: -14,
        shadows: -8,
        blacks: -8,
        temperature: 6,
        vibrance: 12,
        saturation: -4,
        clarity: 14,
        sharpen: 16,
        vignette: 18,
        grain: 8,
      },
      hsl: {
        red:    { h: -4, s: 18, l: -6 },
        orange: { h: 2,  s: 4,  l: 4 },
        green:  { h: -10, s: -18, l: -6 },
        blue:   { h: -6, s: -12, l: -8 },
      },
      splitTone: { shadow: [-3, 1, 5], highlight: [9, 6, -2] },
    },
    {
      id: 'leica_contemporary',
      name: 'Leica Contemporary',
      desc: 'Hiện đại, trong sạch & dịu',
      cat: 'leica',
      badge: 'VIP',
      values: {
        exposure: 5,
        contrast: 8,
        highlights: -18,
        shadows: 14,
        whites: 8,
        temperature: -3,
        vibrance: 10,
        saturation: -8,
        clarity: 10,
        sharpen: 14,
      },
      hsl: {
        orange: { h: 2, s: -4, l: 6 },
        green:  { h: 6, s: -14, l: 2 },
        blue:   { h: -4, s: -8, l: 4 },
      },
      splitTone: { shadow: [-4, 2, 6], highlight: [4, 4, 2] },
    },
    {
      id: 'leica_classic',
      name: 'Leica Classic',
      desc: 'Tương phản sâu, analog mượt',
      cat: 'leica',
      values: {
        contrast: 22,
        highlights: -14,
        shadows: -10,
        blacks: -12,
        temperature: 7,
        vibrance: 14,
        saturation: -6,
        clarity: 16,
        sharpen: 18,
        vignette: 24,
        grain: 10,
      },
      splitTone: { shadow: [-4, 0, 7], highlight: [10, 5, -4] },
    },
    {
      id: 'leica_eternal',
      name: 'Leica Eternal',
      desc: 'Rực rỡ tự nhiên, trời sâu',
      cat: 'leica',
      values: {
        contrast: 16,
        highlights: -10,
        shadows: 8,
        dehaze: 14,
        vibrance: 24,
        saturation: 8,
        clarity: 14,
        sharpen: 18,
        vignette: 12,
      },
      hsl: {
        blue:  { h: -4, s: 18, l: -10 },
        green: { h: 6,  s: 10, l: -4 },
      },
    },
    {
      id: 'leica_mono',
      name: 'Leica Monochrom',
      desc: 'Đen trắng giàu sắc độ',
      cat: 'leica',
      badge: 'VIP',
      values: {
        contrast: 28,
        highlights: -12,
        shadows: 8,
        whites: 16,
        blacks: -18,
        clarity: 22,
        sharpen: 22,
        vignette: 24,
        grain: 16,
      },
      bwWeights: [0.34, 0.56, 0.10], // Classic red/orange filter B&W lift
    },
    {
      id: 'fuji_classic_chrome',
      name: 'Fuji Classic Chrome',
      desc: 'Phóng sự đường phố trầm ấm',
      cat: 'film',
      badge: 'VIP',
      values: {
        contrast: 14,
        highlights: -16,
        shadows: -6,
        temperature: 4,
        vibrance: -6,
        saturation: -14,
        clarity: 12,
        fade: 10,
        grain: 12,
      },
      hsl: {
        red:    { h: -4,  s: 12,  l: -4 },
        yellow: { h: -6,  s: -14, l: 2 },
        green:  { h: -18, s: -26, l: -8 },
        aqua:   { h: -10, s: -14, l: -4 },
        blue:   { h: -14, s: -18, l: -6 },
      },
      splitTone: { shadow: [-4, 4, 6], highlight: [8, 6, 0] },
    },
    {
      id: 'fuji_classic_neg',
      name: 'Fuji Classic Neg',
      desc: 'Màu phim Nhật cổ điển cá tính',
      cat: 'film',
      badge: 'VIP',
      values: {
        contrast: 22,
        highlights: -10,
        shadows: 6,
        temperature: 2,
        tint: -4,
        vibrance: 10,
        saturation: -6,
        fade: 12,
        grain: 16,
        vignette: 14,
      },
      hsl: {
        red:    { h: 6,   s: 16,  l: -4 },
        orange: { h: -4,  s: 6,   l: 6 },
        green:  { h: 16,  s: -18, l: -8 },
        blue:   { h: -12, s: -10, l: -4 },
      },
      splitTone: { shadow: [-10, 6, 8], highlight: [12, 6, -4] },
    },
    {
      id: 'portra_400',
      name: 'Kodak Portra 400',
      desc: 'Chân dung da kem mịn màng',
      cat: 'portrait',
      badge: 'VIP',
      values: {
        exposure: 8,
        contrast: -6,
        highlights: -18,
        shadows: 22,
        temperature: 12,
        tint: 5,
        vibrance: 10,
        saturation: -6,
        skinGlow: 28,
        fade: 14,
        grain: 12,
      },
      hsl: {
        orange: { h: 2,  s: -6,  l: 12 },
        yellow: { h: -6, s: -10, l: 6 },
        green:  { h: -10, s: -16, l: 4 },
      },
      splitTone: { shadow: [4, 6, 4], highlight: [11, 8, -2] },
    },
    {
      id: 'korean_airy',
      name: 'Hàn Quốc Trong Trẻo',
      desc: 'Da sáng hồng, nhẹ nhàng pastel',
      cat: 'portrait',
      badge: 'VIP',
      values: {
        exposure: 12,
        contrast: -12,
        highlights: -14,
        shadows: 24,
        whites: 10,
        temperature: -4,
        tint: 6,
        vibrance: 8,
        saturation: -10,
        skinGlow: 42,
        glow: 18,
        fade: 10,
      },
      hsl: {
        red:    { h: 6,  s: 8,   l: 8 },
        orange: { h: 4,  s: -10, l: 16 },
        yellow: { h: -6, s: -18, l: 10 },
        green:  { h: 8,  s: -20, l: 10 },
        blue:   { h: -6, s: -10, l: 10 },
      },
      splitTone: { shadow: [-4, 4, 10], highlight: [6, 3, 6] },
    },
    {
      id: 'japan_fresh',
      name: 'Nhật Bản Thanh Lịch',
      desc: 'Xanh ngọc dịu, sáng trong',
      cat: 'portrait',
      badge: 'VIP',
      values: {
        exposure: 10,
        contrast: -8,
        highlights: -16,
        shadows: 20,
        temperature: -12,
        tint: -4,
        vibrance: 6,
        saturation: -12,
        skinGlow: 22,
        glow: 14,
        fade: 14,
      },
      hsl: {
        orange: { h: 2,  s: -8,  l: 10 },
        green:  { h: 14, s: -18, l: 6 },
        aqua:   { h: 4,  s: 14,  l: 8 },
        blue:   { h: -14, s: 8,  l: 12 },
      },
      splitTone: { shadow: [-10, 8, 12], highlight: [4, 6, 4] },
    },
    {
      id: 'kodak_gold',
      name: 'Kodak Gold 200',
      desc: 'Nắng vàng ấm áp hoài niệm',
      cat: 'film',
      values: {
        exposure: 6,
        contrast: 10,
        highlights: -12,
        shadows: 16,
        temperature: 26,
        tint: 4,
        vibrance: 16,
        glow: 12,
        fade: 10,
        grain: 14,
        vignette: 14,
      },
      hsl: {
        yellow: { h: -8, s: 16, l: 4 },
        green:  { h: -14, s: -12, l: -4 },
        blue:   { h: -8, s: -14, l: 2 },
      },
      splitTone: { shadow: [8, 4, -6], highlight: [20, 14, -8] },
    },
    {
      id: 'teal_orange',
      name: 'Cine Teal & Orange',
      desc: 'Điện ảnh chuẩn da & bóng xanh',
      cat: 'cinema',
      badge: 'VIP',
      values: {
        contrast: 20,
        highlights: -14,
        shadows: 10,
        blacks: -8,
        dehaze: 10,
        clarity: 12,
        vibrance: 16,
        vignette: 22,
        grain: 10,
      },
      hsl: {
        orange: { h: 0,   s: 14, l: 6 },
        yellow: { h: -14, s: 6,  l: 0 },
        green:  { h: 24,  s: -20, l: -8 },
        aqua:   { h: -6,  s: 20, l: -4 },
        blue:   { h: -18, s: 12, l: -10 },
      },
      splitTone: { shadow: [-18, 10, 20], highlight: [20, 9, -12] },
    },
    {
      id: 'saigon_vintage',
      name: 'Sài Gòn Vintage',
      desc: 'Hoàng hôn nhiệt đới retro',
      cat: 'film',
      values: {
        contrast: 6,
        highlights: -18,
        shadows: 16,
        temperature: 18,
        tint: -4,
        saturation: -12,
        fade: 24,
        sepia: 12,
        grain: 18,
        vignette: 18,
      },
      hsl: {
        yellow: { h: -10, s: 12, l: -2 },
        green:  { h: -20, s: -24, l: -10 },
        blue:   { h: -12, s: -24, l: -4 },
      },
      splitTone: { shadow: [2, 8, 2], highlight: [18, 12, -8] },
    },
    {
      id: 'tokyo_night',
      name: 'Đêm Tokyo Neon',
      desc: 'Ánh đèn đêm nổi khối sắc nét',
      cat: 'cinema',
      values: {
        contrast: 22,
        highlights: -8,
        shadows: 6,
        temperature: -18,
        tint: 10,
        dehaze: 12,
        clarity: 16,
        vibrance: 24,
        glow: 18,
        vignette: 24,
      },
      hsl: {
        aqua:    { h: -6, s: 24, l: 6 },
        blue:    { h: -8, s: 18, l: -6 },
        magenta: { h: -6, s: 24, l: 6 },
      },
      splitTone: { shadow: [-14, 6, 22], highlight: [14, -4, 14] },
    },
    {
      id: 'noir_cinema',
      name: 'Noir Điện Ảnh',
      desc: 'Đen trắng tương phản kịch tính',
      cat: 'cinema',
      values: {
        exposure: -4,
        contrast: 46,
        highlights: 8,
        shadows: -24,
        whites: 20,
        blacks: -26,
        clarity: 28,
        sharpen: 24,
        vignette: 40,
        grain: 22,
      },
      bwWeights: [0.42, 0.48, 0.10],
    },
  ];

  // --- RGB <-> HSL Helpers (0..1 space, H in 0..360) ---
  function rgbToHsl(r, g, b) {
    const max = r > g ? (r > b ? r : b) : (g > b ? g : b);
    const min = r < g ? (r < b ? r : b) : (g < b ? g : b);
    const l = (max + min) * 0.5;
    const d = max - min;
    if (d < 0.00001) return [0, 0, l];

    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    return [h * 60, s, l];
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 0.5) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hslToRgb(h, s, l) {
    if (s <= 0.00001) return [l, l, l];
    const hNorm = (((h % 360) + 360) % 360) / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
      hue2rgb(p, q, hNorm + 1 / 3),
      hue2rgb(p, q, hNorm),
      hue2rgb(p, q, hNorm - 1 / 3),
    ];
  }

  function hueWeight(h, center, halfWidth) {
    let diff = Math.abs(h - center);
    if (diff > 180) diff = 360 - diff;
    if (diff >= halfWidth) return 0;
    // Smooth cosine feather to avoid color banding
    const t = diff / halfWidth;
    return 0.5 * (1 + Math.cos(t * Math.PI));
  }

  /**
   * Computes effective combined adjustments + merged HSL + preset metadata.
   */
  function getEffectiveParams(state) {
    const preset = PRESETS.find((p) => p.id === state.presetId) || PRESETS[0];
    const strength = clamp((state.presetStrength ?? 100) / 100, 0, 1);
    const out = {};

    for (const key in DEFAULT_ADJUSTMENTS) {
      const base = state.adjustments[key] || 0;
      const pVal = preset.values && preset.values[key] ? preset.values[key] * strength : 0;
      out[key] = base + pVal;
    }

    out.exposure = clamp(out.exposure, -120, 120);
    out.contrast = clamp(out.contrast, -100, 120);
    out.highlights = clamp(out.highlights, -120, 120);
    out.shadows = clamp(out.shadows, -120, 120);
    out.whites = clamp(out.whites, -100, 100);
    out.blacks = clamp(out.blacks, -100, 100);
    out.temperature = clamp(out.temperature, -120, 120);
    out.tint = clamp(out.tint, -120, 120);
    out.vibrance = clamp(out.vibrance, -100, 120);
    out.saturation = clamp(out.saturation, -100, 120);
    out.skinGlow = clamp(out.skinGlow, 0, 100);
    out.clarity = clamp(out.clarity, -100, 120);
    out.dehaze = clamp(out.dehaze, -100, 100);
    out.sharpen = clamp(out.sharpen, 0, 120);
    out.glow = clamp(out.glow, 0, 100);
    out.bokeh = clamp(out.bokeh, 0, 100);
    out.blur = clamp(out.blur, 0, 24);
    out.vignette = clamp(out.vignette, -100, 100);
    out.grain = clamp(out.grain, 0, 100);
    out.fade = clamp(out.fade, 0, 100);
    out.sepia = clamp(out.sepia, 0, 100);

    // Merge user HSL + preset HSL
    const mergedHsl = [];
    let hasHsl = false;
    const userHsl = state.hsl || {};
    const presetHsl = preset.hsl || {};

    for (let i = 0; i < HSL_CHANNELS.length; i++) {
      const ch = HSL_CHANNELS[i];
      const u = userHsl[ch.id] || { h: 0, s: 0, l: 0 };
      const p = presetHsl[ch.id] || { h: 0, s: 0, l: 0 };
      const h = clamp((u.h || 0) + (p.h || 0) * strength, -100, 100);
      const s = clamp((u.s || 0) + (p.s || 0) * strength, -100, 100);
      const l = clamp((u.l || 0) + (p.l || 0) * strength, -100, 100);
      if (Math.abs(h) > 0.3 || Math.abs(s) > 0.3 || Math.abs(l) > 0.3) {
        hasHsl = true;
        mergedHsl.push({
          center: ch.center,
          width: ch.width,
          dh: h * 0.45,        // up to +-45 deg smooth shift
          ds: s / 100,         // -1..+1
          dl: (l / 100) * 0.35 // smooth luminance control
        });
      }
    }

    out.hslActive = hasHsl ? mergedHsl : null;
    out.bwWeights = preset.bwWeights || null;
    out.bwAmount = preset.bwWeights ? strength : 0;

    out.splitTone = preset.splitTone && strength > 0
      ? {
          shadow: preset.splitTone.shadow.map((v) => v * strength),
          highlight: preset.splitTone.highlight.map((v) => v * strength),
        }
      : null;

    return out;
  }

  /**
   * Renders geometric transforms (rotate 90s, flip, straighten, crop).
   */
  function renderGeometry(source, transform, maxDim) {
    const srcW = source.naturalWidth || source.width;
    const srcH = source.naturalHeight || source.height;

    const rot90 = ((transform.rotate || 0) % 360 + 360) % 360;
    const swapped = rot90 === 90 || rot90 === 270;
    const baseW = swapped ? srcH : srcW;
    const baseH = swapped ? srcW : srcH;

    const crop = transform.crop || { x: 0, y: 0, w: 1, h: 1 };
    const cropX = clamp(crop.x, 0, 0.99);
    const cropY = clamp(crop.y, 0, 0.99);
    const cropW = clamp(crop.w, 0.01, 1 - cropX);
    const cropH = clamp(crop.h, 0.01, 1 - cropY);

    const fullW = Math.max(1, Math.round(baseW * cropW));
    const fullH = Math.max(1, Math.round(baseH * cropH));

    let scale = 1;
    if (maxDim && Math.max(fullW, fullH) > maxDim) {
      scale = maxDim / Math.max(fullW, fullH);
    }

    const outW = Math.max(1, Math.round(fullW * scale));
    const outH = Math.max(1, Math.round(fullH * scale));
    const transW = Math.max(1, Math.round(baseW * scale));
    const transH = Math.max(1, Math.round(baseH * scale));

    const temp = document.createElement('canvas');
    temp.width = transW;
    temp.height = transH;
    const tctx = temp.getContext('2d', { willReadFrequently: true });
    tctx.imageSmoothingEnabled = true;
    tctx.imageSmoothingQuality = 'high';

    tctx.save();
    tctx.translate(transW / 2, transH / 2);

    const angleDeg = transform.straighten || 0;
    const angleRad = (angleDeg * Math.PI) / 180;
    let straightenZoom = 1;
    if (Math.abs(angleDeg) > 0.01) {
      const absSin = Math.abs(Math.sin(angleRad));
      const absCos = Math.abs(Math.cos(angleRad));
      const aspect = transW / transH;
      straightenZoom = Math.max(absCos + absSin / aspect, absCos + absSin * aspect);
    }

    tctx.scale(
      (transform.flipH ? -1 : 1) * straightenZoom,
      (transform.flipV ? -1 : 1) * straightenZoom
    );
    tctx.rotate((rot90 * Math.PI) / 180 + angleRad);

    const drawW = srcW * scale;
    const drawH = srcH * scale;
    tctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
    tctx.restore();

    if (cropX === 0 && cropY === 0 && cropW >= 0.999 && cropH >= 0.999) {
      return { canvas: temp, fullWidth: fullW, fullHeight: fullH };
    }

    const cropped = document.createElement('canvas');
    cropped.width = outW;
    cropped.height = outH;
    const cctx = cropped.getContext('2d', { willReadFrequently: true });
    cctx.drawImage(
      temp,
      Math.round(cropX * transW),
      Math.round(cropY * transH),
      outW,
      outH,
      0,
      0,
      outW,
      outH
    );

    return { canvas: cropped, fullWidth: fullW, fullHeight: fullH };
  }

  /**
   * Generates a fast blurred reference pixel array for Clarity (local midtone contrast) and Glow (Pro-Mist).
   */
  function createBlurredPixels(sourceCanvas, radiusPx) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    // Downsample to 1/3 for super fast wide-radius photographic blur
    const sw = Math.max(24, Math.round(w / 3));
    const sh = Math.max(24, Math.round(h / 3));

    const small = document.createElement('canvas');
    small.width = sw;
    small.height = sh;
    const sctx = small.getContext('2d');
    sctx.filter = `blur(${Math.max(1.5, radiusPx / 3).toFixed(1)}px)`;
    sctx.drawImage(sourceCanvas, 0, 0, sw, sh);

    const up = document.createElement('canvas');
    up.width = w;
    up.height = h;
    const uctx = up.getContext('2d', { willReadFrequently: true });
    uctx.imageSmoothingEnabled = true;
    uctx.imageSmoothingQuality = 'high';
    uctx.drawImage(small, 0, 0, w, h);
    return uctx.getImageData(0, 0, w, h).data;
  }

  /**
   * Core Color-Accurate Pixel Grading Engine.
   */
  function processPixels(imageData, params, blurredData) {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;

    // 1. Linear EV exposure (-2.0..+2.0 stops)
    const expGain = Math.pow(2, params.exposure / 50);

    // 2. Calibrated Kelvin/Tint linear gains (neutral luminance-preserving)
    const temp = params.temperature / 100;
    const tint = params.tint / 100;
    const rGain = Math.pow(2, temp * 0.28 + tint * 0.10);
    const gGain = Math.pow(2, -tint * 0.16);
    const bGain = Math.pow(2, -temp * 0.28 + tint * 0.10);
    // Normalize white balance gain so brightness stays accurate
    const wbNorm = 1 / (0.2126 * rGain + 0.7152 * gGain + 0.0722 * bGain);
    const rWB = rGain * wbNorm * expGain;
    const gWB = gGain * wbNorm * expGain;
    const bWB = bGain * wbNorm * expGain;

    // 3. Tone controls
    const contrastVal = params.contrast / 100;
    const hi = params.highlights / 100;
    const sh = params.shadows / 100;
    const wh = params.whites / 100;
    const bl = params.blacks / 100;
    const dehaze = params.dehaze / 100;
    const clarityAmt = (params.clarity / 100) * 0.62;
    const glowAmt = (params.glow / 100) * 0.55;
    const skinGlow = params.skinGlow / 100;

    const vib = params.vibrance / 100;
    const sat = 1 + params.saturation / 100;
    const fadeAmt = (params.fade / 100) * 0.22;
    const sepiaAmt = params.sepia / 100;
    const vigAmt = params.vignette / 100;
    const grainAmt = (params.grain / 100) * 34;

    const split = params.splitTone;
    const hslList = params.hslActive;
    const bwWeights = params.bwWeights;
    const bwAmount = params.bwAmount || 0;

    const hasLocal = Boolean(blurredData) && (Math.abs(clarityAmt) > 0.01 || glowAmt > 0.01);
    const hasHslOrSkin = Boolean(hslList) || skinGlow > 0.005;
    const hasVig = Math.abs(vigAmt) > 0.005;
    const hasGrain = grainAmt > 0.2;
    const hasSepia = sepiaAmt > 0.005;
    const hasSplit = Boolean(split);

    const inv255 = 1 / 255;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const invMaxDist = 1 / Math.sqrt(cx * cx + cy * cy);

    let idx = 0;
    for (let y = 0; y < h; y++) {
      const dy = y - cy;
      const dy2 = dy * dy;

      for (let x = 0; x < w; x++) {
        // --- A. Linear-Light Stage (True Exposure + White Balance + Highlight Rolloff) ---
        let rl = SRGB_TO_LIN[data[idx]] * rWB;
        let gl = SRGB_TO_LIN[data[idx + 1]] * gWB;
        let blin = SRGB_TO_LIN[data[idx + 2]] * bWB;

        // Soft filmic shoulder avoids ugly clipped neon highlights
        rl = softShoulder(rl);
        gl = softShoulder(gl);
        blin = softShoulder(blin);

        // Convert back to perceptual sRGB [0..1] for tonal & color grading
        let r = linToByte(rl) * inv255;
        let g = linToByte(gl) * inv255;
        let b = linToByte(blin) * inv255;

        // --- B. Dehaze (atmospheric clarity + deep shadow recovery + saturation) ---
        if (dehaze !== 0) {
          const minC = r < g ? (r < b ? r : b) : (g < b ? g : b);
          if (dehaze > 0) {
            // Subtract estimated veil and restore contrast & depth
            const veil = minC * dehaze * 0.34;
            const scale = 1 / (1 - dehaze * 0.26);
            r = (r - veil) * scale;
            g = (g - veil) * scale;
            b = (b - veil) * scale;
          } else {
            // Soft dreamy atmospheric haze
            const haze = (-dehaze) * 0.26;
            r = r * (1 - haze) + haze * 0.94;
            g = g * (1 - haze) + haze * 0.96;
            b = b * (1 - haze) + haze * 0.98;
          }
        }

        // --- C. Perceptual Tonal Grading (Highlights / Shadows / Whites / Blacks) ---
        const lum = clamp(0.2126 * r + 0.7152 * g + 0.0722 * b, 0, 1);

        if (sh !== 0) {
          const sMask = 1 - smoothstep(0.04, 0.58, lum);
          const sGain = sh * 0.40 * sMask;
          r += sGain * (0.18 + r * 0.82);
          g += sGain * (0.18 + g * 0.82);
          b += sGain * (0.18 + b * 0.82);
        }

        if (hi !== 0) {
          const hMask = smoothstep(0.42, 0.98, lum);
          const hDelta = hi * 0.38 * hMask;
          // Preserve color ratio cleanly during highlight recovery
          r += hDelta * (0.28 + (1 - clamp(r, 0, 1)) * 0.72);
          g += hDelta * (0.28 + (1 - clamp(g, 0, 1)) * 0.72);
          b += hDelta * (0.28 + (1 - clamp(b, 0, 1)) * 0.72);
        }

        if (bl !== 0) {
          const bMask = 1 - smoothstep(0.0, 0.32, lum);
          const bShift = bl * 0.20 * bMask;
          r += bShift;
          g += bShift;
          b += bShift;
        }

        if (wh !== 0) {
          const wMask = smoothstep(0.68, 1.0, lum);
          const wShift = wh * 0.20 * wMask;
          r += wShift;
          g += wShift;
          b += wShift;
        }

        // --- D. Filmic Luminance-Preserving S-Curve Contrast ---
        if (contrastVal !== 0) {
          const lPre = clamp(0.2126 * r + 0.7152 * g + 0.0722 * b, 0.0001, 1);
          // Smooth S-curve: f(x) = x + c * sin(2*pi*x) / (2*pi) -> gentle, natural, never harsh!
          const sDelta = -contrastVal * 0.14 * Math.sin(lPre * Math.PI * 2);
          const lPost = clamp(lPre + sDelta, 0, 1);
          // Blend between ratio-preserving (color accurate) and direct channel contrast
          const ratio = lPost / lPre;
          const cr = r * ratio;
          const cg = g * ratio;
          const cb = b * ratio;
          const cFac = contrastVal >= 0 ? 1 + contrastVal * 0.45 : 1 / (1 - contrastVal * 0.45);
          const dr = (r - 0.5) * cFac + 0.5;
          const dg = (g - 0.5) * cFac + 0.5;
          const db = (b - 0.5) * cFac + 0.5;
          r = cr * 0.72 + dr * 0.28;
          g = cg * 0.72 + dg * 0.28;
          b = cb * 0.72 + db * 0.28;
        }

        // --- E. Clarity (Local Midtone Micro-Contrast) & Pro-Mist Glow ---
        if (hasLocal) {
          const br = blurredData[idx] * inv255;
          const bg = blurredData[idx + 1] * inv255;
          const bb = blurredData[idx + 2] * inv255;

          if (Math.abs(clarityAmt) > 0.01) {
            const lCur = clamp(0.2126 * r + 0.7152 * g + 0.0722 * b, 0, 1);
            // Midtone mask so Clarity doesn't clip shadows or blow highlights
            const midMask = Math.sin(lCur * Math.PI);
            const lBlur = 0.2126 * br + 0.7152 * bg + 0.0722 * bb;
            const detail = (lCur - lBlur) * clarityAmt * midMask;
            r += detail;
            g += detail;
            b += detail;
          }

          if (glowAmt > 0.01) {
            // Pro-Mist / Halation bloom focused on brighter highlights
            const bLum = 0.2126 * br + 0.7152 * bg + 0.0722 * bb;
            const bloomMask = smoothstep(0.38, 0.95, bLum) * glowAmt;
            // Screen-like soft light blend with warm natural halation tint
            r = r + (1 - r) * br * bloomMask * 1.04;
            g = g + (1 - g) * bg * bloomMask * 1.00;
            b = b + (1 - b) * bb * bloomMask * 0.94;
          }
        }

        // Clamp cleanly before HSL
        r = clamp(r, 0, 1);
        g = clamp(g, 0, 1);
        b = clamp(b, 0, 1);

        // --- F. Pro 8-Channel HSL Mixer & VIP Skin Glow ---
        if (hasHslOrSkin) {
          let [H, S, L] = rgbToHsl(r, g, b);

          if (hslList && S > 0.015) {
            let dhTotal = 0;
            let dsTotal = 0;
            let dlTotal = 0;
            for (let k = 0; k < hslList.length; k++) {
              const band = hslList[k];
              const weight = hueWeight(H, band.center, band.width);
              if (weight > 0.001) {
                dhTotal += band.dh * weight;
                dsTotal += band.ds * weight;
                dlTotal += band.dl * weight;
              }
            }
            H = (H + dhTotal + 360) % 360;
            S = clamp(S * (1 + dsTotal), 0, 1);
            // Weight luminance by saturation so neutral grays don't shift unevenly
            const satFade = smoothstep(0.02, 0.24, S);
            L = clamp(L + dlTotal * satFade * (0.4 + 0.6 * (1 - Math.abs(L - 0.5) * 1.5)), 0, 1);
          }

          if (skinGlow > 0.005 && S > 0.04) {
            // Warm skin hue band (~8° to 44°, centered around 24°)
            const skinW = hueWeight(H, 24, 22) * smoothstep(0.04, 0.22, S) * (1 - smoothstep(0.68, 0.95, S));
            if (skinW > 0.001) {
              // Subtle brightening + creamy rosy tone refinement
              L = clamp(L + skinGlow * 0.13 * skinW * (1 - L * 0.55), 0, 1);
              S = clamp(S * (1 - skinGlow * 0.16 * skinW), 0, 1);
              H = (H - skinGlow * 2.5 * skinW + 360) % 360; // slight rosy clean shift
            }
          }

          [r, g, b] = hslToRgb(H, S, L);
        }

        // --- G. Matte Fade ---
        if (fadeAmt > 0) {
          r = fadeAmt + r * (1 - fadeAmt * 0.85);
          g = fadeAmt + g * (1 - fadeAmt * 0.85);
          b = fadeAmt + b * (1 - fadeAmt * 0.85);
        }

        // --- H. Split Toning (3-zone cinematic balance) ---
        if (hasSplit) {
          const lNow = clamp(0.2126 * r + 0.7152 * g + 0.0722 * b, 0, 1);
          const sMask = (1 - smoothstep(0.08, 0.58, lNow)) * inv255;
          const hMask = smoothstep(0.42, 0.94, lNow) * inv255;
          r += split.shadow[0] * sMask + split.highlight[0] * hMask;
          g += split.shadow[1] * sMask + split.highlight[1] * hMask;
          b += split.shadow[2] * sMask + split.highlight[2] * hMask;
        }

        // --- I. Skin-Protected Vibrance & Saturation ---
        if (vib !== 0 || sat !== 1) {
          const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          let satMult = sat;
          if (vib !== 0) {
            const mx = Math.max(r, g, b);
            const mn = Math.min(r, g, b);
            const curSat = mx > 0.0001 ? (mx - mn) / mx : 0;
            // Extra gentle skin-tone protection when r > g > b
            const isSkinLike = (r > g && g > b) ? 0.55 : 1.0;
            satMult *= 1 + vib * (1 - curSat) * 0.82 * isSkinLike;
          }
          r = gray + (r - gray) * satMult;
          g = gray + (g - gray) * satMult;
          b = gray + (b - gray) * satMult;
        }

        // --- J. Authentic Channel-Weighted Monochrome (Leica Monochrom / Noir) ---
        if (bwWeights && bwAmount > 0.005) {
          const mono = r * bwWeights[0] + g * bwWeights[1] + b * bwWeights[2];
          r = r + (mono - r) * bwAmount;
          g = g + (mono - g) * bwAmount;
          b = b + (mono - b) * bwAmount;
        }

        // --- K. Sepia ---
        if (hasSepia) {
          const sr = r * 0.393 + g * 0.769 + b * 0.189;
          const sg = r * 0.349 + g * 0.686 + b * 0.168;
          const sb = r * 0.272 + g * 0.534 + b * 0.131;
          r = r + (sr - r) * sepiaAmt;
          g = g + (sg - g) * sepiaAmt;
          b = b + (sb - b) * sepiaAmt;
        }

        // --- L. Vignette ---
        if (hasVig) {
          const dx = x - cx;
          const dist = Math.sqrt(dx * dx + dy2) * invMaxDist;
          const vMask = smoothstep(0.35, 1.06, dist);
          if (vigAmt > 0) {
            const darken = 1 - vMask * vigAmt * 0.76;
            r *= darken;
            g *= darken;
            b *= darken;
          } else {
            const lighten = vMask * (-vigAmt) * 0.58;
            r += (1 - r) * lighten;
            g += (1 - g) * lighten;
            b += (1 - b) * lighten;
          }
        }

        let R = r * 255;
        let G = g * 255;
        let B = b * 255;

        // --- M. Organic Film Grain ---
        if (hasGrain) {
          let n = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
          n = (n ^ (n >> 13)) * 1274126177;
          n = n ^ (n >> 16);
          const noise = ((n & 0xff) * inv255 - 0.5) * 2;
          const midW = 0.5 + 0.5 * (1 - Math.abs(clamp((R + G + B) / 765, 0, 1) - 0.5) * 2);
          const gDelta = noise * grainAmt * midW;
          R += gDelta;
          G += gDelta;
          B += gDelta;
        }

        data[idx] = clamp255(R);
        data[idx + 1] = clamp255(G);
        data[idx + 2] = clamp255(B);
        idx += 4;
      }
    }

    // --- N. Edge-Aware Unsharp Mask Sharpen ---
    if (params.sharpen > 0.5 && w > 2 && h > 2) {
      applySharpen(imageData, (params.sharpen / 100) * 1.1);
    }
  }

  function applySharpen(imageData, amount) {
    const w = imageData.width;
    const h = imageData.height;
    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;
    const rowStride = w * 4;

    for (let y = 1; y < h - 1; y++) {
      let i = y * rowStride + 4;
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          const center = src[i + c];
          const avg = (
            src[i - 4 + c] +
            src[i + 4 + c] +
            src[i - rowStride + c] +
            src[i + rowStride + c]
          ) * 0.25;
          const diff = center - avg;
          // Threshold micro-noise to avoid amplifying smooth skin grain
          if (Math.abs(diff) > 2.2) {
            dst[i + c] = clamp255(center + diff * amount);
          }
        }
        i += 4;
      }
    }
  }

  /**
   * Auto Enhance VIP Analyzer: computes intelligent balanced corrections from actual image histogram.
   */
  function analyzeAutoEnhance(source) {
    const maxS = 240;
    const srcW = source.naturalWidth || source.width;
    const srcH = source.naturalHeight || source.height;
    const scale = Math.min(1, maxS / Math.max(srcW, srcH));
    const w = Math.max(16, Math.round(srcW * scale));
    const h = Math.max(16, Math.round(srcH * scale));

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    const lHist = new Uint32Array(256);
    const n = w * h;
    let sumR = 0, sumG = 0, sumB = 0, sumL = 0, sumSat = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const l = (r * 54 + g * 183 + b * 19) >> 8;
      lHist[l]++;
      sumR += r;
      sumG += g;
      sumB += b;
      sumL += l;
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      sumSat += mx > 0 ? (mx - mn) / mx : 0;
    }

    // Find 2nd and 98th percentile luminance
    let p2 = 0, p98 = 255, acc = 0;
    const t2 = n * 0.02;
    const t98 = n * 0.98;
    for (let i = 0; i < 256; i++) {
      acc += lHist[i];
      if (acc >= t2 && p2 === 0) p2 = i;
      if (acc >= t98) { p98 = i; break; }
    }

    const meanL = sumL / n / 255;
    const meanSat = sumSat / n;
    const avgR = sumR / n;
    const avgG = sumG / n;
    const avgB = sumB / n;

    // Gentle, tasteful auto corrections (never over-processed!)
    const exposure = Math.round(clamp((0.50 - meanL) * 48, -22, 26));
    const dynamicRange = (p98 - p2) / 255;
    const contrast = Math.round(clamp((0.86 - dynamicRange) * 45 + 6, 4, 26));
    const highlights = p98 > 236 ? -18 : -8;
    const shadows = p2 < 18 ? 18 : 10;
    const blacks = p2 > 22 ? Math.round(-Math.min(18, (p2 - 14) * 0.55)) : -4;
    const whites = p98 < 225 ? Math.round(Math.min(18, (235 - p98) * 0.4)) : 4;

    // Gentle gray-world white balance damping (only corrects obvious color cast ~35%)
    const rbDiff = (avgB - avgR) / 255;
    const temperature = Math.round(clamp(rbDiff * 55, -16, 16));
    const gCast = ((avgR + avgB) * 0.5 - avgG) / 255;
    const tint = Math.round(clamp(-gCast * 45, -10, 10));

    const vibrance = Math.round(clamp((0.42 - meanSat) * 42 + 10, 6, 24));
    const clarity = 10;
    const sharpen = 12;

    return {
      exposure,
      contrast,
      highlights,
      shadows,
      whites,
      blacks,
      temperature,
      tint,
      vibrance,
      clarity,
      sharpen,
    };
  }

  /**
   * Wraps the processed canvas in an optional gallery/polaroid/studio frame.
   */
  function applyFrame(photoCanvas, frame) {
    if (!frame || frame.style === 'none') {
      return photoCanvas;
    }

    const pw = photoCanvas.width;
    const ph = photoCanvas.height;
    const minSide = Math.min(pw, ph);
    const pad = Math.max(12, Math.round(minSide * ((frame.size || 6) / 100)));

    let top = pad;
    let side = pad;
    let bottom = pad;
    let bg = '#ffffff';
    let textPrimary = '#15171c';
    let textSub = '#6b7280';
    let innerBorder = 'rgba(0,0,0,0.08)';
    let accentDot = false;

    if (frame.style === 'dark') {
      bg = '#111316';
      textPrimary = '#f1f3f7';
      textSub = '#8a92a3';
      innerBorder = 'rgba(255,255,255,0.12)';
    } else if (frame.style === 'polaroid') {
      bottom = Math.max(pad * 3.1, Math.round(minSide * 0.16));
      bg = '#faf9f5';
    } else if (frame.style === 'film') {
      bottom = Math.max(pad * 2.5, Math.round(minSide * 0.13));
      bg = '#ffffff';
      accentDot = true;
    }

    const hasCaption = Boolean((frame.title && frame.title.trim()) || (frame.subtitle && frame.subtitle.trim()));
    if (hasCaption && frame.style !== 'polaroid' && frame.style !== 'film') {
      bottom = Math.max(bottom, Math.round(minSide * 0.12));
    }

    const out = document.createElement('canvas');
    out.width = pw + side * 2;
    out.height = ph + top + bottom;
    const ctx = out.getContext('2d');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(photoCanvas, side, top);

    ctx.strokeStyle = innerBorder;
    ctx.lineWidth = Math.max(1, Math.round(minSide * 0.0015));
    ctx.strokeRect(side + 0.5, top + 0.5, pw - 1, ph - 1);

    const title = (frame.title || '').trim() || (frame.style === 'film' ? 'LUMINA STUDIO' : '');
    const subtitle = (frame.subtitle || '').trim();

    if (title || subtitle) {
      const footerCenterY = top + ph + bottom * 0.52;
      const titleSize = clamp(Math.round(bottom * 0.23), 11, 44);
      const subSize = clamp(Math.round(bottom * 0.16), 9, 28);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (title && subtitle) {
        ctx.font = `600 ${titleSize}px Inter, -apple-system, sans-serif`;
        ctx.fillStyle = textPrimary;
        ctx.fillText(title, out.width / 2 + (accentDot ? titleSize * 0.45 : 0), footerCenterY - subSize * 0.65);

        if (accentDot) {
          const tw = ctx.measureText(title).width;
          ctx.beginPath();
          ctx.fillStyle = '#e03c31';
          ctx.arc(out.width / 2 - tw / 2 - titleSize * 0.25, footerCenterY - subSize * 0.65, titleSize * 0.26, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.font = `400 ${subSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = textSub;
        ctx.fillText(subtitle, out.width / 2, footerCenterY + titleSize * 0.62);
      } else if (title) {
        ctx.font = `600 ${titleSize}px Inter, -apple-system, sans-serif`;
        ctx.fillStyle = textPrimary;
        ctx.fillText(title, out.width / 2 + (accentDot ? titleSize * 0.45 : 0), footerCenterY);
        if (accentDot) {
          const tw = ctx.measureText(title).width;
          ctx.beginPath();
          ctx.fillStyle = '#e03c31';
          ctx.arc(out.width / 2 - tw / 2 - titleSize * 0.25, footerCenterY, titleSize * 0.26, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (subtitle) {
        ctx.font = `400 ${subSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = textSub;
        ctx.fillText(subtitle, out.width / 2, footerCenterY);
      }
    }

    return out;
  }

  /**
   * Full pipeline: geometry -> blur -> local blur (clarity/glow) -> pixel grading -> frame.
   */
  function renderPipeline(source, state, options) {
    const opts = options || {};
    const maxDim = opts.maxDim || null;
    const includeFrame = opts.includeFrame !== false;

    const geom = renderGeometry(source, state.transform, maxDim);
    const baseCanvas = geom.canvas;

    let originalCanvas = null;
    if (opts.needOriginal) {
      originalCanvas = document.createElement('canvas');
      originalCanvas.width = baseCanvas.width;
      originalCanvas.height = baseCanvas.height;
      originalCanvas.getContext('2d').drawImage(baseCanvas, 0, 0);
    }

    const params = getEffectiveParams(state);

    const work = document.createElement('canvas');
    work.width = baseCanvas.width;
    work.height = baseCanvas.height;
    const wctx = work.getContext('2d', { willReadFrequently: true });

    if (params.blur > 0.1) {
      const scaleFactor = baseCanvas.width / 1000;
      const pxBlur = Math.max(0.5, params.blur * scaleFactor);
      wctx.filter = `blur(${pxBlur.toFixed(2)}px)`;
    }
    wctx.drawImage(baseCanvas, 0, 0);
    wctx.filter = 'none';

    let blurredData = null;
    if (Math.abs(params.clarity) > 0.5 || params.glow > 0.5) {
      const radius = Math.max(10, Math.round(Math.min(work.width, work.height) * 0.025));
      blurredData = createBlurredPixels(work, radius);
    }

    const imgData = wctx.getImageData(0, 0, work.width, work.height);
    processPixels(imgData, params, blurredData);
    wctx.putImageData(imgData, 0, 0);

    // Portrait Background Blur (Bokeh): keeps center subject crisp while softly blurring outer background
    if (params.bokeh > 0.5) {
      const bokehRadius = Math.max(2, (params.bokeh / 100) * (Math.min(work.width, work.height) * 0.022));
      const blurLayer = document.createElement('canvas');
      blurLayer.width = work.width;
      blurLayer.height = work.height;
      const bctx = blurLayer.getContext('2d');
      bctx.filter = `blur(${bokehRadius.toFixed(1)}px)`;
      bctx.drawImage(work, 0, 0);
      bctx.filter = 'none';

      // Punch a soft feathered elliptical window in the blurred overlay so the subject stays sharp
      bctx.globalCompositeOperation = 'destination-out';
      const cx = work.width * 0.5;
      const cy = work.height * 0.46;
      const innerR = Math.min(work.width, work.height) * 0.24;
      const outerR = Math.max(work.width, work.height) * 0.56;
      const grad = bctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.55, 'rgba(0,0,0,0.68)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      bctx.fillStyle = grad;
      bctx.fillRect(0, 0, work.width, work.height);
      bctx.globalCompositeOperation = 'source-over';

      wctx.drawImage(blurLayer, 0, 0);
    }

    const finalCanvas = includeFrame ? applyFrame(work, state.frame) : work;
    const finalOriginal = includeFrame && originalCanvas ? applyFrame(originalCanvas, state.frame) : originalCanvas;

    return {
      processedCanvas: finalCanvas,
      originalCanvas: finalOriginal,
      imageData: imgData,
      fullWidth: geom.fullWidth,
      fullHeight: geom.fullHeight,
    };
  }

  /**
   * Draws a refined RGB + Luminance histogram (or clean subtle placeholder guide when empty).
   */
  function drawHistogram(imageData, canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle vertical guides
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const gx = Math.round((w * i) / 4) + 0.5;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }

    if (!imageData) {
      // Soft decorative empty wave placeholder instead of harsh blank black box
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) {
        const t = x / w;
        const y = h - (Math.sin(t * Math.PI) * 0.35 + Math.sin(t * Math.PI * 2.4) * 0.12 + 0.14) * h;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(114, 221, 160, 0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(114, 221, 160, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      return { meanLum: 0 };
    }

    const rHist = new Uint32Array(256);
    const gHist = new Uint32Array(256);
    const bHist = new Uint32Array(256);
    const lHist = new Uint32Array(256);

    const data = imageData.data;
    const totalPixels = imageData.width * imageData.height;
    const stride = totalPixels > 250000 ? 4 : 1;
    let sumLum = 0;
    let count = 0;

    for (let p = 0; p < totalPixels; p += stride) {
      const idx = p * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const l = (r * 54 + g * 183 + b * 19) >> 8;
      rHist[r]++;
      gHist[g]++;
      bHist[b]++;
      lHist[l]++;
      sumLum += l;
      count++;
    }

    let maxVal = 1;
    for (let i = 4; i < 252; i++) {
      if (rHist[i] > maxVal) maxVal = rHist[i];
      if (gHist[i] > maxVal) maxVal = gHist[i];
      if (bHist[i] > maxVal) maxVal = bHist[i];
      if (lHist[i] > maxVal) maxVal = lHist[i];
    }

    function drawChannel(hist, fill, stroke) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * w;
        const norm = Math.min(1, hist[i] / maxVal);
        const y = h - norm * (h - 6);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.globalCompositeOperation = 'screen';
    drawChannel(rHist, 'rgba(244, 63, 94, 0.36)', 'rgba(244, 63, 94, 0.78)');
    drawChannel(gHist, 'rgba(52, 211, 153, 0.34)', 'rgba(52, 211, 153, 0.72)');
    drawChannel(bHist, 'rgba(96, 165, 250, 0.38)', 'rgba(96, 165, 250, 0.80)');
    ctx.globalCompositeOperation = 'source-over';
    drawChannel(lHist, 'rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0.45)');

    return { meanLum: count > 0 ? Math.round((sumLum / count / 255) * 100) : 0 };
  }

  /**
   * Generates rich procedural high-res sample photos (1600x1066) offline.
   */
  function generateSampleImage(kind) {
    const c = document.createElement('canvas');
    c.width = 1600;
    c.height = 1066;
    const ctx = c.getContext('2d');

    if (kind === 'street') {
      const bg = ctx.createLinearGradient(0, 0, 0, 1066);
      bg.addColorStop(0, '#070b1a');
      bg.addColorStop(0.48, '#141a35');
      bg.addColorStop(0.65, '#1d142c');
      bg.addColorStop(1, '#090b12');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1600, 1066);

      const haze1 = ctx.createRadialGradient(420, 380, 20, 420, 380, 480);
      haze1.addColorStop(0, 'rgba(0, 212, 255, 0.42)');
      haze1.addColorStop(1, 'rgba(0, 212, 255, 0)');
      ctx.fillStyle = haze1;
      ctx.fillRect(0, 0, 1600, 1066);

      const haze2 = ctx.createRadialGradient(1180, 360, 20, 1180, 360, 500);
      haze2.addColorStop(0, 'rgba(255, 45, 110, 0.48)');
      haze2.addColorStop(1, 'rgba(255, 45, 110, 0)');
      ctx.fillStyle = haze2;
      ctx.fillRect(0, 0, 1600, 1066);

      ctx.fillStyle = '#0c101d';
      ctx.fillRect(0, 90, 410, 590);
      ctx.fillRect(1190, 70, 410, 610);
      ctx.fillStyle = '#12182a';
      ctx.fillRect(360, 180, 210, 500);
      ctx.fillRect(1030, 160, 210, 520);

      for (let bx = 40; bx < 360; bx += 46) {
        for (let by = 140; by < 580; by += 54) {
          if ((bx * 7 + by * 13) % 5 !== 0) {
            ctx.fillStyle = (bx + by) % 3 === 0 ? 'rgba(255, 198, 109, 0.72)' : 'rgba(130, 216, 255, 0.45)';
            ctx.fillRect(bx, by, 24, 30);
          }
        }
      }
      for (let bx = 1230; bx < 1560; bx += 46) {
        for (let by = 130; by < 580; by += 54) {
          if ((bx * 3 + by * 11) % 4 !== 0) {
            ctx.fillStyle = (bx + by) % 2 === 0 ? 'rgba(255, 105, 160, 0.62)' : 'rgba(255, 220, 145, 0.65)';
            ctx.fillRect(bx, by, 24, 30);
          }
        }
      }

      const signs = [
        { x: 315, y: 170, w: 66, h: 250, color: '#00e5ff' },
        { x: 430, y: 240, w: 54, h: 190, color: '#ff3b7f' },
        { x: 1120, y: 210, w: 60, h: 230, color: '#ff9e2c' },
        { x: 1215, y: 160, w: 72, h: 260, color: '#ff2e63' },
      ];
      signs.forEach((s) => {
        ctx.save();
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 32;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let ty = s.y + 22; ty < s.y + s.h - 24; ty += 36) {
          ctx.fillRect(s.x + 14, ty, s.w - 28, 16);
        }
        ctx.restore();
      });

      const centerGlow = ctx.createRadialGradient(800, 650, 10, 800, 650, 320);
      centerGlow.addColorStop(0, 'rgba(255, 178, 86, 0.9)');
      centerGlow.addColorStop(0.35, 'rgba(255, 75, 115, 0.45)');
      centerGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(450, 350, 700, 420);

      const roadGrad = ctx.createLinearGradient(0, 660, 0, 1066);
      roadGrad.addColorStop(0, '#171929');
      roadGrad.addColorStop(1, '#08090e');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, 660, 1600, 406);

      const reflections = [
        { x: 345, w: 70, c: 'rgba(0, 229, 255, 0.34)' },
        { x: 455, w: 58, c: 'rgba(255, 59, 127, 0.28)' },
        { x: 760, w: 90, c: 'rgba(255, 184, 92, 0.36)' },
        { x: 1145, w: 66, c: 'rgba(255, 158, 44, 0.3)' },
        { x: 1245, w: 80, c: 'rgba(255, 46, 99, 0.32)' },
      ];
      reflections.forEach((rf) => {
        for (let ry = 670; ry < 1050; ry += 7) {
          const jitter = Math.sin(ry * 0.14) * 14;
          const alpha = 1 - (ry - 670) / 420;
          ctx.fillStyle = rf.c;
          ctx.globalAlpha = Math.max(0.05, alpha * 0.75);
          ctx.fillRect(rf.x + jitter - rf.w / 2, ry, rf.w * (1 + (ry - 670) / 360), 4);
        }
      });
      ctx.globalAlpha = 1;

      const bokeh = [
        [220, 470, 38, 'rgba(0,229,255,0.28)'],
        [630, 520, 24, 'rgba(255,196,92,0.45)'],
        [800, 615, 18, 'rgba(255,255,255,0.85)'],
        [940, 505, 30, 'rgba(255,68,125,0.38)'],
        [1360, 460, 44, 'rgba(255,140,66,0.28)'],
      ];
      bokeh.forEach(([x, y, r, col]) => {
        ctx.beginPath();
        ctx.fillStyle = col;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      return c;
    }

    if (kind === 'portrait') {
      const bg = ctx.createRadialGradient(640, 420, 60, 800, 533, 980);
      bg.addColorStop(0, '#3a2d28');
      bg.addColorStop(0.5, '#1d1b24');
      bg.addColorStop(1, '#0c0d13');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1600, 1066);

      const keyLight = ctx.createRadialGradient(460, 300, 30, 520, 380, 620);
      keyLight.addColorStop(0, 'rgba(255, 206, 152, 0.42)');
      keyLight.addColorStop(0.55, 'rgba(232, 134, 86, 0.14)');
      keyLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = keyLight;
      ctx.fillRect(0, 0, 1600, 1066);

      const rimLight = ctx.createRadialGradient(1260, 450, 20, 1220, 480, 520);
      rimLight.addColorStop(0, 'rgba(92, 178, 255, 0.36)');
      rimLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rimLight;
      ctx.fillRect(0, 0, 1600, 1066);

      const tableGrad = ctx.createLinearGradient(0, 740, 0, 1066);
      tableGrad.addColorStop(0, '#2a2425');
      tableGrad.addColorStop(1, '#121116');
      ctx.fillStyle = tableGrad;
      ctx.fillRect(0, 740, 1600, 326);

      ctx.fillStyle = 'rgba(5, 5, 10, 0.55)';
      ctx.beginPath();
      ctx.ellipse(835, 782, 230, 34, 0, 0, Math.PI * 2);
      ctx.fill();

      const mainSphere = ctx.createRadialGradient(710, 430, 28, 795, 520, 260);
      mainSphere.addColorStop(0, '#ffe3c4');
      mainSphere.addColorStop(0.32, '#e2a37a');
      mainSphere.addColorStop(0.68, '#96543d');
      mainSphere.addColorStop(0.92, '#3a2229');
      mainSphere.addColorStop(1, '#5897d4');
      ctx.fillStyle = mainSphere;
      ctx.beginPath();
      ctx.arc(795, 525, 252, 0, Math.PI * 2);
      ctx.fill();

      const leftSphere = ctx.createRadialGradient(485, 635, 14, 520, 680, 118);
      leftSphere.addColorStop(0, '#f6f0c9');
      leftSphere.addColorStop(0.35, '#bfa55a');
      leftSphere.addColorStop(0.75, '#4d4829');
      leftSphere.addColorStop(1, '#1a1b16');
      ctx.fillStyle = leftSphere;
      ctx.beginPath();
      ctx.arc(520, 680, 112, 0, Math.PI * 2);
      ctx.fill();

      const cylGrad = ctx.createLinearGradient(1020, 460, 1210, 460);
      cylGrad.addColorStop(0, '#8cc8ff');
      cylGrad.addColorStop(0.3, '#3b73b5');
      cylGrad.addColorStop(0.75, '#192f54');
      cylGrad.addColorStop(1, '#4b9be6');
      ctx.fillStyle = cylGrad;
      ctx.fillRect(1020, 470, 185, 315);
      ctx.fillStyle = '#538ed1';
      ctx.beginPath();
      ctx.ellipse(1112.5, 470, 92.5, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      return c;
    }

    // Default: 'mountain' — Golden Alpine Sunset & Reflective Lake (great rich gamut across sky/greens/golds/blues)
    const sky = ctx.createLinearGradient(0, 0, 0, 640);
    sky.addColorStop(0, '#13203d');
    sky.addColorStop(0.32, '#2d466e');
    sky.addColorStop(0.62, '#b86259');
    sky.addColorStop(0.84, '#f09e58');
    sky.addColorStop(1, '#fde1a2');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1600, 660);

    const sunGlow = ctx.createRadialGradient(960, 470, 16, 960, 470, 420);
    sunGlow.addColorStop(0, 'rgba(255, 250, 224, 1)');
    sunGlow.addColorStop(0.18, 'rgba(255, 214, 130, 0.85)');
    sunGlow.addColorStop(0.5, 'rgba(244, 128, 82, 0.32)');
    sunGlow.addColorStop(1, 'rgba(244, 128, 82, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(400, 40, 1100, 660);

    ctx.fillStyle = 'rgba(255, 226, 186, 0.22)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(250 + i * 240, 190 + (i % 3) * 52, 190, 20, -0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawMountainRange(points, colorStart, colorEnd, baseY) {
      const grad = ctx.createLinearGradient(0, baseY - 340, 0, baseY);
      grad.addColorStop(0, colorStart);
      grad.addColorStop(1, colorEnd);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      points.forEach(([px, py]) => ctx.lineTo(px, py));
      ctx.lineTo(1600, baseY);
      ctx.closePath();
      ctx.fill();
    }

    drawMountainRange(
      [[0, 520], [180, 410], [380, 470], [610, 320], [820, 455], [1080, 360], [1310, 430], [1600, 340]],
      '#68526e',
      '#a87473',
      650
    );

    drawMountainRange(
      [[0, 580], [240, 385], [460, 515], [710, 390], [920, 540], [1220, 345], [1450, 470], [1600, 420]],
      '#393352',
      '#584863',
      660
    );

    ctx.fillStyle = 'rgba(255, 194, 128, 0.26)';
    ctx.beginPath();
    ctx.moveTo(240, 385);
    ctx.lineTo(355, 455);
    ctx.lineTo(265, 510);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(1220, 345);
    ctx.lineTo(1110, 450);
    ctx.lineTo(1230, 470);
    ctx.closePath();
    ctx.fill();

    // Lush emerald pine foreground range so green HSL shifts show vividly too!
    drawMountainRange(
      [[0, 620], [140, 535], [370, 610], [620, 645], [1050, 640], [1360, 555], [1600, 590]],
      '#1e3b2e',
      '#10211a',
      665
    );

    const lake = ctx.createLinearGradient(0, 650, 0, 1066);
    lake.addColorStop(0, '#f3b778');
    lake.addColorStop(0.24, '#8f5a67');
    lake.addColorStop(0.58, '#283656');
    lake.addColorStop(1, '#0e1628');
    ctx.fillStyle = lake;
    ctx.fillRect(0, 650, 1600, 416);

    ctx.fillStyle = 'rgba(18, 22, 38, 0.42)';
    ctx.beginPath();
    ctx.moveTo(0, 650);
    ctx.lineTo(240, 860);
    ctx.lineTo(480, 740);
    ctx.lineTo(740, 825);
    ctx.lineTo(950, 710);
    ctx.lineTo(1220, 910);
    ctx.lineTo(1600, 760);
    ctx.lineTo(1600, 650);
    ctx.closePath();
    ctx.fill();

    for (let y = 662; y < 1045; y += 8) {
      const progress = (y - 662) / 383;
      const rw = 40 + progress * 240;
      const offset = Math.sin(y * 0.25) * (10 + progress * 25);
      ctx.fillStyle = `rgba(255, 224, 164, ${(0.52 * (1 - progress * 0.72)).toFixed(2)})`;
      ctx.fillRect(960 - rw / 2 + offset, y, rw, 3);
    }

    ctx.fillStyle = '#0c101a';
    ctx.beginPath();
    ctx.moveTo(0, 1066);
    ctx.lineTo(0, 930);
    ctx.quadraticCurveTo(180, 955, 360, 1020);
    ctx.quadraticCurveTo(500, 1055, 620, 1066);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(1600, 1066);
    ctx.lineTo(1600, 950);
    ctx.quadraticCurveTo(1430, 980, 1280, 1066);
    ctx.closePath();
    ctx.fill();

    return c;
  }

  /**
   * Fast Multi-Scale Content-Aware Inpainting (Magic Eraser / Healing Brush).
   * Seamlessly removes painted objects (necklaces, wires, blemishes, logos) directly on the
   * full-resolution source image by solving harmonic color diffusion coarse-to-fine + matching local grain.
   *
   * @param {HTMLImageElement|HTMLCanvasElement} source - Original/current full-res image
   * @param {Array<{x:number,y:number}>} normPoints - Stroke points in normalized [0..1] source coordinates
   * @param {number} normRadius - Brush radius relative to min(srcW, srcH)
   * @returns {HTMLCanvasElement} New full-res canvas with the painted region cleanly healed
   */
  function inpaintStroke(source, normPoints, normRadius) {
    const srcW = source.naturalWidth || source.width;
    const srcH = source.naturalHeight || source.height;

    const out = document.createElement('canvas');
    out.width = srcW;
    out.height = srcH;
    const octx = out.getContext('2d', { willReadFrequently: true });
    octx.drawImage(source, 0, 0, srcW, srcH);

    if (!normPoints || normPoints.length === 0) return out;

    const radiusPx = Math.max(4, Math.round(normRadius * Math.min(srcW, srcH)));

    // 1. Compute tight local ROI bounding box (+ generous clean ring around stroke)
    let minX = srcW, minY = srcH, maxX = 0, maxY = 0;
    for (let i = 0; i < normPoints.length; i++) {
      const px = normPoints[i].x * srcW;
      const py = normPoints[i].y * srcH;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    const pad = Math.max(24, Math.round(radiusPx * 2.2));
    const rx = Math.max(0, Math.floor(minX - radiusPx - pad));
    const ry = Math.max(0, Math.floor(minY - radiusPx - pad));
    const rw = Math.min(srcW - rx, Math.ceil(maxX + radiusPx + pad) - rx);
    const rh = Math.min(srcH - ry, Math.ceil(maxY + radiusPx + pad) - ry);
    if (rw < 4 || rh < 4) return out;

    // 2. Rasterize painted mask onto ROI canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = rw;
    maskCanvas.height = rh;
    const mctx = maskCanvas.getContext('2d', { willReadFrequently: true });
    mctx.lineCap = 'round';
    mctx.lineJoin = 'round';
    mctx.strokeStyle = '#ffffff';
    mctx.fillStyle = '#ffffff';
    mctx.lineWidth = radiusPx * 2;

    if (normPoints.length === 1) {
      mctx.beginPath();
      mctx.arc(normPoints[0].x * srcW - rx, normPoints[0].y * srcH - ry, radiusPx, 0, Math.PI * 2);
      mctx.fill();
    } else {
      mctx.beginPath();
      mctx.moveTo(normPoints[0].x * srcW - rx, normPoints[0].y * srcH - ry);
      for (let i = 1; i < normPoints.length; i++) {
        mctx.lineTo(normPoints[i].x * srcW - rx, normPoints[i].y * srcH - ry);
      }
      mctx.stroke();
    }

    // Limit working patch resolution to max 720px on longest side for instant <60ms speed,
    // then composite smoothly back at full native resolution
    const workScale = Math.min(1, 720 / Math.max(rw, rh));
    const ww = Math.max(8, Math.round(rw * workScale));
    const wh = Math.max(8, Math.round(rh * workScale));

    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = ww;
    patchCanvas.height = wh;
    const pctx = patchCanvas.getContext('2d', { willReadFrequently: true });
    pctx.drawImage(out, rx, ry, rw, rh, 0, 0, ww, wh);

    const wMaskCanvas = document.createElement('canvas');
    wMaskCanvas.width = ww;
    wMaskCanvas.height = wh;
    const wmctx = wMaskCanvas.getContext('2d', { willReadFrequently: true });
    wmctx.drawImage(maskCanvas, 0, 0, ww, wh);

    const imgData = pctx.getImageData(0, 0, ww, wh);
    const maskData = wmctx.getImageData(0, 0, ww, wh).data;
    const srcPixels = imgData.data;

    const total = ww * wh;
    const mask = new Uint8Array(total);
    const rBuf = new Float32Array(total);
    const gBuf = new Float32Array(total);
    const bBuf = new Float32Array(total);

    let maskedCount = 0;
    for (let i = 0; i < total; i++) {
      const m = maskData[i * 4 + 3] > 28 ? 1 : 0;
      mask[i] = m;
      if (m) maskedCount++;
      rBuf[i] = srcPixels[i * 4];
      gBuf[i] = srcPixels[i * 4 + 1];
      bBuf[i] = srcPixels[i * 4 + 2];
    }
    if (maskedCount === 0 || maskedCount === total) return out;

    // 3. Build Multi-Scale Coarse-to-Fine Pyramid so large/wide holes fill seamlessly in milliseconds
    function solveLevel(w, h, rArr, gArr, bArr, mArr) {
      if (w > 24 && h > 24) {
        const cw = Math.max(4, w >> 1);
        const ch = Math.max(4, h >> 1);
        const cTotal = cw * ch;
        const cR = new Float32Array(cTotal);
        const cG = new Float32Array(cTotal);
        const cB = new Float32Array(cTotal);
        const cM = new Uint8Array(cTotal);

        let anyMasked = false;
        let anyKnown = false;
        for (let cy = 0; cy < ch; cy++) {
          const sy = Math.min(h - 1, cy * 2);
          const sy1 = Math.min(h - 1, sy + 1);
          for (let cx = 0; cx < cw; cx++) {
            const sx = Math.min(w - 1, cx * 2);
            const sx1 = Math.min(w - 1, sx + 1);
            const idxs = [sy * w + sx, sy * w + sx1, sy1 * w + sx, sy1 * w + sx1];
            let sr = 0, sg = 0, sb = 0, cnt = 0;
            for (let k = 0; k < 4; k++) {
              const id = idxs[k];
              if (!mArr[id]) {
                sr += rArr[id];
                sg += gArr[id];
                sb += bArr[id];
                cnt++;
              }
            }
            const ci = cy * cw + cx;
            if (cnt > 0) {
              cR[ci] = sr / cnt;
              cG[ci] = sg / cnt;
              cB[ci] = sb / cnt;
              cM[ci] = 0;
              anyKnown = true;
            } else {
              cM[ci] = 1;
              anyMasked = true;
            }
          }
        }

        if (anyMasked && anyKnown) {
          solveLevel(cw, ch, cR, cG, cB, cM);
        }

        // Bilinearly upsample coarse solution to initialize masked pixels at this level
        for (let y = 0; y < h; y++) {
          const fy = (y + 0.5) * 0.5 - 0.5;
          const y0 = clamp(Math.floor(fy), 0, ch - 1);
          const y1 = Math.min(ch - 1, y0 + 1);
          const wy = clamp(fy - y0, 0, 1);
          for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (!mArr[i]) continue;
            const fx = (x + 0.5) * 0.5 - 0.5;
            const x0 = clamp(Math.floor(fx), 0, cw - 1);
            const x1 = Math.min(cw - 1, x0 + 1);
            const wx = clamp(fx - x0, 0, 1);

            const i00 = y0 * cw + x0;
            const i10 = y0 * cw + x1;
            const i01 = y1 * cw + x0;
            const i11 = y1 * cw + x1;
            const w00 = (1 - wx) * (1 - wy);
            const w10 = wx * (1 - wy);
            const w01 = (1 - wx) * wy;
            const w11 = wx * wy;

            rArr[i] = cR[i00] * w00 + cR[i10] * w10 + cR[i01] * w01 + cR[i11] * w11;
            gArr[i] = cG[i00] * w00 + cG[i10] * w10 + cG[i01] * w01 + cG[i11] * w11;
            bArr[i] = cB[i00] * w00 + cB[i10] * w10 + cB[i01] * w01 + cB[i11] * w11;
          }
        }
      } else {
        // Base level: initialize masked pixels with average of clean boundary pixels
        let sr = 0, sg = 0, sb = 0, cnt = 0;
        for (let i = 0; i < w * h; i++) {
          if (!mArr[i]) { sr += rArr[i]; sg += gArr[i]; sb += bArr[i]; cnt++; }
        }
        const mr = cnt ? sr / cnt : 128;
        const mg = cnt ? sg / cnt : 128;
        const mb = cnt ? sb / cnt : 128;
        for (let i = 0; i < w * h; i++) {
          if (mArr[i]) { rArr[i] = mr; gArr[i] = mg; bArr[i] = mb; }
        }
      }

      // Gauss-Seidel SOR (Successive Over-Relaxation) harmonic smoothing inside mask
      const iters = w <= 64 ? 40 : 22;
      const omega = 1.65;
      for (let it = 0; it < iters; it++) {
        for (let y = 1; y < h - 1; y++) {
          const row = y * w;
          for (let x = 1; x < w - 1; x++) {
            const i = row + x;
            if (!mArr[i]) continue;
            const nr = (rArr[i - 1] + rArr[i + 1] + rArr[i - w] + rArr[i + w]) * 0.25;
            const ng = (gArr[i - 1] + gArr[i + 1] + gArr[i - w] + gArr[i + w]) * 0.25;
            const nb = (bArr[i - 1] + bArr[i + 1] + bArr[i - w] + bArr[i + w]) * 0.25;
            rArr[i] += (nr - rArr[i]) * omega;
            gArr[i] += (ng - gArr[i]) * omega;
            bArr[i] += (nb - bArr[i]) * omega;
          }
        }
        // Handle borders cleanly
        for (let x = 0; x < w; x++) {
          if (mArr[x]) { rArr[x] = rArr[x + w]; gArr[x] = gArr[x + w]; bArr[x] = bArr[x + w]; }
          const bIdx = (h - 1) * w + x;
          if (mArr[bIdx]) { rArr[bIdx] = rArr[bIdx - w]; gArr[bIdx] = gArr[bIdx - w]; bArr[bIdx] = bArr[bIdx - w]; }
        }
        for (let y = 0; y < h; y++) {
          const lIdx = y * w;
          if (mArr[lIdx]) { rArr[lIdx] = rArr[lIdx + 1]; gArr[lIdx] = gArr[lIdx + 1]; bArr[lIdx] = bArr[lIdx + 1]; }
          const rIdx = y * w + (w - 1);
          if (mArr[rIdx]) { rArr[rIdx] = rArr[rIdx - 1]; gArr[rIdx] = gArr[rIdx - 1]; bArr[rIdx] = bArr[rIdx - 1]; }
        }
      }
    }

    solveLevel(ww, wh, rBuf, gBuf, bBuf, mask);

    // 4. Measure natural local sensor grain from clean ring surrounding the mask so skin texture matches seamlessly
    let diffSum = 0;
    let diffCnt = 0;
    for (let y = 2; y < wh - 2; y += 2) {
      for (let x = 2; x < ww - 2; x += 2) {
        const i = y * ww + x;
        if (!mask[i] && !mask[i + 1]) {
          const d = Math.abs(rBuf[i] - rBuf[i + 1]) + Math.abs(gBuf[i] - gBuf[i + 1]) + Math.abs(bBuf[i] - bBuf[i + 1]);
          diffSum += d / 3;
          diffCnt++;
        }
      }
    }
    const localGrain = clamp(diffCnt ? (diffSum / diffCnt) * 0.85 : 2.5, 1.0, 9.5);

    // Write healed pixels with subtle matched micro-grain
    for (let y = 0; y < wh; y++) {
      for (let x = 0; x < ww; x++) {
        const i = y * ww + x;
        if (!mask[i]) continue;
        let n = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
        n = (n ^ (n >> 13)) * 1274126177;
        n = n ^ (n >> 16);
        const noise = (((n & 0xff) / 255) - 0.5) * 2 * localGrain;
        srcPixels[i * 4]     = clamp255(rBuf[i] + noise);
        srcPixels[i * 4 + 1] = clamp255(gBuf[i] + noise);
        srcPixels[i * 4 + 2] = clamp255(bBuf[i] + noise);
      }
    }
    pctx.putImageData(imgData, 0, 0);

    // 5. Soft feathered composite back onto full-res output canvas
    const comp = document.createElement('canvas');
    comp.width = rw;
    comp.height = rh;
    const cctx = comp.getContext('2d');
    cctx.imageSmoothingEnabled = true;
    cctx.imageSmoothingQuality = 'high';
    cctx.drawImage(patchCanvas, 0, 0, rw, rh);

    // Soft feather mask edge so transition is completely invisible
    const featherMask = document.createElement('canvas');
    featherMask.width = rw;
    featherMask.height = rh;
    const fctx = featherMask.getContext('2d');
    fctx.filter = `blur(${Math.max(1.5, Math.min(6, radiusPx * 0.16)).toFixed(1)}px)`;
    fctx.drawImage(maskCanvas, 0, 0);

    cctx.globalCompositeOperation = 'destination-in';
    cctx.drawImage(featherMask, 0, 0);
    cctx.globalCompositeOperation = 'source-over';

    octx.drawImage(comp, rx, ry);
    return out;
  }

  global.LuminaProcessor = {
    DEFAULT_ADJUSTMENTS,
    SLIDER_GROUPS,
    HSL_CHANNELS,
    PRESETS,
    createDefaultHSL,
    getEffectiveParams,
    renderPipeline,
    analyzeAutoEnhance,
    inpaintStroke,
    drawHistogram,
    generateSampleImage,
  };
})(window);
