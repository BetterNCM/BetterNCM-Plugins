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
            color: black;
            width: 512px;
        }
    </style>
    <div id="example">
        <div id="lyrics">
            <ul class="lyric">
                <li class="present">
                    <p _nk="vpjX51">预览</p>
                </li>
                <li>
                    <p _nk="vpjX51"><ruby>悲<rp>(</rp><rt>かな</rt><rp>)</rp></ruby>しみの<ruby>海<rp>(</rp><rt>うみ</rt><rp>)</rp></ruby>に<ruby>沈<rp>(</rp><rt>しず</rt><rp>)</rp></ruby>んだ<ruby>私<rp>(</rp><rt>わたし</rt><rp>)</rp></ruby></p>
                </li>
                <li>
                    <p _nk="vpjX51"><ruby>目<rp>(</rp><rt>め</rt><rp>)</rp></ruby>を<ruby>開<rp>(</rp><rt>あ</rt><rp>)</rp></ruby>けるのも<ruby>億劫<rp>(</rp><rt>おっくう</rt><rp>)</rp></ruby></p>
                </li>
            </ul>
        </div>
    </div>
    <br><br>
    <p>
        注意：不支持修改桌面歌词！对于“类苹果歌词”“RefinedNowPlaying”插件的兼容尚不完善，尚未适配逐字歌词
        <br><br>
    </p>
    <p>
        <input type="checkbox" id="ruby">
        <label for="ruby">给汉字标注振假名</label>
        <span><br>本功能依赖kuromoji的在线API，需要联网。注音准确率有限，仅供参考</span>
        <br><br>
    </p>
    <p>
        <label for="size">振假名相对于汉字的字号<br></label>
        <label id="range-num" for="size"></label>
        <input type="range" id="size" value="50" min="10" max="100" step="1">
        <br><br>
    </p>
    <p>
        <span>字体格式示例：<br>'Yu Gothic UI', 'Microsoft YaHei UI'</span>
        <br>
    </p>
    <p>
        <input type="checkbox" id="jpnfont-check">
        <label for="jpnfont-check">更改歌词字体<br></label>
        <input type="text" id="jpnfont">
        <br><br>
    </p>
`;

let rubyEnabled, rubyStart, cache = new Map();

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
 * 改变歌词的字体
*/
function changeFont() {
    const font = document.querySelector(`#jpnfont`).value;
    let styleElement = document.querySelector(`#style-jpnfont`);
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = `style-jpnfont`;
        document.querySelector('head').appendChild(styleElement);
    }
    const lyricSelector = 'ul[class="lyric"] li p[_nk="vpjX51"], li[class^="sc-fzocqA glbESi"] p:first-child, div[class^="j-line"] p[class="lyric-next-p f-ust f-ust-1"]:first-child, div[class="amll-lyric-player-wrapper"] div[class^="lyricPlayer"] div[class^="lyricMainLine"], div[class^="rnp-lyrics"] div[class^="rnp-lyrics-line"] div[class^="rnp-lyrics-line-karaoke"], div[class^="rnp-lyrics"] div[class^="rnp-lyrics-line"] div[class^="rnp-lyrics-line-original"]';
    styleElement.innerHTML = `${lyricSelector} { font-family: ${font} !important; }`;
    localStorage.setItem(`jpnfont`, font);
    localStorage.setItem(`jpnfontEnabled`, 'true');
}

/**
 * 移除歌词的自定义字体
*/
function removeFont() {
    const head = document.querySelector('head');
    const styleElement = head.querySelector(`#style-jpnfont`);
    head.removeChild(styleElement);
    localStorage.setItem(`jpnfontEnabled`, 'false');
}

/**
 * 给歌词的汉字标注振假名
 */
