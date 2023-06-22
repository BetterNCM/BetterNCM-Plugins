// @ts-nocheck
function Checkbox({ name, value, onClick, color }) {
    const checkboxRef = React.useRef();

    React.useEffect(() => {
        if (value === 1) {
            checkboxRef.current.checked = true;
            checkboxRef.current.indeterminate = false;
        } else if (value === 0) {
            checkboxRef.current.checked = false;
            checkboxRef.current.indeterminate = false;
        } else if (value === 2) {
            checkboxRef.current.checked = true;
            checkboxRef.current.indeterminate = true;
        }
    }, [value]);

    return (
        <label style={{ color, display: "flex", marginTop: ".3em" }}>
            <input style={{ marginRight: ".5em" }} ref={checkboxRef} type="checkbox" onClick={onClick} />
            <span>{name}</span>
        </label>
    );
}

function Expandable({ children, title }) {
    let [expanded, setExpanded] = React.useState(false);
    return (<div>
        <h3 class="s-fc1 f-ff2" style={{ cursor: "pointer" }} onClick={() => {
            setExpanded(!expanded)
        }}><span style={{
            transform: !expanded ? "rotate(-45deg)" : "",
            display: 'inline-block',
            transition: "transform 0.2s",
            opacity: '0.6',
            fontWeight: "800"
        }}> {'×'} </span> {title} </h3>

        <div style={{
            margin: "0.5em 1em",
            opacity: expanded ? "1" : "0",
            height: expanded ? "auto" : "0px",
            transition: "opacity 0.1s",
            overflow: "hidden"
        }}>
            {children}
        </div>
    </div>)
}

const ElementMap = betterncm.ncm.getNCMVersion().startsWith('3.') ? {
    "顶栏": {
        '网易云Logo': '#topArea',
        'VIP图标': '[data-log*="vipicon"]',
        '消息': '[aria-label="message"]',
    }
} : {
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
        "分享": ".btn-share",
        "歌词动效": ".le-toggle.f-vc"
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
}

function selectAnyElement() {
    return new Promise((resolve, reject) => {
        if (document.querySelector('.tinyNCM-Selected')) {
            reject("Already selecting");
            return;
        }
        // create fixed tips
        let tips = dom("div",
            {
                style: {
                    position: "fixed", left: "10px",
                    margin: "10px",
                    top: "10px", width: "200px", height: "50px", background: "#ffffff88", border: "1px solid #ffffff33",
                    pointerEvent: "none",
                    padding: "10px", zIndex: 9999, overflow: "auto",
                    boxShadow: "0 0 10px 0 rgba(0,0,0,0.5)",
                    color: "black",
                    borderRadius: "4px"
                }
                , innerText: "按 [Enter] 确定选择标红元素，按 [↑] 扩大选区，按 [↓] 缩小选区，按 [Esc] 取消"
            }, dom("style", { innerHTML: `.tinyNCM-Selected{ background: #ff000033; border: 3px solid red; box-sizing: border-box; }` }));
        document.body.appendChild(tips);

        let range = 0;
        let lastSelectedElement, lastHoveredElement;
        const updateSelectedElement = (selectedElement) => {
            if (lastSelectedElement !== selectedElement) {
                lastSelectedElement?.classList.remove("tinyNCM-Selected");
                selectedElement.classList.add("tinyNCM-Selected");
                lastSelectedElement = selectedElement;
            }
        }
        const mouseMoveListener = e => {
            const hoveredElement = document.elementFromPoint(e.clientX, e.clientY);
            if (lastHoveredElement !== hoveredElement) {
                lastHoveredElement = hoveredElement;
                range = 0;
                updateSelectedElement(getSelectedElement(hoveredElement, range))
            }
        }

        const generateQuerySelector = function (el) {
            if (el.tagName.toLowerCase() == "body")
                return "body";

            if (el.tagName.toLowerCase() == "html")
                return "HTML";
            var str = el.tagName;
            str += (el.id != "" && !el.id.startsWith("auto-")) ? "#" + el.id : "";
            if (el.className) {
                var classes = el.className.split(/\s/);
                for (var i = 0; i < classes.length; i++) {
                    str += "." + classes[i]
                }
            }
            return generateQuerySelector(el.parentNode) + " > " + str;
        }

        const getSelectedElement = (baseEle, r) => {
            for (let i = 0; i < r; i++)baseEle = baseEle.parentElement;
            return baseEle
        }

        const keydownListener = e => {
            // if is up or down
            if (e.key === "ArrowUp") {
                range++;
                e.preventDefault();
                updateSelectedElement(getSelectedElement(lastHoveredElement, range))
            } else if (e.key === "ArrowDown") {
                range--;
                console.log(range)
                if (range < 0) range = 0;
                e.preventDefault();
                updateSelectedElement(getSelectedElement(lastHoveredElement, range))
            } else if (e.key === "Enter") {
                document.removeEventListener("keydown", keydownListener);
                document.removeEventListener("mousemove", mouseMoveListener);
                tips.remove();
                lastSelectedElement.classList.remove("tinyNCM-Selected");
                let selector = generateQuerySelector(lastSelectedElement);
                resolve(selector);
            } else if (e.key === "Escape") {
                document.removeEventListener("keydown", keydownListener);
                document.removeEventListener("mousemove", mouseMoveListener);
                tips.remove();
                lastSelectedElement.classList.remove("tinyNCM-Selected");
                reject("Cancelled");
            }
        }

        document.addEventListener("mousemove", mouseMoveListener);
        document.addEventListener("keydown", keydownListener);
    });
}

