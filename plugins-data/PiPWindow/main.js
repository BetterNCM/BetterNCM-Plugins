let rvN, v, c, cover, cvUrlCache, accentC, textC, textCT13, textCT31, textCT56, textCT80, bgC, bgCTSetting, bgCCache, tMsT, playStateCache, showRefrshing, thePiPWindow
, isVLsnAdded=false, DontPlay=false, DontPause=false, autoRatio, autoRatioValue=480, lastReRatio=0, reRatioPending=false, debugMode=false
, pdd = "M21 3C21.5523 3 22 3.44772 22 4V11H20V5H4V19H10V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM21 13C21.5523 13 22 13.4477 22 14V20C22 20.5523 21.5523 21 21 21H13C12.4477 21 12 20.5523 12 20V14C12 13.4477 12.4477 13 13 13H21Z"
, pO = `<path d="${pdd}M20 15H14V19H20V15ZM6.70711 6.29289L8.95689 8.54289L11 6.5V12H5.5L7.54289 9.95689L5.29289 7.70711L6.70711 6.29289Z"></path>`
, pC = `<path d="${pdd}"></path>`
, readCfg = JSON.parse(localStorage.getItem("PiPWindowSettings"))
, cfgDefault = ({whenClose: "none", whenBack: "back", autoHideMainWindow: false, customFonts: "\"Microsoft Yahei UI\", system-ui", showAlbum: true, moreRedraws: false, resolutionRatio: "auto"})
readCfg = {...cfgDefault, ...readCfg} //缺失配置啥的处理一下
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
                function ncmPause() {DontPlay=false; if (!DontPause) {try{ q(`${pS} .btnp-pause`).click() }catch{}}}
                v.addEventListener("play", ()=>{DontPause=false; if (!DontPlay) {try{ q(`${pS} .btnp-play`).click() }catch{}}})
                v.addEventListener("pause", ()=>{ncmPause()})
                //小窗打开/关闭逻辑
                v.addEventListener("enterpictureinpicture", ()=>{ console.log("PiPW Log: PiP窗口已创建", v)
                    if (readCfg.autoHideMainWindow) {mwf.cef.R$call("winhelper.showWindow", "hide")}
                    tipMsg("已打开小窗"); q("#PiPW-Toggle svg").innerHTML=pC; q("#PiPW-Toggle").setAttribute("style", "fill: currentColor; opacity: 1");
                    if (player.playState=="stop"&&!q(".m-player:not(#main-player):not(.f-dn)")) {v.pause()} DontPlay=false
                });
                v.addEventListener("leavepictureinpicture", ()=>{ DontPause=true; let p = v.paused
                    tipMsg("已关闭小窗"); q("#PiPW-Toggle svg").innerHTML=pO; q("#PiPW-Toggle").setAttribute("style", "");
                    setTimeout(()=>{
                        if (v.paused!=p) { //状态不一致，判定为按下关闭按钮
                            let c = readCfg.whenClose;
                            if (c == "pause") {DontPause=false;ncmPause()}
                            else if (c == "shutdown") {
                                ncmPause(); if(debugMode){tipMsg("调试模式：触发退出云音乐");return}
                                mwf.cef.R$call("winhelper.showWindow", "hide"); mwf.cef.R$exit()
                            }
                        } else {
                            let b = readCfg.whenBack;
                            if (b == "back") {mwf.cef.R$call("winhelper.showWindow", "show")}
                        }
                    }, 10)
                });
                //主窗口暂停/播放同步到小窗
                let playStateCache = window.player.playState;
                Object.defineProperty(window.player, "playState", { //改写playState以监听播放状态变动
                    get: ()=>{return playStateCache},
                    set: (n)=>{playStateCache = n; if (n=="play") {DontPlay=true;v.play()} else if (n=="stop") {DontPause=true;v.pause()}}
                });
                isVLsnAdded = true
            } catch (e) {
                console.error("PiPW Error: PiP窗口创建出错，详情：\n", e);tipMsg("PiP窗口创建出错，详见JavaScript控制台", "err")
            }
        })
    }
    v.id = "PiPW-VideoE";
    v.srcObject = this.captureStream(); //刷新源
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
    let textCT00, bgCT00;
    function s(e, p) {
        return getComputedStyle(q(e)).getPropertyValue(p);
    }
    accentC = s("body", "--themeC1"), textC = s("body", "color");
    if (q("body.material-you-theme")) {textC = s("body", "--md-accent-color-secondary")}
    if (/rgba/.test(textC)) {textCT00 = textC.replace(/,([^,)]*)\)/, "")}
    else {textCT00 = textC.replace(/rgb\(/, "rgba(").replace(/\)/, "")}
    textC = `${textCT00})`; textCT80 = `${textCT00}, .8)`; textCT56 = `${textCT00}, .56)`; textCT31 = `${textCT00}, .31)`; textCT13 = `${textCT00}, .13)`;
    bgC = s("body", "background-color");
    if (/rgba/.test(bgC)) {bgCT00 = bgC.replace(/,([^,)]*)\)/, "")}
    else {bgCT00 = bgC.replace(/rgb\(/, "rgba(").replace(/\)/, "")}
    bgC = `${bgCT00})`; bgCTSetting = `${bgCT00}, .3)`;
    if (q("body.material-you-theme")) {bgCTSetting = `${accentC.replace(/\)/, "")}, .1)`;}
    if (bgC != bgCCache) {bgCCache=bgC;return"reCv"}
    try {q("#PiPWSettingsStyle0").innerHTML=`
#PiPWSettings {
    --pipws-fg: ${accentC};
    --pipws-bg: ${bgCTSetting};
    --pipws-bg-wot: ${bgC};
    color: ${textC};
    line-height: 24px;
    font-size: 16px;
}`} catch {}
}

