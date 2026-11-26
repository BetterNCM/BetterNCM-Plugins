/* Lazy browser website client and verified BetterNCM filesystem persistence. */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) module.exports = factory(require('./external-core.js'), require('./user-edits.js'));
	else root.FuriganaExternal = factory(root.FuriganaExternalCore, root.FuriganaUserEdits);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core, edits) {
	'use strict';
	function requestError(result) {
		const status = Number(result.status) || 0;
		const message = result.timeout ? '网络请求超时' : status ? 'HTTP ' + status +
			(status === 403 ? '（网站拒绝访问）' : status === 429 ? '（网站请求限流）' : '') :
			result.network ? '网络连接失败，请检查网络、系统代理或网站证书' : String(result.error || '网络请求失败');
		const error = new Error(message);
		error.retryable = !!result.timeout || !!result.network || [408, 425, 429, 500, 502, 503, 504].includes(status);
		const after = String(result.retryAfter || '').trim();
		error.retryAfterMs = /^\d+$/.test(after) ? Number(after) * 1000 : Math.max(0, (Date.parse(after) || 0) - Date.now());
		return error;
	}
	function validateBody(body) {
		if (typeof body !== 'string') throw new Error('无效的网站响应');
		if (!body.trim()) {
			const error = new Error('网站返回空页面（HTTP 200），无法判断是否收录此歌曲');
			error.retryable = true;
			throw error;
		}
		return body;
	}
	function errorText(error) {
		return error.name === 'AbortError' ? '请求超时' : String(error.message || error);
	}
	function retryable(error) {
		if (typeof error.retryable === 'boolean') return error.retryable;
		return error.name === 'AbortError' || error instanceof TypeError && /fetch|network/i.test(error.message) ||
			/HTTP (408|425|429|500|502|503|504)\b/.test(error.message);
	}
	function browserTransport(bn, plugin, options = {}) {
		let rootPromise, requests = Promise.resolve();
		const dataRoot = () => rootPromise || (rootPromise = bn.app.getDataPath().then(p => p.replace(/\\/g, '/')));
		const limit = 2 * 1024 * 1024;
		async function request(url, cancelled = () => false) {
			if (!core.allowedURL(url)) throw new Error('只允许访问歌词网站');
			const job = async () => {
				const controller = new AbortController(), signal = controller.signal;
				let timedOut = false, frame, reader, complete = false;
				const abortError = () => {
					const error = timedOut ? requestError({timeout:true}) : new Error('已取消');
					if (!timedOut) error.retryable = false;
					return error;
				};
				const guarded = promise => new Promise((resolve, reject) => {
					if (signal.aborted) { Promise.resolve(promise).catch(()=>{}); reject(abortError()); return; }
					const abort = () => reject(abortError());
					signal.addEventListener('abort', abort, {once:true});
					Promise.resolve(promise).then(resolve,reject).finally(() => signal.removeEventListener('abort',abort));
				});
				const timeout = setTimeout(() => {timedOut=true;controller.abort();}, options.requestTimeoutMs || 30000);
				const cancellation = setInterval(() => {if(cancelled())controller.abort();}, options.cancelPollMs || 100);
				try {
					if (cancelled()) throw abortError();
					let perform = options.fetch || ((...args) => globalThis.fetch(...args));
					const init = {credentials:'omit',cache:'no-store',redirect:'manual',signal,referrerPolicy:'no-referrer'};
					if (new URL(url).hostname.endsWith('utaten.com')) {
						// UtaTen requires a site Referer. An inert, sandboxed text page
						// supplies a normal browser request context; no remote scripts run.
						const doc = options.document || globalThis.document;
						frame = doc.createElement('iframe');
						frame.setAttribute('sandbox','allow-same-origin');frame.setAttribute('aria-hidden','true');
						frame.referrerPolicy='no-referrer';frame.style.display='none';
						const loaded = new Promise((resolve,reject) => {frame.onload=resolve;frame.onerror=()=>reject(requestError({network:true}));});
						frame.src='https://utaten.com/robots.txt';(doc.body || doc.documentElement).append(frame);
						await guarded(loaded);
						if (frame.contentWindow.location.origin !== 'https://utaten.com') throw new Error('UtaTen 来源页未正确加载');
						perform = frame.contentWindow.fetch.bind(frame.contentWindow);
						init.referrer='https://utaten.com/';init.referrerPolicy='origin';
					}
					let response, target=url;
					for(let redirects=0;redirects<=2;redirects++) {
						if(signal.aborted || cancelled())throw abortError();
						response=await guarded(perform(target,init));
						if(response.type==='opaqueredirect')throw new Error('浏览器无法核对歌词页重定向，请查看来源网页');
						if(response.url && !core.allowedURL(response.url))throw new Error('网站跳转超出允许范围');
						if(![301,302,303,307,308].includes(response.status))break;
						const location=response.headers.get('location');
						if(!location || redirects===2)throw new Error('网站重定向过多或缺少目标');
						target=new URL(location,target).href;
						if(!core.allowedURL(target))throw new Error('网站跳转超出允许范围');
					}
					if(!response.ok)throw requestError({status:response.status,retryAfter:response.headers.get('retry-after')});
					if(Number(response.headers.get('content-length'))>limit)throw new Error('网站响应过大');
					let body;
					if(response.body && typeof response.body.getReader==='function') {
						reader=response.body.getReader();const decoder=new TextDecoder(),parts=[];let bytes=0;
						while(true){
							const item=await guarded(reader.read());if(item.done){complete=true;break;}
							bytes+=item.value.byteLength;if(bytes>limit)throw new Error('网站响应过大');
							parts.push(decoder.decode(item.value,{stream:true}));
						}
						body=parts.join('')+decoder.decode();
					}else{
						body=await guarded(response.text());
						if(new TextEncoder().encode(body).byteLength>limit)throw new Error('网站响应过大');
					}
					if(signal.aborted || cancelled())throw abortError();
					return validateBody(body);
				} catch(error) {
					if(signal.aborted)throw abortError();
					if(error instanceof TypeError || error.name==='TypeError')throw requestError({network:true});
					throw error;
				} finally {
					clearTimeout(timeout);clearInterval(cancellation);controller.abort();
					if(reader && !complete)try{Promise.resolve(reader.cancel()).catch(()=>{});}catch(_){}
					if(frame){frame.onload=frame.onerror=null;frame.remove();}
				}
			};
			const result=requests.then(job,job);requests=result.catch(()=>{});return result;
		}
		// BetterNCM 1.3.4's binary write route uses wide Windows paths; its text
		// route uses a narrow std::string, which can fail for Chinese folder names.
		const storage = { ...bn.fs, writeFileText: (path, text) =>
			bn.fs.writeFile(path, new Blob([text], { type: 'application/json;charset=utf-8' })) };
		// The JS filesystem wrapper omits rename in BetterNCM 1.3.4, but its
		// authenticated filesystem API provides it. Use that API, never a process.
		async function replaceFile(from, to) {
			if (typeof bn.fs.rename === 'function') {
				if (await bn.fs.rename(from, to) === false) throw new Error('本地文件替换失败');
			} else {
				if (typeof bn.betterncmFetch !== 'function') throw new Error('当前 BetterNCM 缺少文件替换接口，请更新 BetterNCM');
				const response = await bn.betterncmFetch('/fs/rename?path=' + encodeURIComponent(from) + '&dest=' + encodeURIComponent(to));
				if (!response.ok || (await response.text()).trim() !== 'ok') throw new Error('本地文件替换失败');
			}
		}
		let saves = Promise.resolve();
		storage.atomicWrite = (path, next, expected) => {
			const save = async () => {
				if (typeof next !== 'string' || next.length > 2000000) throw new Error('无效的缓存内容');
				JSON.parse(next);
				const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
				const temporary = path + '.tmp-' + [...bytes].map(n => n.toString(16).padStart(2, '0')).join('');
				try {
					if (!await storage.writeFileText(temporary, next) || await bn.fs.readFileText(temporary) !== next) throw new Error('临时保存校验失败，原文件未修改');
					const previous = await bn.fs.exists(path) ? await bn.fs.readFileText(path) : null;
					if (previous !== expected) throw new Error('缓存已变化，请重新读取后保存');
					await replaceFile(temporary, path);
					if (await bn.fs.readFileText(path) !== next) throw new Error('保存后校验失败，请重新读取；输入内容仍保留');
					return true;
				} finally {
					try { if (await bn.fs.exists(temporary)) await bn.fs.remove(temporary); } catch (_) { /* never remove the original */ }
				}
			};
			const result = saves.then(save, save); saves = result.catch(() => {}); return result;
		};
		return { request, dataRoot, fs: storage, parse: html => new DOMParser().parseFromString(html, 'text/html'), ...options };
	}
	function create(deps) {
		let generation = 0, currentId = null, current = null, groups = [], status = '未启用外部网站';
		let cachePath = '', source = '', lastSettings = null;
		let cancelWait = null, loading = false, lastMetadata = null, lastError = '', warning = '';
		const retryDelays = deps.retryDelays || [3000, 8000, 15000];
		const lineCache = new Map();
		let writes = Promise.resolve();
		const exclusive = task => { const p = writes.then(task, task); writes = p.catch(() => {}); return p; };
		async function read(path, id) {
			const raw = await deps.fs.readFileText(path);
			if (raw.length > 2000000) throw new Error('缓存过大');
			const record = JSON.parse(raw);
			if (!core.validRecord(record, id)) throw new Error('缓存格式无效');
			return { raw, record };
		}
		async function write(path, record, expected) {
			const serialized = JSON.stringify(record);
			if (serialized.length > 2000000) throw new Error('修改后缓存过大');
			if (deps.fs.atomicWrite) await deps.fs.atomicWrite(path, serialized, expected);
			else {
				// Test/non-Windows adapters may supply their own transactional write.
				try { if (!await deps.fs.writeFileText(path, serialized) || await deps.fs.readFileText(path) !== serialized) throw new Error('缓存写入校验失败'); }
				catch (e) { if (expected != null) await deps.fs.writeFileText(path, expected); throw e; }
			}
			if (await deps.fs.readFileText(path) !== serialized) throw new Error('保存后校验失败，请重新读取');
		}
		function announce(text) { status = text; if (deps.onStatus) deps.onStatus(); }
		const alive = g => g === generation;
		function cancelRetry() { if (cancelWait) cancelWait(); }
		function reset() { generation++; cancelRetry(); loading = false; currentId = null; current = null; groups = []; originalLines = null; source = ''; lastError = ''; warning = ''; lineCache.clear(); }
		function stop() { reset(); announce('未启用外部网站'); }
		function cancelFetch() {
			if (!loading) return false;
			generation++; cancelRetry(); loading = false; lastError = '';
			announce('已停止本轮网站获取，可进入编辑；下次播放或重新获取时仍会尝试网站');
			return true;
		}
		function waitRetry(ms) {
			return new Promise(resolve => {
				const timer = setTimeout(() => { cancelWait = null; resolve(true); }, ms);
				cancelWait = () => { clearTimeout(timer); cancelWait = null; resolve(false); };
			});
		}
		function setAutoRetry(value) {
			if (!lastSettings) return;
			lastSettings.externalAutoRetry = value;
			if (value !== 'failed') cancelRetry();
			else if (!loading && currentId && lastError && lastMetadata) return load(currentId, lastMetadata, lastSettings, true);
		}
		async function directory(settings) {
			const root = await deps.dataRoot();
			let path = String(settings.externalCacheDir || '').trim().replace(/\\/g, '/');
			if (!path) path = root + '/lyrics/jp-furigana';
			else if (!/^[A-Za-z]:\//.test(path)) throw new Error('自定义缓存目录需要填写完整磁盘路径');
			if (/[\x00-\x1f"<>|?*]/.test(path) || path.split('/').some(p => p === '..')) throw new Error('缓存目录格式无效');
			if (!await deps.fs.mkdir(path)) throw new Error('无法创建歌词缓存目录');
			return path.replace(/\/$/, '');
		}
		let originalLines = null;
		const originals = () => deps.originalLines ? deps.originalLines(currentId) : null;
		function accept(record, cached, g, cacheWarning = '', preserveRequest = false) {
			if (!alive(g)) return;
			if (!preserveRequest) { lastError = ''; warning = cacheWarning; }
			current = record; lineCache.clear();
			const scope = lastSettings && lastSettings.externalProvider;
			source = scope && scope !== 'auto' && record.provider !== scope ? 'local' : record.provider;
			originalLines=originals();groups = source === 'local' ? [] : core.prepare(record,originalLines);
			if (!preserveRequest) announce((cached ? '本地缓存' : '已获取') + ' · ' + (source === 'local' ? '本地人工纠音' : source === 'utaten' ? 'UtaTen 振假名' : '歌ネット罗马音') + ' · ' + record.lines.length + ' 行' + warning);
			if (deps.onReady) deps.onReady();
		}
		async function load(songId, metadata, settings, force = false, manualSelection) {
			const selecting=manualSelection!==undefined;
			let manualUrl=selecting&&manualSelection?core.utatenURL(manualSelection):'';
			if(manualUrl&&settings.externalProvider==='utanet')throw new Error('手动指定 UtaTen 歌词页时，请将网站范围设为自动或 UtaTen');
			reset(); const g = generation; currentId = String(songId); settings = { ...settings }; lastSettings = settings; lastMetadata = metadata;
			if (!/^\d{1,20}$/.test(currentId)) { lastError = '当前歌曲没有可用的网易云 ID'; announce(lastError); return; }
			const id = currentId;
			loading = true;
			let retries = 0;
			async function attempt(task, label) {
				for (;;) {
					if (!alive(g)) throw new Error('已取消');
					try { return await task(); } catch (error) {
						if (!alive(g) || settings.externalAutoRetry !== 'failed' || !retryable(error) || retries >= retryDelays.length) throw error;
						const delay = Math.max(retryDelays[retries], error.retryAfterMs || 0);
						// Respect long server cooldowns without retaining a song's task indefinitely.
						if (!Number.isFinite(delay) || delay > 300000) throw error;
						retries++;
						lastError = errorText(error);
						announce(label + '：' + lastError + '；' + Math.ceil(delay / 1000) + ' 秒后自动重试（' + retries + '/' + retryDelays.length + '）');
						if (!await waitRetry(delay) || !alive(g) || settings.externalAutoRetry !== 'failed') throw error;
						announce(label + '：正在自动重试（' + retries + '/' + retryDelays.length + '）…');
					}
				}
			}
			announce('读取外部歌词缓存…');
			try {
				const dir = await directory(settings);
				const path = dir + '/' + id + '.json';
				if (!alive(g)) return;
				cachePath = dir;
				let savedRecord=null;
				if (await deps.fs.exists(path)) {
					try {
						const raw = await deps.fs.readFileText(path);
						if (raw.length > 2000000) throw new Error('缓存过大');
						const record = JSON.parse(raw);
						if(core.validRecord(record,id))savedRecord=record;
						if (core.validRecord(record, id) && (record.provider === 'local' || settings.externalProvider === 'auto' || !settings.externalProvider || settings.externalProvider === record.provider)) {
							accept(record, true, g);
							// Corrections alone are not a successful website cache. Keep them
							// visible while making this playback's first external attempt.
						}
					} catch (_) { /* Invalid or partially-written cache: refetch. */ }
				}
				if (!alive(g)) return;
				if(selecting){
					await exclusive(async()=>{
						if(!alive(g))throw new Error('歌曲已变化，未修改来源');
						const raw=await deps.fs.exists(path)?await deps.fs.readFileText(path):null;let previous;
						try{previous=raw&&JSON.parse(raw);}catch(_){}
						const record=previous&&core.validRecord(previous,id)?{...previous}:{schema:1,songId:id,provider:'local',url:'',title:'歌曲 '+id,artists:[],lines:[],userEdits:previous&&previous.userEdits||[]};
						if(manualUrl)record.manualSource={provider:'utaten',url:manualUrl};else delete record.manualSource;
						await write(path,record,raw);savedRecord=record;
					});
					if(alive(g)&&savedRecord&&(savedRecord.provider==='local'||settings.externalProvider==='auto'||!settings.externalProvider||settings.externalProvider===savedRecord.provider))accept(savedRecord,true,g,'',true);
				}else if(settings.externalProvider!=='utanet'&&savedRecord&&savedRecord.manualSource){manualUrl=core.utatenURL(savedRecord.manualSource.url);}
				if(!alive(g))return;
				if(!force&&savedRecord&&savedRecord.provider!=='local'&&(settings.externalProvider==='auto'||!settings.externalProvider||settings.externalProvider===savedRecord.provider)&&(!manualUrl||savedRecord.url===manualUrl))return;
				if(!manualUrl)announce('获取歌曲信息…');
				const track = manualUrl?null:await attempt(metadata, '获取歌曲信息');
				if (!alive(g)) return;
				if (!manualUrl&&(!track || !track.title || !Array.isArray(track.artists) || !track.artists.some(Boolean))) throw new Error('无法确定歌名与歌手，请稍后重试');
				const providers = settings.externalProvider === 'utaten' ? ['utaten'] : settings.externalProvider === 'utanet' ? ['utanet'] : ['utaten', 'utanet'];
				const failures = new Map();
				let evidence;
				async function findProvider(provider) {
					const fetchDoc = async (url, stage) => {
						try { return deps.parse(validateBody(await deps.request(url, () => !alive(g)))); }
						catch (error) { const contextual = new Error(stage + '：' + errorText(error)); contextual.retryable = retryable(error); contextual.retryAfterMs = error.retryAfterMs; throw contextual; }
					};
					let candidates = [], searched = false;
					const fetched = new Map();
					async function detail(candidate) {
						if (fetched.has(candidate.url)) return fetched.get(candidate.url);
						const url = provider === 'utaten' ? candidate.url : candidate.url.replace('/song/', '/global/en/lyric/');
						const doc = await fetchDoc(url, '歌词页面');
						const data = provider === 'utaten' ? core.parseUtaten(doc, url) : core.parseUtanet(doc, url, candidate);
						if (core.titleKey(data.title) !== core.titleKey(track.title)) throw new Error('歌曲页歌名与搜索结果不一致');
						fetched.set(candidate.url, data); return data;
					}
					const artists = [...new Set(track.artists.filter(a => typeof a === 'string' && a.trim()).map(a=>a.trim()))];
					for(const artist of artists){
						if(!alive(g))throw new Error('已取消');
						const selected={...track,artists:[artist]};
						if(provider==='utaten'||!searched){announce('正在按歌手搜索 · '+artist+'…');candidates=core.searchResults(await fetchDoc(core.searchURL(provider,selected),'搜索页面'),provider);searched=true;}
						const exact=candidates.filter(c=>core.matches(c,selected));
						if(exact.length===1){const data=await detail(exact[0]);if(core.matches(data,selected))return data;}
					}
					// Relax the artist only after strict matching fails; this remains one attempt.
					if (provider === 'utaten') candidates = core.searchResults(await fetchDoc(core.searchURL(provider, track, true), '仅按歌名搜索'), provider);
					candidates = candidates.filter(c => core.titleKey(c.title) === core.titleKey(track.title));
					if (!candidates.length) throw new Error('未找到同名歌曲');
					if (candidates.length > 5) throw new Error('同名候选超过 5 个，未自动套用');
					if (!evidence) evidence = track.lyrics || (deps.lyrics ? await deps.lyrics(id) : []);
					if (!evidence.length) throw new Error('歌手写法不同，缺少本曲歌词用于核对');
					announce('正在用歌词片段核对同名歌曲…');
					const verified = [];
					for (const candidate of candidates) {
						if (!alive(g)) throw new Error('已取消');
						const data = await detail(candidate);
						if (core.lyricEvidence(evidence, data).accepted) verified.push(data);
					}
					if (verified.length !== 1) throw new Error(verified.length ? '多个版本的歌词均匹配，未自动套用' : '同名歌曲的歌词片段不匹配');
					return verified[0];
				}
				const data = await attempt(async () => {
					if(manualUrl){
						announce('正在获取手动指定的 UtaTen 歌词页…');
						const doc=deps.parse(validateBody(await deps.request(manualUrl,()=>!alive(g))));
						const result=core.parseUtaten(doc,manualUrl);
						if(!core.validRecord({schema:1,songId:id,...result},id))throw new Error('UtaTen 歌词页格式校验失败');
						return result;
					}
					// Try the other selected website before waiting/retrying the first.
					for (const provider of providers) {
						if (!alive(g)) throw new Error('已取消');
						if (failures.has(provider) && !retryable(failures.get(provider))) continue;
						try {
							announce('正在查询 ' + (provider === 'utaten' ? 'UtaTen' : '歌ネット') + '，暂用网易云音译 / 词典…');
							const data = await findProvider(provider);
							if (!core.validRecord({ schema: 1, songId: id, ...data }, id)) throw new Error('网站歌词格式校验失败');
							return data;
						} catch (error) { failures.set(provider, error); }
					}
					const error = new Error([...failures].map(([provider, cause]) => (provider === 'utaten' ? 'UtaTen' : '歌ネット') + '：' + errorText(cause)).join('\n'));
					error.retryable = [...failures.values()].some(retryable);
					error.retryAfterMs = Math.max(0, ...[...failures.values()].filter(retryable).map(e => e.retryAfterMs || 0));
					throw error;
				}, '获取失败');
				if (!alive(g)) return;
				const record = { schema: 1, songId: id, fetchedAt: new Date().toISOString(), ...data };
				let cacheWarning = '';
				try {
					await exclusive(async () => {
						if (!alive(g)) return;
						const previous = await deps.fs.exists(path) ? await deps.fs.readFileText(path) : null;
						if (previous) try { const saved = JSON.parse(previous); if (saved.userEdits !== undefined) record.userEdits = saved.userEdits; if(saved.manualSource!==undefined)record.manualSource=saved.manualSource; } catch (_) {}
						await write(path, record, previous);
					});
				} catch (error) { cacheWarning = '（缓存写入失败：' + errorText(error) + '；本次仍可显示）'; }
				accept(record, false, g, cacheWarning);
			} catch (error) { if (alive(g)) { lastError = errorText(error); announce('获取失败：' + lastError + '\n' + (current && source !== 'local' ? '继续使用已有网站缓存' : '继续使用网易云音译 / 词典') + '；可手动重试或编辑'); } }
			finally { if (alive(g)) { loading = false; if (deps.onStatus) deps.onStatus(); } }
		}
		async function setSource(songId,metadata,settings,value){
			const url=value?core.utatenURL(value):'';
			const pending=load(songId,metadata,settings,true,url),g=generation;await pending;
			if(!alive(g)||currentId!==String(songId))throw new Error('歌曲已变化，请重新指定');
			if(lastError)throw new Error(lastError);
			return current;
		}
		function segments(text, mode, fromRomaji) {
			if (!current || source === 'local') return null;
			const next=originals();
			if(next!==originalLines){originalLines=next;groups=core.prepare(current,originalLines);lineCache.clear();}
			const k = mode + '|' + text;
			if (!lineCache.has(k)) {
				if (lineCache.size > 1000) lineCache.clear();
				lineCache.set(k, edits.annotate(current, text, core.segmentsFor(text, groups, mode, fromRomaji), mode));
			}
			return lineCache.get(k);
		}
		function fallbackSegments(text, segments, mode) {
			if (!current) return segments;
			return edits.annotate({ ...current, provider: 'local', url: '' }, text, segments, mode);
		}
		async function ensureLocal(songId, metadata, settings) {
			if (loading) throw new Error('正在获取网站注音，请等待完成，或主动停止获取后编辑');
			if (current && currentId === songId && lastSettings && lastSettings.externalProvider === settings.externalProvider) return;
			const previousError = currentId === songId ? lastError : '';
			reset(); const g = generation; currentId = songId; lastSettings = { ...settings };
			const dir = await directory(settings), path = dir + '/' + songId + '.json';
			if (!/^\d{1,20}$/.test(songId)) throw new Error('无效歌曲 ID');
			await exclusive(async () => {
				if (!alive(g)) throw new Error('歌曲已变化');
				let record;
				if (await deps.fs.exists(path)) record = (await read(path, songId)).record;
				else {
					const track = await metadata();
					record = { schema: 1, songId, provider: 'local', url: '', title: track.title, artists: track.artists || [], lines: [], userEdits: [] };
					if (!alive(g)) throw new Error('歌曲已变化');
					await write(path, record, null);
				}
				cachePath = dir; accept(record, true, g);
				if (record.provider === 'local') {
					lastError = previousError;
					announce((previousError ? '网站获取失败：' + previousError + '\n' : '') + '本地纠音记录尚无网站注音；可点“重新获取当前歌曲”获取，人工修改会保留');
				}
			});
		}
		async function saveEdit(anchor, value, fromRomaji, fallback) {
			if (!current || currentId !== anchor.songId || anchor.provider !== 'local' && (source !== anchor.provider || current.url !== anchor.url)) throw new Error('歌曲或来源已变化，请重新选择注音');
			const path = cachePath + '/' + currentId + '.json', g = generation;
			return exclusive(async () => {
				if (!alive(g)) throw new Error('歌曲已变化，未保存');
				const { raw, record } = await read(path, anchor.songId);
				const local = anchor.provider === 'local';
				const baseline = edits.annotate(local ? { ...record, provider: 'local', url: '' } : record, anchor.line,
					local ? fallback(anchor.line) : core.segmentsFor(anchor.line, core.prepare(record,originals()), 'hiragana', fromRomaji), 'hiragana');
				const match = baseline && baseline.find(s => s.edit && edits.key(s.edit) === edits.key(anchor));
				if (!match || match.edit.reading !== anchor.reading) throw new Error('本地读音已变化，请取消后重新打开编辑框');
				const next = edits.update(record, anchor, value);
				await write(path, next, raw);
				accept(next, true, g, '', true); return next;
			});
		}
		async function list(settings) {
			const dir = await directory(settings), rows = [];
			for (const entry of await deps.fs.readDir(dir)) {
				const name = String(entry).replace(/\\/g, '/').split('/').pop();
				if (!/^\d{1,20}\.json$/.test(name)) continue;
				try {
					const { raw, record } = await read(dir + '/' + name, name.slice(0, -5));
					rows.push({ songId: record.songId, title: record.title, artists: record.artists, provider: record.provider,
						bytes: new TextEncoder().encode(raw).length, edits: edits.items(record).length, path: dir + '/' + name });
				} catch (_) { rows.push({ songId: name.slice(0, -5), title: name, artists: [], invalid: true, bytes: 0, edits: 0 }); }
				if (rows.length % 25 === 0) await new Promise(resolve => setTimeout(resolve, 0));
			}
			return { dir, rows };
		}
		async function manage(songId, settings, action) {
			if (!/^\d{1,20}$/.test(songId)) throw new Error('无效歌曲 ID');
			const dir = await directory(settings), path = dir + '/' + songId + '.json';
			return exclusive(async () => {
				const { raw, record } = await read(path, songId);
				if (action === 'read') return record;
				const selected = currentId === songId && cachePath === dir;
				if (action === 'delete') {
					if (!await deps.fs.remove(path)) throw new Error('删除失败');
					if (selected) {
						reset(); announce('当前歌曲缓存已删除，等待重新获取');
						if (deps.onInvalidated) deps.onInvalidated(songId);
					}
					if (deps.onReady) deps.onReady();
				} else if (action === 'restore') {
					const next = { ...record, userEdits: [] }; await write(path, next, raw);
					if (selected) accept(next, true, generation, '', true);
				} else throw new Error('未知管理操作');
			});
		}
		return { load, setSource, stop, cancelFetch, setAutoRetry, segments, fallbackSegments, ensureLocal, saveEdit, list, manage, directory, inspect: () => ({ requestId:generation, songId: currentId, status, error: lastError, warning, cachePath, source, loading, waitingRetry: !!cancelWait, url: source === 'local' ? '' : current && current.url, manualUrl:current&&current.manualSource&&current.manualSource.url||'', ready: !!current, title: current && current.title, artists: current && current.artists, edits: current ? edits.items(current).length : 0, settings: lastSettings }) };
	}
	return { create, browserTransport, requestError };
});
