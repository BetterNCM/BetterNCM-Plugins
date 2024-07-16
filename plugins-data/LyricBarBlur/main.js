var readCfg = JSON.parse(localStorage.getItem("LyricBarBlurSettings"));
let crStyle = document.createElement("style");
let cfgDefault = ({
    blur: 12,
    blurCompel: false,
    bgTrans: 0.75,
    bgColor: false,
    bgRed: 0,
    bgGreen: 120,
    bgBlue: 215,
    bgCompel: false,
    fonts: "default",
    customFonts: "\"华文彩云\"",
    textTrans: 1,
    textColor: false,
    textRed: 255,
    textGreen: 255,
    textBlue: 255,
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
    bdTrans: 0.05,
    bdRadius: 12,
    bdColor: "custom",
    bdRed: 255,
    bdGreen: 255,
    bdBlue: 255,
    bdCompel: false,
    isWidthEnable: false,
    widthCustom: 400,
    centerOfBottom: false,
    doNotHideWithoutLyrics: true,
    multiline3: false,
    weltLeftRight: false,
    noFadeLyrics: false,
});

function resetStyles() { //应用新设置
    if (!JSON.parse(localStorage.getItem("isLyricBarBlurEnable"))) { //清空！
        try {
            document.querySelector("#LyricBarBlurStyles").innerHTML = ``;
        } catch {
            crStyle.innerHTML = ``;
        }
        console.log("LBB Disabled");
        return;
    }

    let readCfg = JSON.parse(localStorage.getItem("LyricBarBlurSettings"));

    var blur = readCfg.blur
    var bgTrans = readCfg.bgTrans
    if (bgTrans == undefined || bgTrans == null || bgTrans == NaN) {
        var bgTrans = readCfg.trans
        var bgRed = readCfg.colorRed
        var bgGreen = readCfg.colorGreen
        var bgBlue = readCfg.colorBlue
    } else {
        var bgTrans = readCfg.bgTrans
        var bgRed = readCfg.bgRed
        var bgGreen = readCfg.bgGreen
        var bgBlue = readCfg.bgBlue
    }

    if (readCfg.blurCompel) {
        var isBlurCompel = "!important";
    } else {
        var isBlurCompel = "";
    }

    if (readCfg.bgCompel || readCfg.colorCompel) {
        var isBgCompel = "!important";
    } else {
        var isBgCompel = "";
    }

    if (readCfg.textCompel) {
        var isTextCompel = "!important";
    } else {
        var isTextCompel = "";
    }

    if (readCfg.bdCompel) {
        var isBdCompel = "!important";
    } else {
        var isBdCompel = "";
    }

    var cssLbTop = `
    .lyric-bar {
        --lbb-text-outline-width: ` + readCfg.textOlWidth + `px;
        --lbb-text-outline-color: rgba(` + readCfg.textOlRed + `, ` + readCfg.textOlGreen + `, ` + readCfg.textOlBlue + `, ` + readCfg.textOlTrans + `);
        opacity: 1 !important;
        transition: opacity .35s, all .5s !important;
    `;
    var cssLbiTop = `
    .lyric-bar-inner * {
    `;
    var cssBgDefault = ` 
        background: linear-gradient(0deg, rgba(var(--md-accent-color-rgb, var(--ncm-fg-rgb)), ` + bgTrans/10 +`), rgba(var(--md-accent-color-rgb, var(--ncm-fg-rgb)), ` + bgTrans/10 +`)), rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), ` + bgTrans +`) ` + isBgCompel + `;
    `;
    var cssBgCustom = `
        background: rgba(` + bgRed + `,` + bgGreen + `,` + bgBlue + `,` + bgTrans +`) ` + isBgCompel + `;
    `;
    var cssBgBlur = `
        backdrop-filter: blur(` + blur + `px) ` + isBlurCompel + `;
    `;
    var cssFontsRnp = `
        font-family: ` + localStorage.getItem("refined-now-playing-font-family").replace("[", "").replace("]", "") + `;
    `;
    var cssFontsCustom = `
        font-family: ` + readCfg.customFonts + `;
    `;
    var cssTextTrans = `
    `;
    var cssTextTransAll = `
    .lyric-bar .rnp-lyrics .rnp-lyrics-line[offset="0"] > div > div.rnp-lyrics-line-karaoke .rnp-karaoke-word {
        opacity: ` + readCfg.textTrans + isTextCompel + `;
    }
    .lyric-bar .rnp-lyrics .rnp-lyrics-line:not([offset="0"]) > div > div.rnp-lyrics-line-karaoke .rnp-karaoke-word {
        opacity: ` + readCfg.textTrans/2.5 + isTextCompel + `;
    }
    .lyric-bar .rnp-lyrics .rnp-lyrics-line .rnp-lyrics-single-line-wrapper > *:not(.rnp-lyrics-line-karaoke) {
        opacity: ` + readCfg.textTrans + isTextCompel + `;
    }
    .lyric-bar .rnp-lyrics .rnp-lyrics-line.rnp-interlude[offset="0"] .rnp-interlude-inner {
        opacity: ` + readCfg.textTrans + isTextCompel + `;
    } 
    `;
    var cssTextCustom = `
        --lbb-custom-text-color: rgba(` + readCfg.textRed + `,` + readCfg.textGreen + `,` + readCfg.textBlue + `,` + readCfg.textTrans + `);
    `;
    var cssTextCustomLbi = `
        --rnp-accent-color-shade-2: var(--lbb-custom-text-color) ` + isTextCompel + `;
        color: var(--lbb-custom-text-color) ` + isTextCompel + `;
    `;
    var cssTextOlShadow = `
        text-shadow:
            var(--lbb-text-outline-width) var(--lbb-text-outline-width) var(--lbb-text-outline-color),
            calc(var(--lbb-text-outline-width) * -1) var(--lbb-text-outline-width) var(--lbb-text-outline-color),
            calc(var(--lbb-text-outline-width) * -1) calc(var(--lbb-text-outline-width) * -1) var(--lbb-text-outline-color),
            var(--lbb-text-outline-width) calc(var(--lbb-text-outline-width) * -1) var(--lbb-text-outline-color)
            ` + isTextCompel + `;
    `;
    var cssTextOlStroke = `
        -webkit-text-stroke: var(--lbb-text-outline-width) var(--lbb-text-outline-color) ` + isTextCompel + `;
    `;
    var cssWidth = `
        --lyric-bar-width: ` + readCfg.widthCustom + `px !important;
    `;
    var cssPadding = `
        padding: ` + readCfg.padding + `px ` + isBdCompel + `;
    `;
    var cssBdWidth = `
        border: ` + readCfg.bdWidth + `px solid;
    `;
    var cssBdDefault = `
        border-color: var(--themeC1) ` + isBdCompel + `;
    `;
    var cssBdText = `
        border-color: var(--lbb-custom-text-color, var(--md-accent-color, var(--ncm-text)));
    `;
    var cssBdCustom = `
        border-color: rgba(` + readCfg.bdRed + `,` + readCfg.bdGreen + `,` + readCfg.bdBlue + `,` + readCfg.bdTrans +`) ` + isBdCompel + `;
    `;
    var cssBdRadius = `
        border-radius: ` + readCfg.bdRadius + `px ` + isBdCompel + `;
    `;
    var cssCobAll = `
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
    var cssDnhwolAll = `
    .lyric-bar.no-lyrics {
        opacity: 1 !important; 
        pointer-events: auto;
    }
    `;
    var cssLbMl3 = `
        height: calc(var(--lyric-bar-height)*3);
    `;
    var cssWeltLeftRight = `
        width: clamp(200px, 100%, 100vw - var(--sidebar-width, 199px) - (2px * ` + readCfg.bdWidth + `px)) !important; 
    `;
    var cssWlrFloatBtBarAll = `
    body.floating-bottombar .lyric-bar {
        right: calc(50vw - var(--bottombar-width)/2) !important;
        left: calc(50vw - var(--bottombar-width)/2) !important;
        z-index: 152 !important;
    }
    .MoTheme-bottomMusicBar_dockMode .lyric-bar {
        right: calc(10px + var(--extra-pos-margin, 0px)) !important;
    }
    `;
    var cssWlrAndCobFloatBtBarAll = `
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
    var cssWlrOrCobFloatBtBar = `
        right: calc(1px + var(--extra-pos-margin, 0px)) !important;
        left: calc(var(--leftbar-width, 199px) + var(--extra-pos-margin, 0px)) !important;
    `;
    var cssNoFadeLyrics = `
        --mask-image: unset !important;
    `;
    var cssEnd = `
    }
    `;

    var cssIn = cssLbTop + cssBgBlur + cssPadding + cssBdRadius;

    if (readCfg.bgColor || readCfg.color) {
        var cssIn = cssIn + cssBgCustom;
    } else {
        var cssIn = cssIn + cssBgDefault;
    }

    if (readCfg.textColor) { 
        var cssIn = cssIn + cssTextCustom;
    }

    if (readCfg.textOl) {
        var olw = readCfg.textOlWay;
        if (olw == "shadow") {
            var cssIn = cssIn + cssTextOlShadow;
        } 
        if (olw == "stroke") {
            var cssIn = cssIn + cssTextOlStroke;
        }
        console.log(olw);
    }

    var bdc = readCfg.bdColor
    var cssIn = cssIn + cssBdWidth;
    if (bdc == "default") {
        var cssIn = cssIn + cssBdDefault;
    }
    if (bdc == "text") {
        var cssIn = cssIn + cssBdText;
    }
    if (bdc == "custom") {
        var cssIn = cssIn + cssBdCustom;
    }

    var f = readCfg.fonts;
    try {
        document.querySelector(".lyric-bar").classList.remove("g-single-track");
        document.querySelector(".lyric-bar-inner").classList.remove("lyric");
        if (f == "rnp") {
            var cssIn = cssIn + cssFontsRnp;
            document.querySelector(".lyric-bar").classList.add("g-single-track");
            document.querySelector(".lyric-bar-inner").classList.add("lyric");
            console.log("yes");
        }
    } catch { console.log("LyricBarBlur classList edit fail"); }

    if (readCfg.isWidthEnable) {
        var cssIn = cssIn + cssWidth;
    }

    if (readCfg.multiline3) {
        var cssIn = cssIn + cssLbMl3 + ``;
    }

    if (readCfg.weltLeftRight) {
        var cssIn = cssIn + cssWeltLeftRight;
    }

    if (readCfg.weltLeftRight || readCfg.centerOfBottom) {
        var cssIn = cssIn + cssWlrOrCobFloatBtBar;
    }

    if (readCfg.noFadeLyrics) {
        var cssIn = cssIn + cssNoFadeLyrics;
    }

    var cssIn = cssIn + cssEnd;

    if (readCfg.textColor) {
        var cssTextTransAll = " ";
    }
    var cssIn = cssIn + cssTextTransAll;

    var cssIn = cssIn + cssLbiTop;

    if (readCfg.textColor) { 
        var cssIn = cssIn + cssTextCustomLbi;
    }

    if (f == "custom") {
        var cssIn = cssIn + cssFontsCustom;
    }

    var cssIn = cssIn + cssEnd;

    if (readCfg.centerOfBottom) {
        var cssIn = cssIn + cssCobAll;
    }

    if (readCfg.doNotHideWithoutLyrics) {
        var cssIn = cssIn + cssDnhwolAll;
    }

    if (readCfg.weltLeftRight) {
        var cssIn = cssIn + cssWlrFloatBtBarAll;
    }

    if (readCfg.weltLeftRight && readCfg.centerOfBottom) {
        var cssIn = cssIn + cssWlrAndCobFloatBtBarAll;
    }

    try {
        document.querySelector("#LyricBarBlurStyles").innerHTML = cssIn;
    } catch {
        crStyle.innerHTML = cssIn;
    }

    console.log(readCfg.fonts);
    console.log("reset styles");
};

