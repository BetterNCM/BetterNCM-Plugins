
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
        console.log(`Fallback: Copying text command was ${msg}`);
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
        document.querySelector(".btn-dld").oncontextmenu = async e => {
            await betterncm.app.exec(`cmd /c start http://music.163.com/song/media/outer/url?id=${getPlayingID()}.mp3`)
            e.preventDefault()
        }
        document.querySelector(".btn-share").oncontextmenu = e => {
            copyTextToClipboard(getPlayingID())
            e.preventDefault()
        }
    }, 100)
}, 100)

window.addEventListener('paste', function (event) {
    const data = (event.clipboardData || event.originalEvent.clipboardData)
    const regexGetNCMId = /music\.163\.com\/song\?id=(\d+)/
    const id = regexGetNCMId.exec(data.getData('text'))?.[1]

    if (id && id.length >= 5) {
        const jsInput = document.querySelector('.j-search-input')
        jsInput.style.color = '#fff0'
        const lastInputValue = jsInput.value
        setTimeout(() => {
            jsInput.value = id;
            document.querySelector('.sch-btn').click()
        })
        setTimeout(() => {
            jsInput.value = lastInputValue
            jsInput.style.color = ''
            for (const history of [...document.querySelectorAll("#panel_pc_search_start > div.side.history .hotlst > *")]) {
                if (history.innerText.trim() === id) {
                    history.querySelector('.cl.j-item').click()
                    break;
                }
            }
        }, 10)
    }
});

setInterval(_ => {
    document.querySelector(".j-vol").onmousewheel = (e => {
        const currentVolume = parseInt(document.querySelector(".prg-spk.j-vol.f-dn .has").style.height) / 100;
        if (e.deltaY > 0) channel.call("audioplayer.setVolume", () => { }, ["", "", currentVolume - 0.1])
        else channel.call("audioplayer.setVolume", () => { }, ["", "", Math.min(currentVolume + 0.1, 1)])
    })
}, 600)
