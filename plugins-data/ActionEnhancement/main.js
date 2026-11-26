HTMLElement.prototype.__reactInst = function() {
    return this[Object.keys(this).find(v=>v.startsWith('__reactInternalInstance'))]
}

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
        return document.querySelector("*[data-res-action=opencomment]")?.dataset["resId"] || document.querySelector("#root > *").__reactInst().pendingProps.children[1].props.app._models.find(v=>v.namespace === 'playing').state.resourceCommentThreadId.split('_').pop()
    }

    setInterval(() => {
        document.querySelector(".btn-share, span[aria-label=morefunctions]").oncontextmenu = e => {
            copyTextToClipboard(getPlayingID())
            e.preventDefault()
        }
    }, 100)
}, 100)


function simulateInput(element, val) {
    let input = element
    let lastValue = input.value
    input.value = val
    let event = new Event('input', {
      bubbles: true
    })
    let keyPress = new KeyboardEvent('keyup', {
        bubbles: true,
        key: 'enter'
    })
      // hack React15
    event.simulated = true
      // hack React16
    let tracker = input._valueTracker
    if (tracker) {
      tracker.setValue(lastValue)
    }
    input.dispatchEvent(event)
    input.dispatchEvent(keyPress)
  }

window.addEventListener('paste', function (event) {
    const data = (event.clipboardData || event.originalEvent.clipboardData)
    const regexGetNCMId = /music\.163\.com\/song\?id=(\d+)/
    const id = regexGetNCMId.exec(data.getData('text'))?.[1]

    if (id && id.length >= 5) {
        const jsInput = document.querySelector('.j-search-input, .searchbox .cmd-input')
        jsInput.style.color = '#fff0'
        const lastInputValue = jsInput.value
        setTimeout(() => {
            jsInput.value = id;
            simulateInput(jsInput, id)
            document.querySelector('.sch-btn, .cmd-button-content > span[aria-label="search"]').click()
        })
        setTimeout(() => {
            jsInput.value = lastInputValue
            jsInput.style.color = ''
            setTimeout(() => {
                for (const history of [...document.querySelectorAll("#panel_pc_search_start > div.side.history .hotlst > *")]) {
                    if (history.innerText.trim() === id) {
                        history.querySelector('.cl.j-item').click()
                        break;
                    }
                }
            }, 200)
        }, 10)
    }
});

setInterval(_ => {
    document.querySelector(".j-vol, .cmd-icon-volume").onmousewheel = (e => {
        const currentVolume = parseInt(document.querySelector(".prg-spk.j-vol.f-dn .has")?.style.height ?? /(\d+)%/.exec(document.querySelector("[class^=VolumnSlider_]").getAttribute('style'))[1]) / 100;
        if (e.deltaY > 0) channel.call("audioplayer.setVolume", () => { }, ["", "", currentVolume - 0.1])
        else channel.call("audioplayer.setVolume", () => { }, ["", "", Math.min(currentVolume + 0.1, 1)])
    })
}, 600)
