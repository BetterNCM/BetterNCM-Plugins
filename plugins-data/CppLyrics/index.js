let lastId = ''

betterncm.utils.waitForElement('#main-player').then(ele=>{
    const word = ele.querySelector('.word')
    const wordCloned = word.cloneNode(true)
    wordCloned.style="transform: rotate(120deg) translate(-16px); right: 350px;"
    wordCloned.title = "打开 CppLyrics"
    ele.appendChild(wordCloned)

    wordCloned.onclick = ()=>{
        wordCloned.remove()
        betterncm_native.native_plugin.call('cpplyrics.init',[])
    }
})

setInterval(() => {
    if(currentLyrics.hash === lastId) return;
    lastId = currentLyrics.hash;

    const lyricsData = currentLyrics.lyrics.filter(v => v.dynamicLyric).map(v =>
        v.dynamicLyric.map(o => `(${o.time}:${o.time + o.duration})${o.word.replaceAll('`', `'`)}`).join('`') + (v.translatedLyric ? `|${v.translatedLyric}` : '')).join('\n');

    if (lyricsData)
        betterncm_native.native_plugin.call('cpplyrics.set_lyrics', [lyricsData])
    else
        betterncm_native.native_plugin.call('cpplyrics.set_lyrics', ['(0:100000)暂无逐词歌词']);
}, 1000)

let lastTime = 0;
legacyNativeCmder.appendRegisterCall("PlayProgress", "audioplayer", (_, time) => {
    lastTime = time * 1000;
    betterncm_native.native_plugin.call('cpplyrics.set_time', [lastTime, 0]);
});

legacyNativeCmder.appendRegisterCall("PlayState", "audioplayer", (_, __, state) => {
    betterncm_native.native_plugin.call('cpplyrics.set_time', [lastTime, state === 2]);
});