"use strict";


const defaultConfig = {
    pointermove: {
        followPointerSwitch: true,
        transitionDelay: 150,
        transformScale: 110,
        filterBlur: 0,
        filterBrightness: 80,
        filterSaturate: 100
    },
    pointerleave: {
        positionResetSwitch: true,
        transitionDelay: 300,
        transformScale: 100,
        filterBlur: 0,
        filterBrightness: 100,
        filterSaturate: 100
    },
    windowFocus: {
        transitionDelay: 300,
        transformScale: 100,
        filterBlur: 0,
        filterBrightness: 100,
        filterSaturate: 100
    },
    windowBlur: {
        transitionDelay: 300,
        transformScale: 100,
        filterBlur: 0,
        filterBrightness: 100,
        filterSaturate: 40
    }
}


const pluginConfig = {
    get: key => Object.assign({}, defaultConfig[key], plugin.getConfig(key, defaultConfig[key])),
    set: (key, value) => plugin.setConfig(key, value)
};


// 检查插件是否存在
function checkPluginExistence() {
    if ("BGEnhanced" in loadedPlugins) {
        return true;
    }
    // 不存在就弹出通知
    throw channel.call(
        "trayicon.popBalloon",
        () => { },
        [{
            title: "BGEnhanced Extra",
            text: "没有找到BGEnhanced插件！\n请先安装此插件后重试",
            icon: "path",
            hasSound: true,
            delayTime: 2e3,
        }]
    );
}


// 注入CSS样式
function injectCSSStyles() {
    const element = document.createElement("style");
    element.textContent = `
    .BGEnhanced-BackgoundDom {
        transition:
            all
            var(--transitionDelay, ${pluginConfig.get("pointerleave")["transitionDelay"]}ms)
            ease-out
        ;
        transform:
            scale(var(--transformScale, ${pluginConfig.get("pointerleave")["transformScale"]}%))
            translateX(var(--translateX, 0px))
            translateY(var(--translateY, 0px))
        ;
        filter:
            blur(var(--filterBlur, ${pluginConfig.get("pointerleave")["filterBlur"]}px))
            brightness(var(--filterBrightness, ${pluginConfig.get("pointerleave")["filterBrightness"]}%))
            saturate(var(--filterSaturate, ${pluginConfig.get("pointerleave")["filterSaturate"]}%))
        ;
    }`;
    document.head.appendChild(element);
}


