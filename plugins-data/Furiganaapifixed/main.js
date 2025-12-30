let config = null; // 设置
const DEFAULT_FONT = `'Yu Gothic UI', 'Yu Gothic', '游ゴシック', 'Meiryo UI', 'Meiryo', 'Meiryo UI', 'MS Mincho', 'Microsoft YaHei UI', 'Microsoft YaHei'`; // 默认日文字体
const LYRIC_SELECTOR = [
    `div[class^="sc-fzoaKM hNuJKS"] div[class^="j-line"] p[class="lyric-next-p f-ust f-ust-1"]:first-child`, // 2.x原版 非全屏
    `ul[class^="sc-AxjAm sc-AxirZ"] li[class^="sc-fzocqA glbESi"] p:first-child`, // 2.x原版 全屏
    `ul[class="lyric"] li p[_nk = "vpjX51"]`, // 3.x原版
    `div[class="lyric"] > div[class^="rnp-lyrics"] div[class^="rnp-lyrics-line-original"]`, // RefinedNowPlaying
    `div[class^="lyric-bar-inner"] div[class^="rnp-lyrics-line-original"]`, // LyricBar
    `div[class="amll-lyric-player-wrapper"] div[class^="lyricMainLine"]`, // 类苹果歌词
    `div[class="lyric"] > div[class^="rnp-lyrics"] div[class^="rnp-lyrics-line-karaoke"]`, // RefinedNowPlaying 逐字歌词
    `div[class^="lyric-bar-inner"] div[class^="rnp-lyrics-line-karaoke"]` // LyricBar 逐字歌词
]; // 网易云音乐歌词页面的歌词的CSS选择器
let cache = null; // 每句歌词原文与注音后歌词的缓存
let errorDOM = null; // 错误弹窗
let posted = false; // 是否处在发送请求后，接收响应前的状态
const head = document.querySelector('head');
const HANZI = '爱为异伟汇违维遗纬员阴饮韵亩运云咏卫园烟远铅冈亿忆华货涡过祸个课贺饿开阶块溃谐贝盖该较阁确获吓额辖贯唤换间闲汉惯监缓还馆环简韩舰顽颜愿纪轨记规几挥贵弃毁辉机骑义仪拟议级纠宫给穷许鱼渔协况胁强桥矫镜竞响惊业极仅紧锦谨银训军计启倾庆鲸剧决结杰洁见轩坚绢宪贤谦键茧悬现减库夸顾后语误护红贡绞项沟构纲兴钢讲购刚狱驹顷垦恳诈锁灾细债载际财栅错册杀产伞斩暂师纸视词试诗资饲挚赐时饵识轴执质车谢肿种树终习众丑袭缩术纯顺润书绪诸绍讼胜伤详赏偿场锭饰织职针绅进诊审亲阵寻肾须帅锤势圣诚请责积绩设节羡铣迁选荐鲜渐组诉础仓扫创丧层赠则侧测贼孙损逊贷队态题诺浊达夺谁绽诞锻谈坛耻筑冲驻贮长帐张钓顶鸟胀贴肠调惩沉陈赁镇坠鹤贞订侦缔适敌彻电涂赌东冻岛讨栋汤统头誊腾动铜导顿贪钝谜锅软难认热纳农浓马骂败辈买赔剥缚罚阀贩饭烦颁范盘飞费罢备笔评标贫宾频负妇肤赋谱风复纷喷坟愤奋闻并闭币饼别编补访报饱缝纺贸谋颊扑脉务无梦雾铭鸣灭绵网门纹问约跃输邮涌犹游诱忧优预扬叶阳窑养拥罗络滥蓝栏里离陆侣虏虑凉领疗粮伦轮临类铃丽连练吕赂笼论话贿醫悅歐毆奧橫溫畫會學嶽幹卻腳舊虛禦峽挾狹區徑莖攜獻嚮黃號國參蠶慘殘辭濕寫壽敘將稱條狀觸囑寢盡隨樞數據聲靜稅竊淺踐潛雙壯爭裝屬墮體滯脫擔膽斷癡蟲晝點鬥燈當黨盜獨屆內麥蠻貓寶沒萬與譽踴來亂禮勵戀爐樓灣';
const KANJI = '愛為異偉彙違維遺緯員陰飲韻畝運雲詠衛園煙遠鉛岡億憶華貨渦過禍個課賀餓開階塊潰諧貝蓋該較閣確獲嚇額轄貫喚換間閑漢慣監緩還館環簡韓艦頑顔願紀軌記規幾揮貴棄毀輝機騎義儀擬議級糾宮給窮許魚漁協況脅強橋矯鏡競響驚業極僅緊錦謹銀訓軍計啓傾慶鯨劇決結傑潔見軒堅絹憲賢謙鍵繭懸現減庫誇顧後語誤護紅貢絞項溝構綱興鋼講購剛獄駒頃墾懇詐鎖災細債載際財柵錯冊殺産傘斬暫師紙視詞試詩資飼摯賜時餌識軸執質車謝腫種樹終習衆醜襲縮術純順潤書緒諸紹訟勝傷詳賞償場錠飾織職針紳進診審親陣尋腎須帥錘勢聖誠請責積績設節羨銑遷選薦鮮漸組訴礎倉掃創喪層贈則側測賊孫損遜貸隊態題諾濁達奪誰綻誕鍛談壇恥築沖駐貯長帳張釣頂鳥脹貼腸調懲沈陳賃鎮墜鶴貞訂偵締適敵徹電塗賭東凍島討棟湯統頭謄騰働銅導頓貪鈍謎鍋軟難認熱納農濃馬罵敗輩買賠剝縛罰閥販飯煩頒範盤飛費罷備筆評標貧賓頻負婦膚賦譜風複紛噴墳憤奮聞併閉幣餅別編補訪報飽縫紡貿謀頰撲脈務無夢霧銘鳴滅綿網門紋問約躍輸郵湧猶遊誘憂優預揚葉陽窯養擁羅絡濫藍欄里離陸侶虜慮涼領療糧倫輪臨類鈴麗連練呂賂籠論話賄医悦欧殴奥横温画会学岳干却脚旧虚御峡挟狭区径茎携献向黄号国参蚕惨残辞湿写寿叙将称条状触嘱寝尽随枢数拠声静税窃浅践潜双壮争装属堕体滞脱担胆断痴虫昼点斗灯当党盗独届内麦蛮猫宝没万与誉踊来乱礼励恋炉楼湾';