function applyTinyNCM() {
    const config = JSON.parse(localStorage["cc.microblock.betterncm.tinyncm.minify"] || "{}");
    const custom = JSON.parse(localStorage["cc.microblock.betterncm.tinyncm.custom"] || "[]");

    let css = Object.entries(config).map(([selector, value]) => {
        if (value === 1) return `${selector}{display:none;}`;
        if (value === 2) return `${selector}{opacity:0;}`;
        return "";
    }).join("\n") + "\n\n" + custom.map(({ selector }) => {
        return `${selector}{display:none;}`;
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
    }, [config]);

    const [custom, setCustom] = React.useState(JSON.parse(localStorage["cc.microblock.betterncm.tinyncm.custom"] || "[]"));
    React.useEffect(() => {
        localStorage["cc.microblock.betterncm.tinyncm.custom"] = JSON.stringify(custom);
        applyTinyNCM();
    }, [custom]);


    let collectionsEle = [];

    for (let collection in ElementMap) {
        let configsEle = [];
        for (let name in ElementMap[collection]) {
            config[ElementMap[collection][name]] = config[ElementMap[collection][name]] ?? 0;
            configsEle.push((
                <Checkbox name={name} value={config[ElementMap[collection][name]]} color={
                    (!document.querySelector(ElementMap[collection][name])) && "#ffffff99"
                } onClick={(e) => {
                    let v = config[ElementMap[collection][name]];
                    v++; v %= 3;
                    setConfig({
                        ...config,
                        [ElementMap[collection][name]]: v
                    })
                }} />
            ))
        }
        collectionsEle.push((<Expandable title={collection}>{configsEle}</Expandable>))
    }
    return <>
        <div style={{ padding: "10px", fontSize: "20px", fontWeight: "800" }}>预设屏蔽项</div>
        {collectionsEle}
        <div style={{ padding: "10px", fontSize: "20px", fontWeight: "800" }}>自定义屏蔽项</div>
        <button style={{ backgroundColor: "white", color: "black" }} onClick={async () => {
            try {
                const selector = await selectAnyElement();
                setCustom([...custom, { selector, mode: 0, text: document.querySelector(selector).innerText.replace(/\s/g, '').slice(0, 20) }])
            } catch (e) { }
        }}>选择自定义屏蔽项</button >
        <button style={{ backgroundColor: "white", color: "black" }} onClick={async () => {
            try {
                const selector = prompt("请输入CSS选择器");
                if (!selector) return;
                setCustom([...custom, { selector, mode: 0, text: document.querySelector(selector).innerText.replace(/\s/g, '').slice(0, 20) }])
            } catch (e) { }
        }}>手动添加（高级）</button >
        <br />
        {custom.map((item, index) => {
            return <Checkbox name={`${item.text} (${item.selector})`} value={1} color={
                (!document.querySelector(item.selector)) && "#ffffff99"
            } onClick={(e) => {
                setCustom(custom.filter(v => v.selector !== item.selector));
            }} />
        })}
    </>
}

applyTinyNCM();

function applyFont() {
    const config = JSON.parse(localStorage["cc.microblock.betterncm.tinyncm.font"] || "{}");

    if (!document.querySelector(".tinyNCM-Font"))
        document.body.appendChild(dom("style", { class: ["tinyNCM-Font"] }));

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

    return (<div>
        <span>字体</span>
        <input className="u-txt sc-flag" style={{ margin: '0.2em 0.5em', borderRadius: '0.5em' }} defaultValue={config.fontFamily}
            onKeyUp={(e) => {
                setConfig({
                    fontFamily: e.target.value
                });
            }} />
    </div>)
}

