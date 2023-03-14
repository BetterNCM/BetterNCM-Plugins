plugin.onLoad(async () => {
    new MutationObserver(() => {
        if (document.querySelector('.g-wrap4,.j-flag,.m-info,.m-info-artist,.f-cb')==null) return;
        if (document.querySelector('.search')!=null) return;
        const prev = document.querySelector('.profile');
        prev.style = '--text:"网易云个人主页";'
        prev.innerHTML=`
            <svg><use xlink:href="orpheus://orpheus/style/res/svg/icon.sp.svg#btn_profile"></use></svg>
			网易云个人主页
        `
        const bili_btn = document.createElement('div');
        bili_btn.className = 'u-ibtn5 z-off profile search';
        bili_btn.style = '--text:"在bilibili中搜索";';
        bili_btn.innerHTML = `
            <svg><use xlink:href="orpheus://orpheus/style/res/svg/icon.sp.svg#btn_profile"></use></svg>
			在bilibili中搜索个人主页
		`;
        bili_btn.addEventListener('click', () => {
            const artist = document.getElementsByClassName("f-ust")[0].innerText;
            const url = `https://search.bilibili.com/upuser?keyword=${encodeURIComponent(`${artist}`)}`;
            console.log(url)
            betterncm.app.exec(url);
        });
        const weibo_btn = document.createElement('div');
        weibo_btn.className = 'u-ibtn5 z-off profile search';
        weibo_btn.style = '--text:"在微博中搜索";';
        weibo_btn.innerHTML = `
			<svg><use xlink:href="orpheus://orpheus/style/res/svg/icon.sp.svg#btn_profile"></use></svg>
			在微博中搜索个人主页
		`;
        weibo_btn.addEventListener('click', () => {
            const artist = document.getElementsByClassName("f-ust")[0].innerText;
            const url = `https://s.weibo.com/user?q=${encodeURIComponent(`${artist}`)}`;
            console.log(url)
            betterncm.app.exec(url);
        });
        const sing_btn = document.createElement('div');
        sing_btn.className = 'u-ibtn5 z-off profile search';
        sing_btn.style = '--text:"在5sing中搜索";';
        sing_btn.innerHTML = `
			<svg><use xlink:href="orpheus://orpheus/style/res/svg/icon.sp.svg#btn_profile"></use></svg>
			在5sing中搜索个人主页
		`;
        sing_btn.addEventListener('click', () => {
            const artist = document.getElementsByClassName("f-ust")[0].innerText;
            const url = `http://search.5sing.kugou.com/?keyword=${encodeURIComponent(`${artist}`)}`;
            console.log(url)
            betterncm.app.exec(url);
        });

        prev.parentNode.insertBefore(bili_btn, prev.nextSibling);
        prev.parentNode.insertBefore(weibo_btn, prev.nextSibling.nextSibling);
        prev.parentNode.insertBefore(sing_btn, prev.nextSibling.nextSibling.nextSibling);
    }).observe(await betterncm.utils.waitForElement('.m-yrsh'), {childList: true, subtree: true});
});
