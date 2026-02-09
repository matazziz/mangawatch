// Gestion du profil utilisateur public
// Variable globale pour stocker l'email de l'utilisateur consulté
let viewedUserEmail = null;

// Réappliquer la traduction des synopsis quand des cartes sont ajoutées (page utilisateur)
(function() {
    function scheduleTranslateSynopses() {
        if (window._userProfileTranslateSynopsesTimer) clearTimeout(window._userProfileTranslateSynopsesTimer);
        window._userProfileTranslateSynopsesTimer = setTimeout(function() {
            window._userProfileTranslateSynopsesTimer = null;
            if (typeof window.translateSynopses === 'function') {
                window.translateSynopses(localStorage.getItem('mangaWatchLanguage') || 'fr');
            }
        }, 650);
    }
    function hasSynopsisEl(node) {
        if (!node || node.nodeType !== 1) return false;
        if (node.classList && (node.classList.contains('content-synopsis') || node.classList.contains('profile-card-synopsis'))) return true;
        return node.querySelector && node.querySelector('.content-synopsis, .profile-card-synopsis');
    }
    function setupUserProfileSynopsisObserver() {
        if (window._userProfileSynopsisObserverSetup) return;
        window._userProfileSynopsisObserverSetup = true;
        var observer = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    if (hasSynopsisEl(added[j])) {
                        scheduleTranslateSynopses();
                        return;
                    }
                }
            }
        });
        if (document.body) observer.observe(document.body, { childList: true, subtree: true });
        else document.addEventListener('DOMContentLoaded', function() { observer.observe(document.body, { childList: true, subtree: true }); });
    }
    if (document.body) setupUserProfileSynopsisObserver();
    else document.addEventListener('DOMContentLoaded', setupUserProfileSynopsisObserver);
})();

// --- Règle "un seul par série" dans le Top 10 (comme le Top 10 perso) ---
// Extraire le titre de base (sans saison/partie) pour comparer les séries
function extractBaseTitleForSeries(title, contentType) {
    if (!title || typeof title !== 'string') return title || '';
    const ct = (contentType || 'anime').toLowerCase();
    if (ct !== 'anime' && ct !== 'manga' && ct !== 'film') return title.trim();
    let base = title.trim()
        .replace(/\s+[Ss]eason\s+\d+.*$/gi, '').replace(/\s+[Ss]aison\s+\d+.*$/gi, '')
        .replace(/\s+[Pp]art\s+\d+.*$/gi, '').replace(/\s+[Pp]artie\s+\d+.*$/gi, '')
        .replace(/\s+[Ss]\d+$/g, '').replace(/\s+[Ss]\s+\d+$/g, '')
        .replace(/\s*\d+[nrst][dht]\s*[Ss]eason/gi, '').replace(/\s*\d+[èe]me\s*[Ss]aison/gi, '')
        .replace(/:\s+[Ss]eason\s+\d+.*$/gi, '').replace(/:\s+[Ss]aison\s+\d+.*$/gi, '')
        .replace(/:\s+[Pp]art\s+\d+.*$/gi, '').replace(/:\s+[Pp]artie\s+\d+.*$/gi, '')
        .replace(/\s+[Tt]he\s+[Ff]inal\s+[Ss]eason/gi, '').replace(/\s+[Ff]inal\s+[Ss]eason/gi, '')
        .replace(/\s+/g, ' ').trim().replace(/:\s*$/, '').trim();
    return base || title.trim();
}

function areTitlesSameSeries(title1, title2, contentType) {
    if (!title1 || !title2) return false;
    const ct = (contentType || 'anime').toLowerCase();
    if (ct !== 'anime' && ct !== 'manga' && ct !== 'film') return false;
    const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    const base1 = norm(extractBaseTitleForSeries(title1, ct));
    const base2 = norm(extractBaseTitleForSeries(title2, ct));
    if (base1 === base2 && base1.length > 0) return true;
    const minLen = 5;
    if (base1.length >= minLen && base2.length >= minLen && (base1.startsWith(base2) || base2.startsWith(base1))) return true;
    return false;
}

// Filtrer le Top 10 pour n'afficher qu'un seul par série (premier gardé, doublons remplacés par null)
function filterTop10OnePerSeries(top10Array) {
    if (!Array.isArray(top10Array) || top10Array.length === 0) return top10Array;
    const result = top10Array.slice();
    for (let i = 0; i < result.length; i++) {
        const item = result[i];
        if (!item) continue;
        const ct = (item.contentType || 'anime').toLowerCase();
        if (ct !== 'anime' && ct !== 'manga' && ct !== 'film') continue;
        const title = item.titre || item.title || item.titleEnglish || item.name || '';
        for (let j = 0; j < i; j++) {
            const prev = result[j];
            if (!prev) continue;
            const prevCt = (prev.contentType || 'anime').toLowerCase();
            const prevTitle = prev.titre || prev.title || prev.titleEnglish || prev.name || '';
            if (String(item.id) === String(prev.id)) { result[i] = null; break; }
            if (areTitlesSameSeries(title, prevTitle, ct)) {
                result[i] = null;
                break;
            }
        }
    }
    return result;
}

// Fonction pour générer la clé du Top 10 (copiée depuis profile-anime-cards.js)
function getUserTop10Key(user, genre = null, type = null) {
    let key = 'user_top10_' + user.email;
    
    // IMPORTANT: L'ordre est type puis genre pour être cohérent avec l'ancienne logique
    if (type && typeof type === 'string' && type.trim() !== '') {
        key += '_' + type.toLowerCase();
    }
    
    if (genre && typeof genre === 'string' && genre.trim() !== '') {
        // Nettoyer la clé de genre : remplacer espaces et virgules par des underscores
        key += '_' + genre.toLowerCase().replace(/\s+/g, '_').replace(/,/g, '_');
    }
    
    return key;
}

// Fonction pour charger le Top 10 d'un utilisateur (version pour page publique)
async function getUserTop10(user, genre = null, type = null) {
    const finalType = type || 'anime';
    
    // IMPORTANT: Si un genre est spécifié, charger depuis localStorage d'abord
    // car les Top 10 par genre sont stockés dans localStorage, pas dans Firebase
    if (genre && typeof genre === 'string' && genre.trim() !== '') {
        const top10Key = getUserTop10Key(user, genre, finalType);
        try {
            const stored = localStorage.getItem(top10Key);
            if (stored) {
                const top10 = JSON.parse(stored);
                // S'assurer que c'est un tableau de 10 éléments
                while (top10.length < 10) {
                    top10.push(null);
                }
                console.log(`📊 Top 10 chargé depuis localStorage pour genre: ${genre}, type: ${finalType}, utilisateur: ${user.email}`);
                return top10.slice(0, 10);
            } else {
                // Si aucun Top 10 spécifique n'existe pour ce genre, retourner un tableau vide
                console.log(`📊 Aucun Top 10 trouvé dans localStorage pour genre: ${genre}, type: ${finalType}, utilisateur: ${user.email}`);
                return new Array(10).fill(null);
            }
        } catch (err) {
            console.error('❌ Erreur lors du chargement du top 10 depuis localStorage:', err);
            return new Array(10).fill(null);
        }
    }
    
    // Si aucun genre n'est spécifié, charger depuis Firebase (Top 10 global)
    if (typeof window.firebaseTop10Service !== 'undefined' && window.firebaseTop10Service) {
        try {
            const top10Data = await window.firebaseTop10Service.getTop10(user.email);
            // Convertir en tableau de 10 éléments avec null pour les emplacements vides
            const top10 = new Array(10).fill(null);
            for (const item of top10Data) {
                // Filtrer par type si spécifié
                if (!type || item.contentType === type) {
                    const rang = item.rang || 1;
                    if (rang >= 1 && rang <= 10) {
                        top10[rang - 1] = {
                            id: item.id,
                            titre: item.titre,
                            title: item.titre,
                            name: item.titre,
                            contentType: item.contentType,
                            image: item.image,
                            synopsis: item.synopsis,
                            genres: item.genres || [],
                            score: item.score || 0
                        };
                    }
                }
            }
            return top10;
        } catch (err) {
            console.error('❌ Erreur lors du chargement du top 10 depuis Firebase:', err);
        }
    }
    
    // Fallback vers localStorage si Firebase n'est pas disponible (pour Top 10 global)
    const top10Key = getUserTop10Key(user, null, finalType);
    try {
        const stored = localStorage.getItem(top10Key);
        if (stored) {
            const top10 = JSON.parse(stored);
            // S'assurer que c'est un tableau de 10 éléments
            while (top10.length < 10) {
                top10.push(null);
            }
            return top10.slice(0, 10);
        }
    } catch (err) {
        console.error('❌ Erreur lors du chargement du top 10 depuis localStorage:', err);
    }
    // Fallback vers tableau vide si rien n'est trouvé
    return new Array(10).fill(null);
}

// Résoudre un pseudo en email (accounts.username ou profile.name)
function resolvePseudoToEmail(pseudo) {
    if (!pseudo || typeof pseudo !== 'string') return null;
    const p = pseudo.trim().toLowerCase();
    const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
    const byUsername = accounts.find(function(acc) {
        return (acc.username || acc.name || '').toString().toLowerCase() === p;
    });
    if (byUsername && byUsername.email) return byUsername.email;
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('profile_') === 0) {
            try {
                var prof = JSON.parse(localStorage.getItem(k) || '{}');
                var name = (prof.name || prof.username || '').toString().toLowerCase();
                if (name === p) return k.replace(/^profile_/, '');
            } catch (e) { /* ignorer */ }
        }
    }
    return null;
}

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    viewedUserEmail = urlParams.get('user');
    const pseudoParam = urlParams.get('pseudo');
    
    if (!viewedUserEmail && pseudoParam) {
        viewedUserEmail = resolvePseudoToEmail(pseudoParam);
    }
    
    if (!viewedUserEmail) {
        showError('Aucun utilisateur spécifié');
        return;
    }
    
    // Charger les données de l'utilisateur
    loadUserProfile(viewedUserEmail);
    
    // Gérer les onglets
    setupTabs();
    
    // Gérer les filtres de collection
    setupCollectionFilters();
});

function showError(message) {
    document.getElementById('profile-content').style.display = 'none';
    const errorDiv = document.getElementById('error-message');
    errorDiv.style.display = 'block';
    errorDiv.querySelector('p').textContent = message;
}

function loadUserProfile(userEmail) {
    // Vérifier si l'utilisateur est banni
    const bannedUsers = JSON.parse(localStorage.getItem('banned_users') || '[]');
    const isBanned = bannedUsers.some(b => b.email === userEmail);
    if (isBanned) {
        showError('Ce profil n\'est pas disponible');
        return;
    }
    
    // Vérifier si l'utilisateur est bloqué par l'utilisateur actuel
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (currentUser && currentUser.email) {
        const blockedUsers = JSON.parse(localStorage.getItem('blocked_users_' + currentUser.email) || '[]');
        if (blockedUsers.includes(userEmail)) {
            showError('Ce profil n\'est pas disponible');
            return;
        }
    }
    
    // Charger le profil depuis localStorage
    const profileData = localStorage.getItem('profile_' + userEmail);
    let user = null;
    
    if (profileData) {
        try {
            user = JSON.parse(profileData);
        } catch (e) {
            console.error('Erreur lors du chargement du profil:', e);
        }
    }
    
    // Si le profil n'existe pas dans profile_, essayer de trouver dans d'autres endroits
    if (!user) {
        showError('Utilisateur introuvable');
        return;
    }
    
    // S'assurer que le profil a bien le pays et la description depuis les autres sources
    const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
    const account = accounts.find(acc => acc.email === userEmail);
    if (!user.country && (account?.country || account?.continent)) {
        user.country = account.country || account.continent;
    }
    if (!user.continent && account?.continent) {
        user.continent = account.continent;
    }
    
    if (!user.description) {
        const descriptionKey = 'profile_description_' + userEmail;
        const description = localStorage.getItem(descriptionKey);
        if (description) {
            user.description = description;
        }
    }
    
    // Afficher les informations du profil
    displayProfileInfo(user, userEmail);
    
    // Charger la bannière de l'utilisateur
    loadUserBanner(userEmail);
    
    // Charger Anime & Manga par défaut (onglet affiché en premier sur le profil utilisateur)
    loadUserAnimeNotes();
}

function displayProfileInfo(user, userEmail) {
    const profileAvatar = document.getElementById('profile-avatar');
    const userName = document.getElementById('user-name');
    
    // Afficher l'avatar
    const avatarKey = 'avatar_' + userEmail;
    const storedAvatar = localStorage.getItem(avatarKey);
    
    if (profileAvatar) {
        if (storedAvatar) {
            profileAvatar.src = storedAvatar;
        } else if (user.customAvatar) {
            profileAvatar.src = user.customAvatar;
        } else if (user.originalAvatar) {
            profileAvatar.src = user.originalAvatar;
        } else if (user.picture) {
            profileAvatar.src = user.picture;
        } else {
            profileAvatar.src = '';
        }
    }
    
    // Afficher le nom avec le badge certifié
    const userNameText = document.getElementById('user-name-text');
    const verifiedBadge = document.getElementById('verified-badge');
    
    if (userNameText) {
        userNameText.textContent = user.name || user.email || 'Utilisateur';
    }
    
    // Vérifier si l'utilisateur est certifié
    if (verifiedBadge) {
        const verifiedUsers = JSON.parse(localStorage.getItem('verified_users') || '[]');
        if (verifiedUsers.includes(userEmail)) {
            verifiedBadge.style.display = 'inline-flex';
        } else {
            verifiedBadge.style.display = 'none';
        }
    }
    
    // Afficher le badge de pays (code 2 lettres : fr, de, us…)
    const profileCountryText = document.getElementById('profile-country-text');
    if (profileCountryText) {
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        const account = accounts.find(acc => acc.email === userEmail);
        let countryCode = (account?.country || user.country || '').toString().toLowerCase();
        if (!countryCode) {
            const savedProfile = localStorage.getItem('profile_' + userEmail);
            if (savedProfile) {
                try {
                    const parsedProfile = JSON.parse(savedProfile);
                    countryCode = (parsedProfile.country || parsedProfile.continent || '').toString().toLowerCase();
                } catch (e) {}
            }
        }
        if (!countryCode && (account?.continent || user.continent)) {
            var continentToCountry = { 'europe': 'fr', 'amerique-nord': 'us', 'amerique-sud': 'br', 'afrique': 'other', 'asie': 'jp', 'oceanie': 'au', 'antartique': 'other', 'antarctique': 'other', 'amerique': 'us' };
            countryCode = continentToCountry[(account?.continent || user.continent || '').toString().toLowerCase().replace(/\s+/g, '-')] || '';
        }
        if (countryCode && typeof window.getCountryName === 'function') {
            profileCountryText.textContent = window.getCountryName(countryCode);
        } else if (countryCode) {
            profileCountryText.textContent = countryCode.toUpperCase();
        } else {
            profileCountryText.textContent = (window.t && window.t('profile.not_set')) || 'Non renseigné';
        }
        profileCountryText.dataset.countryCode = countryCode || '';
    }
    
    // Afficher la description
    const profileDescriptionText = document.getElementById('profile-description-text');
    const profileDescription = document.getElementById('profile-description');
    if (profileDescriptionText && profileDescription) {
        // Vérifier d'abord dans localStorage, puis dans le profil
        const descriptionKey = 'profile_description_' + userEmail;
        let description = localStorage.getItem(descriptionKey) || user.description || '';
        
        // Si toujours pas trouvé, essayer de charger depuis le profil sauvegardé
        if (!description || !description.trim()) {
            const savedProfile = localStorage.getItem('profile_' + userEmail);
            if (savedProfile) {
                try {
                    const parsedProfile = JSON.parse(savedProfile);
                    description = parsedProfile.description || '';
                } catch (e) {
                    console.error('Erreur lors du chargement du profil:', e);
                }
            }
        }
        
        if (description && description.trim()) {
            profileDescriptionText.textContent = description;
            profileDescription.classList.remove('empty');
        } else {
            profileDescriptionText.textContent = (window.t && window.t('profile.no_description')) || 'Aucune description';
            profileDescription.classList.add('empty');
        }
    }
    
    // Initialiser le système d'abonnements
    initFollowSystem(userEmail);
    
    // Afficher le bouton signaler si ce n'est pas le profil de l'utilisateur actuel
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const reportBtn = document.getElementById('profile-report-btn');
    if (reportBtn && currentUser && currentUser.email !== userEmail) {
        reportBtn.style.display = 'inline-flex';
    }
}

// Applique les données bannière (image ou vidéo) aux éléments DOM (profil public / top 10 utilisateur)
function applyBannerToDom(banner, bannerImage, bannerVideo) {
    if (!banner || !banner.url || !bannerImage || !bannerVideo) return;
    var type = (banner.type || '').toLowerCase();
    if (type === 'image') {
        bannerVideo.pause();
        bannerVideo.removeAttribute('src');
        bannerVideo.currentTime = 0;
        bannerVideo.classList.remove('active');
        bannerImage.src = banner.url;
        bannerImage.classList.add('active');
        return;
    }
    if (type === 'video') {
        bannerImage.removeAttribute('src');
        bannerImage.classList.remove('active');
        bannerVideo.src = banner.url;
        bannerVideo.classList.add('active');
        bannerVideo.load();
        bannerVideo.addEventListener('loadedmetadata', function() {}, { once: true });
        bannerVideo.addEventListener('timeupdate', function() {
            if (bannerVideo.currentTime >= 45) bannerVideo.currentTime = 0;
        });
        var savedVolume = banner.volume !== undefined ? banner.volume : 0;
        bannerVideo.volume = savedVolume / 100;
        bannerVideo.muted = true;
        bannerVideo.playsInline = true;
        bannerVideo.play().then(function() {
            setTimeout(function() {
                if (savedVolume > 0) {
                    bannerVideo.muted = false;
                } else {
                    bannerVideo.muted = true;
                }
            }, 100);
        }).catch(function(e) {
            bannerVideo.muted = true;
        });
        bannerVideo.addEventListener('error', function onVideoError() {
            console.warn('Bannière vidéo non chargée (profil public)', banner.url && banner.url.substring(0, 50));
        }, { once: true });
    }
}

// Fonction pour charger la bannière de l'utilisateur (localStorage puis Firebase)
function loadUserBanner(userEmail, retryCount) {
    retryCount = retryCount || 0;
    var maxRetries = 15; // Attendre jusqu'à ~3 secondes pour que le module Firebase charge
    var bannerImage = document.getElementById('banner-image');
    var bannerVideo = document.getElementById('banner-video');
    if (!bannerImage || !bannerVideo) return;
    
    function tryApply(banner) {
        if (banner && banner.url) applyBannerToDom(banner, bannerImage, bannerVideo);
    }
    
    // 1. D'abord essayer localStorage (affichage immédiat si disponible)
    var bannerData = localStorage.getItem('profile_banner_' + userEmail);
    if (bannerData) {
        try {
            tryApply(JSON.parse(bannerData));
        } catch (e) {
            console.error('Erreur parsing bannière localStorage:', e);
        }
    }
    
    // 2. Charger depuis Firebase pour avoir la source à jour (même si localStorage avait des données)
    function fetchFromFirebase() {
        if (window.bannerService && typeof window.bannerService.getBanner === 'function') {
            window.bannerService.getBanner(userEmail).then(function(banner) {
                if (banner && banner.url) {
                    tryApply(banner);
                    try { localStorage.setItem('profile_banner_' + userEmail, JSON.stringify({ type: banner.type, url: banner.url, volume: banner.volume !== undefined ? banner.volume : 0 })); } catch (e) {}
                }
            }).catch(function() {});
            return true;
        }
        return false;
    }
    
    if (fetchFromFirebase()) {
        return;
    }
    // Module pas encore chargé : attendre l'événement ou réessayer
    if (retryCount < maxRetries) {
        var handler = function() {
            window.removeEventListener('bannerServiceReady', handler);
            loadUserBanner(userEmail, 0); // Réessayer maintenant que le service est prêt
        };
        window.addEventListener('bannerServiceReady', handler);
        setTimeout(function() {
            window.removeEventListener('bannerServiceReady', handler);
            if (retryCount < maxRetries) loadUserBanner(userEmail, retryCount + 1);
        }, 200);
    }
}

