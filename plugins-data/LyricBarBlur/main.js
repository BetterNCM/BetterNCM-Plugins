const ヤマノススメ = "ヤマノススメ";
const readCfg = JSON.parse(localStorage.getItem("LyricBarBlurSettings"));
const crStyle = document.createElement("style");
const cfgDefault = ({
    blur: 12,
    blurCompel: false,
    bgTrans: 0.75,
    bgColor: "defaultWom",
    bgRed: 0,
    bgGreen: 120,
    bgBlue: 215,
    bgCompel: false,
    fonts: "default",
    customFonts: "\"SDK_SC_Web 85W\", \"华文彩云\"",
    textTrans: 1,
    textColor: "theme",
    textRed: 127,
    textGreen: 127,
    textBlue: 127,
    textOl: false,
    textOlWay: "shadow",
    textOlWidth: 0.5,
    textOlTrans: 1,
    textOlColor: "custom",
    textOlRed: 0,
    textOlGreen: 0,
    textOlBlue: 0,
    textCompel: false,
    padding: 0,
    bdWidth: 1,
    bdTrans: 0.1,
    bdRadius: 12,
    bdColor: "custom",
    bdRed: 127,
    bdGreen: 127,
    bdBlue: 127,
    noBdBgBlend: true,
    bdCompel: false,
    shadowX: 0,
    shadowY: 1,
    shadowBlur: 8,
    shadowSpread: -4,
    shadowTrans: 0.3,
    shadowRed: 0,
    shadowGreen: 0,
    shadowBlue: 0,
    isWidthEnable: false,
    widthCustom: 400,
    centerOfBottom: false,
    doNotHideWithoutLyrics: true,
    multiline3: false,
    weltLeftRight: false,
    noFadeLyrics: false,
    mdThemeFloatBtBarBugFix: true,
});

