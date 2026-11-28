/*
 * local-furigana.js —— 本地优先注音
 *
 * 输出格式与原来的远端接口（back-end/index.js 的 annotateLine）逐字节一致：
 *   每行分词 → 含汉字的词包成 <ruby>词<rt>读音</rt></ruby>，其余原样拼回
 * 所以从远端切到本地，用户看到的注音结果不变，只是不再发请求。
 *
 * 词表：mecab-ipadic-2.7.0-20070801（NAIST + ICOT，见 NOTICE.md）
 * 分词器：kuromoji.js 0.1.2 修改版（见文件头与 LICENSE-kuromoji.txt）
 *
 * 词典在第一次需要注音时才加载（约 0.7 秒），之后常驻内存。
 * 加载失败不致命：抛出的错误带 fatal 标记，由调用方退回远端接口。
 */
(function (root, factory) {
	const api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.FuriganaLocal = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
	'use strict';

	// 与后端保持一字不差
	const KANJI_REGEX = /[㐀-鿿々]/;

	let tokenizerPromise = null;
	let loadFailed = false;
	// idle → loading → ready / failed
	let state = 'idle';
	let loadMs = 0;

	/** 片假名 → 平假名（与后端同范围，不含长音符） */
	function katakanaToHiragana(text = '') {
		return text.replace(/[ァ-ン]/g, (c) =>
			String.fromCharCode(c.charCodeAt(0) - 0x60)
		);
	}

	function fatal(message) {
		const err = new Error(message);
		err.fatal = true;
		return err;
	}

	/**
	 * kuromoji.js 读词典走 ArrayBuffer；在 BetterNCM 里用 betterncm.fs 读本地文件，
	 * 不依赖 XHR，也就不受跨域与 file:// 限制。
	 */
	function installDictLoader() {
		if (typeof betterncm === 'undefined' || !betterncm.fs || !betterncm.fs.readFile)
			return false;
		globalThis.__FURIGANA_DICT_LOADER__ = async (path) => {
			const data = await betterncm.fs.readFile(path);
			if (data instanceof ArrayBuffer) return data;
			if (data && typeof data.arrayBuffer === 'function') return data.arrayBuffer();
			// Node Buffer / TypedArray：按自己的视图切出来，别把整块 ArrayBuffer 交出去
			if (data && data.buffer instanceof ArrayBuffer) {
				if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength)
					return data.buffer;
				return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
			}
			throw new Error('无法识别 betterncm.fs.readFile 的返回类型');
		};
		return true;
	}

	/** 优先用插件自己的路径，装错位置时退回常见目录 */
	async function resolveDicPath() {
		const candidates = [];
		if (typeof plugin !== 'undefined' && plugin.pluginPath)
			candidates.push(plugin.pluginPath + '/dict');
		candidates.push('./plugins_dev/Furigana-api-fixed/dict');
		candidates.push('./plugins_runtime/Furigana-api-fixed/dict');
		candidates.push('./plugins_dev/JapaneseFonts/dict');
		candidates.push('./plugins_runtime/JapaneseFonts/dict');
		for (const c of candidates) {
			try {
				if (await betterncm.fs.exists(c + '/base.dat.gz')) return c;
			} catch (e) {
				/* 换下一个 */
			}
		}
		return candidates[0];
	}

	/** 加载并缓存分词器 */
	function load() {
		if (loadFailed) return Promise.reject(fatal('本地词典不可用'));
		if (tokenizerPromise) return tokenizerPromise;

		state = 'loading';
		tokenizerPromise = (async () => {
			if (typeof kuromoji === 'undefined')
				throw fatal('kuromoji.js 未加载');
			if (!installDictLoader())
				throw fatal('betterncm.fs 不可用');

			const dicPath = await resolveDicPath();
			const t0 = Date.now();
			const tokenizer = await new Promise((resolve, reject) => {
				try {
					kuromoji.builder({ dicPath }).build((err, t) =>
						err ? reject(err) : resolve(t)
					);
				} catch (e) {
					reject(e);
				}
			});
			loadMs = Date.now() - t0;
			state = 'ready';
			console.log(`Furigana: 本地词典加载完成，耗时 ${loadMs}ms`);
			return tokenizer;
		})().catch((err) => {
			loadFailed = true;
			state = 'failed';
			tokenizerPromise = null;
			console.error('Furigana: 本地词典加载失败', err);
			throw err.fatal ? err : fatal('本地词典加载失败：' + (err && err.message));
		});

		return tokenizerPromise;
	}

	/** 供设置页显示：{ state: idle|loading|ready|failed, ms: 首次加载耗时 } */
	function status() {
		return { state, ms: loadMs };
	}

	/** 单行注音（与后端 annotateLine 等价） */
	function annotateLine(tokenizer, text) {
		if (!text) return '';
		let tokens;
		try {
			tokens = tokenizer.tokenize(text) || [];
		} catch (e) {
			return text; // 分词失败就原样返回，不要吞掉歌词
		}
		return tokens
			.map((t) => {
				const surface = t.surface_form || '';
				if (!surface) return '';
				if (!KANJI_REGEX.test(surface)) return surface;
				const reading = t.reading || '';
				const furigana = reading ? katakanaToHiragana(reading) : '';
				return `<ruby>${surface}<rt>${furigana}</rt></ruby>`;
			})
			.join('');
	}

	/**
	 * 注音入口：整段歌词（换行分隔）→ 同样的 HTML 文本
	 * @param {string} str
	 * @returns {Promise<string>}
	 */
	async function annotate(str) {
		const tokenizer = await load();
		return String(str)
			.split('\n')
			.map((line) => annotateLine(tokenizer, line))
			.join('\n');
	}

	/** 词典是否已就绪（设置面板用） */
	function isReady() {
		return !loadFailed && !!tokenizerPromise;
	}

	return { annotate, load, isReady, status, katakanaToHiragana };
});
