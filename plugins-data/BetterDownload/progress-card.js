(function (root) {
    'use strict';
    root.NBDProgressCard = function ({ openFolder, idleMs = 6000 }) {
        const host = document.createElement('div'); host.id = 'nbd-progress-card';
        host.style.cssText = 'position:fixed;right:18px;bottom:100px;width:270px;max-width:calc(100vw - 32px);z-index:2147483000;display:none;opacity:0;transform:translateX(22px);transition:transform .35s cubic-bezier(.2,.7,.2,1),opacity .3s;';
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = `<style>
        :host{font:12px/1.5 "Segoe UI Variable Text","Segoe UI","Microsoft YaHei UI","Microsoft YaHei",sans-serif;color:#f5f7fa;color-scheme:dark;-webkit-font-smoothing:antialiased}*{box-sizing:border-box}
        .card{position:relative;overflow:hidden;padding:13px 15px;border:1px solid #ffffff38;border-radius:12px;background:linear-gradient(135deg,#ffffff08,#ffffff00 65%),rgba(15,22,32,.62);box-shadow:0 10px 28px #0002,0 2px 6px #0002,inset 0 1px 0 #ffffff20;backdrop-filter:blur(28px) saturate(140%);-webkit-backdrop-filter:blur(28px) saturate(140%)}
        .card::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.025;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Cpath fill='%23fff' filter='url(%23n)' d='M0 0h160v160H0z'/%3E%3C/svg%3E")}
        .card>div{position:relative}.head{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}.label{font-size:10px;font-weight:600;letter-spacing:.15px;color:#dce5f2}.state{font-size:10px;color:#e1e7ef}
        .song{font-size:13px;font-weight:600;letter-spacing:.1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px}.detail{font-size:11px;color:#e1e5ed;min-height:16.5px;overflow-wrap:anywhere}
        .bottom{display:flex;justify-content:flex-end;align-items:center;margin-top:10px;gap:10px}.line{height:2px;flex:1;border-radius:2px;background:#ffffff24;overflow:hidden}.bar{height:100%;background:#dfebff;transition:width .18s}.percent{font-size:10px;color:#e1e7ef;min-width:28px;text-align:right;font-variant-numeric:tabular-nums}
        .open{font:inherit;font-size:11px;font-weight:500;color:#edf3ff;background:transparent;border:0;padding:0;cursor:pointer}.open:hover{color:#fff;text-decoration:underline;text-underline-offset:3px}.open:focus-visible{outline:1px solid #dbeaff;outline-offset:4px;border-radius:2px}.open span{margin-left:5px}.notice{color:#ffd4cd;font-size:11px;margin-top:7px;overflow-wrap:anywhere}.notice:empty{display:none}
        @supports not (backdrop-filter:blur(1px)){.card{background:#292f39}}
        @media(prefers-reduced-transparency:reduce),(prefers-contrast:more){.card{background:#242a34;backdrop-filter:none;-webkit-backdrop-filter:none}.card::before{display:none}}
        @media(prefers-reduced-motion:reduce){:host{transition:none!important}.bar{transition:none}}
        </style><section class="card" aria-label="音乐转换通知"><div class="head"><span class="label">BetterDownload</span><span class="state"></span></div><div class="song"></div><div class="detail" aria-live="polite"></div><div class="bottom"><div class="line" role="progressbar" aria-label="转换进度" aria-valuemin="0" aria-valuemax="100"><div class="bar"></div></div><span class="percent"></span><button class="open" hidden>打开文件夹<span aria-hidden="true">↗</span></button></div><div class="notice" role="status"></div></section>`;
        document.body.appendChild(host);
        const q = s => shadow.querySelector(s);
        let timer, hideTimer, hovered = false, focused = false, disposed = false, visible = false, latest = null, identity = '', phase = '';
        const dismissed = new Set();
        function hide() {
            if (identity) dismissed.add(identity);
            visible = false; clearTimeout(timer); clearTimeout(hideTimer);
            host.style.transform = 'translateX(calc(100% + 28px))'; host.style.opacity = '0'; host.style.pointerEvents = 'none'; host.inert = true; host.dataset.hidden = 'true';
            hideTimer = setTimeout(() => { if (!visible) host.style.display = 'none'; }, 350);
        }
        function arm() { clearTimeout(timer); if (visible && !hovered && !focused) timer = setTimeout(hide, idleMs); }
        function show() {
            clearTimeout(hideTimer); visible = true; host.style.display = 'block'; host.inert = false; host.style.pointerEvents = 'auto'; host.dataset.hidden = 'false';
            host.getBoundingClientRect(); host.style.transform = 'translateX(0)'; host.style.opacity = '1'; arm();
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
            try { if (latest && latest.output) await openFolder(latest.output); }
            catch (e) { q('.notice').textContent = '无法打开：' + (e.message || e); }
            finally { releaseInteraction(); }
        };
        return {
            update(activity) {
                if (disposed || !activity || !activity.id) return;
                const nextIdentity = activity.id, nextPhase = activity.state, changed = identity !== nextIdentity;
                const terminal = nextPhase === 'success' || nextPhase === 'error', terminalKey = nextIdentity + ':' + nextPhase;
                if (changed) { identity = nextIdentity; hovered = false; focused = false; }
                // Completion is one new notification; old updates can never pull a dismissed card back out.
                if ((changed && !dismissed.has(identity)) || (terminal && (changed || phase !== nextPhase) && !dismissed.has(terminalKey))) { show(); if (terminal) dismissed.add(terminalKey); }
                latest = activity; phase = nextPhase;
                const done = nextPhase === 'success', failed = nextPhase === 'error';
                const percent = done ? 100 : Math.max(0, Math.min(99, Number(activity.percent) || 0));
                q('.state').textContent = done ? '已完成' : failed ? '未完成' : '转换中';
                q('.song').textContent = (activity.path || '').split(/[\\/]/).pop().replace(/\.(ncm|flac|mp3)$/i, '') || '本地音乐';
                q('.detail').textContent = done ? '原音质已保留 · 音乐已就绪' : failed ? activity.message : activity.message === '等待客户端释放文件' ? activity.message : '正在整理音频与封面';
                q('.bar').style.width = percent + '%'; q('.line').setAttribute('aria-valuenow', String(percent));
                q('.line').hidden = done; q('.percent').hidden = done; q('.percent').textContent = percent + '%';
                q('.open').hidden = !done || !activity.output;
            }, hide,
            dispose() { disposed = true; clearTimeout(timer); clearTimeout(hideTimer); window.removeEventListener('blur', releaseInteraction); host.remove(); }
        };
    };
})(window);
