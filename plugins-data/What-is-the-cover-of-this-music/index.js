"use strict";


betterncm.fs.readFileText(`${this.pluginPath}/style.css`).then(cssText => {
    const style = document.createElement("style");
    style.innerHTML = cssText;
    document.head.appendChild(style);
});


async function addCover(element) {
    let data = new URLSearchParams({ c: `[{"id":${element.dataset.resId}}]` }).toString();
    const json = await (await fetch(`https://music.163.com/api/v3/song/detail?${data}`)).json();
    const qwq = element.querySelector(".title");
    const img = document.createElement("img");
    img.src = `orpheus://cache/?${json.songs[0].al.picUrl}?param=64y64`;    // 缓存
    img.classList.add("cover");
    qwq.insertBefore(img, qwq.children[0]);
}


async function onHashchange(event) {
    // 每日推荐
    if (plugin.getConfig("owo") && event.newURL.includes("#/m/dailysong/")) {
        const result = await betterncm.utils.waitForElement(".m-daily .m-plylist");
        result.querySelectorAll(".itm").forEach(addCover);
    };

    // 听歌排行
    if (plugin.getConfig("uwu") && event.newURL.includes("#/m/person/record/")) {
        const result = await betterncm.utils.waitForElement(".m-recordscroll .m-plylist");
        result.querySelectorAll(".itm").forEach(addCover);
    };

    // 搜索列表
    if (plugin.getConfig("xwx") && event.newURL.includes("#/m/search/")) {
        const result = await betterncm.utils.waitForElement(".m-search .lst");
        new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.classList && node.classList.contains("m-plylist")) {
                        result.querySelectorAll(".itm").forEach(addCover);
                    }
                }
            }
        }).observe(result, { childList: true });
    };

    // 歌手专辑 - 以后再做
    // if (plugin.getConfig("awa") && event.newURL.includes("#/m/artist/")) {
    //     const result = await betterncm.utils.waitForElement(".m-yrsh .m-mtlist .m-plylist-mix");
    //     result.querySelectorAll(".itm").forEach(addCover);
    // };

    // 歌单列表 - 有些bug，不会做了，先搁置吧。快来大佬帮帮我！
    // if (plugin.getConfig("qwq") && event.newURL.includes("#/m/playlist/")) {
    //     const result = await betterncm.utils.waitForElement(".m-plylist_playlist .lst");
    //     result.querySelectorAll(".itm").forEach(addCover);
    // };
}


async function checkbox(event) {
    plugin.setConfig(event.target.name, event.target.checked);
    if (event.target.checked) document.documentElement.classList.add(`WTCTM-${event.target.name}`);
    else document.documentElement.classList.remove(`WTCTM-${event.target.name}`);
}


plugin.onConfig(tools => {
    return dom("div", {},
        dom("div", { style: { marginBottom: "10px", display: "flex", alignItems: "center" } },
            dom("span", { innerText: "每日推荐：" }),
            tools.makeCheckbox({ onclick: checkbox, name: "owo", checked: plugin.getConfig("owo") })
        ),
        dom("div", { style: { marginBottom: "10px", display: "flex", alignItems: "center" } },
            dom("span", { innerText: "听歌排行：" }),
            tools.makeCheckbox({ onclick: checkbox, name: "uwu", checked: plugin.getConfig("uwu") })
        ),
        dom("div", { style: { marginBottom: "10px", display: "flex", alignItems: "center" } },
            dom("span", { innerText: "搜索列表：" }),
            tools.makeCheckbox({ onclick: checkbox, name: "xwx", checked: plugin.getConfig("xwx") })
        ),
        dom("div", { style: { marginBottom: "10px", display: "flex", alignItems: "center" } },
            dom("span", { innerText: "歌手专辑 - 未完成：" }),
            tools.makeCheckbox({ onclick: checkbox, name: "awa", checked: plugin.getConfig("awa"), disabled: true })
        ),
        dom("div", { style: { marginBottom: "10px", display: "flex", alignItems: "center" } },
            dom("span", { innerText: "歌单列表 - 未完成：" }),
            tools.makeCheckbox({ onclick: checkbox, name: "qwq", checked: plugin.getConfig("qwq"), disabled: true })
        ),
    );
});


plugin.onLoad(() => {
    const list = ["owo", "uwu", "xwx", /* "awa", "qwq" */];
    list.forEach(value => {
        plugin.setConfig(value, plugin.getConfig(value, true));
        if (plugin.getConfig(value)) document.documentElement.classList.add(`WTCTM-${value}`);
        else document.documentElement.classList.remove(`WTCTM-${value}`);
    });
    window.addEventListener("hashchange", onHashchange);
});