async function loadPiP(isToPiP=true, from="unknow") {
    let PiPE = document.pictureInPictureElement;
    if (!isToPiP && !PiPE && !debugMode) {return}
    if (PiPE && PiPE.id != "PiPW-VideoE") {tipMsg("PiP窗口被占用", "err"); if(!debugMode){return}}
    try {
        /*分辨率*/
        let r = readCfg.resolutionRatio
        if (r=="auto") {autoRatio=true; r=autoRatioValue} else {autoRatio=false; r=r*1}
    
        let pS = betterncm.ncm.getPlayingSong(), data;
        if (pS) {data = pS.data}
    
        /*封面*/
        let nlCv = false, cvSize = r/3, cvUrl, thbn= `thumbnail=160y160`; //写死
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
        if (cvUrl != cvUrlCache) {reloadCover()}
    
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
    
        /*时间*/
        let t = "0:00／0:00", tC = 0, tT = 0, tP = 0, tR = 0
        getTime();
        function getTime() {
            try {
                try {
                    t = q(".m-player:not(.f-dn) .time-indicator-container").textContent.replace(/ \/ /, "／")
                }catch{try{
                    if (JSON.parse(localStorage.getItem("refined-now-playing-refined-control-bar"))) {
                        t = `${q("#rnp-time-passed").textContent}／${q("#rnp-time-rest").textContent}`
                    } else {yu.ki.mu.ra;a.o.i}
                }catch{
                    t = `${q(".m-player:not(.f-dn) time.now").textContent.replace(/^(?!0:)(0)/, "")}／${q(".m-player:not(.f-dn) time.all").textContent.replace(/^(?!0:)(0)/, "")}`
                }}
                let t2 = t.split("／"), t20 = t2[0].split(":"), t21 = t2[1].split(":")
                tC = parseInt(t20[0])*60+parseInt(t20[1])
                if (/^-/.test(t21[0])) {tR=parseInt(t21[0].replace(/^-/, ""))*60+parseInt(t21[1]); tT=tR+tC}
                else {tT=parseInt(t21[0])*60+parseInt(t21[1]); tR=tT-tC}
                tP = tC/tT
            }catch{}
        }
    
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
        };
        getLrc();
        function getLrc() {
            if (q(".m-pinfo [data-log-type='dj']")) {return}
            let l = ".rnp-lyrics-line", o = `${l}-original`, k = `${l}-karaoke`, t = `${l}-translated`
            if (q(".rnp-lyrics-line")) {
                for (i = 0; i <= 4; i++) {
                    try {
                        try {
                            lyrics[`M${i}`] = q(`${l}[offset='${i}'] ${o}`).textContent;
                        } catch {
                            lyrics[`M${i}`] = q(`${l}[offset='${i}'] ${k}`).textContent;
                        }
                        try {lyrics[`T${i}`] = q(`${l}[offset='${i}'] ${t}`).textContent}catch{}
                    } catch {
                        if (q(`${l}.rnp-interlude[offset='${i}']`)) {
                            lyrics[`M${i}`] = "· · ·";
                            lyrics[`T${i}`] = "";
                        }
                        if (i == 0 && !q(`${l}[offset='0']`) && q(`${l}[offset='-1']`)) {
                            try {
                                lyrics[`M${i}`] = q(`${l}[offset='-1'] ${o}`).textContent;
                            } catch {
                                lyrics[`M${i}`] = q(`${l}[offset='-1'] ${k}`).textContent;
                            }
                            try {lyrics[`T${i}`] = q(`${l}[offset='-1'] ${t}`).textContent}catch{}
                        }
                    }
                }
            } else {
                try {
                    lyrics["M0"] = q(".m-lyric .s-fc0").textContent
                    lyrics["T0"] = q(".m-lyric .s-fc3").textContent
                }catch{
                    try {
                        lyrics["M0"] = q(".m-lyric p").textContent
                    }catch{}
                }
            }
        }
    
        /*取色环节*/
        if (colorPick()=="reCv") {reloadCover();}
    
        /*创建canvas*/
        if (!c) {
            c = cE("canvas");
            console.log("PiPW Log: canvas元素已创建", c);
        }
        if (c.height != r || c.width != r*2) {
            c.height = r; c.width = r*2; reloadCover()
        }
        if (isToPiP && !PiPE) {
            DontPlay=true; //解决打开小窗时自动播放的问题
            c.toPiP();
            reloadCover()
        }
    
        function reloadCover() {
            if (!cover) {
                cover = new Image();
            }
            cover.src = cvUrl;
            cvUrlCache = cvUrl;
            nlCv = true;
        }
    
        /*字体*/
        let f = readCfg.customFonts;
    
        let cC = c.getContext("2d",{alpha:false}), o1 = r/480, o2 = r/240, o3 = r/160, o5 = r/96, o7 = r/68.5714, o10 = r/48, o12 = r/40, o15 = r/32, o20 = r/24, o21p5 = r/22.3256,o25 = r/19.2, o30 = r/16, o30p5 = r/15.7377, o35 = r/13.7143, o40 = r/12, o45 = r/10.6667, o55 = r/8.7272, o60 = r/8, o105 = r/4.57143, o150 = r/3.2
        let ldTxt = "加载中…";
        let txtMgL = cvSize + o10;
        cC.textAlign = "left";
        let xy = cvSize+o3;
        cC.clearRect(0, xy, c.width, c.height); cC.clearRect(xy, 0, c.width, c.height); /*防bug叠一起*/
        cC.fillStyle = bgC;
        cC.fillRect(0, xy, c.width, c.height); /*底背景*/
    
        let lrcFS = o55, lrcMgT = o45, lrcMgL = o15
        let lrcTop = cvSize+lrcMgT;
        cC.fillStyle = textC; cC.font = `bold ${lrcFS}px ${f}`;
        cC.fillText(lyrics["M0"], lrcMgL, lrcTop+lrcFS); /*主歌词*/
    
        if (lyrics["T0"]!="") {
            cC.fillStyle = textCT56; cC.font = `${lrcFS-o5}px ${f}`;
            cC.fillText(lyrics["T0"], lrcMgL, lrcTop+lrcFS*2+o10); /*翻译歌词*/
            cC.fillStyle = textCT56; cC.font = `bold ${lrcFS-o10}px ${f}`;
            cC.fillText(lyrics["M1"], lrcMgL, lrcTop+lrcFS*3+o30); /*下1句主歌词*/
            cC.fillStyle = textCT31; cC.font = `${lrcFS-o15}px ${f}`;
            cC.fillText(lyrics["T1"], lrcMgL, lrcTop+lrcFS*4+o30); /*下1句翻译歌词*/
            if (lyrics["T1"]=="") {
                cC.fillStyle = textCT56; cC.font = `bold ${lrcFS-o10}px ${f}`;
                cC.fillText(lyrics["M2"], lrcMgL, lrcTop+lrcFS*4+o40); /*下2句主歌词*/
            }
        } else if (lyrics["T1"]!="") {
            cC.fillStyle = textCT56; cC.font = `bold ${lrcFS-o10}px ${f}`;
            cC.fillText(lyrics["M1"], lrcMgL, lrcTop+lrcFS*2+o20); /*下1句主歌词*/
            cC.fillStyle = textCT31; cC.font = `${lrcFS-o15}px ${f}`;
            cC.fillText(lyrics["T1"], lrcMgL, lrcTop+lrcFS*3+o20); /*下1句翻译歌词*/
            cC.fillStyle = textCT56; cC.font = `bold ${lrcFS-o10}px ${f}`;
            cC.fillText(lyrics["M2"], lrcMgL, lrcTop+lrcFS*4+o30); /*下2句主歌词*/
        } else {
            cC.fillStyle = textCT56; cC.font = `bold ${lrcFS-o10}px ${f}`;
            cC.fillText(lyrics["M1"], lrcMgL, lrcTop+lrcFS*2+o10); /*下1句主歌词*/
            if (lyrics["T2"]!="") {
                cC.fillText(lyrics["M2"], lrcMgL, lrcTop+lrcFS*3+o20); /*下2句主歌词*/
                cC.fillStyle = textCT31; cC.font = `${lrcFS-o15}px ${f}`;
                cC.fillText(lyrics["T2"], lrcMgL, lrcTop+lrcFS*4+o20); /*下2句翻译歌词*/
                cC.fillStyle = textCT56; cC.font = `bold ${lrcFS-o10}px ${f}`;
                cC.fillText(lyrics["M3"], lrcMgL, lrcTop+lrcFS*5+o30); /*下3句主歌词*/
            } else {
                cC.fillText(lyrics["M2"], lrcMgL, lrcTop+lrcFS*3+o10); /*下2句主歌词*/
                if (lyrics["T3"]!="") {
                    cC.fillText(lyrics["M3"], lrcMgL, lrcTop+lrcFS*4+o20); /*下3句主歌词*/
                    cC.fillStyle = textCT31; cC.font = `${lrcFS-o15}px ${f}`;
                    cC.fillText(lyrics["T3"], lrcMgL, lrcTop+lrcFS*5+o20); /*下3句翻译歌词*/
                } else {
                    cC.fillText(lyrics["M3"], lrcMgL, lrcTop+lrcFS*4+o10); /*下3句主歌词*/
                    cC.fillText(lyrics["M4"], lrcMgL, lrcTop+lrcFS*5+o10); /*下4句主歌词*/
                }
            }
        }
    
        cC.fillStyle = bgC; xy = cvSize;
        cC.fillRect(xy, 0, c.width, xy+o5); /*head背景*/
        cC.beginPath(); cC.strokeStyle = bgC; cC.lineWidth = o5; xy = cvSize+o5;
        cC.moveTo(0, xy); cC.lineTo(c.width, xy); /*底边框*/
        cC.stroke();
        if (nlCv) {
            cC.fillStyle = textCT80; cC.font = `${o25}px ${f}`; cC.fillText(ldTxt, o5, o30); /*封面(加载)*/
            drawRC();
            cover.onload = ()=>{/*封面(完毕)*/
                cC.clearRect(0, 0, cvSize, cvSize);
                cC.drawImage(cover, 0, 0, cvSize, cvSize);
                drawRC();
                if(showRefrshing){console.log(`PiPW Log: 歌曲封面绘制完成`)}
            }
            function drawRC() {
                cC.beginPath(); cC.strokeStyle = bgC; cC.lineWidth = o5; xy = cvSize+o2;
                /*封面边框+圆角*/
                cC.moveTo(xy, 0); cC.arcTo(xy, xy, 0, xy, o12); cC.lineTo(0, xy); cC.lineTo(xy, xy); cC.lineTo(xy, 0);
                cC.stroke();
            }
        }
    
        cC.fillStyle = textC; cC.font = `${o55}px ${f}`;
        cC.fillText(snM, txtMgL, o60); /*主名*/
        cC.fillStyle = textCT31; cC.font = `${o35}px ${f}`;
        cC.fillText(snA==null?"":snA, txtMgL, o105); /*副名*/
        cC.fillStyle = textCT56;
        cC.fillText(sa, txtMgL, snA==null?o105:o150); /*歌手*/
    
        /*let tBg = cC.createLinearGradient(0, cvSize+5, 0, cvSize+45);
        tBg.addColorStop(0, bgC);
        tBg.addColorStop(1, "#0000");
        cC.fillStyle = tBg;
        cC.fillRect(0, cvSize, c.width, 45); /*时间背景*/
    
        cC.font = `${o30}px ${f}`;
        cC.fillStyle = textCT56;
        let tW = cC.measureText(t).width
        cC.fillText(t, o15, cvSize+o35); /*时间*/
    
        let  pbMgT = cvSize+o21p5, pbMgL = tW+o30p5
        cC.fillStyle = textCT13;
        cC.fillRect(pbMgL, pbMgT, c.width-pbMgL, o5); /*进度条背景*/
        cC.fillStyle = accentC;
        cC.fillRect(pbMgL, pbMgT, (c.width-pbMgL)*tP, o5); /*进度条*/
    
        if(showRefrshing){console.log(`PiPW Log: <canvas>重绘完成，当前分辨率${r}x${r*2}, 请求来自${from}`)}
    } catch (e) {
        console.error("PiPW Error: <canvas>绘制出错，详情：\n", e);tipMsg("&lt;canvas&gt;绘制出错，详见JavaScript控制台", "err")
    }
}

