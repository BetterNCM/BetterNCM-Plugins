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
    var cssIn = `
    :root { /*整体*/
        --rsw-accent-color: ` + rswCaches.accentColor + `;
        --rsw-text-color: ` + rswCaches.accentTextColor + `;
        --rsw-bg-color: ` + rswCaches.bgColor + `;
        --rsw-bg-color-trans: ` + rswCaches.bgColorTrans + `;
        --rsw-trans-color: rgba(127, 127, 127, 0.1);
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
    .eeeSoy, .bUIEtD { /*整体*/
        background: var(--rsw-bg-color);
    }

    ::-webkit-scrollbar { /*滚动条*/
        width: 3px !important;
    }
    ::-webkit-scrollbar-thumb, .jvRHTA::-webkit-scrollbar-thumb { /*滚动条那条*/
        background: rgba(127, 127, 127, 0.4) !important;
    }
    .bGRynX, .bdRgCN, .jrvDcK, .jsXnuR { /*文字颜色*/
        color: var(--rsw-text-color) !important;
    }
    .cshRjV, .dmpfrX, .iHbbmX, .gYTkUo, .bNDQnu, .jbbaVo, .lguzrg, .icxaqw { /*各种次要颜色…我服了加密class*/
        color: #888 !important;
    }
    .hVeLEc { /*同上*/
        background: #8888 !important;
    }
    .joUVp, .fPfSei { /*标题栏*/
        background: var(--rsw-trans-color);
        border-bottom: 1px solid var(--rsw-accent-color);
        box-shadow: inset 0 -5px 4px -5px var(--rsw-accent-color);
    }
    .title { /*字面意思*/
        display: none;
    }
    .sc-fzXfNS { /*导航栏*/
        left: 5px;
        top: 10px;
    }
    @keyframes navBarSelected {
        0% {
            height: 1px;
            box-shadow: 0 0 4px 0 var(--rsw-accent-color);
        }
    }
    .sc-fzXfNR { /*导航栏项*/
        color: var(--rsw-text-color);
        height: 44px;
        line-height: 36px;
        width: 120px;
        margin: 0 5px;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        transition: .1s;
    }
    .sc-fzXfNR:hover { /*导航栏项（鼠标移上）*/
        color: var(--rsw-accent-color);
        line-height: 42px;
        background: var(--rsw-trans-color);
    }
    .sc-fzXfNR.z-sel { /*导航栏选中项*/
        height: 44px;
        line-height: 45px;
        color: var(--rsw-accent-color);
        background: var(--rsw-bg-color);
        border: 1px solid var(--rsw-accent-color);
        border-bottom: 0;
        box-shadow:
            0 -4px 3px -4px var(--rsw-accent-color), /*上*/
            4px 0 3px -4px var(--rsw-accent-color), /*右*/
            -4px 0 3px -4px var(--rsw-accent-color); /*左*/
        animation: navBarSelected .1s 1;
        transition: .1s;
    }
    .sc-fzXfNR.z-sel:hover { /*导航栏选中项（鼠标移上）*/
        box-shadow:
            0 -5px 3px -4px var(--rsw-accent-color), /*上*/
            5px 0 3px -4px var(--rsw-accent-color), /*右*/
            -5px 0 3px -4px var(--rsw-accent-color); /*左*/
    }
    .sc-fzXfNR.z-sel:active { /*导航栏选中项（鼠标按下）*/
        box-shadow: #0000;
    }
    .sc-fzXfNR.z-sel::before { /*导航栏选中项下划线*/
        display: none;
    }
    .dlxBYs { /*开关栏*/
        right: 50px;
    }
    .dlxBYs .title { /*开关左侧小标题*/
        cursor: default;
        overflow: unset;
        max-width: unset;
        margin-right: 5px;
    }
    .sc-fzXfLO { /*开关*/
    }
    .sc-fzXfLO[aria-checked="true"] { /*开启的开关*/
        filter: drop-shadow(0px 0px 2px var(--rsw-accent-color));
        background-color: var(--rsw-accent-color);
    }
    .sc-fzXfLO::after { /*开关内部小球球*/
    }
    .sc-fzXfLO[aria-checked="true"]::after { /*开关内部小球球（开启版）*/
        background-color: var(--rsw-bg-color);
    }
    .dXSIVC { /*关闭按钮*/
        top: 16px;
        right: 16px;
    }
    .ShUoP { /*关闭按钮svg*/
        fill: var(--rsw-text-color);
        transition: .2s;
    }
    .dXSIVC:hover .ShUoP { /*关闭按钮svg （鼠标移上）*/
        fill: var(--rsw-accent-color);
    }
    .jrSfld { /*音效选块*/
        background: #0000;
        border-radius: 12px;
        box-shadow: 0 0 3px 0 var(--rsw-accent-color);
        transition: .1s;
    }
    .jrSfld .name { /*音效选块->内部标题*/
        transition: .1s;
    }
    .jrSfld:hover { /*音效选块（鼠标移上）*/
        box-shadow: 0 0 2px 1px var(--rsw-accent-color);
    }
    .jrSfld:active { /*音效选块（鼠标按下）*/
        border: 4px solid var(--rsw-accent-color);
        box-shadow: 0 0 10px 1px var(--rsw-accent-color);
        padding-top: 12px;
    }
    .jrSfld.small:active { /*小号音效选块（鼠标按下）*/
        padding-top: 9px;
    }
    .jrSfld:active .name { /*音效选块（鼠标按下）->内部标题*/
        margin-bottom: 6px;
    }
    .jrSfld.z-select { /*选中的音效块*/
        border-color: var(--rsw-accent-color);
        box-shadow: 0 0 5px 1px var(--rsw-accent-color);
    }
    .jrSfld.z-select:hover { /*选中的音效块（鼠标移上）*/
        box-shadow: 0 0 8px 1px var(--rsw-accent-color);
    }
    .jrSfld.z-select .current { /*选中音效块的对勾（整个）*/
        bottom: 28px;
    }
    .jrSfld.z-select .current > svg { /*选中音效块的对勾（里面的svg）*/
        fill: var(--rsw-accent-color) !important;
        display: none;
    }
    .dfhGup, .select-input.sc-AykKC { /*按钮和下拉框*/
        color: var(--rsw-text-color);
        line-height: 30px;
        border-color: var(--rsw-accent-color);
        border-radius: 10px !important;
        box-shadow: 0 0 3px 0 var(--rsw-accent-color);
        transition: .1s;
        cursor: default;
    }
    .dfhGup:hover, .select-input.sc-AykKC:hover { /*按钮和下拉框（鼠标移上）*/
        box-shadow: 0 0 6px 0 var(--rsw-accent-color);
        background: 0;
    }
    .dfhGup:active, .select-input.sc-AykKC:active { /*按钮和下拉框（鼠标按下）*/
        font-size: 11px;
        line-height: 23px;
        border-width: 4px;
        box-shadow: 0 0 8px 0 var(--rsw-accent-color);
    }
    .select-input.sc-AykKC * { /*下拉框->所有子元素*/
        transition: .1s;
    }
    .select-input.sc-AykKC:active span { /*下拉框（鼠标按下）->文字*/
        font-size: 11px;
    }
    .select-input.sc-AykKC svg.arr { /*下拉框->箭头*/
        fill: var(--rsw-text-color);
    }
    .select-input.sc-AykKC:active svg.arr { /*下拉框（鼠标按下）->箭头*/
        width: 9px;
        margin-top: 8px;
    }
    .dDwpFP.dDwpFP.dDwpFP { /*设备适配->下拉框*/
        width: 124px;
    }
    .select-input .sc-AykKC.line { /*设备适配->下拉框细线*/
        display: none;
    }
    .select-type.sc-AykKC { /*下拉菜单*/
        top: 33px;
        display: block;
        border-color: var(--rsw-accent-color);
        border-radius: 10px;
        background: var(--rsw-bg-color-trans);
        backdrop-filter: blur(8px);
        box-shadow: 0 0 3px 0 var(--rsw-accent-color);
        transition: .2s;
    }
    .select-type.sc-AykKC:hover { /*下拉菜单（鼠标移上）*/
        box-shadow: 0 0 6px 0 var(--rsw-accent-color);
    }
    .select-type.sc-AykKC.f-dn { /*下拉菜单（隐藏版）*/
        top: 0;
        max-height: 0;
        opacity: 0;
    }
    .select-type.top { /*下拉菜单（贴底版）*/
        top: -125px;
    }
    .select-type.top.f-dn { /*下拉菜单（贴底隐藏版）*/
        top: 30px;
        max-height: 0;
        opacity: 0;
    }
    .eGEZql, .jYVDY { /*下拉选项*/
        height: 30px;
        line-height: 30px;
        font-size: 13px;
        border-radius: 10px;
    }
    .eGEZql:hover, .jYVDY:hover { /*下拉选项（鼠标移上）*/
    }
    .eGEZql span, .eGEZql.z-sel span, .eGEZql:hover span, .jYVDY span, .jYVDY.z-sel span, .jYVDY:hover span { /*下拉项文字*/
        color: var(--rsw-text-color);
        width: 100%;
    }
    .hlactx.has { /*均衡器条条*/
        background: var(--rsw-accent-color);
    }
    .hlactx.has.disabled { /*均衡器条条（禁用版）*/
        background: #888;
    }
    .ctrl .sc-AykKC.val { /*条条的工具提示*/
        background: var(--rsw-accent-color);
    }
    .ctrl .sc-AykKC.val::after { /*条条的工具提示之向下箭头*/
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