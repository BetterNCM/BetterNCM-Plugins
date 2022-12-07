<script>
    import { LiveWS } from "bilibili-live-ws";

    let configs = {
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
        layout2: "column",
    };

    let id, title, artist, cover, currentTime, duration;

    let playlist = [];

    let mainWindow;
    window.addEventListener("message", (e) => {
        let msg = JSON.parse(e.data);
        if (msg._ != "cc.microblock.liveSongPlayer") return;
        mainWindow = e.source;

        console.log(msg);

        if (msg.type === "syncPlaying") {
            ({ id, title, artist, cover, duration } = msg);
        }

        if (msg.type === "currentTime") {
            currentTime = msg.time;
        }

        if (msg.type === "syncPlaylist") {
            playlist = msg.list;
        }

        if (msg.type === "syncCover") {
            cover = msg.cover;
        }

        if (msg.type === "syncConfig") {
            configs = msg.configs;
            updateConfigs(configs);
        }
    });

    function sendMessage(message) {
        mainWindow.postMessage(
            JSON.stringify({ ...message, _: "cc.microblock.liveSongPlayer" }),
            "*"
        );
    }

    let live;
    function initLiveRoom(id) {
        live = new LiveWS(id);
        live.on("open", () => console.log("Connection is established"));
        live.on("live", () => {
            live.on("heartbeat", console.log);
            live.on("msg", ({ cmd, data, info }) => {
                if (cmd === "DANMU_MSG") {
                    let message = info[1];

                    function detectCommand(cmd, callback) {
                        if (message.startsWith(cmd)) {
                            let args = message
                                .slice(cmd.length)
                                .trim()
                                .split(" ");
                            callback(args);
                        }
                    }

                    function detectCommands(cmds, callback) {
                        for (let cmd of cmds) detectCommand(cmd, callback);
                    }

                    detectCommands(["play", "pl", "点歌"], (keyword) => {
                        sendMessage({
                            type: "addToPlaylist",
                            keyword: keyword.join(" "),
                            user: {
                                name: info[2][1],
                                id: info[2][0],
                            },
                        });
                    });
                }
            });
        });
    }

    function displayTime(time) {
        return `${Math.floor(time / 60)
            .toString()
            .padStart(2, "0")}:${(time % 60).toString().padStart(2, "0")}`;
    }

    function updateConfigs(configs) {
        if (live) live.close();
        initLiveRoom(parseInt(configs.liveRoom));
        let r = document.querySelector(":root");

        for (let config in configs) {
            if (config === "align")
                r.style.setProperty(
                    "--" + config,
                    configs[config] === "left" ? "flex-start" : "flex-end"
                );
            else r.style.setProperty("--" + config, configs[config]);
        }
    }

    updateConfigs(configs);
</script>

<div class="player">
    <div class="currentPlaying">
        <div class="cover" style="background-image: url({cover});" />
        <div
            class="info"
            style="--translateX:-{(
                100 -
                (currentTime / duration) * 100
            ).toFixed(2)}%;"
        >
            <div class="title">{title}</div>
            <div class="artist">{artist}</div>
            <div class="extra">
                {displayTime(currentTime)}/{displayTime(duration)}
                <small>ID</small>{id}
            </div>
        </div>
    </div>
    <div class="playlist">
        {#each playlist as play, index}
            <div class="play">
                <span class="name">{play.name}</span>
                <span class="user"> {play.user.name}</span>
            </div>
        {/each}
    </div>
</div>

<style lang="less">
    @import url("https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100;300;400;500;700;900&display=swap");

    @coverSize: 6em;

    * {
        font-family: "Noto Sans SC", sans-serif;
        overflow: hidden;
        // -webkit-text-stroke: .02em rgb(255, 255, 255);
    }

    .with-border-radius() {
        border-radius: var(--borderRadius);
    }

    .withBG(@var_name) {
        padding: 0 0.4rem;
        .with-border-radius();
        background: var(@var_name);
    }

    .player {
        display: flex;
        flex-direction: var(--layout1);
        
        .currentPlaying {
            display: flex;
            flex-direction: var(--layout2);
            align-items: var(--align);
            margin: 1em;
            

            .cover {
                min-width: @coverSize;
                width: @coverSize;
                height: @coverSize;
                min-height: @coverSize;
                display: inline-block;
                background-size: cover;
                margin-right: 0.5em;
                margin-bottom: 0.5em;
                .with-border-radius();
            }

            .info {
                margin-top: -0.3rem;
                margin-right: 0.5em;
                align-items: var(--align);
                display: flex;
                flex-direction: column;

                * {
                    overflow: hidden;
                    white-space: nowrap;
                }
                .title {
                    color: var(--titleColor);
                    width: max-content;
                    font-weight: 800;
                    font-size: 1.8em;
                    // margin-top: -0.2em;
                    position: relative;
                    z-index: 3;
                    .withBG(--titleBG);
                    &::after {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        height: 0.2em;
                        z-index: 2;
                        content: "";
                        background: var(--progressBarColor);
                        transform: translateX(var(--translateX));
                    }
                }
                .artist {
                    width: max-content;
                    font-weight: 700;
                    color: var(--artistColor);
                    .withBG(--artistBG);
                    margin-top: 0.3rem;
                }
                .extra {
                    .withBG(--extraInfoBG);
                    font-weight: 600;
                    font-size: 1em;
                    color: var(--extraInfoColor);
                    background: white;
                    width: max-content;
                    margin-top: 0.3rem;
                }
            }
        }

        .playlist {
            min-width: 10em;
            margin-right: 1.5em;
            margin-left: 1em;
            display: flex;
            flex-direction: column;
            align-items: var(--align);
            .play {
                width: max-content;
                background: var(--playlistBG);

                .index {
                    font-weight: 800;
                    font-size: small;
                    color: #8686ad;
                }
                .name {
                    font-weight: 700;
                    color: var(--playlistSongNameColor);
                }
                .user {
                    font-weight: 600;
                    color: var(--playlistUserColor);
                }
            }
        }
    }
</style>
