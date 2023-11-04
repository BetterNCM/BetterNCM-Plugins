const settingDiv = `
    <style>
        #this * {
            font-size: 16px;
        }

        #this #example {
            width: fit-content;
            min-width: 512px;
            padding: 8px;
            background: linear-gradient(darkslategray 0%, midnightblue 100%);
        }

        #this #lyrics {
            width: calc(100% - 96px);
        }

        #this button {
            float: right;
            width: 32px;
            height: 32px;
            color: white;
            background: transparent;
            border: 1px solid white;
            border-radius: 100%;
            opacity: 0.5;
            margin: 8px 8px 0 0;
        }

        #this button:hover,
        #this button[class="enabled"] {
            opacity: 1;
        }

        #this li {
            margin: 24px 0;
            color: white;
        }

        #this .lyric p {
            opacity: 0.4;
        }

        #this .present p,
        #this .present ruby {
            font-size: 24px;
            font-weight: bold;
            opacity: 1.0;
        }

        #this span {
            color: gray;
        }

        #this input[type="text"] {
            width: 512px;
        }
    </style>
    <div id="example">
        <button>译</button>
        <button>音</button>
        <div id="lyrics">
            <ul class="lyric">
                <li class="present">
                    <p _nk="vpjX51">歌词（gēcí）效果（xiàoguǒ）预览（yùlǎn）</p>
                </li>
                <li>
                    <p _nk="vpjX51">未来（ミク）</p>
                    <p _nk="vpjX52" style="display: none">初音未来</p>
                    <p _nk="vpjX53" style="display: none">mi ku</p>
                </li>
                <li>
                    <p _nk="vpjX51">悲しみの海に沈んだ私</p>
                    <p _nk="vpjX52" style="display: none">沉入悲伤之海的我</p>
                    <p _nk="vpjX53" style="display: none">ka na shi mi no u mi ni shi zu n da wa ta shi</p>
                </li>
                <li>
                    <p _nk="vpjX51">目を開けるのも億劫</p>
                    <p _nk="vpjX52" style="display: none">就连想睁开眼也彷佛永劫</p>
                    <p _nk="vpjX53" style="display: none">me wo a ke ru no mo o kku u</p>
                </li>
            </ul>
        </div>
    </div>
    <br><br>
    <p>
        注意：不支持修改桌面歌词！
        <br><br>
    </p>
    <p>
        <input type="checkbox" id="ruby">
        <label for="ruby">给汉字标注振假名</label>
        <span><br>本功能依赖kuroshiro的在线API，需要联网<br>注音准确率有限，特别是单汉字</span>
        <br><br>
    </p>
    <p>
        <label for="size">振假名相对于汉字的字号<br></label>
        <label id="range-num" for="size"></label>
        <input type="range" id="size" value="50" min="10" max="100" step="1">
        <br><br>
    </p>
    <p>
        <input type="checkbox" id="convert">
        <label for="convert">将“音译歌词”的罗马音转换为平假名</label>
        <span><br>读wa的“は”、读e的“へ”可能会误转为“わ”“え”<br>“ぢ”“づ”“うぉ”都会被转换为“じ”“ず”“を”</span>
        <br><br>
    </p>
    <p>
        <input type="checkbox" id="jpnfont-check">
        <label for="jpnfont-check">更改主歌词的字体<br></label>
        <input type="text" id="jpnfont">
        <br><br>
    </p>
    <p>
        <input type="checkbox" id="rubyfont-check">
        <label for="rubyfont-check">更改音译歌词的字体<br></label>
        <input type="text" id="rubyfont">
        <br><br>
    </p>
    <p>
        <input type="checkbox" id="cnfont-check">
        <label for="cnfont-check">更改翻译歌词的字体<br></label>
        <input type="text" id="cnfont">
        <br><br>
    </p>
`;

