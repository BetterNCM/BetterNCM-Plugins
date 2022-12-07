let opacityVal = parseFloat(localStorage["cc.microblock.bgenhanced.opacity"] || "1.0");
let blurVal = parseFloat(localStorage["cc.microblock.bgenhanced.blur"] || "0.0");
let baseColorVal = localStorage["cc.microblock.bgenhanced.baseColor"] || "#000000";

document.body.style.background = baseColorVal;

function setBackground(background) {
    document.querySelector("#portal_root").style.background = "#00000000"
    if (!document.getElementById("BGEnhanced_Background"))
        document.body.appendChild(dom("div", {
            id: "BGEnhanced_Background", style: {
                position: "fixed",
                left: "0",
                top: "0",
                right: "0",
                bottom: "0",
                zIndex: "-100000"
            }
        }))

    let bgdom = document.getElementById("BGEnhanced_Background")
    while (bgdom.firstChild) bgdom.firstChild.remove()

    function adjustSize() {
        if (micaEnabled) return;

        let bg = document.getElementById("BGEnhanced_Background").firstChild

        let scale = Math.max(window.innerHeight / bg.offsetHeight, window.innerWidth / bg.offsetWidth)

        bg.style.width = scale * bg.offsetWidth + "px"
        // bg.style.height=scale*bg.offsetHeight+"px"
    }

    switch (background.type) {
        case "image": {
            let img = dom("img", { src: background.url, onload: adjustSize });
            bgdom.appendChild(img)

            break;
        }
        case "video": {
            let video = dom("video", { autoplay: true, loop: true, muted: true, onplay: adjustSize }, dom("source", { src: background.url }));
            bgdom.appendChild(video)

            break;
        }
    }

    bgdom.style.opacity = opacityVal;
    bgdom.style.filter = `blur(${blurVal}px)`;

    window.onresize = adjustSize
}

let backgrounds = [];

function updateCurrentBackground() {
    let current = backgrounds.find(v => v.current);
    if (current !== undefined)
        setBackground(current)
}

plugin.onLoad(() => {
    if (plugin.getConfig("backgrounds")) backgrounds = JSON.parse(plugin.getConfig("backgrounds"))

    let enabledRandBG = plugin.getConfig("randomBG", " ") === "x"

    if (enabledRandBG && backgrounds.length > 0) {
        for (let bg of backgrounds) bg.current = false;

        let index = Math.floor(backgrounds.length * Math.random())
        backgrounds[index].current = true
    }


    updateCurrentBackground()
})

function ncmAlert(...args) {
    try {
        nm.x.ci(...args)
    } catch (e) { }
}

let micaEnabled = false;

let [enableMica, disableMica] = (() => {
    async function cPos() {
        const scale = window.devicePixelRatio;
        let pos = await betterncm.app.getNCMWinPos();

        document.querySelector("#BGEnhanced_Background img").style.marginLeft = `${pos.x * -1 / scale}px`;
        document.querySelector("#BGEnhanced_Background img").style.marginTop = `${pos.y * -1 / scale}px`;

    }

    async function cImg() {
        let url = URL.createObjectURL(await betterncm.app.takeBackgroundScreenshot());
        document.querySelector("#BGEnhanced_Background img").src = url;
    }

    const onload = e => {
        e.target.style.opacity = 1;
        document.querySelector("#BGEnhanced_Background img").style.width = `${window.screen.width}px`;
    };

    const onpointerdown = () => {
        document.querySelector("#BGEnhanced_Background img").style.opacity = 0;
        document.querySelector("header").addEventListener("pointermove", pointerMv);
    }

    const onblur = async () => {
        document.querySelector("#BGEnhanced_Background img").style.opacity = 0;
    }

    const onfocus = async () => {
        cImg()
    }

    async function pointerMv(e) {
        if (e.pressure == 0) {
            document.querySelector("header").removeEventListener("pointermove", pointerMv);
            await cPos(); cImg();
            document.querySelector("#BGEnhanced_Background img").style.opacity = 1;
        }
    }

    return [
        function enableMica() {
            micaEnabled = true;
            let bgdom = document.getElementById("BGEnhanced_Background")
            setBackground({ type: "image", url: "" })
            let mask = dom("div", { class: ["micaMask"] });
            bgdom.appendChild(mask)


            document.querySelector("#BGEnhanced_Background img").classList.add("micaLayer");
            cPos(); cImg();
            document.querySelector("#BGEnhanced_Background img").addEventListener("load", onload);
            document.querySelector("header").addEventListener("pointerdown", onpointerdown);
            window.addEventListener("blur", onblur);
            window.addEventListener("focus", onfocus);
        }, function disableMica() {
            micaEnabled = false;
            document.querySelector("#BGEnhanced_Background img").classList.remove("micaLayer")
            document.querySelector("#BGEnhanced_Background img").removeEventListener("load", onload);
            document.querySelector("header").removeEventListener("pointerdown", onpointerdown);
            window.removeEventListener("blur", onblur);
            window.removeEventListener("focus", onfocus);
        }
    ]
})()


