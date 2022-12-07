plugin.onAllPluginsLoaded(async function (plugins) {
    await plugins.StylesheetLoader.loadStylesheet(plugin, this.pluginPath + "/tinyncm.css", "tinyncm", {
        removePostcast: {
            name: "删除播客",
            reflect: "bodyFlag",
            class: "remove-postcast",
            type: "checkbox",
            default: true
        }, removeVideo: {
            name: "删除视频",
            reflect: "bodyFlag",
            class: "remove-video",
            type: "checkbox",
            default: true
        }, removeSubscribed: {
            name: "删除关注",
            reflect: "bodyFlag",
            class: "remove-subscribed",
            type: "checkbox",
            default: true
        }, removeLive: {
            name: "删除直播",
            reflect: "bodyFlag",
            class: "remove-live",
            type: "checkbox",
            default: true
        }, removeFM: {
            name: "删除FM",
            reflect: "bodyFlag",
            class: "remove-fm",
            type: "checkbox",
            default: true
        }, removeExclusive: {
            name: "删除独家放送",
            reflect: "bodyFlag",
            class: "remove-exclusive",
            type: "checkbox",
            default: true
        }, removeLatestMusic: {
            name: "删除最新音乐",
            reflect: "bodyFlag",
            class: "remove-latest-music",
            type: "checkbox",
            default: true
        }, removeStuff: {
            name: "删除杂项",
            reflect: "bodyFlag",
            class: "remove-stuff",
            type: "checkbox",
            default: true
        }, listOpt: {
            name: "一次性渲染歌单内全部歌曲（减少滑动掉帧，增加载入时长）",
            reflect: "bodyFlag",
            class: "disable-ncm-list-optimization",
            type: "checkbox",
            default: false
        }
    });
})