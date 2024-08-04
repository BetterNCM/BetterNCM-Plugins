let crStyle = document.createElement("style");
function q(n) {
    return document.querySelector(n);
}
function qAll(n) {
    return document.querySelectorAll(n);
}

async function refreshCss() {
    let rswCaches = JSON.parse(localStorage.getItem("RswColorCaches"));
    try {
        /*是否ReLive主题*/
        if (/relive-theme/.test(q("#StyleSnippetStyles").outerHTML)) {
            document.body.classList.add("rsw-relive");
        }
    } catch {}
    let cssIn = `
    body { /*整体*/
        --rsw-accent-color: ` + rswCaches.accentColor + `;
        --rsw-text-color: ` + rswCaches.accentTextColor + `;
        --rsw-bg-color: ` + rswCaches.bgColor + `;
        --rsw-bg-color-trans: ` + rswCaches.bgColorTrans + `;
        --rsw-trans-color: rgba(127, 127, 127, .1);
        --rsw-window-blur: blur(24px);
        --rsw-window-bd: solid rgba(127, 127, 127, .1);
        --rsw-window-shadow-color: rgba(0, 0, 0, .3);
    }
    body.refined-now-playing.mq-playing > * { /*整体(RNP)*/
        --rsw-accent-color: var(--rnp-accent-color);
        --rsw-text-color: rgba(255, 255, 255, .8);
        --rsw-bg-color: #363636;
        --rsw-bg-color-trans: rgba(0, 0, 0, .1333333333);
        --rsw-window-blur: blur(36px) brightness(.8);
    }
    body.material-you-theme > * { /*整体(MY)*/
        --rsw-bg-color: var(--md-accent-color-bg);
        --rsw-bg-color-trans: var(--rsw-bg-color);
        --rsw-trans-color: #0000;
        --rsw-window-blur: none;
        --rsw-window-bd: none;
    }
    body.material-you-theme.refined-now-playing.mq-playing:not(.ignore-now-playing) > * { /*整体(MY+RNP)*/
        --rsw-text-color: inherit;
        --rsw-bg-color: var(--md-accent-color-bg);
        --rsw-bg-color-trans: var(--rsw-bg-color);
    }
    body.rsw-relive > * { /*整体(ReLive)*/
        --rsw-bg-color-trans: var(--layer-background);
        --rsw-window-blur: blur(var(--layer-blur));
    }
    html[style*=MoTheme] > body > * { /*整体(MoTheme)*/
        --rsw-bg-color: var(--MoTheme-popWindow_backgroundColor);
        --rsw-bg-color-trans: var(--rsw-bg-color);
        --rsw-window-blur: saturate(var(--MoTheme-popWindow_backgroundSaturate)) blur(var(--MoTheme-popWindow_backgroundBlur));
        --rsw-window-bd: solid rgba(255, 255, 255, 0.2);
    }
    html[style*=MoTheme] > body.refined-now-playing.mq-playing > * { /*整体(MoTheme+RNP)*/
        --rsw-window-blur: saturate(var(--MoTheme-popWindow_backgroundSaturate)) blur(var(--MoTheme-popWindow_backgroundBlur));
    }

    @keyframes inMask {
        0% {
            opacity: 0;
        }
    }

    div.m-mask, div.m-card + div[class^=auto-], div.m-layer + div[class^=auto-] { /*弹弹背景遮罩（参考了MY的写法）*/
        z-index: 9999 !important;
        backdrop-filter: blur(2px) brightness(.9);
        animation: inMask .4s cubic-bezier(.68, .68, 0, 1) 1;
    }
    div.m-card ::-webkit-scrollbar, div.m-layer ::-webkit-scrollbar, div.m-playlist ::-webkit-scrollbar, div.m-schlist ::-webkit-scrollbar, div.u-arrlay-msg ::-webkit-scrollbar {
    /*弹弹滚动条*/
        width: 4px;
    }
    div.m-card ::-webkit-scrollbar-track, div.m-layer ::-webkit-scrollbar-track, div.m-playlist ::-webkit-scrollbar-track, div.m-schlist ::-webkit-scrollbar-track, div.u-arrlay-msg ::-webkit-scrollbar-track {
    /*弹弹滚动条背景*/
        background: 0 !important;
    }
    div.m-card .zbar, div.m-layer .zbar, div.m-playlist .listhd, div.u-arrlay-msg .sfrmhd, div.u-arrlay .msghd {
    /*弹弹标题栏*/
        /*background: var(--rsw-accent-color);*/
        background: var(--rsw-trans-color);
        border-bottom: 1px solid var(--rsw-accent-color);
        border-radius: 7px 7px 0 0;
        box-shadow: inset 0 -5px 4px -5px var(--rsw-accent-color);
    }
    div.m-card .zbar .zttl, div.m-layer .zbar .zttl, div.m-layer.no-title .zbar::before, div.u-arrlay-msg .sfrmhd h3, div.u-arrlay .msghd > .f-thide > span:nth-child(1) {
    /*弹弹标题文字*/
        overflow: hidden;
        text-overflow: unset;
        color: var(--rsw-text-color) !important;
        font-size: 17px;
        font-weight: 800;
    }
    .u-icn-laycls svg, .u-arrlay .back svg, .m-chartlist .blacknote .cls svg { /*关闭/返回按钮svg*/
        fill: var(--rsw-text-color) !important;
        transition: .2s;
    }
    .u-icn-laycls:hover svg, .u-arrlay .back:hover svg, .m-chartlist .blacknote .cls:hover svg { /*关闭/返回按钮svg （鼠标移上）*/
        fill: var(--rsw-accent-color) !important;
    }
    div.m-playlist .s-fc2, div.u-arrlay-msg .s-fc2 { /*高亮…链接？*/
        color: var(--rsw-accent-color) !important;
        font-weight: 400;
    }
    div.f-thide, .m-playlist .tit { /*可能有文本超出的部分*/
        overflow: hidden;
        text-overflow: unset;
    }

    @keyframes inLayer {
        0% {
            transform: rotate3d(-1, -1, 0, 90deg) scale(80%);
            box-shadow: none;
        }
    }
    div.m-card-sharecard li, div.m-layer-sharecard li, div.m-playlist li { /*各种li*/
        transition: .1s
    }
    div.m-layer, div.m-card, div.m-playlist:not(body.material-you-theme *, html[style*=MoTheme] *), div.m-schlist, div.m-userlist, div.m-skswitch, div.u-arrlay-msg {
    /*大家好，我们是弹窗卡列大家族*/
        color: var(--rsw-text-color) !important;
        background: var(--rsw-bg-color-trans) padding-box;
        backdrop-filter: var(--rsw-window-blur);
        border: 1px var(--rsw-window-bd);
        box-shadow: 0 6px 24px 0 var(--rsw-window-shadow-color);
        border-radius: 8px;
        animation: inLayer .3s .1s backwards 1;
    }
    html[style*=MoTheme] div.m-layer, html[style*=MoTheme] div.m-card, html[style*=MoTheme] div.m-playlist {
    /*MoTheme适配*/
        box-shadow: 0 6px 24px 0 var(--rsw-window-shadow-color);
        animation: inLayer .3s .1s backwards 1;
    }
    div.m-playlist:not(body.material-you-theme *), div.m-schlist, div.m-userlist, div.m-skswitch, div.u-arrlay-msg { /*侧边弹出家族*/
        box-shadow: 0 1px 12px 0 var(--rsw-window-shadow-color);
    }

    div.m-layer .zbar, div.m-card .zbar, div.u-arrlay-msg .sfrmhd, div.u-arrlay .msghd { /*弹窗标题栏+消息标题栏*/
        cursor: default;
        line-height: 19px;
        padding: 14px 40px 14px 20px;
        margin-bottom: 10px;
    }
    div.m-card .zbar { /*一种另类弹窗的旧标题*/
        display: block;
        margin-bottom: 0;
    }
    div.m-card .zcls { /*上的关闭按钮*/
        display: inline-block;
        position: absolute;
        z-index: 5;
        right: 12px;
        top: 14px;
        cursor: pointer;
    }
    div.m-card .m-newlayer .head { /*另类弹窗的新标题*/
        display: none;
    }
    div.m-layer.no-title .zbar { /*没标题的弹窗标题栏*/
        height: 20px;
    }
    div.m-layer .zbar .zttl { /*弹窗标题文字*/
        text-align: left;
        padding: 0;
    }
    div.m-layer.no-title .zbar::before { /*没标题的硬加标题*/
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        content: "提示";
    }
    div.m-layer .zcnt, div.m-layer .lyct { /*弹窗内部*/
        background: 0;
    }
    div.m-layer .m-addto .create { /*收藏到歌单->新建歌单封面位置*/
        fill: var(--rsw-accent-color);
        background: var(--rsw-trans-color);
    }
    div.m-layer .u-cklist input[type=checkbox]:checked + span { /*弹窗内多选框*/
        background: var(--rsw-accent-color);
    }
    div.m-layer .u-cklist input[type="checkbox"]:checked + span svg { /*弹窗内多选框svg*/
        fill: var(--rsw-bg-color);
    }
    body.refined-now-playing.mq-playing:not(.material-you-theme) div.m-layer .u-ibtn1, body.refined-now-playing.mq-playing:not(.material-you-theme) div.m-layer .u-ibtn1:hover, body.refined-now-playing.mq-playing.ignore-now-playing.material-you-theme div.m-layer .u-ibtn1, body.refined-now-playing.mq-playing.ignore-now-playing.material-you-theme div.m-layer .u-ibtn1:hover {
    /*弹窗内高亮按钮(RNP)*/
        color: var(--rsw-bg-color);
        background: var(--rsw-accent-color);
    }
    div.m-layer.m-layer-trial .zbar { /*弹会员标题栏*/
        padding: 19px 20px;
        margin: 0;
        border-bottom: 1px solid var(--rsw-accent-color);
    }
    div.m-layer.m-layer-trial .topsize { /*弹会员标题栏背景*/
        top: -49px;
        border-radius: 7px 7px 0 0;
    }
    div.m-layer.m-layer-trial .zcls { /*弹会员关闭按钮*/
        top: 11px;
        background: var(--rsw-bg-color-trans);
        border-radius: 50%;
        border: 3px solid #0000;
        backdrop-filter: blur(4px);
    }

    div.m-card-sharecard, div.m-layer-sharecard { /*弹卡(分享)+弹窗(分享)*/
        background: var(--rsw-bg-color-trans) !important;
        padding: 0;
    }
    div.m-card-sharecard .m-card-sharecard, div.m-layer-sharecard .m-layer-sharecard { /*我勒个套娃*/
        background: #0000 !important;
    }
    div.m-card-sharecard li:last-child, div.m-layer-sharecard li:last-child { /*分享选项（最后一个）*/
        border-radius: 0 0 8px 8px;
    }
    div.m-card-sharecard li:hover, div.m-layer-sharecard li:hover { /*分享选项（鼠标移上）*/
        background: var(--rsw-trans-color);
    }
    body.material-you-theme .m-card-sharecard .m-card-sharecard, body.material-you-theme .m-layer-sharecard .m-layer-sharecard { /*MY适配*/
        border-radius: 0 0 16px 16px;
    }
    div.m-card-sharecard .zbar, div.m-layer-sharecard .zbar { /*分享标题栏*/
        margin: 0;
    }
    div.m-card-sharecard i.logo, div.m-layer-sharecard i.logo { /*分享选项图标*/
        background-color: #0000;
    }
    div.m-card-sharecard i.logo, div.m-layer-sharecard i.logo { /*分享选项图标*/
        background-color: #0000;
    }

    div.m-card-invite { /*弹卡(一起听)*/
        width: 330px;
        max-height: 430px;
        transform: translateX(-50px);
    }
    div.m-card-invite .zbar { /*一起听标题栏*/
        padding: 16px 20px;
    }
    div.m-card-invite .zbar .zttl { /*一起听标题文字*/
        line-height: 19px;
    }
    div.m-card-invite .friend-list .title { /*好友列表标题*/
        display: none;
    }
    div.m-card-invite .friend-list .list { /*好友列表本表(本列?)*/
        height: auto;
        max-height: 321px;
    }
    div.m-card-invite .footer { /*一起听底栏嵌进标题*/
        transform: translate(90px, -347px) scale(.9);
        border: 0;
    }
    div.m-card-invite .footer .btn { /*一起听底栏按钮*/
        width: 50px;
    }
    div.m-card-invite .footer .btn .txt { /*一起听底栏文字*/
        display: none;
    }

    @keyframes inPlaylist {
        0% {
            top: 100%;
            bottom: -50%;
        }
        0%, 25% {
            box-shadow: none;
        }
    }
    div.m-playlist.z-show { /*弹正播列*/
        animation: inPlaylist .4s .1s backwards cubic-bezier(.34, .68, 0, 1) 1 !important;
        transition: .5s cubic-bezier(.34, .68, 0, 1);
    }
    div.m-playlist.z-show:not(body.material-you-theme *) { /*弹正播列(非MY)*/
        top: max(10%, 75px);
        right: calc(6px + var(--extra-pos-margin, 0px));
        bottom: calc(var(--bottombar-height, 72px) + var(--bottombar-elevation, 0px) + 6px);
    }
    body.material-you-theme div.m-playlist.z-show { /*弹正播列(MY)*/
        border: 1px var(--rsw-window-bd);
    }
    body.rsw-relive div.m-playlist.z-show { /*弹正播列(ReLive)*/
        bottom: 0;
        border-bottom-right-radius: 0;
        border-bottom-left-radius: 0;
    }
    body.material-you-theme .m-playlist .listhd { /*弹正播列标题(MY)*/
        border-radius: 16px 0 0 0;
    }
    body.material-you-theme.refined-now-playing.mq-playing .m-playlist .listhd { /*弹卡正播列标题(MY+RNP)*/
        border-radius: 16px 16px 0 0;
    }
    div.m-playlist .listhd h2 { /*弹正播列标题文字*/
        line-height: 8px;
    }
    div.m-playlist .listsub { /*弹正播列控制栏*/
        top: 17px;
        margin-left: 105px;
        border: 0;
    }
    div.m-playlist .listsub .f-fl { /*弹正播列歌曲总数/心动模式*/
        transform: translateY(4px);
    }
    div.m-playlist .listbd { /*弹正播列的列*/
        top: 54px;
        border-radius: 0 0 8px 8px;
        overflow-y: overlay;
    }
    body.material-you-theme .m-playlist .listbd, body.rsw-relive .m-playlist .listbd { /*弹正播列的列(MY/ReLive)*/
        border-radius: 0;
    }
    body.material-you-theme.floating-bottombar .m-playlist .listbd { /*弹正播列的列(MY浮动底栏)*/
        border-radius: 0 0 12px 12px;
    }
    body.material-you-theme.refined-now-playing.mq-playing:not(.ignore-now-playing) .m-playlist .listbd { /*弹正播列的列(MY+RNP)*/
        border-radius: 0 0 16px 16px;
    }

    @keyframes inTopMenus {
        0% {
            top: -100%;
            bottom: 180%;
        }
        0%, 20% {
            box-shadow: none;
        }
    }
    @keyframes outTopMenus {
        100% {
            top: -100%;
            bottom: 180%;
        }
        100%, 80% {
            box-shadow: none;
        }
    }
    @keyframes inShitMenus {
        0% {
            top: -500px;
        }
        0%, 20% {
            box-shadow: none;
        }
    }

    div.m-schlist.f-dn, div.u-arrlay.u-arrlay-msg.f-dn:not(html[style*=MoTheme] *) { /*各种隐藏*/
        display: block !important;
        animation: outTopMenus .4s forwards cubic-bezier(1, 0, .68, .34) 1;
    }

    div.m-schlist { /*搜索建议列表*/
        bottom: max(20%, calc(var(--bottombar-height, 72px) + var(--bottombar-elevation, 0px) + 15px));
        animation: inTopMenus .4s cubic-bezier(.34, .68, 0, 1) 1;
        transition: width .5s cubic-bezier(.34, .68, 0, 1), height .3s cubic-bezier(.34, .68, 0, 1) !important;
    }
    div.m-schlist .side:nth-of-type(2) { /*不是…咋想的*/
        border: 0;
    }
    div.m-schlist .wrap:nth-of-type(2) { /*还有套娃？*/
        top: 0;
        bottom: 0;
        overflow: clip overlay;
    }
    div.m-schlist .wrap.j-flag {
        transition: opacity .3s cubic-bezier(.34, .68, 0, 1);
    }
    div.m-schlist .side.history { /*搜索历史*/
        margin-top: 0;
    }
    div.m-schlist .hotlst li:nth-child(1) > a:before, .m-schlist .hotlst li:nth-child(2) > a:before, .m-schlist .hotlst li:nth-child(3) > a:before { /*热搜的123*/
        color: var(--rsw-accent-color);
    }
    body.refined-now-playing.mq-playing .g-hd .m-sch { /*RNP下搜索列动画bug修复*/
        display: block;
        pointer-events: none;
        width: 0;
        margin: 0;
        opacity: 0;
    }

    div.m-userlist { /*头像菜单*/
        top: 57px;
        animation: inShitMenus .4s .1s backwards cubic-bezier(.34, .68, 0, 1) 1;
    }
    div.m-userlist .exit { /*退出登录按钮优化*/
        border: 0;
        padding-bottom: 4px;
    }

    div.m-tool .skin .m-skswitch { /*皮肤*/
        top: 40px;
        width: 330px;
        height: 274px;
        animation: inShitMenus .4s cubic-bezier(.34, .68, 0, 1) 1;
    }

    @keyframes inMsg-MoTheme {
        0% {
            transform: translate(0, -160%);
        }
        0%, 20% {
            box-shadow: none;
        }
    }
    @keyframes outMsg-MoTheme {
        100% {
            transform: translate(0, -160%);
        }
        100%, 80% {
            box-shadow: none;
        }
    }
    @keyframes inChat-Msghd {
        0% {
            padding-left: 20px;
        }
    }
    @keyframes inChat-MsghdBack {
        0% {
            left: -27px;
        }
    }
    @keyframes inChat-MsghdSet {
        0% {
            right: -27px;
        }
    }
    div.u-arrlay.u-arrlay-msg { /*消息*/
        top: 66px;
        right: calc(15px + var(--extra-pos-margin, 0px));
        bottom: 15%;
        padding: 0;
        animation: inTopMenus .4s cubic-bezier(.34, .68, 0, 1) 1;
    }
    html[style*=MoTheme] div.u-arrlay.u-arrlay-msg { /*消息(MoTheme)*/
        animation: inMsg-MoTheme .4s cubic-bezier(.34, .68, 0, 1) 1;
    }
    html[style*=MoTheme] div.u-arrlay.u-arrlay-msg.f-dn { /*消息(隐藏)(MoTheme)*/
        display: block !important;
        animation: outMsg-MoTheme .4s forwards cubic-bezier(1, 0, .68, .34) 1;
    }
    div.u-arrlay-msg .sfrmhd, div.u-arrlay .msghd { /*消息的标题*/
        height: 20px;
    }
    div.u-arrlay-msg .sfrmhd h3 { /*消息一级标题文字*/
        margin: 0;
    }
    div.u-arrlay-msg .sfrmhd a { /*消息标题一键已读*/
        top: 17px;
    }
    .u-tabbtn .btn.z-sel, .u-tabbtn .btn.z-sel:hover { /*已选中的选项卡*/
        color: var(--rsw-bg-color);
        background: var(--md-accent-color, var(--rsw-accent-color));
    }
    div.u-arrlay .msghd { /*消息二级标题*/
        padding: 14px 0 14px 40px;
        text-align: left;
        animation: inChat-Msghd .3s .1s backwards 1;
    }
    div.u-arrlay .back { /*返回按钮*/
        top: 14px;
        left: 17px;
        padding: 0;
        animation: inChat-MsghdBack .3s 1;
    }
    div.u-arrlay .msghd .set { /*设置(主要是小秘书)*/
        position: absolute;
        top: 16px;
        right: 16px;
        margin: 0;
        padding: 0;
        animation: inChat-MsghdSet .3s .1s backwards 1;
    }
    body.material-you-theme div.u-arrlay .msghd .set { /*设置(MY)*/
        top: 6px;
        right: 6px;
        width: 36px;
        height: 36px;
    }
    body.material-you-theme div.u-arrlay .msghd .set svg { /*设置内svg(MY)*/
        width: 24px;
        height: 24px;
    }
    div.u-arrlay-chat .m-chartlist { /*二级消息列表*/
        top: 49px;
        margin-bottom: 4px;
    }
    div.m-chartlist li.m-dlist-msg .charttxt, div.m-chartlist li.m-dlist-msg .chartpic { /*主要给自己发的消息去蓝*/
        background: #8881;
    }
    .m-dlist .card .src, .m-dlist .src-resend .card, .m-dlist .charttxt .src, .m-chartlist .me .charttxt .src { /*链接卡片*/
        background: #8882;
    }
    .m-dlist .src-hvr:hover, .m-dlist .card:hover, .m-dlist .src:hover, .m-chartlist .me .src:hover { /*链接卡片（鼠标移上）*/
        background: #8883;
    }
    div.m-chartlist .blacknote { /*陌生人私信关闭提示*/
        background: #0000;
    }

        /***该内容已被屏蔽***/
        /*消息输入框文本超出BUG修复*/
    div.u-arrlay-msg textarea.edttxt {
        height: 57px !important;
    }
    div.m-editor.m-editor-chat .insert {
        margin-top: 18px !important;
    }
    `;
    if(!JSON.parse(localStorage.getItem("isRswEnable"))) {
        console.log("RswLog: Disabled");
        cssIn = ``;
    }
    try {
        q("#RswStyles").innerHTML = cssIn;
    } catch {
        crStyle.setAttribute("id", "RswStyles");
        crStyle.innerHTML = cssIn;
        document.head.appendChild(crStyle);
    }
    console.log("RswLog: Styles refreshed");
}
function loop() {
    function cb() {
        if(!JSON.parse(localStorage.getItem("isRswEnable"))) {
            return;
        }
        function s(s) {
            return getComputedStyle(document.body).getPropertyValue(s);
        }
        let accentColor = s("--themeC1");
        let accentTextColor = s("--md-accent-color-secondary");
        if (accentTextColor == "") {
            accentTextColor = s("--ncm-text");
        }
        let bgColor = s("--md-accent-color-bg-rgb");
        if (bgColor == "") {
            bgColor = s("--ncm-bg-rgb");
            if (!q("body.ncm-light-theme")) {
                bgColor = s("--ncm-fg-rgb");
            }
        }
        let bgColorTrans = "rgba(" + bgColor + ", .7)";
        bgColor = "rgb(" + bgColor + ")";
        let rswColors = ({
            accentColor,
            accentTextColor,
            bgColor,
            bgColorTrans,
        });
        rswColors = JSON.stringify(rswColors)
        let rswCaches = localStorage.getItem("RswColorCaches");
        if (rswCaches != rswColors) {
            localStorage.setItem("RswColorCaches", rswColors);
            refreshCss();
        }
    }

    new MutationObserver(() => {
        cb();
    }).observe(q("html"), {
        attributeFilter: ["style", "class"],
        characterData: false,
    });

    new MutationObserver(() => {
        cb();
    }).observe(q("body"), {
        attributeFilter: ["class"],
        characterData: false,
    });

    new MutationObserver((list) => {
        list.forEach((item) => {
            if (item.target == "[object HTMLStyleElement]") {
                cb();
            }
        })
    }).observe(q("html"), {
        attributes: false,
        childList: true,
        subtree: true,
    });
}

