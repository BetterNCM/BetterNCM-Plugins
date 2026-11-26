/* Small on-demand dialogs: the manual URL picker and the one-time external-site
 * notice. They never perform network requests or write files. */
(function(root,factory){
	if(typeof module==='object'&&module.exports)module.exports=factory();
	else root.FuriganaSourceDialog=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
	'use strict';
	const active=new WeakMap();let next=0;
	function ensureStyle(doc){
		if(doc.getElementById('fg-source-dialog-style'))return;
		// 网易云页面自带的样式会把 <footer> 固定到窗口底部，按钮行因此用普通 div，并显式写死字体与定位
		const style=doc.createElement('style');style.id='fg-source-dialog-style';
		style.textContent='.fg-source-backdrop{position:fixed;z-index:2147483647;inset:0;display:grid;place-items:center;background:#0008}.fg-source-dialog{box-sizing:border-box;width:min(520px,92vw);padding:22px;border:1px solid #ffffff33;border-radius:12px;box-shadow:0 12px 36px #0005;background:#242a2f;color:var(--rnp-accent-color-shade-2,#eee);font:14px/1.6 "Microsoft YaHei","PingFang SC",sans-serif;text-align:left}.fg-source-dialog *{font-family:inherit}.fg-source-dialog h2{margin:0 0 14px;font-size:19px}.fg-source-dialog input{box-sizing:border-box;width:100%;margin:7px 0;padding:9px;color:inherit;background:#ffffff12;border:1px solid #ffffff33;border-radius:6px;font:inherit;user-select:text}.fg-source-dialog input:focus{outline:2px solid var(--rnp-accent-color,#8bd5ed)}.fg-source-dialog p{margin:5px 0 12px;opacity:.7}.fg-source-dialog [role=alert]{color:#ffb4ab;white-space:pre-wrap}.fg-source-dialog .fg-dialog-actions{position:static;display:flex;justify-content:flex-end;gap:9px;width:auto;height:auto;margin:15px 0 0;padding:0;background:none}.fg-source-dialog button{padding:7px 16px;background:#ffffff16;color:inherit;border:1px solid #ffffff33;border-radius:6px;font:inherit;cursor:pointer}.fg-source-dialog a{color:var(--rnp-accent-color,#8bd5ed);font:inherit}.fg-source-dialog[role=alertdialog] p{opacity:.85}';
		doc.head.append(style);
	}
	function open(api,doc=document){
		if(active.has(doc)){const existing=active.get(doc);existing.input.focus();return existing.promise;}
		const songId=api.trackId();if(!songId)return Promise.reject(new Error('请先播放一首歌曲'));
		ensureStyle(doc);
		const previous=doc.activeElement,backdrop=doc.createElement('div'),id='fg-source-url-'+(++next);
		backdrop.className='fg-source-backdrop';
		backdrop.innerHTML='<form class="fg-source-dialog" role="dialog" aria-modal="true" aria-label="手动指定歌词页" novalidate><h2>手动指定歌词页</h2><label>UtaTen 歌词页网址<input type="text" data-url inputmode="url" spellcheck="false" placeholder="https://utaten.com/lyric/…/"></label><p>指定后优先使用此页。留空并确认可恢复自动搜索，已保存的人工纠音会保留。</p><div role="alert"></div><div class="fg-dialog-actions"><button type="button" data-cancel>取消</button><button type="submit">确定</button></div></form>';
		const form=backdrop.firstElementChild,input=form.querySelector('[data-url]');input.id=id;input.value=api.url||'';
		let resolve;const promise=new Promise(r=>{resolve=r;});
		function close(value){if(!backdrop.isConnected)return;doc.removeEventListener('keydown',escape,true);backdrop.remove();active.delete(doc);if(previous&&previous.isConnected)previous.focus();resolve(value);}
		function escape(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(null);}}
		form.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Enter'&&event.isComposing)event.preventDefault();});
		form.addEventListener('submit',event=>{
			event.preventDefault();
			try{if(api.trackId()!==songId)throw new Error('歌曲已变化，请关闭后重新指定');const value=input.value.trim();close({songId,url:value?api.validate(value):null});}
			catch(error){form.querySelector('[role=alert]').textContent=error.message;input.focus();}
		});
		form.querySelector('[data-cancel]').addEventListener('click',()=>close(null));
		backdrop.addEventListener('click',event=>{if(event.target===backdrop)close(null);});
		active.set(doc,{input,promise});doc.body.append(backdrop);doc.addEventListener('keydown',escape,true);input.focus();input.select();
		return promise;
	}
	// One-time notice before the first website request. Resolves true only on an
	// explicit confirmation; Escape, the backdrop and 取消 all resolve false.
	const notices=new WeakMap();
	function confirmExternal(api={},doc=document){
		if(notices.has(doc)){const existing=notices.get(doc);existing.cancel.focus();return existing.promise;}
		ensureStyle(doc);
		const previous=doc.activeElement,backdrop=doc.createElement('div');
		backdrop.className='fg-source-backdrop';
		backdrop.innerHTML='<div class="fg-source-dialog" role="alertdialog" aria-modal="true" aria-labelledby="fg-external-notice-title" aria-describedby="fg-external-notice-body"><h2 id="fg-external-notice-title">开启外部网站注音</h2><div id="fg-external-notice-body">'+
			'<p>开启后，插件会在播放日语歌曲时访问第三方歌词网站 <a href="#" data-open="https://utaten.com/">UtaTen</a> 和 <a href="#" data-open="https://www.uta-net.com/">歌ネット</a>，获取当前歌曲的歌词与读音，并把整首歌词保存在本地缓存目录中。</p>'+
			'<p>这些歌词和读音的著作权属于权利人及相应网站。这两个网站都没有提供公开接口，以程序方式获取其内容可能违反网站的使用条款（<a href="#" data-open="https://utaten.com/index/agreement">UtaTen 条款</a> · <a href="#" data-open="https://www.uta-net.com/info/kiyaku.html">歌ネット条款</a>）。</p>'+
			'<p>请仅用于个人学习，不要传播缓存的歌词。是否开启由你自行判断并承担相应责任；随时可以把读音来源切回「网易云」或「词典」。</p>'+
			'</div><div class="fg-dialog-actions"><button type="button" data-cancel>取消</button><button type="button" data-accept>我已了解，开启</button></div></div>';
		const dialog=backdrop.firstElementChild,cancel=dialog.querySelector('[data-cancel]');
		let resolve;const promise=new Promise(r=>{resolve=r;});
		function close(value){if(!backdrop.isConnected)return;doc.removeEventListener('keydown',escape,true);backdrop.remove();notices.delete(doc);if(previous&&previous.isConnected)previous.focus();resolve(value);}
		function escape(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(false);}}
		dialog.addEventListener('keydown',event=>event.stopPropagation());
		for(const link of dialog.querySelectorAll('[data-open]'))link.addEventListener('click',event=>{event.preventDefault();if(api.openUrl)api.openUrl(link.dataset.open);});
		cancel.addEventListener('click',()=>close(false));
		dialog.querySelector('[data-accept]').addEventListener('click',()=>close(true));
		backdrop.addEventListener('click',event=>{if(event.target===backdrop)close(false);});
		notices.set(doc,{cancel,promise});doc.body.append(backdrop);doc.addEventListener('keydown',escape,true);cancel.focus();
		return promise;
	}
	return {open,confirmExternal};
});