plugin.onConfig(() => {
    // DOM元素创建及常量声明
    const configDOM = document.createElement('div');
    configDOM.id = 'furigana-config';
    configDOM.innerHTML = `
        <style>
        #furigana-config ul {
            display: inline-block;
            padding: 1em;
            color: white;
            background: linear-gradient(darkslategray 0%, midnightblue 100%);
        }

        #furigana-config ruby,
        #furigana-config li {
            font-size: 24px;
        }

        #furigana-config * {
            margin: 8px 0;
            font-size: 16px;
        }

        #furigana-config input,
        #furigana-config select,
        #furigana-config button {
            color: black;
        }
    </style>
    <ul>
        <li><ruby>天気<rt>てんき</rt></ruby>が<ruby>良<rt>い</rt></ruby>いから</li>
        <li style="font-weight: bold;"><ruby>散歩<rt>さんぽ</rt></ruby>しましょう</li>
    </ul>
    <h5>本插件对桌面歌词无效。光标悬停在“?”上以查看说明。</h5>
    <br>
    <p>
        <input type="checkbox" id="pronounce">
        <label for="pronounce">日文振假名</label>
        <a title="给日文歌的汉字上方注音
需要联网，且准确率有限">?</a>
    </p>
    <p>
        <input type="checkbox" id="karaoke_support">
        <label for="karaoke_support">逐字歌词支持</label>
        <a title="注意：无法支持“类苹果歌词”插件

本插件对逐字歌词的支持尚不完善，关闭后则不会在逐字歌词标注振假名
在一个单词有多个汉字的情况下，逐字会变为逐词，介意请关闭
如此功能造成了崩溃、性能问题或是其他的错误，也建议关闭">?</a>
    </p>
    <p>
        <label for="furigana_size">注音字体尺寸</label>
        <input type="range" id="furigana_size" value="50" min="10" max="100" step="1">
        <label id="furigana_size-num"></label>
        <a title="注音与被注音汉字的大小之比">?</a>
    </p>
    <p>
        <input type="checkbox" id="use_jpn_font">
        <label for="use_jpn_font">日语歌使用日文字体</label>
        <a title="中文和日文的汉字标准字形有别
在播放日语歌时，将歌词字体替换为指定的日文字体
播放非日文歌时则使用默认字体">?</a>
    </p>
    <p>
        <label for="font">日文字体</label>
        <input id="font">
        <a title="格式：
'字体1', '字体2', '字体3'
使用英文单引号和逗号
当字体1没有该字，则使用字体2显示，以此类推">?</a>
        <button id="font-restore">重置</button>
    </p>
    <p>
        <input type="checkbox" id="fix">
        <label for="fix">汉字修正</label>
        <a title="1. 将日文歌词当中被“繁转简”的汉字还原，例：
简体中国语⇒簡体中国語
2. 将日文歌词当中被“简转繁”的汉字还原，例：
繁體中國語⇒繁体中国語
在日本文化厅发布的《常用漢字表》之外的汉字不会进行转换
由于简中、繁中、日文的汉字可能并非一一对应，转换可能有误
对桌面歌词无效">?</a>
    </p>
    <p>
    <button id="cache-clear">清除缓存</button>
    <a title="原歌词以及处理后的歌词会存入本地缓存中，过期时间为72小时
如果设置有更改，而缓存内容是基于旧的设置，可以尝试清除缓存
若缓存内容过多，可能导致性能上的问题或是写入缓存失败，此时也可尝试清除缓存">?</a>
    </p>`;
    const save = (key, value) => {
        config[key] = value;
        localStorage.setItem('furigana', JSON.stringify(config));
    };

    function getStyle(id) {
        let styleDOM = document.getElementById(id);
        if (!styleDOM) {
            styleDOM = document.createElement('style');
            styleDOM.id = id;
            document.querySelector('head').appendChild(styleDOM);
        }
        return styleDOM;
    }

    // DOM元素设置读取及监听器添加
    const pronounceDOM = configDOM.querySelector('#pronounce');
    pronounceDOM.checked = config['pronounce'];
    pronounceDOM.onchange = () => {
        save('pronounce', pronounceDOM.checked);
    };

    const karaokeSupportDOM = configDOM.querySelector('#karaoke_support');
    karaokeSupportDOM.checked = config['karaoke_support'];
    karaokeSupportDOM.onchange = () => {
        save('karaoke_support', karaokeSupportDOM.checked);
    };

    const furiganaSizeDOM = configDOM.querySelector('#furigana_size');
    furiganaSizeDOM.value = config['furigana_size'];
    const furiganaSizeNumDOM = configDOM.querySelector('#furigana_size-num');
    const furiganaSizeFunc = () => {
        furiganaSizeNumDOM.innerHTML = furiganaSizeDOM.value + '%';
        getStyle('furigana-furigana_size').innerHTML = `rt { font-size: ${furiganaSizeDOM.value}% !important; }`;
    };
    furiganaSizeFunc();
    furiganaSizeDOM.oninput = furiganaSizeFunc;
    furiganaSizeDOM.onchange = () => {
        save('furigana_size', furiganaSizeDOM.value);
    };

    const fontFunc = () => {
        if (config['use_jpn_font']) {
            let str = '';
            for (const selector of LYRIC_SELECTOR)
                str += selector + ', ';
            const style = `#furigana-config ul { font-family: ${fontDOM.value} !important; align-items: baseline; margin: auto; }`;
            getStyle('furigana-font').innerHTML = str + style;
            getStyle('furigana-preview').innerHTML = style;
        }
    };
    const useJpnFontDOM = configDOM.querySelector('#use_jpn_font');
    useJpnFontDOM.checked = config['use_jpn_font'];
    useJpnFontDOM.onchange = () => {
        save('use_jpn_font', useJpnFontDOM.checked);
        if (!useJpnFontDOM.checked) {
            const fontStyle = head.querySelector('#furigana-font');
            if (fontStyle) head.removeChild(fontStyle);
            const previewStyle = head.querySelector('#furigana-preview');
            if (previewStyle) head.removeChild(previewStyle);
        } else fontFunc();
    };

    const fontDOM = configDOM.querySelector('#font');
    fontDOM.value = config['font'];
    fontFunc();
    fontDOM.onchange = () => {
        save('font', fontDOM.value);
        fontFunc();
    };
    configDOM.querySelector('#font-restore').onclick = () => {
        fontDOM.value = DEFAULT_FONT;
        fontDOM.onchange();
    };

    const fixDOM = configDOM.querySelector('#fix');
    fixDOM.checked = config['fix'];
    fixDOM.onchange = () => {
        save('fix', fixDOM.checked);
    };

    const cacheDOM = configDOM.querySelector('#cache-clear');
    cacheDOM.onclick = () => {
        cache.clear();
        localStorage.removeItem('furigana-cache');
        cacheDOM.innerHTML = '缓存已清除';
        cacheDOM.disabled = true;
        setTimeout(() => {
            cacheDOM.innerHTML = '清除缓存';
            cacheDOM.disabled = false;
        }, 10000);
    }
    return configDOM;
});