const hiragana = {
    a: 'あ',
    i: 'い',
    u: 'う',
    e: 'え',
    o: 'お',

    ka: 'か',
    ki: 'き',
    ku: 'く',
    ke: 'け',
    ko: 'こ',
    kya: 'きゃ',
    kyu: 'きゅ',
    kyo: 'きょ',

    ga: 'が',
    gi: 'ぎ',
    gu: 'ぐ',
    ge: 'げ',
    go: 'ご',
    gya: 'ぎゃ',
    gyu: 'ぎゅ',
    gyo: 'ぎょ',

    sa: 'さ',
    su: 'す',
    se: 'せ',
    so: 'そ',
    sha: 'しゃ',
    shi: 'し',
    shu: 'しゅ',
    she: 'しぇ',
    sho: 'しょ',

    za: 'ざ',
    zu: 'ず',
    ze: 'ぜ',
    zo: 'ぞ',
    ja: 'じゃ',
    ji: 'じ',
    ju: 'じゅ',
    je: 'じぇ',
    jo: 'じょ',

    ta: 'た',
    ti: 'てぃ',
    tu: 'てぅ',
    te: 'て',
    to: 'と',
    cha: 'ちゃ',
    chi: 'ち',
    chu: 'ちゅ',
    che: 'ちぇ',
    cho: 'ちょ',
    tsa: 'つぁ',
    tsu: 'つ',
    tse: 'つぇ',
    tso: 'つぉ',

    da: 'だ',
    di: 'でぃ',
    du: 'でぅ',
    de: 'で',
    do: 'ど',
    dyu: 'でゅ',

    na: 'な',
    ni: 'に',
    nu: 'ぬ',
    ne: 'ね',
    no: 'の',
    nya: 'にゃ',
    nyu: 'にゅ',
    nyo: 'にょ',

    ha: 'は',
    hi: 'ひ',
    he: 'へ',
    ho: 'ほ',
    fa: 'ふぁ',
    fi: 'ふぃ',
    fu: 'ふ',
    fe: 'ふぇ',
    fo: 'ふぉ',
    hya: 'ひゃ',
    hyu: 'ひゅ',
    hyo: 'ひょ',

    pa: 'ぱ',
    pi: 'ぴ',
    pu: 'ぷ',
    pe: 'ぺ',
    po: 'ぽ',
    pya: 'ぴゃ',
    pyu: 'ぴゅ',
    pyo: 'ぴょ',

    ba: 'ば',
    bi: 'び',
    bu: 'ぶ',
    be: 'べ',
    bo: 'ぼ',
    bya: 'びゃ',
    byu: 'びゅ',
    byo: 'びょ',

    ma: 'ま',
    mi: 'み',
    mu: 'む',
    me: 'め',
    mo: 'も',
    mya: 'みゃ',
    myu: 'みゅ',
    myo: 'みょ',

    ya: 'や',
    yu: 'ゆ',
    yo: 'よ',

    ra: 'ら',
    ri: 'り',
    ru: 'る',
    re: 'れ',
    ro: 'ろ',
    rya: 'りゃ',
    ryu: 'りゅ',
    ryo: 'りょ',

    wa: 'わ',
    wi: 'うぃ',
    we: 'うぇ',
    wo: 'を',
    n: 'ん'
};

let rubyEnabled, convertEnabled, rubyStart;

const lyricType = ['', 'jpn', 'cn', 'ruby'];

/**
 * 判断该歌是否是日文歌
 * @param {Element} lyrics HTML元素的数组，它的innerHTML为歌词
 * @returns 是否是日文歌
 */
function isJapanese(lyrics) {
    for (let i = 0; i < lyrics.length; i++)
        if (/[ぁ-ヿ]/g.test(lyrics[i].innerHTML))
            return true;
    return false;
}

/**
 * 判断该歌括号内的是注音还是伴唱
 * @param {Element} lyrics HTML元素的数组，它的innerHTML为歌词
 * @returns 是否是伴唱
 */
function isAccompany(lyrics) {
    for (let i = 0; i < lyrics.length; i++) {
        const temp = lyrics[i].innerHTML.match(/(?<=[（\(])(.*?[^ぁ-ヿ].*?)(?=[）\)])/g);
        if (temp)
            for (let i = 0; i < temp.length; i++)
                if (!/[（）\(\)]/g.test(temp[i]))
                    return true;
    }
    return false;
}

