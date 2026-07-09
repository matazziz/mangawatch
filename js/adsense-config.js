/**
 * Configuration Google AdSense — MangaWatch
 *
 * Emplacements manuels uniquement (entre les sections).
 * Dans AdSense : désactivez « Encarts » / in-article des annonces auto
 * pour éviter les pubs sous chaque paragraphe.
 */
window.MW_ADSENSE = {
    enabled: true,
    clientId: 'ca-pub-3925599546532899',

    slots: {
        horizontal: '',
        home: '',
        details: ''
    },

    /** Pas de bandeau générique avant le footer */
    autoInsertFooter: false,

    /** Pages sans aucune publicité */
    excludePaths: [
        '/admin.html',
        '/pages/admin.html',
        '/reset-password.html',
        '/pages/reset-password.html',
        '/public/reset-password.html',
        '/manga-database.html',
        '/pages/manga-database.html',
        '/public/manga-database.html',
        '/list.html',
        '/pages/list.html',
        '/public/list.html',
        '/user-profile.html',
        '/pages/user-profile.html',
        '/public/user-profile.html',
        '/salon.html',
        '/pages/salon.html',
        '/profil.html',
        '/pages/profil.html',
        '/public/profil.html'
    ],

    pages: {
        home: {
            match: /acceuil\.html$/i,
            container: 'main.main-container',
            sections: 'section.hero-section, section.section'
        },
        details: {
            match: /anime-details\.html$/i,
            container: '.details-container',
            sections: '.details-header, .synopsis-section, .genres-section, .additional-info, .related-seasons-section',
            watchDelayMs: 12000
        }
    }
};
