/*
 * 日语歌词振假名 (jp-furigana) —— BetterNCM 插件
 *
 * 思路：
 *   1. kuromoji + IPADIC 全部打包在插件目录里，词典通过 betterncm.fs 读，完全离线。
 *   2. 歌词元素不写死选择器 —— 先试已知选择器，失败就按「哪个祖先下面的假名文本行最多」
 *      自动找歌词容器（见 locate.js）。
 *   3. 改 DOM 时把 React 原本的子节点存下来，每次重算前先还原，避免和 React 抢节点
 *      导致歌词卡住不更新（见 restore / applyWrap）。
 */
(() => {
	'use strict';

	const LOG = '[jp-furigana]';
	// 这几个模块是主流程必需的；manifest.json 的 injects 里要排在 main.js 前面
	const missing = ['FuriganaCore', 'FuriganaTrack', 'FuriganaLocate', 'FuriganaLayout'].filter(
		(name) => typeof globalThis[name] === 'undefined'
	);
	if (missing.length) {
		console.error(LOG, `${missing.join(' / ')} 未注入，检查 manifest.json 的 injects 顺序`);
		return;
	}
	// 改了实现就换一下，方便确认插件到底有没有被重新加载（JPFurigana.build）
	const BUILD = '1.2.1-browser';
	const REPO_URL = 'https://github.com/Leleawa/jp-furigana';
	const CONFIG_KEY = 'jp-furigana.config';
	// 注音算法改了就换 key，让旧缓存自然失效
	const CACHE_KEY = 'jp-furigana.cache.v4';
	const CACHE_LIMIT = 4000;

	const DEFAULTS = {
		enabled: true,
		kana: 'hiragana', // hiragana | katakana
		// romaji = 优先用网易云接口给的官方音译，拿不到或对不齐才退回词典；dict = 只用词典
		readingSource: 'romaji',
		externalProvider: 'auto', // UtaTen first, then Uta-Net
		externalAutoRetry: 'failed', // off | failed (at most three transient-error retries per load)
		externalCacheDir: '', // default: <BetterNCM data>/lyrics/jp-furigana
		externalConsent: false, // 用户在提示窗口里确认过才会访问外部歌词网站
		rtSize: 60, // rt 相对底字的百分比
		rtOpacity: 80, // rt 不透明度百分比
		rtWeight: '400', // rt 字重：follow = 跟随歌词字重，其余是固定字重
		karaoke: true, // 逐字歌词：把注音按字符偏移分发到内部的 span，保留逐字动画
		onlyFirstLine: true, // 一行里只给原文注音，跳过翻译/罗马音
		skipCredits: true, // 跳过「作词:／编曲:」这类制作信息行
		skipNoKanaLines: true, // 跳过一个假名都没有的行（基本都是中文翻译或版权声明）
		requireLyricClass: true, // 自动检测时要求祖先 class 含 "lyric"，避免误伤歌单等界面
		customSelector: '',
		verbose: false,
	};

	// 注音字重：follow = 继承歌词本身的字重；其余是固定字重
	const RT_WEIGHTS = ['follow', '300', '400', '500', '600', '700'];

	// ------------------------------------------------------------------ 配置

	// 改了某项默认值就 +1，让已经存过设置的用户也跟上（见 loadConfig）
	const CONFIG_VERSION = 4;

	function loadConfig() {
		let saved = {};
		try {
			let raw = localStorage.getItem(CONFIG_KEY);
			// Copy Plus preferences only when the upstream plugin has no saved settings.
			// Existing upstream settings remain authoritative; song JSON files are shared.
			if (raw === null) {
				const legacy = localStorage.getItem('jp-furigana-plus.config');
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
		if (!RT_WEIGHTS.includes(cfg.rtWeight)) cfg.rtWeight = DEFAULTS.rtWeight;
		// Retain the current configuration revision without bringing Plus-only settings.
		if (!(saved.configVersion >= CONFIG_VERSION)) cfg.migrated = true;
		for (const key of Object.keys(cfg)) if (key.startsWith('desktop')) { delete cfg[key]; cfg.migrated = true; }
		for (const key of ['externalProxyEnabled','externalProxy']) if (Object.prototype.hasOwnProperty.call(cfg,key)) { delete cfg[key]; cfg.migrated = true; }
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
	// 装成 .plugin 后想排障可以在控制台执行 localStorage['jp-furigana.dev'] = '1' 再重启。
	const DEV = (() => {
		try {
			if (typeof plugin !== 'undefined' && plugin.devMode) return true;
			return localStorage.getItem('jp-furigana.dev') === '1';
		} catch (e) {
			return false;
		}
	})();

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
		srcExternal: 0,
		srcRomaji: 0,
		srcDict: 0,
		lastPassMs: 0,
	};

	function log(...args) {
		if (config.verbose) console.log(LOG, ...args);
	}

	// ------------------------------------------------------------------ 模块装配
	// 网易云曲目与接口见 ncm-track.js，歌词定位见 locate.js，排版与校准见 layout.js。

	const track = FuriganaTrack.create({
		LOG, state, core: FuriganaCore,
		hooks: {
			onTrackChange: (id) => { if (state.externalTrackId && state.externalTrackId !== id) resetExternal(); },
			onRomajiReady: () => { invalidateAll(); schedule(0); notifyConfigUI(); }, // 之前按词典注过的行要重做
			onRomajiFailed: () => notifyConfigUI(),
		},
	});
	const {
		getCurrentTrackId, clientTrackLines, currentTrackLanguage, requireJapaneseTrack, ensureApiRomaji,
		playKey: externalPlayKey, trackMetadata: currentTrackMetadata,
	} = track;

	const { isFiller, plainText, hasText, KNOWN_SELECTORS } = FuriganaLocate;
	const { shouldSkipLine, isVisible, collectLines } = FuriganaLocate.create({ config, state, core: FuriganaCore });

	const { annotationGap, CALIBRATE_MAX } = FuriganaLayout;
	const {
		hasRuby, requestRecalc, resetCalibration, calibrate, referenceHeight,
		spaceAnnotations, updateStyles, CALIBRATIONS,
	} = FuriganaLayout.create({
		config, state, log, RT_WEIGHTS,
		lastLines: () => lastLines,
		editor: () => editor,
		schedule: (delay) => schedule(delay),
	});

	// ------------------------------------------------------------------ 缓存

	/** 原文行 -> 注音片段。内存 Map + localStorage 持久化。 */
	const cache = new Map();
	try {
		localStorage.removeItem('jp-furigana.cache.v3'); // obsolete results could include missing readings
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
		const segs = FuriganaCore.tokensToSegments(FuriganaCore.tokenizeForReading(state.tokenizer, text), {
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
		const kana = FuriganaCore.romajiToKana(romaji);
		// 结构取自词典分词，读音取自音译；见 furigana.js 的 segmentsFromReading
		const segs = kana
			? FuriganaCore.segmentsFromReading(text, kana, getSegments(text), {
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
		globalThis.__FURIGANA_DICT_LOADER__ = async (path) => {
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
		candidates.push('./plugins_dev/jp-furigana/dict');
		candidates.push('./plugins_runtime/jp-furigana/dict');
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
		kuromoji.builder({ dicPath }).build((err, tokenizer) => {
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

	// ------------------------------------------------------ 外部网站（按需联网）
	let externalClient = null;
	let editor = null, playPending = false, playPendingTarget = null, editPreparing = false, editEntry = 0;
	let alignmentNative = null, alignmentOriginals = null;
	function currentOriginalLines(id) {
		if(id!==getCurrentTrackId())return null;
		const evidence=state.evidence && state.evidence.songId===id ? state.evidence : null;
		if(evidence && evidence.alignmentLines && evidence.alignmentLines.length)return evidence.alignmentLines;
		const native=clientTrackLines(id);
		if(!native.length)return evidence && evidence.lines || null;
		if(native!==alignmentNative){alignmentNative=native;alignmentOriginals=native.map(l=>l.text);}
		return alignmentOriginals;
	}
	function getExternalClient() {
		if (!externalClient && typeof FuriganaExternal !== 'undefined') {
			externalClient = FuriganaExternal.create({
				...FuriganaExternal.browserTransport(betterncm, plugin),
				originalLines:currentOriginalLines,
				lyrics: track.lyricLines,
				onReady: () => { invalidateAll(); schedule(0); notifyConfigUI(); },
				onInvalidated: id => {
					if (state.externalTrackId === id) { state.externalTrackId = null; state.externalPlayKey = null; state.editInterrupt = null; editEntry++; }
				},
				onStatus: () => notifyConfigUI(),
			});
		}
		return externalClient;
	}
	function resetExternal() {
		state.externalTrackId = null;
		state.externalPlayKey = null; state.editInterrupt = null;
		if (externalClient) externalClient.stop();
	}
	function ensureExternal() {
		if (config.readingSource !== 'external' || editPreparing) return;
		// 旧版本里已经选了外部网站、但还没看过提示的，先确认再联网
		if (!config.externalConsent) {
			ensureExternalConsent().then(ok => { if (ok) schedule(0); else if (config.readingSource === 'external') setConfigValue('readingSource', 'romaji'); });
			return;
		}
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

	// Rendering and editing resolve website readings and user corrections here.
	function resolveReadings(text) {
		if (getCurrentTrackId() && currentTrackLanguage().eligible !== true) return { segments:[{text}], source:null };
		if (!state.tokenizer || shouldSkipLine(text)) return { segments:[{text}], source:null };
		let segments = null, source = 'dict';
		if (config.readingSource === 'external' && externalClient && state.externalTrackId === getCurrentTrackId()) {
			segments = externalClient.segments(text, config.kana, getSegmentsFromRomaji);
			if (segments) source = 'external';
		}
		if(!segments && !FuriganaCore.hasKanji(text))return {segments:[{text}],source:null};
		if (!segments && (config.readingSource === 'romaji' || config.readingSource === 'external') && state.apiRomaji) {
			const romaji = state.apiRomaji.get(FuriganaCore.lyricKey(text));
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
		if (!FuriganaCore.hasKanji(text) && config.readingSource !== 'external') {
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
			const japanese = getCurrentTrackId() ? currentTrackLanguage().eligible === true : FuriganaCore.hasJapaneseLyrics(lines.map(plainText));
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

	// ------------------------------------------------------------------ 调试接口（见 probe.js）

	const diagnostics = typeof FuriganaProbe !== 'undefined'
		? FuriganaProbe.create({
				LOG, BUILD, config, state, core: FuriganaCore,
				KNOWN_SELECTORS, CALIBRATIONS, CALIBRATE_MAX,
				lastLines: () => lastLines,
				externalClient: () => externalClient,
				editor: () => editor,
				collectLines, currentTrackLanguage, getCurrentTrackId, hasRuby,
				hasText, isVisible, plainText, annotationGap, referenceHeight,
		  })
		: null;
	const probe = () => (diagnostics ? diagnostics.probe() : console.warn(LOG, 'probe.js 未注入'));
	const dumpLine = (index) => (diagnostics ? diagnostics.dumpLine(index) : 'probe.js 未注入');

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

	// ------------------------------------------------------------------ 设置（界面见 config-ui.js）


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
	const NEEDS_RESCAN = ['kana', 'readingSource', 'externalProvider', 'externalCacheDir',
		'karaoke', 'onlyFirstLine', 'skipCredits', 'skipNoKanaLines', 'requireLyricClass', 'customSelector'];
	function setConfigValue(key, value) {
		if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) throw new Error('未知设置项');
		if (!editPreparing && ['readingSource','externalProvider','externalCacheDir'].includes(key)) {editEntry++;state.editInterrupt=null;}
		if (key === 'rtSize' || key === 'rtOpacity') {
			value = Number(value); if (!Number.isFinite(value)) throw new Error('请输入有效数值');
			value = Math.max(20, Math.min(100, Math.round(value)));
		}
		if (key === 'rtWeight') value = String(value);
		const choices = { readingSource: ['romaji', 'dict', 'external'], externalProvider: ['auto', 'utaten', 'utanet'], externalAutoRetry: ['off', 'failed'], kana: ['hiragana', 'katakana'], rtWeight: RT_WEIGHTS };
		if (choices[key] && !choices[key].includes(value)) throw new Error('无效的设置选项');
		if (key === 'readingSource' && value === 'external' && !config.externalConsent) {
			// 先弹提示，确认后再真正切过去；取消就保持原来的读音来源
			ensureExternalConsent().then(ok => { if (ok && config.readingSource !== 'external') setConfigValue(key, value); else notifyConfigUI(); });
			notifyConfigUI();
			return config[key];
		}
		if (typeof DEFAULTS[key] === 'boolean') value = !!value;
		config[key] = value; saveConfig(); updateStyles();
		if (key === 'enabled') value ? enable() : disable();
		else if (key === 'externalAutoRetry') { if (externalClient) externalClient.setAutoRetry(value); }
		else if (NEEDS_RESCAN.includes(key)) rescan();
		else if (key === 'rtWeight') schedule(0); // 字重改了，注音宽度和行高补偿要重量一次
		notifyConfigUI();
		return config[key];
	}
	let consentPending = null;
	function ensureExternalConsent() {
		if (config.externalConsent) return Promise.resolve(true);
		if (!consentPending) consentPending = FuriganaSourceDialog.confirmExternal({ openUrl: url => betterncm.ncm.openUrl(url) })
			.then(ok => { consentPending = null; if (ok) { config.externalConsent = true; saveConfig(); } return ok; });
		return consentPending;
	}
	// 撤销之前的确认：切回网易云音译，下次开启外部网站会重新弹提示。已缓存的歌词文件不动
	function revokeExternalConsent() {
		if (config.readingSource === 'external') setConfigValue('readingSource', 'romaji');
		setConfigValue('externalConsent', false);
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
		if (info && FuriganaExternalCore.allowedURL(info.url)) betterncm.ncm.openUrl(info.url);
	}
	async function chooseExternalSource(){
		if(!config.enabled||config.readingSource!=='external'||!getCurrentTrackId())throw new Error('请先播放歌曲并启用外部网站注音');
		if(config.externalProvider==='utanet')throw new Error('手动指定 UtaTen 歌词页时，请将网站范围设为自动或 UtaTen');
		const id=getCurrentTrackId();await requireJapaneseTrack(id);
		const client=getExternalClient(),info=client.inspect();
		const selected=await FuriganaSourceDialog.open({trackId:getCurrentTrackId,url:info.songId===id?(info.manualUrl||(info.source==='utaten'?info.url:'')):'',validate:FuriganaExternalCore.utatenURL});
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
		const romaji = state.apiRomaji && state.apiRomaji.get(FuriganaCore.lyricKey(text));
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
		if (!await ensureExternalConsent()) return;
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
	function buildConfigUI() {
		return FuriganaConfigUI.build({
			LOG, REPO_URL, DEV, config, state,
			cacheSize: () => cache.size,
			externalClient: () => externalClient,
			editor: () => editor,
			renderPreview: (text) => buildWrap(getSegments(text)),
			openUrl: (url) => betterncm.ncm.openUrl(url),
			subscribe: (fn) => { configRefreshers.add(fn); return () => configRefreshers.delete(fn); },
			getCurrentTrackId, currentTrackLanguage, externalStatusText, editorButtonState,
			setConfigValue, retryExternal, openExternalSource, chooseExternalSource,
			toggleEditor, revokeExternalConsent, rescan, probe, clearCache,
		});
	}

	// ------------------------------------------------------------------ 入口

	if (typeof FuriganaConfigUI !== 'undefined') plugin.onConfig(buildConfigUI);

	let started = false;
	async function start(plugins) {
		if (started) return;
		started = true;
		if (typeof kuromoji === 'undefined' || typeof FuriganaCore === 'undefined') {
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
		if (typeof FuriganaEditor !== 'undefined') editor = FuriganaEditor.install({
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
		if (typeof FuriganaRnpSettings !== 'undefined') FuriganaRnpSettings.install({
			config: () => config, set: setConfigValue,
			status: () => { const info = externalClient && externalClient.inspect(), editState=editorButtonState(); return { text: compactExternalStatus(),editText:editState.text,editWarning:editState.warning,
				canRetry: config.enabled && config.readingSource === 'external' && !!getCurrentTrackId() && currentTrackLanguage().eligible !== false, canOpen: !!(currentTrackLanguage().eligible === true && info && info.url && info.songId === getCurrentTrackId()),
				canAssign:config.enabled&&config.readingSource==='external'&&currentTrackLanguage().eligible === true&&config.externalProvider!=='utanet',
				editing: !!(editor && editor.isEnabled()), canEdit: !!(currentTrackLanguage().eligible === true && state.tokenizer) }; },
			subscribe: fn => { configRefreshers.add(fn); return () => configRefreshers.delete(fn); },
			retry: retryExternal, openSource: openExternalSource,
			assignSource:chooseExternalSource,
			toggleEditor, openManager: () => editor && editor.openManager(),
		});
		window.JPFurigana = {
			config,
			// 高级项的界面只在开发模式下露出，非开发模式想改就走这里
			// 例如 JPFurigana.set('customSelector', 'ul.lyric > li > p')
			set: setConfigValue,
			state,
			core: FuriganaCore,
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
		console.log(
			LOG,
			`已加载 ${BUILD}${DEV ? '（开发模式）' : ''}，` +
				`控制台里可以用 JPFurigana.probe() 看歌词定位、JPFurigana.dumpLine() 看注音排版`
		);
	}
	// All plugin manifests are known here, independent of injection order.
	if (typeof plugin.onAllPluginsLoaded === 'function') plugin.onAllPluginsLoaded(start);
	else plugin.onLoad(() => start(window.loadedPlugins));
})();
