// Synchronise le localStorage entre `user` et `profile_<email>`
// pour garantir la persistance des données de profil en local.
(function syncProfile() {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;

        const user = JSON.parse(userStr);
        if (!user || !user.email) return;

        const profileKey = 'profile_' + user.email;
        const avatarKey = 'avatar_' + user.email;

        // Charger profil existant
        let storedProfile = null;
        try {
            const profileStr = localStorage.getItem(profileKey);
            storedProfile = profileStr ? JSON.parse(profileStr) : null;
        } catch (e) {
            storedProfile = null;
        }

        // Récupérer avatar personnalisé stocké séparément le cas échéant
        const storedAvatar = localStorage.getItem(avatarKey);

        // Fusionner : priorité aux infos déjà sauvées dans profile_, puis à l'avatar dédié,
        // sinon on conserve ce qui vient du `user`.
        const merged = {
            ...user,
            ...storedProfile,
            customAvatar: storedProfile?.customAvatar || storedAvatar || user.customAvatar || null,
            originalAvatar: storedProfile?.originalAvatar || user.originalAvatar || user.picture || null,
            theme: storedProfile?.theme || user.theme || 'dark',
            language: storedProfile?.language || user.language || 'fr',
            lastLogin: storedProfile?.lastLogin || new Date().toISOString()
        };

        // Sauvegarder profil et user synchronisés
        localStorage.setItem(profileKey, JSON.stringify(merged));
        localStorage.setItem('user', JSON.stringify(merged));

        // Exposer une fonction au besoin
        window.syncProfileLocal = () => {
            localStorage.setItem(profileKey, JSON.stringify(merged));
            localStorage.setItem('user', JSON.stringify(merged));
        };
    } catch (error) {
        console.error('Erreur sync profile localStorage:', error);
    }
})();






