console.log(
    "[HideLyric] location =",
    location.href
);

console.log(
    "[HideLyric] pluginPath =",
    plugin.pluginPath
);

// 获取网易云音乐客户端版本
const ncmVersion =
    betterncm.ncm.getNCMVersion();

// 获取主版本号
const ncmMajorVersion =
    Number.parseInt(
        ncmVersion.split(".")[0],
        10
    );



// Rust
const RUST_EXE =
    `${plugin.pluginPath}\\HideLyric.exe`;


// Rust daemon 地址
const RUST_URL =
    "http://127.0.0.1:10086";


// 检查间隔
const CHECK_INTERVAL = 100;


// 无歌词字符数判定阈值
let meaninglessThreshold =
    plugin.getConfig(
        "meaninglessThreshold",
        50
    );


// 切歌检查延迟
let stateClearDelay =
    plugin.getConfig(
        "stateClearDelay",
        100
    );


// 插件配置
let autoHideEnabled =
    plugin.getConfig(
        "enabled",
        true
    );

plugin.onConfig(() => {

    const container =
        document.createElement("div");
    container.id =
        "HideLyricSettings";
    const style =
        document.createElement("style");


    style.textContent = `

#HideLyricSettings {
    --hly-fg: var(--themeC1, var(--colorPrimary1));
    --hly-bg: rgba(var(--md-accent-color-bg-rgb, var(--ncm-fg-rgb)), .3);
    color: var(--md-accent-color-secondary, var(--ncm-text, var(--colorBlack2)));
    line-height:24px;
    font-size:16px;
}


#HideLyricSettings .button {
    color:
        var(--md-accent-color-secondary, var(--ncm-text))
        !important;

    font-size:14px;

    height:30px;

    line-height:0;

    outline:0;

    box-shadow:
        0 0 3px var(--hly-fg);

    border:
        1px solid var(--hly-fg);

    border-radius:6px;

    background:
        var(--hly-bg);

    backdrop-filter:
        blur(12px);

    transition:.1s;
}


#HideLyricSettings .button:hover {
    box-shadow:
        0 0 6px var(--hly-fg);
}


#HideLyricSettings .button:active {
    font-size:14px;

    border-width:4px;

    box-shadow:
        0 0 8px var(--hly-fg);
}


#HideLyricSettings .textBox {
    padding:10px;
}


#HideLyricSettings .textBox:focus {
    font-size:15px;

    border-width:3px;

    box-shadow:
        0 0 8px var(--hly-fg);
}

.hly-switch {
    position:relative;

    width:40px;

    height:20px;

    cursor:pointer;

    display:inline-block;
}


.hly-switch input {
    display:none;
}


.hly-switch .track {
    position:absolute;

    top:3px;

    left:3px;

    width:34px;

    height:14px;

    background:
        rgba(154,153,153,.8);

    border-radius:8px;

    transition:.2s;
}



.hly-switch .thumb {
    position:absolute;

    top:0;

    left:0;

    width:20px;

    height:20px;

    background:white;

    border-radius:50%;

    box-shadow:
        0 3px 8px #0005;

    transition:
        .2s cubic-bezier(.8,.4,.3,1.25);
}


.hly-switch input:checked + .track {
    background:
        var(--hly-fg);
    opacity:.50;
}


.hly-switch input:checked ~ .thumb {
    transform:
        translateX(20px);

    background:
        var(--hly-fg);

    box-shadow:
        0 3px 8px
        color-mix(
            in srgb,
            var(--hly-fg),
            transparent 70%
        );
}
`;

    container.appendChild(style);


    // 插件标题
    const title =
        document.createElement("div");


    title.innerHTML = `
    HideLyric<br>
    v1.1.0 by 
    <span 
        id="githubLink"
        style="
            /*使用网易云主题色,如果没有 themeC1，则使用 colorPrimary1*/
            color:var(--themeC1, var(--colorPrimary1));
            text-decoration:underline;
            cursor:pointer;
        "
    >
        Lzhyrifx
    </span>
`;

    title.querySelector(
        "#githubLink"
    ).addEventListener(
        "click",
        () => {
            betterncm.ncm.openUrl(
                "https://github.com/Lzhyrifx"
            );

        }
    );


    title.style.fontSize =
        "18px";


    title.style.fontWeight =
        "normal";


    title.style.marginBottom =
        "12px";


    title.style.whiteSpace =
        "normal";


    container.appendChild(title);


    // 功能开关
    const option =
        document.createElement("div");


    option.style.padding =
        "4px 0";


    const label =
        document.createElement("label");


    label.style.display =
        "flex";


    label.style.alignItems =
        "center";


    label.style.cursor =
        "pointer";


    const switchBox =
        document.createElement("label");


    switchBox.className =
        "hly-switch";


    const checkbox =
        document.createElement("input");


    checkbox.type =
        "checkbox";


    checkbox.checked =
        autoHideEnabled;


    const track =
        document.createElement("span");


    track.className =
        "track";


    const thumb =
        document.createElement("span");


    thumb.className =
        "thumb";


    switchBox.appendChild(
        checkbox
    );


    switchBox.appendChild(
        track
    );


    switchBox.appendChild(
        thumb
    );



    const text =
        document.createElement("span");


    text.textContent =
        "自动隐藏无歌词桌面歌词";


    checkbox.addEventListener(
        "change",
        () => {


            autoHideEnabled =
                checkbox.checked;



            plugin.setConfig(
                "enabled",
                autoHideEnabled
            );



            if (!autoHideEnabled) {


                shouldHide =
                    false;


                requestShow();


                return;
            }


            updateLyricsWindowState();

        }
    );


    text.style.marginLeft =
        "10px";


    label.appendChild(
        switchBox
    );


    label.appendChild(
        text
    );


    option.appendChild(
        label
    );


    container.appendChild(
        option
    );


    // 切歌检查延迟
    const delayOption =
        document.createElement("div");


    delayOption.innerHTML = `

<div style="
    line-height:45px;
">

    <span>
        切歌检查延迟
    </span>


    <input
        id="stateClearDelayInput"
        class="button textBox"
        type="number"
        min="0"
        max="2000"
        step="10"
        value="${stateClearDelay}"
        style="
            width:65px;
            margin-left:8px;
        "
    />


    <span>
        ms
    </span>

</div>


<div style="
    font-size:14px;
    opacity:0.8;
    margin-top:0;
">

    切歌时等待以上时间再确认歌词状态<br>
    如果无歌词->无歌词歌曲中间会显示一下歌词再消失,则可以适当调大<br>
    如果有歌词->无歌词歌曲会显示一下(纯音乐,请欣赏)则可以适当调小

</div>
`;


    const delayInput =
        delayOption.querySelector(
            "#stateClearDelayInput"
        );


    delayInput.addEventListener(
        "change",
        () => {

            let value =
                Number(
                    delayInput.value
                );


            if (
                Number.isNaN(value)
            ) {

                value = 200;
            }


            value =
                Math.max(
                    0,
                    Math.min(
                        2000,
                        value
                    )
                );


            stateClearDelay =
                value;


            delayInput.value =
                value;


            plugin.setConfig(
                "stateClearDelay",
                value
            );
        }
    );


    // 无意义字符数阈值
    const lengthOption =
        document.createElement("div");


    lengthOption.innerHTML = `

<div style="
    line-height:45px;
">

    <span>
        无意义字符数阈值
    </span>


    <input
        id="meaninglessThresholdInput"
        class="button textBox"
        type="number"
        min="1"
        max="500"
        step="1"
        value="${meaninglessThreshold}"
        style="
            width:65px;
            margin-left:8px;
        "
    />


    <span>
        字
    </span>

</div>


<div style="
    font-size:14px;
    opacity:0.8;
    margin-top:0;
">
    总歌词数低于以上字数将直接隐藏
</div>
`;


    const lengthInput =
        lengthOption.querySelector(
            "#meaninglessThresholdInput"
        );


    lengthInput.addEventListener(
        "change",
        () => {


            let value =
                Number(
                    lengthInput.value
                );


            if (
                Number.isNaN(value)
            ) {

                value = 50;
            }


            value =
                Math.max(
                    1,
                    Math.min(
                        500,
                        value
                    )
                );


            meaninglessThreshold =
                value;


            lengthInput.value =
                value;


            plugin.setConfig(
                "meaninglessThreshold",
                value
            );


            runMeaninglessLyricCheck();

        }
    );


    container.appendChild(
        delayOption
    );


    container.appendChild(
        lengthOption
    );


    // 本地示例图片
    const image = document.createElement("img");

    image.alt = "HideLyric 预览图";
    image.style.width = "300px";
    image.style.display = "block";
    image.style.margin = "15px 0 0 0";

    container.appendChild(image);

// 获取本地图片的完整路径
    const imagePath =
        `${plugin.pluginPath}\\preview.png`;

// 将本地文件挂载为 HTTP 地址
    if (typeof betterncm.fs?.mountFile === "function") {
        Promise.resolve()
            .then(() => betterncm.fs.mountFile(imagePath))
            .then(url => {
                if (typeof url !== "string" || !url) {
                    throw new Error("mountFile 未返回有效 URL");
                }

                image.src = url;

                console.log(
                    "[HideLyric] 本地图片加载地址：",
                    url
                );
            })
            .catch(error => {
                console.error(
                    "[HideLyric] 本地图片加载失败：",
                    imagePath,
                    error
                );
            });
    } else {
        console.error(
            "[HideLyric] 当前环境不支持 betterncm.fs.mountFile"
        );
    }


    return container;

});

