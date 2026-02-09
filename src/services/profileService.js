import { CONFIG } from '../config.js';
import { AvatarService } from '../utils/avatar.js';

export class ProfileService {
    constructor() {
        this.avatarService = new AvatarService();
    }

    async getUserProfile() {
        try {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER) || 'null');
            if (!user) return null;

            const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER_DATA + user.email) || 'null');
            
            return {
                ...user,
                ...userData,
                avatar: this.avatarService.getAvatar()
            };
        } catch (error) {
            console.error('Erreur lors de la récupération du profil:', error);
            return null;
        }
    }

    async updateProfile(data) {
        try {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER) || 'null');
            if (!user) return false;

            const response = await fetch(`${CONFIG.API_URL}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const updatedData = await response.json();
                localStorage.setItem(CONFIG.STORAGE.USER_DATA + user.email, JSON.stringify(updatedData));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du profil:', error);
            return false;
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER) || 'null');
            if (!user) return false;

            const response = await fetch(`${CONFIG.API_URL}/profile/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Erreur lors du changement de mot de passe:', error);
            return false;
        }
    }

    async deleteAccount() {
        try {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER) || 'null');
            if (!user) return false;

            const response = await fetch(`${CONFIG.API_URL}/profile/delete`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            if (response.ok) {
                // Supprimer toutes les données locales
                localStorage.removeItem(CONFIG.STORAGE.USER);
                localStorage.removeItem(CONFIG.STORAGE.USER_DATA + user.email);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erreur lors de la suppression du compte:', error);
            return false;
        }
    }
}
