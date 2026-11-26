plugin.onConfig(function (tools) {
    let defaultConfigs = {
        fontSize: "30px",
        titleColor: "#ffffff",
        titleBG: "#00000000",
        artistColor: "#ffffff",
        artistBG: "#00000000",
        extraInfoColor: "#444444",
        extraInfoBG: "#ffffff",
        playerBG: "#0000ff",
        playlistSongNameColor: "#dddddd",
        playlistUserColor: "#929292",
        playlistBG: "#00000000",
        liveRoom: 25948785,
        borderRadius: "0.2rem",
        progressBarColor: "linear-gradient(90deg, #c2e7ff, #eddfff)",
        align: "left",
        layout1: "column",
        layout2: "column"
    };

    let configs = defaultConfigs
    let popup;
    function sendMessage(message) {
        if (popup)
            popup.postMessage(JSON.stringify({ ...message, _: "cc.microblock.liveSongPlayer" }), '*')
    }

    if (plugin.getConfig("configs", "")) configs = JSON.parse(plugin.getConfig("configs", ""))

    function makeConfig(name, key) {
        let extra;
        let configInput = tools.makeInput(configs[key], { onchange: (e) => setVal(key, e.target.value), onkeyup: (e) => setVal(key, e.target.value) });

        function setVal(key, val) {
            configs[key] = val;
            plugin.setConfig('configs', JSON.stringify(configs));

            configInput.value = val;
            if (extra && extra.value) extra.value = val

            sendMessage({ type: "syncConfig", configs })
        }



        if (defaultConfigs[key].startsWith && defaultConfigs[key].startsWith("#")) 
        extra = dom("input", { type: "color", value: configs[key], onchange: (e) => setVal(key, e.target.value) })

        return dom("div", {}, dom("span", { innerText: name }),
            configInput
            , extra)
    }

    const CONFIG_NAMES = {
        fontSize: "字体大小",
        titleColor: "歌曲标题颜色",
        titleBG: "歌曲标题背景",
        artistColor: "作者颜色",
        artistBG: "作者背景",
        extraInfoColor: "额外信息颜色",
        extraInfoBG: "额外信息背景",
        playerBG: "整体背景",
        playlistSongNameColor: "播放列表歌曲名颜色",
        playlistUserColor: "播放列表点歌人颜色",
        playlistBG: "播放列表背景",
        liveRoom: "直播间号",
        borderRadius: "圆角大小",
        progressBarColor: "进度条颜色",
        align: "对齐方式（left/right）",
        layout1: "整体布局（row/column）",
        layout2: "歌曲信息布局（row/column）"
    }

    let configsDoms = [];
    for (let key in configs) configsDoms.push(makeConfig(CONFIG_NAMES[key], key))


    let infoDetectHandle;

    function getSyncPlaying() {
        let id = betterncm.ncm.getPlaying().id;
        let title = document.querySelector("[data-log-type='title']").title;
        let artist = [...document.querySelectorAll(".f-dib .artist")].map(v => v.innerText).reduce((pre, cur) => pre.includes(cur) ? pre : pre.concat(cur), []).join("/")
        let cover = document.querySelector(".j-cover").src.replace("48y48", "512y512");
        let duration = document.querySelector("time.all").innerText.split(":").reduce((p, c) => { return p * 60 + parseInt(c) }, 0);
        return {
            type: "syncPlaying", id, title, artist, cover, duration
        }
    }

    return dom("div", {}, tools.makeBtn("打开点歌姬", async () => {
        let plugin = loadedPlugins.LiveSongPlayer

        const DEV_MODE = false;


        if (DEV_MODE)
            popup = window.open("http://127.0.0.1:5500/build/index.html", "live-songplayer", 'left=100,top=100,width=1205,height=565')
        else
            popup = window.open(BETTERNCM_FILES_PATH + plugin.pluginPath.split('./')[1] + "./build/index.html", "live-songplayer", 'left=100,top=100,width=1205,height=565')

        setTimeout(() => {
            sendMessage({ type: "syncConfig", configs })
            sendMessage(getSyncPlaying())
        }, 100)

        function monitorValue(fn, callback, inital, isSame = (v, v2) => v === v2) {
            let v = inital || fn();
            setInterval(() => {
                let v2 = fn()
                if (!isSame(v, v2)) { v = v2; callback(v2) }
            }, 100)
        }

        await betterncm.utils.waitForElement("[data-log-type='title']");

        let playlist = [], current = null;

        window.addEventListener("message", async (e) => {
            let msg = JSON.parse(e.data);
            if (msg._ != "cc.microblock.liveSongPlayer") return;

            if (msg.type === "addToPlaylist") {
                try {
                    let song = await plugin.utils.searchSong(msg.keyword);
                    playlist.push({
                        ...song, user: msg.user
                    });
                    attemptSwitchSong();
                    syncPlaylist();
                } catch (e) {
                    return;
                }

            }
        });

        function syncPlaylist() {
            sendMessage({ type: "syncPlaylist", list: playlist })
        }

        function attemptSwitchSong() {
            if (playlist.length > 0 && current === null) {
                current = playlist.shift();
                plugin.utils.playSong(current.id)
                return true;
            }
            return false;
        }

        if (!infoDetectHandle)
            infoDetectHandle = setTimeout(() => {
                monitorValue(getSyncPlaying, async (v) => {
                    if (current && current.id !== v.id) {
                        console.log(current, v)
                        current = null;
                    }
                    if (!attemptSwitchSong()) {
                        sendMessage(v);
                    }

                    syncPlaylist()
                }, -702, (v, v2) => v.id === v2.id)

                setInterval(() => {
                    sendMessage(getSyncPlaying());
                    syncPlaylist()
                }, 100)

                monitorValue(() => {
                    let cover = document.querySelector(".j-cover").src.replace("48y48", "512y512");
                    return {
                        type: "syncCover", cover
                    }
                }, async (v) => {
                    sendMessage(v);
                }, -702, (v, v2) => v.cover === v2.cover)

                monitorValue(() => document.querySelector("time.now").innerText.split(":").reduce((p, c) => { return p * 60 + parseInt(c) }, 0), (v) => {
                    sendMessage({
                        type: "currentTime",
                        time: v
                    });
                }, -702)
            }, 100)
    }),dom("div",{innerText:"更改设置后按回车应用哦~"}), ...configsDoms)
})
