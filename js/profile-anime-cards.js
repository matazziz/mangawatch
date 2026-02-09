// === FONCTION UNIVERSELLE POUR SAUVEGARDER LES NOTES ===
// Cette fonction doit être appelée depuis toutes les pages de détail

// Helper traduction pour la page profil (boutons genre/type/ordre)
function _profileT(key) {
    return (typeof window.t === 'function' && window.t(key)) || (window.localization && window.localization.get(key)) || key;
}

// Intercepter localStorage.setItem pour détecter les suppressions de notes
(function() {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
        // Si c'est une modification de user_content_notes_, vérifier les suppressions
        if (key && key.startsWith('user_content_notes_')) {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            if (user && user.email && key === 'user_content_notes_' + user.email) {
                try {
                    const oldValue = this.getItem(key);
                    const oldNotes = oldValue ? JSON.parse(oldValue || '[]') : [];
                    const newNotes = value ? JSON.parse(value || '[]') : [];
                    
                    console.log(`🔍 [INTERCEPTEUR] Modification de ${key} détectée`);
                    console.log(`🔍 [INTERCEPTEUR] Anciennes notes: ${oldNotes.length}, Nouvelles notes: ${newNotes.length}`);
                    
                    // Trouver les notes qui ont été supprimées
                    const deletedNotes = oldNotes.filter(oldNote => {
                        const isDeleted = !newNotes.some(newNote => 
                            String(newNote.id) === String(oldNote.id) && 
                            newNote.contentType === oldNote.contentType
                        );
                        if (isDeleted) {
                            console.log(`🔍 [INTERCEPTEUR] Note supprimée détectée: ${oldNote.titre || oldNote.title || oldNote.id} (${oldNote.contentType}, ID: ${oldNote.id})`);
                        }
                        return isDeleted;
                    });
                    
                    // Nettoyer le top 10 pour chaque note supprimée
                    if (deletedNotes.length > 0) {
                        console.log(`🔄 [INTERCEPTEUR] ${deletedNotes.length} note(s) supprimée(s) détectée(s) via localStorage.setItem, nettoyage du top 10...`);
                        deletedNotes.forEach(deletedNote => {
                            console.log(`🧹 [INTERCEPTEUR] Nettoyage du top 10 pour ${deletedNote.contentType} ${deletedNote.id} (${deletedNote.titre || deletedNote.title || 'Sans titre'})`);
                            // Attendre un peu que la fonction soit définie si nécessaire
                            setTimeout(() => {
                                if (typeof window.cleanTop10FromSpecificNote === 'function') {
                                    console.log(`✅ [INTERCEPTEUR] Fonction cleanTop10FromSpecificNote trouvée, appel...`);
                                    window.cleanTop10FromSpecificNote(deletedNote.id, deletedNote.contentType, user).catch(err => {
                                        console.error('❌ [INTERCEPTEUR] Erreur lors du nettoyage du top 10:', err);
                                    });
                                } else {
                                    console.warn(`⚠️ [INTERCEPTEUR] Fonction cleanTop10FromSpecificNote non disponible, réessai dans 100ms...`);
                                    setTimeout(() => {
                                        if (typeof window.cleanTop10FromSpecificNote === 'function') {
                                            window.cleanTop10FromSpecificNote(deletedNote.id, deletedNote.contentType, user).catch(err => {
                                                console.error('❌ [INTERCEPTEUR] Erreur lors du nettoyage du top 10 (2e tentative):', err);
                                            });
                                        } else {
                                            console.error('❌ [INTERCEPTEUR] Fonction cleanTop10FromSpecificNote toujours non disponible');
                                        }
                                    }, 100);
                                }
                            }, 50);
                        });
                    } else {
                        console.log(`ℹ️ [INTERCEPTEUR] Aucune note supprimée détectée`);
                    }
                } catch (e) {
                    console.error('❌ [INTERCEPTEUR] Erreur lors de la détection des suppressions:', e);
                }
            }
        }
        
        // Appeler la fonction originale
        return originalSetItem.call(this, key, value);
    };
    console.log('✅ [INTERCEPTEUR] Intercepteur localStorage.setItem installé');
})();

// Réappliquer la traduction des synopsis chaque fois que des cartes (avec synopsis) sont ajoutées au DOM
(function() {
    function scheduleTranslateSynopses() {
        if (window._translateSynopsesTimer) clearTimeout(window._translateSynopsesTimer);
        window._translateSynopsesTimer = setTimeout(function() {
            window._translateSynopsesTimer = null;
            if (typeof window.translateSynopses === 'function') {
                window.translateSynopses(localStorage.getItem('mangaWatchLanguage') || 'fr');
            }
        }, 650);
    }
    function hasSynopsisEl(node) {
        if (!node || node.nodeType !== 1) return false;
        if (node.classList && (node.classList.contains('content-synopsis') || node.classList.contains('profile-card-synopsis'))) return true;
        return node.querySelector && node.querySelector('.content-synopsis, .profile-card-synopsis');
    }
    function setupSynopsisObserver() {
        if (window._synopsisObserverSetup) return;
        window._synopsisObserverSetup = true;
        var observer = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var added = mutations[i].addedNodes;
                for (var j = 0; j < added.length; j++) {
                    if (hasSynopsisEl(added[j])) {
                        scheduleTranslateSynopses();
                        return;
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    if (document.body) setupSynopsisObserver();
    else document.addEventListener('DOMContentLoaded', setupSynopsisObserver);
})();

// Déclaration globale de la fonction de nettoyage du top 10 (version temporaire qui fait le nettoyage basique)
// Cette fonction sera remplacée par la version complète plus tard dans le fichier
window.cleanTop10FromSpecificNote = async function(contentId, contentType, user) {
    console.log(`🧹 Nettoyage immédiat du top 10 pour ${contentType} ${contentId} (version temporaire)`);
    console.log(`🔍 Détails de la suppression:`, { contentId, contentType, user: user?.email });
    
    if (!user || !user.email) {
        console.log('❌ Utilisateur non valide, arrêt du nettoyage immédiat');
        return Promise.resolve();
    }
    
    // Faire un nettoyage basique immédiatement
    const top10Prefix = 'user_top10_' + user.email;
    let totalCleaned = 0;
    
    console.log(`🔍 [VERSION TEMPORAIRE] Recherche de ${contentId} (${contentType}) dans tous les top 10...`);
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(top10Prefix)) continue;
        
        try {
            const top10 = JSON.parse(localStorage.getItem(key) || '[]');
            if (!Array.isArray(top10)) continue;
            
            let hasChanges = false;
            const cleanedTop10 = top10.map((item, index) => {
                if (!item) return null;
                
                const itemId = String(item.id);
                const targetId = String(contentId);
                
                if (itemId === targetId) {
                    const itemContentType = item.contentType || 'anime';
                    console.log(`🗑️ [VERSION TEMPORAIRE] Suppression de ${item.titre || item.title || item.name || itemId} (${itemContentType}) du Top 10: ${key} (position ${index})`);
                    hasChanges = true;
                    return null;
                }
                
                return item;
            });
            
            if (hasChanges) {
                localStorage.setItem(key, JSON.stringify(cleanedTop10));
                totalCleaned++;
                console.log(`✅ [VERSION TEMPORAIRE] Top 10 mis à jour: ${key}`);
            }
        } catch (e) {
            console.error(`❌ [VERSION TEMPORAIRE] Erreur lors du nettoyage de ${key}:`, e);
        }
    }
    
    console.log(`✅ [VERSION TEMPORAIRE] Nettoyage terminé: ${totalCleaned} Top 10 nettoyé(s)`);
    
    // Déclencher un événement pour mettre à jour l'affichage
    if (totalCleaned > 0) {
        const updateEvent = new CustomEvent('top10Updated', {
            detail: { reason: 'noteDeleted', contentId, contentType }
        });
        document.dispatchEvent(updateEvent);
        localStorage.setItem('top10_updated', 'true');
    }
};

// === FONCTION HELPER POUR CHARGER LES NOTES (Firebase en priorité) ===
/**
 * Charge toutes les notes d'un utilisateur depuis Firebase ou localStorage (fallback uniquement)
 * @param {string} userEmail - Email de l'utilisateur
 * @returns {Promise<Array>} Liste des notes
 */
async function loadUserNotes(userEmail) {
    if (!userEmail) {
        console.warn('[loadUserNotes] Aucun email fourni');
    }

    // Essayer d'abord Firebase (attendre un peu si les moduleens ne sont pas encore chargés)
    if (typeof window.firebaseNotesService !== 'undefined' && window.firebaseNotesService) {
        try {
            const notes = await window.firebaseNotesService.getAllNotes(userEmail);
            if (notes && Array.isArray(notes)) {
                console.log(`[loadUserNotes] ${notes.length} notes chargées depuis Firebase`);
                return notes;
            }
        } catch (err) {
            console.error('[loadUserNotes] Erreur lors du chargement depuis Firebase:', err);
        }
    } else {
        // Attendre un peu que les modules Firebase se chargent
        console.log('[loadUserNotes] Firebase non disponible, attente de 500ms...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Réessayer Firebase
        if (typeof window.firebaseNotesService !== 'undefined' && window.firebaseNotesService) {
            try {
                const notes = await window.firebaseNotesService.getAllNotes(userEmail);
                if (notes && Array.isArray(notes)) {
                    console.log(`[loadUserNotes] ${notes.length} notes chargées depuis Firebase (après attente)`);
                    return notes;
                }
            } catch (err) {
                console.error('[loadUserNotes] Erreur lors du chargement depuis Firebase (après attente):', err);
            }
        }
    }

    // Fallback vers localStorage uniquement si Firebase n'est pas disponible
    console.warn('[loadUserNotes] Firebase non disponible, fallback vers localStorage');
    try {
        const notesKey = 'user_content_notes_' + userEmail;
        const notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
        console.log(`[loadUserNotes] ${notes.length} notes chargées depuis localStorage (fallback)`);
        return notes;
    } catch (e) {
        console.error('[loadUserNotes] Erreur lors du chargement depuis localStorage:', e);
        return [];
    }
}

// Exporter pour utilisation globale
window.loadUserNotes = loadUserNotes;

function saveAnimeNote(animeId, rating, animeData = {}) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        console.error('Utilisateur non connecté');
        return;
    }
    
    const notesKey = 'user_content_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) {
        console.error('Erreur lors de la lecture des notes:', e);
        notes = [];
    }
    
    // Détecter automatiquement le contentType basé sur les données fournies
    let detectedContentType = animeData.contentType || 'anime'; // Utiliser le contentType fourni s'il existe
    
    // Si pas de contentType fourni, détecter basé sur le titre, genres, etc.
    if (!animeData.contentType) {
        const titre = (animeData.titre || animeData.title || animeData.name || '').toLowerCase();
        const genres = (animeData.genres || []).join(' ').toLowerCase();
        const noteId = animeId ? String(animeId).toLowerCase() : '';
        
        // Détection des doujins (critères plus larges)
        // IMPORTANT: "Ecchi" est un genre, pas un type de contenu. Ne pas l'utiliser pour détecter les doujins.
        // Un anime peut avoir le genre "Ecchi" sans être un doujin.
        if (titre.includes('doujin') || 
            titre.includes('totally captivated') ||
            titre.includes('hentai') ||
            titre.includes('sex') ||
            titre.includes('adult') ||
            // titre.includes('ecchi') || // "Ecchi" est un genre, pas un type
            genres.includes('erotica') ||
            genres.includes('adult') ||
            genres.includes('hentai') ||
            // genres.includes('ecchi') || // "Ecchi" est un genre, pas un type
            genres.includes('mature') ||
            genres.includes('yuri') ||
            genres.includes('yaoi') ||
            genres.includes('boys love') ||
            genres.includes('girls love') ||
            genres.includes('smut') ||
            noteId.includes('doujin')) {
            detectedContentType = 'doujin';
        }
        // Détection des romans
        else if (titre.includes('roman') || 
                 titre.includes('novel') ||
                 noteId.includes('roman')) {
            detectedContentType = 'roman';
        }
        // Détection des manhua
        else if (titre.includes('manhua') || 
                 noteId.includes('manhua')) {
            detectedContentType = 'manhua';
        }
        // Détection des manhwa
        else if (titre.includes('manhwa') ||
                 titre.includes('on the way to meet mom') ||
                 titre.includes('solo leveling') ||
                 titre.includes('tower of god') ||
                 titre.includes('noblesse') ||
                 titre.includes('the beginning after the end') ||
                 noteId.includes('manhwa')) {
            detectedContentType = 'manhwa';
        }
        // Détection des films
        else if (titre.includes('film') || 
                 titre.includes('movie') ||
                 noteId.includes('film')) {
            detectedContentType = 'film';
        }
        // Détection des mangas (fallback si isManga existe)
        else if (animeData.isManga) {
            detectedContentType = 'manga';
        }
    }
    
    // Créer l'objet anime complet avec le contentType détecté
    const animeNote = {
        id: animeId,
        note: Number(rating),
        contentType: detectedContentType,
        addedAt: Date.now(),
        ...animeData,
        contentType: detectedContentType // S'assurer que le contentType détecté écrase celui dans animeData
    };
    
    // Chercher si l'anime existe déjà avec le même contentType
    const existingIndex = notes.findIndex(n => String(n.id) === String(animeId) && n.contentType === detectedContentType);
    
    if (existingIndex !== -1) {
        // Mettre à jour la note existante en conservant la date d'ajout
        const originalAddedAt = notes[existingIndex].addedAt;
        notes[existingIndex] = { ...notes[existingIndex], ...animeNote, addedAt: originalAddedAt };
        // S'assurer que le contentType est bien mis à jour
        notes[existingIndex].contentType = detectedContentType;
        console.log(`✅ Note mise à jour pour ${detectedContentType} ${animeId}: ${rating}/10`);
    } else {
        // Vérifier s'il existe une note avec le même ID mais un contentType différent
        // Si oui, mettre à jour le contentType
        const existingWithDifferentType = notes.findIndex(n => String(n.id) === String(animeId) && n.contentType !== detectedContentType);
        if (existingWithDifferentType !== -1) {
            notes[existingWithDifferentType].contentType = detectedContentType;
            // Mettre à jour aussi les autres données
            const originalAddedAt = notes[existingWithDifferentType].addedAt;
            notes[existingWithDifferentType] = { ...notes[existingWithDifferentType], ...animeNote, addedAt: originalAddedAt, contentType: detectedContentType };
            console.log(`✅ Note existante mise à jour avec nouveau contentType pour ${detectedContentType} ${animeId}: ${rating}/10`);
        } else {
            // Ajouter une nouvelle note
            notes.push(animeNote);
            console.log(`✅ Nouvelle note ajoutée pour ${detectedContentType} ${animeId}: ${rating}/10`);
        }
    }
    
    // Sauvegarder dans user_content_notes_
    localStorage.setItem(notesKey, JSON.stringify(notes));
    
    // Synchroniser aussi avec animeRatings pour compatibilité (seulement pour les animes)
    if (detectedContentType === 'anime') {
        const animeRatings = JSON.parse(localStorage.getItem('animeRatings') || '{}');
        animeRatings[animeId] = rating;
        localStorage.setItem('animeRatings', JSON.stringify(animeRatings));
    }
    
    console.log('📝 Notes sauvegardées:', notes);
    return notes;
}

// Fonction pour mettre à jour automatiquement les contentType des notes existantes
function updateExistingNotesContentType() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) return;
    
    const notesKey = 'user_content_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) {
        console.error('Erreur lors de la lecture des notes:', e);
        return;
    }
    
    let hasChanges = false;
    
    notes.forEach(note => {
        // Si le contentType n'est pas défini ou est incorrect, essayer de le détecter
        const titre = (note.titre || note.title || note.name || '').toLowerCase();
        const genres = (note.genres || []).join(' ').toLowerCase();
        const noteId = note.id ? String(note.id).toLowerCase() : '';
        
        // Détection des doujins
        // IMPORTANT: "Ecchi" est un genre, pas un type de contenu. Ne pas l'utiliser pour détecter les doujins.
        // Un anime peut avoir le genre "Ecchi" sans être un doujin.
        // Détection STRICTE des doujins - seulement si c'est vraiment un doujin
        // IMPORTANT: Ne pas utiliser "ecchi", "mature", "yuri", "yaoi", "boys love", "girls love", "smut"
        // car ce sont des genres, pas des types de contenu
        // Un anime peut avoir ces genres sans être un doujin
        const isDoujin = titre.includes('doujin') || 
            titre.includes('totally captivated') ||
            // Seulement détecter par genres si c'est vraiment explicite (hentai, erotica, adult)
            // MAIS PAS "ecchi" qui est juste un genre
            (genres.includes('hentai') || genres.includes('erotica') || genres.includes('adult')) ||
            noteId.includes('doujin');
        
        if (isDoujin && note.contentType !== 'doujin') {
            console.log(`🔄 Mise à jour contentType vers "doujin" pour: "${note.titre || note.title || note.name}" (ID: ${note.id})`);
            note.contentType = 'doujin';
            hasChanges = true;
        }
        // Détection des manhwa
        else if ((titre.includes('manhwa') ||
                 titre.includes('on the way to meet mom') ||
                 titre.includes('solo leveling') ||
                 titre.includes('tower of god') ||
                 titre.includes('noblesse') ||
                 titre.includes('the beginning after the end') ||
                 noteId.includes('manhwa')) && note.contentType !== 'manhwa') {
            console.log(`🔄 Mise à jour contentType vers "manhwa" pour: "${note.titre || note.title || note.name}" (ID: ${note.id})`);
            note.contentType = 'manhwa';
            hasChanges = true;
        }
        // Détection des manhua
        else if ((titre.includes('manhua') || noteId.includes('manhua')) && note.contentType !== 'manhua') {
            console.log(`🔄 Mise à jour contentType vers "manhua" pour: "${note.titre || note.title || note.name}" (ID: ${note.id})`);
            note.contentType = 'manhua';
            hasChanges = true;
        }
        // Si c'est un manga mais pas un doujin/manhwa/manhua, s'assurer que le contentType est correct
        else if (note.isManga && !note.contentType && !isDoujin) {
            note.contentType = 'manga';
            hasChanges = true;
        }
    });
    
    if (hasChanges) {
        localStorage.setItem(notesKey, JSON.stringify(notes));
        console.log('✅ Mise à jour des contentType terminée');
        // Recharger l'affichage
        setTimeout(() => {
            if (typeof displayUserAnimeNotes === 'function') {
                displayUserAnimeNotes();
            }
        }, 100);
    }
}

// Helper : traduction du genre pour l'affichage (utilise localization si dispo)
function getTranslatedGenreForProfile(apiGenreName) {
    return (typeof window.getTranslatedGenre === 'function') ? window.getTranslatedGenre(apiGenreName) : (apiGenreName || '');
}
// Helper : libellé "Ajouter au top 10" traduit pour le menu des cartes
function getAddToTop10Label() {
    return (typeof window.t === 'function' && window.t('profile.add_to_top10')) || 'Ajouter au top 10';
}
// Helper : titre "Choisissez un emplacement pour X dans votre Top 10"
function getTop10ChooseSlotLabel(title) {
    var raw = (typeof window.t === 'function' && window.t('profile.top10_choose_slot')) || 'Choisissez un emplacement pour "{{title}}" dans votre Top 10';
    return (raw || '').replace(/\{\{title\}\}/g, title || '');
}
// Helper : libellé emplacement vide, déplacer, retirer
function getTop10SlotEmptyLabel() { return (typeof window.t === 'function' && window.t('profile.top10_slot_empty')) || 'Vide'; }
function getTop10MoveLabel() { return (typeof window.t === 'function' && window.t('profile.top10_move')) || 'Déplacer'; }
function getTop10RemoveLabel() { return (typeof window.t === 'function' && window.t('profile.top10_remove')) || 'Retirer'; }
function getTop10PlaceHintLabel() { return (typeof window.t === 'function' && window.t('profile.top10_place_hint')) || 'Cliquez sur "..." puis sur le bouton pour ajouter au top 10'; }

// Fonction pour tronquer le synopsis à 180 caractères maximum
function truncateSynopsis(synopsis, maxLength = 150) {
    if (!synopsis) return '';
    
    // Nettoyer les espaces multiples
    let text = synopsis.replace(/\s+/g, ' ').trim();
    
    // Si le texte est déjà plus court que la limite, le retourner tel quel
    if (text.length <= maxLength) return text;
    
    // Tronquer à la limite
    let truncated = text.substring(0, maxLength);
    
    // Essayer de tronquer à la fin d'un mot
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > maxLength * 0.8) { // Si on trouve un espace dans les 80% derniers caractères
        truncated = truncated.substring(0, lastSpaceIndex);
    }
    
    return truncated + '...';
}

// Données d'exemple pour les animes (utilisées comme fallback)
const animeExamples = [];

// Ajouter cette nouvelle fonction avant displayUserAnimeNotes
// Exposer la fonction globalement
window.createStarBadges = function createStarBadges() {
    console.log('🎯 createStarBadges appelée');
    
    // Supprimer l'ancien conteneur de résultats de recherche s'il existe (nettoyage au chargement)
    const oldSearchContainer = document.getElementById('search-results-container');
    if (oldSearchContainer) {
        oldSearchContainer.remove();
    }
    
    // Supprimer aussi le conteneur de cartes de recherche s'il existe
    const searchCardsContainer = document.getElementById('search-cards-container');
    if (searchCardsContainer) {
        searchCardsContainer.remove();
    }
    
    const reviewsSection = document.getElementById('reviews-section');
    console.log('📋 reviewsSection trouvée:', !!reviewsSection);
    if (!reviewsSection) {
        console.error('❌ reviewsSection non trouvée, création impossible');
        return false;
    }
    
    console.log('✅ reviewsSection trouvée, création des conteneurs...');
    
    // Forcer une largeur maximale au conteneur principal pour éviter l'agrandissement
        reviewsSection.style.maxWidth = '1600px';
        reviewsSection.style.width = '100%';
        reviewsSection.style.margin = '0 auto';
        reviewsSection.style.overflow = 'hidden';
        reviewsSection.style.boxSizing = 'border-box';
        reviewsSection.style.padding = '0 0.25rem';
        reviewsSection.style.position = 'relative';

    // Supprimer tous les anciens containers étoiles AVANT de les recréer (évite les doublons et bugs d'insertion)
    reviewsSection.querySelectorAll('.all-star-containers').forEach(el => el.remove());
    // Supprimer aussi toutes les anciennes listes de cartes
    reviewsSection.querySelectorAll('.card-list').forEach(el => el.remove());
    
    // Supprimer le conteneur de boutons existant s'il existe (pour éviter les doublons)
    const existingSortBtnContainer = reviewsSection.querySelector('#sort-btn-container');
    if (existingSortBtnContainer) {
        existingSortBtnContainer.remove();
    }
    
    // Supprimer aussi le conteneur de genres s'il existe
    const oldGenreContainer = document.getElementById('genre-sort-container');
    if (oldGenreContainer) {
        oldGenreContainer.remove();
    }

    // Créer le conteneur des cartes
    const catalogueContainer = document.createElement('div');
    catalogueContainer.className = 'card-list';
    catalogueContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(5, 175px);
        grid-template-rows: repeat(2, auto);
        gap: 1.5rem;
        margin: 1.5rem auto 2.5rem auto;
        padding: 0 1.5rem;
        position: relative;
        z-index: 1;
        width: fit-content;
        max-width: calc(100% - 3rem);
        justify-content: center;
        justify-items: center;
        box-sizing: border-box;
    `;
    
    // Ajouter une media query pour les petits écrans
    if (window.innerWidth < 1200) {
        catalogueContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(175px, 1fr))';
        catalogueContainer.style.maxWidth = '100%';
    }

    // Auto-scroll désactivé pour éviter les bugs de scroll
    // let autoScrollInterval = null;
    // document.addEventListener('dragover', function(e) {
    //     const mouseY = e.clientY;
    //     const scrollZone = 80; // px du haut/bas de la fenêtre
    //     const scrollSpeed = 22; // px par tick
    //     clearInterval(autoScrollInterval);
    //     if (mouseY < scrollZone) {
    //         autoScrollInterval = setInterval(() => {
    //             window.scrollBy(0, -scrollSpeed);
    //         }, 16);
    //     } else if (mouseY > window.innerHeight - scrollZone) {
    //         autoScrollInterval = setInterval(() => {
    //             window.scrollBy(0, scrollSpeed);
    //         }, 16);
    //     }
    // });
    // document.addEventListener('dragleave', function() {
    //     clearInterval(autoScrollInterval);
    // });
    // document.addEventListener('drop', function() {
    //     clearInterval(autoScrollInterval);
    // });

    // Créer exactement 10 cartes (1 à 10)
    for (let i = 1; i <= 10; i++) {
        const card = document.createElement('div');
        card.className = `catalogue-card rating-${i}`;
        card.id = `catalogue-card-${i}`;
        card.setAttribute('data-top-index', i-1);
        card.setAttribute('draggable', 'false');
        card.style.cssText = `
            position: relative;
            background: #23262f;
            border: 1.5px solid #bdbdbd;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 1.2rem 0.7rem 1rem 0.7rem;
            height: 320px;
            width: 175px;
            overflow: hidden;
            box-sizing: border-box;
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
        `;

        // Badge ou médaille (position)
        const badge = document.createElement('div');
        badge.className = 'catalogue-position';
        badge.style.cssText = `
            position: relative;
            margin-bottom: 0.8rem;
            z-index: 2;
            text-align: center;
            width: 100%;
        `;
        if (i <= 3) {
            const medals = {
                1: { emoji: '🥇', color: '#00b894' },
                2: { emoji: '🥈', color: '#00b894' },
                3: { emoji: '🥉', color: '#00b894' }
            };
            badge.innerHTML = `<div style="font-size: 2rem; margin-bottom: 0.2rem;">${medals[i].emoji}</div>`;
        } else {
            badge.innerHTML = `<div style="font-size: 1.4rem; color: #00b894; font-weight: bold;">${i}/10</div>`;
        }

        // Image placeholder
        const image = document.createElement('div');
        image.className = 'catalogue-image-placeholder';
        image.style.cssText = `
            width: 110px;
            height: 145px;
            background: #2a2d36;
            border-radius: 10px;
            margin: 0 auto 0.8rem auto;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #bdbdbd;
            font-size: 2.2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        image.innerHTML = `${i}`;

        // Titre (dédié)
        const titre = document.createElement('span');
        titre.className = 'anime-title';
        titre.style.cssText = `
            color: #00b894;
            font-size: 1.1rem;
            font-weight: 800;
            text-align: center;
            margin-top: 0.5rem;
            display: block;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        titre.textContent = `Anime ${i}`;

        // Assembler la carte
        card.appendChild(badge);
        card.appendChild(image);
        card.appendChild(titre);
        catalogueContainer.appendChild(card);

        // Drag & drop events pour slot top 10
        card.addEventListener('dragover', function(e) {
            e.preventDefault();
            card.classList.add('catalogue-card-drop-hover');
        });
        card.addEventListener('dragleave', function() {
            card.classList.remove('catalogue-card-drop-hover');
        });
        card.addEventListener('drop', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            card.classList.remove('catalogue-card-drop-hover');
            
            // Vérifier qu'une carte est bien sélectionnée via le menu
            if (!window.selectedTop10Card) {
                // Afficher un message d'instruction
                const helpMsg = document.createElement('div');
                helpMsg.id = 'drag-help-msg';
                helpMsg.textContent = 'Veuillez d\'abord cliquer sur les trois points puis sur "Placer" avant de déplacer une carte.';
                helpMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#ff6b6b;color:#fff;padding:12px 28px;border-radius:12px;font-size:1.15rem;z-index:9999;box-shadow:0 2px 12px #ff6b6b77;';
                document.body.appendChild(helpMsg);
                setTimeout(() => { helpMsg.remove(); }, 3000);
                return;
            }
            
            // Récupérer les données de la carte sélectionnée
            const animeId = window.selectedTop10Card.getAttribute('data-anime-id');
            const isManga = window.selectedTop10Card.getAttribute('data-is-manga') === 'true';
            
            // Récupérer l'utilisateur actuel
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            if (!user || !user.email) return;
            
            // Récupérer le top 10 du genre et type sélectionnés (contexte actuel)
            const genres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
            const genre = genres.length > 0 ? genres.slice().sort().join(',') : null;
            const type = window.selectedType || null;
            let top10 = await getUserTop10(user, genre, type);
            
            // Récupérer les notes de l'utilisateur
            let notes = [];
            try {
                const notesKey = isManga ? 'user_manga_notes_' : 'user_anime_notes_';
                notes = JSON.parse(localStorage.getItem(notesKey + user.email) || '[]');
            } catch (e) { 
                console.error('Erreur lors de la lecture des notes:', e);
                notes = []; 
            }
            
            // Trouver l'anime/manga dans les notes
            const item = notes.find(a => String(a.id) === String(animeId));
            if (!item) {
                console.error('Élément non trouvé dans les notes');
                return;
            }
            
            // S'assurer que top10 est un tableau de 10 éléments
            if (!Array.isArray(top10) || top10.length < 10) {
                top10 = Array(10).fill(null);
            }
            
            // Utiliser la fonction insertIntoTop10 globale définie plus bas
            const targetIndex = Number(card.getAttribute('data-top-index'));
            top10 = insertIntoTop10(top10, item, targetIndex);
            
            // Nettoyer les entrées vides (au cas où)
            top10 = top10.map(item => item || null);
            
            // Sauvegarder le top 10 mis à jour
            setUserTop10(user, top10, genre, window.selectedType);
            
            // Réinitialiser la sélection
            if (window.selectedTop10Card) {
                setAnimeCardSelection(window.selectedTop10Card, false);
                window.selectedTop10Card = null;
            }
            
            // Afficher un message de confirmation
            const helpMsg = document.createElement('div');
            helpMsg.id = 'drag-help-msg';
            helpMsg.textContent = 'Carte ajoutée au top 10 avec succès !';
            helpMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#00b894;color:#fff;padding:12px 28px;border-radius:12px;font-size:1.15rem;z-index:9999;box-shadow:0 2px 12px #00b89477;';
            document.body.appendChild(helpMsg);
            setTimeout(() => { helpMsg.remove(); }, 2500);
        });

        // Hover effect
        card.onmouseover = () => {
            card.style.transform = 'translateY(-5px)';
            card.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
        };
        card.onmouseout = () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        };
    }

    // Insérer le container avant les boutons de filtre
    const filterButtons = reviewsSection.querySelector('div[style*="justify-content:center"]');
    if (filterButtons) {
        filterButtons.parentNode.insertBefore(catalogueContainer, filterButtons);
    } else {
        reviewsSection.appendChild(catalogueContainer);
    }
    
    // Empêcher le drop sur les containers non-top10
    preventDropOnNonTop10Containers();
    


    // Créer un container principal pour tous les badges et containers
    const allContainers = document.createElement('div');
    allContainers.className = 'all-star-containers';
    allContainers.style.cssText = `
        width: 98%;
        max-width: 98%;
        margin: 2.5rem auto 0 auto;
        display: flex;
        flex-direction: column;
        gap: 2rem;
        box-sizing: border-box;
    `;

    // Créer les badges pour les notes de 10 à 1 et leurs containers à anime cards
    for (let i = 10; i >= 1; i--) {
        const badgeContainer = document.createElement('div');
        badgeContainer.className = 'star-rating-group';
        badgeContainer.style.cssText = `
            width: 100%;
            max-width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            box-sizing: border-box;
            margin-bottom: 1.5rem;
        `;

        // Badge d'étoiles
        const badge = document.createElement('div');
        badge.className = 'star-rating-badge';
        badge.style.cssText = `
            position: relative;
            background: #23262f;
            border-radius: 14px;
            min-width: 90px;
            max-width: 120px;
            padding: 0.7rem 1.3rem;
            box-shadow: 0 2px 12px #0007;
            display: flex;
            align-items: flex-start;
            margin-bottom: 1.5rem;
        `;
        badge.innerHTML = `
            <span style="font-size:2.1rem;color:#ffd700;font-weight:700;display:flex;align-items:center;gap:0;">
                ${i}<i class="fas fa-star" style="margin-left:0.1rem;"></i>
            </span>
        `;

        // Container pour les animes (anime cards)
        const starContainer = document.createElement('div');
        starContainer.id = i === 10 ? 'star-containers' : `star-containers-${i}`;
        starContainer.style.cssText = `
            width: 100%;
            max-width: 100%;
            min-height: 340px;
            background: #23262f;
            border-radius: 18px;
            box-shadow: 0 2px 16px #0006;
            padding: 2rem 1.5rem;
            margin: 0 auto 1.5rem auto;
            box-sizing: border-box;
            overflow-x: hidden;
        `;

        // Pour la note 10, badge et container sont groupés
        badgeContainer.appendChild(badge);
        badgeContainer.appendChild(starContainer);
        allContainers.appendChild(badgeContainer);
    }

    // Ajoute le container principal des étoiles sous le catalogueContainer
    catalogueContainer.after(allContainers);
    
    console.log('✅ Conteneurs créés avec succès');
    const containersCreated = document.querySelectorAll('[id^="star-containers"]');
    console.log('📦 Nombre de conteneurs créés:', containersCreated.length);

    // Créer le bouton 'Trier par genre' (data-i18n pour mise à jour au changement de langue)
    const _pt = _profileT;
    const sortButton = document.createElement('button');
    sortButton.id = 'sort-by-genre-btn';
    sortButton.setAttribute('data-i18n', 'genre_sort');
    sortButton.textContent = _pt('genre_sort');
    sortButton.style.cssText = `
        background: linear-gradient(135deg, #00b894 0%, #00a085 100%);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px 24px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 184, 148, 0.3);
        margin: 8px auto 8px 0;
        display: inline-block;
    `;

    // === AJOUT BOUTON FILTRAGE PAR TYPE ===
    let typeButton = document.createElement('button');
    typeButton.id = 'filter-by-type-btn';
    // Définir "manga" comme type par défaut - toujours manga au retour
    window.selectedType = 'manga';
    
    // Restaurer le texte du bouton type selon la valeur sauvegardée (traduit)
    const typeTexts = {
        'anime': _pt('profile.search_anime'),
        'manga': _pt('profile.search_manga'),
        'doujin': 'Doujin',
        'manhwa': 'Manhwa',
        'manhua': 'Manhua',
        'film': _pt('profile.search_movie'),
        'tous': _pt('profile.type_all')
    };
    typeButton.textContent = typeTexts[window.selectedType] || _pt('profile.search_manga');
    typeButton.style.cssText = sortButton.style.cssText + 'margin-left: 0; margin-right: 8px;';
    typeButton.style.display = 'inline-block';

    // Menu déroulant pour le bouton type
    let typeMenu = document.createElement('div');
    typeMenu.id = 'filter-by-type-menu';
    typeMenu.style.cssText = `
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 8px;
        background: #23262f;
        color: #00b894;
        font-size: 1rem;
        font-weight: 600;
        border-radius: 12px;
        box-shadow: 0 4px 16px #0002;
        padding: 0.5rem 0;
        min-width: 180px;
        z-index: 1000;
        border: 1.5px solid #00b894;
        text-align: left;
    `;
    typeMenu.innerHTML = `
        <div class="type-menu-item" data-type="manga" style="padding: 10px 22px; cursor: pointer; background: #00b89422; color: #00b894; font-weight: bold;">${_pt('profile.search_manga')}</div>
        <div class="type-menu-item" data-type="anime" style="padding: 10px 22px; cursor: pointer;">${_pt('profile.search_anime')}</div>
        <div class="type-menu-item" data-type="film" style="padding: 10px 22px; cursor: pointer;">${_pt('profile.search_movie')}</div>
    `;

    // === AJOUT BOUTON ORDRE DÉCROISSANT ===
    orderButton = document.createElement('button');
    orderButton.id = 'order-desc-btn';
    currentOrder = 'desc';
    orderButton.dataset.order = 'desc';
    orderButton.textContent = _pt('profile.order_desc');
    orderButton.style.cssText = sortButton.style.cssText + 'margin-left: 0; margin-right: 8px;';
    orderButton.style.display = 'inline-block';

    // Menu déroulant pour le bouton ordre
    orderMenu = document.createElement('div');
    orderMenu.id = 'order-desc-menu';
    orderMenu.style.cssText = `
        display: none;
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        background: #23262f;
        color: #00b894;
        font-size: 1rem;
        font-weight: 600;
        border-radius: 12px;
        box-shadow: 0 4px 16px #0002;
        padding: 0.5rem 0;
        min-width: 180px;
        z-index: 10001;
        border: 1.5px solid #00b894;
        text-align: left;
    `;
    orderMenu.innerHTML = `
        <div class="order-menu-item" data-order="desc" style="padding: 10px 22px; cursor: pointer; background: #00b89422; color: #00b894; font-weight: bold;">${_pt('profile.order_desc')}</div>
        <div class="order-menu-item" data-order="asc" style="padding: 10px 22px; cursor: pointer;">${_pt('profile.order_asc')}</div>
    `;
    // Barre de recherche pour filtrer les animes dans la section reviews
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = 'position: relative; display: inline-block; width: 250px; max-width: 250px; flex-shrink: 0;';
    
    const searchInput = document.createElement('input');
    searchInput.id = 'profile-search-input';
    searchInput.type = 'text';
    searchInput.placeholder = _pt('profile.search_placeholder') || 'Rechercher...';
    searchInput.style.cssText = `
        padding: 12px 40px 12px 16px;
        font-size: 1rem;
        border: 2px solid #00b894;
        border-radius: 12px;
        background: #23262f;
        color: #f5f6fa;
        outline: none;
        transition: all 0.3s ease;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        box-shadow: 0 2px 8px rgba(0, 184, 148, 0.2);
    `;
    searchInput.addEventListener('focus', () => {
        searchInput.style.borderColor = '#00d4aa';
        searchInput.style.boxShadow = '0 4px 12px rgba(0, 184, 148, 0.4)';
    });
    searchInput.addEventListener('blur', () => {
        searchInput.style.borderColor = '#00b894';
        searchInput.style.boxShadow = '0 2px 8px rgba(0, 184, 148, 0.2)';
    });
    
    // Bouton de fermeture (croix)
    const clearButton = document.createElement('button');
    clearButton.innerHTML = '×';
    clearButton.type = 'button';
    clearButton.style.cssText = `
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        color: #00b894;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: none;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
        line-height: 1;
    `;
    clearButton.addEventListener('mouseenter', () => {
        clearButton.style.color = '#00d4aa';
    });
    clearButton.addEventListener('mouseleave', () => {
        clearButton.style.color = '#00b894';
    });
    clearButton.addEventListener('click', (e) => {
        e.stopPropagation();
        searchInput.value = '';
        searchInput.focus();
        
        // Si les résultats étaient dans le container de genre, restaurer la vue genre (liste du genre comme avant la recherche)
        if (window.searchResultsInGenreContainer && typeof applyGenreFilter === 'function') {
            window.searchResultsInGenreContainer = false;
            applyGenreFilter();
        }
        // Supprimer immédiatement le container de recherche s'il existe (recherche sans genre)
        const existingSearchContainer = document.getElementById('search-results-container');
        if (existingSearchContainer) {
            existingSearchContainer.remove();
        }
        
        // Réafficher immédiatement les containers d'étoiles
        performSearch('');
        clearButton.style.display = 'none';
    });
    
    // Afficher/masquer le bouton de fermeture selon le contenu
    // ET supprimer le container de recherche si la barre est vidée
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query) {
            clearButton.style.display = 'flex';
        } else {
            clearButton.style.display = 'none';
            // Si la barre est vidée, supprimer immédiatement le container de recherche
            // Utiliser requestAnimationFrame pour une suppression synchrone
            requestAnimationFrame(() => {
                const existingSearchContainer = document.getElementById('search-results-container');
                if (existingSearchContainer) {
                    existingSearchContainer.remove();
                }
                // Réafficher les containers d'étoiles
                performSearch('');
            });
        }
    });
    
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(clearButton);

    // Conteneur pour aligner les trois boutons côte à côte
    const sortBtnContainer = document.createElement('div');
    sortBtnContainer.id = 'sort-btn-container'; // Ajouter un ID pour faciliter la suppression
    sortBtnContainer.style.cssText = 'display: flex; flex-direction: row; align-items: center; gap: 12px; position: sticky; top: 80px; width: fit-content; margin: 2rem auto 0 auto; justify-content: center; z-index: 999; background: rgba(18, 18, 18, 0.98); backdrop-filter: blur(10px); padding: 1rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);';
    
    // Créer un conteneur relatif pour le bouton type et son menu pour qu'il soit positionné correctement
    const typeButtonContainer = document.createElement('div');
    typeButtonContainer.style.cssText = 'position: relative; display: inline-block; z-index: 1001;';
    typeButtonContainer.appendChild(typeButton);
    typeButtonContainer.appendChild(typeMenu);
    
    // Créer un conteneur relatif pour le menu d'ordre pour qu'il soit positionné correctement
    const orderButtonContainer = document.createElement('div');
    orderButtonContainer.style.cssText = 'position: relative; display: inline-block; z-index: 1001;';
    orderButtonContainer.appendChild(orderButton);
    orderButtonContainer.appendChild(orderMenu);
    
    // Ajouter les éléments dans l'ordre
    sortBtnContainer.appendChild(typeButtonContainer);
    sortBtnContainer.appendChild(orderButtonContainer);
    sortBtnContainer.appendChild(sortButton);
    sortBtnContainer.appendChild(searchContainer);

    // Créer le container de genres
    const genreContainer = document.createElement('div');
    genreContainer.id = 'genre-sort-container';
    genreContainer.style.cssText = `
        display: none;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: flex-start;
        align-items: flex-start;
        align-content: flex-start;
        margin: 20px auto 0px auto;
        padding: 12px 12px;
        background: #2a2d36;
        border-radius: 16px;
        border: 2px solid #00b89433;
        width: fit-content;
        max-width: 920px;
        min-height: 120px;
        max-height: 0;
        box-sizing: border-box;
        overflow-x: hidden;
        opacity: 0;
        overflow: hidden;
        transition: opacity 0.35s, margin-bottom 0.35s cubic-bezier(.4,2,.6,1);
        position: relative;
        z-index: 998; // En dessous du header (z-index: 1000) pour qu'il passe en dessous lors du scroll
    `;

    // Liste des genres en noms API (pour filtre) ; affichage traduit via getTranslatedGenreForProfile
    let genres = [
        "Action", "Adventure", "Avant Garde", "Award Winning", "Boys Love", "Comedy", "Drama", "Fantasy", "Girls Love", "Gourmet", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Suspense", "Ecchi", "Erotica", "Hentai", "Adult Cast", "Anthropomorphic", "CGDCT", "Childcare", "Combat Sports", "Crossdressing", "Delinquents", "Detective", "Educational", "Gag Humor", "Gore", "Harem", "High Stakes Game", "Historical", "Idols (Female)", "Idols (Male)", "Isekai", "Iyashikei", "Love Polygon", "Romantic Subtext", "Magical Sex Shift", "Magical Girls", "Martial Arts", "Mecha", "Medical", "Military", "Music", "Mythology", "Organized Crime", "Otaku Culture", "Parody", "Performing Arts", "Pets", "Psychological", "Racing", "Reincarnation", "Reverse Harem", "Samurai", "School", "Showbiz", "Space", "Strategy Game", "Super Power", "Survival", "Team Sports", "Time Travel", "Urban Fantasy", "Vampire", "Video Game", "Villainess", "Visual Arts", "Workplace", "Doujin", "Manhwa", "Manhua"
    ];
    
    // Filtrer les genres interdits pour les mineurs
    if (typeof filterForbiddenGenres === 'function') {
        genres = filterForbiddenGenres(genres);
    }

    genres.forEach(genre => {
        const genreBtn = document.createElement('button');
        genreBtn.textContent = getTranslatedGenreForProfile(genre);
        genreBtn.setAttribute('data-genre', genre);
        genreBtn.style.cssText = `
            background: #2a2d36;
            color: #00b894;
            border: 2px solid #00b894;
            border-radius: 8px;
            padding: 8px 14px;
            font-size: 1.2rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            margin: 0;
            width: fit-content;
            min-width: fit-content;
            max-width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            box-sizing: border-box;
            text-align: center;
            line-height: 1.4;
            display: inline-block;
        `;
        genreContainer.appendChild(genreBtn);
    });
    
    // Au changement de langue : retraduire les libellés des boutons genre
    if (!window._profileGenreLanguageListener) {
        window._profileGenreLanguageListener = true;
        document.addEventListener('languageChanged', function() {
            var container = document.getElementById('genre-sort-container');
            if (!container) return;
            container.querySelectorAll('button[data-genre]').forEach(function(btn) {
                var g = btn.getAttribute('data-genre');
                if (g) btn.textContent = getTranslatedGenreForProfile(g);
            });
        });
    }
    
    // Fonction pour mettre à jour la visibilité des genres selon le type sélectionné (rendue globale)
    window.updateGenresVisibility = function() {
        const mangaSpecificGenres = ['Doujin', 'Manhwa', 'Manhua'];
        const genreContainer = document.getElementById('genre-sort-container');
        if (!genreContainer) return;
        
        const genreButtons = genreContainer.querySelectorAll('button[data-genre]');
        
        genreButtons.forEach(btn => {
            const genreName = btn.getAttribute('data-genre');
            const isMangaSpecific = mangaSpecificGenres.includes(genreName);
            
            // Afficher les genres spécifiques au manga uniquement si le type est "manga"
            if (isMangaSpecific) {
                if (window.selectedType === 'manga') {
                    btn.style.display = '';
                    btn.style.visibility = 'visible';
                } else {
                    btn.style.display = 'none';
                    btn.style.visibility = 'hidden';
                    // Si ce genre était sélectionné, le désélectionner
                    if (Array.isArray(window.selectedGenres) && window.selectedGenres.includes(genreName)) {
                        window.selectedGenres = window.selectedGenres.filter(g => g !== genreName);
                        btn.style.background = '#2a2d36';
                        btn.style.color = '#00b894';
                        btn.style.transform = 'translateY(0)';
                        btn.style.boxShadow = '';
                        btn.style.border = '2px solid #00b894';
                        btn.style.fontWeight = '500';
                        // Réinitialiser l'affichage si plus aucun genre
                        if (window.selectedGenres.length === 0) {
                            const resetBtn = document.getElementById('reset-genre-button');
                            if (resetBtn) resetBtn.style.display = 'none';
                        }
                    }
                }
            }
        });
        
        // Si un genre spécifique au manga était sélectionné et qu'on change de type, les désélectionner
        if (Array.isArray(window.selectedGenres) && window.selectedGenres.some(g => mangaSpecificGenres.includes(g)) && window.selectedType !== 'manga') {
            window.selectedGenres = window.selectedGenres.filter(g => !mangaSpecificGenres.includes(g));
            // Réinitialiser visuellement les boutons désélectionnés
            mangaSpecificGenres.forEach(genreName => {
                const btn = Array.from(genreContainer.querySelectorAll('button[data-genre]'))
                    .find(b => b.getAttribute('data-genre') === genreName);
                if (btn) {
                    btn.style.background = '#2a2d36';
                    btn.style.color = '#00b894';
                    btn.style.transform = 'translateY(0)';
                    btn.style.boxShadow = '';
                    btn.style.border = '2px solid #00b894';
                    btn.style.fontWeight = '500';
                }
            });
            if (typeof applyGenreFilter === 'function') {
                applyGenreFilter();
            }
        }
    };
    
    // Appeler la fonction au chargement initial
    window.updateGenresVisibility();

    // Créer le bouton reset
    const resetButton = document.createElement('button');
    resetButton.id = 'reset-genre-button';
    resetButton.textContent = 'Afficher tous';
    resetButton.style.cssText = `
        background: #ff6b6b;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        margin: 10px auto;
        display: none;
    `;

    // État du conteneur
    let isGenreContainerOpen = false;
    
    // Timer pour fermer automatiquement le conteneur après désélection d'un genre
    let autoCloseTimer = null;
    
    // Variable globale pour stocker les genres sélectionnés - tableau vide par défaut
    window.selectedGenres = [];
    
    // Variable globale pour stocker le contexte d'ajout au top 10
    window.top10Context = {
        genre: [],
        type: null,
        isGenreContext: false
    };
    
    // Pas de restauration de l'état visuel du bouton de genre car genre est toujours null par défaut

    // === Variable globale pour l'ordre de tri des containers de genre ===
    window.genreSortOrder = 'desc';
    
    // Mapping des genres français vers IDs Jikan (même que la page manga-database)
    const genreMapping = {
        'Action': 1,
        'Aventure': 2,
        'Avant-garde': 5,
        'Prix': 46,
        'Boys Love': 28,
        'Comédie': 4,
        'Drame': 8,
        'Fantasy': 10,
        'Girls Love': 26,
        'Gastronomie': 47,
        'Horreur': 14,
        'Mystère': 7,
        'Romance': 22,
        'Science-Fiction': 24,
        'Tranche de vie': 36,
        'Sport': 30,
        'Surnaturel': 37,
        'Suspense': 41,
        'Ecchi': 9,
        'Érotique': 49,
        'Hentai': 12,
        'Casting adulte': 50,
        'Anthropomorphique': 51,
        'CGDCT': 52,
        'Garde d\'enfants': 53,
        'Sport de combat': 54,
        'Travestissement': 81,
        'Délinquants': 55,
        'Détective': 39,
        'Éducatif': 56,
        'Humour gags': 57,
        'Gore': 58,
        'Harem': 35,
        'Jeu à enjeux élevés': 59,
        'Historique': 13,
        'Idoles (Femmes)': 60,
        'Idoles (Hommes)': 61,
        'Isekai': 62,
        'Iyashikei': 63,
        'Polygone amoureux': 64,
        'Statut amoureux': 65,
        'Changement de sexe magique': 66,
        'Magical Girl': 66,
        'Arts martiaux': 17,
        'Mecha': 18,
        'Médical': 67,
        'Militaire': 38,
        'Musique': 19,
        'Mythologie': 20,
        'Crime organisé': 40,
        'Culture Otaku': 68,
        'Parodie': 69,
        'Arts du spectacle': 70,
        'Animaux': 71,
        'Psychologique': 40,
        'Course': 3,
        'Réincarnation': 72,
        'Harem inversé': 69,
        'Samouraï': 21,
        'École': 23,
        'Showbiz': 73,
        'Espace': 29,
        'Jeu de stratégie': 11,
        'Super pouvoir': 31,
        'Survie': 74,
        'Sport d\'équipe': 75,
        'Voyage temporel': 76,
        'Fantasy urbaine': 77,
        'Vampire': 32,
        'Jeu vidéo': 11,
        'Villainess': 78,
        'Arts visuels': 79,
        'Lieu de travail': 80
    };

    // Après avoir inséré le bouton dans le DOM, attache le gestionnaire de clic avec addEventListener
    console.log('Attachement du bouton Trier par genre');
    sortButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Vérifier si le container de recherche est actif
        const searchResultsContainer = document.getElementById('search-results-container');
        if (searchResultsContainer && searchResultsContainer.style.display !== 'none') {
            // Ne pas permettre l'ouverture du container de genres si la recherche est active
            console.log('Le tri par genre est désactivé pendant la recherche');
            return;
        }
        
        // Fermer tous les autres menus d'abord
        if (typeMenu) typeMenu.style.display = 'none';
        if (orderMenu) orderMenu.style.display = 'none';
        
        console.log('Bouton Trier par genre cliqué, état actuel isGenreContainerOpen:', isGenreContainerOpen);
        isGenreContainerOpen = !isGenreContainerOpen;
        console.log('Nouvel état isGenreContainerOpen:', isGenreContainerOpen);
        
        const genreContainer = document.getElementById('genre-sort-container');
        
        if (!genreContainer) {
            console.error('genre-sort-container non trouvé');
            return;
        }
        
        // S'assurer que le conteneur principal garde sa largeur maximale
        const reviewsSection = document.getElementById('reviews-section');
        if (reviewsSection) {
            reviewsSection.style.maxWidth = '1600px';
            reviewsSection.style.overflow = 'hidden';
            reviewsSection.style.boxSizing = 'border-box';
        }
        
        if (isGenreContainerOpen) {
            // Masquer temporairement le conteneur filtré si présent pour permettre la sélection
            const genreFilteredContainer = document.getElementById('genre-filtered-container');
            if (genreFilteredContainer) {
                genreFilteredContainer.style.display = 'none';
            }
            
            genreContainer.classList.add('open');
            sortButton.classList.add('genre-open');
            // Réactiver la transition pour l'ouverture
            genreContainer.style.transition = 'opacity 0.35s, margin-bottom 0.35s cubic-bezier(.4,2,.6,1)';
            genreContainer.style.visibility = 'visible';
            genreContainer.style.display = 'flex';
            genreContainer.style.flexWrap = 'wrap';
            genreContainer.style.justifyContent = 'flex-start';
            genreContainer.style.alignItems = 'flex-start';
            genreContainer.style.alignContent = 'flex-start';
            genreContainer.style.gap = '10px';
            genreContainer.style.opacity = '1';
            genreContainer.style.maxHeight = '50000px';
            genreContainer.style.marginBottom = '110px';
            genreContainer.style.padding = '12px 12px';
            // Largeur adaptée au contenu avec limite maximale
            genreContainer.style.width = 'fit-content';
            genreContainer.style.maxWidth = '920px';
            genreContainer.style.marginLeft = 'auto';
            genreContainer.style.marginRight = 'auto';
            genreContainer.style.boxSizing = 'border-box';
            genreContainer.style.overflow = 'hidden';
            genreContainer.style.zIndex = '998'; // En dessous du header (z-index: 1000) pour qu'il passe en dessous lors du scroll
            // Le conteneur ne doit PAS être sticky pour qu'il passe en dessous du header lors du scroll
            genreContainer.style.position = 'relative'; // Position relative normale (pas sticky)
            genreContainer.style.top = ''; // Pas de top fixe
            genreContainer.style.background = '#2a2d36';
            genreContainer.style.backdropFilter = 'blur(10px)';
            genreContainer.style.borderRadius = '16px';
            genreContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
        } else {
            // Annuler le timer de fermeture automatique si le conteneur est fermé manuellement
            if (autoCloseTimer) {
                clearTimeout(autoCloseTimer);
                autoCloseTimer = null;
            }
            
            genreContainer.classList.remove('open');
            sortButton.classList.remove('genre-open');
            genreContainer.style.display = 'none';
            genreContainer.style.opacity = '0';
            genreContainer.style.maxHeight = '0';
            genreContainer.style.marginBottom = '0';
            genreContainer.style.visibility = 'hidden';
            // Réinitialiser le positionnement sticky quand le conteneur est fermé
            genreContainer.style.position = 'relative';
            genreContainer.style.top = '';
            
            // Si des genres sont toujours sélectionnés, réafficher le conteneur filtré
            const selectedGenres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
            if (selectedGenres.length > 0) {
                const genreFilteredContainer = document.getElementById('genre-filtered-container');
                if (genreFilteredContainer) {
                    // Réafficher le conteneur filtré après un court délai pour permettre la fermeture du conteneur de sélection
                    setTimeout(() => {
                        genreFilteredContainer.style.display = 'block';
                        console.log('✅ Conteneur filtré réaffiché car genres toujours sélectionnés:', selectedGenres);
                    }, 100);
                }
            }
        }
        console.log('Toggle genre container, open:', isGenreContainerOpen);
    });

    // Gestion des clics sur les boutons de genre
    genreContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && e.target !== resetButton) {
            const genre = e.target.textContent;
            const genreBtn = e.target;
            
            // Définir les genres "type" (un seul peut être sélectionné)
            const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
            const isTypeGenre = typeGenres.includes(genre);
            
            // Initialiser selectedGenres s'il n'existe pas
            if (!Array.isArray(window.selectedGenres)) {
                window.selectedGenres = [];
            }
            
            // Vérifier si le genre est déjà sélectionné
            const isSelected = window.selectedGenres.includes(genre);
            
            if (isSelected) {
                // Désélectionner le genre
                window.selectedGenres = window.selectedGenres.filter(g => g !== genre);
                genreBtn.style.background = '#2a2d36';
                genreBtn.style.color = '#00b894';
                genreBtn.style.transform = 'translateY(0)';
                genreBtn.style.boxShadow = '';
                genreBtn.style.border = '2px solid #00b894';
                genreBtn.style.fontWeight = '500';
                
                // Si plus aucun genre n'est sélectionné, fermer le conteneur après 3 secondes
                if (window.selectedGenres.length === 0) {
                    // Annuler le timer précédent s'il existe
                    if (autoCloseTimer) {
                        clearTimeout(autoCloseTimer);
                        autoCloseTimer = null;
                    }
                    
                    // Lancer un nouveau timer de 3 secondes
                    autoCloseTimer = setTimeout(() => {
                        // Vérifier qu'aucun genre n'a été sélectionné entre-temps
                        if (window.selectedGenres.length === 0 && isGenreContainerOpen) {
                            console.log('⏰ Fermeture automatique du conteneur de genres après 3 secondes sans sélection');
                            isGenreContainerOpen = false;
                            genreContainer.classList.remove('open');
                            sortButton.classList.remove('genre-open');
                            genreContainer.style.transition = 'opacity 0.35s, margin-bottom 0.35s cubic-bezier(.4,2,.6,1)';
                            genreContainer.style.display = 'none';
                            genreContainer.style.opacity = '0';
                            genreContainer.style.maxHeight = '0';
                            genreContainer.style.marginBottom = '0';
                            genreContainer.style.visibility = 'hidden';
                        }
                        autoCloseTimer = null;
                    }, 3000); // 3 secondes
                } else {
                    // Si d'autres genres sont encore sélectionnés, annuler le timer de fermeture
                    if (autoCloseTimer) {
                        clearTimeout(autoCloseTimer);
                        autoCloseTimer = null;
                    }
                }
            } else {
                // Annuler le timer de fermeture automatique car un nouveau genre est sélectionné
                if (autoCloseTimer) {
                    clearTimeout(autoCloseTimer);
                    autoCloseTimer = null;
                }
                // Vérifier s'il y a actuellement un genre "type" sélectionné
                const currentTypeGenres = window.selectedGenres.filter(g => typeGenres.includes(g));
                const hasTypeGenre = currentTypeGenres.length > 0;
                
                if (isTypeGenre) {
                    // Si on sélectionne un genre "type"
                    // Remplacer le genre "type" précédent s'il existe
                    const otherTypeGenres = window.selectedGenres.filter(g => typeGenres.includes(g));
                    otherTypeGenres.forEach(otherGenre => {
                        window.selectedGenres = window.selectedGenres.filter(g => g !== otherGenre);
                        // Mettre à jour visuellement les boutons désélectionnés
                        const otherBtn = Array.from(genreContainer.querySelectorAll('button[data-genre]'))
                            .find(btn => btn.textContent === otherGenre);
                        if (otherBtn) {
                            otherBtn.style.background = '#2a2d36';
                            otherBtn.style.color = '#00b894';
                            otherBtn.style.transform = 'translateY(0)';
                            otherBtn.style.boxShadow = '';
                            otherBtn.style.border = '2px solid #00b894';
                            otherBtn.style.fontWeight = '500';
                        }
                    });
                    
                    // Ajouter le nouveau genre "type"
                    window.selectedGenres.push(genre);
                } else {
                    // Si on sélectionne un genre normal (non "type")
                    if (hasTypeGenre) {
                        // Il y a déjà un genre "type" sélectionné
                        // On peut avoir genre "type" + 1 autre genre max
                        // Si un autre genre normal est déjà sélectionné, le remplacer
                        const otherNormalGenres = window.selectedGenres.filter(g => !typeGenres.includes(g));
                        if (otherNormalGenres.length > 0) {
                            // Remplacer l'autre genre normal
                            otherNormalGenres.forEach(otherGenre => {
                                window.selectedGenres = window.selectedGenres.filter(g => g !== otherGenre);
                                // Mettre à jour visuellement le bouton désélectionné
                                const otherBtn = Array.from(genreContainer.querySelectorAll('button[data-genre]'))
                                    .find(btn => btn.textContent === otherGenre);
                                if (otherBtn) {
                                    otherBtn.style.background = '#2a2d36';
                                    otherBtn.style.color = '#00b894';
                                    otherBtn.style.transform = 'translateY(0)';
                                    otherBtn.style.boxShadow = '';
                                    otherBtn.style.border = '2px solid #00b894';
                                    otherBtn.style.fontWeight = '500';
                                }
                            });
                        }
                        // Ajouter le nouveau genre normal
                        window.selectedGenres.push(genre);
                    } else {
                        // Pas de genre "type" sélectionné : comportement normal (un seul genre)
                        // Désélectionner tous les autres genres
                        const previouslySelectedGenres = [...window.selectedGenres];
                        previouslySelectedGenres.forEach(otherGenre => {
                            // Mettre à jour visuellement les boutons désélectionnés
                            const otherBtn = Array.from(genreContainer.querySelectorAll('button[data-genre]'))
                                .find(btn => btn.textContent === otherGenre);
                            if (otherBtn) {
                                otherBtn.style.background = '#2a2d36';
                                otherBtn.style.color = '#00b894';
                                otherBtn.style.transform = 'translateY(0)';
                                otherBtn.style.boxShadow = '';
                                otherBtn.style.border = '2px solid #00b894';
                                otherBtn.style.fontWeight = '500';
                            }
                        });
                        // Réinitialiser et ajouter uniquement le nouveau genre
                        window.selectedGenres = [genre];
                    }
                }
                
                // Mettre en évidence le bouton sélectionné
                genreBtn.style.background = '#00b894';
                genreBtn.style.color = 'white';
                genreBtn.style.transform = 'translateY(-2px)';
                genreBtn.style.boxShadow = '0 4px 12px rgba(0, 184, 148, 0.4)';
                genreBtn.style.border = '2px solid #00b894';
                genreBtn.style.fontWeight = 'bold';
            }
            
            // Appliquer le filtre par genre
            if (window.selectedGenres.length === 0) {
                // Aucun genre sélectionné, réinitialiser
                resetButton.style.display = 'none';
                // Réactiver le bouton type
                if (typeof updateTypeButtonState === 'function') {
                    updateTypeButtonState();
                }
            } else {
                // Afficher le bouton reset
                resetButton.style.display = 'block';
                // Désactiver le bouton type
                if (typeof updateTypeButtonState === 'function') {
                    updateTypeButtonState();
                }
            }
            
            // Fermer le conteneur de genres après sélection (sauf si c'est une désélection)
            if (!isSelected) {
                isGenreContainerOpen = false;
                genreContainer.classList.remove('open');
                sortButton.classList.remove('genre-open');
                // Fermeture immédiate sans transition
                genreContainer.style.transition = 'none';
                genreContainer.style.display = 'none';
                genreContainer.style.opacity = '0';
                genreContainer.style.maxHeight = '0';
                genreContainer.style.marginBottom = '0';
                genreContainer.style.visibility = 'hidden';
                // Réactiver la transition après un court délai
                setTimeout(() => {
                    genreContainer.style.transition = 'opacity 0.35s, margin-bottom 0.35s cubic-bezier(.4,2,.6,1)';
                }, 50);
            }
            
            // Appliquer le filtre et mettre à jour
            applyGenreFilter();
            renderTop10Slots();
            updateOrderMenuContext();
            // Mettre à jour l'état du bouton type
            updateTypeButtonState();
        }
    });

    // Logique pour le bouton reset
    resetButton.onclick = () => {
        // Annuler le timer de fermeture automatique
        if (autoCloseTimer) {
            clearTimeout(autoCloseTimer);
            autoCloseTimer = null;
        }
        
        // Réinitialiser les genres sélectionnés
        window.selectedGenres = [];
        // Ne plus supprimer de localStorage car on ne sauvegarde plus
        // Réinitialiser tous les boutons de genre visuellement
        document.querySelectorAll('#genre-sort-container button').forEach(btn => {
            btn.style.background = '#2a2d36';
            btn.style.color = '#00b894';
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '';
            btn.style.border = '2px solid #00b894';
            btn.style.fontWeight = '500';
        });
        // Réactiver le bouton type
        if (typeof updateTypeButtonState === 'function') {
            updateTypeButtonState();
        }
        // Appliquer le filtre (afficher toutes les cards)
        applyGenreFilter();
        // Réinitialiser tous les boutons de genre
        document.querySelectorAll('#genre-sort-container button').forEach(btn => {
            btn.style.background = '#2a2d36';
            btn.style.color = '#00b894';
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '';
        });
        // Masquer le bouton reset
        resetButton.style.display = 'none';
        // Ajout : réinitialise le top 10 global
        renderTop10Slots();
        updateOrderMenuContext(); // <-- Ajout ici
    };

    // Le bouton doit être inséré AVANT le conteneur de tous les groupes d'étoiles,
    // et non à l'intérieur de celui-ci.
    const allStarContainers = reviewsSection.querySelector('.all-star-containers');

    if (allStarContainers) {
        // Insérer le conteneur de boutons (ordre + genre) avant le bloc des évaluations
        allStarContainers.parentNode.insertBefore(sortBtnContainer, allStarContainers);
        allStarContainers.parentNode.insertBefore(genreContainer, allStarContainers);
    } else {
        // Fallback si aucun groupe d'étoiles n'existe encore
        const top10list = reviewsSection.querySelector('.card-list');
        if (top10list) {
             top10list.parentNode.insertBefore(sortBtnContainer, top10list);
             top10list.parentNode.insertBefore(genreContainer, top10list);
        } else {
            reviewsSection.appendChild(sortBtnContainer);
            reviewsSection.appendChild(genreContainer);
        }
    }

    // Diagnostic : log la position dans le DOM
    console.log('sortButton:', sortButton);
    console.log('genreContainer:', genreContainer);
    console.log('sortButton nextSibling:', sortButton.nextSibling);

    // Fonction pour fermer tous les menus déroulants (sauf le conteneur de genres)
    function closeAllMenus() {
        // Fermer le menu type en utilisant l'ID pour éviter les problèmes de portée
        const typeMenuEl = document.getElementById('filter-by-type-menu');
        if (typeMenuEl) {
            typeMenuEl.style.display = 'none';
        }
        // Fermer le menu ordre en utilisant l'ID
        const orderMenuEl = document.getElementById('order-desc-menu');
        if (orderMenuEl) {
            orderMenuEl.style.display = 'none';
        }
        // NE PAS fermer le conteneur de genres - il reste ouvert comme avant
        
        // Fermer tous les menus "..." des cartes
        document.querySelectorAll('.card-more-menu, .dropdown-menu').forEach(menu => {
            menu.style.display = 'none';
            menu.style.opacity = '0';
            menu.style.pointerEvents = 'none';
            menu.style.visibility = 'hidden';
        });
        
        // Ne pas fermer les popups du top 10 au clic ailleurs - ils doivent rester ouverts
        // Le popup ne se ferme que via le bouton "Annuler"
        // const top10MiniInterface = document.querySelector('.top10-mini-interface');
        // if (top10MiniInterface) {
        //     top10MiniInterface.remove();
        // }
    }

    // Gestion du menu déroulant du bouton ordre décroissant
    orderButton.addEventListener('click', function(e) {
        e.stopPropagation();
        const isCurrentlyOpen = orderMenu.style.display !== 'none' && orderMenu.style.display !== '';
        // Fermer tous les autres menus d'abord
        closeAllMenus();
        // Puis ouvrir/fermer le menu ordre
        if (!isCurrentlyOpen) {
            orderMenu.style.display = 'block';
        }
    });
    // Gestionnaire global pour fermer les menus au clic ailleurs et au scroll
    // Utiliser un seul gestionnaire pour éviter les conflits
    if (!window.menuCloseHandlerAdded) {
        // Fermer tous les menus au clic ailleurs
        document.addEventListener('click', function(e) {
            // Récupérer les éléments par ID pour éviter les problèmes de portée
            const typeButtonEl = document.getElementById('filter-by-type-btn');
            const typeMenuEl = document.getElementById('filter-by-type-menu');
            const orderButtonEl = document.getElementById('order-desc-btn');
            const orderMenuEl = document.getElementById('order-desc-menu');
            const sortButtonEl = document.getElementById('sort-btn');
            
            // Vérifier si le clic est sur un bouton ou dans un menu
            const isOnOrderButton = orderButtonEl && (orderButtonEl.contains(e.target) || e.target === orderButtonEl);
            const isOnTypeButton = typeButtonEl && (typeButtonEl.contains(e.target) || e.target === typeButtonEl);
            const isInOrderMenu = orderMenuEl && orderMenuEl.contains(e.target);
            const isInTypeMenu = typeMenuEl && typeMenuEl.contains(e.target);
            const isOnTypeMenuItem = e.target.closest('.type-menu-item');
            const isInGenreContainer = document.getElementById('genre-sort-container')?.contains(e.target);
            const isOnGenreButton = sortButtonEl && (sortButtonEl.contains(e.target) || e.target === sortButtonEl);
            const clickEl = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentElement);
            const isInMoreMenu = clickEl && clickEl.closest && clickEl.closest('.card-more-menu, .dropdown-menu');
            const isOnMoreButton = clickEl && clickEl.closest && clickEl.closest('.card-more-btn, .more-button, .card-more-button');
            const isInTop10Interface = clickEl && clickEl.closest && clickEl.closest('.top10-mini-interface');
            
            // Si le clic n'est sur aucun élément de menu, fermer tous les menus (sauf genres)
            if (!isOnOrderButton && !isOnTypeButton && !isInOrderMenu && !isInTypeMenu && !isOnTypeMenuItem &&
                !isInGenreContainer && !isOnGenreButton && !isInMoreMenu && !isOnMoreButton && !isInTop10Interface) {
                // Fermer le menu type explicitement
                if (typeMenuEl) {
                    typeMenuEl.style.display = 'none';
                }
                // Fermer le menu ordre explicitement
                if (orderMenuEl) {
                    orderMenuEl.style.display = 'none';
                }
                // Fermer les autres menus
                closeAllMenus();
            }
        }, true); // Utiliser capture pour être prioritaire
        
        // Fermer tous les menus au scroll (sauf le conteneur de genres)
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            // Utiliser un debounce pour éviter de fermer trop souvent
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                // Fermer le menu type explicitement
                const typeMenuEl = document.getElementById('filter-by-type-menu');
                if (typeMenuEl && typeMenuEl.style.display !== 'none') {
                    typeMenuEl.style.display = 'none';
                }
                // Fermer le menu ordre explicitement
                const orderMenuEl = document.getElementById('order-desc-menu');
                if (orderMenuEl && orderMenuEl.style.display !== 'none') {
                    orderMenuEl.style.display = 'none';
                }
                // Fermer les autres menus (menus "...")
                document.querySelectorAll('.card-more-menu, .dropdown-menu').forEach(menu => {
                    if (menu.style.display !== 'none') {
                        menu.style.display = 'none';
                        menu.style.opacity = '0';
                        menu.style.pointerEvents = 'none';
                        menu.style.visibility = 'hidden';
                    }
                });
                // Ne pas fermer les popups du top 10 au scroll - ils doivent rester ouverts
                // const top10MiniInterface = document.querySelector('.top10-mini-interface');
                // if (top10MiniInterface) {
                //     top10MiniInterface.remove();
                // }
            }, 100);
        }, { passive: true });
        
        window.menuCloseHandlerAdded = true;
    }

    // Fonction pour activer/désactiver le bouton type selon les genres sélectionnés
    function updateTypeButtonState() {
        const hasSelectedGenres = Array.isArray(window.selectedGenres) && window.selectedGenres.length > 0;
        if (hasSelectedGenres) {
            // Désactiver le bouton type quand un genre est sélectionné
            typeButton.style.opacity = '0.5';
            typeButton.style.cursor = 'not-allowed';
            typeButton.style.pointerEvents = 'none';
            typeButton.title = 'Impossible de changer le type pendant qu\'un genre est sélectionné';
        } else {
            // Réactiver le bouton type quand aucun genre n'est sélectionné
            typeButton.style.opacity = '1';
            typeButton.style.cursor = 'pointer';
            typeButton.style.pointerEvents = 'auto';
            typeButton.title = '';
        }
    }
    
    // Gestion du menu déroulant du bouton filtrage par type
    typeButton.addEventListener('click', function(e) {
        // Empêcher le clic si un genre est sélectionné
        const hasSelectedGenres = Array.isArray(window.selectedGenres) && window.selectedGenres.length > 0;
        if (hasSelectedGenres) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log('⚠️ Impossible de changer le type pendant qu\'un genre est sélectionné');
            return;
        }
        
        e.stopPropagation();
        e.stopImmediatePropagation(); // Empêcher les autres gestionnaires
        const isCurrentlyOpen = typeMenu.style.display !== 'none' && typeMenu.style.display !== '';
        // Fermer tous les autres menus d'abord
        closeAllMenus();
        // Puis ouvrir/fermer le menu type
        if (!isCurrentlyOpen) {
            typeMenu.style.display = 'block';
        } else {
            typeMenu.style.display = 'none';
        }
    });
    // Gestion des choix du menu
    orderMenu.querySelectorAll('.order-menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            orderMenu.style.display = 'none';
            // Met à jour l'ordre sélectionné
            currentOrder = item.dataset.order;
            if (orderButton.dataset) orderButton.dataset.order = currentOrder;
            // Met à jour le texte du bouton
            switch(currentOrder) {
                case 'desc':
                    orderButton.textContent = _profileT('profile.order_desc');
                    break;
                case 'asc':
                    orderButton.textContent = _profileT('profile.order_asc');
                    break;
            }
            // Met à jour le style des options
            orderMenu.querySelectorAll('.order-menu-item').forEach(opt => {
                if(opt.dataset.order === currentOrder) {
                    opt.style.background = '#00b89422';
                    opt.style.color = '#00b894';
                    opt.style.fontWeight = 'bold';
                } else {
                    opt.style.background = '';
                    opt.style.color = '';
                    opt.style.fontWeight = '';
                }
            });
            // Ici tu peux mettre la logique de tri selon item.dataset.order
            console.log('Tri sélectionné :', item.dataset.order);
            // Appliquer le tri sur les containers d'étoiles seulement pour ordre décroissant/croissant
            if (item.dataset.order === 'desc' || item.dataset.order === 'asc') {
                sortStarContainers(item.dataset.order);
            }
            // Pour les options d'ajout, on ne réorganise pas les containers, seulement les cartes à l'intérieur
        });
    });

    // Gestion des choix du menu de type
    typeMenu.querySelectorAll('.type-menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // Empêcher le clic si un genre est sélectionné
            const hasSelectedGenres = Array.isArray(window.selectedGenres) && window.selectedGenres.length > 0;
            if (hasSelectedGenres) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('⚠️ Impossible de changer le type pendant qu\'un genre est sélectionné');
                // Fermer le menu type
                const typeMenuEl = document.getElementById('filter-by-type-menu');
                if (typeMenuEl) {
                    typeMenuEl.style.display = 'none';
                }
                return;
            }
            
            e.stopPropagation();
            e.stopImmediatePropagation();
            // Fermer le menu type explicitement
            const typeMenuEl = document.getElementById('filter-by-type-menu');
            if (typeMenuEl) {
                typeMenuEl.style.display = 'none';
            }
            // Met à jour le type sélectionné
            const type = item.dataset.type;
            window.selectedType = type;
            // Ne plus sauvegarder dans localStorage car on veut toujours revenir au défaut
            // Met à jour le texte du bouton
            typeButton.textContent = item.textContent;
            // Met à jour le style des options
            typeMenu.querySelectorAll('.type-menu-item').forEach(opt => {
                if(opt.dataset.type === type) {
                    opt.style.background = '#00b89422';
                    opt.style.color = '#00b894';
                    opt.style.fontWeight = 'bold';
                } else {
                    opt.style.background = '';
                    opt.style.color = '';
                    opt.style.fontWeight = '';
                }
            });
            // Mettre à jour la visibilité des genres selon le type
            updateGenresVisibility();
            // Appliquer le filtre par type
            applyTypeFilter();
            // Mettre à jour l'état du bouton type (au cas où)
            updateTypeButtonState();
            // Ancienne barre de recherche désactivée
            // Si une recherche est active, la relancer avec le nouveau type
            // if (searchInput && searchInput.value.trim()) {
            //     performSearch(searchInput.value.trim());
            // }
        });
    });
    
    // Appeler updateTypeButtonState au chargement initial
    updateTypeButtonState();

    // Fonction de recherche avec tri par pertinence - DÉSACTIVÉE
    // Cette fonction a été désactivée car elle créait un conteneur de résultats en décalé
    // La nouvelle barre de recherche dans le header est utilisée à la place
    function performSearch(query) {
        // Vérifier d'abord si la recherche est vide AVANT toute opération
        if (!query || query.trim() === '' || window.isSearchCleared) {
            // Supprimer immédiatement tout conteneur de résultats existant (synchrone)
            let searchResultsContainer = document.getElementById('search-results-container');
            if (searchResultsContainer) {
                searchResultsContainer.remove();
            }
            
            // Double vérification après un court délai
            setTimeout(() => {
                searchResultsContainer = document.getElementById('search-results-container');
                if (searchResultsContainer) {
                    searchResultsContainer.remove();
                }
            }, 100);
            
            // Réafficher les containers d'étoiles SEULEMENT si aucun genre n'est sélectionné
            // (tant qu'un genre est sélectionné, on garde la vue genre sans les étoiles)
            const hasGenreSelected = Array.isArray(window.selectedGenres) && window.selectedGenres.length > 0;
            if (!hasGenreSelected) {
                const allContainers = document.querySelector('.all-star-containers');
                if (allContainers) {
                    allContainers.style.display = '';
                }
                const starGroups = document.querySelectorAll('.star-rating-group');
                starGroups.forEach(group => {
                    group.style.display = '';
                });
            }
            
            // Réafficher le container de genres filtrés s'il était visible (genre sélectionné)
            const genreFilteredContainer = document.getElementById('genre-filtered-container');
            if (genreFilteredContainer && window.selectedGenres && window.selectedGenres.length > 0) {
                genreFilteredContainer.style.display = '';
            }
            
            // Réafficher aussi le container de sélection de genres (genre-sort-container) s'il était ouvert
            const genreSortContainer = document.getElementById('genre-sort-container');
            if (genreSortContainer && isGenreContainerOpen) {
                genreSortContainer.style.display = 'flex';
            }
            
            // Réactiver le bouton "Trier par genre"
            const sortBtn = document.getElementById('sort-by-genre-btn');
            if (sortBtn) {
                sortBtn.style.opacity = '1';
                sortBtn.style.cursor = 'pointer';
                sortBtn.style.pointerEvents = 'auto';
            }
            
            return;
        }
        
        // Vérifier le flag avant de créer un nouveau container
        if (window.isSearchCleared) {
            return; // Ne pas créer de container si la recherche a été vidée
        }
        
        // Supprimer immédiatement tout conteneur de résultats existant avant de créer un nouveau
        const searchResultsContainer = document.getElementById('search-results-container');
        if (searchResultsContainer) {
            searchResultsContainer.remove();
        }
        
        // Masquer les containers d'étoiles normaux pendant la recherche
        const allContainers = document.querySelector('.all-star-containers');
        if (allContainers) {
            allContainers.style.display = 'none';
        }
        
        // Ne pas masquer le container de genres filtrés si un genre est sélectionné :
        // on affichera les résultats de recherche DEDANS (même container) pour que le bouton "..." marche
        const hasGenreSelected = Array.isArray(window.selectedGenres) && window.selectedGenres.length > 0;
        const genreFilteredContainer = document.getElementById('genre-filtered-container');
        if (genreFilteredContainer && !hasGenreSelected) {
            genreFilteredContainer.style.display = 'none';
        }
        
        // Masquer aussi le container de sélection de genres (genre-sort-container)
        const genreSortContainer = document.getElementById('genre-sort-container');
        if (genreSortContainer) {
            genreSortContainer.style.display = 'none';
            // Fermer le container de genres s'il était ouvert
            isGenreContainerOpen = false;
            const sortBtn = document.getElementById('sort-by-genre-btn');
            if (sortBtn) {
                sortBtn.classList.remove('genre-open');
            }
        }
        
        // Désactiver le bouton "Trier par genre" pendant la recherche
        const sortBtn = document.getElementById('sort-by-genre-btn');
        if (sortBtn) {
            sortBtn.style.opacity = '0.5';
            sortBtn.style.cursor = 'not-allowed';
            sortBtn.style.pointerEvents = 'none';
        }
        
        // Charger les notes de l'utilisateur (Firebase en priorité)
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user || !user.email) return;
        
        // Charger les notes de manière asynchrone
        let notes = [];
        (async () => {
            notes = await loadUserNotes(user.email);
            
            // Continuer avec le filtrage et l'affichage une fois les notes chargées
            performSearchWithNotes(notes, query, user);
        })();
        
        // Fonction pour effectuer la recherche avec les notes chargées
        function performSearchWithNotes(notes, query, user) {
            // Filtrer les notes selon la requête de recherche et le type sélectionné
        const queryLower = query.toLowerCase().trim();
        const selectedType = window.selectedType || 'tous';
        
        // Fonction pour normaliser le type
        const normalizeType = (type) => {
            if (!type) return null;
            const lowerType = type.toLowerCase();
            if (['tv', 'movie', 'ova', 'ona', 'special', 'music'].includes(lowerType)) {
                return 'anime';
            }
            return lowerType;
        };
        
        const selectedGenresForSearch = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
        
        // Filtrer par type et par recherche (et par genre si un genre est sélectionné)
        let filteredNotes = notes.filter(note => {
            // Filtrer par type si un type est sélectionné
            if (selectedType && selectedType !== 'tous') {
                const noteType = normalizeType(note.contentType || note.type);
                const normalizedSelectedType = normalizeType(selectedType);
                // Type strict : manga = uniquement manga ; manhwa/manhua/doujin n'apparaissent que si leur type est sélectionné
                const typeMatch = noteType === normalizedSelectedType;
                if (!typeMatch) {
                    return false;
                }
            }
            
            // Si un ou des genres sont sélectionnés, ne garder que les notes qui correspondent à ces genres
            if (selectedGenresForSearch.length > 0) {
                const noteGenres = (note.genres || []).map(g => {
                    if (typeof g === 'object' && g !== null && (g.name || g.genre || g.title)) {
                        return String(g.name || g.genre || g.title).toLowerCase().trim();
                    }
                    return String(g).toLowerCase().trim();
                }).filter(s => s && s !== 'genre inconnu' && s !== 'unknown');
                const noteType = (note.contentType || note.type || '').toLowerCase().trim();
                for (const sg of selectedGenresForSearch) {
                    const sgLower = sg.toLowerCase().trim();
                    if (sgLower === 'doujin' || sgLower === 'manhwa' || sgLower === 'manhua') {
                        if (noteType !== sgLower) return false;
                    } else {
                        const match = noteGenres.some(ng => ng === sgLower || ng.includes(sgLower) || sgLower.includes(ng));
                        if (!match) return false;
                    }
                }
            }
            
            // Filtrer par recherche avec recherche floue (fuzzy search)
            
            // Dictionnaire d'alias pour les séries connues (Food Wars = Shokugeki no Souma)
            const titleAliases = {
                'food wars': ['shokugeki', 'souma', 'soma'],
                'shokugeki': ['food wars', 'souma', 'soma'],
                'souma': ['food wars', 'shokugeki'],
                'soma': ['food wars', 'shokugeki']
            };
            
            // Fonction pour obtenir les alias d'un terme de recherche
            const getAliases = (query) => {
                const queryLower = query.toLowerCase();
                const aliases = [];
                for (const [key, values] of Object.entries(titleAliases)) {
                    if (queryLower.includes(key)) {
                        aliases.push(...values);
                    }
                    // Vérifier aussi si un alias est dans la requête
                    for (const alias of values) {
                        if (queryLower.includes(alias)) {
                            aliases.push(key, ...values.filter(v => v !== alias));
                        }
                    }
                }
                return [...new Set(aliases)]; // Supprimer les doublons
            };
            
            // Normaliser le texte pour ignorer la ponctuation et les caractères spéciaux
            const normalizeText = (text) => {
                if (!text) return '';
                return String(text).toLowerCase()
                    .normalize('NFD') // Décompose les caractères accentués
                    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
                    .replace(/[^\w\s]/g, ' ') // Remplace la ponctuation par des espaces
                    .replace(/\s+/g, ' ') // Normalise les espaces multiples
                    .trim();
            };
            
            // Fonction de similarité simple (distance de Levenshtein simplifiée)
            const calculateSimilarity = (str1, str2) => {
                if (!str1 || !str2) return 0;
                const longer = str1.length > str2.length ? str1 : str2;
                const shorter = str1.length > str2.length ? str2 : str1;
                if (longer.length === 0) return 1.0;
                
                // Si la chaîne courte est contenue dans la longue, similarité élevée
                if (longer.includes(shorter)) return 0.8;
                
                // Calculer le nombre de caractères communs
                let matches = 0;
                for (let i = 0; i < shorter.length; i++) {
                    if (longer.includes(shorter[i])) matches++;
                }
                return matches / longer.length;
            };
            
            // Fonction pour vérifier si un mot est similaire à un mot dans le texte
            const wordSimilarity = (word, text) => {
                const words = text.split(/\s+/);
                for (const textWord of words) {
                    // Correspondance exacte
                    if (textWord === word) return true;
                    // Correspondance partielle (le mot contient le texte ou vice versa)
                    if (textWord.includes(word) || word.includes(textWord)) return true;
                    // Similarité élevée (au moins 70% de caractères communs)
                    if (calculateSimilarity(word, textWord) > 0.7) return true;
                }
                return false;
            };
            
            // Récupérer tous les champs de titre possibles
            const titleFields = [
                note.title,
                note.titleEnglish,
                note.titre,
                note.name
            ].filter(f => f); // Filtrer les valeurs null/undefined
            
            // Normaliser tous les titres
            const normalizedTitles = titleFields.map(f => normalizeText(f));
            const title = normalizedTitles.join(' '); // Combiner tous les titres normalisés
            const synopsis = normalizeText(note.synopsis || '');
            const normalizedQuery = normalizeText(queryLower);
            
            // Récupérer les titres originaux pour recherche floue
            const originalTitleFields = [
                note.title || '',
                note.titleEnglish || '',
                note.titre || '',
                note.name || ''
            ].filter(f => f);
            const originalTitleCombined = originalTitleFields.join(' ').toLowerCase();
            const originalSynopsis = (note.synopsis || '').toLowerCase();
            
            // Si la requête contient plusieurs mots, vérifier que tous les mots sont présents
            const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
            
            if (queryWords.length === 0) {
                return true; // Si pas de mots, tout afficher
            }
            
            // Obtenir les alias pour la requête complète et chaque mot
            const queryAliases = getAliases(normalizedQuery);
            const allSearchTerms = [...new Set([...queryWords, ...queryAliases])];
            
            // Recherche flexible : au moins 70% des mots doivent correspondre (au lieu de 100%)
            const minWordsMatch = Math.ceil(queryWords.length * 0.7); // Au moins 70% des mots
            let matchedWords = 0;
            
            // Vérifier chaque mot de la requête originale
            for (const word of queryWords) {
                let wordFound = false;
                
                // Recherche exacte dans les titres normalisés
                const exactInNormalizedTitle = title.includes(word);
                const exactInNormalizedSynopsis = synopsis.includes(word);
                
                // Recherche exacte dans les titres originaux
                const exactInOriginalTitle = originalTitleCombined.includes(word);
                const exactInOriginalSynopsis = originalSynopsis.includes(word);
                
                // Recherche floue (similarité)
                const fuzzyInTitle = wordSimilarity(word, title) || wordSimilarity(word, originalTitleCombined);
                const fuzzyInSynopsis = wordSimilarity(word, synopsis) || wordSimilarity(word, originalSynopsis);
                
                // Vérifier aussi les alias pour ce mot
                const wordAliases = getAliases(word);
                let aliasFound = false;
                for (const alias of wordAliases) {
                    if (title.includes(alias) || originalTitleCombined.includes(alias) ||
                        synopsis.includes(alias) || originalSynopsis.includes(alias)) {
                        aliasFound = true;
                        break;
                    }
                }
                
                // Le mot est trouvé s'il correspond exactement, par similarité, ou via un alias
                wordFound = exactInNormalizedTitle || exactInNormalizedSynopsis || 
                           exactInOriginalTitle || exactInOriginalSynopsis ||
                           fuzzyInTitle || fuzzyInSynopsis || aliasFound;
                
                if (wordFound) {
                    matchedWords++;
                }
            }
            
            // Vérifier aussi si un alias de la requête complète est présent dans le titre
            let aliasMatch = false;
            for (const alias of queryAliases) {
                if (title.includes(alias) || originalTitleCombined.includes(alias) ||
                    synopsis.includes(alias) || originalSynopsis.includes(alias)) {
                    aliasMatch = true;
                    break;
                }
            }
            
            // Accepter si au moins 70% des mots correspondent OU si un alias correspond
            return matchedWords >= minWordsMatch || aliasMatch;
        });
        
        // Trier par pertinence : titre en premier, puis synopsis
        // Utiliser la même normalisation que pour le filtrage
        const normalizeText = (text) => {
            return text.toLowerCase()
                .normalize('NFD') // Décompose les caractères accentués
                .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
                .replace(/[^\w\s]/g, ' ') // Remplace la ponctuation par des espaces
                .replace(/\s+/g, ' ') // Normalise les espaces multiples
                .trim();
        };
        
        const normalizedQuery = normalizeText(queryLower);
        const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
        
        filteredNotes.sort((a, b) => {
            const titleA = normalizeText(a.title || a.titleEnglish || a.titre || '');
            const titleB = normalizeText(b.title || b.titleEnglish || b.titre || '');
            const synopsisA = normalizeText(a.synopsis || '');
            const synopsisB = normalizeText(b.synopsis || '');
            
            // Vérifier si tous les mots matchent dans le titre
            const allWordsInTitleA = queryWords.every(word => titleA.includes(word));
            const allWordsInTitleB = queryWords.every(word => titleB.includes(word));
            
            // Vérifier si tous les mots matchent dans le synopsis
            const allWordsInSynopsisA = queryWords.every(word => synopsisA.includes(word));
            const allWordsInSynopsisB = queryWords.every(word => synopsisB.includes(word));
            
            // Compter le nombre de mots qui matchent dans le titre
            const wordsInTitleA = queryWords.filter(word => titleA.includes(word)).length;
            const wordsInTitleB = queryWords.filter(word => titleB.includes(word)).length;
            
            // Priorité 1 : tous les mots dans le titre vs pas tous
            if (allWordsInTitleA && !allWordsInTitleB) return -1;
            if (!allWordsInTitleA && allWordsInTitleB) return 1;
            
            // Priorité 2 : plus de mots dans le titre
            if (wordsInTitleA !== wordsInTitleB) {
                return wordsInTitleB - wordsInTitleA; // Plus de mots = plus pertinent
            }
            
            // Priorité 3 : tous les mots dans le synopsis vs pas tous
            if (allWordsInSynopsisA && !allWordsInSynopsisB) return -1;
            if (!allWordsInSynopsisA && allWordsInSynopsisB) return 1;
            
            // Priorité 4 : position du premier mot dans le titre (plus tôt = plus pertinent)
            if (allWordsInTitleA && allWordsInTitleB && queryWords.length > 0) {
                const firstWord = queryWords[0];
                const indexA = titleA.indexOf(firstWord);
                const indexB = titleB.indexOf(firstWord);
                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                }
            }
            
            return 0;
        });
        
        const reviewsSection = document.getElementById('reviews-section');
        const genreLabels = selectedGenresForSearch.length > 0 ? selectedGenresForSearch.join(', ') : '';
        const hasGenreForSearch = selectedGenresForSearch.length > 0;

        // Si un genre est sélectionné : afficher les résultats DANS le container de genre (même container)
        // pour que le bouton "..." fonctionne comme dans le container genre
        if (hasGenreForSearch) {
            window.searchResultsInGenreContainer = true;
            // Supprimer un éventuel container de recherche séparé
            const oldSearchContainer = document.getElementById('search-results-container');
            if (oldSearchContainer) oldSearchContainer.remove();

            let genreFilteredContainer = document.getElementById('genre-filtered-container');
            // Créer le container genre s'il n'existe pas (cas rare)
            if (!genreFilteredContainer && reviewsSection) {
                genreFilteredContainer = document.createElement('div');
                genreFilteredContainer.id = 'genre-filtered-container';
                genreFilteredContainer.style.cssText = 'display:block;visibility:visible;opacity:1;width:98%;max-width:1114px;margin:1rem auto;box-sizing:border-box;position:relative;z-index:1000;';
                const titleDiv = document.createElement('div');
                titleDiv.style.cssText = 'width:98%;text-align:center;padding:2rem 2rem 1rem 2rem;color:#00b894;font-size:1.5rem;font-weight:bold;background:#23262f;margin:1rem auto;box-sizing:border-box;border-radius:18px;';
                genreFilteredContainer.appendChild(titleDiv);
                const cardsWrapper = document.createElement('div');
                cardsWrapper.id = 'genre-cards-container';
                cardsWrapper.className = 'genre-filtered-cards';
                cardsWrapper.style.cssText = 'display:flex !important;flex-wrap:wrap;gap:15px;justify-content:center;align-items:flex-start;padding:2rem;min-height:400px;max-width:1114px;width:100%;overflow:visible;background:#23262f;border-radius:18px;margin:0 auto;box-sizing:border-box;position:relative;visibility:visible !important;opacity:1 !important;';
                genreFilteredContainer.appendChild(cardsWrapper);
                const sortBtnContainer = reviewsSection.querySelector('div[style*="sticky"]');
                const genreSortContainer = document.getElementById('genre-sort-container');
                if (genreSortContainer && genreSortContainer.parentNode === reviewsSection) {
                    if (genreSortContainer.nextSibling) reviewsSection.insertBefore(genreFilteredContainer, genreSortContainer.nextSibling);
                    else reviewsSection.appendChild(genreFilteredContainer);
                } else if (sortBtnContainer && sortBtnContainer.nextSibling) {
                    reviewsSection.insertBefore(genreFilteredContainer, sortBtnContainer.nextSibling);
                } else {
                    reviewsSection.appendChild(genreFilteredContainer);
                }
            }

            if (genreFilteredContainer) {
                genreFilteredContainer.style.display = 'block';
                genreFilteredContainer.style.visibility = 'visible';
                genreFilteredContainer.style.opacity = '1';
                // Passer au-dessus de la barre sticky (z-index 999) pour que le bouton "..." soit toujours cliquable (surtout avec une seule carte)
                genreFilteredContainer.style.position = 'relative';
                genreFilteredContainer.style.zIndex = '1000';
                const titleEl = genreFilteredContainer.querySelector('div:first-child');
                if (titleEl) {
                    var countStr = filteredNotes.length === 1 ? _profileT('search.result_one') : (_profileT('search.result_many') || '{n} résultats').replace('{n}', filteredNotes.length);
                    var msg = _profileT('search.results_for_genre') || 'Résultats de recherche pour le genre "{genre}" pour "{query}" ({count})';
                    titleEl.textContent = msg.replace('{genre}', genreLabels).replace('{query}', query).replace('{count}', countStr);
                }
                const cardsContainer = genreFilteredContainer.querySelector('#genre-cards-container');
                if (cardsContainer) {
                    cardsContainer.innerHTML = '';
                    if (filteredNotes.length === 0) {
                        var noResMsg = (_profileT('search.no_results_genre') || 'Aucun résultat trouvé pour le genre "{genre}" pour "{query}"').replace('{genre}', genreLabels).replace('{query}', query);
                        cardsContainer.innerHTML = `
                            <div style="width:100%;text-align:center;color:#a5b1c2;padding:3rem;">
                                <i class="fas fa-search" style="font-size:3rem;margin-bottom:1rem;opacity:0.5;"></i>
                                <p style="font-size:1.2rem;">${noResMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                            </div>
                        `;
                    } else {
                        filteredNotes.forEach(note => {
                            const card = createAnimeCardForSearch(note);
                            cardsContainer.appendChild(card);
                            updateCardMoreButtonForSearch(card);
                        });
                        setTimeout(function() {
                            if (typeof window.translateSynopses === 'function') {
                                window.translateSynopses(localStorage.getItem('mangaWatchLanguage') || 'fr');
                            }
                        }, 250);
                    }
                }
            }
        } else {
            // Aucun genre sélectionné : créer le container de recherche séparé comme avant
            window.searchResultsInGenreContainer = false;
            const resultsContainer = document.createElement('div');
            resultsContainer.id = 'search-results-container';
            resultsContainer.style.cssText = `
                width: 98%;
                max-width: 1114px;
                margin: 1rem auto;
                box-sizing: border-box;
                position: relative;
                z-index: 1000;
            `;
            const titleDiv = document.createElement('div');
            titleDiv.style.cssText = `
                width: 100%;
                text-align: center;
                padding: 2rem 2rem 1rem 2rem;
                color: #00b894;
                font-size: 1.5rem;
                font-weight: bold;
                background: #23262f;
                box-sizing: border-box;
                border-radius: 18px 18px 0 0;
                border-bottom: 2px solid #00b894;
            `;
            var countStr = filteredNotes.length === 1 ? _profileT('search.result_one') : (_profileT('search.result_many') || '{n} résultats').replace('{n}', filteredNotes.length);
            var msg = _profileT('search.results_for') || 'Résultats de recherche pour "{query}" ({count})';
            titleDiv.textContent = msg.replace('{query}', query).replace('{count}', countStr);
            resultsContainer.appendChild(titleDiv);
            const separatorDiv = document.createElement('div');
            separatorDiv.style.cssText = `
                width: 90%;
                max-width: 500px;
                height: 4px;
                background: linear-gradient(90deg, transparent, #00b894, transparent);
                margin: 0 auto 1rem auto;
                border-radius: 2px;
                box-shadow: 0 2px 8px rgba(0, 184, 148, 0.3);
            `;
            resultsContainer.appendChild(separatorDiv);
            const cardsContainer = document.createElement('div');
            cardsContainer.id = 'search-cards-container';
            cardsContainer.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                justify-content: center;
                align-items: flex-start;
                padding: 2rem;
                min-height: 400px;
                max-width: 1114px;
                width: 100%;
                margin: 0 auto;
                overflow: visible;
                background: #23262f;
                border-radius: 0 0 18px 18px;
                box-sizing: border-box;
                position: relative;
            `;
            if (filteredNotes.length === 0) {
                var noResMsg = (_profileT('search.no_results') || 'Aucun résultat trouvé pour "{query}"').replace('{query}', query);
                cardsContainer.innerHTML = '<div style="width: 100%; text-align: center; color: #a5b1c2; padding: 3rem;"><i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i><p style="font-size: 1.2rem;">' + noResMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p></div>';
            } else {
                filteredNotes.forEach(note => {
                    const card = createAnimeCardForSearch(note);
                    cardsContainer.appendChild(card);
                    updateCardMoreButtonForSearch(card);
                });
                setTimeout(function() {
                    if (typeof window.translateSynopses === 'function') {
                        window.translateSynopses(localStorage.getItem('mangaWatchLanguage') || 'fr');
                    }
                }, 250);
            }
            resultsContainer.appendChild(cardsContainer);
            if (reviewsSection) {
                const genreFilteredContainer = document.getElementById('genre-filtered-container');
                if (genreFilteredContainer && genreFilteredContainer.parentNode === reviewsSection) {
                    if (genreFilteredContainer.nextSibling) {
                        reviewsSection.insertBefore(resultsContainer, genreFilteredContainer.nextSibling);
                    } else {
                        reviewsSection.appendChild(resultsContainer);
                    }
                } else {
                    const sortBtnContainer = reviewsSection.querySelector('div[style*="sticky"]');
                    if (sortBtnContainer && sortBtnContainer.nextSibling) {
                        reviewsSection.insertBefore(resultsContainer, sortBtnContainer.nextSibling);
                    } else {
                        reviewsSection.appendChild(resultsContainer);
                    }
                }
            }
        }

        // Désactiver le bouton "Trier par genre" pendant la recherche
        const sortBtnSearch = document.getElementById('sort-by-genre-btn');
        if (sortBtnSearch) {
            sortBtnSearch.style.opacity = '0.5';
            sortBtnSearch.style.cursor = 'not-allowed';
            sortBtnSearch.style.pointerEvents = 'none';
        }
        } // Fin de performSearchWithNotes
    }

    // MutationObserver désactivé - la barre de recherche locale doit fonctionner normalement

    // Fonction pour créer une carte d'anime pour les résultats de recherche
    function createAnimeCardForSearch(anime) {
        const titre = anime.titre || anime.title || anime.name || 'Titre inconnu';
        const image = anime.image || anime.img || anime.cover || '/images/default-anime.svg';
        let synopsis = anime.synopsis || anime.synopsisPerso;
        if (!synopsis) {
            const found = animes.find(a => (a.id === anime.id || a.titre === titre || (a.titre && a.titre.toLowerCase() === titre.toLowerCase())));
            if (found && found.synopsis) synopsis = found.synopsis;
        }
        if (!synopsis) synopsis = (typeof window.t === 'function' && window.t('no_synopsis_available')) || 'Synopsis non renseigné.';
        
        let genres = anime.genres || [];
        if (!genres || !Array.isArray(genres) || genres.length === 0) {
            genres = ['Genre inconnu'];
        }
        
        const note = anime.note || null;
        // Générer le lien vers la page de détails avec l'ID et le type
        // TOUJOURS utiliser anime-details.html, même si anime.page existe (pour éviter les anciens liens)
        const animeId = anime.id || anime.mal_id || anime.malId || '';
        const contentType = anime.contentType || (anime.isManga ? 'manga' : 'anime');
        let pageHtml = "#";
        
        // Si on a un ID, créer le lien vers anime-details.html
        if (animeId) {
            pageHtml = `anime-details.html?id=${animeId}&type=${contentType}`;
        }

        const genresHtml = genres.map(g => {
            const displayG = getTranslatedGenreForProfile(g);
            const fontSize = genres.length >= 5 ? '0.75rem' : '0.92rem';
            const padding = genres.length >= 5 ? '0.1em 0.4em' : '0.15em 0.6em';
            return `<a href="mangas.html?genre=${encodeURIComponent(g)}" class="profile-genre-link" style="background:#00b89422;color:#00b894;font-weight:600;padding:${padding};border-radius:10px;font-size:${fontSize};letter-spacing:0.01em;text-decoration:none;transition:background 0.2s;" 
            onclick="event.preventDefault();window.location.href='mangas.html?genre=${encodeURIComponent(g)}';">${displayG}</a>`;
        }).join('');

        const card = document.createElement('div');
        card.className = 'catalogue-card';
        card.setAttribute('data-anime-id', anime.id);
        card.setAttribute('draggable', 'true');
        
        if (anime.contentType === 'manga' || anime.isManga) {
            card.setAttribute('data-is-manga', 'true');
            card.classList.add('manga-card');
        }
        
        card.style.cssText = `
            background: linear-gradient(135deg, #23262f 80%, #00b89422 100%);
            border: 2.5px solid #00b894;
            border-radius: 18px;
            box-shadow: 0 4px 18px #00b89433, 0 2px 8px #0008;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 1.1rem 1.1rem 1rem 1.1rem;
            width: 340px;
            height: 520px;
            min-height: 520px;
            max-height: 520px;
            margin: 0;
            overflow: hidden;
            transition: box-shadow 0.2s, transform 0.2s;
            position: relative;
            flex: 0 0 340px;
            box-sizing: border-box;
        `;

        const uniqueId = `morebtn-search-${Date.now()}-${Math.floor(Math.random()*100000)}`;
        card.innerHTML = `
            <button class="card-more-btn" id="${uniqueId}" aria-label="Plus d'options" style="
                position: absolute;
                top: 12px;
                right: 14px;
                width: 32px;
                height: 32px;
                background: #f8f9fa;
                border: 1.5px solid #00b894;
                border-radius: 50%;
                box-shadow: 0 2px 8px #0002;
                color: #444;
                font-size: 1.3rem;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 10;
                transition: border-color 0.18s, background 0.18s;
                outline: none;
                padding: 0;
            ">&#8230;</button>
            <div class="card-more-menu" style="
                display: none;
                position: absolute;
                top: 46px;
                right: 0;
                background: #fff;
                color: #00b894;
                font-size: 1rem;
                font-weight: bold;
                border-radius: 8px;
                box-shadow: 0 4px 16px #0002;
                padding: 7px 18px;
                white-space: nowrap;
                z-index: 20;
                border: 1.5px solid #00b894;
                min-width: 110px;
                text-align: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.25s;
            ">
                <div class="select-top10-btn" style="cursor:pointer;padding:6px 0;color:#00b894;font-weight:bold;font-size:0.9rem;transition:background-color 0.2s;" onmouseover="this.style.backgroundColor='#00b89420'" onmouseout="this.style.backgroundColor='transparent'">${getAddToTop10Label()}</div>
            </div>
            <img src="${image}" alt="${titre}" style="width:140px;height:185px;object-fit:cover;display:block;object-position:center center;margin:0 auto 1rem auto;border-radius:10px;box-shadow:0 2px 12px #00b89455;align-self:center;">
            <a href="${pageHtml}" style="font-size:1.15rem;margin-bottom:0.5rem;color:#00b894;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;display:block;transition:color 0.2s;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" onmouseover="this.style.color='#00d4aa'" onmouseout="this.style.color='#00b894'">${titre}</a>
            <div class="content-synopsis profile-card-synopsis" style="color:#b3e6b3;font-size:0.98rem;line-height:1.5;text-align:center;margin-bottom:0.7rem;">${truncateSynopsis(synopsis)}</div>
            <div class="anime-genres" style="display:flex;flex-wrap:wrap;gap:0.3rem;justify-content:center;margin-bottom:0.5rem;">
                ${genresHtml}
            </div>
            <div style="color:#00b894;font-size:1.1rem;font-weight:bold;text-align:center;">
                ${_profileT('profile.rating_label') || 'Note'}: ${note || (_profileT('profile.not_rated') || 'Non noté')}/10
            </div>
        `;

        // S'assurer que le lien du titre fonctionne correctement
        const titleLink = card.querySelector('a[href*="anime-details"], a[href*="manga-details"], a[href]');
        if (titleLink) {
            const href = titleLink.getAttribute('href');
            console.log('🔗 [TITLE LINK] Lien trouvé pour carte:', titre, 'href:', href);
            
            // Forcer le clic sur le lien
            titleLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                const linkHref = this.getAttribute('href');
                console.log('🖱️ [TITLE CLICK] Clic sur titre:', titre, 'href:', linkHref);
                
                if (linkHref && linkHref !== '#') {
                    console.log('✅ [TITLE CLICK] Redirection vers:', linkHref);
                    window.location.href = linkHref;
                } else {
                    console.warn('⚠️ [TITLE CLICK] Lien invalide ou vide:', linkHref);
                }
                return false;
            }, true); // Utiliser capture phase pour s'exécuter en premier
            
            // S'assurer que le lien est cliquable
            titleLink.style.position = 'relative';
            titleLink.style.zIndex = '100';
            titleLink.style.pointerEvents = 'auto';
            titleLink.style.cursor = 'pointer';
        } else {
            console.warn('⚠️ [TITLE LINK] Aucun lien trouvé pour carte:', titre);
        }

        // Ajouter les gestionnaires d'événements pour le menu
        const moreBtn = card.querySelector('.card-more-btn');
        const moreMenu = card.querySelector('.card-more-menu');
        
        if (moreBtn && moreMenu) {
            moreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = moreMenu.style.display === 'block';
                document.querySelectorAll('.card-more-menu').forEach(menu => {
                    menu.style.display = 'none';
                    menu.style.opacity = '0';
                    menu.style.pointerEvents = 'none';
                });
                if (!isOpen) {
                    moreMenu.style.display = 'block';
                    moreMenu.style.opacity = '1';
                    moreMenu.style.pointerEvents = 'auto';
                }
            });

            const selectBtn = moreMenu.querySelector('.select-top10-btn');
            if (selectBtn) {
                selectBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    e.stopImmediatePropagation(); // Empêcher la propagation vers d'autres gestionnaires
                    
                    
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
                        
                        
                        // Afficher l'interface en miniature après un court délai pour s'assurer que la carte est bien sélectionnée
                        setTimeout(() => {
                            if (window.selectedTop10Card && window.selectedTop10Card === card) {
                                if (typeof showTop10MiniInterface === 'function') {
                                    showTop10MiniInterface();
                                } else {
                                    console.error('🔘 ERREUR: showTop10MiniInterface n\'est pas définie');
                                }
                            } else {
                                console.error('🔘 ERREUR: window.selectedTop10Card est null ou différent après délai');
                            }
                        }, 50);
                        
                    }
                    
                    // Fermer le menu immédiatement
                    moreMenu.style.display = 'none';
                    moreMenu.style.opacity = '0';
                    moreMenu.style.pointerEvents = 'none';
                });
            }
        }

        return card;
    }

    // Fonction pour mettre à jour le bouton ".." d'une carte de recherche
    async function updateCardMoreButtonForSearch(card) {
        const animeId = card.getAttribute('data-anime-id');
        if (!animeId) return;
        
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        let shouldHideButton = false;
        
        if (user && user.email) {
            // Vérifier le top 10 du genre et type sélectionnés (contexte actuel), pas le global
            let type = window.selectedType || null;
            const selectedGenres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
            const genreKey = selectedGenres.length > 0 ? selectedGenres.slice().sort().join(',') : null;
            const contextTop10 = await getUserTop10(user, genreKey, type);
            
            // Récupérer le titre et contentType depuis les notes (plus fiable que le DOM)
            let cardTitle = null;
            let cardContentType = null;
            const notes = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
            const note = notes.find(n => String(n.id) === String(animeId));
            if (note) {
                // Utiliser le titre depuis les notes en priorité (plus fiable que le DOM)
                cardTitle = note.titre || note.title || note.name || null;
                cardContentType = note.contentType || (note.isManga ? 'manga' : null);
            }
            
            // Fallback : utiliser extractTitleFromCard si le titre n'a pas été trouvé dans les notes
            if (!cardTitle) {
                cardTitle = extractTitleFromCard(card);
            }
            
            // Si cardContentType n'a pas été trouvé dans les notes, utiliser le type sélectionné
            if (!cardContentType) {
                if (type === 'anime') {
                    cardContentType = 'anime';
                } else if (type === 'manga') {
                    cardContentType = 'manga';
                } else if (type === 'film') {
                    cardContentType = 'film';
                }
            }
            
            const isInGlobalTop10 = contextTop10.some(a => {
                if (!a) return false;
                // Comparaison par ID d'abord
                if (String(a.id) === String(animeId)) return true;
                
                // IMPORTANT: Ne comparer par titre que si les deux éléments sont du MÊME type
                // Les films ont leur propre Top 10 et ne doivent pas être comparés avec les anime
                const top10ContentType = a.contentType || (type === 'anime' ? 'anime' : (type === 'film' ? 'film' : null));
                
                // Si les types sont différents (ex: film vs anime), ne pas comparer par titre
                if (top10ContentType && cardContentType && top10ContentType !== cardContentType) {
                    return false; // Types différents, ce n'est pas la même carte
                }
                
                // Pour les animes ET mangas, comparer aussi par titre de base et similarité
                // MAIS seulement si les deux sont du même type (anime/anime ou manga/manga, pas de mélange)
                if ((type === 'anime' || type === 'manga') && 
                    (top10ContentType === type || !top10ContentType) && 
                    cardContentType === type) {
                    const top10Title = a.titre || a.title || a.name || '';
                    let cardTitleFromVar = cardTitle || '';
                    
                    if (!top10Title || !cardTitleFromVar) {
                        return false;
                    }
                    
                    // Vérifier si l'un des deux titres appartient à une série avec plusieurs saisons
                    const isSeriesTop10 = isSeriesWithMultipleSeasons(top10Title);
                    let isSeriesCard = isSeriesWithMultipleSeasons(cardTitleFromVar);
                    
                    // Vérification supplémentaire : si le titre extrait du DOM ne correspond pas à une série avec saisons,
                    // vérifier si l'ID de la carte correspond à un titre de série avec saisons dans les notes
                    if (!isSeriesCard && isSeriesTop10 && user && user.email) {
                        const noteForCard = notes.find(n => String(n.id) === String(animeId));
                        if (noteForCard) {
                            const noteTitle = noteForCard.titre || noteForCard.title || noteForCard.name || '';
                            if (isSeriesWithMultipleSeasons(noteTitle)) {
                                // Utiliser le titre depuis les notes au lieu du titre extrait du DOM
                                cardTitleFromVar = noteTitle;
                                isSeriesCard = true;
                                console.log(`✅ [BUTTON SERIES FIX SEARCH] Titre corrigé depuis les notes pour animeId=${animeId}: "${cardTitleFromVar}" (était: "${cardTitle}")`);
                            }
                        }
                    }
                    
                    const contentTypeForExtraction = type; // 'anime' ou 'manga'
                    const top10BaseTitle = extractBaseAnimeTitle(top10Title, contentTypeForExtraction);
                    const cardBaseTitle = extractBaseAnimeTitle(cardTitleFromVar, contentTypeForExtraction);
                    
                    // Normaliser les titres de base pour la comparaison
                    const normalizedTop10Base = (top10BaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ');
                    const normalizedCardBase = (cardBaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ');
                    
                    // Si les titres de base correspondent exactement, masquer le bouton
                    if (normalizedTop10Base && normalizedCardBase && normalizedTop10Base === normalizedCardBase) {
                        console.log(`✅ [BUTTON HIDE UPDATE] Titres de base identiques (${contentTypeForExtraction}): "${top10BaseTitle}" === "${cardBaseTitle}"`);
                        return true;
                    }
                    
                    // Si les titres sont similaires (même série sans indication explicite de saison), masquer le bouton
                    if (areAnimeTitlesSimilar(top10Title, cardTitleFromVar, contentTypeForExtraction)) {
                        console.log(`✅ [BUTTON HIDE UPDATE] Cartes similaires détectées (${contentTypeForExtraction}): "${top10Title}" vs "${cardTitleFromVar}"`);
                        return true;
                    }
                    
                    // Vérification supplémentaire pour les séries avec saisons : comparer les préfixes
                    if (isSeriesTop10 || isSeriesCard) {
                        const prefixLength = Math.min(15, Math.min(normalizedTop10Base.length, normalizedCardBase.length));
                        if (prefixLength >= 15) {
                            const top10Prefix = normalizedTop10Base.substring(0, prefixLength);
                            const cardPrefix = normalizedCardBase.substring(0, prefixLength);
                            if (top10Prefix === cardPrefix) {
                                console.log(`✅ [BUTTON HIDE SERIES UPDATE] Préfixes identiques: "${top10Prefix}"`);
                                return true;
                            }
                        }
                    }
                }
                
                // Pour les films UNIQUEMENT, comparer aussi par titre de base et similarité
                // MAIS seulement si les deux sont des films (pas d'anime)
                if (type === 'film' && top10ContentType === 'film' && cardContentType === 'film') {
                    const top10Title = a.titre || a.title || a.name || '';
                    const cardTitleFromVar = cardTitle || '';
                    
                    if (!top10Title || !cardTitleFromVar) {
                        return false;
                    }
                    
                    const top10BaseTitle = extractBaseAnimeTitle(top10Title, 'film');
                    const cardBaseTitle = extractBaseAnimeTitle(cardTitleFromVar, 'film');
                    
                    // Normaliser les titres de base pour la comparaison
                    const normalizedTop10Base = (top10BaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ');
                    const normalizedCardBase = (cardBaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ');
                    
                    // Si les titres de base correspondent exactement, masquer le bouton
                    if (normalizedTop10Base && normalizedCardBase && normalizedTop10Base === normalizedCardBase) {
                        return true;
                    }
                    
                    // Pour les films, ne PAS utiliser la similarité, seulement la comparaison exacte par titre de base
                    // (Les films ne doivent être comparés que par ID ou titre de base identique)
                }
                
                return false;
            });
            shouldHideButton = isInGlobalTop10;
        }
        
        // Affiche ou masque le bouton '...' et son menu
        const mainMoreBtn = card.querySelector('.card-more-btn, .more-button, .card-more-button');
        const mainMoreMenu = card.querySelector('.card-more-menu, .dropdown-menu');
        if (mainMoreBtn) {
            mainMoreBtn.style.display = shouldHideButton ? 'none' : '';
            mainMoreBtn.style.pointerEvents = shouldHideButton ? 'none' : 'auto';
        }
        if (mainMoreMenu) {
            mainMoreMenu.style.display = 'none';
            mainMoreMenu.style.opacity = '0';
            mainMoreMenu.style.pointerEvents = 'none';
        }
        
        // Affiche ou masque le bouton 'sélectionner' si présent
        let selectBtn = card.querySelector('.select-top10-btn');
        if (selectBtn) {
            selectBtn.style.display = shouldHideButton ? 'none' : 'block';
        }
    }

    // Écouter les changements dans la barre de recherche
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        // Annuler toute recherche en cours
        clearTimeout(searchTimeout);
        
        const query = e.target.value.trim();
        
        // Si la recherche est vide, réafficher les containers à étoiles immédiatement
        // et supprimer le container de recherche de manière synchrone
        if (!query) {
            // Si les résultats étaient affichés dans le container de genre, restaurer la vue genre (liste du genre comme avant la recherche)
            if (window.searchResultsInGenreContainer && typeof applyGenreFilter === 'function') {
                window.searchResultsInGenreContainer = false;
                applyGenreFilter();
            }
            // Supprimer immédiatement le container de recherche s'il existe (synchrone)
            const existingSearchContainer = document.getElementById('search-results-container');
            if (existingSearchContainer) {
                existingSearchContainer.remove();
            }
            
            // Utiliser requestAnimationFrame pour une suppression garantie même si rapide
            requestAnimationFrame(() => {
                const stillExists = document.getElementById('search-results-container');
                if (stillExists) {
                    stillExists.remove();
                }
                
                // Réafficher immédiatement les containers d'étoiles
                performSearch('');
            });
            
            // Double vérification après un court délai pour les suppressions très rapides
            setTimeout(() => {
                const finalCheck = document.getElementById('search-results-container');
                if (finalCheck) {
                    finalCheck.remove();
                }
                // Réafficher les containers d'étoiles SEULEMENT si aucun genre n'est sélectionné
                const hasGenreSelected = Array.isArray(window.selectedGenres) && window.selectedGenres.length > 0;
                if (!hasGenreSelected) {
                    const allContainers = document.querySelector('.all-star-containers');
                    if (allContainers && allContainers.style.display === 'none') {
                        allContainers.style.display = '';
                    }
                }
            }, 100);
            
            return;
        }
        
        // Masquer le container de recherche pendant la saisie (mais ne pas le supprimer)
        const existingSearchContainer = document.getElementById('search-results-container');
        if (existingSearchContainer) {
            existingSearchContainer.style.display = 'none';
        }
        
        // Délai de 500ms avant de lancer la recherche (debounce)
        searchTimeout = setTimeout(() => {
            // Vérifier que la requête n'est pas vide avant de lancer la recherche
            const currentQuery = searchInput.value.trim();
            if (currentQuery) {
                performSearch(currentQuery);
            }
        }, 500);
    });
    
    // Écouter la touche Entrée pour lancer la recherche immédiatement
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            performSearch(e.target.value.trim());
        }
    });
}

// Fonction pour trier les containers d'étoiles selon l'ordre choisi
function sortStarContainers(orderType) {
    // Ne trier que pour ordre décroissant/croissant, pas pour les options d'ajout
    if (orderType !== 'desc' && orderType !== 'asc') {
        return;
    }
    
    const allStarContainers = document.querySelector('.all-star-containers');
    if (!allStarContainers) return;
    
    const starGroups = Array.from(allStarContainers.querySelectorAll('.star-rating-group'));
    if (starGroups.length === 0) return;
    
    // Récupérer les notes utilisateur pour le tri par ajout
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    let notes = [];
    if (user && user.email) {
        try {
            notes = JSON.parse(localStorage.getItem('user_anime_notes_' + user.email) || '[]');
        } catch (e) { notes = []; }
    }
    
    // Fonction pour obtenir le nombre d'étoiles d'un groupe
    function getStarCount(group) {
        const badge = group.querySelector('.star-rating-badge');
        if (badge) {
            const starText = badge.textContent.trim();
            const match = starText.match(/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }
        return 0;
    }
    
    // Fonction pour obtenir la date d'ajout la plus récente d'un groupe
    function getLatestAddDate(group) {
        const starCount = getStarCount(group);
        const groupNotes = notes.filter(n => {
            let n_val = n.note;
            if (typeof n_val === 'string') n_val = parseInt(n_val, 10);
            return n_val === starCount;
        });
        
        if (groupNotes.length === 0) return new Date(0);
        
        // Utiliser la date de modification du localStorage comme proxy pour la date d'ajout
        // ou la date actuelle si pas disponible
        return new Date();
    }
    
    // Trier les groupes selon l'ordre choisi
    let sortedGroups;
    switch (orderType) {
        case 'desc':
            // Ordre décroissant : 10, 9, 8, ..., 1
            sortedGroups = starGroups.sort((a, b) => getStarCount(b) - getStarCount(a));
            break;
        case 'asc':
            // Ordre croissant : 1, 2, 3, ..., 10
            sortedGroups = starGroups.sort((a, b) => getStarCount(a) - getStarCount(b));
            break;
        default:
            return; // Pas de tri
    }
    
    // Réorganiser les groupes dans le DOM
    sortedGroups.forEach(group => {
        allStarContainers.appendChild(group);
    });
    
    console.log(`Containers d'étoiles triés par : ${orderType}`);
}

// Fonction pour appliquer le filtre par genre sur tous les containers
function applyGenreFilter() {
    // Initialiser selectedGenres s'il n'existe pas
    if (!Array.isArray(window.selectedGenres)) {
        window.selectedGenres = [];
    }
    
    console.log('applyGenreFilter appelée avec selectedGenres:', window.selectedGenres);
    
    // Supprimer l'ancien conteneur de genre s'il existe
    const oldGenreContainer = document.getElementById('genre-filtered-container');
    if (oldGenreContainer) {
        oldGenreContainer.remove();
    }
    
    if (!window.selectedGenres || window.selectedGenres.length === 0) {
        console.log('Aucun genre sélectionné, réinitialisation sans rechargement');
        
        // Masquer le bouton reset
        if (typeof resetButton !== 'undefined') resetButton.style.display = 'none';
        
        // Réactiver le bouton type
        const typeButtonEl = document.getElementById('filter-by-type-btn');
        if (typeButtonEl) {
            typeButtonEl.style.opacity = '1';
            typeButtonEl.style.cursor = 'pointer';
            typeButtonEl.style.pointerEvents = 'auto';
            typeButtonEl.title = '';
        }
        
        // Réafficher les conteneurs d'étoiles
        const allContainers = document.querySelector('.all-star-containers');
        if (allContainers) {
            allContainers.style.display = '';
        }
        
        // Réafficher tous les groupes d'étoiles individuels
        const starGroups = document.querySelectorAll('.star-rating-group');
        starGroups.forEach(group => {
            group.style.display = '';
        });
        
        // Réafficher le conteneur de recherche s'il était masqué
        const searchResultsContainer = document.getElementById('search-results-container');
        if (searchResultsContainer && searchResultsContainer.style.display === 'none') {
            searchResultsContainer.style.display = '';
        }
        
        // Réafficher les cartes normalement
        if (typeof displayUserAnimeNotes === 'function') {
            displayUserAnimeNotes();
        }
        // Réappliquer la traduction des synopsis des cartes des conteneurs à étoiles
        setTimeout(function() {
            if (typeof window.translateSynopses === 'function') {
                window.translateSynopses(localStorage.getItem('mangaWatchLanguage') || 'fr');
            }
        }, 350);
        
        return;
    }
    
    console.log('Genres sélectionnés, masquage des conteneurs d\'étoiles');
    
    // Masquer le container de recherche s'il existe
    const searchResultsContainer = document.getElementById('search-results-container');
    if (searchResultsContainer) {
        searchResultsContainer.style.display = 'none';
    }
    
    // Masquer tous les conteneurs d'étoiles
    // Masquer le conteneur principal des étoiles
    const allContainers = document.querySelector('.all-star-containers');
    if (allContainers) {
        allContainers.style.display = 'none';
        console.log('Conteneur principal des étoiles masqué');
    } else {
        console.log('Conteneur principal des étoiles non trouvé');
    }
    
    // Masquer aussi tous les groupes d'étoiles individuels
    const starGroups = document.querySelectorAll('.star-rating-group');
    starGroups.forEach(group => {
        group.style.display = 'none';
    });
    console.log('Groupes d\'étoiles masqués:', starGroups.length);
    
    // Masquer aussi tous les conteneurs d'étoiles individuels
    const allStarContainers = document.querySelectorAll('[id^="star-containers"]');
    allStarContainers.forEach(container => {
        container.style.display = 'none';
    });
    
    // Si des genres sont sélectionnés, créer un seul grand conteneur
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) return;
    
    // Charger les notes depuis Firebase (ou localStorage en fallback)
    (async () => {
        let notes = await loadUserNotes(user.email);
        
        // Filtrer les animes par genres sélectionnés ET par type si sélectionné
        console.log('🔍 Filtrage des animes:', notes.length, 'notes trouvées depuis Firebase/localStorage');
        console.log('🔍 Genres sélectionnés:', window.selectedGenres);
        console.log('🔍 Type sélectionné:', window.selectedType);
        
        // Enrichir les genres pour tous les animes qui correspondent au type sélectionné
        const selectedGenresForEnrich = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
        
        // Fonction pour enrichir les genres depuis l'API si nécessaire
        async function enrichGenresFromAPI(anime) {
            // Vérifier si les genres sont valides
            const hasValidGenres = anime.genres && Array.isArray(anime.genres) && anime.genres.length > 0;
            const validGenres = hasValidGenres ? anime.genres.filter(g => {
                if (typeof g === 'object' && g !== null) {
                    const name = g.name || g.genre || g.title || String(g);
                    const nameLower = String(name).toLowerCase().trim();
                    return nameLower && nameLower !== 'genre inconnu' && nameLower !== 'unknown' && nameLower !== 'n/a';
                }
                const nameLower = String(g).toLowerCase().trim();
                return nameLower && nameLower !== 'genre inconnu' && nameLower !== 'unknown' && nameLower !== 'n/a';
            }) : [];
            
            // Si l'anime a déjà des genres valides, vérifier s'ils contiennent le genre recherché
            if (validGenres.length > 0) {
                const animeGenresLower = validGenres.map(g => {
                    // Extraire le nom du genre (gérer les objets et les chaînes)
                    let genreName = '';
                    if (typeof g === 'object' && g !== null) {
                        genreName = g.name || g.genre || g.title || String(g);
                    } else {
                        genreName = typeof g === 'string' ? g : String(g);
                    }
                    return genreName.toLowerCase().trim();
                });
                
                const selectedGenresLower = selectedGenresForEnrich.map(g => g.toLowerCase().trim());
                
                // Vérifier si un des genres sélectionnés est déjà dans les genres de l'anime (avec normalisation sans accents)
                const hasMatchingGenre = selectedGenresLower.some(selected => {
                    const selectedNoAccent = selected.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                    return animeGenresLower.some(animeGenre => {
                        const animeGenreNoAccent = animeGenre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                        return animeGenre === selected || 
                               animeGenre.includes(selected) || 
                               selected.includes(animeGenre) ||
                               animeGenreNoAccent === selectedNoAccent ||
                               animeGenreNoAccent.includes(selectedNoAccent) ||
                               selectedNoAccent.includes(animeGenreNoAccent);
                    });
                });
                
                // Si on a trouvé un match ET que les genres semblent complets (> 1 genre), ne pas récupérer depuis l'API
                if (hasMatchingGenre && animeGenresLower.length > 1) {
                    return anime; // Pas besoin de récupérer depuis l'API
                }
                // Si les genres sont incomplets ou ne correspondent pas, toujours récupérer depuis l'API
            } else {
                // Si aucun genre valide, toujours récupérer depuis l'API
                console.log(`🔄 [ENRICH GENRES] Aucun genre valide trouvé pour ${anime.titre || anime.title}, récupération depuis l'API...`);
            }
            
            // Récupérer les genres depuis l'API seulement si nécessaire
            try {
                const contentType = anime.contentType || 'anime';
                const apiUrl = contentType === 'manga' 
                    ? `https://api.jikan.moe/v4/manga/${anime.id}/full`
                    : `https://api.jikan.moe/v4/anime/${anime.id}/full`;
                
                console.log(`🔄 [ENRICH GENRES] Récupération des genres depuis l'API pour ${anime.titre || anime.title}:`, apiUrl);
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data.genres && Array.isArray(data.data.genres)) {
                        // Extraire les noms des genres (gérer les objets et les chaînes)
                        const genres = data.data.genres.map(g => {
                            if (typeof g === 'object' && g !== null) {
                                return g.name || g.genre || g.title || String(g);
                            }
                            return typeof g === 'string' ? g : String(g);
                        }).filter(g => g && g !== 'Genre inconnu' && g !== 'Unknown');
                        
                        // Merger avec les genres existants si nécessaire (éviter les doublons)
                        if (anime.genres && Array.isArray(anime.genres) && anime.genres.length > 0) {
                            const existingGenres = anime.genres.map(g => {
                                if (typeof g === 'object' && g !== null) {
                                    return String(g.name || g.genre || g.title || g).toLowerCase();
                                }
                                return String(g).toLowerCase();
                            });
                            
                            const newGenres = genres.filter(g => {
                                const gLower = String(g).toLowerCase();
                                return !existingGenres.includes(gLower);
                            });
                            
                            anime.genres = [...anime.genres, ...newGenres];
                        } else {
                            anime.genres = genres;
                        }
                        
                        console.log(`✅ [ENRICH GENRES] Genres enrichis pour ${anime.titre || anime.title}:`, anime.genres);
                    }
                }
            } catch (error) {
                console.warn(`⚠️ [ENRICH GENRES] Impossible de récupérer les genres depuis l'API pour ${anime.titre || anime.title}:`, error);
            }
            
            return anime;
        }
        
        if (selectedGenresForEnrich.length > 0) {
            console.log('🔄 [ENRICH GENRES] Enrichissement des genres depuis l\'API pour', notes.length, 'notes...');
            const enrichPromises = notes.map(anime => {
                // Vérifier d'abord si l'anime correspond au type sélectionné
                // MAIS être plus tolérant pour les mangas qui pourraient avoir des genres correspondants
                if (window.selectedType && window.selectedType !== 'tous') {
                    let animeType = anime.contentType || (anime.isManga ? 'manga' : 'anime');
                    
                    // Améliorer la détection du type manga
                    if (window.selectedType === 'manga' && !animeType) {
                        // Si le type sélectionné est "manga" mais qu'on n'a pas de contentType,
                        // essayer de détecter si c'est potentiellement un manga
                        const titreLower = (anime.titre || anime.title || '').toLowerCase();
                        if (anime.isManga || titreLower.includes('manga')) {
                            animeType = 'manga';
                        }
                    }
                    
                    // Si le type ne correspond toujours pas, vérifier si c'est un genre "type" spécial
                    if (animeType !== window.selectedType) {
                        const selectedGenresTypeCheck = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
                        const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
                        const hasTypeGenre = selectedGenresTypeCheck.some(g => typeGenres.includes(g));
                        
                        // Si un genre "type" est sélectionné et que le type sélectionné est "manga",
                        // permettre l'enrichissement pour les doujins/manhwa/manhua aussi
                        if (window.selectedType === 'manga' && hasTypeGenre) {
                            const genreToCheck = selectedGenresTypeCheck.find(g => typeGenres.includes(g));
                            const expectedType = genreToCheck === 'Doujin' ? 'doujin' : (genreToCheck === 'Manhwa' ? 'manhwa' : 'manhua');
                            if (animeType === expectedType || anime.contentType === expectedType) {
                                // Permettre l'enrichissement pour ce type
                                return enrichGenresFromAPI(anime);
                            }
                        }
                        
                        // Sinon, ne pas enrichir si le type ne correspond pas
                        return Promise.resolve(anime);
                    }
                }
                return enrichGenresFromAPI(anime);
            });
            notes = await Promise.all(enrichPromises);
            console.log('✅ [ENRICH GENRES] Enrichissement terminé');
            
            // Sauvegarder les notes enrichies dans Firebase/localStorage
            try {
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                if (user && user.email) {
                    // Sauvegarder dans localStorage (Firebase sera mis à jour automatiquement via l'intercepteur)
                    const notesKey = `anime_notes_${user.email}`;
                    localStorage.setItem(notesKey, JSON.stringify(notes));
                    console.log('✅ [ENRICH GENRES] Notes enrichies sauvegardées dans localStorage');
                }
            } catch (error) {
                console.warn('⚠️ [ENRICH GENRES] Erreur lors de la sauvegarde des notes enrichies:', error);
            }
        }
        
        // Filtrer d'abord les contenus interdits pour les mineurs
        let notesToFilter = notes;
        if (typeof filterForbiddenContent === 'function') {
            notesToFilter = filterForbiddenContent(notes);
        }
        
        const filteredAnimes = notesToFilter.filter(anime => {
            // Ignorer les animes de test (mais garder Grand Blue, Monster, JoJo)
        if (anime.id && (anime.id.toString().startsWith('test') || 
            anime.id === 3 || anime.id === 4 || 
            anime.id === 'naruto' || anime.id === 'onepiece' ||
            anime.id === 'deathnote' || anime.id === 'attackontitan')) {
            return false; // Exclure cet anime
        }
        
        // Vérifier que l'anime a des données valides
        const titre = anime.titre || anime.title || anime.name || anime.nom || "";
        
        // Logs seulement pour le type anime pour éviter l'infini
        if (anime.contentType === 'anime') {
        }
        
        if (!titre || titre === "Titre inconnu") {
            if (anime.contentType === 'anime') {
            }
            return false; // Exclure les animes sans titre valide
        }
        
        // Liste de titres connus qui sont des animes, pas des mangas/doujins
        // (Kingdom exclu : existe en anime ET manga — on respecte contentType/isManga)
        // CORRECTION PRÉCOCE: Vérifier et corriger le contentType AVANT de l'utiliser
        const knownAnimeTitles = ['high school dxd', 'high school d×d', 'food wars', 'shokugeki', 
                                 'kaguya', 'steins gate', 'grand blue'];
        const animeTitle = (anime.titre || anime.title || anime.name || '').toLowerCase();
        const isKnownAnime = knownAnimeTitles.some(title => animeTitle.includes(title));
        
        // CORRECTION AUTOMATIQUE: Si c'est un anime connu mais que le contentType est incorrect, le corriger
        if (isKnownAnime && anime.contentType === 'doujin') {
            console.log(`🔧 [CORRECTION PRÉCOCE] "${anime.titre || anime.title}" est un anime connu mais contentType est "doujin" - correction en cours`);
            anime.contentType = 'anime';
            // Sauvegarder la correction
            try {
                const noteKey = `user_content_notes_${anime.id}`;
                const savedNote = localStorage.getItem(noteKey);
                if (savedNote) {
                    const noteData = JSON.parse(savedNote);
                    noteData.contentType = 'anime';
                    localStorage.setItem(noteKey, JSON.stringify(noteData));
                }
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                if (user && user.email) {
                    const notesKey = `user_content_notes_${user.email}`;
                    const allNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');
                    const noteIndex = allNotes.findIndex(n => n.id === anime.id);
                    if (noteIndex !== -1) {
                        allNotes[noteIndex].contentType = 'anime';
                        localStorage.setItem(notesKey, JSON.stringify(allNotes));
                    }
                }
            } catch (e) {
                console.error('Erreur lors de la correction précoce:', e);
            }
        }
        
        // Détecter le type de l'anime (nécessaire pour la vérification des doujins/manhua/manhwa)
        // IMPORTANT: Toujours vérifier isManga pour séparer correctement les mangas des animes
        let animeType = anime.contentType || (anime.isManga ? 'manga' : 'anime'); // par défaut selon isManga
        
        // IMPORTANT: Respecter le contentType stocké en priorité
        // Si contentType est défini et différent de 'anime', l'utiliser (ex: doujin, manhwa, etc.)
        // MAIS: Si c'est un anime connu, toujours prioriser 'anime'
        if (isKnownAnime) {
            animeType = 'anime';
        } else if (anime.contentType && anime.contentType !== 'anime') {
            animeType = anime.contentType; // Utiliser le contentType stocké (doujin, manhwa, manhua, etc.)
        } else if (!anime.contentType) {
            // VÉRIFIER TOUJOURS si c'est un manga (indépendamment du type sélectionné)
            // Améliorer la détection du type manga
            if (anime.isManga) {
                animeType = 'manga';
            } else {
                // Vérifier aussi par titre/ID si c'est potentiellement un manga
                const titreLower = (anime.titre || anime.title || anime.name || '').toLowerCase();
                const noteId = anime.id ? String(anime.id).toLowerCase() : '';
                
                // Liste de titres de mangas connus (Kingdom manga très répandu ; existe aussi en anime)
                const knownMangaTitles = [
                    'one piece', 'naruto', 'dragon ball', 'bleach', 'attack on titan',
                    'death note', 'tokyo ghoul', 'demon slayer', 'jujutsu kaisen',
                    'my hero academia', 'hunter x hunter', 'fullmetal alchemist', 'kingdom'
                ];
                
                // Si le titre correspond à un manga connu ou contient "manga"
                if (knownMangaTitles.some(title => titreLower.includes(title)) || 
                    titreLower.includes('manga') ||
                    noteId.includes('manga')) {
                    animeType = 'manga';
                }
            }
        }
        
        // Détection spéciale pour les doujins, romans, manhua et manhwa (avec critères élargis)
        // IMPORTANT: Respecter le contentType stocké en priorité
        // Si contentType est 'anime', JAMAIS le classer comme doujin, même avec des genres suspects
        if (anime.contentType === 'anime' || (isKnownAnime && (!anime.contentType || anime.contentType === 'anime'))) {
            // Si contentType est explicitement 'anime' ou c'est un anime connu, forcer 'anime'
            // IMPORTANT: Un anime avec le genre "Ecchi" reste un anime, pas un doujin
            animeType = 'anime';
        } else if (anime.contentType === 'doujin') {
            // Si contentType est explicitement 'doujin', utiliser 'doujin'
            animeType = 'doujin';
        } else {
            // Détection STRICTE des doujins - seulement si contentType n'est PAS 'anime'
            // Ne jamais détecter un doujin si contentType === 'anime' même avec des genres suspects
            // IMPORTANT: Si isManga est false et qu'il n'y a pas d'indices explicites de doujin, 
            // c'est probablement un anime, pas un doujin
            const titreLower = (anime.titre || anime.title || anime.name || '').toLowerCase();
            const genresLower = (anime.genres || []).join(' ').toLowerCase();
            const noteId = anime.id ? String(anime.id).toLowerCase() : '';
            
            // Ne jamais classer un anime connu comme doujin
            // Détection STRICTE des doujins - seulement si c'est vraiment un doujin
            // IMPORTANT: Ne pas utiliser "ecchi", "mature", "yuri", "yaoi", "boys love", "girls love", "smut"
            // car ce sont des genres, pas des types de contenu
            // IMPORTANT: Si contentType === 'anime' OU si isManga est false et qu'il n'y a pas d'indices explicites, NE JAMAIS détecter comme doujin
            if (anime.contentType !== 'anime' && !isKnownAnime && titreLower) {
                // Détection STRICTE: seulement si le titre contient explicitement "doujin" ou des mots-clés très explicites
                // ET que ce n'est pas un anime (isManga peut être vrai ou undefined pour les doujins)
                const hasExplicitDoujinIndicators = titreLower.includes('doujin') ||
                    titreLower.includes('totally captivated') ||
                    noteId.includes('doujin');
                
                // Seulement si on a des indices explicites dans le titre/ID
                // ET que ce n'est pas explicitement un anime (isManga !== false ou undefined)
                if (hasExplicitDoujinIndicators && (anime.isManga !== false)) {
                    // Même avec des indices explicites, vérifier les genres uniquement pour hentai/erotica/adult
                    // PAS pour ecchi, mature, yuri, yaoi, etc.
                    const hasExplicitGenreIndicators = genresLower.includes('hentai') || 
                                                       genresLower.includes('erotica') || 
                                                       genresLower.includes('adult');
                    
                    // Seulement si on a des indices explicites dans le titre ET dans les genres
                    if (hasExplicitGenreIndicators || hasExplicitDoujinIndicators) {
                        animeType = 'doujin';
                        console.log(`🔍 [DOUJIN DETECTION] Détecté comme doujin: "${anime.titre || anime.title}" - titre inclut doujin: ${titreLower.includes('doujin')}, genres explicites: ${hasExplicitGenreIndicators}`);
                    }
                }
                // Si isManga est explicitement false, c'est probablement un anime, ne pas le classer comme doujin
                else if (anime.isManga === false) {
                    // Si isManga est false, c'est un anime, pas un doujin
                    animeType = 'anime';
                    console.log(`✅ [ANIME PROTECTION] "${anime.titre || anime.title}" protégé comme anime car isManga=false`);
                }
            }
        }
        
        // Détection des autres types (roman, manhua, manhwa)
        if (animeType !== 'doujin' && animeType !== 'anime') {
            if (anime.contentType === 'roman' || (anime.titre && (
                anime.titre.toLowerCase().includes('roman') ||
                anime.titre.toLowerCase().includes('novel') ||
                (anime.id && anime.id.toString().includes('roman'))
            ))) {
                animeType = 'roman';
            } else if (anime.contentType === 'manhua' || (anime.titre && (
                anime.titre.toLowerCase().includes('manhua') ||
                anime.titre.toLowerCase().includes('sq: begin w/your name') ||
                anime.titre.toLowerCase().includes('sq begin') ||
                anime.titre.toLowerCase().includes('begin w/your name') ||
                anime.titre.toLowerCase().includes('begin with your name') ||
                (anime.id && anime.id.toString().includes('manhua'))
            ))) {
                animeType = 'manhua';
            } else if (anime.contentType === 'manhwa' || (anime.titre && (
                anime.titre.toLowerCase().includes('manhwa') ||
                (anime.id && anime.id.toString().includes('manhwa')) ||
                // Détection par patterns typiques des manhwa coréens
                anime.titre.toLowerCase().includes('on the way to meet mom') ||
                anime.titre.toLowerCase().includes('solo leveling') ||
                anime.titre.toLowerCase().includes('tower of god') ||
                anime.titre.toLowerCase().includes('noblesse') ||
                anime.titre.toLowerCase().includes('the beginning after the end')
            ))) {
                animeType = 'manhwa';
            }
        }
        
        // PROTECTION ULTIME: Si isManga est explicitement false OU si c'est un anime connu avec contentType incorrect, corriger
        // Vérifier cela AVANT tout autre filtrage pour éviter que des animes passent à travers
        const shouldBeAnime = anime.isManga === false || isKnownAnime;
        
        if (shouldBeAnime && (animeType === 'doujin' || anime.contentType === 'doujin')) {
            console.log(`🛡️ [PROTECTION ULTIME] "${anime.titre || anime.title}" devrait être un anime mais était détecté comme doujin (isManga: ${anime.isManga}, isKnownAnime: ${isKnownAnime}) - correction en cours`);
            animeType = 'anime';
            // Corriger aussi le contentType s'il était incorrectement défini comme doujin
            if (anime.contentType === 'doujin') {
                console.log(`🔧 [CORRECTION] Correction contentType de "${anime.titre || anime.title}" de "doujin" vers "anime"`);
                anime.contentType = 'anime';
                // Sauvegarder la correction dans localStorage
                try {
                    const noteKey = `user_content_notes_${anime.id}`;
                    const savedNote = localStorage.getItem(noteKey);
                    if (savedNote) {
                        const noteData = JSON.parse(savedNote);
                        noteData.contentType = 'anime';
                        localStorage.setItem(noteKey, JSON.stringify(noteData));
                        console.log(`💾 [SAUVEGARDE] Correction sauvegardée dans localStorage pour "${anime.titre || anime.title}"`);
                    }
                    // Essayer aussi avec la clé par email si elle existe
                    const user = JSON.parse(localStorage.getItem('user') || 'null');
                    if (user && user.email) {
                        const notesKey = `user_content_notes_${user.email}`;
                        const allNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');
                        const noteIndex = allNotes.findIndex(n => n.id === anime.id);
                        if (noteIndex !== -1) {
                            allNotes[noteIndex].contentType = 'anime';
                            localStorage.setItem(notesKey, JSON.stringify(allNotes));
                            console.log(`💾 [SAUVEGARDE] Correction sauvegardée dans notes groupées pour "${anime.titre || anime.title}"`);
                        }
                    }
                } catch (e) {
                    console.error('Erreur lors de la sauvegarde de la correction:', e);
                }
            }
        }
        
        // Filtrer par type si un type est sélectionné
        if (window.selectedType && window.selectedType !== 'tous') {
            
            
            // Logique de filtrage stricte par type
            const selectedGenresTypeCheck = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
            const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
            const hasTypeGenre = selectedGenresTypeCheck.some(g => typeGenres.includes(g));
            
            if (window.selectedType === 'anime') {
                // Si le type sélectionné est "anime", SEULEMENT les animes doivent apparaître
                // Exclure strictement les mangas, doujins, manhua, manhwa, romans, films
                console.log(`🔍 [TYPE CHECK] Vérification type pour "${anime.titre || anime.title}": animeType=${animeType}, contentType=${anime.contentType}, isManga=${anime.isManga}`);
                if (animeType !== 'anime') {
                    console.log(`❌ [APPLY GENRE FILTER] Exclu "${anime.titre || anime.title}" car type sélectionné est "anime" mais animeType est "${animeType}" (contentType: ${anime.contentType}, isManga: ${anime.isManga})`);
                    return false;
                }
                console.log(`✅ [APPLY GENRE FILTER] Inclus "${anime.titre || anime.title}" car type sélectionné est "anime" et animeType est "${animeType}" - poursuite de la vérification des genres`);
            } else if (window.selectedType === 'manga') {
                // Si le type sélectionné est "manga", seulement les mangas (pas doujin/manhua/manhwa)
                // SAUF si un genre "type" spécifique est sélectionné
                
                // PROTECTION FORTE: Si contentType est explicitement 'anime' OU isManga est false, 
                // NE JAMAIS l'inclure dans les conteneurs manga/doujin
                // Un anime avec le genre "Ecchi" reste un anime, pas un doujin
                if (anime.contentType === 'anime' || anime.isManga === false) {
                    if (anime.contentType === 'anime' && animeType !== 'anime') {
                        console.log(`❌ [APPLY GENRE FILTER] Exclu "${anime.titre || anime.title}" car contentType est "anime" mais animeType détecté est "${animeType}" - correction en cours`);
                        // Corriger l'animeType si contentType est 'anime'
                        animeType = 'anime';
                    }
                    
                    console.log(`❌ [APPLY GENRE FILTER] Exclu "${anime.titre || anime.title}" car contentType est "anime" ou isManga=false (ne doit pas être dans conteneur manga/doujin)`);
                    return false;
                }
                
                if (hasTypeGenre) {
                    // Si un genre "type" est sélectionné, vérifier que l'anime correspond exactement
                    const genreToCheck = selectedGenresTypeCheck.find(g => typeGenres.includes(g));
                    const expectedType = genreToCheck === 'Doujin' ? 'doujin' : (genreToCheck === 'Manhwa' ? 'manhwa' : 'manhua');
                    
                    // PROTECTION: Si le genre sélectionné est "Doujin" mais que contentType est 'anime', exclure
                    if (genreToCheck === 'Doujin' && anime.contentType === 'anime') {
                        console.log(`❌ [APPLY GENRE FILTER] Exclu "${anime.titre || anime.title}" car genre "Doujin" sélectionné mais contentType est "anime"`);
                        return false;
                    }
                    
                    // Vérifier que l'anime est du bon type
                    if (animeType === expectedType) {
                        // Continuer, ne pas exclure (mais on vérifiera aussi les genres plus tard)
                    } else {
                        console.log(`❌ [APPLY GENRE FILTER] Exclu car genre type "${genreToCheck}" sélectionné mais animeType est "${animeType}"`);
                        return false;
                    }
                } else {
                    // Si aucun genre "type" n'est sélectionné, seulement les mangas normaux
                    if (animeType !== 'manga') {
                        const typeAmbigu = (anime.contentType == null || anime.contentType === '') && anime.isManga !== false;
                        if (typeAmbigu) {
                            animeType = 'manga';
                            console.log(`🔧 [APPLY GENRE FILTER] Type ambigu pour "${anime.titre || anime.title}" (pas de contentType, isManga !== false) → considéré comme manga`);
                        } else {
                            console.log(`❌ [APPLY GENRE FILTER] Exclu car type sélectionné est "manga" mais animeType est "${animeType}"`);
                            return false;
                        }
                    }
                }
            } else {
                // Pour les autres types (film, roman, etc.), vérifier strictement
                if (animeType !== window.selectedType) {
                    console.log(`❌ [APPLY GENRE FILTER] Exclu car type sélectionné est "${window.selectedType}" mais animeType est "${animeType}"`);
                    return false;
                }
            }
        }
        
        let genres = anime.genres;
        if (!genres || !Array.isArray(genres) || genres.length === 0) {
                genres = ["Genre inconnu"];
        }
        
        // Mapping nom -> ID Jikan et ID -> nom (pour résoudre mal_id / match par ID)
        const genreMappingForFilter = { 'Action': 1, 'Aventure': 2, 'Avant-garde': 5, 'Prix': 46, 'Boys Love': 28, 'Comédie': 4, 'Drame': 8, 'Fantasy': 10, 'Girls Love': 26, 'Gastronomie': 47, 'Horreur': 14, 'Mystère': 7, 'Romance': 22, 'Science-Fiction': 24, 'Tranche de vie': 36, 'Sport': 30, 'Surnaturel': 37, 'Suspense': 41, 'Ecchi': 9, 'Érotique': 49, 'Hentai': 12, 'Casting adulte': 50, 'Anthropomorphique': 51, 'CGDCT': 52, 'Garde d\'enfants': 53, 'Sport de combat': 54, 'Travestissement': 81, 'Délinquants': 55, 'Détective': 39, 'Éducatif': 56, 'Humour gags': 57, 'Gore': 58, 'Harem': 35, 'Jeu à enjeux élevés': 59, 'Historique': 13, 'Idoles (Femmes)': 60, 'Idoles (Hommes)': 61, 'Isekai': 62, 'Iyashikei': 63, 'Polygone amoureux': 64, 'Statut amoureux': 65, 'Changement de sexe magique': 66, 'Magical Girl': 66, 'Arts martiaux': 17, 'Mecha': 18, 'Médical': 67, 'Militaire': 38, 'Musique': 19, 'Mythologie': 20, 'Crime organisé': 40, 'Culture Otaku': 68, 'Parodie': 69, 'Arts du spectacle': 70, 'Animaux': 71, 'Psychologique': 40, 'Course': 3, 'Réincarnation': 72, 'Harem inversé': 69, 'Samouraï': 21, 'École': 23, 'Showbiz': 73, 'Espace': 29, 'Jeu de stratégie': 11, 'Super pouvoir': 31, 'Survie': 74, 'Sport d\'équipe': 75, 'Voyage temporel': 76, 'Fantasy urbaine': 77, 'Vampire': 32, 'Jeu vidéo': 11, 'Villainess': 78, 'Arts visuels': 79, 'Lieu de travail': 80 };
        const genreIdToName = {};
        Object.keys(genreMappingForFilter).forEach(k => {
            const id = genreMappingForFilter[k];
            if (genreIdToName[id] == null) genreIdToName[id] = k.toLowerCase().trim();
        });
        
        // Extraire les noms de genres (gérer chaînes, objets avec name/mal_id, et IDs numériques)
        const animeGenres = [];
        for (const g of genres) {
            let val = null;
            if (typeof g === 'object' && g !== null) {
                const name = g.name || g.genre || g.title;
                const nameStr = (name != null && name !== '') ? String(name).toLowerCase().trim() : '';
                const validName = nameStr && nameStr !== 'genre inconnu' && nameStr !== 'unknown' && !nameStr.startsWith('[object');
                if (validName) val = nameStr;
                else if (g.mal_id != null && genreIdToName[g.mal_id]) val = genreIdToName[g.mal_id];
            } else if (typeof g === 'number' && genreIdToName[g]) {
                val = genreIdToName[g];
            } else {
                const s = (typeof g === 'string' ? g : String(g)).toLowerCase().trim();
                if (s && s !== 'genre inconnu' && s !== 'unknown' && !s.startsWith('[object')) val = s;
            }
            if (val && !animeGenres.includes(val)) animeGenres.push(val);
        }
        
        // Log détaillé pour déboguer
        console.log(`🔍 [APPLY GENRE FILTER] Extraction genres pour "${anime.titre || anime.title}":`, {
            genresBruts: genres,
            genresExtraits: animeGenres,
            typeGenres: genres.map(g => typeof g),
            genresObjets: genres.filter(g => typeof g === 'object' && g !== null && g.name).map(g => g.name)
        });
        
        // Normaliser les genres pour la comparaison (variantes FR/EN, API Jikan, etc.)
        const normalizedGenres = {
            'comédie': ['comédie', 'comedy', 'humour', 'humor'],
            'action': ['action', 'aventure', 'adventure'],
            'aventure': ['aventure', 'adventure', 'action'],
            'drame': ['drame', 'drama', 'psychologique', 'psychological'],
            'fantasy': ['fantasy', 'fantastique', 'surnaturel', 'supernatural'],
            'romance': ['romance', 'amour', 'love'],
            'mystère': ['mystère', 'mystery', 'thriller'],
            'sport': ['sport', 'sports'],
            'sci-fi': ['sci-fi', 'science-fiction', 'science fiction'],
            'science-fiction': ['science-fiction', 'sci-fi', 'science fiction'],
            'horreur': ['horreur', 'horror'],
            'slice of life': ['slice of life', 'tranche de vie'],
            'tranche de vie': ['tranche de vie', 'slice of life'],
            'mecha': ['mecha', 'robot'],
            'harem': ['harem'],
            'ecchi': ['ecchi', 'Ecchi', 'ECCHI'],
            'érotique': ['érotique', 'erotica', 'erotic'],
            'hentai': ['hentai'],
            'shonen': ['shonen', 'shōnen'],
            'seinen': ['seinen'],
            'josei': ['josei'],
            'shoujo': ['shoujo', 'shōjo'],
            'prix': ['prix', 'award winning', 'award-winning', 'award', 'prize']
        };
        
        // Vérifier si l'anime correspond à TOUS les genres sélectionnés (ET logique)
        const selectedGenres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
        let matchesAllGenres = true;
        
        console.log('🔍 [APPLY GENRE FILTER] Anime:', anime.titre || anime.title);
        console.log('  → Genres bruts de l\'anime:', JSON.stringify(anime.genres));
        console.log('  → Genres anime extraits (détaillés):', JSON.stringify(animeGenres));
        console.log('  → Genres sélectionnés:', selectedGenres);
        console.log('  → Type de l\'anime:', animeType);
        
        // RÈGLE SPÉCIALE : Les doujins/manhua/manhwa ne peuvent apparaître QUE si leur genre "type" spécifique est sélectionné
        // Si un autre genre est aussi sélectionné, vérifier que l'anime correspond à tous les genres
        const typeGenresMapping = {
            'doujin': 'Doujin',
            'manhwa': 'Manhwa',
            'manhua': 'Manhua'
        };
        const typeGenresList = ['Doujin', 'Manhwa', 'Manhua'];
        
        // Vérifier si c'est un doujin/manhua/manhwa
        if (animeType === 'doujin' || animeType === 'manhwa' || animeType === 'manhua') {
            const requiredTypeGenre = typeGenresMapping[animeType];
            
            // Vérifier si le genre "type" correspondant est sélectionné
            if (!selectedGenres.includes(requiredTypeGenre)) {
                console.log(`❌ [APPLY GENRE FILTER] Exclu: ${animeType} nécessite le genre "${requiredTypeGenre}" qui n'est pas sélectionné`);
                return false; // Exclure cet élément
            }
            
            // Si seulement le genre "type" est sélectionné, autoriser l'affichage
            const otherGenres = selectedGenres.filter(g => !typeGenresList.includes(g));
            if (otherGenres.length === 0) {
                console.log(`✅ [APPLY GENRE FILTER] ${animeType} autorisé car genre "${requiredTypeGenre}" est sélectionné (sans autre genre)`);
                // Ne pas retourner false ici, continuer pour vérifier les genres plus tard si nécessaire
            } else {
                console.log(`✅ [APPLY GENRE FILTER] ${animeType} autorisé car genre "${requiredTypeGenre}" est sélectionné, vérification des autres genres (${otherGenres.join(', ')})`);
                // Continuer la vérification normale des genres plus tard
            }
        }
        
        for (const selectedGenre of selectedGenres) {
            const selectedGenreLower = selectedGenre.toLowerCase().trim();
            const selectedGenreNormalized = normalizedGenres[selectedGenreLower] || [selectedGenreLower];
            
            console.log(`🔍 [APPLY GENRE FILTER] Comparaison pour "${selectedGenre}" (normalisé: "${selectedGenreLower}") avec variantes:`, selectedGenreNormalized);
            console.log(`🔍 [APPLY GENRE FILTER] Genres de l'anime "${anime.titre || anime.title}":`, animeGenres);
            console.log(`🔍 [APPLY GENRE FILTER] Genres bruts:`, anime.genres);
            
            // Vérification spéciale PRIORITAIRE pour le genre "Ecchi" AVANT toute autre vérification
            let matchesGenre = false;
            if (selectedGenreLower === 'ecchi' || selectedGenre === 'Ecchi' || selectedGenre === 'ECCHI') {
                // Recherche exhaustive de "Ecchi" dans tous les formats possibles
                const ecchiVariations = ['ecchi', 'Ecchi', 'ECCHI', 'エッチ'];
                
                // Vérifier dans les genres normalisés
                const hasEcchiInNormalized = animeGenres.some(g => {
                    const gLower = g.toLowerCase().trim();
                    return ecchiVariations.some(v => gLower === v.toLowerCase() || gLower.includes(v.toLowerCase()) || v.toLowerCase().includes(gLower));
                });
                
                // Vérifier dans les genres bruts
                const hasEcchiInRaw = anime.genres && Array.isArray(anime.genres) && anime.genres.some(g => {
                    let gStr = '';
                    if (typeof g === 'object' && g !== null) {
                        gStr = String(g.name || g.genre || g.title || g).toLowerCase().trim();
                    } else {
                        gStr = String(g).toLowerCase().trim();
                    }
                    return ecchiVariations.some(v => gStr === v.toLowerCase() || gStr.includes(v.toLowerCase()) || v.toLowerCase().includes(gStr));
                });
                
                matchesGenre = hasEcchiInNormalized || hasEcchiInRaw;
                
                if (matchesGenre) {
                    console.log(`    ✅ [ECCHI MATCH] Genre "Ecchi" trouvé pour "${anime.titre || anime.title}" - hasEcchiInNormalized: ${hasEcchiInNormalized}, hasEcchiInRaw: ${hasEcchiInRaw}`);
                } else {
                    console.log(`    ❌ [ECCHI MATCH] Genre "Ecchi" NON trouvé pour "${anime.titre || anime.title}" - animeGenres:`, animeGenres, '- genres bruts:', anime.genres);
                }
            } else {
                // Pour tous les autres genres, faire la vérification normale
                matchesGenre = animeGenres.some(genre => {
                // Normaliser le genre de l'anime (gérer les objets complexes)
                let genreNormalized = '';
                if (typeof genre === 'object' && genre !== null) {
                    genreNormalized = String(genre.name || genre.genre || genre.title || genre).toLowerCase().trim();
                } else {
                    genreNormalized = String(genre).toLowerCase().trim();
                }
                
                const selectedNormalized = selectedGenreLower.toLowerCase().trim();
                
                console.log(`  → Comparaison: "${genreNormalized}" vs "${selectedNormalized}"`);
                
                // Vérifier d'abord avec les variantes normalisées
                const normalizedMatch = selectedGenreNormalized.some(normalized => {
                    const normalizedTrimmed = normalized.toLowerCase().trim();
                    const exactMatch = genreNormalized === normalizedTrimmed;
                    const includesMatch = genreNormalized.includes(normalizedTrimmed) || normalizedTrimmed.includes(genreNormalized);
                    if (exactMatch || includesMatch) {
                        console.log(`    ✅ Match trouvé avec variante normalisée: "${normalizedTrimmed}"`);
                        return true;
                    }
                    return false;
                });
                if (normalizedMatch) return true;
                
                // Vérifier aussi si le genre de l'anime contient directement le genre sélectionné (sans accents)
                // ou vice versa (pour gérer "erotica" vs "érotique")
                const genreNoAccent = genreNormalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                const selectedNoAccent = selectedNormalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                if (genreNoAccent === selectedNoAccent ||
                    genreNoAccent.includes(selectedNoAccent) || 
                    selectedNoAccent.includes(genreNoAccent)) {
                    console.log(`    ✅ Match trouvé sans accents: "${genreNoAccent}" vs "${selectedNoAccent}"`);
                    return true;
                }
                
                // Comparaison directe (normalisée)
                if (genreNormalized === selectedNormalized) {
                    console.log(`    ✅ Match exact trouvé: "${genreNormalized}" === "${selectedNormalized}"`);
                    return true;
                }
                
                // Comparaison avec includes pour gérer les cas où le genre contient le mot recherché
                if (genreNormalized.includes(selectedNormalized) || selectedNormalized.includes(genreNormalized)) {
                    console.log(`    ✅ Match trouvé avec includes: "${genreNormalized}" contient "${selectedNormalized}" ou vice versa`);
                    return true;
                }
                
                // Vérifier aussi directement dans les genres bruts (objets avec name ou mal_id)
                if (anime.genres && Array.isArray(anime.genres)) {
                    const selectedGenreId = genreMappingForFilter[selectedGenre];
                    const rawMatch = anime.genres.some(rawGenre => {
                        if (typeof rawGenre === 'object' && rawGenre !== null && selectedGenreId != null && Number(rawGenre.mal_id) === Number(selectedGenreId)) {
                            console.log(`    ✅ Match par mal_id (${rawGenre.mal_id}) pour "${selectedGenre}"`);
                            return true;
                        }
                        let rawGenreStr = '';
                        if (typeof rawGenre === 'object' && rawGenre !== null) {
                            rawGenreStr = String(rawGenre.name || rawGenre.genre || rawGenre.title || rawGenre).toLowerCase().trim();
                        } else {
                            rawGenreStr = String(rawGenre).toLowerCase().trim();
                        }
                        if (rawGenreStr.startsWith('[object')) return false;
                        const rawNoAccent = rawGenreStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                        if (rawNoAccent === selectedNoAccent || rawNoAccent.includes(selectedNoAccent) || selectedNoAccent.includes(rawNoAccent)) {
                            console.log(`    ✅ Match trouvé dans genres bruts: "${rawGenreStr}" vs "${selectedNormalized}"`);
                            return true;
                        }
                        return false;
                    });
                    if (rawMatch) return true;
                }
                
                console.log(`    ❌ Aucun match pour "${genreNormalized}"`);
                return false;
                });
                if (!matchesGenre && anime.genres && Array.isArray(anime.genres)) {
                    const sid = genreMappingForFilter[selectedGenre];
                    if (sid != null && anime.genres.some(r => typeof r === 'object' && r != null && Number(r.mal_id) === Number(sid))) {
                        matchesGenre = true;
                        console.log(`    ✅ Match par mal_id uniquement (${sid}) pour "${selectedGenre}"`);
                    }
                }
            }
            
            // Détection spéciale pour les genres Doujin, Manhwa et Manhua
            // Ces genres peuvent être détectés par contentType ou par le titre même s'ils ne sont pas dans la liste des genres
            // Note: La vérification spéciale pour "Ecchi" est déjà faite plus haut
            if (!matchesGenre) {
                console.log(`    🔍 [APPLY GENRE FILTER] Vérification spéciale pour "${selectedGenre}"...`);
                
                const title = (anime.titre || anime.title || '').toLowerCase();
                const contentType = (anime.contentType || '').toLowerCase();
                const noteId = (anime.id || '').toString().toLowerCase();
                
                if (selectedGenreLower === 'doujin' || selectedGenre === 'Doujin') {
                    // Détection élargie des doujins avec tous les critères
                    // IMPORTANT: Si contentType === 'anime' OU isManga === false, JAMAIS le classer comme doujin
                    // Un anime avec le genre "Ecchi" reste un anime, pas un doujin
                    // PROTECTION FORTE: Exclure les animes (isManga === false) même s'ils ont été mal classés
                    
                    // Vérifier si l'anime a le genre "Ecchi" - dans ce cas, c'est un genre, pas un type
                    const hasEcchiGenre = animeGenres.some(g => {
                        const gLower = g.toLowerCase().trim();
                        return gLower === 'ecchi' || gLower.includes('ecchi');
                    }) || (anime.genres && Array.isArray(anime.genres) && anime.genres.some(g => {
                        const gStr = typeof g === 'object' && g !== null ? String(g.name || g.genre || g).toLowerCase() : String(g).toLowerCase();
                        return gStr.includes('ecchi');
                    }));
                    
                    if (anime.contentType === 'anime' || animeType === 'anime' || anime.isManga === false || hasEcchiGenre) {
                        // Si c'est explicitement un anime (contentType === 'anime' ou isManga === false) 
                        // OU s'il a le genre "Ecchi" (qui est un genre, pas un type),
                        // il ne peut PAS correspondre au genre "Doujin"
                        matchesGenre = false;
                        console.log(`    ❌ [APPLY GENRE FILTER] Genre "Doujin" ne correspond PAS pour "${anime.titre || anime.title}" - contentType: ${anime.contentType}, animeType: ${animeType}, isManga: ${anime.isManga}, aEcchi: ${hasEcchiGenre}`);
                    } else {
                        // Utiliser animeType qui a déjà été détecté (respecte le contentType stocké)
                        matchesGenre = animeType === 'doujin' ||
                                      contentType === 'doujin' || 
                                      title.includes('doujin') || 
                                      title.includes('totally captivated') ||
                                      title.includes('hentai') ||
                                      title.includes('sex') ||
                                      title.includes('adult') ||
                                      // title.includes('ecchi') || // "Ecchi" est un genre, pas un type - NE JAMAIS UTILISER
                                      noteId.includes('doujin') ||
                                      // Détection STRICTE par genres - seulement si c'est vraiment explicite (hentai, erotica, adult)
                                      // IMPORTANT: Ne pas utiliser "ecchi", "mature", "yuri", "yaoi", "boys love", "girls love", "smut"
                                      // car ce sont des genres, pas des types de contenu
                                      (anime.genres && anime.genres.some(g => {
                                          const gLower = typeof g === 'object' && g !== null ? String(g.name || g.genre || g).toLowerCase() : String(g).toLowerCase();
                                          return gLower.includes('hentai') || 
                                                 gLower.includes('erotica') || 
                                                 gLower.includes('adult');
                                      })) ||
                                      animeGenres.some(genre => genre.toLowerCase().includes('doujin'));
                        
                        if (matchesGenre) {
                            console.log(`    ✅ [APPLY GENRE FILTER] Genre "Doujin" correspond pour ${animeType} "${anime.titre || anime.title}"`);
                        }
                    }
                } else if (selectedGenreLower === 'manhwa' || selectedGenre === 'Manhwa') {
                    // Utiliser animeType qui a déjà été détecté (respecte le contentType stocké)
                    matchesGenre = animeType === 'manhwa' ||
                                  contentType === 'manhwa' || 
                                  title.includes('manhwa') || 
                                  noteId.includes('manhwa') ||
                                  title.includes('solo leveling') ||
                                  title.includes('tower of god') ||
                                  title.includes('noblesse') ||
                                  title.includes('the beginning after the end') ||
                                  title.includes('on the way to meet mom') ||
                                  animeGenres.some(genre => genre.toLowerCase().includes('manhwa'));
                    
                    if (matchesGenre) {
                        console.log(`    ✅ [APPLY GENRE FILTER] Genre "Manhwa" correspond pour ${animeType} "${anime.titre || anime.title}"`);
                    }
                } else if (selectedGenreLower === 'manhua' || selectedGenre === 'Manhua') {
                    // Utiliser animeType qui a déjà été détecté (respecte le contentType stocké)
                    matchesGenre = animeType === 'manhua' ||
                                  contentType === 'manhua' || 
                                  title.includes('manhua') || 
                                  noteId.includes('manhua') ||
                                  animeGenres.some(genre => genre.toLowerCase().includes('manhua'));
                    
                    if (matchesGenre) {
                        console.log(`    ✅ [APPLY GENRE FILTER] Genre "Manhua" correspond pour ${animeType} "${anime.titre || anime.title}"`);
                    }
                }
            }
            
            // Vérification supplémentaire pour "Érotique" : vérifier aussi directement dans les genres de l'anime
            if (!matchesGenre && (selectedGenreLower === 'érotique' || selectedGenre === 'Érotique')) {
                matchesGenre = animeGenres.some(genre => 
                    genre.includes('erotica') || 
                    genre.includes('érotique') || 
                    genre.includes('erotic') ||
                    (anime.genres && anime.genres.some(g => {
                        const gLower = g.toLowerCase();
                        return gLower.includes('erotica') || gLower.includes('érotique') || gLower.includes('erotic');
                    }))
                );
            }
            
            if (!matchesGenre) {
                console.log(`❌ [APPLY GENRE FILTER] Genre "${selectedGenre}" ne correspond pas pour "${anime.titre || anime.title}"`);
                matchesAllGenres = false;
                break; // Pas besoin de vérifier les autres genres si un ne correspond pas
            } else {
                console.log(`✅ [APPLY GENRE FILTER] Genre "${selectedGenre}" correspond pour "${anime.titre || anime.title}"`);
            }
        }
        
        const matchesGenre = matchesAllGenres;
        
        // Détection spéciale pour les doujins dans applyGenreFilter
        if (anime.titre && (
            anime.titre.toLowerCase().includes('totally') ||
            anime.titre.toLowerCase().includes('doujin') ||
            (anime.genres && anime.genres.some(g => g.toLowerCase().includes('erotica')))
        )) {
            // Traitement des doujins
        }
        
        if (matchesGenre) {
            console.log('✅ [APPLY GENRE FILTER] Anime correspond aux genres:', anime.titre || anime.title, 'Genres:', animeGenres, 'Genres sélectionnés:', window.selectedGenres);
        } else {
            console.log('❌ [APPLY GENRE FILTER] Anime ne correspond pas aux genres:', anime.titre || anime.title, 'Genres:', animeGenres, 'Genres sélectionnés:', window.selectedGenres);
        }
        
        
        return matchesGenre;
    });
    
    console.log('🔍 Animes filtrés:', filteredAnimes.length, 'résultats');
    if (filteredAnimes.length > 0) {
        console.log('✅ [APPLY GENRE FILTER] Exemples d\'animes filtrés:', filteredAnimes.slice(0, 3).map(a => ({
            titre: a.titre || a.title,
            genres: a.genres,
            contentType: a.contentType
        })));
    } else {
        console.warn('⚠️ [APPLY GENRE FILTER] Aucun anime trouvé. Vérification des notes...');
        console.warn('📊 [APPLY GENRE FILTER] Total de notes:', notesToFilter.length);
        console.warn('📊 [APPLY GENRE FILTER] Genres recherchés:', window.selectedGenres);
        console.warn('📊 [APPLY GENRE FILTER] Type recherché:', window.selectedType);
        // Afficher les genres de tous les animes pour déboguer
        console.warn(`📊 [APPLY GENRE FILTER] Vérification de ${notesToFilter.length} animes...`);
        notesToFilter.forEach((anime, idx) => {
            let animeType = anime.contentType || (anime.isManga ? 'manga' : 'anime');
            
            // Utiliser la même logique de détection que dans le filtre
            if (!anime.contentType && window.selectedType === 'manga') {
                const titreLower = (anime.titre || anime.title || anime.name || '').toLowerCase();
                if (titreLower.includes('manga') || anime.isManga) {
                    animeType = 'manga';
                }
            }
            
            const acceptableMangaTypes = ['manga', 'doujin', 'manhwa', 'manhua'];
            let shouldCheck = true;
            if (window.selectedType && window.selectedType !== 'tous') {
                if (window.selectedType === 'manga') {
                    shouldCheck = acceptableMangaTypes.includes(animeType);
                } else {
                    shouldCheck = animeType === window.selectedType;
                }
            }
            
            // Extraire les genres pour l'affichage
            let genresDisplay = anime.genres || [];
            if (Array.isArray(genresDisplay)) {
                genresDisplay = genresDisplay.map(g => {
                    if (typeof g === 'object' && g !== null) {
                        return g.name || g.genre || g.title || String(g);
                    }
                    return String(g);
                });
            }
            
            console.warn(`📊 [APPLY GENRE FILTER] Anime ${idx + 1}/${notesToFilter.length}: "${anime.titre || anime.title}" - Genres:`, genresDisplay, `- Type: ${animeType} - Vérifié: ${shouldCheck}`);
        });
    }
    
    // Si aucun résultat trouvé, afficher un message informatif
    if (filteredAnimes.length === 0 && window.selectedGenres && window.selectedGenres.length > 0) {
        console.warn('⚠️ Aucun anime trouvé avec les genres sélectionnés. Cela peut être dû à des genres incomplets dans les notes stockées.');
        console.warn('💡 Suggestion: Les genres peuvent être mis à jour en modifiant une note existante.');
    }
    
    // === TRI PAR NOTE POUR LES CONTAINERS GENRE ===
    // Initialiser genreSortOrder à 'desc' par défaut si non défini
    if (!window.genreSortOrder) {
        window.genreSortOrder = 'desc';
    }
    
    filteredAnimes.sort((a, b) => {
        let noteA = typeof a.note === 'string' ? parseInt(a.note, 10) : a.note;
        let noteB = typeof b.note === 'string' ? parseInt(b.note, 10) : b.note;
        noteA = isNaN(noteA) ? 0 : noteA;
        noteB = isNaN(noteB) ? 0 : noteB;
        
        if (window.genreSortOrder === 'asc') {
            // Ordre croissant : notes les plus basses en premier
            return noteA - noteB;
        } else {
            // Ordre décroissant : notes les plus hautes en premier (par défaut)
            return noteB - noteA;
        }
        });
        
    console.log(`🔍 Tri appliqué pour containers de genre: ${window.genreSortOrder} - ${filteredAnimes.length} animes triés`);
    
    // Créer le grand conteneur pour les animes filtrés
    const genreContainer = document.createElement('div');
    genreContainer.id = 'genre-filtered-container';
    // S'assurer que le conteneur est visible et garde toujours la même largeur
    genreContainer.style.display = 'block';
    genreContainer.style.visibility = 'visible';
    genreContainer.style.opacity = '1';
    genreContainer.style.width = '98%';
    genreContainer.style.maxWidth = '1114px';
    genreContainer.style.margin = '1rem auto';
    genreContainer.style.boxSizing = 'border-box';
    genreContainer.style.position = 'relative';
    genreContainer.style.zIndex = '1';
    
    // Ajouter un titre pour indiquer le genre sélectionné
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = `
            width: 98%;
            max-width: 98%;
            text-align: center;
            padding: 2rem 2rem 1rem 2rem;
            color: #00b894;
            font-size: 1.5rem;
            font-weight: bold;
            background: #23262f;
            margin: 1rem auto;
            box-sizing: border-box;
            border-radius: 18px;
        `;
        var typeLabel = _profileT('genre.type_label') || 'Type :';
        var ofGenre = _profileT('genre.of_genre') || 'du genre :';
        var typeVal = window.selectedType === 'manga' ? (_profileT('genre.content_mangas') || 'manga') : window.selectedType === 'anime' ? (_profileT('genre.content_animes') || 'anime') : window.selectedType === 'film' ? (_profileT('genre.content_films') || 'film') : window.selectedType === 'manhwa' ? (_profileT('genre.content_manhwa') || 'manhwa') : window.selectedType === 'manhua' ? (_profileT('genre.content_manhua') || 'manhua') : window.selectedType;
        var typeText = window.selectedType && window.selectedType !== 'tous' ? ' (' + typeLabel + ' ' + typeVal + ')' : '';
        const selectedGenres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
        const isMangaGenre = selectedGenres.some(g => ['Doujin', 'Manhwa', 'Manhua'].includes(g));
        var contentType = window.selectedType && window.selectedType !== 'tous' ? 
            (window.selectedType === 'manga' || isMangaGenre ? (_profileT('genre.content_mangas') || 'Mangas') : 
             window.selectedType === 'anime' ? (_profileT('genre.content_animes') || 'Animes') : 
             window.selectedType === 'film' ? (_profileT('genre.content_films') || 'Films') : (_profileT('genre.content_contents') || 'Contenus')) : 
            (isMangaGenre ? (_profileT('genre.content_mangas') || 'Mangas') : (_profileT('genre.content_contents') || 'Contenus'));
        const genresText = selectedGenres.length > 0 ? selectedGenres.join(', ') : (_profileT('genre.content_all') || 'Tous');
        titleDiv.textContent = contentType + ' ' + ofGenre + ' ' + genresText + typeText;
        genreContainer.appendChild(titleDiv);
        
        // Conteneur pour les cartes avec pagination
        const cardsContainer = document.createElement('div');
        cardsContainer.id = 'genre-cards-container';
        cardsContainer.className = 'genre-filtered-cards';
        cardsContainer.style.cssText = `
        display: flex !important;
        flex-wrap: wrap;
        gap: 15px;
        justify-content: center;
        align-items: flex-start;
        padding: 2rem;
        min-height: 400px;
        width: 100%;
        max-width: 1114px;
        overflow: visible;
        background: #23262f;
        border-radius: 18px;
        margin: 0 auto;
        box-sizing: border-box;
        position: relative;
        visibility: visible !important;
        opacity: 1 !important;
    `;
    genreContainer.appendChild(cardsContainer);
    console.log('✅ [APPLY GENRE FILTER] cardsContainer créé et ajouté au genreContainer');
        
        // Système de pagination
        const pageSize = 150; // 150 cartes par page
        let currentPage = 1;
        const totalPages = Math.ceil(filteredAnimes.length / pageSize);
        
        function renderGenrePage(page) {
        cardsContainer.innerHTML = '';
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const pageAnimes = filteredAnimes.slice(start, end);
        
        console.log(`📄 [APPLY GENRE FILTER] Page ${page}: ${pageAnimes.length} animes à afficher sur ${filteredAnimes.length} total`);
        
        if (pageAnimes.length === 0 && page === 1) {
            console.warn('⚠️ [APPLY GENRE FILTER] Aucun anime à afficher pour la première page');
            const noResultsMsg = document.createElement('div');
            noResultsMsg.style.cssText = `
                width: 100%;
                text-align: center;
                padding: 3rem;
                color: #00b894;
                font-size: 1.2rem;
                font-weight: 600;
            `;
            noResultsMsg.textContent = `Aucun ${window.selectedType || 'contenu'} trouvé avec les genres sélectionnés : ${Array.isArray(window.selectedGenres) ? window.selectedGenres.join(', ') : ''}`;
            cardsContainer.appendChild(noResultsMsg);
            return;
        }
        
            // Créer les cartes de manière asynchrone pour pouvoir attendre getUserTop10
            (async () => {
                for (const anime of pageAnimes) {
                    const index = pageAnimes.indexOf(anime);
                    console.log(`🎴 [APPLY GENRE FILTER] Création carte ${index + 1}/${pageAnimes.length}: ${anime.titre || anime.title || 'Sans titre'}`);
                    const titre = anime.titre || anime.title || anime.name || "Titre inconnu";
                    const image = anime.image || anime.img || anime.cover || "";
                    let genres = anime.genres;
                    let synopsis = anime.synopsis || anime.synopsisPerso;
                    
                    if (!synopsis) {
                        const found = animes.find(a => (a.id === anime.id || a.titre === titre || (a.titre && a.titre.toLowerCase() === titre.toLowerCase())));
                        if (found && found.synopsis) synopsis = found.synopsis;
                    }
                    
                    if (!genres || !Array.isArray(genres) || genres.length === 0) {
                        if (titre.toLowerCase().includes("death note")) {
                            genres = ["Mystère", "Psychologique", "Surnaturel", "Thriller", "Shonen"];
                        } else if (titre.toLowerCase().includes("attaque des titans")) {
                            genres = ["Action", "Drame", "Fantastique", "Shonen"];
                        } else if (titre.toLowerCase().includes("naruto")) {
                            genres = ["Action", "Aventure", "Comédie", "Drame", "Fantastique", "Shonen"];
                        } else if (titre.toLowerCase().includes("one piece")) {
                            genres = ["Action", "Aventure", "Comédie", "Fantastique", "Shonen"];
                        } else {
                            genres = ["Genre inconnu"];
                        }
                    }
                    
                    if (!synopsis) {
                        synopsis = (typeof window.t === 'function' && window.t('no_synopsis_available')) || "Synopsis non renseigné.";
                    }
                    
                    // Générer le lien vers la page de détails avec l'ID et le type
                    // TOUJOURS utiliser anime-details.html, même si anime.page existe (pour éviter les anciens liens)
                    const animeIdForLink = anime.id || anime.mal_id || anime.malId || '';
                    const contentTypeForLink = anime.contentType || (anime.isManga ? 'manga' : 'anime');
                    let pageHtml = "#";
                    
                    // Si on a un ID, créer le lien vers anime-details.html
                    if (animeIdForLink) {
                        pageHtml = `anime-details.html?id=${animeIdForLink}&type=${contentTypeForLink}`;
                    }
                    
                    const genresHtml = genres.map(g => {
                        const displayG = getTranslatedGenreForProfile(g);
                        const fontSize = genres.length >= 5 ? '0.75rem' : '0.92rem';
                        const padding = genres.length >= 5 ? '0.1em 0.4em' : '0.15em 0.6em';
                        return `<a href="mangas.html?genre=${encodeURIComponent(g)}" class="profile-genre-link" style="background:#00b89422;color:#00b894;font-weight:600;padding:${padding};border-radius:10px;font-size:${fontSize};letter-spacing:0.01em;text-decoration:none;transition:background 0.2s;" 
                        onclick="event.preventDefault();window.location.href='mangas.html?genre=${encodeURIComponent(g)}';">${displayG}</a>`;
                    }).join('');
                    

                    
                    const card = document.createElement('div');
                    card.className = 'catalogue-card';
                    card.setAttribute('data-anime-id', anime.id);
                    card.setAttribute('draggable', 'true');
                    
                    // Marquer le type de la carte pour le filtrage
                    if (anime.isManga) {
                        card.setAttribute('data-is-manga', 'true');
                        card.classList.add('manga-card');
                    }
                    card.style.cssText = `
                background: linear-gradient(135deg, #23262f 80%, #00b89422 100%);
                border: 2.5px solid #00b894;
                border-radius: 18px;
                box-shadow: 0 4px 18px #00b89433, 0 2px 8px #0008;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                padding: 1.1rem 1.1rem 1rem 1.1rem;
                height: 520px;
                width: 340px;
                margin: 0;
                overflow: visible;
                transition: box-shadow 0.2s, transform 0.2s;
                position: relative;
                flex: 0 0 340px;
                box-sizing: border-box;
                z-index: 1;
            `;
                    
                    const uniqueId = `morebtn-${Date.now()}-${Math.floor(Math.random()*100000)}`;
                    card.innerHTML = `
                <button class="card-more-btn" id="${uniqueId}" aria-label="Plus d'options" style="
                    position: absolute;
                    top: 12px;
                    right: 14px;
                    width: 32px;
                    height: 32px;
                    background: #f8f9fa;
                    border: 1.5px solid #00b894;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px #0002;
                    color: #444;
                    font-size: 1.3rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 10;
                    transition: border-color 0.18s, background 0.18s;
                    outline: none;
                    padding: 0;
                    pointer-events: auto;
                    user-select: none;
                ">
                    &#8230;
                </button>
                <div class="card-more-menu" style="
                    display: none;
                    position: absolute;
                    top: 46px;
                    right: 0;
                    background: #fff;
                    color: #00b894;
                    font-size: 1rem;
                    font-weight: bold;
                    border-radius: 8px;
                    box-shadow: 0 4px 16px #0002;
                    padding: 7px 18px;
                    white-space: nowrap;
                    z-index: 20;
                    border: 1.5px solid #00b894;
                    min-width: 110px;
                    text-align: center;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.25s;
                    visibility: hidden;
                ">
                    <div class="select-top10-btn" style="cursor:pointer;padding:6px 0;pointer-events:auto;color:#00b894;font-weight:bold;font-size:0.9rem;transition:background-color 0.2s;" onmouseover="this.style.backgroundColor='#00b89420'" onmouseout="this.style.backgroundColor='transparent'">${getAddToTop10Label()}</div>
                </div>
                <img src="${image}" alt="${titre}" style="width:140px;height:185px;object-fit:cover;display:block;object-position:center center;margin:0 auto 1rem auto;border-radius:10px;box-shadow:0 2px 12px #00b89455;align-self:center;">
                <a href="${pageHtml}" style="font-size:1.15rem;margin-bottom:0.5rem;color:#00b894;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;display:block;transition:color 0.2s;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" onmouseover="this.style.color='#00d4aa'" onmouseout="this.style.color='#00b894'">${titre}</a>
                <div class="content-synopsis profile-card-synopsis" style="color:#b3e6b3;font-size:0.98rem;line-height:1.5;text-align:center;margin-bottom:0.7rem;">${truncateSynopsis(synopsis)}</div>
                <div class="anime-genres" style="display:flex;flex-wrap:wrap;gap:0.3rem;justify-content:center;margin-bottom:0.5rem;">
                    ${genresHtml}
                </div>
                <div style="color:#00b894;font-size:1.1rem;font-weight:bold;text-align:center;">
                    ${_profileT('profile.rating_label') || 'Note'}: ${anime.note || (_profileT('profile.not_rated') || 'Non noté')}/10
                </div>
                    `;
                    
                    // S'assurer que le lien du titre fonctionne correctement
                    const titleLink = card.querySelector('a[href*="anime-details"], a[href*="manga-details"], a[href]');
                    if (titleLink) {
                        const href = titleLink.getAttribute('href');
                        console.log('🔗 [TITLE LINK] Lien trouvé pour carte:', titre, 'href:', href);
                        
                        // Forcer le clic sur le lien
                        titleLink.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            
                            const linkHref = this.getAttribute('href');
                            console.log('🖱️ [TITLE CLICK] Clic sur titre:', titre, 'href:', linkHref);
                            
                            if (linkHref && linkHref !== '#') {
                                console.log('✅ [TITLE CLICK] Redirection vers:', linkHref);
                                window.location.href = linkHref;
                            } else {
                                console.warn('⚠️ [TITLE CLICK] Lien invalide ou vide:', linkHref);
                            }
                            return false;
                        }, true); // Utiliser capture phase pour s'exécuter en premier
                        
                        // S'assurer que le lien est cliquable
                        titleLink.style.position = 'relative';
                        titleLink.style.zIndex = '100';
                        titleLink.style.pointerEvents = 'auto';
                        titleLink.style.cursor = 'pointer';
                    } else {
                        console.warn('⚠️ [TITLE LINK] Aucun lien trouvé pour carte:', titre);
                    }
                    
                    // Ajouter les événements pour le menu "plus d'options"
                    const moreBtn = card.querySelector('.card-more-btn');
                    const moreMenu = card.querySelector('.card-more-menu');
                    
                    if (moreBtn && moreMenu) {
                
                // Supprimer tous les anciens événements
                const newMoreBtn = moreBtn.cloneNode(true);
                moreBtn.parentNode.replaceChild(newMoreBtn, moreBtn);
                
                // Variable pour éviter les clics multiples
                let isMenuOpen = false;
                let clickTimeout = null;
                
                // Attacher l'événement de clic de manière stable
                newMoreBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    
                    // Éviter les clics multiples
                    if (clickTimeout) {
                        clearTimeout(clickTimeout);
                        return;
                    }
                    
                    clickTimeout = setTimeout(() => {
                        clickTimeout = null;
                    }, 100);
                    
                    // Fermer tous les autres menus
                    document.querySelectorAll('.card-more-menu').forEach(menu => {
                        if (menu !== moreMenu) {
                            menu.style.opacity = '0';
                            menu.style.pointerEvents = 'none';
                            menu.style.display = 'none';
                            menu.style.visibility = 'hidden';
                        }
                    });
                    
                    // Ouvrir/fermer ce menu
                    if (!isMenuOpen) {
                        moreMenu.style.display = 'block';
                        moreMenu.style.opacity = '1';
                        moreMenu.style.pointerEvents = 'auto';
                        moreMenu.style.visibility = 'visible';
                        isMenuOpen = true;
                        
                        // Vérifier l'état de l'option "Ajouter au top 10"
                        const selectBtn = moreMenu.querySelector('.select-top10-btn');
                        if (selectBtn) {
                        } else {
                        }
                        
                        // Ajouter le gestionnaire pour fermer le menu avec un délai pour éviter la fermeture immédiate
                        setTimeout(() => {
                        addHideMenuHandler();
                        }, 500); // Délai plus long pour éviter la fermeture immédiate
                    } else {
                        // Fermer le menu immédiatement
                        moreMenu.style.opacity = '0';
                        moreMenu.style.pointerEvents = 'none';
                        moreMenu.style.display = 'none';
                        moreMenu.style.visibility = 'hidden';
                        isMenuOpen = false;
                        
                        // Supprimer le gestionnaire de fermeture
                        if (hideMenuHandler) {
                            document.removeEventListener('click', hideMenuHandler);
                            hideMenuHandler = null;
                        }
                    }
                });
                
                // Empêcher la fermeture automatique du menu
                moreMenu.addEventListener('mouseenter', function(e) {
                    e.stopPropagation();
                    isMenuOpen = true;
                });
                
                moreMenu.addEventListener('mouseleave', function(e) {
                    e.stopPropagation();
                    // Ne pas fermer automatiquement
                });
                
                // Supprimer complètement les événements de survol pour éviter les conflits
                // Les boutons restent stables visuellement
                
                // Action "Ajouter au top 10" - Utiliser la délégation d'événements pour s'assurer que ça fonctionne
                const selectBtn = moreMenu.querySelector('.select-top10-btn');
                if (selectBtn) {
                    
                    // Supprimer tous les anciens événements en clonant le bouton
                    const newSelectBtn = selectBtn.cloneNode(true);
                    selectBtn.parentNode.replaceChild(newSelectBtn, selectBtn);
                    
                    // Attacher l'événement avec capture pour une priorité élevée
                    newSelectBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        
                        
                        // Supprimer le gestionnaire de fermeture avant de traiter le clic
                        if (hideMenuHandler) {
                            document.removeEventListener('click', hideMenuHandler);
                            hideMenuHandler = null;
                        }
                        
                        // Vérifier que le menu est visible avant de traiter le clic
                        if (moreMenu.style.opacity === '0' || moreMenu.style.display === 'none' || moreMenu.style.visibility === 'hidden') {
                            return;
                        }
                        
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
                            
                            // Si la carte est dans le conteneur de recherche, définir le contexte Top 10 (genre/type)
                            const isInSearchContainer = card.closest('#search-results-container') || card.closest('#search-cards-container');
                            if (isInSearchContainer) {
                                window.top10Context = {
                                    genre: Array.isArray(window.selectedGenres) ? window.selectedGenres : [],
                                    type: window.selectedType || null,
                                    isGenreContext: true
                                };
                            }
                            
                            // Afficher l'interface en miniature après un court délai pour s'assurer que la carte est bien sélectionnée
                            setTimeout(() => {
                                if (window.selectedTop10Card && window.selectedTop10Card === card) {
                                    if (typeof showTop10MiniInterface === 'function') {
                                        showTop10MiniInterface().catch(err => {
                                            console.error('🔘 ERREUR lors de l\'appel de showTop10MiniInterface:', err);
                                        });
                                    } else {
                                        console.error('🔘 ERREUR: showTop10MiniInterface n\'est pas une fonction');
                                    }
                                } else {
                                    console.error('🔘 ERREUR: window.selectedTop10Card est null ou différent après délai');
                                }
                            }, 50);
                            
                        }
                        
                        // Fermer le menu immédiatement
                        moreMenu.style.opacity = '0';
                        moreMenu.style.pointerEvents = 'none';
                        moreMenu.style.display = 'none';
                        moreMenu.style.visibility = 'hidden';
                        isMenuOpen = false;
                    }, true); // true = capture phase pour une priorité élevée
                } else {
                }
                    }
                    
                    // Drag & drop events
                    card.addEventListener('dragstart', function(e) {
                // Vérifier si la carte a été sélectionnée via le menu contextuel
                if (window.selectedTop10Card !== card) {
                    e.preventDefault();
                    // Afficher un message d'aide
                    const helpMsg = document.createElement('div');
                    helpMsg.id = 'drag-select-help-msg';
                    helpMsg.textContent = 'Veuillez d\'abord cliquer sur les trois points puis sur "Placer" pour déplacer cette carte.';
                    helpMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#ff6b6b;color:#fff;padding:12px 28px;border-radius:12px;font-size:1.15rem;z-index:9999;box-shadow:0 2px 12px #ff6b6b77;';
                    document.body.appendChild(helpMsg);
                    setTimeout(() => { helpMsg.remove(); }, 3000);
                    return false;
                }
                
                // Si la carte est sélectionnée, permettre le glisser-déposer
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    animeId: anime.id,
                    source: 'menu-selected',
                    isManga: anime.isManga || false
                }));
                setAnimeCardSelection(card, true);
                
                // Ajouter un effet visuel pendant le glisser
                e.currentTarget.style.opacity = '0.5';
            });
            card.addEventListener('dragend', function(e) {
                setAnimeCardSelection(card, false);
                // Restaurer l'opacité de la carte
                e.currentTarget.style.opacity = '1';
                    });
                    
                    // === EMPÊCHER LE DROP DANS LES CONTAINERS DE GENRE ===
                    // Désactiver le drop sur les containers de genre
                    const genreContainer = card.closest('#genre-filtered-container, #genre-cards-container');
                    if (genreContainer) {
                        genreContainer.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Empêcher le drop dans les containers de genre
                    e.dataTransfer.dropEffect = 'none';
                });
                
                genreContainer.addEventListener('drop', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Afficher un message d'erreur
                    const errorMsg = document.createElement('div');
                    errorMsg.id = 'drop-error-msg';
                    errorMsg.textContent = 'Les cartes ne peuvent être placées que dans le top 10 !';
                    errorMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#ff6b6b;color:#fff;padding:12px 28px;border-radius:12px;font-size:1.15rem;z-index:9999;box-shadow:0 2px 12px #ff6b6b77;';
                    document.body.appendChild(errorMsg);
                    setTimeout(() => { errorMsg.remove(); }, 3000);
                    
                    // Réinitialiser la sélection
                    if (window.selectedTop10Card) {
                        setAnimeCardSelection(window.selectedTop10Card, false);
                        window.selectedTop10Card = null;
                    }
                        });
                    }
                    
                    
                    cardsContainer.appendChild(card);
                    console.log(`✅ [APPLY GENRE FILTER] Carte ${index + 1} ajoutée: ${anime.titre || anime.title || 'Sans titre'}`);
                }
            })(); // Fin de la fonction async pour créer les cartes
        
            console.log(`✅ [APPLY GENRE FILTER] ${pageAnimes.length} cartes ajoutées au conteneur. Total dans cardsContainer: ${cardsContainer.children.length}`);
            
            // Créer la pagination si nécessaire
            if (totalPages > 1) {
            const paginationContainer = document.createElement('div');
            paginationContainer.style.cssText = `
                width: 98%;
                max-width: 98%;
                display: flex;
                justify-content: center;
                gap: 8px;
                padding: 2rem;
                background: #23262f;
                border-top: 1px solid #333;
                overflow-x: auto;
                box-sizing: border-box;
                margin: 0 auto;
            `;
            
            // Bouton précédent
            if (page > 1) {
                const prevBtn = document.createElement('button');
                prevBtn.textContent = _profileT('common.pagination_prev') || '← Précédent';
                prevBtn.style.cssText = `
                    background: #00b894;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    font-weight: bold;
                    transition: background 0.2s;
                `;
                prevBtn.onclick = () => {
                    currentPage = page - 1;
                    renderGenrePage(currentPage);
                };
                paginationContainer.appendChild(prevBtn);
            }
            
            // Numéros de pages
            for (let i = 1; i <= totalPages; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.textContent = i;
                pageBtn.style.cssText = `
                    background: ${i === page ? '#00b894' : '#333'};
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 0.5rem 0.8rem;
                    cursor: pointer;
                    font-weight: bold;
                    transition: background 0.2s;
                    margin: 0 2px;
                `;
                pageBtn.onclick = () => {
                    currentPage = i;
                    renderGenrePage(currentPage);
                };
                paginationContainer.appendChild(pageBtn);
            }
            
            // Bouton suivant
            if (page < totalPages) {
                const nextBtn = document.createElement('button');
                nextBtn.textContent = _profileT('common.pagination_next') || 'Suivant →';
                nextBtn.style.cssText = `
                    background: #00b894;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    font-weight: bold;
                    transition: background 0.2s;
                `;
                nextBtn.onclick = () => {
                    currentPage = page + 1;
                    renderGenrePage(currentPage);
                };
                paginationContainer.appendChild(nextBtn);
            }
            
            // Supprimer l'ancienne pagination si elle existe
            const oldPagination = genreContainer.querySelector('.genre-pagination');
            if (oldPagination) {
                oldPagination.remove();
            }
            
                paginationContainer.className = 'genre-pagination';
                genreContainer.appendChild(paginationContainer);
            } else {
                // Supprimer la pagination si elle n'est plus nécessaire
                const oldPagination = genreContainer.querySelector('.genre-pagination');
                if (oldPagination) {
                    oldPagination.remove();
                }
            }
            // Réappliquer la traduction des synopsis après changement de page
            setTimeout(function() {
                if (typeof window.translateSynopses === 'function') {
                    window.translateSynopses(localStorage.getItem('mangaWatchLanguage') || 'fr');
                }
            }, 350);
        }
        
        // Afficher la première page
        console.log(`🎨 [APPLY GENRE FILTER] Rendu de la page ${currentPage} avec ${filteredAnimes.length} animes filtrés`);
        renderGenrePage(currentPage);
        console.log(`✅ [APPLY GENRE FILTER] Page rendue. Nombre de cartes dans cardsContainer: ${cardsContainer.children.length}`);
        
        // Insérer le conteneur avant le container de recherche (pour qu'il soit au-dessus)
        const reviewsSection = document.getElementById('reviews-section');
        if (reviewsSection) {
            console.log('✅ [APPLY GENRE FILTER] reviews-section trouvé');
            // Toujours insérer après le container de sélection de genres (genre-sort-container) mais avant le container de recherche
            const sortBtnContainer = reviewsSection.querySelector('div[style*="sticky"]');
            const genreSortContainer = document.getElementById('genre-sort-container'); // Conteneur de sélection de genres
            const searchResultsContainer = document.getElementById('search-results-container');
            
            // Vérifier que le container de genres n'est pas déjà avant le container de recherche
            const existingGenreContainer = document.getElementById('genre-filtered-container');
            if (existingGenreContainer && existingGenreContainer !== genreContainer) {
                // Si un autre container de genres existe déjà, le supprimer
                existingGenreContainer.remove();
            }
            
            // Si le conteneur de sélection de genres existe, insérer le conteneur filtré APRÈS lui
            if (genreSortContainer && genreSortContainer.parentNode === reviewsSection) {
                // Insérer après le conteneur de sélection de genres
                if (genreSortContainer.nextSibling) {
                    reviewsSection.insertBefore(genreContainer, genreSortContainer.nextSibling);
                } else {
                    reviewsSection.appendChild(genreContainer);
                }
            } else if (searchResultsContainer && searchResultsContainer.parentNode === reviewsSection) {
                // Si le container de recherche existe et est dans le DOM, insérer avant lui
                reviewsSection.insertBefore(genreContainer, searchResultsContainer);
            } else if (sortBtnContainer) {
                // Insérer après le container de boutons de tri
                if (sortBtnContainer.nextSibling) {
                    reviewsSection.insertBefore(genreContainer, sortBtnContainer.nextSibling);
                } else {
                    reviewsSection.appendChild(genreContainer);
                }
            } else {
                reviewsSection.appendChild(genreContainer);
            }
            
            console.log('✅ [APPLY GENRE FILTER] Conteneur de genre filtré inséré avec', filteredAnimes.length, 'animes');
            console.log('📦 [APPLY GENRE FILTER] Vérification du conteneur après insertion:');
            console.log('  - genreContainer existe:', !!genreContainer);
            console.log('  - genreContainer dans le DOM:', document.body.contains(genreContainer));
            console.log('  - cardsContainer existe:', !!cardsContainer);
            console.log('  - Nombre de cartes dans cardsContainer:', cardsContainer ? cardsContainer.children.length : 0);
            if (genreContainer) {
                const computedStyle = window.getComputedStyle(genreContainer);
                console.log('  - Style display:', computedStyle.display);
                console.log('  - Style visibility:', computedStyle.visibility);
                console.log('  - Style opacity:', computedStyle.opacity);
                console.log('  - Style width:', computedStyle.width);
                console.log('  - Style height:', computedStyle.height);
            }
            
            // Vérifier que les cartes sont bien dans le DOM
            setTimeout(() => {
                const cardsInDOM = document.querySelectorAll('#genre-cards-container .catalogue-card');
                console.log('🔍 [APPLY GENRE FILTER] Vérification après 100ms:');
                console.log('  - Cartes trouvées dans le DOM:', cardsInDOM.length);
                if (cardsInDOM.length === 0 && filteredAnimes.length > 0) {
                    console.error('❌ [APPLY GENRE FILTER] PROBLÈME: Des animes sont filtrés mais aucune carte dans le DOM!');
                    console.error('  - filteredAnimes.length:', filteredAnimes.length);
                    console.error('  - cardsContainer.children.length:', cardsContainer ? cardsContainer.children.length : 0);
                }
            }, 100);
        } else {
            console.error('❌ [APPLY GENRE FILTER] reviews-section non trouvé');
        }
        
        // Masquer le bouton reset dès qu'un genre est sélectionné
        if (typeof resetButton !== 'undefined') resetButton.style.display = 'none';
        
        // Mettre à jour les containers d'étoiles pour s'assurer qu'ils sont synchronisés
        setTimeout(() => {
            if (!isDisplayingNotes) {
                displayUserAnimeNotes();
            }
        }, 100);
    })(); // Fermeture de la fonction async pour applyGenreFilter
    
    // Gestionnaire d'événement global avec délégation pour capturer tous les clics sur "Ajouter au top 10"
    // Cela garantit que les événements fonctionnent même si les cartes sont créées dynamiquement
    if (!window.top10ButtonGlobalHandlerAdded) {
        
        // Test 1: Vérifier si des boutons existent déjà dans le DOM
        const existingButtons = document.querySelectorAll('.select-top10-btn');
        if (existingButtons.length > 0) {
        }
        
        // Gestionnaire pour TOUS les clics (pour déboguer)
        document.addEventListener('click', function(e) {
            // Log tous les clics pour voir ce qui se passe
            const target = e.target;
            const targetClasses = target.classList ? Array.from(target.classList) : [];
            const targetText = target.textContent || '';
            
            // Vérifier si c'est un clic sur quelque chose qui ressemble au bouton
            if (targetText.includes('Ajouter au top 10') || 
                targetClasses.includes('select-top10-btn') ||
                target.closest('.select-top10-btn')) {
            }
            
            // Vérifier si le clic est sur un bouton "Ajouter au top 10"
            const selectBtn = e.target.closest('.select-top10-btn');
            if (selectBtn) {
            } else {
                // Vérifier si l'élément cliqué a la classe directement
                if (e.target.classList && e.target.classList.contains('select-top10-btn')) {
                }
            }
            
            if (!selectBtn && !(e.target.classList && e.target.classList.contains('select-top10-btn'))) {
                return; // Ce n'est pas un clic sur le bouton
            }
            
            const finalSelectBtn = selectBtn || e.target;
            
            // Trouver la carte parente
            const card = selectBtn.closest('.catalogue-card[data-anime-id]');
            if (!card) {
                console.error('🔘 ERREUR: Carte parente non trouvée');
                return;
            }
            
            const moreMenu = card.querySelector('.card-more-menu');
            if (!moreMenu) {
                console.error('🔘 ERREUR: Menu non trouvé');
                return;
            }
            
            // Vérifier que le menu est visible
            if (moreMenu.style.opacity === '0' || moreMenu.style.display === 'none' || moreMenu.style.visibility === 'hidden') {
                return;
            }
            
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
                
                
                // Afficher l'interface en miniature
                setTimeout(() => {
                    if (window.selectedTop10Card && window.selectedTop10Card === card) {
                        if (typeof showTop10MiniInterface === 'function') {
                            showTop10MiniInterface().catch(err => {
                                console.error('🔘 ERREUR lors de l\'appel de showTop10MiniInterface:', err);
                            });
                        } else {
                            console.error('🔘 ERREUR: showTop10MiniInterface n\'est pas une fonction');
                        }
                    } else {
                        console.error('🔘 ERREUR: window.selectedTop10Card est null ou différent après délai');
                    }
                }, 50);
            }
            
            // Fermer le menu
            moreMenu.style.opacity = '0';
            moreMenu.style.pointerEvents = 'none';
            moreMenu.style.display = 'none';
            moreMenu.style.visibility = 'hidden';
        }, true); // true = capture phase pour une priorité élevée
        
        // Test 2: Vérifier périodiquement si de nouveaux boutons sont ajoutés
        setInterval(() => {
            const buttons = document.querySelectorAll('.select-top10-btn');
            if (buttons.length !== (window.lastButtonCount || 0)) {
                window.lastButtonCount = buttons.length;
                
                // Tester si un bouton est cliquable
                if (buttons.length > 0) {
                    const testBtn = buttons[0];
                    console.log('🔍 Test du bouton:', {
                        exists: !!testBtn,
                        inDOM: document.body.contains(testBtn),
                        visible: testBtn.offsetParent !== null,
                        pointerEvents: window.getComputedStyle(testBtn).pointerEvents,
                        display: window.getComputedStyle(testBtn).display,
                        visibility: window.getComputedStyle(testBtn).visibility,
                        opacity: window.getComputedStyle(testBtn).opacity
                    });
                }
            }
        }, 2000); // Vérifier toutes les 2 secondes
        
        window.top10ButtonGlobalHandlerAdded = true;
        window.lastButtonCount = existingButtons.length;
    } else {
    }
    
    console.log('✅ createStarBadges terminée avec succès');
    return true;
}

// Initialiser le gestionnaire global IMMÉDIATEMENT (pas dans createStarBadges)
(function initGlobalTop10Handler() {
    
    if (!window.top10ButtonGlobalHandlerAdded) {
        
        // Gestionnaire pour TOUS les clics
        document.addEventListener('click', function(e) {
            const target = e.target;
            const targetText = target.textContent || '';
            const targetClasses = target.classList ? Array.from(target.classList) : [];
            
            // Log tous les clics qui pourraient être sur le bouton
            if (targetText.includes('Ajouter au top 10') || 
                targetText.includes('top 10') ||
                targetClasses.includes('select-top10-btn')) {
            }
            
            // Vérifier si le clic est sur un bouton "Ajouter au top 10"
            const selectBtn = target.closest('.select-top10-btn');
            if (!selectBtn && !targetClasses.includes('select-top10-btn')) {
                return; // Ce n'est pas un clic sur le bouton
            }
            
            const finalSelectBtn = selectBtn || target;
            
            // Trouver la carte parente
            const card = finalSelectBtn.closest('.catalogue-card[data-anime-id]');
            if (!card) {
                console.error('🔘 ERREUR: Carte parente non trouvée');
                return;
            }
            
            
            const moreMenu = card.querySelector('.card-more-menu');
            if (!moreMenu) {
                console.error('🔘 ERREUR: Menu non trouvé');
                return;
            }
            
            // Vérifier que le menu est visible
            if (moreMenu.style.opacity === '0' || moreMenu.style.display === 'none' || moreMenu.style.visibility === 'hidden') {
                return;
            }
            
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
                
                // Si la carte est dans le conteneur de recherche, définir le contexte Top 10 (genre/type)
                // pour que l'ajout se fasse dans le Top 10 du genre sélectionné
                const isInSearchContainer = card.closest('#search-results-container') || card.closest('#search-cards-container');
                if (isInSearchContainer) {
                    window.top10Context = {
                        genre: Array.isArray(window.selectedGenres) ? window.selectedGenres : [],
                        type: window.selectedType || null,
                        isGenreContext: true
                    };
                }
                
                // Afficher l'interface en miniature
                setTimeout(() => {
                    if (window.selectedTop10Card && window.selectedTop10Card === card) {
                        if (typeof showTop10MiniInterface === 'function') {
                            showTop10MiniInterface().catch(err => {
                                console.error('🔘 ERREUR lors de l\'appel de showTop10MiniInterface:', err);
                            });
                        } else {
                            console.error('🔘 ERREUR: showTop10MiniInterface n\'est pas une fonction');
                        }
                    } else {
                        console.error('🔘 ERREUR: window.selectedTop10Card est null ou différent après délai');
                    }
                }, 50);
            }
            
            // Fermer le menu
            moreMenu.style.opacity = '0';
            moreMenu.style.pointerEvents = 'none';
            moreMenu.style.display = 'none';
            moreMenu.style.visibility = 'hidden';
        }, true); // true = capture phase pour une priorité élevée
        
        window.top10ButtonGlobalHandlerAdded = true;
    } else {
    }
})();

// Appeler createStarBadges une seule fois au chargement de la page
// DÉSACTIVÉ pour éviter les appels automatiques - les fonctions seront appelées manuellement depuis profil.html
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', function() {
//         if (typeof window.createStarBadges === 'function') {
//             window.createStarBadges();
//         }
//         // Mettre à jour les contentType des notes existantes
//         if (typeof updateExistingNotesContentType === 'function') {
//             updateExistingNotesContentType();
//         }
//         // Afficher les notes utilisateur après création des badges
//         setTimeout(() => {
//             if (typeof window.displayUserAnimeNotes === 'function') {
//                 window.displayUserAnimeNotes();
//             }
//         }, 500);
//     });
// } else {
//     if (typeof window.createStarBadges === 'function') {
//         window.createStarBadges();
//     }
//     // Mettre à jour les contentType des notes existantes
//     if (typeof updateExistingNotesContentType === 'function') {
//         updateExistingNotesContentType();
//     }
//     // Afficher les notes utilisateur après création des badges
//     setTimeout(() => {
//         if (typeof window.displayUserAnimeNotes === 'function') {
//             window.displayUserAnimeNotes();
//         }
//     }, 500);
// }

// Variable globale pour éviter les appels multiples
let isDisplayingNotes = false;

// Variable globale pour les animes (correction de l'erreur)
let animes = [];

// Fonction pour appliquer le filtre par type sur tous les containers
function applyTypeFilter() {
    // Protection contre les appels multiples
    if (window.isApplyingTypeFilter) {
        console.log('🔍 applyTypeFilter déjà en cours, ignoré');
        return;
    }
    
    // Protection contre les rechargements multiples (très souple)
    if (window.isApplyingTypeFilter && Date.now() - window.lastTypeFilterTime < 100) {
        console.log('applyTypeFilter appelé trop rapidement, ignoré');
        return;
    }
    
    window.isApplyingTypeFilter = true;
    window.lastTypeFilterTime = Date.now();
    
    // console.log('🔍 applyTypeFilter appelée avec selectedType:', window.selectedType);
    
    // Ne pas forcer un type par défaut - permettre "Tous types"
    // window.selectedType peut être null, 'tous', 'Tous types', ou un type spécifique
    
            // Si un genre est sélectionné, réappliquer le filtre de genre après le filtre de type
        if (window.selectedGenre) {
            console.log('Genre sélectionné détecté, réapplication du filtre de genre');
            setTimeout(() => {
                applyGenreFilter();
                window.isApplyingTypeFilter = false;
            }, 50); // Réduit de 100ms à 50ms
            return;
        }
    
    // Si aucun genre n'est sélectionné, filtrer les cartes existantes
    if (!window.selectedGenre) {
        // Vérifier si un type spécifique est sélectionné
        const selectedType = window.selectedType;
        const isAllTypes = !selectedType || selectedType === 'Tous types' || selectedType === 'tous';
        
        // Si "Tous types" est sélectionné, afficher toutes les cartes
        if (isAllTypes) {
            const starContainers = document.querySelectorAll('[id^="star-containers"]');
            starContainers.forEach(container => {
                const cards = container.querySelectorAll('.catalogue-card');
                cards.forEach(card => {
                    card.style.display = '';
                    card.style.opacity = '1';
                });
            });
        } else {
            // Vérifier s'il y a des cartes à filtrer
            const allStarContainers = document.querySelectorAll('[id^="star-containers"]');
            
            // Vérifier s'il y a des cartes visibles après filtrage
            const starContainers = document.querySelectorAll('[id^="star-containers"]');
            let hasVisibleCards = false;
            
            // Récupérer les notes pour déterminer le type réel des cartes
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            let allNotes = [];
            if (user && user.email) {
                try {
                    allNotes = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
                } catch (e) {
                    allNotes = [];
                }
            }
            
            starContainers.forEach(container => {
                const cards = container.querySelectorAll('.catalogue-card');
                cards.forEach(card => {
                    const animeId = card.getAttribute('data-anime-id');
                    const isManga = card.hasAttribute('data-is-manga') || card.classList.contains('manga-card');
                    
                    // Trouver la note correspondante pour obtenir le contentType réel
                    const note = allNotes.find(n => String(n.id) === String(animeId));
                    
                    // Déterminer le type de la carte
                    let cardType = 'anime';
                    if (note && note.contentType) {
                        cardType = note.contentType;
                    } else if (isManga) {
                        cardType = 'manga';
                    }
                    
                    // Détecter les types spéciaux par titre/genres si nécessaire
                    if (note) {
                        const titre = (note.titre || note.title || note.name || '').toLowerCase();
                        const genres = (note.genres || []).join(' ').toLowerCase();
                        
                        if (cardType === 'manga' && (
                            titre.includes('doujin') ||
                            titre.includes('totally captivated') ||
                            titre.includes('hentai') ||
                            genres.includes('erotica') ||
                            genres.includes('adult') ||
                            genres.includes('hentai')
                        )) {
                            cardType = 'doujin';
                        } else if (cardType === 'manga' && titre.includes('manhwa')) {
                            cardType = 'manhwa';
                        } else if (cardType === 'manga' && titre.includes('manhua')) {
                            cardType = 'manhua';
                        }
                    }
                    
                    // Afficher/masquer selon le type sélectionné
                    if (cardType === selectedType) {
                        card.style.display = '';
                        card.style.opacity = '1';
                        hasVisibleCards = true;
                    } else {
                        card.style.display = 'none';
                        card.style.opacity = '0';
                    }
                });
            });
        }
        
        // IMPORTANT: Réafficher les containers d'étoiles avec le nouveau type
        // Les cartes anime n'ont peut-être jamais été créées si le type était "manga" au chargement
        // Il faut donc réafficher les containers d'étoiles pour créer les cartes manquantes
        // Mais seulement si on change de type (pas si on reste sur le même type)
        const currentSelectedType = window.selectedType;
        if (currentSelectedType && currentSelectedType !== 'Tous types' && currentSelectedType !== 'tous') {
            setTimeout(() => {
                if (typeof displayUserAnimeNotes === 'function') {
                    console.log(`🔄 [APPLY TYPE FILTER] Réaffichage des containers d'étoiles avec selectedType=${currentSelectedType}`);
                    // Réafficher les containers d'étoiles pour créer les cartes manquantes
                    displayUserAnimeNotes();
                }
            }, 150);
        }
        
        // Mettre à jour le Top 10 avec le nouveau type
        setTimeout(() => {
            renderTop10Slots();
        }, 50); // Réduit à 50ms pour affichage plus rapide
        
        window.isApplyingTypeFilter = false;
        return;
    }
    
    console.log('Type sélectionné:', window.selectedType);
    
    // Réorganiser les cartes filtrées pour remplir correctement les pages
    const allStarContainers = document.querySelectorAll('[id^="star-containers"]');
    const genreContainers = document.querySelectorAll('#genre-filtered-container .catalogue-card, #genre-cards-container .catalogue-card');
    
    // Appliquer le filtre aux containers d'étoiles
    allStarContainers.forEach(container => {
        const animeCards = container.querySelectorAll('.catalogue-card');
        const visibleCards = [];
        const hiddenCards = [];
        
        animeCards.forEach(card => {
            // Récupérer les données de la carte
            const animeId = card.getAttribute('data-anime-id');
            const isManga = card.hasAttribute('data-is-manga') || 
                           card.classList.contains('manga-card') ||
                           (animeId && animeId.includes('manga')) ||
                           card.querySelector('.manga-indicator');
            
            // Vérifier si c'est un manga en regardant les données stockées
            let cardType = 'anime'; // par défaut
            
            // Si c'est un manga (basé sur les attributs de la carte)
            if (isManga) {
                cardType = 'manga';
            } else {
                // Vérifier dans les données stockées si c'est un manga
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                if (user && user.email) {
                    try {
                        const notes = JSON.parse(localStorage.getItem('user_anime_notes_' + user.email) || '[]');
                        const note = notes.find(n => String(n.id) === String(animeId));
                        if (note && note.isManga) {
                            cardType = 'manga';
                        }
    } catch (e) {
                        console.error('Erreur lors de la vérification du type:', e);
                    }
                }
            }
            
            // Vérifier d'autres types si ce n'est pas un manga
            if (cardType === 'anime') {
                if (animeId && animeId.includes('roman')) {
                    cardType = 'roman';
                } else if (animeId && animeId.includes('film')) {
                    cardType = 'film';
                } else if (animeId && animeId.includes('serie')) {
                    cardType = 'serie';
                }
            }
            
            // Détection spéciale pour les doujins
            if (cardType === 'anime' && animeId && (
                animeId.includes('totally') || 
                animeId.includes('doujin') ||
                (card.querySelector('h3') && card.querySelector('h3').textContent.toLowerCase().includes('totally'))
            )) {
                cardType = 'doujin';
            }
            
            // Vérification supplémentaire pour les doujins basée sur le titre
            if (cardType === 'anime') {
                const titleElement = card.querySelector('h3, .card-title, [class*="title"]');
                if (titleElement) {
                    const title = titleElement.textContent.toLowerCase();
                    if (title.includes('totally') || title.includes('doujin')) {
                        cardType = 'doujin';
                    }
                }
            }
            
            if (animeId && (animeId.includes('totally') || animeId.includes('doujin'))) {
            }
            
            
                        // Séparer les cartes visibles et masquées
            if (cardType === window.selectedType) {
                visibleCards.push(card);
                card.style.display = 'block';
                card.style.opacity = '1';
                card.style.visibility = 'visible';
            } else {
                hiddenCards.push(card);
                card.style.display = 'none';
                card.style.opacity = '0';
                card.style.visibility = 'hidden';
            }
        });
        
        // Réorganiser les cartes visibles pour remplir les pages correctement
        if (visibleCards.length > 0) {
            const pageSize = 3; // Nombre de cartes par page
            const totalPages = Math.ceil(visibleCards.length / pageSize);
            
            // Sauvegarder la position de scroll actuelle
            const scrollPosition = window.scrollY;
            
            // Vider le container temporairement
            container.innerHTML = '';
            
            // Réorganiser les cartes visibles
            visibleCards.forEach((card, index) => {
                container.appendChild(card);
                // S'assurer que la carte est bien visible
                card.style.display = 'block';
                card.style.opacity = '1';
                card.style.visibility = 'visible';
            });
            
            // Ajouter les cartes masquées à la fin (pour préserver l'ordre original)
            hiddenCards.forEach(card => {
                container.appendChild(card);
                // S'assurer que la carte est bien masquée
                card.style.display = 'none';
                card.style.opacity = '0';
                card.style.visibility = 'hidden';
            });
            
                    // Restaurer la position de scroll pour éviter les sauts
        setTimeout(() => {
            window.scrollTo(0, scrollPosition);
        }, 50);
        
        // Protection contre les événements de scroll qui déclenchent des rechargements (désactivée pour doujins)
        if (window.selectedType !== 'doujin' && !window.scrollProtection) {
            window.scrollProtection = true;
            setTimeout(() => {
                window.scrollProtection = false;
            }, 100);
        }
            
            console.log(`Container réorganisé: ${visibleCards.length} cartes visibles, ${hiddenCards.length} cartes masquées`);
        }
    });
    
    console.log('Filtre par type appliqué:', window.selectedType);
    
    // Mettre à jour le texte du filtre pour qu'il corresponde au type sélectionné
    const filterText = document.querySelector('.filter-text');
    if (filterText && window.selectedType) {
        const typeText = window.selectedType.charAt(0).toUpperCase() + window.selectedType.slice(1);
        filterText.textContent = typeText;
        console.log('✅ Texte du filtre mis à jour dans applyTypeFilter:', typeText);
    }
    
    // Vérification finale que les cartes sont bien visibles
    setTimeout(() => {
        const visibleCards = document.querySelectorAll('.catalogue-card[style*="display: block"]');
        const hiddenCards = document.querySelectorAll('.catalogue-card[style*="display: none"]');
        
        // Forcer la visibilité des cartes qui devraient être visibles
        visibleCards.forEach(card => {
            card.style.display = 'block';
            card.style.opacity = '1';
            card.style.visibility = 'visible';
        });
    }, 100);
    
    // Appliquer le filtre aux containers de genre
    if (genreContainers.length > 0) {
        genreContainers.forEach(card => {
            // Récupérer les données de la carte
            const animeId = card.getAttribute('data-anime-id');
            const isManga = card.hasAttribute('data-is-manga') || 
                           card.classList.contains('manga-card') ||
                           (animeId && animeId.includes('manga')) ||
                           card.querySelector('.manga-indicator');
            
            // Vérifier si c'est un manga en regardant les données stockées
            let cardType = 'anime'; // par défaut
            
            // Si c'est un manga (basé sur les attributs de la carte)
            if (isManga) {
                cardType = 'manga';
        } else {
                // Vérifier dans les données stockées si c'est un manga
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                if (user && user.email) {
                    try {
                        const notes = JSON.parse(localStorage.getItem('user_anime_notes_' + user.email) || '[]');
                        const note = notes.find(n => String(n.id) === String(animeId));
                        if (note && note.isManga) {
                            cardType = 'manga';
                        }
    } catch (e) {
                        console.error('Erreur lors de la vérification du type:', e);
                    }
                }
            }
            
            // Vérifier d'autres types si ce n'est pas un manga
            if (cardType === 'anime') {
                if (animeId && animeId.includes('roman')) {
                    cardType = 'roman';
                } else if (animeId && animeId.includes('doujin')) {
                    cardType = 'doujin';
                } else if (animeId && animeId.includes('manhwa')) {
                    cardType = 'manhwa';
                } else if (animeId && animeId.includes('manhua')) {
                    cardType = 'manhua';
                } else if (animeId && animeId.includes('film')) {
                    cardType = 'film';
                }
            }
            
            // Afficher ou masquer la carte selon le type sélectionné
            if (window.selectedType && cardType !== window.selectedType) {
                card.style.display = 'none';
                card.style.opacity = '0';
            } else {
                card.style.display = '';
                card.style.opacity = '1';
            }
        });
        
        console.log(`Filtre par type appliqué aux containers de genre: ${genreContainers.length} cartes traitées`);
    }
    
    // Mettre à jour le top 10 pour refléter le nouveau type
    renderTop10Slots();
}

// Fonction pour nettoyer les doublons et corriger les IDs (utilise Firebase en priorité)
async function cleanAnimeNotes() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        return [];
    }
    
    // Nettoyer les anciennes notes avec des données incorrectes
    cleanInvalidNotes();
    
    // Migrer les anciennes notes avant de les nettoyer
    migrateOldNotes();
    
    // Charger les notes depuis Firebase en priorité
    let notes = await loadUserNotes(user.email);
    const deletedNotesKey = 'deleted_content_notes_' + user.email;
    
    let deletedNotes = [];
    
    try {
        deletedNotes = JSON.parse(localStorage.getItem(deletedNotesKey) || '[]');
        // Logs désactivés pour éviter les logs infinis
    } catch (e) {
        deletedNotes = [];
    }
    
    // Filtrer les notes valides (rating entre 1 et 10) ET qui ne sont pas dans la liste des supprimées permanentes
    const validNotes = notes.filter(note => {
        const isFoodWars = note.id === 30276 || (note.titre?.toLowerCase().includes('food wars') || note.titre?.toLowerCase().includes('shokugeki'));
        
        const rating = Number(note.note || note.rating);
        const isValidRating = rating >= 1 && rating <= 10 && note.id;
        
        if (isFoodWars) {
        }
        
        if (!isValidRating) {
            if (isFoodWars) {
            }
            return false;
        }
        
        // Vérifier si cette note n'est pas dans la liste des supprimées permanentes
        const isDeleted = deletedNotes.some(deletedNote => 
            String(deletedNote.id) === String(note.id) && 
            deletedNote.contentType === note.contentType
        );
        
        if (isFoodWars) {
            console.log('🍜 Food Wars - Note supprimée:', {
                isDeleted: isDeleted,
                deletedNotes: deletedNotes.filter(d => String(d.id) === String(note.id)),
                noteContentType: note.contentType
            });
        }
        
        // Vérification des propriétés de la note (code commenté pour éviter les logs inutiles)
        // const noteInfo = {
        //     noteContentType: note.contentType,
        //     noteId: note.id,
        //     noteTitle: note.titre || note.title,
        //     deletedNotes: deletedNotes.map(d => ({id: d.id, contentType: d.contentType})),
        //     isDeleted: isDeleted
        // };
        
        // Log détaillé pour la note 656 (code commenté pour éviter les logs inutiles)
        if (String(note.id) === '656') {
            console.log('📝 Note 656:', {
                noteId: note.id,
                noteContentType: note.contentType,
                deletedNotes: deletedNotes,
                comparisons: deletedNotes.map(d => ({
                    idMatch: String(d.id) === String(note.id),
                    typeMatch: d.contentType === note.contentType,
                    deletedId: d.id,
                    deletedType: d.contentType
                }))
            });
        }
        
        if (isDeleted) {
            return false;
        }
        
        return true;
    });
    
    // Log désactivé pour éviter les logs infinis
    return validNotes;
}

// Fonction pour charger les détails d'un manga depuis l'API Jikan
async function fetchMangaDetails(mangaId) {
    try {
        const response = await fetch(`https://api.jikan.moe/v4/manga/${mangaId}`);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const data = await response.json();
        return data.data; // Retourne les données du manga
    } catch (error) {
        console.error(`Erreur lors du chargement du manga ${mangaId}:`, error);
        return null;
    }
}

// Fonction pour mettre à jour les informations d'un manga dans le localStorage
async function updateMangaInfoInStorage(mangaId, mangaInfo) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) return;
    
    const notesKey = 'user_content_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) {
        console.error('Erreur lors de la lecture des notes:', e);
        return;
    }
    
    // Trouver et mettre à jour la note du manga
    const noteIndex = notes.findIndex(n => n.id === mangaId && n.contentType === 'manga');
    if (noteIndex !== -1) {
        notes[noteIndex] = {
            ...notes[noteIndex],
            titre: mangaInfo.title,
            image: mangaInfo.images?.jpg?.image_url || '',
            synopsis: mangaInfo.synopsis || 'Aucune description disponible',
            genres: mangaInfo.genres?.map(g => g.name) || [],
            score: mangaInfo.score || 0,
            scored_by: mangaInfo.scored_by || 0,
            members: mangaInfo.members || 0,
            status: mangaInfo.status || 'Inconnu',
            published: mangaInfo.published?.string || 'Date inconnue',
            chapters: mangaInfo.chapters || 'Inconnu',
            volumes: mangaInfo.volumes || 'Inconnu',
            isManga: true
        };
        
        try {
            localStorage.setItem(notesKey, JSON.stringify(notes));
        } catch (e) {
            console.error('Erreur lors de la sauvegarde des notes mises à jour:', e);
        }
    }
}

// Variable globale pour éviter les appels multiples
let displayUserAnimeNotesTimeout = null;
let displayUserAnimeNotesRetryCount = 0;
const MAX_RETRY_COUNT = 3;

// Fonction de debouncing pour optimiser les performances
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Exposer la fonction globalement
window.displayUserAnimeNotes = async function displayUserAnimeNotes() {
    console.log('🎬 displayUserAnimeNotes appelée');
    
    // Monitoring des appels excessifs
    if (!monitorFunctionCalls('displayUserAnimeNotes')) {
        console.log('⚠️ displayUserAnimeNotes: appel bloqué par monitorFunctionCalls');
        return;
    }
    
    // Protection contre les appels multiples avec debouncing
    if (displayUserAnimeNotesTimeout) {
        clearTimeout(displayUserAnimeNotesTimeout);
    }
    
    // Protection supplémentaire contre les rechargements rapides
    if (window.lastDisplayTime && Date.now() - window.lastDisplayTime < 100) {
        return;
    }
    
    // Protection spéciale pour les doujins
    if (window.selectedType === 'doujin' && window.lastDoujinDisplayTime && Date.now() - window.lastDoujinDisplayTime < 300) {
        return;
    }
    if (window.selectedType === 'doujin') {
        window.lastDoujinDisplayTime = Date.now();
    }
    
    window.lastDisplayTime = Date.now();
    
    // Vérifier que les containers existent
    const containers = document.querySelectorAll('[id^="star-containers"]');
    console.log('📦 Containers trouvés au début de displayUserAnimeNotes:', containers.length);
    
    if (containers.length === 0) {
        console.log('⚠️ Aucun container trouvé, création des badges...');
        createStarBadges();
        
        // Limiter le nombre de tentatives pour éviter les boucles infinies
        if (displayUserAnimeNotesRetryCount < MAX_RETRY_COUNT) {
            displayUserAnimeNotesRetryCount++;
            console.log(`🔄 Nouvelle tentative (${displayUserAnimeNotesRetryCount}/${MAX_RETRY_COUNT})...`);
            displayUserAnimeNotesTimeout = setTimeout(() => {
                displayUserAnimeNotes();
            }, 500);
        } else {
            console.error('❌ Nombre maximum de tentatives atteint');
            displayUserAnimeNotesRetryCount = 0;
        }
        return;
    }
    
    // Réinitialiser le compteur de tentatives si les containers existent
    displayUserAnimeNotesRetryCount = 0;
    console.log('✅ Containers trouvés, continuation de l\'affichage...');
    
    isDisplayingNotes = true;
    console.log('✅ displayUserAnimeNotes: début de l\'affichage');
    
    // Réinitialiser le flag après un délai pour éviter les blocages
    setTimeout(() => {
        isDisplayingNotes = false;
    }, 3000);
    
    // Réinitialiser le flag de protection pour applyTypeFilter
    window.isApplyingTypeFilter = false;
    
    // Vérifier si des notes ont été mises à jour depuis une autre page
    const notesUpdated = localStorage.getItem('notes_updated');
    if (notesUpdated === 'true') {
        localStorage.removeItem('notes_updated');
        // Forcer un nettoyage complet
        document.querySelectorAll('[id^="star-containers"]').forEach(container => {
            container.innerHTML = '';
        });
    }
    
    // Synchroniser les notes depuis animeRatings avant de nettoyer
    syncNotesFromRatings();
    
    // Vérifier l'utilisateur
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    
    // Vérifier Food Wars dans les notes BRUTES avant nettoyage
    if (user && user.email) {
        const notesKey = 'user_content_notes_' + user.email;
        const rawNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');
        console.log('🍜🍜🍜 RECHERCHE FOOD WARS - Nombre total de notes brutes:', rawNotes.length);
        console.log('🍜🍜🍜 Tous les IDs des notes brutes:', rawNotes.map(n => n.id));
        
        const foodWarsRaw = rawNotes.find(n => {
            const idMatch = n.id === 30276;
            const titreMatch = (n.titre?.toLowerCase().includes('food wars') || 
                               n.titre?.toLowerCase().includes('shokugeki') ||
                               n.title?.toLowerCase().includes('food wars') ||
                               n.title?.toLowerCase().includes('shokugeki') ||
                               n.name?.toLowerCase().includes('food wars') ||
                               n.name?.toLowerCase().includes('shokugeki'));
            return idMatch || titreMatch;
        });
        
        if (foodWarsRaw) {
            console.log('🍜🍜🍜 ✅✅✅ Food Wars TROUVÉ dans les notes BRUTES:', foodWarsRaw);
        } else {
            console.log('🍜🍜🍜 ❌❌❌ Food Wars NON TROUVÉ dans les notes brutes du localStorage');
            // Chercher par variations du titre
            const allTitres = rawNotes.map(n => ({
                id: n.id,
                titre: n.titre || n.title || n.name || 'N/A'
            }));
            console.log('🍜🍜🍜 Tous les titres des notes:', allTitres);
        }
    }
    
    // Nettoyer les notes avant d'afficher (chargement depuis Firebase)
    console.log('🧹 Nettoyage des notes...');
    let notes = await cleanAnimeNotes();
    console.log('📝 Notes après nettoyage:', notes.length);
    
    // Filtrer les contenus interdits pour les mineurs
    if (typeof filterForbiddenContent === 'function') {
        notes = filterForbiddenContent(notes);
        console.log('📝 Notes après filtrage mineurs:', notes.length);
    }
    
    if (!user || !user.email) {
        console.warn('⚠️ Utilisateur non trouvé, arrêt de l\'affichage');
        isDisplayingNotes = false;
        return;
    }
    
    console.log('👤 Utilisateur trouvé:', user.email);
    console.log('📝 Nombre total de notes à afficher:', notes.length);
    
    if (notes.length === 0) {
        console.warn('⚠️ Aucune note trouvée pour l\'utilisateur');
    } else {
        // Log des premières notes pour débogage
        console.log('📝 Exemples de notes chargées:', notes.slice(0, 3).map(n => ({
            id: n.id,
            titre: n.titre || n.title,
            note: n.note || n.rating,
            contentType: n.contentType
        })));
    }
    
    // Applique le style flex à tous les containers d'étoiles pour l'alignement horizontal
    // Nettoyer les flags d'événements pour permettre la réinitialisation si nécessaire
    document.querySelectorAll('[id^="star-containers"]').forEach(c => {
        c.style.display = 'flex';
        c.style.flexWrap = 'wrap';
        c.style.flexDirection = 'row';
        c.style.gap = '2rem';
        c.style.justifyContent = 'flex-start';
        c.style.alignItems = 'flex-start';
        // Forcer une hauteur minimale pour éviter les changements de taille
        c.style.minHeight = '340px';
        c.style.height = 'auto';
        // Réinitialiser le flag d'événements si le container est vidé
        if (c.innerHTML.trim() === '') {
            c.removeAttribute('data-drag-events-attached');
        }
    });
    
    // Mettre à jour les informations des mangas si nécessaire
    const mangaNotes = notes.filter(note => note.isManga);
    for (const note of mangaNotes) {
        // Vérifier si on a déjà les informations complètes du manga
        if (!note.titre || !note.image) {
            const mangaInfo = await fetchMangaDetails(note.id);
            if (mangaInfo) {
                await updateMangaInfoInStorage(note.id, mangaInfo);
                // Mettre à jour la note avec les nouvelles informations
                Object.assign(note, {
                    titre: mangaInfo.title,
                    image: mangaInfo.images?.jpg?.image_url || '',
                    synopsis: mangaInfo.synopsis || 'Aucune description disponible',
                    genres: mangaInfo.genres?.map(g => g.name) || [],
                    score: mangaInfo.score || 0,
                    isManga: true
                });
            }
        }
    }
    // NE PAS appeler createStarBadges ici !


    
    // Si aucune note, afficher un message ou laisser vide
    if (notes.length === 0) {
        // Log désactivé pour éviter les logs infinis
    }
    
    // Nettoyer les notes de test Death Note qui pourraient exister
    if (user && user.email) {
        const notesKey = 'user_content_notes_' + user.email;
        let currentNotes = [];
        try {
            currentNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');
        } catch (e) {
            currentNotes = [];
        }
        
        // Supprimer les notes de test Death Note
        const cleanedNotes = currentNotes.filter(note => {
            const isTestNote = note.id === 1 && 
                              note.titre === "Death Note" && 
                              note.synopsis === "Un étudiant trouve un carnet qui permet de tuer quiconque dont on écrit le nom.";
            if (isTestNote) {
                console.log('[NETTOYAGE] Suppression de la note de test Death Note');
                return false;
            }
            return true;
        });
        
        // Sauvegarder les notes nettoyées si des changements ont été faits
        if (cleanedNotes.length !== currentNotes.length) {
            localStorage.setItem(notesKey, JSON.stringify(cleanedNotes));
            console.log(`[NETTOYAGE] ${currentNotes.length - cleanedNotes.length} note(s) de test supprimée(s)`);
            // Mettre à jour la variable notes pour l'affichage
            notes = cleanedNotes;
        }
    }
    
    if (user && user.email) {
        const notesKey = 'user_content_notes_' + user.email;
        const rawNotes = localStorage.getItem(notesKey);
        const animeRatings = localStorage.getItem('animeRatings');
        // Log désactivé pour éviter les logs infinis
        // Log désactivé pour éviter les logs infinis
        // Log désactivé pour éviter les logs infinis
        
        if (rawNotes) {
            try {
                const parsedNotes = JSON.parse(rawNotes);
            } catch (e) {
            }
        }
    }

    // IMPORTANT : Supprimer d'abord toutes les cartes existantes pour éviter les doublons
    document.querySelectorAll('[id^="star-containers"]').forEach(container => {
        const cardCount = container.querySelectorAll('.catalogue-card').length;
        // Log désactivé pour éviter les logs infinis
        container.innerHTML = '';
        // Réinitialiser les flags d'événements
        container.removeAttribute('data-drag-events-attached');
        container.removeAttribute('data-drop-blocked');
    });
    

    
    // Supprimer aussi les cartes vides ou avec "Titre inconnu"
    document.querySelectorAll('.catalogue-card').forEach(card => {
        const titreElement = card.querySelector('h3, .card-title, [class*="title"]');
        if (titreElement) {
            const titre = titreElement.textContent || titreElement.innerText || "";
            if (!titre || titre === "Titre inconnu" || titre.trim() === "") {
                card.remove();
            }
        }
    });

    // Logs désactivés pour éviter les logs infinis
    const selectedGenresDebug = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
    const selectedTypeDebug = window.selectedType || 'null';
    
    // DIAGNOSTIC COMPLET : Désactivé pour éviter les logs infinis
    /*
    console.log('🍜🍜🍜 DIAGNOSTIC COMPLET - Toutes les notes:', notes.map(n => ({
        id: n.id,
        titre: n.titre || n.title || n.name || 'N/A',
        note: n.note,
        rating: n.rating,
        contentType: n.contentType,
        isManga: n.isManga
    })));
    */
    
    // Vérifications désactivées pour éviter les logs infinis
    
    for (let note = 10; note >= 1; note--) {
        const container = document.getElementById(note === 10 ? 'star-containers' : `star-containers-${note}`);
        if (!container) {
            continue;
        }
        
        
        // S'assurer que le container est vide
        container.innerHTML = '';
        
        // Maintenir la taille du container même s'il est vide
        container.style.minHeight = '340px';
        container.style.height = 'auto';
        
        const notesForThisStar = notes.filter(anime => {
            const isFoodWars = anime.id === 30276 || (anime.titre?.toLowerCase().includes('food wars') || anime.titre?.toLowerCase().includes('shokugeki'));
            if (isFoodWars) {
            }
            
            const titreCheck = anime.titre || anime.title || anime.name || anime.nom || "";
            
            // Log de débogage pour les premières notes
            if (notes.indexOf(anime) < 3) {
                console.log(`🔍 Filtrage note ${note}:`, {
                    id: anime.id,
                    titre: titreCheck,
                    note: anime.note || anime.rating,
                    contentType: anime.contentType
                });
            }
            const isPotentialDoujin = (titreCheck && (
                titreCheck.toLowerCase().includes('doujin') ||
                titreCheck.toLowerCase().includes('totally captivated') ||
                titreCheck.toLowerCase().includes('hentai') ||
                (anime.genres && anime.genres.some(g => g.toLowerCase().includes('erotica')))
            )) || anime.contentType === 'doujin';
            
            if (isPotentialDoujin) {
            }
            
            // Ignorer seulement les vrais animes de test (pas les mangas)
            if (!anime.isManga && anime.id && (anime.id.toString().startsWith('test') || 
                anime.id === 3 || anime.id === 4 || 
                anime.id === 'naruto' || anime.id === 'onepiece' ||
                anime.id === 'deathnote' || anime.id === 'attackontitan')) {
                if (isPotentialDoujin) {
                }
                return false; // Exclure cet anime de test
            }
            
            // Vérifier que l'anime/manga a des données valides
            const titre = titreCheck;
            if (!titre || titre === "Titre inconnu") {
                if (isFoodWars) {
                }
                if (isPotentialDoujin) {
                }
                return false; // Exclure les contenus sans titre valide
            }
            
            // Toujours détecter le type réel de l'anime (même si aucun filtre n'est appliqué)
            // Déterminer le type de l'anime
            // IMPORTANT: Ne pas utiliser isManga comme fallback car cela peut causer des erreurs
            let animeType = anime.contentType || 'anime';
            
            // Liste de titres connus qui sont des animes, pas des mangas (Kingdom exclu : anime+manga)
            const knownAnimeTitles = ['high school dxd', 'high school d×d', 'food wars', 'shokugeki', 
                                     'kaguya', 'steins gate', 'grand blue'];
            const animeTitle = (anime.titre || anime.title || anime.name || '').toLowerCase();
            const isKnownAnime = knownAnimeTitles.some(title => animeTitle.includes(title));
            
            // Si c'est un anime connu, forcer le type à 'anime' même si isManga est true
            if (isKnownAnime) {
                animeType = 'anime';
            } else if (!anime.contentType && anime.isManga) {
                // Fallback pour les anciennes notes qui utilisent isManga (seulement si ce n'est pas un anime connu)
                animeType = 'manga';
            }
            
            // Détecter les doujins, romans, manhua et manhwa basé sur le titre ou d'autres critères
            // PRIORITÉ: Utiliser contentType d'abord, puis détecter par titre/genres
            // IMPORTANT: Ne pas surcharger le contentType 'anime' si il est explicitement défini
            // IMPORTANT: Ne jamais classer un anime connu comme doujin
            if (anime.contentType === 'anime' || isKnownAnime) {
                // Si contentType est explicitement 'anime' ou si c'est un anime connu, ne jamais le changer
                animeType = 'anime';
            } else if (anime.contentType === 'doujin') {
                animeType = 'doujin';
            } else if (anime.contentType === 'roman') {
                animeType = 'roman';
            } else if (anime.contentType === 'manhua') {
                animeType = 'manhua';
            } else if (anime.contentType === 'manhwa') {
                animeType = 'manhwa';
            } else if (anime.contentType === 'manga') {
                animeType = 'manga';
            } else if (anime.contentType === 'film') {
                animeType = 'film';
            } else if (!isKnownAnime && anime.titre && (
                anime.titre.toLowerCase().includes('doujin') ||
                anime.titre.toLowerCase().includes('totally captivated') ||
                anime.titre.toLowerCase().includes('hentai') ||
                // Détection plus large pour les doujins
                anime.titre.toLowerCase().includes('sex') ||
                anime.titre.toLowerCase().includes('adult') ||
                // Ne pas utiliser 'ecchi' dans le titre - c'est un genre, pas un type de contenu
                // anime.titre.toLowerCase().includes('ecchi') ||
                // Détection STRICTE par genres - seulement si c'est vraiment explicite (hentai, erotica, adult)
                // IMPORTANT: Ne pas utiliser "ecchi", "mature", "yuri", "yaoi", "boys love", "girls love", "smut"
                // car ce sont des genres, pas des types de contenu
                (anime.genres && anime.genres.some(g => {
                    const gLower = g.toLowerCase();
                    return gLower.includes('hentai') || 
                           gLower.includes('erotica') || 
                           gLower.includes('adult');
                })) ||
                // Vérifier aussi l'ID
                (anime.id && String(anime.id).toLowerCase().includes('doujin'))
            )) {
                animeType = 'doujin';
            } else if (anime.titre && (
                anime.titre.toLowerCase().includes('roman') ||
                anime.titre.toLowerCase().includes('novel') ||
                (anime.id && anime.id.toString().includes('roman'))
            )) {
                animeType = 'roman';
            } else if (anime.titre && (
                anime.titre.toLowerCase().includes('manhua') ||
                anime.titre.toLowerCase().includes('sq: begin w/your name') ||
                anime.titre.toLowerCase().includes('sq begin') ||
                anime.titre.toLowerCase().includes('begin w/your name') ||
                anime.titre.toLowerCase().includes('begin with your name') ||
                (anime.id && anime.id.toString().includes('manhua'))
            )) {
                animeType = 'manhua';
            } else if (anime.titre && (
                anime.titre.toLowerCase().includes('manhwa') ||
                (anime.id && anime.id.toString().includes('manhwa')) ||
                // Détection par patterns typiques des manhwa coréens
                anime.titre.toLowerCase().includes('on the way to meet mom') ||
                anime.titre.toLowerCase().includes('solo leveling') ||
                anime.titre.toLowerCase().includes('tower of god') ||
                anime.titre.toLowerCase().includes('noblesse') ||
                anime.titre.toLowerCase().includes('the beginning after the end')
            )) {
                animeType = 'manhwa';
            }
            // Si aucun type spécial n'est détecté et que contentType n'est pas défini, garder 'anime' par défaut
            
            // Filtrer par type si un type est sélectionné (et que ce n'est pas "Tous types" ou "tous")
            const selectedType = window.selectedType;
            // Par défaut, afficher tous les types seulement si "Tous types" est sélectionné
            // Chaque type (manga, anime, etc.) doit afficher uniquement ses propres cartes
            const isAllTypes = !selectedType || selectedType === 'Tous types' || selectedType === 'tous';
            const selectedGenres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
            
            if (isFoodWars) {
            }
            
            // IMPORTANT: Ne PAS filtrer par type ici dans notesForThisStar
            // Le filtrage par type se fera plus tard dans filteredAnimes
            // Ici, on vérifie seulement les genres pour les doujins/manhua/manhwa
            // et on laisse tous les autres types (anime, manga, etc.) passer pour vérifier leur note
            
            // Log de débogage pour Steins;Gate
            if (anime.id === 9253) {
                console.log(`🔍 [STEINS;GATE FILTER] Avant vérification genres: animeType=${animeType}, selectedGenres=${JSON.stringify(selectedGenres)}, selectedType=${selectedType}`);
            }
            
            // Vérifier uniquement les genres pour les doujins/manhua/manhwa
            // Les autres types (anime, manga, film, etc.) passent sans restriction de genre
            if (animeType === 'doujin' && !selectedGenres.includes('Doujin') && selectedType !== 'doujin') {
                if (anime.id === 9253) {
                    console.log(`❌ [STEINS;GATE FILTER] Exclu: doujin sans genre`);
                }
                return false;
            }
            if (animeType === 'manhua' && !selectedGenres.includes('Manhua') && selectedType !== 'manhua') {
                if (anime.id === 9253) {
                    console.log(`❌ [STEINS;GATE FILTER] Exclu: manhua sans genre`);
                }
                return false;
            }
            if (animeType === 'manhwa' && !selectedGenres.includes('Manhwa') && selectedType !== 'manhwa') {
                if (anime.id === 9253) {
                    console.log(`❌ [STEINS;GATE FILTER] Exclu: manhwa sans genre`);
                }
                return false;
            }
            
            // Pour tous les autres types (anime, manga, film, etc.), continuer pour vérifier la note
            // Le filtrage par type se fera plus tard dans filteredAnimes
            
            if (anime.id === 9253) {
                console.log(`✅ [STEINS;GATE FILTER] Passé la vérification des genres, continue pour vérifier la note`);
            }
            
            let n = anime.note || anime.rating || 0;
            // Convertir en nombre et arrondir pour la comparaison
            if (typeof n === 'string') n = parseFloat(n);
            n = Math.round(Number(n));
            // S'assurer que la note est un entier entre 1 et 10
            if (isNaN(n) || n < 1 || n > 10) {
                // Log de débogage pour Steins;Gate
                if (anime.id === 9253) {
                    console.log(`❌ [STEINS;GATE] Note invalide: n=${n}, note=${anime.note}, rating=${anime.rating}`);
                }
                return false;
            }
            const matches = n === note;
            
            // Log de débogage pour comprendre pourquoi une note ne correspond pas
            if (notes.indexOf(anime) < 3 && !matches) {
                console.log(`❌ Note ${anime.id} (${titreCheck}) ne correspond pas: note calculée=${n}, note recherchée=${note}`);
            }
            
            // Log de débogage spécifique pour Steins;Gate
            if (anime.id === 9253) {
                console.log(`🔍 [STEINS;GATE] Dans filtre note ${note}: matches=${matches}, n=${n}, note=${anime.note}, contentType=${anime.contentType}, animeType=${animeType}`);
            }
            
            if (isFoodWars) {
            }
            
            if (animeType === 'doujin' || (anime.titre && (anime.titre.toLowerCase().includes('totally') || anime.titre.toLowerCase().includes('doujin')))) {
            }
            
            if (anime.id === 11061) {
            }
            
            // IMPORTANT : Ne pas exclure les animes des containers d'étoiles même s'ils sont dans le top 10
            // Les différentes saisons doivent pouvoir apparaître dans les containers d'étoiles même si une saison est dans le top 10
            
            return matches;
        });
        
        
        // Log désactivé pour éviter les logs infinis
        // if (notesForThisStar.length > 0) {
        //     console.log('Notes pour cette étoile:', notesForThisStar.map(n => ({
        //         id: n.id,
        //         titre: n.titre || n.title || n.name,
        //         contentType: n.contentType,
        //         note: n.note,
        //         rating: n.rating,
        //         hasImage: !!(n.image || n.img || n.cover),
        //         hasSynopsis: !!(n.synopsis || n.synopsisPerso)
        //     })));
        // }
        
        const animesWithSeasonsInFilter = notesForThisStar.filter(n => {
            const titre = (n.titre || n.title || n.name || '').toLowerCase();
            return titre.includes('season') || titre.includes('saison') || titre.includes('2nd') || titre.includes('3rd') || titre.includes('part');
        });
        // Logs désactivés pour éviter les logs infinis
        // if (animesWithSeasonsInFilter.length > 0) {
        //     console.log('Animes avec saisons:', animesWithSeasonsInFilter.map(n => ({
        //         id: n.id,
        //         titre: n.titre || n.title || n.name,
        //         note: n.note
        //     })));
        // }
        
        // Vérifier si Food Wars ou Mushoku Tensei sont dans le filtre
        // Logs désactivés pour éviter les logs infinis
        // const foodWarsInFilter = notesForThisStar.find(n => n.id === 30276 || (n.titre?.toLowerCase().includes('food wars') || n.titre?.toLowerCase().includes('shokugeki')));
        // if (foodWarsInFilter) {
        // }
        // const mushokuInFilter = notesForThisStar.filter(n => (n.titre?.toLowerCase().includes('mushoku') || n.titre?.toLowerCase().includes('jobless')));
        // if (mushokuInFilter.length > 0) {
        // }
        
        // const doujinsInNotesForThisStar = notesForThisStar.filter(anime => {
        //     const animeType = anime.contentType || 'anime';
        //     return animeType === 'doujin' || (anime.titre && (
        //         anime.titre.toLowerCase().includes('doujin') ||
        //         anime.titre.toLowerCase().includes('totally captivated')
        //     ));
        // });
        // if (doujinsInNotesForThisStar.length > 0) {
        //     console.log('Doujins:', doujinsInNotesForThisStar.map(d => ({
        //         id: d.id,
        //         titre: d.titre || d.title || d.name,
        //         contentType: d.contentType,
        //         note: d.note
        //     })));
        // }
        
        // Log de débogage pour comprendre quelles notes sont incluses
        if (note === 10) {
            console.log(`🔍 [DEBUG NOTE 10] notesForThisStar contient ${notesForThisStar.length} note(s):`, notesForThisStar.map(n => ({
                id: n.id,
                titre: n.titre || n.title || n.name,
                contentType: n.contentType,
                note: n.note
            })));
        }
        
        // Si aucun contenu trouvé pour cette note, passer à la suivante
        if (notesForThisStar.length === 0) {
            // Log seulement pour les notes 1-10 pour éviter trop de logs
            if (note >= 8 && note <= 10) {
                console.log(`⚠️ Aucune note trouvée pour la note ${note}/10`);
            }
            continue;
        } else {
            console.log(`✅ ${notesForThisStar.length} note(s) trouvée(s) pour la note ${note}/10`);
        }
        
        // Vérifier si le container existe
        if (!container) {
            continue;
        }
        
        
        // Récupérer l'ordre de tri actuel AVANT la pagination
        const orderButton = document.getElementById('order-desc-btn');
        let currentOrderType = 'desc'; // par défaut
        if (orderButton) {
            const order = orderButton.dataset.order || (orderButton.getAttribute && orderButton.getAttribute('data-order')) || 'desc';
            currentOrderType = (order === 'asc') ? 'asc' : 'desc';
        }
        
        // Trier TOUTES les cartes de ce container selon l'ordre choisi
        let allSortedAnimes = [...notesForThisStar];
        
        // Récupérer l'ordre d'ajout réel depuis le localStorage
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        let allNotes = [];
        if (user && user.email) {
            try {
                allNotes = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
            } catch (e) { allNotes = []; }
        }
        
        // Ajouter l'ordre d'ajout réel à chaque carte
        allSortedAnimes = allSortedAnimes.map(anime => {
            const noteInStorage = allNotes.find(n => String(n.id) === String(anime.id));
            const addOrder = noteInStorage ? allNotes.indexOf(noteInStorage) : 0;
            return {
                ...anime,
                addOrder: addOrder // Ordre réel dans le localStorage (0 = premier, N = dernier)
            };
        });
        
        if (currentOrderType === 'asc') {
            // Ordre croissant : par note croissante
            allSortedAnimes.sort((a, b) => {
                let aNote = a.note;
                let bNote = b.note;
                if (typeof aNote === 'string') aNote = parseInt(aNote, 10);
                if (typeof bNote === 'string') bNote = parseInt(bNote, 10);
                return aNote - bNote;
            });
        } else {
            // Ordre décroissant : par note décroissante
            allSortedAnimes.sort((a, b) => {
                let aNote = a.note;
                let bNote = b.note;
                if (typeof aNote === 'string') aNote = parseInt(aNote, 10);
                if (typeof bNote === 'string') bNote = parseInt(bNote, 10);
                return bNote - aNote;
            });
        }
        
        // Filtrer les animes selon le type sélectionné
        let filteredAnimes = allSortedAnimes;
        const selectedType = window.selectedType;
        const isAllTypes = !selectedType || selectedType === 'Tous types' || selectedType === 'tous';
        const selectedGenres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
        
        // Log de débogage pour comprendre le filtrage
        if (note === 10) {
            console.log(`🔍 [FILTER DEBUG] Note ${note}: allSortedAnimes=${allSortedAnimes.length}, selectedType=${selectedType}, isAllTypes=${isAllTypes}`);
        }
        
        
        // Liste de titres connus qui sont des animes, pas des doujins (Kingdom exclu : anime+manga)
        const knownAnimeTitles = ['high school dxd', 'high school d×d', 'food wars', 'shokugeki', 
                                 'kaguya', 'steins gate', 'grand blue'];
        
        const doujinsInAll = allSortedAnimes.filter(anime => {
            // Si contentType est explicitement 'anime', ce n'est jamais un doujin
            if (anime.contentType === 'anime') {
                return false;
            }
            
            // Si c'est un anime connu, ce n'est jamais un doujin
            const animeTitle = (anime.titre || anime.title || anime.name || '').toLowerCase();
            const isKnownAnime = knownAnimeTitles.some(title => animeTitle.includes(title));
            if (isKnownAnime) {
                return false;
            }
            
            const titre = animeTitle;
            const genres = (anime.genres || []).join(' ').toLowerCase();
            const noteId = anime.id ? String(anime.id).toLowerCase() : '';
            const animeType = anime.contentType || 'anime';
            
            // Détection STRICTE des doujins - seulement si c'est vraiment un doujin
            // IMPORTANT: Ne pas utiliser "ecchi", "mature", "yuri", "yaoi", "boys love", "girls love", "smut"
            // car ce sont des genres, pas des types de contenu
            return animeType === 'doujin' || 
                titre.includes('doujin') ||
                titre.includes('totally captivated') ||
                titre.includes('hentai') ||
                // Seulement détecter par genres si c'est vraiment explicite (hentai, erotica, adult)
                // MAIS PAS "ecchi" qui est juste un genre
                (genres.includes('hentai') || genres.includes('erotica') || genres.includes('adult')) ||
                noteId.includes('doujin');
        });
        // Log désactivé pour éviter les logs infinis
        // if (doujinsInAll.length > 0) {
        //     console.log('Doujins trouvés:', doujinsInAll.map(d => ({
        //         id: d.id,
        //         titre: d.titre || d.title || d.name,
        //         contentType: d.contentType,
        //         note: d.note
        //     })));
        // }
        
        if (!isAllTypes) {
            filteredAnimes = filteredAnimes.filter(anime => {
                // Utiliser contentType si disponible, sinon fallback sur isManga
                // IMPORTANT: Ne pas utiliser isManga comme fallback car cela peut causer des erreurs
                // Par défaut, si aucun contentType n'est défini, considérer comme anime
                let animeType = anime.contentType || (anime.isManga ? 'manga' : 'anime');
                
                // IMPORTANT: Vérifier d'abord dans les notes originales si c'est un manga AVANT d'appliquer la liste des animes connus
                // Chercher dans les notes originales pour voir si c'est un manga
                let isMangaInNotes = false;
                const originalNote = notesForThisStar.find(n => String(n.id) === String(anime.id));
                if (originalNote) {
                    if (originalNote.contentType === 'manga' || originalNote.isManga) {
                        animeType = 'manga';
                        isMangaInNotes = true;
                    } else if (originalNote.contentType && originalNote.contentType !== 'anime') {
                        animeType = originalNote.contentType;
                    }
                } else {
                    // Si pas trouvé dans notesForThisStar, chercher dans allNotes
                    const noteInAllNotes = allNotes.find(n => String(n.id) === String(anime.id));
                    if (noteInAllNotes) {
                        if (noteInAllNotes.contentType === 'manga' || noteInAllNotes.isManga) {
                            animeType = 'manga';
                            isMangaInNotes = true;
                        } else if (noteInAllNotes.contentType && noteInAllNotes.contentType !== 'anime') {
                            animeType = noteInAllNotes.contentType;
                        }
                    }
                }
                
                // Si contentType n'est pas défini et qu'on n'a pas trouvé dans les notes, vérifier isManga
                if (!anime.contentType && !isMangaInNotes && anime.isManga) {
                    animeType = 'manga';
                    isMangaInNotes = true;
                }
                
                // Liste de titres connus qui sont des animes, pas des mangas
                // MAIS: Ne pas forcer au type 'anime' si c'est un manga dans les notes (Kingdom exclu : anime+manga)
                const knownAnimeTitlesFilter = ['high school dxd', 'high school d×d', 'food wars', 'shokugeki', 
                                               'kaguya', 'steins gate', 'grand blue'];
                const animeTitleFilter = (anime.titre || anime.title || anime.name || '').toLowerCase();
                const isKnownAnimeFilter = knownAnimeTitlesFilter.some(title => animeTitleFilter.includes(title));
                
                // Si c'est un anime connu, forcer le type à 'anime' SEULEMENT si ce n'est pas un manga dans les notes
                if (isKnownAnimeFilter && !isMangaInNotes && animeType !== 'manga') {
                    animeType = 'anime';
                } else if (anime.contentType === 'anime') {
                    // IMPORTANT: Si contentType est explicitement 'anime', ne jamais le changer
                    animeType = 'anime';
                } else if (anime.contentType === 'manga') {
                    animeType = 'manga';
                } else if (anime.contentType === 'film') {
                    animeType = 'film';
                } else if (anime.contentType === 'doujin') {
                    animeType = 'doujin';
                } else if (anime.contentType === 'roman') {
                    animeType = 'roman';
                } else if (anime.contentType === 'manhua') {
                    animeType = 'manhua';
                } else if (anime.contentType === 'manhwa') {
                    animeType = 'manhwa';
                } else if (!anime.contentType && anime.isManga) {
                    // Fallback pour les anciennes notes qui utilisent encore isManga (seulement si ce n'est pas un anime connu)
                    animeType = 'manga';
                } else if (!isKnownAnimeFilter && anime.titre && (
                    anime.titre.toLowerCase().includes('doujin') ||
                    anime.titre.toLowerCase().includes('totally captivated') ||
                    anime.titre.toLowerCase().includes('hentai') ||
                    (anime.genres && anime.genres.some(g => {
                        const gLower = g.toLowerCase();
                        // Détection STRICTE - seulement hentai, erotica, adult (PAS ecchi)
                        return gLower.includes('erotica') || gLower.includes('adult') || gLower.includes('hentai');
                    }))
                )) {
                    animeType = 'doujin';
                } else if (anime.contentType === 'roman' || (anime.titre && (
                    anime.titre.toLowerCase().includes('roman') ||
                    anime.titre.toLowerCase().includes('novel') ||
                    (anime.id && anime.id.toString().includes('roman'))
                ))) {
                    animeType = 'roman';
                } else if (anime.contentType === 'manhua' || (anime.titre && (
                    anime.titre.toLowerCase().includes('manhua') ||
                    (anime.id && anime.id.toString().includes('manhua'))
                ))) {
                    animeType = 'manhua';
                } else if (anime.contentType === 'manhwa' || (anime.titre && (
                    anime.titre.toLowerCase().includes('manhwa') ||
                    (anime.id && anime.id.toString().includes('manhwa')) ||
                    // Détection par patterns typiques des manhwa coréens
                    anime.titre.toLowerCase().includes('on the way to meet mom') ||
                    anime.titre.toLowerCase().includes('solo leveling') ||
                    anime.titre.toLowerCase().includes('tower of god') ||
                    anime.titre.toLowerCase().includes('noblesse') ||
                    anime.titre.toLowerCase().includes('the beginning after the end')
                ))) {
                    animeType = 'manhwa';
                }
                
                // Vérification finale : si animeType est encore 'anime' par défaut, vérifier dans les notes originales une dernière fois
                if (animeType === 'anime' && !anime.contentType && !isKnownAnimeFilter) {
                    const originalNote = notesForThisStar.find(n => String(n.id) === String(anime.id));
                    if (originalNote && (originalNote.contentType === 'manga' || originalNote.isManga)) {
                        animeType = 'manga';
                    } else if (!originalNote) {
                        // Si pas trouvé dans notesForThisStar, chercher dans allNotes
                        const noteInAllNotes = allNotes.find(n => String(n.id) === String(anime.id));
                        if (noteInAllNotes && (noteInAllNotes.contentType === 'manga' || noteInAllNotes.isManga)) {
                            animeType = 'manga';
                        }
                    }
                }
                
                // Vérifier si le genre correspondant est sélectionné pour les doujins/manhua/manhwa
                let shouldInclude = false;
                
                // Si le genre "Doujin", "Manhua" ou "Manhwa" est sélectionné, permettre l'inclusion même si le type sélectionné est différent
                if (animeType === 'doujin' && selectedGenres.includes('Doujin')) {
                    shouldInclude = true;
                } else if (animeType === 'manhua' && selectedGenres.includes('Manhua')) {
                    shouldInclude = true;
                } else if (animeType === 'manhwa' && selectedGenres.includes('Manhwa')) {
                    shouldInclude = true;
                }
                // Si le type sélectionné est "manga", afficher UNIQUEMENT les mangas (pas les anime)
                else if (selectedType === 'manga') {
                    // IMPORTANT: Si c'est un manga dans les notes (même si c'est dans la liste des animes connus), l'inclure
                    if (animeType === 'manga' || isMangaInNotes) {
                        shouldInclude = true;
                    } else if (!anime.contentType && anime.isManga) {
                        // Si isManga est true mais pas de contentType, considérer comme manga
                        shouldInclude = true;
                    } else if (animeType === 'doujin' || animeType === 'manhua' || animeType === 'manhwa') {
                        // Permettre les doujins/manhua/manhwa si leur genre est sélectionné
                        const genreToCheck = animeType === 'doujin' ? 'Doujin' : (animeType === 'manhua' ? 'Manhua' : 'Manhwa');
                        if (selectedGenres.includes(genreToCheck)) {
                            shouldInclude = true;
                        } else {
                            shouldInclude = false;
                        }
                    } else {
                        // Exclure les anime et autres types
                        // Si c'est un anime connu et que ce n'est pas un manga dans les notes, exclure
                        if (isKnownAnimeFilter && !isMangaInNotes) {
                            shouldInclude = false;
                        } else {
                            shouldInclude = false;
                        }
                    }
                }
                // Si le type sélectionné est "anime", afficher UNIQUEMENT les anime
                else if (selectedType === 'anime') {
                    // IMPORTANT: Exclure explicitement tous les mangas et autres types
                    if (animeType === 'manga' || animeType === 'doujin' || animeType === 'manhua' || animeType === 'manhwa' || animeType === 'roman' || animeType === 'film') {
                        shouldInclude = false;
                    } 
                    // Inclure si c'est un anime connu ou si le type détecté est 'anime'
                    else if (isKnownAnimeFilter || animeType === 'anime') {
                        shouldInclude = true;
                    } 
                    // Si aucun contentType n'est défini et que ce n'est pas un manga, considérer comme anime
                    else if (!anime.contentType && !anime.isManga) {
                        shouldInclude = true;
                    } else {
                        shouldInclude = false;
                    }
                }
                // Sinon, utiliser la logique normale de correspondance de type
                else {
                    shouldInclude = (animeType === selectedType);
                }
                
                // Log de débogage pour Steins;Gate
                if (anime.id === 9253) {
                    console.log(`🔍 [STEINS;GATE FILTERED] shouldInclude=${shouldInclude}, animeType=${animeType}, selectedType=${selectedType}`);
                }
                
                return shouldInclude;
            });
            
            // Log de débogage après filtrage
            if (note === 10) {
                console.log(`🔍 [FILTERED] Note ${note}: filteredAnimes=${filteredAnimes.length} après filtrage par type`, filteredAnimes.map(a => ({
                    id: a.id,
                    titre: a.titre || a.title,
                    contentType: a.contentType
                })));
            }
        } else {
            // Aucun type spécifique sélectionné : filtrer quand même les doujins/manhua/manhwa sauf si leur genre est sélectionné
            filteredAnimes = filteredAnimes.filter(anime => {
                // Détecter le type de l'anime
                let animeType = anime.contentType || 'anime';
                if (!anime.contentType && anime.isManga) {
                    animeType = 'manga';
                }
                
                // Détecter les doujins, manhua, manhwa
                if (anime.contentType === 'doujin' || (anime.titre && (
                    anime.titre.toLowerCase().includes('doujin') ||
                    anime.titre.toLowerCase().includes('totally captivated') ||
                    anime.titre.toLowerCase().includes('hentai') ||
                    (anime.genres && anime.genres.some(g => {
                        const gLower = g.toLowerCase();
                        return gLower.includes('erotica') || gLower.includes('adult') || gLower.includes('hentai');
                    }))
                ))) {
                    animeType = 'doujin';
                } else if (anime.contentType === 'manhua' || (anime.titre && anime.titre.toLowerCase().includes('manhua'))) {
                    animeType = 'manhua';
                } else if (anime.contentType === 'manhwa' || (anime.titre && (
                    anime.titre.toLowerCase().includes('manhwa') ||
                    anime.titre.toLowerCase().includes('solo leveling') ||
                    anime.titre.toLowerCase().includes('tower of god') ||
                    anime.titre.toLowerCase().includes('noblesse') ||
                    anime.titre.toLowerCase().includes('the beginning after the end')
                ))) {
                    animeType = 'manhwa';
                }
                
                // Exclure les doujins/manhua/manhwa sauf si leur genre correspondant est sélectionné
                if (animeType === 'doujin' && !selectedGenres.includes('Doujin')) {
                    return false;
                }
                if (animeType === 'manhua' && !selectedGenres.includes('Manhua')) {
                    return false;
                }
                if (animeType === 'manhwa' && !selectedGenres.includes('Manhwa')) {
                    return false;
                }
                
                return true;
            });
        }
        
        
        const doujinsInFiltered = filteredAnimes.filter(anime => {
            // Si contentType est explicitement 'anime', ce n'est jamais un doujin
            if (anime.contentType === 'anime') {
                return false;
            }
            
            // Si c'est un anime connu, ce n'est jamais un doujin
            const animeTitle = (anime.titre || anime.title || anime.name || '').toLowerCase();
            const isKnownAnime = knownAnimeTitles.some(title => animeTitle.includes(title));
            if (isKnownAnime) {
                return false;
            }
            
            const titre = animeTitle;
            const genres = (anime.genres || []).join(' ').toLowerCase();
            const noteId = anime.id ? String(anime.id).toLowerCase() : '';
            const animeType = anime.contentType || 'anime';
            
            // Détection STRICTE des doujins - seulement si c'est vraiment un doujin
            // IMPORTANT: Ne pas utiliser "ecchi", "mature", "yuri", "yaoi", "boys love", "girls love", "smut"
            // car ce sont des genres, pas des types de contenu
            return animeType === 'doujin' || 
                titre.includes('doujin') ||
                titre.includes('totally captivated') ||
                titre.includes('hentai') ||
                // Seulement détecter par genres si c'est vraiment explicite (hentai, erotica, adult)
                // MAIS PAS "ecchi" qui est juste un genre
                (genres.includes('hentai') || genres.includes('erotica') || genres.includes('adult')) ||
                noteId.includes('doujin');
        });
        // Log désactivé pour éviter les logs infinis
        // if (doujinsInFiltered.length > 0) {
        //     console.log('Doujins filtrés:', doujinsInFiltered.map(d => ({
        //         id: d.id,
        //         titre: d.titre || d.title || d.name,
        //         contentType: d.contentType,
        //         note: d.note
        //     })));
        // }
        
        if (filteredAnimes.length > 0) {
            const hunterNote = filteredAnimes.find(anime => anime.id === 11061);
            if (hunterNote) {
            }
        }
        
        // Calculer dynamiquement le pageSize
        // Page 1 : 3 cartes (affichage compact)
        // Pages suivantes : calculer pour remplir le conteneur
        function calculatePageSize(page) {
            if (page === 1) {
                return 3; // Page 1 : garder 3 cartes
            }
            
            // Pour les pages suivantes, calculer combien de cartes peuvent tenir dans le conteneur
            // Largeur du conteneur en mode page > 1 : maxWidth 1400px, padding 2rem (32px) de chaque côté
            // Largeur utilisable : 1400 - 64 = 1336px
            // Largeur d'une carte : 340px
            // Gap : 2rem = 32px
            // Cartes par ligne : (1336 + 32) / (340 + 32) = 1368 / 372 ≈ 3.67, donc 3 cartes par ligne
            
            // Hauteur du conteneur : minHeight 13000px
            // Hauteur d'une carte : 520px
            // Gap vertical : 32px (2rem)
            // Hauteur totale par ligne : 520 + 32 = 552px
            // Nombre de lignes : 13000 / 552 ≈ 23 lignes
            
            // Nombre de cartes par page pour remplir le conteneur : 3 * 23 = 69 cartes
            // Utiliser un nombre légèrement supérieur pour être sûr de remplir
            return 100; // Nombre suffisant pour remplir plusieurs écrans
        }
        
        if (!window.starCurrentPages) window.starCurrentPages = {};
        if (!window.starCurrentPages[note]) window.starCurrentPages[note] = 1;
        
        // Appeler renderStarPage pour afficher les cartes
        renderStarPage(window.starCurrentPages[note]);

        function renderStarPage(page) {
            // Récupérer le container pour cette note
            const container = document.getElementById(note === 10 ? 'star-containers' : `star-containers-${note}`);
            if (!container) {
                console.error(`❌ Container pour note ${note} non trouvé`);
                return;
            }
            
            // Affichage focus sur page > 1
            const allStarGroups = document.querySelectorAll('.star-rating-group');
            const mainContainer = document.querySelector('.all-star-containers');
            const genreActive = window.selectedGenre;
            
            // Gestion du menu de tri selon la page (déplacé plus haut)
            const orderMenu = document.getElementById('order-desc-menu');
            
            if (page > 1) {
                // Sur les pages 2+, masquer les options décroissant/croissant
                if (orderMenu) {
                    const descOption = orderMenu.querySelector('[data-order="desc"]');
                    const ascOption = orderMenu.querySelector('[data-order="asc"]');
                    if (descOption) descOption.style.display = 'none';
                    if (ascOption) ascOption.style.display = 'none';
                }
                
                // Mettre "Ordre décroissant" par défaut sur les pages 2+
                if (orderButton && (orderButton.dataset.order || currentOrder) !== 'desc') {
                    orderButton.textContent = _profileT('profile.order_desc');
                    orderButton.dataset.order = 'desc';
                    currentOrder = 'desc';
                    currentOrderType = 'desc';
                }
            } else {
                // Sur la page 1, restaurer toutes les options
                if (orderMenu) {
                    const descOption = orderMenu.querySelector('[data-order="desc"]');
                    const ascOption = orderMenu.querySelector('[data-order="asc"]');
                    if (descOption) descOption.style.display = 'block';
                    if (ascOption) ascOption.style.display = 'block';
                }
                
                // Restaurer l'ordre par défaut (décroissant) sur la page 1
                if (orderButton && (orderButton.dataset.order || currentOrder) === 'asc') {
                    orderButton.textContent = _profileT('profile.order_desc');
                    orderButton.dataset.order = 'desc';
                    currentOrder = 'desc';
                    // Restaurer l'ordre décroissant des containers
                    sortStarContainers('desc');
                    currentOrderType = 'desc';
                }
            }
            
            // Trouver le container courant (celui paginé) - CORRECTION ICI
            let currentContainer = null;
            allStarGroups.forEach(group => {
                const starContainer = group.querySelector('[id^="star-containers"]');
                // Vérifier si c'est le container pour la note actuelle
                const expectedId = note === 10 ? 'star-containers' : `star-containers-${note}`;
                if (starContainer && starContainer.id === expectedId) {
                    currentContainer = group;
                }
            });
            
            // Si on ne trouve pas, fallback sur le premier visible
            if (!currentContainer) {
                currentContainer = allStarGroups[10 - note]; // Index inversé car on boucle de 10 à 1
            }

            // Fonction pour gérer l'affichage de tous les conteneurs à étoiles
            // Si un conteneur est sur page > 1, afficher seulement celui-là, sinon afficher tous
            function updateAllStarContainersVisibility() {
                const allGroups = document.querySelectorAll('.star-rating-group');
                
                // Vérifier si au moins un conteneur est sur une page > 1
                let hasPageGreaterThanOne = false;
                let activeContainerGroup = null;
                
                // Vérifier tous les conteneurs
                allGroups.forEach(group => {
                    const starContainer = group.querySelector('[id^="star-containers"]');
                    if (starContainer) {
                        // Extraire le numéro de note du container
                        let containerNote = null;
                        if (starContainer.id === 'star-containers') {
                            containerNote = 10;
                        } else {
                            const match = starContainer.id.match(/star-containers-(\d+)/);
                            if (match) {
                                containerNote = parseInt(match[1]);
                            }
                        }
                        
                        if (containerNote !== null && window.starCurrentPages && window.starCurrentPages[containerNote] > 1) {
                            hasPageGreaterThanOne = true;
                            activeContainerGroup = group;
                        }
                    }
                });
                
                // Mettre à jour la visibilité
                if (hasPageGreaterThanOne && activeContainerGroup) {
                    // Cacher tous les autres groupes sauf celui actif
                    allGroups.forEach(group => {
                        if (group === activeContainerGroup) {
                            group.style.display = '';
                        } else {
                            group.style.display = 'none';
                        }
                    });
                } else {
                    // Afficher tous les groupes (tous sont sur page 1)
                    allGroups.forEach(group => {
                        group.style.display = '';
                    });
                }
            }
            
            if (page > 1) {
                // Mettre à jour la visibilité de tous les conteneurs
                updateAllStarContainersVisibility();
                
                // Créer et placer le bouton "Bas" en haut du conteneur
                const oldTopBtn = container.parentNode.querySelector('.star-scroll-to-bottom-btn');
                if (oldTopBtn) oldTopBtn.remove();
                
                const scrollToBottomBtn = document.createElement('button');
                scrollToBottomBtn.className = 'star-scroll-to-bottom-btn';
                scrollToBottomBtn.innerHTML = _profileT('common.scroll_bottom') || '↓ Bas';
                scrollToBottomBtn.title = _profileT('common.scroll_bottom_title') || 'Descendre en bas de la page';
                scrollToBottomBtn.style.cssText = `
                    display: block;
                    margin: 0 auto 20px auto;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 8px;
                    background: #00b894;
                    color: white;
                    font-weight: 600;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                `;
                scrollToBottomBtn.onmouseover = () => {
                    scrollToBottomBtn.style.background = '#00a085';
                    scrollToBottomBtn.style.transform = 'scale(1.05)';
                };
                scrollToBottomBtn.onmouseout = () => {
                    scrollToBottomBtn.style.background = '#00b894';
                    scrollToBottomBtn.style.transform = 'scale(1)';
                };
                scrollToBottomBtn.onclick = () => {
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                };
                // Insérer le bouton avant le conteneur
                container.parentNode.insertBefore(scrollToBottomBtn, container);
                
                // Style du container paginé
                container.style.display = 'flex';
                container.style.flexWrap = 'wrap';
                container.style.columnGap = '2rem'; // Gap horizontal entre les colonnes
                container.style.rowGap = '0.5rem'; // Gap vertical minimal entre les lignes
                container.style.justifyContent = 'flex-start';
                container.style.alignItems = 'flex-start';
                container.style.alignContent = 'flex-start'; // Aligner le contenu en haut
                container.style.width = '100%';
                container.style.maxWidth = '1400px';
                container.style.minHeight = '13000px'; // même hauteur avec ou sans genre
                container.style.margin = '0 auto';
                container.style.padding = '2rem';
                container.style.background = '#23262f';
                container.style.borderRadius = '18px';
                container.style.boxShadow = '0 2px 16px #0006';
                setTimeout(() => { container.style.minHeight = '13000px'; }, 50);
            } else {
                // Retirer le bouton "Bas" si on revient à la page 1
                const oldTopBtn = container.parentNode.querySelector('.star-scroll-to-bottom-btn');
                if (oldTopBtn) oldTopBtn.remove();
                // Mettre à jour la visibilité de tous les conteneurs (pour réafficher si nécessaire)
                updateAllStarContainersVisibility();
                
                if (mainContainer) mainContainer.style.gap = '2rem';
                // Restaure le style du container
                container.style.display = 'flex';
                container.style.flexWrap = 'wrap';
                container.style.flexDirection = 'row';
                container.style.gap = '2rem';
                container.style.justifyContent = 'flex-start';
                container.style.alignItems = 'flex-start';
                container.style.maxWidth = '1100px';
                container.style.minHeight = '340px';
                container.style.margin = '0 auto';
                container.style.padding = '2rem 1.5rem';
                container.style.background = '#23262f';
                container.style.borderRadius = '18px';
                container.style.boxShadow = '0 2px 16px #0006';
            }
            container.innerHTML = '';
            // Réinitialiser le flag d'événements puisque le container est vidé
            container.removeAttribute('data-drag-events-attached');
            
            // Calculer le pageSize pour cette page
            let currentPageSize;
            if (page === 1) {
                currentPageSize = 3; // Page 1 : 3 cartes
            } else {
                // Calculer combien de cartes sont déjà affichées (page 1 = 3)
                const page1Size = 3;
                // Pour la page 2+, calculer en fonction du conteneur
                // Approximativement 100 cartes pour remplir le conteneur
                currentPageSize = 100;
            }
            
            // Calculer l'index de début en tenant compte des pages précédentes
            let start = 0;
            if (page === 1) {
                start = 0;
            } else {
                // Page 1 a 3 cartes, donc page 2 commence à l'index 3
                start = 3 + (page - 2) * currentPageSize;
            }
            
            const end = start + currentPageSize;
            const pageAnimes = filteredAnimes.slice(start, end);
            
            // Log de débogage pour comprendre pourquoi les anime ne sont pas affichés
            if (note === 10) {
                console.log(`🔍 [RENDER PAGE] Note ${note}, Page ${page}: selectedType=${selectedType}, filteredAnimes=${filteredAnimes.length}, pageAnimes=${pageAnimes.length}`, pageAnimes.map(a => ({
                    id: a.id,
                    titre: a.titre || a.title,
                    contentType: a.contentType,
                    note: a.note
                })));
            }
            
            // NOTE : On ne filtre plus les animes qui ont le même titre de base qu'un anime dans le top 10
            // Cela permet aux différentes saisons d'apparaître dans les containers d'étoiles même si une saison est dans le top 10
            
            // Créer les cartes de manière asynchrone pour pouvoir attendre getUserTop10
            (async () => {
                for (const anime of pageAnimes) {
                    const index = pageAnimes.indexOf(anime);
                    const titre = anime.titre || anime.title || anime.name || "Titre inconnu";
                    const image = anime.image || anime.img || anime.cover || "";
                    let genres = anime.genres;
                // Recherche du vrai synopsis :
                let synopsis = anime.synopsis || anime.synopsisPerso;
                if (!synopsis) {
                    // Cherche dans le tableau animes du haut du fichier
                    const found = animes.find(a => (a.id === anime.id || a.titre === titre || (a.titre && a.titre.toLowerCase() === titre.toLowerCase())));
                    if (found && found.synopsis) synopsis = found.synopsis;
                }
                if (!genres || !Array.isArray(genres) || genres.length === 0) {
                    if (titre.toLowerCase().includes("death note")) {
                        genres = ["Mystère", "Psychologique", "Surnaturel", "Thriller", "Shonen"];
                    } else if (titre.toLowerCase().includes("attaque des titans")) {
                        genres = ["Action", "Drame", "Fantastique", "Shonen"];
                    } else if (titre.toLowerCase().includes("naruto")) {
                        genres = ["Action", "Aventure", "Comédie", "Drame", "Fantastique", "Shonen"];
                    } else if (titre.toLowerCase().includes("one piece")) {
                        genres = ["Action", "Aventure", "Comédie", "Fantastique", "Shonen"];
                    } else {
                        genres = ["Genre inconnu"];
                    }
                }
                if (!synopsis) {
                    synopsis = (typeof window.t === 'function' && window.t('no_synopsis_available')) || "Synopsis non renseigné.";
                }
                // Générer le lien vers la page de détails avec l'ID et le type
                // TOUJOURS utiliser anime-details.html, même si anime.page existe (pour éviter les anciens liens)
                const animeIdForLink = anime.id || anime.mal_id || anime.malId || '';
                const contentTypeForLink = anime.contentType || (anime.isManga ? 'manga' : 'anime');
                let pageHtml = "#";
                
                // Si on a un ID, créer le lien vers anime-details.html
                if (animeIdForLink) {
                    pageHtml = `anime-details.html?id=${animeIdForLink}&type=${contentTypeForLink}`;
                    console.log(`🔗 [LINK GENERATION] Carte "${titre}" - ID: ${animeIdForLink}, Type: ${contentTypeForLink}, Lien: ${pageHtml}`);
                } else {
                    console.warn(`⚠️ [LINK GENERATION] Carte "${titre}" n'a pas d'ID - pas de lien généré`);
                }
                const genresHtml = genres.map(g => {
                    const displayG = getTranslatedGenreForProfile(g);
                    const fontSize = genres.length >= 5 ? '0.75rem' : '0.92rem';
                    const padding = genres.length >= 5 ? '0.1em 0.4em' : '0.15em 0.6em';
                    return `<a href="mangas.html?genre=${encodeURIComponent(g)}" class="profile-genre-link" style="background:#00b89422;color:#00b894;font-weight:600;padding:${padding};border-radius:10px;font-size:${fontSize};letter-spacing:0.01em;text-decoration:none;transition:background 0.2s;" 
                    onclick="event.preventDefault();window.location.href='mangas.html?genre=${encodeURIComponent(g)}';">${displayG}</a>`;
                }).join('');

                
                const card = document.createElement('div');
                card.className = 'catalogue-card';
                card.setAttribute('data-anime-id', anime.id);
                card.setAttribute('draggable', 'true');
                
                // Marquer le type de la carte pour le filtrage
                if (anime.contentType === 'manga' || anime.isManga) {
                    card.setAttribute('data-is-manga', 'true');
                    card.classList.add('manga-card');
                }
                card.style = `
                    background: linear-gradient(135deg, #23262f 80%, #00b89422 100%);
                    border: 2.5px solid #00b894;
                    border-radius: 18px;
                    box-shadow: 0 4px 18px #00b89433, 0 2px 8px #0008;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 1.1rem 1.1rem 1rem 1.1rem;
                    width: 340px;
                    height: 520px;
                    min-height: 520px;
                    max-height: 520px;
                    margin: 0;
                    overflow: hidden;
                    transition: box-shadow 0.2s, transform 0.2s;
                    position: relative;
                    flex: 0 0 340px;
                    box-sizing: border-box;
                `;
                // Ajout pour 3 cartes par ligne sur la page 1
                if (page === 1) {
                    card.style.display = "flex";
                    card.style.flexDirection = "column";
                    card.style.flex = "0 0 calc(33.333% - 2rem)";
                    card.style.maxWidth = "340px";
                    card.style.width = "calc(33.333% - 2rem)";
                    card.style.height = "520px"; // Hauteur fixe identique pour toutes les cartes
                    card.style.minHeight = "520px"; // Hauteur minimale
                    card.style.maxHeight = "520px"; // Hauteur maximale
                    card.style.boxSizing = "border-box";
                    card.style.visibility = "visible";
                    card.style.opacity = "1";
                } else {
                    // Pages 2+ : style pour que les cartes se suivent directement
                    card.style.display = "flex";
                    card.style.flexDirection = "column";
                    card.style.flex = "0 0 auto"; // Taille fixe basée sur width/height
                    card.style.flexBasis = "auto"; // Pas de base de croissance
                    card.style.maxWidth = "340px";
                    card.style.width = "340px";
                    card.style.height = "520px"; // Hauteur fixe
                    card.style.minHeight = "520px"; // Hauteur minimale
                    card.style.maxHeight = "520px"; // Hauteur maximale
                    card.style.boxSizing = "border-box";
                    card.style.visibility = "visible";
                    card.style.opacity = "1";
                    card.style.margin = "0"; // Pas de margin
                    card.style.marginBottom = "0"; // Pas de margin bottom
                    card.style.alignSelf = "flex-start"; // Aligner en haut
                }
                // Génère le HTML de la carte (comme avant)
                const uniqueId = `morebtn-${Date.now()}-${Math.floor(Math.random()*100000)}`;
                card.innerHTML = `
                    <button class="card-more-btn" id="${uniqueId}" aria-label="Plus d'options" style="
                        position: absolute;
                        top: 12px;
                        right: 14px;
                        width: 32px;
                        height: 32px;
                        background: #f8f9fa;
                        border: 1.5px solid #00b894;
                        border-radius: 50%;
                        box-shadow: 0 2px 8px #0002;
                        color: #444;
                        font-size: 1.3rem;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        z-index: 10;
                        transition: border-color 0.18s, background 0.18s;
                        outline: none;
                        padding: 0;
                    ">&#8230;</button>
                    <div class="card-more-menu" style="
                        display: none;
                        position: absolute;
                        top: 46px;
                        right: 0;
                        background: #fff;
                        color: #00b894;
                        font-size: 1rem;
                        font-weight: bold;
                        border-radius: 8px;
                        box-shadow: 0 4px 16px #0002;
                        padding: 7px 18px;
                        white-space: nowrap;
                        z-index: 20;
                        border: 1.5px solid #00b894;
                        min-width: 110px;
                        text-align: center;
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.25s;
                    ">
                        <div class="select-top10-btn" style="cursor:pointer;padding:6px 0;pointer-events:auto;color:#00b894;font-weight:bold;font-size:0.9rem;transition:background-color 0.2s;" onmouseover="this.style.backgroundColor='#00b89420'" onmouseout="this.style.backgroundColor='transparent'">${getAddToTop10Label()}</div>
                    </div>
                    <img src="${image}" alt="${titre}" style="width:140px;height:185px;object-fit:cover;display:block;object-position:center center;margin:0 auto 1rem auto;border-radius:10px;box-shadow:0 2px 12px #00b89455;align-self:center;">
                    <a href="${pageHtml}" data-card-link="true" data-anime-id="${animeIdForLink}" data-href="${pageHtml}" style="font-size:1.15rem;margin-bottom:0.5rem;color:#00b894;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;display:block;transition:color 0.2s;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;position:relative;z-index:100;pointer-events:auto;" onmouseover="this.style.color='#00d4aa'" onmouseout="this.style.color='#00b894'">${titre}</a>
                    <div class="content-synopsis profile-card-synopsis" style="color:#b3e6b3;font-size:0.98rem;line-height:1.5;text-align:center;margin-bottom:0.7rem;">${truncateSynopsis(synopsis)}</div>
                    <div class="anime-genres" style="display:flex;flex-wrap:wrap;gap:0.3rem;justify-content:center;margin-bottom:0.5rem;">
                        ${genresHtml}
                    </div>
                    <div style="color:#00b894;font-size:1.1rem;font-weight:bold;text-align:center;">
                        ${_profileT('profile.rating_label') || 'Note'}: ${anime.note || (_profileT('profile.not_rated') || 'Non noté')}/10
                    </div>
                `;
                
                // IMPORTANT: Attacher les événements APRÈS avoir ajouté la carte au DOM
                // Ajouter d'abord la carte au container
                const existingCardForLink = container.querySelector(`[data-anime-id="${anime.id}"]`);
                if (!existingCardForLink) {
                    container.appendChild(card);
                }
                
                // Attacher les événements après que la carte soit dans le DOM
                setTimeout(() => {
                    const titleLink = card.querySelector('a[data-card-link="true"]');
                    if (titleLink) {
                        const href = titleLink.getAttribute('href') || titleLink.getAttribute('data-href');
                        console.log('🔗 [TITLE LINK] Lien trouvé pour carte:', titre, 'href:', href, 'ID:', animeIdForLink, 'Page:', page);
                        
                        // Empêcher le drag sur le lien
                        titleLink.setAttribute('draggable', 'false');
                        
                        // Vérifier si les événements sont déjà attachés
                        if (titleLink.hasAttribute('data-events-attached')) {
                            console.log('⚠️ [TITLE LINK] Événements déjà attachés pour:', titre);
                            return; // Les événements sont déjà attachés
                        }
                        titleLink.setAttribute('data-events-attached', 'true');
                        
                        // Fonction pour naviguer vers la page de détails
                        const navigateToDetails = function() {
                            const linkHref = titleLink.getAttribute('data-href') || titleLink.getAttribute('href');
                            console.log('🖱️ [TITLE NAVIGATE] Navigation vers:', titre, 'href:', linkHref, 'Page:', page);
                            
                            if (linkHref && linkHref !== '#' && linkHref !== 'undefined') {
                                console.log('✅ [TITLE NAVIGATE] Redirection vers:', linkHref);
                                window.location.href = linkHref;
                            } else {
                                console.warn('⚠️ [TITLE NAVIGATE] Lien invalide ou vide:', linkHref);
                            }
                        };
                        
                        // Forcer le clic sur le lien avec plusieurs méthodes
                        const clickHandler = function(e) {
                            console.log('🖱️ [TITLE CLICK] Event déclenché pour:', titre, 'Page:', page);
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            navigateToDetails();
                            return false;
                        };
                        
                        // Attacher avec capture phase (priorité maximale)
                        titleLink.addEventListener('click', clickHandler, { capture: true, once: false });
                        // Attacher aussi sans capture pour être sûr
                        titleLink.addEventListener('click', clickHandler, { capture: false, once: false });
                        // Alternative onclick
                        titleLink.onclick = clickHandler;
                        
                        // Utiliser mousedown pour naviguer directement si click ne fonctionne pas
                        let mousedownTime = 0;
                        titleLink.addEventListener('mousedown', function(e) {
                            // Seulement pour le bouton gauche de la souris
                            if (e.button === 0) {
                                e.stopPropagation();
                                mousedownTime = Date.now();
                                console.log('🖱️ [TITLE MOUSEDOWN] Mousedown détecté pour:', titre, 'Page:', page);
                                
                                // Si le click n'est pas déclenché dans les 200ms, naviguer directement
                                setTimeout(() => {
                                    // Vérifier si on n'a pas déjà navigué (click a pu être déclenché)
                                    if (Date.now() - mousedownTime < 250) {
                                        console.log('🔄 [TITLE MOUSEDOWN] Click non détecté, navigation directe pour:', titre);
                                        navigateToDetails();
                                    }
                                }, 200);
                            }
                        }, true);
                        
                        // S'assurer que le lien est cliquable
                        titleLink.style.position = 'relative';
                        titleLink.style.zIndex = '100';
                        titleLink.style.pointerEvents = 'auto';
                        titleLink.style.cursor = 'pointer';
                        
                        console.log('✅ [TITLE LINK] Événements attachés pour:', titre, 'Page:', page);
                    } else {
                        console.warn('⚠️ [TITLE LINK] Aucun lien trouvé pour carte:', titre, 'Page:', page);
                    }
                }, page === 1 ? 200 : 50); // Délai plus long pour la page 1
                
                // Drag and drop events
                card.addEventListener('dragstart', function(e) {
                    // Si on clique sur un lien, ne pas démarrer le drag
                    if (e.target.tagName === 'A' || e.target.closest('a[data-card-link]')) {
                        e.preventDefault();
                        return false;
                    }
                    
                    // Vérifier si la carte a été sélectionnée via le menu contextuel
                    if (window.selectedTop10Card !== card) {
                        e.preventDefault();
                        // Afficher un message d'aide
                        const helpMsg = document.createElement('div');
                        helpMsg.id = 'drag-select-help-msg';
                        helpMsg.textContent = 'Veuillez d\'abord cliquer sur les trois points puis sur "Placer" pour déplacer cette carte.';
                        helpMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#ff6b6b;color:#fff;padding:12px 28px;border-radius:12px;font-size:1.15rem;z-index:9999;box-shadow:0 2px 12px #ff6b6b77;';
                        document.body.appendChild(helpMsg);
                        setTimeout(() => { helpMsg.remove(); }, 3000);
                        return false;
                    }
                    
                    // Si la carte est sélectionnée, permettre le glisser-déposer
                    card.classList.add('anime-card-selected');
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        animeId: anime.id,
                        source: 'menu-selected',
                        contentType: anime.contentType || (anime.isManga ? 'manga' : 'anime')
                    }));
                    
                    // Ajouter un effet visuel pendant le glisser
                    e.currentTarget.style.opacity = '0.5';
                });
                card.addEventListener('dragend', function(e) {
                    card.classList.remove('anime-card-selected');
                    // Restaurer l'opacité de la carte
                    e.currentTarget.style.opacity = '1';
                });
                
                // === EMPÊCHER LE DROP DANS LES CONTAINERS D'ÉTOILES ===
                // Désactiver le drop sur les containers d'étoiles - Utiliser la délégation d'événements
                // Les événements sont déjà gérés au niveau du container, pas besoin de les ajouter ici
                // Menu bouton sélectionner
                const moreBtn = card.querySelector('.card-more-btn');
                const moreMenu = card.querySelector('.card-more-menu');
                
                // Vérifier si la carte est déjà dans le top 10 (global ou genre selon le contexte)
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                let shouldHideButton = false;
                
                if (user && user.email) {
                    // Déterminer le contexte de la carte
                    const isInGenreContainer = card.closest('#genre-filtered-container') || card.closest('#genre-cards-container');
                    const isInStarContainer = card.closest('[id^="star-containers"]');
                    
                    if (isInGenreContainer) {
                        // Dans les conteneurs de genre : vérifier le top 10 du genre spécifique + type réel
                        const genres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
                        const genre = genres.length > 0 ? genres.sort().join(',') : null;
                        let type = window.selectedType || null;
                        
                        // Si un genre "type" est sélectionné (Doujin, Manhwa, Manhua), utiliser le type réel
                        if (type === 'manga') {
                            const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
                            if (genres.some(g => typeGenres.includes(g))) {
                                if (genres.includes('Doujin')) {
                                    type = 'doujin';
                                } else if (genres.includes('Manhwa')) {
                                    type = 'manhwa';
                                } else if (genres.includes('Manhua')) {
                                    type = 'manhua';
                                }
                            }
                        }
                        
                        const genreTop10 = await getUserTop10(user, genre, type);
                        // Pour les animes UNIQUEMENT, comparer aussi par titre de base (sans saison/partie)
                        const animeTitle = anime.titre || anime.title || anime.name || '';
                        const isInGenreTop10 = genreTop10.some(a => {
                            if (!a) return false;
                            // Comparaison par ID d'abord
                            if (String(a.id) === String(anime.id)) {
                                console.log(`✅ [BUTTON HIDE RENDER] Carte ${anime.id} trouvée dans le top 10 genre par ID exact dans renderStarPage`);
                                return true;
                            }
                            
                            // IMPORTANT: Ne comparer par titre que si les deux éléments sont du MÊME type
                            // Les films ont leur propre Top 10 et ne doivent pas être comparés avec les anime
                            const top10ContentType = a.contentType || (type === 'anime' ? 'anime' : (type === 'film' ? 'film' : null));
                            const animeContentType = anime.contentType || (type === 'anime' ? 'anime' : (type === 'film' ? 'film' : null));
                            
                            // Si les types sont différents (ex: film vs anime), ne pas comparer par titre
                            if (top10ContentType && animeContentType && top10ContentType !== animeContentType) {
                                return false; // Types différents, ce n'est pas la même carte
                            }
                            
                            // Pour les animes UNIQUEMENT, comparer aussi par titre de base et similarité
                            // MAIS seulement si les deux sont des anime (pas de film)
                            if (type === 'anime' && top10ContentType === 'anime' && animeContentType === 'anime') {
                                const top10Title = a.titre || a.title || a.name || '';
                                const animeTitleFromVar = animeTitle || '';
                                
                                if (!top10Title || !animeTitleFromVar) {
                                    return false;
                                }
                                
                                const top10BaseTitle = extractBaseAnimeTitle(top10Title, 'anime');
                                const animeBaseTitle = extractBaseAnimeTitle(animeTitleFromVar, 'anime');
                                
                                // Normaliser les titres de base pour la comparaison
                                const normalizedTop10Base = (top10BaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ');
                                const normalizedAnimeBase = (animeBaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ');
                                
                                // Si les titres de base correspondent exactement, masquer le bouton
                                if (normalizedTop10Base && normalizedAnimeBase && normalizedTop10Base === normalizedAnimeBase) {
                                    console.log(`✅ [BUTTON HIDE RENDER GENRE] Titres de base identiques: "${top10BaseTitle}" === "${animeBaseTitle}"`);
                                    return true;
                                }
                                
                                // Si les titres sont similaires (même série sans indication explicite de saison), masquer le bouton
                                if (areAnimeTitlesSimilar(top10Title, animeTitleFromVar, 'anime')) {
                                    console.log(`✅ [BUTTON HIDE RENDER GENRE] Cartes similaires détectées: "${top10Title}" vs "${animeTitleFromVar}"`);
                                    return true;
                                }
                                
                                // Vérification supplémentaire pour les séries avec saisons : comparer les préfixes
                                const isSeriesTop10 = isSeriesWithMultipleSeasons(top10Title);
                                const isSeriesAnime = isSeriesWithMultipleSeasons(animeTitleFromVar);
                                if (isSeriesTop10 || isSeriesAnime) {
                                    const prefixLength = Math.min(15, Math.min(normalizedTop10Base.length, normalizedAnimeBase.length));
                                    if (prefixLength >= 15) {
                                        const top10Prefix = normalizedTop10Base.substring(0, prefixLength);
                                        const animePrefix = normalizedAnimeBase.substring(0, prefixLength);
                                        if (top10Prefix === animePrefix) {
                                            console.log(`✅ [BUTTON HIDE SERIES RENDER GENRE] Préfixes identiques: "${top10Prefix}"`);
                                            return true;
                                        }
                                    }
                                }
                            }
                            
                            // Pour les films UNIQUEMENT, comparer aussi par titre de base et similarité
                            // MAIS seulement si les deux sont des films (pas d'anime)
                            if (type === 'film' && top10ContentType === 'film' && animeContentType === 'film') {
                                const top10Title = a.titre || a.title || a.name || '';
                                const animeTitleFromVar = animeTitle || '';
                                
                                if (!top10Title || !animeTitleFromVar) {
                                    return false;
                                }
                                
                                const top10BaseTitle = extractBaseAnimeTitle(top10Title, 'film');
                                const animeBaseTitle = extractBaseAnimeTitle(animeTitleFromVar, 'film');
                                
                                // Normaliser les titres de base pour la comparaison
                                const normalizedTop10Base = (top10BaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ');
                                const normalizedAnimeBase = (animeBaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ');
                                
                                // Si les titres de base correspondent exactement, masquer le bouton
                                if (normalizedTop10Base && normalizedAnimeBase && normalizedTop10Base === normalizedAnimeBase) {
                                    return true;
                                }
                                
                                // Pour les films, ne PAS utiliser la similarité, seulement la comparaison exacte par titre de base
                                // (Les films ne doivent être comparés que par ID ou titre de base identique)
                            }
                            
                            return false;
                        });
                        shouldHideButton = isInGenreTop10;
                    } else if (isInStarContainer) {
                        // Dans les conteneurs d'étoiles : vérifier le top 10 global du type sélectionné
                        let type = window.selectedType || null;
                        
                        // Si aucun type n'est sélectionné et que la carte est un anime, vérifier aussi le top 10 "anime"
                        let globalTop10 = await getUserTop10(user, null, type);
                        const animeContentType = anime.contentType || (type === 'anime' ? 'anime' : (type === 'film' ? 'film' : (type === 'manga' ? 'manga' : 'anime')));
                        if (!type && animeContentType === 'anime') {
                            // Vérifier aussi le top 10 "anime" spécifiquement pour les cartes anime
                            const animeTop10 = await getUserTop10(user, null, 'anime');
                            // Combiner les deux listes (en évitant les doublons)
                            const combinedTop10 = [...globalTop10];
                            animeTop10.forEach(item => {
                                if (!combinedTop10.some(existing => String(existing?.id) === String(item?.id))) {
                                    combinedTop10.push(item);
                                }
                            });
                            globalTop10 = combinedTop10;
                        }
                        
                        // Pour les animes UNIQUEMENT, comparer aussi par titre de base (sans saison/partie)
                        const animeTitle = anime.titre || anime.title || anime.name || '';
                        const isInGlobalTop10 = globalTop10.some(a => {
                            if (!a) return false;
                            // Comparaison par ID d'abord
                            if (String(a.id) === String(anime.id)) {
                                console.log(`✅ [BUTTON HIDE RENDER] Carte ${anime.id} trouvée dans le top 10 par ID exact dans renderStarPage`);
                                return true;
                            }
                            
                            // IMPORTANT: Ne comparer par titre que si les deux éléments sont du MÊME type
                            // Les films ont leur propre Top 10 et ne doivent pas être comparés avec les anime
                            const top10ContentType = a.contentType || (type === 'anime' ? 'anime' : (type === 'film' ? 'film' : null));
                            const animeContentType = anime.contentType || (type === 'anime' ? 'anime' : (type === 'film' ? 'film' : null));
                            
                            // Si les types sont différents (ex: film vs anime), ne pas comparer par titre
                            if (top10ContentType && animeContentType && top10ContentType !== animeContentType) {
                                return false; // Types différents, ce n'est pas la même carte
                            }
                            
                            // Pour les animes UNIQUEMENT, comparer aussi par titre de base et similarité
                            // MAIS seulement si les deux sont du même type (anime/anime ou manga/manga, pas de mélange)
                            // IMPORTANT: Vérifier aussi quand type est null ou "tous types" en se basant sur animeContentType
                            const isAnimeType = (type === 'anime' || (!type && animeContentType === 'anime'));
                            const isMangaType = (type === 'manga' || (!type && animeContentType === 'manga'));
                            if ((isAnimeType || isMangaType) && 
                                top10ContentType === animeContentType && animeContentType) {
                                const contentTypeForExtraction = animeContentType; // 'anime' ou 'manga'
                                const top10Title = a.titre || a.title || a.name || '';
                                const top10BaseTitle = extractBaseAnimeTitle(top10Title, contentTypeForExtraction);
                                const animeBaseTitle = extractBaseAnimeTitle(animeTitle, contentTypeForExtraction);
                                // Normaliser les titres de base pour la comparaison (minuscules, sans espaces multiples)
                                const normalizedTop10Base = (top10BaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ');
                                const normalizedAnimeBase = (animeBaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ');
                                
                                // Si les titres de base correspondent exactement, masquer le bouton
                                if (normalizedTop10Base && normalizedAnimeBase && normalizedTop10Base === normalizedAnimeBase) {
                                    console.log(`✅ [BUTTON HIDE RENDER] Titres de base identiques: "${top10BaseTitle}" === "${animeBaseTitle}"`);
                                    return true;
                                } else {
                                    const isSeriesTop10 = isSeriesWithMultipleSeasons(top10Title);
                                    const isSeriesAnime = isSeriesWithMultipleSeasons(animeTitle);
                                    if (isSeriesTop10 || isSeriesAnime) {
                                        console.log(`🔍 [BUTTON DEBUG SERIES RENDER] Titres de base normalisés: "${normalizedTop10Base}" vs "${normalizedAnimeBase}"`);
                                        
                                        // Pour les séries avec saisons, vérifier aussi si les préfixes correspondent (au moins 15 caractères)
                                        const prefixLength = Math.min(15, Math.min(normalizedTop10Base.length, normalizedAnimeBase.length));
                                        if (prefixLength >= 15) {
                                            const top10Prefix = normalizedTop10Base.substring(0, prefixLength);
                                            const animePrefix = normalizedAnimeBase.substring(0, prefixLength);
                                            if (top10Prefix === animePrefix) {
                                                console.log(`✅ [BUTTON HIDE SERIES RENDER] Préfixes identiques détectés: "${top10Prefix}"`);
                                                return true;
                                            }
                                        }
                                    }
                                }
                                
                                // Si les titres sont similaires (même série sans indication explicite de saison), masquer le bouton
                                if (areAnimeTitlesSimilar(top10Title, animeTitle, contentTypeForExtraction)) {
                                    console.log(`✅ [BUTTON HIDE RENDER] Cartes similaires détectées via areAnimeTitlesSimilar (${contentTypeForExtraction}): "${top10Title}" vs "${animeTitle}"`);
                                    return true;
                                } else {
                                    const isSeriesTop10 = isSeriesWithMultipleSeasons(top10Title);
                                    const isSeriesAnime = isSeriesWithMultipleSeasons(animeTitle);
                                    if (isSeriesTop10 || isSeriesAnime) {
                                        console.log(`🔍 [BUTTON DEBUG SERIES RENDER] areAnimeTitlesSimilar retourné false pour: "${top10Title}" vs "${animeTitle}"`);
                                    }
                                }
                                
                                // Vérification supplémentaire : comparer directement les titres bruts par préfixe
                                const normalizedTop10Raw = top10Title.toLowerCase().trim().replace(/\s+/g, ' ');
                                const normalizedAnimeRaw = animeTitle.toLowerCase().trim().replace(/\s+/g, ' ');
                                if (normalizedTop10Raw.length > 5 && normalizedAnimeRaw.length > 5) {
                                    const prefixLength = Math.min(20, Math.min(normalizedTop10Raw.length, normalizedAnimeRaw.length));
                                    const top10Prefix = normalizedTop10Raw.substring(0, prefixLength);
                                    const animePrefix = normalizedAnimeRaw.substring(0, prefixLength);
                                    if (normalizedTop10Raw.startsWith(animePrefix) || normalizedAnimeRaw.startsWith(top10Prefix)) {
                                        console.log(`✅ [BUTTON HIDE RENDER] Préfixes similaires détectés: "${top10Title}" vs "${animeTitle}" (préfixe: "${top10Prefix}" vs "${animePrefix}")`);
                                        return true;
                                    }
                                }
                            }
                            
                            // Pour les films UNIQUEMENT, comparer aussi par titre de base et similarité
                            // MAIS seulement si les deux sont des films (pas d'anime)
                            if (type === 'film' && top10ContentType === 'film' && animeContentType === 'film') {
                                const top10Title = a.titre || a.title || a.name || '';
                                const top10BaseTitle = extractBaseAnimeTitle(top10Title, 'film');
                                const animeBaseTitle = extractBaseAnimeTitle(animeTitle, 'film');
                                // Si les titres de base correspondent exactement, masquer le bouton
                                if (top10BaseTitle && animeBaseTitle && top10BaseTitle === animeBaseTitle) {
                                    return true;
                                }
                                // Pour les films, ne PAS utiliser la similarité, seulement la comparaison exacte par titre de base
                                // (Les films ne doivent être comparés que par ID ou titre de base identique)
                            }
                            
                            return false;
                        });
                        shouldHideButton = isInGlobalTop10;
                    }
                }
                
                if (moreBtn) {
                    // Ne pas masquer les boutons dans le top 10
                    const isInTop10Slot = moreBtn.hasAttribute('data-in-top10') || 
                                          moreBtn.hasAttribute('data-top10-button') ||
                                          card.closest('[id^="catalogue-card-"]') !== null ||
                                          card.closest('.top10-slot') !== null;
                    
                    if (shouldHideButton && !isInTop10Slot) {
                        console.log(`🔘 [BUTTON HIDE RENDER] Masquage du bouton pour la carte ${anime.id} dans renderStarPage`);
                        moreBtn.style.setProperty('display', 'none', 'important');
                        moreBtn.style.setProperty('visibility', 'hidden', 'important');
                        moreBtn.style.setProperty('opacity', '0', 'important');
                        moreBtn.style.setProperty('pointer-events', 'none', 'important');
                    } else if (!shouldHideButton && !isInTop10Slot) {
                        moreBtn.style.removeProperty('display');
                        moreBtn.style.removeProperty('visibility');
                        moreBtn.style.removeProperty('opacity');
                        moreBtn.style.removeProperty('pointer-events');
                    }
                }
                if (moreMenu) {
                    moreMenu.style.display = 'none';
                    moreMenu.style.opacity = '0';
                    moreMenu.style.pointerEvents = 'none';
                    moreMenu.style.visibility = 'hidden';
                }
                moreBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    if (moreMenu.style.display === 'none') {
                        moreMenu.style.display = 'block';
                        setTimeout(() => {
                            moreMenu.style.opacity = '1';
                            moreMenu.style.pointerEvents = 'auto';
                        }, 10);
                    } else {
                        moreMenu.style.opacity = '0';
                        moreMenu.style.pointerEvents = 'none';
                        setTimeout(() => {
                            moreMenu.style.display = 'none';
                        }, 250);
                    }
                }, true); // Utiliser capture: true pour être exécuté en premier
                
                // Action "Ajouter au top 10" pour les containers d'étoiles
                const selectBtn = moreMenu.querySelector('.select-top10-btn');
                if (selectBtn) {
                    selectBtn.onclick = function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        
                        // Si la carte est déjà sélectionnée, la désélectionner
                        if (window.selectedTop10Card === card) {
                            setAnimeCardSelection(card, false);
                            window.selectedTop10Card = null;
                            if (moreMenu) {
                                moreMenu.style.opacity = '0';
                                moreMenu.style.pointerEvents = 'none';
                                setTimeout(() => {
                                    moreMenu.style.display = 'none';
                                }, 250);
                            }
                            return;
                        }
                        
                        // S'assurer que la carte est bien définie
                        if (!card) {
                            console.error('🔘 ERREUR: Carte non définie dans renderStarPage');
                            return;
                        }
                        
                        // Si une autre carte était sélectionnée, la désélectionner
                        if (window.selectedTop10Card && window.selectedTop10Card !== card) {
                            setAnimeCardSelection(window.selectedTop10Card, false);
                        }
                        
                        // Sélectionner la carte
                        setAnimeCardSelection(card, true);
                        window.selectedTop10Card = card;
                        
                        // Fermer le menu
                        if (moreMenu) {
                            moreMenu.style.opacity = '0';
                            moreMenu.style.pointerEvents = 'none';
                            setTimeout(() => {
                                moreMenu.style.display = 'none';
                            }, 100);
                        }
                        
                        // Afficher l'interface en miniature après un court délai pour s'assurer que la carte est bien sélectionnée
                        setTimeout(() => {
                            if (window.selectedTop10Card && window.selectedTop10Card === card) {
                                showTop10MiniInterface();
                            } else {
                                console.error('🔘 ERREUR: window.selectedTop10Card est null ou différent après délai');
                            }
                        }, 100);
                        
                        // Fermer le menu ...
                        if (moreMenu) {
                            moreMenu.style.opacity = '0';
                            moreMenu.style.pointerEvents = 'none';
                            setTimeout(() => {
                                moreMenu.style.display = 'none';
                            }, 250);
                        }
                        // Le bouton '...' reste visible
                    };
                }
                
                // Gestionnaire d'événement pour fermer le menu quand on clique ailleurs
                let hideMenuHandler = null;
                
                function addHideMenuHandler() {
                    // Supprimer l'ancien gestionnaire s'il existe
                    if (hideMenuHandler) {
                        document.removeEventListener('click', hideMenuHandler);
                    }
                    
                    hideMenuHandler = function(e) {
                        // Ne pas fermer si on clique sur le bouton, le menu ou le bouton "Ajouter au top 10"
                        const selectTop10Btn = moreMenu.querySelector('.select-top10-btn');
                        const clickedElement = e.target;
                        
                        // Vérifier si le clic est sur le bouton "Ajouter au top 10" ou à l'intérieur
                        const isClickOnSelectBtn = selectTop10Btn && (
                            selectTop10Btn === clickedElement || 
                            selectTop10Btn.contains(clickedElement) ||
                            clickedElement.closest('.select-top10-btn') === selectTop10Btn
                        );
                        
                        if (moreBtn.contains(clickedElement) || 
                            moreMenu.contains(clickedElement) || 
                            isClickOnSelectBtn) {
                            return;
                        }
                        
                        // Fermer le menu immédiatement
                        moreMenu.style.opacity = '0';
                        moreMenu.style.pointerEvents = 'none';
                        moreMenu.style.display = 'none';
                        moreMenu.style.visibility = 'hidden';
                        isMenuOpen = false;
                        
                        // Supprimer le gestionnaire
                        document.removeEventListener('click', hideMenuHandler);
                        hideMenuHandler = null;
                    };
                    
                    // Ajouter le nouveau gestionnaire avec un délai plus long
                    setTimeout(() => {
                        document.addEventListener('click', hideMenuHandler, true); // true = capture phase
                    }, 500); // Délai plus long pour éviter la fermeture immédiate
                }
                
                // Vérifier que le type correspond avant d'ajouter la carte au container
                let animeType = anime.contentType || 'anime';
                const selectedType = window.selectedType;
                const isAllTypes = !selectedType || selectedType === 'Tous types' || selectedType === 'tous';
                
                // IMPORTANT: Si contentType est explicitement 'anime', ne jamais le changer
                // PRIORITÉ: Utiliser contentType d'abord, puis détecter par titre/genres
                if (anime.contentType === 'anime') {
                    animeType = 'anime';
                } else if (anime.contentType === 'manga') {
                    animeType = 'manga';
                } else if (anime.contentType === 'film') {
                    animeType = 'film';
                } else if (anime.contentType === 'doujin') {
                    animeType = 'doujin';
                } else if (anime.contentType === 'roman') {
                    animeType = 'roman';
                } else if (anime.contentType === 'manhua') {
                    animeType = 'manhua';
                } else if (anime.contentType === 'manhwa') {
                    animeType = 'manhwa';
                } else if (!anime.contentType && anime.isManga) {
                    // Fallback pour les anciennes notes qui utilisent encore isManga
                    animeType = 'manga';
                } else if (anime.titre && (
                    anime.titre.toLowerCase().includes('doujin') ||
                    anime.titre.toLowerCase().includes('totally captivated') ||
                    anime.titre.toLowerCase().includes('hentai') ||
                    (anime.genres && anime.genres.some(g => {
                        const gLower = g.toLowerCase();
                        return gLower.includes('erotica') || gLower.includes('adult') || gLower.includes('hentai');
                    }))
                )) {
                    animeType = 'doujin';
                } else if (anime.titre && (
                    anime.titre.toLowerCase().includes('roman') ||
                    anime.titre.toLowerCase().includes('novel') ||
                    (anime.id && anime.id.toString().includes('roman'))
                )) {
                    animeType = 'roman';
                } else if (anime.titre && (
                    anime.titre.toLowerCase().includes('manhua') ||
                    anime.titre.toLowerCase().includes('sq: begin w/your name') ||
                    anime.titre.toLowerCase().includes('sq begin') ||
                    anime.titre.toLowerCase().includes('begin w/your name') ||
                    anime.titre.toLowerCase().includes('begin with your name') ||
                    (anime.id && anime.id.toString().includes('manhua'))
                )) {
                    animeType = 'manhua';
                } else if (anime.titre && (
                    anime.titre.toLowerCase().includes('manhwa') ||
                    (anime.id && anime.id.toString().includes('manhwa')) ||
                    // Détection par patterns typiques des manhwa coréens
                    anime.titre.toLowerCase().includes('on the way to meet mom') ||
                    anime.titre.toLowerCase().includes('solo leveling') ||
                    anime.titre.toLowerCase().includes('tower of god') ||
                    anime.titre.toLowerCase().includes('noblesse') ||
                    anime.titre.toLowerCase().includes('the beginning after the end')
                )) {
                    animeType = 'manhwa';
                } else if (anime.titre && (
                    anime.titre.toLowerCase().includes('film') ||
                    anime.titre.toLowerCase().includes('movie') ||
                    (anime.id && anime.id.toString().includes('film'))
                )) {
                    animeType = 'film';
                }
                // Si aucun type spécial n'est détecté et que contentType n'est pas défini, garder 'anime' par défaut
                
                // IMPORTANT: Les cartes dans filteredAnimes ont DÉJÀ été filtrées correctement
                // Donc on affiche TOUTES les cartes de pageAnimes sans re-filtrage
                // La carte est déjà ajoutée au container plus haut (ligne 6805-6808)
                // S'assurer que la carte est bien visible
                if (existingCardForLink) {
                    existingCardForLink.style.display = 'flex';
                    existingCardForLink.style.opacity = '1';
                    existingCardForLink.style.visibility = 'visible';
                } else {
                    // S'assurer que la carte est bien visible
                    card.style.display = 'flex';
                    card.style.opacity = '1';
                    card.style.visibility = 'visible';
                }
                }
            })(); // Fin de la fonction async - attendre que toutes les cartes soient créées
            // Drag and drop sur le container - Ne pas ajouter les événements plusieurs fois
            if (!container.hasAttribute('data-drag-events-attached')) {
                container.setAttribute('data-drag-events-attached', 'true');
                container.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    container.classList.add('catalogue-card-drop-hover');
                });
                container.addEventListener('dragleave', function() {
                    container.classList.remove('catalogue-card-drop-hover');
                });
                container.addEventListener('drop', function(e) {
                    e.preventDefault();
                    container.classList.remove('catalogue-card-drop-hover');
                    const animeId = e.dataTransfer.getData('anime-id');
                    
                    // Utiliser les notes nettoyées et la bonne clé
                    const user = JSON.parse(localStorage.getItem('user') || 'null');
                    if (!user || !user.email) return;
                    
                    const notesKey = 'user_anime_notes_' + user.email;
                    let currentNotes = [];
                    try {
                        currentNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');
                    } catch (e) {
                        currentNotes = [];
                    }
                    
                    // Trouve l'anime dans notes et change sa note
                    const idx = currentNotes.findIndex(a => String(a.id) === String(animeId));
                    if (idx !== -1) {
                        currentNotes[idx].note = note;
                        localStorage.setItem(notesKey, JSON.stringify(currentNotes));
                    // Utiliser un délai pour éviter les appels multiples
                    // Ne pas rappeler displayUserAnimeNotes pour éviter les boucles infinies
                    // La note est déjà mise à jour dans localStorage
                    }
                });
            }
            // Pagination pour ce container
            // Recalculer totalPages avec le bon pageSize pour chaque page
            let totalPagesForPagination = 1;
            if (filteredAnimes.length > 3) {
                // Page 1 : 3 cartes
                const remainingCards = filteredAnimes.length - 3;
                // Pages suivantes : 100 cartes par page
                if (remainingCards > 0) {
                    const pagesAfterFirst = Math.ceil(remainingCards / 100);
                    totalPagesForPagination = 1 + pagesAfterFirst;
                }
            }
            
            const oldPag = container.parentNode.querySelector('.star-pagination');
            if (oldPag) oldPag.remove();
            if (totalPagesForPagination > 1) {
                const paginationContainer = document.createElement('div');
                paginationContainer.className = 'star-pagination';
                paginationContainer.style.cssText = `
                    width: 98%;
                    max-width: 98%;
                    display: flex;
                    justify-content: center;
                    gap: 12px;
                    margin: 18px auto 0 auto;
                    padding: 8px;
                    overflow-x: auto;
                    box-sizing: border-box;
                `;
                const reversePagination = false;
                let pagesToShow = getCompactPagination(page, totalPagesForPagination, reversePagination);
                pagesToShow.forEach(p => {
                    if (p === '...') {
                        const span = document.createElement('span');
                        span.textContent = '...';
                        span.style.cssText = 'padding: 10px 16px; color: #888; font-size: 1.1em;';
                        paginationContainer.appendChild(span);
                    } else {
                        const btn = document.createElement('button');
                        btn.textContent = p;
                        btn.style.cssText = `
                            padding: 10px 20px;
                            border: none;
                            border-radius: 8px;
                            background: ${(!reversePagination && p === page) || (reversePagination && (p === (totalPagesForPagination - page + 1))) ? '#00b894' : '#2d3748'};
                            color: white;
                            font-weight: ${(!reversePagination && p === page) || (reversePagination && (p === (totalPagesForPagination - page + 1))) ? '600' : '400'};
                            font-size: 1rem;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        `;
                        btn.onclick = () => {
                            if (reversePagination) {
                                // Page visuelle p => page réelle (totalPagesForPagination - p + 1)
                                const realPage = totalPagesForPagination - p + 1;
                                if (realPage !== page) {
                                    window.starCurrentPages[note] = realPage;
                                    renderStarPage(realPage);
                                    // Mettre à jour tous les boutons "..." après le changement de page
                                    setTimeout(() => {
                                        if (typeof refreshAllCardMoreButtons === 'function') {
                                            refreshAllCardMoreButtons();
                                        }
                                    }, 200);
                                    // Ne pas appeler applyTypeFilter ici pour éviter les boucles infinies
                                }
                            } else {
                                if (p !== page) {
                                    window.starCurrentPages[note] = p;
                                    renderStarPage(p);
                                    // Mettre à jour tous les boutons "..." après le changement de page
                                    setTimeout(() => {
                                        if (typeof refreshAllCardMoreButtons === 'function') {
                                            refreshAllCardMoreButtons();
                                        }
                                    }, 200);
                                    // Ne pas appeler applyTypeFilter ici pour éviter les boucles infinies
                                }
                            }
                        };
                        paginationContainer.appendChild(btn);
                    }
                });
                
                // Ajouter le bouton "Haut" dans la pagination si on est sur une page > 1
                if (page > 1) {
                    // Bouton pour remonter en haut
                    const scrollToTopBtn = document.createElement('button');
                    scrollToTopBtn.innerHTML = _profileT('common.scroll_top') || '↑ Haut';
                    scrollToTopBtn.title = _profileT('common.scroll_top_title') || 'Remonter en haut de la page';
                    scrollToTopBtn.style.cssText = `
                        padding: 10px 20px;
                        border: none;
                        border-radius: 8px;
                        background: #00b894;
                        color: white;
                        font-weight: 600;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        margin-left: 10px;
                    `;
                    scrollToTopBtn.onmouseover = () => {
                        scrollToTopBtn.style.background = '#00a085';
                        scrollToTopBtn.style.transform = 'scale(1.05)';
                    };
                    scrollToTopBtn.onmouseout = () => {
                        scrollToTopBtn.style.background = '#00b894';
                        scrollToTopBtn.style.transform = 'scale(1)';
                    };
                    scrollToTopBtn.onclick = () => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    };
                    paginationContainer.appendChild(scrollToTopBtn);
                }
                
                container.parentNode.insertBefore(paginationContainer, container.nextSibling);
            }
            
            // IMPORTANT: Mettre à jour tous les boutons "..." après le rendu de la page
            // Cela garantit que les boutons sont correctement masqués pour les cartes dans le Top 10
            setTimeout(() => {
                if (typeof refreshAllCardMoreButtons === 'function') {
                    refreshAllCardMoreButtons();
                } else if (typeof updateCardMoreButton === 'function') {
                    // Fallback : mettre à jour toutes les cartes individuellement
                    const allCards = container.querySelectorAll('.catalogue-card[data-anime-id]');
                    allCards.forEach(card => {
                        updateCardMoreButton(card);
                    });
                }
            }, 300);
            
            // Appel supplémentaire après un délai plus long pour s'assurer que le top 10 est chargé
            setTimeout(() => {
                if (typeof refreshAllCardMoreButtons === 'function') {
                    refreshAllCardMoreButtons();
                }
            }, 800);
            
            if (window.selectedGenre) {
                setTimeout(applyGenreFilter, 50);
            }
        }
        renderStarPage(window.starCurrentPages[note]);
        if (window.selectedGenre) {
            setTimeout(applyGenreFilter, 50);
        }
        // Ne pas appeler applyTypeFilter ici pour éviter les boucles infinies
        // Le filtrage par type est déjà fait dans renderStarPage
    }
    
    // Afficher le top 10 dès que possible, en parallèle avec l'affichage des notes
    // Ne pas attendre la fin complète de displayUserAnimeNotes
    if (typeof renderTop10Slots === 'function') {
        // Appeler renderTop10Slots de manière asynchrone mais sans grand délai
        setTimeout(() => {
            renderTop10Slots();
        }, 50); // Délai réduit à 50ms pour affichage plus rapide
    }
    
    // Réinitialiser le flag à la fin de la fonction avec un délai pour éviter les appels multiples
    setTimeout(() => {
        isDisplayingNotes = false;
    }, 500);
    // Log désactivé pour éviter les logs infinis
    
    // Attacher les événements aux cartes après l'affichage
    setTimeout(() => {
        attachCardEvents();
        // Ne pas appeler refreshAllCardMoreButtons ici pour éviter les boucles infinies
        // refreshAllCardMoreButtons();
        
        // Vérification finale que les cartes sont bien affichées
        const totalCards = document.querySelectorAll('.catalogue-card').length;
        // Log désactivé pour éviter les logs infinis
        
        // Vérifier chaque container
        document.querySelectorAll('[id^="star-containers"]').forEach(container => {
            const cardCount = container.querySelectorAll('.catalogue-card').length;
            // Log désactivé pour éviter les logs infinis
            
            // S'assurer que toutes les cartes dans ce container sont visibles
            container.querySelectorAll('.catalogue-card').forEach(card => {
                card.style.display = 'block';
                card.style.opacity = '1';
                card.style.visibility = 'visible';
            });
            
            // Si le container est vide mais qu'il devrait avoir des cartes, forcer un rechargement
            // DÉSACTIVÉ pour éviter les boucles infinies
            // Code commenté pour éviter les erreurs de syntaxe
        });
        
        // Désactiver le drop sur tous les containers d'étoiles
        document.querySelectorAll('[id^="star-containers"]').forEach(container => {
            // Ne pas ajouter les événements plusieurs fois
            if (!container.hasAttribute('data-drop-blocked')) {
                container.setAttribute('data-drop-blocked', 'true');
                container.addEventListener('dragover', function(e) {
                    e.preventDefault();
                });
                
                container.addEventListener('drop', function(e) {
                    e.preventDefault();
                    return false;
                });
            }
        });
        
    // Réactiver le flag après le rechargement
    window.isApplyingTypeFilter = false;
    }, 200);
}

// Version debouncée de displayUserAnimeNotes pour optimiser les performances
// Déplacé après la définition complète de displayUserAnimeNotes et debounce
// Cette ligne sera exécutée après que toutes les fonctions soient définies

// Fonction pour nettoyer les event listeners et éviter les doublons
function cleanupEventListeners() {
    // Nettoyer les anciens event listeners pour éviter les doublons
    const oldListeners = document.querySelectorAll('[data-listener-attached="true"]');
    oldListeners.forEach(element => {
        element.removeAttribute('data-listener-attached');
    });
}

// Fonction pour attacher les event listeners de manière sécurisée
function attachSafeEventListener(element, event, handler, options = {}) {
    if (element && !element.hasAttribute('data-listener-attached')) {
        element.addEventListener(event, handler, options);
        element.setAttribute('data-listener-attached', 'true');
    }
}

// Fonction de throttling pour limiter la fréquence d'exécution
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Version throttlée des fonctions critiques
const throttledApplyTypeFilter = throttle(applyTypeFilter, 200);
const throttledApplyGenreFilter = throttle(applyGenreFilter, 200);
const throttledRenderTop10Slots = throttle(renderTop10Slots, 300); // Augmenté de 100ms à 300ms pour réduire le clignotement

// Système de monitoring pour détecter les appels excessifs
const functionCallCounts = {};
const MAX_CALLS_PER_SECOND = 10;

// Fonction pour nettoyer le top 10 des notes supprimées
function cleanTop10FromRemovedNotes() {
    console.log('🧹 Nettoyage du top 10 des notes supprimées...');
    
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        console.log('❌ Utilisateur non connecté, arrêt du nettoyage');
        return;
    }
    
    // Récupérer toutes les notes supprimées permanentes
    const deletedNotesKey = 'deleted_content_notes_' + user.email;
    let deletedNotes = [];
    try {
        deletedNotes = JSON.parse(localStorage.getItem(deletedNotesKey) || '[]');
        console.log('🔍 Notes supprimées trouvées:', deletedNotes.length);
        console.log('🔍 Détail des notes supprimées:', deletedNotes);
    } catch (e) {
        console.error('Erreur lors de la lecture des notes supprimées:', e);
        return;
    }
    
    if (deletedNotes.length === 0) {
        console.log('✅ Aucune note supprimée à nettoyer');
        return;
    }
    
    console.log('🔍 Notes supprimées à nettoyer:', deletedNotes.length);
    
    // Nettoyer le top 10 global
    const globalTop10 = getUserTop10(user, null, null) || [];
    let hasChanges = false;
    
    const cleanedGlobalTop10 = globalTop10.map(item => {
        if (!item) return null;
        
        const isDeleted = deletedNotes.some(deletedNote => 
            String(deletedNote.id) === String(item.id) && 
            deletedNote.contentType === item.contentType
        );
        
        if (isDeleted) {
            console.log(`🗑️ Suppression de ${item.titre || item.title || item.name} du top 10 global`);
            hasChanges = true;
            return null;
        }
        
        return item;
    });
    
    if (hasChanges) {
        setUserTop10(user, cleanedGlobalTop10, null, null);
        console.log('✅ Top 10 global nettoyé');
    }
    
    // Nettoyer les top 10 par genre
    const genres = ['Action', 'Aventure', 'Comédie', 'Drame', 'Fantasy', 'Horreur', 'Mystère', 'Romance', 'Sci-Fi', 'Thriller'];
    
    genres.forEach(genre => {
        const genreTop10 = getUserTop10(user, genre, null) || [];
        let genreHasChanges = false;
        
        const cleanedGenreTop10 = genreTop10.map(item => {
            if (!item) return null;
            
            const isDeleted = deletedNotes.some(deletedNote => 
                String(deletedNote.id) === String(item.id) && 
                deletedNote.contentType === item.contentType
            );
            
            if (isDeleted) {
                console.log(`🗑️ Suppression de ${item.titre || item.title || item.name} du top 10 ${genre}`);
                genreHasChanges = true;
                return null;
            }
            
            return item;
        });
        
        if (genreHasChanges) {
            setUserTop10(user, cleanedGenreTop10, genre, null);
            console.log(`✅ Top 10 ${genre} nettoyé`);
        }
    });
    
    // Nettoyer les top 10 par type
    const types = ['anime', 'manga', 'doujin'];
    
    types.forEach(type => {
        const typeTop10 = getUserTop10(user, null, type) || [];
        let typeHasChanges = false;
        
        const cleanedTypeTop10 = typeTop10.map(item => {
            if (!item) return null;
            
            const isDeleted = deletedNotes.some(deletedNote => 
                String(deletedNote.id) === String(item.id) && 
                deletedNote.contentType === item.contentType
            );
            
            if (isDeleted) {
                console.log(`🗑️ Suppression de ${item.titre || item.title || item.name} du top 10 ${type}`);
                typeHasChanges = true;
                return null;
            }
            
            return item;
        });
        
        if (typeHasChanges) {
            setUserTop10(user, cleanedTypeTop10, null, type);
            console.log(`✅ Top 10 ${type} nettoyé`);
        }
    });
    
    // Nettoyer les top 10 par genre ET type
    genres.forEach(genre => {
        types.forEach(type => {
            const genreTypeTop10 = getUserTop10(user, genre, type) || [];
            let genreTypeHasChanges = false;
            
            const cleanedGenreTypeTop10 = genreTypeTop10.map(item => {
                if (!item) return null;
                
                const isDeleted = deletedNotes.some(deletedNote => 
                    String(deletedNote.id) === String(item.id) && 
                    deletedNote.contentType === item.contentType
                );
                
                if (isDeleted) {
                    console.log(`🗑️ Suppression de ${item.titre || item.title || item.name} du top 10 ${genre} ${type}`);
                    genreTypeHasChanges = true;
                    return null;
                }
                
                return item;
            });
            
            if (genreTypeHasChanges) {
                setUserTop10(user, cleanedGenreTypeTop10, genre, type);
                console.log(`✅ Top 10 ${genre} ${type} nettoyé`);
            }
        });
    });
    
    // Ne pas appeler renderTop10Slots et displayUserAnimeNotes ici pour éviter les boucles infinies
    // Ces fonctions seront appelées au chargement normal de la page
    
    console.log('✅ Nettoyage du top 10 terminé');
}

// Fonction pour extraire le titre de base d'un anime ou film (sans saison/partie)
// Fonction utilitaire pour détecter si un titre appartient à une série avec plusieurs saisons/parties
// (ex: Shokugeki no Souma, High School DxD)
function isSeriesWithMultipleSeasons(title) {
    if (!title) return false;
    // Normaliser le titre : remplacer × par x, supprimer les espaces multiples
    const titleLower = title.toLowerCase().trim().replace(/×/g, 'x').replace(/\s+/g, ' ');
    return titleLower.includes('shokugeki') || 
           titleLower.includes('food wars') || 
           titleLower.includes('high school dxd') ||
           titleLower.includes('highschool dxd');
}

function extractBaseAnimeTitle(title, contentType = null) {
    if (!title) return title;
    
    // Traiter les animes, films et mangas (les films peuvent aussi avoir des variantes)
    // Pour les autres types (doujin, manhwa, manhua, etc.), retourner le titre tel quel
    if (contentType && contentType !== 'anime' && contentType !== 'film' && contentType !== 'manga') {
        return title;
    }
    
    let baseTitle = title.trim();
    
    // Patterns pour détecter et enlever les saisons/parties
    // Utiliser des patterns plus spécifiques pour éviter de supprimer des parties légitimes du titre
    
    // 0. Pattern spécial pour JoJo's Bizarre Adventure (DOIT être en premier pour normaliser avant les autres patterns)
    const jojoLower = baseTitle.toLowerCase();
    const isJojo = jojoLower.includes("jojo") && (
        jojoLower.includes("bizarre adventure") || 
        jojoLower.includes("bouken") || 
        jojoLower.includes("kimyou") ||
        jojoLower.includes("奇妙") || // "Kimyou" en japonais
        jojoLower.includes("冒険") || // "Bouken" en japonais
        jojoLower.includes("ブクセン") // "Bouken" en katakana
    );
    
    if (isJojo) {
        // Pour JoJo, prendre tout ce qui est avant le premier ":" ou " -" et arrêter à "Bouken" ou "Adventure"
        let jojoBase = baseTitle;
        
        // Si on trouve un ":", prendre tout ce qui est avant
        if (jojoBase.includes(':') || jojoBase.includes('：')) {
            jojoBase = jojoBase.split(/[：:]/)[0].trim();
        }
        
        // Si on trouve "Bouken", arrêter là
        if (jojoBase.toLowerCase().includes("bouken")) {
            const boukenIndex = jojoBase.toLowerCase().indexOf("bouken");
            jojoBase = jojoBase.substring(0, boukenIndex + "bouken".length).trim();
        } else if (jojoBase.toLowerCase().includes("adventure")) {
            const advIndex = jojoBase.toLowerCase().indexOf("adventure");
            jojoBase = jojoBase.substring(0, advIndex + "adventure".length).trim();
            // Convertir en version japonaise pour uniformité
            jojoBase = jojoBase.replace(/jojo[''′]?s?\s*bizarre\s*adventure/gi, "JoJo no Kimyou na Bouken");
        }
        
        baseTitle = jojoBase;
        
        // Normaliser toutes les variantes vers "JoJo no Kimyou na Bouken"
        baseTitle = baseTitle.replace(/jojo[''′]?s?\s*bizarre\s*adventure/gi, "JoJo no Kimyou na Bouken");
        baseTitle = baseTitle.replace(/jojo\s*no\s*kimyou\s*na\s*bouken/gi, "JoJo no Kimyou na Bouken");
        
        // S'assurer que le résultat contient "JoJo" et "Bouken"
        if (baseTitle.toLowerCase().includes("jojo") && !baseTitle.toLowerCase().includes("bouken") && !baseTitle.toLowerCase().includes("adventure")) {
            baseTitle = "JoJo no Kimyou na Bouken";
        }
        
        // Pour JoJo, on retourne directement le titre normalisé sans appliquer les autres patterns
        return baseTitle.trim();
    }
    
    // 0.5. Patterns pour "The Final Season" / "Saison Finale" (doit être tôt pour éviter les conflits)
    // Ces patterns sont plus généraux et capturent toutes les variations
    baseTitle = baseTitle.replace(/\s*[:\-]\s*[Tt]he\s+[Ff]inal\s+[Ss]eason.*$/gi, '');
    baseTitle = baseTitle.replace(/\s*[:\-]\s*[Ff]inal\s+[Ss]eason.*$/gi, '');
    baseTitle = baseTitle.replace(/\s*[:\-]\s*[Ss]aison\s+[Ff]inale.*$/gi, '');
    baseTitle = baseTitle.replace(/\s*[:\-]\s*[Ss]aison\s+[Ff]inal.*$/gi, '');
    
    // 1. Patterns spécifiques (ex: "2nd Season", "3rd Season")
    baseTitle = baseTitle.replace(/\s*\d+[nrst][dht]\s*[Ss]eason/gi, '');
    baseTitle = baseTitle.replace(/\s*\d+[èe]me\s*[Ss]aison/gi, '');
    
    // 2. Noms de saisons complets (ex: "Season One", "Saison Deux")
    baseTitle = baseTitle.replace(/\s*[Ss]eason\s+[Oo]ne/gi, '');
    baseTitle = baseTitle.replace(/\s*[Ss]eason\s+[Tt]wo/gi, '');
    baseTitle = baseTitle.replace(/\s*[Ss]eason\s+[Tt]hree/gi, '');
    baseTitle = baseTitle.replace(/\s*[Ss]eason\s+[Ff]our/gi, '');
    baseTitle = baseTitle.replace(/\s*[Ss]eason\s+[Ff]ive/gi, '');
    baseTitle = baseTitle.replace(/\s*[Ss]aison\s+[Uu]n/gi, '');
    baseTitle = baseTitle.replace(/\s*[Ss]aison\s+[Dd]eux/gi, '');
    baseTitle = baseTitle.replace(/\s*[Ss]aison\s+[Tt]rois/gi, '');
    baseTitle = baseTitle.replace(/\s*[Ss]aison\s+[Qq]uatre/gi, '');
    baseTitle = baseTitle.replace(/\s*[Ss]aison\s+[Cc]inq/gi, '');
    
    // 3. Patterns avec chiffres romains (ex: "Season II", "Part III")
    baseTitle = baseTitle.replace(/\s+[Ss]eason\s+[IVX]+/gi, '');
    baseTitle = baseTitle.replace(/\s+[Ss]aison\s+[IVX]+/gi, '');
    baseTitle = baseTitle.replace(/\s+[Pp]art\s+[IVX]+/gi, '');
    baseTitle = baseTitle.replace(/\s+[Pp]artie\s+[IVX]+/gi, '');
    
    // 4. Saisons avec numéros (français et anglais)
    baseTitle = baseTitle.replace(/\s+[Ss]aison\s+\d+/gi, '');
    baseTitle = baseTitle.replace(/\s+[Ss]eason\s+\d+/gi, '');
    baseTitle = baseTitle.replace(/\s+[Ss]\s+\d+/g, ''); // Ex: "S 2", "s 3"
    baseTitle = baseTitle.replace(/\s+[Ss]\d+/g, ''); // Ex: "S2", "s3"
    baseTitle = baseTitle.replace(/\s+-\s+[Ss]aison\s+\d+/gi, '');
    baseTitle = baseTitle.replace(/\s+-\s+[Ss]eason\s+\d+/gi, '');
    
    // 4.5. Saison finale / Final Season (patterns supplémentaires pour les cas sans ":" ou "-")
    // Les patterns avec ":" et "-" sont déjà traités en section 0.5
    baseTitle = baseTitle.replace(/\s+[Tt]he\s+[Ff]inal\s+[Ss]eason/gi, '');
    baseTitle = baseTitle.replace(/\s+[Ff]inal\s+[Ss]eason/gi, '');
    baseTitle = baseTitle.replace(/\s+[Ss]aison\s+[Ff]inale/gi, '');
    baseTitle = baseTitle.replace(/\s+[Ss]aison\s+[Ff]inal/gi, '');
    baseTitle = baseTitle.replace(/\s+[Ll]a\s+[Ss]aison\s+[Ff]inale/gi, '');
    
    // 5. Parties avec numéros (français et anglais)
    baseTitle = baseTitle.replace(/\s+[Pp]artie\s+\d+/gi, '');
    baseTitle = baseTitle.replace(/\s+[Pp]art\s+\d+/gi, '');
    baseTitle = baseTitle.replace(/\s+[Pp]t\.\s+\d+/gi, ''); // Ex: "Pt.1", "pt.2"
    baseTitle = baseTitle.replace(/\s+[Pp]\s+\d+/g, ''); // Ex: "P 1", "p 2"
    baseTitle = baseTitle.replace(/\s+[Pp]\d+/g, ''); // Ex: "P1", "p2"
    baseTitle = baseTitle.replace(/\s+-\s+[Pp]artie\s+\d+/gi, '');
    baseTitle = baseTitle.replace(/\s+-\s+[Pp]art\s+\d+/gi, '');
    
    // 6. Cour (cour d'anime)
    baseTitle = baseTitle.replace(/\s+[Cc]our\s+\d+/gi, '');
    baseTitle = baseTitle.replace(/\s+-\s+[Cc]our\s+\d+/gi, '');
    
    // 6.5. Patterns pour suffixes de saison sans indication explicite (ex: "R2", "R3", "2nd", etc.)
    // Ces patterns doivent être appliqués AVANT les patterns avec parenthèses pour éviter les conflits
    baseTitle = baseTitle.replace(/\s+[Rr]\s*\d+$/g, ''); // Ex: "R2", "R 2", "r2"
    baseTitle = baseTitle.replace(/\s+[Rr]\d+$/g, ''); // Ex: "R2", "r3"
    baseTitle = baseTitle.replace(/\s+\d+[nrst][dht]$/g, ''); // Ex: "2nd", "3rd", "4th"
    baseTitle = baseTitle.replace(/\s+\d+[èe]me$/g, ''); // Ex: "2ème", "3ème"
    baseTitle = baseTitle.replace(/\s+[:\-]\s*[Rr]\s*\d+.*$/gi, ''); // Ex: ": R2", "- R2"
    baseTitle = baseTitle.replace(/\s+[:\-]\s*[Rr]\d+.*$/gi, ''); // Ex: ": R2", "- R2"
    
    // 7. Patterns avec parenthèses (ex: "(Saison 2)", "(Part 1)", "(Saison Finale)", "(R2)")
    baseTitle = baseTitle.replace(/\s*\([^)]*[Ss]aison[^)]*\)/gi, '');
    baseTitle = baseTitle.replace(/\s*\([^)]*[Ss]eason[^)]*\)/gi, '');
    baseTitle = baseTitle.replace(/\s*\([^)]*[Ff]inal[^)]*[Ss]eason[^)]*\)/gi, ''); // "(Final Season)"
    baseTitle = baseTitle.replace(/\s*\([^)]*[Ss]aison[^)]*[Ff]inale[^)]*\)/gi, ''); // "(Saison Finale)"
    baseTitle = baseTitle.replace(/\s*\([^)]*[Pp]artie[^)]*\)/gi, '');
    baseTitle = baseTitle.replace(/\s*\([^)]*[Pp]art\s+\d+[^)]*\)/gi, ''); // "(Part 1)" mais pas "(Part of...)"
    baseTitle = baseTitle.replace(/\s*\([^)]*[Cc]our[^)]*\)/gi, '');
    baseTitle = baseTitle.replace(/\s*\([^)]*[Rr]\s*\d+[^)]*\)/gi, ''); // "(R2)", "(R 2)"
    baseTitle = baseTitle.replace(/\s*\([^)]*[Rr]\d+[^)]*\)/gi, ''); // "(R2)"
    
    // 8. Patterns de fin avec deux-points (ex: ": Season 2", ": Part 1", ": Saison Finale", ": The Final Season", ": R2")
    baseTitle = baseTitle.replace(/:\s+[Tt]he\s+[Ff]inal\s+[Ss]eason.*$/gi, ''); // ": The Final Season"
    baseTitle = baseTitle.replace(/:\s+[Ff]inal\s+[Ss]eason.*$/gi, ''); // ": Final Season"
    baseTitle = baseTitle.replace(/:\s+[Ss]aison\s+[Ff]inale.*$/gi, ''); // ": Saison Finale"
    baseTitle = baseTitle.replace(/:\s+[Ss]aison\s+\d+.*$/gi, '');
    baseTitle = baseTitle.replace(/:\s+[Ss]eason\s+\d+.*$/gi, '');
    baseTitle = baseTitle.replace(/:\s+[Pp]artie\s+\d+.*$/gi, '');
    baseTitle = baseTitle.replace(/:\s+[Pp]art\s+\d+.*$/gi, '');
    baseTitle = baseTitle.replace(/:\s+[Cc]our\s+\d+.*$/gi, '');
    baseTitle = baseTitle.replace(/:\s+[Rr]\s*\d+.*$/gi, ''); // ": R2", ": R 2"
    baseTitle = baseTitle.replace(/:\s+[Rr]\d+.*$/gi, ''); // ": R2"
    
    // 9. Patterns génériques pour tout ce qui suit ":" ou "-" (seulement pour les saisons connues)
    // Ne pas supprimer " - " suivi de n'importe quoi, seulement les patterns spécifiques
    // Traiter "The Final Season" et "Final Season" avant les patterns génériques
    baseTitle = baseTitle.replace(/:\s*[Tt]he\s+[Ff]inal\s+[Ss]eason.*$/gi, '');
    baseTitle = baseTitle.replace(/-\s*[Tt]he\s+[Ff]inal\s+[Ss]eason.*$/gi, '');
    baseTitle = baseTitle.replace(/:\s*[Ff]inal\s+[Ss]eason.*$/gi, '');
    baseTitle = baseTitle.replace(/-\s*[Ff]inal\s+[Ss]eason.*$/gi, '');
    baseTitle = baseTitle.replace(/:\s+[Ss]aison\s+[A-Za-z]+.*$/gi, '');
    baseTitle = baseTitle.replace(/:\s+[Ss]eason\s+[A-Za-z]+.*$/gi, '');
    
    // 9.5. Patterns pour les séries avec sous-titres japonais (ex: Shokugeki no Souma, High School DxD)
    // Pattern spécial pour les séries avec plusieurs saisons : retirer tout après ":" ou les suffixes de saison
    // Cela capture ": Ni no Sara", ": San no Sara - Tootsuki Ressha-hen", "BorN", "New", "Hero", etc.
    const titleLower = baseTitle.toLowerCase();
    if (isSeriesWithMultipleSeasons(baseTitle)) {
        // Pour Shokugeki no Souma : prendre seulement la partie avant le ":"
        if (titleLower.includes('shokugeki') || titleLower.includes('food wars')) {
            if (baseTitle.includes(':') || baseTitle.includes('：')) {
                baseTitle = baseTitle.split(/[：:]/)[0].trim();
            }
        }
        
        // Pour High School DxD : retirer les suffixes de saison comme "BorN", "New", "Hero"
        if (titleLower.includes('high school dxd') || titleLower.includes('high school d×d') || 
            titleLower.includes('highschool dxd') || titleLower.includes('highschool d×d')) {
            // Normaliser vers "High School DxD" (sans le symbole ×)
            baseTitle = baseTitle.replace(/high\s*school\s*d×d/gi, 'High School DxD');
            baseTitle = baseTitle.replace(/highschool\s*d×d/gi, 'High School DxD');
            baseTitle = baseTitle.replace(/highschool\s*dxd/gi, 'High School DxD');
            
            // Retirer les suffixes de saison connus
            baseTitle = baseTitle.replace(/\s+BorN$/i, '');
            baseTitle = baseTitle.replace(/\s+New$/i, '');
            baseTitle = baseTitle.replace(/\s+Hero$/i, '');
            baseTitle = baseTitle.replace(/\s+Born$/i, '');
            baseTitle = baseTitle.replace(/\s+NEW$/i, '');
            baseTitle = baseTitle.replace(/\s+HERO$/i, '');
        }
        
        // Pour Dragon Ball : retirer les suffixes comme "Super", "Heroes", "Victory", "Ossu!", "GT", "Kai", "Z"
        // Gérer aussi les variantes avec ou sans espace/tiret
        if (titleLower.includes('dragon ball') || titleLower.includes('dragonball')) {
            // Normaliser vers "Dragon Ball" (avec espace)
            baseTitle = baseTitle.replace(/dragonball/gi, 'Dragon Ball');
            
            // Retirer les suffixes connus de Dragon Ball (en fin de titre)
            baseTitle = baseTitle.replace(/\s+Super$/i, '');
            baseTitle = baseTitle.replace(/\s+Heroes?$/i, '');
            baseTitle = baseTitle.replace(/\s+Victory$/i, '');
            baseTitle = baseTitle.replace(/\s+Ossu!?$/i, '');
            baseTitle = baseTitle.replace(/\s+GT$/i, '');
            baseTitle = baseTitle.replace(/\s+Kai$/i, '');
            baseTitle = baseTitle.replace(/\s+Z$/i, '');
            
            // Retirer aussi si c'est séparé par un tiret ou deux-points
            baseTitle = baseTitle.replace(/\s*[-:]\s*Super$/i, '');
            baseTitle = baseTitle.replace(/\s*[-:]\s*Heroes?$/i, '');
            baseTitle = baseTitle.replace(/\s*[-:]\s*Victory$/i, '');
            baseTitle = baseTitle.replace(/\s*[-:]\s*Ossu!?$/i, '');
            baseTitle = baseTitle.replace(/\s*[-:]\s*GT$/i, '');
            baseTitle = baseTitle.replace(/\s*[-:]\s*Kai$/i, '');
            baseTitle = baseTitle.replace(/\s*[-:]\s*Z$/i, '');
            
            // Normaliser vers "Dragon Ball" (sans suffixe) - base commune pour toutes les variantes
            // Si on trouve "Dragon Ball" sans suffixe, on garde tel quel
            // Sinon, on a déjà retiré le suffixe ci-dessus
        }
    }
    
    // Patterns pour sous-titres japonais courants (applicable à toutes les séries)
    // Patterns comme ": Ni no Sara", ": San no Sara", ": Shin no Sara", etc.
    // Ces patterns indiquent généralement une saison/partie différente
    baseTitle = baseTitle.replace(/:\s+[Nn]i\s+no\s+[Ss]ara.*$/gi, '');
    baseTitle = baseTitle.replace(/:\s+[Ss]an\s+no\s+[Ss]ara.*$/gi, '');
    baseTitle = baseTitle.replace(/:\s+[Ss]hin\s+no\s+[Ss]ara.*$/gi, '');
    baseTitle = baseTitle.replace(/:\s+[Gg]ou\s+no\s+[Ss]ara.*$/gi, '');
    
    // Pattern générique pour retirer tout ce qui suit ":" pour les séries avec sous-titres
    // MAIS seulement si on n'a pas déjà traité le titre avec les patterns spécifiques ci-dessus
    // Ce pattern capture les cas comme "Anime Title: Subtitle" où "Subtitle" est une partie/saison
    // On l'applique seulement si le titre n'a pas été modifié par les patterns spécifiques
    // et si le titre semble avoir un sous-titre (contient ":" suivi de texte)
    if (baseTitle.includes(':') && !baseTitle.match(/:\s*(the|final|season|saison|part|partie|cour)/i)) {
        // Ne pas appliquer automatiquement pour éviter de casser des titres légitimes
        // Laisser areAnimeTitlesSimilar gérer la comparaison par préfixe
    }
    
    // Nettoyer les espaces multiples, les tirets multiples et les deux-points en fin
    baseTitle = baseTitle.replace(/\s+/g, ' ').trim();
    baseTitle = baseTitle.replace(/-+/g, '-').trim();
    baseTitle = baseTitle.replace(/:\s*$/, '').trim(); // Enlever les deux-points en fin
    
    // Si le titre commence ou finit par un tiret, parenthèse ou deux-points, les enlever
    baseTitle = baseTitle.replace(/^[-():\s]+|[-():\s]+$/g, '');
    
    return baseTitle || title; // Retourner le titre original si le résultat est vide
}

// Fonction pour comparer deux titres d'anime, film ou manga et déterminer s'ils sont similaires (même série)
// Utilise une comparaison de similarité basée sur le préfixe commun et la longueur
function areAnimeTitlesSimilar(title1, title2, contentType = null) {
    if (!title1 || !title2) return false;
    
    // Traiter les animes, films et mangas (les films peuvent aussi avoir des variantes)
    // Pour les autres types (doujin, manhwa, manhua, etc.), ne pas comparer automatiquement
    if (contentType && contentType !== 'anime' && contentType !== 'film' && contentType !== 'manga') {
        return false;
    }
    
    // Normaliser les titres (minuscules, sans accents, sans espaces multiples)
    const normalize = (str) => {
        return str.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
            .replace(/\s+/g, ' ')
            .trim();
    };
    
    const norm1 = normalize(title1);
    const norm2 = normalize(title2);
    
    // Si les titres normalisés sont identiques, ils sont similaires
    if (norm1 === norm2) return true;
    
    // Extraire les titres de base
    const base1 = normalize(extractBaseAnimeTitle(title1, contentType));
    const base2 = normalize(extractBaseAnimeTitle(title2, contentType));
    
    // Si les titres de base sont identiques, ils sont similaires
    if (base1 === base2 && base1.length > 0) return true;
    
    // Comparaison spéciale pour Dragon Ball (pour manga et anime)
    // "Dragon Ball", "Dragon Ball Z", "Dragon Ball Super", etc. sont tous similaires
    const dragonBall1 = norm1.includes('dragon ball');
    const dragonBall2 = norm2.includes('dragon ball');
    if (dragonBall1 && dragonBall2) {
        // Normaliser les deux vers "dragon ball" (sans les suffixes)
        const db1 = norm1.replace(/\s*(super|heroes?|victory|ossu!?|gt|kai|z)\s*$/i, '').trim();
        const db2 = norm2.replace(/\s*(super|heroes?|victory|ossu!?|gt|kai|z)\s*$/i, '').trim();
        // Si après normalisation ils correspondent à "dragon ball" ou commencent par "dragon ball"
        if (db1.startsWith('dragon ball') && db2.startsWith('dragon ball')) {
            // Extraire juste "dragon ball" des deux
            const db1Base = db1.substring(0, 11); // "dragon ball".length = 11
            const db2Base = db2.substring(0, 11);
            if (db1Base === db2Base) {
                return true;
            }
        }
    }
    
    // Comparaison par préfixe commun significatif
    // Si un titre commence par l'autre (ou vice versa) avec au moins 5 caractères, ils sont similaires
    const minPrefixLength = 5;
    if (base1.length >= minPrefixLength && base2.length >= minPrefixLength) {
        if (base1.startsWith(base2) || base2.startsWith(base1)) {
            return true;
        }
    }
    
    // Comparaison par mots communs significatifs
    // Si les deux titres partagent au moins 2 mots de 3+ caractères, ils sont probablement similaires
    const words1 = base1.split(/\s+/).filter(w => w.length >= 3);
    const words2 = base2.split(/\s+/).filter(w => w.length >= 3);
    
    if (words1.length > 0 && words2.length > 0) {
        const commonWords = words1.filter(w => words2.includes(w));
        // Si au moins 2 mots significatifs sont communs, ou si tous les mots d'un titre sont dans l'autre
        if (commonWords.length >= 2) {
            return true;
        }
        // Si un titre contient tous les mots de l'autre (ou vice versa), ils sont similaires
        if (words1.length <= words2.length && words1.every(w => words2.includes(w))) {
            return true;
        }
        if (words2.length <= words1.length && words2.every(w => words1.includes(w))) {
            return true;
        }
    }
    
    // Comparaison par longueur de préfixe commun (au moins 60% du titre le plus court)
    const shorter = base1.length < base2.length ? base1 : base2;
    const longer = base1.length >= base2.length ? base1 : base2;
    
    if (shorter.length >= 5) {
        let commonPrefixLength = 0;
        for (let i = 0; i < shorter.length; i++) {
            if (shorter[i] === longer[i]) {
                commonPrefixLength++;
            } else {
                break;
            }
        }
        
        // Si le préfixe commun représente au moins 60% du titre le plus court
        if (commonPrefixLength >= shorter.length * 0.6) {
            return true;
        }
    }
    
    return false;
}

// Fonction utilitaire pour extraire le titre d'une carte de manière fiable
function extractTitleFromCard(card) {
    if (!card) return 'Titre inconnu';
    
    // Méthode 1: Chercher le titre dans les liens (le plus fiable)
    const titleLink = card.querySelector('a[href*="anime-details.html"], a[href*="manga-details.html"]');
    if (titleLink) {
        const title = titleLink.textContent?.trim();
        if (title && title.length > 0) {
            console.log('✅ Titre trouvé dans le lien:', title);
            return title;
        }
    }
    
    // Méthode 2: Chercher dans les attributs alt des images
    const img = card.querySelector('img');
    if (img && img.alt) {
        const title = img.alt.trim();
        if (title && title.length > 0) {
            console.log('✅ Titre trouvé dans alt de l\'image:', title);
            return title;
        }
    }
    
    // Méthode 3: Chercher dans les éléments avec des classes spécifiques
    const titleElement = card.querySelector('.anime-title, .card-title, .manga-title');
    if (titleElement) {
        const title = titleElement.textContent?.trim();
        if (title && title.length > 0) {
            console.log('✅ Titre trouvé avec classe spécifique:', title);
            return title;
        }
    }
    
    // Méthode 4: Chercher dans les spans qui ne sont pas des boutons
    const spans = card.querySelectorAll('span');
    for (let span of spans) {
        const text = span.textContent?.trim();
        if (text && 
            text.length > 3 && 
            text.length < 100 &&
            !text.includes('Ajouter au top 10') &&
            !text.includes('...') &&
            !text.includes('Titre inconnu') &&
            !text.includes('Vide') && !text.includes(getTop10SlotEmptyLabel()) &&
            !span.closest('button') &&
            !span.closest('.card-more-menu')) {
            console.log('✅ Titre trouvé dans span:', text);
            return text;
        }
    }
    
    // Méthode 5: Chercher dans les divs qui ne sont pas des boutons
    const divs = card.querySelectorAll('div');
    for (let div of divs) {
        const text = div.textContent?.trim();
        if (text && 
            text.length > 3 && 
            text.length < 100 &&
            !text.includes('Ajouter au top 10') &&
            !text.includes('...') &&
            !text.includes('Titre inconnu') &&
            !text.includes('Vide') && !text.includes(getTop10SlotEmptyLabel()) &&
            !div.closest('button') &&
            !div.closest('.card-more-menu') &&
            div.children.length === 0) { // Élément feuille
            console.log('✅ Titre trouvé dans div:', text);
            return text;
        }
    }
    
    console.log('❌ Aucun titre trouvé dans la carte');
    return 'Titre inconnu';
}

function monitorFunctionCalls(functionName) {
    const now = Date.now();
    if (!functionCallCounts[functionName]) {
        functionCallCounts[functionName] = [];
    }
    
    // Nettoyer les appels anciens (plus d'1 seconde)
    functionCallCounts[functionName] = functionCallCounts[functionName].filter(
        timestamp => now - timestamp < 1000
    );
    
    // Ajouter l'appel actuel
    functionCallCounts[functionName].push(now);
    
    // Vérifier si on dépasse la limite
    if (functionCallCounts[functionName].length > MAX_CALLS_PER_SECOND) {
        console.warn(`⚠️ Fonction ${functionName} appelée trop fréquemment: ${functionCallCounts[functionName].length} fois en 1 seconde`);
        return false; // Bloquer l'appel
    }
    
    return true; // Autoriser l'appel
}

// Styles des boutons de pagination
const buttonStyle = `
    padding: 8px 16px;
    margin: 0 2px;
    border: none;
    border-radius: 4px;
    background: #2d3748;
    color: white;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 14px;
`;

const activeButtonStyle = `
    background: #00b894;
    color: white;
    font-weight: bold;
`;

// Ajoute la classe CSS pour la sélection et le drop (à placer dans le CSS global ou via JS si besoin)
if (!document.getElementById('anime-card-selected-style')) {
    const style = document.createElement('style');
    style.id = 'anime-card-selected-style';
    style.innerHTML = `
    .anime-card-selected {
        outline: 7px solid #00b894 !important;
        box-shadow: 0 0 0 8px #00b89455, 0 4px 24px #00b89433 !important;
        background: #23262f !important;
        cursor: grab !important;
        transition: outline 0.2s, box-shadow 0.2s;
        z-index: 1000 !important;
    }
    .catalogue-card-drop-hover {
        outline: 3px dashed #00b894 !important;
        background: #1e242b !important;
        transition: outline 0.2s, background 0.2s;
    }
    .remove-top10-btn {
        position: absolute;
        top: 10px;
        left: 10px;
        background: #ff6b6b;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 6px 14px;
        font-size: 0.98rem;
        font-weight: 600;
        cursor: pointer;
        z-index: 20;
        box-shadow: 0 2px 8px #0002;
        transition: background 0.2s;
    }
    .remove-top10-btn:hover {
        background: #ff3b3b;
    }
    `;
    document.head.appendChild(style);
}

// === Utilisation du bouton et de la grille de genres déjà présents sous les catalogue cards ===
document.addEventListener('DOMContentLoaded', function() {
    // Restaurer l'état sauvegardé après un reset - DOIT ÊTRE FAIT EN PREMIER
    const savedType = localStorage.getItem('temp_selected_type');
    if (savedType) {
        console.log('Restauration de l\'état sauvegardé - Type:', savedType);
        window.selectedType = savedType;
        localStorage.removeItem('temp_selected_type'); // Nettoyer
        // Mettre à jour la visibilité des genres
        if (typeof window.updateGenresVisibility === 'function') {
            window.updateGenresVisibility();
        }
        
        // Attendre que la page soit complètement chargée
        setTimeout(() => {
            // Forcer la mise à jour immédiate des boutons de type
            const typeButtons = document.querySelectorAll('.type-filter-btn');
            console.log('Boutons de type trouvés:', typeButtons.length);
            
            typeButtons.forEach(btn => {
                btn.classList.remove('active');
                console.log('Bouton:', btn.getAttribute('data-type'), 'sauvegardé:', savedType);
                if (btn.getAttribute('data-type') === savedType) {
                    btn.classList.add('active');
                    console.log('✅ Bouton activé:', btn.getAttribute('data-type'));
                }
            });
            
            // Recharger complètement les notes avec le type restauré
            console.log('Application du filtre de type restauré:', savedType);
            setTimeout(() => {
                if (!isDisplayingNotes) {
                    displayUserAnimeNotes();
                }
            }, 200);
            
            // Appliquer le filtre après un délai pour s'assurer que tout est chargé
            setTimeout(() => {
                applyTypeFilter();
                
                // Forcer la mise à jour du texte du filtre
                const filterText = document.querySelector('.filter-text');
                if (filterText) {
                    filterText.textContent = savedType.charAt(0).toUpperCase() + savedType.slice(1);
                    console.log('✅ Texte du filtre mis à jour:', filterText.textContent);
                }
            }, 100); // Réduit à 100ms pour affichage plus rapide
        }, 100); // Réduit de 200ms à 100ms
    }
    
    // Récupère le bouton et la grille de genres déjà présents
    const toggleBtn = document.getElementById('toggleGenresBtn-profile');
    
    // Si on a un type sauvegardé, s'assurer que les boutons de type sont configurés
    if (savedType) {
        // Attendre que tous les éléments soient chargés
        setTimeout(() => {
            const typeButtons = document.querySelectorAll('.type-filter-btn');
            console.log('Boutons de type trouvés:', typeButtons.length);
            typeButtons.forEach(btn => {
                console.log('Bouton:', btn.getAttribute('data-type'), 'sauvegardé:', savedType);
            });
        }, 100);
    }
    const genreCards = document.getElementById('genreCards-profile');
    const toggleIcon = document.getElementById('toggleGenresIcon-profile');

    if (toggleBtn && genreCards) {
        // Initial state: grille masquée, hauteur 0, margin 0
        genreCards.style.display = 'flex';
        genreCards.style.flexWrap = 'wrap';
        genreCards.style.gap = '8px';
        genreCards.style.overflow = 'hidden';
        genreCards.style.maxHeight = '0';
        genreCards.style.marginBottom = '0';
        genreCards.style.transition = 'max-height   0.35s cubic-bezier(.4,2,.6,1), margin-bottom 0.35s cubic-bezier(.4,2,.6,1)';

        let genresOpen = false;

        toggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            genresOpen = !genresOpen;
            if (genresOpen) {
                genreCards.style.maxHeight = '120px'; // Ajuste selon le nombre de genres
                genreCards.style.marginBottom = '32px';
                if (toggleIcon) toggleIcon.style.transform = 'rotate(180deg)';
            } else {
                genreCards.style.maxHeight = '0';
                genreCards.style.marginBottom = '0';
                if (toggleIcon) toggleIcon.style.transform = 'rotate(0deg)';
            }
        });

        toggleBtn.style.cursor = 'pointer';

        // 3. Gestion du filtre par genre
        genreCards.querySelectorAll('.genre-card').forEach(btn => {
            btn.style.cursor = 'pointer';
           
            btn.addEventListener('click', function(e) {
               
                e.preventDefault();
                btn.classList.toggle('active');
                filterProfileByGenres();
            });
        });

        // 4. Fonction de filtrage
        function filterProfileByGenres() {
            const activeGenreCards = Array.from(genreCards.querySelectorAll('.genre-card.active'));
            const selectedGenres = activeGenreCards.map(b => {
                const genre = b.getAttribute('data-genre');
                if (!genre) {
                    console.warn('⚠️ Bouton de genre sans attribut data-genre:', b);
                    return null;
                }
                return genre.toLowerCase().trim();
            }).filter(g => g !== null);
            
            console.log('🔍 filterProfileByGenres appelée avec genres:', selectedGenres);
            console.log('📋 Boutons actifs trouvés:', activeGenreCards.length);
            
            // Supprimer l'ancien conteneur de genre s'il existe
            const oldGenreContainer = document.getElementById('genre-filtered-container');
            if (oldGenreContainer) {
                oldGenreContainer.remove();
            }
            
            if (selectedGenres.length === 0) {
                console.log('Aucun genre sélectionné, restauration de l\'affichage normal');
                // Si aucun genre sélectionné, afficher toutes les cards normalement
                // Réafficher le conteneur principal des étoiles
                const allContainers = document.querySelector('.all-star-containers');
                if (allContainers) {
                    allContainers.style.display = '';
                    console.log('Conteneur principal des étoiles réaffiché');
                }
                
                // Réafficher tous les groupes d'étoiles
                const starGroups = document.querySelectorAll('.star-rating-group');
                starGroups.forEach(group => {
                    group.style.display = '';
                });
                console.log('Groupes d\'étoiles réaffichés:', starGroups.length);
                
                // Réafficher tous les conteneurs d'étoiles
                for (let i = 10; i >= 1; i--) {
                    const container = document.getElementById(i === 10 ? 'star-containers' : `star-containers-${i}`);
                    if (container) {
                        container.style.display = '';
                    }
                    Array.from(container.querySelectorAll('.catalogue-card')).forEach(card => {
                        card.style.display = '';
                    });
                }
                // Recréer les cartes pour s'assurer qu'elles sont bien affichées
                setTimeout(() => {
                    if (!isDisplayingNotes) {
                        displayUserAnimeNotes();
                    }
                    renderTop10Slots();
                    // Ne pas appeler applyTypeFilter ici pour éviter les boucles infinies
                }, 50);
                return;
            }
            
            console.log('Genres sélectionnés, masquage des conteneurs d\'étoiles');
            
            // Masquer tous les conteneurs d'étoiles
            // Masquer le conteneur principal des étoiles
            const allContainers = document.querySelector('.all-star-containers');
            if (allContainers) {
                allContainers.style.display = 'none';
                console.log('Conteneur principal des étoiles masqué');
            } else {
                console.log('Conteneur principal des étoiles non trouvé');
            }
            
            // Masquer aussi tous les groupes d'étoiles individuels
            const starGroups = document.querySelectorAll('.star-rating-group');
            starGroups.forEach(group => {
                group.style.display = 'none';
            });
            console.log('Groupes d\'étoiles masqués:', starGroups.length);
            
            // Masquer aussi tous les conteneurs d'étoiles individuels
            for (let i = 10; i >= 1; i--) {
                const container = document.getElementById(i === 10 ? 'star-containers' : `star-containers-${i}`);
                if (container) {
                    container.style.display = 'none';
                }
            }
            
            // Si des genres sont sélectionnés, créer un seul grand conteneur
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            if (!user || !user.email) return;
            
            // Charger les notes depuis Firebase (ou localStorage en fallback)
            (async () => {
                let notes = await loadUserNotes(user.email);
                console.log('🔍 [FILTER PROFILE BY GENRES] Notes chargées depuis Firebase/localStorage:', notes.length);
                
                // Filtrer les contenus interdits pour les mineurs
                if (typeof filterForbiddenContent === 'function') {
                    notes = filterForbiddenContent(notes);
                }
                
                // Filtrer les animes par genre sélectionné ET par type si sélectionné
            console.log('🔍 Filtrage des animes avec genres sélectionnés:', selectedGenres);
            console.log('📊 Nombre total de notes à filtrer:', notes.length);
            
            const filteredAnimes = notes.filter(anime => {
                // Ignorer les animes de test
                if (anime.id && (anime.id.toString().startsWith('test') || 
                    anime.id === 3 || anime.id === 4 || 
                    anime.id === 'naruto' || anime.id === 'onepiece' ||
                    anime.id === 'deathnote' || anime.id === 'attackontitan')) {
                    return false; // Exclure cet anime
                }
                
                let genres = anime.genres;
                if (!genres || !Array.isArray(genres) || genres.length === 0) {
                    const titre = anime.titre || anime.title || anime.name || "";
                        genres = ["Genre inconnu"];
                }
                
                // Extraire les noms de genres (gérer les chaînes et les objets)
                const animeGenres = genres.map(g => {
                    // Si c'est un objet avec une propriété name, extraire le nom
                    if (typeof g === 'object' && g !== null && g.name) {
                        return g.name.toLowerCase().trim();
                    }
                    // Si c'est une chaîne, l'utiliser directement
                    return (typeof g === 'string' ? g : String(g)).toLowerCase().trim();
                });
                
                // Comparer les genres (normaliser les espaces et la casse)
                const matchesGenre = selectedGenres.some(selectedGenre => {
                    const normalizedSelected = selectedGenre.toLowerCase().trim();
                    return animeGenres.some(animeGenre => {
                        const normalizedAnime = animeGenre.toLowerCase().trim();
                        return normalizedAnime === normalizedSelected || 
                               normalizedAnime.includes(normalizedSelected) || 
                               normalizedSelected.includes(normalizedAnime);
                    });
                });
                
                // Si aucun type sélectionné, retourner seulement le résultat du genre
                if (!window.selectedType) {
                    return matchesGenre;
                }
                
                // Vérifier le type de l'anime (utiliser contentType en priorité)
                let animeType = anime.contentType || 'anime'; // par défaut
                
                // Fallback pour les anciennes notes qui utilisent encore isManga
                if (!anime.contentType && anime.isManga) {
                    animeType = 'manga';
                } else if (!anime.contentType) {
                    // Vérifier d'autres types par ID ou titre
                    if (anime.id && anime.id.includes('roman')) {
                        animeType = 'roman';
                    } else if (anime.id && anime.id.includes('film')) {
                        animeType = 'film';
                    } else if (anime.id && anime.id.includes('serie')) {
                        animeType = 'serie';
                    }
                }
                
                // Retourner true seulement si l'anime correspond au genre ET au type
                const matches = matchesGenre && (!window.selectedType || animeType === window.selectedType);
                return matches;
            });
            
            console.log('✅ Animes filtrés:', filteredAnimes.length, 'sur', notes.length);
            if (filteredAnimes.length === 0) {
                console.warn('⚠️ Aucun anime trouvé avec les genres sélectionnés:', selectedGenres);
            }
            
            // === TRI PAR NOTE DÉCROISSANTE POUR LES CONTAINERS GENRE ===
            filteredAnimes.sort((a, b) => {
                let noteA = typeof a.note === 'string' ? parseInt(a.note, 10) : a.note;
                let noteB = typeof b.note === 'string' ? parseInt(b.note, 10) : b.note;
                noteA = isNaN(noteA) ? 0 : noteA;
                noteB = isNaN(noteB) ? 0 : noteB;
                return noteB - noteA;
            });
            
            // Créer le grand conteneur pour les animes filtrés
            const genreContainer = document.createElement('div');
            genreContainer.id = 'genre-filtered-container';
            // S'assurer que le conteneur est visible
            genreContainer.style.display = 'block';
            genreContainer.style.visibility = 'visible';
            genreContainer.style.opacity = '1';
            
            // Ajouter un titre pour indiquer le genre sélectionné
            const titleDiv = document.createElement('div');
            titleDiv.style.cssText = `
                width: 98%;
                max-width: 98%;
                text-align: center;
                padding: 2rem 2rem 1rem 2rem;
                color: #00b894;
                font-size: 1.5rem;
                font-weight: bold;
                background: #23262f;
                margin: 1rem auto;
                box-sizing: border-box;
                border-radius: 18px;
            `;
            var ofGenre2 = _profileT('genre.of_genre') || 'du genre :';
            var typeLabel2 = _profileT('genre.type_label') || 'Type :';
            var contentType2 = (window.selectedType === 'manga' || window.selectedType === 'anime' || window.selectedType === 'film') ? (window.selectedType === 'manga' ? (_profileT('genre.content_mangas') || 'Mangas') : window.selectedType === 'anime' ? (_profileT('genre.content_animes') || 'Animes') : (_profileT('genre.content_films') || 'Films')) : (_profileT('genre.content_contents') || 'Contenus');
            var titleText = contentType2 + ' ' + ofGenre2 + ' ' + selectedGenres.join(', ');
            if (window.selectedType) {
                var typeVal = window.selectedType === 'manga' ? (_profileT('genre.content_mangas') || 'manga') : window.selectedType === 'anime' ? (_profileT('genre.content_animes') || 'anime') : window.selectedType === 'film' ? (_profileT('genre.content_films') || 'film') : window.selectedType;
                titleText += ' (' + typeLabel2 + ' ' + typeVal + ')';
            }
            titleDiv.textContent = titleText;
            genreContainer.appendChild(titleDiv);
            
            // Conteneur pour les cartes avec pagination
            const cardsContainer = document.createElement('div');
            cardsContainer.id = 'genre-cards-container';
            cardsContainer.className = 'genre-filtered-cards';
            cardsContainer.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                justify-content: center;
                align-items: flex-start;
                padding: 2rem;
                min-height: 400px;
                width: 98%;
                max-width: 98%;
                overflow-x: hidden;
                background: #23262f;
                border-radius: 18px;
                margin: 1rem auto;
                box-sizing: border-box;
            `;
            genreContainer.appendChild(cardsContainer);
            
            // Système de pagination
            const pageSize = 70; // 70 cartes par page
            let currentPage = 1;
            const totalPages = Math.ceil(filteredAnimes.length / pageSize);
            
            function renderGenrePage(page) {
                cardsContainer.innerHTML = '';
                const start = (page - 1) * pageSize;
                const end = start + pageSize;
                const pageAnimes = filteredAnimes.slice(start, end);
                
                // Si aucune carte à afficher, afficher un message
                if (pageAnimes.length === 0 && page === 1) {
                    const noResultsMsg = document.createElement('div');
                    noResultsMsg.style.cssText = `
                        width: 100%;
                        text-align: center;
                        padding: 3rem;
                        color: #00b894;
                        font-size: 1.2rem;
                        font-weight: 600;
                    `;
                    noResultsMsg.textContent = `Aucun ${window.selectedType || 'contenu'} trouvé avec les genres sélectionnés : ${selectedGenres.join(', ')}`;
                    cardsContainer.appendChild(noResultsMsg);
                    console.warn('⚠️ Aucune carte à afficher pour la page', page);
                    return;
                }
                
                pageAnimes.forEach(anime => {
                    // Ignorer les animes de test
                    if (anime.id && (anime.id.toString().startsWith('test') || 
                        anime.id === 3 || anime.id === 4 || 
                        anime.id === 'naruto' || anime.id === 'onepiece' ||
                        anime.id === 'deathnote' || anime.id === 'attackontitan')) {
                        return; // Ignorer cet anime
                    }
                    
                    // Récupération plus robuste des propriétés
                    const titre = anime.titre || anime.title || anime.name || anime.nom || "Titre inconnu";
                    const image = anime.image || anime.img || anime.cover || anime.coverImage || "";
                    let genres = anime.genres || anime.genre || [];
                    let synopsis = anime.synopsis || anime.synopsisPerso || anime.description || anime.desc || "";
                    
                    // Ignorer les animes sans titre valide
                    if (!titre || titre === "Titre inconnu") {
                        return; // Ignorer cet anime
                    }
                    
                    if (!synopsis) {
                        const found = animeExamples.find(a => (a.id === anime.id || a.titre === titre || (a.titre && a.titre.toLowerCase() === titre.toLowerCase())));
                        if (found && found.synopsis) synopsis = found.synopsis;
                    }
                    
                    if (!genres || !Array.isArray(genres) || genres.length === 0) {
                            genres = ["Genre inconnu"];
                    }
                    
                    if (!synopsis) {
                        synopsis = (typeof window.t === 'function' && window.t('no_synopsis_available')) || "Synopsis non renseigné.";
                    }
                    
                    // Générer le lien vers la page de détails avec l'ID et le type
                    // TOUJOURS utiliser anime-details.html, même si anime.page existe (pour éviter les anciens liens)
                    const animeIdForLink = anime.id || anime.mal_id || anime.malId || '';
                    const contentTypeForLink = anime.contentType || (anime.isManga ? 'manga' : 'anime');
                    let pageHtml = "#";
                    
                    // Si on a un ID, créer le lien vers anime-details.html
                    if (animeIdForLink) {
                        pageHtml = `anime-details.html?id=${animeIdForLink}&type=${contentTypeForLink}`;
                    }
                    
                    const genresHtml = genres.map(g => {
                        const displayG = getTranslatedGenreForProfile(g);
                        return `<a href="mangas.html?genre=${encodeURIComponent(g)}" class="profile-genre-link" style="background:#00b89422;color:#00b894;font-weight:600;padding:0.15em 0.6em;border-radius:10px;font-size:0.92rem;letter-spacing:0.01em;text-decoration:none;transition:background 0.2s;" 
                        onclick="event.preventDefault();window.location.href='mangas.html?genre=${encodeURIComponent(g)}';">${displayG}</a>`;
                    }).join('');
                    

                    
                    const card = document.createElement('div');
                    card.className = 'catalogue-card';
                    card.setAttribute('data-anime-id', anime.id);
                    card.setAttribute('draggable', 'true');
                    
                    // Marquer le type de la carte pour le filtrage
                    if (anime.isManga) {
                        card.setAttribute('data-is-manga', 'true');
                        card.classList.add('manga-card');
                    }
                    
                    // Appliquer le filtre par type immédiatement si un type est sélectionné
                    if (window.selectedType) {
                        let cardType = 'anime'; // par défaut
                        
                        // Vérifier si c'est un manga
                        if (anime.isManga) {
                            cardType = 'manga';
                        } else {
                            // Vérifier d'autres types
                            if (anime.id && anime.id.includes('roman')) {
                                cardType = 'roman';
                            } else if (anime.id && anime.id.includes('film')) {
                                cardType = 'film';
                            } else if (anime.id && anime.id.includes('serie')) {
                                cardType = 'serie';
                            }
                        }
                        
                        // Masquer la carte si elle ne correspond pas au type sélectionné
                        if (cardType !== window.selectedType) {
                            card.style.display = 'none';
                            card.style.opacity = '0';
                        }
                    }
                    card.style.cssText = `
                        background: linear-gradient(135deg, #23262f 80%, #00b89422 100%);
                        border: 2.5px solid #00b894;
                        border-radius: 18px;
                        box-shadow: 0 4px 18px #00b89433, 0 2px 8px #0008;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-start;
                        padding: 1.1rem 1.1rem 1rem 1.1rem;
                        height: 520px;
                        width: 340px;
                        margin: 0;
                        overflow: hidden;
                        transition: box-shadow 0.2s, transform 0.2s;
                        position: relative;
                        flex: 0 0 340px;
                        box-sizing: border-box;
                    `;
                    
                    const uniqueId = `morebtn-${Date.now()}-${Math.floor(Math.random()*100000)}`;
                    card.innerHTML = `
                        <button class="card-more-btn" id="${uniqueId}" aria-label="Plus d'options" style="
                            position: absolute;
                            top: 12px;
                            right: 14px;
                            width: 32px;
                            height: 32px;
                            background: #f8f9fa;
                            border: 1.5px solid #00b894;
                            border-radius: 50%;
                            box-shadow: 0 2px 8px #0002;
                            color: #444;
                            font-size: 1.3rem;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            z-index: 10;
                            transition: border-color 0.18s, background 0.18s;
                            outline: none;
                            padding: 0;
                        ">
                            &#8230;
                        </button>
                        <div class="card-more-menu" style="
                            display: none;
                            position: absolute;
                            top: 46px;
                            right: 0;
                            background: #fff;
                            color: #00b894;
                            font-size: 1rem;
                            font-weight: bold;
                            border-radius: 8px;
                            box-shadow: 0 4px 16px #0002;
                            padding: 7px 18px;
                            white-space: nowrap;
                            z-index: 9999;
                            border: 1.5px solid #00b894;
                            min-width: 110px;
                            text-align: center;
                            opacity: 0;
                            pointer-events: none;
                            transition: opacity 0.25s;
                            visibility: hidden;
                        ">
                            <div class="select-top10-btn" style="cursor:pointer;padding:6px 0;pointer-events:auto;color:#00b894;font-weight:bold;font-size:0.9rem;transition:background-color 0.2s;" onmouseover="this.style.backgroundColor='#00b89420'" onmouseout="this.style.backgroundColor='transparent'">${getAddToTop10Label()}</div>
                        </div>
                        <img src="${image}" alt="${titre}" style="width:140px;height:185px;object-fit:cover;display:block;object-position:center center;margin:0 auto 1rem auto;border-radius:10px;box-shadow:0 2px 12px #00b89455;align-self:center;">
                        <a href="${pageHtml}" style="font-size:1.15rem;margin-bottom:0.5rem;color:#00b894;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;display:block;transition:color 0.2s;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" onmouseover="this.style.color='#00d4aa'" onmouseout="this.style.color='#00b894'">${titre}</a>
                        <div class="content-synopsis profile-card-synopsis" style="color:#b3e6b3;font-size:0.98rem;line-height:1.5;text-align:center;margin-bottom:0.7rem;">${truncateSynopsis(synopsis)}</div>
                        <div class="anime-genres" style="display:flex;flex-wrap:wrap;gap:0.3rem;justify-content:center;margin-bottom:0.5rem;">
                            ${genresHtml}
                        </div>
                        <div style="color:#00b894;font-size:1.1rem;font-weight:bold;text-align:center;">
                            ${_profileT('profile.rating_label') || 'Note'}: ${anime.note || (_profileT('profile.not_rated') || 'Non noté')}/10
                        </div>
                    `;
                    
                    // S'assurer que le lien du titre fonctionne correctement
                    const titleLink = card.querySelector('a[href*="anime-details"], a[href*="manga-details"], a[href]');
                    if (titleLink) {
                        const href = titleLink.getAttribute('href');
                        console.log('🔗 [TITLE LINK] Lien trouvé pour carte:', titre, 'href:', href);
                        
                        // Forcer le clic sur le lien
                        titleLink.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            
                            const linkHref = this.getAttribute('href');
                            console.log('🖱️ [TITLE CLICK] Clic sur titre:', titre, 'href:', linkHref);
                            
                            if (linkHref && linkHref !== '#') {
                                console.log('✅ [TITLE CLICK] Redirection vers:', linkHref);
                                window.location.href = linkHref;
                            } else {
                                console.warn('⚠️ [TITLE CLICK] Lien invalide ou vide:', linkHref);
                            }
                            return false;
                        }, true); // Utiliser capture phase pour s'exécuter en premier
                        
                        // S'assurer que le lien est cliquable
                        titleLink.style.position = 'relative';
                        titleLink.style.zIndex = '100';
                        titleLink.style.pointerEvents = 'auto';
                        titleLink.style.cursor = 'pointer';
                    } else {
                        console.warn('⚠️ [TITLE LINK] Aucun lien trouvé pour carte:', titre);
                    }
                    
                    // Ajouter les événements pour le menu "plus d'options"
                    const moreBtn = card.querySelector('.card-more-btn');
                    const moreMenu = card.querySelector('.card-more-menu');
                    
                    // Dans les conteneurs de genre : masquer le bouton selon le top 10 du genre spécifique
                    const user = JSON.parse(localStorage.getItem('user') || 'null');
                    let shouldHideButton = false;
                    
                    if (user && user.email) {
                        // Vérifier le top 10 des genres spécifiques
                        const genres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
                        const genre = genres.length > 0 ? genres.sort().join(',') : null;
                        const genreTop10 = getUserTop10(user, genre, window.selectedType);
                        // Pour les animes ET mangas, comparer aussi par titre de base (sans saison/partie)
                        const animeTitle = anime.titre || anime.title || anime.name || '';
                        const isInGenreTop10 = genreTop10.some(a => {
                            if (!a) return false;
                            // Comparaison par ID d'abord
                            if (String(a.id) === String(anime.id)) return true;
                            // Pour les animes ET mangas, comparer aussi par titre de base
                            const selectedType = window.selectedType;
                            if ((selectedType === 'anime' || selectedType === 'manga') && 
                                (a.contentType === selectedType || !a.contentType) && 
                                anime.contentType === selectedType) {
                                const contentTypeForExtraction = selectedType;
                                const top10BaseTitle = extractBaseAnimeTitle(a.titre || a.title || a.name, contentTypeForExtraction);
                                const animeBaseTitle = extractBaseAnimeTitle(animeTitle, contentTypeForExtraction);
                                // Si les titres de base correspondent, masquer le bouton
                                if (top10BaseTitle === animeBaseTitle && top10BaseTitle) {
                                    return true;
                                }
                                // Vérifier aussi la similarité pour gérer les variantes (ex: DBZ, DBZ Super, etc.)
                                if (areAnimeTitlesSimilar(a.titre || a.title || a.name, animeTitle, contentTypeForExtraction)) {
                                    return true;
                                }
                            }
                            return false;
                        });
                        shouldHideButton = isInGenreTop10;
                    }
                    
                    if (moreBtn) {
                        moreBtn.style.display = shouldHideButton ? 'none' : '';
                    }
                    if (moreMenu) {
                        moreMenu.style.display = 'none';
                        moreMenu.style.opacity = '0';
                        moreMenu.style.pointerEvents = 'none';
                    }
                    
                    if (moreBtn && moreMenu) {
                        moreBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            e.preventDefault();
                            if (moreMenu.style.display === 'none') {
                                moreMenu.style.display = 'block';
                                moreMenu.style.visibility = 'visible';
                                setTimeout(() => {
                                    moreMenu.style.opacity = '1';
                                    moreMenu.style.pointerEvents = 'auto';
                                }, 10);
                            } else {
                                moreMenu.style.opacity = '0';
                                moreMenu.style.pointerEvents = 'none';
                                setTimeout(() => {
                                    moreMenu.style.display = 'none';
                                    moreMenu.style.visibility = 'hidden';
                                }, 250);
                            }
                        });
                        
                        // Action "Ajouter au top 10"
                        const selectBtn = moreMenu.querySelector('.select-top10-btn');
                        if (selectBtn) {
                            selectBtn.onclick = function(e) {
                                e.stopPropagation();
                                // Si la carte est déjà sélectionnée, la désélectionner
                                if (window.selectedTop10Card === card) {
                                    setAnimeCardSelection(card, false);
                                    window.selectedTop10Card = null;
                                    if (moreMenu) {
                                        moreMenu.style.opacity = '0';
                                        moreMenu.style.pointerEvents = 'none';
                                        setTimeout(() => {
                                            moreMenu.style.display = 'none';
                                        }, 250);
                                    }
                                    return;
                                }
                                // Si une autre carte était sélectionnée, la désélectionner
                                if (window.selectedTop10Card && window.selectedTop10Card !== card) {
                                    setAnimeCardSelection(window.selectedTop10Card, false);
                                }
                                // Sélection visuelle
                                setAnimeCardSelection(card, true);
                                window.selectedTop10Card = card;
                                
                        // Définir le contexte pour l'ajout au top 10 par genre
                        window.top10Context = {
                            genre: Array.isArray(window.selectedGenres) ? window.selectedGenres : [],
                                    type: window.selectedType,
                                    isGenreContext: true
                                };
                                
                                // Afficher l'interface en miniature
                                showTop10MiniInterface();
                                
                                // Fermer le menu ...
                                if (moreMenu) {
                                    moreMenu.style.opacity = '0';
                                    moreMenu.style.pointerEvents = 'none';
                                    setTimeout(() => {
                                        moreMenu.style.display = 'none';
                                    }, 250);
                                }
                                // Le bouton '...' reste visible
                            };
                        }
                    }
                    
                    // Drag & drop events
                    card.addEventListener('dragstart', function(e) {
                        e.dataTransfer.setData('anime-id', anime.id);
                        setAnimeCardSelection(card, true);
                    });
                    card.addEventListener('dragend', function() {
                        setAnimeCardSelection(card, false);
                    });
                    
                    cardsContainer.appendChild(card);
                });
                
                console.log(`📦 Page ${page}: ${pageAnimes.length} cartes ajoutées au conteneur`);
                
                // Créer la pagination si nécessaire
                if (totalPages > 1) {
                    const paginationContainer = document.createElement('div');
                    paginationContainer.style.cssText = `
                        width: 98%;
                        max-width: 98%;
                        display: flex;
                        justify-content: center;
                        gap: 8px;
                        padding: 2rem;
                        background: #23262f;
                        border-top: 1px solid #333;
                        overflow-x: auto;
                        box-sizing: border-box;
                        margin: 0 auto;
                    `;
                    
                    // Bouton précédent
                    if (page > 1) {
                        const prevBtn = document.createElement('button');
                        prevBtn.textContent = _profileT('common.pagination_prev') || '← Précédent';
                        prevBtn.style.cssText = `
                            background: #00b894;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            padding: 0.5rem 1rem;
                            cursor: pointer;
                            font-weight: bold;
                            transition: background 0.2s;
                        `;
                        prevBtn.onclick = () => {
                            currentPage = page - 1;
                            renderGenrePage(currentPage);
                            // Ne pas appeler applyTypeFilter ici pour éviter les boucles infinies
                        };
                        paginationContainer.appendChild(prevBtn);
                    }
                    
                    // Numéros de pages
                    for (let i = 1; i <= totalPages; i++) {
                        const pageBtn = document.createElement('button');
                        pageBtn.textContent = i;
                        pageBtn.style.cssText = `
                            background: ${i === page ? '#00b894' : '#333'};
                            color: white;
                            border: none;
                            border-radius: 8px;
                            padding: 0.5rem 0.8rem;
                            cursor: pointer;
                            font-weight: bold;
                            transition: background 0.2s;
                            margin: 0 2px;
                        `;
                        pageBtn.onclick = () => {
                            currentPage = i;
                            renderGenrePage(currentPage);
                            // Ne pas appeler applyTypeFilter ici pour éviter les boucles infinies
                        };
                        paginationContainer.appendChild(pageBtn);
                    }
                    
                    // Bouton suivant
                    if (page < totalPages) {
                        const nextBtn = document.createElement('button');
                        nextBtn.textContent = _profileT('common.pagination_next') || 'Suivant →';
                        nextBtn.style.cssText = `
                            background: #00b894;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            padding: 0.5rem 1rem;
                            cursor: pointer;
                            font-weight: bold;
                            transition: background 0.2s;
                        `;
                        nextBtn.onclick = () => {
                            currentPage = page + 1;
                            renderGenrePage(currentPage);
                            // Ne pas appeler applyTypeFilter ici pour éviter les boucles infinies
                        };
                        paginationContainer.appendChild(nextBtn);
                    }
                    
                    // Supprimer l'ancienne pagination si elle existe
                    const oldPagination = genreContainer.querySelector('.genre-pagination');
                    if (oldPagination) {
                        oldPagination.remove();
                    }
                    
                    paginationContainer.className = 'genre-pagination';
                    genreContainer.appendChild(paginationContainer);
                } else {
                    // Supprimer la pagination si elle n'est plus nécessaire
                    const oldPagination = genreContainer.querySelector('.genre-pagination');
                    if (oldPagination) {
                        oldPagination.remove();
                    }
                }
            }
            
            // Afficher la première page
            renderGenrePage(currentPage);
            // Ne pas appeler applyTypeFilter ici pour éviter les boucles infinies
            
            // Insérer le conteneur au bon endroit (comme dans applyGenreFilter)
            const reviewsSection = document.getElementById('reviews-section');
            if (reviewsSection) {
                // Insérer après le container de boutons de tri, mais avant le container de recherche
                const sortBtnContainer = reviewsSection.querySelector('div[style*="sticky"]');
                const searchResultsContainer = document.getElementById('search-results-container');
                const allStarContainers = document.querySelector('.all-star-containers');
                
                // Si le container de recherche existe et est dans le DOM, insérer avant lui
                if (searchResultsContainer && searchResultsContainer.parentNode === reviewsSection) {
                    reviewsSection.insertBefore(genreContainer, searchResultsContainer);
                } else if (sortBtnContainer) {
                    // Insérer après le container de boutons de tri
                    if (sortBtnContainer.nextSibling) {
                        reviewsSection.insertBefore(genreContainer, sortBtnContainer.nextSibling);
                    } else {
                        reviewsSection.appendChild(genreContainer);
                    }
                } else if (allStarContainers && allStarContainers.parentNode) {
                    // Insérer après le conteneur des étoiles
                    allStarContainers.parentNode.insertBefore(genreContainer, allStarContainers.nextSibling);
                } else {
                    reviewsSection.appendChild(genreContainer);
                }
                
                console.log('✅ Conteneur de genre filtré inséré avec', filteredAnimes.length, 'animes');
            } else {
                console.error('❌ reviews-section non trouvé');
            }
            })(); // Fermeture de la fonction async pour filterProfileByGenres
        }
    }
    
    // Ne pas appeler applyTypeFilter ici pour éviter les boucles infinies
    // Le filtre de type est déjà appliqué dans renderStarPage
});

// Fonction pour charger les notes depuis le localStorage et mettre à jour les ratings
function syncAnimeRatingsFromStorage() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) return;
    
    // Récupérer les notes des animes
    const notesKey = 'user_anime_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) {
        console.error('Erreur lors de la lecture des notes d\'anime:', e);
        notes = [];
    }
    
    // Récupérer les notes des mangas
    let mangaRatings = {};
    try {
        mangaRatings = JSON.parse(localStorage.getItem('mangaRatings') || '{}');
        
        // Convertir les notes des mangas dans le format attendu par le profil
        Object.entries(mangaRatings).forEach(([mangaId, rating]) => {
            // Vérifier si ce manga n'est pas déjà dans les notes
            const existingNoteIndex = notes.findIndex(n => n.id === parseInt(mangaId));
            if (existingNoteIndex === -1) {
                // Récupérer les détails du manga depuis l'API ou les données existantes
                // Note: Pour l'instant, on ajoute juste l'ID et la note
                notes.push({
                    id: parseInt(mangaId),
                    note: rating,
                    isManga: true, // Marquer comme manga pour référence future
                    addedAt: new Date().toISOString() // Ajouter une date d'ajout
                });
            }
        });
    } catch (e) {
        console.error('Erreur lors de la lecture des notes de manga:', e);
    }
    
    // Sauvegarder les notes mises à jour si des mangas ont été ajoutés
    if (Object.keys(mangaRatings).length > 0) {
        try {
            localStorage.setItem(notesKey, JSON.stringify(notes));
        } catch (e) {
            console.error('Erreur lors de la sauvegarde des notes mises à jour:', e);
        }
    }
    
    // Mettre à jour les notes dans le tableau d'animés (si animes existe)
    if (animes && Array.isArray(animes)) {
    animes.forEach(anime => {
        // Cherche la note pour cet animé dans les notes utilisateur
        const found = notes.find(n =>
            (n.id === anime.id || n.titre === anime.titre || (anime.titre && n.titre && n.titre.toLowerCase() === anime.titre.toLowerCase()))
            && n.note !== undefined && n.note !== null && n.note !== "" && !isNaN(Number(n.note))
        );
        anime.rating = found ? Number(found.note) : null;
    });
    }
}

// Redirige vers une page dynamique pour les 10/10 (après les 3 premiers)
function goToTenStarsPage(pageNum) {
    // Stocke la page demandée dans le localStorage
    localStorage.setItem('tenStarsPage', pageNum);
    // Redirige vers une page unique (ex: profil-10.html)
    window.location.href = 'profil-10.html';
}

// Appeler cette fonction au chargement de la page pour synchroniser les notes
document.addEventListener('DOMContentLoaded', function() {
    syncAnimeRatingsFromStorage();
    
    // Ne pas appeler displayUserAnimeNotes ici, seulement quand l'onglet reviews est actif
    
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            if (this.dataset.tab === 'reviews') {
                setTimeout(() => {
                    if (!isDisplayingNotes) {
                        displayUserAnimeNotes();
                    }
                }, 100);
            }
        });
    });
});

// Fonction de mise à jour de la pagination des étoiles (vide pour désactiver l'affichage des boutons)
function updateStarPagination(containerId, pageCount, currentPage, onPageChange) {
    // Ne rien faire ici pour ne plus afficher les boutons de pagination
}

// Affiche une modal avec pagination si trop d'animés dans un container
function showAnimeModal(animes, title = "Animés", pageSize = 6) {
    // Supprime une ancienne modal si présente
    let oldModal = document.getElementById('anime-modal');
    if (oldModal) oldModal.remove();

    let currentPage = 1;
    const totalPages = Math.ceil(animes.length / pageSize);

    function renderModalPage(page) {
        modalContent.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <h2 style="margin:0;font-size:1.4em;">${title}</h2>
                <button id="close-anime-modal" style="background:#ff6b6b;color:#fff;border:none;border-radius:8px;padding:0.5em 1.2em;font-size:1.1em;cursor:pointer;">Fermer</button>
            </div>
            <div id="anime-modal-cards" style="display:flex;flex-wrap:wrap;gap:18px;margin:1.2em 0 0 0;justify-content:flex-start;"></div>
            <div id="anime-modal-pagination" style="display:flex;justify-content:center;gap:8px;margin-top:1.2em;"></div>
        `;
        // Affichage des cartes
        const cardsDiv = modalContent.querySelector('#anime-modal-cards');
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const pageAnimes = animes.slice(start, end);
        pageAnimes.forEach(anime => {
            const card = document.createElement('div');
            card.className = 'catalogue-card';
            card.style = `
                background: linear-gradient(135deg, #23262f 80%, #00b89422 100%);
                border: 2.5px solid #00b894;
                border-radius: 18px;
                box-shadow: 0 4px 18px #00b89433, 0 2px 8px #0008;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                padding: 1.1rem 1.1rem 1rem 1.1rem;
                height: 480px;
                max-width: 320px;
                width: 320px;
                margin: 0;
                overflow: hidden;
                transition: box-shadow 0.2s, transform 0.2s;
                flex: 1 1 300px;
            `;
            // Générer le lien vers la page de détails
            const animeIdForModal = anime.id || anime.mal_id || anime.malId || '';
            const contentTypeForModal = anime.contentType || (anime.isManga ? 'manga' : 'anime');
            let pageHtmlForModal = "#";
            if (animeIdForModal) {
                pageHtmlForModal = `anime-details.html?id=${animeIdForModal}&type=${contentTypeForModal}`;
            }
            
            card.innerHTML = `
                <img src="${anime.image}" alt="${anime.titre}" style="width:140px;height:185px;object-fit:cover;display:block;object-position:center center;margin:0 auto 1rem auto;border-radius:10px;box-shadow:0 2px 12px #00b89455;align-self:center;">
                <a href="${pageHtmlForModal}" style="font-size:1.15rem;margin-bottom:0.5rem;color:#00b894;font-weight:700;text-align:center;text-decoration:none;cursor:pointer;display:block;transition:color 0.2s;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" onmouseover="this.style.color='#00d4aa'" onmouseout="this.style.color='#00b894'">${anime.titre}</a>
                <div style="color:#b3e6b3;font-size:0.98rem;line-height:1.5;text-align:center;margin-bottom:0.7rem;">${truncateSynopsis(anime.synopsis)}</div>
            `;
            cardsDiv.appendChild(card);
        });

        // Pagination
        const pagDiv = modalContent.querySelector('#anime-modal-pagination');
        pagDiv.innerHTML = '';
        if (totalPages > 1) {
            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement('button');
                btn.textContent = i;
                btn.className = 'star-page-btn' + (i === page ? ' active' : '');
                btn.style.margin = '0 2px';
                btn.onclick = () => {
                    currentPage = i;
                    renderModalPage(currentPage);
                };
                pagDiv.appendChild(btn);
            }
        }

        // Fermer la modal
        modalContent.querySelector('#close-anime-modal').onclick = () => {
            modal.remove();
        };
    }

    // Création de la modal
    const modal = document.createElement('div');
    modal.id = 'anime-modal';
    modal.style = `
        position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;
        background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;
    `;
    const modalContent = document.createElement('div');
    modalContent.style = `
        background:#23262f;
        border-radius:18px;
        box-shadow:0 8px 32px #000a;
        padding:2.2em 2.2em 1.5em 2.2em;
        max-width:1100px;
        width:90vw;
        max-height:90vh;
        overflow:auto;
        position:relative;
    `;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    renderModalPage(currentPage);
}

// Modal dynamique pour tous les animés 10/10 avec pagination
function showAnime10Modal(notes10) {
    // Supprime une ancienne modal si présente
    let oldModal = document.getElementById('anime10-modal');
    if (oldModal) oldModal.remove();

    let currentPage = 1;
    const pageSize = 6;
    const totalPages = Math.ceil(notes10.length / pageSize);

    // Création de la modal
    const modal = document.createElement('div');
    modal.id = 'anime10-modal';
    modal.style = `
        position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;
        background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;
    `;
    const modalContent = document.createElement('div');
    modalContent.style = `
        background:#23262f;
        border-radius:18px;
        box-shadow:0 8px 32px #000a;
        padding:2.2em 2.2em 1.5em 2.2em;
        max-width:1100px;
        width:90vw;
        max-height:90vh;
        overflow:auto;
        position:relative;
    `;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    function renderModalPage(page) {
        modalContent.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <h2 style="margin:0;font-size:1.4em;">Animés notés 10/10</h2>
                <button id="close-anime10-modal" style="background:#ff6b6b;color:#fff;border:none;border-radius:8px;padding:0.5em 1.2em;font-size:1.1em;cursor:pointer;">Fermer</button>
            </div>
            <div id="anime10-modal-cards" style="display:flex;flex-wrap:wrap;gap:18px;margin:1.2em 0 0 0;justify-content:flex-start;"></div>
            <div id="anime10-modal-pagination" style="display:flex;justify-content:center;gap:8px;margin-top:1.2em;"></div>
        `;
        // Affichage des cartes
        const cardsDiv = modalContent.querySelector('#anime10-modal-cards');
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const pageAnimes = notes10.slice(start, end);
        pageAnimes.forEach(anime => {
            const titre = anime.titre || anime.title || anime.name || "Titre inconnu";
            const image = anime.image || anime.img || anime.cover || "";
            let genres = anime.genres;
            let synopsis = anime.synopsis;
            if (!genres || !Array.isArray(genres) || genres.length === 0) {
                if (titre.toLowerCase().includes("death note")) {
                    genres = ["Mystère", "Psychologique", "Surnaturel", "Thriller", "Shonen"];
                } else if (titre.toLowerCase().includes("attaque des titans")) {
                    genres = ["Action", "Drame", "Fantastique", "Shonen"];
                } else if (titre.toLowerCase().includes("naruto")) {
                    genres = ["Action", "Aventure", "Comédie", "Drame", "Fantastique", "Shonen"];
                } else if (titre.toLowerCase().includes("one piece")) {
                    genres = ["Action", "Aventure", "Comédie", "Fantastique", "Shonen"];
                } else {
                    genres = ["Genre inconnu"];
                }
            }
            if (!synopsis) {
                synopsis = (typeof window.t === 'function' && window.t('no_synopsis_available')) || "Synopsis non renseigné.";
            }
            // Générer le lien vers la page de détails avec l'ID et le type
            // TOUJOURS utiliser anime-details.html
            const animeIdForLink = anime.id || anime.mal_id || anime.malId || '';
            const contentTypeForLink = anime.contentType || (anime.isManga ? 'manga' : 'anime');
            let pageHtml = "#";
            
            // Si on a un ID, créer le lien vers anime-details.html
            if (animeIdForLink) {
                pageHtml = `anime-details.html?id=${animeIdForLink}&type=${contentTypeForLink}`;
            }
            const genresHtml = genres.map(g => {
                const displayG = getTranslatedGenreForProfile(g);
                const fontSize = genres.length >= 5 ? '0.75rem' : '0.92rem';
                const padding = genres.length >= 5 ? '0.1em 0.4em' : '0.15em 0.6em';
                return `<a href="mangas.html?genre=${encodeURIComponent(g)}" class="profile-genre-link" style="background:#00b89422;color:#00b894;font-weight:600;padding:${padding};border-radius:10px;font-size:${fontSize};letter-spacing:0.01em;text-decoration:none;transition:background 0.2s;" 
                onclick="event.preventDefault();window.location.href='mangas.html?genre=${encodeURIComponent(g)}';">${displayG}</a>`;
            }).join('');
            const uniqueIdAnime10 = `morebtn-10-${Date.now()}-${Math.floor(Math.random()*100000)}`;
            const card = document.createElement('div');
            card.className = 'catalogue-card';
            card.style = `
                background: linear-gradient(135deg, #23262f 80%, #00b89422 100%);
                border: 2.5px solid #00b894;
                border-radius: 18px;
                box-shadow: 0 4px 18px #00b89433, 0 2px 8px #0008;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                padding: 1.1rem 1.1rem 1rem 1.1rem;
                height: 520px;
                max-width: 340px;
                width: 340px;
                margin: 0;
                overflow: hidden;
                transition: box-shadow 0.2s, transform 0.2s;
                position: relative;
            `;
            card.onmouseover = () => card.style.boxShadow = "0 8px 32px #00b89466, 0 2px 8px #000a";
            card.onmouseout = () => card.style.boxShadow = "0 4px 18px #00b89433, 0 2px 8px #0008";
            card.innerHTML = `
                <button class="card-more-btn" id="${uniqueIdAnime10}" aria-label="Plus d'options" style="
                    position: absolute;
                    top: 12px;
                    right: 14px;
                    width: 32px;
                    height: 32px;
                    background: #f8f9fa;
                    border: 1.5px solid #00b894;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px #0002;
                    color: #444;
                    font-size: 1.3rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 10;
                    transition: border-color 0.18s, background 0.18s;
                    outline: none;
                    padding: 0;
                ">&#8230;</button>
                <div class="card-more-menu" style="
                    display: none;
                    position: absolute;
                    top: 46px;
                    right: 0;
                    background: #fff;
                    color: #00b894;
                    font-size: 1rem;
                    font-weight: bold;
                    border-radius: 8px;
                    box-shadow: 0 4px 16px #0002;
                    padding: 7px 18px;
                    white-space: nowrap;
                    z-index: 20;
                    border: 1.5px solid #00b894;
                    min-width: 110px;
                    text-align: center;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.25s;
                ">
                    <div class="select-top10-btn" style="cursor:pointer;padding:6px 0;pointer-events:auto;color:#00b894;font-weight:bold;font-size:0.9rem;transition:background-color 0.2s;" onmouseover="this.style.backgroundColor='#00b89420'" onmouseout="this.style.backgroundColor='transparent'">${getAddToTop10Label()}</div>
                </div>
                <img src="${image}" alt="${titre}" style="width:140px;height:185px;object-fit:cover;display:block;object-position:center center;margin:0 auto 1rem auto;border-radius:10px;box-shadow:0 2px 12px #00b89455;align-self:center;">
                <a href="${pageHtml}" class="profile-anime-title-link" style="
                    font-size:1.15rem;
                    margin-bottom:0.5rem;
                    color:#00b894;
                    font-weight:700;
                    text-align:center;
                    letter-spacing:0.01em;
                    text-decoration:none;
                    transition:color 0.2s;
                    cursor:pointer;
                    display:block;
                    height:2.8em;
                    overflow:hidden;
                ">${titre}</a>
                <div class="anime-genres" style="
                    display:flex;
                    flex-wrap:wrap;
                    gap:0.3rem 0.5rem;
                    justify-content:center;
                    margin-bottom:0.7rem;
                    min-height:2.5em;
                ">
                    ${genresHtml}
                </div>
                <div class="content-synopsis profile-card-synopsis anime-synopsis" style="
                    color:#b3e6b3;
                    font-size:0.98rem;
                    line-height:1.5;
                    text-align:center;
                    margin-bottom:0.7rem;
                    height:150px;
                    overflow-y:auto;
                    padding-right:5px;
                ">
                    ${truncateSynopsis(synopsis)}
                </div>
            `;
            
            // S'assurer que le lien du titre fonctionne correctement
            const titleLink = card.querySelector('a[href*="anime-details"], a[href*="manga-details"], a[href]');
            if (titleLink) {
                const href = titleLink.getAttribute('href');
                const titre = anime.titre || anime.title || anime.name || "Titre inconnu";
                console.log('🔗 [TITLE LINK] Lien trouvé pour carte:', titre, 'href:', href);
                
                // Forcer le clic sur le lien
                titleLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    const linkHref = this.getAttribute('href');
                    console.log('🖱️ [TITLE CLICK] Clic sur titre:', titre, 'href:', linkHref);
                    
                    if (linkHref && linkHref !== '#') {
                        console.log('✅ [TITLE CLICK] Redirection vers:', linkHref);
                        window.location.href = linkHref;
                    } else {
                        console.warn('⚠️ [TITLE CLICK] Lien invalide ou vide:', linkHref);
                    }
                    return false;
                }, true); // Utiliser capture phase pour s'exécuter en premier
                
                // S'assurer que le lien est cliquable
                titleLink.style.position = 'relative';
                titleLink.style.zIndex = '100';
                titleLink.style.pointerEvents = 'auto';
                titleLink.style.cursor = 'pointer';
            } else {
                const titre = anime.titre || anime.title || anime.name || "Titre inconnu";
                console.warn('⚠️ [TITLE LINK] Aucun lien trouvé pour carte:', titre);
            }
            
            cardsDiv.appendChild(card);
        });

        // Pagination
        const pagDiv = modalContent.querySelector('#anime10-modal-pagination');
        pagDiv.innerHTML = '';
        if (totalPages > 1) {
            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement('button');
                btn.textContent = i;
                btn.className = 'star-page-btn' + (i === page ? ' active' : '');
                btn.style.margin = '0 2px';
                btn.onclick = () => {
                    renderModalPage(i);
                };
                pagDiv.appendChild(btn);
            }
        }

        // Fermer la modal
        modalContent.querySelector('#close-anime10-modal').onclick = () => {
            modal.remove();
        };
    }

    renderModalPage(currentPage);
}

// Ajoute la gestion du top 10 personnalisé (drag & drop sur les catalogue cards)
function getUserTop10Key(user, genre = null, type = null) {
    let key = 'user_top10_' + user.email;
    
    // IMPORTANT: L'ordre est type puis genre pour être cohérent avec l'ancienne logique
    if (type && typeof type === 'string' && type.trim() !== '') {
        key += '_' + type.toLowerCase();
    }
    
    if (genre && typeof genre === 'string' && genre.trim() !== '') {
        // Nettoyer la clé de genre : remplacer espaces et virgules par des underscores
        key += '_' + genre.toLowerCase().replace(/\s+/g, '_').replace(/,/g, '_');
    }

    // Ne plus logger pour éviter les logs infinis
    return key;
}

async function getUserTop10(user, genre = null, type = null) {
    const finalType = type || 'anime';
    
    // IMPORTANT: Si un genre est spécifié, charger depuis localStorage d'abord
    // car les Top 10 par genre sont stockés dans localStorage, pas dans Firebase
    if (genre && typeof genre === 'string' && genre.trim() !== '') {
        const top10Key = getUserTop10Key(user, genre, finalType);
        try {
            const stored = localStorage.getItem(top10Key);
            if (stored) {
                const top10 = JSON.parse(stored);
                // S'assurer que c'est un tableau de 10 éléments
                while (top10.length < 10) {
                    top10.push(null);
                }
                console.log(`📊 Top 10 chargé depuis localStorage pour genre: ${genre}, type: ${finalType}, utilisateur: ${user.email}`);
                return top10.slice(0, 10);
            } else {
                // Si aucun Top 10 spécifique n'existe pour ce genre dans localStorage,
                // vérifier si on est sur la page publique (user-profile) et essayer Firebase
                // car les Top 10 peuvent être synchronisés différemment
                console.log(`📊 Aucun Top 10 trouvé dans localStorage pour genre: ${genre}, type: ${finalType}, utilisateur: ${user.email}`);
                
                // Si Firebase est disponible, essayer de charger depuis Firebase
                // et filtrer par genre en vérifiant les genres des contenus
                if (typeof window.firebaseTop10Service !== 'undefined' && window.firebaseTop10Service) {
                    try {
                        const top10Data = await window.firebaseTop10Service.getTop10(user.email);
                        const genreArray = genre.split(',').map(g => g.trim().toLowerCase());
                        
                        // Filtrer par type et par genre
                        const filteredTop10 = new Array(10).fill(null);
                        for (const item of top10Data) {
                            if ((!type || item.contentType === type)) {
                                // Vérifier si le contenu a au moins un des genres sélectionnés
                                const itemGenres = (item.genres || []).map(g => {
                                    if (typeof g === 'object' && g !== null && g.name) {
                                        return String(g.name).toLowerCase().trim();
                                    }
                                    return String(g).toLowerCase().trim();
                                });
                                
                                const hasMatchingGenre = genreArray.some(selectedGenre => {
                                    return itemGenres.some(itemGenre => {
                                        return itemGenre === selectedGenre || 
                                               itemGenre.includes(selectedGenre) || 
                                               selectedGenre.includes(itemGenre);
                                    });
                                });
                                
                                if (hasMatchingGenre) {
                                    const rang = item.rang || 1;
                                    if (rang >= 1 && rang <= 10) {
                                        filteredTop10[rang - 1] = {
                                            id: item.id,
                                            titre: item.titre,
                                            title: item.titre,
                                            name: item.titre,
                                            contentType: item.contentType,
                                            image: item.image,
                                            synopsis: item.synopsis,
                                            genres: item.genres || [],
                                            score: item.score || 0
                                        };
                                    }
                                }
                            }
                        }
                        
                        // Vérifier si on a trouvé des éléments
                        const hasItems = filteredTop10.some(item => item !== null);
                        if (hasItems) {
                            console.log(`📊 Top 10 chargé depuis Firebase (filtré par genre) pour genre: ${genre}, type: ${finalType}`);
                            return filteredTop10;
                        }
                    } catch (err) {
                        console.error('❌ Erreur lors du chargement du top 10 depuis Firebase:', err);
                    }
                }
                
                // Si aucun Top 10 spécifique n'existe, retourner un tableau vide
                return new Array(10).fill(null);
            }
        } catch (err) {
            console.error('❌ Erreur lors du chargement du top 10 depuis localStorage:', err);
            return new Array(10).fill(null);
        }
    }
    
    // Si aucun genre n'est spécifié, charger depuis Firebase (Top 10 global)
    if (typeof window.firebaseTop10Service !== 'undefined' && window.firebaseTop10Service) {
        try {
            const top10Data = await window.firebaseTop10Service.getTop10(user.email);
            // Convertir en tableau de 10 éléments avec null pour les emplacements vides
            const top10 = new Array(10).fill(null);
            for (const item of top10Data) {
                // Filtrer par type si spécifié
                if (!type || item.contentType === type) {
                    const rang = item.rang || 1;
                    if (rang >= 1 && rang <= 10) {
                        top10[rang - 1] = {
                            id: item.id,
                            titre: item.titre,
                            title: item.titre,
                            name: item.titre,
                            contentType: item.contentType,
                            image: item.image,
                            synopsis: item.synopsis,
                            genres: item.genres || [],
                            score: item.score || 0
                        };
                    }
                }
            }
            return top10;
        } catch (err) {
            console.error('❌ Erreur lors du chargement du top 10 depuis Firebase:', err);
        }
    }
    
    // Fallback vers localStorage si Firebase n'est pas disponible (pour Top 10 global)
    const top10Key = getUserTop10Key(user, null, finalType);
    try {
        const stored = localStorage.getItem(top10Key);
        if (stored) {
            const top10 = JSON.parse(stored);
            // S'assurer que c'est un tableau de 10 éléments
            while (top10.length < 10) {
                top10.push(null);
            }
            return top10.slice(0, 10);
        }
    } catch (err) {
        console.error('❌ Erreur lors du chargement du top 10 depuis localStorage:', err);
    }
    // Fallback vers tableau vide si rien n'est trouvé
    return new Array(10).fill(null);
}

async function setUserTop10(user, top10, genre = null, type = null) {
    // S'assurer que top10 est un tableau de 10 éléments
    const cleanTop10 = [];
    for (let i = 0; i < 10; i++) {
        cleanTop10[i] = top10[i] || null;
    }
    
    // S'assurer qu'il y a toujours exactement 10 éléments
    while (cleanTop10.length < 10) {
        cleanTop10.push(null);
    }
    
    const finalType = type || 'anime';
    
    // Top 10 par genre : Firebase ne gère pas les clés par genre, donc toujours utiliser localStorage
    // (sinon on écraserait le Top 10 global au lieu d'enregistrer le Top 10 du genre)
    if (genre && typeof genre === 'string' && genre.trim() !== '') {
        const top10Key = getUserTop10Key(user, genre, finalType);
        try {
            localStorage.setItem(top10Key, JSON.stringify(cleanTop10));
            console.log('✅ Top 10 (genre) sauvegardé dans localStorage, genre:', genre, 'type:', finalType);
        } catch (err) {
            console.error('❌ Erreur lors de la sauvegarde localStorage (genre):', err);
            throw err;
        }
    } else if (typeof window.firebaseTop10Service !== 'undefined' && window.firebaseTop10Service) {
        // Top 10 global : Firebase
        try {
            const existingTop10 = await window.firebaseTop10Service.getTop10(user.email);
            for (const item of existingTop10) {
                const itemType = item.contentType || 'anime';
                if (itemType === finalType) {
                    await window.firebaseTop10Service.deleteTop10Item(user.email, item.id, itemType);
                }
            }
            for (let i = 0; i < cleanTop10.length; i++) {
                if (cleanTop10[i]) {
                    const itemContentType = cleanTop10[i].contentType || finalType;
                    await window.firebaseTop10Service.saveTop10Item(user.email, {
                        id: cleanTop10[i].id,
                        contentType: itemContentType,
                        rang: i + 1,
                        titre: cleanTop10[i].titre || cleanTop10[i].title || cleanTop10[i].name,
                        image: cleanTop10[i].image,
                        synopsis: cleanTop10[i].synopsis,
                        genres: cleanTop10[i].genres || [],
                        score: cleanTop10[i].score || 0
                    });
                }
            }
            console.log('✅ Top 10 global sauvegardé dans Firebase pour type:', finalType);
        } catch (err) {
            console.error('❌ Erreur lors de la sauvegarde Firebase:', err);
            throw err;
        }
    } else {
        // Top 10 global, fallback localStorage
        const top10Key = getUserTop10Key(user, null, finalType);
        try {
            localStorage.setItem(top10Key, JSON.stringify(cleanTop10));
            console.log('✅ Top 10 sauvegardé dans localStorage pour type:', finalType);
        } catch (err) {
            console.error('❌ Erreur lors de la sauvegarde localStorage:', err);
            throw err;
        }
    }
    
    // Déclencher un événement personnalisé pour notifier les mises à jour
    // Mais seulement si renderTop10Slots n'est pas déjà en cours pour éviter les boucles infinies
    if (!isRenderingTop10) {
        const event = new CustomEvent('top10Updated', { 
            detail: { 
                genre: genre,
                type: type,
                top10: cleanTop10 
            } 
        });
        document.dispatchEvent(event);
    }
    
    return cleanTop10;
}

// Fonction simplifiée pour nettoyer les Top 10 des cartes qui n'ont plus de notes
async function cleanTop10FromRemovedNotes() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) return;
    
    console.log('Nettoyage du top 10 des notes supprimées...');
    
    // Charger les notes depuis Firebase en priorité, sinon localStorage
    let notes = [];
    if (typeof window.loadUserNotes === 'function') {
        try {
            notes = await window.loadUserNotes(user.email);
        } catch (e) {
            console.error('Erreur lors du chargement des notes depuis Firebase:', e);
            // Fallback vers localStorage
            const notesKey = 'user_content_notes_' + user.email;
            notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
        }
    } else {
        const notesKey = 'user_content_notes_' + user.email;
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    }
    
    // Nettoyer le top 10 pour chaque type
    const types = ['anime', 'manga', 'doujin'];
    const genres = [null, 'Action', 'Comédie', 'Drame', 'Fantasy', 'Horreur', 'Mystère', 'Romance', 'Sci-Fi', 'Slice of Life', 'Thriller'];
    
    for (const type of types) {
        for (const genre of genres) {
            let top10 = getUserTop10(user, genre, type) || [];
            let hasChanges = false;
            
            // Vérifier chaque élément du top 10
            for (let i = 0; i < top10.length; i++) {
                if (top10[i]) {
                    const animeId = top10[i].id;
                    const itemContentType = top10[i].contentType || type || 'anime';
                    
                    // Vérifier si une note existe avec le même ID ET le même contentType
                    const noteExists = notes.some(note => 
                        String(note.id) === String(animeId) && 
                        note.contentType === itemContentType
                    );
                    
                    if (!noteExists) {
                        console.log(`Suppression de ${top10[i].titre || top10[i].title || top10[i].name || animeId} (${itemContentType}) du top 10 (type: ${type}, genre: ${genre})`);
                        top10[i] = null;
                        hasChanges = true;
                    }
                }
            }
            
            // Sauvegarder si des changements ont été faits
            if (hasChanges) {
                setUserTop10(user, top10, genre, type);
            }
        }
    }
    
    console.log('Nettoyage du top 10 terminé');
}



// Affiche le top 10 dans les slots catalogue cards
// Protection contre les appels multiples
let isRenderingTop10 = false;
let lastRenderTime = 0;

async function renderTop10Slots() {
    // Protection contre les appels multiples (debounce)
    const now = Date.now();
    if (isRenderingTop10) {
        return; // Ignorer silencieusement pour éviter les logs infinis
    }
    if (now - lastRenderTime < 150) { // Réduit à 150ms pour affichage plus réactif
        return; // Ignorer silencieusement pour éviter les logs infinis
    }
    
    isRenderingTop10 = true;
    lastRenderTime = now;
    
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        isRenderingTop10 = false;
        return;
    }
    // On prend les genres sélectionnés s'ils existent (sous forme de clé composite)
    const genres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
    const genre = genres.length > 0 ? genres.sort().join(',') : null;
    // On prend le type sélectionné s'il existe
    const type = window.selectedType || null;
    
    // Si le type sélectionné est 'tous', récupérer tous les top 10 et les combiner
    let top10 = [];
    if (type === 'tous') {
        const types = ['anime', 'manga', 'doujin', 'manhwa', 'manhua', 'film'];
        for (const t of types) {
            const typeTop10 = await getUserTop10(user, genre, t) || [];
            top10 = top10.concat(typeTop10.filter(item => item !== null));
        }
        // Limiter à 10 éléments maximum
        top10 = top10.slice(0, 10);
    } else if (type === 'manga') {
        // Si le type est "manga", récupérer aussi les top 10 des genres "type" (doujin, manhwa, manhua)
        // qui sont des genres du manga
        const mangaTypes = ['manga', 'doujin', 'manhwa', 'manhua'];
        // Vérifier si un genre "type" est sélectionné
        const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
        const hasTypeGenre = genres.some(g => typeGenres.includes(g));
        
        if (hasTypeGenre) {
            // Si un genre "type" est sélectionné, récupérer uniquement ce type spécifique
            // Déterminer quel type utiliser selon le genre sélectionné
            let specificType = 'manga';
            if (genres.includes('Doujin')) {
                specificType = 'doujin';
            } else if (genres.includes('Manhwa')) {
                specificType = 'manhwa';
            } else if (genres.includes('Manhua')) {
                specificType = 'manhua';
            }
            top10 = await getUserTop10(user, genre, specificType) || [];
        } else {
            // Sinon, récupérer uniquement le top 10 global manga (pas de combinaison avec doujin/manhwa/manhua)
            // car ils ont leurs propres top 10 séparés et distincts
            top10 = await getUserTop10(user, genre, 'manga') || [];
        }
    } else {
        // Récupérer le top 10 pour le type spécifique
        top10 = await getUserTop10(user, genre, type) || [];
    }
    
    // S'assurer que top10 est un tableau de 10 éléments
    while (top10.length < 10) {
        top10.push(null);
    }
    
    // Logs réduits pour éviter les logs infinis
    
    // Récupérer les notes de l'utilisateur depuis Firebase
    let allNotes = await loadUserNotes(user.email);
    
    // Déterminer le type réel pour le filtrage des notes
    // Si un genre "type" est sélectionné (Doujin, Manhwa, Manhua), utiliser ce type pour le filtrage
    let filterType = type;
    if (type === 'manga') {
        const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
        if (genres.some(g => typeGenres.includes(g))) {
            if (genres.includes('Doujin')) {
                filterType = 'doujin';
            } else if (genres.includes('Manhwa')) {
                filterType = 'manhwa';
            } else if (genres.includes('Manhua')) {
                filterType = 'manhua';
            }
        }
    }
    
    if (filterType === 'manga') {
        // Pour le type manga, exclure les doujins
        notes = allNotes.filter(note => {
            if (note.contentType === 'doujin') return false;
            if (note.contentType === 'manga') return true;
            // Pour les anciennes notes sans contentType, vérifier le titre
            const title = (note.titre || note.title || '').toLowerCase();
            const genres = (note.genres || []).join(' ').toLowerCase();
            return !title.includes('doujin') && 
                   !title.includes('totally captivated') && 
                   !title.includes('hentai') &&
                   !genres.includes('erotica') &&
                   !genres.includes('adult');
        });
        console.log('Type manga: notes filtrées:', notes.length);
    } else if (filterType === 'doujin') {
        // Pour le type doujin, inclure les notes avec contentType 'doujin' ET les mangas détectés comme doujins
        notes = allNotes.filter(note => {
            if (note.contentType === 'doujin') return true;
            
            // Détecter les doujins basé sur le titre même si contentType est 'manga'
            const title = (note.titre || note.title || note.name || '').toLowerCase();
            const genres = (note.genres || []).join(' ').toLowerCase();
            
            return title.includes('totally captivated') || 
                   title.includes('doujin') ||
                   genres.includes('erotica') ||
                   genres.includes('adult');
        });
        
    } else if (type === 'roman') {
        // Pour le type roman, inclure les notes avec contentType 'roman' ET les contenus détectés comme romans
        notes = allNotes.filter(note => {
            if (note.contentType === 'roman') return true;
            
            // Détecter les romans basé sur le titre même si contentType est différent
            const title = (note.titre || note.title || note.name || '').toLowerCase();
            const noteId = note.id ? note.id.toString() : '';
            
            return title.includes('roman') || 
                   title.includes('novel') ||
                   noteId.includes('roman');
        });
        
        console.log('Type roman: notes filtrées:', notes.length);
    } else if (filterType === 'manhwa') {
        // Pour le type manhwa, inclure les notes avec contentType 'manhwa' ET les contenus détectés comme manhwa
        notes = allNotes.filter(note => {
            if (note.contentType === 'manhwa') return true;
            
            // Détecter les manhwa basé sur le titre même si contentType est différent
            const title = (note.titre || note.title || note.name || '').toLowerCase();
            const noteId = note.id ? note.id.toString() : '';
            
            return title.includes('manhwa') || 
                   title.includes('on the way to meet mom') ||
                   title.includes('solo leveling') ||
                   title.includes('tower of god') ||
                   title.includes('noblesse') ||
                   title.includes('the beginning after the end') ||
                   noteId.includes('manhwa');
        });
        
        console.log('Type manhwa: notes filtrées:', notes.length);
    } else if (filterType === 'manhua') {
        // Pour le type manhua, inclure les notes avec contentType 'manhua' ET les contenus détectés comme manhua
        notes = allNotes.filter(note => {
            if (note.contentType === 'manhua') return true;
            
            // Détecter les manhua basé sur le titre même si contentType est différent
            const title = (note.titre || note.title || note.name || '').toLowerCase();
            const noteId = note.id ? note.id.toString() : '';
            
            return title.includes('manhua') || 
                   noteId.includes('manhua');
        });
        
        console.log('Type manhua: notes filtrées:', notes.length);
        
    } else if (type === 'film') {
        // Pour le type film, inclure les notes avec contentType 'film' ET les contenus détectés comme films
        notes = allNotes.filter(note => {
            if (note.contentType === 'film') return true;
            
            // Détecter les films basé sur le titre même si contentType est différent
            const title = (note.titre || note.title || note.name || '').toLowerCase();
            const noteId = note.id ? note.id.toString() : '';
            
            return title.includes('film') || 
                   title.includes('movie') ||
                   noteId.includes('film');
        });
        
        console.log('Type film: notes filtrées:', notes.length);
        
    } else {
        // Pour le type anime par défaut
        notes = allNotes.filter(note => {
            if (note.contentType === 'anime') return true;
            
            // Pour les anciennes notes sans contentType, considérer comme anime par défaut
            // sauf si c'est explicitement un autre type
            const title = (note.titre || note.title || note.name || '').toLowerCase();
            const genres = (note.genres || []).join(' ').toLowerCase();
            
            // Exclure les autres types
            return !title.includes('doujin') && 
                   !title.includes('totally captivated') && 
                   !title.includes('hentai') &&
                   !title.includes('manhwa') &&
                   !title.includes('manhua') &&
                   !title.includes('roman') &&
                   !title.includes('novel') &&
                   !title.includes('film') &&
                   !title.includes('movie') &&
                   !genres.includes('erotica') &&
                   !genres.includes('adult');
        });
        
        console.log('Type anime: notes filtrées:', notes.length);
    }
    
    console.log('Type sélectionné:', type);
    console.log('Notes trouvées:', notes.length);
    
    // Nettoyer le top 10 pour ne garder que les éléments qui correspondent aux notes filtrées
    // MAIS PRÉSERVER LES POSITIONS en utilisant map au lieu de filter
    // Si un élément n'est pas trouvé dans les notes filtrées, chercher dans toutes les notes avant de le supprimer
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    
    // NE PLUS NETTOYER LE TOP 10 ICI - Laisser tous les éléments du top 10 s'afficher
    // Le nettoyage doit être fait uniquement quand l'utilisateur supprime une note explicitement
    // Cela permet de garder les cartes visibles même si les notes ne sont pas encore chargées
    const cleanedTop10 = top10.map((item, index) => {
        if (!item || !item.id) {
            return null;
        }
        // Garder tous les éléments qui ont un ID valide, même s'ils ne sont pas encore dans les notes
        // Cela permet d'afficher les cartes même si le chargement des notes est en retard
        return item;
    });
    
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    
    // S'assurer qu'il y a toujours 10 éléments
    while (cleanedTop10.length < 10) {
        cleanedTop10.push(null);
    }
    
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    
    // Sauvegarder le top 10 nettoyé si il y a eu des changements
    // SUPPRIMÉ: setUserTop10(user, cleanedTop10.slice(0, 10), genre, type);
    // pour éviter la boucle infinie avec displayUserAnimeNotes
    
    // Utiliser le top 10 nettoyé (avec positions préservées)
    top10 = cleanedTop10;
    
    // Créer ou récupérer le conteneur du Top 10
    const reviewsSection = document.getElementById('reviews-section');
    if (!reviewsSection) return;
    
    let top10Container = reviewsSection.querySelector('.card-list');
    if (!top10Container) {
        top10Container = document.createElement('div');
        top10Container.className = 'card-list';
        top10Container.style.cssText = `
            display: grid;
            grid-template-columns: repeat(5, 175px);
            grid-template-rows: repeat(2, auto);
            gap: 1.5rem;
            margin: 1.5rem auto 0 auto;
            justify-content: center;
            justify-items: center;
            min-height: 400px;
            align-content: flex-start;
            width: fit-content;
            max-width: calc(100% - 3rem);
            overflow: visible;
            padding: 0 1.5rem;
            box-sizing: border-box;
        `;
        
        // Ajuster pour les petits écrans
        if (window.innerWidth < 1200) {
            top10Container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(175px, 1fr))';
            top10Container.style.maxWidth = '100%';
        }
        reviewsSection.appendChild(top10Container);
    }
    
    // Vider le conteneur
    top10Container.innerHTML = '';
    
    // S'assurer que le container est bien centré
    top10Container.style.margin = '1.5rem auto 0 auto';
    top10Container.style.display = 'grid';
    top10Container.style.gridTemplateColumns = 'repeat(5, 175px)';
    top10Container.style.gridTemplateRows = 'repeat(2, auto)';
    top10Container.style.gap = '1.5rem';
    top10Container.style.justifyContent = 'center';
    top10Container.style.justifyItems = 'center';
    top10Container.style.width = 'fit-content';
    top10Container.style.maxWidth = 'calc(100% - 3rem)';
    top10Container.style.padding = '0 1.5rem';
    top10Container.style.boxSizing = 'border-box';
    
    // Ajuster pour les petits écrans
    if (window.innerWidth < 1200) {
        top10Container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(175px, 1fr))';
        top10Container.style.maxWidth = '100%';
    }
    
    for (let i = 0; i < 10; i++) {
        // Créer le slot s'il n'existe pas
        let slot = document.getElementById(`catalogue-card-${i}`);
        if (slot) {
            // S'assurer que le slot a l'attribut data-slot-index
            if (!slot.getAttribute('data-slot-index')) {
                slot.setAttribute('data-slot-index', i);
            }
        }
        if (!slot) {
            slot = document.createElement('div');
            slot.id = `catalogue-card-${i}`;
            slot.className = 'catalogue-card';
            slot.setAttribute('data-slot-index', i);
                    slot.style.cssText = `
            flex: 0 0 170px;
            width: 170px;
            max-width: 170px;
            min-width: 170px;
            box-sizing: border-box;
            margin: 0;
            position: relative;
            background: #2a2d36;
            border-radius: 12px;
            padding: 1rem;
            border: 2px solid #00b894;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            overflow: hidden;
        `;
            top10Container.appendChild(slot);
            
            // Attendre que le slot soit dans le DOM avant de continuer
            setTimeout(() => {
                // Le slot est maintenant dans le DOM, on peut continuer
            }, 0);
            
            // Configurer les événements drop pour ce slot
            slot.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                this.style.border = '2px dashed #00b894';
            });
            
            slot.addEventListener('dragleave', function(e) {
                this.style.border = '2px solid #00b894';
            });
            
            slot.addEventListener('drop', async function(e) {
                e.preventDefault();
                this.style.border = '2px solid #00b894';
                
                try {
                    // Vérifier qu'une carte est sélectionnée via le menu des trois points
                    if (!window.selectedTop10Card) {
                        // Afficher un message d'instruction
                        const helpMsg = document.createElement('div');
                        helpMsg.id = 'drag-help-msg';
                        helpMsg.textContent = 'Veuillez d\'abord cliquer sur les trois points puis sur "Ajouter au top 10" avant de déplacer une carte.';
                        helpMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#ff6b6b;color:#fff;padding:12px 28px;border-radius:12px;font-size:1.15rem;z-index:9999;box-shadow:0 2px 12px #ff6b6b77;';
                        document.body.appendChild(helpMsg);
                        setTimeout(() => { helpMsg.remove(); }, 3000);
                        return;
                    }
                    
                    // Récupérer les données de la carte sélectionnée
                    const animeId = window.selectedTop10Card.getAttribute('data-anime-id');
                    const isManga = window.selectedTop10Card.getAttribute('data-is-manga') === 'true';
                    
                    // Récupérer l'utilisateur actuel
                    const user = JSON.parse(localStorage.getItem('user') || 'null');
                    if (!user || !user.email) return;
                    
                    // Récupérer le top 10 actuel
                    const genres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
                    const genre = genres.length > 0 ? genres.sort().join(',') : null;
                    let top10 = getUserTop10(user, genre, window.selectedType);
                    
                    // Récupérer les notes de l'utilisateur depuis Firebase
                    let notes = await loadUserNotes(user.email);
                    
                    // Trouver l'anime dans les notes
                    let anime = notes.find(a => String(a.id) === String(animeId));
                    
                    // Si l'anime n'est pas trouvé dans les notes, le créer avec les données de base
                    if (!anime) {
                        
                        // Données spécifiques pour le doujin "Totally Captivated"
                        let animeData = {
                            id: animeId,
                            titre: 'Titre inconnu',
                            title: 'Titre inconnu',
                            contentType: window.selectedType,
                            note: 8, // Note par défaut
                            addedAt: Date.now()
                        };
                        
                        // Si c'est le doujin "Totally Captivated", utiliser les vraies données
                        if (animeId === 19749 || animeId === '19749') {
                            animeData = {
                                id: animeId,
                                titre: 'Totally Captivated: The Last Episode',
                                title: 'Totally Captivated: The Last Episode',
                                name: 'Totally Captivated: The Last Episode',
                                contentType: 'doujin',
                                note: 8,
                                addedAt: Date.now(),
                                image: 'https://example.com/doujin-image.jpg', // Remplacez par la vraie URL
                                synopsis: 'Un doujin populaire',
                                genres: ['Romance', 'Drama']
                            };
                        }
                        
                        anime = animeData;
                        
                        // Ajouter aux notes localement
                        notes.push(anime);
                        
                        // Sauvegarder dans Firebase
                        if (typeof window.firebaseNotesService !== 'undefined' && window.firebaseNotesService) {
                            try {
                                const noteToSave = {
                                    id: anime.id,
                                    note: anime.note || 0,
                                    contentType: anime.contentType,
                                    titre: anime.titre,
                                    image: anime.image || '',
                                    synopsis: anime.synopsis || '',
                                    genres: anime.genres || [],
                                    score: 0
                                };
                                await window.firebaseNotesService.saveNote(user.email, noteToSave);
                            } catch (err) {
                            }
                        }
                        
                    }
                    
                    if (window.selectedType === 'doujin' && anime.titre && anime.titre.toLowerCase().includes('totally')) {
                    }
                    
                    // S'assurer que top10 est un tableau de 10 éléments
                    if (!Array.isArray(top10) || top10.length < 10) {
                        top10 = Array(10).fill(null);
                    }
                    
                    // Vérifier si l'anime est déjà dans le top 10
                    const existingIndex = top10.findIndex(item => item && String(item.id) === String(animeId));
                    
                    // Vérifier s'il y a déjà une carte à la position cible
                    const replacedAnime = top10[i];
                    
                    // Si l'anime est déjà dans le top 10 ET qu'il y a une carte à la position cible
                    // Faire un échange des positions
                    if (existingIndex !== -1 && replacedAnime && existingIndex !== i) {
                        // Échange : mettre la carte cible à l'ancienne position de la carte déplacée
                        top10[existingIndex] = replacedAnime;
                        // Mettre la carte déplacée à la position cible
                        top10[i] = anime;
                    } else {
                        // Comportement normal : si l'anime est déjà dans le top 10, le retirer de sa position actuelle
                        if (existingIndex !== -1) {
                            top10[existingIndex] = null;
                        }
                        
                        // Mettre à jour le top 10 à la position cible
                        top10[i] = anime;
                    }
                    
                    // Nettoyer les entrées vides (au cas où)
                    top10 = top10.map(item => item || null);
                    
                    
                    // Sauvegarder le top 10 mis à jour
                    setUserTop10(user, top10, genre, window.selectedType);
                    
                    // Ne pas appeler renderTop10Slots directement - l'événement top10Updated sera déclenché par setUserTop10
                    setTimeout(() => {
                        if (!isDisplayingNotes) {
                            displayUserAnimeNotes();
                        }
                        // Rafraîchir tous les boutons "..." pour que les cartes remplacées retrouvent leur bouton
                        // Ne pas appeler refreshAllCardMoreButtons pour éviter les boucles infinies
                        // refreshAllCardMoreButtons();
                    }, 100);
                    
                    // Réinitialiser la sélection
                    if (window.selectedTop10Card) {
                        setAnimeCardSelection(window.selectedTop10Card, false);
                        window.selectedTop10Card = null;
                    }
                    
                    // Afficher un message de confirmation
                    const helpMsg = document.createElement('div');
                    helpMsg.id = 'drag-help-msg';
                    helpMsg.textContent = 'Carte ajoutée au top 10 avec succès !';
                    helpMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#00b894;color:#fff;padding:12px 28px;border-radius:12px;font-size:1.15rem;z-index:9999;box-shadow:0 2px 12px #00b89477;';
                    document.body.appendChild(helpMsg);
                    setTimeout(() => { helpMsg.remove(); }, 2500);
                    
                } catch (error) {
                    console.error('Erreur lors de l\'ajout au top 10:', error);
                }
            });
        }
        slot.innerHTML = '';
        const anime = top10[i];
        
        if (anime) {
            // Vérifier si cet élément correspond aux notes filtrées
            const matchingNote = notes.find(note => String(note.id) === String(anime.id));
            if (!matchingNote) {
                // Rechercher dans toutes les notes
                const allNotesCheck = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
                const matchInAllNotes = allNotesCheck.find(note => String(note.id) === String(anime.id));
            }
        } else {
            // Slot vide
        }
        
        // Récupérer les données complètes depuis le localStorage si l'anime existe
        let completeAnimeData = anime;
        if (anime && anime.id) {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            if (user && user.email) {
                try {
                    const notes = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
                    
                    // CORRECTION SPÉCIALE POUR LE DOUJIN "TOTALLY CAPTIVATED"
                    if (filterType === 'doujin' && (anime.id === 19749 || anime.id === '19749')) {
                        completeAnimeData = {
                            id: anime.id,
                            titre: 'Totally Captivated: The Last Episode',
                            title: 'Totally Captivated: The Last Episode',
                            name: 'Totally Captivated: The Last Episode',
                            contentType: 'doujin',
                            note: anime.note || 8,
                            addedAt: anime.addedAt || Date.now(),
                            image: anime.image || 'https://example.com/doujin-image.jpg',
                            synopsis: 'Un doujin populaire',
                            genres: ['Romance', 'Drama']
                        };
                    } else if (filterType === 'manga' && (anime.id === 1 || anime.id === '1')) {
                        // CORRECTION SPÉCIALE POUR LE MANGA "MONSTER"
                        completeAnimeData = {
                            id: anime.id,
                            titre: 'Monster',
                            title: 'Monster',
                            name: 'Monster',
                            contentType: 'manga',
                            note: anime.note || 9,
                            addedAt: anime.addedAt || Date.now(),
                            image: anime.image || 'https://cdn.myanimelist.net/images/manga/2/54453.jpg',
                            synopsis: 'Un brillant neurochirurgien doit faire face aux conséquences de ses actes.',
                            genres: ['Drama', 'Mystery', 'Psychological', 'Seinen']
                        };
                    } else {
                        // Filtrer par type de contenu pour éviter la confusion entre manga et doujin
                        // Utiliser filterType au lieu de type pour avoir le bon type selon le contexte
                        let filteredNotes = notes;
                        if (filterType === 'manga') {
                            // Pour le type manga, exclure les doujins
                            filteredNotes = notes.filter(note => {
                                if (note.contentType === 'doujin') return false;
                                if (note.contentType === 'manga') return true;
                                // Pour les anciennes notes sans contentType, vérifier le titre
                                const title = (note.titre || note.title || '').toLowerCase();
                                const genres = (note.genres || []).join(' ').toLowerCase();
                                return !title.includes('doujin') && 
                                       !title.includes('totally captivated') && 
                                       !title.includes('hentai') &&
                                       !genres.includes('erotica') &&
                                       !genres.includes('adult');
                            });
                        } else if (filterType === 'doujin') {
                            // Pour le type doujin, inclure les notes avec contentType 'doujin' ET les mangas détectés comme doujins
                            filteredNotes = notes.filter(note => {
                                if (note.contentType === 'doujin') return true;
                                
                                // Détecter les doujins basé sur le titre même si contentType est 'manga'
                                const title = (note.titre || note.title || note.name || '').toLowerCase();
                                const genres = (note.genres || []).join(' ').toLowerCase();
                                
                                return title.includes('totally captivated') || 
                                       title.includes('doujin') ||
                                       genres.includes('erotica') ||
                                       genres.includes('adult');
                            });
                        } else if (filterType === 'anime') {
                            // Pour le type anime, exclure les mangas et doujins
                            filteredNotes = notes.filter(note => note.contentType === 'anime');
                        } else if (filterType === 'manhwa') {
                            // Pour le type manhwa
                            filteredNotes = notes.filter(note => {
                                if (note.contentType === 'manhwa') return true;
                                const title = (note.titre || note.title || note.name || '').toLowerCase();
                                const noteId = note.id ? note.id.toString() : '';
                                return title.includes('manhwa') || 
                                       title.includes('on the way to meet mom') ||
                                       title.includes('solo leveling') ||
                                       title.includes('tower of god') ||
                                       title.includes('noblesse') ||
                                       title.includes('the beginning after the end') ||
                                       noteId.includes('manhwa');
                            });
                        } else if (filterType === 'manhua') {
                            // Pour le type manhua
                            filteredNotes = notes.filter(note => {
                                if (note.contentType === 'manhua') return true;
                                const title = (note.titre || note.title || note.name || '').toLowerCase();
                                const noteId = note.id ? note.id.toString() : '';
                                return title.includes('manhua') || 
                                       noteId.includes('manhua');
                            });
                        }
                        
                        // Rechercher d'abord dans les notes filtrées
                        
                        let completeData = filteredNotes.find(n => String(n.id) === String(anime.id));
                        
                        if (!completeData) {
                            // Si pas trouvé, rechercher dans toutes les notes
                            completeData = notes.find(n => String(n.id) === String(anime.id));
                        }
                        
                        if (completeData) {
                            completeAnimeData = completeData;
                        } else {
                            // Si les données de base n'ont pas de titre, essayer de le récupérer depuis la carte originale
                            if (!anime.titre && !anime.title && !anime.name) {
                                // Le titre sera géré dans l'affichage avec un fallback
                            }
                        }
                    }
                } catch (e) {
                    console.error('Erreur lors de la récupération des données complètes:', e);
                }
            }
        }
        // Badge ou médaille (position)
        const badge = document.createElement('div');
        badge.className = 'catalogue-position';
        badge.style.cssText = `
            position: relative;
            margin-bottom: 0.8rem;
            z-index: 2;
            text-align: center;
            width: 100%;
        `;
        if (i < 3) {
            const medals = {
                0: { emoji: '🥇', color: '#00b894' },
                1: { emoji: '🥈', color: '#00b894' },
                2: { emoji: '🥉', color: '#00b894' }
            };
            badge.innerHTML = `<div style="font-size: 2rem; margin-bottom: 0.2rem;">${medals[i].emoji}</div>`;
        } else {
            badge.innerHTML = `<div style="font-size: 1.4rem; color: #00b894; font-weight: bold;">${i+1}/10</div>`;
        }
        slot.appendChild(badge);
        if (completeAnimeData) {
            
            // Affiche l'anime dans le slot
            const img = document.createElement('img');
            img.src = completeAnimeData.image || completeAnimeData.img || completeAnimeData.cover || '';
            img.alt = completeAnimeData.titre || completeAnimeData.title || completeAnimeData.name || '';
            img.style.cssText = 'width:110px;height:145px;object-fit:cover;display:block;object-position:center center;margin:0 auto 0.8rem auto;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
            slot.appendChild(img);
            
            const titre = document.createElement('span');
            titre.className = 'anime-title';
            titre.style.cssText = 'color:#00b894;font-size:1.1rem;font-weight:800;text-align:center;margin-top:0.5rem;display:block;max-width:100%;word-wrap:break-word;line-height:1.2;';
            
            // S'assurer qu'on a un titre valide
            // Pour les animes, utiliser le titre de base (sans saison/partie) pour l'affichage
            let animeTitle = completeAnimeData.titre || completeAnimeData.title || completeAnimeData.name;
            if (completeAnimeData.contentType === 'anime' && animeTitle) {
                animeTitle = extractBaseAnimeTitle(animeTitle, 'anime');
            }
            
            // Si aucun titre n'est trouvé, essayer de le récupérer depuis la carte originale
            if (!animeTitle || animeTitle === 'Titre inconnu') {
                // Chercher dans le DOM pour trouver la carte originale
                const originalCard = document.querySelector(`[data-anime-id="${completeAnimeData.id}"]`);
                if (originalCard) {
                    animeTitle = extractTitleFromCard(originalCard);
                }
            }
            
            // Fallback final
            if (!animeTitle) {
                animeTitle = 'Titre inconnu';
            }
            
            titre.textContent = animeTitle;
            
            
            slot.appendChild(titre);
            // Ajoute le bouton ... + menu
            // NOTE: Les boutons dans renderTop10Slots sont TOUJOURS visibles car ils sont pour les cartes DANS le top 10
            // Ces boutons permettent de modifier/retirer les éléments du top 10
            console.log('Création du bouton "..." pour l\'anime:', completeAnimeData.titre);
            const moreBtn = document.createElement('button');
            moreBtn.className = 'card-more-btn';
            moreBtn.setAttribute('aria-label', "Plus d'options");
            moreBtn.setAttribute('data-in-top10', 'true'); // Marquer comme bouton du top 10
            moreBtn.style.cssText = `
                position: absolute;
                top: 12px;
                right: 14px;
                width: 32px;
                height: 32px;
                background: #ffffff;
                border: 2px solid #00b894;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                color: #00b894;
                font-size: 1.5rem;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 100;
                transition: all 0.2s ease;
                outline: none;
                padding: 0;
                opacity: 1;
                visibility: visible;
            `;
            moreBtn.innerHTML = '&#8230;';
            
            // Supprimer complètement les effets de survol pour éviter le clignotement
            // Le bouton reste stable visuellement
            moreBtn.style.background = '#ffffff';
            moreBtn.style.color = '#00b894';
            moreBtn.style.transform = 'scale(1)';
            
            const moreMenu = document.createElement('div');
            moreMenu.className = 'card-more-menu';
            moreMenu.style.cssText = `
                display: none;
                position: absolute;
                top: 42px;
                right: 0;
                background: linear-gradient(135deg, #2a2d36 0%, #1e2128 100%);
                color: #fff;
                font-size: 0.85rem;
                font-weight: 600;
                border-radius: 10px;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 184, 148, 0.2);
                padding: 6px 0;
                white-space: nowrap;
                z-index: 20;
                border: 1.5px solid rgba(0, 184, 148, 0.3);
                min-width: 135px;
                max-width: 140px;
                text-align: left;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.25s ease, transform 0.2s ease;
                visibility: hidden;
                backdrop-filter: blur(10px);
                overflow: hidden;
            `;
            moreMenu.innerHTML = `
                <div class="move-top10-menu-item" style="
                    cursor: pointer;
                    padding: 8px 14px;
                    transition: all 0.2s ease;
                    color: #fff;
                    border-bottom: 1px solid rgba(0, 184, 148, 0.2);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.85rem;
                ">
                    <span style="font-size: 0.95rem;">↕️</span>
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${getTop10MoveLabel()}</span>
                </div>
                <div class="remove-top10-menu-item" style="
                    cursor: pointer;
                    padding: 8px 14px;
                    transition: all 0.2s ease;
                    color: #ff6b6b;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.85rem;
                ">
                    <span style="font-size: 0.95rem;">✕</span>
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${getTop10RemoveLabel()}</span>
                </div>
            `;
            // Ajouter les boutons au slot après qu'il soit dans le DOM
            slot.appendChild(moreBtn);
            slot.appendChild(moreMenu);
            
            // Forcer le recalcul du positionnement après ajout au DOM
            setTimeout(() => {
                moreBtn.style.position = 'absolute';
                moreBtn.style.top = '12px';
                moreBtn.style.right = '14px';
                moreBtn.style.zIndex = '100';
            }, 10);
            
            // Attacher les événements directement sur les éléments existants
            
            // Utiliser un gestionnaire global pour tous les boutons "..." du top 10
            
            // Vérifier que le bouton est bien dans un slot du top 10 avant d'ajouter l'attribut
            // Chercher un élément avec id catalogue-card-X ou .top10-slot
            const isInTop10Slot = (moreBtn.closest('[id^="catalogue-card-"]') !== null) || (moreBtn.closest('.top10-slot') !== null);
            
            if (isInTop10Slot) {
                // Ajouter un attribut data pour identifier le bouton du top 10
                moreBtn.setAttribute('data-top10-button', 'true');
                moreBtn.setAttribute('data-anime-id', completeAnimeData.id);
            }
            
            // Le gestionnaire global sera ajouté une seule fois au niveau du document
            if (!window.top10ButtonHandlerAdded) {
                
                document.addEventListener('click', function(e) {
                    // Ne pas bloquer les clics sur le menu lui-même (pour permettre de cliquer sur "Enlever du top 10")
                    if (e.target.closest('.card-more-menu')) {
                        return; // Laisser le gestionnaire du menu gérer cela
                    }
                    
                    // Vérifier si le clic est sur un bouton "..." du top 10 (peut être un clic sur le bouton ou un de ses enfants)
                    const clickedBtn = e.target.closest('[data-top10-button]');
                    if (!clickedBtn || !clickedBtn.hasAttribute('data-top10-button')) {
                        return; // Ce n'est pas un clic sur un bouton du top 10
                    }
                    
                    e.stopPropagation();
                    e.preventDefault();
                    
                    const animeId = clickedBtn.getAttribute('data-anime-id');
                    // Chercher le slot parent - peut être un élément avec id catalogue-card-X ou .top10-slot
                    const slot = clickedBtn.closest('[id^="catalogue-card-"]') || clickedBtn.closest('.top10-slot');
                        
                    // Vérifier si le slot existe (le bouton est dans le top 10)
                    if (!slot) {
                        // Le bouton n'est pas dans un slot du top 10, ignorer
                        return;
                    }
                        
                    const menu = slot.querySelector('.card-more-menu');
                        
                        // Vérifier que le menu existe
                        if (!menu) {
                            return;
                        }
                        
                        
                        // Fermer tous les autres menus
                        document.querySelectorAll('.card-more-menu').forEach(otherMenu => {
                            if (otherMenu !== menu) {
                                otherMenu.style.opacity = '0';
                                otherMenu.style.pointerEvents = 'none';
                                otherMenu.style.visibility = 'hidden';
                                otherMenu.style.display = 'none';
                            }
                        });
                        
                        
                        if (menu.style.display === 'none' || menu.style.opacity === '0' || menu.style.visibility === 'hidden') {
                            menu.style.display = 'block';
                            menu.style.pointerEvents = 'auto';
                            menu.style.opacity = '0';
                            menu.style.visibility = 'visible';
                            menu.style.zIndex = '1000';
                            menu.style.transform = 'translateY(-5px) scale(0.95)';
                            
                            // Animation d'apparition
                            setTimeout(() => {
                                menu.style.opacity = '1';
                                menu.style.transform = 'translateY(0) scale(1)';
                            }, 10);
                            
                            // Le menu restera ouvert jusqu'à ce qu'on clique sur "Enlever du top 10" ou qu'on reclique sur "..."
                        } else {
                            // Animation de disparition
                            menu.style.opacity = '0';
                            menu.style.transform = 'translateY(-5px) scale(0.95)';
                            setTimeout(() => {
                                menu.style.pointerEvents = 'none';
                                menu.style.visibility = 'hidden';
                                menu.style.display = 'none';
                                menu.style.transform = 'translateY(0) scale(1)';
                            }, 250);
                        }
                }, true); // Utiliser capture: true pour être exécuté avant les autres gestionnaires
                
                window.top10ButtonHandlerAdded = true;
            }
            
            // Le gestionnaire global au niveau du document gère déjà les clics sur les boutons avec data-top10-button
            // Pas besoin d'attacher un gestionnaire direct ici
            
            
            // Ajouter un événement pour empêcher la fermeture du menu quand on clique dedans
            // Empêcher la fermeture du menu quand on clique dedans
            moreMenu.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
            });
            
            // Empêcher la fermeture automatique du menu
            moreMenu.addEventListener('mouseenter', function(e) {
                e.stopPropagation();
                moreMenu.style.opacity = '1';
                moreMenu.style.pointerEvents = 'auto';
                moreMenu.style.display = 'block';
                moreMenu.style.visibility = 'visible';
            });
            
            // Empêcher la fermeture quand on survole le menu
            moreMenu.addEventListener('mouseleave', function(e) {
                e.stopPropagation();
                // Ne pas fermer automatiquement
            });
            
            // SUPPRIMER COMPLÈTEMENT LE GESTIONNAIRE DE FERMETURE AUTOMATIQUE
            // Le menu ne se fermera que quand on clique sur "Enlever du top 10" ou qu'on reclique sur "..."
            
            // Ajouter un événement pour empêcher la suppression du bouton
            moreBtn.addEventListener('mouseenter', () => {
                console.log('Souris sur le bouton "..."');
                moreBtn.style.opacity = '1';
                moreBtn.style.visibility = 'visible';
                moreBtn.style.display = 'flex';
            });
            
            // Empêcher la suppression du bouton
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && !slot.contains(moreBtn)) {
                        console.log('Bouton "..." supprimé, le recréer');
                        slot.appendChild(moreBtn);
                    }
                });
            });
            
            observer.observe(slot, { childList: true });
            
            // Ne pas utiliser setInterval ici car cela crée des intervalles infinis
            // Le bouton devrait déjà être visible grâce aux styles CSS
            
            // Action "Changer de place" - Ouvrir l'interface de sélection
            const moveBtn = moreMenu.querySelector('.move-top10-menu-item');
            if (moveBtn) {
                const newMoveBtn = moveBtn.cloneNode(true);
                moveBtn.parentNode.replaceChild(newMoveBtn, moveBtn);
                
                // Ajouter les effets hover
                newMoveBtn.addEventListener('mouseenter', function() {
                    this.style.background = 'rgba(0, 184, 148, 0.15)';
                    this.style.color = '#00b894';
                    this.style.paddingLeft = '16px';
                });
                newMoveBtn.addEventListener('mouseleave', function() {
                    this.style.background = 'transparent';
                    this.style.color = '#fff';
                    this.style.paddingLeft = '14px';
                });
                
                newMoveBtn.onclick = async function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    
                    // Vérifier que le menu est visible
                    if (moreMenu.style.opacity === '0' || moreMenu.style.display === 'none' || moreMenu.style.visibility === 'hidden') {
                        return;
                    }
                    
                    // Fermer le menu
                    moreMenu.style.opacity = '0';
                    moreMenu.style.pointerEvents = 'none';
                    moreMenu.style.visibility = 'hidden';
                    moreMenu.style.display = 'none';
                    
                    // Créer une carte temporaire pour window.selectedTop10Card à partir des données du slot
                    const user = JSON.parse(localStorage.getItem('user') || 'null');
                    if (!user || !user.email) return;
                    
                    // Utiliser les données de completeAnimeData qui sont déjà disponibles
                    if (!completeAnimeData || !completeAnimeData.id) return;
                    
                    // Utiliser la même logique que lors de la sauvegarde pour déterminer le type réel
                    let finalType = window.selectedType || null;
                    const genres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
                    const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
                    
                    if (finalType === 'manga' && genres.some(g => typeGenres.includes(g))) {
                        if (genres.includes('Doujin')) {
                            finalType = 'doujin';
                        } else if (genres.includes('Manhwa')) {
                            finalType = 'manhwa';
                        } else if (genres.includes('Manhua')) {
                            finalType = 'manhua';
                        }
                    }
                    
                    // Utiliser le contentType de completeAnimeData si disponible, sinon finalType
                    const contentType = completeAnimeData.contentType || finalType || 'anime';
                    
                    // Créer un élément temporaire qui représente cette carte
                    const tempCard = document.createElement('div');
                    tempCard.className = 'catalogue-card';
                    tempCard.setAttribute('data-anime-id', completeAnimeData.id);
                    tempCard.setAttribute('data-is-manga', contentType === 'manga' || contentType === 'doujin' || contentType === 'manhwa' || contentType === 'manhua' ? 'true' : 'false');
                    tempCard.setAttribute('data-content-type', contentType);
                    
                    // Créer une image pour la carte temporaire
                    const tempImg = document.createElement('img');
                    tempImg.src = completeAnimeData.image || completeAnimeData.img || completeAnimeData.cover || '';
                    tempImg.alt = completeAnimeData.titre || completeAnimeData.title || completeAnimeData.name || '';
                    tempCard.appendChild(tempImg);
                    
                    // Ajouter le titre pour extractTitleFromCard
                    const tempTitle = document.createElement('div');
                    tempTitle.className = 'card-title';
                    tempTitle.textContent = completeAnimeData.titre || completeAnimeData.title || completeAnimeData.name || '';
                    tempCard.appendChild(tempTitle);
                    
                    // Ajouter les genres si disponibles
                    if (completeAnimeData.genres && completeAnimeData.genres.length > 0) {
                        const tempGenres = document.createElement('div');
                        tempGenres.className = 'card-genres';
                        tempGenres.textContent = completeAnimeData.genres.join(', ');
                        tempCard.appendChild(tempGenres);
                    }
                    
                    // Ajouter la carte temporaire au DOM (cachée)
                    tempCard.style.position = 'absolute';
                    tempCard.style.top = '-9999px';
                    tempCard.style.left = '-9999px';
                    tempCard.style.visibility = 'hidden';
                    tempCard.style.opacity = '0';
                    document.body.appendChild(tempCard);
                    
                    // Sélectionner cette carte temporaire
                    window.selectedTop10Card = tempCard;
                    
                    // Définir le contexte du top 10
                    window.top10Context = {
                        genre: genre || null,
                        type: finalType || null,
                        isGenreContext: genre !== null
                    };
                    
                    // Sauvegarder l'index actuel pour le réutiliser dans showTop10MiniInterface
                    window.currentTop10Index = i;
                    window.currentTop10Item = completeAnimeData;
                    
                    // Appeler showTop10MiniInterface
                    if (typeof showTop10MiniInterface === 'function') {
                        setTimeout(() => {
                            showTop10MiniInterface().catch(err => {
                                console.error('❌ ERREUR lors de l\'appel de showTop10MiniInterface:', err);
                                // Nettoyer en cas d'erreur
                                if (tempCard.parentNode) {
                                    tempCard.parentNode.removeChild(tempCard);
                                }
                            });
                        }, 50);
                    }
                    
                    // Nettoyer la carte temporaire après un délai (après que l'interface soit fermée)
                    setTimeout(() => {
                        if (tempCard.parentNode) {
                            tempCard.parentNode.removeChild(tempCard);
                        }
                    }, 10000);
                };
            }
            
            // Action "Enlever du top 10" - Utiliser la délégation d'événements
            const removeBtn = moreMenu.querySelector('.remove-top10-menu-item');
            if (removeBtn) {
                // Supprimer les anciens événements en clonant le bouton
                const newRemoveBtn = removeBtn.cloneNode(true);
                removeBtn.parentNode.replaceChild(newRemoveBtn, removeBtn);
                
                // Ajouter les effets hover
                newRemoveBtn.addEventListener('mouseenter', function() {
                    this.style.background = 'rgba(255, 107, 107, 0.15)';
                    this.style.color = '#ff5252';
                    this.style.paddingLeft = '16px';
                });
                newRemoveBtn.addEventListener('mouseleave', function() {
                    this.style.background = 'transparent';
                    this.style.color = '#ff6b6b';
                    this.style.paddingLeft = '14px';
                });
                
                newRemoveBtn.onclick = async function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    
                    
                    // Vérifier que le menu est visible avant de traiter le clic
                    if (moreMenu.style.opacity === '0' || moreMenu.style.display === 'none' || moreMenu.style.visibility === 'hidden') {
                        return;
                    }
                    
                    
                    // Utiliser la même logique que lors de la sauvegarde pour déterminer le type réel
                    let finalType = window.selectedType || null;
                    const genres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
                    const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
                    
                    // Si un genre "type" est sélectionné et que le type est 'manga', utiliser le type réel
                    if (finalType === 'manga' && genres.some(g => typeGenres.includes(g))) {
                        if (genres.includes('Doujin')) {
                            finalType = 'doujin';
                        } else if (genres.includes('Manhwa')) {
                            finalType = 'manhwa';
                        } else if (genres.includes('Manhua')) {
                            finalType = 'manhua';
                        }
                    }
                    
                    const finalGenre = genre; // genre est déjà la clé composite depuis renderTop10Slots
                    
                    
                    let top10 = await getUserTop10(user, finalGenre, finalType);
                    
                    // Récupérer l'ID de l'anime avant de le supprimer
                    const removedAnimeId = completeAnimeData?.id || top10[i]?.id;
                    
                    top10[i] = null;
                    
                    await setUserTop10(user, top10, finalGenre, finalType);
                    
                    // Fermer le menu après l'action
                    moreMenu.style.opacity = '0';
                    moreMenu.style.pointerEvents = 'none';
                    moreMenu.style.visibility = 'hidden';
                    moreMenu.style.display = 'none';
                    
                    // Réafficher IMMÉDIATEMENT le bouton "..." pour la carte qui vient d'être retirée (AVANT renderTop10Slots)
                    if (removedAnimeId) {
                        const cardsToUpdateImmediately = [
                            ...document.querySelectorAll(`.catalogue-card[data-anime-id="${removedAnimeId}"]`),
                            ...document.querySelectorAll(`#genre-filtered-container .catalogue-card[data-anime-id="${removedAnimeId}"]`),
                            ...document.querySelectorAll(`#genre-cards-container .catalogue-card[data-anime-id="${removedAnimeId}"]`)
                        ];
                        
                        cardsToUpdateImmediately.forEach(card => {
                            const selectBtn = card.querySelector('.select-top10-btn');
                            if (selectBtn) {
                                selectBtn.style.display = 'block';
                                selectBtn.style.visibility = '';
                                selectBtn.style.opacity = '';
                                selectBtn.style.pointerEvents = 'auto';
                            }
                            
                            const mainMoreBtn = card.querySelector('.card-more-btn, .more-button, .card-more-button');
                            if (mainMoreBtn) {
                                mainMoreBtn.style.display = '';
                                mainMoreBtn.style.visibility = '';
                                mainMoreBtn.style.opacity = '';
                                mainMoreBtn.style.pointerEvents = 'auto';
                                
                                // Réattacher les événements sur le bouton si nécessaire
                                // Le gestionnaire global devrait gérer cela, mais on s'assure que le menu existe
                                const mainMoreMenu = card.querySelector('.card-more-menu, .dropdown-menu');
                                if (mainMoreMenu) {
                                    mainMoreMenu.style.display = 'none';
                                    mainMoreMenu.style.opacity = '0';
                                    mainMoreMenu.style.visibility = 'hidden';
                                    mainMoreMenu.style.pointerEvents = 'none';
                                }
                            }
                        });
                    }
                    
                    // Rafraîchir l'affichage du top 10
                    await renderTop10Slots();
                    
                    // Attendre un peu pour s'assurer que la sauvegarde est complète et que Firebase a synchronisé
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Mettre à jour tous les boutons "..." pour réafficher "Ajouter au top 10" si nécessaire
                    // Utiliser refreshAllCardMoreButtons qui gère correctement la vérification du Top 10
                    if (typeof refreshAllCardMoreButtons === 'function') {
                        refreshAllCardMoreButtons();
                        // Appel supplémentaire après un délai pour s'assurer que toutes les cartes sont mises à jour
                        setTimeout(() => {
                            refreshAllCardMoreButtons();
                        }, 800);
                    } else if (typeof updateCardMoreButton === 'function') {
                        const allCardsToUpdate = [
                            ...document.querySelectorAll('.catalogue-card[data-anime-id]'),
                            ...document.querySelectorAll('#genre-filtered-container .catalogue-card[data-anime-id]'),
                            ...document.querySelectorAll('#genre-cards-container .catalogue-card[data-anime-id]')
                        ];
                        
                        await Promise.all(allCardsToUpdate.map(card => updateCardMoreButton(card)));
                        // Appel supplémentaire après un délai
                        setTimeout(async () => {
                            await Promise.all(allCardsToUpdate.map(card => updateCardMoreButton(card)));
                        }, 800);
                        
                        // S'assurer que le bouton reste visible après updateCardMoreButton
                        if (removedAnimeId) {
                            const cardsToRecheck = [
                                ...document.querySelectorAll(`.catalogue-card[data-anime-id="${removedAnimeId}"]`),
                                ...document.querySelectorAll(`#genre-filtered-container .catalogue-card[data-anime-id="${removedAnimeId}"]`),
                                ...document.querySelectorAll(`#genre-cards-container .catalogue-card[data-anime-id="${removedAnimeId}"]`)
                            ];
                            
                            cardsToRecheck.forEach(card => {
                                // S'assurer que la carte n'est pas dans un slot du top 10
                                const isInTop10Slot = card.closest('[id^="catalogue-card-"]') !== null || card.closest('.top10-slot') !== null;
                                if (isInTop10Slot) {
                                    return; // Ne pas modifier les cartes dans le top 10
                                }
                                
                                const selectBtn = card.querySelector('.select-top10-btn');
                                if (selectBtn) {
                                    selectBtn.style.display = 'block';
                                    selectBtn.style.visibility = '';
                                    selectBtn.style.opacity = '';
                                    selectBtn.style.pointerEvents = 'auto';
                                }
                                
                                const mainMoreBtn = card.querySelector('.card-more-btn, .more-button, .card-more-button');
                                if (mainMoreBtn) {
                                    mainMoreBtn.style.display = '';
                                    mainMoreBtn.style.visibility = '';
                                    mainMoreBtn.style.opacity = '';
                                    mainMoreBtn.style.pointerEvents = 'auto';
                                }
                            });
                        }
                    }
                    
                    // Mettre à jour tous les boutons "..." en vérifiant si chaque carte est dans le Top 10
                    // Cela garantit que les boutons sont correctement masqués pour les cartes dans le Top 10
                    // Utiliser un délai plus long pour s'assurer que Firebase a bien synchronisé
                    setTimeout(async () => {
                        // Utiliser refreshAllCardMoreButtons qui met à jour tous les boutons correctement
                        if (typeof refreshAllCardMoreButtons === 'function') {
                            refreshAllCardMoreButtons();
                        }
                        
                        // Réattacher les événements via attachCardEvents pour les cartes qui ne sont pas dans les containers d'étoiles
                        if (typeof attachCardEvents === 'function') {
                            attachCardEvents();
                        }
                    }, 800);
                    
                    // Double vérification après un délai plus long pour s'assurer que tout est bien mis à jour
                    setTimeout(async () => {
                        if (typeof refreshAllCardMoreButtons === 'function') {
                            refreshAllCardMoreButtons();
                        }
                        
                        if (typeof attachCardEvents === 'function') {
                            attachCardEvents();
                        }
                    }, 1500);
                    
                    // Ne pas appeler displayUserAnimeNotes ici pour éviter les boucles infinies
                    // L'affichage est déjà à jour
                    
                    // Si on est dans un conteneur filtré, le mettre à jour
                    if (window.selectedGenres && window.selectedGenres.length > 0) {
                        setTimeout(applyGenreFilter, 50);
                    }
                    
                    // Afficher un message de confirmation
                    const helpMsg = document.createElement('div');
                    helpMsg.id = 'remove-help-msg';
                    const animeTitle = completeAnimeData.titre || completeAnimeData.title || completeAnimeData.name || 'cette œuvre';
                    helpMsg.textContent = `"${animeTitle}" retiré(e) du top 10 avec succès !`;
                    helpMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#00b894;color:#fff;padding:12px 28px;border-radius:12px;font-size:1.15rem;z-index:9999;box-shadow:0 2px 12px #00b89477;';
                    document.body.appendChild(helpMsg);
                    setTimeout(() => { helpMsg.remove(); }, 2500);
                };
            }
        } else {
            // Placeholder
            const image = document.createElement('div');
            image.className = 'catalogue-image-placeholder';
            image.style.cssText = `
                width: 110px;
                height: 145px;
                background: #2a2d36;
                border-radius: 10px;
                margin: 0 auto 0.8rem auto;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #bdbdbd;
                font-size: 2.2rem;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            `;
            image.innerHTML = `${i+1}`;
            slot.appendChild(image);
            const titre = document.createElement('span');
            titre.className = 'anime-title';
            titre.style.cssText = 'color:#00b894;font-size:1.1rem;font-weight:800;text-align:center;margin-top:0.5rem;display:block;max-width:100%;word-wrap:break-word;line-height:1.2;';
            titre.textContent = `Anime ${i+1}`;
            slot.appendChild(titre);
        }
    }
    // Slots créés
    
    // Ajout : rafraîchir tous les boutons "..." après modification du top 10
    // Ne pas rafraîchir immédiatement si on vient d'ajouter une carte (évite le clignotement)
    // La mise à jour sera gérée par showTop10MiniInterface après confirmation de la sauvegarde
    if (!window.skipRefreshButtons) {
        // Utiliser un délai pour s'assurer que la sauvegarde est complète
        setTimeout(() => {
            if (typeof refreshAllCardMoreButtons === 'function') {
                refreshAllCardMoreButtons();
            }
        }, 200);
    } else {
        // Réinitialiser le flag pour les prochains appels
        window.skipRefreshButtons = false;
    }
    
    // Empêcher le drop sur les containers non-top10
    preventDropOnNonTop10Containers();
    
    // Réinitialiser le flag après le rendu
    isRenderingTop10 = false;
}



// Ajoute l'effet visuel de sélection sur les cartes anime/manga
function setAnimeCardSelection(card, selected) {
    if (!card) return;
    
    if (selected) {
        // Ajouter la classe de sélection
        card.classList.add('anime-card-selected');
        
        // Style pour la carte sélectionnée
        card.style.zIndex = '1000';
        card.style.transform = 'scale(1.02)';
        card.style.boxShadow = '0 6px 20px rgba(0, 184, 148, 0.3)';
        card.style.border = '2px solid #00b894';
        
        // Ajouter une animation subtile
        card.style.transition = 'all 0.2s ease-in-out';
        
        // Ajouter un indicateur visuel
        let indicator = card.querySelector('.selection-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'selection-indicator';
            indicator.style.cssText = `
                position: absolute;
                top: 8px;
                right: 8px;
                width: 20px;
                height: 20px;
                background-color: #00b894;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                z-index: 10;
            `;
            indicator.innerHTML = '✓';
            card.appendChild(indicator);
        }
        
        // === INTERFACE EN MINIATURE POUR LE TOP 10 ===
        // Ne pas appeler showTop10MiniInterface() ici - elle sera appelée par le gestionnaire d'événement du bouton
        // après que window.selectedTop10Card soit défini
        
        // === SCROLL MANUEL QUAND L'UTILISATEUR POINTE VERS LE HAUT ===
        let scrollInterval = null;
        
        // Fonction pour faire défiler vers le haut
        function scrollToTop() {
            const top10Container = document.querySelector('.card-list');
            if (top10Container) {
                top10Container.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }
        
        // Détecter quand la souris est dans la zone supérieure de l'écran
        const mouseMoveHandler = function(e) {
            if (window.selectedTop10Card && e.clientY < 150) {
                if (!scrollInterval) {
                    scrollInterval = setInterval(scrollToTop, 50);
                }
            } else {
                if (scrollInterval) {
                    clearInterval(scrollInterval);
                    scrollInterval = null;
                }
            }
        };
        
        document.addEventListener('mousemove', mouseMoveHandler);
        
        // Nettoyer l'événement quand la sélection est retirée
        setTimeout(() => {
            if (!window.selectedTop10Card) {
                document.removeEventListener('mousemove', mouseMoveHandler);
                if (scrollInterval) {
                    clearInterval(scrollInterval);
                    scrollInterval = null;
                }
            }
        }, 30000); // Nettoyer après 30 secondes
        
    } else {
        // Retirer la sélection
        card.classList.remove('anime-card-selected');
        
        // Réinitialiser les styles
        card.style.zIndex = '';
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.border = '2px solid #00b894'; // Garder la bordure normale
        
        // Retirer l'indicateur visuel
        const indicator = card.querySelector('.selection-indicator');
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }
}

// Patch displayUserAnimeNotes pour effet sélection et gestion du bouton ...
const oldDisplayUserAnimeNotes = displayUserAnimeNotes;
displayUserAnimeNotes = function() {
    oldDisplayUserAnimeNotes.apply(this, arguments);
    
    // Récupère le top 10 du genre courant (ou global)
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    let top10 = [];
    if (user && user.email) {
        const genres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
        const genre = genres.length > 0 ? genres.sort().join(',') : null;
        try {
            top10 = JSON.parse(localStorage.getItem(getUserTop10Key(user, genre, window.selectedType)) || '[]');
        } catch (e) { top10 = []; }
    }
    

    
    // Fonction pour mettre à jour l'affichage du bouton "..." sur une carte
    async function updateCardMoreButton(card) {
        const animeId = card.getAttribute('data-anime-id');
        if (!animeId) return;
        
        // Déterminer le contexte et vérifier le bon top 10
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        let shouldHideButton = false;
        
        // Récupérer le titre et le contentType depuis les notes (plus fiable que le DOM)
        let cardTitle = null;
        let cardContentType = null;
        if (user && user.email) {
            const notes = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
            const note = notes.find(n => String(n.id) === String(animeId));
            if (note) {
                // Utiliser le titre depuis les notes en priorité (plus fiable que le DOM)
                cardTitle = note.titre || note.title || note.name || null;
                cardContentType = note.contentType || (note.isManga ? 'manga' : null);
                
                // Log pour les séries avec saisons
                if (cardTitle && isSeriesWithMultipleSeasons(cardTitle)) {
                    console.log(`🔍 [BUTTON SERIES] Titre récupéré depuis les notes pour animeId=${animeId}: "${cardTitle}"`);
                }
                
                // Log pour déboguer les IDs problématiques
                if (String(animeId) === '43608' || String(animeId) === '32282' || String(animeId) === '28171' || String(animeId) === '24703' || String(animeId) === '15451' || String(animeId) === '34281') {
                    console.log(`🔍 [BUTTON DEBUG NOTE] Note trouvée pour animeId=${animeId}: titre="${cardTitle}", contentType=${cardContentType}`);
                }
            } else {
                // Log si la note n'a pas été trouvée
                if (String(animeId) === '43608' || String(animeId) === '32282' || String(animeId) === '28171' || String(animeId) === '24703' || String(animeId) === '15451' || String(animeId) === '34281') {
                    console.log(`⚠️ [BUTTON DEBUG NOTE] Note NON trouvée pour animeId=${animeId} dans localStorage. Nombre total de notes: ${notes.length}`);
                    console.log(`⚠️ [BUTTON DEBUG NOTE] IDs disponibles:`, notes.map(n => n.id));
                }
            }
        }
        
        // Fallback : utiliser extractTitleFromCard si le titre n'a pas été trouvé dans les notes
        if (!cardTitle) {
            cardTitle = extractTitleFromCard(card);
            // Log si le titre a été récupéré depuis le DOM (moins fiable)
            if (cardTitle) {
                if (isSeriesWithMultipleSeasons(cardTitle)) {
                    console.log(`⚠️ [BUTTON SERIES] Titre récupéré depuis le DOM (fallback) pour animeId=${animeId}: "${cardTitle}"`);
                } else if (String(animeId) === '43608' || String(animeId) === '32282' || String(animeId) === '28171' || String(animeId) === '24703' || String(animeId) === '15451' || String(animeId) === '34281') {
                    console.log(`⚠️ [BUTTON DEBUG] Titre récupéré depuis le DOM pour animeId=${animeId}: "${cardTitle}" (ATTENTION: peut être incorrect)`);
                }
            }
        }
        
        if (user && user.email) {
            // Vérifier le contexte de la carte
            const isInGenreContainer = card.closest('#genre-filtered-container') || card.closest('#genre-cards-container');
            const isInStarContainer = card.closest('[id^="star-containers"]');
            const isInGlobalTop10Container = document.querySelector('.card-list') && card.closest('.card-list');
            
            if (isInGenreContainer) {
                // Dans les conteneurs de genre : vérifier le top 10 du genre spécifique + type réel
                const genres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
                const genre = genres.length > 0 ? genres.sort().join(',') : null;
                let type = window.selectedType || null;
                
                // Si un genre "type" est sélectionné (Doujin, Manhwa, Manhua), utiliser le type réel
                if (type === 'manga') {
                    const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
                    if (genres.some(g => typeGenres.includes(g))) {
                        if (genres.includes('Doujin')) {
                            type = 'doujin';
                        } else if (genres.includes('Manhwa')) {
                            type = 'manhwa';
                        } else if (genres.includes('Manhua')) {
                            type = 'manhua';
                        }
                    }
                }
                
                const genreTop10 = await getUserTop10(user, genre, type);
                // Le titre et contentType ont déjà été récupérés depuis les notes en haut de la fonction
                // Si cardContentType n'a pas été trouvé dans les notes, utiliser le type sélectionné
                if (!cardContentType) {
                    if (type === 'anime') {
                        cardContentType = 'anime';
                    } else if (type === 'manga') {
                        cardContentType = 'manga';
                    } else if (type === 'film') {
                        cardContentType = 'film';
                    }
                }
                const isInGenreTop10 = genreTop10.some(a => {
                    if (!a) return false;
                    // Comparaison par ID d'abord
                    if (String(a.id) === String(animeId)) return true;
                    // Pour les animes UNIQUEMENT, comparer aussi par titre de base et similarité
                    if ((type === 'anime' || type === 'manga') && 
                        (a.contentType === type || !a.contentType) && 
                        cardContentType === type) {
                        const contentTypeForExtraction = type;
                        const top10Title = a.titre || a.title || a.name;
                        const top10BaseTitle = extractBaseAnimeTitle(top10Title, contentTypeForExtraction);
                        const cardBaseTitle = extractBaseAnimeTitle(cardTitle, contentTypeForExtraction);
                        // Si les titres de base correspondent exactement, masquer le bouton
                        if (top10BaseTitle === cardBaseTitle && top10BaseTitle) {
                            return true;
                        }
                        // Si les titres sont similaires (même série sans indication explicite de saison), masquer le bouton
                        if (areAnimeTitlesSimilar(top10Title, cardTitle, contentTypeForExtraction)) {
                            return true;
                        }
                    }
                    return false;
                });
                shouldHideButton = isInGenreTop10;
            } else if (isInStarContainer || isInGlobalTop10Container) {
                // Dans les conteneurs d'étoiles ou top 10 global : vérifier le top 10 global du type sélectionné
                let starContainerType = window.selectedType || null;
                
                // Si le type est "manga" et qu'un genre "type" est sélectionné, vérifier le top 10 global du type réel
                // MAIS seulement si on est dans les conteneurs d'étoiles, pas dans le top 10 global
                if (!isInGlobalTop10Container && starContainerType === 'manga') {
                    const genres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
                    const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
                    if (genres.some(g => typeGenres.includes(g))) {
                        if (genres.includes('Doujin')) {
                            starContainerType = 'doujin';
                        } else if (genres.includes('Manhwa')) {
                            starContainerType = 'manhwa';
                        } else if (genres.includes('Manhua')) {
                            starContainerType = 'manhua';
                        }
                    }
                }
                
                // Pour les animes UNIQUEMENT, comparer aussi par titre de base (sans saison/partie)
                const cardTitle = extractTitleFromCard(card);
                // Récupérer le contentType de la carte depuis les notes
                let cardContentType = null;
                if (user && user.email) {
                    const notes = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
                    const note = notes.find(n => String(n.id) === String(animeId));
                    if (note && note.contentType) {
                        cardContentType = note.contentType;
                    } else if (note && note.isManga) {
                        // Fallback pour les anciennes notes qui utilisent isManga
                        cardContentType = 'manga';
                    } else if (starContainerType === 'anime') {
                        cardContentType = 'anime';
                    } else if (starContainerType === 'manga') {
                        cardContentType = 'manga';
                    } else if (starContainerType === 'film') {
                        cardContentType = 'film';
                    } else if (!starContainerType) {
                        // Si aucun type n'est sélectionné, essayer de détecter le type
                        // Par défaut, considérer comme anime si pas de contentType
                        cardContentType = note?.isManga ? 'manga' : 'anime';
                    }
                }
                // Fallback final : si cardContentType n'est toujours pas défini et qu'on est dans un conteneur d'étoiles,
                // vérifier si la carte a l'attribut data-is-manga ou la classe manga-card
                if (!cardContentType && isInStarContainer) {
                    const isMangaAttr = card.hasAttribute('data-is-manga') || card.classList.contains('manga-card');
                    if (isMangaAttr) {
                        cardContentType = 'manga';
                    } else {
                        // Par défaut, considérer comme anime si on ne peut pas déterminer
                        cardContentType = starContainerType || 'anime';
                    }
                }
                
                // Si aucun type n'est sélectionné et que la carte est un anime, vérifier aussi le top 10 "anime"
                let globalTop10 = await getUserTop10(user, null, starContainerType);
                if (!starContainerType && cardContentType === 'anime') {
                    // Vérifier aussi le top 10 "anime" spécifiquement pour les cartes anime
                    const animeTop10 = await getUserTop10(user, null, 'anime');
                    // Combiner les deux listes (en évitant les doublons)
                    const combinedTop10 = [...globalTop10];
                    animeTop10.forEach(item => {
                        if (!combinedTop10.some(existing => String(existing?.id) === String(item?.id))) {
                            combinedTop10.push(item);
                        }
                    });
                    globalTop10 = combinedTop10;
                }
                const isInGlobalTop10 = globalTop10.some(a => {
                    if (!a) return false;
                    // Comparaison par ID d'abord
                    if (String(a.id) === String(animeId)) {
                        console.log(`✅ [BUTTON HIDE] Carte ${animeId} trouvée dans le top 10 global par ID exact (updateCardMoreButton)`);
                        return true;
                    }
                    
                    // IMPORTANT: Ne comparer par titre que si les deux éléments sont du MÊME type
                    // Les films ont leur propre Top 10 et ne doivent pas être comparés avec les anime
                    // Déterminer le top10ContentType : d'abord essayer contentType, puis utiliser starContainerType, sinon null
                    let top10ContentType = a.contentType || null;
                    if (!top10ContentType) {
                        if (starContainerType === 'anime' || starContainerType === 'film') {
                            top10ContentType = starContainerType;
                        } else if (starContainerType === null && cardContentType) {
                            // Si aucun type n'est sélectionné, utiliser le cardContentType pour déterminer
                            top10ContentType = cardContentType;
                        }
                    }
                    
                    // Si les types sont différents (ex: film vs anime), ne pas comparer par titre
                    if (top10ContentType && cardContentType && top10ContentType !== cardContentType) {
                        return false; // Types différents, ce n'est pas la même carte
                    }
                    
                    // Pour les animes ET mangas, comparer aussi par titre de base et similarité
                    // MAIS seulement si les deux sont du même type (anime/anime, manga/manga, pas de mélange)
                    // IMPORTANT: Vérifier si cardContentType est 'anime' ou 'manga' et que top10ContentType correspond
                    if ((cardContentType === 'anime' || cardContentType === 'manga') && 
                        (top10ContentType === cardContentType || !top10ContentType || top10ContentType === cardContentType)) {
                        const top10Title = a.titre || a.title || a.name || '';
                        let cardTitleFromVar = cardTitle || ''; // Utiliser la variable déjà définie
                        
                        // Si les titres sont vides, ne pas comparer
                        if (!top10Title || !cardTitleFromVar) {
                            // Continuer sans masquer
                        } else {
                            // Vérifier si l'un des deux titres appartient à une série avec plusieurs saisons
                            const isSeriesTop10 = isSeriesWithMultipleSeasons(top10Title);
                            let isSeriesCard = isSeriesWithMultipleSeasons(cardTitleFromVar);
                            
                            // Vérification supplémentaire : si le top 10 contient une série avec saisons,
                            // vérifier si l'ID de la carte correspond à un titre de série avec saisons dans les notes
                            if (!isSeriesCard && isSeriesTop10 && user && user.email) {
                                const notes = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
                                const noteForCard = notes.find(n => String(n.id) === String(animeId));
                                if (noteForCard) {
                                    const noteTitle = noteForCard.titre || noteForCard.title || noteForCard.name || '';
                                    if (isSeriesWithMultipleSeasons(noteTitle)) {
                                        // Utiliser le titre depuis les notes au lieu du titre extrait du DOM
                                        cardTitleFromVar = noteTitle;
                                        isSeriesCard = true;
                                        console.log(`✅ [BUTTON SERIES FIX UPDATE] Titre corrigé depuis les notes (même ID) pour animeId=${animeId}: "${cardTitleFromVar}" (était: "${cardTitle}")`);
                                    }
                                }
                            }
                            
                            const top10BaseTitle = extractBaseAnimeTitle(top10Title, 'anime');
                            let cardBaseTitle = extractBaseAnimeTitle(cardTitleFromVar, 'anime');
                            
                            // IMPORTANT: Si le top 10 contient une série avec saisons, TOUJOURS utiliser le titre depuis les notes
                            // pour améliorer la comparaison, même si la carte n'est pas détectée comme une série avec saisons
                            if (isSeriesTop10 && user && user.email) {
                                const notes = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
                                const noteForCard = notes.find(n => String(n.id) === String(animeId));
                                if (noteForCard) {
                                    const noteTitle = noteForCard.titre || noteForCard.title || noteForCard.name || '';
                                    if (noteTitle) {
                                        // Toujours utiliser le titre depuis les notes si le top 10 contient une série avec saisons
                                        cardTitleFromVar = noteTitle;
                                        cardBaseTitle = extractBaseAnimeTitle(noteTitle, contentTypeForExtraction);
                                        // Re-vérifier si c'est une série avec saisons maintenant qu'on a le bon titre
                                        isSeriesCard = isSeriesWithMultipleSeasons(noteTitle);
                                        console.log(`🔧 [BUTTON SERIES UPDATE] Titre utilisé depuis les notes pour comparaison: animeId=${animeId}, titre="${noteTitle}", contentType="${contentTypeForExtraction}"`);
                                    }
                                }
                            }
                            
                            // TOUJOURS comparer les titres de base pour tous les mangas et animes
                            // Cela fonctionne pour toutes les séries, pas seulement celles détectées par isSeriesWithMultipleSeasons
                            if (top10BaseTitle && cardBaseTitle) {
                                // Normaliser les titres pour la comparaison (minuscules, sans espaces multiples)
                                const normalizedTop10Base = (top10BaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                const normalizedCardBase = (cardBaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                
                                // Si les titres de base correspondent exactement, masquer le bouton
                                if (normalizedTop10Base && normalizedCardBase && 
                                    normalizedTop10Base === normalizedCardBase && normalizedTop10Base.length > 0) {
                                    console.log(`✅ [BUTTON HIDE UPDATE] Titres de base identiques: "${top10BaseTitle}" === "${cardBaseTitle}" (${contentTypeForExtraction})`);
                                    return true;
                                } else if (isSeriesTop10 || isSeriesCard) {
                                    console.log(`🔍 [BUTTON DEBUG SERIES UPDATE] Titres de base différents: "${top10BaseTitle}" vs "${cardBaseTitle}" (normalisés: "${normalizedTop10Base}" vs "${normalizedCardBase}")`);
                                    
                                    // Pour les séries avec saisons, vérifier aussi si les préfixes correspondent
                                    let minPrefixLength;
                                    if (normalizedTop10Base.includes('high school dxd') || normalizedCardBase.includes('high school dxd')) {
                                        minPrefixLength = 18;
                                    } else {
                                        minPrefixLength = 15;
                                    }
                                    
                                    const prefixLength = Math.min(minPrefixLength, Math.min(normalizedTop10Base.length, normalizedCardBase.length));
                                    if (prefixLength >= minPrefixLength) {
                                        const top10Prefix = normalizedTop10Base.substring(0, prefixLength);
                                        const cardPrefix = normalizedCardBase.substring(0, prefixLength);
                                        if (top10Prefix === cardPrefix) {
                                            console.log(`✅ [BUTTON HIDE SERIES UPDATE] Préfixes identiques: "${top10Prefix}"`);
                                            return true;
                                        }
                                    }
                                }
                            } else if (isSeriesTop10 || isSeriesCard) {
                                console.log(`⚠️ [BUTTON DEBUG SERIES UPDATE] Titres de base manquants: top10BaseTitle=${!!top10BaseTitle}, cardBaseTitle=${!!cardBaseTitle}`);
                            }
                            
                            // Si les titres sont similaires (même série sans indication explicite de saison), masquer le bouton
                            if (areAnimeTitlesSimilar(top10Title, cardTitleFromVar, contentTypeForExtraction)) {
                                console.log(`✅ [BUTTON HIDE UPDATE] Cartes similaires détectées via areAnimeTitlesSimilar (${contentTypeForExtraction}): "${top10Title}" vs "${cardTitleFromVar}"`);
                                return true;
                            } else if (isSeriesTop10 || isSeriesCard) {
                                console.log(`🔍 [BUTTON DEBUG SERIES UPDATE] areAnimeTitlesSimilar retourné false pour: "${top10Title}" vs "${cardTitleFromVar}"`);
                            }
                            
                            // Vérification supplémentaire pour les séries avec saisons : comparer directement les titres bruts
                            if (isSeriesTop10 || isSeriesCard) {
                                const normalizedTop10Raw = top10Title.toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                const normalizedCardRaw = cardTitleFromVar.toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                
                                // Si les titres normalisés correspondent (sans tenir compte de la casse et des espaces)
                                if (normalizedTop10Raw.length > 5 && normalizedCardRaw.length > 5) {
                                    // Déterminer la longueur du préfixe selon la série
                                    let prefixLength;
                                    if (normalizedTop10Raw.includes('high school dxd') || normalizedCardRaw.includes('high school dxd')) {
                                        prefixLength = Math.min(18, Math.min(normalizedTop10Raw.length, normalizedCardRaw.length));
                                    } else {
                                        prefixLength = Math.min(15, Math.min(normalizedTop10Raw.length, normalizedCardRaw.length));
                                    }
                                    
                                    const top10Prefix = normalizedTop10Raw.substring(0, prefixLength);
                                    const cardPrefix = normalizedCardRaw.substring(0, prefixLength);
                                    
                                    // Vérifier si un titre commence par l'autre (indique une série avec saison/partie)
                                    if (normalizedTop10Raw.startsWith(cardPrefix) || normalizedCardRaw.startsWith(top10Prefix)) {
                                        console.log(`✅ [BUTTON HIDE SERIES UPDATE] Préfixes similaires détectés: "${top10Title}" vs "${cardTitleFromVar}" (préfixe: "${top10Prefix}" vs "${cardPrefix}")`);
                                        return true;
                                    }
                                }
                            }
                        }
                    } else if (animeId === '9253' || (cardTitle && (cardTitle.toLowerCase().includes('shokugeki') || cardTitle.toLowerCase().includes('steins')))) {
                        // Log de débogage pour comprendre pourquoi la comparaison ne s'exécute pas
                        console.log(`⚠️ [BUTTON DEBUG UPDATE] Comparaison SKIPPÉE pour animeId=${animeId}, cardContentType=${cardContentType}, top10ContentType=${top10ContentType}, starContainerType=${starContainerType}`);
                    }
                    
                    // Pour les films UNIQUEMENT, comparer aussi par titre de base et similarité
                    // MAIS seulement si les deux sont des films (pas d'anime)
                    if (starContainerType === 'film' && top10ContentType === 'film' && cardContentType === 'film') {
                        const top10Title = a.titre || a.title || a.name;
                        const top10BaseTitle = extractBaseAnimeTitle(top10Title, 'film');
                        const cardBaseTitle = extractBaseAnimeTitle(cardTitle, 'film');
                        // Si les titres de base correspondent exactement, masquer le bouton
                        if (top10BaseTitle === cardBaseTitle && top10BaseTitle) {
                            return true;
                        }
                        // Pour les films, ne PAS utiliser la similarité, seulement la comparaison exacte par titre de base
                        // (Les films ne doivent être comparés que par ID ou titre de base identique)
                    }
                    
                    return false;
                });
                shouldHideButton = isInGlobalTop10;
            }
        }
        
        // Affiche ou masque le bouton '...' et son menu
        const mainMoreBtn = card.querySelector('.card-more-btn, .more-button, .card-more-button');
        const mainMoreMenu = card.querySelector('.card-more-menu, .dropdown-menu');
        if (mainMoreBtn) {
            // Ne pas masquer les boutons dans le top 10 (ils ont l'attribut data-in-top10 ou data-top10-button)
            const isInTop10Slot = mainMoreBtn.hasAttribute('data-in-top10') || 
                                  mainMoreBtn.hasAttribute('data-top10-button') ||
                                  card.closest('[id^="catalogue-card-"]') !== null ||
                                  card.closest('.top10-slot') !== null;
            
            if (shouldHideButton && !isInTop10Slot) {
                console.log(`🔘 [BUTTON HIDE UPDATE] Masquage du bouton pour la carte ${animeId}`);
                // Masquer le bouton et nettoyer les événements avec !important pour forcer le masquage
                mainMoreBtn.style.setProperty('display', 'none', 'important');
                mainMoreBtn.style.setProperty('pointer-events', 'none', 'important');
                mainMoreBtn.style.setProperty('visibility', 'hidden', 'important');
                mainMoreBtn.style.setProperty('opacity', '0', 'important');
                
                // Fermer le menu s'il est ouvert
                if (mainMoreMenu) {
                    mainMoreMenu.style.display = 'none';
                    mainMoreMenu.style.opacity = '0';
                    mainMoreMenu.style.pointerEvents = 'none';
                    mainMoreMenu.style.visibility = 'hidden';
                }
            } else if (!shouldHideButton && !isInTop10Slot) {
                // Afficher le bouton
                mainMoreBtn.style.removeProperty('display');
                mainMoreBtn.style.removeProperty('pointer-events');
                mainMoreBtn.style.removeProperty('visibility');
                mainMoreBtn.style.removeProperty('opacity');
            }
        }
        if (mainMoreMenu && !shouldHideButton) {
            // S'assurer que le menu est fermé par défaut
            mainMoreMenu.style.display = 'none';
            mainMoreMenu.style.opacity = '0';
            mainMoreMenu.style.pointerEvents = 'none';
        }
        
        // Affiche ou masque le bouton 'sélectionner' si présent
        let selectBtn = card.querySelector('.select-top10-btn');
        if (selectBtn) {
            if (shouldHideButton) {
                // Masquer complètement le bouton "Ajouter au top 10"
                selectBtn.style.display = 'none';
                selectBtn.style.visibility = 'hidden';
                selectBtn.style.opacity = '0';
                selectBtn.style.pointerEvents = 'none';
            } else {
                // Afficher le bouton "Ajouter au top 10"
                selectBtn.style.display = 'block';
                selectBtn.style.visibility = '';
                selectBtn.style.opacity = '';
                selectBtn.style.pointerEvents = 'auto';
            }
        }
    }
    
    // Mettre à jour toutes les cartes dans tous les conteneurs (de manière asynchrone)
    const allCardsToUpdate = [
        ...document.querySelectorAll('.catalogue-card[data-anime-id]'),
        ...document.querySelectorAll('#genre-filtered-container .catalogue-card[data-anime-id]'),
        ...document.querySelectorAll('#genre-cards-container .catalogue-card[data-anime-id]')
    ];
    
    // Mettre à jour toutes les cartes en parallèle
    Promise.all(allCardsToUpdate.map(card => updateCardMoreButton(card))).then(() => {
        // Log désactivé pour éviter les logs infinis
    });
    
    // Empêcher le drop sur les containers non-top10
    preventDropOnNonTop10Containers();
};

// Fonction pour empêcher le drop sur tous les containers sauf le top 10
function preventDropOnNonTop10Containers() {
    // Empêcher le drop sur tous les containers d'étoiles
    document.querySelectorAll('[id^="star-containers"]').forEach(container => {
        container.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'none';
            
            // Ajouter un effet visuel pour indiquer que le drop est interdit
            this.style.border = '2px dashed #ff6b6b';
            this.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
        });
        
        container.addEventListener('dragleave', function(e) {
            this.style.border = '';
            this.style.backgroundColor = '';
        });
        
        container.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Restaurer le style
            this.style.border = '';
            this.style.backgroundColor = '';
            
            // Afficher un message d'erreur
            const errorMsg = document.createElement('div');
            errorMsg.id = 'drop-error-msg';
            errorMsg.innerHTML = `
                <div style="text-align: center; margin-bottom: 8px;">
                    <strong>❌ Zone interdite !</strong>
                </div>
                <div style="font-size: 0.9rem;">
                    Les cartes ne peuvent être placées que dans le <strong>TOP 10</strong> en haut de la page.
                </div>
            `;
            errorMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#ff6b6b;color:#fff;padding:16px 32px;border-radius:12px;font-size:1.15rem;z-index:9999;box-shadow:0 4px 16px #ff6b6b77;max-width:400px;text-align:center;';
            document.body.appendChild(errorMsg);
            setTimeout(() => { errorMsg.remove(); }, 4000);
            
            // Réinitialiser la sélection
            if (window.selectedTop10Card) {
                setAnimeCardSelection(window.selectedTop10Card, false);
                window.selectedTop10Card = null;
            }
        });
    });
    
    // Empêcher le drop sur les containers de genre
    document.querySelectorAll('#genre-filtered-container, #genre-cards-container').forEach(container => {
        container.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'none';
            
            // Ajouter un effet visuel pour indiquer que le drop est interdit
            this.style.border = '2px dashed #ff6b6b';
            this.style.backgroundColor = 'rgba(255, 107, 107, 0.1)';
        });
        
        container.addEventListener('dragleave', function(e) {
            this.style.border = '';
            this.style.backgroundColor = '';
        });
        
        container.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Restaurer le style
            this.style.border = '';
            this.style.backgroundColor = '';
            
            // Afficher un message d'erreur
            const errorMsg = document.createElement('div');
            errorMsg.id = 'drop-error-msg';
            errorMsg.innerHTML = `
                <div style="text-align: center; margin-bottom: 8px;">
                    <strong>❌ Zone interdite !</strong>
                </div>
                <div style="font-size: 0.9rem;">
                    Les cartes ne peuvent être placées que dans le <strong>TOP 10</strong> en haut de la page.
                </div>
            `;
            errorMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#ff6b6b;color:#fff;padding:16px 32px;border-radius:12px;font-size:1.15rem;z-index:9999;box-shadow:0 4px 16px #ff6b6b77;max-width:400px;text-align:center;';
            document.body.appendChild(errorMsg);
            setTimeout(() => { errorMsg.remove(); }, 4000);
            
            // Réinitialiser la sélection
            if (window.selectedTop10Card) {
                setAnimeCardSelection(window.selectedTop10Card, false);
                window.selectedTop10Card = null;
            }
        });
    });
}

// Ajout : fonction utilitaire pour rafraîchir tous les boutons "..." sur toutes les cartes catalogue
// Protection contre les appels multiples
let isRefreshingButtons = false;
let lastRefreshTime = 0;

async function refreshAllCardMoreButtons() {
    // Protection contre les appels multiples (debounce)
    const now = Date.now();
    if (isRefreshingButtons) {
        // Log désactivé pour éviter les logs infinis
        return;
    }
    if (now - lastRefreshTime < 500) { // Minimum 500ms entre les appels
        // Log désactivé pour éviter les logs infinis
        return;
    }
    
    isRefreshingButtons = true;
    lastRefreshTime = now;
    // Récupérer le top 10 une seule fois pour toutes les cartes
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    let top10Data = [];
    if (user && user.email) {
        try {
            top10Data = await getUserTop10(user.email);
            // Log des IDs dans le top 10 pour déboguer
            const top10Ids = top10Data.map(item => item.id);
            console.log(`🔍 [REFRESH BUTTONS] IDs dans le top 10:`, top10Ids);
            const top10Titles = top10Data.map(item => item.titre || item.title || item.name || 'N/A');
            console.log(`🔍 [REFRESH BUTTONS] Titres dans le top 10:`, top10Titles);
        } catch (err) {
            console.error(`❌ [REFRESH BUTTONS] Erreur lors de la récupération du top 10:`, err);
        }
    }
    
    // Même logique que dans displayUserAnimeNotes
    async function updateCardMoreButton(card) {
        const animeId = card.getAttribute('data-anime-id');
        if (!animeId) return;
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        let shouldHideButton = false;
        
        // Définir isInGenreContainer en dehors du bloc if pour qu'elle soit accessible partout
        const isInGenreContainer = card.closest('#genre-filtered-container') || card.closest('#genre-cards-container');
        const isInStarContainer = card.closest('[id^="star-containers"]');
        const isInGlobalTop10Slot = document.querySelector('.card-list') && card.closest('.card-list');
        
        // Récupérer le titre et le contentType depuis les notes (plus fiable que le DOM)
        let cardTitle = null;
        let cardContentType = null;
        if (user && user.email) {
            const notes = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
            const note = notes.find(n => String(n.id) === String(animeId));
            if (note) {
                // Utiliser le titre depuis les notes en priorité (plus fiable que le DOM)
                cardTitle = note.titre || note.title || note.name || null;
                cardContentType = note.contentType || (note.isManga ? 'manga' : null);
                
                // Log pour Food Wars
                if (cardTitle && (cardTitle.toLowerCase().includes('shokugeki') || cardTitle.toLowerCase().includes('food wars'))) {
                    console.log(`🔍 [BUTTON FOOD WARS] Titre récupéré depuis les notes pour animeId=${animeId}: "${cardTitle}"`);
                }
            } else {
                // Si la note n'a pas été trouvée, logger pour déboguer
                if (String(animeId) === '43608' || String(animeId) === '32282' || String(animeId) === '28171') {
                    console.log(`⚠️ [BUTTON DEBUG] Note non trouvée pour animeId=${animeId} dans localStorage. Nombre total de notes: ${notes.length}`);
                    console.log(`⚠️ [BUTTON DEBUG] IDs disponibles:`, notes.map(n => n.id));
                }
            }
        }
        
        // Fallback : utiliser extractTitleFromCard si le titre n'a pas été trouvé dans les notes
        if (!cardTitle) {
            cardTitle = extractTitleFromCard(card);
            // Log si le titre a été récupéré depuis le DOM (moins fiable)
            if (cardTitle) {
                if (cardTitle.toLowerCase().includes('shokugeki') || cardTitle.toLowerCase().includes('food wars')) {
                    console.log(`⚠️ [BUTTON FOOD WARS] Titre récupéré depuis le DOM (fallback) pour animeId=${animeId}: "${cardTitle}"`);
                } else if (String(animeId) === '43608' || String(animeId) === '32282' || String(animeId) === '28171') {
                    console.log(`⚠️ [BUTTON DEBUG] Titre récupéré depuis le DOM pour animeId=${animeId}: "${cardTitle}" (ATTENTION: peut être incorrect)`);
                }
            }
        }
        
        if (user && user.email) {
            if (isInGenreContainer) {
                // Dans les conteneurs de genre : vérifier le top 10 du genre spécifique + type réel
                const genres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
                const genre = genres.length > 0 ? genres.sort().join(',') : null;
                let type = window.selectedType || null;
                
                // Si un genre "type" est sélectionné (Doujin, Manhwa, Manhua), utiliser le type réel
                if (type === 'manga') {
                    const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
                    if (genres.some(g => typeGenres.includes(g))) {
                        if (genres.includes('Doujin')) {
                            type = 'doujin';
                        } else if (genres.includes('Manhwa')) {
                            type = 'manhwa';
                        } else if (genres.includes('Manhua')) {
                            type = 'manhua';
                        }
                    }
                }
                
                // Si cardContentType n'a pas été trouvé dans les notes, utiliser le type sélectionné
                if (!cardContentType) {
                    if (type === 'anime') {
                        cardContentType = 'anime';
                    } else if (type === 'manga') {
                        cardContentType = 'manga';
                    } else if (type === 'film') {
                        cardContentType = 'film';
                    }
                }
                
                const genreTop10 = await getUserTop10(user, genre, type);
                const isInGenreTop10 = genreTop10.some(a => {
                    if (!a) return false;
                    // Comparaison par ID d'abord
                    if (String(a.id) === String(animeId)) return true;
                    // Pour les animes ET mangas, comparer aussi par titre de base et similarité
                    if ((type === 'anime' || type === 'manga') && 
                        (a.contentType === type || !a.contentType) && 
                        cardContentType === type) {
                        const contentTypeForExtraction = type; // 'anime' ou 'manga'
                        const top10Title = a.titre || a.title || a.name || '';
                        let cardTitleForComparison = cardTitle || '';
                        
                        // Vérifier si l'un des deux titres appartient à une série avec plusieurs saisons
                        const isSeriesTop10 = isSeriesWithMultipleSeasons(top10Title);
                        let isSeriesCard = isSeriesWithMultipleSeasons(cardTitleForComparison);
                        
                        // Vérification supplémentaire : si le titre extrait du DOM ne correspond pas à une série avec saisons,
                        // vérifier si l'ID de la carte correspond à un titre de série avec saisons dans les notes
                        if (!isSeriesCard && isSeriesTop10 && user && user.email) {
                            const notes = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
                            const noteForCard = notes.find(n => String(n.id) === String(animeId));
                            if (noteForCard) {
                                const noteTitle = noteForCard.titre || noteForCard.title || noteForCard.name || '';
                                if (isSeriesWithMultipleSeasons(noteTitle)) {
                                    // Utiliser le titre depuis les notes au lieu du titre extrait du DOM
                                    cardTitleForComparison = noteTitle;
                                    isSeriesCard = true;
                                    console.log(`✅ [BUTTON SERIES FIX GENRE] Titre corrigé depuis les notes pour animeId=${animeId}: "${cardTitleForComparison}" (était: "${cardTitle}"), type=${contentTypeForExtraction}`);
                                }
                            }
                        }
                        
                        const top10BaseTitle = extractBaseAnimeTitle(top10Title, contentTypeForExtraction);
                        const cardBaseTitle = extractBaseAnimeTitle(cardTitleForComparison, contentTypeForExtraction);
                        // Si les titres de base correspondent exactement, masquer le bouton
                        if (top10BaseTitle === cardBaseTitle && top10BaseTitle) {
                            return true;
                        }
                        // Si les titres sont similaires (même série sans indication explicite de saison), masquer le bouton
                        if (areAnimeTitlesSimilar(top10Title, cardTitleForComparison, contentTypeForExtraction)) {
                            return true;
                        }
                        
                        // Vérification supplémentaire pour les séries avec saisons : comparer les préfixes
                        if (isSeriesTop10 || isSeriesCard) {
                            const normalizedTop10Base = (top10BaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ');
                            const normalizedCardBase = (cardBaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ');
                            const prefixLength = Math.min(15, Math.min(normalizedTop10Base.length, normalizedCardBase.length));
                            if (prefixLength >= 15) {
                                const top10Prefix = normalizedTop10Base.substring(0, prefixLength);
                                const cardPrefix = normalizedCardBase.substring(0, prefixLength);
                                if (top10Prefix === cardPrefix) {
                                    console.log(`✅ [BUTTON HIDE SERIES GENRE] Préfixes identiques (${contentTypeForExtraction}): "${top10Prefix}"`);
                                    return true;
                                }
                            }
                        }
                    }
                    return false;
                });
                shouldHideButton = isInGenreTop10;
            } else if (isInStarContainer || isInGlobalTop10Slot) {
                // Dans les conteneurs d'étoiles ou top 10 global : vérifier le top 10 global du type sélectionné
                let type = window.selectedType || null;
                
                // Si le type est "manga" et qu'un genre "type" est sélectionné, vérifier le top 10 global du type réel
                // MAIS seulement si on est dans les conteneurs d'étoiles, pas dans le top 10 global
                if (!isInGlobalTop10Slot && type === 'manga') {
                    const genres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
                    const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
                    if (genres.some(g => typeGenres.includes(g))) {
                        if (genres.includes('Doujin')) {
                            type = 'doujin';
                        } else if (genres.includes('Manhwa')) {
                            type = 'manhwa';
                        } else if (genres.includes('Manhua')) {
                            type = 'manhua';
                        }
                    }
                }
                
                // Utiliser le titre et contentType récupérés depuis les notes (définis en haut de la fonction)
                // Si cardContentType n'a pas été trouvé dans les notes, utiliser le type sélectionné
                if (!cardContentType) {
                    if (type === 'anime') {
                        cardContentType = 'anime';
                    } else if (type === 'manga') {
                        cardContentType = 'manga';
                    } else if (type === 'film') {
                        cardContentType = 'film';
                    } else if (!type) {
                        // Si aucun type n'est sélectionné, essayer de détecter le type
                        // Par défaut, considérer comme anime si pas de contentType
                        cardContentType = 'anime';
                    }
                }
                
                // Fallback final : si cardContentType n'est toujours pas défini et qu'on est dans un conteneur d'étoiles,
                // vérifier si la carte a l'attribut data-is-manga ou la classe manga-card
                if (!cardContentType && isInStarContainer) {
                    const isMangaAttr = card.hasAttribute('data-is-manga') || card.classList.contains('manga-card');
                    if (isMangaAttr) {
                        cardContentType = 'manga';
                    } else {
                        // Par défaut, considérer comme anime si on ne peut pas déterminer
                        cardContentType = type || 'anime';
                    }
                }
                
                // Si aucun type n'est sélectionné et que la carte est un anime, vérifier aussi le top 10 "anime"
                let globalTop10 = await getUserTop10(user, null, type);
                if (!type && cardContentType === 'anime') {
                    // Vérifier aussi le top 10 "anime" spécifiquement pour les cartes anime
                    const animeTop10 = await getUserTop10(user, null, 'anime');
                    // Combiner les deux listes (en évitant les doublons)
                    const combinedTop10 = [...globalTop10];
                    animeTop10.forEach(item => {
                        if (!combinedTop10.some(existing => String(existing?.id) === String(item?.id))) {
                            combinedTop10.push(item);
                        }
                    });
                    globalTop10 = combinedTop10;
                }
                
                // Filtrer les valeurs null du Top 10
                const validTop10Items = globalTop10.filter(a => a !== null && a !== undefined);
                
                const isInGlobalTop10Check = validTop10Items.some(a => {
                    if (!a) return false;
                    
                    // Comparaison par ID d'abord (normaliser en string pour éviter les problèmes de type)
                    const top10Id = String(a.id || '');
                    const cardId = String(animeId || '');
                    if (top10Id === cardId && top10Id !== '') {
                        console.log(`✅ [BUTTON HIDE] Carte ${cardId} trouvée dans le top 10 par ID exact`);
                        return true;
                    }
                    
                    // IMPORTANT: Ne comparer par titre que si les deux éléments sont du MÊME type
                    // Les films ont leur propre Top 10 et ne doivent pas être comparés avec les anime
                    // Déterminer le top10ContentType : d'abord essayer contentType, puis utiliser type, sinon utiliser cardContentType
                    let top10ContentTypeCheck = a.contentType || null;
                    if (!top10ContentTypeCheck) {
                        if (type === 'anime' || type === 'film') {
                            top10ContentTypeCheck = type;
                        } else if (!type && cardContentType) {
                            // Si aucun type n'est sélectionné, utiliser le cardContentType pour déterminer
                            top10ContentTypeCheck = cardContentType;
                        }
                    }
                    
                    // Si les types sont différents (ex: film vs anime), ne pas comparer par titre
                    if (top10ContentTypeCheck && cardContentType && top10ContentTypeCheck !== cardContentType) {
                        return false; // Types différents, ce n'est pas la même carte
                    }
                    
                    // Pour les animes ET mangas, comparer aussi par titre de base et similarité
                    // MAIS seulement si les deux sont du même type (anime/anime, manga/manga, pas de mélange)
                    // IMPORTANT: Vérifier si cardContentType est 'anime' ou 'manga' et que top10ContentTypeCheck correspond
                    if ((cardContentType === 'anime' || cardContentType === 'manga') && 
                        (top10ContentTypeCheck === cardContentType || !top10ContentTypeCheck || top10ContentTypeCheck === cardContentType)) {
                        const top10Title = a.titre || a.title || a.name || '';
                        let cardTitleFromVar = cardTitle || '';
                        
                        // Si les titres sont vides, ne pas comparer
                        if (!top10Title || !cardTitleFromVar) {
                            // Continuer sans masquer
                        } else {
                            // Vérifier si l'un des deux titres appartient à une série avec plusieurs saisons
                            const isSeriesTop10 = isSeriesWithMultipleSeasons(top10Title);
                            let isSeriesCard = isSeriesWithMultipleSeasons(cardTitleFromVar);
                            
                            // Vérification supplémentaire : si le top 10 contient une série avec saisons,
                            // vérifier si l'ID de la carte correspond à un ID connu de cette série dans TOUTES les notes
                            if (!isSeriesCard && isSeriesTop10 && user && user.email) {
                                const notes = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
                                
                                // D'abord, vérifier la note avec le même ID
                                const noteForCard = notes.find(n => String(n.id) === String(animeId));
                                if (noteForCard) {
                                    const noteTitle = noteForCard.titre || noteForCard.title || noteForCard.name || '';
                                    if (isSeriesWithMultipleSeasons(noteTitle)) {
                                        // Utiliser le titre depuis les notes au lieu du titre extrait du DOM
                                        cardTitleFromVar = noteTitle;
                                        isSeriesCard = true;
                                        console.log(`✅ [BUTTON SERIES FIX] Titre corrigé depuis les notes (même ID) pour animeId=${animeId}: "${cardTitleFromVar}" (était: "${cardTitle}")`);
                                    }
                                }
                                
                                // Si toujours pas trouvé, vérifier si l'ID de la carte correspond à un ID d'une autre saison de la même série
                                // en comparant le titre de base extrait du top 10 avec les titres de base des notes
                                if (!isSeriesCard && noteForCard) {
                                    const contentTypeForExtraction = cardContentType || 'anime';
                                    const top10BaseTitle = extractBaseAnimeTitle(top10Title, contentTypeForExtraction);
                                    const noteTitle = noteForCard.titre || noteForCard.title || noteForCard.name || '';
                                    const noteBaseTitle = extractBaseAnimeTitle(noteTitle, contentTypeForExtraction);
                                    
                                    // Comparer les titres de base normalisés
                                    const normalizedTop10Base = (top10BaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                    const normalizedNoteBase = (noteBaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                    
                                    // Si les titres de base correspondent (même série), masquer le bouton
                                    if (normalizedTop10Base && normalizedNoteBase && 
                                        (normalizedTop10Base === normalizedNoteBase || 
                                         normalizedTop10Base.startsWith(normalizedNoteBase) || 
                                         normalizedNoteBase.startsWith(normalizedTop10Base))) {
                                        // Utiliser le titre depuis les notes même si ce n'est pas une série avec saisons selon notre fonction
                                        cardTitleFromVar = noteTitle;
                                        isSeriesCard = true;
                                        console.log(`✅ [BUTTON SERIES FIX] Titres de base correspondent pour animeId=${animeId}: top10Base="${top10BaseTitle}", noteBase="${noteBaseTitle}"`);
                                    }
                                }
                                
                                // Dernière vérification : chercher dans toutes les notes si un titre de base correspond
                                if (!isSeriesCard) {
                                    const contentTypeForExtraction = cardContentType || 'anime';
                                    const top10BaseTitle = extractBaseAnimeTitle(top10Title, contentTypeForExtraction);
                                    const normalizedTop10Base = (top10BaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                    
                                    // Chercher une note avec le même ID dont le titre de base correspond à celui du top 10
                                    const matchingNote = notes.find(n => {
                                        if (String(n.id) !== String(animeId)) return false;
                                        const noteTitle = n.titre || n.title || n.name || '';
                                        const noteBaseTitle = extractBaseAnimeTitle(noteTitle, contentTypeForExtraction);
                                        const normalizedNoteBase = (noteBaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                        
                                        return normalizedTop10Base && normalizedNoteBase && 
                                               (normalizedTop10Base === normalizedNoteBase || 
                                                normalizedTop10Base.length >= 15 && normalizedNoteBase.length >= 15 &&
                                                (normalizedTop10Base.substring(0, 15) === normalizedNoteBase.substring(0, 15)));
                                    });
                                    
                                    if (matchingNote) {
                                        const noteTitle = matchingNote.titre || matchingNote.title || matchingNote.name || '';
                                        cardTitleFromVar = noteTitle;
                                        isSeriesCard = true;
                                        console.log(`✅ [BUTTON SERIES FIX] Titre trouvé par comparaison de base pour animeId=${animeId}: "${cardTitleFromVar}"`);
                                    }
                                }
                            }
                            
                            // Log de débogage pour toutes les cartes de séries avec saisons
                            if (isSeriesTop10 || isSeriesCard) {
                                console.log(`🔍 [BUTTON DEBUG SERIES] Comparaison pour animeId=${animeId}, top10Title="${top10Title}", cardTitle="${cardTitleFromVar}", cardContentType=${cardContentType}, top10ContentTypeCheck=${top10ContentTypeCheck}`);
                            }
                            
                            // TOUJOURS extraire les titres de base pour la comparaison
            // IMPORTANT: Si le top 10 contient une série avec saisons, TOUJOURS utiliser le titre depuis les notes
            // pour améliorer la comparaison, AVANT d'extraire les titres de base
            // Cela permet de détecter les autres saisons même si le titre de la carte est incorrect
            if (isSeriesTop10 && user && user.email) {
                const notes = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
                const noteForCard = notes.find(n => String(n.id) === String(animeId));
                if (noteForCard) {
                    const noteTitle = noteForCard.titre || noteForCard.title || noteForCard.name || '';
                    if (noteTitle) {
                        // Toujours utiliser le titre depuis les notes si le top 10 contient une série avec saisons
                        const oldTitle = cardTitleFromVar;
                        cardTitleFromVar = noteTitle;
                        // Re-vérifier si c'est une série avec saisons maintenant qu'on a le bon titre
                        isSeriesCard = isSeriesWithMultipleSeasons(noteTitle);
                        console.log(`🔧 [BUTTON SERIES] Titre utilisé depuis les notes pour comparaison: animeId=${animeId}, oldTitle="${oldTitle}", newTitle="${noteTitle}", isSeriesCard=${isSeriesCard}`);
                        
                        // Log pour TOUS les IDs High School DxD et Shokugeki
                        const seriesIds = ['24703', '15451', '34281', '32282', '28171', '36949', '43608'];
                        if (seriesIds.includes(String(animeId))) {
                            console.log(`🔍 [BUTTON SERIES DEBUG] ID=${animeId}, top10Title="${top10Title}", noteTitle="${noteTitle}", isSeriesTop10=${isSeriesTop10}, isSeriesCard=${isSeriesCard}`);
                        }
                    } else {
                        console.log(`⚠️ [BUTTON SERIES] Note trouvée pour animeId=${animeId} mais titre vide`);
                    }
                } else {
                    // Log pour déboguer si la note n'est pas trouvée - pour TOUS les IDs de séries
                    const seriesIds = ['24703', '15451', '34281', '32282', '28171', '36949'];
                    if (seriesIds.includes(String(animeId))) {
                        console.log(`⚠️ [BUTTON SERIES DEBUG] Note NON trouvée pour animeId=${animeId} dans localStorage. Nombre total de notes: ${notes.length}`);
                        console.log(`⚠️ [BUTTON SERIES DEBUG] IDs disponibles:`, notes.map(n => ({ id: n.id, titre: n.titre || n.title || n.name })));
                    }
                }
            }
            
            // Log pour TOUS les IDs High School DxD et Shokugeki même si isSeriesTop10 est false
            const seriesIds = ['24703', '15451', '34281', '32282', '28171', '36949'];
            if (seriesIds.includes(String(animeId))) {
                console.log(`🔍 [BUTTON SERIES ALL] ID=${animeId}, cardTitle="${cardTitleFromVar}", isSeriesTop10=${isSeriesTop10}, top10Title="${top10Title || 'N/A'}"`);
            }
                            
                            // TOUJOURS extraire les titres de base pour la comparaison
                            // Utiliser le contentType approprié (anime ou manga)
                            const contentTypeForExtraction = cardContentType || 'anime';
                            const top10BaseTitle = extractBaseAnimeTitle(top10Title, contentTypeForExtraction);
                            let cardBaseTitle = extractBaseAnimeTitle(cardTitleFromVar, contentTypeForExtraction);
                            
                            // Log pour les séries avec saisons : afficher les titres de base extraits
                            if (isSeriesTop10 || isSeriesCard) {
                                console.log(`🔍 [BUTTON DEBUG SERIES] Titres de base extraits - top10BaseTitle="${top10BaseTitle}", cardBaseTitle="${cardBaseTitle}"`);
                            }
                            
                            // Si le top 10 contient une série avec saisons, TOUJOURS comparer les titres de base
                            // même si la carte n'est pas détectée comme une série avec saisons
                            if (isSeriesTop10 || (top10BaseTitle && cardBaseTitle)) {
                                // Normaliser les titres pour la comparaison (minuscules, sans espaces multiples)
                                const normalizedTop10Base = (top10BaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                const normalizedCardBase = (cardBaseTitle || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                
                                // Si les titres de base correspondent exactement, masquer le bouton
                                if (normalizedTop10Base && normalizedCardBase && 
                                    normalizedTop10Base === normalizedCardBase && normalizedTop10Base.length > 0) {
                                    console.log(`✅ [BUTTON HIDE] Titres de base identiques: "${top10BaseTitle}" === "${cardBaseTitle}"`);
                                    return true;
                                } else if (isSeriesTop10 || isSeriesCard) {
                                    console.log(`🔍 [BUTTON DEBUG SERIES] Titres de base différents: "${top10BaseTitle}" vs "${cardBaseTitle}" (normalisés: "${normalizedTop10Base}" vs "${normalizedCardBase}")`);
                                    
                                    // Pour les séries avec saisons, vérifier aussi si les préfixes correspondent
                                    // Déterminer la longueur minimale selon la série
                                    let minPrefixLength;
                                    if (normalizedTop10Base.includes('high school dxd') || normalizedCardBase.includes('high school dxd')) {
                                        // Pour High School DxD, utiliser 18 caractères minimum
                                        minPrefixLength = 18;
                                    } else {
                                        // Pour Shokugeki no Souma, utiliser 15 caractères minimum
                                        minPrefixLength = 15;
                                    }
                                    
                                    const prefixLength = Math.min(minPrefixLength, Math.min(normalizedTop10Base.length, normalizedCardBase.length));
                                    if (prefixLength >= minPrefixLength) {
                                        const top10Prefix = normalizedTop10Base.substring(0, prefixLength);
                                        const cardPrefix = normalizedCardBase.substring(0, prefixLength);
                                        if (top10Prefix === cardPrefix) {
                                            console.log(`✅ [BUTTON HIDE SERIES] Préfixes identiques détectés: "${top10Prefix}"`);
                                            return true;
                                        } else if (isSeriesTop10 || isSeriesCard) {
                                            console.log(`🔍 [BUTTON DEBUG SERIES] Préfixes différents: "${top10Prefix}" vs "${cardPrefix}"`);
                                        }
                                    }
                                }
                            } else if (isSeriesTop10 || isSeriesCard) {
                                console.log(`⚠️ [BUTTON DEBUG SERIES] Titres de base manquants: top10BaseTitle=${!!top10BaseTitle}, cardBaseTitle=${!!cardBaseTitle}`);
                            }
                            
                            // Si les titres sont similaires (même série sans indication explicite de saison), masquer le bouton
                            if (areAnimeTitlesSimilar(top10Title, cardTitleFromVar, contentTypeForExtraction)) {
                                console.log(`✅ [BUTTON HIDE] Cartes similaires détectées via areAnimeTitlesSimilar (${contentTypeForExtraction}): "${top10Title}" vs "${cardTitleFromVar}"`);
                                return true;
                            } else if (isSeriesTop10 || isSeriesCard) {
                                // Log spécifique pour les séries si la comparaison échoue
                                console.log(`🔍 [BUTTON DEBUG SERIES] areAnimeTitlesSimilar retourné false pour: "${top10Title}" vs "${cardTitleFromVar}"`);
                                console.log(`🔍 [BUTTON DEBUG SERIES] Titres de base: "${top10BaseTitle}" vs "${cardBaseTitle}"`);
                            }
                            
                            // IMPORTANT: Si le top 10 contient une série avec saisons, TOUJOURS comparer les titres bruts par préfixe
                            // même si la carte n'est pas détectée comme une série avec saisons
                            // Cela permet de détecter les autres saisons même si le titre de la carte est incorrect
                            if (isSeriesTop10) {
                                // Toujours utiliser le titre depuis les notes si disponible pour améliorer la comparaison
                                if (user && user.email && !isSeriesCard) {
                                    const notes = JSON.parse(localStorage.getItem('user_content_notes_' + user.email) || '[]');
                                    const noteForCard = notes.find(n => String(n.id) === String(animeId));
                                    if (noteForCard) {
                                        const noteTitle = noteForCard.titre || noteForCard.title || noteForCard.name || '';
                                        if (noteTitle) {
                                            cardTitleFromVar = noteTitle;
                                        }
                                    }
                                }
                                
                                const normalizedTop10Raw = top10Title.toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                const normalizedCardRaw = cardTitleFromVar.toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                
                                // Si les titres normalisés correspondent (sans tenir compte de la casse et des espaces)
                                if (normalizedTop10Raw.length > 5 && normalizedCardRaw.length > 5) {
                                    // Déterminer la longueur du préfixe selon la série
                                    let prefixLength;
                                    if (normalizedTop10Raw.includes('high school dxd')) {
                                        // Pour High School DxD, utiliser 18 caractères pour capturer "high school dxd"
                                        prefixLength = Math.min(18, Math.min(normalizedTop10Raw.length, normalizedCardRaw.length));
                                    } else {
                                        // Pour Shokugeki no Souma, comparer les 15 premiers caractères
                                        prefixLength = Math.min(15, Math.min(normalizedTop10Raw.length, normalizedCardRaw.length));
                                    }
                                    
                                    const top10Prefix = normalizedTop10Raw.substring(0, prefixLength);
                                    const cardPrefix = normalizedCardRaw.substring(0, prefixLength);
                                    
                                    // Vérifier si un titre commence par l'autre (indique une série avec saison/partie)
                                    // OU si les préfixes correspondent (même série)
                                    if (normalizedTop10Raw.startsWith(cardPrefix) || 
                                        normalizedCardRaw.startsWith(top10Prefix) ||
                                        (prefixLength >= 15 && top10Prefix === cardPrefix)) {
                                        console.log(`✅ [BUTTON HIDE SERIES] Préfixes similaires détectés dans titres bruts: "${top10Title}" vs "${cardTitleFromVar}" (préfixe: "${top10Prefix}" vs "${cardPrefix}")`);
                                        return true;
                                    } else {
                                        console.log(`🔍 [BUTTON DEBUG SERIES] Préfixes bruts différents: "${top10Prefix}" vs "${cardPrefix}"`);
                                    }
                                }
                            } else if (isSeriesCard) {
                                // Si seule la carte est une série avec saisons (mais pas le top 10), faire une comparaison normale
                                const normalizedTop10Raw = top10Title.toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                const normalizedCardRaw = cardTitleFromVar.toLowerCase().trim().replace(/\s+/g, ' ').replace(/×/g, 'x');
                                
                                if (normalizedTop10Raw.length > 5 && normalizedCardRaw.length > 5) {
                                    let prefixLength;
                                    if (normalizedCardRaw.includes('high school dxd')) {
                                        prefixLength = Math.min(18, Math.min(normalizedTop10Raw.length, normalizedCardRaw.length));
                                    } else {
                                        prefixLength = Math.min(15, Math.min(normalizedTop10Raw.length, normalizedCardRaw.length));
                                    }
                                    
                                    const top10Prefix = normalizedTop10Raw.substring(0, prefixLength);
                                    const cardPrefix = normalizedCardRaw.substring(0, prefixLength);
                                    
                                    if (normalizedTop10Raw.startsWith(cardPrefix) || 
                                        normalizedCardRaw.startsWith(top10Prefix) ||
                                        (prefixLength >= 15 && top10Prefix === cardPrefix)) {
                                        console.log(`✅ [BUTTON HIDE SERIES] Préfixes similaires détectés: "${top10Title}" vs "${cardTitleFromVar}"`);
                                        return true;
                                    }
                                }
                            }
                        }
                    } else if (animeId === '9253' || (cardTitle && (cardTitle.toLowerCase().includes('shokugeki') || cardTitle.toLowerCase().includes('steins')))) {
                        // Log de débogage pour comprendre pourquoi la comparaison ne s'exécute pas
                        console.log(`⚠️ [BUTTON DEBUG] Comparaison SKIPPÉE pour animeId=${animeId}, cardContentType=${cardContentType}, top10ContentTypeCheck=${top10ContentTypeCheck}, type=${type}`);
                    }
                    
                    // Pour les films UNIQUEMENT, comparer aussi par titre de base et similarité
                    // MAIS seulement si les deux sont des films (pas d'anime)
                    if (type === 'film' && top10ContentTypeCheck === 'film' && cardContentType === 'film') {
                        const top10Title = a.titre || a.title || a.name || '';
                        const top10BaseTitle = extractBaseAnimeTitle(top10Title, 'film');
                        const cardBaseTitle = extractBaseAnimeTitle(cardTitle, 'film');
                        // Si les titres de base correspondent exactement, masquer le bouton
                        if (top10BaseTitle && cardBaseTitle && top10BaseTitle === cardBaseTitle) {
                            return true;
                        }
                        // Pour les films, ne PAS utiliser la similarité, seulement la comparaison exacte par titre de base
                        // (Les films ne doivent être comparés que par ID ou titre de base identique)
                    }
                    
                    // Pour les mangas et autres types, comparer aussi par titre exact si l'ID ne correspond pas
                    if (top10Id !== cardId && cardTitle) {
                        const top10Title = a.titre || a.title || a.name || '';
                        // Comparaison exacte du titre (insensible à la casse)
                        if (top10Title && cardTitle && top10Title.toLowerCase().trim() === cardTitle.toLowerCase().trim()) {
                            return true;
                        }
                    }
                    
                    return false;
                });
                shouldHideButton = isInGlobalTop10Check;
            }
        }
        const mainMoreBtn = card.querySelector('.card-more-btn');
        const mainMoreMenu = card.querySelector('.card-more-menu');
        if (mainMoreBtn) {
            // Ne pas masquer les boutons dans le top 10 (ils ont l'attribut data-in-top10 ou data-top10-button)
            const isInTop10Slot = mainMoreBtn.hasAttribute('data-in-top10') || 
                                  mainMoreBtn.hasAttribute('data-top10-button') ||
                                  card.closest('[id^="catalogue-card-"]') !== null ||
                                  card.closest('.top10-slot') !== null;
            
            if (shouldHideButton && !isInTop10Slot) {
                console.log(`🔘 [BUTTON HIDE REFRESH] Masquage du bouton pour la carte ${animeId}`);
                mainMoreBtn.style.setProperty('display', 'none', 'important');
                mainMoreBtn.style.setProperty('visibility', 'hidden', 'important');
                mainMoreBtn.style.setProperty('opacity', '0', 'important');
                mainMoreBtn.style.setProperty('pointer-events', 'none', 'important');
            } else if (!shouldHideButton && !isInTop10Slot) {
                mainMoreBtn.style.removeProperty('display');
                mainMoreBtn.style.removeProperty('visibility');
                mainMoreBtn.style.removeProperty('opacity');
                mainMoreBtn.style.removeProperty('pointer-events');
            }
        }
        if (mainMoreMenu) {
            mainMoreMenu.style.display = 'none';
            mainMoreMenu.style.opacity = '0';
            mainMoreMenu.style.pointerEvents = 'none';
            mainMoreMenu.style.visibility = 'hidden';
        }
        let selectBtn = card.querySelector('.select-top10-btn');
        if (selectBtn) {
            // Dans les containers de genre, toujours afficher l'option "Ajouter au top 10"
            // car on veut permettre de changer la position dans le top 10
            if (isInGenreContainer) {
                selectBtn.style.display = 'block';
            } else {
                if (shouldHideButton) {
                    selectBtn.style.display = 'none';
                    selectBtn.style.visibility = 'hidden';
                    selectBtn.style.opacity = '0';
                    selectBtn.style.pointerEvents = 'none';
                } else {
                    selectBtn.style.display = 'block';
                    selectBtn.style.visibility = '';
                    selectBtn.style.opacity = '';
                    selectBtn.style.pointerEvents = 'auto';
                }
            }
        }
    }
    // Mettre à jour toutes les cartes de manière asynchrone
    const allCardsToUpdate = [
        ...document.querySelectorAll('.catalogue-card[data-anime-id]'),
        ...document.querySelectorAll('#genre-filtered-container .catalogue-card[data-anime-id]'),
        ...document.querySelectorAll('#genre-cards-container .catalogue-card[data-anime-id]')
    ];
    
    console.log(`🔄 [REFRESH BUTTONS] Mise à jour de ${allCardsToUpdate.length} cartes...`);
    
    // Log des IDs des cartes trouvées pour déboguer
    const cardIds = allCardsToUpdate.map(card => card.getAttribute('data-anime-id'));
    console.log(`🔍 [REFRESH BUTTONS] IDs des cartes trouvées:`, cardIds);
    
    // Vérifier si les IDs High School DxD et Shokugeki sont présents
    const dxdIds = ['24703', '15451', '34281'];
    const shokugekiIds = ['32282', '28171', '36949'];
    const foundDxdIds = cardIds.filter(id => dxdIds.includes(id));
    const foundShokugekiIds = cardIds.filter(id => shokugekiIds.includes(id));
    
    if (foundDxdIds.length > 0) {
        console.log(`🔍 [REFRESH BUTTONS] IDs High School DxD trouvés dans le DOM:`, foundDxdIds);
    } else {
        console.log(`⚠️ [REFRESH BUTTONS] Aucun ID High School DxD trouvé dans le DOM. IDs attendus:`, dxdIds);
    }
    
    if (foundShokugekiIds.length > 0) {
        console.log(`🔍 [REFRESH BUTTONS] IDs Shokugeki trouvés dans le DOM:`, foundShokugekiIds);
    } else {
        console.log(`⚠️ [REFRESH BUTTONS] Aucun ID Shokugeki trouvé dans le DOM. IDs attendus:`, shokugekiIds);
    }
    
    Promise.all(allCardsToUpdate.map(card => updateCardMoreButton(card))).then(() => {
        console.log(`✅ [REFRESH BUTTONS] Toutes les cartes ont été mises à jour`);
    }).catch(err => {
        console.error(`❌ [REFRESH BUTTONS] Erreur lors de la mise à jour des cartes:`, err);
    });
    
    // Réinitialiser le flag après le rafraîchissement
    isRefreshingButtons = false;
}

// Fonction pour réorganiser les cartes avec Masonry après chaque filtrage
function relayoutMasonry() {
    // Pour chaque container d'anime cards
    document.querySelectorAll('[id^="star-containers"]').forEach(container => {
        // Détruit l'ancien Masonry si déjà appliqué
        if (container._masonryInstance) {
            container._masonryInstance.destroy();
        }
        // Applique Masonry
        container._masonryInstance = new Masonry(container, {
            itemSelector: '.catalogue-card',
            columnWidth: '.catalogue-card',
            percentPosition: true,
            gutter: 0 // totalement collées
        });
    });
}







// Fonction utilitaire pour générer une pagination compacte (ordre croissant ou décroissant)
function getCompactPagination(current, total, reverse = false) {
    let pages = [];
    if (total <= 3) {
        for (let i = 1; i <= total; i++) pages.push(i);
    } else if (!reverse) {
        if (current <= 2) {
            pages.push(1, 2, 3, '...', total - 1, total);
        } else if (current >= total - 1) {
            pages.push(1, 2, '...', total - 2, total - 1, total);
        } else {
            pages.push(1, '...', current - 1, current, current + 1, '...', total);
        }
    } else {
        // Pagination inversée
        if (current >= total - 1) {
            pages.push(total, total - 1, total - 2, '...', 2, 1);
        } else if (current <= 2) {
            pages.push(total, '...', current + 1, current, current - 1, '...', 1);
        } else {
            pages.push(total, '...', total - current + 1, total - current, total - current - 1, '...', 1);
        }
        // Nettoyage pour éviter doublons ou pages hors bornes
        pages = pages.filter((v, i, arr) => v !== '...' || (i > 0 && arr[i - 1] !== '...')).filter(v => typeof v === 'number' ? v >= 1 && v <= total : true);
    }
    if (reverse) pages = pages.sort((a, b) => (b === '...' ? 1 : 0) - (a === '...' ? 1 : 0) || b - a);
    return pages;
}

// === Ajout : fonction pour trier les anime cards du container de genre ===
function sortGenreContainer(orderType) {
    const genreContainer = document.getElementById('genre-cards-container') || document.querySelector('#genre-filtered-container .genre-filtered-cards');
    if (!genreContainer) return;
    // Récupérer toutes les cartes
    const cards = Array.from(genreContainer.querySelectorAll('.catalogue-card[data-anime-id]'));
    // Extraire la note de chaque carte
    cards.sort((a, b) => {
        let noteA = a.querySelector('div[style*="Note:"]')?.textContent.match(/Note: (\d+)/);
        let noteB = b.querySelector('div[style*="Note:"]')?.textContent.match(/Note: (\d+)/);
        noteA = noteA ? parseInt(noteA[1], 10) : 0;
        noteB = noteB ? parseInt(noteB[1], 10) : 0;
        if (orderType === 'asc') return noteA - noteB;
        else return noteB - noteA;
    });
    // Réordonner les cartes dans le DOM
    cards.forEach(card => genreContainer.appendChild(card));
}

// Dans updateOrderMenuContext, remplacer le handler du menu déroulant :
function updateOrderMenuContext() {
    const orderMenu = document.getElementById('order-desc-menu');
    if (!orderMenu) return;
    // Si aucun genre sélectionné → menu simple (juste décroissant/croissant)
    // Utiliser window.selectedGenres (array) au lieu de window.selectedGenre (deprecated)
    const hasSelectedGenres = window.selectedGenres && Array.isArray(window.selectedGenres) && window.selectedGenres.length > 0;
    if (!hasSelectedGenres) {
        orderMenu.innerHTML = `
            <div class="order-menu-item" data-order="desc" style="padding: 10px 22px; cursor: pointer; background: #00b89422; color: #00b894; font-weight: bold;">${_profileT('profile.order_desc')}</div>
            <div class="order-menu-item" data-order="asc" style="padding: 10px 22px; cursor: pointer;">${_profileT('profile.order_asc')}</div>
        `;
        const orderButton = document.getElementById('order-desc-btn');
        if (orderButton) {
            orderButton.textContent = _profileT('profile.order_desc');
            orderButton.dataset.order = 'desc';
        }
    } else {
        orderMenu.innerHTML = `
            <div class="order-menu-item" data-order="desc" style="padding: 10px 22px; cursor: pointer; background: #00b89422; color: #00b894; font-weight: bold;">${_profileT('profile.order_desc')}</div>
            <div class="order-menu-item" data-order="asc" style="padding: 10px 22px; cursor: pointer;">${_profileT('profile.order_asc')}</div>
`;
    }
    orderMenu.querySelectorAll('.order-menu-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            orderMenu.style.display = 'none';
            currentOrder = item.dataset.order;
            const orderButton = document.getElementById('order-desc-btn');
            if (orderButton) {
                orderButton.dataset.order = currentOrder;
                switch(currentOrder) {
                    case 'desc':
                        orderButton.textContent = _profileT('profile.order_desc');
                        break;
                    case 'asc':
                        orderButton.textContent = _profileT('profile.order_asc');
                        break;
                }
            }
            orderMenu.querySelectorAll('.order-menu-item').forEach(opt => {
                if(opt.dataset.order === currentOrder) {
                    opt.style.background = '#00b89422';
                    opt.style.color = '#00b894';
                    opt.style.fontWeight = 'bold';
                } else {
                    opt.style.background = '';
                    opt.style.color = '';
                    opt.style.fontWeight = '';
                }
            });
            // === Correction : tri dynamique pour container de genre ===
            // Utiliser window.selectedGenres (array) au lieu de window.selectedGenre (deprecated)
            const hasSelectedGenres = window.selectedGenres && Array.isArray(window.selectedGenres) && window.selectedGenres.length > 0;
            
            if (hasSelectedGenres && (item.dataset.order === 'desc' || item.dataset.order === 'asc')) {
                window.genreSortOrder = item.dataset.order;
                console.log(`🔄 Tri changé pour containers de genre: ${window.genreSortOrder}`);
                applyGenreFilter();
            } else if (!hasSelectedGenres && (item.dataset.order === 'desc' || item.dataset.order === 'asc')) {
                sortStarContainers(item.dataset.order);
            }
        });
    });
}

// Appeler updateOrderMenuContext au chargement initial pour garantir la cohérence
document.addEventListener('DOMContentLoaded', function() {
    updateOrderMenuContext();
});

// === Ajout : fonction pour ajouter une date d'ajout à chaque note si elle n'existe pas ===
function ensureAnimeNotesHaveAddDate() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) return;
    
    // Vérifier la clé unifiée
    const unifiedNotesKey = 'user_content_notes_' + user.email;
    let unifiedNotes = [];
    try {
        unifiedNotes = JSON.parse(localStorage.getItem(unifiedNotesKey) || '[]');
    } catch (e) { unifiedNotes = []; }
    
    let changed = false;
    unifiedNotes.forEach(note => {
        if (!note.addedAt) {
            note.addedAt = Date.now();
            changed = true;
        }
    });
    if (changed) {
        localStorage.setItem(unifiedNotesKey, JSON.stringify(unifiedNotes));
        console.log('✅ Dates d\'ajout ajoutées aux notes unifiées');
    }
    
    // Vérifier aussi l'ancienne clé pour compatibilité
    const notesKey = 'user_anime_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) { notes = []; }
    changed = false;
    notes.forEach(note => {
        if (!note.addedAt) {
            note.addedAt = Date.now();
            changed = true;
        }
    });
    if (changed) {
        localStorage.setItem(notesKey, JSON.stringify(notes));
        console.log('✅ Dates d\'ajout ajoutées aux notes anime');
    }
}
// Appelle cette fonction au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureAnimeNotesHaveAddDate);
} else {
    ensureAnimeNotesHaveAddDate();
}
// === Ajout : lors de l'ajout d'un anime dans les notes, stocke la date d'ajout ===
// (Patch setUserTop10 et tous les endroits où on ajoute une note si besoin)

// === Patch : Ajout d'un anime dans les notes avec date d'ajout ===
function addOrUpdateAnimeNoteWithDate(user, anime) {
    if (!user || !user.email || !anime) return;
    const notesKey = 'user_anime_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) { notes = []; }
    const idx = notes.findIndex(a => String(a.id) === String(anime.id));
    if (idx === -1) {
        // Nouvel ajout : on ajoute la date d'ajout
        anime.addedAt = Date.now();
        notes.push(anime);
    } else {
        // Déjà présent : on conserve la date d'ajout existante
        if (!notes[idx].addedAt) notes[idx].addedAt = Date.now();
        notes[idx] = { ...notes[idx], ...anime, addedAt: notes[idx].addedAt };
    }
    localStorage.setItem(notesKey, JSON.stringify(notes));
}

// === Fonction pour synchroniser les notes depuis animeRatings ===
function syncNotesFromRatings() {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            if (!user || !user.email) return;
            
    const notesKey = 'user_anime_notes_' + user.email;
    const animeRatings = JSON.parse(localStorage.getItem('animeRatings') || '{}');
            
    console.log('🔄 Synchronisation des notes depuis animeRatings:', animeRatings);
    
    // Récupérer les notes existantes
            let notes = [];
            try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
            } catch (e) { notes = []; }
            
    // Pour chaque note dans animeRatings, l'ajouter aux notes utilisateur
    Object.entries(animeRatings).forEach(([animeId, rating]) => {
        if (rating && rating > 0) {
            // Chercher si l'anime existe déjà dans les notes
            const existingIndex = notes.findIndex(n => String(n.id) === String(animeId));
            
            // Créer l'objet anime avec les informations de base
            const animeData = {
                id: animeId,
                note: Number(rating),
                addedAt: Date.now()
            };
            
            // Ajouter les informations spécifiques selon l'ID
            if (animeId === 'fullmetal' || animeId === '5') {
                animeData.titre = 'Fullmetal Alchemist';
                animeData.image = 'https://cdn.myanimelist.net/images/anime/10/47347.jpg';
                animeData.synopsis = 'Les frères Elric utilisent l\'alchimie pour tenter de ressusciter leur mère, mais le rituel échoue et coûte cher à Edward.';
                animeData.genres = ['Action', 'Aventure', 'Drame', 'Fantasy', 'Shonen'];
                animeData.isManga = true;
            } else {
                // Pour les autres animes, utiliser des valeurs par défaut
                animeData.titre = `Anime ${animeId}`;
                animeData.image = '';
                animeData.synopsis = 'Synopsis non disponible';
                animeData.genres = ['Genre inconnu'];
            }
            
            if (existingIndex !== -1) {
                // Mettre à jour seulement la note, pas les autres données
                notes[existingIndex].note = Number(rating);
                notes[existingIndex].addedAt = Date.now();
            } else {
                // Ajouter une nouvelle note seulement si elle n'existe pas déjà
                notes.push(animeData);
            }
        }
    });
    
    // Sauvegarder les notes mises à jour
    localStorage.setItem(notesKey, JSON.stringify(notes));
    console.log('✅ Notes synchronisées:', notes);
    
    return notes;
}

// Écouter les changements dans animeRatings pour synchroniser automatiquement
window.addEventListener('storage', function(e) {
    if (e.key === 'animeRatings') {
        console.log('🔄 Changement détecté dans animeRatings, synchronisation...');
        syncNotesFromRatings();
        // Recharger l'affichage si on est sur la page profil
        if (window.location.pathname.includes('profil.html')) {
            setTimeout(() => {
                if (!isDisplayingNotes) {
                    displayUserAnimeNotes();
                }
            }, 200);
        }
    }
    
    // Écouter les changements dans les notes supprimées pour nettoyer le top 10
    if (e.key && e.key.includes('deleted_content_notes_')) {
        console.log('🔄 Changement détecté dans les notes supprimées, nettoyage du top 10...');
        setTimeout(() => {
            cleanTop10FromRemovedNotes().catch(err => {
                console.error('❌ Erreur lors du nettoyage du top 10:', err);
            });
        }, 100);
    }
    
});

// Écouter l'événement personnalisé de suppression de note
window.addEventListener('noteDeleted', function(e) {
    console.log('🔄 [profile-anime-cards] Événement noteDeleted reçu:', e.detail);
    console.log('🔄 [profile-anime-cards] Type d\'événement:', e.type);
    console.log('🔄 [profile-anime-cards] Timestamp:', new Date().toISOString());
    
    const { contentId, contentType, user } = e.detail;
    
    if (!contentId || !contentType || !user) {
        console.log('❌ [profile-anime-cards] Données d\'événement incomplètes:', { contentId, contentType, user });
        return;
    }
    
    console.log(`🧹 [profile-anime-cards] Démarrage du nettoyage pour ${contentType} ${contentId}`);
    
    // Nettoyage immédiat et spécifique
    if (typeof cleanTop10FromSpecificNote === 'function') {
        console.log('✅ [profile-anime-cards] Fonction cleanTop10FromSpecificNote trouvée, appel...');
        cleanTop10FromSpecificNote(contentId, contentType, user).catch(err => {
            console.error('❌ [profile-anime-cards] Erreur lors du nettoyage du top 10:', err);
        });
    } else {
        console.warn('⚠️ [profile-anime-cards] Fonction cleanTop10FromSpecificNote non disponible');
    }
    
    // Nettoyage général après un délai
    setTimeout(() => {
        if (typeof cleanTop10FromRemovedNotes === 'function') {
            cleanTop10FromRemovedNotes().catch(err => {
                console.error('❌ [profile-anime-cards] Erreur lors du nettoyage général du top 10:', err);
            });
        }
    }, 100);
});

console.log('✅ [profile-anime-cards] Écouteur noteDeleted installé');

// Fonction pour nettoyer le top 10 d'une note spécifique
async function cleanTop10FromSpecificNote(contentId, contentType, user) {
    console.log(`🧹 Nettoyage immédiat du top 10 pour ${contentType} ${contentId}`);
    console.log(`🔍 Détails de la suppression:`, { contentId, contentType, user: user?.email });
    
    if (!user || !user.email) {
        console.log('❌ Utilisateur non valide, arrêt du nettoyage immédiat');
        return Promise.resolve();
    }
    
    // Rendre la fonction disponible globalement avec la logique complète
    window.cleanTop10FromSpecificNote = cleanTop10FromSpecificNote;
    
    // Nettoyer TOUS les Top 10 en parcourant toutes les clés localStorage
    // On retire toujours la carte car l'événement noteDeleted est déclenché APRÈS la suppression
    const top10Prefix = 'user_top10_' + user.email;
    let totalCleaned = 0;
    
    console.log(`🔍 Recherche de ${contentId} (${contentType}) dans tous les top 10...`);
    
    // Parcourir toutes les clés localStorage
    console.log(`🔍 Recherche des clés commençant par: ${top10Prefix}`);
    let keysFound = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(top10Prefix)) continue;
        
        keysFound++;
        console.log(`🔍 Clé trouvée: ${key}`);
        
        try {
            const top10 = JSON.parse(localStorage.getItem(key) || '[]');
            if (!Array.isArray(top10)) {
                console.log(`⚠️ ${key} n'est pas un tableau, ignoré`);
                continue;
            }
            
            let hasChanges = false;
            const cleanedTop10 = top10.map((item, index) => {
                if (!item) return null;
                
                // Comparer par ID - si l'ID correspond, retirer la carte
                // (car une carte dans le top 10 doit toujours avoir une note correspondante)
                const itemId = String(item.id);
                const targetId = String(contentId);
                
                if (itemId === targetId) {
                    const itemContentType = item.contentType || 'anime';
                    console.log(`🗑️ Suppression de ${item.titre || item.title || item.name || itemId} (${itemContentType}) du Top 10: ${key} (position ${index})`);
                    hasChanges = true;
                    return null;
                }
                
                return item;
            });
            
            if (hasChanges) {
                localStorage.setItem(key, JSON.stringify(cleanedTop10));
                totalCleaned++;
                console.log(`✅ Top 10 mis à jour: ${key}`);
            } else {
                console.log(`ℹ️ Aucun changement pour ${key}`);
            }
        } catch (e) {
            console.error(`❌ Erreur lors du nettoyage de ${key}:`, e);
        }
    }
    
    console.log(`🔍 Total de clés top10 trouvées: ${keysFound}`);
    
    // Nettoyer aussi depuis Firebase si disponible
    if (typeof window.firebaseTop10Service !== 'undefined' && window.firebaseTop10Service) {
        try {
            const allTop10Data = await window.firebaseTop10Service.getTop10(user.email);
            const itemsToDelete = allTop10Data.filter(item => String(item.id) === String(contentId));
            
            for (const item of itemsToDelete) {
                await window.firebaseTop10Service.deleteTop10Item(user.email, item.id, item.contentType || 'anime');
                console.log(`🗑️ Suppression depuis Firebase: ${item.id}`);
            }
        } catch (err) {
            console.error('Erreur lors du nettoyage Firebase:', err);
        }
    }
    
    console.log(`✅ Nettoyage terminé: ${totalCleaned} Top 10 nettoyé(s)`);
    
    // Déclencher un événement pour mettre à jour l'affichage
    if (totalCleaned > 0) {
        const updateEvent = new CustomEvent('top10Updated', {
            detail: { reason: 'noteDeleted', contentId, contentType }
        });
        document.dispatchEvent(updateEvent);
        console.log('🔄 Événement top10Updated déclenché');
        
        // Marquer que le top 10 a été mis à jour pour rafraîchir au retour sur le profil
        localStorage.setItem('top10_updated', 'true');
    }
    
    // Rafraîchir l'affichage si on est sur la page profil
    if (window.location.pathname.includes('profil.html') || window.location.pathname.includes('profil')) {
        setTimeout(() => {
            // Sauvegarder les valeurs actuelles
            const currentGenre = window.selectedGenre;
            const currentType = window.selectedType;
            
            // Forcer la mise à jour du top 10 global (sans filtre de genre/type)
            window.selectedGenres = [];
            window.selectedType = null;
            renderTop10Slots();
            
            // Restaurer les valeurs et mettre à jour l'affichage selon le filtre actuel
            window.selectedGenres = Array.isArray(currentGenre) ? currentGenre : (currentGenre ? [currentGenre] : []);
            window.selectedType = currentType;
            
            // Si un genre est sélectionné, temporairement rendre les containers visibles pour la mise à jour
            if (currentGenre) {
                // Rendre temporairement les containers d'étoiles visibles
                const allContainers = document.querySelector('.all-star-containers');
                if (allContainers) {
                    allContainers.style.display = 'block';
                }
                const starGroups = document.querySelectorAll('.star-rating-group');
                starGroups.forEach(group => {
                    group.style.display = 'block';
                });
                const allStarContainers = document.querySelectorAll('[id^="star-containers"]');
                allStarContainers.forEach(container => {
                    container.style.display = 'flex';
                });
            }
            
            // Toujours mettre à jour les containers d'étoiles d'abord
            if (!isDisplayingNotes) {
                displayUserAnimeNotes();
            }
            
            // Si un genre est sélectionné, réappliquer le filtre après la mise à jour
            if (currentGenre) {
                setTimeout(() => {
                    applyGenreFilter();
                }, 300);
            }
        }, 50);
    }
    
    console.log('✅ Nettoyage immédiat terminé');
}

// Rendre la fonction accessible globalement
window.cleanTop10FromSpecificNote = cleanTop10FromSpecificNote;

// Message d'aide lors des 5 premiers drag & drop dans le top 10
if (!localStorage.getItem('dragHelpCount')) {
    localStorage.setItem('dragHelpCount', '0');
}
// Les événements drop sont maintenant configurés dans renderTop10Slots()

// Écouter les mises à jour du top 10
// Protection contre les boucles infinies avec un flag
let top10UpdateInProgress = false;

document.addEventListener('top10Updated', function(e) {
    // Rafraîchir l'affichage du top 10 avec protection contre les boucles infinies
    if (isRenderingTop10 || top10UpdateInProgress) {
        return; // Ignorer silencieusement pour éviter les logs infinis
    }
    
    top10UpdateInProgress = true;
    
    setTimeout(() => {
        if (!isRenderingTop10) {
            renderTop10Slots();
        }
        top10UpdateInProgress = false;
        
        // Réattacher tous les événements des boutons "..." après le rafraîchissement
        setTimeout(() => {
            if (typeof attachCardEvents === 'function') {
                attachCardEvents();
            }
        }, 300);
    }, 50); // Délai réduit à 50ms pour affichage plus rapide
    
    // Ne pas appeler displayUserAnimeNotes ici pour éviter les boucles infinies
    // L'affichage sera mis à jour automatiquement par renderTop10Slots
});

// Patch sur l'event 'dragstart' des catalogue-card (cartes d'anime)
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.catalogue-card[data-anime-id]').forEach(card => {
        card.addEventListener('dragstart', function(e) {
            // Autoriser le drag uniquement si la carte est sélectionnée
            if (window.selectedTop10Card !== card) {
                e.preventDefault();
                // Message d'aide optionnel
                if (!document.getElementById('drag-select-help-msg')) {
                    const helpMsg = document.createElement('div');
                    helpMsg.id = 'drag-select-help-msg';
                    helpMsg.textContent = 'Clique d\'abord sur "Ajouter au top 10" pour pouvoir déplacer cette carte !';
                    helpMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#ff6b6b;color:#fff;padding:12px 28px;border-radius:12px;font-size:1.05rem;z-index:9999;box-shadow:0 2px 12px #ff6b6b77;';
                    document.body.appendChild(helpMsg);
                    setTimeout(() => { helpMsg.remove(); }, 2200);
                }
                return false;
            }
        });
    });
});
// ... existing code ...

// Gestionnaire global de délégation d'événements pour les boutons "..." dans les containers d'étoiles
// Ce gestionnaire fonctionne toujours, même si les éléments sont recréés
if (!window.globalMoreButtonHandlerAdded) {
    document.addEventListener('click', function(e) {
        // Détecter les clics sur les boutons "..." ou leur contenu (y compris le caractère "…")
        let clickedBtn = e.target.closest('.card-more-btn, .more-button, .card-more-button');
        
        // Si le clic est directement sur le bouton ou son contenu HTML
        if (!clickedBtn && (e.target.classList.contains('card-more-btn') || 
                            e.target.classList.contains('more-button') || 
                            e.target.classList.contains('card-more-button') ||
                            e.target.tagName === 'BUTTON' && e.target.textContent.trim() === '…')) {
            clickedBtn = e.target.tagName === 'BUTTON' ? e.target : e.target.closest('button');
        }
        
        if (!clickedBtn) {
            return;
        }
        
        // Ignorer les boutons dans les slots du top 10
        const isInTop10Slot = clickedBtn.closest('[id^="catalogue-card-"]') !== null || clickedBtn.closest('.top10-slot') !== null;
        if (isInTop10Slot) {
            return;
        }
        
        // Ignorer les boutons dans les containers de genre (ils ont leur propre gestionnaire)
        const isInGenreContainer = clickedBtn.closest('#genre-filtered-container') || clickedBtn.closest('#genre-cards-container');
        if (isInGenreContainer) {
            return;
        }
        
        // Vérifier que le bouton est dans un container d'étoiles
        const card = clickedBtn.closest('.catalogue-card[data-anime-id]');
        if (!card) {
            return;
        }
        
        const isInStarContainer = card.closest('[id^="star-containers"]');
        if (!isInStarContainer) {
            return;
        }
        
        // Ne pas bloquer les clics sur le menu lui-même
        if (e.target.closest('.card-more-menu, .dropdown-menu')) {
            return;
        }
        
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();
        
        const dropdown = card.querySelector('.card-more-menu, .dropdown-menu');
        if (dropdown) {
            const isVisible = dropdown.style.display === 'block' || dropdown.style.opacity === '1' || dropdown.style.visibility === 'visible';
            if (isVisible) {
                dropdown.style.display = 'none';
                dropdown.style.opacity = '0';
                dropdown.style.pointerEvents = 'none';
                dropdown.style.visibility = 'hidden';
            } else {
                // Fermer tous les autres menus
                document.querySelectorAll('.card-more-menu, .dropdown-menu').forEach(menu => {
                    if (menu !== dropdown) {
                        menu.style.display = 'none';
                        menu.style.opacity = '0';
                        menu.style.pointerEvents = 'none';
                        menu.style.visibility = 'hidden';
                    }
                });
                
                dropdown.style.display = 'block';
                dropdown.style.opacity = '1';
                dropdown.style.pointerEvents = 'auto';
                dropdown.style.visibility = 'visible';
                
                // S'assurer que le bouton "Ajouter au top 10" est bien attaché
                const selectBtn = dropdown.querySelector('.select-top10-btn');
                if (selectBtn) {
                    // Supprimer tous les anciens event listeners en clonant le bouton
                    const newSelectBtn = selectBtn.cloneNode(true);
                    selectBtn.parentNode.replaceChild(newSelectBtn, selectBtn);
                    
                    newSelectBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        
                        if (window.selectedTop10Card === card) {
                            setAnimeCardSelection(card, false);
                            window.selectedTop10Card = null;
                            dropdown.style.display = 'none';
                            dropdown.style.opacity = '0';
                            dropdown.style.pointerEvents = 'none';
                            dropdown.style.visibility = 'hidden';
                            return;
                        }
                        
                        if (window.selectedTop10Card && window.selectedTop10Card !== card) {
                            setAnimeCardSelection(window.selectedTop10Card, false);
                        }
                        
                        dropdown.style.display = 'none';
                        dropdown.style.opacity = '0';
                        dropdown.style.pointerEvents = 'none';
                        dropdown.style.visibility = 'hidden';
                        
                        setAnimeCardSelection(card, true);
                        window.selectedTop10Card = card;
                        
                        setTimeout(() => {
                            if (window.selectedTop10Card && window.selectedTop10Card === card) {
                                showTop10MiniInterface();
                            }
                        }, 100);
                    });
                }
            }
        }
    }, true); // Utiliser capture: true pour être prioritaire
    
    // Fermer tous les menus "..." au scroll
    let scrollTimeoutMoreButtons;
    window.addEventListener('scroll', function() {
        // Utiliser un debounce pour éviter de fermer trop souvent
        clearTimeout(scrollTimeoutMoreButtons);
        scrollTimeoutMoreButtons = setTimeout(() => {
            document.querySelectorAll('.card-more-menu, .dropdown-menu').forEach(menu => {
                const isVisible = menu.style.display === 'block' || menu.style.opacity === '1' || menu.style.visibility === 'visible';
                if (isVisible) {
                    menu.style.display = 'none';
                    menu.style.opacity = '0';
                    menu.style.pointerEvents = 'none';
                    menu.style.visibility = 'hidden';
                }
            });
        }, 100);
    }, { passive: true });
    
    window.globalMoreButtonHandlerAdded = true;
    console.log('✅ Gestionnaire global des boutons "..." installé');
}

// Fonction pour attacher tous les événements aux cartes
function attachCardEvents() {
    // Attacher les événements de sélection aux cartes
    document.querySelectorAll('.catalogue-card[data-anime-id]').forEach(card => {
        // Événement de clic pour sélectionner/désélectionner
        card.addEventListener('click', function(e) {
            // Ne pas sélectionner si on clique sur un bouton ou menu
            if (e.target.closest('.more-button, .card-more-button, .card-more-btn, .card-more-menu, .dropdown-menu, .dropdown-item, .select-top10-btn') || 
                e.target.classList.contains('card-more-btn') || 
                e.target.classList.contains('card-more-menu') || 
                e.target.classList.contains('select-top10-btn') ||
                e.target.tagName === 'BUTTON') {
                // Ne pas bloquer l'événement du bouton, juste empêcher la sélection de la carte
                return;
            }
            // NE PAS sélectionner la carte quand on clique dessus
            // La sélection ne doit se faire que via le bouton "..." et "Ajouter au top 10"
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();
        }, true); // Utiliser capture: true pour être exécuté en premier
        
        // Événement dragstart sécurisé
        card.addEventListener('dragstart', function(e) {
            // Autoriser le drag uniquement si la carte est sélectionnée
            if (window.selectedTop10Card !== card) {
                e.preventDefault();
                // Message d'aide optionnel
                if (!document.getElementById('drag-select-help-msg')) {
                    const helpMsg = document.createElement('div');
                    helpMsg.id = 'drag-select-help-msg';
                    helpMsg.textContent = 'Cliquez d\'abord sur la carte pour la sélectionner !';
                    helpMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#ff6b6b;color:#fff;padding:12px 28px;border-radius:12px;font-size:1.05rem;z-index:9999;box-shadow:0 2px 12px #ff6b6b77;';
                    document.body.appendChild(helpMsg);
                    setTimeout(() => { helpMsg.remove(); }, 2200);
                }
                return false;
            }
        });
        
        // Attacher les événements des boutons "..." et menus déroulants
        // NE PAS gérer les cartes dans les containers de genre (elles ont leur propre gestionnaire)
        const isInGenreContainer = card.closest('#genre-filtered-container') || card.closest('#genre-cards-container');
        if (isInGenreContainer) {
            return; // Ne pas attacher les événements, ils sont déjà gérés par renderGenrePage
        }
        
        const moreButton = card.querySelector('.more-button, .card-more-button, .card-more-btn');
        if (moreButton) {
            // Ignorer les boutons dans les slots du top 10 (ils ont leur propre gestionnaire)
            // Vérifier si le bouton est dans un slot avec id catalogue-card-X ou classe .top10-slot
            const isInTop10Slot = (moreButton.closest('[id^="catalogue-card-"]') !== null) || (moreButton.closest('.top10-slot') !== null);
            if (isInTop10Slot) {
                return; // Ne pas gérer les boutons dans le top 10
            }
            
            // Pour les cartes dans les containers d'étoiles, le gestionnaire global s'en charge
            // On ne fait que s'assurer que le bouton est visible et cliquable
            const isInStarContainer = card.closest('[id^="star-containers"]');
            if (isInStarContainer) {
                // S'assurer que le bouton est visible et cliquable
                moreButton.style.display = '';
                moreButton.style.visibility = '';
                moreButton.style.opacity = '';
                moreButton.style.pointerEvents = 'auto';
                return; // Le gestionnaire global gère les clics
            }
            
            // Pour les autres cartes (pas dans les containers d'étoiles), attacher les événements normalement
            // Supprimer les anciens événements en clonant le bouton
            const newMoreButton = moreButton.cloneNode(true);
            moreButton.parentNode.replaceChild(newMoreButton, moreButton);
            
            // Attacher le nouvel événement
            newMoreButton.addEventListener('click', function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                // Logs réduits pour éviter les logs infinis
                
                // Fermer tous les autres menus
                document.querySelectorAll('.dropdown-menu, .card-more-menu').forEach(menu => {
                    if (menu !== card.querySelector('.dropdown-menu, .card-more-menu')) {
                        menu.style.display = 'none';
                        menu.style.opacity = '0';
                        menu.style.pointerEvents = 'none';
                    }
                });
                
                // Afficher/masquer le menu de cette carte
                const dropdown = card.querySelector('.dropdown-menu, .card-more-menu');
                if (dropdown) {
                    const isVisible = dropdown.style.display === 'block' || dropdown.style.opacity === '1';
                    if (isVisible) {
                        dropdown.style.display = 'none';
                        dropdown.style.opacity = '0';
                        dropdown.style.pointerEvents = 'none';
                    } else {
                        dropdown.style.display = 'block';
                        dropdown.style.opacity = '1';
                        dropdown.style.pointerEvents = 'auto';
                        
                        // Empêcher la fermeture du menu quand on clique dedans (phase de capture)
                        const preventClose = function(e) {
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                        };
                        dropdown.addEventListener('click', preventClose, true);
                        
                        // S'assurer que le bouton "Ajouter au top 10" est bien attaché
                        const selectBtn = dropdown.querySelector('.select-top10-btn');
                        if (selectBtn) {
                            // Réattacher l'événement au cas où
                            selectBtn.onclick = null; // Supprimer les anciens événements
                            selectBtn.addEventListener('click', function(e) {
                                e.stopPropagation();
                                e.preventDefault();
                                e.stopImmediatePropagation(); // Empêcher les autres gestionnaires
                                
                                
                                // Si la carte est déjà sélectionnée, la désélectionner
                                if (window.selectedTop10Card === card) {
                                    setAnimeCardSelection(card, false);
                                    window.selectedTop10Card = null;
                                    dropdown.style.display = 'none';
                                    dropdown.style.opacity = '0';
                                    dropdown.style.pointerEvents = 'none';
                                    return;
                                }
                                
                                // Si une autre carte était sélectionnée, la désélectionner
                                if (window.selectedTop10Card && window.selectedTop10Card !== card) {
                                    setAnimeCardSelection(window.selectedTop10Card, false);
                                }
                                
                                // Fermer le menu d'abord
                                dropdown.style.display = 'none';
                                dropdown.style.opacity = '0';
                                dropdown.style.pointerEvents = 'none';
                                
                                // Sélectionner la carte AVANT d'appeler showTop10MiniInterface
                                setAnimeCardSelection(card, true);
                                window.selectedTop10Card = card;
                                
                                // Vérifier que la carte est bien sélectionnée avant d'afficher l'interface
                                if (!window.selectedTop10Card || window.selectedTop10Card !== card) {
                                    return;
                                }
                                
                                // Afficher l'interface en miniature après un court délai pour s'assurer que tout est prêt
                                setTimeout(() => {
                                    if (window.selectedTop10Card && window.selectedTop10Card === card) {
                                        showTop10MiniInterface();
                                    }
                                }, 100);
                            });
                        }
                    }
                    
                    // Fermer le menu quand on clique ailleurs
                    if (!isVisible) {
                        let hideMenuHandler = null;
                        
                        function addHideMenuHandler() {
                            if (hideMenuHandler) {
                                document.removeEventListener('click', hideMenuHandler);
                            }
                            
                            hideMenuHandler = function(e) {
                                // Ne pas fermer si on clique sur le bouton, le menu, ou un élément du menu
                                if (dropdown && (dropdown.contains(e.target) || dropdown === e.target)) {
                                    return;
                                }
                                if (newMoreButton && (newMoreButton.contains(e.target) || newMoreButton === e.target)) {
                                    return;
                                }
                                // Ne pas fermer si on clique sur un bouton "Ajouter au top 10"
                                if (e.target.classList.contains('select-top10-btn') || e.target.closest('.select-top10-btn')) {
                                    return;
                                }
                                
                                dropdown.style.display = 'none';
                                dropdown.style.opacity = '0';
                                dropdown.style.pointerEvents = 'none';
                                document.removeEventListener('click', hideMenuHandler, true);
                                hideMenuHandler = null;
                            };
                            
                            // Utiliser un délai très long pour éviter la fermeture immédiate
                            setTimeout(() => {
                                document.addEventListener('click', hideMenuHandler, true); // Phase de capture
                            }, 2000); // Délai très long (2 secondes)
                        }
                        
                        addHideMenuHandler();
                    }
                }
            });
        }
        
        // Attacher les événements des éléments du menu
        const dropdownItems = card.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                const dropdown = card.querySelector('.dropdown-menu');
                if (dropdown) {
                    dropdown.style.display = 'none';
                }
            });
        });
        
        // Attacher les événements de drag & drop pour le Top 10 uniquement
        card.addEventListener('dragstart', function(e) {
            if (window.selectedTop10Card === card) {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    animeId: card.getAttribute('data-anime-id'),
                    source: 'profile-card',
                    contentType: card.hasAttribute('data-is-manga') ? 'manga' : 'anime'
                }));
            } else {
                e.preventDefault();
                return false;
            }
        });
        
        // Désactiver le drop sur les containers d'étoiles
        card.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        
        card.addEventListener('drop', function(e) {
            e.preventDefault();
            // Empêcher le drop sur les cartes
            return false;
        });
    });
}

// Fonction utilitaire pour attacher le dragstart sécurisé à une carte
function secureDragStart(card) {
    // Ne pas rendre la carte draggable par défaut
    card.setAttribute('draggable', 'false');
    
    // Ajouter un style visuel pour indiquer que la carte est verrouillée
    card.style.position = 'relative';
    const lockOverlay = document.createElement('div');
    lockOverlay.style.position = 'absolute';
    lockOverlay.style.top = '0';
    lockOverlay.style.left = '0';
    lockOverlay.style.width = '100%';
    lockOverlay.style.height = '100%';
    lockOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    lockOverlay.style.borderRadius = '8px';
    lockOverlay.style.display = 'flex';
    lockOverlay.style.justifyContent = 'center';
    lockOverlay.style.alignItems = 'center';
    lockOverlay.style.cursor = 'not-allowed';
    lockOverlay.style.transition = 'opacity 0.3s';
    lockOverlay.title = getTop10PlaceHintLabel();
    
    // Icône de cadenas
    const lockIcon = document.createElement('i');
    lockIcon.className = 'fas fa-lock';
    lockIcon.style.color = 'white';
    lockIcon.style.fontSize = '24px';
    lockOverlay.appendChild(lockIcon);
    
    card.appendChild(lockOverlay);
    
    // Gérer le clic sur le bouton "..."
    const moreButton = card.querySelector('.more-button, .card-more-button');
    if (moreButton) {
        moreButton.addEventListener('click', function(e) {
            // Trouver le menu déroulant
            const dropdown = card.querySelector('.dropdown-menu');
            if (dropdown) {
                // Attendre que le menu soit affiché
                setTimeout(() => {
                    // Trouver le bouton "Placer" dans le menu
                    const placeButton = dropdown.querySelector('.place-in-top10');
                    if (placeButton) {
                        placeButton.addEventListener('click', function() {
                            // Activer le glisser-déposer uniquement après avoir cliqué sur "Placer"
                            card.setAttribute('draggable', 'true');
                            
                            // Supprimer l'overlay de verrouillage avec une animation
                            const lockOverlay = card.querySelector('.lock-overlay');
                            if (lockOverlay) {
                                lockOverlay.style.opacity = '0';
                                setTimeout(() => {
                                    if (lockOverlay.parentNode) {
                                        lockOverlay.remove();
                                    }
                                }, 300);
                            }
                            
                            // Marquer cette carte comme sélectionnée pour le top 10
                            if (window.selectedTop10Card) {
                                setAnimeCardSelection(window.selectedTop10Card, false);
                                // Réinitialiser l'ancienne carte sélectionnée
                                const oldLockOverlay = window.selectedTop10Card.querySelector('.lock-overlay');
                                if (oldLockOverlay && oldLockOverlay.parentNode) {
                                    oldLockOverlay.style.opacity = '1';
                                }
                            }
                            window.selectedTop10Card = card;
                            setAnimeCardSelection(card, true);
                            
                            // Afficher un message d'aide
                            const helpMsg = document.createElement('div');
                            helpMsg.id = 'drag-help-msg';
                            helpMsg.textContent = 'Maintenant, faites glisser la carte vers un emplacement du top 10.';
                            helpMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#00b894;color:#fff;padding:12px 28px;border-radius:12px;font-size:1.15rem;z-index:9999;box-shadow:0 2px 12px #00b89477;';
                            document.body.appendChild(helpMsg);
                            setTimeout(() => { helpMsg.remove(); }, 2500);
                            
                            // Désactiver le glisser-déposer après 30 secondes
                            setTimeout(() => {
                                if (window.selectedTop10Card === card) {
                                    card.setAttribute('draggable', 'false');
                                    setAnimeCardSelection(card, false);
                                    window.selectedTop10Card = null;
                                    
                                    // Remettre l'overlay de verrouillage
                                    const newLockOverlay = document.createElement('div');
                                    newLockOverlay.className = 'lock-overlay';
                                    newLockOverlay.style.position = 'absolute';
                                    newLockOverlay.style.top = '0';
                                    newLockOverlay.style.left = '0';
                                    newLockOverlay.style.width = '100%';
                                    newLockOverlay.style.height = '100%';
                                    newLockOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
                                    newLockOverlay.style.borderRadius = '8px';
                                    newLockOverlay.style.display = 'flex';
                                    newLockOverlay.style.justifyContent = 'center';
                                    newLockOverlay.style.alignItems = 'center';
                                    newLockOverlay.style.cursor = 'not-allowed';
                                    newLockOverlay.title = getTop10PlaceHintLabel();
                                    
                                    const lockIcon = document.createElement('i');
                                    lockIcon.className = 'fas fa-lock';
                                    lockIcon.style.color = 'white';
                                    lockIcon.style.fontSize = '24px';
                                    newLockOverlay.appendChild(lockIcon);
                                    
                                    card.appendChild(newLockOverlay);
                                }
                            }, 30000);
                        });
                    }
                }, 0);
            }
        });
    }
    
    // Gérer le début du glisser-déposer
    card.addEventListener('dragstart', function(e) {
        // Vérifier que la carte est bien sélectionnée pour le top 10
        if (window.selectedTop10Card !== card) {
            e.preventDefault();
            return false;
        }
        
        // Stocker les données de la carte à déplacer
        const animeId = card.getAttribute('data-anime-id');
        if (!animeId) {
            e.preventDefault();
            return false;
        }
        
        // Définir les données à transférer pendant le glisser-déposer
        e.dataTransfer.setData('text/plain', JSON.stringify({
            animeId: animeId,
            source: 'menu-selected',
            isManga: card.getAttribute('data-is-manga') === 'true'
        }));
        
        // Ajouter un effet visuel pendant le glisser
        e.currentTarget.style.opacity = '0.5';
    });
    
    // Réinitialiser l'opacité à la fin du glisser
    card.addEventListener('dragend', function(e) {
        e.currentTarget.style.opacity = '1';
    });
}
// ... existing code ...

// Détecter quand l'utilisateur revient sur la page profil et forcer le rafraîchissement si nécessaire
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // L'utilisateur est revenu sur la page
        const notesUpdated = localStorage.getItem('notes_updated');
        const top10Updated = localStorage.getItem('top10_updated');
        
        if (notesUpdated === 'true') {
            localStorage.removeItem('notes_updated');
            
            // Forcer le rafraîchissement des containers
            setTimeout(() => {
                if (!isDisplayingNotes) {
                    displayUserAnimeNotes();
                }
            }, 200);
        }
        
        if (top10Updated === 'true') {
            localStorage.removeItem('top10_updated');
            
            // Forcer le rafraîchissement du top 10
            if (window.location.pathname.includes('profil.html') || window.location.pathname.includes('profil')) {
                setTimeout(() => {
                    if (typeof renderTop10Slots === 'function') {
                        renderTop10Slots();
                    }
                    if (!isDisplayingNotes && typeof displayUserAnimeNotes === 'function') {
                        displayUserAnimeNotes();
                    }
                }, 200);
            }
        }
    }
});

// Ne pas initialiser automatiquement pour éviter les boucles infinies
// L'initialisation sera faite depuis profil.html

// Fonction pour migrer les anciennes notes vers le nouveau format avec contentType
function migrateOldNotes() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) return;
    
    const notesKey = 'user_content_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) {
        return;
    }
    
    let hasChanges = false;
    
    notes.forEach(note => {
        // Si la note n'a pas contentType mais a isManga, migrer
        if (note.contentType === undefined && note.isManga !== undefined) {
            note.contentType = note.isManga ? 'manga' : 'anime';
            hasChanges = true;
            console.log(`[MIGRATION] Note ${note.id} migrée: isManga=${note.isManga} -> contentType=${note.contentType}`);
        }
        // Si la note n'a ni contentType ni isManga, supprimer (note corrompue)
        else if (note.contentType === undefined && note.isManga === undefined) {
            console.log(`[MIGRATION] Note ${note.id} supprimée car corrompue (pas de type)`);
            return false;
        }
        return true;
    });
    
    // Filtrer les notes corrompues
    notes = notes.filter(note => note !== false);
    
    if (hasChanges) {
        localStorage.setItem(notesKey, JSON.stringify(notes));
        console.log(`[MIGRATION] Migration terminée, ${notes.length} notes migrées`);
    }
}


// Fonction pour nettoyer les anciennes notes avec des données incorrectes
function cleanInvalidNotes() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) return;
    
    const notesKey = 'user_content_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) {
        return;
    }
    
    let hasChanges = false;
    
    // Supprimer les notes avec des titres incorrects
    notes = notes.filter(note => {
        const titre = note.titre || note.title || '';
        // Ne supprimer que si le titre est vraiment invalide ET qu'il n'y a pas d'autres données valides
        const isInvalid = (titre.startsWith('Anime ') || titre === 'Titre inconnu') && 
                         (!note.image || !note.synopsis || !note.genres);
        
        if (isInvalid) {
            console.log(`[NETTOYAGE] Suppression de la note invalide ${note.id}: "${titre}"`);
            hasChanges = true;
            return false;
        }
        
        return true;
    });
    
    if (hasChanges) {
        localStorage.setItem(notesKey, JSON.stringify(notes));
        console.log(`[NETTOYAGE] Nettoyage terminé, ${notes.length} notes valides restantes`);
    }
}

// Fonction pour afficher l'interface en miniature du top 10
async function showTop10MiniInterface() {
    try {
    console.log('🔘 showTop10MiniInterface appelée');
    console.log('🔘 Carte sélectionnée:', window.selectedTop10Card);
    console.log('🔘 window.selectedTop10Card existe:', !!window.selectedTop10Card);
    
    if (!window.selectedTop10Card) {
        console.error('🔘 ERREUR: Aucune carte sélectionnée pour le top 10');
        alert((typeof window.t === 'function' && window.t('profile.top10_no_card_selected')) || 'Erreur: Aucune carte sélectionnée. Veuillez réessayer.');
        return;
    }
        
    // Supprimer l'ancienne interface si elle existe
    const oldInterface = document.getElementById('top10-mini-interface');
    if (oldInterface) {
        oldInterface.remove();
    }
    
    // Récupérer les données du top 10
    const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user || !user.email) {
            console.error('🔘 ERREUR: Utilisateur non connecté');
            alert((typeof window.t === 'function' && window.t('profile.top10_must_be_logged_in')) || 'Erreur: Vous devez être connecté pour ajouter au top 10.');
            return;
        }
    
    // Initialiser top10Context s'il n'existe pas
    if (!window.top10Context) {
        window.top10Context = {
            genre: [],
            type: null,
            isGenreContext: false
        };
    }
    
    // Vérifier si on est dans un conteneur de genre filtré ou dans le conteneur de recherche
    // (les cartes de recherche doivent être liées au Top 10 du genre/type sélectionné)
    const isInGenreContainer = window.selectedTop10Card && (
        window.selectedTop10Card.closest('#genre-filtered-container') || 
        window.selectedTop10Card.closest('#genre-cards-container') ||
        window.selectedTop10Card.closest('#search-results-container') ||
        window.selectedTop10Card.closest('#search-cards-container')
    );
    
    // Récupérer les genres depuis le contexte ou les genres sélectionnés
    // MAIS seulement si on est vraiment dans un conteneur de genre
    let genreArray = [];
    if (window.top10Context && window.top10Context.isGenreContext && window.top10Context.genre) {
        genreArray = Array.isArray(window.top10Context.genre) ? window.top10Context.genre : [window.top10Context.genre];
    } else if (isInGenreContainer) {
        // Seulement utiliser window.selectedGenres si on est dans un conteneur de genre
        genreArray = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
    } else {
        // Pour le top 10 global, ne pas utiliser de genres
        genreArray = [];
    }
    
    // Pour le top 10 global, genre doit être null
    const genre = genreArray.length > 0 ? genreArray.sort().join(',') : null;
    const type = (window.top10Context && window.top10Context.isGenreContext) ? window.top10Context.type : (window.selectedType || null);
    
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    
    // Détecter le type réel de la carte sélectionnée
    let realType = null;
    if (window.selectedTop10Card && window.selectedTop10Card.dataset && window.selectedTop10Card.dataset.contentType) {
        realType = window.selectedTop10Card.dataset.contentType;
    } else if (window.selectedTop10Card) {
        const cardTitle = window.selectedTop10Card.querySelector('.card-title')?.textContent || '';
        const cardGenres = window.selectedTop10Card.querySelector('.card-genres')?.textContent || '';
        const isDoujin = cardTitle.toLowerCase().includes('doujin') || 
                        cardTitle.toLowerCase().includes('totally captivated') ||
                        cardTitle.toLowerCase().includes('hentai') ||
                        cardGenres.toLowerCase().includes('erotica') ||
                        cardGenres.toLowerCase().includes('adult');
        
        const isRoman = cardTitle.toLowerCase().includes('roman') || 
                       cardTitle.toLowerCase().includes('novel');
        
        const isManhwa = cardTitle.toLowerCase().includes('manhwa') ||
                        cardTitle.toLowerCase().includes('on the way to meet mom') ||
                        cardTitle.toLowerCase().includes('solo leveling') ||
                        cardTitle.toLowerCase().includes('tower of god') ||
                        cardTitle.toLowerCase().includes('noblesse') ||
                        cardTitle.toLowerCase().includes('the beginning after the end');
        
        const isManhua = cardTitle.toLowerCase().includes('manhua');
        
        const isFilm = cardTitle.toLowerCase().includes('film') ||
                      cardTitle.toLowerCase().includes('movie');
        
        if (isDoujin) {
            realType = 'doujin';
        } else if (isRoman) {
            realType = 'roman';
        } else if (isManhwa) {
            realType = 'manhwa';
        } else if (isManhua) {
            realType = 'manhua';
        } else if (isFilm) {
            realType = 'film';
        }
    }
    
    // Utiliser la MÊME logique que lors de la sauvegarde pour déterminer finalType
    // Si un genre "type" est sélectionné et que le type est 'manga', utiliser le type réel
    const typeGenres = ['Doujin', 'Manhwa', 'Manhua'];
    let finalType = realType || type || 'anime';
    
    if (type === 'manga' && genreArray.some(g => typeGenres.includes(g))) {
        if (genreArray.includes('Doujin')) {
            finalType = 'doujin';
        } else if (genreArray.includes('Manhwa')) {
            finalType = 'manhwa';
        } else if (genreArray.includes('Manhua')) {
            finalType = 'manhua';
        }
    } else if (!realType) {
        finalType = type || 'anime';
    } else {
        finalType = realType;
    }
    
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    // Log désactivé pour éviter les logs infinis
    
    let top10 = await getUserTop10(user, genre, finalType) || [];
    // Log désactivé pour éviter les logs infinis
    
    // S'assurer que top10 est un tableau de 10 éléments
    while (top10.length < 10) {
        top10.push(null);
    }
    
    // Créer l'interface en miniature
    const miniInterface = document.createElement('div');
    miniInterface.id = 'top10-mini-interface';
    miniInterface.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #23262f;
        border: 2px solid #00b894;
        border-radius: 16px;
        padding: 20px;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        max-width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
    `;
    
    // Récupérer le titre de l'œuvre sélectionnée
    let selectedAnimeTitle = 'cette œuvre';
    if (window.selectedTop10Card) {
        selectedAnimeTitle = extractTitleFromCard(window.selectedTop10Card);
        // Log désactivé pour éviter les logs infinis
    }
    
    // Titre de l'interface (traduit)
    const title = document.createElement('h3');
    title.textContent = getTop10ChooseSlotLabel(selectedAnimeTitle);
    title.style.cssText = `
        color: #00b894;
        text-align: center;
        margin-bottom: 20px;
        font-size: 1.2rem;
        font-weight: bold;
    `;
    miniInterface.appendChild(title);
    
    // Ajouter une prévisualisation de l'œuvre sélectionnée
    if (window.selectedTop10Card) {
        const previewContainer = document.createElement('div');
        previewContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
            padding: 15px;
            background: #2a2d36;
            border-radius: 12px;
            border: 1px solid #00b894;
        `;
        
        // Image de l'œuvre
        const previewImg = window.selectedTop10Card.querySelector('img');
        if (previewImg) {
            const img = document.createElement('img');
            img.src = previewImg.src;
            img.alt = selectedAnimeTitle;
            img.style.cssText = `
                width: 60px;
                height: 80px;
                object-fit: cover;
                border-radius: 8px;
                margin-right: 15px;
            `;
            previewContainer.appendChild(img);
        }
        
        // Titre de l'œuvre
        const previewTitle = document.createElement('div');
        previewTitle.textContent = selectedAnimeTitle;
        previewTitle.style.cssText = `
            color: #00b894;
            font-size: 1.1rem;
            font-weight: bold;
            text-align: center;
        `;
        previewContainer.appendChild(previewTitle);
        
        miniInterface.appendChild(previewContainer);
    }
    
    // Grille des emplacements
    const grid = document.createElement('div');
    grid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 15px;
        margin-bottom: 20px;
    `;
    
    // Créer les 10 emplacements
    for (let i = 0; i < 10; i++) {
        const slot = document.createElement('div');
        slot.className = 'mini-top10-slot';
        slot.setAttribute('data-slot-index', i);
        slot.style.cssText = `
            width: 80px;
            height: 100px;
            background: ${top10[i] ? '#00b89422' : '#2a2d36'};
            border: 2px solid #00b894;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
        `;
        
        // Badge de position
        const badge = document.createElement('div');
        badge.style.cssText = `
            position: absolute;
            top: 4px;
            left: 4px;
            background: #00b894;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: bold;
        `;
        badge.textContent = i + 1;
        slot.appendChild(badge);
        
        if (top10[i]) {
            // Afficher l'anime existant
            const img = document.createElement('img');
            img.src = top10[i].image || top10[i].img || top10[i].cover || '';
            img.alt = top10[i].titre || top10[i].title || top10[i].name || '';
            img.style.cssText = `
                width: 50px;
                height: 60px;
                object-fit: cover;
                border-radius: 4px;
                margin-top: 15px;
            `;
            slot.appendChild(img);
            
            const titre = document.createElement('div');
            titre.textContent = (top10[i].titre || top10[i].title || top10[i].name || '').substring(0, 8) + '...';
            titre.style.cssText = `
                color: #00b894;
                font-size: 0.7rem;
                text-align: center;
                margin-top: 4px;
                font-weight: bold;
            `;
            slot.appendChild(titre);
        } else {
            // Emplacement vide (traduit)
            const emptyText = document.createElement('div');
            emptyText.textContent = getTop10SlotEmptyLabel();
            emptyText.style.cssText = `
                color: #666;
                font-size: 0.8rem;
                text-align: center;
                margin-top: 15px;
            `;
            slot.appendChild(emptyText);
        }
        
        // Effet de survol
        slot.onmouseover = () => {
            slot.style.transform = 'scale(1.05)';
            slot.style.boxShadow = '0 4px 12px rgba(0, 184, 148, 0.3)';
        };
        
        slot.onmouseout = () => {
            slot.style.transform = 'scale(1)';
            slot.style.boxShadow = 'none';
        };
        
        // Événement de clic pour placer la carte (async pour Firebase)
        slot.onclick = async () => {
            const slotIndex = parseInt(slot.getAttribute('data-slot-index'));
            
            if (!window.selectedTop10Card) {
                console.error('❌ ERREUR: Aucune carte sélectionnée');
                alert((typeof window.t === 'function' && window.t('profile.top10_no_card_selected')) || 'Erreur: Aucune carte sélectionnée. Veuillez réessayer.');
                return;
            }
            
            // Récupérer l'utilisateur
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            if (!user || !user.email) {
                console.error('❌ ERREUR: Utilisateur non connecté');
                alert((typeof window.t === 'function' && window.t('profile.top10_must_be_logged_in')) || 'Erreur: Vous devez être connecté pour ajouter au top 10.');
                return;
            }
            
            // Vérifier que la carte est toujours valide
            if (!window.selectedTop10Card) {
                console.error('❌ ERREUR: La carte sélectionnée n\'existe plus');
                alert((typeof window.t === 'function' && window.t('profile.top10_card_no_longer_exists')) || 'Erreur: La carte sélectionnée n\'existe plus. Veuillez réessayer.');
                return;
            }
            
            const animeId = window.selectedTop10Card.getAttribute('data-anime-id');
            const isManga = window.selectedTop10Card.getAttribute('data-is-manga') === 'true';
            
            console.log('Anime ID:', animeId, 'Is Manga:', isManga);
            
            // Charger les notes depuis Firebase en priorité
            console.log('Chargement des notes depuis Firebase/localStorage...');
            const notes = await loadUserNotes(user.email);
            console.log('Notes trouvées:', notes.length);
            
            // Trouver l'anime/manga dans les notes
            console.log('Recherche de l\'anime avec ID:', animeId);
            let item = notes.find(a => String(a.id) === String(animeId));
            console.log('Élément trouvé:', item);
            
            // Fonction utilitaire pour valider et corriger le contentType
            function validateAndCorrectContentType(contentType, itemTitle, selectedType, isMangaCard) {
                const validContentTypes = ['anime', 'manga', 'doujin', 'manhwa', 'manhua', 'film', 'roman'];
                
                // Si le contentType n'existe pas ou est invalide, utiliser selectedType
                if (!contentType || !validContentTypes.includes(contentType)) {
                    return selectedType || (isMangaCard ? 'manga' : 'anime');
                }
                
                // Liste étendue de mots-clés qui indiquent que c'est probablement un anime/manga, pas un type spécial
                const animeMangaIndicators = [
                    'kaguya', 'romantic', 'love', 'romance', 'shokugeki', 'food', 'wars', 
                    'steins', 'gate', 'high school', 'dxd', 'd×d', 'kingdom', 'grand blue', 'anime', 'manga',
                    'one piece', 'naruto', 'dragon ball', 'attack on titan', 'death note', 'fullmetal',
                    'hunter x hunter', 'my hero academia', 'demon slayer', 'jujutsu', 'kaisen',
                    'tokyo ghoul', 'bleach', 'fairy tail', 'sword art online', 're:zero',
                    'overlord', 'no game no life', 'konosuba', 'mob psycho', 'one punch man'
                ];
                
                const titleLower = (itemTitle || '').toLowerCase();
                const isLikelyAnimeOrManga = animeMangaIndicators.some(indicator => titleLower.includes(indicator));
                
                // Si c'est détecté comme un type spécial mais que le titre suggère un anime/manga, corriger
                if (isLikelyAnimeOrManga && ['roman', 'doujin', 'manhwa', 'manhua', 'film'].includes(contentType)) {
                    const correctedType = selectedType || (isMangaCard ? 'manga' : 'anime');
                    console.log(`⚠️ Correction du contentType: "${contentType}" -> "${correctedType}" pour`, titleLower);
                    return correctedType;
                }
                
                // Le contentType est valide et semble correct
                return contentType;
            }
            
            // Si l'élément existe déjà, utiliser son contentType existant
            // MAIS corriger les faux positifs (ex: "roman" pour "Kaguya-sama", "doujin" pour un anime normal, etc.)
            if (item) {
                const itemTitle = item.titre || item.title || item.name || '';
                const correctedContentType = validateAndCorrectContentType(
                    item.contentType, 
                    itemTitle, 
                    window.selectedType, 
                    isManga
                );
                
                if (correctedContentType !== item.contentType) {
                    item.contentType = correctedContentType;
                } else {
                    console.log('✅ Utilisation du contentType existant:', item.contentType);
                }
            }
            
            // Si l'élément n'est pas dans les notes, le créer automatiquement
            if (!item) {
                console.log('Élément non trouvé dans les notes, création automatique...');
                
                // Récupérer les données de la carte
                console.log('Structure de la carte sélectionnée:', window.selectedTop10Card.innerHTML);
                
                // Utiliser la fonction utilitaire pour extraire le titre
                const cardTitle = extractTitleFromCard(window.selectedTop10Card);
                
                const cardImage = window.selectedTop10Card.querySelector('img')?.src || '';
                const cardSynopsis = window.selectedTop10Card.querySelector('.card-synopsis')?.textContent || '';
                const cardGenres = window.selectedTop10Card.querySelector('.card-genres')?.textContent || '';
                
                // Liste de mots-clés qui indiquent que c'est probablement un anime/manga, pas un type spécial
                const animeIndicators = ['kaguya', 'romantic', 'love', 'romance', 'shokugeki', 'food', 'wars', 
                                       'steins', 'gate', 'high school', 'dxd', 'kingdom', 'grand blue', 'anime', 'manga'];
                
                const cardTitleLower = cardTitle.toLowerCase();
                const isLikelyAnimeOrManga = animeIndicators.some(indicator => cardTitleLower.includes(indicator));
                
                // Détection STRICTE des types spéciaux - seulement si c'est vraiment explicite
                // Doujin : doit contenir explicitement "doujin" ou "hentai" dans le titre, ET pas être un anime connu
                const finalIsDoujin = !isLikelyAnimeOrManga && (
                    cardTitleLower.includes('doujin') || 
                    cardTitleLower.includes('hentai') ||
                    (cardGenres && cardGenres.toLowerCase().includes('erotica')) ||
                    (cardGenres && cardGenres.toLowerCase().includes('adult'))
                );
                
                // Roman : doit contenir explicitement "roman" ou "novel" dans le titre, ET pas être un anime connu
                const finalIsRoman = !isLikelyAnimeOrManga && (
                    cardTitleLower.includes('roman') || 
                    cardTitleLower.includes('novel') ||
                    (animeId && animeId.toString().includes('roman'))
                );
                
                // Manhwa : doit contenir explicitement "manhwa" dans le titre OU être dans la liste connue
                const knownManhwaTitles = ['on the way to meet mom', 'solo leveling', 'tower of god', 
                                          'noblesse', 'the beginning after the end'];
                const finalIsManhwa = cardTitleLower.includes('manhwa') ||
                                    knownManhwaTitles.some(title => cardTitleLower.includes(title)) ||
                                    (animeId && animeId.toString().includes('manhwa'));
                
                // Manhua : doit contenir explicitement "manhua" dans le titre OU être dans la liste connue
                const knownManhuaTitles = ['sq: begin w/your name', 'sq begin', 'begin w/your name'];
                const finalIsManhua = cardTitleLower.includes('manhua') ||
                                    knownManhuaTitles.some(title => cardTitleLower.includes(title)) ||
                                    (animeId && animeId.toString().includes('manhua'));
                
                // Film : doit contenir explicitement "film" ou "movie" dans le titre
                const finalIsFilm = cardTitleLower.includes('film') ||
                                 cardTitleLower.includes('movie') ||
                                 (animeId && animeId.toString().includes('film'));
                
                console.log('Titre final:', cardTitle);
                console.log('Image trouvée:', cardImage);
                console.log('isLikelyAnimeOrManga:', isLikelyAnimeOrManga);
                console.log('Détection doujin finale:', finalIsDoujin);
                console.log('Détection roman finale:', finalIsRoman);
                console.log('Détection manhwa finale:', finalIsManhwa);
                console.log('Détection manhua finale:', finalIsManhua);
                console.log('Détection film finale:', finalIsFilm);
                
                // Déterminer le contentType - par défaut utiliser window.selectedType ou 'anime'/'manga'
                // PRIORITÉ: Détecter manhua/manhwa AVANT doujin pour éviter les faux positifs
                // Ne détecter un type spécial que si c'est vraiment explicite
                let itemContentType;
                if (finalIsManhua) {
                    itemContentType = 'manhua';
                } else if (finalIsManhwa) {
                    itemContentType = 'manhwa';
                } else if (finalIsDoujin) {
                    itemContentType = 'doujin';
                } else if (finalIsRoman) {
                    itemContentType = 'roman';
                } else if (finalIsFilm) {
                    itemContentType = 'film';
                } else {
                    // Par défaut, utiliser window.selectedType ou 'anime'/'manga' selon isManga
                    itemContentType = window.selectedType || (isManga ? 'manga' : 'anime');
                }
                
                // Valider et corriger le contentType pour éviter les faux positifs
                itemContentType = validateAndCorrectContentType(
                    itemContentType, 
                    cardTitle, 
                    window.selectedType, 
                    isManga
                );
                
                console.log('✅ contentType déterminé:', itemContentType);
                
                // Pour les animes, extraire le titre de base (sans saison/partie)
                let finalTitle = cardTitle;
                if (itemContentType === 'anime') {
                    finalTitle = extractBaseAnimeTitle(cardTitle, 'anime');
                    if (finalTitle !== cardTitle) {
                    }
                }
                
                // Créer l'objet anime/manga/doujin/roman
                item = {
                    id: parseInt(animeId),
                    titre: finalTitle, // Utiliser le titre de base pour les animes
                    originalTitle: cardTitle, // Conserver le titre original
                    title: finalTitle, // Ajouter aussi le champ title pour compatibilité
                    name: finalTitle,  // Ajouter aussi le champ name pour compatibilité
                    image: cardImage,
                    synopsis: cardSynopsis,
                    rating: 0, // Note par défaut
                    addDate: new Date().toISOString(),
                    contentType: itemContentType
                };
                
                
                // Ajouter aux notes localement
                notes.push(item);
                
                // Sauvegarder dans Firebase (sans note pour l'instant, juste pour créer l'entrée)
                if (typeof window.firebaseNotesService !== 'undefined' && window.firebaseNotesService) {
                    try {
                        // Créer une note minimale pour sauvegarder dans Firebase
                        const noteToSave = {
                            id: item.id,
                            note: item.note || 0,
                            contentType: item.contentType,
                            titre: item.titre,
                            image: item.image,
                            synopsis: item.synopsis || '',
                            genres: [],
                            score: 0
                        };
                        await window.firebaseNotesService.saveNote(user.email, noteToSave);
                    } catch (err) {
                    }
                }
                
            }
            
            // Vérifier si on est dans un conteneur de genre filtré
            const isInGenreContainer = window.selectedTop10Card && (
                window.selectedTop10Card.closest('#genre-filtered-container') || 
                window.selectedTop10Card.closest('#genre-cards-container')
            );
            
            // Déterminer le type réel de l'élément AVANT de charger le top 10
            // Utiliser la fonction de validation pour corriger le contentType si nécessaire
            const itemTitle = item.titre || item.title || item.name || '';
            const validatedContentType = validateAndCorrectContentType(
                item.contentType, 
                itemTitle, 
                window.selectedType, 
                isManga
            );
            
            let itemRealType = null;
            
            if (!isInGenreContainer) {
                // Pour le top 10 global, utiliser le type sélectionné (plus fiable que le contentType)
                // car le contentType peut être incorrect (ex: 'roman' pour 'Kaguya-sama')
                itemRealType = window.selectedType || 'anime';
            } else {
                // Pour les conteneurs de genre, utiliser le contentType validé ou le type sélectionné
                itemRealType = validatedContentType || window.selectedType || 'anime';
            }
            
            console.log('🔍 Type déterminé - isInGenreContainer:', isInGenreContainer, 'item.contentType:', item.contentType, 'window.selectedType:', window.selectedType, 'itemRealType:', itemRealType);
            
            // Déterminer le genre et le type pour charger le bon top 10
            let loadGenre = null;
            let loadType = null;
            
            if (window.top10Context.isGenreContext && window.top10Context.genre) {
                const contextGenres = Array.isArray(window.top10Context.genre) ? window.top10Context.genre : [window.top10Context.genre];
                loadGenre = contextGenres.length > 0 ? contextGenres.sort().join(',') : null;
                loadType = window.top10Context.type || itemRealType;
            } else if (isInGenreContainer) {
                const selectedGenres = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
                loadGenre = selectedGenres.length > 0 ? selectedGenres.sort().join(',') : null;
                loadType = window.selectedType || itemRealType;
            } else {
                // Pour le top 10 global, genre = null, utiliser le type sélectionné
                loadGenre = null;
                loadType = itemRealType; // itemRealType est déjà window.selectedType pour le top 10 global
            }
            
            console.log('🔍 Chargement du top 10, genre:', loadGenre, 'type:', loadType, 'itemRealType:', itemRealType);
            
            // Charger le top 10 existant AVANT d'insérer
            let top10 = await getUserTop10(user, loadGenre, loadType) || [];
            // S'assurer que top10 est un tableau de 10 éléments
            while (top10.length < 10) {
                top10.push(null);
            }
            
            console.log('🔍 Top 10 chargé avant insertion:', top10);
            
            // Utiliser la fonction insertIntoTop10 globale définie plus bas
            top10 = insertIntoTop10(top10, item, slotIndex);
            
            console.log('🔍 Top 10 après insertion:', top10);
            
            // Nettoyer les entrées vides (au cas où)
            top10 = top10.map(item => item || null);
            
            // Sauvegarder le top 10 mis à jour
            
            // Si on est dans un contexte de genre avec un genre "type" (Doujin, Manhwa, Manhua)
            // ET que le type sélectionné est 'manga', alors utiliser le type réel correspondant au genre
            let itemFinalType = itemRealType;
            
            // Récupérer le genre depuis le contexte ou depuis window.selectedGenres
            // MAIS seulement si on est vraiment dans un conteneur de genre
            let itemGenreArray = [];
            if (window.top10Context.isGenreContext && window.top10Context.genre) {
                itemGenreArray = Array.isArray(window.top10Context.genre) ? window.top10Context.genre : [window.top10Context.genre];
            } else if (isInGenreContainer) {
                // Seulement utiliser window.selectedGenres si on est dans un conteneur de genre
                itemGenreArray = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
            } else {
                // Pour le top 10 global, ne pas utiliser de genres
                itemGenreArray = [];
            }
            
            // Déterminer finalGenre de manière cohérente avec renderTop10Slots
            // Pour le top 10 global (pas dans un conteneur de genre), finalGenre doit être null
            let finalGenre = null;
            if (window.top10Context.isGenreContext && window.top10Context.genre) {
                const contextGenres = Array.isArray(window.top10Context.genre) ? window.top10Context.genre : [window.top10Context.genre];
                finalGenre = contextGenres.length > 0 ? contextGenres.sort().join(',') : null;
            } else if (isInGenreContainer) {
                // Seulement utiliser window.selectedGenres si on est dans un conteneur de genre
                const selectedGenresForKey = Array.isArray(window.selectedGenres) ? window.selectedGenres : [];
                finalGenre = selectedGenresForKey.length > 0 ? selectedGenresForKey.sort().join(',') : null;
            }
            // Sinon, finalGenre reste null pour le top 10 global
            
            const itemTypeGenres = ['Doujin', 'Manhwa', 'Manhua'];
            
            // Si un genre "type" est sélectionné et que le type est 'manga', utiliser le type réel
            if (window.selectedType === 'manga' && itemGenreArray.some(g => itemTypeGenres.includes(g))) {
                if (itemGenreArray.includes('Doujin')) {
                    itemFinalType = 'doujin';
                } else if (itemGenreArray.includes('Manhwa')) {
                    itemFinalType = 'manhwa';
                } else if (itemGenreArray.includes('Manhua')) {
                    itemFinalType = 'manhua';
                }
            } else if (!itemRealType) {
                // Si pas de contentType dans l'élément, utiliser window.selectedType
                itemFinalType = window.selectedType || 'anime';
            } else {
                // Utiliser le contentType réel de l'élément s'il existe
                itemFinalType = itemRealType;
            }
            
            // Sauvegarder immédiatement (sans délai pour éviter les problèmes de synchronisation)
            try {
                await setUserTop10(user, top10, finalGenre, itemFinalType);
                console.log('✅ Top 10 sauvegardé avec succès dans Firebase, genre:', finalGenre, 'type:', itemFinalType);
                
                // Afficher un message de succès
                const successMsg = document.createElement('div');
                successMsg.textContent = '✅ Carte ajoutée au top 10 avec succès !';
                successMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#00b894;color:#fff;padding:12px 28px;border-radius:12px;font-size:1.05rem;z-index:9999;box-shadow:0 2px 12px #00b89477;';
                document.body.appendChild(successMsg);
                setTimeout(() => { successMsg.remove(); }, 2000);
            } catch (err) {
                console.error('❌ ERREUR lors de la sauvegarde du top 10:', err);
                alert((typeof window.t === 'function' && window.t('profile.top10_save_error')) || 'Erreur: Impossible de sauvegarder le top 10. Veuillez réessayer.');
                return; // Ne pas fermer l'interface en cas d'erreur
            }
            
            // Sauvegarder la référence à la carte AVANT de réinitialiser
            const cardToUpdate = window.selectedTop10Card;
            
            // Réinitialiser la sélection
            if (window.selectedTop10Card) {
                if (typeof setAnimeCardSelection === 'function') {
                    setAnimeCardSelection(window.selectedTop10Card, false);
                }
                window.selectedTop10Card = null;
            }
            
            // Réinitialiser le contexte
            window.top10Context = {
                genre: null,
                type: null,
                isGenreContext: false
            };
            
            // Fermer l'interface
            miniInterface.remove();
            
            // NE PAS masquer le bouton "..." immédiatement - laisser updateCardMoreButton le faire après vérification
            // Attendre que la sauvegarde soit complète avant de mettre à jour les boutons
            setTimeout(async () => {
                // Attendre un peu plus pour s'assurer que Firebase/localStorage a bien synchronisé
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Vérifier que l'anime est bien dans le top 10 sauvegardé
                const savedTop10 = await getUserTop10(user, finalGenre, itemFinalType);
                console.log('🔍 Vérification top 10 sauvegardé, genre:', finalGenre, 'type:', itemFinalType, 'slotIndex:', slotIndex);
                console.log('🔍 Top 10 récupéré:', savedTop10);
                
                if (savedTop10 && savedTop10[slotIndex] && String(savedTop10[slotIndex].id) === String(animeId)) {
                    console.log('✅ Anime confirmé dans le top 10 sauvegardé');
                    
                    // Désactiver le rafraîchissement automatique des boutons dans renderTop10Slots
                    window.skipRefreshButtons = true;
                    
                    // Rafraîchir l'affichage du top 10
                    await renderTop10Slots();
                    
                    // Attendre encore un peu pour s'assurer que renderTop10Slots a terminé
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // Maintenant mettre à jour tous les boutons "..." une seule fois, après confirmation
                    // Utiliser refreshAllCardMoreButtons qui vérifie correctement le Top 10
                    if (typeof refreshAllCardMoreButtons === 'function') {
                        refreshAllCardMoreButtons();
                        // Appel supplémentaire après un délai pour s'assurer que toutes les cartes sont mises à jour
                        setTimeout(() => {
                            refreshAllCardMoreButtons();
                        }, 800);
                    } else if (typeof updateCardMoreButton === 'function') {
                        // Mettre à jour la carte spécifique d'abord
                        if (cardToUpdate) {
                            await updateCardMoreButton(cardToUpdate);
                        }
                        
                        // Puis mettre à jour toutes les autres cartes
                        const allCards = [
                            ...document.querySelectorAll('.catalogue-card[data-anime-id]'),
                            ...document.querySelectorAll('#genre-filtered-container .catalogue-card[data-anime-id]'),
                            ...document.querySelectorAll('#genre-cards-container .catalogue-card[data-anime-id]')
                        ];
                        
                        // Mettre à jour toutes les cartes de manière asynchrone
                        await Promise.all(allCards.map(card => updateCardMoreButton(card)));
                    }
                    
                    // S'assurer que le gestionnaire global est actif
                    if (!window.top10ButtonGlobalHandlerAdded) {
                        // Réinitialiser le gestionnaire global
                        if (typeof initGlobalTop10Handler === 'function') {
                            initGlobalTop10Handler();
                        }
                    }
                } else {
                    console.error('❌ ERREUR: L\'anime n\'a pas été trouvé dans le top 10 sauvegardé');
                    console.error('❌ Anime ID recherché:', animeId);
                    console.error('❌ Slot index:', slotIndex);
                    console.error('❌ Top 10 récupéré:', savedTop10);
                    
                    // Si l'anime n'est pas dans le top 10, réafficher le bouton
                    if (cardToUpdate && typeof updateCardMoreButton === 'function') {
                        await updateCardMoreButton(cardToUpdate);
                    }
                }
            }, 100); // Délai initial pour laisser le temps à la sauvegarde
            
            // Ne pas appeler displayUserAnimeNotes ici pour éviter les boucles infinies
            // L'affichage sera mis à jour par renderTop10Slots qui a déjà été appelé
            
            // Afficher un message de confirmation avec le nom de l'œuvre
            const helpMsg = document.createElement('div');
            helpMsg.id = 'drag-help-msg';
            const animeTitle = item.titre || item.title || item.name || 'cette œuvre';
            helpMsg.textContent = `"${animeTitle}" ajouté(e) au top 10 avec succès !`;
            helpMsg.style.cssText = 'position:fixed;top:30px;left:50%;transform:translateX(-50%);background:#00b894;color:#fff;padding:12px 28px;border-radius:12px;font-size:1.15rem;z-index:9999;box-shadow:0 2px 12px #00b89477;';
            document.body.appendChild(helpMsg);
            setTimeout(() => { helpMsg.remove(); }, 2500);
        };
        
        grid.appendChild(slot);
    }
    
    miniInterface.appendChild(grid);
    
    // Bouton pour fermer l'interface
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Annuler';
    closeBtn.style.cssText = `
        background: #ff6b6b;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 0.9rem;
        cursor: pointer;
        transition: background 0.2s;
        display: block;
        margin: 0 auto;
    `;
    closeBtn.onclick = () => {
        miniInterface.remove();
        // Réinitialiser la sélection
        if (window.selectedTop10Card) {
            setAnimeCardSelection(window.selectedTop10Card, false);
            window.selectedTop10Card = null;
        }
    };
        miniInterface.appendChild(closeBtn);
    
    // Ajouter l'interface au DOM
    document.body.appendChild(miniInterface);
    
    // Le popup ne se ferme QUE via le bouton "Annuler" - pas au scroll ni au clic extérieur
    // Les gestionnaires de scroll et clic extérieur ont été supprimés pour permettre
    // au popup de rester ouvert même lors du scroll ou d'un clic à côté
    } catch (error) {
        console.error('🔘 ERREUR dans showTop10MiniInterface:', error);
        alert(((typeof window.t === 'function' && window.t('profile.top10_display_error')) || 'Erreur lors de l\'affichage de l\'interface top 10.') + ' ' + (error.message || ''));
    }
}

// Fonction globale pour insérer un élément dans le top 10 avec remplacement
function insertIntoTop10(top10, item, targetIndex) {
    
    // Vérifier si l'élément est déjà dans le top 10 (par ID)
    const existingIndex = top10.findIndex(existingItem => existingItem && String(existingItem.id) === String(item.id));
    
    // Pour les animes et mangas, vérifier aussi par titre de base (sans saison/partie) et par similarité
    // Si on ajoute un anime/manga de la même série, retirer les autres (un seul par série comme en affichage)
    let additionalIndicesToRemove = [];
    const itemContentType = (item.contentType || 'anime').toLowerCase();
    if (itemContentType === 'anime' || itemContentType === 'manga') {
        const itemTitle = item.titre || item.title || item.name;
        const itemBaseTitle = extractBaseAnimeTitle(itemTitle, itemContentType);
        top10.forEach((existingItem, index) => {
            if (!existingItem) return;
            const existingType = (existingItem.contentType || 'anime').toLowerCase();
            if (existingType !== 'anime' && existingType !== 'manga') return;
            const existingTitle = existingItem.titre || existingItem.title || existingItem.name;
            const existingBaseTitle = extractBaseAnimeTitle(existingTitle, existingType);
            // Si c'est la même série (même titre de base) mais pas le même ID, le retirer
            if (existingBaseTitle === itemBaseTitle && String(existingItem.id) !== String(item.id)) {
                additionalIndicesToRemove.push(index);
            }
            // Si les titres sont similaires (même série sans indication explicite de saison), le retirer aussi
            else if (areAnimeTitlesSimilar(itemTitle, existingTitle, itemContentType) && String(existingItem.id) !== String(item.id)) {
                additionalIndicesToRemove.push(index);
            }
        });
    }
    
    // Créer une copie du top 10
    let newTop10 = [...top10];
    
    // Vérifier s'il y a déjà une carte à la position cible
    const replacedAnime = newTop10[targetIndex];
    
    // Si l'élément existe déjà dans le top 10 ET qu'il y a une carte à la position cible
    // Faire un échange des positions
    if (existingIndex !== -1 && replacedAnime && existingIndex !== targetIndex) {
        // Échange : mettre la carte cible à l'ancienne position de la carte déplacée
        newTop10[existingIndex] = replacedAnime;
        // Mettre la carte déplacée à la position cible
        newTop10[targetIndex] = item;
        
        // Retirer toutes les autres saisons du même anime (sauf celles déjà gérées)
        additionalIndicesToRemove.forEach(index => {
            // Ne pas retirer si c'est la position d'échange
            if (index !== existingIndex && index !== targetIndex) {
                newTop10[index] = null;
            }
        });
    } else {
        // Comportement normal : si l'élément existe déjà, le retirer de sa position actuelle
        if (existingIndex !== -1) {
            newTop10[existingIndex] = null;
        }
        
        // Retirer toutes les autres saisons du même anime
        additionalIndicesToRemove.forEach(index => {
            const removedItem = newTop10[index];
            newTop10[index] = null;
        });
        
        // Remplacer l'élément à la position cible (pas de décalage)
        newTop10[targetIndex] = item;
    }
    
    // Nettoyer les entrées vides et s'assurer qu'il y a toujours 10 éléments
    newTop10 = newTop10.map(item => item || null);
    while (newTop10.length < 10) {
        newTop10.push(null);
    }
    
    return newTop10;
}

// Vérification finale que les fonctions sont bien exposées
if (typeof window.createStarBadges === 'function') {
    console.log('✅ createStarBadges exposée globalement');
} else {
    console.error('❌ createStarBadges NON exposée globalement');
}

if (typeof window.displayUserAnimeNotes === 'function') {
    console.log('✅ displayUserAnimeNotes exposée globalement');
} else {
    console.error('❌ displayUserAnimeNotes NON exposée globalement');
}

