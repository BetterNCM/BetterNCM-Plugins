# AMLL DOM lyric player

This directory contains the DOM renderer used by SteamFinder's AMLL-Player-extSpotify. It is built from `packages/core/src/lyric-player/dom/index.ts` at commit `c1668c17c4a2c3f079ccdf7060623ae546abd0ab`. The core package identifies itself as `@applemusic-like-lyrics/core` version `0.2.0-alpha.3`. [Pinned upstream source](https://github.com/SteamFinder/AMLL-Player-extSpotify/tree/c1668c17c4a2c3f079ccdf7060623ae546abd0ab/packages/core)

`extspotify.js` exposes `ExtSpotify.DomLyricPlayer` and `extspotify.css` contains its default DOM styles. The build targets Chromium 91 with esbuild 0.23.1. It includes the DOM lyric renderer, its spring implementation and required utilities. The component runs locally within BetterNCM.

## Corresponding source and licenses

`source.zip` contains the modified TypeScript and CSS, the included npm dependency sources, build command and package versions. To rebuild, extract it to an empty directory, run `npm install`, then `npm run build`. The outputs are `extspotify.js` and `extspotify.css`.

The repository's LICENSE is the GNU Affero General Public License version 3. Its core package manifest separately declares GPL-3.0. Both texts are in `LICENSES`. Upstream credits SteveXMH. The spring source carries an MIT attribution to pushkine. The runtime includes `bezier-easing` 2.1.0 by Gaëtan Renaudeau (MIT) and `@ungap/structured-clone` 1.2.0 by Andrea Giammarchi (ISC). Their notices are in `LICENSES`.

## AppleNowPlaying compatibility changes

Changes made on 2026-11-19 to embed the component in the NetEase desktop player:

- Compile nested CSS to Chromium 91 selectors, scope the global player rules to the plugin's instance and use the nonempty line selector for hover and press styling.
- On Chromium engines that expose only prefixed masks, animate a registered CSS length and use that length as the horizontal offset of `-webkit-mask-position`. This keeps the original Web Animations gradient, keyframe offsets, timing and interpolation on both paths.
- Batch the original word-size reads for one row into a single measurement frame. Recompute masks when springs are disabled. Ignore delayed activation for a row that has since been disabled.
- On a lyric change, initialize the requested time after constructing the new rows. Explicit seeks align to the newly active row, the next main row or the last main row. Background rows no longer abort the time update.
- Resolve the interlude before the next main row from the preceding vocals’ end times. Seeking into a gap and playing through it share the same dot phase, including in the intro. Drive the original dots’ breathing scale and opacity from the media clock so pause, seek and playback rate work throughout the gap.
- Disconnect the resize observer, clear scroll state, release pending row callbacks and detach lines when the player is disposed.

### 0.5.58

- Measure visible containers on reveal and let CSS set each row's width directly from its parent.
- Render timed romanization between the original and translation. The romanization uses its own word timings and the existing float and gradient algorithms.
- Add a glyph-local glow and a wider feather for sustained CJK endings. The same transport clock drives the glow and its release.

### 0.5.59

Normal scroll and word curves are retained. Only activated lines allocate word animations and masks. An outgoing line can finish its release while visible. Offscreen inactive lines return to their reading layout. Wheel and touch deltas are accumulated into one layout per animation frame. The final CJK glow holds until 90% of the sung tail and is transparent by 99.5%.

### 0.5.61

Manual browsing uses the current measured line heights, one translated column and a binary search over the visible interval. The lyric clock remains live. A layout change keeps a visible row anchored, and leaving browse mode seeds normal scrolling from the last drawn positions. Source background vocals carry a display role independently from the renderer’s lead/background pairing.

### 0.5.62

Lyric rows update transform, blur, transition delay, opacity and mask alpha independently. A converged spring holds its position without evaluating its solver again. Delayed targets and parameters continue to count down, and the existing solver and convergence rule drive the next movement.

### 0.5.63

Offscreen rows retain timing and a measured height; inactive word and reading subtrees are released and rebuilt with the same layout on entry. Reflow reads sizes in batches of 24. Normal playback shares the timing-boundary index and advances only scheduled row springs. The Chromium 91 prefixed mask path samples the original piecewise-linear gradient stops on the audio clock, writing only changed pixel positions; the standard WAAPI path trims constant end segments. Detached and paused resources are covered by regression tests.

### 0.5.64

The browse window marks rows that have finished relative to the current media time. Only those rows receive the stronger reading color. Rewinding rebuilds the static ink of rows that now start in the future, dropping their old sweep and lift effects.
