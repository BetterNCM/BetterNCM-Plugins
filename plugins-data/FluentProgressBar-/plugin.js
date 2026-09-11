plugin.onLoad(() => {
    try {
        // 1. 注入独立硬件加速图层与溢出裁切样式
        let hasMaterialYou = false;
        try {
            hasMaterialYou = (typeof loadedPlugins !== 'undefined' && loadedPlugins && ("MaterialYouTheme" in loadedPlugins));
        } catch {}

        const styleEl = document.createElement('style');
        const hideOverflow = !hasMaterialYou ? "overflow-x: hidden;" : "";
        styleEl.id = 'fluent-progress-bar-style';
        styleEl.innerHTML = `
            .m-player .prg { ${hideOverflow} }
            .m-player .prg .has {
                width: 100% !important;
                transform-origin: left center !important;
                will-change: transform !important;
            }
            .m-player-fm .prg { ${hideOverflow} }
            .m-player-fm .prg .has {
                width: 100% !important;
                transform-origin: left center !important;
                will-change: transform !important;
            }
        `;
        document.head.appendChild(styleEl);

        // 限制最高 60 FPS，杜绝 160Hz 屏幕下高频 D3D11 Present 导致的额外负载
        const TARGET_FPS = 60;
        const FRAME_INTERVAL = 1000 / TARGET_FPS;

        let totalDuration = 0;
        let lastAudioProgress = 0;
        let lastAudioTimestamp = 0;
        let isPlaying = false;
        let isSeeking = false;
        let rafId = null;
        let lastFrameTime = 0;

        const trackedBars = new Set();

        function applyTransform(ratio) {
            const pct = Math.max(0, Math.min(1, ratio)) * 100;
            const transStr = `translateX(${-100 + pct}%)`;
            for (const el of trackedBars) {
                if (document.contains(el)) {
                    // 仅对当前可见元素刷新，跳过后台隐藏的进度条容器
                    if (el.offsetParent !== null) {
                        el.style.transform = transStr;
                    }
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

            // 60FPS 节流控制
            if (now - lastFrameTime < FRAME_INTERVAL) return;
            lastFrameTime = now - ((now - lastFrameTime) % FRAME_INTERVAL);

            const elapsedSec = (now - lastAudioTimestamp) / 1000;
            const currentSec = lastAudioProgress + elapsedSec;
            const ratio = currentSec / totalDuration;

            applyTransform(ratio);
        }

        function startRender() {
            if (!rafId && isPlaying && !isSeeking && !document.hidden && totalDuration > 0) {
                lastFrameTime = performance.now();
                rafId = requestAnimationFrame(renderFrame);
            }
        }

        function stopRender() {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        function registerBar(eleHas) {
            if (!eleHas || trackedBars.has(eleHas)) return;
            trackedBars.add(eleHas);
            eleHas.style.transform = 'translateX(-100%)';

            const elePrg = eleHas.closest('.prg') || eleHas.parentElement;
            if (elePrg && !elePrg._fpbBound) {
                elePrg._fpbBound = true;

                let dragging = false;
                const updateSeek = (e) => {
                    const rect = elePrg.getBoundingClientRect();
                    if (rect.width > 0) {
                        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        applyTransform(ratio);
                    }
                };

                const onPointerMove = (e) => {
                    if (dragging) updateSeek(e);
                };

                const onPointerUp = () => {
                    if (dragging) {
                        dragging = false;
                        window.removeEventListener('pointermove', onPointerMove);
                        window.removeEventListener('pointerup', onPointerUp);
                        window.removeEventListener('pointercancel', onPointerUp);

                        setTimeout(() => {
                            isSeeking = false;
                            startRender();
                        }, 50);
                    }
                };

                elePrg.addEventListener('pointerdown', (e) => {
                    if (e.button !== 0) return;
                    dragging = true;
                    isSeeking = true;
                    stopRender();
                    updateSeek(e);

                    window.addEventListener('pointermove', onPointerMove);
                    window.addEventListener('pointerup', onPointerUp);
                    window.addEventListener('pointercancel', onPointerUp);
                });
            }
        }

        legacyNativeCmder.appendRegisterCall('Load', 'audioplayer', (_, info) => {
            if (info && typeof info.duration === 'number' && info.duration > 0) {
                totalDuration = info.duration;
                lastAudioProgress = 0;
                lastAudioTimestamp = performance.now();
                applyTransform(0);
            }
        });

        legacyNativeCmder.appendRegisterCall('PlayProgress', 'audioplayer', (_, progress) => {
            if (typeof progress !== 'number' || progress < 0 || totalDuration <= 0) return;
            lastAudioProgress = progress;
            lastAudioTimestamp = performance.now();

            if (!isPlaying) {
                applyTransform(progress / totalDuration);
            }
        });

        legacyNativeCmder.appendRegisterCall('PlayState', 'audioplayer', (_, __, state) => {
            if (state === 1) {
                isPlaying = true;
                lastAudioTimestamp = performance.now();
                startRender();
            } else if (state === 2) {
                isPlaying = false;
                stopRender();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopRender();
            } else {
                if (isPlaying) {
                    lastAudioTimestamp = performance.now();
                    startRender();
                }
            }
        });

        // 轮询定位播放器元素
        let pollCount = 0;
        const pollTimer = setInterval(() => {
            pollCount++;
            const mPlayerHas = document.querySelector('.m-player .prg .has');
            const mainPlayerHas = document.querySelector('#main-player .prg .has');
            const anyPrgHas = document.querySelector('.prg .has');
            const fmPrgHas = document.querySelector('.m-player-fm .prg .has');

            const target = mPlayerHas || mainPlayerHas || anyPrgHas;
            if (target) registerBar(target);
            if (fmPrgHas) registerBar(fmPrgHas);

            if (pollCount > 30 && trackedBars.size > 0) {
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