function setupTabs() {
    // Afficher ou masquer la bannière selon l'onglet : masquée sur Collection, visible sur Anime & Manga / Tierlist
    function setBannerVisibility(visible) {
        const header = document.querySelector('.profile-header');
        if (header) header.style.display = visible ? '' : 'none';
    }

    // Restaurer l'onglet sauvegardé après un rafraîchissement (quand on quitte Anime)
    const savedActiveTab = localStorage.getItem('activeProfileTabPublic');
    if (savedActiveTab) {
        const savedTab = document.querySelector(`.profile-tab[data-tab="${savedActiveTab}"]`);
        if (savedTab) {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            savedTab.classList.add('active');
            document.querySelectorAll('.profile-section').forEach(section => {
                section.style.display = 'none';
                section.classList.remove('active');
            });
            const savedSection = document.getElementById(`${savedActiveTab}-section`);
            if (savedSection) {
                savedSection.style.display = 'block';
                savedSection.classList.add('active');
                setBannerVisibility(savedActiveTab !== 'collection');
                if (savedActiveTab === 'collection') {
                    loadUserCollection('all', 'all');
                } else if (savedActiveTab === 'reviews') {
                    loadUserAnimeNotes();
                } else if (savedActiveTab === 'tierlist') {
                    loadUserTierLists();
                }
            }
        }
        localStorage.removeItem('activeProfileTabPublic');
    }

    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTabName = this.dataset.tab;
            const wasOnReviews = document.querySelector('.profile-tab.active')?.dataset?.tab === 'reviews';
            // En quittant Anime (reviews) vers un autre onglet, rafraîchir la page pour éviter les bugs
            if (wasOnReviews && targetTabName !== 'reviews') {
                localStorage.setItem('activeProfileTabPublic', targetTabName);
                location.reload();
                return;
            }

            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.profile-section').forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });
            const section = document.getElementById(`${targetTabName}-section`);
            if (section) {
                section.style.display = 'block';
                section.classList.add('active');
                setBannerVisibility(targetTabName !== 'collection');
                if (targetTabName === 'collection') {
                    loadUserCollection('all', 'all');
                } else if (targetTabName === 'reviews') {
                    loadUserAnimeNotes();
                } else if (targetTabName === 'tierlist') {
                    loadUserTierLists();
                }
            }
        });
    });
}

function setupCollectionFilters() {
    // Filtres par statut
    const statusFilters = document.querySelectorAll('.status-filter');
    statusFilters.forEach(filter => {
        filter.addEventListener('click', function() {
            statusFilters.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            const status = this.dataset.status;
            loadUserCollection(status, currentTypeFilter);
        });
    });
    
    // Filtres par type
    const typeFilters = document.querySelectorAll('.type-filter');
    typeFilters.forEach(filter => {
        filter.addEventListener('click', function() {
            typeFilters.forEach(f => f.classList.remove('active'));
            this.classList.add('active');
            currentTypeFilter = this.dataset.type;
            loadUserCollection(currentStatusFilter, currentTypeFilter);
        });
    });
}

let currentStatusFilter = 'all';
let currentTypeFilter = 'all';

// Fonction pour charger et afficher la collection avec la même structure que list.js
// Charge depuis Firebase (comme list.html) avec fallback localStorage pour cohérence
async function loadUserCollection(statusFilter = 'all', typeFilter = 'all') {
    const collectionSection = document.getElementById('collection-section');
    const collectionContainer = document.getElementById('collection-items');
    const emptyMessage = document.getElementById('empty-collection');
    
    // Appliquer les styles pour la section collection (exactement comme la vraie page collection)
    // S'assurer que le container garde toujours sa largeur même sans résultats
    if (collectionSection) {
        collectionSection.style.maxWidth = '2000px';
        collectionSection.style.margin = '0 auto';
        collectionSection.style.width = '100%';
        collectionSection.style.padding = '20px';
        collectionSection.style.overflow = 'visible';
        collectionSection.style.boxSizing = 'border-box';
    }
    
    if (!collectionContainer) return;
    
    // Sauvegarder les filtres actuels
    currentStatusFilter = statusFilter;
    currentTypeFilter = typeFilter;
    
    // Charger depuis Firebase (comme list.html) pour cohérence - fallback localStorage
    let userList = [];
    try {
        const { collectionService } = await import('/js/firebase-service.js');
        userList = await collectionService.getAllItems(viewedUserEmail);
    } catch (e) {
        console.warn('[UserProfile] Firebase indisponible, fallback localStorage:', e);
        const userListKey = `user_list_${viewedUserEmail}`;
        userList = JSON.parse(localStorage.getItem(userListKey) || '[]');
    }
    
    // Filtrer selon le statut
    let filteredList = userList;
    if (statusFilter !== 'all') {
        filteredList = filteredList.filter(item => item.status === statusFilter);
    }
    
    // Filtrer selon le type
    if (typeFilter !== 'all') {
        filteredList = filteredList.filter(item => {
            const itemType = (item.type || 'anime').toLowerCase();
            return itemType === typeFilter.toLowerCase();
        });
    }
    
    // Vider le conteneur
    collectionContainer.innerHTML = '';
    
    // Mettre à jour les statistiques
    updateCollectionStats(userList);
    
    // S'assurer que le container principal garde toujours sa largeur maximale (comme la vraie page collection)
    if (collectionSection) {
        collectionSection.style.maxWidth = '2000px';
        collectionSection.style.margin = '0 auto';
        collectionSection.style.width = '100%';
        collectionSection.style.padding = '20px';
        collectionSection.style.overflow = 'visible';
        collectionSection.style.boxSizing = 'border-box';
    }
    
    if (filteredList.length === 0) {
        collectionContainer.style.display = 'none';
        emptyMessage.style.display = 'block';
        // S'assurer que le message vide garde aussi la largeur du container (comme la vraie page collection)
        if (emptyMessage) {
            emptyMessage.style.maxWidth = '2000px';
            emptyMessage.style.margin = '0 auto';
            emptyMessage.style.padding = '20px';
            emptyMessage.style.width = '100%';
            emptyMessage.style.boxSizing = 'border-box';
        }
        return;
    }
    
    emptyMessage.style.display = 'none';
    collectionContainer.style.display = 'grid';
    
    // Ne pas forcer les styles, laisser le CSS gérer via la classe list-grid
    collectionContainer.className = 'list-grid';
    
    // Afficher les items de la collection avec la même structure que list.js
    // Récupérer les images depuis l'API Jikan pour chaque item
    // Utiliser une boucle for...of avec await pour attendre que toutes les images soient chargées
    const imagePromises = [];
    filteredList.forEach((item, index) => {
        const itemElement = createPublicListItem(item);
        collectionContainer.appendChild(itemElement);
        
        // Récupérer l'image de qualité depuis l'API Jikan avec un délai progressif pour éviter les mélanges
        // Chaque requête attend un peu plus longtemps pour éviter les conflits
        const delay = index * 150; // 150ms entre chaque requête
        const promise = new Promise(resolve => {
            setTimeout(() => {
                fetchAndUpdateItemImage(item, itemElement).then(resolve).catch(resolve);
            }, delay);
        });
        imagePromises.push(promise);
    });
    
    // S'assurer que tous les éléments sont visibles (comme dans list.js)
    const allItemElements = collectionContainer.querySelectorAll('.list-item');
    allItemElements.forEach(item => {
        item.style.display = 'flex';
    });
    
    // Attendre que toutes les images soient chargées avant de traduire
    Promise.all(imagePromises).then(() => {
        // Traduire automatiquement les synopsis après création des cartes et chargement des images
        const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
        if (window.translateCollectionPage) {
            window.translateCollectionPage(currentLanguage);
        } else if (window.translateEntireSiteAutomatically) {
            window.translateEntireSiteAutomatically();
        }
    }).catch(error => {
        console.error('Erreur lors du chargement des images:', error);
        // Traduire quand même même si certaines images ont échoué
        const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
        if (window.translateCollectionPage) {
            window.translateCollectionPage(currentLanguage);
        } else if (window.translateEntireSiteAutomatically) {
            window.translateEntireSiteAutomatically();
        }
    });
}

// Mettre à jour les statistiques de la collection
function updateCollectionStats(userList) {
    const stats = {
        'watching': userList.filter(item => item.status === 'watching').length,
        'completed': userList.filter(item => item.status === 'completed').length,
        'on-hold': userList.filter(item => item.status === 'on-hold').length,
        'dropped': userList.filter(item => item.status === 'dropped').length,
        'plan-to-watch': userList.filter(item => item.status === 'plan-to-watch').length
    };
    
    const watchingCount = document.getElementById('watching-count');
    const completedCount = document.getElementById('completed-count');
    const onHoldCount = document.getElementById('on-hold-count');
    const droppedCount = document.getElementById('dropped-count');
    const planToWatchCount = document.getElementById('plan-to-watch-count');
    
    if (watchingCount) watchingCount.textContent = stats.watching;
    if (completedCount) completedCount.textContent = stats.completed;
    if (onHoldCount) onHoldCount.textContent = stats['on-hold'];
    if (droppedCount) droppedCount.textContent = stats.dropped;
    if (planToWatchCount) planToWatchCount.textContent = stats['plan-to-watch'];
}

// Fonction pour normaliser le type (comme dans list.js)
function normalizeItemTypePublic(type) {
    const lowerType = type.toLowerCase();
    if (['tv', 'movie', 'ova', 'ona', 'special', 'music'].includes(lowerType)) {
        return 'anime';
    }
    return lowerType;
}

// Créer un élément de liste pour le profil public (exactement comme list.js mais sans boutons d'édition)
function createPublicListItem(item) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'list-item';
    itemDiv.dataset.status = item.status;
    itemDiv.dataset.itemId = item.id;
    // Stocker l'ID MAL pour vérifier la correspondance lors de la mise à jour de l'image
    const itemMalId = item.mal_id || item.id;
    itemDiv.dataset.malId = itemMalId;
    
    const statusText = getStatusTextPublic(item.status);
    const statusClass = item.status;
    
    // Normaliser le type : convertir "TV", "Movie", etc. en "anime" pour l'affichage (comme dans list.js)
    const normalizedType = normalizeItemTypePublic(item.type || 'anime');
    
    // Formater les informations - gérer les différents formats de données
    // Gérer les valeurs 'null' (chaîne) vs null (valeur)
    const episodesValue = item.episodes === 'null' || item.episodes === null ? '?' : item.episodes;
    const volumesValue = item.volumes === 'null' || item.volumes === null ? '?' : item.volumes;
    const yearValue = item.year === 'null' || item.year === null ? '?' : item.year;
    
    const episodesText = episodesValue || volumesValue || '?';
    const t = (key, fallback) => (typeof window.t === 'function' && window.t(key)) || (window.localization && window.localization.get(key)) || fallback;
    const typeKey = (normalizedType === 'movie' || (item.type || '').toLowerCase() === 'movie') ? 'film' : normalizedType;
    const typeLabel = t('collection.type.' + typeKey, normalizedType ? normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1) : 'Type inconnu');
    const episodesLabel = normalizedType === 'anime' ? t('collection.label_episodes', 'épisodes') : t('collection.label_volumes', 'volumes');
    const yearText = yearValue || '?';
    
    // Détecter si le nombre d'épisodes est trop long et nécessite une réduction de police
    const episodesFullText = `${episodesText} ${episodesLabel}`;
    // Réduire la taille si plus de 12 caractères (pour gérer les nombres > 100)
    const isLongEpisodes = episodesFullText.length > 12 || (episodesValue && parseInt(episodesValue) > 99);
    
    // Fonction pour tronquer le texte à la fin d'une phrase (exactement comme list.js)
    function truncateAtSentence(text, maxLength) {
        if (!text || text.length <= maxLength) return text || 'Aucune description disponible.';
        
        // Tronquer à maxLength
        let truncated = text.substring(0, maxLength);
        
        // Chercher le dernier point, point d'exclamation ou point d'interrogation
        const lastSentenceEnd = Math.max(
            truncated.lastIndexOf('.'),
            truncated.lastIndexOf('!'),
            truncated.lastIndexOf('?')
        );
        
        // Si on trouve une fin de phrase, tronquer là
        if (lastSentenceEnd > maxLength * 0.7) { // Au moins 70% de la longueur max
            return truncated.substring(0, lastSentenceEnd + 1);
        }
        
        // Sinon, chercher le dernier espace
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > maxLength * 0.8) { // Au moins 80% de la longueur max
            return truncated.substring(0, lastSpace);
        }
        
        // Sinon, tronquer à maxLength
        return truncated;
    }
    
    // Utiliser le synopsis original (non traduit) - il sera traduit après par l'API
    // Utiliser exactement comme dans list.js : item.synopsis directement avec limite de 120 caractères
    // Le synopsis sera traduit automatiquement après par translateCollectionPage
    const synopsisText = truncateAtSentence(item.synopsis || 'Aucune description disponible.', 120);
    
    // Image par défaut - sera remplacée par l'image de l'API si disponible
    // Utiliser les images de l'item si disponibles (fallback)
    let imageUrl = item.images?.jpg?.large_image_url || 
                   item.images?.jpg?.image_url || 
                   item.imageUrl || 
                   item.image || 
                   '';
    
    const htmlContent = `
        <div class="item-image">
            <img src="${imageUrl}" 
                 alt="${item.title || item.titleEnglish || 'Image'}" 
                 onerror="this.onerror=null; this.src='';"
                 loading="lazy">
            <div class="item-status ${statusClass}">${statusText}</div>
        </div>
    `;
    
    // Créer l'élément image d'abord (exactement comme list.js)
    itemDiv.innerHTML = htmlContent;
    
    // Créer l'élément content séparément (exactement comme list.js)
    const contentDiv = document.createElement('div');
    contentDiv.className = 'item-content';
    // Utiliser exactement les mêmes styles inline que list.js
    contentDiv.style.cssText = `
        padding: 20px;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        border-radius: 0 0 12px 12px;
        display: flex !important;
        flex-direction: column !important;
        visibility: visible !important;
        opacity: 1 !important;
        min-height: 200px;
        flex: 1;
        position: relative;
        z-index: 1;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    const itemId = item.mal_id || item.id;
    const itemType = item.type || 'anime';
    
    // Utiliser exactement la même structure que list.js, mais sans les boutons d'action
    // Le synopsis sera traduit automatiquement après par l'API de traduction
    contentDiv.innerHTML = `
        <h3 class="item-title" onclick="window.location.href='anime-details.html?id=${itemId}&type=${itemType}'" style="cursor: pointer;">${item.title || item.titleEnglish || 'Titre inconnu'}</h3>
        <div class="item-meta">
            <span class="item-type" data-i18n="collection.type.${typeKey}">${typeLabel}</span>
            <span>•</span>
            <span class="${isLongEpisodes ? 'episodes-long' : ''}">${episodesText} ${episodesLabel}</span>
            <span>•</span>
            <span>${yearText}</span>
        </div>
        <p class="item-synopsis profile-card-synopsis">${synopsisText}</p>
    `;
    
    // Ajouter l'élément content à l'item
    itemDiv.appendChild(contentDiv);
    
    return itemDiv;
}

// Fonction pour récupérer l'image depuis l'API Jikan et mettre à jour la carte
async function fetchAndUpdateItemImage(item, itemElement) {
    try {
        const itemId = item.mal_id || item.id;
        if (!itemId) {
            console.warn(`Pas d'ID pour l'item:`, item.title || item.titleEnglish);
            return;
        }
        
        // Vérifier que l'élément correspond toujours à cet item (sécurité)
        const expectedMalId = itemElement.dataset.malId;
        if (expectedMalId && expectedMalId !== String(itemId)) {
            console.warn(`ID mismatch: élément attendu ${expectedMalId}, item ${itemId}`);
            return;
        }
        
        const itemType = (item.type || 'anime').toLowerCase();
        const isManga = itemType === 'manga' || itemType === 'manhwa' || itemType === 'manhua';
        
        // Appel API Jikan pour récupérer les détails complets avec les images de qualité
        const apiUrl = isManga 
            ? `https://api.jikan.moe/v4/manga/${itemId}`
            : `https://api.jikan.moe/v4/anime/${itemId}`;
        
        // Ajouter un délai pour éviter de surcharger l'API (rate limiting)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            // Si erreur 429 (rate limit), attendre un peu plus
            if (response.status === 429) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Réessayer une fois
                const retryResponse = await fetch(apiUrl);
                if (!retryResponse.ok) {
                    console.warn(`Erreur API pour ${itemId} (après retry):`, retryResponse.status);
                    return;
                }
                const retryData = await retryResponse.json();
                // Vérifier que les données correspondent bien à l'item
                if (retryData.data && String(retryData.data.mal_id) === String(itemId)) {
                    updateImageFromApiData(retryData.data, itemElement, itemId);
                }
                return;
            }
            console.warn(`Erreur API pour ${itemId}:`, response.status);
            return;
        }
        
        const data = await response.json();
        if (data && data.data) {
            // Vérifier que les données de l'API correspondent bien à l'item demandé
            if (String(data.data.mal_id) === String(itemId)) {
                updateImageFromApiData(data.data, itemElement, itemId);
            } else {
                console.warn(`ID mismatch API: demandé ${itemId}, reçu ${data.data.mal_id}`);
            }
        }
    } catch (error) {
        console.error(`Erreur lors de la récupération de l'image pour ${item.id}:`, error);
        // En cas d'erreur, on garde l'image par défaut
    }
}

// Fonction helper pour mettre à jour l'image depuis les données de l'API
function updateImageFromApiData(content, itemElement, expectedId) {
    // Vérifier une dernière fois que l'élément correspond bien à l'ID attendu
    const elementMalId = itemElement.dataset.malId;
    if (expectedId && elementMalId && String(elementMalId) !== String(expectedId)) {
        console.warn(`ID mismatch lors de la mise à jour: élément ${elementMalId}, attendu ${expectedId}`);
        return;
    }
    
    if (content && content.images) {
        // Utiliser la meilleure qualité d'image disponible
        const imageUrl = content.images.jpg?.large_image_url || 
                       content.images.jpg?.image_url || 
                       content.images.webp?.large_image_url || 
                       content.images.webp?.image_url;
        
        if (imageUrl) {
            // Mettre à jour l'image dans la carte
            const imgElement = itemElement.querySelector('.item-image img');
            if (imgElement) {
                // Vérifier que l'URL est valide
                if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                    // Vérifier une dernière fois que l'élément n'a pas changé
                    const currentMalId = itemElement.dataset.malId;
                    if (expectedId && currentMalId && String(currentMalId) !== String(expectedId)) {
                        console.warn('Élément modifié pendant le chargement de l\'image');
                        return;
                    }
                    imgElement.src = imageUrl;
                    imgElement.onerror = function() {
                        // En cas d'erreur de chargement, garder l'image par défaut
                        this.onerror = null;
                        if (this.src !== '') {
                            this.src = '';
                        }
                    };
                } else {
                    console.warn('URL d\'image invalide:', imageUrl);
                }
            }
        }
    }
}

