const config = {
    'enable': true,
    'blur': false,
    'danmmaku': false,
    'cover': true,
    'darken': false,
    'lighten': false,
    'search-kwd': "MV {name} - {artist}",
    'filter-length': true
};
const configKeys = {
    'enable': ['启用', '启用 Bilibili 播放器'],
    'blur': ['模糊', '启用模糊效果'],
    'danmmaku': ['弹幕', '启用弹幕'],
    'cover': ['裁剪', '将视频自动裁剪至窗口分辨率'],
    'darken': ['暗化', '暗化背景'],
    'lighten': ['亮化', '亮化背景'],
    'search-kwd': ['搜索关键词', '搜索关键词，支持变量替换，{name} 为歌曲名，{artist} 为歌手名'],
    'filter-length': ['过滤时长', '根据音频时长匹配视频']
};

const ifr = document.createElement('iframe');
ifr.classList.add('betterncm-plugin-playwithbilio');
ifr.src = 'https://www.bilibili.com'
ifr.sandbox = 'allow-scripts allow-forms allow-same-origin'

// create css
const pluginStyle = document.createElement('style');
pluginStyle.innerHTML = ``;
document.head.appendChild(pluginStyle);

const updatePluginStyle = () => {
    pluginStyle.innerHTML = `
    iframe.betterncm-plugin-playwithbilio {
        filter: blur(${config.blur ? 10 : 0}px) ${config.darken ? 'brightness(0.5)' : ''} ${config.lighten ? 'brightness(1.5)' : ''};
        width: 100%;
        height: 100%;
        opacity: 0;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        transition: opacity 200ms;
        z-index: 9;
    }
    `;
}

const switchUrl = (url, after = () => { }) => {
    return new Promise(async rs => {
        await fadeOut()
        ifr.src = url;
        ifr.onload = async () => {
            await after();
            await fadeIn()
        }
    })
}

const fadeOut = () => {
    ifr.style.opacity = 0;
    return betterncm.utils.delay(200);
}

const fadeIn = () => {
    ifr.style.opacity = 1;
    return betterncm.utils.delay(200);
}

plugin.onLoad(() => {


    // load config from localStorage(playwithbilio) as json, key by key
    for (const key in configKeys) {
        try {
            config[key] = JSON.parse(localStorage[`playwithbilio.${key}`]);
        } catch (e) { }
    }
    updatePluginStyle();


    const initBiliPlayer = async () => {
        const btnFullScreen = await betterncm.utils.waitForFunction(() => ifr.contentDocument.querySelector('[aria-label="网页全屏"]'), 100)
        btnFullScreen.click();
        // add css in iframe
        const style = ifr.contentDocument.createElement('style');
        const updateStyle = () => {
            style.innerHTML = `
            .bpx-player-control-bottom,
            .bpx-player-toast-wrap,
            .bpx-player-control-wrap{
                display: none !important;
            }

            video {
                object-fit: ${config.cover ? 'cover' : 'contain'};
            }
        `;
        };

        updateStyle();

        ifr.contentDocument.head.appendChild(style);
        ifr.contentWindow.setInterval(() => {
            // check and close login prompt interval
            const loginCloseBtn = ifr.contentDocument.querySelector('.bili-mini-close-icon');
            if (loginCloseBtn) loginCloseBtn.click();

            // set danmmaku status
            const danmakuCheckbox = ifr.contentDocument.querySelector('.bui-danmaku-switch-input');
            if (danmakuCheckbox.checked !== config.danmmaku) danmakuCheckbox.click();

            // check if bpx-player-sending-bar exists and click btnfullscreen
            const isFullScreen = ifr.contentDocument.querySelector('.webscreen-fix');
            if (!isFullScreen) btnFullScreen.click();
            updateStyle();
        }, 100);
    };

    document.body.prepend(ifr)

    const biliFetch = ifr.contentWindow.fetch;
    const searchVideo = async (kwd) => await biliFetch(`https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(kwd)}`).then(res => res.json())

    const getPlayingSong = (() => {
        const cachedFunctionMap = new Map();
        // https://github.com/Steve-xmh/LibSongInfo/blob/main/index.ts
        function callCachedSearchFunction(searchFunctionName, args) {
            if (!cachedFunctionMap.has(searchFunctionName.toString())) {
                const findResult = betterncm.ncm.findApiFunction(searchFunctionName);
                if (findResult) {
                    const [func, funcRoot] = findResult;
                    cachedFunctionMap.set(searchFunctionName.toString(), func.bind(funcRoot));
                }
            }
            const cachedFunc = cachedFunctionMap.get(searchFunctionName.toString());
            if (cachedFunc) {
                return cachedFunc.apply(null, args);
            }
            else {
                throw new TypeError(`函数 ${searchFunctionName.toString()} 未找到`);
            }
        }
        return function getPlayingSong() {
            return callCachedSearchFunction("getPlaying", []);
        }
    })();

    const urlMap = {};

    let ifrVideo = null;


    const reloadVideo = async () => {
        if (!config.enable) return;
        const { data: { name, artists, duration } } = getPlayingSong();
        const kwd = config['search-kwd']
            .replace("{name}", name)
            .replace("{artist}", artists[0].name) ?? `MV ${name} - ${artists[0].name}`;

        console.log('[PlayWithBilibili] Searching: ', kwd)

        if (!urlMap[kwd])
            urlMap[kwd] = await searchVideo(kwd)
                .then(result => (console.log('[PlayWithBilibili] Result: ', result), result));

        let url = urlMap[kwd].data.result[0].arcurl;

        if (config['filter-length']) {
            const video = urlMap[kwd].data.result.map(v => [v.arcurl, v.duration.split(':').reverse().reduce((a, b, i) => a + b * Math.pow(60, i), 0)])
                .filter(v => Math.abs(v[1] - duration / 1000) < 5)
                .sort((a, b) => Math.abs(a[1] - duration / 1000) > Math.abs(b[1] - duration / 1000))

            if (video.length > 0) {
                url = video[0];
            } else {
                url = null;
            }
        }

        if (url) {
            await switchUrl(urlMap[kwd].data.result[0].arcurl, initBiliPlayer);
            ifrVideo = ifr.contentDocument.querySelector('video');
            ifrVideo.volume = 0
        } else {
            await fadeOut();
            ifr.src = "about:blank"
        }

    };

    legacyNativeCmder.appendRegisterCall('Load', 'audioplayer', betterncm.utils.debounce(reloadVideo))

    legacyNativeCmder.appendRegisterCall('PlayState', 'audioplayer', (_, __, state) => {
        if (state === 1) ifrVideo?.play();
        else ifrVideo?.pause();
    });

    legacyNativeCmder.appendRegisterCall('PlayProgress', 'audioplayer', (_, progress) => {
        if (!ifrVideo) return;
        if (Math.abs(ifrVideo?.currentTime - progress) > 0.3) ifrVideo.currentTime = progress;
        if (loadedPlugins.LibFrontendPlay?.currentAudioPlayer?.paused === false) ifrVideo?.play();
        ifrVideo.volume = 0
    });

});

