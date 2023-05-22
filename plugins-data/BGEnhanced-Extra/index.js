"use strict";


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
            var(--transitionDelay, 0ms)
            ease-out
        ;
        transform:
            scale(var(--transformScale, 1))
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
    const transitionDelay = 200;
    const transformScale = 1.1;

    // 鼠标进入
    document.addEventListener("pointerenter", () => {
        backgroundDom.style.setProperty("--transitionDelay", `${transitionDelay}ms`);
        backgroundDom.style.setProperty("--transformScale", transformScale);
    });

    // 鼠标离开
    document.addEventListener("pointerleave", () => {
        backgroundDom.style.setProperty("--transformScale", 1);
        backgroundDom.style.setProperty("--translateX", 0);
        backgroundDom.style.setProperty("--translateY", 0);
    });

    // 鼠标移动
    document.addEventListener("pointermove", event => {
        let translateX = window.innerWidth / 2 - event.clientX;
        let translateY = window.innerHeight / 2 - event.clientY;
        translateX = translateX - translateX / transformScale;
        translateY = translateY - translateY / transformScale;
        backgroundDom.style.setProperty("--translateX", `${translateX}px`);
        backgroundDom.style.setProperty("--translateY", `${translateY}px`);
    });
});
