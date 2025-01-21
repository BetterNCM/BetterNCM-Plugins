/*This plugin is licensed under the GNU/GPL-3.0*/
let rvN, v, amllbgv/*Apple Music-like Lyrics Background Video*/, c, bgc/*Background Canvas*/, cpc/*ColorPick() Canvas*/, cover, cvUrlCache, songDataCache, tMsT, lrcCache, pLrc, pLrcKeys, showRefrshing, thePiPWindow
, DontPlay=false, DontPause=false, autoRatio, autoRatioValue=480, lastReRatio=0, songIdCache=0, playProgress=0, nrLrc=false, lrcNowLoading=false, reRatioPending=false, isDynamicLyrics=false, isJp=false,debugMode=false
, isVLsnAdded=false, isLrcRnpLsnAdded=false
, t = "0:00／0:00", tC = 0, tT = 0, tP = 0, tR = 0 //显示用，Current，Total，PassedRate，Remaining
, readCfg = JSON.parse(localStorage.getItem("PiPWindowSettings"))
, color = ({accent: "", text: "", textT13: "", textT31: "", textT42: "", textT56: "", bg: "", bgT00: "", bgT50: ""}), colorS = ({accent: "", text: "", bg: "", bgT: ""}), colorCache = ({text: "", bg: ""})
const pdd = "M21 3C21.5523 3 22 3.44772 22 4V11H20V5H4V19H10V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM21 13C21.5523 13 22 13.4477 22 14V20C22 20.5523 21.5523 21 21 21H13C12.4477 21 12 20.5523 12 20V14C12 13.4477 12.4477 13 13 13H21Z"
, pO = `<path d="${pdd}M20 15H14V19H20V15ZM6.70711 6.29289L8.95689 8.54289L11 6.5V12H5.5L7.54289 9.95689L5.29289 7.70711L6.70711 6.29289Z"></path>`
, pC = `<path d="${pdd}"></path>`
, cfgDefault = ({
    whenClose: "none", whenBack: "back", whenCloseOrBack_paused: "close", autoHideMainWindow: false
    , allowNonsquareCover: false, showAlbum: true, timeInfo: "CurrentTotal"
    , dynamicLyrics: true, autoScroll: true, originalLyricsBold: false, showTranslation: true, /*showLatinization: false,*/ lyricsTaperOff: true, lyricsMask: false, lyricsHanzi2Kanji: true, lyricsOffset: 0, lyricsFrom: "LibLyric", lyricsCustomSources: "https://example.com/lyric?track=${track}&id=${trackId}&art=${artist}&arts=${artists}&album=${album}&albumId=${albumId}", showLyricsErrorTip: true
    , colorFrom: "albumCover", backgroundFrom: "albumCoverBlur", customFonts: "\"Segoe UI\", \"Microsoft Yahei UI\", system-ui", useJapaneseFonts: true, customJapaneseFonts: "\"Yu Gothic UI\", \"Meiryo UI\", \"Microsoft Yahei UI\", system-ui"
    , smoothProgessBar: true, resolutionRatio: "auto", aspectRatio: "2:1", customLoadingTxt: "正在载入猫猫…"})
readCfg = {...cfgDefault, ...readCfg} //缺失配置啥的处理一下
let oldCfg = {...readCfg}
window.PiPWShowRefrshing = (x=true)=>{if(x==true){showRefrshing=true;return true}else if(x==false){showRefrshing=false;return false}}
function cE(n, d=document) {return d.createElement(n)}
function q(n, d=document) {return d.querySelector(n)}
function qAll(n, d=document) {return d.querySelectorAll(n)}
const cn2jp = loadedPlugins.LibOpenCC?OpenCC.Converter({from: "cn", to: "jp"}):waht;
function waht() {return arguments[0]}

function DEBUG() {try{
    q("#PiPWSettings").appendChild(bgc);
    q("#PiPWSettings").appendChild(c);
    q("#PiPWSettings").appendChild(v);
    amllbgv?q("#PiPWSettings").appendChild(amllbgv):"";
}catch{}}

async function tipMsg(m, t) {
    let d, c1="u-result", c2="j-tips", c=`.${c1}.${c2}`, iiH=`<span class="u-tit f-ff2">${m}</span>`
    if (t=="err") {
        iiH=`<i class="icon u-icn u-icn-operatefail"></i><span class="u-tit f-ff2 errTxt">${m}</span>`
    }
    let iH=`<div class="wrap"><div class="inner j-flag">${iiH}</div></div>`
    if (q(c+":not(.z-hide)")) {
        if (q(c+" .inner")) {q(c+" .inner").innerHTML=iiH} else {q(c).innerHTML=iH}
        try{clearTimeout(tMsT)}catch{}
    } else {
        d = cE("div");
        d.classList.add(c1, c2);
        d.innerHTML = iH;
        q("body").appendChild(d);
    }
    tMsT = setTimeout(()=>{
        q(c).classList.add("z-hide");
        q(c+".z-hide").addEventListener("animationend", ()=>{q(c).remove()})
    }, 1200)
}
function reRatio(rv) {
    function r() {autoRatioValue=rvN; lastReRatio=Date.now()}
    if (autoRatio) { let l = lastReRatio+1000, n = Date.now(); rvN=rv
        if (l<=n) {lastReRatio=Date.now();reRatio(rv)}
        else if (!reRatioPending){reRatioPending=true;setTimeout(()=>{r();reRatioPending=false}, l-n)}
    }
}

HTMLCanvasElement.prototype.toPiP = function(){
    if (!(v instanceof HTMLVideoElement)) {
        v = cE("video");
        v.addEventListener("loadedmetadata", async()=>{
            try {
                //请求小窗.then自适应分辨率用的
                v.requestPictureInPicture().then(p=>{thePiPWindow=p;reRatio(p.height);p.addEventListener("resize", e=>{reRatio(e.target.height)})})
                let pS = ".m-player:not(.f-dn)"
                //控制按钮设置
                navigator.mediaSession.setActionHandler("play", ()=>{v.play();navigator.mediaSession.playbackState = "playing";});
                navigator.mediaSession.setActionHandler("pause", ()=>{v.pause();navigator.mediaSession.playbackState = "paused";});
                navigator.mediaSession.setActionHandler("previoustrack", ()=>{q(`${pS} .btnc-prv`).click()});
                navigator.mediaSession.setActionHandler("nexttrack", ()=>{q(`${pS} .btnc-nxt`).click()});
                if (isVLsnAdded) {return} //防止重复加监听器
                //小窗暂停/播放同步到主窗口
                function ncmPlay() {if (!DontPlay) {try{ q(`${pS} .btnp-play`).click() }catch{}}DontPause=false}
                function ncmPause() {if (!DontPause) {try{ q(`${pS} .btnp-pause`).click() }catch{}}DontPlay=false}
                v.addEventListener("play", ()=>{ncmPlay()})
                v.addEventListener("pause", ()=>{ncmPause()})
                //小窗打开/关闭逻辑
                v.addEventListener("enterpictureinpicture", e=>{ console.log("PiPW Log: PiP窗口已创建", v)
                    let s = betterncm.ncm.getPlayingSong()
                    if (!s) {s=({state:1})}
                    if (readCfg.autoHideMainWindow) {mwf.cef.R$call("winhelper.showWindow", "hide")}
                    tipMsg("已打开小窗"); q("#PiPW-Toggle svg").innerHTML=pC; q("#PiPW-Toggle").setAttribute("style", "fill: currentColor; opacity: 1"); q("#PiPW-Toggle").title = "关闭小窗";
                    if (s.state==1) {v.pause()} DontPlay=false
                    if(debugMode){console.log(e)}
                });
                v.addEventListener("leavepictureinpicture", e=>{ DontPause=true; let p = v.paused
                    tipMsg("已关闭小窗"); q("#PiPW-Toggle svg").innerHTML=pO; q("#PiPW-Toggle").setAttribute("style", ""); q("#PiPW-Toggle").title = "打开小窗";
                    setTimeout(()=>{
                        if (v.paused!=p) { //状态不一致，判定为按下关闭按钮
                            let c = readCfg.whenClose;
                            if (c == "pause") {DontPause=false;ncmPause()}
                            else if (c == "shutdown") {
                                ncmPause(); if(debugMode){tipMsg("调试模式：触发退出云音乐");return}
                                mwf.cef.R$call("winhelper.showWindow", "hide"); mwf.cef.R$exit()
                            }
                        } else if (!p) {
                            let b = readCfg.whenBack;
                            if (b == "back") {mwf.cef.R$call("winhelper.showWindow", "show")}
                        } else {
                            let b = readCfg.whenCloseOrBack_paused;
                            if (b == "back") {mwf.cef.R$call("winhelper.showWindow", "show")}
                        }
                    }, 10)
                    if(debugMode){console.log(e)}
                });
                //主窗口暂停/播放同步到小窗
                legacyNativeCmder.appendRegisterCall("PlayState", "audioplayer", (_, __, state) => { //监听播放状态变动
                    if (state === 2) {
                        DontPause=true; v.pause(); try{amllbgv.pause()}catch{}
                    } else if (state === 1) {
                        DontPlay=true; v.play(); try{amllbgv.play()}catch{}
                    }
                });
                isVLsnAdded = true
            } catch (e) {
                console.error("PiPW Error: PiP窗口创建出错，详情：\n", e);tipMsg("PiP窗口创建出错，详见JavaScript控制台", "err")
            }
        })
    }
    v.id = "PiPW-VideoE";
    let cs = this.captureStream();
    v.srcObject = cs; //刷新源
    v.controls = true; //调试用
    if(debugMode){DEBUG()}
    v.play() //否则黑窗
}

