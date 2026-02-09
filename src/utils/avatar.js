import { CONFIG } from '../config.js';

export class AvatarService {
    constructor() {
        this.avatar = null;
    }

    async uploadAvatar(file) {
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch(`${CONFIG.API_URL}/upload-avatar`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                this.avatar = data.avatar;
                return this.avatar;
            }
            return null;
        } catch (error) {
            console.error('Erreur lors de l\'upload de l\'avatar:', error);
            return null;
        }
    }

    loadAvatar() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER) || 'null');
        if (user) {
            const userData = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER_DATA + user.email) || 'null');
            if (userData && userData.avatar) {
                this.avatar = userData.avatar;
                localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify({ ...user, avatar: userData.avatar }));
            }
        }
        return this.avatar;
    }

    setAvatar(avatarUrl) {
        this.avatar = avatarUrl;
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER) || 'null');
        if (user) {
            localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify({ ...user, avatar: avatarUrl }));
        }
    }

    getAvatar() {
        return this.avatar;
    }
}