function getCurrentSong() {
    try {
        const result = betterncm.ncm.getPlayingSong?.();

        if (!result) {
            return null;
        }

        // data 或 track 都行，优先 data
        const song = result.data ?? result.track;

        if (!song?.id) {
            return null;
        }

        return {
            id: song.id,
            name: song.name ?? "",
            artists: (song.artists ?? [])
                .map(a => a.name)
                .join(", ")
        };
    } catch (error) {
        console.error("[HideLyric] 获取当前歌曲失败:", error);
        return null;
    }
}
window.getCurrentSong = getCurrentSong;



// Rust daemon: 我已?!启动?!
let rustReady = false;


// Rust daemon 初始化Promise
let rustInitPromise = null;


// Rust daemon 是否正在?!启动?!
let rustStartingPromise = null;


// DesktopLyrics 是否应该隐藏
let shouldHide = false;


// 最近一次成功发送的命令
// true = hide
// false = show
// null
let lastCommand = null;


// 无意义歌词检测状态
let meaninglessLyricDetected= false;


// 无意义歌词清除延迟计时器
let meaninglessLyricClearTimer = null;


// 当前是否有hide/show命令正在执行
let commandRunning = false;


// 最新目标状态
// true  = hide
// false = show
// null
let pendingHide = null;


// 检测Rust daemon连接状态
// 发送ping请求验证Rust后端是否可用
async function pingRust() {

    try {
        // 发送ping请求
        const response =
            await fetch(
                `${RUST_URL}/ping`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        // 检查HTTP响应状态
        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        // 读取Rust返回内容
        const text =
            await response.text();


        // 标记Rust daemon已就绪
        rustReady =
            true;

        return true;


    } catch (error) {

        // 标记 Rust daemon 不可用
        rustReady =
            false;


        // 启动如果只出现一次是正常现象
        console.log(
            "[HideLyric] Rust ping 失败:",
            error
        );


        return false;
    }
}


async function startRustDaemon() {
    try {

        await betterncm.app.exec(
            `"${RUST_EXE}" daemon`
        );

        return true;

    } catch (error) {

        console.error(
            "[HideLyric] Rust daemon 启动失败:",
            error
        );

        return false;
    }
}


// 确保Rust daemon可用
async function ensureRust() {
    if (rustReady) {
        return true;
    }

    if (rustStartingPromise) {
        return await rustStartingPromise;
    }


    // 创建唯一启动任务
    rustStartingPromise =
        (async () => {
            try {
                if (await pingRust()) {
                    lastCommand =
                        null;
                    return true;
                }


                const started =
                    await startRustDaemon();

                if (!started) {
                    rustReady =
                        false;
                    return false;
                }


                // 等待 daemon 就绪
                const startTime =
                    performance.now();


                while (
                    performance.now() - startTime < 2000
                    ) {

                    if (await pingRust()) {


                        lastCommand =
                            null;


                        return true;
                    }


                    await new Promise(
                        resolve =>
                            setTimeout(resolve, 50)
                    );
                }


                console.error(
                    "[HideLyric] Rust daemon启动超时"
                );


                rustReady =
                    false;


                return false;

            } finally {

                rustStartingPromise =
                    null;
            }

        })();

    return await rustStartingPromise;
}


// 向 Rust 发送命令
async function sendRustCommand(command) {
    try {
        const url =
            `${RUST_URL}/${command}`;

        const response =
            await fetch(
                url,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );



        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }


        return true;

    } catch (error) {

        console.error(
            `[HideLyric] Rust /${command} 失败:`,
            error
        );


        rustReady =
            false;


        return false;
    }
}



