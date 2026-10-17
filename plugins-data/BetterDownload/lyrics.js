(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.NBDLyrics = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
    'use strict';
    const STAMP = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
    const LEAD = /^(?:\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?\])+/;
    // The request NetEase's own lyric view makes; version 0 of every kind means "send whatever you have".
    function url(id, domain) {
        const base = typeof domain === 'string' && /^https:\/\/[\w.-]+$/.test(domain) ? domain : 'https://music.163.com';
        return base + '/api/song/lyric/v1?tv=0&lv=0&rv=0&kv=0&yv=0&ytv=0&yrv=0&cp=false&id=' + encodeURIComponent(id);
    }
    function stamp(ms) {
        const cs = Math.max(0, Math.round(ms / 10)), pad = n => String(n).padStart(2, '0');
        return '[' + pad(Math.floor(cs / 6000)) + ':' + pad(Math.floor(cs / 100) % 60) + '.' + pad(cs % 100) + ']';
    }
    function millis(minutes, seconds, fraction) {
        return (Number(minutes) * 60 + Number(seconds)) * 1000 + (fraction ? Number(fraction.padEnd(3, '0')) : 0);
    }
    // LRC lines as players expect them. NetEase writes credits as JSON ({"t":0,"c":[{"tx":"作词: "},{"tx":"…"}]}).
    function lines(text) {
        const out = [];
        for (const raw of String(text || '').replace(/\r\n?/g, '\n').split('\n')) {
            const line = raw.trim();
            if (!line) continue;
            if (line[0] !== '{') { out.push({ line, credit: false }); continue; }
            try {
                const data = JSON.parse(line), words = (Array.isArray(data.c) ? data.c : []).map(part => (part && part.tx) || '').join('').trim();
                if (words && Number.isFinite(data.t)) out.push({ line: stamp(data.t) + words, credit: true });
            } catch (_) {}
        }
        return out;
    }
    const words = line => line.replace(LEAD, '').trim();
    // The LRC to embed, or '' for instrumentals and songs without lyrics.
    // translation: put NetEase's translation under each original line, at the same time.
    function build(response, options) {
        if (!response || response.pureMusic || response.nolyric || response.uncollected) return '';
        const main = lines(response.lrc && response.lrc.lyric);
        // Credits alone, or tag lines like [by:…], are not lyrics.
        if (!main.some(item => !item.credit && words(item.line) && !/^\[[a-z]+:/i.test(item.line))) return '';
        const translated = new Map();
        if (options && options.translation) {
            for (const { line } of lines(response.tlyric && response.tlyric.lyric)) {
                const text = words(line);
                if (!text || text === '//') continue;
                for (const [, m, s, f] of (line.match(LEAD) || [''])[0].matchAll(STAMP)) translated.set(millis(m, s, f), text);
            }
        }
        const out = [];
        for (const { line } of main) {
            out.push(line);
            if (!translated.size) continue;
            // The translation keeps the original's exact timestamp, so players pair the two lines.
            for (const [token, m, s, f] of (line.match(LEAD) || [''])[0].matchAll(STAMP)) {
                const text = translated.get(millis(m, s, f));
                if (text && text !== words(line)) out.push(token + text);
            }
        }
        const lrc = out.join('\n') + '\n';
        return lrc.length <= 128 * 1024 ? lrc : '';
    }
    return { url, build, stamp };
});