function disableSaveCancel(onoff) {
    if (onoff) {
        document.querySelector("#saveButton").disabled = true;
        document.querySelector("#cancelButton").disabled = true;
    } else {
        document.querySelector("#saveButton").disabled = false;
        document.querySelector("#cancelButton").disabled = false;
    }
}


function onOffAnySets() {
    var SoRInput = document.querySelectorAll(".switchBinding label:nth-of-type(1) input");
    for (n = 0; n < SoRInput.length; n++) {
        var isChecked = SoRInput[n].checked;
        var allInput = document.querySelectorAll(".switchBinding")[n].querySelectorAll("input");
        if (SoRInput[n].disabled) {
            for (i = 1; i < allInput.length; i++) {
                allInput[i].disabled = true;
            }
        } else {
            for (i = 1; i < allInput.length; i++) {
                allInput[i].disabled = !isChecked;
            }
        }
    }

    var SoRInputDisabled = document.querySelectorAll(".switchBinding label:nth-of-type(1) input:disabled");
    for (n = 0; n < SoRInputDisabled.length; n++) {
        var allInput = document.querySelectorAll(".switchBinding")[n].querySelectorAll("input");
    }
}
function onOffAllSets() {
    var isChecked = document.querySelector("#mainSwitch").checked;
    var allInput = document.querySelectorAll("input");
    for (i = 0; i < allInput.length; i++) {
        allInput[i].disabled = !isChecked;
    }
    if (isChecked == true) {
        onOffAnySets();
    }
    document.querySelector("#mainSwitch").disabled = false;
    localStorage.setItem("isLyricBarBlurEnable", isChecked);
    console.log(localStorage.getItem("isLyricBarBlurEnable"));
    resetStyles();
}

