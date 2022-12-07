let serverPath;
let remoteUNM, localUNM;

const onlineServerURL = "https://ghproxy.com/?q=https%3A%2F%2Fgithub.com%2FMicroCBer%2Fresources%2Freleases%2Fdownload%2F0.0.0%2Funblockneteasemusic-win-x64.exe"

async function disableProxyAndRestart() {
    channel.call("app.setLocalConfig", () => {
        restartNCM()
    }, ["Proxy", "", JSON.stringify({ Type: "none", flagReinstallUCM: true })]);
}

async function enableProxyAndRestart() {
    await betterncm.app.writeConfig("init.disableCertVerifiction", "true")
    channel.call("app.setLocalConfig", () => {
        restartNCM()
    }, ["Proxy", "", JSON.stringify({
        Type: "http", http: {
            Host: "localhost",
            Port: Math.floor(Math.random()*10000+10000).toString()
        }
    })]);
}

function restartNCM() {
    channel.call("app.exit", () => { }, ["restart"]);
    betterncm.app.exec("cmd /c timeout 1 & cloudmusic.exe")


}

let proxyConfigs = {}, statusDom = dom("div", {})

async function installUCM() {
    await betterncm.fs.mkdir(serverPath)

    const response = await (await (fetch(remoteUNM.url))).blob()
    /**
      await (fetch(remoteUNM.url).then((response) => {
    const reader = response.body.getReader();
    let total = 0
    return new ReadableStream({
        start(controller) {
            return pump();
            function pump() {
                return reader.read().then(({ done, value }) => {
                    // When no more data needs to be consumed, close the stream
                    if (done) {
                        controller.close();
                        proxyConfigs.UCMStatus.installProgress = "";
                        updateStatus();
                        return;
                    }

                    total += value.length;
                    proxyConfigs.UCMStatus.installProgress = `(${(total / 1024 / 1024).toFixed(2)}M)`;
                    updateStatus()
                    // Enqueue the next data chunk into our target stream
                    controller.enqueue(value);
                    return pump();
                });
            }
        }
    })
}).then((stream) => new Response(stream))
    .then((response) => response.blob()))
     */

    await betterncm.fs.writeFile(serverPath + "UCM_server.exe", response);
    await betterncm.app.exec(await betterncm.app.getDataPath() + serverPath + "UCM_server.exe")
    enableProxyAndRestart()
}

async function reinstallUCM() {
    if (await betterncm.fs.exists(serverPath + "UCM_server.exe"))
        await betterncm.fs.remove(serverPath + "UCM_server.exe")

    await installUCM()
}



async function updateStatus() {
    statusDom.innerHTML = "";

    proxyConfigs.UCMStatus ||= {
        installed: await betterncm.fs.exists(serverPath + "UCM_server.exe"),
        installing: false,
        installProgress: "",
        enabled: (proxyConfigs.Type === "http" && proxyConfigs.http?.Port)
    };


    statusDom.appendChild(dom("div", {
        style: {
            padding: "20px 0px"
        }
    }, dom("span", {
        innerText: "远程版本：" + remoteUNM.version + " ",
        style: {
            padding: "5px 10px",
            "border-radius": "20px",
            cursor: "pointer"
        },
        onclick() {
            betterncm.app.exec("cmd /c start https://github.com/UnblockNeteaseMusic/server/actions")
        }
    }), !proxyConfigs.UCMStatus.installing && !proxyConfigs.UCMStatus.installed && dom("span", {
        innerText: "安装",
        style: {
            padding: "5px 10px",
            border: "1px solid #ffffff33",
            "border-radius": "20px",
            cursor: "pointer"
        },
        onclick() {
            proxyConfigs.UCMStatus.installing = true;
            installUCM()
            updateStatus()
        }
    }), proxyConfigs.UCMStatus.installing && !proxyConfigs.UCMStatus.installed && dom("span", {
        innerText: "安装中…… " + proxyConfigs.UCMStatus.installProgress,
        style: {
            padding: "5px 10px",
            border: "1px solid #ffffff33",
            "border-radius": "20px",

        },
        onclick() {
            proxyConfigs.UCMStatus.installing = true;
            installUCM()
            updateStatus()
        }
    }), !proxyConfigs.UCMStatus.installing && proxyConfigs.UCMStatus.installed && dom("span", {
        innerText: "卸载",
        style: {
            padding: "5px 10px",
            border: "1px solid #ffffff33",
            "border-radius": "20px",
            cursor: "pointer"
        },
        async onclick() {
            await betterncm.app.exec("cmd /c taskkill /f /im UCM_server.exe");
            setTimeout(async () => {
                await betterncm.fs.remove(serverPath + "UCM_server.exe")
                disableProxyAndRestart()
            }, 700)

        }
    }),
        !proxyConfigs.UCMStatus.installing && proxyConfigs.UCMStatus.installed && proxyConfigs.UCMStatus.enabled && dom("span", {
            innerText: "禁用",
            style: {
                padding: "5px 10px",
                border: "1px solid #ffffff33",
                "border-radius": "20px",
                cursor: "pointer"
            },
            async onclick() {
                await betterncm.app.exec("cmd /c taskkill /f /im UCM_server.exe");
                disableProxyAndRestart()
            }
        }),
        !proxyConfigs.UCMStatus.installing && proxyConfigs.UCMStatus.installed && !proxyConfigs.UCMStatus.enabled && dom("span", {
            innerText: "启用",
            style: {
                padding: "5px 10px",
                border: "1px solid #ffffff33",
                "border-radius": "20px",
                cursor: "pointer"
            },
            async onclick() {
                await betterncm.app.exec("cmd /c taskkill /f /im UCM_server.exe");
                enableProxyAndRestart()
            }
        })
    ))
}

plugin.onLoad(async () => {

    serverPath = "/UnblockCloudMusic/";
    channel.call("app.getLocalConfig", async (e) => {
        let config = JSON.parse(e || "{}");
        proxyConfigs = config;



        while (1) {
            try {
                if (!navigator.onLine) continue;
                await fetch("https://music.163.com")
                localStorage["cc.microblock.UNMInstaller.attemptReconnect"] = false;
            } catch (e) {
                if (await betterncm.fs.exists(serverPath + "UCM_server.exe")) {
                    if (localStorage["cc.microblock.UNMInstaller.attemptReconnect"] !== "true") {
                        await betterncm.app.exec("cmd /c "+await betterncm.app.getDataPath() + serverPath + "UCM_server.exe"+" -p "+`${proxyConfigs.http?.Port}:${parseInt(proxyConfigs.http?.Port)+1}`,false,false);
                        await betterncm.utils.delay(300)
                        document.location.reload()
                        localStorage["cc.microblock.UNMInstaller.attemptReconnect"] = true;
                        return;
                    } else {
                        alert("UnblockCloudMusic运行失败！将临时禁用UnblockCloudMusic")
                        localStorage["cc.microblock.UNMInstaller.attemptReconnect"] = false;
                        disableProxyAndRestart()
                    }
                }
                else if (config.flagReinstallUCM) {
                    reinstallUCM();
                }
            }

            await betterncm.utils.delay(3000)
        }


    }, ["Proxy", ""])
    remoteUNM = await (await fetch("https://gitee.com/microblock/better-ncm-v2-data/raw/master/plugin_data/unblockneteasemusic.json")).json();
    updateStatus();
})

plugin.onConfig((tools) => {
    return dom("div", {}, dom("div", { innerText: "网易云音乐解灰" }), statusDom, tools.makeBtn("打开源项目主页", () => {
        betterncm.app.exec("cmd /c start https://github.com/UnblockNeteaseMusic/server")
    }))
})