import { CONFIG } from './config.js';
import { ProfileService } from './services/profileService.js';
import { ErrorHandler } from './utils/errorHandler.js';
import { FormValidator } from './utils/formValidator.js';

class Profile extends HTMLElement {
    constructor() {
        super();
        this.profileService = new ProfileService();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.loadProfile();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 2rem;
                }

                .profile-container {
                    max-width: 800px;
                    margin: 0 auto;
                }

                .profile-header {
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                    margin-bottom: 2rem;
                    padding: 2rem;
                    background-color: white;
                    border-radius: var(--border-radius);
                    box-shadow: var(--shadow-sm);
                }

                .avatar-container {
                    position: relative;
                }

                .avatar {
                    width: 150px;
                    height: 150px;
                    border-radius: 50%;
                    object-fit: cover;
                }

                .change-avatar {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    background-color: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .profile-info {
                    flex: 1;
                }

                .profile-name {
                    font-size: 2rem;
                    margin-bottom: 0.5rem;
                }

                .profile-email {
                    color: #64748b;
                    margin-bottom: 1rem;
                }

                .profile-stats {
                    display: flex;
                    gap: 2rem;
                    margin-top: 1rem;
                }

                .stat {
                    text-align: center;
                }

                .stat-label {
                    color: #64748b;
                    font-size: 0.9rem;
                }

                .stat-value {
                    font-size: 1.5rem;
                    font-weight: bold;
                }

                .profile-form {
                    background-color: white;
                    border-radius: var(--border-radius);
                    box-shadow: var(--shadow-sm);
                    padding: 2rem;
                    margin-top: 2rem;
                }

                .form-group {
                    margin-bottom: 1rem;
                }

                .form-control {
                    width: 100%;
                    padding: 0.5rem;
                    border: 1px solid #e2e8f0;
                    border-radius: var(--border-radius);
                }

                .error-message {
                    color: #dc2626;
                    margin-top: 0.5rem;
                }

                .btn-group {
                    display: flex;
                    gap: 1rem;
                    margin-top: 1rem;
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

            <div class="profile-container">
                <div class="profile-header" id="profileHeader">
                    <div class="avatar-container">
                        <img src="" alt="Avatar" class="avatar" id="profileAvatar">
                        <button class="change-avatar" onclick="this.openAvatarUpload()">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c-.28 0-.53-.11-.7-.29l-2.3-2.3c-.36-.36-.36-.95 0-1.31.36-.36.95-.36 1.31 0l2.3 2.3c.36.36.36.95 0 1.31-.17.17-.42.29-.7.29z"/>
                            </svg>
                        </button>
                        <input type="file" accept="image/*" style="display: none;" id="avatarUpload">
                    </div>
                    <div class="profile-info">
                        <h2 class="profile-name" id="profileName"></h2>
                        <p class="profile-email" id="profileEmail"></p>
                        <div class="profile-stats">
                            <div class="stat">
                                <div class="stat-value" id="mangaCount">0</div>
                                <div class="stat-label">Mangas</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value" id="sTierCount">0</div>
                                <div class="stat-label">S Tier</div>
                            </div>
                            <div class="stat">
                                <div class="stat-value" id="aTierCount">0</div>
                                <div class="stat-label">A Tier</div>
                            </div>
                        </div>
                    </div>
                </div>

                <form class="profile-form" id="profileForm">
                    <div class="form-group">
                        <label for="name">Nom d'utilisateur</label>
                        <input type="text" id="name" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="bio">Bio</label>
                        <textarea id="bio" class="form-control" rows="4"></textarea>
                    </div>
                    <div class="btn-group">
                        <button type="submit" class="btn btn-primary">Mettre à jour</button>
                        <button type="button" class="btn btn-danger" onclick="this.handleDeleteAccount()">Supprimer le compte</button>
                    </div>
                </form>
            </div>

            <div class="loading" id="loading" style="display: none;">
                <span>Chargement...</span>
            </div>
            <div class="error" id="error" style="display: none;">
                <span>Erreur lors du chargement du profil</span>
            </div>
        `;
    }

    setupEventListeners() {
        const form = this.shadowRoot.getElementById('profileForm');
        const avatarUpload = this.shadowRoot.getElementById('avatarUpload');

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
    }

    async loadProfile() {
        try {
            this.showLoading(true);
            const profile = await this.profileService.getUserProfile();
            if (profile) {
                this.updateProfileDisplay(profile);
            }
        } catch (error) {
            this.showError();
            ErrorHandler.handleApiError(error);
        } finally {
            this.showLoading(false);
        }
    }

    updateProfileDisplay(profile) {
        const elements = {
            name: this.shadowRoot.getElementById('profileName'),
            email: this.shadowRoot.getElementById('profileEmail'),
            avatar: this.shadowRoot.getElementById('profileAvatar'),
            mangaCount: this.shadowRoot.getElementById('mangaCount'),
            sTierCount: this.shadowRoot.getElementById('sTierCount'),
            aTierCount: this.shadowRoot.getElementById('aTierCount'),
            formName: this.shadowRoot.getElementById('name'),
            formBio: this.shadowRoot.getElementById('bio')
        };

        elements.name.textContent = profile.name || profile.email.split('@')[0];
        elements.email.textContent = profile.email;
        elements.avatar.src = profile.avatar || '/images/default-avatar.png';
        elements.formName.value = profile.name || '';
        elements.formBio.value = profile.bio || '';

        // Mettre à jour les statistiques
        const tiers = profile.tiers || {};
        elements.mangaCount.textContent = Object.keys(tiers).length;
        elements.sTierCount.textContent = Object.values(tiers).filter(tier => tier === 'S').length;
        elements.aTierCount.textContent = Object.values(tiers).filter(tier => tier === 'A').length;
    }

    async handleSubmit(e) {
        e.preventDefault();
        try {
            this.showLoading(true);
            const form = e.target;
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            const success = await this.profileService.updateProfile(data);
            if (success) {
                this.loadProfile();
                ErrorHandler.showNotification('Profil mis à jour avec succès', 'success');
            }
        } catch (error) {
            ErrorHandler.handleApiError(error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            this.showLoading(true);
            const avatarUrl = await this.profileService.uploadAvatar(file);
            if (avatarUrl) {
                const avatar = this.shadowRoot.getElementById('profileAvatar');
                avatar.src = avatarUrl;
                ErrorHandler.showNotification('Avatar mis à jour avec succès', 'success');
            }
        } catch (error) {
            ErrorHandler.handleApiError(error);
        } finally {
            this.showLoading(false);
        }
    }

    async handleDeleteAccount() {
        if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
            return;
        }

        try {
            this.showLoading(true);
            const success = await this.profileService.deleteAccount();
            if (success) {
                ErrorHandler.showNotification('Compte supprimé avec succès', 'success');
                window.location.href = CONFIG.ROUTES.HOME;
            }
        } catch (error) {
            ErrorHandler.handleApiError(error);
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        const loading = this.shadowRoot.getElementById('loading');
        const profileContainer = this.shadowRoot.querySelector('.profile-container');
        profileContainer.style.display = show ? 'none' : 'block';
        loading.style.display = show ? 'block' : 'none';
    }

    showError() {
        const error = this.shadowRoot.getElementById('error');
        error.style.display = 'block';
    }
}

customElements.define('manga-profile', Profile);

export { Profile };