function pipToggle() {
    let pE = document.pictureInPictureElement
    if (pE && pE.id=="PiPW-VideoE") {
        document.exitPictureInPicture();
    } else {
        loadPiP(true, "PiPW-Toggle");
    }
}

function colorPick(from=null) { //取色
    let textTO, bgTO;
    function s(e, p) {
        return getComputedStyle(q(e)).getPropertyValue(p);
    }
    colorS.accent = s("body", "--themeC1"), colorS.text = s("body", "color");
    if (q("body.material-you-theme")) {colorS.text = s("body", "--md-accent-color-secondary")}
    if (/rgba/.test(colorS.text)) {textTO = colorS.text.replace(/,([^,)]*)\)/, "")}
    else {textTO = colorS.text.replace(/rgb\(/, "rgba(").replace(/\)/, "")}
    colorS.text = `${textTO})`
    colorS.bg = s("body", "background-color");
    if (/rgba/.test(colorS.bg)) {bgTO = colorS.bg.replace(/,([^,)]*)\)/, "")}
    else {bgTO = colorS.bg.replace(/rgb\(/, "rgba(").replace(/\)/, "")}
    colorS.bg = `${bgTO})`, colorS.bgT = `${bgTO}, .3)`;
    if (q("body.material-you-theme:not(.ncm-light-theme)")) {colorS.bgT = `${colorS.accent.replace(/\)/, "")}, .1)`;}
    if (from==null) {
        color.accent = colorS.accent;
        color.text = `${textTO})`, color.textT56 = `${textTO}, .56)`, color.textT42 = `${textTO}, .42)`, color.textT31 = `${textTO}, .31)`, color.textT13 = `${textTO}, .13)`;
        color.bg = `${bgTO})`, color.bgT00 = `${bgTO}, 0)`, color.bgT50 = `${bgTO}, .5)`;
    } else {
        function brightness(factor) {
            rN = Math.min(255, Math.max(0, rgb[0] * factor));
            gN = Math.min(255, Math.max(0, rgb[1] * factor));
            bN = Math.min(255, Math.max(0, rgb[2] * factor));
            return [Math.round(rN), Math.round(gN), Math.round(bN), 255];
        }
        if (!cpc) {cpc = cE("canvas"); cpc.width = 3; cpc.height = 3;}
        let cpcC = cpc.getContext("2d",{alpha:false})
        from.height?cpcC.drawImage(from, 0, 0, cpc.width, cpc.height):""
        let rgb = cpcC.getImageData(1, 1, 2, 2).data
        , l = (.299*rgb[0]+.587*rgb[1]+.114*rgb[2])
        , n = 1
        l<8?n=50 : l<16?n=16 : l<32?n=12 : l<64?n=8 : l<128?n=2 : l>160?n=(-.5) : ""
        let rgbN = brightness(l>160?1.1:.5)
        bgTO = `rgba(${rgbN[0]}, ${rgbN[1]}, ${rgbN[2]}`
        color.bg = `${bgTO})`, color.bgT00 = `${bgTO}, 0)`, color.bgT50 = `${bgTO}, .5)`;
        rgbN = brightness(.7+n)
        color.accent = `rgb(${rgbN[0]}, ${rgbN[1]}, ${rgbN[2]})`
        //rgbN = brightness(.7+n)
        textTO = `rgba(${rgbN[0]}, ${rgbN[1]}, ${rgbN[2]}`
        color.text = `${textTO})`, color.textT56 = `${textTO}, .56)`, color.textT42 = `${textTO}, .42)`, color.textT31 = `${textTO}, .31)`, color.textT13 = `${textTO}, .13)`;
    }
    try {let s0 = q("#PiPWSettingsStyle0"), s = `
#PiPWSettings {
    --pipws-fg: ${colorS.accent};
    --pipws-bg: ${colorS.bgT};
    --pipws-bg-wot: ${colorS.bg};
    color: ${colorS.text};
}`
        if (s0.innerHTML!=s) {s0.innerHTML=s}
    } catch {}
}