plugin.onLoad(() => {
    // 读取设置
    try {
        config = JSON.parse(localStorage.getItem('furigana'));
    } catch (e) {
        error(`读取设置失败<br>错误信息：${e.message}`)
    }
    if (!config) config = {
        pronounce: true,
        karaoke_support: true,
        furigana_size: 50,
        use_jpn_font: true,
        font: DEFAULT_FONT,
        fix: true
    };

    // 读取本地缓存
    try {
        const temp = JSON.parse(localStorage.getItem('furigana-cache'));
        if (temp) {
            cache = new Map(Object.entries(temp));
            const expireTime = Math.round((Date.now() - 86400000 * 3) / 3600000); // 过期时间3天 精确到小时
            cache.forEach((value, key) => {
                if (value[1] < expireTime) cache.delete(key);
            });
        } else cache = new Map();
    } catch (e) {
        error(`读取缓存失败<br>错误信息：${e.message}`);
        cache = new Map();
    }

    // 持续判断歌词页面是否打开
    setInterval(() => {
        if (!config['pronounce'] || posted) return;
        for (const selector of LYRIC_SELECTOR) {
            const elem = document.querySelectorAll(selector);
            if (elem && elem.length) pronounce(elem);
        }
    }, 500);
});

/**
 * 弹出错误弹窗
 * @param {string} message 错误信息
 */