function getStatusTextPublic(status) {
    // Utiliser la localisation si disponible, sinon utiliser les textes par défaut
    const statusMap = {
        'watching': window.localization ? window.localization.get('collection.status.watching') : 'En cours',
        'completed': window.localization ? window.localization.get('collection.status.completed') : 'Terminé',
        'on-hold': window.localization ? window.localization.get('collection.status.on_hold') : 'En pause',
        'dropped': window.localization ? window.localization.get('collection.status.dropped') : 'Abandonné',
        'plan-to-watch': window.localization ? window.localization.get('collection.status.plan_to_watch') : 'À voir'
    };
    const key = statusMap[status];
    return key || status;
}

// Fonction pour charger les notes d'animes avec les containers à étoiles
function loadUserAnimeNotes() {
    // Créer d'abord les containers à étoiles si ils n'existent pas
    createStarBadgesPublic();
    
    // Attendre un peu que les containers soient créés
    setTimeout(() => {
        displayUserAnimeNotesPublic();
    }, 100);
}

// Créer les containers à étoiles (version publique)
function createStarBadgesPublic() {
    const reviewsSection = document.getElementById('reviews-section');
    if (!reviewsSection) return;
    
    // Vérifier si les containers existent déjà
    if (reviewsSection.querySelector('.all-star-containers')) {
        return; // Déjà créés
    }
    
    reviewsSection.style.maxWidth = '2000px';
    reviewsSection.style.margin = '0 1rem';
    reviewsSection.style.overflow = 'visible';
    
    // Supprimer les anciens containers
    reviewsSection.querySelectorAll('.all-star-containers').forEach(el => el.remove());
    reviewsSection.querySelectorAll('.card-list').forEach(el => el.remove());
    
    // Créer le conteneur des cartes Top 10 (même style et taille que le Top 10 perso)
    const catalogueContainer = document.createElement('div');
    catalogueContainer.className = 'card-list';
    catalogueContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(5, 175px);
        grid-template-rows: repeat(2, auto);
        gap: 1.5rem;
        margin: 1.5rem auto 2.5rem auto;
        padding: 0 1.5rem;
        position: relative;
        z-index: 1;
        width: fit-content;
        max-width: calc(100% - 3rem);
        justify-content: center;
        justify-items: center;
        box-sizing: border-box;
    `;
    
    if (window.innerWidth < 1200) {
        catalogueContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(175px, 1fr))';
        catalogueContainer.style.maxWidth = '100%';
    }
    
    // Créer exactement 10 cartes (1 à 10) pour le Top 10
    for (let i = 1; i <= 10; i++) {
        const card = document.createElement('div');
        card.className = `catalogue-card rating-${i}`;
        card.id = `catalogue-card-${i}`;
        card.setAttribute('data-top-index', i-1);
        card.setAttribute('draggable', 'false');
        card.style.cssText = `
            position: relative;
            background: #23262f;
            border: 2px solid #00b894;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 1.2rem 0.7rem 1rem 0.7rem;
            height: 320px;
            width: 175px;
            overflow: hidden;
            box-sizing: border-box;
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
        `;
        
        const badge = document.createElement('div');
        badge.className = 'catalogue-position';
        badge.style.cssText = `
            position: relative;
            margin-bottom: 0.8rem;
            z-index: 2;
            text-align: center;
            width: 100%;
        `;
        if (i <= 3) {
            const medals = {
                1: { emoji: '🥇', color: '#00b894' },
                2: { emoji: '🥈', color: '#00b894' },
                3: { emoji: '🥉', color: '#00b894' }
            };
            badge.innerHTML = `<div style="font-size: 2rem; margin-bottom: 0.2rem;">${medals[i].emoji}</div>`;
        } else {
            badge.innerHTML = `<div style="font-size: 1.4rem; color: #00b894; font-weight: bold;">${i}/10</div>`;
        }
        
        // Image placeholder (exactement comme dans profile-anime-cards.js)
        const image = document.createElement('div');
        image.className = 'catalogue-image-placeholder';
        image.style.cssText = `
            width: 110px;
            height: 145px;
            background: #2a2d36;
            border-radius: 10px;
            margin: 0 auto 0.8rem auto;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #bdbdbd;
            font-size: 2.2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        image.innerHTML = `${i}`;

        // Titre (dédié)
        const titre = document.createElement('span');
        titre.className = 'anime-title';
        titre.id = `top-${i}-title`;
        titre.style.cssText = `
            color: #00b894;
            font-size: 1.1rem;
            font-weight: 800;
            text-align: center;
            margin-top: 0.5rem;
            display: block;
            max-width: 100%;
            word-wrap: break-word;
            line-height: 1.2;
        `;
        titre.textContent = `-`;
        
        // Créer un élément image pour remplacer le placeholder plus tard
        const imgElement = document.createElement('img');
        imgElement.id = `top-${i}-image`;
        imgElement.style.cssText = `
            width: 110px;
            height: 145px;
            object-fit: cover;
            border-radius: 10px;
            margin: 0 auto 0.8rem auto;
            display: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        imgElement.onerror = function() {
            this.style.display = 'none';
            image.style.display = 'flex';
        };
        imgElement.onload = function() {
            this.style.display = 'block';
            image.style.display = 'none';
        };
        
        // Assembler la carte
        card.appendChild(badge);
        card.appendChild(image);
        card.appendChild(imgElement);
        card.appendChild(titre);
        
        catalogueContainer.appendChild(card);
        
        // Effets au survol (comme le Top 10 perso)
        card.onmouseover = function() {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
        };
        card.onmouseout = function() {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        };
    }
    
    reviewsSection.appendChild(catalogueContainer);
    
    // Créer les boutons de tri (Trier par genre et Ordre décroissant)
    createSortButtonsPublic(reviewsSection);
    
    // Créer le conteneur principal des étoiles
    const allContainers = document.createElement('div');
    allContainers.className = 'all-star-containers';
    allContainers.style.cssText = `
        width: 98%;
        max-width: 98%;
        margin: 2.5rem auto 0 auto;
        display: flex;
        flex-direction: column;
        gap: 2rem;
        box-sizing: border-box;
    `;
    
    // Créer les badges pour les notes de 10 à 1
    for (let i = 10; i >= 1; i--) {
        const badgeContainer = document.createElement('div');
        badgeContainer.className = 'star-rating-group';
        badgeContainer.style.cssText = `
            width: 100%;
            max-width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            box-sizing: border-box;
            margin-bottom: 1.5rem;
        `;
        
        const badge = document.createElement('div');
        badge.className = 'star-rating-badge';
        badge.style.cssText = `
            position: relative;
            background: #23262f;
            border-radius: 14px;
            min-width: 90px;
            max-width: 120px;
            padding: 0.7rem 1.3rem;
            box-shadow: 0 2px 12px #0007;
            display: flex;
            align-items: flex-start;
            margin-bottom: 1.5rem;
        `;
        badge.innerHTML = `
            <span style="font-size:2.1rem;color:#ffd700;font-weight:700;display:flex;align-items:center;gap:0;">
                ${i}<i class="fas fa-star" style="margin-left:0.1rem;"></i>
            </span>
        `;
        
        const starContainer = document.createElement('div');
        starContainer.id = i === 10 ? 'star-containers' : `star-containers-${i}`;
        starContainer.style.cssText = `
            width: 100%;
            max-width: 100%;
            min-height: 340px;
            background: #23262f;
            border-radius: 18px;
            box-shadow: 0 2px 16px #0006;
            padding: 2rem 1.5rem;
            margin: 0 auto 1.5rem auto;
            box-sizing: border-box;
            overflow-x: hidden;
        `;
        
        badgeContainer.appendChild(badge);
        badgeContainer.appendChild(starContainer);
        allContainers.appendChild(badgeContainer);
    }
    
    reviewsSection.appendChild(allContainers);
}

// Afficher les notes d'animes avec les containers à étoiles
async function displayUserAnimeNotesPublic() {
    // Charger les notes de l'utilisateur
    const notesKey = `user_content_notes_${viewedUserEmail}`;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) {
        console.error('Erreur lors du chargement des notes:', e);
        notes = [];
    }
    
    // Filtrer selon le type sélectionné
    const selectedType = window.selectedType || 'manga';
    let filteredNotes = notes;
    
        if (selectedType !== 'tous') {
            filteredNotes = notes.filter(note => {
                const noteType = (note.contentType || 'manga').toLowerCase();
                if (selectedType === 'manga') {
                    return noteType === 'manga';
                } else if (selectedType === 'manhwa') {
                    return noteType === 'manhwa';
                } else if (selectedType === 'manhua') {
                    return noteType === 'manhua';
                } else if (selectedType === 'doujin') {
                    return noteType === 'doujin';
                } else if (selectedType === 'anime') {
                    return ['anime', 'tv', 'movie', 'ova', 'ona', 'special', 'music'].includes(noteType);
                } else if (selectedType === 'film') {
                    return ['movie', 'film'].includes(noteType);
                }
                return true;
            });
        }
    
    const animeNotes = filteredNotes;
    
    // Réinitialiser toutes les cartes du Top 10 avant d'afficher les nouvelles données
    for (let i = 1; i <= 10; i++) {
        const cardId = `catalogue-card-${i}`;
        const card = document.getElementById(cardId);
        if (card) {
            const img = card.querySelector(`#top-${i}-image`) || card.querySelector('img');
            const titleEl = card.querySelector(`#top-${i}-title`) || card.querySelector('.anime-title');
            const placeholder = card.querySelector('.catalogue-image-placeholder');
            if (img) {
                img.src = '';
                img.style.display = 'none';
            }
            if (titleEl) {
                titleEl.textContent = '';
            }
            if (placeholder) {
                placeholder.style.display = 'block';
            }
            card.style.cursor = 'default';
            card.onclick = null;
        }
    }
    
    // Charger le Top 10 du propriétaire selon le genre et type sélectionnés
    const selectedGenres = Array.isArray(window.selectedGenres) && window.selectedGenres.length > 0 
        ? window.selectedGenres.sort().join(',') 
        : null;
    
    // Créer un objet utilisateur pour getUserTop10
    const userObj = { email: viewedUserEmail };
    
    console.log(`🔍 Chargement Top 10 pour utilisateur: ${viewedUserEmail}, genre: ${selectedGenres || 'aucun'}, type: ${selectedType}`);
    
    // Charger le Top 10 du propriétaire
    let top10Data = [];
    if (typeof getUserTop10 === 'function') {
        try {
            top10Data = await getUserTop10(userObj, selectedGenres, selectedType !== 'tous' ? selectedType : null);
            console.log(`📊 Top 10 chargé pour genre: ${selectedGenres || 'aucun'}, type: ${selectedType}`);
            console.log(`📊 Nombre d'éléments dans top10Data: ${top10Data.filter(item => item !== null).length}`);
            // Règle "un seul par série" : comme le Top 10 perso, ne garder qu'une entrée par série (anime/manga)
            top10Data = filterTop10OnePerSeries(top10Data);
            
            // Vérifier la clé utilisée pour le débogage
            if (selectedGenres && typeof getUserTop10Key === 'function') {
                const top10Key = getUserTop10Key(userObj, selectedGenres, selectedType !== 'tous' ? selectedType : null);
                console.log(`🔑 Clé utilisée pour charger le Top 10: ${top10Key}`);
                const storedValue = localStorage.getItem(top10Key);
                console.log(`📦 Valeur dans localStorage pour cette clé:`, storedValue ? 'existe' : 'n\'existe pas');
            }
            
            // Si un genre est sélectionné et que le Top 10 est vide (tous null), 
            // on garde un Top 10 vide (ne pas charger le Top 10 global)
            if (selectedGenres) {
                const hasAnyItem = top10Data.some(item => item !== null);
                if (!hasAnyItem) {
                    console.log('📊 Aucun Top 10 spécifique trouvé pour ce genre, affichage d\'un Top 10 vide');
                    top10Data = new Array(10).fill(null);
                }
            }
        } catch (e) {
            console.error('Erreur lors du chargement du Top 10:', e);
            // Si un genre est sélectionné, garder un Top 10 vide
            if (selectedGenres) {
                top10Data = new Array(10).fill(null);
            } else {
                // Sinon, essayer de charger le Top 10 global
                try {
                    top10Data = await getUserTop10(userObj, null, selectedType !== 'tous' ? selectedType : null);
                    top10Data = filterTop10OnePerSeries(top10Data);
                } catch (e2) {
                    top10Data = new Array(10).fill(null);
                }
            }
        }
    } else {
        console.warn('getUserTop10 n\'est pas disponible');
        // Si un genre est sélectionné, afficher un Top 10 vide
        if (selectedGenres) {
            top10Data = new Array(10).fill(null);
        } else {
            // Sinon, utiliser les notes triées comme fallback
            const sortedNotes = [...animeNotes].sort((a, b) => {
                const noteA = a.note || a.rating || 0;
                const noteB = b.note || b.rating || 0;
                if (noteB !== noteA) return noteB - noteA;
                return (b.addedAt || 0) - (a.addedAt || 0);
            });
            top10Data = sortedNotes.slice(0, 10);
            // Remplir avec null pour avoir 10 éléments
            while (top10Data.length < 10) {
                top10Data.push(null);
            }
            top10Data = filterTop10OnePerSeries(top10Data);
        }
    }
    
    // Afficher le Top 10 du propriétaire
    for (let i = 0; i < 10; i++) {
        const top10Item = top10Data[i];
        const cardId = `catalogue-card-${i + 1}`;
        const card = document.getElementById(cardId);
        
        if (card && top10Item) {
            // top10Item peut être un objet avec titre/image ou directement une note
            const imageUrl = top10Item.image || top10Item.images?.jpg?.large_image_url || top10Item.images?.jpg?.image_url || '/images/default-anime.svg';
            const title = top10Item.title || top10Item.titre || top10Item.titleEnglish || top10Item.name || 'Titre inconnu';
            
            // Trouver le placeholder et l'image
            const placeholder = card.querySelector('.catalogue-image-placeholder');
            const img = card.querySelector(`#top-${i + 1}-image`) || card.querySelector('img');
            const titleEl = card.querySelector(`#top-${i + 1}-title`) || card.querySelector('.anime-title');
            
            if (img) {
                img.src = imageUrl;
                img.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
            }
            if (titleEl) {
                titleEl.textContent = title;
            }
            
            // Ajouter un écouteur de clic
            card.style.cursor = 'pointer';
            const contentId = top10Item.id || top10Item.mal_id || top10Item.malId || top10Item.contentId;
            card.onclick = function() {
                if (contentId) {
                    const contentType = top10Item.contentType || 'anime';
                    window.location.href = `/pages/details.html?id=${contentId}&type=${contentType}`;
                }
            };
        } else if (card) {
            // Carte vide (top10Item est null)
            const img = card.querySelector(`#top-${i + 1}-image`) || card.querySelector('img');
            const titleEl = card.querySelector(`#top-${i + 1}-title`) || card.querySelector('.anime-title');
            const placeholder = card.querySelector('.catalogue-image-placeholder');
            if (img) {
                img.src = '';
                img.style.display = 'none';
            }
            if (titleEl) {
                titleEl.textContent = '';
            }
            if (placeholder) {
                placeholder.style.display = 'block';
            }
            card.style.cursor = 'default';
            card.onclick = null;
        }
    }
    
    if (animeNotes.length === 0) {
        // Vider tous les containers d'étoiles
        document.querySelectorAll('[id^="star-containers"]').forEach(container => {
            container.innerHTML = '';
        });
        return;
    }
    
    // Max 3 cartes sur la page 1, le surplus va aux pages suivantes (comme le profil perso)
    const MAX_CARDS_PAGE1 = 3;
    const CARDS_PER_PAGE_AFTER = 100;
    if (!window.starCurrentPagesPublic) window.starCurrentPagesPublic = {};
    
    for (let note = 10; note >= 1; note--) {
        const container = document.getElementById(note === 10 ? 'star-containers' : `star-containers-${note}`);
        if (!container) continue;
        
        const notesForThisStar = animeNotes.filter(anime => {
            const animeNote = anime.note || anime.rating || 0;
            return Math.round(animeNote) === note;
        });
        
        if (notesForThisStar.length === 0) {
            container.innerHTML = '';
            continue;
        }
        
        const page = window.starCurrentPagesPublic[note] || 1;
        renderStarContainerPublic(container, note, notesForThisStar, page, MAX_CARDS_PAGE1, CARDS_PER_PAGE_AFTER);
    }
}

