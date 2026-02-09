import { CONFIG } from './config.js';
import { AuthService } from './auth/auth.js';
import { ProfileService } from './services/profileService.js';
import { MangaService } from './services/mangaService.js';
import { ErrorHandler } from './utils/errorHandler.js';
import { FormValidator } from './utils/formValidator.js';
import { Header } from './Header.js';

// Initialisation des services
class App {
    constructor() {
        this.authService = new AuthService();
        this.profileService = new ProfileService();
        this.mangaService = new MangaService();
        this.errorHandler = ErrorHandler;
        this.formValidator = FormValidator;
        this.init();
    }

    async init() {
        try {
            // Vérifier l'authentification
            await this.authService.checkSession();

            // Initialiser les composants
            this.initComponents();

            // Gérer les routes
            this.setupRouting();

            // Écouter les événements globaux
            this.setupEventListeners();

            // Charger les données initiales
            await this.loadInitialData();
        } catch (error) {
            this.errorHandler.showNotification('Erreur lors de l\'initialisation', 'error');
            console.error('Erreur d\'initialisation:', error);
        }
    }

    initComponents() {
        // Initialiser le header
        const header = document.createElement('manga-header');
        document.body.insertBefore(header, document.body.firstChild);

        // Initialiser les autres composants
        this.initProfileComponent();
        this.initMangaListComponent();
    }

    setupRouting() {
        const routes = {
            [CONFIG.ROUTES.HOME]: () => this.showHome(),
            [CONFIG.ROUTES.PROFILE]: () => this.showProfile(),
            [CONFIG.ROUTES.MANGAS]: () => this.showMangas(),
            [CONFIG.ROUTES.TIER_LIST]: () => this.showTierList(),
            [CONFIG.ROUTES.RESET_PASSWORD]: () => this.showResetPassword()
        };

        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());

        this.routes = routes;
    }

    handleRoute() {
        const path = window.location.hash.slice(1) || CONFIG.ROUTES.HOME;
        const routeHandler = this.routes[path];
        
        if (routeHandler) {
            routeHandler();
        } else {
            this.errorHandler.showNotification('Page non trouvée', 'error');
        }
    }

    setupEventListeners() {
        // Écouter les changements d'authentification
        this.authService.onAuthStateChanged = () => {
            this.updateUserStatus();
        };

        // Écouter les erreurs globales
        window.addEventListener('error', (event) => {
            this.errorHandler.showNotification(event.message, 'error');
        });
    }

    async loadInitialData() {
        try {
            if (this.authService.isAuthenticated()) {
                const profile = await this.profileService.getUserProfile();
                if (profile) {
                    this.updateUserProfile(profile);
                }
            }
        } catch (error) {
            this.errorHandler.showNotification('Erreur lors du chargement des données', 'error');
        }
    }

    updateUserStatus() {
        const isAuthenticated = this.authService.isAuthenticated();
        // Mettre à jour l'interface en fonction de l'état d'authentification
        document.body.classList.toggle('logged-in', isAuthenticated);
    }

    updateUserProfile(profile) {
        // Mettre à jour les informations de profil dans l'interface
        document.querySelector('.user-name').textContent = profile.name;
        // ... autres mises à jour
    }

    // Méthodes pour chaque route
    async showHome() {
        // Charger la page d'accueil
    }

    async showProfile() {
        // Charger la page de profil
    }

    async showMangas() {
        // Charger la liste des mangas
    }

    async showTierList() {
        // Charger la liste des tiers
    }

    async showResetPassword() {
        // Charger la page de réinitialisation du mot de passe
    }
}

// Initialiser l'application
window.addEventListener('load', () => {
    try {
        new App();
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'application:', error);
        ErrorHandler.showNotification('Erreur lors du démarrage', 'error');
    }
});
