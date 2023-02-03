"use strict";

async function styleLoader() {
    const style = document.createElement("style");
    style.innerHTML = plugin.getConfig("customizeCss", "");
    style.id = "customizeCss";
    document.head.appendChild(style);
}

function scriptLoader() {
    (new Function(plugin.getConfig("customizeJS", "")))();
}

function update(id, val) {
    const dom = document.getElementById(id);
    dom.innerHTML = val;
}

plugin.onConfig((tools) => {
    console.log(tools);
    return dom(
        "div",
        {},
        dom(
            "div",
            {},
            dom("p", {
                innerText: "CSS Code",
                style: { margin: "10px 8px" },
            }),
            dom("textarea", {
                innerText: plugin.getConfig("customizeCss", ""),
                resize: "vertical",
                rows: 10,
                oninput: (event) => {
                    plugin.setConfig("customizeCss", event.target.value)
                    update("customizeCss", event.target.value);
                },
                style: { width: "100%", borderRadius: "0.5em", padding: "8px" },
            })
        ),
        dom("br", {}),
        dom(
            "div",
            {},
            dom("p", {
                innerText: "JavaScript Code（首次启动时执行）",
                style: { margin: "10px 8px" },
            }),
            dom("textarea", {
                innerText: plugin.getConfig("customizeJS", ""),
                rows: 8,
                oninput: (event) => {
                    plugin.setConfig("customizeJS", event.target.value)
                },
                style: { width: "100%", borderRadius: "0.5em", padding: "8px" },
            })
        ),
        dom("br", {}),
        dom(
            "div",
            {},
            tools.makeBtn("说明", () => betterncm.ncm.openUrl("https://github.com/nexmoe/betterncm-plugin-customize#readme"), false),
            tools.makeBtn("反馈", () => betterncm.ncm.openUrl("https://github.com/nexmoe/betterncm-plugin-customize/issues"), false),
            tools.makeBtn("社区", () => betterncm.ncm.openUrl("https://github.com/nexmoe/betterncm-plugin-customize/discussions"), false),
        ),

    );
});

plugin.onLoad(async () => {
    styleLoader();
    scriptLoader();
});
