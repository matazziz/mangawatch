// Script de correction pour les boutons "..." dans les cartes

// Fonction pour nettoyer TOUS les gestionnaires d'événements existants
function cleanupAllExistingHandlers() {
    
    // Supprimer tous les gestionnaires de clic sur le document liés aux menus
    if (document._menuClickHandlers) {
        document._menuClickHandlers.forEach(handler => {
            document.removeEventListener('click', handler);
        });
        document._menuClickHandlers = [];
    }
    
    // Supprimer les gestionnaires d'événements existants sur les boutons
    const existingButtons = document.querySelectorAll('.card-more-btn');
    existingButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });
    
    // Supprimer les gestionnaires d'événements sur les cartes
    const existingCards = document.querySelectorAll('.catalogue-card[data-anime-id]');
    existingCards.forEach(card => {
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
    });
    
    // Supprimer les gestionnaires globaux spécifiques aux types
    if (window.top10ButtonHandlerAdded) {
        delete window.top10ButtonHandlerAdded;
    }
    
}

// Fonction améliorée pour attacher les événements aux cartes
function attachCardEventsImproved() {
    
    // Attendre que le DOM soit complètement chargé
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachCardEventsImproved);
        return;
    }
    
    // Attacher les événements de sélection aux cartes
    const cards = document.querySelectorAll('.catalogue-card[data-anime-id]');
    
    if (cards.length === 0) {
        setTimeout(attachCardEventsImproved, 500);
        return;
    }
    
    cards.forEach((card, index) => {
        
        // Attacher les événements des boutons "..." et menus déroulants
        const moreButton = card.querySelector('.card-more-btn');
        
        if (moreButton) {
            
            // Supprimer les anciens événements en clonant le bouton
            const newMoreButton = moreButton.cloneNode(true);
            moreButton.parentNode.replaceChild(newMoreButton, moreButton);
            
            // Attacher le nouvel événement avec une priorité élevée
            newMoreButton.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                e.stopImmediatePropagation(); // Empêcher la propagation vers d'autres gestionnaires
                
                // Nettoyé: logs DEBUG supprimés Bouton "..." cliqué sur la carte:', card.getAttribute('data-anime-id'));
                
                const dropdown = card.querySelector('.card-more-menu');
                
                // Fermer tous les autres menus
                document.querySelectorAll('.card-more-menu').forEach(menu => {
                    if (menu !== dropdown) {
                        menu.style.display = 'none';
                        menu.style.opacity = '0';
                        menu.style.pointerEvents = 'none';
                        menu.style.visibility = 'hidden';
                        menu.style.zIndex = '1';
                    }
                });
                
                // Afficher/masquer le menu de cette carte
                if (dropdown) {
                    const isVisible = dropdown.style.display === 'block' && dropdown.style.opacity === '1';
                    
                    if (isVisible) {
                        // Fermer le menu
                        dropdown.style.display = 'none';
                        dropdown.style.opacity = '0';
                        dropdown.style.pointerEvents = 'none';
                        dropdown.style.visibility = 'hidden';
                        dropdown.style.zIndex = '1';
                    } else {
                        // Ouvrir le menu avec un z-index très élevé
                        dropdown.style.display = 'block';
                        dropdown.style.opacity = '1';
                        dropdown.style.pointerEvents = 'auto';
                        dropdown.style.visibility = 'visible';
                        dropdown.style.zIndex = '99999'; // Z-index très élevé pour être sûr qu'il soit au-dessus
                        
                        // Supprimer tous les gestionnaires de clic existants sur le document
                        const existingHandlers = document._menuClickHandlers || [];
                        existingHandlers.forEach(handler => {
                            document.removeEventListener('click', handler);
                        });
                        
                        // Créer un nouveau gestionnaire de fermeture avec priorité élevée
                        const hideMenuHandler = function(e) {
                            // Ne pas fermer si on clique sur le menu, le bouton "..." ou le bouton "Ajouter au top 10"
                            const selectTop10Btn = dropdown.querySelector('.select-top10-btn');
                            if (dropdown.contains(e.target) || 
                                newMoreButton.contains(e.target) || 
                                (selectTop10Btn && selectTop10Btn.contains(e.target))) {
                                return;
                            }
                            
                            dropdown.style.display = 'none';
                            dropdown.style.opacity = '0';
                            dropdown.style.pointerEvents = 'none';
                            dropdown.style.visibility = 'hidden';
                            dropdown.style.zIndex = '1';
                            document.removeEventListener('click', hideMenuHandler);
                            
                            // Retirer le gestionnaire de la liste
                            const index = document._menuClickHandlers.indexOf(hideMenuHandler);
                            if (index > -1) {
                                document._menuClickHandlers.splice(index, 1);
                            }
                            
                        };
                        
                        // Stocker le gestionnaire pour pouvoir le supprimer plus tard
                        if (!document._menuClickHandlers) {
                            document._menuClickHandlers = [];
                        }
                        document._menuClickHandlers.push(hideMenuHandler);
                        
                        // Attendre un peu avant d'ajouter l'événement pour éviter la fermeture immédiate
                        setTimeout(() => {
                            document.addEventListener('click', hideMenuHandler, true); // true = capture phase
                        }, 500); // Délai plus long pour éviter la fermeture immédiate
                    }
                } else {
                }
            }, true); // true = capture phase pour une priorité élevée
            
            // Attacher les événements des éléments du menu
            const selectTop10Btn = card.querySelector('.select-top10-btn');
            if (selectTop10Btn) {
                
                // Supprimer les anciens événements en clonant le bouton
                const newSelectBtn = selectTop10Btn.cloneNode(true);
                selectTop10Btn.parentNode.replaceChild(newSelectBtn, selectTop10Btn);
                
                newSelectBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    
                    
                    // Si la carte est déjà sélectionnée, la désélectionner
                    if (window.selectedTop10Card === card) {
                        if (typeof setAnimeCardSelection === 'function') {
                            setAnimeCardSelection(card, false);
                        }
                        window.selectedTop10Card = null;
                    } else {
                        // Si une autre carte était sélectionnée, la désélectionner
                        if (window.selectedTop10Card && window.selectedTop10Card !== card) {
                            if (typeof setAnimeCardSelection === 'function') {
                                setAnimeCardSelection(window.selectedTop10Card, false);
                            }
                        }
                        // Sélection visuelle
                        if (typeof setAnimeCardSelection === 'function') {
                            setAnimeCardSelection(card, true);
                        }
                        window.selectedTop10Card = card;
                        
                        // Afficher l'interface en miniature si la fonction existe
                        if (typeof showTop10MiniInterface === 'function') {
                            showTop10MiniInterface().catch(err => {
                                console.error('🔘 ERREUR lors de l\'appel de showTop10MiniInterface:', err);
                            });
                        } else {
                            console.error('🔘 ERREUR: showTop10MiniInterface n\'est pas une fonction');
                        }
                    }
                    
                    // Fermer le menu
                    const dropdown = card.querySelector('.card-more-menu');
                    if (dropdown) {
                        dropdown.style.display = 'none';
                        dropdown.style.opacity = '0';
                        dropdown.style.pointerEvents = 'none';
                        dropdown.style.visibility = 'hidden';
                        dropdown.style.zIndex = '1';
                    }
                }, true); // true = capture phase
            } else {
            }
        } else {
        }
    });
    
}

// Remplacer la fonction attachCardEvents originale par la version améliorée
if (typeof attachCardEvents !== 'undefined') {
    window.attachCardEvents = attachCardEventsImproved;
}

// Attacher les événements au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    
    // Nettoyer d'abord TOUS les gestionnaires existants
    cleanupAllExistingHandlers();
    
    // Attendre un peu plus longtemps pour s'assurer que toutes les cartes sont créées
    setTimeout(() => {
        attachCardEventsImproved();
    }, 500); // Délai plus long pour s'assurer que tout est chargé
});

// Attacher aussi les événements quand de nouvelles cartes sont ajoutées
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // Vérifier si de nouvelles cartes ont été ajoutées
            const newCards = Array.from(mutation.addedNodes).filter(node => 
                node.nodeType === 1 && node.classList && node.classList.contains('catalogue-card')
            );
            
            if (newCards.length > 0) {
                setTimeout(() => {
                    attachCardEventsImproved();
                }, 200); // Délai plus long pour les nouvelles cartes
            }
        }
    });
});

// Démarrer l'observation quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
} else {
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Nettoyé: logs DEBUG supprimés Script de correction terminé'); 