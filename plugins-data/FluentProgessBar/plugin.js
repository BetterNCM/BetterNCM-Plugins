plugin.onLoad(()=>{
    legacyNativeCmder.appendRegisterCall("PlayProgress",'audioplayer',(_,progress)=>{
        const [min,sec]=document.querySelector('time.all').innerText.split(':');
        const allTime=(+min)*60+(+sec);
        document.querySelector('.prg .has').style.width="100%";
        document.querySelector('.prg .has').style.transform=`translateX(-${(allTime-progress)/allTime*100}%)`
    });
});