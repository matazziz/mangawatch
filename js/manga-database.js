// Configuration
const API_BASE_URL = 'https://api.jikan.moe/v4';
const ITEMS_PER_PAGE = 25; // Limite maximale qui fonctionne avec l'API Jikan

// Fonction pour nettoyer le synopsis en supprimant les mentions MAL rewrite
function cleanSynopsis(synopsis) {
    if (!synopsis) return null;
    
    // Supprimer les variations de "écrit par MAL rewrite" dans différentes langues
    const malRewritePatterns = [
        /écrit par MAL rewrite/i,
        /written by MAL rewrite/i,
        /geschrieben von MAL rewrite/i,
        /escrito por MAL rewrite/i,
        /scritto da MAL rewrite/i,
        /MAL rewriteによって書かれた/i,
        /écrit par MAL/i,
        /written by MAL/i,
        /geschrieben von MAL/i,
        /escrito por MAL/i,
        /scritto da MAL/i,
        /MALによって書かれた/i
    ];
    
    let cleanedSynopsis = synopsis;
    malRewritePatterns.forEach(pattern => {
        cleanedSynopsis = cleanedSynopsis.replace(pattern, '');
    });
    
    // Supprimer les mentions de sources (Wikipedia, etc.) à la fin
    const sourcePatterns = [
        /\s*\(?\s*[Ss]ource\s*:?\s*[Ww]ikipedia[^)]*\)?\s*$/i,
        /\s*\(?\s*[Ss]ource\s*:?\s*[Ww]ikipedia\.org[^)]*\)?\s*$/i,
        /\s*\(?\s*[Ss]ource\s*:?\s*[Ww]ikipedia\.com[^)]*\)?\s*$/i,
        /\s*\(?\s*[Ss]ource\s*:?\s*[Ww]ikipedia\.fr[^)]*\)?\s*$/i,
        /\s*\(?\s*[Ss]ource\s*:?\s*[Ww]ikipedia\.en[^)]*\)?\s*$/i,
        /\s*\(?\s*[Ss]ource\s*:?\s*[Ww]ikipedia\.ja[^)]*\)?\s*$/i,
        /\s*\(?\s*[Ff]rom\s+[Ww]ikipedia[^)]*\)?\s*$/i,
        /\s*\(?\s*[Vv]ia\s+[Ww]ikipedia[^)]*\)?\s*$/i,
        /\s*\(?\s*[Ww]ikipedia[^)]*\)?\s*$/i,
        /\s*\[[Ss]ource\s*:?\s*[Ww]ikipedia[^\]]*\]\s*$/i,
        /\s*\[[Ww]ikipedia[^\]]*\]\s*$/i,
        /\s*\(?\s*[Ss]ource\s*:?\s*[^)]+\)?\s*$/i,  // Source générique à la fin
        /\s*\[[Ss]ource\s*:?\s*[^\]]+\]\s*$/i,  // Source générique entre crochets
    ];
    
    sourcePatterns.forEach(pattern => {
        cleanedSynopsis = cleanedSynopsis.replace(pattern, '');
    });
    
    // Nettoyer les espaces en trop et la ponctuation
    cleanedSynopsis = cleanedSynopsis.trim();
    
    // Supprimer les caractères résiduels à la fin
    const residualPatterns = [
        /[.,;:!?]+$/,  // Ponctuation finale
        /\[\s*\]$/,     // Crochets vides
        /\(\s*\)$/,     // Parenthèses vides
        /\{\s*\}$/,     // Accolades vides
        /\[\s*$/,       // Crochet ouvrant seul
        /\]\s*$/,       // Crochet fermant seul
        /\(\s*$/,       // Parenthèse ouvrante seule
        /\)\s*$/,       // Parenthèse fermante seule
        /\{\s*$/,       // Accolade ouvrante seule
        /\}\s*$/,       // Accolade fermante seule
        /\s+$/,         // Espaces multiples à la fin
        /^\s+/,         // Espaces multiples au début
    ];
    
    residualPatterns.forEach(pattern => {
        cleanedSynopsis = cleanedSynopsis.replace(pattern, '');
    });
    
    // Nettoyer à nouveau les espaces
    cleanedSynopsis = cleanedSynopsis.trim();
    
    // S'assurer que le synopsis ne contient que du texte valide
    // Supprimer tous les caractères de contrôle sauf les retours à la ligne
    cleanedSynopsis = cleanedSynopsis.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // S'assurer qu'il n'y a pas de caractères qui pourraient être interprétés comme des balises HTML
    cleanedSynopsis = cleanedSynopsis.replace(/[<>]/g, '');
    
    // Nettoyer les espaces multiples qui pourraient rester (mais garder les retours à la ligne)
    cleanedSynopsis = cleanedSynopsis.replace(/[ \t]+/g, ' ').trim();
    
    return cleanedSynopsis;
}

// Fonction pour obtenir le type traduit
function getTranslatedType(contentType, itemType) {
    // Fonction helper pour obtenir une traduction
    function t(key, fallback = key) {
        if (window.localization) {
            const translation = window.localization.get(key);
            return translation !== key ? translation : fallback;
        }
        return fallback;
    }
    
    if (contentType === 'anime') {
        if (itemType === 'Movie') {
            return t('collection.type.film', t('search.type.movie', 'Film'));
        } else {
            return t('collection.type.anime', 'Anime');
        }
    } else {
        // Pour les mangas - mapper les types de l'API vers les clés de traduction
        const typeMap = {
            'Manga': 'collection.type.manga',
            'Novel': 'collection.type.novel',
            'Light Novel': 'collection.type.novel', // Utiliser la même traduction que Novel
            'One Shot': 'collection.type.manga', // Traiter comme manga
            'Doujinshi': 'collection.type.doujin',
            'Doujin': 'collection.type.doujin',
            'Manhwa': 'collection.type.manhwa',
            'Manhua': 'collection.type.manhua'
        };
        
        const translationKey = typeMap[itemType];
        if (translationKey) {
            return t(translationKey, itemType);
        }
        
        // Si le type n'est pas dans la map, utiliser le type tel quel ou contentType
        return itemType || t(`collection.type.${contentType}`, contentType);
    }
}

// Langue effective : uniquement celle choisie dans l'app (mangaWatchLanguage). Pas user.language (évite anglais non voulu).
function getEffectiveLang() {
    const raw = localStorage.getItem('mangaWatchLanguage');
    if (!raw) return 'fr';
    let lang = raw.toString().toLowerCase();
    if (lang.length > 2) lang = lang.substring(0, 2);
    const supported = ['fr', 'en', 'de', 'es', 'it', 'ja'];
    return supported.includes(lang) ? lang : 'fr';
}

// Texte du bouton "Trier par genre" selon la langue choisie dans l'app
function getGenreSortButtonLabel() {
    const lang = getEffectiveLang();
    const t = window.localization && window.localization.translations;
    return (t && t[lang] && t[lang].genre_sort) ? t[lang].genre_sort : 'Trier par genre';
}

// Mapping des noms de genres (API = anglais) vers les libellés par langue (pour les cartes)
const GENRE_API_TO_LOCALIZED = {
    'Action': { fr: 'Action', en: 'Action', de: 'Action', es: 'Acción', it: 'Azione', ja: 'アクション' },
    'Adventure': { fr: 'Aventure', en: 'Adventure', de: 'Abenteuer', es: 'Aventura', it: 'Avventura', ja: '冒険' },
    'Avant Garde': { fr: 'Avant-garde', en: 'Avant Garde', de: 'Avantgarde', es: 'Vanguardia', it: 'Avanguardia', ja: '前衛' },
    'Award Winning': { fr: 'Prix', en: 'Award Winning', de: 'Preisgekrönt', es: 'Ganador de Premios', it: 'Vincitore di Premi', ja: '受賞作' },
    'Boys Love': { fr: 'Boys Love', en: 'Boys Love', de: 'Boys Love', es: 'Boys Love', it: 'Boys Love', ja: 'ボーイズラブ' },
    'Comedy': { fr: 'Comédie', en: 'Comedy', de: 'Komödie', es: 'Comedia', it: 'Commedia', ja: 'コメディ' },
    'Drama': { fr: 'Drame', en: 'Drama', de: 'Drama', es: 'Drama', it: 'Dramma', ja: 'ドラマ' },
    'Fantasy': { fr: 'Fantasy', en: 'Fantasy', de: 'Fantasy', es: 'Fantasía', it: 'Fantasy', ja: 'ファンタジー' },
    'Girls Love': { fr: 'Girls Love', en: 'Girls Love', de: 'Girls Love', es: 'Girls Love', it: 'Girls Love', ja: 'ガールズラブ' },
    'Gourmet': { fr: 'Gastronomie', en: 'Gourmet', de: 'Gourmet', es: 'Gastronomía', it: 'Gastronomia', ja: 'グルメ' },
    'Horror': { fr: 'Horreur', en: 'Horror', de: 'Horror', es: 'Terror', it: 'Horror', ja: 'ホラー' },
    'Mystery': { fr: 'Mystère', en: 'Mystery', de: 'Mystery', es: 'Misterio', it: 'Mistero', ja: 'ミステリー' },
    'Romance': { fr: 'Romance', en: 'Romance', de: 'Romance', es: 'Romance', it: 'Romance', ja: 'ロマンス' },
    'Sci-Fi': { fr: 'Science-Fiction', en: 'Sci-Fi', de: 'Science Fiction', es: 'Ciencia Ficción', it: 'Sci-Fi', ja: 'SF' },
    'Slice of Life': { fr: 'Tranche de vie', en: 'Slice of Life', de: 'Slice of Life', es: 'Recuentos de la Vida', it: 'Slice of Life', ja: '日常' },
    'Sports': { fr: 'Sport', en: 'Sports', de: 'Sport', es: 'Deportes', it: 'Sport', ja: 'スポーツ' },
    'Supernatural': { fr: 'Surnaturel', en: 'Supernatural', de: 'Übernatürlich', es: 'Sobrenatural', it: 'Soprannaturale', ja: '超自然' },
    'Suspense': { fr: 'Suspense', en: 'Suspense', de: 'Spannung', es: 'Suspenso', it: 'Suspense', ja: 'サスペンス' },
    'Ecchi': { fr: 'Ecchi', en: 'Ecchi', de: 'Ecchi', es: 'Ecchi', it: 'Ecchi', ja: 'エッチ' },
    'Erotica': { fr: 'Érotique', en: 'Erotica', de: 'Erotik', es: 'Erótica', it: 'Erotica', ja: 'エロ' },
    'Hentai': { fr: 'Hentai', en: 'Hentai', de: 'Hentai', es: 'Hentai', it: 'Hentai', ja: '変態' }
};

function getTranslatedGenreForCard(apiGenreName) {
    if (!apiGenreName || typeof apiGenreName !== 'string') return apiGenreName || '';
    const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
    const normalized = apiGenreName.trim();
    const map = GENRE_API_TO_LOCALIZED[normalized] || GENRE_API_TO_LOCALIZED[normalized.replace(/\s+/g, ' ')];
    if (map && map[currentLanguage]) return map[currentLanguage];
    return apiGenreName;
}

// État de l'application
let currentPage = 1;
let totalPages = 1;
let currentMangaList = [];
let currentContentType = 'manga'; // 'manga' ou 'anime'
let isUpdatingFilters = false; // Flag pour éviter les appels récursifs
let currentFilters = {
    q: '',
    type: '',
    status: '',
    // Ne pas filtrer par score minimum par défaut pour avoir plus de résultats
    order_by: 'score',
    sort: 'desc',
    page: 1,
    limit: ITEMS_PER_PAGE
};

// Variables pour le tri par genre
let isGenreSortActive = false;
let selectedGenres = [];
let genreSortOrder = 'desc'; // 'desc' ou 'asc'

// Fonctions pour sauvegarder et restaurer l'état de la page
function savePageState() {
    // Créer une copie des filtres et ajouter le statut sélectionné
    const filtersToSave = { ...currentFilters };
    if (elements.statusFilter && elements.statusFilter.value && elements.statusFilter.value !== '') {
        filtersToSave.status = elements.statusFilter.value;
    }
    
    // Sauvegarder la position de scroll
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // Sauvegarder la valeur du tri dans l'interface (important pour le tri par pertinence)
    const orderFilterValue = elements.orderFilter ? elements.orderFilter.value : null;
    
    const state = {
        currentPage,
        currentContentType,
        currentFilters: filtersToSave,
        isGenreSortActive,
        selectedGenres: [...selectedGenres],
        genreSortOrder,
        searchTerm: elements.searchInput ? elements.searchInput.value : '',
        orderFilterValue: orderFilterValue, // Sauvegarder la valeur du tri dans l'interface
        scrollPosition: scrollPosition,
        timestamp: Date.now()
    };
    
    console.log('État sauvegardé:', {
        currentPage: currentPage,
        currentContentType: currentContentType,
        currentFilters: currentFilters,
        typeFilter: elements.typeFilter ? elements.typeFilter.value : 'Non disponible',
        scrollPosition: scrollPosition
    });
    
    localStorage.setItem('mangaDatabaseState', JSON.stringify(state));
}

