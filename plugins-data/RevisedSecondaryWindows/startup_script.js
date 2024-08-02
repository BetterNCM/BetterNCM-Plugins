rswLoad();
async function rswLoad(i) {
    if (typeof i != "number") {
        var i = 0;
    }
    var i = i + 1;
    await betterncm.utils.waitForElement("#root, #login_root");
    if (document.querySelector("#portal_root")) {
        console.info("RswInfo: Main window");
        return;
    }
    if (document.querySelector("#root > .sc-AykKC")) {
        console.info("RswInfo: Audio effect");
        /* simple but rude */
        fetch(BETTERNCM_FILES_PATH + "/plugins_dev/RevisedSecondaryWindows/audioEffect.js").then(v => v.text()).then(eval)
        fetch(BETTERNCM_FILES_PATH + "/plugins_runtime/RevisedSecondaryWindows/audioEffect.js").then(v => v.text()).then(eval)
        return;
    }
    if (document.querySelector("#login_root")) {
        console.info("RswInfo: Login window");
        fetch(BETTERNCM_FILES_PATH + "/plugins_dev/RevisedSecondaryWindows/loginWindow.js").then(v => v.text()).then(eval);
        fetch(BETTERNCM_FILES_PATH + "/plugins_runtime/RevisedSecondaryWindows/loginWindow.js").then(v => v.text()).then(eval);
        return;
    }
    if (document.querySelector(".zbar")) {
        console.info("RswInfo: Third-party login window");
        fetch(BETTERNCM_FILES_PATH + "/plugins_dev/RevisedSecondaryWindows/loginWindow3.js").then(v => v.text()).then(eval);
        fetch(BETTERNCM_FILES_PATH + "/plugins_runtime/RevisedSecondaryWindows/loginWindow3.js").then(v => v.text()).then(eval);
        return;
    }
    console.error("RswError: Premature execution or this page is not an NCM page.");
    if (i >= 10) {
        console.warn("RswWarnning: Tried " + i + " times, stop loading. If you wanna try again, please run \"rswLoad()\" ");
        return;
    }
    console.warn("RswWarnning: Try again soon... Tried " + i + " times.");
    setTimeout(() => {
        rswLoad(i);
    }, 500);
}
async function closeWindow() {
    var close = await betterncm.utils.waitForElement("span.zcls.u-icn.u-icn-laycls.j-flag");
    close.click();
}