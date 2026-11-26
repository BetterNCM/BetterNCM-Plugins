/* MIT; bounded Redux discovery adapted from CarrotLouis/jp-furigana. */
(()=>{
 'use strict';
 const KEY='ncm-yotiman.config',listeners=new Set();let dictionary=null,store=null,settingsPanel=null,refreshPanel=()=>{};
 let saved={};try{saved=JSON.parse(localStorage.getItem(KEY))||{};}catch(_){ }
 if(!localStorage.getItem(KEY)){try{saved.dictionaryEnabled=!!JSON.parse(localStorage.getItem('jp-furigana-plus.config')||'{}').dictionaryEnabled;}catch(_){ }}
 const config={dictionaryEnabled:false,dictionaryInputMode:'hover',...saved};
 if(!NcmYotimanDictionary.INPUT_MODES.some(([value])=>value===config.dictionaryInputMode))config.dictionaryInputMode='hover';
 if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify(config));
 const notify=()=>{refreshPanel();for(const fn of listeners)fn();};
 function set(key,value){
  if(key==='dictionaryEnabled')value=!!value;
  else if(key==='dictionaryInputMode'){if(!NcmYotimanDictionary.INPUT_MODES.some(([mode])=>mode===value))throw new Error('未知查词方式');}
  else throw new Error('未知设置项');
  config[key]=value;localStorage.setItem(KEY,JSON.stringify(config));notify();
 }
 function findStore(){
  const looks=v=>v&&typeof v.getState==='function'&&typeof v.dispatch==='function';
  for(const selector of ['#root','#portal_root','body']){
   const element=document.querySelector(selector);if(!element)continue;
   const key=Object.keys(element).find(k=>k.startsWith('__reactContainer$')||k.startsWith('__reactFiber$'));
   const root=key?element[key]:element._reactRootContainer&&element._reactRootContainer._internalRoot&&element._reactRootContainer._internalRoot.current;
   const queue=root?[root]:[],seen=new Set();let budget=6000;
   while(queue.length&&budget--){const f=queue.shift();if(!f||seen.has(f))continue;seen.add(f);
    for(const value of [f.memoizedProps,f.memoizedState]){for(const v of [value,value&&value.store,value&&value.value,value&&value.value&&value.value.store]){if(looks(v))return v;}}
    if(f.child)queue.push(f.child);if(f.sibling)queue.push(f.sibling);
   }
  }return null;
 }
 function track(){
  const plus=window.JPFuriganaPlus;
  if(!store)store=plus&&plus.state&&plus.state.store||findStore();
  let playing;try{playing=store&&store.getState().playing;}catch(_){store=null;}
  const current=playing&&(playing.curTrack||playing.playingTrack||playing.track||playing.resourceTrack);
  const id=playing&&(playing.resourceTrackId||playing.trackId||current&&(current.id||current.trackId))||plus&&plus.trackId&&plus.trackId();
  const songTitle=current&&current.name||'',songArtist=(current&&(current.ar||current.artists)||[]).map(a=>a.name).filter(Boolean).join(' / ');
  return id?{id:String(id),songTitle,songArtist,title:songTitle?[songTitle,songArtist].filter(Boolean).join(' — '):document.title}:null;
 }
 function theme(){
  const style=getComputedStyle(document.body),rnp=document.body.classList.contains('rnp-lyric-page-open');
  const color=(rnp?style.getPropertyValue('--rnp-accent-color-bg'):'')||style.getPropertyValue('--colorBackground')||style.backgroundColor;
  const rgb=color&&color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if(rgb&&!/rgba\([^)]*,\s*0\s*\)/.test(color))return Number(rgb[1])*.2126+Number(rgb[2])*.7152+Number(rgb[3])*.0722<145?'dark':'light';
  return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
 }
 async function probe(){
  const helper=plugin.pluginPath+'/yomitan-host/CloudmusicYomitan.exe';
  return {build:'ncm-Yotiman 0.1.9',enabled:config.dictionaryEnabled,helperExists:await betterncm.fs.exists(helper),hasTrack:!!track(),lyricLines:NcmYotimanSelection.lines(document).length,inputSupport:{pointerConstructor:'PointerEvent' in window,caretRange:typeof document.caretRangeFromPoint==='function',caretPosition:typeof document.caretPositionFromPoint==='function'},gesture:dictionary&&dictionary.diagnostics(),error:dictionary&&dictionary.status()};
 }
 function panel(){
  if(settingsPanel){refreshPanel();return settingsPanel;}
  const root=document.createElement('section');root.style.cssText='font-size:14px;line-height:1.8;padding:12px';
  root.innerHTML='<h2>Yomitan 歌词词典</h2><label><input type="checkbox"> 启用词典</label><p><label>查词方式 <select data-input-mode>'+NcmYotimanDictionary.INPUT_MODES.map(([value,title])=>'<option value="'+value+'">'+title+'</option>').join('')+'</select></label></p><p><button data-settings>Yomitan 设置</button></p><details><summary>运行诊断</summary><p><button data-check>运行检查</button> <button data-copy disabled>复制结果</button></p><pre role="status" style="white-space:pre-wrap"></pre></details><p><a href="#">项目主页</a></p>';
  const input=root.querySelector('input'),mode=root.querySelector('[data-input-mode]');input.onchange=()=>set('dictionaryEnabled',input.checked);mode.onchange=()=>set('dictionaryInputMode',mode.value);
  refreshPanel=()=>{input.checked=config.dictionaryEnabled;mode.value=config.dictionaryInputMode;};settingsPanel=root;refreshPanel();
  const status=root.querySelector('[role=status]');
  root.querySelector('[data-settings]').onclick=()=>dictionary&&dictionary.openSettings().catch(e=>{status.textContent=e.message;root.querySelector('details').open=true;});
  root.querySelector('[data-check]').onclick=()=>probe().then(value=>{status.textContent=JSON.stringify(value,null,2);root.querySelector('[data-copy]').disabled=false;}).catch(e=>{status.textContent=e.message;});
  root.querySelector('[data-copy]').onclick=()=>{const text=document.createElement('textarea');text.value=status.textContent;text.style.cssText='position:fixed;left:-10000px;top:0';root.append(text);text.select();let ok=false;try{ok=document.execCommand('copy');}catch(_){}text.remove();root.querySelector('[data-copy]').textContent=ok?'已复制':'请手动复制下方结果';};
  const home=root.querySelector('a');home.textContent='源码仓库';home.href='https://github.com/CarrotLouis/ncm-Yotiman';
  const issues=document.createElement('a');issues.textContent='反馈问题';issues.href=home.href+'/issues';home.parentElement.append(' · ',issues);
  for(const link of [home,issues])link.onclick=e=>{e.preventDefault();betterncm.ncm.openUrl(link.href);};
  return root;
 }
 plugin.onConfig(panel);
 let started=false;
 async function start(plugins){
  if(started)return;started=true;
  // The earlier combined experiment has its own event listeners. Transfer the
  // enabled preference once, then stop that adapter so a gesture opens one window.
  const hasPlus=Object.values(plugins||window.loadedPlugins||{}).some(p=>p&&p.manifest&&p.manifest.slug==='jp-furigana-plus');
  if(hasPlus)for(let i=0;i<30&&!window.JPFuriganaPlus;i++)await new Promise(r=>setTimeout(r,100));
  const legacy=window.JPFuriganaPlus;
  if(legacy&&legacy.dictionary){legacy.dictionary.destroy();legacy.set('dictionaryEnabled',false);legacy.dictionary=null;}
  dictionary=NcmYotimanDictionary.install({betterncm,plugin,config:()=>config,set,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},track,theme,error:text=>console.warn('[ncm-Yotiman]',text)});
  window.NcmYotiman={config,set,track,theme,probe,dictionary,build:'0.1.9'};
  console.log('[ncm-Yotiman] Loaded; dictionary '+(config.dictionaryEnabled?'enabled':'disabled'));
 }
 if(typeof plugin.onAllPluginsLoaded==='function')plugin.onAllPluginsLoaded(start);else plugin.onLoad(()=>start(window.loadedPlugins));
})();