function error(message) {
    if (!errorDOM) errorDOM = document.createElement('div');
    errorDOM.innerHTML = `<h5 style="font-weight: bold;">Furigana</h5>${message}`;
    errorDOM.style = 'font-size: 16px; position: absolute; left: 20%; top: 16px; background-color: #7007; border-radius: 16px; backdrop-filter: blur(8px); z-index: 999; padding: 16px; line-height: 20px;';
    const closeDOM = document.createElement('a');
    closeDOM.innerHTML = '✕';
    closeDOM.style = 'position: absolute; right: 16px; top: 16px;';
    function retry() {
        if (errorDOM) errorDOM.remove();
    }
    closeDOM.onclick = retry;
    errorDOM.appendChild(closeDOM);
    document.querySelector('body').appendChild(errorDOM);
    setTimeout(retry, 5000);
}

/**
 * 汉字修正
 * @param {string} text 单句歌词
 * @returns {string} 修正后的歌词
 */
function fix(text) {
    const temp = text;
    text = '';
    for (let i = 0; i < temp.length; i++) { // 汉字替换
        const chr = temp.charAt(i);
        const idx = HANZI.indexOf(chr);
        text += idx === -1 ? chr : KANJI.charAt(idx);
    }
    text = text.replace(/後([妃宮])/g, '后$1').replace(/([皇太]後)/g, '$1后'); // 复原被错误替换的“后”字
    text = text.replace(/葉([いうわえお])/g, '叶$1'); // 复原被错误替换的“叶”字
    return text;
}