async function controlLyricsWindow(hide) {

    // 记录最新目标状态
    pendingHide =
        hide;

    /*
    console.log(
        "[HideLyric] 新的窗口目标状态 =",
        hide ? "HIDE" : "SHOW"
    );*/

    // 已经有命令正在执行
    if (commandRunning) {
        /*
        console.log(
            "[HideLyric] wait"
        );*/
        return;
    }


    commandRunning =
        true;


    try {

        while (pendingHide !== null) {

            // 读取最新目标状态
            const targetHide =
                pendingHide;


            pendingHide =
                null;


            const command =
                targetHide
                    ? "hide"
                    : "show";


            // 如果已经成功发送过同样的命令,则不重复发送
            if (lastCommand === command) {
                /*
                console.log(
                    `[HideLyric] 已经是 ${command} 状态，跳过`
                );*/
                continue;
            }

            /*
            console.log(
                `[HideLyric] DesktopLyrics -> ${command}`
            );*/


            // 等待Rust初始化
            if (rustInitPromise) {
                await rustInitPromise;
            }


            // 如果初始化失败，尝试恢复
            if (!rustReady) {
                const ready =
                    await ensureRust();


                if (!ready) {
                    /*
                    console.error(
                        "[HideLyric] Rust daemon 初始化/恢复失败"
                    );*/


                    pendingHide =
                        targetHide;


                    break;
                }
            }


            let success =
                await sendRustCommand(command);


            if (!success) {
                /*
                console.warn(
                    "[HideLyric] Rust命令失败,尝试立即恢复ing"
                );*/


                const recovered =
                    await ensureRust();


                if (recovered) {
                    /*
                    console.log(
                        "[HideLyric] Rust daemon已恢复,重新发送:",
                        command
                    );*/


                    success =
                        await sendRustCommand(command);

                } else {
                    /*
                    console.error(
                        "[HideLyric] Rust daemon恢复失败"
                    );*/
                }
            }


            if (success) {
                lastCommand =
                    command;

                /*
                console.log(
                    `[HideLyric] DesktopLyrics ${command} 成功`
                );*/

            } else {
                lastCommand =
                    null;


                pendingHide =
                    targetHide;


                break;
            }
        }

    } finally {
        commandRunning =
            false;
    }
}


