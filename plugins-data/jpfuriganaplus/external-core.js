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
		彈: '弾', 焰: '焔', 廻: '回', 涂: '塗', 傳: '伝', 說: '説', 咒: '呪', 駈: '駆', 溯: '遡', 淚: '涙', 絕: '絶', 冲: '衝',
		闻: '聞', 极: '極', 业: '業', 门: '門', 杀: '殺', 风: '風', 汤: '湯', 爱: '愛', 梦: '夢',
		见: '見', 说: '説', 闭: '閉', 传: '伝', 归: '帰', 变: '変', 驱: '駆', 戶: '戸', 户: '戸',
		线: '線', 纸: '紙', 绘: '絵', 繪: '絵', 远: '遠', 伤: '傷', 记: '記', 忆: '憶', 與: '与',
		终: '終', 结: '結', 诗: '詩', 语: '語', 时: '時', 间: '間', 过: '過', 还: '還', 对: '対', 對: '対' };
	const kana = (s, mode) => String(s).replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
		.replace(/[ぁ-ゖ]/g, c => mode === 'katakana' ? String.fromCharCode(c.charCodeAt(0) + 0x60) : c);
	// Website and user-written katakana carry spelling information. The global
	// hiragana preference must not erase it; canonical keys still use kana().
	const writtenKana = (s, mode) => String(s).normalize('NFKC')
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
		// Ignore layout spaces between Japanese characters, but retain Latin word
		// boundaries and title punctuation (Pr ay / Pray / PRAY. stay distinct).
		return queryTitle(s).toLowerCase().replace(/\s+/g, ' ').replace(/\s+([([~])/g, '$1').replace(/\s*([-–—])\s*/g, '$1')
			.replace(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆]) +(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆])/gu, '$1');
	}
	function stripTitleNote(title) {
		const close = title[title.length - 1];
		const open = { ')': '(', ']': '[', '】': '【' }[close];
		if (!open) return title;
		let depth = 1;
		for (let i = title.length - 2; i > 0; i--) {
			if (title[i] === close) depth++;
			if (title[i] !== open || --depth !== 0) continue;
			const note = title.slice(i + 1, -1).trim();
			const work = /^(?:TV\s*)?(?:アニメ|テレビ|映画|ドラマ|劇場版|ゲーム|舞台|ミュージカル)/i.test(note) ||
				/(?:主題歌|テーマ(?:曲|ソング)|挿入歌|劇中歌|オープニング|エンディング|タイアップ|コラボ(?:曲|ソング)|CM\s*(?:曲|ソング)|18祭)/i.test(note) ||
				/(?:^|[^a-z0-9])(?:OP|ED)(?:\s*(?:曲|テーマ))?$/i.test(note);
			const version = /\b(?:feat(?:uring)?|ft|cover|remix|remaster(?:ed)?)\b|翻唱|カバー|リミックス|(?:^|\s)(?:live|acoustic)(?:\s+ver(?:sion)?\.?)?$/i.test(note);
			return work || version ? title.slice(0, i).trimEnd() : title;
		}
		return title;
	}
	function queryTitle(s) {
		let title=String(s||'').normalize('NFKC').replace(/[‘’ʼ]/g,"'").replace(/\.{3,}/g,'…').replace(/[〜～]/g,'~').trim();
		for(let i=0;i<4;i++){
			const before=title;
			let next=stripTitleNote(title);
			next=next.replace(/(?:\s+|\s*[-–—|]\s*)(?:feat(?:uring)?\.?|ft\.?)(?![a-z]).*$/i,'');
			next=next.replace(/\s+[-–—|]\s+[^\n]*(?:\bcover\b|\bremix\b|\bremaster(?:ed)?\b|翻唱|カバー|リミックス)[^\n]*$/i,'');
			next=next.replace(/(?:\s+|\s*[-–—|]\s*)(?:cover(?:ed)?|remix(?:ed)?|remaster(?:ed)?)(?![a-z])(?=\s*(?:$|by\b|\d|ver(?:sion)?\b|edition\b|[:–—-])).*$/i,'');
			next=next.replace(/(?:\s+|\s*[-–—|]\s*)(?:翻唱(?:版)?|カバー|リミックス).*$/i,'').trim();
			if(next)title=next;if(title===before)break;
		}
		return title.replace(/./gu,c=>VARIANTS[c]||c).trim();
	}
	function partialTitles(s) {
		const title = queryTitle(s), chars = Array.from(title);
		if (chars.length < 12) return [];
		const length = Math.min(10, Math.floor(chars.length / 2));
		let fragments = [chars.slice(0, length).join(''), chars.slice(-length).join('')];
		if (!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(title)) {
			// Keep Latin words intact: Lil’ Goldfish can fall back to Goldfish,
			// but a short/single-word title such as Pray gets no broad query.
			const words = title.split(/\s+/);
			if (words.length < 2) return [];
			const take = list => {
				let text = list[0];
				for (const word of list.slice(1)) {
					if (Array.from(text + ' ' + word).length > length) break;
					text += ' ' + word;
				}
				return text;
			};
			fragments = [take(words), take([...words].reverse()).split(' ').reverse().join(' ')];
		}
		return [...new Set(fragments.map(text => text.trim()))]
			.filter(text => Array.from(text).filter(c => /[\p{L}\p{N}]/u.test(c)).length >= 6 && titleKey(text) !== titleKey(title));
	}
	function utatenURL(value){
		try{const input=String(value||'').trim();if(input.length>2048)throw new Error('URL too long');const u=new URL(input);
			if(allowedURL(u.href)&&['utaten.com','www.utaten.com'].includes(u.hostname)&&/^\/lyric\/[a-z0-9_-]{1,128}\/?$/i.test(u.pathname))return 'https://utaten.com'+u.pathname.replace(/\/?$/,'/');
		}catch(_){}
		throw new Error('请输入有效的 UtaTen 歌词页链接（https://utaten.com/lyric/…/）');
	}
	function matches(candidate, track) {
		const artistKeys=value=>String(value||'').normalize('NFKC').split(/\s+(?:feat(?:uring)?\.?|ft\.?)(?![a-z])\s*/i).flatMap(part=>[
			part,part.replace(/\([^()]*\)/g,''),...[...part.matchAll(/\(([^()]*)\)/g)].map(m=>m[1].replace(/^\s*CV\s*[.:：]?\s*/i,''))
		]).map(s=>indexed(s,LYRIC_VARIANTS).key).filter(Boolean);
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
		const seen = new Set();
		const selector = provider === 'utaten' ? '.searchResult__title a[href]' : 'a[href^="/song/"]';
		for (const a of doc.querySelectorAll(selector)) {
			const row = a.closest('tr');
			if (!row) continue;
			const artistNodes = row.querySelectorAll(provider === 'utaten' ? '.searchResult__artist > p a' : 'a[href^="/artist/"]');
			const title = (a.querySelector('.songlist-title') || a).textContent.trim();
			let url;
			try {
				url = new URL(a.getAttribute('href'), provider === 'utaten' ? 'https://utaten.com/' : 'https://www.uta-net.com/').href;
				if (provider === 'utaten') url = utatenURL(url);
			} catch (_) { continue; }
			if (!allowedURL(url) || !title || seen.has(url)) continue;
			seen.add(url);
			const candidate = { title, artists: [...artistNodes].map(n => n.textContent.trim()), url };
			if (provider === 'utaten') candidate.preview = row.querySelector('.lyricList__beginning a')?.textContent.trim() || '';
			output.push(candidate);
		}
		return output;
	}
	function nextUtatenSearchPage(doc, currentURL) {
		const href = doc.querySelector('link[rel~="next"][href]')?.getAttribute('href');
		if (!href) return null;
		try {
			const current = new URL(currentURL);
			const next = new URL(href, current);
			if (!allowedURL(next.href) || !['utaten.com', 'www.utaten.com'].includes(next.hostname)) return null;
			let params;
			if (next.pathname.startsWith('/search/=/')) {
				params = new URLSearchParams(next.pathname.slice('/search/=/'.length).replace(/\//g, '&'));
			} else if (next.pathname === '/search' || next.pathname === '/search/') {
				params = next.searchParams;
			} else return null;
			const page = Number(current.searchParams.get('page') || 1) + 1;
			if (!Number.isSafeInteger(page) || Number(params.get('page')) !== page ||
				!['title','artist_name','body'].some(field=>current.searchParams.get(field)) ||
				['title','artist_name','body'].some(field=>field==='title'
					? titleKey(params.get(field))!==titleKey(current.searchParams.get(field))
					: (params.get(field)||'')!==(current.searchParams.get(field)||''))) return null;
			// Only use the site's next-page number, preserving the original query.
			current.searchParams.set('page', String(page));
			return current.href;
		} catch (_) { return null; }
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
					const text = rb.textContent, reading = writtenKana(rt.textContent.trim());
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
		// The global lyrics page appends the romanized title in parentheses.
		const withoutRomaji = title.normalize('NFKC').replace(/\s*\([\p{Script=Latin}\d\s.'’!?&,\-]+\)\s*$/u, '');
		const expected = titleKey(candidate.title);
		if (!title || !artists.length || (titleKey(title) !== expected && titleKey(withoutRomaji) !== expected)) throw new Error('歌ネット歌曲信息无法核对');
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
				annotations.push({ start: startAt, end: endAt, rt: writtenKana(s.rt, mode) });
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
				atoms.push({from:offset,to:offset+chars.length,reading:writtenKana(segment.rt,'hiragana'),annotated:true});
			} else for(let i=0;i<chars.length;i++) {
				const c=writtenKana(chars[i],'hiragana');atoms.push({from:offset+i,to:offset+i+1,reading:/^[ぁ-ゖァ-ヺー]$/.test(c)?c:null,annotated:false});
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
			output.push(chunk.hidden?{text:target.slice(start,end),hidden:true}:{text:target.slice(start,end),rt:writtenKana(chunk.reading,mode)});cursor=end;used=used||!chunk.hidden;
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
	function exactLineCandidates(needle,groups,scope) {
		if(!groups.exact) {
			groups.exact=new Map();
			for(const g of groups){if(!groups.exact.has(g.key))groups.exact.set(g.key,[]);groups.exact.get(g.key).push(g);}
		}
		return (groups.exact.get(needle)||[]).filter(g=>!scope || (scope.confirmed ?
			g.start===scope.first&&g.start+g.count===scope.last :
			g.start>=scope.first&&g.start+g.count<=scope.last)).map(g=>({g,at:0}));
	}
	function resolveSegments(target, groups, mode, fromRomaji, contextKey, exactOnly=false) {
		const needle = indexed(target).key;
		if (!needle) return null;
		const scopes=groups.context && groups.context.get(contextKey || needle);
		const candidates=[],seen=new Set();
		for(const scope of scopes || [null]){
			const found=exactOnly?exactLineCandidates(needle,groups,scope):lineCandidates(needle,groups,scope);
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
			const sameText=at===0 && g.text===target && segments && (segments.some(s=>s.rt)||!core.hasKanji(target)&&core.hasKatakana(target));
			const result = !segments ? null : sameText ? segments.map(s=>s.rt?{...s,rt:writtenKana(s.rt,mode)}:{...s}) : mapped ? projectAligned(target, prepared, mode) : project(target, prepared, at, mode);
			if (result && result.map(s => s.text).join('') === target) versions.set(JSON.stringify(result), result);
			else return null;
			if(versions.size>1)return null;
		}
		// Repeated identical text with different readings is ambiguous without timestamps.
		return versions.size === 1 ? versions.values().next().value : null;
	}
	function restoreInlineNotes(target, matched, removed) {
		const hidden=[];let delta=0;
		for(const r of removed){hidden.push({at:r.mid-delta,text:target.slice(r.mid,r.to)});delta+=r.to-r.mid;}
		const output=[];let pos=0,next=0;
		for(const segment of matched) {
			const end=pos+segment.text.length;let cut=pos;
			while(next<hidden.length&&hidden[next].at<=end) {
				const h=hidden[next];if(segment.rt&&h.at>pos&&h.at<end)return null;
				if(h.at>cut)output.push({...segment,text:segment.text.slice(cut-pos,h.at-pos)});
				output.push({text:h.text,hidden:true});cut=h.at;next++;
			}
			if(cut<end)output.push({...segment,text:segment.text.slice(cut-pos)});pos=end;
		}
		if(next!==hidden.length||output.map(s=>s.text).join('')!==target)return null;
		// Text similarity alone must not erase a chorus. Require either the
		// website reading or an independently confirmed dictionary annotation.
		// Original inline notes are applied after matching, before manual edits.
		const confirmed=core.inlineRubyRanges(target,output).filter(r=>r.confirmed);
		if(!removed.every(r=>r.confirmed||confirmed.some(c=>c.mid===r.mid&&c.to===r.to)))return null;
		return output;
	}
	function segmentsFor(target, groups, mode, fromRomaji, options={}) {
		const normalize=result=>result&&core.normalizeInlineRuby(result,{...options,kana:mode,preferInline:true});
		const candidates=core.inlineRubyRanges(target,options.proofSegments);
		if(!candidates.length)return normalize(resolveSegments(target,groups,mode,fromRomaji));
		let notes=candidates;
		if(options.reading&&options.proofSegments) {
			const guided=core.resolveInlineRubyReading(options.proofSegments,options.reading,{kana:mode});
			if(guided) {
				let at=0;const hidden=[];for(const s of guided){if(s.hidden)hidden.push([at,at+s.text.length]);at+=s.text.length;}
				notes=notes.filter(r=>hidden.some(([a,b])=>a<=r.mid&&b>=r.to));
			}
		}
		const views=core.inlineRubyVariants(notes).map(removed=>{
			let text='',cursor=0;for(const r of removed){text+=target.slice(cursor,r.mid);cursor=r.to;}text+=target.slice(cursor);
			return {removed,text};
		});
		const contextKey=indexed(target).key;
		let best=Infinity;const results=new Map();
		for(const view of views) {
			if(view.removed.length>best)break;
			const matched=resolveSegments(view.text,groups,mode,fromRomaji,contextKey,true);
			const result=matched&&restoreInlineNotes(target,matched,view.removed);
			if(result){best=view.removed.length;results.set(JSON.stringify(result),result);}
		}
		if(results.size)return results.size===1?normalize(results.values().next().value):null;
		// Approximate line matching remains bounded: do not run the spelling
		// alignment once for every possible parenthesis combination.
		for(const removed of [notes.filter(r=>r.confirmed),notes]) {
			if(!removed.length)continue;
			const view=views.find(v=>v.removed.length===removed.length&&v.removed.every(r=>removed.includes(r)));
			if(!view)continue;
			const matched=resolveSegments(view.text,groups,mode,fromRomaji,contextKey);
			const result=matched&&restoreInlineNotes(target,matched,removed);if(result)return normalize(result);
		}
		return normalize(resolveSegments(target,groups,mode,fromRomaji));
	}

	const lyricKey = text => kana(indexed(text).key, 'hiragana');
	function lyricTexts(lines) {
		return (lines || []).filter(s => typeof s === 'string' && s.length <= 4000 && !core.isCreditLine(s) &&
			!/^\s*(?:origin|vocal|lyrics|composer|arrange(?:ment)?|原曲)\s*[:：]/i.test(s)).slice(0, 2000);
	}
	function comparisonText(text) {
		// Search/comparison only; the displayed text and chorus parentheses are
		// never rewritten. Keep repeats such as 遠く(遠く), which contain kanji.
		return text.normalize('NFKC').replace(/([\p{Script=Han}々]+)\s*\([ぁ-ゖァ-ヺー\s・]+\)/gu, '$1');
	}
	function lyricKeys(lines) { return lyricTexts(lines).map(s => lyricKey(comparisonText(s))); }
	function lyricSearchQueries(lines) {
		const pool = [];
		for (const [line, text] of lyricTexts(lines).entries()) {
			const clean = comparisonText(text).replace(/./gu, c => LYRIC_VARIANTS[c] || c);
			for (const run of clean.match(/[\p{Script=Han}ぁ-ゖァ-ヺー]+/gu) || []) {
				if (run.length < 8) continue;
				const value = run.slice(0, 20), diversity = new Set(value).size;
				if (diversity < 6) continue;
				pool.push({ value, line, score: value.length * .5 + diversity * .6 + (value.match(/\p{Script=Han}/gu) || []).length * .8 });
			}
		}
		pool.sort((a, b) => b.score - a.score || a.line - b.line);
		const selected = [];
		for (const entry of pool) {
			if (selected.some(p => p.line === entry.line || p.value.includes(entry.value) || entry.value.includes(p.value))) continue;
			selected.push(entry); if (selected.length === 6) break;
		}
		return selected.map(p => 'https://utaten.com/search?body=' + encodeURIComponent(p.value));
	}
	function matchingPreviews(lines, candidates) {
		const lyrics = lyricKeys(lines).join('');
		return candidates.filter(({ preview }) => {
			const snippet = preview ? lyricKey(comparisonText(preview)) : '';
			return snippet.length >= 24 && lyrics.includes(snippet);
		});
	}
	function lyricEvidence(lines, record) {
		const originals = lyricTexts(lines), sourceLines = lyricTexts(record.lines.map(l => l.text));
		const keys = lyricKeys(originals), source = lyricKeys(sourceLines).join(''), target = keys.join('');
		const targets = [...new Set(keys)].filter(s => s.length >= 8 && /[ぁ-ゖ一-龯]/.test(s));
		const found = targets.filter(t => source.includes(t));
		const characters = found.reduce((n, s) => n + s.length, 0);
		const grams = text => { const set = new Set(); for (let i = 0; i < text.length - 2; i++) set.add(text.slice(i, i + 3)); return set; };
		const a = grams(target), b = grams(source); let common = 0; for (const gram of a) if (b.has(gram)) common++;
		const coverage = a.size ? common / a.size : 0, sourceCoverage = b.size ? common / b.size : 0;
		const lineCoverage = characters / (targets.reduce((n, s) => n + s.length, 0) || 1);
		// A full-stream equality is stronger than any number of isolated excerpts.
		// With inline readings, also require the website ruby at the same offset;
		// merely deleting a possible vocal repeat must not trigger an early return.
		let complete = !!target && originals.map(lyricKey).join('') === sourceLines.map(lyricKey).join('');
		if (!complete && target && target === source && record.provider === 'utaten') {
			const ruby = []; let offset = 0;
			for (const l of record.lines) {
				if (!lyricTexts([l.text]).length) continue;
				for (const s of l.segments) { const length = lyricKey(s.text).length; if (s.rt) ruby.push({ start: offset, end: offset + length, rt: kana(s.rt, 'hiragana') }); offset += length; }
			}
			let at = 0; complete = true;
			for (const text of originals) {
				const normalized = text.normalize('NFKC'); let removed = 0;
				for (const m of normalized.matchAll(/([\p{Script=Han}々]+)\s*\(([ぁ-ゖァ-ヺー\s・]+)\)/gu)) {
					const end = at + lyricKey(normalized.slice(0, m.index) + m[1]).length - removed, start = end - lyricKey(m[1]).length;
					const rt = kana(m[2].replace(/[\s・]/g, ''), 'hiragana');
					if (!ruby.some(r => r.start === start && r.end === end && r.rt === rt)) complete = false;
					removed += lyricKey(m[0]).length - lyricKey(m[1]).length;
				}
				at += lyricKey(comparisonText(text)).length;
			}
		}
		const accepted = complete && target.length >= 24 || found.length >= 2 && characters >= 24 && coverage >= .35 || a.size >= 60 && coverage >= .65;
		const harmonic = coverage + sourceCoverage ? 2 * coverage * sourceCoverage / (coverage + sourceCoverage) : 0;
		return { hits: found.length, characters, accepted, complete, coverage, sourceCoverage,
			score: complete ? 1 : .6 * coverage + .2 * harmonic + .2 * lineCoverage, localCharacters: target.length, sourceCharacters: source.length };
	}
	return { key, titleKey, queryTitle, partialTitles, matches, allowedURL, utatenURL, searchURL, searchResults, nextUtatenSearchPage, parseUtaten, parseUtanet, validRecord, prepare, segmentsFor, kana, writtenKana, matchingPreviews, lyricEvidence, lyricSearchQueries };
});
