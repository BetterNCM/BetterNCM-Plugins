plugin.onAllPluginsLoaded(plugins => plugins.StylesheetLoader.loadStylesheet(
    plugin,
    `${this.pluginPath}/theme.css`,
    "MoTheme",
    {
        BGEnhanced: {
            name: "使用BGEnhanced",
            type: "checkbox",
            reflect: "bodyFlag",
            class: "MoTheme-BGEnhanced",
            default: false
        },
        backgroundImage: {
            name: "背景图片",
            key: "--MoTheme-backgroundImage",
            reflect: "cssVar",
            type: "cssBackground",
            default: "url(https://img.noobzone.ru/getimg.php?url=https://i.imgur.com/ejzQz7n.png)"
        },
        backgroundBrightness: {
            name: "背景亮度",
            key: "--MoTheme-backgroundBrightness",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "100%"
        },
        backgroundSaturate: {
            name: "背景饱和度",
            key: "--MoTheme-backgroundSaturate",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "100%"
        },
        backgroundBlur: {
            name: "背景模糊度",
            key: "--MoTheme-backgroundBlur",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "0px"
        },
        backgroundScale: {
            name: "背景缩放（解决背景模糊后边框问题）",
            key: "--MoTheme-backgroundScale",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "100%"
        },
        bottomMusicBarDockMode: {
            name: "底部音乐栏-悬浮模式",
            class: "MoTheme-bottomMusicBarDockMode",
            type: "checkbox",
            reflect: "bodyFlag",
            default: false
        },
        bottomMusicBarRadius: {
            name: "底部音乐栏-圆角大小",
            key: "--MoTheme-bottomMusicBarRadius",
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
        popWindowRadius: {
            name: "弹窗-圆角大小",
            key: "--MoTheme-popWindowRadius",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "8px"
        },
        popWindow_backgroundBlur: {
            name: "弹窗-背景模糊度",
            key: "--MoTheme-popWindow_backgroundBlur",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "16px"
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
        otherRadius: {
            name: "其他-圆角大小",
            key: "--MoTheme-otherRadius",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "8px"
        },
        other_backgroundBlur: {
            name: "其他-背景模糊度",
            key: "--MoTheme-other_backgroundBlur",
            reflect: "cssVar",
            type: "cssInput",   // 并没有，随便写的
            default: "16px"
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
            document.querySelector(".g-singlec-comment-detail").classList.remove("z-show");
        }
    }
});

// 上升
const up = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.classList.contains("g-single")) {
                document.querySelector(".g-sd").classList.add("topqwq");
                document.querySelector(".g-mn").classList.add("topqwq");
                document.querySelector(".g-ft").classList.add("topqwq");
                up.disconnect();
                down.observe(document.querySelector(".g-single"), { attributes: true });
                document.querySelector(".g-singlec-comment-detail").classList.remove("z-show");
                owo.observe(document.querySelector(".g-singlec-comment-top"), { attributes: true });
            }
        }
    }
});

// 下落
const down = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        if (!mutation.target.classList.contains("z-show")) {
            document.querySelector(".g-sd").classList.remove("topqwq");
            document.querySelector(".g-mn").classList.remove("topqwq");
            document.querySelector(".g-ft").classList.remove("topqwq");
            down.disconnect();
            up.observe(document.body, { childList: true });
            owo.disconnect();
        }
    }
});
up.observe(document.body, { childList: true });
