// @ts-nocheck
function Checkbox({ name, value, onClick }) {
    const checkboxRef = React.useRef();
    React.useEffect(() => {
        if (value === 1) {
            checkboxRef.current.checked = true;
            checkboxRef.current.indeterminate = false;
        }
        else if (value === 0) {
            checkboxRef.current.checked = false;
            checkboxRef.current.indeterminate = false;
        }
        else if (value === 2) {
            checkboxRef.current.checked = true;
            checkboxRef.current.indeterminate = true;
        }
    }, [value]);
    return (React.createElement("label", { style: { display: "flex", marginTop: ".3em" } },
        React.createElement("input", { style: { marginRight: ".5em" }, ref: checkboxRef, type: "checkbox", onClick: onClick }),
        React.createElement("span", null, name)));
}
function Expandable({ children, title }) {
    let [expanded, setExpanded] = React.useState(false);
    return (React.createElement("div", null,
        React.createElement("h3", { class: "s-fc1 f-ff2", style: { cursor: "pointer" }, onClick: () => {
                setExpanded(!expanded);
            } },
            React.createElement("span", { style: {
                    transform: !expanded ? "rotate(-45deg)" : "",
                    display: 'inline-block',
                    transition: "transform 0.2s",
                    opacity: '0.6',
                    fontWeight: "800"
                } },
                " ",
                '×',
                " "),
            " ",
            title,
            " "),
        React.createElement("div", { style: {
                margin: "0.5em 1em",
                opacity: expanded ? "1" : "0",
                height: expanded ? "auto" : "0px",
                transition: "opacity 0.1s",
                overflow: "hidden"
            } }, children)));
}
const ElementMap = {
    "顶栏": {
        "网易云Logo": ".m-logo",
        "听歌识曲": ".j-listentosong",
        "头像": ".user.j-flag",
        "VIP等级": ".tovip,.u-icn-viplevel-size1",
        "消息": ".itm.itm2.msg.j-flag",
        "Mini模式": ".icn.fix"
    }, "侧边栏": {
        "发现": "[data-id=\"/m/disc/\"]",
        "播客": "[data-id=\"/m/podcast/\"]",
        "视频": ".mv.j-flag",
        "关注": ".j-friend-entrant",
        "直播": ".look.j-flag",
        "FM": ".fm.j-flag",
        "本地": "[data-id=\"/m/offline/\"]",
        "最近": "[data-id=\"/m/history/\"]",
        "云盘": ".cloud.j-flag",
        "我的播客": ".rdi.j-flag",
        "收藏": ".mix.j-flag",
        "歌单": ".j-hostplst"
    }, "播放栏": {
        "播放顺序": ".type.f-cp",
        "歌词": ".word.f-cp",
        "音质": ".brt.f-vc",
        "音效": ".audioEffect",
        "一起听": ".listenTogether",
        "播放列表": ".list.f-vc.f-cp",
        "全屏": ".playfull",
        "喜欢": ".btn-love",
        "收藏": ".btn-fav",
        "下载": ".btn-dld",
        "分享": ".btn-share"
    }, "播放页面": {
        "直播": ".g-singlec-live",
        "MV": ".tag-wrap",
        "评论": ".g-mn2.j-flag",
        "推荐": ".g-sd2.recommend.j-flag",
        "发评论": ".g-singlec-comment-detail",
        "返回顶部": ".g-singlec-comment-top"
    }, "歌单": {
        "创建者": ".m-info .user",
        "按钮": ".m-info .btns",
        "喜欢": ".u-micn-loved",
        "下载": ".u-micn-dld",
        "已下载": ".u-icn-dld_ok",
        "SQ": ".u-micn-sq",
        "Hi-Res": ".SpriteIcon_hires",
        "试听": ".u-micn-try",
        "MV": ".u-micn-mv",
        "VIP": ".u-micn-vip"
    }
};
function applyTinyNCM() {
    let config = JSON.parse(localStorage["cc.microblock.betterncm.tinyncm.minify"] || "{}");
    let css = Object.entries(config).map(([selector, value]) => {
        if (value === 1)
            return `${selector}{display:none;}`;
        if (value === 2)
            return `${selector}{opacity:0;}`;
        return "";
    }).join("\n");
    if (!document.querySelector(".tinyNCM-Minify"))
        document.head.appendChild(dom("style", { class: ["tinyNCM-Minify"] }));
    let cssDom = document.querySelector(".tinyNCM-Minify");
    cssDom.innerHTML = css;
}
function MinifyEle() {
    const [config, setConfig] = React.useState(JSON.parse(localStorage["cc.microblock.betterncm.tinyncm.minify"] || "{}"));
    React.useEffect(() => {
        localStorage["cc.microblock.betterncm.tinyncm.minify"] = JSON.stringify(config);
        applyTinyNCM();
    });
    let collectionsEle = [];
    for (let collection in ElementMap) {
        let configsEle = [];
        for (let name in ElementMap[collection]) {
            config[ElementMap[collection][name]] = config[ElementMap[collection][name]] ?? 0;
            configsEle.push((React.createElement(Checkbox, { name: name, value: config[ElementMap[collection][name]], onClick: (e) => {
                    let v = config[ElementMap[collection][name]];
                    v++;
                    v %= 3;
                    console.log(v, {
                        ...config,
                        [ElementMap[collection][name]]: v
                    });
                    setConfig({
                        ...config,
                        [ElementMap[collection][name]]: v
                    });
                } })));
        }
        collectionsEle.push((React.createElement(Expandable, { title: collection }, configsEle)));
    }
    return React.createElement(React.Fragment, null, collectionsEle);
}
applyTinyNCM();
function applyFont() {
    const config = JSON.parse(localStorage["cc.microblock.betterncm.tinyncm.font"] || "{}");
    if (!document.querySelector(".tinyNCM-Font"))
        document.head.appendChild(dom("style", { class: ["tinyNCM-Font"] }));
    let cssDom = document.querySelector(".tinyNCM-Font");
    let css = "";
    if (config.fontFamily)
        css += `
    *:not(.no-force-font){
        font-family:'${config.fontFamily}' !important;
    }
    `;
    cssDom.innerHTML = css;
}
applyFont();
function FontEle() {
    const [config, setConfig] = React.useState(JSON.parse(localStorage["cc.microblock.betterncm.tinyncm.font"] || "{}"));
    React.useEffect(() => {
        localStorage["cc.microblock.betterncm.tinyncm.font"] = JSON.stringify(config);
        applyFont();
    });
    return (React.createElement("div", null,
        React.createElement("span", null, "\u5B57\u4F53"),
        React.createElement("input", { className: "u-txt sc-flag", style: { margin: '0.2em 0.5em', borderRadius: '0.5em' }, defaultValue: config.fontFamily, onKeyUp: (e) => {
                setConfig({
                    fontFamily: e.target.value
                });
            } })));
}
plugin.onConfig((tools) => {
    let root = document.createElement("div");
    let settingsEle = (React.createElement("div", null,
        React.createElement(Expandable, { title: "\u7F51\u6613\u4E91\u7CBE\u7B80" },
            React.createElement(MinifyEle, null)),
        React.createElement(Expandable, { title: "\u5B57\u4F53\u4FEE\u6539" },
            React.createElement(FontEle, null))));
    ReactDOM.render(settingsEle, root);
    return root;
});