plugin.onLoad(async () => {
    checkPluginExistence();
    injectCSSStyles();

    const backgroundDom = document.querySelector(".BGEnhanced-BackgoundDom");
    let animationFrameRequest = null;
    let animationFrameRequested = false;

    // 指针移动
    document.addEventListener("pointermove", event => {
        if (!animationFrameRequested) {
            animationFrameRequested = true;
            animationFrameRequest = requestAnimationFrame(() => {
                // 读取配置
                const followPointerSwitch = pluginConfig.get("pointermove")["followPointerSwitch"];
                const transitionDelay = pluginConfig.get("pointermove")["transitionDelay"];
                const transformScale = pluginConfig.get("pointermove")["transformScale"];
                const filterBlur = pluginConfig.get("pointermove")["filterBlur"];
                const filterBrightness = pluginConfig.get("pointermove")["filterBrightness"];
                const filterSaturate = pluginConfig.get("pointermove")["filterSaturate"];
                // 更改属性
                backgroundDom.style.setProperty("--transitionDelay", `${transitionDelay}ms`);
                backgroundDom.style.setProperty("--transformScale", `${transformScale}%`);
                // 跟随指针
                if (followPointerSwitch) {
                    let translateX = window.innerWidth / 2 - event.clientX;
                    let translateY = window.innerHeight / 2 - event.clientY;
                    translateX = translateX - translateX / (transformScale / 100);
                    translateY = translateY - translateY / (transformScale / 100);
                    backgroundDom.style.setProperty("--translateX", `${translateX}px`);
                    backgroundDom.style.setProperty("--translateY", `${translateY}px`);
                }
                backgroundDom.style.setProperty("--filterBlur", `${filterBlur}px`);
                backgroundDom.style.setProperty("--filterBrightness", `${filterBrightness}%`);
                backgroundDom.style.setProperty("--filterSaturate", `${filterSaturate}%`);
                animationFrameRequested = false;
            });
        }
    });

    // 指针离开
    document.addEventListener("pointerleave", () => {
        cancelAnimationFrame(animationFrameRequest);
        animationFrameRequested = false;
        // 读取配置
        const positionResetSwitch = pluginConfig.get("pointerleave")["positionResetSwitch"];
        const transitionDelay = pluginConfig.get("pointerleave")["transitionDelay"];
        const transformScale = pluginConfig.get("pointerleave")["transformScale"];
        const filterBlur = pluginConfig.get("pointerleave")["filterBlur"];
        const filterBrightness = pluginConfig.get("pointerleave")["filterBrightness"];
        const filterSaturate = pluginConfig.get("pointerleave")["filterSaturate"];
        // 更改属性
        backgroundDom.style.setProperty("--transitionDelay", `${transitionDelay}ms`);
        backgroundDom.style.setProperty("--transformScale", `${transformScale}%`);
        // 位置复位
        if (positionResetSwitch) {
            backgroundDom.style.setProperty("--translateX", 0);
            backgroundDom.style.setProperty("--translateY", 0);
        }
        backgroundDom.style.setProperty("--filterBlur", `${filterBlur}px`);
        backgroundDom.style.setProperty("--filterBrightness", `${filterBrightness}%`);
        backgroundDom.style.setProperty("--filterSaturate", `${filterSaturate}%`);
    });

    // 窗口聚焦
    window.addEventListener("focus", () => {
        console.log("窗口聚焦");
        // 读取配置
        const transitionDelay = pluginConfig.get("windowFocus")["transitionDelay"];
        const transformScale = pluginConfig.get("windowFocus")["transformScale"];
        const filterBlur = pluginConfig.get("windowFocus")["filterBlur"];
        const filterBrightness = pluginConfig.get("windowFocus")["filterBrightness"];
        const filterSaturate = pluginConfig.get("windowFocus")["filterSaturate"];
        // 更改属性
        backgroundDom.style.setProperty("--transitionDelay", `${transitionDelay}ms`);
        backgroundDom.style.setProperty("--transformScale", `${transformScale}%`);
        backgroundDom.style.setProperty("--filterBlur", `${filterBlur}px`);
        backgroundDom.style.setProperty("--filterBrightness", `${filterBrightness}%`);
        backgroundDom.style.setProperty("--filterSaturate", `${filterSaturate}%`);
    });

    // 窗口失焦
    window.addEventListener("blur", () => {
        console.log("窗口失焦");
        // 读取配置
        const transitionDelay = pluginConfig.get("windowBlur")["transitionDelay"];
        const transformScale = pluginConfig.get("windowBlur")["transformScale"];
        const filterBlur = pluginConfig.get("windowBlur")["filterBlur"];
        const filterBrightness = pluginConfig.get("windowBlur")["filterBrightness"];
        const filterSaturate = pluginConfig.get("windowBlur")["filterSaturate"];
        // 更改属性
        backgroundDom.style.setProperty("--transitionDelay", `${transitionDelay}ms`);
        backgroundDom.style.setProperty("--transformScale", `${transformScale}%`);
        backgroundDom.style.setProperty("--filterBlur", `${filterBlur}px`);
        backgroundDom.style.setProperty("--filterBrightness", `${filterBrightness}%`);
        backgroundDom.style.setProperty("--filterSaturate", `${filterSaturate}%`);
    });
});


