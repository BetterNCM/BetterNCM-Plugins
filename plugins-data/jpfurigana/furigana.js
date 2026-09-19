/*
 * furigana.js —— 纯文本层：把一行日语文本切成「注音片段」
 *
 * 不依赖 DOM，也不依赖 BetterNCM，方便用 node 单独跑测试
 * （见 tools/test-furigana.js）。
 *
 * 输出的片段形如：
 *   { text: 'は' }                       普通文本
 *   { text: '漢字', rt: 'かんじ', at: 3 } 需要注音的文本，at 是在整行里的起始下标
 */
(function (root, factory) {
	const api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.FuriganaCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
	'use strict';

	// 汉字（含「々」「〇」和兼容区），不含假名
	const KANJI = '々〇一-鿿㐀-䶿豈-﫿';
	const RE_HAS_KANJI = new RegExp('[' + KANJI + ']');
	const RE_KANJI_HEAD = new RegExp('^[' + KANJI + ']+');
	const RE_NOT_KANJI_HEAD = new RegExp('^[^' + KANJI + ']+');
	// 平假名 + 片假名 + 长音符
	const RE_HAS_KANA = /[ぁ-ゖァ-ヺ]/;
	const RE_HAS_KANA_OR_LONG = /[ぁ-ゖァ-ヺーｰ]/;
	// 词典读不出、音译里却有读音的字符
	const RE_UNREADABLE = new RegExp('[A-Za-z0-9Ａ-Ｚａ-ｚ０-９' + KANJI + ']');
	// 一串英文/数字（中间可以夹空格和常见标点）
	const LATIN = 'A-Za-z0-9Ａ-Ｚａ-ｚ０-９';
	const RE_LATIN_RUN = new RegExp(`[${LATIN}](?:[${LATIN}\\s'’.,!?&\\-]*[${LATIN}])?`, 'g');
	// 歌词里的括号：作词者自带的注音「漢字（かな）」，或者和声、注释
	// 底字可以带前导数字：「10年後(じゅうねんご)」
	const RE_INLINE_RUBY = new RegExp(`([0-9０-９]*[${KANJI}]+)[（(]([ぁ-ゖァ-ヺー・]+)[）)]`, 'g');
	const RE_PAREN = /[（(][^（）()]*[）)]/g;

	function toHiragana(s) {
		return s.replace(/[ァ-ヶ]/g, (c) =>
			String.fromCharCode(c.charCodeAt(0) - 0x60)
		);
	}

	function toKatakana(s) {
		return s.replace(/[ぁ-ゖ]/g, (c) =>
			String.fromCharCode(c.charCodeAt(0) + 0x60)
		);
	}

	function escapeRe(s) {
		return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	/** 把 surface 按「汉字段 / 非汉字段」切开 */
	function splitRuns(surface) {
		const runs = [];
		let rest = surface;
		while (rest) {
			const m = RE_KANJI_HEAD.exec(rest) || RE_NOT_KANJI_HEAD.exec(rest);
			runs.push({ text: m[0], kanji: RE_HAS_KANJI.test(m[0][0]) });
			rest = rest.slice(m[0].length);
		}
		return runs;
	}

	/**
	 * 把一个词的读音按送假名切分对齐到各个汉字段。
	 * 例：surface="持ち帰る" reading="モチカエル"
	 *     → [{持,モチ→もち}, ち, {帰,カエ→かえ}, る]
	 * 对不上就返回 null，由调用方降级成「整词注音」。
	 */
	function alignReading(surface, reading) {
		const runs = splitRuns(surface);
		if (runs.length === 1) return runs[0].kanji ? [{ run: 0, rt: reading }] : [];

		let pattern = '^';
		const kanjiRunIdx = [];
		for (let i = 0; i < runs.length; i++) {
			const r = runs[i];
			if (r.kanji) {
				pattern += '(.+?)';
				kanjiRunIdx.push(i);
			} else {
				// 送假名部分统一用片假名比对；长音符两种写法都允许
				pattern += escapeRe(toKatakana(r.text)).replace(/ー/g, '[ーｰウ]');
			}
		}
		pattern += '$';

		let m;
		try {
			m = new RegExp(pattern).exec(toKatakana(reading));
		} catch (e) {
			return null;
		}
		if (!m) return null;

		return kanjiRunIdx.map((runIndex, i) => ({ run: runIndex, rt: m[i + 1] }));
	}

	// ---------------------------------------------------------------- 官方音译

	// 网易云的「音译」是按拍拆开的罗马字（愛する → "a i su ru"），
	// 逐拍转回假名就得到整行的真实读音——歌手故意改读的地方也照实反映。
	const ROMAJI = {
		a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
		ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
		ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
		sa: 'さ', shi: 'し', si: 'し', su: 'す', se: 'せ', so: 'そ',
		za: 'ざ', ji: 'じ', zi: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
		ta: 'た', chi: 'ち', ti: 'ち', tsu: 'つ', tu: 'つ', te: 'て', to: 'と',
		da: 'だ', di: 'ぢ', du: 'づ', de: 'で', deo: 'で', do: 'ど',
		na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
		ha: 'は', hi: 'ひ', fu: 'ふ', hu: 'ふ', he: 'へ', ho: 'ほ',
		ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
		pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
		ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
		ya: 'や', yu: 'ゆ', yo: 'よ', ye: 'いぇ',
		ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
		wa: 'わ', wo: 'を', wi: 'うぃ', we: 'うぇ',
		n: 'ん', m: 'ん',
		kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ', kye: 'きぇ',
		gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
		sha: 'しゃ', shu: 'しゅ', sho: 'しょ', she: 'しぇ',
		sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
		ja: 'じゃ', ju: 'じゅ', jo: 'じょ', je: 'じぇ',
		jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ', zya: 'じゃ',
		cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', che: 'ちぇ',
		tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ',
		nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
		hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
		bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
		pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
		mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
		rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
		fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
		va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
		tsa: 'つぁ', tse: 'つぇ', tso: 'つぉ',
	};
	const ROMAJI_MAX = 3;
	// 音译里认不出的拍；不在假名区，toKatakana / toHiragana 都不会动它
	const UNKNOWN = '〓';

	/**
	 * 罗马字 → 平假名。认不出的拍（音译里夹着的英文单词、数字）换成占位符 UNKNOWN，
	 * 连续的几个合成一个，由 segmentsFromReading 和原文里的英文/数字对上；
	 * 一个假名都转不出来才返回 null。
	 */
	function romajiToKana(input) {
		// 网易云的音译按拍用空格隔开，要逐拍转换：先拼起来的话 "ne n yo"（年よ）
		// 变成 "nenyo"，会被贪婪匹配成 ne + nyo → ねにょ
		let out = '';
		let known = false;
		// 拍内的 n' 同样是边界："re n'a i"（恋愛）里的 n'a 是 ん + あ
		for (const syl of String(input).toLowerCase().split(/[\s　]+|(?<=n)['’]/)) {
			const kana = sylToKana(syl);
			if (kana == null) {
				if (!out.endsWith(UNKNOWN)) out += UNKNOWN;
				continue;
			}
			if (kana) known = true;
			out += kana;
		}
		return known ? out : null;
	}

	function sylToKana(syl) {
		// 标点、符号（～ ♪ 之类）在音译里没有读音；数字留着，转不出来会变成占位符
		const s = syl.replace(/[^a-z0-9\-－ー]/g, '');
		let out = '';
		let i = 0;
		while (i < s.length) {
			let hit = false;
			for (let len = Math.min(ROMAJI_MAX, s.length - i); len >= 1; len--) {
				const kana = ROMAJI[s.substr(i, len)];
				if (kana) {
					out += kana;
					i += len;
					hit = true;
					break;
				}
			}
			if (hit) continue;

			const c = s[i];
			// 促音：tte → って（n 不算，"nna" 是 ん + な）
			// tcha → っちゃ（ch 开头的拍，促音写成 t）
			if (
				(c === s[i + 1] && /[a-z]/.test(c) && c !== 'n' && !'aiueo'.includes(c)) ||
				(c === 't' && s[i + 1] === 'c')
			) {
				out += 'っ';
				i++;
				continue;
			}
			if (c === '-' || c === '－' || c === 'ー') {
				out += 'ー';
				i++;
				continue;
			}
			return null; // 夹了英文单词之类
		}
		return out;
	}

	// ---------------------------------------------------- LRC（官方音译接口）

	const RE_LRC_LINE = /^((?:\[\d+:\d+(?:[.:]\d+)?\])+)(.*)$/;
	const RE_LRC_STAMP = /\[(\d+):(\d+(?:[.:]\d+)?)\]/g;

	/** 解析 LRC，一行多个时间戳会展开成多条。返回按时间排序的 {time(ms), text} */
	function parseLrc(src) {
		const out = [];
		for (const raw of String(src || '').split('\n')) {
			const m = RE_LRC_LINE.exec(raw.trim());
			if (!m) continue;
			const text = m[2].trim();
			if (!text) continue;
			RE_LRC_STAMP.lastIndex = 0;
			let s;
			while ((s = RE_LRC_STAMP.exec(m[1]))) {
				const sec = parseFloat(s[2].replace(':', '.'));
				out.push({ time: Math.round((parseInt(s[1], 10) * 60 + sec) * 1000), text });
			}
		}
		return out.sort((a, b) => a.time - b.time);
	}

	/**
	 * 歌词文本作为 map 键：去掉所有空白，DOM 和 LRC 的空格处理不完全一致。
	 * 注意 \s 必须保留——网易云 2.x 的歌词里用的是 &nbsp; (U+00A0)，
	 * JS 的 \s 包含它，换成 [ ] 或 \x20 就会导致 2.x 上查不到音译。
	 */
	function lyricKey(text) {
		return String(text || '').replace(/\s+/g, '');
	}

	// 歌词开头的制作信息行。网易云把它们和歌词混在同一个列表里，而且多半是中文，
	// 「作词: 大原ゆい子」这种既有中文汉字又有假名，光看假名判断不掉。
	// 同样地，2.x 的分隔符是 &nbsp;，靠 \s 才能匹配上。
	const RE_CREDIT =
		/^\s*[[［(（]?\s*(作词|作詞|作曲|编曲|編曲|填词|填詞|制作|製作|出品|监制|監製|录音|錄音|混音|母带|母帶|演唱|歌手|原唱|翻唱|伴唱|和声|和聲|吉他|贝斯|貝斯|键盘|鍵盤|弦乐|弦樂|策划|策劃|统筹|統籌|发行|發行|企划|企劃|词|詞|曲|编|編|唱|OP|SP|ED|MIX|Mixing|Master(?:ing)?|Produce[rd]?|Vocals?|Chorus|Compose[rd]?|Lyric(?:s|ist)?|Arrange(?:r|ment|d)?|Guitars?|Bass|Drums?|Piano|Strings|Recording|Label|Illustration|Movie)\s*(?:人|者)?\s*(?:[:：]|\s+by\s+)/i;

	function isCreditLine(text) {
		return RE_CREDIT.test(String(text || ''));
	}

	/**
	 * 把官方 lrc 和 romalrc 按时间戳配对，得到「原文 → 音译」。
	 * 这样查表用的是歌词文本本身，即使歌曲 id 猜错了也只是查不到、不会串词。
	 */
	function buildRomajiMap(lrcSrc, romajiSrc, toleranceMs) {
		const tolerance = toleranceMs == null ? 300 : toleranceMs;
		const lrc = parseLrc(lrcSrc);
		const roma = parseLrc(romajiSrc);
		const map = new Map();
		if (!lrc.length || !roma.length) return map;

		const used = new Set();
		const take = (line, exactOnly) => {
			let best = -1;
			let bestDiff = Infinity;
			for (let i = 0; i < roma.length; i++) {
				if (used.has(i)) continue;
				const diff = Math.abs(roma[i].time - line.time);
				if (exactOnly ? diff !== 0 : diff > tolerance) continue;
				if (diff < bestDiff) {
					bestDiff = diff;
					best = i;
				}
			}
			if (best < 0) return null;
			used.add(best);
			return roma[best].text;
		};

		// 先做精确匹配，剩下的再按容差找最近的，避免近似匹配抢掉本该精确配对的行
		const pending = [];
		for (const line of lrc) {
			const hit = take(line, true);
			if (hit == null) pending.push(line);
			else addTo(map, line.text, hit);
		}
		for (const line of pending) {
			const hit = take(line, false);
			if (hit != null) addTo(map, line.text, hit);
		}
		return map;
	}

	function addTo(map, text, romaji) {
		const key = lyricKey(text);
		if (key && !map.has(key)) map.set(key, romaji);
	}

	/**
	 * 把原文里的一段假名做成正则锚点。
	 * 音译写的是读音：助词 は→wa、へ→e、を→o，还原成假名后和原文的字形对不上，
	 * 所以这几个字要同时接受两种写法。标点和空格在音译里没有对应，直接去掉。
	 * latin 为真时，原文里的英文/数字串对应音译里的占位符 UNKNOWN，两边允许夹着假名
	 * ——英文里恰好像罗马字的部分（no、to、into）会被音译转成假名。
	 */
	function looseAnchorPattern(text, latin) {
		let src = toKatakana(text);
		if (latin) src = src.replace(RE_LATIN_RUN, UNKNOWN);
		const kana = src.replace(/[^ァ-ヺーｰ〓]/g, '');
		if (!kana) return '';
		return escapeRe(kana)
			// 外来语的ディ/ティ，音译写 di/ti，转回来是ヂ/チ
			.replace(/([デテ])ィ/g, (_, c) => (c === 'デ' ? '(?:ディ|ヂ)' : '(?:ティ|チ)'))
			// 小写假名音译里常写成大写的（くせぇ → se e，ぎゅっ → gi yu）
			.replace(/[ァィゥェォャュョ]/g, (c) => `[${c}${String.fromCharCode(c.charCodeAt(0) + 1)}]`)
			// 促音音译里有时会漏掉
			.replace(/ッ/g, 'ッ?')
			.replace(/ハ/g, '[ハワ]')
			.replace(/ヘ/g, '[ヘエ]')
			.replace(/ヲ/g, '[ヲオ]')
			.replace(/ヂ/g, '[ヂジ]')
			.replace(/ヅ/g, '[ヅズ]')
			.replace(/ー/g, '[ーｰアイウエオ]')
			.replace(/〓+/g, `[ァ-ヺーｰ${UNKNOWN}]*${UNKNOWN}[ァ-ヺーｰ${UNKNOWN}]*`);
	}

	/**
	 * 把整行读音切给「锚点 / 空档」序列。锚点必须命中（长度不一定固定），空档至少一个字符。
	 * 能切的方式不止一种时（昨日の → キノウノ，第一个 ノ 也能当锚点），
	 * 选各空档长度与词典读音长度偏差之和最小的；并列时取靠前空档更短的，
	 * 和原先懒惰匹配的倾向一致。切不开返回 null。
	 */
	function splitReading(parts, reading) {
		const n = reading.length;
		// best[i][p]：从 parts[i] 起、读音从 p 起匹配到结尾的最小代价
		const best = [];
		const pick = [];
		for (let i = parts.length; i >= 0; i--) {
			best[i] = new Array(n + 1).fill(Infinity);
			pick[i] = new Array(n + 1).fill(-1);
			for (let p = 0; p <= n; p++) {
				if (i === parts.length) {
					if (p === n) best[i][p] = 0;
					continue;
				}
				const part = parts[i];
				if (part.full) {
					// 长度不定的锚点（夹英文的），每种长度都试
					for (let len = 0; p + len <= n; len++) {
						if (best[i + 1][p + len] >= best[i][p] || !part.full.test(reading.substr(p, len))) continue;
						best[i][p] = best[i + 1][p + len];
						pick[i][p] = len;
					}
					continue;
				}
				if (part.re) {
					part.re.lastIndex = p;
					const m = part.re.exec(reading);
					if (m) {
						best[i][p] = best[i + 1][p + m[0].length];
						pick[i][p] = m[0].length;
					}
					continue;
				}
				for (let len = 1; p + len <= n; len++) {
					const c = Math.abs(len - part.want) + best[i + 1][p + len];
					if (c < best[i][p]) {
						best[i][p] = c;
						pick[i][p] = len;
					}
				}
			}
		}
		if (best[0][0] === Infinity) return null;

		const out = [];
		for (let i = 0, p = 0; i < parts.length; i++) {
			const len = pick[i][p];
			if (!parts[i].re && !parts[i].full) out.push(reading.substr(p, len));
			p += len;
		}
		return out;
	}

	/**
	 * 一段读音要分给多个汉字块时，用词典读音的长度来定边界。
	 * 分不开返回 null（调用方保留这一段的词典读音）。
	 */
	function distributeReading(items, capture) {
		if (items.length === 1) return [capture];

		const lens = items.map((it) => toKatakana(it.rt).length);
		const total = lens.reduce((a, b) => a + b, 0);
		if (total === capture.length) {
			const out = [];
			let p = 0;
			for (const n of lens) {
				out.push(capture.substr(p, n));
				p += n;
			}
			return out;
		}

		// 长度对不上（歌手改读了某个词）就从右往左剥：
		// 末尾那些词多是动词词干，词典读音一般是规则的
		const out = new Array(items.length);
		let rest = capture;
		for (let k = items.length - 1; k >= 1; k--) {
			const r = toKatakana(items[k].rt);
			if (rest.length <= r.length || !rest.endsWith(r)) return null;
			out[k] = r;
			rest = rest.slice(0, rest.length - r.length);
		}
		if (!rest) return null;
		out[0] = rest;
		return out;
	}

	/**
	 * 四つ仮名 / 小写假名还原。罗马字里 ジ/ヂ 都写 ji、ズ/ヅ 都写 zu，音译转回假名只能得到
	 * ジ/ズ，词典读音却是分得清的（続ける→ツヅケル、散り散り→チリヂリ）。
	 * 两串等长时按位把词典的 ヂ/ヅ 补回去，其余位置仍以音译为准。
	 * 长度不等说明读音真被改过，位置对不上，整段听音译。
	 */
	function restoreFromDict(dictRt, officialRt) {
		const dict = toKatakana(dictRt);
		if (dict.length !== officialRt.length) return officialRt;
		let out = '';
		for (let i = 0; i < officialRt.length; i++) {
			const o = officialRt[i];
			const d = dict[i];
			out += (o === 'ジ' && d === 'ヂ') || (o === 'ズ' && d === 'ヅ') || SMALL_KANA[d] === o ? d : o;
		}
		return out;
	}

	// 音译常把拗音拆成两拍写（逆転 → gi ya ku te n），转回来是大写的 ヤ
	const SMALL_KANA = { ャ: 'ヤ', ュ: 'ユ', ョ: 'ヨ', ァ: 'ア', ィ: 'イ', ゥ: 'ウ', ェ: 'エ', ォ: 'オ' };

	// 网易云机器音译的已知错误：「今日は」被当成问候语转成 ko n ni chi ha
	const OFFICIAL_REJECT = { 今日: 'コンニチ' };

	/**
	 * 分到手的音译读音能不能用。歌手重复演唱时音译会多出一截，
	 * 比如「僕」拿到 ボクボク、「謳」拿到 アイヲウタ（前面的「愛を」唱了两遍），
	 * 这种首尾就是词典读音、长度却翻倍的，当作串了词，留词典读音。
	 */
	function plausibleOfficial(text, dict, official) {
		if (OFFICIAL_REJECT[text] === official) return false;
		if (official === dict) return true;
		// 数 + 助数词：机器音译常把助数词读成训读（9人 → きゅうひと），结尾对不上助数词的就不要
		const counter = RE_NUMBER.test(text.slice(0, -1)) && COUNTERS[text.slice(-1)];
		if (counter) {
			const ends = [dict, counter.r, counter.p, counter.n, ...Object.values(counter.whole || {})];
			if (!ends.some((r) => r && r.slice(-1) === official.slice(-1))) return false;
		}
		const repeated =
			official.length >= dict.length * 2 && (official.startsWith(dict) || official.endsWith(dict));
		return !repeated;
	}

	/**
	 * 已知整行真实读音（来自官方音译）时，把它分配到词典给出的结构上：
	 * **词典负责断词，音译负责读音**。
	 *
	 * 只按原文的汉字/假名切段是不够的——「昨夜言ってた」里 `昨夜言` 三个汉字连着，
	 * 会被当成一个整体，整段读音糊在上面变成 `昨夜言(ゆうべい)`。所以结构取自词典
	 * 分词结果（`昨夜` / `言`），再用词典读音的长度把音译片段切开。
	 *
	 * 依次尝试几种对法，第一个成功的为准：
	 *   - 原文的英文/数字对音译里的占位符（音译里有占位符才试），不行再当作读不出的字
	 *   - 括号里的内容算进音译；不行再整个跳过（音译常常不带和声那一段）
	 *
	 * @param {string} text          歌词原文
	 * @param {string} reading       整行读音（假名，可以带 UNKNOWN 占位符）
	 * @param {Array}  dictSegments  tokensToSegments 的结果，只读
	 */
	function segmentsFromReading(text, reading, dictSegments, opts) {
		opts = opts || {};
		if (!RE_HAS_KANJI.test(text) || !dictSegments || !dictSegments.length) return null;
		const kanaFn = opts.kana === 'katakana' ? toKatakana : toHiragana;
		reading = toKatakana(reading);

		// 作词者自带注音的括号已经是 hidden 片段，不算在内
		const masked = dictSegments.map((s) => (s.hidden ? ' '.repeat(s.text.length) : s.text)).join('');
		const parens = [...masked.matchAll(RE_PAREN)].map((m) => [m.index, m.index + m[0].length]);

		for (const skipParen of parens.length ? [false, true] : [false]) {
			for (const latin of reading.includes(UNKNOWN) ? [true, false] : [false]) {
				const segs = fillFromReading(dictSegments, reading, skipParen ? parens : [], latin);
				if (!segs) continue;
				for (const s of segs) if (s.rt) s.rt = kanaFn(toKatakana(s.rt));
				return segs;
			}
		}
		return null;
	}

	/**
	 * 复制片段并在 cuts 处切开，每片记下起始下标 start。
	 * 带注音的片段是纯汉字，括号不会切到它们，所以只切不带注音的。
	 */
	function copySegments(segments, cuts) {
		const out = [];
		let pos = 0;
		for (const s of segments) {
			const start = pos;
			pos += s.text.length;
			const inner = s.rt || s.hidden ? [] : cuts.filter((c) => c > start && c < pos).sort((x, y) => x - y);
			let from = start;
			for (const c of [...new Set(inner), pos]) {
				out.push(Object.assign({}, s, { text: s.text.slice(from - start, c - start), start: from }));
				from = c;
			}
		}
		return out;
	}

	function fillFromReading(dictSegments, reading, parens, latin) {
		// 复制一份，别改到调用方缓存里的词典结果
		let segs = copySegments(dictSegments, parens.flat());
		// 音译把数字原样留着（10匹 → 10 ppi ki）时，「10匹」拆回 数字 / 助数词：
		// 数字去对占位符，助数词照常进空档。对完再合回去，读音用词典的
		if (latin) {
			segs = segs.flatMap((s) =>
				s.num && !s.skip
					? [
							{ text: s.text.slice(0, s.num.len), start: s.start, numHead: s },
							{ text: s.text.slice(s.num.len), rt: s.num.rt, start: s.start + s.num.len, numTail: true },
					  ]
					: [s]
			);
		}
		for (const s of segs) s.skip = s.hidden || parens.some(([a, b]) => s.start >= a && s.start < b);
		// 英文/数字对得上占位符时，只有汉字算读不出
		const unreadableRe = latin ? RE_HAS_KANJI : RE_UNREADABLE;

		// 用「非空锚点」把 segs 切成若干待填的空档。纯标点/空格锚点是空的，
		// 并进相邻空档一起处理，而不是像行级对齐那样直接放弃。
		// 词典读不出的汉字（简体字「背负」的负）、英文、数字在音译里也占读音，
		// 长度没法估，挨着它们的空档都分不准，标成 bad 留给词典
		const groups = [];
		let gap = null;
		let nextBad = false;
		const openGap = () => gap || (gap = { items: [], bad: nextBad });
		const closeGap = () => {
			if (gap) groups.push(gap);
			gap = null;
		};
		for (const seg of segs) {
			if (seg.skip) continue;
			if (seg.fixed) {
				// 作词者自带的注音：当锚点，不改
				closeGap();
				groups.push({ anchor: looseAnchorPattern(seg.rt) });
				nextBad = false;
				continue;
			}
			if (seg.rt) {
				openGap().items.push(seg);
				nextBad = false;
				continue;
			}
			const unreadable = unreadableRe.test(seg.text);
			const anchor = looseAnchorPattern(seg.text, latin);
			if (!anchor) {
				if (unreadable) openGap().bad = true;
				if (gap) gap.items.push(seg);
				continue;
			}
			// 「间にやっほー」这种读不出的字和假名连在一起：在假名前面的读音会落进前一个空档，
			// 在后面的落进后一个
			const kanaAt = seg.text.search(RE_HAS_KANA_OR_LONG);
			const kanaEnd = seg.text.length - [...seg.text].reverse().join('').search(RE_HAS_KANA_OR_LONG);
			if (unreadable && unreadableRe.test(seg.text.slice(0, kanaAt))) openGap().bad = true;
			closeGap();
			groups.push({ anchor });
			nextBad = unreadable && unreadableRe.test(seg.text.slice(kanaEnd));
		}
		if (gap) groups.push(gap);
		else if (nextBad) groups.push({ items: [], bad: true });

		const parts = [];
		const gaps = [];
		for (const g of groups) {
			if (g.anchor != null) {
				// 带占位符的锚点长度不定：英文里恰好像罗马字的部分（no、to、into）会被转成假名
				parts.push(
					g.anchor.includes(UNKNOWN)
						? { full: new RegExp(`^(?:${g.anchor})$`) }
						: { re: new RegExp(g.anchor, 'y') }
				);
				continue;
			}
			if (!g.bad && !g.items.some((it) => it.rt)) continue; // 只有标点，不占读音
			parts.push({ want: g.items.reduce((n, it) => n + (it.rt ? toKatakana(it.rt).length : 0), 0) || 1 });
			gaps.push(g);
		}
		if (!gaps.length) return null;

		const captures = splitReading(parts, reading);
		if (!captures) return null;

		let usedOfficial = false;
		gaps.forEach((g, i) => {
			// 分到占位符的空档说明英文/数字没对上，这段读音不可信
			if (g.bad || captures[i].includes(UNKNOWN)) return;
			const items = g.items.filter((it) => it.rt);
			const readings = distributeReading(items, captures[i]);
			if (!readings) return; // 分不开，这一段保留词典读音
			items.forEach((it, k) => {
				if (!plausibleOfficial(it.text, toKatakana(it.rt), readings[k])) return;
				it.rt = restoreFromDict(it.rt, readings[k]);
				usedOfficial = true;
			});
		});
		if (!usedOfficial) return null; // 一段都没用上，结果等同词典

		return segs.filter((s) => !s.numTail).map((s) => stripSegment(s.numHead || s));
	}

	/** 去掉内部用的字段，只留对外的 text / rt / at / fixed / hidden */
	function stripSegment(s) {
		const out = { text: s.text };
		if (s.rt) {
			out.rt = s.rt;
			out.at = s.at;
		}
		if (s.fixed) out.fixed = true;
		if (s.hidden) out.hidden = true;
		if (s.num) out.num = s.num;
		return out;
	}

	// ---------------------------------------------------------------- 词典修正

	// kuromoji + IPADIC 常见的读音错误，按「表层形」整体覆盖。
	// 键可以跨多个 token（比如「二人」会被切成 二 / 人），合并逻辑见 mergeOverrides。
	const OVERRIDES = {
		大人: 'おとな',
		今日: 'きょう',
		明日: 'あした',
		昨日: 'きのう',
		今朝: 'けさ',
		一体: 'いったい',
		十分: 'じゅうぶん',
		万人: 'ばんにん',
		行方: 'ゆくえ',
		景色: 'けしき',
		上手: 'じょうず',
		下手: 'へた',
		紅葉: 'もみじ',
		台詞: 'せりふ',
		刹那: 'せつな',
		黄昏: 'たそがれ',
		瞬間: 'しゅんかん',
		// 以下取自 800 多首歌的官方音译统计，歌词里几乎总是这么读
		今: 'いま',
		風: 'かぜ',
		心: 'こころ',
		音: 'おと',
		土: 'つち',
		他: 'ほか',
		術: 'すべ',
		如何: 'どう',
		宝物: 'たからもの',
		細工: 'さいく',
		未來: 'みらい',
		正しく: 'ただしく',
		逝く: 'いく',
		歪む: 'ゆがむ',
		歪ん: 'ゆがん',
		居ら: 'いら',
		参ろう: 'まいろう',
	};

	// IPADIC 把送假名切错时，单字被当成名词给了音读（失くした → 失/くし/た → シツ），
	// 看后面紧跟的假名定读音。片假名送假名（回レ）也算
	const NEXT_KANA_READINGS = {
		失: [/^[くク]/, 'ナ'],
		回: [/^[っッるルりリれレろロらラ]/, 'マワ'],
	};

	// 数字 + 助数词：整体注音（1人 → ひとり，3本 → さんぼん）。
	//   r     助数词本身的读音
	//   whole 整个数的特殊读法；only 为真时只认 whole 里的数（つ 只到 9）
	//   last  个位数的特殊读法（4時 → よじ，14時 → じゅうよじ）
	//   soku  数字末尾哪些读法促音化（いち → いっ）
	//   p / n 促音后 / 撥音后助数词的变读（いっぽん / さんぼん）
	const SOKU_K = ['イチ', 'ロク', 'ハチ', 'ジュウ', 'ヒャク'];
	const SOKU_S = ['イチ', 'ハチ', 'ジュウ'];
	const COUNTERS = {
		人: { r: 'ニン', whole: { 1: 'ヒトリ', 2: 'フタリ' }, last: { 4: 'ヨ', 7: 'シチ' } },
		つ: { r: 'ツ', only: true, whole: { 1: 'ヒトツ', 2: 'フタツ', 3: 'ミッツ', 4: 'ヨッツ', 5: 'イツツ', 6: 'ムッツ', 7: 'ナナツ', 8: 'ヤッツ', 9: 'ココノツ' } },
		// 「〜日」的读法太不规则，1〜10 等单独列
		日: {
			r: 'ニチ',
			whole: { 1: 'イチニチ', 2: 'フツカ', 3: 'ミッカ', 4: 'ヨッカ', 5: 'イツカ', 6: 'ムイカ', 7: 'ナノカ', 8: 'ヨウカ', 9: 'ココノカ', 10: 'トオカ', 14: 'ジュウヨッカ', 20: 'ハツカ', 24: 'ニジュウヨッカ' },
			last: { 7: 'シチ', 9: 'ク' },
		},
		月: { r: 'ガツ', last: { 4: 'シ', 7: 'シチ', 9: 'ク' } },
		年: { r: 'ネン', last: { 4: 'ヨ' } },
		時: { r: 'ジ', last: { 4: 'ヨ', 7: 'シチ', 9: 'ク' } },
		分: { r: 'フン', soku: SOKU_K, p: 'プン', n: 'プン' },
		秒: { r: 'ビョウ' },
		回: { r: 'カイ', soku: SOKU_K },
		階: { r: 'カイ', soku: SOKU_K, n: 'ガイ' },
		個: { r: 'コ', soku: SOKU_K },
		曲: { r: 'キョク', soku: SOKU_K },
		歳: { r: 'サイ', soku: SOKU_S, whole: { 20: 'ハタチ' } },
		才: { r: 'サイ', soku: SOKU_S, whole: { 20: 'ハタチ' } },
		週: { r: 'シュウ', soku: SOKU_S },
		本: { r: 'ホン', soku: SOKU_K, p: 'ポン', n: 'ボン' },
		匹: { r: 'ヒキ', soku: SOKU_K, p: 'ピキ', n: 'ビキ' },
		杯: { r: 'ハイ', soku: SOKU_K, p: 'パイ', n: 'バイ' },
		番: { r: 'バン' },
		度: { r: 'ド' },
		枚: { r: 'マイ' },
		倍: { r: 'バイ' },
		円: { r: 'エン', last: { 4: 'ヨ' } },
	};
	const RE_NUMBER = /^[0-9０-９一二三四五六七八九十百千万〇零]+$/;

	const DIGIT_READINGS = ['', 'イチ', 'ニ', 'サン', 'ヨン', 'ゴ', 'ロク', 'ナナ', 'ハチ', 'キュウ'];
	const THOUSANDS = { 1: 'セン', 3: 'サンゼン', 8: 'ハッセン' };
	const HUNDREDS = { 1: 'ヒャク', 3: 'サンビャク', 6: 'ロッピャク', 8: 'ハッピャク' };

	/** 0〜9999 的读音；last 是个位数的特殊读法 */
	function readUnder10000(n, last) {
		const t = Math.floor(n / 1000);
		const h = Math.floor(n / 100) % 10;
		const d = Math.floor(n / 10) % 10;
		const o = n % 10;
		let s = '';
		if (t) s += THOUSANDS[t] || DIGIT_READINGS[t] + 'セン';
		if (h) s += HUNDREDS[h] || DIGIT_READINGS[h] + 'ヒャク';
		if (d) s += (d === 1 ? '' : DIGIT_READINGS[d]) + 'ジュウ';
		if (o) s += (last && last[o]) || DIGIT_READINGS[o];
		return s;
	}

	/** 数字的读音（片假名），超出一亿返回 null */
	function readNumber(n, last) {
		if (!(n >= 0) || n >= 1e8) return null;
		if (n === 0) return 'レイ'; // 0時 → れいじ
		const man = Math.floor(n / 10000);
		return (man ? readUnder10000(man) + 'マン' : '') + readUnder10000(n % 10000, last);
	}

	/** 「数 + 助数词」整体的读音（片假名），不认识返回 null */
	function counterReading(n, c) {
		if (c.whole && c.whole[n]) return c.whole[n];
		if (c.only) return null;
		let num = readNumber(n, c.last);
		if (!num) return null;
		let r = c.r;
		const end = (c.soku || []).find((e) => num.endsWith(e));
		if (end) {
			num = num.slice(0, -1) + 'ッ'; // イチ → イッ，ジュウ → ジュッ
			if (c.p) r = c.p;
		} else if (c.n && num.endsWith('ン')) r = c.n;
		return num + r;
	}

	const KANJI_DIGITS = { 〇: 0, 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
	const KANJI_UNITS = { 十: 10, 百: 100, 千: 1000 };

	/** 把「20」「２０」「二十」「三百」「2万」这类写法转成数字，认不出返回 NaN */
	function parseNum(s) {
		const half = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
		if (/^[0-9]+$/.test(half)) return parseInt(half, 10);
		let total = 0;
		let section = 0;
		let cur = 0;
		for (const ch of half) {
			if (ch in KANJI_DIGITS) cur = cur * 10 + KANJI_DIGITS[ch];
			else if (ch >= '0' && ch <= '9') cur = cur * 10 + (ch.charCodeAt(0) - 48); // 「2万」
			else if (ch in KANJI_UNITS) {
				section += (cur || 1) * KANJI_UNITS[ch];
				cur = 0;
			} else if (ch === '万') {
				total += (section + cur || 1) * 10000;
				section = cur = 0;
			} else return NaN;
		}
		return total + section + cur;
	}

	/**
	 * 把能凑成 OVERRIDES 键的相邻 token 合成一个，读音用覆盖值；
	 * 顺便处理「数字 + 助数词」。
	 */
	function mergeOverrides(tokens) {
		const out = [];
		const MAX = 4;
		for (let i = 0; i < tokens.length; i++) {
			let matched = false;
			// 「三十一人」的 一人 不是 ひとり，前面还有数字时不整体覆盖数字开头的词
			const midNumber = i > 0 && RE_NUMBER.test(tokens[i - 1].surface_form) && RE_NUMBER.test(tokens[i].surface_form);
			for (let n = Math.min(MAX, tokens.length - i); n >= 2 && !midNumber; n--) {
				const slice = tokens.slice(i, i + n);
				const joined = slice.map((t) => t.surface_form).join('');
				if (OVERRIDES[joined]) {
					out.push({ surface_form: joined, reading: toKatakana(OVERRIDES[joined]) });
					i += n - 1;
					matched = true;
					break;
				}
			}
			if (matched) continue;

			const tk = tokens[i];
			const prev = tokens[i - 1];
			const next = tokens[i + 1];

			const nk = NEXT_KANA_READINGS[tk.surface_form];
			if (nk && next && nk[0].test(next.surface_form)) {
				out.push({ surface_form: tk.surface_form, reading: nk[1] });
				continue;
			}
			// 「君」只有接在人名后面才是くん，其余都读きみ
			if (tk.surface_form === '君' && !(prev && prev.pos === '名詞' && prev.pos_detail_1 === '固有名詞')) {
				out.push({ surface_form: '君', reading: 'キミ' });
				continue;
			}
			// 数字 + 助数词整体注音。「二十日」会被切成 二 / 十 / 日，往前把连续的数词都收上来
			const counter = COUNTERS[tk.surface_form];
			let k = out.length;
			while (k > 0 && !out[k - 1].number && RE_NUMBER.test(out[k - 1].surface_form)) k--;
			if (counter && k < out.length) {
				const numText = out.slice(k).map((t) => t.surface_form).join('');
				const reading = counterReading(parseNum(numText), counter);
				if (reading) {
					out.splice(k);
					out.push({ surface_form: numText + tk.surface_form, reading, number: counter.r, digits: numText });
				} else if (RE_HAS_KANJI.test(tk.surface_form)) {
					// 数认不出来（太大、写法怪），至少助数词本身读对
					out.push({ surface_form: tk.surface_form, reading: counter.r });
				} else out.push(tk);
				continue;
			}
			// 「オレンジ色」这类外来语 + 色，IPADIC 会给 ショク
			if (
				tk.surface_form === '色' &&
				prev &&
				/[ァ-ヺー]$/.test(prev.surface_form)
			) {
				out.push({ surface_form: '色', reading: 'イロ' });
				continue;
			}
			out.push(tk);
		}
		return out;
	}

	/**
	 * @param {Array} tokens   kuromoji 的 tokenize 结果（对整行文本）
	 * @param {Object} [opts]
	 * @param {'hiragana'|'katakana'} [opts.kana='hiragana'] 注音用哪种假名
	 * @returns {Array} 片段数组
	 */
	function tokensToSegments(tokens, opts) {
		opts = opts || {};
		const kana = opts.kana === 'katakana' ? toKatakana : toHiragana;
		const out = [];
		let offset = 0;

		const push = (text, rt, at, num) => {
			if (!text) return;
			if (!rt) {
				const last = out[out.length - 1];
				if (last && !last.rt) last.text += text;
				else out.push({ text: text });
				return;
			}
			const seg = { text: text, rt: rt, at: at };
			if (num) seg.num = num;
			out.push(seg);
		};

		for (const token of mergeOverrides(tokens)) {
			const surface = token.surface_form;
			const start = offset;
			offset += surface.length;

			// 「1人」「1つ」：数字和助数词合在一起注音，底字里可以没有汉字
			if (token.number) {
				// 阿拉伯数字的长度记下来：音译有时把数字原样留着，对齐时要拆开（见 fillFromReading）
				const digits = /^[0-9０-９]+$/.test(token.digits) ? token.digits.length : 0;
				push(surface, kana(token.reading), start, digits && { len: digits, rt: kana(token.number) });
				continue;
			}
			if (!RE_HAS_KANJI.test(surface)) {
				push(surface);
				continue;
			}

			let reading = OVERRIDES[surface] || token.reading;
			if (!reading || reading === '*') {
				// 词典里没有读音（生僻字、外文夹杂等），原样输出
				push(surface);
				continue;
			}
			reading = toKatakana(reading);
			// 「磊々」这类生僻字会被切成 磊 / 々，々 单独成词时读音就是它自己
			if (!RE_HAS_KANA.test(reading)) {
				push(surface);
				continue;
			}

			const runs = splitRuns(surface);
			const aligned = alignReading(surface, reading);

			if (!aligned) {
				// 对不齐 → 整词注音，读音里把送假名也带上，至少不会错
				push(surface, kana(reading), start);
				continue;
			}

			const rtByRun = new Map(aligned.map((a) => [a.run, a.rt]));
			let cursor = start;
			for (let i = 0; i < runs.length; i++) {
				const r = runs[i];
				const rt = rtByRun.get(i);
				if (r.kanji && rt) push(r.text, kana(rt), cursor);
				else push(r.text);
				cursor += r.text.length;
			}
		}

		return applyInlineRuby(out, kana);
	}

	/**
	 * 作词者自己写的注音「漢字（かな）」：括号前的整段汉字直接用括号里的读音（fixed），
	 * 括号本身留在片段里但标成 hidden，渲染时藏起来——片段拼起来仍然等于原文，
	 * 逐字歌词按下标切分不受影响。
	 */
	function applyInlineRuby(segs, kanaFn) {
		const text = segs.map((s) => s.text).join('');
		// 带注音的片段内部不能切（copySegments 只切不带注音的），落在里面的括号注音就不认了
		const inside = new Set();
		let pos = 0;
		for (const s of segs) {
			if (s.rt) for (let i = pos + 1; i < pos + s.text.length; i++) inside.add(i);
			pos += s.text.length;
		}
		const rubies = [...text.matchAll(RE_INLINE_RUBY)]
			.map((m) => ({
				from: m.index,
				mid: m.index + m[1].length,
				to: m.index + m[0].length,
				rt: m[2].replace(/・/g, ''),
			}))
			.filter((r) => !inside.has(r.from) && !inside.has(r.mid) && !inside.has(r.to));
		if (!rubies.length) return segs;

		const out = [];
		for (const p of copySegments(segs, rubies.flatMap((r) => [r.from, r.mid, r.to]))) {
			const r = rubies.find((x) => p.start >= x.from && p.start < x.to);
			if (!r) {
				const last = out[out.length - 1];
				if (!p.rt && last && !last.rt && !last.hidden) last.text += p.text;
				else out.push(stripSegment(p));
			} else if (p.start === r.from) {
				out.push({ text: text.slice(r.from, r.mid), rt: kanaFn(toKatakana(r.rt)), at: r.from, fixed: true });
			} else if (p.start === r.mid) {
				out.push({ text: text.slice(r.mid, r.to), hidden: true });
			}
		}
		return out;
	}

	return {
		KANJI_RANGE: KANJI,
		hasKanji: (s) => RE_HAS_KANJI.test(s),
		hasKana: (s) => RE_HAS_KANA.test(s),
		toHiragana,
		toKatakana,
		splitRuns,
		alignReading,
		mergeOverrides,
		tokensToSegments,
		romajiToKana,
		UNKNOWN,
		segmentsFromReading,
		parseLrc,
		lyricKey,
		isCreditLine,
		buildRomajiMap,
	};
});