/**
 * 对请求返回的文本进行后期处理
 * @param {string} result 请求结果文本
 * @param {boolean} isAcc 字符串括号内的内容是否为伴唱
 * @returns {string[]} 处理后的文本
 */
function process(result, isAcc) {
    result = result.replace(/<rp>.<\/rp>/g, ''); // 删去rp标签，节约空间
    result = result.replace(/<rt>[^ぁ-ヿ]<\/rt>/g, '<rt></rt>'); // 简体中文独有汉字会把本字注音上去，删除
    result = result.replace(/<ruby>([㐀-鿿々0-9０-９]+?)<\/ruby>/g, '<ruby>$1<rt></rt></ruby>'); // 统一格式，让无注音的汉字的ruby标签内也有rt标签
    if (!isAcc)
        result = result.replace(/<ruby>([㐀-鿿々0-9０-９]+?)<rt>([ぁ-ヿ]*?)<\/rt><\/ruby>[（\(]([ぁ-ヿ]+?)[）\)]/g, '<ruby>$1<rt></rt></ruby>（$3）'); // 删除已成功机器注音，但后面跟着括号注音的单个汉字词的注音
    result = result.replaceAll('<ruby>一<rt>いち</rt></ruby><ruby>人<rt>にん</rt></ruby>', '<ruby>一人<rt>ひとり</rt></ruby>'); // 改正“一人”的发音
    result = result.replaceAll('<ruby>二<rt>に</rt></ruby><ruby>人<rt>にん</rt></ruby>', '<ruby>二人<rt>ふたり</rt></ruby>'); // 改正“二人”的发音
    return result.split('\n');
}

/**
 * 给歌词注音
 * @param {Element[]} lyricElem 多句歌词的DOM元素
 */
