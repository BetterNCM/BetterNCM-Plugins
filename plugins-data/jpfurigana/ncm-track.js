/*
 * 网易云客户端与接口：当前曲目 id、原歌词语种、官方音译（romalrc）、歌曲信息。
 * 只读客户端状态和公开接口，不碰歌词 DOM。
 */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.FuriganaTrack = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	// 这个接口无条件返回 romalrc，和歌词页上「音」的开关无关。
	const LYRIC_API = 'https://music.163.com/api/song/lyric?lv=-1&kv=-1&tv=-1&rv=-1&id=';
	const DETAIL_API = 'https://music.163.com/api/song/detail/?id=';
	const TIMEOUT = 8000;

	async function fetchJSON(url, label, options = {}) {
		const abort = new AbortController(), timer = setTimeout(() => abort.abort(), TIMEOUT);
		try {
			const res = await fetch(url, { ...options, signal: abort.signal });
			if (!res.ok) throw new Error(label + 'HTTP ' + res.status);
			return await res.json();
		} finally {
			clearTimeout(timer);
		}
	}

	function looksLikeStore(o) {
		return (
			!!o &&
			typeof o === 'object' &&
			typeof o.getState === 'function' &&
			typeof o.dispatch === 'function' &&
			typeof o.subscribe === 'function'
		);
	}

	function storeIn(value, depth) {
		if (!value || typeof value !== 'object' || depth > 2) return null;
		if (looksLikeStore(value)) return value;
		if (looksLikeStore(value.store)) return value.store;
		// react-redux 的 context 值形如 { store, subscription }
		for (const k of ['value', '_currentValue', 'stores']) {
			const s = storeIn(value[k], depth + 1);
			if (s) return s;
		}
		return null;
	}

	/**
	 * 从 React fiber 树里找网易云的 Redux store。
	 * 当前歌曲 id 在 store.getState().playing.resourceTrackId —— 这是 InfLink-rs
	 * 拿播放状态的同一条路，比 DOM 稳（class 名会随版本变，store 结构不会）。
	 */
	function findReduxStore() {
		for (const sel of ['#root', '#portal_root', 'body']) {
			const el = document.querySelector(sel);
			if (!el) continue;
			const key = Object.keys(el).find(
				(k) => k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$')
			);
			let fiber = key ? el[key] : null;
			if (!fiber && el._reactRootContainer && el._reactRootContainer._internalRoot)
				fiber = el._reactRootContainer._internalRoot.current;
			if (!fiber) continue;

			let budget = 20000;
			const queue = [fiber];
			const seen = new Set();
			while (queue.length && budget-- > 0) {
				const f = queue.shift();
				if (!f || seen.has(f)) continue;
				seen.add(f);
				const s = storeIn(f.memoizedProps, 0) || storeIn(f.memoizedState, 0);
				if (s) return s;
				if (f.child) queue.push(f.child);
				if (f.sibling) queue.push(f.sibling);
			}
		}
		return null;
	}

	/**
	 * hooks：
	 *   onTrackChange(id)  开始为新曲目拉音译前调用
	 *   onRomajiReady()    音译取回来了（之前按词典注过的行要重做）
	 *   onRomajiFailed()   音译获取失败
	 */
	function create({ LOG, state, core, hooks = {} }) {
		function getCurrentTrackId() {
			if (!state.store) state.store = findReduxStore();
			if (!state.store) return null;
			let root;
			try {
				root = state.store.getState();
			} catch (e) {
				state.store = null; // store 换了，下次重新找
				return null;
			}
			const playing = root && root.playing;
			if (!playing) return null;
			const id =
				playing.resourceTrackId ||
				playing.trackId ||
				(playing.playingTrack && (playing.playingTrack.id || playing.playingTrack.trackId));
			return id ? String(id) : null;
		}

		/** 一次播放的标识：同一首歌重新播放时 playId 会变 */
		function playKey(id = getCurrentTrackId()) {
			const p = state.store && state.store.getState().playing;
			return id + '|' + (p && p.playId || '');
		}

		let clientLyricSource = null, clientLyricId = null, clientLyricLines = [];
		function clientTrackLines(songId) {
			if (!songId) return [];
			const root = state.store && state.store.getState(), lyric = root && root['async:lyric'];
			if (lyric !== clientLyricSource || songId !== clientLyricId) {
				clientLyricSource = lyric; clientLyricId = songId;
				clientLyricLines = core.clientOriginalLines(lyric, songId);
			}
			return clientLyricLines;
		}

		let languageLines = null;
		function currentTrackLanguage() {
			const songId = getCurrentTrackId(), native = clientTrackLines(songId);
			const evidence = state.evidence && state.evidence.songId === songId ? state.evidence.lines : null;
			const lines = evidence && evidence.length ? evidence : native.length ? native : evidence;
			if (lines && languageLines === lines && state.language && state.language.songId === songId) return state.language;
			const eligible = lines ? core.hasJapaneseLyrics(lines) : null;
			const status = !songId ? '等待播放日语歌曲' : eligible === true ? '当前原歌词含日语' : eligible === false ?
				'当前原歌词未发现日语，已跳过注音及外部获取' : state.apiTrackId === songId && state.apiStatus.startsWith('失败') ?
				'无法确认歌词语种：' + state.apiStatus + '；已跳过外部获取' : '正在确认当前歌词语种…';
			languageLines = lines;
			return (state.language = { songId, eligible, status });
		}

		async function requireJapaneseTrack(songId) {
			ensureApiRomaji();
			if (currentTrackLanguage().eligible === null && state.apiPending) await state.apiPending;
			if (getCurrentTrackId() !== songId) throw new Error('歌曲已变化，请重新操作');
			const language = currentTrackLanguage();
			if (language.eligible !== true) throw new Error(language.status);
		}

		async function fetchRomajiMap(trackId) {
			const json = await fetchJSON(LYRIC_API + encodeURIComponent(trackId), '', { headers: { Accept: 'application/json' } });
			const lrc = json.lrc && json.lrc.lyric, roma = json.romalrc && json.romalrc.lyric;
			const original = core.parseLrc(lrc);
			const yrc = core.parseYrc(json.yrc && json.yrc.lyric);
			if (getCurrentTrackId() === trackId) {
				state.evidence = {
					songId: trackId,
					lines: [...original, ...yrc].map((l) => l.text),
					alignmentLines: (original.length >= yrc.length ? original : yrc).map((l) => l.text),
				};
			}
			if (!lrc || !roma) return new Map();
			return core.buildRomajiMap(lrc, roma);
		}

		/** 换歌了就异步拉一次音译；查表是按歌词文本，所以就算 id 拿错了也只是查不到 */
		function ensureApiRomaji() {
			const id = getCurrentTrackId();
			if (!id || id === state.apiTrackId) return;
			if (hooks.onTrackChange) hooks.onTrackChange(id);

			state.apiTrackId = id;
			state.apiRomaji = null;
			state.apiStatus = '加载中';
			state.apiPending = fetchRomajiMap(id).then(
				(map) => {
					if (state.apiTrackId !== id) return; // 已经又换歌了
					state.apiRomaji = map.size ? map : null;
					state.apiStatus = map.size ? `${map.size} 行` : '该曲无官方音译';
					if (hooks.onRomajiReady) hooks.onRomajiReady();
				},
				(err) => {
					if (state.apiTrackId !== id) return;
					state.apiRomaji = null;
					state.apiStatus = '失败：' + (err && err.message);
					console.warn(LOG, '取官方音译失败', err);
					if (hooks.onRomajiFailed) hooks.onRomajiFailed();
				}
			);
		}

		/** 歌曲原文歌词（纯文本行）；已经拉过音译接口的就直接用那份 */
		async function lyricLines(id) {
			if (state.evidence && state.evidence.songId === id) return state.evidence.lines;
			const data = await fetchJSON(LYRIC_API + encodeURIComponent(id), '歌词信息 ');
			return core.parseLrc(data.lrc && data.lrc.lyric).map((l) => l.text);
		}

		/** 歌名和歌手：先读客户端状态，拿不到再查歌曲详情接口 */
		async function trackMetadata(id) {
			try {
				const p = state.store && state.store.getState().playing;
				for (const t of p ? [p.curTrack, p.playingTrack, p.track, p.resourceTrack] : []) {
					if (!t || String(t.id || t.trackId) !== id || !t.name) continue;
					const artists = (t.ar || t.artists || []).map((a) => a.name).filter(Boolean);
					if (artists.length) return { title: t.name, artists };
				}
			} catch (_) { /* Fall back to the official song detail endpoint. */ }
			const url = DETAIL_API + encodeURIComponent(id) + '&ids=' + encodeURIComponent('[' + id + ']');
			const data = await fetchJSON(url, '歌曲信息 ');
			const t = (data.songs || []).find((song) => String(song.id) === id);
			if (!t) throw new Error('未获取到当前歌曲信息');
			return { title: t.name, artists: (t.ar || t.artists || []).map((a) => a.name).filter(Boolean) };
		}

		return {
			getCurrentTrackId, playKey, clientTrackLines, currentTrackLanguage, requireJapaneseTrack,
			ensureApiRomaji, lyricLines, trackMetadata,
		};
	}

	return { create, findReduxStore };
});
