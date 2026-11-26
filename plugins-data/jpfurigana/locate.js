/*
 * 歌词元素定位与文本读取：先试已知选择器，失败就按「哪个祖先下面的假名文本行最多」
 * 自动找歌词容器。只读 DOM，不改动它。
 */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.FuriganaLocate = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

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

	/** 我们注上去的读音：有 ruby 排版时是 <rt>，降级时是 <span class="fg-rt"> */
	function isAnnotation(node) {
		if (!node || node.nodeType !== 1) return false;
		const n = node.nodeName;
		if (n === 'RT' || n === 'RP') return true;
		return !!(node.classList && node.classList.contains('fg-rt'));
	}

	/**
	 * RefinedNowPlaying 的「滑动」逐字动画里，每个词渲染两份文本：本体 +
	 * 一个绝对定位、用遮罩做高亮的 .rnp-karaoke-word-filler 副本。
	 * 读文本时必须忽略副本，否则整行会重复一遍，分词和偏移全错。
	 */
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

	function looksLyricish(el) {
		for (let p = el; p && p !== document.body; p = p.parentElement) {
			const cls = typeof p.className === 'string' ? p.className : '';
			if (/lyric|歌词/i.test(cls + ' ' + (p.id || ''))) return true;
		}
		return false;
	}

	function create({ config, state, core }) {
		/** 这一行要不要跳过（不注音）。制作信息的判定见 furigana.js 的 isCreditLine */
		function shouldSkipLine(text) {
			if (config.skipCredits && core.isCreditLine(text)) return true;
			if (config.skipNoKanaLines && !core.hasKana(text)) return true;
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
		const visCache = new Map(); // 每轮 collectLines 清一次，别缓存过夜
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
				if (!core.hasKana(text)) continue;
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

		/** 返回本次要处理的行元素；顺带更新 state.matchedBy / state.container */
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

		return { shouldSkipLine, isVisible, collectLines };
	}

	return { KNOWN_SELECTORS, isAnnotation, isFiller, plainText, hasText, create };
});
