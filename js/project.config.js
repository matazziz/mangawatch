// Configuration du projet
export default {
  // Configuration des chemins
  paths: {
    src: '/src',
    dist: '/dist',
    public: '/public',
    css: {
      main: '/public/css/main.css',
      components: '/public/css/components',
      pages: '/public/css/pages'
    },
    js: {
      main: '/public/js/main.js',
      modules: '/public/js/modules',
      utils: '/public/js/utils'
    },
    views: '/public/views',
    images: '/public/images'
  },
  
  // Fichiers à fusionner
  filesToMerge: {
    css: [
      '/css/reset.css',
      '/css/variables.css',
      '/css/global.css',
      '/css/buttons.css',
      '/css/header.css',
      '/css/nav.css',
      '/css/auth.css',
      '/css/profile.css',
      '/css/tierlist-style.css'
    ],
    js: [
      '/js/utils/helpers.js',
      '/js/modules/auth.js',
      '/js/modules/session.js'
    ]
  },
  
  // Fichiers à supprimer après fusion
  filesToRemove: [
    'auth.js',
    'session.js',
    'simple_server.py',
    'server.py',
    'catalogue.css',
    'profile.css',
    'connexion-styles.css'
  ]
};
