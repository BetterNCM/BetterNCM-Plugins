function cE(n) {
    return document.createElement(n);
}
function q(n) {
    return document.querySelector(n);
}
function qAll(n) {
    return document.querySelectorAll(n);
}
let isEnabled = JSON.parse(localStorage.getItem("isRswEnable"));

function replaceSvg(s, use, n){
    let li = {
        close: `<use xlink:href="orpheus://orpheus/style/res/svg/icon.sp.svg#btn_close"></use>`,
        back: `<use xlink:href="orpheus://orpheus/style/res/svg/topbar.sp.svg#back"></use>`,
    };
    if (li[use]) {
        use = li[use];
    };
    try {
        q(`${s} svg`).innerHTML = use;
        q(s).classList.add("rsw-replace-success");
        console.log(`RswLog: Replace the ${n} SVG successfully`);
    } catch(e) {
        console.error(`RswError: Fail to replace the ${n} SVG. More info:
        ${e}`);
    };
}

async function refreshCss() {
    let rswCaches = JSON.parse(localStorage.getItem("RswColorCaches"));
    let cssInA = `
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
    `
    let cssIn = `
    @keyframes RSW-transGradient {
        0% {
            opacity: 0;
        }
    }
    @keyframes RSW-navBarSelected {
        0%, 33.3% {
            height: 1px;
            box-shadow: 0 0 4px 0 var(--rsw-accent-color);
        }
        33.3% {
            height: 30px;
        }
    }
    @keyframes RSW-inLayer {
        0% {
            opacity: 0;
            transform: rotateX(-35deg) scale(.8);
        }
    }
    @keyframes RSW-outLayer {
        75% {
            opacity: 0;
        }
        100% {
            transform: rotateX(20deg) rotateY(5deg) scale(.8);
        }
    }
    @keyframes RSW-inMask {
        0% {
            background: #0000;
            backdrop-filter: none;
        }
    }
    @keyframes RSW-outMask {
        100% {
            background: #0000;
            backdrop-filter: none;
        }
    }
    div.m-layer, div.m-card, div.m-playlist,div.m-schlist, div.m-userlist,
    div.m-skswitch, div.u-arrlay-msg, div.u-atsuggest, div.next-modal > div[role="dialog"] { /*大家好，我们是弹窗卡列大家族*/
        color: var(--rsw-text-color) !important;
        animation: RSW-inLayer .4s var(--rsw-timing-function-in) 1;
    }
    #music-163-com div.m-card:not(.m-emts, .m-card-noarrow, .m-layer, body.material-you-theme *),
    #music-163-com div.m-playlist:not(body.material-you-theme *),
    #music-163-com div.m-schlist:not(body.material-you-theme *),
    #music-163-com div.m-userlist:not(body.material-you-theme *),
    #music-163-com div.m-skswitch:not(body.material-you-theme *),
    #music-163-com div.u-arrlay-msg:not(body.material-you-theme *) {
    /*大家族 * 似乎缺了几位？*/
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
    div.u-arrlay-msg:not(body.material-you-theme *)::after,
    div.u-atsuggest::after, div.m-emts::after, div.next-modal > div[role="dialog"]::after {
    /*家族的背景实现*/
        position: absolute;
        content: "";
        inset: -1px;
        border: 1px var(--rsw-window-bd);
        border-radius: var(--rsw-window-bdr);
        background: var(--rsw-bg-color-trans) var(--rsw-bg-clip);
        backdrop-filter: var(--rsw-window-blur);
        z-index: -100; /*啊?*/
    }
    div.m-playlist:not(body.material-you-theme *), div.m-schlist, div.m-userlist, div.m-skswitch, div.u-arrlay-msg { /*侧边弹出家族*/
        box-shadow: 0 1px 12px 0 var(--rsw-window-shadow-color);
    }
    div.m-mask, div.m-card + div[class^=auto-], div.m-layer + div[class^=auto-],
    div.m-timelineslide .mask, div.next-modal > div[tabindex="-1"]:not(*:only-child) { /*弹弹背景遮罩（参考了MY的写法）*/
        z-index: 9999 !important;
        background: #0003;
        backdrop-filter: var(--rsw-mask-blur);
        animation: RSW-inMask .3s 1;
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
    div.m-card .zbar, div.m-layer .zbar, div.next-modal .gBGEOh, div.m-playlist .listhd, div.u-arrlay-msg .sfrmhd, div.u-arrlay .msghd {
    /*弹弹标题栏*/
        /*background: var(--rsw-accent-color);*/
        background: var(--rsw-title-bg);
        backdrop-filter: var(--rsw-title-blur);
        border-bottom: 1px solid var(--rsw-accent-color);
        border-radius: var(--rsw-window-bdr) var(--rsw-window-bdr) 0 0;
        box-shadow: inset 0 -5px 4px -5px var(--rsw-accent-color);
        z-index: 3;
    }
    div.m-layer .zbar, div.m-card .zbar, div.next-modal .gBGEOh, div.u-arrlay-msg .sfrmhd, div.u-arrlay .msghd {
    /*弹窗标题栏+消息标题栏*/
        cursor: default;
        line-height: 19px;
        padding: 14px 40px 14px 20px;
        margin-bottom: 10px;
    }
    div.m-card .zbar .zttl, div.m-layer .zbar .zttl, div.m-layer.no-title .zbar::before, div.next-modal .gBGEOh,
    div.u-arrlay-msg .sfrmhd h3, div.u-arrlay .msghd > .f-thide > span:nth-child(1) {
    /*弹弹标题文字*/
        overflow: hidden;
        text-overflow: unset;
        color: var(--rsw-text-color) !important;
        font-size: 17px;
        font-weight: 800;
    }
    .u-icn-laycls svg, .iAWWYr svg, .u-arrlay .back svg, .m-chartlist .blacknote .cls svg,
    .m-timelineslide .cls svg, .m-timelineslide .pictool:hover svg {
    /*关闭/返回按钮等svg*/
        fill: var(--rsw-text-color) !important;
        transition: .2s var(--rsw-timing-function-in);
    }
    .u-icn-laycls:hover svg, .iAWWYr:hover svg, .u-arrlay .back:hover svg, .m-chartlist .blacknote .cls:hover svg,
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
    div.m-layer .s-fc2, div.m-card .s-fc2, div.m-playlist .s-fc2, div.u-arrlay .s-fc2 { /*高亮…链接？*/
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
    div.m-schlist.f-dn, div.u-arrlay.u-arrlay-msg.f-dn:not(html[style*=MoTheme] *) { /*顶部菜单隐藏*/
        display: block !important;
        animation: RSW-outTopMenus .4s forwards var(--rsw-timing-function-out) 1;
    }
    div.m-queuenotify::before, /*什么遗老箭头*/
    div.m-player .toast::before, /*这个倒不是遗老*/
    div.u-arrlay::before /*啥弹窗的箭头？*/{
        display: none;
    }

    /*这背景效果有动画bug，防它闪现给人不适感*/
    /*第三版方案*/ /*效果完美！*/
    @keyframes RSW-inLayer-bg {
        0% {
            backdrop-filter: var(--rsw-window-blur);
        }
    }
    @keyframes RSW-inLayer-bgPseudoE {
        0% {
            backdrop-filter: none;
        }
    }
    /*我去你的*/
    #music-163-com div.m-layer:not(body.material-you-theme *), #music-163-com div.m-card-noarrow,
    div.next-modal > div[role="dialog"], div.u-atsuggest, div.m-emts { /*后两个是At建议和表情*/
        border: 1px solid #0000 !important;
        border-radius: var(--rsw-window-bdr);
        background: none !important;
        backdrop-filter: none;
        box-shadow: 0 6px 24px 0 var(--rsw-window-shadow-color);
        overflow: visible; /*让伪元素可以超出*/
        animation:
            RSW-inLayer .4s var(--rsw-timing-function-in) 1,
            RSW-inLayer-bg 0s .6s backwards 1;
    }
    div.m-layer:not(body.material-you-theme *)::after, div.m-card-noarrow::after,
    div.next-modal > div[role="dialog"]::after, div.u-atsuggest::after, div.m-emts::after {
        animation: RSW-inLayer-bgPseudoE 0s .6s backwards 1;
    }

    div.m-layer .zbar, div.m-card-noarrow .zbar { /*弹窗标题栏*/
        backdrop-filter: none;
    }
    div.m-layer.no-title .zbar { /*没标题的弹窗标题栏*/
        height: 20px;
    }
    div.m-layer .zbar .zttl{ /*弹窗标题文字*/
        text-align: left;
        padding: 0;
    }
    div.m-layer.no-title .zbar::before { /*没标题的硬加标题*/
        inset: 0;
        content: "提示";
    }
    div.u-icn-laycls { /*弹窗关闭按钮*/
        top: 14px;
        right: 14px;
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

    div.m-layer-comment .zbar { /*MV评论弹窗标题栏*/
        margin-bottom: 10px;
    }

    div.next-modal > div[role="dialog"] { /*模态弹窗（歌词配色方案/VIP开通）*/
        overflow: visible !important; /*让伪元素可以超出*/
        transition:
            transform .4s var(--rsw-timing-function-in),
            opacity .3s var(--rsw-timing-function-in);
    }
    div.next-modal > div[role="dialog"][aria-hidden="true"] { /*模态弹窗（开始消失）*/
        opacity: 0;
        transform: rotateX(24deg) rotateY(6deg) scale(.85);
    }
    div.next-modal > div[tabindex="-1"][aria-hidden="true"] { /*模态背景遮罩（开始消失）*/
        display: block !important;
        animation: RSW-outMask .3s forwards 1;
    }
    div.next-modal .gBGEOh { /*模态标题栏（+文字）*/
        backdrop-filter: none;
        text-align: left;
    }
    div.next-modal .iAWWYr {/*模态关闭按钮*/
        top: 14px;
        right: 16px;
    }
    div.next-modal .btn-wrapper.btn-wrapper > a { /*配色确认按钮*/
        box-sizing: border-box;
        cursor: default;
        color: var(--rsw-text-color);
        font-size: 16px;
        width: 70px;
        height: 35px;
        line-height: 0;
        outline: 0;
        box-shadow: 0 0 3px var(--rsw-accent-color);
        border: 1px solid var(--rsw-accent-color);
        border-radius: 10px;
        background: #0000;
        transition: .1s;
    }
    div.next-modal .btn-wrapper.btn-wrapper > a:hover { /*同上*/
        box-shadow: 0 0 6px var(--rsw-accent-color);
    }
    div.next-modal .btn-wrapper.btn-wrapper > a:active { /*同上*/
        font-size: 14px;
        border-width: 4px;
        box-shadow: 0 0 8px var(--rsw-accent-color);
    }
    div.next-modal-vipcashier iframe.ifrm-cashier { /*会员开通页iframe*/
        border-radius: var(--rsw-window-bdr);
        animation: RSW-transGradient .2s 1s backwards 1;
    }

    div.m-card-sharecard:not(body.material-you-theme *),
    div.m-layer-sharecard:not(body.material-you-theme *),
    div.m-card-sharecard .m-card-sharecard:not(body.material-you-theme *),
    div.m-layer-sharecard .m-layer-sharecard:not(body.material-you-theme *) { /*弹卡(分享)+弹窗(分享)*/ /*我勒个套娃*/
        background: #0000 !important;
    }
    div.m-card-sharecard, div.m-layer-sharecard { /*Title height fix*/
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

    @keyframes RSW-inListenWith {
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
            RSW-transGradient 0s .1s backwards 1, /*不影响JS定位*/
            RSW-inListenWith .4s .1s var(--rsw-timing-function-in) 1;
    }
    body.material-you-theme:not(.ignore-now-playing) .m-card.m-card-invite,
    body.material-you-theme.ignore-now-playing:not(.mq-playing) .m-card.m-card-invite {
    /*MY下*/
        animation:
            RSW-transGradient 0s .1s backwards 1, /*同上*/
            dialog .3s .1s cubic-bezier(0.4, 0, 0, 1);
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
        animation: RSW-transGradient .2s 1;
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
    
    div.m-emts.m-card { /*弹卡（Emoji）*/
        width: 302px;
    }
    div.m-emts > div { /*内div*/
        background: #0000;
    }
    div.m-emts .emtitm { /*Emoji*/
        transition: .1s;
    }
    div.m-emts .emtitm:hover { /*hover的Emoji*/
        border-color: var(--rsw-accent-color);
        border-radius: 50%;
        background: #0000;
        box-shadow: 0 0 6px 0 var(--rsw-accent-color);
    }
    div.m-emts .emtitm:active { /*active的Emoji*/
        box-shadow: 0 0 0 0 var(--rsw-accent-color);
    }
    div.m-emts .emtitm img { /*Emoji本尊（细节解决）*/
        width: 21.5px;
        height: 21.5px;
    }
    div.m-mask.m-mask-emts { /*Emoji卡片遮罩*/
        opacity: 0;
        animation: none !important;
    }

    @keyframes RSW-inPlaylist {
        0% {
            top: 100%;
            bottom: -50%;
        }
        0%, 25% {
            box-shadow: none;
        }
    }
    div.m-playlist.z-show { /*弹正播列*/
        will-change: top, bottom;
        animation: RSW-inPlaylist .4s .2s backwards var(--rsw-timing-function-in) 1 !important;
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
    body.rsw-relive div.m-playlist.z-show::after { /*弹正播列背景(ReLive)*/
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

    @keyframes RSW-inTopMenus {
        0% {
            top: -100%;
            bottom: 180%;
        }
        0%, 20% {
            box-shadow: none;
        }
    }
    @keyframes RSW-outTopMenus {
        100% {
            top: -100%;
            bottom: 180%;
        }
        100%, 80% {
            box-shadow: none;
        }
    }
    @keyframes RSW-inShitMenus {
        0% {
            top: -500px;
        }
        0%, 20% {
            box-shadow: none;
        }
    }

    div.m-schlist { /*搜索建议列表*/
        bottom: max(20%, calc(var(--bottombar-height, 72px) + var(--bottombar-elevation, 0px) + 15px));
        animation: RSW-inTopMenus .4s var(--rsw-timing-function-in) 1;
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
        animation: RSW-inShitMenus .4s .1s backwards var(--rsw-timing-function-in) 1;
    }
    div.m-userlist .exit { /*退出登录按钮优化*/
        border: 0;
        padding-bottom: 4px;
    }

    div.m-tool .skin .m-skswitch { /*皮肤*/
        top: 40px;
        width: 330px;
        height: 274px;
        animation: RSW-inShitMenus .4s var(--rsw-timing-function-in) 1;
    }

    @keyframes RSW-inMsg-MoTheme {
        0% {
            transform: translate(0, -160%);
        }
        0%, 20% {
            box-shadow: none;
        }
    }
    @keyframes RSW-outMsg-MoTheme {
        100% {
            transform: translate(0, -160%);
        }
        100%, 80% {
            box-shadow: none;
        }
    }
    @keyframes RSW-inMsg-Msghd {
        0% {
            height: 20px;
        }
    }
    @keyframes RSW-inMsg-Title {
        0% {
            padding-left: 20px;
        }
    }
    @keyframes RSW-inSendForm-Msg {
        0% {
            transform: translate(140px, -80px) scale(0);
        }
    }
    @keyframes RSW-inChat-Msghd {
        0% {
            height: 46px;
            padding-left: 20px;
        }
    }
    @keyframes RSW-inChat-MsghdBack {
        0% {
            left: -50px;
        }
    }
    @keyframes RSW-inChat-MsghdSet {
        0% {
            right: -50px;
        }
    }
    @keyframes RSW-inChat-SendForm {
        0% {
            height: 0;
            padding: 0;
        }
    }
    @keyframes RSW-inChat-BlackNote {
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
        animation: RSW-inTopMenus .4s var(--rsw-timing-function-in) 1;
    }
    html[style*=MoTheme] div.u-arrlay.u-arrlay-msg { /*消息(MoTheme)*/
        animation: RSW-inMsg-MoTheme .4s var(--rsw-timing-function-in) 1;
    }
    html[style*=MoTheme] div.u-arrlay.u-arrlay-msg.f-dn { /*消息(隐藏)(MoTheme)*/
        display: block !important;
        animation: RSW-outMsg-MoTheme .4s forwards var(--rsw-timing-function-out) 1;
    }

    div.u-arrlay-msg .sfrmhd, div.u-arrlay .msghd { /*消息的标题*/
    }
    div.u-arrlay-msg .sfrmhd, div.u-arrlay-msg .u-tabbtn { /*消息一级标题and选项*/
        position: relative;
        z-index: 15;
    }
    div.u-arrlay-msg .sfrmhd { /*消息一级标题*/
        height: 46px;
        animation: RSW-inMsg-Msghd .3s var(--rsw-timing-function-in) 1;
    }
    div.u-arrlay-msg .sfrmhd h3 { /*消息一级标题文字*/
        margin: 0;
        animation: RSW-inMsg-Title .2s var(--rsw-timing-function-in) 1;
    }
    div.u-arrlay-msg .sfrmhd a { /*消息标题一键已读*/
        top: 17px;
        animation: RSW-transGradient .2s 1;
        transition: .2s;
    }

    div.u-arrlay-msg .u-tabbtn { /*选项*/
        width: 344px;
        margin: 0 auto !important; /*AMAZING*/
        border: none;
        background: none;
        transform: translateY(-40px);
        animation: RSW-transGradient .3s 1;
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
        animation: RSW-navBarSelected .3s 1;
    }
    div.u-arrlay-msg .u-tabbtn .btn.z-sel:hover {
        box-shadow:
            0 0 6px 0 var(--rsw-accent-color), /*其他*/
            inset 0 -8px 4px -5px var(--rsw-accent-color); /*下*/
    }
    div.u-arrlay-msg .u-tabbtn .btn.z-sel:active {
        box-shadow:
            0 0 0 0 var(--rsw-accent-color), /*其他*/
            inset 0 -8px 6px -5px var(--rsw-accent-color); /*下*/
    }

    div.u-arrlay-msg .u-load { /*载入中…*/
        margin-top: 105px;
    }
    div.u-arrlay-msg .u-load:not(body.material-you-theme *)::before { /*loading颜色fix…我是不是在哪说过*/
        background: var(--rsw-text-color);
        -webkit-mask-image: url(orpheus://orpheus/style/res/less/pub/img/loading.svg);
    }
    div.j-new-song-tip { /*Tip*/
        z-index: 14;
        position: relative;
        transform: translateY(-44px);
    }
    div.u-arrlay-msg .m-msglist, div.u-arrlay-msg .m-cmtlist,
    div.u-arrlay-msg .m-atlist { /*一级消息列表*/
        top: 0;
        bottom: 0;
        margin-top: 3px;
        padding-top: 72px;
        border-radius: var(--rsw-window-bdr);
    }
    div.withNewSongTip .m-msglist, div.withNewSongTip .m-cmtlist,
    div.withNewSongTip .m-atlist { /*带Tip的消息列表*/
        padding-top: 102px;
    }
    body.material-you-theme .m-msglist, body.material-you-theme .m-cmtlist,
    body.material-you-theme .m-atlist { /*一级消息列表(MY)*/
        top: 75px;
        margin-top: 0;
        padding-top: 0;
    }
    div.m-msglist li, div.m-cmtlist li, div.m-atlist li { /*一级消息列表项*/
        animation: RSW-transGradient .2s 1;
    }
    div.m-cmtlist .cmtform, div.m-atlist .cmtform { /*回复表单*/ /*又在给NCM修bug？*/
        margin: 10px -20px 0;
        padding: 10px 20px 0;
        animation: RSW-inSendForm-Msg .3s var(--rsw-timing-function-in2) 1;
    }
    div.u-arrlay .u-msg { /*回复成功提示*/
        color: var(--rsw-accent-color);
        border-color: var(--rsw-accent-color);
        border-radius: 8px;
        background: #0000;
        box-shadow: 0 0 4px 0 var(--rsw-accent-color);
    }

    div.u-arrlay .msghd { /*消息二级标题*/
        height: 20px;
        padding: 14px 0 14px 40px;
        text-align: left;
        animation: RSW-inChat-Msghd .3s var(--rsw-timing-function-in) 1;
        z-index: 15;
    }
    div.u-arrlay .back { /*返回按钮*/
        top: 14px;
        left: 17px;
        padding: 0;
        animation: RSW-inChat-MsghdBack .2s var(--rsw-timing-function-in) 1;
    }
    div.u-arrlay .back.rsw-replace-success { /*返回按钮（svg替换成功）*/
        top: 13.5px;
        left: 12px;
    }
    div.u-arrlay .back.rsw-replace-success svg { /*返回按钮svg（svg替换成功）*/
        width: 20px;
        max-height: 20px;
    }
    div.u-arrlay .msghd .set { /*设置(主要是小秘书)*/
        position: absolute;
        top: 16px;
        right: 16px;
        margin: 0;
        padding: 0;
        animation: RSW-inChat-MsghdSet .3s var(--rsw-timing-function-in) 1;
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
        animation: RSW-transGradient .2s 1;
    }
    body.material-you-theme div.u-arrlay-chat .m-chartlist { /*二级消息列表（MY）*/
        bottom: 112px;
        top: 49px;
        margin: 0;
        padding: 0;
    }
    div.m-chartlist li.m-dlist-msg { /*消息块*/
        animation: RSW-transGradient .2s 1;
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
    div.u-arrlay-chat .cmtform:not(.m-cmtlist *, .m-atlist *) { /*底部消息表单*/ /*not选择器防止一个较难复现的bug*/
        bottom: 0;
        height: 97px;
        padding: 1px 15px 15px;
        overflow: hidden;
        background: var(--rsw-title-bg);
        backdrop-filter: var(--rsw-title-blur);
        animation:
            RSW-transGradient 0s .2s backwards 1, /*不影响JS定位+防止加载未完毕闪现*/
            RSW-inChat-SendForm .4s .2s var(--rsw-timing-function-in2) 1;
        z-index: 15;
    }
    div.m-chartlist .blacknote { /*陌生人私信关闭提示*/
        position: sticky;
        bottom: 0;
        margin-top: 0;
        background: var(--rsw-title-bg);
        backdrop-filter: var(--rsw-title-blur);
        animation:
            RSW-transGradient 0s .1s backwards 1, /*不影响JS定位*/
            RSW-inChat-BlackNote .4s .1s var(--rsw-timing-function-in) 1;
        z-index: 15;
    }
    div.m-chartlist .blacknote .cls.rsw-replace-success { /*如成功替换svg*/
        top: 5px;
        right: 5px;
        width: 15px;
        height: 15px;
    }
    div.m-chartlist .outer.z-hasnote { /*带关闭提示的二级消息列表的inner*/
        padding-bottom: 0;
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
    div.m-timelineslide .mask { /*看图器遮罩*/
        z-index: -1 !important;
    }

    @keyframes RSW-inTip {
        0% {
            opacity: 0;
            box-shadow: none;
            transform: translateY(10px) scale(.8);
        }
    }
    @keyframes RSW-inTip-Text {
        0% {
            opacity: 0;
            max-width: 0;
        }
        100% {
            max-width: 9999px;
        }
    }
    @keyframes RSW-inTopTip {
        0% {
            opacity: 0;
            box-shadow: none;
            transform: translate(-50%, -40px) scale(.6);
        }
    }
    @keyframes RSW-outTip {
        100% {
            opacity: 0;
            box-shadow: none;
            transform: translateY(7px) scale(.9);
        }
    }
    @keyframes RSW-outTopTip {
        0% {
            opacity: 0;
            box-shadow: none;
            transform: translateY(-7px) scale(.9);
        }
    }
    div.m-switch:not(body.material-you-theme *),
    div.u-result .wrap .inner:not(body.material-you-theme *),
    div.m-queuenotify:not(body.material-you-theme *),
    div.m-player .toast { /*下载列表/提示框/底栏弹出框*/
        opacity: 1; /*?*/
        padding: 8px 12px;
        border: 1px var(--rsw-window-bd) !important;
        border-radius: var(--rsw-window-bdr);
        background: var(--rsw-bg-color-trans) var(--rsw-bg-clip) !important;
        backdrop-filter: var(--rsw-window-blur) !important;
        box-shadow: 0 3px 24px -6px var(--rsw-window-shadow-color);
        animation: RSW-inTip .4s var(--rsw-timing-function-in) 1;
    }
    div.u-result:not(body.material-you-theme *) { /*提示框（让它跑到会员之上）*/
        z-index: 10000001;
    }
    #music-163-com div.m-switch { /*下载列表（行吧跟自己对抗）*/
        padding: 0 4px;
        animation: RSW-inTopTip .4s var(--rsw-timing-function-in) 1;
    }
    div.m-switch .cls.rsw-replace-success { /*替换后的下载列表关闭按钮*/
        height: 17px;
    }
    div.m-switch svg use[xlink\:href*=transput_done] {
        fill: green;
    } /* 上面这段代码并没有效果 */
    div.u-result .wrap .inner span,
    div.m-queuenotify:not(body.material-you-theme *), div.toast { /*提示框文字（全局）*/
        animation: RSW-transGradient .15s 1;
    }
    div.u-result .wrap .inner span:not(.errTxt, body.material-you-theme *),
    div.m-queuenotify:not(body.material-you-theme *) { /*提示框文字（一般）*/
        color: var(--rsw-text-color);
    }
    div.u-result.z-hide:not(body.material-you-theme *) { /*提示框+背景遮罩（即将消失）*/
        animation: none;
    }
    div.u-result.z-hide .wrap .inner:not(body.material-you-theme *),
    div.m-queuenotify.f-dn:not(body.material-you-theme *),
    div.m-player .toast.f-dn { /*提示框（消失/即将消失）*/
        animation: RSW-outTip .3s forwards var(--rsw-timing-function-out) 1;
    }
    div.u-result .icon { /*图标*/
        animation: RSW-transGradient .15s 1;
    }
    div.u-result .u-icn-loading { /*loading颜色fix*/
        background: var(--rsw-text-color);
        -webkit-mask-image: url(../style/res/common/toast/loading.svg);
    }
    body.material-you-theme .u-result .u-icn-loading { /*loading(MY)*/
        background: var(--rsw-accent-color);
        -webkit-mask-image: url("data:image/svg+xml,%0A%3Csvg width=%2724%27 height=%2724%27 stroke=%27%23000%27 viewBox=%270 0 24 24%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cstyle%3E.spinner_V8m1%7Btransform-origin:center;animation:spinner_zKoa 2s linear infinite%7D.spinner_V8m1 circle%7Bstroke-linecap:round;animation:spinner_YpZS 1.5s ease-in-out infinite%7D@keyframes spinner_zKoa%7B100%25%7Btransform:rotate%28360deg%29%7D%7D@keyframes spinner_YpZS%7B0%25%7Bstroke-dasharray:0 150;stroke-dashoffset:0%7D47.5%25%7Bstroke-dasharray:42 150;stroke-dashoffset:-16%7D95%25,100%25%7Bstroke-dasharray:42 150;stroke-dashoffset:-59%7D%7D%3C/style%3E%3Cg class=%27spinner_V8m1%27%3E%3Ccircle cx=%2712%27 cy=%2712%27 r=%279.5%27 fill=%27none%27 stroke-width=%273%27%3E%3C/circle%3E%3C/g%3E%3C/svg%3E");
    }
    div.u-result .u-icn-operatefail { /*err logo*/
        width: 25px;
        height: 25px;
        background-size: 25px auto; /*视觉上居中*/
        transform: translateX(-1px); /*同上*/
    }
    div.u-result .icon:not(:only-child):not(body.material-you-theme *) { /*带文字提示的图标*/
        transform: translateX(-3px); /*同上上*/
    }
    div.u-result.u-result-play .inner:not(body.material-you-theme *) { /*播放模式提示inner*/
        line-height: 28px; /*同上上上（高缩放可见明显效果）*/
        width: 75px;
        padding: 0;
    }
    body.rsw-relive div.u-result.u-result-play { /*播放模式提示（ReLive）*/
        bottom: 75px;
    }
    div.m-queuenotify:not(body.material-you-theme *) { /*开始播放提示*/
        color: var(--rsw-text-color);
        width: auto;
        height: auto;
        line-height: 0;
        padding: 16px; /*宽高通过padding控制*/
        animation: RSW-inTip .4s .1s backwards var(--rsw-timing-function-in) 1;
    }
    div.m-player .toast.u-hires, div.m-player .toast.u-dolby { /*TOAST通知（Hi-Res和杜比）*/
        top: -28px;
    }
    div.m-player .toast.u-mute { /*TOAST通知（音量提示）*/
        padding: 10px 14px;
    }
    div.m-queuenotify.f-dn:not(body.material-you-theme *), div.m-player .toast.f-dn {
    /*开始播放提示/TOAST通知（消失版）*/
        pointer-events: none;
        display: block !important;
    }
    `;
    if(!isEnabled) {
        console.log("RswLog: Disabled");
        cssIn = ``;
    }
    try {
        q("#RswStyles").innerHTML = cssInA + cssIn;
    } catch {
        let c = cE("style");
        c.setAttribute("id", "RswStyles");
        c.innerHTML = cssInA + cssIn;
        document.head.appendChild(c);
    }
    console.log("RswLog: Styles refreshed");
}
function loop() {
    function cb() {
        let dbcl = document.body.classList;
        let isReLive
        function s(e, p) { /*style(element, property)*/
            return getComputedStyle(q(e)).getPropertyValue(p);
        }
        let accentColor = s("body", "--themeC1");
        let accentTextColor = s("body", "color");
        let bgColor = s("body", "background-color");
        let bgColorTrans = bgColor.slice(0, bgColor.length - 1) + ", .7)";
        try { /*是否ReLive主题*/
            if (/relive-theme/.test(q("#StyleSnippetStyles").outerHTML)) {
                isReLive = true;
                bgColor = s("#portal_root", "background-image");
                bgColorTrans = s("body", "--layer-background");
            }
        } catch {}

        let rswColors = ({
            accentColor,
            accentTextColor,
            bgColor,
            bgColorTrans,
        });
        rswColors = JSON.stringify(rswColors);
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

    let A = qAll("html, body");
    for(i = 0; i < A.length; i++){
        new MutationObserver(() => {
            cb();
        }).observe(A[i], {
            attributeFilter: ["style", "class"],
            characterData: false,
        });
    };

    new MutationObserver((list) => {
        list.forEach((item) => {
            let e = item.target; /*e = element*/
            if (e instanceof HTMLStyleElement) {
                cb();
            };
            if (!isEnabled) {
                return;
            };
            //下面我们来检查类名
            let li = {
                "m-card-invite": flyBackInv,
                "m-emts": flyBackEmts,
                "u-arrlay-chat": () => replaceSvg(".u-arrlay-chat .back", "back", "chat back"),
                "m-chartlist": () => replaceSvg(".m-chartlist .blacknote .cls", "close", "blacknote close"),
                "m-switch": () => replaceSvg(".m-switch .cls", "close", "download list close"),
            };
            for (c in li) {
                if (e.classList.contains(c)) {
                    li[c]();
                }
            };
        });
    }).observe(q("html"), {
        attributes: false,
        childList: true,
        subtree: true,
    });

    function flyBackInv() {
        let e = q(".m-card-invite");
        e.style.bottom = "";
        e.style.right = ""; /*防一个特别奇怪的bug*/
        let eR = e.getBoundingClientRect();
        let ww = window.innerWidth;
        let wh = window.innerHeight;
        if (eR.bottom > wh) {
            e.style.top = `${wh - eR.height - 53}px`;
        };
        if (eR.right > ww) {
            e.style.left = `${ww - eR.width + 17}px`;
        };
    };
    function flyBackEmts() {
        let e = q(".m-emts");
        e.style.bottom = "";
        e.style.right = ""; /*防bug*/
        let eR = e.getBoundingClientRect();
        let ww = window.innerWidth;
        let wh = window.innerHeight;
        if (eR.bottom > wh) {
            e.style.top = "unset";
            e.style.bottom = "0";
        };
        if (eR.right > ww) {
            e.style.left = "unset";
            e.style.right = "0";
        };
    };
}

let readCfg = JSON.parse(localStorage.getItem("RswSettings"));

async function onOffAllSets() {
    isEnabled = q("#mainSwitch").checked;
    localStorage.setItem("isRswEnable", isEnabled);
    console.log(`RswLog: isEnabled = ${isEnabled}`);
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
        --rsws-fg: var(--rsw-accent-color, var(--themeC1));
        --rsws-bg: var(--rsw-bg-color-trans, #8881);
        --rsws-bg-wot: var(--rsw-bg-color, #888);
        color: var(--rsw-text-color);
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
    <p>v0.4.1 by </p><input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning')" value=" Lukoning " />
    <br />
    <label class="switch">
        <input id="mainSwitch" type="checkbox" />
        <span class="slider button"></span>
    </label>
    <p>总开关</p>
    <br />
    <p>目前实现：</p>
    <br />
    <p>- 主界面 各种弹窗对话框优化+动画</p>
    <br />
    <p>- 音效界面 圆角 外观 控件动画</p>
    <br />
    <p>- 登录界面 圆角 外观 部分控件动画</p>
    <br />
    <p>- 第三方登录/绑定界面 窗口圆角 标题栏</p>
    <br />
    <p>- 开发ing…… 更多详见更新日志</p>
    <br />
    <p>* 部分窗口的圆角由操作系统提供</p>
    <br />
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/RevisedSecondaryWindows')" value=" 源代码(GitHub) " />
    <br />
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/RevisedSecondaryWindows/releases')" value=" 更新日志(GitHub Releases) " />
    <br />
    <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning/RevisedSecondaryWindows/issues')" value=" 问题反馈/功能建议(GitHub issues) " />
    `;
    if (isEnabled) {
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