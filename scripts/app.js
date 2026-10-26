/**
 * app.js — Application Controller
 *
 * เชื่อม 3 ชั้นหลักเข้าด้วยกัน:
 *   DataStore → PricingEngine → ImageRenderer
 *
 * จัดการ UI events ทั้งหมด:
 *   - Route selector, % ราคากลาง settings, per-route table
 *   - Oil band label editor
 *   - Template color/size controls
 *   - Preview + Export PNG
 *   - Batch export (all routes)
 */

(() => {
  "use strict";

  // ── State ─────────────────────────────────────────────────────────────────
  let state = {
    selectedRouteId: null,
    routes: [],
    oilBands: [],
    previewDirty: true,
  };

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  const canvas = $("preview-canvas");

  function getCurrentClient() {
    return typeof DataStore.getActiveClient === "function"
      ? DataStore.getActiveClient()
      : null;
  }

  function getRouteDistanceLabel(route) {
    const numericDistance = Number(route?.distance);
    if (!Number.isFinite(numericDistance) || numericDistance <= 0) {
      return "ระยะทางไม่ระบุ";
    }
    return `${numericDistance.toLocaleString("th-TH")} km`;
  }

  function getActiveRoute() {
    return state.routes.find((route) => route.id === state.selectedRouteId) || null;
  }

  function syncWorkspaceSummary() {
    const activeClient = getCurrentClient();

    const clientNameEl = $("client-name");
    const clientRouteCountEl = $("client-route-count");
    const clientRoutesListEl = $("client-routes-list");
    const clientDataInfoEl = $("client-data-info");

    if (activeClient) {
      if (clientNameEl) clientNameEl.textContent = activeClient.name;
      if (clientRouteCountEl) clientRouteCountEl.textContent = String(state.routes.length);
      if (clientRoutesListEl) {
        clientRoutesListEl.innerHTML = state.routes.map((route) => {
          const distance = route.distance ? `${route.distance} km` : "ไม่ระบุ";
          return `
            <div class="client-route-item">
              <span class="client-route-item__name">${route.name || route.id}</span>
              <span class="client-route-item__meta">${route.vehicleType} · ${distance}</span>
            </div>
          `;
        }).join("");
      }
      if (clientDataInfoEl) clientDataInfoEl.style.display = "block";
    } else {
      if (clientDataInfoEl) clientDataInfoEl.style.display = "none";
    }
  }

  function refreshStateFromStore() {
    state.routes = DataStore.getRoutes();
    state.oilBands = DataStore.getOilBands();
    PricingEngine.syncOverridesToBandCount(state.oilBands.length);
    syncWorkspaceSummary();
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    applyAppBranding();
    refreshStateFromStore();

    populateClientSelector();
    populateRouteList();
    populateOilBandEditor();
    bindPricingControls();
    bindTemplateControls();
    bindExportControls();
    bindRouteList();
    bindPreviewQualityWatchers();

    // Select first route
    const firstRoute = state.routes[0];
    if (firstRoute) selectRoute(firstRoute.id);
  }

  function applyAppBranding() {
    const appConfig = typeof DataStore.getAppConfig === "function"
      ? DataStore.getAppConfig()
      : {};
    const activeClient = getCurrentClient();
    const titleText = appConfig.productName || "Pricing Template Studio";
    const subtitleText = appConfig.productSubtitle || "ระบบสร้างภาพตารางราคากลางขนส่ง";
    const pageTitle = appConfig.pageTitle || `${titleText} — ตารางราคากลางขนส่ง`;
    const pageDescription = appConfig.pageDescription || subtitleText;

    const titleEl = document.querySelector(".app-header__title");
    const subtitleEl = document.querySelector(".app-header__subtitle");
    const descriptionEl = document.querySelector('meta[name="description"]');

    if (titleEl) titleEl.textContent = titleText;
    if (subtitleEl) subtitleEl.textContent = subtitleText;
    document.title = pageTitle;
    if (descriptionEl) descriptionEl.setAttribute("content", pageDescription);
    if (activeClient) syncWorkspaceSummary();
  }

  function populateClientSelector() {
    const select = $("client-select");
    if (!select || typeof DataStore.getClients !== "function") return;

    const clients = DataStore.getClients();
    select.innerHTML = clients
      .map((client) => `<option value="${client.id}">${client.name}</option>`)
      .join("");
    select.value = typeof DataStore.getActiveClientId === "function"
      ? DataStore.getActiveClientId()
      : clients[0]?.id || "";

    select.addEventListener("change", (e) => {
      const nextClientId = e.target.value;
      if (!nextClientId) return;
      DataStore.setActiveClient(nextClientId);
      refreshStateFromStore();
      applyAppBranding();
      populateRouteList();
      populateOilBandEditor();
      populateRouteDiscountTable();

      const firstRoute = state.routes[0];
      state.selectedRouteId = firstRoute ? firstRoute.id : null;
      if (firstRoute) {
        selectRoute(firstRoute.id);
      } else {
        syncWorkspaceSummary();
        renderPreview();
      }

      showToast(`✓ เปลี่ยนชุดข้อมูลเป็น ${getCurrentClient()?.name || nextClientId}`, "success");
    });
  }

  // ── Route List ────────────────────────────────────────────────────────────
  function populateRouteList() {
    const list = $("route-list");
    if (!list) return;
    list.innerHTML = "";
    state.routes.forEach((route) => {
      const li = document.createElement("li");
      li.dataset.routeId = route.id;
      li.innerHTML = `
        <span class="route-name">${route.name || route.id}</span>
        <span class="route-meta">${getRouteDistanceLabel(route)} · ${route.vehicleType}</span>
      `;
      list.appendChild(li);
    });
  }

  function bindRouteList() {
    const routeList = $("route-list");
    const searchInput = $("search-route");
    if (!routeList || !searchInput) return;

    routeList.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-route-id]");
      if (!li) return;
      selectRoute(li.dataset.routeId);
    });

    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll("#route-list li").forEach((li) => {
        const name = li.textContent.toLowerCase();
        li.style.display = name.includes(q) ? "" : "none";
      });
    });
  }

  function selectRoute(routeId) {
    state.selectedRouteId = routeId;

    // Update active state in list
    document.querySelectorAll("#route-list li").forEach((li) => {
      li.classList.toggle("active", li.dataset.routeId === routeId);
    });

    // Update active state in table
    document.querySelectorAll(".route-discount-row").forEach((row) => {
      row.classList.toggle("active", row.dataset.routeId === routeId);
    });

    syncWorkspaceSummary();
    schedulePreview();
  }

  // ── Pricing Controls ──────────────────────────────────────────────────────
  function bindPricingControls() {
    // Default % ราคากลาง
    $("default-discount").value = PricingEngine.getConfig().defaultAvgPct;

    $("apply-default-discount").addEventListener("click", () => {
      const v = parseFloat($("default-discount").value);
      if (isNaN(v) || v < 0 || v > 100) {
        return showToast("กรุณาระบุค่า 0-100", "error");
      }
      try {
        PricingEngine.setDefaultAvgPct(v);
        PricingEngine.clearAllRouteOverrides();
        PricingEngine.syncOverridesToBandCount(state.oilBands.length);
        populateRouteDiscountTable();
        showToast(`✓ อัพเดต % ราคากลางเป็น ${v}% ให้ทุกเส้นทางแล้ว`, "success");
        schedulePreview();
      } catch (_) {}
    });

    // Reset all custom % ราคากลาง
    $("reset-custom-discounts").addEventListener("click", () => {
      PricingEngine.clearAllRouteOverrides();
      populateRouteDiscountTable();
      showToast("✓ ลบ custom % ราคากลาง ทั้งหมดแล้ว", "success");
      schedulePreview();
    });

    // Rounding mode
    $("rounding-mode").addEventListener("change", (e) => {
      try {
        PricingEngine.setRoundingMode(e.target.value);
        schedulePreview();
      } catch (_) {}
    });

    // Expression
    $("apply-expression").addEventListener("click", () => {
      const expr = $("price-expression").value.trim();
      try {
        PricingEngine.setExpression(expr);
        showToast("✓ Expression อัพเดตแล้ว", "success");
        schedulePreview();
      } catch (err) {
        showToast("✗ Expression ผิดพลาด: " + err.message, "error");
      }
    });
    $("price-expression").value = PricingEngine.getConfig().expression;

    // Build per-route % ราคากลาง table
    populateRouteDiscountTable();
  }

  // ── Route Discount Table ──────────────────────────────────────────────────
  function populateRouteDiscountTable() {
    const tbody = $("route-discount-body");
    if (!tbody) return;
    const cfg = PricingEngine.getConfig();
    const defaultPct = cfg.defaultAvgPct;

    tbody.innerHTML = state.routes.map((route) => {
      const override = cfg.routeOverrides[route.id];
      const isCustom = override !== undefined;
      const pct = isCustom ? override : defaultPct;
      const activeClass = route.id === state.selectedRouteId ? " active" : "";
      const bandCount = state.oilBands.length;
      const expandedPct = isCustom && Array.isArray(override)
        ? PricingEngine.resolveRouteAvgPcts(route.id, bandCount)
        : null;

      let pctStr = "";
      if (Array.isArray(pct)) {
        pctStr = (expandedPct || pct).join(" / ");
      } else {
        pctStr = pct;
      }

      return `
        <tr class="route-discount-row${activeClass}" data-route-id="${route.id}">
          <td class="rd-id">${route.id}</td>
          <td class="rd-type">${route.vehicleType}</td>
          <td class="rd-input">
            <input type="text" class="rd-pct-input" data-route-id="${route.id}"
              value="${pctStr}"
              placeholder="13 หรือ 13 / 30"
              title="ระบุ 1 ค่าเพื่อใช้ทุกช่วง, 2 ค่าเพื่อใช้ค่าทั่วไป/ช่วงสุดท้าย, หรือ ${bandCount} ค่าให้ครบทุกช่วง"
              aria-label="ส่วนลด ${route.id} (%)" />
          </td>
          <td class="rd-badge">
            ${isCustom
              ? '<span class="badge--custom" title="ส่วนลดเฉพาะเส้นทางนี้">C</span>'
              : '<span class="badge--default" title="ใช้ค่า default">D</span>'
            }
          </td>
        </tr>`;
    }).join("");

    // Bind inline editing
    tbody.querySelectorAll(".rd-pct-input").forEach((input) => {
      input.addEventListener("change", (e) => {
        const routeId = e.target.dataset.routeId;
        const text = e.target.value.trim();
        const parts = text.split(/[\/,]+/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
        const bandCount = state.oilBands.length;

        if (parts.length === 0) {
          showToast("กรุณาระบุค่า 0-100", "error");
          populateRouteDiscountTable();
          return;
        }

        let overrideValue;
        if (parts.length === 1) {
          overrideValue = parts[0];
        } else if (parts.length === 2 && bandCount > 1) {
          overrideValue = Array(bandCount).fill(parts[0]);
          overrideValue[bandCount - 1] = parts[1];
        } else if (parts.length === bandCount) {
          overrideValue = parts;
        } else {
          showToast(`ระบุได้ 1 ค่า, 2 ค่า, หรือ ${bandCount} ค่า`, "error");
          populateRouteDiscountTable();
          return;
        }

        try {
          if (Array.isArray(overrideValue)) {
            overrideValue.forEach(v => {
              if (v < 0 || v > 100) throw new RangeError("% ราคากลาง ต้องอยู่ระหว่าง 0-100");
            });
          } else {
            if (overrideValue < 0 || overrideValue > 100) throw new RangeError("% ราคากลาง ต้องอยู่ระหว่าง 0-100");
          }

          PricingEngine.setRouteOverride(routeId, overrideValue);
          populateRouteDiscountTable();
          const refreshedConfig = PricingEngine.getConfig();
          const savedOverride = refreshedConfig.routeOverrides[routeId];
          const displayVal = Array.isArray(overrideValue) ? [...new Set(overrideValue)].join("/") : overrideValue;
          const isUsingDefault = savedOverride === undefined;
          showToast(
            isUsingDefault
              ? `✓ ${routeId} กลับไปใช้ค่า default ${refreshedConfig.defaultAvgPct}% แล้ว`
              : `✓ ${routeId} → ${displayVal}%`,
            "success"
          );
          schedulePreview();
        } catch (err) {
          showToast("✗ " + err.message, "error");
          populateRouteDiscountTable();
        }
      });

      // Select route when clicking input
      input.addEventListener("focus", (e) => {
        const routeId = e.target.dataset.routeId;
        selectRoute(routeId);
      });
    });

    // Click row to select route
    tbody.querySelectorAll(".route-discount-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.tagName === "INPUT") return;
        selectRoute(row.dataset.routeId);
        populateRouteDiscountTable();
      });
    });
  }

  // ── Oil Band Editor ───────────────────────────────────────────────────────
  // เลือกช่วงน้ำมันแบบ "ช่วงเริ่มต้น + จำนวนช่วง" ต่อเนื่องกัน แล้วอัพเดต preview ทันที
  function getBandWindow() {
    const sourceBands = DataStore.getSourceOilBands();
    const selectedIds = DataStore.getSelectedBandIds();
    const firstIndex = sourceBands.findIndex((band) => band.id === selectedIds[0]);
    return {
      sourceBands,
      start: Math.max(firstIndex, 0),
      count: Math.max(selectedIds.length, 1),
    };
  }

  function applyBandWindow(start, count) {
    const sourceBands = DataStore.getSourceOilBands();
    const total = sourceBands.length;
    if (total === 0) return;
    const nextCount = Math.max(1, Math.min(count, total));
    const nextStart = Math.max(0, Math.min(start, total - nextCount));
    DataStore.setSelectedBandIds(
      sourceBands.slice(nextStart, nextStart + nextCount).map((band) => band.id)
    );
    refreshStateFromStore();
    populateOilBandEditor();
    populateRouteDiscountTable();
    schedulePreview();
  }

  function populateOilBandEditor() {
    const container = $("oil-band-editor");
    if (!container) return;

    const { sourceBands, start, count } = getBandWindow();
    const total = sourceBands.length;
    const end = Math.min(start + count, total) - 1;
    const rangeText = state.oilBands.length
      ? `${state.oilBands[0].min.toFixed(2)} – ${state.oilBands[state.oilBands.length - 1].max.toFixed(2)}`
      : "-";
    const gridMarkup = sourceBands
      .map((band, i) => {
        const isSelected = i >= start && i <= end;
        return `
          <button type="button" class="band-cell${isSelected ? " band-cell--selected" : ""}"
            data-index="${i}" aria-pressed="${isSelected}"
            title="เริ่มที่ ${escapeHtml(band.label)}">
            ${isSelected ? `<span class="band-cell__index">${i - start + 1}</span>` : ""}
            <span class="band-cell__min">${band.min.toFixed(2)}</span>
            <span class="band-cell__max">ถึง ${band.max.toFixed(2)}</span>
          </button>`;
      })
      .join("");

    container.innerHTML = `
      <div class="band-summary">
        <span class="band-summary__caption">ช่วงที่จะแสดงในภาพ</span>
        <strong class="band-summary__range">${rangeText} <small>บาท/ลิตร</small></strong>
      </div>
      <div class="band-controls">
        <div class="band-control">
          <span class="band-control__label">เลื่อนช่วง</span>
          <div class="band-control__buttons">
            <button type="button" class="band-step-btn" id="band-shift-down"
              aria-label="เลื่อนลง 1 ช่วง" title="เลื่อนลง 1 ช่วง"${start <= 0 ? " disabled" : ""}>&lsaquo;</button>
            <button type="button" class="band-step-btn" id="band-shift-up"
              aria-label="เลื่อนขึ้น 1 ช่วง" title="เลื่อนขึ้น 1 ช่วง"${end >= total - 1 ? " disabled" : ""}>&rsaquo;</button>
          </div>
        </div>
        <div class="band-control">
          <span class="band-control__label">จำนวนช่วง</span>
          <div class="band-control__buttons">
            <button type="button" class="band-step-btn" id="band-count-down"
              aria-label="ลดจำนวนช่วง"${count <= 1 ? " disabled" : ""}>&minus;</button>
            <span class="band-control__value" aria-live="polite">${count}</span>
            <button type="button" class="band-step-btn" id="band-count-up"
              aria-label="เพิ่มจำนวนช่วง"${end >= total - 1 ? " disabled" : ""}>+</button>
          </div>
        </div>
      </div>
      <div class="band-grid" role="group" aria-label="ช่วงราคาน้ำมันทั้งหมด">${gridMarkup}</div>
    `;

    $("band-shift-down").addEventListener("click", () => applyBandWindow(start - 1, count));
    $("band-shift-up").addEventListener("click", () => applyBandWindow(start + 1, count));
    $("band-count-down").addEventListener("click", () => applyBandWindow(start, count - 1));
    $("band-count-up").addEventListener("click", () => applyBandWindow(start, count + 1));
    container.querySelectorAll(".band-cell").forEach((cell) => {
      cell.addEventListener("click", () => applyBandWindow(Number(cell.dataset.index), count));
    });

    const grid = container.querySelector(".band-grid");
    const firstSelected = container.querySelector(".band-cell--selected");
    if (grid && firstSelected) {
      grid.scrollTop = Math.max(firstSelected.offsetTop - grid.offsetTop - 8, 0);
    }
  }

  // ── Template Controls ─────────────────────────────────────────────────────
  function bindTemplateControls() {
    // Color pickers
    const colorMap = {
      "tmpl-header-bg": "headerBg",
      "tmpl-header-text": "headerText",
      "tmpl-body-bg": "bodyBg",
      "tmpl-body-text": "bodyText",
      "tmpl-price-color": "priceColor",
      "tmpl-accent": "accentColor",
    };
    Object.entries(colorMap).forEach(([elId, tmplKey]) => {
      const el = $(elId);
      if (!el) return;
      el.value = ImageRenderer.getTemplate()[tmplKey];
      el.addEventListener("input", () => {
        ImageRenderer.setTemplate({ [tmplKey]: el.value });
        schedulePreview();
      });
    });

    // Title
    $("tmpl-title").addEventListener("input", (e) => {
      ImageRenderer.setTemplate({ oilSectionTitle: e.target.value });
      schedulePreview();
    });
    $("tmpl-title").value = ImageRenderer.getTemplate().oilSectionTitle;

    // Note
    $("tmpl-note").addEventListener("input", (e) => {
      ImageRenderer.setTemplate({
        referenceDateLabel: "หมายเหตุ",
        referenceDate: e.target.value.trim() || "ระบุข้อความหมายเหตุ",
      });
      schedulePreview();
    });
    $("tmpl-note").value = ImageRenderer.getTemplate().referenceDate;

    // Apply Note button
    $("apply-note").addEventListener("click", () => {
      const note = $("tmpl-note").value.trim();
      ImageRenderer.setTemplate({
        referenceDateLabel: "หมายเหตุ",
        referenceDate: note || "ระบุข้อความหมายเหตุ",
      });
      showToast("✓ อัพเดทหมายเหตุแล้ว", "success");
      schedulePreview();
    });

    // Canvas size
    $("tmpl-width").addEventListener("change", (e) => {
      ImageRenderer.setTemplate({ width: parseInt(e.target.value) || 1270 });
      schedulePreview();
    });
    $("tmpl-height").addEventListener("change", (e) => {
      ImageRenderer.setTemplate({ height: parseInt(e.target.value) || 720 });
      schedulePreview();
    });
    $("tmpl-width").value = ImageRenderer.getTemplate().width;
    $("tmpl-height").value = ImageRenderer.getTemplate().height;

    // Price font size
    $("tmpl-price-size").addEventListener("input", (e) => {
      const v = parseInt(e.target.value);
      $("tmpl-price-size-val").textContent = v + "px";
      ImageRenderer.setTemplate({ priceFontSize: v });
      schedulePreview();
    });
    $("tmpl-price-size-val").textContent = ImageRenderer.getTemplate().priceFontSize + "px";
    $("tmpl-price-size").value = ImageRenderer.getTemplate().priceFontSize;
  }

  // ── Export Controls ───────────────────────────────────────────────────────
  let exportInProgress = false;
  function bindExportControls() {
    $("btn-export").addEventListener("click", async () => {
      if (exportInProgress) return;
      if (!state.selectedRouteId) return showToast("กรุณาเลือก Route ก่อน", "error");
      exportInProgress = true;
      try {
        const routeData = buildRouteData(state.selectedRouteId);
        ImageRenderer.render(canvas, routeData, state.oilBands);
        await ImageRenderer.exportPNG(canvas, `${state.selectedRouteId}.png`);
        showToast(`✓ Export ${state.selectedRouteId}.png`, "success");
      } catch (err) {
        console.error("Export error:", err);
        showToast("✗ Export ล้มเหลว: " + err.message, "error");
      } finally {
        exportInProgress = false;
      }
    });

    $("btn-export-all").addEventListener("click", async () => {
      if (exportInProgress) return;
      exportInProgress = true;
      const exportCanvas = document.createElement("canvas");
      let exportedCount = 0;
      try {
        showToast("⏳ กำลัง export ทั้งหมด...", "info");
        for (const route of state.routes) {
          const routeData = buildRouteData(route.id);
          ImageRenderer.render(exportCanvas, routeData, state.oilBands);
          await ImageRenderer.exportPNG(exportCanvas, `${route.id}.png`);
          exportedCount += 1;
          await new Promise((r) => setTimeout(r, 260));
        }
        showToast(`Export complete: ${exportedCount} routes`, "success");
      } catch (err) {
        console.error("Export all error:", err);
        showToast(`✗ Export ล้มเหลว: ${exportedCount}/${state.routes.length} routes`, "error");
      } finally {
        exportInProgress = false;
      }
    });

    $("btn-refresh").addEventListener("click", () => {
      renderPreview();
    });
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  let previewTimer = null;
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 120);
  }

  function bindPreviewQualityWatchers() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => schedulePreview()).catch(() => {});
    }

    window.addEventListener("load", () => schedulePreview(), { once: true });
    window.addEventListener("resize", () => schedulePreview());

    const stage = canvas.closest(".preview-card__stage") || canvas;
    if ("ResizeObserver" in window) {
      let lastWidth = 0;
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect?.width || 0;
        if (Math.abs(width - lastWidth) < 1) return;
        lastWidth = width;
        schedulePreview();
      });
      observer.observe(stage);
    }
  }

  function buildRouteData(routeId) {
    const route = DataStore.getRouteById(routeId);
    if (!route) return null;
    const computed = PricingEngine.computeForRoute(route);
    return { ...route, ...computed };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      switch (char) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        case "'": return "&#39;";
        default: return char;
      }
    });
  }

  function renderPreview() {
    if (!canvas) return;
    if (!state.selectedRouteId) {
      updatePriceTable(null);
      return;
    }
    const routeData = buildRouteData(state.selectedRouteId);
    if (!routeData) {
      updatePriceTable(null);
      return;
    }

    try {
      ImageRenderer.render(canvas, routeData, state.oilBands, {
        pixelRatio: 2,
        maxPixelRatio: 6,
      });
      updatePriceTable(routeData);
    } catch (err) {
      console.error("Preview render error:", err);
    }
  }

  function updatePriceTable(routeData) {
    const tbody = $("price-preview-table");
    if (!tbody) return;
    if (!routeData) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="data-table__empty">
            เลือกเส้นทางเพื่อดูราคา
          </td>
        </tr>
      `;
      return;
    }
    const unitLabel = escapeHtml(ImageRenderer.getTemplate().unitLabel || "บาท");
    const bp = routeData.basePrices || [];
    const cp = routeData.computedPrices || [];
    tbody.innerHTML = state.oilBands
      .map((band, i) => {
        const bandLabel = escapeHtml(band.label);
        const baseVal = i < bp.length ? bp[i] : 0;
        const compVal = i < cp.length ? cp[i] : 0;
        const basePrice = baseVal.toLocaleString("th-TH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        const computedPrice = compVal.toLocaleString("th-TH");
        return `
      <tr>
        <td>
          <span class="data-table__text" title="${bandLabel}">${bandLabel}</span>
        </td>
        <td>
          <span class="data-table__num" title="${basePrice}">${basePrice}</span>
        </td>
        <td>
          <span class="data-table__price-group" title="${computedPrice} ${unitLabel}">
            <strong class="data-table__value">${computedPrice}</strong>
            <span class="data-table__unit">${unitLabel}</span>
          </span>
        </td>
      </tr>
    `;
      })
      .join("");
  }

  // ── Toast ─────────────────────────────────────────────────────────────────
  function showToast(msg, type = "info") {
    const toast = $("toast");
    toast.textContent = msg;
    toast.className = `toast toast--${type} toast--show`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove("toast--show"), 3000);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", init);
})();
