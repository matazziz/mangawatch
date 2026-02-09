// === SERVICE UNIFIÉ POUR LA GESTION DES NOTES ===
// Ce service gère toutes les notes (anime, manga, roman, doujin, manhwa, manhua, film)

// Fonction pour sauvegarder une note
function saveNote(contentId, rating, contentType, contentData = {}) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        console.error('Utilisateur non connecté');
        return false;
    }

    const notesKey = 'user_content_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) {
        console.error('Erreur lors de la lecture des notes:', e);
        notes = [];
    }

    // Créer l'objet note complet
    const note = {
        id: contentId,
        rating: Number(rating),
        contentType: contentType, // 'anime', 'manga', 'roman', 'doujin', 'manhwa', 'manhua', 'film'
        addedAt: Date.now(),
        ...contentData
    };

    // Chercher si le contenu existe déjà
    const existingIndex = notes.findIndex(n => String(n.id) === String(contentId) && n.contentType === contentType);

    if (existingIndex !== -1) {
        // Mettre à jour la note existante en conservant la date d'ajout
        const originalAddedAt = notes[existingIndex].addedAt;
        notes[existingIndex] = { ...notes[existingIndex], ...note, addedAt: originalAddedAt };
        console.log(`✅ Note mise à jour pour ${contentType} ${contentId}: ${rating}/10`);
    } else {
        // Ajouter une nouvelle note
        notes.push(note);
        console.log(`✅ Nouvelle note ajoutée pour ${contentType} ${contentId}: ${rating}/10`);
    }

    // Sauvegarder les notes
    localStorage.setItem(notesKey, JSON.stringify(notes));

    // Synchroniser aussi avec l'ancien système pour compatibilité
    if (contentType === 'anime') {
        const animeRatings = JSON.parse(localStorage.getItem('animeRatings') || '{}');
        animeRatings[contentId] = rating;
        localStorage.setItem('animeRatings', JSON.stringify(animeRatings));
    }

    console.log('📝 Notes sauvegardées:', notes);
    return true;
}

// Fonction pour supprimer une note
function removeNote(contentId, contentType) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        console.error('Utilisateur non connecté');
        return false;
    }

    const notesKey = 'user_content_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) {
        console.error('Erreur lors de la lecture des notes:', e);
        return false;
    }

    // Récupérer la note avant suppression pour l'ajouter à la liste des supprimées
    const noteToDelete = notes.find(n => String(n.id) === String(contentId) && n.contentType === contentType);
    
    // Supprimer la note
    const filteredNotes = notes.filter(n => !(String(n.id) === String(contentId) && n.contentType === contentType));
    
    localStorage.setItem(notesKey, JSON.stringify(filteredNotes));
    console.log(`🗑️ Note supprimée pour ${contentType} ${contentId}`);

    // Ajouter à la liste des notes supprimées permanentes
    if (noteToDelete) {
        const deletedNotesKey = 'deleted_content_notes_' + user.email;
        let deletedNotes = [];
        try {
            deletedNotes = JSON.parse(localStorage.getItem(deletedNotesKey) || '[]');
        } catch (e) {
            deletedNotes = [];
        }
        
        // Vérifier si cette note n'est pas déjà dans la liste des supprimées
        const alreadyDeleted = deletedNotes.some(n => 
            String(n.id) === String(contentId) && n.contentType === contentType
        );
        
        if (!alreadyDeleted) {
            const deletedNote = {
                id: contentId,
                contentType: contentType,
                deletedAt: Date.now(),
                originalData: noteToDelete
            };
            deletedNotes.push(deletedNote);
            localStorage.setItem(deletedNotesKey, JSON.stringify(deletedNotes));
            console.log(`🗑️ Note ${contentId} ajoutée à la liste des notes supprimées permanentes`);
        }
    }

    // Supprimer aussi de l'ancien système pour compatibilité
    if (contentType === 'anime') {
        const animeRatings = JSON.parse(localStorage.getItem('animeRatings') || '{}');
        delete animeRatings[contentId];
        localStorage.setItem('animeRatings', JSON.stringify(animeRatings));
    }
    
    // Déclencher le nettoyage du top 10 via un événement personnalisé
    const event = new CustomEvent('noteDeleted', {
        detail: { contentId, contentType, user }
    });
    window.dispatchEvent(event);
    
    // Marquer que des notes ont été mises à jour
    localStorage.setItem('notes_updated', 'true');

    return true;
}

// Fonction pour récupérer une note
function getNote(contentId, contentType) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        return null;
    }

    const notesKey = 'user_content_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) {
        console.error('Erreur lors de la lecture des notes:', e);
        return null;
    }

    return notes.find(n => String(n.id) === String(contentId) && n.contentType === contentType) || null;
}

// Fonction pour récupérer toutes les notes d'un type
function getNotesByType(contentType) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        return [];
    }

    const notesKey = 'user_content_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) {
        console.error('Erreur lors de la lecture des notes:', e);
        return [];
    }

    return notes.filter(n => n.contentType === contentType);
}

// Fonction pour récupérer toutes les notes
function getAllNotes() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        return [];
    }

    const notesKey = 'user_content_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) {
        console.error('Erreur lors de la lecture des notes:', e);
        return [];
    }

    return notes;
}

// Fonction pour synchroniser les anciennes notes vers le nouveau système
function syncOldNotes() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        return;
    }

    // Synchroniser les anciennes notes d'anime
    const oldNotesKey = 'user_anime_notes_' + user.email;
    const oldNotes = JSON.parse(localStorage.getItem(oldNotesKey) || '[]');
    
    if (oldNotes.length > 0) {
        console.log('🔄 Synchronisation des anciennes notes...');
        
        oldNotes.forEach(oldNote => {
            const contentData = {
                title: oldNote.title || 'Titre inconnu',
                image: oldNote.image || '',
                synopsis: oldNote.synopsis || '',
                genres: oldNote.genres || []
            };
            
            saveNote(oldNote.id, oldNote.note, 'anime', contentData);
        });
        
        // Supprimer les anciennes notes après synchronisation
        localStorage.removeItem(oldNotesKey);
        console.log('✅ Anciennes notes synchronisées et supprimées');
    }
}

// Fonction pour nettoyer les notes invalides
function cleanNotes() {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        return;
    }

    const notesKey = 'user_content_notes_' + user.email;
    let notes = [];
    try {
        notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
    } catch (e) {
        console.error('Erreur lors de la lecture des notes:', e);
        return;
    }

    // Filtrer les notes valides (rating entre 1 et 10)
    const validNotes = notes.filter(note => {
        const rating = Number(note.rating);
        return rating >= 1 && rating <= 10 && note.id && note.contentType;
    });

    if (validNotes.length !== notes.length) {
        localStorage.setItem(notesKey, JSON.stringify(validNotes));
        console.log(`🧹 ${notes.length - validNotes.length} notes invalides supprimées`);
    }
}

// Initialiser le service au chargement
document.addEventListener('DOMContentLoaded', function() {
    syncOldNotes();
    cleanNotes();
});

// Exporter les fonctions pour utilisation globale
window.noteService = {
    saveNote,
    removeNote,
    getNote,
    getNotesByType,
    getAllNotes,
    syncOldNotes,
    cleanNotes
}; 