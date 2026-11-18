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
	else root.FuriganaPlusCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
	'use strict';

	// 汉字（含「々」「〇」和兼容区），不含假名
	const KANJI = '々〇一-鿿㐀-䶿豈-﫿';
	const RE_HAS_KANJI = new RegExp('[' + KANJI + ']');
	const RE_ALL_KANJI = new RegExp('^[' + KANJI + ']+$');
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
	// Word-attached kana can deliberately override the dictionary reading.
	// Keep backing sounds/phrases and reconsider possible echoes with line evidence.
	const RE_RUBY_BASE = new RegExp(`[0-9０-９]*[${KANJI}][${KANJI}ぁ-ゖァ-ヺー]*$`);
	const RE_KANJI_BASE = new RegExp(`[0-9０-９]*[${KANJI}]+$`);
	const RE_PAREN = /[（(][^（）()]*[）)]/g;
	const KATAKANA = 'ァ-ヺヽヾヿㇰ-ㇿｦ-ﾟ';
	const RE_KATAKANA = new RegExp(`[${KATAKANA}]`);
	const RE_KATAKANA_RUN = new RegExp(`[${KATAKANA}ーｰ－-]+`, 'g');
	const RE_KATAKANA_TAIL = new RegExp(`[${KATAKANA}ーｰ－-]+$`);
	function englishReading(value) {
		const text=String(value).normalize('NFKC').trim().replace(/\s+/g,' ');
		return /[A-Za-z]/.test(text)&&/^[A-Za-z0-9 '’.,!?&:+/–—-]+$/.test(text)?text:null;
	}
	function latinRubyAt(text, match) {
		const rt=englishReading(match[0].slice(1,-1));if(!rt||rt.length>256)return null;
		const prefix=text.slice(0,match.index).replace(/\s+$/u,''),word=RE_KATAKANA_TAIL.exec(prefix);
		return word&&RE_KATAKANA.test(word[0])?{from:word.index,mid:prefix.length,open:match.index,to:match.index+match[0].length,rt,script:'latin',confirmed:true}:null;
	}
	function latinRubyRanges(text) { return [...text.matchAll(RE_PAREN)].map(m=>latinRubyAt(text,m)).filter(Boolean); }
	function splitEditableKatakana(segments) {
		const out=[];
		for(let s of segments) {
			// Bare loanwords get no automatic ruby. A written English gloss or a
			// manual edit is the opt-in; ordinary website kana must not add one.
			if(s.rt&&!s.inlineLatin&&!s.edit&&RE_KATAKANA.test(s.text)&&RE_KATAKANA_TAIL.exec(s.text)?.index===0)s={text:s.text};
			if(s.rt||s.hidden){out.push(s);continue;}
			let cursor=0;
			for(const m of s.text.matchAll(RE_KATAKANA_RUN)) {
				if(!RE_KATAKANA.test(m[0]))continue;
				if(m.index>cursor)out.push({text:s.text.slice(cursor,m.index)});
				out.push({text:m[0],katakana:true});cursor=m.index+m[0].length;
			}
			if(cursor<s.text.length)out.push({text:s.text.slice(cursor)});
		}
		return out;
	}
	function withLatinRuby(segments,opts={}) {
		if(!segments)return null;
		const notes=latinRubyRanges(segments.map(s=>s.text).join(''));
		const result=notes.length?applyRubyRanges(segments,notes,{...opts,preserveReadings:false}):segments;
		return result&&splitEditableKatakana(result);
	}
	function literalSegments(segments) {
		return segments.map(s=>{const p={...s};delete p.hidden;delete p.fixed;if(p.inlineLatin){delete p.rt;delete p.at;delete p.inlineLatin;}return p;});
	}

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

	// IPADIC mostly uses modern Japanese forms. Normalize only for dictionary lookup;
	// all mappings preserve UTF-16 length, and original glyphs/positions are restored.
	const LOOKUP_VARIANTS = Object.freeze({ 會: '会', 戀: '恋', 凜: '凛', 墮: '堕', 體: '体', 聲: '声', 變: '変', 歸: '帰', 萬: '万', 盡: '尽', 驅: '駆' });
	const LOOKUP_VARIANT_PATTERN = new RegExp('[' + Object.keys(LOOKUP_VARIANTS).join('') + ']','g');
	function tokenizeForReading(tokenizer, text) {
		const lookup = text.replace(LOOKUP_VARIANT_PATTERN, c => LOOKUP_VARIANTS[c]);
		const tokens = tokenizer.tokenize(lookup);
		if (lookup === text) return tokens;
		if (tokens.map(t => t.surface_form).join('') !== lookup) return tokenizer.tokenize(text);
		let offset = 0;
		return tokens.map(token => {
			const surface = text.slice(offset, offset + token.surface_form.length);
			offset += token.surface_form.length;
			return { ...token, surface_form: surface };
		});
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

	// Call with original lyrics only, never translations, romaji or track metadata.
	function hasJapaneseLyrics(lines) {
		return Array.isArray(lines) && lines.some(line => {
			const text = String(line && typeof line === 'object' ? line.text || '' : line || '').normalize('NFKC').trim();
			return text && !isCreditLine(text) && !/^(?:\{|\[(?:ti|ar|al|by|offset|re|ve):)/i.test(text) && RE_HAS_KANA.test(text);
		});
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
		// With no dictionary reading, length preference is not evidence. Accept an
		// unknown gap only if every feasible full-line alignment gives it the same
		// reading. Known gaps retain the original dictionary-distance algorithm.
		out.unknownAmbiguous = new Set();
		if (parts.some(part => part.unknown)) {
			let reachable = new Set([0]), gapIndex = 0;
			for (let i = 0; i < parts.length; i++) {
				const part = parts[i], next = new Set(), values = new Set();
				for (const p of reachable) {
					let lengths = [];
					if (part.re) { part.re.lastIndex = p; const m = part.re.exec(reading); if (m) lengths = [m[0].length]; }
					else for (let len = part.full ? 0 : 1; p + len <= n; len++) {
						if (!part.full || part.full.test(reading.substr(p, len))) lengths.push(len);
					}
					for (const len of lengths) {
						if (best[i + 1][p + len] === Infinity) continue;
						next.add(p + len);
						if (part.unknown) values.add(reading.substr(p, len));
					}
				}
				if (part.unknown && values.size !== 1) out.unknownAmbiguous.add(gapIndex);
				if (!part.re && !part.full) gapIndex++;
				reachable = next;
			}
		}
		return out;
	}

	/**
	 * 一段读音要分给多个汉字块时，用词典读音的长度来定边界。
	 * 分不开返回 null（调用方保留这一段的词典读音）。
	 */
	function distributeReading(items, capture) {
		if (items.length === 1) return [capture];
		// Unknown characters have no dictionary length to split on. A contiguous
		// kanji run is merged by readingSlots; separate unknown words remain uncertain.
		if (items.some(it => it.unknown)) return null;

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
	function alignFromReading(text, reading, dictSegments, opts, allowSkip = true) {
		opts = opts || {};
		if (!RE_HAS_KANJI.test(text) || !dictSegments || !dictSegments.length) return null;
		const kanaFn = opts.kana === 'katakana' ? toKatakana : toHiragana;
		reading = toKatakana(reading);
		const slots = readingSlots(dictSegments);

		// 作词者自带注音的括号已经是 hidden 片段，不算在内
		const masked = dictSegments.map((s) => (s.hidden ? ' '.repeat(s.text.length) : s.text)).join('');
		const parens = [...masked.matchAll(RE_PAREN)].map((m) => [m.index, m.index + m[0].length]);

		for (const skipParen of allowSkip && parens.length ? [false, true] : [false]) {
			for (const latin of reading.includes(UNKNOWN) ? [true, false] : [false]) {
				const segs = fillFromReading(slots, reading, skipParen ? parens : [], latin);
				if (!segs) continue;
				for (const s of segs) if (s.rt) s.rt = s.inlineKana==='katakana' ? toKatakana(s.rt) : kanaFn(toKatakana(s.rt));
				return segs;
			}
		}
		return null;
	}
	function segmentsFromReading(text, reading, dictSegments, opts = {}) {
		if (!dictSegments || !dictSegments.length) return null;
		const candidates=inlineRubyRanges(text);
		if (!candidates.length) return alignFromReading(text,reading,dictSegments,opts);
		// A previous dictionary pass may have hidden a duplicate-looking chorus.
		// Reconsider it with the whole supplied reading before hiding anything.
		const literal=literalSegments(dictSegments);
		const notes=inlineRubyRanges(text,literal);
		const selected=selectInlineVariant(literal,notes,reading,opts,true);
		if(selected)return selected;
		const aligned=alignFromReading(text,reading,literal,opts);
		return aligned&&normalizeInlineRuby(aligned,{...opts,reading,proofSegments:literal,preferInline:true});
	}

	/** Unknown kanji still consume the supplied reading; do not treat them as kana.
	 * Keep known word boundaries, but merge a contiguous run containing an unknown
	 * character so that 出 + 會 can receive であ without inventing an internal split.
	 */
	function readingSlots(segments) {
		const split = []; let offset = 0;
		for (const s of segments) {
			if (s.rt || s.hidden || s.fixed) split.push({ ...s });
			else {
				let at = offset;
				for (const run of splitRuns(s.text)) {
					split.push(run.kanji ? { text: run.text, at, unknown: true } : { text: run.text });
					at += run.text.length;
				}
			}
			offset += s.text.length;
		}
		const output = [];
		for (let i = 0; i < split.length;) {
			let end = i;
			while (end < split.length && !split[end].hidden && !split[end].fixed &&
				RE_ALL_KANJI.test(split[end].text)) end++;
			if (end === i) { output.push(split[i++]); continue; }
			const run = split.slice(i, end);
			if (run.some(s => s.unknown)) output.push({ text: run.map(s => s.text).join(''), at: run[0].at, unknown: true, fallback: run });
			else output.push(...run);
			i = end;
		}
		return output;
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
		// 未识别的英文/数字仍保持保守回退；未知汉字已经由 readingSlots 单独标出。
		const groups = [];
		let gap = null;
		let nextBad = false;
		const openGap = () => gap || (gap = { items: [], bad: nextBad });
		const closeGap = () => {
			if (gap) groups.push(gap);
			gap = null;
		};
		for (const [index, seg] of segs.entries()) {
			if (seg.skip) continue;
			if (seg.fixed) {
				// 作词者自带的注音：当锚点，不改
				closeGap();
				groups.push({ anchor: looseAnchorPattern(seg.rt) });
				nextBad = false;
				continue;
			}
			if (seg.rt || seg.unknown) {
				openGap().items.push(seg);
				nextBad = false;
				continue;
			}
			const unreadable = unreadableRe.test(seg.text);
			// Only anchors beside an unknown gap need a mandatory sokuon. Keep the
			// original optional spelling for unrelated, dictionary-backed phrases.
			let adjacentUnknown = !!(gap && gap.items.some(s => s.unknown));
			for (let next = index + 1; !adjacentUnknown && next < segs.length; next++) {
				const item = segs[next]; if (item.skip) continue;
				if (item.fixed || !item.rt && !item.unknown && looseAnchorPattern(item.text, latin)) break;
				if (item.unknown) adjacentUnknown = true;
			}
			const anchor = adjacentUnknown ? looseAnchorPattern(seg.text, latin).replace(/ッ\?/g, 'ッ') : looseAnchorPattern(seg.text, latin);
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
			if (!g.bad && !g.items.some((it) => it.rt || it.unknown)) continue; // 只有标点，不占读音
			parts.push({ want: g.items.reduce((n, it) => n + (it.rt ? toKatakana(it.rt).length : it.unknown ? 1 : 0), 0) || 1,
				unknown: g.items.some(it => it.unknown) });
			gaps.push(g);
		}
		if (!gaps.length) return null;

		const captures = splitReading(parts, reading);
		if (!captures) return null;

		let usedOfficial = false;
		gaps.forEach((g, i) => {
			// 分到占位符的空档说明英文/数字没对上，这段读音不可信
			if (g.bad || captures[i].includes(UNKNOWN) || captures.unknownAmbiguous.has(i)) return;
			const items = g.items.filter((it) => it.rt || it.unknown);
			const readings = distributeReading(items, captures[i]);
			if (!readings) return; // 分不开，这一段保留词典读音
			items.forEach((it, k) => {
				if (it.unknown) {
					if (!/^[ァ-ヺーｰ]+$/.test(readings[k]) || readings[k].length > Math.max(12, it.text.length * 6)) return;
					it.rt = readings[k];
				} else {
					if (!plausibleOfficial(it.text, toKatakana(it.rt), readings[k])) return;
					it.rt = restoreFromDict(it.rt, readings[k]);
				}
				usedOfficial = true;
			});
		});
		if (!usedOfficial) return null; // 一段都没用上，结果等同词典

		return segs.filter((s) => !s.numTail).flatMap((s) => {
			const segment = s.numHead || s;
			return segment.unknown && !segment.rt && segment.fallback ? segment.fallback.map(stripSegment) : [stripSegment(segment)];
		});
	}

	/** 去掉内部用的字段，只留对外的 text / rt / at / fixed / hidden */
	function stripSegment(s) {
		const out = { text: s.text };
		if (s.rt) {
			out.rt = s.rt;
			out.at = s.at;
		}
		if (s.fixed) out.fixed = true;
		if (s.inlineKana === 'katakana') out.inlineKana = 'katakana';
		if (s.inlineLatin) out.inlineLatin = true;
		if (s.katakana) out.katakana = true;
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
		// IPADIC lacks this spelling of おとす / おちる. Do not change 堕落 (だらく).
		堕: [/^[とちトチ]/, 'オ'],
		墮: [/^[とちトチ]/, 'オ'],
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

		return opts.inlineRuby === false ? splitEditableKatakana(out) : normalizeInlineRuby(out, opts);
	}

	// Ignore formatting differences only in pronunciation comparisons. All text
	// and UTF-16 offsets in the returned segments remain exactly as supplied.
	function pronunciation(value) {
		const text=toKatakana(String(value).normalize('NFKC')).replace(/[\s\p{P}\p{S}]/gu,'');
		return /^[ァ-ヺー]*$/.test(text) ? text : null;
	}
	function positioned(segments) {
		let at=0;return segments.map(s=>{const p={s,start:at,end:at+s.text.length};at=p.end;return p;});
	}
	function segmentsFromDictionary(tokenizer,text,opts={}) {
		const raw=tokensToSegments(tokenizeForReading(tokenizer,text),{...opts,inlineRuby:false});
		const notes=inlineRubyRanges(text,raw);
		if(notes.some(r=>r.script!=='latin'&&(!r.confirmed||readingBefore(raw,r.mid,r.rt,r.from)===null))&&text.length<=4096) {
			const bases=new Map(inlineRubyRanges(text).map(r=>[r.mid,r.from]));
			// YRC can interrupt an inflected word: 揺(ゆ)れる becomes a noun
			// 揺(ゆら) if tokenized literally. Check the uninterrupted word first;
			// use it only where its dictionary pronunciation confirms the note.
			const chars=[],positions=[];let note=0;
			for(let i=0;i<text.length;i++) {
				if(note<notes.length&&i===notes[note].mid){i=notes[note++].to-1;continue;}
				chars.push(text[i]);positions.push(i);
			}
			const japanese=new RegExp(`[${KANJI}ぁ-ゖァ-ヺー]`),kept=[];
			for(let i=0;i<chars.length;i++) {
				if(/\s/.test(chars[i])) {
					let end=i+1;while(end<chars.length&&/\s/.test(chars[end]))end++;
					if(i>0&&japanese.test(chars[i-1])&&end<chars.length&&japanese.test(chars[end])){i=end-1;continue;}
				}
				kept.push(i);
			}
			const offsets=kept.map(i=>positions[i]),clean=kept.map(i=>chars[i]).join('');
			const context=tokensToSegments(tokenizeForReading(tokenizer,clean),{...opts,inlineRuby:false});
			const contextUnits=positioned(context),rawUnits=positioned(raw),overlays=new Map();
			const location=at=>{let lo=0,hi=offsets.length;while(lo<hi){const mid=(lo+hi)>>1;if(offsets[mid]<at)lo=mid+1;else hi=mid;}return lo;};
			let inflectionChecks=0;
			for(const r of notes) {
				if(r.script==='latin')continue;
				const end=location(r.mid),start=readingBefore(context,end,r.rt,location(bases.get(r.mid)));
				if(start===null) {
					if(r.confirmed)continue; // Keep a deliberate special reading's full base.
					// Some lyric spellings give only part of a verb reading, e.g.
					// 結(む)すんで. The literal spelling 結すんで has no matching
					// dictionary stem. Confirm the supplied kana + following okurigana
					// as one known inflected word; an interjection such as (ああ) fails.
					const tail=/^\s*([ぁ-ゖ]{1,24})/u.exec(text.slice(r.to)),a=r.mid-1,b=r.mid;
					if(!tail||r.rt.length>16||!RE_HAS_KANJI.test(text[a])||inflectionChecks++>=6)continue;
					const head=tokenizeForReading(tokenizer,r.rt+tail[1])[0];
					if(!head||head.word_type!=='KNOWN'||!['動詞','形容詞'].includes(head.pos)||head.surface_form.length<=r.rt.length)continue;
					if(rawUnits.some(u=>u.s.rt&&((u.start<a&&a<u.end)||(u.start<b&&b<u.end))))continue;
					overlays.set(a,{start:a,end:b,s:{text:text.slice(a,b),rt:opts.kana==='katakana'?toKatakana(r.rt):r.rt,at:a}});
					continue;
				}
				for(const p of contextUnits) {
					if(!p.s.rt||p.start<start||p.end>end)continue;
					const a=offsets[p.start],b=offsets[p.end-1]+1;
					if(notes.some(n=>n.mid<b&&n.to>a)||rawUnits.some(u=>u.s.rt&&((u.start<a&&a<u.end)||(u.start<b&&b<u.end))))continue;
					overlays.set(a,{start:a,end:b,s:{text:text.slice(a,b),rt:p.s.rt,at:a}});
				}
			}
			if(overlays.size) {
				const out=[];let cursor=0;
				const append=(a,b)=>{for(const p of rawUnits){const from=Math.max(a,p.start),to=Math.min(b,p.end);if(from<to)out.push(from===p.start&&to===p.end?stripSegment(p.s):{text:text.slice(from,to)});}};
				for(const p of [...overlays.values()].sort((a,b)=>a.start-b.start)){append(cursor,p.start);out.push(p.s);cursor=p.end;}
				append(cursor,text.length);
				return opts.inlineRuby===false?out:normalizeInlineRuby(out,opts);
			}
		}
		return opts.inlineRuby===false?raw:normalizeInlineRuby(raw,opts);
	}
	function romajiForLine(map,text,proofSegments) {
		if(!map)return null;
		const exact=map.get(lyricKey(text));if(exact)return exact;
		if(!/[（(]/.test(text))return null;
		const notes=inlineRubyRanges(text,proofSegments),found=new Set();let best=Infinity;
		for(const removed of inlineRubyVariants(notes)) {
			if(!removed.length)continue;if(removed.length>best)break;
			let clean='',cursor=0;for(const r of removed){clean+=text.slice(cursor,r.mid);cursor=r.to;}clean+=text.slice(cursor);
			const reading=map.get(lyricKey(clean));if(!reading)continue;
			if(removed.some(r=>!r.confirmed)) {
				if(!proofSegments)continue;
				const guided=resolveInlineRubyReading(proofSegments,romajiToKana(reading));
				const hidden=guided&&positioned(guided).filter(p=>p.s.hidden);
				if(!hidden||!removed.every(r=>hidden.some(p=>p.start<=r.mid&&p.end>=r.to)))continue;
			}
			best=removed.length;found.add(reading);
		}
		return found.size===1?[...found][0]:null;
	}
	function readingBefore(segments, end, reading, minimum=0) {
		const want=pronunciation(reading);if(!want)return null;
		const units=positioned(segments);let spoken='',hasKanji=false;
		for(let i=units.length-1;i>=0;i--) {
			const {s,start,end:to}=units[i];if(start>=end)continue;if(to<=minimum)break;
			if(start<minimum || s.rt && to>end)return null;
			const text=s.text.slice(0,Math.min(to,end)-start);
			const part=s.hidden?'':pronunciation(s.rt||text);if(part===null)return null;
			spoken=part+spoken;hasKanji=hasKanji||RE_HAS_KANJI.test(text);
			if(spoken===want && hasKanji)return start;
			if(spoken.length>want.length || end-start>256)break;
		}
		return null;
	}
	function pronunciationBetween(units, from, to) {
		let spoken='',cursor=from;
		for(const {s,start,end} of units) {
			if(end<=from||start>=to)continue;
			if(start>cursor||s.rt&&(start<from||end>to))return null;
			const part=pronunciation(s.rt||s.text.slice(Math.max(0,from-start),Math.min(end,to)-start));
			if(part===null)return null;spoken+=part;cursor=Math.min(end,to);
		}
		return cursor===to?spoken:null;
	}
	function backingSound(reading) {
		const rt=pronunciation(reading);
		// Repeated words such as ここ / いろいろ may be semantic readings.
		// Only common wordless backing patterns are excluded on their shape alone.
		if(!rt)return false;
		const vowels=rt.replace(/ー/g,'').replace(/[ァィゥェォ]/g,c=>({ァ:'ア',ィ:'イ',ゥ:'ウ',ェ:'エ',ォ:'オ'}[c]));
		return /^([アイウエオ])\1+$/.test(vowels)||/^(?:[アイウエオ]|ウォ|イェ|イエ)ー+$/.test(rt)||
			/^(ラ|ル|ハ|ドゥー?|シャラ)\1+$/.test(rt)||/^(ナ|バ|パ|タ|ダ)\1{2,}$/.test(rt);
	}
	function inlineRubyRanges(text, segments) {
		const output=[],units=segments&&positioned(segments);
		for(const m of text.matchAll(RE_PAREN)) {
			const latin=latinRubyAt(text,m);if(latin){output.push(latin);continue;}
			const written=m[0].slice(1,-1).normalize('NFKC').replace(/[\s・]/g,'');
			const katakana=/^[ァ-ヺー]+$/.test(written)&&/[ァ-ヺ]/.test(written);
			const rt=katakana?written:toHiragana(written);
			if(!rt || !/^[ぁ-ゖァ-ヺー]+$/.test(rt) || rt.length>256)continue;
			const prefix=text.slice(0,m.index).replace(/\s+$/u,''),base=RE_RUBY_BASE.exec(prefix);
			if(!base)continue;
			// Both scripts can supply a special reading: 霊(まぼろし), 旋律(メロディ).
			// Do not require that reading to agree with the source being corrected.
			const attached=RE_KANJI_BASE.exec(prefix),want=pronunciation(rt);
			const literal=attached&&units&&pronunciationBetween(units,attached.index,prefix.length);
			const phrase=literal&&want&&want.startsWith(literal)&&/^(ハ|ガ|ヲ|ニ|ヘ|ト|モ|デ|カラ|マデ|ダケ|ナラ|ヨリ|コソ)$/.test(want.slice(literal.length));
			const word=attached&&!backingSound(rt)&&!phrase?attached:null;
			const r={from:word?word.index:base.index,mid:prefix.length,open:m.index,to:m.index+m[0].length,rt,confirmed:!!word};
			if(katakana)r.script='katakana';
			if(segments) {
				const from=readingBefore(segments,r.mid,rt,r.from);
				if(from!==null){
					r.from=from;r.confirmed=true;
					// A split dictionary stem can already contain the preceding
					// kanji's reading, e.g. 罅 + 裂(ひびわ). Avoid ひび + ひびわ.
					const overlap=word&&from>word.index&&pronunciationBetween(units,word.index,from);
					if(overlap&&want.startsWith(overlap)&&want.length>overlap.length)r.from=word.index;
				}
				else if(!word) {
					// An irregular reading needs whole-line evidence. Limit its base to
					// the nearest dictionary kanji unit, rather than the entire phrase.
					const last=units.filter(p=>p.start>=r.from&&p.end<=r.mid&&RE_HAS_KANJI.test(p.s.text)).pop();
					if(last)r.from=last.start;
				}
			}
			output.push(r);
		}
		return output;
	}
	function inlineRubyVariants(notes) {
		// Usual lyric lines contain one or two notes. Bound unusual input instead
		// of growing an exponential search on long user-provided lines.
		if(notes.length>6)return [[],notes.filter(r=>r.confirmed)];
		const choices=[];
		for(let mask=0;mask<(1<<notes.length);mask++)choices.push(notes.filter((_,i)=>mask&(1<<i)));
		return choices.sort((a,b)=>a.length-b.length);
	}
	function applyRubyRanges(segs,ranges,opts={}) {
		if(!ranges.length)return segs.map(s=>({...s}));
		const text=segs.map(s=>s.text).join(''),inside=new Set();let at=0;
		for(const s of segs){if(s.rt)for(let i=at+1;i<at+s.text.length;i++)inside.add(i);at+=s.text.length;}
		const preserve=!!opts.preserveReadings,kanaFn=opts.kana==='katakana'?toKatakana:toHiragana;
		const notes=ranges.filter(r=>!inside.has(r.mid)&&!inside.has(r.to)&&(preserve||!inside.has(r.from)));
		if(notes.length!==ranges.length)return null;
		const out=[];
		for(const p of copySegments(segs,notes.flatMap(r=>preserve?[r.mid,r.to]:[r.from,r.mid,r.to]))) {
			const r=notes.find(r=>p.start>=(preserve?r.mid:r.from)&&p.start<r.to);
			if(!r)out.push(stripSegment(p));
			else if(!preserve&&p.start===r.from)out.push({text:text.slice(r.from,r.mid),rt:r.script==='latin'?r.rt:r.script==='katakana'?toKatakana(r.rt):kanaFn(toKatakana(r.rt)),at:r.from,fixed:true,...(r.script==='katakana'?{inlineKana:'katakana'}:r.script==='latin'?{inlineLatin:true,katakana:true}:{})});
			else if(p.start===r.mid)out.push({text:text.slice(r.mid,r.to),hidden:true});
		}
		return out.map(s=>s.text).join('')===text?out:null;
	}
	function matchesReading(segments, reading) {
		const wanted=pronunciation(reading);if(wanted===null)return false;let pattern='';
		for(const s of segments) {
			if(s.hidden)continue;
			const part=pronunciation(s.rt||s.text);if(part===null)return false;
			let escaped=escapeRe(part);
			// Particle spellings vary in romanization; a kanji word's supplied
			// pronunciation must still match exactly (花 is not わな).
			if(!s.rt)escaped=escaped.replace(/ハ/g,'[ハワ]').replace(/ヘ/g,'[ヘエ]').replace(/ヲ/g,'[ヲオ]').replace(/ヂ/g,'[ヂジ]').replace(/ヅ/g,'[ヅズ]');
			pattern+=escaped;
		}
		return new RegExp('^'+pattern+'$').test(wanted);
	}
	function selectInlineVariant(segments, notes, reading, opts, align) {
		const wanted=pronunciation(reading);if(!wanted)return null;
		// English is a written gloss, not an additional sung pronunciation. Hide
		// those parentheses for alignment, then restore their display ruby.
		const latin=notes.filter(r=>r.script==='latin');notes=notes.filter(r=>r.script!=='latin');
		if(latin.length) {
			segments=applyRubyRanges(segments.map(s=>s.inlineLatin?{text:s.text,katakana:true}:s),latin,{preserveReadings:true});
			if(!segments)return null;
		}
		const finish=result=>latin.length?withLatinRuby(result,opts):result;
		const text=segments.map(s=>s.text).join(''),found=[];let best=Infinity;
		for(const selected of inlineRubyVariants(notes)) {
			if(selected.length>best)break;
			const draft=applyRubyRanges(segments,selected,opts);if(!draft)continue;
			let result=draft;
			if(!matchesReading(result,reading)) {
				if(!align)continue;
				result=alignFromReading(text,reading,draft,opts,false);
				if(!result||!matchesReading(result,reading))continue;
			}
			if(!selected.length)return finish(result); // the Japanese parentheses are sung: retain them
			best=selected.length;found.push({selected,result});
		}
		if(!found.length)return null;
		const common=found[0].selected.filter(r=>found.every(v=>v.selected.includes(r)));
		// If equal readings fit different places, do not arbitrarily hide one.
		return finish(common.length===best?found[0].result:applyRubyRanges(segments,common,opts));
	}
	function resolveInlineRubyReading(segments,reading,opts={}) {
		const literal=literalSegments(segments);
		return selectInlineVariant(literal,inlineRubyRanges(literal.map(s=>s.text).join(''),literal),reading,opts,true);
	}
	function normalizeInlineRuby(segments, opts={}) {
		return withLatinRuby(normalizeKanaRuby(segments,opts),opts);
	}
	function normalizeKanaRuby(segments, opts={}) {
		const text=segments.map(s=>s.text).join('');if(!/[（(]/.test(text))return segments;
		const units=positioned(segments);
		const fallback=opts.proofSegments&&inlineRubyRanges(text,opts.proofSegments);
		const notes=inlineRubyRanges(text,segments).filter(r=>r.script!=='latin').map(r=>r.confirmed?r:fallback&&fallback.find(p=>p.confirmed&&p.mid===r.mid&&p.to===r.to)||r).filter(r=>
			opts.preferInline||!units.some(p=>p.s.hidden&&p.start<=r.mid&&p.end>=r.to));
		if(!notes.length)return segments;
		const finishOptions={...opts,preserveReadings:opts.preferInline?false:opts.preserveReadings};
		const apply=(base,ranges)=>applyRubyRanges(base,ranges,finishOptions)||(opts.preferInline&&ranges.length?null:base);
		const finish=selected=>{
			const hidden=positioned(selected).filter(p=>p.s.hidden);
			const active=notes.filter(r=>r.confirmed&&hidden.some(p=>p.start<=r.mid&&p.end>=r.to));
			return apply(selected,active);
		};
		if(opts.reading) {
			if(opts.proofSegments) {
				const guided=resolveInlineRubyReading(opts.proofSegments,opts.reading,opts);
				if(guided) {
					const hidden=positioned(guided).filter(p=>p.s.hidden);
					return apply(segments,notes.filter(r=>r.confirmed&&hidden.some(p=>p.start<=r.mid&&p.end>=r.to)));
				}
			}
			const selected=selectInlineVariant(segments,notes.filter(r=>r.confirmed),opts.reading,opts,false);
			if(selected)return finish(selected);
		}
		return apply(segments,notes.filter(r=>r.confirmed));
	}

	return {
		KANJI_RANGE: KANJI,
		LOOKUP_VARIANTS,
		hasKanji: (s) => RE_HAS_KANJI.test(s),
		hasKatakana: (s) => RE_KATAKANA.test(s),
		englishReading,
		latinRubyRanges,
		splitEditableKatakana,
		hasKana: (s) => RE_HAS_KANA.test(s),
		toHiragana,
		toKatakana,
		tokenizeForReading,
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
		hasJapaneseLyrics,
		buildRomajiMap,
		inlineRubyRanges,
		inlineRubyVariants,
		readingBefore,
		normalizeInlineRuby,
		resolveInlineRubyReading,
		segmentsFromDictionary,
		romajiForLine,
	};
});