function renderStarContainerPublic(container, note, notesForThisStar, page, maxPage1, cardsPerPageAfter) {
    const totalPages = notesForThisStar.length <= maxPage1
        ? 1
        : 1 + Math.ceil((notesForThisStar.length - maxPage1) / cardsPerPageAfter);
    
    const pageSize = page === 1 ? maxPage1 : cardsPerPageAfter;
    const start = page === 1 ? 0 : maxPage1 + (page - 2) * cardsPerPageAfter;
    const animesToShow = notesForThisStar.slice(start, start + pageSize);
    
    const oldPag = container.parentNode.querySelector('.star-pagination');
    if (oldPag) oldPag.remove();
    
    container.innerHTML = '';
    
    // Même hauteur et disposition que le profil perso : page > 1 = container grand (minHeight 13000px) + bouton "Bas"
    if (page > 1) {
        // Retirer l'ancien bouton "Bas" s'il existe
        const oldBottomBtn = container.parentNode.querySelector('.star-scroll-to-bottom-btn');
        if (oldBottomBtn) oldBottomBtn.remove();
        
        // Bouton "Bas" pour descendre en bas du container (comme profil perso)
        const scrollToBottomBtn = document.createElement('button');
        scrollToBottomBtn.className = 'star-scroll-to-bottom-btn';
        scrollToBottomBtn.innerHTML = (window.t && window.t('common.scroll_bottom')) || '↓ Bas';
        scrollToBottomBtn.title = (window.t && window.t('common.scroll_bottom_title')) || 'Descendre en bas de la page';
        scrollToBottomBtn.style.cssText = `
            display: block;
            margin: 0 auto 20px auto;
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            background: #00b894;
            color: white;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        scrollToBottomBtn.onmouseover = () => {
            scrollToBottomBtn.style.background = '#00a085';
            scrollToBottomBtn.style.transform = 'scale(1.05)';
        };
        scrollToBottomBtn.onmouseout = () => {
            scrollToBottomBtn.style.background = '#00b894';
            scrollToBottomBtn.style.transform = 'scale(1)';
        };
        scrollToBottomBtn.onclick = () => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        };
        container.parentNode.insertBefore(scrollToBottomBtn, container);
        
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.columnGap = '2rem';
        container.style.rowGap = '0.5rem';
        container.style.justifyContent = 'flex-start';
        container.style.alignItems = 'flex-start';
        container.style.alignContent = 'flex-start';
        container.style.width = '100%';
        container.style.maxWidth = '1400px';
        container.style.minHeight = '13000px';
        container.style.height = 'auto';
        container.style.margin = '0 auto';
        container.style.padding = '2rem';
        container.style.background = '#23262f';
        container.style.borderRadius = '18px';
        container.style.boxShadow = '0 2px 16px #0006';
        container.style.boxSizing = 'border-box';
        setTimeout(() => { container.style.minHeight = '13000px'; }, 50);
    } else {
        // Retirer le bouton "Bas" si on revient à la page 1
        const oldBottomBtn = container.parentNode.querySelector('.star-scroll-to-bottom-btn');
        if (oldBottomBtn) oldBottomBtn.remove();
        
        container.style.display = 'flex';
        container.style.flexWrap = 'wrap';
        container.style.gap = '2rem';
        container.style.justifyContent = 'flex-start';
        container.style.alignItems = 'flex-start';
        container.style.maxWidth = '1100px';
        container.style.minHeight = '340px';
        container.style.height = 'auto';
        container.style.margin = '0 auto';
        container.style.padding = '2rem 1.5rem';
        container.style.background = '#23262f';
        container.style.borderRadius = '18px';
        container.style.boxShadow = '0 2px 16px #0006';
        container.style.boxSizing = 'border-box';
    }
    
    animesToShow.forEach(noteData => {
        const card = createAnimeStarCard(noteData);
        container.appendChild(card);
    });
    
    // Fonction pour gérer l'affichage de tous les conteneurs à étoiles
    // Si un conteneur est sur page > 1, afficher seulement celui-là, sinon afficher tous
    function updateAllStarContainersVisibility() {
        const allGroups = document.querySelectorAll('.star-rating-group');
        
        // Vérifier si au moins un conteneur est sur une page > 1
        let hasPageGreaterThanOne = false;
        let activeContainerGroup = null;
        
        // Vérifier tous les conteneurs
        allGroups.forEach(group => {
            const starContainer = group.querySelector('[id^="star-containers"]');
            if (starContainer) {
                // Extraire le numéro de note du container
                let containerNote = null;
                if (starContainer.id === 'star-containers') {
                    containerNote = 10;
                } else {
                    const match = starContainer.id.match(/star-containers-(\d+)/);
                    if (match) {
                        containerNote = parseInt(match[1]);
                    }
                }
                
                if (containerNote !== null && window.starCurrentPagesPublic && window.starCurrentPagesPublic[containerNote] > 1) {
                    hasPageGreaterThanOne = true;
                    activeContainerGroup = group;
                }
            }
        });
        
        // Mettre à jour la visibilité
        if (hasPageGreaterThanOne && activeContainerGroup) {
            // Cacher tous les autres groupes sauf celui actif
            allGroups.forEach(group => {
                if (group === activeContainerGroup) {
                    group.style.display = '';
                } else {
                    group.style.display = 'none';
                }
            });
        } else {
            // Afficher tous les groupes (tous sont sur page 1)
            allGroups.forEach(group => {
                group.style.display = '';
            });
        }
    }
    
    // Mettre à jour la visibilité de tous les conteneurs après le rendu
    updateAllStarContainersVisibility();
    
    if (totalPages > 1) {
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'star-pagination';
        paginationContainer.style.cssText = `
            width: 98%; max-width: 98%; display: flex; justify-content: center; flex-wrap: wrap; gap: 12px;
            margin: 18px auto 0 auto; padding: 8px; overflow-x: auto; box-sizing: border-box;
        `;
        
        for (let p = 1; p <= totalPages; p++) {
            const btn = document.createElement('button');
            btn.textContent = p;
            if (p === page) btn.classList.add('active');
            btn.onclick = () => {
                window.starCurrentPagesPublic[note] = p;
                renderStarContainerPublic(container, note, notesForThisStar, p, maxPage1, cardsPerPageAfter);
            };
            paginationContainer.appendChild(btn);
        }
        
        if (page > 1) {
            const hautBtn = document.createElement('button');
            hautBtn.innerHTML = (window.t && window.t('common.scroll_top')) || '↑ Haut';
            hautBtn.title = (window.t && window.t('common.scroll_top_title')) || 'Remonter en haut de la page';
            hautBtn.style.cssText = 'padding: 10px 20px; border: none; border-radius: 8px; background: #00b894; color: white; font-weight: 600; font-size: 1rem; cursor: pointer; margin-left: 10px;';
            hautBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
            paginationContainer.appendChild(hautBtn);
        }
        
        container.parentNode.insertBefore(paginationContainer, container.nextSibling);
    }
}

// Créer les boutons de tri pour la page utilisateur publique (identique au profil perso)
function createSortButtonsPublic(reviewsSection) {
    // Vérifier si les boutons existent déjà
    if (reviewsSection.querySelector('#sort-btn-container')) {
        return;
    }
    
    // Créer le bouton 'Trier par genre' (traduit + data-i18n pour mise à jour au changement de langue)
    const sortButton = document.createElement('button');
    sortButton.id = 'sort-by-genre-btn';
    sortButton.setAttribute('data-i18n', 'genre_sort');
    sortButton.textContent = (window.t && window.t('genre_sort')) || 'Trier par genre';
    sortButton.style.cssText = `
        background: linear-gradient(135deg, #00b894 0%, #00a085 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px 24px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 184, 148, 0.3);
        margin: 8px auto 8px 0;
        display: inline-block;
    `;

    // === AJOUT BOUTON FILTRAGE PAR TYPE ===
    let typeButton = document.createElement('button');
    typeButton.id = 'filter-by-type-btn';
    // Définir "manga" comme type par défaut
    window.selectedType = 'manga';
    
    // Restaurer le texte du bouton type selon la valeur sauvegardée (traduit)
    const typeTexts = {
        'anime': (window.t && window.t('genre.content_animes')) || 'Anime',
        'manga': (window.t && window.t('genre.content_mangas')) || 'Manga',
        'doujin': (window.t && window.t('collection.type.doujin')) || 'Doujin',
        'manhwa': (window.t && window.t('genre.content_manhwa')) || 'Manhwa',
        'manhua': (window.t && window.t('genre.content_manhua')) || 'Manhua',
        'film': (window.t && window.t('genre.content_films')) || 'Film',
        'tous': (window.t && window.t('collection.type.all')) || 'Tous types'
    };
    typeButton.textContent = typeTexts[window.selectedType] || typeTexts['manga'];
    typeButton.style.cssText = sortButton.style.cssText + 'margin-left: 0; margin-right: 8px;';
    typeButton.style.display = 'inline-block';

    // Menu déroulant pour le bouton type
    let typeMenu = document.createElement('div');
    typeMenu.id = 'filter-by-type-menu';
    typeMenu.style.cssText = `
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 8px;
        background: #23262f;
        color: #00b894;
        font-size: 1rem;
        font-weight: 600;
        border-radius: 12px;
        box-shadow: 0 4px 16px #0002;
        padding: 0.5rem 0;
        min-width: 180px;
        z-index: 10001;
        border: 1.5px solid #00b894;
        text-align: left;
    `;
    var tManga = (window.t && window.t('genre.content_mangas')) || 'Manga';
    var tAnime = (window.t && window.t('genre.content_animes')) || 'Anime';
    var tFilm = (window.t && window.t('genre.content_films')) || 'Film';
    typeMenu.innerHTML = '<div class="type-menu-item" data-type="manga" style="padding: 10px 22px; cursor: pointer;">' + tManga + '</div><div class="type-menu-item" data-type="anime" style="padding: 10px 22px; cursor: pointer;">' + tAnime + '</div><div class="type-menu-item" data-type="film" style="padding: 10px 22px; cursor: pointer;">' + tFilm + '</div>';
    // Mettre en surbrillance l'option correspondant au type actuel
    const currentType = window.selectedType || 'manga';
    typeMenu.querySelectorAll('.type-menu-item').forEach(opt => {
        if (opt.dataset.type === currentType) {
            opt.style.background = '#00b89422';
            opt.style.color = '#00b894';
            opt.style.fontWeight = 'bold';
        }
    });

    // === AJOUT BOUTON ORDRE DÉCROISSANT ===
    let orderButton = document.createElement('button');
    orderButton.id = 'order-desc-btn';
    orderButton.setAttribute('data-order', 'desc');
    let currentOrder = 'desc';
    orderButton.setAttribute('data-i18n-order', 'profile.order_desc');
    orderButton.textContent = (window.t && window.t('profile.order_desc')) || 'Ordre décroissant';
    orderButton.style.cssText = sortButton.style.cssText + 'margin-left: 0; margin-right: 8px;';
    orderButton.style.display = 'inline-block';

    // Menu déroulant pour le bouton ordre
    let orderMenu = document.createElement('div');
    orderMenu.id = 'order-desc-menu';
    orderMenu.style.cssText = `
        display: none;
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        background: #23262f;
        color: #00b894;
        font-size: 1rem;
        font-weight: 600;
        border-radius: 12px;
        box-shadow: 0 4px 16px #0002;
        padding: 0.5rem 0;
        min-width: 180px;
        z-index: 10001;
        border: 1.5px solid #00b894;
        text-align: left;
    `;
    var tOrderDesc = (window.t && window.t('profile.order_desc')) || 'Ordre décroissant';
    var tOrderAsc = (window.t && window.t('profile.order_asc')) || 'Ordre croissant';
    orderMenu.innerHTML = '<div class="order-menu-item" data-order="desc" data-i18n="profile.order_desc" style="padding: 10px 22px; cursor: pointer; background: #00b89422; color: #00b894; font-weight: bold;">' + tOrderDesc + '</div><div class="order-menu-item" data-order="asc" data-i18n="profile.order_asc" style="padding: 10px 22px; cursor: pointer;">' + tOrderAsc + '</div>';
    
    // Barre de recherche pour filtrer les animes dans la section reviews
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = 'position: relative; display: inline-block; width: 250px; max-width: 250px; flex-shrink: 0;';
    
    const searchInput = document.createElement('input');
    searchInput.id = 'profile-search-input-public';
    searchInput.type = 'text';
    searchInput.setAttribute('data-i18n-placeholder', 'search.placeholder.generic');
    searchInput.placeholder = (window.t && window.t('search.placeholder.generic')) || 'Rechercher...';
    searchInput.style.cssText = `
        padding: 12px 40px 12px 16px;
        font-size: 1rem;
        border: 2px solid #00b894;
        border-radius: 12px;
        background: #23262f;
        color: #f5f6fa;
        outline: none;
        transition: all 0.3s ease;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        box-shadow: 0 2px 8px rgba(0, 184, 148, 0.2);
    `;
    searchInput.addEventListener('focus', () => {
        searchInput.style.borderColor = '#00d4aa';
        searchInput.style.boxShadow = '0 4px 12px rgba(0, 184, 148, 0.4)';
    });
    searchInput.addEventListener('blur', () => {
        searchInput.style.borderColor = '#00b894';
        searchInput.style.boxShadow = '0 2px 8px rgba(0, 184, 148, 0.2)';
    });
    
    // Bouton de fermeture (croix)
    const clearButton = document.createElement('button');
    clearButton.innerHTML = '×';
    clearButton.type = 'button';
    clearButton.style.cssText = `
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        color: #00b894;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: none;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
        line-height: 1;
    `;
    clearButton.addEventListener('mouseenter', () => {
        clearButton.style.color = '#00d4aa';
    });
    clearButton.addEventListener('mouseleave', () => {
        clearButton.style.color = '#00b894';
    });
    clearButton.addEventListener('click', (e) => {
        e.stopPropagation();
        searchInput.value = '';
        searchInput.focus();
        
        // Si les résultats étaient dans le container de genre, restaurer la vue genre
        if (window.searchResultsInGenreContainer && typeof window.applyGenreFilterPublic === 'function') {
            window.searchResultsInGenreContainer = false;
            window.applyGenreFilterPublic();
        }
        const existingSearchContainer = document.getElementById('search-results-container-public');
        if (existingSearchContainer) {
            existingSearchContainer.remove();
        }
        performSearchPublic('');
        clearButton.style.display = 'none';
    });
    
    // Afficher/masquer le bouton de fermeture selon le contenu
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query) {
            clearButton.style.display = 'flex';
        } else {
            clearButton.style.display = 'none';
            if (window.searchResultsInGenreContainer && typeof window.applyGenreFilterPublic === 'function') {
                window.searchResultsInGenreContainer = false;
                window.applyGenreFilterPublic();
            }
            requestAnimationFrame(() => {
                const existingSearchContainer = document.getElementById('search-results-container-public');
                if (existingSearchContainer) {
                    existingSearchContainer.remove();
                }
                performSearchPublic('');
            });
        }
        
        // Délai de 500ms avant de lancer la recherche (debounce)
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (query) {
                performSearchPublic(query);
            }
        }, 500);
    });
    
    // Écouter la touche Entrée pour lancer la recherche immédiatement
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            performSearchPublic(e.target.value.trim());
        }
    });
    
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(clearButton);
    
    // Conteneur pour aligner les boutons côte à côte
    const sortBtnContainer = document.createElement('div');
    sortBtnContainer.id = 'sort-btn-container';
    
    // Position normale (pas sticky) - les boutons restent à leur place et passent sous le header lors du scroll
    sortBtnContainer.style.cssText = `display: flex; flex-direction: row; align-items: center; gap: 12px; position: relative; width: fit-content; margin: 2rem auto 0 auto; justify-content: center; z-index: 1002; background: rgba(18, 18, 18, 0.98); backdrop-filter: blur(10px); padding: 1rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);`;
    
    // Créer un conteneur relatif pour le bouton type et son menu
    const typeButtonContainer = document.createElement('div');
    typeButtonContainer.style.cssText = 'position: relative; display: inline-block; z-index: 1001;';
    typeButtonContainer.appendChild(typeButton);
    typeButtonContainer.appendChild(typeMenu);
    
    // Créer un conteneur relatif pour le menu d'ordre
    const orderButtonContainer = document.createElement('div');
    orderButtonContainer.style.cssText = 'position: relative; display: inline-block; z-index: 1001;';
    orderButtonContainer.appendChild(orderButton);
    orderButtonContainer.appendChild(orderMenu);
    
    // Ajouter les éléments dans l'ordre
    sortBtnContainer.appendChild(typeButtonContainer);
    sortBtnContainer.appendChild(orderButtonContainer);
    sortBtnContainer.appendChild(sortButton);
    sortBtnContainer.appendChild(searchContainer);

    // Créer le container de genres
    const genreContainer = document.createElement('div');
    genreContainer.id = 'genre-sort-container';
    genreContainer.style.cssText = `
        display: none;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-start;
        align-items: flex-start;
        align-content: flex-start;
        margin: 20px auto 0px auto;
        padding: 12px 12px;
        position: relative;
        z-index: 1;
        background: #2a2d36;
        border-radius: 16px;
        border: 2px solid #00b89433;
        width: fit-content;
        max-width: 920px;
        min-height: 120px;
        max-height: 0;
        box-sizing: border-box;
        overflow-x: hidden;
        opacity: 0;
        overflow: hidden;
        transition: opacity 0.35s, margin-bottom 0.35s cubic-bezier(.4,2,.6,1);
    `;

    // Liste des genres en noms API (anglais) pour le filtre ; affichage traduit via getTranslatedGenre
    let genres = [
        "Action", "Adventure", "Avant Garde", "Award Winning", "Boys Love", "Comedy", "Drama", "Fantasy", "Girls Love", "Gourmet", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Suspense", "Ecchi", "Erotica", "Hentai", "Adult Cast", "Anthropomorphic", "CGDCT", "Childcare", "Combat Sports", "Crossdressing", "Delinquents", "Detective", "Educational", "Gag Humor", "Gore", "Harem", "High Stakes Game", "Historical", "Idols (Female)", "Idols (Male)", "Isekai", "Iyashikei", "Love Polygon", "Romantic Subtext", "Magical Sex Shift", "Magical Girls", "Martial Arts", "Mecha", "Medical", "Military", "Music", "Mythology", "Organized Crime", "Otaku Culture", "Parody", "Performing Arts", "Pets", "Psychological", "Racing", "Reincarnation", "Reverse Harem", "Samurai", "School", "Showbiz", "Space", "Strategy Game", "Super Power", "Survival", "Team Sports", "Time Travel", "Urban Fantasy", "Vampire", "Video Game", "Villainess", "Visual Arts", "Workplace", "Doujin", "Manhwa", "Manhua"
    ];

    var getTranslatedGenreForDisplay = function(apiGenreName) {
        return (typeof window.getTranslatedGenre === 'function') ? window.getTranslatedGenre(apiGenreName) : (apiGenreName || '');
    };

    genres.forEach(genre => {
        const genreBtn = document.createElement('button');
        genreBtn.textContent = getTranslatedGenreForDisplay(genre);
        genreBtn.setAttribute('data-genre', genre);
        genreBtn.style.cssText = `
            background: #2a2d36;
            color: #00b894;
            border: 2px solid #00b894;
            border-radius: 8px;
            padding: 8px 14px;
            font-size: 1.2rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            margin: 0;
            width: fit-content;
            min-width: fit-content;
            max-width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            box-sizing: border-box;
            text-align: center;
            line-height: 1.4;
            display: inline-block;
        `;
        genreContainer.appendChild(genreBtn);
    });
    
    // Variable globale pour stocker les genres sélectionnés
    window.selectedGenres = [];
    
    // État du conteneur
    let isGenreContainerOpen = false;
    
    // Timer pour fermer automatiquement le container après 3 secondes
    let genreContainerCloseTimer = null;
    
    // Gestion du clic sur le bouton genre
    sortButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Fermer tous les autres menus d'abord
        if (typeMenu) typeMenu.style.display = 'none';
        if (orderMenu) orderMenu.style.display = 'none';
        
        isGenreContainerOpen = !isGenreContainerOpen;
        
        if (isGenreContainerOpen) {
            sortButton.classList.add('genre-open');
            genreContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            genreContainer.style.visibility = 'visible';
            genreContainer.style.display = 'flex';
            genreContainer.style.flexWrap = 'wrap';
            genreContainer.style.justifyContent = 'flex-start';
            genreContainer.style.alignItems = 'flex-start';
            genreContainer.style.alignContent = 'flex-start';
            genreContainer.style.gap = '10px';
            genreContainer.style.opacity = '1';
            genreContainer.style.maxHeight = '50000px';
            genreContainer.style.marginBottom = '110px';
            genreContainer.style.padding = '12px 12px';
            genreContainer.style.width = 'fit-content';
            genreContainer.style.maxWidth = '920px';
            genreContainer.style.marginLeft = 'auto';
            genreContainer.style.marginRight = 'auto';
            genreContainer.style.position = 'relative';
            genreContainer.style.zIndex = '100';
        } else {
            sortButton.classList.remove('genre-open');
            genreContainer.style.display = 'none';
            genreContainer.style.opacity = '0';
            genreContainer.style.maxHeight = '0';
            genreContainer.style.marginBottom = '0';
            genreContainer.style.visibility = 'hidden';
        }
    });
    
    // Gestion des clics sur les boutons de genre
    genreContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const genre = e.target.getAttribute('data-genre') || e.target.textContent;
            const genreBtn = e.target;
            
            console.log('🎯 Clic sur le genre:', genre);
            
            // Genres "type" : un seul peut être sélectionné (Doujin, Manhwa, Manhua) — comme dans le profil perso
            const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
            const isTypeGenre = typeGenres.includes(genre);
            
            // Initialiser selectedGenres s'il n'existe pas
            if (!Array.isArray(window.selectedGenres)) {
                window.selectedGenres = [];
            }
            
            // Vérifier si le genre est déjà sélectionné
            const isSelected = window.selectedGenres.includes(genre);
            
            if (isSelected) {
                // Désélectionner
                window.selectedGenres = window.selectedGenres.filter(g => g !== genre);
                genreBtn.style.background = '#2a2d36';
                genreBtn.style.color = '#00b894';
                genreBtn.style.transform = 'translateY(0)';
                genreBtn.style.boxShadow = '';
                genreBtn.style.border = '2px solid #00b894';
                genreBtn.style.fontWeight = '500';
                
                // Vérifier le nombre de genres restants APRÈS la désélection
                const remainingGenres = window.selectedGenres.length;
                
                // Si plus aucun genre n'est sélectionné ET que le container est ouvert, programmer la fermeture après 3 secondes
                if (remainingGenres === 0 && isGenreContainerOpen) {
                    // Annuler le timer précédent s'il existe
                    if (genreContainerCloseTimer) {
                        clearTimeout(genreContainerCloseTimer);
                        genreContainerCloseTimer = null;
                    }
                    
                    // Programmer la fermeture après 3 secondes
                    genreContainerCloseTimer = setTimeout(() => {
                        // Vérifier qu'aucun genre n'a été sélectionné entre-temps ET que le container est toujours ouvert
                        if (window.selectedGenres.length === 0 && isGenreContainerOpen) {
                            isGenreContainerOpen = false;
                            const sortBtn = document.getElementById('sort-by-genre-btn');
                            if (sortBtn) sortBtn.classList.remove('genre-open');
                            genreContainer.style.display = 'none';
                            genreContainer.style.opacity = '0';
                            genreContainer.style.maxHeight = '0';
                            genreContainer.style.marginBottom = '0';
                            genreContainer.style.visibility = 'hidden';
                            
                            // Mettre à jour l'état des boutons pour les réactiver
                            if (typeof window.updateButtonsStatePublic === 'function') {
                                window.updateButtonsStatePublic();
                            }
                        }
                        genreContainerCloseTimer = null;
                    }, 3000);
                }
            } else {
                // Annuler le timer de fermeture automatique si un genre est sélectionné
                if (genreContainerCloseTimer) {
                    clearTimeout(genreContainerCloseTimer);
                    genreContainerCloseTimer = null;
                }
                
                // Logique d'exclusivité : type genres (un seul) + éventuellement un genre normal (ex: Manhua + Action)
                const currentTypeGenres = window.selectedGenres.filter(g => typeGenres.includes(g));
                const hasTypeGenre = currentTypeGenres.length > 0;
                
                if (isTypeGenre) {
                    // Sélection d'un genre "type" : remplacer tout autre genre "type" (un seul parmi Doujin/Manhwa/Manhua)
                    window.selectedGenres = window.selectedGenres.filter(g => !typeGenres.includes(g));
                    const otherTypeBtns = Array.from(genreContainer.querySelectorAll('button')).filter(btn => btn !== genreBtn && typeGenres.includes(btn.getAttribute('data-genre')));
                    otherTypeBtns.forEach(otherBtn => {
                        otherBtn.style.background = '#2a2d36';
                        otherBtn.style.color = '#00b894';
                        otherBtn.style.transform = 'translateY(0)';
                        otherBtn.style.boxShadow = '';
                        otherBtn.style.border = '2px solid #00b894';
                        otherBtn.style.fontWeight = '500';
                    });
                    window.selectedGenres.push(genre);
                } else {
                    // Sélection d'un genre normal (ex: Action)
                    if (hasTypeGenre) {
                        // Déjà un genre "type" : on peut avoir type + 1 genre normal max → remplacer l'autre genre normal
                        const otherNormalGenres = window.selectedGenres.filter(g => !typeGenres.includes(g));
                        otherNormalGenres.forEach(otherGenre => {
                            window.selectedGenres = window.selectedGenres.filter(g => g !== otherGenre);
                            const otherBtn = Array.from(genreContainer.querySelectorAll('button')).find(btn => btn.getAttribute('data-genre') === otherGenre);
                            if (otherBtn) {
                                otherBtn.style.background = '#2a2d36';
                                otherBtn.style.color = '#00b894';
                                otherBtn.style.transform = 'translateY(0)';
                                otherBtn.style.boxShadow = '';
                                otherBtn.style.border = '2px solid #00b894';
                                otherBtn.style.fontWeight = '500';
                            }
                        });
                        window.selectedGenres.push(genre);
                    } else {
                        // Pas de genre "type" : un seul genre normal (remplacer tous les autres)
                        const previouslySelected = [...window.selectedGenres];
                        previouslySelected.forEach(otherGenre => {
                            const otherBtn = Array.from(genreContainer.querySelectorAll('button')).find(btn => btn.getAttribute('data-genre') === otherGenre);
                            if (otherBtn) {
                                otherBtn.style.background = '#2a2d36';
                                otherBtn.style.color = '#00b894';
                                otherBtn.style.transform = 'translateY(0)';
                                otherBtn.style.boxShadow = '';
                                otherBtn.style.border = '2px solid #00b894';
                                otherBtn.style.fontWeight = '500';
                            }
                        });
                        window.selectedGenres = [genre];
                    }
                }
                
                genreBtn.style.background = '#00b894';
                genreBtn.style.color = 'white';
                genreBtn.style.transform = 'translateY(-2px)';
                genreBtn.style.boxShadow = '0 4px 12px rgba(0, 184, 148, 0.4)';
                genreBtn.style.border = '2px solid #00b894';
                genreBtn.style.fontWeight = '600';
                
                // Ouvrir le container de genres s'il est fermé
                if (!isGenreContainerOpen) {
                    isGenreContainerOpen = true;
                    genreContainer.style.visibility = 'visible';
                    genreContainer.style.display = 'flex';
                    genreContainer.style.flexWrap = 'wrap';
                    genreContainer.style.justifyContent = 'flex-start';
                    genreContainer.style.alignItems = 'flex-start';
                    genreContainer.style.alignContent = 'flex-start';
                    genreContainer.style.gap = '10px';
                    genreContainer.style.opacity = '1';
                    genreContainer.style.maxHeight = '50000px';
                    genreContainer.style.marginBottom = '110px';
                    genreContainer.style.padding = '12px 12px';
                    genreContainer.style.width = 'fit-content';
                    genreContainer.style.maxWidth = '920px';
                    genreContainer.style.marginLeft = 'auto';
                    genreContainer.style.marginRight = 'auto';
                    genreContainer.style.position = 'relative';
                    genreContainer.style.zIndex = '1';
                }
            }
            
            console.log('📋 Genres sélectionnés après clic:', window.selectedGenres);
            
            // Mettre à jour l'état des boutons
            if (typeof window.updateButtonsStatePublic === 'function') {
                console.log('✅ Appel de updateButtonsStatePublic');
                window.updateButtonsStatePublic();
            } else {
                console.error('❌ updateButtonsStatePublic n\'est pas définie');
            }
            
            // Appliquer le filtre par genre
            if (typeof window.applyGenreFilterPublic === 'function') {
                console.log('✅ Appel de applyGenreFilterPublic');
                window.applyGenreFilterPublic();
            } else {
                console.error('❌ applyGenreFilterPublic n\'est pas définie');
            }
        }
    });
    
    // Gestion du menu déroulant du bouton ordre
    orderButton.addEventListener('click', function(e) {
        e.stopPropagation();
        const isCurrentlyOpen = orderMenu.style.display !== 'none' && orderMenu.style.display !== '';
        if (typeMenu) typeMenu.style.display = 'none';
        if (!isCurrentlyOpen) {
            orderMenu.style.display = 'block';
        } else {
            orderMenu.style.display = 'none';
        }
    });
    
    // Gestion des choix du menu ordre
    orderMenu.querySelectorAll('.order-menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            orderMenu.style.display = 'none';
            currentOrder = item.dataset.order;
            orderButton.setAttribute('data-order', currentOrder);
            switch(currentOrder) {
                case 'desc':
                    orderButton.textContent = (window.t && window.t('profile.order_desc')) || 'Ordre décroissant';
                    break;
                case 'asc':
                    orderButton.textContent = (window.t && window.t('profile.order_asc')) || 'Ordre croissant';
                    break;
            }
            orderMenu.querySelectorAll('.order-menu-item').forEach(opt => {
                if(opt.dataset.order === currentOrder) {
                    opt.style.background = '#00b89422';
                    opt.style.color = '#00b894';
                    opt.style.fontWeight = 'bold';
                } else {
                    opt.style.background = '';
                    opt.style.color = '';
                    opt.style.fontWeight = '';
                }
            });
            if (item.dataset.order === 'desc' || item.dataset.order === 'asc') {
                const hasSelectedGenres = Array.isArray(window.selectedGenres) && window.selectedGenres.length > 0;
                const genreFilteredContainerEl = document.getElementById('genre-filtered-container');
                const isGenreContainerVisible = hasSelectedGenres && genreFilteredContainerEl && genreFilteredContainerEl.style.display !== 'none';
                if (isGenreContainerVisible) {
                    window.genreSortOrderPublic = item.dataset.order;
                    if (typeof window.applyGenreFilterPublic === 'function') {
                        window.applyGenreFilterPublic();
                    }
                } else {
                    sortStarContainersPublic(item.dataset.order);
                }
            }
        });
    });
    
    // Gestion du menu déroulant du bouton type
    typeButton.addEventListener('click', function(e) {
        e.stopPropagation();
        
        // Empêcher l'ouverture du menu si des genres sont sélectionnés
        const hasSelectedGenres = Array.isArray(window.selectedGenres) && window.selectedGenres.length > 0;
        const genreContainerEl = document.getElementById('genre-sort-container');
        const isContainerOpen = genreContainerEl && 
            (genreContainerEl.style.display !== 'none' && 
             genreContainerEl.style.visibility !== 'hidden' &&
             genreContainerEl.style.opacity !== '0');
        
        if (hasSelectedGenres || isContainerOpen) {
            e.preventDefault();
            return;
        }
        
        const isCurrentlyOpen = typeMenu.style.display !== 'none' && typeMenu.style.display !== '';
        if (orderMenu) orderMenu.style.display = 'none';
        if (!isCurrentlyOpen) {
            typeMenu.style.display = 'block';
        } else {
            typeMenu.style.display = 'none';
        }
    });
    
    // Gestion des choix du menu type
    typeMenu.querySelectorAll('.type-menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            if (typeMenu) typeMenu.style.display = 'none';
            const type = item.dataset.type;
            window.selectedType = type;
            typeButton.textContent = typeTexts[type] || item.textContent.trim();
            typeMenu.querySelectorAll('.type-menu-item').forEach(opt => {
                if (opt.dataset.type === type) {
                    opt.style.background = '#00b89422';
                    opt.style.color = '#00b894';
                    opt.style.fontWeight = 'bold';
                } else {
                    opt.style.background = '';
                    opt.style.color = '';
                    opt.style.fontWeight = '';
                }
            });
            
            // Réafficher les notes avec le nouveau filtre de type
            displayUserAnimeNotesPublic();
            
            // Réafficher les containers d'étoiles si une recherche était active
            const searchInput = document.getElementById('profile-search-input-public');
            if (searchInput && searchInput.value.trim()) {
                performSearchPublic(searchInput.value.trim());
            }
        });
    });
    
    // Fermer les menus en cliquant ailleurs
    if (!window.menuCloseHandlerAddedPublic) {
        document.addEventListener('click', function(e) {
            const typeButtonEl = document.getElementById('filter-by-type-btn');
            const typeMenuEl = document.getElementById('filter-by-type-menu');
            const orderButtonEl = document.getElementById('order-desc-btn');
            const orderMenuEl = document.getElementById('order-desc-menu');
            const sortButtonEl = document.getElementById('sort-by-genre-btn');
            const genreContainerEl = document.getElementById('genre-sort-container');
            
            const isOnOrderButton = orderButtonEl && (orderButtonEl.contains(e.target) || e.target === orderButtonEl);
            const isOnTypeButton = typeButtonEl && (typeButtonEl.contains(e.target) || e.target === typeButtonEl);
            const isInOrderMenu = orderMenuEl && orderMenuEl.contains(e.target);
            const isInTypeMenu = typeMenuEl && typeMenuEl.contains(e.target);
            const isInGenreContainer = genreContainerEl && genreContainerEl.contains(e.target);
            const isOnGenreButton = sortButtonEl && (sortButtonEl.contains(e.target) || e.target === sortButtonEl);
            
            if (!isOnOrderButton && !isOnTypeButton && !isInOrderMenu && !isInTypeMenu && !isInGenreContainer && !isOnGenreButton) {
                if (typeMenuEl) typeMenuEl.style.display = 'none';
                if (orderMenuEl) orderMenuEl.style.display = 'none';
            }
        }, true);
        
        window.addEventListener('scroll', function() {
            const typeMenuEl = document.getElementById('filter-by-type-menu');
            const orderMenuEl = document.getElementById('order-desc-menu');
            if (typeMenuEl) typeMenuEl.style.display = 'none';
            if (orderMenuEl) orderMenuEl.style.display = 'none';
        }, { passive: true });
        
        window.menuCloseHandlerAddedPublic = true;
    }
    
    // Ajouter le conteneur à la section reviews
    reviewsSection.appendChild(sortBtnContainer);
    reviewsSection.appendChild(genreContainer);
    
    // Au changement de langue : mettre à jour bouton ordre, badges type, synopsis
    if (!window._userProfileLanguageListener) {
        window._userProfileLanguageListener = true;
        document.addEventListener('languageChanged', function() {
            const orderBtn = document.getElementById('order-desc-btn');
            if (orderBtn) {
                const order = orderBtn.getAttribute('data-order') || 'desc';
                orderBtn.textContent = order === 'desc' ? ((window.t && window.t('profile.order_desc')) || 'Ordre décroissant') : ((window.t && window.t('profile.order_asc')) || 'Ordre croissant');
            }
            document.querySelectorAll('.item-type[data-i18n]').forEach(function(span) {
                const key = span.getAttribute('data-i18n');
                if (key && typeof window.t === 'function') span.textContent = window.t(key);
            });
            var genreContainerEl = document.getElementById('genre-sort-container');
            if (genreContainerEl && typeof window.getTranslatedGenre === 'function') {
                genreContainerEl.querySelectorAll('button[data-genre]').forEach(function(btn) {
                    var g = btn.getAttribute('data-genre');
                    if (g) btn.textContent = window.getTranslatedGenre(g);
                });
            }
            var searchInputEl = document.getElementById('profile-search-input-public');
            if (searchInputEl && typeof window.t === 'function') searchInputEl.placeholder = window.t('search.placeholder.generic') || 'Rechercher...';
            if (typeof window.translateSynopses === 'function') window.translateSynopses(localStorage.getItem('mangaWatchLanguage') || 'fr');
        });
    }
    
    // Fonction pour mettre à jour l'état des boutons (type, ordre, recherche)
    window.updateButtonsStatePublic = function() {
        const typeButtonEl = document.getElementById('filter-by-type-btn');
        const orderButtonEl = document.getElementById('order-desc-btn');
        const searchInputEl = document.getElementById('profile-search-input-public');
        const genreContainerEl = document.getElementById('genre-sort-container');
        
        const hasSelectedGenres = Array.isArray(window.selectedGenres) && window.selectedGenres.length > 0;
        const isContainerOpen = genreContainerEl && 
            (genreContainerEl.style.display !== 'none' && 
             genreContainerEl.style.visibility !== 'hidden' &&
             genreContainerEl.style.opacity !== '0');
        
        const shouldDisableType = hasSelectedGenres || isContainerOpen;
        
        // Désactiver/réactiver le bouton type uniquement (pas l'ordre)
        if (typeButtonEl) {
            if (shouldDisableType) {
                typeButtonEl.style.opacity = '0.5';
                typeButtonEl.style.cursor = 'not-allowed';
                typeButtonEl.style.pointerEvents = 'none';
                typeButtonEl.disabled = true;
            } else {
                typeButtonEl.style.opacity = '1';
                typeButtonEl.style.cursor = 'pointer';
                typeButtonEl.style.pointerEvents = 'auto';
                typeButtonEl.disabled = false;
            }
        }
        
        // Le bouton ordre reste toujours actif (pour trier les containers à étoiles OU le container de genre)
        if (orderButtonEl) {
            orderButtonEl.style.opacity = '1';
            orderButtonEl.style.cursor = 'pointer';
            orderButtonEl.style.pointerEvents = 'auto';
            orderButtonEl.disabled = false;
        }
        
        // Ne PAS désactiver la barre de recherche quand un genre est sélectionné (comme page perso :
        // on peut rechercher dans le genre et les résultats s'affichent dans le container de genre)
        if (searchInputEl) {
            searchInputEl.style.opacity = '1';
            searchInputEl.style.cursor = 'text';
            searchInputEl.style.pointerEvents = 'auto';
            searchInputEl.disabled = false;
        }
    };
    
    // Fonction pour appliquer le filtre par genre
    window.applyGenreFilterPublic = function() {
        console.log('🔍 applyGenreFilterPublic appelée avec selectedGenres:', window.selectedGenres);
        
        // Initialiser selectedGenres s'il n'existe pas
        if (!Array.isArray(window.selectedGenres)) {
            window.selectedGenres = [];
        }
        
        // Supprimer l'ancien conteneur de genre s'il existe
        const oldGenreContainer = document.getElementById('genre-filtered-container');
        if (oldGenreContainer) {
            oldGenreContainer.remove();
        }
        
        // Si aucun genre sélectionné, réafficher tous les contenus
        if (window.selectedGenres.length === 0) {
            console.log('📋 Aucun genre sélectionné, réaffichage des containers d\'étoiles');
            
            // NE PAS fermer le container des genres ici - laisser le timer le faire après 3 secondes
            // Le container sera fermé par le timer dans le gestionnaire de clic sur les genres
            
            // Réafficher les conteneurs d'étoiles
            const allContainers = document.querySelector('.all-star-containers');
            if (allContainers) {
                allContainers.style.display = '';
            }
            
            // Réafficher tous les groupes d'étoiles individuels
            const starGroups = document.querySelectorAll('.star-rating-group');
            starGroups.forEach(group => {
                group.style.display = '';
            });
            
            // Mettre à jour le Top 10 (sans genre)
            displayUserAnimeNotesPublic();
            // Mettre à jour l'état des boutons
            if (typeof window.updateButtonsStatePublic === 'function') {
                window.updateButtonsStatePublic();
            }
            return;
        }
        
        // Mettre à jour le Top 10 avec le genre sélectionné AVANT de créer le container filtré
        console.log('📊 Mise à jour du Top 10 pour les genres:', window.selectedGenres.join(', '));
        displayUserAnimeNotesPublic();
        
        console.log('📋 Genres sélectionnés, masquage des conteneurs d\'étoiles');
        console.log('📋 Genres:', window.selectedGenres);
        console.log('📋 Type sélectionné:', window.selectedType);
        
        // Masquer tous les conteneurs d'étoiles
        const allContainers = document.querySelector('.all-star-containers');
        if (allContainers) {
            allContainers.style.display = 'none';
        }
        
        // Masquer aussi tous les groupes d'étoiles individuels
        const starGroups = document.querySelectorAll('.star-rating-group');
        starGroups.forEach(group => {
            group.style.display = 'none';
        });
        
        // Masquer aussi tous les conteneurs d'étoiles individuels
        const allStarContainers = document.querySelectorAll('[id^="star-containers"]');
        allStarContainers.forEach(container => {
            container.style.display = 'none';
        });
        
        // Charger les notes de l'utilisateur
        if (!viewedUserEmail) {
            console.error('❌ viewedUserEmail n\'est pas défini');
            return;
        }
        
        const notesKey = `user_content_notes_${viewedUserEmail}`;
        let notes = [];
        try {
            notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
            console.log(`📚 ${notes.length} notes chargées pour l'utilisateur ${viewedUserEmail}`);
        } catch (e) {
            console.error('Erreur lors du chargement des notes:', e);
            notes = [];
        }
        
        // Filtrer selon le type sélectionné (et inclure manhwa/manhua/doujin si leur genre est sélectionné)
        const selectedType = window.selectedType || 'manga';
        const selectedGenresList = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
        const hasTypeGenreSelected = selectedGenresList.some(g => ['Doujin', 'Manhwa', 'Manhua'].includes(g));
        
        let filteredNotes = notes;
        
        if (selectedType !== 'tous') {
            filteredNotes = notes.filter(note => {
                const noteType = (note.contentType || 'manga').toLowerCase();
                if (selectedType === 'manga') {
                    // Inclure manga + manhwa/manhua/doujin si leur genre est sélectionné (pour afficher dans le container de genre)
                    if (noteType === 'manga') return true;
                    if (hasTypeGenreSelected && noteType === 'manhwa' && selectedGenresList.includes('Manhwa')) return true;
                    if (hasTypeGenreSelected && noteType === 'manhua' && selectedGenresList.includes('Manhua')) return true;
                    if (hasTypeGenreSelected && noteType === 'doujin' && selectedGenresList.includes('Doujin')) return true;
                    return false;
                } else if (selectedType === 'manhwa') {
                    return noteType === 'manhwa';
                } else if (selectedType === 'manhua') {
                    return noteType === 'manhua';
                } else if (selectedType === 'doujin') {
                    return noteType === 'doujin';
                } else if (selectedType === 'anime') {
                    return ['anime', 'tv', 'movie', 'ova', 'ona', 'special', 'music'].includes(noteType);
                } else if (selectedType === 'film') {
                    return ['movie', 'film'].includes(noteType);
                }
                return true;
            });
        }
        
        console.log(`📊 ${filteredNotes.length} notes après filtrage par type`);
        
        // Filtrer selon les genres sélectionnés (Doujin/Manhwa/Manhua : matcher par contentType ou par genre)
        const genreFilteredNotes = filteredNotes.filter(note => {
            let genres = note.genres || [];
            if (!Array.isArray(genres) || genres.length === 0) {
                genres = ["Genre inconnu"];
            }
            
            const noteGenres = genres.map(g => {
                if (typeof g === 'object' && g !== null && g.name) {
                    return String(g.name).toLowerCase().trim();
                }
                return String(g).toLowerCase().trim();
            });
            
            const noteContentType = (note.contentType || '').toLowerCase().trim();
            
            return window.selectedGenres.some(selectedGenre => {
                const normalizedSelected = selectedGenre.toLowerCase().trim();
                // Genres "type" (Doujin, Manhwa, Manhua) : matcher par contentType pour que les cartes apparaissent
                if (['doujin', 'manhwa', 'manhua'].includes(normalizedSelected)) {
                    const contentTypeMatch = noteContentType === normalizedSelected;
                    const genreMatch = noteGenres.some(noteGenre =>
                        noteGenre === normalizedSelected || noteGenre.includes(normalizedSelected) || normalizedSelected.includes(noteGenre)
                    );
                    return contentTypeMatch || genreMatch;
                }
                return noteGenres.some(noteGenre =>
                    noteGenre === normalizedSelected || noteGenre.includes(normalizedSelected) || normalizedSelected.includes(noteGenre)
                );
            });
        });
        
        console.log(`🎯 ${genreFilteredNotes.length} notes après filtrage par genre`);
        
        // IMPORTANT: Le Top 10 reste celui défini par le propriétaire du compte
        // On ne modifie PAS le Top 10, seul le container filtré en dessous change
        
        // Créer le grand conteneur pour les animes filtrés
        const genreFilteredContainer = document.createElement('div');
        genreFilteredContainer.id = 'genre-filtered-container';
        genreFilteredContainer.style.cssText = `
            display: block;
            visibility: visible;
            opacity: 1;
            width: 98%;
            max-width: 1114px;
            margin: 1rem auto;
            box-sizing: border-box;
            position: relative;
            z-index: 1;
        `;
        
        // Ajouter un titre pour indiquer le genre sélectionné
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = `
            width: 98%;
            max-width: 98%;
            text-align: center;
            padding: 2rem 2rem 1rem 2rem;
            color: #00b894;
            font-size: 1.5rem;
            font-weight: bold;
            background: #23262f;
            margin: 1rem auto;
            box-sizing: border-box;
            border-radius: 18px;
        `;
        var typeLabelU = (window.t && window.t('genre.type_label')) || 'Type :';
        var ofGenreU = (window.t && window.t('genre.of_genre')) || 'du genre :';
        var typeText = selectedType && selectedType !== 'tous' ? ' (' + typeLabelU + ' ' + (selectedType === 'manga' ? (window.t && window.t('genre.content_mangas')) : selectedType === 'manhwa' ? (window.t && window.t('genre.content_manhwa')) : selectedType === 'manhua' ? (window.t && window.t('genre.content_manhua')) : selectedType === 'anime' ? (window.t && window.t('genre.content_animes')) : selectedType === 'film' ? (window.t && window.t('genre.content_films')) : selectedType) + ')' : '';
        const selectedGenres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
        const isMangaGenre = selectedGenres.some(g => ['Doujin', 'Manhwa', 'Manhua'].includes(g));
        var contentType = selectedType && selectedType !== 'tous' ? 
            (selectedType === 'manga' || selectedType === 'doujin' ? (window.t && window.t('genre.content_mangas')) || 'Mangas' : 
             selectedType === 'manhwa' ? (window.t && window.t('genre.content_manhwa')) || 'Manhwas' : 
             selectedType === 'manhua' ? (window.t && window.t('genre.content_manhua')) || 'Manhuas' : 
             selectedType === 'anime' ? (window.t && window.t('genre.content_animes')) || 'Animes' : 
             selectedType === 'film' ? (window.t && window.t('genre.content_films')) || 'Films' : 
             isMangaGenre ? (window.t && window.t('genre.content_mangas')) || 'Mangas' : (window.t && window.t('genre.content_contents')) || 'Contenus') : 
            (isMangaGenre ? (window.t && window.t('genre.content_mangas')) || 'Mangas' : (window.t && window.t('genre.content_contents')) || 'Contenus');
        const genresText = selectedGenres.length > 0 ? selectedGenres.join(', ') : ((window.t && window.t('genre.content_all')) || 'Tous');
        titleDiv.textContent = contentType + ' ' + ofGenreU + ' ' + genresText + typeText;
        genreFilteredContainer.appendChild(titleDiv);
        
        // Conteneur pour les cartes avec pagination
        const cardsContainer = document.createElement('div');
        cardsContainer.id = 'genre-cards-container';
        cardsContainer.className = 'genre-filtered-cards';
        cardsContainer.style.cssText = `
            display: flex !important;
            flex-wrap: wrap;
            gap: 15px;
            justify-content: center;
            align-items: flex-start;
            padding: 2rem;
            min-height: 400px;
            width: 100%;
            max-width: 1114px;
            overflow: visible;
            background: #23262f;
            border-radius: 18px;
            margin: 0 auto;
            box-sizing: border-box;
            position: relative;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        genreFilteredContainer.appendChild(cardsContainer);
        
        // Trier les notes par note (ordre décroissant/croissant selon window.genreSortOrderPublic, comme profil perso)
        if (!window.genreSortOrderPublic) window.genreSortOrderPublic = 'desc';
        const sortedNotes = [...genreFilteredNotes].sort((a, b) => {
            let noteA = typeof (a.note ?? a.rating) === 'string' ? parseInt(a.note ?? a.rating, 10) : (a.note ?? a.rating ?? 0);
            let noteB = typeof (b.note ?? b.rating) === 'string' ? parseInt(b.note ?? b.rating, 10) : (b.note ?? b.rating ?? 0);
            noteA = isNaN(noteA) ? 0 : noteA;
            noteB = isNaN(noteB) ? 0 : noteB;
            if (window.genreSortOrderPublic === 'asc') {
                if (noteA !== noteB) return noteA - noteB;
                return (a.addedAt || 0) - (b.addedAt || 0);
            }
            if (noteB !== noteA) return noteB - noteA;
            return (b.addedAt || 0) - (a.addedAt || 0);
        });
        
        // Afficher les cartes avec pagination (même nombre par page que les containers à étoiles page > 1 : 100)
        window.lastGenreFilteredNotesPublic = sortedNotes;
        window.genreContainerCurrentPagePublic = 1;
        if (sortedNotes.length === 0) {
            cardsContainer.innerHTML = '';
            const noResultsMsg = document.createElement('div');
            noResultsMsg.style.cssText = `
                width: 100%;
                text-align: center;
                padding: 3rem;
                color: #00b894;
                font-size: 1.2rem;
                font-weight: 600;
            `;
            noResultsMsg.textContent = `Aucun ${selectedType || 'contenu'} trouvé avec les genres sélectionnés : ${selectedGenres.join(', ')}`;
            cardsContainer.appendChild(noResultsMsg);
        } else {
            // Remplir la première page après avoir ajouté le container au DOM (sinon getElementById ne le trouve pas)
            if (typeof window.renderGenreContainerPagePublic !== 'function') {
                sortedNotes.forEach(note => {
                    const card = createAnimeStarCard(note);
                    cardsContainer.appendChild(card);
                });
            }
        }
        
        // Ajouter le container à la section reviews AVANT d'appeler la pagination
        const reviewsSectionEl = document.getElementById('reviews-section');
        if (reviewsSectionEl) {
            reviewsSectionEl.appendChild(genreFilteredContainer);
            console.log('✅ Container de genres filtrés ajouté à la section reviews');
            // Remplir les cartes (pagination) une fois le container dans le DOM
            if (sortedNotes.length > 0 && typeof window.renderGenreContainerPagePublic === 'function') {
                window.renderGenreContainerPagePublic(1);
            }
        } else {
            console.error('❌ Section reviews non trouvée');
        }
    };
}

// Fonction de recherche pour la page utilisateur publique (même logique que profil perso)
function performSearchPublic(query) {
    const selectedGenresForSearch = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
    const hasGenreForSearch = selectedGenresForSearch.length > 0;
    const genreLabels = selectedGenresForSearch.length > 0 ? selectedGenresForSearch.join(', ') : '';

    if (!query || query.trim() === '') {
        // Si les résultats étaient dans le container de genre, restaurer la vue genre
        if (window.searchResultsInGenreContainer && typeof window.applyGenreFilterPublic === 'function') {
            window.searchResultsInGenreContainer = false;
            window.applyGenreFilterPublic();
        }
        // Supprimer le conteneur de résultats s'il existe
        const searchResultsContainer = document.getElementById('search-results-container-public');
        if (searchResultsContainer) {
            searchResultsContainer.remove();
        }
        // Réafficher les containers d'étoiles SEULEMENT si aucun genre n'est sélectionné
        if (!hasGenreForSearch) {
            document.querySelectorAll('.star-rating-group').forEach(group => {
                group.style.display = '';
            });
        }
        return;
    }

    // Utiliser viewedUserEmail (déjà résolu au chargement, y compris depuis ?pseudo=)
    const userEmail = viewedUserEmail || new URLSearchParams(window.location.search).get('user') || new URLSearchParams(window.location.search).get('email');
    if (!userEmail) return;

    const loadNotes = async (email) => {
        if (typeof window.loadUserNotes === 'function') {
            return await window.loadUserNotes(email);
        }
        const notesKey = 'user_content_notes_' + email;
        try {
            return JSON.parse(localStorage.getItem(notesKey) || '[]');
        } catch (e) {
            return [];
        }
    };

    loadNotes(userEmail).then(notes => {
        const queryLower = query.toLowerCase().trim();
        const selectedType = window.selectedType || 'manga';

        // Filtrer par recherche, type et genre (si genre sélectionné)
        let filteredNotes = notes.filter(note => {
            const title = (note.title || note.titre || '').toLowerCase();
            if (!title.includes(queryLower)) return false;
            const noteType = (note.contentType || 'manga').toLowerCase();
            const noteGenresForType = (note.genres || []).map(g => {
                if (typeof g === 'object' && g !== null && (g.name || g.genre || g.title)) {
                    return String(g.name || g.genre || g.title).toLowerCase().trim();
                }
                return String(g).toLowerCase().trim();
            }).filter(s => s && s !== 'genre inconnu' && s !== 'unknown');
            // Type strict : manga = uniquement manga ; manhwa/manhua/doujin n'apparaissent que si leur type ou genre est sélectionné
            const matchesType = selectedType === 'tous' || 
                (selectedType === 'manga' && noteType === 'manga') ||
                (selectedType === 'manhwa' && (noteType === 'manhwa' || (noteType === 'manga' && noteGenresForType.some(ng => ng === 'manhwa' || ng.includes('manhwa'))))) ||
                (selectedType === 'manhua' && (noteType === 'manhua' || (noteType === 'manga' && noteGenresForType.some(ng => ng === 'manhua' || ng.includes('manhua'))))) ||
                (selectedType === 'doujin' && (noteType === 'doujin' || (noteType === 'manga' && noteGenresForType.some(ng => ng === 'doujin' || ng.includes('doujin'))))) ||
                (selectedType === 'anime' && ['anime', 'tv', 'movie', 'ova', 'ona', 'special', 'music'].includes(noteType)) ||
                (selectedType === 'film' && ['movie', 'film'].includes(noteType));
            if (!matchesType) return false;
            if (hasGenreForSearch) {
                const noteGenres = (note.genres || []).map(g => {
                    if (typeof g === 'object' && g !== null && (g.name || g.genre || g.title)) {
                        return String(g.name || g.genre || g.title).toLowerCase().trim();
                    }
                    return String(g).toLowerCase().trim();
                }).filter(s => s && s !== 'genre inconnu' && s !== 'unknown');
                for (const sg of selectedGenresForSearch) {
                    const sgLower = sg.toLowerCase().trim();
                    if (sgLower === 'doujin' || sgLower === 'manhwa' || sgLower === 'manhua') {
                        // Accepter si contentType correspond OU si manga avec ce genre dans la liste (beaucoup sont stockés en "manga")
                        const typeMatch = noteType === sgLower;
                        const genreMatch = noteGenres.some(ng => ng === sgLower || ng.includes(sgLower) || sgLower.includes(ng));
                        if (!typeMatch && !(noteType === 'manga' && genreMatch)) return false;
                    } else {
                        const match = noteGenres.some(ng => ng === sgLower || ng.includes(sgLower) || sgLower.includes(ng));
                        if (!match) return false;
                    }
                }
            }
            return true;
        });

        const reviewsSection = document.getElementById('reviews-section');

        // Si un genre est sélectionné : afficher les résultats DANS le container de genre (comme profil perso)
        if (hasGenreForSearch) {
            window.searchResultsInGenreContainer = true;
            const oldSearchContainer = document.getElementById('search-results-container-public');
            if (oldSearchContainer) oldSearchContainer.remove();

            let genreFilteredContainer = document.getElementById('genre-filtered-container');
            if (!genreFilteredContainer && reviewsSection) {
                genreFilteredContainer = document.createElement('div');
                genreFilteredContainer.id = 'genre-filtered-container';
                genreFilteredContainer.style.cssText = 'display:block;visibility:visible;opacity:1;width:98%;max-width:1114px;margin:1rem auto;box-sizing:border-box;position:relative;z-index:1000;';
                const titleDiv = document.createElement('div');
                titleDiv.style.cssText = 'width:98%;text-align:center;padding:2rem 2rem 1rem 2rem;color:#00b894;font-size:1.5rem;font-weight:bold;background:#23262f;margin:1rem auto;box-sizing:border-box;border-radius:18px;';
                genreFilteredContainer.appendChild(titleDiv);
                const cardsWrapper = document.createElement('div');
                cardsWrapper.id = 'genre-cards-container';
                cardsWrapper.className = 'genre-filtered-cards';
                cardsWrapper.style.cssText = 'display:flex !important;flex-wrap:wrap;gap:15px;justify-content:center;align-items:flex-start;padding:2rem;min-height:400px;max-width:1114px;width:100%;overflow:visible;background:#23262f;border-radius:18px;margin:0 auto;box-sizing:border-box;position:relative;visibility:visible !important;opacity:1 !important;';
                genreFilteredContainer.appendChild(cardsWrapper);
                reviewsSection.appendChild(genreFilteredContainer);
            }

            if (genreFilteredContainer) {
                genreFilteredContainer.style.display = 'block';
                genreFilteredContainer.style.visibility = 'visible';
                genreFilteredContainer.style.opacity = '1';
                genreFilteredContainer.style.position = 'relative';
                genreFilteredContainer.style.zIndex = '1000';
                const titleEl = genreFilteredContainer.querySelector('div:first-child');
                if (titleEl) {
                    var countStr = filteredNotes.length === 1 ? (window.t && window.t('search.result_one')) : ((window.t && window.t('search.result_many')) || '{n} résultats').replace('{n}', filteredNotes.length);
                    var msg = (window.t && window.t('search.results_for_genre')) || 'Résultats de recherche pour le genre "{genre}" pour "{query}" ({count})';
                    titleEl.textContent = msg.replace('{genre}', genreLabels).replace('{query}', query).replace('{count}', countStr);
                }
                const cardsContainer = genreFilteredContainer.querySelector('#genre-cards-container');
                if (cardsContainer) {
                    const oldPagination = document.getElementById('genre-pagination-public');
                    if (oldPagination) oldPagination.remove();
                    cardsContainer.innerHTML = '';
                    if (filteredNotes.length === 0) {
                        var noResMsg = ((window.t && window.t('search.no_results_genre')) || 'Aucun résultat trouvé pour le genre "{genre}" pour "{query}"').replace('{genre}', genreLabels).replace('{query}', query);
                        cardsContainer.innerHTML = '<div style="width:100%;text-align:center;color:#a5b1c2;padding:3rem;"><p style="font-size:1.2rem;">' + noResMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p></div>';
                    } else {
                        window.lastGenreFilteredNotesPublic = filteredNotes;
                        window.genreContainerCurrentPagePublic = 1;
                        if (typeof window.renderGenreContainerPagePublic === 'function') {
                            window.renderGenreContainerPagePublic(1);
                        } else {
                            filteredNotes.forEach(note => {
                                const card = createAnimeStarCard(note);
                                cardsContainer.appendChild(card);
                            });
                        }
                        setTimeout(function() {
                            if (typeof window.translateSynopses === 'function') {
                                window.translateSynopses(localStorage.getItem('mangaWatchLanguage') || 'fr');
                            }
                        }, 250);
                    }
                }
                // S'assurer que la section reviews est visible et faire défiler vers le conteneur (comme page perso)
                if (reviewsSection) {
                    reviewsSection.style.display = 'block';
                    genreFilteredContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        } else {
            // Aucun genre sélectionné : container de recherche séparé (même structure que page perso)
            window.searchResultsInGenreContainer = false;
            const genreFilteredContainerToHide = document.getElementById('genre-filtered-container');
            if (genreFilteredContainerToHide) {
                genreFilteredContainerToHide.style.display = 'none';
            }
            const oldSearchContainer = document.getElementById('search-results-container-public');
            if (oldSearchContainer) oldSearchContainer.remove();

            const resultsContainer = document.createElement('div');
            resultsContainer.id = 'search-results-container-public';
            resultsContainer.style.cssText = `
                width: 98%;
                max-width: 1114px;
                margin: 1rem auto;
                box-sizing: border-box;
                position: relative;
                z-index: 1000;
            `;
            const titleDiv = document.createElement('div');
            titleDiv.style.cssText = `
                width: 100%;
                text-align: center;
                padding: 2rem 2rem 1rem 2rem;
                color: #00b894;
                font-size: 1.5rem;
                font-weight: bold;
                background: #23262f;
                box-sizing: border-box;
                border-radius: 18px 18px 0 0;
                border-bottom: 2px solid #00b894;
            `;
            var countStr = filteredNotes.length === 1 ? (window.t && window.t('search.result_one')) : ((window.t && window.t('search.result_many')) || '{n} résultats').replace('{n}', filteredNotes.length);
            var msg = (window.t && window.t('search.results_for')) || 'Résultats de recherche pour "{query}" ({count})';
            titleDiv.textContent = msg.replace('{query}', query).replace('{count}', countStr);
            resultsContainer.appendChild(titleDiv);
            const separatorDiv = document.createElement('div');
            separatorDiv.style.cssText = `
                width: 90%;
                max-width: 500px;
                height: 4px;
                background: linear-gradient(90deg, transparent, #00b894, transparent);
                margin: 0 auto 1rem auto;
                border-radius: 2px;
                box-shadow: 0 2px 8px rgba(0, 184, 148, 0.3);
            `;
            resultsContainer.appendChild(separatorDiv);
            const cardsContainer = document.createElement('div');
            cardsContainer.id = 'search-cards-container-public';
            cardsContainer.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                justify-content: center;
                align-items: flex-start;
                padding: 2rem;
                min-height: 400px;
                max-width: 1114px;
                width: 100%;
                margin: 0 auto;
                overflow: visible;
                background: #23262f;
                border-radius: 0 0 18px 18px;
                box-sizing: border-box;
                position: relative;
            `;
            if (filteredNotes.length === 0) {
                var noResMsg = ((window.t && window.t('search.no_results')) || 'Aucun résultat trouvé pour "{query}"').replace('{query}', query);
                cardsContainer.innerHTML = '<div style="width: 100%; text-align: center; color: #a5b1c2; padding: 3rem;"><i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i><p style="font-size: 1.2rem;">' + noResMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p></div>';
            } else {
                filteredNotes.forEach(note => {
                    const card = createAnimeStarCard(note);
                    card.classList.add('search-result-card-public');
                    card.style.flex = '0 0 340px';
                    card.style.width = '340px';
                    card.style.minHeight = '520px';
                    card.style.maxHeight = '520px';
                    cardsContainer.appendChild(card);
                });
                setTimeout(function() {
                    if (typeof window.translateSynopses === 'function') {
                        window.translateSynopses(localStorage.getItem('mangaWatchLanguage') || 'fr');
                    }
                }, 250);
            }
            resultsContainer.appendChild(cardsContainer);

            document.querySelectorAll('.star-rating-group').forEach(group => {
                group.style.display = 'none';
            });
            if (reviewsSection) {
                const genreFilteredContainer = document.getElementById('genre-filtered-container');
                const sortBtnContainer = reviewsSection.querySelector('div[style*="sticky"]');
                if (genreFilteredContainer && genreFilteredContainer.parentNode === reviewsSection) {
                    if (genreFilteredContainer.nextSibling) {
                        reviewsSection.insertBefore(resultsContainer, genreFilteredContainer.nextSibling);
                    } else {
                        reviewsSection.appendChild(resultsContainer);
                    }
                } else if (sortBtnContainer && sortBtnContainer.nextSibling) {
                    reviewsSection.insertBefore(resultsContainer, sortBtnContainer.nextSibling);
                } else {
                    reviewsSection.appendChild(resultsContainer);
                }
            }
        }
    });
}

