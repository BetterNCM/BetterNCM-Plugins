/*This plugin is licensed under the GNU/GPL-3.0*/
let rvN, v, c, cover, cvUrlCache, songIdCache, songDataCache, tMsT, lrcCache, pLrc, pLrcKeys, showRefrshing, thePiPWindow
, isVLsnAdded=false, DontPlay=false, DontPause=false, autoRatio, autoRatioValue=480, lastReRatio=0, playProgress=0, nrLrc=false, lrcNowLoading=false, reRatioPending=false, isDynamicLyrics=false, debugMode=false, lrcRnpLsnAdded=false
, t = "0:00／0:00", tC = 0, tT = 0, tP = 0, tR = 0 //显示用，Current，Total，PassedRate，Remaining
, pdd = "M21 3C21.5523 3 22 3.44772 22 4V11H20V5H4V19H10V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM21 13C21.5523 13 22 13.4477 22 14V20C22 20.5523 21.5523 21 21 21H13C12.4477 21 12 20.5523 12 20V14C12 13.4477 12.4477 13 13 13H21Z"
, pO = `<path d="${pdd}M20 15H14V19H20V15ZM6.70711 6.29289L8.95689 8.54289L11 6.5V12H5.5L7.54289 9.95689L5.29289 7.70711L6.70711 6.29289Z"></path>`
, pC = `<path d="${pdd}"></path>`
, readCfg = JSON.parse(localStorage.getItem("PiPWindowSettings"))
, cfgDefault = ({
    whenClose: "none", whenBack: "back", whenCloseOrBack_paused: "close", autoHideMainWindow: false
    , showAlbum: true, timeInfo: "CurrentTotal"
    , dynamicLyrics: true, autoScroll: true, originalLyricsBold: false, showTranslation: true, /*showLatinization: false,*/ lyricsTaperOff: true, lyricsMask: true, lyricsFrom: "LibLyric", showLyricsErrorTip: true
    , customFonts: "\"Segoe UI\", \"Microsoft Yahei UI\", system-ui", useJapaneseFonts: true, customJapaneseFonts: "\"Yu Gothic UI\", \"Meiryo UI\", \"Microsoft Yahei UI\", system-ui"
    , smoothProgessBar: true, resolutionRatio: "auto", aspectRatio: "2:1", customLoadingTxt: "正在载入猫猫…"})
