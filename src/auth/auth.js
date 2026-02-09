import { CONFIG } from '../config.js';

export class AuthService {
    constructor() {
        this.user = null;
        this.checkSession();
    }

    checkSession() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER) || 'null');
        if (user && user.expires_at) {
            if (user.expires_at > Date.now()) {
                this.user = user;
            } else {
                this.logout();
            }
        }
    }

    login(user) {
        if (user) {
            user.expires_at = Date.now() + CONFIG.AUTH.SESSION_DURATION;
            localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(user));
            this.user = user;
            return true;
        }
        return false;
    }

    logout() {
        localStorage.removeItem(CONFIG.STORAGE.USER);
        localStorage.removeItem(CONFIG.STORAGE.USER_DATA + this.user?.email);
        this.user = null;
    }

    getUser() {
        return this.user;
    }

    isAuthenticated() {
        return !!this.user;
    }

    async googleSignIn() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/auth/google`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.login(data.user);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erreur lors de la connexion Google:', error);
            return false;
        }
    }

    async resetPassword(email) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            return response.ok;
        } catch (error) {
            console.error('Erreur lors du reset du mot de passe:', error);
            return false;
        }
    }
}