function restorePageState() {
    const savedState = localStorage.getItem('mangaDatabaseState');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            // Vérifier si l'état n'est pas trop ancien (plus de 30 minutes)
            if (Date.now() - state.timestamp < 30 * 60 * 1000) {
                console.log('🔄 Restauration de l\'état:', state);
                
                currentPage = state.currentPage || 1;
                currentContentType = state.currentContentType || 'manga';
                currentFilters = { ...currentFilters, ...state.currentFilters };
                isGenreSortActive = state.isGenreSortActive || false;
                selectedGenres = state.selectedGenres || [];
                genreSortOrder = state.genreSortOrder || 'desc';
                
                // Restaurer les valeurs des filtres dans l'interface
                if (elements.searchInput && state.searchTerm) {
                    elements.searchInput.value = state.searchTerm;
                    displaySearchTerm(state.searchTerm);
                }
                
                // Restaurer le type de contenu dans le filtre
                if (elements.typeFilter) {
                    // Déterminer la valeur à restaurer dans le filtre type
                    let typeValue = state.currentFilters.type;
                    
                    // Si on a un type spécifique dans les filtres, l'utiliser
                    if (state.currentFilters.type && state.currentFilters.type !== '') {
                        typeValue = state.currentFilters.type;
                    } else {
                        // Sinon, utiliser le type de contenu actuel
                        typeValue = state.currentContentType;
                    }
                    
                    // Mapping inverse des tags API vers les types de l'interface
                    const reverseTypeMapping = {
                        'novel': 'novel',
                        'doujin': 'doujin',
                        'manhwa': 'manhwa',
                        'manhua': 'manhua',
                        'manga': 'manga',
                        'anime': 'anime',
                        'tv': 'anime', // Type spécifique d'anime
                        'movie': 'anime', // Type spécifique d'anime
                        'ova': 'anime', // Type spécifique d'anime
                        'ona': 'anime', // Type spécifique d'anime
                        'special': 'anime' // Type spécifique d'anime
                    };
                    
                    // Convertir le tag API vers le type de l'interface
                    if (reverseTypeMapping[typeValue]) {
                        typeValue = reverseTypeMapping[typeValue];
                    }
                    
                    elements.typeFilter.value = typeValue;
                    console.log('Type filter restauré:', typeValue);
                }
                
                if (elements.animeTypeFilter && state.currentFilters.type && state.currentFilters.type !== 'anime') {
                    // Ne restaurer que si c'est un type d'anime spécifique (tv, movie, ova, etc.)
                    const animeTypes = ['tv', 'movie', 'ova', 'ona', 'special'];
                    if (animeTypes.includes(state.currentFilters.type)) {
                        elements.animeTypeFilter.value = state.currentFilters.type;
                        console.log('Filtre anime-type restauré:', state.currentFilters.type);
                    }
                }
                if (elements.statusFilter && state.currentFilters.status) {
                    elements.statusFilter.value = state.currentFilters.status;
                    console.log('Status filter restauré:', state.currentFilters.status);
                }
                if (elements.ratingFilter && state.currentFilters.min_score) {
                    elements.ratingFilter.value = state.currentFilters.min_score;
                    console.log('Rating filter restauré:', state.currentFilters.min_score);
                }
                // Restaurer le tri - priorité à la valeur sauvegardée de l'interface (pour gérer le tri par pertinence)
                if (elements.orderFilter) {
                    if (state.orderFilterValue) {
                        // Utiliser la valeur sauvegardée directement (gère le cas "relevance")
                        elements.orderFilter.value = state.orderFilterValue;
                        console.log('Order filter restauré depuis orderFilterValue:', state.orderFilterValue);
                        
                        // Si c'est "relevance" et qu'il y a une recherche, s'assurer qu'on n'a pas order_by dans les filtres
                        if (state.orderFilterValue === 'relevance') {
                            // Si on a une recherche, supprimer order_by pour laisser l'API gérer la pertinence
                            if (state.searchTerm && state.searchTerm.trim() !== '') {
                                delete currentFilters.order_by;
                                delete currentFilters.sort;
                                console.log('Tri par pertinence restauré - order_by supprimé pour laisser l\'API gérer');
                            }
                        }
                    } else if (state.currentFilters.order_by) {
                        // Fallback : utiliser order_by depuis les filtres (pour compatibilité)
                        const orderByMapping = {
                            'score': 'score',
                            'popularity': 'popularity',
                            'title': 'title',
                            'start_date': 'start_date',
                            "favorites": "popularity" // favorites n'existe pas dans l'interface, utiliser popularity
                        };
                        const interfaceValue = orderByMapping[state.currentFilters.order_by] || 'score';
                        elements.orderFilter.value = interfaceValue;
                        console.log('Order filter restauré depuis order_by:', interfaceValue);
                    }
                }
                
                // Mettre à jour l'interface basée sur le type restauré dans le filtre
                const restoredType = elements.typeFilter ? elements.typeFilter.value : (state.currentFilters.type || state.currentContentType);
                
                // Mettre à jour le currentContentType selon le type restauré
                if (restoredType === 'anime') {
                    currentContentType = 'anime';
                } else {
                    currentContentType = 'manga'; // Pour tous les autres types (manga, novel, doujin, manhwa, manhua)
                }
                
                console.log('État restauré:', {
                    restoredType: restoredType,
                    currentContentType: currentContentType,
                    currentFilters: currentFilters,
                    currentPage: currentPage,
                    isGenreSortActive: isGenreSortActive,
                    selectedGenres: selectedGenres,
                    animeTypeFilterValue: elements.animeTypeFilter ? elements.animeTypeFilter.value : 'Non disponible'
                });
                
                // Forcer la mise à jour de l'interface après la restauration
                updateInterfaceForContentType(restoredType);
                
                // S'assurer que le filtre anime-type est bien restauré et visible
                if (restoredType === 'anime' && elements.animeTypeFilter) {
                    const animeTypeFilterContainer = document.getElementById('anime-type-filter');
                    if (animeTypeFilterContainer) {
                        animeTypeFilterContainer.style.display = 'block';
                    }
                    console.log('Filtre anime-type restauré avec valeur:', elements.animeTypeFilter.value);
                    
                    // Forcer la restauration du filtre anime-type après un délai
                    setTimeout(() => {
                        // Vérifier si on a un type d'anime spécifique sauvegardé
                        if (state.currentFilters.type && elements.animeTypeFilter) {
                            const animeTypes = ['tv', 'movie', 'ova', 'ona', 'special'];
                            if (animeTypes.includes(state.currentFilters.type)) {
                                elements.animeTypeFilter.value = state.currentFilters.type;
                                console.log('Filtre anime-type forcé avec valeur:', elements.animeTypeFilter.value);
                                
                                // Appeler updateFilters pour appliquer le filtre
                                updateFilters();
                            }
                        }
                    }, 500);
                }
                
                // Mettre à jour le bouton de tri par genre si il était actif
                if (isGenreSortActive && selectedGenres.length > 0) {
                    updateGenreSortButton();
                }
                
                // Appliquer la traduction après la restauration
                setTimeout(() => {
                    if (window.localization) {
                        window.localization.applyLanguage();
                    }
                }, 50);
                
                // La restauration de la position de scroll se fera après le chargement des données
                localStorage.setItem('pendingScrollRestore', state.scrollPosition || 0);
                
                return true;
            } else {
                console.log('État trop ancien, pas de restauration');
            }
        } catch (e) {
            console.error('Erreur lors de la restauration de l\'état:', e);
        }
    } else {
        console.log('Aucun état sauvegardé trouvé');
    }
    return false;
}

function clearPageState() {
    localStorage.removeItem('mangaDatabaseState');
}

// Fonction helper pour obtenir une traduction
function getTranslation(key, fallback = key) {
    if (window.localization) {
        const translation = window.localization.get(key);
        return translation !== key ? translation : fallback;
    }
    return fallback;
}

// Fonction pour obtenir le placeholder traduit selon le type
function getPlaceholderForType(type) {
    const placeholderKey = `search.placeholder.${type}`;
    const translation = getTranslation(placeholderKey);
    
    // Si la traduction n'existe pas (pour novel, doujin), utiliser la clé générique
    if (translation === placeholderKey) {
        return getTranslation('search.placeholder.generic', 'Rechercher...');
    }
    
    return translation;
}

// Fonction pour mettre à jour l'interface selon le type de contenu
function updateInterfaceForContentType(contentType) {
    const pageTitle = document.querySelector('.page-title');
    const animeTypeFilterContainer = document.getElementById('anime-type-filter');
    
    // Masquer le filtre de type d'anime par défaut
    if (animeTypeFilterContainer) {
        animeTypeFilterContainer.style.display = 'none';
    }
    
    // Ne pas forcer le filtre type, laisser la valeur restaurée
    // Le filtre type est déjà restauré par restorePageState
    
    // Mettre à jour l'interface selon le type
    switch (contentType) {
        case 'anime':
            if (pageTitle) pageTitle.textContent = 'Animes';
            if (elements.searchInput) {
                elements.searchInput.placeholder = getPlaceholderForType('anime');
            }
            if (animeTypeFilterContainer) {
                animeTypeFilterContainer.style.display = 'block';
            }
            break;
            
        case 'novel':
            if (pageTitle) pageTitle.textContent = 'Romans';
            if (elements.searchInput) {
                elements.searchInput.placeholder = getPlaceholderForType('novel');
            }
            break;
            
        case 'doujin':
            if (pageTitle) pageTitle.textContent = 'Doujins';
            if (elements.searchInput) {
                elements.searchInput.placeholder = getPlaceholderForType('doujin');
            }
            break;
            
        case 'manhwa':
            if (pageTitle) pageTitle.textContent = 'Manhwa';
            if (elements.searchInput) {
                elements.searchInput.placeholder = getPlaceholderForType('manhwa');
            }
            break;
            
        case 'manhua':
            if (pageTitle) pageTitle.textContent = 'Manhua';
            if (elements.searchInput) {
                elements.searchInput.placeholder = getPlaceholderForType('manhua');
            }
            break;
            
        default: // manga
            if (pageTitle) pageTitle.textContent = 'Mangas';
            if (elements.searchInput) {
                elements.searchInput.placeholder = getPlaceholderForType('manga');
            }
            break;
    }
    
    // Réappliquer la traduction après le changement de type de contenu
    setTimeout(() => {
        if (window.localization) {
            window.localization.applyLanguage();
            // Forcer la retraduction du bouton "Trier par genre"
            forceTranslateGenreSortButton();
            // Mettre à jour le placeholder avec la traduction correcte
            if (elements.searchInput) {
                elements.searchInput.placeholder = getPlaceholderForType(contentType);
            }
        }
    }, 100);
}

// Éléments du DOM
const elements = {
    searchInput: document.getElementById('search-input'),
    searchButton: document.getElementById('search-button'),
    typeFilter: document.getElementById('type-filter'),
    animeTypeFilter: document.getElementById('anime-type-specific-filter'),
    statusFilter: document.getElementById('status-filter'),
    ratingFilter: document.getElementById('rating-filter'),
    orderFilter: document.getElementById('order-filter'),
    mangaGrid: document.getElementById('manga-grid'),
    loading: document.getElementById('loading'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),
    pageNumbers: document.getElementById('page-numbers'),
    // Les références à la modale ont été supprimées car nous utilisons maintenant une page dédiée
};

// Fonction utilitaire pour obtenir le statut en français
function getMangaStatus(status) {
    const statusMap = {
        'publishing': 'En cours',
        'complete': 'Terminé',
        'hiatus': 'En pause',
        'discontinued': 'Arrêté',
        'upcoming': 'À venir'
    };
    return statusMap[status] || status || 'Inconnu';
}

// Écouteur pour le changement de langue
document.addEventListener('languageChanged', () => {
    console.log('🔄 Événement de changement de langue détecté');
    setTimeout(() => {
        forceTranslateGenreSortButton();
        // Mettre à jour le bouton de tri par genre si il est actif
        if (typeof updateGenreSortButton === 'function') {
            updateGenreSortButton();
        }
        // Mettre à jour le placeholder de la barre de recherche selon le type de contenu actuel
        if (elements.searchInput && elements.typeFilter) {
            const selectedType = elements.typeFilter.value || 'manga';
            const hasSearchQuery = currentFilters.q && currentFilters.q.trim() !== '';
            const hasGenreFilter = isGenreSortActive && selectedGenres && selectedGenres.length > 0;
            
            if (selectedType === '' && (hasSearchQuery || hasGenreFilter)) {
                // Mode recherche combinée
                elements.searchInput.placeholder = getTranslation('search.placeholder', 'Rechercher un manga ou un anime...');
            } else {
                // Type spécifique
                elements.searchInput.placeholder = getPlaceholderForType(selectedType);
            }
        }
        // Mettre à jour les badges de type dans les cartes
        updateCardTypeBadges();
    }, 100);
});

// Fonction pour forcer la traduction de tous les éléments avec data-i18n
function forceTranslateAllI18nElements() {
    console.log('🔄 Forçage de la traduction de tous les éléments data-i18n');
    const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
    
    if (window.localization && window.localization.translations) {
        const translations = window.localization.translations[currentLanguage];
        if (translations) {
            const i18nElements = document.querySelectorAll('[data-i18n]');
            console.log(`📝 Trouvé ${i18nElements.length} éléments avec data-i18n`);
            
            i18nElements.forEach(element => {
                const key = element.getAttribute('data-i18n');
                const translation = translations[key];
                if (translation) {
                    element.textContent = translation;
                    console.log(`✅ Traduit "${key}" -> "${translation}"`);
                } else {
                    console.log(`❌ Traduction manquante pour "${key}" en ${currentLanguage}`);
                }
            });
        }
    }
}

// Fonction pour masquer l'option Doujin dans le filtre de type pour les mineurs
function filterDoujinTypeForMinors() {
    if (typeof isUserMinor === 'function' && isUserMinor()) {
        const typeFilter = document.getElementById('type-filter');
        if (typeFilter) {
            const doujinOption = typeFilter.querySelector('option[value="doujin"]');
            if (doujinOption) {
                doujinOption.style.display = 'none';
                // Si doujin est actuellement sélectionné, changer vers manga
                if (typeFilter.value === 'doujin') {
                    typeFilter.value = 'manga';
                    // Déclencher la mise à jour des filtres
                    if (typeof updateFilters === 'function') {
                        updateFilters();
                    }
                }
                console.log('Option Doujin masquée pour utilisateur mineur');
            }
        }
    } else {
        // Si l'utilisateur n'est pas mineur, s'assurer que l'option est visible
        const typeFilter = document.getElementById('type-filter');
        if (typeFilter) {
            const doujinOption = typeFilter.querySelector('option[value="doujin"]');
            if (doujinOption) {
                doujinOption.style.display = '';
            }
        }
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser la localisation
    if (window.localization) {
        window.localization.init();
        window.localization.applyLanguage();
        
        // Forcer la traduction de tous les éléments data-i18n
        setTimeout(() => {
            forceTranslateAllI18nElements();
            forceTranslateGenreSortButton();
            // Initialiser le placeholder selon le type sélectionné
            if (elements.searchInput && elements.typeFilter) {
                const selectedType = elements.typeFilter.value || 'manga';
                elements.searchInput.placeholder = getPlaceholderForType(selectedType);
            }
            // Mettre à jour les badges de type dans les cartes
            updateCardTypeBadges();
        }, 100);
    }
    
    // Masquer l'option Doujin pour les mineurs
    setTimeout(() => {
        filterDoujinTypeForMinors();
    }, 200);
    
    // Masquer le contenu pendant l'initialisation pour éviter le flash
    if (elements.mangaGrid) {
        elements.mangaGrid.style.opacity = '0';
    }
    if (elements.loading) {
        elements.loading.style.display = 'flex';
    }
    
    // Attendre un peu pour s'assurer que tous les éléments sont chargés
    setTimeout(() => {
        // Vérifier que les éléments du DOM existent avant d'ajouter des écouteurs
        if (!elements.mangaGrid || !elements.searchButton || !elements.searchInput) {
            console.error('Éléments du DOM manquants');
            return;
        }
        
        // Vérifier s'il y a un paramètre restore dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const shouldRestore = urlParams.get('restore') === 'true';
        
        if (shouldRestore) {
            // Essayer de restaurer l'état sauvegardé
            const stateRestored = restorePageState();
            if (stateRestored) {
                console.log('État restauré avec succès');
                // Nettoyer l'URL en supprimant le paramètre restore
                const newUrl = new URL(window.location);
                newUrl.searchParams.delete('restore');
                window.history.replaceState({}, '', newUrl);
                // Charger les données avec l'état restauré
                setTimeout(() => {
                    initializePage();
                }, 100);
            } else {
                console.log('Aucun état à restaurer, initialisation normale');
                resetFilters();
                setTimeout(() => {
                    initializePage();
                }, 100);
            }
        } else {
            // Pour les retours directs, ne pas restaurer ici, laisser initializePage le faire
            setTimeout(() => {
                initializePage();
            }, 100);
        }
        
        // Vérifier s'il y a déjà un terme de recherche dans l'input
        if (elements.searchInput.value.trim()) {
            displaySearchTerm(elements.searchInput.value.trim());
        }
    }, 300);
});
    
    // Écouteurs d'événements
    elements.searchButton.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    // Écouteur pour le bouton de suppression de recherche
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('clear-search')) {
            clearSearch();
        }
    });
    
    // Écouteur pour afficher le terme de recherche en temps réel
    elements.searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        if (searchTerm) {
            displaySearchTerm(searchTerm);
        } else {
            hideSearchTerm();
        }
    });
    
    // Écouteurs pour les filtres
    if (elements.typeFilter) elements.typeFilter.addEventListener('change', updateFilters);
    if (elements.animeTypeFilter) elements.animeTypeFilter.addEventListener('change', updateFilters);
    if (elements.statusFilter) {
        console.log('✅ Élément statusFilter trouvé:', elements.statusFilter);
        elements.statusFilter.addEventListener('change', () => {
            console.log('🔍 Filtre de statut changé:', elements.statusFilter.value);
            updateFilters();
        });
    } else {
        console.error('❌ Élément statusFilter NON trouvé !');
        // Essayer de le trouver directement
        const statusFilterDirect = document.getElementById('status-filter');
        if (statusFilterDirect) {
            console.log('✅ Élément status-filter trouvé directement:', statusFilterDirect);
            statusFilterDirect.addEventListener('change', () => {
                console.log('🔍 Filtre de statut changé (direct):', statusFilterDirect.value);
                updateFilters();
            });
        } else {
            console.error('❌ Élément status-filter NON trouvé même directement !');
        }
    }
    if (elements.ratingFilter) elements.ratingFilter.addEventListener('change', updateFilters);
    if (elements.orderFilter) elements.orderFilter.addEventListener('change', updateFilters);
    
    // Bouton de réinitialisation des filtres
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    // Bouton de tri par genre
    const genreSortBtn = document.getElementById('genre-sort-btn');
    if (genreSortBtn) {
        genreSortBtn.addEventListener('click', toggleGenreSort);
    }
    
    // Pagination
    if (elements.prevPage) elements.prevPage.addEventListener('click', () => changePage(currentPage - 1));
    if (elements.nextPage) elements.nextPage.addEventListener('click', () => changePage(currentPage + 1));
    
    // Sauvegarder la position de scroll au défilement
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            // Sauvegarder tous les 500ms
            savePageState();
        }, 500);
    });
    
    // Initialiser la page avec "Tous les types" par défaut après un délai
    setTimeout(() => {
        console.log('🔄 Démarrage de l\'initialisation...');
        initializePage();
    }, 100);

