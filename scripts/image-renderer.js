/**
 * image-renderer.js — Image Template Renderer Layer (v2)
 *
 * ชั้นวาดภาพ: รับข้อมูลที่คำนวณแล้วไปวาดลง <canvas>
 * - แยกออกจาก data และ pricing โดยสิ้นเชิง
 * - เปลี่ยน title, color, size, labels ช่วงน้ำมันได้
 * - export PNG ได้ทันที
 *
 * Design System: Government/Transport Tool
 * Style: Accessible & Ethical — Navy + White, crisp, WCAG AA
 * Font: Sarabun (Thai) + Inter (EN) from Google Fonts
 *
 * Scrutinize fixes v2:
 *  - ลบ ctx.roundRect (ไม่ supported ทุก browser) → ใช้ helper ทั้งหมด
 *  - ลบ header drawing ซ้ำซ้อน → วาด header ชัดเจนทีเดียว
 *  - แยก clip zone ออกจาก fill zone เพื่อป้องกัน visual artifact
 */

const ImageRenderer = (() => {
  // ── Template Config ────────────────────────────────────────────────────────
  let tmpl = {
    width: 1270,
    height: 720,
    headerBg: "#0A2463",
    headerText: "#FFFFFF",
    subHeaderBg: "#1B3B8A",
    bodyBg: "#FFFFFF",
    bodyText: "#0A2463",
    borderColor: "#D4DEED",
    surfaceTint: "#F8FBFF",
    pageBgTop: "#EEF4FB",
    pageBgBottom: "#DCE8F8",
    accentColor: "#3E6ED6",
    bandIconColor: "#5985E1",
    priceColor: "#0A2463",
    unitColor: "#4A5568",
    rowAltBg: "#F0F4FF",
    fontFamily: "Sarabun, Inter, Arial",
    headerFontSize: 28,
    subHeaderFontSize: 15,
    leftHeaderFontSize: 14,
    labelFontSize: 17,
    priceFontSize: 38,
    unitFontSize: 15,
    metaFontSize: 17,
    padding: 32,
    headerHeight: 72,
    subHeaderHeight: 64,
    rowHeight: 160,
    cornerRadius: 18,
    oilSectionTitle: "อัตราค่าขนส่ง พขร.",
    routeLabel: "ชื่อเส้นทาง",
    distanceLabel: "ระยะทาง",
    vehicleLabel: "ประเภทรถ",
    unitLabel: "บาท",
    priceUnit: "บาท/ลิตร",
    profileLabel: "Pricing Profile",
    referenceDateLabel: "หมายเหตุ",
    referenceDate: "ระบุข้อความหมายเหตุ",
  };

  // ── Cross-browser rounded rect (ไม่ใช้ ctx.roundRect) ─────────────────────
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function fmtPrice(n) {
    return Number(n).toLocaleString("th-TH");
  }

  function fmtDistance(distance) {
    const numericDistance = Number(distance);
    if (!Number.isFinite(numericDistance) || numericDistance <= 0) return "ไม่ระบุ";
    return `${numericDistance.toLocaleString("th-TH")} Km`;
  }

  function getBandDisplayLabel(label) {
    return `${label ?? ""}`.trim();
  }

  const FUEL_ICON_PATH = new Path2D("M160-120v-640q0-33 23.5-56.5T240-840h240q33 0 56.5 23.5T560-760v280h40q33 0 56.5 23.5T680-400v180q0 17 11.5 28.5T720-180q17 0 28.5-11.5T760-220v-288q-9 5-19 6.5t-21 1.5q-42 0-71-29t-29-71q0-32 17.5-57.5T684-694l-84-84 42-42 148 144q15 15 22.5 35t7.5 41v380q0 42-29 71t-71 29q-42 0-71-29t-29-71v-200h-60v300H160Zm80-440h240v-200H240v200Zm480 0q17 0 28.5-11.5T760-600q0-17-11.5-28.5T720-640q-17 0-28.5 11.5T680-600q0 17 11.5 28.5T720-560ZM240-200h240v-280H240v280Zm240 0H240h240Z");
  const headerLogoImage = typeof Image !== "undefined" ? new Image() : null;
  if (headerLogoImage) {
    headerLogoImage.decoding = "async";
    headerLogoImage.src = "icons/2k.png";
  }

  function withFont(ctx, weight, size) {
    ctx.font = `${weight} ${size}px ${tmpl.fontFamily}`;
  }

  function getFittedFontSize(ctx, text, maxWidth, maxFontSize, minFontSize, weight = "600") {
    const content = `${text ?? ""}`;
    let fontSize = maxFontSize;
    while (fontSize > minFontSize) {
      withFont(ctx, weight, fontSize);
      if (ctx.measureText(content).width <= maxWidth) break;
      fontSize -= 0.5;
    }
    return Math.max(fontSize, minFontSize);
  }

  function drawFittedText(ctx, {
    text,
    x,
    y,
    maxWidth,
    maxFontSize,
    minFontSize,
    weight = "600",
    fillStyle = tmpl.bodyText,
    align = "center",
  }) {
    const fontSize = getFittedFontSize(ctx, text, maxWidth, maxFontSize, minFontSize, weight);
    withFont(ctx, weight, fontSize);
    ctx.fillStyle = fillStyle;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(`${text ?? ""}`, x, y);
    return fontSize;
  }

  function wrapTextLines(ctx, text, maxWidth) {
    const content = `${text ?? ""}`.trim();
    if (!content) return [""];
    const paragraphs = content.split(/\r?\n/);
    const lines = [];
    paragraphs.forEach((paragraph) => {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push("");
        return;
      }
      let current = words[0];
      for (let i = 1; i < words.length; i += 1) {
        const candidate = `${current} ${words[i]}`;
        if (ctx.measureText(candidate).width <= maxWidth) {
          current = candidate;
        } else {
          lines.push(current);
          current = words[i];
        }
      }
      lines.push(current);
    });
    return lines;
  }

  function drawWrappedFittedText(ctx, {
    text,
    x,
    y,
    maxWidth,
    maxFontSize,
    minFontSize,
    maxLines = 2,
    lineGap = 1.22,
    weight = "600",
    fillStyle = tmpl.bodyText,
    align = "left",
  }) {
    const content = `${text ?? ""}`;
    let fontSize = maxFontSize;
    let lines = [content];
    while (fontSize > minFontSize) {
      withFont(ctx, weight, fontSize);
      lines = wrapTextLines(ctx, content, maxWidth);
      if (lines.length <= maxLines) break;
      fontSize -= 0.5;
    }
    withFont(ctx, weight, fontSize);
    ctx.fillStyle = fillStyle;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    const lineHeight = fontSize * lineGap;
    const clipped = lines.slice(0, maxLines);
    clipped.forEach((line, index) => {
      ctx.fillText(line, x, y + lineHeight * index);
    });
    return { fontSize, lineCount: clipped.length, lineHeight };
  }

  function drawFuelIcon(ctx, x, y, size, fill = tmpl.bandIconColor) {
    const scale = size / 960;
    ctx.save();
    ctx.translate(x, y + size);
    ctx.scale(scale, scale);
    ctx.fillStyle = fill;
    ctx.fill(FUEL_ICON_PATH);
    ctx.restore();
  }

  const PERSON_ICON_PATH = new Path2D("M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z");
  const CALENDAR_ICON_PATH = new Path2D("M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Z");
  const NOTE_ICON_PATH = new Path2D("M80-560q0-100 44.5-183.5T244-882l47 64q-60 44-95.5 111T160-560H80Zm720 0q0-80-35.5-147T669-818l47-64q75 55 119.5 138.5T880-560h-80ZM160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q80 20 130 84.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z");
  const ROUTE_ICON_PATH = new Path2D("M307-113.5Q240-147 240-200q0-24 14.5-44.5T295-280l63 59q-9 4-19.5 9T322-200q13 16 60 28t98 12q51 0 98.5-12t60.5-28q-7-8-18-13t-21-9l62-60q28 16 43 36.5t15 45.5q0 53-67 86.5T480-80q-106 0-173-33.5ZM481-300q99-73 149-146.5T680-594q0-102-65-154t-135-52q-70 0-135 52t-65 154q0 67 49 139.5T481-300Zm-1 100Q339-304 269.5-402T200-594q0-71 25.5-124.5T291-808q40-36 90-54t99-18q49 0 99 18t90 54q40 36 65.5 89.5T760-594q0 94-69.5 192T480-200Zm0-320q33 0 56.5-23.5T560-600q0-33-23.5-56.5T480-680q-33 0-56.5 23.5T400-600q0 33 23.5 56.5T480-520Zm0-80Z");
  const ROAD_ICON_PATH = new Path2D("M440-80v-200q0-56-17-83t-45-53l57-57q12 11 23 23.5t22 26.5q14-19 28.5-33.5T538-485q38-35 69-81t33-161l-63 63-57-56 160-160 160 160-56 56-64-63q-2 143-44 203.5T592-425q-32 29-52 56.5T520-280v200h-80ZM248-633q-4-20-5.5-44t-2.5-50l-64 63-56-56 160-160 160 160-57 56-63-62q0 21 2 39.5t4 34.5l-78 19Zm86 176q-20-21-38.5-49T263-575l77-19q10 27 23 46t28 34l-57 57Z");
  const TRUCK_ICON_PATH = new Path2D("M195-195q-35-35-35-85H60l18-80h113q17-19 40-29.5t49-10.5q26 0 49 10.5t40 29.5h167l84-360H182l4-17q6-28 27.5-45.5T264-800h456l-37 160h117l120 160-40 200h-80q0 50-35 85t-85 35q-50 0-85-35t-35-85H400q0 50-35 85t-85 35q-50 0-85-35Zm442-245h193l4-21-74-99h-95l-28 120Zm-19-273 2-7-84 360 2-7 34-146 46-200ZM20-427l20-80h220l-20 80H20Zm80-146 20-80h260l-20 80H100Zm180 333q17 0 28.5-11.5T320-280q0-17-11.5-28.5T280-320q-17 0-28.5 11.5T240-280q0 17 11.5 28.5T280-240Zm400 0q17 0 28.5-11.5T720-280q0-17-11.5-28.5T680-320q-17 0-28.5 11.5T640-280q0 17 11.5 28.5T680-240Z");

  function drawMaterialIcon(ctx, path, x, y, size, fill = tmpl.headerBg) {
    const scale = size / 960;
    ctx.save();
    ctx.translate(x, y + size);
    ctx.scale(scale, scale);
    ctx.fillStyle = fill;
    ctx.fill(path);
    ctx.restore();
  }

  function drawCircleIcon(ctx, path, cx, cy, size, bg = "#EAF0FA", fill = tmpl.headerBg) {
    ctx.save();
    const gradient = ctx.createLinearGradient(cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2);
    gradient.addColorStop(0, "#FFFFFF");
    gradient.addColorStop(1, bg);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#D5E1F1";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    drawMaterialIcon(ctx, path, cx - size * 0.23, cy - size * 0.23, size * 0.46, fill);
    ctx.restore();
  }

  function drawSoftPanel(ctx, x, y, w, h, radius = 18, start = "#FFFFFF", end = "#F3F8FF", stroke = "#D7E3F2") {
    ctx.save();
    ctx.shadowColor = "rgba(15,45,120,0.08)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    rr(ctx, x, y, w, h, radius);
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, start);
    gradient.addColorStop(1, end);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    ctx.save();
    rr(ctx, x, y, w, h, radius);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  function drawLogoPlaceholder(ctx, x, y, w, h) {
    drawSoftPanel(ctx, x, y, w, h, 22, "#FDFEFF", "#EEF5FF", "#D7E3F2");

    const innerPad = 10;
    const innerX = x + innerPad;
    const innerY = y + innerPad;
    const innerW = w - innerPad * 2;
    const innerH = h - innerPad * 2;

    ctx.save();
    rr(ctx, innerX, innerY, innerW, innerH, 18);
    ctx.clip();
    if (headerLogoImage && headerLogoImage.complete && headerLogoImage.naturalWidth > 0) {
      const scale = Math.min(innerW / headerLogoImage.naturalWidth, innerH / headerLogoImage.naturalHeight);
      const drawW = headerLogoImage.naturalWidth * scale;
      const drawH = headerLogoImage.naturalHeight * scale;
      const drawX = innerX + (innerW - drawW) / 2;
      const drawY = innerY + (innerH - drawH) / 2;
      ctx.drawImage(headerLogoImage, drawX, drawY, drawW, drawH);
    } else {
      const g = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH);
      g.addColorStop(0, "#F7FBFF");
      g.addColorStop(1, "#E8F1FC");
      ctx.fillStyle = g;
      ctx.fillRect(innerX, innerY, innerW, innerH);
      drawMaterialIcon(ctx, TRUCK_ICON_PATH, innerX + 18, innerY + 14, Math.min(innerW, innerH) - 26, tmpl.headerBg);
    }
    ctx.restore();
  }

  function drawTruckIcon(ctx, x, y, width, height, fillStyle = "rgba(255,255,255,0.56)") {
    ctx.save();
    ctx.fillStyle = fillStyle;
    const cabinW = width * 0.28;
    const bodyW = width * 0.48;
    const wheelR = height * 0.13;

    rr(ctx, x, y + height * 0.24, bodyW, height * 0.36, 4);
    ctx.fill();
    rr(ctx, x + bodyW - 2, y + height * 0.31, cabinW, height * 0.29, 4);
    ctx.fill();

    ctx.strokeStyle = fillStyle;
    ctx.lineWidth = Math.max(2, height * 0.06);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + bodyW + cabinW * 0.55, y + height * 0.34);
    ctx.lineTo(x + bodyW + cabinW * 0.84, y + height * 0.34);
    ctx.lineTo(x + bodyW + cabinW * 0.84, y + height * 0.45);
    ctx.stroke();

    ctx.fillStyle = tmpl.headerBg;
    rr(ctx, x + bodyW + cabinW * 0.10, y + height * 0.35, cabinW * 0.28, height * 0.12, 2);
    ctx.fill();

    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.arc(x + bodyW * 0.22, y + height * 0.68, wheelR, 0, Math.PI * 2);
    ctx.arc(x + bodyW + cabinW * 0.28, y + height * 0.68, wheelR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(x + bodyW * 0.18, y + height * 0.16, width * 0.50, height * 0.07);
    ctx.restore();
  }

  // ── Main render ────────────────────────────────────────────────────────────
  function resolvePixelRatio(canvas, W, H, options = {}) {
    const viewportRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    const displayScaleX = rect && rect.width > 0 ? rect.width / W : 1;
    const displayScaleY = rect && rect.height > 0 ? rect.height / H : displayScaleX;
    const displayScale = Math.max(displayScaleX, displayScaleY, 1);
    const requestedRatio = options.pixelRatio || 0;
    const maxRatio = options.maxPixelRatio || 4;
    const computedRatio = viewportRatio * displayScale;
    const snappedRatio = Math.ceil(computedRatio * 2) / 2;
    return Math.min(Math.max(snappedRatio, requestedRatio, 1), maxRatio);
  }

  const MAX_TABLE_COLS = 8;
  const MIN_TABLE_COLS = 3;
  const MIN_BAND_CELL_W = 130;
  // ระยะจากขอบบน card ถึงตารางราคา (hero 26+156, summary 26+138, gap 30)
  const TABLE_OFFSET_Y = 376;

  // ขนาดฟอนต์เดียวทั้งชุด = ขนาดที่ข้อความยาวที่สุดยังใส่ช่องได้
  function getUniformFontSize(ctx, texts, maxWidth, maxFontSize, minFontSize, weight) {
    return Math.min(...texts.map((text) => getFittedFontSize(ctx, text, maxWidth, maxFontSize, minFontSize, weight)));
  }

  function render(canvas, routeData, oilBands, options = {}) {
    if (!canvas) {
      console.error("ImageRenderer: canvas element not found");
      return;
    }
    if (!routeData) {
      console.error("ImageRenderer: routeData is null or undefined");
      return;
    }
    if (!oilBands || oilBands.length === 0) {
      console.error("ImageRenderer: oilBands is empty");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("ImageRenderer: cannot get 2d context");
      return;
    }
    // ช่วงน้ำมันเกิน MAX_TABLE_COLS จะขึ้นแถวใหม่ และขยายความสูงภาพให้พอดี
    // เพื่อไม่ให้ตัวเลขราคาถูกบีบจนล้นช่อง
    const bandCount = oilBands.length;
    const tableInnerW = tmpl.width - tmpl.padding * 2 - 64;
    const maxCols = Math.max(
      MIN_TABLE_COLS,
      Math.min(MAX_TABLE_COLS, Math.floor(tableInnerW / MIN_BAND_CELL_W))
    );
    const tableRows = Math.ceil(bandCount / maxCols);
    const tableCols = Math.ceil(bandCount / tableRows);
    const tableTitleH = 52;
    const bandLabelH = 48;
    const rowH = tableRows > 1 ? 124 : 160;
    const tableH = tableTitleH + tableRows * (bandLabelH + rowH);
    const requiredH = tmpl.padding * 2 + TABLE_OFFSET_Y + tableH + 20;
    const W = tmpl.width;
    const H = Math.max(tmpl.height, requiredH);

    // Keep the backing store aligned with the real displayed size so CSS scaling
    // does not soften text/icons in the preview.
    const pixelRatio = resolvePixelRatio(canvas, W, H, options);
    canvas.width = Math.round(W * pixelRatio);
    canvas.height = Math.round(H * pixelRatio);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const pad = tmpl.padding;
    const R = tmpl.cornerRadius;
    const cardX = pad;
    const cardY = pad;
    const cardW = W - pad * 2;
    const cardH = H - pad * 2;
    const innerX = cardX + 32;
    const innerW = cardW - 64;
    const navy = tmpl.headerBg;
    const line = "#D7E1EF";
    const lightLine = "#E8EEF7";

    // ── 1. Page background ──────────────────────────────────────────────────
    const pageGradient = ctx.createLinearGradient(0, 0, 0, H);
    pageGradient.addColorStop(0, tmpl.pageBgTop);
    pageGradient.addColorStop(1, tmpl.pageBgBottom);
    ctx.fillStyle = pageGradient;
    ctx.fillRect(0, 0, W, H);

    const glowLeft = ctx.createRadialGradient(W * 0.18, H * 0.12, 10, W * 0.18, H * 0.12, W * 0.34);
    glowLeft.addColorStop(0, "rgba(255,255,255,0.95)");
    glowLeft.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glowLeft;
    ctx.fillRect(0, 0, W, H);

    const glowRight = ctx.createRadialGradient(W * 0.86, H * 0.18, 10, W * 0.86, H * 0.18, W * 0.26);
    glowRight.addColorStop(0, "rgba(197,220,255,0.42)");
    glowRight.addColorStop(1, "rgba(197,220,255,0)");
    ctx.fillStyle = glowRight;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(0, 0, W, 18);

    // ── 2. Card shadow ──────────────────────────────────────────────────────
    ctx.save();
    ctx.shadowColor = "rgba(10,36,99,0.16)";
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 10;
    rr(ctx, cardX, cardY, cardW, cardH, R);
    ctx.fillStyle = tmpl.bodyBg;
    ctx.fill();
    ctx.restore();

    // ── 3. Clip everything to card shape ────────────────────────────────────
    ctx.save();
    rr(ctx, cardX, cardY, cardW, cardH, R);
    ctx.clip();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(cardX, cardY, cardW, cardH);

    // Header identity area
    const heroY = cardY + 26;
    const heroH = 156;
    drawSoftPanel(ctx, innerX - 12, heroY, innerW + 24, heroH, 26, "#FFFFFF", "#F4F8FF", "#DBE6F4");

    const topY = heroY + 22;
    const logoX = innerX + 6;
    const logoY = topY + 2;
    const logoW = 140;
    const logoH = 106;
    drawLogoPlaceholder(ctx, logoX, logoY, logoW, logoH);

    const titleX = logoX + logoW + 34;
    const noteLabel = tmpl.referenceDateLabel || "หมายเหตุ";
    const noteText = tmpl.referenceDate || "ระบุข้อความหมายเหตุ";
    const baseNoteTextFont = 16;
    const baseNoteLabelFont = 15;
    const baseNoteTextMaxWidth = 760;
    withFont(ctx, "700", baseNoteTextFont);
    const noteValueDesiredWidth = Math.min(baseNoteTextMaxWidth, ctx.measureText(noteText).width);
    withFont(ctx, "500", baseNoteLabelFont);
    const noteLabelDesiredWidth = ctx.measureText(noteLabel).width;
    const hasLongNote = noteText.length > 28 || noteValueDesiredWidth > 360;
    const noteTextMaxFont = hasLongNote ? 15 : 16;
    const noteTextMinFont = hasLongNote ? 9 : 10;
    const noteLabelFont = hasLongNote ? 14 : 15;
    const minTitleWidth = hasLongNote ? 170 : 240;
    const titleGap = hasLongNote ? 24 : 34;
    // ภาพแคบ: ลดขนาดกล่องหมายเหตุเพื่อไม่ให้ทับหัวเรื่อง
    const minDateCardW = Math.min(320, Math.max(200, innerX + innerW - 8 - titleX - titleGap - minTitleWidth));
    const noteInnerLeft = hasLongNote ? 88 : 92;
    const noteInnerRight = hasLongNote ? 24 : 28;
    const noteTextMaxWidth = hasLongNote ? 860 : 760;
    withFont(ctx, "700", noteTextMaxFont);
    const preferredNoteWidth = Math.min(noteTextMaxWidth, ctx.measureText(noteText).width);
    withFont(ctx, "500", noteLabelFont);
    const availableRightSpace = innerX + innerW - titleX - (hasLongNote ? 24 : 34);
    const maxDateCardW = Math.max(minDateCardW, availableRightSpace - minTitleWidth);
    const desiredDateCardW = Math.ceil(
      Math.max(noteLabelDesiredWidth, preferredNoteWidth) + noteInnerLeft + noteInnerRight
    );
    const dateCardW = Math.max(minDateCardW, Math.min(maxDateCardW, desiredDateCardW));
    const dateCardH = 88;
    const dateCardX = innerX + innerW - dateCardW - 8;
    const dateCardY = heroY + (heroH - dateCardH) / 2;
    drawSoftPanel(ctx, dateCardX, dateCardY, dateCardW, dateCardH, 22, "#FFFFFF", "#F5F9FF", "#D8E3F2");

    const titleMaxWidth = Math.max(80, dateCardX - titleX - titleGap);
    drawFittedText(ctx, {
      text: tmpl.oilSectionTitle,
      x: titleX,
      y: dateCardY + dateCardH / 2 - 2,
      maxWidth: titleMaxWidth,
      maxFontSize: hasLongNote ? 34 : 36,
      minFontSize: 16,
      weight: "700",
      fillStyle: navy,
      align: "left",
    });

    const infoX = dateCardX + 24;
    const infoY = dateCardY + 10;
    drawCircleIcon(ctx, NOTE_ICON_PATH, infoX + 22, dateCardY + dateCardH / 2, 42, "#EAF1FF", navy);
    drawFittedText(ctx, {
      text: noteLabel,
      x: infoX + 70,
      y: infoY + 16,
      maxWidth: dateCardW - noteInnerLeft - noteInnerRight,
      maxFontSize: noteLabelFont,
      minFontSize: hasLongNote ? 12 : 13,
      weight: "500",
      fillStyle: "#334155",
      align: "left",
    });
    drawFittedText(ctx, {
      text: noteText,
      x: infoX + 70,
      y: infoY + 44,
      maxWidth: dateCardW - noteInnerLeft - noteInnerRight,
      maxFontSize: noteTextMaxFont,
      minFontSize: noteTextMinFont,
      weight: "700",
      fillStyle: navy,
      align: "left",
    });

    // Route summary strip
    const summaryY = heroY + heroH + 26;
    const summaryH = 138;
    drawSoftPanel(ctx, innerX, summaryY, innerW, summaryH, 20, "#FFFFFF", "#F8FBFF", line);
    const summaryW = innerW / 3;
    [1, 2].forEach((i) => {
      ctx.fillStyle = "#D9E4F2";
      ctx.fillRect(innerX + summaryW * i, summaryY + 24, 1, summaryH - 48);
    });
    const summaryItems = [
      { icon: ROUTE_ICON_PATH, label: tmpl.routeLabel, value: routeData.name || routeData.id },
      { icon: ROAD_ICON_PATH, label: tmpl.distanceLabel, value: fmtDistance(routeData.distance) },
      { icon: TRUCK_ICON_PATH, label: tmpl.vehicleLabel, value: routeData.vehicleType },
    ];
    summaryItems.forEach((item, i) => {
      const sx = innerX + summaryW * i;
      drawCircleIcon(ctx, item.icon, sx + 72, summaryY + summaryH / 2, 68, "#E9EEF7", navy);
      drawFittedText(ctx, {
        text: item.label,
        x: sx + 136,
        y: summaryY + 48,
        maxWidth: summaryW - 160,
        maxFontSize: 20,
        minFontSize: 14,
        weight: "500",
        fillStyle: "#1E293B",
        align: "left",
      });
      drawFittedText(ctx, {
        text: item.value,
        x: sx + 136,
        y: summaryY + 88,
        maxWidth: summaryW - 160,
        maxFontSize: 28,
        minFontSize: 11,
        weight: "700",
        fillStyle: navy,
        align: "left",
      });
    });

    // Pricing table
    const tableX = innerX;
    const tableY = summaryY + summaryH + 30;
    const tableW = innerW;
    const bandW = tableW / tableCols;
    const prices = routeData.computedPrices || routeData.basePrices || [];
    const priceTexts = oilBands.map((_, i) => fmtPrice(i < prices.length ? prices[i] : 0));
    const priceFontSize = getUniformFontSize(
      ctx, priceTexts, bandW - 20,
      Math.min(tmpl.priceFontSize, Math.floor(rowH * 0.4)), 14, "700"
    );
    const unitFontSize = getUniformFontSize(ctx, [tmpl.unitLabel], bandW - 20, 18, 12, "600");
    const bandLabelFontSize = getUniformFontSize(
      ctx, oilBands.map((band) => getBandDisplayLabel(band.label)), bandW - 16, 18, 10, "700"
    );
    // จัดราคา + หน่วย ให้อยู่กึ่งกลางช่องตามขนาดฟอนต์จริง
    const priceBlockH = priceFontSize + 8 + unitFontSize;
    const priceBlockTop = (rowH - priceBlockH) / 2;

    ctx.save();
    rr(ctx, tableX, tableY, tableW, tableH, 12);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.clip();

    const tableTitleGradient = ctx.createLinearGradient(0, tableY, 0, tableY + tableTitleH + bandLabelH);
    tableTitleGradient.addColorStop(0, "#073481");
    tableTitleGradient.addColorStop(1, "#052B70");
    ctx.fillStyle = tableTitleGradient;
    ctx.fillRect(tableX, tableY, tableW, tableTitleH);

    drawFittedText(ctx, {
      text: `เรทราคาน้ำมัน (${tmpl.priceUnit})`,
      x: tableX + tableW / 2,
      y: tableY + 28,
      maxWidth: tableW - 30,
      maxFontSize: 24,
      minFontSize: 16,
      weight: "700",
      fillStyle: "#FFFFFF",
    });

    for (let row = 0; row < tableRows; row++) {
      const labelY = tableY + tableTitleH + row * (bandLabelH + rowH);
      const dataY = labelY + bandLabelH;
      const rowBands = oilBands.slice(row * tableCols, (row + 1) * tableCols);

      ctx.fillStyle = tableTitleGradient;
      ctx.fillRect(tableX, labelY, tableW, bandLabelH);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(tableX, labelY, tableW, 1);
      ctx.fillStyle = line;
      ctx.fillRect(tableX, dataY, tableW, 1);

      // แถวสุดท้ายที่ช่วงไม่ครบ: ช่องว่างเป็นพื้นสีอ่อน
      if (rowBands.length < tableCols) {
        const emptyX = tableX + bandW * rowBands.length;
        ctx.fillStyle = tmpl.surfaceTint;
        ctx.fillRect(emptyX, labelY, tableX + tableW - emptyX, bandLabelH + rowH);
      }

      rowBands.forEach((band, col) => {
        const bx = tableX + bandW * col;
        const index = row * tableCols + col;
        if (col > 0) {
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fillRect(bx, labelY, 1, bandLabelH);
          ctx.fillStyle = "#C5D3E8";
          ctx.fillRect(bx, dataY, 1, rowH);
        }

        drawFittedText(ctx, {
          text: getBandDisplayLabel(band.label),
          x: bx + bandW / 2,
          y: labelY + bandLabelH / 2,
          maxWidth: bandW - 16,
          maxFontSize: bandLabelFontSize,
          minFontSize: bandLabelFontSize,
          weight: "700",
          fillStyle: "#FFFFFF",
          align: "center",
        });

        drawFittedText(ctx, {
          text: priceTexts[index],
          x: bx + bandW / 2,
          y: dataY + priceBlockTop + priceFontSize / 2,
          maxWidth: bandW - 20,
          maxFontSize: priceFontSize,
          minFontSize: priceFontSize,
          weight: "700",
          fillStyle: navy,
        });
        drawFittedText(ctx, {
          text: tmpl.unitLabel,
          x: bx + bandW / 2,
          y: dataY + priceBlockTop + priceFontSize + 8 + unitFontSize / 2,
          maxWidth: bandW - 20,
          maxFontSize: unitFontSize,
          minFontSize: unitFontSize,
          weight: "600",
          fillStyle: "#35508F",
        });
      });
    }
    ctx.restore();

    rr(ctx, tableX, tableY, tableW, tableH, 12);
    ctx.strokeStyle = "#BFD0EA";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // End clip
    ctx.restore();

    // ── 8. Card border ──────────────────────────────────────────────────────
    ctx.save();
    rr(ctx, cardX, cardY, cardW, cardH, R);
    ctx.strokeStyle = "rgba(201,214,234,0.95)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // ── Export PNG ──────────────────────────────────────────────────────────────
  async function exportPNG(canvas, filename) {
    const downloadName = filename || "price-table.png";

    if (canvas.toBlob) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = downloadName;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        return;
      }
    }

    const link = document.createElement("a");
    link.download = downloadName;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  return {
    getTemplate: () => ({ ...tmpl }),
    setTemplate: (overrides) => { Object.assign(tmpl, overrides); },
    render,
    exportPNG,
  };
})();

if (typeof module !== "undefined") module.exports = ImageRenderer;
