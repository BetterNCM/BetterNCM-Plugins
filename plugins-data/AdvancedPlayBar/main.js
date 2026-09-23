/* ============================================================
 * AdvancedPlayBar — 网易云音乐 BetterNCM 播放栏增强插件
 * 功能：透明播放栏、进度条动效、全局主题色自定义
 * 兼容环境：CEF 91 (Chromium 91，不支持 CSS :has())
 * ============================================================ */

(function () {
    'use strict';

    var CONFIG_KEY = 'advanced-playbar-settings';
    var STYLE_ID = 'apb-style';

    var REPO_URL = 'https://github.com/FinaFina233/AdvancedPlayBar';
    var ISSUES_URL = REPO_URL + '/issues';

    var SCOPE = '#page_pc_mini_bar';

    // 毛玻璃宿主类名（毛玻璃写在播放栏父容器上，不写播放栏本身，见 buildBarCss）
    var BLUR_HOST_CLS = 'apb-blur-host';

    // 播放栏选择器（包含静态类名及 CSS Module 动态哈希前缀，使用 *= 兼容跨版本）
    var BAR_SELECTORS = '.default-bar-wrapper, [class*="DefaultBarWrapper_"]';

    function defaults() {
        return {
            // 透明播放栏
            barEnabled: true,
            opacity: 0.1,           // 不透明度 (0 - 1)
            blur: 5,                // 背景模糊半径 (px)
            compatMode: false,      // 兼容模式：使用内联样式 + MutationObserver 兜底

            // 进度条与动效
            hoverEnabled: true,
            duration: 180,          // 动画过渡时长 (ms)
            glow: true,             // 悬停柔光效果
            accentMode: 'theme',    // 颜色来源：'theme' (跟随主题) | 'custom' (自定义)
            accentRgb: { r: 236, g: 65, b: 65 },
            maskGlow: 0.05,         // 悬停背景渐变遮罩强度 (0 = 完全无辉光/无描边)

            // 已播放进度颜色
            playedMode: 'theme',    // 'theme' (跟随颜色来源) | 'custom' (自定义)
            playedRgb: { r: 236, g: 65, b: 65 },
            // 未播放进度颜色，默认不干预（保持客户端原色）
            unplayedMode: 'native', // 'native' (保持原版) | 'custom' (自定义)
            unplayedRgb: { r: 45, g: 45, b: 56 },

            // 全局主题色（作用于客户端内联 CSS 变量）
            themeMode: 'native',    // 'native' (原生不干预) | 'custom' (自定义)
            themeRgb: { r: 236, g: 65, b: 65 }
        };
    }

    var state = defaults();
    var styleEl = null;

    var observer = null;
    var barEl = null;
    var inlineApplied = false;

    /* ------------------------------------------------------------
     * 配置持久化
     * ---------------------------------------------------------- */
    function api() {
        return (typeof betterncm !== 'undefined' && betterncm) ? betterncm : null;
    }

    function isPlainObject(v) {
        return !!v && typeof v === 'object' && !Array.isArray(v);
    }

    /**
     * 读取配置：以 localStorage 为主，BetterNCM config 为兜底
     */
    function loadSettings(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            if (raw !== null && raw !== '' && raw !== '[object Object]') {
                var parsed = JSON.parse(raw);
                if (isPlainObject(parsed)) return Promise.resolve(parsed);
            }
        } catch (e) { }

        var b = api();
        try {
            if (b && b.app && typeof b.app.readConfig === 'function') {
                return Promise.resolve(b.app.readConfig(key, null)).then(function (v) {
                    if (isPlainObject(v)) return v;
                    if (typeof v === 'string' && v && v !== '[object Object]') {
                        try {
                            var p2 = JSON.parse(v);
                            if (isPlainObject(p2)) return p2;
                        } catch (e2) { }
                    }
                    return fallback;
                }).catch(function () { return fallback; });
            }
        } catch (e3) { }

        return Promise.resolve(fallback);
    }

    /**
     * 保存配置：同时写入 localStorage 与 BetterNCM 配置系统（需序列化为字符串）
     */
    function saveSettings(key, value) {
        var json = null;
        try { json = JSON.stringify(value); } catch (e) { }

        if (json !== null) {
            try { localStorage.setItem(key, json); } catch (e2) { }
        }

        var b = api();
        try {
            if (b && b.app && typeof b.app.writeConfig === 'function' && json !== null) {
                b.app.writeConfig(key, json);
            }
        } catch (e3) { }
    }

    function clamp(n, min, max, fallback) {
        n = Number(n);
        if (!isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    }

    /* ------------------------------------------------------------
     * 颜色转换工具
     * ---------------------------------------------------------- */
    function clampByte(n, fallback) {
        return Math.round(clamp(n, 0, 255, fallback));
    }

    function rgbToHex(rgb) {
        return '#' + rgb.map(function (v) {
            var s = clampByte(v, 0).toString(16);
            return s.length === 1 ? '0' + s : s;
        }).join('');
    }

    function hexToRgb(hex) {
        if (typeof hex !== 'string') return null;
        var m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (!m) return null;
        var h = m[1];
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        var v = parseInt(h, 16);
        return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
    }

    function hsvToRgb(h, s, v) {
        h = ((h % 360) + 360) % 360;
        s = Math.min(1, Math.max(0, s));
        v = Math.min(1, Math.max(0, v));
        var c = v * s;
        var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        var m = v - c;
        var r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; }
        else if (h < 120) { r = x; g = c; }
        else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; }
        else if (h < 300) { r = x; b = c; }
        else { r = c; b = x; }
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }

    function rgbToHsv(r, g, b) {
        r = clampByte(r, 0) / 255;
        g = clampByte(g, 0) / 255;
        b = clampByte(b, 0) / 255;
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        var d = mx - mn;
        var h = 0;
        if (d !== 0) {
            if (mx === r) h = 60 * (((g - b) / d) % 6);
            else if (mx === g) h = 60 * ((b - r) / d + 2);
            else h = 60 * ((r - g) / d + 4);
        }
        if (h < 0) h += 360;
        return { h: h, s: mx === 0 ? 0 : d / mx, v: mx };
    }

    function cssVar(name) {
        try {
            var v = getComputedStyle(document.documentElement).getPropertyValue(name);
            return v ? v.trim() : '';
        } catch (e) { return ''; }
    }

    /**
     * 解析颜色字符串，支持 hex 与 rgba(r,g,b,a)
     */
    function parseColor(str) {
        if (typeof str !== 'string') return null;
        var s = str.trim();
        if (!s) return null;

        var m = s.match(/rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i);
        if (m) return [clampByte(+m[1], 0), clampByte(+m[2], 0), clampByte(+m[3], 0)];

        var h = hexToRgb(s);
        if (h) return [h.r, h.g, h.b];
        return null;
    }

    /* ------------------------------------------------------------
     * 全局主题色覆写
     * ---------------------------------------------------------- */
    var BASES = ['main', 'sec1', 'sec2', 'sec3'];

    // 需覆盖的客户端原生变量列表: [变量名, 基色索引, alpha]
    var THEME_VARS = [
        ['--colorPrimary1', 'main', 1],
        ['--colorPrimary2', 'main', 0.9],
        ['--colorPrimary3', 'main', 0.8],
        ['--colorPrimary4', 'main', 0.6],
        ['--colorPrimary5', 'main', 0.4],
        ['--colorPrimary6', 'main', 0.3],
        ['--colorPrimary7', 'main', 0.1],
        ['--colorPrimary8', 'main', 0.08],

        ['--colorSecondary1_1', 'main', 1],
        ['--colorSecondary1_2', 'sec1', 1],

        ['--colorSecondary2_1', 'main', 1],
        ['--colorSecondary2_2', 'sec2', 1],
        ['--colorSecondary2_3', 'sec3', 1],
        ['--colorSecondary2_4', 'main', 1],

        ['--colorSecondary3_1', 'sec1', 1],
        ['--colorSecondary3_3', 'sec2', 1],

        ['--colorSecondary4', 'sec3', 1],

        ['--colorSidebar9', 'main', 1],
        ['--colorSidebar10', 'sec1', 1],
        ['--colorSidebar11', 'main', 1],
        ['--colorSidebar12', 'sec1', 1],

        ['--colorFunction11', 'main', 1],
        ['--colorFunction12', 'sec1', 1],
        ['--colorFunction13', 'sec2', 1],
        ['--colorFunction14', 'sec3', 1]
    ];

    /**
     * 基于主色派生辅助主题色
     */
    function deriveBases(rgb) {
        var hsv = rgbToHsv(rgb[0], rgb[1], rgb[2]);
        var h = hsv.h, s = hsv.s, v = hsv.v;

        function at(dh, ds, dv) {
            return hsvToRgb((h + dh + 360) % 360,
                Math.min(1, Math.max(0, s * ds)),
                Math.min(1, Math.max(0, v * dv)));
        }
        return {
            main: rgb,
            sec1: at(-8, 0.92, 1.05),
            sec2: at(14, 0.85, 1.10),
            sec3: at(-22, 0.75, 1.18)
        };
    }

    function fmt(c, a) {
        var r = clampByte(c[0], 0), g = clampByte(c[1], 0), b = clampByte(c[2], 0);
        if (a >= 1) return 'rgba(' + r + ',' + g + ',' + b + ',1)';
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    /**
     * 生成主题色覆写 CSS（使用 !important 覆盖客户端写在 <html> 上的内联样式）
     */
    function themeCss() {
        if (state.themeMode !== 'custom') return '';
        var t = state.themeRgb || {};
        var rgb = [clampByte(t.r, 236), clampByte(t.g, 65), clampByte(t.b, 65)];
        var bases = deriveBases(rgb);

        var out = [];
        out.push(':root, html, body {');
        THEME_VARS.forEach(function (row) {
            var name = row[0], baseKey = row[1], alpha = row[2];
            out.push('  ' + name + ': ' + fmt(bases[baseKey], alpha) + ' !important;');
        });
        out.push('  --apb-accent: ' + rgbToHex(rgb) + ';');
        out.push('  --apb-accent-rgb: ' + rgb.join(', ') + ';');
        out.push('}');
        return out.join('\n');
    }

    /**
     * 解析当前生效的强调色（优先级：自选 > 插件主题色 > GlassTheme 变量 > 客户端变量 > 默认兜底）
     */
    function resolveAccent() {
        if (state.accentMode === 'custom') {
            var c = state.accentRgb || {};
            var rgb = [clampByte(c.r, 236), clampByte(c.g, 65), clampByte(c.b, 65)];
            return { hex: rgbToHex(rgb), rgb: rgb, source: '自选颜色' };
        }

        if (state.themeMode === 'custom') {
            var t = state.themeRgb || {};
            var trgb = [clampByte(t.r, 236), clampByte(t.g, 65), clampByte(t.b, 65)];
            return { hex: rgbToHex(trgb), rgb: trgb, source: '插件自定义主题色' };
        }

        var gtHex = cssVar('--gt-accent-hex');
        var g1 = parseColor(gtHex);
        if (g1) return { hex: rgbToHex(g1), rgb: g1, source: 'GlassTheme (--gt-accent-hex)' };

        var g2 = parseColor(cssVar('--gt-accent'));
        if (g2) return { hex: rgbToHex(g2), rgb: g2, source: 'GlassTheme (--gt-accent)' };

        var clientVars = ['--colorPrimary1', '--colorSecondary1_1', '--colorSecondary2_2'];
        for (var i = 0; i < clientVars.length; i++) {
            var got = parseColor(cssVar(clientVars[i]));
            if (got) {
                return { hex: rgbToHex(got), rgb: got, source: '客户端 ' + clientVars[i] };
            }
        }

        return { hex: '#ff3a3a', rgb: [255, 58, 58], source: '默认兜底' };
    }

    /* ------------------------------------------------------------
     * CSS 生成模块
     * ---------------------------------------------------------- */

    /**
     * 生成播放栏透明化样式
     */
    function buildBarCss() {
        if (!state.barEnabled) return '';

        var bg = 'rgba(0, 0, 0, ' + clamp(state.opacity, 0, 1, 0.1) + ')';
        var blur = clamp(state.blur, 0, 60, 5);
        var L = [];

        L.push(':is(.default-bar-wrapper, [class*="DefaultBarWrapper_"]) {');
        L.push('  background: ' + bg + ' !important;');
        L.push('  background-color: ' + bg + ' !important;');
        L.push('  background-image: none !important;');
        // 毛玻璃不写播放栏上：backdrop-filter 会创建层叠上下文，把白点盖住
        L.push('  backdrop-filter: none !important;');
        L.push('  -webkit-backdrop-filter: none !important;');
        L.push('}');

        // 毛玻璃改写在父容器上（类名由 syncBlurHost 添加）
        if (blur > 0) {
            L.push('.' + BLUR_HOST_CLS + ' {');
            L.push('  backdrop-filter: blur(' + blur + 'px) !important;');
            L.push('  -webkit-backdrop-filter: blur(' + blur + 'px) !important;');
            L.push('}');
        }

        // 清理潜在背景容器的背景色
        L.push(':is(.default-bar-wrapper, [class*="DefaultBarWrapper_"]) :is(.default-bar-bg, [class*="BarBG"], [class*="bar-bg"]) {');
        L.push('  background: transparent !important;');
        L.push('}');

        // 兼容第三方皮肤（如 BGEnhanced）预制透明开关
        L.push('.prefab-transparency :is(.default-bar-wrapper, [class*="DefaultBarWrapper_"]) {');
        L.push('  background: ' + bg + ' !important;');
        L.push('}');

        return L.join('\n');
    }

    /**
     * 生成进度条动效与悬停样式
     */
    function buildHoverCss() {
        if (!state.hoverEnabled) return '';

        var d = clamp(state.duration, 0, 1000, 180);
        var ease = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
        var L = [];

        var acc = resolveAccent();
        var accHex = acc.hex || '#ff3a3a';
        var accRgb = acc.rgb ? acc.rgb.join(', ') : '236, 65, 65';

        var baseRgb = acc.rgb || [236, 65, 65];
        var ar = baseRgb[0], ag = baseRgb[1], ab = baseRgb[2];
        function lit(alpha) {
            return 'rgba(' + ar + ',' + ag + ',' + ab + ',' + alpha + ')';
        }

        L.push(SCOPE + ' {');
        L.push('  --apb-accent: ' + accHex + ';');
        L.push('  --apb-accent-rgb: ' + accRgb + ';');
        L.push('  --apb-dur: ' + d + 'ms;');
        L.push('  --apb-ease: ' + ease + ';');
        L.push('}');

        // 1. 基础动画过渡属性注入
        L.push(':where(' + SCOPE + ' .slider-default),');
        L.push(':where(' + SCOPE + ' .slider-default > *) {');
        L.push('  transition:');
        L.push('    height var(--apb-dur) var(--apb-ease),');
        L.push('    min-height var(--apb-dur) var(--apb-ease),');
        L.push('    width var(--apb-dur) var(--apb-ease),');
        L.push('    padding var(--apb-dur) var(--apb-ease),');
        L.push('    margin var(--apb-dur) var(--apb-ease),');
        L.push('    opacity var(--apb-dur) var(--apb-ease),');
        L.push('    background-color var(--apb-dur) var(--apb-ease),');
        L.push('    box-shadow var(--apb-dur) var(--apb-ease),');
        L.push('    border-radius var(--apb-dur) var(--apb-ease),');
        L.push('    filter var(--apb-dur) var(--apb-ease),');
        L.push('    transform var(--apb-dur) var(--apb-ease) !important;');
        L.push('}');

        // 辉光强度为 0 时不生成任何发光和描边（白点那圈白描边也算描边）
        var mgGlow = clamp(state.maskGlow, 0, 1, 0.05);
        var glowOn = mgGlow > 0;

        // 2. 轨道与已播进度样式（需清除原生渐变背景）
        L.push(':where(' + SCOPE + ' .slider-default) { border-radius: 999px; }');
        L.push(':where(' + SCOPE + ' .slider-default .cache) { border-radius: 999px; background: rgba(255, 255, 255, 0.08); }');

        // 未播放进度颜色：默认不干预，只有选了自选颜色才写
        if (state.unplayedMode === 'custom') {
            var un = state.unplayedRgb || {};
            var unHex = rgbToHex([clampByte(un.r, 45), clampByte(un.g, 45), clampByte(un.b, 56)]);
            L.push(':where(' + SCOPE + ' .slider-default) {');
            L.push('  background-color: ' + unHex + ' !important;');
            L.push('  background-image: none !important;');
            L.push('}');
        }

        // 已播放进度颜色：跟随颜色来源，或单独指定
        var trackColor = 'var(--apb-accent)';
        if (state.playedMode === 'custom') {
            var pl = state.playedRgb || {};
            trackColor = rgbToHex([clampByte(pl.r, 236), clampByte(pl.g, 65), clampByte(pl.b, 65)]);
        }

        L.push(':where(' + SCOPE + ' .slider-default .track) {');
        L.push('  border-radius: 999px;');
        L.push('  background-color: ' + trackColor + ' !important;');
        L.push('  background-image: none !important;');
        L.push('  opacity: 0.9;');
        L.push('}');

        // 副歌标记点
        L.push(':where(' + SCOPE + ' .slider-default [class*="ChorusMark"]),');
        L.push(':where(' + SCOPE + ' .slider-default [class*="chorus-mark"]) {');
        L.push('  --mark-color: var(--apb-accent) !important;');
        L.push('  background-color: var(--apb-accent) !important;');
        L.push('}');

        // 3. 播放滑块白点（thumb）样式（定位由客户端内联样式负责）
        L.push(':where(' + SCOPE + ' .slider-default .thumb) {');
        L.push('  background: var(--apb-accent) !important;');
        if (glowOn) {
            // 外圈白描边 + 两层彩色辉光
            L.push('  box-shadow:');
            L.push('    0 0 0 2px rgba(255, 255, 255, 0.16),');
            L.push('    0 0 10px 2px rgba(var(--apb-accent-rgb), 0.55),');
            L.push('    0 0 22px 6px rgba(var(--apb-accent-rgb), 0.28) !important;');
        } else {
            // 辉光强度为 0：连白色描边也去掉，白点就是一个纯色圆
            L.push('  box-shadow: none !important;');
        }
        L.push('}');

        // 4. 悬停柔光
        if (state.glow) {
            // 强度 > 0 才画发光
            if (glowOn) {
                L.push(SCOPE + ' .slider-default:hover,');
                L.push(SCOPE + ' .cmd-space:hover > .slider-default,');
                L.push(SCOPE + ' [class*="SpaceContainer"]:hover > .slider-default {');
                L.push('  box-shadow: 0 0 16px rgba(var(--apb-accent-rgb), 0.38), 0 0 2px rgba(var(--apb-accent-rgb), 0.55) !important;');
                L.push('  border-radius: 999px;');
                L.push('}');

                L.push(SCOPE + ' .slider-default:hover .track,');
                L.push(SCOPE + ' .cmd-space:hover > .slider-default .track {');
                L.push('  box-shadow: 0 0 12px rgba(var(--apb-accent-rgb), 0.45) !important;');
                L.push('}');

                L.push(SCOPE + ' .slider-default:hover > *,');
                L.push(SCOPE + ' .cmd-space:hover > .slider-default > * {');
                L.push('  box-shadow: none !important;');
                L.push('}');

                L.push(SCOPE + ' .slider-default:hover .thumb,');
                L.push(SCOPE + ' .cmd-space:hover > .slider-default .thumb {');
                L.push('  box-shadow:');
                L.push('    0 0 0 2px rgba(255, 255, 255, 0.16),');
                L.push('    0 0 10px 2px rgba(var(--apb-accent-rgb), 0.55),');
                L.push('    0 0 22px 6px rgba(var(--apb-accent-rgb), 0.28) !important;');
                L.push('}');
            } else {
                // 强度为 0：悬停也不出现任何发光
                L.push(SCOPE + ' .slider-default:hover,');
                L.push(SCOPE + ' .cmd-space:hover > .slider-default,');
                L.push(SCOPE + ' [class*="SpaceContainer"]:hover > .slider-default,');
                L.push(SCOPE + ' .slider-default:hover > *,');
                L.push(SCOPE + ' .cmd-space:hover > .slider-default > * {');
                L.push('  box-shadow: none !important;');
                L.push('}');
            }

            // 悬停背景遮罩：覆盖客户端原生渐变变量与背景图
            // 强度为 0 也要覆盖（全透明），不覆盖的话客户端黑遮罩会回来
            var mg = mgGlow;
            var stops = [0, 0.06, 0.12, 0.24, 0.35, 0.53, 0.71, 0.88, 1];

            L.push('html, :root, body, ' + SCOPE + ' {');
            L.push('  --minibar-hover--mask-bg: linear-gradient(180deg,');
            stops.forEach(function (frac, idx) {
                var a = +(mg * frac).toFixed(3);
                L.push('    ' + lit(a) + ' ' + (idx * 12.5) + '%' +
                    (idx === stops.length - 1 ? ') !important;' : ','));
            });
            L.push('}');

            L.push(SCOPE + ' [class*="MinibarHoverMask"] {');
            L.push('  box-shadow: none !important;');
            L.push('  filter: none !important;');
            L.push('  background-image: linear-gradient(180deg, ' + lit(0) + ' 0%, ' + lit(+(mg * 0.35).toFixed(3)) + ' 50%, ' + lit(+mg.toFixed(3)) + ' 100%) !important;');
            L.push('}');
        }

        // 5. 悬停时间预览浮层（Tooltip）
        var tipSelectors = [
            SCOPE + ' [class*="TimeWarpper"]',
            SCOPE + ' .curtime-thumb',
            SCOPE + ' .slider-default [class*="tooltip"]',
            SCOPE + ' .slider-default [class*="Tooltip"]',
            SCOPE + ' .slider-default [class*="preview"]',
            SCOPE + ' .slider-default [class*="Preview"]'
        ];

        // 外层定位容器置为透明
        L.push(tipSelectors.join(', ') + ' {');
        L.push('  background: transparent !important;');
        L.push('  background-image: none !important;');
        L.push('  border: none !important;');
        L.push('  box-shadow: none !important;');
        L.push('  backdrop-filter: none !important;');
        L.push('  -webkit-backdrop-filter: none !important;');
        L.push('  pointer-events: none;');
        L.push('}');

        // 内层按钮承载毛玻璃外观
        var tipBox = [];
        tipSelectors.forEach(function (s) {
            tipBox.push(s + ' button');
            tipBox.push(s + ' .cmd-button');
        });
        L.push(tipBox.join(',\n') + ' {');
        L.push('  background: rgba(28, 28, 34, 0.72) !important;');
        L.push('  background-image: none !important;');
        L.push('  backdrop-filter: blur(14px) saturate(1.6) !important;');
        L.push('  -webkit-backdrop-filter: blur(14px) saturate(1.6) !important;');
        L.push('  border: 1px solid rgba(255, 255, 255, 0.14) !important;');
        L.push('  border-radius: 10px !important;');
        L.push('  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.34), 0 0 0 1px rgba(var(--apb-accent-rgb), 0.12) !important;');
        L.push('  color: rgba(255, 255, 255, 0.96) !important;');
        L.push('  font-variant-numeric: tabular-nums;');
        L.push('}');

        var tipInner = [];
        tipSelectors.forEach(function (s) {
            tipInner.push(s + ' span');
            tipInner.push(s + ' button > *');
        });
        L.push(tipInner.join(',\n') + ' {');
        L.push('  background: none !important;');
        L.push('  background-image: none !important;');
        L.push('  border: none !important;');
        L.push('  box-shadow: none !important;');
        L.push('  color: rgba(255, 255, 255, 0.96) !important;');
        L.push('  font-size: 12px !important;');
        L.push('  line-height: 1.3 !important;');
        L.push('  font-variant-numeric: tabular-nums;');
        L.push('}');

        // 6. 章节点及系统动画偏好
        L.push(':where(' + SCOPE + ' .slider-default .dots) { pointer-events: none; }');
        L.push('@media (prefers-reduced-motion: reduce) {');
        L.push('  :where(' + SCOPE + ' .slider-default), :where(' + SCOPE + ' .slider-default > *) { transition-duration: 1ms !important; }');
        L.push('}');

        return L.join('\n');
    }

    function buildCss() {
        return [
            buildBarCss(),
            themeCss(),
            buildHoverCss()
        ].filter(Boolean).join('\n');
    }

    /**
     * 挂载或更新全局 style 标签（更新前先清空，避免解析到自身上次注入的值）
     */
    function ensureStyle() {
        if (!styleEl || !styleEl.isConnected) {
            styleEl = document.getElementById(STYLE_ID);
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = STYLE_ID;
                (document.head || document.documentElement).appendChild(styleEl);
            }
        }
        styleEl.textContent = '';
        styleEl.textContent = buildCss();
        return styleEl;
    }

    /* ------------------------------------------------------------
     * 兼容模式（内联样式 + DOM 监听兜底）
     * ---------------------------------------------------------- */
    var INLINE_PROPS = ['background-color', 'background-image', 'backdrop-filter', '-webkit-backdrop-filter'];
    var INLINE_BLUR_PROPS = ['backdrop-filter', '-webkit-backdrop-filter'];
    var inlineBlurApplied = false;

    // 毛玻璃内联写到宿主（父容器）上，不写播放栏
    function applyBlurHostInline(host, blur) {
        if (!host) return;
        INLINE_BLUR_PROPS.forEach(function (p) {
            var want = blur > 0 ? 'blur(' + blur + 'px)' : undefined;
            var cur = host.style.getPropertyValue(p);
            if (want === undefined) {
                if (cur) { host.style.removeProperty(p); inlineBlurApplied = false; }
                return;
            }
            if (cur !== want) {
                host.style.setProperty(p, want, 'important');
                inlineBlurApplied = true;
            }
        });
    }

    function applyInline() {
        if (!state.compatMode || !state.barEnabled) return;
        if (!barEl || !barEl.isConnected) return;

        var bg = 'rgba(0, 0, 0, ' + clamp(state.opacity, 0, 1, 0.1) + ')';
        var blur = clamp(state.blur, 0, 60, 5);

        // backdrop-filter 不在表内，走下面的 undefined 分支清掉历史残留
        var wanted = {
            'background-color': bg,
            'background-image': 'none'
        };

        INLINE_PROPS.forEach(function (p) {
            var want = wanted[p];
            var cur = barEl.style.getPropertyValue(p);

            if (want === undefined) {
                if (cur) {
                    barEl.style.removeProperty(p);
                    inlineApplied = true;
                }
                return;
            }
            // 仅在值不同时更新，避免触发 Observer 重复回调
            if (cur !== want) {
                barEl.style.setProperty(p, want, 'important');
                inlineApplied = true;
            }
        });

        // 毛玻璃写到父容器上
        applyBlurHostInline(hostOfBar(), blur);
    }

    function clearInline() {
        var host = hostOfBar();
        if (host && inlineBlurApplied) applyBlurHostInline(host, 0);
        if (!barEl || !barEl.isConnected || !inlineApplied) return;
        barEl.style.removeProperty('background-color');
        barEl.style.removeProperty('background-image');
        barEl.style.removeProperty('backdrop-filter');
        barEl.style.removeProperty('-webkit-backdrop-filter');
        inlineApplied = false;
    }

    // 熔断保护计数器
    var obsHits = 0;
    var obsWindowStart = 0;
    var OBS_LIMIT = 60;
    var OBS_WINDOW = 1000;

    function observerTripped() {
        var now = Date.now();
        if (now - obsWindowStart > OBS_WINDOW) {
            obsWindowStart = now;
            obsHits = 0;
        }
        obsHits++;
        if (obsHits > OBS_LIMIT) {
            console.warn('[AdvancedPlayBar] DOM 监听触发过于频繁，已自动暂停内联兜底');
            if (observer) { observer.disconnect(); observer = null; }
            obsHits = 0;
            return true;
        }
        return false;
    }

    function startObserver() {
        if (observer) return;
        obsHits = 0;
        obsWindowStart = Date.now();
        observer = new MutationObserver(function () {
            if (!state.barEnabled || !state.compatMode) return;
            if (observerTripped()) return;

            if (!barEl || !barEl.isConnected) {
                var next = document.querySelector(BAR_SELECTORS);
                if (next) {
                    barEl = next;
                    applyInline();
                }
                return;
            }
            applyInline();
        });
        try {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        } catch (e) { }
    }

    function hostOfBar() {
        return (barEl && barEl.parentElement) ? barEl.parentElement : null;
    }

    // React 重渲染可能抹掉类名，所以 applyBar 与 1.5s 轮询都会调它。
    // 只增删自己这一个类，不碰客户端原有的类
    function syncBlurHost() {
        var host = hostOfBar();
        if (!host || !host.classList) return;
        var want = state.barEnabled && clamp(state.blur, 0, 60, 5) > 0;
        var has = host.classList.contains(BLUR_HOST_CLS);
        if (want && !has) host.classList.add(BLUR_HOST_CLS);
        else if (!want && has) host.classList.remove(BLUR_HOST_CLS);
    }

    function applyBar() {
        if (!state.barEnabled) {
            clearInline();
            syncBlurHost();
            return;
        }
        barEl = document.querySelector(BAR_SELECTORS);
        if (barEl) {
            syncBlurHost();
            applyInline();
        }
    }

    /* ------------------------------------------------------------
     * 调试检查接口
     * ---------------------------------------------------------- */
    function inspect() {
        var rows = [];
        function push(label, sel, extra) {
            var n = document.querySelectorAll(sel).length;
            rows.push({ label: label, sel: sel, count: n, extra: extra });
        }

        push('播放栏本体 (.default-bar-wrapper)', '.default-bar-wrapper');
        push('播放栏本体 (*= 匹配)', '[class*="DefaultBarWrapper_"]');
        push('播放栏本体 (^= 匹配)', '[class^="DefaultBarWrapper_"]', '验证旧选择器命中');

        push('迷你播放条容器', SCOPE);
        push('进度条本体', SCOPE + ' .slider-default');
        push('已播进度 track', SCOPE + ' .slider-default .track');
        push('缓冲进度 cache', SCOPE + ' .slider-default .cache');
        push('白点滑块 thumb', SCOPE + ' .slider-default .thumb');
        push('悬停热区 hotzone-overlay', SCOPE + ' .hotzone-overlay');
        push('章节点 dots', SCOPE + ' .slider-default .dots');
        push('悬停遮罩 MinibarHoverMask', SCOPE + ' [class*="MinibarHoverMask"]');

        var tipN = document.querySelectorAll(SCOPE + ' [class*="TimeWarpper"], ' + SCOPE + ' .curtime-thumb').length;
        rows.push({ label: '时间轴浮层', sel: SCOPE + ' [class*="TimeWarpper"]', count: tipN, extra: tipN ? '' : '未悬停时通常为 0' });

        var bar = document.querySelector(SCOPE + ' .slider-default');
        var detail = '';
        if (bar) {
            var cs = getComputedStyle(bar);
            detail = '进度条 height=' + cs.height + ' radius=' + cs.borderRadius + ' transition=' + cs.transition.split(',')[0];
        }
        var b = document.querySelector(BAR_SELECTORS);
        if (b) {
            var bcs = getComputedStyle(b);
            detail += (detail ? ' | ' : '') + '播放栏 background=' + bcs.backgroundColor +
                ' (启用=' + state.barEnabled + ' 兼容模式=' + state.compatMode + ' 内联=' + inlineApplied + ')';
        }
        return { rows: rows, detail: detail };
    }

    /* ------------------------------------------------------------
     * UI 面板组件
     * ---------------------------------------------------------- */
    function openExternal(url) {
        var b = api();
        try {
            if (b && b.ncm && typeof b.ncm.openUrl === 'function') {
                b.ncm.openUrl(url);
                return;
            }
        } catch (e) { }
        try {
            if (typeof window !== 'undefined' && window.open) window.open(url, '_blank');
        } catch (e2) { }
    }

    function buildLinks() {
        var wrap = el('div', {
            marginTop: '22px', paddingTop: '14px',
            borderTop: '1px solid rgba(128,128,128,0.18)',
            fontSize: '12.5px', display: 'flex', alignItems: 'center',
            gap: '16px', flexWrap: 'wrap', opacity: '0.85'
        });

        function link(text, url) {
            var a = el('span', {
                cursor: 'pointer', textDecoration: 'underline',
                color: 'rgba(255,120,120,0.95)'
            }, text);
            a.addEventListener('click', function () { openExternal(url); });
            return a;
        }

        wrap.appendChild(link('源码仓库', REPO_URL));
        wrap.appendChild(link('问题反馈', ISSUES_URL));
        return wrap;
    }

    function el(tag, style, text) {
        var e = document.createElement(tag);
        if (style) Object.keys(style).forEach(function (k) { e.style[k] = style[k]; });
        if (text !== undefined) e.textContent = text;
        return e;
    }

    function button(text, primary) {
        return el('button', {
            padding: '7px 16px', borderRadius: '9px', cursor: 'pointer',
            fontSize: '13px', fontFamily: 'inherit',
            border: '1px solid rgba(128,128,128,0.35)',
            background: primary ? 'rgba(236,65,65,0.92)' : 'rgba(128,128,128,0.14)',
            color: primary ? '#fff' : 'inherit'
        }, text);
    }

    function row(label, control, hint) {
        var wrap = el('div', {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', padding: '10px 0',
            borderBottom: '1px solid rgba(128,128,128,0.18)'
        });
        var left = el('div', { minWidth: '160px' });
        left.appendChild(el('div', { fontSize: '14px', fontWeight: '600' }, label));
        if (hint) left.appendChild(el('div', { fontSize: '11.5px', opacity: '0.6', marginTop: '2px' }, hint));
        wrap.appendChild(left);
        var right = el('div', { display: 'flex', alignItems: 'center', gap: '10px', flex: '1', justifyContent: 'flex-end' });
        right.appendChild(control);
        wrap.appendChild(right);
        return wrap;
    }

    function slider(min, max, step, value, onInput, fmt) {
        var box = el('div', { display: 'flex', alignItems: 'center', gap: '10px', flex: '1', justifyContent: 'flex-end' });
        var input = el('input', { flex: '1', maxWidth: '220px' });
        input.type = 'range';
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.value = String(value);
        var out = el('span', {
            minWidth: '56px', textAlign: 'right', fontSize: '12.5px',
            fontVariantNumeric: 'tabular-nums', opacity: '0.85'
        }, fmt ? fmt(value) : String(value));
        input.addEventListener('input', function () {
            var v = Number(input.value);
            out.textContent = fmt ? fmt(v) : String(v);
            onInput(v);
        });
        box.appendChild(input);
        box.appendChild(out);
        return box;
    }

    function toggleRow(label, key, hint) {
        var b = button(state[key] ? '开' : '关', state[key]);
        b.addEventListener('click', function () {
            var patch = {};
            patch[key] = !state[key];
            update(patch);
            b.textContent = state[key] ? '开' : '关';
            b.style.background = state[key] ? 'rgba(236,65,65,0.92)' : 'rgba(128,128,128,0.14)';
            b.style.color = state[key] ? '#fff' : 'inherit';
        });
        return row(label, b, hint);
    }

    // 2D Canvas HSV 取色器
    var PICKER_W = 236, PICKER_H = 150, HUE_W = 18, HUE_GAP = 10;

    function colorPicker(opts) {
        var cur = state[opts.rgbKey] || { r: 236, g: 65, b: 65 };
        var hsv = rgbToHsv(clampByte(cur.r, 236), clampByte(cur.g, 65), clampByte(cur.b, 65));

        var enabled = state[opts.modeKey] === 'custom';
        var wrap = el('div', {
            display: 'flex', gap: HUE_GAP + 'px', alignItems: 'flex-start',
            marginTop: '8px', opacity: enabled ? '1' : '0.42',
            pointerEvents: enabled ? 'auto' : 'none',
            transition: 'opacity 160ms ease'
        });

        var hueCanvas = el('canvas', {
            width: HUE_W + 'px', height: PICKER_H + 'px', flex: 'none',
            borderRadius: '8px', cursor: 'crosshair',
            border: '1px solid rgba(128,128,128,0.35)'
        });
        var hueCtx = hueCanvas.getContext ? hueCanvas.getContext('2d') : null;

        var rightCol = el('div', { display: 'flex', flexDirection: 'column', gap: '8px' });

        var svCanvas = el('canvas', {
            width: PICKER_W + 'px', height: PICKER_H + 'px',
            borderRadius: '8px', cursor: 'crosshair',
            border: '1px solid rgba(128,128,128,0.35)'
        });
        var svCtx = svCanvas.getContext ? svCanvas.getContext('2d') : null;
        rightCol.appendChild(svCanvas);

        var infoRow = el('div', { display: 'flex', alignItems: 'center', gap: '10px' });

        var swatch = el('span', {
            width: '30px', height: '30px', borderRadius: '8px', flex: 'none',
            border: '1px solid rgba(128,128,128,0.4)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)'
        });
        infoRow.appendChild(swatch);

        var hexInput = el('input', {
            width: '92px', padding: '5px 8px', fontSize: '12.5px', fontFamily: 'inherit',
            textAlign: 'center', borderRadius: '8px'
        });
        hexInput.type = 'text';
        hexInput.spellcheck = false;
        infoRow.appendChild(hexInput);

        var origSwatch = el('span', {
            width: '18px', height: '18px', borderRadius: '5px', flex: 'none',
            border: '1px solid rgba(128,128,128,0.4)'
        });
        var origLabel = el('span', { fontSize: '11.5px', opacity: '0.6' }, '');
        var origBox = el('div', { display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' });
        origBox.appendChild(el('span', { fontSize: '11.5px', opacity: '0.6' }, '原色'));
        origBox.appendChild(origSwatch);
        origBox.appendChild(origLabel);
        infoRow.appendChild(origBox);

        rightCol.appendChild(infoRow);
        wrap.appendChild(hueCanvas);
        wrap.appendChild(rightCol);

        function dpr() { return Math.min(window.devicePixelRatio || 1, 2); }

        function drawHue() {
            if (!hueCtx) return;
            var d = dpr();
            hueCanvas.width = HUE_W * d;
            hueCanvas.height = PICKER_H * d;
            hueCanvas.style.width = HUE_W + 'px';
            hueCanvas.style.height = PICKER_H + 'px';
            hueCtx.setTransform(d, 0, 0, d, 0, 0);
            var g = hueCtx.createLinearGradient(0, 0, 0, PICKER_H);
            for (var i = 0; i <= 6; i++) {
                var rgb = hsvToRgb(i * 60, 1, 1);
                g.addColorStop(i / 6, 'rgb(' + rgb.join(',') + ')');
            }
            hueCtx.fillStyle = g;
            hueCtx.fillRect(0, 0, HUE_W, PICKER_H);

            var y = (hsv.h / 360) * PICKER_H;
            hueCtx.strokeStyle = 'rgba(255,255,255,0.95)';
            hueCtx.lineWidth = 2;
            hueCtx.beginPath();
            hueCtx.moveTo(0, y);
            hueCtx.lineTo(HUE_W, y);
            hueCtx.stroke();
            hueCtx.strokeStyle = 'rgba(0,0,0,0.45)';
            hueCtx.lineWidth = 1;
            hueCtx.beginPath();
            hueCtx.moveTo(0, y - 1.5);
            hueCtx.lineTo(HUE_W, y - 1.5);
            hueCtx.moveTo(0, y + 1.5);
            hueCtx.lineTo(HUE_W, y + 1.5);
            hueCtx.stroke();
        }

        function drawSV() {
            if (!svCtx) return;
            var d = dpr();
            svCanvas.width = PICKER_W * d;
            svCanvas.height = PICKER_H * d;
            svCanvas.style.width = PICKER_W + 'px';
            svCanvas.style.height = PICKER_H + 'px';
            svCtx.setTransform(d, 0, 0, d, 0, 0);

            var base = hsvToRgb(hsv.h, 1, 1);
            svCtx.fillStyle = 'rgb(' + base.join(',') + ')';
            svCtx.fillRect(0, 0, PICKER_W, PICKER_H);

            var gw = svCtx.createLinearGradient(0, 0, PICKER_W, 0);
            gw.addColorStop(0, 'rgba(255,255,255,1)');
            gw.addColorStop(1, 'rgba(255,255,255,0)');
            svCtx.fillStyle = gw;
            svCtx.fillRect(0, 0, PICKER_W, PICKER_H);

            var gb = svCtx.createLinearGradient(0, 0, 0, PICKER_H);
            gb.addColorStop(0, 'rgba(0,0,0,0)');
            gb.addColorStop(1, 'rgba(0,0,0,1)');
            svCtx.fillStyle = gb;
            svCtx.fillRect(0, 0, PICKER_W, PICKER_H);

            var cx = hsv.s * PICKER_W;
            var cy = (1 - hsv.v) * PICKER_H;
            svCtx.beginPath();
            svCtx.arc(cx, cy, 7, 0, Math.PI * 2);
            svCtx.strokeStyle = 'rgba(0,0,0,0.5)';
            svCtx.lineWidth = 3;
            svCtx.stroke();
            svCtx.beginPath();
            svCtx.arc(cx, cy, 7, 0, Math.PI * 2);
            svCtx.strokeStyle = 'rgba(255,255,255,0.98)';
            svCtx.lineWidth = 1.6;
            svCtx.stroke();
        }

        function current() { return hsvToRgb(hsv.h, hsv.s, hsv.v); }

        function render() {
            var rgb = current();
            var hex = rgbToHex(rgb);
            swatch.style.background = hex;
            if (document.activeElement !== hexInput) hexInput.value = hex.toUpperCase();
            drawHue();
            drawSV();
        }

        function commit() {
            var rgb = current();
            render();
            var patch = {};
            patch[opts.rgbKey] = { r: rgb[0], g: rgb[1], b: rgb[2] };
            update(patch);
            if (opts.onChange) opts.onChange(rgb);
        }

        function bindDrag(canvas, onPos) {
            var dragging = false;
            function pos(ev) {
                var r = canvas.getBoundingClientRect();
                return {
                    x: Math.min(r.width - 0.01, Math.max(0, ev.clientX - r.left)),
                    y: Math.min(r.height - 0.01, Math.max(0, ev.clientY - r.top)),
                    w: r.width, h: r.height
                };
            }
            canvas.addEventListener('pointerdown', function (ev) {
                dragging = true;
                if (canvas.setPointerCapture) {
                    try { canvas.setPointerCapture(ev.pointerId); } catch (e) { }
                }
                onPos(pos(ev));
                ev.preventDefault();
            });
            canvas.addEventListener('pointermove', function (ev) {
                if (!dragging) return;
                onPos(pos(ev));
            });
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
                canvas.addEventListener(t, function () { dragging = false; });
            });
        }

        bindDrag(hueCanvas, function (p) {
            hsv.h = (p.y / p.h) * 360;
            commit();
        });

        bindDrag(svCanvas, function (p) {
            hsv.s = p.x / p.w;
            hsv.v = 1 - (p.y / p.h);
            commit();
        });

        hexInput.addEventListener('input', function () {
            var parsed = hexToRgb(hexInput.value.trim());
            if (!parsed) return;
            var h2 = rgbToHsv(parsed.r, parsed.g, parsed.b);
            hsv.h = h2.h; hsv.s = h2.s; hsv.v = h2.v;
            render();
            var patch = {};
            patch[opts.rgbKey] = { r: parsed.r, g: parsed.g, b: parsed.b };
            update(patch);
            if (opts.onChange) opts.onChange([parsed.r, parsed.g, parsed.b]);
        });
        hexInput.addEventListener('blur', function () {
            hexInput.value = rgbToHex(current()).toUpperCase();
        });

        function showOriginal(rgb) {
            if (!rgb) { origSwatch.style.display = 'none'; origLabel.textContent = ''; return; }
            var hex = rgbToHex(rgb);
            origSwatch.style.background = hex;
            origLabel.textContent = hex.toUpperCase();
        }
        if (opts.originalVar) {
            var raw = cssVar(opts.originalVar);
            var m = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            showOriginal(m ? [+m[1], +m[2], +m[3]] : null);
        } else {
            origBox.style.display = 'none';
        }

        render();
        return wrap;
    }

    function modeRow(opts) {
        var seg = el('div', { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' });
        var btns = {};
        opts.modes.forEach(function (m) {
            var b = button(m[1], state[opts.modeKey] === m[0]);
            btns[m[0]] = b;
            b.addEventListener('click', function () {
                var patch = {};
                patch[opts.modeKey] = m[0];
                update(patch);
                Object.keys(btns).forEach(function (k) {
                    var on = k === state[opts.modeKey];
                    btns[k].style.background = on ? 'rgba(236,65,65,0.92)' : 'rgba(128,128,128,0.14)';
                    btns[k].style.color = on ? '#fff' : 'inherit';
                });
                if (opts.onChange) opts.onChange();
            });
            seg.appendChild(b);
        });
        return row(opts.label, seg, opts.hint);
    }

    function buildPanel() {
        var root = el('div', {
            fontFamily: 'inherit', color: 'inherit',
            maxWidth: '660px', margin: '0', padding: '4px 0 24px',
            textAlign: 'left', fontSize: '14px', lineHeight: '1.5'
        });

        root.appendChild(el('div', { fontSize: '20px', fontWeight: '700', marginBottom: '10px' }, 'AdvancedPlayBar'));

        function rebuild() {
            host.textContent = '';
            host.appendChild(buildPanel());
        }

        // 1. 透明播放栏
        root.appendChild(el('div', {
            fontSize: '15px', fontWeight: '700', marginTop: '10px', marginBottom: '2px'
        }, '透明播放栏'));

        root.appendChild(toggleRow('启用', 'barEnabled', '关闭后播放栏恢复客户端原生背景'));
        root.appendChild(row('播放栏不透明度', slider(0, 1, 0.02, state.opacity, function (v) {
            update({ opacity: v });
        }, function (v) { return Math.round(v * 100) + '%'; }), '0% 为完全透明'));
        root.appendChild(row('毛玻璃', slider(0, 40, 1, state.blur, function (v) {
            update({ blur: v });
        }, function (v) { return v === 0 ? '关闭' : v + 'px'; }), '给播放栏加背景模糊'));
        root.appendChild(toggleRow('兼容模式', 'compatMode', '如果透明样式无效，可以尝试开启'));

        // 2. 进度条
        root.appendChild(el('div', {
            fontSize: '15px', fontWeight: '700', marginTop: '28px', marginBottom: '2px'
        }, '进度条'));

        root.appendChild(toggleRow('启用', 'hoverEnabled', '关闭后进度条恢复客户端原生表现'));
        root.appendChild(toggleRow('主题色柔光', 'glow', '把悬停时扩散的黑影换成主题色光晕'));
        root.appendChild(row('光晕强度', slider(0, 0.6, 0.01, state.maskGlow, function (v) {
            update({ maskGlow: v });
        }, function (v) { return v === 0 ? '关闭' : Math.round(v * 100) + '%'; }), '悬停时播放条上方光晕强度'));

        root.appendChild(row('动画时长', slider(60, 500, 10, state.duration, function (v) {
            update({ duration: v });
        }, function (v) { return v + 'ms'; }), '进度条悬停动画的持续时间'));

        root.appendChild(modeRow({
            label: '颜色来源',
            modeKey: 'accentMode',
            hint: '圆点、光晕与副歌标记的颜色',
            modes: [['theme', '跟随主题'], ['custom', '自选颜色']],
            onChange: rebuild
        }));

        root.appendChild(colorPicker({
            modeKey: 'accentMode',
            rgbKey: 'accentRgb'
        }));

        root.appendChild(modeRow({
            label: '已播放进度',
            modeKey: 'playedMode',
            hint: '进度条已播部分的颜色',
            modes: [['theme', '跟随颜色来源'], ['custom', '自选颜色']],
            onChange: rebuild
        }));

        root.appendChild(colorPicker({
            modeKey: 'playedMode',
            rgbKey: 'playedRgb'
        }));

        root.appendChild(modeRow({
            label: '未播放进度',
            modeKey: 'unplayedMode',
            hint: '进度条未播部分的颜色',
            modes: [['native', '保持原版'], ['custom', '自选颜色']],
            onChange: rebuild
        }));

        root.appendChild(colorPicker({
            modeKey: 'unplayedMode',
            rgbKey: 'unplayedRgb'
        }));

        // 3. 全局主题色
        root.appendChild(el('div', {
            fontSize: '15px', fontWeight: '700', marginTop: '28px', marginBottom: '2px'
        }, '主题色'));

        root.appendChild(modeRow({
            label: '应用范围',
            modeKey: 'themeMode',
            hint: '按钮、选中态、侧栏等界面的强调色',
            modes: [['native', '不干预'], ['custom', '自选颜色']],
            onChange: rebuild
        }));

        root.appendChild(colorPicker({
            modeKey: 'themeMode',
            rgbKey: 'themeRgb',
            originalVar: '--colorPrimary1'
        }));

        var foot = el('div', { display: 'flex', gap: '10px', marginTop: '24px' });
        var bReset = button('恢复默认');
        bReset.addEventListener('click', function () {
            state = defaults();
            saveSettings(CONFIG_KEY, state);
            ensureStyle();
            applyBar();
            host.textContent = '';
            host.appendChild(buildPanel());
        });
        foot.appendChild(bReset);
        root.appendChild(foot);

        root.appendChild(buildLinks());

        return root;
    }

    function update(patch) {
        Object.keys(patch || {}).forEach(function (k) { state[k] = patch[k]; });
        saveSettings(CONFIG_KEY, state);
        ensureStyle();
        applyBar();
    }

    var host = null;

    /**
     * 配置迁移与合法性校验
     */
    function migrate(saved) {
        if (!saved || typeof saved !== 'object') return saved;

        if (saved.hoverEnabled === undefined && saved.enabled !== undefined) {
            saved.hoverEnabled = !!saved.enabled;
        }

        function fixRgb(v, dr, dg, db) {
            if (!v || typeof v !== 'object') return { r: dr, g: dg, b: db };
            return { r: clampByte(v.r, dr), g: clampByte(v.g, dg), b: clampByte(v.b, db) };
        }
        saved.accentRgb = fixRgb(saved.accentRgb, 236, 65, 65);
        saved.themeRgb = fixRgb(saved.themeRgb, 236, 65, 65);
        saved.playedRgb = fixRgb(saved.playedRgb, 236, 65, 65);
        saved.unplayedRgb = fixRgb(saved.unplayedRgb, 45, 45, 56);

        if (['theme', 'custom'].indexOf(saved.accentMode) === -1) {
            saved.accentMode = 'theme';
        }
        if (['custom', 'native'].indexOf(saved.themeMode) === -1) {
            saved.themeMode = 'native';
        }
        // 旧存档没有这两个键 -> 落到默认值（已播放跟随颜色来源、未播放不干预）
        if (['theme', 'custom'].indexOf(saved.playedMode) === -1) {
            saved.playedMode = 'theme';
        }
        if (['native', 'custom'].indexOf(saved.unplayedMode) === -1) {
            saved.unplayedMode = 'native';
        }

        saved.maskGlow = clamp(saved.maskGlow, 0, 1, 0.05);
        saved.opacity = clamp(saved.opacity, 0, 1, 0.1);
        saved.blur = clamp(saved.blur, 0, 60, 5);
        return saved;
    }

    /* ------------------------------------------------------------
     * 插件初始化与挂载
     * ---------------------------------------------------------- */
    plugin.onLoad(function () {
        loadSettings(CONFIG_KEY, null).then(function (saved) {
            saved = migrate(saved);
            if (saved && typeof saved === 'object') {
                Object.keys(defaults()).forEach(function (k) {
                    if (saved[k] !== undefined) state[k] = saved[k];
                });
            }

            ensureStyle();
            applyBar();
            startObserver();

            // 定时检查：防止 DOM 树或 head 节点被客户端重构时样式丢失
            setInterval(function () {
                if (!document.getElementById(STYLE_ID)) ensureStyle();
                if (!state.barEnabled) return;

                var cur = document.querySelector(BAR_SELECTORS);
                if (cur !== barEl) barEl = cur;
                if (cur) {
                    syncBlurHost();
                    applyInline();
                }
            }, 1500);
        }).catch(function (err) {
            console.warn('[AdvancedPlayBar] 初始化失败：', err);
        });
    });

    plugin.onConfig(function () {
        host = el('div', { padding: '6px 4px' });
        host.appendChild(buildPanel());
        return host;
    });

    // 调试与内部接口暴露
    window.__advancedPlayBar = {
        get state() { return state; },
        update: update,
        inspect: inspect,
        migrate: migrate,
        applyBar: applyBar,
        get bar() { return barEl; },
        resolveAccent: resolveAccent,
        rgbToHex: rgbToHex,
        hexToRgb: hexToRgb,
        parseColor: parseColor,
        hsvToRgb: hsvToRgb,
        rgbToHsv: rgbToHsv,
        themeVars: THEME_VARS,
        get themeCss() { return themeCss(); },
        get css() { return buildCss(); },
        get barCss() { return buildBarCss(); },
        get hoverCss() { return buildHoverCss(); },
        version: '1.1.0'
    };
})();