/**
 * Popup post-inscription : choix photo de profil + bannière.
 */
import { importFirebaseService } from './firebase-import.js';

const OVERLAY_ID = 'post-signup-media-overlay';

function t(key, fallback) {
    if (typeof window.t === 'function') {
        const v = window.t(key);
        if (v && v !== key) return v;
    }
    return fallback;
}

function persistAvatarLocally(user, avatarUrl) {
    user.customAvatar = avatarUrl;
    user.avatar = avatarUrl;
    user.picture = avatarUrl;
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

function persistBannerLocally(userEmail, bannerData) {
    try {
        localStorage.setItem('profile_banner_' + userEmail, JSON.stringify({
            type: bannerData.type || 'image',
            url: bannerData.url,
            volume: bannerData.volume !== undefined ? bannerData.volume : 35
        }));
    } catch (e) { /* ignore */ }
}

function injectStyles() {
    if (document.getElementById('post-signup-media-styles')) return;
    const style = document.createElement('style');
    style.id = 'post-signup-media-styles';
    style.textContent = `
        #${OVERLAY_ID} {
            position: fixed;
            inset: 0;
            z-index: 10600;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            background: radial-gradient(ellipse at center, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.96) 100%);
            animation: fadeInOverlay 0.35s ease;
        }
        .post-signup-media-card {
            width: min(520px, 100%);
            max-height: min(92vh, 720px);
            overflow-y: auto;
            background: linear-gradient(160deg, #1e1e24 0%, #141418 100%);
            border: 1px solid rgba(0, 196, 93, 0.25);
            border-radius: 20px;
            padding: 1.35rem 1.25rem 1.1rem;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
            color: #f5f6fa;
            text-align: center;
        }
        .post-signup-media-card h2 {
            margin: 0 0 0.35rem;
            font-size: clamp(1.15rem, 4vw, 1.45rem);
            color: #00e06d;
        }
        .post-signup-media-card .subtitle {
            margin: 0 0 1.1rem;
            color: #b8bcc8;
            font-size: 0.9rem;
            line-height: 1.45;
        }
        .post-signup-media-grid {
            display: grid;
            gap: 1rem;
            margin-bottom: 1.1rem;
        }
        .post-signup-media-block {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 14px;
            padding: 0.85rem;
        }
        .post-signup-media-block h3 {
            margin: 0 0 0.65rem;
            font-size: 0.92rem;
            color: #dfe3ea;
            font-weight: 600;
        }
        .post-signup-avatar-preview {
            width: 108px;
            height: 108px;
            margin: 0 auto 0.7rem;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid rgba(0, 224, 109, 0.55);
            background: rgba(255,255,255,0.06);
            display: block;
        }
        .post-signup-avatar-placeholder {
            width: 108px;
            height: 108px;
            margin: 0 auto 0.7rem;
            border-radius: 50%;
            border: 2px dashed rgba(255,255,255,0.22);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #8a8f9c;
            font-size: 2rem;
            background: rgba(255,255,255,0.03);
        }
        .post-signup-banner-preview {
            width: 100%;
            height: 120px;
            margin: 0 auto 0.7rem;
            border-radius: 12px;
            object-fit: cover;
            border: 2px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.04);
            display: block;
        }
        .post-signup-banner-placeholder {
            width: 100%;
            height: 120px;
            margin: 0 auto 0.7rem;
            border-radius: 12px;
            border: 2px dashed rgba(255,255,255,0.22);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #8a8f9c;
            font-size: 1.6rem;
            background: rgba(255,255,255,0.03);
        }
        .post-signup-pick-btn {
            width: 100%;
            border: 1px solid rgba(0, 196, 93, 0.45);
            background: rgba(0, 196, 93, 0.12);
            color: #00e06d;
            border-radius: 10px;
            padding: 0.62rem 0.75rem;
            font-size: 0.88rem;
            font-weight: 600;
            cursor: pointer;
        }
        .post-signup-pick-btn:hover {
            background: rgba(0, 196, 93, 0.2);
        }
        .post-signup-actions {
            display: flex;
            flex-direction: column;
            gap: 0.55rem;
        }
        .post-signup-finish-btn {
            width: 100%;
            border: none;
            border-radius: 12px;
            padding: 0.82rem;
            font-size: 0.95rem;
            font-weight: 700;
            cursor: pointer;
            background: linear-gradient(135deg, #00c45d, #00e06d);
            color: #fff;
        }
        .post-signup-finish-btn:disabled {
            opacity: 0.65;
            cursor: wait;
        }
        .post-signup-skip-btn {
            width: 100%;
            border: none;
            background: transparent;
            color: #9aa0ad;
            font-size: 0.84rem;
            cursor: pointer;
            padding: 0.35rem;
        }
        .post-signup-skip-btn:hover { color: #c5cad4; }
        .post-signup-status {
            min-height: 1.1rem;
            margin-bottom: 0.45rem;
            font-size: 0.82rem;
            color: #9aa0ad;
        }
        @media (min-width: 520px) {
            .post-signup-media-grid {
                grid-template-columns: 1fr 1fr;
            }
        }
    `;
    document.head.appendChild(style);
}

function closeOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.remove();
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
}

