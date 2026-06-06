(function (global) {
    'use strict';

    function isMobileCoarseDevice() {
        if (typeof global.matchMedia === 'function' && global.matchMedia('(pointer: coarse)').matches) {
            return true;
        }
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(global.navigator && global.navigator.userAgent ? global.navigator.userAgent : '');
    }

    function normalizeBannerVolume(volume) {
        if (volume === undefined || volume === null) return 35;
        volume = parseInt(volume, 10);
        if (isNaN(volume)) return 35;
        return Math.max(0, Math.min(100, volume));
    }

    function prepareBannerVideoElement(videoEl) {
        if (!videoEl) return;
        videoEl.playsInline = true;
        videoEl.setAttribute('playsinline', '');
        videoEl.setAttribute('webkit-playsinline', '');
        videoEl.loop = true;
    }

    function playBannerVideoSafely(videoEl, volume) {
        if (!videoEl) return Promise.resolve();

        var vol = normalizeBannerVolume(volume);
        var mobile = isMobileCoarseDevice();

        prepareBannerVideoElement(videoEl);
        videoEl.volume = vol > 0 ? vol / 100 : 0;
        videoEl.muted = true;

        function startPlayback() {
            return videoEl.play().then(function () {
                if (vol > 0 && !mobile) {
                    videoEl.muted = false;
                }
            }).catch(function (err) {
                console.warn('Lecture bannière (autoplay muet):', err);
            });
        }

        if (videoEl.readyState >= 2) {
            return startPlayback();
        }

        return new Promise(function (resolve) {
            function onReady() {
                videoEl.removeEventListener('canplay', onReady);
                videoEl.removeEventListener('loadeddata', onReady);
                startPlayback().then(resolve);
            }
            videoEl.addEventListener('canplay', onReady, { once: true });
            videoEl.addEventListener('loadeddata', onReady, { once: true });
        });
    }

    function resumeBannerVideoOnGesture(videoEl) {
        if (!videoEl || !videoEl.src) return;
        prepareBannerVideoElement(videoEl);
        if (videoEl.paused) {
            videoEl.play().catch(function () {});
        }
    }

    global.isMobileCoarseDevice = isMobileCoarseDevice;
    global.normalizeBannerVolume = normalizeBannerVolume;
    global.playBannerVideoSafely = playBannerVideoSafely;
    global.resumeBannerVideoOnGesture = resumeBannerVideoOnGesture;
})(typeof window !== 'undefined' ? window : global);