// Fonction d'initialisation de la page
function initializePage() {
    console.log('🚀 Initialisation de la page...');
    
    // Initialiser la localisation
    if (window.localization) {
        window.localization.init();
        window.localization.applyLanguage();
    }
    
    // Forcer tout de suite le bouton "Trier par genre" selon la langue effective
    forceTranslateGenreSortButton();
    // Re-appliquer après les autres scripts de traduction (évite d'être écrasé)
    setTimeout(forceTranslateGenreSortButton, 400);
    setTimeout(forceTranslateGenreSortButton, 1200);
    
    // Masquer l'option Doujin pour les mineurs
    filterDoujinTypeForMinors();
    
    // Vérifier que les éléments essentiels sont présents
    if (!elements.typeFilter) {
        console.error('❌ Élément typeFilter non trouvé !');
        return;
    }
    
    if (!elements.mangaGrid) {
        console.error('❌ Élément mangaGrid non trouvé !');
        return;
    }
    
    // Vérifier s'il y a un paramètre restore dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const shouldRestore = urlParams.get('restore') === 'true';
    
    if (shouldRestore) {
        console.log('🔄 Tentative de restauration de l\'état...');
        // Essayer de restaurer l'état sauvegardé
        const stateRestored = restorePageState();
        if (stateRestored) {
            console.log('✅ État restauré avec succès');
            // Nettoyer l'URL en supprimant le paramètre restore
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('restore');
            window.history.replaceState({}, '', newUrl);
            
            // Réappliquer la traduction après la restauration de l'état
            setTimeout(() => {
                if (window.localization) {
                    window.localization.applyLanguage();
                    // Forcer la retraduction du bouton "Trier par genre"
                    forceTranslateGenreSortButton();
                }
            }, 300);
        } else {
            console.log('❌ Aucun état à restaurer, initialisation normale');
            resetFilters();
        }
    } else {
        // Vérifier si on a un état restauré automatiquement
    const savedState = localStorage.getItem('mangaDatabaseState');
    const hasRestoredState = savedState && (() => {
        try {
            const state = JSON.parse(savedState);
            return Date.now() - state.timestamp < 30 * 60 * 1000;
        } catch (e) {
            return false;
        }
    })();
    
    if (!hasRestoredState) {
        // Si pas d'état restauré, utiliser les valeurs par défaut
        elements.typeFilter.value = 'manga';
        console.log('Type filter initialisé à "Manga"');
        
        if (elements.orderFilter) {
            elements.orderFilter.value = 'score';
            console.log('Order filter initialisé à "Meilleure note"');
        }
        
        currentContentType = 'manga';
        
        currentFilters = {
            q: '',
            type: 'manga',
            status: '',
            order_by: 'score',
            sort: 'desc',
            page: 1,
            limit: ITEMS_PER_PAGE
        };
        
        // Mettre à jour l'interface avec les valeurs par défaut
        updateInterfaceForContentType('manga');
    } else {
        console.log('Utilisation de l\'état restauré pour l\'initialisation');
        // Restaurer l'état complet avant de charger les données
        const stateRestored = restorePageState();
        if (stateRestored) {
            console.log('État restauré avec succès dans initializePage');
            
            // Réappliquer la traduction après la restauration automatique de l'état
            setTimeout(() => {
                if (window.localization) {
                    window.localization.applyLanguage();
                    // Forcer la retraduction du bouton "Trier par genre"
                    forceTranslateGenreSortButton();
                }
            }, 300);
        }
    }
    }
    
    console.log('Page initialisée avec succès');
    console.log('Filtres actuels:', currentFilters);
    console.log('Page actuelle:', currentPage);
    
    // Charger les données
    console.log('📡 Appel de fetchContentList depuis initializePage...');
    fetchContentList().then(() => {
        console.log('✅ fetchContentList terminé avec succès');
        // Attendre un peu pour que l'interface soit mise à jour
        setTimeout(() => {
            // Afficher le contenu une fois les données chargées
            if (elements.mangaGrid) {
                elements.mangaGrid.style.opacity = '1';
                elements.mangaGrid.style.transition = 'opacity 0.3s ease-in-out';
                console.log('✅ Grille affichée avec opacité:', elements.mangaGrid.style.opacity);
            }
            if (elements.loading) {
                elements.loading.style.display = 'none';
                console.log('✅ Loading masqué');
            }
            
            // Restaurer la position de scroll si nécessaire
            const pendingScroll = localStorage.getItem('pendingScrollRestore');
            if (pendingScroll && parseInt(pendingScroll) > 0) {
                setTimeout(() => {
                    window.scrollTo(0, parseInt(pendingScroll));
                    console.log('✅ Position de scroll restaurée:', pendingScroll);
                    localStorage.removeItem('pendingScrollRestore');
                }, 200);
            }
        }, 100);
    }).catch(error => {
        console.error('❌ Erreur lors du chargement des données:', error);
        showError('Erreur lors du chargement des données. Veuillez réessayer.');
    });
}

// Fonction pour récupérer la liste des mangas/animes
async function fetchContentList() {
    try {
        showLoading(true);
        
        // Vérifier si un filtre de genre est actif
        if (isGenreSortActive && selectedGenres.length > 0) {
            console.log('🎭 Filtre de genre actif, utilisation de applyGenreSort()');
            await applyGenreSort();
            return;
        }
        
        const endpoint = currentContentType === 'anime' ? 'anime' : 'manga';
        
        // Convertir les filtres en URLSearchParams
        const params = new URLSearchParams();
        Object.entries(currentFilters).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
                params.append(key, value);
            }
        });
        
        const response = await fetchContentFromAPI(endpoint, params);
        
        if (response && response.data) {
            console.log(`📚 ${response.data.length} éléments trouvés`);
            
            // Mettre à jour la pagination si disponible
            if (response.pagination) {
                totalPages = response.pagination.last_visible_page;
                currentPage = response.pagination.current_page;
                updatePagination();
            }
            
            displayContentList(response.data);
            
            // Réappliquer la traduction après le chargement des données
            setTimeout(() => {
                if (window.localization) {
                    window.localization.applyLanguage();
                    // Forcer la traduction de tous les éléments data-i18n
                    forceTranslateAllI18nElements();
                    // Forcer la retraduction du bouton "Trier par genre"
                    forceTranslateGenreSortButton();
                }
            }, 200);
        } else {
            showError('Aucune donnée reçue de l\'API');
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        showError('Erreur lors du chargement des données');
    } finally {
        showLoading(false);
    }
}

