plugin.onLoad(() => {
    const crossfadeTime = 8, loadTime = 3;
    let status = 'none';

    loadedPlugins.LibFrontendPlay.addEventListener('audioSourceUpdated', ({ detail }) => {
        if (status !== 'loading') return;
        //     gainNodeNext = loadedPlugins.LibFrontendPlay.currentAudioContext.createGain();
        //     const audioCtx=loadedPlugins.LibFrontendPlay.currentAudioContext
        //     detail.connect(gainNodeNext);
        //     gainNodeNext.connect(audioCtx.destination);
        //     gainNodeNext.gain.setValueAtTime(0, 0);

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

        //     if(!gainNodeNext){
        //         gainNodePrevious = loadedPlugins.LibFrontendPlay.currentAudioContext.createGain();
        //         const audioCtx=loadedPlugins.LibFrontendPlay.currentAudioContext
        //         gainNodePrevious.gain.setValueAtTime(0, audioCtx.currentTime);
        //         loadedPlugins.LibFrontendPlay.currentAudioSource.connect(gainNodePrevious);
        //         gainNodePrevious.connect(audioCtx.destination);
        //     }else{
        //         gainNodePrevious = gainNodeNext;
        //         gainNodeNext = null;
        //     }

        lastPlayer.addEventListener('timeupdate', () => {
            if ((lastPlayer.duration - lastPlayer.currentTime) < 0.3) {
                lastPlayer.remove();
                lastPlayer.pause();
                setImmediate(() => {
                    loadedPlugins.LibFrontendPlay.currentAudioPlayer.dispatchEvent(new CustomEvent('play'))
                })
            }
        })

        document.querySelector('.btnc-nxt').click()
    }

    setInterval(() => {
        const currentPlayer = loadedPlugins.LibFrontendPlay.currentAudioPlayer;
        const previousPlayer = loadedPlugins.LibFrontendPlay.previousAudioPlayer;
        const currentPlayerTime = currentPlayer.currentTime ?? 0;
        if (status === 'none' && currentPlayerTime > currentPlayer.duration - crossfadeTime - loadTime) {
            status = 'loading';
            switchToNext();
        }

        if (status === 'canplay' && previousPlayer?.currentTime > previousPlayer?.duration - crossfadeTime - 0.3) {
            status = 'fade';

            console.log('[Crossfade] Playing next song!');

            loadedPlugins.LibFrontendPlay.currentAudioPlayer.play();
            //         gainNodeNext.gain.setValueAtTime(0, 0);
            //         gainNodeNext.gain.linearRampToValueAtTime(0, crossfadeTime);
            //         gainNodePrevious.gain.setValueAtTime(1, previousPlayer?.duration-crossfadeTime);
            //         gainNodePrevious.gain.linearRampToValueAtTime(0, previousPlayer?.duration-0.5)
        }

        if (status === 'fade') {
            const ratio = (previousPlayer?.currentTime - previousPlayer?.duration + crossfadeTime + 0.3) / crossfadeTime;
            console.log(ratio)
            if (ratio >= 1) {
                status = 'none'
                previousPlayer.remove();
                return;
            }


            currentPlayer.volume = ratio * loadedPlugins.LibFrontendPlay.volume;
            previousPlayer.volume = (1 - ratio) * loadedPlugins.LibFrontendPlay.volume;
        }
    }, 30)
});