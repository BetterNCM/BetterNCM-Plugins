plugin.onLoad(()=>{
    let totalLength = 0;
    legacyNativeCmder.appendRegisterCall('Load', 'audioplayer', (_, info)=>{
        totalLength = info.duration;
    });

    const fluentProgressBarController = document.createElement('style');
    fluentProgressBarController.innerHTML = '';
    document.head.appendChild(fluentProgressBarController);
    let draggedProgress = 1;
    const updateTransform = (percent, dragging = false) => {
        if (!dragging && draggedProgress !== 1 && Math.abs(percent - draggedProgress) > 0.2 &&
            !(percent < -99.8 && draggedProgress > -0.2)) {
            return;
        }
        if (!dragging) draggedProgress = 1;
        fluentProgressBarController.innerHTML = `.prg{ ${(!("MaterialYouTheme" in loadedPlugins))&&"overflow-x: hidden;"} } \n.prg:not(.hvr) .has { width: 100% !important; transform: translateX(${percent}%) !important; }`;
    };
    legacyNativeCmder.appendRegisterCall('PlayProgress', 'audioplayer', (_, progress)=>{
        updateTransform(-(totalLength-progress)/totalLength*100);
    });
    betterncm.utils.waitForElement('.prg .has').then(()=>{
        new MutationObserver(()=>{
            if (document.querySelector('.prg.hvr')) {
                draggedProgress = parseFloat(document.querySelector('.prg .has').style.width) - 100;
                updateTransform(parseFloat(document.querySelector('.prg .has').style.width) - 100, true);
            }
        }).observe(document.querySelector('.prg .has'), { attributes:true, attributeFilter:['style'] });
    });
});