// Nombre de cartes par page dans le conteneur de genre (même que les containers à étoiles page > 1)
const GENRE_CARDS_PER_PAGE_PUBLIC = 100;

// Rendre une page du conteneur de genre (pagination, comme les containers à étoiles page > 1)
window.renderGenreContainerPagePublic = function(page) {
    const notes = window.lastGenreFilteredNotesPublic;
    if (!notes || !Array.isArray(notes)) return;
    const totalPages = Math.max(1, Math.ceil(notes.length / GENRE_CARDS_PER_PAGE_PUBLIC));
    page = Math.max(1, Math.min(page, totalPages));
    window.genreContainerCurrentPagePublic = page;

    const cardsContainer = document.getElementById('genre-cards-container');
    if (!cardsContainer) return;
    const start = (page - 1) * GENRE_CARDS_PER_PAGE_PUBLIC;
    const end = start + GENRE_CARDS_PER_PAGE_PUBLIC;
    const pageNotes = notes.slice(start, end);

    cardsContainer.innerHTML = '';
    if (pageNotes.length === 0) {
        var noCardsMsg = (window.t && window.t('user_profile.no_cards')) || 'Aucune carte à afficher.';
        cardsContainer.innerHTML = '<div style="width:100%;text-align:center;color:#a5b1c2;padding:3rem;">' + noCardsMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
    } else {
        pageNotes.forEach(note => {
            const card = createAnimeStarCard(note);
            cardsContainer.appendChild(card);
        });
    }

    const genreFilteredContainer = document.getElementById('genre-filtered-container');
    if (!genreFilteredContainer) return;
    let paginationEl = document.getElementById('genre-pagination-public');
    if (totalPages <= 1) {
        if (paginationEl) paginationEl.remove();
        return;
    }
    if (!paginationEl) {
        paginationEl = document.createElement('div');
        paginationEl.id = 'genre-pagination-public';
        paginationEl.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:1rem;padding:1.5rem;flex-wrap:wrap;background:#23262f;border-radius:0 0 18px 18px;margin:0 auto;max-width:1114px;width:100%;box-sizing:border-box;';
        const prevBtn = document.createElement('button');
        prevBtn.textContent = (window.t && window.t('common.pagination_prev')) || 'Précédent';
        prevBtn.className = 'genre-pagination-prev';
        prevBtn.style.cssText = 'padding:10px 20px;border:2px solid #00b894;border-radius:10px;background:#23262f;color:#00b894;font-weight:600;cursor:pointer;transition:all 0.2s;';
        const pageSpan = document.createElement('span');
        pageSpan.className = 'genre-pagination-info';
        pageSpan.style.cssText = 'color:#00b894;font-weight:600;font-size:1rem;';
        const nextBtn = document.createElement('button');
        nextBtn.textContent = (window.t && window.t('common.pagination_next')) || 'Suivant';
        nextBtn.className = 'genre-pagination-next';
        nextBtn.style.cssText = 'padding:10px 20px;border:2px solid #00b894;border-radius:10px;background:#23262f;color:#00b894;font-weight:600;cursor:pointer;transition:all 0.2s;';
        prevBtn.onclick = () => { window.renderGenreContainerPagePublic(window.genreContainerCurrentPagePublic - 1); };
        nextBtn.onclick = () => { window.renderGenreContainerPagePublic(window.genreContainerCurrentPagePublic + 1); };
        paginationEl.appendChild(prevBtn);
        paginationEl.appendChild(pageSpan);
        paginationEl.appendChild(nextBtn);
        genreFilteredContainer.appendChild(paginationEl);
    }
    const prevBtn = paginationEl.querySelector('.genre-pagination-prev');
    const nextBtn = paginationEl.querySelector('.genre-pagination-next');
    const pageSpan = paginationEl.querySelector('.genre-pagination-info');
    if (prevBtn) {
        prevBtn.disabled = page <= 1;
        prevBtn.style.opacity = page <= 1 ? '0.5' : '1';
        prevBtn.style.cursor = page <= 1 ? 'not-allowed' : 'pointer';
    }
    if (nextBtn) {
        nextBtn.disabled = page >= totalPages;
        nextBtn.style.opacity = page >= totalPages ? '0.5' : '1';
        nextBtn.style.cursor = page >= totalPages ? 'not-allowed' : 'pointer';
    }
    if (pageSpan) pageSpan.textContent = `Page ${page} / ${totalPages}`;
};

