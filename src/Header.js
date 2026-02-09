import { CONFIG } from './config.js';
import { AuthService } from './auth/auth.js';
import { AvatarService } from './utils/avatar.js';

class Header extends HTMLElement {
    constructor() {
        super();
        this.authService = new AuthService();
        this.avatarService = new AvatarService();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.updateUserStatus();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: var(--background-color);
                    box-shadow: var(--shadow-sm);
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                }

                .header-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .logo {
                    font-size: 1.5rem;
                    font-weight: bold;
                    color: var(--primary-color);
                    cursor: pointer;
                }

                .nav-links {
                    display: flex;
                    gap: 1rem;
                }

                .nav-link {
                    color: var(--text-color);
                    text-decoration: none;
                    padding: 0.5rem;
                    border-radius: var(--border-radius);
                    transition: background-color var(--transition-duration);
                }

                .nav-link:hover {
                    background-color: rgba(37, 99, 235, 0.1);
                }

                .user-menu {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    object-fit: cover;
                }

                .dropdown {
                    position: relative;
                }

                .dropdown-content {
                    display: none;
                    position: absolute;
                    top: 100%;
                    right: 0;
                    background-color: white;
                    border-radius: var(--border-radius);
                    box-shadow: var(--shadow-md);
                    min-width: 200px;
                    padding: 0.5rem;
                }

                .dropdown:hover .dropdown-content {
                    display: block;
                }
            </style>

            <div class="header-container">
                <div class="logo" onclick="window.location.href='${CONFIG.ROUTES.HOME}'">
                    MangaTier
                </div>
                <nav>
                    <div class="nav-links">
                        <a href="${CONFIG.ROUTES.HOME}" class="nav-link">Accueil</a>
                        <a href="${CONFIG.ROUTES.MANGAS}" class="nav-link">Mangas</a>
                        <a href="${CONFIG.ROUTES.TIER_LIST}" class="nav-link">Tier List</a>
                    </div>
                    <div class="user-menu">
                        <div class="dropdown">
                            <img src="${this.avatarService.getAvatar() || '/images/default-avatar.png'}" 
                                 alt="Avatar" class="avatar">
                            <div class="dropdown-content">
                                <a href="${CONFIG.ROUTES.PROFILE}" class="nav-link">Profil</a>
                                <a href="${CONFIG.ROUTES.RESET_PASSWORD}" class="nav-link">Changer de mot de passe</a>
                                <button class="nav-link" onclick="authService.logout()">Déconnexion</button>
                            </div>
                        </div>
                    </div>
                </nav>
            </div>
        `;
    }

    setupEventListeners() {
        this.authService.onAuthStateChanged = () => {
            this.updateUserStatus();
        };
    }

    updateUserStatus() {
        const user = this.authService.getUser();
        const dropdown = this.shadowRoot.querySelector('.dropdown');
        const navLinks = this.shadowRoot.querySelector('.nav-links');

        if (user) {
            dropdown.style.display = 'flex';
            navLinks.style.display = 'flex';
        } else {
            dropdown.style.display = 'none';
            navLinks.style.display = 'none';
        }
    }
}

customElements.define('manga-header', Header);

export { Header };
