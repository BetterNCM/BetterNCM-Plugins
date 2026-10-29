/* Optional Yomitan companion bridge; disabled by default, no idle polling. MIT. */
(function(root,factory) {
	if(typeof module==='object' && module.exports) module.exports=factory(require('./selection.js'));
	else root.NcmYotimanDictionary=factory(root.NcmYotimanSelection);
})(typeof globalThis!=='undefined'?globalThis:this,function(capture) {
	'use strict';
	const TAB='ncm-yotiman';
	const LINES=capture.LINES;
	const INPUT_MODES=[['hover','Shift 划选'],['drag','Shift＋左键拖选'],['both','两种均可']];
	function quotePath(value) {
		if(!value || /["\r\n\x00]/.test(value)) throw new Error('词典组件路径无效');
		return '"'+value+'"';
	}
	function transport(bn,plugin) {
		let rootPromise,prepared;
		const root=()=>rootPromise || (rootPromise=bn.app.getDataPath().then(p=>p.replace(/\\/g,'/')+'/ncm-yotiman'));
		async function send(action,context={}) {
			if(!prepared)prepared=(async()=>{const base=await root(),dir=base+'/requests',exe=plugin.pluginPath+'/yomitan-host/CloudmusicYomitan.exe';if(!await bn.fs.exists(exe))throw new Error('尚未安装 Yomitan 组件');if(!await bn.fs.mkdir(dir))throw new Error('无法创建词典数据目录');return {base,dir,exe};})().catch(e=>{prepared=null;throw e;});
			let paths;try{paths=await prepared;}catch(e){if(action==='shutdown')return;throw e;}
			const {base,dir,exe}=paths;
			const id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),path=dir+'/'+id+'.json';
			// A separate marker is created only after writeFile has finished.
			const text=JSON.stringify({...context,action,created:Date.now()});
			if(!await bn.fs.writeFile(path,new Blob([text],{type:'application/json'}))) throw new Error('无法写入查词请求');
			if(!await bn.fs.writeFile(path+'.ready',new Blob(['1']))) throw new Error('无法提交查词请求');
			let launched=false;const launch=async()=>{launched=true;if(!await bn.app.exec(quotePath(exe)+' --data '+quotePath(base),false,false))throw new Error('无法启动词典窗口');};
			if(!await bn.fs.exists(base+'/host.ready'))await launch();
			const started=Date.now();
			for(let i=0;i<400&&Date.now()-started<30000;i++) {
				if(await bn.fs.exists(path+'.reply')) {
					const reply=JSON.parse(await bn.fs.readFileText(path+'.reply'));
					try { await bn.fs.remove(path+'.reply'); } catch(_) { /* opened window remains usable */ }
					if(!reply.ok) throw new Error(reply.error || 'Yomitan 打开失败');
					return reply;
				}
				if(!launched&&Date.now()-started>300)await launch();
				await new Promise(resolve=>setTimeout(resolve,i<20?25:100));
			}
			throw new Error('Yomitan 启动超时，请检查独立窗口或 WebView2 运行时');
		}
		return {send};
	}
	function install(api,doc=document) {
		const win=doc.defaultView,menus=new Map(); let enabled=false,armed=false,anchor=null,shiftHeld=false,source='',swallowClick=false,inflight=false,error='',disposed=false,notice=null,noticeTimer;
		let pointer=null,spanAnchor=null,spanBlocked=false,previewFrame=null,highlight=null,warmupTimer=null,queuedLookup=null;
		let inputMode=api.config().dictionaryInputMode||'hover';
		const diagnostics={down:0,hover:0,selected:0,sent:0,warmed:false,lastLookupMs:null,input:{pointerdown:0,mousedown:0,shiftDown:0},lastInput:null,last:'尚未查词'};
		const bridge=api.transport || transport(api.betterncm,api.plugin);
		const style=doc.createElement('style');
		style.textContent=`${LINES.split(',').map(s=>'body.fg-dictionary-select '+s+',body.fg-dictionary-select '+s+' *').join(',')} {user-select:text!important;-webkit-user-select:text!important;cursor:text!important}
		${LINES.split(',').map(s=>'body.ncm-yotiman-enabled '+s+',body.ncm-yotiman-enabled '+s+' *').join(',')},body.ncm-yotiman-enabled .rnp-lyrics,body.ncm-yotiman-enabled .rnp-lyrics-line { -webkit-app-region:no-drag!important; }
		body.fg-dictionary-select .fg-rt,body.fg-dictionary-select rt,body.fg-dictionary-select .rnp-karaoke-word-filler {user-select:none!important;-webkit-user-select:none!important;pointer-events:none!important}
		[data-ncm-yotiman-highlight],[data-ncm-yotiman-highlight] *{user-select:text!important;-webkit-user-select:text!important}
		[data-ncm-yotiman-highlight] .fg-rt,[data-ncm-yotiman-highlight] rt{user-select:none!important;-webkit-user-select:none!important}
		[data-ncm-yotiman-highlight] ::selection,[data-ncm-yotiman-highlight]::selection{background:#67d8ff66;color:inherit}
		[data-tab="${TAB}"] .fg-dictionary-hint {opacity:.65;font-size:13px;line-height:1.6;margin:12px 0;white-space:pre-wrap}
		[data-tab="${TAB}"] button {border-radius:6px;padding:6px} [data-tab="${TAB}"] [role="alert"] {color:#ffb4ab} [data-tab="${TAB}"] [hidden] {display:none!important}`;
		style.textContent+=`[data-tab="${TAB}"] .rnp-select-group{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;width:100%;min-width:0;max-width:100%;box-sizing:border-box}
		[data-tab="${TAB}"] .rnp-select-group-btn[data-input-mode]{width:100%;min-width:0;max-width:100%;height:auto;min-height:32px;box-sizing:border-box;white-space:normal;overflow-wrap:anywhere;line-height:1.45;padding:6px 8px;border-radius:6px}`;
		doc.head.append(style);
		function refresh() {
			for(const {group} of menus.values()) {
				group.querySelector('input').checked=!!api.config().dictionaryEnabled;
				for(const button of group.querySelectorAll('[data-input-mode]')){const selected=button.dataset.inputMode===inputMode;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));}
				const status=group.querySelector('[role="status"]');status.textContent=enabled&&diagnostics.last!=='尚未查词'?diagnostics.last:'';status.hidden=!status.textContent;
				const alert=group.querySelector('[role="alert"]');alert.textContent=error;alert.hidden=!error;
			}
		}
		async function send(action,context) {
			try { error=''; refresh(); return await bridge.send(action,context); }
			catch(e) {
				if(action==='shutdown' || disposed) return;
				error=e.message; refresh(); api.error && api.error(error);
				if(!notice) { notice=doc.createElement('div');notice.setAttribute('role','alert');notice.style.cssText='position:fixed;bottom:32px;left:50%;transform:translateX(-50%);z-index:2147483000;padding:12px 18px;border-radius:8px;background:#292929;color:#fff;max-width:80vw;white-space:pre-wrap;line-height:1.5';doc.body.append(notice); }
				notice.textContent='Yomitan：'+error;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{notice.remove();notice=null;},10000);
				throw e;
			}
		}
		function openSettings() { return send('settings'); }
		function warmup(){clearTimeout(warmupTimer);if(enabled&&!api.transport)warmupTimer=setTimeout(()=>{bridge.send('warmup',{theme:api.theme?api.theme():'dark'}).then(()=>{diagnostics.warmed=true;}).catch(()=>{});},400);}
		function clearHighlight(){if(highlight){highlight.line.removeAttribute('data-ncm-yotiman-highlight');const selection=win.getSelection();if(selection.rangeCount&&highlight.range&&selection.getRangeAt(0).startContainer===highlight.range.startContainer)selection.removeAllRanges();highlight=null;}}
		function showHighlight(context){if(!context.range)return;clearHighlight();highlight=context;context.line.setAttribute('data-ncm-yotiman-highlight','');const selection=win.getSelection();selection.removeAllRanges();selection.addRange(context.range.cloneRange());}
		function cancelSpan(){if(previewFrame!==null)win.cancelAnimationFrame(previewFrame);previewFrame=null;spanAnchor=null;}
		function reset() { cancelSpan();queuedLookup=null;spanBlocked=false;pointer=null;armed=false;anchor=null;shiftHeld=false;source='';swallowClick=false;doc.body.classList.remove('fg-dictionary-select'); }
		async function lookup(selected,trackPromise){
			if(!selected)return;trackPromise=trackPromise||Promise.resolve(api.track());if(inflight){queuedLookup={selected,trackPromise};return;}
			diagnostics.selected++;inflight=true;
			try {
				const track=await trackPromise;if(!enabled)return;
				if(!track||!track.id)throw new Error('未取得歌曲 ID，请打开歌曲播放页后重试');
				diagnostics.sent++;diagnostics.last='正在查词…';refresh();
				const started=Date.now();const reply=await send('lookup',{...selected,matchMode:'longest-in-range',theme:api.theme?api.theme():'dark',title:track.title||'',songTitle:track.songTitle||'',songArtist:track.songArtist||'',url:'https://music.163.com/song?id='+encodeURIComponent(track.id)});diagnostics.lastLookupMs=Date.now()-started;
				const match=reply&&reply.match;
				if(highlight===selected&&selected.line.isConnected&&capture.snapshot(selected.line).sentence===selected.sentence&&match&&Number.isInteger(match.offset)&&Number.isInteger(match.length)&&match.length>0&&match.offset>=selected.offset&&match.offset+match.length<=selected.offset+selected.term.length){const actual=capture.fromOffsets(doc,selected.line,match.offset,match.offset+match.length);if(actual&&actual.term===match.text)showHighlight(actual);}
				diagnostics.last='查词窗口已打开';refresh();
			}catch(e){error=e.message;diagnostics.last='查词失败：'+e.message;refresh();}finally{inflight=false;const next=queuedLookup;queuedLookup=null;if(next&&enabled&&next.selected.line.isConnected&&capture.snapshot(next.selected.line).sentence===next.selected.sentence)lookup(next.selected,next.trackPromise);}
		}
		function updateSpan(){
			if(!pointer||!enabled||armed||spanBlocked||inputMode==='drag')return;
			const target=typeof doc.elementFromPoint==='function'?doc.elementFromPoint(pointer.clientX,pointer.clientY):pointer.target;
			if(!target||!target.isConnected)return;
			const current=capture.fromPoint(doc,{...pointer,target},spanAnchor&&spanAnchor.line);if(!current)return;
			if(!spanAnchor){spanAnchor=current;clearHighlight();}
			if(current.sentence!==spanAnchor.sentence){cancelSpan();return;}
			const selected=capture.fromOffsets(doc,spanAnchor.line,Math.min(spanAnchor.offset,current.offset),Math.max(spanAnchor.offset+spanAnchor.term.length,current.offset+current.term.length));
			if(selected)showHighlight(selected);else{clearHighlight();win.getSelection().removeAllRanges();}
		}
		function shift(e) {
			if(!enabled)return;
			if(e.key==='Shift'||e.keyCode===16){
				if(e.type==='keydown'&&e.target.closest&&e.target.closest('input,textarea,[contenteditable="true"]'))return;
				const held=e.type==='keydown';if(held&&shiftHeld)return;
				shiftHeld=held;
				if(held){
					cancelSpan();clearHighlight();win.getSelection().removeAllRanges();
					spanBlocked=false;diagnostics.input.shiftDown++;capture.lines(doc);doc.body.classList.add('fg-dictionary-select');updateSpan();
				}
				else{
					if(previewFrame!==null)win.cancelAnimationFrame(previewFrame);previewFrame=null;
					if(spanAnchor&&!armed){updateSpan();const selected=capture.fromSelection(win.getSelection(),doc);cancelSpan();if(selected){showHighlight(selected);diagnostics.hover++;lookup(selected);}}
					doc.body.classList.remove('fg-dictionary-select');
				}
			}
		}
		function down(e) {
			if(!enabled)return;
			cancelSpan();
			spanBlocked=true;
			diagnostics.input[e.type]=(diagnostics.input[e.type]||0)+1;
			if(armed)return; // A pointer gesture may also emit compatibility mouse events.
			swallowClick=false;
			const line=capture.lineForTarget(e.target),shifted=!!(e.shiftKey||shiftHeld);
			if(line||shifted){const target=e.target.nodeType===1?e.target:e.target.parentElement;diagnostics.lastInput={type:e.type,shift:!!e.shiftKey,shiftHeld,button:e.button,matched:!!line,target:target?(target.tagName+'.'+[...target.classList].slice(0,4).join('.')).slice(0,200):'unknown'};}
			if(inputMode==='hover'||!shifted||e.button!==0||!line)return;
			clearHighlight();
			win.getSelection().removeAllRanges(); // Shift must not extend a previous lookup's selection.
			diagnostics.down++;doc.body.classList.add('fg-dictionary-select');capture.mark(line);anchor=capture.begin(doc,e,line);
			armed=true;source=e.type;e.stopImmediatePropagation();
			if(anchor)e.preventDefault(); // Own the range when the client suppresses native text selection.
		}
		function move(e){
			pointer={target:e.target,clientX:e.clientX,clientY:e.clientY};
			// Shift may have been pressed in the dictionary before focus returned.
			// The first lyric move carries its real modifier state, even without keydown.
			if(enabled&&e.shiftKey&&!shiftHeld&&!e.buttons&&inputMode!=='drag')shift({type:'keydown',key:'Shift',target:e.target});
			if(armed&&anchor){if(e.type==='mousemove'&&source==='pointerdown')return;e.preventDefault();e.stopImmediatePropagation();capture.extend(doc,anchor,e);return;}
			if(shiftHeld&&!e.buttons&&inputMode!=='drag'){if(!spanAnchor)updateSpan();else if(previewFrame===null)previewFrame=win.requestAnimationFrame(()=>{previewFrame=null;updateSpan();});}
		}
		async function up(e) {
			if(!armed) return; armed=false;swallowClick=true;e.stopImmediatePropagation();
			if(anchor)capture.extend(doc,anchor,e);anchor=null;
			const selected=capture.fromSelection(win.getSelection(),doc);
			if(!selected){diagnostics.last='未选中有效的同一行原文，请从字面拖选；也可查看本插件的运行状态。';refresh();return;}
			showHighlight(selected);
			await lookup(selected);
		}
		function click(e) { if(enabled && (swallowClick || inputMode!=='hover'&&(e.shiftKey || shiftHeld)) && capture.lineForTarget(e.target)) {swallowClick=false;e.preventDefault();e.stopImmediatePropagation();} }
		function setEnabled(value) {
			const next=!!value; if(next===enabled) {refresh();return;}
			enabled=next; reset();
			doc.body.classList.toggle('ncm-yotiman-enabled',enabled);if(enabled)capture.lines(doc);
			for(const [type,fn] of [['keydown',shift],['keyup',shift]]) win[enabled?'addEventListener':'removeEventListener'](type,fn,true);
			// Window capture precedes RNP's document/React click-to-seek handlers.
			// Some CEF hosts expose PointerEvent but deliver mouse events only. Listen
			// to both streams and deduplicate a gesture instead of probing constructors.
			for(const [type,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['mousedown',down],['mousemove',move],['mouseup',up],['click',click]]) win[enabled?'addEventListener':'removeEventListener'](type,fn,true);
			win[enabled?'addEventListener':'removeEventListener']('blur',reset);
			clearTimeout(warmupTimer);if(enabled)warmup();else{clearHighlight();send('shutdown').catch(()=>{});}
			refresh();
		}
		function scan() {
			if(disposed) return;
			for(const [menu,binding] of menus) if(!menu.isConnected || !binding.tab.isConnected || !binding.group.isConnected) {binding.dispose();menus.delete(menu);}
			for(const menu of doc.querySelectorAll('.rnp-settings-menu')) {
				if(menus.has(menu)) continue;
				const anchor=menu.querySelector('.rnp-settings-menu-tabs [data-tab="jp-furigana-plus"]')||menu.querySelector('.rnp-settings-menu-tabs [data-tab="lyric"]');
				const section=menu.querySelector('.rnp-settings-menu-inner .rnp-group[data-tab="jp-furigana-plus"]')||menu.querySelector('.rnp-settings-menu-inner .rnp-group[data-tab="lyric"]');
				if(!anchor || !section) continue;
				const tab=doc.createElement('div'),group=doc.createElement('div');
				tab.className='rnp-settings-menu-tab';tab.dataset.tab=TAB;tab.textContent='词典';tab.tabIndex=0;tab.setAttribute('role','button');
				group.className='rnp-group';group.dataset.tab=TAB;
				const id='fg-dictionary-'+Math.random().toString(36).slice(2);
				group.innerHTML='<div class="rnp-group-title">词典</div><div class="rnp-checkbox-wrapper"><input type="checkbox" class="rnp-checkbox" id="'+id+'"><label class="rnp-checkbox-label" for="'+id+'">启用词典</label></div><div class="rnp-select-group-wrapper"><div class="rnp-select-group-label">查词方式</div><div class="rnp-select-group" role="group" aria-label="查词方式">'+INPUT_MODES.map(([value,title])=>'<button type="button" class="rnp-select-group-btn" data-input-mode="'+value+'" aria-pressed="false">'+title+'</button>').join('')+'</div></div><button type="button" class="rnp-select-group-btn" data-settings>Yomitan 设置</button><p class="fg-dictionary-hint" role="status" hidden></p><p class="fg-dictionary-hint" role="alert" hidden></p>';
				anchor.after(tab);section.after(group);
				const inner=section.parentElement,tabs=tab.parentElement;let frame=null;
				function highlight(){frame=null;const groups=[...inner.children].filter(n=>n.classList.contains('rnp-group'));let active=groups[0];for(const item of groups)if(item.offsetTop<=inner.scrollTop+32)active=item;if(inner.scrollHeight>inner.clientHeight&&inner.scrollTop+inner.clientHeight>=inner.scrollHeight-1)active=groups[groups.length-1];if(active)for(const item of tabs.children)if(item.classList.contains('rnp-settings-menu-tab'))item.classList.toggle('active',item.dataset.tab===active.dataset.tab);}
				const schedule=()=>{if(frame===null)frame=win.requestAnimationFrame(highlight);};inner.addEventListener('scroll',schedule);
				menus.set(menu,{tab,group,dispose(){inner.removeEventListener('scroll',schedule);if(frame!==null)win.cancelAnimationFrame(frame);tab.remove();group.remove();}});
				const navigate=()=>{inner.scrollTo({top:group.offsetTop+5,behavior:'smooth'});schedule();};
				tab.onclick=navigate;tab.onkeydown=e=>{if(e.key==='Enter'||e.key===' ') {e.preventDefault();navigate();}};
				group.querySelector('input').onchange=e=>api.set('dictionaryEnabled',e.target.checked);
				for(const button of group.querySelectorAll('[data-input-mode]'))button.onclick=()=>api.set('dictionaryInputMode',button.dataset.inputMode);
				group.querySelector('[data-settings]').onclick=()=>openSettings().catch(()=>{});
			}
			refresh();
		}
		const observer=new win.MutationObserver(records=>{
			if(enabled)for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1){if(node.matches('.fg-line'))capture.mark(capture.lineForTarget(node));for(const wrap of node.querySelectorAll('.fg-line'))capture.mark(capture.lineForTarget(wrap));}
			const selector='.rnp-settings-menu,.rnp-settings-menu-tabs,.rnp-settings-menu-inner,[data-tab="jp-furigana-plus"]';
			if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches(selector)||n.querySelector(selector))))) scan();
		});
		observer.observe(doc.body,{childList:true,subtree:true});
		win.addEventListener('rnp-lyric-page-opened',warmup);
		const unsubscribe=api.subscribe(()=>{const next=api.config().dictionaryInputMode||'hover';if(next!==inputMode){inputMode=next;reset();}setEnabled(api.config().dictionaryEnabled);});
		setEnabled(api.config().dictionaryEnabled);scan();
		return {openSettings,setEnabled,diagnostics:()=>({...diagnostics,input:{...diagnostics.input},inputMode,active:enabled}),status:()=>error,destroy(){disposed=true;setEnabled(false);win.removeEventListener('rnp-lyric-page-opened',warmup);observer.disconnect();unsubscribe();style.remove();clearTimeout(noticeTimer);if(notice)notice.remove();for(const binding of menus.values())binding.dispose();menus.clear();}};
	}
	return {INPUT_MODES,install,selectionContext:capture.fromSelection,transport,quotePath};
});
