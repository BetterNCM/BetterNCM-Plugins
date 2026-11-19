/* Additive, position-scoped reading overrides. Website fields remain untouched. */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory(require('./external-core.js'));
	else root.FuriganaPlusUserEdits = factory(root.FuriganaPlusExternalCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
	'use strict';
	const canonical = value => core.kana(value, 'hiragana');
	const acceptable = (s,max,empty=false) => typeof s==='string'&&s.length<=max&&(empty&&!s.length||s.length>0&&(/^[ぁ-ゖァ-ヶー]+$/.test(s)||/^[ぁ-ゖァ-ヶーA-Za-z0-9 '’.,!?&:+/–—-]+$/.test(s)&&/[A-Za-z]/.test(s)));
	function reading(value) {
		const text = String(value).trim().normalize('NFKC');
		if (!acceptable(text,1000)) throw new Error('请输入 1–1000 个假名或英文字母（可含空格、长音符和常用英文标点）');
		return text;
	}
	const key = a => JSON.stringify([a.provider, a.url, a.line, a.start, a.text, a.original]);
	const positionKey = a => JSON.stringify([a.provider, a.url, a.line, a.start, a.text]);
	function valid(a) {
		return a && (a.provider === 'local' ? a.url === '' : ['utaten', 'utanet'].includes(a.provider) && core.allowedURL(a.url)) &&
			typeof a.line === 'string' && a.line.length <= 12000 && Number.isInteger(a.start) && a.start >= 0 &&
			typeof a.text === 'string' && a.text.length > 0 && a.line.slice(a.start, a.start + a.text.length) === a.text &&
			acceptable(a.original,12000,true) && acceptable(a.reading,1000);
	}
	const items = record => Array.isArray(record.userEdits) ? record.userEdits.filter(valid) : [];
	function annotate(record, text, segments, mode, onApplied) {
		if (!segments) return null;
		const entries = items(record);
		const edits = new Map(entries.map(a => [key(a), a]));
		const positions = new Map(entries.map(a => [positionKey(a), a]));
		const local = new Map(entries.filter(a => a.provider === 'local').map(a => [JSON.stringify([a.line, a.start, a.text]), a]));
		let start = 0;
		return segments.map(seg => {
			const at = start; start += seg.text.length;
			if (seg.hidden || !seg.rt && !seg.katakana && (record.provider !== 'local' || !/[一-龯々]/.test(seg.text))) return seg;
			let anchor = { provider: record.provider, url: record.url, line: text, start: at, text: seg.text, original: canonical(seg.rt || '') };
			const edit = edits.get(key(anchor)) || (seg.fixed && positions.get(positionKey(anchor))) || (record.provider !== 'local' && local.get(JSON.stringify([text, at, seg.text])));
			if (edit && onApplied) onApplied(edit);
			if (edit && edit.provider === 'local') anchor = { ...edit };
			// A newly recognized original note must not suppress an existing manual
			// correction at the same unchanged word. This flag is runtime-only.
			if (seg.fixed) { anchor.original = canonical(seg.rt || ''); anchor.inline = true; }
			const original = seg.fixed || /[ァ-ヺ]/.test(seg.rt || '') ? seg.rt : core.kana(anchor.original,mode);
			return { ...seg, rt: edit ? core.writtenKana(edit.reading, mode) : seg.rt,
				edit: { ...anchor, songId: record.songId, reading: edit ? edit.reading : anchor.original,
					displayOriginal:original,displayReading:edit?edit.reading:seg.rt || '' },
				originalRt: edit ? original : null };
		});
	}
	function savedLine(text, entries, mode, corrected) {
		const segments = [];
		let offset = 0;
		for (const edit of entries) {
			if (edit.start < offset) continue;
			if (edit.start > offset) segments.push({ text: text.slice(offset, edit.start) });
			const rt = corrected ? edit.reading : edit.original;
			segments.push({ text: edit.text, rt: core.writtenKana(rt, mode) });
			offset = edit.start + edit.text.length;
		}
		if (offset < text.length) segments.push({ text: text.slice(offset) });
		return { segments };
	}
	// The original view reads the cached website data directly, even when the
	// playback resolver would prefer a note supplied by the client's lyric.
	function preview(record, mode, fromRomaji) {
		const byLine = new Map();
		for (const edit of items(record)) {
			if (edit.provider !== 'local' && (edit.provider !== record.provider || edit.url !== record.url)) continue;
			if (!byLine.has(edit.line)) byLine.set(edit.line, []);
			byLine.get(edit.line).push(edit);
		}
		const original = [], corrected = [], separate = [], applied = new Set();
		for (const line of record.lines) {
			const source = line.segments || (fromRomaji && fromRomaji(line.text, line.romaji));
			const segments = source || [{ text: line.text }];
			const row = { segments, romaji: source ? '' : line.romaji };
			const entries = byLine.get(line.text);
			original.push(row);
			corrected.push(entries ? {
				...row,
				segments: annotate({ ...record, userEdits: entries }, line.text, segments, mode, edit => applied.add(edit)),
			} : row);
		}
		for (const [text, entries] of byLine) {
			const remaining = entries.filter(edit => !applied.has(edit)).sort((a, b) => a.start - b.start);
			if (!remaining.length) continue;
			if (record.provider === 'local') {
				original.push(savedLine(text, remaining, mode, false));
				corrected.push(savedLine(text, remaining, mode, true));
			} else {
				// A cached website can have different words or line breaks. Show
				// such edits at their saved positions without moving them.
				separate.push(savedLine(text, remaining, mode, true));
			}
		}
		return { original, corrected, separate };
	}
	function update(record, anchor, value) {
		const next = { ...record }, custom = value == null ? null : reading(value);
		// Keep even unknown/orphaned entries; a refetch must not discard user work.
		const all = Array.isArray(record.userEdits) ? record.userEdits : [];
		next.userEdits = all.filter(a => !valid(a) || (anchor.inline ? positionKey(a) !== positionKey(anchor) : key(a) !== key(anchor)));
		if (custom && custom !== (anchor.displayOriginal || anchor.original)) {
			const { songId, reading: previous, inline, displayOriginal, displayReading, ...location } = anchor;
			next.userEdits.push({ ...location, reading: custom, updatedAt: new Date().toISOString() });
		}
		return next;
	}
	return { reading, key, valid, items, annotate, preview, update };
});
