(function (global) {
  'use strict';

  const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1/interactions';
  const MODEL_COLOR_AI = 'gemini-4-hydrogen';
  const MODEL_IMAGE_AI = 'gemini-nano-banana-2.1';
  const STORAGE_KEY = 'lumina-gemini-api-key';

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  /**
   * Normalizes Vietnamese text (removes accents, lowercases) for robust matching.
   */
  function normalizeVi(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function hasAny(text, keywords) {
    return keywords.some((kw) => text.includes(kw));
  }

  function getApiKey() {
    try {
      return (localStorage.getItem(STORAGE_KEY) || '').trim();
    } catch (_) {
      return '';
    }
  }

  function setApiKey(key) {
    try {
      const cleaned = (key || '').trim();
      if (cleaned) localStorage.setItem(STORAGE_KEY, cleaned);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  /**
   * Detects whether a prompt asks for generative pixel edits (remove objects, swap background, add elements)
   * versus color/light/crop/frame adjustments.
   */
  function looksLikeGenerativeEdit(prompt) {
    const t = normalizeVi(prompt);
    return hasAny(t, [
      'xoa nguoi', 'xoa vat', 'xoa nen', 'tach nen', 'doi nen', 'thay nen', 'xoa rac', 'xoa chi tiet',
      'them may', 'them nang', 'them tuyet', 'them mua', 'them hoa', 'them nguoi', 'doi ao', 'doi vay',
      'doi trang phuc', 'doi toc', 'trang diem', 'cuoi len', 'bien thanh', 'tranh ve', 'anime', 'hoat hinh',
      'son dau', 'cyberpunk', 'remove', 'replace background', 'change background', 'add ', 'outfit', 'inpaint',
    ]);
  }

  /**
   * Built-in Instant AI Photo Assistant (Zero API Key required!).
   * Understands natural Vietnamese & English editing instructions + combines real photo histogram analysis.
   */
  function runLocalSmartAI(prompt, currentState, sourceImage, Processor) {
    const raw = (prompt || '').trim();
    const t = normalizeVi(raw);
    const next = JSON.parse(JSON.stringify(currentState));
    const actions = [];

    if (!t) {
      return { state: next, message: 'Hãy nhập yêu cầu chỉnh ảnh của bạn nhé!', changed: false };
    }

    // Intensity modifier ("mạnh / nhiều / đậm" vs "nhẹ / chút / ít")
    let mult = 1.0;
    if (hasAny(t, ['nhe', 'chut', 'it thoi', 'vua phai', 'subtle', 'slight', 'a bit'])) mult = 0.6;
    if (hasAny(t, ['manh', 'nhieu', 'dam', 'cuc ', 'rat ', 'strong', 'heavy', 'more'])) mult = 1.45;

    const bumpAdj = (key, delta, min = -100, max = 100) => {
      next.adjustments[key] = Math.round(clamp((next.adjustments[key] || 0) + delta * mult, min, max));
    };

    const setAdjIfHigher = (key, target, min = -100, max = 100) => {
      const scaled = Math.round(clamp(target * mult, min, max));
      next.adjustments[key] = scaled;
    };

    const bumpHsl = (ch, prop, delta) => {
      if (!next.hsl) next.hsl = Processor.createDefaultHSL();
      next.hsl[ch][prop] = Math.round(clamp((next.hsl[ch][prop] || 0) + delta * mult, -100, 100));
    };

    // --- 0. Reset / Original ---
    if (hasAny(t, ['dat lai', 'khoi phuc', 've goc', 'nhu cu', 'reset', 'nguyen ban', 'xoa het chinh'])) {
      next.presetId = 'original';
      next.presetStrength = 100;
      next.adjustments = Object.assign({}, Processor.DEFAULT_ADJUSTMENTS);
      next.hsl = Processor.createDefaultHSL();
      next.transform = { rotate: 0, flipH: false, flipV: false, straighten: 0, crop: { x: 0, y: 0, w: 1, h: 1 } };
      next.frame = { style: 'none', size: 6, title: '', subtitle: '' };
      return {
        state: next,
        message: 'Đã đặt lại toàn bộ ảnh về trạng thái nguyên bản.',
        changed: true,
        resetSource: true,
      };
    }

    // --- 1. Auto Enhance / Smart Beautiful ---
    if (hasAny(t, ['tu dong', 'dep tu nhien', 'can bang', 'chinh dep', 'toi uu', 'auto', 'enhance', 'sua dep'])) {
      const auto = Processor.analyzeAutoEnhance(sourceImage);
      Object.assign(next.adjustments, auto);
      actions.push('tự động cân bằng sáng, tương phản & màu chuẩn');
    }

    // --- 2. Style / Preset Matching ---
    const presetRules = [
      { id: 'leica_chrome',       label: 'Leica Chrome',       keys: ['leica chrome', 'kodachrome', 'leica vip'] },
      { id: 'leica_contemporary', label: 'Leica Contemporary', keys: ['leica contemporary', 'hien dai', 'toi gian'] },
      { id: 'leica_mono',         label: 'Leica Monochrom',    keys: ['den trang', 'black and white', 'b&w', 'monochrom', 'trang den'] },
      { id: 'noir_cinema',        label: 'Noir Điện Ảnh',      keys: ['noir', 'den trang kich tinh', 'den trang tuong phan'] },
      { id: 'leica_classic',      label: 'Leica Classic',      keys: ['leica', 'mau leica'] },
      { id: 'fuji_classic_chrome',label: 'Fuji Classic Chrome',keys: ['fuji chrome', 'classic chrome', 'phong su', 'duong pho'] },
      { id: 'fuji_classic_neg',   label: 'Fuji Classic Neg',   keys: ['fuji neg', 'classic neg', 'fuji'] },
      { id: 'korean_airy',        label: 'Hàn Quốc Trong Trẻo',keys: ['han quoc', 'korean', 'pastel', 'trong treo nhe'] },
      { id: 'japan_fresh',        label: 'Nhật Bản Thanh Lịch',keys: ['nhat ban', 'japan', 'xanh ngoc', 'thanh lich'] },
      { id: 'portra_400',         label: 'Kodak Portra 400',   keys: ['portra', 'chan dung film', 'film chan dung'] },
      { id: 'kodak_gold',         label: 'Kodak Gold 200',     keys: ['kodak gold', 'nang vang', 'gio vang', 'hoang hon', 'golden'] },
      { id: 'teal_orange',        label: 'Cine Teal & Orange', keys: ['dien anh', 'cinematic', 'teal', 'hollywood', 'phim chieu rap'] },
      { id: 'saigon_vintage',     label: 'Sài Gòn Vintage',    keys: ['sai gon', 'vintage', 'hoai niem', 'retro', 'co dien', 'mau film', 'mau phim'] },
      { id: 'tokyo_night',        label: 'Đêm Tokyo Neon',     keys: ['tokyo', 'neon', 'anh dem', 'pho dem', 'night'] },
    ];

    for (const rule of presetRules) {
      if (hasAny(t, rule.keys)) {
        next.presetId = rule.id;
        next.presetStrength = Math.round(clamp(100 * (mult < 1 ? 0.72 : 1), 40, 100));
        actions.push(`áp dụng màu ${rule.label}`);
        break;
      }
    }

    // --- 3. Backlit / Dark Rescue ("cứu ảnh tối / ngược sáng") ---
    if (hasAny(t, ['nguoc sang', 'cuu anh toi', 'cuu toi', 'bi toi', 'toi qua', 'mo qua', 'underexposed'])) {
      const auto = Processor.analyzeAutoEnhance(sourceImage);
      next.adjustments.exposure = Math.round(clamp(Math.max(auto.exposure, 18) * mult, -100, 100));
      next.adjustments.shadows = Math.round(clamp(44 * mult, 0, 100));
      next.adjustments.highlights = Math.round(clamp(-24 * mult, -100, 0));
      next.adjustments.clarity = Math.round(clamp(14 * mult, 0, 100));
      next.adjustments.sharpen = Math.round(clamp(16 * mult, 0, 100));
      actions.push('cứu sáng vùng tối & giữ chi tiết vùng sáng');
    }

    // --- 4. Skin / Portrait Glow ---
    if (hasAny(t, ['trang da', 'sang da', 'hong da', 'ton da', 'min da', 'lam dep da', 'da dep', 'skin', 'chan dung dep'])) {
      bumpAdj('skinGlow', 45, 0, 100);
      bumpHsl('orange', 'l', 16);
      bumpHsl('orange', 's', -8);
      bumpAdj('glow', 14, 0, 100);
      actions.push('tôn da sáng hồng & làm mềm ánh sáng');
    }

    // --- 5. Exposure / Brightness ---
    if (hasAny(t, ['giam sang', 'toi hon', 'toi di', 'ha sang', 'bot choi', 'bot sang', 'darker', 'dim'])) {
      bumpAdj('exposure', -20);
      if (hasAny(t, ['choi', 'chay sang'])) bumpAdj('highlights', -35);
      actions.push('giảm độ sáng');
    } else if (hasAny(t, ['lam sang', 'sang hon', 'tang sang', 'sang len', 'brighter', 'brighten'])) {
      bumpAdj('exposure', 22);
      actions.push('tăng độ sáng (EV)');
    }

    // --- 6. Highlights & Shadows ---
    if (hasAny(t, ['giam vung sang', 'cuu chay sang', 'bot chay', 'ha vung sang'])) {
      bumpAdj('highlights', -35);
      actions.push('giảm chói vùng sáng');
    } else if (hasAny(t, ['tang vung sang'])) {
      bumpAdj('highlights', 28);
      actions.push('tăng vùng sáng');
    }
    if (hasAny(t, ['nang vung toi', 'sang vung toi', 'tang vung toi', 'mo vung toi'])) {
      bumpAdj('shadows', 36);
      actions.push('nâng sáng vùng tối');
    } else if (hasAny(t, ['vung toi sau', 'dam vung toi', 'giam vung toi'])) {
      bumpAdj('shadows', -28);
      actions.push('làm sâu vùng tối');
    }

    // --- 7. Contrast ---
    if (hasAny(t, ['giam tuong phan', 'diu hon', 'mem mai', 'bot gat', 'low contrast'])) {
      bumpAdj('contrast', -20);
      actions.push('làm dịu tương phản');
    } else if (hasAny(t, ['tang tuong phan', 'tuong phan', 'noi khoi', 'contrast'])) {
      bumpAdj('contrast', 24);
      actions.push('tăng tương phản sâu');
    }

    // --- 8. Temperature & Tint ---
    if (hasAny(t, ['am ap', 'am hon', 'tang am', 'tong am', 'mau am', 'vang hon', 'warmer', 'warm'])) {
      bumpAdj('temperature', 24);
      actions.push('chỉnh tông ấm áp');
    } else if (hasAny(t, ['lanh hon', 'tong lanh', 'mau lanh', 'xanh lanh', 'mat me', 'cooler', 'cool', 'giam am'])) {
      bumpAdj('temperature', -24);
      actions.push('chỉnh tông mát lạnh');
    }

    // --- 9. Saturation / Vibrance ---
    if (hasAny(t, ['nhat mau', 'giam bao hoa', 'bot ruc', 'mau tram', 'desaturate', 'muted'])) {
      bumpAdj('saturation', -24);
      actions.push('giảm độ bão hòa cho dịu màu');
    } else if (hasAny(t, ['tuoi hon', 'ruc ro', 'dam mau', 'song dong', 'noi mau', 'vivid', 'vibrant', 'tuoi tan'])) {
      bumpAdj('vibrance', 28);
      bumpAdj('saturation', 10);
      actions.push('tăng độ tươi màu sống động');
    }

    // --- 10. Sky Blue & Lush Foliage (Targeted HSL!) ---
    if (hasAny(t, ['troi xanh', 'bau troi', 'bien xanh', 'nuoc xanh', 'sky'])) {
      bumpHsl('blue', 's', 28);
      bumpHsl('blue', 'l', -14);
      bumpHsl('aqua', 's', 18);
      bumpAdj('dehaze', 14);
      actions.push('làm sâu sắc xanh bầu trời/biển (HSL)');
    }
    if (hasAny(t, ['la xanh', 'cay xanh', 'cay tuoi', 'la tuoi', 'xanh la', 'thien nhien', 'green'])) {
      bumpHsl('green', 's', 24);
      bumpHsl('green', 'h', 10);
      bumpHsl('green', 'l', -4);
      actions.push('làm xanh tươi tán lá (HSL)');
    }

    // --- 11. Clarity, Dehaze, Sharpen, Glow, Grain, Vignette, Fade ---
    if (hasAny(t, ['sac net', 'lam net', 'ro net', 'sharp', 'chi tiet'])) {
      bumpAdj('sharpen', 30, 0, 100);
      bumpAdj('clarity', 18);
      actions.push('tăng độ sắc nét & chi tiết');
    }
    if (hasAny(t, ['trong treo', 'khu suong', 'khu mo', 'khu duc', 'dehaze', 'clarity'])) {
      bumpAdj('dehaze', 22);
      bumpAdj('clarity', 20);
      actions.push('khử mù & tăng độ trong trẻo');
    }
    if (hasAny(t, ['mo mang', 'ao dieu', 'toa sang', 'pro mist', 'glow', 'dreamy', 'lung linh'])) {
      bumpAdj('glow', 34, 0, 100);
      bumpAdj('contrast', -8);
      actions.push('thêm hiệu ứng ánh sáng mơ màng (Pro Mist)');
    }
    if (hasAny(t, ['hat phim', 'nhieu phim', 'grain'])) {
      bumpAdj('grain', 28, 0, 100);
      actions.push('thêm hạt phim hữu cơ');
    }
    if (hasAny(t, ['toi goc', 'vignette', 'vien toi'])) {
      bumpAdj('vignette', 32);
      actions.push('làm tối 4 góc tập trung chủ thể');
    }
    if (hasAny(t, ['phim mo', 'matte', 'fade'])) {
      bumpAdj('fade', 28, 0, 100);
      actions.push('tạo chất phim mờ (Matte Fade)');
    }
    if (hasAny(t, ['lam mo', 'blur'])) {
      setAdjIfHigher('blur', 3, 0, 20);
      actions.push('làm mờ mềm ảnh');
    }

    // --- 12. Crop, Rotate & Frame ---
    if (hasAny(t, ['xoay trai'])) {
      next.transform.rotate = (next.transform.rotate - 90 + 360) % 360;
      actions.push('xoay trái 90°');
    } else if (hasAny(t, ['xoay phai', 'xoay anh'])) {
      next.transform.rotate = (next.transform.rotate + 90) % 360;
      actions.push('xoay phải 90°');
    }
    if (hasAny(t, ['lat ngang'])) {
      next.transform.flipH = !next.transform.flipH;
      actions.push('lật ngang ảnh');
    } else if (hasAny(t, ['lat doc'])) {
      next.transform.flipV = !next.transform.flipV;
      actions.push('lật dọc ảnh');
    }

    const applyCenterCrop = (targetAspect, label) => {
      const srcW = sourceImage.naturalWidth || sourceImage.width;
      const srcH = sourceImage.naturalHeight || sourceImage.height;
      const rot = ((next.transform.rotate % 360) + 360) % 360;
      const swapped = rot === 90 || rot === 270;
      const imgAspect = (swapped ? srcH : srcW) / (swapped ? srcW : srcH);
      let w = 1, h = 1;
      if (imgAspect > targetAspect) {
        w = targetAspect / imgAspect;
      } else {
        h = imgAspect / targetAspect;
      }
      next.transform.crop = { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
      actions.push(`cắt khung ${label}`);
    };

    if (hasAny(t, ['cat vuong', '1:1', 'hinh vuong', 'avatar'])) {
      applyCenterCrop(1, '1:1');
    } else if (hasAny(t, ['16:9', 'man anh rong'])) {
      applyCenterCrop(16 / 9, '16:9');
    } else if (hasAny(t, ['9:16', 'story', 'tiktok', 'reels'])) {
      applyCenterCrop(9 / 16, '9:16');
    } else if (hasAny(t, ['4:5', 'instagram'])) {
      applyCenterCrop(4 / 5, '4:5');
    }

    if (hasAny(t, ['khung polaroid', 'polaroid'])) {
      next.frame.style = 'polaroid';
      actions.push('thêm khung Polaroid');
    } else if (hasAny(t, ['khung studio', 'chu ky', 'leica frame', 'khung leica'])) {
      next.frame.style = 'film';
      if (!next.frame.title) next.frame.title = 'LUMINA STUDIO';
      actions.push('thêm khung Chữ ký Studio');
    } else if (hasAny(t, ['khung toi', 'khung den'])) {
      next.frame.style = 'dark';
      actions.push('thêm khung Phòng tối');
    } else if (hasAny(t, ['khung trang', 'gallery', 'them khung', 'dong khung'])) {
      next.frame.style = 'gallery';
      actions.push('thêm khung Gallery trắng');
    } else if (hasAny(t, ['bo khung', 'xoa khung', 'khong khung'])) {
      next.frame.style = 'none';
      actions.push('gỡ khung ảnh');
    }

    // If user asked for generative pixel editing without Gemini API key, give helpful guidance + smart polish
    if (actions.length === 0) {
      if (looksLikeGenerativeEdit(raw)) {
        return {
          state: next,
          changed: false,
          needsGeminiImage: true,
          message: 'Yêu cầu chỉnh sửa vật thể/phông nền cần bật chế độ "Biến đổi AI (Gemini)" và nhập Gemini API Key miễn phí (bấm biểu tượng ⚙️ góc phải).',
        };
      }
      // Graceful fallback: intelligent subtle Auto Enhance
      const auto = Processor.analyzeAutoEnhance(sourceImage);
      Object.assign(next.adjustments, auto);
      return {
        state: next,
        changed: true,
        message: 'Đã tự động tối ưu ánh sáng, độ nét & cân bằng màu theo ảnh. Bạn có thể mô tả cụ thể hơn (VD: "ấm hơn", "da sáng hồng", "màu Leica", "trời xanh hơn") hoặc gắn Gemini API Key để AI xử lý sâu hơn.',
      };
    }

    return {
      state: next,
      changed: true,
      message: `Đã xử lý: ${actions.join(', ')}.`,
    };
  }

  /**
   * Encodes an HTMLCanvasElement / HTMLImageElement to compact JPEG base64 for Gemini API.
   */
  function encodeSourceToBase64(source, maxDim = 1024, quality = 0.88) {
    const srcW = source.naturalWidth || source.width;
    const srcH = source.naturalHeight || source.height;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const w = Math.max(16, Math.round(srcW * scale));
    const h = Math.max(16, Math.round(srcH * scale));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(source, 0, 0, w, h);
    const dataUrl = c.toDataURL('image/jpeg', quality);
    return {
      mime_type: 'image/jpeg',
      data: dataUrl.split(',')[1],
    };
  }

  /**
   * Extracts text and image blocks from the Interactions API REST `steps` response.
   */
  function parseInteractionResponse(json) {
    const steps = Array.isArray(json && json.steps) ? json.steps : [];
    const texts = [];
    let imageBlock = null;

    for (const step of steps) {
      if (step && step.type === 'model_output' && Array.isArray(step.content)) {
        for (const item of step.content) {
          if (item.type === 'text' && item.text) {
            texts.push(item.text);
          } else if (item.type === 'image' && item.data) {
            imageBlock = {
              data: item.data,
              mime_type: item.mime_type || 'image/png',
            };
          }
        }
      }
    }

    return {
      id: json && json.id,
      text: texts.join('\n').trim(),
      image: imageBlock,
    };
  }

  /**
   * Gemini 4 Hydrogen Visual Color Grading AI: inspects the actual photo + prompt and returns
   * a calibrated non-destructive Lumina Studio recipe (preset + adjustments + HSL + frame).
   */
  async function runGeminiColorAI(prompt, currentState, renderedCanvas, Processor, apiKey) {
    const img = encodeSourceToBase64(renderedCanvas, 768, 0.82);
    const presetIds = Processor.PRESETS.map((p) => p.id).join(', ');
    const adjKeys = Object.keys(Processor.DEFAULT_ADJUSTMENTS).join(', ');
    const hslKeys = Processor.HSL_CHANNELS.map((c) => c.id).join(', ');

    const systemPrompt = [
      'Bạn là chuyên gia chỉnh màu ảnh (Colorist) của Lumina Studio.',
      'Hãy quan sát kỹ bức ảnh đính kèm và đọc yêu cầu của người dùng, sau đó trả về DUY NHẤT một đối tượng JSON hợp lệ (không markdown, không ```) với cấu trúc:',
      '{',
      '  "summary_vi": "Câu giải thích ngắn gọn (1 câu tiếng Việt) mô tả bạn đã chỉnh gì",',
      `  "presetId": "một trong: ${presetIds} (hoặc giữ nguyên nếu chỉ tinh chỉnh)",`,
      '  "presetStrength": 0-100,',
      `  "adjustments": { chỉ ghi các khóa cần đổi trong: ${adjKeys} (giá trị -100..100, trừ blur 0..20 và skinGlow/sharpen/glow/grain/fade/sepia 0..100) },`,
      `  "hsl": { chỉ ghi kênh cần đổi trong: ${hslKeys}, mỗi kênh dạng {"h": -100..100, "s": -100..100, "l": -100..100} },`,
      '  "frameStyle": "none | gallery | dark | polaroid | film (chỉ ghi nếu người dùng nhắc khung ảnh)"',
      '}',
      'Quy tắc: Chỉnh tự nhiên, chuẩn màu, tránh quá tay gây cháy sáng hoặc bệt màu da.',
      `Trạng thái hiện tại: presetId=${currentState.presetId}, presetStrength=${currentState.presetStrength}.`,
      `Yêu cầu người dùng: "${prompt}"`,
    ].join('\n');

    const res = await fetch(GEMINI_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
        'Api-Revision': '2026-05-20',
      },
      body: JSON.stringify({
        model: MODEL_COLOR_AI,
        input: [
          { type: 'text', text: systemPrompt },
          { type: 'image', mime_type: img.mime_type, data: img.data },
        ],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = (data && data.error && data.error.message) || `HTTP ${res.status}`;
      throw new Error(errMsg);
    }

    const parsed = parseInteractionResponse(data);
    let rawJson = parsed.text;
    const fenced = rawJson.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) rawJson = fenced[1].trim();
    const firstBrace = rawJson.indexOf('{');
    const lastBrace = rawJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      rawJson = rawJson.slice(firstBrace, lastBrace + 1);
    }

    const recipe = JSON.parse(rawJson);
    const next = JSON.parse(JSON.stringify(currentState));

    if (recipe.presetId && Processor.PRESETS.some((p) => p.id === recipe.presetId)) {
      next.presetId = recipe.presetId;
      next.presetStrength = typeof recipe.presetStrength === 'number'
        ? clamp(Math.round(recipe.presetStrength), 0, 100)
        : 100;
    }

    if (recipe.adjustments && typeof recipe.adjustments === 'object') {
      for (const k in recipe.adjustments) {
        if (k in Processor.DEFAULT_ADJUSTMENTS && typeof recipe.adjustments[k] === 'number') {
          const isPosOnly = ['skinGlow', 'sharpen', 'glow', 'grain', 'fade', 'sepia'].includes(k);
          const min = k === 'blur' || isPosOnly ? 0 : -100;
          const max = k === 'blur' ? 20 : 100;
          next.adjustments[k] = clamp(Math.round(recipe.adjustments[k] * 10) / 10, min, max);
        }
      }
    }

    if (recipe.hsl && typeof recipe.hsl === 'object') {
      if (!next.hsl) next.hsl = Processor.createDefaultHSL();
      for (const ch of Processor.HSL_CHANNELS) {
        const patch = recipe.hsl[ch.id];
        if (patch && typeof patch === 'object') {
          if (typeof patch.h === 'number') next.hsl[ch.id].h = clamp(Math.round(patch.h), -100, 100);
          if (typeof patch.s === 'number') next.hsl[ch.id].s = clamp(Math.round(patch.s), -100, 100);
          if (typeof patch.l === 'number') next.hsl[ch.id].l = clamp(Math.round(patch.l), -100, 100);
        }
      }
    }

    if (recipe.frameStyle && ['none', 'gallery', 'dark', 'polaroid', 'film'].includes(recipe.frameStyle)) {
      next.frame.style = recipe.frameStyle;
    }

    return {
      state: next,
      changed: true,
      message: recipe.summary_vi || 'Gemini AI đã phân tích ảnh và chỉnh màu theo yêu cầu của bạn.',
    };
  }

  /**
   * Gemini Nano Banana 2.1 Generative Image Editing: directly modifies image pixels
   * (remove objects, swap background, relight, change outfit, artistic styles) via Interactions API.
   */
  async function runGeminiImageEdit(prompt, renderedCanvas, apiKey, previousInteractionId) {
    const img = encodeSourceToBase64(renderedCanvas, 1280, 0.90);
    const instruction = [
      'Edit the provided photograph precisely according to the user request below.',
      'Preserve natural realism, subject identity, lighting consistency, and high image quality unless the user asks for an artistic style.',
      `User request: ${prompt}`,
    ].join('\n');

    const body = {
      model: MODEL_IMAGE_AI,
      input: [
        { type: 'text', text: instruction },
        { type: 'image', mime_type: img.mime_type, data: img.data },
      ],
    };

    if (previousInteractionId) {
      body.previous_interaction_id = previousInteractionId;
    }

    const res = await fetch(GEMINI_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
        'Api-Revision': '2026-05-20',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = (data && data.error && data.error.message) || `HTTP ${res.status}`;
      throw new Error(errMsg);
    }

    const parsed = parseInteractionResponse(data);
    if (!parsed.image || !parsed.image.data) {
      throw new Error(parsed.text || 'Gemini không trả về ảnh kết quả cho yêu cầu này. Hãy thử diễn đạt cụ thể hơn.');
    }

    // Decode base64 into HTMLImageElement
    const editedImg = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Không thể đọc ảnh trả về từ Gemini AI'));
      el.src = `data:${parsed.image.mime_type};base64,${parsed.image.data}`;
    });

    return {
      image: editedImg,
      interactionId: parsed.id || null,
      message: parsed.text || 'Gemini AI đã biến đổi ảnh theo yêu cầu của bạn (có thể bấm Hoàn tác hoặc So sánh Trước/Sau).',
    };
  }

  global.LuminaAI = {
    MODEL_COLOR_AI,
    MODEL_IMAGE_AI,
    getApiKey,
    setApiKey,
    looksLikeGenerativeEdit,
    runLocalSmartAI,
    runGeminiColorAI,
    runGeminiImageEdit,
  };
})(window);
