plugin.onLoad(() => {
    try {
        // 1. 注入独立硬件加速图层与溢出裁切样式
        let hasMaterialYou = false;
        const styleEl = document.createElement('style');
        styleEl.id = 'fluent-progress-bar-style';

        function updateStyle(force) {
            let detected = false;
            try {
                detected = (typeof loadedPlugins !== 'undefined' && loadedPlugins && ("MaterialYouTheme" in loadedPlugins));
            } catch {}
            if (!force && detected === hasMaterialYou) return;
            hasMaterialYou = detected;
            const hideOverflow = !hasMaterialYou ? "overflow-x: hidden;" : "";
            styleEl.textContent = `
                .m-player .prg { ${hideOverflow} }
                .m-player .prg .has {
                    width: 100% !important;
                    will-change: transform !important;
                }
                .m-player-fm .prg { ${hideOverflow} }
                .m-player-fm .prg .has {
                    width: 100% !important;
                    will-change: transform !important;
                }
            `;
        }

        updateStyle(true);
        document.head.appendChild(styleEl);

        // 限制最高 ~60 FPS，兼容 60Hz VSync 抖动并杜绝高刷屏幕下高频 D3D11 Present 负载
        const FRAME_INTERVAL = 1000 / 62;
        const MAX_EXTRAPOLATE_SEC = 1.5;

        let totalDuration = 0;
        let lastAudioProgress = 0;
        let lastAudioTimestamp = 0;
        let renderedSec = 0;
        let isPlaying = false;
        let isSeeking = false;
        let seekTimer = null;
        let rafId = null;
        let lastFrameTime = 0;
        let lastTransStr = '';

        const trackedBars = new Set();

        function applyTransform(ratio) {
            const pct = Math.max(0, Math.min(1, ratio)) * 100;
            const offset = (-100 + pct).toFixed(3);
            const transStr = `translate3d(${offset}%, 0, 0)`;
            if (transStr === lastTransStr) return;
            lastTransStr = transStr;

            for (const el of trackedBars) {
                if (el.isConnected) {
                    el.style.transform = transStr;
                } else {
                    trackedBars.delete(el);
                }
            }
        }

        function renderFrame(now) {
            if (!isPlaying || isSeeking || document.hidden || totalDuration <= 0) {
                rafId = null;
                return;
            }

            rafId = requestAnimationFrame(renderFrame);

            // 60FPS 节流控制（容忍 60Hz VSync 微小抖动）
            if (now - lastFrameTime < FRAME_INTERVAL) return;
            lastFrameTime = now;

            const elapsedSec = Math.min(MAX_EXTRAPOLATE_SEC, Math.max(0, (now - lastAudioTimestamp) / 1000));
            let currentSec = Math.min(totalDuration, lastAudioProgress + elapsedSec);

            // 消除 IPC 微小延迟导致的进度条瞬间回退抖动，同时保留 >=0.25s 的真实回退/重播
            if (currentSec < renderedSec && (renderedSec - currentSec) < 0.25) {
                currentSec = renderedSec;
            } else {
                renderedSec = currentSec;
            }

            const ratio = currentSec / totalDuration;
            applyTransform(ratio);
        }

        function startRender() {
            if (!rafId && isPlaying && !isSeeking && !document.hidden && totalDuration > 0) {
                lastFrameTime = 0;
                rafId = requestAnimationFrame(renderFrame);
            }
        }

        function stopRender() {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        function tryParseDurationFromDOM() {
            const timeEls = document.querySelectorAll('.m-player .time, .m-player-fm .time, #main-player .time');
            for (let i = 0; i < timeEls.length; i++) {
                const text = timeEls[i].textContent;
                if (!text) continue;
                const match = text.match(/(\d+):(\d+)\s*$/);
                if (match) {
                    const mins = parseInt(match[1], 10);
                    const secs = parseInt(match[2], 10);
                    const dur = mins * 60 + secs;
                    if (Number.isFinite(dur) && dur > 0) {
                        totalDuration = dur;
                        return true;
                    }
                }
            }
            return false;
        }

        function registerBar(eleHas) {
            if (!eleHas || trackedBars.has(eleHas)) return;
            trackedBars.add(eleHas);

            const currentRatio = totalDuration > 0 ? Math.max(0, Math.min(1, renderedSec / totalDuration)) : 0;
            const offset = (-100 + currentRatio * 100).toFixed(3);
            eleHas.style.transform = `translate3d(${offset}%, 0, 0)`;
            lastTransStr = '';

            const elePrg = eleHas.closest('.prg') || eleHas.parentElement;
            if (elePrg && !elePrg._fpbBound) {
                elePrg._fpbBound = true;

                let dragging = false;
                let dragRect = null;
                let lastSeekRatio = 0;

                const updateSeek = (e) => {
                    const rect = (dragRect && dragRect.width > 0) ? dragRect : elePrg.getBoundingClientRect();
                    if (rect.width > 0) {
                        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        lastSeekRatio = ratio;
                        applyTransform(ratio);
                    }
                };

                const onPointerMove = (e) => {
                    if (dragging) updateSeek(e);
                };

                const onPointerUp = () => {
                    if (!dragging) return;
                    dragging = false;
                    dragRect = null;
                    window.removeEventListener('pointermove', onPointerMove);
                    window.removeEventListener('pointerup', onPointerUp);
                    window.removeEventListener('pointercancel', onPointerUp);
                    window.removeEventListener('blur', onPointerUp);

                    if (totalDuration > 0) {
                        lastAudioProgress = lastSeekRatio * totalDuration;
                        lastAudioTimestamp = performance.now();
                        renderedSec = lastAudioProgress;
                    }

                    if (seekTimer) clearTimeout(seekTimer);
                    seekTimer = setTimeout(() => {
                        seekTimer = null;
                        isSeeking = false;
                        startRender();
                    }, 50);
                };

                elePrg.addEventListener('pointerdown', (e) => {
                    if (e.button !== 0) return;
                    if (seekTimer) {
                        clearTimeout(seekTimer);
                        seekTimer = null;
                    }
                    dragging = true;
                    isSeeking = true;
                    dragRect = elePrg.getBoundingClientRect();
                    stopRender();
                    updateSeek(e);

                    window.addEventListener('pointermove', onPointerMove);
                    window.addEventListener('pointerup', onPointerUp);
                    window.addEventListener('pointercancel', onPointerUp);
                    window.addEventListener('blur', onPointerUp);
                });
            }
        }

        function scanBars() {
            updateStyle(false);
            const bars = document.querySelectorAll('.m-player .prg .has, .m-player-fm .prg .has, #main-player .prg .has, .prg .has');
            for (let i = 0; i < bars.length; i++) {
                registerBar(bars[i]);
            }
        }

        if (typeof legacyNativeCmder !== 'undefined' && legacyNativeCmder && typeof legacyNativeCmder.appendRegisterCall === 'function') {
            legacyNativeCmder.appendRegisterCall('Load', 'audioplayer', (_, info) => {
                if (info && Number.isFinite(info.duration) && info.duration > 0) {
                    totalDuration = info.duration;
                    lastAudioProgress = 0;
                    renderedSec = 0;
                    lastAudioTimestamp = performance.now();
                    lastTransStr = '';
                    scanBars();
                    applyTransform(0);
                }
            });

            legacyNativeCmder.appendRegisterCall('PlayProgress', 'audioplayer', (_, progress) => {
                if (!Number.isFinite(progress) || progress < 0) return;
                if (trackedBars.size === 0) scanBars();
                if (totalDuration <= 0) {
                    tryParseDurationFromDOM();
                }
                if (totalDuration <= 0 || isSeeking) return;

                const now = performance.now();
                if (!isPlaying && lastAudioTimestamp > 0) {
                    const wallDelta = (now - lastAudioTimestamp) / 1000;
                    const progDelta = progress - lastAudioProgress;
                    if (wallDelta > 0.05 && wallDelta < 1.5 && progDelta > 0.05 && progDelta < 1.5) {
                        isPlaying = true;
                        startRender();
                    }
                }

                lastAudioProgress = progress;
                lastAudioTimestamp = now;

                if (progress < renderedSec - 0.25 || !isPlaying) {
                    renderedSec = progress;
                }

                if (!isPlaying) {
                    applyTransform(progress / totalDuration);
                }
            });

            legacyNativeCmder.appendRegisterCall('PlayState', 'audioplayer', (_, __, state) => {
                const now = performance.now();
                scanBars();
                if (state === 1) {
                    isPlaying = true;
                    lastAudioTimestamp = now;
                    startRender();
                } else {
                    if (isPlaying) {
                        const elapsed = Math.min(MAX_EXTRAPOLATE_SEC, Math.max(0, (now - lastAudioTimestamp) / 1000));
                        lastAudioProgress = totalDuration > 0
                            ? Math.min(totalDuration, lastAudioProgress + elapsed)
                            : lastAudioProgress + elapsed;
                        renderedSec = lastAudioProgress;
                    }
                    isPlaying = false;
                    lastAudioTimestamp = now;
                    stopRender();
                }
            });
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopRender();
            } else {
                scanBars();
                if (isPlaying) {
                    startRender();
                } else if (totalDuration > 0) {
                    applyTransform(lastAudioProgress / totalDuration);
                }
            }
        });

        window.addEventListener('hashchange', scanBars);

        // 启动时扫描并轮询定位播放器元素，后续通过事件按需注册
        scanBars();
        let pollCount = 0;
        const pollTimer = setInterval(() => {
            pollCount++;
            scanBars();
            if (pollCount >= 30 && trackedBars.size > 0) {
                clearInterval(pollTimer);
            }
        }, 500);

    } catch (err) {
        console.error("[FluentProgressBar] Error:", err);
    }
});

plugin.onConfig(() => {
    const el = document.createElement('div');
    el.style.padding = '10px 0';
    el.innerHTML = `
        <h4 style="margin: 0 0 8px 0; font-weight: bold;">FluentProgressBar (优化版)</h4>
        <p style="margin: 0 0 12px 0; color: #888; font-size: 13px;">
            让你的进度条更顺滑！(优化版)
        </p>
        <div style="display: flex; gap: 10px;">
            <button id="fpb-open-repo" class="u-ibtn5 u-ibtnsz8">源码仓库 (GitHub)</button>
            <button id="fpb-open-issue" class="u-ibtn5 u-ibtnsz8">问题反馈 (Issues)</button>
        </div>
    `;
    el.querySelector('#fpb-open-repo').onclick = () => {
        betterncm.ncm.openUrl('https://github.com/In-dor/FluentProgessBar');
    };
    el.querySelector('#fpb-open-issue').onclick = () => {
        betterncm.ncm.openUrl('https://github.com/In-dor/FluentProgessBar/issues');
    };
    return el;
});
