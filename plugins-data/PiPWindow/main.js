let v, c, cover, cvUrlCache, bgCCache, tMsT, isVLsnAdded=false
, pdd = "M21 3C21.5523 3 22 3.44772 22 4V11H20V5H4V19H10V21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3H21ZM21 13C21.5523 13 22 13.4477 22 14V20C22 20.5523 21.5523 21 21 21H13C12.4477 21 12 20.5523 12 20V14C12 13.4477 12.4477 13 13 13H21Z"
, pO = `<path d="${pdd}M20 15H14V19H20V15ZM6.70711 6.29289L8.95689 8.54289L11 6.5V12H5.5L7.54289 9.95689L5.29289 7.70711L6.70711 6.29289Z"></path>`
, pC = `<path d="${pdd}"></path>`
, readCfg = JSON.parse(localStorage.getItem("PiPWindowSettings"))
, cfgDefault = ({customFonts: "\"Microsoft Yahei UI\", system-ui"})
if (!readCfg) {initializeCfg()};
function cE(n, d=document) {
    return d.createElement(n);
}
function q(n, d=document) {
    return d.querySelector(n);
}
function qAll(n, d=document) {
    return d.querySelectorAll(n);
}
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
HTMLCanvasElement.prototype.toPiP = function(){
    if (!(v instanceof HTMLVideoElement)) {
        v = cE("video");
    }
    v.id = "PiPW-VideoE";
    v.srcObject = this.captureStream();
    v.controls = true;
    v.play();
    if (!isVLsnAdded) {
        isVLsnAdded = true
        v.addEventListener("loadedmetadata", ()=>{
            try {
                /*v.addEventListener("play", ()=>{
                    q(".m-player:not(.f-dn) .btnp-play").click()
                })*/
                v.addEventListener("pause", ()=>{
                    q(".m-player:not(.f-dn) .btnp-pause").click()
                })
                v.addEventListener("enterpictureinpicture", async ()=>{
                    tipMsg("已打开悬浮窗");q("#PiPW-Toggle svg").innerHTML=pC;q("#PiPW-Toggle").setAttribute("style", "fill: currentColor; opacity: 1")
                });
                v.addEventListener("leavepictureinpicture", async ()=>{
                    tipMsg("已关闭悬浮窗");q("#PiPW-Toggle svg").innerHTML=pO;q("#PiPW-Toggle").setAttribute("style", "")
                });
                v.requestPictureInPicture();
                console.log("PiPW Log: PiP窗口已创建", v);
            } catch (e) {
                console.error("PiPW Error: PiP窗口创建出错，详情：\n", e);
            }
        });
    }
}

