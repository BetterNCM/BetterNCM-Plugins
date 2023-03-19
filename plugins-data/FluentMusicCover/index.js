const waitForElementAsync = async (selector) => {
	if (document.querySelector(selector)) {
		return document.querySelector(selector);
	}
	return await betterncm.utils.waitForElement(selector);
}
plugin.onLoad(async function () {
    window.addEventListener("wheel", window.FluentMusicLazyLoad);
    await waitForElementAsync(".g-mn").addEventListener("scroll", window.FluentMusicLazyLoad, { passive: true });
    //setInterval(lazyLoad, 1000);
    addEventListener("hashchange", window.FluentMusicLazyLoad);
});