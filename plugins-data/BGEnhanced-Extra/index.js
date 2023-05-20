"use strict";

plugin.onLoad(async () => {
    // 检测是否存在BGEnhanced插件，没有就弹出通知
    if (!("BGEnhanced" in loadedPlugins)) {
        channel.call(
            "trayicon.popBalloon",
            () => { },
            [{
                title: "BGEnhanced扩展",
                text: "没有找到BGEnhanced插件！\n请先安装此插件后重试",
                icon: "path",
                hasSound: true,
                delayTime: 2e3,
            }]
        );
        return;
    }

    // 加载样式
    const element = document.createElement("style");
    element.textContent = `.BGEnhanced-BackgoundDom { transition: all 300ms ease-out; }`;
    document.head.appendChild(element);

    const backgoundDom = document.querySelector(".BGEnhanced-BackgoundDom");
    const transformScale = 1.1;

    // 鼠标进入
    document.addEventListener("pointerenter", (event) => {
        backgoundDom.style.transform = `scale(${transformScale})`;
    });

    // 鼠标离开
    document.addEventListener("pointerleave", (event) => {
        backgoundDom.removeAttribute("style");
    });

    // 鼠标进入
    document.addEventListener("pointermove", (event) => {
        let translateX = window.innerWidth / 2 - event.clientX;
        let translateY = window.innerHeight / 2 - event.clientY;
        translateX = translateX - translateX / transformScale;
        translateY = translateY - translateY / transformScale;
        backgoundDom.style.transform = `scale(${transformScale}) translate(${translateX}px, ${translateY}px)`;
    });
});
