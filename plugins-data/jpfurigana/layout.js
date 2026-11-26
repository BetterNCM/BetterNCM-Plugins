/*
 * 注音排版：ruby 支持检测、注音样式表、左右留白（防止注音互相挤），
 * 以及逐字歌词的行高校准（给注音让出高度，又不白占）。
 */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.FuriganaLayout = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	const CALIBRATE_MAX = 8;
	// 量高度的候选最多看这么多条，别为了校准把整页都 reflow 一遍
	const SAMPLE_LIMIT = 10;

	function clampEm(v) {
		return Math.max(-2, Math.min(2, Math.round(v * 1000) / 1000));
	}

	function styleEl(id) {
		let el = document.getElementById(id);
		if (!el) {
			el = document.createElement('style');
			el.id = id;
			document.head.appendChild(el);
		}
		return el;
	}

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

	/**
	 * api：
	 *   config, state, log, RT_WEIGHTS
	 *   lastLines()  上一轮处理过的行
	 *   editor()     编辑器实例（可能为 null）
	 *   schedule(ms) 安排下一轮 pass
	 */
	function create(api) {
		const { config, state, log, RT_WEIGHTS } = api;

		/**
		 * 这个内核认不认 ruby 排版。旧版网易云的 CEF 不认（CSS.supports('display','ruby')
		 * 是 false），它把 <rt> 当普通 block 画在底字上面 —— 看着像注音，实际每个带注音的词
		 * 白占一整个行盒（实测 21px 字号：62px vs 正常 25px），而且外面加多少边距都够不着
		 * 这块高度。这种情况下只能让注音脱离文档流，自己定位（见 updateStyles 的降级样式）。
		 */
		let rubySupport = null;
		function hasRuby() {
			if (rubySupport !== null) return rubySupport;
			try {
				// 排障用：localStorage['jp-furigana.no-ruby'] = '1' 可以强制走降级
				if (localStorage.getItem('jp-furigana.no-ruby') === '1') return (rubySupport = false);
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

		// ------------------------------------------------------------ 通知 RNP 重量行高

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
			// 放到本次 pass 之后再发，免得它同步改的 DOM 被 pass 的 takeRecords() 吞掉
			setTimeout(() => {
				try {
					window.dispatchEvent(new Event('recalc-lyrics'));
				} catch (e) {
					/* 没这个插件就没人听 */
				}
			}, 0);
		}

		// ------------------------------------------------------------ 行高校准

		/*
		 * 逐字宿主要给注音让出多少高度：正数往外让（注音戳出盒子的情况），
		 * 负数把多让的收回来（注音已经算进盒子高度的情况）。写死一个值总有一边不对，
		 * 所以量现场：注音上边离行盒上边的空隙 gap，目标是贴着顶留 1px。
		 * 差多少就往 --fg-word-offset 上补多少（1:1，一两轮就收敛）。
		 *
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
		 * 拿同一份歌词里「没有注音的那些行」当基准 —— 它们就是这套 CSS 下一行该有多高。
		 * 有注音的行应该正好高出一个注音的高度，多出来的都是白占的。
		 */
		function referenceHeight(sample) {
			const plain = api.lastLines().filter(
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
				api.lastLines().filter(
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

				// 1) 顶：注音贴着行盒顶，留 1px
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
					api.schedule(60);
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
					api.schedule(60);
					continue;
				}

				c.tries = CALIBRATE_MAX; // 这个上下文两头都对上了
			}
		}

		// ------------------------------------------------------------ 注音左右留白

		let spacingVersion = 1, spacingCanvas = null;

		/** 按 CSS 字体量文字宽度，计入 letter-spacing */
		function measure(text, css) {
			spacingCanvas.font = css.font || `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
			return spacingCanvas.measureText(text).width + Math.max(0, text.length - 1) * (parseFloat(css.letterSpacing) || 0);
		}

		/** 注音比底字宽时，给底字左右补留白，免得相邻注音挤在一起 */
		function spaceAnnotations(lines) {
			if (typeof CanvasRenderingContext2D === 'undefined') return; // DOM-only test environments
			if (!spacingCanvas) spacingCanvas = document.createElement('canvas').getContext('2d');
			if (!spacingCanvas) return;
			const editor = api.editor();
			let resized = false;
			for (const line of lines) {
				const cached = line.__fgSpacingWrap, now = performance.now();
				const clean = line.__fgSpacingVersion === spacingVersion && cached && cached.isConnected && line.contains(cached);
				if (clean && now - line.__fgSpacingProbe < 250) continue;
				const first = clean && line.__fgSpacingSample && line.__fgSpacingSample.isConnected ? line.__fgSpacingSample : line.querySelector('.fg-ruby');
				if (!first) continue;
				const sample = getComputedStyle(first);
				line.__fgSpacingProbe = now;
				const fontKey = [sample.fontFamily, sample.fontSize, sample.fontWeight, sample.fontStyle, sample.letterSpacing].join('|');
				if (clean && line.__fgSpacingFont === fontKey) continue;
				for (const holder of line.querySelectorAll('.fg-ruby')) {
					const rt = holder.querySelector('.fg-rt');
					if (!rt || !rt.textContent) continue;
					const baseStyle = getComputedStyle(holder), rtStyle = getComputedStyle(rt), size = parseFloat(baseStyle.fontSize);
					if (!size) continue;
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
				line.__fgSpacingVersion = spacingVersion;
				line.__fgSpacingFont = fontKey;
				line.__fgSpacingWrap = line.querySelector('.fg-line');
				line.__fgSpacingSample = first;
			}
			if (resized) requestRecalc();
		}

		// ------------------------------------------------------------ 样式表

		function updateStyles() {
			spacingVersion++;
			resetCalibration(); // 注音字号变了，让位的高度也要重量
			// 旧配置或手改的值认不出来就退回常规字重，也避免把任意字符串拼进 CSS
			const weight = RT_WEIGHTS.includes(config.rtWeight) ? config.rtWeight : '400';
			styleEl('jp-furigana-style').textContent = `
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
					font-weight: ${weight === 'follow' ? 'inherit' : weight};
					letter-spacing: 0;
					line-height: 1.1;
					text-align: center;
					user-select: none;
					-webkit-user-select: none;
					white-space: nowrap;
				}
			`;
		}

		return {
			hasRuby, requestRecalc, resetCalibration, calibrate, referenceHeight,
			spaceAnnotations, updateStyles, CALIBRATIONS,
		};
	}

	return { create, annotationGap, CALIBRATE_MAX };
});
