// Auto-updater simplifié pour ajouter automatiquement les nouveautés
class SimpleAutoUpdater {
    constructor() {
        this.apiBaseUrl = 'https://api.jikan.moe/v4';
        this.checkInterval = 30 * 60 * 1000; // 30 minutes
        this.isRunning = false;
    }

    // Démarrer l'auto-updater
    start() {
        if (this.isRunning) return;
        
        // Ne pas démarrer sur la page manga-database
        if (window.location.pathname.includes('manga-database.html')) {
            console.log('🚫 Auto-updater désactivé sur la page manga-database');
            return;
        }
        
        console.log('🚀 Démarrage de l\'auto-updater simplifié...');
        this.isRunning = true;
        
        // Vérification immédiate
        this.checkForNewContent();
        
        // Vérification périodique
        setInterval(() => {
            this.checkForNewContent();
        }, this.checkInterval);
    }

    // Vérifier et ajouter les nouveautés
    async checkForNewContent() {
        try {
            console.log('🔍 Vérification des nouveautés...');
            
            // Récupérer les animes récents
            const recentAnimes = await this.fetchRecentAnimes();
            
            // Récupérer les mangas récents
            const recentMangas = await this.fetchRecentMangas();
            
            // Ajouter automatiquement au site
            this.addToSite(recentAnimes, 'anime');
            this.addToSite(recentMangas, 'manga');
            
            console.log('✅ Nouveautés ajoutées au site');
            
        } catch (error) {
            console.error('❌ Erreur lors de la vérification:', error);
        }
    }

    // Récupérer les animes récents
    async fetchRecentAnimes() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/seasons/now`);
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Erreur lors de la récupération des animes récents:', error);
            return [];
        }
    }

    // Récupérer les mangas récents
    async fetchRecentMangas() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/manga?order_by=start_date&sort=desc&limit=20`);
            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Erreur lors de la récupération des mangas récents:', error);
            return [];
        }
    }

    // Ajouter les nouveautés au site
    addToSite(contentList, type) {
        if (!contentList || contentList.length === 0) return;

        // Trouver la section appropriée sur la page
        const targetSection = this.findTargetSection(type);
        if (!targetSection) {
            console.log('🚫 Nouveautés non ajoutées - Filtres actifs ou section non trouvée');
            return;
        }

        // Ajouter chaque nouveauté
        contentList.forEach(item => {
            this.addContentCard(item, type, targetSection);
        });
    }

    // Trouver la section cible sur la page
    findTargetSection(type) {
        // Vérifier si des filtres sont actifs sur la page manga-database
        if (this.areFiltersActive()) {
            console.log('🔒 Filtres actifs détectés - Nouveautés désactivées');
            return null; // Ne pas ajouter de nouveautés si des filtres sont actifs
        }

        // Si on est sur la page manga-database, ajouter à la grille existante
        const mangaGrid = document.getElementById('manga-grid');
        if (mangaGrid) {
            return mangaGrid;
        }

        // Ne pas ajouter de nouveautés sur la page d'accueil
        console.log('🏠 Page d\'accueil détectée - Nouveautés désactivées');
        return null;
    }

    // Vérifier si des filtres sont actifs
    areFiltersActive() {
        // Vérifier les filtres sur la page manga-database
        const typeFilter = document.getElementById('type-filter');
        const statusFilter = document.getElementById('status-filter');
        const ratingFilter = document.getElementById('rating-filter');
        const searchInput = document.getElementById('search-input');

        // Si on n'est pas sur la page manga-database, pas de filtres actifs
        if (!typeFilter && !statusFilter && !ratingFilter) {
            return false;
        }

        // Vérifier si des filtres sont sélectionnés
        const hasTypeFilter = typeFilter && typeFilter.value !== '';
        const hasStatusFilter = statusFilter && statusFilter.value !== '';
        const hasRatingFilter = ratingFilter && ratingFilter.value !== '0';
        const hasSearchQuery = searchInput && searchInput.value.trim() !== '';

        // Retourner true si au moins un filtre est actif
        return hasTypeFilter || hasStatusFilter || hasRatingFilter || hasSearchQuery;
    }

    // Ajouter une carte de contenu
    addContentCard(item, type, targetSection) {
        // Vérifier si l'item existe déjà
        const existingCard = targetSection.querySelector(`[data-mal-id="${item.mal_id}"]`);
        if (existingCard) return; // Éviter les doublons

        const isAnime = type === 'anime';
        const title = item.title || item.title_english || 'Titre inconnu';
        const tFn = window.t || (window.localization ? (key) => window.localization.get(key) : (key) => key);
        const imageUnavailableText = encodeURIComponent(tFn('common.image_unavailable'));
        const image = item.images?.jpg?.image_url || `https://via.placeholder.com/200x300/1a1a1a/333333?text=${imageUnavailableText}`;
        const score = item.score ? item.score.toFixed(1) : 'N/A';
        const typeLabel = isAnime ? tFn('collection.type.anime') : tFn('collection.type.manga');

        const card = document.createElement('div');
        card.className = 'new-content-card';
        card.setAttribute('data-mal-id', item.mal_id);
        card.style.cssText = `
            background: #2a2a2a;
            border-radius: 10px;
            overflow: hidden;
            transition: transform 0.3s ease;
            cursor: pointer;
            border: 1px solid #00c45d;
        `;

        card.innerHTML = `
            <img src="${image}" alt="${title}" style="width: 100%; height: 200px; object-fit: cover;">
            <div style="padding: 15px;">
                <h3 style="color: #00c45d; font-size: 1rem; margin: 0 0 10px 0; line-height: 1.3;">${title}</h3>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #ccc;">
                    <span>⭐ ${score}</span>
                    <span style="background: ${isAnime ? '#ff6b6b' : '#4ecdc4'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">
                        ${typeLabel}
                    </span>
                </div>
            </div>
        `;

        // Ajouter l'événement de clic
        card.addEventListener('click', () => {
            const page = 'anime-details.html';
            window.location.href = `${page}?id=${item.mal_id}&type=${type}`;
        });

        // Ajouter l'effet hover
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 5px 15px rgba(0, 196, 93, 0.3)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'none';
        });

        // Ajouter la carte au début de la section
        targetSection.insertBefore(card, targetSection.firstChild);

        // Limiter le nombre de cartes affichées
        const cards = targetSection.querySelectorAll('.new-content-card');
        if (cards.length > 12) {
            cards[cards.length - 1].remove();
        }
    }

    // Arrêter l'auto-updater
    stop() {
        this.isRunning = false;
        console.log('⏹️ Auto-updater arrêté');
    }
}

// Initialiser l'auto-updater au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const updater = new SimpleAutoUpdater();
    updater.start();
});

// Exporter pour utilisation dans d'autres fichiers
window.SimpleAutoUpdater = SimpleAutoUpdater; 