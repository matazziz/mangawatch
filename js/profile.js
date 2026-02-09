class ProfileManager {
    constructor() {
        this.user = null;
        this.avatarInput = null;
        this.avatarPreview = null;
        this.init();
    }

    init() {
        // Initialiser les éléments du DOM
        this.avatarPreview = document.getElementById('user-avatar');
        this.avatarInput = document.createElement('input');
        this.avatarInput.type = 'file';
        this.avatarInput.accept = 'image/*';
        this.avatarInput.style.display = 'none';
        
        // Ajouter l'input dans le DOM
        document.body.appendChild(this.avatarInput);
        
        // Ajouter les écouteurs d'événements
        this.avatarInput.addEventListener('change', () => this.handleAvatarChange());
        
        // Charger les données existantes
        this.loadUserData();
    }

    loadUserData() {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user && user.email) {
            // Charger l'avatar existant
            this.user = user;
            this.updateAvatar();
            
            // Mettre à jour les informations de profil
            this.updateProfile(user);
        }
    }

    handleAvatarChange() {
        const file = this.avatarInput.files[0];
        if (!file) return;

        // Convertir l'image en base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target.result;
            
            // Mettre à jour l'avatar dans l'interface
            this.avatarPreview.src = base64String;
            
            // Sauvegarder l'avatar
            this.saveAvatar(base64String);
        };
        reader.readAsDataURL(file);
    }

    saveAvatar(imageUrl) {
        if (!this.user) return;
        
        // Sauvegarder l'avatar dans les données de l'utilisateur
        localStorage.setItem('avatar_' + this.user.email, imageUrl);
        
        // Nettoyer l'input file
        this.avatarInput.value = '';
    }

    updateAvatar() {
        if (this.user) {
            const savedAvatar = localStorage.getItem('avatar_' + this.user.email);
            if (savedAvatar) {
                this.avatarPreview.src = savedAvatar;
            // Vérifier si c'est un avatar personnalisé (base64)
            if (this.user.customAvatar.startsWith('data:image/')) {
                this.avatarPreview.src = this.user.customAvatar;
            } else {
                // Pour l'avatar original de Google
                this.avatarPreview.src = this.user.originalAvatar || this.user.picture;
            }
        } else if (this.user && this.user.originalAvatar) {
            this.avatarPreview.src = this.user.originalAvatar;
        } else if (this.user && this.user.picture) {
            this.avatarPreview.src = this.user.picture;
        } else {
            this.avatarPreview.src = '';
        }
    }
    }

    static getInstance() {
        if (!ProfileManager.instance) {
            ProfileManager.instance = new ProfileManager();
        }
        return ProfileManager.instance;
    }
}

// Initialiser le gestionnaire de profil
window.addEventListener('DOMContentLoaded', () => {
    ProfileManager.getInstance();
});

// Gestionnaire de clic pour le bouton modifier l'avatar
document.querySelector('.edit-btn').addEventListener('click', () => {
    ProfileManager.getInstance().avatarInput.click();
});
