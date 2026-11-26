/*This plugin is licensed under the GNU/GPL-3.0
**Copyright (C) 2024-2026 Lukoning
*/
let rvN, reRatioTimer, winAspect, v, amllbgv/*Apple Music-like Lyrics Background Video*/, b/*(toggle)button*/, cP/*configPage*/, c/*canvas*/, bgc/*Background Canvas*/, cpc/*ColorPick() Canvas*/, cC/*...Context*/, bgcC, cpcC
, cover, OcvUrl, cvUrl, cvUrlCache, OcvUrlCache, songDataCache, tMsT, lrcCache, pLrc, pLrcKeys, showRefreshing, thePiPWindow, curLdTxt, cvDrawn=false, lrcPrevC, lrcCurC, lrcOldC, lrcLastKey, lrcLastDy=0, lrcAnimStart=0, lrcAnimDy=0, nrNextTick=false
, DontPlay=false, DontPause=false, autoRatio, autoRatioValue=480, lastReRatio=0, songIdCache=0, playProgress=0, nrLrc=false, lrcNowLoading=false, reRatioPending=false, isDynamicLyrics=false, isJp=false,debugMode=false
, isVLsnAdded=false, isLrcRnpLsnAdded=false
, t = "0:00 / 0:00", tC = 0, tT = 0, tP = 0, tR = 0 //显示用，Current，Total，PassedRate，Remaining
, readCfg = JSON.parse(localStorage.getItem("PiPWindowSettings"))
, color = ({accent: "", text: "", textT20: "", textT40: "", textT50: "", textT60: "", bg: "", bgT00: "", bgT50: ""}), colorS = ({accent: "", text: "", bg: "", bgT: ""}), colorCache = ({text: "", bg: ""})
, song = ({name:"", nameAnother:"", artist:""})
const pdd = "M21 3C21.5523 3 22 3.44772 22 4V11H20V5H4V19H10V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM21 13C21.5523 13 22 13.4477 22 14V20C22 20.5523 21.5523 21 21 21H13C12.4477 21 12 20.5523 12 20V14C12 13.4477 12.4477 13 13 13H21Z"
, pO = `<path d="${pdd}M20 15H14V19H20V15ZM6.70711 6.29289L8.95689 8.54289L11 6.5V12H5.5L7.54289 9.95689L5.29289 7.70711L6.70711 6.29289Z"></path>`
, pC = `<path d="${pdd}"></path>`
, cfgDefault = ({
    whenClose: "none", whenBack: "back", whenCloseOrBack_paused: "close", autoHideMainWindow: false, showTaskbarButton: false
    , useCloudDataForLocalFile: false, showDiscWhenNoCover: false, allowNonsquareCover: false, /*showIconBarBeforeInfo: true,*/ trackInfoShow: "auto", timeInfo: "CurrentTotal"
    , lyricLine2Show: "auto", dynamicLyrics: true, autoScroll: true, lyricsTaperOff: true, lyricsMask: false, lyricsTransition: true, lyricsHanzi2Kanji: true, lyricsOffset: 0, lyricsFrom: "LibLyric", lyricsCustomSources: "https://example.com/lyric?track=${track}&id=${trackId}&art=${artist}&arts=${artists}&album=${album}&albumId=${albumId}", showLyricsErrorTip: true
    , colorFrom: "albumCover", colorCustom_accent: "#FFFFFF", colorCustom_text: "#FFFFFF", colorCustom_bg: "#424242", backgroundFrom: "albumCoverBlur", generalFontWeight: 400, originalLyricsFontWeight: 700, translatedLyricsFontWeight: 400
    , customFonts: "\"Segoe UI\", \"Microsoft Yahei UI\", system-ui", useJapaneseFonts: true, customJapaneseFonts: "\"Yu Gothic UI\", \"Meiryo UI\", \"Microsoft Yahei UI\", system-ui", coverCornerRadius: 6 /*封面圆角默认为6px，比Win11窗口圆角(8px)略小，以获得视觉平衡*/
    , smoothProgessBar: false, resolutionRatio: "auto", aspectRatio: "2:1", albumCoverSize: 160, useFullCover: false
    , customLoadingTxt: "正在载入猫猫…|猫猫正在赶来的路上…|马上就好了喵…"})
, DcvUrl/*Default*/ = "orpheus://orpheus/style/res/common/discovery/calendar_bg.png"
, discUrl = "orpheus://orpheus/style/res/default/default_play_disc.png"
readCfg = {...cfgDefault, ...readCfg} //缺失配置啥的处理一下
let oldCfg = {...readCfg}
window.PiPWShowRefreshing = (x=true)=>{if(x==true){showRefreshing=true;return true}else if(x==false){showRefreshing=false;return false}}
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

async function taskbarButton(isShow=true) {betterncm.app.exec(`PowerShell -command "Set-ExecutionPolicy -Scope Process UnRestricted; ${loadedPlugins.PiPWindow.pluginPath}/taskbarButton.ps1 -Action ${isShow?"Show":"Hide"}"`)}

