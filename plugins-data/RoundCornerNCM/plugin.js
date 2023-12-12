function isWindowMaximized() {
    const maximized =
        window.outerWidth === window.screen.availWidth &&
        window.outerHeight === window.screen.availHeight;
    const fullScreen =
        window.outerWidth === window.screen.width &&
        window.outerHeight === window.screen.height;

    return maximized || fullScreen;
}

function checkWindowMaximized() {
    const isMaximized = isWindowMaximized();

    betterncm.app.setRoundedCorner(!isMaximized);
}

window.addEventListener('resize', checkWindowMaximized);

checkWindowMaximized();
