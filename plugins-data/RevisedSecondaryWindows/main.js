let crStyle = document.createElement("style");
function q(n) {
    return document.querySelector(n);
}
function qAll(n) {
    return document.querySelectorAll(n);
}

async function refreshCss() {
    let rswCaches = JSON.parse(localStorage.getItem("RswColorCaches"));
    let cssIn = `
    @keyframes transGradient {
        0% {
            opacity: 0;
        }
    }
    @keyframes navBarSelected {
        0%, 33.3% {
            height: 1px;
            box-shadow: 0 0 4px 0 var(--rsw-accent-color);
        }
        33.3% {
            height: 30px;
        }
    }
    body { /*整体*/
        perspective: 1000px; /*3D动画必要*/
        --rsw-accent-color: ${rswCaches.accentColor};
        --rsw-text-color: ${rswCaches.accentTextColor};
        --rsw-bg-color: ${rswCaches.bgColor};
        --rsw-bg-color-trans: ${rswCaches.bgColorTrans};
        --rsw-bg-clip: padding-box;
        --rsw-trans-color: rgba(127, 127, 127, .1);
        --rsw-window-blur: blur(24px);
        --rsw-window-bd: solid rgba(127, 127, 127, .1);
        --rsw-window-bdr: 8px;
        --rsw-window-shadow-color: rgba(0, 0, 0, .3);
        --rsw-title-bg: #0000;
        --rsw-title-blur: blur(12px);
        --rsw-mask-blur: blur(12px);
        --rsw-timing-function-in: cubic-bezier(.34, .68, 0, 1);
        --rsw-timing-function-in2: cubic-bezier(.11, .79, 0, 1);
        --rsw-timing-function-out: cubic-bezier(1, 0, .68, .34);
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
        --rsw-window-blur: none;
        --rsw-window-bd: none;
        --rsw-window-bdr: 16px;
        --rsw-title-bg: #0000;
        --rsw-title-blur: none;
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
        --rsw-bg-color: var(--MoTheme-other_backgroundColor);
        --rsw-bg-color-trans: var(--rsw-bg-color);
        --rsw-bg-clip: ;
        --rsw-window-blur: saturate(var(--MoTheme-other_backgroundSaturate)) blur(var(--MoTheme-other_backgroundBlur));
        --rsw-window-bd: solid rgba(255, 255, 255, 0.2);
        --rsw-window-bdr: var(--MoTheme-other_radius);
        --rsw-title-blur: var(--rsw-window-blur);
        --rsw-mask-blur: var(--rsw-window-blur);
    }
    html[style*=MoTheme] > body div.m-layer,
    html[style*=MoTheme] > body div.m-layer-sharecard,
    html[style*=MoTheme] > body div.m-card-sharecard,
    html[style*=MoTheme] > body div.m-mask,
    html[style*=MoTheme] > body div.m-card + div[class^=auto-],
    html[style*=MoTheme] > body div.m-layer + div[class^=auto-],
    html[style*=MoTheme] > body div.m-timelineslide .mask { /*整体(MoTheme 弹窗+背景遮罩)*/
        --rsw-bg-color: var(--MoTheme-popWindow_backgroundColor);
        --rsw-window-blur: saturate(var(--MoTheme-popWindow_backgroundSaturate)) blur(var(--MoTheme-popWindow_backgroundBlur));
        --rsw-window-bdr: var(--MoTheme-popWindow_radius);
    }
    html[style*=MoTheme] > body.refined-now-playing.mq-playing > * { /*整体(MoTheme+RNP)*/
        --rsw-window-blur: saturate(var(--MoTheme-popWindow_backgroundSaturate)) blur(var(--MoTheme-popWindow_backgroundBlur));
    }

    @keyframes inLayer {
        0% {
            opacity: 0;
            transform: rotateX(-35deg) scale(.8);
        }
    }
    @keyframes outLayer { /*无用*/
        100% {
            opacity: 0;
            transform: rotateX(30deg) rotateY(10deg) scale(.8);
        }
    }

    @keyframes inMask {
        0% {
            background: #0000;
            backdrop-filter: none;
        }
    }
    @keyframes outMask {
        100% {
            background: #0000;
            backdrop-filter: none;
        }
    }
    div.m-layer, div.m-card, div.m-playlist, div.m-schlist, div.m-userlist, div.m-skswitch, div.u-arrlay-msg { /*大家好，我们是弹窗卡列大家族*/
        color: var(--rsw-text-color) !important;
        animation: inLayer .4s var(--rsw-timing-function-in) 1;
    }
    #music-163-com div.m-card:not(body.material-you-theme *),
    #music-163-com div.m-playlist:not(body.material-you-theme *),
    #music-163-com div.m-schlist:not(body.material-you-theme *),
    #music-163-com div.m-userlist:not(body.material-you-theme *),
    #music-163-com div.m-skswitch:not(body.material-you-theme *),
    #music-163-com div.u-arrlay-msg:not(body.material-you-theme *) {
    /*大家族（非MY） * 似乎缺了一位？*/
        border: 1px solid #0000 !important;
        border-radius: var(--rsw-window-bdr);
        background: none !important;
        backdrop-filter: none !important; /*防止子元素该属性的渲染异常*/
        box-shadow: 0 6px 24px 0 var(--rsw-window-shadow-color);
        overflow: visible; /*让伪元素可以超出*/
    }
    div.m-layer:not(body.material-you-theme *)::after,
    div.m-card:not(body.material-you-theme *)::after,
    div.m-playlist:not(body.material-you-theme *)::after,
    div.m-schlist:not(body.material-you-theme *)::after,
    div.m-userlist:not(body.material-you-theme *)::after,
    div.m-skswitch:not(body.material-you-theme *)::after,
    div.u-arrlay-msg:not(body.material-you-theme *)::after {
    /*家族的背景实现*/
        position: absolute;
        content: "";
        top: -1px;
        right: -1px;
        bottom: -1px;
        left: -1px;
        border: 1px var(--rsw-window-bd);
        border-radius: var(--rsw-window-bdr);
        background: var(--rsw-bg-color-trans) var(--rsw-bg-clip);
        backdrop-filter: var(--rsw-window-blur);
        z-index: -1;
    }
    div.m-playlist:not(body.material-you-theme *), div.m-schlist, div.m-userlist, div.m-skswitch, div.u-arrlay-msg { /*侧边弹出家族*/
        box-shadow: 0 1px 12px 0 var(--rsw-window-shadow-color);
    }
    div.m-mask, div.m-card + div[class^=auto-], div.m-layer + div[class^=auto-], div.m-timelineslide .mask { /*弹弹背景遮罩（参考了MY的写法）*/
        z-index: 9999 !important;
        background: #0003;
        backdrop-filter: var(--rsw-mask-blur);
        animation: inMask .3s 1;
    }
    div.m-timelineslide .mask { /*看图器遮罩*/
        z-index: -1 !important;
    }
    div.m-card ::-webkit-scrollbar, div.m-layer ::-webkit-scrollbar, div.m-playlist ::-webkit-scrollbar,
    div.m-schlist ::-webkit-scrollbar, div.u-arrlay-msg ::-webkit-scrollbar {
    /*弹弹滚动条*/
        width: 4px;
    }
    div.m-card ::-webkit-scrollbar-track, div.m-layer ::-webkit-scrollbar-track, div.m-playlist ::-webkit-scrollbar-track,
    div.m-schlist ::-webkit-scrollbar-track, div.u-arrlay-msg ::-webkit-scrollbar-track {
    /*弹弹滚动条背景*/
        background: 0 !important;
    }
    div.m-card .zbar, div.m-layer .zbar, div.m-playlist .listhd, div.u-arrlay-msg .sfrmhd, div.u-arrlay .msghd {
    /*弹弹标题栏*/
        /*background: var(--rsw-accent-color);*/
        background: var(--rsw-title-bg);
        backdrop-filter: var(--rsw-title-blur);
        border-bottom: 1px solid var(--rsw-accent-color);
        border-radius: var(--rsw-window-bdr) var(--rsw-window-bdr) 0 0;
        box-shadow: inset 0 -5px 4px -5px var(--rsw-accent-color);
        z-index: 3;
    }
    div.m-layer .zbar, div.m-card .zbar, div.u-arrlay-msg .sfrmhd, div.u-arrlay .msghd {
    /*弹窗标题栏+消息标题栏*/
        cursor: default;
        line-height: 19px;
        padding: 14px 40px 14px 20px;
        margin-bottom: 10px;
    }
    div.m-card .zbar .zttl, div.m-layer .zbar .zttl, div.m-layer.no-title .zbar::before,
    div.u-arrlay-msg .sfrmhd h3, div.u-arrlay .msghd > .f-thide > span:nth-child(1) {
    /*弹弹标题文字*/
        overflow: hidden;
        text-overflow: unset;
        color: var(--rsw-text-color) !important;
        font-size: 17px;
        font-weight: 800;
    }
    .u-icn-laycls svg, .u-arrlay .back svg, .m-chartlist .blacknote .cls svg,
    .m-timelineslide .cls svg, .m-timelineslide .pictool:hover svg {
    /*关闭/返回按钮等svg*/
        fill: var(--rsw-text-color) !important;
        transition: .2s var(--rsw-timing-function-in);
    }
    .u-icn-laycls:hover svg, .u-arrlay .back:hover svg, .m-chartlist .blacknote .cls:hover svg,
    .m-timelineslide .cls:hover svg, .m-timelineslide .pictool:hover svg {
    /*关闭/返回按钮等svg （鼠标移上）*/
        fill: var(--rsw-accent-color) !important;
        transition: .2s var(--rsw-timing-function-in);
    }
    div.m-card li, div.m-layer li, div.m-layer button, div.m-playlist li, div.m-schlist li, div.u-arrlay li, div.m-userlist .blk a { /*各种li/列表/按钮等*/
        transition: .2s var(--rsw-timing-function-in);
    }
    body.refined-now-playing.mq-playing:not(.material-you-theme) .u-ibtn1,
    body.refined-now-playing.mq-playing:not(.material-you-theme) .u-ibtn1:hover,
    body.refined-now-playing.mq-playing.ignore-now-playing.material-you-theme .u-ibtn1,
    body.refined-now-playing.mq-playing.ignore-now-playing.material-you-theme .u-ibtn1:hover {
    /*高亮按钮(RNP)*/
        color: var(--rsw-bg-color);
        background: var(--rsw-accent-color);
    }
    div.u-arrlay-chat .cmtform, div.m-card-sharecard li:last-child, div.m-layer-sharecard li:last-child { /*各种贴底东西*/
        border-radius: 0 0 var(--rsw-window-bdr) var(--rsw-window-bdr);
    }
    div.m-layer .s-fc2, div.m-card .s-fc2, div.m-playlist .s-fc2, div.u-arrlay-msg .s-fc2 { /*高亮…链接？*/
        color: var(--rsw-accent-color) !important;
        font-weight: 400;
    }
    div.f-thide, .m-playlist .tit { /*可能有文本超出的部分*/
        overflow: hidden;
        text-overflow: unset;
    }
    div.m-playlist .listbd, div.m-schlist .wrap:nth-of-type(2), div.m-addto .list { /*各种滚动列表*/
        overflow-y: overlay; /*让滚动条不占空间*/
    }
    div.m-schlist.f-dn, div.u-arrlay.u-arrlay-msg.f-dn:not(html[style*=MoTheme] *) { /*各种隐藏*/
        display: block !important;
        animation: outTopMenus .4s forwards var(--rsw-timing-function-out) 1;
    }

    /*这背景效果有动画bug，防它闪现给人不适感*/

    /*第一版方案
    div.m-layer:not(body.material-you-theme *) { /*叛变者
        border: 1px var(--rsw-window-bd);
        border-radius: var(--rsw-window-bdr);
        background: var(--rsw-bg-color-trans) var(--rsw-bg-clip);
        backdrop-filter: var(--rsw-window-blur);
        box-shadow: 0 6px 24px 0 var(--rsw-window-shadow-color);
    }*/
    /*第二版方案：
    @keyframes inLayer-bg {
        0% {
            backdrop-filter: none;
        }
    }
    div.m-layer:not(body.material-you-theme *)::after { /*弹窗的背景实现
        animation: inLayer-bg .5s .4s 1;
    }
    body.refined-now-playing.mq-playing div.m-layer:not(body.material-you-theme *)::after { /*RNP下
        animation: none; /*……给你闪吧
    }
    */
    /*第三版方案*/ /*效果完美！*/
    @keyframes inLayer-bg {
        0% {
            backdrop-filter: var(--rsw-window-blur);
        }
    }
    @keyframes inLayer-bgPseudoE {
        0% {
            backdrop-filter: none;
        }
    }
    /*我去你的*/
    #music-163-com div.m-layer:not(body.material-you-theme *) {
        border: 1px solid #0000 !important;
        border-radius: var(--rsw-window-bdr);
        background: none !important;
        backdrop-filter: none;
        box-shadow: 0 6px 24px 0 var(--rsw-window-shadow-color);
        overflow: visible; /*让伪元素可以超出*/
        animation: inLayer .4s var(--rsw-timing-function-in) 1, inLayer-bg 0s .6s backwards 1;
    }
    div.m-layer:not(body.material-you-theme *)::after {
        animation: inLayer-bgPseudoE 0s .6s backwards 1;
    }

    div.m-layer .zbar { /*弹窗标题栏*/
        backdrop-filter: none;
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
    div.m-layer.m-listen-record .zbar { /*一起听本次记录 标题栏*/
        height: 10px;
        background: #0000;
        backdrop-filter: none;
        border: 0;
        box-shadow: none;
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

    div.m-card-sharecard, div.m-layer-sharecard,
    div.m-card-sharecard .m-card-sharecard, div.m-layer-sharecard .m-layer-sharecard { /*弹卡(分享)+弹窗(分享)*/ /*我勒个套娃*/
        background: #0000 !important;
        padding: 0;
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

    @keyframes inListenWith {
        0% {
            margin-top: 1000px;
        }
        0%, 25% {
            box-shadow: none;
        }
    }
    div.m-card-invite { /*弹卡(一起听)*/
        width: 330px;
        max-height: 430px;
        margin-top: -20px;
        margin-left: -50px;
        animation:
            transGradient 0s .1s backwards 1, /*不影响JS定位*/
            inListenWith .4s .1s var(--rsw-timing-function-in) 1;
    }
    body.rsw-relive .m-card-invite { /*一起听（ReLive）*/
        margin-left: 0;
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
    div.m-card-invite .friend-list .itm .btn-invite, div.m-card-invite .friend-list .itm .info-invite { /*上次一起听/邀请按钮*/
        animation: transGradient .2s 1;
    }
    div.m-card-invite .footer { /*一起听底栏嵌进标题*/
        transform: translate(84px, -345px) scale(.9);
        border: 0;
    }
    div.m-card-invite .footer .btn { /*一起听底栏按钮*/
        width: 43px;
        padding: 0;
        margin: 0 3px;
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
        animation: inPlaylist .4s .1s backwards var(--rsw-timing-function-in) 1 !important;
        transition: .5s var(--rsw-timing-function-in); /*MY悬浮底栏贴边动画*/
    }
    div.m-playlist.z-show:not(body.material-you-theme *) { /*弹正播列(非MY)*/
        top: max(10%, 75px);
        right: calc(10px + var(--extra-pos-margin, 0px));
        bottom: calc(var(--bottombar-height, 72px) + var(--bottombar-elevation, 0px) + 10px);
    }
    body.material-you-theme div.m-playlist.z-show { /*弹正播列(MY)*/
        border: 1px var(--rsw-window-bd);
    }
    body.rsw-relive div.m-playlist.z-show { /*弹正播列(ReLive)*/
        bottom: 0;
        border-bottom-right-radius: 0;
        border-bottom-left-radius: 0;
    }
    body.material-you-theme div.m-playlist .listhd { /*弹正播列标题（MY）*/
        background: #0000;
    }
    body.material-you-theme .m-playlist .listhd, body.material-you-theme .m-playlist .listbd { /*标题 及 其列(MY)*/
        border-radius: var(--rsw-window-bdr) 0 0 0;
    }
    body.material-you-theme.refined-now-playing.mq-playing .m-playlist .listhd { /*标题(MY+RNP)*/
        border-radius: var(--rsw-window-bdr) var(--rsw-window-bdr) 0 0;
    }
    div.m-playlist .listhd h2 { /*标题文字*/
        line-height: 8px;
    }
    div.m-playlist .listsub { /*控制栏*/
        top: 17px;
        margin-left: 105px;
        border: 0;
        z-index: 16;
    }
    div.m-playlist .listsub .f-fl { /*歌曲总数/心动模式*/
        transform: translateY(4px);
    }
    div.m-playlist .listbd { /*弹正播列的列（上方还有）*/
        top: 0;
        margin-top: 3px;
        padding-top: 51px;
        border-radius: var(--rsw-window-bdr);
    }
    body.material-you-theme .m-playlist .listbd { /*弹正播列的列(MY)*/
        top: 54px;
        margin-top: 0;
        padding-top: 0;
    }
    body.material-you-theme.floating-bottombar .m-playlist .listbd { /*弹正播列的列(MY浮动底栏)*/
        border-radius: 0 0 12px 12px;
    }
    body.material-you-theme.refined-now-playing.mq-playing:not(.ignore-now-playing) .m-playlist .listbd { /*弹正播列的列(MY+RNP)*/
        border-radius: 0 0 var(--rsw-window-bdr) var(--rsw-window-bdr);
    }
    body.rsw-relive .m-playlist .listbd { /*弹正播列的列(ReLive)*/
        border-bottom-right-radius: 0;
        border-bottom-left-radius: 0;
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

    div.m-schlist { /*搜索建议列表*/
        bottom: max(20%, calc(var(--bottombar-height, 72px) + var(--bottombar-elevation, 0px) + 15px));
        animation: inTopMenus .4s var(--rsw-timing-function-in) 1;
        transition: width .5s var(--rsw-timing-function-in), height .3s var(--rsw-timing-function-in) !important;
    }
    div.m-schlist .side:nth-of-type(2) { /*不是…咋想的*/
        border: 0;
    }
    div.m-schlist .wrap:nth-of-type(2) { /*修bug了属于是*/
        top: 0;
        bottom: 0;
        overflow-x: clip;
    }
    div.m-schlist .wrap.j-flag { /*切换动画*/
        transition: opacity .3s var(--rsw-timing-function-in);
    }
    div.m-schlist .side.history { /*搜索历史*/
        margin-top: 0;
    }
    div.m-schlist .hotlst li:nth-child(1) > a::before, .m-schlist .hotlst li:nth-child(2) > a::before, .m-schlist .hotlst li:nth-child(3) > a::before { /*热搜的123*/
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
        animation: inShitMenus .4s .1s backwards var(--rsw-timing-function-in) 1;
    }
    div.m-userlist .exit { /*退出登录按钮优化*/
        border: 0;
        padding-bottom: 4px;
    }

    div.m-tool .skin .m-skswitch { /*皮肤*/
        top: 40px;
        width: 330px;
        height: 274px;
        animation: inShitMenus .4s var(--rsw-timing-function-in) 1;
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
    @keyframes inMsg-Msghd {
        0% {
            height: 20px;
        }
    }
    @keyframes inMsg-Title {
        0% {
            padding-left: 20px;
        }
    }
    @keyframes inChat-Msghd {
        0% {
            height: 46px;
            padding-left: 20px;
        }
    }
    @keyframes inChat-MsghdBack {
        0% {
            left: -50px;
        }
    }
    @keyframes inChat-MsghdSet {
        0% {
            right: -50px;
        }
    }
    @keyframes inChat-SendForm {
        0% {
            height: 0;
            padding: 0;
        }
    }
    @keyframes inChat-BlackNote {
        0% {
            transform: translateY(120px);
        }
    }

    div.u-arrlay.u-arrlay-msg { /*消息*/
        top: 66px;
        right: calc(15px + var(--extra-pos-margin, 0px));
        bottom: 15%;
        padding: 0;
        border: 0;
        animation: inTopMenus .4s var(--rsw-timing-function-in) 1;
    }
    html[style*=MoTheme] div.u-arrlay.u-arrlay-msg { /*消息(MoTheme)*/
        animation: inMsg-MoTheme .4s var(--rsw-timing-function-in) 1;
    }
    html[style*=MoTheme] div.u-arrlay.u-arrlay-msg.f-dn { /*消息(隐藏)(MoTheme)*/
        display: block !important;
        animation: outMsg-MoTheme .4s forwards var(--rsw-timing-function-out) 1;
    }

    div.u-arrlay-msg .sfrmhd, div.u-arrlay .msghd { /*消息的标题*/
    }
    div.u-arrlay-msg .sfrmhd, div.u-arrlay-msg .u-tabbtn { /*消息一级标题and选项*/
        position: relative;
        z-index: 15;
    }
    div.u-arrlay-msg .sfrmhd { /*消息一级标题*/
        height: 46px;
        animation: inMsg-Msghd .3s var(--rsw-timing-function-in) 1;
    }
    div.u-arrlay-msg .sfrmhd h3 { /*消息一级标题文字*/
        margin: 0;
        animation: inMsg-Title .2s var(--rsw-timing-function-in) 1;
    }
    div.u-arrlay-msg .sfrmhd a { /*消息标题一键已读*/
        top: 17px;
        animation: transGradient .2s 1;
        transition: .2s;
    }

    div.u-arrlay-msg .u-tabbtn { /*选项*/
        width: 344px;
        border: none;
        background: none;
        transform: translateY(-40px);
        animation: transGradient .3s 1;
    }
    div.u-arrlay-msg .u-tabbtn .btn { /*选项卡*/
        color: var(--rsw-text-color);
        height: 30px;
        line-height: 24px;
        margin: 0 3px;
        border-radius: 0;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        transition: .1s;
    }
    div.u-arrlay-msg .u-tabbtn .btn:hover { /*选项卡（鼠标移上）*/
        color: var(--rsw-accent-color);
        line-height: 29px;
        background: var(--rsw-trans-color);
    }
    div.u-arrlay-msg .u-tabbtn .btn.z-sel { /*已选中的选项卡*/
        color: var(--layer-background, var(--rsw-bg-color));
        height: 30px;
        line-height: 31px;
        color: var(--rsw-accent-color);
        background: #0000;
        border: 1px solid var(--rsw-accent-color);
        box-shadow:
            0 0 4px 0 var(--rsw-accent-color), /*其他*/
            inset 0 -6px 5px -5px var(--rsw-accent-color); /*下*/
        animation: navBarSelected .3s 1;
    }
    div.u-arrlay-msg .u-tabbtn .btn.z-sel:hover {
        box-shadow:
            0 0 6px 0 var(--rsw-accent-color), /*其他*/
            inset 0 -8px 4px -5px var(--rsw-accent-color); /*下*/
    }
    div.u-arrlay-msg .u-tabbtn .btn.z-sel:active {
        box-shadow: inset 0 -8px 6px -5px var(--rsw-accent-color); /*下*/
    }

    div.u-arrlay-msg .u-load { /*载入中…*/
        margin-top: 105px;
    }
    div.u-arrlay-msg .m-msglist, .u-arrlay-msg .m-cmtlist,
    div.u-arrlay-msg .m-atlist { /*一级消息列表*/
        top: 0;
        bottom: 0;
        margin-top: 3px;
        padding-top: 72px;
        border-radius: var(--rsw-window-bdr);
    }
    body.material-you-theme .m-msglist, body.material-you-theme .m-cmtlist,
    body.material-you-theme .m-atlist { /*一级消息列表(MY)*/
        top: 75px;
        margin-top: 0;
        padding-top: 0;
    }
    div.m-msglist li, div.m-cmtlist li, div.m-atlist li { /*一级消息列表项*/
        animation: transGradient .2s 1;
    }

    div.u-arrlay .msghd { /*消息二级标题*/
        height: 20px;
        padding: 14px 0 14px 40px;
        text-align: left;
        animation: inChat-Msghd .3s var(--rsw-timing-function-in) 1;
        z-index: 15;
    }
    div.u-arrlay .back { /*返回按钮*/
        top: 14px;
        left: 17px;
        padding: 0;
        animation: inChat-MsghdBack .2s var(--rsw-timing-function-in) 1;
    }
    div.u-arrlay .msghd .set { /*设置(主要是小秘书)*/
        position: absolute;
        top: 16px;
        right: 16px;
        margin: 0;
        padding: 0;
        animation: inChat-MsghdSet .3s var(--rsw-timing-function-in) 1;
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
        top: 0;
        bottom: 0;
        margin: 3px 0;
        padding: 46px 0 109px;
        animation: transGradient .2s 1;
    }
    body.material-you-theme div.u-arrlay-chat .m-chartlist { /*二级消息列表（MY）*/
        bottom: 112px;
        top: 49px;
        margin: 0;
        padding: 0;
    }
    div.m-chartlist li.m-dlist-msg { /*消息块*/
        animation: transGradient .2s 1;
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
    div.u-arrlay-chat .cmtform { /*底部消息表单*/
        bottom: 0;
        height: 97px;
        padding: 1px 15px 15px;
        overflow: hidden;
        background: var(--rsw-title-bg);
        backdrop-filter: var(--rsw-title-blur);
        animation:
            transGradient 0s .2s backwards 1, /*不影响JS定位+防止加载未完毕闪现*/
            inChat-SendForm .4s .2s var(--rsw-timing-function-in2) 1;
        z-index: 15;
    }
    div.m-chartlist .blacknote { /*陌生人私信关闭提示*/
        margin-top: -53px;
        background: var(--rsw-title-bg);
        animation:
            transGradient 0s .1s backwards 1, /*不影响JS定位*/
            inChat-BlackNote .4s .1s var(--rsw-timing-function-in) 1;
    }

        /*消息输入框文本超出BUG修复*/
    div.u-arrlay-msg textarea.edttxt {
        height: 57px !important;
    }
    div.m-editor.m-editor-chat .insert {
        margin-top: 18px !important;
    }

    div.m-timelineslide .tool { /*看图器工具栏*/
        opacity: 1;
        background: #0008;
        backdrop-filter: blur(6px);
    }
    div.m-timelineslide .cls, div.m-timelineslide .pictool, div.m-timelineslide .pictool:hover { /*看图器关闭/上下张*/
        opacity: 1;
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
        let dbcl = document.body.classList;
        let isReLive
        function s(e, s) {
            return getComputedStyle(q(e)).getPropertyValue(s);
        }
        let accentColor = s("body", "--themeC1");
        let accentTextColor = s("body", "color");
        let bgColor = s("body", "background-color");
        let bgColorTrans = bgColor.slice(0, bgColor.length - 1) + ", .7)";
        /*if (/#/.test(bgColor)) {
            if (bgColor.length == 4) { /*3位转6位
                let n = "#";
                for (i = 1; i < 4; i++) {
                    n += bgColor.slice(i, i + 1).concat(bgColor.slice(i, i + 1));
                }
                bgColor = n;
            }
            bgColorTrans = bgColor + "B2";
        }*/

        try { /*是否ReLive主题*/
            if (/relive-theme/.test(q("#StyleSnippetStyles").outerHTML)) {
                isReLive = true;
                bgColor = s("#portal_root", "background-image"); /*.match(/linear-gradient\((?:[^()]*|\([^)]*\))*\)/); /*匹配其中的linear-gradient*/
                bgColorTrans = s("body", "--layer-background");
            }
        } catch {}

        let rswColors = ({
            accentColor,
            accentTextColor,
            bgColor,
            bgColorTrans,
        });
        rswColors = JSON.stringify(rswColors)
        let rswCaches = localStorage.getItem("RswColorCaches");
        if (rswCaches != rswColors) {
            if (isReLive) {
                dbcl.add("rsw-relive");
            } else {
                dbcl.remove("rsw-relive");
            }
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
            if (item.target instanceof HTMLStyleElement) {
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
        --rsws-fg: var(--rsw-accent-color);
        --rsws-bg: var(--rsw-bg-color-trans);
        --rsws-bg-wot: var(--rsw-bg-color);
        color: var(--md-accent-color-secondary, var(--ncm-text));
        line-height: 20px;
        font-size: 16px;
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
    <p>v0.3.0 by </p><input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning')" value=" Lukoning " />
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