function writeCfg(Cfg) { //写配置
    localStorage.setItem("LyricBarBlurSettings", JSON.stringify(Cfg));
};

function saveCfg() { //保存设置

    //获取纯数字设置
    function getNumSet(name, min, max) {
        let bName = name + "SetBox";
        var set = document.getElementById(bName).value;

        //对字符串进行处理
        if (set == "undefined" || set == "null" || set == "") {
            var set = document.getElementById(bName).placeholder;
        };
        //转换为数字
        var setNum = set*1;
        //检查合法值
        if (min != "n" && setNum < min) {
            setNum = min;
            document.getElementById(bName).value = min;
        }
        if (max != "n" && setNum > max) {
            setNum = max;
            document.getElementById(bName).value = max;
        };
        return setNum;
    };

    //获取文本设置
    function getTextSet(name) {
        let bName = name + "SetBox";
        var set = document.getElementById(bName).value;

        if (set == "undefined" || set == "null" || set == "") {
            var set = document.getElementById(bName).placeholder;
        };
        return set;
    };

    //获取开关设置
    function getSwitchSet(name) {
        let sName = name + "Switch";
        var set = document.getElementById(sName).checked;
        return set;
    };

    //获取单选项设置
    function getRadioSet(name) {
        var sets = document.getElementsByName(name);
        for (i = 0; i < sets.length; i++) {
            if(sets[i].checked) {
                var set = sets[i].value
            }
        }
        return set;
    };

    var blur = getNumSet("blur", 0, "n");
    var blurCompel = getSwitchSet("blurCompel");
    var bgTrans = getNumSet("bgTrans", 0, 100)/100;
    var bgColor = getSwitchSet("bgColor");
    var bgRed = getNumSet("bgRed", 0, 255);
    var bgGreen = getNumSet("bgGreen", 0, 255);
    var bgBlue = getNumSet("bgBlue", 0, 255);
    var bgCompel = getSwitchSet("bgCompel");
    var fonts = getRadioSet("fonts");
    var customFonts = getTextSet("fonts");
    var textTrans = getNumSet("textTrans", 0, 100)/100;
    var textColor = getSwitchSet("textColor");
    var textRed = getNumSet("textRed", 0, 255);
    var textGreen = getNumSet("textGreen", 0, 255);
    var textBlue = getNumSet("textBlue", 0, 255);
    var textOl = getSwitchSet("textOl");
    var textOlWay = getRadioSet("textOlWay");
    var textOlWidth = getNumSet("textOlWidth", 0, "n");
    var textOlTrans = getNumSet("textOlTrans", 0, 100)/100;
    var textOlColor = getRadioSet("textOlColor");
    var textOlRed = getNumSet("textOlRed", 0, 255);
    var textOlGreen = getNumSet("textOlGreen", 0, 255);
    var textOlBlue = getNumSet("textOlBlue", 0, 255);
    var textCompel = getSwitchSet("textCompel");
    var padding = getNumSet("padding", 0, "n");
    var bdWidth = getNumSet("bdWidth", 0, "n");
    var bdTrans = getNumSet("bdTrans", 0, 100)/100;
    var bdRadius = getNumSet("bdRadius", 0, "n");
    var bdColor = getRadioSet("bdColor");
    var bdRed = getNumSet("bdRed", 0, 255);
    var bdGreen = getNumSet("bdGreen", 0, 255);
    var bdBlue = getNumSet("bdBlue", 0, 255);
    var bdCompel = getSwitchSet("bdCompel");
    var isWidthEnable = getSwitchSet("width");
    var widthCustom = getNumSet("widthCustom", 200, "n");
    var centerOfBottom = getSwitchSet("centerOfBottom");
    var doNotHideWithoutLyrics = getSwitchSet("doNotHideWithoutLyrics");
    var multiline3 = getSwitchSet("multiline3");
    var weltLeftRight = getSwitchSet("weltLeftRight");
    var noFadeLyrics = getSwitchSet("noFadeLyrics");

    var cfgWillWrite = ({
        blur,
        blurCompel,
        bgTrans,
        bgColor,
        bgRed,
        bgGreen,
        bgBlue,
        bgCompel,
        fonts,
        customFonts,
        textTrans,
        textColor,
        textRed,
        textGreen,
        textBlue,
        textOl,
        textOlWay,
        textOlWidth,
        textOlTrans,
        textOlColor,
        textOlRed,
        textOlGreen,
        textOlBlue,
        textCompel,
        padding,
        bdWidth,
        bdTrans,
        bdRadius,
        bdColor,
        bdRed,
        bdGreen,
        bdBlue,
        bdCompel,
        isWidthEnable,
        widthCustom,
        centerOfBottom,
        doNotHideWithoutLyrics,
        multiline3,
        weltLeftRight,
        noFadeLyrics,
    });

    writeCfg(cfgWillWrite);

    if (isWidthEnable) {
        localStorage.setItem("lyric-bar-lyric-bar-width", widthCustom + "px");
    }
    console.log("save settings");
    resetStyles();
    disableSaveCancel(true);
};

