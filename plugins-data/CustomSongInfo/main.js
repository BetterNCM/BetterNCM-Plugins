let currentLyrics, currentId;
let lastModified = -1;

window.onProcessLyrics = async (lyrics, id) => {
    currentId = id;
    if(currentId.split)currentId=currentId.split("_")[0]
    lyrics ??= { lrc: "", krc: "", code: 200 }

    console.log("[CustomSongInfo] Lyrics: ", id, lyrics);

    let localLyric = await betterncm.fs.readFileText(`./CustomSongInfo/${currentId}/lyrics.lrc`);
    if (localLyric && localLyric !== lyrics?.lrc?.lyrics) {
        // if (!lyrics.lrc) {
            lyrics.lrc = {version:12,lyric:localLyric};
            // lyrics.lrc.__proto__.version = 12;
            // lyrics.lrc.__proto__.lyric = localLyric;
        // }
    }


    if (!lyrics) return;

    lastModified = id;



    currentLyrics = lyrics;

    return lyrics;

}

betterncm.utils.waitForElement(".cdwrap").then(e => e.addEventListener("contextmenu", async () => {
    if (!currentId) return;
    await betterncm.fs.mkdir(`./CustomSongInfo/${currentId}/`);
    if (!await betterncm.fs.exists(`./CustomSongInfo/${currentId}/lyrics.lrc`) && currentLyrics.lrc) {
        let lrc = currentLyrics.lrc.lyric || currentLyrics.lrc;
        await betterncm.fs.writeFileText(`./CustomSongInfo/${currentId}/lyrics.lrc`, lrc)
    }
    betterncm.app.exec(`explorer "${await betterncm.app.getDataPath()}\\CustomSongInfo\\${currentId}"`, false, true)
}))

/**
 * ,
            "orpheus://orpheus/pub/app.html":{
                "type":"replace",
                "from":"(this.Npt.src=",
                "to":"(this.Npt.src="
            }
 */