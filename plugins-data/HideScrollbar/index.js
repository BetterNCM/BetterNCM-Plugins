// 非常水的插件

plugin.onLoad(async () => {
    const cssText = `
        *::-webkit-scrollbar,
        *::-webkit-scrollbar-button,
        *::-webkit-scrollbar-corner,
        *::-webkit-scrollbar-thumb,
        *::-webkit-scrollbar-track,
        *::-webkit-scrollbar-track-piece {
            background-color: transparent !important;
        }
    `;
    const styleTag = document.createElement("style");
    styleTag.innerText = cssText;
    document.head.appendChild(styleTag);
});
