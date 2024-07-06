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
    textRed: 0,
    textGreen: 120,
    textBlue: 215,
    textCompel: false,
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

    if (readCfg.blurCompel) {
        var isBlurCompel = "!important";
    } else {
        var isBlurCompel = "";
    }

    if (readCfg.bgCompel) {
        var isBgCompel = "!important";
    } else {
        var isBgCompel = "";
    }

    if (readCfg.textCompel) {
        var isTextCompel = "!important";
    } else {
        var isTextCompel = "";
    }

    var cssLbTop = `
    .lyric-bar {
        opacity: 1 !important;
    `;
    var cssLbiTop = `
    .lyric-bar-inner * {
    `;
    var cssBgDefault = `
        background: linear-gradient(0deg, rgba(var(--md-accent-color-rgb, var(--ncm-fg-rgb)), ` + readCfg.bgTrans/10 +`), rgba(var(--md-accent-color-rgb, var(--ncm-fg-rgb)), ` + readCfg.bgTrans/10 +`)),rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), ` + readCfg.bgTrans +`) ` + isBgCompel + `;
    `;
    var cssBgCustom = `
        background: rgba(` + readCfg.bgRed + `,` + readCfg.bgGreen + `,` + readCfg.bgBlue + `,` + readCfg.bgTrans +`) ` + isBgCompel + `;
    `;
    var cssBgBlur = `
        backdrop-filter: blur(` + readCfg.blur + `px) ` + isBlurCompel + `;
    `;
    var cssFontsRnp = `
        font-family: ` + localStorage.getItem("refined-now-playing-font-family").replace("[", "").replace("]", "") + `;
    `;
    var cssFontsCustom = `
        font-family: ` + readCfg.customFonts + `;
    `;
    var cssTextTrans = `
        opacity: ` + readCfg.textTrans + isTextCompel + `;
    `;
    var cssTextCustom = `
        color: rgb(` + readCfg.textRed + `,` + readCfg.textGreen + `,` + readCfg.textBlue + `) ` + isTextCompel + `;
    `;
    var cssEnd = `
    }
    `;

    var cssIn = cssLbTop
    if (readCfg.bgColor) {
        var cssIn = cssIn + cssBgCustom;
    } else {
        var cssIn = cssIn + cssBgDefault;
    }

    var f = readCfg.fonts;
    document.querySelector(".lyric-bar").classList.remove("g-single-track");
    document.querySelector(".lyric-bar-inner").classList.remove("lyric");
    if (f == "rnp") {
        var cssIn = cssIn + cssFontsRnp;
        document.querySelector(".lyric-bar").classList.add("g-single-track");
        document.querySelector(".lyric-bar-inner").classList.add("lyric");
        console.log("yes");
    }

    var cssIn = cssIn + cssBgBlur + cssEnd + cssLbiTop + cssTextTrans;
    if (readCfg.textColor) { var cssIn = cssIn + cssTextCustom; }

    if (f == "custom") {
        var cssIn = cssIn + cssFontsCustom;
    }

    var cssIn = cssIn + cssEnd;

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

function onOffAllSets() {
    var isChecked = document.querySelector("#mainSwitch").checked;
    var allInput = document.querySelectorAll("input");
    for (i = 0; i < allInput.length; i++) {
        allInput[i].disabled = !isChecked;
    }
    localStorage.setItem("isLyricBarBlurEnable", isChecked);
    console.log(localStorage.getItem("isLyricBarBlurEnable"));
    resetStyles();
    document.querySelector("#mainSwitch").disabled = false;
}
function onOffAnySet() {
    var SoRInput = document.querySelectorAll(".switchBinding label:nth-of-type(1) input");
    for (n = 0; n < SoRInput.length; n++) {
        var isChecked = document.querySelectorAll(".switchBinding label:nth-of-type(1) input")[n].checked;
        var allInput = document.querySelectorAll(".switchBinding")[n].querySelectorAll("input");
        for (i = 1; i < allInput.length; i++) {
            allInput[i].disabled = !isChecked;
        }
    }
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
    var textCompel = getSwitchSet("textCompel");

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
        textCompel,
    });

    writeCfg(cfgWillWrite);
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
    d.querySelector("#textTransSetBox").value = readCfg.textTrans*100;
    d.querySelector("#textColorSwitch").checked = readCfg.textColor;
    d.querySelector("#textRedSetBox").value = readCfg.textRed;
    d.querySelector("#textGreenSetBox").value = readCfg.textGreen;
    d.querySelector("#textBlueSetBox").value = readCfg.textBlue;
    d.querySelector("#textCompelSwitch").checked = readCfg.textCompel;
    console.log("cancel");
    disableSaveCancel(true);
}

