plugin.onLoad(() => {
    const ifr = document.createElement('iframe');
    ifr.src = 'https://www.bilibili.com'
    ifr.style.width = "100%";
    ifr.style.height = "100%";
    ifr.style.opacity = '0';
    ifr.sandbox = 'allow-scripts allow-forms allow-same-origin'

    const initBiliPlayer = async () => {
        const btnFullScreen = await betterncm.utils.waitForFunction(() => ifr.contentDocument.querySelector('[aria-label="网页全屏"]'), 100)
        btnFullScreen.click();
        // add css in iframe
        const style = ifr.contentDocument.createElement('style');
        style.innerHTML = `
            .bpx-player-control-bottom,
            .bpx-player-toast-wrap,
            .bpx-player-control-wrap{
                display: none !important;
            }
        `;
        ifr.contentDocument.head.appendChild(style);
        
    };

    const switchUrl = (url, after = () => { }) => {
        return new Promise(rs => {
            const anim = ifr.animate([{ opacity: ifr.style.opacity, opacity: '0' }], { duration: 200, fill: 'forwards' })
            anim.commitStyles();
            anim.addEventListener('finish', () => {
                ifr.src = url;
                ifr.onload = async () => {
                    await after();
                    const anim = ifr.animate([{ opacity: ifr.style.opacity, opacity: '1' }], { duration: 200, fill: 'forwards' })
                    anim.commitStyles();
                    rs();
                }
            })
        })
    }
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

    legacyNativeCmder.appendRegisterCall('Load', 'audioplayer', async () => {
        const { data: { name, artists } } = getPlayingSong();
        const kwd = `MV ${name} - ${artists[0].name}`;
        if (!urlMap[kwd])
            urlMap[kwd] = await searchVideo(kwd).then(result => result.data.result[0].arcurl);
        await switchUrl(urlMap[kwd], initBiliPlayer);
        ifrVideo = ifr.contentDocument.querySelector('video');
        ifrVideo.volume = 0
    })

    legacyNativeCmder.appendRegisterCall('PlayState', 'audioplayer', (_, __, state) => {
        if (state === 1) ifrVideo?.play();
        else ifrVideo?.pause();
    });

    legacyNativeCmder.appendRegisterCall('PlayProgress', 'audioplayer', (_, progress) => {
        if (Math.abs(ifrVideo.currentTime - progress) > 0.5) ifrVideo.currentTime = progress;
        if(loadedPlugins.LibFrontendPlay?.currentAudioPlayer?.paused===false) ifrVideo?.play();
        ifrVideo.volume = 0
    });

});