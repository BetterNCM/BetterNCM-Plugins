/* Daily Recommendation History — local metadata only. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BNCMDailyHistoryCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const PREFIX = "bncm.daily-history.v1.";
  const DAYS = 30;
  const SETTINGS_KEY = "bncm.daily-history.settings.v1";
  function validDays(value) { return Number.isSafeInteger(value) && value > 0; }
  function readSettings(storage) {
    const defaults = { autoClear: true, days: DAYS };
    try {
      const value = JSON.parse(storage.getItem(SETTINGS_KEY));
      if (!value || typeof value.autoClear !== "boolean" || !validDays(value.days)) return defaults;
      return { autoClear: value.autoClear, days: value.days };
    } catch (_) { return defaults; }
  }
  function writeSettings(storage, value) {
    if (typeof value.autoClear !== "boolean" || !validDays(value.days)) throw new Error("请输入正整数天数");
    storage.setItem(SETTINGS_KEY, JSON.stringify({ autoClear: value.autoClear, days: value.days }));
  }
  const pad = n => String(n).padStart(2, "0");
  function dateKey(value) {
    const d = new Date(value);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  // The client says daily recommendations refresh at 06:00 local time.
  function recommendationDate(now) {
    const d = new Date(now);
    d.setHours(d.getHours() - 6);
    return dateKey(d);
  }
  function dayNumber(key) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key || "")) return NaN;
    const [y, m, d] = key.split("-").map(Number);
    const value = Date.UTC(y, m - 1, d);
    return new Date(value).toISOString().slice(0, 10) === key ? value / 86400000 : NaN;
  }
  function validUid(uid) { return /^[1-9]\d*$/.test(String(uid || "")); }
  function cloneTracks(tracks) {
    if (!Array.isArray(tracks) || !tracks.length || tracks.length > 500) return [];
    const seen = new Set();
    const result = [];
    for (const track of tracks) {
      if (!track || !/^[1-9]\d*$/.test(String(track.id || "")) || seen.has(String(track.id))) continue;
      const copy = JSON.parse(JSON.stringify(track, (key, value) => {
        // Playback always goes through the client; do not persist audio URLs or credentials.
        if (/^(url|playUrl|downloadUrl|cookie|token|authorization)$/i.test(key)) return undefined;
        return typeof value === "function" ? undefined : value;
      }));
      if (!copy.name || typeof copy.name !== "string") continue;
      seen.add(String(copy.id));
      result.push(copy);
    }
    return result;
  }
  function prune(days, today, limit = DAYS) {
    const current = dayNumber(today);
    if (!Number.isFinite(current)) throw new Error("无效的推荐日期");
    const unique = new Map();
    for (const item of Array.isArray(days) ? days : []) {
      const distance = current - dayNumber(item && item.date);
      if (!Number.isFinite(distance) || distance < 0 || distance >= limit) continue;
      const tracks = cloneTracks(item.tracks);
      if (!tracks.length) continue;
      unique.set(item.date, Object.assign({}, item, { tracks }));
    }
    return Array.from(unique.values()).sort((a, b) => b.date.localeCompare(a.date));
  }
  function mergeDates(server, local) {
    return Array.from(new Set([...(Array.isArray(server) ? server : []), ...local]
      .filter(date => Number.isFinite(dayNumber(date))))).sort().reverse();
  }
  function createArchive(storage, clock, onError) {
    clock = clock || (() => new Date());
    onError = onError || (() => {});
    const retentionLimit = () => {
      const settings = readSettings(storage);
      return settings.autoClear ? settings.days : Infinity;
    };
    function eligible(date, today = recommendationDate(clock())) {
      const age = dayNumber(today) - dayNumber(date);
      return Number.isFinite(age) && age >= 0 && age < retentionLimit();
    }
    function read(uid) {
      if (!validUid(uid)) return { schema: 1, uid: "", days: [] };
      const raw = storage.getItem(PREFIX + uid);
      if (!raw) return { schema: 1, uid: String(uid), days: [] };
      const value = JSON.parse(raw);
      if (!value || value.schema !== 1 || value.uid !== String(uid) || !Array.isArray(value.days)) {
        throw new Error("本地记录格式异常，已停止写入以保护原数据");
      }
      return value;
    }
    function load(uid) {
      try {
        const value = read(uid);
        const days = prune(value.days, recommendationDate(clock()), retentionLimit());
        if (validUid(uid) && JSON.stringify(days) !== JSON.stringify(value.days)) {
          storage.setItem(PREFIX + uid, JSON.stringify(Object.assign({}, value, { days })));
        }
        return days;
      } catch (e) { onError(e); return []; }
    }
    function save(uid, date, tracks, source) {
      if (!validUid(uid)) return false;
      try {
        const normalized = cloneTracks(tracks);
        const today = recommendationDate(clock());
        if (!normalized.length || !eligible(date, today)) return false;
        // Re-read for every write so independent client windows do not overwrite other dates.
        const state = read(uid);
        const days = prune(state.days, today, retentionLimit());
        const old = days.find(item => item.date === date);
        const stamp = new Date(clock()).toISOString();
        const item = { date, firstOpenedAt: old ? old.firstOpenedAt : stamp,
          lastOpenedAt: stamp, source: source || "daily", tracks: normalized };
        const next = [item, ...days.filter(day => day.date !== date)].sort((a, b) => b.date.localeCompare(a.date));
        storage.setItem(PREFIX + uid, JSON.stringify({ schema: 1, uid: String(uid), days: next }));
        return true;
      } catch (e) { onError(e); return false; }
    }
    return { load, save, eligible, get: (uid, date) => load(uid).find(day => day.date === date),
      dates: uid => load(uid).map(day => day.date),
      export: uid => JSON.stringify({ schema: 1, uid: String(uid), days: load(uid) }, null, 2) };
  }
  return { PREFIX, DAYS, SETTINGS_KEY, validDays, readSettings, writeSettings, dateKey, recommendationDate, dayNumber, validUid, cloneTracks, prune, mergeDates, createArchive };
});


(function (root, factory) {
  const core = typeof module === "object" && module.exports ? require("./core.js") : root.BNCMDailyHistoryCore;
  const api = factory(core);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BNCMDailyHistoryAdapter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (Core) {
  "use strict";
  const DAILY = "page:dailyRecommend";
  const HISTORY = "page:historyRecommend";
  const OFFICIAL_HISTORY_LIMIT = 5;
  const isDaily = path => /^\/dailyRecommend\/?$/.test(path || "");
  const isHistory = path => /^\/historyRecommend\/?$/.test(path || "");

  // Capture webpack 4's require without running any of the client's unexecuted modules.
  function captureRequire(win) {
    if (!win.webpackJsonp || !Array.isArray(win.webpackJsonp) || win.webpackJsonp.push === Array.prototype.push) return null;
    let captured = null;
    const id = "bncm-daily-history-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    win.webpackJsonp.push([[id], { [id]: function (module, exports, require) { captured = require; } }, [[id]]]);
    if (captured) { delete captured.m[id]; delete captured.c[id]; }
    return captured;
  }
  function findTool(require) {
    if (!require || !require.c) return null;
    for (const key of Object.keys(require.c)) {
      const exports = require.c[key].exports;
      const values = [exports];
      if (exports && (typeof exports === "object" || typeof exports === "function")) {
        for (const name of Object.keys(exports)) {
          try { values.push(exports[name]); } catch (_) { /* Ignore unrelated getters. */ }
        }
      }
      for (const value of values) {
        if (value && typeof value.getStore === "function" && typeof value.getHistory === "function" &&
          value.app && value.app._store && typeof value.app._store.subscribe === "function") return value;
      }
    }
    return null;
  }
  // The two verified 3.1.42 history effects only use call/put/select. Running them with
  // these helpers lets us merge dates BEFORE the native reducer and renderer see them.
  async function runEffect(effect, action, helpers) {
    const iterator = effect(action, helpers);
    if (!iterator || typeof iterator.next !== "function") throw new Error("历史日推接口结构已变更");
    let step = iterator.next();
    while (!step.done) {
      try { step = iterator.next(await step.value); }
      catch (error) { step = iterator.throw(error); }
    }
    return step.value;
  }
  function attach(tool, archive, options) {
    options = options || {};
    const clock = options.clock || (() => new Date());
    const status = options.status || (() => {});
    const calendar = options.calendar === true;
    const store = tool.app._store;
    const originalDispatch = store.dispatch;
    const history = tool.getHistory();
    let disposed = false;
    let previousUid = String((store.getState().host || {}).uid || "");
    let epoch = 0;
    let availableDates = [];
    const pending = new Map();
    const uid = () => String((store.getState().host || {}).uid || "");
    const path = () => (history.location || {}).pathname || "";
    const sameAccount = (owner, generation) => !disposed && owner === uid() && generation === epoch;
    const send = action => originalDispatch.call(store, action);
    const effectFor = name => {
      const model = (tool.app._models || []).find(model => model.namespace === HISTORY);
      const effects = model && model.effects;
      // Dva prefixes effect keys when it registers the model in the running client.
      let effect = effects && (effects[HISTORY + "/" + name] || effects[name]);
      if (Array.isArray(effect)) effect = effect[0];
      return typeof effect === "function" ? effect : null;
    };
    function snapshot(owner, date, rows, source) {
      if (archive.save(owner, date, rows, source)) status("recorded", { uid: owner, date, count: rows.length });
    }
    function onState() {
      if (disposed) return;
      const owner = uid();
      if (owner !== previousUid) {
        epoch++;
        previousUid = owner;
        availableDates = [];
        archive.load(owner);
        if (store.getState()[HISTORY]) {
          send({ type: HISTORY + "/updateTrackList", payload: { trackList: {} } });
          send({ type: HISTORY + "/updateDates", payload: { dates: [] } });
          send({ type: HISTORY + "/updateCurrentIndex", payload: { currentIndex: 0 } });
        }
        status("account", { uid: owner });
        return;
      }
    }
    function makeHelpers(owner, generation, transformCall, transformPut) {
      return {
        call: (fn, ...args) => Promise.resolve()
          .then(() => sameAccount(owner, generation) ? fn(...args) : undefined)
          .then(transformCall || (value => value)),
        select: selector => selector(store.getState()),
        put: action => {
          if (!sameAccount(owner, generation)) return undefined;
          const prefixed = Object.assign({}, action, { type: action.type.includes("/") ? action.type : HISTORY + "/" + action.type });
          return transformPut ? transformPut(prefixed) : send(prefixed);
        }
      };
    }
    function mergedDates(owner, server) { return Core.mergeDates(server, archive.dates(owner)); }
    function putRows(owner, generation, date, rows) {
      if (!sameAccount(owner, generation)) return;
      const state = store.getState()[HISTORY];
      if (!state) return;
      const index = (state.dates || []).indexOf(date);
      if (index < 0) return;
      const trackList = Object.assign({}, state.trackList || {}, { [index]: rows });
      send({ type: HISTORY + "/updateTrackList", payload: { trackList } });
    }
    function showDates(dates, rows, index) {
      send({ type: HISTORY + "/updateTrackList", payload: { trackList: {} } });
      send({ type: HISTORY + "/updateDates", payload: { dates } });
      send({ type: HISTORY + "/updateTrackList", payload: { trackList: rows } });
      send({ type: HISTORY + "/updateCurrentIndex", payload: { currentIndex: index } });
    }
    async function getDates(action, effect, owner, generation) {
      const before = store.getState()[HISTORY] || {};
      const selectedDate = (before.dates || [])[before.currentIndex || 0];
      const byDate = new Map((before.dates || []).map((date, i) => [date, (before.trackList || {})[i]]));
      let officialDates = [];
      const helpers = makeHelpers(owner, generation,
        server => {
          officialDates = Core.mergeDates(server, []);
          return mergedDates(owner, officialDates);
        },
        action => {
          if (action.type !== HISTORY + "/updateDates") return send(action);
          availableDates = action.payload.dates;
          const dates = calendar
            ? [availableDates.includes(selectedDate) ? selectedDate : availableDates[0]].filter(Boolean)
            : availableDates;
          // Indices change when a new local date is inserted. Never leave old rows at a new date's index.
          const rows = {};
          const localByDate = new Map(archive.load(owner).map(item => [item.date, item]));
          dates.forEach((date, i) => {
            const local = localByDate.get(date);
            if (local) rows[i] = local.tracks;
            else if (byDate.get(date)) rows[i] = byDate.get(date);
          });
          showDates(dates, rows, Math.max(0, dates.indexOf(selectedDate)));
          status("history", { dates: dates.length, local: archive.dates(owner).length });
        });
      let dates;
      try { dates = await runEffect(effect, action, helpers); }
      catch (error) {
        // Offline: show already recorded local dates; no server history is fabricated.
        const dates = mergedDates(owner, []);
        if (!dates.length) throw error;
        helpers.put({ type: "updateDates", payload: { dates } });
        if (sameAccount(owner, generation)) status("offline", { message: String(error.message || error) });
        return dates;
      }
      if (sameAccount(owner, generation) && isHistory(path()) && officialDates.length) {
        runPending(owner, generation, "syncOfficialHistory", "", () => syncOfficialHistory(officialDates, owner, generation));
      }
      return dates;
    }
    async function getSongs(action, effect, owner, generation, source) {
      if (!sameAccount(owner, generation)) return;
      const date = action.payload && action.payload.date;
      const local = archive.get(owner, date);
      if (local) { putRows(owner, generation, date, local.tracks); return; }
      const requestedIndex = action.payload.index;
      const helpers = makeHelpers(owner, generation, null, update => {
        if (update.type !== HISTORY + "/updateTrackList") return send(update);
        const rows = update.payload.trackList[requestedIndex];
        if (Array.isArray(rows) && sameAccount(owner, generation)) {
          snapshot(owner, date, rows, source);
          putRows(owner, generation, date, rows);
        }
      });
      return runEffect(effect, action, helpers);
    }
    function runPending(owner, generation, name, date, run) {
      const key = [owner, generation, name, date].join(":");
      if (pending.has(key)) return pending.get(key);
      const promise = Promise.resolve().then(run);
      pending.set(key, promise);
      promise.then(
        () => pending.delete(key),
        error => {
          pending.delete(key);
          if (sameAccount(owner, generation)) status("error", { message: String(error.message || error) });
        }
      );
      return promise;
    }
    function loadHistorySongs(action, effect, owner, generation, source) {
      return runPending(owner, generation, "getHistorySongs", action.payload.date,
        () => getSongs(action, effect, owner, generation, source));
    }
    async function syncOfficialHistory(officialDates, owner, generation) {
      const effect = effectFor("getHistorySongs");
      if (!effect || !sameAccount(owner, generation)) return;
      const today = Core.recommendationDate(clock());
      const recentDates = officialDates.slice(0, OFFICIAL_HISTORY_LIMIT).filter(date => archive.eligible(date, today));
      const savedDates = new Set(archive.dates(owner));
      const missing = recentDates.filter(date => !savedDates.has(date));
      if (!missing.length) return;
      for (const date of missing) {
        if (!sameAccount(owner, generation)) return;
        const state = store.getState();
        const historyState = state[HISTORY];
        const index = historyState ? historyState.dates.indexOf(date) : -1;
        if (index < 0 && !calendar) continue;
        const action = { type: HISTORY + "/getHistorySongs", payload: { date, index, uid: state.host.uid } };
        try {
          await loadHistorySongs(action, effect, owner, generation, "history-imported");
        } catch (_) {
          // A failed date remains eligible on the next visit. Continue with the other dates.
        }
      }
      if (sameAccount(owner, generation)) {
        const saved = new Set(archive.dates(owner));
        const count = recentDates.filter(date => saved.has(date)).length;
        status("history-synced", { count, total: recentDates.length });
      }
    }
    function dispatch(action) {
      if (disposed || !action || typeof action.type !== "string") return originalDispatch.apply(this, arguments);
      const owner = uid();
      const generation = epoch;
      if (Core.validUid(owner) && isDaily(path()) && action.type === DAILY + "/getDailyRecommend") {
        const requestUid = action.payload && action.payload.uid;
        if (requestUid != null && String(requestUid) !== owner) return originalDispatch.apply(this, arguments);
        const date = Core.recommendationDate(clock());
        const before = (store.getState()[DAILY] || {}).result;
        const result = originalDispatch.apply(this, arguments);
        // Observe the real page request, never request recommendations on a timer.
        // Cached Redux updates, background prefetch and POP restoration do not count.
        return Promise.resolve(result).then(value => {
          const daily = (store.getState()[DAILY] || {}).result;
          if (!(value && value.error) && sameAccount(owner, generation) && daily && daily !== before && daily.page && daily.page.more === false) {
            snapshot(owner, date, daily.records, "daily");
          }
          return value;
        });
      }
      if (Core.validUid(owner) && isHistory(path()) &&
        (action.type === HISTORY + "/getDates" || action.type === HISTORY + "/getHistorySongs")) {
        const requestUid = action.payload && action.payload.uid;
        if (requestUid != null && String(requestUid) !== owner) return Promise.resolve([]);
        const name = action.type.slice(HISTORY.length + 1);
        const effect = effectFor(name);
        if (effect) {
          if (name === "getDates") {
            return runPending(owner, generation, name, "", () => getDates(action, effect, owner, generation));
          }
          if (action.payload) return loadHistorySongs(action, effect, owner, generation, "history-opened");
        }
        status("unsupported", { message: "未找到原生历史日推模型，请重启网易云后再打开历史日推" });
      }
      return originalDispatch.apply(this, arguments);
    }
    store.dispatch = dispatch;
    const unsubscribe = store.subscribe(onState);
    archive.load(uid());
    status("ready", { uid: uid() });
    function selectDate(date) {
      const state = store.getState()[HISTORY];
      if (!state || !isHistory(path()) || !Core.validUid(uid()) || !availableDates.includes(date)) return Promise.resolve(false);
      const owner = uid();
      const generation = epoch;
      const effect = effectFor("getHistorySongs");
      if (!effect) return Promise.resolve(false);
      const previousIndex = (state.dates || []).indexOf(date);
      const index = calendar ? 0 : previousIndex;
      if (calendar && previousIndex < 0) {
        const local = archive.get(owner, date);
        showDates([date], local ? { 0: local.tracks } : {}, 0);
      } else {
        send({ type: HISTORY + "/updateCurrentIndex", payload: { currentIndex: index } });
      }
      return loadHistorySongs({ type: HISTORY + "/getHistorySongs", payload: { date, index, uid: store.getState().host.uid } },
        effect, owner, generation, "history-opened").then(() => sameAccount(owner, generation));
    }
    return { store, history, uid, selectDate, dates: () => availableDates.slice(), dispose() {
      disposed = true;
      unsubscribe();
      if (store.dispatch === dispatch) store.dispatch = originalDispatch;
    } };
  }
  return { DAILY, HISTORY, isDaily, isHistory, captureRequire, findTool, runEffect, attach };
});