// 隐藏
function requestHide() {
    if (
        shouldHide === true &&
        pendingHide === true
    ) {

        return;
    }


    shouldHide =
        true;

    /*
    console.warn(
        "[HideLyric] requestHide()"
    );*/


    controlLyricsWindow(true);
}


// 显示
function requestShow() {
    if (
        shouldHide === false &&
        pendingHide === false
    ) {

        return;
    }


    shouldHide =
        false;

    /*
    console.log(
        "[HideLyric] ★ requestShow()"
    );*/


    controlLyricsWindow(false);
}


// 判断DesktopLyrics应该显示还是隐藏
function updateLyricsWindowState() {
    // 开关
    if (!autoHideEnabled) {

        requestShow();

        return;
    }


    if (meaninglessLyricDetected) {

        requestHide();

    } else {

        requestShow();
    }
}


function  updateMeaninglessLyricDetected(detected) {
    if (detected) {

        // 清除延迟
        if (meaninglessLyricClearTimer) {

            clearTimeout(
                meaninglessLyricClearTimer
            );


            meaninglessLyricClearTimer =
                null;
        }


        if (meaninglessLyricDetected) {

            return;
        }


        meaninglessLyricDetected =
            true;

        /*
        console.warn(
            "[HideLyric] 检测到滚木歌词"
        );*/


        updateLyricsWindowState();


        return;
    }


    if (!meaninglessLyricDetected) {

        return;
    }


    if (meaninglessLyricClearTimer) {

        return;
    }


    meaninglessLyricClearTimer =
        setTimeout(
            () => {

                meaninglessLyricClearTimer =
                    null;


                meaninglessLyricDetected =
                    false;


                updateLyricsWindowState();

            },
            stateClearDelay
        );
}