function cancel() {
    var readCfg = JSON.parse(localStorage.getItem("LyricBarBlurSettings"));
    var d = document;
    d.querySelector("#blurSetBox").value = readCfg.blur;
    d.querySelector("#blurCompelSwitch").checked = readCfg.blurCompel;
    d.querySelector("#bgTransSetBox").value = readCfg.bgTrans*100;
    d.querySelector("#bgColorSwitch").checked = readCfg.bgColor;
    d.querySelector("#bgRedSetBox").value = readCfg.bgRed;
    d.querySelector("#bgGreenSetBox").value = readCfg.bgGreen;
    d.querySelector("#bgBlueSetBox").value = readCfg.bgBlue;
    d.querySelector("#bgCompelSwitch").checked = readCfg.bgCompel;
    var f = readCfg.fonts;
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
    d.querySelector("#textColorSwitch").checked = readCfg.textColor;
    d.querySelector("#textRedSetBox").value = readCfg.textRed;
    d.querySelector("#textGreenSetBox").value = readCfg.textGreen;
    d.querySelector("#textBlueSetBox").value = readCfg.textBlue;
    d.querySelector("#textOlSwitch").checked = readCfg.textOl;
    var olw = readCfg.textOlWay;
    if (olw == "shadow") {
        d.querySelector("#textOlWayShadowRadio").checked = true;
    }
    if (olw == "stroke") {
        d.querySelector("#textOlWayStrokeRadio").checked = true;
    }
    d.querySelector("#textOlWidthSetBox").value = readCfg.textOlWidth;
    d.querySelector("#textOlTransSetBox").value = readCfg.textOlTrans*100;
    var olc = readCfg.textOlColor;
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
    var bdc = readCfg.bdColor;
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
    d.querySelector("#bdCompelSwitch").checked = readCfg.bdCompel;
    d.querySelector("#widthSwitch").checked = readCfg.isWidthEnable;
    d.querySelector("#widthCustomSetBox").value = readCfg.widthCustom;
    d.querySelector("#centerOfBottomSwitch").checked = readCfg.centerOfBottom;
    d.querySelector("#doNotHideWithoutLyricsSwitch").checked = readCfg.doNotHideWithoutLyrics;
    d.querySelector("#multiline3Switch").checked = readCfg.multiline3;
    d.querySelector("#weltLeftRightSwitch").checked = readCfg.weltLeftRight;
    d.querySelector("#noFadeLyricsSwitch").checked = readCfg.noFadeLyrics;
    console.log("cancel");
    disableSaveCancel(true);
}

