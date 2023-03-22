plugin.onLoad(async function () {
	// create style
    const style = document.createElement('style')
    style.innerHTML = `
    .fmc-cover-container {
        height: 100%;
        display: flex;
        float: left;
        align-items: center;
    }

    .fmc-cover-wrapper {
        width: var(--cover-size, 34px);
        height: var(--cover-size, 34px);
        display: inline;
        border: none;
        border-radius: 4px;
        margin: 0 10px;
        float: left;
        background: #33333333;
        overflow: hidden;
    }
    .fmc-cover {
        width: 100%;
        height: 100%;
        transition: opacity 0.2s;
    }

    .fmc-toast{
        position: fixed;
        top: 10px;
        left: 10px;
        z-index: 99999;
        width: 350px;
        height: 60px;
        background: #333333;
        border-radius: 4px;
        box-shadow: 0 0 10px #00000033;
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.1s;
    }

    [data-impress-type='song'],
    .lst .itm {
        min-height: 36px;
        clear: both;
    }
    `
    document.head.appendChild(style);

	const waitForElementAsync = async (selector) => {
		if (document.querySelector(selector)) {
			return document.querySelector(selector);
		}
		return await betterncm.utils.waitForElement(selector);
	}

    window.addEventListener("wheel", window.FluentMusicLazyLoad);
    (await waitForElementAsync(".g-mn")).addEventListener("scroll", window.FluentMusicLazyLoad, { passive: true });
    //setInterval(lazyLoad, 1000);
    addEventListener("hashchange", window.FluentMusicLazyLoad);

    // check if hijack succeeded
    const hijackSucceeded = (await betterncm.app.getSucceededHijacks()).includes("FluentMusicCover::fluentMusicCover.hackNCMTemplateParse");
    if (!hijackSucceeded) {
        const toast = document.createElement('div');
        toast.classList.add('fmc-toast');
        toast.style.opacity = '0';
        toast.innerText = "FluentMusicCover Hijack 失败，插件将不会启用，请尝试重启网易云"
        document.body.appendChild(toast);
        setTimeout(() => toast.style.opacity = '1');
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 200);
        }, 10000);
    }
});