, color = ({accent: "", text: "", textT13: "", textT31: "", textT42: "", textT56: "", bg: "", bgT00: "", bgTSetting: ""}), colorCache = ({text: "", bg: ""})
readCfg = {...cfgDefault, ...readCfg} //缺失配置啥的处理一下
let oldCfg = {...readCfg}
window.PiPWShowRefrshing = (x=true)=>{if(x==true){showRefrshing=true;return true}else if(x==false){showRefrshing=false;return false}}
function cE(n, d=document) {return d.createElement(n)}
function q(n, d=document) {return d.querySelector(n)}
function qAll(n, d=document) {return d.querySelectorAll(n)}

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
                v.requestPictureInPicture().then((p)=>{thePiPWindow=p;reRatio(p.height);p.addEventListener("resize", (e)=>{reRatio(e.target.height)})})
                let pS = ".m-player:not(.f-dn)"
                //控制按钮设置
                navigator.mediaSession.setActionHandler("play", ()=>{v.play()});
                navigator.mediaSession.setActionHandler("pause", ()=>{v.pause()});
                navigator.mediaSession.setActionHandler("previoustrack", ()=>{q(`${pS} .btnc-prv`).click()});
                navigator.mediaSession.setActionHandler("nexttrack", ()=>{q(`${pS} .btnc-nxt`).click()});
                if (isVLsnAdded) {return} //防止重复加监听器
                //小窗暂停/播放同步到主窗口
                function ncmPlay() {if (!DontPlay) {try{ q(`${pS} .btnp-play`).click() }catch{}}DontPause=false}
                function ncmPause() {if (!DontPause) {try{ q(`${pS} .btnp-pause`).click() }catch{}}DontPlay=false}
                v.addEventListener("play", ()=>{ncmPlay()})
                v.addEventListener("pause", ()=>{ncmPause()})
                //小窗打开/关闭逻辑
                v.addEventListener("enterpictureinpicture", (e)=>{ console.log("PiPW Log: PiP窗口已创建", v)
                    let s = betterncm.ncm.getPlayingSong()
                    if (!s) {s=({state:1})}
                    if (readCfg.autoHideMainWindow) {mwf.cef.R$call("winhelper.showWindow", "hide")}
                    tipMsg("已打开小窗"); q("#PiPW-Toggle svg").innerHTML=pC; q("#PiPW-Toggle").setAttribute("style", "fill: currentColor; opacity: 1"); q("#PiPW-Toggle").title = "关闭小窗";
                    if (s.state==1) {v.pause()} DontPlay=false
                    if(debugMode){console.log(e)}
                });
                v.addEventListener("leavepictureinpicture", (e)=>{ DontPause=true; let p = v.paused
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
                        DontPause=true; v.pause()
                    } else if (state === 1) {
                        DontPlay=true; v.play()
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
    if(debugMode){try{q("#PiPWSettings").appendChild(v)}catch{}}
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

function colorPick() { //取色
    let textTO, bgTO;
    function s(e, p) {
        return getComputedStyle(q(e)).getPropertyValue(p);
    }
    color.accent = s("body", "--themeC1"), color.text = s("body", "color");
    if (q("body.material-you-theme")) {color.text = s("body", "--md-accent-color-secondary")}
    if (/rgba/.test(color.text)) {textTO = color.text.replace(/,([^,)]*)\)/, "")}
    else {textTO = color.text.replace(/rgb\(/, "rgba(").replace(/\)/, "")}
    color.text = `${textTO})`, color.textT56 = `${textTO}, .56)`, color.textT42 = `${textTO}, .42)`, color.textT31 = `${textTO}, .31)`, color.textT13 = `${textTO}, .13)`;
    color.bg = s("body", "background-color");
    if (/rgba/.test(color.bg)) {bgTO = color.bg.replace(/,([^,)]*)\)/, "")}
    else {bgTO = color.bg.replace(/rgb\(/, "rgba(").replace(/\)/, "")}
    color.bg = `${bgTO})`, color.bgT00 = `${bgTO}, 0)`, color.bgTSetting = `${bgTO}, .3)`;
    if (q("body.material-you-theme:not(.ncm-light-theme)")) {color.bgTSetting = `${color.accent.replace(/\)/, "")}, .1)`;}
    try {let s0 = q("#PiPWSettingsStyle0"), s = `
#PiPWSettings {
    --pipws-fg: ${color.accent};
    --pipws-bg: ${color.bgTSetting};
    --pipws-bg-wot: ${color.bg};
    color: ${color.text};
}`
        if (s0.innerHTML!=s) {s0.innerHTML=s}
    } catch {}
}