function checkMeaninglessLyric() {
    const lyric =
        document.querySelector(
            ".LyricDisplayInnerContainer_l1o4576w"
        );


    const noLyric =
        document.querySelector(
            ".no-lyric > span"
        );


    const pureMusic =
        document.querySelector(
            ".NoLyricContainer_n1wmw8cp .content > span"
        );

    const texts =
        [];


    if (lyric) {

        const els =
            lyric.querySelectorAll("p");


        for (const el of els) {

            const text =
                el.textContent?.trim() || "";


            if (!text) {
                continue;
            }


            texts.push(text);
        }
    }


    if (noLyric) {

        const text =
            noLyric.textContent?.trim() || "";


        if (text) {

            texts.push(text);
        }
    }


    if (pureMusic) {

        const text =
            pureMusic.textContent?.trim() || "";


        if (text) {

            texts.push(text);
        }
    }

    if (texts.length === 0) {

        updateMeaninglessLyricDetected(false);

        return;
    }


    const fullText =
        texts.join("");


    const normalizedText =
        fullText.replace(
            /[\s，,]/g,
            ""
        );


    const pureMusicKeywordDetected =
        normalizedText.includes(
            "纯音乐请欣赏"
        );


    const length =
        [...normalizedText].length;


    const ScrollableLyric =
        !!document.querySelector(
            '[class*="ScrollableLyricDisplayContainer_spqfaoe"]'
        );


    const detected =
        pureMusicKeywordDetected ||
        length < meaninglessThreshold ||
        (
            length >= meaninglessThreshold &&
            !ScrollableLyric
        );


    updateMeaninglessLyricDetected(
        detected
    );
}


// 当前已检测的歌曲 ID
let apiLyricSongId = null;


// 当前歌曲的歌词缓存
// null表示尚未取得结果,空字符串表示没有歌词
let apiLyricText = null;


// 已经发起请求的歌曲ID
let apiLyricRequestedSongId = null;


// 请求序号,用于忽略过期请求
let apiLyricRequestToken = 0;


// 请求失败后的重试时间
let apiLyricRetryAfter = 0;


// 上次统计歌词时使用的阈值
let apiLyricLastEvaluatedThreshold = null;


