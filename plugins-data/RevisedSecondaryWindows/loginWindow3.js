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
    @keyframes inIframe { /*iframe你好*/
        0%, 50% {
            opacity: 0;
        }
    }
    body { /*身体（?）标题*/
        color: var(--rsw-text-color);
        background: var(--rsw-bg-color);
    }
    div.m-layer .zbar { /*标题栏*/
        cursor: default;
        padding: 14px 20px;
        background: var(--rsw-trans-color);
        border-bottom: 1px solid var(--rsw-accent-color);
        box-shadow: inset 0 -5px 4px -5px var(--rsw-accent-color);
    }
    div.m-layer .zbar .zttl { /*标题文字*/
        font-size: 17px;
        line-height: 19px;
        text-align: left;
        padding: 0;
    }
    .u-icn-laycls svg { /*关闭按钮svg*/
        fill: var(--rsw-text-color);
        transition: .2s;
    }
    .u-icn-laycls:hover svg { /*关闭按钮svg （鼠标移上）*/
        fill: var(--rsw-accent-color);
    }
    iframe { /*嵌入的第三方登录页*/
        background: #EEE; /*微信ONLY*/
        animation: inIframe .5s 1;
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