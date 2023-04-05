plugin.onLoad(() => {
    betterncm.utils.waitForElement('.prg .has').then(eleHas => {
        const animMaxLen = 10000;
        const animOper = eleHas.animate([{ transform: "translateX(-100%)" }, { transform: "translateX(0%)" }], { duration: animMaxLen });
        animOper.pause();
        let totalLength = 0;
        legacyNativeCmder.appendRegisterCall('Load', 'audioplayer', (_, info) => {
            totalLength = info.duration;
            if (animOper.playbackRate !== animMaxLen / totalLength / 1000)
                animOper.playbackRate = animMaxLen / totalLength / 1000;
        });

        const fluentProgressBarController = document.createElement('style');
        fluentProgressBarController.innerHTML = `.prg{ ${(!("MaterialYouTheme" in loadedPlugins)) && "overflow-x: hidden;"} } .prg .has{ width: 100% !important; }`;
        document.head.appendChild(fluentProgressBarController);

        legacyNativeCmder.appendRegisterCall('PlayProgress', 'audioplayer', (_, progress) => {
            if (progress === 0 || totalLength === 0)
                return;

            const animCT = progress / totalLength * animMaxLen;
            if (animOper?.playState === 'running')
                animOper.currentTime = animCT;
        });
        legacyNativeCmder.appendRegisterCall('PlayState', 'audioplayer', (_, __, state) => {
            if (state === 2)
                animOper.pause();
            else if (state === 1)
                animOper.play();
        });

        new MutationObserver(() => {
            if (document.querySelector('.prg.hvr')) {
                animOper.pause();
                animOper.currentTime = parseFloat(document.querySelector('.prg .has').style.width) / 100 * animMaxLen;
            }
            else
                animOper.play();
        }).observe(document.querySelector('.prg .has'), { attributes: true, attributeFilter: ['style'] });
    });
});