async function resetStyles() { //应用新设置
    if (!JSON.parse(localStorage.getItem("isLyricBarBlurEnable"))) { //清空！
        try {
            document.querySelector("#LyricBarBlurStyles").innerHTML = ``;
        } catch {
            crStyle.innerHTML = ``;
        }
        console.log("LyricBarBlur Log: Disabled");
        return;
    }

    let lb = document.querySelector(".lyric-bar");
    let lbi = document.querySelector(".lyric-bar-inner");

    let blur = readCfg.blur;
    let bgTrans = readCfg.bgTrans;
    if (bgTrans == undefined || bgTrans == null || bgTrans == NaN) {
        bgTrans = readCfg.trans;
        bgRed = readCfg.colorRed;
        bgGreen = readCfg.colorGreen;
        bgBlue = readCfg.colorBlue;
    } else {
        bgTrans = readCfg.bgTrans;
        bgRed = readCfg.bgRed;
        bgGreen = readCfg.bgGreen;
        bgBlue = readCfg.bgBlue;
    }

    if (readCfg.blurCompel) {
        isBlurCompel = "!important";
    } else {
        isBlurCompel = "";
    }

    if (readCfg.bgCompel || readCfg.colorCompel) {
        isBgCompel = "!important";
    } else {
        isBgCompel = "";
    }

    if (readCfg.textCompel) {
        isTextCompel = "!important";
    } else {
        isTextCompel = "";
    }

    if (readCfg.bdCompel) {
        isBdCompel = "!important";
    } else {
        isBdCompel = "";
    }

    let cssLbTop = `
    .lyric-bar {
        --lbb-text-outline-width: ` + readCfg.textOlWidth + `px;
        --lbb-text-outline-color: rgba(` + readCfg.textOlRed + `, ` + readCfg.textOlGreen + `, ` + readCfg.textOlBlue + `, ` + readCfg.textOlTrans + `);
        opacity: 1 !important;
        transition: opacity .35s, all .5s !important;
    `;
    let cssLbiTop = `
    .lyric-bar-inner {
    `;
    let cssLbiaTop = `
    .lyric-bar-inner * {
    `;
    let cssBgDefault = ` 
        background: linear-gradient(0deg, rgba(var(--md-accent-color-rgb, var(--ncm-fg-rgb)), ` + bgTrans/10 +`), rgba(var(--md-accent-color-rgb, var(--ncm-fg-rgb)), ` + bgTrans/10 +`)), rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), ` + bgTrans +`) ` + isBgCompel + `;
    `;
    let cssBgDefaultWom = ` 
        background: rgba(var(--md-accent-color-bg-rgb, var(--ncm-fg-rgb)), ` + bgTrans +`) ` + isBgCompel + `;
    `;
    let cssBgDefaultWomAll = `
    body.ncm-light-theme .lyric-bar {
        background: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), ` + bgTrans +`) ` + isBgCompel + `;
    }
    `;
    let cssBgCustom = `
        background: rgba(` + bgRed + `,` + bgGreen + `,` + bgBlue + `,` + bgTrans +`) ` + isBgCompel + `;
    `;
    let cssBgBlur = `
        backdrop-filter: blur(` + blur + `px) ` + isBlurCompel + `;
    `;
    /*  一开始Rnp并不会加载，所以这里读取了Rnp的字体设置，并通过CSS应用。
     *  :not选择器的作用是判断Rnp播放页是否被加载，解决在Rnp内关闭自定义字体后，
     *  这里的设置仍被应用的问题。
     */ 
    let cssFontsRnpAll = `
    body:not(.rnp-auto, .rnp-light, .rnp-dark) .lyric-bar-inner * {
        font-family: ` + localStorage.getItem("refined-now-playing-font-family").replace("[", "").replace("]", "") + `;
    }
    `;
    let cssFontsCustomLbia = `
        font-family: ` + readCfg.customFonts + `;
    `;
    let cssTextTransLbi = `
        opacity: ` + readCfg.textTrans + ` ` + isTextCompel + `;
    `;
    let cssTextTheme = `
        --lbb-custom-text-color: var(--themeC1);
    `;
    let cssTextCustom = `
        --lbb-custom-text-color: rgb(` + readCfg.textRed + `,` + readCfg.textGreen + `,` + readCfg.textBlue + `);
    `;
    let cssTextCustomLbia = `
        --rnp-accent-color-shade-2: var(--lbb-custom-text-color) ` + isTextCompel + `;
        color: var(--lbb-custom-text-color) ` + isTextCompel + `;
    `;
    let cssTextOlShadow = `
        text-shadow:
            var(--lbb-text-outline-width) var(--lbb-text-outline-width) var(--lbb-text-outline-color),
            calc(var(--lbb-text-outline-width) * -1) var(--lbb-text-outline-width) var(--lbb-text-outline-color),
            calc(var(--lbb-text-outline-width) * -1) calc(var(--lbb-text-outline-width) * -1) var(--lbb-text-outline-color),
            var(--lbb-text-outline-width) calc(var(--lbb-text-outline-width) * -1) var(--lbb-text-outline-color);
    `;
    let cssTextOlStroke = `
        -webkit-text-stroke: var(--lbb-text-outline-width) var(--lbb-text-outline-color);
    `;
    let cssWidth = `
        --lyric-bar-width: ` + readCfg.widthCustom + `px !important;
    `;
    let cssPadding = `
        padding: ` + readCfg.padding + `px ` + isBdCompel + `;
    `;
    let cssBdWidth = `
        border: ` + readCfg.bdWidth + `px solid;
    `;
    let cssBdDefault = `
        border-color: var(--themeC1) ` + isBdCompel + `;
    `;
    let cssBdText = `
        border-color: var(--lbb-custom-text-color, var(--md-accent-color, var(--ncm-text)));
    `;
    let cssBdCustom = `
        border-color: rgba(` + readCfg.bdRed + `,` + readCfg.bdGreen + `,` + readCfg.bdBlue + `,` + readCfg.bdTrans +`) ` + isBdCompel + `;
    `;
    let cssNoBdBgBlend = `
        background-clip: padding-box;
    `;
    let cssBdRadius = `
        border-radius: ` + readCfg.bdRadius + `px ` + isBdCompel + `;
    `;
    let cssShadow = `
        box-shadow: ` + readCfg.shadowX + `px ` + readCfg.shadowY + `px ` + readCfg.shadowBlur + `px ` + readCfg.shadowSpread + `px rgba(` + readCfg.shadowRed + `,` + readCfg.shadowGreen + `,` + readCfg.shadowBlue + `,` + readCfg.shadowTrans +`);
    `;
    let cssCobAll = `
    .lyric-bar {
        top: unset !important;
        bottom: calc(var(--bottombar-height, 72px) + var(--bottombar-elevation, 0px)) !important;
        margin: 0 auto !important;
        border-bottom-width: 0 !important;
        border-bottom-left-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
    }
    .MoTheme-bottomMusicBar_dockMode .lyric-bar {
        bottom: calc(var(--bottombar-height, 72px) + var(--bottombar-elevation, 0px) + 10px) !important;
    }
    `;
    let cssDnhwolAll = `
    .lyric-bar.no-lyrics {
        opacity: 1 !important; 
        pointer-events: auto;
    }
    `;
    let cssLbMl3 = `
        height: calc(var(--lyric-bar-height)*3);
    `;
    let cssWeltLeftRight = `
        width: clamp(200px, 100%, 100vw - var(--sidebar-width, 199px) - (2px * ` + readCfg.bdWidth + `px)) !important; 
    `;
    let cssWlrFloatBtBarAll = `
    body.floating-bottombar .lyric-bar {
        right: calc(50vw - var(--bottombar-width)/2) !important;
        left: calc(50vw - var(--bottombar-width)/2) !important;
        z-index: 152 !important;
    }
    .MoTheme-bottomMusicBar_dockMode .lyric-bar {
        right: calc(10px + var(--extra-pos-margin, 0px)) !important;
    }
    `;
    let cssWlrAndCobFloatBtBarAll = `
    body.floating-bottombar:not(.mq-playing) #main-player, body.floating-bottombar:not(.mq-playing) .m-player-fm, body.floating-bottombar:not(.mq-playing) #main-player .prg, body.floating-bottombar:not(.mq-playing) .m-player-fm .prg {
        border-top-left-radius: 0 !important;
        border-top-right-radius: 0 !important;
    }
    .MoTheme-bottomMusicBar_dockMode .lyric-bar {
        bottom: calc(var(--bottombar-height, 72px) + var(--bottombar-elevation, 0px) + 12px) !important;
    }
    .MoTheme-bottomMusicBar_dockMode .m-player {
        border-top-right-radius: 0 !important;
    }
    `;
    let cssWlrOrCobFloatBtBar = `
        right: calc(1px + var(--extra-pos-margin, 0px)) !important;
        left: calc(var(--leftbar-width, 199px) + var(--extra-pos-margin, 0px)) !important;
    `;
    let cssNoFadeLyrics = `
        --mask-image: unset !important;
    `;
    let cssMdThemeFloatBtBarBugFixAll = `
    body.floating-bottombar .lyric-bar.posx-left {
        left: max(calc(var(--leftbar-width, 199px) + 15px + var(--extra-pos-margin, 0px)), calc(50vw - var(--bottombar-width)/2));
    }
    `;
    let css0 = `
    body.rnp-shadow.rnp-text-glow .lyric-bar, body.rnp-text-glow.rnp-text-glow .lyric-bar {
        --rnp-drop-shadow: drop-shadow(0px 4px 5px rgba(var(--rnp-accent-color-shade-2-rgb), 0.27)) !important;
    }
    `;
    let cssEnd = `
    }
    `;

    let bgc = readCfg.bgColor;
    let textc = readCfg.textColor;
    let olw = readCfg.textOlWay;
    let bdc = readCfg.bdColor;
    let f = readCfg.fonts;

    let c = cssLbTop + cssBgBlur + cssPadding + cssBdRadius + cssShadow;

    if (readCfg.bgColor || readCfg.color) {
        c = c + cssBgCustom;
    } else {
        c = c + cssBgDefault;
    }

    if (bgc == "default") {
        c = c + cssBgDefault;
    }
    if (bgc == "defaultWom") {
        c = c + cssBgDefaultWom;
    }
    if (bgc == "custom") {
        c = c + cssBgCustom;
    }

    if (textc == "theme") {
        c = c + cssTextTheme;
    }
    if (textc == "custom") {
        c = c + cssTextCustom;
    }

    if (readCfg.textOl) {
        if (olw == "shadow") {
            c = c + cssTextOlShadow;
        } 
        if (olw == "stroke") {
            c = c + cssTextOlStroke;
        }
    }

    c = c + cssBdWidth;
    if (bdc == "default") {
        c = c + cssBdDefault;
    }
    if (bdc == "text") {
        c = c + cssBdText;
    }
    if (bdc == "custom") {
        c = c + cssBdCustom;
    }

    if (readCfg.noBdBgBlend) {
        c = c + cssNoBdBgBlend;
    }

    if (readCfg.isWidthEnable) {
        c = c + cssWidth;
    }

    if (readCfg.multiline3) {
        c = c + cssLbMl3 + ``;
    }

    if (readCfg.weltLeftRight) {
        c = c + cssWeltLeftRight;
    }

    if (readCfg.weltLeftRight || readCfg.centerOfBottom) {
        c = c + cssWlrOrCobFloatBtBar;
    }

    if (readCfg.noFadeLyrics) {
        c = c + cssNoFadeLyrics;
    }

    c = c + cssEnd + cssLbiTop + cssTextTransLbi + cssEnd + cssLbiaTop;

    if (textc == "theme" || textc == "custom") {
        c = c + cssTextCustomLbia;
    }

    try {
        //先移除类…
        lb.classList.remove("g-single-track");
        lbi.classList.remove("lyric");
        if (f == "rnp") {
            //添加Rnp歌词的类以动态更换字体
            lb.classList.add("g-single-track");
            lbi.classList.add("lyric");
        }
    } catch { console.err("LyricBarBlur Error: Class list of the LyricBar editing failed"); }

    if (f == "custom") {
        c = c + cssFontsCustomLbia;
    }

    c = c + cssEnd;

    //读取Rnp设置
    if (f == "rnp" && localStorage.getItem("refined-now-playing-custom-font") == "true") {
        c = c + cssFontsRnpAll;
    }

    if (bgc == "defaultWom") {
        c = c + cssBgDefaultWomAll;
    }

    if (readCfg.centerOfBottom) {
        c = c + cssCobAll;
    }

    if (readCfg.doNotHideWithoutLyrics) {
        c = c + cssDnhwolAll;
    }

    if (readCfg.weltLeftRight) {
        c = c + cssWlrFloatBtBarAll;
    }

    if (readCfg.weltLeftRight && readCfg.centerOfBottom) {
        c = c + cssWlrAndCobFloatBtBarAll;
    }

    if (readCfg.mdThemeFloatBtBarBugFix) {
        c = c + cssMdThemeFloatBtBarBugFixAll;
    }

    c = c + css0;

    try {
        document.querySelector("#LyricBarBlurStyles").innerHTML = c;
    } catch {
        crStyle.innerHTML = c;
    }
    console.log("LyricBarBlur Log: Styles set/reset");
};

async function disableSaveCancel(onoff, isFlashing) {
    let s = document.querySelector("#saveButton");
    let c = document.querySelector("#cancelButton");
    if (onoff) {
        s.disabled = true;
        c.disabled = true;
    } else {
        s.disabled = false;
        c.disabled = false;
    }
    if (isFlashing) {
        let css = "animation: buttonFlashing .2s 2; color: var(--lbbs-fg) !important; box-shadow: 0;";
        s.setAttribute("style", css);
        c.setAttribute("style", css);
        setTimeout(() => {
            s.setAttribute("style", "");
            c.setAttribute("style", "");
        }, 500)
    }
}


async function onOffAnySets() {
    let allBinding = document.querySelectorAll(".switchBinding");
    let bindingInput = document.querySelectorAll(".switchBinding:not(.part) > label:nth-of-type(1) input, .switchBinding .partTitle + div > label:nth-of-type(1) input");
    if (allBinding.length != bindingInput.length) {
        console.warn("LyricBarBlur Warning: [SETTING] allBinding.length != bindingInput.length");
    }
    for (n = 0; n < allBinding.length; n++) {
        let allInput = allBinding[n].querySelectorAll("input");
        let isChecked = bindingInput[n].checked;
        if (bindingInput[n].disabled) {
            for (i = 1; i < allInput.length; i++) {
                allInput[i].disabled = true;
            }
        } else {
            for (i = 1; i < allInput.length; i++) {
                allInput[i].disabled = !isChecked;
            }
        }
    }
}
async function onOffAllSets() {
    let isChecked = document.querySelector("#mainSwitch").checked;
    let allInput = document.querySelectorAll("input");
    for (i = 0; i < allInput.length; i++) {
        allInput[i].disabled = !isChecked;
    }
    if (isChecked == true) {
        onOffAnySets();
    }
    document.querySelector("#mainSwitch").disabled = false;
    localStorage.setItem("isLyricBarBlurEnable", isChecked);
    resetStyles();
}

