let isWindowMaximized = undefined;

function whenMaximizedChange(isMaximized) {
    betterncm.app.setRoundedCorner(!isMaximized);
    isWindowMaximized = isMaximized;
}

function checkMaximizedChange() {
    const maximized =
        window.outerWidth === window.screen.availWidth &&
        window.outerHeight === window.screen.availHeight;
    const fullScreen =
        window.outerWidth === window.screen.width &&
        window.outerHeight === window.screen.height;
    const isMaximized = maximized || fullScreen;
    if (isMaximized !== isWindowMaximized) {
        whenMaximizedChange(isMaximized);
    }
}

window.addEventListener('resize', checkMaximizedChange);

checkMaximizedChange();
