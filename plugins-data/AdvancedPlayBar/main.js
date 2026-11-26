/* ============================================================
 * AdvancedPlayBar — 网易云音乐 BetterNCM 播放栏增强插件
 * 功能：透明播放栏、进度条动效、全局主题色自定义
 * 兼容环境：CEF 91 (Chromium 91，不支持 CSS :has() / accent-color / color-mix())
 * ============================================================ */

(function () {
    'use strict';

    var CONFIG_KEY = 'advanced-playbar-settings';
    var STYLE_ID = 'apb-style';
    var VERSION = (typeof plugin !== 'undefined' && plugin && plugin.manifest && plugin.manifest.version) || '1.3.0';

    var REPO_URL = 'https://github.com/FinaFina233/AdvancedPlayBar';
    var ISSUES_URL = REPO_URL + '/issues';

    var SCOPE = '#page_pc_mini_bar';

    // 毛玻璃宿主类名（毛玻璃写在播放栏父容器上，不写播放栏本身，见 buildBarCss）
    var BLUR_HOST_CLS = 'apb-blur-host';

    // 播放栏选择器（包含静态类名及 CSS Module 动态哈希前缀，使用 *= 兼容跨版本）
    var BAR_SELECTORS = '.default-bar-wrapper, [class*="DefaultBarWrapper_"]';
    var BAR_IS = ':is(' + BAR_SELECTORS + ')';

    var RED = [236, 65, 65];
    var UNPLAYED = [45, 45, 56];
    var MAX_GLOW = 0.6;

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
            glow: true,             // 柔光总开关（白点 + 悬停光晕）
            accentMode: 'theme',    // 颜色来源：'theme' (跟随主题) | 'custom' (自定义)
            accentRgb: { r: 236, g: 65, b: 65 },
            maskGlow: 0.05,         // 光晕强度 (0 = 完全无辉光/无描边)

            // 已播放进度颜色
            playedMode: 'theme',    // 'theme' (跟随颜色来源) | 'custom' (自定义)
            playedRgb: { r: 236, g: 65, b: 65 },
            // 未播放进度颜色，默认不干预（保持客户端原色）
            unplayedMode: 'native', // 'native' (保持原版) | 'custom' (自定义)
            unplayedRgb: { r: 45, g: 45, b: 56 },

            // 专辑封面：圆角方形静态封面（关闭则为原版旋转黑胶）
            squareCover: false,

            // 全局主题色（作用于客户端内联 CSS 变量）
            themeMode: 'native',    // 'native' (原生不干预) | 'custom' (自定义)
            themeRgb: { r: 236, g: 65, b: 65 }
        };
    }

    var state = defaults();
    var styleEl = null;
    var lastCss = null;
    var lastAccentHex = '';

    var barEl = null;

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

    function stateJson() {
        try { return JSON.stringify(state); } catch (e) { return null; }
    }

    // writeConfig 走原生接口写文件，拖动时合并成一次；localStorage 照常每次写
    var SAVE_DELAY = 400;
    var saveTimer = null;

    function saveState() {
        var json = stateJson();
        if (json === null) return;
        try { localStorage.setItem(CONFIG_KEY, json); } catch (e) { }
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(flushSave, SAVE_DELAY);
    }

    function flushSave() {
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
        var json = stateJson();
        var b = api();
        try {
            if (json !== null && b && b.app && typeof b.app.writeConfig === 'function') {
                b.app.writeConfig(CONFIG_KEY, json);
            }
        } catch (e) { }
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

    // {r,g,b} -> [r,g,b]，坏分量用 def 补
    function rgbArr(o, def) {
        o = o || {};
        return [clampByte(o.r, def[0]), clampByte(o.g, def[1]), clampByte(o.b, def[2])];
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

    // 浅色背景上用深色字，深色背景上用白字
    function readableOn(rgb) {
        return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 > 0.68 ? '#161616' : '#ffffff';
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

    /**
     * 客户端原色。开了自定义主题色后计算值是插件自己的，所以读 <html> 上的内联值
     */
    var nativePrimary = null;

    function readNativePrimary() {
        var c = null;
        try { c = parseColor(document.documentElement.style.getPropertyValue('--colorPrimary1')); } catch (e) { }
        if (!c && state.themeMode !== 'custom') c = parseColor(cssVar('--colorPrimary1'));
        if (c) nativePrimary = c;
        return nativePrimary;
    }

    /* ------------------------------------------------------------
     * 全局主题色覆写
     * ---------------------------------------------------------- */

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

    function toRgba(c, a) {
        return 'rgba(' + clampByte(c[0], 0) + ',' + clampByte(c[1], 0) + ',' + clampByte(c[2], 0) + ',' + a + ')';
    }

    /**
     * 生成主题色覆写 CSS（使用 !important 覆盖客户端写在 <html> 上的内联样式）
     */
    function themeCss() {
        if (state.themeMode !== 'custom') return '';
        var rgb = rgbArr(state.themeRgb, RED);
        var bases = deriveBases(rgb);

        var out = [];
        out.push(':root, body {');
        THEME_VARS.forEach(function (row) {
            out.push('  ' + row[0] + ': ' + toRgba(bases[row[1]], row[2]) + ' !important;');
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
            var rgb = rgbArr(state.accentRgb, RED);
            return { hex: rgbToHex(rgb), rgb: rgb, source: '自选颜色' };
        }

        if (state.themeMode === 'custom') {
            var trgb = rgbArr(state.themeRgb, RED);
            return { hex: rgbToHex(trgb), rgb: trgb, source: '插件自定义主题色' };
        }

        var g1 = parseColor(cssVar('--gt-accent-hex'));
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

    // 保留两位小数，长小数会让兼容模式的比较永远不相等
    function barBg() {
        return 'rgba(0, 0, 0, ' + (+clamp(state.opacity, 0, 1, 0.1).toFixed(2)) + ')';
    }

    function barBlur() {
        return Math.round(clamp(state.blur, 0, 60, 5));
    }

    /**
     * 生成播放栏透明化样式
     */
    function buildBarCss() {
        if (!state.barEnabled) return '';

        var bg = barBg();
        var blur = barBlur();
        var L = [];

        L.push(BAR_IS + ' {');
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
        L.push(BAR_IS + ' :is(.default-bar-bg, [class*="BarBG"], [class*="bar-bg"]) {');
        L.push('  background: transparent !important;');
        L.push('}');

        // 兼容第三方皮肤（如 BGEnhanced）预制透明开关
        L.push('.prefab-transparency ' + BAR_IS + ' {');
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
        lastAccentHex = acc.hex;
        var ar = acc.rgb[0], ag = acc.rgb[1], ab = acc.rgb[2];
        function lit(alpha) {
            return 'rgba(' + ar + ',' + ag + ',' + ab + ',' + alpha + ')';
        }

        L.push(SCOPE + ' {');
        L.push('  --apb-accent: ' + acc.hex + ';');
        L.push('  --apb-accent-rgb: ' + acc.rgb.join(', ') + ';');
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

        // 柔光关闭或强度为 0 时不生成任何发光和描边（白点那圈白描边也算）
        var mg = clamp(state.maskGlow, 0, MAX_GLOW, 0.05);
        var glowOn = state.glow && mg > 0;
        var THUMB_GLOW = '0 0 0 2px rgba(255, 255, 255, 0.16), ' +
            '0 0 10px 2px rgba(var(--apb-accent-rgb), 0.55), ' +
            '0 0 22px 6px rgba(var(--apb-accent-rgb), 0.28)';

        // 2. 轨道与已播进度样式（需清除原生渐变背景）
        L.push(':where(' + SCOPE + ' .slider-default) { border-radius: 999px; }');
        L.push(':where(' + SCOPE + ' .slider-default .cache) { border-radius: 999px; background: rgba(255, 255, 255, 0.08); }');

        // 未播放进度颜色：默认不干预，只有选了自选颜色才写
        if (state.unplayedMode === 'custom') {
            L.push(':where(' + SCOPE + ' .slider-default) {');
            L.push('  background-color: ' + rgbToHex(rgbArr(state.unplayedRgb, UNPLAYED)) + ' !important;');
            L.push('  background-image: none !important;');
            L.push('}');
        }

        // 已播放进度颜色：跟随颜色来源，或单独指定
        var trackColor = state.playedMode === 'custom'
            ? rgbToHex(rgbArr(state.playedRgb, RED))
            : 'var(--apb-accent)';

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
        L.push('  box-shadow: ' + (glowOn ? THUMB_GLOW : 'none') + ' !important;');
        L.push('}');

        // 4. 悬停柔光
        if (state.glow) {
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

                // 上一条会把直接子元素的阴影清掉，白点要单独补回来
                L.push(SCOPE + ' .slider-default:hover .thumb,');
                L.push(SCOPE + ' .cmd-space:hover > .slider-default .thumb {');
                L.push('  box-shadow: ' + THUMB_GLOW + ' !important;');
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
            var stops = [0, 0.06, 0.12, 0.24, 0.35, 0.53, 0.71, 0.88, 1];

            L.push(':root, body, ' + SCOPE + ' {');
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

    /**
     * 专辑封面：迷你条左边的旋转黑胶换成圆角方形静态封面（黑胶外框来自 wrapper 自身）
     */
    function buildCoverCss() {
        if (!state.squareCover) return '';

        // 静态类名 + 包含匹配，后者兼容 CSS Module 哈希后缀
        var bases = [SCOPE + ' .miniVinylWrapper', SCOPE + ' [class*="miniVinylWrapper"]'];
        function each(suffix) {
            return bases.map(function (s) { return s + suffix; }).join(',\n');
        }
        var R = '8px';
        // 缩放系数，0.83 约显示成 50px
        var SCALE = 0.83;
        // 暂停时再小一圈
        var PAUSED_SCALE = 0.75;
        var L = [];

        L.push('/* 专辑封面：圆角方形静态样式 */');
        L.push(each('') + ' {');
        L.push('  background: none !important;');
        L.push('  background-image: none !important;');
        L.push('  border: none !important;');
        L.push('  box-shadow: none !important;');
        L.push('  border-radius: ' + R + ' !important;');
        L.push('  overflow: hidden !important;');
        // 停掉旋转并整体缩小（transform 覆盖客户端的 rotate）
        L.push('  animation: none !important;');
        L.push('  transform: scale(' + SCALE + ') !important;');
        // 恢复播放时带一点回弹
        L.push('  transition: transform 420ms cubic-bezier(0.34, 1.4, 0.64, 1) !important;');
        L.push('}');

        // 暂停：属性由 syncPaused 挂在 <html> 上，React 不管那里
        L.push(bases.map(function (s) { return '[' + PAUSED_ATTR + '] ' + s; }).join(',\n') + ' {');
        L.push('  transform: scale(' + PAUSED_SCALE + ') !important;');
        L.push('  transition: transform 280ms cubic-bezier(0.22, 0.61, 0.36, 1) !important;');
        L.push('}');
        L.push('@media (prefers-reduced-motion: reduce) {');
        L.push('  ' + each('') + ' { transition: none !important; }');
        L.push('}');

        // 去掉黑胶外圈和纹路（伪元素画的）
        L.push(each('::before') + ',');
        L.push(each('::after') + ' {');
        L.push('  display: none !important;');
        L.push('}');

        // 封面图铺满整个方块
        L.push(each(' img') + ' {');
        L.push('  width: 100% !important;');
        L.push('  height: 100% !important;');
        L.push('  object-fit: cover !important;');
        L.push('  border-radius: ' + R + ' !important;');
        L.push('  animation: none !important;');
        L.push('  transform: none !important;');
        L.push('}');

        return L.join('\n');
    }

    /**
     * 迷你条封面只有几十像素，这里换成大图（只处理网易 CDN 的小尺寸地址）
     */
    var COVER_PREFIX = 'orpheus://cache/?';
    var COVER_HD = '?imageView&thumbnail=200y200';

    function biggerCoverUrl(src) {
        if (!src) return '';

        var prefix = '';
        var inner = src;
        if (inner.indexOf(COVER_PREFIX) === 0) {
            prefix = COVER_PREFIX;
            inner = inner.slice(COVER_PREFIX.length);
        }
        if (inner.indexOf('http') !== 0) return '';
        if (inner.indexOf('music.126.net') === -1) return '';

        var q = inner.indexOf('?') === -1 ? '' : inner.slice(inner.indexOf('?') + 1);
        var m = q.match(/(?:^|&)(?:param|thumbnail)=(\d+)y(\d+)/);
        if (m && parseInt(m[1], 10) >= 150) return '';   // 已经够大

        return prefix + inner.split('?')[0] + COVER_HD;
    }

    // 正在验证的候选地址，避免每轮轮询都重新发起
    var coverPending = '';
    var coverRejected = '';
    var coverBoundImg = null;

    /**
     * 先验证候选图确实更大，再换。换错地址封面会裂
     */
    function upgradeCover(img) {
        var cur = img.getAttribute('src') || '';
        if (!cur) return;
        if (img.naturalWidth >= 150) return;          // 当前这张已经够清晰

        var cand = biggerCoverUrl(cur);
        if (!cand || cand === cur) return;
        if (cand === coverRejected || cand === coverPending) return;

        coverPending = cand;
        var probe = new Image();
        probe.onload = function () {
            coverPending = '';
            // 期间若已切歌，放弃这次替换
            if (img.getAttribute('src') !== cur) return;
            if (probe.naturalWidth > (img.naturalWidth || 0)) {
                img.setAttribute('src', cand);
            } else {
                coverRejected = cand;                 // 取不到更大的图
            }
        };
        probe.onerror = function () {
            coverPending = '';
            coverRejected = cand;
        };
        probe.src = cand;
    }

    function syncCoverResolution() {
        if (!state.squareCover) return;
        var img = document.querySelector(
            SCOPE + ' .miniVinylWrapper img, ' + SCOPE + ' [class*="miniVinylWrapper"] img');
        if (!img) return;

        // 切歌后客户端会换 src，靠 load 事件立刻跟上，不必等轮询
        // 元素被重建时会重新绑
        if (img !== coverBoundImg) {
            coverBoundImg = img;
            img.addEventListener('load', function () { upgradeCover(img); });
        }
        upgradeCover(img);
    }

    /**
     * 暂停状态：看播放按钮显示的图标（显示「暂停」= 正在播放）。
     * 不走原生 PlayState 事件，免得和其他插件的注册互相顶掉
     */
    var PLAY_BTN = '#btn_pc_minibar_play';
    var PAUSED_ATTR = 'data-apb-paused';
    var PAUSE_RE = /(?:^|[\s\-_#])[Pp]ause(?![a-z])/;
    var PLAY_RE = /(?:^|[\s\-_#])[Pp]lay(?![a-z])/;   // 排除 display / player / playing

    var playBtnEl = null;
    var playObserver = null;
    var lastPaused = null;

    // 返回 true 暂停 / false 播放 / null 认不出来
    function readPaused(btn) {
        // 「播放/暂停」这种固定文案没有信息量，跳过
        var label = (btn.getAttribute('aria-label') || '') + ' ' + (btn.getAttribute('title') || '');
        var saysPause = /暂停|pause/i.test(label), saysPlay = /播放|play/i.test(label);
        if (saysPause !== saysPlay) return saysPlay;

        var nodes = [btn].concat(Array.prototype.slice.call(btn.querySelectorAll('*')));
        var marks = nodes.map(function (n) {
            return ' ' + (n.getAttribute('class') || '') + ' ' + (n.getAttribute('href') || '') +
                ' ' + (n.getAttribute('xlink:href') || '');
        }).join(' ');
        var hasPause = PAUSE_RE.test(marks), hasPlay = PLAY_RE.test(marks);
        if (hasPause !== hasPlay) return hasPlay;
        return null;
    }

    function syncPaused() {
        var btn = state.squareCover ? document.querySelector(PLAY_BTN) : null;
        if (btn !== playBtnEl) {
            if (playObserver) { playObserver.disconnect(); playObserver = null; }
            playBtnEl = btn;
            if (btn) {
                playObserver = new MutationObserver(syncPaused);
                try {
                    playObserver.observe(btn, {
                        subtree: true, childList: true, attributes: true,
                        attributeFilter: ['class', 'aria-label', 'title', 'href']
                    });
                } catch (e) { }
            }
        }

        var paused = btn ? readPaused(btn) : null;
        if (paused === lastPaused) return;
        lastPaused = paused;
        var root = document.documentElement;
        if (paused) root.setAttribute(PAUSED_ATTR, '');
        else root.removeAttribute(PAUSED_ATTR);
    }

    function buildCss() {
        return [
            buildBarCss(),
            buildCoverCss(),
            themeCss(),
            buildHoverCss()
        ].filter(Boolean).join('\n');
    }

    /**
     * 挂载或更新全局 style 标签，内容没变就不写，避免无谓的样式重算
     */
    function ensureStyle() {
        if (!styleEl || !styleEl.isConnected) {
            styleEl = document.getElementById(STYLE_ID);
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = STYLE_ID;
                (document.head || document.documentElement).appendChild(styleEl);
            }
            lastCss = null;
        }
        var css = buildCss();
        if (css !== lastCss) {
            styleEl.textContent = css;
            lastCss = css;
        }
        return styleEl;
    }

    /* ------------------------------------------------------------
     * 兼容模式（内联样式 + DOM 监听兜底）
     * ---------------------------------------------------------- */
    var probeStyle = document.createElement('div').style;
    var touched = [];   // 兼容模式写过的内联属性：[元素, 属性名]

    // 浏览器会规范化内联值（0.30000000000000004 → 0.3），不先过一遍就会自己写、自己触发 Observer，死循环
    function normalize(prop, value) {
        probeStyle.setProperty(prop, value);
        var v = probeStyle.getPropertyValue(prop);
        probeStyle.removeProperty(prop);
        return v;
    }

    function setInline(node, prop, value) {
        var want = normalize(prop, value);
        if (!want) return;   // 内核不认这个属性
        var s = node.style;
        if (s.getPropertyValue(prop) !== want || s.getPropertyPriority(prop) !== 'important') {
            s.setProperty(prop, want, 'important');
        }
        for (var i = 0; i < touched.length; i++) {
            if (touched[i][0] === node && touched[i][1] === prop) return;
        }
        touched.push([node, prop]);
    }

    function unsetInline(node, prop) {
        touched = touched.filter(function (t) {
            if (t[0] !== node || t[1] !== prop) return true;
            node.style.removeProperty(prop);
            return false;
        });
    }

    function clearInline() {
        touched.forEach(function (t) { t[0].style.removeProperty(t[1]); });
        touched = [];
    }

    function hostOfBar() {
        return (barEl && barEl.parentElement) ? barEl.parentElement : null;
    }

    function applyInline() {
        if (!state.barEnabled || !state.compatMode) return;
        if (!barEl || !barEl.isConnected) return;

        setInline(barEl, 'background-color', barBg());
        setInline(barEl, 'background-image', 'none');
        // 清掉旧版本写在播放栏上的毛玻璃
        if (barEl.style.getPropertyValue('backdrop-filter')) barEl.style.removeProperty('backdrop-filter');

        // 毛玻璃写到父容器上
        var host = hostOfBar();
        if (!host) return;
        var blur = barBlur();
        if (blur > 0) setInline(host, 'backdrop-filter', 'blur(' + blur + 'px)');
        else unsetInline(host, 'backdrop-filter');
    }

    // 熔断保护：触发后暂停 10 秒，由轮询恢复
    var observer = null;
    var observedBar = null;
    var obsHits = 0;
    var obsWindowStart = 0;
    var obsCooldownUntil = 0;
    var OBS_LIMIT = 60;
    var OBS_WINDOW = 1000;
    var OBS_COOLDOWN = 10000;

    function stopObserver() {
        if (observer) observer.disconnect();
        observer = null;
        observedBar = null;
    }

    function observerTripped() {
        var now = Date.now();
        if (now - obsWindowStart > OBS_WINDOW) {
            obsWindowStart = now;
            obsHits = 0;
        }
        if (++obsHits <= OBS_LIMIT) return false;
        console.warn('[AdvancedPlayBar] 播放栏样式被频繁改写，内联兜底暂停 10 秒');
        stopObserver();
        obsCooldownUntil = now + OBS_COOLDOWN;
        return true;
    }

    // 只在兼容模式下运行，只盯播放栏和父容器
    function syncObserver() {
        var want = state.barEnabled && state.compatMode && barEl && barEl.isConnected &&
            Date.now() >= obsCooldownUntil;
        if (!want) { stopObserver(); return; }
        if (observer && observedBar === barEl) return;

        stopObserver();
        obsHits = 0;
        obsWindowStart = Date.now();
        observer = new MutationObserver(function () {
            if (observerTripped()) return;
            if (!barEl || !barEl.isConnected) { applyBar(); return; }
            applyInline();
            syncBlurHost();
        });
        observedBar = barEl;
        try {
            observer.observe(barEl, { attributes: true, attributeFilter: ['style'] });
            var host = hostOfBar();
            if (host) observer.observe(host, { attributes: true, attributeFilter: ['style', 'class'], childList: true });
        } catch (e) { stopObserver(); }
    }

    // React 重渲染可能抹掉类名，所以 applyBar 与 1.5s 轮询都会调它。
    // 只增删自己这一个类，不碰客户端原有的类
    var blurHostEl = null;

    function syncBlurHost() {
        var host = hostOfBar();
        var want = state.barEnabled && barBlur() > 0 && !!host && !!host.classList;
        if (blurHostEl && (!want || blurHostEl !== host)) {
            blurHostEl.classList.remove(BLUR_HOST_CLS);
            blurHostEl = null;
        }
        if (!want) return;
        if (!host.classList.contains(BLUR_HOST_CLS)) host.classList.add(BLUR_HOST_CLS);
        blurHostEl = host;
    }

    function applyBar() {
        var cur = document.querySelector(BAR_SELECTORS);
        if (cur !== barEl) {
            clearInline();
            barEl = cur;
        }
        // 兼容模式关了要清掉内联 !important，不然会压住样式表
        if (state.barEnabled && state.compatMode) applyInline();
        else clearInline();
        syncBlurHost();
        syncObserver();
    }

    /* ------------------------------------------------------------
     * 刷新调度
     * ---------------------------------------------------------- */
    function refresh() {
        ensureStyle();
        applyBar();
        syncPaused();
        syncPanel();
    }

    // 多次改动合并成一次刷新。窗口最小化时 rAF 会停，定时器兜底
    var refreshQueued = false;

    function scheduleRefresh() {
        if (refreshQueued) return;
        refreshQueued = true;
        function run() {
            if (!refreshQueued) return;
            refreshQueued = false;
            refresh();
        }
        if (window.requestAnimationFrame) window.requestAnimationFrame(run);
        setTimeout(run, 50);
    }

    function update(patch) {
        Object.keys(patch || {}).forEach(function (k) { state[k] = patch[k]; });
        saveState();
        scheduleRefresh();
    }

    // 定时检查：DOM 重构、换皮肤、GlassTheme 晚加载
    function tick() {
        var stale = !styleEl || !styleEl.isConnected ||
            (state.hoverEnabled && resolveAccent().hex !== lastAccentHex);
        if (stale) {
            refresh();
        } else {
            applyBar();
            syncPanel();
        }
        if (state.themeMode !== 'custom') readNativePrimary();
        syncCoverResolution();
        syncPaused();
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

        var btn = document.querySelector(PLAY_BTN);
        rows.push({ label: '播放/暂停按钮', sel: PLAY_BTN, count: btn ? 1 : 0,
            extra: btn ? '识别为：' + ({ 'true': '暂停', 'false': '播放', 'null': '认不出来' })[String(readPaused(btn))] : '' });

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
                ' (启用=' + state.barEnabled + ' 兼容模式=' + state.compatMode +
                ' 内联=' + touched.length + ' 监听=' + !!observer + ')';
        }
        return { rows: rows, detail: detail };
    }

    /* ------------------------------------------------------------
     * UI 面板
     * ---------------------------------------------------------- */
    var PANEL_CSS = [
        '.apb-panel {',
        '  --apb-ui: #ec4141; --apb-ui-rgb: 236, 65, 65; --apb-ui-fg: #fff;',
        '  --apb-line: rgba(128, 128, 128, 0.16);',
        '  --apb-fill: rgba(128, 128, 128, 0.07);',
        '  --apb-ctl: rgba(128, 128, 128, 0.16);',
        '  max-width: 660px; padding: 4px 0 24px;',
        '  font-family: inherit; font-size: 14px; line-height: 1.5; color: inherit; text-align: left;',
        '}',
        '.apb-panel *, .apb-panel *::before, .apb-panel *::after { box-sizing: border-box; }',
        '.apb-panel button { font: inherit; color: inherit; margin: 0; }',
        '.apb-panel button:focus, .apb-panel input:focus { outline: none; }',
        '.apb-panel button:focus-visible, .apb-panel input:focus-visible { outline: 2px solid rgba(var(--apb-ui-rgb), 0.55); outline-offset: 2px; }',

        '.apb-panel .apb-head { display: flex; align-items: baseline; gap: 8px; }',
        '.apb-panel .apb-title { font-size: 20px; font-weight: 700; letter-spacing: 0.01em; }',
        '.apb-panel .apb-ver { font-size: 12px; opacity: 0.5; font-variant-numeric: tabular-nums; }',

        '.apb-panel .apb-section { margin-top: 22px; }',
        '.apb-panel .apb-section-title { font-size: 12.5px; font-weight: 600; opacity: 0.62; margin: 0 4px 8px; }',
        '.apb-panel .apb-card { background: var(--apb-fill); border: 1px solid var(--apb-line); border-radius: 12px; padding: 0 16px; }',
        '.apb-panel .apb-item { border-bottom: 1px solid var(--apb-line); transition: opacity 160ms ease; }',
        '.apb-panel .apb-item:last-child { border-bottom: 0; }',
        '.apb-panel .apb-item.apb-off { opacity: 0.4; pointer-events: none; }',
        '.apb-panel .apb-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 58px; padding: 10px 0; }',
        '.apb-panel .apb-text { min-width: 150px; }',
        '.apb-panel .apb-label { font-size: 14px; font-weight: 600; }',
        '.apb-panel .apb-hint { font-size: 12px; opacity: 0.55; margin-top: 1px; }',
        '.apb-panel .apb-ctrl { display: flex; align-items: center; justify-content: flex-end; flex: 1; }',

        // 开关
        '.apb-panel .apb-switch { position: relative; flex: none; width: 38px; height: 22px; padding: 0; border: 0; border-radius: 999px;',
        '  background: rgba(128, 128, 128, 0.38); cursor: pointer; transition: background-color 180ms ease; }',
        '.apb-panel .apb-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%;',
        '  background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); transition: transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1); }',
        '.apb-panel .apb-switch.on { background: var(--apb-ui); }',
        '.apb-panel .apb-switch.on::after { transform: translateX(16px); }',

        // 分段按钮
        '.apb-panel .apb-seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--apb-ctl); }',
        '.apb-panel .apb-seg button { padding: 3px 12px; border: 0; border-radius: 7px; background: transparent; font-size: 12.5px; line-height: 22px;',
        '  white-space: nowrap; cursor: pointer; opacity: 0.72; transition: background-color 160ms ease, color 160ms ease, opacity 160ms ease; }',
        '.apb-panel .apb-seg button:hover { opacity: 1; }',
        '.apb-panel .apb-seg button.on { background: var(--apb-ui); color: var(--apb-ui-fg); opacity: 1; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18); }',

        // 滑条（CEF 91 没有 accent-color，用 --p 画填充）
        '.apb-panel .apb-range-box { display: flex; align-items: center; gap: 12px; flex: 1; justify-content: flex-end; }',
        '.apb-panel .apb-range { -webkit-appearance: none; appearance: none; flex: 1; max-width: 220px; height: 4px; margin: 0;',
        '  border-radius: 999px; outline: none; cursor: pointer;',
        '  background: linear-gradient(to right, var(--apb-ui) 0, var(--apb-ui) var(--p, 0%), rgba(128, 128, 128, 0.3) var(--p, 0%), rgba(128, 128, 128, 0.3) 100%); }',
        '.apb-panel .apb-range::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff;',
        '  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 1px 4px rgba(0, 0, 0, 0.35); transition: transform 140ms ease; }',
        '.apb-panel .apb-range:hover::-webkit-slider-thumb, .apb-panel .apb-range:active::-webkit-slider-thumb { transform: scale(1.18); }',
        '.apb-panel .apb-range-val { min-width: 46px; text-align: right; font-size: 12.5px; opacity: 0.8; font-variant-numeric: tabular-nums; }',

        // 取色器（自选颜色时展开）
        '.apb-panel .apb-fold { max-height: 0; opacity: 0; overflow: hidden;',
        '  transition: max-height 240ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 180ms ease; }',
        '.apb-panel .apb-fold.open { max-height: 220px; opacity: 1; }',
        '.apb-panel .apb-picker { display: flex; gap: 12px; align-items: flex-start; padding: 4px 0 16px; }',
        '.apb-panel .apb-sv { position: relative; flex: none; width: 236px; height: 150px; border-radius: 10px; cursor: crosshair; touch-action: none;',
        '  background-image: linear-gradient(to top, #000, rgba(0, 0, 0, 0)), linear-gradient(to right, #fff, rgba(255, 255, 255, 0));',
        '  box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.25); }',
        '.apb-panel .apb-hue { position: relative; flex: none; width: 14px; height: 150px; border-radius: 999px; cursor: ns-resize; touch-action: none;',
        '  background: linear-gradient(to bottom, #f00 0%, #ff0 16.67%, #0f0 33.33%, #0ff 50%, #00f 66.67%, #f0f 83.33%, #f00 100%);',
        '  box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.25); }',
        '.apb-panel .apb-knob { position: absolute; width: 16px; height: 16px; border-radius: 50%; transform: translate(-50%, -50%);',
        '  border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.35); pointer-events: none; }',
        '.apb-panel .apb-hue .apb-knob { left: 50%; }',
        '.apb-panel .apb-picker-side { display: flex; flex-direction: column; gap: 10px; width: 108px; }',
        '.apb-panel .apb-swatch { height: 44px; border-radius: 10px; box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.3); }',
        '.apb-panel .apb-hex { width: 100%; padding: 5px 8px; border: 1px solid var(--apb-line); border-radius: 8px; background: var(--apb-ctl);',
        '  color: inherit; font: inherit; font-size: 12.5px; letter-spacing: 0.04em; text-align: center; font-variant-numeric: tabular-nums;',
        '  transition: border-color 160ms ease; }',
        '.apb-panel .apb-hex:focus { border-color: var(--apb-ui); }',
        '.apb-panel .apb-orig { display: flex; align-items: center; gap: 6px; width: 100%; padding: 4px 6px; border: 0; border-radius: 7px;',
        '  background: transparent; font-size: 11.5px; text-align: left; cursor: pointer; opacity: 0.65; font-variant-numeric: tabular-nums; }',
        '.apb-panel .apb-orig:hover { opacity: 1; background: var(--apb-ctl); }',
        '.apb-panel .apb-orig i { flex: none; width: 12px; height: 12px; border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.4); }',

        // 页脚
        '.apb-panel .apb-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 22px; }',
        '.apb-panel .apb-btn { padding: 7px 16px; border: 1px solid var(--apb-line); border-radius: 9px; background: var(--apb-ctl); font-size: 13px;',
        '  cursor: pointer; transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease; }',
        '.apb-panel .apb-btn:hover { background: rgba(128, 128, 128, 0.24); }',
        '.apb-panel .apb-btn.warn { background: rgba(var(--apb-ui-rgb), 0.16); border-color: rgba(var(--apb-ui-rgb), 0.55); color: var(--apb-ui); }',
        '.apb-panel .apb-links { display: flex; gap: 4px; }',
        '.apb-panel .apb-link { padding: 4px 10px; border: 0; border-radius: 7px; background: transparent; font-size: 12.5px; color: var(--apb-ui);',
        '  cursor: pointer; transition: background-color 160ms ease; }',
        '.apb-panel .apb-link:hover { background: rgba(var(--apb-ui-rgb), 0.12); }'
    ].join('\n');

    var host = null;
    var panelRoot = null;
    var panelBinds = [];   // 状态变化后要重画的控件

    function bindPanel(fn) {
        panelBinds.push(fn);
        fn();
    }

    function paintPanelAccent(root) {
        var acc = resolveAccent();
        root.style.setProperty('--apb-ui', acc.hex);
        root.style.setProperty('--apb-ui-rgb', acc.rgb.join(', '));
        root.style.setProperty('--apb-ui-fg', readableOn(acc.rgb));
    }

    function syncPanel() {
        if (!panelRoot || !panelRoot.isConnected) return;
        paintPanelAccent(panelRoot);
        panelBinds.forEach(function (fn) { fn(); });
    }

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

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    }

    function btn(cls, text) {
        var b = el('button', cls, text);
        b.type = 'button';
        return b;
    }

    function patchOf(key, value) {
        var p = {};
        p[key] = value;
        return p;
    }

    /**
     * 一行设置项，enabledWhen 为假时变暗禁用
     */
    function item(label, hint, control, enabledWhen) {
        var wrap = el('div', 'apb-item');
        var r = el('div', 'apb-row');
        var left = el('div', 'apb-text');
        left.appendChild(el('div', 'apb-label', label));
        if (hint) left.appendChild(el('div', 'apb-hint', hint));
        r.appendChild(left);
        var right = el('div', 'apb-ctrl');
        right.appendChild(control);
        r.appendChild(right);
        wrap.appendChild(r);
        if (enabledWhen) {
            bindPanel(function () { wrap.classList.toggle('apb-off', !enabledWhen()); });
        }
        return wrap;
    }

    function switchCtl(key) {
        var b = btn('apb-switch');
        b.setAttribute('role', 'switch');
        function paint() {
            b.classList.toggle('on', !!state[key]);
            b.setAttribute('aria-checked', String(!!state[key]));
        }
        b.addEventListener('click', function () {
            update(patchOf(key, !state[key]));
            paint();
        });
        bindPanel(paint);
        return b;
    }

    function rangeCtl(min, max, step, key, format) {
        var box = el('div', 'apb-range-box');
        var input = el('input', 'apb-range');
        input.type = 'range';
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.value = String(state[key]);
        var out = el('span', 'apb-range-val');
        var digits = (String(step).split('.')[1] || '').length;

        function paint(v) {
            out.textContent = format(v);
            input.style.setProperty('--p', ((v - min) / (max - min) * 100) + '%');
        }
        input.addEventListener('input', function () {
            var v = +Number(input.value).toFixed(digits);
            paint(v);
            update(patchOf(key, v));
        });
        paint(Number(input.value));

        box.appendChild(input);
        box.appendChild(out);
        return box;
    }

    function segCtl(modeKey, modes) {
        var seg = el('div', 'apb-seg');
        var btns = modes.map(function (m) {
            var b = btn('', m[1]);
            b.addEventListener('click', function () {
                update(patchOf(modeKey, m[0]));
                paint();
            });
            seg.appendChild(b);
            return b;
        });
        function paint() {
            btns.forEach(function (b, i) { b.classList.toggle('on', state[modeKey] === modes[i][0]); });
        }
        bindPanel(paint);
        return seg;
    }

    function bindDrag(node, onPos) {
        var dragging = false;
        function pos(ev) {
            var r = node.getBoundingClientRect();
            return {
                x: Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)),
                y: Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height))
            };
        }
        node.addEventListener('pointerdown', function (ev) {
            dragging = true;
            try { node.setPointerCapture(ev.pointerId); } catch (e) { }
            onPos(pos(ev));
            ev.preventDefault();
        });
        node.addEventListener('pointermove', function (ev) {
            if (dragging) onPos(pos(ev));
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (t) {
            node.addEventListener(t, function () { dragging = false; });
        });
    }

    /**
     * HSV 取色器，用 CSS 渐变画
     */
    function colorPicker(o) {
        var cur = rgbArr(state[o.rgbKey], RED);
        var hsv = rgbToHsv(cur[0], cur[1], cur[2]);

        var wrap = el('div', 'apb-picker');

        var sv = el('div', 'apb-sv');
        var svKnob = el('div', 'apb-knob');
        sv.appendChild(svKnob);

        var hue = el('div', 'apb-hue');
        var hueKnob = el('div', 'apb-knob');
        hue.appendChild(hueKnob);

        var side = el('div', 'apb-picker-side');
        var swatch = el('div', 'apb-swatch');
        var hex = el('input', 'apb-hex');
        hex.type = 'text';
        hex.spellcheck = false;
        hex.maxLength = 7;
        side.appendChild(swatch);
        side.appendChild(hex);

        wrap.appendChild(sv);
        wrap.appendChild(hue);
        wrap.appendChild(side);

        function paint() {
            var rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
            var hexStr = rgbToHex(rgb);
            var pure = 'hsl(' + hsv.h.toFixed(1) + ', 100%, 50%)';
            sv.style.backgroundColor = pure;
            svKnob.style.left = (hsv.s * 100) + '%';
            svKnob.style.top = ((1 - hsv.v) * 100) + '%';
            svKnob.style.backgroundColor = hexStr;
            hueKnob.style.top = (hsv.h / 360 * 100) + '%';
            hueKnob.style.backgroundColor = pure;
            swatch.style.backgroundColor = hexStr;
            if (document.activeElement !== hex) hex.value = hexStr.toUpperCase();
            return rgb;
        }

        function commit(rgb) {
            update(patchOf(o.rgbKey, { r: rgb[0], g: rgb[1], b: rgb[2] }));
        }

        function setRgb(rgb) {
            var next = rgbToHsv(rgb[0], rgb[1], rgb[2]);
            // 灰色没有色相，保留原来的
            if (next.s === 0) next.h = hsv.h;
            hsv = next;
            paint();
            commit(rgb);
        }

        bindDrag(sv, function (p) {
            hsv.s = p.x;
            hsv.v = 1 - p.y;
            commit(paint());
        });
        bindDrag(hue, function (p) {
            hsv.h = Math.min(359.9, p.y * 360);
            commit(paint());
        });

        // 6 位实时生效，3 位简写等回车，免得打字时跳色
        function applyHex(allowShort) {
            var v = hex.value.trim();
            if (!allowShort && v.replace('#', '').length !== 6) return;
            var c = hexToRgb(v);
            if (c) setRgb([c.r, c.g, c.b]);
        }
        hex.addEventListener('input', function () { applyHex(false); });
        hex.addEventListener('change', function () { applyHex(true); });
        hex.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') hex.blur(); });
        hex.addEventListener('blur', function () { hex.value = rgbToHex(hsvToRgb(hsv.h, hsv.s, hsv.v)).toUpperCase(); });

        // 点原色直接套用
        if (o.original) {
            var orig = btn('apb-orig');
            orig.title = '点击使用原色';
            var dot = el('i');
            var label = el('span');
            orig.appendChild(dot);
            orig.appendChild(label);
            side.appendChild(orig);
            bindPanel(function () {
                var c = o.original();
                orig.style.display = c ? '' : 'none';
                if (!c) return;
                var h = rgbToHex(c);
                dot.style.backgroundColor = h;
                label.textContent = '原色 ' + h.toUpperCase();
            });
            orig.addEventListener('click', function () {
                var c = o.original();
                if (c) setRgb(c);
            });
        }

        // 状态被别处改了时跟上
        bindPanel(function () {
            var want = rgbArr(state[o.rgbKey], RED);
            if (rgbToHex(want) === rgbToHex(hsvToRgb(hsv.h, hsv.s, hsv.v))) return;
            var next = rgbToHsv(want[0], want[1], want[2]);
            if (next.s === 0) next.h = hsv.h;
            hsv = next;
            paint();
        });

        paint();
        return wrap;
    }

    // 模式切换行 + 选「自选颜色」才展开的取色器
    function colorItem(o) {
        var wrap = item(o.label, o.hint, segCtl(o.modeKey, o.modes), o.enabledWhen);
        var fold = el('div', 'apb-fold');
        fold.appendChild(colorPicker(o));
        wrap.appendChild(fold);
        bindPanel(function () { fold.classList.toggle('open', state[o.modeKey] === 'custom'); });
        return wrap;
    }

    function section(title, items) {
        var s = el('div', 'apb-section');
        s.appendChild(el('div', 'apb-section-title', title));
        var card = el('div', 'apb-card');
        items.forEach(function (it) { card.appendChild(it); });
        s.appendChild(card);
        return s;
    }

    function pct(v) { return Math.round(v * 100) + '%'; }

    function buildPanel() {
        panelBinds = [];
        var root = el('div', 'apb-panel');
        panelRoot = root;
        paintPanelAccent(root);

        var style = el('style');
        style.textContent = PANEL_CSS;
        root.appendChild(style);

        var head = el('div', 'apb-head');
        head.appendChild(el('div', 'apb-title', 'AdvancedPlayBar'));
        head.appendChild(el('div', 'apb-ver', 'v' + VERSION));
        root.appendChild(head);

        function barOn() { return state.barEnabled; }
        function hoverOn() { return state.hoverEnabled; }
        function glowOn() { return state.hoverEnabled && state.glow; }

        root.appendChild(section('透明播放栏', [
            item('启用', '关闭后播放栏恢复客户端原生背景', switchCtl('barEnabled')),
            item('播放栏不透明度', '0% 为完全透明', rangeCtl(0, 1, 0.02, 'opacity', pct), barOn),
            item('毛玻璃', '给播放栏加背景模糊', rangeCtl(0, 40, 1, 'blur', function (v) {
                return v === 0 ? '关闭' : v + 'px';
            }), barOn),
            item('兼容模式', '如果透明样式无效，可以尝试开启', switchCtl('compatMode'), barOn)
        ]));

        root.appendChild(section('专辑封面', [
            item('方形封面', '开启后换成圆角方形静态封面，关闭为原版旋转黑胶', switchCtl('squareCover'))
        ]));

        root.appendChild(section('进度条', [
            item('启用', '关闭后进度条恢复客户端原生表现', switchCtl('hoverEnabled')),
            item('主题色柔光', '白点光晕，以及把悬停时的黑影换成主题色光晕', switchCtl('glow'), hoverOn),
            item('光晕强度', '悬停时播放条上方光晕强度', rangeCtl(0, MAX_GLOW, 0.01, 'maskGlow', function (v) {
                return v === 0 ? '关闭' : pct(v);
            }), glowOn),
            item('动画时长', '进度条悬停动画的持续时间', rangeCtl(60, 500, 10, 'duration', function (v) {
                return v + 'ms';
            }), hoverOn),
            colorItem({
                label: '颜色来源', hint: '圆点、光晕与副歌标记的颜色',
                modeKey: 'accentMode', rgbKey: 'accentRgb',
                modes: [['theme', '跟随主题'], ['custom', '自选颜色']],
                enabledWhen: hoverOn
            }),
            colorItem({
                label: '已播放进度', hint: '进度条已播部分的颜色',
                modeKey: 'playedMode', rgbKey: 'playedRgb',
                modes: [['theme', '跟随颜色来源'], ['custom', '自选颜色']],
                enabledWhen: hoverOn
            }),
            colorItem({
                label: '未播放进度', hint: '进度条未播部分的颜色',
                modeKey: 'unplayedMode', rgbKey: 'unplayedRgb',
                modes: [['native', '保持原版'], ['custom', '自选颜色']],
                enabledWhen: hoverOn
            })
        ]));

        root.appendChild(section('主题色', [
            colorItem({
                label: '应用范围', hint: '按钮、选中态、侧栏等界面的强调色',
                modeKey: 'themeMode', rgbKey: 'themeRgb',
                modes: [['native', '不干预'], ['custom', '自选颜色']],
                original: readNativePrimary
            })
        ]));

        var foot = el('div', 'apb-foot');

        // 点两次才生效，防误触
        var bReset = btn('apb-btn', '恢复默认');
        var armed = null;
        bReset.addEventListener('click', function () {
            if (!armed) {
                bReset.textContent = '再点一次确认';
                bReset.classList.add('warn');
                armed = setTimeout(function () {
                    armed = null;
                    bReset.textContent = '恢复默认';
                    bReset.classList.remove('warn');
                }, 3000);
                return;
            }
            clearTimeout(armed);
            armed = null;
            state = defaults();
            saveState();
            flushSave();
            refresh();
            rebuildPanel();
        });
        foot.appendChild(bReset);

        var links = el('div', 'apb-links');
        [['源码仓库', REPO_URL], ['问题反馈', ISSUES_URL]].forEach(function (l) {
            var a = btn('apb-link', l[0]);
            a.addEventListener('click', function () { openExternal(l[1]); });
            links.appendChild(a);
        });
        foot.appendChild(links);
        root.appendChild(foot);

        return root;
    }

    function rebuildPanel() {
        if (!host) return;
        host.textContent = '';
        host.appendChild(buildPanel());
    }

    /**
     * 配置迁移与合法性校验
     */
    function migrate(saved) {
        if (!saved || typeof saved !== 'object') return saved;

        if (saved.hoverEnabled === undefined && saved.enabled !== undefined) {
            saved.hoverEnabled = !!saved.enabled;
        }

        // 缺失或非布尔值落回默认值
        var def = defaults();
        ['barEnabled', 'compatMode', 'hoverEnabled', 'glow', 'squareCover'].forEach(function (k) {
            if (typeof saved[k] !== 'boolean') saved[k] = def[k];
        });

        function fixRgb(v, def) {
            var a = rgbArr(isPlainObject(v) ? v : null, def);
            return { r: a[0], g: a[1], b: a[2] };
        }
        saved.accentRgb = fixRgb(saved.accentRgb, RED);
        saved.themeRgb = fixRgb(saved.themeRgb, RED);
        saved.playedRgb = fixRgb(saved.playedRgb, RED);
        saved.unplayedRgb = fixRgb(saved.unplayedRgb, UNPLAYED);

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

        saved.maskGlow = clamp(saved.maskGlow, 0, MAX_GLOW, 0.05);
        saved.opacity = clamp(saved.opacity, 0, 1, 0.1);
        saved.blur = clamp(saved.blur, 0, 60, 5);
        saved.duration = clamp(saved.duration, 0, 1000, 180);
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

            readNativePrimary();
            refresh();
            setInterval(tick, 1500);

            // 关客户端前把没写出去的配置写掉
            window.addEventListener('beforeunload', function () {
                if (saveTimer) flushSave();
            });
        }).catch(function (err) {
            console.warn('[AdvancedPlayBar] 初始化失败：', err);
        });
    });

    plugin.onConfig(function () {
        host = el('div');
        host.style.padding = '6px 4px';
        host.appendChild(buildPanel());
        return host;
    });

    // 调试与内部接口暴露
    window.__advancedPlayBar = {
        get state() { return state; },
        update: update,
        refresh: refresh,
        flushSave: flushSave,
        inspect: inspect,
        migrate: migrate,
        applyBar: applyBar,
        get bar() { return barEl; },
        resolveAccent: resolveAccent,
        readNativePrimary: readNativePrimary,
        rgbToHex: rgbToHex,
        hexToRgb: hexToRgb,
        parseColor: parseColor,
        hsvToRgb: hsvToRgb,
        rgbToHsv: rgbToHsv,
        themeVars: THEME_VARS,
        biggerCoverUrl: biggerCoverUrl,
        get themeCss() { return themeCss(); },
        get css() { return buildCss(); },
        get barCss() { return buildBarCss(); },
        get hoverCss() { return buildHoverCss(); },
        version: VERSION
    };
})();
