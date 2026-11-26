"use strict";


plugin.onLoad(async () => {
    const {
        TaskbarLyricsAPI,
        defaultConfig,
        pluginConfig
    } = { ...this.base };
    const { startGetLyric, stopGetLyric } = { ...this.lyric };


    // 启动任务栏歌词软件
    const TaskbarLyricsStart = async () => {
        startGetLyric();
    };


    // 关闭任务栏歌词软件
    const TaskbarLyricsClose = async () => {
        TaskbarLyricsAPI.close({});
        stopGetLyric();
    };


    addEventListener("beforeunload", TaskbarLyricsClose);
    TaskbarLyricsStart();

    
    // 歌词设置
    const lyrics = {
        lyricsSwitch: event => event.target.checked ? TaskbarLyricsStart() : TaskbarLyricsClose(),
        setRetrievalMethod: (value, textContent) => {
            const config = JSON.parse(JSON.stringify(pluginConfig.get("lyrics")));
            config["retrieval_method"]["value"] = Number(value);
            config["retrieval_method"]["textContent"] = textContent;
            stopGetLyric();
            pluginConfig.set("lyrics", config);
            startGetLyric();
        },
        reset: elements => {
            elements.retrievalMethodValue.textContent = defaultConfig["lyrics"]["retrieval_method"]["textContent"];
            stopGetLyric();
            pluginConfig.set("lyrics", undefined);
            startGetLyric();
        }
    }

    this.func = {
        lyrics,
    };
});
