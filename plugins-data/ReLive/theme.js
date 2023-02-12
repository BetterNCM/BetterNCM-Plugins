const FORCE_SETTINGS = {
    "refined-now-playing-refined-control-bar": "false",
};

for (const setting in FORCE_SETTINGS) {
    window.localStorage.setItem(setting, FORCE_SETTINGS[setting]);
}

plugin.onAllPluginsLoaded(async function (plugins) {
    if (plugins.StyleSnippet?.addExternalSnippet == undefined) {
        async function addTips() {
            (await betterncm.utils.waitForElement("header")).prepend(
                dom("div", {
                    innerText:
                        "请安装/更新 StyleSnippet 插件，否则 ReLive 主题将不会生效。",
                    style: {
                        width: "100%",
                        height: "30px",
                        lineHeight: "30px",
                        background: "#ec414188",
                        color: "white",
                        textAlign: "center",
                        zIndex: 999,
                        position: "absolute",
                        pointerEvents: "none",
                    },
                })
            );
        }

        setTimeout(addTips, 1000);
    }

    plugins.StyleSnippet.addExternalSnippet(
        await betterncm.fs.readFileText(this.pluginPath + "./theme.less"),
        "ReLiveTheme",
        "relive-theme"
    );

    let isDark = JSON.parse(window.localStorage.getItem("relive-theme-dark") || "false");

    function loadDark() {
        if (isDark) {
            document.body.classList.add("s-theme-white");
            document.querySelector("#skin_default").href = undefined;
            document.querySelector("#pri-skin-gride").href =
                "orpheus://skin/default/default/web/css/skin.ls.css";
        } else {
            document.body.classList.remove("s-theme-white");
            document.querySelector("#skin_default").href =
                "../../style/res/less/default/css/skin.ls.css";
            document.querySelector("#pri-skin-gride").href =
                "orpheus://skin/pub/web/css/skin.ls.css";
        }
    }

    loadDark();

    betterncm.utils.waitForElement(".m-tool > .skin").then((item) => {
        item.addEventListener("click", (e) => {
            isDark = !isDark;
            window.localStorage.setItem("relive-theme-dark", JSON.stringify(isDark));
            loadDark();
        });
    });
});