/**
 * 改变指定歌词的字体
* @param {Number} type 歌词类型。1.主歌词 2.翻译歌词 3.音译歌词
*/
function changeFont(type) {
    const font = document.querySelector(`#${lyricType[type]}font`).value;
    let styleElement = document.querySelector(`#style-${lyricType[type]}font`);
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = `style-${lyricType[type]}font`;
        document.querySelector('head').appendChild(styleElement);
    }
    styleElement.innerHTML = `ul[class="lyric"] li p[_nk="vpjX5${type}"] { font-family: ${font} !important; }`;
    localStorage.setItem(`${lyricType[type]}font`, font);
    localStorage.setItem(`${lyricType[type]}fontEnabled`, 'true');
}

/**
 * 移除指定歌词的自定义字体
* @param {Number} type 歌词类型。1.主歌词 2.翻译歌词 3.音译歌词
*/
function removeFont(type) {
    const head = document.querySelector('head');
    const styleElement = head.querySelector(`#style-${lyricType[type]}font`);
    head.removeChild(styleElement);
    localStorage.setItem(`${lyricType[type]}fontEnabled`, 'false');
}

/**
 * 给歌词的汉字标注振假名
 */
function doRuby() {
    const lyricDiv = document.querySelector('div[class^="CoverBackgroundContainer"]');
    const lyrics = (lyricDiv ? lyricDiv : document).querySelectorAll('ul[class="lyric"] li p[_nk = "vpjX51"]');
    if (!isJapanese(lyrics))
        return;
    let longLyric = '';
    for (let i = 0; i < lyrics.length; i++) {
        if (lyrics[i].querySelector('ruby') || rubyStart)
            return;
        longLyric += lyrics[i].innerHTML + '<br>';
    }
    const isAcc = isAccompany(lyrics);
    rubyStart = true;
    fetch("https://api.kuroshiro.org/convert", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=UTF-8'
        },
        body: JSON.stringify({
            str: longLyric,
            mode: 'furigana',
        })
    })
        .then((resp) => {
            if (resp.ok) {
                return resp.json();
            } else if (resp.status == 429) {
                throw new Error("Kuroshiro: Too many request");
            } else {
                throw new Error("Kuroshiro: Something wrong");
            }
        })
        .then((result) => {
            const convertedLyric = result.result.split('<br>');
            for (let i = 0; i < convertedLyric.length; i++)
                if (lyrics[i]) {
                    let temp = convertedLyric[i];
                    temp = temp.replace(/<rp>\(<\/rp><rt>[^ぁ-ヿ]<\/rt><rp>\)<\/rp>/g, ''); // 简体中文独有汉字会把本字注音上去，需删除
                    if (!isAcc) {
                        temp = temp.replace(/<ruby>([㐀-鿿々]+?)<\/ruby>[（\(]([ぁ-ヿ]+?)[）\)]/g, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>（$2）'); // 将未能成功机器注音，但后面跟着括号注音的汉字注音
                        temp = temp.replace(/<ruby>([㐀-鿿々]+?)<rp>\(<\/rp><rt>([ぁ-ヿ]+?)<\/rt><rp>\)<\/rp><\/ruby><ruby>([㐀-鿿々]+?)<rp>\(<\/rp><rt>([ぁ-ヿ]+?)<\/rt><rp>\)<\/rp><\/ruby>[（\(]([ぁ-ヿ]+?)[）\)]/g, '<ruby>$1$3<rp>(</rp><rt>$5</rt><rp>)</rp></ruby>（$5）'); // 修改已成功机器注音，但后面跟着括号注音的两个汉字词的注音
                        temp = temp.replace(/<ruby>([㐀-鿿々]+?)<rp>\(<\/rp><rt>([ぁ-ヿ]*?)<\/rt><rp>\)<\/rp><\/ruby>[（\(]([ぁ-ヿ]+?)[）\)]/g, '<ruby>$1<rp>(</rp><rt>$3</rt><rp>)</rp></ruby>（$3）'); // 修改已成功机器注音，但后面跟着括号注音的单个汉字词的注音
                    }
                    lyrics[i].innerHTML = temp;
                }
            rubyStart = false;
        })
        .catch((err) => {
            console.error(err);
        })
}

/**
 * 取消给歌词标注振假名
 */
function removeRuby() {
    localStorage.setItem('rubyEnabled', 'false');
    rubyEnabled = false;
    const lyrics = document.querySelectorAll('ul[class="lyric"] li p[_nk = "vpjX51"]');
    lyrics[0].innerHTML = '歌词效果预览';
    lyrics[1].innerHTML = '未来（ミク）';
    lyrics[2].innerHTML = '悲しみの海に沈んだ私';
    lyrics[3].innerHTML = '目を開けるのも億劫';
}

