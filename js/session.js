// Gestionnaire de session simple
const sessionManager = {
    SESSION_KEY: 'mangawatch_session',

    // Sauvegarder les informations de l'utilisateur
    saveUser(user) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify({
            isLoggedIn: true,
            user: user
        }));
    },

    // Récupérer les informations de l'utilisateur
    getUser() {
        const session = localStorage.getItem(this.SESSION_KEY);
        return session ? JSON.parse(session) : null;
    },

    // Déconnexion
    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        // Rediriger vers la page d'accueil
        window.location.href = '/acceuil.html';
    },

    // Vérifier si l'utilisateur est connecté
    isLoggedIn() {
        const session = this.getUser();
        return session?.isLoggedIn || false;
    },

    // Mettre à jour l'interface utilisateur selon l'état de connexion
    updateUI() {
        const session = this.getUser();
        if (session?.isLoggedIn) {
            // Afficher le nom de l'utilisateur dans la navigation
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) {
                const profileLink = navLinks.querySelector('a[href="profil.html"]');
                if (profileLink) {
                    profileLink.textContent = `Profil (${session.user.name || session.user.email})`;
                }
            }
        }
    }
};

// Exporter le gestionnaire de session
window.sessionManager = sessionManager;
