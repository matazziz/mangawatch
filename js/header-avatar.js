/**
 * Avatar header — résolution unifiée et affichage #user-avatar / #profile-avatar.
 * Masque l'avatar tant que l'utilisateur n'est pas connecté ou n'a pas d'image.
 */
(function(global) {
    var HEADER_AVATAR_INIT = false;

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

    function isUserLoggedIn() {
        try {
            if (global.localStorage.getItem('isLoggedIn') !== 'true') return false;
            var user = JSON.parse(global.localStorage.getItem('user') || 'null');
            return !!(user && user.email);
        } catch (e) {
            return false;
        }
    }

    function getAvatarLinkEl() {
        var el = global.document.getElementById('user-avatar');
        return (el && el.closest('.avatar-link')) || global.document.querySelector('.avatar-link');
    }

    function clearHeaderAvatarImage() {
        var el = global.document.getElementById('user-avatar');
        if (!el) return;
        el.onerror = null;
        el.onload = null;
        el.removeAttribute('src');
        el.src = '';
        el.alt = '';
        delete el.dataset.mwAvatarSrc;
        delete el.dataset.mwAvatarRetried;
    }

    function setAvatarLinkVisible(visible) {
        var links = global.document.querySelectorAll('.main-header .avatar-link, header .avatar-link, .avatar-link');
        if (!links.length) {
            var single = getAvatarLinkEl();
            if (single) links = [single];
        }
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            link.classList.toggle('is-auth-visible', !!visible);
            link.classList.toggle('is-guest-hidden', !visible);
        }
    }

    function ensureGuestAvatarHidden() {
        if (isUserLoggedIn()) return;
        setAvatarLinkVisible(false);
        clearHeaderAvatarImage();
    }

    function syncHeaderAuthState() {
        if (!isUserLoggedIn()) {
            setAvatarLinkVisible(false);
            clearHeaderAvatarImage();
            return false;
        }
        return true;
    }

    function resolveProfileAvatarUrl(userOrEmail) {
        if (!isUserLoggedIn()) return '';

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
        return /\/images\/(logo|default-avatar)\.png/i.test(src) || /placeholder/i.test(src);
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
                setAvatarLinkVisible(false);
                clearHeaderAvatarImage();
                return;
            }
            this.dataset.mwAvatarRetried = '1';
            this.src = upgradeProfileAvatarUrl(url);
        };
        return true;
    }

    /**
     * Applique une URL d'avatar aux éléments de la page.
     * opts.scope : 'both' (défaut, profil perso), 'header' (#user-avatar), 'profile' (#profile-avatar, profil public).
     */
    function applyProfileAvatars(url, opts) {
        if (!url) return;
        opts = opts || {};
        var scope = opts.scope || 'both';
        if (scope === 'both' || scope === 'header') {
            setAvatarOnElement(global.document.getElementById('user-avatar'), url, opts);
        }
        if (scope === 'both' || scope === 'profile') {
            setAvatarOnElement(global.document.getElementById('profile-avatar'), url, opts);
        }
    }

    function refreshHeaderAvatar(opts) {
        if (!syncHeaderAuthState()) return '';

        var url = resolveProfileAvatarUrl();
        if (!url) {
            setAvatarLinkVisible(false);
            clearHeaderAvatarImage();
            return '';
        }

        var headerEl = global.document.getElementById('user-avatar');
        if (global.avatarSaveInProgress && headerEl && shouldPreserveLivePreview(headerEl)) {
            setAvatarLinkVisible(true);
            return url;
        }

        setAvatarLinkVisible(true);
        applyProfileAvatars(url, Object.assign({}, opts, { scope: 'header' }));
        return url;
    }

    function initHeaderAvatar() {
        ensureGuestAvatarHidden();
        if (HEADER_AVATAR_INIT) {
            refreshHeaderAvatar();
            return;
        }
        HEADER_AVATAR_INIT = true;
        refreshHeaderAvatar();

        var tries = 0;
        var timer = setInterval(function() {
            tries += 1;
            if (!isUserLoggedIn()) {
                syncHeaderAuthState();
                if (tries >= 80) clearInterval(timer);
                return;
            }
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
    global.syncHeaderAuthState = syncHeaderAuthState;
    global.isUserLoggedIn = isUserLoggedIn;

    global.addEventListener('profileAvatarUpdated', function(ev) {
        var url = ev && ev.detail && ev.detail.url;
        if (url) {
            setAvatarLinkVisible(true);
            applyProfileAvatars(url, { cacheBust: true });
        } else {
            refreshHeaderAvatar({ cacheBust: true });
        }
    });

    global.addEventListener('storage', function(ev) {
        if (!ev || (ev.key !== 'user' && ev.key !== 'isLoggedIn')) return;
        refreshHeaderAvatar({ cacheBust: true });
    });

    var remoteAvatarSyncTimer = null;
    function scheduleRemoteAvatarSync() {
        if (remoteAvatarSyncTimer) clearTimeout(remoteAvatarSyncTimer);
        remoteAvatarSyncTimer = setTimeout(function() {
            remoteAvatarSyncTimer = null;
            if (global.avatarSaveInProgress || !isUserLoggedIn()) return;
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
        if (global.document.visibilityState === 'visible') {
            refreshHeaderAvatar();
            scheduleRemoteAvatarSync();
        }
    });
    global.addEventListener('focus', function() {
        refreshHeaderAvatar();
        scheduleRemoteAvatarSync();
    });
    global.addEventListener('pageshow', function(ev) {
        refreshHeaderAvatar();
        if (!ev || ev.persisted) scheduleRemoteAvatarSync();
    });

    if (global.document.readyState === 'loading') {
        global.document.addEventListener('DOMContentLoaded', initHeaderAvatar);
    } else {
        initHeaderAvatar();
    }

    // Masquer immédiatement le cadre avatar si le script charge après le HTML
    ensureGuestAvatarHidden();
})(typeof window !== 'undefined' ? window : globalThis);
