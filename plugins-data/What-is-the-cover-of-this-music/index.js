"use strict";


async function styleLoader() {
    const cssText = `
        /* 修改条目高度 */
        .m-daily .m-plylist .itm,
        .m-recordscroll .m-plylist .itm,
        .m-search .m-plylist:not(.m-plylist-lrc-mult) .itm,
        .m-yrsh .m-plylist .itm,
        .m-plylist_playlist .lst .itm {
            height: calc(var(--cover-size, 32px) + 10px);
        }

        /* 序号垂直居中 */
        .m-daily .m-plylist .itm:before,
        .m-recordscroll .m-plylist .itm:before,
        .m-search .m-plylist .itm:before,
        .m-yrsh .m-plylist .itm::before,
        .m-plylist_playlist .lst .itm:before {
            height: calc(var(--cover-size, 32px) + 10px);
            line-height: calc(var(--cover-size, 32px) + 10px);
        }

        /* 文字垂直居中 */
        .m-daily .m-plylist .td,
        .m-recordscroll .m-plylist .td,
        .m-search .m-plylist .td,
        .m-yrsh .m-plylist .td,
        .m-plylist_playlist .lst .td {
            height: calc(var(--cover-size, 32px) + 10px);
            line-height: var(--cover-size, 32px);
        }

        /* 图标垂直居中 */
        .m-daily .m-plylist .ico,
        .m-recordscroll .m-plylist .ico,
        .m-search .m-plylist .ico,
        .m-yrsh .m-plylist .ico,
        .m-plylist_playlist .lst .ico {
            margin: calc(var(--cover-size, 12px)) 0 0 8px;
        }

        /* 封面位置模糊 */
        .m-daily .m-plylist .title:not(.cover-loaded)::before,
        .m-recordscroll .m-plylist .title:not(.cover-loaded)::before,
        .m-search .m-plylist .title:not(.cover-loaded)::before,
        .m-yrsh .m-plylist .title:not(.cover-loaded)::before,
        .m-plylist_playlist .lst .title:not(.cover-loaded)::before {
            content: "";
            position: absolute;
            width: var(--cover-size, 32px);
            height: var(--cover-size, 32px);
            border-radius: 6px;
            backdrop-filter: blur(4px);
            background-color: rgba(255, 255, 255, 0.2);
        }

        /* 封面预留位置 */
        .m-daily .m-plylist .tit,
        .m-recordscroll .m-plylist .tit,
        .m-search .m-plylist .tit,
        .m-yrsh .m-plylist .tit,
        .m-plylist_playlist .lst .tit {
            margin-left: calc(var(--cover-size, 32px) + 10px);
        }

        /* 音乐封面居中 */
        .m-daily .m-plylist .cover,
        .m-recordscroll .m-plylist .cover,
        .m-search .m-plylist .cover,
        .m-yrsh .m-plylist .cover,
        .m-plylist_playlist .lst .cover {
            position: absolute;
            width: var(--cover-size, 32px);
            height: var(--cover-size, 32px);
            border-radius: 6px;
        }
    `;
    const style = document.createElement("style");
    style.innerHTML = cssText;
    document.head.appendChild(style);
}

let observer = null;

let cache = {};

const setCover = async (title, url) => {
    const img = document.createElement("img");
    img.src = `orpheus://cache/?${url}?param=64y64`;
    img.classList.add("cover");
    img.loading = "lazy";
    img.addEventListener("load", () => title.classList.add("cover-loaded"));
    title.insertBefore(img, title.children[0]);
}

const fetchCovers = async (title, resId) => {
    const resIdList = resId.map(value => { return { "id": value } });
    const params = new URLSearchParams({ "c": JSON.stringify(resIdList) }).toString();
    const res = await fetch(`https://music.163.com/api/v3/song/detail?${params}`);

    (await res.json()).songs.forEach((value, index) => {
        cache[value.id] = value.al.picUrl;
        setCover(title[index], value.al.picUrl);
    });
}

const addCover = async (result) => {
    const func = async () => {
        let titles = [], resIds = [];
        result.classList.add("list-with-covers");
        for (const item of result.querySelectorAll(".itm:not(.cover-initialized)")) {
            item.classList.add("cover-initialized");
            if (cache[item.dataset.resId]) {
                setCover(item.querySelector(".title"), cache[item.dataset.resId]);
                continue;
            }
            titles.push(item.querySelector(".title"));
            resIds.push(item.dataset.resId);

            if (titles.length == 20) {
                await fetchCovers([...new Set(titles)], [...new Set(resIds)]);
                titles = [];
                resIds = [];
            }
        }

        if (titles.length) {
            await fetchCovers([...new Set(titles)], [...new Set(resIds)]);
        }
    }

    observer = new MutationObserver(func);
    observer.observe(result, { childList: true, subtree: true });
    const interval = setInterval(() => {
        if (result.querySelector(".itm")) {
            func();
            clearInterval(interval);
        }
    }, 100);
}


async function onHashchange(event) {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    let result = null;

    // 每日推荐
    if (event.newURL.includes("#/m/dailysong/")) {
        result = await betterncm.utils.waitForElement(".m-daily");
    }

    // 听歌排行
    if (event.newURL.includes("#/m/person/record/")) {
        result = await betterncm.utils.waitForElement(".m-recordscroll");
    }

    // 搜索列表
    if (event.newURL.includes("#/m/search/")) {
        result = await betterncm.utils.waitForElement(".m-search");
    }

    // 歌手专辑
    if (event.newURL.includes("#/m/artist/")) {
        result = await betterncm.utils.waitForElement(".m-yrsh");
    }

    // 歌单列表
    if (event.newURL.includes("#/m/playlist/")) {
        result = await betterncm.utils.waitForElement(".m-plylist_playlist");
    }

    result && addCover(result);
}


plugin.onLoad(async () => {
    styleLoader();
    addEventListener("hashchange", onHashchange);
});