async function loadPiP(isToPiP=true, from="unknow") {
    let PiPE = document.pictureInPictureElement;
    if (!isToPiP && !PiPE && !debugMode) {return}
    if (PiPE && PiPE.id != "PiPW-VideoE") {tipMsg("PiP窗口被占用", "err"); if(!debugMode){return}}
    let startTime = Date.now();
    try {
        let nrInfo = false //need refresh
        , ldTxt = readCfg.customLoadingTxt;
        /*分辨率*/
        let r = readCfg.resolutionRatio
        if (r=="auto") {autoRatio=true; r=autoRatioValue} else {autoRatio=false; r=r*1}

        let pS = betterncm.ncm.getPlayingSong(), data;
        if (pS) {data = pS.data}
    
        let cvSizeX = r/3, cvSizeY = r/3, OcvUrl, cvUrl, snM, snA = null, saE, sa = "";
        getInfo();
        if (data.id != songIdCache) {reloadHead(); songIdCache = data.id; nrLrc=true}
        if (from=="Settings" && (oldCfg.lyricsFrom!=readCfg.lyricsFrom||oldCfg.lyricsCustomSources!=readCfg.lyricsCustomSources)) {nrLrc=true}
        function getInfo() {
            /*封面*/
            if (!cover) {
                cover = new Image();
            }
            let thbn = `thumbnail=184y184`; //写死
            if (readCfg.allowNonsquareCover) {cvSizeX = cover.width*(cvSizeY/cover.height);thbn=""}
            try {
                let c = q("img.j-cover")
                if (c) {OcvUrl = c.src; cvUrl = OcvUrl.replace(/thumbnail=([^&]+)/, thbn)}
                if (!cvUrl) {cvUrl = "orpheus://orpheus/style/res/default/default_play_disc.png"}
            } catch {
                try {
                    let u = data.album.picUrl
                    if (!u) {cvUrl = "orpheus://orpheus/style/res/default/default_play_disc.png"}
                    else {cvUrl = `orpheus://cache/?${u}?imageView&enlarge=1&type=webp${thbn==""?"":`&${thbn}`}`}
                } catch {}
            }
            if (cvUrl != cvUrlCache) {reloadHead()}
    
            /*歌名*/
            try {
                snM = data.name;
                if (readCfg.showAlbum) {
                    let n = data.album.name, t = data.album.transNames;
                    n = n?n:null, t = t?t[0]:null;
                    if (n||t) {snA = `${n||""}${t?" ("+t+")":""}`}
                } else {
                    let t = data.transNames, a = data.alias;
                    t = t?t[0]:null, a = a?a[0]:null;
                    if (t||a) {snA = `${t||""}${t&&a?" ":""}${a||""}`}
                }
            } catch {
                let t = q(".m-pinfo .j-title")
                snM = t?t.title:"没有曲目";
                try {
                    snA = q(".m-pinfo .j-title .s-fc4").textContent.slice(1).slice(0, -1);
                }catch{}
            }
    
            /*歌手*/
            try {
                saE = data.artists;
                for (i=0; i<saE.length; i++, sa=sa+"／") {
                    sa = sa + saE[i].name;
                }
                sa = sa.slice(0, -1); /*处理多余斜杠*/
                if (!sa) {sa = "未知艺术家"}
            } catch {
                saE = qAll(".m-pinfo .bar > .j-title span:first-child *")
                if (saE&&saE.length!=0) {
                    for (i=0; i<saE.length; i++, sa=sa+"／") {
                        sa = sa + saE[i].textContent;
                    }
                    sa = sa.slice(0, -1); /*处理多余斜杠*/
                    if (sa == "未知") {sa = "未知艺术家"}
                }
            }
        }

        /*时间*/
        try {
            tT = data.duration/1000, tP = tC/tT, tR = tT-tC
            let tCM = Math.floor(tC/60), tCS = Math.floor(tC%60), tCD = `${tCM}:${tCS<10?"0":""}${tCS}`
            , tTM = Math.floor(tT/60), tTS = Math.floor(tT%60), tTD = `${tTM}:${tTS<10?"0":""}${tTS}`
            , tRM = tTM-tCM, tRS = tTS-tCS
            , tI = readCfg.timeInfo
            if (tRS<0) {tRM = tRM-1, tRS = tRS+60} tRD = `-${tRM}:${tRS<10?"0":""}${tRS}`
            if (tI == "CurrentTotal") {t = `${tCD}／${tTD}`}
            else if (tI == "CurrentRemaining") {t = `${tCD}／${tRD}`}
        }catch{}
    
        /*歌词*/
        let lyrics = ({
            M: {
                0: "暂无歌词",
                1: "",
                2: "",
                3: "",
                4: "",
            },
            T: {
                0: "",
                1: "",
                2: "",
                3: "",
                4: "",
            },
            currentT: 0,
            currentD: 0,
        }), offset = readCfg.lyricsOffset*1000;
        if (readCfg.lyricsFrom != "RNP") {
            document.removeEventListener("lyrics-updated", rnpLrcUpdate);
            isLrcRnpLsnAdded = false
        }
        switch (readCfg.lyricsFrom) {
            case "RNP":getLrcRnp();break
            case "OriginalLyricBar":getLrcOrg();break
            case "LibLyric":getLrcLibLyric();break
            case "Custom":getLrcCustom();break
            default: showLrcErr("该词源设置项不存在")
        }
        function showLrcErr(e="没有详细错误信息") {
            isJp = false
            if (readCfg.showLyricsErrorTip) {
                lyrics.M[0] = "暂无歌词", lyrics.T[0] = ""
                lyrics.M[1] = `当前歌词源错误: ${readCfg.lyricsFrom}`, lyrics.T[1] = e
            }
            pLrc = {
                0: {time:0, duration:Infinity, originalLyric: lyrics.M[0], translatedLyric: lyrics.T[0]},
                1: {time:Infinity, duration:0, originalLyric: lyrics.M[1], translatedLyric: lyrics.T[1]}
            };
            pLrcKeys = Object.keys(pLrc)
        }
        function getLrcErr(e) {
            lrcNowLoading = false;
            console.error("PiPW Error: 获取歌词时出错，详情：", e);
            Object.prototype.toString.call(e)==="[object Object]"?e.message===undefined?e=JSON.stringify(e):e=e.message:""
            showLrcErr(e);
        }
        function rnpLrcUpdate(e) {
            pLrc = JSON.parse(JSON.stringify(e.detail.lyrics))
            handleLyrics()
            console.log("PiPW Log: GotLyrics", pLrc)
        };
        function getLrcRnp() {
            if (!loadedPlugins.RefinedNowPlaying) {showLrcErr("依赖的插件未安装")}
            try {
                if (!isLrcRnpLsnAdded) {
                    document.addEventListener("lyrics-updated", rnpLrcUpdate);
                    isLrcRnpLsnAdded = true
                    rnpLrcUpdate({detail:window.currentLyrics})
                }
                lrcUpdate();
            } catch(e) {console.error(`PiPW Error: 获取歌词时出错，详情：\n${e}`);showLrcErr(e)}
        }
        function getLrcOrg() {
            try {
                lyrics.M[0] = q(".m-lyric .s-fc0").textContent, lyrics.T[0] = q(".m-lyric .s-fc3").textContent
            }catch{
                try {
                    lyrics.M[0] = q(".m-lyric p").textContent
                }catch{}
            }
        }
        async function getLrcLibLyric() {
            if (lrcNowLoading) {lyrics.M[0] = ldTxt;return}
            if (!loadedPlugins.liblyric) {showLrcErr("依赖的插件未安装")}
            try {
                let ll = loadedPlugins.liblyric
                if (nrLrc) {
                    lrcNowLoading = true
                    nrLrc = false
                    lrcCache = await ll.getLyricData(data.id)
                    pLrc = ll.parseLyric(
                        lrcCache.lrc.lyric
                        , lrcCache.tlyric? lrcCache.ytlrc ? lrcCache.ytlrc.lyric : lrcCache.tlyric.lyric :""
                        , /*lrcCache.romalrc? lrcCache.yromalrc ? lrcCache.yromalrc.lyric : lrcCache.romalrc.lyric :*/""
                        , lrcCache.yrc? lrcCache.yrc.lyric :""
                    )
                    handleLyrics()
                    console.log("PiPW Log: Lyrics", lrcCache);console.log("PiPW Log: ParsedLyrics", pLrc);
                    lrcNowLoading = false
                }
                lrcUpdate();
            } catch(e) {getLrcErr(e)}
        }
        async function getLrcCustom() {
            if (lrcNowLoading) {lyrics.M[0] = ldTxt;return}
            if (!loadedPlugins.liblyric) {showLrcErr("依赖的插件未安装")}
            try {
                let ll = loadedPlugins.liblyric
                if (nrLrc) {
                    lrcNowLoading = true
                    nrLrc = false
                    let songDetails = {
                        track: data.name,
                        trackId: data.id,
                        artist: data.artists[0].name,
                        artists: sa,
                        album: data.album.name,
                        albumId: data.album.id,
                    };
                    let url = readCfg.lyricsCustomSources.replace(/\$\{(\w+)\}/g, (_, p1) => {
                        return songDetails[p1];
                    });
                    fetch(url).then(response => {
                        if (!response.ok) {
                            throw new Error(`${response.status} ${response.statusText}`);
                        }
                        return response.text()
                    })
                    .then(lrc=>{
                        pLrc = ll.parseLyric("", "", "", lrc)
                        handleLyrics()
                        console.log("PiPW Log: ParsedLyrics", pLrc);
                        lrcNowLoading = false
                    })
                    .catch(e=>{getLrcErr(e)});
                }
                lrcUpdate();
            } catch(e) {getLrcErr(e)}
        }
        function handleLyrics() {
            pLrcKeys = Object.keys(pLrc)
            for (let i = 0; i < pLrcKeys.length; i++) {
                isJp = /[ぁ-ヿ]/g.test(pLrc[i].originalLyric)
                if (isJp==true) {break}
            }
            for (let i = 0; i < pLrcKeys.length; i++) {
                let o = pLrc[i].originalLyric, t = pLrc[i].translatedLyric
                if (o==t) {pLrc[i].translatedLyric = ""} //优化歌词查看体验
                o = pLrc[i].originalLyric.replace(/\s+/g, " ").trim()
                if (o=="") {pLrc[i].originalLyric = "· · ·", pLrc[i].translatedLyric = ""}
                else if (isJp && readCfg.lyricsHanzi2Kanji) {
                    let d = pLrc[i].dynamicLyric
                    pLrc[i].originalLyric = cn2jp(o)
                    try{pLrc[i].dynamicLyric = JSON.parse(cn2jp(JSON.stringify(d)))}catch{}
                } else {pLrc[i].originalLyric = o}
            }
        }
        function lrcUpdate() {
            let l = pLrcKeys.length, p = playProgress+offset
            for (let i = 0; i < l; i++) {
                let d = pLrc[i].duration
                if (p < pLrc[i].time+d || l-i==1) {
                    if (pLrc[i].dynamicLyric&&readCfg.dynamicLyrics) {
                        lyrics.M[0] = pLrc[i].dynamicLyric
                        lyrics.currentT = pLrc[i].dynamicLyricTime
                    } else {
                        lyrics.M[0] = pLrc[i].originalLyric
                        lyrics.currentT = pLrc[i].time
                    }
                    lyrics.currentD = d==0?data.duration-pLrc[i].time:d
                    for (let j = 1; j < 5; j++) {lyrics.M[j] = i+j<l?pLrc[i+j].originalLyric:""}
                    for (let j = 0; j < 5; j++) {lyrics.T[j] = i+j<l?pLrc[i+j].translatedLyric?pLrc[i+j].translatedLyric:"":""}
                    break
                }
            }
        }
        if (!readCfg.showTranslation) {for (let i=0; i<5; i++) {lyrics[`T${i}`] = ""}}
    
        /*取色环节*/
        readCfg.colorFrom=="albumCover"? colorPick(cover?cover:null) : colorPick()
        if (color.text!=colorCache.text||color.bg!=colorCache.bg) {reloadHead(); colorCache.text=color.text, colorCache.bg=color.bg}
    
        /*创建canvas*/
        loadC()
        function loadC() {
            let [w, h] = readCfg.aspectRatio.split(":").map(Number), rw = Math.round(r*(w/h)) //因为width不能设为小数
            if (!c) {
                c = cE("canvas");
                console.log("PiPW Log: canvas元素已创建", c);
            }
            if (!bgc) {
                bgc = cE("canvas");
                console.log("PiPW Log: 背景canvas元素已创建", bgc);
            }
            if (c.width != rw || c.height != r) {
                c.width = rw; c.height = r; reloadHead();
                bgc.width = rw; bgc.height = r;
            }
            if (isToPiP && !PiPE) {
                DontPlay=true; //解决打开小窗时自动播放的问题
                c.toPiP();
                reloadHead()
            }
        }
    
        function reloadHead() {
            cover.src = cvUrl;
            cvUrlCache = cvUrl;
            nrInfo = true;
        }
    
        /*字体*/
        let bold="", f = readCfg.customFonts, fM = f, fT = f; //这里f后期也许单独做一个界面字体
        if (readCfg.originalLyricsBold) {bold="bold"}

        /*日文字体更换*/
        if (readCfg.useJapaneseFonts && isJp) {fM = readCfg.customJapaneseFonts}

        if (from=="Settings") {reloadHead()} //如果是改字体/显示的信息或者颜色有变……

        let cC = c.getContext("2d",{alpha:false}), bgcC = bgc.getContext("2d",{alpha:false}) //alpha:false可有效解决内存溢出问题
        , o1 = r/480, o2 = r/240, o3 = r/160, o5 = r/96, o6 = r/80, o9 = r/53.3333, o10 = r/48, o12 = r/40, o15 = r/32, o20 = r/24, o21p5 = r/22.3256, o25 = r/19.2, o30 = r/16, o30p5 = r/15.7377, o35 = r/13.7143, o40 = r/12, o45 = r/10.6667, o55 = r/8.7272, o60 = r/8, o105 = r/4.57143, o150 = r/3.2, o480 = r
        , txtMgL = cvSizeX + o10
        , x = 0, y = 0;
        cC.textAlign = "left";

        y = cvSizeY+o3;
        cC.clearRect(0, y, c.width, c.height);
        
        let lrcFS = o55, lrcMgT = o45, lrcMgL = o15, mLrcMgL = lrcMgL
        , lrcTop = cvSizeY+lrcMgT
        , lrcSSS = readCfg.lyricsTaperOff;
        let lrcLine = {0: lrcTop+lrcFS, 1: lrcTop+lrcFS*2+o10, 2: lrcTop+lrcFS*3+o12, 3: lrcTop+lrcFS*4+o10, 4: lrcTop+lrcFS*5+o2}
        function lrcMNow() {cC.fillStyle = color.text, cC.font = `${bold} ${lrcFS}px ${fM}`, lrcMgL = o15}
        function lrcMNowUnplayed() {cC.fillStyle = color.textT42, cC.font = `${bold} ${lrcFS}px ${fM}`, lrcMgL = o15}
        function lrcMNext1() {cC.fillStyle = color.textT56, cC.font = `${bold} ${lrcFS-o10}px ${fM}`, lrcSSS?lrcMgL = o12:""}
        function lrcMNext2() {cC.fillStyle = color.textT56, cC.font = `${bold} ${lrcSSS?lrcFS-o15:lrcFS-o10}px ${fM}`, lrcSSS?lrcMgL = o9:""}
        function lrcMNext3() {cC.fillStyle = color.textT56, cC.font = `${bold} ${lrcSSS?lrcFS-o20:lrcFS-o10}px ${fM}`, lrcSSS?lrcMgL = o6:""}
        function lrcMNext4() {cC.fillStyle = color.textT56, cC.font = `${bold} ${lrcSSS?lrcFS-o25:lrcFS-o10}px ${fM}`, lrcSSS?lrcMgL = o3:""}
        function lrcTNow() {cC.fillStyle = color.textT56, cC.font = `${lrcFS-o5}px ${fT}`, lrcMgL = o15}
        function lrcTNext1() {cC.fillStyle = color.textT31, cC.font = `${lrcFS-o15}px ${fT}`, lrcSSS?lrcMgL = o12:""}
        function lrcTNext2() {cC.fillStyle = color.textT31, cC.font = `${lrcSSS?lrcFS-o20:lrcFS-o15}px ${fT}`, lrcSSS?lrcMgL = o9:""}
        function lrcTNext3() {cC.fillStyle = color.textT31, cC.font = `${lrcSSS?lrcFS-o25:lrcFS-o15}px ${fT}`, lrcSSS?lrcMgL = o6:""}
        function updateMLrcMgL(w, now) {
            if (!readCfg.autoScroll) {return}
            if (!now) {
                now = (playProgress+offset-lyrics.currentT)/lyrics.currentD
                now = lyrics.currentT>playProgress+offset ? 0 : now>1?1:now
            }
            let l = w*now
            if (w>c.width-lrcMgL&&l+o105>c.width-lrcMgL) {
                mLrcMgL = 0-(l+lrcMgL-c.width)+lrcMgL-o105
            }
        }
        
        isDynamicLyrics = false
        if (Array.isArray(lyrics.M[0])) {
            isDynamicLyrics = true
            let lyricDO = ""/*lyricDynamicOrigin*/, l = lyrics.M[0].length, now = 0, nowWidth = 0
            lyricDO = lyrics.M[0].map(item => item.word).join("");
            lrcMNowUnplayed();
            for (let i=0; i<l; i++) {
                let lrc = lyrics.M[0][i], Cnow = (playProgress+offset-lrc.time)/lrc.duration
                Cnow = lrc.time>playProgress+offset ? 0 : Cnow>1?1:Cnow
                nowWidth += cC.measureText(lrc.word).width*Cnow
            }
            let w = cC.measureText(lyricDO).width
            now = nowWidth/w
            updateMLrcMgL(w, now);
            cC.fillText(lyricDO, mLrcMgL, lrcLine[0]); /*主歌词(未播放)*/
            lrcMNow(); cC.save();
            cC.beginPath();
            cC.rect(0, 0, w*now+mLrcMgL, c.height); cC.clip();
            cC.fillText(lyricDO, mLrcMgL, lrcLine[0]); /*主歌词(已播放)*/
            cC.restore();
        } else if (readCfg.lyricsFrom!="OriginalLyricBar") {
            lrcMNow();
            updateMLrcMgL(cC.measureText(lyrics.M[0]).width);
            cC.fillText(lyrics.M[0], mLrcMgL, lrcLine[0]); /*主歌词*/
        } else {
            lrcMNow(); cC.fillText(lyrics.M[0], lrcMgL, lrcLine[0]); /*主歌词*/
        }
    
        if (lyrics.T[0]!="") {
            lrcTNow();
            if (readCfg.lyricsFrom!="OriginalLyricBar") {
                mLrcMgL = lrcMgL
                updateMLrcMgL(cC.measureText(lyrics.T[0]).width);
            }
            cC.fillText(lyrics.T[0], mLrcMgL, lrcLine[1]-o10); /*翻译歌词*/
            lrcMNext1(); cC.fillText(lyrics.M[1], lrcMgL, lrcLine[2]); /*下1句主歌词*/
            if (lyrics.T[1]!="") {
                lrcTNext1(); cC.fillText(lyrics.T[1], lrcMgL, lrcLine[3]-o10); /*下1句翻译歌词*/
                lrcMNext2(); cC.fillText(lyrics.M[2], lrcMgL, lrcLine[4]); /*下2句主歌词*/
            } else {
                lrcMNext2(); cC.fillText(lyrics.M[2], lrcMgL, lrcLine[3]); /*下2句主歌词*/
                if (lyrics.T[2]!="") {
                    lrcTNext2(); cC.fillText(lyrics.T[2], lrcMgL, lrcLine[4]-o10); /*下2句翻译歌词*/
                } else {
                    lrcMNext3(); cC.fillText(lyrics.M[3], lrcMgL, lrcLine[4]); /*下3句主歌词*/
                }
            }
        } else {
            lrcMNext1(); cC.fillText(lyrics.M[1], lrcMgL, lrcLine[1]); /*下1句主歌词*/
            if (lyrics.T[1]!="") {
                lrcTNext1(); cC.fillText(lyrics.T[1], lrcMgL, lrcLine[2]-o10); /*下1句翻译歌词*/
                lrcMNext2(); cC.fillText(lyrics.M[2], lrcMgL, lrcLine[3]); /*下2句主歌词*/
                if (lyrics.T[2]!="") {
                    lrcTNext2(); cC.fillText(lyrics.T[2], lrcMgL, lrcLine[4]-o10); /*下2句翻译歌词*/
                } else {
                    lrcMNext3(); cC.fillText(lyrics.M[3], lrcMgL, lrcLine[4]); /*下3句主歌词*/
                }
            } else {
                lrcMNext2(); cC.fillText(lyrics.M[2], lrcMgL, lrcLine[2]); /*下2句主歌词*/
                if (lyrics.T[2]!="") {
                    lrcTNext2(); cC.fillText(lyrics.T[2], lrcMgL, lrcLine[3]-o10); /*下2句翻译歌词*/
                    lrcMNext3(); cC.fillText(lyrics.M[3], lrcMgL, lrcLine[4]); /*下3句主歌词*/
                } else {
                    lrcMNext3(); cC.fillText(lyrics.M[3], lrcMgL, lrcLine[3]); /*下3句主歌词*/
                    if (lyrics.T[3]!="") {
                        lrcTNext3(); cC.fillText(lyrics.T[3], lrcMgL, lrcLine[4]-o10); /*下3句翻译歌词*/
                    } else {
                        lrcMNext4(); cC.fillText(lyrics.M[4], lrcMgL, lrcLine[4]); /*下4句主歌词*/
                    }
                }
            }
        }

        if (readCfg.lyricsMask) {
            let lrcMask = cC.createLinearGradient(0, lrcTop, 0, c.height*1.3);
            lrcMask.addColorStop(.1, color.bgT00); //不能用#0000或者#FFF0等，会影响渐变的渲染效果
            lrcMask.addColorStop(1, color.bg);
            cC.fillStyle = lrcMask;
            cC.fillRect(0, lrcTop, c.width, c.height); /*歌词阴影遮罩*/
        }
    
        function drawRC() {
            cC.globalCompositeOperation = "destination-out";
            cC.beginPath(); cC.strokeStyle = "#000"; cC.lineWidth = o5; x = cvSizeX+o2; y = cvSizeY+o2;
            /*封面圆角*/
            cC.moveTo(x, 0); cC.arcTo(x, y, 0, y, o12); cC.lineTo(0, y); cC.lineTo(x, y); cC.lineTo(x, 0);
            cC.stroke();
            cC.globalCompositeOperation = "source-over";
        }
        function drawInfo() {
            cC.clearRect(cvSizeX, 0, c.width, cvSizeY+o5); /*清除*/
            cC.fillStyle = color.text; cC.font = `${o55}px ${f}`;
            cC.fillText(snM, txtMgL, o60); /*主名*/
            cC.fillStyle = color.textT31; cC.font = `${o35}px ${f}`;
            cC.fillText(snA==null?"":snA, txtMgL, o105); /*副名*/
            cC.fillStyle = color.textT56;
            cC.fillText(sa, txtMgL, snA==null?o105:o150); /*歌手*/
        }
        if (nrInfo) {
            cC.fillStyle = color.text; cC.font = `${o25}px ${f}`; cC.fillText(ldTxt, o5, o30); /*封面(加载)*/
            cover.onload = ()=>{/*封面(完毕)*/
                if (readCfg.allowNonsquareCover) {cvSizeX = cover.width*(cvSizeY/cover.height); txtMgL=cvSizeX+o10}
                cC.clearRect(0, 0, cvSizeX, cvSizeY+o5);
                cC.drawImage(cover, 0, 0, cvSizeX, cvSizeY);
                drawInfo();drawRC();
                if(showRefrshing){console.log(`PiPW Log: 歌曲封面绘制完成`)}
                /*背景图*/
                if (readCfg.backgroundFrom == "albumCoverBlur") {
                    bgcC.fillStyle = color.bg;
                    bgcC.fillRect(0, 0, bgc.width, bgc.height);
                    bgcC.filter = `blur(${o60}px)`;
                    bgcC.drawImage(cover, 0, 0, bgc.width, bgc.height);
                    bgcC.filter = "none";
                    bgcC.fillStyle = color.bgT50;
                    bgcC.fillRect(0, 0, bgc.width, bgc.height);
                }
            }
            cover.onerror = ()=>{/*封面(失败)*/
                cover.src = OcvUrl
            }
        }
    
        cC.font = `${o30}px ${f}`;
        cC.fillStyle = color.textT56;
        let tW = cC.measureText(t).width
        cC.fillText(t, o15, cvSizeY+o35); /*时间*/
    
        let pbMgT = cvSizeY+o21p5, pbMgL = tW+o30p5
        cC.fillStyle = color.textT13;
        cC.fillRect(pbMgL, pbMgT, c.width-pbMgL, o5); /*进度条背景*/
        cC.fillStyle = color.accent;
        cC.fillRect(pbMgL, pbMgT, (c.width-pbMgL)*tP, o5); /*进度条*/

        /*背景*/
        if (readCfg.backgroundFrom == "AMLL"&&loadedPlugins["Apple-Musiclike-lyrics"]) {
            let amllbgc = q(".amll-background-render-wrapper canvas")
            if (amllbgc) {
                if (!amllbgv) {
                    amllbgv = cE("video")
                    amllbgv.srcObject = amllbgc.captureStream()
                    amllbgv.controls = true; //调试用
                    amllbgv.play()
                }
                bgcC.drawImage(amllbgv, 0, 0, bgc.width, bgc.height);
            } else {
                let amllbgE = q("#amll-view > :first-child:not(.lyric-player-horizonal)"), amllbg
                amllbgE?"":amllbgE=q("#amll-view")
                amllbgE?
                amllbg = getComputedStyle(amllbgE).getPropertyValue("background-color")
                :amllbg = color.bg;
                bgcC.fillStyle = amllbg;
                bgcC.fillRect(0, 0, bgc.width, bgc.height);
            }
            drawInfo();drawRC();
        } else {try{amllbgv.pause()}catch{}}
        if (readCfg.backgroundFrom == "themeBackgroundColor") {
            bgcC.filter = "none";
            bgcC.fillStyle = color.bg;
            bgcC.fillRect(0, 0, bgc.width, bgc.height);
        }
        cC.globalCompositeOperation = "destination-over";
        y = cvSizeY+o3;
        cC.drawImage(bgc, 0, 0, c.width, c.height);
        cC.globalCompositeOperation = "source-over";
    
        let timeUsing = Date.now() - startTime;
        if(showRefrshing){console.log(`PiPW Log: <canvas>重绘完成，重绘用时${timeUsing==0?"<1":timeUsing}ms，当前分辨率${c.width}x${c.height}, 请求来自${from}`)}
    } catch (e) {
        console.error("PiPW Error: <canvas>绘制出错，详情：\n", e);tipMsg("&lt;canvas&gt;绘制出错，详见JavaScript控制台", "err")
    }
}

