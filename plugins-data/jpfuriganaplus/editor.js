/* Delegated editing layer: never insert inputs into RNP's moving React lyric tree. */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory();
	else root.FuriganaPlusEditor = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	'use strict';
	function install(api, doc = document) {
		const win = doc.defaultView;
		let enabled = false, popup = null, manager = null, hoverTimer = null;
		const style = doc.createElement('style');
		style.textContent = `
			.fg-rt .fg-edit-stack { display:inline-block; position:relative; vertical-align:bottom; opacity:1 !important; }
			.fg-rt .fg-reading { opacity:1 !important; }
			body.fg-edit-mode .fg-edit-stack { padding-top:1.1em; }
			.fg-edit-original { display:none; }
			body.fg-edit-mode .fg-rt .fg-edit-original { display:block; text-decoration:line-through; opacity:.6 !important; }
			body.fg-edit-mode .fg-rt .fg-edit-custom { position:absolute; top:0; left:50%; transform:translateX(-50%); }
			.fg-rt .fg-edit-custom { opacity:1 !important; }
			body.fg-edit-mode .fg-ruby[data-fg-editable] { cursor:text; }
			body.fg-edit-mode .fg-ruby[data-fg-editable]:hover { outline:1px dashed currentColor; border-radius:3px; }
			body.fg-edit-mode .fg-ruby[data-fg-editable] .fg-rt { pointer-events:auto; }
			body.fg-edit-mode .fg-ruby[data-fg-editable] .fg-reading:empty:after { content:'＋'; }
			.fg-edit-ui { color:var(--rnp-accent-color-shade-2,#eee); background:#242a2f; font:14px/1.5 sans-serif; box-sizing:border-box; border:1px solid #ffffff33; border-radius:10px; box-shadow:0 12px 36px #0005; }
			.fg-edit-ui * { box-sizing:border-box; }
			.fg-edit-ui button,.fg-edit-ui input,.fg-edit-ui select { color:inherit; background:#ffffff12; border:1px solid #ffffff2b; border-radius:6px; padding:7px 10px; font:inherit; }
			.fg-edit-ui button { cursor:pointer; } .fg-edit-ui button:disabled { opacity:.4; cursor:default; }
			.fg-edit-ui input:focus { outline:2px solid var(--rnp-accent-color,#8bd5ed); }
			.fg-edit-ui [role=alert] { color:#ffb4ab; white-space:pre-wrap; }
			.fg-edit-bar { position:fixed; z-index:2147483000; top:12px; left:50%; transform:translateX(-50%); padding:8px 12px; max-width:80vw; display:flex; gap:10px; align-items:center; }
			.fg-edit-bar[hidden] { display:none; }
			.fg-editor-pop { position:fixed; z-index:2147483100; padding:8px; width:280px; max-width:95vw; max-height:calc(100vh - 16px); overflow-y:auto; }
			.fg-editor-pop input { display:block; width:100%; margin:4px 0; user-select:text; }
			.fg-editor-pop [data-details] { display:none; } .fg-editor-pop.focused [data-details] { display:block; }
			.fg-editor-pop .fg-buttons { display:flex; gap:5px; flex-wrap:wrap; margin-top:8px; }
			.fg-edit-backdrop { position:fixed; z-index:2147483050; inset:0; background:#0008; display:flex; align-items:center; justify-content:center; }
			.fg-cache-manager { width:min(900px,92vw); height:min(700px,88vh); padding:20px; display:flex; flex-direction:column; gap:12px; }
			.fg-cache-manager header,.fg-cache-tools { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
			.fg-cache-manager h2 { font-size:20px; margin:0; flex:1; }
			.fg-cache-tools input { flex:1; min-width:150px; } .fg-cache-list { overflow:auto; flex:1; min-height:0; }
			.fg-cache-row { padding:12px 0; border-bottom:1px solid #ffffff22; display:flex; gap:12px; align-items:center; }
			.fg-cache-row .fg-cache-info { flex:1; min-width:0; overflow-wrap:anywhere; }
			.fg-cache-row small { display:block; opacity:.7; } .fg-cache-row button { flex-shrink:0; }
			.fg-cache-details { white-space:pre-wrap; overflow-wrap:anywhere; } .fg-cache-details p { margin:10px 0; }
		`;
		doc.head.append(style);
		const bar = doc.createElement('div'); bar.className = 'fg-edit-ui fg-edit-bar'; bar.hidden = true;
		bar.innerHTML = '<span data-message role="status">编辑模式：悬浮注音后点击输入，Enter 保存</span><button type="button">退出编辑</button>';
		doc.body.append(bar);
		const message = text => { bar.querySelector('[data-message]').textContent = text; };
		const dirty = () => popup && popup.input.value !== popup.initial;
		function closePopup(ask = true) {
			if (!popup) return true;
			if (popup.saving) { message('正在保存，请稍候'); return false; }
			if (ask && dirty() && !win.confirm('这处注音尚未保存，放弃输入吗？')) return false;
			popup.el.remove(); popup = null; return true;
		}
		function setEnabled(value) {
			if (!value && !closePopup()) return false;
			enabled = !!value; doc.body.classList.toggle('fg-edit-mode', enabled); bar.hidden = !enabled;
			if (enabled) message('编辑模式：悬浮注音后点击输入，Enter 保存；相同整句的重复演唱共用修改');
			api.changed(); return true;
		}
		bar.querySelector('button').onclick = () => setEnabled(false);
		function position() {
			if (!popup || !popup.holder.isConnected) return;
			const rect = (popup.holder.querySelector('.fg-rt') || popup.holder).getBoundingClientRect();
			const word = popup.holder.getBoundingClientRect(), gap = 12, margin = 8;
			// The popup's bottom, including expanded controls, stays above the reading.
			// Flip below the whole word when the viewport has too little room above.
			popup.el.style.maxHeight = '';
			let box = popup.el.getBoundingClientRect();
			const top = Math.min(rect.top, word.top), bottom = Math.max(rect.bottom, word.bottom);
			const above = Math.max(0, top - gap - margin), below = Math.max(0, win.innerHeight - bottom - gap - margin);
			const useAbove = box.height <= above || box.height > below && above >= below;
			const space = useAbove ? above : below;
			if (space > 0 && box.height > space) { popup.el.style.maxHeight = space + 'px'; box = popup.el.getBoundingClientRect(); }
			popup.el.style.left = Math.max(8, Math.min(win.innerWidth - box.width - 8, rect.left + rect.width / 2 - box.width / 2)) + 'px';
			popup.el.style.top = Math.max(margin, Math.min(win.innerHeight - box.height - margin, useAbove ? top - box.height - gap : bottom + gap)) + 'px';
		}
		async function apply(restore = false) {
			const p = popup; if (!p || p.saving) return;
			p.error.textContent = ''; p.saving = true;
			for (const b of p.el.querySelectorAll('button')) b.disabled = true;
			try {
				await api.save(p.anchor, restore ? null : p.input.value);
				p.saving = false; closePopup(false); message(restore ? '已恢复原始读音' : '已保存到本曲 JSON');
			} catch (e) { p.error.textContent = e.message; position(); message('保存失败，输入仍保留'); }
			finally { p.saving = false; for (const b of p.el.querySelectorAll('button')) b.disabled = false; }
		}
		function open(holder, focus) {
			const anchor = holder.__fgEdit;
			if (!enabled || !anchor || anchor.songId !== api.songId()) return;
			if (popup && popup.holder === holder) { if (focus) popup.input.focus(); return; }
			if (popup && (popup.saving || dirty() || popup.el.contains(doc.activeElement))) return;
			closePopup(false);
			const el = doc.createElement('div'); el.className = 'fg-edit-ui fg-editor-pop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '编辑注音');
			el.innerHTML = '<strong data-word></strong><input data-reading aria-label="修正注音" maxlength="1000" autocomplete="off" spellcheck="false"><div data-details><label>原始注音<input data-original aria-label="原始注音" readonly></label><div class="fg-buttons"><button data-apply>应用</button><button data-cancel>取消</button><button data-restore>恢复原注音</button></div><div role="alert"></div></div>';
			el.querySelector('[data-word]').textContent = anchor.text;
			const input = el.querySelector('[data-reading]'); input.value = anchor.reading;
			el.querySelector('[data-original]').value = anchor.original;
			popup = { el, holder, anchor: { ...anchor }, input, initial: input.value, error: el.querySelector('[role=alert]'), saving: false };
			doc.body.append(el); position();
			input.onfocus = () => { el.classList.add('focused'); position(); };
			input.oninput = () => message(dirty() ? '有未保存输入：Enter 保存，取消放弃' : '编辑模式');
			let composing = false;
			input.addEventListener('compositionstart', () => { composing = true; });
			input.addEventListener('compositionend', () => { composing = false; });
			el.addEventListener('keydown', e => {
				e.stopPropagation();
				if (e.isComposing || composing || e.keyCode === 229) return;
				if (e.key === 'Enter') { e.preventDefault(); apply(); }
				if (e.key === 'Escape') { e.preventDefault(); closePopup(); }
			});
			for (const type of ['keyup', 'keypress', 'click', 'mousedown', 'dblclick']) el.addEventListener(type, e => e.stopPropagation());
			el.querySelector('[data-apply]').onclick = () => apply();
			el.querySelector('[data-cancel]').onclick = () => closePopup();
			el.querySelector('[data-restore]').onclick = () => apply(true);
			el.onmouseenter = () => clearTimeout(hoverTimer);
			el.onmouseleave = () => leave();
			if (focus) { input.focus(); input.select(); }
		}
		function leave() {
			if (!popup) return;
			clearTimeout(hoverTimer);
			hoverTimer = setTimeout(() => { if (popup && !dirty() && !popup.saving && !popup.el.contains(doc.activeElement)) closePopup(false); }, 200);
		}
		function hover(e) {
			if (!enabled) return;
			const holder = e.target.closest && e.target.closest('.fg-ruby[data-fg-editable]');
			if (holder) { clearTimeout(hoverTimer); open(holder, false); }
		}
		function click(e) {
			if (!enabled) return;
			const holder = e.target.closest && e.target.closest('.fg-ruby[data-fg-editable]');
			if (enabled && holder) { e.preventDefault(); e.stopImmediatePropagation(); open(holder, true); }
		}
		function sync() {
			if (!popup) return;
			if (popup.anchor.songId !== api.songId()) {
				if (!dirty() && !popup.saving) closePopup(false);
				else { popup.error.textContent = '歌曲已切换，当前输入尚未保存；请复制或取消后继续。'; message('上一首有未保存输入'); }
			} else if (!popup.holder.isConnected && !dirty() && !popup.el.contains(doc.activeElement) && !popup.saving) closePopup(false);
		}
		const beforeUnload = e => { if (dirty() || popup && popup.saving) { e.preventDefault(); e.returnValue = ''; } };
		doc.addEventListener('mouseover', hover); doc.addEventListener('mouseout', leave);
		doc.addEventListener('click', click, true);
		win.addEventListener('beforeunload', beforeUnload); win.addEventListener('resize', position);
		// Only reposition an idle hover box on scrolling; a focused editor stays stable.
		const scroll = () => { if (popup && !popup.el.contains(doc.activeElement)) position(); };
		doc.addEventListener('scroll', scroll, true);
		const bytes = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';
		function openManager() {
			if (manager) return;
			if (!closePopup()) return;
			const backdrop = doc.createElement('div'); backdrop.className = 'fg-edit-backdrop';
			backdrop.innerHTML = '<section class="fg-edit-ui fg-cache-manager" role="dialog" aria-modal="true" aria-label="本地歌词管理"><header><h2>本地歌词管理</h2><button data-refresh>刷新</button><button data-close>关闭</button></header><div class="fg-cache-tools"><input data-search aria-label="搜索缓存歌词" placeholder="歌名、歌手或歌曲 ID"><label><input data-modified type="checkbox"> 仅已修改</label></div><div data-summary role="status"></div><div role="alert"></div><div class="fg-cache-list"></div></section>';
			doc.body.append(backdrop); manager = backdrop;
			const box = backdrop.firstElementChild, list = box.querySelector('.fg-cache-list'), search = box.querySelector('[data-search]'), error = box.querySelector('[role=alert]'), summary = box.querySelector('[data-summary]');
			let rows = [], limit = 50, revision = 0, dir = '';
			const previousFocus = doc.activeElement;
			const close = () => { revision++; backdrop.remove(); manager = null; if (previousFocus && previousFocus.isConnected) previousFocus.focus(); };
			box.querySelector('[data-close]').onclick = close;
			function button(label, run) {
				const b = doc.createElement('button'); b.textContent = label;
				b.onclick = async () => { b.disabled = true; error.textContent = ''; try { await run(); } catch (e) { error.textContent = e.message; } finally { b.disabled = false; } }; return b;
			}
			function render() {
				list.replaceChildren();
				const query = search.value.trim().toLowerCase();
				const shown = rows.filter(r => (!box.querySelector('[data-modified]').checked || r.edits) && [r.title, ...r.artists, r.songId].join(' ').toLowerCase().includes(query));
				summary.textContent = rows.length + ' 首 · ' + bytes(rows.reduce((n, r) => n + r.bytes, 0)) + (rows.some(r => r.invalid) ? '（不含无法读取的文件）' : '') + ' · 已修改 ' + rows.filter(r => r.edits).length + ' 首 · 显示 ' + shown.length + ' 首\n' + dir;
				for (const row of shown.slice(0, limit)) {
					const el = doc.createElement('div'); el.className = 'fg-cache-row';
					const info = doc.createElement('div'); info.className = 'fg-cache-info'; info.textContent = row.title;
					const meta = doc.createElement('small'); meta.textContent = row.artists.join(' / ') + ' · ' + row.songId + ' · ' + (row.invalid ? '缓存损坏（请在目录内检查）' : bytes(row.bytes) + ' · 修改 ' + row.edits + ' 处'); info.append(meta); el.append(info);
					if (!row.invalid) {
						el.append(button('查看', async () => {
							const record = await api.manage(row, 'read'); list.replaceChildren();
							list.append(button('返回列表', render));
							const details = doc.createElement('div'); details.className = 'fg-cache-details';
							const title = doc.createElement('h3'); title.textContent = record.title; details.append(title);
							for (const edit of (Array.isArray(record.userEdits) ? record.userEdits : [])) {
								if (!edit || typeof edit.line !== 'string') continue;
								const p = doc.createElement('p'); p.textContent = edit.line + '\n第 ' + (edit.start + 1) + ' 字起 · ' + edit.text + '：' + edit.original + ' → ' + edit.reading; details.append(p);
							}
							if (row.edits) {
								const note = doc.createElement('p'); note.textContent = '原文、分词或来源变化后，不再匹配的修改仍保留在本文件中，但不会套用到其他位置。'; details.append(note);
								details.append(button('恢复本曲全部原始读音', async () => { if (win.confirm('清除本曲全部人工修改，恢复原始读音？')) { await api.manage(row, 'restore'); await refresh(); } }));
							}
							const lyrics = doc.createElement('p'); lyrics.textContent = '网站原文（保留不变）\n' + record.lines.map(l => l.text).join('\n'); details.append(lyrics); list.append(details);
						}));
						el.append(button('播放并编辑', async () => { await api.play(row); close(); }));
						el.append(button('删除', async () => { if (win.confirm('删除「' + row.title + '」的本地歌词及 ' + row.edits + ' 处人工修改？此操作不可恢复。')) { await api.manage(row, 'delete'); await refresh(); } }));
					}
					list.append(el);
				}
				if (shown.length > limit) list.append(button('显示更多', () => { limit += 50; render(); }));
				if (!shown.length) { const p = doc.createElement('p'); p.textContent = '没有符合条件的缓存歌词'; list.append(p); }
			}
			async function refresh() {
				const token = ++revision; summary.textContent = '读取本地缓存…'; error.textContent = '';
				try { const result = await api.list(); if (manager !== backdrop || token !== revision) return; rows = result.rows; dir = result.dir; limit = 50; render(); }
				catch (e) { if (manager === backdrop) { summary.textContent = ''; error.textContent = e.message; } }
			}
			box.querySelector('[data-refresh]').onclick = refresh;
			search.oninput = () => { limit = 50; render(); }; box.querySelector('[data-modified]').onchange = render;
			backdrop.addEventListener('keydown', e => {
				e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); close(); }
				if (e.key === 'Tab') { const nodes = [...box.querySelectorAll('button,input')].filter(n => !n.disabled); const a = nodes[0], b = nodes[nodes.length - 1]; if (e.shiftKey && doc.activeElement === a) { e.preventDefault(); b.focus(); } else if (!e.shiftKey && doc.activeElement === b) { e.preventDefault(); a.focus(); } }
			});
			for (const event of ['click', 'mousedown', 'keyup', 'keypress']) backdrop.addEventListener(event, e => e.stopPropagation());
			refresh(); search.focus();
		}
		return { setEnabled, isEnabled: () => enabled, sync, openManager, prepareNavigation: closePopup,
			destroy: () => { closePopup(false); if (manager) manager.remove(); bar.remove(); style.remove(); clearTimeout(hoverTimer); doc.body.classList.remove('fg-edit-mode'); doc.removeEventListener('mouseover', hover); doc.removeEventListener('mouseout', leave); doc.removeEventListener('click', click, true); doc.removeEventListener('scroll', scroll, true); win.removeEventListener('beforeunload', beforeUnload); win.removeEventListener('resize', position); } };
	}
	return { install };
});