// 初始化配置界面
function initConfigView(configView) {
    // 指针移动
    {
        // 标题按钮
        const apply = configView.querySelector(".pointermove .apply");
        const reset = configView.querySelector(".pointermove .reset");
        // 功能选项
        const followPointerSwitch = configView.querySelector(".pointermove .followPointerSwitch");
        const transitionDelay = configView.querySelector(".pointermove .transitionDelay");
        const transformScale = configView.querySelector(".pointermove .transformScale");
        const filterBlur = configView.querySelector(".pointermove .filterBlur");
        const filterBrightness = configView.querySelector(".pointermove .filterBrightness");
        const filterSaturate = configView.querySelector(".pointermove .filterSaturate");
        // 立即应用
        apply.addEventListener("click", () => {
            const config = pluginConfig.get("pointermove");
            config["followPointerSwitch"] = followPointerSwitch.checked;
            config["transitionDelay"] = transitionDelay.value;
            config["transformScale"] = transformScale.value;
            config["filterBlur"] = filterBlur.value;
            config["filterBrightness"] = filterBrightness.value;
            config["filterSaturate"] = filterSaturate.value;
            pluginConfig.set("pointermove", config);
        });
        // 恢复默认
        reset.addEventListener("click", () => {
            followPointerSwitch.checked = defaultConfig["pointermove"]["followPointerSwitch"];
            transitionDelay.value = defaultConfig["pointermove"]["transitionDelay"];
            transformScale.value = defaultConfig["pointermove"]["transformScale"];
            filterBlur.value = defaultConfig["pointermove"]["filterBlur"];
            filterBrightness.value = defaultConfig["pointermove"]["filterBrightness"];
            filterSaturate.value = defaultConfig["pointermove"]["filterSaturate"];
            pluginConfig.set("pointermove", undefined);
        });
        // 初始化值
        followPointerSwitch.checked = pluginConfig.get("pointermove")["followPointerSwitch"];
        transitionDelay.value = pluginConfig.get("pointermove")["transitionDelay"];
        transformScale.value = pluginConfig.get("pointermove")["transformScale"];
        filterBlur.value = pluginConfig.get("pointermove")["filterBlur"];
        filterBrightness.value = pluginConfig.get("pointermove")["filterBrightness"];
        filterSaturate.value = pluginConfig.get("pointermove")["filterSaturate"];
    }

    // 指针离开
    {
        // 标题按钮
        const apply = configView.querySelector(".pointerleave .apply");
        const reset = configView.querySelector(".pointerleave .reset");
        // 功能选项
        const positionResetSwitch = configView.querySelector(".pointerleave .positionResetSwitch");
        const transitionDelay = configView.querySelector(".pointerleave .transitionDelay");
        const transformScale = configView.querySelector(".pointerleave .transformScale");
        const filterBlur = configView.querySelector(".pointerleave .filterBlur");
        const filterBrightness = configView.querySelector(".pointerleave .filterBrightness");
        const filterSaturate = configView.querySelector(".pointerleave .filterSaturate");
        // 立即应用
        apply.addEventListener("click", () => {
            const config = pluginConfig.get("pointerleave");
            config["positionResetSwitch"] = positionResetSwitch.checked;
            config["transitionDelay"] = transitionDelay.value;
            config["transformScale"] = transformScale.value;
            config["filterBlur"] = filterBlur.value;
            config["filterBrightness"] = filterBrightness.value;
            config["filterSaturate"] = filterSaturate.value;
            pluginConfig.set("pointerleave", config);
        });
        // 恢复默认
        reset.addEventListener("click", () => {
            positionResetSwitch.checked = defaultConfig["pointerleave"]["positionResetSwitch"];
            transitionDelay.value = defaultConfig["pointerleave"]["transitionDelay"];
            transformScale.value = defaultConfig["pointerleave"]["transformScale"];
            filterBlur.value = defaultConfig["pointerleave"]["filterBlur"];
            filterBrightness.value = defaultConfig["pointerleave"]["filterBrightness"];
            filterSaturate.value = defaultConfig["pointerleave"]["filterSaturate"];
            pluginConfig.set("pointerleave", undefined);
        });
        // 初始化值
        positionResetSwitch.checked = pluginConfig.get("pointerleave")["positionResetSwitch"]
        transitionDelay.value = pluginConfig.get("pointerleave")["transitionDelay"];
        transformScale.value = pluginConfig.get("pointerleave")["transformScale"];
        filterBlur.value = pluginConfig.get("pointerleave")["filterBlur"];
        filterBrightness.value = pluginConfig.get("pointerleave")["filterBrightness"];
        filterSaturate.value = pluginConfig.get("pointerleave")["filterSaturate"];
    }

    // 窗口聚焦
    {
        // 标题按钮
        const apply = configView.querySelector(".windowFocus .apply");
        const reset = configView.querySelector(".windowFocus .reset");
        // 功能选项
        const transitionDelay = configView.querySelector(".windowFocus .transitionDelay");
        const transformScale = configView.querySelector(".windowFocus .transformScale");
        const filterBlur = configView.querySelector(".windowFocus .filterBlur");
        const filterBrightness = configView.querySelector(".windowFocus .filterBrightness");
        const filterSaturate = configView.querySelector(".windowFocus .filterSaturate");
        // 立即应用
        apply.addEventListener("click", () => {
            const config = pluginConfig.get("windowFocus");
            config["transitionDelay"] = transitionDelay.value;
            config["transformScale"] = transformScale.value;
            config["filterBlur"] = filterBlur.value;
            config["filterBrightness"] = filterBrightness.value;
            config["filterSaturate"] = filterSaturate.value;
            pluginConfig.set("windowFocus", config);
        });
        // 恢复默认
        reset.addEventListener("click", () => {
            transitionDelay.value = defaultConfig["windowFocus"]["transitionDelay"];
            transformScale.value = defaultConfig["windowFocus"]["transformScale"];
            filterBlur.value = defaultConfig["windowFocus"]["filterBlur"];
            filterBrightness.value = defaultConfig["windowFocus"]["filterBrightness"];
            filterSaturate.value = defaultConfig["windowFocus"]["filterSaturate"];
            pluginConfig.set("windowFocus", undefined);
        });
        transitionDelay.value = pluginConfig.get("windowFocus")["transitionDelay"];
        transformScale.value = pluginConfig.get("windowFocus")["transformScale"];
        filterBlur.value = pluginConfig.get("windowFocus")["filterBlur"];
        filterBrightness.value = pluginConfig.get("windowFocus")["filterBrightness"];
        filterSaturate.value = pluginConfig.get("windowFocus")["filterSaturate"];
    }

    // 窗口失焦
    {
        // 标题按钮
        const apply = configView.querySelector(".windowBlur .apply");
        const reset = configView.querySelector(".windowBlur .reset");
        // 功能选项
        const transitionDelay = configView.querySelector(".windowBlur .transitionDelay");
        const transformScale = configView.querySelector(".windowBlur .transformScale");
        const filterBlur = configView.querySelector(".windowBlur .filterBlur");
        const filterBrightness = configView.querySelector(".windowBlur .filterBrightness");
        const filterSaturate = configView.querySelector(".windowBlur .filterSaturate");
        // 立即应用
        apply.addEventListener("click", () => {
            const config = pluginConfig.get("windowBlur");
            config["transitionDelay"] = transitionDelay.value;
            config["transformScale"] = transformScale.value;
            config["filterBlur"] = filterBlur.value;
            config["filterBrightness"] = filterBrightness.value;
            config["filterSaturate"] = filterSaturate.value;
            pluginConfig.set("windowBlur", config);
        });
        // 恢复默认
        reset.addEventListener("click", () => {
            transitionDelay.value = defaultConfig["windowBlur"]["transitionDelay"];
            transformScale.value = defaultConfig["windowBlur"]["transformScale"];
            filterBlur.value = defaultConfig["windowBlur"]["filterBlur"];
            filterBrightness.value = defaultConfig["windowBlur"]["filterBrightness"];
            filterSaturate.value = defaultConfig["windowBlur"]["filterSaturate"];
            pluginConfig.set("windowBlur", undefined);
        });
        transitionDelay.value = pluginConfig.get("windowBlur")["transitionDelay"];
        transformScale.value = pluginConfig.get("windowBlur")["transformScale"];
        filterBlur.value = pluginConfig.get("windowBlur")["filterBlur"];
        filterBrightness.value = pluginConfig.get("windowBlur")["filterBrightness"];
        filterSaturate.value = pluginConfig.get("windowBlur")["filterSaturate"];
    }
}


plugin.onConfig(() => {
    const configView = document.createElement("div");

    // 读取文件
    const filePath = `${this.pluginPath}/config.html`;
    const fileText = betterncm.fs.readFileText(filePath);
    fileText.then(text => {
        // 解析文件
        const parser = new DOMParser();
        const dom = parser.parseFromString(text, "text/html");
        dom.body.childNodes.forEach(node => {
            configView.appendChild(node);
        });

        // 初始化配置界面
        initConfigView(configView);
    });

    return configView;
});