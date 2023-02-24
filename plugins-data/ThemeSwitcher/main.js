plugin.onLoad(() => {
    !(async () => {
        const head = await betterncm.utils.waitForElement('head', 20);
        const skinBtn = await betterncm.utils.waitForElement('.m-tool .skin.z-notip', 20);

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

        if (localStorage['cc.microblock.themeswitcher.theme'] === 'light') switchToLight();
        else switchToDark();

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

        const hookThemeBtn = ()=>{
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
    })()
})