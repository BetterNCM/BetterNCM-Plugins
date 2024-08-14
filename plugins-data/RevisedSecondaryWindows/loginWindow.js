let crStyle = document.createElement("style");
refreshCss();
window.addEventListener("storage", (s) => {
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
    }
    .n-login {
        animation: inBody .5s 1;
    }
    ::-webkit-scrollbar { /*滚动条*/
        width: 3px !important;
    }
    ::-webkit-scrollbar-thumb { /*滚动条本条*/
        background: var(--rsw-text-color);
    }
    ::-webkit-scrollbar-track { /*滚动条背景*/
        background: #0000;
    }
    .n-login-scan h2, .n-login-scan .confirm { /*标题等*/
        color: var(--rsw-accent-color);
    }
    .n-login, .n-login a, .n-login-scan .txt, .n-login-scan .suc, .n-login .protocol, .n-login .tip-div, .n-login .stip, .n-login .fill li { /*文字*/
        color: var(--rsw-text-color);
    }
    .n-login .link, .n-login a.back, .n-login .iner .back:hover, .n-login .protocol a, .n-login-phone .reg, .n-login .iptwrap .itm-2 .fgt { /*链接*/
        text-decoration: underline;
        color: var(--rsw-accent-color);
    }
    /*.n-login { 该条意在改进文字渲染 我也不知道为什么能改进 | 会导致背景模糊bug 算了
        backdrop-filter: blur(0px);
    }*/
    @keyframes QRCodeFlyIn { /*飞翔的QR码（进入）*/
        0% {
            background: #EEE;
            transform: translate(-142px, -214px) scale(30%); /*这俩调换顺序结果不一样*/
        }
    }
    .n-login-scan .main .qr { /*QR码本码（几维码?）*/
        box-shadow: 0 0 0 1px var(--rsw-trans-color);
        border-radius: 4px;
        animation: QRCodeFlyIn .3s cubic-bezier(.34, .68, 0, 1) 1;
    }
    .n-login-scan .main .tip { /*QR码过期提示*/
        background: #0003;
        backdrop-filter: blur(4px);
    }
    .n-login-scan .main .phone { /*hover QR码后出现的手机*/
        top: 4px;
        clip-path: inset(30px 0 80px 3px round 8px);
    }
    .n-login-scan .main.z-hover .txt { /*hover后的用什么扫描提示*/
        top: 194px;
        width: unset;
        right: 0;
        left: 0;
        line-height: unset;
    }
    .n-login .iner .scan .icn { /*左上角QR码图标*/
        clip-path: polygon(0 0, 97% 0, 0 97%); /*斜向裁切（并非100%是为了去白线）*/
    }
    .n-login .iner .scan .tip { /*码标旁常驻提示*/
        display: none;
    }
    .u-icn-laycls svg { /*关闭按钮svg*/
        fill: var(--rsw-text-color);
        transition: .2s;
    }
    .u-icn-laycls:hover svg { /*关闭按钮svg （鼠标移上）*/
        fill: var(--rsw-accent-color);
    }
    .n-login .iptwrap, .n-login .iptwrap-sigle { /*输入框*/
        color: var(--rsw-accent-color);
        background: 0;
        box-shadow: 0 0 3px 0 var(--rsw-accent-color);
        border-color: var(--rsw-accent-color);
        border-radius: 10px;
        transition: .2s;
    }
    .n-login .iptwrap:hover, .n-login .iptwrap-sigle:hover, .n-login .iptwrap:hover .fill { /*输入框（鼠标移上）及其内下拉菜单*/
        box-shadow: 0 0 6px 1px var(--rsw-accent-color);
    }
    .n-login .iptwrap .itm-phone .zone, .n-login .iptwrap .itm-1 { /*输入框内分隔线*/
        border-color: var(--rsw-accent-color);
    }
    .n-login .iptwrap .itm input { /*输入框->input*/
        color: var(--rsw-text-color);
        background: #0000;
    }
    @keyframes dropDownAppears {
        0% {
            max-height: 0px;
        }
        100% {
            max-height: 216px;
        }
    }
    .n-login .iptwrap .itm-phone .zone { /*下拉框（电话号码国家代号）*/
        color: var(--rsw-text-color);
    }
    .n-login .fill { /*下拉菜单*/
        background: var(--rsw-bg-color-trans);
        backdrop-filter: blur(12px);
        box-shadow: 0 0 3px 0 var(--rsw-accent-color);
        border-color: var(--rsw-accent-color);
        border-radius: 0 0 10px 10px;
        transition: .2s;
        animation: dropDownAppears .2s 1;
    }
    .n-login .fill li { /*下拉选项*/
        margin: 2px 2px 3px 5px;
        border-radius: 4px;
        cursor: default;
    }
    .n-login .fill li:hover { /*下拉选项（鼠标移上）*/
        background: var(--rsw-trans-color);
    }
    .n-login .fill li.z-sel { /*选中的下拉选项*/
        color: var(--rsw-bg-color);
        background: var(--rsw-accent-color);
    }
    .n-login .fill-zone i { /*下拉选项中的国旗*/
        margin: 2px 8px 0 0;
    }
    .n-login .itm.itm-verify > span { /*获取验证码旁小横线*/
        margin: 0 !important;
        opacity: 0;
    }
    .n-login .itm.itm-verify > .fgt { /*获取验证码（链接）*/
        border: solid #0000;
        border-width: 12px 14px 12px 16px;
        box-shadow: -1px 0 0 0 var(--rsw-text-color);
    }
    .n-login .getcoding { /*获取验证码（倒计时）*/
        opacity: 1;
    }
    .n-login .auto input ~ span::before { /* fake 多选框（自动登录）*/
        width: 13px;
        height: 13px;
        box-shadow: 0 0 3px var(--rsw-accent-color);
        border: 1px solid var(--rsw-accent-color);
        border-radius: 50%;
        background: #0000;
        transition: .1s;
    }
    .n-login .auto input ~ span:hover::before { /*在鼠标下面的 fake 多选框（自动登录）*/
        box-shadow: 0 0 6px var(--rsw-accent-color);
        background: var(--rsw-trans-color);
    }
    .n-login .auto input:checked ~ span::before { /*选中的 fake 多选框（自动登录）*/
        background: var(--rsw-accent-color);
    }
    .n-login .btn-dark, .n-login-scan .main .tip a { /*高亮按钮+mini*/
        box-sizing: border-box;
        color: var(--rsw-text-color);
        height: 40px;
        max-width: 125px;
        margin: auto;
        border: 1px solid var(--rsw-accent-color);
        border-radius: 10px;
        box-shadow: 0 0 3px 0 var(--rsw-accent-color);
        background: #0000;
        transition: .1s;
        cursor: default;
    }
    .n-login-scan .main .tip a { /*mini高亮按钮（?）*/
        height: 30px;
        border-radius: 8px;
        background: var(--rsw-bg-color-trans);
    }
    .n-login .btn-dark:hover, .n-login-scan .main .tip a:hover { /*高亮按钮+mini（鼠标移上）*/
        border-color: var(--rsw-accent-color);
        box-shadow: 0 0 6px 0 var(--rsw-accent-color);
        background: #0000;
    }
    .n-login-scan .main .tip a:hover { /*mini高亮按钮（鼠标移上）*/
        background: var(--rsw-bg-color-trans);
    }
    .n-login .btn-dark:active, .n-login-scan .main .tip a:active { /*高亮按钮+mini（鼠标按下）*/
        font-size: 14px;
        line-height: 32px;
        border-width: 4px;
        box-shadow: 0 0 8px 0 var(--rsw-accent-color);
    }
    .n-login-scan .main .tip a:active { /*mini高亮按钮（鼠标按下）*/
        font-size: 12px;
        line-height: 22px;
    }
    .n-login .btn.z-dis { /*DISABLED按钮*/
        color: #888;
        box-shadow: 0 0 3px #888;
        border: 1px solid #888;
        background: #0000;
    }
    .n-login .btn.z-dis:hover { /*DISABLED按钮（鼠标移上）*/
        box-shadow: 0 0 6px #888;
    }
    .n-login .protocol svg { /*多选框svg （底栏那个同意）*/
        fill: var(--rsw-text-color);
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