// Trier les containers d'étoiles par ordre (identique au profil perso)
function sortStarContainersPublic(order) {
    const allGroups = document.querySelectorAll('.star-rating-group');
    const groupsArray = Array.from(allGroups);
    
    if (order === 'desc') {
        // Ordre décroissant : 10, 9, 8, ..., 1
        groupsArray.sort((a, b) => {
            const aContainer = a.querySelector('[id^="star-containers"]');
            const bContainer = b.querySelector('[id^="star-containers"]');
            if (!aContainer || !bContainer) return 0;
            
            const aNote = aContainer.id === 'star-containers' ? 10 : parseInt(aContainer.id.match(/star-containers-(\d+)/)?.[1] || '0');
            const bNote = bContainer.id === 'star-containers' ? 10 : parseInt(bContainer.id.match(/star-containers-(\d+)/)?.[1] || '0');
            return bNote - aNote;
        });
    } else {
        // Ordre croissant : 1, 2, 3, ..., 10
        groupsArray.sort((a, b) => {
            const aContainer = a.querySelector('[id^="star-containers"]');
            const bContainer = b.querySelector('[id^="star-containers"]');
            if (!aContainer || !bContainer) return 0;
            
            const aNote = aContainer.id === 'star-containers' ? 10 : parseInt(aContainer.id.match(/star-containers-(\d+)/)?.[1] || '0');
            const bNote = bContainer.id === 'star-containers' ? 10 : parseInt(bContainer.id.match(/star-containers-(\d+)/)?.[1] || '0');
            return aNote - bNote;
        });
    }
    
    // Réorganiser dans le DOM
    const allContainers = document.querySelector('.all-star-containers');
    if (allContainers) {
        groupsArray.forEach(group => {
            allContainers.appendChild(group);
        });
    }
}