function resetCfg() { //重置设置
    localStorage.removeItem("LyricBarBlurSettings");
    writeCfg(cfgDefault);
    console.log("reset settings");
    cancel();
    resetStyles();
};

plugin.onAllPluginsLoaded(async () => { //插件初始化
    //异步等待LyricBar加载完毕
    await betterncm.utils.waitForElement(".lyric-bar");

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
    //开关设置读取
    var blurCompelSwitchChecked;
    var bgCompelSwitchChecked;
    var bgColorSwitchChecked;
    var colorSetBoxDisable;
    var fontsDefaultRadioChecked;
    var fontsRnpRadioChecked;
    var fontsCustomRadioChecked;
    var textCompelSwitchChecked;
    var textColorSwitchChecked;
    var colorSetBoxDisable;

    if (readCfg.blurCompel) {
        var blurCompelSwitchChecked = "Checked";
    }

    if (readCfg.bgCompel) {
        var bgCompelSwitchChecked = "Checked";
    } else {
        var bgCompelSwitchChecked = "";
    }
    
    if (readCfg.bgColor) {
        var bgColorSwitchChecked = "Checked";
        var colorSetBoxDisable = "";
    } else {
        var bgColorSwitchChecked = "";
        var colorSetBoxDisable = "Disabled";
    }

    var f = readCfg.fonts;
    if (f == "default") {
        var fontsDefaultRadioChecked = "Checked";
    }
    if (f == "rnp") {
        var fontsRnpRadioChecked = "Checked";
    }
    if (f == "custom") {
        var fontsCustomRadioChecked = "Checked";
    }

    if (readCfg.textCompel) {
        var textCompelSwitchChecked = "Checked";
    }
    
    if (readCfg.textColor) {
        var textColorSwitchChecked = "Checked";
    } else {
        var colorSetBoxDisable = "Disabled";
    }

    //创建DOM
    let crCfgPage = document.createElement("div");
    crCfgPage.setAttribute("id", "LyricBarBlurSettings");
    crCfgPage.innerHTML = `
    <style>
        #LyricBarBlurSettings {
            --lbbs-fg: rgba(var(--md-accent-color-rgb, var(--themeC1-rgb)), 1);
            --lbbs-bg: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), .3);
            --lbbs-bg-wot: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), 1);
            color: var(--md-accent-color-secondary, var(--ncm-text));
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
            width: 400px;
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

        #LyricBarBlurSettings .topBar {
            height: 50px;
            padding: 5px 60px;
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
            color: var(--md-accent-color-secondary, var(--ncm-text));
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
            color: var(--lbbs-fg);
            background: rgba(0, 0, 0, 0);
            border: 0 solid;
        }
    </style>
    <div class="part">
        <p style="font-size: 40px; line-height: 80px;">LyricBarBlur 设置</p>
        <br />
        <p>修改LyricBar外观，比如…添加背景模糊？</p>
        <br />
        <div>
            <label class="switch">
                <input id="mainSwitch" type="checkbox" />
                <span class="slider button"></span>
            </label>
            <p>总开关</p>
        </div>
    </div>
    <div class="topBar">
        <input class="button" id="saveButton" type="button" value="应用" disabled/>
        <input class="button" id="cancelButton" type="button" value="撤销" disabled/>
        <input class="button" id="resetButton" type="button" value="恢复默认" />
    </div>
    <div class="part">
        <p class="partTitle">模糊</p>
        <div style="float: right;">
            <p>覆盖其他插件的设置</p>
            <label class="switch">
                <input id="blurCompelSwitch" type="checkbox" ` + blurCompelSwitchChecked + `/>
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
            <input class="button textBox" id="blurSetBox" type="number" step="0.1" placeholder="12" value="` + readCfg.blur + `"/>
            <p>px</p>
            <br />
    </div>
    <div class="part">
        <p class="partTitle">背景</p>
        <div style="float: right;">
            <p>覆盖其他插件的设置</p>
            <label class="switch">
                <input id="bgCompelSwitch" type="checkbox" ` + bgCompelSwitchChecked + `/>
                <span class="slider button"></span>
            </label>
        </div>
        <div class="parting"></div>
            <p>背景不透明度</p>
            <br />
            <input class="button textBox" id="bgTransSetBox" type="number" step="0.1" placeholder="75" value="` + readCfg.bgTrans*100 + `"/>
            <p>%</p>
            <br />
        <div class="parting"></div>
            <div class="switchBinding">
                <p>自定义背景颜色</p>
                <label class="switch">
                    <input id="bgColorSwitch" type="checkbox" ` + bgColorSwitchChecked + `/>
                    <span class="slider button"></span>
                </label>
                <br />
                <p style="color: #F00; text-shadow: 0 1px 10px #F00;">R</p>
                <input class="button textBox" id="bgRedSetBox" type="number" step="1" placeholder="0" value="` + readCfg.bgRed + `" ` + colorSetBoxDisable + `/>
                <p style="color: #0F0; text-shadow: 0 1px 10px #0F0;">G</p>
                <input class="button textBox" id="bgGreenSetBox" type="number" step="1" placeholder="120" value="` + readCfg.bgGreen + `" ` + colorSetBoxDisable + `/>
                <p style="color: #00F; text-shadow: 0 1px 10px #00F;">B</p>
                <input class="button textBox" id="bgBlueSetBox" type="number" step="1" placeholder="215" value="` + readCfg.bgBlue + `" ` + colorSetBoxDisable + `/>
            </div>
    </div>
    <div class="part">
        <p class="partTitle">文字</p>
        <div style="float: right;">
            <p>覆盖其他插件的设置</p>
            <label class="switch">
                <input id="textCompelSwitch" type="checkbox" ` + textCompelSwitchChecked + `/>
                <span class="slider button"></span>
            </label>
        </div>
        <div class="parting"></div>
            <label class="radio">
                <input type="radio" id="fontsDefaultRadio" name="fonts" value="default" ` + fontsDefaultRadioChecked + `/>
                <span class="slider button"></span>
            </label>
            <p>使用默认字体</p>
            <br>
            <label class="radio">
                <input type="radio" id="fontsRnpRadio" name="fonts" value="rnp" ` + fontsRnpRadioChecked + `/>
                <span class="slider button"></span>
            </label>
            <p>使用RefinedNowPlaying内设置的字体(测试)</p>
            <br>
            <div class="switchBinding">
                <label class="radio">
                    <input type="radio" id="fontsCustomRadio" name="fonts" value="custom" ` + fontsCustomRadioChecked + ` />
                    <span class="slider button"></span>
                </label>
                <p>使用自定义字体</p>
                <br />
                <input class="button textBox" id="fontsSetBox" type="search" placeholder="可设为CSS font-family字体属性的字符串" value="` + readCfg.customFonts.replaceAll("\"", "&quot;") + `" />
            </div>
        <div class="parting"></div>
            <p>文本不透明度</p>  
            <br />
            <input class="button textBox" id="textTransSetBox" type="number" step="0.1" placeholder="100" value="` + readCfg.textTrans*100 + `"/>
            <p>%</p>
            <br />
        <div class="parting"></div>
            <div class="switchBinding">
                <p>自定义文本颜色</p>
                <label class="switch">
                    <input id="textColorSwitch" type="checkbox" ` + textColorSwitchChecked + `/>
                    <span class="slider button"></span>
                </label>
                <br />
                <p style="color: #F00; text-shadow: 0 1px 10px #F00;">R</p>
                <input class="button textBox" id="textRedSetBox" type="number" step="1" placeholder="0" value="` + readCfg.textRed + `" ` + colorSetBoxDisable + `/>
                <p style="color: #0F0; text-shadow: 0 1px 10px #0F0;">G</p>
                <input class="button textBox" id="textGreenSetBox" type="number" step="1" placeholder="120" value="` + readCfg.textGreen + `" ` + colorSetBoxDisable + `/>
                <p style="color: #00F; text-shadow: 0 1px 10px #00F;">B</p>
                <input class="button textBox" id="textBlueSetBox" type="number" step="1" placeholder="215" value="` + readCfg.textBlue + `" ` + colorSetBoxDisable + `/>
            </div>
    </div>
    <div class="part" style="font-size: 14px; line-height: 16px;">
        <p>Version 0.2.1</p>
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
    crCfgPage.querySelector("#resetButton").addEventListener("click", resetCfg);
    crCfgPage.querySelector("#mainSwitch").addEventListener("change", onOffAllSets);

    var allInput = crCfgPage.querySelectorAll("input");
    for (i = 0; i < allInput.length; i++) {
        allInput[i].addEventListener("click", () => {
            onOffAnySet();
        });
    }

    console.log(crCfgPage)
    return crCfgPage;
});