function resetCfg() { //重置设置
    localStorage.removeItem("LyricBarBlurSettings");
    writeCfg(cfgDefault);
    console.log("reset settings");
    resetStyles();
};

function backToDefault() {
    resetCfg();
    cancel();
}

plugin.onAllPluginsLoaded(() => { //插件初始化
    if (!readCfg) { //初始化设置
        resetCfg();
        localStorage.setItem("isLyricBarBlurEnable", true);
    };
    //初始化样式
    crStyle.setAttribute("id", "LyricBarBlurStyles");
    resetStyles();
    document.head.appendChild(crStyle);
});

plugin.onConfig(() => {
    //设置读取
    try {
        var blur = readCfg.blur
        var bgTrans = readCfg.bgTrans*100
        var bgRed = readCfg.bgRed
        var bgGreen = readCfg.bgGreen
        var bgBlue = readCfg.bgBlue
        var textTrans = readCfg.textTrans*100
        var textRed = readCfg.textRed
        var textGreen = readCfg.textGreen
        var textBlue = readCfg.textBlue
        var textOlWidth = readCfg.textOlWidth
        var textOlTrans = readCfg.textOlTrans*100
        var textOlRed = readCfg.textOlRed
        var textOlGreen = readCfg.textOlGreen
        var textOlBlue = readCfg.textOlBlue
        var padding = readCfg.padding
        var bdWidth = readCfg.bdWidth
        var bdTrans = readCfg.bdTrans*100
        var bdRadius = readCfg.bdRadius
        var bdRed = readCfg.bdRed
        var bdGreen = readCfg.bdGreen
        var bdBlue = readCfg.bdBlue
        var widthCustom = readCfg.widthCustom

        if (readCfg.blurCompel) {
        var blurCompelSwitchCheck = "Checked";
        }

        if (readCfg.bgCompel) {
            var bgCompelSwitchCheck = "Checked";
        }
        if (readCfg.bgColor) {
            var bgColorSwitchCheck = "Checked";
        } else {
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
        if (readCfg.textColor) {
            var textColorSwitchCheck = "Checked";
        } else {
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

        var customFonts = readCfg.customFonts.replaceAll("\"", "&quot;");
    } catch {
        //v0.1配置兼容
        try {
            var blur = readCfg.blur
            var bgTrans = readCfg.trans*100
            var bgRed = readCfg.colorRed
            var bgGreen = readCfg.colorGreen
            var bgBlue = readCfg.colorBlue
            if (readCfg.blurCompel) {
                var blurCompelSwitchCheck = "Checked";
            }
            
            if (readCfg.color) {
                var bgColorSwitchCheck = "Checked";
                var bgColorSetBoxDisable = "";
            } else {
                var bgColorSetBoxDisable = "Disabled";
            }
            
            if (readCfg.colorCompel) {
                var bgCompelSwitchCheck = "Checked";
            }
        } catch { //第一次加载插件时加载默认设置
            var blur = 12
            var bgTrans = 75
            var bgRed = 0
            var bgGreen = 120
            var bgBlue = 215
            var bgColorSetBoxDisable = "Disabled";
        };
        var textTrans = 100
        var textRed = 255
        var textGreen = 255
        var textBlue = 255
        var fontsDefaultRadioCheck = "Checked";
        var fontsSetBoxDisable = "Disabled";
        var defaultFont = `"华文彩云"`;
        var customFonts = defaultFont.replaceAll("\"", "&quot;");
        var textColorSetBoxDisable = "Disabled";
        var textOlSetsDisable = "Disabled";
        var textOlWayShadowRadioCheck = "Checked";
        var textOlWidth = 0.5
        var textOlTrans = 100
        var textOlColorCustomRadioCheck = "Checked";
        var textOlColorSetBoxDisable = "Disabled";
        var textOlRed = 0
        var textOlGreen = 0
        var textOlBlue = 0
        var padding = 0
        var bdWidth = 1
        var bdTrans = 5
        var bdRadius = 12
        var bdColorCustomRadioCheck = "Checked";
        var bdRed = 255
        var bdGreen = 255
        var bdBlue = 255
        //var bdColorSetBoxDisable = "Disabled";
        var widthCustomSetBoxDisable = "Disabled";
        var widthCustom = 400
        var doNotHideWithoutLyricsSwitchCheck = "Checked";
    };

    //创建DOM
    let crCfgPage = document.createElement("div");
    crCfgPage.setAttribute("id", "LyricBarBlurSettings");
    crCfgPage.innerHTML = `
    <style>
        #LyricBarBlurSettings {
            --lbbs-fg: var(--themeC1);
            --lbbs-bg: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), .3);
            --lbbs-bg-wot: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), 1);
            color: var(--md-accent-color-secondary, var(--ncm-text));
            width: 420px;
            margin: 0 auto 120px 0;
            line-height: 45px;
            font-size: 16px;
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
            background: #888888;
        }

        #LyricBarBlurSettings .part {
            display: inline-block;
            vertical-align: top;
            width: 420px;
            outline: 0;
            margin: 5px 0 0 0;
            padding: 15px 25px;
            border: 1px solid var(--lbbs-fg);
            border-radius: 12px;
            box-shadow: 0 0 3px var(--lbbs-fg);
            background: var(--lbbs-bg);
            backdrop-filter: blur(12px);
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
        #LyricBarBlurSettings .titlePart {
            width: 420px;
            margin: 0;
        }

        #LyricBarBlurSettings .topBar {
            height: 50px;
            padding: 5px 70px;
            position: sticky;
            top: -20px;
            z-index: 1;
            pointer-events: none;
        }
        #LyricBarBlurSettings .topBar > * {
            backdrop-filter: blur(12px);
            pointer-events: auto;
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
            color: #888888;
            box-shadow: 0 0 3px #888888;
            border: 1px solid #888888;
            background: var(--lbbs-bg);
        }
        #LyricBarBlurSettings .button:disabled:hover {
            box-shadow: 0 0 6px #888888;
        }
        #LyricBarBlurSettings .button:disabled:active {
            font-size: 16px;
            border-width: 1px;
            box-shadow: 0 0 6px #888888;
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
            margin: 10px 0;
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
            border: 1px solid #888888;
            box-shadow: 0 0 3px #888888;
        }
        #LyricBarBlurSettings input:disabled + .slider:hover {
            box-shadow: 0 0 6px #888888; 
        }
        #LyricBarBlurSettings input:disabled + .slider:active {
            border-width: 1px;
            box-shadow: 0 0 6px #888888;
        }
        #LyricBarBlurSettings input:disabled:checked + .slider {
            border: 1px solid #909090;
            background: #888888;
        }
        #LyricBarBlurSettings .radio input:disabled:checked + .slider {
            border-color: #888888;
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
            background: #888888;
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
            background: #888888;
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
    </style>
    <div class="part titlePart">
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
    <div class="topBar">
        <input class="button" id="saveButton" type="button" value="应用" disabled/>
        <input class="button" id="cancelButton" type="button" value="撤销" disabled/>
        <input class="button" id="resetButton" type="button" value="重置" />
    </div>
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
            <p>注意: 模糊程度过高可能会导致背景闪烁。</p>
        </div>
        <div class="parting"></div>
            <p>背景模糊程度</p>
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
            <div class="switchBinding">
                <p>自定义背景颜色</p>
                <label class="switch">
                    <input id="bgColorSwitch" type="checkbox" ` + bgColorSwitchCheck + `/>
                    <span class="slider button"></span>
                </label>
                <br />
                <p style="color: #F00; text-shadow: 0 1px 10px #F00;">R</p>
                <input class="button textBox" id="bgRedSetBox" type="number" step="1" placeholder="0" value="` + bgRed + `" ` + bgColorSetBoxDisable + `/>
                <p style="color: #0F0; text-shadow: 0 1px 10px #0F0;">G</p>
                <input class="button textBox" id="bgGreenSetBox" type="number" step="1" placeholder="120" value="` + bgGreen + `" ` + bgColorSetBoxDisable + `/>
                <p style="color: #00F; text-shadow: 0 1px 10px #00F;">B</p>
                <input class="button textBox" id="bgBlueSetBox" type="number" step="1" placeholder="215" value="` + bgBlue + `" ` + bgColorSetBoxDisable + `/>
            </div>
    </div>
    <div class="part">
        <p class="partTitle">文字</p>
        <div style="float: right;">
            <p>覆盖其他插件的设置</p>
            <label class="switch">
                <input id="textCompelSwitch" type="checkbox" ` + textCompelSwitchCheck + `/>
                <span class="slider button"></span>
            </label>
        </div>
        <div class="parting"></div>
            <p>字体</p>
            <br />
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
            <p>使用RefinedNowPlaying内设置的字体(测试)</p>
            <br />
            <div class="switchBinding">
                <label class="radio">
                    <input type="radio" id="fontsCustomRadio" name="fonts" value="custom" ` + fontsCustomRadioCheck + ` />
                    <span class="slider button"></span>
                </label>
                <p>使用自定义字体(CSS font-family)</p>
                <br />
                <input class="button textBox" id="fontsSetBox" type="search" placeholder='"华文彩云"' value="` + customFonts + `" ` + fontsSetBoxDisable + `/>
            </div>
        <div class="parting"></div>
            <p>文本不透明度(测试 · 不稳定)</p>  
            <br />
            <input class="button textBox" id="textTransSetBox" type="number" step="1" placeholder="100" value="` + textTrans + `"/>
            <p>%</p>
            <br /> 
            <div class="switchBinding">
                <p>自定义文本颜色</p>
                <label class="switch">
                    <input id="textColorSwitch" type="checkbox" ` + textColorSwitchCheck + `/>
                    <span class="slider button"></span>
                </label>
                <br />
                <p style="color: #F00; text-shadow: 0 1px 10px #F00;">R</p>
                <input class="button textBox" id="textRedSetBox" type="number" step="1" placeholder="255" value="` + textRed + `" ` + textColorSetBoxDisable + `/>
                <p style="color: #0F0; text-shadow: 0 1px 10px #0F0;">G</p>
                <input class="button textBox" id="textGreenSetBox" type="number" step="1" placeholder="255" value="` + textGreen + `" ` + textColorSetBoxDisable + `/>
                <p style="color: #00F; text-shadow: 0 1px 10px #00F;">B</p>
                <input class="button textBox" id="textBlueSetBox" type="number" step="1" placeholder="255" value="` + textBlue + `" ` + textColorSetBoxDisable + `/>
            </div>
        <div class="parting"></div>
            <div class="switchBinding">
                <p>文本描边</p>
                <label class="switch">
                    <input id="textOlSwitch" type="checkbox" ` + textOlSwitchCheck + `/>
                    <span class="slider button"></span>
                </label>
                <br />
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
                <p>文本描边宽度</p>
                <br />
                <input class="button textBox" id="textOlWidthSetBox" type="number" step="0.1" placeholder="0.5" value="` + textOlWidth + `" ` + textOlSetsDisable + `/>
                <p>px</p>
                <br />
                <p>文本描边不透明度</p>
                <br />
                <input class="button textBox" id="textOlTransSetBox" type="number" step="1" placeholder="100" value="` + textOlTrans + `" ` + textOlSetsDisable + `/>
                <p>%</p>
                <br />
                <p>文本描边颜色</p>
                <div class="switchBinding">
                    <label class="radio">
                        <input type="radio" id="textOlColorCustomRadio" name="textOlColor" value="custom" ` + textOlColorCustomRadioCheck + ` ` + textOlSetsDisable + `/>
                        <span class="slider button"></span>
                    </label>
                    <p>自定义颜色</p>
                    <br />
                    <p style="color: #F00; text-shadow: 0 1px 10px #F00;">R</p>
                    <input class="button textBox" id="textOlRedSetBox" type="number" step="1" placeholder="0" value="` + textOlRed + `" ` + textOlColorSetBoxDisable + `/>
                    <p style="color: #0F0; text-shadow: 0 1px 10px #0F0;">G</p>
                    <input class="button textBox" id="textOlGreenSetBox" type="number" step="1" placeholder="0" value="` + textOlGreen + `" ` + textOlColorSetBoxDisable + `/>
                    <p style="color: #00F; text-shadow: 0 1px 10px #00F;">B</p>
                    <input class="button textBox" id="textOlBlueSetBox" type="number" step="1" placeholder="0" value="` + textOlBlue + `" ` + textOlColorSetBoxDisable + `/>
                </div>
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
            <p>内边距</p>
            <br />
            <input class="button textBox" id="paddingSetBox" type="number" step="1" placeholder="0" value="` + padding + `"/>
            <p>px</p>
            <br />
            <p>边框宽度</p>
            <br />
            <input class="button textBox" id="bdWidthSetBox" type="number" step="1" placeholder="1" value="` + bdWidth + `"/>
            <p>px</p>
            <br />
            <p>边框不透明度</p>
            <br />
            <input class="button textBox" id="bdTransSetBox" type="number" step="1" placeholder="5" value="` + bdTrans + `"/>
            <p>%</p>
            <br />
            <p>圆角大小</p>
            <br />
            <input class="button textBox" id="bdRadiusSetBox" type="number" step="1" placeholder="12" value="` + bdRadius + `"/>
            <p>px</p>
            <br />
            <p>边框颜色</p>
            <br />
            <label class="radio">
                <input type="radio" id="bdColorDefaultRadio" name="bdColor" value="default" ` + bdColorDefaultRadioCheck +`/>
                <span class="slider button"></span>
            </label>
            <p>使用主题色(不支持修改透明度咕咕咕)</p>
            <br />
            <label class="radio">
                <input type="radio" id="bdColorTextRadio" name="bdColor" value="text" ` + bdColorTextRadioCheck +`/>
                <span class="slider button"></span>
            </label>
            <p>使用文本色(也不支持修改透明度口古)</p>
            <br />
            <div class="switchBinding">
                <label class="radio">
                    <input type="radio" id="bdColorCustomRadio" name="bdColor" value="custom" ` + bdColorCustomRadioCheck +`/>
                    <span class="slider button"></span>
                </label>
                <p>自定义颜色</p>
                <br />
                <p style="color: #F00; text-shadow: 0 1px 10px #F00;">R</p>
                <input class="button textBox" id="bdRedSetBox" type="number" step="1" placeholder="255" value="` + bdRed + `" ` + bdColorSetBoxDisable + `/>
                <p style="color: #0F0; text-shadow: 0 1px 10px #0F0;">G</p>
                <input class="button textBox" id="bdGreenSetBox" type="number" step="1" placeholder="255" value="` + bdGreen + `" ` + bdColorSetBoxDisable + `/>
                <p style="color: #00F; text-shadow: 0 1px 10px #00F;">B</p>
                <input class="button textBox" id="bdBlueSetBox" type="number" step="1" placeholder="255" value="` + bdBlue + `" ` + bdColorSetBoxDisable + `/>
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
    </div>
    <div class="part" style="font-size: 14px; line-height: 16px;">
        <p>Version 0.2.6</p>
        <input class="link" style="float: right;" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/LyricBarBlur')" value="源代码(GitHub)" />
        <br />
        <p>by Lukoning</p>
        <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning')" value="GitHub" />
        <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://space.bilibili.com/1922780115')" value="bilibili" />
        <input class="link" style="float: right;" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/LyricBarBlur/issues')" value="问题反馈(GitHub issues)" />
    </div>
    `;

    //是否启用
    if (JSON.parse(localStorage.getItem("isLyricBarBlurEnable"))) {
        crCfgPage.querySelector("#mainSwitch").checked = true;
    } else {
        crCfgPage.querySelector("#mainSwitch").checked = false;
        var allInput = crCfgPage.querySelectorAll("input");
        for (i = 0; i < allInput.length; i++) {
            allInput[i].disabled = true;
        }
        crCfgPage.querySelector("#mainSwitch").disabled = false;
    }

    //创建监听器
    var allSets = crCfgPage.querySelectorAll(".textBox, .switch, .radio");
    for (i = 1; i < allSets.length; i++) {
        allSets[i].addEventListener("change", () => {
            disableSaveCancel(false);
        });
    }

    crCfgPage.querySelector("#saveButton").addEventListener("click", saveCfg);
    crCfgPage.querySelector("#cancelButton").addEventListener("click", cancel);
    crCfgPage.querySelector("#resetButton").addEventListener("click", backToDefault);
    crCfgPage.querySelector("#mainSwitch").addEventListener("change", onOffAllSets);

    var allInput = crCfgPage.querySelectorAll("input");
    for (i = 0; i < allInput.length; i++) {
        allInput[i].addEventListener("click", () => {
            onOffAnySets();
        });
    }

    console.log(crCfgPage)
    return crCfgPage;
});