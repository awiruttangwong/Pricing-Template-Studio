/**
 * data-store.js — Multi-client Data Source Layer
 *
 * เป้าหมาย:
 * - เก็บ source data ของแต่ละลูกค้าแยกกันอย่างเป็นระเบียบ
 * - ใช้ active client เพียงรายเดียวใน runtime ปัจจุบัน
 * - API เดิมของระบบยังใช้งานได้ โดยจะอิง active client อัตโนมัติ
 *
 * โครงสร้างหลัก:
 * - CLIENT_DATASETS = registry ของข้อมูลต้นฉบับแต่ละลูกค้า
 * - clientStates = runtime state ของแต่ละลูกค้า
 * - selectedBandIds = ช่วงน้ำมันที่เลือกมาแสดงของลูกค้านั้น
 * - routes[].allBasePrices = ราคาจริงครบทุกช่วงของลูกค้านั้น
 */

const DataStore = (() => {
  const appConfig = {
    productName: "Pricing Template Studio",
    productSubtitle: "ระบบสร้างภาพตารางราคากลางขนส่ง",
    pageTitle: "Pricing Template Studio — ตารางราคากลางขนส่ง",
    pageDescription: "Pricing Template Studio — ระบบสร้างภาพตารางราคากลางขนส่ง",
  };

  const DEFAULT_CLIENT_ID = "jt";
  const externalClientDatasets = typeof globalThis !== "undefined" && globalThis.CLIENT_DATASETS_EXT
    ? globalThis.CLIENT_DATASETS_EXT
    : {};

  const CLIENT_DATASETS = {
    jt: {
      id: "jt",
      code: "JT",
      name: "J&T",
      workbookName: "Rate card J&T.xlsx",
      sheetName: "ราคารับ",
      defaultSelectedBandIds: ["b12", "b13", "b14", "b15", "b16"],
      sourceOilBands: [
        { id: "b1", label: "26.01 - 27.00", min: 26.01, max: 27.0 },
        { id: "b2", label: "27.01 - 28.00", min: 27.01, max: 28.0 },
        { id: "b3", label: "28.01 - 29.00", min: 28.01, max: 29.0 },
        { id: "b4", label: "29.01 - 30.00", min: 29.01, max: 30.0 },
        { id: "b5", label: "30.01 - 31.00", min: 30.01, max: 31.0 },
        { id: "b6", label: "31.01 - 32.00", min: 31.01, max: 32.0 },
        { id: "b7", label: "32.01 - 33.00", min: 32.01, max: 33.0 },
        { id: "b8", label: "33.01 - 34.00", min: 33.01, max: 34.0 },
        { id: "b9", label: "34.01 - 35.00", min: 34.01, max: 35.0 },
        { id: "b10", label: "35.01 - 36.00", min: 35.01, max: 36.0 },
        { id: "b11", label: "36.01 - 37.00", min: 36.01, max: 37.0 },
        { id: "b12", label: "37.01 - 38.00", min: 37.01, max: 38.0 },
        { id: "b13", label: "38.01 - 39.00", min: 38.01, max: 39.0 },
        { id: "b14", label: "39.01 - 40.00", min: 39.01, max: 40.0 },
        { id: "b15", label: "40.01 - 41.00", min: 40.01, max: 41.0 },
        { id: "b16", label: "41.01 - 42.00", min: 41.01, max: 42.0 },
        { id: "b17", label: "42.01 - 43.00", min: 42.01, max: 43.0 },
        { id: "b18", label: "43.01 - 44.00", min: 43.01, max: 44.0 },
        { id: "b19", label: "44.01 - 45.00", min: 44.01, max: 45.0 },
        { id: "b20", label: "45.01 - 46.00", min: 45.01, max: 46.0 },
        { id: "b21", label: "46.01 - 47.00", min: 46.01, max: 47.0 },
        { id: "b22", label: "47.01 - 48.00", min: 47.01, max: 48.0 },
        { id: "b23", label: "48.01 - 49.00", min: 48.01, max: 49.0 },
        { id: "b24", label: "49.01 - 50.00", min: 49.01, max: 50.0 },
        { id: "b25", label: "50.01 - 51.00", min: 50.01, max: 51.0 },
        { id: "b26", label: "51.01 - 52.00", min: 51.01, max: 52.0 },
        { id: "b27", label: "52.01 - 53.00", min: 52.01, max: 53.0 },
        { id: "b28", label: "53.01 - 54.00", min: 53.01, max: 54.0 },
        { id: "b29", label: "54.01 - 55.00", min: 54.01, max: 55.0 },
      ],
      routes: [
        {
          id: "PTE_D-UDN",
          name: "PTE_D-UDN",
          sourceName: "PTE_D-UDN D",
          origin: "PTE_D",
          destination: "UDN",
          distance: 544,
          vehicleType: "6WD7.5",
          allBasePrices: [8540, 8690, 8845, 9000, 9160, 9320, 9485, 9650, 9820, 9990, 10165, 10345, 10525, 10710, 10840, 10970, 11100, 11230, 11360, 11490, 11620, 11750, 11880, 12010, 12140, 12270, 12400, 12530, 12660],
        },
        {
          id: "PTE_D-UBN",
          name: "PTE_D-UBN",
          sourceName: "PTE_D-UBN D",
          origin: "PTE_D",
          destination: "UBN",
          distance: 554,
          vehicleType: "6WD7.5",
          allBasePrices: [8820, 8975, 9135, 9300, 9465, 9630, 9800, 9970, 10145, 10325, 10505, 10690, 10875, 11065, 11200, 11335, 11470, 11605, 11740, 11875, 12010, 12145, 12280, 12415, 12550, 12685, 12820, 12955, 13090],
        },
        {
          id: "AYA-PLK-6W",
          name: "AYA-PLK",
          sourceName: "AYA-PLK",
          origin: "AYA",
          destination: "PLK",
          distance: 349,
          vehicleType: "6WD7.5/6WD9.6",
          allBasePrices: [5775, 5880, 5985, 6090, 6200, 6310, 6420, 6530, 6645, 6760, 6880, 7000, 7125, 7250, 7335, 7420, 7505, 7590, 7675, 7760, 7845, 7930, 8015, 8100, 8185, 8270, 8355, 8440, 8525],
        },
        {
          id: "AYA-PLK-14W",
          name: "AYA-PLK",
          sourceName: "AYA-PLK",
          origin: "AYA",
          destination: "PLK",
          distance: 349,
          vehicleType: "14WD Full Trailer",
          allBasePrices: [8945, 9105, 9265, 9430, 9600, 9770, 9940, 10115, 10290, 10470, 10655, 10840, 11030, 11225, 11360, 11495, 11630, 11765, 11900, 12035, 12170, 12305, 12440, 12575, 12710, 12845, 12980, 13115, 13250],
        },
        {
          id: "BKK_D2-CMI",
          name: "BKK_D2-CMI",
          sourceName: "BKK_D2",
          origin: "BKK_D2",
          destination: "CMI",
          distance: 681,
          vehicleType: "14WD Full Trailer",
          allBasePrices: [17710, 18025, 18345, 18670, 19000, 19335, 19675, 20020, 20370, 20725, 21090, 21460, 21835, 22215, 22480, 22745, 23010, 23275, 23540, 23805, 24070, 24335, 24600, 24865, 25130, 25395, 25660, 25925, 26190],
        },
        {
          id: "SPK-CMI",
          name: "SPK-CMI",
          sourceName: "SPK-CMI",
          origin: "SPK",
          destination: "CMI",
          distance: 696,
          vehicleType: "14WD Full Trailer",
          allBasePrices: [17330, 17640, 17955, 18275, 18600, 18925, 19255, 19590, 19935, 20285, 20640, 21000, 21370, 21745, 22005, 22265, 22525, 22785, 23045, 23305, 23565, 23825, 24085, 24345, 24605, 24865, 25125, 25385, 25645],
        },
        {
          id: "BKK_D5-PLK",
          name: "BKK_D5-PLK",
          sourceName: "BKK_D5-PLK",
          origin: "BKK_D5",
          destination: "PLK",
          distance: 398,
          vehicleType: "6WD7.5/6WD9.6",
          allBasePrices: [6615, 6735, 6855, 6975, 7100, 7225, 7350, 7480, 7610, 7745, 7880, 8020, 8160, 8305, 8405, 8505, 8605, 8705, 8805, 8905, 9005, 9105, 9205, 9305, 9405, 9505, 9605, 9705, 9805],
        },
        {
          id: "CMI-RYG",
          name: "CMI-RYG",
          sourceName: "CMI-RYG_D1",
          origin: "CMI",
          destination: "RYG",
          distance: 804,
          vehicleType: "6WD7.5/6WD9.6",
          allBasePrices: [9130, 9295, 9460, 9630, 9800, 9970, 10145, 10325, 10505, 10690, 10875, 11065, 11260, 11455, 11590, 11725, 11860, 11995, 12130, 12265, 12400, 12535, 12670, 12805, 12940, 13075, 13210, 13345, 13480],
        },
      ],
    },
    ...externalClientDatasets,
  };

  let activeClientId = DEFAULT_CLIENT_ID;

  function cloneBand(band) {
    return { ...band };
  }

  function cloneRoute(route) {
    return { ...route, allBasePrices: [...route.allBasePrices] };
  }

  function cloneClientMeta(client) {
    return {
      id: client.id,
      code: client.code,
      name: client.name,
      workbookName: client.workbookName,
      sheetName: client.sheetName,
    };
  }

  function validateRoute(route, index) {
    if (!route || typeof route !== "object") {
      throw new Error(`Route at index ${index} is not a valid object`);
    }
    if (!route.id || typeof route.id !== "string") {
      throw new Error(`Route at index ${index} missing required field: id`);
    }
    if (!route.name && !route.sourceName) {
      console.warn(`DataStore: Route "${route.id}" has no name or sourceName`);
    }
    if (!Array.isArray(route.allBasePrices) || route.allBasePrices.length === 0) {
      throw new Error(`Route "${route.id}" missing required field: allBasePrices (must be non-empty array)`);
    }
    if (typeof route.vehicleType !== "string") {
      console.warn(`DataStore: Route "${route.id}" missing vehicleType`);
    }
  }

  function validateClientDataset(dataset, clientId) {
    if (!dataset || typeof dataset !== "object") {
      throw new Error(`Client dataset "${clientId}" is not a valid object`);
    }
    if (!dataset.id || typeof dataset.id !== "string") {
      throw new Error(`Client dataset "${clientId}" missing required field: id`);
    }
    if (!dataset.name || typeof dataset.name !== "string") {
      throw new Error(`Client dataset "${clientId}" missing required field: name`);
    }
    if (!Array.isArray(dataset.sourceOilBands) || dataset.sourceOilBands.length === 0) {
      throw new Error(`Client dataset "${clientId}" missing required field: sourceOilBands (must be non-empty array)`);
    }
    if (!Array.isArray(dataset.routes) || dataset.routes.length === 0) {
      throw new Error(`Client dataset "${clientId}" missing required field: routes (must be non-empty array)`);
    }
    if (!Array.isArray(dataset.defaultSelectedBandIds) || dataset.defaultSelectedBandIds.length === 0) {
      console.warn(`DataStore: Client "${clientId}" missing defaultSelectedBandIds, will use all bands`);
    }
  }

  function validateRouteBandLengths(dataset, clientId) {
    const bandCount = dataset.sourceOilBands.length;
    dataset.routes.forEach((route, i) => {
      if (Array.isArray(route.allBasePrices) && route.allBasePrices.length !== bandCount) {
        console.warn(
          `DataStore: Client "${clientId}" route "${route.id}" has ${route.allBasePrices.length} basePrices but ${bandCount} sourceOilBands. Prices may be truncated or padded.`
        );
      }
    });
  }

  function normalizeBandLabel(label) {
    return `${label ?? ""}`.replace(/\s+/g, " ").replace(/\s*-\s*/g, " - ").trim();
  }

  function parseBandLabel(label) {
    const normalized = normalizeBandLabel(label);
    const match = normalized.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
    if (match) {
      return {
        min: parseFloat(match[1]),
        max: parseFloat(match[2]),
      };
    }

    const singleValueMatch = normalized.match(/^(\d+\.?\d*)$/);
    if (singleValueMatch) {
      const min = parseFloat(singleValueMatch[1]);
      return {
        min,
        max: Number((min + 0.99).toFixed(2)),
      };
    }

    return { min: 0, max: 0 };
  }

  function createClientState(dataset) {
    dataset.routes.forEach((route, i) => validateRoute(route, i));
    validateRouteBandLengths(dataset, dataset.id);
    return {
      meta: cloneClientMeta(dataset),
      sourceOilBands: dataset.sourceOilBands.map(cloneBand),
      routes: dataset.routes.map(cloneRoute),
      selectedBandIds: [...(dataset.defaultSelectedBandIds || dataset.sourceOilBands.map((b) => b.id))],
      defaultSelectedBandIds: [...(dataset.defaultSelectedBandIds || dataset.sourceOilBands.map((b) => b.id))],
      bandIdCounter: dataset.sourceOilBands.length,
    };
  }

  const clientStates = Object.fromEntries(
    Object.entries(CLIENT_DATASETS).map(([clientId, dataset]) => {
      try {
        validateClientDataset(dataset, clientId);
        return [clientId, createClientState(dataset)];
      } catch (err) {
        console.error(`DataStore: Failed to initialize client "${clientId}":`, err.message);
        return null;
      }
    }).filter(Boolean)
  );

  function getClientState(clientId = activeClientId) {
    return clientStates[clientId] || null;
  }

  function requireClientState(clientId = activeClientId) {
    const state = getClientState(clientId);
    if (!state) throw new Error(`Unknown client: ${clientId}`);
    return state;
  }

  function getSourceBandIndexById(state, id) {
    return state.sourceOilBands.findIndex((band) => band.id === id);
  }

  function getSourceBandById(state, id) {
    return state.sourceOilBands.find((band) => band.id === id) || null;
  }

  function findSourceBandByLabel(state, label) {
    const normalized = normalizeBandLabel(label);
    return state.sourceOilBands.find((band) => normalizeBandLabel(band.label) === normalized) || null;
  }

  function getSelectedBandIndexes(state) {
    return state.selectedBandIds
      .map((bandId) => getSourceBandIndexById(state, bandId))
      .filter((index) => index >= 0);
  }

  function projectRoute(state, route) {
    const indexes = getSelectedBandIndexes(state);
    return {
      id: route.id,
      name: route.name,
      sourceName: route.sourceName,
      origin: route.origin,
      destination: route.destination,
      distance: route.distance,
      vehicleType: route.vehicleType,
      basePrices: indexes.map((index) => route.allBasePrices[index] ?? 0),
    };
  }

  function estimateInsertedPrice(priceList, insertIndex) {
    if (priceList.length === 0) return 0;
    if (insertIndex <= 0) return priceList[0];
    if (insertIndex >= priceList.length) {
      if (priceList.length === 1) return priceList[0];
      const last = priceList[priceList.length - 1];
      const prev = priceList[priceList.length - 2];
      return Math.round(last + (last - prev));
    }
    return Math.round((priceList[insertIndex - 1] + priceList[insertIndex]) / 2);
  }

  function nextBandId(state) {
    state.bandIdCounter += 1;
    return `b${state.bandIdCounter}`;
  }

  function createCustomBand(state, definition) {
    const parsed = parseBandLabel(definition.label);
    const band = {
      id: definition.id || nextBandId(state),
      label: normalizeBandLabel(definition.label),
      min: definition.min !== undefined ? definition.min : parsed.min,
      max: definition.max !== undefined ? definition.max : parsed.max,
    };

    let insertIndex = state.sourceOilBands.findIndex((item) => band.min < item.min);
    if (insertIndex === -1) insertIndex = state.sourceOilBands.length;

    state.sourceOilBands.splice(insertIndex, 0, band);
    state.routes.forEach((route) => {
      const newPrice = estimateInsertedPrice(route.allBasePrices, insertIndex);
      route.allBasePrices.splice(insertIndex, 0, newPrice);
    });

    return band;
  }

  function ensureSourceBand(state, definition) {
    if (definition.id) {
      const byId = getSourceBandById(state, definition.id);
      if (byId) return byId;
    }

    if (definition.label) {
      const byLabel = findSourceBandByLabel(state, definition.label);
      if (byLabel) return byLabel;
    }

    return createCustomBand(state, definition);
  }

  function dedupeIds(ids) {
    const seen = new Set();
    return ids.filter((id) => {
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function setSelectedBandIdsForClient(clientId, ids) {
    const state = requireClientState(clientId);
    const resolvedIds = dedupeIds(ids).filter((id) => getSourceBandById(state, id));
    state.selectedBandIds = resolvedIds.length > 0 ? resolvedIds : [...state.defaultSelectedBandIds];
    return state.selectedBandIds
      .map((id) => getSourceBandById(state, id))
      .filter(Boolean)
      .map(cloneBand);
  }

  function setSelectedBandsByLabelsForClient(clientId, labels) {
    const state = requireClientState(clientId);
    const ids = labels
      .map((label) => findSourceBandByLabel(state, label))
      .filter(Boolean)
      .map((band) => band.id);
    return setSelectedBandIdsForClient(clientId, ids);
  }

  function getProjectedRoutesForClient(clientId = activeClientId) {
    const state = requireClientState(clientId);
    return state.routes.map((route) => projectRoute(state, route));
  }

  function getActiveClientMeta() {
    return cloneClientMeta(requireClientState().meta);
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    getAppConfig: () => ({ ...appConfig }),

    // Client registry
    getClients: () => Object.values(clientStates).map((state) => cloneClientMeta(state.meta)),
    getActiveClientId: () => activeClientId,
    getActiveClient: () => getActiveClientMeta(),
    setActiveClient: (clientId) => {
      requireClientState(clientId);
      activeClientId = clientId;
      PricingEngine.clearAllRouteOverrides();
      return getActiveClientMeta();
    },
    registerClient: (dataset) => {
      if (!dataset || !dataset.id) {
        throw new Error("registerClient: dataset must have an id");
      }
      validateClientDataset(dataset, dataset.id);
      clientStates[dataset.id] = createClientState(dataset);
      return cloneClientMeta(clientStates[dataset.id].meta);
    },
    unregisterClient: (clientId) => {
      if (clientId === activeClientId) {
        throw new Error("Cannot unregister the active client");
      }
      delete clientStates[clientId];
    },

    // Source dataset — full payload ของ active client
    getSourceOilBands: () => requireClientState().sourceOilBands.map(cloneBand),
    getSourceRoutes: () => requireClientState().routes.map(cloneRoute),
    getSourceRouteById: (id) => {
      const state = requireClientState();
      const route = state.routes.find((item) => item.id === id);
      return route ? cloneRoute(route) : null;
    },
    getAvailableOilBands: () => {
      const state = requireClientState();
      const selectedIds = new Set(state.selectedBandIds);
      return state.sourceOilBands
        .filter((band) => !selectedIds.has(band.id))
        .map(cloneBand);
    },

    // Display bands — subset ของ active client
    getSelectedBandIds: () => [...requireClientState().selectedBandIds],
    getOilBands: () => requireClientState().selectedBandIds
      .map((id) => getSourceBandById(requireClientState(), id))
      .filter(Boolean)
      .map(cloneBand),
    getOilBandCount: () => requireClientState().selectedBandIds.length,
    setSelectedBandIds: (ids) => setSelectedBandIdsForClient(activeClientId, ids),
    setSelectedBandsByLabels: (labels) => setSelectedBandsByLabelsForClient(activeClientId, labels),

    // Backward-compatible API
    setOilBands: (bands) => {
      const state = requireClientState();
      const nextIds = bands.map((band) => ensureSourceBand(state, band).id);
      return setSelectedBandIdsForClient(activeClientId, nextIds);
    },

    addOilBand: (label, index) => {
      const state = requireClientState();
      const band = ensureSourceBand(state, { label });
      const insertIndex = index !== undefined && index >= 0 && index <= state.selectedBandIds.length
        ? index
        : state.selectedBandIds.length;
      const nextIds = [...state.selectedBandIds];
      const existingIndex = nextIds.indexOf(band.id);
      if (existingIndex !== -1) nextIds.splice(existingIndex, 1);
      nextIds.splice(insertIndex, 0, band.id);
      setSelectedBandIdsForClient(activeClientId, nextIds);
      return cloneBand(band);
    },

    removeOilBand: (id) => {
      const state = requireClientState();
      const nextIds = state.selectedBandIds.filter((bandId) => bandId !== id);
      if (nextIds.length === state.selectedBandIds.length) return false;
      setSelectedBandIdsForClient(activeClientId, nextIds);
      return true;
    },

    updateOilBand: (id, updates) => {
      const state = requireClientState();
      const selectedIndex = state.selectedBandIds.findIndex((bandId) => bandId === id);
      if (selectedIndex === -1) return null;

      const currentBand = getSourceBandById(state, id);
      if (!currentBand) return null;

      if (updates.label !== undefined) {
        const matchedBand = findSourceBandByLabel(state, updates.label);
        if (matchedBand && matchedBand.id !== id) {
          const nextIds = [...state.selectedBandIds];
          nextIds[selectedIndex] = matchedBand.id;
          setSelectedBandIdsForClient(activeClientId, nextIds);
          return cloneBand(matchedBand);
        }
      }

      if (updates.label !== undefined) {
        currentBand.label = normalizeBandLabel(updates.label);
        const parsed = parseBandLabel(updates.label);
        currentBand.min = parsed.min;
        currentBand.max = parsed.max;
      }
      if (updates.min !== undefined) currentBand.min = updates.min;
      if (updates.max !== undefined) currentBand.max = updates.max;
      return cloneBand(currentBand);
    },

    moveOilBand: (id, newIndex) => {
      const state = requireClientState();
      const oldIndex = state.selectedBandIds.findIndex((bandId) => bandId === id);
      if (oldIndex === -1) return false;
      const boundedIndex = Math.max(0, Math.min(newIndex, state.selectedBandIds.length - 1));
      const nextIds = [...state.selectedBandIds];
      const [bandId] = nextIds.splice(oldIndex, 1);
      nextIds.splice(boundedIndex, 0, bandId);
      setSelectedBandIdsForClient(activeClientId, nextIds);
      return true;
    },

    // Routes — projected for active client
    getRoutes: () => getProjectedRoutesForClient(activeClientId),
    getRouteById: (id) => {
      const state = requireClientState();
      const route = state.routes.find((item) => item.id === id);
      return route ? projectRoute(state, route) : null;
    },
  };
})();

if (typeof module !== "undefined") module.exports = DataStore;