async function loadPiP(isToPiP=true, from="unknow") {
    let PiPE = document.pictureInPictureElement;
    if (!isToPiP && !PiPE && !debugMode) {return}
    if (PiPE && PiPE.id != "PiPW-VideoE") {tipMsg("PiP窗口被占用", "err"); if(!debugMode){return}}
    try {
        let nrInfo = false //need refresh
        , ldTxt = readCfg.customLoadingTxt;
        /*分辨率*/
        let r = readCfg.resolutionRatio
        if (r=="auto") {autoRatio=true; r=autoRatioValue} else {autoRatio=false; r=r*1}
    
        let pS = betterncm.ncm.getPlayingSong(), data;
        if (pS) {data = pS.data}
    
        /*封面*/
        let cvSize = r/3, cvUrl, thbn= `thumbnail=160y160`; //写死
        try {
            let c = q("img.j-cover")
            if (c) {cvUrl = c.src; cvUrl = cvUrl.replace(/thumbnail=([^&]+)/, thbn)}
            if (!cvUrl) {cvUrl = "orpheus://orpheus/style/res/default/default_play_disc.png"}
        } catch {
            try {
                let u = data.album.picUrl
                if (!u) {cvUrl = "orpheus://orpheus/style/res/default/default_play_disc.png"}
                else {cvUrl = `orpheus://cache/?${u}?imageView&enlarge=1&${thbn}`}
            } catch {}
        }
        if (cvUrl != cvUrlCache) {reloadHead()}
    
        /*歌名*/
        let snM, snA=null;
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
        let saE, sa = "";
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
    
        if (data.id != songIdCache) {reloadHead(); songIdCache = data.id; nrLrc=true}
        if (from=="Settings" && oldCfg.lyricsFrom!=readCfg.lyricsFrom) {nrLrc=true}
    
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
        let lyrics = {
            M0: "暂无歌词",
            M1: "",
            M2: "",
            M3: "",
            M4: "",
            T0: "",
            T1: "",
            T2: "",
            T3: "",
            T4: "",
            currentT: 0,
            currentD: 0,
        };
        if (readCfg.lyricsFrom != "RNP") {
            document.removeEventListener("lyrics-updated", rnpLrcUpdate);
            lrcRnpLsnAdded = false
        }
        switch (readCfg.lyricsFrom) {
            case "RNP":getLrcRnp();break
            case "OriginalLyricBar":getLrcOrg();break
            case "LibLyric":getLrcLibLyric();break
            case "Native":getLrcNative();//break
            case "Custom":getLrcCustom();//break
            default: getLrcErr()
        }
        function getLrcErr() {
            getLrcOrg();
            if (readCfg.showLyricsErrorTip) {
                lyrics["M1"] = `当前歌词源错误: ${readCfg.lyricsFrom}`, lyrics["T1"] = "请检查设置项、词源状况或等待加载"
            }
            pLrc = {
                0: {time:0, duration:Infinity, originalLyric: lyrics["M0"], translatedLyric: lyrics["T0"]},
                1: {time:Infinity, duration:0, originalLyric: lyrics["M1"], translatedLyric: lyrics["T1"]}
            };
            pLrcKeys = Object.keys(pLrc)
        }
        function rnpLrcUpdate(e) {
            pLrc = JSON.parse(JSON.stringify(e.detail.lyrics))
            pLrcKeys = Object.keys(pLrc)
            for (let i = 0; i < pLrcKeys.length; i++) {
                let o = pLrc[i].originalLyric
                pLrc[i].originalLyric = o.replace(/\s+/g, " ").trim();
                if (o == "") {pLrc[i].originalLyric = "· · ·", pLrc[i].translatedLyric = ""}
            }
            console.log("PiPW Log: GotLyrics", pLrc)
        };
        function getLrcRnp() {
            if (!loadedPlugins.RefinedNowPlaying) {getLrcErr()}
            try {
                if (!lrcRnpLsnAdded) {
                    document.addEventListener("lyrics-updated", rnpLrcUpdate);
                    lrcRnpLsnAdded = true
                    rnpLrcUpdate({detail:window.currentLyrics})
                }
                lrcUpdate();
            } catch(e) {console.error(`PiPW Error: 获取歌词时出错，详情：\n${e}`);getLrcErr()}
        }
        function getLrcOrg() {
            try {
                lyrics["M0"] = q(".m-lyric .s-fc0").textContent, lyrics["T0"] = q(".m-lyric .s-fc3").textContent
            }catch{
                try {
                    lyrics["M0"] = q(".m-lyric p").textContent
                }catch{}
            }
        }
        async function getLrcLibLyric() {
            if (lrcNowLoading) {lyrics["M0"] = ldTxt;return}
            if (!loadedPlugins.liblyric) {getLrcErr()}
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
                    pLrcKeys = Object.keys(pLrc)
                    for (let i = 0; i < pLrcKeys.length; i++) {
                        let o = pLrc[i].originalLyric
                        pLrc[i].originalLyric = o.replace(/\s+/g, " ").trim();
                        if (o == "") {pLrc[i].originalLyric = "· · ·", pLrc[i].translatedLyric = ""}
                    }
                    console.log("PiPW Log: Lyrics", lrcCache);console.log("PiPW Log: ParsedLyrics", pLrc);
                    lrcNowLoading = false
                }
                lrcUpdate();
            } catch(e) {lrcNowLoading = false;console.error(`PiPW Error: 获取歌词时出错，详情：\n${e}`);getLrcErr()}
        }
        function getLrcNative() {
            //nocode
        }
        function getLrcCustom() {
            //nocode
        }
        function lrcUpdate() {
            let l = pLrcKeys.length
            for (let i = 0; i < l; i++) {
                if (playProgress > pLrc[i].time||pLrc[0].time!=0&&i==0) {
                    if (pLrc[i].dynamicLyric&&readCfg.dynamicLyrics) {
                        lyrics["M0"] = pLrc[i].dynamicLyric
                        lyrics["currentT"] = pLrc[i].dynamicLyricTime
                    } else {
                        lyrics["M0"] = pLrc[i].originalLyric
                        lyrics["currentT"] = pLrc[i].time
                    }
                    lyrics["currentD"] = pLrc[i].duration==0?data.duration-pLrc[i].time:pLrc[i].duration
                    lyrics["M1"] = i+1<l?pLrc[i+1].originalLyric:""
                    lyrics["M2"] = i+2<l?pLrc[i+2].originalLyric:""
                    lyrics["M3"] = i+3<l?pLrc[i+3].originalLyric:""
                    lyrics["M4"] = i+4<l?pLrc[i+4].originalLyric:""
                    lyrics["T0"] = pLrc[i].translatedLyric?pLrc[i].translatedLyric:""
                    lyrics["T1"] = i+1<l?pLrc[i+1].translatedLyric?pLrc[i+1].translatedLyric:"":""
                    lyrics["T2"] = i+2<l?pLrc[i+2].translatedLyric?pLrc[i+2].translatedLyric:"":""
                    lyrics["T3"] = i+3<l?pLrc[i+3].translatedLyric?pLrc[i+3].translatedLyric:"":""
                    lyrics["T4"] = i+4<l?pLrc[i+4].translatedLyric?pLrc[i+4].translatedLyric:"":""
                }
            }
        }
        if (!readCfg.showTranslation) {for (let i=0; i<5; i++) {lyrics[`T${i}`] = ""}}
    
        /*取色环节*/
        colorPick()
        if (color.text!=colorCache.text||color.bg!=colorCache.bg) {reloadHead(); colorCache.text=color.text, colorCache.bg=color.bg}
    
        /*创建canvas*/
        loadC()
        function loadC() {
            let [w, h] = readCfg.aspectRatio.split(":").map(Number), rw = Math.round(r*(w/h)) //因为width不能设为小数
            if (!c) {
                c = cE("canvas");
                console.log("PiPW Log: canvas元素已创建", c);
            }
            if (c.width != rw || c.height != r) {
                c.width = rw; c.height = r; reloadHead()
            }
            if (isToPiP && !PiPE) {
                DontPlay=true; //解决打开小窗时自动播放的问题
                c.toPiP();
                reloadHead()
            }
        }
    
        function reloadHead() {
            if (!cover) {
                cover = new Image();
            }
            cover.src = cvUrl;
            cvUrlCache = cvUrl;
            nrInfo = true;
        }
    
        /*字体*/
        let bold="", f = readCfg.customFonts, fM = f, fT = f; //这里f后期也许单独做一个界面字体
        if (readCfg.originalLyricsBold) {bold="bold"}

        /*日文判断*/
        if (readCfg.useJapaneseFonts) {
            let isJ = false, lyKeys = Object.keys(lyrics);
            for (let i = 0; i < lyKeys.length; i++) {
                if (Array.isArray(lyrics[lyKeys[i]]) ? /[ぁ-ヿ]/g.test(lyrics[lyKeys[i]].map(item => item.word).join("")) : /[ぁ-ヿ]/g.test(lyrics[lyKeys[i]])) {
                    isJ = true;break
                }
            }
            if (isJ) {fM = readCfg.customJapaneseFonts}
        }

        if (from=="Settings") {reloadHead()} //如果是改字体/显示的信息或者颜色有变……

        let cC = c.getContext("2d",{alpha:false})
        , o1 = r/480, o2 = r/240, o3 = r/160, o5 = r/96, o6 = r/80, o9 = r/53.3333, o10 = r/48, o12 = r/40, o15 = r/32, o20 = r/24, o21p5 = r/22.3256, o25 = r/19.2, o30 = r/16, o30p5 = r/15.7377, o35 = r/13.7143, o40 = r/12, o45 = r/10.6667, o55 = r/8.7272, o60 = r/8, o105 = r/4.57143, o150 = r/3.2, o480 = r
        , txtMgL = cvSize + o10;
        cC.textAlign = "left";

        let xy = cvSize+o3;
        cC.fillStyle = color.bg;
        cC.fillRect(0, xy, c.width, c.height); /*底背景*/
    
        let lrcFS = o55, lrcMgT = o45, lrcMgL = o15, mLrcMgL = lrcMgL
        , lrcTop = cvSize+lrcMgT
        , lrc0 = lrcTop+lrcFS, lrc1 = lrcTop+lrcFS*2+o10, lrc2 = lrcTop+lrcFS*3+o12, lrc3 = lrcTop+lrcFS*4+o10, lrc4 = lrcTop+lrcFS*5+o2
        , lrcSSS = readCfg.lyricsTaperOff;
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
                now = (playProgress-lyrics["currentT"])/lyrics["currentD"]
                now = lyrics["currentT"]>playProgress ? 0 : now>1?1:now
            }
            let l = w*now
            if (w>c.width-lrcMgL&&l+o105>c.width-lrcMgL) {
                mLrcMgL = 0-(l+lrcMgL-c.width)+lrcMgL-o105
            }
        }
        
        isDynamicLyrics = false
        if (Array.isArray(lyrics["M0"])) {
            isDynamicLyrics = true
            let lyricDO = ""/*lyricDynamicOrigin*/, l = lyrics["M0"].length, now = 0, nowWidth = 0
            lyricDO = lyrics["M0"].map(item => item.word).join("");
            lrcMNowUnplayed();
            for (let i=0; i<l; i++) {
                let lrc = lyrics["M0"][i], Cnow = (playProgress-lrc.time)/lrc.duration
                Cnow = lrc.time>playProgress ? 0 : Cnow>1?1:Cnow
                nowWidth += cC.measureText(lrc.word).width*Cnow
            }
            let w = cC.measureText(lyricDO).width
            now = nowWidth/w
            updateMLrcMgL(w, now);
            cC.fillText(lyricDO, mLrcMgL, lrc0); /*主歌词(未播放)*/
            lrcMNow(); cC.save();
            cC.beginPath();
            cC.rect(0, 0, w*now+mLrcMgL, c.height); cC.clip();
            cC.fillText(lyricDO, mLrcMgL, lrc0); /*主歌词(已播放)*/
            cC.restore();
        } else if (readCfg.lyricsFrom!="OriginalLyricBar") {
            lrcMNow();
            updateMLrcMgL(cC.measureText(lyrics["M0"]).width);
            cC.fillText(lyrics["M0"], mLrcMgL, lrc0); /*主歌词*/
        } else {
            lrcMNow(); cC.fillText(lyrics["M0"], lrcMgL, lrc0); /*主歌词*/
        }
    
        if (lyrics["T0"]!="") {
            lrcTNow();
            if (readCfg.lyricsFrom!="OriginalLyricBar") {
                mLrcMgL = lrcMgL
                updateMLrcMgL(cC.measureText(lyrics["T0"]).width);
            }
            cC.fillText(lyrics["T0"], mLrcMgL, lrc1-o10); /*翻译歌词*/
            lrcMNext1(); cC.fillText(lyrics["M1"], lrcMgL, lrc2); /*下1句主歌词*/
            if (lyrics["T1"]!="") {
                lrcTNext1(); cC.fillText(lyrics["T1"], lrcMgL, lrc3-o10); /*下1句翻译歌词*/
                lrcMNext2(); cC.fillText(lyrics["M2"], lrcMgL, lrc4); /*下2句主歌词*/
            } else {
                lrcMNext2(); cC.fillText(lyrics["M2"], lrcMgL, lrc3); /*下2句主歌词*/
                if (lyrics["T2"]!="") {
                    lrcTNext2(); cC.fillText(lyrics["T2"], lrcMgL, lrc4-o10); /*下2句翻译歌词*/
                } else {
                    lrcMNext3(); cC.fillText(lyrics["M3"], lrcMgL, lrc4); /*下3句主歌词*/
                }
            }
        } else {
            lrcMNext1(); cC.fillText(lyrics["M1"], lrcMgL, lrc1); /*下1句主歌词*/
            if (lyrics["T1"]!="") {
                lrcTNext1(); cC.fillText(lyrics["T1"], lrcMgL, lrc2-o10); /*下1句翻译歌词*/
                lrcMNext2(); cC.fillText(lyrics["M2"], lrcMgL, lrc3); /*下2句主歌词*/
                if (lyrics["T2"]!="") {
                    lrcTNext2(); cC.fillText(lyrics["T2"], lrcMgL, lrc4-o10); /*下2句翻译歌词*/
                } else {
                    lrcMNext3(); cC.fillText(lyrics["M3"], lrcMgL, lrc4); /*下3句主歌词*/
                }
            } else {
                lrcMNext2(); cC.fillText(lyrics["M2"], lrcMgL, lrc2); /*下2句主歌词*/
                if (lyrics["T2"]!="") {
                    lrcTNext2(); cC.fillText(lyrics["T2"], lrcMgL, lrc3-o10); /*下2句翻译歌词*/
                    lrcMNext3(); cC.fillText(lyrics["M3"], lrcMgL, lrc4); /*下3句主歌词*/
                } else {
                    lrcMNext3(); cC.fillText(lyrics["M3"], lrcMgL, lrc3); /*下3句主歌词*/
                    if (lyrics["T3"]!="") {
                        lrcTNext3(); cC.fillText(lyrics["T3"], lrcMgL, lrc4-o10); /*下3句翻译歌词*/
                    } else {
                        lrcMNext4(); cC.fillText(lyrics["M4"], lrcMgL, lrc4); /*下4句主歌词*/
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
    
        if (nrInfo) {
            drawBgAndInfo()
            cC.fillStyle = color.textT80; cC.font = `${o25}px ${f}`; cC.fillText(ldTxt, o5, o30); /*封面(加载)*/
            drawRC();
            cover.onload = ()=>{/*封面(完毕)*/
                cC.clearRect(0, 0, cvSize, cvSize);
                cC.drawImage(cover, 0, 0, cvSize, cvSize);
                drawBgAndInfo();drawRC();
                if(showRefrshing){console.log(`PiPW Log: 歌曲封面绘制完成`)}
            }
            function drawRC() {
                cC.beginPath(); cC.strokeStyle = color.bg; cC.lineWidth = o5; xy = cvSize+o2;
                /*封面边框+圆角*/
                cC.moveTo(xy, 0); cC.arcTo(xy, xy, 0, xy, o12); cC.lineTo(0, xy); cC.lineTo(xy, xy); cC.lineTo(xy, 0);
                cC.stroke();
            }
            function drawBgAndInfo() {
                cC.fillStyle = color.bg; xy = cvSize;
                cC.fillRect(xy, 0, c.width, xy+o5); /*head背景*/
                cC.beginPath(); cC.strokeStyle = color.bg; cC.lineWidth = o5; xy = cvSize+o5;
                cC.moveTo(0, xy); cC.lineTo(c.width, xy); /*底边框*/
                cC.stroke();
                cC.fillStyle = color.text; cC.font = `${o55}px ${f}`;
                cC.fillText(snM, txtMgL, o60); /*主名*/
                cC.fillStyle = color.textT31; cC.font = `${o35}px ${f}`;
                cC.fillText(snA==null?"":snA, txtMgL, o105); /*副名*/
                cC.fillStyle = color.textT56;
                cC.fillText(sa, txtMgL, snA==null?o105:o150); /*歌手*/
            }
        }
    
        cC.font = `${o30}px ${f}`;
        cC.fillStyle = color.textT56;
        let tW = cC.measureText(t).width
        cC.fillText(t, o15, cvSize+o35); /*时间*/
    
        let  pbMgT = cvSize+o21p5, pbMgL = tW+o30p5
        cC.fillStyle = color.textT13;
        cC.fillRect(pbMgL, pbMgT, c.width-pbMgL, o5); /*进度条背景*/
        cC.fillStyle = color.accent;
        cC.fillRect(pbMgL, pbMgT, (c.width-pbMgL)*tP, o5); /*进度条*/
    
        if(showRefrshing){console.log(`PiPW Log: <canvas>重绘完成，当前分辨率${c.width}x${c.height}, 请求来自${from}`)}
    } catch (e) {
        console.error("PiPW Error: <canvas>绘制出错，详情：\n", e);tipMsg("&lt;canvas&gt;绘制出错，详见JavaScript控制台", "err")
    }
}

plugin.onAllPluginsLoaded(()=>{load()});
function load() {B();C();E();F()
    legacyNativeCmder.appendRegisterCall("PlayProgress", "audioplayer", (_, p) => {
        playProgress = p*1000; let pZ = Math.floor(p), needLoadPiP = false;
        if (pZ>tC||p<tC||readCfg.smoothProgessBar) {tC = p; needLoadPiP = true}
        if (isDynamicLyrics||readCfg.autoScroll) {needLoadPiP = true}
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
    async function E() { //监听颜色变动
        let A = qAll("html, body");
        for(i = 0; i < A.length; i++){
            new MutationObserver(() => {
                setTimeout(()=>{colorPick()}, 100)
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
                case "string":
                    let str = q(`#${a[i]}SetBox`), radios = qAll(`[name=${a[i]}]`)
                    if (str) {
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

plugin.onConfig(()=>{
    colorPick()
    let cP = cE("div", document);
    cP.setAttribute("id", "PiPWSettings");
    cP.innerHTML = `
<style id="PiPWSettingsStyle0">
    #PiPWSettings {
        --pipws-fg: ${color.accent};
        --pipws-bg: ${color.bgTSetting};
        --pipws-bg-wot: ${color.bg};
        color: ${color.text};
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
        font-size: 18px;
        font-weight: bold;
        line-height: 32px;
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

    #PiPWSettings .textBox {
        padding: 10px;
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
    <p class="partTitle">PiPWindow </p><p> 0.4.1</p>
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
    <p>⚠️RefinedNowPlaying词源需要打开正在播放界面</p>
</div>
<div class="part noAutoBr">
    <p class="partTitle">自定义设置</p>
    <p>注: 启用带*的选项可能会出现卡顿</p>
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
            <input id="showAlbumSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>显示专辑名 (而非翻译/别名)</p>
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
        <br />
        <label class="switch">
            <input id="showLyricsErrorTipSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>显示歌词源错误提示</p>
    </div>
    <div class="subPart">
        <p class="subTitle">字体</p>
        <br />
        <p>全局</p>
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
        <p>渲染分辨率</p>
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
            case "string":
                let str = q(`#${keyName}SetBox`, cP), radios = qAll(`[name=${keyName}]`, cP)
                if (radios.length!=0) {
                    for (let i = 0; i < radios.length; i++) {
                        if (radios[i].value ==  key) {radios[i].checked = true}
                        radios[i].addEventListener("change", ()=>{saveCfg(keyName)})
                    }
                } else if (str) {
                    str.addEventListener("keydown", (e)=>{if(e.key=="Enter"){saveCfg(keyName)}}); //回车应用
                    q(`#applyButton-${keyName}`, cP).addEventListener("click", ()=>{saveCfg(keyName)});
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
    q(`[name="resolutionRatio"][value="auto"]`, cP).addEventListener("click", ()=>{autoRatio=true;reRatio(thePiPWindow.height)});
    q("#debugModeSwitch", cP).addEventListener("change", ()=>{debugMode=q("#debugModeSwitch").checked;if(debugMode){try{q("#PiPWSettings").appendChild(v)}catch{};window.PiPWShowRefrshing()}});
    console.log(cP);
    return cP;
});