"use strict";


plugin.onConfig(tools => {
    return dom("div", {},
        dom("div", {},
            tools.makeBtn("从左到右", () => plugin.setConfig("direction", "left"), true),
            tools.makeBtn("从右到左", () => plugin.setConfig("direction", "right"), true)
        ),
        dom("br", {}),
        dom("div", {},
            dom("span", { innerText: "自定义背景颜色：" }),
            tools.makeInput(plugin.getConfig("backgroundColor", "rgba(255,255,255,0.2)"), { oninput: event => plugin.setConfig("backgroundColor", event.target.value) })
        ),
    );
});


plugin.onLoad(() => {
    window.addEventListener("hashchange", event => {
        const url = new URL(event.newURL);
        if (url.hash.startsWith("#/m/person/record/?")) {
            betterncm.utils.waitForElement(".m-recordscroll .lst .m-plylist-recent").then(result => {
                const base = result.querySelector(".itm .flow .td.col.s-fc4").innerText.slice(0, -1);
                for (const value of result.querySelectorAll(".itm")) {
                    const count = value.querySelector(".flow .td.col.s-fc4").innerText.slice(0, -1);
                    const tag = document.createElement("div");
                    tag.style.position = "absolute";
                    tag.style.backgroundColor = plugin.getConfig("backgroundColor", "rgba(255,255,255,0.2)");
                    tag.style.zIndex = "-1"
                    tag.style.top = "0";
                    tag.style.bottom = "0";
                    tag.style[plugin.getConfig("direction", "left")] = "0";
                    tag.style.width = `${count / base * 100}%`;
                    value.appendChild(tag);
                    value.style.overflow = "hidden";
                }
            });
        }
    });
});
