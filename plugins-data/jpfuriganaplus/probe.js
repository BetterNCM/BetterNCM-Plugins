/* 控制台诊断：JPFuriganaPlus.probe() 看歌词定位与读音来源，JPFuriganaPlus.dumpLine() 看注音排版。 */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.FuriganaPlusProbe = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	const SOURCE_NAMES = { external: '外部网站', romaji: '官方音译', dict: '词典' };
	const READING_SOURCE_NAMES = { romaji: '网易云音译优先', dict: '只用词典', external: '外部网站' };
	const PROVIDER_NAMES = { auto: 'UtaTen 优先，歌ネット备用', utaten: '仅 UtaTen', utanet: '仅歌ネット' };

	/**
	 * api 由 main.js 提供；会变的值（行列表、外部客户端、编辑器）都以函数形式传入，
	 * 每次调用时取当前值。
	 */
	function create(api) {
		const { LOG, BUILD, config, state, core } = api;

		/** 把已注音的一行读回「漢字(かんじ)」这样的纯文本，不用看 HTML 就能核对读音 */
		function annotationPreview(line) {
			const out = [];
			for (const host of line.__fgHosts || []) {
				const wrap = host.__fgWrap;
				if (!wrap) continue;
				for (const node of wrap.childNodes) {
					if (node.nodeType === 3) { out.push(node.nodeValue); continue; }
					if (!node.classList) continue;
					if (node.classList.contains('fg-hide')) continue; // 原文自带的「（かな）」括号
					const base = node.__fgBase != null ? node.__fgBase : node.textContent;
					// 编辑模式下 .fg-rt 里还挂着被划掉的旧读音，所以优先读 .fg-reading
					const rt = node.querySelector('.fg-reading') || node.querySelector('.fg-rt');
					const reading = rt ? rt.textContent : '';
					out.push(reading ? `${base}(${reading})` : base);
				}
			}
			return out.join('');
		}

		/** 一行为什么没注音；顺序和 main.js 的 processLine 里的判断保持一致 */
		function skipReason(text) {
			if (config.skipCredits && core.isCreditLine(text)) return '制作信息行';
			if (config.skipNoKanaLines && !core.hasKana(text)) return '没有假名';
			if (!core.hasKanji(text)) return '没有汉字';
			return '没取到读音';
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

		function probe() {
			// 先跑一次定位，报告里的 matchedBy 和行分类才是此刻的真相
			const lines = api.collectLines().filter(Boolean);
			const done = lines.filter((l) => l.__fgHosts && l.__fgHosts.length);
			const skipped = lines.filter((l) => l.__fgHosts && !l.__fgHosts.length);
			const pending = lines.filter((l) => !l.__fgHosts);
			const bySrc = (s) => done.filter((l) => l.__fgSource === s).length;
			const client = api.externalClient();
			const external = client && client.inspect();
			const editor = api.editor();
			const language = api.currentTrackLanguage();
			const trackId = api.getCurrentTrackId();
			const info = {
				build: BUILD,
				betterncm: state.betterncmVersion,
				tokenizerReady: !!state.tokenizer,
				loadError: state.loadError && String(state.loadError),
				readingSource: config.readingSource,
				matchedBy: state.matchedBy,
				lineCount: lines.length,
				done: done.length,
				skipped: skipped.length,
				pending: pending.length,
				srcExternal: bySrc('external'),
				srcRomaji: bySrc('romaji'),
				srcDict: bySrc('dict'),
				lastPassMs: state.lastPassMs,
				trackId,
				japanese: language.eligible,
				apiStatus: state.apiStatus,
				apiTrackId: state.apiTrackId,
				storeFound: !!state.store,
				external: external && {
					status: external.status,
					source: external.source,
					url: external.url,
					edits: external.edits,
					loading: external.loading,
				},
				container: state.container
					? {
							tag: state.container.tagName,
							cls: state.container.className,
							children: state.container.children.length,
					  }
					: null,
			};

			const row = (...parts) => console.log(LOG, parts.filter(Boolean).join('｜'));
			const sub = (text) => console.log('    ' + text);

			console.log(LOG, `probe ${BUILD}`, info);
			row(
				`环境：BetterNCM ${state.betterncmVersion || '未知'}`,
				`词典 ${state.tokenizer ? '已就绪' : state.loadError ? '加载失败：' + state.loadError : '加载中'}`,
				`内核 ruby ${api.hasRuby() ? '支持' : '不支持（降级排版）'}`,
				`注音 ${config.enabled ? '已启用' : '已关闭'}`
			);
			row(
				`设置：读音来源 ${READING_SOURCE_NAMES[config.readingSource] || config.readingSource}` +
					(config.readingSource === 'external'
						? `（${PROVIDER_NAMES[config.externalProvider] || config.externalProvider}）`
						: ''),
				config.kana === 'katakana' ? '片假名' : '平假名',
				`逐字歌词 ${config.karaoke ? '开' : '关'}`,
				`编辑模式 ${editor && editor.isEnabled() ? '开' : '关'}`
			);
			row(
				`当前曲目：id ${trackId || '未知'}`,
				`语种 ${language.eligible === true ? '日语' : language.eligible === false ? '非日语，整首跳过' : '确认中'}`
			);
			row(`歌词容器：${state.matchedBy || '未找到歌词元素'}`, `${lines.length} 行`, `上次耗时 ${state.lastPassMs}ms`);
			if (lines.length) sub('path: ' + domPath(lines[0]));
			row(`处理结果：已注音 ${done.length}`, `跳过 ${skipped.length}`, `未处理 ${pending.length}`);

			// 这里统计的是「每一行最终用了谁的读音」，和下面官方音译数据的行数不是一回事
			const rest = done.length - info.srcExternal - info.srcRomaji - info.srcDict;
			const dist = [
				['external', info.srcExternal],
				['romaji', info.srcRomaji],
				['dict', info.srcDict],
			]
				.filter(([s, n]) => n || s !== 'external' || config.readingSource === 'external')
				.map(([s, n]) => `${SOURCE_NAMES[s]} ${n} 行`);
			if (rest > 0) dist.push(`其他 ${rest} 行`);
			console.log(LOG, '读音来源（按行统计）：' + dist.join('｜'));

			const romajiRole =
				config.readingSource === 'dict'
					? '当前设置不用它'
					: config.readingSource === 'external'
					? '只给网站未命中的行兜底'
					: '优先用它';
			console.log(
				LOG,
				`官方音译数据：${state.apiStatus}（${romajiRole}；曲目 id ${state.apiTrackId || '未知'}，` +
					`Redux store ${state.store ? '已找到' : '未找到'}）`
			);

			if (config.readingSource === 'external' || (external && external.ready)) {
				if (!external) console.log(LOG, '外部网站：尚未初始化');
				else {
					// 状态文案本身是给设置面板用的多行文本，这里只把第一行放进标题
					const status = String(external.status || '未请求').split('\n');
					row(
						`外部网站：${status[0]}`,
						external.source && `来源 ${external.source}`,
						external.loading && '获取中',
						external.waitingRetry && '等待重试',
						external.edits ? `人工纠音 ${external.edits} 条` : ''
					);
					for (const extra of status.slice(1)) if (extra.trim()) sub(extra.trim());
					if (external.error) sub('错误：' + external.error);
					if (external.warning) sub('提示：' + external.warning);
					if (external.url) sub('来源网页：' + external.url);
					if (external.cachePath) sub('缓存目录：' + external.cachePath);
					if (external.songId && external.songId !== trackId)
						sub(`注意：网站数据属于曲目 ${external.songId}，当前曲目 ${trackId || '未知'}`);
				}
			}

			console.log(LOG, '已知选择器命中（至少两行可见才会被采用）：');
			for (const sel of api.KNOWN_SELECTORS) {
				let found;
				try {
					found = [...document.querySelectorAll(sel)];
				} catch (e) {
					sub(`选择器无效：${sel}`);
					continue;
				}
				const texted = found.filter(api.hasText);
				const visible = texted.filter(api.isVisible).length;
				const mine = state.matchedBy && state.matchedBy.indexOf('known:' + sel) === 0;
				sub(`命中 ${found.length} / 有文字 ${texted.length} / 可见 ${visible}　${sel}${mine ? '　← 本次使用' : ''}`);
			}

			// 前几行往往是「作词:/编曲:」这类被跳过的行，所以三类分别取样
			const dump = (label, list, n, reason) => {
				list.slice(0, n).forEach((l, i) => {
					const text = api.plainText(l);
					console.log(LOG, `取样 ${label} #${i + 1}：${text}`);
					if (reason) sub('原因：' + reason(text));
					if (l.__fgErrMsg) sub('处理失败：' + l.__fgErrMsg);
					if (l.__fgHosts && l.__fgHosts.length) {
						sub(`来源：${SOURCE_NAMES[l.__fgSource] || l.__fgSource || '未知'}`);
						sub('注音：' + (annotationPreview(l) || '（空）'));
					}
					const romaji = state.apiRomaji && state.apiRomaji.get(core.lyricKey(text));
					if (romaji) sub('官方音译：' + romaji);
					sub('html：' + l.outerHTML.slice(0, 400));
				});
			};
			dump('已注音', done, 2);
			dump('跳过', skipped, 2, skipReason);
			dump('未处理', pending, 2);

			return info;
		}

		/**
		 * 量一行的实际排版：注音相对底字偏了多少、词盒被撑宽了多少、
		 * 逐字歌词是怎么切的。位置不对时靠这个看，比截图准。
		 *   JPFuriganaPlus.dumpLine()   第一行已注音的
		 *   JPFuriganaPlus.dumpLine(2)  第三行
		 */
		function dumpLine(index) {
			const lastLines = api.lastLines();
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

			const ruby = api.hasRuby();
			const gap = api.annotationGap(line);
			const info = {
				build: BUILD,
				ruby排版: ruby ? '内核原生' : '降级（注音绝对定位）',
				注音让位: ruby
					? api.CALIBRATIONS.map(
							(c) => `${c.key}: 顶 ${c.top}em / 底 ${c.tail}em${c.tries >= api.CALIBRATE_MAX ? '（已收敛）' : ''}`
					  ).join('  |  ')
					: '降级模式不需要（注音不占高度）',
				注音顶离行盒顶: gap ? Math.round(gap.gap * 10) / 10 : null,
				注音压住底字: gap && gap.overlap != null ? Math.round(gap.overlap * 10) / 10 : null,
				没注音的行高: (() => {
					const em = api.referenceHeight(line);
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

		return { probe, dumpLine };
	}

	return { create };
});
