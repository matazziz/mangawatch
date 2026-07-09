/**
 * Guide d'onboarding post-inscription : Top 10 + Collection.
 */
const OVERLAY_ID = 'mw-onboarding-overlay';
const STYLE_ID = 'mw-onboarding-styles';

function t(key, fallback) {
    if (typeof window.t === 'function') {
        const v = window.t(key);
        if (v && v !== key) return v;
    }
    return fallback;
}

function getUser() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user && user.email) return user;
    } catch (e) { /* ignore */ }
    return null;
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
}

function doneKey(email) {
    return 'mw_onboarding_done_' + normalizeEmail(email);
}

function pendingKey(email) {
    return 'mw_onboarding_pending_' + normalizeEmail(email);
}

export function isOnboardingDone(email) {
    const e = normalizeEmail(email);
    if (!e) return true;
    return localStorage.getItem(doneKey(e)) === '1';
}

export function markOnboardingPending(email) {
    const e = normalizeEmail(email);
    if (!e) return;
    localStorage.setItem(pendingKey(e), String(Date.now()));
}

function clearOnboardingPending(email) {
    const e = normalizeEmail(email);
    if (!e) return;
    try { localStorage.removeItem(pendingKey(e)); } catch (err) { /* ignore */ }
}

export function markOnboardingDone(email) {
    const e = normalizeEmail(email);
    if (!e) return;
    localStorage.setItem(doneKey(e), '1');
    clearOnboardingPending(e);
}