// Fonction helper pour récupérer les données d'un endpoint spécifique
async function fetchContentFromAPI(endpoint, params) {
    let url = `${API_BASE_URL}/${endpoint}`;
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    
    console.log(`🔍 Requête API: ${url}`);
    console.log(`Type de contenu: ${currentContentType}`);
    console.log(`Filtres:`, params);
    console.log(`Type filter value: ${elements.typeFilter ? elements.typeFilter.value : 'N/A'}`);
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 429) {
                console.warn(`⚠️ Rate limiting détecté. Attendre avant de réessayer...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return null;
            } else {
                console.warn(`Erreur HTTP: ${response.status} - ${response.statusText}`);
                return null;
            }
        }
        
        const data = await response.json();
        console.log(`API Response:`, data);
        
        return data;
    } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        return null;
    }
}

// Fonction pour récupérer les statuts personnels de la collection
function getPersonalStatus(malId) {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user || !user.email) {
            return null;
        }
        
        const listKey = 'user_list_' + user.email;
        const userList = JSON.parse(localStorage.getItem(listKey) || '[]');
        const item = userList.find(item => item.id === malId.toString());
        return item ? item.status : null;
    } catch (error) {
        console.error('Erreur lors de la récupération du statut personnel:', error);
        return null;
    }
}

// Fonction pour mapper les statuts de l'API vers les statuts personnels
function mapApiStatusToPersonal(apiStatus) {
    const statusMapping = {
        'publishing': 'watching',
        'complete': 'completed',
        'hiatus': 'on-hold',
        'discontinued': 'dropped'
    };
    return statusMapping[apiStatus] || null;
}

// Afficher la liste des mangas/animes
function displayContentList(contentList) {
    const mangaGrid = document.getElementById('manga-grid');
    if (!mangaGrid) return;
    
    console.log('Affichage de', contentList.length, 'éléments');
    
    // Trier par statut si un statut est sélectionné
    let sortedContentList = [...contentList];
    if (elements.statusFilter && elements.statusFilter.value && elements.statusFilter.value !== '') {
        const selectedStatus = elements.statusFilter.value;
        console.log('🔍 Tri par statut personnel:', selectedStatus);
        
        // Debug: afficher les statuts personnels pour les premiers éléments
        contentList.slice(0, 5).forEach((item, index) => {
            const personalStatus = getPersonalStatus(item.mal_id);
            console.log(`  ${index + 1}. ${item.title} (ID: ${item.mal_id}) -> Statut personnel: ${personalStatus || 'Aucun'}`);
        });
        
        sortedContentList.sort((a, b) => {
            // Récupérer UNIQUEMENT les statuts personnels
            const aPersonalStatus = getPersonalStatus(a.mal_id);
            const bPersonalStatus = getPersonalStatus(b.mal_id);
            
            // Utiliser SEULEMENT les statuts personnels, pas ceux de l'API
            const aStatus = aPersonalStatus || '';
            const bStatus = bPersonalStatus || '';
            
            console.log(`🔄 Comparaison: ${a.title} (${aStatus}) vs ${b.title} (${bStatus})`);
            
            // Si a a le statut sélectionné et b non, a vient en premier
            if (aStatus === selectedStatus && bStatus !== selectedStatus) {
                console.log(`  ✅ ${a.title} prioritaire (a le statut ${selectedStatus})`);
                return -1;
            }
            // Si b a le statut sélectionné et a non, b vient en premier
            if (bStatus === selectedStatus && aStatus !== selectedStatus) {
                console.log(`  ✅ ${b.title} prioritaire (a le statut ${selectedStatus})`);
                return 1;
            }
            // Sinon, garder l'ordre original
            return 0;
        });
        
        // Debug: afficher le résultat du tri
        console.log('📋 Résultat du tri:');
        sortedContentList.slice(0, 10).forEach((item, index) => {
            const personalStatus = getPersonalStatus(item.mal_id);
            console.log(`  ${index + 1}. ${item.title} -> Statut: ${personalStatus || 'Aucun'}`);
        });
    }
    
    // Vider la grille
    mangaGrid.innerHTML = '';
    
    // Filtrer les contenus interdits pour les mineurs
    let contentToDisplay = sortedContentList;
    if (typeof filterForbiddenContent === 'function') {
        // Convertir le format de l'API vers le format attendu par le filtre
        const filtered = filterForbiddenContent(sortedContentList.map(content => ({
            titre: content.title,
            title: content.title,
            name: content.title,
            genres: content.genres ? content.genres.map(g => g.name || g) : [],
            contentType: content.type === 'Doujin' ? 'doujin' : null,
            id: content.mal_id
        })));
        
        // Retrouver les contenus originaux correspondants
        const filteredIds = new Set(filtered.map(f => f.id));
        contentToDisplay = sortedContentList.filter(c => filteredIds.has(c.mal_id));
    }
    
    // Créer et ajouter les cartes
    contentToDisplay.forEach(content => {
        const card = createContentCard(content);
        if (card) {
            mangaGrid.appendChild(card);
        }
    });
    
    // Afficher la grille avec une transition fluide
    mangaGrid.style.opacity = '1';
    mangaGrid.style.transition = 'opacity 0.3s ease-in-out';
    
    console.log('Contenu affiché, opacité:', mangaGrid.style.opacity);
    
    // Traduction en arrière-plan (non bloquante pour l'affichage)
    // Ne pas attendre la traduction pour afficher les cartes
    (async () => {
            try {
            // Appliquer d'abord les traductions statiques
            if (window.localization) {
                window.localization.applyLanguage();
            }
            // Mettre à jour les badges de type
            updateCardTypeBadges();
            
            // Fonction optimisée pour corriger la position des synopsis
            function fixSynopsisPositions() {
                const cards = document.querySelectorAll('.manga-card');
                let fixedCount = 0;
                
                cards.forEach(card => {
                    const mangaInfo = card.querySelector('.manga-info');
                    const mangaImage = card.querySelector('.manga-image');
                    
                    if (!mangaInfo) return;
                    
                    // Vérifier s'il y a un synopsis ou du texte dans manga-image (ne devrait jamais arriver)
                    if (mangaImage) {
                        // Supprimer TOUS les éléments de texte dans manga-image sauf les badges et boutons
                        // IMPORTANT: Ne pas toucher aux badges et boutons (.manga-badge, .score-badge, .type-badge, .favorite-btn, .status-btn)
                        const allElementsInImage = mangaImage.querySelectorAll('*:not(img):not(.manga-badge):not(.score-badge):not(.type-badge):not(.favorite-btn):not(.status-btn)');
                        allElementsInImage.forEach(el => {
                            // Ignorer les badges et boutons même s'ils sont dans la sélection
                            if (el.classList.contains('manga-badge') || 
                                el.classList.contains('score-badge') || 
                                el.classList.contains('type-badge') ||
                                el.classList.contains('favorite-btn') ||
                                el.classList.contains('status-btn')) {
                                return; // Ne pas toucher aux badges et boutons
                            }
                            
                            const text = el.textContent.trim();
                            // Si c'est un élément avec beaucoup de texte (synopsis, titre, etc.)
                            if (text.length > 30 || 
                                el.classList.contains('manga-synopsis') || 
                                el.classList.contains('content-synopsis') ||
                                el.classList.contains('manga-title') ||
                                el.classList.contains('content-title') ||
                                el.tagName === 'P' ||
                                el.tagName === 'H1' ||
                                el.tagName === 'H2' ||
                                el.tagName === 'H3' ||
                                el.tagName === 'H4' ||
                                el.tagName === 'H5' ||
                                el.tagName === 'H6' ||
                                (el.tagName === 'DIV' && text.length > 50 && !el.querySelector('.manga-badge, .score-badge, .type-badge, .favorite-btn, .status-btn'))) {
                                // Si c'est un synopsis, essayer de le déplacer vers manga-info
                                if ((el.classList.contains('manga-synopsis') || el.classList.contains('content-synopsis')) && mangaInfo) {
                        const meta = mangaInfo.querySelector('.manga-meta');
                        if (meta && meta.nextSibling) {
                                        mangaInfo.insertBefore(el, meta.nextSibling);
                        } else {
                                        mangaInfo.appendChild(el);
                                    }
                                    fixedCount++;
                                } else {
                                    // Sinon, le supprimer complètement
                                    el.remove();
                                    fixedCount++;
                                }
                            }
                        });
                        
                        // Supprimer aussi les éléments avec position absolute qui pourraient être au-dessus
                        // MAIS garder les badges et boutons qui ont aussi position absolute
                        const absoluteElements = mangaImage.querySelectorAll('[style*="position: absolute"], [style*="position:fixed"]');
                        absoluteElements.forEach(el => {
                            // Ne pas toucher aux badges et boutons
                            if (el.classList.contains('manga-badge') || 
                                el.classList.contains('score-badge') || 
                                el.classList.contains('type-badge') ||
                                el.classList.contains('favorite-btn') ||
                                el.classList.contains('status-btn')) {
                                return; // Garder les badges et boutons
                            }
                            
                            // Vérifier si c'est un élément avec beaucoup de texte
                            const text = el.textContent.trim();
                            if (text.length > 30) {
                                el.remove();
                                fixedCount++;
                            }
                        });
                    }
                    
                    // S'assurer qu'il n'y a qu'un seul synopsis dans manga-info
                    const synopsisInInfo = mangaInfo.querySelectorAll('.manga-synopsis, .content-synopsis');
                    if (synopsisInInfo.length > 1) {
                        // Garder seulement le premier et supprimer les autres
                        for (let i = 1; i < synopsisInInfo.length; i++) {
                            synopsisInInfo[i].remove();
                            fixedCount++;
                        }
                    }
                    
                    // Vérifier s'il y a des éléments qui débordent de la carte
                    const cardRect = card.getBoundingClientRect();
                    const allCardChildren = card.querySelectorAll('*');
                    allCardChildren.forEach(child => {
                        const childRect = child.getBoundingClientRect();
                        // Si l'élément est en dehors de la carte (surtout au-dessus)
                        if (childRect.top < cardRect.top - 10 && 
                            !child.classList.contains('manga-badge') && 
                            !child.classList.contains('score-badge') && 
                            !child.classList.contains('type-badge') &&
                            !child.classList.contains('favorite-btn') &&
                            !child.classList.contains('status-btn')) {
                            const text = child.textContent.trim();
                            if (text.length > 20) {
                                child.remove();
                                fixedCount++;
                            }
                    }
                });
                });
                
                if (fixedCount > 0) {
                    console.log(`✅ ${fixedCount} éléments corrigés/supprimés`);
                }
            }
            
            // Corriger AVANT la traduction (une seule fois)
            fixSynopsisPositions();
            
            // Traduire le contenu dynamique en arrière-plan (non bloquant)
            if (window.translateEntireSiteAutomatically) {
                // Ne pas attendre, laisser la traduction se faire en arrière-plan
                window.translateEntireSiteAutomatically().then(() => {
                    // Corriger APRÈS la traduction
                    fixSynopsisPositions();
                    
                    // Vérifier une dernière fois après un court délai pour s'assurer que tout est correct
                    setTimeout(() => {
                        fixSynopsisPositions();
                    }, 500);
                }).catch(err => {
                    console.error('Erreur traduction:', err);
                });
            }
            
            // Traduire les types, genres et titres de cartes en arrière-plan
            const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
            if (currentLanguage !== 'en') {
                Promise.all([
                    translateCardTypes(currentLanguage),
                    translateCardGenres(currentLanguage),
                    translateCardTitles(currentLanguage)
                ]).then(() => {
                    // Corriger une dernière fois après toutes les traductions
                    fixSynopsisPositions();
                }).catch(err => {
                    console.error('Erreur traduction cartes:', err);
                });
            }
            } catch (error) {
                console.error('❌ Erreur lors de la traduction:', error);
            }
    })();
}

// Créer une carte de manga/anime
function createContentCard(content) {
    if (!content || !content.title) {
        console.error(`Données de ${currentContentType} invalides:`, content);
        return null;
    }
    
    const card = document.createElement('div');
    card.className = 'manga-card';
    card.setAttribute('data-mal-id', content.mal_id);
    
    // Formater la note
    const score = content.score ? content.score.toFixed(1) : 'N/A';
    
    // Formater les genres (traduire les noms selon la langue : ex. "Award Winning" -> "Prix" en FR)
    const genresRaw = content.genres ? content.genres.map(genre => genre.name).slice(0, 3) : [];
    const genres = genresRaw.map(name => getTranslatedGenreForCard(name));
    
    // Formater les informations spécifiques au type de contenu
    let metaInfo = '';
    if (currentContentType === 'manga') {
        const volumes = content.volumes ? `${content.volumes} vol.` : '?';
        const chapters = content.chapters ? `${content.chapters} ch.` : '?';
        metaInfo = `${volumes} • ${chapters}`;
    } else if (currentContentType === 'anime') {
        const episodes = content.episodes ? `${content.episodes} ép.` : '?';
        const duration = content.duration ? content.duration : '?';
        metaInfo = `${episodes} • ${duration}`;
    }
    
    // Date de publication/diffusion
    const year = currentContentType === 'manga' 
        ? content.published?.prop?.from?.year 
        : content.aired?.prop?.from?.year;
    
    // Vérifier si l'item est déjà dans la liste de l'utilisateur
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    let statusButton = '';
    
    if (user && user.email) {
        const userList = JSON.parse(localStorage.getItem(`user_list_${user.email}`) || '[]');
        const existingItem = userList.find(item => item.id === content.mal_id.toString());
        
        if (existingItem) {
            // Afficher le bouton de statut existant
            const statusIcon = getStatusIcon(existingItem.status);
            const statusText = getStatusText(existingItem.status);
            const statusColor = getStatusColor(existingItem.status);
            
            statusButton = `
                <button class="status-btn" style="background-color: ${statusColor};" data-mal-id="${content.mal_id}" data-title="${content.title}" data-type="${currentContentType === 'anime' && content.type === 'Movie' ? 'film' : (content.type || currentContentType)}" data-image-url="${content.images?.jpg?.large_image_url || content.images?.jpg?.image_url || ''}" data-synopsis="${cleanSynopsis(content.synopsis) || ''}" data-episodes="${content.episodes || content.volumes || 'null'}" data-year="${year || 'null'}" title="${statusText} - Cliquez pour modifier">
                    <i class="${statusIcon}"></i>
                </button>
            `;
        } else {
            // Afficher le bouton favori
            statusButton = `
                <button class="favorite-btn" data-mal-id="${content.mal_id}" data-title="${content.title}" data-type="${currentContentType === 'anime' && content.type === 'Movie' ? 'film' : (content.type || currentContentType)}" data-image-url="${content.images?.jpg?.large_image_url || content.images?.jpg?.image_url || ''}" data-synopsis="${cleanSynopsis(content.synopsis) || ''}" data-episodes="${content.episodes || content.volumes || 'null'}" data-year="${year || 'null'}" title="Ajouter aux favoris">
                    <i class="fas fa-bookmark"></i>
                </button>
            `;
        }
    } else {
        // Utilisateur non connecté, afficher le bouton favori
        statusButton = `
            <button class="favorite-btn" data-mal-id="${content.mal_id}" data-title="${content.title}" data-type="${currentContentType === 'anime' && content.type === 'Movie' ? 'film' : (content.type || currentContentType)}" data-image-url="${content.images?.jpg?.large_image_url || content.images?.jpg?.image_url || ''}" data-synopsis="${cleanSynopsis(content.synopsis) || ''}" data-episodes="${content.episodes || content.volumes || 'null'}" data-year="${year || 'null'}" title="Ajouter aux favoris">
                <i class="fas fa-bookmark"></i>
            </button>
        `;
    }
    
    // Obtenir la traduction pour "Image non disponible"
    const tFn = window.t || (window.localization ? (key) => window.localization.get(key) : (key) => key);
    const imageUnavailableText = encodeURIComponent(tFn('common.image_unavailable'));
    const placeholderUrl = `https://via.placeholder.com/300x450/1a1a1a/333333?text=${imageUnavailableText}`;
    
    card.innerHTML = `
        <div class="manga-image">
            <img src="${content.images?.jpg?.large_image_url || content.images?.jpg?.image_url || placeholderUrl}" 
                 alt="${content.title}" 
                 loading="lazy">
            <div class="manga-badge score-badge">
                <i class="fas fa-star"></i>
                <span>${score}</span>
            </div>
            ${statusButton}
            <div class="manga-badge type-badge" data-original-type="${content.type || currentContentType}" data-content-type="${currentContentType}">
                ${getTranslatedType(currentContentType, content.type)}
            </div>
        </div>
        <div class="manga-info" data-content='${JSON.stringify({
            title: content.title,
            title_japanese: content.title_japanese,
            title_english: content.title_english,
            type: currentContentType
        })}'>
            <h3 class="manga-title content-title" title="${content.title}">${content.title}</h3>
            <div class="manga-meta">
                <span>${metaInfo}</span>
                <span>${year || '?'}</span>
            </div>
            <p class="manga-synopsis content-synopsis">${content.synopsis ? truncateText(cleanSynopsis(content.synopsis), 200) : (window.localization ? window.localization.get('no_synopsis_available') : 'Aucune description disponible.')}</p>
            ${genres.length > 0 ? `
                <div class="manga-genres">
                    ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    // Ajouter un écouteur d'événement pour rediriger vers la page de détails
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
        // Ne pas rediriger si on clique sur un bouton
        if (e.target.closest('.favorite-btn') || e.target.closest('.status-btn')) {
            return;
        }
        // Empêcher la propagation pour éviter les conflits avec d'autres gestionnaires de clic
        e.preventDefault();
        e.stopPropagation();
        
        // Sauvegarder l'état de la page avant de naviguer
        savePageState();
        
        // Rediriger vers la page de détails avec l'ID du contenu
        const detailsPage = 'anime-details.html';
        window.location.href = `${detailsPage}?id=${content.mal_id}&type=${currentContentType}`;
    });
    
    // Rendre la carte cliquable
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const detailsPage = 'anime-details.html';
            window.location.href = `${detailsPage}?id=${content.mal_id}&type=${currentContentType}`;
        }
    });
    
    return card;
}

// Fonction pour traduire les types dans les cartes
function updateCardTypeBadges() {
    const typeElements = document.querySelectorAll('.type-badge');
    console.log(`🏷️ Mise à jour de ${typeElements.length} badges de type`);
    
    typeElements.forEach(element => {
        const originalType = element.getAttribute('data-original-type');
        const contentType = element.getAttribute('data-content-type') || currentContentType || 'manga';
        
        if (!originalType) return;
        
        // Obtenir la traduction mise à jour
        const translatedType = getTranslatedType(contentType, originalType);
        element.textContent = translatedType;
    });
}

// Fonction pour traduire les genres dans les cartes
async function translateCardGenres(targetLanguage) {
    const genreElements = document.querySelectorAll('.genre-tag');
    console.log(`🏷️ Traduction de ${genreElements.length} genres de cartes`);
    
    for (const element of genreElements) {
        const originalText = element.textContent.trim();
        if (originalText && originalText.length < 50) {
            try {
                const translatedText = await translateWithCache(originalText, targetLanguage);
                if (translatedText && translatedText.trim() !== '' && translatedText !== originalText) {
                    element.textContent = translatedText;
                    console.log(`✅ Genre traduit: "${originalText}" -> "${translatedText}"`);
                }
            } catch (error) {
                console.warn('Erreur lors de la traduction du genre:', error);
            }
        }
    }
}

// Fonction pour traduire les titres des cartes
async function translateCardTitles(targetLanguage) {
    // Ne traduire que si la langue cible est le japonais
    if (targetLanguage !== 'ja') {
        return;
    }
    
    const titleElements = document.querySelectorAll('.content-title');
    console.log(`📖 Traduction de ${titleElements.length} titres de cartes en japonais`);
    
    for (const element of titleElements) {
        const originalText = element.textContent.trim();
        if (originalText && originalText.length > 0) {
            try {
                const translatedText = await translateWithCache(originalText, targetLanguage);
                if (translatedText && translatedText.trim() !== '' && translatedText !== originalText) {
                    element.textContent = translatedText;
                    console.log(`✅ Titre traduit: "${originalText}" -> "${translatedText}"`);
                }
            } catch (error) {
                console.warn('Erreur lors de la traduction du titre:', error);
            }
        }
    }
}

// Fonction pour forcer la traduction du bouton "Trier par genre"
function forceTranslateGenreSortButton() {
    const label = getGenreSortButtonLabel();
    const genreSortButton = document.querySelector('#genre-sort-btn span[data-i18n="genre_sort"]');
    if (genreSortButton) {
        genreSortButton.textContent = label;
        return true;
    }
    const genreSortBtn = document.getElementById('genre-sort-btn');
    if (genreSortBtn) {
        genreSortBtn.innerHTML = `<i class="fas fa-tags"></i> <span data-i18n="genre_sort">${label}</span>`;
        return true;
    }
    return false;
}

// Fonction pour traduire un nom de genre
async function translateGenreName(genreName, targetLanguage) {
    if (!genreName || targetLanguage === 'en') {
        return genreName; // Pas de traduction pour l'anglais ou si pas de nom
    }
    
    try {
        const translatedName = await translateWithCache(genreName, targetLanguage);
        if (translatedName && translatedName.trim() !== '' && translatedName !== genreName) {
            console.log(`✅ Genre traduit: "${genreName}" -> "${translatedName}"`);
            return translatedName;
        }
    } catch (error) {
        console.warn('Erreur lors de la traduction du genre:', error);
    }
    
    return genreName; // Retourner le nom original si la traduction échoue
}

// Fonction pour obtenir l'icône du statut
function getStatusIcon(status) {
    const iconMap = {
        'watching': 'fas fa-play',
        'completed': 'fas fa-check-circle',
        'on-hold': 'fas fa-pause',
        'dropped': 'fas fa-times-circle',
        'plan-to-watch': 'fas fa-eye'
    };
    return iconMap[status] || 'fas fa-heart';
}

// Fonction pour obtenir le texte du statut
function getStatusText(status) {
    const textMap = {
        'watching': 'En cours',
        'completed': 'Terminé',
        'on-hold': 'En pause',
        'dropped': 'Abandonné',
        'plan-to-watch': 'À voir'
    };
    return textMap[status] || 'Inconnu';
}

// Fonction pour obtenir la couleur du statut
function getStatusColor(status) {
    const colorMap = {
        'watching': '#2196f3', // Bleu pour "En cours"
        'completed': '#4caf50', // Vert pour "Terminé"
        'on-hold': '#ff9800', // Orange pour "En pause"
        'dropped': '#f44336', // Rouge pour "Abandonné"
        'plan-to-watch': '#9c27b0' // Violet pour "À voir"
    };
    return colorMap[status] || '#607d8b'; // Couleur par défaut
}

// Fonction pour rafraîchir l'affichage des cartes
window.refreshCardsDisplay = function() {
    // Vérifier si on a des données à afficher
    if (!currentMangaList || currentMangaList.length === 0) {
        console.log('Aucune donnée à afficher');
        return;
    }
    
    // Vérifier si un filtre de statut est actif
    const hasStatusFilter = elements.statusFilter && elements.statusFilter.value && elements.statusFilter.value !== '';
    
    if (hasStatusFilter) {
        // Si un filtre de statut est actif, recharger complètement pour re-trier
        console.log('Filtre de statut actif, rechargement complet');
        displayContentList(currentMangaList);
    } else {
        // Sinon, mettre à jour seulement les boutons de statut
        console.log('Mise à jour des boutons de statut uniquement');
        updateStatusButtons();
    }
}