async function loadPiP(isToPiP=true) {
    let PiPE = document.pictureInPictureElement;
    if(!isToPiP && !PiPE){return}
    if(PiPE && PiPE.id != "PiPW-VideoE"){tipMsg("PiP窗口被占用", "err");return}

    /*封面*/
    let nlCv = false, cvSize = 160, cvUrl = q("img.j-cover").src;
    if (cvUrl == "") {cvUrl = "orpheus://orpheus/style/res/default/default_play_disc.png"}
    else {cvUrl = cvUrl.replace(/thumbnail=([^&]+)/, `thumbnail=${cvSize}y${cvSize}`/*替换缩略图尺寸*/)}
    if (cvUrl != cvUrlCache) {reloadCover()}

    /*歌名*/
    let snM = q(".m-pinfo .j-title").title, snA = null;
    try {
        snA = q(".m-pinfo .j-title .s-fc4").textContent;
    }catch{}

    /*歌手*/
    let saE = qAll(".m-pinfo .bar > .j-title span:first-child *"), sa = "";
    if (saE.length != 0) {
        for (i=0; i<saE.length; i++, sa=sa+"／") {
            sa = sa + saE[i].textContent;
        }
        sa = sa.slice(0, -1); /*处理多余斜杠*/
        if (sa == "未知") {
            sa = "未知歌手";
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
                lyrics["M0"] = q(".m-lyric p").textContent
            }
        }
    }

    let ldTxt = "加载中…";

    let txtMgL = cvSize + 10;

    /*取色环节*/
    let dbcl = document.body.classList;
    function s(e, p) {
        return getComputedStyle(q(e)).getPropertyValue(p);
    }
    let accentC = s("body", "--themeC1");
    let textC = s("body", "color");
    if (dbcl.contains("material-you-theme")) {textC = s("body", "--md-accent-color-secondary")}
    let textCT00;
    if (/rgba/.test(textC)) {textCT00 = textC.replace(/,([^,)]*)\)/, "")}
    else {textCT00 = textC.replace(/rgb\(/, "rgba(").replace(/\)/, "")}
    textC = `${textCT00})`;
    let textCT80 = `${textCT00}, .8)`;
    let textCT56 = `${textCT00}, .56)`;
    let textCT31 = `${textCT00}, .31)`;
    let textCT13 = `${textCT00}, .13)`;
    let bgC = s("body", "background-color");
    if (bgC != bgCCache) {bgCCache=bgC;reloadCover()}

    /*创建canvas*/
    if (!c) {
        c = cE("canvas");
        c.height = 480; c.width = 960;
        console.log("PiPW Log: canvas元素已创建", c);
    }
    if (isToPiP && !PiPE) {c.toPiP();reloadCover()}

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

    let cC = c.getContext("2d",{alpha:false});
    cC.textAlign = "left";
    let xy;
    cC.fillStyle = bgC;
    cC.fillRect(cvSize, 0, c.width, cvSize); /*head背景*/
    cC.beginPath(); cC.strokeStyle = bgC; cC.lineWidth = 5; xy = cvSize+2;
    cC.moveTo(xy, xy); cC.lineTo(c.width, xy); /*底边框*/
    cC.stroke();
    if (nlCv) {
        cC.fillStyle = textCT80; cC.font = `25px ${f}`; cC.fillText(ldTxt, 5, 30); /*封面(加载)*/
        drawRC();
        cover.onload = ()=>{/*封面(完毕)*/
            cC.clearRect(0, 0, cvSize, cvSize);
            cC.drawImage(cover, 0, 0, cvSize, cvSize);
            drawRC();
        }
        function drawRC() {
            cC.beginPath(); cC.strokeStyle = bgC; cC.lineWidth = 5; xy = cvSize+2;
            /*封面边框+圆角*/
            cC.moveTo(xy, 0); cC.arcTo(xy, xy, 0, xy, 12); cC.lineTo(xy, xy); cC.lineTo(0, xy);
            cC.stroke();
        }
    }

    cC.fillStyle = textC; cC.font = `55px ${f}`;
    cC.fillText(snM, txtMgL, 60); /*主名*/
    cC.fillStyle = textCT31; cC.font = `35px ${f}`;
    cC.fillText(snA==null?"":snA, txtMgL, 105); /*副名*/
    cC.fillStyle = textCT56;
    cC.fillText(sa, txtMgL, snA==null?105:150); /*歌手*/

    cC.fillStyle = bgC; xy = cvSize+3;
    cC.fillRect(0, xy, c.width, c.height); /*底背景*/

    cC.font = `30px ${f}`;
    cC.fillStyle = textCT56;
    let tW = cC.measureText(t).width
    cC.fillText(t, 15, cvSize+35); /*时间*/

    let  pbMgT = cvSize+21.5, pbMgL = tW+30.5
    cC.fillStyle = textCT13;
    cC.fillRect(pbMgL, pbMgT, c.width-pbMgL, 5); /*进度条背景*/
    cC.fillStyle = accentC;
    cC.fillRect(pbMgL, pbMgT, (c.width-pbMgL)*tP, 5); /*进度条*/

    let lrcFS = 55, lrcMgT = 45, lrcMgL = 15;
    let lrcTop = cvSize+lrcMgT;
    cC.fillStyle = textC; cC.font = `bold ${lrcFS}px ${f}`;
    cC.fillText(lyrics["M0"], lrcMgL, lrcTop+lrcFS); /*主歌词*/

    if (lyrics["T0"]!="") {
        cC.fillStyle = textCT56; cC.font = `${lrcFS-5}px ${f}`;
        cC.fillText(lyrics["T0"], lrcMgL, lrcTop+lrcFS*2+10); /*翻译歌词*/
        cC.fillStyle = textCT56; cC.font = `bold ${lrcFS-10}px ${f}`;
        cC.fillText(lyrics["M1"], lrcMgL, lrcTop+lrcFS*3+30); /*下1句主歌词*/
        cC.fillStyle = textCT31; cC.font = `${lrcFS-15}px ${f}`;
        cC.fillText(lyrics["T1"], lrcMgL, lrcTop+lrcFS*4+30); /*下1句翻译歌词*/
        if (lyrics["T1"]=="") {
            cC.fillStyle = textCT56; cC.font = `bold ${lrcFS-10}px ${f}`;
            cC.fillText(lyrics["M2"], lrcMgL, lrcTop+lrcFS*4+40); /*下2句主歌词*/
        }
    } else if (lyrics["T1"]!="") {
        cC.fillStyle = textCT56; cC.font = `bold ${lrcFS-10}px ${f}`;
        cC.fillText(lyrics["M1"], lrcMgL, lrcTop+lrcFS*2+20); /*下1句主歌词*/
        cC.fillStyle = textCT31; cC.font = `${lrcFS-15}px ${f}`;
        cC.fillText(lyrics["T1"], lrcMgL, lrcTop+lrcFS*3+20); /*下1句翻译歌词*/
        cC.fillStyle = textCT56; cC.font = `bold ${lrcFS-10}px ${f}`;
        cC.fillText(lyrics["M2"], lrcMgL, lrcTop+lrcFS*4+30); /*下2句主歌词*/
    } else {
        cC.fillStyle = textCT56; cC.font = `bold ${lrcFS-10}px ${f}`;
        cC.fillText(lyrics["M1"], lrcMgL, lrcTop+lrcFS*2+10); /*下1句主歌词*/
        if (lyrics["T2"]!="") {
            cC.fillText(lyrics["M2"], lrcMgL, lrcTop+lrcFS*3+20); /*下2句主歌词*/
            cC.fillStyle = textCT31; cC.font = `${lrcFS-15}px ${f}`;
            cC.fillText(lyrics["T2"], lrcMgL, lrcTop+lrcFS*4+20); /*下2句翻译歌词*/
            cC.fillStyle = textCT56; cC.font = `bold ${lrcFS-10}px ${f}`;
            cC.fillText(lyrics["M3"], lrcMgL, lrcTop+lrcFS*5+30); /*下3句主歌词*/
        } else {
            cC.fillText(lyrics["M2"], lrcMgL, lrcTop+lrcFS*3+10); /*下2句主歌词*/
            if (lyrics["T3"]!="") {
                cC.fillText(lyrics["M3"], lrcMgL, lrcTop+lrcFS*4+20); /*下3句主歌词*/
                cC.fillStyle = textCT31; cC.font = `${lrcFS-15}px ${f}`;
                cC.fillText(lyrics["T3"], lrcMgL, lrcTop+lrcFS*5+20); /*下3句翻译歌词*/
            } else {
                cC.fillText(lyrics["M3"], lrcMgL, lrcTop+lrcFS*4+10); /*下3句主歌词*/
                cC.fillText(lyrics["M4"], lrcMgL, lrcTop+lrcFS*5+10); /*下4句主歌词*/
            }
        }
    }
}