async function writeCfg(Cfg) { //写配置
    localStorage.setItem("LyricBarBlurSettings", JSON.stringify(Cfg));
};

async function saveCfg() { //保存设置

    //获取纯数字设置
    function n(name, min, max) {
        let b = document.getElementById(name + "SetBox");
        let set = b.value;
        //对字符串进行处理
        if (set == "undefined" || set == "null" || set == "") {
            set = b.placeholder;
        };
        //转换为数字
        set = set*1;
        //检查合法值
        if (min != "n" && set < min) {
            set = min;
            b.value = min;
        }
        if (max != "n" && set > max) {
            set = max;
            b.value = max;
        };
        return set;
    };

    //获取文本设置
    function t(name) {
        let b = document.getElementById(name + "SetBox");
        let set = b.value;

        if (set == "undefined" || set == "null" || set == "") {
            return b.placeholder;
        };
        return set;
    };

    //获取开关设置
    function s(name) {
        return document.getElementById(name + "Switch").checked;
    };

    //获取单选项设置
    function r(name) {
        let sets = document.getElementsByName(name);
        for (i = 0; i < sets.length; i++) {
            if(sets[i].checked) {
                return sets[i].value;
            }
        }
    };
    let cfgWillWrite = ({
        blur: n("blur", 0, "n"),
        blurCompel: s("blurCompel"),
        bgTrans: n("bgTrans", 0, 100)/100,
        bgColor: r("bgColor"),
        bgRed: n("bgRed", 0, 255),
        bgGreen: n("bgGreen", 0, 255),
        bgBlue: n("bgBlue", 0, 255),
        bgCompel: s("bgCompel"),
        fonts: r("fonts"),
        customFonts: t("fonts"),
        textTrans: n("textTrans", 0, 100)/100,
        textColor: r("textColor"),
        textRed: n("textRed", 0, 255),
        textGreen: n("textGreen", 0, 255),
        textBlue: n("textBlue", 0, 255),
        textOl: s("textOl"),
        textOlWay: r("textOlWay"),
        textOlWidth: n("textOlWidth", 0, "n"),
        textOlTrans: n("textOlTrans", 0, 100)/100,
        textOlColor: r("textOlColor"),
        textOlRed: n("textOlRed", 0, 255),
        textOlGreen: n("textOlGreen", 0, 255),
        textOlBlue: n("textOlBlue", 0, 255),
        textCompel: s("textCompel"),
        padding: n("padding", 0, "n"),
        bdWidth: n("bdWidth", 0, "n"),
        bdTrans: n("bdTrans", 0, 100)/100,
        bdRadius: n("bdRadius", 0, "n"),
        bdColor: r("bdColor"),
        bdRed: n("bdRed", 0, 255),
        bdGreen: n("bdGreen", 0, 255),
        bdBlue: n("bdBlue", 0, 255),
        noBdBgBlend: s("noBdBgBlend"),
        bdCompel: s("bdCompel"),
        shadowX: n("shadowX", "n", "n"),
        shadowY: n("shadowY", "n", "n"),
        shadowBlur: n("shadowBlur", 0, "n"),
        shadowSpread: n("shadowSpread", "n", "n"),
        shadowTrans: n("shadowTrans", 0, 100)/100,
        shadowRed: n("shadowRed", 0, 255),
        shadowGreen: n("shadowGreen", 0, 255),
        shadowBlue: n("shadowBlue", 0, 255),
        isWidthEnable: s("width"),
        widthCustom: n("widthCustom", 200, "n"),
        centerOfBottom: s("centerOfBottom"),
        doNotHideWithoutLyrics: s("doNotHideWithoutLyrics"),
        multiline3: s("multiline3"),
        weltLeftRight: s("weltLeftRight"),
        noFadeLyrics: s("noFadeLyrics"),
        mdThemeFloatBtBarBugFix: s("mdThemeFloatBtBarBugFix"),
    });
    writeCfg(cfgWillWrite);
    if (s("width")) {
        localStorage.setItem("lyric-bar-lyric-bar-width", widthCustom + "px");
    }
    console.log("LyricBarBlur Log: Settings saved");
    resetStyles();
    disableSaveCancel(true);
};

async function cancel(cfg) {
    let readCfg = cfg;
    if (cfg == undefined) {
        readCfg = JSON.parse(localStorage.getItem("LyricBarBlurSettings"));
    }
    let d = document;
    d.querySelector("#blurSetBox").value = readCfg.blur;
    d.querySelector("#blurCompelSwitch").checked = readCfg.blurCompel;
    d.querySelector("#bgTransSetBox").value = readCfg.bgTrans*100;
    let bgc = readCfg.bgColor;
    if (bgc == "default") {
        d.querySelector("#bgColorDefaultRadio").checked = true;
    }
    if (bgc == "defaultWom") {
        d.querySelector("#bgColorDefaultWomRadio").checked = true;
    }
    if (bgc == "custom") {
        d.querySelector("#bgColorCustomRadio").checked = true;
    }
    d.querySelector("#bgRedSetBox").value = readCfg.bgRed;
    d.querySelector("#bgGreenSetBox").value = readCfg.bgGreen;
    d.querySelector("#bgBlueSetBox").value = readCfg.bgBlue;
    d.querySelector("#bgCompelSwitch").checked = readCfg.bgCompel;
    let f = readCfg.fonts;
    if (f == "default") {
        d.querySelector("#fontsDefaultRadio").checked = true;
    }
    if (f == "rnp") {
        d.querySelector("#fontsRnpRadio").checked = true;
    }
    if (f == "custom") {
        d.querySelector("#fontsCustomRadio").checked = true;
    }
    d.querySelector("#fontsSetBox").value = readCfg.customFonts;
    d.querySelector("#textTransSetBox").value = readCfg.textTrans*100;
    let textc = readCfg.textColor;
    if (textc == "default") {
        d.querySelector("#textColorDefaultRadio").checked = true;
    }
    if (textc == "theme") {
        d.querySelector("#textColorThemeRadio").checked = true;
    }
    if (textc == "custom") {
        d.querySelector("#textColorCustomRadio").checked = true;
    }
    d.querySelector("#textRedSetBox").value = readCfg.textRed;
    d.querySelector("#textGreenSetBox").value = readCfg.textGreen;
    d.querySelector("#textBlueSetBox").value = readCfg.textBlue;
    d.querySelector("#textOlSwitch").checked = readCfg.textOl;
    let olw = readCfg.textOlWay;
    if (olw == "shadow") {
        d.querySelector("#textOlWayShadowRadio").checked = true;
    }
    if (olw == "stroke") {
        d.querySelector("#textOlWayStrokeRadio").checked = true;
    }
    d.querySelector("#textOlWidthSetBox").value = readCfg.textOlWidth;
    d.querySelector("#textOlTransSetBox").value = readCfg.textOlTrans*100;
    let olc = readCfg.textOlColor;
    if (olc == "custom") {
        d.querySelector("#textOlColorCustomRadio").checked = true;
    }
    d.querySelector("#textOlRedSetBox").value = readCfg.textOlRed;
    d.querySelector("#textOlGreenSetBox").value = readCfg.textOlGreen;
    d.querySelector("#textOlBlueSetBox").value = readCfg.textOlBlue;
    d.querySelector("#textCompelSwitch").checked = readCfg.textCompel;
    d.querySelector("#paddingSetBox").value = readCfg.padding;
    d.querySelector("#bdWidthSetBox").value = readCfg.bdWidth;
    d.querySelector("#bdTransSetBox").value = readCfg.bdTrans*100;
    d.querySelector("#bdRadiusSetBox").value = readCfg.bdRadius;
    let bdc = readCfg.bdColor;
    if (bdc == "default") {
        d.querySelector("#bdColorDefaultRadio").checked = true;
    }
    if (bdc == "text") {
        d.querySelector("#bdColorTextRadio").checked = true;
    }
    if (bdc == "custom") {
        d.querySelector("#bdColorCustomRadio").checked = true;
    }
    d.querySelector("#bdRedSetBox").value = readCfg.bdRed;
    d.querySelector("#bdGreenSetBox").value = readCfg.bdGreen;
    d.querySelector("#bdBlueSetBox").value = readCfg.bdBlue;
    d.querySelector("#noBdBgBlendSwitch").checked = readCfg.noBdBgBlend;
    d.querySelector("#bdCompelSwitch").checked = readCfg.bdCompel;
    d.querySelector("#shadowXSetBox").value = readCfg.shadowX;
    d.querySelector("#shadowYSetBox").value = readCfg.shadowY;
    d.querySelector("#shadowBlurSetBox").value = readCfg.shadowBlur;
    d.querySelector("#shadowSpreadSetBox").value = readCfg.shadowSpread;
    d.querySelector("#shadowTransSetBox").value = readCfg.shadowTrans*100;
    d.querySelector("#shadowRedSetBox").value = readCfg.shadowRed;
    d.querySelector("#shadowGreenSetBox").value = readCfg.shadowGreen;
    d.querySelector("#shadowBlueSetBox").value = readCfg.shadowBlue;
    d.querySelector("#widthSwitch").checked = readCfg.isWidthEnable;
    d.querySelector("#widthCustomSetBox").value = readCfg.widthCustom;
    d.querySelector("#centerOfBottomSwitch").checked = readCfg.centerOfBottom;
    d.querySelector("#doNotHideWithoutLyricsSwitch").checked = readCfg.doNotHideWithoutLyrics;
    d.querySelector("#multiline3Switch").checked = readCfg.multiline3;
    d.querySelector("#weltLeftRightSwitch").checked = readCfg.weltLeftRight;
    d.querySelector("#noFadeLyricsSwitch").checked = readCfg.noFadeLyrics;
    d.querySelector("#mdThemeFloatBtBarBugFixSwitch").checked = readCfg.mdThemeFloatBtBarBugFix;
    console.log("LyricBarBlur Log: Settings refreshed");
    disableSaveCancel(true);
}

