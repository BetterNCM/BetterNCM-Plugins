"use strict";


plugin.onLoad(async () => {
    const TaskbarLyricsPort = 50063;

    const TaskbarLyricsFetch = (path, params) => fetch(
        `http://127.0.0.1:${TaskbarLyricsPort}/component${path}/`,
        {
            method: "POST",
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json"
            }
        }
    );

    const TaskbarLyricsAPI = {

        // 歌词设置
        lyrics: {
            lyrics: params => TaskbarLyricsFetch("/lyrics/lyrics", params),
        },
        
    };

    // 默认的配置
    const defaultConfig = {
        "lyrics": {
            "retrieval_method": {
                "value": 1,
                "textContent": "使用LibLyric解析获取歌词",
            }
        },
        "effect": {
            "next_line_lyrics_position": {
                "value": 0,
                "textContent": "副歌词，下句歌词显示在这"
            },
            "extra_show": {
                "value": 2,
                "textContent": "当前翻译，没则用上个选项"
            },
            "adjust": 0.0
        },
    };


    const pluginConfig = {
        get: name => Object.assign({}, defaultConfig[name], plugin.getConfig(name, defaultConfig[name])),
        set: (name, value) => plugin.setConfig(name, value)
    };


    this.base = {
        TaskbarLyricsPort,
        TaskbarLyricsAPI,
        defaultConfig,
        pluginConfig
    };
});
