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

	/**
	 * 罗马字 → 平假名。认不出任何一个字符就返回 null，让调用方退回词典，
	 * 宁可不用也不要给出错的读音。
	 */
	function romajiToKana(input) {
		let s = String(input)
			.toLowerCase()
			.replace(/[\s　]+/g, '')
			// n' 这类音节分隔符，以及音译里可能带的标点
			.replace(/['’‘`,.!?;:"“”()[\]{}、。，！？…「」『』]/g, '');
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
			if (c === s[i + 1] && /[a-z]/.test(c) && c !== 'n' && !'aiueo'.includes(c)) {
				out += 'っ';
				i++;
				continue;
			}
			if (c === '-' || c === '－' || c === 'ー') {
				out += 'ー';
				i++;
				continue;
			}
			return null; // 夹了英文单词之类，交给词典
		}
		return out || null;
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
	 */
	function looseAnchorPattern(text) {
		const kana = toKatakana(text).replace(/[^ァ-ヺーｰ]/g, '');
		if (!kana) return '';
		return escapeRe(kana)
			.replace(/ハ/g, '[ハワ]')
			.replace(/ヘ/g, '[ヘエ]')
			.replace(/ヲ/g, '[ヲオ]')
			.replace(/ヂ/g, '[ヂジ]')
			.replace(/ヅ/g, '[ヅズ]')
			.replace(/ー/g, '[ーｰアイウエオ]');
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
	 * 已知整行真实读音（来自官方音译）时，把它分配到词典给出的结构上：
	 * **词典负责断词，音译负责读音**。
	 *
	 * 只按原文的汉字/假名切段是不够的——「昨夜言ってた」里 `昨夜言` 三个汉字连着，
	 * 会被当成一个整体，整段读音糊在上面变成 `昨夜言(ゆうべい)`。所以结构取自词典
	 * 分词结果（`昨夜` / `言`），再用词典读音的长度把音译片段切开。
	 *
	 * @param {string} text          歌词原文
	 * @param {string} reading       整行读音（假名）
	 * @param {Array}  dictSegments  tokensToSegments 的结果，只读
	 */
	function segmentsFromReading(text, reading, dictSegments, opts) {
		opts = opts || {};
		if (!RE_HAS_KANJI.test(text) || !dictSegments || !dictSegments.length) return null;
		const kanaFn = opts.kana === 'katakana' ? toKatakana : toHiragana;

		// 复制一份，别改到调用方缓存里的词典结果
		const segs = dictSegments.map((s) => ({ text: s.text, rt: s.rt, at: s.at }));

		// 用「非空锚点」把 segs 切成若干待填的空档。纯标点/空格锚点是空的，
		// 并进相邻空档一起处理，而不是像行级对齐那样直接放弃。
		const groups = [];
		let gap = null;
		for (const seg of segs) {
			if (seg.rt) {
				(gap || (gap = { items: [] })).items.push(seg);
				continue;
			}
			const anchor = looseAnchorPattern(seg.text);
			if (!anchor) {
				if (gap) gap.items.push(seg);
				continue;
			}
			if (gap) {
				groups.push(gap);
				gap = null;
			}
			groups.push({ anchor });
		}
		if (gap) groups.push(gap);

		let pattern = '^';
		const gaps = [];
		for (const g of groups) {
			if (g.anchor != null) {
				pattern += g.anchor;
				continue;
			}
			if (!g.items.some((it) => it.rt)) continue; // 只有标点，不占读音
			pattern += '(.+?)';
			gaps.push(g);
		}
		pattern += '$';
		if (!gaps.length) return null;

		let m;
		try {
			m = new RegExp(pattern).exec(toKatakana(reading));
		} catch (e) {
			return null;
		}
		if (!m) return null;

		let usedOfficial = false;
		gaps.forEach((g, i) => {
			const items = g.items.filter((it) => it.rt);
			const readings = distributeReading(items, m[i + 1]);
			if (!readings) return; // 分不开，这一段保留词典读音
			items.forEach((it, k) => {
				it.rt = readings[k];
			});
			usedOfficial = true;
		});
		if (!usedOfficial) return null; // 一段都没用上，结果等同词典

		for (const s of segs) if (s.rt) s.rt = kanaFn(toKatakana(s.rt));
		return segs;
	}

	// ---------------------------------------------------------------- 词典修正

	// kuromoji + IPADIC 常见的读音错误，按「表层形」整体覆盖。
	// 键可以跨多个 token（比如「二人」会被切成 二 / 人），合并逻辑见 mergeOverrides。
	const OVERRIDES = {
		一人: 'ひとり',
		二人: 'ふたり',
		大人: 'おとな',
		今日: 'きょう',
		明日: 'あした',
		昨日: 'きのう',
		今朝: 'けさ',
		一体: 'いったい',
		一日: 'いちにち',
		四時: 'よじ',
		七時: 'しちじ',
		九時: 'くじ',
		行方: 'ゆくえ',
		景色: 'けしき',
		上手: 'じょうず',
		下手: 'へた',
		紅葉: 'もみじ',
		台詞: 'せりふ',
		刹那: 'せつな',
		黄昏: 'たそがれ',
		瞬間: 'しゅんかん',
		二度: 'にど',
		一度: 'いちど',
	};

	// 数字 + 助数词。IPADIC 常给出单字的训读（10月 → つき），这里按量词纠正。
	const COUNTERS = {
		月: 'がつ',
		年: 'ねん',
		時: 'じ',
		分: 'ふん',
		秒: 'びょう',
		人: 'にん',
		回: 'かい',
		歳: 'さい',
		才: 'さい',
		番: 'ばん',
		度: 'ど',
		個: 'こ',
		本: 'ほん',
		枚: 'まい',
	};
	const RE_NUMBER = /^[0-9０-９一二三四五六七八九十百千万〇零]+$/;

	// 「〜日」的读法太不规则，单独列表
	const DAY_READINGS = {
		1: 'いちにち',
		2: 'ふつか',
		3: 'みっか',
		4: 'よっか',
		5: 'いつか',
		6: 'むいか',
		7: 'なのか',
		8: 'ようか',
		9: 'ここのか',
		10: 'とおか',
		14: 'じゅうよっか',
		20: 'はつか',
		24: 'にじゅうよっか',
	};

	const KANJI_DIGITS = { 〇: 0, 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

	/** 把「20」「２０」「二十」这类写法转成数字，认不出返回 NaN */
	function parseNum(s) {
		const half = s.replace(/[０-９]/g, (c) =>
			String.fromCharCode(c.charCodeAt(0) - 0xfee0)
		);
		if (/^[0-9]+$/.test(half)) return parseInt(half, 10);
		let total = 0;
		let cur = 0;
		for (const ch of half) {
			if (ch in KANJI_DIGITS) cur = cur * 10 + KANJI_DIGITS[ch];
			else if (ch === '十') {
				total += (cur || 1) * 10;
				cur = 0;
			} else return NaN;
		}
		return total + cur;
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
			for (let n = Math.min(MAX, tokens.length - i); n >= 2; n--) {
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
			// 「二十日」会被切成 二 / 十 / 日，往前把连续的数词都收上来
			let numText = '';
			for (let j = i - 1; j >= 0 && RE_NUMBER.test(tokens[j].surface_form); j--)
				numText = tokens[j].surface_form + numText;
			const afterNumber = numText !== '';

			if (tk.surface_form === '日' && afterNumber) {
				const day = DAY_READINGS[parseNum(numText)];
				out.push({
					surface_form: '日',
					reading: toKatakana(day || 'にち'),
				});
				continue;
			}
			if (COUNTERS[tk.surface_form] && afterNumber) {
				out.push({
					surface_form: tk.surface_form,
					reading: toKatakana(COUNTERS[tk.surface_form]),
				});
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

		const push = (text, rt, at) => {
			if (!text) return;
			if (!rt) {
				const last = out[out.length - 1];
				if (last && !last.rt) last.text += text;
				else out.push({ text: text });
				return;
			}
			out.push({ text: text, rt: rt, at: at });
		};

		for (const token of mergeOverrides(tokens)) {
			const surface = token.surface_form;
			const start = offset;
			offset += surface.length;

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
		segmentsFromReading,
		parseLrc,
		lyricKey,
		isCreditLine,
		buildRomajiMap,
	};
});
