"use strict";

// 配置项的键名，保存在 config.json 中
const CONFIG_KEY = "simple_custom_css_content";
const STYLE_ID = "simple-custom-css-style";

// 1. 创建或获取用于注入 CSS 的 style 标签
function getStyleElement() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
        style = document.createElement("style");
        style.id = STYLE_ID;
        document.head.appendChild(style);
    }
    return style;
}

// 2. 从 BetterNCM 配置文件读取并应用 CSS
function applyCSS() {
    betterncm.app.readConfig(CONFIG_KEY, "").then(css => {
        const style = getStyleElement();
        style.innerHTML = css;
    });
}

// 3. 插件启动时立即应用一次
applyCSS();

// 4. 注册 BetterNCM 配置界面
plugin.onConfig(function (tools) {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.height = "100%";
    container.style.padding = "10px";
    container.style.boxSizing = "border-box";

    const label = document.createElement("h3");
    label.innerText = "输入自定义 CSS (实时生效，自动保存)";
    label.style.marginBottom = "10px";
    label.style.color = "var(--c-font)";
    container.appendChild(label);

    const textarea = document.createElement("textarea");
    textarea.placeholder = "例如：\n.m-tabwrap { background: transparent !important; }";
    
    // 样式美化
    textarea.style.flex = "1";
    textarea.style.width = "100%";
    textarea.style.minHeight = "300px";
    textarea.style.fontFamily = "Consolas, Monaco, monospace";
    textarea.style.padding = "10px";
    textarea.style.backgroundColor = "#2b2b2b";
    textarea.style.color = "#a9b7c6";
    textarea.style.border = "1px solid #444";
    textarea.style.borderRadius = "4px";
    textarea.style.resize = "vertical";

    // 打开配置窗口时，读取当前保存的值填入框中
    betterncm.app.readConfig(CONFIG_KEY, "").then(css => {
        textarea.value = css;
    });

    // 监听输入，实时保存到硬盘并应用
    textarea.addEventListener("input", (e) => {
        const newVal = e.target.value;
        // 写入到 config.json，重启不丢失
        betterncm.app.writeConfig(CONFIG_KEY, newVal);
        
        // 实时预览
        const style = getStyleElement();
        style.innerHTML = newVal;
    });

    container.appendChild(textarea);
    return container;
});