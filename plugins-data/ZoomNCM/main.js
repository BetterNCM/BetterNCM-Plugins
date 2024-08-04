function q(n) {
    return document.querySelector(n);
}
function qAll(n) {
    return document.querySelectorAll(n);
}

async function apply() {
    let aB = q("#applyButton");
    aB.disabled = true;
    aB.value = "请稍候……";
    let zoom = q("#zoomSetBox").value;
    if (zoom == "undefined" || zoom == "null" || zoom == "" || zoom <= 0) {
        aB.disabled = false;
        aB.value = "想糊弄我?（怒）";
        return;
    };
    let ncmPath = await betterncm.app.getNCMPath();
    let bncmPath = await betterncm_native.app.datapath();
    let batPath = bncmPath + "\\ZoomNCM_RestartNCM.bat";
    let start = `--force-device-scale-factor=${zoom/100}`
    betterncm_native.fs.writeFileText(batPath,
`@echo off
setlocal
if "%1" == "h" goto s
mshta vbscript:createobject("wscript.shell").run("""%~0"" h",0)(window.close)&&exit
:s

taskkill /im cloudmusic.exe /t /f

set "ncm=${ncmPath}\\cloudmusic.exe"
set "start=${start}"
chcp 65001
set "lnk=${bncmPath}\\网易云音乐.lnk"
chcp 936

echo Set Link = WScript.CreateObject("WScript.Shell").CreateShortcut("%lnk%") > temp.vbs
echo Link.TargetPath = "%ncm%" >> temp.vbs
echo Link.Arguments = "%start%" >> temp.vbs
echo Link.IconLocation = "%ncm%" >> temp.vbs
echo Link.Save >> temp.vbs

temp.vbs
del temp.vbs

endlocal
"${ncmPath}\\cloudmusic.exe" ${start}`
    );
    await betterncm.app.exec(batPath);
    //假设执行失败…
    setTimeout(() => {
        aB.disabled = false;
        aB.value = "阿巴巴，重试？";
    }, 2000)
}

plugin.onConfig(() => {
    let crCfgPage = document.createElement("div");
    crCfgPage.setAttribute("id", "ZoomNcmSettings");
    crCfgPage.innerHTML = `
    <style>
    #ZoomNcmSettings {
        --zncms-fg: var(--themeC1, var(--colorPrimary1));
        --zncms-bg: rgba(var(--md-accent-color-bg-rgb, var(--ncm-fg-rgb)), .3);
        --zncms-bg-wot: var(--md-accent-color-bg, var(--ncm-fg-rgb, var(--colorBackground)));
        color: var(--md-accent-color-secondary, var(--ncm-text, var(--colorBlack2)));
        line-height: 24px;
        font-size: 16px;
    }
    body.ncm-light-theme #ZoomNcmSettings {
        --zncms-bg: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), .3);
        --zncms-bg-wot: rgba(var(--md-accent-color-bg-rgb, var(--ncm-bg-rgb)), 1);
    }
    #ZoomNcmSettings div p {
        display: inline;
    }

    #ZoomNcmSettings ::selection {
        color: var(--zncms-bg-wot);
        background: var(--zncms-fg);
    }

    #ZoomNcmSettings .button {
        color: var(--md-accent-color-secondary, var(--ncm-text)) !important;
        font-size: 16px;
        width: 90px;
        height: 40px;
        line-height: 0;
        outline: 0;
        box-shadow: 0 0 3px var(--zncms-fg);
        border: 1px solid var(--zncms-fg);
        border-radius: 10px;
        background: var(--zncms-bg);
        backdrop-filter: blur(12px);
        transition: .1s;
    }
    #ZoomNcmSettings .button:hover {
        box-shadow: 0 0 6px var(--zncms-fg);
    }
    #ZoomNcmSettings .button:active {
        font-size: 14px;
        border-width: 4px;
        box-shadow: 0 0 8px var(--zncms-fg);
    }

    #ZoomNcmSettings .button:disabled {
        color: #888 !important;
        box-shadow: 0 0 3px #888;
        border: 1px solid #888;
        background: var(--zncms-bg);
    }
    #ZoomNcmSettings .button:disabled:hover {
        box-shadow: 0 0 6px #888;
    }
    #ZoomNcmSettings .button:disabled:active {
        font-size: 16px;
        border-width: 1px;
        box-shadow: 0 0 6px #888;
    }

    #ZoomNcmSettings .textBox {
        padding: 10px;
    }
    #ZoomNcmSettings .textBox:focus {
        font-size: 15px;
        border-width: 3px;
        box-shadow: 0 0 8px var(--zncms-fg);
    }

    #ZoomNcmSettings .link {
        text-decoration: underline;
        cursor: pointer;
        color: var(--zncms-fg) !important;
        background: rgba(0, 0, 0, 0);
        border: 0 solid;
    }
    </style>
    <div>
        <p>ZoomNCM</p>
        <br />
        <p>v0.2.0 by </p>
        <input class="link" type="button" onclick="betterncm.ncm.openUrl('https://github.com/Lukoning')" value=" Lukoning " />
    </div>
    <p>使用步骤：(无脑)</p>
    <p>1.点击上方的“打开插件文件夹”</p>
    <p>2.切回网易云，设置缩放</p>
    <div style="line-height:45px;">
        <p>将网易云缩放设为</p>
        <input class="button textBox" id="zoomSetBox" type="number" step="1" placeholder="" value=""/>
        <p>%</p>
    </div>
    <p>3.设置好缩放后戳这里(一定要戳这里哦)：</p>
    <input style="width:250px;" class="button" id="applyButton" type="button" value="创建快捷方式并重启网易云音乐"/>
    <p>4.在插件文件夹内找到“网易云音乐”快捷方式，然后将其复制到桌面，这样每次双击打开网易云音乐后都会应用缩放</p>
    <p>5.重新设置缩放时，重复上述步骤</p>
    <p>! 注意：此缩放设置会覆盖系统缩放设置</p>
    <br /><br />
    <p>好了来点正经些的</p>
    <p>本插件(现在)的实现原理是：添加--force-device-scale-factor启动选项强制网易云使用自定义缩放</p>
    <p>因此需要在每次启动时添加这个选项，方便起见用脚本生成了一个快捷方式在插件目录下</p>
    <p>理论上这种方式并不会像之前使用CSS zoom属性那样导致一大堆bug，因此现在可以放心使用了()</p>
    `;
    crCfgPage.querySelector("#applyButton").addEventListener("click", apply);
    return crCfgPage;
});