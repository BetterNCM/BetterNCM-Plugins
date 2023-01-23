plugin.onAllPluginsLoaded(plugins => plugins.StylesheetLoader.loadStylesheet(
    plugin,
    `${this.pluginPath}/theme.css`,
    "MoTheme",
    {
        use_refinedNowPlaying: {
            name: "使用RefinedNowPlaying",
            class: "MoTheme-use_refinedNowPlaying",
            type: "checkbox",
            reflect: "bodyFlag",
            default: false
        },
        bottomMusicBar_rainbowStrip: {
            name: "底部音乐栏-彩虹条",
            class: "MoTheme-bottomMusicBar_rainbowStrip",
            type: "checkbox",
            reflect: "bodyFlag",
            default: true
        },
        bottomMusicBar_dockMode: {
            name: "底部音乐栏-悬浮模式",
            class: "MoTheme-bottomMusicBar_dockMode",
            type: "checkbox",
            reflect: "bodyFlag",
            default: false
        },
        bottomMusicBar_radius: {
            name: "底部音乐栏-圆角大小",
            key: "--MoTheme-bottomMusicBar_radius",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "8px"
        },
        bottomMusicBar_backgroundBlur: {
            name: "底部音乐栏-背景模糊度",
            key: "--MoTheme-bottomMusicBar_backgroundBlur",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "16px"
        },
        bottomMusicBar_backgroundSaturate: {
            name: "底部音乐栏-背景饱和度",
            key: "--MoTheme-bottomMusicBar_backgroundSaturate",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "120%"
        },
        bottomMusicBar_backgroundColor: {
            name: "底部音乐栏-背景颜色",
            key: "--MoTheme-bottomMusicBar_backgroundColor",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "rgba(255, 255, 255, 0.2)"
        },
        popWindow_radius: {
            name: "弹窗-圆角大小",
            key: "--MoTheme-popWindow_radius",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "8px"
        },
        popWindow_backgroundBlur: {
            name: "弹窗-背景模糊度",
            key: "--MoTheme-popWindow_backgroundBlur",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "24px"
        },
        popWindow_backgroundSaturate: {
            name: "弹窗-背景饱和度",
            key: "--MoTheme-popWindow_backgroundSaturate",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "120%"
        },
        popWindow_backgroundColor: {
            name: "弹窗-背景颜色",
            key: "--MoTheme-popWindow_backgroundColor",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "rgba(255, 255, 255, 0.2)"
        },
        other_radius: {
            name: "其他-圆角大小",
            key: "--MoTheme-other_radius",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "8px"
        },
        other_backgroundBlur: {
            name: "其他-背景模糊度",
            key: "--MoTheme-other_backgroundBlur",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "24px"
        },
        other_backgroundSaturate: {
            name: "其他-背景饱和度",
            key: "--MoTheme-other_backgroundSaturate",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "120%"
        },
        other_backgroundColor: {
            name: "其他-背景颜色",
            key: "--MoTheme-other_backgroundColor",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "rgba(255, 255, 255, 0.2)"
        }
    }
));

// 评论按钮
const owo = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        if (mutation.target.classList.contains("z-show")) {
            document.querySelector(".g-singlec-comment-detail").classList.add("z-show");
        } else {
            if (!document.body.classList.contains("MoTheme-use_refinedNowPlaying")) {
                document.querySelector(".g-singlec-comment-detail").classList.remove("z-show");
            }
        }
    }
});

// 上升
const up = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.classList.contains("g-single")) {
                document.querySelector(".better-ncm-manager").classList.add("topqwq");
                document.querySelector(".g-sd").classList.add("topqwq");
                document.querySelector(".g-mn").classList.add("topqwq");
                document.querySelector(".g-ft").classList.add("topqwq");
                up.disconnect();
                down.observe(document.querySelector(".g-single"), { attributes: true });
                owo.observe(document.querySelector(".g-singlec-comment-top"), { attributes: true });
            }
        }
    }
});

// 下落
const down = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        if (!mutation.target.classList.contains("z-show")) {
            document.querySelector(".better-ncm-manager").classList.remove("topqwq");
            document.querySelector(".g-sd").classList.remove("topqwq");
            document.querySelector(".g-mn").classList.remove("topqwq");
            document.querySelector(".g-ft").classList.remove("topqwq");
            up.observe(document.body, { childList: true });
            down.disconnect();
            owo.disconnect();
        }
    }
});
up.observe(document.body, { childList: true });