// Fonction pour mettre à jour seulement les boutons de statut
function updateStatusButtons() {
    const cards = document.querySelectorAll('.manga-card');
    cards.forEach(card => {
        const malId = card.querySelector('.favorite-btn, .status-btn')?.getAttribute('data-mal-id');
        if (malId) {
            const personalStatus = getPersonalStatus(malId);
            const statusButton = card.querySelector('.favorite-btn, .status-btn');
            
            if (statusButton) {
                if (personalStatus) {
                    // Convertir en bouton de statut
                    statusButton.className = 'status-btn';
                    statusButton.style.backgroundColor = getStatusColor(personalStatus);
                    statusButton.title = getStatusText(personalStatus) + ' - Cliquez pour modifier';
                    
                    const icon = statusButton.querySelector('i');
                    if (icon) {
                        icon.className = getStatusIcon(personalStatus);
                    }
                } else {
                    // Convertir en bouton favori
                    statusButton.className = 'favorite-btn';
                    statusButton.style.backgroundColor = '';
                    statusButton.title = 'Ajouter aux favoris';
                    
                    const icon = statusButton.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-bookmark';
                    }
                }
            }
        }
    });
}

// Fonction pour ajouter aux favoris
window.addToFavorites = function(event, malId, title, type, imageUrl, synopsis, episodes, year) {
    event.preventDefault();
    event.stopPropagation();
    
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        alert('Veuillez vous connecter pour ajouter des éléments à votre collection.');
        return;
    }
    
    const listKey = 'user_list_' + user.email;
    let userList = [];
    try {
        userList = JSON.parse(localStorage.getItem(listKey) || '[]');
    } catch (e) {
        console.error('Erreur lors de la lecture de la liste:', e);
        userList = [];
    }
    
    // Vérifier si l'élément existe déjà
    const existingItem = userList.find(item => item.id === malId.toString() && item.type === type);
    
    if (existingItem) {
        // L'élément existe déjà, ouvrir le modal pour changer le statut
        window.currentEditingItem = existingItem;
        openStatusModal();
    } else {
        // Nouvel élément, ouvrir le modal pour choisir un statut
        window.currentEditingItem = {
            id: malId.toString(),
            title: title,
            type: type.toLowerCase(), // Normaliser le type en minuscules
            imageUrl: imageUrl,
            synopsis: synopsis,
            episodes: episodes === 'null' ? null : episodes,
            year: year === 'null' ? null : year,
            status: 'watching', // Statut par défaut
            dateAdded: new Date().toISOString()
        };
        openStatusModal();
    }
};

// Fonction pour ouvrir le modal
window.openStatusModal = function() {
    const modal = document.getElementById('statusModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } else {
        console.error('Modal non trouvé - Vérifiez que l\'élément #statusModal existe dans le HTML');
    }
};

// Fonction pour fermer le modal
window.closeStatusModal = function() {
    const modal = document.getElementById('statusModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

// Fonction pour normaliser le type (similaire à list.js)
function normalizeItemTypeForStoppedAt(type) {
    if (!type) return 'anime';
    
    const typeLower = type.toLowerCase();
    
    // Types d'anime de l'API Jikan
    if (typeLower === 'tv' || typeLower === 'movie' || typeLower === 'ova' || 
        typeLower === 'ona' || typeLower === 'special' || typeLower === 'music') {
        return 'anime';
    }
    
    // Types de manga
    if (typeLower === 'manga' || typeLower === 'novel' || typeLower === 'light novel' ||
        typeLower === 'one shot' || typeLower === 'doujinshi' || typeLower === 'manhwa' || 
        typeLower === 'manhua') {
        return typeLower === 'novel' || typeLower === 'light novel' ? 'novel' : typeLower;
    }
    
    return typeLower;
}

// Fonction pour afficher le popup "où vous êtes-vous arrêté"
function showStoppedAtPopupForMangaDB(item, status, callback) {
    const normalizedType = normalizeItemTypeForStoppedAt(item.type);
    const isAnime = normalizedType === 'anime';
    
    // Créer le popup
    const popup = document.createElement('div');
    popup.className = 'stopped-at-popup';
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        backdrop-filter: blur(5px);
        animation: fadeIn 0.3s ease;
    `;
    
    // Utiliser "volume" pour les mangas au lieu de "chapitre"
    const labelText = isAnime ? 
        (window.localization ? window.localization.get('collection.stopped_at.episode') : 'épisode') :
        (window.localization ? window.localization.get('collection.stopped_at.volume') : 'volume');
    
    const titleText = window.localization ? window.localization.get('collection.stopped_at.label') : 'Où vous êtes-vous arrêté ?';
    const hintText = window.localization ? window.localization.get('collection.stopped_at.hint') : 'Indiquez le numéro d\'épisode ou de volume où vous vous êtes arrêté';
    const confirmText = window.localization ? window.localization.get('collection.confirm_status') : 'Confirmer';
    const cancelText = window.localization ? window.localization.get('collection.delete.cancel') : 'Annuler';
    
    popup.innerHTML = `
        <div class="popup-content" style="
            background: var(--dark, #1a1a1a);
            border-radius: 12px;
            padding: 30px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideIn 0.3s ease;
        ">
            <h3 style="color: var(--light, #fff); margin-bottom: 20px; font-size: 1.3rem;">${titleText}</h3>
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px; justify-content: center;">
                <button class="decrement-btn" style="
                    width: 45px;
                    height: 45px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    color: var(--light, #fff);
                    font-size: 20px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">−</button>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1;">
                    <input 
                        type="number" 
                        id="popup-stopped-at-input" 
                        min="1" 
                        placeholder="0" 
                        value="${item.stoppedAt || ''}"
                        style="
                            width: 100%;
                            padding: 12px;
                            background: rgba(255, 255, 255, 0.1);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            border-radius: 8px;
                            color: var(--light, #fff);
                            font-size: 24px;
                            font-weight: bold;
                            text-align: center;
                        "
                    >
                    <span style="color: var(--light-gray, #aaa); font-size: 0.9rem;">${labelText}</span>
                </div>
                <button class="increment-btn" style="
                    width: 45px;
                    height: 45px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    color: var(--light, #fff);
                    font-size: 20px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">+</button>
            </div>
            <p style="color: var(--light-gray, #aaa); font-size: 0.85rem; margin-bottom: 20px; text-align: left;">${hintText}</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button class="cancel-popup-btn" style="
                    padding: 12px 25px;
                    background: rgba(255, 255, 255, 0.1);
                    color: var(--light, #fff);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                ">${cancelText}</button>
                <button class="confirm-popup-btn" style="
                    padding: 12px 25px;
                    background: #00b894;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                ">${confirmText}</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    const input = popup.querySelector('#popup-stopped-at-input');
    const confirmBtn = popup.querySelector('.confirm-popup-btn');
    const cancelBtn = popup.querySelector('.cancel-popup-btn');
    const incrementBtn = popup.querySelector('.increment-btn');
    const decrementBtn = popup.querySelector('.decrement-btn');
    
    // Gestion des boutons +/-
    incrementBtn.addEventListener('click', () => {
        const currentValue = parseInt(input.value) || 0;
        input.value = Math.max(1, currentValue + 1);
        input.dispatchEvent(new Event('input'));
    });
    
    decrementBtn.addEventListener('click', () => {
        const currentValue = parseInt(input.value) || 0;
        input.value = Math.max(1, currentValue - 1);
        input.dispatchEvent(new Event('input'));
    });
    
    // Empêcher les valeurs négatives
    input.addEventListener('input', () => {
        if (input.value < 1) {
            input.value = 1;
        }
    });
    
    // Focus sur l'input
    setTimeout(() => input.focus(), 100);
    
    // Confirmer
    const confirm = () => {
        const value = input.value.trim();
        const stoppedAt = value && !isNaN(value) && parseInt(value) > 0 ? parseInt(value) : null;
        popup.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(popup);
            if (callback) callback(stoppedAt);
        }, 300);
    };
    
    confirmBtn.addEventListener('click', confirm);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') confirm();
    });
    
    // Annuler
    cancelBtn.addEventListener('click', () => {
        popup.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(popup);
        }, 300);
    });
    
    // Fermer en cliquant à l'extérieur
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(popup);
            }, 300);
        }
    });
    
    // Fermer avec Escape
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            popup.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(popup);
            }, 300);
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Ajouter les styles CSS pour masquer les spinners natifs des inputs number
if (!document.getElementById('manga-db-number-input-styles')) {
    const numberInputStyles = document.createElement('style');
    numberInputStyles.id = 'manga-db-number-input-styles';
    numberInputStyles.textContent = `
        /* Masquer les spinners natifs des inputs number */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        
        input[type="number"] {
            -moz-appearance: textfield;
        }
    `;
    document.head.appendChild(numberInputStyles);
}

// Fonction pour mettre à jour le statut
window.updateItemStatus = function(status) {
    console.log(`🔄 updateItemStatus appelé avec le statut: ${status}`);
    console.log(`📝 Élément en cours d'édition:`, window.currentEditingItem);
    
    if (!window.currentEditingItem) {
        console.log(`❌ Aucun élément en cours d'édition`);
        return;
    }
    
    // Si le statut est on-hold ou dropped, afficher le popup
    if (status === 'on-hold' || status === 'dropped') {
        // Fermer le modal d'abord
        closeStatusModal();
        
        // Afficher le popup
        showStoppedAtPopupForMangaDB(window.currentEditingItem, status, (stoppedAt) => {
            // Mettre à jour le statut avec stoppedAt
            updateItemStatusWithStoppedAt(status, stoppedAt);
        });
    } else {
        // Pour les autres statuts, mettre à jour directement
        updateItemStatusWithStoppedAt(status, null);
    }
};

// Fonction pour mettre à jour le statut avec stoppedAt
function updateItemStatusWithStoppedAt(status, stoppedAt) {
    if (!window.currentEditingItem) {
        console.log(`❌ Aucun élément en cours d'édition`);
        return;
    }
    
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        console.log(`❌ Utilisateur non connecté`);
        return;
    }
    
    const listKey = 'user_list_' + user.email;
    let userList = [];
    try {
        userList = JSON.parse(localStorage.getItem(listKey) || '[]');
    } catch (e) {
        console.error('Erreur lors de la lecture de la liste:', e);
        userList = [];
    }
    
    // Mettre à jour ou ajouter l'élément
    const existingIndex = userList.findIndex(item => 
        item.id === window.currentEditingItem.id && item.type === window.currentEditingItem.type
    );
    
    if (existingIndex !== -1) {
        // Mettre à jour l'élément existant
        userList[existingIndex].status = status;
        userList[existingIndex].dateUpdated = new Date().toISOString();
        if (stoppedAt) {
            userList[existingIndex].stoppedAt = stoppedAt;
        } else {
            delete userList[existingIndex].stoppedAt;
        }
        console.log(`✅ Élément existant mis à jour à l'index ${existingIndex}`);
    } else {
        // Ajouter un nouvel élément
        window.currentEditingItem.status = status;
        window.currentEditingItem.dateAdded = new Date().toISOString();
        if (stoppedAt) {
            window.currentEditingItem.stoppedAt = stoppedAt;
        }
        userList.push(window.currentEditingItem);
        console.log(`✅ Nouvel élément ajouté`);
    }
    
    try {
        localStorage.setItem(listKey, JSON.stringify(userList));
        console.log(`✅ Liste sauvegardée dans localStorage`);
        
        // Afficher une notification
        showNotification('Statut mis à jour !', 'success');
        
        // Mettre à jour l'affichage en temps réel
        console.log(`🔄 Appel de updateCardDisplay avec l'ID: ${window.currentEditingItem.id}`);
        updateCardDisplay(window.currentEditingItem.id, status);
        
    } catch (e) {
        console.error('Erreur lors de la sauvegarde:', e);
        showNotification('Erreur lors de la sauvegarde.', 'error');
    }
}

// Fonction pour mettre à jour l'affichage d'une carte spécifique
function updateCardDisplay(malId, newStatus) {
    console.log(`🔄 Mise à jour de la carte ${malId} avec le statut: ${newStatus}`);
    
    // Trouver la carte correspondante
    const card = document.querySelector(`.manga-card[data-mal-id="${malId}"]`);
    if (!card) {
        console.log(`❌ Carte non trouvée pour l'ID ${malId}, rechargement complet`);
        // Si la carte n'est pas trouvée, recharger tout l'affichage
        refreshCardsDisplay();
        return;
    }
    
    console.log(`✅ Carte trouvée, mise à jour du bouton`);
    
    // Mettre à jour le bouton de statut
    const statusButton = card.querySelector('.status-btn, .favorite-btn');
    if (statusButton) {
        if (newStatus) {
            // Convertir le bouton favori en bouton de statut
            statusButton.className = 'status-btn';
            statusButton.style.backgroundColor = getStatusColor(newStatus);
            statusButton.title = getStatusText(newStatus) + ' - Cliquez pour modifier';
            
            const icon = statusButton.querySelector('i');
            if (icon) {
                icon.className = getStatusIcon(newStatus);
            }
            
            console.log(`✅ Bouton mis à jour vers le statut: ${newStatus}`);
        } else {
            // Convertir le bouton de statut en bouton favori
            statusButton.className = 'favorite-btn';
            statusButton.style.backgroundColor = '';
            statusButton.title = 'Ajouter aux favoris';
            
            const icon = statusButton.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-bookmark';
            }
            
            console.log(`✅ Bouton mis à jour vers favori`);
        }
    } else {
        console.log(`❌ Bouton de statut non trouvé dans la carte`);
    }
    
    // Si un filtre de statut est actif, recharger l'affichage pour re-trier
    if (elements.statusFilter && elements.statusFilter.value && elements.statusFilter.value !== '') {
        console.log(`🔄 Filtre de statut actif, rechargement pour re-trier`);
        refreshCardsDisplay();
    }
}

// Fonction pour afficher les notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10100;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Fermer le modal en cliquant à l'extérieur
document.addEventListener('click', function(event) {
    const modal = document.getElementById('statusModal');
    if (event.target === modal) {
        closeStatusModal();
    }
});

// Fermer le modal avec la touche Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeStatusModal();
    }
});

// Gérer la recherche
function handleSearch() {
    // Sauvegarder l'état du filtre de genre avant la recherche
    const wasGenreSortActive = isGenreSortActive;
    const savedSelectedGenres = [...selectedGenres];
    console.log('🎭 État du filtre de genre sauvegardé avant recherche:', {
        wasActive: wasGenreSortActive,
        selectedGenres: savedSelectedGenres
    });
    
    const searchTerm = elements.searchInput.value.trim();
    currentFilters.q = searchTerm;
    currentFilters.page = 1; // Réinitialiser à la première page
    
    // Si il y a un terme de recherche, mettre le tri par pertinence par défaut
    if (searchTerm) {
        // Mettre à jour le filtre de tri vers "Pertinence"
        if (elements.orderFilter) {
            elements.orderFilter.value = 'relevance';
        }
        // Pour la pertinence, ne pas définir de tri spécifique (l'API gère automatiquement)
        delete currentFilters.order_by;
        delete currentFilters.sort;
        
        displaySearchTerm(searchTerm);
    } else {
        hideSearchTerm();
    }
    
    // Restaurer l'état du filtre de genre si il était actif
    if (wasGenreSortActive && savedSelectedGenres.length > 0) {
        console.log('🎭 Restauration du filtre de genre après recherche:', {
            wasActive: wasGenreSortActive,
            selectedGenres: savedSelectedGenres
        });
        isGenreSortActive = true;
        selectedGenres = [...savedSelectedGenres];
        updateGenreSortButton();
    }
    
    fetchContentList();
    
    // Sauvegarder l'état après la recherche
    savePageState();
    
    // Réappliquer la traduction après la recherche
    setTimeout(() => {
        if (window.localization) {
            window.localization.applyLanguage();
            // Forcer la retraduction du bouton "Trier par genre"
            forceTranslateGenreSortButton();
        }
    }, 200);
}