plugin.onConfig(tools => {
    const configDoms = [];

    // generate config dom and bind by keys. store in localStorage
    for (const [key, [name, description]] of Object.entries(configKeys)) {
        const configDom = document.createElement('div');
        configDom.classList.add('setting-item');
        configDom.innerHTML = `
            <span class="setting-item-name">${name}</span>
            <span class="setting-item-description">${description}</span>
            <input type="${(typeof config[key] === 'boolean') ? "checkbox" : "input"}" style="color:black;">
        `;
        const checkbox = configDom.querySelector('input');

        if (typeof config[key] === 'boolean')
            checkbox.checked = config[key];
        else if (typeof config[key] === 'string')
            checkbox.value = config[key];

        checkbox.addEventListener('change', () => {
            config[key] = typeof config[key] === 'boolean' ? checkbox.checked : checkbox.value;
            saveConfig();
            updatePluginStyle();
        });
        configDoms.push(configDom);
    }

    // write and inject beautiful css for them
    const style = document.createElement('style');
    style.innerHTML = `
        .setting-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px;
            height: 40px;
            border-bottom: 1px solid #e5e5e5;
            background: #ffffff;
        }

        .setting-item-name {
            font-size: 14px;
            color: #333;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .setting-item-description {
            font-size: 12px;
            color: #999;
            white-space: nowrap;

            overflow: hidden;
            text-overflow: ellipsis;
        }

        .switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
        }

        .switch-input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .login-iframe{
            width: 100%;
            height: 500px;
        }
        `



    function saveConfig() {
        for (const key in configKeys) {
            localStorage[`playwithbilio.${key}`] = JSON.stringify(config[key]);
        }

        if (config.enable) {
            fadeIn();
        } else {
            fadeOut();
            ifr.src = "about:blank"
        }
    }

    const loginIfr = dom("div", {}, dom("button", {
        innerHTML: "登录", onclick: () => {
            loginIfr.firstChild.remove()
            loginIfr.prepend(dom('iframe',
                {
                    src: "https://bilibili.com",
                    sandbox: 'allow-scripts allow-forms allow-same-origin',
                    class: ["login-iframe"],
                    async onload() {
                        const td = this.contentWindow.document;
                        await betterncm.utils.delay(200)
                        const goLoginBtn = td.querySelector('.go-login-btn');
                        if (goLoginBtn) {
                            goLoginBtn.click();
                            const s = document.createElement('style');
                            s.innerHTML = `
.bili-mini-content-wp {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    width: 100% !important;
    height: 500px !important;
    border-radius: 0;
}
body{
overflow:hidden;
}
.bili-mini-close-icon,.i_cecream{
display:none;
}

    `;
                            td.head.append(s);

                        } else {
                            loginIfr.remove();
                        }
                    }
                }));
        }
    }))


    return dom('div', {
        innerHTML: ` <div class="setting-item">
        <span class="setting-item-name">Play With Bilibili MV</span>
        <span class="setting-item-description">使用 Bilibili 播放器自动播放 MV</span>
    </div>`
    }, ...configDoms, loginIfr, style)
});