/**
 * Configuration Google AdSense — MangaWatch
 *
 * 1. Créez un compte sur https://www.google.com/adsense/
 * 2. Récupérez votre ID éditeur (format ca-pub-XXXXXXXXXXXXXXXX)
 * 3. Collez-le ci-dessous et mettez enabled: true
 * 4. Mettez à jour ads.txt à la racine du site avec le même ID (pub-XXXXXXXX)
 */
window.MW_ADSENSE = {
    enabled: true,
    clientId: 'ca-pub-3925599546532899',

    /** Emplacements optionnels créés dans le tableau de bord AdSense */
    slots: {
        horizontal: '',
        catalog: '',
        details: ''
    },

    /** Bannière responsive avant le footer sur les pages publiques */
    autoInsertFooter: true,

    /** Pages sans publicité */
    excludePaths: [
        '/admin.html',
        '/pages/admin.html',
        '/reset-password.html',
        '/pages/reset-password.html',
        '/public/reset-password.html'
    ]
};
