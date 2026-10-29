/* External lyric parsing and conservative alignment. No network or persistent state. */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.FuriganaPlusExternalCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';
	const VARIANTS = { 戀: '恋', 凜: '凛', 墮: '堕', 體: '体', 聲: '声', 會: '会', 變: '変', 歸: '帰', 萬: '万', 盡: '尽', 驅: '駆' };
	// Only compare lyrics this way: preserve original glyphs/offsets, and do not
	// rewrite search titles such as 廻廻奇譚 or broaden song/artist verification.
	const LYRIC_VARIANTS = { ...VARIANTS,
		彈: '弾', 焰: '焔', 廻: '回', 涂: '塗', 傳: '伝', 說: '説', 咒: '呪', 駈: '駆', 溯: '遡', 淚: '涙', 絕: '絶', 冲: '衝' };
	const kana = (s, mode) => String(s).replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
		.replace(/[ぁ-ゖ]/g, c => mode === 'katakana' ? String.fromCharCode(c.charCodeAt(0) + 0x60) : c);
	function indexed(text, variants = LYRIC_VARIANTS) {
		let key = '', positions = [];
		let offset = 0;
		for (const char of text) {
			for (const c of char.normalize('NFKC').toLowerCase()) {
				if (/[\p{L}\p{N}]/u.test(c)) {
					const normalized = variants[c] || c;
					key += normalized;
					for (let i = 0; i < normalized.length; i++) positions.push({ start: offset, end: offset + char.length });
				}
			}
			offset += char.length;
		}
		return { key, positions };
	}
	const key = s => indexed(String(s || ''), VARIANTS).key;
	function titleKey(s) {
		// Strip only trailing parenthetical labels, commonly TV/anime or album metadata.
		return key(String(s || '').replace(/(?:\s*[（(][^()（）]*[）)])+\s*$/, ''));
	}
	function queryTitle(s) {
		return String(s || '').normalize('NFKC').replace(/(?:\s*[（(][^()（）]*[）)])+\s*$/, '')
			.replace(/[.…]+\s*$/, '').replace(/./gu, c => VARIANTS[c] || c).trim();
	}
	function matches(candidate, track) {
		return titleKey(candidate.title) === titleKey(track.title) && !!titleKey(track.title) &&
			(track.artists || []).some(a => key(a) && (candidate.artists || []).some(b => key(a) === key(b)));
	}
	function allowedURL(value) {
		try {
			const u = new URL(value);
			return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') &&
				['utaten.com', 'www.utaten.com', 'www.uta-net.com', 'uta-net.com'].includes(u.hostname);
		} catch (_) { return false; }
	}
	function searchURL(provider, track, titleOnly = false) {
		const title = queryTitle(track.title);
		if (!title || title.length > 200) throw new Error('缺少可搜索的歌名');
		return provider === 'utaten'
			? 'https://utaten.com/search?title=' + encodeURIComponent(title) + (titleOnly ? '' : '&artist_name=' + encodeURIComponent(track.artists[0] || ''))
			: 'https://www.uta-net.com/search/?Aselect=2&Bselect=3&Keyword=' + encodeURIComponent(title);
	}
	function searchResults(doc, provider) {
		const output = [];
		const selector = provider === 'utaten' ? '.searchResult__title a[href]' : 'a[href^="/song/"]';
		for (const a of doc.querySelectorAll(selector)) {
			const row = a.closest('tr');
			if (!row) continue;
			const artistNodes = row.querySelectorAll(provider === 'utaten' ? '.searchResult__artist > p a' : 'a[href^="/artist/"]');
			const title = (a.querySelector('.songlist-title') || a).textContent.trim();
			const url = new URL(a.getAttribute('href'), provider === 'utaten' ? 'https://utaten.com/' : 'https://www.uta-net.com/').href;
			if (!allowedURL(url) || !title || output.some(x => x.url === url)) continue;
			output.push({ title, artists: [...artistNodes].map(n => n.textContent.trim()), url });
		}
		return output;
	}
	function textLines(el) {
		if (!el) return [];
		const copy = el.cloneNode(true);
		for (const n of copy.querySelectorAll('script,style,iframe')) n.remove();
		for (const n of copy.querySelectorAll('br')) n.replaceWith('\n');
		return copy.textContent.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
	}
	function parseUtaten(doc, url) {
		const block = doc.querySelector('.lyricBody .hiragana');
		if (!block) throw new Error('UtaTen 页面没有振假名歌词');
		const titleNode = doc.querySelector('.newLyricTitle__main');
		const titleCopy = titleNode && titleNode.cloneNode(true);
		if (titleCopy) for (const n of titleCopy.querySelectorAll('span')) n.remove();
		const title = titleCopy ? titleCopy.textContent.trim() : '';
		const artists = [...doc.querySelectorAll('h3 a[href^="/artist/"]')].map(n => n.textContent.trim());
		const lines = [];
		let segments = [];
		function flush() {
			if (!segments.length) return;
			segments[0].text = segments[0].text.trimStart();
			segments[segments.length - 1].text = segments[segments.length - 1].text.trimEnd();
			segments = segments.filter(s => s.text);
			const text = segments.map(s => s.text).join('');
			if (text) lines.push({ text, segments });
			segments = [];
		}
		function walk(node) {
			if (node.nodeType === 3) {
				const text = node.textContent.replace(/[\r\n]+/g, '');
				if (text) segments.push({ text });
				return;
			}
			if (node.nodeType !== 1 || /^(SCRIPT|STYLE|IFRAME)$/.test(node.nodeName)) return;
			if (node.nodeName === 'BR') { flush(); return; }
			if (node.classList.contains('ruby') || node.nodeName === 'RUBY') {
				const rb = node.querySelector('.rb, rb'), rt = node.querySelector('.rt, rt');
				if (rb && rt) {
					const text = rb.textContent, reading = kana(rt.textContent.trim());
					segments.push(/^[ぁ-ゖァ-ヶー\s・]+$/.test(reading) ? { text, rt: reading.replace(/[\s・]/g, '') } : { text });
					return;
				}
			}
			for (const child of node.childNodes) walk(child);
		}
		walk(block); flush();
		if (!lines.some(l => l.segments.some(s => s.rt))) throw new Error('UtaTen 没有可用读音');
		return { provider: 'utaten', url, title, artists, lines };
	}
	function parseUtanet(doc, url, candidate) {
		const jp = textLines(doc.querySelector('#kashi-area'));
		const roma = textLines(doc.querySelector('#kashi-area-roma'));
		if (!jp.length || jp.length !== roma.length) throw new Error('歌ネット日文与罗马音行数不一致');
		const artists = [...doc.querySelectorAll('h1 .artist-name')].map(n => n.textContent.trim());
		const heading = doc.querySelector('h1 > span:first-child');
		const title = heading ? heading.textContent.trim() : '';
		if (!title || !artists.length || titleKey(title) !== titleKey(candidate.title)) throw new Error('歌ネット歌曲信息无法核对');
		return { provider: 'utanet', url, title: candidate.title, artists, lines: jp.map((text, i) => ({ text, romaji: roma[i] })) };
	}
	function validRecord(record, id) {
		if (record && record.schema === 1 && record.songId === String(id) && record.provider === 'local') return record.url === '' && Array.isArray(record.lines) && record.lines.length === 0 && typeof record.title === 'string' && Array.isArray(record.artists) && record.artists.every(a => typeof a === 'string');
		if (!record || record.schema !== 1 || record.songId !== String(id) || !['utaten', 'utanet'].includes(record.provider) || !allowedURL(record.url)) return false;
		if (new URL(record.url).hostname.replace(/^www\./, '') !== (record.provider === 'utaten' ? 'utaten.com' : 'uta-net.com')) return false;
		if (!Array.isArray(record.lines) || !record.lines.length || record.lines.length > 2000) return false;
		if (typeof record.title !== 'string' || !Array.isArray(record.artists) || !record.artists.every(a => typeof a === 'string')) return false;
		return record.lines.every(l => {
			if (!l || typeof l.text !== 'string' || !l.text || l.text.length > 4000) return false;
			if (record.provider === 'utanet') return typeof l.romaji === 'string' && l.romaji.length <= 8000;
			return Array.isArray(l.segments) && l.segments.length <= 4000 && l.segments.every(s => s && typeof s.text === 'string' &&
				(s.rt == null || typeof s.rt === 'string' && /^[ぁ-ゖァ-ヶー]+$/.test(s.rt))) && l.segments.map(s => s.text).join('') === l.text;
		});
	}
	function prepare(record) {
		const groups = [];
		for (let i = 0; i < record.lines.length; i++) {
			for (let count = 1; count <= 3 && i + count <= record.lines.length; count++) {
				const lines = record.lines.slice(i, i + count);
				const text = lines.map(l => l.text).join('');
				const index = indexed(text);
				groups.push({ ...index, text, segments: record.provider === 'utaten' ? lines.flatMap(l => l.segments) : null,
					romaji: record.provider === 'utanet' ? lines.map(l => l.romaji).join(' ') : null, count });
			}
		}
		return groups;
	}
	function project(target, group, from, mode) {
		const ti = indexed(target), until = from + ti.key.length;
		const annotations = [];
		let offset = 0;
		for (const s of group.segments) {
			const index = indexed(s.text), length = index.key.length;
			const end = offset + length;
			if (s.rt && length && end > from && offset < until) {
				// Never cut a ruby unit in half to guess a per-character reading.
				if (offset < from || end > until) return null;
				const startAt = ti.positions[offset - from].start;
				const endAt = ti.positions[end - from - 1].end;
				annotations.push({ start: startAt, end: endAt, rt: kana(s.rt, mode) });
			}
			offset = end;
		}
		if (!annotations.length) return null;
		const output = []; let cursor = 0;
		for (const a of annotations) {
			if (a.start > cursor) output.push({ text: target.slice(cursor, a.start) });
			output.push({ text: target.slice(a.start, a.end), rt: a.rt }); cursor = a.end;
		}
		if (cursor < target.length) output.push({ text: target.slice(cursor) });
		return output;
	}
	function contextualMatch(target, source) {
		// These are transcription confusions, NOT interchangeable kanji. Only accept
		// a complete, otherwise identical long line from the already verified song.
		// No edit-distance guesses, insertions/deletions, short fragments or title matching.
		if (target.length < 10 || target.length !== source.length) return false;
		let differences = 0;
		for (let i = 0; i < target.length; i++) {
			if (target[i] === source[i]) continue;
			const pair = target[i] + source[i];
			if (pair !== '暗闇' && pair !== '闇暗' &&
				!((pair === '沖衝' || pair === '衝沖') && target[i + 1] === '動' && source[i + 1] === '動')) return false;
			if (++differences > 2) return false;
		}
		return differences > 0;
	}
	function segmentsFor(target, groups, mode, fromRomaji) {
		const needle = indexed(target).key;
		if (!needle) return null;
		let candidates = groups.filter(g => g.key === needle).map(g => ({ g, at: 0 }));
		if (!candidates.length && needle.length >= 6) {
			for (const g of groups) {
				if (!g.segments || g.count !== 1) continue;
				let at = g.key.indexOf(needle);
				while (at >= 0) { candidates.push({ g, at }); at = g.key.indexOf(needle, at + 1); }
			}
		}
		if (!candidates.length) {
			candidates = groups.filter(g => g.segments && contextualMatch(needle, g.key)).map(g => ({ g, at: 0 }));
		}
		const versions = new Map();
		for (const { g, at } of candidates) {
			const result = g.segments ? project(target, g, at, mode) : fromRomaji && fromRomaji(target, g.romaji);
			if (result && result.map(s => s.text).join('') === target) versions.set(JSON.stringify(result), result);
			else return null;
		}
		// Repeated identical text with different readings is ambiguous without timestamps.
		return versions.size === 1 ? versions.values().next().value : null;
	}
	function lyricEvidence(lines, record) {
		const normalize = s => indexed(s).key;
		const targets = [...new Set((lines || []).filter(s => typeof s === 'string' && !/作詞|作曲|編曲|作词|作曲|编曲|lyrics|composer|arrang/i.test(s)).map(normalize))].filter(s => s.length >= 8 && /[ぁ-ゖァ-ヶ一-龯]/.test(s));
		const sources = prepare(record).map(g => g.key);
		const found = targets.filter(t => sources.some(s => s === t || t.length >= 12 && s.includes(t)));
		const characters = found.reduce((n, s) => n + s.length, 0);
		return { hits: found.length, characters, accepted: found.length >= 2 && characters >= 24 && found.length / Math.min(8, targets.length) >= .25 };
	}
	return { key, titleKey, queryTitle, matches, allowedURL, searchURL, searchResults, parseUtaten, parseUtanet, validRecord, prepare, segmentsFor, kana, lyricEvidence };
});
