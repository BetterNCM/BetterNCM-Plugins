plugin.onLoad(function () {
    this.mainPlugin.enableTemplateTag = false;
    this.mainPlugin.hackNCMTemplateParse = ({ template, name }) => {
        if (name === "m-xwgt-track-title")
            template = "<div class='fmc-cover-container'> <img class='betterncm-fluentmusiccover-lazyload fmc-cover' style='opacity:0;' data-src=${x.album.picUrl} data-id=${x.id} /> </div> <script> loadedPlugins.FluentMusicCover.lazyLoad(); </script>" + template

        if (localStorage["fluentmusiccover.enableTemplateTag"] === "true")
            template = `<fmc-meta-tag data-template-id=${name}></fmc-meta-tag>` + template
        return template;
    }

    // create style
    const style = document.createElement('style')
    style.innerHTML = `
    .fmc-cover-container {
        height: 100%;
        display: flex;
        float: left;
        align-items: center;
    }

    .fmc-cover {
        width: var(--cover-size, 34px);
        display: inline;
        border: none;
        border-radius: 4px;
        margin: 0 10px;
        float: left;
        height: var(--cover-size, 34px);
        transition: opacity 0.2s;
    }
    .fmc-cover::after {
        // 占位符
        content: "";
        display: inline-block;
        width: var(--cover-size, 34px);
        height: var(--cover-size, 34px);
        background: #33333333;
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
    document.head.appendChild(style)

    const cached = [];
    const init = async () => {
        await betterncm.fs.mkdir('/FluentMusicCover-Cache');
        cached.push(...(await betterncm.fs.readDir('/FluentMusicCover-Cache')).map(
            v => v.split(".")[0].split("\\").pop().split("/").pop()
        ));
        const cacheDir = await betterncm.fs.mountDir('/FluentMusicCover-Cache/') + '/';

        // lazy load for img.betterncm-fluentmusiccover-lazyload
        const lazyLoad = () => {
            const imgs = document.querySelectorAll('img.betterncm-fluentmusiccover-lazyload:not(.fmc-cover-loaded)')
            for (let img of imgs) {
                // if in viewport and visible
                const top = img.getBoundingClientRect().top;
                if (top !== 0 && img.getBoundingClientRect().top < window.innerHeight * 2) {
                    img.classList.add('fmc-cover-loaded')
                    img.onload = () => img.style.opacity = 1;
                    const idImg = img.dataset.id + "." + img.dataset.src.split('.').pop();
                    if (!cached.includes(img.dataset.id)) {
                        !(async () => {
                            await betterncm.fs.writeFile('/FluentMusicCover-Cache/' + idImg,
                                await fetch(img.dataset.src + "?param=64y64").then(v => v.blob()));

                            cached.push(img.dataset.id);
                            img.src = cacheDir + idImg;
                        })();
                    } else {
                        img.src = cacheDir + idImg;
                    }
                }
            }
        }
        this.mainPlugin.lazyLoad = betterncm.utils.debounce(lazyLoad, 100);
        this.mainPlugin.cached = cached;
        window.addEventListener("wheel", lazyLoad);
        setInterval(lazyLoad, 1000);
        addEventListener("hashchange", lazyLoad);

        // check if hijack succeeded
        const hijackSucceeded = (await betterncm.app.getSucceededHijacks()).includes("FluentMusicCover::fluentMusicCover.hackNCMTemplateParse");
        if (!hijackSucceeded) {
            const toast = document.createElement('div');
            toast.classList.add('fmc-toast');
            toast.style.opacity = '0';
            toast.innerText = "FluentMusicCover Hijack 失败，插件将不会启用"
            document.body.appendChild(toast);
            setTimeout(() => toast.style.opacity = '1');
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 200);
            }, 10000);
        }
    }

    init();
})