let ncmColors = null;

const colorUsageComments = `var(--icnTheme): 主题图标颜色
#ffffff: 一般文字
#fff: 一般文字`
const chatgptColorUsagePredictions = `#ec4141: 活动相关，收藏、点赞、评论、排行榜等
#e0e0e0: 封面图、头像等
#85b9e6: 文字
#d15400: VIP相关的图标、SVG
#ffbd20: 达人相关的图标、SVG、标签等
#f0483b: 优优人相关的图标、SVG、标签等
#b82525: 失败相关的图标、SVG
#5e9e5f: 新增排名相关的图标
#666: 各种小图标、SVG，包括本地、云端、电台、日历、历史等
#e87778: MV 相关的标记
#9b9b9b: 无选择项时的默认值
#f2f2f2: DJ 标记
#fff: 各种按钮、标签、提示等
#d9e5f9: 消息提示
#333: 播放器中各种提示、标记、选中状态
#888: 播放器中的各种图标和标记
#000000: 播客相关的标记
#F5F5F5: 头部导航栏
#000: 搜索框、各种小图标等
#252525: 播放器中节目名称、播放列表等
#999: 播放器中本地歌曲列表
#CDCAAF: 播放器中提示共享列表
#4a79cc: 首页轮播图的标签
#ff3a3a: MV 详情页中作者按钮
#2b2b2b: 各种按钮、标签、提示等的文字
#b3cee5: 歌词播放器中高亮行
#d73535: FM 播放器中喜欢按钮
#2e2e2e: 用户信息、艺人信息等
#e03a3a: 加关注提示中 VIP 用户的标记
#e03a6f: 加关注提示中 DJ 的标记
#0f0: 裁剪图片时的标记
#1c1c1c: 播放器中音效调节
#363636: 播放器中各种进度条、列表、速度等
#eee: 聊天界面中提示有新消息
#f5f5f7: 播放器中速度调节按钮
#69c47a: 播放器中速度调节按钮中的绿色标记
#D0021B: 消息列表中未读消息的
#eeeff0: 播放列表中鼠标悬停时
#71bbea: 播放列表中共享列表按钮的鼠标悬停时
#b04b4b: 播放器中电台连线
#e1e1e2: 活动报名表单
#FF2C55: 直播相关的小图标和标记
#27292e: 播放列表中热门评论的按钮不可用时
#393b3e: 聊天界面中更多按钮
#3e3e3e: 单曲评论区
#222222: 新歌试听界面中的按钮`

function applyColors() {
    if (!ncmColors) return;

    const config = JSON.parse(localStorage["cc.microblock.betterncm.tinyncm.colors"] || "{}");

    if (!document.querySelector(".tinyNCM-Colors"))
        document.body.appendChild(dom("style", { class: ["tinyNCM-Colors"] }));

    let cssDom = document.querySelector(".tinyNCM-Colors");
    let css = "";
    for (const originColor in config) {
        if (!(originColor in ncmColors)) continue;
        css += ncmColors[originColor].selectors.map(selector => {
            if (config[originColor].startsWith("#") && config[originColor].length === 7) {
                // encode origin opacity to hex
                const opacity = Math.round(selector.originOpacity * 255).toString(16);
                return `${selector.s}{color:${config[originColor]}${opacity} !important;fill: ${config[originColor]}${opacity} !important;}`;
            }

            return `${selector.s}{color:${config[originColor]} !important;fill: ${config[originColor]} !important;}`;
        }).join("\n\n");
    }
    cssDom.innerHTML = css;
}

