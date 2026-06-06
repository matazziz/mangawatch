/**
 * Upload photo de profil — file d'attente, aperçu Object URL (mobile-friendly).
 */
(function(global) {
    const INPUT_ID = 'profile-avatar-file-input';

    let avatarSaveQueue = Promise.resolve();
    let avatarLoadGeneration = 0;
    let avatarPreviewObjectUrl = null;

    function revokeAvatarPreviewUrl() {
        if (avatarPreviewObjectUrl) {
            try { URL.revokeObjectURL(avatarPreviewObjectUrl); } catch (e) { /* ignore */ }
            avatarPreviewObjectUrl = null;
        }
    }

    function getAvatarFileInput() {
        return document.getElementById(INPUT_ID);
    }

    function setAvatarInputDisabled(disabled) {
        const input = getAvatarFileInput();
        if (input) input.disabled = disabled;
        const wrapper = document.getElementById('profile-avatar-wrapper');
        if (wrapper) wrapper.style.pointerEvents = disabled ? 'none' : '';
        const editBtn = document.getElementById('edit-avatar-btn');
        if (editBtn) editBtn.style.pointerEvents = disabled ? 'none' : '';
    }

    function queueAvatarSaveLocal(task) {
        avatarSaveQueue = avatarSaveQueue.catch(function() {}).then(task);
        return avatarSaveQueue;
    }

    function applyAvatarPreview(url, opts) {
        if (typeof global.applyProfileAvatars === 'function') {
            global.applyProfileAvatars(url, Object.assign({ cacheBust: false }, opts || {}));
            return;
        }
        const userAvatar = document.getElementById('user-avatar');
        const profileAvatar = document.getElementById('profile-avatar');
        const disp = (global.upgradeProfileAvatarUrl || function(u) { return u; })(url);
        if (userAvatar) userAvatar.src = disp;
        if (profileAvatar) profileAvatar.src = disp;
    }

    function applyAvatarPreviewFromFile(file) {
        revokeAvatarPreviewUrl();
        avatarPreviewObjectUrl = URL.createObjectURL(file);
        applyAvatarPreview(avatarPreviewObjectUrl);
    }

    function optimizeAvatarFile(file, maxSize, quality) {
        maxSize = maxSize || 2048;
        quality = typeof quality === 'number' ? quality : 1.0;
        return new Promise(function(resolve, reject) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxSize || height > maxSize) {
                        const ratio = Math.min(maxSize / width, maxSize / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas indisponible'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0, width, height);
                    const outMime = quality >= 1.0 ? 'image/png' : 'image/jpeg';
                    const outExt = quality >= 1.0 ? '.png' : '.jpg';
                    const baseName = (file.name || 'avatar').replace(/\.[^.]+$/, '');
                    canvas.toBlob(function(blob) {
                        if (!blob) {
                            reject(new Error('Conversion image impossible'));
                            return;
                        }
                        resolve(new File([blob], baseName + outExt, {
                            type: outMime,
                            lastModified: Date.now()
                        }));
                    }, outMime, quality >= 1.0 ? undefined : quality);
                };
                img.onerror = function() { reject(new Error('Image illisible')); };
                img.src = ev.target.result;
            };
            reader.onerror = function() { reject(new Error('Lecture fichier impossible')); };
            reader.readAsDataURL(file);
        });
    }

    async function prepareAvatarFile(file) {
        const isMobile = typeof global.matchMedia === 'function' && global.matchMedia('(max-width: 768px)').matches;
        if (isMobile) {
            return file;
        }
        if (file.size < 800 * 1024) {
            return file;
        }
        try {
            return await optimizeAvatarFile(file, 2048, 1.0);
        } catch (optErr) {
            console.warn('[Avatar] Optimisation échouée, fichier original:', optErr);
            return file;
        }
    }

    function persistAvatarLocally(user, avatarUrl) {
        user.customAvatar = avatarUrl;
        user.avatar = avatarUrl;
        try { localStorage.setItem('user', JSON.stringify(user)); } catch (e) { /* ignore */ }
        try { localStorage.setItem('avatar_' + user.email, avatarUrl); } catch (e) { /* ignore */ }
        try {
            const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            const idx = accounts.findIndex(function(acc) { return acc.email === user.email; });
            if (idx >= 0) {
                accounts[idx].avatar = avatarUrl;
                accounts[idx].customAvatar = avatarUrl;
                localStorage.setItem('accounts', JSON.stringify(accounts));
            }
        } catch (e) { /* ignore */ }
        try {
            const profileKey = 'profile_' + user.email;
            const existing = JSON.parse(localStorage.getItem(profileKey) || '{}');
            existing.customAvatar = avatarUrl;
            existing.avatar = avatarUrl;
            existing.email = user.email;
            localStorage.setItem(profileKey, JSON.stringify(existing));
        } catch (e) { /* ignore */ }
    }

    function notifyAvatarError(error) {
        const errorMessage = (error && error.message) || String(error || '');
        if (errorMessage.includes('SESSION_FIREBASE_REQUISE') || (error && error.code === 'auth/not-authenticated')) {
            alert('Session expirée.\n\nDéconnectez-vous puis reconnectez-vous, puis réessayez d\'ajouter votre photo.');
            return;
        }
        if (error && (error.code === 'storage/unauthorized' || errorMessage.includes('PERMISSION_DENIED'))) {
            alert('Erreur de permissions Firebase Storage.\n\nVérifiez votre connexion et réessayez.\n\n' + errorMessage);
            return;
        }
        alert('Erreur lors de l\'upload de la photo.\n\n' + errorMessage);
    }

    async function uploadAvatarFile(file) {
        return queueAvatarSaveLocal(async function() {
            const saveGen = ++avatarLoadGeneration;
            global.avatarSaveInProgress = true;
            setAvatarInputDisabled(true);
            try {
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                if (!user || !user.email) {
                    alert('Vous devez être connecté pour modifier votre photo.');
                    return;
                }

                applyAvatarPreviewFromFile(file);

                if (!global.avatarService || typeof global.avatarService.saveAvatar !== 'function') {
                    alert('Firebase Storage n\'est pas disponible. Rechargez la page.');
                    return;
                }

                const fileToUpload = await prepareAvatarFile(file);

                if (typeof global.showMangaWatchToast === 'function') {
                    global.showMangaWatchToast('Envoi de la photo…', 'info', 1200);
                }

                const isMobile = typeof global.matchMedia === 'function' && global.matchMedia('(max-width: 768px)').matches;
                const timeoutMs = isMobile ? 45000 : 20000;
                const uploadPromise = global.avatarService.saveAvatar(user.email, fileToUpload);
                const timeoutPromise = new Promise(function(_, reject) {
                    setTimeout(function() {
                        reject(new Error('TIMEOUT: Upload trop long, vérifiez votre connexion'));
                    }, timeoutMs);
                });

                const avatarUrl = await Promise.race([uploadPromise, timeoutPromise]);

                if (saveGen !== avatarLoadGeneration) return;

                applyAvatarPreview(avatarUrl, { cacheBust: true });
                revokeAvatarPreviewUrl();
                persistAvatarLocally(user, avatarUrl);

                try {
                    global.dispatchEvent(new CustomEvent('profileAvatarUpdated', { detail: { url: avatarUrl } }));
                } catch (e) { /* ignore */ }

                if (typeof global.syncRemoteProfileMedia === 'function') {
                    void global.syncRemoteProfileMedia(user.email, { forceServer: true }).catch(function() {});
                }

                if (typeof global.showToast === 'function') {
                    global.showToast('Succès', 'Photo de profil mise à jour !', 'success');
                } else if (typeof global.showMangaWatchToast === 'function') {
                    global.showMangaWatchToast('Photo de profil mise à jour !', 'success');
                }
            } catch (err) {
                if (saveGen === avatarLoadGeneration) {
                    console.error('[Avatar] Upload:', err);
                    notifyAvatarError(err);
                }
            } finally {
                global.avatarSaveInProgress = false;
                setAvatarInputDisabled(false);
                if (typeof global.refreshHeaderAvatar === 'function') {
                    global.refreshHeaderAvatar({ cacheBust: true });
                }
            }
        });
    }

    function openProfileAvatarFilePicker(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (global.avatarSaveInProgress) return;
        const input = getAvatarFileInput();
        if (!input) {
            alert('Sélecteur de photo indisponible. Rechargez la page.');
            return;
        }
        input.value = '';
        input.click();
    }

    async function onAvatarFileChange(ev) {
        const file = ev.target && ev.target.files && ev.target.files[0];
        if (!file) return;
        if (global.avatarSaveInProgress) {
            ev.target.value = '';
            return;
        }
        if (!String(file.type || '').toLowerCase().startsWith('image/')) {
            alert('Veuillez choisir une image (JPG, PNG, etc.).');
            ev.target.value = '';
            return;
        }
        await uploadAvatarFile(file);
        ev.target.value = '';
    }

    function initProfileAvatarUpload() {
        const input = getAvatarFileInput();
        if (!input || input.dataset.mwAvatarBound === '1') return;
        input.dataset.mwAvatarBound = '1';
        input.addEventListener('change', onAvatarFileChange);
    }

    global.openProfileAvatarFilePicker = openProfileAvatarFilePicker;
    global.initProfileAvatarUpload = initProfileAvatarUpload;
    global.handleAvatarEditClick = openProfileAvatarFilePicker;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProfileAvatarUpload);
    } else {
        initProfileAvatarUpload();
    }
})(typeof window !== 'undefined' ? window : globalThis);
