import "./lyric_provider"
import { Blend, Cam16, Hct, MaterialDynamicColors, QuantizerCelebi, QuantizerWsmeans, SchemeExpressive, SchemeVibrant, Score, blueFromArgb, greenFromArgb, redFromArgb } from "@material/material-color-utilities"

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

    let lastTime = 0, paused = true;
    legacyNativeCmder.appendRegisterCall("PlayProgress", "audioplayer", (_, time) => {
        lastTime = time * 1000;
        paused = false;
    });

    setInterval(()=>{
        betterncm_native.native_plugin.call('cpplyrics.set_time', [lastTime, paused]);
    }, 400)

    legacyNativeCmder.appendRegisterCall("PlayState", "audioplayer", (_, __, state) => {
        paused = state === 2;
        betterncm_native.native_plugin.call('cpplyrics.set_time', [lastTime, state === 2]);
    });

    const updateCDImage = () => {
        const song = betterncm.ncm.getPlayingSong()
        const coverdom = document.createElement('img');
        coverdom.src = `orpheus://cache/?${song.data.album.picUrl}?imageView&enlarge=1&thumbnail=48y48`
        coverdom.onload = async () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            canvas.width = coverdom.width;
            canvas.height = coverdom.height;
            ctx.drawImage(coverdom, 0, 0, coverdom.width, coverdom.height);
            const imageData = ctx.getImageData(0, 0, coverdom.width, coverdom.height);

            const chunk = (input, size) => {
                return input.reduce((arr, item, idx) => {
                    return idx % size === 0
                        ? [...arr, [item]]
                        : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]];
                }, []);
            };
            const pixels = chunk(ctx.getImageData(0, 0, coverdom.width, coverdom.height).data, 4).map((pixel) => {
                return ((pixel[3] << 24 >>> 0) | (pixel[0] << 16 >>> 0) | (pixel[1] << 8 >>> 0) | pixel[2]) >>> 0;
            });

            const quantized = QuantizerCelebi.quantize(pixels, 64);

            const colors = Score.score(quantized);
            // blend to dark enough
            const getColor = (color, scheme) => MaterialDynamicColors.onPrimary.getArgb(new scheme(Hct.fromInt(color), true, 0.0))

            // get primary and secondary 100 rgb
            const getRGB = (argb) => ([
                redFromArgb(argb),
                greenFromArgb(argb),
                blueFromArgb(argb)
            ]);

            

            const coverPath = `${await betterncm.app.getDataPath()}/cover.jpg`
            await betterncm.fs.remove(coverPath);
            await betterncm.fs.writeFile(coverPath, await fetch(coverdom.src.replace("&thumbnail=48y48", '')).then(v => v.blob()))

            betterncm_native.native_plugin.call('cpplyrics.set_song_cover', [coverPath]);

            const pickedColors = [getColor(colors[0], SchemeVibrant), getColor(colors[1], SchemeExpressive)]
            pickedColors[1] = Blend.cam16Ucs(pickedColors[0], pickedColors[1], 0.8);
            
            // use console.log css to show
            const showColor = (color) => console.log(`%c${color[0]}, ${color[1]}, ${color[2]}`, `background-color: rgb(${color[0]}, ${color[1]}, ${color[2]}`)
            console.log('Primary color:')
            showColor(getRGB(pickedColors[0]))
            console.log('Secondary color:')
            showColor(getRGB(pickedColors[1]))

            betterncm_native.native_plugin.call('cpplyrics.set_song_color', pickedColors.map(v=>getRGB(v)).flat());

            betterncm_native.native_plugin.call('cpplyrics.set_song_info', [
                song.data.name,
                song.data.artists.map(v => v.name).join(' / ')
            ]);
        }
    }

    let lastCoverDom = null;
    setInterval(() => {
        const cd = document.querySelector('img.j-cover')
        if (cd && cd !== lastCoverDom) {
            if (cd?.complete) updateCDImage()
            else cd?.addEventListener('load', updateCDImage);
            lastCoverDom = cd
        }
    }, 100)
})