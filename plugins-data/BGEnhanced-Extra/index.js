"use strict";


const defaultConfig = {
    pointerleave: {
        transitionDelay: 200,
        transformScale: 1.0
    },
    pointermove: {
        transitionDelay: 200,
        transformScale: 1.1
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
    }`;
    document.head.appendChild(element);
}


plugin.onLoad(async () => {
    checkPluginExistence();
    injectCSSStyles();

    const backgroundDom = document.querySelector(".BGEnhanced-BackgoundDom");
    let animationFrameRequest = null;
    let animationFrameRequested = false;

    // 鼠标移动
    document.addEventListener("pointermove", event => {
        if (!animationFrameRequested) {
            animationFrameRequested = true;
            animationFrameRequest = requestAnimationFrame(() => {
                const transitionDelay = pluginConfig.get("pointermove")["transitionDelay"];
                const transformScale = pluginConfig.get("pointermove")["transformScale"];
                let translateX = window.innerWidth / 2 - event.clientX;
                let translateY = window.innerHeight / 2 - event.clientY;
                translateX = translateX - translateX / transformScale;
                translateY = translateY - translateY / transformScale;
                backgroundDom.style.setProperty("--transitionDelay", `${transitionDelay}ms`);
                backgroundDom.style.setProperty("--transformScale", transformScale);
                backgroundDom.style.setProperty("--translateX", `${translateX}px`);
                backgroundDom.style.setProperty("--translateY", `${translateY}px`);
                animationFrameRequested = false;
            });
        }
    });

    // 鼠标离开
    document.addEventListener("pointerleave", () => {
        cancelAnimationFrame(animationFrameRequest);
        animationFrameRequested = false;
        const transitionDelay = pluginConfig.get("pointerleave")["transitionDelay"];
        const transformScale = pluginConfig.get("pointerleave")["transformScale"];
        backgroundDom.style.setProperty("--transitionDelay", `${transitionDelay}ms`);
        backgroundDom.style.setProperty("--transformScale", transformScale);
        backgroundDom.style.setProperty("--translateX", 0);
        backgroundDom.style.setProperty("--translateY", 0);
    });
});


plugin.onConfig(() => {
    const configView = document.createElement("div");

    const filePath = `${this.pluginPath}/config.html`;
    const fileText = betterncm.fs.readFileText(filePath);
    fileText.then(text => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(text, "text/html");
        dom.body.childNodes.forEach(node => {
            configView.appendChild(node);
        });

        // 指针移动
        {
            const apply = configView.querySelector(".pointermove .apply");
            const reset = configView.querySelector(".pointermove .reset");
            const transitionDelay = configView.querySelector(".pointermove .transitionDelay");
            const transformScale = configView.querySelector(".pointermove .transformScale");
            apply.addEventListener("click", () => {
                const config = pluginConfig.get("pointermove");
                config["transitionDelay"] = transitionDelay.value;
                config["transformScale"] = transformScale.value;
                pluginConfig.set("pointermove", config);
            });
            reset.addEventListener("click", () => {
                transitionDelay.value = defaultConfig["pointermove"]["transitionDelay"];
                transformScale.value = defaultConfig["pointermove"]["transformScale"];
                pluginConfig.set("pointermove", undefined);
            });
            transitionDelay.value = pluginConfig.get("pointermove")["transitionDelay"];
            transformScale.value = pluginConfig.get("pointermove")["transformScale"];
        }
        // 指针离开
        {
            const apply = configView.querySelector(".pointerleave .apply");
            const reset = configView.querySelector(".pointerleave .reset");
            const transitionDelay = configView.querySelector(".pointerleave .transitionDelay");
            const transformScale = configView.querySelector(".pointerleave .transformScale");
            apply.addEventListener("click", () => {
                const config = pluginConfig.get("pointerleave");
                config["transitionDelay"] = transitionDelay.value;
                config["transformScale"] = transformScale.value;
                pluginConfig.set("pointerleave", config);
            });
            reset.addEventListener("click", () => {
                transitionDelay.value = defaultConfig["pointerleave"]["transitionDelay"];
                transformScale.value = defaultConfig["pointerleave"]["transformScale"];
                pluginConfig.set("pointerleave", undefined);
            });
            transitionDelay.value = pluginConfig.get("pointerleave")["transitionDelay"];
            transformScale.value = pluginConfig.get("pointerleave")["transformScale"];
        }
    });

    return configView;
});