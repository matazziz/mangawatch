import { CONFIG } from './config.js';
import { MangaService } from './services/mangaService.js';
import { ErrorHandler } from './utils/errorHandler.js';

class MangaList extends HTMLElement {
    constructor() {
        super();
        this.mangaService = new MangaService();
        this.attachShadow({ mode: 'open' });
        this.currentPage = 1;
        this.mangas = [];
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadMangas();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 2rem;
                }

                .manga-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .manga-card {
                    background-color: white;
                    border-radius: var(--border-radius);
                    box-shadow: var(--shadow-sm);
                    overflow: hidden;
                    transition: transform var(--transition-duration);
                }

                .manga-card:hover {
                    transform: translateY(-5px);
                }

                .manga-image {
                    width: 100%;
                    height: 300px;
                    object-fit: cover;
                }

                .manga-info {
                    padding: 1rem;
                }

                .manga-title {
                    font-size: 1.2rem;
                    margin-bottom: 0.5rem;
                    color: var(--text-color);
                }

                .manga-description {
                    color: #64748b;
                    margin-bottom: 1rem;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .tier-selector {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 1rem;
                }

                .tier-button {
                    flex: 1;
                    padding: 0.5rem;
                    border: 1px solid #e2e8f0;
                    border-radius: var(--border-radius);
                    cursor: pointer;
                    transition: all var(--transition-duration);
                }

                .tier-button.selected {
                    background-color: var(--primary-color);
                    color: white;
                    border-color: var(--primary-color);
                }

                .loading {
                    text-align: center;
                    padding: 2rem;
                }

                .error {
                    text-align: center;
                    color: #dc2626;
                    padding: 2rem;
                }
            </style>

            <div class="manga-list" id="mangaList"></div>
            <div class="loading" id="loading" style="display: none;">
                <span>Chargement...</span>
            </div>
            <div class="error" id="error" style="display: none;">
                <span>Erreur lors du chargement des mangas</span>
            </div>
        `;
    }

    setupEventListeners() {
        // Écouter les changements d'authentification
        window.addEventListener('authStateChanged', () => {
            this.updateTierButtons();
        });

        // Écouter les changements de fenêtre
        window.addEventListener('resize', () => {
            this.updateGridLayout();
        });
    }

    async loadMangas(page = 1) {
        try {
            this.showLoading(true);
            this.mangas = await this.mangaService.getMangas(page);
            this.renderMangas();
        } catch (error) {
            this.showError();
            ErrorHandler.handleApiError(error);
        } finally {
            this.showLoading(false);
        }
    }

    renderMangas() {
        const mangaList = this.shadowRoot.getElementById('mangaList');
        mangaList.innerHTML = this.mangas.map(manga => this.createMangaCard(manga)).join('');
    }

    createMangaCard(manga) {
        const selectedTier = this.getSelectedTier(manga.id);
        return `
            <div class="manga-card" data-manga-id="${manga.id}">
                <img src="${manga.coverImage}" alt="${manga.title}" class="manga-image">
                <div class="manga-info">
                    <h3 class="manga-title">${manga.title}</h3>
                    <p class="manga-description">${manga.description}</p>
                    <div class="tier-selector">
                        ${this.createTierButtons(manga.id, selectedTier)}
                    </div>
                </div>
            </div>
        `;
    }

    createTierButtons(mangaId, selectedTier) {
        const tiers = ['S', 'A', 'B', 'C', 'D'];
        return tiers.map(tier => `
            <button class="tier-button ${selectedTier === tier ? 'selected' : ''}"
                    onclick="handleTierSelection('${mangaId}', '${tier}')">
                ${tier}
            </button>
        `).join('');
    }

    getSelectedTier(mangaId) {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER) || 'null');
        if (!user) return '';
        
        const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER_DATA + user.email) || 'null');
        return userData?.tiers?.[mangaId] || '';
    }

    handleTierSelection(mangaId, tier) {
        if (!this.authService.isAuthenticated()) {
            ErrorHandler.showNotification('Veuillez vous connecter pour évaluer les mangas', 'warning');
            return;
        }

        this.mangaService.updateTier(mangaId, tier)
            .then(() => {
                this.updateTierButtons();
                ErrorHandler.showNotification('Tier mis à jour avec succès', 'success');
            })
            .catch(error => {
                ErrorHandler.handleApiError(error);
            });
    }

    updateTierButtons() {
        const mangaCards = this.shadowRoot.querySelectorAll('.manga-card');
        mangaCards.forEach(card => {
            const mangaId = card.dataset.mangaId;
            const selectedTier = this.getSelectedTier(mangaId);
            const tierButtons = card.querySelectorAll('.tier-button');
            tierButtons.forEach(button => {
                button.classList.toggle('selected', button.textContent === selectedTier);
            });
        });
    }

    showLoading(show) {
        const loading = this.shadowRoot.getElementById('loading');
        loading.style.display = show ? 'block' : 'none';
    }

    showError() {
        const error = this.shadowRoot.getElementById('error');
        error.style.display = 'block';
    }

    updateGridLayout() {
        const mangaList = this.shadowRoot.getElementById('mangaList');
        const columns = Math.min(Math.floor(window.innerWidth / 250), 4);
        mangaList.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    }
}

customElements.define('manga-list', MangaList);

export { MangaList };
