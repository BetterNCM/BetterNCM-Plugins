/* global plugin, betterncm, betterncm_native */
(() => {
    'use strict';
    const KEY = '__ncmBetterDownload';
    if (window[KEY]) window[KEY].dispose();
    const base = plugin.pluginPath.replace(/[\\/]$/, '');
    let enabled = plugin.getConfig('enabled', true);
    const session = Date.now().toString(36) + Math.random().toString(36).slice(2);
    let stateDir = '', controlPath = '', statusPath = '', workerPath = '', initialized = false;
    let disposed = false, busy = false, timer, detach = null, card = null, view = null;
    let jobs = [], serial = 0, status = null, error = '', lastLaunch = 0, lastWrite = 0, lastHook = 0;
    let writes = Promise.resolve(), links = {}, lastTaskKey = '';
    const exists = path => betterncm.fs.exists(path);
    function reportError(e) { error = e.message || String(e); render(); }
    function render() {
        if (!view) return;
        const toggle = view.querySelector('[data-toggle]');
        toggle.textContent = enabled ? '关闭插件' : '启用插件'; toggle.setAttribute('aria-pressed', String(enabled));
        view.querySelector('[data-dot]').dataset.enabled = String(enabled);
        view.querySelector('[data-status]').textContent = error || (!enabled ? '已关闭' : !initialized ? '正在准备' : !detach ? '等待下载接口；若持续未就绪，请重启网易云' : status && status.session === session && status.state !== 'stopped' ? status.message : '已启用 · 下载完成后自动转换');
        view.querySelector('[data-count]').textContent = status && status.session === session ? '本次完成 ' + status.converted + ' 首' + (status.failed ? ' · ' + status.failed + ' 首失败' : '') : '封面与歌曲信息直接写入音频文件';
        const activity = status && status.session === session && status.activity;
        view.querySelector('[data-detail]').textContent = activity && activity.state === 'error' ? activity.message : '';
    }
    function writeControl() {
        if (!initialized || disposed) return Promise.resolve();
        const content = JSON.stringify({ session, enabled, heartbeat: Date.now(), state: stateDir, jobs: jobs.slice() }); lastWrite = Date.now();
        writes = writes.catch(() => {}).then(async () => {
            if (!disposed && !await betterncm.fs.writeFileText(controlPath, content)) throw new Error('无法写入插件任务，请检查 BetterNCM 数据目录权限。');
        });
        return writes;
    }
    function subscribe() {
        if (!enabled || !initialized || detach || disposed) return;
        lastHook = Date.now();
        const sdk = window.NBDDownloadHook.findSdk(window); if (!sdk) return;
        detach = window.NBDDownloadHook.attach(sdk, async event => {
            if (!enabled || disposed || jobs.some(job => job.source.toLowerCase() === event.source.toLowerCase())) return;
            if (jobs.length >= 1000) { reportError(new Error('等待转换的下载超过 1000 首，请稍后继续下载。')); return; }
            const job = { id: session + '-' + (++serial), source: event.source, target: event.target }; jobs.push(job);
            card.update({ id: job.id, state: 'converting', message: '准备转换', path: job.source, percent: 0 });
            try { await writeControl(); await tick(); } catch (e) { reportError(e); }
        });
    }
    async function tick() {
        if (disposed || busy || !initialized) return;
        busy = true;
        try {
            if (enabled && !detach && Date.now() - lastHook > 2000) subscribe();
            if (Date.now() - lastWrite > 3000) await writeControl();
            if (await exists(statusPath)) { try { status = JSON.parse(await betterncm.fs.readFileText(statusPath)); } catch (_) {} }
            if (status && status.session === session) {
                const done = new Set(status.acknowledged || []), rest = jobs.filter(job => !done.has(job.id));
                if (rest.length !== jobs.length) { jobs = rest; await writeControl(); }
                if (enabled && status.activity) {
                    const key = status.activity.id + ':' + status.activity.state + ':' + status.activity.percent;
                    if (key !== lastTaskKey) { lastTaskKey = key; card.update(status.activity); }
                }
            }
            const alive = status && status.session === session && Date.now() - status.heartbeat < 6000 && status.state !== 'stopped';
            if (enabled && !alive && Date.now() - lastLaunch > 2000) {
                lastLaunch = Date.now(); await writeControl();
                if (!await betterncm.app.exec('"' + workerPath + '"', false, false)) throw new Error('无法启动转换程序。');
            }
            render();
        } catch (e) { reportError(e); }
        finally { busy = false; }
    }
    async function initialize() {
        stateDir = (await betterncm.app.getDataPath()).replace(/[\\/]$/, '') + '/ncm-better-download';
        const runtime = stateDir + '/runtime-' + plugin.manifest.version;
        if (!await betterncm.fs.mkdir(runtime)) throw new Error('无法创建插件数据目录。');
        controlPath = runtime + '/control.json'; statusPath = runtime + '/status.json'; workerPath = runtime + '/worker.exe';
        for (const name of ['worker.exe', 'TagLibSharp.dll']) {
            if (!await exists(runtime + '/' + name)) {
                if (!await exists(base + '/' + name)) throw new Error('插件包不完整：缺少 ' + name);
                const binary = await betterncm.fs.readFile(base + '/' + name);
                if (!binary || binary.size < 1024 || !await betterncm.fs.writeFile(runtime + '/' + name, binary)) throw new Error('无法准备转换组件。');
            }
        }
        try { links = JSON.parse(await betterncm.fs.readFileText(base + '/release.json')); } catch (_) {}
        if (disposed) return;
        card = window.NBDProgressCard({ openFolder: async file => {
            const folder = window.NBDDownloadHook.normalize(file).replace(/\\[^\\]+$/, '');
            if (!folder || !await exists(folder)) throw new Error('输出目录不存在。');
            if (!await betterncm.app.exec('"' + folder + '"', false, true)) throw new Error('无法打开文件夹。');
        } });
        initialized = true; subscribe(); await writeControl(); await tick(); renderLinks();
        if (!disposed) timer = setInterval(tick, 250);
    }
    function renderLinks() {
        if (!view) return;
        const footer = view.querySelector('[data-links]'); footer.textContent = '';
        [['源代码', links.repository], ['反馈', links.issues]].forEach(([label, url]) => {
            if (!/^https:\/\/github\.com\//.test(url || '')) return;
            const a = document.createElement('a'); a.href = url; a.textContent = label;
            a.onclick = event => { event.preventDefault(); betterncm.ncm.openUrl(url); }; footer.appendChild(a);
        });
    }
    plugin.onConfig(() => {
        if (view) return view;
        view = document.createElement('section'); view.className = 'nbd-settings';
        view.innerHTML = `<style>
        .nbd-settings{font:14px/1.7 system-ui,sans-serif;padding:32px;max-width:660px;color:inherit}.nbd-settings *{box-sizing:border-box}
        .nbd-settings h2{font-size:25px;font-weight:600;letter-spacing:-.7px;margin:0 0 9px}.nbd-settings p{opacity:.6;margin:0 0 28px}
        .nbd-settings .nbd-line{border-top:1px solid #8883;border-bottom:1px solid #8883;padding:22px 0;display:flex;align-items:center;gap:12px}
        .nbd-settings .nbd-copy{flex:1;min-width:0}.nbd-settings small{display:block;opacity:.5;font-size:12px}.nbd-settings [data-dot]{width:6px;height:6px;background:#888;border-radius:50%;flex:none}
        .nbd-settings [data-dot][data-enabled=true]{background:#ccd8ca}.nbd-settings button{font:inherit;border:1px solid #8885;background:#8881;color:inherit;border-radius:8px;padding:8px 15px;cursor:pointer;white-space:nowrap}.nbd-settings button:disabled{opacity:.4}
        .nbd-settings .nbd-note{font-size:12px;opacity:.55;margin-top:20px}.nbd-settings [data-detail]{color:#ce8b86;margin-top:12px;word-break:break-word}.nbd-settings a{color:inherit;opacity:.55;margin-right:20px;text-decoration:none;font-size:12px}.nbd-settings [data-links]{margin-top:22px}
        </style><h2>BetterDownload</h2><p>自动解锁下载的 VIP 歌曲。</p>
        <div class="nbd-line"><span data-dot></span><div class="nbd-copy"><div data-status role="status"></div><small data-count></small></div><button data-toggle aria-pressed="true">关闭插件</button></div>
        <div class="nbd-note">自动识别 NCM 下载；普通 FLAC / MP3 无需转换。<br>转换结果保存至原下载位置的 VipSongsDownload\\unlock<br>保留原文件 · 内嵌封面与歌曲信息<br>作者 XIAOMING6680</div><div data-detail></div><div data-links></div>`;
        view.querySelector('[data-toggle]').onclick = async () => {
            const button = view.querySelector('[data-toggle]'); button.disabled = true;
            try {
                enabled = !enabled; plugin.setConfig('enabled', enabled); error = '';
                if (!enabled) { if (detach) detach(); detach = null; jobs = []; if (card) card.hide(); }
                else { lastLaunch = 0; subscribe(); }
                await writeControl(); render(); await tick();
            } catch (e) { reportError(e); }
            finally { button.disabled = false; }
        };
        render(); renderLinks(); return view;
    });
    function dispose() {
        disposed = true; clearInterval(timer); if (detach) detach(); if (card) card.dispose();
        window.removeEventListener('beforeunload', dispose);
        try { if (controlPath) betterncm_native.fs.writeFileText(controlPath, JSON.stringify({ session, enabled: false, heartbeat: Date.now(), jobs: [] })); } catch (_) {}
    }
    window[KEY] = { dispose }; window.addEventListener('beforeunload', dispose);
    plugin.onLoad(() => { initialize().catch(reportError); });
})();
