/*
 * 日语歌词振假名 Plus (jp-furigana-plus) —— BetterNCM 插件
 *
 * 思路：
 *   1. kuromoji + IPADIC 全部打包在插件目录里，词典通过 betterncm.fs 读，完全离线。
 *   2. 歌词元素不写死选择器 —— 先试已知选择器，失败就按「哪个祖先下面的假名文本行最多」
 *      自动找歌词容器（见 findContainer）。
 *   3. 改 DOM 时把 React 原本的子节点存下来，每次重算前先还原，避免和 React 抢节点
 *      导致歌词卡住不更新（见 restore / applyWrap）。
 */
(() => {
	'use strict';

	const LOG = '[jp-furigana-plus]';
	// 改了实现就换一下，方便确认插件到底有没有被重新加载（JPFuriganaPlus.build）
	const BUILD = 'standalone-1.6.3';
	const REPO_URL = 'https://github.com/CarrotLouis/jp-furigana';
	const CONFIG_KEY = 'jp-furigana-plus.config';
	// 注音算法改了就换 key，让旧缓存自然失效
	const CACHE_KEY = 'jp-furigana-plus.cache.v4';
	const CACHE_LIMIT = 4000;

	const DEFAULTS = {
		enabled: true,
		kana: 'hiragana', // hiragana | katakana
		// romaji = 优先用网易云接口给的官方音译，拿不到或对不齐才退回词典；dict = 只用词典
		readingSource: 'romaji',
		externalProvider: 'auto', // UtaTen first, then Uta-Net
		externalAutoRetry: 'failed', // off | failed (at most three transient-error retries per load)
		externalProxyEnabled: false,
		externalProxy: '',
		externalCacheDir: '', // default: <BetterNCM data>/lyrics/jp-furigana
		rtSize: 60, // rt 相对底字的百分比
		rtOpacity: 80, // rt 不透明度百分比
		desktopEnabled: true,
		desktopInheritStyle: true,
		desktopTopmost: true,
		desktopTranslation: true,
		desktopFontSize: 36,
		desktopBounds: null,
		karaoke: true, // 逐字歌词：把注音按字符偏移分发到内部的 span，保留逐字动画
		onlyFirstLine: true, // 一行里只给原文注音，跳过翻译/罗马音
		skipCredits: true, // 跳过「作词:／编曲:」这类制作信息行
		skipNoKanaLines: true, // 跳过一个假名都没有的行（基本都是中文翻译或版权声明）
		requireLyricClass: true, // 自动检测时要求祖先 class 含 "lyric"，避免误伤歌单等界面
		customSelector: '',
		verbose: false,
	};

	// 已知的歌词行选择器，命中即用，比自动检测更稳
	const KNOWN_SELECTORS = [
		// NCM 3.1.36 实测：ul#mod_pc_lyric_record.lyric > li.line > p × 2（原文 + 翻译）
		'ul.lyric > li > p',
		'ul.lyric li p',
		'div.lyric ul li p',
		'.lyric-line, .lyric-next-p', // NCM 2.x，在 2.10.13 上实测命中，别删
		// RefinedNowPlaying：开了逐字歌词后，原文行 .rnp-lyrics-line-original 会被换成
		// .rnp-lyrics-line-karaoke（两者互斥渲染）。但离当前行 10 行以外的还是 -original，
		// 所以必须写在同一条选择器里 —— 分成两条的话会先命中那些看不见的远处行就 return 了。
		'div[class^="rnp-lyrics"] div[class^="rnp-lyrics-line-original"], div[class^="rnp-lyrics"] div[class^="rnp-lyrics-line-karaoke"]', // RefinedNowPlaying
		'div[class^="lyric-bar-inner"] div[class^="rnp-lyrics-line-original"], div[class^="lyric-bar-inner"] div[class^="rnp-lyrics-line-karaoke"]', // LyricBar
		'div[class^="lyricMainLine"]', // AMLL 类苹果歌词
	];

	// ------------------------------------------------------------------ 配置

	// 改了某项默认值就 +1，让已经存过设置的用户也跟上（见 loadConfig）
	const CONFIG_VERSION = 3;

	function loadConfig() {
		let saved = {};
		try {
			let raw = localStorage.getItem(CONFIG_KEY);
			// Copy original preferences once when Plus has no saved settings.
			// Subsequent Plus changes never overwrite the original plugin settings.
			if (raw === null) {
				const legacy = localStorage.getItem('jp-furigana.config');
				if (legacy) {
					const parsed = JSON.parse(legacy);
					if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
						raw = JSON.stringify(parsed); localStorage.setItem(CONFIG_KEY, raw);
					}
				}
			}
			saved = JSON.parse(raw) || {};
		} catch (e) {
			/* 坏了就用默认值 */
		}
		const cfg = Object.assign({}, DEFAULTS, saved);
		if (!(saved.configVersion >= 2)) {
			// v2：注音默认大一点
			cfg.rtSize = DEFAULTS.rtSize;
			cfg.migrated = true;
		}
		// v3: desktop replacement defaults on for new/older configurations.
		// An explicitly saved false remains the user's choice.
		if (!(saved.configVersion >= 3)) cfg.migrated = true;
		// 已经删掉的选项，别让旧配置里的残留值留着
		delete cfg.useJapaneseFont;
		delete cfg.font;
		delete cfg.romajiFromApi;
		// 以前用来手动加行高、免得注音被裁切；现在让位的高度是量出来的（见 calibrate），
		// 这个值只会让有注音的行凭空高一截（有人设成 3.0，21px 的行变成 63px）
		delete cfg.lineHeight;
		cfg.configVersion = CONFIG_VERSION;
		return cfg;
	}

	const config = loadConfig();
	if (config.migrated) {
		delete config.migrated;
		saveConfig(); // 只迁移一次
	}

	// 插件放在 plugins_dev 里时 BetterNCM 会置上 devMode；
	// 装成 .plugin 后想排障可以在控制台执行 localStorage['jp-furigana-plus.dev'] = '1' 再重启。
	const DEV = (() => {
		try {
			if (typeof plugin !== 'undefined' && plugin.devMode) return true;
			return localStorage.getItem('jp-furigana-plus.dev') === '1';
		} catch (e) {
			return false;
		}
	})();

	/**
	 * 这个内核认不认 ruby 排版。旧版网易云的 CEF 不认（CSS.supports('display','ruby')
	 * 是 false），它把 <rt> 当普通 block 画在底字上面 —— 看着像注音，实际每个带注音的词
	 * 白占一整个行盒（实测 21px 字号：62px vs 正常 25px），而且外面加多少边距都够不着
	 * 这块高度。这种情况下只能让注音脱离文档流，自己定位（见 updateStyles 的 fg-no-ruby）。
	 */
	let rubySupport = null;
	function hasRuby() {
		if (rubySupport !== null) return rubySupport;
		try {
			// 排障用：localStorage['jp-furigana-plus.no-ruby'] = '1' 可以强制走降级
			if (localStorage.getItem('jp-furigana-plus.no-ruby') === '1') return (rubySupport = false);
		} catch (e) {
			/* 读不到就算了 */
		}
		// 注意：不能用 CSS.supports('display','ruby') —— 不少内核明明有 ruby 排版，
		// 但 display:ruby 不是合法的作者值，照样返回 false（新版网易云就是）。只能实测：
		// 有 ruby 排版时注音只占自己那点宽度；没有时 <rt> 会退化成 block，撑满整行宽、
		// 还要多占一行高。
		try {
			if (!document.body) return true; // 还没到能量的时候，先当支持
			const probe = document.createElement('div');
			probe.style.cssText =
				'position:absolute;left:-9999px;top:-9999px;width:300px;' +
				'font-size:20px;line-height:1.2;visibility:hidden;';
			probe.innerHTML = '<ruby>漢<rt style="font-size:60%">かんじ</rt></ruby>';
			document.body.appendChild(probe);
			const rt = probe.querySelector('rt');
			const rtWidth = rt ? rt.getBoundingClientRect().width : 0;
			const height = probe.getBoundingClientRect().height;
			probe.remove();
			rubySupport = rtWidth > 0 && rtWidth < 150 && height < 20 * 1.2 * 1.9;
			log(`ruby 排版检测：注音宽 ${Math.round(rtWidth)}px，整体高 ${Math.round(height)}px → ${rubySupport ? '原生' : '降级'}`);
			return rubySupport;
		} catch (e) {
			return (rubySupport = true);
		}
	}

	function saveConfig() {
		try {
			localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
		} catch (e) {
			console.warn(LOG, '保存设置失败', e);
		}
	}

	const state = {
		betterncmVersion: null,
		store: null, // 网易云的 Redux store，用来读当前歌曲 id
		apiTrackId: null,
		apiRomaji: null, // Map: 歌词原文 -> 官方音译
		apiStatus: '未请求',
		apiPending: null,
		language: null,
		externalTrackId: null,
		externalPlayKey: null,
		externalTask: null,
		editInterrupt: null,
		externalForce: false,
		tokenizer: null,
		loading: false,
		loadError: null,
		container: null,
		matchedBy: null, // 'custom' | 'known:<selector>' | 'known:<selector>（都不可见）' | 'auto'
		applying: false,
		lineCount: 0,
		annotated: 0,
		lastPassMs: 0,
	};

	function log(...args) {
		if (config.verbose) console.log(LOG, ...args);
	}

	// ------------------------------------------------------------------ 缓存

	/** 原文行 -> 注音片段。内存 Map + localStorage 持久化。 */
	const cache = new Map();
	try {
		localStorage.removeItem('jp-furigana-plus.cache.v3'); // obsolete results could include missing readings
		const raw = JSON.parse(localStorage.getItem(CACHE_KEY));
		if (raw && typeof raw === 'object')
			for (const k of Object.keys(raw)) cache.set(k, raw[k]);
	} catch (e) {
		/* ignore */
	}

	let cacheDirty = false;
	let cacheWriteFailed = false;
	function flushCache() {
		if (!cacheDirty) return;
		cacheDirty = false;
		try {
			// 超量就只留最近写入的一批（Map 保持插入顺序）
			let entries = [...cache.entries()];
			if (entries.length > CACHE_LIMIT) {
				entries = entries.slice(entries.length - CACHE_LIMIT);
				cache.clear();
				for (const [k, v] of entries) cache.set(k, v);
			}
			localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
			cacheWriteFailed = false;
		} catch (e) {
			if (!cacheWriteFailed) {
				cacheWriteFailed = true;
				console.warn(LOG, '写入缓存失败', e);
			}
		}
	}
	setInterval(flushCache, 10000);

	function clearCache() {
		cache.clear();
		cacheDirty = false;
		try {
			localStorage.removeItem(CACHE_KEY);
		} catch (e) {
			/* ignore */
		}
	}

	function getSegments(text) {
		const key = 'd|' + config.kana + '|' + text;
		const hit = cache.get(key);
		if (hit) return hit;
		const segs = FuriganaPlusCore.tokensToSegments(FuriganaPlusCore.tokenizeForReading(state.tokenizer, text), {
			kana: config.kana,
		});
		cache.set(key, segs);
		cacheDirty = true;
		return segs;
	}

	/** 用网易云自带的音译推读音；音译缺失或对不齐都返回 null，由调用方退回词典 */
	function getSegmentsFromRomaji(text, romaji) {
		const key = 'r|' + config.kana + '|' + romaji + '|' + text;
		if (cache.has(key)) return cache.get(key);
		const kana = FuriganaPlusCore.romajiToKana(romaji);
		// 结构取自词典分词，读音取自音译；见 furigana.js 的 segmentsFromReading
		const segs = kana
			? FuriganaPlusCore.segmentsFromReading(text, kana, getSegments(text), {
					kana: config.kana,
			  })
			: null;
		cache.set(key, segs);
		cacheDirty = true;
		return segs;
	}

	// ------------------------------------------------------------------ 词典加载

	/** kuromoji 的浏览器版用 XHR 读词典；这里换成 betterncm.fs，免得依赖内置 HTTP 端口 */
	function installDictLoader() {
		globalThis.__FURIGANA_PLUS_DICT_LOADER__ = async (path) => {
			const data = await betterncm.fs.readFile(path);
			if (data instanceof ArrayBuffer) return data;
			if (data && typeof data.arrayBuffer === 'function') return data.arrayBuffer();
			if (data && data.buffer instanceof ArrayBuffer) return data.buffer;
			throw new Error('无法识别 betterncm.fs.readFile 的返回类型');
		};
	}

	/** plugin.pluginPath 正常够用，装错位置时退回几个常见路径试试 */
	async function resolveDicPath() {
		const candidates = [];
		if (typeof plugin !== 'undefined' && plugin.pluginPath)
			candidates.push(plugin.pluginPath + '/dict');
		candidates.push('./plugins_dev/jp-furigana-plus/dict');
		candidates.push('./plugins_runtime/jp-furigana-plus/dict');
		for (const c of candidates) {
			try {
				if (await betterncm.fs.exists(c + '/base.dat.gz')) return c;
			} catch (e) {
				/* 换下一个 */
			}
		}
		return candidates[0];
	}

	async function loadTokenizer() {
		if (state.tokenizer || state.loading) return;
		state.loading = true;
		state.loadError = null;
		installDictLoader();
		const dicPath = await resolveDicPath();
		console.log(LOG, '开始加载词典', dicPath);
		const t0 = performance.now();
		kuromojiFuriganaPlus.builder({ dicPath }).build((err, tokenizer) => {
			state.loading = false;
			if (err) {
				state.loadError = err;
				console.error(LOG, '词典加载失败', err);
				notifyConfigUI(); // 让设置面板把错误显示出来
				return;
			}
			state.tokenizer = tokenizer;
			console.log(LOG, `词典加载完成，耗时 ${Math.round(performance.now() - t0)}ms`);
			schedule();
			notifyConfigUI();
		});
	}

	// ------------------------------------------------------ 官方音译（接口来源）

	// 这个接口无条件返回 romalrc，和歌词页上「音」的开关无关。
	const LYRIC_API = 'https://music.163.com/api/song/lyric?lv=-1&kv=-1&tv=-1&rv=-1&id=';

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

	function nativeTrackLines(songId) {
		if (!songId || typeof FuriganaPlusDesktop === 'undefined') return [];
		const root = state.store && state.store.getState(), lyric = root && root['async:lyric'];
		if (lyric !== desktopNative || songId !== desktopNativeId) {
			desktopNative = lyric; desktopNativeId = songId;
			desktopNativeLines = FuriganaPlusDesktop.nativeTimeline(lyric, songId, FuriganaPlusCore.parseLrc);
		}
		return desktopNativeLines;
	}
	let languageLines = null;
	function currentTrackLanguage() {
		const songId = getCurrentTrackId(), native = nativeTrackLines(songId);
		const evidence = state.evidence && state.evidence.songId === songId ? state.evidence.lines : null;
		const lines = evidence && evidence.length ? evidence : native.length ? native : evidence;
		if (lines && languageLines === lines && state.language && state.language.songId === songId) return state.language;
		const eligible = lines ? FuriganaPlusCore.hasJapaneseLyrics(lines) : null;
		const status = !songId ? '等待播放日语歌曲' : eligible === true ? '当前原歌词含日语' : eligible === false ?
			'当前原歌词未发现日语，已跳过注音及外部获取' : state.apiTrackId === songId && state.apiStatus.startsWith('失败') ?
			'无法确认歌词语种：' + state.apiStatus + '；已跳过外部获取' : '正在确认当前歌词语种…';
		languageLines = lines; return state.language = { songId, eligible, status };
	}
	async function requireJapaneseTrack(songId) {
		ensureApiRomaji();
		if (currentTrackLanguage().eligible === null && state.apiPending) await state.apiPending;
		if (getCurrentTrackId() !== songId) throw new Error('歌曲已变化，请重新操作');
		const language = currentTrackLanguage();
		if (language.eligible !== true) throw new Error(language.status);
	}
	async function fetchRomajiMap(trackId) {
		const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 8000);
		try {
			const res = await fetch(LYRIC_API + encodeURIComponent(trackId), { headers: { Accept: 'application/json' }, signal:abort.signal });
			if (!res.ok) throw new Error('HTTP ' + res.status);
			const json = await res.json(), lrc = json.lrc && json.lrc.lyric, roma = json.romalrc && json.romalrc.lyric;
			const original = FuriganaPlusCore.parseLrc(lrc);
			const yrc = typeof FuriganaPlusDesktop !== 'undefined' ? FuriganaPlusDesktop.yrcTimeline(json.yrc && json.yrc.lyric) : [];
			if (getCurrentTrackId() === trackId) {
				state.evidence = { songId:trackId, lines:[...original,...yrc].map(l=>l.text), alignmentLines:(original.length>=yrc.length?original:yrc).map(l=>l.text) };
				if (typeof FuriganaPlusDesktop !== 'undefined') state.desktopLyrics = { songId:trackId,
					lines:original.length ? FuriganaPlusDesktop.lrcTimeline(lrc, json.tlyric && json.tlyric.lyric, FuriganaPlusCore.parseLrc, json.yrc && json.yrc.lyric, roma) : yrc };
			}
			if (!lrc || !roma) return new Map();
			return FuriganaPlusCore.buildRomajiMap(lrc, roma);
		} finally { clearTimeout(timer); }
	}

	/** 换歌了就异步拉一次音译；查表是按歌词文本，所以就算 id 拿错了也只是查不到 */
	function ensureApiRomaji() {
		const id = getCurrentTrackId();
		if (!id || id === state.apiTrackId) return;
		if (state.externalTrackId && state.externalTrackId !== id) resetExternal();

		state.apiTrackId = id;
		state.apiRomaji = null;
		state.apiStatus = '加载中';
		state.apiPending = fetchRomajiMap(id).then(
			(map) => {
				if (state.apiTrackId !== id) return; // 已经又换歌了
				state.apiRomaji = map.size ? map : null;
				state.apiStatus = map.size ? `${map.size} 行` : '该曲无官方音译';
				invalidateAll(); // 之前按词典注过的行要重做
				schedule(0);
				notifyConfigUI();
			},
			(err) => {
				if (state.apiTrackId !== id) return;
				state.apiRomaji = null;
				state.apiStatus = '失败：' + (err && err.message);
				console.warn(LOG, '取官方音译失败', err);
				notifyConfigUI();
			}
		);
	}

	// ------------------------------------------------------ 外部网站（按需联网）
	let externalClient = null, desktop = null;
	let editor = null, playPending = false, playPendingTarget = null, editPreparing = false, editEntry = 0;
	let alignmentNative = null, alignmentOriginals = null;
	function currentOriginalLines(id) {
		if(id!==getCurrentTrackId())return null;
		const evidence=state.evidence && state.evidence.songId===id ? state.evidence : null;
		if(evidence && evidence.alignmentLines && evidence.alignmentLines.length)return evidence.alignmentLines;
		const native=nativeTrackLines(id);
		if(!native.length)return evidence && evidence.lines || null;
		if(native!==alignmentNative){alignmentNative=native;alignmentOriginals=native.map(l=>l.text);}
		return alignmentOriginals;
	}
	function getExternalClient() {
		if (!externalClient && typeof FuriganaPlusExternal !== 'undefined') {
			externalClient = FuriganaPlusExternal.create({
				...FuriganaPlusExternal.browserTransport(betterncm, plugin),
				originalLines:currentOriginalLines,
				lyrics: async id => {
					if (state.evidence && state.evidence.songId === id) return state.evidence.lines;
					const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 8000);
					try { const response = await fetch(LYRIC_API + encodeURIComponent(id), { signal: abort.signal }); if (!response.ok) throw new Error('歌词信息 HTTP ' + response.status); const data = await response.json(); return FuriganaPlusCore.parseLrc(data.lrc && data.lrc.lyric).map(l=>l.text); }
					finally { clearTimeout(timer); }
				},
				onReady: () => { invalidateAll(); schedule(0); notifyConfigUI(); },
				onInvalidated: id => {
					if (state.externalTrackId === id) { state.externalTrackId = null; state.externalPlayKey = null; state.editInterrupt = null; editEntry++; }
				},
				onStatus: () => notifyConfigUI(),
			});
		}
		return externalClient;
	}
	async function currentTrackMetadata(id) {
		try {
			const p = state.store && state.store.getState().playing;
			for (const t of p ? [p.curTrack, p.playingTrack, p.track, p.resourceTrack] : []) {
				if (!t || String(t.id || t.trackId) !== id || !t.name) continue;
				const artists = (t.ar || t.artists || []).map(a => a.name).filter(Boolean);
				if (artists.length) return { title: t.name, artists };
			}
		} catch (_) { /* Fall back to the official song detail endpoint. */ }
		const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 8000);
		try {
			const url = 'https://music.163.com/api/song/detail/?id=' + encodeURIComponent(id) + '&ids=' + encodeURIComponent('[' + id + ']');
			const response = await fetch(url, { signal: abort.signal });
			if (!response.ok) throw new Error('歌曲信息 HTTP ' + response.status);
			const data = await response.json();
			const t = (data.songs || []).find(song => String(song.id) === id);
			if (!t) throw new Error('未获取到当前歌曲信息');
			return { title: t.name, artists: (t.ar || t.artists || []).map(a => a.name).filter(Boolean) };
		} finally { clearTimeout(timer); }
	}
	function resetExternal() {
		state.externalTrackId = null;
		state.externalPlayKey = null; state.editInterrupt = null;
		if (externalClient) externalClient.stop();
	}
	function externalPlayKey(id = getCurrentTrackId()) {
		const p = state.store && state.store.getState().playing;
		return id + '|' + (p && p.playId || '');
	}
	function ensureExternal() {
		if (config.readingSource !== 'external' || editPreparing) return;
		const id = getCurrentTrackId();
		if (playPending && playPendingTarget === id) return;
		if (currentTrackLanguage().eligible !== true) { if (state.externalTrackId) resetExternal(); return; }
		const playKey = externalPlayKey(id);
		if (!id || id === state.externalTrackId && state.externalPlayKey === playKey) return;
		const client = getExternalClient();
		if (!client) return;
		state.externalTrackId = id;
		state.externalPlayKey = playKey;
		invalidateAll();
		const force = state.externalForce; state.externalForce = false;
		state.externalTask = client.load(id, () => currentTrackMetadata(id), config, force);
	}

	// ------------------------------------------------------------------ 文本工具

	/**
	 * RefinedNowPlaying 的「滑动」逐字动画里，每个词渲染两份文本：本体 +
	 * 一个绝对定位、用遮罩做高亮的 .rnp-karaoke-word-filler 副本。
	 * 读文本时必须忽略副本，否则整行会重复一遍，分词和偏移全错。
	 */
	/** 我们注上去的读音：有 ruby 排版时是 <rt>，降级时是 <span class="fg-rt"> */
	function isAnnotation(node) {
		if (!node || node.nodeType !== 1) return false;
		const n = node.nodeName;
		if (n === 'RT' || n === 'RP') return true;
		return !!(node.classList && node.classList.contains('fg-rt'));
	}

	function isFiller(node) {
		return (
			node &&
			node.nodeType === 1 &&
			node.classList &&
			node.classList.contains('rnp-karaoke-word-filler')
		);
	}

	/** 元素的「原文」：忽略我们注上去的 rt / rp，以及 RNP 的 filler 副本 */
	function plainText(el) {
		if (isFiller(el) || isAnnotation(el)) return '';
		let out = '';
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
			acceptNode(node) {
				for (let p = node.parentNode; p && p !== el; p = p.parentNode) {
					if (isAnnotation(p) || isFiller(p)) return NodeFilter.FILTER_REJECT;
				}
				return NodeFilter.FILTER_ACCEPT;
			},
		});
		while (walker.nextNode()) out += walker.currentNode.nodeValue;
		return out;
	}

	function hasText(el) {
		return plainText(el).trim().length > 0;
	}

	/** 这一行要不要跳过（不注音）。制作信息的判定见 furigana.js 的 isCreditLine */
	function shouldSkipLine(text) {
		if (config.skipCredits && FuriganaPlusCore.isCreditLine(text)) return true;
		if (config.skipNoKanaLines && !FuriganaPlusCore.hasKana(text)) return true;
		return false;
	}

	const displayCache = new WeakMap();
	function isBlock(el) {
		if (displayCache.has(el)) return displayCache.get(el);
		let block = true;
		try {
			// inline-block 在逐字歌词里通常是「一个字」，算行内
			const d = getComputedStyle(el).display;
			block = !/^(inline|inline-block|ruby|ruby-text|contents)$/.test(d);
		} catch (e) {
			/* 元素已脱离文档 */
		}
		displayCache.set(el, block);
		return block;
	}

	/**
	 * 元素是不是真的看得见。有的第三方歌词插件（refined-now-playing-netease-next）
	 * 会把网易云原生的播放页整个留在 DOM 里、只用 visibility/opacity 藏起来，
	 * 不看可见性的话我们会把注音全加在那份看不见的歌词上，屏幕上一个字都不显示。
	 */
	let visCache = new Map(); // 每轮 collectLines 清一次，别缓存过夜
	function isVisible(el) {
		if (!el || el.nodeType !== 1) return false;
		let s;
		try {
			s = getComputedStyle(el);
		} catch (e) {
			return true; // 拿不到就当可见，宁可多注也别漏注
		}
		if (!s) return true;
		// visibility 会继承，看自己这一份就够；display / opacity 不继承，祖先得单独走
		if (s.visibility === 'hidden' || s.visibility === 'collapse') return false;
		if (s.display === 'none' || s.opacity === '0') return false;
		return ancestorsVisible(el.parentElement);
	}

	function ancestorsVisible(el) {
		if (!el || el.nodeType !== 1 || el === document.body) return true;
		if (visCache.has(el)) return visCache.get(el);
		let ok = true;
		try {
			const s = getComputedStyle(el);
			if (s && (s.display === 'none' || s.opacity === '0')) ok = false;
		} catch (e) {
			/* 拿不到就当可见 */
		}
		if (ok) ok = ancestorsVisible(el.parentElement);
		visCache.set(el, ok);
		return ok;
	}

	// ------------------------------------------------------------------ 歌词元素定位

	/**
	 * 自动找歌词容器：统计所有含假名的文本节点，给它们的每一级祖先计票，
	 * 票数最多（并列时取最深）的那个就是歌词列表。
	 */
	function findContainer() {
		const votes = new Map();
		const depth = new Map();
		const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
		let node;
		while ((node = walker.nextNode())) {
			const text = node.nodeValue;
			if (!text || text.length < 2 || text.length > 120) continue;
			if (!FuriganaPlusCore.hasKana(text)) continue;
			if (!isVisible(node.parentElement)) continue; // 藏起来的原生播放页不参与投票
			let d = 0;
			for (let p = node.parentElement; p && p !== document.body; p = p.parentElement) {
				votes.set(p, (votes.get(p) || 0) + 1);
				if (!depth.has(p)) depth.set(p, d);
				d++;
			}
		}

		let best = null;
		let bestScore = 0;
		votes.forEach((count, el) => {
			if (count < 3) return;
			if (config.requireLyricClass && !looksLyricish(el)) return;
			// 票数优先，票数相同取更深（更贴近歌词列表本身）
			const score = count * 1000 - (depth.get(el) || 0);
			if (score > bestScore) {
				bestScore = score;
				best = el;
			}
		});
		return best;
	}

	function looksLyricish(el) {
		for (let p = el; p && p !== document.body; p = p.parentElement) {
			const cls = typeof p.className === 'string' ? p.className : '';
			if (/lyric|歌词/i.test(cls + ' ' + (p.id || ''))) return true;
		}
		return false;
	}

	/** 容器里的「行」：递归下钻到块级的最小单位 */
	function linesIn(el, depth) {
		if (depth > 4) return [el];
		const blocks = [];
		for (const child of el.children) {
			if (child.nodeName === 'RUBY' || child.classList.contains('fg-line')) continue;
			if (isBlock(child) && hasText(child)) blocks.push(child);
		}
		if (!blocks.length) return [el];
		const out = [];
		for (const b of blocks) out.push(...linesIn(b, depth + 1));
		return out;
	}

	/** 返回本次要处理的行元素 */
	function collectLines() {
		visCache.clear();
		if (config.customSelector) {
			const found = [...document.querySelectorAll(config.customSelector)];
			if (found.length) {
				state.matchedBy = 'custom';
				return found;
			}
		}

		// 同时装了别的歌词插件时，页面上可能有好几份歌词 DOM（一份是被藏起来的原生页）。
		// 所以命中还不够，得至少有两行是真看得见的；一份都看不见时才退回原来的行为。
		let hidden = null;
		for (const sel of KNOWN_SELECTORS) {
			let found;
			try {
				found = [...document.querySelectorAll(sel)];
			} catch (e) {
				continue;
			}
			found = found.filter(hasText);
			if (found.length < 2) continue;
			let n = 0;
			for (const el of found) if (isVisible(el) && ++n >= 2) break;
			if (n >= 2) {
				state.matchedBy = 'known:' + sel;
				return dedupeByParent(found);
			}
			if (!hidden) hidden = { sel, found };
		}
		if (hidden) {
			state.matchedBy = 'known:' + hidden.sel + '（都不可见）';
			return dedupeByParent(hidden.found);
		}

		if (!state.container || !state.container.isConnected) state.container = findContainer();
		if (!state.container) {
			state.matchedBy = null;
			return [];
		}
		state.matchedBy = 'auto';

		const out = [];
		for (const child of state.container.children) {
			if (!hasText(child)) continue;
			const lines = linesIn(child, 0);
			if (config.onlyFirstLine) out.push(lines[0]);
			else out.push(...lines);
		}
		return out;
	}

	/** onlyFirstLine：同一个父元素下的多行（原文/翻译/罗马音）只留第一行 */
	function dedupeByParent(lines) {
		if (!config.onlyFirstLine) return lines;
		const seen = new Set();
		return lines.filter((el) => {
			const p = el.parentElement;
			if (!p) return true;
			if (seen.has(p)) return false;
			seen.add(p);
			return true;
		});
	}

	// ------------------------------------------------------------------ DOM 改写

	function restore(host) {
		const wrap = host.__fgWrap;
		if (wrap && wrap.parentNode === host) {
			wrap.remove();
			// 只有当 React 没有自己重建过内容时，才把原来的节点放回去
			if (!host.hasChildNodes() && host.__fgOrig && host.__fgOrig.length)
				host.append(...host.__fgOrig);
		}
		host.__fgWrap = null;
	}

	function buildWrap(segments, cls) {
		const wrap = document.createElement('span');
		wrap.className = cls || 'fg-line';
		for (const seg of segments) {
			if (seg.hidden) {
				// 作词者自带注音的括号「漢字（かな）」：注音已经标在汉字上了，括号藏起来。
				// 文字还在 DOM 里，plainText 读出来仍是原文
				const hide = document.createElement('span');
				hide.className = 'fg-hide';
				hide.style.display = 'none';
				hide.textContent = seg.text;
				wrap.appendChild(hide);
			} else if (seg.rt || seg.edit) {
				// 每个注音单独套一层 inline-block：整行改写时 .fg-line 是 display:inline，
				// 上下边距对它不起作用，没法把行盒多出来的高度收回去（见 calibrate）
				const holder = document.createElement('span');
				holder.className = 'fg-ruby';
				holder.__fgBase = seg.text;
				if (seg.edit) { holder.__fgEdit = seg.edit; holder.dataset.fgEditable = 'true'; }
				const rt = document.createElement('span');
				rt.className = 'fg-rt';
				rt.textContent = seg.rt || '';
				if (hasRuby()) {
					// 有 ruby 排版就用真 ruby，断行、避让都交给内核
					const ruby = document.createElement('ruby');
					ruby.appendChild(document.createTextNode(seg.text));
					const realRt = document.createElement('rt');
					realRt.className = 'fg-rt';
					realRt.textContent = seg.rt || '';
					ruby.appendChild(realRt);
					holder.appendChild(ruby);
				} else {
					// 降级：<rt> 在这种内核里连 position 都不认（实测 position 写了没用），
					// 所以干脆不用 ruby/rt，底字直接放，注音用普通 span 绝对定位
					holder.appendChild(document.createTextNode(seg.text));
					holder.appendChild(rt);
				}
				const annotation = holder.querySelector('.fg-rt'); annotation.textContent = '';
				const stack = document.createElement('span'); stack.className = 'fg-edit-stack';
				const current = document.createElement('span'); current.className = 'fg-reading'; current.textContent = seg.rt || '';
				stack.append(current);
				if (seg.originalRt != null) {
					current.classList.add('fg-edit-custom');
					const original = document.createElement('del'); original.className = 'fg-edit-original'; original.textContent = seg.originalRt || '未注音';
					stack.append(original);
				}
				annotation.append(stack);
				wrap.appendChild(holder);
			} else {
				wrap.appendChild(document.createTextNode(seg.text));
			}
		}
		return wrap;
	}

	function applyWrap(host, segments, cls) {
		host.__fgOrig = [...host.childNodes];
		const wrap = buildWrap(segments, cls);
		host.replaceChildren(wrap);
		host.__fgWrap = wrap;
	}

	/** 把这一行上所有改动（宿主 / filler 副本 / 行本身）还原成 React 的原样 */
	function restoreLine(line) {
		line.__fgSpacingVersion = 0;
		if (line.__fgHosts) for (const h of line.__fgHosts) restore(h);
		if (line.__fgMirrors) for (const m of line.__fgMirrors) restore(m);
		restore(line);
		line.__fgHosts = null;
		line.__fgMirrors = null;
	}

	/**
	 * 宿主同一个词里的 filler 副本。副本要跟着注音一起改，
	 * 不然加了 ruby 的本体变宽、副本没变，滑动高亮就会和字对不上。
	 */
	function fillerTwins(host) {
		const word = host.parentElement;
		if (!word || !word.classList || !word.classList.contains('rnp-karaoke-word')) return [];
		return [...word.children].filter((c) => c !== host && isFiller(c));
	}

	// 合并跨度上限：再长就不并了，免得把半行糊成一个词、逐字动画整段一起亮
	const MAX_MERGE = 8;

	/**
	 * 逐字歌词把一个词拆成好几个 span 时（网易云的 yrc 对汉字常常是一字一个），
	 * 注音会跨 span。每个 span 都是独立的 inline-block，ruby 只能落在第一个上，
	 * 那个盒子被注音撑宽、后面的字被挤开，看着就是「注音跑到字左边、字之间裂开」。
	 * 所以把被注音跨过的几个 span 合成一组：组里第一个承载整段带注音的内容，
	 * 其余的清空（清空的 span 还在，逐字动画和 RNP 按下标取的动画目标都不受影响，
	 * 只是并进来的那几个字跟着头一个字的时间一起亮）。
	 */
	function groupHosts(hosts, lens, segments) {
		// 落在注音词内部的位置 = 不能从这里切开
		const unsafe = new Set();
		let p = 0;
		for (const seg of segments) {
			const start = p;
			p += seg.text.length;
			if (!seg.rt) continue;
			for (let i = start + 1; i < p; i++) unsafe.add(i);
		}

		const groups = [];
		let cur = null;
		let pos = 0;
		for (let i = 0; i < hosts.length; i++) {
			if (!cur) cur = { hosts: [], from: pos, to: pos };
			cur.hosts.push(hosts[i]);
			pos += lens[i];
			cur.to = pos;
			const straddles = unsafe.has(pos) && cur.to - cur.from < MAX_MERGE;
			if (straddles && i < hosts.length - 1) continue; // 切在词中间，把下一个也并进来
			groups.push(cur);
			cur = null;
		}
		if (cur) groups.push(cur);
		return groups;
	}

	/** 取 segments 在 [from, to) 区间内的部分；被切断的注音只保留在起始那一段上 */
	function sliceSegments(segments, from, to) {
		const out = [];
		let pos = 0;
		for (const seg of segments) {
			const start = pos;
			const end = pos + seg.text.length;
			pos = end;
			if (end <= from || start >= to) continue;
			const a = Math.max(start, from);
			const b = Math.min(end, to);
			const text = seg.text.slice(a - start, b - start);
			if (!text) continue;
			// 注音只在完整包含、或至少包含词首的那一段上保留
			const keepRt = seg.rt && a === start;
			if (keepRt || seg.edit && a === start) out.push({ ...seg, text });
			else if (seg.hidden) out.push({ text, hidden: true });
			else out.push({ text });
		}
		return out;
	}

	/** 找出行内部真正承载文字的行内叶子（逐字歌词的每个 span） */
	function inlineLeaves(el, depth, out) {
		out = out || [];
		if (depth > 4) {
			out.push(el);
			return out;
		}
		const kids = [...el.children].filter((c) => hasText(c));
		if (!kids.length) {
			if (hasText(el)) out.push(el);
			return out;
		}
		for (const k of kids) inlineLeaves(k, depth + 1, out);
		return out;
	}

	/**
	 * 我们改写宿主时，React 原来的子节点被摘下来存进 __fgOrig。
	 * React 之后如果只是改这些（已脱离文档的）文本节点的内容——歌词列表复用行元素时
	 * 就会这样——MutationObserver 收不到通知，界面会卡在旧歌词上。
	 * 所以直接读这些节点的文字，和记录的原文比一下就能发现。
	 */
	function hostsText(line) {
		let out = '';
		for (const h of line.__fgHosts || [])
			for (const n of h.__fgOrig || []) out += n.textContent;
		return out;
	}

	function isClean(line) {
		if (line.__fgText == null || line.__fgDirty) return false;
		const hosts = line.__fgHosts;
		if (!hosts) return false;
		// 没注音的行我们没动过，直接读现在的文字就是真相
		if (!hosts.length) return plainText(line) === line.__fgText;
		for (const h of hosts) {
			if (!h.isConnected) return false;
			if (!h.__fgWrap || h.__fgWrap.parentNode !== h) return false;
			if (h.childNodes.length !== 1) return false;
		}
		// filler 副本不参与文字比对（它的内容是重复的），只确认还挂着
		for (const m of line.__fgMirrors || []) {
			if (!m.isConnected) return false;
			if (!m.__fgWrap || m.__fgWrap.parentNode !== m) return false;
		}
		return hostsText(line) === line.__fgText;
	}

	// Both views resolve readings here so website data and user corrections cannot
	// diverge between the playing page and the desktop window.
	function resolveReadings(text) {
		if (getCurrentTrackId() && currentTrackLanguage().eligible !== true) return { segments:[{text}], source:null };
		if (!state.tokenizer || shouldSkipLine(text)) return { segments:[{text}], source:null };
		let segments = null, source = 'dict';
		if (config.readingSource === 'external' && externalClient && state.externalTrackId === getCurrentTrackId()) {
			segments = externalClient.segments(text, config.kana, getSegmentsFromRomaji);
			if (segments) source = 'external';
		}
		if(!segments && !FuriganaPlusCore.hasKanji(text))return {segments:[{text}],source:null};
		if (!segments && (config.readingSource === 'romaji' || config.readingSource === 'external') && state.apiRomaji) {
			const romaji = state.apiRomaji.get(FuriganaPlusCore.lyricKey(text));
			if (romaji) { segments = getSegmentsFromRomaji(text, romaji); if (segments) source = 'romaji'; }
		}
		if (!segments) segments = getSegments(text);
		if (source !== 'external' && externalClient && state.externalTrackId === getCurrentTrackId()) segments = externalClient.fallbackSegments(text, segments, config.kana);
		return {segments, source};
	}
	function processLine(line) {
		// 先把之前改过的地方全部还原，让 React 的最新内容显形
		restoreLine(line);
		line.__fgDirty = false;

		const text = plainText(line);
		if (!text.trim()) {
			line.__fgText = text;
			return false;
		}
		if (shouldSkipLine(text)) {
			line.__fgText = text;
			line.__fgHosts = [];
			return false;
		}
		if (!FuriganaPlusCore.hasKanji(text) && config.readingSource !== 'external') {
			line.__fgText = text;
			line.__fgHosts = [];
			return false;
		}

		// 外部模式先用核对过原文的网站读音；尚未匹配的行才回退到官方音译 / 词典。
		// 官方音译也可能有误；只认接口来源，和歌词页上「音」的开关无关。
		const { segments, source } = resolveReadings(text);

		if (!segments.some((s) => s.rt || editor && editor.isEnabled() && s.edit)) {
			line.__fgText = text;
			line.__fgHosts = [];
			line.__fgSource = null;
			return false;
		}
		line.__fgSource = source;

		let hosts = [line];
		let lens = [text.length];
		if (config.karaoke) {
			const leaves = inlineLeaves(line, 0);
			const sizes = leaves.map((el) => plainText(el).length);
			const total = sizes.reduce((n, len) => n + len, 0);
			// 只有叶子文本刚好拼成整行时才分发，否则偏移会错位
			if (leaves.length > 1 && total === text.length) {
				hosts = leaves;
				lens = sizes;
			}
		}

		// 逐字宿主是一个个 inline-block，注音撑不高它们的行盒（见样式里的 .fg-word）
		const cls = hosts[0] === line ? 'fg-line' : 'fg-line fg-word';

		const mirrors = [];
		for (const group of groupHosts(hosts, lens, segments)) {
			const segs = sliceSegments(segments, group.from, group.to);
			for (let i = 0; i < group.hosts.length; i++) {
				const host = group.hosts[i];
				// 整段内容放在组里第一个 span 上，其余清空
				const mine = i === 0 ? segs : [];
				applyWrap(host, mine, cls);
				for (const twin of fillerTwins(host)) {
					applyWrap(twin, mine, cls);
					mirrors.push(twin);
				}
			}
		}

		line.__fgText = text;
		line.__fgHosts = hosts;
		line.__fgMirrors = mirrors;
		return true;
	}

	function removeAll(lines) {
		for (const line of lines || []) {
			restoreLine(line);
			line.__fgText = null;
		}
	}

	// ------------------------------------------------------------------ 主循环

	let lastLines = [];
	let lastLogSig = null; // 结果没变就别每次调度都刷一条 pass 日志

	function invalidateAll() {
		for (const line of lastLines) line.__fgDirty = true;
	}

	function pass() {
		if (editor) editor.sync();
		if (!config.enabled) return;
		const t0 = performance.now();
		try {
			ensureApiRomaji();
		} catch (e) {
			console.warn(LOG, '检查官方音译失败', e);
		}
		if (!state.tokenizer) return;
		state.applying = true;
		try {
			const lines = collectLines().filter(Boolean);
			state.lineCount = lines.length;

			// 整首歌都没有假名 → 大概不是日语歌，不动它。
			// 制作信息行里的假名（「大原ゆい子」）不算，否则中文歌也会被判成日语歌。
			const japanese = getCurrentTrackId() ? currentTrackLanguage().eligible === true : FuriganaPlusCore.hasJapaneseLyrics(lines.map(plainText));
			if (!japanese) {
				if (state.externalTrackId) resetExternal();
				removeAll(lastLines);
				lastLines = [];
				state.annotated = 0;
				state.srcRomaji = state.srcDict = state.srcExternal = 0;
				return;
			}
			ensureExternal();

			// 这一轮不在列表里的行，把改动撤掉
			const set = new Set(lines);
			removeAll(lastLines.filter((l) => !set.has(l)));

			let annotated = 0;
			let changed = 0;
			for (const line of lines) {
				if (isClean(line)) {
					if (line.__fgHosts.length) annotated++;
					continue;
				}
				const had = !!(line.__fgHosts && line.__fgHosts.length);
				try {
					if (processLine(line)) {
						annotated++;
						changed++;
					} else if (had) {
						changed++; // 之前有注音、现在没了，行高同样会变
					}
					line.__fgErrMsg = null;
				} catch (e) {
					// 同一行反复抛同样的错就只报一次，不然逐字歌词场景下会一直刷
					const msg = String((e && e.message) || e);
					if (line.__fgErrMsg !== msg) {
						line.__fgErrMsg = msg;
						console.warn(LOG, '处理歌词行失败', e, line);
					}
					line.__fgText = plainText(line);
					line.__fgHosts = [];
				}
			}
			if (changed) {
				resetCalibration(); // 换歌/换行了，重新量一次
				requestRecalc();
			}
			spaceAnnotations(lines);
			calibrate();
			state.annotated = annotated;
			const previousSources = [state.srcRomaji, state.srcDict, state.srcExternal].join('|');
			state.srcRomaji = lines.filter((l) => l.__fgSource === 'romaji').length;
			state.srcDict = lines.filter((l) => l.__fgSource === 'dict').length;
			state.srcExternal = lines.filter((l) => l.__fgSource === 'external').length;
			lastLines = lines;
			if (previousSources !== [state.srcRomaji, state.srcDict, state.srcExternal].join('|')) notifyConfigUI();
		} finally {
			// MutationObserver 的回调在本次同步任务结束后才跑，光靠 applying 标志挡不住
			// 我们自己造成的变更；把记录队列清空，否则会自激成死循环。
			if (state.observer) state.observer.takeRecords();
			state.applying = false;
			state.lastPassMs = Math.round(performance.now() - t0);
			const sig = `${state.lineCount}|${state.annotated}|${state.matchedBy}`;
			if (sig !== lastLogSig) {
				lastLogSig = sig;
				log(`pass ${state.lastPassMs}ms lines=${state.lineCount} annotated=${state.annotated} by=${state.matchedBy}`);
			}
		}
	}

	/**
	 * 逐字宿主要给注音让出多少高度：正数往外让（注音戳出盒子的情况），
	 * 负数把多让的收回来（注音已经算进盒子高度的情况）。写死一个值总有一边不对，
	 * 所以量现场：注音上边离行盒上边的空隙 gap，目标是贴着顶留 1px。
	 * 差多少就往 --fg-word-offset 上补多少（1:1，一两轮就收敛）。
	 */
	/*
	 * 只管逐字歌词这一套：宿主是一个个词的 span，外面是 RNP 的 .rnp-karaoke-word
	 * （inline-block），注音的高度撑不到外层行盒，得自己让。整行改写的普通行不用管 ——
	 * 那是普通块，浏览器自己会把行撑开。
	 *
	 * 让位必须加在**每个**宿主上（.fg-word 不分有没有注音都加），不能只加在带注音的
	 * 那一个上：inline-block 的 padding 会把里面的字整体压下去，只给一部分加，
	 * 那个字就比左右邻居低一截（实测低 15px）。
	 */
	const CALIBRATIONS = [
		{
			key: 'word',
			isMine: (line) => line.__fgHosts[0] !== line,
			vars: ['--fg-word-offset', '--fg-word-tail'],
			top: 0,
			tail: 0,
			tries: 0,
		},
	];
	const CALIBRATE_MAX = 8;

	function applyWordOffset() {
		try {
			const root = document.documentElement.style;
			for (const c of CALIBRATIONS) {
				root.setProperty(c.vars[0], c.top.toFixed(3) + 'em');
				root.setProperty(c.vars[1], c.tail.toFixed(3) + 'em');
			}
		} catch (e) {
			/* 没有 documentElement 就算了 */
		}
	}

	function resetCalibration() {
		for (const c of CALIBRATIONS) c.tries = 0;
	}

	/**
	 * 量这一行：注音上边离行盒上边多远、行盒多高、注音多高。量不到就 null。
	 * RNP 给每行挂了 `transform: scale()`，getBoundingClientRect 是缩放后的尺寸、
	 * offsetHeight 不是（RNP 自己排版也用 clientHeight），拿两者的比值换算回去，
	 * 否则拿当前行（放大）和远处的行（缩小）比会得出胡说八道的结论。
	 */
	function annotationGap(line) {
		const rt = line.querySelector('.fg-rt');
		if (!rt) return null;
		try {
			const lb = line.getBoundingClientRect();
			const tb = rt.getBoundingClientRect();
			const fs = parseFloat(getComputedStyle(line).fontSize);
			const h = line.offsetHeight;
			if (!lb.height || !tb.height || !fs || !h) return null; // 没有排版信息（离线测试）
			const scale = lb.height / h;

			// 注音和底字的关系：>0 说明压在底字上了。降级模式下注音是绝对定位的，
			// 内核不会自动把它放到底字上方，得靠这个值把 padding 调够。
			let overlap = null;
			let holder = rt.parentElement;
			while (holder && !(holder.classList && holder.classList.contains('fg-ruby')))
				holder = holder.parentElement;
			if (holder) {
				const range = document.createRange();
				range.selectNodeContents(holder);
				range.setEndBefore(rt);
				const base = range.getBoundingClientRect();
				if (base && base.height) overlap = (tb.bottom - base.top) / scale;
			}

			return {
				gap: (tb.top - lb.top) / scale,
				overlap,
				fontSize: fs,
				lineHeight: h,
				rtHeight: tb.height / scale,
			};
		} catch (e) {
			return null;
		}
	}

	// 量高度的候选最多看这么多条，别为了校准把整页都 reflow 一遍
	const SAMPLE_LIMIT = 10;

	/** 取最矮的一条：折行的行会高出一整行，拿来比会得出错误的目标 */
	function shortest(lines) {
		let best = null;
		let n = 0;
		for (const l of lines) {
			if (++n > SAMPLE_LIMIT) break;
			let h;
			try {
				h = l.offsetHeight; // 避开 transform: scale()
			} catch (e) {
				continue;
			}
			if (!h) continue;
			if (!best || h < best.h) best = { line: l, h };
		}
		return best;
	}

	/**
	 * 拿同一份歌词里「没有注音的那些行」当基准 —— 它们就是这套 CSS 下一行该有多高。
	 * 有注音的行应该正好高出一个注音的高度，多出来的都是白占的。
	 */
	function referenceHeight(sample) {
		const plain = lastLines.filter(
			(l) => l !== sample && l.__fgHosts && !l.__fgHosts.length && !l.querySelector('.fg-rt')
		);
		// 优先找结构一样的（逐字行比逐字行），没有就退而求其次用任意一条没注音的行
		const best =
			shortest(plain.filter((l) => l.className === sample.className)) || shortest(plain);
		if (best) {
			try {
				const fs = parseFloat(getComputedStyle(best.line).fontSize);
				if (fs) return best.h / fs; // 换成 em，字号不同也能比
			} catch (e) {
				/* 往下走兜底 */
			}
		}
		// 整首歌每一行都有注音时就没有基准行了 —— 退回 CSS 里写的 line-height，
		// 那本来就是「一行该有多高」（RNP 明确写了 1.2 / 1.5，不是 normal）
		try {
			const cs = getComputedStyle(sample);
			const lh = parseFloat(cs.lineHeight);
			const fs = parseFloat(cs.fontSize);
			if (lh && fs) return lh / fs;
		} catch (e) {
			/* 真拿不到就放弃 */
		}
		return null;
	}

	/** 这个上下文当前拿来量的那一行（取最矮的，避开折行的） */
	function calibrationSample(c) {
		const best = shortest(
			lastLines.filter(
				(l) => l.__fgHosts && l.__fgHosts.length && c.isMine(l) && l.querySelector('.fg-rt')
			)
		);
		return best && best.line;
	}

	function calibrate() {
		// 降级模式下注音是绝对定位的，不占高度也没有可调的抓手（那种内核里
		// inline-block 的 margin 不参与行盒、padding 又会把字压下去），不用校准
		if (!hasRuby()) return;
		for (const c of CALIBRATIONS) {
			if (c.tries >= CALIBRATE_MAX) continue;
			const line = calibrationSample(c);
			if (!line) continue;
			const m = annotationGap(line);
			if (!m) continue;

			// 注音贴着行盒顶，留 1px
			const dTop = m.gap - 1;
			if (Math.abs(dTop) > 1.5) {
				c.tries++;
				c.top = clampEm(c.top - dTop / m.fontSize);
				applyWordOffset();
				log(
					`校准[${c.key}] 顶：gap=${Math.round(m.gap)}px` +
						(m.overlap == null ? '' : ` 压字=${Math.round(m.overlap)}px`) +
						` → ${c.vars[0]}: ${c.top}em`
				);
				schedule(60);
				continue;
			}

			// 2) 底：整行应该只比没注音的行高出一个注音，多的收掉
			const refEm = referenceHeight(line);
			if (refEm == null) {
				c.tries = CALIBRATE_MAX; // 没有基准行可比，就到这儿
				continue;
			}
			const wantPx = refEm * m.fontSize + m.rtHeight + 1;
			const dBottom = m.lineHeight - wantPx;
			if (Math.abs(dBottom) > 1.5) {
				c.tries++;
				c.tail = clampEm(c.tail - dBottom / m.fontSize);
				applyWordOffset();
				log(
					`校准[${c.key}] 底：行高 ${Math.round(m.lineHeight)}px，基准 ` +
						`${Math.round(refEm * m.fontSize)}px + 注音 ${Math.round(m.rtHeight)}px → ` +
						`${c.vars[1]}: ${c.tail}em`
				);
				schedule(60);
				continue;
			}

			c.tries = CALIBRATE_MAX; // 这个上下文两头都对上了
		}
	}

	function clampEm(v) {
		return Math.max(-2, Math.min(2, Math.round(v * 1000) / 1000));
	}

	/**
	 * RefinedNowPlaying 是自己算每行的位移来滚动的，行高只在歌词/字号/设置变化时量一次。
	 * 我们插进去的注音会让行变高，它手里的还是旧高度，于是行与行会叠在一起。
	 * 它自己留了 recalc-lyrics 这个 window 事件用来强制重量，借用一下。
	 */
	let lastRecalc = 0;
	function requestRecalc() {
		if (!/rnp|lyric-bar/.test(state.matchedBy || '')) return;
		const now = performance.now();
		if (now - lastRecalc < 400) return; // 连着换行时别一直发
		lastRecalc = now;
		// 放到本次 pass 之后再发，免得它同步改的 DOM 被我们的 takeRecords() 吞掉
		setTimeout(() => {
			try {
				window.dispatchEvent(new Event('recalc-lyrics'));
			} catch (e) {
				/* 没这个插件就没人听 */
			}
		}, 0);
	}

	let timer = null;
	function schedule(delay) {
		if (timer) return;
		timer = setTimeout(() => {
			timer = null;
			try {
				pass();
			} catch (e) {
				console.error(LOG, 'pass 异常', e);
			}
		}, delay == null ? 150 : delay);
	}

	function startObserver() {
		const observer = new MutationObserver((records) => {
			let relevant = false;
			for (const r of records) {
				// 只关心文字和结构变化
				if (r.type !== 'characterData' && r.type !== 'childList') continue;
				relevant = true;

				let marked = false;
				let el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
				for (; el; el = el.parentElement) {
					if (el.__fgText != null) {
						el.__fgDirty = true;
						marked = true;
						break;
					}
				}
				// 行本身没动、但父元素的子节点变了（比如开关翻译，li 多/少一个 p），
				// 往上找不到脏行，所以往下看一层，否则这些行不会重算
				if (!marked && r.target.nodeType === 1)
					for (const child of r.target.children)
						if (child.__fgText != null) child.__fgDirty = true;
			}
			if (relevant) schedule();
		});
		state.observer = observer;
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			characterData: true,
		});

		// 兜底：observer 漏掉的情况（比如 React 改了已脱离文档的文本节点）在这里核对
		setInterval(() => {
			if (!config.enabled || !state.tokenizer) return;
			if (!lastLines.length) return schedule(0);
			for (const line of lastLines) {
				if (!isClean(line)) return schedule(0);
			}
		}, 1500);
	}

	/**
	 * 量一行的实际排版：注音相对底字偏了多少、词盒被撑宽了多少、
	 * 逐字歌词是怎么切的。位置不对时靠这个看，比截图准。
	 *   JPFuriganaPlus.dumpLine()   第一行已注音的
	 *   JPFuriganaPlus.dumpLine(2)  第三行
	 */
	function dumpLine(index) {
		const done = lastLines.filter((l) => l.__fgHosts && l.__fgHosts.length);
		const line = done[index || 0];
		if (!line) return `没有已注音的行（共 ${lastLines.length} 行）`;

		const mid = (r) => (r.left + r.right) / 2;
		const px = (n) => Math.round(n * 10) / 10;

		// 没有排版信息（比如离线测试环境）时全给 null，别让诊断本身炸掉
		const rect = (o) => {
			try {
				const r = o.getBoundingClientRect();
				return r && typeof r.left === 'number' ? r : null;
			} catch (e) {
				return null;
			}
		};

		const lineRect = rect(line);
		const rubies = [...line.querySelectorAll('.fg-ruby')].map((ruby) => {
			const rt = ruby.querySelector('.fg-rt');
			const range = document.createRange();
			range.selectNodeContents(ruby);
			if (rt) range.setEndBefore(rt);
			const base = rect(range) || { left: 0, right: 0, top: 0, width: 0 };
			const rtRect = rt && rect(rt);
			const word = ruby.parentElement && ruby.parentElement.closest('.rnp-karaoke-word');
			const wordRect = word && rect(word);
			return {
				底字: range.toString(),
				读音: rt ? rt.textContent : '',
				底字宽: px(base.width),
				// 0 = 注音正对着底字；负数 = 注音偏左
				注音横向偏移: rtRect ? px(mid(rtRect) - mid(base)) : null,
				// 注音底边离底字顶边多远，负数说明压在底字上
				注音纵向间距: rtRect ? px(base.top - rtRect.bottom) : null,
				词盒宽: wordRect ? px(wordRect.width) : null,
				// >0 说明注音戳出了这一行的盒子外面 —— RNP 按盒子高度排行距，会压到上一行
				注音戳出行外: rtRect && lineRect ? px(lineRect.top - rtRect.top) : null,
			};
		});

		const gap = annotationGap(line);
		const info = {
			build: BUILD,
			ruby排版: hasRuby() ? '内核原生' : '降级（注音绝对定位）',
			注音让位: hasRuby()
				? CALIBRATIONS.map(
						(c) => `${c.key}: 顶 ${c.top}em / 底 ${c.tail}em${c.tries >= CALIBRATE_MAX ? '（已收敛）' : ''}`
				  ).join('  |  ')
				: '降级模式不需要（注音不占高度）',
			注音顶离行盒顶: gap ? Math.round(gap.gap * 10) / 10 : null,
			注音压住底字: gap && gap.overlap != null ? Math.round(gap.overlap * 10) / 10 : null,
			没注音的行高: (() => {
				const em = referenceHeight(line);
				return em == null || !gap ? null : Math.round(em * gap.fontSize * 10) / 10;
			})(),
			matchedBy: state.matchedBy,
			readingSource: line.__fgSource,
			karaoke: config.karaoke,
			text: line.__fgText,
			行: line.tagName.toLowerCase() + '.' + line.className,
			宿主数: line.__fgHosts.length,
			宿主: line.__fgHosts[0] === line ? '整行（没走逐字分发）' : line.__fgHosts[0].tagName.toLowerCase() + '.' + line.__fgHosts[0].className,
			// 逐字歌词原本是怎么切的（改写前存下来的节点）
			逐字切法: line.__fgHosts.map((h) => (h.__fgOrig || []).map((n) => n.textContent).join('')),
			filler副本数: (line.__fgMirrors || []).length,
			注音: rubies,
			行高: px((lineRect || { height: 0 }).height),
			html: line.outerHTML.slice(0, 1200),
		};
		console.log(LOG, 'dumpLine', info);
		if (console.table) console.table(rubies);
		return info;
	}

	// ------------------------------------------------------------------ 样式

	function styleEl(id) {
		let el = document.getElementById(id);
		if (!el) {
			el = document.createElement('style');
			el.id = id;
			document.head.appendChild(el);
		}
		return el;
	}

	let spacingVersion = 1, spacingCanvas = null;
	function spaceAnnotations(lines) {
		if (typeof CanvasRenderingContext2D === 'undefined') return; // DOM-only test environments
		if (!spacingCanvas) spacingCanvas = document.createElement('canvas').getContext('2d');
		if (!spacingCanvas) return;
		let resized = false;
		for (const line of lines) {
			const cached = line.__fgSpacingWrap, now = performance.now();
			const clean = line.__fgSpacingVersion === spacingVersion && cached && cached.isConnected && line.contains(cached);
			if (clean && now - line.__fgSpacingProbe < 250) continue;
			const first = clean && line.__fgSpacingSample && line.__fgSpacingSample.isConnected ? line.__fgSpacingSample : line.querySelector('.fg-ruby');
			if (!first) continue;
			const sample = getComputedStyle(first); line.__fgSpacingProbe = now;
			const fontKey = [sample.fontFamily, sample.fontSize, sample.fontWeight, sample.fontStyle, sample.letterSpacing].join('|');
			if (clean && line.__fgSpacingFont === fontKey) continue;
			const holders = line.querySelectorAll('.fg-ruby');
			for (const holder of holders) {
				const rt = holder.querySelector('.fg-rt'); if (!rt || !rt.textContent) continue;
				const baseStyle = getComputedStyle(holder), rtStyle = getComputedStyle(rt), size = parseFloat(baseStyle.fontSize);
				if (!size) continue;
				const measure = (text, css) => { spacingCanvas.font = css.font || `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`; return spacingCanvas.measureText(text).width + Math.max(0, text.length - 1) * (parseFloat(css.letterSpacing) || 0); };
				const baseWidth = measure(holder.__fgBase || '', baseStyle);
				const custom = rt.querySelector('.fg-edit-custom'), original = rt.querySelector('.fg-edit-original');
				const currentWidth = measure(custom ? custom.textContent : rt.textContent, rtStyle);
				let rtWidth = currentWidth, inFlowWidth = currentWidth;
				if (original && editor && editor.isEnabled()) {
					inFlowWidth = measure(original.textContent, rtStyle);
					rtWidth = Math.max(rtWidth, inFlowWidth);
				}
				// Native ruby reserves its own width. The absolute-position fallback does not.
				const padding = size * .08 + Math.max(0, rtWidth - (hasRuby() ? Math.max(baseWidth, inFlowWidth) : baseWidth)) / 2;
				holder.style.paddingLeft = holder.style.paddingRight = padding.toFixed(2) + 'px';
				resized = true;
			}
			line.__fgSpacingVersion = spacingVersion; line.__fgSpacingFont = fontKey; line.__fgSpacingWrap = line.querySelector('.fg-line');
			line.__fgSpacingSample = first;
		}
		if (resized) requestRecalc();
	}
	function updateStyles() {
		spacingVersion++;
		resetCalibration(); // 注音字号变了，让位的高度也要重量
		styleEl('jp-furigana-plus-style').textContent = `
			.fg-line {
				display: inline;
			}
			/*
			 * 我们插进去的包装 span 不能再吃一层透明度。RNP 的
			 * .rnp-karaoke-word span:not(.rnp-karaoke-word-filler) { opacity: .4 }
			 * 匹配的是**每一层**嵌套 span，透明度会一层层相乘：普通字过两层是 0.4²≈0.16，
			 * 带注音的字多一层 .fg-ruby 就成了 0.4³≈0.06，淡到几乎看不见。
			 * 用 !important 是因为对方的选择器更具体，压不过去。
			 */
			.fg-line,
			.fg-ruby {
				opacity: 1 !important;
			}
			/*
			 * 让位：RNP 的逐字歌词里每个词是独立的 inline-block，注音的高度撑不到外层
			 * 行盒（clientHeight 不变），而 RNP 正是按 clientHeight 排行距的，于是注音
			 * 压到上一行头上。所以在逐字宿主上把高度让出来，让多少是量出来的（见
			 * calibrate）。整行改写的普通行不用管，那是普通块，浏览器自己会撑开。
			 *
			 * 关键：让位必须加在**每个** .fg-word 上（不分有没有注音）—— inline-block 的
			 * padding 会把里面的字整体压下去，只给带注音的那个加，它就比左右邻居低一截
			 * （实测低 15px，看着就是「这个字掉下去了」）。
			 */
			.fg-line.fg-word {
				display: inline-block;
				padding-top: var(--fg-word-offset, 0em);
				margin-bottom: var(--fg-word-tail, 0em);
			}
			.fg-line ruby {
				ruby-position: over;
				-webkit-ruby-position: before;
				ruby-align: center;
				ruby-overhang: none;
			}
			/*
			 * 内核不认 ruby 时的降级：不用 ruby/rt，注音是普通 span 绝对定位在底字正上方。
			 * .fg-ruby 保持 inline（不能改成 inline-block 再加 padding —— 那样只有带注音的
			 * 字会被压低），注音落在行与行本来的空隙里，不占行高也不撑宽底字。
			 */
			${
				hasRuby()
					? ''
					: `
			.fg-ruby {
				position: relative;
			}
			.fg-ruby > .fg-rt {
				position: absolute;
				left: 50%;
				bottom: 100%;
				-webkit-transform: translateX(-50%);
				transform: translateX(-50%);
				display: block;
				pointer-events: none;
			}
			`
			}
			.fg-line .fg-rt {
				font-size: ${config.rtSize}%;
				opacity: ${config.rtOpacity / 100};
				font-weight: normal;
				letter-spacing: 0;
				line-height: 1.1;
				text-align: center;
				user-select: none;
				-webkit-user-select: none;
				white-space: nowrap;
			}
		`;
	}

	// ------------------------------------------------------------------ 调试接口

	function probe() {
		const info = {
			betterncm: state.betterncmVersion,
			tokenizerReady: !!state.tokenizer,
			loadError: state.loadError && String(state.loadError),
			matchedBy: state.matchedBy,
			lineCount: state.lineCount,
			annotated: state.annotated,
			lastPassMs: state.lastPassMs,
			container: state.container
				? {
						tag: state.container.tagName,
						cls: state.container.className,
						children: state.container.children.length,
				  }
				: null,
		};
		console.log(LOG, 'probe', info);

		console.log(LOG, '已知选择器命中情况：');
		for (const sel of KNOWN_SELECTORS) {
			let n = 0;
			try {
				n = document.querySelectorAll(sel).length;
			} catch (e) {
				n = -1;
			}
			console.log('   ', n, sel);
		}

		// 前几行往往是「作词:/编曲:」这类被跳过的行，所以两类分别取样
		const lines = collectLines().filter(Boolean);
		const done = lines.filter((l) => l.__fgHosts && l.__fgHosts.length);
		const skipped = lines.filter((l) => l.__fgHosts && !l.__fgHosts.length);
		const pending = lines.filter((l) => !l.__fgHosts);
		console.log(
			LOG,
			`共 ${lines.length} 行：已注音 ${done.length}，跳过 ${skipped.length}，未处理 ${pending.length}`
		);

		const bySrc = (s) => done.filter((l) => l.__fgSource === s).length;
		console.log(LOG, `读音来源：官方音译 ${bySrc('romaji')} 行，词典 ${bySrc('dict')} 行`);
		console.log(
			LOG,
			`官方音译：${state.apiStatus}（曲目 id ${state.apiTrackId || '未知'}，` +
				`Redux store ${state.store ? '已找到' : '未找到'}）`
		);
		info.trackId = state.apiTrackId;
		info.apiStatus = state.apiStatus;
		info.storeFound = !!state.store;

		const dump = (label, list, n) => {
			for (const l of list.slice(0, n)) {
				const src = l.__fgSource ? `(${l.__fgSource})` : '';
				const text = plainText(l);
				console.log(`   [${label}]${src} text:`, JSON.stringify(text));
				const romaji = state.apiRomaji && state.apiRomaji.get(FuriganaPlusCore.lyricKey(text));
				if (romaji) console.log(`   [${label}] 音译:`, JSON.stringify(romaji));
				console.log(`   [${label}] html:`, l.outerHTML.slice(0, 600));
			}
		};
		dump('已注音', done, 2);
		dump('跳过', skipped, 2);
		dump('未处理', pending, 2);
		if (lines.length) console.log('   path:', domPath(lines[0]));

		info.done = done.length;
		info.skipped = skipped.length;
		info.pending = pending.length;
		return info;
	}

	function domPath(el) {
		const parts = [];
		for (let p = el; p && p !== document.body; p = p.parentElement) {
			let s = p.tagName.toLowerCase();
			if (p.id) s += '#' + p.id;
			const cls = typeof p.className === 'string' ? p.className.trim() : '';
			if (cls) s += '.' + cls.split(/\s+/).join('.');
			parts.unshift(s);
			if (parts.length > 8) break;
		}
		return parts.join(' > ');
	}

	function disable() {
		editEntry++; state.editInterrupt = null;
		config.enabled = false;
		resetExternal();
		saveConfig();
		removeAll(lastLines);
		lastLines = [];
	}

	function enable() {
		config.enabled = true;
		saveConfig();
		loadTokenizer();
		schedule(0);
	}

	function rescan() {
		resetExternal();
		state.container = null;
		state.apiTrackId = null; // 重新拉一次官方音译
		state.apiRomaji = null;
		removeAll(lastLines);
		lastLines = [];
		schedule(0);
	}

	// ------------------------------------------------------------------ 设置界面

	// 排障用的部分，只在开发模式下露出来（插件放在 plugins_dev 里，
	// 或者在控制台执行 localStorage['jp-furigana-plus.dev'] = '1' 后重启）
	const ADVANCED_UI = `
		<div class="fg-row"><label><input type="checkbox" data-k="requireLyricClass"> 自动检测时限定在 class 含 "lyric" 的区域内</label></div>
		<div class="fg-row">
			<label>自定义歌词选择器</label>
			<input type="text" data-k="customSelector" placeholder="留空则自动检测">
		</div>
		<div class="fg-hint">改完选择器点「重新检测」生效。不确定填什么就先点「输出诊断信息」，按 F12 看控制台。</div>

		<h3>维护</h3>
		<div class="fg-row">
			<button data-a="rescan">重新检测歌词元素</button>
			<button data-a="probe">输出诊断信息</button>
			<button data-a="clearCache">清除注音缓存</button>
			<label><input type="checkbox" data-k="verbose"> 控制台输出详细日志</label>
		</div>
		<div class="fg-status"></div>
	`;

	// 已打开的设置面板的刷新回调，词典加载完 / 音译取回来时通知它们
	const configRefreshers = new Set();

	function notifyConfigUI() {
		for (const fn of configRefreshers) {
			try {
				fn();
			} catch (e) {
				console.warn(LOG, '刷新设置面板失败', e);
			}
		}
	}
	const NEEDS_RESCAN = ['kana', 'readingSource', 'externalProvider', 'externalProxyEnabled', 'externalProxy', 'externalCacheDir',
		'karaoke', 'onlyFirstLine', 'skipCredits', 'skipNoKanaLines', 'requireLyricClass', 'customSelector'];
	function setConfigValue(key, value) {
		if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) throw new Error('未知设置项');
		if (!editPreparing && ['readingSource','externalProvider','externalCacheDir','externalProxy','externalProxyEnabled'].includes(key)) {editEntry++;state.editInterrupt=null;}
		if (key === 'externalProxy') value = FuriganaPlusExternal.validateProxy(value);
		if (key === 'rtSize' || key === 'rtOpacity' || key === 'desktopFontSize') {
			value = Number(value); if (!Number.isFinite(value)) throw new Error('请输入有效数值');
			value = Math.max(20, Math.min(key === 'desktopFontSize' ? 96 : 100, Math.round(value)));
		}
		if (key === 'desktopBounds') { value = FuriganaPlusDesktop.bounds(value); if (!value) throw new Error('无效的桌面歌词位置'); }
		const choices = { readingSource: ['romaji', 'dict', 'external'], externalProvider: ['auto', 'utaten', 'utanet'], externalAutoRetry: ['off', 'failed'], kana: ['hiragana', 'katakana'] };
		if (choices[key] && !choices[key].includes(value)) throw new Error('无效的设置选项');
		if (typeof DEFAULTS[key] === 'boolean') value = !!value;
		config[key] = value; saveConfig(); updateStyles();
		if (key === 'enabled') value ? enable() : disable();
		else if (key === 'externalAutoRetry') { if (externalClient) externalClient.setAutoRetry(value); }
		else if (NEEDS_RESCAN.includes(key)) rescan();
		notifyConfigUI();
		return config[key];
	}
	function externalStatusText() {
		const language = currentTrackLanguage(); if (language.eligible !== true) return language.status;
		const info = externalClient && externalClient.inspect();
		return (info ? info.status : '等待播放日语歌曲…') + (info && info.cachePath ? '\n缓存目录：' + info.cachePath : '') +
			(info && info.source ? '\n当前歌词容器：网站命中 ' + (state.srcExternal || 0) + ' 行；网易云音译回退 ' +
				(state.srcRomaji || 0) + ' 行；词典回退 ' + (state.srcDict || 0) + ' 行' : '');
	}
	function retryExternal() {
		if (!config.enabled || config.readingSource !== 'external' || !getCurrentTrackId()) return;
		const language = currentTrackLanguage();
		if (language.eligible === false) return;
		if (language.eligible === null) { state.apiTrackId = null; ensureApiRomaji(); return; }
		state.externalForce = true; resetExternal(); invalidateAll(); schedule(0);
	}
	function openExternalSource() {
		const info = externalClient && externalClient.inspect();
		if (info && FuriganaPlusExternalCore.allowedURL(info.url)) betterncm.ncm.openUrl(info.url);
	}
	async function chooseExternalSource(){
		if(!config.enabled||config.readingSource!=='external'||!getCurrentTrackId())throw new Error('请先播放歌曲并启用外部网站注音');
		if(config.externalProvider==='utanet')throw new Error('手动指定 UtaTen 歌词页时，请将网站范围设为自动或 UtaTen');
		const id=getCurrentTrackId();await requireJapaneseTrack(id);
		const client=getExternalClient(),info=client.inspect();
		const selected=await FuriganaPlusSourceDialog.open({trackId:getCurrentTrackId,url:info.songId===id?(info.manualUrl||(info.source==='utaten'?info.url:'')):'',validate:FuriganaPlusExternalCore.utatenURL});
		if(!selected)return;
		if(getCurrentTrackId()!==selected.songId||!config.enabled||config.readingSource!=='external')throw new Error('歌曲或读音来源已变化，请重新指定');
		await requireJapaneseTrack(selected.songId);
		state.externalTrackId=selected.songId;state.externalForce=false;
		state.externalPlayKey=externalPlayKey(selected.songId);
		state.externalTask=client.setSource(selected.songId,()=>currentTrackMetadata(selected.songId),config,selected.url);
		await state.externalTask;
		invalidateAll();schedule(0);notifyConfigUI();
	}
	function fallbackForEdit(text) {
		const romaji = state.apiRomaji && state.apiRomaji.get(FuriganaPlusCore.lyricKey(text));
		return romaji && getSegmentsFromRomaji(text, romaji) || getSegments(text);
	}
	async function toggleEditor() {
		if (!editor) return;
		if (editor.isEnabled()) { editEntry++;state.editInterrupt=null;editor.setEnabled(false); return; }
		const id = getCurrentTrackId();
		if (!id || !state.tokenizer) throw new Error('请先播放歌曲，并等待词典加载完成');
		await requireJapaneseTrack(id);
		const client = getExternalClient(), info = client.inspect();
		if (info.loading) {
			if (!state.editInterrupt || state.editInterrupt.songId !== id || state.editInterrupt.requestId !== info.requestId) {
				state.editInterrupt = {songId:id,requestId:info.requestId};notifyConfigUI();return;
			}
			const settings = {...info.settings};client.cancelFetch();state.editInterrupt=null;
			return enterEditor(id, settings, true);
		}
		return enterEditor(id);
	}
	function editorButtonState() {
		const info = externalClient && externalClient.inspect(), id = getCurrentTrackId();
		const warning = !!(state.editInterrupt && info && info.loading && info.songId === id && state.editInterrupt.songId === id && state.editInterrupt.requestId === info.requestId);
		if (!warning) state.editInterrupt = null;
		return {warning,text:editor&&editor.isEnabled()?'退出编辑模式':warning?'将中断网站注音获取，再次点击进入编辑模式':'进入编辑模式'};
	}
	async function enterEditor(id, settings = null, cancelled = false) {
		const ticket=++editEntry, client=getExternalClient();state.editInterrupt=null;
		if (client.inspect().loading && state.externalTask) await state.externalTask;
		if (getCurrentTrackId()!==id || ticket!==editEntry) return;
		const attempted = state.externalTrackId===id && state.externalPlayKey===externalPlayKey(id);
		editPreparing=true;
		try {
			if (!config.enabled) setConfigValue('enabled',true);
			if (config.readingSource!=='external') setConfigValue('readingSource','external');
		} finally { editPreparing=false; }
		state.externalTrackId=id;state.externalPlayKey=externalPlayKey(id);
		const scoped=settings||config;
		if (!cancelled && (!attempted || settings)) {
			state.externalTask=client.load(id,()=>currentTrackMetadata(id),scoped);
			await state.externalTask;
		}
		if (getCurrentTrackId()!==id || ticket!==editEntry) return;
		await client.ensureLocal(id,()=>currentTrackMetadata(id),scoped);
		if (getCurrentTrackId()!==id || ticket!==editEntry) return;
		state.externalTrackId=id;state.externalPlayKey=externalPlayKey(id);editor.setEnabled(true);
	}
	async function playCached(row) {
		if (playPending) throw new Error('正在切换歌曲，请稍候');
		if (!/^\d{1,20}$/.test(row.songId)) throw new Error('无效歌曲 ID');
		if (!editor.prepareNavigation()) throw new Error('请先处理未保存的注音');
		playPending = true;
		playPendingTarget = row.songId;
		try {
			const client = getExternalClient(), dir = await client.directory(config);
			if (row.path !== dir + '/' + row.songId + '.json') throw new Error('缓存目录已变化，请刷新列表');
			await client.manage(row.songId, config, 'read');
			if (getCurrentTrackId() !== row.songId) {
				betterncm.ncm.openUrl('orpheus://song/' + row.songId + '/?autoplay=1');
				const end = Date.now() + 15000;
				while (getCurrentTrackId() !== row.songId && Date.now() < end) await new Promise(resolve => setTimeout(resolve, 150));
				if (getCurrentTrackId() !== row.songId) throw new Error('客户端尚未切换到这首歌；请手动播放后再进入编辑模式');
			}
			await requireJapaneseTrack(row.songId);
			await enterEditor(row.songId,row.provider==='local'?null:{...config,externalProvider:row.provider});
		} finally { playPending = false;playPendingTarget=null; }
	}
	function compactExternalStatus() {
		const language = currentTrackLanguage(); if (language.eligible !== true) return language.status;
		const info = externalClient && externalClient.inspect();
		if (!info) return '等待播放歌曲';
		const track = info.ready ? (info.source === 'local' ? '本地纠音' : info.source === 'utaten' ? 'UtaTen' : 'Uta-Net') + ' · ' + info.title + '\n' + (info.artists || []).join(' / ') + (info.edits ? '\n人工修改 ' + info.edits + ' 处' : '') : '';
		// Keep the real failure and retry countdown visible even when local edits
		// or an older website cache remain usable during this request.
		if (info.loading || info.error || !info.ready) return (track ? track + '\n' : '') + info.status;
		return track + (info.warning ? '\n' + info.warning : '');
	}
	let desktopNative = null, desktopNativeId = null, desktopNativeLines = [];
	function desktopSnapshot(options = {}) {
		const songId = getCurrentTrackId();
		if (songId) ensureApiRomaji();
		const root = state.store && state.store.getState(), playing = root && root.playing || {};
		const native = nativeTrackLines(songId), language = currentTrackLanguage();
		const lines = native.length ? native : state.desktopLyrics && state.desktopLyrics.songId === songId ? state.desktopLyrics.lines : [];
		if (config.enabled) ensureExternal();
		const current = options.needCurrentText && document.querySelector('.rnp-lyrics-line[offset="0"] .rnp-lyrics-line-original,.rnp-lyrics-line[offset="0"] .rnp-lyrics-line-karaoke');
		return { songId, playId:String(playing.playId || ''), lines,
			eligible:language.eligible === true,languageStatus:language.status,
			title:playing.resourceName || playing.curTrack && playing.curTrack.name || '',
			currentText:current && isVisible(current) ? plainText(current) : '',
			nativeVisible:!!(root && root.setting && root.setting.showLyric), playing:playing.playingState === 2,
			locked:!!(root && root.setting && root.setting.desktopLyricLockState),style:FuriganaPlusDesktop.nativeStyle(root && root.setting || {}) };
	}
	let desktopVisibilityVersion = 0, desktopWorkArea = null;
	function desktopNativeCall(name, args) {
		return new Promise((resolve,reject) => {
			const timer = setTimeout(() => reject(new Error('原桌面歌词接口响应超时')),3000);
			try { channel.call(name,result => {clearTimeout(timer);resolve(result);},args); }
			catch(e) {clearTimeout(timer);reject(e);}
		});
	}
	async function desktopVisibility(hidden,restore = true) {
		const version = ++desktopVisibilityVersion;
		if (!desktopWorkArea) { const info = await desktopNativeCall('os.getSystemInfo',['monitor']); desktopWorkArea = info && info.workArea; }
		if (version !== desktopVisibilityVersion) return;
		const root = state.store && state.store.getState();
		const show = !hidden && restore && !!(root && root.setting && root.setting.showLyric);
		await desktopNativeCall('winhelper.setNativeWindowShow',['desktop_lyrics',show,desktopWorkArea || {}]);
	}
	function desktopAction(type,value) {
		if (!state.store) return;
		const setting = state.store.getState().setting || {};
		if (type === 'setting') FuriganaPlusDesktop.openSettings(state.store);
		else if (type === 'translation') {
			if (!config.desktopInheritStyle) setConfigValue('desktopTranslation',!config.desktopTranslation);
			else state.store.dispatch({type:'setting/changeLyricMode',payload:{type:'translate',checked:setting.lyricMode!=='translate'}});
		} else if (type === 'fontSize') {
			const size = Math.max(20,Math.min(96,Math.round(Number(value)||36)));
			if (!config.desktopInheritStyle) setConfigValue('desktopFontSize',size);
			else FuriganaPlusDesktop.setFontSize(state.store,size);
		} else if (['detail','offset_back','offset_forward','playprev','play_pause','playnext','lock','unlock','close'].includes(type)) {
			state.store.dispatch({type:'setting/handleDesktopLyricAction',payload:{type}});
		}
	}
	function watchDesktop(callback) {
		let unsubscribe = null, timer = null, stopped = false;
		function attach() {
			if (stopped) return;
			getCurrentTrackId();
			if (!state.store) {timer=setTimeout(attach,1000);return;}
			let previous = state.store.getState();
			unsubscribe = state.store.subscribe(() => {
				const next = state.store.getState(), p = previous.playing || {}, q = next.playing || {};
				const changed = next.setting !== previous.setting;
				const refresh = changed || next['async:lyric'] !== previous['async:lyric'] || p.playId !== q.playId || p.playingState !== q.playingState;
				previous = next;
				if (refresh) callback(changed);
			});
		}
		attach();return () => {stopped=true;clearTimeout(timer);if(unsubscribe)unsubscribe();};
	}

	function buildConfigUI() {
		const root = document.createElement('div');
		root.id = 'jp-furigana-plus-config';
		root.innerHTML = `
			<style>
				#jp-furigana-plus-config { font-size: 14px; line-height: 2; }
				#jp-furigana-plus-config h3 { font-size: 16px; font-weight: bold; margin: 12px 0 4px; }
				#jp-furigana-plus-config .fg-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
				#jp-furigana-plus-config .fg-hint { opacity: .6; font-size: 12px; }
				#jp-furigana-plus-config .fg-links { display: flex; gap: 16px; margin-bottom: 4px; }
				#jp-furigana-plus-config .fg-links a { text-decoration: underline; cursor: pointer; opacity: .85; }
				#jp-furigana-plus-config .fg-links a:hover { opacity: 1; }
				#jp-furigana-plus-config input[type="text"] { width: 320px; }
				#jp-furigana-plus-config .fg-external-settings[hidden] { display: none !important; }
				#jp-furigana-plus-config .fg-external-error { color: #e67e73; font-size: 12px; }
				#jp-furigana-plus-config .fg-edit-interrupt { color:#e45454;white-space:normal; }
				#jp-furigana-plus-config .fg-preview {
					font-size: 26px; padding: 14px 16px; margin: 8px 0;
					border-radius: 10px; background: rgba(127,127,127,.12);
				}
				#jp-furigana-plus-config .fg-status { white-space: pre-wrap; font-family: monospace; font-size: 12px; opacity: .8; }
			</style>
			<div class="fg-links">
				<a href="#" data-open="${REPO_URL}/tree/standalone">源码仓库</a>
				<a href="#" data-open="${REPO_URL}/issues">反馈问题</a>
			</div>

			<h3>预览</h3>
			<div class="fg-preview"></div>

			<h3>基本</h3>
			<div class="fg-row"><label><input type="checkbox" data-k="enabled"> 启用注音</label></div>
			<div class="fg-row">
				<label>注音假名</label>
				<select data-k="kana">
					<option value="hiragana">平假名</option>
					<option value="katakana">片假名</option>
				</select>
			</div>
			<div class="fg-row">
				<label>读音来源</label>
				<select data-k="readingSource">
					<option value="romaji">优先用网易云音译（推荐）</option>
					<option value="dict">只用词典</option>
					<option value="external">外部网站</option>
				</select>
			</div>
			<section class="fg-external-settings">
				<div class="fg-hint">外部来源会联网获取并在本地保存歌词，请遵守来源网站使用条款。<a href="#" data-open="https://utaten.com/index/agreement">UtaTen 条款</a> · <a href="#" data-open="https://www.uta-net.com/info/kiyaku.html">歌ネット条款</a></div>
				<h3>外部歌词</h3>
				<div class="fg-row"><label>外部网站范围</label><select data-k="externalProvider">
					<option value="auto">UtaTen 优先，歌ネット备用（推荐）</option>
					<option value="utaten">仅查询 UtaTen 振假名</option>
					<option value="utanet">仅查询歌ネット罗马音</option>
				</select></div>
				<div class="fg-row"><label>自动重新获取</label><select data-k="externalAutoRetry">
					<option value="off">关闭（仍会首次获取）</option>
					<option value="failed">失败后自动重试（最多 3 次）</option>
				</select></div>
				<div class="fg-hint">超时等临时网络故障按 3 / 8 / 15 秒间隔重试获取流程；歌名与歌词核对属于同一次尝试。关闭后取消等待。没有匹配歌曲、网页格式错误或 HTTP 403 等情况不自动反复请求。</div>
				<div class="fg-row"><label><input type="checkbox" data-k="externalProxyEnabled"> 使用代理获取外部歌词</label></div>
				<div class="fg-row"><label>代理地址</label><input type="text" data-k="externalProxy" placeholder="http://127.0.0.1:7890" autocomplete="off" spellcheck="false"></div>
				<div class="fg-hint">支持 HTTP / HTTPS / SOCKS5 / SOCKS5H；仅影响外部歌词网站，不改变网易云联网方式。不支持带账号密码的代理 URL。</div>
				<div class="fg-row"><label>歌词缓存目录</label><input type="text" data-k="externalCacheDir" placeholder="留空：BetterNCM 数据目录 / lyrics / jp-furigana-plus" spellcheck="false"></div>
				<div class="fg-hint">可填写完整磁盘路径。每首歌曲一个 JSON 文件，包含网站歌词、读音和来源；更改目录后旧文件保留。</div>
				<div class="fg-hint">“仅查询”限制外部网站来源；加载期间及未匹配的行仍沿用网易云音译 / 词典。网站命中的行采用网站读音，保留原歌词和时间轴。网站注音也可能有错。</div>
				<div class="fg-external-error" role="alert"></div>
				<div class="fg-external-status" role="status" style="white-space:pre-wrap;font-size:12px;margin:8px 0"></div>
				<div class="fg-row"><button data-a="externalRetry">重新获取当前歌曲</button><button data-a="externalSource">查看来源网页</button><button data-a="externalAssign" title="支持手动指定 UtaTen 歌词页">手动指定歌词页</button></div>
			</section>
			<div class="fg-row"><button data-a="editMode">进入编辑模式</button><button data-a="cacheManager">本地歌词管理</button></div>
			<div class="fg-row">
				<label>注音大小</label>
				<input type="range" data-k="rtSize" min="20" max="100" step="1">
				<span data-v="rtSize"></span>
			</div>
			<div class="fg-row">
				<label>注音不透明度</label>
				<input type="range" data-k="rtOpacity" min="20" max="100" step="1">
				<span data-v="rtOpacity"></span>
			</div>

			<h3>桌面歌词</h3>
			<div class="fg-row"><label><input type="checkbox" data-k="desktopEnabled"> 启用注音桌面歌词</label></div>
			<div class="fg-desktop-options">
			<div class="fg-row"><label><input type="checkbox" data-k="desktopInheritStyle"> 沿用原桌面歌词的字体、颜色、字号与布局</label></div>
			<div class="fg-desktop-custom">
			<div class="fg-row"><label><input type="checkbox" data-k="desktopTopmost"> 桌面歌词置顶</label><label><input type="checkbox" data-k="desktopTranslation"> 显示中文翻译</label></div>
			<div class="fg-row"><label>桌面歌词字号</label><input type="range" data-k="desktopFontSize" min="20" max="96" step="1"><span data-v="desktopFontSize"></span></div>
			</div>
			<div class="fg-row"><button data-a="desktopSettings">原桌面歌词设置</button><button data-a="desktopUnlock">解锁桌面歌词</button></div>
			<div class="fg-hint">原桌面歌词开关控制显示和关闭；开启注音后自动替换，停用时恢复。拖动歌词移动，Ctrl + 滚轮调整字号；锁定后鼠标穿透，可在此解锁。</div>
			</div>
			<div class="fg-desktop-status" role="status"></div>

			<h3>兼容</h3>
			<div class="fg-row"><label><input type="checkbox" data-k="karaoke"> 逐字歌词模式（把注音分发到每个字/词，保留逐字高亮动画）</label></div>
			<div class="fg-row"><label><input type="checkbox" data-k="onlyFirstLine"> 只给原文注音，跳过翻译和罗马音</label></div>
			<div class="fg-row"><label><input type="checkbox" data-k="skipCredits"> 跳过「作词:／编曲:」等制作信息行</label></div>
			<div class="fg-row"><label><input type="checkbox" data-k="skipNoKanaLines"> 跳过没有假名的行（中文翻译、版权声明）</label></div>
			${DEV ? ADVANCED_UI : ''}
		`;

		const preview = root.querySelector('.fg-preview');
		const status = root.querySelector('.fg-status');

		function refreshPreview() {
			const demo = '夜空を駆ける一人の影';
			preview.textContent = '';
			if (!state.tokenizer) {
				if (state.loadError) preview.textContent = '词典加载失败：' + state.loadError;
				else if (state.loading) preview.textContent = '词典加载中…';
				else if (!config.enabled) preview.textContent = '注音已关闭';
				else preview.textContent = '词典尚未加载';
				return;
			}
			preview.appendChild(buildWrap(getSegments(demo)));
		}

		function refreshStatus() {
			const desktopStatus = root.querySelector('.fg-desktop-status');
			desktopStatus.textContent = desktop ? desktop.inspect().status : '';
			root.querySelector('.fg-desktop-options').hidden = !config.desktopEnabled;
			root.querySelector('.fg-desktop-custom').hidden = !config.desktopEnabled || config.desktopInheritStyle;
			for (const key of ['desktopTopmost','desktopTranslation','desktopFontSize']) root.querySelector('[data-k="'+key+'"]').disabled = !config.desktopEnabled || config.desktopInheritStyle;
			const section = root.querySelector('.fg-external-settings');
			section.hidden = config.readingSource !== 'external';
			const info = externalClient && externalClient.inspect();
			const externalStatus = root.querySelector('.fg-external-status'), text = externalStatusText();
			if (externalStatus.textContent !== text) externalStatus.textContent = text;
			const japanese = currentTrackLanguage().eligible === true;
			root.querySelector('[data-a="externalSource"]').disabled = !(japanese && info && info.url && info.songId === getCurrentTrackId());
			root.querySelector('[data-a="externalRetry"]').disabled = !config.enabled || !getCurrentTrackId() || currentTrackLanguage().eligible === false;
			root.querySelector('[data-a="externalAssign"]').disabled = !config.enabled || !japanese || config.externalProvider==='utanet';
			const editButton = root.querySelector('[data-a="editMode"]');
			const editState=editorButtonState();editButton.textContent=editState.text;editButton.classList.toggle('fg-edit-interrupt',editState.warning);
			editButton.disabled = !(editor && editor.isEnabled()) && (!japanese || !state.tokenizer);
			if (!status) return; // 非开发模式没有这块
			status.textContent = [
				`词典：${state.tokenizer ? '已就绪' : state.loadError ? '失败 ' + state.loadError : '加载中'}`,
				`定位方式：${state.matchedBy || '未找到歌词元素'}`,
				`歌词行数：${state.lineCount}，已注音：${state.annotated}，上次耗时：${state.lastPassMs}ms`,
				`读音来源：官方音译 ${state.srcRomaji} 行 / 词典 ${state.srcDict} 行`,
				`官方音译：${state.apiStatus}（曲目 id ${state.apiTrackId || '未知'}，store ${state.store ? '已找到' : '未找到'}）`,
				`缓存条目：${cache.size}`,
			].join('\n');
		}

		// 滑块旁边那行数值怎么显示
		const sliderDrafts = new Map();
		const fmt = (key) => (sliderDrafts.has(key) ? sliderDrafts.get(key) : config[key]) + (key === 'desktopFontSize' ? 'px' : '%');

		root.querySelectorAll('[data-k]').forEach((el) => {
			const key = el.dataset.k;
			if (el.type === 'checkbox') el.checked = !!config[key];
			else el.value = config[key];

			const commit = () => {
				sliderDrafts.delete(key);
				const error = root.querySelector('.fg-external-error');
				error.textContent = '';
				try { setConfigValue(key, el.type === 'checkbox' ? el.checked : el.value); }
				catch (e) { error.textContent = e.message; return; }
				const out = root.querySelector(`[data-v="${key}"]`);
				if (out) out.textContent = fmt(key);

				refreshPreview();
				refreshStatus();
			};
			el.addEventListener('change', commit);
			if (el.type === 'range') el.addEventListener('input', () => {
				sliderDrafts.set(key, el.value);
				root.querySelector(`[data-v="${key}"]`).textContent = fmt(key);
			});

			const out = root.querySelector(`[data-v="${key}"]`);
			if (out) out.textContent = fmt(key);
		});

		// 外链要走 betterncm.ncm.openUrl 交给系统浏览器，直接跳会把网易云本身导航走
		root.querySelectorAll('[data-open]').forEach((el) => {
			el.onclick = (e) => {
				e.preventDefault();
				const url = el.dataset.open;
				try {
					betterncm.ncm.openUrl(url);
				} catch (err) {
					console.warn(LOG, '打开链接失败', url, err);
				}
			};
		});

		// 这些按钮只在开发模式下存在
		const onClick = (action, handler) => {
			const el = root.querySelector(`[data-a="${action}"]`);
			if (el) el.onclick = handler;
		};
		onClick('externalRetry', retryExternal);
		onClick('externalSource', openExternalSource);
		onClick('externalAssign',()=>chooseExternalSource().catch(error=>{root.querySelector('.fg-external-error').textContent=error.message;}));
		onClick('desktopSettings', () => desktopAction('setting'));
		onClick('desktopUnlock', () => desktopAction('unlock'));
		onClick('editMode', () => toggleEditor().catch(e => { root.querySelector('.fg-external-error').textContent = e.message; }));
		onClick('cacheManager', () => editor && editor.openManager());
		onClick('rescan', () => {
			rescan();
			setTimeout(refreshStatus, 500);
		});
		onClick('probe', () => {
			probe();
			refreshStatus();
		});
		onClick('clearCache', (e) => {
			clearCache();
			e.target.textContent = '已清除';
			setTimeout(() => (e.target.textContent = '清除注音缓存'), 2000);
			refreshStatus();
		});

		const refreshAll = () => {
			for (const el of root.querySelectorAll('[data-k]')) {
				if (document.activeElement === el) continue;
				if (el.type === 'checkbox') el.checked = !!config[el.dataset.k];
				else el.value = sliderDrafts.has(el.dataset.k) ? sliderDrafts.get(el.dataset.k) : config[el.dataset.k];
				const out = root.querySelector('[data-v="' + el.dataset.k + '"]');
				if (out && out.textContent !== fmt(el.dataset.k)) out.textContent = fmt(el.dataset.k);
			}
			refreshPreview();
			refreshStatus();
		};
		refreshAll();

		// 词典就绪时立刻刷一次，不用等下一个 tick
		configRefreshers.add(refreshAll);

		// BetterNCM 会先调 onConfig 把面板建好、之后才插进 DOM，所以刚开始 root 是游离的。
		// 不能一看到没连上就清定时器，否则面板会永远停在「词典加载中」。
		let seenConnected = false;
		let ticks = 0;
		const iv = setInterval(() => {
			if (root.isConnected) seenConnected = true;
			else if (seenConnected || ++ticks > 120) {
				// 面板已关闭，或者建好之后一直没被用到（2 分钟）
				clearInterval(iv);
				configRefreshers.delete(refreshAll);
				return;
			}
			refreshAll();
		}, 1000);

		return root;
	}

	// ------------------------------------------------------------------ 入口

	function originalLoaded(plugins = window.loadedPlugins) {
		return !!window.JPFurigana || Object.values(plugins || {}).some(p => p && p.manifest && p.manifest.slug === 'jp-furigana');
	}
	function conflictPanel() {
		const box = document.createElement('div');
		const text = document.createElement('p');
		text.textContent = '检测到原版「日语歌词振假名」同时加载，Plus 已暂停。请在 BetterNCM 中移除原版后重启网易云，再使用 Plus。原有网站歌词与人工修改文件可以继续使用。';
		box.append(text);
		for (const [label, url] of [['源码仓库', REPO_URL + '/tree/standalone'], ['反馈问题', REPO_URL + '/issues']]) {
			const link = document.createElement('a'); link.href = '#'; link.textContent = label; link.style.marginRight = '16px';
			link.onclick = event => { event.preventDefault(); betterncm.ncm.openUrl(url); }; box.append(link);
		}
		return box;
	}
	plugin.onConfig(() => originalLoaded() ? conflictPanel() : buildConfigUI());

	let started = false;
	async function start(plugins) {
		if (started) return;
		started = true;
		if (originalLoaded(plugins)) { console.warn(LOG, '检测到原版，Plus 暂停；移除原版后重启即可启用'); return; }
		if (typeof kuromojiFuriganaPlus === 'undefined' || typeof FuriganaPlusCore === 'undefined') {
			console.error(LOG, 'kuromoji.js / furigana.js 未注入，检查 manifest.json 的 injects 顺序');
			return;
		}
		try {
			state.betterncmVersion = await betterncm.app.getBetterNCMVersion();
		} catch (e) {
			/* 只是给 probe 看的，拿不到就算了 */
		}
		updateStyles();
		startObserver();
		if (config.enabled) loadTokenizer();
		if (typeof FuriganaPlusEditor !== 'undefined') editor = FuriganaPlusEditor.install({
			songId: getCurrentTrackId,
			save: (anchor, value) => {
				if (getCurrentTrackId() !== anchor.songId) return Promise.reject(new Error('歌曲已切换，未保存到其他歌曲'));
				return getExternalClient().saveEdit(anchor, value, getSegmentsFromRomaji, fallbackForEdit);
			},
			changed: () => { updateStyles(); invalidateAll(); schedule(0); notifyConfigUI(); },
			list: () => getExternalClient().list({ ...config }),
			manage: (row, action) => getExternalClient().manage(row.songId, { ...config, externalCacheDir: row.path.slice(0, row.path.lastIndexOf('/')) }, action),
			play: playCached,
		});
		if (typeof FuriganaPlusDesktop !== 'undefined') desktop = FuriganaPlusDesktop.host({
			config:() => config, set:setConfigValue, snapshot:desktopSnapshot,
			transport:FuriganaPlusDesktop.browserTransport(betterncm,plugin),
			readings:text => resolveReadings(text).segments,
			skip:shouldSkipLine,
			visibility:desktopVisibility, action:desktopAction, watch:watchDesktop,
			bounds:value => {if (JSON.stringify(config.desktopBounds)!==JSON.stringify(value)) {config.desktopBounds=value;saveConfig();}},
			subscribe:fn => { configRefreshers.add(fn); return () => configRefreshers.delete(fn); },
			changed:notifyConfigUI,
		});
		if (typeof FuriganaPlusRnpSettings !== 'undefined') FuriganaPlusRnpSettings.install({
			config: () => config, set: setConfigValue,
			status: () => { const info = externalClient && externalClient.inspect(), editState=editorButtonState(); return { text: compactExternalStatus(),editText:editState.text,editWarning:editState.warning,
				canRetry: config.enabled && config.readingSource === 'external' && !!getCurrentTrackId() && currentTrackLanguage().eligible !== false, canOpen: !!(currentTrackLanguage().eligible === true && info && info.url && info.songId === getCurrentTrackId()),
				canAssign:config.enabled&&config.readingSource==='external'&&currentTrackLanguage().eligible === true&&config.externalProvider!=='utanet',
				editing: !!(editor && editor.isEnabled()), canEdit: !!(currentTrackLanguage().eligible === true && state.tokenizer), desktop:desktop ? desktop.inspect().status : '' }; },
			subscribe: fn => { configRefreshers.add(fn); return () => configRefreshers.delete(fn); },
			retry: retryExternal, openSource: openExternalSource,
			assignSource:chooseExternalSource,
			toggleEditor, openManager: () => editor && editor.openManager(),
		});
		window.JPFuriganaPlus = {
			config,
			// 高级项的界面只在开发模式下露出，非开发模式想改就走这里
			// 例如 JPFuriganaPlus.set('customSelector', 'ul.lyric > li > p')
			set: setConfigValue,
			state,
			core: FuriganaPlusCore,
			build: BUILD,
			probe,
			dumpLine,
			rescan,
			enable,
			disable,
			clearCache,
			pass: () => schedule(0),
			segments: (text) => (state.tokenizer ? getSegments(text) : null),
			readings: text => resolveReadings(text).segments,
			desktop: () => desktop && desktop.inspect(),
			trackId: getCurrentTrackId,
			romajiMap: () => state.apiRomaji,
			externalStatus: () => externalClient && externalClient.inspect(),
			languageStatus: currentTrackLanguage,
			refetchRomaji: () => {
				state.apiTrackId = null;
				state.apiRomaji = null;
				schedule(0);
			},
		};
		if (desktop) desktop.sync();
		console.log(
			LOG,
			`已加载 ${BUILD}${DEV ? '（开发模式）' : ''}，` +
				`控制台里可以用 JPFuriganaPlus.probe() 看歌词定位、JPFuriganaPlus.dumpLine() 看注音排版`
		);
	}
	// All plugin manifests are known here, independent of injection order.
	if (typeof plugin.onAllPluginsLoaded === 'function') plugin.onAllPluginsLoaded(start);
	else plugin.onLoad(() => start(window.loadedPlugins));
})();