// Créer une carte d'anime pour les containers à étoiles (même style que profil personnel)
function createAnimeStarCard(note) {
    const card = document.createElement('div');
    card.className = 'catalogue-card';
    card.setAttribute('data-anime-id', note.id || note.mal_id || note.malId);
    
    // Marquer le type de la carte
    const contentType = (note.contentType || '').toLowerCase();
    if (['manga', 'doujin', 'manhwa', 'manhua'].includes(contentType) || note.isManga) {
        card.setAttribute('data-is-manga', 'true');
        card.classList.add('manga-card');
    }
    
    // Utiliser exactement le même style que dans profile-anime-cards.js
    card.style.cssText = `
        background: linear-gradient(135deg, #23262f 80%, #00b89422 100%);
        border: 2.5px solid #00b894;
        border-radius: 18px;
        box-shadow: 0 4px 18px #00b89433, 0 2px 8px #0008;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding: 1.1rem 1.1rem 1rem 1.1rem;
        height: 520px;
        width: 340px;
        margin: 0;
        overflow: hidden;
        transition: box-shadow 0.2s, transform 0.2s;
        position: relative;
        flex: 0 0 calc(33.333% - 2rem);
        max-width: 340px;
        width: calc(33.333% - 2rem);
        box-sizing: border-box;
        visibility: visible;
        opacity: 1;
        cursor: pointer;
    `;
    
    // Obtenir les données de l'anime
    const imageUrl = note.image || note.images?.jpg?.large_image_url || note.images?.jpg?.image_url || '/images/default-anime.svg';
    const title = note.titleEnglish || note.title || note.titre || 'Titre inconnu';
    const synopsis = note.synopsis || 'Synopsis non renseigné.';
    const rating = note.note || note.rating || 0;
    
    // Générer les genres (ou utiliser ceux de la note)
    let genres = note.genres || [];
    if (!genres || !Array.isArray(genres) || genres.length === 0) {
        // Générer des genres par défaut selon le titre
        if (title.toLowerCase().includes("death note")) {
            genres = ["Mystère", "Psychologique", "Surnaturel", "Thriller", "Shonen"];
        } else if (title.toLowerCase().includes("attaque des titans")) {
            genres = ["Action", "Drame", "Fantastique", "Shonen"];
        } else if (title.toLowerCase().includes("naruto")) {
            genres = ["Action", "Aventure", "Comédie", "Drame", "Fantastique", "Shonen"];
        } else if (title.toLowerCase().includes("one piece")) {
            genres = ["Action", "Aventure", "Comédie", "Fantastique", "Shonen"];
        } else {
            genres = ["Action", "Aventure"];
        }
    }
    
    const genresHtml = genres.map(g => {
        const displayG = (typeof window.getTranslatedGenre === 'function' ? window.getTranslatedGenre(g) : g);
        const fontSize = genres.length >= 5 ? '0.75rem' : '0.92rem';
        const padding = genres.length >= 5 ? '0.1em 0.4em' : '0.15em 0.6em';
        return `<a href="manga-database.html?genre=${encodeURIComponent(g)}" class="profile-genre-link" style="background:#00b89422;color:#00b894;font-weight:600;padding:${padding};border-radius:10px;font-size:${fontSize};letter-spacing:0.01em;text-decoration:none;transition:background 0.2s;" 
        onclick="event.preventDefault();window.location.href='manga-database.html?genre=${encodeURIComponent(g)}';">${displayG}</a>`;
    }).join('');
    
    // Utiliser la fonction truncateSynopsis si disponible, sinon créer une version simplifiée
    function truncateSynopsis(text, maxLength = 150) {
        if (!text) return '';
        let cleanText = text.replace(/\s+/g, ' ').trim();
        if (cleanText.length <= maxLength) return cleanText;
        let truncated = cleanText.substring(0, maxLength);
        const lastSpaceIndex = truncated.lastIndexOf(' ');
        if (lastSpaceIndex > maxLength * 0.8) {
            truncated = truncated.substring(0, lastSpaceIndex);
        }
        return truncated + '...';
    }
    
    // Générer le lien de la page
    const animeId = note.id || note.mal_id || note.malId;
    const pageHtml = animeId ? `anime-details.html?id=${animeId}&season=1` : '#';
    
    // Créer le HTML exactement comme dans profile-anime-cards.js
    card.innerHTML = `
        <img src="${imageUrl}" alt="${title}" style="width:140px;height:185px;object-fit:cover;display:block;object-position:center center;margin:0 auto 1rem auto;border-radius:10px;box-shadow:0 2px 12px #00b89455;align-self:center;" onerror="this.onerror=null; this.src='/images/default-anime.svg';">
        <a href="${pageHtml}" style="font-size:1.15rem;margin-bottom:0.5rem;color:#00b894;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;display:block;transition:color 0.2s;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" onmouseover="this.style.color='#00d4aa'" onmouseout="this.style.color='#00b894'">${title}</a>
        <div class="content-synopsis profile-card-synopsis" style="color:#b3e6b3;font-size:0.98rem;line-height:1.5;text-align:center;margin-bottom:0.7rem;">${truncateSynopsis(synopsis)}</div>
        <div class="anime-genres" style="display:flex;flex-wrap:wrap;gap:0.3rem;justify-content:center;margin-bottom:0.5rem;">
            ${genresHtml}
        </div>
        <div style="color:#00b894;font-size:1.1rem;font-weight:bold;text-align:center;">
            ${(window.t && window.t('profile.rating_label')) || 'Note'}: ${rating}/10
        </div>
    `;
    
    // Ajouter un écouteur de clic sur la carte entière
    card.addEventListener('click', function(e) {
        // Ne pas rediriger si on clique sur un lien
        if (e.target.tagName === 'A' || e.target.closest('a')) {
            return;
        }
        if (animeId) {
            window.location.href = pageHtml;
        }
    });
    
    // Effet hover
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
        this.style.boxShadow = '0 6px 24px #00b89444, 0 4px 12px #0008';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 18px #00b89433, 0 2px 8px #0008';
    });
    
    return card;
}

function loadUserTierLists() {
    const container = document.getElementById('tierlist-section');
    if (container) {
        const tierListsDiv = container.querySelector('.tier-lists');
        if (tierListsDiv) {
            tierListsDiv.innerHTML = `
                <p style="color: #a5b1c2; text-align: center; padding: 2rem;">
                    Les tier lists de cet utilisateur seront affichées ici.
                </p>
            `;
        }
    }
}

// ========== SYSTÈME D'ABONNEMENTS ==========

// Fonction pour obtenir les abonnements d'un utilisateur
function getUserFollowings(userEmail) {
    const key = 'user_followings_' + userEmail;
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        return [];
    }
}

// Fonction pour obtenir les abonnés d'un utilisateur
function getUserFollowers(userEmail) {
    const key = 'user_followers_' + userEmail;
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        return [];
    }
}

// Fonction pour sauvegarder les abonnements d'un utilisateur
function saveUserFollowings(userEmail, followings) {
    const key = 'user_followings_' + userEmail;
    localStorage.setItem(key, JSON.stringify(followings));
}

// Fonction pour sauvegarder les abonnés d'un utilisateur
function saveUserFollowers(userEmail, followers) {
    const key = 'user_followers_' + userEmail;
    localStorage.setItem(key, JSON.stringify(followers));
}

// Fonction pour vérifier si l'utilisateur actuel suit un autre utilisateur
function isFollowing(currentUserEmail, targetUserEmail) {
    const followings = getUserFollowings(currentUserEmail);
    return followings.includes(targetUserEmail);
}

// Fonction pour s'abonner à un utilisateur
function followUser(currentUserEmail, targetUserEmail) {
    // Ajouter à la liste des abonnements de l'utilisateur actuel
    const followings = getUserFollowings(currentUserEmail);
    if (!followings.includes(targetUserEmail)) {
        followings.push(targetUserEmail);
        saveUserFollowings(currentUserEmail, followings);
    }
    
    // Ajouter à la liste des abonnés de l'utilisateur cible
    const followers = getUserFollowers(targetUserEmail);
    if (!followers.includes(currentUserEmail)) {
        followers.push(currentUserEmail);
        saveUserFollowers(targetUserEmail, followers);
    }
}

