(() => {
    window.FluentMusicCoverHackNCMTemplateParse = ({ template, name }) => {
        if (name === "m-xwgt-track-title")
            template = "<div class='fmc-cover-container'><div class='fmc-cover-wrapper'><img class='betterncm-fluentmusiccover-lazyload fmc-cover' style=${getCoverStyle(x.id, x.album.picUrl)} src=${getCoverImage(x.id, x.album.picUrl)} data-src=${x.album.picUrl} data-id=${x.id} onload='coverImageOnload(this)'/> </div> </div>" + template

        if (localStorage["fluentmusiccover.enableTemplateTag"] === "true")
            template = `<fmc-meta-tag data-template-id=${name}></fmc-meta-tag>` + template
        return template;
    }


    const cached = [];
    const init = async () => {
        await betterncm.fs.mkdir('/FluentMusicCover-Cache');
        cached.push(...(await betterncm.fs.readDir('/FluentMusicCover-Cache')).map(
            v => v.split(".")[0].split("\\").pop().split("/").pop()
        ));
        const cacheDir = await betterncm.fs.mountDir('/FluentMusicCover-Cache/') + '/';


        const loadCoverImage = (img) => {
            if (!img.src.startsWith('data:image/gif;base64')) {
                return;
            }
            // if in viewport and visible
            const top = img.getBoundingClientRect().top;
            if (top !== 0 && img.getBoundingClientRect().top < window.innerHeight * 2) {
                const idImg = img.dataset.id + "." + img.dataset.src.split('.').pop();
                !(async () => {
                    await betterncm.fs.writeFile('/FluentMusicCover-Cache/' + idImg,
                        await fetch(img.dataset.src + "?param=64y64").then(v => v.blob()));

                    cached.push(img.dataset.id);
                    img.src = cacheDir + idImg;
                })();
            }
        }

        const coverImageOnload = (img) => {
            if (!img.src.startsWith('data:image/gif;base64')) {
                img.style.opacity = 1;
                return;
            }
            loadCoverImage(img);
        }
        window.coverImageOnload = coverImageOnload;
        window.getCoverImage = (id, src) => {
            id = id.toString();
            const idImg = id + "." + src.split('.').pop();
            if (cached.includes(id)) {
                return cacheDir + idImg;
            } else {
                return 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
            }
        }
        window.getCoverStyle = (id, src) => {
            const url = getCoverImage(id, src);
            if (url.startsWith('data:image/gif;base64')) {
                return 'opacity:0';
            }
            const testImg = new Image();
            testImg.src = url;
            if (testImg.complete) {
                return 'opacity:1;transition:none';
            }
            return 'opacity:0';
        }

        // lazy load for img.betterncm-fluentmusiccover-lazyload
        const lazyLoad = () => {
            const imgs = document.querySelectorAll('img.betterncm-fluentmusiccover-lazyload[src^="data:image/gif;base64"]')
            for (let img of imgs) {
                loadCoverImage(img);
            }
        }
        window.FluentMusicLazyLoad = betterncm.utils.debounce(lazyLoad, 100);
    }

    init();
})();