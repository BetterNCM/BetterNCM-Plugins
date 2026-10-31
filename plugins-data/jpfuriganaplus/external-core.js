/* External lyric parsing and conservative alignment. No network or persistent state. */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory(require('./furigana.js'));
	else root.FuriganaPlusExternalCore = factory(root.FuriganaPlusCore);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
	'use strict';
	const VARIANTS = core.LOOKUP_VARIANTS;
	// Only compare lyrics this way: preserve original glyphs/offsets, and do not
	// rewrite search titles such as 廻廻奇譚 or broaden song/artist verification.
	const LYRIC_VARIANTS = { ...VARIANTS,
		彈: '弾', 焰: '焔', 廻: '回', 涂: '塗', 傳: '伝', 說: '説', 咒: '呪', 駈: '駆', 溯: '遡', 淚: '涙', 絕: '絶', 冲: '衝' };
	const kana = (s, mode) => String(s).replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
		.replace(/[ぁ-ゖ]/g, c => mode === 'katakana' ? String.fromCharCode(c.charCodeAt(0) + 0x60) : c);
	function indexed(text, variants = LYRIC_VARIANTS) {
		let key = '', positions = [];
		let offset = 0;
		for (const char of text) {
			for (const c of char.normalize('NFKC').toLowerCase()) {
				if (/[\p{L}\p{N}]/u.test(c)) {
					const normalized = variants[c] || c;
					key += normalized;
					for (let i = 0; i < normalized.length; i++) positions.push({ start: offset, end: offset + char.length });
				}
			}
			offset += char.length;
		}
		return { key, positions };
	}
	const key = s => indexed(String(s || ''), VARIANTS).key;
	function titleKey(s) {
		return key(queryTitle(s));
	}
	function queryTitle(s) {
		let title=String(s||'').normalize('NFKC').trim();
		for(let i=0;i<4;i++){
			const before=title;
			let next=title.replace(/(?:\s*\([^()]*\))+\s*$/,'').replace(/\s*[【\[][^【】\[\]]*(?:feat\.?|ft\.?|cover|remix|翻唱|カバー|リミックス)[^【】\[\]]*[】\]]\s*$/i,'');
			next=next.replace(/(?:\s+|\s*[-–—|]\s*)(?:feat(?:uring)?\.?|ft\.?)(?![a-z]).*$/i,'');
			next=next.replace(/\s+[-–—|]\s+[^\n]*(?:\bcover\b|\bremix\b|\bremaster(?:ed)?\b|翻唱|カバー|リミックス)[^\n]*$/i,'');
			next=next.replace(/(?:\s+|\s*[-–—|]\s*)(?:cover(?:ed)?|remix(?:ed)?|remaster(?:ed)?)(?![a-z])(?=\s*(?:$|by\b|\d|ver(?:sion)?\b|edition\b|[:–—-])).*$/i,'');
			next=next.replace(/(?:\s+|\s*[-–—|]\s*)(?:翻唱(?:版)?|カバー|リミックス).*$/i,'').trim();
			if(next)title=next;if(title===before)break;
		}
		return title.replace(/[.…]+\s*$/, '').replace(/./gu,c=>VARIANTS[c]||c).trim();
	}
	function utatenURL(value){
		try{const input=String(value||'').trim();if(input.length>2048)throw new Error('URL too long');const u=new URL(input);
			if(allowedURL(u.href)&&['utaten.com','www.utaten.com'].includes(u.hostname)&&/^\/lyric\/[a-z0-9_-]{1,128}\/?$/i.test(u.pathname))return 'https://utaten.com'+u.pathname.replace(/\/?$/,'/');
		}catch(_){}
		throw new Error('请输入有效的 UtaTen 歌词页链接（https://utaten.com/lyric/…/）');
	}
	function matches(candidate, track) {
		const artistKeys=value=>String(value||'').split(/\s+(?:feat(?:uring)?\.?|ft\.?)(?![a-z])\s*/i).map(key).filter(Boolean);
		return titleKey(candidate.title) === titleKey(track.title) && !!titleKey(track.title) &&
			(track.artists || []).some(a => artistKeys(a).some(k=>(candidate.artists||[]).some(b=>artistKeys(b).includes(k))));
	}
	function allowedURL(value) {
		try {
			const u = new URL(value);
			return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') &&
				['utaten.com', 'www.utaten.com', 'www.uta-net.com', 'uta-net.com'].includes(u.hostname);
		} catch (_) { return false; }
	}
	function searchURL(provider, track, titleOnly = false) {
		const title = queryTitle(track.title);
		if (!title || title.length > 200) throw new Error('缺少可搜索的歌名');
		return provider === 'utaten'
			? 'https://utaten.com/search?title=' + encodeURIComponent(title) + (titleOnly ? '' : '&artist_name=' + encodeURIComponent(track.artists[0] || ''))
			: 'https://www.uta-net.com/search/?Aselect=2&Bselect=3&Keyword=' + encodeURIComponent(title);
	}
	function searchResults(doc, provider) {
		const output = [];
		const selector = provider === 'utaten' ? '.searchResult__title a[href]' : 'a[href^="/song/"]';
		for (const a of doc.querySelectorAll(selector)) {
			const row = a.closest('tr');
			if (!row) continue;
			const artistNodes = row.querySelectorAll(provider === 'utaten' ? '.searchResult__artist > p a' : 'a[href^="/artist/"]');
			const title = (a.querySelector('.songlist-title') || a).textContent.trim();
			const url = new URL(a.getAttribute('href'), provider === 'utaten' ? 'https://utaten.com/' : 'https://www.uta-net.com/').href;
			if (!allowedURL(url) || !title || output.some(x => x.url === url)) continue;
			output.push({ title, artists: [...artistNodes].map(n => n.textContent.trim()), url });
		}
		return output;
	}
	function textLines(el) {
		if (!el) return [];
		const copy = el.cloneNode(true);
		for (const n of copy.querySelectorAll('script,style,iframe')) n.remove();
		for (const n of copy.querySelectorAll('br')) n.replaceWith('\n');
		return copy.textContent.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
	}
	function parseUtaten(doc, url) {
		const block = doc.querySelector('.lyricBody .hiragana');
		if (!block) throw new Error('UtaTen 页面没有振假名歌词');
		const titleNode = doc.querySelector('.newLyricTitle__main');
		const titleCopy = titleNode && titleNode.cloneNode(true);
		if (titleCopy) for (const n of titleCopy.querySelectorAll('span')) n.remove();
		const title = titleCopy ? titleCopy.textContent.trim() : '';
		const artists = [...doc.querySelectorAll('h3 a[href^="/artist/"]')].map(n => n.textContent.trim());
		const lines = [];
		let segments = [];
		function flush() {
			if (!segments.length) return;
			segments[0].text = segments[0].text.trimStart();
			segments[segments.length - 1].text = segments[segments.length - 1].text.trimEnd();
			segments = segments.filter(s => s.text);
			const text = segments.map(s => s.text).join('');
			if (text) lines.push({ text, segments });
			segments = [];
		}
		function walk(node) {
			if (node.nodeType === 3) {
				const text = node.textContent.replace(/[\r\n]+/g, '');
				if (text) segments.push({ text });
				return;
			}
			if (node.nodeType !== 1 || /^(SCRIPT|STYLE|IFRAME)$/.test(node.nodeName)) return;
			if (node.nodeName === 'BR') { flush(); return; }
			if (node.classList.contains('ruby') || node.nodeName === 'RUBY') {
				const rb = node.querySelector('.rb, rb'), rt = node.querySelector('.rt, rt');
				if (rb && rt) {
					const text = rb.textContent, reading = kana(rt.textContent.trim());
					segments.push(/^[ぁ-ゖァ-ヶー\s・]+$/.test(reading) ? { text, rt: reading.replace(/[\s・]/g, '') } : { text });
					return;
				}
			}
			for (const child of node.childNodes) walk(child);
		}
		walk(block); flush();
		if (!lines.some(l => l.segments.some(s => s.rt))) throw new Error('UtaTen 没有可用读音');
		return { provider: 'utaten', url, title, artists, lines };
	}
	function parseUtanet(doc, url, candidate) {
		const jp = textLines(doc.querySelector('#kashi-area'));
		const roma = textLines(doc.querySelector('#kashi-area-roma'));
		if (!jp.length || jp.length !== roma.length) throw new Error('歌ネット日文与罗马音行数不一致');
		const artists = [...doc.querySelectorAll('h1 .artist-name')].map(n => n.textContent.trim());
		const heading = doc.querySelector('h1 > span:first-child');
		const title = heading ? heading.textContent.trim() : '';
		if (!title || !artists.length || titleKey(title) !== titleKey(candidate.title)) throw new Error('歌ネット歌曲信息无法核对');
		return { provider: 'utanet', url, title: candidate.title, artists, lines: jp.map((text, i) => ({ text, romaji: roma[i] })) };
	}
	function validRecord(record, id) {
		if (record && record.schema === 1 && record.songId === String(id) && record.provider === 'local') return record.url === '' && Array.isArray(record.lines) && record.lines.length === 0 && typeof record.title === 'string' && Array.isArray(record.artists) && record.artists.every(a => typeof a === 'string');
		if (!record || record.schema !== 1 || record.songId !== String(id) || !['utaten', 'utanet'].includes(record.provider) || !allowedURL(record.url)) return false;
		if (new URL(record.url).hostname.replace(/^www\./, '') !== (record.provider === 'utaten' ? 'utaten.com' : 'uta-net.com')) return false;
		if (!Array.isArray(record.lines) || !record.lines.length || record.lines.length > 2000) return false;
		if (typeof record.title !== 'string' || !Array.isArray(record.artists) || !record.artists.every(a => typeof a === 'string')) return false;
		return record.lines.every(l => {
			if (!l || typeof l.text !== 'string' || !l.text || l.text.length > 4000) return false;
			if (record.provider === 'utanet') return typeof l.romaji === 'string' && l.romaji.length <= 8000;
			return Array.isArray(l.segments) && l.segments.length <= 4000 && l.segments.every(s => s && typeof s.text === 'string' &&
				(s.rt == null || typeof s.rt === 'string' && /^[ぁ-ゖァ-ヶー]+$/.test(s.rt))) && l.segments.map(s => s.text).join('') === l.text;
		});
	}
	function prepare(record, originals) {
		const groups = [];
		for (let i = 0; i < record.lines.length; i++) {
			for (let count = 1; count <= 3 && i + count <= record.lines.length; count++) {
				const lines = record.lines.slice(i, i + count);
				const text = lines.map(l => l.text).join('');
				const index = indexed(text);
				groups.push({ ...index, text, start:i, segments: record.provider === 'utaten' ? lines.flatMap(l => l.segments) : null,
					romaji: record.provider === 'utanet' ? lines.map(l => l.romaji).join(' ') : null, count });
			}
		}
		groups.context = lineContext(groups, originals);
		return groups;
	}
	function lineContext(groups, originals) {
		if (!Array.isArray(originals) || originals.length > 2000) return null;
		const rows = originals.map(l => typeof l === 'string' ? l : l && l.text).filter(s => typeof s==='string' && s.length<=4000 && !core.isCreditLine(s)).map(s => indexed(s).key).filter(Boolean);
		const occurrences = new Map(), sources = new Map();
		rows.forEach((k,i) => { if (!occurrences.has(k)) occurrences.set(k,[]); occurrences.get(k).push(i); });
		for (const g of groups) { if (!sources.has(g.key)) sources.set(g.key,[]); sources.get(g.key).push(g); }
		const anchors = [];
		rows.forEach((k,i) => {
			const found = sources.get(k);
			if (k.length >= 4 && occurrences.get(k).length === 1 && found && found.length === 1) anchors.push({row:i,group:found[0]});
		});
		const context = new Map();let cursor=0,left=null;
		for (let row=0;row<rows.length;row++) {
			const k=rows[row];if(!context.has(k))context.set(k,[]);
			while(cursor<anchors.length && anchors[cursor].row<row)left=anchors[cursor++];
			// A line cannot prove its own position; an exact occurrence elsewhere in
			// the song must not override the surrounding lines of this verse.
			const right=anchors[cursor+(anchors[cursor] && anchors[cursor].row===row?1:0)];
			if(!left || !right){context.get(k).push(null);continue;}
			const first=left.group.start+left.group.count,last=right.group.start;
			if(first>last){context.get(k).push(null);continue;}
			context.get(k).push({first,last,confirmed:right.row-left.row===2 && last>first && last-first<=3});
		}
		for(const [k,scopes] of context)context.set(k,[...new Map(scopes.map(s=>[JSON.stringify(s),s])).values()]);
		return context;
	}
	function project(target, group, from, mode) {
		const ti = indexed(target), until = from + ti.key.length;
		const annotations = [];
		let offset = 0;
		for (const s of group.segments) {
			const index = indexed(s.text), length = index.key.length;
			const end = offset + length;
			if (s.rt && length && end > from && offset < until) {
				// Never cut a ruby unit in half to guess a per-character reading.
				if (offset < from || end > until) return null;
				const startAt = ti.positions[offset - from].start;
				const endAt = ti.positions[end - from - 1].end;
				annotations.push({ start: startAt, end: endAt, rt: kana(s.rt, mode) });
			}
			offset = end;
		}
		if (!annotations.length) return null;
		const output = []; let cursor = 0;
		for (const a of annotations) {
			if (a.start > cursor) output.push({ text: target.slice(cursor, a.start) });
			output.push({ text: target.slice(a.start, a.end), rt: a.rt }); cursor = a.end;
		}
		if (cursor < target.length) output.push({ text: target.slice(cursor) });
		return output;
	}
	// Score candidate lines with bounded memory; only build a full alignment for
	// the selected candidates. This is lyric correspondence, never song search.
	function distance(a,b) {
		let previous=Uint16Array.from({length:b.length+1},(_,j)=>j), row=new Uint16Array(b.length+1);
		for(let i=1;i<=a.length;i++) {
			row[0]=i;
			for(let j=1;j<=b.length;j++) row[j]=Math.min(previous[j]+1,row[j-1]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));
			[previous,row]=[row,previous];
		}
		return previous[b.length];
	}
	function similarLines(needle, groups) {
		const target=Array.from(needle), candidates=[];
		if (!target.length || target.length>256) return [];
		for (const g of groups) {
			const source=Array.from(g.key), length=Math.max(target.length,source.length);
			if (length<10 || length>256 || Math.abs(target.length-source.length)>Math.floor(length*.2)) continue;
			// The multiset intersection is an inexpensive upper bound on matches.
			const counts=new Map();for(const c of source)counts.set(c,(counts.get(c)||0)+1);
			let common=0;for(const c of target)if(counts.get(c)>0){common++;counts.set(c,counts.get(c)-1);}
			if(common<Math.max(8,Math.ceil(length*.8)))continue;
			const edits=distance(source,target);
			if(edits<=Math.floor(length*.2))candidates.push({g,at:0,mapped:true,score:edits/length});
		}
		const best=Math.min(...candidates.map(c=>c.score));
		return candidates.filter(c=>c.score<=best+.04);
	}
	function projectAligned(target, group, mode) {
		const original=indexed(target), source=Array.from(group.key), dest=Array.from(original.key), m=source.length, n=dest.length;
		if(!m || !n || m>256 || n>256 || !group.segments)return null;
		const width=n+1, size=(m+1)*width, forward=new Uint16Array(size), backward=new Uint16Array(size);
		for(let i=0;i<=m;i++)forward[i*width]=i;
		for(let j=0;j<=n;j++)forward[j]=j;
		for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)forward[i*width+j]=Math.min(forward[(i-1)*width+j]+1,forward[i*width+j-1]+1,forward[(i-1)*width+j-1]+(source[i-1]===dest[j-1]?0:1));
		for(let i=m;i>=0;i--)backward[i*width+n]=m-i;
		for(let j=n;j>=0;j--)backward[m*width+j]=n-j;
		for(let i=m-1;i>=0;i--)for(let j=n-1;j>=0;j--)backward[i*width+j]=Math.min(backward[(i+1)*width+j]+1,backward[i*width+j+1]+1,backward[(i+1)*width+j+1]+(source[i]===dest[j]?0:1));
		const total=forward[m*width+n], lo=new Uint16Array(m+1), hi=new Uint16Array(m+1);
		for(let i=0;i<=m;i++) {
			lo[i]=n;
			for(let j=0;j<=n;j++)if(forward[i*width+j]+backward[i*width+j]===total){lo[i]=Math.min(lo[i],j);hi[i]=j;}
		}
		const atoms=[];let offset=0;
		for(const segment of group.segments) {
			const chars=Array.from(indexed(segment.text).key);
			if(segment.hidden && chars.length) {
				atoms.push({from:offset,to:offset+chars.length,reading:'',annotated:false,hidden:true});
			} else if(segment.rt && chars.length) {
				atoms.push({from:offset,to:offset+chars.length,reading:kana(segment.rt,'hiragana'),annotated:true});
			} else for(let i=0;i<chars.length;i++) {
				const c=kana(chars[i],'hiragana');atoms.push({from:offset+i,to:offset+i+1,reading:/^[ぁ-ゖー]$/.test(c)?c:null,annotated:false});
			}
			offset+=chars.length;
		}
		if(offset!==m)return null;
		const chunks=[];
		for(const atom of atoms) {
			const chunk={...atom,start:lo[atom.from],end:hi[atom.to]}, last=chunks[chunks.length-1];
			chunk.changed=source.slice(atom.from,atom.to).join('')!==dest.slice(chunk.start,chunk.end).join('');
			// All optimal paths contribute boundary ranges. Overlap or deletion means
			// the words cannot be split reliably: retain one complete website reading.
			if(last && (chunk.start<last.end || chunk.start===chunk.end || last.start===last.end)) {
				last.to=chunk.to;last.end=Math.max(last.end,chunk.end);last.reading=last.reading!==null&&chunk.reading!==null?last.reading+chunk.reading:null;
				last.annotated=last.annotated||chunk.annotated;last.hidden=last.hidden&&chunk.hidden;last.changed=true;
			} else chunks.push(chunk);
		}
		const positions=[];let unit=0;
		for(const c of dest){positions.push({start:original.positions[unit].start,end:original.positions[unit+c.length-1].end});unit+=c.length;}
		const output=[];let cursor=0,used=false;
		for(const chunk of chunks) {
			if(!chunk.hidden && (!chunk.reading || !chunk.annotated && !chunk.changed) || chunk.start===chunk.end)continue;
			let start=positions[chunk.start].start,end=positions[chunk.end-1].end;
			if(chunk.hidden && /[（(]/.test(target[start-1]||'') && /[）)]/.test(target[end]||'')){start--;end++;}
			if(start<cursor)return null;
			if(start>cursor)output.push({text:target.slice(cursor,start)});
			output.push(chunk.hidden?{text:target.slice(start,end),hidden:true}:{text:target.slice(start,end),rt:kana(chunk.reading,mode)});cursor=end;used=used||!chunk.hidden;
		}
		if(cursor<target.length)output.push({text:target.slice(cursor)});
		return used?output:null;
	}
	function lineCandidates(needle, groups, scope) {
		const permitted=scope?groups.filter(g=>g.start>=scope.first && g.start+g.count<=scope.last):groups;
		if(scope && scope.confirmed)return permitted.filter(g=>g.start===scope.first && g.start+g.count===scope.last).map(g=>({g,at:0,mapped:g.key!==needle}));
		let candidates=permitted.filter(g=>g.key===needle).map(g=>({g,at:0}));
		if(!candidates.length && needle.length>=6)for(const g of permitted){
			if(g.count!==1)continue;
			let at=g.key.indexOf(needle);
			while(at>=0){candidates.push({g,at});at=g.key.indexOf(needle,at+1);}
		}
		return candidates.length?candidates:similarLines(needle,permitted);
	}
	function segmentsFor(target, groups, mode, fromRomaji) {
		const needle = indexed(target).key;
		if (!needle) return null;
		const scopes=groups.context && groups.context.get(needle);
		const candidates=[],seen=new Set();
		for(const scope of scopes || [null]){
			const found=lineCandidates(needle,groups,scope);
			if(!found.length)return null;
			for(const candidate of found){const id=[candidate.g.start,candidate.g.count,candidate.at,!!candidate.mapped].join('|');if(!seen.has(id)){seen.add(id);candidates.push(candidate);}}
		}
		const versions = new Map(), resolved = new Set();
		for (const { g, at, mapped } of candidates) {
			const signature=JSON.stringify([g.text,g.segments||g.romaji,at,!!mapped]);
			if(resolved.has(signature))continue;
			if(resolved.size>=128)return null;
			resolved.add(signature);
			const segments=g.segments || fromRomaji && fromRomaji(g.text,g.romaji), prepared={...g,segments};
			const sameText=at===0 && g.text===target && segments && segments.some(s=>s.rt);
			const result = !segments ? null : sameText ? segments.map(s=>s.rt?{...s,rt:kana(s.rt,mode)}:{...s}) : mapped ? projectAligned(target, prepared, mode) : project(target, prepared, at, mode);
			if (result && result.map(s => s.text).join('') === target) versions.set(JSON.stringify(result), result);
			else return null;
			if(versions.size>1)return null;
		}
		// Repeated identical text with different readings is ambiguous without timestamps.
		return versions.size === 1 ? versions.values().next().value : null;
	}
	function lyricEvidence(lines, record) {
		const normalize = s => indexed(s).key;
		const targets = [...new Set((lines || []).filter(s => typeof s === 'string' && !/作詞|作曲|編曲|作词|作曲|编曲|lyrics|composer|arrang/i.test(s)).map(normalize))].filter(s => s.length >= 8 && /[ぁ-ゖァ-ヶ一-龯]/.test(s));
		const sources = prepare(record).map(g => g.key);
		const found = targets.filter(t => sources.some(s => s === t || t.length >= 12 && s.includes(t)));
		const characters = found.reduce((n, s) => n + s.length, 0);
		return { hits: found.length, characters, accepted: found.length >= 2 && characters >= 24 && found.length / Math.min(8, targets.length) >= .25 };
	}
	return { key, titleKey, queryTitle, matches, allowedURL, utatenURL, searchURL, searchResults, parseUtaten, parseUtanet, validRecord, prepare, segmentsFor, kana, lyricEvidence };
});