plugin.onConfig((tools) => {
    let addBgBtn = dom("input", {
        id: "bgenhanced_bgselectbtn",
        type: "file", async onchange(e) {
            ncmAlert({
                state: "loading"
            })

            let url = addBgBtn.value;
            let ext = url.substring(url.lastIndexOf('.') + 1).toLowerCase();
            if (!ext) return;

            let type;

            if (['mp4', 'mov', 'webm'].includes(ext)) type = "video";
            if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) type = "image";

            if (!type) {
                ncmAlert({
                    text: "失败：不支持的文件"
                })
                return;
            }


            let imgid = Math.floor(Math.random() * 10000000)
            let path = "/temp/" + imgid + "." + ext;
            await betterncm.fs.mkdir("temp")
            if (addBgBtn.files[0].size > 700000000) {
                ncmAlert({
                    text: "失败：文件过大"
                })
                return;
            }
            await betterncm.fs.writeFile(path, addBgBtn.files[0])

            let accessPath = `${BETTERNCM_FILES_PATH + path}`
            backgrounds.push({ url: accessPath, type })

            plugin.setConfig("backgrounds", JSON.stringify(backgrounds));

            updateBackgrounds()

            ncmAlert({
                state: "success",
                text: "背景保存成功"
            })
        }
    });


    let backgroundsDom = dom("div", {});

    document.head.appendChild(dom("style", {
        innerHTML: `
    
    .BGE_ctrlDom{
        position:absolute;
        left:0;
        top:0;
        right:0;
        bottom:0;
        opacity:0;
        z-index:1;
        transition:opacity 0.2s;
        background:linear-gradient(transparent,black);
        display:flex;
        align-items: center;
        justify-content: flex-end;
        padding:10px;
        flex-direction: column;
    }

    .BGE_ctrlDom > *{
        margin-top:4px;
    }

    .BGE_ctrlDom:hover{
        opacity:1;
    }

    #BGEnhanced_Background img.micaLayer{
        transition: opacity 0.1s;
        position:relative;
    }/*

    #BGEnhanced_Background .micaMask{
        position:absolute;
        background:#00000011;
        z-index:10;
        left:0;top:0;right:0;bottom:0;
    }*/
    `}));

    function updateBackgrounds() {
        while (backgroundsDom.firstChild) backgroundsDom.firstChild.remove()

        for (let backgroundIndex = 0; backgroundIndex < backgrounds.length; backgroundIndex++) {
            let background = backgrounds[backgroundIndex];

            let previewDom;

            if (background.type === "image") previewDom = dom("span", {
                style: {
                    background: `url(${background.url})`,
                    backgroundSize: "cover",
                    display: "inline-block",
                    width: "100px",
                    height: "100px"
                }
            })

            if (background.type === "video") previewDom = dom("video", {
                muted: true, style: {
                    backgroundSize: "cover",
                    display: "inline-block",
                    width: "100px",
                    height: "100px",
                    preload: "metadata"
                }
            }, dom("source", { src: background.url }));

            backgroundsDom.appendChild(dom("div",
                { style: { background: "#00000022", borderRadius: "10px", overflow: "hidden", margin: "6px", height: "100px", width: "100px", display: "inline-block", position: "relative" } },
                dom("div", {
                    class: ["BGE_ctrlDom"]
                }, tools.makeBtn("删除", () => {
                    backgrounds.splice(backgroundIndex, 1);
                    plugin.setConfig("backgrounds", JSON.stringify(backgrounds));
                    console.log(backgrounds)
                    updateBackgrounds()
                }, true),
                    tools.makeBtn("应用", () => {
                        disableMica();

                        for (let bg of backgrounds) bg.current = false;
                        backgrounds[backgroundIndex].current = true;
                        updateCurrentBackground()
                        plugin.setConfig("backgrounds", JSON.stringify(backgrounds));
                    }, true)), previewDom))
        }

        backgroundsDom.appendChild(dom("div",
            { style: { background: "linear-gradient(37deg,#2b2b2b,#97b9d6)", borderRadius: "10px", overflow: "hidden", margin: "6px", height: "100px", width: "100px", display: "inline-block", position: "relative" } },
            dom("div", {
                class: ["BGE_ctrlDom"]
            }, dom("div", { innerText: "透明材质\n[实验性]" }),
                tools.makeBtn("应用", () => {
                    enableMica();
                }, true))))
    }

    updateBackgrounds()

    let randBackgroundBtn = tools.makeBtn(`开启时自动随机背景 [${plugin.getConfig("randomBG", " ")}]`, () => {
        let enabledRandBG = plugin.getConfig("randomBG", " ") === "x"
        if (enabledRandBG) plugin.setConfig("randomBG", " ");
        else plugin.setConfig("randomBG", "x");

        randBackgroundBtn.innerText = `开启时自动随机背景 [${plugin.getConfig("randomBG", " ")}]`;
    })

    return dom("div", {},
        dom("div", {},
            tools.makeBtn("添加背景", () => {
                addBgBtn.click()
            }), randBackgroundBtn
        ),
        backgroundsDom,
        dom("div", {},
            dom("div", {},
                dom("span", { innerText: "不透明度 " }),
                dom("input", {
                    value: opacityVal * 100, type: "range", oninput(e) {
                        opacityVal = e.target.value / 100;
                        localStorage["cc.microblock.bgenhanced.opacity"] = opacityVal;
                        document.getElementById("BGEnhanced_Background").style.opacity = opacityVal;
                    }
                })
            ),
            dom("div", {},
                dom("span", { innerText: "模糊度 " }),
                dom("input", {
                    value: blurVal, type: "range", oninput(e) {
                        blurVal = e.target.value;
                        localStorage["cc.microblock.bgenhanced.blur"] = blurVal;
                        document.getElementById("BGEnhanced_Background").style.filter = `blur(${blurVal}px)`;
                    }
                })
            ),
            dom("div", {},
                dom("span", { innerText: "底色 " }),
                dom("input", {
                    value: baseColorVal, type: "color", oninput(e) {
                        baseColorVal = e.target.value;
                        localStorage["cc.microblock.bgenhanced.baseColor"] = baseColorVal;
                        document.body.style.background = baseColorVal;
                    }
                })
            )
        ))
})