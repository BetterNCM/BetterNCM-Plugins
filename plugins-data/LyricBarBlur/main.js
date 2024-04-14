plugin.onAllPluginsLoaded(() => {
    var crStyle = document.createElement('style');
    crStyle.setAttribute('id', 'LyricBBG');
    crStyle.innerHTML = "\
    .lyric-bar {\
        background: rgba(var(--md-accent-color-bg-rgb ,var(--ncm-bg-rgb)), 0.75);\
        backdrop-filter: blur(12px);\
    }\
    ";
    document.head.appendChild(crStyle);
});
plugin.onConfig(() => {
    return dom("div", {}, dom("p", { innerHTML: "请将LyricBar不透明度设置为100，否则使用LyricBarBackground时会出现bug", style: { fontSize: "18px" } }), dom("p", { innerHTML: "自定义设置开发中", style: { fontSize: "18px" } }))
});