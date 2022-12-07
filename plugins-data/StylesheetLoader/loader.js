let loader_stylesheets = []

async function switchToDefault() {
    (await betterncm.utils.waitForElement(".skin", 0)).style.display = "none"
    if (!document.querySelector('[data-name="default"]')) document.querySelector(".skin").click();
    (await betterncm.utils.waitForElement('[data-name="default"] label', 0)).click();
    document.querySelector(".skin").click()
}

async function switchToWhite() {
    (await betterncm.utils.waitForElement(".skin", 0)).style.display = "none"
    if (!document.querySelector('[data-name="default"]')) document.querySelector(".skin").click();

    (await betterncm.utils.waitForElement('[title="纯色"]', 0)).click();
    (await betterncm.utils.waitForElement('[data-iswhite="true"]', 0)).click();
}

async function loadStylesheetObj({ path, id, config, plugin }) {
    function reloadStylesheet(content) {
        let root = document.querySelector(':root');
        let style = document.createElement("style")
        style.id = "BetterNCM_StyleSheet_" + id
        let processed = content;


        for (let key in config) {
            let c = config[key];

            c.reflect ||= "cssVar";

            if (c.reflect === "cssVar")
                root.style.setProperty(c.key, plugin.getConfig(key, c.default))

            if (c.reflect === "bodyFlag")
                if (plugin.getConfig(key, c.default))
                    document.body.classList.add(c.class)
                else
                    document.body.classList.remove(c.class)
        }

        document.getElementById(style.id)?.remove()
        style.innerHTML = processed
        document.head.appendChild(style);
    }

    let content = await betterncm.fs.readFileText(path)
    if (path.includes("plugins_dev")) {
        setInterval(async () => {
            if (content !== await betterncm.fs.readFileText(path)) {
                content = await betterncm.fs.readFileText(path)
                reloadStylesheet(content)
            }
        }, 1000)
    }
    reloadStylesheet(content)
}
async function loadAllStylesheets() {
    for (let stylesheet of loader_stylesheets) {
        await loadStylesheetObj(stylesheet);
    }
}

plugin.onLoad(() => {
    betterncm.utils.waitForElement("head").then(head => head.appendChild(dom("style", {
        innerHTML: `
.skin{display:none;}
`})));


    setInterval(() => {
        if (plugin.getConfig("fontColor", "white") === "white") {
            if (ctl.skin[betterncm.ncm.findNativeFunction(ctl.skin, [".selected"])]().selected.name !== "default")
                switchToDefault();
        } else {
            if (ctl.skin[betterncm.ncm.findNativeFunction(ctl.skin, [".selected"])]().selected.name !== "hsl(0, 82%, 59%)")
                switchToWhite();
        }
    }, 100)

    this.loadStylesheet = async function (plugin, path, id, config = {}) {
        loader_stylesheets.push({ path, id, config, plugin });
        loadStylesheetObj({ path, id, config, plugin })

        plugin.onConfig(function (tools) {
            return dom("div", {},
                ...Object.keys(config)
                    .map(configKey => {
                        let settings = []

                        let currentConfigValue = plugin.getConfig(configKey, config[configKey].default)

                        let configInput = tools.makeInput(
                            currentConfigValue,
                            {
                                onkeyup(e) {
                                    plugin.setConfig(configKey, e.target.value);
                                    loadAllStylesheets();
                                }
                            });
                        settings.push(
                            dom("span", {},
                                configInput
                            )
                        )

                        if (config[configKey].type.includes("cssBackground")) {
                            settings.push(
                                dom("input", {
                                    type: "file", async onchange(e) {
                                        let url = e.target.value;
                                        let ext = url.substring(url.lastIndexOf('.') + 1).toLowerCase();
                                        if (!ext) return;

                                        let imgid = Math.floor(Math.random() * 10000000)
                                        let path = "/temp/" + imgid + "." + ext;
                                        await betterncm.fs.mkdir("temp")
                                        await betterncm.fs.writeFile(path, e.target.files[0])

                                        let cssVal = `url(${BETTERNCM_FILES_PATH + path})`

                                        configInput.value = cssVal;
                                        plugin.setConfig(configKey, cssVal);
                                        loadAllStylesheets()
                                    }
                                })
                            )
                        }

                        if (config[configKey].type.includes("cssColor")) {
                            settings.push(
                                dom("input", {
                                    value: currentConfigValue,
                                    type: "color", async onchange(e) {
                                        let cssVal = e.target.value

                                        configInput.value = cssVal;
                                        plugin.setConfig(configKey, cssVal);
                                        loadAllStylesheets()
                                    }
                                })
                            )
                        }

                        if (config[configKey].type.includes("checkbox")) {
                            settings = [dom("input", {
                                checked: currentConfigValue,
                                style: { marginLeft: "8px" },
                                type: "checkbox", async onchange(e) {
                                    let cssVal = e.target.checked
                                    plugin.setConfig(configKey, cssVal);
                                    loadAllStylesheets()
                                }
                            })]
                        }

                        if (config[configKey].type.includes("cssDistance")) {
                            configInput.onkeyup = () => {
                                function parseDistWithUnit(dist) {
                                    let acceptedUnits = ["rem", "em", "px"];
                                    let inputUnit;
                                    for (let unit of acceptedUnits) if (dist.endsWith(unit)) inputUnit = unit;
                                    inputUnit ||= "px";

                                    let parsed = parseFloat(dist.slice(0, -inputUnit.length));
                                    if (Number.isNaN(parsed)) return "";
                                    return parsed.toString() + inputUnit;
                                }

                                configInput.value = parseDistWithUnit(configInput.value) || parseDistWithUnit(config[configKey].default);
                                plugin.setConfig(configKey, configInput.value);
                                loadAllStylesheets();
                            }
                            settings.push(dom("input", {
                                type: "range", onchange(e) {
                                    configInput.value = e.target.value + "px";
                                    plugin.setConfig(configKey, configInput.value);
                                    loadAllStylesheets();
                                }
                            }))
                        }

                        return dom("div", { style: { display: "flex", marginTop: "4px", alignItems: "center" } },
                            dom("span", { innerText: config[configKey].name }),
                            ...settings
                        )
                    }))
        })
    }
})

plugin.onConfig((tools) => {
    let textColorSwitch = tools.makeBtn(`切换字体颜色 [${plugin.getConfig("fontColor", "white") === "white" ? "白" : "黑"}]`, (e) => {
        plugin.setConfig("fontColor", plugin.getConfig("fontColor", "white") === "white" ? "black" : "white");

        textColorSwitch.innerText = `切换字体颜色 [${plugin.getConfig("fontColor", "white") === "white" ? "白" : "黑"}]`;
    }, true);

    return dom("div", {},
        dom("div", {},
            tools.makeBtn("重载所有样式", loadAllStylesheets, true),
            textColorSwitch
        ),

    )
})