let readCfg = JSON.parse(localStorage.getItem("RswSettings"));

async function onOffAllSets() {
    let isChecked = q("#mainSwitch").checked;
    let allInput = qAll("#RswSettings input");
    for (i = 0; i < allInput.length; i++) {
        allInput[i].disabled = !isChecked;
    }
    q("#mainSwitch").disabled = false;
    localStorage.setItem("isRswEnable", isChecked);
    console.log(localStorage.getItem("isRswEnable"));
    if (isChecked == true) {
        loop();
    }
    refreshCss();
}

plugin.onLoad(async () => { //插件初始化
    if (!localStorage.getItem("isRswEnable")) { //初始化设置
        localStorage.setItem("isRswEnable", true);
    };
    loop();
    refreshCss();
});

plugin.onConfig( () => {
    //创建DOM
    let crCfgPage = document.createElement("div");
    crCfgPage.setAttribute("id", "RswSettings");
    crCfgPage.innerHTML = `
    <style>
    #RswSettings {
        --rsws-fg: var(--themeC1);
        --rsws-bg: rgba(var(--md-accent-color-bg-rgb, var(--ncm-fg-rgb)), .3);
        --rsws-bg-wot: rgba(var(--md-accent-color-bg-rgb, var(--ncm-fg-rgb)), 1);
        color: var(--md-accent-color-secondary, var(--ncm-text));
        line-height: 20px;
        font-size: 16px;
    }
    body.ncm-light-theme #RswSettings {
        --rsws-bg: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), .3);
        --rsws-bg-wot: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), 1);
    }
    #RswSettings p {
        display: inline;
    }
    #RswSettings .switch, #RswSettings .switch + p {
        line-height: 45px;
    }

    #RswSettings .button {
        color: var(--md-accent-color-secondary, var(--ncm-text)) !important;
        font-size: 16px;
        width: 120px;
        height: 40px;
        line-height: 0;
        outline: 0;
        box-shadow: 0 0 3px var(--rsws-fg);
        border: 1px solid var(--rsws-fg);
        border-radius: 10px;
        background: var(--rsws-bg);
        backdrop-filter: blur(12px);
        transition: .1s;
    }
    #RswSettings .button:hover {
        box-shadow: 0 0 6px var(--rsws-fg);
    }
    #RswSettings .button:active {
        font-size: 14px;
        border-width: 4px;
        box-shadow: 0 0 8px var(--rsws-fg);
    }
    #RswSettings .switch {
        position: relative;
        margin: 0 50px 0 0;
        display: inline-block;
    }
    #RswSettings .radio {
        position: relative;
        margin: 0 25px 0 0;
        display: inline-block;
    }
    #RswSettings .switch input, #RswSettings .radio input{ 
        opacity: 0;
        width: 0;
        height: 0;
    }
    #RswSettings .slider {
        position: absolute;
        width: 50px;
        height: 25px;
        margin: 11px 0;
        border-radius: 8px;
        transition: .2s, box-shadow .1s;
    }
    #RswSettings .slider:active {
        border-width: 3px;
        transition: .1s;
    }
    #RswSettings .radio .slider {
        width: 25px;
    }
    #RswSettings .radio .slider:active {
        border-width: 4px;
        transition: .1s;
    }
    #RswSettings input:checked + .slider {
        border: 1px solid var(--rsws-bg);
        background: var(--rsws-fg);
    }
    #RswSettings input:checked + .slider:active {
        border-width: 3px;
    }
    #RswSettings .radio input:checked + .slider {
        border-color: var(--rsws-fg);
        background: var(--rsws-bg);
    }
    #RswSettings input:disabled + .slider {
        border: 1px solid #888;
        box-shadow: 0 0 3px #888;
    }
    #RswSettings input:disabled + .slider:hover {
        box-shadow: 0 0 6px #888; 
    }
    #RswSettings input:disabled + .slider:active {
        border-width: 1px;
        box-shadow: 0 0 6px #888;
    }
    #RswSettings input:disabled:checked + .slider {
        border: 1px solid #909090;
        background: #888;
    }
    #RswSettings .radio input:disabled:checked + .slider {
        border-color: #888;
        background: var(--rsws-bg);
    }
    #RswSettings .slider::before {
        position: absolute;
        content: "";
        height: 15px;
        width: 15px;
        left: 4px;
        bottom: 4px;
        border-radius: 4px;
        background: var(--rsws-fg);
        transition: .2s;
    }
    #RswSettings .slider:active::before {
        height: 11px;
        width: 11px;
        border-radius: 3px;
        transition: .1s;
    }
    #RswSettings .radio .slider::before {
        opacity: 0;
        height: 3px;
        width: 3px;
        left: 10px;
        bottom: 10px;
    }
    #RswSettings .radio .slider:active::before {
        opacity: 0;
        height: 27px;
        width: 27px;
        left: -5px;
        bottom: -5px;
        border-radius: 5px;
        transition: .2s;
    }
    #RswSettings input:checked + .slider::before {
        background: var(--rsws-bg-wot);
        transform: translateX(25px);
    }
    #RswSettings .radio input:checked + .slider::before {
        opacity: 1;
        height: 15px;
        width: 15px;
        left: 4px;
        bottom: 4px;
        background: var(--rsws-fg);
        transform: translateX(0px);
    }
    #RswSettings .radio input:checked + .slider:active::before {
        height: 11px;
        width: 11px;
        left: 4px;
        bottom: 4px;
    }
    #RswSettings input:disabled + .slider::before {
        background: #888;
    }
    #RswSettings input:disabled + .slider:active::before {
        height: 15px;
        width: 15px;
        border-radius: 4px;
    }
    #RswSettings input:disabled:checked + .slider::before {
        background: var(--rsws-bg-wot);
    }
    #RswSettings .radio input:disabled:checked + .slider::before {
        background: #888;
    }
    #RswSettings .radio input:disabled:checked + .slider:active::before {
        height: 15px;
        width: 15px;
    }
    #RswSettings .link {
        text-decoration: underline;
        cursor: pointer;
        color: var(--rsws-fg) !important;
        background: rgba(0, 0, 0, 0);
        border: 0 solid;
    }
    </style>
    <p>RevisedSecondaryWindows</p>
    <br />
    <p>v0.1.3 by </p><input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning')" value=" Lukoning " />
    <br />
    <label class="switch">
        <input id="mainSwitch" type="checkbox" />
        <span class="slider button"></span>
    </label>
    <p>总开关</p>
    <br />
    <p>目前实现：</p>
    <br />
    <p>- 主界面 各种弹窗对话框优化+动画（除了部分提示框）</p>
    <br />
    <p>- 音效界面 圆角 外观 控件动画</p>
    <br />
    <p>- 登录界面 圆角 外观 部分控件动画</p>
    <br />
    <p>- 第三方登录/绑定界面 窗口圆角 标题栏</p>
    <br />
    <p>- 开发ing……</p>
    <br />
    <p>* 部分窗口的圆角由操作系统提供</p>
    <br />
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/RevisedSecondaryWindows')" value=" 源代码(GitHub) " />
    <br />
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/RevisedSecondaryWindows/issues')" value=" 问题反馈/功能建议(GitHub) " />
    `;
    if (JSON.parse(localStorage.getItem("isRswEnable"))) {
        crCfgPage.querySelector("#mainSwitch").checked = true;
    } else {
        crCfgPage.querySelector("#mainSwitch").checked = false;
        let allInput = crCfgPage.querySelectorAll("input");
        for (i = 0; i < allInput.length; i++) {
            allInput[i].disabled = true;
        }
        crCfgPage.querySelector("#mainSwitch").disabled = false;
    }
    crCfgPage.querySelector("#mainSwitch").addEventListener("change", onOffAllSets);
    console.log(crCfgPage);
    return crCfgPage;
});