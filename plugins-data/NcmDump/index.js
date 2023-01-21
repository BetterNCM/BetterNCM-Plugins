"use strict";

function getNcmFilePath() {
    let NM_SETTING_CUSTOM = localStorage.getItem("NM_SETTING_CUSTOM");
    let path = JSON.parse(NM_SETTING_CUSTOM).storage.path;
    if (path.charAt(path.length - 1) == "\\") return `${path}VipSongsDownload`;
    return `${path}\\VipSongsDownload`;
}


// 监听输入
function onInputChange(event) {
    const inputShowFullPath = document.querySelector("#inputShowFullPath");
    const outputShowFullPath = document.querySelector("#outputShowFullPath");
    if (event.target.id === "inputPathInput") {
        plugin.setConfig("input", event.target.value);
        inputShowFullPath.innerText = plugin.getConfig("input", getNcmFilePath());
    }
    if (event.target.id === "outputPathInput") {
        plugin.setConfig("output", event.target.value);
        outputShowFullPath.innerText = plugin.getConfig("output", getNcmFilePath());
    }
}


// 恢复默认
function restoreDefault() {
    const inputPathInput = document.querySelector("#inputPathInput");
    const outputPathInput = document.querySelector("#outputPathInput");
    const inputShowFullPath = document.querySelector("#inputShowFullPath");
    const outputShowFullPath = document.querySelector("#outputShowFullPath");
    if (!plugin.getConfig("input")) {
        plugin.setConfig("input", getNcmFilePath());
        inputPathInput.value = plugin.getConfig("input");
        inputShowFullPath.innerText = plugin.getConfig("input");
    }
    if (!plugin.getConfig("output")) {
        plugin.setConfig("output", getNcmFilePath());
        outputPathInput.value = plugin.getConfig("output");
        outputShowFullPath.innerText = plugin.getConfig("output");
    }
}


// 一键解锁
async function unlockNCM() {
    let inputFileNameList = await betterncm.fs.readDir(plugin.getConfig("input"));
    let outputFileNameList = await betterncm.fs.readDir(plugin.getConfig("output"));

    inputFileNameList = inputFileNameList.filter(fileName => fileName.endsWith(".ncm"));
    outputFileNameList = outputFileNameList.filter(fileName => !fileName.endsWith(".ncm"));

    inputFileNameList = inputFileNameList.map(fileName => fileName.slice(0, fileName.lastIndexOf(".")));
    outputFileNameList = outputFileNameList.map(fileName => fileName.slice(0, fileName.lastIndexOf(".")));

    const fileNameList = inputFileNameList.filter(item => !inputFileNameList.filter(item => outputFileNameList.includes(item)).includes(item));
    let owo = "";
    for (const fileName of fileNameList) owo = owo.concat(`"${fileName}.ncm" `);
    let cmdCommand = `${plugin.getConfig("output").slice(0, 2)} && cd ${plugin.getConfig("output")} && "${await betterncm.app.getDataPath()}\\NcmDump\\ncmdump.exe" ${owo}`;
    await betterncm.app.exec(`cmd /c "${cmdCommand}"`, false, true);
}


plugin.onConfig(tools => {
    return dom("div", {},
        dom("div", {},
            dom("div", {},
                dom("span", { innerText: "从指定目录下获取ncm文件：" }),
                tools.makeInput(plugin.getConfig("input"), { id: "inputPathInput", oninput: onInputChange })
            ),
            dom("div", { style: { margin: "4px 0" } },
                dom("span", { innerText: "完整路径：" }),
                dom("strong", { id: "inputShowFullPath", innerText: plugin.getConfig("input"), style: { fontWeight: "bold" } })
            )
        ),
        dom("br", {}),
        dom("div", {},
            dom("div", {},
                dom("span", { innerText: "解锁后文件输出到指定目录：" }),
                tools.makeInput(plugin.getConfig("output"), { id: "outputPathInput", oninput: onInputChange })
            ),
            dom("div", { style: { margin: "4px 0" } },
                dom("span", { innerText: "完整路径：" }),
                dom("strong", { id: "outputShowFullPath", innerText: plugin.getConfig("output"), style: { fontWeight: "bold" } })
            )
        ),
        dom("br", {}),
        dom("div", {},
            tools.makeBtn("恢复默认", restoreDefault, false),
            tools.makeBtn("点击解锁", unlockNCM, false)
        ),
        dom("br", {}),
        dom("div", {},
            dom("p", { innerText: "恢复默认：清空输入框后点击恢复默认（可单独清空）" }),
            dom("p", { innerText: "不会自动创建文件夹，解锁前请检查目录是否存在" }),
            dom("p", { innerText: "不支持带有表情符号的文件名，请先预先修改文件名" })
        )
    );
});


plugin.onLoad(async () => {
    plugin.setConfig("input", plugin.getConfig("input", getNcmFilePath()));
    plugin.setConfig("output", plugin.getConfig("output", getNcmFilePath()));
    if (!await betterncm.fs.exists("NcmDump")) await betterncm.fs.mkdir("NcmDump");
    if (!await betterncm.fs.exists("NcmDump\\ncmdump.exe")) {
        const url = "https://ghproxy.com/https://github.com/taurusxin/ncmdump/releases/download/1.0/ncmdump-win64-1.0.zip";
        await betterncm.fs.writeFile("NcmDump\\ncmdump.zip", await (await fetch(url)).blob());
    }
    if (await betterncm.fs.unzip("NcmDump\\ncmdump.zip", "NcmDump")) betterncm.fs.remove("NcmDump\\ncmdump.zip");
});
