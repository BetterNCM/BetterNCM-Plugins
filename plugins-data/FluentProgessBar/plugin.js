plugin.onLoad(()=>{
    const fluentProgressBarController = document.createElement('style');
    fluentProgressBarController.innerHTML = '';
    document.head.appendChild(fluentProgressBarController);
    let draggedProgress = 1;
    const updateTransform = (percent, dragging = false) => {
        if (!dragging && draggedProgress != 1 && Math.abs(percent - draggedProgress) > 0.2) {
            return;
        }
        if (!dragging) draggedProgress = 1;
        fluentProgressBarController.innerHTML = `.prg:not(.hvr) .has { width: 100% !important; transform: translateX(${percent}%) !important; }`;
    };
    legacyNativeCmder.appendRegisterCall('PlayProgress','audioplayer',(_,progress)=>{
        const [min,sec]=document.querySelector('time.all').innerText.split(':');
        const allTime=(+min)*60+(+sec);
        updateTransform(-(allTime-progress)/allTime*100);
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