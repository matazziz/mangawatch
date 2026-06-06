/**
 * Avatar header — résolution unifiée et affichage #user-avatar / #profile-avatar.
 */
(function(global) {
    function upgradeProfileAvatarUrl(url) {
        if (!url || typeof url !== 'string') return url;
        if (url.indexOf('data:') === 0 || url.indexOf('blob:') === 0) return url;
        if (url.indexOf('googleusercontent.com') !== -1) {
            return url.replace(/=s\d+(-c)?/gi, '=s512-c');
        }
        if (url.indexOf('gravatar.com') !== -1 && /[?&]s=\d+/.test(url)) {
            return url.replace(/([?&]s=)\d+/, '$1128');
        }
        return url;
    }

    function withCacheBust(url) {
        if (!url || typeof url !== 'string') return url;
        if (url.indexOf('data:') === 0 || url.indexOf('blob:') === 0) return url;
        if (!/^https?:\/\//i.test(url)) return url;
        if (url.indexOf('firebasestorage') !== -1 || url.indexOf('googleusercontent.com') !== -1) {
            return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + Date.now();
        }
        return url;
    }

    function normalizeEmail(email) {
        return String(email || '').trim().toLowerCase();
    }

    function resolveProfileAvatarUrl(userOrEmail) {
        var user = null;
        var email = '';

        if (userOrEmail && typeof userOrEmail === 'object' && userOrEmail.email) {
            user = userOrEmail;
            email = normalizeEmail(user.email);
        } else {
            email = normalizeEmail(userOrEmail);
            try { user = JSON.parse(global.localStorage.getItem('user') || 'null'); } catch (e) { user = null; }
        }

        if (!email && user && user.email) email = normalizeEmail(user.email);
        if (!email) return '';

        var url = '';
        try {
            var dedicated = global.localStorage.getItem('avatar_' + email);
            if (dedicated && String(dedicated).trim()) url = String(dedicated).trim();
        } catch (e) { /* ignore */ }

        if (!url && user && normalizeEmail(user.email) === email) {
            url = String(user.customAvatar || user.avatar || user.originalAvatar || user.picture || '').trim();
        }

        if (!url) {
            try {
                var accounts = JSON.parse(global.localStorage.getItem('accounts') || '[]');
                var acc = accounts.find(function(a) { return normalizeEmail(a && a.email) === email; });
                if (acc) url = String(acc.customAvatar || acc.avatar || '').trim();
            } catch (e) { /* ignore */ }
        }

        if (!url) {
            try {
                var prof = JSON.parse(global.localStorage.getItem('profile_' + email) || '{}');
                url = String(prof.customAvatar || prof.avatar || '').trim();
            } catch (e) { /* ignore */ }
        }

        return url;
    }

    function isPlaceholderAvatarSrc(src) {
        if (!src) return true;
        if (src === global.location.href) return true;
        return /\/images\/logo\.png/i.test(src) || /placeholder/i.test(src);
    }

    function shouldPreserveLivePreview(imgEl) {
        if (!global.avatarSaveInProgress || !imgEl) return false;
        var src = imgEl.src || '';
        return src.indexOf('blob:') === 0 || src.indexOf('data:') === 0;
    }

    function setAvatarOnElement(el, url, opts) {
        if (!el || !url) return false;
        opts = opts || {};

        if (shouldPreserveLivePreview(el)) return false;

        var disp = upgradeProfileAvatarUrl(url);
        if (opts.cacheBust !== false && disp.indexOf('blob:') !== 0 && disp.indexOf('data:') !== 0) {
            disp = withCacheBust(disp);
        }

        if (el.dataset.mwAvatarSrc === disp && !isPlaceholderAvatarSrc(el.src)) return false;

        el.onerror = null;
        el.onload = null;
        el.dataset.mwAvatarSrc = disp;
        el.dataset.mwAvatarRetried = '';
        el.src = disp;

        el.onerror = function() {
            if (this.dataset.mwAvatarRetried === '1') {
                this.onerror = null;
                return;
            }
            this.dataset.mwAvatarRetried = '1';
            this.src = upgradeProfileAvatarUrl(url);
        };
        return true;
    }

    function applyProfileAvatars(url, opts) {
        if (!url) return;
        setAvatarOnElement(global.document.getElementById('user-avatar'), url, opts);
        setAvatarOnElement(global.document.getElementById('profile-avatar'), url, opts);
    }

    function refreshHeaderAvatar(opts) {
        var url = resolveProfileAvatarUrl();
        if (!url) return '';

        var headerEl = global.document.getElementById('user-avatar');
        if (global.avatarSaveInProgress && headerEl && shouldPreserveLivePreview(headerEl)) {
            return url;
        }

        applyProfileAvatars(url, opts);
        return url;
    }

    function initHeaderAvatar() {
        refreshHeaderAvatar();

        var tries = 0;
        var timer = setInterval(function() {
            tries += 1;
            var el = global.document.getElementById('user-avatar');
            if (!el) {
                if (tries >= 40) clearInterval(timer);
                return;
            }
            if (!isPlaceholderAvatarSrc(el.src) && el.src) {
                clearInterval(timer);
                return;
            }
            refreshHeaderAvatar();
            if (tries >= 40) clearInterval(timer);
        }, 150);
    }

    global.upgradeProfileAvatarUrl = upgradeProfileAvatarUrl;
    global.resolveProfileAvatarUrl = resolveProfileAvatarUrl;
    global.applyProfileAvatars = applyProfileAvatars;
    global.refreshHeaderAvatar = refreshHeaderAvatar;

    global.addEventListener('profileAvatarUpdated', function(ev) {
        var url = ev && ev.detail && ev.detail.url;
        if (url) {
            applyProfileAvatars(url, { cacheBust: true });
        } else {
            refreshHeaderAvatar({ cacheBust: true });
        }
    });

    var remoteAvatarSyncTimer = null;
    function scheduleRemoteAvatarSync() {
        if (remoteAvatarSyncTimer) clearTimeout(remoteAvatarSyncTimer);
        remoteAvatarSyncTimer = setTimeout(function() {
            remoteAvatarSyncTimer = null;
            if (global.avatarSaveInProgress) return;
            var user = null;
            try { user = JSON.parse(global.localStorage.getItem('user') || 'null'); } catch (e) { user = null; }
            if (!user || !user.email || typeof global.syncRemoteProfileMedia !== 'function') return;
            global.syncRemoteProfileMedia(user.email, { forceServer: true })
                .then(function() {
                    refreshHeaderAvatar({ cacheBust: true });
                })
                .catch(function() { /* ignore */ });
        }, 350);
    }

    global.document.addEventListener('visibilitychange', function() {
        if (global.document.visibilityState === 'visible') scheduleRemoteAvatarSync();
    });
    global.addEventListener('focus', scheduleRemoteAvatarSync);
    global.addEventListener('pageshow', function(ev) {
        if (!ev || ev.persisted) scheduleRemoteAvatarSync();
    });

    if (global.document.readyState === 'loading') {
        global.document.addEventListener('DOMContentLoaded', initHeaderAvatar);
    } else {
        initHeaderAvatar();
    }
})(typeof window !== 'undefined' ? window : globalThis);