plugin.onAllPluginsLoaded(()=>{load()});
function load() {B();C();D();E();F()
    legacyNativeCmder.appendRegisterCall("PlayProgress", "audioplayer", (_, p) => {
        playProgress = p*1000; let pZ = Math.floor(p), needLoadPiP = false;
        if (pZ>tC||p<tC||readCfg.smoothProgessBar) {tC = p; needLoadPiP = true}
        if (isDynamicLyrics || readCfg.autoScroll || (readCfg.backgroundFrom=="AMLL" && loadedPlugins["Apple-Musiclike-lyrics"])) {needLoadPiP = true}
        if (needLoadPiP) {loadPiP(false, "PlayProgress")}
    });
    async function B() { //监听自带词栏变动
        await betterncm.utils.waitForElement(".m-lyric");
        new MutationObserver(() => {
            loadPiP(false, "NCM-LyricBar");
        }).observe(q(".m-lyric"), {
            characterData: true,
            childList: true,
            subtree: true,
        });
    }
    async function C() { //监听LB插件词栏变动
        await betterncm.utils.waitForElement(".lyric-bar");
        new MutationObserver(() => {
            loadPiP(false, "Plugin-LyricBar");
        }).observe(q(".lyric-bar"), {
            attributeFilter: ["offset"],
            characterData: true,
            childList: true,
            subtree: true,
        });
    }
    async function D() { //监听颜色变动
        await betterncm.utils.waitForElement(`[data-plugin-slug="PiPWindow"]`);
        q(`[data-plugin-slug="PiPWindow"]`).addEventListener("click", ()=>{
            readCfg.colorFrom=="albumCover"? colorPick(cover?cover:null) : colorPick()
        })
    }
    async function E() { //监听颜色变动
        let A = qAll("html, body");
        for(i = 0; i < A.length; i++){
            new MutationObserver(() => {
                setTimeout(()=>{readCfg.colorFrom=="albumCover"? colorPick(cover?cover:null) : colorPick()}, 100)
            }).observe(A[i], {
                attributeFilter: ["style", "class"],
                characterData: false,
            });
        };
    }
    async function F() { //向歌曲信息旁添加PiP开关
        await betterncm.utils.waitForElement(".m-pinfo h3");
        let b = cE("div");
        b.id = "PiPW-Toggle"; b.title = "打开小窗"; b.classList.add("icn", "f-cp");
        b.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 24px; height: 24px; transform: scale(.75);">${pO}</svg>`;
        b.addEventListener("click", ()=>{pipToggle()})
        q(".m-pinfo h3").appendChild(b);
        new MutationObserver(() => { //歌曲信息变动会清掉开关，加回去
            if (q(".m-pinfo h3") && !q(".m-pinfo h3 [id*=PiP]")) {
                q(".m-pinfo h3").appendChild(b);
            }
        }).observe(q(".m-pinfo"), {
            characterData: true,
            childList: true,
            subtree: true,
        });
    }
}

