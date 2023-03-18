plugin.onAllPluginsLoaded(() => {
    !(async () => {
        const crossfadeTime = 8, loadTime = 3;
        let status = 'none';

        loadedPlugins.LibFrontendPlay.addEventListener('audioSourceUpdated', ({ detail }) => {
            if (status !== 'loading') return;

            loadedPlugins.LibFrontendPlay.currentAudioPlayer.volume = 0
            const onCanPlay = () => {
                status = 'canplay'
                console.log('[Crossfade] Canplay!')
                setTimeout(() => {
                    loadedPlugins.LibFrontendPlay.currentAudioPlayer.pause();
                })
                loadedPlugins.LibFrontendPlay.currentAudioPlayer.removeEventListener('canplay', onCanPlay)
            };
            loadedPlugins.LibFrontendPlay.currentAudioPlayer.addEventListener('canplay', onCanPlay)
        })

        const switchToNext = async () => {
            console.log('[Crossfade] Preloading...')
            const lastPlayer = loadedPlugins.LibFrontendPlay.currentAudioPlayer;
            loadedPlugins.LibFrontendPlay.previousAudioPlayer = lastPlayer;
            loadedPlugins.LibFrontendPlay.currentAudioPlayer = null;

            lastPlayer.addEventListener('timeupdate', () => {
                if ((lastPlayer.duration - lastPlayer.currentTime) < 0.3) {
                    lastPlayer.remove();
                    lastPlayer.pause();
                    setTimeout(() => {
                        loadedPlugins.LibFrontendPlay.currentAudioPlayer.dispatchEvent(new CustomEvent('play'))
                    },10)
                }
            })

            document.querySelector('.btnc-nxt').click()
        }

        setInterval(() => {
            const currentPlayer = loadedPlugins.LibFrontendPlay.currentAudioPlayer;
            const previousPlayer = loadedPlugins.LibFrontendPlay.previousAudioPlayer;
            const currentPlayerTime = currentPlayer?.currentTime ?? 0;
            if (status === 'none' && currentPlayerTime > currentPlayer.duration - crossfadeTime - loadTime) {
                status = 'loading';
                switchToNext();
            }

            if (status === 'canplay' && previousPlayer?.currentTime > previousPlayer?.duration - crossfadeTime - 0.3) {
                status = 'fade';

                console.log('[Crossfade] Playing next song!');

                loadedPlugins.LibFrontendPlay.currentAudioPlayer.play();
            }

            if (status === 'fade') {
                const ratio = currentPlayerTime / crossfadeTime;

                if (ratio >= 1) {
                    status = 'none'
                    previousPlayer.remove();
                    return;
                }


                currentPlayer.volume = ratio * loadedPlugins.LibFrontendPlay.volume;
                previousPlayer.volume = (1 - ratio) * loadedPlugins.LibFrontendPlay.volume;
            }
        }, 30)
    })()
});