class ProfileManager {
    constructor() {
        this.STORAGE_KEY = 'user_profile_data';
    }

    // Sauvegarder les données de profil
    saveProfile(user) {
        const existingData = this.getProfileData(user.email) || {};
        
        // Sauvegarder l'avatar original si c'est la première connexion
        if (!existingData.originalAvatar && user.picture) {
            existingData.originalAvatar = user.picture;
        }

        // Mettre à jour les données avec les préférences actuelles
        const profileData = {
            ...existingData,
            ...user,
            lastLogin: new Date().toISOString()
        };

        // Sauvegarder dans localStorage
        localStorage.setItem(this.STORAGE_KEY + '_' + user.email, JSON.stringify(profileData));
        return profileData;
    }

    // Obtenir les données de profil
    getProfileData(email) {
        const data = localStorage.getItem(this.STORAGE_KEY + '_' + email);
        return data ? JSON.parse(data) : null;
    }

    // Mettre à jour l'avatar
    updateAvatar(email, avatar) {
        const profileData = this.getProfileData(email);
        if (profileData) {
            profileData.customAvatar = avatar;
            localStorage.setItem(this.STORAGE_KEY + '_' + email, JSON.stringify(profileData));
            return profileData;
        }
        return null;
    }

    // Nettoyer les données lors de la déconnexion
    cleanupOnLogout(email) {
        const profileData = this.getProfileData(email);
        if (profileData) {
            // Garder l'avatar original et les préférences
            const cleanedData = {
                originalAvatar: profileData.originalAvatar,
                theme: profileData.theme || 'dark',
                language: profileData.language || 'fr'
            };
            localStorage.setItem(this.STORAGE_KEY + '_' + email, JSON.stringify(cleanedData));
        }
    }

    // Charger les données de profil
    loadProfile(email) {
        const profileData = this.getProfileData(email);
        if (profileData) {
            return {
                customAvatar: profileData.customAvatar || null,
                originalAvatar: profileData.originalAvatar || null,
                theme: profileData.theme || 'dark',
                language: profileData.language || 'fr'
            };
        }
        return null;
    }
}

// Exporter le gestionnaire de profil
window.profileManager = new ProfileManager();