// Fonction pour se désabonner d'un utilisateur
function unfollowUser(currentUserEmail, targetUserEmail) {
    // Retirer de la liste des abonnements de l'utilisateur actuel
    const followings = getUserFollowings(currentUserEmail);
    const index = followings.indexOf(targetUserEmail);
    if (index > -1) {
        followings.splice(index, 1);
        saveUserFollowings(currentUserEmail, followings);
    }
    
    // Retirer de la liste des abonnés de l'utilisateur cible
    const followers = getUserFollowers(targetUserEmail);
    const followerIndex = followers.indexOf(currentUserEmail);
    if (followerIndex > -1) {
        followers.splice(followerIndex, 1);
        saveUserFollowers(targetUserEmail, followers);
    }
}

// Remplacer la zone abonnés/abonnements par "Privé" (appelé quand hideFollows est confirmé)
function applyHideFollowsUI(targetUserEmail) {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const isOwnProfile = currentUser && currentUser.email === targetUserEmail;
    if (isOwnProfile) return;
    const profileFollowStats = document.getElementById('profile-follow-stats');
    if (!profileFollowStats) return;
    profileFollowStats.innerHTML = `
        <div class="follow-stat-item" style="cursor: pointer; opacity: 0.9;">
            <i class="fas fa-lock" style="font-size: 1.2rem; margin-right: 6px;"></i>
            <span class="follow-stat-label">Privé</span>
        </div>
    `;
    profileFollowStats.style.pointerEvents = 'auto';
    profileFollowStats.onclick = function() {
        const modal = document.getElementById('follow-modal');
        const overlay = document.getElementById('follow-modal-overlay');
        const title = document.getElementById('follow-modal-title');
        const content = document.getElementById('follow-modal-content');
        if (modal && overlay && title && content) {
            title.textContent = 'Abonnés / Abonnements';
            content.innerHTML = `
                <div class="follow-list-empty">
                    <i class="fas fa-lock"></i>
                    <p>Cet utilisateur a choisi de masquer ses abonnés et abonnements.</p>
                </div>
            `;
            modal.classList.add('active');
            overlay.classList.add('active');
        }
    };
}

// Attendre que profileSettingsService soit disponible (module Firebase chargé)
function waitForProfileSettingsService(maxWaitMs) {
    return new Promise((resolve) => {
        if (window.profileSettingsService && typeof window.profileSettingsService.getHideFollows === 'function') {
            resolve(true);
            return;
        }
        const start = Date.now();
        const interval = setInterval(() => {
            if (window.profileSettingsService && typeof window.profileSettingsService.getHideFollows === 'function') {
                clearInterval(interval);
                resolve(true);
                return;
            }
            if (Date.now() - start >= (maxWaitMs || 3500)) {
                clearInterval(interval);
                resolve(false);
            }
        }, 100);
    });
}

// Fonction pour initialiser le système d'abonnements
async function initFollowSystem(targetUserEmail) {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const isOwnProfile = currentUser && currentUser.email === targetUserEmail;

    // Récupérer le paramètre "masquer abonnements" (Firebase obligatoire pour le profil public)
    let hideFollows = false;
    if (isOwnProfile) {
        hideFollows = localStorage.getItem('hide_follows_' + targetUserEmail) === 'true';
    } else {
        // Profil public : attendre le chargement du module Firebase puis lire dans Firebase
        const serviceReady = await waitForProfileSettingsService(3500);
        if (serviceReady) {
            try {
                hideFollows = await window.profileSettingsService.getHideFollows(targetUserEmail);
            } catch (e) {
                hideFollows = false;
            }
        }
        // Si le service n'est pas prêt après le délai, on ne suppose pas false : réessayer une fois en différé
        if (!serviceReady) {
            setTimeout(async () => {
                const ok = await waitForProfileSettingsService(2000);
                if (ok) {
                    try {
                        const hide = await window.profileSettingsService.getHideFollows(targetUserEmail);
                        if (hide) applyHideFollowsUI(targetUserEmail);
                    } catch (e) {}
                }
            }, 500);
        }
    }

    const profileFollowStats = document.getElementById('profile-follow-stats');
    if (hideFollows && !isOwnProfile && profileFollowStats) {
        profileFollowStats.innerHTML = `
            <div class="follow-stat-item" style="cursor: default; opacity: 0.9;">
                <i class="fas fa-lock" style="font-size: 1.2rem; margin-right: 6px;"></i>
                <span class="follow-stat-label">Privé</span>
            </div>
        `;
        profileFollowStats.style.pointerEvents = 'auto';
        profileFollowStats.onclick = function() {
            const modal = document.getElementById('follow-modal');
            const overlay = document.getElementById('follow-modal-overlay');
            const title = document.getElementById('follow-modal-title');
            const content = document.getElementById('follow-modal-content');
            if (modal && overlay && title && content) {
                title.textContent = 'Abonnés / Abonnements';
                content.innerHTML = `
                    <div class="follow-list-empty">
                        <i class="fas fa-lock"></i>
                        <p>Cet utilisateur a choisi de masquer ses abonnés et abonnements.</p>
                    </div>
                `;
                modal.classList.add('active');
                overlay.classList.add('active');
            }
        };
    } else {
        // Obtenir les compteurs
        const followers = getUserFollowers(targetUserEmail);
        const followings = getUserFollowings(targetUserEmail);

        // Mettre à jour les compteurs
        const followersCountEl = document.getElementById('followers-count');
        const followingCountEl = document.getElementById('following-count');

        if (followersCountEl) {
            followersCountEl.textContent = followers.length;
        }
        if (followingCountEl) {
            followingCountEl.textContent = followings.length;
        }
    }
    
    // Gérer le bouton d'abonnement
    const followBtn = document.getElementById('profile-follow-btn');
    if (followBtn) {
        // Afficher le bouton seulement si l'utilisateur est connecté et qu'il ne consulte pas son propre profil
        if (currentUser && currentUser.email && currentUser.email !== targetUserEmail) {
            followBtn.style.display = 'inline-flex';
            
            // Vérifier si on suit déjà cet utilisateur
            const isCurrentlyFollowing = isFollowing(currentUser.email, targetUserEmail);
            
            if (isCurrentlyFollowing) {
                followBtn.classList.add('following');
                followBtn.innerHTML = '<i class="fas fa-user-check"></i><span id="follow-btn-text">' + ((window.t && window.t('profile.subscribed')) || 'Abonné') + '</span>';
            } else {
                followBtn.classList.remove('following');
                followBtn.innerHTML = '<i class="fas fa-user-plus"></i><span id="follow-btn-text">' + ((window.t && window.t('profile.subscribe')) || 'S\'abonner') + '</span>';
            }
            
            // Gérer le clic sur le bouton
            followBtn.onclick = function() {
                if (!currentUser || !currentUser.email) {
                    alert('Vous devez être connecté pour vous abonner à un utilisateur.');
                    return;
                }
                
                const isCurrentlyFollowing = isFollowing(currentUser.email, targetUserEmail);
                
                if (isCurrentlyFollowing) {
                    unfollowUser(currentUser.email, targetUserEmail);
                    followBtn.classList.remove('following');
                    followBtn.innerHTML = '<i class="fas fa-user-plus"></i><span id="follow-btn-text">' + ((window.t && window.t('profile.subscribe')) || 'S\'abonner') + '</span>';
                } else {
                    followUser(currentUser.email, targetUserEmail);
                    followBtn.classList.add('following');
                    followBtn.innerHTML = '<i class="fas fa-user-check"></i><span id="follow-btn-text">' + ((window.t && window.t('profile.subscribed')) || 'Abonné') + '</span>';
                }
                
                // Mettre à jour l'affichage
                initFollowSystem(targetUserEmail);
            };
        } else {
            followBtn.style.display = 'none';
        }
    }
    
    // Fonction pour obtenir le paramètre de confidentialité
    function getHideFollowsSetting(userEmail) {
        const key = 'hide_follows_' + userEmail;
        return localStorage.getItem(key) === 'true';
    }
    
    // Fonction pour obtenir les informations d'un utilisateur depuis son email
    function getUserInfoFromEmail(email) {
        const profileData = localStorage.getItem('profile_' + email);
        if (profileData) {
            try {
                return JSON.parse(profileData);
            } catch (e) {
                return null;
            }
        }
        return null;
    }
    
    // Fonction pour ouvrir le popup des abonnés/abonnements
    function openFollowModal(type, userEmail) {
        const modal = document.getElementById('follow-modal');
        const overlay = document.getElementById('follow-modal-overlay');
        const title = document.getElementById('follow-modal-title');
        const content = document.getElementById('follow-modal-content');
        
        if (!modal || !overlay || !title || !content) return;
        
        const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        const isOwnProfile = currentUser && currentUser.email === userEmail;
        const hideFollows = getHideFollowsSetting(userEmail);
        
        // Vérifier la confidentialité (seulement pour les autres utilisateurs)
        if (!isOwnProfile && hideFollows) {
            title.textContent = type === 'followers' ? (window.t && window.t('profile.followers_modal_title')) || 'Abonnés' : (window.t && window.t('profile.following_modal_title')) || 'Abonnements';
            var hiddenMsg = type === 'followers' ? ((window.t && window.t('profile.follows_hidden_followers')) || 'Cet utilisateur a choisi de masquer ses abonnés.') : ((window.t && window.t('profile.follows_hidden_following')) || 'Cet utilisateur a choisi de masquer ses abonnements.');
            content.innerHTML = '<div class="follow-list-empty"><i class="fas fa-lock"></i><p>' + hiddenMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p></div>';
            modal.classList.add('active');
            overlay.classList.add('active');
            return;
        }
        
        let list = [];
        if (type === 'followers') {
            list = getUserFollowers(userEmail);
            title.textContent = (window.t && window.t('profile.followers_modal_title')) || 'Abonnés';
        } else {
            list = getUserFollowings(userEmail);
            title.textContent = (window.t && window.t('profile.following_modal_title')) || 'Abonnements';
        }
        
        if (list.length === 0) {
            content.innerHTML = `
                <div class="follow-list-empty">
                    <i class="fas fa-user-slash"></i>
                    <p>Aucun ${type === 'followers' ? 'abonné' : 'abonnement'} pour le moment.</p>
                </div>
            `;
        } else {
            const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
            content.innerHTML = list.map(email => {
                const userInfo = getUserInfoFromEmail(email);
                const userName = userInfo?.name || userInfo?.username || email.split('@')[0];
                const avatarKey = 'avatar_' + email;
                const avatar = localStorage.getItem(avatarKey) || userInfo?.picture || userInfo?.customAvatar || '';
                
                // Vérifier si l'utilisateur actuel suit cet utilisateur
                const isCurrentlyFollowing = currentUser && currentUser.email && isFollowing(currentUser.email, email);
                const isOwnProfile = currentUser && currentUser.email === email;
                
                // Afficher le bouton seulement si ce n'est pas son propre profil
                let actionButton = '';
                if (!isOwnProfile && currentUser && currentUser.email) {
                    if (isCurrentlyFollowing) {
                        var subLabel = (window.t && window.t('profile.subscribed')) || 'Abonné';
                        actionButton = '<div class="follow-list-item-action"><button class="follow-list-item-btn following" data-email="' + email.replace(/"/g, '&quot;') + '" onclick="event.stopPropagation(); handleFollowTogglePublic(\'' + email.replace(/'/g, "\\'") + '\')"><i class="fas fa-user-check"></i> ' + subLabel.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</button></div>';
                    } else {
                        var subLabel2 = (window.t && window.t('profile.subscribe')) || 'S\'abonner';
                        actionButton = '<div class="follow-list-item-action"><button class="follow-list-item-btn follow" data-email="' + email.replace(/"/g, '&quot;') + '" onclick="event.stopPropagation(); handleFollowTogglePublic(\'' + email.replace(/'/g, "\\'") + '\')"><i class="fas fa-user-plus"></i> ' + subLabel2.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</button></div>';
                    }
                }
                
                return `
                    <div class="follow-list-item">
                        <img src="${avatar}" alt="${userName}" class="follow-list-item-avatar" onclick="window.location.href='user-profile.html?user=${encodeURIComponent(email)}'" onerror="this.src=''">
                        <div class="follow-list-item-info" onclick="window.location.href='user-profile.html?user=${encodeURIComponent(email)}'">
                            <div class="follow-list-item-name">${userName}</div>
                            <div class="follow-list-item-email">${email}</div>
                        </div>
                        ${actionButton}
                    </div>
                `;
            }).join('');
        }
        
        modal.classList.add('active');
        overlay.classList.add('active');
    }
    
    // Fonction pour fermer le popup
    function closeFollowModal() {
        const modal = document.getElementById('follow-modal');
        const overlay = document.getElementById('follow-modal-overlay');
        if (modal) modal.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
    
    // Gérer les clics sur les compteurs pour afficher les listes
    const followersStat = document.getElementById('followers-stat');
    const followingStat = document.getElementById('following-stat');
    
    if (followersStat) {
        followersStat.onclick = function() {
            openFollowModal('followers', targetUserEmail);
        };
    }
    
    if (followingStat) {
        followingStat.onclick = function() {
            openFollowModal('following', targetUserEmail);
        };
    }
    
    // Fonction pour gérer l'abonnement/désabonnement depuis le popup (version publique)
    window.handleFollowTogglePublic = function(targetEmail) {
        const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (!currentUser || !currentUser.email) {
            alert('Vous devez être connecté pour vous abonner à un utilisateur.');
            return;
        }
        
        const isCurrentlyFollowing = isFollowing(currentUser.email, targetEmail);
        const button = document.querySelector(`.follow-list-item-btn[data-email="${targetEmail}"]`);
        
        if (isCurrentlyFollowing) {
            // Se désabonner
            unfollowUser(currentUser.email, targetEmail);
            if (button) {
                button.className = 'follow-list-item-btn follow';
                button.innerHTML = '<i class="fas fa-user-plus"></i> S\'abonner';
            }
        } else {
            // S'abonner
            followUser(currentUser.email, targetEmail);
            if (button) {
                button.className = 'follow-list-item-btn following';
                button.innerHTML = '<i class="fas fa-user-check"></i> Abonné';
            }
        }
        
        // Mettre à jour les compteurs dans le header
        initFollowSystem(targetUserEmail);
        
        // Ne pas recharger la liste immédiatement
        // L'utilisateur reste visible avec le bouton mis à jour
        // La liste sera mise à jour lors de la prochaine ouverture du popup
    };
    
    // Gérer la fermeture du popup
    const followModalClose = document.getElementById('follow-modal-close');
    const followModalOverlay = document.getElementById('follow-modal-overlay');
    
    if (followModalClose) {
        followModalClose.onclick = closeFollowModal;
    }
    
    if (followModalOverlay) {
        followModalOverlay.onclick = closeFollowModal;
    }
}

// Gestion du système de signalement
document.addEventListener('DOMContentLoaded', function() {
    const reportBtn = document.getElementById('profile-report-btn');
    const reportModal = document.getElementById('report-modal');
    const reportModalClose = document.getElementById('report-modal-close');
    const reportReasons = document.querySelectorAll('input[name="report-reason"]');
    const reportComment = document.getElementById('report-comment');
    const reportCommentText = document.getElementById('report-comment-text');
    const reportSubmitBtn = document.getElementById('report-submit-btn');
    const reportBlockBtn = document.getElementById('report-block-btn');
    
    // Ouvrir le modal de signalement
    if (reportBtn) {
        reportBtn.addEventListener('click', function() {
            if (reportModal) {
                reportModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        });
    }
    
    // Fermer le modal
    if (reportModalClose) {
        reportModalClose.addEventListener('click', function() {
            if (reportModal) {
                reportModal.style.display = 'none';
                document.body.style.overflow = 'auto';
                // Réinitialiser le formulaire
                reportReasons.forEach(radio => radio.checked = false);
                if (reportCommentText) reportCommentText.value = '';
                if (reportComment) reportComment.style.display = 'none';
            }
        });
    }
    
    // Fermer en cliquant à l'extérieur
    if (reportModal) {
        reportModal.addEventListener('click', function(e) {
            if (e.target === reportModal) {
                reportModal.style.display = 'none';
                document.body.style.overflow = 'auto';
                // Réinitialiser le formulaire
                reportReasons.forEach(radio => radio.checked = false);
                if (reportCommentText) reportCommentText.value = '';
                if (reportComment) reportComment.style.display = 'none';
            }
        });
    }
    
    // Afficher le champ commentaire si "Autre" est sélectionné
    if (reportReasons.length > 0) {
        reportReasons.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'other' && reportComment) {
                    reportComment.style.display = 'block';
                } else if (reportComment) {
                    reportComment.style.display = 'none';
                    if (reportCommentText) reportCommentText.value = '';
                }
            });
        });
    }
    
    // Soumettre le signalement
    if (reportSubmitBtn) {
        reportSubmitBtn.addEventListener('click', function() {
            const selectedReason = document.querySelector('input[name="report-reason"]:checked');
            if (!selectedReason) {
                alert('Veuillez sélectionner une raison');
                return;
            }
            
            const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
            if (!currentUser || !currentUser.email) {
                alert('Vous devez être connecté pour signaler');
                return;
            }
            
            const reportedUserEmail = viewedUserEmail;
            if (!reportedUserEmail) {
                alert('Erreur: utilisateur introuvable');
                return;
            }
            
            // Sauvegarder le signalement
            const reports = JSON.parse(localStorage.getItem('user_reports') || '[]');
            const report = {
                reportedBy: currentUser.email,
                reportedUser: reportedUserEmail,
                reason: selectedReason.value,
                comment: reportCommentText ? reportCommentText.value.trim() : '',
                date: new Date().toISOString()
            };
            
            reports.push(report);
            localStorage.setItem('user_reports', JSON.stringify(reports));
            
            // Fermer le modal
            if (reportModal) {
                reportModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
            
            // Afficher une confirmation
            showNotification('Signalement envoyé. Merci pour votre retour.', 'success');
            
            // Réinitialiser le formulaire
            reportReasons.forEach(radio => radio.checked = false);
            if (reportCommentText) reportCommentText.value = '';
            if (reportComment) reportComment.style.display = 'none';
        });
    }
    
    // Bloquer l'utilisateur
    if (reportBlockBtn) {
        reportBlockBtn.addEventListener('click', function() {
            const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
            if (!currentUser || !currentUser.email) {
                alert('Vous devez être connecté pour bloquer');
                return;
            }
            
            const blockedUserEmail = viewedUserEmail;
            if (!blockedUserEmail) {
                alert('Erreur: utilisateur introuvable');
                return;
            }
            
            // Ajouter à la liste des utilisateurs bloqués
            const blockedUsers = JSON.parse(localStorage.getItem('blocked_users_' + currentUser.email) || '[]');
            if (!blockedUsers.includes(blockedUserEmail)) {
                blockedUsers.push(blockedUserEmail);
                localStorage.setItem('blocked_users_' + currentUser.email, JSON.stringify(blockedUsers));
                
                // Rediriger vers l'accueil
                showNotification('Utilisateur bloqué avec succès.', 'success');
                setTimeout(() => {
                    window.location.href = 'acceuil.html';
                }, 1500);
            } else {
                alert('Cet utilisateur est déjà bloqué');
            }
        });
    }
});

// Fonction pour afficher une notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10001;
        animation: slideIn 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.background = '#00b894';
    } else if (type === 'error') {
        notification.style.background = '#e17055';
    } else {
        notification.style.background = '#74b9ff';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
