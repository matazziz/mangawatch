// Système de recherche en temps réel
class SearchManager {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchType = document.getElementById('searchType');
        this.searchResults = document.getElementById('search-results');
        this.searchForm = document.getElementById('searchForm');
        this.searchTimeout = null;
        this.debounceTime = 300;
        this.maxResults = 4;
        this.clearBtn = null;
        
        if (this.searchInput && this.searchResults) {
            this.init();
        }
    }
    
    getTypeIconClass(value) {
        var map = { manga: 'fa-book', anime: 'fa-tv', movie: 'fa-film', manhwa: 'fa-book', manhua: 'fa-book', user: 'fa-user' };
        return map[value] || 'fa-book';
    }
    
    init() {
        // Icône du type de recherche (à gauche du select)
        this.setupTypeIcon();
        // Bouton croix pour effacer le texte
        this.setupClearButton();
        
        // Recherche en temps réel
        this.searchInput.addEventListener('input', (e) => {
            this.updateClearButtonVisibility();
            this.handleSearch(e.target.value);
        });
        
        // Quand on change de type : relancer immédiatement la recherche avec le nouveau type si du texte est saisi
        if (this.searchType) {
            this.searchType.addEventListener('change', () => {
                const query = this.searchInput.value.trim();
                if (query.length >= 2) {
                    this.search(query);
                } else {
                    this.hideResults();
                }
            });
        }
        
        // Cacher les résultats si on clique ailleurs (pas sur la barre de recherche ni le dropdown)
        // Ne pas cacher quand on clique sur le bouton d'effacement pour éviter un état bloqué
        document.addEventListener('click', (e) => {
            if (e.target.closest('.search-clear-btn')) return;
            if (!e.target.closest('.search-wrapper')) {
                this.hideResults();
            }
        });
        
        // Empêcher le submit du formulaire
        if (this.searchForm) {
            this.searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.searchInput.value.trim()) {
                    this.performFullSearch();
                }
            });
        }
        
        // Navigation au clavier
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSearch();
            }
        });
    }
    
    setupTypeIcon() {
        if (!this.searchType || !this.searchType.parentNode) return;
        var select = this.searchType;
        var wrapper = document.createElement('div');
        wrapper.className = 'search-type-with-icon';
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        var iconSpan = document.createElement('span');
        iconSpan.className = 'search-type-icon';
        iconSpan.setAttribute('aria-hidden', 'true');
        var iconClass = this.getTypeIconClass(select.value);
        iconSpan.innerHTML = '<i class="fas ' + iconClass + '"></i>';
        wrapper.insertBefore(iconSpan, select);
        var self = this;
        function updateIcon() {
            var cls = self.getTypeIconClass(select.value);
            var i = iconSpan.querySelector('i');
            if (i) {
                i.className = 'fas ' + cls;
            }
        }
        select.addEventListener('change', updateIcon);
        document.addEventListener('translationsApplied', updateIcon);
    }
    
    setupClearButton() {
        const submitBtn = this.searchForm?.querySelector('button[type="submit"]');
        if (!submitBtn) return;
        
        this.clearBtn = document.createElement('button');
        this.clearBtn.type = 'button';
        this.clearBtn.className = 'search-clear-btn';
        this.clearBtn.setAttribute('aria-label', (typeof window.t === 'function' && window.t('search.clear_aria')) || 'Effacer la recherche');
        this.clearBtn.innerHTML = '<i class="fas fa-times"></i>';
        this.clearBtn.style.display = 'none';
        
        this.clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.clearSearch();
        });
        
        submitBtn.parentNode.insertBefore(this.clearBtn, submitBtn);
        document.addEventListener('translationsApplied', function() {
            if (this.clearBtn && typeof window.t === 'function') {
                this.clearBtn.setAttribute('aria-label', window.t('search.clear_aria') || 'Effacer la recherche');
            }
        }.bind(this));
    }
    
    updateClearButtonVisibility() {
        if (this.clearBtn) {
            this.clearBtn.style.display = this.searchInput.value.trim() ? 'flex' : 'none';
        }
    }
    
    clearSearch() {
        this.searchInput.value = '';
        this.updateClearButtonVisibility();
        this.hideResults();
        this.searchInput.focus();
    }
    
    handleSearch(query) {
        clearTimeout(this.searchTimeout);
        
        if (!query || query.trim().length < 2) {
            this.hideResults();
            return;
        }
        
        this.searchTimeout = setTimeout(() => {
            this.search(query);
        }, this.debounceTime);
    }
    
    async search(query) {
        const selectedType = this.searchType?.value || 'manga';
        
        try {
            // Ne chercher que pour anime, manga, etc. (pas utilisateur pour l'instant)
            if (selectedType === 'user') {
                this.displayUserSearchResults(query);
                return;
            }
            
            const results = await this.fetchSearchResults(query, selectedType);
            this.displayResults(results, selectedType);
            
            if (results.length > 0) {
                this.showResults();
            } else {
                this.displayNoResults();
                this.showResults();
            }
        } catch (error) {
            console.error('Erreur de recherche:', error);
            this.displayError();
        }
    }
    
    async fetchSearchResults(query, type) {
        const API_BASE_URL = 'https://api.jikan.moe/v4';
        
        // Mapper les types vers les endpoints de l'API
        let endpoint = 'anime';
        let filterType = null;
        
        if (type === 'manga') {
            endpoint = 'manga';
            filterType = null; // Pas de filtre pour manga
        } else if (type === 'movie') {
            endpoint = 'anime';
            filterType = 'movie'; // Filtrer uniquement les films
        }
        
        const response = await fetch(`${API_BASE_URL}/${endpoint}?q=${encodeURIComponent(query)}&limit=20`);
        
        if (!response.ok) {
            throw new Error('Erreur de l\'API');
        }
        
        const data = await response.json();
        
        // Filtrer et formater les résultats
        let results = data.data || [];
        
        // Filtrer selon le type spécifique
        if (filterType === 'movie') {
            // Filtrer pour ne garder que les films
            results = results.filter(item => {
                const type = item.type?.toLowerCase() || '';
                return type === 'movie';
            });
        }
        
        // Trier les résultats par pertinence et popularité
        results = this.sortByRelevanceAndPopularity(results, query);
        
        // Limiter à 4 résultats les plus pertinents
        results = results.slice(0, this.maxResults);
        
        return results.map(item => ({
            id: item.mal_id,
            title: item.title,
            titleEnglish: item.title_english || item.title,
            image: item.images?.jpg?.image_url || item.images?.jpg?.small_image_url || '',
            type: endpoint,
            score: item.score || 0,
            synopsis: item.synopsis || '',
            genres: item.genres?.map(g => g.name) || []
        }));
    }
    
    sortByRelevanceAndPopularity(results, query) {
        const lowerQuery = query.toLowerCase().trim();
        
        return results.sort((a, b) => {
            const titleA = (a.title_english || a.title || '').toLowerCase();
            const titleB = (b.title_english || b.title || '').toLowerCase();
            
            // Calculer le score de pertinence pour chaque résultat
            const relevanceA = this.calculateRelevanceScore(titleA, lowerQuery);
            const relevanceB = this.calculateRelevanceScore(titleB, lowerQuery);
            
            // Si la pertinence est différente, trier par pertinence (priorité absolue)
            if (relevanceA !== relevanceB) {
                return relevanceB - relevanceA;
            }
            
            // Si la pertinence est identique, trier par popularité (score)
            const scoreA = a.score || 0;
            const scoreB = b.score || 0;
            
            return scoreB - scoreA;
        });
    }
    
    calculateRelevanceScore(title, query) {
        // Correspondance exacte = score maximal
        if (title === query) return 1000;
        
        // Commence par la requête = score très élevé
        if (title.startsWith(query)) return 500;
        
        // Contient la requête comme mot entier = score élevé
        const words = title.split(/\s+/);
        if (words.some(word => word === query)) return 300;
        
        // Commence par la requête (après espaces) = score moyen-élevé
        if (words.some(word => word.startsWith(query))) return 200;
        
        // Contient la requête n'importe où = score de base
        if (title.includes(query)) return 100;
        
        // Aucune correspondance directe
        return 0;
    }
    
    displayResults(results, selectedType) {
        this.searchResults.innerHTML = '';
        const searchType = selectedType || this.searchType?.value || 'manga';
        
        // Supprimer toute carte de type "catalogue-card" qui pourrait être dans le dropdown
        // (protection contre les cartes créées par createAnimeCardForSearch)
        const existingCards = this.searchResults.querySelectorAll('.catalogue-card');
        existingCards.forEach(card => card.remove());
        
        results.forEach(result => {
            // Ignorer les résultats qui sont des cartes de type "catalogue-card" (ancien système)
            if (result.className && result.className.includes('catalogue-card')) {
                return;
            }
            
            // Vérifier si l'utilisateur a noté ce contenu (anime, manga ou film)
            const userRating = this.getUserRating(result.id, searchType);
            
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.addEventListener('click', () => {
                this.selectResult(result);
            });
            
            // Générer le HTML avec ou sans note (genres traduits en badges)
            const ratingHtml = userRating 
                ? `<div class="result-rating">${userRating}/10</div>` 
                : '';
            var genreBadges = (result.genres || []).slice(0, 3).map(function(g) {
                var label = (typeof window.getTranslatedGenre === 'function' ? window.getTranslatedGenre(g) : g);
                var esc = (label || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                return '<span class="search-genre-badge">' + esc + '</span>';
            }).join('');
            
            item.innerHTML = `
                <img src="${result.image}" alt="${result.title}" onerror="this.src='/images/default-anime.svg'">
                <div class="result-info">
                    <div class="result-title">${result.titleEnglish}</div>
                    <div class="result-subtitle">${genreBadges}</div>
                </div>
                ${ratingHtml}
            `;
            
            this.searchResults.appendChild(item);
        });
        
        // Observer pour supprimer automatiquement toute carte catalogue-card ajoutée au dropdown
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && node.classList.contains('catalogue-card')) {
                            node.remove();
                        }
                        // Vérifier aussi les enfants
                        const cards = node.querySelectorAll ? node.querySelectorAll('.catalogue-card') : [];
                        cards.forEach(card => card.remove());
                    }
                });
            });
        });
        
        observer.observe(this.searchResults, { childList: true, subtree: true });
    }
    
    getUserRating(contentId, searchType) {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user || !user.email) return null;
        
        const idStr = String(contentId);
        
        // Notes unifiées (anime, manga, film, etc.)
        const notesKey = 'user_content_notes_' + user.email;
        let contentNotes = [];
        try {
            contentNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');
        } catch (e) {
            contentNotes = [];
        }
        
        // Types de contenu à accepter selon le type de recherche
        const typeMap = {
            'manga': ['manga'],
            'anime': ['anime', 'film', 'movie', 'tv', 'ova', 'ona', 'special', 'music'],
            'movie': ['film', 'movie']
        };
        const acceptedTypes = typeMap[searchType] || [searchType, 'anime', 'film'];
        
        const note = contentNotes.find(n => String(n.id) === idStr && acceptedTypes.includes((n.contentType || '').toLowerCase()));
        if (note && (note.rating != null || note.note != null)) {
            return Number(note.rating ?? note.note);
        }
        
        // Rétrocompatibilité : animeRatings et userAnimeNotes (anime uniquement)
        if (acceptedTypes.includes('anime') || acceptedTypes.includes('film')) {
            const animeRatings = JSON.parse(localStorage.getItem('animeRatings') || '{}');
            if (animeRatings[idStr]) return Number(animeRatings[idStr]);
            
            const userAnimeNotes = JSON.parse(localStorage.getItem('userAnimeNotes') || '[]');
            const legacyNote = userAnimeNotes.find(n => String(n.malId) === idStr);
            if (legacyNote && (legacyNote.rating != null || legacyNote.note != null)) {
                return Number(legacyNote.rating ?? legacyNote.note);
            }
        }
        
        return null;
    }
    
    displayNoResults() {
        this.searchResults.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--gray);">
                <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                <p>Aucun résultat trouvé</p>
            </div>
        `;
    }
    
    displayError() {
        this.searchResults.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--danger);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>Erreur lors de la recherche</p>
            </div>
        `;
        this.showResults();
    }
    
    displayUserSearchResults(query) {
        this.searchResults.innerHTML = '';
        
        // Rechercher les utilisateurs dans localStorage
        // En production, cela devrait venir d'une API
        const users = this.searchUsersInLocalStorage(query);
        
        if (users.length === 0) {
            this.displayNoResults();
            this.showResults();
            return;
        }
        
        // Limiter à 4 résultats
        const limitedUsers = users.slice(0, this.maxResults);
        
        // Récupérer les utilisateurs vérifiés
        const verifiedUsers = JSON.parse(localStorage.getItem('verified_users') || '[]');
        
        // Récupérer les comptes pour les pays
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        
        limitedUsers.forEach(user => {
            const item = document.createElement('div');
            item.className = 'search-result-item user-result-item';
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                this.selectUserResult(user);
            });
            
            const avatarKey = 'avatar_' + user.email;
            const storedAvatar = localStorage.getItem(avatarKey);
            const avatarUrl = storedAvatar || user.picture || user.originalAvatar || user.customAvatar || '';
            
            const isVerified = verifiedUsers.includes(user.email);
            const verifiedBadge = isVerified ? '<span class="verified-badge-search" title="Utilisateur vérifié">✓</span>' : '';
            
            // Obtenir le pays (code 2 lettres : fr, de, us…)
            const account = accounts.find(acc => acc.email === user.email);
            let countryCode = (account?.country || user.country || '').toString().toLowerCase();
            if (!countryCode) {
                const savedProfile = localStorage.getItem('profile_' + user.email);
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
            var countryLabel = (countryCode && typeof window.getCountryName === 'function') ? window.getCountryName(countryCode) : (countryCode ? countryCode.toUpperCase() : '');
            const countryDisplay = countryLabel ? `<span class="continent-badge-search country-badge-search" title="${countryLabel}">${countryCode ? countryCode.toUpperCase() : ''}</span>` : '';
            
            item.innerHTML = `
                <img src="${avatarUrl}" alt="${user.name || user.email}" class="user-search-avatar" onerror="this.src=''">
                <div class="result-info">
                    <div class="result-title">
                        ${user.name || user.email}
                        ${verifiedBadge}
                    </div>
                </div>
                ${countryDisplay}
            `;
            
            this.searchResults.appendChild(item);
        });
        
        this.showResults();
    }
    
    searchUsersInLocalStorage(query) {
        const results = [];
        
        const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
        let blockedUsers = [];
        if (currentUser && currentUser.email) {
            blockedUsers = JSON.parse(localStorage.getItem('blocked_users_' + currentUser.email) || '[]');
        }
        
        const bannedUsers = JSON.parse(localStorage.getItem('banned_users') || '[]');
        const bannedEmails = bannedUsers.map(b => b.email);
        
        const lowerQuery = query.toLowerCase().trim();
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key && key.startsWith('profile_')) {
                try {
                    const profileData = localStorage.getItem(key);
                    if (profileData) {
                        const user = JSON.parse(profileData);
                        
                        const userEmail = user.email || key.replace('profile_', '');
                        if (blockedUsers.includes(userEmail) || bannedEmails.includes(userEmail)) {
                            continue;
                        }
                        
                        const account = accounts.find(acc => acc.email === userEmail);
                        let countryCode = (account?.country || user.country || '').toString().toLowerCase();
                        if (!countryCode && (account?.continent || user.continent)) {
                            var continentToCountry = { 'europe': 'fr', 'amerique-nord': 'us', 'amerique-sud': 'br', 'afrique': 'other', 'asie': 'jp', 'oceanie': 'au', 'antartique': 'other', 'antarctique': 'other', 'amerique': 'us' };
                            countryCode = continentToCountry[(account?.continent || user.continent || '').toString().toLowerCase().replace(/\s+/g, '-')] || '';
                        }
                        
                        const name = (user.name || '').toLowerCase();
                        const email = (user.email || '').toLowerCase();
                        const matchNameOrEmail = name.includes(lowerQuery) || email.includes(lowerQuery);
                        const matchCountry = lowerQuery.length <= 3 && countryCode && countryCode.indexOf(lowerQuery) === 0;
                        
                        if (matchNameOrEmail || matchCountry) {
                            results.push(user);
                        }
                    }
                } catch (e) {
                    console.error('Erreur lors de la lecture du profil:', e);
                }
            }
        }
        
        return results;
    }
    
    selectUserResult(user) {
        // Rediriger vers la page de profil public
        window.location.href = `user-profile.html?user=${encodeURIComponent(user.email)}`;
    }
    
    selectResult(result) {
        // Rediriger vers la page de détail
        if (result.type === 'anime') {
            window.location.href = `anime-details.html?id=${result.id}&season=1`;
        } else {
            window.location.href = `anime-details.html?id=${result.id}&type=manga`;
        }
    }
    
    performFullSearch() {
        const query = this.searchInput.value.trim();
        const selectedType = this.searchType?.value || 'manga';
        
        if (query) {
            // Rediriger vers la page de recherche complète
            window.location.href = `manga-database.html?search=${encodeURIComponent(query)}&type=${selectedType}`;
        }
    }
    
    showResults() {
        this.searchResults.classList.add('visible');
        this.searchResults.style.display = 'block';
        this.searchResults.style.visibility = 'visible';
        this.searchResults.style.pointerEvents = 'auto';
    }
    
    hideResults() {
        this.searchResults.classList.remove('visible');
        this.searchResults.style.display = 'none';
        this.searchResults.style.visibility = 'hidden';
        this.searchResults.style.pointerEvents = 'none';
        this.searchResults.innerHTML = '';
    }
}

// Initialiser le gestionnaire de recherche
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('searchInput')) {
        new SearchManager();
    }
});