/**
 * 将音译歌词的罗马音转换为平假名
 */
function doConvert() {
    const lyricDiv = document.querySelector('div[class^="CoverBackgroundContainer"]');
    const lyrics = (lyricDiv ? lyricDiv : document).querySelectorAll('ul[class="lyric"] li p[_nk = "vpjX53"]');
    if (!isJapanese((lyricDiv ? lyricDiv : document).querySelectorAll('ul[class="lyric"] li p[_nk = "vpjX51"]')))
        return;
    for (let i = 0; i < lyrics.length; i++) {
        lyrics[i].innerHTML = lyrics[i].innerHTML.replace(/([^a-z])/g, ' $1 ');
        const lyric = lyrics[i].innerHTML.split(' ');
        let convertedLyric = '';
        for (let j = 0; j < lyric.length; j++) {
            let lyricArr = [...lyric[j]];
            const tail = lyricArr.length - 1;
            if (lyric[j] && tail > 1 && lyricArr[0] == lyricArr[1]) {
                lyric[j] = lyric[j].substring(1);
                convertedLyric += 'っ';
            }
            let mark = false;
            if (lyric[j] && lyricArr[tail] == lyricArr[tail - 1]) {
                lyric[j] = lyric[j].substring(0, tail);
                mark = true;
            }
            convertedLyric += hiragana[lyric[j]] || lyric[j];
            if (mark)
                convertedLyric += 'ー';
        }
        lyrics[i].innerHTML = convertedLyric;
    }
}

/**
 * 取消将音译歌词的罗马音转换为平假名
 */
function removeConvert() {
    localStorage.setItem('convertEnabled', 'false');
    convertEnabled = false;
    const lyrics = document.querySelectorAll('ul[class="lyric"] li p[_nk = "vpjX53"]');
    lyrics[0].innerHTML = 'mi ku';
    lyrics[1].innerHTML = 'ka na shi mi no u mi ni shi zu n da wa ta shi';
    lyrics[2].innerHTML = 'me wo a ke ru no mo o kku u';
}

plugin.onLoad(() => {
    // 载入字体设置
    for (let i = 1; i <= 3; i++) {
        if (localStorage.getItem(`${lyricType[i]}fontEnabled`) == 'true') {
            const styleElement = document.createElement('style');
            styleElement.id = `style-${lyricType[i]}font`;
            document.querySelector('head').appendChild(styleElement);
            const font = localStorage.getItem(`${lyricType[i]}font`);
            styleElement.appendChild(document.createTextNode(`ul[class="lyric"] li p[_nk="vpjX5${i}"] { font-family: ${font} !important; }`));
        }
    }
    rubyEnabled = localStorage.getItem('rubyEnabled') != 'false';
    convertEnabled = localStorage.getItem('convertEnabled') == 'true';

    // 持续判断歌词界面是否打开
    setInterval(() => {
        const lyricOpened = document.querySelector('div[class^="CoverBackgroundContainer"]');
        if (lyricOpened) {
            if (rubyEnabled)
                doRuby();
            if (convertEnabled)
                doConvert();
        }
    }, 500);
});