function initializeCfg() { //初始化设置
    localStorage.setItem("isLyricBarBlurEnable", true);
    writeCfg(cfgDefault);
    console.log("LyricBarBlur Log: Configs initializing");
    resetStyles();
};

async function backToDefault() {
    await cancel(cfgDefault);
    disableSaveCancel(false, true);
}

let whatiii = 0;
let abcabc = 0
async function what() { //彩蛋嘿嘿
    let b = document.querySelector("#bugton")
    whatiii++
    if (whatiii == 1) {
        b.value = "干嘛？"
    }
    if (whatiii == 2) {
        b.value = "别戳我"
    }
    if (whatiii == 3) {
        b.value = "睡不着啦"
    }
    if (whatiii == 4) {
        b.value = "(怒)要给你点教训吗"
    }
    if (whatiii == 5) {
        b.value = "不听是吧，你等着"
        setTimeout(() => {
            document.querySelector("#LyricBarBlurSettings style").innerHTML = ""
            whatiii = 5
            abcabc = 123
            b.value = "怎么样？"
        }, 10000)
    }
    if (abcabc != 123) {
        if (whatiii == 6) {
            b.value = "喂喂，不是叫你等着吗"
        }
        if (whatiii == 7) {
            b.value = "叫你等你就等，烦呐"
        }
        if (whatiii == 8) {
            b.value = "…"
        }
        if (whatiii > 8) {
            b.value += "…"
        }
    }
    if (abcabc == 123) {
        if (whatiii == 6) {
            b.value = "还戳呐？"
        }
        if (whatiii == 7) {
            b.value += "？油盐不进"
        }
        if (whatiii == 8) {
            b.value = "你……"
        }
        if (whatiii == 9) {
            b.value = "我要生气了"
        }
        if (whatiii == 10) {
            b.value = "再戳我就要开大了！！！"
        }
        if (whatiii == 11) {
            b.value = "最后警告。再戳就让你颠。"
        }
        if (whatiii == 12) {
            b.value = "……10秒内，任务管理器准备好。别怪我没提醒你。"
            localStorage.setItem(ヤマノススメ, true);
            setTimeout(() => {
                setInterval(() => {
                    document.querySelector(".m-winctrl .icn.revert").click();
                }, 111)
                setInterval(() => {
                    document.querySelector(".m-winctrl .icn.min").click();
                }, 99)
            }, 10000)
        }
    }
}

plugin.onAllPluginsLoaded(async () => { //插件初始化
    if (!readCfg) { //初始化设置
        initializeCfg();
    };
    if (localStorage.getItem(ヤマノススメ)) { //等会？！
        setInterval(() => {
            document.querySelector("html").innerHTML = `
                <h1 style="color:red">YOU DEER</h1>
                <input type="button" value="RESPAWN ->" onclick="localStorage.removeItem('ヤマノススメ');location.href='orpheus://orpheus'"/>
                <input type="button" value="TITLE SCREEN ->" onclick="localStorage.removeItem('ヤマノススメ');window.open('orpheus://orpheus')"/>
                <p>OR</p>
                <input type="button" value="网易云音乐 ->" onclick="window.open('https://music.163.com/#/mv?id=22602294')"/>
                <input type="button" value="ilibilib ->" onclick="window.open('https://www.bilibili.com/video/BV1xJ4m1M7RU')"/>
                <input type="button" value="UOGUK ->" onclick="window.open('https://www.kugou.com/mvweb/html/mv_7jcwjca')"/>
            `;
        }, 1000);
    };
    await betterncm.utils.waitForElement(".lyric-bar-inner"); //等待LyricBar加载完毕，否则一开始Rnp字体不生效
    //初始化样式
    crStyle.setAttribute("id", "LyricBarBlurStyles");
    await resetStyles();
    document.head.appendChild(crStyle);
});