(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BNCMDailyHistoryCalendar = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function monthCells(year, month) {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0).getDate();
    return [...Array(first.getDay()).fill(null),
      ...Array.from({ length: last }, (_, i) => new Date(year, month, i + 1))];
  }
  const css = `
    .dh-native-tabs[role="tablist"] { display:none !important }
    .dh-calendar-bar { display:flex; flex-wrap:wrap; align-items:center; gap:4px; margin:4px 0 12px; }
    .dh-calendar-bar button, .dh-calendar button {
      appearance:none; color:inherit; background:none; border:0; font:inherit; cursor:pointer;
    }
    .dh-calendar-bar button { padding:6px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:7px; }
    .dh-calendar-bar button[aria-pressed="true"] { background:rgba(236,65,65,.12); color:#ec4141; font-weight:bold; }
    .dh-calendar-bar button:hover { background:rgba(128,128,128,.12); }
    .dh-calendar { position:fixed; z-index:2147483600; box-sizing:border-box; width:284px; max-width:calc(100vw - 16px);
      max-height:calc(100vh - 16px); overflow:auto; padding:12px; border-radius:8px;
      --dh-surface:#fff; --dh-text:#313138; --dh-muted:#686871; --dh-border:#e8e8ec;
      --dh-hover:#f3f3f5; --dh-saved:#fce8e8; --dh-saved-text:#b82d37; --dh-accent:#cf343e;
      font:13px/1.4 "Microsoft YaHei UI",system-ui,sans-serif; background:var(--dh-surface);
      color:var(--dh-text); border:1px solid var(--dh-border); box-shadow:0 7px 23px rgba(0,0,0,.16); }
    .dh-calendar.dh-dark {
      color-scheme:dark; --dh-surface:#27272b; --dh-text:#e7e7eb; --dh-muted:#a1a1aa; --dh-border:#38383e;
      --dh-hover:#39393f; --dh-saved:#493137; --dh-saved-text:#ffa4a8; --dh-accent:#c9323e; }
    .dh-calendar .dh-month { display:grid; grid-template-columns:24px 24px minmax(0,1fr) 24px 24px; align-items:center;
      text-align:center; gap:2px; margin-bottom:8px; }
    .dh-calendar .dh-month button { font-size:19px; height:28px; padding:0; border-radius:5px; color:var(--dh-muted); }
    .dh-calendar .dh-selectors { display:flex; justify-content:center; gap:4px; min-width:0; }
    .dh-calendar .dh-selectors button, .dh-calendar .dh-panel-title { font-size:13px; font-weight:600; color:inherit; padding:0 5px; white-space:nowrap; }
    .dh-calendar .dh-panel-header { grid-template-columns:28px minmax(0,1fr) 28px; border-bottom:1px solid var(--dh-border); padding-bottom:8px; }
    .dh-calendar .dh-panel-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px 4px; padding:6px 0; }
    .dh-calendar .dh-panel-grid button { height:34px; border-radius:20px; padding:0 3px; white-space:nowrap; }
    .dh-calendar .dh-panel-grid button[aria-pressed="true"] { background:var(--dh-accent); color:#fff; }
    .dh-calendar button:focus-visible { outline:2px solid var(--dh-accent); outline-offset:1px; }
    .dh-calendar .dh-grid { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:2px; text-align:center; justify-items:center; }
    .dh-calendar .dh-week { color:var(--dh-muted); padding:5px 0; }
    .dh-calendar .dh-day { width:30px; height:30px; border-radius:50%; padding:0; }
    .dh-calendar button:not(:disabled):not([aria-pressed="true"]):not([data-saved="true"]):hover { background:var(--dh-hover); }
    .dh-calendar .dh-day[data-saved="true"] { background:var(--dh-saved); color:var(--dh-saved-text); }
    .dh-calendar .dh-day[aria-pressed="true"] { background:var(--dh-accent); color:#fff; }
    .dh-calendar button:disabled { cursor:default; opacity:.35; }
    .dh-calendar .dh-calendar-message { margin:8px 0 0; text-align:center; color:var(--dh-muted); }
    .dh-calendar-legend { font-size:12px; opacity:.75; }
  `;
  function createCalendar({ document, window, dateKey, today, choose }) {
    const make = (tag, text, klass) => {
      const node = document.createElement(tag);
      if (text != null) node.textContent = text;
      if (klass) node.className = klass;
      return node;
    };
    function button(text, label, listener) {
      const node = make("button", text);
      node.type = "button";
      node.setAttribute("aria-label", label);
      node.addEventListener("click", listener);
      return node;
    }
    const style = make("style", css);
    document.head.appendChild(style);
    const bar = make("div", null, "dh-calendar-bar");
    bar.id = "bncm-daily-history-calendar-bar";
    const recent = make("span");
    recent.style.display = "contents";
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("width", "17");
    icon.setAttribute("height", "17");
    icon.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM7 3v4m10-4v4M3 10h18m-13 5h2m4 0h2");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.6");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("fill", "none");
    icon.appendChild(path);
    const label = make("span");
    const picker = button(null, "选择历史日推日期", () => popup ? close(true) : open());
    picker.setAttribute("aria-haspopup", "dialog");
    picker.setAttribute("aria-expanded", "false");
    picker.append(icon, label);
    bar.append(recent, picker);
    let data = { dates: [], saved: [], current: "" };
    let activeTabList = null, popup = null, month = null;
    let panel = "day", decade = 0;
    let picked = "", tentative = "", notice = "", revision = 0, signature = "", popupSignature = "";

    function position() {
      if (!popup) return;
      const bounds = picker.getBoundingClientRect();
      const x = Math.max(8, Math.min(bounds.left, window.innerWidth - popup.offsetWidth - 8));
      const below = bounds.bottom + 6;
      const y = below + popup.offsetHeight <= window.innerHeight - 8
        ? below : Math.max(8, bounds.top - popup.offsetHeight - 6);
      popup.style.left = x + "px";
      popup.style.top = y + "px";
    }
    function outside(event) {
      if (popup && !popup.contains(event.target) && !picker.contains(event.target)) close(false);
    }
    function keydown(event) {
      if (event.key === "Escape" && popup) {
        event.stopPropagation();
        if (panel === "day") close(true);
        else showPanel("day", panel === "year" ? "选择年份" : "选择月份");
      }
    }
    function close(focus) {
      revision++;
      if (!popup) return;
      popup.remove();
      popup = null;
      picker.setAttribute("aria-expanded", "false");
      document.removeEventListener("mousedown", outside, true);
      document.removeEventListener("keydown", keydown, true);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      if (focus && bar.isConnected) picker.focus();
    }
    function open() {
      const start = (picked || data.current || today()).split("-").map(Number);
      month = new Date(start[0], start[1] - 1, 1);
      panel = "day";
      tentative = picked || data.current;
      notice = "";
      popup = make("div", null, "dh-calendar");
      const rgb = window.getComputedStyle(bar).color.match(/\d+(?:\.\d+)?/g);
      if (rgb && rgb.slice(0, 3).map(Number).reduce((sum, v) => sum + v, 0) > 390) popup.classList.add("dh-dark");
      popup.setAttribute("role", "dialog");
      popup.setAttribute("aria-label", "历史日推日历");
      popup.tabIndex = -1;
      document.body.appendChild(popup);
      picker.setAttribute("aria-expanded", "true");
      document.addEventListener("mousedown", outside, true);
      document.addEventListener("keydown", keydown, true);
      window.addEventListener("resize", position);
      window.addEventListener("scroll", position, true);
      renderPopup();
      popup.focus();
    }
    async function selectFromCalendar(date) {
      tentative = date;
      const ticket = ++revision;
      if (!data.dates.includes(date)) {
        notice = "这一天没有日推记录";
        renderPopup(date);
        return;
      }
      notice = "正在读取日推…";
      renderPopup(date);
      try {
        const ok = await choose(date);
        if (ticket !== revision) return;
        if (!ok) throw new Error("这一天的日推暂时无法读取");
        picked = date;
        renderBar();
        close(true);
      } catch (_) {
        if (ticket !== revision) return;
        notice = "这一天的日推暂时无法读取";
        renderPopup(date);
      }
    }
    function showPanel(next, focusLabel) {
      panel = next;
      notice = "";
      if (next === "year") decade = Math.floor(month.getFullYear() / 10) * 10;
      renderPopup();
      focusControl(focusLabel);
    }
    function focusControl(label) {
      const control = popup.querySelector(`[aria-label="${label}"]`);
      if (control && !control.disabled) control.focus();
      else popup.focus();
    }
    function renderPopup(focusDate) {
      if (!popup) return;
      const year = month.getFullYear(), index = month.getMonth();
      const known = new Set(data.saved);
      const available = new Set(data.dates);
      const latest = today();
      const [latestYear, latestMonth] = latest.split("-").map(Number);
      if (panel !== "day") {
        renderSelectionPanel(year, index, latestYear, latestMonth);
        return;
      }
      const monthHeader = make("div", null, "dh-month");
      function goTo(newYear, newIndex, focusLabel) {
        month = new Date(newYear, newIndex, 1);
        notice = "";
        renderPopup();
        focusControl(focusLabel);
      }
      const move = (months, glyph, title) => button(glyph, title, () => {
        goTo(year, index + months, title);
      });
      const prevYear = move(-12, "«", "上一年");
      const prevMonth = move(-1, "‹", "上个月");
      const nextMonth = move(1, "›", "下个月");
      const nextYear = move(12, "»", "下一年");
      prevYear.disabled = year <= 1900;
      prevMonth.disabled = year <= 1900 && index === 0;
      nextMonth.disabled = dateKey(new Date(year, index + 1, 1)).slice(0, 7) > latest.slice(0, 7);
      nextYear.disabled = dateKey(new Date(year + 1, index, 1)).slice(0, 7) > latest.slice(0, 7);
      const selectors = make("div", null, "dh-selectors");
      selectors.append(
        button(year + "年", "选择年份", () => showPanel("year", year + "年")),
        button(index + 1 + "月", "选择月份", () => showPanel("month", index + 1 + "月"))
      );
      monthHeader.append(prevYear, prevMonth, selectors, nextMonth, nextYear);
      const grid = make("div", null, "dh-grid");
      for (const week of "日一二三四五六") grid.appendChild(make("span", week, "dh-week"));
      let focusTarget;
      for (const day of monthCells(year, index)) {
        if (!day) { grid.appendChild(make("span")); continue; }
        const date = dateKey(day);
        const hint = known.has(date) ? "已保存" : available.has(date) ? "官方历史可读取" : "无本地记录";
        const node = button(String(day.getDate()), date + " " + hint, () => selectFromCalendar(date));
        node.className = "dh-day";
        node.dataset.saved = String(known.has(date));
        node.setAttribute("aria-pressed", String(date === tentative));
        if (date === latest) node.setAttribute("aria-current", "date");
        node.disabled = date > latest && !available.has(date);
        grid.appendChild(node);
        if (date === focusDate) focusTarget = node;
      }
      popup.textContent = "";
      popup.append(monthHeader, grid);
      if (notice) {
        const message = make("p", notice, "dh-calendar-message");
        message.setAttribute("role", "status");
        popup.appendChild(message);
      }
      position();
      if (focusTarget) focusTarget.focus();
    }
    function renderSelectionPanel(year, index, latestYear, latestMonth) {
      const yearPanel = panel === "year";
      const header = make("div", null, "dh-month dh-panel-header");
      const move = (direction, title) => button(direction < 0 ? "«" : "»", title, () => {
        if (yearPanel) decade += direction * 10;
        else {
          const destination = year + direction;
          month = new Date(destination, destination === latestYear ? Math.min(index, latestMonth - 1) : index, 1);
        }
        renderPopup();
        focusControl(title);
      });
      const previous = move(-1, yearPanel ? "上一个十年" : "上一年");
      const next = move(1, yearPanel ? "下一个十年" : "下一年");
      previous.disabled = yearPanel ? decade <= 1900 : year <= 1900;
      next.disabled = yearPanel ? decade + 10 > latestYear : year >= latestYear;
      const title = yearPanel
        ? make("strong", `${decade}年 – ${decade + 9}年`, "dh-panel-title")
        : button(year + "年", "切换到年份选择", () => showPanel("year", year + "年"));
      title.classList.add("dh-panel-title");
      header.append(previous, title, next);
      const grid = make("div", null, "dh-panel-grid");
      for (let i = 0; i < (yearPanel ? 10 : 12); i++) {
        const value = yearPanel ? decade + i : i + 1;
        const label = value + (yearPanel ? "年" : "月");
        const node = button(label, label, () => {
          if (yearPanel) {
            const selectedIndex = value === latestYear ? Math.min(index, latestMonth - 1) : index;
            month = new Date(value, selectedIndex, 1);
            showPanel("month", selectedIndex + 1 + "月");
          } else {
            month = new Date(year, value - 1, 1);
            showPanel("day", "选择月份");
          }
        });
        node.disabled = yearPanel ? value > latestYear : year === latestYear && value > latestMonth;
        node.setAttribute("aria-pressed", String(yearPanel ? value === year : i === index));
        grid.appendChild(node);
      }
      popup.textContent = "";
      popup.append(header, grid);
      position();
    }
    function renderBar() {
      const dates = data.dates.slice(0, 5);
      const key = JSON.stringify([dates, data.current, picked]);
      if (key === signature) return;
      signature = key;
      recent.textContent = "";
      const feedback = make("span", "", "dh-calendar-legend");
      feedback.setAttribute("role", "status");
      for (const date of dates) {
        const node = button(date.slice(5).replace("-", "."), date, async () => {
          const failure = "这一天的日推暂时无法读取";
          try { if (!await choose(date)) feedback.textContent = failure; }
          catch (_) { feedback.textContent = failure; }
        });
        node.setAttribute("aria-pressed", String(date === data.current));
        recent.appendChild(node);
      }
      recent.appendChild(feedback);
      label.textContent = picked;
      label.hidden = !picked;
      picker.setAttribute("aria-pressed", String(!!picked && picked === data.current && !dates.includes(picked)));
    }
    function update(next, tabList, fallback) {
      if (next.owner !== data.owner) {
        close(false);
        picked = "";
      }
      data = next;
      if (picked && !data.dates.includes(picked)) picked = "";
      if (activeTabList !== tabList) {
        if (activeTabList) activeTabList.classList.remove("dh-native-tabs");
        activeTabList = tabList;
      }
      if (tabList) {
        if (bar.nextElementSibling !== tabList) tabList.insertAdjacentElement("beforebegin", bar);
        tabList.classList.add("dh-native-tabs");
      } else if (fallback) {
        if (bar.previousElementSibling !== fallback) fallback.insertAdjacentElement("afterend", bar);
      } else {
        close(false);
        bar.remove();
        return;
      }
      renderBar();
      const key = JSON.stringify([data.dates, data.saved]);
      if (popup && key !== popupSignature) renderPopup();
      popupSignature = key;
    }
    function dispose() {
      close(false);
      if (activeTabList) activeTabList.classList.remove("dh-native-tabs");
      style.remove();
      bar.remove();
    }
    return { update, dispose };
  }
  return { monthCells, createCalendar };
});


