# Third-party code and references

MiniLyrics is distributed under GPL-3.0-or-later; see LICENSE.

## 0.6.7 Lyricify Backgrounds

Uses code from WXRIW and contributors, https://github.com/WXRIW/Lyricify-Backgrounds, under Apache License 2.0. The full license is bundled at licenses/Lyricify-Backgrounds-Apache-2.0.txt.

- native/lyricify_shader.hpp embeds AppleMusicIosBackground.hlsl unchanged (upstream blob b7f04a0a8d4ecbccadd4309030c815be0d2cf0a0).
- native/lyricify_presets.hpp ports portrait preset 0 and landscape preset 0 coordinates from AppleMusicIosMesh.cs (blob ea50e86a7265263b730766879ab04f106b6ada5e).
- native/lyricify_gpu.hpp translates the subdivision method to C++ and adds a MiniLyrics D3D11 host, fixed low-resolution surfaces and Direct2D compatibility readback. These adapter changes are by shoebillback, 2026.

This is an adapted background pipeline, not the complete Lyricify WPF/WinUI renderer. Audio reactivity, random preset selection and ordinary/lyrics layout switching are not included. Shader compilation uses the Windows D3DCompiler system component. Standard/dark styling, frame limits, cover transitions and error fallback are controlled by MiniLyrics.

0.6.9 corrects the adapter to use the upstream AppleMusicIosRenderer.GetBlurScale downsample factor (4) and landscape texture scale (0.8, centered), with the MiniLyrics window dimensions supplied in DIP. Reference: https://github.com/WXRIW/Lyricify-Backgrounds/blob/master/Lyricify.Backgrounds.AppleMusicInspired.Ios.WinUI/AppleMusicIosRenderer.cs . The embedded upstream HLSL remains unchanged.

0.6.10 adapts the fullscreen blur strength to compact MiniLyrics windows and scales preset deviations from a regular grid to 70% before subdivision. The embedded upstream shader and preset coordinate data remain unchanged; these are renderer adapter changes.

0.3.0 no longer bundles liblyric or a lyric parser. The historical credits remain in CHANGELOG.md and previous releases.

## Dependencies and reviewed references

- InfLink-rs: historical reference for song metadata, playback state, timeline and controls; no runtime dependency since 0.7.0. The 0.7.8 player initialization order also references InfLink V3.
- RefinedNowPlayingNext: https://github.com/SUlTlUS/refined-now-playing-netease-next — processed lyrics, translation, word timing and global-offset events; 0.5.0 measured lyric groups, 200 ms layout lookahead, 50 ms stagger, 500 ms position transitions, four motion curves and float-word timing are adapted from the installed RNPNext implementation (3.0.2+locallyrics.2).
- LyricBarNext: https://github.com/GlassesMita/LyricBarNext — original project reference and earlier bridge/store-discovery research; no runtime dependency in 0.3.0.
- Taskbar-Lyrics: https://github.com/BetterNCM/BetterNCM-Plugins/tree/master/plugins-data/Taskbar-Lyrics — plugin/external-native-process structure and BetterNCM app.exec usage. No binary reused.

MiniLyrics does not claim complete visual equivalence with RefinedNowPlayingNext. Direct2D, DirectWrite, WIC and WinHTTP are Windows system components.

0.6.6 ports the RNPNext seek-position transition rules (500 ms transform duration, direction-aware 50 ms stagger and the existing timing curves) to native lyric flights. Full-track geometry is lightweight; native text layouts remain virtualized around the viewport. The source reference is src/lyrics.js and src/lyrics.scss at revision 167bffe62b57bd276fc6aa34237c4a197f56fa7d.

0.6.2 adapts RNPNext's Interlude component and CSS: integer thirds of the interlude duration, per-dot opacity/scale, the two-second group breath, and delayed entrance/exit fades. Reference revision: 167bffe62b57bd276fc6aa34237c4a197f56fa7d, src/lyrics.js and src/lyrics.scss. RNP's isInterlude marker is preserved by the bridge. MiniLyrics retains its compact lyric layout and uses native Direct2D circles at the selected 30/60 FPS.

## Windows scheduling references

- https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-createwaitabletimerexw
- https://learn.microsoft.com/en-us/windows/win32/api/d2d1/ne-d2d1-d2d1_present_options

## 0.6.0 background visual reference

RNPNext background.js/background.scss informed the cover-based fluid visual direction. MiniLyrics implements its own native warped color fields and cached Direct2D bitmap rendering; it does not embed RNP's DOM/CSS/SVG fluid renderer or a physical fluid solver.
