let crStyle = document.createElement("style");
refreshCss();
window.addEventListener("storage", (s) => {
    console.log(s.key);
    if (s.key == "RswColorCaches" || s.key == "isRswEnable") {
        refreshCss();
    };
});
function refreshCss() {
    var rswCaches = JSON.parse(localStorage.getItem("RswColorCaches"));
    var cssIn = `  /*某些class会在主题变化后变动*/
    :root { /*整体*/
        --rsw-accent-color: ${rswCaches.accentColor};
        --rsw-text-color: ${rswCaches.accentTextColor};
        --rsw-bg-color: ${rswCaches.bgColor};
        --rsw-bg-color-trans: ${rswCaches.bgColorTrans};
        --rsw-trans-color: rgba(127, 127, 127, 0.1);
        --rsw-timing-function-in: cubic-bezier(.34, .68, 0, 1);
        --rsw-timing-function-out: cubic-bezier(1, 0, .68, .34);
        --themeC1: var(--rsw-accent-color);
    }
    @keyframes inBody { /*别想多*/
        0%, 50% {
            opacity: 0;
        }
    }
    body { /*身体（？*/
        background: var(--rsw-bg-color);
        animation: inBody .5s 1;
    }
    #root > div { /*整体*/
        background: var(--rsw-bg-color);
    }

    ::-webkit-scrollbar { /*滚动条*/
        width: 3px !important;
    }
    ::-webkit-scrollbar-thumb, .select-type::-webkit-scrollbar-thumb { /*滚动条那条*/
        background: rgba(127, 127, 127, 0.4) !important;
    }
    .bGRynX, .bdRgCN, .name, h2, .select-input span { /*文字颜色*/
        color: var(--rsw-text-color) !important;
    }
    #root > div > div > div:not(.bGRynX, .bdRgCN), span.title, h4, .item:not(.item-wrap *), .zone, .item-text, .select-item > span, .item-slider { /*各种次要颜色…*/
        color: #888 !important;
    }
    .joUVp, .fPfSei { /*标题栏*/
        background: var(--rsw-trans-color);
        border-bottom: 1px solid var(--rsw-accent-color);
        box-shadow: inset 0 -5px 4px -5px var(--rsw-accent-color);
        backdrop-filter: blur(12px);
    }
    div.title { /*“音效”*/
        display: none;
    }
    .sc-fzXfNS { /*导航栏*/
        left: 5px;
        top: 10px;
    }
    @keyframes navBarSelected {
        0%, 33.3% {
            height: 1px;
            box-shadow: 0 0 4px 0 var(--rsw-accent-color);
        }
        33.3% {
            height: 44px;
        }
    }
    #root nav a { /*导航栏项*/
        color: var(--rsw-text-color);
        height: 44px;
        line-height: 36px;
        width: 120px;
        margin: 0 5px;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        transition: .1s;
    }
    #root nav a:hover { /*导航栏项（鼠标移上）*/
        color: var(--rsw-accent-color);
        line-height: 42px;
        background: var(--rsw-trans-color);
    }
    #root nav a.z-sel { /*导航栏选中项*/
        height: 44px;
        line-height: 45px;
        color: var(--rsw-accent-color);
        border: 1px solid var(--rsw-accent-color);
        box-shadow:
            0 0 4px 0 var(--rsw-accent-color), /*其他*/
            inset 0 -6px 5px -5px var(--rsw-accent-color); /*下*/
        animation: navBarSelected .3s 1;
        transition: .1s;
    }
    #root nav a.z-sel:hover { /*导航栏选中项（鼠标移上）*/
        box-shadow:
            0 0 6px 0 var(--rsw-accent-color), /*其他*/
            inset 0 -8px 4px -5px var(--rsw-accent-color); /*下*/
        transition: .1s;
    }
    #root nav a.z-sel:active { /*导航栏选中项（鼠标按下）*/
        box-shadow: inset 0 -8px 6px -5px var(--rsw-accent-color); /*下*/
        transition: .1s;
    }
    #root nav a.z-sel::before { /*抓条下划线，缩水变小看不见*/
        display: none;
    }
    #root .dlxBYs { /*开关栏*/
        right: 50px;
    }
    #root span.title { /*开关左侧小标题*/
        cursor: default;
        overflow: unset;
        max-width: unset;
        margin-right: 5px;
    }
    div[type="button"][aria-checked="true"] { /*开启的开关*/
        filter: drop-shadow(0px 0px 2px var(--rsw-accent-color));
        background-color: var(--rsw-accent-color);
    }
    div[type="button"]::after { /*开关内部小球球*/
    }
    div[type="button"][aria-checked="true"]::after { /*开关内部小球球（开启版）*/
        background: ${rswCaches.bgColor}; /*没法用CSS变量…*/
    }
    #root > div > span { /*关闭按钮*/
        top: 16px;
        right: 16px;
    }
    #root > div > span svg { /*关闭按钮svg*/
        fill: var(--rsw-text-color);
        transition: .2s;
    }
    #root > div > span:hover svg { /*关闭按钮svg （鼠标移上）*/
        fill: var(--rsw-accent-color);
    }
    #root > div > div:last-child { /*音效页*/
        height: 440px;
        top: -54px;
        padding-top: 69px;
        z-index: -1;
    }
    #root .jrSfld { /*音效选块*/
        background: #0000;
        border-radius: 12px;
        box-shadow: 0 0 3px 0 var(--rsw-accent-color);
        transition: .1s;
    }
    #root .name { /*音效选块内部标题*/
        transition: .1s;
    }
    #root .jrSfld:hover { /*音效选块（鼠标移上）*/
        box-shadow: 0 0 2px 1px var(--rsw-accent-color);
    }
    #root .jrSfld:active { /*音效选块（鼠标按下）*/
        border: 4px solid var(--rsw-accent-color);
        box-shadow: 0 0 10px 1px var(--rsw-accent-color);
        padding-top: 12px;
    }
    #root .small:active { /*小号音效选块（鼠标按下）*/
        padding-top: 9px;
    }
    #root .jrSfld:active .name { /*音效选块（鼠标按下）->内部标题*/
        margin-bottom: 6px;
    }
    #root .jrSfld.z-select { /*选中的音效块*/
        border-color: var(--rsw-accent-color);
        box-shadow: 0 0 5px 1px var(--rsw-accent-color);
    }
    #root .jrSfld.z-select:hover { /*选中的音效块（鼠标移上）*/
        box-shadow: 0 0 8px 1px var(--rsw-accent-color);
    }
    .z-select .current { /*选中音效块的对勾（整个）*/
        bottom: 28px;
    }
    .z-select .current > svg { /*选中音效块的对勾（里面的svg）*/
        fill: var(--rsw-accent-color) !important;
        display: none;
    }
    #root a:not(nav *), #root .select-input { /*按钮和下拉框*/
        color: var(--rsw-text-color);
        line-height: 30px;
        border-color: var(--rsw-accent-color);
        border-radius: 10px !important;
        box-shadow: 0 0 3px 0 var(--rsw-accent-color);
        transition: .1s;
        cursor: default;
    }
    #root div.select-input, #root div.select-type, .dDwpFP.dDwpFP.dDwpFP { /*统一宽度*/
        width: 124px;
    }
    #root a:not(nav *):hover, #root div.select-input:hover { /*按钮和下拉框（鼠标移上）*/
        box-shadow: 0 0 6px 0 var(--rsw-accent-color);
        background: 0;
    }
    #root a:not(nav *):active, #root div.select-input:active { /*按钮和下拉框（鼠标按下）*/
        font-size: 11px;
        line-height: 23px;
        border-width: 4px;
        box-shadow: 0 0 8px 0 var(--rsw-accent-color);
    }
    #root div.select-input * { /*下拉框->所有子元素*/
        transition: .1s;
    }
    #root div.select-input:active span { /*下拉框（鼠标按下）->文字*/
        font-size: 11px;
    }
    #root div.select-input svg.arr { /*下拉框->箭头*/
        fill: var(--rsw-text-color);
    }
    #root div.select-input:active svg.arr { /*下拉框（鼠标按下）->箭头*/
        width: 9px;
        margin-top: 8px;
    }
    #root div.select-input .line { /*设备适配->下拉框细线*/
        display: none;
    }
    #root div.select-type { /*下拉菜单*/
        top: 33px;
        display: block;
        border-color: var(--rsw-accent-color);
        border-radius: 10px;
        background: #0000;
        backdrop-filter: blur(8px);
        box-shadow: 0 0 3px 0 var(--rsw-accent-color);
        transition: .3s var(--rsw-timing-function-in);
    }
    #root div.select-type:hover { /*下拉菜单（鼠标移上）*/
        box-shadow: 0 0 6px 0 var(--rsw-accent-color);
    }
    #root div.select-type.f-dn { /*下拉菜单（隐藏版）*/
        top: 30px;
        max-height: 0;
        opacity: 0;
        transition: .2s var(--rsw-timing-function-out);
    }
    #root div.select-type.top { /*下拉菜单（贴底版）*/
        top: -125px;
    }
    #root div.select-type.top.f-dn { /*下拉菜单（贴底隐藏版）*/
        top: 0;
        max-height: 0;
        opacity: 0;
    }
    div.select-type div { /*下拉选项*/
        height: 30px;
        line-height: 30px;
        font-size: 13px;
        border-radius: 10px;
    }
    div.select-type div:hover { /*下拉选项（鼠标移上）*/
        background: var(--rsw-trans-color);
    }
    div.select-type div span, div.select-type div.z-sel span, div.select-type div:hover span{ /*下拉项文字*/
        color: var(--rsw-text-color);
        width: 100%;
    }
    .select-item .has, .item-slider .has { /*均衡器条条*/
        background: var(--rsw-accent-color);
    }
    .select-item .has.disabled, .item-slider .has.disabled { /*均衡器条条（禁用版）*/
        background: #888;
    }
    .select-item > div, .item-slider > div { /*均衡器条背景*/
        background: #8888 !important;
    }
    .has .ctrl .val { /*条条的工具提示*/
        color: var(--rsw-text-color);
        border: 1px solid var(--rsw-accent-color);
        border-radius: 8px;
        background: #0000;
        backdrop-filter: blur(4px);
        box-shadow: 0 0 3px 0 var(--rsw-accent-color);
    }
    .has .ctrl .val::after { /*条条的工具提示之向下箭头*/
        top: 24px;
        border-color: var(--rsw-accent-color) #0000 #0000;
    }
    `;
    if(!JSON.parse(localStorage.getItem("isRswEnable"))) {
        console.log("RswLog: Disabled");
        var cssIn = ``;
    } else {
        betterncm.app.setRoundedCorner(true);
    }
    try {
        document.querySelector("#RswStyles").innerHTML = cssIn;
    } catch {
        crStyle.setAttribute("id", "RswStyles");
        crStyle.innerHTML = cssIn;
        document.head.appendChild(crStyle);
    }
    console.log("RswLog: Styles refreshed");
}