function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        #${OVERLAY_ID} {
            position: fixed;
            inset: 0;
            z-index: 10650;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            background: radial-gradient(ellipse at center, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.94) 100%);
            animation: mwOnboardingFade 0.3s ease;
        }
        @keyframes mwOnboardingFade {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .mw-onboarding-card {
            width: min(440px, calc(100vw - 1.5rem));
            max-height: min(90dvh, 620px);
            background: linear-gradient(165deg, #1e2238 0%, #14182a 100%);
            border: 1px solid rgba(0, 196, 93, 0.28);
            border-radius: 20px;
            padding: 1rem 1rem 0.85rem;
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
            color: #f5f6fa;
            text-align: center;
            animation: mwOnboardingPop 0.35s cubic-bezier(0.34, 1.4, 0.64, 1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-sizing: border-box;
        }
        .mw-onboarding-scroll {
            flex: 1 1 auto;
            min-height: 0;
            overflow-x: hidden;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            padding: 0 0.1rem;
            margin-bottom: 0.65rem;
        }
        @keyframes mwOnboardingPop {
            from { opacity: 0; transform: scale(0.94) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .mw-onboarding-steps {
            display: flex;
            justify-content: center;
            gap: 0.45rem;
            margin-bottom: 1rem;
        }
        .mw-onboarding-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(255,255,255,0.18);
            transition: background 0.2s, transform 0.2s;
        }
        .mw-onboarding-dot.active {
            background: #00e06d;
            transform: scale(1.15);
        }
        .mw-onboarding-dot.done {
            background: rgba(0, 224, 109, 0.45);
        }
        .mw-onboarding-icon {
            width: 54px;
            height: 54px;
            margin: 0 auto 0.7rem;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.45rem;
            background: linear-gradient(145deg, rgba(0, 196, 93, 0.22), rgba(0, 196, 93, 0.06));
            border: 1px solid rgba(0, 224, 109, 0.4);
            color: #2ee4b8;
            box-shadow: 0 8px 24px rgba(0, 196, 93, 0.15);
        }
        .mw-onboarding-icon--collection {
            background: linear-gradient(145deg, rgba(99, 102, 241, 0.22), rgba(99, 102, 241, 0.06));
            border-color: rgba(129, 140, 248, 0.45);
            color: #a5b4fc;
            box-shadow: 0 8px 24px rgba(99, 102, 241, 0.15);
        }
        .mw-onboarding-icon--welcome {
            background: linear-gradient(145deg, rgba(251, 191, 36, 0.22), rgba(251, 191, 36, 0.06));
            border-color: rgba(252, 211, 77, 0.45);
            color: #fcd34d;
            box-shadow: 0 8px 24px rgba(251, 191, 36, 0.12);
        }
        .mw-onboarding-card h2 {
            margin: 0 0 0.55rem;
            font-size: clamp(1.1rem, 4vw, 1.35rem);
            color: #fff;
            line-height: 1.3;
        }
        .mw-onboarding-card p {
            margin: 0 0 0.75rem;
            color: #b8bcc8;
            font-size: 0.86rem;
            line-height: 1.5;
            text-align: left;
        }
        .mw-onboarding-tip {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            margin: 0 0 0.45rem;
            padding: 0.5rem 0.6rem;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 10px;
            text-align: left;
            font-size: 0.8rem;
            color: #c5cad4;
            line-height: 1.4;
        }
        .mw-onboarding-tip-num {
            flex-shrink: 0;
            width: 1.35rem;
            height: 1.35rem;
            border-radius: 50%;
            background: rgba(0, 196, 93, 0.18);
            color: #00e06d;
            font-size: 0.72rem;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-top: 0.05rem;
        }
        .mw-onboarding-tip i {
            color: #00e06d;
            margin-top: 0.12rem;
            flex-shrink: 0;
            font-size: 0.75rem;
        }
        .mw-onboarding-actions {
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            gap: 0.45rem;
            margin-top: 0;
            padding-top: 0.65rem;
            border-top: 1px solid rgba(255,255,255,0.07);
        }
        .mw-onboarding-primary {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            border: none;
            border-radius: 12px;
            padding: 0.72rem 0.85rem;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
            background: linear-gradient(135deg, #00c45d, #00e06d);
            color: #fff;
        }
        .mw-onboarding-link {
            display: block;
            font-size: 0.78rem;
            color: #8a8f9c;
            text-decoration: none;
            line-height: 1.35;
            padding: 0.15rem 0;
        }
        .mw-onboarding-link:hover { color: #00e06d; }
        .mw-onboarding-link i { margin-right: 0.25rem; }
        @media (max-height: 700px) {
            .mw-onboarding-card {
                max-height: 92dvh;
                padding: 0.85rem 0.85rem 0.75rem;
            }
            .mw-onboarding-icon {
                width: 46px;
                height: 46px;
                font-size: 1.15rem;
                margin-bottom: 0.5rem;
            }
            .mw-onboarding-card h2 { font-size: 1rem; margin-bottom: 0.4rem; }
            .mw-onboarding-card p { font-size: 0.82rem; margin-bottom: 0.55rem; }
            .mw-onboarding-tip { font-size: 0.76rem; padding: 0.45rem 0.5rem; }
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

function buildSteps(username) {
    const name = escapeHtml(username || t('onboarding.default_name', 'nouveau membre'));
    return [
        {
            iconClass: 'mw-onboarding-icon--welcome',
            icon: 'fa-hand-sparkles',
            title: t('onboarding.welcome_title', 'Bienvenue sur MangaWatch !'),
            body: t('onboarding.welcome_body', 'Bonjour {name} ! Votre compte est prêt. Suivez ce court guide pour configurer votre profil comme un pro.').replace('{name}', name),
            tips: [
                { num: '1', text: t('onboarding.welcome_tip1', 'Nous allons voir comment noter, créer votre Top 10 et remplir votre collection.') }
            ],
            numbered: true,
            nextLabel: t('onboarding.next', 'Suivant')
        },
        {
            iconClass: '',
            icon: 'fa-star',
            title: t('onboarding.rate_title', 'Étape 1 — Donner une note'),
            body: t('onboarding.rate_body', 'Avant le Top 10, il faut noter des œuvres. Rendez-vous dans la section Manga et Anime, ouvrez une fiche détail et attribuez une note avec les étoiles.'),
            tips: [
                { num: '1', text: t('onboarding.rate_tip1', 'Cliquez sur « Manga et Anime » dans le menu du site') },
                { num: '2', text: t('onboarding.rate_tip2', 'Choisissez un anime ou un manga pour ouvrir sa page détail') },
                { num: '3', text: t('onboarding.rate_tip3', 'Sur la fiche, cliquez sur les étoiles pour noter l\'œuvre') }
            ],
            numbered: true,
            link: { href: 'manga-database.html', label: t('onboarding.rate_link', 'Explorer Manga et Anime') },
            nextLabel: t('onboarding.next', 'Suivant')
        },
        {
            iconClass: '',
            icon: 'fa-trophy',
            title: t('onboarding.top10_title', 'Étape 2 — Créer votre Top 10'),
            body: t('onboarding.top10_body', 'Une fois des œuvres notées, allez sur votre profil : l\'onglet « Manga et Anime » affiche vos notes. Vous pourrez alors les placer dans votre Top 10.'),
            tips: [
                { num: '1', text: t('onboarding.top10_tip1', 'Ouvrez « Profil » puis l\'onglet « Manga et Anime »') },
                { num: '2', text: t('onboarding.top10_tip2', 'Sur une carte déjà notée : menu « … » → « Ajouter au top 10 »') },
                { num: '3', text: t('onboarding.top10_tip3', 'Choisissez la place (1 à 10) dans votre classement') }
            ],
            numbered: true,
            link: { href: 'profil.html', label: t('onboarding.top10_link', 'Aller sur mon profil') },
            nextLabel: t('onboarding.next', 'Suivant')
        },
        {
            iconClass: 'mw-onboarding-icon--collection',
            icon: 'fa-layer-group',
            title: t('onboarding.collection_title', 'Étape 3 — Votre collection'),
            body: t('onboarding.collection_body', 'Ajoutez des œuvres à votre collection depuis une page détail pour suivre votre progression : en cours, terminé, en pause, à voir…'),
            tips: [
                { num: '1', text: t('onboarding.collection_tip1', 'Sur une fiche anime/manga : bouton « Ajouter à ma collection »') },
                { num: '2', text: t('onboarding.collection_tip2', 'Choisissez un statut (En cours, Terminé, etc.)') },
                { num: '3', text: t('onboarding.collection_tip3', 'Retrouvez tout dans « Ma collection »') }
            ],
            numbered: true,
            link: { href: 'list.html', label: t('onboarding.collection_link', 'Voir ma collection') },
            nextLabel: t('onboarding.finish', 'C\'est parti !')
        }
    ];
}

function renderStepContent(step, index, total) {
    const tipsHtml = (step.tips || []).map((tip) => {
        const text = typeof tip === 'string' ? tip : tip.text;
        if (step.numbered && tip.num) {
            return `<div class="mw-onboarding-tip"><span class="mw-onboarding-tip-num">${tip.num}</span><span>${text}</span></div>`;
        }
        return `<div class="mw-onboarding-tip"><i class="fas fa-check-circle"></i><span>${text}</span></div>`;
    }).join('');

    const dotsHtml = Array.from({ length: total }, (_, i) => {
        let cls = 'mw-onboarding-dot';
        if (i === index) cls += ' active';
        else if (i < index) cls += ' done';
        return `<span class="${cls}" aria-hidden="true"></span>`;
    }).join('');

    const linkHtml = step.link
        ? `<a class="mw-onboarding-link" href="${step.link.href}"><i class="fas fa-arrow-right"></i>${step.link.label}</a>`
        : '';

    return `
        <div class="mw-onboarding-scroll">
            <div class="mw-onboarding-steps" aria-hidden="true">${dotsHtml}</div>
            <div class="mw-onboarding-icon ${step.iconClass || ''}"><i class="fas ${step.icon}"></i></div>
            <h2>${step.title}</h2>
            <p>${step.body}</p>
            ${tipsHtml}
        </div>
        <div class="mw-onboarding-actions">
            <button type="button" class="mw-onboarding-primary" id="mw-onboarding-next">${step.nextLabel}</button>
            ${linkHtml}
        </div>
    `;
}

/**
 * @param {{ username?: string }} options
 * @returns {Promise<void>}
 */
export function showOnboardingGuide(options) {
    options = options || {};
    const username = options.username || (getUser() && (getUser().username || getUser().name)) || '';

    return new Promise(function(resolve) {
        if (document.getElementById(OVERLAY_ID)) {
            resolve();
            return;
        }

        const user = getUser();
        if (!user || !user.email) {
            resolve();
            return;
        }

        injectStyles();
        const steps = buildSteps(username);
        let stepIndex = 0;

        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.setAttribute('role', 'presentation');

        const card = document.createElement('div');
        card.className = 'mw-onboarding-card';
        card.setAttribute('role', 'dialog');
        card.setAttribute('aria-modal', 'true');
        card.setAttribute('aria-labelledby', 'mw-onboarding-title');

        function finish(markDone) {
            if (markDone !== false && user.email && !options.testMode) {
                markOnboardingDone(user.email);
            }
            closeOverlay();
            resolve();
        }

        function bindStep() {
            const step = steps[stepIndex];
            card.innerHTML = renderStepContent(step, stepIndex, steps.length);
            const titleEl = card.querySelector('h2');
            if (titleEl) titleEl.id = 'mw-onboarding-title';

            card.querySelector('#mw-onboarding-next')?.addEventListener('click', function() {
                if (stepIndex >= steps.length - 1) {
                    finish(true);
                    return;
                }
                stepIndex += 1;
                bindStep();
            });

            const link = card.querySelector('.mw-onboarding-link');
            if (link) {
                link.addEventListener('click', function() {
                    if (!options.testMode) markOnboardingDone(user.email);
                });
            }
        }

        bindStep();
        overlay.appendChild(card);
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) e.stopPropagation();
        });
        document.body.appendChild(overlay);
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    });
}

export async function launchOnboardingGuide(options) {
    const user = getUser();
    if (!user || !user.email) return;
    if (isOnboardingDone(user.email)) {
        clearOnboardingPending(user.email);
        return;
    }
    await showOnboardingGuide(options);
}

export function resetOnboardingForTest(email) {
    const e = normalizeEmail(email || (getUser() && getUser().email));
    if (!e) return;
    try { localStorage.removeItem(doneKey(e)); } catch (err) { /* ignore */ }
    markOnboardingPending(e);
}

export function isOnboardingTestRequested() {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('onboarding') === '1' || params.get('test-onboarding') === '1';
    } catch (e) {
        return false;
    }
}

export async function forceShowOnboardingGuide(options) {
    const user = getUser();
    if (!user || !user.email) {
        console.warn('[Onboarding] Connectez-vous pour tester le tutoriel.');
        return;
    }
    const opts = Object.assign({
        testMode: true,
        username: user.username || user.name || user.email.split('@')[0]
    }, options || {});
    await showOnboardingGuide(opts);
}

export function runOnboardingTestIfRequested() {
    if (!isOnboardingTestRequested()) return false;
    const user = getUser();
    if (!user || !user.email) {
        console.warn('[Onboarding] Connectez-vous, puis rechargez avec ?onboarding=1');
        return true;
    }
    resetOnboardingForTest(user.email);
    const username = user.username || user.name || user.email.split('@')[0];
    setTimeout(function() {
        forceShowOnboardingGuide({ username: username });
    }, 500);
    return true;
}

export function tryResumeOnboarding() {
    const user = getUser();
    if (!user || !user.email) return;
    if (isOnboardingDone(user.email)) {
        clearOnboardingPending(user.email);
        return;
    }
    const pending = localStorage.getItem(pendingKey(user.email));
    if (!pending) return;
    if (document.getElementById(OVERLAY_ID) || document.getElementById('post-signup-media-overlay')) return;

    const username = user.username || user.name || user.email.split('@')[0];
    setTimeout(function() {
        launchOnboardingGuide({ username: username });
    }, 600);
}

if (typeof window !== 'undefined') {
    window.showOnboardingGuide = showOnboardingGuide;
    window.launchOnboardingGuide = launchOnboardingGuide;
    window.tryResumeOnboarding = tryResumeOnboarding;
    window.markOnboardingPending = markOnboardingPending;
    window.resetOnboardingForTest = resetOnboardingForTest;
    window.forceShowOnboardingGuide = forceShowOnboardingGuide;
    window.runOnboardingTestIfRequested = runOnboardingTestIfRequested;
    window.mwTestOnboarding = async function() {
        resetOnboardingForTest();
        await forceShowOnboardingGuide();
    };
}