(function () {
  "use strict";
  const Core = globalThis.BNCMDailyHistoryCore;
  const Adapter = globalThis.BNCMDailyHistoryAdapter;
  const Calendar = globalThis.BNCMDailyHistoryCalendar;
  const INSTANCE = "__bncmDailyHistory30";
  if (globalThis[INSTANCE]) globalThis[INSTANCE].dispose();
  let connection = null;
  let requireFn = null;
  let timer = null;
  let lastError = "";
  let message = "正在连接网易云页面…";
  let picker = null;
  let observer = null;
  let calendarUpdate = null;
  let calendarData = null;
  const configViews = new Set();
  const archive = Core.createArchive(localStorage, () => new Date(), error => {
    lastError = String(error.message || error);
    message = "保存失败：" + lastError;
    console.error("[日推本地记录]", error);
  });
  const labels = {
    ready: "已连接，点开每日推荐后自动记录", recorded: "已记录", history: "已接入原生历史日推",
    account: "已切换账号", offline: "当前显示本地记录（官方历史加载失败）",
    unsupported: "当前页面未适配", error: "读取失败"
  };
  function status(kind, detail) {
    message = labels[kind] || kind;
    if (kind === "recorded") message += ` ${detail.date} · ${detail.count} 首`;
    if (kind === "history-synced") {
      message = `已补存官方历史 ${detail.count}/${detail.total} 天`;
      if (detail.count < detail.total) message += "，下次打开历史日推时重试";
    }
    if (detail && detail.message) message += "：" + detail.message;
    calendarData = null;
    updateViews();
  }
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function currentUid() { return connection ? connection.uid() : ""; }
  function updateViews() {
    const owner = currentUid();
    const settings = Core.readSettings(localStorage);
    let days;
    for (const view of configViews) {
      if (!view.isConnected && view.dataset.connected) { configViews.delete(view); continue; }
      if (view.isConnected) view.dataset.connected = "true";
      if (!days) days = archive.load(owner);
      view.querySelector(".dh-status").textContent = lastError ? "保存失败：" + lastError : message;
      view.querySelector(".dh-account").textContent = Core.validUid(owner)
        ? `当前账号 ${owner} · 已记录 ${days.length} 天` : "等待登录账号";
      const dates = view.querySelector(".dh-dates");
      const summary = days.map(day => `${day.date}　${day.tracks.length} 首`).join("\n");
      if (dates.dataset.summary !== summary) {
        dates.dataset.summary = summary;
        dates.textContent = summary || "暂无本地记录。打开“历史日推”补存最近的官方记录，打开“每日推荐”保存当天歌曲。";
      }
      const settingStatus = view.querySelector(".dh-retention-current");
      settingStatus.textContent = settings.autoClear ? `当前保留最近 ${settings.days} 天` : "自动清除已关闭";
    }
    scheduleCalendar();
  }
  function scheduleCalendar() {
    if (calendarUpdate != null || !picker) return;
    calendarUpdate = window.setTimeout(() => { calendarUpdate = null; updateCalendar(); }, 0);
  }
  function updateCalendar() {
    const existing = document.getElementById("bncm-daily-history-note");
    if (!connection || !Adapter.isHistory((connection.history.location || {}).pathname)) {
      if (existing) existing.remove();
      picker.update({ dates: [], saved: [], current: "", owner: "" }, null, null);
      return;
    }
    const owner = currentUid();
    const today = Core.recommendationDate(new Date());
    if (!calendarData || calendarData.owner !== owner || calendarData.today !== today) {
      calendarData = { owner, today, saved: archive.dates(owner) };
    }
    const state = connection.store.getState()[Adapter.HISTORY] || {};
    const settings = Core.readSettings(localStorage);
    const heading = document.querySelector(".Main_m1pcf2hi .recommend-title") ||
      Array.from(document.querySelectorAll("h1,h2,h3"))
      .find(node => node.textContent.trim() === "历史日推");
    let note = existing;
    if (heading && !note) {
      note = el("span");
      note.id = "bncm-daily-history-note";
      note.style.cssText = "font-size:12px;font-weight:normal;opacity:.65;margin-left:14px;white-space:nowrap";
      heading.insertAdjacentElement("afterend", note);
    }
    const retention = settings.autoClear ? `自动保留 ${settings.days} 天` : "自动清除已关闭";
    const label = `本地已记录 ${calendarData.saved.length} 天 · ${retention}`;
    if (note && note.textContent !== label) note.textContent = label;
    const tabList = document.querySelector("#page_pc_his_daily_recommend .StyledContent_s1vdm44a [role='tablist']");
    picker.update({ ...calendarData, dates: connection.dates(), current: (state.dates || [])[state.currentIndex || 0] || "" },
      tabList, note || heading);
  }
  async function exportRecords(button) {
    const owner = currentUid();
    if (!Core.validUid(owner)) { message = "请先登录网易云账号"; updateViews(); return; }
    try {
      const content = archive.export(owner);
      const base = await betterncm.app.getDataPath();
      const dir = base.replace(/[\\/]$/, "") + "/daily-history-exports";
      if (!(await betterncm.fs.exists(dir))) await betterncm.fs.mkdir(dir);
      const file = `${dir}/daily-history-${owner}-${Core.dateKey(new Date())}.json`;
      if ((await betterncm.fs.writeFileText(file, content)) === false) throw new Error("写入失败");
      button.parentElement.querySelector(".dh-export-path").textContent = "已导出：" + file;
    } catch (error) {
      button.parentElement.querySelector(".dh-export-path").textContent = "导出失败：" + String(error.message || error);
    }
  }
  function config() {
    const view = el("div");
    view.style.cssText = "padding:18px;line-height:1.8;max-width:760px";
    view.appendChild(el("h2", "日推本地记录"));
    const links = el("p");
    for (const [label, url] of [
      ["查看源码", "https://github.com/Etern17y-maker/NCM-daily-recommend-history"],
      ["反馈问题", "https://github.com/Etern17y-maker/NCM-daily-recommend-history/issues"]
    ]) {
      const link = el("a", label);
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.marginRight = "16px";
      link.addEventListener("click", event => {
        if (typeof betterncm !== "undefined" && betterncm.ncm && typeof betterncm.ncm.openUrl === "function") {
          event.preventDefault();
          betterncm.ncm.openUrl(url);
        }
      });
      links.appendChild(link);
    }
    view.appendChild(links);
    const settings = Core.readSettings(localStorage);
    const autoClear = el("input");
    autoClear.type = "checkbox";
    autoClear.checked = settings.autoClear;
    const clearLabel = el("label");
    clearLabel.append(autoClear, el("span", " 自动清除过期本地记录"));
    view.appendChild(clearLabel);
    const days = el("input");
    days.type = "number";
    days.min = "1";
    days.step = "1";
    days.value = settings.days;
    days.style.cssText = "width:100px;margin:0 6px";
    const daysRow = el("div");
    const daysLabel = el("label", "自动保存时长");
    daysLabel.append(days, el("span", "天"));
    daysRow.appendChild(daysLabel);
    view.appendChild(daysRow);
    const save = el("button", "保存设置");
    save.type = "button";
    const result = el("span");
    result.setAttribute("role", "status");
    result.style.marginLeft = "8px";
    const current = el("p", "", "dh-retention-current");
    view.append(save, result, current);
    save.addEventListener("click", () => {
      try {
        lastError = "";
        Core.writeSettings(localStorage, { autoClear: autoClear.checked, days: days.valueAsNumber });
        archive.load(currentUid());
        calendarData = null;
        updateViews();
        refreshHistory();
        result.textContent = lastError ? "设置已保存，清理状态请见下方" : "设置已保存";
      } catch (error) { result.textContent = String(error.message || error); }
    });
    view.appendChild(el("p", "打开“历史日推”会补存最近五个官方历史日期。当天推荐在打开“每日推荐”时保存。"));
    view.appendChild(el("p", "", "dh-status"));
    view.appendChild(el("p", "", "dh-account"));
    const button = el("button", "导出本地记录备份");
    button.style.cssText = "padding:6px 14px;border-radius:6px;cursor:pointer";
    button.addEventListener("click", () => exportRecords(button));
    view.appendChild(button);
    view.appendChild(el("p", "", "dh-export-path"));
    const dates = el("div", "", "dh-dates");
    dates.style.whiteSpace = "pre-line";
    const records = el("details");
    const summary = el("summary", "已保存日期", "dh-dates-summary");
    summary.style.cursor = "pointer";
    records.append(summary, dates);
    view.appendChild(records);
    view.appendChild(el("p", "关闭自动清除后仍会继续保存。启用清除并缩短天数会移除超期本地记录。"));
    configViews.add(view);
    updateViews();
    return view;
  }
  function refreshHistory() {
    if (!connection || !Adapter.isHistory((connection.history.location || {}).pathname)) return;
    Promise.resolve(connection.store.dispatch({ type: Adapter.HISTORY + "/getDates",
      payload: { uid: currentUid() } })).catch(() => {});
  }
  function onStorage(event) {
    if (event.key !== Core.SETTINGS_KEY && event.key !== Core.PREFIX + currentUid()) return;
    calendarData = null;
    updateViews();
    if (event.key === Core.SETTINGS_KEY) refreshHistory();
  }
  function connect() {
    try {
      if (!connection) {
        if (!requireFn) requireFn = Adapter.captureRequire(window);
        const tool = Adapter.findTool(requireFn);
        if (tool) connection = Adapter.attach(tool, archive, { status, calendar: true });
      }
      if (connection) scheduleCalendar();
    } catch (error) {
      status("error", { message: String(error.message || error) });
    }
  }
  function start() {
    if (picker) return;
    picker = Calendar.createCalendar({ document, window, dateKey: Core.dateKey,
      today: () => Core.recommendationDate(new Date()),
      choose: async date => {
        if (!connection) return false;
        try { return await connection.selectDate(date); }
        finally { scheduleCalendar(); }
      }
    });
    observer = new MutationObserver(scheduleCalendar);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("storage", onStorage);
    connect();
    timer = setInterval(connect, 2500);
  }
  globalThis[INSTANCE] = {
    dispose() {
      if (timer) clearInterval(timer);
      if (observer) observer.disconnect();
      if (calendarUpdate != null) window.clearTimeout(calendarUpdate);
      window.removeEventListener("storage", onStorage);
      if (picker) picker.dispose();
      if (connection) connection.dispose();
      const badge = document.getElementById("bncm-daily-history-note");
      if (badge) badge.remove();
      configViews.clear();
    },
    diagnostics() { return { version: "2.2", connected: !!connection, message, error: lastError,
      path: connection ? connection.history.location.pathname : location.pathname,
      localDates: archive.dates(currentUid()), client: "3.1.42 adapter" }; }
  };
  plugin.onLoad(start);
  plugin.onConfig(config);
})();