// Afficher le terme de recherche
function displaySearchTerm(term) {
    const searchTermDisplay = document.getElementById('search-term-display');
    const searchTermText = document.getElementById('search-term-text');
    
    if (searchTermDisplay && searchTermText) {
        searchTermText.textContent = `Recherche : "${term}"`;
        searchTermDisplay.style.display = 'flex';
    }
}

// Masquer le terme de recherche
function hideSearchTerm() {
    const searchTermDisplay = document.getElementById('search-term-display');
    if (searchTermDisplay) {
        searchTermDisplay.style.display = 'none';
    }
}

// Effacer la recherche
function clearSearch() {
    // Sauvegarder l'état du filtre de genre avant d'effacer la recherche
    const wasGenreSortActive = isGenreSortActive;
    const savedSelectedGenres = [...selectedGenres];
    console.log('🎭 État du filtre de genre sauvegardé avant clearSearch:', {
        wasActive: wasGenreSortActive,
        selectedGenres: savedSelectedGenres
    });
    
    elements.searchInput.value = '';
    currentFilters.q = '';
    currentFilters.page = 1;
    
    // Remettre le tri par défaut (Meilleure note) quand on efface la recherche
    if (elements.orderFilter) {
        elements.orderFilter.value = 'score';
    }
    currentFilters.order_by = 'score';
    currentFilters.sort = 'desc';
    
    // S'assurer que les filtres de tri sont bien définis
    console.log('Tri remis par défaut:', currentFilters.order_by);
    
    // Restaurer l'état du filtre de genre si il était actif
    if (wasGenreSortActive && savedSelectedGenres.length > 0) {
        console.log('🎭 Restauration du filtre de genre après clearSearch:', {
            wasActive: wasGenreSortActive,
            selectedGenres: savedSelectedGenres
        });
        isGenreSortActive = true;
        selectedGenres = [...savedSelectedGenres];
        updateGenreSortButton();
    }
    
    hideSearchTerm();
    fetchContentList();
    
    // Sauvegarder l'état après avoir effacé la recherche
    savePageState();
    
    // Réappliquer la traduction après avoir effacé la recherche
    setTimeout(() => {
        if (window.localization) {
            window.localization.applyLanguage();
            // Forcer la retraduction du bouton "Trier par genre"
            forceTranslateGenreSortButton();
        }
    }, 200);
    
    // Remettre le focus sur la barre de recherche
    elements.searchInput.focus();
}

// Mettre à jour les filtres
function updateFilters() {
    if (isUpdatingFilters) {
        console.log('🔄 updateFilters déjà en cours, ignoré');
        return;
    }
    isUpdatingFilters = true;
    console.log('🔄 Mise à jour des filtres...');
    
    // S'assurer que l'option Doujin est masquée pour les mineurs
    filterDoujinTypeForMinors();
    
    try {
        // Sauvegarder l'état du filtre de genre avant la mise à jour
        const wasGenreSortActive = isGenreSortActive;
        const savedSelectedGenres = [...selectedGenres];
        console.log('🎭 État du filtre de genre sauvegardé:', {
            wasActive: wasGenreSortActive,
            selectedGenres: savedSelectedGenres
        });
        
        let selectedType = elements.typeFilter.value;
        
        // Si l'utilisateur est mineur et que doujin est sélectionné, changer vers manga
        if (typeof isUserMinor === 'function' && isUserMinor() && selectedType === 'doujin') {
            selectedType = 'manga';
            elements.typeFilter.value = 'manga';
            console.log('Type doujin changé vers manga pour utilisateur mineur');
        }
        
        console.log('Type sélectionné:', selectedType);
        
        // Debug: vérifier le filtre de statut
        if (elements.statusFilter) {
            console.log('🔍 Filtre de statut trouvé:', elements.statusFilter.value);
        } else {
            console.log('❌ Filtre de statut NON trouvé');
        }
        
        // Gérer l'affichage du filtre de type d'anime et mettre à jour le type de contenu
        const animeTypeFilterContainer = document.getElementById('anime-type-filter');
        if (animeTypeFilterContainer) {
            if (selectedType === 'anime') {
                animeTypeFilterContainer.style.display = 'block';
                currentContentType = 'anime';
                // Mettre à jour le titre de la page
                const pageTitle = document.querySelector('.page-title');
                if (pageTitle) pageTitle.textContent = 'Animes';
                // Mettre à jour le placeholder de recherche
                elements.searchInput.placeholder = getPlaceholderForType('anime');
            } else {
                animeTypeFilterContainer.style.display = 'none';
                // Réinitialiser le filtre de type d'anime
                if (elements.animeTypeFilter) {
                    elements.animeTypeFilter.value = '';
                }
                
                // Mettre à jour le type de contenu selon la sélection
                if (selectedType === 'manga') {
                    currentContentType = 'manga';
                    const pageTitle = document.querySelector('.page-title');
                    if (pageTitle) pageTitle.textContent = 'Mangas';
                    elements.searchInput.placeholder = getPlaceholderForType('manga');
                } else if (selectedType === 'novel') {
                    currentContentType = 'manga'; // Les novels utilisent l'endpoint manga
                    const pageTitle = document.querySelector('.page-title');
                    if (pageTitle) pageTitle.textContent = 'Romans';
                    elements.searchInput.placeholder = getPlaceholderForType('novel');
                } else if (selectedType === 'doujin') {
                    currentContentType = 'manga'; // Les doujins utilisent l'endpoint manga
                    const pageTitle = document.querySelector('.page-title');
                    if (pageTitle) pageTitle.textContent = 'Doujins';
                    elements.searchInput.placeholder = getPlaceholderForType('doujin');
                } else if (selectedType === 'manhwa') {
                    currentContentType = 'manga'; // Les manhwa utilisent l'endpoint manga
                    const pageTitle = document.querySelector('.page-title');
                    if (pageTitle) pageTitle.textContent = 'Manhwa';
                    elements.searchInput.placeholder = getPlaceholderForType('manhwa');
                } else if (selectedType === 'manhua') {
                    currentContentType = 'manga'; // Les manhua utilisent l'endpoint manga
                    const pageTitle = document.querySelector('.page-title');
                    if (pageTitle) pageTitle.textContent = 'Manhua';
                    elements.searchInput.placeholder = getPlaceholderForType('manhua');
                } else if (selectedType === 'anime') {
                    currentContentType = 'anime'; // Les animes utilisent l'endpoint anime
                    const pageTitle = document.querySelector('.page-title');
                    if (pageTitle) pageTitle.textContent = 'Animes';
                    elements.searchInput.placeholder = getPlaceholderForType('anime');
                } else if (selectedType === '') {
                    // Si aucun type spécifique n'est sélectionné (Tous les types)
                    // Vérifier si on a une recherche ou un filtre de genre
                    const hasSearchQuery = currentFilters.q && currentFilters.q.trim() !== '';
                    const hasGenreFilter = isGenreSortActive && selectedGenres && selectedGenres.length > 0;
                    
                    if (hasSearchQuery || hasGenreFilter) {
                        // Mode recherche combinée activé
                        currentContentType = 'manga'; // Utilisé pour la recherche combinée
                        const pageTitle = document.querySelector('.page-title');
                        if (pageTitle) pageTitle.textContent = 'Mangas & Animes';
                        elements.searchInput.placeholder = getTranslation('search.placeholder', 'Rechercher un manga ou un anime...');
                        console.log('🔍 Mode recherche combinée activé (recherche ou genre)');
                    } else {
                        // Mode par défaut : seulement mangas
                        currentContentType = 'manga';
                        const pageTitle = document.querySelector('.page-title');
                        if (pageTitle) pageTitle.textContent = 'Mangas';
                        elements.searchInput.placeholder = getPlaceholderForType('manga');
                        console.log('📚 Mode par défaut : seulement mangas');
                    }
                }
            }
        }
        
        // Déterminer le type à utiliser pour l'API
        let apiType = selectedType;
        
        // Mapping des types de l'interface vers les tags API
        const typeMapping = {
            'manga': 'manga',
            'novel': 'novel',
            'doujin': 'doujin',
            'manhwa': 'manhwa',
            'manhua': 'manhua',
            'anime': 'anime'
        };
        
        if (typeMapping[selectedType]) {
            apiType = typeMapping[selectedType];
        }
        
        console.log('Type sélectionné pour API:', selectedType);
        console.log('Tag API utilisé:', apiType);
        console.log('Mapping appliqué:', typeMapping[selectedType] || 'Aucun mapping');
        console.log('Filtre anime spécifique:', elements.animeTypeFilter ? elements.animeTypeFilter.value : 'Non disponible');
        
        if (selectedType === 'anime' && elements.animeTypeFilter) {
            if (elements.animeTypeFilter.value && elements.animeTypeFilter.value !== '') {
                apiType = elements.animeTypeFilter.value;
                console.log('Utilisation du type d\'anime spécifique:', apiType);
            } else {
                // Si "Tous les types d'anime" est sélectionné, ne pas ajouter de type
                apiType = ''; // Pas de type spécifique pour avoir tous les types
                console.log('Utilisation du type anime général (tous les types) - pas de type spécifique');
            }
        }
        
        // Mettre à jour les filtres
        console.log('Mise à jour des filtres avec apiType:', apiType);
        
        // Gérer le type
        if (apiType && apiType !== '') {
            currentFilters.type = apiType;
        } else {
            delete currentFilters.type;
        }
        
        // Gérer le statut (tri côté client uniquement)
        // Ne pas envoyer le filtre de statut à l'API, il sera géré côté client
        delete currentFilters.status;
        
        // Gérer le score minimum
        if (elements.ratingFilter && elements.ratingFilter.value) {
            const minScore = parseInt(elements.ratingFilter.value);
            if (minScore > 0) {
                currentFilters.min_score = minScore;
            } else {
                delete currentFilters.min_score;
            }
        } else {
            delete currentFilters.min_score;
        }
        
        // Gérer l'ordre et le tri
        if (elements.orderFilter && elements.orderFilter.value) {
            const orderBy = elements.orderFilter.value;
            
            // Mapper les valeurs de tri vers les paramètres API valides
            // L'API Jikan v4 utilise les mêmes paramètres pour anime et manga
            const orderByMap = {
                'relevance': 'score',
                'score': 'score',
                'popularity': 'popularity',
                'favorites': 'favorites',
                'title': 'title',
                'start_date': 'start_date' // Utiliser 'start_date' pour tous les types
            };
            
            const apiOrderBy = orderByMap[orderBy] || 'score';
            
            // Si c'est "Pertinence" et qu'il y a une recherche, ne pas ajouter de tri spécifique
            if (orderBy === 'relevance' && currentFilters.q && currentFilters.q.trim() !== '') {
                console.log('🔍 Mode pertinence activé - la recherche sera prioritaire');
                delete currentFilters.order_by;
                delete currentFilters.sort;
            } else {
                // Appliquer le tri même lors d'une recherche (sauf pour "Pertinence")
                currentFilters.order_by = apiOrderBy;
                currentFilters.sort = apiOrderBy === 'title' ? 'asc' : 'desc';
                console.log(`✅ Tri appliqué: order_by=${apiOrderBy}, sort=${currentFilters.sort}`);
            }
            
            // Ne pas supprimer automatiquement min_score - laisser l'utilisateur contrôler ce filtre
            // Le filtre min_score est géré séparément plus haut dans la fonction
        }
        
        // Réinitialiser à la première page lors du changement de filtre
        currentFilters.page = 1;
        
        // Restaurer l'état du filtre de genre si il était actif
        if (wasGenreSortActive && savedSelectedGenres.length > 0) {
            console.log('🎭 Restauration du filtre de genre:', {
                wasActive: wasGenreSortActive,
                selectedGenres: savedSelectedGenres
            });
            isGenreSortActive = true;
            selectedGenres = [...savedSelectedGenres];
            updateGenreSortButton();
        }
        
        console.log('Filtres mis à jour:', currentFilters);
        console.log('Type de contenu actuel:', currentContentType);
        console.log('État du filtre de genre après restauration:', {
            isActive: isGenreSortActive,
            selectedGenres: selectedGenres
        });
        
        // Forcer la mise à jour complète
        setTimeout(() => {
            // Toujours recharger les données pour s'assurer que le filtrage fonctionne
            fetchContentList();
        }, 100);
        
        // Sauvegarder l'état après la mise à jour des filtres
        savePageState();
        
        // Réappliquer la traduction après la mise à jour des filtres
        setTimeout(() => {
            if (window.localization) {
                window.localization.applyLanguage();
                // Forcer la retraduction du bouton "Trier par genre"
                forceTranslateGenreSortButton();
            }
        }, 200);
        
        // Ne pas ajouter les nouveautés automatiquement au chargement initial
        // Elles seront ajoutées seulement quand l'utilisateur navigue vers la dernière page
    } finally {
        // Toujours réinitialiser le flag à la fin
        isUpdatingFilters = false;
    }
}

// Fonction pour récupérer et ajouter les nouveautés
async function fetchAndAddNewReleases() {
    // Vérifier qu'on est bien sur la dernière page ET que ce n'est pas le chargement initial
    if (currentPage !== totalPages || currentPage === 1) {
        console.log('🆕 Nouveautés ignorées - pas sur la dernière page ou chargement initial');
        return;
    }
    
    try {
        console.log('🆕 Récupération des nouveautés pour la dernière page...');
        
        // Récupérer les nouveautés (première page avec tri par date)
        const params = new URLSearchParams();
        params.append('limit', 10); // Récupérer 10 nouveautés
        params.append('order_by', 'start_date');
        params.append('sort', 'desc');
        
        const endpoint = currentContentType === 'anime' ? 'anime' : 'manga';
        const url = `${API_BASE_URL}/${endpoint}?${params.toString()}`;
        
        console.log('Fetching nouveautés URL:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data && data.data && data.data.length > 0) {
            console.log(`🆕 ${data.data.length} nouveautés trouvées`);
            
            // Ajouter les nouveautés à la dernière page
            await addNewReleasesToLastPage(data.data);
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des nouveautés:', error);
    }
}

// Fonction pour ajouter les nouveautés à la dernière page
async function addNewReleasesToLastPage(newReleases) {
    try {
        // Récupérer le contenu de la dernière page
        const lastPageParams = new URLSearchParams();
        Object.entries(currentFilters).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined) {
                lastPageParams.append(key, value);
            }
        });
        lastPageParams.append('page', totalPages);
        lastPageParams.append('limit', ITEMS_PER_PAGE);
        
        const endpoint = currentContentType === 'anime' ? 'anime' : 'manga';
        const lastPageUrl = `${API_BASE_URL}/${endpoint}?${lastPageParams.toString()}`;
        
        console.log('Récupération de la dernière page:', lastPageUrl);
        
        const response = await fetch(lastPageUrl);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data && data.data) {
            const lastPageContent = data.data;
            console.log(`Dernière page contient ${lastPageContent.length} éléments`);
            
            // Filtrer les nouveautés qui ne sont pas déjà dans la dernière page
            const existingIds = new Set(lastPageContent.map(item => item.mal_id));
            const uniqueNewReleases = newReleases.filter(item => !existingIds.has(item.mal_id));
            
            console.log(`${uniqueNewReleases.length} nouveautés uniques à ajouter`);
            
            if (uniqueNewReleases.length > 0) {
                // Vérifier si la dernière page a de la place
                if (lastPageContent.length < ITEMS_PER_PAGE) {
                    // Ajouter à la dernière page existante
                    console.log('Ajout à la dernière page existante');
                    await updateLastPageWithNewReleases(lastPageContent, uniqueNewReleases);
                } else {
                    // Créer une nouvelle page
                    console.log('Création d\'une nouvelle page pour les nouveautés');
                    await createNewPageWithReleases(uniqueNewReleases);
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors de l\'ajout des nouveautés:', error);
    }
}

