plugin.onLoad(() => {
    const fluentProgressBarController = document.createElement('style');
    fluentProgressBarController.innerHTML = `.m-player .prg{ ${(!("MaterialYouTheme" in loadedPlugins)) && "overflow-x: hidden;"} } .m-player .prg .has{ width: 100% !important; }`;
    document.head.appendChild(fluentProgressBarController);
    
    let playing = false;

    const animateProgressBar = eleHas => {
        const animMaxLen = 10000;
        const animOper = eleHas.animate([{ transform: "translateX(-100%)" }, { transform: "translateX(0%)" }], { duration: animMaxLen });
        animOper.pause();
        let totalLength = 0;
        legacyNativeCmder.appendRegisterCall('Load', 'audioplayer', (_, info) => {
            totalLength = info.duration;
            if (animOper.playbackRate !== animMaxLen / totalLength / 1000)
                animOper.playbackRate = animMaxLen / totalLength / 1000;
        });


        legacyNativeCmder.appendRegisterCall('PlayProgress', 'audioplayer', (_, progress) => {
            if (progress === 0 || totalLength === 0)
                return;

            const animCT = progress / totalLength * animMaxLen;
            if (animOper?.playState === 'running')
                animOper.currentTime = animCT;
        });
        legacyNativeCmder.appendRegisterCall('PlayState', 'audioplayer', (_, __, state) => {
            if (state === 2) {
                playing = false;
                animOper.pause();
            } else if (state === 1) {
                playing = true;
                animOper.play();
            }
        });

        new MutationObserver(() => {
            if (document.querySelector('.prg.hvr')) {
                animOper.pause();
                animOper.currentTime = parseFloat(document.querySelector('.prg .has').style.width) / 100 * animMaxLen;
            }
            else if (playing)
                animOper.play();
        }).observe(document.querySelector('.prg .has'), { attributes: true, attributeFilter: ['style'] });
    }

    betterncm.utils.waitForElement('#main-player .prg .has').then(animateProgressBar);
    betterncm.utils.waitForElement('.m-player-fm .prg .has').then(animateProgressBar);
});
