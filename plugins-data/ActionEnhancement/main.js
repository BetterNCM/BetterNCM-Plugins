plugin.onLoad(() => {
    const VERSION = "0.1.0"

    function copyTextToClipboard(text) {
        var textArea = document.createElement("textarea");
        textArea.value = text;
        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            var successful = document.execCommand('copy');
            var msg = successful ? 'successful' : 'unsuccessful';
            console.log('Fallback: Copying text command was ' + msg);
        }
        catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        document.body.removeChild(textArea);
    }

    setTimeout(() => {
        function getPlayingID() {
            return document.querySelector("*[data-res-action=opencomment]").dataset["resId"]
        }

        setInterval(() => {
            // document.querySelector(".btn-dld").oncontextmenu = async e => {
            //     await betterncm.app.exec(`cmd /c start http://music.163.com/song/media/outer/url?id=${getPlayingID()}.mp3`)
            //     e.preventDefault()
            // }
            document.querySelector(".btn-share").oncontextmenu = e => {
                copyTextToClipboard(getPlayingID())
                e.preventDefault()
            }
        }, 100)
    }, 100)

    setInterval(_=>{
        document.querySelector(".j-vol").addEventListener("mousewheel", e => {
            let currentVolume = parseInt(document.querySelector(".prg-spk.j-vol.f-dn .has").style.height) / 100;
            if (e.deltaY > 0) channel.call("audioplayer.setVolume", () => { }, ["", "", currentVolume - 0.1])
            else channel.call("audioplayer.setVolume", () => { }, ["", "", Math.min(currentVolume + 0.1, 1)])
        })
    },600)
});