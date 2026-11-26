/* BetterNCM 插件设置页（plugin.onConfig 返回的面板）。设置逻辑在 main.js，这里只负责界面。 */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.FuriganaConfigUI = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';

	// 排障用的部分，只在开发模式下露出来（插件放在 plugins_dev 里，
	// 或者在控制台执行 localStorage['jp-furigana.dev'] = '1' 后重启）
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

	/**
	 * api 由 main.js 提供；会变的值（外部客户端、编辑器、缓存大小）都以函数形式传入。
	 * subscribe(fn) 登记刷新回调（词典加载完 / 音译取回来时调用），返回取消函数。
	 */
	function build(api) {
		const { LOG, REPO_URL, DEV, config, state } = api;
		const root = document.createElement('div');
		root.id = 'jp-furigana-config';
		root.innerHTML = `
			<style>
				#jp-furigana-config { font-size: 14px; line-height: 2; }
				#jp-furigana-config h3 { font-size: 16px; font-weight: bold; margin: 12px 0 4px; }
				#jp-furigana-config .fg-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
				#jp-furigana-config .fg-hint { opacity: .6; font-size: 12px; }
				#jp-furigana-config .fg-links { display: flex; gap: 16px; margin-bottom: 4px; }
				#jp-furigana-config .fg-links a { text-decoration: underline; cursor: pointer; opacity: .85; }
				#jp-furigana-config .fg-links a:hover { opacity: 1; }
				#jp-furigana-config input[type="text"] { width: 320px; }
				#jp-furigana-config .fg-external-settings[hidden], #jp-furigana-config .fg-consent-row[hidden] { display: none !important; }
				#jp-furigana-config .fg-external-error { color: #e67e73; font-size: 12px; }
				#jp-furigana-config .fg-edit-interrupt { color:#e45454;white-space:normal; }
				#jp-furigana-config .fg-preview {
					font-size: 26px; padding: 14px 16px; margin: 8px 0;
					border-radius: 10px; background: rgba(127,127,127,.12);
				}
				#jp-furigana-config .fg-status { white-space: pre-wrap; font-family: monospace; font-size: 12px; opacity: .8; }
			</style>
			<div class="fg-links">
				<a href="#" data-open="${REPO_URL}">源码仓库</a>
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
			<div class="fg-row fg-consent-row"><button data-a="revokeConsent">撤销外部网站同意</button><span class="fg-hint">撤销后切回网易云音译，下次开启外部网站时会重新提示</span></div>
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
				<div class="fg-hint">网站请求沿用浏览器当前网络环境；需要代理时可使用系统代理。本插件不修改网易云或系统网络配置。</div>
				<div class="fg-row"><label>歌词缓存目录</label><input type="text" data-k="externalCacheDir" placeholder="留空：BetterNCM 数据目录 / lyrics / jp-furigana" spellcheck="false"></div>
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
			<div class="fg-row">
				<label>注音字重</label>
				<select data-k="rtWeight">
					<option value="follow">跟随歌词</option>
					<option value="300">细</option>
					<option value="400">常规</option>
					<option value="500">中等</option>
					<option value="600">粗</option>
					<option value="700">特粗</option>
				</select>
			</div>

			<h3>兼容</h3>
			<div class="fg-row"><label><input type="checkbox" data-k="karaoke"> 逐字歌词模式（把注音分发到每个字/词，保留逐字高亮动画）</label></div>
			<div class="fg-row"><label><input type="checkbox" data-k="onlyFirstLine"> 只给原文注音，跳过翻译和罗马音</label></div>
			<div class="fg-row"><label><input type="checkbox" data-k="skipCredits"> 跳过「作词:／编曲:」等制作信息行</label></div>
			<div class="fg-row"><label><input type="checkbox" data-k="skipNoKanaLines"> 跳过没有假名的行（中文翻译、版权声明）</label></div>
			${DEV ? ADVANCED_UI : ''}
		`;

		const preview = root.querySelector('.fg-preview');
		const status = root.querySelector('.fg-status');
		const errorBox = root.querySelector('.fg-external-error');

		function refreshPreview() {
			preview.textContent = '';
			if (!state.tokenizer) {
				if (state.loadError) preview.textContent = '词典加载失败：' + state.loadError;
				else if (state.loading) preview.textContent = '词典加载中…';
				else if (!config.enabled) preview.textContent = '注音已关闭';
				else preview.textContent = '词典尚未加载';
				return;
			}
			preview.appendChild(api.renderPreview('夜空を駆ける一人の影'));
		}

		function refreshStatus() {
			const section = root.querySelector('.fg-external-settings');
			section.hidden = config.readingSource !== 'external';
			root.querySelector('.fg-consent-row').hidden = !config.externalConsent;
			const client = api.externalClient();
			const info = client && client.inspect();
			const trackId = api.getCurrentTrackId();
			const eligible = api.currentTrackLanguage().eligible;
			const externalStatus = root.querySelector('.fg-external-status'), text = api.externalStatusText();
			if (externalStatus.textContent !== text) externalStatus.textContent = text;
			const japanese = eligible === true;
			root.querySelector('[data-a="externalSource"]').disabled = !(japanese && info && info.url && info.songId === trackId);
			root.querySelector('[data-a="externalRetry"]').disabled = !config.enabled || !trackId || eligible === false;
			root.querySelector('[data-a="externalAssign"]').disabled = !config.enabled || !japanese || config.externalProvider === 'utanet';
			const editButton = root.querySelector('[data-a="editMode"]');
			const editState = api.editorButtonState();
			editButton.textContent = editState.text;
			editButton.classList.toggle('fg-edit-interrupt', editState.warning);
			const editor = api.editor();
			editButton.disabled = !(editor && editor.isEnabled()) && (!japanese || !state.tokenizer);
			if (!status) return; // 非开发模式没有这块
			status.textContent = [
				`词典：${state.tokenizer ? '已就绪' : state.loadError ? '失败 ' + state.loadError : '加载中'}`,
				`定位方式：${state.matchedBy || '未找到歌词元素'}`,
				`歌词行数：${state.lineCount}，已注音：${state.annotated}，上次耗时：${state.lastPassMs}ms`,
				`读音来源：外部网站 ${state.srcExternal} 行 / 官方音译 ${state.srcRomaji} 行 / 词典 ${state.srcDict} 行`,
				`官方音译数据：${state.apiStatus}（曲目 id ${state.apiTrackId || '未知'}，store ${state.store ? '已找到' : '未找到'}）`,
				`缓存条目：${api.cacheSize()}`,
			].join('\n');
		}

		// 滑块旁边那行数值怎么显示
		const sliderDrafts = new Map();
		const fmt = (key) => (sliderDrafts.has(key) ? sliderDrafts.get(key) : config[key]) + '%';

		root.querySelectorAll('[data-k]').forEach((el) => {
			const key = el.dataset.k;
			if (el.type === 'checkbox') el.checked = !!config[key];
			else el.value = config[key];

			const commit = () => {
				sliderDrafts.delete(key);
				errorBox.textContent = '';
				try { api.setConfigValue(key, el.type === 'checkbox' ? el.checked : el.value); }
				catch (e) { errorBox.textContent = e.message; return; }
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
					api.openUrl(url);
				} catch (err) {
					console.warn(LOG, '打开链接失败', url, err);
				}
			};
		});

		// 维护类按钮只在开发模式下存在
		const onClick = (action, handler) => {
			const el = root.querySelector(`[data-a="${action}"]`);
			if (el) el.onclick = handler;
		};
		const showError = (e) => { errorBox.textContent = e.message; };
		onClick('externalRetry', api.retryExternal);
		onClick('externalSource', api.openExternalSource);
		onClick('externalAssign', () => api.chooseExternalSource().catch(showError));
		onClick('editMode', () => api.toggleEditor().catch(showError));
		onClick('cacheManager', () => { const editor = api.editor(); if (editor) editor.openManager(); });
		onClick('revokeConsent', api.revokeExternalConsent);
		onClick('rescan', () => {
			api.rescan();
			setTimeout(refreshStatus, 500);
		});
		onClick('probe', () => {
			api.probe();
			refreshStatus();
		});
		onClick('clearCache', (e) => {
			api.clearCache();
			e.target.textContent = '已清除';
			setTimeout(() => (e.target.textContent = '清除注音缓存'), 2000);
			refreshStatus();
		});

		const refreshAll = () => {
			for (const el of root.querySelectorAll('[data-k]')) {
				// 只跳过正在输入的文本框和拖动中的滑块；下拉框要能被确认窗口的结果改回去
				if (document.activeElement === el && (el.type === 'text' || el.type === 'range')) continue;
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
		const unsubscribe = api.subscribe(refreshAll);

		// BetterNCM 会先调 onConfig 把面板建好、之后才插进 DOM，所以刚开始 root 是游离的。
		// 不能一看到没连上就清定时器，否则面板会永远停在「词典加载中」。
		let seenConnected = false;
		let ticks = 0;
		const iv = setInterval(() => {
			if (root.isConnected) seenConnected = true;
			else if (seenConnected || ++ticks > 120) {
				// 面板已关闭，或者建好之后一直没被用到（2 分钟）
				clearInterval(iv);
				unsubscribe();
				return;
			}
			refreshAll();
		}, 1000);

		return root;
	}

	return { build };
});
