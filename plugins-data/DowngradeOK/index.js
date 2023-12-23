plugin.onLoad(async ({pluginPath})=>{
    const is300 = APP_CONF.appver.startsWith('3.');
    if (is300) {
        const iframe = document.createElement('iframe');
        const dataPath = await betterncm.app.getDataPath()
        
        iframe.src = BETTERNCM_FILES_PATH + (pluginPath.replace(dataPath,'').replace('./','')) + '/index.html'; // 'http://192.168.31.246:5500';
        window.dgOk_pluginPath = pluginPath;
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.zIndex = '999999';
        document.body.appendChild(iframe)
    }
})