function pronounce(lyricElem) {
    const markStr = '<furigana></furigana>'; // 标记一句歌词是否已被注音
    let updated = false; // 标记缓存是否被更新
    let date = 0; // 记录当前时间 精确到小时

    // 判断该歌是否为日文歌
    let isJapanese = false;
    for (const elem of lyricElem) {
        if (elem.querySelector('furigana') || /[ぁ-ヿ]/g.test(elem.innerHTML)) {
            isJapanese = true;
            break;
        }
    }

    if (isJapanese) {
        if (config['use_jpn_font'] && !head.querySelector('#furigana-font')) {
            const style = document.createElement('style');
            style.id = 'furigana-font';
            for (const selector of LYRIC_SELECTOR)
                style.innerHTML += selector + ', ';
            style.innerHTML += `#furigana-config ul { font-family: ${config['font']} !important; align-items: baseline; margin: auto; }`;
            head.appendChild(style);
        }
    } else {
        const style = head.querySelector('#furigana-font');
        if (style) head.removeChild(style);
        return;
    }
    //return;
    //取消注释，测试新api是否可用
    // 判断是否是逐字歌词
    for (const elem of lyricElem) {
        if (elem.querySelector('span')) {
            pronouncePlus(lyricElem);
            return;
        }
    }

    // 将未注音且未缓存的歌词收集起来，统一上传
    let str = '';
    const map = new Map();
    for (const lyric of lyricElem) {
        if (lyric.querySelector('furigana')) continue;
        const rawLyric = lyric.innerHTML;

        // 读取缓存
        const value = cache.get(rawLyric);
        if (value) {
            lyric.innerHTML = `${value[0]}${markStr}`;
            if (!updated) date = Math.round(Date.now() / 3600000);
            updated = true;
            value[1] = date;
            continue;
        }

        // 汉字修正
        if (config['fix']) lyric.innerHTML = fix(rawLyric);

        str += `${lyric.innerHTML}\n`;
        map.set(lyric.innerHTML, [lyric, rawLyric]);
        updated = true;
    }
    if (updated) {
        try {
            localStorage.setItem('furigana-cache', JSON.stringify(Object.fromEntries(cache)));
        } catch (e) {
            error(`写入缓存失败<br>错误信息${e.message}`);
        }
    }
    if (!str) return;

    // 判断括号内的是否是伴唱
    let isAcc = false;
    const temp = str.match(/(?<=[（\(])(.*?[^ぁ-ヿ].*?)(?=[）\)])/g);
    if (temp) for (const tem of temp) {
        if (!/[（）\(\)]/g.test(tem)) {
            isAcc = true;
            break;
        }
    }

    posted = true;
    date = Math.round(Date.now() / 3600000);
    console.log('Furigana: Trying to fetch...');
    const requestBody = JSON.stringify({
        str: str,
        mode: 'furigana',
        to: 'hiragana',
        romajiSystem: 'hepburn'
    });
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        body: requestBody
    };
    const primaryUrl = 'https://jpxg.netlify.app/.netlify/functions/index';
    const backupUrl = 'https://api.0721for.me/.netlify/functions/index';
    
    const doFetch = (url) => fetch(url, requestOptions).then(resp => {
        console.log('Furigana: Response received.');
        if (resp.ok) return resp.json();
        else throw new Error(`响应出错，错误代码：${resp.status}`);
    });
    
    doFetch(primaryUrl).catch(err => {
        console.warn('Primary API failed, trying backup...', err);
        return doFetch(backupUrl);
    }).then(result => {
        if (!result) return;
        result = process(result, isAcc);
        str = str.split('\n');
        for (let i = 0; i < map.size; i++) {
            const arr = map.get(str[i]);
            arr[0].innerHTML = `${result[i]}${markStr}`;
            cache.set(arr[1], [result[i], date]);
        }
        try {
            localStorage.setItem('furigana-cache', JSON.stringify(Object.fromEntries(cache)));
        } catch (e) {
            error(`写入缓存失败<br>错误信息${e.message}`);
        }
        posted = false;
    }).catch(err => {
        console.error(err);
        error(`错误信息：${err.message}`);
        posted = false;
    });
}

/**
 * 给逐字歌词注音
 * @param {Element[]} lyricElem 多句歌词的DOM元素
 */