plugin.onAllPluginsLoaded(()=>{load()});
function load() {A();B();C();D();E()
    if (readCfg.moreRedraws) {setInterval(()=>{loadPiP(false, "setInterval()")},100)}
    async function A() { //监听播放时长变动
        await betterncm.utils.waitForElement(".m-player time");
        let A = qAll(".m-player time");
        for(i = 0; i < A.length; i++){
            new MutationObserver(() => {
                setTimeout(()=>{
                    loadPiP(false, "Time");
                }, 50)
            }).observe(A[i], {
                characterData: true,
                childList: true,
                subtree: true,
            });
        };
    }
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
    async function D() { //向歌曲信息旁添加PiP开关
        await betterncm.utils.waitForElement(".m-pinfo h3");
        let b = cE("div");
        b.id = "PiPW-Toggle"; b.classList.add("icn", "f-cp");
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
}

async function writeCfg(Cfg) { //写配置
    localStorage.setItem("PiPWindowSettings", JSON.stringify(Cfg));
    readCfg = JSON.parse(localStorage.getItem("PiPWindowSettings")); //刷新变量内存储的设置
};

async function saveCfg(all="all") { //保存设置
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
    writeCfg(readCfg); loadPiP(false, "SettingsRefreshing"); tipMsg("设置已更新");console.log("PiPW Log: 设置已保存")
};

plugin.onConfig(()=>{
    colorPick()
    let cP = cE("div", document);
    cP.setAttribute("id", "PiPWSettings");
    cP.innerHTML = `
<style id="PiPWSettingsStyle0">
    #PiPWSettings {
        --pipws-fg: ${accentC};
        --pipws-bg: ${bgCTSetting};
        --pipws-bg-wot: ${bgC};
        color: ${textC};
        line-height: 24px;
        font-size: 16px;
    }
</style>
<style>
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
    <p class="partTitle">PiPWindow </p><p> 0.2.0</p>
    <br />
    <p>by </p>
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning')" value=" Lukoning " />
    <p> 2024</p>
    <br />
    <p>Icon use: </p>
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Remix-Design/remixicon')" value=" Remix Icon " />
    <div style="text-align: right; position: absolute; bottom: 10px; right: 20px;">
        <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/PiPWindow')" value=" 源代码仓库(GitHub) " />
        <br />
        <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/PiPWindow/releases')" value=" 更新日志(GitHub Releases) " />
        <br />
        <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/PiPWindow/issues')" value=" 问题反馈/功能建议(GitHub issues) " />
    </div>
</div>
<div class="part">
    <p class="partTitle">操作说明</p>
    <p>点击歌曲红心❤️旁按钮或<input id="PiPW-ToggleLink" class="link" type="button" value="这里" />打开/关闭◲小窗</p>
    <p>可拖动↔↕可调整大小</p>
    <p>🐀鼠标移上◲小窗显示控制按钮</p>
    <p>也可以敲击 空格来控制▶️播放⏸️暂停</p>
    <p>↗返回和x关闭的效果可在下方自定义</p>
</div>
<div class="part noAutoBr">
    <p class="partTitle">自定义设置</p>
    <br />
    <p>关闭按钮行为</p>
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
    <p>返回按钮行为</p>
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
    <label class="switch">
        <input id="autoHideMainWindowSwitch" type="checkbox" />
        <span class="slider button"></span>
    </label>
    <p>打开小窗时隐藏主窗口 (mini模式行为)</p>
    <br />
    <p>自定义字体</p>
    <br />
    <input class="button textBox" id="customFontsSetBox" type="search" placeholder='${cfgDefault.customFonts}'
        value="${readCfg.customFonts.replaceAll("\"", "&quot;" )}" />
    <br />
    <input class="button" style="position: absolute; transform: translate(325px, -40px);" id="applyButton-font" type="button" value="应用" />
    <label class="switch">
        <input id="showAlbumSwitch" type="checkbox" />
        <span class="slider button"></span>
    </label>
    <p>将显示的翻译/别名替换为专辑名</p>
    <br />
    <label class="switch">
        <input id="moreRedrawsSwitch" type="checkbox" />
        <span class="slider button"></span>
    </label>
    <p>缩短重绘间隔 (可能有性能损耗，重载生效)</p>
    <br />
    <p>渲染分辨率 (宽高比2:1)</p>
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
<div class="part noAutoBr">
    <p class="partTitle">关于此版本的一些说明</p><p> 烦死了烦死了</p>
    <br /><p>控制按钮在暂停时并不会显示，但是仍然可以空格播放和暂停</p>
    <br /><p>暂停时按下关闭按钮，其效果与返回按钮相同……根本没法区分这俩按钮啊啊啊啊！！</p>
    <br /><p>私人漫游时在小窗外进行的暂停操作并不会被识别——播放操作也一样</p>
    <br />
    <br /><p>以及你有没有发现拖动/右边缘/下边缘调整大小后，下次打开小窗时并没有记住上次调整的大小……</p>
    <br /><p>可能有点抽象，但这会导致：选择自适应分辨率后，没法成功通过右/下边缘调整大小</p>
    <br /><p>原因未知。</p>
</div>
<div class="part">
    <div class="noAutoBr">
        <p class="partTitle">其他说明</p><p> 请注意阅读</p>
    </div>
    <p>配合Material You主题食用，效果更佳</p>
    <br />
    <p>请注意：</p>
    <div class="noAutoBr" style="font-size:17px;font-weight:bold">
        <p>目前本插件多行歌词功能依赖</p>
        <br />
        <p>RefinedNowPlaying 和 LyricBar</p>
    </div>
    <p>如要显示多行歌词</p>
    <p>请先打开 RefinedNowPlaying 的播放界面</p>
    <p>或安装 LyricBar （二选一）</p>
    <br />
    <p>也可以选择不安装上述插件、不打开播放界面</p>
    <p>词源将改为网易云自带的软件内词栏（只有一行）</p>
    <br />
    <p>如不喜欢 LyricBar，可以：</p>
    <p>1.下载 LyricBarBlur</p>
    <p>2.在 LyricBarBlur 内找到如下设置：</p>
    <p> - 背景模糊半径 背景不透明度 文本不透明度 边框宽度 阴影不透明度</p>
    <p>3.将以上设置全部设为0，LyricBar 看起来应该完全消失了</p>
    <br />
    <p style="font-size:17px;font-weight:bold">如需使用 类苹果歌词</p>
    <p>(与 RefinedNowPlaying "冲突")，可以：</p>
    <p>1.下载 类苹果歌词</p>
    <p>2.点击上方 打开插件文件夹 按钮</p>
    <p>3.双击 plugins 文件夹，然后找到 Apple-Musiclike 开头的文件</p>
    <p>4.长按这个文件，将其拖到上方的 betterncm 处</p>
    <p>5.回到网易云，点击 重启并重载插件</p>
    <p>6.在插件市场下载 LyricBar</p>
    <p>7.先别着急重载，再次点击上方 打开插件文件夹 按钮</p>
    <p>8.找到刚拖过的 Apple-Musiclike 开头的文件</p>
    <p>9.将其拖到 plugins 文件夹上</p>
    <p>10.回到网易云，再次点击 重启并重载插件</p>
    <br />
    <p>？ 类苹果歌词和 RefinedNowPlaying 不是互相冲突的吗，为什么可以这样做</p>
    <p>->实践证明，因为两者实现方式有别，并不会造成实际冲突。安装了类苹果歌词后，可以在打开播放界面的同时，按住Shift键，来打开 RefinedNowPlaying 的播放界面；安装 ←→0123456789JL+-,.↑↓FO 插件后，也可以通过按 F 来打开。</p>
</div>
<br /><br />
<div id="PIPWDEBUGMODE" class="noAutoBr">
    <label class="switch">
        <input id="debugModeSwitch" type="checkbox" />
        <span class="slider button"></span>
    </label>
    <p>调试模式 重载复位</p>
    <br />
    <p style="user-select: text">可在控制台使用 PiPWShowRefrshing() 来跟踪&lt;canvas&gt;重绘情况 [可传布尔值]</p>
</div>
<br /><br />
    `;
    let cfgDfKeys = Object.keys(cfgDefault)
    for (let i = 0; i < cfgDfKeys.length; i++) {
        let keyName = cfgDfKeys[i], key = readCfg[keyName]
        if (key == undefined || key == null) {key = cfgDefault[keyName]}
        switch (typeof key) {
            case "string":
                let /*str = q(`#${keyName}SetBox`, cP),*/ radios = qAll(`[name=${keyName}]`, cP)
                if (radios) {
                    for (let i = 0; i < radios.length; i++) {
                        if (radios[i].value ==  key) {radios[i].checked = true}
                        radios[i].addEventListener("change", ()=>{saveCfg(keyName)})
                    }
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
    q("#customFontsSetBox", cP).addEventListener("keydown", (e)=>{if(e.key=="Enter"){saveCfg("customFonts")}}); //回车应用
    q("#applyButton-font", cP).addEventListener("click", ()=>{saveCfg("customFonts")});
    q(`[name="resolutionRatio"][value="auto"]`, cP).addEventListener("click", ()=>{autoRatio=true;reRatio(thePiPWindow.height)});
    q("#debugModeSwitch", cP).addEventListener("change", ()=>{debugMode=q("#debugModeSwitch").checked;if(debugMode){try{q("#PiPWSettings").appendChild(v)}catch{}}});
    console.log(cP);
    return cP;
});