plugin.onConfig(() => {
    if (!readCfg) { //如果读不到就使用初始设置
        readCfg = cfgDefault;
    };
    //设置读取
    try {
        var blur = readCfg.blur;
        var bgTrans = readCfg.bgTrans*100;
        var bgRed = readCfg.bgRed;
        var bgGreen = readCfg.bgGreen;
        var bgBlue = readCfg.bgBlue;
        var textTrans = readCfg.textTrans*100;
        var textRed = readCfg.textRed;
        var textGreen = readCfg.textGreen;
        var textBlue = readCfg.textBlue;
        var textOlWidth = readCfg.textOlWidth;
        var textOlTrans = readCfg.textOlTrans*100;
        var textOlRed = readCfg.textOlRed;
        var textOlGreen = readCfg.textOlGreen;
        var textOlBlue = readCfg.textOlBlue;
        var padding = readCfg.padding;
        var bdWidth = readCfg.bdWidth;
        var bdTrans = readCfg.bdTrans*100;
        var bdRadius = readCfg.bdRadius;
        var bdRed = readCfg.bdRed;
        var bdGreen = readCfg.bdGreen;
        var bdBlue = readCfg.bdBlue;
        var shadowX = readCfg.shadowX;
        var shadowY = readCfg.shadowY;
        var shadowBlur = readCfg.shadowBlur;
        var shadowSpread = readCfg.shadowSpread;
        var shadowTrans = readCfg.shadowTrans*100;
        var shadowRed = readCfg.shadowRed;
        var shadowGreen = readCfg.shadowGreen;
        var shadowBlue = readCfg.shadowBlue;
        var widthCustom = readCfg.widthCustom;
        if (readCfg.blurCompel) {
        var blurCompelSwitchCheck = "Checked";
        }

        if (readCfg.bgCompel) {
            var bgCompelSwitchCheck = "Checked";
        }
        var bgc = readCfg.bgColor;
        var bgColorSetBoxDisable = "Disabled";
        if (bgc == "defaultWom") {
            var bgColorDefaultWomRadioCheck = "Checked";
        } else if (bgc == "custom") {
            var bgColorCustomRadioCheck = "Checked";
            var bgColorSetBoxDisable = "";
        } else {
            var bgColorDefaultRadioCheck = "Checked";
        }
        //v0.2配置兼容
        if (bgc == true) {
            var bgColorCustomRadioCheck = "Checked";
        } else if (bgc == false) {
            var bgColorDefaultRadioCheck = "Checked";
            var bgColorSetBoxDisable = "Disabled";
        }

        if (readCfg.textCompel) {
            var textCompelSwitchCheck = "Checked";
        }
        var f = readCfg.fonts;
        var fontsSetBoxDisable = "Disabled";
        if (f == "rnp") {
            var fontsRnpRadioCheck = "Checked";
        } else if (f == "custom") {
            var fontsCustomRadioCheck = "Checked";
            var fontsSetBoxDisable = "";
        } else {
            var fontsDefaultRadioCheck = "Checked";
        }
        var textc = readCfg.textColor;
        var textColorSetBoxDisable = "Disabled";
        if (textc == "theme") {
            var textColorThemeRadioCheck = "Checked";
        } else if (textc == "custom") {
            var textColorCustomRadioCheck = "Checked";
            var textColorSetBoxDisable = "";
        } else {
            var textColorDefaultRadioCheck = "Checked";
        }
        //v0.2配置兼容
        if (textc == true) {
            var textColorCustomRadioCheck = "Checked";
        } else if (textc == false) {
            var textColorDefaultRadioCheck = "Checked";
            var textColorSetBoxDisable = "Disabled";
        }

        if (readCfg.textOl) {
            var textOlSwitchCheck = "Checked";
        } else {
            var textOlSetsDisable = "Disabled";
            var textOlColorSetBoxDisable = "Disabled";
        }
        var olw = readCfg.textOlWay;
        if (olw == "shadow") {
            var textOlWayShadowRadioCheck = "Checked";
        } else if (olw == "stroke") {
            var textOlWayStrokeRadioCheck = "Checked";
        }
        if (readCfg.textOlColor) {
            var textOlColorCustomRadioCheck = "Checked";
        } else {
            var textOlColorSetBoxDisable = "Disabled";
        }

        if (readCfg.noBdBgBlend) {
            var noBdBgBlendSwitchCheck = "Checked";
        }
        if (readCfg.bdCompel) {
            var bdCompelSwitchCheck = "Checked";
        }
        var bdc = readCfg.bdColor;
        var bdColorSetBoxDisable = "Disabled";
        if (bdc == "default") {
            var bdColorDefaultRadioCheck = "Checked";
        } else if (bdc == "text") {
            var bdColorTextRadioCheck = "Checked";
        } else if (bdc == "custom") {
            var bdColorCustomRadioCheck = "Checked";
            var bdColorSetBoxDisable = "";
        }

        if (readCfg.isWidthEnable) {
            var widthSwitchCheck = "Checked";
        } else {
            var widthCustomSetBoxDisable = "Disabled";
        }
        if (readCfg.centerOfBottom) {
            var centerOfBottomSwitchCheck = "Checked";
        }
        if (readCfg.doNotHideWithoutLyrics) {
            var doNotHideWithoutLyricsSwitchCheck = "Checked";
        }
        if (readCfg.multiline3) {
            var multiline3SwitchCheck = "Checked";
        }
        if (readCfg.weltLeftRight) {
            var weltLeftRightSwitchCheck = "Checked";
        }
        if (readCfg.noFadeLyrics) {
            var noFadeLyricsSwitchCheck = "Checked";
        }
        if (readCfg.mdThemeFloatBtBarBugFix) {
            var mdThemeFloatBtBarBugFixSwitchCheck = "Checked";
        }

        var customFonts = readCfg.customFonts.replaceAll("\"", "&quot;");
    } catch {
        //v0.1配置兼容
        try {
            var blur = readCfg.blur;
            var bgTrans = readCfg.trans*100;
            var bgRed = readCfg.colorRed;
            var bgGreen = readCfg.colorGreen;
            var bgBlue = readCfg.colorBlue;
            if (readCfg.blurCompel) {
                var blurCompelSwitchCheck = "Checked";
            }
            
            if (readCfg.color) {
                var bgColorCustomRadioCheck = "Checked";
                var bgColorSetBoxDisable = "";
            } else {
                var bgColorSetBoxDisable = "Disabled";
            }
            
            if (readCfg.colorCompel) {
                var bgCompelSwitchCheck = "Checked";
            }
        } catch {}
    }

    //创建DOM
    let crCfgPage = document.createElement("div");
    crCfgPage.setAttribute("id", "LyricBarBlurSettings");
    crCfgPage.innerHTML = `
    <style>
        #LyricBarBlurSettings {
            --lbbs-fg: var(--themeC1);
            --lbbs-bg: rgba(var(--md-accent-color-bg-rgb, var(--ncm-fg-rgb)), .3);
            --lbbs-bg-wot: rgba(var(--md-accent-color-bg-rgb, var(--ncm-fg-rgb)), 1);
            color: var(--md-accent-color-secondary, var(--ncm-text));
            width: 420px;
            margin: 0 auto 120px 0;
            line-height: 45px;
            font-size: 16px;
        }
        body.ncm-light-theme #LyricBarBlurSettings {
            --lbbs-bg: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), .3);
            --lbbs-bg-wot: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), 1);
        }

        #LyricBarBlurSettings p {
            display: inline;
        }

        #LyricBarBlurSettings ::selection {
            color: var(--lbbs-bg-wot);
            background: var(--lbbs-fg);
        }
        #LyricBarBlurSettings :disabled::selection {
            color: #000000;
            background: #888;
        }

        #LyricBarBlurSettings .part {
            display: inline-block;
            vertical-align: top;
            width: 420px;
            outline: 0;
            margin: 5px 0 0;
            padding: 15px 25px;
            border: 1px solid var(--lbbs-bg);
            border-radius: 12px;
            box-shadow: 0 0 3px 1px var(--lbbs-fg);
            background: var(--lbbs-bg);
            backdrop-filter: blur(24px);
            transition: .5s;
        }
        #LyricBarBlurSettings .part * {
        }
        #LyricBarBlurSettings .parting {
            height: 1px;
            margin: 10px 0;
            border: solid var(--lbbs-fg);
            border-width: 1px 0 0 0;
            box-shadow: 0 0 3px var(--lbbs-fg);
        }
        #LyricBarBlurSettings .partTitle {
            font-size: 23px;
            line-height: 45px;
        }

        #LyricBarBlurSettings .center {
            display: flex;
            flex-flow: column wrap;
        }
        #LyricBarBlurSettings .centerInner {
            margin: 5px auto auto;
        }

        #LyricBarBlurSettings .topBar {
            position: sticky;
            top: -20px;
            z-index: 1;
            pointer-events: none;
        }
        #LyricBarBlurSettings .topBarInner {
            height: 50px;
            margin: 5px auto auto;
            pointer-events: none;
        }
        #LyricBarBlurSettings .topBarInner > * {
            backdrop-filter: blur(12px);
            pointer-events: auto;
        }

        #LyricBarBlurSettings .middle {
            display: flex;
            flex-flow: column wrap;
            align-items: center;
        }

        @keyframes buttonFlashing {
            50% {
                box-shadow: 0 0 8px 1px var(--lbbs-fg);
            }
        }
        #LyricBarBlurSettings .button {
            color: var(--md-accent-color-secondary, var(--ncm-text)) !important;
            font-size: 16px;
            width: 90px;
            height: 40px;
            line-height: 0;
            outline: 0;
            box-shadow: 0 0 3px var(--lbbs-fg);
            border: 1px solid var(--lbbs-fg);
            border-radius: 10px;
            background: var(--lbbs-bg);
            transition: .1s;
        }
        #LyricBarBlurSettings .button:hover {
            box-shadow: 0 0 6px var(--lbbs-fg);
        }
        #LyricBarBlurSettings .button:active {
            font-size: 14px;
            border-width: 4px;
            box-shadow: 0 0 8px var(--lbbs-fg);
        }

        #LyricBarBlurSettings .button:disabled {
            color: #888 !important;
            box-shadow: 0 0 3px #888;
            border: 1px solid #888;
            background: var(--lbbs-bg);
        }
        #LyricBarBlurSettings .button:disabled:hover {
            box-shadow: 0 0 6px #888;
        }
        #LyricBarBlurSettings .button:disabled:active {
            font-size: 16px;
            border-width: 1px;
            box-shadow: 0 0 6px #888;
        }

        #LyricBarBlurSettings #bugton {
            opacity: 0;
            width: 180px;
            transition: .1s, opacity .2s;
        }
        #LyricBarBlurSettings #bugton:hover {
            opacity: 1;
        }

        #LyricBarBlurSettings .textBox {
            padding: 10px;
        }
        #LyricBarBlurSettings .textBox:focus {
            font-size: 15px;
            border-width: 3px;
            box-shadow: 0 0 8px var(--lbbs-fg);
        }
        #LyricBarBlurSettings [type=number] {
            width: 90px;
        }
        #LyricBarBlurSettings [type=search] {
            width: 100%;
        }
        #LyricBarBlurSettings [R] {
            color: #F00;
            text-shadow: 0 1px 10px #F00;
        }
        #LyricBarBlurSettings [G] {
            color: #0F0;
            text-shadow: 0 1px 10px #0F0;
        }
        #LyricBarBlurSettings [B] {
            color: #00F;
            text-shadow: 0 1px 10px #00F;
        }

        #LyricBarBlurSettings .switch {
            position: relative;
            margin: 0 50px 0 0;
            display: inline-block;
        }
        #LyricBarBlurSettings .radio {
            position: relative;
            margin: 0 25px 0 0;
            display: inline-block;
        }
        #LyricBarBlurSettings .switch input, #LyricBarBlurSettings .radio input{ 
            opacity: 0;
            width: 0;
            height: 0;
        }

        #LyricBarBlurSettings .slider {
            position: absolute;
            width: 50px;
            height: 25px;
            margin: 11px 0;
            border-radius: 8px;
            transition: .2s, box-shadow .1s;
        }
        #LyricBarBlurSettings .slider:active {
            border-width: 3px;
            transition: .1s;
        }

        #LyricBarBlurSettings .radio .slider {
            width: 25px;
        }
        #LyricBarBlurSettings .radio .slider:active {
            border-width: 4px;
            transition: .1s;
        }

        #LyricBarBlurSettings input:checked + .slider {
            border: 1px solid var(--lbbs-bg);
            background: var(--lbbs-fg);
        }
        #LyricBarBlurSettings input:checked + .slider:active {
            border-width: 3px;
        }

        #LyricBarBlurSettings .radio input:checked + .slider {
            border-color: var(--lbbs-fg);
            background: var(--lbbs-bg);
        }

        #LyricBarBlurSettings input:disabled + .slider {
            border: 1px solid #888;
            box-shadow: 0 0 3px #888;
        }
        #LyricBarBlurSettings input:disabled + .slider:hover {
            box-shadow: 0 0 6px #888; 
        }
        #LyricBarBlurSettings input:disabled + .slider:active {
            border-width: 1px;
            box-shadow: 0 0 6px #888;
        }
        #LyricBarBlurSettings input:disabled:checked + .slider {
            border: 1px solid #909090;
            background: #888;
        }
        #LyricBarBlurSettings .radio input:disabled:checked + .slider {
            border-color: #888;
            background: var(--lbbs-bg);
        }

        #LyricBarBlurSettings .slider::before {
            position: absolute;
            content: "";
            height: 15px;
            width: 15px;
            left: 4px;
            bottom: 4px;
            border-radius: 4px;
            background: var(--lbbs-fg);
            transition: .2s;
        }
        #LyricBarBlurSettings .slider:active::before {
            height: 11px;
            width: 11px;
            border-radius: 3px;
            transition: .1s;
        }

        #LyricBarBlurSettings .radio .slider::before {
            opacity: 0;
            height: 3px;
            width: 3px;
            left: 10px;
            bottom: 10px;
        }
        #LyricBarBlurSettings .radio .slider:active::before {
            opacity: 0;
            height: 27px;
            width: 27px;
            left: -5px;
            bottom: -5px;
            border-radius: 5px;
            transition: .2s;
        }

        #LyricBarBlurSettings input:checked + .slider::before {
            background: var(--lbbs-bg-wot);
            transform: translateX(25px);
        }

        #LyricBarBlurSettings .radio input:checked + .slider::before {
            opacity: 1;
            height: 15px;
            width: 15px;
            left: 4px;
            bottom: 4px;
            background: var(--lbbs-fg);
            transform: translateX(0px);
        }
        #LyricBarBlurSettings .radio input:checked + .slider:active::before {
            height: 11px;
            width: 11px;
            left: 4px;
            bottom: 4px;
        }

        #LyricBarBlurSettings input:disabled + .slider::before {
            background: #888;
        }
        #LyricBarBlurSettings input:disabled + .slider:active::before {
            height: 15px;
            width: 15px;
            border-radius: 4px;
        }

        #LyricBarBlurSettings input:disabled:checked + .slider::before {
            background: var(--lbbs-bg-wot);
        }

        #LyricBarBlurSettings .radio input:disabled:checked + .slider::before {
            background: #888;
        }
        #LyricBarBlurSettings .radio input:disabled:checked + .slider:active::before {
            height: 15px;
            width: 15px;
        }

        #LyricBarBlurSettings .link {
            text-decoration: underline;
            cursor: pointer;
            color: var(--lbbs-fg) !important;
            background: rgba(0, 0, 0, 0);
            border: 0 solid;
        }

        @media (min-width: 1310px) {
            #LyricBarBlurSettings {
                width: 850px;
            }
            #LyricBarBlurSettings .centerInner {
                width: 500px;
            }
            #LyricBarBlurSettings .topBarInner {
                width: auto;
            }
            #LyricBarBlurSettings .middle {
                max-height: 2345px;
            }
        }
        @media (min-width: 1750px) {
            #LyricBarBlurSettings {
                width: 1275px;
            }
            #LyricBarBlurSettings .middle {
                max-height: 1520px;
            }
        }
    </style>
    <div class="center">
        <div class="part centerInner">
            <p style="font-size: 40px; line-height: 80px;">LyricBarBlur 设置</p>
            <br />
            <p>修改LyricBar外观，比如…添加背景模糊？</p>
            <div style="float: right;">
                <p>总开关</p>
                <label class="switch">
                    <input id="mainSwitch" type="checkbox" />
                    <span class="slider button"></span>
                </label>
            </div>
        </div>
    </div>
    <div class="topBar center">
        <div class="topBarInner centerInner">
            <input class="button" id="saveButton" type="button" value="应用" disabled/>
            <input class="button" id="cancelButton" type="button" value="撤销" disabled/>
            <input class="button" id="resetButton" type="button" value="重置" />
        </div>
    </div>
    <div class="middle">
    <div class="part">
        <p class="partTitle">模糊</p>
        <div style="float: right;">
            <p>覆盖其他插件的设置</p>
            <label class="switch">
                <input id="blurCompelSwitch" type="checkbox" ` + blurCompelSwitchCheck + `/>
                <span class="slider button"></span>
            </label>
        </div>
        <br />
        <div style="font-size: 14px; line-height: 16px;">
            <p>注意: 模糊半径过高可能会导致背景闪烁。</p>
        </div>
        <div class="parting"></div>
            <p>背景模糊半径</p>
            <br />
            <input class="button textBox" id="blurSetBox" type="number" step="1" placeholder="12" value="` + blur + `"/>
            <p>px</p>
            <br />
    </div>
    <div class="part">
        <p class="partTitle">背景</p>
        <div style="float: right;">
            <p>覆盖其他插件的设置</p>
            <label class="switch">
                <input id="bgCompelSwitch" type="checkbox" ` + bgCompelSwitchCheck + `/>
                <span class="slider button"></span>
            </label>
        </div>
        <div class="parting"></div>
            <p>背景不透明度</p>
            <br />
            <input class="button textBox" id="bgTransSetBox" type="number" step="1" placeholder="75" value="` + bgTrans + `"/>
            <p>%</p>
            <br />
            <p>背景颜色</p>
            <br />
            <label class="radio">
                <input type="radio" id="bgColorDefaultRadio" name="bgColor" value="default" ` + bgColorDefaultRadioCheck +`/>
                <span class="slider button"></span>
            </label>
            <p>使用默认颜色</p>
            <br />
            <label class="radio">
                <input type="radio" id="bgColorDefaultWomRadio" name="bgColor" value="defaultWom" ` + bgColorDefaultWomRadioCheck +`/>
                <span class="slider button"></span>
            </label>
            <p>使用默认颜色(去除混色)</p>
            <br />
            <div class="switchBinding">
                <label class="radio">
                    <input type="radio" id="bgColorCustomRadio" name="bgColor" value="custom" ` + bgColorCustomRadioCheck +`/>
                    <span class="slider button"></span>
                </label>
                <p>自定义颜色</p>
                <br />
                <p R>R</p>
                <input class="button textBox" id="bgRedSetBox" type="number" step="1" placeholder="0" value="` + bgRed + `" ` + bgColorSetBoxDisable + `/>
                <p G>G</p>
                <input class="button textBox" id="bgGreenSetBox" type="number" step="1" placeholder="120" value="` + bgGreen + `" ` + bgColorSetBoxDisable + `/>
                <p B>B</p>
                <input class="button textBox" id="bgBlueSetBox" type="number" step="1" placeholder="215" value="` + bgBlue + `" ` + bgColorSetBoxDisable + `/>
            </div>
    </div>
    <div class="part">
        <p class="partTitle">字体</p>
        <div class="parting"></div>
            <label class="radio">
                <input type="radio" id="fontsDefaultRadio" name="fonts" value="default" ` + fontsDefaultRadioCheck + `/>
                <span class="slider button"></span>
            </label>
            <p>使用默认字体</p>
            <br />
            <label class="radio">
                <input type="radio" id="fontsRnpRadio" name="fonts" value="rnp" ` + fontsRnpRadioCheck + `/>
                <span class="slider button"></span>
            </label>
            <p>跟随RefinedNowPlaying的设置</p>
            <br />
            <div class="switchBinding">
                <label class="radio">
                    <input type="radio" id="fontsCustomRadio" name="fonts" value="custom" ` + fontsCustomRadioCheck + ` />
                    <span class="slider button"></span>
                </label>
                <p>使用自定义字体(CSS font-family)</p>
                <br />
                <input class="button textBox" id="fontsSetBox" type="search" placeholder='"SDK_SC_Web 85W", "华文彩云"' value="` + customFonts + `" ` + fontsSetBoxDisable + `/>
        </div>
    </div>
    <div class="part">
        <p class="partTitle">文本</p>
        <div style="float: right;">
            <p>覆盖其他插件的设置</p>
            <label class="switch">
                <input id="textCompelSwitch" type="checkbox" ` + textCompelSwitchCheck + `/>
                <span class="slider button"></span>
            </label>
        </div>
        <div class="parting"></div>
            <p>文本不透明度</p>  
            <br />
            <input class="button textBox" id="textTransSetBox" type="number" step="1" placeholder="100" value="` + textTrans + `"/>
            <p>%</p>
            <br />
            <p>文本颜色</p>
            <br />
            <label class="radio">
                <input type="radio" id="textColorDefaultRadio" name="textColor" value="default" ` + textColorDefaultRadioCheck +`/>
                <span class="slider button"></span>
            </label>
            <p>使用默认颜色</p>
            <br />
            <label class="radio">
                <input type="radio" id="textColorThemeRadio" name="textColor" value="theme" ` + textColorThemeRadioCheck +`/>
                <span class="slider button"></span>
            </label>
            <p>跟随主题色</p>
            <br />
            <div class="switchBinding">
                <label class="radio">
                    <input type="radio" id="textColorCustomRadio" name="textColor" value="custom" ` + textColorCustomRadioCheck +`/>
                    <span class="slider button"></span>
                </label>
                <p>自定义颜色</p>
                <br />
                <p R>R</p>
                <input class="button textBox" id="textRedSetBox" type="number" step="1" placeholder="127" value="` + textRed + `" ` + textColorSetBoxDisable + `/>
                <p G>G</p>
                <input class="button textBox" id="textGreenSetBox" type="number" step="1" placeholder="127" value="` + textGreen + `" ` + textColorSetBoxDisable + `/>
                <p B>B</p>
                <input class="button textBox" id="textBlueSetBox" type="number" step="1" placeholder="127" value="` + textBlue + `" ` + textColorSetBoxDisable + `/>
            </div>
    </div>
    <div class="part switchBinding">
        <p class="partTitle">文字描边</p>
        <div style="float: right;">
            <p>使用描边</p>
            <label class="switch">
                <input id="textOlSwitch" type="checkbox" ` + textOlSwitchCheck + `/>
                <span class="slider button"></span>
            </label>
        </div>
        <div class="parting"></div>
            <p>实现方式</p>
            <br />
            <label class="radio">
                <input type="radio" id="textOlWayShadowRadio" name="textOlWay" value="shadow" ` + textOlWayShadowRadioCheck + ` ` + textOlSetsDisable + `/>
                <span class="slider button"></span>
            </label>
            <p>text-shadow</p>
            <br />
            <label class="radio">
                <input type="radio" id="textOlWayStrokeRadio" name="textOlWay" value="stroke" ` + textOlWayStrokeRadioCheck + ` ` + textOlSetsDisable + `/>
                <span class="slider button"></span>
            </label>
            <p>-webkit-text-stroke</p>
            <br />
            <div style="display: inline-block;">
                <p>描边宽度</p>
                <br />
                <input class="button textBox" id="textOlWidthSetBox" type="number" step="0.1" placeholder="0.5" value="` + textOlWidth + `" ` + textOlSetsDisable + `/>
                <p>px</p>
            </div>
            <div style="display: inline-block; margin-left: 60px;">
                <p>描边不透明度</p>
                <br />
                <input class="button textBox" id="textOlTransSetBox" type="number" step="1" placeholder="100" value="` + textOlTrans + `" ` + textOlSetsDisable + `/>
                <p>%</p>
            </div>
            <br />
            <p>描边颜色</p>
            <div class="switchBinding">
                <label class="radio">
                    <input type="radio" id="textOlColorCustomRadio" name="textOlColor" value="custom" ` + textOlColorCustomRadioCheck + ` ` + textOlSetsDisable + `/>
                    <span class="slider button"></span>
                </label>
                <p>自定义颜色</p>
                <br />
                <p R>R</p>
                <input class="button textBox" id="textOlRedSetBox" type="number" step="1" placeholder="0" value="` + textOlRed + `" ` + textOlColorSetBoxDisable + `/>
                <p G>G</p>
                <input class="button textBox" id="textOlGreenSetBox" type="number" step="1" placeholder="0" value="` + textOlGreen + `" ` + textOlColorSetBoxDisable + `/>
                <p B>B</p>
                <input class="button textBox" id="textOlBlueSetBox" type="number" step="1" placeholder="0" value="` + textOlBlue + `" ` + textOlColorSetBoxDisable + `/>
            </div>
    </div>
    <div class="part">
        <p class="partTitle">边框</p>
        <div style="float: right;">
            <p>覆盖其他插件的设置</p>
            <label class="switch">
                <input id="bdCompelSwitch" type="checkbox" ` + bdCompelSwitchCheck + `/>
                <span class="slider button"></span>
            </label>
        </div>
        <div class="parting"></div>
            <div style="display: inline-block;">
                <p>边框宽度</p>
                <br />
                <input class="button textBox" id="bdWidthSetBox" type="number" step="1" placeholder="1" value="` + bdWidth + `"/>
                <p>px</p>
            </div>
            <div style="display: inline-block; margin-left: 60px;">
                <p>边框不透明度</p>
                <br />
                <input class="button textBox" id="bdTransSetBox" type="number" step="1" placeholder="10" value="` + bdTrans + `"/>
                <p>%</p>
            </div>
            <div style="display: inline-block;">
                <p>内边距</p>
                <br />
                <input class="button textBox" id="paddingSetBox" type="number" step="1" placeholder="0" value="` + padding + `"/>
                <p>px</p>
            </div>
            <div style="display: inline-block; margin-left: 60px;">
                <p>圆角大小</p>
                <br />
                <input class="button textBox" id="bdRadiusSetBox" type="number" step="1" placeholder="12" value="` + bdRadius + `"/>
                <p>px</p>
            </div>
            <br />
            <p>边框颜色</p>
            <br />
            <label class="radio">
                <input type="radio" id="bdColorDefaultRadio" name="bdColor" value="default" ` + bdColorDefaultRadioCheck +`/>
                <span class="slider button"></span>
            </label>
            <p>跟随主题色(不支持修改透明度咕咕咕)</p>
            <br />
            <label class="radio">
                <input type="radio" id="bdColorTextRadio" name="bdColor" value="text" ` + bdColorTextRadioCheck +`/>
                <span class="slider button"></span>
            </label>
            <p>跟随文本色(也不支持修改透明度口古)</p>
            <br />
            <div class="switchBinding">
                <label class="radio">
                    <input type="radio" id="bdColorCustomRadio" name="bdColor" value="custom" ` + bdColorCustomRadioCheck +`/>
                    <span class="slider button"></span>
                </label>
                <p>自定义颜色</p>
                <br />
                <p R>R</p>
                <input class="button textBox" id="bdRedSetBox" type="number" step="1" placeholder="127" value="` + bdRed + `" ` + bdColorSetBoxDisable + `/>
                <p G>G</p>
                <input class="button textBox" id="bdGreenSetBox" type="number" step="1" placeholder="127" value="` + bdGreen + `" ` + bdColorSetBoxDisable + `/>
                <p B>B</p>
                <input class="button textBox" id="bdBlueSetBox" type="number" step="1" placeholder="127" value="` + bdBlue + `" ` + bdColorSetBoxDisable + `/>
            </div>
            <label class="switch">
                <input id="noBdBgBlendSwitch" type="checkbox" ` + noBdBgBlendSwitchCheck + `/>
                <span class="slider button"></span> 
            </label>
            <p>不混合背景色</p>
    </div>
    <div class="part">
        <p class="partTitle">阴影</p>
        <div class="parting"></div>
            <div style="display: inline-block;">
                <p>X轴偏移量(正右负左)</p>
                <br />
                <input class="button textBox" id="shadowXSetBox" type="number" step="1" placeholder="0" value="` + shadowX + `"/>
                <p>px</p>
            </div>
            <div style="display: inline-block; margin-left: 24px;">
                <p>Y轴偏移量(正下负上)</p>
                <br />
                <input class="button textBox" id="shadowYSetBox" type="number" step="1" placeholder="1" value="` + shadowY + `"/>
                <p>px</p>
            </div>
            <div style="display: inline-block;">
                <p>阴影模糊半径</p>
                <br />
                <input class="button textBox" id="shadowBlurSetBox" type="number" step="1" placeholder="8" value="` + shadowBlur + `"/>
                <p>px</p>
            </div>
            <div style="display: inline-block; margin-left: 60px;">
                <p>阴影扩散半径(负值内收)</p>
                <br />
                <input class="button textBox" id="shadowSpreadSetBox" type="number" step="1" placeholder="-4" value="` + shadowSpread + `"/>
                <p>px</p>
            </div>
            <div style="display: inline-block;">
                <p>阴影不透明度</p>
                <br />
                <input class="button textBox" id="shadowTransSetBox" type="number" step="1" placeholder="30" value="` + shadowTrans + `"/>
                <p>%</p>
            </div>
            <br />
            <p>阴影颜色</p>
            <br /> <!---
            <label class="radio">
                <input type="radio" id="shadowColorNoneRadio" name="shadowColor" value="default" />
                <span class="slider button"></span>
            </label>
            <p>不指定颜色(不推荐)</p>
            <br /> --->
            <div class="switchBinding">
                <label class="radio">
                    <input type="radio" id="shadowColorCustomRadio" name="shadowColor" value="custom" checked/>
                    <span class="slider button"></span>
                </label>
                <p>自定义颜色</p>
                <br />
                <p R>R</p>
                <input class="button textBox" id="shadowRedSetBox" type="number" step="1" placeholder="0" value="` + shadowRed + `" />
                <p G>G</p>
                <input class="button textBox" id="shadowGreenSetBox" type="number" step="1" placeholder="0" value="` + shadowGreen + `" />
                <p B>B</p>
                <input class="button textBox" id="shadowBlueSetBox" type="number" step="1" placeholder="0" value="` + shadowBlue + `" />
            </div>
    </div>
    <div class="part">
        <p class="partTitle">杂项</p>
        <div class="parting"></div>
            <div class="switchBinding">
                <p>以数值形式自定义宽度</p>
                <label class="switch">
                    <input id="widthSwitch" type="checkbox" ` + widthSwitchCheck + `/>
                    <span class="slider button"></span>
                </label>
                <br />
                <div style="font-size: 14px; line-height: 16px;">
                    <p>(而不是拽着边框拖来拖去)</p>
                </div>
                <input class="button textBox" id="widthCustomSetBox" type="number" step="1" placeholder="400" value="` + widthCustom + `" ` + widthCustomSetBoxDisable + `/>
                <p>px</p>
                <br />
            </div>
            <label class="switch">
                <input id="centerOfBottomSwitch" type="checkbox" ` + centerOfBottomSwitchCheck + `/>
                <span class="slider button"></span>
            </label>
            <p>贴到底部并居中</p>
            <br />
            <label class="switch">
                <input id="doNotHideWithoutLyricsSwitch" type="checkbox" ` + doNotHideWithoutLyricsSwitchCheck + `/>
                <span class="slider button"></span>
            </label>
            <p>禁止无歌词/播放纯音乐时隐藏</p>
            <br />
            <label class="switch">
                <input id="multiline3Switch" type="checkbox" ` + multiline3SwitchCheck + `/>
                <span class="slider button"></span> 
            </label>
            <p>显示多行歌词(高度x3)</p>
            <br />
            <label class="switch">
                <input id="weltLeftRightSwitch" type="checkbox" ` + weltLeftRightSwitchCheck + `/>
                <span class="slider button"></span> 
            </label>
            <p>强制左右贴边(忽略自定义宽度)(测试)</p>
            <br />
            <label class="switch">
                <input id="noFadeLyricsSwitch" type="checkbox" ` + noFadeLyricsSwitchCheck + `/>
                <span class="slider button"></span>
            </label>
            <p>禁用左右歌词超出渐隐效果</p>
            <br />
            <label class="switch">
                <input id="mdThemeFloatBtBarBugFixSwitch" type="checkbox" ` + mdThemeFloatBtBarBugFixSwitchCheck + `/>
                <span class="slider button"></span>
            </label>
            <p>Material You悬浮底栏左对齐BUG修复</p>
            <br />
    </div></div>
    <div class="center">
        <div class="part centerInner" style="font-size: 14px; line-height: 18px;">
            <p>Version 1.0.0</p>
            <input class="link" style="float: right;" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/LyricBarBlur')" value="插件源代码(GitHub)" />
            <br />
            <p>by Lukoning</p>
            <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning')" value="GitHub" />
            <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://space.bilibili.com/1922780115')" value="bilibili" />
            <input class="link" style="float: right;" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/LyricBarBlur/issues')" value="问题反馈(GitHub issues)" />
        </div>
    </div>
    <br />
    <input class="button" id="bugton" type="button" value="zZZ" />
    `;

    //是否启用
    if (JSON.parse(localStorage.getItem("isLyricBarBlurEnable"))) {
        crCfgPage.querySelector("#mainSwitch").checked = true;
    } else {
        crCfgPage.querySelector("#mainSwitch").checked = false;
        let allInput = crCfgPage.querySelectorAll("input");
        for (i = 0; i < allInput.length; i++) {
            allInput[i].disabled = true;
        }
        crCfgPage.querySelector("#mainSwitch").disabled = false;
    }

    //创建监听器
    let allSets = crCfgPage.querySelectorAll(".textBox, .switch, .radio");
    for (i = 1; i < allSets.length; i++) {
        allSets[i].addEventListener("change", () => {
            disableSaveCancel(false);
        });
    }

    crCfgPage.querySelector("#saveButton").addEventListener("click", saveCfg);
    crCfgPage.querySelector("#cancelButton").addEventListener("click",  () => {
        cancel();
    });
    crCfgPage.querySelector("#resetButton").addEventListener("click", backToDefault);
    crCfgPage.querySelector("#mainSwitch").addEventListener("change", onOffAllSets);
    crCfgPage.querySelector("#bugton").addEventListener("click", what);

    let allInput = crCfgPage.querySelectorAll("input");
    for (i = 0; i < allInput.length; i++) {
        allInput[i].addEventListener("click", () => {
            onOffAnySets();
        });
    }
    return crCfgPage;
});