function doRuby() {
    if (rubyStart)
        return;
    const lyricDiv = document.querySelector('div[class="amll-lyric-player-wrapper"]') || document.querySelector('div[class="lyric"] div[class^="rnp-lyrics"]') || document.querySelector('div[class^="lyric-bar-inner"]') || document.querySelector('ul[class^="sc-AxjAm sc-AxirZ"]') || document.querySelector('div[class^="sc-fzoaKM hNuJKS"]') || document.querySelector('div[class^="CoverBackgroundContainer"]');
    let lyrics = (lyricDiv ? lyricDiv : document).querySelectorAll('ul[class="lyric"] li p[_nk = "vpjX51"]');
    if (!lyrics.length)
        lyrics = lyricDiv.querySelectorAll('div[class^="lyricPlayer"] div[class^="lyricMainLine"]');
    if (!lyrics.length)
        lyrics = lyricDiv.querySelectorAll('div[class^="rnp-lyrics-line"] div[class^= "rnp-lyrics-line-original"]');
    if (!lyrics.length)
        lyrics = lyricDiv.querySelectorAll('li[class^="sc-fzocqA glbESi"] p:first-child');
    if (!lyrics.length)
        lyrics = lyricDiv.querySelectorAll('div[class^="j-line"] p[class="lyric-next-p f-ust f-ust-1"]:first-child');
    if (!isJapanese(lyrics))
        return;
    for (let i = lyrics.length - 1; i > 0; i--)
        if (lyrics[i].querySelector('ruby'))
            return;
    lyrics[0].innerHTML = lyrics[0].innerHTML.replace(/<ruby>([㐀-鿿々]+?)<rp>\(<\/rp><rt>([ぁ-ヿ]*?)<\/rt><rp>\)<\/rp><\/ruby>/g, '$1');
    rubyStart = true;
    let longLyric = '';
    for (let i = 0; i < lyrics.length; i++)
        longLyric += lyrics[i].innerHTML + '\n';
    const isAcc = isAccompany(lyrics);
    const process = function (result) {
        const convertedLyric = result.split('\n');
        for (let i = 0; i < convertedLyric.length; i++)
            if (lyrics[i]) {
                let temp = convertedLyric[i];
                temp = temp.replace(/<rp>\(<\/rp><rt>[^ぁ-ヿ]<\/rt><rp>\)<\/rp>/g, ''); // 简体中文独有汉字会把本字注音上去，需删除
                if (!isAcc) {
                    temp = temp.replace(/<ruby>([㐀-鿿々]+?)<\/ruby>[（\(]([ぁ-ヿ]+?)[）\)]/g, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>（$2）'); // 将未能成功机器注音，但后面跟着括号注音的汉字注音
                    // temp = temp.replace(/<ruby>([㐀-鿿々]+?)<rp>\(<\/rp><rt>([ぁ-ヿ]+?)<\/rt><rp>\)<\/rp><\/ruby><ruby>([㐀-鿿々]+?)<rp>\(<\/rp><rt>([ぁ-ヿ]+?)<\/rt><rp>\)<\/rp><\/ruby>[（\(]([ぁ-ヿ]+?)[）\)]/g, '<ruby>$1$3<rp>(</rp><rt>$5</rt><rp>)</rp></ruby>（$5）'); // 修改已成功机器注音，但后面跟着括号注音的两个汉字词的注音
                    // temp = temp.replace(/<ruby>([㐀-鿿々]+?)<rp>\(<\/rp><rt>([ぁ-ヿ]*?)<\/rt><rp>\)<\/rp><\/ruby>[（\(]([ぁ-ヿ]+?)[）\)]/g, '<ruby>$1<rp>(</rp><rt>$3</rt><rp>)</rp></ruby>（$3）'); // 修改已成功机器注音，但后面跟着括号注音的单个汉字词的注音
                    temp = temp.replace(/<ruby>([㐀-鿿々]+?)<rp>\(<\/rp><rt>([ぁ-ヿ]*?)<\/rt><rp>\)<\/rp><\/ruby>[（\(]([ぁ-ヿ]+?)[）\)]/g, '$1（$3）'); // 临时 删除已成功机器注音，但后面跟着括号注音的单个汉字词的注音
                    temp = temp.replaceAll('<ruby>一<rp>(</rp><rt>いち</rt><rp>)</rp></ruby><ruby>人<rp>(</rp><rt>にん</rt><rp>)</rp></ruby>', '<ruby>一人<rp>(</rp><rt>ひとり</rt><rp>)</rp></ruby>'); // 改正特定词的发音 功能测试start
                    temp = temp.replaceAll('<ruby>二<rp>(</rp><rt>に</rt><rp>)</rp></ruby><ruby>人<rp>(</rp><rt>にん</rt><rp>)</rp></ruby>', '<ruby>二人<rp>(</rp><rt>ふたり</rt><rp>)</rp></ruby>'); // 改正特定词的发音 功能测试end
                }
                lyrics[i].innerHTML = temp;
            }
    }
    const value = cache.get(longLyric);
    if (value) {
        process(value);
        rubyStart = false;
        return;
    }
    const raw = longLyric;
    const replaceChars = [['词', '詞'], ['编', '編']]; // 简中汉字替换日标汉字 功能测试start
    for (const chr of replaceChars)
        longLyric = longLyric.replaceAll(chr[0], chr[1]); // 简中汉字替换日标汉字 功能测试end
    fetch("https://convert-kuromoji-xhbfvqbgdc.cn-shenzhen.fcapp.run", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=UTF-8'
        },
        body: JSON.stringify({
            str: longLyric,
            mode: 'furigana',
            to: 'hiragana',
            romajiSystem: 'hepburn'
        })
    })
        .then((resp) => {
            if (resp.ok) {
                return resp.json();
            } else {
                console.error(`Furigana: Response Error, code ${resp.status}`);
                rubyStart = false;
            }
        })
        .then((result) => {
            process(result);
            cache.set(raw, result);
            rubyStart = false;
        })
        .catch((err) => {
            console.error('Furigana:\n' + err);
            rubyStart = false;
        })
}