async function uploadSelections(avatarFile, bannerFile) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) return;

    const mod = await importFirebaseService();
    const avatarService = mod.avatarService;
    const bannerService = mod.bannerService;

    const tasks = [];

    if (avatarFile && avatarService && typeof avatarService.saveAvatar === 'function') {
        tasks.push(
            avatarService.saveAvatar(user.email, avatarFile).then(function(url) {
                persistAvatarLocally(user, url);
                if (typeof window.applyProfileAvatars === 'function') {
                    window.applyProfileAvatars(url, { cacheBust: true });
                }
                try {
                    window.dispatchEvent(new CustomEvent('profileAvatarUpdated', { detail: { url: url } }));
                } catch (e) { /* ignore */ }
            })
        );
    }

    if (bannerFile && bannerService && typeof bannerService.saveBanner === 'function') {
        tasks.push(
            bannerService.saveBanner(user.email, 'image', bannerFile, 35).then(function(bannerData) {
                if (bannerData && bannerData.url) {
                    persistBannerLocally(user.email, bannerData);
                }
            })
        );
    }

    if (tasks.length) {
        await Promise.all(tasks);
    }

    if (typeof window.syncRemoteProfileMedia === 'function') {
        try {
            await window.syncRemoteProfileMedia(user.email, { forceServer: true });
        } catch (e) { /* ignore */ }
    }
}

async function afterMediaFlowComplete() {
    if (typeof window.reloadDynamicSections === 'function') {
        try { await window.reloadDynamicSections(); } catch (e) { /* ignore */ }
    }
    if (typeof window.refreshHeaderAvatar === 'function') {
        window.refreshHeaderAvatar({ cacheBust: true });
    }
}

/**
 * @param {{ username?: string }} options
 * @returns {Promise<void>}
 */
