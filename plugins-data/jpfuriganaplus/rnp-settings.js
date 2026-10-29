/* Optional DOM adapter for RefinedNowPlayingNext 3.0.2. No RNP files or internals are patched. */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.FuriganaPlusRnpSettings = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';
	const TAB = 'jp-furigana-plus';
	function install(api, doc = document) {
		const win = doc.defaultView, bindings = new Map();
		let nextId = 0, stopped = false;
		const style = doc.createElement('style');
		style.textContent = `
			.rnp-group[data-tab="jp-furigana-plus"] .fg-rnp-note { padding:0; white-space:pre-wrap; overflow-wrap:anywhere; font-size:13px; line-height:1.5; opacity:.65; margin:0 0 20px; }
			.rnp-group[data-tab="jp-furigana-plus"] .rnp-select-group-btn { white-space:normal; }
			.rnp-group[data-tab="jp-furigana-plus"] .fg-rnp-actions { display:flex; gap:8px; margin:0 0 20px; }
			.rnp-group[data-tab="jp-furigana-plus"] .fg-rnp-actions button { border-radius:6px; padding:6px; }
			.rnp-group[data-tab="jp-furigana-plus"] button:disabled { opacity:.35; cursor:default; }
			.rnp-group[data-tab="jp-furigana-plus"] [hidden] { display:none !important; }
			.rnp-group[data-tab="jp-furigana-plus"] .fg-rnp-subtitle { font-size:18px; opacity:.6; margin:20px 0; }
			.rnp-group[data-tab="jp-furigana-plus"] [data-error] { color:#ffb4ab; }
		`;
		doc.head.append(style);
		function mount(menu) {
			if (bindings.has(menu)) return;
			const tabs = menu.querySelector('.rnp-settings-menu-tabs'), inner = menu.querySelector('.rnp-settings-menu-inner');
			const lyricTab = tabs && tabs.querySelector('[data-tab="lyric"]'), lyricGroup = inner && inner.querySelector('.rnp-group[data-tab="lyric"]');
			// If a future RNP changes its layout, leave the normal BetterNCM settings available.
			if (!lyricTab || !lyricGroup || menu.querySelector('[data-tab="' + TAB + '"]')) return;
			const prefix = 'fg-rnp-' + (++nextId) + '-', tab = doc.createElement('div'), group = doc.createElement('div');
			tab.className = 'rnp-settings-menu-tab'; tab.dataset.tab = TAB; tab.textContent = '注音';
			tab.tabIndex = 0; tab.setAttribute('role', 'button'); tab.setAttribute('aria-controls', prefix + 'group');
			group.className = 'rnp-group'; group.dataset.tab = TAB; group.id = prefix + 'group';
			const checkbox = (key, label) => `<div class="rnp-checkbox-wrapper"><input id="${prefix + key}" type="checkbox" class="rnp-checkbox" data-key="${key}"><label for="${prefix + key}" class="rnp-checkbox-label">${label}</label></div>`;
			const select = (key, label, choices) => `<div class="rnp-select-group-wrapper"><div class="rnp-select-group-label">${label}</div><div class="rnp-select-group" role="group" aria-label="${label}" data-choice="${key}">${choices.map(([value, title]) => `<button type="button" class="rnp-select-group-btn" data-value="${value}" aria-pressed="false">${title}</button>`).join('')}</div></div>`;
			const slider = (key, label, initial) => `<div class="rnp-slider-wrapper"><label for="${prefix + key}" class="rnp-slider-label">${label} <span data-value-for="${key}"></span><button type="button" class="rnp-slider-reset" data-reset="${key}" title="恢复默认值" aria-label="重置${label}"></button></label><input id="${prefix + key}" class="rnp-slider" type="range" min="20" max="100" step="1" default="${initial}" data-key="${key}"></div>`;
			group.innerHTML = '<div class="rnp-group-title">注音</div>' + checkbox('enabled', '振假名注音') +
				select('readingSource', '读音来源', [['romaji', '网易云'], ['dict', '词典'], ['external', '外部网站']]) +
				'<div data-external>' + select('externalProvider', '外部网站范围', [['auto', '自动'], ['utaten', 'UtaTen'], ['utanet', 'Uta-Net']]) +
				select('externalAutoRetry', '自动重新获取', [['off', '关闭'], ['failed', '失败后重试']]) +
				'<div class="fg-rnp-actions"><button type="button" class="rnp-select-group-btn" data-action="retry">重新获取当前歌曲</button><button type="button" class="rnp-select-group-btn" data-action="source">查看来源网页</button></div>' +
				'<p class="fg-rnp-note" role="status" data-status></p></div>' +
				'<div class="fg-rnp-actions"><button type="button" class="rnp-select-group-btn" data-action="edit">进入编辑模式</button><button type="button" class="rnp-select-group-btn" data-action="manage">本地歌词管理</button></div>' + slider('rtSize', '注音大小', 60) + slider('rtOpacity', '注音不透明度', 80) +
				'<div class="fg-rnp-subtitle">兼容</div>' + checkbox('karaoke', '逐字歌词模式') + checkbox('onlyFirstLine', '只给原文注音') +
				checkbox('skipCredits', '跳过制作信息行') + checkbox('skipNoKanaLines', '跳过没有假名的行') + '<p class="fg-rnp-note" role="alert" data-error></p>';
			lyricTab.after(tab); lyricGroup.after(group);
			function refresh() {
				const config = api.config(), info = api.status();
				for (const el of group.querySelectorAll('[data-key]')) {
					const value = config[el.dataset.key];
					if (el.type === 'checkbox') el.checked = !!value;
					else {
						el.value = value;
						const out = group.querySelector('[data-value-for="' + el.dataset.key + '"]');
						if (out.textContent !== value + '%') out.textContent = value + '%';
						el.parentElement.classList.toggle('changed', String(value) !== el.getAttribute('default'));
						const percent = (value - 20) / 80 * 100;
						el.style.background = `linear-gradient(90deg, var(--rnp-accent-color) ${percent}%, #dfe1e422 ${percent}%)`;
					}
				}
				for (const choices of group.querySelectorAll('[data-choice]')) for (const button of choices.children) {
					const selected = button.dataset.value === config[choices.dataset.choice];
					button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
				}
				group.querySelector('[data-external]').hidden = config.readingSource !== 'external';
				const status = group.querySelector('[data-status]');
				if (status.textContent !== info.text) status.textContent = info.text;
				group.querySelector('[data-action="retry"]').disabled = !info.canRetry;
				group.querySelector('[data-action="source"]').disabled = !info.canOpen;
				group.querySelector('[data-action="edit"]').disabled = !info.editing && !info.canEdit;
				group.querySelector('[data-action="edit"]').textContent = info.editing ? '退出编辑模式' : '进入编辑模式';
			}
			function commit(key, value) {
				const error = group.querySelector('[data-error]');
				try { api.set(key, value); error.textContent = ''; } catch (e) { error.textContent = e.message; }
				refresh();
			}
			for (const input of group.querySelectorAll('[data-key]')) {
				input.addEventListener(input.type === 'range' ? 'input' : 'change', () => commit(input.dataset.key, input.type === 'checkbox' ? input.checked : Number(input.value)));
			}
			group.addEventListener('click', event => {
				const button = event.target.closest('button'); if (!button || button.disabled) return;
				if (button.parentElement.dataset.choice) commit(button.parentElement.dataset.choice, button.dataset.value);
				if (button.dataset.reset) commit(button.dataset.reset, Number(group.querySelector('[data-key="' + button.dataset.reset + '"]').getAttribute('default')));
				if (button.dataset.action === 'retry') api.retry();
				if (button.dataset.action === 'source') api.openSource();
				if (button.dataset.action === 'edit') Promise.resolve(api.toggleEditor()).catch(e => { group.querySelector('[data-error]').textContent = e.message; });
				if (button.dataset.action === 'manage') api.openManager();
			});
			// RNP's scroll handler captures a static NodeList before our tab exists.
			// Update the highlight after its handler, without replacing its navigation.
			let frame = null;
			function highlight() {
				frame = null;
				if (!group.isConnected) return;
				const groups = [...inner.children].filter(n => n.classList.contains('rnp-group'));
				let active = groups[0];
				// RNP sections have 30px top padding; tolerate small font/layout shifts
				// during smooth scrolling so the visible heading owns the highlight.
				for (const item of groups) if (item.offsetTop <= inner.scrollTop + 32) active = item;
				if (inner.scrollHeight > inner.clientHeight && inner.scrollTop + inner.clientHeight >= inner.scrollHeight - 1) active = groups[groups.length - 1];
				if (active) for (const item of tabs.children) if (item.classList.contains('rnp-settings-menu-tab')) item.classList.toggle('active', item.dataset.tab === active.dataset.tab);
			}
			function scheduleHighlight() { if (frame === null) frame = win.requestAnimationFrame(highlight); }
			function navigate() { inner.scrollTo({ top: group.offsetTop + 5, behavior: 'smooth' }); scheduleHighlight(); }
			tab.addEventListener('click', navigate);
			tab.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(); } });
			inner.addEventListener('scroll', scheduleHighlight);
			const resize = win.ResizeObserver && new win.ResizeObserver(scheduleHighlight);
			if (resize) { resize.observe(inner); resize.observe(group); }
			const unsubscribe = api.subscribe(refresh);
			bindings.set(menu, { group, tab, dispose: () => { unsubscribe(); if (resize) resize.disconnect(); inner.removeEventListener('scroll', scheduleHighlight); if (frame !== null) win.cancelAnimationFrame(frame); group.remove(); tab.remove(); } });
			refresh(); scheduleHighlight();
		}
		function scan() {
			if (stopped) return;
			for (const [menu, entry] of bindings) if (!menu.isConnected || !entry.group.isConnected || !entry.tab.isConnected) { entry.dispose(); bindings.delete(menu); }
			for (const menu of doc.querySelectorAll('.rnp-settings-menu')) mount(menu);
		}
		const observer = new win.MutationObserver(records => {
			// No timer or per-lyric full-document scan: only menu additions/removals matter.
			const selector = '.rnp-settings-menu,.rnp-settings-menu-tabs,.rnp-settings-menu-inner';
			if (records.some(r => [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches(selector) || n.querySelector(selector)))) ||
				[...bindings.values()].some(entry => !entry.group.isConnected || !entry.tab.isConnected)) scan();
		});
		observer.observe(doc.body, { childList: true, subtree: true }); scan();
		return { scan, destroy: () => { stopped = true; observer.disconnect(); for (const entry of bindings.values()) entry.dispose(); bindings.clear(); style.remove(); } };
	}
	return { install };
});
