let readCfg = JSON.parse(localStorage.getItem("ZoomNcmSettings"));
let crStyle = document.createElement("style");
let cfgDefault = ({
    zoom: 1,
});

function resetStyles() {
    document.getElementById("ZoomNcmStyles").innerHTML = `
    body {
        zoom: ` + JSON.parse(localStorage.getItem("ZoomNcmSettings")).zoom/* 你问为啥要这么写?我哪知道为啥要这么写 */ + `;
    }
    `;
    console.log("ZoomNCM Log: Styles set/reset");
}

function writeCfg(cfg) {
    localStorage.setItem("ZoomNcmSettings", JSON.stringify(cfg));
}

function saveCfg() {
    let zoom = document.getElementById("zoomSetBox").value/100;
    writeCfg(({zoom}));
    console.log("ZoomNCM Log: Settings saved");
    resetStyles();
};

function initializeCfg() { //初始化设置
    writeCfg(cfgDefault);
    console.log("LyricBarBlur Log: Configs initializing");
    resetStyles();
};

plugin.onLoad(() => { //插件初始化
    if (!readCfg) { //初始化设置
        initializeCfg();
    };
    crStyle.setAttribute("id", "ZoomNcmStyles");
    document.head.appendChild(crStyle);
    resetStyles();
});

plugin.onConfig(() => {
    if (!readCfg) {
        readCfg = cfgDefault;
    };
    let crCfgPage = document.createElement("div");
    crCfgPage.setAttribute("id", "ZoomNcmSettings");
    crCfgPage.innerHTML = `
    <style>
    #ZoomNcmSettings {
        --zncms-fg: var(--themeC1, var(--colorPrimary1));
        --zncms-bg: rgba(var(--md-accent-color-bg-rgb, var(--ncm-fg-rgb)), .3);
        --zncms-bg-wot: var(--md-accent-color-bg, var(--ncm-fg-rgb, var(--colorBackground)));
        color: var(--md-accent-color-secondary, var(--ncm-text, var(--colorBlack2)));
        line-height: 20px;
        font-size: 16px;
    }
    body.ncm-light-theme #ZoomNcmSettings {
        --zncms-bg: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), .3);
        --zncms-bg-wot: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), 1);
    }
    #ZoomNcmSettings p {
        display: inline;
    }

    #ZoomNcmSettings ::selection {
        color: var(--zncms-bg-wot);
        background: var(--zncms-fg);
    }

    #ZoomNcmSettings .button {
        color: var(--md-accent-color-secondary, var(--ncm-text)) !important;
        font-size: 16px;
        width: 90px;
        height: 40px;
        line-height: 0;
        outline: 0;
        box-shadow: 0 0 3px var(--zncms-fg);
        border: 1px solid var(--zncms-fg);
        border-radius: 10px;
        background: var(--zncms-bg);
        backdrop-filter: blur(12px);
        transition: .1s;
    }
    #ZoomNcmSettings .button:hover {
        box-shadow: 0 0 6px var(--zncms-fg);
    }
    #ZoomNcmSettings .button:active {
        font-size: 14px;
        border-width: 4px;
        box-shadow: 0 0 8px var(--zncms-fg);
    }

    #ZoomNcmSettings .button:disabled {
        color: #888 !important;
        box-shadow: 0 0 3px #888;
        border: 1px solid #888;
        background: var(--zncms-bg);
    }
    #ZoomNcmSettings .button:disabled:hover {
        box-shadow: 0 0 6px #888;
    }
    #ZoomNcmSettings .button:disabled:active {
        font-size: 16px;
        border-width: 1px;
        box-shadow: 0 0 6px #888;
    }

    #ZoomNcmSettings .textBox {
        padding: 10px;
    }
    #ZoomNcmSettings .textBox:focus {
        font-size: 15px;
        border-width: 3px;
        box-shadow: 0 0 8px var(--zncms-fg);
    }

    #ZoomNcmSettings .link {
        text-decoration: underline;
        cursor: pointer;
        color: var(--zncms-fg) !important;
        background: rgba(0, 0, 0, 0);
        border: 0 solid;
    }
    </style>
    <p>ZoomNCM</p>
    <br />
    <p>v0.1.1 by </p><input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning')" value=" Lukoning " />
    <br />
    <div style="line-height:45px;">
        <p>网易云缩放</p>
        <input class="button textBox" id="zoomSetBox" type="number" step="1" placeholder="100" value="` + readCfg.zoom*100 + `"/>
        <p>%（支持小数点）</p>
    </div>
    <div style="color:yellow;text-shadow:0 0 4px red">
        <p>警告：实时应用，请不要设置过大或过小的值</p>
    </div>
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/ZoomNCM/wiki/%E5%85%B3%E4%BA%8E%E7%BC%A9%E6%94%BE%E6%95%B4%E5%A4%AA%E5%A4%A7%E6%88%96%E8%80%85%E5%A4%AA%E5%B0%8F%E5%90%8E%E7%9A%84%E8%A1%A5%E6%95%91%E6%8E%AA%E6%96%BD')" value=" 补救措施-> " />
    <br /><br />
    <p>本插件的缩放实现方式与StyleSnippet相同；网易云本身并没有对此做支持，可能出现各种奇奇怪怪的bug</p>
    `;
    crCfgPage.querySelector("#zoomSetBox").addEventListener("change", saveCfg);
    return crCfgPage;
});