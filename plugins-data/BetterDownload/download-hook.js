(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.NBDDownloadHook = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
    'use strict';
    function normalize(path) {
        if (typeof path !== 'string') return '';
        const p = path.replace(/\//g, '\\').replace(/\\+$/, '');
        return /^[A-Za-z]:\\.+/.test(p) && !/[\x00-\x1f"<>|*?:]/.test(p.slice(2)) && !/(?:^|\\)\.\.?($|\\)/.test(p) ? p : '';
    }
    function resolveJob(finalPath, downloadRoot) {
        if (typeof finalPath !== 'string' || !/\.ncm$/i.test(finalPath)) return null;
        let source = normalize(finalPath);
        if (!source) {
            const base = normalize(downloadRoot), relative = finalPath.replace(/\//g, '\\');
            if (!base || /^[\\/]/.test(relative) || /:/.test(relative) || /(?:^|\\)\.\.?($|\\)/.test(relative)) return null;
            source = normalize(base + '\\' + relative);
        }
        if (!source) return null;
        const parts = source.split('\\');
        const vip = parts.findIndex(p => p.toLowerCase() === 'vipsongsdownload');
        // Only an actual VipSongsDownload component is accepted, never a similarly named directory.
        if (vip < 1 || vip === parts.length - 1 || parts.slice(vip + 1, -1).some(p => p.toLowerCase() === 'unlock')) return null;
        const output = parts.slice(0, vip + 1).concat('unlock', parts.slice(vip + 1)).join('\\');
        return { source, target: output };
    }
    // The folder a user-requested search covers: VipSongsDownload under the client's download directory.
    function scanRoot(downloadRoot) {
        const base = normalize(downloadRoot);
        return base ? base + '\\VipSongsDownload' : '';
    }
    function findSdk(win) {
        // NetEase 3.x uses webpack 4. Capture only the module cache; do not run client modules.
        const chunks = win.webpackJsonp;
        if (!chunks || !Array.isArray(chunks) || chunks.push === Array.prototype.push) return null;
        const id = 'nbd_observer_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        let loader;
        chunks.push([[id], { [id]: (module, exports, require) => { loader = require; } }, [[id]]]);
        if (!loader || !loader.c) return null;
        try {
            for (const entry of Object.values(loader.c)) {
                const sdk = entry && entry.exports;
                if (sdk && sdk.Bridge && typeof sdk.Bridge.appendRegisterCall === 'function' && typeof sdk.Bridge.removeRegisterCall === 'function' && sdk.Storage && 'downloadDir' in sdk.Storage) return sdk;
            }
            return null;
        } finally { delete loader.c[id]; if (loader.m) delete loader.m[id]; }
    }
    function attach(sdk, onCompleted) {
        const callback = (taskId, code, finalPath) => {
            if (code !== 1 && code !== true) return;
            const job = resolveJob(finalPath, sdk.Storage.downloadDir);
            if (!job) return;
            // Queue asynchronously; never let plugin errors break NetEase's original callbacks.
            Promise.resolve().then(() => onCompleted(Object.assign({ taskId: String(taskId) }, job))).catch(() => {});
        };
        sdk.Bridge.appendRegisterCall('addid3done', 'storage', callback);
        return () => sdk.Bridge.removeRegisterCall('addid3done', 'storage', callback);
    }
    return { findSdk, attach, resolveJob, normalize, scanRoot };
});
