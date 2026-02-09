// Script helper pour charger le système de messagerie sur toutes les pages
// Ajoute automatiquement le CSS et initialise le composant

(function() {
    // Ajouter le CSS s'il n'est pas déjà présent
    if (!document.querySelector('link[href*="messaging.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/messaging.css';
        document.head.appendChild(link);
    }
    
    // Charger le module de messagerie
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/js/messaging.js';
    document.body.appendChild(script);
})();

