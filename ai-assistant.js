(function (global) {
  'use strict';

  const GEMINI_V1BETA_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  const MODEL_COLOR_AI = 'gemini-4-hydrogen';
  const MODEL_COLOR_FALLBACKS = ['gemini-4-hydrogen', 'gemini-3.5-flash-lite'];
  const MODEL_IMAGE_AI = 'gemini-nano-banana-2.1';
  const MODEL_IMAGE_FALLBACKS = ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image'];
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

  function extractNumberNear(text, fallback) {
    const m = text.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : fallback;
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
   * Detects whether a prompt asks for true generative pixel edits (remove any object/jewelry/person/blemish,
   * replace background, change outfit/hair/expression, add objects, transform art style),
   * while keeping local color/bokeh/frame adjustments in fast color mode.
   */
  function looksLikeGenerativeEdit(prompt) {
    const t = normalizeVi(prompt);

    // Explicitly local-only operations (do NOT require generative pixel redraw)
    const isOnlyLocalBlur = hasAny(t, ['xoa phong', 'mo nen', 'mo hau canh', 'lam mo nen', 'bokeh']);
    const isOnlyResetOrFrame = hasAny(t, ['xoa khung', 'bo khung', 'xoa het chinh', 'dat lai', 've goc']);

    // Generic removal verbs: "xóa dây chuyền", "xóa người", "xóa mụn", "bỏ đồng hồ", "gỡ kính", "che logo"...
    if (!isOnlyLocalBlur && !isOnlyResetOrFrame) {
      if (/(^|\s)(xoa|bo di|go bo|loai bo|cat bo|tay |che di|remove|erase|delete)\b/.test(t)) {
        return true;
      }
    }

    // Adding non-color objects/elements (exclude "sáng thêm", "ấm thêm", "thêm khung", "thêm hạt phim", "thêm hồng")
    if (/(^|\s)(them|ve them|ghep|dat them|add)\s+/.test(t)) {
      if (!hasAny(t, ['them khung', 'them hat phim', 'them hong', 'them am', 'them sang', 'them net', 'them tuong phan', 'them chut'])) {
        return true;
      }
    }

    // Replacing/changing objects, backgrounds, outfits, hair, faces, artistic redraws
    return hasAny(t, [
      'tach nen', 'doi nen', 'thay nen', 'doi phong nen', 'thay phong', 'doi canh',
      'doi ao', 'doi vay', 'doi quan', 'doi trang phuc', 'mac ao', 'mac vay', 'thay ao', 'thay do',
      'doi toc', 'kieu toc', 'doi mat', 'doi mu', 'deo kinh', 'trang diem', 'cuoi len', 'mim cuoi',
      'bien thanh', 'chuyen thanh', 'tranh ve', 'anime', 'hoat hinh', 'son dau', 'phac hoa', 'cyberpunk', 'ghibli', '3d',
      'replace ', 'change background', 'change outfit', 'turn into', 'inpaint',
    ]);
  }

  /**
   * Built-in Instant AI Photo Assistant (Zero API Key required!).
   * Understands natural Vietnamese & English instructions, scenes, HSL fixes, portrait bokeh, crop, frames & numbers.
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
    if (hasAny(t, ['nhe', 'chut', 'it thoi', 'vua phai', 'so qua', 'subtle', 'slight', 'a bit'])) mult = 0.6;
    if (hasAny(t, ['manh', 'nhieu', 'dam', 'cuc ', 'rat ', 'toi da', 'strong', 'heavy', 'more'])) mult = 1.45;

    const explicitNum = extractNumberNear(t, null);

    const bumpAdj = (key, delta, min = -100, max = 100) => {
      next.adjustments[key] = Math.round(clamp((next.adjustments[key] || 0) + delta * mult, min, max));
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

    // --- 1. Auto Enhance ---
    if (hasAny(t, ['tu dong', 'dep tu nhien', 'can bang', 'chinh dep', 'toi uu', 'auto', 'enhance', 'sua dep', 'lam dep anh'])) {
      const auto = Processor.analyzeAutoEnhance(sourceImage);
      Object.assign(next.adjustments, auto);
      actions.push('tự động cân bằng sáng, tương phản & màu chuẩn');
    }

    // --- 2. Scene / Mood Recipes (Food, Cafe, Beach, Landscape, Portrait, Night, Luxury, Moody) ---
    if (hasAny(t, ['do an', 'mon an', 'am thuc', 'food'])) {
      next.adjustments.temperature = Math.round(clamp((next.adjustments.temperature || 0) + 14 * mult, -100, 100));
      next.adjustments.vibrance = Math.round(clamp((next.adjustments.vibrance || 0) + 24 * mult, -100, 100));
      next.adjustments.clarity = Math.round(clamp((next.adjustments.clarity || 0) + 20 * mult, -100, 100));
      next.adjustments.sharpen = Math.round(clamp((next.adjustments.sharpen || 0) + 20 * mult, 0, 100));
      next.adjustments.highlights = Math.round(clamp((next.adjustments.highlights || 0) - 10 * mult, -100, 100));
      bumpHsl('orange', 's', 14);
      bumpHsl('red', 's', 16);
      actions.push('tối ưu màu ảnh đồ ăn ấm ngon & sắc nét');
    }

    if (hasAny(t, ['cafe', 'ca phe', 'tra sua', 'tiem banh', 'quan nuoc'])) {
      next.presetId = 'portra_400';
      next.presetStrength = 100;
      bumpAdj('temperature', 12);
      bumpAdj('fade', 12, 0, 100);
      actions.push('chỉnh tông ảnh quán cafe ấm dịu kiểu phim');
    }

    if (hasAny(t, ['di bien', 'bai bien', 'du lich bien', 'beach'])) {
      next.presetId = 'leica_eternal';
      next.presetStrength = 90;
      bumpHsl('aqua', 's', 26);
      bumpHsl('blue', 's', 22);
      bumpHsl('blue', 'l', -10);
      bumpAdj('exposure', 10);
      bumpAdj('dehaze', 14);
      actions.push('tối ưu ảnh biển xanh trong & sáng rạng rỡ');
    }

    if (hasAny(t, ['phong canh', 'thien nhien', 'nui non', 'du lich', 'landscape'])) {
      next.presetId = 'leica_eternal';
      next.presetStrength = 100;
      bumpAdj('clarity', 16);
      bumpAdj('dehaze', 16);
      bumpAdj('sharpen', 16, 0, 100);
      actions.push('tối ưu ảnh phong cảnh trong trẻo & sâu màu');
    }

    if (hasAny(t, ['chan dung', 'selfie', 'chup nguoi', 'portrait']) && !hasAny(t, ['film', 'portra'])) {
      bumpAdj('skinGlow', 40, 0, 100);
      bumpAdj('shadows', 16);
      bumpAdj('highlights', -12);
      bumpAdj('bokeh', 35, 0, 100);
      bumpHsl('orange', 'l', 14);
      actions.push('tối ưu ảnh chân dung tôn da sáng mịn & xóa phông nhẹ');
    }

    if (hasAny(t, ['chup dem', 'ban dem', 'anh dem', 'low light'])) {
      bumpAdj('shadows', 30);
      bumpAdj('highlights', -20);
      bumpAdj('dehaze', 14);
      bumpAdj('vibrance', 16);
      actions.push('tối ưu ảnh chụp đêm (nâng vùng tối & giảm chói đèn)');
    }

    if (hasAny(t, ['sang trong', 'quy phai', 'tap chi', 'chau au', 'phong cach tay', 'editorial'])) {
      next.presetId = 'leica_chrome';
      next.presetStrength = 100;
      bumpAdj('saturation', -10);
      bumpAdj('clarity', 14);
      bumpAdj('vignette', 16);
      actions.push('chỉnh tông sang trọng chuẩn tạp chí Leica');
    }

    if (hasAny(t, ['tram buon', 'tam trang', 'moody', 'u buon', 'lanh leo'])) {
      next.presetId = 'fuji_classic_chrome';
      next.presetStrength = 100;
      bumpAdj('temperature', -14);
      bumpAdj('saturation', -18);
      bumpAdj('fade', 18, 0, 100);
      bumpAdj('vignette', 24);
      actions.push('chỉnh tông trầm buồn moody');
    }

    if (hasAny(t, ['trong veo', 'tinh khiet', 'nhe nhang', 'tho mong'])) {
      next.presetId = 'korean_airy';
      next.presetStrength = 90;
      bumpAdj('clarity', 8);
      actions.push('chỉnh tông trong veo nhẹ nhàng');
    }

    // --- 3. Style / Preset Matching ---
    const presetRules = [
      { id: 'leica_chrome',       label: 'Leica Chrome',       keys: ['leica chrome', 'kodachrome', 'leica vip'] },
      { id: 'leica_contemporary', label: 'Leica Contemporary', keys: ['leica contemporary', 'hien dai', 'toi gian'] },
      { id: 'leica_mono',         label: 'Leica Monochrom',    keys: ['den trang', 'black and white', 'b&w', 'monochrom', 'trang den'] },
      { id: 'noir_cinema',        label: 'Noir Điện Ảnh',      keys: ['noir', 'den trang kich tinh', 'den trang tuong phan'] },
      { id: 'leica_classic',      label: 'Leica Classic',      keys: ['leica', 'mau leica'] },
      { id: 'fuji_classic_chrome',label: 'Fuji Classic Chrome',keys: ['fuji chrome', 'classic chrome', 'phong su', 'duong pho'] },
      { id: 'fuji_classic_neg',   label: 'Fuji Classic Neg',   keys: ['fuji neg', 'classic neg', 'fuji'] },
      { id: 'korean_airy',        label: 'Hàn Quốc Trong Trẻo',keys: ['han quoc', 'korean', 'pastel'] },
      { id: 'japan_fresh',        label: 'Nhật Bản Thanh Lịch',keys: ['nhat ban', 'japan', 'xanh ngoc', 'thanh lich'] },
      { id: 'portra_400',         label: 'Kodak Portra 400',   keys: ['portra', 'chan dung film', 'film chan dung'] },
      { id: 'kodak_gold',         label: 'Kodak Gold 200',     keys: ['kodak gold', 'nang vang', 'gio vang', 'hoang hon', 'golden'] },
      { id: 'teal_orange',        label: 'Cine Teal & Orange', keys: ['dien anh', 'cinematic', 'teal', 'hollywood', 'phim chieu rap'] },
      { id: 'saigon_vintage',     label: 'Sài Gòn Vintage',    keys: ['sai gon', 'vintage', 'hoai niem', 'retro', 'co dien', 'mau film', 'mau phim'] },
      { id: 'tokyo_night',        label: 'Đêm Tokyo Neon',     keys: ['tokyo', 'neon', 'pho dem'] },
    ];

    for (const rule of presetRules) {
      if (hasAny(t, rule.keys)) {
        next.presetId = rule.id;
        next.presetStrength = hasAny(t, ['cuong do']) && explicitNum !== null
          ? Math.round(clamp(explicitNum, 0, 100))
          : 100;
        actions.push(`áp dụng màu ${rule.label}`);
        break;
      }
    }

    // Preset strength only request ("cường độ 60%")
    if (hasAny(t, ['cuong do', 'do dam bo loc']) && explicitNum !== null && actions.length === 0) {
      next.presetStrength = Math.round(clamp(explicitNum, 0, 100));
      actions.push(`đặt cường độ bộ lọc ${next.presetStrength}%`);
    }

    // --- 4. Portrait Background Blur (Bokeh) ---
    if (hasAny(t, ['xoa phong', 'mo nen', 'mo hau canh', 'lam mo nen', 'lam mo phia sau', 'bokeh'])) {
      const amt = explicitNum !== null && explicitNum <= 100 ? explicitNum : Math.round(clamp(55 * mult, 15, 100));
      next.adjustments.bokeh = Math.round(clamp(amt, 0, 100));
      actions.push(`xóa phông làm mờ nền (${next.adjustments.bokeh}%)`);
    }

    // --- 5. Backlit / Dark Rescue ---
    if (hasAny(t, ['nguoc sang', 'cuu anh toi', 'cuu toi', 'bi toi', 'toi qua', 'underexposed'])) {
      const auto = Processor.analyzeAutoEnhance(sourceImage);
      next.adjustments.exposure = Math.round(clamp(Math.max(auto.exposure, 20) * mult, -100, 100));
      next.adjustments.shadows = Math.round(clamp(46 * mult, 0, 100));
      next.adjustments.highlights = Math.round(clamp(-24 * mult, -100, 0));
      next.adjustments.clarity = Math.round(clamp(14 * mult, 0, 100));
      next.adjustments.sharpen = Math.round(clamp(16 * mult, 0, 100));
      actions.push('cứu sáng vùng tối & giữ chi tiết vùng sáng');
    }

    // --- 6. Skin Glow ---
    if (hasAny(t, ['trang da', 'sang da', 'hong da', 'ton da', 'min da', 'lam dep da', 'da dep', 'skin', 'trang hong'])) {
      bumpAdj('skinGlow', 45, 0, 100);
      bumpHsl('orange', 'l', 16);
      bumpHsl('orange', 's', -8);
      bumpAdj('glow', 12, 0, 100);
      actions.push('tôn da sáng hồng & làm mềm ánh sáng');
    }

    // --- 7. Exposure / Brightness ---
    if (hasAny(t, ['giam sang', 'toi hon', 'toi di', 'ha sang', 'bot choi', 'bot sang', 'darker', 'dim'])) {
      const step = explicitNum !== null && explicitNum <= 100 ? -explicitNum : -22;
      bumpAdj('exposure', step);
      if (hasAny(t, ['choi', 'chay sang'])) bumpAdj('highlights', -35);
      actions.push('giảm độ sáng');
    } else if (hasAny(t, ['lam sang', 'sang hon', 'tang sang', 'sang len', 'brighter', 'brighten'])) {
      const step = explicitNum !== null && explicitNum <= 100 ? explicitNum : 22;
      bumpAdj('exposure', step);
      actions.push('tăng độ sáng (EV)');
    }

    // --- 8. Highlights & Shadows ---
    if (hasAny(t, ['giam vung sang', 'cuu chay sang', 'bot chay', 'ha vung sang'])) {
      bumpAdj('highlights', -36);
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

    // --- 9. Contrast ---
    if (hasAny(t, ['giam tuong phan', 'diu hon', 'mem mai', 'bot gat', 'low contrast'])) {
      bumpAdj('contrast', -22);
      actions.push('làm dịu tương phản');
    } else if (hasAny(t, ['tang tuong phan', 'tuong phan', 'noi khoi', 'contrast'])) {
      const step = explicitNum !== null && explicitNum <= 100 ? explicitNum : 24;
      bumpAdj('contrast', step);
      actions.push('tăng tương phản sâu');
    }

    // --- 10. White Balance / Color Cast Fixes ("bớt ám vàng", "bớt ám xanh") ---
    if (hasAny(t, ['bot am vang', 'giam vang', 'khu am vang', 'het am vang'])) {
      bumpAdj('temperature', -22);
      bumpHsl('yellow', 's', -20);
      actions.push('khử ám vàng cho màu trong chuẩn');
    } else if (hasAny(t, ['bot am xanh', 'khu am xanh', 'het am xanh'])) {
      bumpAdj('temperature', 22);
      bumpAdj('tint', 10);
      actions.push('khử ám xanh cho màu tự nhiên');
    } else if (hasAny(t, ['am ap', 'am hon', 'tang am', 'tong am', 'mau am', 'vang hon', 'warmer', 'warm'])) {
      bumpAdj('temperature', 24);
      actions.push('chỉnh tông ấm áp');
    } else if (hasAny(t, ['lanh hon', 'tong lanh', 'mau lanh', 'xanh lanh', 'mat me', 'cooler', 'cool', 'giam am'])) {
      bumpAdj('temperature', -24);
      actions.push('chỉnh tông mát lạnh');
    }

    // --- 11. Direct Per-Color HSL Requests ---
    if (hasAny(t, ['do moi', 'tang do', 'do hon', 'do ruc'])) {
      bumpHsl('red', 's', 28);
      actions.push('tăng sắc đỏ (HSL)');
    } else if (hasAny(t, ['giam do', 'bot do'])) {
      bumpHsl('red', 's', -26);
      actions.push('giảm sắc đỏ (HSL)');
    }
    if (hasAny(t, ['hong hon', 'them hong', 'tong hong', 'mau hong'])) {
      bumpAdj('tint', 16);
      bumpHsl('magenta', 's', 22);
      actions.push('thêm sắc hồng dịu');
    }
    if (hasAny(t, ['tim hon', 'tong tim', 'mau tim'])) {
      bumpHsl('purple', 's', 26);
      actions.push('tăng sắc tím (HSL)');
    }
    if (hasAny(t, ['troi xanh', 'bau troi', 'bien xanh', 'nuoc xanh', 'sky', 'xanh duong'])) {
      bumpHsl('blue', 's', 28);
      bumpHsl('blue', 'l', -14);
      bumpHsl('aqua', 's', 18);
      bumpAdj('dehaze', 14);
      actions.push('làm sâu sắc xanh bầu trời/biển (HSL)');
    }
    if (hasAny(t, ['la xanh', 'cay xanh', 'cay tuoi', 'la tuoi', 'xanh la', 'green'])) {
      if (hasAny(t, ['giam xanh la', 'bot xanh la'])) {
        bumpHsl('green', 's', -28);
        actions.push('làm dịu màu xanh lá (HSL)');
      } else {
        bumpHsl('green', 's', 24);
        bumpHsl('green', 'h', 10);
        bumpHsl('green', 'l', -4);
        actions.push('làm xanh tươi tán lá (HSL)');
      }
    }

    // --- 12. Saturation / Vibrance ---
    if (hasAny(t, ['nhat mau', 'giam bao hoa', 'bot ruc', 'mau tram', 'desaturate', 'muted'])) {
      bumpAdj('saturation', -24);
      actions.push('giảm độ bão hòa cho dịu màu');
    } else if (hasAny(t, ['tuoi hon', 'ruc ro', 'dam mau', 'song dong', 'noi mau', 'vivid', 'vibrant', 'tuoi tan'])) {
      bumpAdj('vibrance', 28);
      bumpAdj('saturation', 10);
      actions.push('tăng độ tươi màu sống động');
    }

    // --- 13. Clarity, Dehaze, Sharpen, Glow, Grain, Vignette, Fade, Blur ---
    if (hasAny(t, ['sac net', 'lam net', 'ro net', 'anh bi mo', 'ro hon', 'sharp', 'chi tiet'])) {
      bumpAdj('sharpen', 34, 0, 100);
      bumpAdj('clarity', 20);
      actions.push('tăng độ sắc nét & rõ chi tiết');
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
    if (hasAny(t, ['lam mo toan bo', 'blur']) && !hasAny(t, ['mo nen', 'xoa phong'])) {
      next.adjustments.blur = Math.round(clamp(3 * mult, 0.5, 20) * 2) / 2;
      actions.push('làm mờ mềm ảnh');
    }

    // --- 14. Crop, Rotate & Frame ---
    if (hasAny(t, ['xoay 180', 'nguoc anh'])) {
      next.transform.rotate = (next.transform.rotate + 180) % 360;
      actions.push('xoay 180°');
    } else if (hasAny(t, ['xoay trai'])) {
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
      if (imgAspect > targetAspect) w = targetAspect / imgAspect;
      else h = imgAspect / targetAspect;
      next.transform.crop = { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
      actions.push(`cắt khung ${label}`);
    };

    if (hasAny(t, ['cat vuong', '1:1', 'hinh vuong', 'avatar'])) applyCenterCrop(1, '1:1');
    else if (hasAny(t, ['16:9', 'man anh rong'])) applyCenterCrop(16 / 9, '16:9');
    else if (hasAny(t, ['9:16', 'story', 'tiktok', 'reels'])) applyCenterCrop(9 / 16, '9:16');
    else if (hasAny(t, ['4:5', 'instagram'])) applyCenterCrop(4 / 5, '4:5');
    else if (hasAny(t, ['4:3'])) applyCenterCrop(4 / 3, '4:3');
    else if (hasAny(t, ['3:4'])) applyCenterCrop(3 / 4, '3:4');
    else if (hasAny(t, ['3:2'])) applyCenterCrop(3 / 2, '3:2');

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

    if (actions.length === 0) {
      if (looksLikeGenerativeEdit(raw)) {
        return {
          state: next,
          changed: false,
          needsGeminiImage: true,
          message: 'Yêu cầu chỉnh sửa vật thể / đổi phông nền cần nhập Gemini API Key miễn phí (bấm nút "Gemini API" ở góc phải) để kích hoạt AI tạo sinh.',
        };
      }
      const auto = Processor.analyzeAutoEnhance(sourceImage);
      Object.assign(next.adjustments, auto);
      return {
        state: next,
        changed: true,
        message: 'Đã tự động cân bằng sáng, độ nét & màu chuẩn. Mẹo: thử gõ "xóa phông", "bớt ám vàng", "chỉnh ảnh đồ ăn", "da trắng hồng", hoặc gắn Gemini API Key để AI hiểu mọi yêu cầu tự do.',
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

  function isLocalServerOrigin() {
    try {
      const h = window.location.hostname;
      return (h === 'localhost' || h === '127.0.0.1') && window.location.protocol.startsWith('http');
    } catch (_) {
      return false;
    }
  }

  /**
   * Calls Gemini Interactions API strictly on v1beta (required for multimodal `type: "image"` inputs).
   * Uses local /api/gemini proxy on localhost (zero CORS issues), and direct v1beta HTTPS on GitHub Pages.
   */
  async function callGeminiInteractions(apiKey, body) {
    const attempts = [];

    if (isLocalServerOrigin()) {
      attempts.push({
        url: '/api/gemini',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
      });
    }

    // Direct v1beta HTTPS calls (for GitHub Pages / static hosting)
    attempts.push({
      url: GEMINI_V1BETA_URL,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
    });
    attempts.push({
      url: `${GEMINI_V1BETA_URL}?key=${encodeURIComponent(apiKey)}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let lastError = null;
    for (let i = 0; i < attempts.length; i++) {
      const att = attempts[i];
      try {
        const res = await fetch(att.url, {
          method: 'POST',
          headers: att.headers,
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          return data;
        }
        const msg = (data && data.error && data.error.message) || `HTTP ${res.status}`;
        lastError = new Error(msg);
        // Stop retrying transport on definitive API errors (400/401/403/404/429)
        if (res.status >= 400 && res.status < 500) {
          throw lastError;
        }
      } catch (err) {
        lastError = err;
        // Only continue to next transport if this was a network/CORS failure (TypeError)
        if (!(err instanceof TypeError)) {
          throw err;
        }
      }
    }
    throw lastError || new Error('Không thể kết nối tới Google Gemini API (v1beta)');
  }

  /**
   * Calls Gemini across an ordered list of preferred + fallback models (great for Free tier!).
   */
  async function callWithModelFallback(apiKey, models, bodyBuilder) {
    let lastError = null;
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      try {
        const data = await callGeminiInteractions(apiKey, bodyBuilder(model));
        return { data, model };
      } catch (err) {
        lastError = err;
        // On invalid key, fail fast without trying other models
        if (err && /API key not valid|invalid api key|401/i.test(err.message || '')) {
          throw err;
        }
      }
    }
    throw lastError || new Error('Không gọi được model Gemini');
  }

  /**
   * Extracts text and image blocks defensively from Interactions API `steps` (or legacy `outputs`).
   */
  function parseInteractionResponse(json) {
    const texts = [];
    let imageBlock = null;

    const inspectItems = (items) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (!item) continue;
        if (item.type === 'text' && item.text) {
          texts.push(item.text);
        } else if (item.type === 'image' && item.data) {
          imageBlock = {
            data: item.data,
            mime_type: item.mime_type || 'image/png',
          };
        }
      }
    };

    if (Array.isArray(json && json.steps)) {
      for (const step of json.steps) {
        if (step && step.type === 'model_output') {
          inspectItems(step.content);
        }
      }
    }
    if (!imageBlock && Array.isArray(json && json.outputs)) {
      inspectItems(json.outputs);
    }

    return {
      id: json && json.id,
      text: texts.join('\n').trim(),
      image: imageBlock,
    };
  }

  /**
   * Quick API key connectivity check for the Gemini settings modal.
   */
  async function testGeminiConnection(apiKey) {
    const cleaned = (apiKey || '').trim();
    if (!cleaned) throw new Error('Vui lòng dán Gemini API Key trước');
    const { data, model } = await callWithModelFallback(cleaned, MODEL_COLOR_FALLBACKS, (m) => ({
      model: m,
      input: 'Reply with OK',
    }));
    const parsed = parseInteractionResponse(data);
    return `${parsed.text || 'OK'} (${model})`;
  }

  /**
   * Gemini 4 Hydrogen Visual Color Grading AI: inspects actual photo + prompt and returns
   * a calibrated Lumina Studio recipe (preset + adjustments + HSL + frame).
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
      `  "adjustments": { chỉ ghi các khóa cần đổi trong: ${adjKeys} (giá trị -100..100, trừ blur 0..20 và skinGlow/sharpen/glow/bokeh/grain/fade/sepia 0..100) },`,
      `  "hsl": { chỉ ghi kênh cần đổi trong: ${hslKeys}, mỗi kênh dạng {"h": -100..100, "s": -100..100, "l": -100..100} },`,
      '  "frameStyle": "none | gallery | dark | polaroid | film (chỉ ghi nếu người dùng nhắc khung ảnh)"',
      '}',
      'Quy tắc: Chỉnh tự nhiên, chuẩn màu, tránh quá tay gây cháy sáng hoặc bệt màu da.',
      `Trạng thái hiện tại: presetId=${currentState.presetId}, presetStrength=${currentState.presetStrength}.`,
      `Yêu cầu người dùng: "${prompt}"`,
    ].join('\n');

    const { data } = await callWithModelFallback(apiKey, MODEL_COLOR_FALLBACKS, (m) => ({
      model: m,
      input: [
        { type: 'text', text: systemPrompt },
        { type: 'image', mime_type: img.mime_type, data: img.data },
      ],
    }));

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
          const isPosOnly = ['skinGlow', 'sharpen', 'glow', 'bokeh', 'grain', 'fade', 'sepia'].includes(k);
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
   * Gemini Nano Banana 2.1 Generative Image Editing via Interactions API.
   */
  async function runGeminiImageEdit(prompt, renderedCanvas, apiKey, previousInteractionId) {
    const img = encodeSourceToBase64(renderedCanvas, 1280, 0.90);
    const instruction = [
      'Edit the provided photograph precisely according to the user request below.',
      'Preserve natural realism, subject identity, lighting consistency, and high image quality unless an artistic style is requested.',
      `User request: ${prompt}`,
    ].join('\n');

    let data;
    try {
      const res = await callWithModelFallback(apiKey, MODEL_IMAGE_FALLBACKS, (m) => {
        const b = {
          model: m,
          input: [
            { type: 'text', text: instruction },
            { type: 'image', mime_type: img.mime_type, data: img.data },
          ],
          response_format: [
            { type: 'text' },
            { type: 'image' },
          ],
        };
        if (previousInteractionId && m === MODEL_IMAGE_AI) {
          b.previous_interaction_id = previousInteractionId;
        }
        return b;
      });
      data = res.data;
    } catch (err) {
      const msg = (err && err.message) || '';
      if (/limit:\s*0|Free Tier|rate limit|quota/i.test(msg)) {
        const friendly = new Error(
          'Google giới hạn 0 lượt/ngày cho AI vẽ lại ảnh trên gói Free Tier (cần bật Billing trên AI Studio). Bạn hãy bấm "Tẩy vật thể" miễn phí để tô trực tiếp lên dây chuyền/vật thừa và xóa ngay!'
        );
        friendly.isFreeTierImageLimit = true;
        throw friendly;
      }
      throw err;
    }
    const parsed = parseInteractionResponse(data);
    if (!parsed.image || !parsed.image.data) {
      throw new Error(parsed.text || 'Gemini không trả về ảnh kết quả cho yêu cầu này. Hãy thử mô tả cụ thể hơn.');
    }

    const editedImg = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Không thể đọc ảnh trả về từ Gemini AI'));
      el.src = `data:${parsed.image.mime_type};base64,${parsed.image.data}`;
    });

    return {
      image: editedImg,
      interactionId: parsed.id || null,
      message: parsed.text || 'Gemini AI đã biến đổi ảnh theo yêu cầu (có thể bấm Hoàn tác hoặc So sánh Trước/Sau).',
    };
  }

  /**
   * Free-Tier Automatic AI Object Removal & Regional Editing powered by Gemini 4 Hydrogen Vision!
   * Gemini visually inspects the photo and outputs pixel-accurate strokes/polygons in [0..1000] space,
   * which LuminaProcessor.applyAiRegionEdit executes automatically at full native resolution.
   */
  async function runGeminiVisionRegionEdit(prompt, renderedCanvas, apiKey) {
    const img = encodeSourceToBase64(renderedCanvas, 1024, 0.90);

    const schema = {
      type: 'object',
      properties: {
        found: { type: 'boolean', description: 'Whether the target object/region requested by the user exists in the image.' },
        action: {
          type: 'string',
          enum: ['remove', 'recolor', 'blur', 'brighten'],
          description: 'Use "remove" to erase objects/jewelry/blemishes/text/people; "recolor" to change color of clothing/lips/hair/sky; "blur" to blur a region/background; "brighten" to brighten/darken a specific region.',
        },
        summary_vi: { type: 'string', description: 'Short 1-sentence Vietnamese description of what you located and edited.' },
        strokes: {
          type: 'array',
          description: 'Polylines tracing thin or curved items (e.g., necklace chains, wires, straps, lines). Use 8 to 24 densely spaced points along the exact centerline.',
          items: {
            type: 'object',
            properties: {
              width: { type: 'integer', description: 'Stroke thickness in 0..1000 image units (e.g., 16-24 for a thin necklace chain, 26-40 for thicker straps/wires).' },
              points: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    x: { type: 'integer', description: 'Horizontal position from left=0 to right=1000' },
                    y: { type: 'integer', description: 'Vertical position from top=0 to bottom=1000' },
                  },
                  required: ['x', 'y'],
                },
              },
            },
            required: ['width', 'points'],
          },
        },
        polygons: {
          type: 'array',
          description: 'Tight closed polygons around solid items (e.g., pendant, blemish, logo, dress, face, background person).',
          items: {
            type: 'object',
            properties: {
              points: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    x: { type: 'integer', description: 'Horizontal position from left=0 to right=1000' },
                    y: { type: 'integer', description: 'Vertical position from top=0 to bottom=1000' },
                  },
                  required: ['x', 'y'],
                },
              },
            },
            required: ['points'],
          },
        },
        boxes: {
          type: 'array',
          description: 'Optional fallback 2D bounding boxes as [ymin, xmin, ymax, xmax] in 0..1000.',
          items: { type: 'array', items: { type: 'integer' } },
        },
        targetHue: { type: 'integer', description: 'For action="recolor": target hue angle 0..360 (0=red, 30=orange, 60=yellow, 120=green, 210=blue, 280=purple, 330=pink).' },
        satDelta: { type: 'integer', description: 'For action="recolor": saturation change -100..100.' },
        lumDelta: { type: 'integer', description: 'For action="recolor" or "brighten": brightness change -60..60.' },
        blurStrength: { type: 'integer', description: 'For action="blur": blur strength 15..90.' },
      },
      required: ['found', 'action', 'summary_vi', 'strokes', 'polygons'],
    };

    const instruction = [
      'You are a precision computer-vision photo retouching engine.',
      'Carefully inspect the image (including any white/black margins — coordinates MUST be relative to the ENTIRE image canvas from 0 to 1000).',
      'Understand the user request even if it contains Vietnamese typing typos (e.g. "dây chyteenf" = "dây chuyền" = necklace).',
      'Locate the EXACT target object(s) to edit:',
      '- For thin/curved items like a necklace chain on the neck, trace the FULL V-shaped or curved chain carefully using 10-20 consecutive {x, y} points in `strokes` with `width` ~ 18-24, AND trace the hanging pendant/charm tightly in `polygons` (or a small stroke/circle). Keep the mask focused tightly on the jewelry itself and avoid touching clothing straps or hair.',
      '- For solid objects (blemishes, logos, people, clothing to recolor), trace a tight accurate polygon in `polygons`.',
      '- Double-check that `x` is left-to-right (0..1000) and `y` is top-to-bottom (0..1000).',
      `User request: "${prompt}"`,
    ].join('\n');

    const jsonReminder = '\nReturn ONLY valid raw JSON matching: {"found": true/false, "action": "remove"|"recolor"|"blur"|"brighten", "summary_vi": "...", "strokes": [{"width": 20, "points": [{"x": 500, "y": 100}]}], "polygons": [{"points": [{"x": 500, "y": 100}]}], "boxes": [[ymin, xmin, ymax, xmax]], "targetHue": 0, "satDelta": 0, "lumDelta": 0, "blurStrength": 40}.';

    let data, model;
    try {
      const res = await callWithModelFallback(apiKey, MODEL_COLOR_FALLBACKS, (m) => ({
        model: m,
        input: [
          { type: 'text', text: instruction },
          { type: 'image', mime_type: img.mime_type, data: img.data },
        ],
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema,
        },
      }));
      data = res.data;
      model = res.model;
    } catch (schemaErr) {
      // Defensive fallback if an endpoint/model rejects structured schema parameter
      if (schemaErr && /API key|quota|billing|401|403|429/i.test(schemaErr.message || '')) {
        throw schemaErr;
      }
      const res = await callWithModelFallback(apiKey, MODEL_COLOR_FALLBACKS, (m) => ({
        model: m,
        input: [
          { type: 'text', text: instruction + jsonReminder },
          { type: 'image', mime_type: img.mime_type, data: img.data },
        ],
      }));
      data = res.data;
      model = res.model;
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

    const plan = JSON.parse(rawJson);
    return {
      plan,
      model,
      message: plan.summary_vi || 'Gemini AI đã tự động nhận diện và xử lý vùng theo yêu cầu.',
    };
  }

  global.LuminaAI = {
    MODEL_COLOR_AI,
    MODEL_IMAGE_AI,
    getApiKey,
    setApiKey,
    looksLikeGenerativeEdit,
    testGeminiConnection,
    runLocalSmartAI,
    runGeminiColorAI,
    runGeminiImageEdit,
    runGeminiVisionRegionEdit,
  };
})(window);