plugin.onConfig(() => {
    const div = document.createElement('div');
    div.id = 'this';
    div.innerHTML = settingDiv;

    // 字体设置相关的元素
    for (let i = 1; i <= 3; i++) {
        const xxfont = div.querySelector(`#${lyricType[i]}font`);
        const xxfontCheck = div.querySelector(`#${lyricType[i]}font-check`);
        xxfont.addEventListener('change', () => changeFont(i));
        xxfontCheck.addEventListener('change', () => {
            if (xxfontCheck.checked) {
                xxfont.disabled = false;
                changeFont(i);
            } else {
                xxfont.disabled = true;
                removeFont(i);
            }
        });
        xxfont.value = localStorage.getItem(`${lyricType[i]}font`);
        xxfont.disabled = !(xxfontCheck.checked = localStorage.getItem(`${lyricType[i]}fontEnabled`) == 'true');
    }

    // 歌词效果预览界面的两个按钮
    const button = div.querySelectorAll('button');
    for (let i = 0; i < 2; i++)
        button[i].addEventListener('click', () => {
            button[i].classList.toggle('enabled');
            if (button[i].classList.contains('enabled')) {
                button[i ? 0 : 1].classList.remove('enabled');
                let lyrics = div.querySelectorAll(`ul[class="lyric"] li p[_nk="vpjX5${i + 2}"]`);
                for (let j = 0; j < lyrics.length; j++)
                    lyrics[j].style.display = '';
                lyrics = div.querySelectorAll(`ul[class="lyric"] li p[_nk="vpjX5${3 - i}"]`);
                for (let j = 0; j < lyrics.length; j++)
                    lyrics[j].style.display = 'none';
            } else {
                let lyrics = div.querySelectorAll(`ul[class="lyric"] li p[_nk="vpjX5${i + 2}"]`);
                for (let j = 0; j < lyrics.length; j++)
                    lyrics[j].style.display = 'none';
            }
        });

    // 歌词效果预览界面的歌词
    const lyrics = div.querySelectorAll('ul[class="lyric"] li');
    for (let i = 0; i < lyrics.length; i++)
        lyrics[i].addEventListener('click', () => {
            for (let j = 0; j < lyrics.length; j++)
                lyrics[j].classList.remove('present');
            lyrics[i].classList.add('present');
        });

    // 振假名字号相关的元素
    const size = div.querySelector('#size');
    size.value = localStorage.getItem('furisize') || 50;
    const rangeNum = div.querySelector('#range-num');
    rangeNum.innerHTML = size.value + '%';
    const changeSize = function () {
        rangeNum.innerHTML = size.value + '%';
        let styleElement = document.querySelector(`#style-furisize`);
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = `style-furisize`;
            document.querySelector('head').appendChild(styleElement);
        }
        styleElement.innerHTML = `ul[class="lyric"] li p[_nk="vpjX51"] rt { font-size: ${rangeNum.innerHTML} !important; }`;
        localStorage.setItem('furisize', size.value);
    }
    changeSize();
    size.addEventListener('change', changeSize);

    // 振假名标注相关的元素
    const ruby = div.querySelector('#ruby');
    ruby.checked = rubyEnabled;
    ruby.addEventListener('change', () => {
        if (ruby.checked) {
            localStorage.setItem('rubyEnabled', 'true');
            rubyEnabled = true;
            doRuby();
        } else {
            removeRuby();
        }
    });

    // 罗马音转假名相关的元素
    const convert = div.querySelector('#convert');
    convert.checked = convertEnabled;
    const checkConvert = () => {
        if (convert.checked) {
            localStorage.setItem('convertEnabled', 'true');
            convertEnabled = true;
            doConvert();
        } else {
            removeConvert();
        }
    };
    convert.addEventListener('change', checkConvert);
    button[1].addEventListener('click', checkConvert);

    if (rubyEnabled) {
        const lyrics = div.querySelectorAll('ul[class="lyric"] li p[_nk="vpjX51"]');
        lyrics[0].innerHTML = '<ruby>歌<rp>(</rp><rt>うた</rt><rp>)</rp></ruby><ruby>词</ruby><ruby>效</ruby><ruby>果<rp>(</rp><rt>はて</rt><rp>)</rp></ruby><ruby>预</ruby><ruby>览</ruby>';
        lyrics[1].innerHTML = '<ruby>未来<rp>(</rp><rt>ミク</rt><rp>)</rp></ruby>（ミク）';
        lyrics[2].innerHTML = '<ruby>悲<rp>(</rp><rt>かな</rt><rp>)</rp></ruby>しみの<ruby>海<rp>(</rp><rt>うみ</rt><rp>)</rp></ruby>に<ruby>沈<rp>(</rp><rt>しず</rt><rp>)</rp></ruby>んだ<ruby>私<rp>(</rp><rt>わたし</rt><rp>)</rp></ruby>';
        lyrics[3].innerHTML = '<ruby>目<rp>(</rp><rt>め</rt><rp>)</rp></ruby>を<ruby>開<rp>(</rp><rt>あ</rt><rp>)</rp></ruby>けるのも<ruby>億劫<rp>(</rp><rt>おっくう</rt><rp>)</rp></ruby>';
    }
    return div;
});