export function showPostSignupMediaPopup(options) {
    options = options || {};
    const username = options.username || '';

    return new Promise(function(resolve) {
        if (document.getElementById(OVERLAY_ID)) {
            resolve();
            return;
        }

        injectStyles();

        let avatarFile = null;
        let bannerFile = null;
        let avatarPreviewUrl = null;
        let bannerPreviewUrl = null;

        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.innerHTML = `
            <div class="post-signup-media-card" role="dialog" aria-modal="true" aria-labelledby="post-signup-media-title">
                <h2 id="post-signup-media-title">${t('auth.media_setup_title', 'Personnalisez votre profil')}</h2>
                <p class="subtitle">${username
                    ? (t('auth.media_setup_subtitle_named', 'Bienvenue ' + username + ' ! Choisissez votre photo et votre bannière.').replace('{name}', username))
                    : t('auth.media_setup_subtitle', 'Choisissez votre photo de profil et votre bannière pour commencer.')}</p>
                <div class="post-signup-media-grid">
                    <div class="post-signup-media-block">
                        <h3>${t('auth.media_setup_avatar', 'Photo de profil')}</h3>
                        <div id="post-signup-avatar-slot">
                            <div class="post-signup-avatar-placeholder" aria-hidden="true"><i class="fas fa-user"></i></div>
                        </div>
                        <button type="button" class="post-signup-pick-btn" id="post-signup-pick-avatar">
                            <i class="fas fa-camera"></i> ${t('auth.media_setup_pick_avatar', 'Choisir une photo')}
                        </button>
                        <input type="file" id="post-signup-avatar-input" accept="image/jpeg,image/png,image/webp,image/*" hidden>
                    </div>
                    <div class="post-signup-media-block">
                        <h3>${t('auth.media_setup_banner', 'Bannière')}</h3>
                        <div id="post-signup-banner-slot">
                            <div class="post-signup-banner-placeholder" aria-hidden="true"><i class="fas fa-image"></i></div>
                        </div>
                        <button type="button" class="post-signup-pick-btn" id="post-signup-pick-banner">
                            <i class="fas fa-panorama"></i> ${t('auth.media_setup_pick_banner', 'Choisir une bannière')}
                        </button>
                        <input type="file" id="post-signup-banner-input" accept="image/jpeg,image/png,image/webp,image/*" hidden>
                    </div>
                </div>
                <p class="post-signup-status" id="post-signup-status" aria-live="polite"></p>
                <div class="post-signup-actions">
                    <button type="button" class="post-signup-finish-btn" id="post-signup-finish">
                        ${t('auth.media_setup_finish', 'Terminer')}
                    </button>
                    <button type="button" class="post-signup-skip-btn" id="post-signup-skip">
                        ${t('auth.media_setup_skip', 'Passer pour l\'instant')}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        const avatarSlot = overlay.querySelector('#post-signup-avatar-slot');
        const bannerSlot = overlay.querySelector('#post-signup-banner-slot');
        const avatarInput = overlay.querySelector('#post-signup-avatar-input');
        const bannerInput = overlay.querySelector('#post-signup-banner-input');
        const finishBtn = overlay.querySelector('#post-signup-finish');
        const skipBtn = overlay.querySelector('#post-signup-skip');
        const statusEl = overlay.querySelector('#post-signup-status');

        function revokePreviews() {
            if (avatarPreviewUrl) {
                try { URL.revokeObjectURL(avatarPreviewUrl); } catch (e) { /* ignore */ }
                avatarPreviewUrl = null;
            }
            if (bannerPreviewUrl) {
                try { URL.revokeObjectURL(bannerPreviewUrl); } catch (e) { /* ignore */ }
                bannerPreviewUrl = null;
            }
        }

        function finishFlow() {
            revokePreviews();
            closeOverlay();
            afterMediaFlowComplete().finally(resolve);
        }

        overlay.querySelector('#post-signup-pick-avatar').addEventListener('click', function() {
            avatarInput.click();
        });
        overlay.querySelector('#post-signup-pick-banner').addEventListener('click', function() {
            bannerInput.click();
        });

        avatarInput.addEventListener('change', function() {
            const file = avatarInput.files && avatarInput.files[0];
            if (!file || !String(file.type || '').startsWith('image/')) return;
            avatarFile = file;
            if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
            avatarPreviewUrl = URL.createObjectURL(file);
            avatarSlot.innerHTML = '<img class="post-signup-avatar-preview" src="' + avatarPreviewUrl + '" alt="">';
        });

        bannerInput.addEventListener('change', function() {
            const file = bannerInput.files && bannerInput.files[0];
            if (!file || !String(file.type || '').startsWith('image/')) return;
            bannerFile = file;
            if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
            bannerPreviewUrl = URL.createObjectURL(file);
            bannerSlot.innerHTML = '<img class="post-signup-banner-preview" src="' + bannerPreviewUrl + '" alt="">';
        });

        skipBtn.addEventListener('click', finishFlow);

        finishBtn.addEventListener('click', async function() {
            if (!avatarFile && !bannerFile) {
                finishFlow();
                return;
            }
            finishBtn.disabled = true;
            skipBtn.disabled = true;
            statusEl.textContent = t('auth.media_setup_uploading', 'Enregistrement en cours…');
            try {
                await uploadSelections(avatarFile, bannerFile);
                statusEl.textContent = t('auth.media_setup_done', 'Profil mis à jour !');
                setTimeout(finishFlow, 350);
            } catch (err) {
                console.error('[PostSignupMedia]', err);
                statusEl.textContent = t('auth.media_setup_error', 'Erreur lors de l\'enregistrement. Réessayez ou passez cette étape.');
                finishBtn.disabled = false;
                skipBtn.disabled = false;
            }
        });
    });
}

export async function launchPostSignupMediaFlow(username) {
    if (typeof window.closeAuthPopup === 'function') {
        window.closeAuthPopup();
    }
    if (typeof window.closeGoogleSignUpCompletion === 'function') {
        const googleOverlay = document.getElementById('google-signup-completion-overlay');
        if (googleOverlay) {
            window.closeGoogleSignUpCompletion();
        }
    }
    await showPostSignupMediaPopup({ username: username || '' });
}

if (typeof window !== 'undefined') {
    window.showPostSignupMediaPopup = showPostSignupMediaPopup;
    window.launchPostSignupMediaFlow = launchPostSignupMediaFlow;
}
