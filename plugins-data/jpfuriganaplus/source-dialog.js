/* Small on-demand URL dialog. It never performs network requests or writes files. */
(function(root,factory){
	if(typeof module==='object'&&module.exports)module.exports=factory();
	else root.FuriganaPlusSourceDialog=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
	'use strict';
	const active=new WeakMap();let next=0;
	function open(api,doc=document){
		if(active.has(doc)){const existing=active.get(doc);existing.input.focus();return existing.promise;}
		const songId=api.trackId();if(!songId)return Promise.reject(new Error('请先播放一首歌曲'));
		if(!doc.getElementById('fg-source-dialog-style')){
			const style=doc.createElement('style');style.id='fg-source-dialog-style';
			style.textContent='.fg-source-backdrop{position:fixed;z-index:2147483647;inset:0;display:grid;place-items:center;background:#0008}.fg-source-dialog{box-sizing:border-box;width:min(520px,92vw);padding:22px;border:1px solid #ffffff33;border-radius:12px;box-shadow:0 12px 36px #0005;background:#242a2f;color:var(--rnp-accent-color-shade-2,#eee);font:14px/1.6 sans-serif}.fg-source-dialog h2{margin:0 0 14px;font-size:19px}.fg-source-dialog input{box-sizing:border-box;width:100%;margin:7px 0;padding:9px;color:inherit;background:#ffffff12;border:1px solid #ffffff33;border-radius:6px;font:inherit;user-select:text}.fg-source-dialog input:focus{outline:2px solid var(--rnp-accent-color,#8bd5ed)}.fg-source-dialog p{margin:5px 0 12px;opacity:.7}.fg-source-dialog [role=alert]{color:#ffb4ab;white-space:pre-wrap}.fg-source-dialog footer{display:flex;justify-content:flex-end;gap:9px;margin-top:15px}.fg-source-dialog button{padding:7px 16px;background:#ffffff16;color:inherit;border:1px solid #ffffff33;border-radius:6px;font:inherit;cursor:pointer}';
			doc.head.append(style);
		}
		const previous=doc.activeElement,backdrop=doc.createElement('div'),id='fg-source-url-'+(++next);
		backdrop.className='fg-source-backdrop';
		backdrop.innerHTML='<form class="fg-source-dialog" role="dialog" aria-modal="true" aria-label="手动指定歌词页" novalidate><h2>手动指定歌词页</h2><label>UtaTen 歌词页网址<input type="text" data-url inputmode="url" spellcheck="false" placeholder="https://utaten.com/lyric/…/"></label><p>指定后优先使用此页。留空并确认可恢复自动搜索，已保存的人工纠音会保留。</p><div role="alert"></div><footer><button type="button" data-cancel>取消</button><button type="submit">确定</button></footer></form>';
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
	return {open};
});
