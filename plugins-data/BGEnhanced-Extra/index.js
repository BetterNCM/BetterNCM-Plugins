"use strict";


const defaultConfig = {
    pointermove: {
        transitionDelay: 150,
        transformScale: 1.1,
        filterBrightness: 0.8,
        filterBlur: 0
    },
    pointerleave: {
        positionResetSwitch: true,
        transitionDelay: 300,
        transformScale: 1.0,
        filterBrightness: 1.0,
        filterBlur: 0
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
            scale(var(--transformScale, ${pluginConfig.get("pointerleave")["transformScale"]}))
            translateX(var(--translateX, 0px))
            translateY(var(--translateY, 0px))
        ;
        filter:
            brightness(var(--filterBrightness, ${pluginConfig.get("pointerleave")["filterBrightness"]}))
            blur(var(--filterBlur, ${pluginConfig.get("pointerleave")["filterBlur"]}px))
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
                const transitionDelay = pluginConfig.get("pointermove")["transitionDelay"];
                const transformScale = pluginConfig.get("pointermove")["transformScale"];
                const filterBrightness = pluginConfig.get("pointermove")["filterBrightness"];
                const filterBlur = pluginConfig.get("pointermove")["filterBlur"];
                let translateX = window.innerWidth / 2 - event.clientX;
                let translateY = window.innerHeight / 2 - event.clientY;
                translateX = translateX - translateX / transformScale;
                translateY = translateY - translateY / transformScale;
                backgroundDom.style.setProperty("--transitionDelay", `${transitionDelay}ms`);
                backgroundDom.style.setProperty("--transformScale", transformScale);
                backgroundDom.style.setProperty("--translateX", `${translateX}px`);
                backgroundDom.style.setProperty("--translateY", `${translateY}px`);
                backgroundDom.style.setProperty("--filterBrightness", `${filterBrightness}`);
                backgroundDom.style.setProperty("--filterBlur", `${filterBlur}px`);
                animationFrameRequested = false;
            });
        }
    });

    // 指针离开
    document.addEventListener("pointerleave", () => {
        cancelAnimationFrame(animationFrameRequest);
        animationFrameRequested = false;
        const positionResetSwitch = pluginConfig.get("pointerleave")["positionResetSwitch"];
        const transitionDelay = pluginConfig.get("pointerleave")["transitionDelay"];
        const transformScale = pluginConfig.get("pointerleave")["transformScale"];
        const filterBrightness = pluginConfig.get("pointerleave")["filterBrightness"];
        const filterBlur = pluginConfig.get("pointerleave")["filterBlur"];
        backgroundDom.style.setProperty("--transitionDelay", `${transitionDelay}ms`);
        backgroundDom.style.setProperty("--transformScale", transformScale);
        // 复位
        if (positionResetSwitch) {
            backgroundDom.style.setProperty("--translateX", 0);
            backgroundDom.style.setProperty("--translateY", 0);
        }
        backgroundDom.style.setProperty("--filterBrightness", `${filterBrightness}`);
        backgroundDom.style.setProperty("--filterBlur", `${filterBlur}px`);
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
        const transitionDelay = configView.querySelector(".pointermove .transitionDelay");
        const transformScale = configView.querySelector(".pointermove .transformScale");
        const filterBrightness = configView.querySelector(".pointermove .filterBrightness");
        const filterBlur = configView.querySelector(".pointermove .filterBlur");
        // 立即应用
        apply.addEventListener("click", () => {
            const config = pluginConfig.get("pointermove");
            config["transitionDelay"] = transitionDelay.value;
            config["transformScale"] = transformScale.value;
            config["filterBrightness"] = filterBrightness.value;
            config["filterBlur"] = filterBlur.value;
            pluginConfig.set("pointermove", config);
        });
        // 恢复默认
        reset.addEventListener("click", () => {
            transitionDelay.value = defaultConfig["pointermove"]["transitionDelay"];
            transformScale.value = defaultConfig["pointermove"]["transformScale"];
            filterBrightness.value = defaultConfig["pointermove"]["filterBrightness"];
            filterBlur.value = defaultConfig["pointermove"]["filterBlur"];
            pluginConfig.set("pointermove", undefined);
        });
        // 初始化值
        transitionDelay.value = pluginConfig.get("pointermove")["transitionDelay"];
        transformScale.value = pluginConfig.get("pointermove")["transformScale"];
        filterBrightness.value = pluginConfig.get("pointermove")["filterBrightness"];
        filterBlur.value = pluginConfig.get("pointermove")["filterBlur"];
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
        const filterBrightness = configView.querySelector(".pointerleave .filterBrightness");
        const filterBlur = configView.querySelector(".pointerleave .filterBlur");
        // 立即应用
        apply.addEventListener("click", () => {
            const config = pluginConfig.get("pointerleave");
            config["positionResetSwitch"] = positionResetSwitch.checked;
            config["transitionDelay"] = transitionDelay.value;
            config["transformScale"] = transformScale.value;
            config["filterBrightness"] = filterBrightness.value;
            config["filterBlur"] = filterBlur.value;
            pluginConfig.set("pointerleave", config);
        });
        // 恢复默认
        reset.addEventListener("click", () => {
            positionResetSwitch.checked = defaultConfig["pointerleave"]["positionResetSwitch"];
            transitionDelay.value = defaultConfig["pointerleave"]["transitionDelay"];
            transformScale.value = defaultConfig["pointerleave"]["transformScale"];
            filterBrightness.value = defaultConfig["pointerleave"]["filterBrightness"];
            filterBlur.value = defaultConfig["pointerleave"]["filterBlur"];
            pluginConfig.set("pointerleave", undefined);
        });
        // 初始化值
        positionResetSwitch.checked = pluginConfig.get("pointerleave")["positionResetSwitch"]
        transitionDelay.value = pluginConfig.get("pointerleave")["transitionDelay"];
        transformScale.value = pluginConfig.get("pointerleave")["transformScale"];
        filterBrightness.value = pluginConfig.get("pointerleave")["filterBrightness"];
        filterBlur.value = pluginConfig.get("pointerleave")["filterBlur"];
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