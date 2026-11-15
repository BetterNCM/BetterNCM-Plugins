(function(){
const MINILYRICS_VERSION="0.7.9";
/* MiniLyrics, GPL-3.0-or-later. Pure normalization shared by plugin and tests. */
(function (root) {
  'use strict';
  const finite = (x, fallback = 0) => Number.isFinite(Number(x)) ? Number(x) : fallback;
  function normalizeLines(input, options = {}) {
    if (!Array.isArray(input)) return [];
    const lines = input.slice(0, 5000).filter(l => l && typeof l==='object').map(l => {
      const time = Math.max(0, finite(l.time ?? l.startTime ?? l.start));
      let text = String(l.originalLyric ?? l.lyric ?? l.text ?? l.content ?? '');
      const words = (Array.isArray(l.dynamicLyric) ? l.dynamicLyric : []).slice(0, 500).filter(w => w && typeof w==='object').map(w => {
        const t = finite(w.time);
        return {text: String(w.word ?? w.text ?? ''), time: options.wordTiming === 'relative' ? time + t : t,
          duration: Math.max(1, finite(w.duration, 1))};
      });
      if (!text) text = words.map(w => w.text).join('');
      const translation = String(l.translatedLyric ?? l.translation ?? '');
      return {time, duration: Math.max(0, finite(l.duration)), text, isInterlude: !!l.isInterlude || (!text && !translation),
        translation, words};
    });
    return options.unsynced ? lines : lines.sort((a,b) => a.time-b.time);
  }
  function metadata(info) {
    if(!info || typeof info!=='object') return null;
    const ncmId=finite(info.ncmId);
    const id=String(info.trackId??(ncmId>0?ncmId:''));
    if(!id)return null;
    return {id,ncmId:ncmId>0?String(ncmId):'',title:String(info.songName??''),
      artist:String(info.authorName??''),cover:String(info.cover?.url??''),
      duration:Math.max(0,finite(info.duration))};
  }
  // Reconcile a stale provider pause flag only after sustained, real-time progress.
  // A seek sample cannot establish motion, and every explicit state event starts fresh.
  function createPlaybackState(){
    let reported=null,output=false,inferred=false,point=null,run=null,lastMotionAt=-Infinity;
    const parse=value=>{
      if(value===true||value===false)return value;
      if(value==null)return null;
      const text=String(value).toLowerCase();
      return text==='playing'?true:['paused','stopped','ended'].includes(text)?false:null;
    };
    function reset(){reported=null;output=false;inferred=false;point=null;run=null;lastMotionAt=-Infinity;}
    function report(value,force=false){
      const next=parse(value);
      if(next!==null&&(force||next!==reported)){
        reported=next;output=next;inferred=false;point=null;run=null;lastMotionAt=-Infinity;
      }
      return output;
    }
    function sample(position,now,status,discontinuous=false){
      report(status);
      const next={position,at:now};
      if(reported===true){point=next;run=null;output=true;return output;}
      if(discontinuous){point=next;run=null;}
      else if(!point)point=next;
      else if(position!==point.position){
        const delta=position-point.position,elapsed=now-point.at;
        const continuous=elapsed>=100&&elapsed<=2500&&delta>0&&delta<=1500
          &&Math.abs(delta-elapsed)<=Math.max(250,elapsed*.25);
        if(continuous){
          if(!run)run={at:point.at,steps:0};
          run.steps++;
          if(run.steps>=2&&now-run.at>=800)inferred=true;
          if(inferred)lastMotionAt=now;
        }else run=null;
        point=next;
      }
      if(inferred&&now-lastMotionAt>=2000){inferred=false;run=null;}
      output=inferred;return output;
    }
    return {sample,event:value=>report(value,true),reset,resetProgress:()=>{point=null;run=null;inferred=false;lastMotionAt=-Infinity;output=reported===true;},
      current:()=>output,snapshot:()=>({reportedPlaying:reported,playing:output,inferredFromProgress:inferred,
        progressSamples:run?.steps??0})};
  }
  const api={finite, normalizeLines, metadata, createPlaybackState};
  if(typeof module!=='undefined') module.exports=api; else root.MiniLyricsCore=api;
})(typeof window!=='undefined'?window:globalThis);

/* MiniLyrics — GPL-3.0-or-later. NCM 3.x playback boundary; no shared function patches. */
(function(root){
  'use strict';
  function createPlayerAdapter(env=root){
    let store=null,bridge=null,nativeAdapter=null,unsubscribe=null,disposed=false,starting=false,retry=null;
    let song=null,status='Paused',timeline=null,sequence=0,lastStoreState=null;
    const events=new Map(),bindings=new Map(),eventNames=['PlayProgress','Seek','PlayState'];
    const now=()=>env.performance?.now?.()??Date.now();
    let lastAcceptedProgressAt=null,lastAcceptedSeekAt=null,bridgeSource=null;
    let audioPlayerAvailable=false,canQueueLoadingSeek=false,startTarget=null,resumeTrack=null,startFlushScheduled=false,controlSerial=0,lastControl=null;
    const sessionReady=p=>!!p?.playId&&!p.restoreResource&&!p.isLoadingFirst;
    function controlState(){
      const p=store?.getState()?.playing;
      return {phase:!p?'unavailable':p.isLoadingFirst?'loading':p.restoreResource?'restoring':p.playId?'loaded':'idle',
        hasPlayId:!!p?.playId,audioPlayerAvailable,canQueueLoadingSeek,pendingTargetMs:startTarget?.target??null,
        lastCommand:lastControl?{...lastControl}:null};
    }
    function cancelSeek(requestId,resetStart=false){
      if(requestId==null||startTarget?.requestId===requestId)startTarget=null;
      if(resetStart)resumeTrack=null;
    }
    function scheduleStartupSeek(){
      if(disposed||!startTarget||startFlushScheduled||!sessionReady(store?.getState()?.playing))return;
      startFlushScheduled=true;
      // Finish the current native/store event fanout before issuing a seek.
      // This is an ordering boundary, not a timed guess about readiness.
      Promise.resolve().then(()=>{
        startFlushScheduled=false;const own=startTarget,p=store?.getState()?.playing;
        if(disposed||!own||!sessionReady(p))return;
        if(String(p.resourceTrackId)!==own.trackId){startTarget=null;return;}
        startTarget=null;resumeTrack=null;
        lastControl={action:'seek',route:'loaded-after-start',targetMs:own.target,at:now()};
        try{dispatch('playing/setPlayingPosition',{duration:own.target/1000});}
        catch(e){lastControl.error='seek-dispatch-failed';emit('controlError',{requestId:own.requestId,songId:own.trackId,reason:'播放器跳转失败'});}
      });
    }
    const nativeStats=Object.fromEntries(eventNames.map(name=>[name,{received:0,accepted:0,filtered:0,lastReceivedAt:null,lastAcceptedAt:null,lastSongId:null,lastOutcome:null,lastFilterReason:null}]));
    function receive(name,id){
      const event=nativeStats[name];event.received++;event.lastReceivedAt=now();event.lastSongId=id==null?null:String(id).slice(0,256);event.lastOutcome='received';return event;
    }
    function outcome(event,reason=null){
      event.lastOutcome=reason?'filtered':'accepted';event.lastFilterReason=reason;
      if(reason)event.filtered++;else{event.accepted++;event.lastAcceptedAt=now();}
    }
    function diagnostics(){
      const subscriptions=Object.fromEntries(eventNames.map(name=>{
        const own=bindings.get(name),entry=nativeAdapter?.registerCallMap?.['audioplayer.on'+name];
        const active=!!own&&(entry===own||Array.isArray(entry)&&entry.includes(own));
        return [name,active?'subscribed':own?'lost':'waiting'];
      }));
      const canControl=!!store&&!disposed,progress=nativeStats.PlayProgress;
      const streamState=!canControl?'waiting-player':subscriptions.PlayProgress==='lost'?'subscription-lost':subscriptions.PlayProgress!=='subscribed'?'waiting-subscription':
        progress.lastOutcome==='filtered'?'events-filtered':lastAcceptedProgressAt===null?'waiting-progress':status==='Playing'&&now()-lastAcceptedProgressAt>=4500?'progress-stalled':status==='Playing'?'progress-live':'progress-paused';
      return {canControl,bridgeSource,originalInitialization:'unverified',subscriptions,streamState,
        hasActualProgress:lastAcceptedProgressAt!==null,lastReceivedProgressAt:progress.lastReceivedAt,lastAcceptedProgressAt,lastAcceptedSeekAt,
        progressAgeMs:lastAcceptedProgressAt===null?null:Math.max(0,now()-lastAcceptedProgressAt),
        timelineSource:timeline?.source??null,control:controlState(),events:Object.fromEntries(eventNames.map(name=>[name,{...nativeStats[name]}]))};
    }
    const emit=(name,detail)=>{for(const fn of [...events.get(name)??[]])try{fn({detail});}catch(e){env.console?.warn('[MiniLyrics] 播放订阅处理失败',e);}};
    const readSong=()=>{
      const state=store.getState(),p=state?.playing;if(!p?.resourceTrackId)return null;
      const voice=state['page:vinylPage']?.currentVoice;
      if(p.resourceType==='voice'&&(!voice||String(voice.id)!==String(p.onlineResourceId)))return null;
      const v=p.resourceType==='voice'?voice:null;
      const online=v?.id??p.onlineResourceId??p.resourceTrackId;
      return {trackId:String(p.resourceTrackId),ncmId:/^\d+$/.test(String(online))?Number(online):0,
        songName:v?.name??p.resourceName??'',authorName:(v?.track?.artists??p.resourceArtists??[]).map(a=>a.name).join(' / '),
        cover:{url:v?.coverUrl??p.resourceCoverUrl??''},duration:Math.max(0,Number(v?.duration??p.curTrack?.duration)||0)};
    };
    function sync(){
      if(disposed||!store)return;
      bindEvents();
      const next=readSong();if(!next)return;
      const changed=next.trackId!==song?.trackId,meta=JSON.stringify(next)!==JSON.stringify(song);
      if(changed){timeline=null;sequence++;lastStoreState=null;lastAcceptedProgressAt=null;lastAcceptedSeekAt=null;cancelSeek(null,true);}
      song=next;
      // Redux uses 2 for playing; native PlayState uses a different enum.
      const state=store.getState()?.playing?.playingState;
      const known=[-1,0,1,2].includes(state),nextStatus=state===2?'Playing':'Paused';
      const stateChanged=known&&(changed||state!==lastStoreState);
      if(stateChanged){status=nextStatus;lastStoreState=state;}
      if(timeline)timeline={...timeline,totalTime:song.duration};
      if(meta)emit('songChange',song);
      if(stateChanged)emit('playStateChange',status);
      if(sessionReady(store.getState()?.playing))resumeTrack=null;
      scheduleStartupSeek();
    }
    function matches(id){
      if(!song||String(store?.getState()?.playing?.resourceTrackId)!==song.trackId||id==null||id==='')return false;
      const value=String(id).toLowerCase();
      return [song.trackId,song.ncmId>0?String(song.ncmId):''].filter(Boolean).some(key=>{
        key=key.toLowerCase();return value===key||value.startsWith(key+'_')||value.startsWith(key+'|');
      });
    }
    function progress(id,seconds,seek=false,source=seek?'seek':'progress',code=0){
      const name=source==='progress'?'PlayProgress':source==='seek'?'Seek':null,event=name?receive(name,id):null;
      sync();
      const reason=!song?'no-song':!matches(id)?'song-mismatch':seek&&code!==0?'seek-failed':typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<0?'invalid-time':null;
      if(event)outcome(event,reason);if(reason)return;
      if(source==='progress')lastAcceptedProgressAt=now();else if(source==='seek')lastAcceptedSeekAt=now();
      timeline={songId:song.trackId,currentTime:seconds*1000,totalTime:song.duration,sequence:++sequence,seek,source,receivedAt:event?.lastReceivedAt??null};
      if(source!=='restore'&&startTarget?.trackId===song.trackId&&Math.abs(timeline.currentTime-startTarget.target)<=250)startTarget=null;
      emit('timelineUpdate',timeline);
    }
    const isolate=(fn,name)=>(...args)=>{if(disposed)return;try{return fn(...args);}catch(e){if(name)outcome(nativeStats[name],'callback-error');env.console?.warn('[MiniLyrics] 播放回调失败，已隔离',e);}};
    function bind(name,fn){
      const entry=nativeAdapter?.registerCallMap?.['audioplayer.on'+name],current=bindings.get(name);
      if(current&&Array.isArray(entry)&&entry.includes(current))return;
      // APPEND reserves an absent event and can reject the player's later first
      // registration. Only join an existing callback; never create an empty slot.
      const existing=Array.isArray(entry)?entry.some(cb=>typeof cb==='function'&&cb!==current):typeof entry==='function'&&entry!==current;
      if(!existing)return;
      const callback=current??isolate(fn,name);
      bridge.appendRegisterCall(name,'audioplayer',callback);bindings.set(name,callback);
    }
    function bindEvents(){
      if(disposed||!bridge)return;
      bind('PlayProgress',(id,seconds)=>progress(id,seconds));
      bind('Seek',(id,request,code,seconds)=>progress(id,seconds,true,'seek',code));
      bind('PlayState',(id,request,value)=>{
        const event=receive('PlayState',id);sync();
        const reason=!matches(id)?'song-mismatch':![0,1,2,4].includes(value)?'invalid-state':null;
        outcome(event,reason);if(reason)return;
        status=value===1?'Playing':'Paused';emit('playStateChange',status);
      });
    }
    function release(){
      unsubscribe?.();unsubscribe=null;
      for(const [name,fn]of bindings)try{bridge.removeRegisterCall(name,'audioplayer',fn);}catch(e){env.console?.warn('[MiniLyrics] 清理播放订阅失败',e);}
      bindings.clear();store=null;bridge=null;nativeAdapter=null;
    }
    function find(require,predicate){
      for(const module of Object.values(require.c??{})){const e=module?.exports;for(const candidate of [e,e?.default])if(candidate&&predicate(candidate))return candidate;}
      return null;
    }
    function initialize(require){
      if(disposed)return;
      const dva=find(require,e=>e.a?.app?._store?.getState&&e.a.app._store.subscribe&&e.a.app._store.dispatch);
      // Like InfLink's V3 adapter, resolve AudioPlayer before subscribing through Bridge.
      audioPlayerAvailable=!!find(require,e=>typeof e.AudioPlayer?.subscribePlayStatus==='function');
      const model=dva?.a.app._models?.find(m=>m.namespace==='playing'),reducers=model?.reducers;
      canQueueLoadingSeek=typeof (reducers?.['playing/onLoadingSeekUpdate']??reducers?.onLoadingSeekUpdate)==='function';
      const native=find(require,e=>typeof e.Bridge?.appendRegisterCall==='function'&&typeof e.Bridge?.removeRegisterCall==='function')?.Bridge;
      const selected=native??env.legacyNativeCmder,adapter=selected?._Adapter??selected?._envAdapter;
      if(!dva||!adapter?.registerCallMap||typeof selected?.appendRegisterCall!=='function'||typeof selected?.removeRegisterCall!=='function')return;
      store=dva.a.app._store;bridge=selected;nativeAdapter=adapter;bridgeSource=native?'internal':'legacy';
      try{
        sync();unsubscribe=store.subscribe(isolate(sync));
        // Event binding is retried by sync/polling after native initialization.
        // Restore only a matching startup snapshot, never overwrite a newer event.
        const storage=find(require,e=>typeof e.b?.lastPlaying?.get==='function')?.b;
        const initial=sequence,id=song?.trackId;
        Promise.resolve(storage?.lastPlaying.get()).then(saved=>{
          if(disposed||sequence!==initial||song?.trackId!==id||String(saved?.trackId)!==id)return;
          progress(id,saved.current,false,'restore');
        }).catch(()=>{});
      }catch(e){release();throw e;}
    }
    function start(){
      if(disposed||store||starting)return;
      starting=true;
      try{
        const chunks=env.webpackJsonp;
        if(chunks?.push){
          const key='minilyrics_player_'+Date.now()+'_'+Math.random().toString(36).slice(2);
          const modules={[key]:(module,exports,require)=>initialize(require)};
          chunks.push(chunks[0]&&Array.isArray(chunks[0])?[[key],modules,[[key]]]:[[key],modules]);
        }
      }catch(e){env.console?.debug('[MiniLyrics] 等待播放器就绪',e);}
      finally{starting=false;if(!disposed&&!store)retry=env.setTimeout(start,1000);}
    }
    function dispatch(type,payload){
      if(disposed||!store)return false;
      store.dispatch({type,payload});
      // A synchronous first seek may initialize native callbacks without a store
      // notification. Join them now; a confirmation already missed is not replayed.
      bindEvents();
      return true;
    }
    function seekTo(ms,requestId){
      if(disposed||!store||!Number.isFinite(ms)||ms<0)return false;
      sync();const p=store.getState()?.playing,trackId=String(p?.resourceTrackId??'');
      if(!trackId||trackId!==song?.trackId)return false;
      if(sessionReady(p)){
        cancelSeek();lastControl={action:'seek',route:'loaded',targetMs:ms,at:now()};
        return dispatch('playing/setPlayingPosition',{duration:ms/1000});
      }
      // The live NCM effects queue positions in restoreResource/current or
      // loadingSeekDuration. Never send an idle session's missing playId to seek.
      const needsLoadingQueue=!p.restoreResource&&!p.isLoadingFirst;
      const clearZeroFallback=!!p.restoreResource&&ms===0&&Number(p.loadingSeekDuration)>0;
      if((!p.isLoadingFirst&&!p.curPlaying)||((needsLoadingQueue||clearZeroFallback)&&!canQueueLoadingSeek)){
        lastControl={action:'seek',route:'unavailable',targetMs:ms,at:now()};return false;
      }
      const own={requestId:requestId??++controlSerial,trackId,target:ms};startTarget=own;
      lastControl={action:'seek',route:'queued-start',targetMs:ms,at:now()};
      try{
        if(p.restoreResource||p.isLoadingFirst)dispatch('playing/setPlayingPosition',{duration:ms/1000});
        else dispatch('playing/onLoadingSeekUpdate',{loadingSeekDuration:ms/1000});
        // nativePlay uses restore.current || loadingSeekDuration: zero must
        // also clear an older loading target rather than fall back to it.
        if(clearZeroFallback)dispatch('playing/onLoadingSeekUpdate',{loadingSeekDuration:0});
        if(!p.isLoadingFirst&&resumeTrack!==trackId){resumeTrack=trackId;dispatch('playing/resume',{triggerScene:'desktopLyric'});}
        scheduleStartupSeek();return true;
      }catch(e){cancelSeek(own.requestId,true);throw e;}
    }
    function playbackControl(type,payload){
      cancelSeek(null,true);lastControl={action:type,route:'original-model',at:now()};return dispatch(type,payload);
    }
    const api={version:'ncm3-v3',get ready(){return !!store&&!disposed;},getDiagnostics:diagnostics,
      getCurrentSong:()=>{sync();return song;},getPlaybackStatus:()=>status,getTimeline:()=>{bindEvents();scheduleStartupSeek();return timeline;},
      addEventListener:(name,fn)=>{if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},
      removeEventListener:(name,fn)=>events.get(name)?.delete(fn),
      play:()=>playbackControl('playing/resume',{triggerScene:'desktopLyric'}),pause:()=>playbackControl('playing/pause',{triggerScene:'desktopLyric'}),
      togglePlay:()=>playbackControl('playing/switchResumeOrPause',{triggerScene:'desktopLyric'}),
      next:()=>playbackControl('playingList/jump2Track',{flag:1,type:'call',triggerScene:'hotKey'}),
      previous:()=>playbackControl('playingList/jump2Track',{flag:-1,type:'call',triggerScene:'hotKey'}),
      seekTo,cancelSeek,
      dispose:()=>{cancelSeek(null,true);disposed=true;env.clearTimeout(retry);release();events.clear();timeline=null;song=null;}};
    start();return api;
  }
  if(typeof module!=='undefined')module.exports={createPlayerAdapter};else root.MiniLyricsPlayer={createPlayerAdapter};
})(typeof window!=='undefined'?window:globalThis);

/* MiniLyrics — GPL-3.0-or-later. */
(() => {
  'use strict';
  window.__miniLyrics?.dispose();
  const playerAdapter=window.MiniLyricsPlayer.createPlayerAdapter();
  const C=window.MiniLyricsCore,listeners=[],rnpCache=new Map(),playback=C.createPlaybackState();
  const STALE_MS=4500,SEEK_TIMEOUT_MS=2500,SEEK_TOLERANCE_MS=1500;
  let socket=null,timer=null,stopped=false,session=0,busy=false;
  let windowSession=null,reconnectTimer=null;
  let player=null,detachPlayer=null,song={id:'',ncmId:'',duration:0},lines=[];
  let position=0,anchor=performance.now(),playing=false,clockValid=false,offset=0;
  let sourcePosition=null,sourcePlaying=null,sourceKind=null,sourceAdvancedAt=0,hostState=null;
  let lastMeta='',lastLyrics='',lyricMode='waiting',lyricRevision=0,lastRnp=null,lastAppliedRnp=null;
  let pendingSeek=null,seekTimer=null,lastSeekId=0;
  let status='小窗未启动',statusView=null,lastRnpStyle='';
  const normalizeFontSize=value=>Number.isFinite(Number(value))&&value!==''?Math.max(14,Math.min(36,Math.round(Number(value)))):21;
  let fontSize=21;try{fontSize=normalizeFontSize(plugin.getConfig?.('fontSize',21));}catch{}
  function sendFont(){send({type:'font',size:fontSize});}
  function changeFontSize(value){fontSize=normalizeFontSize(value);try{plugin.setConfig?.('fontSize',fontSize);}catch(e){console.warn('[MiniLyrics] 保存字号失败',e);}sendFont();}
  function normalizeBackground(value){
    const v=value&&typeof value==='object'?value:{},mode=Number(v.mode),speed=Number(v.speed),fps=Number(v.fps);
    return {mode:Number.isInteger(mode)&&mode>=0&&mode<=3?mode:1,animated:typeof v.animated==='boolean'?v.animated:true,
      speed:[.5,1,2].includes(speed)?speed:1,fps:[10,15,30,45,60].includes(fps)?fps:60};
  }
  let background;try{
    background=normalizeBackground(plugin.getConfig?.('background',{}));
    if(plugin.getConfig?.('backgroundRenderer','')!=='lyricify-v1'){
      background.mode=1;background.animated=true;
      plugin.setConfig?.('background',{...background});plugin.setConfig?.('backgroundRenderer','lyricify-v1');
    }
  }catch{background=normalizeBackground();}
  function sendBackground(){send({type:'background',...background});}
  function changeBackground(patch){background=normalizeBackground({...background,...patch});try{plugin.setConfig?.('background',{...background});}catch(e){console.warn('[MiniLyrics] 背景设置保存失败',e);}sendBackground();}
  const listen=(target,name,fn)=>{target.addEventListener(name,fn);listeners.push([target,name,fn]);};
  const send=m=>{if(socket?.readyState!==1)return;try{socket.send(JSON.stringify(m));}catch(e){console.debug('[MiniLyrics] 小窗消息发送失败',e);socket?.close();}};
  const live=()=>position+(playing&&clockValid?Math.max(0,performance.now()-anchor):0);
  function providerId(d){
    if(d?.songID!=null||d?.songId!=null)return String(d.songID??d.songId);
    return String(d?.hash??'').match(/^(.*)-\d+$/)?.[1]??'';
  }
  function aliases(){return new Set([song.id,song.ncmId].filter(x=>x&&x!=='0'));}
  function cacheRnp(d){
    const id=providerId(d);if(!id||!Array.isArray(d?.lyrics))return;
    rnpCache.delete(id);rnpCache.set(id,d);
    while(rnpCache.size>4)rnpCache.delete(rnpCache.keys().next().value);
  }
  function setLyrics(d,force=false){
    if(d===lastAppliedRnp&&!force)return;
    if(!aliases().has(providerId(d))||!Array.isArray(d?.lyrics))return;
    const unsynced=!!d.unsynced||d.lyrics.some(l=>l&&l.unsynced===true);
    const normalized=C.normalizeLines(d.lyrics,{unsynced}),mode=normalized.length?(unsynced?'untimed':'timed'):'empty';
    const signature=JSON.stringify({mode,lines:normalized});lastAppliedRnp=d;
    if(signature===lastLyrics)return;
    lines=normalized;lyricMode=mode;lastLyrics=signature;
    send({type:'lyrics',songId:song.id,revision:++lyricRevision,mode:lyricMode,lines});refreshStatus();
  }
  function recoverLyrics(update){
    const snapshot=window.currentLyrics;
    if(snapshot!==lastRnp){lastRnp=snapshot;cacheRnp(snapshot);}
    if(update&&Array.isArray(update.lyrics)&&aliases().has(providerId(update))){setLyrics(update,true);return;}
    if(aliases().has(providerId(snapshot))){setLyrics(snapshot);return;}
    for(const [id,d]of [...rnpCache].reverse())if(aliases().has(id)){setLyrics(d);return;}
  }
  function sendRnpStyle(force=false){
    const classes=document.body?.classList,names=['smooth','sharp','lazy','easeout'];let curve=0;
    for(let i=1;i<names.length;i++)if(classes?.contains('rnp-lyric-animation-timing-'+names[i]))curve=i;
    let stagger=true;try{const value=window.localStorage?.getItem('refined-now-playing-lyric-stagger');stagger=value!=='false'&&value!=='0';}catch{}
    const signature=curve+':'+stagger;if(force||signature!==lastRnpStyle){lastRnpStyle=signature;send({type:'style',curve,stagger});}
  }
  function clearSeek(){clearTimeout(seekTimer);seekTimer=null;const own=pendingSeek;pendingSeek=null;if(own)player?.cancelSeek?.(own.id);}
  function syncSong(){
    let info;try{info=player?.getCurrentSong?.();}catch{return false;}
    const next=C.metadata(info);if(!next)return false;
    if(next.id!==song.id){
      clearSeek();lastSeekId=0;playback.reset();
      position=0;anchor=performance.now();clockValid=false;
      sourcePosition=null;sourcePlaying=null;sourceKind=null;lines=[];lastLyrics='';lyricMode='waiting';lastAppliedRnp=null;hostState=null;
    }
    song=next;const signature=JSON.stringify(song);
    if(signature!==lastMeta){lastMeta=signature;send({type:'track',...song});}
    return true;
  }
  function sendClock(seekState=''){
    send({type:'clock',songId:song.id,position:live(),playing,valid:clockValid,
      duration:song.duration,offset,seekRequest:lastSeekId,seekState});refreshStatus();
  }
  function playerTimelineFresh(){
    return !!player&&clockValid&&sourcePosition!==null&&(sourcePlaying===false||performance.now()-sourceAdvancedAt<STALE_MS);
  }
  function acceptTimeline(t,api,playbackStatus){
    if(api!==player||!song.id||(t?.songId&&t.songId!==song.id)||t?.currentTime==null||!Number.isFinite(Number(t.currentTime)))return false;
    const next=Math.max(0,Number(t.currentTime)),now=performance.now(),kind=t.source??'progress',actual=kind!=='restore';
    const state=playbackStatus===undefined?api.getPlaybackStatus?.():playbackStatus;
    const nextPlaying=playback.sample(next,now,state,!!pendingSeek);
    let seekState=pendingSeek?'pending':'';
    if(pendingSeek&&actual){
      const expected=pendingSeek.target+(nextPlaying?Math.max(0,now-pendingSeek.started):0);
      // Actual position is authoritative, including an external seek that supersedes ours.
      const reached=pendingSeek.startup?next>=pendingSeek.target-250&&next<=pendingSeek.target+(nextPlaying?Math.max(0,now-pendingSeek.started):0)+250:Math.abs(next-expected)<=250;
      if((pendingSeek.sequence===undefined||t.sequence!==pendingSeek.sequence)&&(reached||!pendingSeek.startup&&(t.seek||Math.abs(next-live())>SEEK_TOLERANCE_MS))){clearSeek();seekState='confirmed';}
    }
    if(next===sourcePosition&&nextPlaying===sourcePlaying&&kind===sourceKind&&seekState!=='confirmed')return false;
    sourcePosition=next;sourcePlaying=nextPlaying;sourceKind=kind;sourceAdvancedAt=now;
    position=next;anchor=now;playing=nextPlaying;clockValid=actual;status='已连接';
    if(Number(t.totalTime)>0)song.duration=Number(t.totalTime);
    sendClock(seekState);return true;
  }
  function sample(update,playbackStatus){
    if(player)syncSong();recoverLyrics(update);
    if(!player)return false;
    try{return acceptTimeline(player.getTimeline(),player,playbackStatus);}catch(e){console.debug('[MiniLyrics] 网易云播放器 时间轴暂不可用',e);return false;}
  }
  function failSeek(own,reason){
    if(pendingSeek!==own)return;
    player?.cancelSeek?.(own.id,true);clearSeek();playback.resetProgress();
    try{
      const t=player?.getTimeline?.();
      if(t?.currentTime!=null&&Number.isFinite(Number(t.currentTime))){
        position=Math.max(0,Number(t.currentTime));anchor=performance.now();
        sourcePosition=position;sourceKind=t.source??'progress';sourceAdvancedAt=anchor;clockValid=sourceKind!=='restore';
      }else{position=own.previous;anchor=performance.now();clockValid=false;}
    }catch{position=own.previous;anchor=performance.now();clockValid=false;}
    status=reason+(clockValid?'，已恢复进度':'，等待实际进度');sendClock('failed');
  }
  function seek(ms,requestId,requestSong){
    syncSong();recoverLyrics();if(requestSong&&requestSong!==song.id)return;
    const target=Math.max(0,Math.min(song.duration||Infinity,Number(ms)));
    if(!Number.isFinite(target))return;
    lastSeekId=Number(requestId)||lastSeekId+1;
    clearSeek();playback.resetProgress();
    const own={id:lastSeekId,songId:song.id,target,startup:!!player?.getDiagnostics?.()?.control&&player.getDiagnostics().control.phase!=='loaded',sequence:player?.getTimeline?.()?.sequence,started:performance.now(),previous:live()};pendingSeek=own;
    seekTimer=setTimeout(()=>failSeek(own,'跳转未确认'),SEEK_TIMEOUT_MS);
    sendClock('pending');
    try{
      if(typeof player?.seekTo!=='function')throw Error('网易云播放器 未就绪');
      const result=player.seekTo(target,own.id);
      if(result===false)failSeek(own,'网易云播放器 未接受跳转');
      else if(result?.then)result.then(value=>{if(value===false)failSeek(own,'网易云播放器 未接受跳转');},
        ()=>failSeek(own,'网易云播放器 跳转失败'));
    }catch{failSeek(own,'网易云播放器 跳转失败');}
  }
  function command(m){
    if(m.type!=='command')return;
    if(m.action==='seek')return seek(m.position,m.requestId,m.songId);
    if(m.action==='play'){if(player?.togglePlay)player.togglePlay();else player?.[player.getPlaybackStatus?.()==='Playing'?'pause':'play']?.();return;}
    if(m.action==='previous'||m.action==='next')player?.[m.action]?.();
  }
  function attachPlayer(){
    const candidate=(playerAdapter.ready?playerAdapter:null),api=typeof candidate?.getCurrentSong==='function'&&typeof candidate?.getTimeline==='function'?candidate:null;
    if(api===player){if(!api)status='等待 网易云播放器';return;}
    detachPlayer?.();detachPlayer=null;playback.reset();
    const wasPending=pendingSeek;
    player=api;
    if(wasPending)failSeek(wasPending,'网易云播放器 连接变化，跳转已取消');
    position=live();anchor=performance.now();playing=false;clockValid=false;
    sourcePosition=null;sourcePlaying=null;sourceKind=null;
    if(!player){status='等待 网易云播放器';sendClock();return;}
    const onTimeline=e=>{if(player!==api)return;syncSong();recoverLyrics();acceptTimeline(e.detail,api);};
    const onSong=()=>{if(player===api)sample();};
    const onPlaying=e=>{
      if(player!==api)return;
      position=live();anchor=performance.now();playback.event(e.detail);
      if(!sample(undefined,e.detail)){playing=playback.current();sendClock(pendingSeek?'pending':'');}
    };
    const onControlError=e=>{const own=pendingSeek;if(player===api&&own&&e.detail?.requestId===own.id&&e.detail?.songId===own.songId)failSeek(own,e.detail.reason);};
    const bindings=[['timelineUpdate',onTimeline],['songChange',onSong],['playStateChange',onPlaying],['controlError',onControlError]];
    for(const [name,fn]of bindings)api.addEventListener?.(name,fn);
    detachPlayer=()=>{for(const [name,fn]of bindings)api.removeEventListener?.(name,fn);};
    status='已连接';
  }
  function tick(){
    if(stopped||socket?.readyState!==1)return;
    try{
      attachPlayer();sample();sendRnpStyle();
      if(playing&&clockValid&&!pendingSeek&&!playerTimelineFresh()){
        position=live();anchor=performance.now();clockValid=false;status='等待 网易云播放器 播放进度';sendClock();
      }
      refreshStatus();
    }catch(e){console.debug('[MiniLyrics] 状态同步暂不可用',e);}
    finally{
      send({type:'ping'});
      if(!stopped&&socket?.readyState===1){clearTimeout(timer);timer=setTimeout(tick,1000);}
    }
  }
  function resyncPage(){
    if(stopped)return;
    if(windowSession&&socket?.readyState!==1){queueReconnect(windowSession,0);return;}
    try{attachPlayer();sample();}catch(e){console.debug('[MiniLyrics] 恢复同步失败',e);}
  }
  function refreshStatus(){
    if(!statusView)return;
    const state=playerAdapter.getDiagnostics?.()?.streamState,labels={'waiting-player':'播放器未就绪','waiting-subscription':'等待播放器初始化','subscription-lost':'播放同步已中断','waiting-progress':'等待实际播放进度','events-filtered':'收到进度但未接受','progress-stalled':'播放进度已中断','progress-live':'进度正常','progress-paused':'播放已暂停'};
    const text=status+' · 进度：'+(labels[state]??(player?'网易云播放器':'等待 网易云播放器'))+' · '+Math.floor(live()/1000)+' 秒 · RNP 歌词 '+lines.length+' 行 · 小窗确认：'+(hostState?.lyricCount??'待回报');if(statusView.textContent!==text)statusView.textContent=text;
  }
  function connectSocket(port){
    const ws=new WebSocket(`ws://127.0.0.1:${port}/`);
    return new Promise(resolve=>{
      let settled=false;
      const finish=ok=>{if(settled)return;settled=true;clearTimeout(timeout);if(!ok)ws.close();resolve(ok?ws:null);};
      const timeout=setTimeout(()=>finish(false),800);
      ws.onopen=()=>finish(true);ws.onerror=()=>finish(false);ws.onclose=()=>finish(false);
    });
  }
  function retireSocket(ws,token){
    if(!ws)return;
    if(ws.readyState===1){ws.send(JSON.stringify({type:'hello',token}));ws.send(JSON.stringify({type:'exit'}));}
    ws.close();
  }
  async function retireHost(port,token){
    await new Promise(r=>setTimeout(r,200));
    try{retireSocket(await connectSocket(port),token);}catch{}
  }
  function retireWindow(own,ws=null){
    if(own.retired){ws?.close();return;}
    own.retired=true;
    if(ws)retireSocket(ws,own.token);else return retireHost(own.port,own.token);
  }
  const ownsWindow=own=>!stopped&&windowSession===own&&own.session===session;
  function rememberWindow(own){
    try{window.sessionStorage?.setItem('MiniLyrics.window',JSON.stringify({port:own.port,token:own.token}));}catch{}
  }
  function forgetWindow(){try{window.sessionStorage?.removeItem('MiniLyrics.window');}catch{}}
  function releaseConnection(){
    clearTimeout(timer);timer=null;clearSeek();playback.reset();
    position=live();anchor=performance.now();playing=false;clockValid=false;hostState=null;
    detachPlayer?.();detachPlayer=null;player=null;sourcePosition=null;sourcePlaying=null;sourceKind=null;
  }
  function windowClosed(own){
    if(!ownsWindow(own))return;
    windowSession=null;session++;busy=false;clearTimeout(reconnectTimer);reconnectTimer=null;forgetWindow();
    const previous=socket;socket=null;releaseConnection();previous?.close();
    status='小窗已关闭';refreshStatus();
  }
  function bindSocket(ws,own){
    if(!ownsWindow(own)){if(stopped)ws.close();else retireWindow(own,ws);return;}
    // Recover the actual snapshot before initializing the same host again.
    try{attachPlayer();sample();}catch(e){console.debug('[MiniLyrics] 等待播放状态恢复',e);}
    socket=ws;
    ws.onmessage=e=>{
      if(!ownsWindow(own)||socket!==ws)return;
      try{
        const m=JSON.parse(e.data);
        if(m.type==='lyrics-ack'||m.type==='host-state'||m.type==='background-state'){hostState=m;refreshStatus();}else command(m);
      }catch(err){console.debug('[MiniLyrics]',err);}
    };
    ws.onclose=e=>{
      if(!ownsWindow(own)||socket!==ws)return;
      if(e?.code===1000&&e?.reason==='host-closed'){windowClosed(own);return;}
      socket=null;releaseConnection();status='小窗连接中断，等待恢复';refreshStatus();queueReconnect(own);
    };
    rememberWindow(own);
    send({type:'hello',token:own.token});
    if(song.id){
      send({type:'track',...song});
      if(lastAppliedRnp)send({type:'lyrics',songId:song.id,revision:++lyricRevision,mode:lyricMode,lines});
      if(clockValid)sendClock();
    }
    sendFont();sendRnpStyle(true);sendBackground();
    status='已连接';tick();
  }
  function queueReconnect(own,delay=1000){
    if(!ownsWindow(own)||own.connecting||socket?.readyState===1)return;
    clearTimeout(reconnectTimer);
    reconnectTimer=setTimeout(async()=>{
      reconnectTimer=null;if(!ownsWindow(own)||socket?.readyState===1)return;
      own.connecting=true;let connected=false;
      try{
        const ws=await connectSocket(own.port);
        if(!ownsWindow(own)){if(stopped)ws?.close();else retireWindow(own,ws);return;}
        if(ws){bindSocket(ws,own);connected=socket===ws&&ws.readyState===1;}
      }catch(e){console.debug('[MiniLyrics] 等待小窗重新连接',e);}
      finally{own.connecting=false;if(ownsWindow(own)&&!connected)queueReconnect(own,2000);}
    },delay);
  }
  async function open(){
    if(stopped||busy)return;
    if(socket?.readyState===1){send({type:'show'});return;}
    if(windowSession){queueReconnect(windowSession,0);return;}
    busy=true;const ownSession=++session;
    const current=()=>!stopped&&ownSession===session;
    try{
      const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);
      const token=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
      const pluginPath=String(plugin.pluginPath??loadedPlugins.MiniLyrics?.pluginPath??'').replace(/\//g,'\\').replace(/\\\.\\/g,'\\');
      if(!pluginPath||/["\r\n]/.test(pluginPath))throw new Error('无法确定插件路径');
      const port=42000+Math.floor(Math.random()*6000),own={port,token,session:ownSession,connecting:true,launched:false};
      windowSession=own;
      const ok=await betterncm.app.exec('"'+pluginPath+'\\MiniLyricsHost.exe" --port '+port+' --token '+token,false,false);
      if(!current()){if(ok!==false&&!stopped)await retireWindow(own);return;}
      if(ok===false)throw new Error('原生窗口启动失败');
      own.launched=true;rememberWindow(own);
      for(let attempt=0;attempt<15;attempt++){
        await new Promise(r=>setTimeout(r,200));
        if(!current()){if(!stopped)await retireWindow(own);return;}
        const ws=await connectSocket(port);
        if(!current()){if(stopped)ws?.close();else await retireWindow(own,ws);return;}
        if(!ws)continue;
        own.connecting=false;bindSocket(ws,own);return;
      }
      own.connecting=false;status='小窗等待连接';refreshStatus();queueReconnect(own);
    }catch(e){
      if(current()){
        const own=windowSession;
        if(own?.launched){
          own.connecting=false;status='小窗等待恢复连接';queueReconnect(own);
        }else{windowSession=null;forgetWindow();status=String(e.message??e);}
        refreshStatus();console.error('[MiniLyrics]',e);
      }
    }finally{if(ownSession===session)busy=false;}
  }
  function closeWindow(){
    const own=windowSession,connected=socket?.readyState===1;
    session++;windowSession=null;busy=false;clearTimeout(reconnectTimer);reconnectTimer=null;forgetWindow();
    send({type:'exit'});const previous=socket;socket=null;releaseConnection();previous?.close();
    if(own&&!connected&&!own.connecting)retireWindow(own);
    status='小窗已关闭';refreshStatus();
  }
  function dispose(){
    // Page reload/unload is temporary bridge loss, not a user close request.
    if(windowSession)rememberWindow(windowSession);
    stopped=true;session++;busy=false;clearTimeout(reconnectTimer);reconnectTimer=null;
    const previous=socket;socket=null;releaseConnection();previous?.close();
    for(const [target,name,fn]of listeners)target.removeEventListener?.(name,fn);
    playerAdapter.dispose();
  }
  listen(document,'lyrics-updated',e=>{if(stopped)return;const update=e.detail??window.currentLyrics;cacheRnp(update);attachPlayer();sample(update);});
  // RNP persists this setting before dispatching the event. Share the reader
  // and signature with periodic recovery so the same style is sent only once.
  listen(document,'rnp-lyric-stagger',()=>sendRnpStyle());
  listen(document,'rnp-global-offset',e=>{offset=C.finite(e.detail);sendClock();});
  plugin.onLoad(()=>{
    try{offset=C.finite(window.localStorage?.getItem('refined-now-playing-lyric-offset'));}catch{}
    try{attachPlayer();sample();}catch(e){console.debug('[MiniLyrics] 等待播放信息',e);}
    try{
      const saved=JSON.parse(window.sessionStorage?.getItem('MiniLyrics.window')??'null');
      if(saved&&Number.isInteger(saved.port)&&saved.port>=42000&&saved.port<48000&&/^[0-9a-f]{48}$/.test(saved.token)){
        windowSession={port:saved.port,token:saved.token,session:++session,connecting:false};queueReconnect(windowSession,0);
      }
    }catch{}
  });
  plugin.onConfig(()=>{
    const el=document.createElement('div');el.style.cssText='padding:24px;line-height:1.8;max-width:700px';
    const title=document.createElement('h2');title.textContent='MiniLyrics 音乐小窗';el.append(title);
    for(const [text,fn]of [['打开 / 找回小窗',open],['退出鼠标穿透',()=>send({type:'unlock'})],['重置位置和尺寸',()=>send({type:'reset'})],['关闭小窗',closeWindow]]){
      const b=document.createElement('button');b.textContent=text;b.style.cssText='padding:8px 14px;margin:0 8px 12px 0';b.onclick=fn;el.append(b);}
    const p=document.createElement('p');p.textContent='拖动封面移动，右下角缩放；滚轮回看歌词，点击歌词跳转。右键小窗可调整翻译、置顶和帧率。';el.append(p);
    const fontHeading=document.createElement('h3');fontHeading.textContent='歌词字体';el.append(fontHeading);
    const fontRow=document.createElement('label');fontRow.style.cssText='display:block;margin:10px 0';fontRow.textContent='字号（14–36）';
    const fontInput=document.createElement('input');fontInput.type='number';fontInput.id='miniLyrics-font-size';fontInput.min='14';fontInput.max='36';fontInput.step='1';fontInput.value=String(fontSize);fontInput.style.cssText='width:72px;padding:5px 8px;margin-left:12px';fontInput.onchange=()=>{changeFontSize(fontInput.value);fontInput.value=String(fontSize);};
    const fontReset=document.createElement('button');fontReset.textContent='恢复默认';fontReset.style.cssText='margin-left:12px;padding:5px 10px';fontReset.onclick=()=>{changeFontSize(21);fontInput.value=String(fontSize);};fontRow.append(fontInput,fontReset);el.append(fontRow);
    const fontTip=document.createElement('p');fontTip.textContent='翻译和前后歌词按比例缩放。';el.append(fontTip);
    const heading=document.createElement('h3');heading.textContent='背景';el.append(heading);
    const makeSelect=(id,choices,value)=>{const control=document.createElement('select');control.id=id;control.style.cssText='padding:5px 8px;margin-left:12px';for(const [v,text]of choices){const option=document.createElement('option');option.value=String(v);option.textContent=text;control.append(option);}control.value=String(value);return control;};
    const addRow=(text,control)=>{const row=document.createElement('label');row.style.cssText='display:block;margin:10px 0';const label=document.createElement('span');label.textContent=text;row.append(label,control);el.append(row);};
    const mode=makeSelect('miniLyrics-background-mode',[[0,'现有渐变'],[1,'Lyricify · 标准'],[2,'Lyricify · 明显流动'],[3,'Lyricify · 暗色']],background.mode);
    const animated=document.createElement('input');animated.id='miniLyrics-background-animated';animated.type='checkbox';animated.checked=background.animated;animated.style.marginLeft='12px';
    const speed=makeSelect('miniLyrics-background-speed',[[.5,'慢速'],[1,'标准'],[2,'快速']],background.speed);
    const rate=makeSelect('miniLyrics-background-fps',[[10,'10 FPS'],[15,'15 FPS'],[30,'30 FPS'],[45,'45 FPS'],[60,'60 FPS（默认）']],background.fps);
    const refreshControls=()=>{animated.disabled=background.mode===0;speed.disabled=rate.disabled=background.mode===0||!background.animated;};
    mode.onchange=()=>{changeBackground({mode:Number(mode.value)});refreshControls();};
    animated.onchange=()=>{changeBackground({animated:animated.checked});refreshControls();};
    speed.onchange=()=>changeBackground({speed:Number(speed.value)});rate.onchange=()=>changeBackground({fps:Number(rate.value)});
    addRow('背景样式',mode);addRow('动态流动',animated);addRow('流动速度',speed);addRow('背景帧率',rate);refreshControls();
    const links=document.createElement('p');
    for(const [label,url]of [['源码与许可证','https://github.com/shoebillback/MiniLyrics'],['反馈问题','https://github.com/shoebillback/MiniLyrics/issues']]){
      const link=document.createElement('a');link.textContent=label;link.href=url;link.style.cssText='margin-right:18px';
      link.onclick=event=>{event.preventDefault();betterncm.ncm.openUrl(url);};links.append(link);
    }
    el.append(links);
    const s=document.createElement('p');statusView=s;refreshStatus();el.append(s);return el;
  });
  window.__miniLyrics={open,dispose,getStatus:()=>status,getDiagnostics:()=>({version:MINILYRICS_VERSION,status,songId:song.id,ncmId:song.ncmId,
    progressSource:player?'网易云播放器':'未同步',positionMs:live(),playing,valid:clockValid,lyricCount:lines.length,
    lyricMode,lyricSource:lyricMode==='waiting'?'等待 RNP':lyricMode==='empty'?'RNP 暂无歌词':'RNP 歌词',lyricRevision,rnpSongId:providerId(window.currentLyrics),
    host:hostState,playerVersion:player?.version??null,playerFresh:playerTimelineFresh(),playerDiagnostics:playerAdapter.getDiagnostics?.()??null,
    seekPending:!!pendingSeek,seekRequest:lastSeekId,playbackState:playback.snapshot(),background:{...background}})};
  listen(window,'rnp-lyric-page-opened',resyncPage);
  listen(window,'rnp-lyric-page-closed',resyncPage);
  listen(window,'focus',resyncPage);
  listen(document,'visibilitychange',resyncPage);
  listen(window,'beforeunload',dispose);
})();

})();