// 去除歌词时间戳和作词、作曲等元数据
function normalizeApiLyric(lyric) {
    return String(lyric || "")
        .split(/\r?\n/)
        .filter(line => {
            return !/^\s*\{.*"c"\s*:/.test(line);
        })
        .filter(line => {
            return !/^\s*\[(?:ti|ar|al|by|re|ve|offset|length):/i.test(line);
        })
        .map(line => {
            return line
                .replace(
                    /^\s*(?:\[\d{1,2}:\d{2}(?:[.:]\d+)?\]\s*)+/,
                    ""
                )
                .trim();
        })
        .filter(Boolean)
        .join("")
        .replace(/[\s，,]/g, "");
}


function evaluateApiLyric(lyric) {
    const normalizedText =
        normalizeApiLyric(lyric);

    const pureMusicKeywordDetected =
        normalizedText.includes("纯音乐请欣赏");

    const length =
        [...normalizedText].length;

    const lrcTimedLineCount =
        String(lyric || "")
            .split(/\r?\n/)
            .filter(line =>
                /^\s*\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/.test(line)
            )
            .length;

    const detected =
        pureMusicKeywordDetected ||
        length < meaninglessThreshold ||
        lrcTimedLineCount === 0;

    updateMeaninglessLyricDetected(detected);

    apiLyricLastEvaluatedThreshold =
        meaninglessThreshold;
}


async function checkMeaninglessLyricV2() {
    const song = getCurrentSong();

    window.__hideLyricLastSong = song ? { id: song.id, name: song.name } : null;

    if (!song?.id) {
        return;
    }


    const songId =
        String(song.id);
    if (apiLyricSongId !== songId) {

        console.log("[HideLyric] 检测到切歌:", {
            songId,
            songName: song.name
        });

        apiLyricSongId = songId;

        apiLyricText = null;

        apiLyricRequestedSongId = null;

        apiLyricRetryAfter = 0;

        apiLyricLastEvaluatedThreshold = null;

        apiLyricRequestToken++;
    }

    if (apiLyricText !== null) {
        if (
            apiLyricLastEvaluatedThreshold !==
            meaninglessThreshold
        ) {
            evaluateApiLyric(apiLyricText);
        }

        return;
    }


    if (apiLyricRequestedSongId === songId) {
        return;
    }


    if (Date.now() < apiLyricRetryAfter) {
        return;
    }

    apiLyricRequestedSongId = songId;

    const requestToken =
        apiLyricRequestToken;

    /*
    console.log(
        "[HideLyric] 正在请求 2.x 歌词 API",
        song.name,
        "ID:",
        songId
    );*/

    const url = new URL(
        "https://music.163.com/api/song/lyric/v1"
    );

    Object.entries({
        tv: -1,
        lv: -1,
        rv: 0,
        kv: 0,
        yv: 0,
        ytv: 0,
        yrv: 0,
        cp: false,
        id: songId
    }).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    try {
        const controller = new AbortController();

        const timeoutId = setTimeout(
            () => controller.abort(),
            10000
        );

        const response = await fetch(url, {
            cache: "no-store",
            signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const data =
            await response.json();


        if (
            data.code != null &&
            Number(data.code) !== 200
        ) {
            throw new Error(
                `歌词 API 返回 code=${data.code}`
            );
        }

        if (requestToken !== apiLyricRequestToken) {
            return;
        }

        const latestSong =
            getCurrentSong();

        if (String(latestSong?.id) !== songId) {
            return;
        }

        apiLyricText =
            data.lrc?.lyric ?? "";

        /*
        console.log(
            "[HideLyric] 2.x 歌词获取完成:",
            song.name,
            "ID:",
            songId,
            "正文字符数:",
            [...normalizeApiLyric(apiLyricText)].length
        );

        console.log(
            "[HideLyric] 2.x 歌词内容：\n",
            apiLyricText
        );*/

        evaluateApiLyric(apiLyricText);

    } catch (error) {
        if (requestToken !== apiLyricRequestToken) {
            return;
        }

        console.error(
            "[HideLyric] 2.x 歌词获取失败:",
            error
        );

        apiLyricRequestedSongId = null;

        apiLyricRetryAfter =
            Date.now() + 5000;
    }
}


let lyricCheckDebugLogged = false;


function runMeaninglessLyricCheck() {
    if (!lyricCheckDebugLogged) {
        console.log(
            "[HideLyric] 检测调度已执行",
            {
                ncmVersion,
                ncmMajorVersion
            }
        );
        lyricCheckDebugLogged = true;
    }


    if (ncmMajorVersion === 2) {
        void checkMeaninglessLyricV2();
    } else {
        checkMeaninglessLyric();
    }
}


rustInitPromise = ensureRust();
if (window.__hideLyricmeaninglessLyricTimer) {
    clearInterval(window.__hideLyricmeaninglessLyricTimer);
}


window.__hideLyricTickCount = 0;


window.__hideLyricmeaninglessLyricTimer = setInterval(() => {
    window.__hideLyricTickCount++;
    runMeaninglessLyricCheck();
}, CHECK_INTERVAL);


runMeaninglessLyricCheck();


if (window.__hideLyricHeartbeatTimer) {
    clearInterval(
        window.__hideLyricHeartbeatTimer
    );
}


window.__hideLyricHeartbeatTimer =
    setInterval(
        async () => {
            const alive =
                await pingRust();


            // Rust正常
            if (alive) {
                return;
            }


            /*
            console.warn(
                "[HideLyric] Rust daemon似了,尝试自动恢复ing"
            );*/


            const recovered =
                await ensureRust();


            if (!recovered) {
                /*
                console.error(
                    "[HideLyric] Rust daemon自动恢复失败"
                );*/


                return;
            }

            /*
            console.log(
                "[HideLyric] Rust daemon已自动恢复"
            );*/


            lastCommand =
                null;


            updateLyricsWindowState();

        },
        5000
    );