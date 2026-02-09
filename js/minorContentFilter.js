// Système de filtrage de contenu pour les utilisateurs mineurs
// Ce fichier gère la censure des genres à caractère sexuel pour les mineurs

/**
 * Liste des genres interdits pour les utilisateurs mineurs
 * Ces genres seront masqués si l'utilisateur a indiqué être mineur lors de l'inscription
 */
const FORBIDDEN_GENRES_FOR_MINORS = [
    // 'Doujin', // Retiré - Doujin n'est plus filtré
    // 'Ecchi', // Retiré - Ecchi est maintenant disponible
    'Érotique',
    'Hentai',
    'Casting adulte'
];

/**
 * Liste des mots-clés dans les titres qui indiquent un contenu adulte
 */
const ADULT_CONTENT_KEYWORDS = [
    // 'doujin', // Retiré - doujin n'est plus filtré
    // 'ecchi', // Retiré - ecchi est maintenant disponible
    'hentai',
    'adult',
    'erotic',
    'érotique'
];

/**
 * Vérifie si l'utilisateur actuel est mineur
 * @returns {boolean} true si l'utilisateur est mineur, false sinon
 */
function isUserMinor() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user || !user.email) {
            return false; // Si pas connecté, on considère comme majeur par défaut
        }
        
        // Vérifier dans le profil utilisateur
        if (user.isMinor === true) {
            return true;
        }
        
        // Vérifier aussi dans les comptes sauvegardés (pour compatibilité)
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        const account = accounts.find(acc => acc.email === user.email);
        if (account && account.isMinor === true) {
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Erreur lors de la vérification du statut mineur:', error);
        return false;
    }
}

/**
 * Vérifie si un genre est interdit pour les mineurs
 * @param {string} genre - Le nom du genre à vérifier
 * @returns {boolean} true si le genre est interdit, false sinon
 */
function isGenreForbidden(genre) {
    if (!genre) return false;
    const genreLower = genre.toLowerCase().trim();
    return FORBIDDEN_GENRES_FOR_MINORS.some(forbidden => 
        forbidden.toLowerCase() === genreLower
    );
}

/**
 * Vérifie si un anime/manga contient des genres interdits
 * @param {Object} anime - L'objet anime/manga à vérifier
 * @returns {boolean} true si le contenu contient des genres interdits, false sinon
 */
function hasForbiddenContent(anime) {
    if (!anime) return false;
    
    // Vérifier les genres
    if (anime.genres && Array.isArray(anime.genres)) {
        const hasForbiddenGenre = anime.genres.some(genre => isGenreForbidden(genre));
        if (hasForbiddenGenre) return true;
    }
    
    // Vérifier le contentType (doujin n'est plus filtré automatiquement)
    // if (anime.contentType === 'doujin') {
    //     return true;
    // }
    
    // Vérifier le titre pour des mots-clés interdits (sauf doujin qui n'est plus interdit)
    const titre = (anime.titre || anime.title || anime.name || '').toLowerCase();
    const forbiddenKeywords = ADULT_CONTENT_KEYWORDS.filter(k => k !== 'doujin'); // Exclure doujin
    const hasForbiddenKeyword = forbiddenKeywords.some(keyword => 
        titre.includes(keyword)
    );
    if (hasForbiddenKeyword) return true;
    
    // Vérifier l'ID pour des mots-clés interdits (sauf doujin)
    // const animeId = String(anime.id || '').toLowerCase();
    // if (animeId.includes('doujin')) return true; // Doujin n'est plus filtré
    
    return false;
}

/**
 * Filtre une liste d'animes/mangas pour retirer ceux interdits aux mineurs
 * @param {Array} animes - La liste d'animes/mangas à filtrer
 * @returns {Array} La liste filtrée
 */
function filterForbiddenContent(animes) {
    if (!Array.isArray(animes)) return animes;
    
    // Si l'utilisateur n'est pas mineur, retourner la liste complète
    if (!isUserMinor()) {
        return animes;
    }
    
    // Filtrer les contenus interdits
    return animes.filter(anime => !hasForbiddenContent(anime));
}

/**
 * Filtre une liste de genres pour retirer ceux interdits aux mineurs
 * @param {Array} genres - La liste de genres à filtrer
 * @returns {Array} La liste filtrée
 */
function filterForbiddenGenres(genres) {
    if (!Array.isArray(genres)) return genres;
    
    // Si l'utilisateur n'est pas mineur, retourner la liste complète
    if (!isUserMinor()) {
        return genres;
    }
    
    // Filtrer les genres interdits
    return genres.filter(genre => !isGenreForbidden(genre));
}

// Exporter les fonctions pour utilisation globale
if (typeof window !== 'undefined') {
    window.isUserMinor = isUserMinor;
    window.isGenreForbidden = isGenreForbidden;
    window.hasForbiddenContent = hasForbiddenContent;
    window.filterForbiddenContent = filterForbiddenContent;
    window.filterForbiddenGenres = filterForbiddenGenres;
    window.FORBIDDEN_GENRES_FOR_MINORS = FORBIDDEN_GENRES_FOR_MINORS;
}

