(() => {
    "use strict";

    const SCREEN_HOSTNAME = "http://skyloong-screen.local";
    const SCREEN_CACHE_KEY = "gk4-screen-base-url";
    const REPO_URL = "https://github.com/Lenz2023/ArknightsKeyboardScreen/tree/main/pc-companion";
    const ISSUE_URL = "https://github.com/Lenz2023/ArknightsKeyboardScreen/issues";
    // The player DOM exposes whole seconds, so interpolate locally and push
    // often enough that the device can change lyric lines without a visible lag.
    const POLL_MS = 250;
    // Account for the PC-to-screen request and the screen's refresh cycle so
    // the lyric transition is perceived at the audio cue, not after it.
    const LYRIC_LEAD_MS = 400;
    const MAX_LINE_BYTES = 180;

    let getPlaying = null;
    let songId = null;
    let lastLyricAttemptId = null;
    let lyricAttemptAt = 0;
    let lyricRows = [];
    let lyricNotice = "";
    let lastPayload = "";
    let lastSendAt = 0;
    let lastState = null;
    let timelineTrackId = null;
    let timelineRawPosition = 0;
    let timelineAnchorPosition = 0;
    let timelineAnchorAt = 0;
    let timelineWasPlaying = false;
    let nativeTimelineBound = false;
    let nativePositionMs = 0;
    let nativePositionAt = 0;
    let screenBaseUrl = readCachedScreen();
    let discoveringScreen = null;
    let lastScreenCheckAt = 0;
    let screenReady = false;

    function readCachedScreen() {
        try {
            return localStorage.getItem(SCREEN_CACHE_KEY) || SCREEN_HOSTNAME;
        } catch {
            return SCREEN_HOSTNAME;
        }
    }

    function cacheScreen(baseUrl) {
        screenBaseUrl = baseUrl;
        try {
            localStorage.setItem(SCREEN_CACHE_KEY, baseUrl);
        } catch {}
    }

    async function probeScreen(baseUrl, timeoutMs = 700) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(`${baseUrl}/info`, {
                cache: "no-store",
                signal: controller.signal
            });
            if (!response.ok) return false;
            const info = await response.json();
            return info && (info.mode === "STA" || info.mode === "AP");
        } catch {
            return false;
        } finally {
            clearTimeout(timeout);
        }
    }

    async function localIpv4Prefixes() {
        if (typeof RTCPeerConnection !== "function") return [];
        const addresses = new Set();
        const connection = new RTCPeerConnection({ iceServers: [] });
        try {
            connection.createDataChannel("gk4-discovery");
            connection.onicecandidate = (event) => {
                const candidate = event.candidate?.candidate || "";
                const match = candidate.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
                if (match) addresses.add(match[0]);
            };
            await connection.setLocalDescription(await connection.createOffer());
            await new Promise((resolve) => setTimeout(resolve, 350));
        } catch {
        } finally {
            connection.close();
        }
        return [...addresses]
            .filter((address) => !address.startsWith("127."))
            .map((address) => address.split(".").slice(0, 3).join("."));
    }

    async function discoverScreen() {
        if (discoveringScreen) return discoveringScreen;
        discoveringScreen = (async () => {
            const preferred = [...new Set([screenBaseUrl, SCREEN_HOSTNAME])];
            for (const baseUrl of preferred) {
                if (await probeScreen(baseUrl)) {
                    cacheScreen(baseUrl);
                    return baseUrl;
                }
            }

            const prefixes = [...new Set([
                ...await localIpv4Prefixes(),
                "10.50.2",
                "192.168.1",
                "192.168.0"
            ])];
            for (const prefix of prefixes) {
                for (let start = 1; start < 255; start += 24) {
                    const candidates = [];
                    for (let host = start; host < Math.min(start + 24, 255); ++host) {
                        const baseUrl = `http://${prefix}.${host}`;
                        candidates.push(probeScreen(baseUrl, 450).then((found) => found ? baseUrl : null));
                    }
                    const found = (await Promise.all(candidates)).find(Boolean);
                    if (found) {
                        cacheScreen(found);
                        return found;
                    }
                }
            }
            return null;
        })();
        try {
            return await discoveringScreen;
        } finally {
            discoveringScreen = null;
        }
    }

    async function postToScreen(serialized) {
        const now = Date.now();
        if (!screenReady || now - lastScreenCheckAt > 2000) {
            screenReady = false;
            const found = await discoverScreen();
            lastScreenCheckAt = Date.now();
            if (found) screenReady = true;
        }
        if (!screenReady || !screenBaseUrl) return false;
        for (let attempt = 0; attempt < 2; ++attempt) {
            const baseUrl = attempt === 0 ? screenBaseUrl : await discoverScreen();
            if (!baseUrl) return false;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1200);
            try {
                await fetch(`${baseUrl}/music`, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "text/plain;charset=UTF-8" },
                    body: serialized,
                    cache: "no-store",
                    signal: controller.signal
                });
                cacheScreen(baseUrl);
                return true;
            } catch (error) {
                console.debug("GK4 music bridge: screen unavailable", error);
                screenBaseUrl = "";
                screenReady = false;
                lastScreenCheckAt = 0;
            } finally {
                clearTimeout(timeout);
            }
        }
        return false;
    }

    function readPlaying() {
        if (!getPlaying) {
            try {
                const binding = window.betterncm?.ncm?.findApiFunction?.("getPlaying");
                if (binding) {
                    const [fn, receiver] = binding;
                    getPlaying = fn.bind(receiver);
                }
            } catch (error) {
                console.debug("GK4 music bridge: BetterNCM playback API unavailable", error);
            }
        }
        try {
            return getPlaying?.() || null;
        } catch (error) {
            console.debug("GK4 music bridge: could not read current song", error);
            getPlaying = null;
            return null;
        }
    }

    function isPlaying() {
        return !!document.querySelector(".btnp-pause, .cmd-icon-pause");
    }

    function readTimeline() {
        const parseTime = (value) => {
            if (!value) return 0;
            const parts = value.trim().split(":").map(Number);
            if (parts.some(Number.isNaN)) return 0;
            return parts.reduce((total, part) => total * 60 + part, 0) * 1000;
        };
        let current = document.querySelector(".cmd-space.middle > div:nth-child(2) > p:nth-child(1)")?.innerText;
        let total = document.querySelector(".cmd-space.middle > div:nth-child(2) > p:nth-child(3)")?.innerText;
        if (!current || !total || (current === "00:00" && total === "00:00")) {
            const player = [...document.querySelectorAll(".m-player")].find((node) => {
                const style = getComputedStyle(node);
                return style.display !== "none" && style.visibility !== "hidden";
            });
            current = player?.querySelector("time.now")?.innerText || current;
            total = player?.querySelector("time.all")?.innerText || total;
        }
        return { currentTime: parseTime(current), totalTime: parseTime(total) };
    }

    function interpolateTimeline(raw, trackId, playing) {
        const now = performance.now();
        const changedTrack = trackId !== timelineTrackId || raw.currentTime < timelineRawPosition;
        const resumed = playing && !timelineWasPlaying;
        if (changedTrack || resumed || raw.currentTime !== timelineRawPosition) {
            timelineTrackId = trackId;
            timelineRawPosition = raw.currentTime;
            timelineAnchorPosition = raw.currentTime;
            timelineAnchorAt = now;
            if (changedTrack) nativePositionAt = 0;
        }
        timelineWasPlaying = playing;

        const currentTime = playing
            ? timelineAnchorPosition + Math.max(0, now - timelineAnchorAt)
            : raw.currentTime;
        return {
            currentTime: Math.min(currentTime, raw.totalTime || currentTime),
            totalTime: raw.totalTime
        };
    }

    function bindNativeTimeline() {
        if (nativeTimelineBound) return;
        try {
            const native = globalThis.legacyNativeCmder;
            if (typeof native?.appendRegisterCall !== "function") return;
            // InfLink receives the player's native PlayProgress event, which is
            // more precise and earlier than the whole-second DOM clock.
            native.appendRegisterCall("PlayProgress", "audioplayer", (_command, seconds) => {
                const value = Number(seconds);
                if (Number.isFinite(value) && value >= 0) {
                    nativePositionMs = value * 1000;
                    nativePositionAt = performance.now();
                }
            });
            nativeTimelineBound = true;
            console.debug("GK4 music bridge: native playback timeline connected");
        } catch (error) {
            console.debug("GK4 music bridge: native timeline unavailable", error);
        }
    }

    function getTimeline(raw, trackId, playing) {
        const now = performance.now();
        const estimate = interpolateTimeline(raw, trackId, playing);
        const nativeAge = now - nativePositionAt;
        // Native progress callbacks can be spaced farther apart than the DOM
        // clock's one-second ticks. Keep extrapolating the precise native
        // position across that gap instead of snapping back to whole seconds.
        if (nativePositionAt > 0 && nativeAge >= 0 && nativeAge < 3000) {
            const position = nativePositionMs + (playing ? nativeAge : 0);
            return { currentTime: Math.min(position, raw.totalTime || position), totalTime: raw.totalTime };
        }
        return estimate;
    }

    function trimForScreen(value, maxBytes = MAX_LINE_BYTES) {
        const text = String(value || "").replace(/[\r\n]+/g, " ").trim();
        let result = "";
        let bytes = 0;
        for (const char of text) {
            const codePoint = char.codePointAt(0);
            const charBytes = codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
            if (bytes + charBytes > maxBytes) break;
            result += char;
            bytes += charBytes;
        }
        return result;
    }

    function parseLrc(text) {
        const rows = [];
        for (const line of String(text || "").split(/\r?\n/)) {
            const yrcHeader = line.match(/^\[(\d+),(\d+)\](.*)$/);
            if (yrcHeader) {
                const wordRows = [...yrcHeader[3].matchAll(/\((\d+),(\d+),\d+\)([^()]*)/g)];
                const yrcText = wordRows.length
                    ? wordRows.map((match) => match[3]).join("").trim()
                    : yrcHeader[3].replace(/\(\d+,\d+,\d+\)/g, "").trim();
                if (yrcText) rows.push({ at: Number(yrcHeader[1]), text: trimForScreen(yrcText) });
                continue;
            }
            const matches = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
            const yrcMatches = [...line.matchAll(/<(\d+),(\d+),\d+>/g)];
            const lyric = line.replace(/\[[^\]]+\]/g, "").replace(/<\d+,\d+,\d+>/g, "").trim();
            if (!lyric) continue;
            if (matches.length) {
                for (const match of matches) {
                    const fraction = (match[3] || "0").padEnd(3, "0").slice(0, 3);
                    const at = (Number(match[1]) * 60 + Number(match[2])) * 1000 + Number(fraction);
                    rows.push({ at, text: trimForScreen(lyric) });
                }
            } else if (yrcMatches.length) {
                rows.push({ at: Number(yrcMatches[0][1]), text: trimForScreen(lyric) });
            }
        }
        rows.sort((a, b) => a.at - b.at);
        return rows;
    }

    function parseTimedLyrics(text) {
        const rows = parseLrc(text);
        if (rows.length) return rows;

        const lyricParser = globalThis.loadedPlugins?.liblyric;
        try {
            const dynamicRows = lyricParser?.parsePureDynamicLyric?.(text);
            if (Array.isArray(dynamicRows) && dynamicRows.length) {
                return dynamicRows
                    .filter((row) => row && Number.isFinite(Number(row.time)) && row.originalLyric)
                    .map((row) => ({ at: Number(row.time), text: trimForScreen(row.originalLyric) }))
                    .sort((a, b) => a.at - b.at);
            }
            const pureRows = lyricParser?.parsePureLyric?.(text);
            if (Array.isArray(pureRows) && pureRows.length) {
                return pureRows
                    .filter((row) => row && Number.isFinite(Number(row.time)) && row.lyric)
                    .map((row) => ({ at: Number(row.time), text: trimForScreen(row.lyric) }))
                    .sort((a, b) => a.at - b.at);
            }
        } catch (error) {
            console.debug("GK4 music bridge: LibLyric parser failed", error);
        }
        return rows;
    }

    function decodeApiBody(body) {
        let value = body;
        for (let depth = 0; depth < 2 && typeof value === "string"; depth++) {
            const text = value.trim().replace(/^\)\]\}',?\s*/, "");
            try { value = JSON.parse(text); }
            catch (_) { break; }
        }
        return value;
    }

    function extractLrc(response) {
        const visited = new Set();
        const queue = [response];
        let plainText = "";
        while (queue.length) {
            const value = queue.shift();
            if (typeof value === "string") {
                if (/\[\d{1,3}:\d{2}|\[\d+,\d+\]|<\d+,\d+,\d+>/.test(value)) return value;
                if (!plainText && value.trim()) plainText = value;
                if (/^\s*\{/.test(value)) {
                    try { queue.push(JSON.parse(value)); } catch (_) { }
                }
                continue;
            }
            if (!value || typeof value !== "object" || visited.has(value)) continue;
            visited.add(value);
            for (const key of ["lyric", "lrc", "klyric", "yrc", "data", "body", "response", "result"]) {
                if (value[key] !== undefined) queue.push(value[key]);
            }
        }
        return plainText;
    }

    function findLyricResponse(response) {
        const seen = new Set();
        const queue = [response];
        while (queue.length) {
            const value = queue.shift();
            if (typeof value === "string") {
                if (/^\s*\{/.test(value)) {
                    try { queue.push(JSON.parse(value)); } catch (_) { }
                }
                continue;
            }
            if (!value || typeof value !== "object" || seen.has(value)) continue;
            seen.add(value);
            for (const key of ["lrc", "yrc", "klyric", "tlyric", "romalrc"]) {
                if (typeof value[key]?.lyric === "string") return value;
                if (typeof value[key] === "string" && value[key].trim()) {
                    return { ...value, [key]: { lyric: value[key] } };
                }
            }
            for (const child of Object.values(value)) queue.push(child);
        }
        return null;
    }

    async function loadLyrics(song) {
        const id = Number(song?.ncmId || 0);
        if (!id) {
            lyricNotice = "无法获取歌曲编号";
            return;
        }
        if (id === songId && lyricRows.length) return;
        if (id === lastLyricAttemptId && Date.now() - lyricAttemptAt < 15000) return;
        songId = id;
        lastLyricAttemptId = id;
        lyricAttemptAt = Date.now();
        lyricRows = [];
        try {
            // Use BetterNCM's EAPI bridge: direct browser fetches to music.163.com
            // are blocked by the desktop client's custom orpheus:// origin.
            const lyricLib = globalThis.loadedPlugins?.liblyric;
            const requestLib = globalThis.loadedPlugins?.LibEAPIRequest;
            let body;
            if (typeof lyricLib?.getLyricData === "function") {
                body = await lyricLib.getLyricData(id);
            } else if (typeof requestLib?.eapiRequest === "function") {
                const domain = globalThis.APP_CONF?.domain || "https://music.163.com";
                body = await requestLib.eapiRequest(`${domain}/api/song/lyric/v1`, {
                    type: "json",
                    query: { id, cp: false, tv: 0, lv: 0, rv: 0, kv: 0, yv: 0, ytv: 0, yrv: 0 }
                });
            } else {
                throw new Error("LibLyric.getLyricData unavailable");
            }
            if (songId === id) {
                const decodedBody = decodeApiBody(body);
                const lyricData = findLyricResponse(decodedBody);
                const lyricParser = globalThis.loadedPlugins?.liblyric;
                if (lyricData && typeof lyricParser?.parseLyric === "function") {
                    const parsed = lyricParser.parseLyric(
                        lyricData.lrc?.lyric || lyricData.klyric?.lyric || "",
                        lyricData.tlyric?.lyric || "",
                        lyricData.romalrc?.lyric || "",
                        lyricData.yrc?.lyric || ""
                    );
                    if (Array.isArray(parsed)) {
                        lyricRows = parsed
                            .filter((row) => row && Number.isFinite(Number(row.time)) && (row.originalLyric || row.lyric))
                            .map((row) => ({ at: Number(row.time), text: trimForScreen(row.originalLyric || row.lyric) }))
                            .sort((a, b) => a.at - b.at);
                    }
                }
                if (!lyricRows.length) lyricRows = parseTimedLyrics(extractLrc(decodedBody));
                if (lyricRows.length) {
                    lyricNotice = "";
                } else {
                    const shape = lyricData
                        ? Object.keys(lyricData).filter((key) => ["lrc", "yrc", "klyric", "tlyric", "romalrc"].includes(key)).join("/") || "无歌词字段"
                        : body && typeof body === "object" ? Object.keys(body).slice(0, 5).join("/") : typeof body;
                    const raw = typeof body === "string" ? body.replace(/[\r\n]+/g, " ").trim().slice(0, 52) : "";
                    lyricNotice = raw ? `歌词回包：${raw}` : `歌词无时间轴：${shape}`;
                }
                if (!lyricRows.length) {
                    console.debug("GK4 music bridge: lyric response contained no timed LRC", {
                        id,
                        keys: lyricData && typeof lyricData === "object" ? Object.keys(lyricData) : body && typeof body === "object" ? Object.keys(body) : typeof body,
                        response: body
                    });
                }
            }
        } catch (error) {
            console.debug("GK4 music bridge: lyric lookup failed", error);
            const detail = String(error?.message || error || "未知错误")
                .replace(/[\r\n]+/g, " ")
                .slice(0, 72);
            lyricNotice = `歌词请求失败：${detail}`;
            // Permit a retry after a short cooldown if the service was temporarily unavailable.
            if (songId === id) songId = null;
        }
    }

    function lyricAt(positionMs) {
        if (!lyricRows.length) return { lyric: "", next: "" };
        let index = -1;
        for (let i = 0; i < lyricRows.length; i++) {
            if (lyricRows[i].at <= positionMs) index = i;
            else break;
        }
        return {
            lyric: index >= 0 ? lyricRows[index].text : "",
            next: index + 1 < lyricRows.length ? lyricRows[index + 1].text : ""
        };
    }

    async function sendState() {
        bindNativeTimeline();
        const playingInfo = readPlaying();
        const song = playingInfo?.data || null;
        const active = !!song;
        const playing = active && isPlaying();
        if (active) await loadLyrics({ ncmId: song.id || playingInfo?.from?.id });

        const rawTimeline = active ? readTimeline() : {};
        const timeline = active ? getTimeline(rawTimeline, song.id || playingInfo?.from?.id, playing) : {};
        const position = Math.max(0, Number(timeline.currentTime) || 0);
        const lines = lyricAt(position + (playing ? LYRIC_LEAD_MS : 0));
        const currentLyric = lines.lyric || (active && lyricNotice && !lyricRows.length ? "♪ 暂无同步歌词" : "");
        const payload = {
            active,
            playing,
            title: trimForScreen(song?.name || "", 92),
            artist: trimForScreen(song?.artists?.map((artist) => artist.name).join(" / ") || "", 76),
            lyric: trimForScreen(currentLyric, 188),
            next: trimForScreen(lines.next, 188),
            position_ms: Math.floor(position),
            duration_ms: Math.max(0, Number(timeline.totalTime || song?.duration) || 0)
        };
        const serialized = JSON.stringify(payload);
        const now = Date.now();
        if (serialized === lastPayload && now - lastSendAt < 5000) {
            await postToScreen(serialized);
            return;
        }
        lastPayload = serialized;
        lastSendAt = now;
        lastState = payload;

        await postToScreen(serialized);
    }

    void (async function pollMusicState() {
        await sendState();
        setTimeout(pollMusicState, POLL_MS);
    })();

    window.addEventListener("beforeunload", () => {
        if (!lastState?.active) return;
        const stop = JSON.stringify({ active: false, playing: false });
        if (screenBaseUrl)
            navigator.sendBeacon?.(`${screenBaseUrl}/music`, new Blob([stop], { type: "text/plain" }));
    }, { once: true });

    // ------------------------------------------------------------------
    // 设置面板（BetterNCM 插件页的「设置」按钮点开后显示这里）
    // ------------------------------------------------------------------

    function openExternal(url) {
        try {
            if (window.betterncm?.ncm?.openUrl) {
                window.betterncm.ncm.openUrl(url);
                return;
            }
        } catch {}
        window.open(url, "_blank");
    }

    function line(parts) {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0;";
        for (const part of parts) {
            if (part) row.appendChild(part);
        }
        return row;
    }

    function linkButton(text, url) {
        const a = document.createElement("a");
        a.textContent = text;
        a.href = "javascript:void(0)";
        a.style.cssText = "color:#7cc4ff;text-decoration:underline;cursor:pointer;";
        a.addEventListener("click", (event) => {
            event.preventDefault();
            openExternal(url);
        });
        return a;
    }

    function buildConfigPanel() {
        const root = document.createElement("div");
        root.style.cssText = "font-size:13px;line-height:1.6;padding:2px 4px 8px;max-width:560px;";

        const title = document.createElement("div");
        title.style.cssText = "font-size:16px;font-weight:600;margin-bottom:2px;";
        title.textContent = "GK4 歌词屏桥接";
        root.appendChild(title);

        const desc = document.createElement("div");
        desc.style.cssText = "opacity:.7;margin-bottom:10px;";
        desc.textContent = "把正在播放的歌名、歌词推到 GK4/GK87 键盘副屏。屏幕需与本机在同一 Wi-Fi。";
        root.appendChild(desc);

        const status = document.createElement("div");
        status.style.cssText = "margin:8px 0 12px;padding:8px 10px;border-radius:6px;background:rgba(255,255,255,.06);";
        const paintStatus = (text) => {
            status.textContent = text;
        };
        paintStatus(`当前屏幕地址：${screenBaseUrl || "（未发现）"}`);
        root.appendChild(status);

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = SCREEN_HOSTNAME;
        input.value = screenBaseUrl || "";
        input.style.cssText =
            "flex:1 1 220px;min-width:200px;padding:5px 8px;border-radius:5px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.25);color:inherit;";
        root.appendChild(line([input]));

        const save = document.createElement("button");
        save.textContent = "保存并测试";
        save.style.cssText = "padding:5px 12px;border-radius:5px;border:none;cursor:pointer;";
        save.addEventListener("click", async () => {
            const raw = input.value.trim().replace(/\/+$/, "");
            if (!raw) {
                paintStatus("请填写屏幕地址，例如 http://192.168.1.20");
                return;
            }
            const url = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
            cacheScreen(url);
            screenReady = false;
            lastScreenCheckAt = 0;
            paintStatus(`正在测试 ${url} …`);
            const ok = await probeScreen(url, 1500);
            paintStatus(ok ? `已连接：${url}` : `连不上 ${url} —— 检查键盘是否开机、是否同 Wi-Fi、屏幕页是否显示该 IP`);
        });

        const auto = document.createElement("button");
        auto.textContent = "自动发现";
        auto.style.cssText = save.style.cssText;
        auto.addEventListener("click", async () => {
            paintStatus("正在搜索局域网内的屏幕 …");
            const found = await discoverScreen();
            if (found) {
                input.value = found;
                paintStatus(`已找到：${found}`);
            } else {
                paintStatus("没找到。确认键盘已连 Wi-Fi，然后手动填地址试试");
            }
        });

        const reset = document.createElement("button");
        reset.textContent = "清除记录";
        reset.style.cssText = save.style.cssText;
        reset.addEventListener("click", () => {
            try {
                localStorage.removeItem(SCREEN_CACHE_KEY);
            } catch {}
            screenBaseUrl = SCREEN_HOSTNAME;
            input.value = "";
            paintStatus(`已清除，恢复默认 ${SCREEN_HOSTNAME}`);
        });

        root.appendChild(line([save, auto, reset]));

        const linksTitle = document.createElement("div");
        linksTitle.style.cssText = "margin-top:14px;font-weight:600;";
        linksTitle.textContent = "链接";
        root.appendChild(linksTitle);
        root.appendChild(line([document.createTextNode("源代码仓库："), linkButton("ArknightsKeyboardScreen/pc-companion", REPO_URL)]));
        root.appendChild(line([document.createTextNode("问题反馈："), linkButton("GitHub Issues", ISSUE_URL)]));

        const hint = document.createElement("div");
        hint.style.cssText = "opacity:.6;margin-top:12px;";
        hint.textContent = "依赖插件：LibEAPIRequest（EAPI 请求）、LibLyric（歌词数据）。两者缺失时歌词会退化，歌名仍可显示。";
        root.appendChild(hint);

        return root;
    }

    try {
        if (typeof plugin !== "undefined" && plugin?.onConfig) {
            plugin.onConfig(() => buildConfigPanel());
        }
    } catch (error) {
        console.debug("GK4 music bridge: could not register settings panel", error);
    }

})();