// Fonction pour mettre à jour la dernière page avec les nouveautés
async function updateLastPageWithNewReleases(existingContent, newReleases) {
    // Combiner le contenu existant avec les nouveautés
    const combinedContent = [...existingContent, ...newReleases];
    
    // Limiter à ITEMS_PER_PAGE
    const finalContent = combinedContent.slice(0, ITEMS_PER_PAGE);
    
    // Si on est actuellement sur la dernière page, mettre à jour l'affichage
    if (currentPage === totalPages) {
        displayContentList(finalContent);
    }
    
    console.log(`Dernière page mise à jour avec ${finalContent.length} éléments`);
}

// Fonction pour créer une nouvelle page avec les nouveautés
async function createNewPageWithReleases(newReleases) {
    // Incrémenter le nombre total de pages
    totalPages++;
    
    // Si on est actuellement sur la dernière page, aller à la nouvelle page
    if (currentPage === totalPages - 1) {
        currentPage = totalPages;
        displayContentList(newReleases);
        updatePagination();
    }
    
    console.log(`Nouvelle page créée (page ${totalPages}) avec ${newReleases.length} nouveautés`);
}

// Fonction pour réinitialiser tous les filtres
function resetFilters() {
    console.log('🔄 Réinitialisation complète de tous les filtres...');
    
    // Réinitialiser le tri par genre en premier
    resetGenreSort();
    
    // Vider la barre de recherche
    if (elements.searchInput) {
        elements.searchInput.value = '';
    }
    
    // Supprimer le terme de recherche des filtres
    currentFilters.q = '';
    
    // Cacher l'affichage du terme de recherche
    hideSearchTerm();
    
    // Réinitialiser tous les filtres à leurs valeurs par défaut
    currentFilters = {
        q: '',
        type: 'manga', // Par défaut : manga
        status: '', // Par défaut : tous les statuts
        order_by: 'score',
        sort: 'desc',
        page: 1,
        limit: ITEMS_PER_PAGE
    };
    
    // Réinitialiser les éléments de l'interface
    if (elements.typeFilter) {
        elements.typeFilter.value = 'manga'; // Par défaut : manga
    }
    if (elements.animeTypeFilter) {
        elements.animeTypeFilter.value = '';
    }
    if (elements.statusFilter) {
        elements.statusFilter.value = ''; // Par défaut : tous les statuts
    }
    if (elements.ratingFilter) {
        elements.ratingFilter.value = ''; // Par défaut : toutes les notes
    }
    if (elements.orderFilter) {
        elements.orderFilter.value = 'score';
    }
    
    // Réinitialiser le type de contenu
    currentContentType = 'manga';
    currentPage = 1;
    
    // Mettre à jour l'interface
    updateInterfaceForContentType('manga');
    
    // Effacer l'état sauvegardé
    clearPageState();
    
    // Recharger les données
    fetchContentList();
    
    // Réappliquer la traduction après le changement de page
    setTimeout(() => {
        if (window.localization) {
            window.localization.applyLanguage();
            // Forcer la retraduction du bouton "Trier par genre"
            forceTranslateGenreSortButton();
        }
    }, 200);
    
    console.log('Tous les filtres réinitialisés avec succès en une seule fois');
}

// Changer de page
function changePage(page) {
    if (page < 1 || page > totalPages) return;
    
    const previousPage = currentPage;
    currentPage = page;
    
    // Pagination normale pour un seul type
    currentFilters.page = page;
    fetchContentList();
    
    // Sauvegarder l'état après le changement de page
    savePageState();
    
    // Si on navigue VERS la dernière page (pas si on y était déjà), ajouter les nouveautés
    if (page === totalPages && previousPage !== totalPages) {
        setTimeout(() => {
            fetchAndAddNewReleases();
        }, 2000);
    }
    
    // Faire défiler vers le haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Réappliquer la traduction après le changement de page
    setTimeout(() => {
        if (window.localization) {
            window.localization.applyLanguage();
        }
    }, 300);
}