async function tipMsg(m, t) {
    let c1="u-result", c2="j-tips", c=`.${c1}.${c2}`, iiH=`<span class="u-tit f-ff2">${m}</span>`
    if (t=="err") {
        iiH=`<i class="icon u-icn u-icn-operatefail"></i><span class="u-tit f-ff2 errTxt">${m}</span>`
    }
    let iH=`<div class="wrap"><div class="inner j-flag">${iiH}</div></div>`
    if (q(c+":not(.z-hide)")) {
        if (q(c+" .inner")) {q(c+" .inner").innerHTML=iiH} else {q(c).innerHTML=iH}
        try{clearTimeout(tMsT)}catch{}
    } else {
        let d = cE("div");
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
    rv = Number(rv)
    if (!isFinite(rv) || rv <= 0) {return} /*窗口关闭/过渡期间浏览器会报告高度0，不能当成分辨率，否则下次打开画布就是0x0，窗口一出来就消失*/
    rvN = Math.min(1080, Math.max(160, Math.round(rv/8)*8)) /*限制在设置里可选的分辨率范围内(160~1080)，避免窗口很大时画布无限变大*/
    clearTimeout(reRatioTimer)
    reRatioTimer = setTimeout(()=>{ /*等用户停止拖动窗口后再应用：拖动过程中改画布尺寸，会和浏览器的小窗布局互相干扰，造成窗口乱跳甚至消失*/
        reRatioTimer = null
        if (!document.pictureInPictureElement) {return} /*窗口已经关闭*/
        let changed = false;
        /*自适应分辨率*/
        if (autoRatio && Math.abs(rvN - autoRatioValue) >= 2) {autoRatioValue = rvN; changed = true} /*变化很小(2px以下)就不动，避免来回抖动*/
        /*跟随窗口实际宽高比：窗口被放大/吸附后形状可能和画布不一致，上下或左右会出现黑边(黑边在视频之外，只能让画布跟着窗口的形状变)*/
        let pw = thePiPWindow, a = (pw && pw.width > 0 && pw.height > 0) ? pw.width / pw.height : 0;
        if (a > 0) {
            let [cw, ch] = readCfg.aspectRatio.split(":").map(Number), na = Math.abs(a / (cw / ch) - 1) > 0.04 ? Math.min(4, Math.max(0.5, Math.round(a*100)/100)) : undefined;
            if ((na === undefined) != (winAspect === undefined) || (na !== undefined && Math.abs(na / winAspect - 1) > 0.02)) {winAspect = na; changed = true}
        }
        if (changed) {try {loadPiP(false, "ReRatio")} catch {}}
    }, 800)
}

HTMLCanvasElement.prototype.toPiP = function(){
    if (!(v instanceof HTMLVideoElement)) {
        v = cE("video");
        v.addEventListener("loadedmetadata", async()=>{
            try {
                //请求小窗
                v.requestPictureInPicture().then(p=>{
                    thePiPWindow=p;reRatio(p.height);p.addEventListener("resize", e=>{reRatio(e.target.height)});//自适应分辨率
                    taskbarButton(readCfg.showTaskbarButton);//任务栏按钮
                })
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
                    if (readCfg.autoHideMainWindow) {mwf.cef.R$exec("winhelper.showWindow", "minimize");mwf.cef.R$call("winhelper.showWindow", "hide")}
                    tipMsg("已打开小窗"); q("svg", b).innerHTML=pC; b.setAttribute("style", "fill: currentColor; opacity: 1"); b.title = "关闭小窗";
                    if (s.state==1) {v.pause()} DontPlay=false
                    if(debugMode){console.log(e)}
                });
                v.addEventListener("leavepictureinpicture", e=>{ winAspect = undefined; clearTimeout(reRatioTimer); DontPause=true; let p = v.paused
                    tipMsg("已关闭小窗"); q("svg", b).innerHTML=pO; b.setAttribute("style", ""); b.title = "打开小窗";
                    setTimeout(()=>{
                        if (v.paused!=p) { //状态不一致，判定为按下关闭按钮
                            let c = readCfg.whenClose;
                            if (c == "pause") {DontPause=false;ncmPause()}
                            else if (c == "shutdown") {
                                DontPause=false; ncmPause(); if(debugMode){tipMsg("调试模式：触发退出云音乐");return}
                                mwf.cef.R$call("winhelper.showWindow", "hide"); mwf.cef.R$exit()
                            }
                        } else if (!p&&readCfg.whenBack == "back") {mwf.cef.R$call("winhelper.showWindow", "show")}
                        else if (readCfg.whenCloseOrBack_paused == "back") {mwf.cef.R$call("winhelper.showWindow", "show")}
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
    DontPlay=true; //解决打开小窗时自动播放的问题
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
    if (readCfg.colorFrom=="custom") { //这里的数据是HEX格式
        color.accent = readCfg.colorCustom_accent;
        textTO = readCfg.colorCustom_text;
        color.text = textTO, color.textT60 = `${textTO}99`, color.textT50 = `${textTO}80`, color.textT40 = `${textTO}66`, color.textT20 = `${textTO}33`;
        bgTO = readCfg.colorCustom_bg;
        color.bg = bgTO, color.bgT00 = `${bgTO}00`, color.bgT50 = `${bgTO}7F`;
    } else {
        if (from==null) {
            color.accent = colorS.accent;
        } else if (from instanceof HTMLElement) {
            // --- 内联 HSL 与对比度辅助函数 ---
            function rgbToHsl(r,g,b) {
                r/=255; g/=255; b/=255; const mx=Math.max(r,g,b), mn=Math.min(r,g,b); let h,s,l=(mx+mn)/2;
                if (mx===mn) { h=s=0 } else { const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn);
                switch (mx) { case r: h=(g-b)/d+(g<b?6:0); break; case g: h=(b-r)/d+2; break; case b: h=(r-g)/d+4; break; } h/=6 }
                return [h*360, s*100, l*100];
            };
            function hslToRgb(h,s,l) {
                h/=360; s/=100; l/=100; let r,g,b;
                if (s===0) { r=g=b=l } else {
                    function hue2rgb(p,q,t){
                        if(t<0)t+=1; if(t>1)t-=1;
                        if(t<1/6)return p+(q-p)*6*t; if(t<1/2)return q; if(t<2/3)return p+(q-p)*(2/3-t)*6; return p;
                    };
                    const q = l<.5?l*(1+s):l+s-l*s, p=2*l-q;
                    r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
                }
                return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
            };
            function getLuminance(r,g,b) {
                const a=[r,g,b].map(v=>{
                    v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);
                });
                return a[0]*.2126 + a[1]*.7152 + a[2]*.0722;
            };
            if (!cpc||!cpcC) {cpc = cE("canvas"); cpc.width = 3; cpc.height = 3; cpcC = cpc.getContext("2d",{alpha:false})}
            from.height?cpcC.drawImage(from, 0, 0, cpc.width, cpc.height):""
            let rgb = cpcC.getImageData(1, 1, 2, 2).data;
            // 1. 获取并处理 HSL 信息
            let [h, s, l] = rgbToHsl(rgb[0], rgb[1], rgb[2]);
            s = (s**(.5))*10; // 非线性提升饱和度，即用根号s乘以10
            // 2. 处理背景
            let isDark = l < 56; // 暗色转变阈值：56%
            let bgS = Math.min(s, 40); // 最高40%饱和度
            let bgL = isDark ? 20 : 70; // 如果原图暗，背景变暗，否则变亮
            let bgRgb = hslToRgb(h, bgS, bgL);
            bgTO = `rgba(${bgRgb[0]}, ${bgRgb[1]}, ${bgRgb[2]}`;
            // 3. 处理强调色/文字色
            let textS = Math.min(Math.max(s, 60), 90); // 最低60%保证色彩，最高限制在90%防荧光色
            let textL = isDark ? 80 : 20; // 基础亮度设定在 80%（暗色）和 20%（亮色）
            // AMLL 特殊处理（如果启用了 AMLL，强制变亮）
            if (readCfg.backgroundFrom == "AMLL" && loadedPlugins["Apple-Musiclike-lyrics"]) {
                textL = 80;
            }
            let textRgb = hslToRgb(h, textS, textL);
            // 4. 对比度判定（WCAG AA 标准，对比度不低于 4.5）
            let bgLum = getLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);
            let textLum = getLuminance(textRgb[0], textRgb[1], textRgb[2]);
            let contrast = (Math.max(bgLum, textLum) + .05) / (Math.min(bgLum, textLum) + .05);
            // 如果对比度不足，提高/降低文字亮度
            if (contrast < 4.5) {
                textL = isDark ? 90 : 10;
                textRgb = hslToRgb(h, textS, textL);
                textLum = getLuminance(textRgb[0], textRgb[1], textRgb[2]);
                contrast = (Math.max(bgLum, textLum) + .05) / (Math.min(bgLum, textLum) + .05);
                // 终极兜底：直接使用纯白色/纯黑色
                if (contrast < 4.5) {
                    textRgb = isDark ? [255, 255, 255] : [0, 0, 0];
                }
            }
            color.accent = `rgb(${textRgb[0]}, ${textRgb[1]}, ${textRgb[2]})`;
            textTO = `rgba(${textRgb[0]}, ${textRgb[1]}, ${textRgb[2]}`;
        }
        color.text = `${textTO})`, color.textT60 = `${textTO}, .6)`, color.textT50 = `${textTO}, .5)`, color.textT40 = `${textTO}, .4)`, color.textT20 = `${textTO}, .2)`;
        color.bg = `${bgTO})`, color.bgT00 = `${bgTO}, 0)`, color.bgT50 = `${bgTO}, .5)`;
    }
    
    try {let s0 = q("#PiPWSettingsStyle0", cP), s = `
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
    if (!isToPiP && !PiPE && !debugMode) return
    if (PiPE && PiPE.id != "PiPW-VideoE") {tipMsg("PiP窗口被占用", "err"); if(!debugMode){return}}
    if (v?.paused) nrNextTick = false
    let startTime = Date.now();
    try {
        let nrInfo=false/*need re-*/, nrHead=false, chigai=false /*曲目不同以往(?)*/
        , ldTxtList = readCfg.customLoadingTxt.split("|").map(s=>s.trim()).filter(s=>s!="")
        /*分辨率*/
        let r = readCfg.resolutionRatio
        if (r=="auto") {autoRatio=true; r=autoRatioValue} else {autoRatio=false; r=r*1}
        if (!(r>0)) {r = 480; if (autoRatio) {autoRatioValue = 480}} /*兜底：分辨率异常时不能让画布变成0x0*/

        let pS = betterncm.ncm.getPlayingSong(), data;
        if (pS) {
            data = pS.data;
            if (data.track && readCfg.useCloudDataForLocalFile) { //track为本地歌曲对应云端数据, 是否使用这个数据会影响歌词请求、信息展示等
                data = data.track
            }
        }
    
        if (data.id != songIdCache) {
            getInfo(); chigai=true; songIdCache = data.id; nrLrc=true; nrHead=true; lrcLastKey = undefined;
            curLdTxt = ldTxtList.length ? ldTxtList[Math.floor(Math.random()*ldTxtList.length)] : cfgDefault.customLoadingTxt
        }
        if (from=="Settings" && (oldCfg.lyricsFrom!=readCfg.lyricsFrom||oldCfg.lyricsCustomSources!=readCfg.lyricsCustomSources)) {nrLrc=true}
    
        let cvSizeX = r/3, cvSizeY = r/3
        /*封面*/
        if (!cover) {
            cover = new Image();
        }
        let s = readCfg.albumCoverSize
        , thbn = `thumbnail=${s}y${s}`;
        readCfg.useFullCover?thbn="":""
        if (readCfg.allowNonsquareCover) {cvSizeX = cover.width*(cvSizeY/cover.height);thbn=""}
        try {
            OcvUrl = q("img.j-cover").src;
            if (OcvUrl != OcvUrlCache) {nrHead=true; OcvUrlCache=OcvUrl} //不对头…刷新！(解决断网有时获取封面为空问题)
        }catch{}
        try {
            let u = data.album.picUrl
            if (!u) {ya.ma.no.su.su.me;throw new Error()}
            else {cvUrl = `orpheus://cache/?${u}?imageView&enlarge=1&type=webp${thbn==""?"":`&${thbn}`}`}
        } catch {try {
            cvUrl = OcvUrl.replace(/thumbnail=([^&]+)/, `type=webp${thbn==""?"":`&${thbn}`}`)
            if (!cvUrl) {cvUrl = null}
        } catch {cvUrl = null}}
        if (cvUrl != cvUrlCache) {nrHead=true}
        function getInfo() {
            /*歌名*/
            try {
                song.name = data.name;
                switch (readCfg.trackInfoShow) {
                    case "auto": trans(); if(song.nameAnother==""){album()} break
                    case "album": album(); break
                    case "translation": trans(); break
                    default: album()
                }
                function trans() {
                    let t = data.transNames, a = data.alias;
                    t = t?t[0]:null, a = a?a[0]:null;
                    if (t||a) {song.nameAnother = `${t||""}${t&&a?" ":""}${a||""}`}
                    else {song.nameAnother = ""}
                }
                function album() {
                    let n = data.album.name, t = data.album.transNames;
                    n = n?n:null, t = t?t[0]:null;
                    if (n||t) {song.nameAnother = `${n||""}${t?" ("+t+")":""}`}
                    else {song.nameAnother = "未知专辑"}
                }
            } catch {
                let t = q(".m-pinfo .j-title")
                song.name = t?t.title:"没有曲目";
                try {
                    song.nameAnother = q(".m-pinfo .j-title .s-fc4").textContent.slice(1).slice(0, -1);
                }catch{}
            }
    
            /*歌手*/
            let sa="",saE
            try {
                saE = data.artists;
                for (i=0; i<saE.length; i++, sa=sa+" / ") {
                    sa = sa + saE[i].name;
                }
                sa = sa.slice(0, -3); /*处理多余斜杠*/
                song.artist = sa==""?"未知艺术家":sa
            } catch {
                saE = qAll(".m-pinfo .bar > .j-title span:first-child *")
                if (saE&&saE.length!=0) {
                    for (i=0; i<saE.length; i++, sa=sa+" / ") {
                        sa = sa + saE[i].textContent;
                    }
                    sa = sa.slice(0, -3); /*处理多余斜杠*/
                    song.artist = sa=="未知"?"未知艺术家":sa
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
            if (tI == "CurrentTotal") {t = `${tCD} / ${tTD}`}
            else if (tI == "CurrentRemaining") {t = `${tCD} / ${tRD}`}
        }catch{}
    
        /*歌词*/
        let lyrics = ({
            M: [
                "暂无歌词",
                "",
                "",
                "",
            ],
            T: [
                "",
                "",
                "",
                "",
            ],
            currentStartT: 0, // 当前歌词行开始时刻
            currentD: 0, // 当前歌词行持续时间
        }), offset = readCfg.lyricsOffset*1000, progress = playProgress + offset;
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
            Object.prototype.toString.call(e)==="[object Object]"?e.message===void 0?e=JSON.stringify(e):e=e.message:""
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
            if (lrcNowLoading) {lyrics.M[0] = curLdTxt ?? cfgDefault.customLoadingTxt;return}
            if (!loadedPlugins.liblyric) {showLrcErr("依赖的插件未安装")}
            try {
                let ll = loadedPlugins.liblyric
                if (nrLrc) {
                    lrcNowLoading = true
                    nrLrc = false
                    lrcCache = await ll.getLyricData(data.track?data.track.id:data.id)
                    console.log("PiPW Log: Lyrics", lrcCache);
                    pLrc = ll.parseLyric(
                        lrcCache.lrc.lyric
                        , lrcCache.tlyric? lrcCache.ytlrc ? lrcCache.ytlrc.lyric : lrcCache.tlyric.lyric :""
                        , lrcCache.romalrc? lrcCache.yromalrc ? lrcCache.yromalrc.lyric : lrcCache.romalrc.lyric :""
                        , lrcCache.yrc? lrcCache.yrc.lyric? lrcCache.yrc.lyric :"":"" //为什么lrcCache.yrc.lyric可以是null...
                    )
                    handleLyrics()
                    console.log("PiPW Log: ParsedLyrics", pLrc);
                    lrcNowLoading = false
                }
                lrcUpdate();
            } catch(e) {getLrcErr(e)}
        }
        async function getLrcCustom() {
            if (lrcNowLoading) {lyrics.M[0] = curLdTxt ?? cfgDefault.customLoadingTxt;return}
            if (!loadedPlugins.liblyric) {showLrcErr("依赖的插件未安装")}
            try {
                let ll = loadedPlugins.liblyric
                if (nrLrc) {
                    lrcNowLoading = true
                    nrLrc = false
                    let songDetails = {
                        track: data.name,
                        trackId: data.track?data.track.id:data.id,
                        artist: data.artists[0].name,
                        artists: song.artist,
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
            if (pLrc.length==0) {isJp=false} else {
                pLrcKeys = Object.keys(pLrc)
                for (let i = 0; i < pLrcKeys.length; i++) {
                    isJp = /[ぁ-ヿ]/g.test(pLrc[i].originalLyric)
                    if (isJp==true) {break}
                }
                for (let i = 0; i < pLrcKeys.length; i++) {
                    let o = pLrc[i].originalLyric, t = pLrc[i].translatedLyric, d = JSON.stringify(pLrc[i].dynamicLyric)
                    if (o==t) {pLrc[i].translatedLyric = ""} //优化歌词展示体验
                    o = pLrc[i].originalLyric.replace(/\s+/g, " ").trim()
                    if (o=="") {if (i+1==pLrcKeys.length) {delete pLrc[i];pLrcKeys = Object.keys(pLrc);continue} else {pLrc[i].originalLyric = "· · ·", pLrc[i].translatedLyric = ""}}
                    else if (isJp && readCfg.lyricsHanzi2Kanji) {
                        pLrc[i].originalLyric = cn2jp(o)
                        try{d = cn2jp(d)}catch{}
                    } else {pLrc[i].originalLyric = o}
                    try{
                        d = d.replace(/\s+/g, " ").trim()
                        pLrc[i].dynamicLyric = JSON.parse(d)
                    }catch{}
                }
            }
        }
        function lrcUpdate() { //更新歌词数据
            if (pLrc.length==0) {return}
            let l = pLrcKeys.length, p = progress
            for (let i = 0; i < l; i++) {
                let d = pLrc[i].duration
                if (p < pLrc[i].time+d || i==l-1) {
                    if (pLrc[i].dynamicLyric&&readCfg.dynamicLyrics) { //第1行主歌词
                        lyrics.M[0] = pLrc[i].dynamicLyric
                        lyrics.currentStartT = pLrc[i].dynamicLyricTime
                    } else {
                        lyrics.M[0] = pLrc[i].originalLyric
                        lyrics.currentStartT = pLrc[i].time
                    }
                    lyrics.currentD = d==0?data.duration-pLrc[i].time:d
                    for (let j = 1; j < 5; j++) {lyrics.M[j] = i+j<l?pLrc[i+j].originalLyric:""} //2~5行主歌词
                    //1~5行翻译/拉丁化歌词
                    switch (readCfg.lyricLine2Show) {
                        case "none": for (let i=0; i<5; i++) {lyrics[`T${i}`] = ""} break
                        case "auto": trans();latin(false);break
                        case "translation": trans();break
                        case "latinization": latin();break
                        default: trans();latin(false)
                    }
                    break
                    function trans() {
                        for (let j = 0; j < 5; j++) {lyrics.T[j] = i+j<l?pLrc[i+j].translatedLyric?pLrc[i+j].translatedLyric:"":""}
                    }
                    function latin(b=true) {
                        for (let j = 0; j < 5; j++) {if(lyrics.T[j]==""||b){lyrics.T[j] = i+j<l?pLrc[i+j].romanLyric?pLrc[i+j].romanLyric:"":""}}
                    }
                }
            }
        }
    
        /*取色环节*/
        chigai? readCfg.colorFrom=="albumCover"? colorPick(cover?cover:null) : colorPick() :""
        if (color.text!=colorCache.text||color.bg!=colorCache.bg) {nrHead=true; colorCache.text=color.text, colorCache.bg=color.bg}
    
        /*创建canvas*/
        loadC()
        function loadC() {
            let [w, h] = readCfg.aspectRatio.split(":").map(Number), asp = (winAspect && Math.abs(winAspect/(w/h)-1) > 0.04) ? winAspect : w/h, rw = Math.round(r*asp) //因为width不能设为小数
            if (!c||!cC) {
                c = cE("canvas"); cC = c.getContext("2d",{alpha:false}); cvDrawn = false; //alpha:false可有效解决内存溢出问题
                console.log("PiPW Log: canvas元素已创建", c, cC);
            }
            if (!bgc||!bgcC) {
                bgc = cE("canvas"); bgcC = bgc.getContext("2d",{alpha:false});
                console.log("PiPW Log: 背景canvas元素已创建", bgc, bgcC);
            }
            if (c.width != rw || c.height != r) {
                c.width = rw; c.height = r; nrHead=true;
                bgc.width = rw; bgc.height = r;
            }
        }
    
        /*字体*/
        let f = readCfg.customFonts, fM = f, fT = f //这里f后期也许单独做一个界面字体
        , gFW = readCfg.generalFontWeight
        , oLFW = readCfg.originalLyricsFontWeight
        , tLFW = readCfg.translatedLyricsFontWeight

        /*日文字体更换*/
        readCfg.useJapaneseFonts&&isJp ? fM=readCfg.customJapaneseFonts :""

        if (from=="Settings") {getInfo();nrHead=true} //如果是改字体/显示的信息或者颜色有变……

        nrHead?reloadHead():""
        function reloadHead() {
            if (!cvUrl) {
                cover.src = DcvUrl;
                readCfg.showDiscWhenNoCover?"":cvSizeX = r/96
            }
            else {cover.src = cvUrl}
            cvUrlCache = cvUrl;
            nrInfo = true;
        }

        const H = 480;
        // 倍率 n 直接乘 r 再除以 H；n 为整数时 n*r 在安全整数范围内是精确的
        const o = n => n * r / H;
        let o3 = o(3), o5 = o(5), o10 = o(10), o12 = o(12), o15 = o(15),
            o20 = o(20), o21p5 = o(21.5), o25 = o(25), o30 = o(30), o30p5 = o(30.5),
            o35 = o(35), o45 = o(45), o55 = o(55), o60 = o(60), o105 = o(105),
            o150 = o(150), o480 = r;
        let edgeM = o20 /*内容与窗口边缘的统一留白*/
        , cvR = (thePiPWindow&&thePiPWindow.height)
            ? o480*readCfg.coverCornerRadius/thePiPWindow.height
            : o12
        , txtMgL = edgeM + cvSizeX + o10
        cC.textAlign = "left";

        cC.clearRect(0, cvSizeY+edgeM+o3, c.width, c.height);
        
        let lrcFS = o55, lrcMgT = o45, lrcMgL = edgeM, lrcMgR = edgeM, mLrcMgL = lrcMgL
        , lrcTop = cvSizeY+edgeM+lrcMgT
        , lrcSSS = readCfg.lyricsTaperOff;
        let lrcLine = [lrcTop+lrcFS, lrcTop+lrcFS*2+o3*3, lrcTop+lrcFS*3+o3*4, lrcTop+lrcFS*4+o3*5]
        function lyricStyle(line=0, isT=false, isU/*Unplayed*/=false) {
            if (!isT) {
                switch (line) {
                    case 0: if (!isU) cC.fillStyle = color.text;
                            else cC.fillStyle = color.textT50;
                            cC.font = `${oLFW} ${lrcFS}px ${fM}`; return;
                    case 1: cC.fillStyle = color.textT60, cC.font = `${oLFW} ${lrcFS-o10}px ${fM}`; return;
                    case 2: cC.fillStyle = color.textT60, cC.font = `${oLFW} ${lrcFS-(lrcSSS?o15:o10)}px ${fM}`; return;
                    case 3: default: cC.fillStyle = color.textT60, cC.font = `${oLFW} ${lrcFS-(lrcSSS?o20:o10)}px ${fM}`; return;
                }
            } else {
                switch (line) {
                    case 0: cC.fillStyle = color.textT60, cC.font = `${tLFW} ${lrcFS-o5}px ${fT}`; return;
                    case 1: cC.fillStyle = color.textT40, cC.font = `${tLFW} ${lrcFS-o15}px ${fT}`; return;
                    case 2: cC.fillStyle = color.textT40, cC.font = `${tLFW} ${lrcFS-(lrcSSS?o20:o15)}px ${fT}`; return;
                    case 3: default: cC.fillStyle = color.textT40, cC.font = `${tLFW} ${lrcFS-(lrcSSS?o25:o15)}px ${fT}`; return;
                }
            }
        }
        function updateMLrcMgL(w, now) { //w是歌词行宽度，now是当前歌词行已播放百分比(动态歌词传入)
            if (!readCfg.autoScroll) return
            let lrcAreaW = c.width-lrcMgL-lrcMgR
            if (w<=lrcAreaW) mLrcMgL = lrcMgL
            else {
                nrNextTick = true
                let start = lyrics.currentStartT, d = lyrics.currentD, p = progress
                if (now === undefined) {
                    if (start>p || !(d>0)) now = 0
                    else {
                        now = (p-start)/d
                        now = now>1?1:now
                    }
                }
                let lrcMgLOffset = w*now-lrcAreaW+o150 // o150 是当前播放位置与右边缘的距离
                mLrcMgL = lrcMgL-(lrcMgLOffset>0?lrcMgLOffset:0)
            }
        }
        
        /*歌词先画到自带透明通道的离屏图层上(主画布是alpha:false，不能直接当透明图层来读取)，画完再贴回主画布*/
        let lrcY = Math.floor(lrcTop), lrcH = Math.ceil(c.height - lrcY), lrcW = c.width
        , lrcLayerOK = lrcH > 0 && lrcW > 0
        , realCC = cC
        , mkLrcC = (cv)=>{if (!cv) {cv = cE("canvas")} if (cv.width!=lrcW||cv.height!=lrcH) {cv.width = lrcW; cv.height = lrcH} return cv};
        if (lrcLayerOK) {
            lrcCurC = mkLrcC(lrcCurC);
            let layerCC = lrcCurC.getContext("2d");
            layerCC.setTransform(1, 0, 0, 1, 0, 0);
            layerCC.clearRect(0, 0, lrcW, lrcH);
            layerCC.translate(0, -lrcY); /*图层坐标和主画布保持一致，歌词绘制代码不用改*/
            layerCC.textAlign = "left";
            cC = layerCC;
        }
        try {
            isDynamicLyrics = false
            if (Array.isArray(lyrics.M[0])) {
                isDynamicLyrics = true
                let lyricDO = ""/*lyricDynamicOrigin*/, l = lyrics.M[0].length, now = 0, nowWidth = 0
                lyricDO = lyrics.M[0].map(item => item.word).join("");
                lyricStyle(0, false, true);
                for (let i=0; i<l; i++) {
                    let lrc = lyrics.M[0][i], Cnow = (progress-lrc.time)/lrc.duration
                    Cnow = lrc.time>progress ? 0 : Cnow>1?1:Cnow
                    nowWidth += cC.measureText(lrc.word).width*Cnow
                }
                let w = cC.measureText(lyricDO).width
                now = nowWidth/w
                updateMLrcMgL(w, now);
                nrNextTick = true
                cC.fillText(lyricDO, mLrcMgL, lrcLine[0]); /*主歌词(未播放)*/
                lyricStyle(); cC.save();
                cC.beginPath();
                cC.rect(0, 0, w*now+mLrcMgL, c.height); cC.clip();
                cC.fillText(lyricDO, mLrcMgL, lrcLine[0]); /*主歌词(已播放)*/
                cC.restore();
            } else if (readCfg.lyricsFrom!="OriginalLyricBar") {
                lyricStyle();
                updateMLrcMgL(cC.measureText(lyrics.M[0]).width);
                cC.fillText(lyrics.M[0], mLrcMgL, lrcLine[0]); /*主歌词*/
            } else {
                lyricStyle(); cC.fillText(lyrics.M[0], lrcMgL, lrcLine[0]); /*主歌词*/
            }
        
            /*function drawLyrics(isT, realLine, showLine) {
                lyricStyle(realLine, isT); cC.fillText(isT?lyrics.T[realLine]:lyrics.M[realLine], lrcMgL, lrcLine[showLine]-isT?o10:0);
            }*/
        
        if (lyrics.T[0]!="") {
            lyricStyle(0, true);
            if (readCfg.lyricsFrom!="OriginalLyricBar") {
                updateMLrcMgL(cC.measureText(lyrics.T[0]).width);
            }
            cC.fillText(lyrics.T[0], mLrcMgL, lrcLine[1]-o5); /*歌词翻译*/
            lyricStyle(1); cC.fillText(lyrics.M[1], lrcMgL, lrcLine[2]); /*下1句主歌词*/
            if (lyrics.T[1]!="") {
                lyricStyle(1, true); cC.fillText(lyrics.T[1], lrcMgL, lrcLine[3]-o10); /*下1句歌词翻译*/
                lyricStyle(2); cC.fillText(lyrics.M[2], lrcMgL, lrcLine[4]); /*下2句主歌词*/
            } else {
                lyricStyle(2); cC.fillText(lyrics.M[2], lrcMgL, lrcLine[3]); /*下2句主歌词*/
                if (lyrics.T[2]!="") {
                    lyricStyle(2, true); cC.fillText(lyrics.T[2], lrcMgL, lrcLine[4]-o10); /*下2句歌词翻译*/
                } else {
                    lyricStyle(3); cC.fillText(lyrics.M[3], lrcMgL, lrcLine[4]); /*下3句主歌词*/
                }
            }
        } else {
            lyricStyle(1); cC.fillText(lyrics.M[1], lrcMgL, lrcLine[1]); /*下1句主歌词*/
            if (lyrics.T[1]!="") {
                lyricStyle(1, true); cC.fillText(lyrics.T[1], lrcMgL, lrcLine[2]-o10); /*下1句歌词翻译*/
                lyricStyle(2); cC.fillText(lyrics.M[2], lrcMgL, lrcLine[3]); /*下2句主歌词*/
                if (lyrics.T[2]!="") {
                    lyricStyle(2, true); cC.fillText(lyrics.T[2], lrcMgL, lrcLine[4]-o10); /*下2句歌词翻译*/
                } else {
                    lyricStyle(3); cC.fillText(lyrics.M[3], lrcMgL, lrcLine[4]); /*下3句主歌词*/
                }
            } else {
                lyricStyle(2); cC.fillText(lyrics.M[2], lrcMgL, lrcLine[2]); /*下2句主歌词*/
                if (lyrics.T[2]!="") {
                    lyricStyle(2, true); cC.fillText(lyrics.T[2], lrcMgL, lrcLine[3]-o10); /*下2句歌词翻译*/
                    lyricStyle(3); cC.fillText(lyrics.M[3], lrcMgL, lrcLine[4]); /*下3句主歌词*/
                } else {
                    lyricStyle(3); cC.fillText(lyrics.M[3], lrcMgL, lrcLine[3]); /*下3句主歌词*/
                    if (lyrics.T[3]!="") {
                        lyricStyle(3, true); cC.fillText(lyrics.T[3], lrcMgL, lrcLine[4]-o10); /*下3句歌词翻译*/
                    }
                }
            }
        }

        } finally {cC = realCC} /*无论歌词绘制是否出错，都必须切回主画布*/

        /*歌词换行过渡：新歌词整块(不透明)上滑到位；只有"刚离开的那一句"上滑并淡出。
          先于遮罩执行，遮罩在合成之后再盖，位置固定不动*/
        if (lrcLayerOK) {
            let layer = lrcCurC, animating = false, tracking = readCfg.lyricsTransition && !lrcNowLoading;
            // 提前量：换行前 500ms 开始持续请求重绘，确保换行帧被立即重绘
            if (progress > lyrics.currentStartT + lyrics.currentD - 500) nrNextTick = true
            if (tracking) {
                let lrcKey = songIdCache+"|"+lyrics.currentStartT
                , dy = Math.round((lyrics.T[0]!=""?lrcLine[2]:lrcLine[1]) - lrcLine[0])
                , sizeOK = lrcPrevC && lrcPrevC.width==lrcW && lrcPrevC.height==lrcH;
                if (lrcLastKey!==undefined && lrcLastKey!=lrcKey && sizeOK && lrcLastDy>0) {
                    lrcOldC = mkLrcC(lrcOldC);
                    let oldCC = lrcOldC.getContext("2d");
                    oldCC.setTransform(1, 0, 0, 1, 0, 0);
                    oldCC.clearRect(0, 0, lrcW, lrcH);
                    oldCC.drawImage(lrcPrevC, 0, 0); /*上一帧的纯歌词图层 = 旧歌词*/
                    lrcAnimStart = performance.now(); lrcAnimDy = lrcLastDy;
                }
                let t = (performance.now() - lrcAnimStart) / 350;
                if (lrcOldC && lrcAnimStart && t < 1 && lrcOldC.width==lrcW && lrcOldC.height==lrcH) {
                    animating = true;
                    let e = 1 - Math.pow(1 - t, 3) /*easeOutCubic*/
                    , bandH = Math.min(lrcH, Math.round(lrcAnimDy + o3)); /*旧歌词里"刚离开的那一句"所在的高度*/
                    cC.save();
                    cC.beginPath(); cC.rect(0, lrcY, lrcW, lrcH); cC.clip();
                    cC.drawImage(layer, 0, lrcY + Math.round(lrcAnimDy*(1-e))); /*新歌词整块，不透明*/
                    cC.globalAlpha = 1 - e;
                    cC.drawImage(lrcOldC, 0, 0, lrcW, bandH, 0, lrcY - Math.round(lrcAnimDy*e), lrcW, bandH); /*离开的那一句*/
                    cC.restore();
                    nrNextTick = true
                }
                lrcLastKey = lrcKey; lrcLastDy = dy;
            } else {lrcLastKey = undefined}
            if (!animating) {cC.drawImage(layer, 0, lrcY)} /*没有过渡时，直接把歌词图层贴回主画布*/
            if (tracking) {let spare = lrcPrevC; lrcPrevC = layer; lrcCurC = spare} /*本帧图层留作"上一帧"，旧的那张留给下一帧重复使用(两张来回换，不反复新建画布)*/
        }

        if (readCfg.lyricsMask) {
            let lrcMask = cC.createLinearGradient(0, lrcTop, 0, c.height*1.3);
            lrcMask.addColorStop(.1, color.bgT00); //不能用#0000或者#FFF0等，会影响渐变的渲染效果
            lrcMask.addColorStop(1, color.bg);
            cC.fillStyle = lrcMask;
            cC.fillRect(0, lrcTop, c.width, c.height); /*歌词阴影遮罩*/
        }
    
        cC.font = `${gFW} ${o30}px ${f}`;
        cC.fillStyle = color.textT60;
        let tW = cC.measureText(t).width
        cC.fillText(t, edgeM, cvSizeY+edgeM+o35); /*时间*/
    
        let pbMgT = cvSizeY+edgeM+o21p5, pbMgL = edgeM+tW+o30p5
        cC.fillStyle = color.textT20;
        cC.fillRect(pbMgL, pbMgT, c.width-edgeM-pbMgL, o5); /*进度条背景*/
        cC.fillStyle = color.accent;
        cC.fillRect(pbMgL, pbMgT, (c.width-edgeM-pbMgL)*tP, o5); /*进度条*/
    
        /*背景*/
        if (readCfg.backgroundFrom == "AMLL"&&loadedPlugins["Apple-Musiclike-lyrics"]) {
            nrNextTick = true
            let amllbgc = q(".amll-background-render-wrapper canvas")
            if (amllbgc) {
                if (!amllbgv) {
                    amllbgv = cE("video")
                    amllbgv.srcObject = amllbgc.captureStream()
                    amllbgv.controls = true; //调试用
                }
                amllbgv.play()
                bgcC.drawImage(amllbgv, 0, 0, bgc.width, bgc.height);
            } else {
                let amllbgE = q("#amll-view > :first-child:not(.lyric-player-horizonal)"), amllbg
                amllbgE = amllbgE || q("#amll-view")
                amllbgE ?
                    amllbg = getComputedStyle(amllbgE).getPropertyValue("background-color")
                    : amllbg = color.bg;
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
        cC.drawImage(bgc, 0, 0, c.width, c.height);
        cC.globalCompositeOperation = "source-over";
    
        function drawRC() {
            let cx = edgeM, cy = edgeM, w = cvSizeX, h = cvSizeY, rad = Math.max(0, Math.min(cvR, w/2, h/2));
            cC.globalCompositeOperation = "destination-out";
            cC.beginPath();
            cC.fillStyle = "#000";
            cC.rect(0, 0, cx+w+o3, cy+h+o5); /*外框(大一圈，保证边缘擦干净，特别是动态背景下)*/
            /*封面圆角(四角)：外框减去圆角矩形，只擦掉四个角*/
            cC.moveTo(cx+rad, cy);
            cC.arcTo(cx+w, cy, cx+w, cy+h, rad);
            cC.arcTo(cx+w, cy+h, cx, cy+h, rad);
            cC.arcTo(cx, cy+h, cx, cy, rad);
            cC.arcTo(cx, cy, cx+w, cy, rad);
            cC.closePath();
            cC.fill("evenodd");
            cC.globalCompositeOperation = "source-over";
        }
        function drawInfo() {
            /*if (readCfg.showIconBarBeforeInfo) {...}*/
            cC.drawImage(bgc, edgeM+cvSizeX, 0, c.width, edgeM+cvSizeY+o5, edgeM+cvSizeX, 0, c.width, edgeM+cvSizeY+o5); /*清除*/
            cC.fillStyle = color.text; cC.font = `${gFW} ${o55}px ${f}`;
            cC.fillText(song.name, txtMgL, o55+edgeM); /*主名*/
            cC.fillStyle = color.textT40; cC.font = `${gFW} ${o35}px ${f}`;
            cC.fillText(song.nameAnother, txtMgL, o105+edgeM); /*副名*/
            cC.fillStyle = color.textT60;
            cC.fillText(song.artist, txtMgL, song.nameAnother==""?o105+edgeM:o150+edgeM); /*歌手*/
        }
        if (nrInfo) {
            if (!cvDrawn) { /*封面框里已经画过封面就不再画占位文字，否则会盖在刚画好的封面上*/
                cC.fillStyle = color.text; cC.font = `${gFW} ${o25}px ${f}`; cC.fillText(curLdTxt ?? cfgDefault.customLoadingTxt, edgeM+o5, edgeM+o30); /*封面(加载)*/
            }
            cover.onload = ()=>{/*封面(完毕)*/
                let isCoverEmpty = (!cvUrl||cover.src==DcvUrl)
                if (isCoverEmpty) cvSizeX = o5
                if (!isCoverEmpty&&readCfg.allowNonsquareCover) {cvSizeX = cover.width*(cvSizeY/cover.height)}
                txtMgL=edgeM+cvSizeX+o10
                readCfg.colorFrom=="albumCover"? colorPick(cover?cover:null) : colorPick()
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
                drawInfo();
                if (!isCoverEmpty) {
                    cC.drawImage(cover, edgeM, edgeM, cvSizeX, cvSizeY);drawRC();
                    if(showRefreshing){console.log(`PiPW Log: 歌曲封面绘制完成`)}
                } else if (readCfg.showDiscWhenNoCover) {
                    let disc = new Image();
                    disc.src = discUrl;
                    disc.onload = () => {
                        cC.drawImage(disc, edgeM, edgeM, cvSizeX, cvSizeY);drawRC();
                        if(showRefreshing){console.log(`PiPW Log: 唱片绘制完成`)}
                        disc = null //处理
                    };
                }
                cvDrawn = true
                loadPiP() //解决首次打开黑窗问题(及其他小问题)的关键
            }
            cover.onerror = ()=>{/*封面(失败)*/
                cover.src = OcvUrl?OcvUrl:DcvUrl
                loadPiP()
            }
        }
    
        if (isToPiP && !PiPE) {
            c.toPiP();
            nrHead=true;
        }
        let timeUsing = Date.now() - startTime;
        if(showRefreshing){console.log(`PiPW Log: <canvas>重绘完成，重绘用时${timeUsing==0?"<1":timeUsing}ms，当前分辨率${c.width}x${c.height}, 请求来自${from}`)}
    } catch (e) {
        console.error("PiPW Error: <canvas>绘制出错，详情：\n", e);tipMsg("&lt;canvas&gt;绘制出错，详见JavaScript控制台", "err")
    }
}

plugin.onAllPluginsLoaded(()=>{load()});
function load() {B();C();D();E();F()
    legacyNativeCmder.appendRegisterCall("PlayProgress", "audioplayer", (_, p) => {
        playProgress = p*1000; let pZ = Math.floor(p)
        if (pZ>tC||p<tC) {tC = p; loadPiP(false, "PlayProgress")}
        else if (readCfg.smoothProgessBar) {tC = p; loadPiP(false, "PlayProgress - SmoothProgessBar")}
        else if (nrNextTick) {
            nrNextTick = false; loadPiP(false, "PlayProgress - AnimationNextTick");
        }
        else if (readCfg.backgroundFrom=="AMLL" && loadedPlugins["Apple-Musiclike-lyrics"]) loadPiP(false, "PlayProgress - AMLLBackgroundUpdate")
    }); //requestAnimationFrame或setInterval会在网易云最小化后被优化，导致1FPS的感人帧率
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
    async function D() { //监听设置按钮点击事件
        await betterncm.utils.waitForElement(`[data-plugin-slug="PiPWindow"]`);
        q(`[data-plugin-slug="PiPWindow"]`).addEventListener("click", ()=>{
            setTimeout(()=>{
                readCfg.colorFrom=="albumCover"? colorPick(cover?cover:null) : colorPick()
            }, 200)
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
        if (!b) {b = cE("div")}
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
            let key, dfSet = cfgDefault[`${a[i]}`]
            switch (typeof dfSet) {
                case "number":
                    let n = q(`#${a[i]}SetBox`, cP)
                    if (n) {
                        let set = n.value*1;
                        if (typeof set != "number" || set == "") {set = dfSet; n.value = set}
                        else {
                            if (n.validity.rangeOverflow) {
                                set = n.max; n.value = n.max
                            } else if (n.validity.rangeUnderflow) {
                                set = n.min; n.value = n.min
                            }
                        }
                        key = set;
                    }
                    break;
                case "string":
                    let str = q(`#${a[i]}SetBox`, cP), radios = qAll(`[name=${a[i]}]`, cP)
                    if (radios.length!=0) {
                        for (let i = 0; i < radios.length; i++) {
                            if (radios[i].checked) {
                                key = radios[i].value;
                            }
                        }
                    } else if (str) {
                        let set = str.value;
                        if (set == "undefined" || set == "null" || set == "") {set = dfSet; str.value = set}
                        key = set;
                    }
                    break;
                case "boolean":
                    let swc = q(`#${a[i]}Switch`, cP), ckBox = q(`#${a[i]}CheckBox`, cP)
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
    oldCfg.showTaskbarButton==readCfg.showTaskbarButton?"":taskbarButton(readCfg.showTaskbarButton) //特殊处理
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
                    let str = q(`#${a[i]}SetBox`, cP), radios = qAll(`[name=${a[i]}]`, cP)
                    if (radios.length!=0) {
                        for (let i = 0; i < radios.length; i++) {
                            if (radios[i].value == key) {
                                radios[i].checked = true
                            }
                        }
                    } else if (str) {
                        str.value = key;
                    }
                    break;
                case "number":
                    q(`#${a[i]}SetBox`, cP).value = key
                    break;
                case "boolean":
                    let swc = q(`#${a[i]}Switch`, cP), ckBox = q(`#${a[i]}CheckBox`, cP)
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
    if (!cP) {cP = cE("div")}
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
        width: fit-content;
        padding: 2px;
        margin: 6px 0 4px;
        font-size: 20px;
        font-weight: bold;
        box-shadow: inset 0 -9px 3px -6px var(--pipws-fg);
    }
    #PiPWSettings .item {
        display: inline-table;
        margin-right: 5px;
    }
    #PiPWSettings .tipText {
        line-height: 12px;
        font-size: 12px;
    }

    #PiPWSettings .button {
        color: var(--md-accent-color-secondary, var(--ncm-text)) !important;
        font-size: 16px;
        width: 90px;
        height: 40px;
        box-shadow: 0 0 3px var(--pipws-fg);
        border: 1px solid var(--pipws-fg);
        border-radius: 10px;
        background: var(--pipws-bg);
        backdrop-filter: blur(12px);
        transition: .1s;
    }
    #PiPWSettings input.button {
        line-height: 0;
        outline: 0;
    }
    #PiPWSettings div.button {
        line-height: 38px;
        text-align: center;
    }
    #PiPWSettings .button:hover {
        box-shadow: 0 0 6px var(--pipws-fg);
    }
    #PiPWSettings .button:active {
        font-size: 14px;
        border-width: 4px;
        box-shadow: 0 0 8px var(--pipws-fg);
    }
    #PiPWSettings div.button:active {
        line-height: 32px;
        text-align: center;
    }
    #PiPWSettings .part .button {
        backdrop-filter: none;
    }
    #PiPWSettings div.button.dynamicColor {
        box-shadow: 0 0 4px var(--current-color);
        border: 1px solid var(--current-color);
        background: var(--current-color);
        backdrop-filter: none;
    }
    #PiPWSettings div.button.dynamicColor:hover {
        box-shadow: 0 0 8px var(--current-color);
    }
    #PiPWSettings div.button.dynamicColor:active {
        line-height: 38px;
        font-size: 13px;
        border-width: 2px;
        box-shadow: 0 0 12px 1px var(--current-color);
    }
    #PiPWSettings div.button.dynamicColor p {
        filter: invert(80%);
        color: var(--current-color);
        text-shadow: 0 0 1px var(--current-color);
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
    #PiPWSettings [type=color] {
        width: 0;
        height: 0;
        position: absolute;
        opacity: 0;
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
    #PiPWSettings .item .radio {
        margin-right: 30px;
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
    <p> 2026</p>
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
    <p>也可以单击小窗后敲击 空格来控制▶️播放⏸️暂停</p>
    <p>↗返回和x关闭的效果可在下方自定义</p>
    <p>还有大量自定义选项…</p>
</div>
<div class="part noAutoBr">
    <p class="partTitle">自定义设置</p>
    <p>注: 启用带*的选项可能会出现卡顿</p>
    <input id="resetButton-All" class="link" type="button" value="恢复默认" />
    <br />
    <div class="subPart">
        <div class="subTitle"><p>行为</p></div>
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
        <br />
        <label class="switch">
            <input id="showTaskbarButtonSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>显示任务栏图标 (通过PowerShell, 显示/隐藏可能有延迟)</p>
    </div>
    <div class="subPart">
        <div class="subTitle"><p>信息</p></div>
        <label class="switch">
            <input id="useCloudDataForLocalFileSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>对本地文件使用云端歌曲信息 (而非文件内写入的信息)</p>
        <br />
        <label class="switch">
            <input id="showDiscWhenNoCoverSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>无封面时在封面位置显示唱片</p>
        <br />
        <label class="switch">
            <input id="allowNonsquareCoverSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>尝试适配非正方形封面</p><p class="tipText"> !这会强制下载封面原图 <a title='如果要下载缩略图，就要指定确切分辨率，这样将无法获取原始图片的宽高比'>为什么?</a></p>
        <br />
        <p>歌曲信息第二行显示</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="trackInfoShow" value="auto" />
                <span class="slider button"></span>
            </label>
            <p>自动 <a title='翻译优先，无翻译再显示所属专辑'>?</a></p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="trackInfoShow" value="album" />
                <span class="slider button"></span>
            </label>
            <p>所属专辑</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="trackInfoShow" value="translation" />
                <span class="slider button"></span>
            </label>
            <p>曲名翻译</p>
        </div>
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
        <div class="subTitle"><p>歌词</p></div>
        <p>副歌词显示</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricLine2Show" value="none" />
                <span class="slider button"></span>
            </label>
            <p>无</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricLine2Show" value="auto" />
                <span class="slider button"></span>
            </label>
            <p>自动 <a title='翻译优先，无翻译再显示拉丁化歌词，类似桌面歌词的做法'>?</a></p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricLine2Show" value="translation" />
                <span class="slider button"></span>
            </label>
            <p>翻译歌词</p>
        </div>
        <div class="item">
            <label class="radio">
                <input type="radio" name="lyricLine2Show" value="latinization" />
                <span class="slider button"></span>
            </label>
            <p>拉丁化歌词 <a title='粤语拼音/闽南拼音/日语罗马字等'>?</a></p>
        </div>
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
        <label class="switch">
            <input id="lyricsTransitionSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>歌词换行过渡动画*</p>
        <br />
        <div class="tipText" style="color:#F33;${loadedPlugins.LibOpenCC?"display:none":""}"><p>v 缺失依赖: LibOpenCC 请前往插件市场下载 <a title='鼠标移至插件市场最底部的空白处，打开「开发者选项」，然后打开「显示"依赖库"分类」，回到顶部，选择「依赖库」'>找不到?</a></p></div>
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
        <div class="subTitle"><p>外观</p></div>
        <p>配色来源</p>
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
        <div class="item">
            <label class="radio">
                <input type="radio" name="colorFrom" value="custom" />
                <span class="slider button"></span>
            </label>
            <p>自定义</p>
        </div>
        <br />
        <p>自定义配色</p>
        <div style="height: 42px">
            <div class="item">
                <label style="--current-color: ${readCfg.colorCustom_text}">
                    <div class="button dynamicColor">
                        <p>文字</p>
                    </div>
                    <input id="colorCustom_textSetBox" type="color" value="${readCfg.colorCustom_text}">
                </label>
            </div>
            <div class="item">
                <label style="--current-color: ${readCfg.colorCustom_bg}">
                    <div class="button dynamicColor">
                        <p>背景</p>
                    </div>
                    <input id="colorCustom_bgSetBox" type="color" value="${readCfg.colorCustom_bg}">
                </label>
            </div>
            <div class="item">
                <label style="--current-color: ${readCfg.colorCustom_accent}">
                    <div class="button dynamicColor">
                        <p>进度条</p>
                    </div>
                    <input id="colorCustom_accentSetBox" type="color" value="${readCfg.colorCustom_accent}">
                </label>
            </div>
        </div>
        <p>背景</p>
        <br />
        <div class="item">
            <label class="radio">
                <input type="radio" name="backgroundFrom" value="themeBackgroundColor" />
                <span class="slider button"></span>
            </label>
            <p>纯色</p>
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
        <div class="item">
            <p>全局字重 <a title='范围为1~1000，400相当于正常大小，700相当于加粗，具体显示效果取决于字体'>?</a></p>
            <br />
            <input class="button textBox" id="generalFontWeightSetBox" type="number" step="100" min="0" max="1000" placeholder='${cfgDefault.generalFontWeight}'
            value="${readCfg.generalFontWeight}" />
        </div>
        <div class="item">
            <p>原歌词字重</p>
            <br />
            <input class="button textBox" id="originalLyricsFontWeightSetBox" type="number" step="100" min="0" max="1000" placeholder='${cfgDefault.originalLyricsFontWeight}'
            value="${readCfg.originalLyricsFontWeight}" />
        </div>
        <div class="item">
            <p>副歌词字重</p>
            <br />
            <input class="button textBox" id="translatedLyricsFontWeightSetBox" type="number" step="100" min="0" max="1000" placeholder='${cfgDefault.translatedLyricsFontWeight}'
            value="${readCfg.translatedLyricsFontWeight}" />
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
        <p>封面圆角大小</p>
        <br />
        <input class="button textBox" id="coverCornerRadiusSetBox" type="number" step="1" placeholder='${cfgDefault.coverCornerRadius}'
            value="${readCfg.coverCornerRadius}" />
        <p>px</p>
    </div>
    <div class="subPart">
        <div class="subTitle"><p>渲染 (高级)</p></div>
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
                <input type="radio" name="aspectRatio" value="4:3" />
                <span class="slider button"></span>
            </label>
            <p>4:3</p>
        </div>
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
        <br />
        <p>封面分辨率 (建议不要频繁修改; 对本地缓存或文件无效)</p>
        <br />
        <input class="button textBox" id="albumCoverSizeSetBox" type="number" step="1" placeholder='${cfgDefault.albumCoverSize}'
            value="${readCfg.albumCoverSize}" />
        <p>p</p>
        <label class="switch">
            <input id="useFullCoverSwitch" type="checkbox" />
            <span class="slider button"></span>
        </label>
        <p>原图</p>
    </div>
    <div class="subPart">
        <div class="subTitle"><p>杂项</p></div>
        <p>加载时显示的文本 (用 | 分隔多条,将随机显示其中一条)</p>
        <br />
        <input class="button textBox" id="customLoadingTxtSetBox" type="search" placeholder='${cfgDefault.customLoadingTxt}'
            value="${readCfg.customLoadingTxt.replaceAll("\"", "&quot;" )}" />
        <br />
        <input class="button" style="position: absolute; transform: translate(325px, -40px);" id="applyButton-customLoadingTxt" type="button" value="应用" />
    </div>
