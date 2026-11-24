(function (global) {
  'use strict';

  const DEFAULT_ADJUSTMENTS = {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    whites: 0,
    blacks: 0,
    temperature: 0,
    tint: 0,
    vibrance: 0,
    saturation: 0,
    sharpen: 0,
    blur: 0,
    vignette: 0,
    grain: 0,
    fade: 0,
    sepia: 0,
  };

  const SLIDER_GROUPS = {
    light: [
      { key: 'exposure', label: 'Phơi sáng', min: -100, max: 100, step: 1 },
      { key: 'contrast', label: 'Tương phản', min: -100, max: 100, step: 1 },
      { key: 'highlights', label: 'Vùng sáng (Highlights)', min: -100, max: 100, step: 1 },
      { key: 'shadows', label: 'Vùng tối (Shadows)', min: -100, max: 100, step: 1 },
      { key: 'whites', label: 'Điểm trắng', min: -100, max: 100, step: 1 },
      { key: 'blacks', label: 'Điểm đen', min: -100, max: 100, step: 1 },
    ],
    color: [
      { key: 'temperature', label: 'Nhiệt độ màu', min: -100, max: 100, step: 1 },
      { key: 'tint', label: 'Sắc thái (Tint)', min: -100, max: 100, step: 1 },
      { key: 'vibrance', label: 'Độ rực rỡ (Vibrance)', min: -100, max: 100, step: 1 },
      { key: 'saturation', label: 'Độ bão hòa', min: -100, max: 100, step: 1 },
    ],
    detail: [
      { key: 'sharpen', label: 'Độ sắc nét', min: 0, max: 100, step: 1 },
      { key: 'blur', label: 'Làm mờ', min: 0, max: 20, step: 0.5 },
      { key: 'vignette', label: 'Làm tối góc', min: -100, max: 100, step: 1 },
      { key: 'grain', label: 'Hạt phim (Grain)', min: 0, max: 100, step: 1 },
      { key: 'fade', label: 'Phim mờ (Fade)', min: 0, max: 100, step: 1 },
      { key: 'sepia', label: 'Nâu cổ điển (Sepia)', min: 0, max: 100, step: 1 },
    ],
  };

  const PRESETS = [
    {
      id: 'original',
      name: 'Nguyên bản',
      desc: 'Không bộ lọc',
      values: {},
    },
    {
      id: 'leica_classic',
      name: 'Leica Classic',
      desc: 'Tương phản sâu, ấm nhẹ',
      values: {
        contrast: 22,
        highlights: -14,
        shadows: -12,
        blacks: -10,
        temperature: 8,
        vibrance: 14,
        saturation: -6,
        sharpen: 18,
        vignette: 24,
        grain: 10,
      },
      splitTone: { shadow: [-4, 0, 8], highlight: [10, 5, -4] },
    },
    {
      id: 'leica_mono',
      name: 'Leica Monochrom',
      desc: 'Đen trắng giàu chi tiết',
      values: {
        contrast: 32,
        highlights: -10,
        shadows: 8,
        whites: 14,
        blacks: -16,
        saturation: -100,
        sharpen: 24,
        vignette: 28,
        grain: 20,
      },
    },
    {
      id: 'portra_400',
      name: 'Kodak Portra',
      desc: 'Tông da dịu, mềm mại',
      values: {
        exposure: 6,
        contrast: -8,
        highlights: -16,
        shadows: 24,
        temperature: 14,
        tint: 6,
        vibrance: 12,
        saturation: -6,
        fade: 16,
        grain: 16,
      },
      splitTone: { shadow: [4, 6, 4], highlight: [12, 8, -2] },
    },
    {
      id: 'velvia_50',
      name: 'Fuji Velvia',
      desc: 'Rực rỡ cho phong cảnh',
      values: {
        contrast: 26,
        highlights: -8,
        shadows: -8,
        vibrance: 34,
        saturation: 20,
        tint: 6,
        sharpen: 22,
        vignette: 14,
      },
      splitTone: { shadow: [-4, 2, 10], highlight: [8, 4, -4] },
    },
    {
      id: 'teal_orange',
      name: 'Cine Teal & Orange',
      desc: 'Màu điện ảnh Hollywood',
      values: {
        contrast: 20,
        highlights: -12,
        shadows: 10,
        blacks: -8,
        vibrance: 18,
        saturation: 4,
        vignette: 22,
        grain: 12,
      },
      splitTone: { shadow: [-20, 10, 22], highlight: [24, 10, -16] },
    },
    {
      id: 'golden_hour',
      name: 'Giờ Vàng',
      desc: 'Ánh nắng chiều ấm áp',
      values: {
        exposure: 8,
        contrast: 8,
        highlights: -10,
        shadows: 20,
        temperature: 34,
        tint: 6,
        vibrance: 18,
        fade: 10,
        vignette: 16,
      },
      splitTone: { shadow: [10, 2, -6], highlight: [22, 14, -10] },
    },
    {
      id: 'noir_hc',
      name: 'Noir Tương Phản',
      desc: 'Đen trắng kịch tính',
      values: {
        exposure: -4,
        contrast: 56,
        highlights: 12,
        shadows: -28,
        whites: 20,
        blacks: -26,
        saturation: -100,
        sharpen: 28,
        vignette: 45,
        grain: 26,
      },
    },
    {
      id: 'matte_film',
      name: 'Phim Mờ Vintage',
      desc: 'Hoài niệm, đen nâng nhẹ',
      values: {
        contrast: -12,
        highlights: -18,
        shadows: 18,
        temperature: 12,
        saturation: -18,
        fade: 34,
        sepia: 18,
        grain: 22,
        vignette: 18,
      },
    },
    {
      id: 'tokyo_night',
      name: 'Đêm Tokyo',
      desc: 'Lạnh hiện đại, neon nổi',
      values: {
        contrast: 24,
        highlights: 10,
        shadows: -6,
        temperature: -22,
        tint: 14,
        vibrance: 28,
        sharpen: 16,
        vignette: 26,
      },
      splitTone: { shadow: [-14, 4, 24], highlight: [14, -4, 16] },
    },
  ];

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

  /**
   * Computes effective combined adjustments = user manual adjustments + scaled preset deltas.
   */
  function getEffectiveParams(state) {
    const preset = PRESETS.find((p) => p.id === state.presetId) || PRESETS[0];
    const strength = clamp((state.presetStrength ?? 100) / 100, 0, 1);
    const out = {};

    for (const key in DEFAULT_ADJUSTMENTS) {
      const base = state.adjustments[key] || 0;
      const pVal = (preset.values && preset.values[key]) ? preset.values[key] * strength : 0;
      out[key] = base + pVal;
    }

    // Clamp combined values into sensible ranges
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
    out.sharpen = clamp(out.sharpen, 0, 120);
    out.blur = clamp(out.blur, 0, 24);
    out.vignette = clamp(out.vignette, -100, 100);
    out.grain = clamp(out.grain, 0, 100);
    out.fade = clamp(out.fade, 0, 100);
    out.sepia = clamp(out.sepia, 0, 100);

    out.splitTone = preset.splitTone && strength > 0
      ? {
          shadow: preset.splitTone.shadow.map((v) => v * strength),
          highlight: preset.splitTone.highlight.map((v) => v * strength),
        }
      : null;

    return out;
  }

  /**
   * Renders geometric transforms (rotate 90s, flip, straighten, crop) onto a canvas.
   */
  function renderGeometry(source, transform, maxDim) {
    const srcW = source.naturalWidth || source.width;
    const srcH = source.naturalHeight || source.height;

    const rot90 = ((transform.rotate || 0) % 360 + 360) % 360;
    const swapped = rot90 === 90 || rot90 === 270;
    const baseW = swapped ? srcH : srcW;
    const baseH = swapped ? srcW : srcH;

    // First compute cropped output dimensions in full-res space
    const crop = transform.crop || { x: 0, y: 0, w: 1, h: 1 };
    const cropX = clamp(crop.x, 0, 0.99);
    const cropY = clamp(crop.y, 0, 0.99);
    const cropW = clamp(crop.w, 0.01, 1 - cropX);
    const cropH = clamp(crop.h, 0.01, 1 - cropY);

    let fullW = Math.max(1, Math.round(baseW * cropW));
    let fullH = Math.max(1, Math.round(baseH * cropH));

    let scale = 1;
    if (maxDim && Math.max(fullW, fullH) > maxDim) {
      scale = maxDim / Math.max(fullW, fullH);
    }

    const outW = Math.max(1, Math.round(fullW * scale));
    const outH = Math.max(1, Math.round(fullH * scale));

    // Render full transformed (pre-crop) at the same scale into temp canvas
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

    // Auto-scale for straighten angle so corners stay filled
    const angleDeg = transform.straighten || 0;
    const angleRad = (angleDeg * Math.PI) / 180;
    let straightenZoom = 1;
    if (Math.abs(angleDeg) > 0.01) {
      const absSin = Math.abs(Math.sin(angleRad));
      const absCos = Math.abs(Math.cos(angleRad));
      const aspect = transW / transH;
      const scaleW = absCos + absSin / aspect;
      const scaleH = absCos + absSin * aspect;
      straightenZoom = Math.max(scaleW, scaleH);
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

    // If no crop, return temp directly
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
   * Applies color, tone, vignette, grain, and sharpen to an ImageData in-place.
   */
  function processPixels(imageData, params) {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;

    const expMult = Math.pow(2, params.exposure / 55);
    const contrastVal = params.contrast / 100;
    // Smooth contrast factor
    const contrastFactor = contrastVal >= 0
      ? 1 + contrastVal * 1.15
      : 1 / (1 - contrastVal * 1.15);

    const hi = params.highlights / 100;
    const sh = params.shadows / 100;
    const wh = params.whites / 100;
    const bl = params.blacks / 100;

    // White balance multipliers
    const temp = params.temperature / 100;
    const tint = params.tint / 100;
    const rWB = 1 + temp * 0.24 + tint * 0.08;
    const gWB = 1 - tint * 0.14;
    const bWB = 1 - temp * 0.24 + tint * 0.08;

    const vib = params.vibrance / 100;
    const sat = 1 + params.saturation / 100;
    const fadeAmt = (params.fade / 100) * 0.26;
    const sepiaAmt = params.sepia / 100;
    const vigAmt = params.vignette / 100;
    const grainAmt = (params.grain / 100) * 42;
    const split = params.splitTone;

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
        let r = data[idx] * inv255;
        let g = data[idx + 1] * inv255;
        let b = data[idx + 2] * inv255;

        // 1. Exposure + White Balance
        r *= expMult * rWB;
        g *= expMult * gWB;
        b *= expMult * bWB;

        // 2. Luminance for tonal masks
        const lum = clamp(0.2126 * r + 0.7152 * g + 0.0722 * b, 0, 1.5);

        // 3. Shadows & Highlights recovery
        if (sh !== 0) {
          const shadowMask = 1 - smoothstep(0.05, 0.65, lum);
          const shDelta = sh * 0.42 * shadowMask;
          r += shDelta * (0.25 + r * 0.75);
          g += shDelta * (0.25 + g * 0.75);
          b += shDelta * (0.25 + b * 0.75);
        }

        if (hi !== 0) {
          const hiMask = smoothstep(0.38, 1.0, lum);
          const hiDelta = hi * 0.42 * hiMask;
          r += hiDelta * (0.35 + (1 - clamp(r, 0, 1)) * 0.65);
          g += hiDelta * (0.35 + (1 - clamp(g, 0, 1)) * 0.65);
          b += hiDelta * (0.35 + (1 - clamp(b, 0, 1)) * 0.65);
        }

        // 4. Blacks & Whites endpoint adjustment
        if (bl !== 0) {
          const blackMask = 1 - smoothstep(0.0, 0.35, lum);
          const bShift = bl * 0.22 * blackMask;
          r += bShift;
          g += bShift;
          b += bShift;
        }
        if (wh !== 0) {
          const whiteMask = smoothstep(0.65, 1.0, lum);
          const wShift = wh * 0.22 * whiteMask;
          r += wShift;
          g += wShift;
          b += wShift;
        }

        // 5. Contrast around mid-gray (0.5)
        if (contrastVal !== 0) {
          r = (r - 0.5) * contrastFactor + 0.5;
          g = (g - 0.5) * contrastFactor + 0.5;
          b = (b - 0.5) * contrastFactor + 0.5;
        }

        // 6. Matte Fade (lift black floor softly)
        if (fadeAmt > 0) {
          r = fadeAmt + r * (1 - fadeAmt * 0.85);
          g = fadeAmt + g * (1 - fadeAmt * 0.85);
          b = fadeAmt + b * (1 - fadeAmt * 0.85);
        }

        // 7. Split Toning (from cinema/film presets)
        if (hasSplit) {
          const lNow = clamp(0.2126 * r + 0.7152 * g + 0.0722 * b, 0, 1);
          const sMask = (1 - smoothstep(0.1, 0.6, lNow)) * inv255;
          const hMask = smoothstep(0.4, 0.95, lNow) * inv255;
          r += split.shadow[0] * sMask + split.highlight[0] * hMask;
          g += split.shadow[1] * sMask + split.highlight[1] * hMask;
          b += split.shadow[2] * sMask + split.highlight[2] * hMask;
        }

        // 8. Vibrance & Saturation
        if (vib !== 0 || sat !== 1) {
          const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          let satMult = sat;
          if (vib !== 0) {
            const mx = Math.max(r, g, b);
            const mn = Math.min(r, g, b);
            const currentSat = mx > 0.0001 ? (mx - mn) / mx : 0;
            // Boost less-saturated pixels more; gently protect high-saturation skin tones
            const vibScale = 1 + vib * (1 - currentSat) * 0.85;
            satMult *= vibScale;
          }
          r = gray + (r - gray) * satMult;
          g = gray + (g - gray) * satMult;
          b = gray + (b - gray) * satMult;
        }

        // 9. Sepia
        if (hasSepia) {
          const sr = r * 0.393 + g * 0.769 + b * 0.189;
          const sg = r * 0.349 + g * 0.686 + b * 0.168;
          const sb = r * 0.272 + g * 0.534 + b * 0.131;
          r = r + (sr - r) * sepiaAmt;
          g = g + (sg - g) * sepiaAmt;
          b = b + (sb - b) * sepiaAmt;
        }

        // 10. Vignette
        if (hasVig) {
          const dx = x - cx;
          const dist = Math.sqrt(dx * dx + dy2) * invMaxDist;
          const vMask = smoothstep(0.32, 1.05, dist);
          if (vigAmt > 0) {
            const darken = 1 - vMask * vigAmt * 0.82;
            r *= darken;
            g *= darken;
            b *= darken;
          } else {
            const lighten = vMask * (-vigAmt) * 0.65;
            r += (1 - r) * lighten;
            g += (1 - g) * lighten;
            b += (1 - b) * lighten;
          }
        }

        // Convert to 0..255
        let R = r * 255;
        let G = g * 255;
        let B = b * 255;

        // 11. Organic Film Grain (fast deterministic hash)
        if (hasGrain) {
          let n = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
          n = (n ^ (n >> 13)) * 1274126177;
          n = n ^ (n >> 16);
          const noise = ((n & 0xff) * inv255 - 0.5) * 2;
          // Slightly stronger in midtones
          const midWeight = 0.55 + 0.45 * (1 - Math.abs(clamp((R + G + B) / 765, 0, 1) - 0.5) * 2);
          const gDelta = noise * grainAmt * midWeight;
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

    // 12. Sharpen (3x3 Unsharp Mask)
    if (params.sharpen > 0.5 && w > 2 && h > 2) {
      applySharpen(imageData, (params.sharpen / 100) * 1.15);
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
          dst[i + c] = clamp255(center + (center - avg) * amount);
        }
        i += 4;
      }
    }
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
      bg = '#111216';
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

    // Draw caption text if present or film style
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
   * Full pipeline: geometry -> blur -> pixel grading -> frame.
   * Returns { processedCanvas, originalCanvas, imageData, fullWidth, fullHeight }
   */
  function renderPipeline(source, state, options) {
    const opts = options || {};
    const maxDim = opts.maxDim || null;
    const includeFrame = opts.includeFrame !== false;

    const geom = renderGeometry(source, state.transform, maxDim);
    const baseCanvas = geom.canvas;

    // Copy original (transformed, ungraded) if needed for Before/After
    let originalCanvas = null;
    if (opts.needOriginal) {
      originalCanvas = document.createElement('canvas');
      originalCanvas.width = baseCanvas.width;
      originalCanvas.height = baseCanvas.height;
      originalCanvas.getContext('2d').drawImage(baseCanvas, 0, 0);
    }

    const params = getEffectiveParams(state);

    // Working copy for processing
    const work = document.createElement('canvas');
    work.width = baseCanvas.width;
    work.height = baseCanvas.height;
    const wctx = work.getContext('2d', { willReadFrequently: true });

    if (params.blur > 0.1) {
      // Scale blur proportionally to resolution so preview & full export match
      const scaleFactor = baseCanvas.width / 1000;
      const pxBlur = Math.max(0.5, params.blur * scaleFactor);
      wctx.filter = `blur(${pxBlur.toFixed(2)}px)`;
    }
    wctx.drawImage(baseCanvas, 0, 0);
    wctx.filter = 'none';

    const imgData = wctx.getImageData(0, 0, work.width, work.height);
    processPixels(imgData, params);
    wctx.putImageData(imgData, 0, 0);

    const finalCanvas = includeFrame ? applyFrame(work, state.frame) : work;
    const finalOriginal = (includeFrame && originalCanvas) ? applyFrame(originalCanvas, state.frame) : originalCanvas;

    return {
      processedCanvas: finalCanvas,
      originalCanvas: finalOriginal,
      imageData: imgData,
      fullWidth: geom.fullWidth,
      fullHeight: geom.fullHeight,
    };
  }

  /**
   * Draws an RGB + Luminance histogram onto the provided canvas.
   */
  function drawHistogram(imageData, canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle vertical guides
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const gx = Math.round((w * i) / 4) + 0.5;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }

    if (!imageData) return { meanLum: 0 };

    const rHist = new Uint32Array(256);
    const gHist = new Uint32Array(256);
    const bHist = new Uint32Array(256);
    const lHist = new Uint32Array(256);

    const data = imageData.data;
    const totalPixels = imageData.width * imageData.height;
    // Sample stride for very large images
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

    // Find 99th-percentile-ish peak to avoid single-bin spikes crushing the graph
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
    drawChannel(rHist, 'rgba(239, 68, 68, 0.38)', 'rgba(239, 68, 68, 0.72)');
    drawChannel(gHist, 'rgba(34, 197, 94, 0.35)', 'rgba(34, 197, 94, 0.68)');
    drawChannel(bHist, 'rgba(59, 130, 246, 0.38)', 'rgba(59, 130, 246, 0.75)');
    ctx.globalCompositeOperation = 'source-over';
    drawChannel(lHist, 'rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0.42)');

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
      // Moody Neon Night Street
      const bg = ctx.createLinearGradient(0, 0, 0, 1066);
      bg.addColorStop(0, '#070b1a');
      bg.addColorStop(0.48, '#141a35');
      bg.addColorStop(0.65, '#1d142c');
      bg.addColorStop(1, '#090b12');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1600, 1066);

      // Ambient neon haze
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

      // Perspective building silhouettes
      ctx.fillStyle = '#0c101d';
      ctx.fillRect(0, 90, 410, 590);
      ctx.fillRect(1190, 70, 410, 610);
      ctx.fillStyle = '#12182a';
      ctx.fillRect(360, 180, 210, 500);
      ctx.fillRect(1030, 160, 210, 520);

      // Lit building windows
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

      // Vertical Neon Signs
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

      // Horizon street glow
      const centerGlow = ctx.createRadialGradient(800, 650, 10, 800, 650, 320);
      centerGlow.addColorStop(0, 'rgba(255, 178, 86, 0.9)');
      centerGlow.addColorStop(0.35, 'rgba(255, 75, 115, 0.45)');
      centerGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(450, 350, 700, 420);

      // Wet street reflections
      const roadGrad = ctx.createLinearGradient(0, 660, 0, 1066);
      roadGrad.addColorStop(0, '#171929');
      roadGrad.addColorStop(1, '#08090e');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, 660, 1600, 406);

      // Vertical smeared light reflections on wet asphalt
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

      // Bokeh circles
      const bokeh = [
        [220, 470, 38, 'rgba(0,229,255,0.28)'],
        [630, 520, 24, 'rgba(255,196,92,0.45)'],
        [800, 615, 18, 'rgba(255,255,255,0.85)'],
        [940, 505, 30, 'rgba(255,68,125,0.38)'],
        [1360, 460, 44, 'rgba(255,140,66,0.28)'],
        [725, 575, 14, 'rgba(255,95,86,0.65)'],
        [875, 575, 14, 'rgba(110,231,255,0.65)'],
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
      // Studio Editorial Still-Life / Lighting Study
      const bg = ctx.createRadialGradient(640, 420, 60, 800, 533, 980);
      bg.addColorStop(0, '#3a2d28');
      bg.addColorStop(0.5, '#1d1b24');
      bg.addColorStop(1, '#0c0d13');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1600, 1066);

      // Soft warm key light beam
      const keyLight = ctx.createRadialGradient(460, 300, 30, 520, 380, 620);
      keyLight.addColorStop(0, 'rgba(255, 206, 152, 0.42)');
      keyLight.addColorStop(0.55, 'rgba(232, 134, 86, 0.14)');
      keyLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = keyLight;
      ctx.fillRect(0, 0, 1600, 1066);

      // Cool studio rim light on right
      const rimLight = ctx.createRadialGradient(1260, 450, 20, 1220, 480, 520);
      rimLight.addColorStop(0, 'rgba(92, 178, 255, 0.36)');
      rimLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rimLight;
      ctx.fillRect(0, 0, 1600, 1066);

      // Architectural studio pedestal table
      const tableGrad = ctx.createLinearGradient(0, 740, 0, 1066);
      tableGrad.addColorStop(0, '#2a2425');
      tableGrad.addColorStop(1, '#121116');
      ctx.fillStyle = tableGrad;
      ctx.fillRect(0, 740, 1600, 326);

      // Archway backdrop
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 224, 194, 0.16)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(800, 540, 360, Math.PI, 0);
      ctx.lineTo(1160, 740);
      ctx.moveTo(440, 540);
      ctx.lineTo(440, 740);
      ctx.stroke();
      ctx.restore();

      // Cast shadows on table
      ctx.fillStyle = 'rgba(5, 5, 10, 0.55)';
      ctx.beginPath();
      ctx.ellipse(835, 782, 230, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(545, 792, 110, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(1125, 788, 120, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Central Sculptural Bust / Ceramic Sphere with rich skin/terracotta tone gradient
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

      // Left Olive-Gold Glass Vessel
      const leftSphere = ctx.createRadialGradient(485, 635, 14, 520, 680, 118);
      leftSphere.addColorStop(0, '#f6f0c9');
      leftSphere.addColorStop(0.35, '#bfa55a');
      leftSphere.addColorStop(0.75, '#4d4829');
      leftSphere.addColorStop(1, '#1a1b16');
      ctx.fillStyle = leftSphere;
      ctx.beginPath();
      ctx.arc(520, 680, 112, 0, Math.PI * 2);
      ctx.fill();

      // Right Cobalt Ceramic Cylinder
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

      // Botanical gold accent ring
      ctx.strokeStyle = 'rgba(248, 214, 152, 0.72)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(795, 525, 290, -0.5, 1.4);
      ctx.stroke();

      return c;
    }

    // Default: 'mountain' — Golden Alpine Sunset & Reflective Lake
    const sky = ctx.createLinearGradient(0, 0, 0, 640);
    sky.addColorStop(0, '#13203d');
    sky.addColorStop(0.32, '#2d466e');
    sky.addColorStop(0.62, '#b86259');
    sky.addColorStop(0.84, '#f09e58');
    sky.addColorStop(1, '#fde1a2');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1600, 660);

    // Glowing setting sun
    const sunGlow = ctx.createRadialGradient(960, 470, 16, 960, 470, 420);
    sunGlow.addColorStop(0, 'rgba(255, 250, 224, 1)');
    sunGlow.addColorStop(0.18, 'rgba(255, 214, 130, 0.85)');
    sunGlow.addColorStop(0.5, 'rgba(244, 128, 82, 0.32)');
    sunGlow.addColorStop(1, 'rgba(244, 128, 82, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(400, 40, 1100, 660);

    // Subtle wispy clouds
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

    // Distant hazy range
    drawMountainRange(
      [[0, 520], [180, 410], [380, 470], [610, 320], [820, 455], [1080, 360], [1310, 430], [1600, 340]],
      '#68526e',
      '#a87473',
      650
    );

    // Mid alpine peaks with sunlit faces
    drawMountainRange(
      [[0, 580], [240, 385], [460, 515], [710, 390], [920, 540], [1220, 345], [1450, 470], [1600, 420]],
      '#393352',
      '#584863',
      660
    );

    // Sunlit warm ridge accents
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

    // Foreground pine-ridge silhouettes
    drawMountainRange(
      [[0, 620], [140, 535], [370, 610], [620, 645], [1050, 640], [1360, 555], [1600, 590]],
      '#181c2b',
      '#10131e',
      665
    );

    // Reflective alpine lake
    const lake = ctx.createLinearGradient(0, 650, 0, 1066);
    lake.addColorStop(0, '#f3b778');
    lake.addColorStop(0.24, '#8f5a67');
    lake.addColorStop(0.58, '#283656');
    lake.addColorStop(1, '#0e1628');
    ctx.fillStyle = lake;
    ctx.fillRect(0, 650, 1600, 416);

    // Reflected mountain shadows in lake
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

    // Shimmering sun reflection ripples
    for (let y = 662; y < 1045; y += 8) {
      const progress = (y - 662) / 383;
      const rw = 40 + progress * 240;
      const offset = Math.sin(y * 0.25) * (10 + progress * 25);
      ctx.fillStyle = `rgba(255, 224, 164, ${(0.52 * (1 - progress * 0.72)).toFixed(2)})`;
      ctx.fillRect(960 - rw / 2 + offset, y, rw, 3);
    }

    // Subtle shoreline foreground rocks
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

  global.LuminaProcessor = {
    DEFAULT_ADJUSTMENTS,
    SLIDER_GROUPS,
    PRESETS,
    getEffectiveParams,
    renderPipeline,
    drawHistogram,
    generateSampleImage,
  };
})(window);
