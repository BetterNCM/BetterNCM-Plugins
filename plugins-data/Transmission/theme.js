plugin.onAllPluginsLoaded(async function (plugins) {
    await plugins.StylesheetLoader.loadStylesheet(plugin, this.pluginPath + "/Transmission.css", "transmission", {
        background: {
            name: "背景图",
            type: "cssBackground",
            key: "--transmission-background",
            default: "url(https://s1.ax1x.com/2022/06/11/XcOy4J.jpg)"
        }, enableBlur: {
            name: "启用背景模糊",
            reflect: "bodyFlag",
            class: "bgblur-enabled",
            type: ["checkbox"],
            default: true
        },blurSpread: {
            name: "模糊程度",
            reflect: "cssVar",
            type: "cssDistance",
            key:"--transmission-bg-blur",
            default: "10px"
        }, modifyVinylRecords: {
            name: "修改播放页黑胶唱片",
            reflect: "bodyFlag",
            class: "modify-vinyl-records-enabled",
            type: ["checkbox"],
            default: true
        }
    });
})


betterncm.utils.waitForElement(".g-mn.one").then(()=>{
    let obs=new MutationObserver(async ()=>{
        let rg=document.querySelector(".g-wrap1");
        if(!rg)return;
        if(rg.classList.contains("switching"))return;
        rg.classList.add("switching")
        await betterncm.utils.delay(300)
        rg.classList.remove("switching")
        
        obs.observe(document.querySelector(".g-wrap0"),{childList:true})
    })
    obs.observe(document.querySelector(".g-mn.one"),{childList:true})
})

