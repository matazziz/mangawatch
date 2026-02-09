// Configuration générale
export const CONFIG = {
    // API
    API_URL: 'http://localhost:8080',
    
    // Routes
    ROUTES: {
        HOME: '/',
        LOGIN: '/connexion',
        REGISTER: '/inscription',
        PROFILE: '/profil',
        TIER_LIST: '/tier-list',
        MANGAS: '/mangas',
        RESET_PASSWORD: '/reset-password'
    },

    // Auth
    AUTH: {
        GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID',
        SESSION_DURATION: 24 * 60 * 60 * 1000 // 24h
    },

    // UI
    UI: {
        THEME: 'light',
        LOADING_TIMEOUT: 3000
    },

    // Storage
    STORAGE: {
        USER: 'user',
        USER_DATA: 'user_data_',
        AVATAR: 'avatar'
    }
};
