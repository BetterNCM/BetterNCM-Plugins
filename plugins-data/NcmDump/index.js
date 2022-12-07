"use strict";

function getNcmFilePath() {
    let NM_SETTING_CUSTOM = localStorage.getItem("NM_SETTING_CUSTOM");
    NM_SETTING_CUSTOM = JSON.parse(NM_SETTING_CUSTOM);
    return `${NM_SETTING_CUSTOM.storage.path}VipSongsDownload`;
}


// 获取文件名列表
async function getFileNameList(type, dir) {
    const path = await betterncm.app.getDataPath();

    let cmdCommand;
    if (type === "input") cmdCommand = `chcp 65001 && dir ${dir} /b | find ".ncm" > ${path}\\NcmDump\\${type}.txt`;
    if (type === "output") cmdCommand = `chcp 65001 && dir ${dir} /b | find /v ".ncm" > ${path}\\NcmDump\\${type}.txt`;

    await betterncm.fs.remove(`NcmDump\\${type}.txt`);
    await betterncm.app.exec(`cmd /c "${cmdCommand}"`, false, false);

    while (true) {
        if (await betterncm.fs.exists(`NcmDump\\${type}.txt`)) {
            const text = await betterncm.fs.readFileText(`NcmDump\\${type}.txt`);
            const list = text.split("\n", text.split("\n").length - 1);
            return list.map(fileName => fileName.slice(0, fileName.lastIndexOf(".")));
        }
    }
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
    if (plugin.getConfig("input", getNcmFilePath()) === "") {
        plugin.setConfig("input", getNcmFilePath());
        inputPathInput.value = plugin.getConfig("input", getNcmFilePath());
        inputShowFullPath.innerText = plugin.getConfig("input", getNcmFilePath());
    }
    if (plugin.getConfig("output", getNcmFilePath()) === "") {
        plugin.setConfig("output", getNcmFilePath());
        outputPathInput.value = plugin.getConfig("output", getNcmFilePath());
        outputShowFullPath.innerText = plugin.getConfig("output", getNcmFilePath());
    }
}


// 一键解锁
async function unlockNCM() {
    const inputFileNameList = await getFileNameList("input", plugin.getConfig("input", getNcmFilePath()));
    const outputFileNameList = await getFileNameList("output", plugin.getConfig("output", getNcmFilePath()));
    const fileNameList = inputFileNameList.filter(item => !inputFileNameList.filter(item => outputFileNameList.includes(item)).includes(item));
    let owo = "";
    for (const fileName of fileNameList) owo = owo.concat(`"${plugin.getConfig("input", getNcmFilePath())}\\${fileName}.ncm" `);
    let cmdCommand = `${plugin.getConfig("output", getNcmFilePath()).slice(0, 2)} && cd ${plugin.getConfig("output", getNcmFilePath())} && "${await betterncm.app.getDataPath()}\\NcmDump\\ncmdump.exe" ${owo}`;
    await betterncm.app.exec(`cmd /c "${cmdCommand}"`, false, true);
}


plugin.onConfig(tools => {
    return dom("div", {},
        dom("div", {},
            dom("div", {},
                dom("span", { innerText: "从指定目录下获取ncm文件：" }),
                tools.makeInput(plugin.getConfig("input", getNcmFilePath()), { id: "inputPathInput", oninput: onInputChange })
            ),
            dom("div", { style: { margin: "4px 0" } },
                dom("span", { innerText: "完整路径：" }),
                dom("strong", { id: "inputShowFullPath", innerText: plugin.getConfig("input", getNcmFilePath()), style: { fontWeight: "bold" } })
            )
        ),
        dom("br", {}),
        dom("div", {},
            dom("div", {},
                dom("span", { innerText: "解锁后文件输出到指定目录：" }),
                tools.makeInput(plugin.getConfig("output", getNcmFilePath()), { id: "outputPathInput", oninput: onInputChange })
            ),
            dom("div", { style: { margin: "4px 0" } },
                dom("span", { innerText: "完整路径：" }),
                dom("strong", { id: "outputShowFullPath", innerText: plugin.getConfig("output", getNcmFilePath()), style: { fontWeight: "bold" } })
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
            dom("p", { innerText: "不会自动创建文件夹，解锁前请检查目录是否存在" })
        )
    );
});


plugin.onLoad(async () => {
    if (!await betterncm.fs.exists("NcmDump")) await betterncm.fs.mkdir("NcmDump");
    if (!await betterncm.fs.exists("NcmDump\\ncmdump.zip")) {
        const url = "https://ghproxy.com/https://github.com/taurusxin/ncmdump/releases/download/1.0/ncmdump-win64-1.0.zip";
        const ncmdump = await (await fetch(url)).blob();
        await betterncm.fs.writeFile("NcmDump\\ncmdump.zip", ncmdump);
    }
    if (await betterncm.fs.unzip("NcmDump\\ncmdump.zip", "NcmDump")) betterncm.fs.remove("NcmDump\\ncmdump.zip");
});
