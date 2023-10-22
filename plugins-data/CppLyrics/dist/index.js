(()=>{var ye=(e,t)=>{for(let r=e.length-1;r>=0;r--)if(t(e[r]))return e[r];return null},Pe=[{time:0,duration:594e4,originalLyric:"\u7EAF\u97F3\u4E50\uFF0C\u8BF7\u6B23\u8D4F"}];var Qt={};function xe(e,t){typeof e>"u"&&(e=""),typeof t>"u"&&(t="");let r=`${e}::${t}`;if(Qt[r]!==void 0)return Qt[r];let n=e.length,o=t.length,a=[];for(let s=0;s<=n;s++)a[s]=[],a[s][0]=s;for(let s=0;s<=o;s++)a[0][s]=s;for(let s=1;s<=n;s++)for(let i=1;i<=o;i++)e[s-1]===t[i-1]?a[s][i]=a[s-1][i-1]:a[s][i]=Math.min(a[s-1][i-1]+1,a[s][i-1]+1,a[s-1][i]+1);return a[n][o]}var be=e=>!!e.replace(/[\p{P}\p{S}]/gu,"").match(/^[\s\w\u00C0-\u024F]+$/u),te=e=>e.replace(/[‘’′]/g,"'").replace(/[“”″]/g,'"').replace(/（/g,"(").replace(/）/g,")").replace(/，/g,",").replace(/！/g,"!").replace(/？/g,"?").replace(/：/g,":").replace(/；/g,";");function zt(e,t="",r="",n=""){if(n.trim().length===0){let o=at(e).map(s=>({time:s.time,originalLyric:s.lyric,duration:0,...s.unsynced?{unsynced:!0}:{}}));at(t).forEach(s=>{let i=o.find(u=>u.time===s.time);i&&(i.translatedLyric=s.lyric)}),at(r).forEach(s=>{let i=o.find(u=>u.time===s.time);i&&(i.romanLyric=s.lyric)}),o.sort((s,i)=>s.time-i.time);let a=vt(o);for(let s=0;s<a.length;s++)s<a.length-1&&(a[s].duration=a[s+1].time-a[s].time);return vt(o)}else{let o=ke(n),a=at(e),s=d=>{let h="equal",f=new Set(d.map(b=>b.time)),m=new Set(a.map(b=>b.time));return new Set([...f].filter(b=>m.has(b))).size/f.size<.1&&(h="closest"),a.forEach(b=>{let y=null;h==="equal"?y=ye(d,x=>Math.abs(x.time-b.time)<20):d.forEach(x=>{y?Math.abs(y.time-b.time)>Math.abs(x.time-b.time)&&(y=x):y=x}),y&&(y.originalLyric=y.originalLyric||"",y.originalLyric.length>0&&(y.originalLyric+=" "),y.originalLyric+=b.lyric)}),d},i=(d,h)=>{d.forEach((f,m)=>{let g=0;o.forEach((A,I)=>{Math.abs(o[g].time-f.time)>Math.abs(A.time-f.time)&&(g=I)});let b=[g];for(let A=1;A<=5;A++)g-A>=0&&b.push(g-A),g+A<o.length&&b.push(g+A);b=b.reverse();let y=1e9;for(let A of b){let I=o[A],C=xe(f.originalLyric,I.originalLyric)*1e3+(I[h]?1:0);C<y&&(y=C,g=A)}let x=o[g];x[h]=x[h]||"",x[h].length>0&&(x[h]+=" "),x[h]+=f.lyric})},u=s(at(t)),p=s(at(r)),l=s(at(e));i(u,"translatedLyric"),i(p,"romanLyric"),i(l,"rawLyric");for(let d=0;d<o.length;d++){let h=o[d],f=o[d+1];if(h&&f&&h.originalLyric.trim().length>0&&f.originalLyric.trim().length>0&&h.duration>0){let m=(h?.dynamicLyricTime||h.time)+h.duration,g=f.time;f.dynamicLyricTime&&g>f.dynamicLyricTime&&(g=f.dynamicLyricTime),g-m>=5e3&&o.splice(d+1,0,{time:m,originalLyric:"",duration:g-m})}}for(let d=0;d<o.length;d++){let h=o[d],f=h.rawLyric?.trim()??"",m=h.dynamicLyric||[];for(let g=0;g<m.length;g++){let b=m[g].word.trimEnd();if(f.startsWith(b))f=f.substring(b.length);else break;let y=f.match(/^\s+/);y&&(f=f.substring(y[0].length),m[g].word.match(/\s$/)||(m[g].word+=" "))}}let P=/([\p{Unified_Ideograph}|\u3040-\u309F|\u30A0-\u30FF])/gu;for(let d=0;d<o.length;d++){let f=o[d].dynamicLyric||[];for(let m=0;m<f.length;m++)f[m]?.word?.match(P)&&(f[m].isCJK=!0),f[m]?.word?.match(/\s$/)&&(f[m].endsWithSpace=!0)}for(let d=0;d<o.length;d++){let f=o[d].dynamicLyric||[],m=[-1];for(let g=0;g<f.length-1;g++)(f[g]?.endsWithSpace||f[g]?.word?.match(/[\,\.\，\。\!\?\？\、\；\：\…\—\~\～\·\‘\’\“\”\ﾞ]/))&&(f[g]?.word?.match(/[a-zA-Z]+(\'\‘\’)*[a-zA-Z]*/)||m.push(g));m.push(f.length-1);for(let g=m.length-1;g>=1;g--){let b=null;for(let x=m[g];x>m[g-1];x--){let A=f[x].word.trim();if(!A.match(/[\p{P}\p{S}]/gu)&&!A.match(/^\s*$/)){b=x;break}}if(b===null)continue;let y=f[b];y.duration>=1e3&&(y.trailing=!0)}}return vt(o)}}var Ce=/^\[(?<time>[0-9]+),(?<duration>[0-9]+)\](?<line>.*)/,Me=/^\((?<time>[0-9]+),(?<duration>[0-9]+),(?<flag>[0-9]+)\)(?<word>[^\(]*)/,Ae=/^\[((?<min>[0-9]+):)?(?<sec>[0-9]+([\.:]([0-9]+))?)\]/,Ie=/^\[((?<min>[0-9]+):)?(?<sec>[0-9]+([\.:]([0-9]+))?)\-(?<discriminator>[0-9]+)\]/;function at(e){let t=[];for(let r of e.split(`
`)){let n=r.trim(),o=[];for(;;){let a=n.match(Ae);if(a){let s=Number(a.groups?.min||"0"),i=Number(a.groups?.sec.replace(/:/,".")||"0");o.push(Math.floor((s*60+i)*1e3)),n=n.slice(0,a.index)+n.slice((a.index||0)+a[0].length),n=n.trim()}else break}n=n.trim();for(let a of o)t.push({time:a,lyric:n})}return t.length===0&&e.trim().length>0?we(e):t.sort((r,n)=>r.time-n.time)}function we(e){let t=[];for(let r of e.split(`
`)){let n=r.trim();n.length&&(n.match(Ie)||t.push({time:999999999,lyric:n,unsynced:!0}))}return t.length&&t.unshift({time:0,lyric:"\u6B4C\u8BCD\u4E0D\u652F\u6301\u6EDA\u52A8",unsynced:!0}),t}function ke(e){let t=[];for(let r of e.trim().split(`
`)){let n=r.trim(),o=n.match(Ce);if(o){let a=parseInt(o.groups?.time||"0"),s=parseInt(o.groups?.duration||"0");n=o.groups?.line||"";let i=[];for(;n.length>0;){let p=n.match(Me);if(p){let l=parseInt(p.groups?.time||"0"),P=parseInt(p.groups?.duration||"0"),d=parseInt(p.groups?.flag||"0"),h=p.groups?.word.trimStart(),f=h?.split(/\s+/).filter(m=>m.trim().length>0);if(f){let m=P/f.length;f.forEach((g,b)=>{b===f.length-1?/\s/.test((h??"")[(h??"").length-1])?i.push({time:l+b*m,duration:m,flag:d,word:`${g.trimStart()} `}):i.push({time:l+b*m,duration:m,flag:d,word:g.trimStart()}):b===0?/\s/.test((h??"")[0])?i.push({time:l+b*m,duration:m,flag:d,word:` ${g.trimStart()}`}):i.push({time:l+b*m,duration:m,flag:d,word:g.trimStart()}):i.push({time:l+b*m,duration:m,flag:d,word:`${g.trimStart()} `})})}n=n.slice(p.index||0+p[0].length)}else break}let u={time:a,duration:s,originalLyric:i.map(p=>p.word).join(""),dynamicLyric:i,dynamicLyricTime:a};t.push(u)}}return t.sort((r,n)=>r.time-n.time)}function vt(e){if(e.length>0&&e[e.length-1].time===594e4&&e[e.length-1].duration===0)return Pe;let t=[],r=!1;for(e.forEach((n,o,a)=>{if(n.originalLyric.trim().length===0){let s=a[o+1];s&&s.time-n.time>5e3&&!r&&(t.push(n),r=!0)}else r=!1,t.push(n)});t[0]?.originalLyric.length===0;)t.shift();t[0]?.time>5e3&&t.unshift({time:500,duration:t[0]?.time-500,originalLyric:""});for(let n=0;n<t.length;n++){let o=t[n];if(be(o?.originalLyric)){if(o?.dynamicLyric)for(let a=0;a<o.dynamicLyric.length;a++)o.dynamicLyric[a].word=te(o.dynamicLyric[a].word);o?.originalLyric&&(o.originalLyric=te(o.originalLyric))}}return t}var De=(e,t=0)=>{let r=3735928559^t,n=1103547991^t;for(let o=0,a;o<e.length;o++)a=e.charCodeAt(o),r=Math.imul(r^a,2654435761),n=Math.imul(n^a,1597334677);return r=Math.imul(r^r>>>16,2246822507)^Math.imul(n^n>>>13,3266489909),n=Math.imul(n^n>>>16,2246822507)^Math.imul(r^r>>>13,3266489909),4294967296*(2097151&n)+(r>>>0)},ee=window.onProcessLyrics||(()=>{}),Le=e=>{for(let t of e)t.originalLyric==""&&(t.isInterlude=!0);return e},Te=e=>{if(!e)return null;e.lrc||(e.lrc={});let t=(e?.lrc?.lyric??"").replace(/\u3000/g," "),r=e?.ytlrc?.lyric??e?.ttlrc?.lyric??e?.tlyric?.lyric??"",n=e?.yromalrc?.lyric??e?.romalrc?.lyric??"",o=e?.yrc?.lyric??"",a=t.match(/\[(.*?)\]/g)?.length??0,s=zt(t,r,n,o);return a-s.length>a*.7?zt(t,r,n):s},re=null;window.onProcessLyrics=(e,t)=>{if(!e||e?.data===-400)return ee(e,t);let r=e;if(typeof e=="string"&&(r={lrc:{lyric:e},source:{name:"\u672C\u5730"}}),(r?.lrc?.lyric??"")!=re){console.log("Update Raw Lyrics",r),re=r?.lrc?.lyric??"";let n=Te(r);setTimeout(async()=>{let o=await Le(n),a={lyrics:o,contributors:{}};o[0]?.unsynced&&(a.unsynced=!0),r?.lyricUser&&(a.contributors.original={name:r.lyricUser.nickname,userid:r.lyricUser.userid}),r?.transUser&&(a.contributors.translation={name:r.transUser.nickname,userid:r.transUser.userid}),a.contributors.roles=r?.roles??[],a.contributors.roles=a.contributors.roles.filter(s=>!(s.artistMetaList.length==1&&s.artistMetaList[0].artistName=="\u65E0"&&s.artistMetaList[0].artistId==0));for(let s=0;s<a.contributors.roles.length;s++){let i=JSON.stringify(a.contributors.roles[s].artistMetaList);for(let u=s+1;u<a.contributors.roles.length;u++)JSON.stringify(a.contributors.roles[u].artistMetaList)===i&&(a.contributors.roles[s].roleName+=`\u3001${a.contributors.roles[u].roleName}`,a.contributors.roles.splice(u,1),u--)}r?.source&&(a.contributors.lyricSource=r.source),a.hash=`${betterncm.ncm.getPlaying().id}-${De(o.map(s=>s.originalLyric).join("\\"))}`,window.currentLyrics=a,console.group("Update Processed Lyrics"),console.log("lyrics",window.currentLyrics.lyrics),console.log("contributors",window.currentLyrics.contributors),console.log("hash",window.currentLyrics.hash),console.groupEnd(),document.dispatchEvent(new CustomEvent("lyrics-updated",{detail:window.currentLyrics}))},0)}return ee(e,t)};function H(e){return e<0?-1:e===0?0:1}function st(e,t,r){return(1-r)*e+r*t}function ne(e,t,r){return r<e?e:r>t?t:r}function ct(e,t,r){return r<e?e:r>t?t:r}function At(e){return e=e%360,e<0&&(e=e+360),e}function $(e){return e=e%360,e<0&&(e=e+360),e}function oe(e,t){return $(t-e)<=180?1:-1}function It(e,t){return 180-Math.abs(Math.abs(e-t)-180)}function ht(e,t){let r=e[0]*t[0][0]+e[1]*t[0][1]+e[2]*t[0][2],n=e[0]*t[1][0]+e[1]*t[1][1]+e[2]*t[1][2],o=e[0]*t[2][0]+e[1]*t[2][1]+e[2]*t[2][2];return[r,n,o]}var ae=[[.41233895,.35762064,.18051042],[.2126,.7152,.0722],[.01932141,.11916382,.95034478]],Se=[[3.2413774792388685,-1.5376652402851851,-.49885366846268053],[-.9691452513005321,1.8758853451067872,.04156585616912061],[.05562093689691305,-.20395524564742123,1.0571799111220335]],Nt=[95.047,100,108.883];function ft(e,t,r){return(255<<24|(e&255)<<16|(t&255)<<8|r&255)>>>0}function Ut(e){let t=it(e[0]),r=it(e[1]),n=it(e[2]);return ft(t,r,n)}function se(e){return e>>24&255}function et(e){return e>>16&255}function rt(e){return e>>8&255}function nt(e){return e&255}function Vt(e,t,r){let n=Se,o=n[0][0]*e+n[0][1]*t+n[0][2]*r,a=n[1][0]*e+n[1][1]*t+n[1][2]*r,s=n[2][0]*e+n[2][1]*t+n[2][2]*r,i=it(o),u=it(a),p=it(s);return ft(i,u,p)}function Fe(e){let t=Z(et(e)),r=Z(rt(e)),n=Z(nt(e));return ht([t,r,n],ae)}function ie(e,t,r){let n=Nt,o=(e+16)/116,a=t/500+o,s=o-r/200,i=wt(a),u=wt(o),p=wt(s),l=i*n[0],P=u*n[1],d=p*n[2];return Vt(l,P,d)}function _t(e){let t=Z(et(e)),r=Z(rt(e)),n=Z(nt(e)),o=ae,a=o[0][0]*t+o[0][1]*r+o[0][2]*n,s=o[1][0]*t+o[1][1]*r+o[1][2]*n,i=o[2][0]*t+o[2][1]*r+o[2][2]*n,u=Nt,p=a/u[0],l=s/u[1],P=i/u[2],d=mt(p),h=mt(l),f=mt(P),m=116*h-16,g=500*(d-h),b=200*(h-f);return[m,g,b]}function ce(e){let t=Y(e),r=it(t);return ft(r,r,r)}function pt(e){let t=Fe(e)[1];return 116*mt(t/100)-16}function Y(e){return 100*wt((e+16)/116)}function dt(e){return mt(e/100)*116-16}function Z(e){let t=e/255;return t<=.040449936?t/12.92*100:Math.pow((t+.055)/1.055,2.4)*100}function it(e){let t=e/100,r=0;return t<=.0031308?r=t*12.92:r=1.055*Math.pow(t,1/2.4)-.055,ne(0,255,Math.round(r*255))}function le(){return Nt}function mt(e){let t=.008856451679035631,r=24389/27;return e>t?Math.pow(e,1/3):(r*e+16)/116}function wt(e){let t=.008856451679035631,r=24389/27,n=e*e*e;return n>t?n:(116*e-16)/r}var v=class e{static make(t=le(),r=200/Math.PI*Y(50)/100,n=50,o=2,a=!1){let s=t,i=s[0]*.401288+s[1]*.650173+s[2]*-.051461,u=s[0]*-.250268+s[1]*1.204414+s[2]*.045854,p=s[0]*-.002079+s[1]*.048952+s[2]*.953127,l=.8+o/10,P=l>=.9?st(.59,.69,(l-.9)*10):st(.525,.59,(l-.8)*10),d=a?1:l*(1-1/3.6*Math.exp((-r-42)/92));d=d>1?1:d<0?0:d;let h=l,f=[d*(100/i)+1-d,d*(100/u)+1-d,d*(100/p)+1-d],m=1/(5*r+1),g=m*m*m*m,b=1-g,y=g*r+.1*b*b*Math.cbrt(5*r),x=Y(n)/t[1],A=1.48+Math.sqrt(x),I=.725/Math.pow(x,.2),S=I,C=[Math.pow(y*f[0]*i/100,.42),Math.pow(y*f[1]*u/100,.42),Math.pow(y*f[2]*p/100,.42)],w=[400*C[0]/(C[0]+27.13),400*C[1]/(C[1]+27.13),400*C[2]/(C[2]+27.13)],T=(2*w[0]+w[1]+.05*w[2])*I;return new e(x,T,I,S,P,h,f,y,Math.pow(y,.25),A)}constructor(t,r,n,o,a,s,i,u,p,l){this.n=t,this.aw=r,this.nbb=n,this.ncb=o,this.c=a,this.nc=s,this.rgbD=i,this.fl=u,this.fLRoot=p,this.z=l}};v.DEFAULT=v.make();var z=class e{constructor(t,r,n,o,a,s,i,u,p){this.hue=t,this.chroma=r,this.j=n,this.q=o,this.m=a,this.s=s,this.jstar=i,this.astar=u,this.bstar=p}distance(t){let r=this.jstar-t.jstar,n=this.astar-t.astar,o=this.bstar-t.bstar,a=Math.sqrt(r*r+n*n+o*o);return 1.41*Math.pow(a,.63)}static fromInt(t){return e.fromIntInViewingConditions(t,v.DEFAULT)}static fromIntInViewingConditions(t,r){let n=(t&16711680)>>16,o=(t&65280)>>8,a=t&255,s=Z(n),i=Z(o),u=Z(a),p=.41233895*s+.35762064*i+.18051042*u,l=.2126*s+.7152*i+.0722*u,P=.01932141*s+.11916382*i+.95034478*u,d=.401288*p+.650173*l-.051461*P,h=-.250268*p+1.204414*l+.045854*P,f=-.002079*p+.048952*l+.953127*P,m=r.rgbD[0]*d,g=r.rgbD[1]*h,b=r.rgbD[2]*f,y=Math.pow(r.fl*Math.abs(m)/100,.42),x=Math.pow(r.fl*Math.abs(g)/100,.42),A=Math.pow(r.fl*Math.abs(b)/100,.42),I=H(m)*400*y/(y+27.13),S=H(g)*400*x/(x+27.13),C=H(b)*400*A/(A+27.13),w=(11*I+-12*S+C)/11,T=(I+S-2*C)/9,L=(20*I+20*S+21*C)/20,O=(40*I+20*S+C)/20,G=Math.atan2(T,w)*180/Math.PI,R=G<0?G+360:G>=360?G-360:G,ot=R*Math.PI/180,bt=O*r.nbb,tt=100*Math.pow(bt/r.aw,r.c*r.z),Ct=4/r.c*Math.sqrt(tt/100)*(r.aw+4)*r.fLRoot,Rt=R<20.14?R+360:R,Et=.25*(Math.cos(Rt*Math.PI/180+2)+3.8),Ot=5e4/13*Et*r.nc*r.ncb*Math.sqrt(w*w+T*T)/(L+.305),Mt=Math.pow(Ot,.9)*Math.pow(1.64-Math.pow(.29,r.n),.73),Xt=Mt*Math.sqrt(tt/100),Kt=Xt*r.fLRoot,fe=50*Math.sqrt(Mt*r.c/(r.aw+4)),pe=(1+100*.007)*tt/(1+.007*tt),Zt=1/.0228*Math.log(1+.0228*Kt),de=Zt*Math.cos(ot),ge=Zt*Math.sin(ot);return new e(R,Xt,tt,Ct,Kt,fe,pe,de,ge)}static fromJch(t,r,n){return e.fromJchInViewingConditions(t,r,n,v.DEFAULT)}static fromJchInViewingConditions(t,r,n,o){let a=4/o.c*Math.sqrt(t/100)*(o.aw+4)*o.fLRoot,s=r*o.fLRoot,i=r/Math.sqrt(t/100),u=50*Math.sqrt(i*o.c/(o.aw+4)),p=n*Math.PI/180,l=(1+100*.007)*t/(1+.007*t),P=1/.0228*Math.log(1+.0228*s),d=P*Math.cos(p),h=P*Math.sin(p);return new e(n,r,t,a,s,u,l,d,h)}static fromUcs(t,r,n){return e.fromUcsInViewingConditions(t,r,n,v.DEFAULT)}static fromUcsInViewingConditions(t,r,n,o){let a=r,s=n,i=Math.sqrt(a*a+s*s),p=(Math.exp(i*.0228)-1)/.0228/o.fLRoot,l=Math.atan2(s,a)*(180/Math.PI);l<0&&(l+=360);let P=t/(1-(t-100)*.007);return e.fromJchInViewingConditions(P,p,l,o)}toInt(){return this.viewed(v.DEFAULT)}viewed(t){let r=this.chroma===0||this.j===0?0:this.chroma/Math.sqrt(this.j/100),n=Math.pow(r/Math.pow(1.64-Math.pow(.29,t.n),.73),1/.9),o=this.hue*Math.PI/180,a=.25*(Math.cos(o+2)+3.8),s=t.aw*Math.pow(this.j/100,1/t.c/t.z),i=a*(5e4/13)*t.nc*t.ncb,u=s/t.nbb,p=Math.sin(o),l=Math.cos(o),P=23*(u+.305)*n/(23*i+11*n*l+108*n*p),d=P*l,h=P*p,f=(460*u+451*d+288*h)/1403,m=(460*u-891*d-261*h)/1403,g=(460*u-220*d-6300*h)/1403,b=Math.max(0,27.13*Math.abs(f)/(400-Math.abs(f))),y=H(f)*(100/t.fl)*Math.pow(b,1/.42),x=Math.max(0,27.13*Math.abs(m)/(400-Math.abs(m))),A=H(m)*(100/t.fl)*Math.pow(x,1/.42),I=Math.max(0,27.13*Math.abs(g)/(400-Math.abs(g))),S=H(g)*(100/t.fl)*Math.pow(I,1/.42),C=y/t.rgbD[0],w=A/t.rgbD[1],T=S/t.rgbD[2],L=1.86206786*C-1.01125463*w+.14918677*T,O=.38752654*C+.62144744*w-.00897398*T,q=-.0158415*C-.03412294*w+1.04996444*T;return Vt(L,O,q)}static fromXyzInViewingConditions(t,r,n,o){let a=.401288*t+.650173*r-.051461*n,s=-.250268*t+1.204414*r+.045854*n,i=-.002079*t+.048952*r+.953127*n,u=o.rgbD[0]*a,p=o.rgbD[1]*s,l=o.rgbD[2]*i,P=Math.pow(o.fl*Math.abs(u)/100,.42),d=Math.pow(o.fl*Math.abs(p)/100,.42),h=Math.pow(o.fl*Math.abs(l)/100,.42),f=H(u)*400*P/(P+27.13),m=H(p)*400*d/(d+27.13),g=H(l)*400*h/(h+27.13),b=(11*f+-12*m+g)/11,y=(f+m-2*g)/9,x=(20*f+20*m+21*g)/20,A=(40*f+20*m+g)/20,S=Math.atan2(y,b)*180/Math.PI,C=S<0?S+360:S>=360?S-360:S,w=C*Math.PI/180,T=A*o.nbb,L=100*Math.pow(T/o.aw,o.c*o.z),O=4/o.c*Math.sqrt(L/100)*(o.aw+4)*o.fLRoot,q=C<20.14?C+360:C,G=1/4*(Math.cos(q*Math.PI/180+2)+3.8),ot=5e4/13*G*o.nc*o.ncb*Math.sqrt(b*b+y*y)/(x+.305),bt=Math.pow(ot,.9)*Math.pow(1.64-Math.pow(.29,o.n),.73),tt=bt*Math.sqrt(L/100),Ct=tt*o.fLRoot,Rt=50*Math.sqrt(bt*o.c/(o.aw+4)),Et=(1+100*.007)*L/(1+.007*L),Ht=Math.log(1+.0228*Ct)/.0228,Ot=Ht*Math.cos(w),Mt=Ht*Math.sin(w);return new e(C,tt,L,O,Ct,Rt,Et,Ot,Mt)}xyzInViewingConditions(t){let r=this.chroma===0||this.j===0?0:this.chroma/Math.sqrt(this.j/100),n=Math.pow(r/Math.pow(1.64-Math.pow(.29,t.n),.73),1/.9),o=this.hue*Math.PI/180,a=.25*(Math.cos(o+2)+3.8),s=t.aw*Math.pow(this.j/100,1/t.c/t.z),i=a*(5e4/13)*t.nc*t.ncb,u=s/t.nbb,p=Math.sin(o),l=Math.cos(o),P=23*(u+.305)*n/(23*i+11*n*l+108*n*p),d=P*l,h=P*p,f=(460*u+451*d+288*h)/1403,m=(460*u-891*d-261*h)/1403,g=(460*u-220*d-6300*h)/1403,b=Math.max(0,27.13*Math.abs(f)/(400-Math.abs(f))),y=H(f)*(100/t.fl)*Math.pow(b,1/.42),x=Math.max(0,27.13*Math.abs(m)/(400-Math.abs(m))),A=H(m)*(100/t.fl)*Math.pow(x,1/.42),I=Math.max(0,27.13*Math.abs(g)/(400-Math.abs(g))),S=H(g)*(100/t.fl)*Math.pow(I,1/.42),C=y/t.rgbD[0],w=A/t.rgbD[1],T=S/t.rgbD[2],L=1.86206786*C-1.01125463*w+.14918677*T,O=.38752654*C+.62144744*w-.00897398*T,q=-.0158415*C-.03412294*w+1.04996444*T;return[L,O,q]}};var J=class e{static sanitizeRadians(t){return(t+Math.PI*8)%(Math.PI*2)}static trueDelinearized(t){let r=t/100,n=0;return r<=.0031308?n=r*12.92:n=1.055*Math.pow(r,1/2.4)-.055,n*255}static chromaticAdaptation(t){let r=Math.pow(Math.abs(t),.42);return H(t)*400*r/(r+27.13)}static hueOf(t){let r=ht(t,e.SCALED_DISCOUNT_FROM_LINRGB),n=e.chromaticAdaptation(r[0]),o=e.chromaticAdaptation(r[1]),a=e.chromaticAdaptation(r[2]),s=(11*n+-12*o+a)/11,i=(n+o-2*a)/9;return Math.atan2(i,s)}static areInCyclicOrder(t,r,n){let o=e.sanitizeRadians(r-t),a=e.sanitizeRadians(n-t);return o<a}static intercept(t,r,n){return(r-t)/(n-t)}static lerpPoint(t,r,n){return[t[0]+(n[0]-t[0])*r,t[1]+(n[1]-t[1])*r,t[2]+(n[2]-t[2])*r]}static setCoordinate(t,r,n,o){let a=e.intercept(t[o],r,n[o]);return e.lerpPoint(t,a,n)}static isBounded(t){return 0<=t&&t<=100}static nthVertex(t,r){let n=e.Y_FROM_LINRGB[0],o=e.Y_FROM_LINRGB[1],a=e.Y_FROM_LINRGB[2],s=r%4<=1?0:100,i=r%2===0?0:100;if(r<4){let u=s,p=i,l=(t-u*o-p*a)/n;return e.isBounded(l)?[l,u,p]:[-1,-1,-1]}else if(r<8){let u=s,p=i,l=(t-p*n-u*a)/o;return e.isBounded(l)?[p,l,u]:[-1,-1,-1]}else{let u=s,p=i,l=(t-u*n-p*o)/a;return e.isBounded(l)?[u,p,l]:[-1,-1,-1]}}static bisectToSegment(t,r){let n=[-1,-1,-1],o=n,a=0,s=0,i=!1,u=!0;for(let p=0;p<12;p++){let l=e.nthVertex(t,p);if(l[0]<0)continue;let P=e.hueOf(l);if(!i){n=l,o=l,a=P,s=P,i=!0;continue}(u||e.areInCyclicOrder(a,P,s))&&(u=!1,e.areInCyclicOrder(a,r,P)?(o=l,s=P):(n=l,a=P))}return[n,o]}static midpoint(t,r){return[(t[0]+r[0])/2,(t[1]+r[1])/2,(t[2]+r[2])/2]}static criticalPlaneBelow(t){return Math.floor(t-.5)}static criticalPlaneAbove(t){return Math.ceil(t-.5)}static bisectToLimit(t,r){let n=e.bisectToSegment(t,r),o=n[0],a=e.hueOf(o),s=n[1];for(let i=0;i<3;i++)if(o[i]!==s[i]){let u=-1,p=255;o[i]<s[i]?(u=e.criticalPlaneBelow(e.trueDelinearized(o[i])),p=e.criticalPlaneAbove(e.trueDelinearized(s[i]))):(u=e.criticalPlaneAbove(e.trueDelinearized(o[i])),p=e.criticalPlaneBelow(e.trueDelinearized(s[i])));for(let l=0;l<8&&!(Math.abs(p-u)<=1);l++){let P=Math.floor((u+p)/2),d=e.CRITICAL_PLANES[P],h=e.setCoordinate(o,d,s,i),f=e.hueOf(h);e.areInCyclicOrder(a,r,f)?(s=h,p=P):(o=h,a=f,u=P)}}return e.midpoint(o,s)}static inverseChromaticAdaptation(t){let r=Math.abs(t),n=Math.max(0,27.13*r/(400-r));return H(t)*Math.pow(n,1/.42)}static findResultByJ(t,r,n){let o=Math.sqrt(n)*11,a=v.DEFAULT,s=1/Math.pow(1.64-Math.pow(.29,a.n),.73),u=.25*(Math.cos(t+2)+3.8)*(5e4/13)*a.nc*a.ncb,p=Math.sin(t),l=Math.cos(t);for(let P=0;P<5;P++){let d=o/100,h=r===0||o===0?0:r/Math.sqrt(d),f=Math.pow(h*s,1/.9),g=a.aw*Math.pow(d,1/a.c/a.z)/a.nbb,b=23*(g+.305)*f/(23*u+11*f*l+108*f*p),y=b*l,x=b*p,A=(460*g+451*y+288*x)/1403,I=(460*g-891*y-261*x)/1403,S=(460*g-220*y-6300*x)/1403,C=e.inverseChromaticAdaptation(A),w=e.inverseChromaticAdaptation(I),T=e.inverseChromaticAdaptation(S),L=ht([C,w,T],e.LINRGB_FROM_SCALED_DISCOUNT);if(L[0]<0||L[1]<0||L[2]<0)return 0;let O=e.Y_FROM_LINRGB[0],q=e.Y_FROM_LINRGB[1],G=e.Y_FROM_LINRGB[2],R=O*L[0]+q*L[1]+G*L[2];if(R<=0)return 0;if(P===4||Math.abs(R-n)<.002)return L[0]>100.01||L[1]>100.01||L[2]>100.01?0:Ut(L);o=o-(R-n)*o/(2*R)}return 0}static solveToInt(t,r,n){if(r<1e-4||n<1e-4||n>99.9999)return ce(n);t=$(t);let o=t/180*Math.PI,a=Y(n),s=e.findResultByJ(o,r,a);if(s!==0)return s;let i=e.bisectToLimit(a,o);return Ut(i)}static solveToCam(t,r,n){return z.fromInt(e.solveToInt(t,r,n))}};J.SCALED_DISCOUNT_FROM_LINRGB=[[.001200833568784504,.002389694492170889,.0002795742885861124],[.0005891086651375999,.0029785502573438758,.0003270666104008398],[.00010146692491640572,.0005364214359186694,.0032979401770712076]];J.LINRGB_FROM_SCALED_DISCOUNT=[[1373.2198709594231,-1100.4251190754821,-7.278681089101213],[-271.815969077903,559.6580465940733,-32.46047482791194],[1.9622899599665666,-57.173814538844006,308.7233197812385]];J.Y_FROM_LINRGB=[.2126,.7152,.0722];J.CRITICAL_PLANES=[.015176349177441876,.045529047532325624,.07588174588720938,.10623444424209313,.13658714259697685,.16693984095186062,.19729253930674434,.2276452376616281,.2579979360165119,.28835063437139563,.3188300904430532,.350925934958123,.3848314933096426,.42057480301049466,.458183274052838,.4976837250274023,.5391024159806381,.5824650784040898,.6277969426914107,.6751227633498623,.7244668422128921,.775853049866786,.829304845476233,.8848452951698498,.942497089126609,1.0022825574869039,1.0642236851973577,1.1283421258858297,1.1946592148522128,1.2631959812511864,1.3339731595349034,1.407011200216447,1.4823302800086415,1.5599503113873272,1.6398909516233677,1.7221716113234105,1.8068114625156377,1.8938294463134073,1.9832442801866852,2.075074464868551,2.1693382909216234,2.2660538449872063,2.36523901573795,2.4669114995532007,2.5710888059345764,2.6777882626779785,2.7870270208169257,2.898822059350997,3.0131901897720907,3.1301480604002863,3.2497121605402226,3.3718988244681087,3.4967242352587946,3.624204428461639,3.754355295633311,3.887192587735158,4.022731918402185,4.160988767090289,4.301978482107941,4.445716283538092,4.592217266055746,4.741496401646282,4.893568542229298,5.048448422192488,5.20615066083972,5.3666897647573375,5.5300801301023865,5.696336044816294,5.865471690767354,6.037501145825082,6.212438385869475,6.390297286737924,6.571091626112461,6.7548350853498045,6.941541251256611,7.131223617812143,7.323895587840543,7.5195704746346665,7.7182615035334345,7.919981813454504,8.124744458384042,8.332562408825165,8.543448553206703,8.757415699253682,8.974476575321063,9.194643831691977,9.417930041841839,9.644347703669503,9.873909240696694,10.106627003236781,10.342513269534024,10.58158024687427,10.8238400726681,11.069304815507364,11.317986476196008,11.569896988756009,11.825048221409341,12.083451977536606,12.345119996613247,12.610063955123938,12.878295467455942,13.149826086772048,13.42466730586372,13.702830557985108,13.984327217668513,14.269168601521828,14.55736596900856,14.848930523210871,15.143873411576273,15.44220572664832,15.743938506781891,16.04908273684337,16.35764934889634,16.66964922287304,16.985093187232053,17.30399201960269,17.62635644741625,17.95219714852476,18.281524751807332,18.614349837764564,18.95068293910138,19.290534541298456,19.633915083172692,19.98083495742689,20.331304511189067,20.685334046541502,21.042933821039977,21.404114048223256,21.76888489811322,22.137256497705877,22.50923893145328,22.884842241736916,23.264076429332462,23.6469514538663,24.033477234264016,24.42366364919083,24.817520537484558,25.21505769858089,25.61628489293138,26.021211842414342,26.429848230738664,26.842203703840827,27.258287870275353,27.678110301598522,28.10168053274597,28.529008062403893,28.96010235337422,29.39497283293396,29.83362889318845,30.276079891419332,30.722335150426627,31.172403958865512,31.62629557157785,32.08401920991837,32.54558406207592,33.010999283389665,33.4802739966603,33.953417292456834,34.430438229418264,34.911345834551085,35.39614910352207,35.88485700094671,36.37747846067349,36.87402238606382,37.37449765026789,37.87891309649659,38.38727753828926,38.89959975977785,39.41588851594697,39.93615253289054,40.460400508064545,40.98864111053629,41.520882981230194,42.05713473317016,42.597404951718396,43.141702194811224,43.6900349931913,44.24241185063697,44.798841244188324,45.35933162437017,45.92389141541209,46.49252901546552,47.065252796817916,47.64207110610409,48.22299226451468,48.808024568002054,49.3971762874833,49.9904556690408,50.587870934119984,51.189430279724725,51.79514187861014,52.40501387947288,53.0190544071392,53.637271562750364,54.259673423945976,54.88626804504493,55.517063457223934,56.15206766869424,56.79128866487574,57.43473440856916,58.08241284012621,58.734331877617365,59.39049941699807,60.05092333227251,60.715611475655585,61.38457167773311,62.057811747619894,62.7353394731159,63.417162620860914,64.10328893648692,64.79372614476921,65.48848194977529,66.18756403501224,66.89098006357258,67.59873767827808,68.31084450182222,69.02730813691093,69.74813616640164,70.47333615344107,71.20291564160104,71.93688215501312,72.67524319850172,73.41800625771542,74.16517879925733,74.9167682708136,75.67278210128072,76.43322770089146,77.1981124613393,77.96744375590167,78.74122893956174,79.51947534912904,80.30219030335869,81.08938110306934,81.88105503125999,82.67721935322541,83.4778813166706,84.28304815182372,85.09272707154808,85.90692527145302,86.72564993000343,87.54890820862819,88.3767072518277,89.2090541872801,90.04595612594655,90.88742016217518,91.73345337380438,92.58406282226491,93.43925555268066,94.29903859396902,95.16341895893969,96.03240364439274,96.9059996312159,97.78421388448044,98.6670533535366,99.55452497210776];var F=class e{static from(t,r,n){return new e(J.solveToInt(t,r,n))}static fromInt(t){return new e(t)}toInt(){return this.argb}get hue(){return this.internalHue}set hue(t){this.setInternalState(J.solveToInt(t,this.internalChroma,this.internalTone))}get chroma(){return this.internalChroma}set chroma(t){this.setInternalState(J.solveToInt(this.internalHue,t,this.internalTone))}get tone(){return this.internalTone}set tone(t){this.setInternalState(J.solveToInt(this.internalHue,this.internalChroma,t))}constructor(t){this.argb=t;let r=z.fromInt(t);this.internalHue=r.hue,this.internalChroma=r.chroma,this.internalTone=pt(t),this.argb=t}setInternalState(t){let r=z.fromInt(t);this.internalHue=r.hue,this.internalChroma=r.chroma,this.internalTone=pt(t),this.argb=t}inViewingConditions(t){let n=z.fromInt(this.toInt()).xyzInViewingConditions(t),o=z.fromXyzInViewingConditions(n[0],n[1],n[2],v.make());return e.from(o.hue,o.chroma,dt(n[1]))}};var kt=class e{static harmonize(t,r){let n=F.fromInt(t),o=F.fromInt(r),a=It(n.hue,o.hue),s=Math.min(a*.5,15),i=$(n.hue+s*oe(n.hue,o.hue));return F.from(i,n.chroma,n.tone).toInt()}static hctHue(t,r,n){let o=e.cam16Ucs(t,r,n),a=z.fromInt(o),s=z.fromInt(t);return F.from(a.hue,s.chroma,pt(t)).toInt()}static cam16Ucs(t,r,n){let o=z.fromInt(t),a=z.fromInt(r),s=o.jstar,i=o.astar,u=o.bstar,p=a.jstar,l=a.astar,P=a.bstar,d=s+(p-s)*n,h=i+(l-i)*n,f=u+(P-u)*n;return z.fromUcs(d,h,f).toInt()}};var N=class e{static ratioOfTones(t,r){return t=ct(0,100,t),r=ct(0,100,r),e.ratioOfYs(Y(t),Y(r))}static ratioOfYs(t,r){let n=t>r?t:r,o=n===r?t:r;return(n+5)/(o+5)}static lighter(t,r){if(t<0||t>100)return-1;let n=Y(t),o=r*(n+5)-5,a=e.ratioOfYs(o,n),s=Math.abs(a-r);if(a<r&&s>.04)return-1;let i=dt(o)+.4;return i<0||i>100?-1:i}static darker(t,r){if(t<0||t>100)return-1;let n=Y(t),o=(n+5)/r-5,a=e.ratioOfYs(n,o),s=Math.abs(a-r);if(a<r&&s>.04)return-1;let i=dt(o)-.4;return i<0||i>100?-1:i}static lighterUnsafe(t,r){let n=e.lighter(t,r);return n<0?100:n}static darkerUnsafe(t,r){let n=e.darker(t,r);return n<0?0:n}};var lt=class e{static isDisliked(t){let r=Math.round(t.hue)>=90&&Math.round(t.hue)<=111,n=Math.round(t.chroma)>16,o=Math.round(t.tone)<65;return r&&n&&o}static fixIfDisliked(t){return e.isDisliked(t)?F.from(t.hue,t.chroma,70):t}};var M=class e{static fromPalette(t){return new e(t.name??"",t.palette,t.tone,t.isBackground??!1,t.background,t.secondBackground,t.contrastCurve,t.toneDeltaPair)}constructor(t,r,n,o,a,s,i,u){if(this.name=t,this.palette=r,this.tone=n,this.isBackground=o,this.background=a,this.secondBackground=s,this.contrastCurve=i,this.toneDeltaPair=u,this.hctCache=new Map,!a&&s)throw new Error(`Color ${t} has secondBackgrounddefined, but background is not defined.`);if(!a&&i)throw new Error(`Color ${t} has contrastCurvedefined, but background is not defined.`);if(a&&!i)throw new Error(`Color ${t} has backgrounddefined, but contrastCurve is not defined.`)}getArgb(t){return this.getHct(t).toInt()}getHct(t){let r=this.hctCache.get(t);if(r!=null)return r;let n=this.getTone(t),o=this.palette(t).getHct(n);return this.hctCache.size>4&&this.hctCache.clear(),this.hctCache.set(t,o),o}getTone(t){let r=t.contrastLevel<0;if(this.toneDeltaPair){let n=this.toneDeltaPair(t),o=n.roleA,a=n.roleB,s=n.delta,i=n.polarity,u=n.stayTogether,l=this.background(t).getTone(t),P=i==="nearer"||i==="lighter"&&!t.isDark||i==="darker"&&t.isDark,d=P?o:a,h=P?a:o,f=this.name===d.name,m=t.isDark?1:-1,g=d.contrastCurve.getContrast(t.contrastLevel),b=h.contrastCurve.getContrast(t.contrastLevel),y=d.tone(t),x=N.ratioOfTones(l,y)>=g?y:e.foregroundTone(l,g),A=h.tone(t),I=N.ratioOfTones(l,A)>=b?A:e.foregroundTone(l,b);return r&&(x=e.foregroundTone(l,g),I=e.foregroundTone(l,b)),(I-x)*m>=s||(I=ct(0,100,x+s*m),(I-x)*m>=s||(x=ct(0,100,I-s*m))),50<=x&&x<60?m>0?(x=60,I=Math.max(I,x+s*m)):(x=49,I=Math.min(I,x+s*m)):50<=I&&I<60&&(u?m>0?(x=60,I=Math.max(I,x+s*m)):(x=49,I=Math.min(I,x+s*m)):m>0?I=60:I=49),f?x:I}else{let n=this.tone(t);if(this.background==null)return n;let o=this.background(t).getTone(t),a=this.contrastCurve.getContrast(t.contrastLevel);if(N.ratioOfTones(o,n)>=a||(n=e.foregroundTone(o,a)),r&&(n=e.foregroundTone(o,a)),this.isBackground&&50<=n&&n<60&&(N.ratioOfTones(49,o)>=a?n=49:n=60),this.secondBackground){let[s,i]=[this.background,this.secondBackground],[u,p]=[s(t).getTone(t),i(t).getTone(t)],[l,P]=[Math.max(u,p),Math.min(u,p)];if(N.ratioOfTones(l,n)>=a&&N.ratioOfTones(P,n)>=a)return n;let d=N.lighter(l,a),h=N.darker(P,a),f=[];return d!==-1&&f.push(d),h!==-1&&f.push(h),e.tonePrefersLightForeground(u)||e.tonePrefersLightForeground(p)?d<0?100:d:f.length===1?f[0]:h<0?0:h}return n}}static foregroundTone(t,r){let n=N.lighterUnsafe(t,r),o=N.darkerUnsafe(t,r),a=N.ratioOfTones(n,t),s=N.ratioOfTones(o,t);if(e.tonePrefersLightForeground(t)){let u=Math.abs(a-s)<.1&&a<r&&s<r;return a>=r||a>=s||u?n:o}else return s>=r||s>=a?o:n}static tonePrefersLightForeground(t){return Math.round(t)<60}static toneAllowsLightForeground(t){return Math.round(t)<=49}static enableLightForeground(t){return e.tonePrefersLightForeground(t)&&!e.toneAllowsLightForeground(t)?49:t}};var U;(function(e){e[e.MONOCHROME=0]="MONOCHROME",e[e.NEUTRAL=1]="NEUTRAL",e[e.TONAL_SPOT=2]="TONAL_SPOT",e[e.VIBRANT=3]="VIBRANT",e[e.EXPRESSIVE=4]="EXPRESSIVE",e[e.FIDELITY=5]="FIDELITY",e[e.CONTENT=6]="CONTENT",e[e.RAINBOW=7]="RAINBOW",e[e.FRUIT_SALAD=8]="FRUIT_SALAD"})(U||(U={}));var k=class{constructor(t,r,n,o){this.low=t,this.normal=r,this.medium=n,this.high=o}getContrast(t){return t<=-1?this.low:t<0?st(this.low,this.normal,(t- -1)/1):t<.5?st(this.normal,this.medium,(t-0)/.5):t<1?st(this.medium,this.high,(t-.5)/.5):this.high}};var E=class{constructor(t,r,n,o,a){this.roleA=t,this.roleB=r,this.delta=n,this.polarity=o,this.stayTogether=a}};function ut(e){return e.variant===U.FIDELITY||e.variant===U.CONTENT}function B(e){return e.variant===U.MONOCHROME}function Be(e,t,r,n){let o=r,a=F.from(e,t,r);if(a.chroma<t){let s=a.chroma;for(;a.chroma<t;){o+=n?-1:1;let i=F.from(e,t,o);if(s>i.chroma||Math.abs(i.chroma-t)<.4)break;let u=Math.abs(i.chroma-t),p=Math.abs(a.chroma-t);u<p&&(a=i),s=Math.max(s,i.chroma)}}return o}function Re(e){return v.make(void 0,void 0,e.isDark?30:80,void 0,void 0)}function Gt(e,t){let r=e.inViewingConditions(Re(t));return M.tonePrefersLightForeground(e.tone)&&!M.toneAllowsLightForeground(r.tone)?M.enableLightForeground(e.tone):M.enableLightForeground(r.tone)}var c=class e{static highestSurface(t){return t.isDark?e.surfaceBright:e.surfaceDim}};c.contentAccentToneDelta=15;c.primaryPaletteKeyColor=M.fromPalette({name:"primary_palette_key_color",palette:e=>e.primaryPalette,tone:e=>e.primaryPalette.keyColor.tone});c.secondaryPaletteKeyColor=M.fromPalette({name:"secondary_palette_key_color",palette:e=>e.secondaryPalette,tone:e=>e.secondaryPalette.keyColor.tone});c.tertiaryPaletteKeyColor=M.fromPalette({name:"tertiary_palette_key_color",palette:e=>e.tertiaryPalette,tone:e=>e.tertiaryPalette.keyColor.tone});c.neutralPaletteKeyColor=M.fromPalette({name:"neutral_palette_key_color",palette:e=>e.neutralPalette,tone:e=>e.neutralPalette.keyColor.tone});c.neutralVariantPaletteKeyColor=M.fromPalette({name:"neutral_variant_palette_key_color",palette:e=>e.neutralVariantPalette,tone:e=>e.neutralVariantPalette.keyColor.tone});c.background=M.fromPalette({name:"background",palette:e=>e.neutralPalette,tone:e=>e.isDark?6:98,isBackground:!0});c.onBackground=M.fromPalette({name:"on_background",palette:e=>e.neutralPalette,tone:e=>e.isDark?90:10,background:e=>c.background,contrastCurve:new k(3,3,4.5,7)});c.surface=M.fromPalette({name:"surface",palette:e=>e.neutralPalette,tone:e=>e.isDark?6:98,isBackground:!0});c.surfaceDim=M.fromPalette({name:"surface_dim",palette:e=>e.neutralPalette,tone:e=>e.isDark?6:87,isBackground:!0});c.surfaceBright=M.fromPalette({name:"surface_bright",palette:e=>e.neutralPalette,tone:e=>e.isDark?24:98,isBackground:!0});c.surfaceContainerLowest=M.fromPalette({name:"surface_container_lowest",palette:e=>e.neutralPalette,tone:e=>e.isDark?4:100,isBackground:!0});c.surfaceContainerLow=M.fromPalette({name:"surface_container_low",palette:e=>e.neutralPalette,tone:e=>e.isDark?10:96,isBackground:!0});c.surfaceContainer=M.fromPalette({name:"surface_container",palette:e=>e.neutralPalette,tone:e=>e.isDark?12:94,isBackground:!0});c.surfaceContainerHigh=M.fromPalette({name:"surface_container_high",palette:e=>e.neutralPalette,tone:e=>e.isDark?17:92,isBackground:!0});c.surfaceContainerHighest=M.fromPalette({name:"surface_container_highest",palette:e=>e.neutralPalette,tone:e=>e.isDark?22:90,isBackground:!0});c.onSurface=M.fromPalette({name:"on_surface",palette:e=>e.neutralPalette,tone:e=>e.isDark?90:10,background:e=>c.highestSurface(e),contrastCurve:new k(4.5,7,11,21)});c.surfaceVariant=M.fromPalette({name:"surface_variant",palette:e=>e.neutralVariantPalette,tone:e=>e.isDark?30:90,isBackground:!0});c.onSurfaceVariant=M.fromPalette({name:"on_surface_variant",palette:e=>e.neutralVariantPalette,tone:e=>e.isDark?80:30,background:e=>c.highestSurface(e),contrastCurve:new k(3,4.5,7,11)});c.inverseSurface=M.fromPalette({name:"inverse_surface",palette:e=>e.neutralPalette,tone:e=>e.isDark?90:20});c.inverseOnSurface=M.fromPalette({name:"inverse_on_surface",palette:e=>e.neutralPalette,tone:e=>e.isDark?20:95,background:e=>c.inverseSurface,contrastCurve:new k(4.5,7,11,21)});c.outline=M.fromPalette({name:"outline",palette:e=>e.neutralVariantPalette,tone:e=>e.isDark?60:50,background:e=>c.highestSurface(e),contrastCurve:new k(1.5,3,4.5,7)});c.outlineVariant=M.fromPalette({name:"outline_variant",palette:e=>e.neutralVariantPalette,tone:e=>e.isDark?30:80,background:e=>c.highestSurface(e),contrastCurve:new k(1,1,3,7)});c.shadow=M.fromPalette({name:"shadow",palette:e=>e.neutralPalette,tone:e=>0});c.scrim=M.fromPalette({name:"scrim",palette:e=>e.neutralPalette,tone:e=>0});c.surfaceTint=M.fromPalette({name:"surface_tint",palette:e=>e.primaryPalette,tone:e=>e.isDark?80:40,isBackground:!0});c.primary=M.fromPalette({name:"primary",palette:e=>e.primaryPalette,tone:e=>B(e)?e.isDark?100:0:e.isDark?80:40,isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(3,4.5,7,11),toneDeltaPair:e=>new E(c.primaryContainer,c.primary,15,"nearer",!1)});c.onPrimary=M.fromPalette({name:"on_primary",palette:e=>e.primaryPalette,tone:e=>B(e)?e.isDark?10:90:e.isDark?20:100,background:e=>c.primary,contrastCurve:new k(4.5,7,11,21)});c.primaryContainer=M.fromPalette({name:"primary_container",palette:e=>e.primaryPalette,tone:e=>ut(e)?Gt(e.sourceColorHct,e):B(e)?e.isDark?85:25:e.isDark?30:90,isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(1,1,3,7),toneDeltaPair:e=>new E(c.primaryContainer,c.primary,15,"nearer",!1)});c.onPrimaryContainer=M.fromPalette({name:"on_primary_container",palette:e=>e.primaryPalette,tone:e=>ut(e)?M.foregroundTone(c.primaryContainer.tone(e),4.5):B(e)?e.isDark?0:100:e.isDark?90:10,background:e=>c.primaryContainer,contrastCurve:new k(4.5,7,11,21)});c.inversePrimary=M.fromPalette({name:"inverse_primary",palette:e=>e.primaryPalette,tone:e=>e.isDark?40:80,background:e=>c.inverseSurface,contrastCurve:new k(3,4.5,7,11)});c.secondary=M.fromPalette({name:"secondary",palette:e=>e.secondaryPalette,tone:e=>e.isDark?80:40,isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(3,4.5,7,11),toneDeltaPair:e=>new E(c.secondaryContainer,c.secondary,15,"nearer",!1)});c.onSecondary=M.fromPalette({name:"on_secondary",palette:e=>e.secondaryPalette,tone:e=>B(e)?e.isDark?10:100:e.isDark?20:100,background:e=>c.secondary,contrastCurve:new k(4.5,7,11,21)});c.secondaryContainer=M.fromPalette({name:"secondary_container",palette:e=>e.secondaryPalette,tone:e=>{let t=e.isDark?30:90;if(B(e))return e.isDark?30:85;if(!ut(e))return t;let r=Be(e.secondaryPalette.hue,e.secondaryPalette.chroma,t,!e.isDark);return r=Gt(e.secondaryPalette.getHct(r),e),r},isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(1,1,3,7),toneDeltaPair:e=>new E(c.secondaryContainer,c.secondary,15,"nearer",!1)});c.onSecondaryContainer=M.fromPalette({name:"on_secondary_container",palette:e=>e.secondaryPalette,tone:e=>ut(e)?M.foregroundTone(c.secondaryContainer.tone(e),4.5):e.isDark?90:10,background:e=>c.secondaryContainer,contrastCurve:new k(4.5,7,11,21)});c.tertiary=M.fromPalette({name:"tertiary",palette:e=>e.tertiaryPalette,tone:e=>B(e)?e.isDark?90:25:e.isDark?80:40,isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(3,4.5,7,11),toneDeltaPair:e=>new E(c.tertiaryContainer,c.tertiary,15,"nearer",!1)});c.onTertiary=M.fromPalette({name:"on_tertiary",palette:e=>e.tertiaryPalette,tone:e=>B(e)?e.isDark?10:90:e.isDark?20:100,background:e=>c.tertiary,contrastCurve:new k(4.5,7,11,21)});c.tertiaryContainer=M.fromPalette({name:"tertiary_container",palette:e=>e.tertiaryPalette,tone:e=>{if(B(e))return e.isDark?60:49;if(!ut(e))return e.isDark?30:90;let t=Gt(e.tertiaryPalette.getHct(e.sourceColorHct.tone),e),r=e.tertiaryPalette.getHct(t);return lt.fixIfDisliked(r).tone},isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(1,1,3,7),toneDeltaPair:e=>new E(c.tertiaryContainer,c.tertiary,15,"nearer",!1)});c.onTertiaryContainer=M.fromPalette({name:"on_tertiary_container",palette:e=>e.tertiaryPalette,tone:e=>B(e)?e.isDark?0:100:ut(e)?M.foregroundTone(c.tertiaryContainer.tone(e),4.5):e.isDark?90:10,background:e=>c.tertiaryContainer,contrastCurve:new k(4.5,7,11,21)});c.error=M.fromPalette({name:"error",palette:e=>e.errorPalette,tone:e=>e.isDark?80:40,isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(3,4.5,7,11),toneDeltaPair:e=>new E(c.errorContainer,c.error,15,"nearer",!1)});c.onError=M.fromPalette({name:"on_error",palette:e=>e.errorPalette,tone:e=>e.isDark?20:100,background:e=>c.error,contrastCurve:new k(4.5,7,11,21)});c.errorContainer=M.fromPalette({name:"error_container",palette:e=>e.errorPalette,tone:e=>e.isDark?30:90,isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(1,1,3,7),toneDeltaPair:e=>new E(c.errorContainer,c.error,15,"nearer",!1)});c.onErrorContainer=M.fromPalette({name:"on_error_container",palette:e=>e.errorPalette,tone:e=>e.isDark?90:10,background:e=>c.errorContainer,contrastCurve:new k(4.5,7,11,21)});c.primaryFixed=M.fromPalette({name:"primary_fixed",palette:e=>e.primaryPalette,tone:e=>B(e)?40:90,isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(1,1,3,7),toneDeltaPair:e=>new E(c.primaryFixed,c.primaryFixedDim,10,"lighter",!0)});c.primaryFixedDim=M.fromPalette({name:"primary_fixed_dim",palette:e=>e.primaryPalette,tone:e=>B(e)?30:80,isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(1,1,3,7),toneDeltaPair:e=>new E(c.primaryFixed,c.primaryFixedDim,10,"lighter",!0)});c.onPrimaryFixed=M.fromPalette({name:"on_primary_fixed",palette:e=>e.primaryPalette,tone:e=>B(e)?100:10,background:e=>c.primaryFixedDim,secondBackground:e=>c.primaryFixed,contrastCurve:new k(4.5,7,11,21)});c.onPrimaryFixedVariant=M.fromPalette({name:"on_primary_fixed_variant",palette:e=>e.primaryPalette,tone:e=>B(e)?90:30,background:e=>c.primaryFixedDim,secondBackground:e=>c.primaryFixed,contrastCurve:new k(3,4.5,7,11)});c.secondaryFixed=M.fromPalette({name:"secondary_fixed",palette:e=>e.secondaryPalette,tone:e=>B(e)?80:90,isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(1,1,3,7),toneDeltaPair:e=>new E(c.secondaryFixed,c.secondaryFixedDim,10,"lighter",!0)});c.secondaryFixedDim=M.fromPalette({name:"secondary_fixed_dim",palette:e=>e.secondaryPalette,tone:e=>B(e)?70:80,isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(1,1,3,7),toneDeltaPair:e=>new E(c.secondaryFixed,c.secondaryFixedDim,10,"lighter",!0)});c.onSecondaryFixed=M.fromPalette({name:"on_secondary_fixed",palette:e=>e.secondaryPalette,tone:e=>10,background:e=>c.secondaryFixedDim,secondBackground:e=>c.secondaryFixed,contrastCurve:new k(4.5,7,11,21)});c.onSecondaryFixedVariant=M.fromPalette({name:"on_secondary_fixed_variant",palette:e=>e.secondaryPalette,tone:e=>B(e)?25:30,background:e=>c.secondaryFixedDim,secondBackground:e=>c.secondaryFixed,contrastCurve:new k(3,4.5,7,11)});c.tertiaryFixed=M.fromPalette({name:"tertiary_fixed",palette:e=>e.tertiaryPalette,tone:e=>B(e)?40:90,isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(1,1,3,7),toneDeltaPair:e=>new E(c.tertiaryFixed,c.tertiaryFixedDim,10,"lighter",!0)});c.tertiaryFixedDim=M.fromPalette({name:"tertiary_fixed_dim",palette:e=>e.tertiaryPalette,tone:e=>B(e)?30:80,isBackground:!0,background:e=>c.highestSurface(e),contrastCurve:new k(1,1,3,7),toneDeltaPair:e=>new E(c.tertiaryFixed,c.tertiaryFixedDim,10,"lighter",!0)});c.onTertiaryFixed=M.fromPalette({name:"on_tertiary_fixed",palette:e=>e.tertiaryPalette,tone:e=>B(e)?100:10,background:e=>c.tertiaryFixedDim,secondBackground:e=>c.tertiaryFixed,contrastCurve:new k(4.5,7,11,21)});c.onTertiaryFixedVariant=M.fromPalette({name:"on_tertiary_fixed_variant",palette:e=>e.tertiaryPalette,tone:e=>B(e)?90:30,background:e=>c.tertiaryFixedDim,secondBackground:e=>c.tertiaryFixed,contrastCurve:new k(3,4.5,7,11)});var D=class e{static fromInt(t){let r=F.fromInt(t);return e.fromHct(r)}static fromHct(t){return new e(t.hue,t.chroma,t)}static fromHueAndChroma(t,r){return new e(t,r,e.createKeyColor(t,r))}constructor(t,r,n){this.hue=t,this.chroma=r,this.keyColor=n,this.cache=new Map}static createKeyColor(t,r){let o=F.from(t,r,50),a=Math.abs(o.chroma-r);for(let s=1;s<50;s+=1){if(Math.round(r)===Math.round(o.chroma))return o;let i=F.from(t,r,50+s),u=Math.abs(i.chroma-r);u<a&&(a=u,o=i);let p=F.from(t,r,50-s),l=Math.abs(p.chroma-r);l<a&&(a=l,o=p)}return o}tone(t){let r=this.cache.get(t);return r===void 0&&(r=F.from(this.hue,this.chroma,t).toInt(),this.cache.set(t,r)),r}getHct(t){return F.fromInt(this.tone(t))}};var X=class e{static of(t){return new e(t,!1)}static contentOf(t){return new e(t,!0)}static fromColors(t){return e.createPaletteFromColors(!1,t)}static contentFromColors(t){return e.createPaletteFromColors(!0,t)}static createPaletteFromColors(t,r){let n=new e(r.primary,t);if(r.secondary){let o=new e(r.secondary,t);n.a2=o.a1}if(r.tertiary){let o=new e(r.tertiary,t);n.a3=o.a1}if(r.error){let o=new e(r.error,t);n.error=o.a1}if(r.neutral){let o=new e(r.neutral,t);n.n1=o.n1}if(r.neutralVariant){let o=new e(r.neutralVariant,t);n.n2=o.n2}return n}constructor(t,r){let n=F.fromInt(t),o=n.hue,a=n.chroma;r?(this.a1=D.fromHueAndChroma(o,a),this.a2=D.fromHueAndChroma(o,a/3),this.a3=D.fromHueAndChroma(o+60,a/2),this.n1=D.fromHueAndChroma(o,Math.min(a/12,4)),this.n2=D.fromHueAndChroma(o,Math.min(a/6,8))):(this.a1=D.fromHueAndChroma(o,Math.max(48,a)),this.a2=D.fromHueAndChroma(o,16),this.a3=D.fromHueAndChroma(o+60,24),this.n1=D.fromHueAndChroma(o,4),this.n2=D.fromHueAndChroma(o,8)),this.error=D.fromHueAndChroma(25,84)}};var Dt=class{fromInt(t){return _t(t)}toInt(t){return ie(t[0],t[1],t[2])}distance(t,r){let n=t[0]-r[0],o=t[1]-r[1],a=t[2]-r[2];return n*n+o*o+a*a}};var Ee=10,He=3,Lt=class{static quantize(t,r,n){let o=new Map,a=new Array,s=new Array,i=new Dt,u=0;for(let y=0;y<t.length;y++){let x=t[y],A=o.get(x);A===void 0?(u++,a.push(i.fromInt(x)),s.push(x),o.set(x,1)):o.set(x,A+1)}let p=new Array;for(let y=0;y<u;y++){let x=s[y],A=o.get(x);A!==void 0&&(p[y]=A)}let l=Math.min(n,u);r.length>0&&(l=Math.min(l,r.length));let P=new Array;for(let y=0;y<r.length;y++)P.push(i.fromInt(r[y]));let d=l-P.length;if(r.length===0&&d>0)for(let y=0;y<d;y++){let x=Math.random()*100,A=Math.random()*(100- -100+1)+-100,I=Math.random()*(100- -100+1)+-100;P.push(new Array(x,A,I))}let h=new Array;for(let y=0;y<u;y++)h.push(Math.floor(Math.random()*l));let f=new Array;for(let y=0;y<l;y++){f.push(new Array);for(let x=0;x<l;x++)f[y].push(0)}let m=new Array;for(let y=0;y<l;y++){m.push(new Array);for(let x=0;x<l;x++)m[y].push(new jt)}let g=new Array;for(let y=0;y<l;y++)g.push(0);for(let y=0;y<Ee;y++){for(let C=0;C<l;C++){for(let w=C+1;w<l;w++){let T=i.distance(P[C],P[w]);m[w][C].distance=T,m[w][C].index=C,m[C][w].distance=T,m[C][w].index=w}m[C].sort();for(let w=0;w<l;w++)f[C][w]=m[C][w].index}let x=0;for(let C=0;C<u;C++){let w=a[C],T=h[C],L=P[T],O=i.distance(w,L),q=O,G=-1;for(let R=0;R<l;R++){if(m[T][R].distance>=4*O)continue;let ot=i.distance(w,P[R]);ot<q&&(q=ot,G=R)}G!==-1&&Math.abs(Math.sqrt(q)-Math.sqrt(O))>He&&(x++,h[C]=G)}if(x===0&&y!==0)break;let A=new Array(l).fill(0),I=new Array(l).fill(0),S=new Array(l).fill(0);for(let C=0;C<l;C++)g[C]=0;for(let C=0;C<u;C++){let w=h[C],T=a[C],L=p[C];g[w]+=L,A[w]+=T[0]*L,I[w]+=T[1]*L,S[w]+=T[2]*L}for(let C=0;C<l;C++){let w=g[C];if(w===0){P[C]=[0,0,0];continue}let T=A[C]/w,L=I[C]/w,O=S[C]/w;P[C]=[T,L,O]}}let b=new Map;for(let y=0;y<l;y++){let x=g[y];if(x===0)continue;let A=i.toInt(P[y]);b.has(A)||b.set(A,x)}return b}},jt=class{constructor(){this.distance=-1,this.index=-1}};var Tt=class{static quantize(t){let r=new Map;for(let n=0;n<t.length;n++){let o=t[n];se(o)<255||r.set(o,(r.get(o)??0)+1)}return r}};var St=5,K=33,gt=35937,V={RED:"red",GREEN:"green",BLUE:"blue"},Ft=class{constructor(t=[],r=[],n=[],o=[],a=[],s=[]){this.weights=t,this.momentsR=r,this.momentsG=n,this.momentsB=o,this.moments=a,this.cubes=s}quantize(t,r){this.constructHistogram(t),this.computeMoments();let n=this.createBoxes(r);return this.createResult(n.resultCount)}constructHistogram(t){this.weights=Array.from({length:gt}).fill(0),this.momentsR=Array.from({length:gt}).fill(0),this.momentsG=Array.from({length:gt}).fill(0),this.momentsB=Array.from({length:gt}).fill(0),this.moments=Array.from({length:gt}).fill(0);let r=Tt.quantize(t);for(let[n,o]of r.entries()){let a=et(n),s=rt(n),i=nt(n),u=8-St,p=(a>>u)+1,l=(s>>u)+1,P=(i>>u)+1,d=this.getIndex(p,l,P);this.weights[d]=(this.weights[d]??0)+o,this.momentsR[d]+=o*a,this.momentsG[d]+=o*s,this.momentsB[d]+=o*i,this.moments[d]+=o*(a*a+s*s+i*i)}}computeMoments(){for(let t=1;t<K;t++){let r=Array.from({length:K}).fill(0),n=Array.from({length:K}).fill(0),o=Array.from({length:K}).fill(0),a=Array.from({length:K}).fill(0),s=Array.from({length:K}).fill(0);for(let i=1;i<K;i++){let u=0,p=0,l=0,P=0,d=0;for(let h=1;h<K;h++){let f=this.getIndex(t,i,h);u+=this.weights[f],p+=this.momentsR[f],l+=this.momentsG[f],P+=this.momentsB[f],d+=this.moments[f],r[h]+=u,n[h]+=p,o[h]+=l,a[h]+=P,s[h]+=d;let m=this.getIndex(t-1,i,h);this.weights[f]=this.weights[m]+r[h],this.momentsR[f]=this.momentsR[m]+n[h],this.momentsG[f]=this.momentsG[m]+o[h],this.momentsB[f]=this.momentsB[m]+a[h],this.moments[f]=this.moments[m]+s[h]}}}}createBoxes(t){this.cubes=Array.from({length:t}).fill(0).map(()=>new qt);let r=Array.from({length:t}).fill(0);this.cubes[0].r0=0,this.cubes[0].g0=0,this.cubes[0].b0=0,this.cubes[0].r1=K-1,this.cubes[0].g1=K-1,this.cubes[0].b1=K-1;let n=t,o=0;for(let a=1;a<t;a++){this.cut(this.cubes[o],this.cubes[a])?(r[o]=this.cubes[o].vol>1?this.variance(this.cubes[o]):0,r[a]=this.cubes[a].vol>1?this.variance(this.cubes[a]):0):(r[o]=0,a--),o=0;let s=r[0];for(let i=1;i<=a;i++)r[i]>s&&(s=r[i],o=i);if(s<=0){n=a+1;break}}return new $t(t,n)}createResult(t){let r=[];for(let n=0;n<t;++n){let o=this.cubes[n],a=this.volume(o,this.weights);if(a>0){let s=Math.round(this.volume(o,this.momentsR)/a),i=Math.round(this.volume(o,this.momentsG)/a),u=Math.round(this.volume(o,this.momentsB)/a),p=255<<24|(s&255)<<16|(i&255)<<8|u&255;r.push(p)}}return r}variance(t){let r=this.volume(t,this.momentsR),n=this.volume(t,this.momentsG),o=this.volume(t,this.momentsB),a=this.moments[this.getIndex(t.r1,t.g1,t.b1)]-this.moments[this.getIndex(t.r1,t.g1,t.b0)]-this.moments[this.getIndex(t.r1,t.g0,t.b1)]+this.moments[this.getIndex(t.r1,t.g0,t.b0)]-this.moments[this.getIndex(t.r0,t.g1,t.b1)]+this.moments[this.getIndex(t.r0,t.g1,t.b0)]+this.moments[this.getIndex(t.r0,t.g0,t.b1)]-this.moments[this.getIndex(t.r0,t.g0,t.b0)],s=r*r+n*n+o*o,i=this.volume(t,this.weights);return a-s/i}cut(t,r){let n=this.volume(t,this.momentsR),o=this.volume(t,this.momentsG),a=this.volume(t,this.momentsB),s=this.volume(t,this.weights),i=this.maximize(t,V.RED,t.r0+1,t.r1,n,o,a,s),u=this.maximize(t,V.GREEN,t.g0+1,t.g1,n,o,a,s),p=this.maximize(t,V.BLUE,t.b0+1,t.b1,n,o,a,s),l,P=i.maximum,d=u.maximum,h=p.maximum;if(P>=d&&P>=h){if(i.cutLocation<0)return!1;l=V.RED}else d>=P&&d>=h?l=V.GREEN:l=V.BLUE;switch(r.r1=t.r1,r.g1=t.g1,r.b1=t.b1,l){case V.RED:t.r1=i.cutLocation,r.r0=t.r1,r.g0=t.g0,r.b0=t.b0;break;case V.GREEN:t.g1=u.cutLocation,r.r0=t.r0,r.g0=t.g1,r.b0=t.b0;break;case V.BLUE:t.b1=p.cutLocation,r.r0=t.r0,r.g0=t.g0,r.b0=t.b1;break;default:throw new Error("unexpected direction "+l)}return t.vol=(t.r1-t.r0)*(t.g1-t.g0)*(t.b1-t.b0),r.vol=(r.r1-r.r0)*(r.g1-r.g0)*(r.b1-r.b0),!0}maximize(t,r,n,o,a,s,i,u){let p=this.bottom(t,r,this.momentsR),l=this.bottom(t,r,this.momentsG),P=this.bottom(t,r,this.momentsB),d=this.bottom(t,r,this.weights),h=0,f=-1,m=0,g=0,b=0,y=0;for(let x=n;x<o;x++){if(m=p+this.top(t,r,x,this.momentsR),g=l+this.top(t,r,x,this.momentsG),b=P+this.top(t,r,x,this.momentsB),y=d+this.top(t,r,x,this.weights),y===0)continue;let A=(m*m+g*g+b*b)*1,I=y*1,S=A/I;m=a-m,g=s-g,b=i-b,y=u-y,y!==0&&(A=(m*m+g*g+b*b)*1,I=y*1,S+=A/I,S>h&&(h=S,f=x))}return new Yt(f,h)}volume(t,r){return r[this.getIndex(t.r1,t.g1,t.b1)]-r[this.getIndex(t.r1,t.g1,t.b0)]-r[this.getIndex(t.r1,t.g0,t.b1)]+r[this.getIndex(t.r1,t.g0,t.b0)]-r[this.getIndex(t.r0,t.g1,t.b1)]+r[this.getIndex(t.r0,t.g1,t.b0)]+r[this.getIndex(t.r0,t.g0,t.b1)]-r[this.getIndex(t.r0,t.g0,t.b0)]}bottom(t,r,n){switch(r){case V.RED:return-n[this.getIndex(t.r0,t.g1,t.b1)]+n[this.getIndex(t.r0,t.g1,t.b0)]+n[this.getIndex(t.r0,t.g0,t.b1)]-n[this.getIndex(t.r0,t.g0,t.b0)];case V.GREEN:return-n[this.getIndex(t.r1,t.g0,t.b1)]+n[this.getIndex(t.r1,t.g0,t.b0)]+n[this.getIndex(t.r0,t.g0,t.b1)]-n[this.getIndex(t.r0,t.g0,t.b0)];case V.BLUE:return-n[this.getIndex(t.r1,t.g1,t.b0)]+n[this.getIndex(t.r1,t.g0,t.b0)]+n[this.getIndex(t.r0,t.g1,t.b0)]-n[this.getIndex(t.r0,t.g0,t.b0)];default:throw new Error("unexpected direction $direction")}}top(t,r,n,o){switch(r){case V.RED:return o[this.getIndex(n,t.g1,t.b1)]-o[this.getIndex(n,t.g1,t.b0)]-o[this.getIndex(n,t.g0,t.b1)]+o[this.getIndex(n,t.g0,t.b0)];case V.GREEN:return o[this.getIndex(t.r1,n,t.b1)]-o[this.getIndex(t.r1,n,t.b0)]-o[this.getIndex(t.r0,n,t.b1)]+o[this.getIndex(t.r0,n,t.b0)];case V.BLUE:return o[this.getIndex(t.r1,t.g1,n)]-o[this.getIndex(t.r1,t.g0,n)]-o[this.getIndex(t.r0,t.g1,n)]+o[this.getIndex(t.r0,t.g0,n)];default:throw new Error("unexpected direction $direction")}}getIndex(t,r,n){return(t<<St*2)+(t<<St+1)+t+(r<<St)+r+n}},qt=class{constructor(t=0,r=0,n=0,o=0,a=0,s=0,i=0){this.r0=t,this.r1=r,this.g0=n,this.g1=o,this.b0=a,this.b1=s,this.vol=i}},$t=class{constructor(t,r){this.requestedCount=t,this.resultCount=r}},Yt=class{constructor(t,r){this.cutLocation=t,this.maximum=r}};var Bt=class{static quantize(t,r){let o=new Ft().quantize(t,r);return Lt.quantize(t,o,r)}};var _=class{constructor(t){this.sourceColorArgb=t.sourceColorArgb,this.variant=t.variant,this.contrastLevel=t.contrastLevel,this.isDark=t.isDark,this.sourceColorHct=F.fromInt(t.sourceColorArgb),this.primaryPalette=t.primaryPalette,this.secondaryPalette=t.secondaryPalette,this.tertiaryPalette=t.tertiaryPalette,this.neutralPalette=t.neutralPalette,this.neutralVariantPalette=t.neutralVariantPalette,this.errorPalette=D.fromHueAndChroma(25,84)}static getRotatedHue(t,r,n){let o=t.hue;if(r.length!==n.length)throw new Error(`mismatch between hue length ${r.length} & rotations ${n.length}`);if(n.length===1)return $(t.hue+n[0]);let a=r.length;for(let s=0;s<=a-2;s++){let i=r[s],u=r[s+1];if(i<o&&o<u)return $(o+n[s])}return o}};var yt=class e{get primary(){return this.props.primary}get onPrimary(){return this.props.onPrimary}get primaryContainer(){return this.props.primaryContainer}get onPrimaryContainer(){return this.props.onPrimaryContainer}get secondary(){return this.props.secondary}get onSecondary(){return this.props.onSecondary}get secondaryContainer(){return this.props.secondaryContainer}get onSecondaryContainer(){return this.props.onSecondaryContainer}get tertiary(){return this.props.tertiary}get onTertiary(){return this.props.onTertiary}get tertiaryContainer(){return this.props.tertiaryContainer}get onTertiaryContainer(){return this.props.onTertiaryContainer}get error(){return this.props.error}get onError(){return this.props.onError}get errorContainer(){return this.props.errorContainer}get onErrorContainer(){return this.props.onErrorContainer}get background(){return this.props.background}get onBackground(){return this.props.onBackground}get surface(){return this.props.surface}get onSurface(){return this.props.onSurface}get surfaceVariant(){return this.props.surfaceVariant}get onSurfaceVariant(){return this.props.onSurfaceVariant}get outline(){return this.props.outline}get outlineVariant(){return this.props.outlineVariant}get shadow(){return this.props.shadow}get scrim(){return this.props.scrim}get inverseSurface(){return this.props.inverseSurface}get inverseOnSurface(){return this.props.inverseOnSurface}get inversePrimary(){return this.props.inversePrimary}static light(t){return e.lightFromCorePalette(X.of(t))}static dark(t){return e.darkFromCorePalette(X.of(t))}static lightContent(t){return e.lightFromCorePalette(X.contentOf(t))}static darkContent(t){return e.darkFromCorePalette(X.contentOf(t))}static lightFromCorePalette(t){return new e({primary:t.a1.tone(40),onPrimary:t.a1.tone(100),primaryContainer:t.a1.tone(90),onPrimaryContainer:t.a1.tone(10),secondary:t.a2.tone(40),onSecondary:t.a2.tone(100),secondaryContainer:t.a2.tone(90),onSecondaryContainer:t.a2.tone(10),tertiary:t.a3.tone(40),onTertiary:t.a3.tone(100),tertiaryContainer:t.a3.tone(90),onTertiaryContainer:t.a3.tone(10),error:t.error.tone(40),onError:t.error.tone(100),errorContainer:t.error.tone(90),onErrorContainer:t.error.tone(10),background:t.n1.tone(99),onBackground:t.n1.tone(10),surface:t.n1.tone(99),onSurface:t.n1.tone(10),surfaceVariant:t.n2.tone(90),onSurfaceVariant:t.n2.tone(30),outline:t.n2.tone(50),outlineVariant:t.n2.tone(80),shadow:t.n1.tone(0),scrim:t.n1.tone(0),inverseSurface:t.n1.tone(20),inverseOnSurface:t.n1.tone(95),inversePrimary:t.a1.tone(80)})}static darkFromCorePalette(t){return new e({primary:t.a1.tone(80),onPrimary:t.a1.tone(20),primaryContainer:t.a1.tone(30),onPrimaryContainer:t.a1.tone(90),secondary:t.a2.tone(80),onSecondary:t.a2.tone(20),secondaryContainer:t.a2.tone(30),onSecondaryContainer:t.a2.tone(90),tertiary:t.a3.tone(80),onTertiary:t.a3.tone(20),tertiaryContainer:t.a3.tone(30),onTertiaryContainer:t.a3.tone(90),error:t.error.tone(80),onError:t.error.tone(20),errorContainer:t.error.tone(30),onErrorContainer:t.error.tone(80),background:t.n1.tone(10),onBackground:t.n1.tone(90),surface:t.n1.tone(10),onSurface:t.n1.tone(90),surfaceVariant:t.n2.tone(30),onSurfaceVariant:t.n2.tone(80),outline:t.n2.tone(60),outlineVariant:t.n2.tone(30),shadow:t.n1.tone(0),scrim:t.n1.tone(0),inverseSurface:t.n1.tone(90),inverseOnSurface:t.n1.tone(20),inversePrimary:t.a1.tone(40)})}constructor(t){this.props=t}toJSON(){return{...this.props}}};var Pt=class e extends _{constructor(t,r,n){super({sourceColorArgb:t.toInt(),variant:U.EXPRESSIVE,contrastLevel:n,isDark:r,primaryPalette:D.fromHueAndChroma($(t.hue+240),40),secondaryPalette:D.fromHueAndChroma(_.getRotatedHue(t,e.hues,e.secondaryRotations),24),tertiaryPalette:D.fromHueAndChroma(_.getRotatedHue(t,e.hues,e.tertiaryRotations),32),neutralPalette:D.fromHueAndChroma(t.hue+15,8),neutralVariantPalette:D.fromHueAndChroma(t.hue+15,12)})}};Pt.hues=[0,21,51,121,151,191,271,321,360];Pt.secondaryRotations=[45,95,45,20,45,90,45,45,45];Pt.tertiaryRotations=[120,120,20,45,20,15,20,120,120];var xt=class e extends _{constructor(t,r,n){super({sourceColorArgb:t.toInt(),variant:U.VIBRANT,contrastLevel:n,isDark:r,primaryPalette:D.fromHueAndChroma(t.hue,200),secondaryPalette:D.fromHueAndChroma(_.getRotatedHue(t,e.hues,e.secondaryRotations),24),tertiaryPalette:D.fromHueAndChroma(_.getRotatedHue(t,e.hues,e.tertiaryRotations),32),neutralPalette:D.fromHueAndChroma(t.hue,10),neutralVariantPalette:D.fromHueAndChroma(t.hue,12)})}};xt.hues=[0,41,61,101,131,181,251,301,360];xt.secondaryRotations=[18,15,10,12,15,18,15,12,12];xt.tertiaryRotations=[35,30,20,25,30,35,30,25,25];var ve={desired:4,fallbackColorARGB:4282549748,filter:!0};function ze(e,t){return e.score>t.score?-1:e.score<t.score?1:0}var Q=class e{constructor(){}static score(t,r){let{desired:n,fallbackColorARGB:o,filter:a}={...ve,...r},s=[],i=new Array(360).fill(0),u=0;for(let[h,f]of t.entries()){let m=F.fromInt(h);s.push(m);let g=Math.floor(m.hue);i[g]+=f,u+=f}let p=new Array(360).fill(0);for(let h=0;h<360;h++){let f=i[h]/u;for(let m=h-14;m<h+16;m++){let g=At(m);p[g]+=f}}let l=new Array;for(let h of s){let f=At(Math.round(h.hue)),m=p[f];if(a&&(h.chroma<e.CUTOFF_CHROMA||m<=e.CUTOFF_EXCITED_PROPORTION))continue;let g=m*100*e.WEIGHT_PROPORTION,b=h.chroma<e.TARGET_CHROMA?e.WEIGHT_CHROMA_BELOW:e.WEIGHT_CHROMA_ABOVE,y=(h.chroma-e.TARGET_CHROMA)*b,x=g+y;l.push({hct:h,score:x})}l.sort(ze);let P=[];for(let h=90;h>=15;h--){P.length=0;for(let{hct:f}of l)if(P.find(g=>It(f.hue,g.hue)<h)||P.push(f),P.length>=n)break;if(P.length>=n)break}let d=[];P.length===0&&d.push(o);for(let h of P)d.push(h.toInt());return d}};Q.TARGET_CHROMA=48;Q.WEIGHT_PROPORTION=.7;Q.WEIGHT_CHROMA_ABOVE=.3;Q.WEIGHT_CHROMA_BELOW=.1;Q.CUTOFF_CHROMA=5;Q.CUTOFF_EXCITED_PROPORTION=.01;function Wt(e){let t=et(e),r=rt(e),n=nt(e),o=[t.toString(16),r.toString(16),n.toString(16)];for(let[a,s]of o.entries())s.length===1&&(o[a]="0"+s);return"#"+o.join("")}async function ue(e){let t=await new Promise((s,i)=>{let u=document.createElement("canvas"),p=u.getContext("2d");if(!p){i(new Error("Could not get canvas context"));return}let l=()=>{u.width=e.width,u.height=e.height,p.drawImage(e,0,0);let P=[0,0,e.width,e.height],d=e.dataset.area;d&&/^\d+(\s*,\s*\d+){3}$/.test(d)&&(P=d.split(/\s*,\s*/).map(b=>parseInt(b,10)));let[h,f,m,g]=P;s(p.getImageData(h,f,m,g).data)};e.complete?l():e.onload=l}),r=[];for(let s=0;s<t.length;s+=4){let i=t[s],u=t[s+1],p=t[s+2];if(t[s+3]<255)continue;let P=ft(i,u,p);r.push(P)}let n=Bt.quantize(r,128);return Q.score(n)[0]}function Ne(e,t=[]){let r=X.of(e);return{source:e,schemes:{light:yt.light(e),dark:yt.dark(e)},palettes:{primary:r.a1,secondary:r.a2,tertiary:r.a3,neutral:r.n1,neutralVariant:r.n2,error:r.error},customColors:t.map(n=>Ue(e,n))}}async function he(e,t=[]){let r=await ue(e);return Ne(r,t)}function Ue(e,t){let r=t.value,n=r,o=e;t.blend&&(r=kt.harmonize(n,o));let s=X.of(r).a1;return{color:t,value:r,light:{color:s.tone(40),onColor:s.tone(100),colorContainer:s.tone(90),onColorContainer:s.tone(10)},dark:{color:s.tone(80),onColor:s.tone(20),colorContainer:s.tone(30),onColorContainer:s.tone(90)}}}function me(e,t){let r=t?.target||document.body,o=t?.dark??!1?e.schemes.dark:e.schemes.light;if(Jt(r,o),t?.brightnessSuffix&&(Jt(r,e.schemes.dark,"-dark"),Jt(r,e.schemes.light,"-light")),t?.paletteTones){let a=t?.paletteTones??[];for(let[s,i]of Object.entries(e.palettes)){let u=s.replace(/([a-z])([A-Z])/g,"$1-$2").toLowerCase();for(let p of a){let l=`--md-ref-palette-${u}-${u}${p}`,P=Wt(i.tone(p));r.style.setProperty(l,P)}}}}function Jt(e,t,r=""){for(let[n,o]of Object.entries(t.toJSON())){let a=n.replace(/([a-z])([A-Z])/g,"$1-$2").toLowerCase(),s=Wt(o);e.style.setProperty(`--md-sys-color-${a}${r}`,s)}}plugin.onLoad(e=>{let t="";betterncm.utils.waitForElement("#main-player").then(a=>{let i=a.querySelector(".word").cloneNode(!0);i.style="transform: rotate(120deg) translate(-16px); right: 350px;",i.title="\u6253\u5F00 CppLyrics",a.appendChild(i),i.onclick=()=>{i.remove(),betterncm_native.native_plugin.call("cpplyrics.init",[])}}),setInterval(()=>{if(currentLyrics.hash===t)return;t=currentLyrics.hash;let a=currentLyrics.lyrics.filter(s=>s.dynamicLyric).map(s=>s.dynamicLyric.map(i=>`(${i.time}:${i.time+i.duration})${i.word.replaceAll("`","'")}`).join("`")+(s.translatedLyric?`|${s.translatedLyric}`:"")).join(`
`);a?betterncm_native.native_plugin.call("cpplyrics.set_lyrics",[a]):betterncm_native.native_plugin.call("cpplyrics.set_lyrics",["(0:100000)\u6682\u65E0\u9010\u8BCD\u6B4C\u8BCD"])},1e3);let r=0;legacyNativeCmder.appendRegisterCall("PlayProgress","audioplayer",(a,s)=>{r=s*1e3,betterncm_native.native_plugin.call("cpplyrics.set_time",[r,0])}),legacyNativeCmder.appendRegisterCall("PlayState","audioplayer",(a,s,i)=>{betterncm_native.native_plugin.call("cpplyrics.set_time",[r,i===2])});let n=async()=>{let a=betterncm.ncm.getPlayingSong(),s=document.createElement("img");s.src=a.data.album.picUrl;let i=await he(s);console.log(i),me(i);let u=l=>[et(l),rt(l),nt(l)],p=`${await betterncm.app.getDataPath()}/cover.jpg`;await betterncm.fs.remove(p),await betterncm.fs.writeFile(p,await fetch(s.src.replace("&thumbnail=48y48","")).then(l=>l.blob())),betterncm_native.native_plugin.call("cpplyrics.set_song_cover",[p]),betterncm_native.native_plugin.call("cpplyrics.set_song_color",[...u(i.schemes.dark.onPrimary),...u(i.schemes.dark.secondary)]),betterncm_native.native_plugin.call("cpplyrics.set_song_info",[a.data.name,a.data.artists.map(l=>l.name).join(" / ")])},o=null;setInterval(()=>{let a=document.querySelector("img.j-cover");a&&a!==o&&(a?.complete?n():a?.addEventListener("load",n),o=a)},100)});})();
/*! Bundled license information:

@material/material-color-utilities/utils/math_utils.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/utils/color_utils.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/hct/viewing_conditions.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/hct/cam16.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/hct/hct_solver.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/hct/hct.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/blend/blend.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/contrast/contrast.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/dislike/dislike_analyzer.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/dynamiccolor/dynamic_color.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/scheme/variant.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/dynamiccolor/contrast_curve.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/dynamiccolor/tone_delta_pair.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/dynamiccolor/material_dynamic_colors.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/palettes/tonal_palette.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/palettes/core_palette.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/quantize/lab_point_provider.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/quantize/quantizer_wsmeans.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/quantize/quantizer_map.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/quantize/quantizer_wu.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/quantize/quantizer_celebi.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/scheme/dynamic_scheme.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/scheme/scheme.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/scheme/scheme_android.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/temperature/temperature_cache.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/scheme/scheme_content.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/scheme/scheme_expressive.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/scheme/scheme_fidelity.js:
  (**
   * @license
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/scheme/scheme_monochrome.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/scheme/scheme_neutral.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/scheme/scheme_tonal_spot.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/scheme/scheme_vibrant.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/score/score.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/utils/string_utils.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/utils/image_utils.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/utils/theme_utils.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)

@material/material-color-utilities/index.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *      http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *)
*/
