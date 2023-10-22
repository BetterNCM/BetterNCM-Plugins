import { parseLyric } from './lyric.ts'


const cyrb53 = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed,
        h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

const _onProcessLyrics = window.onProcessLyrics || (() => void 0)

const processLyrics = (lyrics) => {
	for (const line of lyrics) {
		if (line.originalLyric == '') {
			line.isInterlude = true;
		}
	}
	return lyrics;
}


const preProcessLyrics = (lyrics) => {
    if (!lyrics) return null;
    if (!lyrics.lrc) lyrics.lrc = {};

    const original = (lyrics?.lrc?.lyric ?? '').replace(/\u3000/g, ' ');
    const translation = lyrics?.ytlrc?.lyric ?? lyrics?.ttlrc?.lyric ?? lyrics?.tlyric?.lyric ?? '';
    const roma = lyrics?.yromalrc?.lyric ?? lyrics?.romalrc?.lyric ?? '';
    const dynamic = lyrics?.yrc?.lyric ?? '';
    const approxLines = original.match(/\[(.*?)\]/g)?.length ?? 0;

    const parsed = parseLyric(
        original,
        translation,
        roma,
        dynamic
    );
    if (approxLines - parsed.length > approxLines * 0.7) { // 某些特殊情况（逐字歌词残缺不全）
        return parseLyric(
            original,
            translation,
            roma
        );
    }
    return parsed;
}

let currentRawLRC = null;
window.onProcessLyrics = (_rawLyrics, songID) => {
    if (!_rawLyrics || _rawLyrics?.data === -400) return _onProcessLyrics(_rawLyrics, songID);

    let rawLyrics = _rawLyrics;
    if (typeof (_rawLyrics) === 'string') { // local lyrics
        rawLyrics = {
            lrc: {
                lyric: _rawLyrics,
            },
            source: {
                name: '本地',
            }
        }
    }

    if ((rawLyrics?.lrc?.lyric ?? '') != currentRawLRC) {
        console.log('Update Raw Lyrics', rawLyrics);
        currentRawLRC = (rawLyrics?.lrc?.lyric ?? '');
        const preprocessedLyrics = preProcessLyrics(rawLyrics);
        setTimeout(async () => {
            const processedLyrics = await processLyrics(preprocessedLyrics);
            const lyrics = {
                lyrics: processedLyrics,
                contributors: {}
            }

            if (processedLyrics[0]?.unsynced) {
                lyrics.unsynced = true;
            }

            if (rawLyrics?.lyricUser) {
                lyrics.contributors.original = {
                    name: rawLyrics.lyricUser.nickname,
                    userid: rawLyrics.lyricUser.userid,
                }
            }
            if (rawLyrics?.transUser) {
                lyrics.contributors.translation = {
                    name: rawLyrics.transUser.nickname,
                    userid: rawLyrics.transUser.userid,
                }
            }
            lyrics.contributors.roles = rawLyrics?.roles ?? [];
            lyrics.contributors.roles = lyrics.contributors.roles.filter(role => {
                if (role.artistMetaList.length == 1 && role.artistMetaList[0].artistName == '无' && role.artistMetaList[0].artistId == 0) {
                    return false;
                }
                return true;
            });
            for (let i = 0; i < lyrics.contributors.roles.length; i++) {
                const metaList = JSON.stringify(lyrics.contributors.roles[i].artistMetaList);
                for (let j = i + 1; j < lyrics.contributors.roles.length; j++) {
                    if (JSON.stringify(lyrics.contributors.roles[j].artistMetaList) === metaList) {
                        lyrics.contributors.roles[i].roleName += `、${lyrics.contributors.roles[j].roleName}`;
                        lyrics.contributors.roles.splice(j, 1);
                        j--;
                    }
                }
            }


            if (rawLyrics?.source) {
                lyrics.contributors.lyricSource = rawLyrics.source;
            }
            lyrics.hash = `${betterncm.ncm.getPlaying().id}-${cyrb53(processedLyrics.map((x) => x.originalLyric).join('\\'))}`;
            window.currentLyrics = lyrics;
            console.group('Update Processed Lyrics');
            console.log('lyrics', window.currentLyrics.lyrics);
            console.log('contributors', window.currentLyrics.contributors);
            console.log('hash', window.currentLyrics.hash);
            console.groupEnd();
            document.dispatchEvent(new CustomEvent('lyrics-updated', { detail: window.currentLyrics }));
        }, 0);
    }
    return _onProcessLyrics(_rawLyrics, songID);
}
