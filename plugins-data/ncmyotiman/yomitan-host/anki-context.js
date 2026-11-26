/* MIT. Extra Anki markers for the embedded lyric context; upstream stays unchanged. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NcmYotimanAnki=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MARKERS=['ncm-sentence-translation','ncm-song-title','ncm-song-artist','ncm-song-url'];
 const escape=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function snapshot(value){return JSON.parse(JSON.stringify(value));}
 function install(Builder,DisplayAnki){
  const get=DisplayAnki.prototype._getNoteContext;
  DisplayAnki.prototype._getNoteContext=function(){
   const result=get.call(this),value=this._display.history.state?.ncmLyrics;
   if(result&&value&&result.sentence.text===value.sentence&&result.url===value.url)result.ncmLyrics=snapshot(value);
   return result;
  };
  const render=Builder.prototype._renderTemplateBatched;
  Builder.prototype._renderTemplateBatched=function(template,data,marker){
   const value=data.context?.ncmLyrics;let result;
   if(MARKERS.includes(marker)){
    const field={'ncm-sentence-translation':'translation','ncm-song-title':'songTitle','ncm-song-artist':'songArtist','ncm-song-url':'url'}[marker];
    result=escape(value?.[field]).replace(/\r?\n/g,'<br>');
   }else if(value&&['sentence','sentence-furigana','sentence-furigana-plain'].includes(marker)&&Array.isArray(value.segments)&&value.segments.length&&value.segments.map(s=>s.text).join('')===value.sentence){
    result=marker==='sentence-furigana-plain'?value.segments.map(s=>s.reading?' '+escape(s.text)+'['+escape(s.reading)+']':escape(s.text)).join('').trimStart():value.segments.map(s=>s.reading?'<ruby>'+escape(s.text)+'<rt>'+escape(s.reading)+'</rt></ruby>':escape(s.text)).join('');
   }
   return result===undefined?render.call(this,template,data,marker):Promise.resolve({result,requirements:[]});
  };
 }
 function installMenus(Controller){
  const setup=Controller.prototype._setupFieldMenus;
  Controller.prototype._setupFieldMenus=async function(...args){
   await setup.apply(this,args);
   for(const type of ['term','kanji','all']){
    const content=this._settingsController.templates.getTemplateContent('anki-card-'+type+'-field-menu');
    const container=content&&content.querySelector('.popup-menu-body');if(!container)continue;
    for(const marker of MARKERS){if(container.querySelector('[data-marker="'+marker+'"]'))continue;const option=container.ownerDocument.createElement('button');option.textContent=marker;option.className='popup-menu-item popup-menu-item-thin';option.dataset.menuAction='setFieldMarker';option.dataset.marker=marker;container.append(option);}
   }
  };
 }
 return {MARKERS,install,installMenus};
});