function pronouncePlus(lyricElem) {
    if (!config['karaoke_support']) return;
    if (/^(lyricMainLine)/.test(lyricElem[0].className)) return; // TODO: 对于“类苹果歌词”逐字歌词暂时不注音
    const markStr = '<furigana></furigana>'; // 标记一句歌词是否已被注音
    let updated = false; // 标记缓存是否被更新
    let date = 0; // 记录当前时间 精确到小时

    // 将未注音且未缓存的歌词收集起来，统一上传
    let str = '';
    const map = new Map();
    for (const lyric of lyricElem) {
        if (lyric.querySelector('furigana')) continue;
        const lyricArr = ['', []];
        for (let span of lyric.children) {
            if (span.tagName !== 'SPAN') span = span.querySelector('span');
            const spanSpan = span.querySelectorAll('span');
            if (spanSpan.length) {
                for (let child of spanSpan) {
                    const childSpan = child.querySelector('span'); // TODO: 对“类苹果歌词”逐字歌词的兼容
                    if (childSpan) child = childSpan;
                    lyricArr[0] += child.innerHTML;
                    lyricArr[1].push(child);
                }
            } else {
                lyricArr[0] += span.innerHTML;
                lyricArr[1].push(span);
            }
        }

        // 读取缓存
        const value = cache.get(lyricArr[0]);
        if (value) {
            let val = value[0];
            if (config['fix']) { //逐字歌词每个字的汉字修正
                const fixed = fix(lyricArr[0]);
                for (let i = 0, start = 0; i < lyricArr[1].length; i++) {
                    const len = lyricArr[1][i].innerHTML.length;
                    lyricArr[1][i].innerHTML = fixed.substring(start, start + len);
                    start += len;
                }
            }
            for (let i = 0, cnt = 0, match = '', endWithSpace = false; i < lyricArr[1].length; i++) {
                if (!/[㐀-鿿々0-9０-９]+?/.test(lyricArr[1][i].innerHTML)) continue;
                switch (cnt) {
                    case 0:
                        const trimed = lyricArr[1][i].innerHTML.trimEnd();
                        endWithSpace = trimed.length !== lyricArr[1][i].innerHTML;
                        match = val.match(`<ruby>(${trimed}.*?)<rt>(.*?)<\/rt><\/ruby>`);
                        if (!match) continue;
                        else val = val.replace(match[0], '');
                        cnt = match[1].length;
                        if (cnt === 1) {
                            lyricArr[1][i].innerHTML = match[0] + (endWithSpace ? ' ' : '');
                            const nextEle = lyricArr[1][i].nextElementSibling;
                            if (nextEle) nextEle.innerHTML = lyricArr[1][i].innerHTML;
                            cnt = 0;
                        } else {
                            lyricArr[1][i].innerHTML = '';
                            const nextEle = lyricArr[1][i].nextElementSibling;
                            if (nextEle) nextEle.innerHTML = lyricArr[1][i].innerHTML;
                            cnt--;
                            break;
                        }
                    case 1: {
                        lyricArr[1][i].innerHTML = match[0] + (endWithSpace ? ' ' : '');
                        const nextEle = lyricArr[1][i].nextElementSibling;
                        if (nextEle) nextEle.innerHTML = lyricArr[1][i].innerHTML;
                        cnt = 0;
                        break;
                    }
                    default: {
                        lyricArr[1][i].innerHTML = '';
                        const nextEle = lyricArr[1][i].nextElementSibling;
                        if (nextEle) nextEle.innerHTML = lyricArr[1][i].innerHTML;
                        cnt--;
                        break;
                    }
                }
            }
            lyricArr[1][0].innerHTML += markStr;
            if (!updated) date = Math.round(Date.now() / 3600000);
            updated = true;
            value[1] = date;
            continue;
        }

        // 汉字修正
        let fixedLyric = lyricArr[0];
        if (config['fix']) fixedLyric = fix(fixedLyric);

        str += `${fixedLyric}\n`;
        map.set(fixedLyric, lyricArr);
        updated = true;
    }
    if (updated) {
        try {
            localStorage.setItem('furigana-cache', JSON.stringify(Object.fromEntries(cache)));
        } catch (e) {
            error(`写入缓存失败<br>错误信息${e.message}`);
        }
    }
    if (!str) return;

    // 判断括号内的是否是伴唱
    let isAcc = false;
    const temp = str.match(/(?<=[（\(])(.*?[^ぁ-ヿ].*?)(?=[）\)])/g);
    if (temp) for (const tem of temp) {
        if (!/[（）\(\)]/g.test(tem)) {
            isAcc = true;
            break;
        }
    }

    posted = true;
    date = Math.round(Date.now() / 3600000);
    console.log('Furigana: Trying to fetch...');
    const requestBody = JSON.stringify({
        str: str,
        mode: 'furigana',
        to: 'hiragana',
        romajiSystem: 'hepburn'
    });
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        body: requestBody
    };
    const primaryUrl = 'https://jpxg.netlify.app/.netlify/functions/index';
    const backupUrl = 'https://api.0721for.me/.netlify/functions/index';
    
    const doFetch = (url) => fetch(url, requestOptions).then(resp => {
        console.log('Furigana: Response received.');
        if (resp.ok) return resp.json();
        else throw new Error(`响应出错，错误代码：${resp.status}`);
    });
    
    doFetch(primaryUrl).catch(err => {
        console.warn('Primary API failed, trying backup...', err);
        return doFetch(backupUrl);
    }).then(result => {
        if (!result) return;
        result = process(result, isAcc);
        str = str.split('\n');
        for (let i = 0; i < map.size; i++) {
            const lyricArr = map.get(str[i]);
            let val = result[i];
            if (config['fix']) { //逐字歌词每个字的汉字修正
                const fixed = fix(lyricArr[0]);
                for (let j = 0, start = 0; j < lyricArr[1].length; j++) {
                    const len = lyricArr[1][j].innerHTML.length;
                    lyricArr[1][j].innerHTML = fixed.substring(start, start + len);
                    start += len;
                }
            }
            for (let j = 0, cnt = 0, match = '', endWithSpace = false; j < lyricArr[1].length; j++) {
                if (!/[㐀-鿿々0-9０-９]+?/.test(lyricArr[1][j].innerHTML)) continue;
                switch (cnt) {
                    case 0:
                        const trimed = lyricArr[1][j].innerHTML.trimEnd();
                        endWithSpace = trimed.length !== lyricArr[1][j].innerHTML;
                        match = val.match(`<ruby>(${trimed}.*?)<rt>(.*?)<\/rt><\/ruby>`);
                        if (!match) continue;
                        else val = val.replace(match[0], '');
                        cnt = match[1].length;
                        if (cnt === 1) {
                            lyricArr[1][j].innerHTML = match[0] + (endWithSpace ? ' ' : '');
                            const nextEle = lyricArr[1][j].nextElementSibling;
                            if (nextEle) nextEle.innerHTML = lyricArr[1][j].innerHTML;
                            cnt = 0;
                        } else {
                            lyricArr[1][j].innerHTML = '';
                            const nextEle = lyricArr[1][j].nextElementSibling;
                            if (nextEle) nextEle.innerHTML = lyricArr[1][j].innerHTML;
                            cnt--;
                        }
                        break;
                    case 1: {
                        lyricArr[1][j].innerHTML = match[0] + (endWithSpace ? ' ' : '');
                        const nextEle = lyricArr[1][j].nextElementSibling;
                        if (nextEle) nextEle.innerHTML = lyricArr[1][j].innerHTML;
                        cnt = 0;
                        break;
                    }
                    default: {
                        lyricArr[1][j].innerHTML = '';
                        const nextEle = lyricArr[1][j].nextElementSibling;
                        if (nextEle) nextEle.innerHTML = lyricArr[1][j].innerHTML;
                        cnt--;
                        break;
                    }
                }
            }
            lyricArr[1][0].innerHTML += markStr;
            cache.set(lyricArr[0], [result[i], date]);
        }
        try {
            localStorage.setItem('furigana-cache', JSON.stringify(Object.fromEntries(cache)));
        } catch (e) {
            error(`写入缓存失败<br>错误信息${e.message}`);
        }
        posted = false;
    }).catch(err => {
        console.error(err);
        error(`错误信息：${err.message}`);
        posted = false;
    });
}