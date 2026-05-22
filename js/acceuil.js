// acceuil.js - Version simplifiée pour le popup d'authentification
// Script dédié à la page d'accueil (acceuil.html)

import { syncCurrentUserProfileToFirestore, syncProfileToFirestore } from './auth.js';

// === FONCTIONS POUR MODALS D'ERREUR ET DE SUCCÈS ===

// Afficher un modal d'erreur stylisé
function showAuthErrorModal(message) {
    // Supprimer les modals existants
    const existingOverlay = document.getElementById('auth-error-modal-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'auth-error-modal-overlay';
    overlay.className = 'auth-modal-overlay';
    overlay.innerHTML = `
        <div class="auth-modal auth-error-modal">
            <div class="auth-modal-header">
                <div class="auth-modal-icon error-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <h3 class="auth-modal-title">Erreur</h3>
            </div>
            <div class="auth-modal-body">
                <p class="auth-modal-message">${message}</p>
            </div>
            <div class="auth-modal-actions">
                <button class="auth-modal-btn auth-modal-btn-primary" onclick="closeAuthErrorModal()">
                    <i class="fas fa-check"></i> Compris
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Animation d'apparition
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
    
    // Fermer en cliquant sur l'overlay
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeAuthErrorModal();
        }
    });
    
    // Fermer avec Escape
    const escapeHandler = function(e) {
        if (e.key === 'Escape') {
            closeAuthErrorModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Fermer le modal d'erreur
function closeAuthErrorModal() {
    const overlay = document.getElementById('auth-error-modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

// Afficher un modal de succès stylisé
function showAuthSuccessModal(message, username = '') {
    // Supprimer les modals existants
    const existingOverlay = document.getElementById('auth-success-modal-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'auth-success-modal-overlay';
    overlay.className = 'auth-modal-overlay';
    overlay.innerHTML = `
        <div class="auth-modal auth-success-modal">
            <div class="auth-modal-header">
                <div class="auth-modal-icon success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 class="auth-modal-title">Succès !</h3>
            </div>
            <div class="auth-modal-body">
                <p class="auth-modal-message">${message}</p>
            </div>
            <div class="auth-modal-actions">
                <button class="auth-modal-btn auth-modal-btn-primary" onclick="closeAuthSuccessModal()">
                    <i class="fas fa-check"></i> Parfait
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Animation d'apparition
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
    
    // Fermer en cliquant sur l'overlay
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeAuthSuccessModal();
        }
    });
    
    // Fermer avec Escape
    const escapeHandler = function(e) {
        if (e.key === 'Escape') {
            closeAuthSuccessModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Fermer le modal de succès
function closeAuthSuccessModal() {
    const overlay = document.getElementById('auth-success-modal-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
}

// Exposer les fonctions globalement
window.showAuthErrorModal = showAuthErrorModal;
window.showAuthSuccessModal = showAuthSuccessModal;
window.closeAuthErrorModal = closeAuthErrorModal;
window.closeAuthSuccessModal = closeAuthSuccessModal;

// Fonction de test globale pour la traduction (accessible depuis la console)
window.testTranslation = function() {
    console.log('=== TEST DE TRADUCTION GLOBAL ===');
    console.log('Localization disponible:', !!window.localization);
    
    if (window.localization) {
        console.log('Langue actuelle:', window.localization.getCurrentLanguage());
        console.log('Traduction test auth.thank_you_title:', window.localization.get('auth.thank_you_title'));
        console.log('Traduction test auth.thank_you_description:', window.localization.get('auth.thank_you_description'));
        console.log('Traduction test auth.suggestions_personalized:', window.localization.get('auth.suggestions_personalized'));
        console.log('Traduction test auth.tier_lists:', window.localization.get('auth.tier_lists'));
        console.log('Traction test auth.community:', window.localization.get('auth.community'));
    } else {
        console.error('❌ window.localization n\'est pas disponible !');
    }
    
    // Vérifier si le popup est ouvert
    const popup = document.querySelector('.auth-popup');
    if (popup) {
        console.log('✅ Popup trouvé, tentative de traduction...');
        if (window.applyTranslationsToPopup) {
            window.applyTranslationsToPopup();
        } else {
            console.error('❌ window.applyTranslationsToPopup n\'est pas disponible !');
        }
    } else {
        console.log('ℹ️ Aucun popup ouvert, ouvrez d\'abord le popup avec showAuthPopup()');
    }
};

// Attacher une barre de recherche au-dessus d'un select pays (filtre les options) — style classe
function attachCountrySearch(selectId, parentNode) {
    var sel = document.getElementById(selectId);
    if (!sel || !parentNode) return;
    var searchId = selectId + '-search';
    if (document.getElementById(searchId)) return;
    sel.classList.add('country-select');
    var wrapper = document.createElement('div');
    wrapper.className = 'country-picker-wrapper';
    var searchWrap = document.createElement('div');
    searchWrap.className = 'country-search-wrap';
    var search = document.createElement('input');
    search.type = 'text';
    search.id = searchId;
    search.className = 'country-search-input';
    search.placeholder = 'Rechercher un pays...';
    search.setAttribute('autocomplete', 'off');
    searchWrap.appendChild(search);
    parentNode.insertBefore(wrapper, sel);
    wrapper.appendChild(searchWrap);
    wrapper.appendChild(sel);
    search.addEventListener('input', function() {
        var q = (this.value || '').toLowerCase().trim();
        var opts = sel.querySelectorAll('option');
        opts.forEach(function(opt) {
            if (opt.value === '') { opt.style.display = ''; return; }
            opt.style.display = (opt.textContent || '').toLowerCase().indexOf(q) >= 0 ? '' : 'none';
        });
    });
}
window.attachCountrySearch = attachCountrySearch;

function getHomeSkeletonHtml(message) {
    const text = message || (typeof window.t === 'function' ? window.t('common.loading') : 'Chargement...');
    return `<div class="home-section-skeleton" aria-busy="true"><div class="home-section-skeleton-bar"></div><p class="home-section-skeleton-text">${text}</p></div>`;
}

function ensureHomeSkeletonStyles() {
    if (document.getElementById('home-section-skeleton-style')) return;
    const style = document.createElement('style');
    style.id = 'home-section-skeleton-style';
    style.textContent = `
        .home-section-skeleton { padding: 2rem 1rem; text-align: center; color: #a0a0a0; }
        .home-section-skeleton-bar {
            height: 14px; border-radius: 8px; margin: 0 auto 1rem; max-width: 320px;
            background: linear-gradient(90deg, #2a2d36 25%, #3d4452 50%, #2a2d36 75%);
            background-size: 200% 100%;
            animation: homeSkeletonPulse 1.2s ease-in-out infinite;
        }
        .home-section-skeleton-text { margin: 0; font-size: 0.95rem; opacity: 0.9; }
        @keyframes homeSkeletonPulse {
            0% { background-position: 100% 0; }
            100% { background-position: -100% 0; }
        }
    `;
    document.head.appendChild(style);
}

function showHomeSectionPlaceholders() {
    ensureHomeSkeletonStyles();
    const loadingText = (typeof window.t === 'function' ? window.t('common.loading') : null) || 'Chargement...';
    const skeleton = getHomeSkeletonHtml(loadingText);
    ['authorOfWeekContainer', 'quizContainer', 'newUsersContainer'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el && el.children.length === 0) {
            el.innerHTML = skeleton;
        }
    });
}

let homeSectionsLoadStarted = false;

async function loadAllDynamicSections() {
    console.log('📚 Chargement de toutes les sections dynamiques...');
    try {
        if (typeof window.loadAuthorOfWeek === 'function') {
            await window.loadAuthorOfWeek();
        } else {
            console.error('❌ loadAuthorOfWeek n\'est pas disponible');
        }
        if (typeof window.loadDailyQuiz === 'function') {
            await window.loadDailyQuiz();
        } else {
            console.error('❌ loadDailyQuiz n\'est pas disponible');
        }
        if (typeof window.loadNewUsers === 'function') {
            await window.loadNewUsers();
        } else {
            console.error('❌ loadNewUsers n\'est pas disponible');
        }
        console.log('✅ Toutes les sections dynamiques ont été chargées');
    } catch (error) {
        console.error('❌ Erreur lors du chargement des sections dynamiques:', error);
    }
}

async function initHomeDynamicSections() {
    if (homeSectionsLoadStarted) return;
    homeSectionsLoadStarted = true;
    void syncCurrentUserProfileToFirestore();
    showHomeSectionPlaceholders();
    await loadAllDynamicSections();
}

window.loadAllDynamicSections = loadAllDynamicSections;
window.initHomeDynamicSections = initHomeDynamicSections;
window.showHomeSectionPlaceholders = showHomeSectionPlaceholders;

function setupAuthPopupOnInteraction() {
    if (window.__authIntentListenersAttached) return;
    window.__authIntentListenersAttached = true;

    let authOpened = false;

    function teardownAuthIntentListeners() {
        document.removeEventListener('click', onAuthIntent, true);
        document.removeEventListener('submit', onAuthIntent, true);
        document.removeEventListener('keydown', onAuthIntentKey, true);
        window.__authIntentListenersAttached = false;
    }

    function openAuthFromIntent() {
        if (authOpened || document.getElementById('auth-popup-overlay')) return;
        authOpened = true;
        teardownAuthIntentListeners();
        if (typeof showAuthPopup === 'function') {
            showAuthPopup();
        }
    }

    function isAuthIntentExempt(el) {
        if (!el || !el.closest) return true;
        if (el.closest('#auth-popup-overlay, .auth-modal-overlay')) return true;
        if (el.closest('#language-selector, .language-selector, .lang-switcher')) return true;
        return false;
    }

    function isAuthInteractionTarget(el) {
        if (!el || !el.closest) return false;
        return !!el.closest([
            'a[href]',
            'button',
            'input',
            'select',
            'textarea',
            '.cta-button',
            '.feature-card',
            '.quiz-choice',
            '.quiz-submit',
            '.vote-option',
            '.vote-btn',
            '.work-title',
            '.work-card',
            '.hamburger-btn',
            '.new-user-card',
            '#searchForm',
            '.nav-links a',
            '.mobile-menu a',
            '.avatar-link',
            '.search-type-selector'
        ].join(', '));
    }

    function onAuthIntent(e) {
        if (authOpened || document.getElementById('auth-popup-overlay')) return;
        if (isAuthIntentExempt(e.target)) return;
        if (!isAuthInteractionTarget(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        openAuthFromIntent();
    }

    function onAuthIntentKey(e) {
        if (e.key !== 'Enter') return;
        const active = document.activeElement;
        if (!active || !active.closest('#searchForm, #searchInput')) return;
        onAuthIntent(e);
    }

    document.addEventListener('click', onAuthIntent, true);
    document.addEventListener('submit', onAuthIntent, true);
    document.addEventListener('keydown', onAuthIntentKey, true);
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('✅ DOMContentLoaded - Bienvenue sur la page d\'accueil !');

    // Charger l'avatar depuis Firestore et réappliquer (persistance après changement de page)
    function applyAvatarFromUser() {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        const url = u?.customAvatar || u?.avatar || u?.originalAvatar || u?.picture || (u?.email ? localStorage.getItem('avatar_' + u.email) : null);
        if (url) {
            const img = document.getElementById('user-avatar');
            if (img) img.src = url;
        }
    }
    applyAvatarFromUser();
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user && user.email) {
            const { avatarService } = await import('./firebase-service.js?v=6febe22');
            const avatarUrl = await avatarService.getAvatar(user.email);
            if (avatarUrl) {
                user.customAvatar = avatarUrl;
                user.avatar = avatarUrl;
                localStorage.setItem('user', JSON.stringify(user));
                localStorage.setItem('avatar_' + user.email, avatarUrl);
                applyAvatarFromUser();
                // Réappliquer après un délai au cas où un autre script aurait écrasé
                setTimeout(applyAvatarFromUser, 800);
            }
        }
    } catch (e) { /* ignore */ }

    // --- LOGIQUE D'AFFICHAGE DU POPUP D'AUTHENTIFICATION ---
    // Afficher le popup seulement si l'utilisateur n'est pas connecté
    // Si l'utilisateur a coché "rester connecté", il reste connecté donc pas de popup
    let afficherPopup = false;
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    
    console.log('🔍 État de connexion:', { 
        user: user ? 'connecté (' + user.email + ')' : 'non connecté', 
        isLoggedIn, 
        rememberMe,
        userObject: user
    });
    
    // Afficher le popup seulement si l'utilisateur n'est PAS connecté
    if (!user || !user.email || !isLoggedIn) {
        afficherPopup = true;
        console.log('✅ Affichage du popup : utilisateur non connecté');
    } else {
        afficherPopup = false;
        console.log('✅ Utilisateur connecté, popup non affiché');
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev') === '1' || localStorage.getItem('mangawatch_dev') === '1') {
        afficherPopup = false;
        console.log('⚠️ Mode dev activé, popup désactivé');
    }

    // Placeholders + chargement des sections (sans attendre le popup auth)
    showHomeSectionPlaceholders();

    // --- POP-UP CONNEXION/INSCRIPTION AU PREMIER ACCÈS ---
    let isPopupOpening = false; // Flag pour éviter les appels multiples
    
    function showAuthPopup() {
        console.log('🚀 Fonction showAuthPopup appelée !');
        
        // Vérifier si le popup existe déjà
        const existingPopup = document.getElementById('auth-popup-overlay');
        if (existingPopup) {
            console.log('✅ Popup déjà ouvert, pas besoin de le recréer');
            return; // Ne pas recréer si déjà ouvert
        }
        
        // Empêcher les appels multiples simultanés
        if (isPopupOpening) {
            console.log('⚠️ Popup déjà en cours d\'ouverture, attente...');
            return;
        }
        
        isPopupOpening = true;
        console.log('🔓 Ouverture du popup...');
        
        // Fond semi-transparent avec effet de particules
        const overlay = document.createElement('div');
        overlay.id = 'auth-popup-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.95) 100%)';
        overlay.style.zIndex = '10500';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '0.2rem 2rem';
        overlay.style.animation = 'fadeInOverlay 0.5s';
        overlay.style.overflow = 'hidden';
        
        // Ajouter des particules flottantes
        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 2}px;
                height: ${Math.random() * 4 + 2}px;
                background: rgba(0, 196, 93, ${Math.random() * 0.3 + 0.1});
                border-radius: 50%;
                top: ${Math.random() * 100}%;
                left: ${Math.random() * 100}%;
                animation: floatParticle ${Math.random() * 10 + 10}s infinite linear;
                pointer-events: none;
            `;
            overlay.appendChild(particle);
        }

        // Animation CSS globale (injection) améliorée
        if (!document.getElementById('auth-popup-animations')) {
            const style = document.createElement('style');
            style.id = 'auth-popup-animations';
            style.textContent = `
            @keyframes fadeInOverlay {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes zoomInPop {
                from { opacity: 0; transform: scale(0.85); }
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes floatParticle {
                0% { transform: translateY(0px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
            }
            .auth-anim-input:focus {
                box-shadow: 0 0 0 3px #00c45d88;
                border-color: #00c45d;
                background-color: rgba(255,255,255,0.08);
                transition: box-shadow 0.2s, border-color 0.2s, background-color 0.2s;
            }
            .auth-anim-btn {
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }
            .auth-anim-btn:hover {
                box-shadow: 0 8px 25px rgba(0, 196, 93, 0.4);
                transform: translateY(-3px) scale(1.02);
            }
            .auth-anim-btn:active {
                transform: translateY(-1px) scale(0.98);
            }
            .auth-anim-label {
                transition: text-shadow 0.18s, color 0.18s;
            }
            .auth-anim-label:hover {
                text-shadow: 0 0 8px #00ffb0, 0 0 2px #00c45d;
                color: #00ffb0;
                animation: pulseLabel 0.7s;
            }
            @keyframes pulseLabel {
                0% { color: #00c45d; }
                50% { color: #00ffb0; }
                100% { color: #00c45d; }
            }
            .auth-anim-img {
                animation: fadeInContinentImg 0.4s;
            }
            @keyframes fadeInContinentImg {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }
            
            /* Boutons Google Sign-In toujours visibles dans le popup */
            #google-signin,
            #google-signin-inscription {
                position: relative;
                z-index: 2;
                min-height: 44px;
            }
            .google-signin-button {
                position: relative;
                z-index: 2;
            }
            
            /* Styles personnalisés pour le scrollbar du formulaire d'inscription */
            #form-inscription::-webkit-scrollbar {
                width: 8px;
            }
            
            #form-inscription::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
            }
            
            #form-inscription::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, #00c45d, #00e06d);
                border-radius: 4px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            #form-inscription::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(135deg, #00e06d, #00ff7f);
                box-shadow: 0 0 10px rgba(0, 196, 93, 0.5);
            }
            
            /* Styles pour Firefox */
            #form-inscription {
                scrollbar-width: thin;
                scrollbar-color: #00c45d rgba(255, 255, 255, 0.1);
            }
            
            /* Styles pour les menus déroulants */
            .auth-anim-input select {
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2300c45d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
                background-repeat: no-repeat;
                background-position: right 12px center;
                background-size: 16px;
                padding-right: 40px;
            }
            
            .auth-anim-input select:focus {
                border-color: #00c45d;
                box-shadow: 0 0 20px rgba(0, 196, 93, 0.3);
                background-color: rgba(255,255,255,0.08);
            }
            
            .auth-anim-input select option {
                background: #2a2a2a;
                color: white;
                padding: 8px 12px;
            }
            
            .auth-anim-input select option:hover {
                background: #00c45d;
                color: white;
            }
            
            /* Bloc pays : barre de recherche + menu déroulant (plus classe) */
            .country-picker-wrapper {
                width: 100%;
                margin-bottom: 0.25rem;
            }
            .country-search-input {
                width: 100% !important;
                padding: 12px 16px 12px 44px !important;
                margin-bottom: 10px !important;
                background: rgba(255,255,255,0.06) !important;
                border: 1px solid rgba(255,255,255,0.18) !important;
                border-radius: 14px !important;
                color: #f5f6fa !important;
                font-size: 15px !important;
                font-weight: 500 !important;
                box-sizing: border-box !important;
                transition: all 0.25s ease !important;
                box-shadow: inset 0 2px 6px rgba(0,0,0,0.15) !important;
                letter-spacing: 0.3px !important;
            }
            .country-search-input::placeholder {
                color: rgba(255,255,255,0.45);
            }
            .country-search-input:focus {
                outline: none !important;
                border-color: rgba(0, 224, 109, 0.6) !important;
                box-shadow: inset 0 2px 6px rgba(0,0,0,0.2), 0 0 0 3px rgba(0, 196, 93, 0.2) !important;
                background: rgba(255,255,255,0.08) !important;
            }
            .country-picker-wrapper .country-select {
                width: 100% !important;
                padding: 14px 44px 14px 18px !important;
                background: rgba(255,255,255,0.06) !important;
                border: 1px solid rgba(255,255,255,0.18) !important;
                border-radius: 14px !important;
                color: #f5f6fa !important;
                font-size: 15px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
                box-sizing: border-box !important;
                transition: all 0.25s ease !important;
                box-shadow: inset 0 2px 6px rgba(0,0,0,0.15) !important;
                appearance: none !important;
                -webkit-appearance: none !important;
                background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2300e06d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e") !important;
                background-repeat: no-repeat !important;
                background-position: right 14px center !important;
                background-size: 18px !important;
            }
            .country-picker-wrapper .country-select:focus {
                outline: none !important;
                border-color: rgba(0, 224, 109, 0.6) !important;
                box-shadow: inset 0 2px 6px rgba(0,0,0,0.2), 0 0 0 3px rgba(0, 196, 93, 0.2) !important;
                background-color: rgba(255,255,255,0.08) !important;
            }
            .country-picker-wrapper .country-select option {
                background: #1e1e1e;
                color: #f5f6fa;
                padding: 12px 16px;
            }
            .country-search-wrap {
                position: relative;
                margin-bottom: 10px;
            }
            .country-search-wrap::before {
                content: "\\f002";
                font-family: "Font Awesome 6 Free";
                font-weight: 900;
                position: absolute;
                left: 16px;
                top: 50%;
                transform: translateY(-50%);
                color: rgba(0, 224, 109, 0.7);
                font-size: 14px;
                pointer-events: none;
            }

            @media (max-width: 768px) {
                #auth-popup-overlay {
                    align-items: flex-start !important;
                    justify-content: center !important;
                    padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)) !important;
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                    -webkit-overflow-scrolling: touch !important;
                    overscroll-behavior: contain !important;
                    touch-action: pan-y !important;
                }

                #auth-main-popup {
                    width: min(396px, calc(100vw - 44px)) !important;
                    max-width: min(396px, calc(100vw - 44px)) !important;
                    max-height: min(86dvh, calc(100dvh - 36px)) !important;
                    border-radius: 16px !important;
                    padding: 0.45rem 0.55rem 0.75rem 0.55rem !important;
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                    -webkit-overflow-scrolling: touch !important;
                    overscroll-behavior: contain !important;
                    touch-action: pan-y !important;
                    box-sizing: border-box !important;
                    margin: 0 auto !important;
                }

                #auth-main-popup * {
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                }

                #auth-main-popup h2 {
                    font-size: 1.08rem !important;
                    margin-bottom: 0.4rem !important;
                    line-height: 1.25 !important;
                }

                #auth-main-popup p {
                    font-size: 0.8rem !important;
                    line-height: 1.35 !important;
                }

                #tab-connexion,
                #tab-inscription {
                    padding: 0.56rem 0.4rem !important;
                    font-size: 0.76rem !important;
                    border-radius: 10px !important;
                }

                #form-connexion,
                #form-inscription {
                    margin-top: 0.4rem !important;
                }

                #form-inscription {
                    max-height: 58dvh !important;
                    padding-right: 2px !important;
                    padding-bottom: 0.6rem !important;
                }

                #auth-main-popup label {
                    font-size: 0.75rem !important;
                    margin-bottom: 0.35rem !important;
                    letter-spacing: 0.2px !important;
                }

                #auth-main-popup input[type="email"],
                #auth-main-popup input[type="password"],
                #auth-main-popup input[type="text"],
                #auth-main-popup select {
                    padding: 7px 8px !important;
                    border-radius: 10px !important;
                    font-size: 0.78rem !important;
                }

                #auth-main-popup .country-search-input {
                    padding: 7px 8px 7px 30px !important;
                    font-size: 0.76rem !important;
                }

                #auth-main-popup .country-picker-wrapper .country-select {
                    padding: 7px 26px 7px 8px !important;
                    font-size: 0.76rem !important;
                    background-size: 12px !important;
                    background-position: right 8px center !important;
                }

                #auth-main-popup button[type="submit"] {
                    padding: 0.72rem 0.65rem !important;
                    border-radius: 10px !important;
                    font-size: 0.82rem !important;
                }

                #auth-main-popup #forgot-password-link {
                    font-size: 0.74rem !important;
                }

                #auth-main-popup #forgot-password-modal {
                    border-radius: 14px !important;
                    padding: 0.7rem !important;
                }

                #auth-main-popup .logo-float {
                    width: 54px !important;
                    height: 54px !important;
                    margin-bottom: 0.7rem !important;
                }
            }

            @media (max-width: 480px) {
                #auth-main-popup {
                    width: calc(100vw - 40px) !important;
                    max-width: calc(100vw - 40px) !important;
                    max-height: min(84dvh, calc(100dvh - 28px)) !important;
                    border-radius: 14px !important;
                    padding: 0.35rem 0.45rem 0.65rem 0.45rem !important;
                    margin: 0 auto !important;
                }

                #auth-main-popup h2 {
                    font-size: 0.98rem !important;
                }

                #auth-main-popup p {
                    font-size: 0.74rem !important;
                }

                #tab-connexion,
                #tab-inscription {
                    font-size: 0.7rem !important;
                    padding: 0.5rem 0.3rem !important;
                }

                #auth-main-popup input[type="email"],
                #auth-main-popup input[type="password"],
                #auth-main-popup input[type="text"],
                #auth-main-popup select {
                    padding: 6px 7px !important;
                    font-size: 0.72rem !important;
                }

                #auth-main-popup button[type="submit"] {
                    padding: 0.65rem 0.6rem !important;
                    font-size: 0.76rem !important;
                }

                #auth-main-popup #form-inscription {
                    max-height: 54dvh !important;
                }
            }
            `;
            document.head.appendChild(style);
        }

        // Créer le popup principal
        const popup = document.createElement('div');
        popup.style.cssText = `
            background: linear-gradient(135deg, #0a0a0a, #1a1a1a, #2a2a2a);
            border-radius: 32px;
            box-shadow: 0 25px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(0, 196, 93, 0.2);
            padding: 0.3rem 3rem 3rem 3rem;
            text-align: center;
            max-width: 800px;
            width: 90vw;
            max-height: 85vh;
            color: white;
            position: relative;
            overflow-y: auto;
            overflow-x: hidden;
            animation: zoomInPop 0.5s ease-out;
        `;
        popup.id = 'auth-main-popup';

        // Effet de bordure lumineuse animée
        const borderGlow = document.createElement('div');
        borderGlow.style.cssText = `
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #00c45d, #00e06d, #00c45d, #00ff7f, #00c45d);
            border-radius: 34px;
            z-index: -1;
            animation: borderGlow 3s linear infinite;
            opacity: 0.6;
        `;
        popup.appendChild(borderGlow);

        // Contenu du popup
        popup.innerHTML += `
                <div class="logo-float" style="width: 80px; height: 80px; background: linear-gradient(135deg, #00c45d, #00e06d); border-radius: 50%; margin: 0 auto 1.5rem auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(0, 196, 93, 0.3);">
                <i class="fas fa-user-plus" style="font-size: 2rem; color: white;"></i>
            </div>
            
            <h2 style="color: #00c45d; margin-bottom: 1rem; text-shadow: 0 0 20px rgba(0, 196, 93, 0.3); font-size: 2.2rem; font-weight: 700; letter-spacing: 1px;">🎉 Bienvenue sur MangaWatch !</h2>
            
            <p style="color: #f0f0f0; font-size: 1.1rem; line-height: 1.6; margin: 0; font-weight: 400; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${window.localization ? window.localization.get('home.hero_subtitle') : 'Votre destination ultime pour suivre et noter vos animes et mangas préférés'}</p>
            
            <div style="display: flex; gap: 0; width: 100%; margin-bottom: 2rem; background: linear-gradient(135deg, #1a1a1a, #2a2a2a); border-radius: 16px; padding: 6px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3), 0 4px 15px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05);">
                <button id="tab-connexion" class="auth-anim-btn" style="flex: 1; background: linear-gradient(135deg, #00c45d, #00e06d); color: white; border: none; padding: 1rem; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0, 196, 93, 0.3); position: relative; overflow: hidden;">
                    <span style="position: relative; z-index: 2;">Se connecter</span>
                    <div style="position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: left 0.5s ease;"></div>
                </button>
                <button id="tab-inscription" class="auth-anim-btn" style="flex: 1; background: transparent; color: #ccc; border: none; padding: 1rem; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden;">
                    <span style="position: relative; z-index: 2;">S'inscrire</span>
                    <div style="position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: left 0.5s ease;"></div>
                </button>
            </div>
            
            <!-- Formulaire de connexion -->
            <form id="form-connexion" style="display: block;">
                <div style="margin-bottom: 1.5rem;">
                    <label class="auth-anim-label" for="connexion-email" style="display: block; margin-bottom: 0.8rem; color: #00e06d; font-weight: 700; cursor: pointer; text-align: left; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">Adresse email</label>
                    <input type="email" id="connexion-email" class="auth-anim-input" required style="width: 100%; padding: 16px 20px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 16px; color: white; font-size: 16px; transition: all 0.3s ease; box-sizing: border-box; font-weight: 500; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);">
                    </div>
                <div style="margin-bottom: 1.5rem;">
                    <label class="auth-anim-label" for="connexion-password" style="display: block; margin-bottom: 0.8rem; color: #00e06d; font-weight: 700; cursor: pointer; text-align: left; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">Mot de passe</label>
                    <input type="password" id="connexion-password" class="auth-anim-input" required style="width: 100%; padding: 16px 20px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 16px; color: white; font-size: 16px; transition: all 0.3s ease; box-sizing: border-box; font-weight: 500; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);">
                    </div>
                <!-- Case à cocher "Rester connecté" et lien "Mot de passe oublié" alignés -->
                <div style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="connexion-stay-connected" style="width: 18px; height: 18px; background: linear-gradient(135deg, #1a1a1a, #2a2a2a); border: 2px solid #444; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">
                    <label for="connexion-stay-connected" style="color: #ccc; cursor: pointer; user-select: none; text-align: left;">Rester connecté</label>
                    
                    <div style="margin-left: auto;">
                        <a href="#" id="forgot-password-link" style="color: #00e06d; text-decoration: none; font-size: 1rem; font-weight: 500; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 6px;">
                            <i class="fas fa-key" style="font-size: 0.9rem;"></i>
                            Mot de passe oublié ?
                        </a>
                    </div>
                </div>
                <button type="submit" class="auth-submit-btn" style="width: 100%; background: linear-gradient(135deg, #00c45d, #00e06d); color: white; border: none; padding: 1.2rem; border-radius: 16px; font-size: 1.1rem; font-weight: 600; cursor: pointer; box-shadow: 0 6px 20px rgba(0, 196, 93, 0.4), inset 0 1px 0 rgba(255,255,255,0.2); transition: all 0.3s ease; position: relative; overflow: hidden; margin-bottom: 1rem;">
                    <span style="position: relative; z-index: 2;">Se connecter</span>
                        <div style="position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: left 0.5s ease;"></div>
                    </button>
                    
                    <!-- Séparateur -->
                    <div style="display: flex; align-items: center; margin: 1.5rem 0; color: #666;">
                        <div style="flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);"></div>
                        <span style="padding: 0 1rem; font-size: 0.9rem; color: #999;">ou</span>
                        <div style="flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);"></div>
                    </div>
                    
                    <!-- Bouton Google Sign-In -->
                    <div id="google-signin" style="width: 100%;"></div>
                </form>
            
            <!-- Formulaire d'inscription -->
            <form id="form-inscription" style="display: none; max-height: 40vh; overflow-y: auto; padding-right: 10px; padding-bottom: 3rem;">
                <div style="margin-bottom: 1.5rem;">
                    <label class="auth-anim-label" for="inscription-pseudo" style="display: block; margin-bottom: 0.8rem; color: #00e06d; font-weight: 700; cursor: pointer; text-align: left; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">Pseudo</label>
                    <input type="text" id="inscription-pseudo" class="auth-anim-input" required 
                        pattern="[a-zA-Z0-9_-]+"
                        title="Le pseudo ne peut contenir que des lettres, chiffres, tirets (-) et underscores (_). Les espaces sont interdits."
                        placeholder="Ex: mon-pseudo-123"
                        style="width: 100%; padding: 16px 20px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 16px; color: white; font-size: 16px; transition: all 0.3s ease; box-sizing: border-box; font-weight: 500; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);">
                    <small id="inscription-pseudo-error" style="display: none; color: #ff4444; margin-top: 0.5rem; text-align: left; font-size: 0.9rem;"></small>
                    <small style="display: block; color: #999; margin-top: 0.5rem; text-align: left; font-size: 0.85rem;">
                        ⚠️ Le pseudo ne peut contenir que des lettres, chiffres, tirets (-) et underscores (_). Les espaces sont interdits.
                    </small>
                            </div>
                <div style="margin-bottom: 1.5rem;">
                    <label class="auth-anim-label" for="inscription-email" style="display: block; margin-bottom: 0.8rem; color: #00e06d; font-weight: 700; cursor: pointer; text-align: left; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">Adresse email</label>
                    <input type="email" id="inscription-email" class="auth-anim-input" required style="width: 100%; padding: 16px 20px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 16px; color: white; font-size: 16px; transition: all 0.3s ease; box-sizing: border-box; font-weight: 500; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);">
                            </div>
                <div style="margin-bottom: 1.5rem;">
                    <label class="auth-anim-label" for="inscription-password" style="display: block; margin-bottom: 0.8rem; color: #00e06d; font-weight: 700; cursor: pointer; text-align: left; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">Mot de passe</label>
                    <input type="password" id="inscription-password" class="auth-anim-input" required style="width: 100%; padding: 16px 20px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 16px; color: white; font-size: 16px; transition: all 0.3s ease; box-sizing: border-box; font-weight: 500; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);">
                    </div>
                    
                
                

                
                <!-- Choix de la langue -->
                <div style="margin-bottom: 1.5rem;">
                    <label class="auth-anim-label" for="inscription-langue" style="display: block; margin-bottom: 0.8rem; color: #00e06d; font-weight: 700; cursor: pointer; text-align: left; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">Langue</label>
                    <select id="inscription-langue" class="auth-anim-input" required style="width: 100%; padding: 16px 20px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 16px; color: white; font-size: 16px; transition: all 0.3s ease; box-sizing: border-box; cursor: pointer; font-weight: 500; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);">
                        <option value="" disabled selected style="background: #2a2a2a; color: #ccc;">Choisissez votre langue</option>
                        <option value="fr" style="background: #2a2a2a; color: white;">🇫🇷 Français</option>
                        <option value="en" style="background: #2a2a2a; color: white;">🇺🇸 English</option>
                        <option value="de" style="background: #2a2a2a; color: white;">🇩🇪 Deutsch</option>
                        <option value="es" style="background: #2a2a2a; color: white;">🇪🇸 Español</option>
                        <option value="it" style="background: #2a2a2a; color: white;">🇮🇹 Italiano</option>
                        <option value="ja" style="background: #2a2a2a; color: white;">🇯🇵 日本語</option>
                    </select>
                </div>
                    
                <!-- Choix du pays -->
                <div style="margin-bottom: 1.5rem;">
                    <label class="auth-anim-label" for="inscription-country" style="display: block; margin-bottom: 0.8rem; color: #00e06d; font-weight: 700; cursor: pointer; text-align: left; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">Pays</label>
                    <div style="position: relative;">
                    <select id="inscription-country" class="auth-anim-input country-select" required style="width: 100%; padding: 16px 20px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 16px; color: white; font-size: 16px; transition: all 0.3s ease; box-sizing: border-box; cursor: pointer; font-weight: 500; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);">
                        <option value="" disabled selected style="background: #2a2a2a; color: #ccc;">Choisissez votre pays</option>
                    </select>
                    </div>
                    </div>
                    
                <div style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="inscription-is-minor" style="width: 18px; height: 18px; background: linear-gradient(135deg, #1a1a1a, #2a2a2a); border: 2px solid #444; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">
                    <label for="inscription-is-minor" style="color: #ccc; cursor: pointer; user-select: none; text-align: left; font-size: 0.95rem;">
                        Je suis mineur (moins de 18 ans) - Les contenus à caractère sexuel seront masqués
                    </label>
                        </div>
                <div style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="inscription-stay-connected" style="width: 18px; height: 18px; background: linear-gradient(135deg, #1a1a1a, #2a2a2a); border: 2px solid #444; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">
                    <label for="inscription-stay-connected" style="color: #ccc; cursor: pointer; user-select: none; text-align: left;">Rester connecté</label>
                    </div>
                <div style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="inscription-terms" required style="width: 18px; height: 18px; background: linear-gradient(135deg, #1a1a1a, #2a2a2a); border: 2px solid #444; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);">
                    <label for="inscription-terms" style="color: #ccc; cursor: pointer; user-select: none; text-align: left; font-size: 0.9rem;">
                        J'accepte les <a href="conditions-utilisation.html" target="_blank" style="color: #00e06d; text-decoration: none; font-weight: 600;">conditions d'utilisation</a> et la <a href="politique-confidentialite.html" target="_blank" style="color: #00e06d; text-decoration: none; font-weight: 600;">politique de confidentialité</a>
                            </label>
                        </div>
                <button type="submit" class="auth-submit-btn" style="width: 100%; background: linear-gradient(135deg, #00c45d, #00e06d, #00ff7f); color: white; border: none; padding: 1.5rem 2rem; border-radius: 20px; font-size: 1.2rem; font-weight: 700; cursor: pointer; box-shadow: 0 8px 30px rgba(0, 196, 93, 0.4), inset 0 1px 0 rgba(255,255,255,0.2); transition: all 0.3s ease; position: relative; overflow: hidden; margin-bottom: 1.5rem;">
                    <span style="position: relative; z-index: 2;">Créer mon compte</span>
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent); opacity: 0.7;"></div>
                        <div style="position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px; background: linear-gradient(45deg, #00c45d, #00e06d, #00ff7f, #00c45d); border-radius: 22px; z-index: -1; animation: borderGlow 3s linear infinite; opacity: 0.6;"></div>
                    </button>
                    
                    <!-- Séparateur -->
                    <div style="display: flex; align-items: center; margin: 1.5rem 0; color: #666;">
                        <div style="flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);"></div>
                        <span style="padding: 0 1rem; font-size: 0.9rem; color: #999;">ou</span>
                        <div style="flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);"></div>
                    </div>
                    
                    <!-- Bouton Google Sign-In pour inscription -->
                    <div id="google-signin-inscription" style="width: 100%; margin-bottom: 3.5rem;"></div>
                </form>
            
            <!-- Modal de mot de passe oublié (caché par défaut) -->
            <div id="forgot-password-modal" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #1a1a1a; border-radius: 20px; padding: 2rem; box-sizing: border-box; border: 2px solid rgba(0, 196, 93, 0.3); z-index: 1000;">
                <div style="text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #00c45d, #00e06d); border-radius: 50%; margin: 0 auto 1.5rem auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(0, 196, 93, 0.3);">
                        <i class="fas fa-envelope-open-text" style="font-size: 2rem; color: white;"></i>
                    </div>
                    
                    <h3 style="color: #00e06d; margin-bottom: 1rem; font-size: 1.5rem; font-weight: 600;">Mot de passe oublié</h3>
                    
                    <p style="color: #ccc; margin-bottom: 2rem; line-height: 1.5; max-width: 300px;">
                        Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                    </p>
                    
                    <form id="forgot-password-form" style="width: 100%; max-width: 300px;">
                        <div style="margin-bottom: 1.5rem;">
                            <input type="email" id="reset-email" placeholder="Votre email" required style="width: 100%; padding: 16px 20px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 16px; color: white; font-size: 16px; transition: all 0.3s ease; box-sizing: border-box; font-weight: 500; box-shadow: inset 0 2px 8px rgba(0,0,0,0.2);">
                        </div>
                        
                        <button type="submit" style="width: 100%; background: linear-gradient(135deg, #00c45d, #00e06d); color: white; border: none; padding: 1rem; border-radius: 16px; font-size: 1rem; font-weight: 600; cursor: pointer; box-shadow: 0 6px 20px rgba(0, 196, 93, 0.4); transition: all 0.3s ease; margin-bottom: 1rem;">
                            Envoyer le lien de réinitialisation
                        </button>
                        
                        <button type="button" onclick="showForgotPasswordModal(false)" style="width: 100%; background: transparent; color: #ccc; border: 2px solid #444; padding: 1rem; border-radius: 16px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                            Retour à la connexion
                        </button>
                    </form>
                </div>
            </div>
            
            <!-- Bouton de fermeture retiré : l'utilisateur doit se connecter ou créer un compte -->
        `;

        // Ajouter le popup à l'overlay
        overlay.appendChild(popup);
        document.body.appendChild(overlay);
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overscrollBehavior = 'none';
        document.body.style.overscrollBehavior = 'none';

        // Bloquer le scroll en arrière-plan : autoriser le scroll uniquement
        // à l'intérieur du popup (overlay scrollable + form-inscription scrollable).
        const blockBackgroundScroll = function(e) {
            // Trouver si l'événement vient de l'intérieur de l'overlay du popup
            const target = e.target;
            const overlayEl = document.getElementById('auth-popup-overlay');
            if (!overlayEl) return; // popup fermé, on ne bloque plus
            if (overlayEl.contains(target)) {
                // À l'intérieur du popup, on autorise le scroll de l'overlay/du form
                return;
            }
            e.preventDefault();
        };
        window.__authBlockBackgroundScroll = blockBackgroundScroll;
        window.addEventListener('wheel', blockBackgroundScroll, { passive: false });
        window.addEventListener('touchmove', blockBackgroundScroll, { passive: false });

        // Bloquer aussi les touches de défilement quand le focus est hors champs
        const blockBackgroundKeys = function(e) {
            const overlayEl = document.getElementById('auth-popup-overlay');
            if (!overlayEl) return;
            // Si le focus est dans un champ de formulaire à l'intérieur du popup, on n'intercepte rien
            const active = document.activeElement;
            if (active && overlayEl.contains(active)) {
                const tag = (active.tagName || '').toLowerCase();
                if (tag === 'input' || tag === 'textarea' || tag === 'select' || active.isContentEditable) {
                    return;
                }
            }
            const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
            if (keys.includes(e.key)) e.preventDefault();
        };
        window.__authBlockBackgroundKeys = blockBackgroundKeys;
        window.addEventListener('keydown', blockBackgroundKeys, { passive: false });

        // Une fois que le popup officiel est en place, on retire le blocage "early"
        // pour ne pas avoir double interception (le popup gère son propre scroll interne).
        try {
            if (window.__authBlockScrollEarly) {
                window.removeEventListener('wheel', window.__authBlockScrollEarly);
                window.removeEventListener('touchmove', window.__authBlockScrollEarly);
                delete window.__authBlockScrollEarly;
            }
            if (window.__authBlockKeysEarly) {
                window.removeEventListener('keydown', window.__authBlockKeysEarly);
                delete window.__authBlockKeysEarly;
            }
        } catch (e) { /* ignore */ }

        // Réinitialiser le flag après l'ajout au DOM
        setTimeout(() => {
            isPopupOpening = false;
            console.log('✅ Popup ajouté au DOM avec succès');
        }, 100);
        
        // Attendre que le DOM soit mis à jour avant d'attacher les événements
        setTimeout(() => {
            // Ajouter les gestionnaires d'événements pour les onglets
            const tabConnexion = document.getElementById('tab-connexion');
            const tabInscription = document.getElementById('tab-inscription');
            const formConnexion = document.getElementById('form-connexion');
            const formInscription = document.getElementById('form-inscription');
            
            console.log('Éléments trouvés:', {
                tabConnexion: !!tabConnexion,
                tabInscription: !!tabInscription,
                formConnexion: !!formConnexion,
                formInscription: !!formInscription
            });
            
            // Remplir le select pays depuis COUNTRY_LIST (localization.js)
            var countrySelect = document.getElementById('inscription-country');
            if (countrySelect && window.COUNTRY_LIST) {
                var lang = (localStorage.getItem('mangaWatchLanguage') || 'fr').toLowerCase();
                window.COUNTRY_LIST.forEach(function(c) {
                    countrySelect.appendChild(new Option(c[lang] || c.fr, c.code));
                });
                // Barre de recherche pour filtrer les pays
                attachCountrySearch('inscription-country', countrySelect.parentNode);
            }
            
            // Gestionnaire pour l'onglet connexion
            if (tabConnexion) {
                tabConnexion.addEventListener('click', function() {
                    console.log('Changement d\'onglet vers: connexion');
                    
                    // Mettre à jour les onglets
                    tabConnexion.style.background = 'linear-gradient(135deg, #00c45d, #00e06d)';
                    tabConnexion.style.color = 'white';
                    tabConnexion.style.boxShadow = '0 4px 15px rgba(0, 196, 93, 0.3)';
                    tabInscription.style.background = 'transparent';
                    tabInscription.style.color = '#ccc';
                    tabInscription.style.boxShadow = 'none';
                    
                    // Mettre à jour les formulaires avec animation
                    formInscription.style.display = 'none';
                    formInscription.style.visibility = 'hidden';
                    formInscription.style.position = 'absolute';
                    formInscription.style.opacity = '0';
                    
                    formConnexion.style.display = 'block';
                    formConnexion.style.visibility = 'visible';
                    formConnexion.style.position = 'relative';
                    formConnexion.style.opacity = '0';
                    formConnexion.style.transform = 'none';
                    
                    setTimeout(() => {
                        formConnexion.style.opacity = '1';
                        formConnexion.style.transform = 'none';
                    }, 50);
                });
            }

            // Gestionnaire pour l'onglet inscription
            if (tabInscription) {
                tabInscription.addEventListener('click', function() {
                    console.log('Changement d\'onglet vers: inscription');
                    
                    // Mettre à jour les onglets
                    tabInscription.style.background = 'linear-gradient(135deg, #00c45d, #00e06d)';
                    tabInscription.style.color = 'white';
                    tabInscription.style.boxShadow = '0 4px 15px rgba(0, 196, 93, 0.3)';
                    tabConnexion.style.background = 'transparent';
                    tabConnexion.style.color = '#ccc';
                    tabConnexion.style.boxShadow = 'none';
                    
                    // Mettre à jour les formulaires avec animation
                    formConnexion.style.display = 'none';
                    formConnexion.style.visibility = 'hidden';
                    formConnexion.style.position = 'absolute';
                    formConnexion.style.opacity = '0';
                    
                    formInscription.style.display = 'block';
                    formInscription.style.visibility = 'visible';
                    formInscription.style.position = 'relative';
                    formInscription.style.opacity = '0';
                    formInscription.style.transform = 'none';
                    
                    setTimeout(() => {
                        formInscription.style.opacity = '1';
                        formInscription.style.transform = 'none';
                    }, 50);
                });
            }

            // Gestionnaires de soumission des formulaires
            if (formConnexion) {
                formConnexion.addEventListener('submit', async function(event) {
                    event.preventDefault();
                    console.log('Tentative de connexion...');
                    
                    // Récupérer les données du formulaire
                    const email = document.getElementById('connexion-email').value.trim();
                    const password = document.getElementById('connexion-password').value;
                    const stayConnected = document.getElementById('connexion-stay-connected').checked;
                    
                    // Validation des champs
                    if (!email || !password) {
                        showAuthErrorModal('Veuillez remplir tous les champs');
                        return;
                    }
                    
                    // Vérifier si l'email est blacklisté
                    const blacklistedEmails = JSON.parse(localStorage.getItem('blacklisted_emails') || '[]');
                    if (blacklistedEmails.includes(email.toLowerCase())) {
                        showAuthErrorModal('Cet email a été banni et ne peut plus être utilisé pour se connecter.');
                        return;
                    }
                    
                    // Vérifier les comptes existants (vérification locale rapide)
                    const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
                    let account = accounts.find(acc => acc.email === email && acc.password === password);
                    
                    // === AUTHENTIFICATION FIREBASE AUTH ===
                    // Cette étape est OBLIGATOIRE pour pouvoir uploader un avatar,
                    // accéder aux fonctionnalités Firebase, etc.
                    let firebaseUid = null;
                    let firebaseAuthSuccess = false;
                    try {
                        console.log('🔐 Authentification Firebase Auth...');
                        const { authService } = await import('./firebase-service.js?v=6febe22');
                        try {
                            const result = await authService.signInWithEmail(email, password);
                            firebaseUid = result.user?.uid || null;
                            firebaseAuthSuccess = true;
                            console.log('✅ Authentification Firebase réussie, uid:', firebaseUid);
                        } catch (signInError) {
                            // Si l'utilisateur n'existe pas encore sur Firebase Auth (compte legacy
                            // créé avant l'intégration Firebase), on essaie de migrer en créant
                            // automatiquement le compte Firebase Auth, mais SEULEMENT si la
                            // vérification locale (account) est valide.
                            const isUserNotFound = signInError?.code === 'auth/user-not-found' ||
                                                   signInError?.code === 'auth/invalid-credential' ||
                                                   signInError?.code === 'auth/invalid-login-credentials';
                            if (isUserNotFound && account) {
                                console.log('🔄 Migration : création du compte Firebase Auth pour compte legacy...');
                                try {
                                    const result = await authService.signUpWithEmail(email, password);
                                    firebaseUid = result.user?.uid || null;
                                    firebaseAuthSuccess = true;
                                    console.log('✅ Migration Firebase Auth réussie, uid:', firebaseUid);
                                } catch (signUpError) {
                                    console.warn('⚠️ Migration Firebase Auth échouée:', signUpError);
                                    // Si l'email est déjà pris sur Firebase mais avec un autre mdp,
                                    // c'est probablement un mauvais mot de passe.
                                    if (signUpError?.code === 'auth/email-already-in-use') {
                                        showAuthErrorModal('Email ou mot de passe incorrect');
                                        return;
                                    }
                                    // Sinon on continue sans Firebase (l'avatar ne fonctionnera pas mais la connexion oui)
                                }
                            } else if (!account) {
                                // Pas de compte local ET échec Firebase => identifiants invalides
                                showAuthErrorModal('Email ou mot de passe incorrect');
                                return;
                            } else {
                                // Mot de passe Firebase incorrect mais local correct (cas rare de désync)
                                console.warn('⚠️ Désynchronisation mdp Firebase/local:', signInError?.code);
                            }
                        }
                    } catch (importError) {
                        console.error('❌ Erreur import firebase-service:', importError);
                        // On continue avec l'authentification locale uniquement
                    }

                    // Si on n'a pas de compte local mais Firebase a réussi, on doit en recréer un
                    if (!account && firebaseAuthSuccess) {
                        console.log('🔄 Reconstitution du compte local depuis Firebase Auth');
                        const reconstructedAccount = {
                            username: email.split('@')[0],
                            email: email,
                            password: password,
                            langue: 'fr',
                            country: 'fr',
                            isMinor: false,
                            uid: firebaseUid,
                            provider: 'email',
                            createdAt: new Date().toISOString()
                        };
                        accounts.push(reconstructedAccount);
                        localStorage.setItem('accounts', JSON.stringify(accounts));
                        account = reconstructedAccount;
                    }

                    if (!account) {
                        showAuthErrorModal('Email ou mot de passe incorrect');
                        return;
                    }

                    // Mettre à jour l'uid sur le compte local s'il vient d'être créé
                    if (firebaseUid && !account.uid) {
                        account.uid = firebaseUid;
                        const idx = accounts.findIndex(a => a.email === email);
                        if (idx >= 0) {
                            accounts[idx] = account;
                            localStorage.setItem('accounts', JSON.stringify(accounts));
                        }
                    }
                    
                    // Vérifier si l'utilisateur est banni
                    const bannedUsers = JSON.parse(localStorage.getItem('banned_users') || '[]');
                    const isBanned = bannedUsers.some(b => b.email === email);
                    if (isBanned) {
                        // Déconnecter Firebase si on s'était connecté
                        if (firebaseAuthSuccess) {
                            try {
                                const { authService } = await import('./firebase-service.js?v=6febe22');
                                await authService.signOut();
                            } catch (e) { /* ignore */ }
                        }
                        showAuthErrorModal('Ce compte a été banni. Contactez l\'administrateur pour plus d\'informations.');
                        return;
                    }
                    
                    // Créer la session utilisateur
                    const user = {
                        name: account.username,
                        username: account.username,
                        email: account.email,
                        picture: 'https://via.placeholder.com/150',
                        langue: account.langue || 'fr',
                        country: account.country || account.continent || 'fr',
                        uid: firebaseUid || account.uid || null,
                        provider: account.provider || 'email'
                    };
                    
                    localStorage.setItem('user', JSON.stringify(user));
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('rememberMe', stayConnected ? 'true' : 'false');
                    if (stayConnected) {
                        sessionStorage.removeItem('mangawatch_session_active');
                    } else {
                        sessionStorage.setItem('mangawatch_session_active', '1');
                    }

                    await syncProfileToFirestore(account.email, user);
                    
                    // Fermer le popup d'authentification
                    closeAuthPopup();
                    
                    // Afficher le modal de succès
                    showAuthSuccessModal('Connexion réussie ! Bienvenue ' + account.username + ' !');
                    
                    // Recharger les sections dynamiques immédiatement
                    setTimeout(async () => {
                        await reloadDynamicSections();
                    }, 500);
                    
                    // Recharger la page après un court délai pour laisser voir le message
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                });
            }
        
        // Gestionnaire pour le lien "Mot de passe oublié"
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Ouverture du modal de mot de passe oublié');
                showForgotPasswordModal(true);
            });
        }
        
        // Gestionnaire pour le formulaire de mot de passe oublié
        const forgotPasswordForm = document.getElementById('forgot-password-form');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', handleForgotPasswordSubmit);
        }

        // Initialiser le bouton Google Sign-In avec Firebase (connexion)
        const googleSignInDiv = document.getElementById('google-signin');
        if (googleSignInDiv) {
            console.log('✅ Div google-signin trouvé, création du bouton...');
            // Créer un bouton Google personnalisé pour Firebase
            googleSignInDiv.innerHTML = `
                <button id="firebase-google-signin-btn" class="google-signin-button" style="
                    width: 100%;
                    padding: 12px 16px;
                    background: white;
                    border: 1px solid #dadce0;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    color: #3c4043;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: background-color 0.2s;
                " onmouseover="this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.backgroundColor='white'">
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.348 0-4.337-1.584-5.047-3.71H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                        <path fill="#FBBC05" d="M3.953 10.708c-.18-.54-.282-1.117-.282-1.708 0-.591.102-1.168.282-1.708V4.96H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.04l2.996-2.332z"/>
                        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.96L3.953 7.292C4.663 5.156 6.652 3.58 9 3.58z"/>
                    </svg>
                    Continuer avec Google
                </button>
            `;
            
            // Attendre un peu pour que le DOM soit mis à jour
            setTimeout(() => {
                // Ajouter l'événement de clic
                const firebaseGoogleBtn = document.getElementById('firebase-google-signin-btn');
            if (firebaseGoogleBtn) {
                console.log('✅ Bouton Google Sign-In trouvé, ajout de l\'event listener...');
                // Empêcher les doubles clics
                let isProcessing = false;
                
                firebaseGoogleBtn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔥🔥🔥 CLIC DÉTECTÉ sur le bouton Google Sign-In !');
                    
                    // Empêcher les doubles clics
                    if (isProcessing) {
                        console.log('⚠️ Connexion déjà en cours...');
                        return;
                    }
                    
                    isProcessing = true;
                    console.log('🔥 Début du processus de connexion Google');
                    firebaseGoogleBtn.disabled = true;
                    firebaseGoogleBtn.style.opacity = '0.6';
                    firebaseGoogleBtn.style.cursor = 'wait';
                    
                    try {
                        // Charger le script auth.js si pas déjà chargé
                        if (typeof window.handleFirebaseGoogleSignIn === 'undefined') {
                            console.log('📦 Chargement du module auth.js...');
                            await import('./auth.js');
                            console.log('✅ Module auth.js chargé');
                        }
                        
                        // Vérifier si la fonction est disponible
                        console.log('🔍 Vérification de handleFirebaseGoogleSignIn:', typeof window.handleFirebaseGoogleSignIn);
                        
                        // Appeler la fonction Firebase
                        if (typeof window.handleFirebaseGoogleSignIn === 'function') {
                            console.log('✅ Appel de handleFirebaseGoogleSignIn()...');
                            await window.handleFirebaseGoogleSignIn();
                            console.log('✅ handleFirebaseGoogleSignIn() terminé');
                        } else {
                            console.error('❌ Fonction handleFirebaseGoogleSignIn non disponible');
                            showAuthErrorModal('Erreur : Firebase Auth non disponible. Veuillez recharger la page.');
                            isProcessing = false;
                            firebaseGoogleBtn.disabled = false;
                            firebaseGoogleBtn.style.opacity = '1';
                            firebaseGoogleBtn.style.cursor = 'pointer';
                        }
                    } catch (error) {
                        console.error('❌ Erreur lors du clic sur le bouton Google:', error);
                        console.error('Stack trace:', error.stack);
                        showAuthErrorModal('Erreur lors de la connexion avec Google. Veuillez réessayer.');
                        isProcessing = false;
                        firebaseGoogleBtn.disabled = false;
                        firebaseGoogleBtn.style.opacity = '1';
                        firebaseGoogleBtn.style.cursor = 'pointer';
                    }
                });
                console.log('✅ Event listener ajouté au bouton Google Sign-In');
            } else {
                console.error('❌ Bouton firebase-google-signin-btn non trouvé !');
            }
            }, 100);
        } else {
            console.error('❌ Div google-signin non trouvé !');
        }

        // Initialiser le bouton Google Sign-In avec Firebase (inscription)
        const googleSignInInscriptionDiv = document.getElementById('google-signin-inscription');
        if (googleSignInInscriptionDiv) {
            console.log('✅ Div google-signin-inscription trouvé, création du bouton...');
            // Créer un bouton Google personnalisé pour Firebase
            googleSignInInscriptionDiv.innerHTML = `
                <button id="firebase-google-signin-inscription-btn" class="google-signin-button" style="
                    width: 100%;
                    padding: 12px 16px;
                    background: white;
                    border: 1px solid #dadce0;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    color: #3c4043;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: background-color 0.2s;
                " onmouseover="this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.backgroundColor='white'">
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.348 0-4.337-1.584-5.047-3.71H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                        <path fill="#FBBC05" d="M3.953 10.708c-.18-.54-.282-1.117-.282-1.708 0-.591.102-1.168.282-1.708V4.96H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.04l2.996-2.332z"/>
                        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.96L3.953 7.292C4.663 5.156 6.652 3.58 9 3.58z"/>
                    </svg>
                    S'inscrire avec Google
                </button>
            `;
            
            // Attendre un peu pour que le DOM soit mis à jour
            setTimeout(() => {
                // Ajouter l'événement de clic
                const firebaseGoogleInscriptionBtn = document.getElementById('firebase-google-signin-inscription-btn');
            if (firebaseGoogleInscriptionBtn) {
                console.log('✅ Bouton Google Sign-Up trouvé, ajout de l\'event listener...');
                let isProcessing = false;
                
                firebaseGoogleInscriptionBtn.addEventListener('click', async function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔥🔥🔥 CLIC DÉTECTÉ sur le bouton Google Sign-Up !');
                    
                    if (isProcessing) {
                        console.log('⚠️ Inscription Google déjà en cours...');
                        return;
                    }
                    
                    isProcessing = true;
                    console.log('🔥 Début du processus d\'inscription Google');
                    firebaseGoogleInscriptionBtn.disabled = true;
                    firebaseGoogleInscriptionBtn.style.opacity = '0.6';
                    firebaseGoogleInscriptionBtn.style.cursor = 'wait';
                    
                    try {
                        // Charger le script auth.js si pas déjà chargé
                        if (typeof window.handleFirebaseGoogleSignUp === 'undefined') {
                            console.log('📦 Chargement du module auth.js...');
                            await import('./auth.js');
                            console.log('✅ Module auth.js chargé');
                        }
                        
                        // Vérifier si la fonction est disponible
                        console.log('🔍 Vérification de handleFirebaseGoogleSignUp:', typeof window.handleFirebaseGoogleSignUp);
                        
                        // Appeler la fonction Firebase pour l'inscription
                        if (typeof window.handleFirebaseGoogleSignUp === 'function') {
                            console.log('✅ Appel de handleFirebaseGoogleSignUp()...');
                            await window.handleFirebaseGoogleSignUp();
                            console.log('✅ handleFirebaseGoogleSignUp() terminé');
                        } else {
                            console.error('❌ Fonction handleFirebaseGoogleSignUp non disponible');
                            showAuthErrorModal('Erreur : Firebase Auth non disponible. Veuillez recharger la page.');
                            isProcessing = false;
                            firebaseGoogleInscriptionBtn.disabled = false;
                            firebaseGoogleInscriptionBtn.style.opacity = '1';
                            firebaseGoogleInscriptionBtn.style.cursor = 'pointer';
                        }
                    } catch (error) {
                        console.error('❌ Erreur lors du clic sur le bouton Google inscription:', error);
                        console.error('Stack trace:', error.stack);
                        showAuthErrorModal('Erreur lors de l\'inscription avec Google. Veuillez réessayer.');
                        isProcessing = false;
                        firebaseGoogleInscriptionBtn.disabled = false;
                        firebaseGoogleInscriptionBtn.style.opacity = '1';
                        firebaseGoogleInscriptionBtn.style.cursor = 'pointer';
                    }
                });
                console.log('✅ Event listener ajouté au bouton Google Sign-Up');
            } else {
                console.error('❌ Bouton firebase-google-signin-inscription-btn non trouvé !');
            }
            }, 100);
        } else {
            console.error('❌ Div google-signin-inscription non trouvé !');
        }

            // Validation du pseudo en temps réel pour l'inscription normale
            const inscriptionPseudoInput = document.getElementById('inscription-pseudo');
            if (inscriptionPseudoInput) {
                inscriptionPseudoInput.addEventListener('input', function() {
                    const pseudo = this.value.trim();
                    const errorElement = document.getElementById('inscription-pseudo-error');
                    
                    // Vérifier les espaces
                    if (pseudo.includes(' ')) {
                        errorElement.textContent = '❌ Les espaces sont interdits. Utilisez des tirets (-) ou underscores (_) à la place.';
                        errorElement.style.display = 'block';
                        this.style.borderColor = '#ff4444';
                        return;
                    }
                    
                    // Vérifier les caractères autorisés
                    const validPattern = /^[a-zA-Z0-9_-]+$/;
                    if (pseudo && !validPattern.test(pseudo)) {
                        errorElement.textContent = '❌ Caractères invalides. Utilisez uniquement des lettres, chiffres, tirets (-) et underscores (_).';
                        errorElement.style.display = 'block';
                        this.style.borderColor = '#ff4444';
                        return;
                    }
                    
                    // Vérifier si le pseudo est déjà pris
                    const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
                    const pseudoExists = accounts.some(acc => acc.username && acc.username.toLowerCase() === pseudo.toLowerCase());
                    
                    if (pseudoExists) {
                        errorElement.textContent = '❌ Ce pseudo est déjà pris. Veuillez en choisir un autre.';
                        errorElement.style.display = 'block';
                        this.style.borderColor = '#ff4444';
                        return;
                    }
                    
                    // Tout est bon
                    errorElement.style.display = 'none';
                    this.style.borderColor = 'rgba(255,255,255,0.15)';
        });
            }
        
            if (formInscription) {
                formInscription.addEventListener('submit', async function(event) {
                    event.preventDefault();
                    console.log('Tentative d\'inscription...');
                    
                    // Récupérer les données du formulaire
                    const username = document.getElementById('inscription-pseudo').value.trim();
                    const email = document.getElementById('inscription-email').value.trim();
                    const password = document.getElementById('inscription-password').value;
                    const langue = document.getElementById('inscription-langue').value;
                    const country = document.getElementById('inscription-country').value;
                    const isMinor = document.getElementById('inscription-is-minor').checked;
                    const terms = document.getElementById('inscription-terms').checked;
                    
                    // Validation des champs obligatoires
                    if (!username || !email || !password || !langue || !country) {
                        showAuthErrorModal('Veuillez remplir tous les champs obligatoires');
                        return;
                    }
                    
                    // Validation du pseudo (pas d'espaces, caractères valides)
                    if (username.includes(' ')) {
                        showAuthErrorModal('❌ Les espaces sont interdits dans le pseudo. Utilisez des tirets (-) ou underscores (_) à la place.');
                        return;
                    }
                    
                    const validPattern = /^[a-zA-Z0-9_-]+$/;
                    if (!validPattern.test(username)) {
                        showAuthErrorModal('❌ Le pseudo contient des caractères invalides. Utilisez uniquement des lettres, chiffres, tirets (-) et underscores (_).');
                        return;
                    }
                    
                    // Vérifier si le pseudo est déjà pris
                    const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
                    const pseudoExists = accounts.some(acc => acc.username && acc.username.toLowerCase() === username.toLowerCase());
                    
                    if (pseudoExists) {
                        showAuthErrorModal('❌ Ce pseudo est déjà pris. Veuillez en choisir un autre.');
                        return;
                    }
                    
                    // Vérifier si l'email est blacklisté
                    const blacklistedEmails = JSON.parse(localStorage.getItem('blacklisted_emails') || '[]');
                    if (blacklistedEmails.includes(email.toLowerCase())) {
                        showAuthErrorModal('Cet email a été banni et ne peut plus être utilisé pour créer un compte.');
                        return;
                    }
                    
                    // Vérifier si l'utilisateur est banni
                    const bannedUsers = JSON.parse(localStorage.getItem('banned_users') || '[]');
                    const isBanned = bannedUsers.some(b => b.email.toLowerCase() === email.toLowerCase());
                    if (isBanned) {
                        showAuthErrorModal('Cet email a été banni et ne peut plus être utilisé pour créer un compte.');
                        return;
                    }
                    
                    // Vérifier si l'email est déjà utilisé
                    const emailExists = accounts.some(acc => acc.email.toLowerCase() === email.toLowerCase());
                    if (emailExists) {
                        showAuthErrorModal('Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.');
                        return;
                    }
                    
                    if (!terms) {
                        showAuthErrorModal('Vous devez accepter les conditions d\'utilisation');
                        return;
                    }
                    
                    const stayConnected = document.getElementById('inscription-stay-connected').checked;
                    
                    // Vérifier si le compte existe déjà (accounts est déjà déclaré plus haut)
                    const existingAccount = accounts.find(acc => acc.email === email);
                    
                    if (existingAccount) {
                        showAuthErrorModal('Un compte existe déjà avec cet email');
                        return;
                    }
                    
                    // Validation du mot de passe (Firebase Auth exige au moins 6 caractères)
                    if (password.length < 6) {
                        showAuthErrorModal('Le mot de passe doit contenir au moins 6 caractères.');
                        return;
                    }

                    // === CRÉATION DU COMPTE FIREBASE AUTH ===
                    // Cette étape est OBLIGATOIRE pour pouvoir uploader un avatar,
                    // écrire dans Firestore avec les règles de sécurité, etc.
                    let firebaseUid = null;
                    try {
                        console.log('🔐 Création du compte Firebase Auth...');
                        const { authService } = await import('./firebase-service.js?v=6febe22');
                        const result = await authService.signUpWithEmail(email, password);
                        firebaseUid = result.user?.uid || null;
                        console.log('✅ Compte Firebase Auth créé, uid:', firebaseUid);
                    } catch (fbError) {
                        console.error('❌ Erreur création Firebase Auth:', fbError);
                        let msg = 'Erreur lors de la création du compte. Veuillez réessayer.';
                        if (fbError?.code === 'auth/email-already-in-use') {
                            msg = 'Cet email est déjà utilisé. Connectez-vous au lieu de créer un compte.';
                        } else if (fbError?.code === 'auth/invalid-email') {
                            msg = 'Adresse email invalide.';
                        } else if (fbError?.code === 'auth/weak-password') {
                            msg = 'Mot de passe trop faible (minimum 6 caractères).';
                        } else if (fbError?.code === 'auth/network-request-failed') {
                            msg = 'Erreur réseau. Vérifiez votre connexion internet.';
                        } else if (fbError?.code === 'auth/operation-not-allowed') {
                            msg = 'L\'inscription par email/mot de passe n\'est pas activée. Contactez l\'administrateur.';
                        } else if (fbError?.message) {
                            msg = 'Erreur : ' + fbError.message;
                        }
                        showAuthErrorModal(msg);
                        return; // STOP : on ne crée PAS le compte si Firebase Auth a échoué
                    }

                    // Créer le nouveau compte
                    const signupTs = new Date().toISOString();
                    const newAccount = {
                        username: username,
                        email: email,
                        password: password,
                        langue: langue,
                        country: country,
                        isMinor: isMinor,
                        uid: firebaseUid,
                        provider: 'email',
                        created_at: signupTs,
                        createdAt: signupTs
                    };
                    
                    // Sauvegarder le nouveau compte
                    const updatedAccounts = [...accounts, newAccount];
                    localStorage.setItem('accounts', JSON.stringify(updatedAccounts));
                    
                    // Créer la session utilisateur
                    const user = {
                        name: username,
                        username: username,
                        email: email,
                        picture: 'https://via.placeholder.com/150',
                        langue: langue,
                        country: country,
                        isMinor: isMinor,
                        uid: firebaseUid,
                        provider: 'email',
                        createdAt: signupTs,
                        created_at: signupTs
                    };
                    
                    localStorage.setItem('user', JSON.stringify(user));
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('rememberMe', stayConnected ? 'true' : 'false');
                    if (stayConnected) {
                        sessionStorage.removeItem('mangawatch_session_active');
                    } else {
                        sessionStorage.setItem('mangawatch_session_active', '1');
                    }

                    await syncProfileToFirestore(email, user);
                    console.log('✅ Profil synchronisé sur Firestore');
                    
                    // Ajouter le nouvel utilisateur à la liste avec un avatar aléatoire
                    addNewUser(username);
                    
                    // Fermer le popup d'authentification
                    closeAuthPopup();
                    
                    // Afficher le modal de succès
                    showAuthSuccessModal('Inscription réussie ! Bienvenue ' + username + ' !');
                    
                    // Recharger les sections dynamiques immédiatement
                    setTimeout(async () => {
                        await reloadDynamicSections();
                    }, 500);
                    
                    // Recharger la page après un court délai pour laisser voir le message
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                });
            }


        

        
            // Appliquer les traductions si disponibles
            if (window.localization) {
                setTimeout(() => {
                    if (window.applyTranslationsToPopup) {
                        window.applyTranslationsToPopup();
                    }
                }, 100);
            }
        }, 100); // Fermer le setTimeout principal
    }
    
    // === FONCTIONS GLOBALES DU POPUP ===
    
    // Fonction pour fermer le pop-up
    window.closeAuthPopup = function() {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.documentElement.style.overscrollBehavior = '';
        document.body.style.overscrollBehavior = '';
        document.body.style.touchAction = '';
        const overlay = document.getElementById('auth-popup-overlay');
        if (overlay) {
            overlay.remove();
        }
        // Retirer les blocages de scroll en arrière-plan posés à l'ouverture
        try {
            if (window.__authBlockBackgroundScroll) {
                window.removeEventListener('wheel', window.__authBlockBackgroundScroll);
                window.removeEventListener('touchmove', window.__authBlockBackgroundScroll);
                delete window.__authBlockBackgroundScroll;
            }
            if (window.__authBlockBackgroundKeys) {
                window.removeEventListener('keydown', window.__authBlockBackgroundKeys);
                delete window.__authBlockBackgroundKeys;
            }
            if (window.__authBlockScrollEarly) {
                window.removeEventListener('wheel', window.__authBlockScrollEarly);
                window.removeEventListener('touchmove', window.__authBlockScrollEarly);
                delete window.__authBlockScrollEarly;
            }
            if (window.__authBlockKeysEarly) {
                window.removeEventListener('keydown', window.__authBlockKeysEarly);
                delete window.__authBlockKeysEarly;
            }
        } catch (e) { /* ignore */ }
    };
    
    // Fonction pour afficher/masquer le modal de mot de passe oublié
    window.showForgotPasswordModal = function(show = true) {
        const forgotModal = document.getElementById('forgot-password-modal');
        if (forgotModal) {
            forgotModal.style.display = show ? 'block' : 'none';
        }
        // Cacher le séparateur "ou" + bouton Google dans le formulaire connexion quand le modal reset est visible
        const googleSignin = document.getElementById('google-signin');
        if (googleSignin) {
            const separatorOu = googleSignin.previousElementSibling;
            if (show) {
                if (separatorOu && separatorOu.textContent && separatorOu.textContent.includes('ou')) separatorOu.style.display = 'none';
                googleSignin.style.display = 'none';
            } else {
                if (separatorOu) separatorOu.style.display = '';
                googleSignin.style.display = '';
            }
        }
    };
    
    // Fonction pour envoyer l'email de réinitialisation (Firebase Auth)
    window.handleForgotPasswordSubmit = async function(e) {
        e.preventDefault();
        
        const emailInput = document.getElementById('reset-email');
        const email = emailInput?.value?.trim();
        if (!email) {
            alert('Veuillez saisir votre adresse email');
            return;
        }
        
        const submitBtn = document.querySelector('#forgot-password-form button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Envoi en cours...';
        }
        
        try {
            const { auth } = await import('./firebase-config.js');
            const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            
            const actionCodeSettings = {
                url: window.location.origin + '/pages/reset-password.html',
                handleCodeInApp: true
            };
            
            await sendPasswordResetEmail(auth, email, actionCodeSettings);
            
            alert('Un lien de réinitialisation a été envoyé à votre adresse email ! Vérifiez votre boîte de réception (et les spams).');
            showForgotPasswordModal(false);
            
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
            if (error.code === 'auth/user-not-found') {
                alert('Aucun compte n\'est associé à cette adresse email.');
            } else if (error.code === 'auth/invalid-email') {
                alert('Adresse email invalide.');
            } else {
                alert('Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Envoyer le lien de réinitialisation';
            }
        }
    };

    // Fonction pour tester le popup (accessible depuis la console)
    window.testAuthPopup = function() {
        showAuthPopup();
    };
    
    // Fonction pour tester les onglets (accessible depuis la console)
    window.testTabs = function() {
        const tabConnexion = document.getElementById('tab-connexion');
        const tabInscription = document.getElementById('tab-inscription');
        const formConnexion = document.getElementById('form-connexion');
        const formInscription = document.getElementById('form-inscription');
        
        console.log('Test des onglets:');
        console.log('tabConnexion:', tabConnexion);
        console.log('tabInscription:', tabInscription);
        console.log('formConnexion:', formConnexion);
        console.log('formInscription:', formInscription);
        
        if (tabInscription) {
            console.log('Test: clic sur inscription');
            tabInscription.click();
        }
    };
    
    // Rendre la fonction showAuthPopup accessible globalement
    window.showAuthPopup = showAuthPopup;
    window.testAuthPopup = showAuthPopup; // Alias pour les tests

    // Fonction pour charger l'auteur de la semaine
    async function loadAuthorOfWeek() {
        try {
            const response = await fetch('../data/auteurs.json');
            const auteurs = await response.json();
            
            // Sélectionner un auteur basé sur la semaine de l'année (pour avoir le même auteur toute la semaine)
            const today = new Date();
            const weekOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24 * 7));
            const selectedAuthorIndex = weekOfYear % auteurs.length;
            const selectedAuthor = auteurs[selectedAuthorIndex];
            
            // Traduire la description de l'auteur
            const currentLang = localStorage.getItem('mangaWatchLanguage') || 'fr';
            console.log(`🌍 Traduction de l'auteur de la semaine en ${currentLang}`);
            
            let authorDescription = selectedAuthor.description;
            if (currentLang !== 'fr' && window.translateWithCache) {
                try {
                    console.log(`🔄 Traduction de la description de l'auteur: "${authorDescription.substring(0, 50)}..."`);
                    authorDescription = await window.translateWithCache(selectedAuthor.description, currentLang);
                    console.log(`✅ Description de l'auteur traduite: "${authorDescription.substring(0, 50)}..."`);
                } catch (error) {
                    console.error('❌ Erreur lors de la traduction de la description de l\'auteur:', error);
                }
            }
            
            // Traduire les descriptions des œuvres
            const translatedWorks = [];
            for (const oeuvre of selectedAuthor.oeuvres) {
                let workDescription = oeuvre.description;
                if (currentLang !== 'fr' && window.translateWithCache) {
                    try {
                        console.log(`🔄 Traduction de la description de "${oeuvre.titre}": "${workDescription.substring(0, 50)}..."`);
                        workDescription = await window.translateWithCache(oeuvre.description, currentLang);
                        console.log(`✅ Description de "${oeuvre.titre}" traduite: "${workDescription.substring(0, 50)}..."`);
                    } catch (error) {
                        console.error(`❌ Erreur lors de la traduction de la description de "${oeuvre.titre}":`, error);
                    }
                }
                translatedWorks.push({ ...oeuvre, description: workDescription });
            }
            
            // Obtenir la traduction du type d'œuvre (Manga)
            const tFn = window.t || (window.localization ? (key) => window.localization.get(key) : (key) => key);
            const workTypeTranslated = tFn('search.type.manga') || 'Manga';
            
            // Créer le HTML pour l'auteur du jour
            const authorHTML = `
                <div class="author-info">
                    <div class="author-name">${selectedAuthor.nom}</div>
                    <div class="author-description">${authorDescription}</div>
                </div>
                <div class="author-works">
                    ${translatedWorks.map(oeuvre => `
                        <div class="work-card">
                            <div class="work-image-container">
                                <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMmEyYTIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udCZhbXA7ZmFtaWx5PSJBcmlhbCIgZm9udCZhbXA7c2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Mb2FkaW5nLi4uPC90ZXh0Pjwvc3ZnPg==" alt="${oeuvre.titre}" class="work-image" data-manga-title="${oeuvre.titre}">
                                <div class="work-image-placeholder" style="display: none;">${oeuvre.titre}</div>
                        </div>
                        <div class="work-info">
                            <h3 class="work-title" data-manga-title="${oeuvre.titre}" style="cursor: pointer;">${oeuvre.titre}</h3>
                            <p class="work-type">${workTypeTranslated}</p>
                            <p class="work-description">${oeuvre.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

            // Insérer le HTML dans le conteneur
            const container = document.getElementById('authorOfWeekContainer');
            if (container) {
                container.innerHTML = authorHTML;
                
                                // Charger les vraies images depuis l'API Jikan pour chaque œuvre
                const workCards = container.querySelectorAll('.work-card');
                for (const card of workCards) {
                    const image = card.querySelector('.work-image');
                    const placeholder = card.querySelector('.work-image-placeholder');
                    const title = card.querySelector('.work-title');
                    const mangaTitle = image?.dataset?.mangaTitle;
                    
                    if (mangaTitle && image && placeholder) {
                        // Vérifier d'abord le cache pour l'URL de l'image
                        const cacheKey = `manga_image_${mangaTitle.toLowerCase().trim()}`;
                        const cachedImageUrl = localStorage.getItem(cacheKey);
                        
                        if (cachedImageUrl) {
                            // Utiliser l'image en cache
                            console.log(`✅ Image trouvée en cache pour ${mangaTitle}`);
                            const img = new Image();
                            img.onload = function() {
                                image.src = cachedImageUrl;
                                image.style.display = 'block';
                                placeholder.style.display = 'none';
                            };
                            img.onerror = function() {
                                // Si l'image en cache ne fonctionne plus, la retirer du cache et chercher une nouvelle
                                console.warn(`Image en cache invalide pour ${mangaTitle}, recherche d'une nouvelle...`);
                                localStorage.removeItem(cacheKey);
                                loadImageFromAPI();
                            };
                            img.src = cachedImageUrl;
                        } else {
                            // Pas de cache, charger depuis l'API
                            loadImageFromAPI();
                        }
                        
                        // Fonction pour charger l'image depuis l'API
                        async function loadImageFromAPI() {
                            // Afficher le placeholder par défaut
                            image.style.display = 'none';
                            placeholder.style.display = 'flex';
                            
                            try {
                                const realImage = await Promise.race([
                                    fetchMangaImage(mangaTitle),
                                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
                                ]);
                                
                            if (realImage) {
                                    // Mettre en cache l'URL de l'image
                                    localStorage.setItem(cacheKey, realImage);
                                    localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
                                    console.log(`✅ Image trouvée et mise en cache pour ${mangaTitle}`);
                                    
                                    // Vérifier que l'image se charge correctement avant de l'afficher
                                    const img = new Image();
                                    let imageLoaded = false;
                                    
                                    // Timeout pour le chargement de l'image (5 secondes)
                                    const imageTimeout = setTimeout(() => {
                                        if (!imageLoaded) {
                                            console.warn(`Timeout de chargement de l'image pour ${mangaTitle}`);
                                            image.style.display = 'none';
                                            placeholder.style.display = 'flex';
                                        }
                                    }, 5000);
                                    
                                    img.onload = function() {
                                        imageLoaded = true;
                                        clearTimeout(imageTimeout);
                                image.src = realImage;
                                        image.style.display = 'block';
                                        placeholder.style.display = 'none';
                                    };
                                    
                                    img.onerror = function() {
                                        imageLoaded = true;
                                        clearTimeout(imageTimeout);
                                        console.warn(`Image invalide pour ${mangaTitle}: ${realImage}`);
                                        // Retirer du cache si l'image ne fonctionne pas
                                        localStorage.removeItem(cacheKey);
                                        localStorage.removeItem(`${cacheKey}_timestamp`);
                                        image.style.display = 'none';
                                    placeholder.style.display = 'flex';
                                };
                                    
                                    img.src = realImage;
                            } else {
                                    // Si pas d'image trouvée, garder le placeholder
                                image.style.display = 'none';
                                placeholder.style.display = 'flex';
                            }
                        } catch (error) {
                                console.warn(`Erreur lors du chargement de l'image pour ${mangaTitle}:`, error.message || error);
                                // Garder le placeholder visible
                            image.style.display = 'none';
                            placeholder.style.display = 'flex';
                        }
                        }
                    } else if (placeholder) {
                        // Si pas de titre, afficher quand même le placeholder
                        if (image) image.style.display = 'none';
                        placeholder.style.display = 'flex';
                    }
                    
                    // Ajouter l'événement de clic sur le titre
                    if (title) {
                        title.addEventListener('click', async function() {
                            const mangaTitle = this.dataset.mangaTitle;
                            if (mangaTitle) {
                                // Afficher un indicateur de chargement
                                const originalText = this.textContent;
                                this.style.opacity = '0.6';
                                this.style.cursor = 'wait';
                                
                                try {
                                    // Vérifier d'abord le cache
                                    const cacheKey = `manga_id_${mangaTitle.toLowerCase().trim()}`;
                                    const cachedId = localStorage.getItem(cacheKey);
                                    
                                    if (cachedId) {
                                        // Utiliser l'ID en cache immédiatement
                                        console.log(`✅ ID trouvé en cache pour ${mangaTitle}: ${cachedId}`);
                                        window.location.href = `anime-details.html?id=${cachedId}&type=manga`;
                                        return;
                                    }
                                    
                                    // Si pas en cache, chercher l'ID
                                    const mangaId = await searchMangaIdByTitle(mangaTitle);
                                    if (mangaId) {
                                        // Mettre en cache pour la prochaine fois (valide 30 jours)
                                        localStorage.setItem(cacheKey, mangaId);
                                        localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
                                        console.log(`✅ ID trouvé et mis en cache pour ${mangaTitle}: ${mangaId}`);
                                        window.location.href = `anime-details.html?id=${mangaId}&type=manga`;
                                    } else {
                                        // Fallback : redirection directe avec le titre (la page de détails gérera la recherche)
                                        console.log(`⚠️ ID non trouvé pour ${mangaTitle}, redirection avec titre`);
                                        window.location.href = `anime-details.html?search=${encodeURIComponent(mangaTitle)}&type=manga`;
                                    }
                                } catch (error) {
                                    console.error('Erreur lors de la recherche du manga:', error);
                                    // Redirection de fallback immédiate
                                    window.location.href = `anime-details.html?search=${encodeURIComponent(mangaTitle)}&type=manga`;
                                } finally {
                                    // Restaurer l'apparence du titre
                                    this.style.opacity = '1';
                                    this.style.cursor = 'pointer';
                                }
                            }
                        });
                    }
                }
            }
            
                } catch (error) {
            console.error('Erreur lors du chargement de l\'auteur de la semaine:', error);
            // Afficher un message d'erreur ou un auteur par défaut
            const container = document.getElementById('authorOfWeekContainer');
            if (container) {
                // Obtenir la traduction du type d'œuvre
                const tFn = window.t || (window.localization ? (key) => window.localization.get(key) : (key) => key);
                const workTypeTranslated = tFn('search.type.manga') || 'Manga';
                
                container.innerHTML = `
                    <div class="author-error">
                        <p>Impossible de charger l'auteur du jour. Veuillez réessayer plus tard.</p>
                    </div>
                    <div class="author-info">
                        <div class="author-name">Akira Toriyama</div>
                        <div class="author-description">Créateur de Dragon Ball, l'un des mangas les plus influents de l'histoire, et de Dr. Slump. Son style dynamique, son humour et ses personnages inoubliables ont marqué des générations de lecteurs et inspiré de nombreux auteurs à travers le monde.</div>
                    </div>
                    <div class="author-works">
                        <div class="work-card">
                            <div class="work-image-container">
                                <div class="work-image-placeholder">Dragon Ball</div>
                            </div>
                            <div class="work-info">
                                <h3 class="work-title">Dragon Ball</h3>
                                <p class="work-type">${workTypeTranslated}</p>
                                <p class="work-description">L'aventure épique de Son Goku à la recherche des Dragon Balls.</p>
                            </div>
                        </div>
                        <div class="work-card">
                            <div class="work-image-container">
                                <div class="work-image-placeholder">Dr. Slump</div>
                            </div>
                            <div class="work-info">
                                <h3 class="work-title">Dr. Slump</h3>
                                <p class="work-type">${workTypeTranslated}</p>
                                <p class="work-description">Une comédie absurde dans le village du Pingouin avec la petite robot Arale.</p>
                            </div>
                        </div>
                        <div class="work-card">
                            <div class="work-image-container">
                                <div class="work-image-placeholder">Sand Land</div>
                            </div>
                            <div class="work-info">
                                <h3 class="work-title">Sand Land</h3>
                                <p class="work-type">${workTypeTranslated}</p>
                                <p class="work-description">Un one-shot d'aventure dans un monde désertique.</p>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    // Exposer la fonction globalement
    window.loadAuthorOfWeek = loadAuthorOfWeek;

        // Fonction pour récupérer l'image d'un manga depuis l'API Jikan
    async function fetchMangaImage(mangaTitle) {
        try {
            // Ajouter un délai entre les requêtes pour éviter le rate limiting de l'API Jikan
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // Timeout de 8 secondes
            
            const response = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(mangaTitle)}&limit=1`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Vérifier si la réponse est OK
            if (!response.ok) {
                if (response.status === 429) {
                    console.warn(`Rate limit atteint pour ${mangaTitle}, utilisation du placeholder`);
                } else {
                    console.warn(`API Jikan retourne une erreur ${response.status} pour ${mangaTitle}`);
                }
                return null;
            }
            
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                const manga = data.data[0];
                // Essayer plusieurs formats d'images dans l'ordre de préférence
                const imageUrl = manga.images?.jpg?.large_image_url || 
                       manga.images?.jpg?.image_url || 
                       manga.images?.webp?.large_image_url || 
                       manga.images?.webp?.image_url;
                
                // Vérifier que l'URL n'est pas vide et n'est pas une image par défaut
                if (imageUrl && 
                    imageUrl !== 'https://cdn.myanimelist.net/img/sp/icon/apple-touch-icon-32.png' &&
                    imageUrl !== 'https://cdn.myanimelist.net/images/questionmark_50.gif' &&
                    !imageUrl.includes('questionmark') &&
                    imageUrl.startsWith('http')) {
                    return imageUrl;
                } else {
                    console.warn(`Aucune image valide disponible pour ${mangaTitle}`);
                }
            } else {
                console.warn(`Aucun résultat trouvé pour ${mangaTitle}`);
            }
        } catch (error) {
            // Ne pas logger les erreurs de timeout ou d'abort comme des erreurs critiques
            if (error.name === 'AbortError' || error.message === 'Timeout') {
                console.warn(`Timeout lors de la récupération de l'image pour ${mangaTitle}`);
            } else if (error.message?.includes('429') || error.message?.includes('rate limit')) {
                console.warn(`Rate limit atteint pour ${mangaTitle}, utilisation du placeholder`);
            } else {
                console.warn(`Erreur lors de la récupération de l'image pour ${mangaTitle}:`, error.message || error);
            }
        }
        return null;
    }

    // Fonction pour rechercher l'ID d'un manga par son titre (avec cache)
    async function searchMangaIdByTitle(mangaTitle) {
        try {
            // Pas de délai pour cette requête car c'est une action utilisateur directe
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // Timeout de 6 secondes
            
            const response = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(mangaTitle)}&limit=1`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status === 429) {
                    console.warn(`Rate limit atteint pour la recherche de ${mangaTitle}`);
                }
                return null;
            }
            
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                return data.data[0].mal_id;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn(`Timeout lors de la recherche de ${mangaTitle}`);
            } else {
            console.error('Erreur lors de la recherche du manga:', error);
            }
        }
        return null;
    }
    
    // Fonction pour nettoyer le cache des IDs et images de manga (appeler périodiquement)
    function cleanMangaIdCache() {
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 jours
        const keysToRemove = [];
        
        // Parcourir toutes les clés du localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                // Nettoyer le cache des IDs de manga
                if (key.startsWith('manga_id_') && key.endsWith('_timestamp')) {
                    const timestamp = parseInt(localStorage.getItem(key) || '0');
                    if (now - timestamp > maxAge) {
                        const mangaTitle = key.replace('manga_id_', '').replace('_timestamp', '');
                        keysToRemove.push(`manga_id_${mangaTitle}`);
                        keysToRemove.push(key);
                    }
                }
                // Nettoyer le cache des images de manga
                if (key.startsWith('manga_image_') && key.endsWith('_timestamp')) {
                    const timestamp = parseInt(localStorage.getItem(key) || '0');
                    if (now - timestamp > maxAge) {
                        const mangaTitle = key.replace('manga_image_', '').replace('_timestamp', '');
                        keysToRemove.push(`manga_image_${mangaTitle}`);
                        keysToRemove.push(key);
                    }
                }
            }
        }
        
        // Supprimer les clés expirées
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        if (keysToRemove.length > 0) {
            console.log(`🗑️ ${keysToRemove.length / 2} entrées de cache expirées supprimées`);
        }
    }
    
    // Nettoyer le cache au chargement de la page (une fois par session)
    if (!sessionStorage.getItem('cache_cleaned')) {
        cleanMangaIdCache();
        sessionStorage.setItem('cache_cleaned', 'true');
    }

    async function getMergedAccountsForHome() {
        const merged = new Map();

        const put = (entry) => {
            if (!entry || !entry.email) return;
            const email = String(entry.email).trim().toLowerCase();
            if (!email || !email.includes('@') || email.endsWith('@example.com')) return;
            const prev = merged.get(email) || {};
            merged.set(email, {
                email,
                username: entry.username || entry.pseudo || prev.username || null,
                name: entry.name || entry.displayName || prev.name || null,
                picture: entry.picture || prev.picture || null,
                avatar: entry.avatar || prev.avatar || null,
                provider: entry.provider || prev.provider || null,
                created_at: entry.created_at || entry.createdAt || prev.created_at || prev.createdAt || null,
                updated_at: entry.updated_at || entry.updatedAt || prev.updated_at || prev.updatedAt || null,
                country: entry.country || entry.continent || prev.country || null,
                verified: typeof entry.verified === 'boolean' ? entry.verified : prev.verified
            });
        };

        const localAccounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        localAccounts.forEach((acc) => put(acc));

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('profile_') || key.startsWith('profile_description_') || key.startsWith('profile_banner_')) continue;
            try {
                const raw = localStorage.getItem(key);
                if (!raw || (!raw.trim().startsWith('{') && !raw.trim().startsWith('['))) continue;
                const p = JSON.parse(raw);
                put({
                    email: p.email || key.replace('profile_', ''),
                    username: p.username || null,
                    name: p.name || null,
                    picture: p.picture || null,
                    avatar: p.avatar || p.customAvatar || null,
                    created_at: p.created_at || p.createdAt || null
                });
            } catch (e) { /* ignore */ }
        }

        // Source Firestore (meme source que la page admin)
        try {
            const mod = await import('./firebase-service.js?v=6febe22');
            if (mod && mod.profileAdminService && typeof mod.profileAdminService.listAllUserProfiles === 'function') {
                const remoteUsers = await mod.profileAdminService.listAllUserProfiles();
                if (Array.isArray(remoteUsers)) {
                    remoteUsers.forEach((u) => {
                        put({
                            email: u.email,
                            username: u.username || u.name || u.pseudo,
                            name: u.name,
                            avatar: u.avatar || null,
                            country: u.country || null,
                            created_at: u.created_at || u.createdAt || null,
                            updated_at: u.updated_at || u.updatedAt || null,
                            verified: u.verified === true
                        });
                    });
                }
            }
        } catch (e) {
            console.warn('Impossible de charger les profils Firestore pour l\'accueil:', e);
        }

        return Array.from(merged.values());
    }

    // Fonction pour charger les nouveaux utilisateurs
    async function loadNewUsers() {
        try {
            // Liste par défaut de faux utilisateurs (pour remplir si pas assez de vrais)
            const fakeUsersDefault = [
                { username: "OtakuFan2024", joinDate: "Il y a 2 jours", avatar: "🎌", stats: { animes: 12, mangas: 8 } },
                { username: "MangaCollector", joinDate: "Il y a 3 jours", avatar: "📚", stats: { animes: 30, mangas: 22, tierLists: 10 } },
                { username: "KawaiiDreamer", joinDate: "Il y a 4 jours", avatar: "💖", stats: { animes: 15, mangas: 9, tierLists: 4 } },
                { username: "WeebMaster", joinDate: "Il y a 5 jours", avatar: "🌟", stats: { animes: 25, mangas: 15, tierLists: 7 } },
                { username: "NinjaWarrior", joinDate: "Il y a 6 jours", avatar: "⚔️", stats: { animes: 22, mangas: 16, tierLists: 6 } },
                { username: "AnimeLover", joinDate: "Il y a 1 semaine", avatar: "", avatarType: "image", stats: { animes: 18, mangas: 12, tierLists: 5 } }
            ];
            
            // Récupérer les vrais utilisateurs (local + Firestore)
            const getDateMs = (value) => {
                if (!value) return 0;
                if (typeof value === 'number') return value;
                const ms = Date.parse(value);
                return Number.isNaN(ms) ? 0 : ms;
            };
            const realAccounts = (await getMergedAccountsForHome())
                .filter(acc => (acc.username || acc.name) && acc.email)
                .sort((a, b) => getDateMs(b.created_at || b.createdAt || b.updated_at || b.updatedAt) - getDateMs(a.created_at || a.createdAt || a.updated_at || a.updatedAt));
            
            // Charger les stats de collection (Firebase + fallback localStorage) pour chaque utilisateur
            let collectionService = null;
            let avatarService = null;
            try {
                const mod = await import('./firebase-service.js?v=6febe22');
                collectionService = mod.collectionService;
                avatarService = mod.avatarService || null;
            } catch (e) { /* ignore */ }
            
            const realUsers = await Promise.all(realAccounts.map(async (acc) => {
                const avatarKey = 'avatar_' + acc.email;
                let avatarUrl = localStorage.getItem(avatarKey);
                const profile = JSON.parse(localStorage.getItem('profile_' + acc.email) || '{}');
                let avatar = avatarUrl || profile.customAvatar || profile.avatar || profile.picture || acc.avatar || acc.picture;
                if (!avatar && avatarService && typeof avatarService.getAvatar === 'function') {
                    try {
                        const remoteAvatar = await avatarService.getAvatar(acc.email);
                        if (remoteAvatar) {
                            avatar = remoteAvatar;
                            try { localStorage.setItem(avatarKey, remoteAvatar); } catch (e) { /* ignore */ }
                        }
                    } catch (e) { /* ignore */ }
                }
                // Améliorer la qualité : Google photos +sz=400, ui-avatars +size=400
                if (avatar && typeof avatar === 'string') {
                    if (avatar.includes('googleusercontent')) avatar = avatar.replace(/=s\d+(-c)?/g, '=s400-c');
                    else if (avatar.includes('ui-avatars.com') && !avatar.includes('size=')) avatar = avatar + (avatar.includes('?') ? '&' : '?') + 'size=400';
                }
                let stats = { animes: 0, mangas: 0 };
                try {
                    let userList = [];
                    if (collectionService) userList = await collectionService.getAllItems(acc.email);
                    else userList = JSON.parse(localStorage.getItem('user_list_' + acc.email) || '[]');
                    const animeTypes = ['tv', 'ova', 'ona', 'movie', 'special', 'music', 'anime'];
                    const mangaTypes = ['manga', 'manhwa', 'manhua', 'novel', 'one shot', 'doujin', 'doujinshi'];
                    userList.forEach(item => {
                        const t = (item.type || '').toLowerCase();
                        if (animeTypes.includes(t) || t === 'film') stats.animes++;
                        else if (mangaTypes.includes(t)) stats.mangas++;
                        else stats.animes++; // fallback
                    });
                } catch (e) { /* ignore */ }
                const verifiedUsers = JSON.parse(localStorage.getItem('verified_users') || '[]');
                const isVerified = acc.verified === true || verifiedUsers.includes(acc.email);
                // Comptes Google : n'afficher que le pseudo enregistré, pas un éventuel "name" type nom complet
                let displayUsername = acc.username;
                if (!displayUsername && acc.provider !== 'google') {
                    displayUsername = acc.name;
                }
                if (!displayUsername) {
                    displayUsername = acc.email?.split('@')[0] || 'Utilisateur';
                }
                return {
                    username: displayUsername,
                    email: acc.email,
                    avatar: avatar || "🌸",
                    avatarType: avatar ? "image" : "emoji",
                    stats,
                    isVerified
                };
            }));
            
            // Fusionner : vrais utilisateurs en premier, puis fakes pour remplir jusqu'à 6
            let newUsers = [...realUsers];
            const existingUsernames = new Set(realUsers.map(u => u.username?.toLowerCase()));
            for (const fake of fakeUsersDefault) {
                if (newUsers.length >= 6) break;
                if (!existingUsernames.has(fake.username?.toLowerCase())) {
                    newUsers.push(fake);
                    existingUsernames.add(fake.username?.toLowerCase());
                }
            }
            newUsers = newUsers.slice(0, 6);
            
            // Obtenir la fonction de traduction
            const tFn = window.t || (window.localization ? (key) => window.localization.get(key) : (key) => key);
            
            // Obtenir les traductions pour les labels
            const labelAnimes = tFn('home.new_users_stat_animes');
            const labelMangas = tFn('home.new_users_stat_mangas');
            
            // Créer le HTML pour les nouveaux utilisateurs
            const usersHTML = `
                <div class="new-users-grid">
                    ${newUsers.map(user => {
                        const profileUrl = user.email ? 'user-profile.html?user=' + encodeURIComponent(user.email) : '#';
                        const cardTag = user.email ? 'a' : 'div';
                        const cardAttrs = user.email ? ' href="' + profileUrl + '" style="text-decoration: none; color: inherit;"' : '';
                        return `
                        <${cardTag}${cardAttrs} class="new-user-card">
                            <div class="new-user-avatar" style="width: 175px; height: 175px; margin: 0 auto 1.5rem auto; display: flex; align-items: center; justify-content: center; aspect-ratio: 1/1; min-width: 175px; min-height: 175px; max-width: 175px; max-height: 175px; overflow: hidden;">
                                ${user.avatarType === 'image' 
                                    ? `<div style="width: 100%; height: 100%; border-radius: 50%; background: white; overflow: hidden; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(255,255,255,0.6); border: 3px solid white;">
                                        <img src="${user.avatar}" alt="${user.username}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; border-radius: 50%; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" onerror="(function(img) { img.style.display='none'; const p=img.parentElement; if(p) { const s=document.createElement('span'); s.style.cssText='font-size:3rem;color:white;'; s.textContent='🌸'; p.appendChild(s); } })(this);">
                                    </div>`
                                    : `<div style="width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, #00c45d, #00e06d); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0, 196, 93, 0.4);">
                                        <span style="font-size: 4rem; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">${user.avatar}</span>
                                    </div>`
                                }
                            </div>
                            <div class="new-user-username">
                                <span>${user.username}</span>
                                ${user.isVerified ? '<span class="new-user-verified-badge" title="Compte certifié"><i class="fas fa-check"></i></span>' : ''}
                            </div>
                            <div class="new-user-stats">
                                <div class="new-user-stat">
                                    <span class="new-user-stat-value">${user.stats.animes}</span>
                                    <span class="new-user-stat-label">${labelAnimes}</span>
                                </div>
                                <div class="new-user-stat">
                                    <span class="new-user-stat-value">${user.stats.mangas}</span>
                                    <span class="new-user-stat-label">${labelMangas}</span>
                                </div>
                            </div>
                        </${cardTag}>
                    `;
                    }).join('')}
                </div>
            `;
            
            // Insérer le HTML dans le conteneur
            const container = document.getElementById('newUsersContainer');
            if (container) {
                container.innerHTML = usersHTML;
            }
            
            // Sauvegarder la liste mise à jour dans localStorage
            localStorage.setItem('newUsers', JSON.stringify(newUsers));
            
        } catch (error) {
            console.error('Erreur lors du chargement des nouveaux utilisateurs:', error);
            // Afficher un message d'erreur (traduit)
            const container = document.getElementById('newUsersContainer');
            if (container) {
                const tFn = window.t || (window.localization ? (key) => window.localization.get(key) : (key) => key);
                const errorText = tFn('home.new_users_error');
                const retryText = tFn('home.new_users_error_retry');
                container.innerHTML = `
                    <div style="text-align: center; color: #a0a0a0; padding: 2rem;">
                        <p>${errorText}</p>
                        <p>${retryText}</p>
                    </div>
                `;
            }
        }
    }
    
    // Exposer la fonction globalement
    window.loadNewUsers = loadNewUsers;
    
    // Fonction pour ajouter un nouvel utilisateur
    function addNewUser(username) {
        try {
            // Récupérer la liste actuelle des utilisateurs
            let newUsers = JSON.parse(localStorage.getItem('newUsers')) || [];
            
            // Liste d'avatars disponibles pour la sélection aléatoire
            const availableAvatars = [
                "🎌", "🌟", "🌸", "📚", "💖", "⚔️", "👑", "🐉", "🌙", "🤖", "🎭", "🔥",
                "🎨", "🎪", "🎯", "🎲", "🎸", "🎺", "🎻", "🎹", "🎤", "🎧", "🎮", "🎲"
            ];
            
            // Sélectionner un avatar aléatoire
            const randomAvatar = availableAvatars[Math.floor(Math.random() * availableAvatars.length)];
            
            // Créer le nouvel utilisateur avec un avatar aléatoire
            // Test spécial pour "AnimeLover" avec une photo Nezuko
            let userAvatar = randomAvatar;
            if (username === "AnimeLover") {
                userAvatar = "🩸"; // Représente Nezuko (sang/onigiri)
                userAvatar = "🩸"; // Représente Nezuko (sang/onigiri)
            }
            
            const newUser = {
                username: username,
                joinDate: "Aujourd'hui",
                avatar: userAvatar,
                stats: {
                    animes: 0,
                        mangas: 0
                }
            };
            
            // Ajouter le nouvel utilisateur au début de la liste (plus récent)
            newUsers.unshift(newUser);
            
            // Garder seulement les 6 premiers utilisateurs (les plus récents)
            if (newUsers.length > 6) {
                newUsers = newUsers.slice(0, 6);
            }
            
            // Sauvegarder la liste mise à jour
            localStorage.setItem('newUsers', JSON.stringify(newUsers));
            
            console.log('Nouvel utilisateur ajouté:', newUser);
            
        } catch (error) {
            console.error('Erreur lors de l\'ajout du nouvel utilisateur:', error);
        }
    }

    // Fonction pour charger le quiz du jour
    async function loadDailyQuiz() {
        try {
            const response = await fetch('../data/questions.json');
            const questions = await response.json();
            
            // Sélectionner une question basée sur la date du jour (pour avoir la même question toute la journée)
            const today = new Date();
            const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
            const selectedQuestionIndex = dayOfYear % questions.length;
            const selectedQuestion = questions[selectedQuestionIndex];
            
            // Vérifier si l'utilisateur a déjà répondu à cette question aujourd'hui
            const quizKey = `quiz_${dayOfYear}_${selectedQuestionIndex}`;
            const savedQuizData = localStorage.getItem(quizKey);
            let hasAnswered = false;
            let userAnswer = null;
            let isCorrect = false;
            
            if (savedQuizData) {
                const quizData = JSON.parse(savedQuizData);
                hasAnswered = true;
                userAnswer = quizData.userAnswer;
                isCorrect = quizData.isCorrect;
            }
            
            // Traduire la question et les choix
            const currentLang = localStorage.getItem('mangaWatchLanguage') || 'fr';
            console.log(`🌍 Traduction du quiz en ${currentLang}`);
            
            let translatedQuestion = selectedQuestion.question;
            let translatedChoices = [...selectedQuestion.choices];
            let translatedCorrectAnswer = selectedQuestion.choices[selectedQuestion.answer];
            
            if (currentLang !== 'fr' && window.translateWithCache) {
                try {
                    // Traduire la question
                    console.log(`🔄 Traduction de la question: "${translatedQuestion.substring(0, 50)}..."`);
                    translatedQuestion = await window.translateWithCache(selectedQuestion.question, currentLang);
                    console.log(`✅ Question traduite: "${translatedQuestion.substring(0, 50)}..."`);
                    
                    // Traduire tous les choix en parallèle
                    console.log(`🔄 Traduction des ${selectedQuestion.choices.length} choix...`);
                    translatedChoices = await Promise.all(
                        selectedQuestion.choices.map(async (choice, index) => {
                            // Liste des noms japonais qui ne doivent pas être traduits (sauf en japonais)
                            const japaneseNames = [
                                'Isaac Netero', 'Don Freecss', 'Zigg Zoldyck', 'Maha Zoldyck',
                                'Edward Newgate', 'Portgas D. Ace', 'Marshall D. Teach', 'Rocks D. Xebec',
                                'Hideki Ryuga', 'Nate River', 'Mello', 'L Lawliet',
                                'King Bradley', 'Van Hohenheim', 'Scar', 'Maes Hughes',
                                'Senju', 'Aburame', 'Hyuga', 'Uchiha',
                                'Norman', 'Emma', 'Ray', 'Isabella', 'Ging Freecss', 'Pariston Hill', 'Silva Zoldyck',
                                'Gol D. Roger', 'Shanks', 'Barbe Noire', 'Ace', 'Sabo', 'Luffy', 'Zoro', 'Sanji',
                                'Naruto', 'Sasuke', 'Kakashi', 'Itachi', 'Minato', 'Kushina', 'Gaara', 'Killer Bee',
                                'Goku', 'Vegeta', 'Piccolo', 'Raditz', 'Bardock', 'Trunks', 'Goten', 'Gohan',
                                'Light Yagami', 'L', 'Near', 'Mello', 'Ryuk', 'Rem', 'Misa Amane', 'Takada',
                                'Edward Elric', 'Alphonse Elric', 'Winry', 'Trisha', 'Van Hohenheim',
                                'Ichigo Kurosaki', 'Rukia', 'Orihime', 'Byakuya Kuchiki', 'Kenpachi Zaraki',
                                'Natsu', 'Gray', 'Lucy', 'Erza', 'Mirajane', 'Laxus', 'Happy', 'Carla',
                                'Tanjiro', 'Nezuko', 'Giyu Tomioka', 'Zenitsu', 'Inosuke',
                                'Deku', 'All Might', 'Bakugo', 'Todoroki', 'Toshinori Yagi',
                                'Eren Jaeger', 'Mikasa', 'Armin', 'Levi', 'Erwin Smith', 'Ymir Fritz',
                                'Jotaro Kujo', 'Star Platinum', 'The World', 'Crazy Diamond', 'Killer Queen',
                                'Gon', 'Killua', 'Kurapika', 'Leorio', 'Hisoka', 'Ging Freecss'
                            ];
                            
                            // Si c'est un nom japonais et qu'on n'est pas en japonais, on garde le nom original
                            if (japaneseNames.includes(choice) && currentLang !== 'ja') {
                                console.log(`⏭️ Nom japonais conservé: "${choice}"`);
                                return choice;
                            }
                            
                            const translated = await window.translateWithCache(choice, currentLang);
                            console.log(`✅ Choix ${index + 1} traduit: "${choice}" → "${translated}"`);
                            return translated;
                        })
                    );
                    
                    // Traduire aussi la bonne réponse pour l'affichage
                    translatedCorrectAnswer = translatedChoices[selectedQuestion.answer];
                    console.log(`✅ Tous les choix traduits avec succès`);
                } catch (error) {
                    console.error('❌ Erreur lors de la traduction du quiz:', error);
                    // En cas d'erreur, utiliser les textes originaux
                }
            }
            
            // Obtenir les traductions pour les messages
            const tFn = window.t || (window.localization ? (key) => window.localization.get(key) : (key) => key);
            const validateText = tFn('home.quiz_validate');
            const correctText = tFn('home.quiz_correct');
            const incorrectText = tFn('home.quiz_incorrect');
            const correctAnswerText = tFn('home.quiz_correct_answer');
            const progressText = tFn('home.quiz_question_progress').replace('{current}', selectedQuestionIndex + 1).replace('{total}', questions.length);
            
            // Créer le HTML pour le quiz
            const quizHTML = `
                <div class="quiz-card">
                    <div class="quiz-question">${translatedQuestion}</div>
                    <div class="quiz-choices">
                        ${translatedChoices.map((choice, index) => `
                            <div class="quiz-choice ${hasAnswered && index === userAnswer ? (isCorrect ? 'correct' : 'incorrect') : ''} ${hasAnswered && index === selectedQuestion.answer ? 'correct' : ''}" data-index="${index}">
                                ${choice}
                            </div>
                        `).join('')}
                    </div>
                    ${!hasAnswered ? `<button class="quiz-submit-btn" id="quizSubmitBtn">${validateText}</button>` : ''}
                    ${hasAnswered ? `<div class="quiz-result ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? `${correctText} 🎉` : `${incorrectText} ${correctAnswerText} ${translatedCorrectAnswer}`}</div>` : ''}
                    <div class="quiz-progress">${progressText}</div>
                </div>
            `;
            
            // Insérer le HTML dans le conteneur
            const container = document.getElementById('quizContainer');
            if (container) {
                container.innerHTML = quizHTML;
                
                // Stocker les données traduites pour les utiliser dans les gestionnaires d'événements
                container.dataset.translatedChoices = JSON.stringify(translatedChoices);
                container.dataset.translatedQuestion = translatedQuestion;
                container.dataset.correctAnswerIndex = selectedQuestion.answer;
                
                // Si l'utilisateur n'a pas encore répondu, ajouter les gestionnaires d'événements
                if (!hasAnswered) {
                    const choices = container.querySelectorAll('.quiz-choice');
                    const submitBtn = container.querySelector('#quizSubmitBtn');
                    let selectedChoice = null;
                    
                    // Gestionnaire pour la sélection des choix
                    choices.forEach(choice => {
                        choice.addEventListener('click', function() {
                            // Désélectionner tous les choix
                            choices.forEach(c => c.classList.remove('selected'));
                            // Sélectionner le choix cliqué
                            this.classList.add('selected');
                            selectedChoice = parseInt(this.dataset.index);
                            // Activer le bouton de validation
                            submitBtn.disabled = false;
                        });
                    });
                    
                    // Gestionnaire pour la soumission
                    submitBtn.addEventListener('click', async function() {
                        if (selectedChoice === null) return;
                        
                        // Désactiver le bouton
                        this.disabled = true;
                        
                        // Vérifier la réponse
                        const isCorrect = selectedChoice === selectedQuestion.answer;
                        
                        // Sauvegarder la réponse dans le localStorage
                        const quizData = {
                            userAnswer: selectedChoice,
                            isCorrect: isCorrect,
                            timestamp: Date.now()
                        };
                        localStorage.setItem(quizKey, JSON.stringify(quizData));
                        
                        // Afficher les résultats
                        choices.forEach((choice, index) => {
                            if (index === selectedQuestion.answer) {
                                choice.classList.add('correct');
                            } else if (index === selectedChoice && !isCorrect) {
                                choice.classList.add('incorrect');
                            }
                        });
                        
                        // Afficher le message de résultat (traduit)
                        const resultDiv = document.createElement('div');
                        resultDiv.className = `quiz-result ${isCorrect ? 'correct' : 'incorrect'}`;
                        
                        // Obtenir les traductions
                        const tFn = window.t || (window.localization ? (key) => window.localization.get(key) : (key) => key);
                        const correctText = tFn('home.quiz_correct');
                        const incorrectText = tFn('home.quiz_incorrect');
                        const correctAnswerText = tFn('home.quiz_correct_answer');
                        
                        // Récupérer les choix traduits depuis le dataset
                        let correctAnswerTranslated = selectedQuestion.choices[selectedQuestion.answer];
                        try {
                            const storedChoices = container.dataset.translatedChoices;
                            if (storedChoices) {
                                const parsedChoices = JSON.parse(storedChoices);
                                correctAnswerTranslated = parsedChoices[selectedQuestion.answer] || correctAnswerTranslated;
                            }
                        } catch (e) {
                            console.warn('Impossible de récupérer les choix traduits:', e);
                        }
                        
                        resultDiv.textContent = isCorrect ? 
                            `${correctText} 🎉` : 
                            `${incorrectText} ${correctAnswerText} ${correctAnswerTranslated}`;
                        
                        // Remplacer le bouton par le résultat
                        this.style.display = 'none';
                        this.parentNode.insertBefore(resultDiv, this);
                        
                        // Désactiver tous les choix
                        choices.forEach(choice => {
                            choice.style.cursor = 'default';
                            choice.onclick = null;
                        });
                        
                        // Recharger la page pour afficher l'état final
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    });
                    
                    // Désactiver le bouton au début
                    submitBtn.disabled = true;
                } else {
                    // Si l'utilisateur a déjà répondu, désactiver tous les choix
                    const choices = container.querySelectorAll('.quiz-choice');
                    choices.forEach(choice => {
                        choice.style.cursor = 'default';
                        choice.onclick = null;
                    });
                }
            }
            
        } catch (error) {
            console.error('Erreur lors du chargement du quiz du jour:', error);
            // Afficher un message d'erreur (traduit)
            const container = document.getElementById('quizContainer');
            if (container) {
                const tFn = window.t || (window.localization ? (key) => window.localization.get(key) : (key) => key);
                const errorText = tFn('home.quiz_error');
                container.innerHTML = `
                    <div class="quiz-card">
                        <div class="quiz-question">${errorText}</div>
                        <div class="quiz-progress">${tFn('common.loading')}</div>
                    </div>
                `;
            }
        }
    }
    
    // Exposer la fonction globalement
    window.loadDailyQuiz = loadDailyQuiz;
    
    document.addEventListener('languageChanged', async function() {
        console.log('🔄 Langue changée, rechargement de toutes les sections...');
        homeSectionsLoadStarted = false;
        await loadAllDynamicSections();
        homeSectionsLoadStarted = true;
    });

    // Fonction pour recharger toutes les sections dynamiques
    async function reloadDynamicSections() {
        console.log('🔄 Rechargement des sections dynamiques...');
        try {
            // Vérifier que les conteneurs existent
            const authorContainer = document.getElementById('authorOfWeekContainer');
            const quizContainer = document.getElementById('quizContainer');
            const usersContainer = document.getElementById('newUsersContainer');
            
            console.log('🔍 Vérification des conteneurs:', {
                author: !!authorContainer,
                quiz: !!quizContainer,
                users: !!usersContainer
            });
            
            // Attendre un peu pour s'assurer que le DOM est prêt
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Recharger l'auteur de la semaine
            if (typeof window.loadAuthorOfWeek === 'function') {
                console.log('📚 Chargement de l\'auteur de la semaine...');
                await window.loadAuthorOfWeek();
                console.log('✅ Auteur de la semaine rechargé');
            } else {
                console.error('❌ loadAuthorOfWeek n\'est pas disponible');
            }
            
            // Recharger le quiz du jour
            if (typeof window.loadDailyQuiz === 'function') {
                console.log('📚 Chargement du quiz du jour...');
                await window.loadDailyQuiz();
                console.log('✅ Quiz du jour rechargé');
            } else {
                console.error('❌ loadDailyQuiz n\'est pas disponible');
            }
            
            // Recharger les nouveaux utilisateurs
            if (typeof window.loadNewUsers === 'function') {
                console.log('📚 Chargement des nouveaux utilisateurs...');
                await window.loadNewUsers();
                console.log('✅ Nouveaux utilisateurs rechargés');
            } else {
                console.error('❌ loadNewUsers n\'est pas disponible');
            }
            
            console.log('✅ Toutes les sections dynamiques ont été rechargées');
        } catch (error) {
            console.error('❌ Erreur lors du rechargement des sections:', error);
            console.error('Stack:', error.stack);
        }
    }
    
    // Exposer la fonction globalement
    window.reloadDynamicSections = reloadDynamicSections;

    // Popup auth : uniquement quand l'utilisateur tente d'interagir (pas à l'arrivée)
    if (afficherPopup) {
        console.log('ℹ️ Popup auth en attente d\'interaction utilisateur');
        setupAuthPopupOnInteraction();
    } else {
        console.log('✅ Utilisateur connecté ou mode dev — pas de popup auth');
    }

    window.forceShowAuthPopup = function() {
        if (typeof showAuthPopup === 'function') showAuthPopup();
    };

    // Charger les sections dès que les fonctions sont définies dans ce handler
    setTimeout(function() {
        initHomeDynamicSections().catch(function(err) {
            console.error('❌ initHomeDynamicSections:', err);
        });
    }, 0);
}); 