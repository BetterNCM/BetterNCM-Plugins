betterncm.utils.waitForElement('.fx.j-flag.fsection.pluginManage').then(() => {
    const visable = localStorage.getItem(`miku-plugin-menu-visable`);
    if (visable === 'false') {
        const ele = document.querySelector('.fx.j-flag.fsection.pluginManage');
        ele.style.display = 'none';
    }
});

plugin.onConfig(() => {
    const element = document.createElement('div');
    element.innerHTML = '点击这行文本关闭/打开侧边栏的插件管理';
    element.addEventListener('click', () => {
        const ele = document.querySelector('.fx.j-flag.fsection.pluginManage');
        window.ele = ele;
        if (ele) {
            if (ele.style.display === 'none') {
                localStorage.setItem(`miku-plugin-menu-visable`, 'false')
                ele.style.display = 'block';
            }
            else {
                ele.style.display = 'none';
            }
        }
    })
    return element;
});
