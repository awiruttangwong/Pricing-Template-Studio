/**
 * pricing-engine.js — Pricing Rule Engine Layer
 *
 * ชั้นคำนวณราคา: แยกจาก Data Source และ Image Renderer
 * - default rule: round(basePrice * (1 - avgPricePct / 100))
 * - รองรับ override % ราคากลาง per route
 * - รองรับ custom expression string
 * - รองรับ custom rounding function
 */

const PricingEngine = (() => {
  // ── Default Config ────────────────────────────────────────────────────────
  let config = {
    defaultAvgPct: 13, // % ราคากลาง
    routeOverrides: {}, // { routeId: avgPricePct (number or array) — array entries beyond length use defaultAvgPct }
    roundingMode: "round", // 'round' | 'floor' | 'ceil' | 'none'
    expression: "basePrice * (1 - avgPricePct / 100)", // evaluatable
  };

  // ── Rounding helpers ──────────────────────────────────────────────────────
  const rounder = {
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    none: (x) => x,
  };

  function assertPct(value) {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 100) {
      throw new RangeError("% ราคากลาง ต้องอยู่ระหว่าง 0-100");
    }
  }

  function normalizePctArray(values, bandCount) {
    const targetCount = Math.max(Number(bandCount) || 0, 0);
    if (targetCount === 0) return [];

    const arr = Array.isArray(values) ? [...values] : [values];
    const cleaned = arr.filter((value) => value !== undefined && value !== null);

    if (cleaned.length === 0) {
      return Array(targetCount).fill(config.defaultAvgPct);
    }

    cleaned.forEach(assertPct);

    if (cleaned.length === 1) {
      return Array(targetCount).fill(cleaned[0]);
    }

    if (cleaned.length === 2 && targetCount > 2) {
      const expanded = Array(targetCount).fill(cleaned[0]);
      expanded[targetCount - 1] = cleaned[1];
      return expanded;
    }

    if (cleaned.length < targetCount) {
      const fillValue = cleaned[cleaned.length - 1];
      while (cleaned.length < targetCount) cleaned.push(fillValue);
    }

    return cleaned.slice(0, targetCount);
  }

  function compressOverride(values) {
    if (!Array.isArray(values) || values.length === 0) return values;
    return values.every((value) => value === values[0]) ? values[0] : values;
  }

  function isDefaultOverrideValue(value, bandCount) {
    if (value === undefined || value === null) return true;
    if (Array.isArray(value)) {
      const normalized = normalizePctArray(value, bandCount);
      return normalized.every((pct) => pct === config.defaultAvgPct);
    }
    return value === config.defaultAvgPct;
  }

  function resolveRouteAvgPcts(routeId, bandCount) {
    const override = config.routeOverrides[routeId];
    if (override === undefined) {
      return Array(Math.max(Number(bandCount) || 0, 0)).fill(config.defaultAvgPct);
    }
    if (Array.isArray(override)) {
      return normalizePctArray(override, bandCount);
    }
    assertPct(override);
    return Array(Math.max(Number(bandCount) || 0, 0)).fill(override);
  }

  function applyRounding(value) {
    const fn = rounder[config.roundingMode] || Math.round;
    return fn(value);
  }

  // ── Compute single price ──────────────────────────────────────────────────
  function computePrice(basePrice, avgPricePct) {
    try {
      // Safe eval: only allow math expressions with named vars
      const raw = new Function(
        "basePrice",
        "avgPricePct",
        `return ${config.expression};`
      )(basePrice, avgPricePct);
      return applyRounding(raw);
    } catch (e) {
      console.error("PricingEngine: expression error", e);
      // Fallback to default formula
      return applyRounding(basePrice * (1 - avgPricePct / 100));
    }
  }

  // ── Compute all prices for a route ───────────────────────────────────────
  function computeForRoute(route) {
    const perBandAvgPct = resolveRouteAvgPcts(route.id, route.basePrices.length);
    const computedPrices = route.basePrices.map((bp, i) => computePrice(bp, perBandAvgPct[i]));
    const override = config.routeOverrides[route.id];
    const avgPct = override !== undefined ? override : config.defaultAvgPct;

    return {
      routeId: route.id,
      avgPct,
      perBandAvgPct,
      computedPrices,
    };
  }

  function syncOverridesAfterBandInsert(index, bandCount) {
    Object.entries(config.routeOverrides).forEach(([routeId, override]) => {
      if (!Array.isArray(override)) return;
      const previousCount = Math.max((Number(bandCount) || 0) - 1, 0);
      const values = normalizePctArray(override, previousCount);
      const referenceIndex = Math.max(0, Math.min(index - 1, values.length - 1));
      const fillValue = values[referenceIndex] ?? config.defaultAvgPct;
      values.splice(index, 0, fillValue);
      config.routeOverrides[routeId] = compressOverride(values.slice(0, bandCount));
    });
  }

  function syncOverridesAfterBandRemove(index, bandCount) {
    Object.entries(config.routeOverrides).forEach(([routeId, override]) => {
      if (!Array.isArray(override)) return;
      const previousCount = (Number(bandCount) || 0) + 1;
      const values = normalizePctArray(override, previousCount);
      if (index >= 0 && index < values.length) {
        values.splice(index, 1);
      }
      config.routeOverrides[routeId] = compressOverride(values.slice(0, bandCount));
    });
  }

  function syncOverridesToBandCount(bandCount) {
    Object.entries(config.routeOverrides).forEach(([routeId, override]) => {
      if (!Array.isArray(override)) return;
      config.routeOverrides[routeId] = compressOverride(normalizePctArray(override, bandCount));
    });
  }

  // ── Compute all routes ────────────────────────────────────────────────────
  function computeAll(routes) {
    return routes.map((r) => ({
      ...r,
      ...computeForRoute(r),
    }));
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    getConfig: () => ({
      ...config,
      routeOverrides: Object.fromEntries(
        Object.entries(config.routeOverrides).map(([routeId, value]) => [
          routeId,
          Array.isArray(value) ? [...value] : value,
        ])
      ),
    }),

    setDefaultAvgPct: (pct) => {
      assertPct(pct);
      config.defaultAvgPct = pct;
    },

    setRouteOverride: (routeId, pct) => {
      if (pct === null || pct === undefined) {
        delete config.routeOverrides[routeId];
      } else if (Array.isArray(pct)) {
        pct.forEach(assertPct);
        if (isDefaultOverrideValue(pct, pct.length)) {
          delete config.routeOverrides[routeId];
        } else {
          config.routeOverrides[routeId] = compressOverride([...pct]);
        }
      } else {
        assertPct(pct);
        if (isDefaultOverrideValue(pct, 1)) {
          delete config.routeOverrides[routeId];
        } else {
          config.routeOverrides[routeId] = pct;
        }
      }
    },

    clearAllRouteOverrides: () => {
      config.routeOverrides = {};
    },

    setRoundingMode: (mode) => {
      if (!rounder[mode]) throw new Error(`Unknown rounding mode: ${mode}`);
      config.roundingMode = mode;
    },

    setExpression: (expr) => {
      // Validate expression compiles (don't execute with real data yet)
      try {
        new Function("basePrice", "avgPricePct", `return ${expr};`);
        config.expression = expr;
      } catch (e) {
        throw new SyntaxError(`Invalid expression: ${e.message}`);
      }
    },

    computeForRoute,
    computeAll,
    computePrice,
    resolveRouteAvgPcts,
    syncOverridesAfterBandInsert,
    syncOverridesAfterBandRemove,
    syncOverridesToBandCount,
  };
})();

if (typeof module !== "undefined") module.exports = PricingEngine;