async function writeCfg(Cfg) { //写配置
    localStorage.setItem("PiPWindowSettings", JSON.stringify(Cfg));
    readCfg = JSON.parse(localStorage.getItem("PiPWindowSettings")); //刷新变量内存储的设置
};

async function saveCfg(all="all") { //保存设置
    oldCfg = {...readCfg}
    let a = Array.from(arguments);
    if (a[0] == "all") {a = Object.keys(cfgDefault)}
    for (let i = 0; i < a.length; i++) {
        if (a[i] in cfgDefault) {
            let key
            switch (typeof cfgDefault[`${a[i]}`]) {
                case "number":
                    let n = q(`#${a[i]}SetBox`)
                    if (n) {
                        let set = n.value*1;
                        if (set == "undefined" || set == "null" || set == "") {set = n.placeholder*1; n.value = set}
                        key = set;
                    }
                    break;
                case "string":
                    let str = q(`#${a[i]}SetBox`), radios = qAll(`[name=${a[i]}]`)
                    if (str) { //这里if...else if...两边不!能!调换位置，下同
                        let set = str.value;
                        if (set == "undefined" || set == "null" || set == "") {set = str.placeholder; str.value = set}
                        key = set;
                    } else if (radios) {
                        for (let i = 0; i < radios.length; i++) {
                            if (radios[i].checked) {
                                key = radios[i].value;
                            }
                        }
                    }
                    break;
                case "boolean":
                    let swc = q(`#${a[i]}Switch`), ckBox = q(`#${a[i]}CheckBox`)
                    if (swc) {key = swc.checked} else if (ckBox) {key = ckBox.checked}
                    break;
                default:
                    console.error(`PiPW Error: !! 不支持此设置项的类型: ${a[i]}`)
            }
            readCfg[`${a[i]}`] = key
        } else {
            console.error(`PiPW Error: 无效的设置项: ${a[i]}`)
        }
    }
    writeCfg(readCfg); loadPiP(false, "Settings"); tipMsg("设置已更新");console.log("PiPW Log: 设置已保存", oldCfg, readCfg)
};