</div>
<div class="part">
    <p class="partTitle">关于BUG…</p>
    <p>实在没有办法在暂停时区分关闭和返回按钮……因此做了一个折中方案</p>
    <p>控制按钮在暂停时并不会显示，但是仍然可以空格播放和暂停（到底为什么会自动消失啊??）</p>
    <p>某些情况下选择自适应分辨率，小窗可能会出现色差</p>
    <p>某些情况下小窗右侧可能会渲染出一个绿条</p>
    <p>播放过MV后有概率无法通过小窗开始播放</p>
    <br />
    <p>以及你有没有发现拖动右边缘/下边缘调整大小后，下次打开小窗时并没有记住上次调整的大小……</p>
    <p>可能有点抽象，但这会导致：选择自适应分辨率后，没法成功通过右/下边缘调整大小</p>
    <p>原因未知。</p>
    <br />
    <p>有反馈说有窗口比例错误（出现黑边）及调整大小时"瞬移"到其他位置的情况出现</p>
    <p>这些情况比较难排查，作者已放弃挣扎</p>
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
    <p style="user-select: text">也可在控制台使用 PiPWShowRefreshing() 来手动开关&lt;canvas&gt;重绘情况跟踪</p>
</div>
<br /><br />
    `;
    let cfgDfKeys = Object.keys(cfgDefault)
    for (let i = 0; i < cfgDfKeys.length; i++) {
        let keyName = cfgDfKeys[i], key = readCfg[keyName]
        if (key == void 0 || key == null) {key = cfgDefault[keyName]}
        switch (typeof key) {
            case "number":
                let n = q(`#${keyName}SetBox`, cP)
                if (n) {
                    n.addEventListener("change", ()=>{saveCfg(keyName)});
                    n.addEventListener("keydown", e=>{if(e.key=="Enter"){saveCfg(keyName)}});
                }
                break;
            case "string":
                let str = q(`#${keyName}SetBox`, cP), radios = qAll(`[name=${keyName}]`, cP)
                if (radios.length!=0) {
                    for (let i = 0; i < radios.length; i++) {
                        if (radios[i].value ==  key) {radios[i].checked = true}
                        radios[i].addEventListener("change", ()=>{saveCfg(keyName)})
                    }
                } else if (str) {
                    if (str.type == "color") {
                    str.addEventListener("change", e=>{
                        saveCfg(keyName)
                        e.target.parentElement.style.setProperty("--current-color", e.target.value);
                    });}
                    else if (str.tagName != "TEXTAREA") {str.addEventListener("keydown", e=>{if(e.key=="Enter"){saveCfg(keyName)}});} //回车应用
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
    q("#resetButton-All", cP).addEventListener("click", ()=>{resetCfg()});
    let sTBS = q("#showTaskbarButtonSwitch", cP)
    sTBS.addEventListener("change", ()=>{sTBS.disabled=true;setTimeout(()=>{sTBS.disabled=false}, 3000)});
    q(`[name="resolutionRatio"][value="auto"]`, cP).addEventListener("click", ()=>{autoRatio=true;if(thePiPWindow){reRatio(thePiPWindow.height)}});
    q("#debugModeSwitch", cP).addEventListener("change", ()=>{debugMode=q("#debugModeSwitch").checked;if(debugMode){DEBUG();window.PiPWShowRefreshing()}});
    console.log(cP);
    return cP;
};