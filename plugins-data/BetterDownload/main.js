/* global plugin, betterncm, betterncm_native */
(() => {
    'use strict';
    const KEY = '__ncmBetterDownload';
    if (window[KEY]) window[KEY].dispose();
    const hook = window.NBDDownloadHook;
    const base = plugin.pluginPath.replace(/[\\/]$/, '');
    const session = Date.now().toString(36) + Math.random().toString(36).slice(2);
    // Downloads finishing within this gap of each other count as one round on the card.
    const ROUND_GAP = 15000, MAX_JOBS = 1000;
    let enabled = plugin.getConfig('enabled', true);
    // The progress card: when it pops up (every song, errors only, never), whether it is compact, and how long it stays.
    let notify = plugin.getConfig('notify', 'all'), compact = plugin.getConfig('cardStyle', 'standard') === 'compact', stay = Number(plugin.getConfig('cardStay', 4000));
    if (!['all', 'errors', 'off'].includes(notify)) notify = 'all';
    if (![2000, 4000, 6000].includes(stay)) stay = 4000;
    let stateDir = '', runtimeDir = '', controlPath = '', statusPath = '', workerPath = '', initialized = false;
    let disposed = false, busy = false, timer, detach = null, sdk = null, card = null, view = null;
    let jobs = [], serial = 0, status = null, error = '', errorAt = 0, problem = '', hint = '';
    let lastLaunch = 0, launchedAt = 0, lastWrite = 0, nextHook = 0, hookDelay = 2000;
    let writes = Promise.resolve(), links = {}, lastTaskKey = '', shown = null;
    let converted = 0, failed = 0, round = null, scan = null, scanNote = '';
    const covers = new Map();
    const mine = () => !!status && status.session === session;
    const running = () => mine() && Date.now() - status.heartbeat < 6000 && status.state !== 'stopped';
    const wanted = () => enabled && (jobs.length > 0 || !!scan);
    const folderOf = file => hook.normalize(file || '').replace(/\\[^\\]+$/, '');
    function reportError(e) { error = e.message || String(e); errorAt = Date.now(); render(); }
    function render() {
        if (!view) return;
        const q = s => view.querySelector(s);
        // Changed text fades in, so updates are noticed without the layout jumping.
        const text = (selector, value) => {
            const node = q(selector); if (node.textContent === value) return;
            node.textContent = value; node.classList.remove('nbd-changed'); void node.offsetWidth; node.classList.add('nbd-changed');
        };
        q('[data-toggle]').setAttribute('aria-checked', String(enabled));
        q('[data-dot]').dataset.state = error || problem ? 'problem' : !enabled ? 'off' : jobs.length || scan ? 'busy' : 'on';
        text('[data-status]', error || problem || (!enabled ? '已关闭' : !initialized ? '正在准备' : !detach ? '等待下载接口；若持续未就绪，请重启网易云'
            : scan ? '正在查找已有下载' : jobs.length ? '正在转换' + (jobs.length > 1 ? ' · 剩余 ' + jobs.length + ' 首' : '') : '已启用 · 下载完成后自动转换'));
        text('[data-count]', converted || failed ? '本次完成 ' + converted + ' 首' + (failed ? ' · ' + failed + ' 首失败' : '') : '封面与歌曲信息直接写入音频文件');
        const activity = mine() && status.activity;
        q('[data-detail]').textContent = hint || (activity && activity.state === 'error' ? activity.message : '');
        const find = q('[data-scan]');
        find.disabled = !enabled || !initialized || !sdk || !!scan;
        find.dataset.busy = String(!!scan);
        find.textContent = scan ? '正在查找…' : '查找并转换';
        text('[data-scan-note]', scanNote || '找出下载目录里还没有转换的 NCM');
        // The sliding highlight of a segmented choice follows --index.
        const choose = (group, value) => {
            const radios = Array.from(view.querySelectorAll('[data-' + group + '] [role=radio]'));
            radios.forEach(radio => { const on = radio.dataset.value === String(value); radio.setAttribute('aria-checked', String(on)); radio.tabIndex = on ? 0 : -1; });
            q('[data-' + group + ']').style.setProperty('--index', String(Math.max(0, radios.findIndex(radio => radio.dataset.value === String(value)))));
        };
        choose('notify', notify); choose('card-style', compact ? 'compact' : 'standard'); choose('card-stay', stay);
        text('[data-notify-note]', notify === 'all' ? '每首歌转换时在右下角提示' : notify === 'errors' ? '只在转换失败或程序受阻时提示' : '不弹出卡片，转换状态仍可在此页查看');
        text('[data-style-note]', compact ? '单行显示，只保留封面与状态' : '显示封面、格式与转换进度');
        q('[data-preview]').disabled = !initialized;
    }
    function writeControl() {
        if (!initialized || disposed) return Promise.resolve();
        const content = JSON.stringify({ session, enabled, heartbeat: Date.now(), state: stateDir, scan: scan ? scan.request : null, jobs: jobs.slice() }); lastWrite = Date.now();
        // writeFile keeps non-ASCII data paths intact; writeFileText passes them through the ANSI code page.
        writes = writes.catch(() => {}).then(async () => {
            if (!disposed && !await betterncm.fs.writeFile(controlPath, new Blob([content]))) throw new Error('无法写入插件任务，请检查 BetterNCM 数据目录权限。');
        });
        return writes;
    }
    function commonFolder(folders) {
        if (!folders.length) return '';
        return folders.slice(1).reduce((shared, folder) => {
            const parts = folder.split('\\'); let i = 0;
            while (i < shared.length && i < parts.length && shared[i].toLowerCase() === parts[i].toLowerCase()) i++;
            return shared.slice(0, i);
        }, folders[0].split('\\')).join('\\');
    }
    function roundInfo() {
        if (!round || round.total < 2) return null;
        return { position: Math.min(round.total, round.converted + round.failed + 1), pending: jobs.length, converted: round.converted, failed: round.failed, folder: commonFolder(round.folders) };
    }
    // Album art comes from the cover the worker copied out of the NCM; nothing is fetched online.
    async function loadCover(file) {
        const path = hook.normalize(file || '');
        if (!path || covers.has(path) || !path.toLowerCase().startsWith(hook.normalize(runtimeDir).toLowerCase() + '\\covers\\')) return;
        covers.set(path, '');
        try {
            const blob = await betterncm.fs.readFile(path);
            if (disposed || !blob || !blob.size) return;
            covers.set(path, URL.createObjectURL(blob));
            for (const [old, url] of covers) { if (covers.size <= 8) break; if (url) URL.revokeObjectURL(url); covers.delete(old); }
            if (shown && hook.normalize(shown.cover || '') === path) show(shown);
        } catch (_) {}
    }
    function show(activity) {
        shown = activity;
        if (notify === 'off' || (notify === 'errors' && activity.state !== 'error')) return;
        const info = roundInfo(), done = activity.state === 'success';
        card.update(Object.assign({}, activity, {
            round: info,
            folder: done ? (info && hook.normalize(info.folder)) || folderOf(activity.output) : '',
            art: covers.get(hook.normalize(activity.cover || '')) || ''
        }));
        loadCover(activity.cover);
    }
    // A sample card in the current style; shown on request whatever the pop-up setting.
    function preview() {
        const root = sdk ? hook.scanRoot(sdk.Storage.downloadDir) : '';
        const sample = { id: 'preview-' + (++serial), path: '示例歌曲.flac', format: 'FLAC', art: '', round: null, folder: root ? root + '\\unlock' : '' };
        card.update(Object.assign({}, sample, { state: 'converting', message: '正在转换', percent: 64 }));
        setTimeout(() => { if (!disposed) card.update(Object.assign({}, sample, { state: 'success', message: '', percent: 100 })); }, 1400);
    }
    function enqueue(source, target) {
        const existing = jobs.find(job => job.source.toLowerCase() === source.toLowerCase());
        if (existing) return existing;
        if (jobs.length >= MAX_JOBS) return null;
        const job = { id: session + '-' + (++serial), source, target };
        if (!round || (!jobs.length && Date.now() - round.last > ROUND_GAP)) round = { total: 0, converted: 0, failed: 0, folders: [], last: 0 };
        round.total++; round.last = Date.now(); jobs.push(job);
        // The first queued song appears at once; later ones only update the count on the current card.
        if (jobs.length === 1) show({ id: job.id, state: 'converting', message: '准备转换', path: source, percent: 0 });
        else if (shown) show(shown);
        return job;
    }
    function collect() {
        const results = status.results || {}, finished = jobs.filter(job => results[job.id]);
        for (const job of finished) {
            const result = results[job.id];
            if (result.state === 'success') {
                converted++; round.converted++;
                const folder = folderOf(result.output);
                if (folder && !round.folders.includes(folder)) round.folders.push(folder);
            } else { failed++; round.failed++; }
        }
        if (finished.length) { round.last = Date.now(); jobs = jobs.filter(job => !results[job.id]); writeControl().catch(reportError); }
        // Only activity for a queued or just-finished job reaches the card; an earlier worker's leftovers never do.
        const activity = status.activity;
        if (enabled && activity && activity.id && (finished.some(job => job.id === activity.id) || jobs.some(job => job.id === activity.id))) {
            const key = [activity.id, activity.state, activity.percent, activity.message, activity.format, activity.cover, jobs.length].join(':');
            if (key !== lastTaskKey) { lastTaskKey = key; show(activity); }
        }
        if (scan && status.scan && status.scan.id === scan.request.id) takeScan(status.scan);
    }
    function startScan() {
        const root = sdk ? hook.scanRoot(sdk.Storage.downloadDir) : '';
        if (!root) { scanNote = '没有获取到网易云下载目录。'; render(); return; }
        scan = { request: { id: session + '-scan-' + (++serial), root }, at: Date.now() };
        scanNote = '正在查找 ' + root;
        render(); writeControl().then(wake, reportError);
    }
    function takeScan(result) {
        scan = null;
        if (result.error) scanNote = '查找失败：' + result.error;
        else {
            let added = 0, full = false;
            for (const file of result.files || []) {
                const job = hook.resolveJob(file, '');
                if (!job) continue;
                if (!enqueue(job.source, job.target)) { full = true; break; }
                added++;
            }
            scanNote = added ? '已加入 ' + added + ' 首待转换' + (full || result.more ? '；完成后可再次查找其余歌曲' : '')
                : '没有需要转换的歌曲' + (result.skipped ? '，' + result.skipped + ' 首此前已转换' : '');
        }
        writeControl().catch(reportError);
    }
    async function launch() {
        if (!launchedAt) launchedAt = Date.now();
        // Retry quickly at first, then slowly once the worker is evidently blocked.
        if (Date.now() - lastLaunch < (Date.now() - launchedAt > 10000 ? 10000 : 2000)) return;
        lastLaunch = Date.now(); await writeControl();
        if (!await betterncm.app.exec('"' + workerPath + '"', false, false)) throw new Error('无法启动转换程序。');
    }
    // Tell a data directory that silently drops writes apart from a worker that never starts. Returns [status, what to do].
    async function diagnose() {
        let saved = '';
        try { saved = await betterncm.fs.readFileText(controlPath); } catch (_) {}
        return saved.includes(session)
            ? ['转换程序没有运行，可能被安全软件拦截', '请在安全软件中信任 ' + workerPath.replace(/\//g, '\\') + '，插件会自动重试。']
            : ['无法写入 BetterNCM 数据目录', '请检查 ' + stateDir.replace(/\//g, '\\') + ' 的写入权限，插件会自动重试。'];
    }
    async function tick() {
        if (disposed || busy || !initialized) return;
        busy = true;
        try {
            if (enabled && !detach && Date.now() >= nextHook) subscribe();
            if ((wanted() || running()) && Date.now() - lastWrite > 3000) await writeControl();
            try { status = JSON.parse(await betterncm.fs.readFileText(statusPath)); } catch (_) {}
            if (mine()) collect();
            // The worker only runs while there is work; it exits by itself after a minute without any.
            if (running() || !wanted()) { launchedAt = 0; problem = ''; hint = ''; }
            else {
                if (launchedAt && Date.now() - launchedAt > 10000 && !problem) {
                    [problem, hint] = await diagnose();
                    if (jobs.length) show({ id: jobs[0].id, state: 'error', message: problem, path: jobs[0].source });
                }
                await launch();
            }
            if (scan && !running() && Date.now() - scan.at > 30000) { scan = null; scanNote = '查找没有完成，请稍后重试。'; await writeControl(); }
            // Errors clear themselves once things work again, instead of sticking until the plugin is toggled.
            if (error && Date.now() - errorAt > 5000) error = '';
            render();
        } catch (e) { reportError(e); }
        finally { busy = false; }
    }
    function schedule() {
        clearTimeout(timer);
        if (!disposed) timer = setTimeout(() => tick().then(schedule), wanted() ? 250 : running() ? 1000 : 2000);
    }
    function wake() { tick().then(schedule); }
    function subscribe() {
        if (!enabled || !initialized || detach || disposed) return;
        const found = hook.findSdk(window);
        // Every probe adds a chunk to webpackJsonp, so back off while the client is not ready.
        if (!found) { nextHook = Date.now() + hookDelay; hookDelay = Math.min(hookDelay * 2, 30000); return; }
        sdk = found; hookDelay = 2000;
        detach = hook.attach(found, event => {
            if (!enabled || disposed) return;
            if (!enqueue(event.source, event.target)) { reportError(new Error('等待转换的下载超过 1000 首，请稍后继续下载。')); return; }
            writeControl().then(wake, reportError);
        });
    }
    // Each earlier version left its runtime copy (about 0.5 MB) behind; remove them once their workers have exited.
    async function removeOldRuntimes(current) {
        if (disposed) return;
        try {
            for (const entry of await betterncm.fs.readDir(stateDir)) {
                const name = String(entry).split(/[\\/]/).pop();
                if ((/^runtime-\d+\.\d+\.\d+$/.test(name) && name !== current) || name === 'receipts.json') await betterncm.fs.remove(stateDir + '/' + name);
            }
        } catch (_) {}
    }
    async function initialize() {
        stateDir = (await betterncm.app.getDataPath()).replace(/[\\/]$/, '') + '/ncm-better-download';
        const runtime = 'runtime-' + plugin.manifest.version;
        runtimeDir = stateDir + '/' + runtime;
        if (!await betterncm.fs.mkdir(runtimeDir)) throw new Error('无法创建插件数据目录。');
        controlPath = runtimeDir + '/control.json'; statusPath = runtimeDir + '/status.json'; workerPath = runtimeDir + '/worker.exe';
        for (const name of ['worker.exe', 'TagLibSharp.dll']) {
            if (!await betterncm.fs.exists(runtimeDir + '/' + name)) {
                if (!await betterncm.fs.exists(base + '/' + name)) throw new Error('插件包不完整：缺少 ' + name);
                const binary = await betterncm.fs.readFile(base + '/' + name);
                if (!binary || binary.size < 1024 || !await betterncm.fs.writeFile(runtimeDir + '/' + name, binary)) throw new Error('无法准备转换组件。');
            }
        }
        try { links = JSON.parse(await betterncm.fs.readFileText(base + '/release.json')); } catch (_) {}
        if (disposed) return;
        card = window.NBDProgressCard({ openFolder: async target => {
            const folder = hook.normalize(target);
            if (!folder || !await betterncm.fs.exists(folder)) throw new Error('输出目录不存在。');
            if (!await betterncm.app.exec('"' + folder + '"', false, true)) throw new Error('无法打开文件夹。');
        } });
        card.configure({ compact, stay });
        initialized = true; subscribe(); render(); renderLinks();
        setTimeout(() => removeOldRuntimes(runtime), 20000);
        wake();
    }
    function renderLinks() {
        if (!view) return;
        const footer = view.querySelector('[data-links]'); footer.textContent = '';
        [['源代码', links.repository], ['问题反馈', links.issues]].forEach(([label, url]) => {
            if (!/^https:\/\/github\.com\//.test(url || '')) return;
            const a = document.createElement('a'); a.href = url; a.textContent = label;
            a.onclick = event => { event.preventDefault(); betterncm.ncm.openUrl(url); }; footer.appendChild(a);
        });
    }
    const ICON = {
        search: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="M10.4 10.4 14 14"/></svg>',
        wave: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2.5 6.5v3M5.25 4.5v7M8 2.5v11M10.75 4.5v7M13.5 6.5v3"/></svg>',
        tag: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/><circle cx="6" cy="6.2" r="1.2"/><path d="m3 12.2 3.1-3.1 2.2 2.2 1.8-1.8 2.9 2.9"/></svg>',
        keep: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4.6A1.6 1.6 0 0 1 3.6 3h2.5l1.5 1.6h4.8A1.6 1.6 0 0 1 14 6.2v5.2a1.6 1.6 0 0 1-1.6 1.6H3.6A1.6 1.6 0 0 1 2 11.4z"/><path d="m5.8 8.7 1.5 1.5 2.9-3"/></svg>',
        bell: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.5A3.5 3.5 0 0 0 4.5 6v2.4L3.2 10.8h9.6L11.5 8.4V6A3.5 3.5 0 0 0 8 2.5z"/><path d="M6.6 12.8a1.5 1.5 0 0 0 2.8 0"/></svg>',
        card: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><rect x="2" y="4" width="12" height="8" rx="2"/><path d="M4.8 7h3.4M4.8 9.2h6"/></svg>',
        clock: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="5.6"/><path d="M8 5.2V8l1.9 1.3"/></svg>'
    };
    plugin.onConfig(() => {
        if (view) return view;
        view = document.createElement('section'); view.className = 'nbd-settings';
        // Neutral grays with alpha keep the page readable on both the light and the dark client theme.
        view.innerHTML = `<style>
        .nbd-settings{font:14px/1.6 "Segoe UI Variable Text","Segoe UI","Microsoft YaHei UI","Microsoft YaHei",system-ui,sans-serif;padding:32px;max-width:680px;color:inherit;-webkit-font-smoothing:antialiased}.nbd-settings *{box-sizing:border-box}
        .nbd-settings .nbd-in{animation:nbd-rise .6s cubic-bezier(.2,.8,.2,1) backwards;animation-delay:calc(var(--i,0) * 60ms)}
        .nbd-settings .nbd-head{display:flex;align-items:center;gap:16px;margin-bottom:24px}
        .nbd-settings .nbd-logo{position:relative;overflow:hidden;flex:none;width:52px;height:52px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(135deg,#f39bc4,#9a8bff 52%,#5eaefc);box-shadow:0 10px 24px -10px rgba(122,104,255,.75),inset 0 1px 0 rgba(255,255,255,.45),inset 0 0 0 1px rgba(255,255,255,.18);animation:nbd-pop .8s .06s cubic-bezier(.2,.8,.2,1) backwards}
        .nbd-settings .nbd-logo svg{position:relative;width:28px;height:28px}
        .nbd-settings .nbd-logo::after{content:"";position:absolute;inset:-40%;background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.55) 50%,transparent 58%);transform:translateX(-60%);transition:transform .9s cubic-bezier(.2,.8,.2,1);animation:nbd-shine 1.1s .5s cubic-bezier(.2,.8,.2,1) backwards}
        .nbd-settings .nbd-head:hover .nbd-logo::after{transform:translateX(60%)}
        .nbd-settings h2{display:flex;align-items:center;gap:10px;margin:0;font-size:22px;font-weight:600;letter-spacing:-.3px;line-height:1.3}
        .nbd-settings .nbd-version{font-size:11px;font-weight:600;letter-spacing:.3px;padding:1px 8px;border-radius:999px;border:1px solid rgba(136,136,136,.35);opacity:.7}
        .nbd-settings .nbd-head p{margin:3px 0 0;font-size:13px;opacity:.62}
        .nbd-settings .nbd-panel{border:1px solid rgba(136,136,136,.2);border-radius:14px;background:rgba(136,136,136,.06);overflow:hidden}
        .nbd-settings .nbd-row{display:flex;align-items:center;gap:14px;padding:16px 18px;transition:background .25s}.nbd-settings .nbd-row:hover{background:rgba(136,136,136,.05)}.nbd-settings .nbd-row+.nbd-row{border-top:1px solid rgba(136,136,136,.16)}
        .nbd-settings .nbd-copy{flex:1;min-width:0}.nbd-settings .nbd-copy>div{font-weight:600}
        .nbd-settings small{display:block;margin-top:1px;font-size:12px;opacity:.6;overflow-wrap:anywhere}
        .nbd-settings .nbd-changed{animation:nbd-fade .5s ease-out}
        .nbd-settings [data-dot],.nbd-settings .nbd-glyph{flex:none;align-self:flex-start;width:14px;height:22px;display:grid;place-items:center}.nbd-settings .nbd-glyph{opacity:.6}
        .nbd-settings [data-dot]::before{content:"";width:8px;height:8px;border-radius:50%;background:#9aa0a6;box-shadow:0 0 0 4px rgba(154,160,166,.16);transition:background .35s,box-shadow .35s}
        .nbd-settings [data-dot][data-state=on]::before{background:#2fbf71;box-shadow:0 0 0 4px rgba(47,191,113,.18)}
        .nbd-settings [data-dot][data-state=busy]::before{background:#7a8cff;box-shadow:0 0 0 4px rgba(122,140,255,.2);animation:nbd-pulse 1.6s ease-in-out infinite}
        .nbd-settings [data-dot][data-state=problem]::before{background:#e5534b;box-shadow:0 0 0 4px rgba(229,83,75,.18)}
        .nbd-settings button{font:inherit;color:inherit;cursor:pointer;transition:transform .15s cubic-bezier(.3,.7,.3,1)}.nbd-settings button:not(:disabled):active{transform:scale(.95)}
        .nbd-settings button:disabled{opacity:.45;cursor:default}.nbd-settings button:focus-visible{outline:2px solid #8b7dff;outline-offset:3px}
        .nbd-settings [data-toggle]{position:relative;overflow:hidden;flex:none;width:44px;height:24px;padding:0;border:0;border-radius:999px;background:rgba(136,136,136,.4)}
        .nbd-settings [data-toggle]::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,#f39bc4,#9a8bff 52%,#5eaefc);opacity:0;transition:opacity .3s}.nbd-settings [data-toggle][aria-checked=true]::before{opacity:1}
        .nbd-settings [data-toggle] span{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:999px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .42s cubic-bezier(.34,1.5,.64,1),width .2s cubic-bezier(.3,.7,.3,1)}
        .nbd-settings [data-toggle][aria-checked=true] span{transform:translateX(20px)}
        .nbd-settings [data-toggle]:active span{width:22px}.nbd-settings [data-toggle][aria-checked=true]:active span{transform:translateX(16px)}
        .nbd-settings [data-scan]{flex:none;font-size:13px;font-weight:600;padding:7px 14px;border-radius:9px;border:1px solid rgba(136,136,136,.35);background:rgba(136,136,136,.1);white-space:nowrap;transition:background .2s,border-color .2s,transform .15s}
        .nbd-settings [data-scan]:hover:not(:disabled){background:rgba(136,136,136,.18);border-color:rgba(136,136,136,.5)}
        .nbd-settings [data-scan][data-busy=true]::before{content:"";display:inline-block;width:10px;height:10px;margin-right:7px;vertical-align:-1px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:nbd-spin .75s linear infinite}
        .nbd-settings [data-detail]{margin-top:12px;padding:10px 14px;border-left:3px solid #e5534b;border-radius:8px;background:rgba(229,83,75,.1);font-size:12.5px;word-break:break-word}.nbd-settings [data-detail]:empty{display:none}
        .nbd-settings [data-detail]:not(:empty){animation:nbd-drop .45s cubic-bezier(.2,.8,.2,1) backwards}
        .nbd-settings .nbd-section{margin:26px 0 10px;font-size:12px;font-weight:600;letter-spacing:.4px;opacity:.55}
        .nbd-settings .nbd-segment{position:relative;flex:none;display:inline-grid;grid-auto-flow:column;grid-auto-columns:1fr;padding:3px;border-radius:10px;background:rgba(136,136,136,.14)}
        .nbd-settings .nbd-thumb{position:absolute;top:3px;bottom:3px;left:3px;width:calc((100% - 6px) / var(--n));border-radius:7px;background:linear-gradient(135deg,#f39bc4,#9a8bff 52%,#5eaefc);box-shadow:0 2px 8px -3px rgba(122,104,255,.8);transform:translateX(calc(100% * var(--index,0)));transition:transform .45s cubic-bezier(.34,1.3,.64,1)}
        .nbd-settings .nbd-segment button{position:relative;border:0;border-radius:7px;padding:5px 12px;background:transparent;font-size:12.5px;font-weight:600;white-space:nowrap;opacity:.7;transition:color .25s,opacity .25s,transform .15s}
        .nbd-settings .nbd-segment button:hover{opacity:1}.nbd-settings .nbd-segment button[aria-checked=true]{opacity:1;color:#fff}
        .nbd-settings [data-preview]{flex:none;border:0;background:none;padding:4px 2px;font-size:12.5px;font-weight:600;opacity:.75;text-decoration:underline;text-underline-offset:3px;transition:opacity .2s,transform .15s}
        .nbd-settings [data-preview]:hover:not(:disabled){opacity:1}
        .nbd-settings .nbd-features{list-style:none;margin:22px 0 0;padding:0;display:grid;gap:14px}.nbd-settings .nbd-features li{display:flex;gap:12px;align-items:center}
        .nbd-settings .nbd-features i{flex:none;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-style:normal;color:#8b7dff;background:rgba(139,125,255,.14);transition:transform .35s cubic-bezier(.34,1.5,.64,1)}
        .nbd-settings .nbd-features li:hover i{transform:translateY(-2px) scale(1.06)}
        .nbd-settings .nbd-features b{display:block;font-size:13px;font-weight:600}
        .nbd-settings footer{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;margin-top:24px;padding-top:16px;border-top:1px solid rgba(136,136,136,.16);font-size:12px;opacity:.62}
        .nbd-settings [data-links]{display:flex;gap:16px}.nbd-settings footer a{color:inherit;text-decoration:none}.nbd-settings footer a:hover{text-decoration:underline;text-underline-offset:3px}
        @keyframes nbd-rise{from{opacity:0;transform:translateY(12px)}}
        @keyframes nbd-pop{0%{opacity:0;transform:scale(.55) rotate(-14deg)}65%{opacity:1;transform:scale(1.07) rotate(2deg)}100%{transform:none}}
        @keyframes nbd-shine{from{transform:translateX(-60%)}to{transform:translateX(60%)}}
        @keyframes nbd-fade{from{opacity:.15;transform:translateY(3px)}}
        @keyframes nbd-drop{from{opacity:0;transform:translateY(-8px)}}
        @keyframes nbd-spin{to{transform:rotate(360deg)}}
        @keyframes nbd-pulse{50%{box-shadow:0 0 0 7px rgba(122,140,255,0)}}
        @media(prefers-reduced-motion:reduce){.nbd-settings *,.nbd-settings *::before,.nbd-settings *::after{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
        @media(max-width:520px){.nbd-settings{padding:24px 18px}.nbd-settings .nbd-row{flex-wrap:wrap}}
        </style><header class="nbd-head nbd-in" style="--i:0"><div class="nbd-logo">${window.NBDProgressCard.mark}</div><div><h2>BetterDownload<span class="nbd-version">v${plugin.manifest.version}</span></h2><p>自动解锁下载的 VIP 歌曲，保留原音质。</p></div></header>
        <div class="nbd-panel nbd-in" style="--i:1"><div class="nbd-row"><span data-dot></span><div class="nbd-copy"><div data-status role="status"></div><small data-count></small></div><button data-toggle role="switch" aria-checked="true" aria-label="启用 BetterDownload"><span></span></button></div>
        <div class="nbd-row"><span class="nbd-glyph">${ICON.search}</span><div class="nbd-copy"><div>转换已有下载</div><small data-scan-note role="status"></small></div><button data-scan>查找并转换</button></div></div>
        <div data-detail></div>
        <div class="nbd-section nbd-in" style="--i:2">进度卡片</div>
        <div class="nbd-panel nbd-in" style="--i:3"><div class="nbd-row"><span class="nbd-glyph">${ICON.bell}</span><div class="nbd-copy"><div>弹出时机</div><small data-notify-note></small></div>
        <div class="nbd-segment" role="radiogroup" aria-label="弹出时机" data-notify style="--n:3"><span class="nbd-thumb"></span><button role="radio" data-value="all">每首歌</button><button role="radio" data-value="errors">仅出错</button><button role="radio" data-value="off">不显示</button></div></div>
        <div class="nbd-row"><span class="nbd-glyph">${ICON.card}</span><div class="nbd-copy"><div>卡片样式</div><small data-style-note></small></div>
        <div class="nbd-segment" role="radiogroup" aria-label="卡片样式" data-card-style style="--n:2"><span class="nbd-thumb"></span><button role="radio" data-value="standard">标准</button><button role="radio" data-value="compact">简洁</button></div><button data-preview>预览</button></div>
        <div class="nbd-row"><span class="nbd-glyph">${ICON.clock}</span><div class="nbd-copy"><div>停留时间</div><small>鼠标停在卡片上时不会收起</small></div>
        <div class="nbd-segment" role="radiogroup" aria-label="停留时间" data-card-stay style="--n:3"><span class="nbd-thumb"></span><button role="radio" data-value="2000">2 秒</button><button role="radio" data-value="4000">4 秒</button><button role="radio" data-value="6000">6 秒</button></div></div></div>
        <ul class="nbd-features"><li class="nbd-in" style="--i:4"><i>${ICON.wave}</i><div><b>无损提取</b><small>直接取出 FLAC / MP3 原始音频，不重新编码</small></div></li>
        <li class="nbd-in" style="--i:5"><i>${ICON.tag}</i><div><b>信息完整</b><small>封面、标题、歌手与专辑写入音频文件</small></div></li>
        <li class="nbd-in" style="--i:6"><i>${ICON.keep}</i><div><b>原文件保留</b><small>输出到 VipSongsDownload\\unlock，不覆盖你已有的文件</small></div></li></ul>
        <footer class="nbd-in" style="--i:7"><span>作者 XIAOMING6680</span><span data-links></span></footer>`;
        view.querySelector('[data-toggle]').onclick = async () => {
            const button = view.querySelector('[data-toggle]'); button.disabled = true;
            try {
                enabled = !enabled; plugin.setConfig('enabled', enabled); error = ''; problem = ''; hint = ''; launchedAt = 0;
                if (!enabled) { if (detach) detach(); detach = null; jobs = []; scan = null; round = null; if (card) card.hide(); }
                else { lastLaunch = 0; nextHook = 0; hookDelay = 2000; subscribe(); }
                await writeControl(); render(); wake();
            } catch (e) { reportError(e); }
            finally { button.disabled = false; }
        };
        view.querySelector('[data-scan]').onclick = startScan;
        view.querySelector('[data-preview]').onclick = preview;
        view.querySelector('[data-notify]').onclick = event => {
            const radio = event.target.closest('[role=radio]'); if (!radio) return;
            notify = radio.dataset.value; plugin.setConfig('notify', notify);
            if (notify !== 'all' && card) card.hide();
            render();
        };
        view.querySelector('[data-card-style]').onclick = event => {
            const radio = event.target.closest('[role=radio]'); if (!radio) return;
            compact = radio.dataset.value === 'compact'; plugin.setConfig('cardStyle', radio.dataset.value);
            if (card) card.configure({ compact, stay });
            render();
        };
        view.querySelector('[data-card-stay]').onclick = event => {
            const radio = event.target.closest('[role=radio]'); if (!radio) return;
            stay = Number(radio.dataset.value); plugin.setConfig('cardStay', stay);
            if (card) card.configure({ compact, stay });
            render();
        };
        // Radio groups move with the arrow keys; only the checked option is in the tab order.
        view.querySelectorAll('[role=radiogroup]').forEach(group => group.addEventListener('keydown', event => {
            const radios = Array.from(group.querySelectorAll('[role=radio]')), index = radios.indexOf(document.activeElement);
            const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
            if (index < 0 || !step) return;
            event.preventDefault();
            const next = radios[(index + step + radios.length) % radios.length]; next.focus(); next.click();
        }));
        render(); renderLinks(); return view;
    });
    function dispose() {
        disposed = true; clearTimeout(timer); if (detach) detach(); if (card) card.dispose();
        for (const url of covers.values()) if (url) URL.revokeObjectURL(url);
        window.removeEventListener('beforeunload', dispose);
        try { if (controlPath) betterncm_native.fs.writeFileText(controlPath, JSON.stringify({ session, enabled: false, heartbeat: Date.now(), jobs: [] })); } catch (_) {}
    }
    window[KEY] = { dispose }; window.addEventListener('beforeunload', dispose);
    plugin.onLoad(() => { initialize().catch(reportError); });
})();