async function resetCfg() { //重置设置
    oldCfg = {...readCfg}
    readCfg = {...cfgDefault}
    a = Object.keys(cfgDefault)
    for (let i = 0; i < a.length; i++) {
        if (a[i] in cfgDefault) {
            let key = cfgDefault[`${a[i]}`]
            switch (typeof key) {
                case "string":
                    let str = q(`#${a[i]}SetBox`), radios = qAll(`[name=${a[i]}]`)
                    if (str) {
                        str.value = key;
                    } else if (radios) {
                        for (let i = 0; i < radios.length; i++) {
                            if (radios[i].value == key) {
                                radios[i].checked = true
                            }
                        }
                    }
                    break;
                case "number":
                    q(`#${a[i]}SetBox`).value = key
                    break;
                case "boolean":
                    let swc = q(`#${a[i]}Switch`), ckBox = q(`#${a[i]}CheckBox`)
                    if (swc) {swc.checked = key} else if (ckBox) {ckBox.checked = key}
                    break;
                default:
                    console.error(`PiPW Error: !! 不支持此设置项的类型: ${a[i]}`)
            }
        } else {
            console.error(`PiPW Error: 无效的设置项: ${a[i]}`)
        }
    }
    writeCfg(readCfg); tipMsg("设置已重置");console.log("PiPW Log: 设置已重置并保存", oldCfg, readCfg)
    setTimeout(()=>{loadPiP(false, "Settings");}, 100)
}

plugin.onConfig(()=>{
    return getSettingsPage();
})

