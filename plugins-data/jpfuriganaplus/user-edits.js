/* Additive, position-scoped reading overrides. Website fields remain untouched. */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory(require('./external-core.js'));
	else root.FuriganaPlusUserEdits = factory(root.FuriganaPlusExternalCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
	'use strict';
	const canonical = value => core.kana(value, 'hiragana');
	function reading(value) {
		const text = String(value).trim().normalize('NFKC');
		if (!/^[ぁ-ゖァ-ヶー]{1,100}$/.test(text)) throw new Error('请输入 1–100 个平假名或片假名（可含长音符）');
		return canonical(text);
	}
	const key = a => JSON.stringify([a.provider, a.url, a.line, a.start, a.text, a.original]);
	function valid(a) {
		return a && (a.provider === 'local' ? a.url === '' : ['utaten', 'utanet'].includes(a.provider) && core.allowedURL(a.url)) &&
			typeof a.line === 'string' && a.line.length <= 12000 && Number.isInteger(a.start) && a.start >= 0 &&
			typeof a.text === 'string' && a.text.length > 0 && a.line.slice(a.start, a.start + a.text.length) === a.text &&
			typeof a.original === 'string' && /^[ぁ-ゖァ-ヶー]{0,100}$/.test(a.original) &&
			typeof a.reading === 'string' && /^[ぁ-ゖァ-ヶー]{1,100}$/.test(a.reading);
	}
	const items = record => Array.isArray(record.userEdits) ? record.userEdits.filter(valid) : [];
	function annotate(record, text, segments, mode) {
		if (!segments) return null;
		const edits = new Map(items(record).map(a => [key(a), a]));
		const local = new Map(items(record).filter(a => a.provider === 'local').map(a => [JSON.stringify([a.line, a.start, a.text]), a]));
		let start = 0;
		return segments.map(seg => {
			const at = start; start += seg.text.length;
			if (!seg.rt && (record.provider !== 'local' || !/[一-龯々]/.test(seg.text))) return seg;
			let anchor = { provider: record.provider, url: record.url, line: text, start: at, text: seg.text, original: canonical(seg.rt || '') };
			const edit = edits.get(key(anchor)) || (record.provider !== 'local' && local.get(JSON.stringify([text, at, seg.text])));
			if (edit && edit.provider === 'local') anchor = { ...edit };
			return { ...seg, rt: edit ? core.kana(edit.reading, mode) : seg.rt,
				edit: { ...anchor, songId: record.songId, reading: edit ? canonical(edit.reading) : anchor.original },
				originalRt: edit ? core.kana(anchor.original, mode) : null };
		});
	}
	function update(record, anchor, value) {
		const next = { ...record }, custom = value == null ? null : reading(value);
		// Keep even unknown/orphaned entries; a refetch must not discard user work.
		const all = Array.isArray(record.userEdits) ? record.userEdits : [];
		next.userEdits = all.filter(a => !valid(a) || key(a) !== key(anchor));
		if (custom && custom !== anchor.original) {
			const { songId, reading: previous, ...location } = anchor;
			next.userEdits.push({ ...location, reading: custom, updatedAt: new Date().toISOString() });
		}
		return next;
	}
	return { reading, key, valid, items, annotate, update };
});