// Mettre à jour la pagination
function updatePagination() {
    // Désactiver/activer les boutons précédent/suivant
    elements.prevPage.disabled = currentPage === 1;
    elements.nextPage.disabled = currentPage >= totalPages;
    
    // Afficher les numéros de page
    let pageNumbers = '';
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    if (startPage > 1) {
        pageNumbers += `<button class="page-number" data-page="1">1</button>`;
        if (startPage > 2) {
            pageNumbers += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers += `<button class="page-number ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pageNumbers += `<span class="page-ellipsis">...</span>`;
        }
        pageNumbers += `<button class="page-number" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    elements.pageNumbers.innerHTML = pageNumbers;
    
    // Ajouter les écouteurs d'événements aux boutons de page
    document.querySelectorAll('.page-number').forEach(button => {
        button.addEventListener('click', (e) => {
            const page = parseInt(e.target.dataset.page);
            changePage(page);
        });
    });
}

// Afficher/masquer le chargement
function showLoading(show) {
    elements.loading.style.display = show ? 'flex' : 'none';
}

// Afficher une erreur
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
    `;
    
    // Insérer avant la grille
    if (elements.mangaGrid && elements.mangaGrid.parentNode) {
        elements.mangaGrid.parentNode.insertBefore(errorDiv, elements.mangaGrid);
    } else {
        // Si la grille n'est pas disponible, ajouter le message d'erreur au corps du document
        document.body.appendChild(errorDiv);
    }
    
    // Supprimer après 5 secondes
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Tronquer le texte
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Formater la date de diffusion
function formatAiringDate(aired) {
    if (!aired || !aired.from) return 'Non spécifié';
    
    const date = new Date(aired.from);
    if (isNaN(date.getTime())) return 'Date inconnue';
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
}

// === FONCTIONS POUR LE TRI PAR GENRE ===

// Basculer le tri par genre
function toggleGenreSort() {
    const genreContainer = document.getElementById('genre-container');
    
    if (genreContainer.style.display === 'none' || genreContainer.style.display === '') {
        // Afficher le container des genres
        showGenreContainer();
    } else {
        // Masquer le container des genres
        hideGenreContainer();
    }
}

// Afficher le container des genres
function showGenreContainer() {
    const genreContainer = document.getElementById('genre-container');
    const genreGrid = document.querySelector('.genre-grid');
    
    if (!genreContainer || !genreGrid) return;
    
    // Liste des genres en français (clés du mapping)
    let genres = Object.keys(genreMapping);
    
    // Filtrer les genres interdits pour les mineurs
    if (typeof filterForbiddenGenres === 'function') {
        genres = filterForbiddenGenres(genres);
    }
    
    // Vider le grid
    genreGrid.innerHTML = '';
    
    // Créer les boutons de genre avec le style du profil
    genres.forEach(genre => {
        const button = document.createElement('button');
        button.className = 'genre-option';
        button.dataset.genre = genre;
        
        // Traduire le nom du genre
        const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
        let translatedGenre = genre;
        
        if (currentLanguage !== 'fr') {
            // Mapping de traduction des genres
            const genreTranslations = {
                'Action': { en: 'Action', de: 'Action', es: 'Acción', it: 'Azione', ja: 'アクション' },
                'Aventure': { en: 'Adventure', de: 'Abenteuer', es: 'Aventura', it: 'Avventura', ja: '冒険' },
                'Avant-garde': { en: 'Avant Garde', de: 'Avantgarde', es: 'Vanguardia', it: 'Avanguardia', ja: '前衛' },
                'Prix': { en: 'Award Winning', de: 'Preisgekrönt', es: 'Ganador de Premios', it: 'Vincitore di Premi', ja: '受賞作' },
                'Boys Love': { en: 'Boys Love', de: 'Boys Love', es: 'Boys Love', it: 'Boys Love', ja: 'ボーイズラブ' },
                'Comédie': { en: 'Comedy', de: 'Komödie', es: 'Comedia', it: 'Commedia', ja: 'コメディ' },
                'Drame': { en: 'Drama', de: 'Drama', es: 'Drama', it: 'Dramma', ja: 'ドラマ' },
                'Fantasy': { en: 'Fantasy', de: 'Fantasy', es: 'Fantasía', it: 'Fantasy', ja: 'ファンタジー' },
                'Girls Love': { en: 'Girls Love', de: 'Girls Love', es: 'Girls Love', it: 'Girls Love', ja: 'ガールズラブ' },
                'Gastronomie': { en: 'Gourmet', de: 'Gourmet', es: 'Gastronomía', it: 'Gastronomia', ja: 'グルメ' },
                'Horreur': { en: 'Horror', de: 'Horror', es: 'Terror', it: 'Horror', ja: 'ホラー' },
                'Mystère': { en: 'Mystery', de: 'Mystery', es: 'Misterio', it: 'Mistero', ja: 'ミステリー' },
                'Romance': { en: 'Romance', de: 'Romance', es: 'Romance', it: 'Romance', ja: 'ロマンス' },
                'Science-Fiction': { en: 'Sci-Fi', de: 'Science Fiction', es: 'Ciencia Ficción', it: 'Sci-Fi', ja: 'SF' },
                'Tranche de vie': { en: 'Slice of Life', de: 'Slice of Life', es: 'Recuentos de la Vida', it: 'Slice of Life', ja: '日常' },
                'Sport': { en: 'Sports', de: 'Sport', es: 'Deportes', it: 'Sport', ja: 'スポーツ' },
                'Surnaturel': { en: 'Supernatural', de: 'Übernatürlich', es: 'Sobrenatural', it: 'Soprannaturale', ja: '超自然' },
                'Suspense': { en: 'Suspense', de: 'Spannung', es: 'Suspenso', it: 'Suspense', ja: 'サスペンス' },
                'Ecchi': { en: 'Ecchi', de: 'Ecchi', es: 'Ecchi', it: 'Ecchi', ja: 'エッチ' },
                'Érotique': { en: 'Erotica', de: 'Erotik', es: 'Erótica', it: 'Erotica', ja: 'エロ' },
                'Hentai': { en: 'Hentai', de: 'Hentai', es: 'Hentai', it: 'Hentai', ja: '変態' },
                'Casting adulte': { en: 'Adult Cast', de: 'Erwachsenenbesetzung', es: 'Reparto Adulto', it: 'Cast Adulto', ja: '大人向け' },
                'Anthropomorphique': { en: 'Anthropomorphic', de: 'Anthropomorph', es: 'Antropomórfico', it: 'Antropomorfico', ja: '擬人化' },
                'CGDCT': { en: 'CGDCT', de: 'CGDCT', es: 'CGDCT', it: 'CGDCT', ja: 'CGDCT' },
                'Garde d\'enfants': { en: 'Childcare', de: 'Kinderbetreuung', es: 'Cuidado Infantil', it: 'Cura dei Bambini', ja: '育児' },
                'Sport de combat': { en: 'Combat Sports', de: 'Kampfsport', es: 'Deportes de Combate', it: 'Sport di Combattimento', ja: '格闘技' },
                'Travestissement': { en: 'Crossdressing', de: 'Crossdressing', es: 'Travestismo', it: 'Travestitismo', ja: '女装' },
                'Délinquants': { en: 'Delinquents', de: 'Delinquenten', es: 'Delincuentes', it: 'Delinquenti', ja: '不良' },
                'Détective': { en: 'Detective', de: 'Detektiv', es: 'Detective', it: 'Detective', ja: '探偵' },
                'Éducatif': { en: 'Educational', de: 'Bildung', es: 'Educativo', it: 'Educativo', ja: '教育' },
                'Humour gags': { en: 'Gag Humor', de: 'Gag-Humor', es: 'Humor de Gags', it: 'Umorismo Gag', ja: 'ギャグ' },
                'Gore': { en: 'Gore', de: 'Gore', es: 'Gore', it: 'Gore', ja: 'グロ' },
                'Harem': { en: 'Harem', de: 'Harem', es: 'Harem', it: 'Harem', ja: 'ハーレム' },
                'Jeu à enjeux élevés': { en: 'High Stakes Game', de: 'Hochrisiko-Spiel', es: 'Juego de Alto Riesgo', it: 'Gioco ad Alto Rischio', ja: 'ハイリスクゲーム' },
                'Historique': { en: 'Historical', de: 'Historisch', es: 'Histórico', it: 'Storico', ja: '歴史' },
                'Idoles (Femmes)': { en: 'Idols (Female)', de: 'Idols (Weiblich)', es: 'Idols (Femeninas)', it: 'Idols (Femminili)', ja: 'アイドル（女性）' },
                'Idoles (Hommes)': { en: 'Idols (Male)', de: 'Idols (Männlich)', es: 'Idols (Masculinas)', it: 'Idols (Maschili)', ja: 'アイドル（男性）' },
                'Isekai': { en: 'Isekai', de: 'Isekai', es: 'Isekai', it: 'Isekai', ja: '異世界' },
                'Iyashikei': { en: 'Iyashikei', de: 'Iyashikei', es: 'Iyashikei', it: 'Iyashikei', ja: '癒し系' },
                'Polygone amoureux': { en: 'Love Polygon', de: 'Liebespolygon', es: 'Polígono Amoroso', it: 'Poligono Amoroso', ja: '恋愛多角形' },
                'Statut amoureux': { en: 'Love Status', de: 'Liebesstatus', es: 'Estado Amoroso', it: 'Stato Amoroso', ja: '恋愛状況' },
                'Changement de sexe magique': { en: 'Magical Sex Shift', de: 'Magischer Geschlechtswechsel', es: 'Cambio de Sexo Mágico', it: 'Cambio di Sesso Magico', ja: '魔法性転換' },
                'Magical Girl': { en: 'Magical Girl', de: 'Magical Girl', es: 'Chica Mágica', it: 'Magical Girl', ja: '魔法少女' },
                'Arts martiaux': { en: 'Martial Arts', de: 'Kampfkunst', es: 'Artes Marciales', it: 'Arti Marziali', ja: '武術' },
                'Mecha': { en: 'Mecha', de: 'Mecha', es: 'Mecha', it: 'Mecha', ja: 'メカ' },
                'Médical': { en: 'Medical', de: 'Medizinisch', es: 'Médico', it: 'Medico', ja: '医療' },
                'Militaire': { en: 'Military', de: 'Militärisch', es: 'Militar', it: 'Militare', ja: '軍事' },
                'Musique': { en: 'Music', de: 'Musik', es: 'Música', it: 'Musica', ja: '音楽' },
                'Mythologie': { en: 'Mythology', de: 'Mythologie', es: 'Mitología', it: 'Mitologia', ja: '神話' },
                'Crime organisé': { en: 'Organized Crime', de: 'Organisierte Kriminalität', es: 'Crimen Organizado', it: 'Crimine Organizzato', ja: '組織犯罪' },
                'Culture Otaku': { en: 'Otaku Culture', de: 'Otaku-Kultur', es: 'Cultura Otaku', it: 'Cultura Otaku', ja: 'オタク文化' },
                'Parodie': { en: 'Parody', de: 'Parodie', es: 'Parodia', it: 'Parodia', ja: 'パロディ' },
                'Arts du spectacle': { en: 'Performing Arts', de: 'Darstellende Kunst', es: 'Artes Escénicas', it: 'Arti dello Spettacolo', ja: '芸能' },
                'Animaux': { en: 'Pets', de: 'Haustiere', es: 'Mascotas', it: 'Animali Domestici', ja: 'ペット' },
                'Psychologique': { en: 'Psychological', de: 'Psychologisch', es: 'Psicológico', it: 'Psicologico', ja: '心理' },
                'Course': { en: 'Racing', de: 'Rennsport', es: 'Carreras', it: 'Corse', ja: 'レーシング' },
                'Réincarnation': { en: 'Reincarnation', de: 'Reinkarnation', es: 'Reencarnación', it: 'Reincarnazione', ja: '転生' },
                'Harem inversé': { en: 'Reverse Harem', de: 'Reverse Harem', es: 'Harem Inverso', it: 'Harem Inverso', ja: '逆ハーレム' },
                'Samouraï': { en: 'Samurai', de: 'Samurai', es: 'Samurái', it: 'Samurai', ja: '侍' },
                'École': { en: 'School', de: 'Schule', es: 'Escuela', it: 'Scuola', ja: '学校' },
                'Showbiz': { en: 'Showbiz', de: 'Showbiz', es: 'Showbiz', it: 'Showbiz', ja: '芸能界' },
                'Espace': { en: 'Space', de: 'Weltraum', es: 'Espacio', it: 'Spazio', ja: '宇宙' },
                'Jeu de stratégie': { en: 'Strategy Game', de: 'Strategiespiel', es: 'Juego de Estrategia', it: 'Gioco di Strategia', ja: '戦略ゲーム' },
                'Super pouvoir': { en: 'Super Power', de: 'Superkraft', es: 'Super Poder', it: 'Super Potere', ja: '超能力' },
                'Survie': { en: 'Survival', de: 'Überleben', es: 'Supervivencia', it: 'Sopravvivenza', ja: 'サバイバル' },
                'Sport d\'équipe': { en: 'Team Sports', de: 'Mannschaftssport', es: 'Deportes de Equipo', it: 'Sport di Squadra', ja: 'チームスポーツ' },
                'Voyage temporel': { en: 'Time Travel', de: 'Zeitreise', es: 'Viaje en el Tiempo', it: 'Viaggio nel Tempo', ja: '時間旅行' },
                'Fantasy urbaine': { en: 'Urban Fantasy', de: 'Urbane Fantasy', es: 'Fantasía Urbana', it: 'Fantasy Urbana', ja: 'アーバンファンタジー' },
                'Vampire': { en: 'Vampire', de: 'Vampir', es: 'Vampiro', it: 'Vampiro', ja: '吸血鬼' },
                'Jeu vidéo': { en: 'Video Game', de: 'Videospiel', es: 'Videojuego', it: 'Videogioco', ja: 'ゲーム' },
                'Villainess': { en: 'Villainess', de: 'Villainess', es: 'Villana', it: 'Villainess', ja: '悪役令嬢' },
                'Arts visuels': { en: 'Visual Arts', de: 'Bildende Kunst', es: 'Artes Visuales', it: 'Arti Visive', ja: '視覚芸術' },
                'Lieu de travail': { en: 'Workplace', de: 'Arbeitsplatz', es: 'Lugar de Trabajo', it: 'Luogo di Lavoro', ja: '職場' }
            };
            
            if (genreTranslations[genre] && genreTranslations[genre][currentLanguage]) {
                translatedGenre = genreTranslations[genre][currentLanguage];
            }
        }
        
        button.textContent = translatedGenre;
        
        // Vérifier si ce genre est déjà sélectionné
        if (selectedGenres && selectedGenres.includes(genre)) {
            button.classList.add('selected');
        }
        
        genreGrid.appendChild(button);
    });
    
    // Afficher le container
    genreContainer.style.display = 'block';
    
    // Ajouter les écouteurs d'événements
    document.querySelectorAll('.genre-option').forEach(button => {
        button.addEventListener('click', () => {
            const genre = button.dataset.genre;
            
            // Vérifier si le genre est déjà sélectionné
            const isSelected = selectedGenres.includes(genre);
            
            if (isSelected) {
                // Désélectionner le genre
                selectedGenres = selectedGenres.filter(g => g !== genre);
                button.classList.remove('selected');
            } else {
                // Vérifier la limite de 3 genres
                if (selectedGenres.length >= 3) {
                    alert('Vous ne pouvez sélectionner que 3 genres maximum.');
                    return;
                }
                
                // Sélectionner le genre
                selectedGenres.push(genre);
                button.classList.add('selected');
            }
            
            // Mettre à jour l'état
            isGenreSortActive = selectedGenres.length > 0;
            updateGenreSortButton();
            
            // Appliquer le tri par genre
            if (isGenreSortActive) {
                applyGenreSort();
            } else {
                // Si aucun genre sélectionné, recharger les données normales
                fetchContentList();
            }
            
            // Fermer automatiquement le container des genres après sélection
            setTimeout(() => {
                hideGenreContainer();
            }, 300);
        });
    });
    
    // Mettre à jour le bouton pour indiquer qu'il est actif
    updateGenreSortButton();
}

// Fonction pour mettre à jour les traductions des genres quand la langue change
function updateGenreTranslations() {
    const genreContainer = document.getElementById('genre-container');
    if (genreContainer && genreContainer.style.display !== 'none') {
        // Recharger les genres avec les nouvelles traductions
        showGenreContainer();
    }
}

// Exposer la fonction globalement
window.updateGenreTranslations = updateGenreTranslations;

// Masquer le container des genres
function hideGenreContainer() {
    const genreContainer = document.getElementById('genre-container');
    if (genreContainer) {
        genreContainer.style.display = 'none';
    }
}

// Désactiver complètement le tri par genre
function disableGenreSort() {
    isGenreSortActive = false;
    selectedGenres = [];
    updateGenreSortButton();
    hideGenreContainer();
    
    // Supprimer le paramètre genres des filtres
    if (currentFilters.genres) {
        delete currentFilters.genres;
    }
    
    // Recharger les données sans tri par genre
    fetchContentList();
    
    // Réafficher la pagination
    const pagination = document.querySelector('.pagination');
    if (pagination) {
        pagination.style.display = 'flex';
    }
}

// Mapping des genres français vers IDs Jikan
const genreMapping = {
    'Action': 1,
    'Aventure': 2,
    'Avant-garde': 5,
    'Prix': 46,
    'Boys Love': 28,
    'Comédie': 4,
    'Drame': 8,
    'Fantasy': 10,
    'Girls Love': 26,
    'Gastronomie': 47,
    'Horreur': 14,
    'Mystère': 7,
    'Romance': 22,
    'Science-Fiction': 24,
    'Tranche de vie': 36,
    'Sport': 30,
    'Surnaturel': 37,
    'Suspense': 41,
    'Ecchi': 9,
    'Érotique': 49,
    'Hentai': 12,
    'Casting adulte': 50,
    'Anthropomorphique': 51,
    'CGDCT': 52,
    'Garde d\'enfants': 53,
    'Sport de combat': 54,
    'Travestissement': 81,
    'Délinquants': 55,
    'Détective': 39,
    'Éducatif': 56,
    'Humour gags': 57,
    'Gore': 58,
    'Harem': 35,
    'Jeu à enjeux élevés': 59,
    'Historique': 13,
    'Idoles (Femmes)': 60,
    'Idoles (Hommes)': 61,
    'Isekai': 62,
    'Iyashikei': 63,
    'Polygone amoureux': 64,
    'Statut amoureux': 65,
    'Changement de sexe magique': 66,
    'Magical Girl': 66,
    'Arts martiaux': 17,
    'Mecha': 18,
    'Médical': 67,
    'Militaire': 38,
    'Musique': 19,
    'Mythologie': 20,
    'Crime organisé': 40,
    'Culture Otaku': 68,
    'Parodie': 69,
    'Arts du spectacle': 70,
    'Animaux': 71,
    'Psychologique': 40,
    'Course': 3,
    'Réincarnation': 72,
    'Harem inversé': 69,
    'Samouraï': 21,
    'École': 23,
    'Showbiz': 73,
    'Espace': 29,
    'Jeu de stratégie': 11,
    'Super pouvoir': 31,
    'Survie': 74,
    'Sport d\'équipe': 75,
    'Voyage temporel': 76,
    'Fantasy urbaine': 77,
    'Vampire': 32,
    'Jeu vidéo': 11,
    'Villainess': 78,
    'Arts visuels': 79,
    'Lieu de travail': 80
};

// Appliquer le tri par genre
async function applyGenreSort() {
    if (!selectedGenres || selectedGenres.length === 0) {
        // Si aucun genre sélectionné, revenir à l'état normal
        isGenreSortActive = false;
        // Supprimer le paramètre genres des filtres
        if (currentFilters.genres) {
            delete currentFilters.genres;
        }
        await fetchContentList();
        return;
    }
    
    console.log(`🎭 Tri par genres activé: ${selectedGenres.join(', ')}`);
    

    
    // Traduire les genres français vers IDs pour l'API
    const genreIds = selectedGenres.map(genre => {
        const genreId = genreMapping[genre];
        if (!genreId) {
            console.log('❌ Genre non trouvé dans le mapping:', genre);
            return null;
        }
        return genreId;
    }).filter(genreId => genreId !== null);
    
    if (genreIds.length === 0) {
        console.log('❌ Aucun genre valide trouvé');
        return;
    }
    
    console.log('🔍 IDs de genres pour API:', genreIds);
    
    // Sauvegarder les filtres actuels
    const originalFilters = { ...currentFilters };
    
    // Utiliser seulement le premier genre sélectionné pour l'API
    const selectedGenreId = genreIds[0];
    
    // Réinitialiser la pagination
    currentPage = 1;
    
    try {
        showLoading(true);
        
        // Construire l'URL avec les paramètres
        const params = new URLSearchParams();
        
        // Ajouter les filtres de base (sans genres)
        Object.entries(currentFilters).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined && key !== 'genres') {
                params.append(key, value);
            }
        });
        
        // Ajouter le genre comme paramètre de recherche
        params.append('genres', selectedGenreId);
        
        // S'assurer que le paramètre limit est toujours présent
        if (!params.has('limit')) {
            params.append('limit', ITEMS_PER_PAGE);
        }
        
        // Recherche normale pour un seul type
        const endpoint = currentContentType === 'anime' ? 'anime' : 'manga';
        let url = `${API_BASE_URL}/${endpoint}`;
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        console.log('🔍 Requête API avec genre:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API Response avec genre:', data);
        
        // Vérifier si les données sont valides
        if (!data || !data.data) {
            throw new Error('Réponse API invalide : données manquantes');
        }
        
        console.log(`🎭 ${data.data.length} éléments trouvés pour le genre "${selectedGenres[0]}"`);
        
        // Mettre à jour la pagination
        totalPages = data.pagination.last_visible_page;
        currentPage = data.pagination.current_page;
        
        // Mettre à jour la liste globale
        currentMangaList = data.data;
        
        // Mettre à jour l'interface utilisateur
        updatePagination();
        displayContentList(data.data);
        
    } catch (error) {
        console.error('Erreur lors du tri par genre:', error);
        showError('Une erreur est survenue lors du tri par genre.');
        
        // Restaurer les filtres originaux en cas d'erreur
        currentFilters = originalFilters;
    } finally {
        showLoading(false);
    }
}

// Mettre à jour le bouton de tri par genre
async function updateGenreSortButton() {
    const genreSortBtn = document.getElementById('genre-sort-btn');
    if (!genreSortBtn) return;
    
    if (isGenreSortActive && selectedGenres.length > 0) {
        // Traduire le nom du genre sélectionné
        const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
        const translatedGenre = await translateGenreName(selectedGenres[0], currentLanguage);
        const displayText = selectedGenres.length === 1 ? translatedGenre : `${translatedGenre} (+${selectedGenres.length - 1})`;
        genreSortBtn.innerHTML = `<i class="fas fa-tags"></i> ${displayText}`;
        genreSortBtn.style.background = 'var(--primary-dark)';
        
        // Traduire le titre du bouton selon la langue actuelle
        let titleText = '';
        if (window.localization && window.localization.translations) {
            const translations = window.localization.translations[currentLanguage];
            if (translations) {
                if (currentLanguage === 'en') {
                    titleText = `Active filter: ${translatedGenre} (${selectedGenres.length} selected) - Click to disable`;
                } else if (currentLanguage === 'de') {
                    titleText = `Aktiver Filter: ${translatedGenre} (${selectedGenres.length} ausgewählt) - Klicken zum Deaktivieren`;
                } else if (currentLanguage === 'es') {
                    titleText = `Filtro activo: ${translatedGenre} (${selectedGenres.length} seleccionados) - Haga clic para desactivar`;
                } else if (currentLanguage === 'it') {
                    titleText = `Filtro attivo: ${translatedGenre} (${selectedGenres.length} selezionati) - Clicca per disattivare`;
                } else if (currentLanguage === 'ja') {
                    titleText = `アクティブフィルター: ${translatedGenre} (${selectedGenres.length} 選択済み) - 無効にするにはクリック`;
                } else {
                    titleText = `Tri actif: ${translatedGenre} (${selectedGenres.length} sélectionnés) - Cliquez pour désactiver`;
                }
            }
        }
        genreSortBtn.title = titleText;
    } else {
        const lang = getEffectiveLang();
        const buttonText = getGenreSortButtonLabel();
        let titleText = 'Cliquez pour trier par genre';
        if (lang === 'en') {
            titleText = 'Click to sort by genre';
        } else if (lang === 'de') {
            titleText = 'Klicken Sie, um nach Genre zu sortieren';
        } else if (lang === 'es') {
            titleText = 'Haga clic para ordenar por género';
        } else if (lang === 'it') {
            titleText = 'Clicca per ordinare per genere';
        } else if (lang === 'ja') {
            titleText = 'ジャンルで並べ替えるにはクリック';
        }
        
        // Mettre à jour le span avec data-i18n pour garder la traduction au prochain applyLanguage
        const spanElement = genreSortBtn.querySelector('span[data-i18n="genre_sort"]');
        if (spanElement) {
            spanElement.textContent = buttonText;
        } else {
            genreSortBtn.innerHTML = `<i class="fas fa-tags"></i> <span data-i18n="genre_sort">${buttonText}</span>`;
        }
        
        genreSortBtn.style.background = 'var(--primary)';
        genreSortBtn.title = titleText;
    }
}

// Mettre à jour la pagination pour les résultats filtrés
function updatePaginationForFilteredResults(filteredContent) {
    // Pour le tri par genre, on affiche tous les résultats sur une seule page
    currentPage = 1;
    totalPages = 1;
    
    // Masquer la pagination car tous les résultats sont affichés
    const pagination = document.querySelector('.pagination');
    if (pagination) {
        pagination.style.display = 'none';
    }
}

// Réinitialiser le tri par genre dans resetFilters
function resetGenreSort() {
    disableGenreSort();
}

// Gestionnaire d'événements global pour les boutons favori et statut
document.addEventListener('click', function(event) {
    if (event.target.closest('.favorite-btn') || event.target.closest('.status-btn')) {
        const button = event.target.closest('.favorite-btn') || event.target.closest('.status-btn');
        const malId = button.getAttribute('data-mal-id');
        const title = button.getAttribute('data-title');
        const type = button.getAttribute('data-type');
        const imageUrl = button.getAttribute('data-image-url');
        const synopsis = button.getAttribute('data-synopsis');
        const episodes = button.getAttribute('data-episodes');
        const year = button.getAttribute('data-year');
        
        addToFavorites(event, malId, title, type, imageUrl, synopsis, episodes, year);
    }
    
    // Gestionnaire d'événement pour la croix de réinitialisation de recherche
    if (event.target.closest('#clear-search-btn')) {
        console.log('🗑️ Clic sur la croix de réinitialisation de recherche');
        clearSearch();
    }
});


