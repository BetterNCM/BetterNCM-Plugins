plugin.onConfig((tools) => {
    console.log(tools)
    const btnFollowSystem = tools.makeBtn(`跟随系统主题 [${localStorage['cc.microblock.themeswitcher.followSystem'] === 'true' ? '√' : '×'}]`, () => {
        if (localStorage['cc.microblock.themeswitcher.followSystem'] === 'true') {
            localStorage['cc.microblock.themeswitcher.followSystem'] = 'false'
            btnFollowSystem.innerText = `跟随系统主题 [×]`
        }else{
            localStorage['cc.microblock.themeswitcher.followSystem'] = 'true'
            btnFollowSystem.innerText = `跟随系统主题 [√]`
        }
    });
    return dom('div', {}, btnFollowSystem)
})

plugin.onLoad(() => {
    !(async () => {
        const head = await betterncm.utils.waitForElement('head', 20);
        const skinBtn = await betterncm.utils.waitForElement('.m-tool .skin.z-notip', 20);

        localStorage['cc.microblock.themeswitcher.followSystem'] ??= 'false';

        const checkSystemTheme = async () => {
            if (localStorage['cc.microblock.themeswitcher.followSystem'] === 'true') {
                if (await betterncm.app.isLightTheme()) switchToLight();
                else switchToDark();
            }
        };

        setInterval(checkSystemTheme, 5000)


        localStorage['cc.microblock.themeswitcher.theme'] ??= 'light'

        const style = document.createElement('style');
        style.innerHTML = `
            .m-skswitch{
                display:none;
            }
        `;
        head.appendChild(style);

        async function switchToLight() {
            if (!document.querySelector('.m-skswitch')) skinBtn.click();
            const skinSwitch = await betterncm.utils.waitForElement('.m-skswitch a[data-id="color"]', 20);
            skinSwitch.click();
            const skinLight = await betterncm.utils.waitForElement('.m-skswitch [data-iswhite="true"]', 20);
            skinLight.click();
        }

        async function switchToDark() {
            if (!document.querySelector('.m-skswitch')) skinBtn.click();
            const skinSwitch = await betterncm.utils.waitForElement('.m-skswitch a[data-id="theme"]', 20);
            skinSwitch.click();
            const skinLight = await betterncm.utils.waitForElement('.m-skswitch [data-name="default"]', 20);
            skinLight.click();
        }

        function switchTheme() {
            if (localStorage['cc.microblock.themeswitcher.theme'] === 'light') {
                switchToDark();
                localStorage['cc.microblock.themeswitcher.theme'] = 'dark';
            }
            else {
                switchToLight();
                localStorage['cc.microblock.themeswitcher.theme'] = 'light';
            }
        }

        const hookThemeBtn = () => {
            skinBtn.onclick = (e) => {
                // switch theme
                switchTheme();

                // stop the original event
                e.stopPropagation();
                e.preventDefault();
            };
        }

        setInterval(hookThemeBtn, 1000);
        hookThemeBtn();

        if (localStorage['cc.microblock.themeswitcher.followSystem'] !== 'true') {
            if (localStorage['cc.microblock.themeswitcher.theme'] === 'light') switchToLight();
            else switchToDark();
        } else {
            checkSystemTheme();
        }
    })()
})