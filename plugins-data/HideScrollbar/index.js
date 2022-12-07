// 非常水的插件

plugin.onAllPluginsLoaded(plugins => plugins.StylesheetLoader.loadStylesheet(
    plugin,
    `${this.pluginPath}/style.css`,
    "HideScrollbar",
    {}
));