function getSettingsPage() {
    colorPick()
    let cP = cE("div", document);
    cP.setAttribute("id", "PiPWSettings");
    cP.innerHTML = `
<style id="PiPWSettingsStyle0">
    #PiPWSettings {
        --pipws-fg: ${colorS.accent};
        --pipws-bg: ${colorS.bgT};
        --pipws-bg-wot: ${colorS.bg};
        color: ${colorS.text};
    }
</style>
<style>
    #PiPWSettings {
        padding-top: 10px;
        line-height: 24px;
        font-size: 16px;
    }
    #PiPWSettings .noAutoBr p {
        display: inline;
    }
    #PiPWSettings .switch, #PiPWSettings .switch + p, #PiPWSettings .radio, #PiPWSettings .radio + p {
        line-height: 34px;
    }
    #PiPWSettings ::selection {
        color: var(--pipws-bg-wot);
        background: var(--pipws-fg);
    }
    #PiPWSettings :disabled, #PiPWSettings :disabled + .slider {
        cursor: not-allowed;
    }
    #PiPWSettings :disabled::selection {
        color: #000000;
        background: #888;
    }

    #PiPWSettings .part {
        width: 550px;
        margin: 20px 0 0;
        padding: 10px 20px;
        border: 1px solid #0000;
        border-radius: 12px;
        box-shadow: 0 0 25px -5px #0003;
        background: var(--pipws-bg) padding-box;
        backdrop-filter: blur(24px);
        transition: .5s;
    }
    #PiPWSettings .parting {
        height: 1px;
        margin: 10px 0;
        border: solid var(--pipws-fg);
        border-width: 1px 0 0 0;
        box-shadow: 0 0 3px var(--pipws-fg);
    }
    #PiPWSettings .partTitle {
        font-size: 23px;
        font-weight: bold;
        line-height: 30px;
    }
    #PiPWSettings .subPart {
        margin: 5px;
    }
    #PiPWSettings .subTitle {
        font-size: 20px;
        font-weight: bold;
        line-height: 34px;
        box-shadow: inset 0 -6px 5px -5px var(--pipws-fg);
    }
    #PiPWSettings .item {
        display: inline-block;
        margin-right: 5px;
    }

    #PiPWSettings .button {
        color: var(--md-accent-color-secondary, var(--ncm-text)) !important;
        font-size: 16px;
        width: 90px;
        height: 40px;
        line-height: 0;
        outline: 0;
        box-shadow: 0 0 3px var(--pipws-fg);
        border: 1px solid var(--pipws-fg);
        border-radius: 10px;
        background: var(--pipws-bg);
        backdrop-filter: blur(12px);
        transition: .1s;
    }
    #PiPWSettings .button:hover {
        box-shadow: 0 0 6px var(--pipws-fg);
    }
    #PiPWSettings .button:active {
        font-size: 14px;
        border-width: 4px;
        box-shadow: 0 0 8px var(--pipws-fg);
    }
    #PiPWSettings .part .button {
        backdrop-filter: none;
    }

    #PiPWSettings .button + p {
        line-height: 41px;
    }

    #PiPWSettings .textBox {
        padding: 10px;
        padding-right: 5px;
    }
    #PiPWSettings .textBox:focus {
        font-size: 15px;
        border-width: 3px;
        box-shadow: 0 0 8px var(--pipws-fg);
    }
    #PiPWSettings [type=number] {
        width: 90px;
    }
    #PiPWSettings [type=search] {
        width: 320px;
    }
    #PiPWSettings textarea.textBox {
        width: 320px;
        height: 160px;
        line-height: inherit;
    }

    #PiPWSettings .switch {
        position: relative;
        margin: 0 50px 0 0;
        display: inline-block;
    }
    #PiPWSettings .radio {
        position: relative;
        margin: 0 25px 0 0;
        display: inline-block;
    }
    #PiPWSettings .switch input, #PiPWSettings .radio input{ 
        opacity: 0;
        width: 0;
        height: 0;
    }

    #PiPWSettings .slider {
        position: absolute;
        width: 50px;
        height: 25px;
        margin: 5px 0;
        border-radius: 8px;
        transition: .2s, box-shadow .1s;
    }
    #PiPWSettings .slider:active {
        border-width: 3px;
        transition: .1s;
    }

    #PiPWSettings .radio .slider {
        width: 25px;
    }
    #PiPWSettings .radio .slider:active {
        border-width: 4px;
        transition: .1s;
    }

    #PiPWSettings input:checked + .slider {
        border: 1px solid var(--pipws-bg);
        background: var(--pipws-fg);
    }
    #PiPWSettings input:checked + .slider:active {
        border-width: 3px;
    }

    #PiPWSettings .radio input:checked + .slider {
        border-color: var(--pipws-fg);
        background: var(--pipws-bg);
    }

    #PiPWSettings input:disabled + .slider {
        border: 1px solid #888;
        box-shadow: 0 0 3px #888;
    }
    #PiPWSettings input:disabled + .slider:hover {
        box-shadow: 0 0 6px #888; 
    }
    #PiPWSettings input:disabled + .slider:active {
        border-width: 1px;
        box-shadow: 0 0 6px #888;
    }
    #PiPWSettings input:disabled:checked + .slider {
        border: 1px solid #909090;
        background: #888;
    }
    #PiPWSettings .radio input:disabled:checked + .slider {
        border-color: #888;
        background: var(--pipws-bg);
    }

    #PiPWSettings .slider::before {
        position: absolute;
        content: "";
        height: 15px;
        width: 15px;
        left: 4px;
        bottom: 4px;
        border-radius: 4px;
        background: var(--pipws-fg);
        transition: .2s;
    }
    #PiPWSettings .slider:active::before {
        height: 11px;
        width: 11px;
        border-radius: 3px;
        transition: .1s;
    }

    #PiPWSettings .radio .slider::before {
        opacity: 0;
        height: 3px;
        width: 3px;
        left: 10px;
        bottom: 10px;
    }
    #PiPWSettings .radio .slider:active::before {
        opacity: 0;
        height: 27px;
        width: 27px;
        left: -5px;
        bottom: -5px;
        border-radius: 5px;
        transition: .2s;
    }

    #PiPWSettings input:checked + .slider::before {
        background: var(--pipws-bg-wot);
        transform: translateX(25px);
    }

    #PiPWSettings .radio input:checked + .slider::before {
        opacity: 1;
        height: 15px;
        width: 15px;
        left: 4px;
        bottom: 4px;
        background: var(--pipws-fg);
        transform: translateX(0px);
    }
    #PiPWSettings .radio input:checked + .slider:active::before {
        height: 11px;
        width: 11px;
        left: 4px;
        bottom: 4px;
    }

    #PiPWSettings input:disabled + .slider::before {
        background: #888;
    }
    #PiPWSettings input:disabled + .slider:active::before {
        height: 15px;
        width: 15px;
        border-radius: 4px;
    }

    #PiPWSettings input:disabled:checked + .slider::before {
        background: var(--pipws-bg-wot);
    }

    #PiPWSettings .radio input:disabled:checked + .slider::before {
        background: #888;
    }
    #PiPWSettings .radio input:disabled:checked + .slider:active::before {
        height: 15px;
        width: 15px;
    }

    #PiPWSettings .link {
        text-decoration: underline;
        cursor: pointer;
        color: var(--pipws-fg) !important;
        background: rgba(0, 0, 0, 0);
        border: 0 solid;
    }

    #PIPWDEBUGMODE {
        opacity: 0;
        transition: opacity .2s;
    }
    #PIPWDEBUGMODE:hover {
        opacity: 1;
    }
</style>
<div class="part noAutoBr" style="margin-top: 0;">
    <p class="partTitle">PiPWindow </p><p> ${loadedPlugins.PiPWindow.manifest.version?loadedPlugins.PiPWindow.manifest.version:"未知版本"}</p>
    <br />
    <p>by </p>
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning')" value=" Lukoning " />
    <p> 2024</p>
    <div style="text-align: right; position: absolute; bottom: 10px; right: 20px;">
        <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/PiPWindow')" value=" 源代码仓库(GitHub) " />
        <br />
        <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/PiPWindow/issues')" value=" 问题反馈/功能建议(GitHub Issues) " />
    </div>
</div>
<div class="part">
    <p class="partTitle">说明</p>
    <p>点击歌曲红心❤️旁按钮或<input id="PiPW-ToggleLink" class="link" type="button" value="这里" />打开/关闭◲小窗</p>
    <p>可拖动↔↕可调整大小</p>
    <p>🐀鼠标移上◲小窗显示控制按钮</p>
    <p>也可以敲击 空格来控制▶️播放⏸️暂停</p>
    <p>↗返回和x关闭的效果可在下方自定义</p>
</div>
<div class="part noAutoBr">
    <p class="partTitle">自定义设置</p>
    <p>注: 启用带*的选项可能会出现卡顿</p>
    <input id="resetButton-All" class="link" type="button" value="恢复默认" />
    <br />
    <div class="subPart">
        <p class="subTitle">行为</p>
        <br />
        <p>关闭按钮</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenClose" value="none" />
                <span class="slider button"></span>
            </label>
            <p>仅关闭小窗</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenClose" value="pause" />
                <span class="slider button"></span>
            </label>
            <p>关闭并暂停</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenClose" value="shutdown" />
                <span class="slider button"></span>
            </label>
            <p>关闭并退出云音乐</p>
        </div>
        <br />
        <p>返回按钮</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenBack" value="close" />
                <span class="slider button"></span>
            </label>
            <p>仅关闭小窗</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenBack" value="back" />
                <span class="slider button"></span>
            </label>
            <p>关闭并返回主窗口</p>
        </div>
        <br />
        <p>暂停时 关闭/返回按钮</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenCloseOrBack_paused" value="close" />
                <span class="slider button"></span>
            </label>
            <p>仅关闭小窗</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="whenCloseOrBack_paused" value="back" />
                <span class="slider button"></span>
            </label>
            <p>关闭并返回主窗口</p>
        </div>
        <br />
        <label class="switch">
            <input id="autoHideMainWindowSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>打开小窗时隐藏主窗口 (类似mini模式)</p>
    </div>
    <div class="subPart">
        <p class="subTitle">信息</p>
        <br />
        <label class="switch">
            <input id="allowNonsquareCoverSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>尝试适配非正方形封面 (加载时间更长)</p>
        <br />
        <label class="switch">
            <input id="showAlbumSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>第二行显示专辑名 (而非翻译/别名)</p>
        <br />
        <p>时间信息</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="timeInfo" value="CurrentTotal" />
                <span class="slider button"></span>
            </label>
            <p>已播时长/总时长</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="timeInfo" value="CurrentRemaining" />
                <span class="slider button"></span>
            </label>
            <p>已播时长/剩余时长</p>
        </div>
    </div>
    <div class="subPart">
        <p class="subTitle">歌词</p>
        <br />
        <label class="switch">
            <input id="dynamicLyricsSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>逐字歌词*</p>
        <br />
        <label class="switch">
            <input id="autoScrollSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>单行歌词超出滚动*</p>
        <br />
        <label class="switch">
            <input id="originalLyricsBoldSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>原文加粗</p>
        <br />
        <label class="switch">
            <input id="showTranslationSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>显示翻译</p>
        <br />
        <label class="switch">
            <input id="lyricsTaperOffSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>歌词渐小</p>
        <br />
        <label class="switch">
            <input id="lyricsMaskSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>歌词渐隐</p>
        <br />
        <div style="font-size:12px;color:#F33;${loadedPlugins.LibOpenCC?"display:none":""}">v 缺失依赖: LibOpenCC 请前往插件市场下载</div>
        <label class="switch">
            <input id="lyricsHanzi2KanjiSwitch" type="checkbox" ${loadedPlugins.LibOpenCC?"":"disabled"}/>
            <span class="slider button"></span>
        </label>
        <p>日文歌歌词汉字纠错 (切歌生效)</p>
        <br />
        <p>偏移 (正提前，负延后)</p>
        <br />
        <input class="button textBox" id="lyricsOffsetSetBox" type="number" step="0.1" placeholder='${cfgDefault.lyricsOffset}'
            value="${readCfg.lyricsOffset}" />
        <p>s</p>
        <br />
        <p>歌词源</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricsFrom" value="LibLyric" ${loadedPlugins.liblyric?"":"disabled"}/>
                <span class="slider button"></span>
            </label>
            <p>LibLyric依赖库</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricsFrom" value="OriginalLyricBar" />
                <span class="slider button"></span>
            </label>
            <p>云音乐的软件内词栏</p>
        </div>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricsFrom" value="RNP" ${loadedPlugins.RefinedNowPlaying?"":"disabled"}/>
                <span class="slider button"></span>
            </label>
            <p>RefinedNowPlaying插件</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricsFrom" value="Custom" />
                <span class="slider button"></span>
            </label>
            <p>自定义歌词源 (暂时仅支持单个URL及yrc格式)</p>
            <br />
            <textarea class="button textBox" id="lyricsCustomSourcesSetBox" placeholder='${cfgDefault.lyricsCustomSources}'>${readCfg.lyricsCustomSources.replaceAll("\"", "&quot;" )}</textarea>
            <br />
            <input class="button" style="position: absolute; transform: translate(325px, -46px);" id="applyButton-lyricsCustomSources" type="button" value="应用" />
        </div>
        <br />
        <label class="switch">
            <input id="showLyricsErrorTipSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>显示歌词源错误提示</p>
    </div>
        <div class="subPart">
        <p class="subTitle">外观</p>
        <br />
        <p>颜色来源</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="colorFrom" value="mainWindow" />
                <span class="slider button"></span>
            </label>
            <p>主窗口</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="colorFrom" value="albumCover" />
                <span class="slider button"></span>
            </label>
            <p>专辑封面</p>
        </div>
        <br />
        <p>背景来源</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="backgroundFrom" value="themeBackgroundColor" />
                <span class="slider button"></span>
            </label>
            <p>主题背景色</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="backgroundFrom" value="albumCoverBlur" />
                <span class="slider button"></span>
            </label>
            <p>专辑封面模糊</p>
        </div>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="backgroundFrom" value="AMLL" ${loadedPlugins["Apple-Musiclike-lyrics"]?"":"disabled"}/>
                <span class="slider button"></span>
            </label>
            <p>(测试版) 类苹果歌词插件背景*</p>
        </div>
        <br />
        <p>全局字体</p>
        <br />
        <input class="button textBox" id="customFontsSetBox" type="search" placeholder='${cfgDefault.customFonts}'
            value="${readCfg.customFonts.replaceAll("\"", "&quot;" )}" />
        <br />
        <input class="button" style="position: absolute; transform: translate(325px, -40px);" id="applyButton-customFonts" type="button" value="应用" />
        <label class="switch">
            <input id="useJapaneseFontsSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>日文歌歌词使用日文字体</p>
        <br />
        <p>日文字体</p>
        <br />
        <input class="button textBox" id="customJapaneseFontsSetBox" type="search" placeholder='${cfgDefault.customJapaneseFonts}'
            value="${readCfg.customJapaneseFonts.replaceAll("\"", "&quot;" )}" />
        <br />
        <input class="button" style="position: absolute; transform: translate(325px, -40px);" id="applyButton-customJapaneseFonts" type="button" value="应用" />
    </div>
    <div class="subPart">
        <p class="subTitle">渲染 (高级)</p>
        <br />
        <label class="switch">
            <input id="smoothProgessBarSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>顺滑的进度条*</p>
        <br />
        <p>窗口宽高比</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="aspectRatio" value="16:9" />
                <span class="slider button"></span>
            </label>
            <p>16:9</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="aspectRatio" value="2:1" />
                <span class="slider button"></span>
            </label>
            <p>2:1</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="aspectRatio" value="21:9" />
                <span class="slider button"></span>
            </label>
            <p>21:9</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="aspectRatio" value="24:9" />
                <span class="slider button"></span>
            </label>
            <p>24:9</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="aspectRatio" value="3:1" />
                <span class="slider button"></span>
            </label>
            <p>3:1</p>
        </div>
        <br />
        <p>渲染分辨率 (越小性能越好)</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="auto" />
                <span class="slider button"></span>
            </label>
            <p>自适应</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="1080" />
                <span class="slider button"></span>
            </label>
            <p>1080p</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="960" />
                <span class="slider button"></span>
            </label>
            <p>960p</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="720" />
                <span class="slider button"></span>
            </label>
            <p>720p</p>
        </div>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="560" />
                <span class="slider button"></span>
            </label>
            <p>560p</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="480" />
                <span class="slider button"></span>
            </label>
            <p>480p</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="320" />
                <span class="slider button"></span>
            </label>
            <p>320p</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="240" />
                <span class="slider button"></span>
            </label>
            <p>240p</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="resolutionRatio" value="160" />
                <span class="slider button"></span>
            </label>
            <p>160p</p>
        </div>
    </div>
    <div class="subPart">
        <p class="subTitle">杂项</p>
        <br />
        <p>加载时显示的文本</p>
        <br />
        <input class="button textBox" id="customLoadingTxtSetBox" type="search" placeholder='${cfgDefault.customLoadingTxt}'
            value="${readCfg.customLoadingTxt.replaceAll("\"", "&quot;" )}" />
        <br />
        <input class="button" style="position: absolute; transform: translate(325px, -40px);" id="applyButton-customLoadingTxt" type="button" value="应用" />
    </div>
</div>
<div class="part noAutoBr">
    <p class="partTitle">关于BUG…</p>
    <br /><p>实在没有办法在暂停时区分关闭和返回按钮……因此做了一个折中方案</p>
    <br /><p>控制按钮在暂停时并不会显示，但是仍然可以空格播放和暂停（到底为什么会自动消失啊??）</p>
    <br /><p>某些情况下选择自适应分辨率，小窗可能会出现色差</p>
    <br /><p>某些情况下小窗右侧可能会渲染出一个绿条</p>
    <br /><p>播放过MV后有概率无法通过小窗开始播放</p>
    <br />
    <br /><p>以及你有没有发现拖动右边缘/下边缘调整大小后，下次打开小窗时并没有记住上次调整的大小……</p>
    <br /><p>可能有点抽象，但这会导致：选择自适应分辨率后，没法成功通过右/下边缘调整大小</p>
    <br /><p>原因未知。</p>
    <br />
    <br /><p>有反馈说有窗口比例错误（出现黑边）及调整大小时"瞬移"到其他位置的情况出现</p>
    <br /><p>这些情况至少在作者日常使用时没有出现，不知道原因，所以也无法修复</p>
</div>
<div class="part noAutoBr">
    <p class="partTitle">开放源代码许可</p>
    <br />
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Remix-Design/remixicon')" value=" Remix Icon " />
    <p> licensed under the </p>
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://www.apache.org/licenses/LICENSE-2.0.txt')" value=" Apache License Version 2.0 " />
    <p> | 使用了其中picture-in-picture-2-line和picture-in-picture-fill两个图标，并对其代码进行了拆分以节省空间。</p>
    <br />
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/MuttonString/Furigana')" value=" Furigana " />
    <p> without any licenses </p>
    <p> | 修改并使用了其中的(很简单的)日文歌识别算法。</p>
    <br />
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/BetterNCM/FluentProgessBar')" value=" FluentProgessBar " />
    <p> licensed under the </p>
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://www.gnu.org/licenses/gpl-3.0.txt')" value=" GNU/GPL-3.0 " />
    <p> | 修改并使用了其中关于获取歌曲播放状态及进度的方法。</p>
</div>
<br /><br />
<div id="PIPWDEBUGMODE" class="noAutoBr">
    <label class="switch">
        <input id="debugModeSwitch" type="checkbox" />
        <span class="slider button"></span>
    </label>
    <p>BUG多多怎么办？调试模式且力你一臂之力！（重载复位）</p>
    <br />
    <p style="user-select: text">也可在控制台使用 PiPWShowRefrshing() 来手动开关&lt;canvas&gt;重绘情况跟踪</p>
</div>
<br /><br />
    `;
    let cfgDfKeys = Object.keys(cfgDefault)
    for (let i = 0; i < cfgDfKeys.length; i++) {
        let keyName = cfgDfKeys[i], key = readCfg[keyName]
        if (key == undefined || key == null) {key = cfgDefault[keyName]}
        switch (typeof key) {
            case "number":
                let n = q(`#${keyName}SetBox`, cP)
                if (n) {n.addEventListener("change", ()=>{saveCfg(keyName)});}
                break;
            case "string":
                let str = q(`#${keyName}SetBox`, cP), radios = qAll(`[name=${keyName}]`, cP)
                if (radios.length!=0) {
                    for (let i = 0; i < radios.length; i++) {
                        if (radios[i].value ==  key) {radios[i].checked = true}
                        radios[i].addEventListener("change", ()=>{saveCfg(keyName)})
                    }
                } else if (str) {
                    if (str.tagName != "TEXTAREA") {str.addEventListener("keydown", e=>{if(e.key=="Enter"){saveCfg(keyName)}});} //回车应用
                    try{q(`#applyButton-${keyName}`, cP).addEventListener("click", ()=>{saveCfg(keyName)});}catch{}
                }
                break;
            case "boolean":
                try {
                    let f, swc = q(`#${keyName}Switch`, cP), ckBox = q(`#${keyName}CheckBox`, cP)
                    if (swc) {f = swc} else if (ckBox) {f = swc}
                    f.checked = key;
                    f.addEventListener("change", ()=>{saveCfg(keyName)});
                } catch (e) {
                    console.error(`PiPW Error: ${e}`)
                }
                break;
            default:
                console.error(`PiPW Error: 未知错误。设置界面可能异常。`)
                tipMsg("PiPWindow设置界面可能异常", "err");
        }
    }
    q("#PiPW-ToggleLink", cP).addEventListener("click", ()=>{pipToggle()});
    q(`#resetButton-All`, cP).addEventListener("click", ()=>{resetCfg()});
    q(`[name="resolutionRatio"][value="auto"]`, cP).addEventListener("click", ()=>{autoRatio=true;reRatio(thePiPWindow.height)});
    q("#debugModeSwitch", cP).addEventListener("change", ()=>{debugMode=q("#debugModeSwitch").checked;if(debugMode){DEBUG();window.PiPWShowRefrshing()}});
    console.log(cP);
    return cP;
};