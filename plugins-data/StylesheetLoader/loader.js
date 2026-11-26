let loader_stylesheets = []

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
        betterncm_native.fs.watchDirectory(path.slice(0,path.indexOf('/plugins_dev')-1)+'/plugins_dev/',async ()=>{
            content = await betterncm.fs.readFileText(path)
            reloadStylesheet(content)
        });
    }
    reloadStylesheet(content)
}
async function loadAllStylesheets() {
    for (let stylesheet of loader_stylesheets) {
        await loadStylesheetObj(stylesheet);
    }
}

plugin.onLoad(() => {
    this.loadStylesheet = async function (plugin, path, id, config = {}) {
        loader_stylesheets.push({ path, id, config, plugin });
        loadStylesheetObj({ path, id, config, plugin })

        plugin.onConfig(function (tools) {
            return dom("div", {},
                ...Object.keys(config)
                    .map(configKey => {
                        let settings = []
                        
                        if (config[configKey].type.includes("cssBackground")) return;
                        

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
    return dom("div", {},
        dom("div", {},
            tools.makeBtn("重载所有样式", loadAllStylesheets, true)
        ),

    )
})