/**
 * 取消给歌词标注振假名
 */
function removeRuby() {
    localStorage.setItem('rubyEnabled', 'false');
    rubyEnabled = false;
    const head = document.querySelector('head');
    const styleElement = head.querySelector(`#furigana-fit`);
    head.removeChild(styleElement);
}

plugin.onLoad(() => {
    // 载入字体设置
    if (localStorage.getItem(`jpnfontEnabled`) == 'true') {
        const styleElement = document.createElement('style');
        styleElement.id = `style-jpnfont`;
        document.querySelector('head').appendChild(styleElement);
        const font = localStorage.getItem(`jpnfont`);
        const lyricSelector = 'ul[class="lyric"] li p[_nk="vpjX51"], li[class^="sc-fzocqA glbESi"] p:first-child, div[class^="j-line"] p[class="lyric-next-p f-ust f-ust-1"]:first-child, div[class="amll-lyric-player-wrapper"] div[class^="lyricPlayer"] div[class^="lyricMainLine"], div[class^="rnp-lyrics"] div[class^="rnp-lyrics-line"] div[class^="rnp-lyrics-line-karaoke"], div[class^="rnp-lyrics"] div[class^="rnp-lyrics-line"] div[class^="rnp-lyrics-line-original"]';
        styleElement.appendChild(document.createTextNode(`${lyricSelector} { font-family: ${font} !important; }`));
    }
    rubyEnabled = localStorage.getItem('rubyEnabled') != 'false';
    let styleElement = document.querySelector('#furigana-fit');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'furigana-fit';
        document.querySelector('head').appendChild(styleElement);
    }
    styleElement.innerHTML = '.lyricMainLine-0-1-5 { margin-top: auto !important; }';

    // 持续判断歌词界面是否打开
    setInterval(() => {
        const lyricOpened = document.querySelector('div[class="amll-lyric-player-wrapper"]') || document.querySelector('div[class^="rnp-lyrics"]') || document.querySelector('ul[class^="sc-AxjAm sc-AxirZ"]') || document.querySelector('div[class^="sc-fzoaKM hNuJKS"]') || document.querySelector('div[class^="CoverBackgroundContainer"]');
        if (lyricOpened) {
            if (rubyEnabled)
                doRuby();
        }
    }, 500);
});

plugin.onConfig(() => {
    const div = document.createElement('div');
    div.id = 'this';
    div.innerHTML = settingDiv;

    // 字体设置相关的元素
    const jpnfont = div.querySelector(`#jpnfont`);
    const jpnfontCheck = div.querySelector(`#jpnfont-check`);
    jpnfont.addEventListener('change', () => changeFont());
    jpnfontCheck.addEventListener('change', () => {
        if (jpnfontCheck.checked) {
            jpnfont.disabled = false;
            changeFont();
        } else {
            jpnfont.disabled = true;
            removeFont();
        }
    });
    jpnfont.value = localStorage.getItem(`jpnfont`);
    jpnfont.disabled = !(jpnfontCheck.checked = localStorage.getItem(`jpnfontEnabled`) == 'true');

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
        styleElement.innerHTML = `rt { font-size: ${rangeNum.innerHTML} !important; }`;
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
            let styleElement = document.querySelector('#furigana-fit');
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = 'furigana-fit';
                document.querySelector('head').appendChild(styleElement);
            }
            styleElement.innerHTML = '.lyricMainLine-0-1-5 { margin-top: auto !important; }';
        } else {
            removeRuby();
        }
    });
    return div;
});