function ColorsEle() {
    const [config, setConfig] = React.useState(JSON.parse(localStorage["cc.microblock.betterncm.tinyncm.colors"] || "{}"));
    React.useEffect(() => {
        localStorage["cc.microblock.betterncm.tinyncm.colors"] = JSON.stringify(config);
        applyColors();
    }, [config]);

    const [colors, setColors] = React.useState({});

    React.useEffect(() => {
        !(async () => {
            const colorCSSRegex = /(.*?)\n([\.,\#].*?){.*?[fill:,color:]\s+(.*?);/mgs;
            const commentRegex = /\/\*(.*?)\*\//;
            const colorRegex = /(#\S+|rgb\(.*?\)|rgba\(.*?\)|var\(.*?\))/g;

            ncmColors = (await (await fetch('orpheus://orpheus/style/res/less/default/css/skin.ls.css')).text()).match(colorCSSRegex).map(v => {
                try {
                    const [_, comment, selector, originColor] = colorCSSRegex.exec(v);
                    const matchedComment = commentRegex.exec(comment)
                    return ({
                        selector, originColor: colorRegex.exec(originColor)[1],
                        comment: matchedComment && matchedComment[1].replace(/\*/g, '').trim(), v
                    })
                } catch (e) {
                    return null;
                }
            }).filter(v => v)
                .reduce((p, v) => {
                    if (v.originColor.startsWith("#"))
                        v.originColor = v.originColor.replace(/\.|\,|\)/g, "");

                    //https://codepen.io/camponogara/pen/EmXmgy
                    function rgb2hex(rgb) {
                        rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
                        return (rgb && rgb.length === 4) ? "#" +
                            ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
                            ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
                            ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
                    }

                    // get origin opacity of rgba and hex, for rgb, use 1
                    const originOpacity = v.originColor.startsWith('rgba') ?
                        v.originColor.replace(/rgba\(|\)/g, '').split(',')[3] :
                        (v.originColor.startsWith('#') && v.originColor.length > 7) ? parseInt(v.originColor.slice(7, 9), 16) / 255 : 1;

                    // convert rgb and rgba to hex
                    if (v.originColor.startsWith('rgb'))
                        v.originColor = rgb2hex(v.originColor);

                    p[v.originColor] ??= { selectors: [], originColor: v.originColor, comment: null };
                    p[v.originColor].comment ??= v.comment;
                    p[v.originColor].selectors.push({ originOpacity, s: v.selector });

                    p[v.originColor].originColor = v.originColor;
                    return p;
                }, {});
            console.log(ncmColors)
            setColors(ncmColors);
            applyColors();
        })();
    }, []);

    if (!colors) return <div>加载中...</div>
    return (<div>
        <button style={{ backgroundColor: "white", color: "black" }} onClick={() => { setConfig({}) }}>重置</button>
        {
            Object.values(colors).map(color => {
                const chatgptComment = chatgptColorUsagePredictions.split('\n').find(v => v.startsWith(color.originColor))?.split(' ')[1];
                const manualComment = colorUsageComments.split('\n').find(v => v.startsWith(color.originColor))?.split(' ')[1];
                const varSelectorComment = color.originColor.startsWith("var(") && color.originColor.replace(/{var\(,\)}/g, "").trim();

                return (<div>
                    <span style={{ backgroundColor: "white", color: "black" }}>{
                        (manualComment && "(√) " + manualComment) ?? color.comment ??
                        (chatgptComment && "ChatGPT: " + chatgptComment) ?? "未知"} {varSelectorComment ? `${varSelectorComment}` : ''}</span>

                    <span style={{ backgroundColor: color.originColor }}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                    <input style={{ margin: '0.2em 0.5em', borderRadius: '0.5em' }}
                        type="color"
                        defaultValue={config[color.originColor] ?? color.originColor}
                        onChange={(e) => {
                            setConfig({ ...config, [color.originColor]: e.target.value });
                            e.target.nextElementSibling.nextElementSibling.checked = false;
                        }} />

                    <button style={{ backgroundColor: "white", color: "black" }} onClick={(e) => e.currentTarget.previousElementSibling.value = color.originColor}>还原默认</button>

                    <input type="checkbox"
                        value={config[color.originColor]?.length == 9 && config[color.originColor]?.endsWith("ff")}
                        onClick={(e) => {
                            // switch 'ff' after color code
                            if (!color.originColor.startsWith("var("))
                                setConfig({ ...config, [color.originColor]: config[color.originColor].length == 9 && config[color.originColor].endsWith("ff") ? config[color.originColor].slice(0, 7) : config[color.originColor] + "ff" });
                        }}
                    />
                    <span style={{ backgroundColor: "white", color: "black" }} >忽略透明度</span>

                </div>)
            })
        }
    </div>)
}

plugin.onConfig((tools) => {
    let root = document.createElement("div");
    let settingsEle = (<div>
        <Expandable title="网易云精简">
            <MinifyEle />
        </Expandable>
        <Expandable title="字体修改">
            <FontEle />
        </Expandable>
        <Expandable title="颜色修改">
            <ColorsEle />
        </Expandable>
    </div>);

    ReactDOM.render(settingsEle, root);
    return root
});

