import { CONFIG } from './config.js';
import { MangaService } from './services/mangaService.js';
import { ErrorHandler } from './utils/errorHandler.js';

class Search extends HTMLElement {
    constructor() {
        super();
        this.mangaService = new MangaService();
        this.attachShadow({ mode: 'open' });
        this.searchResults = [];
        this.searchTimeout = null;
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }

                .search-container {
                    position: relative;
                    width: 100%;
                    max-width: 600px;
                    margin: 0 auto;
                }

                .search-input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    padding-right: 3rem;
                    border: 1px solid #e2e8f0;
                    border-radius: var(--border-radius);
                    font-size: 1rem;
                    transition: all var(--transition-duration);
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }

                .search-icon {
                    position: absolute;
                    right: 1rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #64748b;
                    cursor: pointer;
                }

                .search-results {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background-color: white;
                    border-radius: var(--border-radius);
                    border: 1px solid #e2e8f0;
                    box-shadow: var(--shadow-md);
                    max-height: 400px;
                    overflow-y: auto;
                    z-index: 1000;
                }

                .search-results.visible {
                    display: block;
                }

                .search-result {
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid #e2e8f0;
                    cursor: pointer;
                    transition: background-color var(--transition-duration);
                }

                .search-result:hover {
                    background-color: #f8fafc;
                }

                .search-result:last-child {
                    border-bottom: none;
                }

                .search-result-image {
                    width: 40px;
                    height: 40px;
                    border-radius: 4px;
                    object-fit: cover;
                }

                .search-result-info {
                    margin-left: 1rem;
                }

                .search-result-title {
                    font-size: 1rem;
                    margin-bottom: 0.25rem;
                    color: var(--text-color);
                }

                .search-result-description {
                    font-size: 0.875rem;
                    color: #64748b;
                }

                .loading {
                    text-align: center;
                    padding: 1rem;
                    color: #64748b;
                }

                .no-results {
                    text-align: center;
                    padding: 1rem;
                    color: #64748b;
                }
            </style>

            <div class="search-container">
                <input type="text" class="search-input" placeholder="Rechercher un manga...">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                </svg>
                <div class="search-results" id="searchResults">
                    <div class="loading">Recherche en cours...</div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const input = this.shadowRoot.querySelector('.search-input');
        const results = this.shadowRoot.getElementById('searchResults');

        input.addEventListener('input', (e) => this.handleSearch(e));
        input.addEventListener('focus', () => this.showResults());
        input.addEventListener('blur', () => {
            setTimeout(() => this.hideResults(), 200);
        });

        results.addEventListener('click', (e) => this.handleResultClick(e));
        
        // Navigation au clavier
        input.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
    }

    async handleSearch(e) {
        const query = e.target.value.trim();
        if (query.length < 2) {
            this.hideResults();
            return;
        }

        // Annuler la requête précédente
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(async () => {
            try {
                this.showLoading(true);
                this.searchResults = await this.mangaService.searchMangas(query);
                this.renderResults();
            } catch (error) {
                this.showError();
                ErrorHandler.handleApiError(error);
            } finally {
                this.showLoading(false);
            }
        }, 300);
    }

    renderResults() {
        const results = this.shadowRoot.getElementById('searchResults');
        const loading = results.querySelector('.loading');

        if (this.searchResults.length === 0) {
            results.innerHTML = `
                <div class="no-results">
                    Aucun résultat trouvé
                </div>
            `;
            return;
        }

        const resultItems = this.searchResults.map(manga => `
            <div class="search-result" data-id="${manga.id}">
                <img src="${manga.coverImage}" alt="${manga.title}" class="search-result-image">
                <div class="search-result-info">
                    <div class="search-result-title">${manga.title}</div>
                    <div class="search-result-description">${manga.description.substring(0, 100)}...</div>
                </div>
            </div>
        `).join('');

        results.innerHTML = resultItems;
    }

    handleResultClick(e) {
        const result = e.target.closest('.search-result');
        if (!result) return;

        const mangaId = result.dataset.id;
        window.location.href = `${CONFIG.ROUTES.MANGAS}/${mangaId}`;
    }

    handleKeyboardNavigation(e) {
        const results = this.shadowRoot.querySelectorAll('.search-result');
        const activeIndex = Array.from(results).findIndex(result => result.classList.contains('active'));

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (results.length === 0) return;
                this.activateResult((activeIndex + 1) % results.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (results.length === 0) return;
                this.activateResult((activeIndex - 1 + results.length) % results.length);
                break;
            case 'Enter':
                e.preventDefault();
                const activeResult = this.shadowRoot.querySelector('.search-result.active');
                if (activeResult) {
                    activeResult.click();
                }
                break;
        }
    }

    activateResult(index) {
        const results = this.shadowRoot.querySelectorAll('.search-result');
        results.forEach(result => result.classList.remove('active'));
        results[index].classList.add('active');
    }

    showResults() {
        this.shadowRoot.getElementById('searchResults').classList.add('visible');
    }

    hideResults() {
        this.shadowRoot.getElementById('searchResults').classList.remove('visible');
    }

    showLoading(show) {
        const loading = this.shadowRoot.querySelector('.loading');
        loading.style.display = show ? 'block' : 'none';
    }

    showError() {
        const results = this.shadowRoot.getElementById('searchResults');
        results.innerHTML = `
            <div class="no-results">
                Une erreur est survenue lors de la recherche
            </div>
        `;
    }
}

customElements.define('manga-search', Search);

export { Search };
