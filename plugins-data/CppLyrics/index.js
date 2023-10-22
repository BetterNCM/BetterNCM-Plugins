import "./lyric_provider"
import { applyTheme, blueFromArgb, greenFromArgb, redFromArgb, themeFromImage } from "@material/material-color-utilities"


plugin.onLoad(pl => {
    let lastId = ''

    betterncm.utils.waitForElement('#main-player').then(ele => {
        const word = ele.querySelector('.word')
        const wordCloned = word.cloneNode(true)
        wordCloned.style = "transform: rotate(120deg) translate(-16px); right: 350px;"
        wordCloned.title = "打开 CppLyrics"
        ele.appendChild(wordCloned)

        wordCloned.onclick = () => {
            wordCloned.remove()
            betterncm_native.native_plugin.call('cpplyrics.init', [])
        }
    })

    setInterval(() => {
        if (currentLyrics.hash === lastId) return;
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

    const updateCDImage = async () => {
        const song = betterncm.ncm.getPlayingSong()
        const coverdom = document.createElement('img');
        coverdom.src = song.data.album.picUrl
        const theme = await themeFromImage(coverdom);
        console.log(theme)
        applyTheme(theme)
        // get primary and secondary 100 rgb
        const getRGB = (argb) => ([
            redFromArgb(argb),
            greenFromArgb(argb),
            blueFromArgb(argb)
        ]);

        const coverPath = `${await betterncm.app.getDataPath()}/cover.jpg`
        await betterncm.fs.remove(coverPath);
        await betterncm.fs.writeFile(coverPath,await fetch(coverdom.src.replace("&thumbnail=48y48", '')).then(v => v.blob()))

        betterncm_native.native_plugin.call('cpplyrics.set_song_cover', [coverPath]);

        betterncm_native.native_plugin.call('cpplyrics.set_song_color', [
            ...getRGB(theme.schemes.dark.onPrimary),
            ...getRGB(theme.schemes.dark.secondary)
        ]);

        

        betterncm_native.native_plugin.call('cpplyrics.set_song_info', [
            song.data.name,
            song.data.artists.map(v => v.name).join(' / ')
        ]);
    }

    let lastCoverDom = null;
    setInterval(()=>{
        const cd = document.querySelector('img.j-cover')
        if(cd && cd !== lastCoverDom) {
            if (cd?.complete) updateCDImage()
            else cd?.addEventListener('load', updateCDImage);
            lastCoverDom = cd
        }
    }, 100)
})