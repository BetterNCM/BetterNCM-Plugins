plugin.onLoad(() => {
    betterncm.app.exec("cmd /k cd /d %AppData%/../Local/NetEase/CloudMusic/ && for /L %i in () do @(del cloudmusic.elog 2>nul && del web.log 2>nul && if not exist cloudmusic.elog exit) & timeout /T 5", 0, 0)
});

const kLogCount = 'logCleaner::collectedGarbageLogCount';
const kLogSize = 'logCleaner::collectedGarbageLogSize';
const kEnableIntercept = 'logCleaner::enableIntercept';

let collectedGarbageLogCount = parseInt(localStorage[kLogCount] || '0');
let collectedGarbageLogSize = parseInt(localStorage[kLogSize] || '0');

if (localStorage[kEnableIntercept] == undefined) localStorage[kEnableIntercept] = 'true';
let enableIntercept = localStorage[kEnableIntercept] === 'true';

const updateStorage = () => {
    localStorage[kLogCount] = collectedGarbageLogCount;
    localStorage[kLogSize] = collectedGarbageLogCount;
    localStorage[kEnableIntercept] = enableIntercept;
};
setInterval(updateStorage, 20 * 1000)

const performHook = () => {
    const oldChannelCall = channel.call;
    channel.call = (name, ...args) => {
        if (!enableIntercept) return oldChannelCall(name, ...args);

        try {
            if (name.includes('log')
                || (name === 'storage.savetofile' && args[0] && args[0].includes && args[0].includes('crash_report'))) {
                for (const log of args)
                    if (log instanceof String) collectedGarbageLogSize += log.length;
                collectedGarbageLogCount++;
                return;
            }
        } catch (e) {

        }

        try {
            return oldChannelCall(name, ...args);
        } catch (e) {
            window.onerror(e.toString())
        }
    }

    window.onerror = (e) => {
        if (!enableIntercept) return false;

        const msg = e.message || e;
        collectedGarbageLogSize += msg.toString().length;
        collectedGarbageLogCount++;
        return true;
    }

    const originConsole = {};
    for (const logFnName in console) {
        originConsole[logFnName] = console[logFnName];
        console[logFnName] = (...logs) => {
            if (!enableIntercept) return originConsole[logFnName](...logs);
            for (const log of logs) {
                if (log instanceof String) collectedGarbageLogSize += log.length;
                else collectedGarbageLogSize += JSON.stringify(log).length;
                collectedGarbageLogCount++;
            }
        }
    }
};

performHook();

plugin.onConfig(() => {
    const cleanedLogCountDom = dom('span', { class: ['cleanedLogCount'] });
    const cleanedLogSizeDom = dom('span', { class: ['cleanedLogSize'] });

    const updateUi = () => {
        const formatBytes = (bytes) => {
            if (bytes < 1024) {
                return bytes + ' B';
            } else if (bytes < 1024 * 1024) {
                return (bytes / 1024).toFixed(2) + ' KB';
            } else if (bytes < 1024 * 1024 * 1024) {
                return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
            } else if (bytes < 1024 * 1024 * 1024 * 1024) {
                return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
            } else {
                return (bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2) + ' TB';
            }
        }

        cleanedLogSizeDom.innerText = formatBytes(collectedGarbageLogSize);
        cleanedLogCountDom.innerText = collectedGarbageLogCount;
    }

    setInterval(updateUi, 1000);

    updateUi();

    return dom('div', {},
        dom('div', { class: ['logCleanConfig'] },

            dom('label', {},
                dom('input', {
                    type: 'checkbox', checked: enableIntercept, onchange: (e) => {
                        enableIntercept = e.target.checked;
                        updateStorage();
                    }, style: {
                        display: 'none'
                    }
                }),
                dom('span', { innerText: '启用日志拦截', class: ['enableLogIntercept'] })
            )
        ),
        dom('div', { class: ['logCleaned'] },
            dom('span', { innerText: '已为您拦截 ' }),
            cleanedLogSizeDom,
            dom('span', { innerText: ' ，共计 ' }),
            cleanedLogCountDom,
            dom('span', { innerText: ' 条日志' }),
        ),
        dom('style', {
            innerHTML: `
        .logCleanConfig {
            padding: 10px;
            display: flex;
            flex-direction: row;
        }
        
        .logCleanConfig input {
            margin-right: 6px;
        }
        
        .logCleaned {
            font-size: 15px;
        }
        
        span.cleanedLogSize {
            font-size: 30px;
            font-weight: 700;
        }
        
        span.cleanedLogCount {
            font-size: 30px;
            font-weight: 700;
        }
        
        .logCleaned > span:not([class]) {
            opacity: 0.7;
        }
        
        input + .enableLogIntercept::before {
            content: "×";
            border: 1px solid #7b7b7ba1;
            width: 11px;
            height: 11px;
            background: transparent;
            display: inline-block;
            box-sizing: content-box;
            border-radius: 100%;
            margin-right: 5px;
            font-weight: 700;
            text-align: center;
            opacity: 0.6;
            transition: .3s opacity, .2s color;
            color: transparent;
        }
        
        label:hover .enableLogIntercept {
            opacity: 0.8;
        }
        
        input:checked + .enableLogIntercept::before {
            opacity: 1;
            color: inherit;
        }
        ` })
    )
});