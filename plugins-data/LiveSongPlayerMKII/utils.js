plugin.onLoad(function (plugin) {
    let utils = {
        searchSong(keyword) {
            var searchsong_handle;
            return Promise.race([new Promise(function (resolve) {
                var handle = setInterval(function () {
                    if (window["searching"])
                        return;
                    window["searching"] = true;
                    clearInterval(handle);
                    document.querySelector(".j-search-input").value = keyword;
                    document.querySelector(".sch-btn").click();
                    searchsong_handle = setInterval(function () {
                        if (!document.querySelector(".m-search .j-item"))
                            return;
                        clearInterval(searchsong_handle);
                        resolve(utils.getSearchResult());
                        setTimeout(function () {
                            window["searching"] = false;
                        }, 50);
                    }, 100);
                });
            }), betterncm.utils.delay(3000).then(_ => { 
                clearInterval(searchsong_handle);
				window["searching"] = false;
				throw Error("Search Timeout"); })]);
        },
        getSearchResult(number) {
            if (number === void 0) { number = 0; }
            return {
                name: document.querySelectorAll(".m-search .j-item .title")[number].innerText.trim(),
                author: document.querySelectorAll(".m-search .j-item .flow .s-fc3")[number].innerText.trim(),
                id: document.querySelectorAll(".container-searchtrack .m-plylist .itm.f-cb.j-item.j-impress")[number].classList.toString().match(/tid-(\S+)/)[1].trim()
            };
        },
        playSong(id) {
            _playsong_ = betterncm.ncm.findNativeFunction(ctl.actionManager, [".logSource=", ".action"]);
            ctl.actionManager[_playsong_]({ id, type: "4", action: "play", from: 0, href: "", data: {} });
        }
    }

    this.utils = utils;
})
