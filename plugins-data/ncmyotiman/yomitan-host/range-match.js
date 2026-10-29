/* Longest dictionary match strictly inside a user-selected range. MIT. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NcmYotimanRangeMatch=factory();})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 function entryLength(entry,query){let length=0;for(const headword of entry.headwords||[])for(const source of headword.sources||[])if(typeof source.originalText==='string'&&query.startsWith(source.originalText))length=Math.max(length,source.originalText.length);return length;}
 async function longest(query,find){
  if(!query||query.length>120)throw new Error('选区长度无效');
  let best={dictionaryEntries:[],offset:0,length:0,text:''};
  // Yomitan already checks all prefixes and inflections of each suffix. Skip
  // suffixes which cannot beat the best match, and never read past the range.
  for(let offset=0;offset<query.length;){
   if(query.length-offset<=best.length)break;
   const codepoint=String.fromCodePoint(query.codePointAt(offset));
   if(/[\u3040-\u30ff\u3400-\u9fff]/.test(codepoint)){
    const suffix=query.slice(offset),result=await find(suffix),entries=result.dictionaryEntries||[];
    const length=entries.reduce((n,entry)=>Math.max(n,entryLength(entry,suffix)),0);
    if(length>best.length)best={dictionaryEntries:entries.filter(entry=>entryLength(entry,suffix)===length),offset,length,text:suffix.slice(0,length)};
   }
   offset+=codepoint.length;
  }
  return best;
 }
 return {longest};
});
