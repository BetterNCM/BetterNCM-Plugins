(function (root) {
    'use strict';
    // The brand mark from the store preview: a download arrow with an open lock.
    const MARK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 4.5v10M6 10.5l4 4 4-4M5 19.5h11"/><rect x="15.2" y="6.6" width="6.4" height="5" rx="1.3" fill="#fff" stroke="none"/><path d="M16.7 6.6V5a1.8 1.8 0 0 1 3.5-.6" stroke-width="1.5"/></svg>';
    const FOLDER = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M2 4.6A1.6 1.6 0 0 1 3.6 3h2.5l1.5 1.6h4.8A1.6 1.6 0 0 1 14 6.2v5.2a1.6 1.6 0 0 1-1.6 1.6H3.6A1.6 1.6 0 0 1 2 11.4z"/></svg>';
    root.NBDProgressCard = function ({ openFolder, idleMs = 6000 }) {
        const host = document.createElement('div'); host.id = 'nbd-progress-card';
        host.style.cssText = 'position:fixed;right:18px;bottom:100px;width:270px;max-width:calc(100vw - 32px);z-index:2147483000;display:none;opacity:0;transform:translateX(22px) scale(.98);transform-origin:100% 50%;transition:transform .42s cubic-bezier(.2,.8,.2,1),opacity .32s;';
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = `<style>
        :host{font:12px/1.45 "Segoe UI Variable Text","Segoe UI","Microsoft YaHei UI","Microsoft YaHei",sans-serif;color:#f4f6fa;color-scheme:dark;-webkit-font-smoothing:antialiased}*{box-sizing:border-box}[hidden]{display:none!important}
        .card{position:relative;overflow:hidden;padding:13px 14px 12px;border-radius:14px;background:linear-gradient(160deg,#ffffff10,#ffffff00 58%),rgba(15,19,29,.68);box-shadow:0 18px 40px -14px #000a,0 3px 10px #0003;backdrop-filter:blur(28px) saturate(150%);-webkit-backdrop-filter:blur(28px) saturate(150%);transition:box-shadow .3s}
        .card:hover{box-shadow:0 22px 46px -14px #000b,0 3px 12px #0004}
        .card::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.03;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Cpath fill='%23fff' filter='url(%23n)' d='M0 0h160v160H0z'/%3E%3C/svg%3E")}
        .card::after{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;pointer-events:none;background:linear-gradient(155deg,#ffffff6b,#ffffff1a 34%,#ffffff0a 66%,#ffffff29);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
        .tint{position:absolute;inset:0;pointer-events:none;background-color:rgb(150,124,255);opacity:.45;-webkit-mask-image:radial-gradient(120% 130% at 0 0,#000,#0008 32%,#0000 70%);transition:background-color .6s}
        .row,.bottom,.notice{position:relative}.row{display:flex;gap:12px;align-items:flex-start}
        .art{position:relative;flex:none;width:44px;height:44px;border-radius:10px;overflow:hidden;display:grid;place-items:center;background:linear-gradient(135deg,#f39bc4,#9a8bff 52%,#5eaefc);box-shadow:0 6px 14px -6px #000c}
        .art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .35s}.art img.ready{opacity:1}
        .art::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px #ffffff26,inset 0 1px 0 #ffffff33;pointer-events:none}
        .body{flex:1;min-width:0}.head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:1px 0 2px}
        .body,.summary,.percent,.notice{text-shadow:0 1px 2px #0003}
        .label{font-size:10px;font-weight:600;letter-spacing:.3px;color:#e3e9f4c2}
        .state{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:600;color:#dce4f2;white-space:nowrap}
        .state i{width:6px;height:6px;border-radius:50%;background:#8fb0ff;box-shadow:0 0 0 3px #8fb0ff2e}.card[data-phase=converting] .state i{animation:pulse 1.4s ease-in-out infinite}
        .card[data-phase=success] .state{color:#a6ecc9}.card[data-phase=success] .state i{background:#5fd49a;box-shadow:0 0 0 3px #5fd49a33}
        .card[data-phase=error] .state{color:#ffbdb3}.card[data-phase=error] .state i{background:#ff8a7a;box-shadow:0 0 0 3px #ff8a7a33}
        .song{font-size:13.5px;font-weight:600;line-height:1.4;letter-spacing:.1px;color:#f7f9fc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .detail{display:flex;align-items:center;gap:6px;min-height:16px;margin-top:1px;font-size:11px;color:#e6ecf5e6;white-space:nowrap}.detail-text{overflow:hidden;text-overflow:ellipsis}
        .card[data-phase=error] .detail{white-space:normal;align-items:flex-start;overflow-wrap:anywhere}
        .format{flex:none;font-size:9px;font-weight:700;letter-spacing:.6px;line-height:14px;padding:0 5px;border-radius:4px;color:#ece8ff;background:#9a8bff40;box-shadow:inset 0 0 0 1px #beb4ff47}.format:empty{display:none}
        .bottom{display:flex;align-items:center;gap:10px;margin-top:11px;min-height:22px}
        .line{flex:1;height:3px;border-radius:3px;background:#ffffff24;overflow:hidden}
        .bar{height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#f39bc4,#9a8bff 55%,#62b0ff);box-shadow:0 0 10px #9a8bff99;transition:width .25s cubic-bezier(.3,.7,.3,1)}
        .line.waiting .bar{width:36%!important;animation:sweep 1.25s ease-in-out infinite}
        .percent{min-width:30px;text-align:right;font-size:10.5px;font-weight:600;color:#e6ecf5d9;font-variant-numeric:tabular-nums}
        .summary{flex:1;min-width:0;font-size:11px;color:#e6ecf5cc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.summary:empty{display:none}
        .open{margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:4px 9px 4px 7px;border:0;border-radius:7px;font:inherit;font-size:11px;font-weight:600;color:#eef2ff;background:#ffffff17;box-shadow:inset 0 0 0 1px #ffffff21;cursor:pointer;transition:background .2s}
        .open:hover{background:#ffffff29}.open:active{background:#ffffff1f}.open:focus-visible{outline:2px solid #b3c1ff;outline-offset:2px}
        .notice{margin-top:8px;font-size:11px;color:#ffcbc3;overflow-wrap:anywhere}.notice:empty{display:none}
        .card[data-style=compact]{display:grid;grid-template-columns:30px minmax(0,1fr) auto auto;column-gap:10px;align-items:center;padding:9px 12px}
        .card[data-style=compact] .row,.card[data-style=compact] .body,.card[data-style=compact] .head,.card[data-style=compact] .bottom{display:contents}
        .card[data-style=compact] .art{grid-area:1/1;width:30px;height:30px;border-radius:8px}.card[data-style=compact] .art svg{width:17px;height:17px}
        .card[data-style=compact] .song{grid-area:1/2;font-size:12.5px}.card[data-style=compact] .state{grid-area:1/3}
        .card[data-style=compact] .open{grid-area:1/4;width:26px;height:24px;padding:0;justify-content:center}.card[data-style=compact] .open span{display:none}
        .card[data-style=compact] .line{position:absolute;left:0;right:0;bottom:0;height:2px;border-radius:0;background:#ffffff14}
        .card[data-style=compact] .label,.card[data-style=compact] .detail,.card[data-style=compact] .percent,.card[data-style=compact] .summary{display:none}
        .card[data-style=compact][data-phase=error] .detail{display:flex;grid-area:2/2/3/5;margin-top:3px}.card[data-style=compact] .notice{grid-area:3/1/4/5;margin-top:6px}
        @keyframes pulse{50%{box-shadow:0 0 0 5px #8fb0ff00}}@keyframes sweep{from{transform:translateX(-100%)}to{transform:translateX(280%)}}
        @supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.card{background:#252b37}}
        @media(prefers-reduced-transparency:reduce),(prefers-contrast:more){.card{background:#1f2531;backdrop-filter:none;-webkit-backdrop-filter:none}.card::before,.tint{display:none}}
        @media(prefers-reduced-motion:reduce){:host{transition:none!important}.bar,.art img,.tint{transition:none}.card .state i,.line.waiting .bar{animation:none}}
        </style><section class="card" data-phase="converting" aria-label="音乐转换通知"><div class="tint"></div>
        <div class="row"><div class="art">${MARK}<img alt=""></div><div class="body"><div class="head"><span class="label">BetterDownload</span><span class="state"><i></i><span class="state-text"></span></span></div><div class="song"></div><div class="detail" aria-live="polite"><span class="format"></span><span class="detail-text"></span></div></div></div>
        <div class="bottom"><div class="line" role="progressbar" aria-label="转换进度" aria-valuemin="0" aria-valuemax="100"><div class="bar"></div></div><span class="percent"></span><span class="summary"></span><button class="open" hidden aria-label="打开文件夹">${FOLDER}<span>打开文件夹</span></button></div>
        <div class="notice" role="status"></div></section>`;
        document.body.appendChild(host);
        const q = s => shadow.querySelector(s), card = q('.card'), art = q('.art img');
        let timer, hideTimer, hovered = false, focused = false, disposed = false, visible = false, latest = null, identity = '', phase = '', artUrl = '', openError = '', idle = idleMs;
        const dismissed = new Set();
        // Keys only need to outlive the notifications that could still come back.
        function remember(key) { dismissed.add(key); if (dismissed.size > 200) dismissed.delete(dismissed.values().next().value); }
        function hide() {
            if (identity) remember(identity);
            visible = false; clearTimeout(timer); clearTimeout(hideTimer);
            host.style.transform = 'translateX(calc(100% + 28px)) scale(1)'; host.style.opacity = '0'; host.style.pointerEvents = 'none'; host.inert = true; host.dataset.hidden = 'true';
            hideTimer = setTimeout(() => { if (!visible) host.style.display = 'none'; }, 420);
        }
        function arm() { clearTimeout(timer); if (visible && !hovered && !focused) timer = setTimeout(hide, idle); }
        function show() {
            clearTimeout(hideTimer); visible = true; host.style.display = 'block'; host.inert = false; host.style.pointerEvents = 'auto'; host.dataset.hidden = 'false';
            host.getBoundingClientRect(); host.style.transform = 'translateX(0) scale(1)'; host.style.opacity = '1'; arm();
        }
        // An album-tinted glow: the cover is a same-origin blob URL, so a few averaged pixels are readable.
        function tintOf(image) {
            try {
                const canvas = document.createElement('canvas'); canvas.width = canvas.height = 6;
                const context = canvas.getContext('2d'); context.drawImage(image, 0, 0, 6, 6);
                const data = context.getImageData(0, 0, 6, 6).data, sum = [0, 0, 0];
                for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
                const rgb = sum.map(v => v / (data.length / 4)), mean = (rgb[0] + rgb[1] + rgb[2]) / 3;
                // Lift saturation and cap brightness so the glow stays a tint rather than a wash.
                const vivid = rgb.map(v => Math.max(0, Math.min(255, mean + (v - mean) * 1.5))), scale = Math.min(1, 210 / Math.max(1, ...vivid));
                return 'rgb(' + vivid.map(v => Math.round(v * scale)).join(',') + ')';
            } catch (_) { return ''; }
        }
        art.addEventListener('load', () => { art.classList.add('ready'); q('.tint').style.backgroundColor = tintOf(art); });
        art.addEventListener('error', () => { art.classList.remove('ready'); q('.tint').style.backgroundColor = ''; });
        function setArt(url) {
            if ((url || '') === artUrl) return;
            artUrl = url || ''; art.classList.remove('ready'); q('.tint').style.backgroundColor = '';
            if (artUrl) art.src = artUrl; else art.removeAttribute('src');
        }
        host.addEventListener('mouseenter', () => { hovered = true; clearTimeout(timer); });
        host.addEventListener('mousemove', () => { if (!hovered && visible) { hovered = true; clearTimeout(timer); } });
        host.addEventListener('mouseleave', () => { hovered = false; arm(); });
        shadow.addEventListener('focusin', () => { focused = true; clearTimeout(timer); });
        shadow.addEventListener('focusout', () => setTimeout(() => { if (!disposed) { focused = !!shadow.activeElement; arm(); } }, 0));
        function releaseInteraction() {
            if (disposed) return;
            if (shadow.activeElement) shadow.activeElement.blur();
            hovered = false; focused = false; arm();
        }
        // Opening Explorer can steal window focus without delivering mouseleave.
        window.addEventListener('blur', releaseInteraction);
        q('.open').onclick = async () => {
            try { if (latest && latest.folder) await openFolder(latest.folder); }
            catch (e) { openError = '无法打开：' + (e.message || e); q('.notice').textContent = openError; }
            finally { releaseInteraction(); }
        };
        return {
            update(activity) {
                if (disposed || !activity || !activity.id) return;
                const nextIdentity = activity.id, nextPhase = activity.state, changed = identity !== nextIdentity;
                const terminal = nextPhase === 'success' || nextPhase === 'error', terminalKey = nextIdentity + ':' + nextPhase;
                if (changed) { identity = nextIdentity; hovered = false; focused = false; openError = ''; }
                // Completion is one new notification; old updates can never pull a dismissed card back out.
                if ((changed && !dismissed.has(identity)) || (terminal && (changed || phase !== nextPhase) && !dismissed.has(terminalKey))) { show(); if (terminal) remember(terminalKey); }
                latest = activity; phase = nextPhase;
                const done = nextPhase === 'success', failed = nextPhase === 'error', round = activity.round;
                const percent = done ? 100 : Math.max(0, Math.min(99, Number(activity.percent) || 0));
                const waiting = !done && !failed && (percent === 0 || activity.message === '等待客户端释放文件');
                const extension = /\.(flac|mp3)$/i.exec(activity.output || '');
                card.dataset.phase = done ? 'success' : failed ? 'error' : 'converting';
                q('.state-text').textContent = done ? '已完成' : failed ? '未完成' : '转换中';
                q('.song').textContent = (activity.path || '').split(/[\\/]/).pop().replace(/\.(ncm|flac|mp3)$/i, '') || '本地音乐';
                q('.format').textContent = failed ? '' : activity.format || (extension ? extension[1].toUpperCase() : '');
                q('.detail-text').textContent = done ? '原音质已保留 · 音乐已就绪' : failed ? activity.message : activity.message === '等待客户端释放文件' ? activity.message
                    : round ? '第 ' + round.position + ' 首' + (round.pending > 1 ? ' · 还剩 ' + (round.pending - 1) + ' 首' : '') : '正在整理音频与封面';
                q('.summary').textContent = done && round ? '本轮 ' + round.converted + ' 首' + (round.failed ? ' · ' + round.failed + ' 首未完成' : '') : '';
                const line = q('.line');
                q('.bar').style.width = percent + '%'; line.classList.toggle('waiting', waiting);
                if (waiting) line.removeAttribute('aria-valuenow'); else line.setAttribute('aria-valuenow', String(percent));
                line.hidden = done || failed; q('.percent').hidden = done || failed || waiting; q('.percent').textContent = percent + '%';
                q('.open').hidden = !done || !activity.folder;
                q('.bottom').hidden = failed || (done && !activity.folder && !round);
                q('.notice').textContent = openError || (done && activity.warning ? activity.warning : '');
                setArt(activity.art);
            }, hide,
            // compact: one row about half as tall; stay: how long an untouched card remains, in milliseconds.
            configure({ compact, stay }) {
                card.dataset.style = compact ? 'compact' : 'standard';
                idle = stay > 0 ? stay : idleMs;
                if (visible) arm();
            },
            dispose() { disposed = true; clearTimeout(timer); clearTimeout(hideTimer); window.removeEventListener('blur', releaseInteraction); host.remove(); }
        };
    };
    // Shared with the settings page so both show the same mark.
    root.NBDProgressCard.mark = MARK;
})(window);