plugin.onAllPluginsLoaded(()=>{load()});
function load() {A();B();C();D()
    async function A() { //监听播放时长变动
        await betterncm.utils.waitForElement(".m-player time");
        let A = qAll(".m-player time");
        for(i = 0; i < A.length; i++){
            new MutationObserver(() => {
                setTimeout(()=>{
                    loadPiP(false);
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
            loadPiP(false);
        }).observe(q(".m-lyric"), {
            characterData: true,
            childList: true,
            subtree: true,
        });
    }
    async function C() { //监听LB插件词栏变动
        await betterncm.utils.waitForElement(".lyric-bar");
        new MutationObserver(() => {
            loadPiP(false);
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
        b.addEventListener("click", ()=>{
            let pE = document.pictureInPictureElement
            if (pE && pE.id=="PiPW-VideoE") {
                document.exitPictureInPicture();
            } else {
                loadPiP();
            }
        })
        q(".m-pinfo h3").appendChild(b);
        new MutationObserver(() => {
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

async function saveCfg() { //保存设置
    //获取文本设置
    function t(name) {
        let b = document.getElementById(name + "SetBox");
        let set = b.value;

        if (set == "undefined" || set == "null" || set == "") {
            return b.placeholder;
        };
        return set;
    };
    let cfgWillWrite = ({customFonts: t("fonts")});
    writeCfg(cfgWillWrite);
    loadPiP(false);
    console.log("PiPW Log: Settings saved");
};

function initializeCfg() { //初始化设置
    readCfg = cfgDefault;
    writeCfg(cfgDefault);
    console.log("PiPW Log: Configs initializing");
};

plugin.onConfig(()=>{
    let cP = cE("div", document);
    cP.setAttribute("id", "PiPWSettings");
    cP.innerHTML = `
<style>
#PiPWSettings {
--pipws-fg: var(--themeC1, var(--colorPrimary1));
--pipws-bg: rgba(var(--md-accent-color-bg-rgb, var(--ncm-fg-rgb)), .3);
--pipws-bg-wot: var(--md-accent-color-bg, var(--ncm-fg-rgb, var(--colorBackground)));
color: var(--md-accent-color-secondary, var(--ncm-text, var(--colorBlack2)));
line-height: 24px;
font-size: 16px;
}
body.ncm-light-theme #PiPWSettings {
--pipws-bg: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), .3);
--pipws-bg-wot: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), 1);
}
#PiPWSettings div p {
display: inline;
}
#PiPWSettings ::selection {
color: var(--pipws-bg-wot);
background: var(--pipws-fg);
}
#PiPWSettings :disabled::selection {
color: #000000;
background: #888;
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
#PiPWSettings .link {
text-decoration: underline;
cursor: pointer;
color: var(--pipws-fg) !important;
background: rgba(0, 0, 0, 0);
border: 0 solid;
}
</style>
<div>
<p>PiPWindow</p>
<br />
<p>v0.1.0 by </p>
<input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning')" value=" Lukoning " />
<br />
<p>Icon use: </p>
<input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Remix-Design/remixicon')" value=" Remix Icon " />
</div>
<input style="width:155px;" class="button" id="PiPW-ToPiP" type="button" value="打开悬浮窗口(PiP)" />
<p>❤️点击歌曲红心旁按钮或↑上方按钮打开悬浮窗</p>
<p>↔ 可拖动，可调整大小</p>
<p>🐀鼠标上移显示关闭和返回按钮</p>
<p>x 点击关闭按钮会关闭悬浮窗，并暂停播放</p>
<p>↗点击返回按钮也会关闭悬浮窗，但不会暂停播放</p>
<p>M 配合Material You主题食用，效果更佳</p>
<br />
<p>自定义字体</p>
<input class="button textBox" id="fontsSetBox" type="search" placeholder='${cfgDefault.customFonts}' value="${readCfg.customFonts.replaceAll("\"", "&quot;")}" />
<br />
<input class="button" style="position: absolute; transform: translate(325px, -40px);" id="applyButton-font" type="button" value="应用" />
<br /><br />
<p>请注意：</p>
<p>目前本插件多行歌词功能依赖</p>
<p>RefinedNowPlaying 和 LyricBar</p>
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
<p>如需使用 类苹果歌词(与 RefinedNowPlaying "冲突")，可以：</p>
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
<br />
<p>已知问题：</p>
<p>1.没法在这个窗口上暂停、切换上下曲、调音量</p>
<p>2.没法修改歌词左中右对齐</p>
<p>3.可以调整窗口大小，但没法调整窗口比例</p>
<p>4.文本超出窗口后不会自动滚动</p>
<p>5.没有逐字歌词</p>
    `;
    q("#PiPW-ToPiP", cP).addEventListener("click", ()=>{loadPiP()});
    q("#applyButton-font", cP).addEventListener("click", ()=>{saveCfg()});
    console.log(cP);
    return cP;
});