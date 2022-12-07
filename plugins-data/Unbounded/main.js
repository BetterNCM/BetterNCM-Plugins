plugin.onAllPluginsLoaded(async function (plugins) {
    await plugins.StylesheetLoader.loadStylesheet(plugin, `${this.pluginPath}/theme.css`, "Unbounded", {
        background: {
            name: "背景",
            key: "--Unbounded-background",
            reflect: "cssVar",
            type: "cssBackground",
            default: "url(https://s1.ax1x.com/2022/06/11/XcOy4J.jpg)"
        }
    });
});
