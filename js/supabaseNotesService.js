// Service Supabase pour gérer les notes et le top 10
// Ce service remplace le localStorage pour éviter les problèmes de quota

import { supabase } from './supabase.js';
import { TABLES } from './config.js';

/**
 * Service pour gérer les notes utilisateur dans Supabase
 */
export const supabaseNotesService = {
    /**
     * Récupère toutes les notes d'un utilisateur
     * @param {string} userEmail - Email de l'utilisateur
     * @returns {Promise<Array>} Liste des notes
     */
    async getAllNotes(userEmail) {
        try {
            const { data, error } = await supabase
                .from(TABLES.NOTES)
                .select('*')
                .eq('user_email', userEmail)
                .order('added_at', { ascending: false });

            if (error) {
                console.error('[Supabase Notes] Erreur lors de la récupération des notes:', error);
                return [];
            }

            // Convertir les notes au format attendu par le frontend
            return (data || []).map(note => ({
                id: note.content_id,
                note: note.note,
                contentType: note.content_type,
                addedAt: new Date(note.added_at).getTime(),
                titre: note.titre,
                image: note.image,
                synopsis: note.synopsis,
                genres: note.genres || [],
                score: note.score || 0
            }));
        } catch (err) {
            console.error('[Supabase Notes] Erreur inattendue:', err);
            return [];
        }
    },

    /**
     * Récupère une note spécifique
     * @param {string} userEmail - Email de l'utilisateur
     * @param {string} contentId - ID du contenu
     * @param {string} contentType - Type de contenu
     * @returns {Promise<Object|null>} La note ou null
     */
    async getNote(userEmail, contentId, contentType) {
        try {
            const { data, error } = await supabase
                .from(TABLES.NOTES)
                .select('*')
                .eq('user_email', userEmail)
                .eq('content_id', String(contentId))
                .eq('content_type', contentType)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // Aucune note trouvée (normal)
                    return null;
                }
                console.error('[Supabase Notes] Erreur lors de la récupération de la note:', error);
                return null;
            }

            return {
                id: data.content_id,
                note: data.note,
                contentType: data.content_type,
                addedAt: new Date(data.added_at).getTime(),
                titre: data.titre,
                image: data.image,
                synopsis: data.synopsis,
                genres: data.genres || [],
                score: data.score || 0
            };
        } catch (err) {
            console.error('[Supabase Notes] Erreur inattendue:', err);
            return null;
        }
    },

    /**
     * Sauvegarde ou met à jour une note
     * @param {string} userEmail - Email de l'utilisateur
     * @param {Object} noteData - Données de la note
     * @returns {Promise<boolean>} Succès ou échec
     */
    async saveNote(userEmail, noteData) {
        try {
            console.log('[Supabase Notes] Début de la sauvegarde pour:', userEmail, noteData);
            
            // Vérifier que supabase est disponible
            if (!supabase) {
                console.error('[Supabase Notes] Supabase client non disponible');
                return false;
            }
            
            const noteRecord = {
                user_email: userEmail,
                content_id: String(noteData.id),
                content_type: noteData.contentType,
                note: Number(noteData.note),
                titre: noteData.titre || null,
                image: noteData.image || null,
                synopsis: noteData.synopsis || null,
                genres: Array.isArray(noteData.genres) ? noteData.genres : [],
                score: noteData.score || null
            };

            console.log('[Supabase Notes] Données à sauvegarder:', noteRecord);
            console.log('[Supabase Notes] Table:', TABLES.NOTES);

            // Utiliser upsert pour créer ou mettre à jour
            const { data, error } = await supabase
                .from(TABLES.NOTES)
                .upsert(noteRecord, {
                    onConflict: 'user_email,content_id,content_type',
                    ignoreDuplicates: false
                })
                .select();

            if (error) {
                console.error('[Supabase Notes] Erreur lors de la sauvegarde:', error);
                console.error('[Supabase Notes] Détails de l\'erreur:', JSON.stringify(error, null, 2));
                return false;
            }

            console.log('[Supabase Notes] Note sauvegardée avec succès:', data);
            return true;
        } catch (err) {
            console.error('[Supabase Notes] Erreur inattendue lors de la sauvegarde:', err);
            console.error('[Supabase Notes] Stack trace:', err.stack);
            return false;
        }
    },

    /**
     * Supprime une note
     * @param {string} userEmail - Email de l'utilisateur
     * @param {string} contentId - ID du contenu
     * @param {string} contentType - Type de contenu
     * @returns {Promise<boolean>} Succès ou échec
     */
    async deleteNote(userEmail, contentId, contentType) {
        try {
            const { error } = await supabase
                .from(TABLES.NOTES)
                .delete()
                .eq('user_email', userEmail)
                .eq('content_id', String(contentId))
                .eq('content_type', contentType);

            if (error) {
                console.error('[Supabase Notes] Erreur lors de la suppression:', error);
                return false;
            }

            console.log('[Supabase Notes] Note supprimée avec succès');
            return true;
        } catch (err) {
            console.error('[Supabase Notes] Erreur inattendue lors de la suppression:', err);
            return false;
        }
    },

    /**
     * Migre les notes du localStorage vers Supabase
     * @param {string} userEmail - Email de l'utilisateur
     * @returns {Promise<number>} Nombre de notes migrées
     */
    async migrateFromLocalStorage(userEmail) {
        try {
            const notesKey = 'user_content_notes_' + userEmail;
            const localNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');

            if (!Array.isArray(localNotes) || localNotes.length === 0) {
                console.log('[Supabase Notes] Aucune note locale à migrer');
                return 0;
            }

            console.log(`[Supabase Notes] Migration de ${localNotes.length} notes...`);

            let migrated = 0;
            for (const note of localNotes) {
                const success = await this.saveNote(userEmail, {
                    id: note.id,
                    note: note.note,
                    contentType: note.contentType,
                    titre: note.titre,
                    image: note.image,
                    synopsis: note.synopsis,
                    genres: note.genres,
                    score: note.score
                });

                if (success) {
                    migrated++;
                }
            }

            console.log(`[Supabase Notes] ${migrated}/${localNotes.length} notes migrées avec succès`);

            // Marquer la migration comme terminée
            if (migrated > 0) {
                localStorage.setItem(`notes_migrated_${userEmail}`, 'true');
            }

            return migrated;
        } catch (err) {
            console.error('[Supabase Notes] Erreur lors de la migration:', err);
            return 0;
        }
    }
};

/**
 * Service pour gérer le top 10 utilisateur dans Supabase
 */
export const supabaseTop10Service = {
    /**
     * Récupère le top 10 d'un utilisateur
     * @param {string} userEmail - Email de l'utilisateur
     * @returns {Promise<Array>} Liste du top 10 triée par rang
     */
    async getTop10(userEmail) {
        try {
            const { data, error } = await supabase
                .from(TABLES.TOP10)
                .select('*')
                .eq('user_email', userEmail)
                .order('rang', { ascending: true });

            if (error) {
                console.error('[Supabase Top10] Erreur lors de la récupération:', error);
                return [];
            }

            return (data || []).map(item => ({
                id: item.content_id,
                contentType: item.content_type,
                rang: item.rang,
                titre: item.titre,
                image: item.image,
                synopsis: item.synopsis,
                genres: item.genres || [],
                score: item.score || 0
            }));
        } catch (err) {
            console.error('[Supabase Top10] Erreur inattendue:', err);
            return [];
        }
    },

    /**
     * Ajoute ou met à jour un élément du top 10
     * @param {string} userEmail - Email de l'utilisateur
     * @param {Object} itemData - Données de l'élément
     * @returns {Promise<boolean>} Succès ou échec
     */
    async saveTop10Item(userEmail, itemData) {
        try {
            const top10Record = {
                user_email: userEmail,
                content_id: String(itemData.id),
                content_type: itemData.contentType,
                rang: itemData.rang,
                titre: itemData.titre || null,
                image: itemData.image || null,
                synopsis: itemData.synopsis || null,
                genres: Array.isArray(itemData.genres) ? itemData.genres : [],
                score: itemData.score || null
            };

            const { error } = await supabase
                .from(TABLES.TOP10)
                .upsert(top10Record, {
                    onConflict: 'user_email,content_id,content_type',
                    ignoreDuplicates: false
                });

            if (error) {
                console.error('[Supabase Top10] Erreur lors de la sauvegarde:', error);
                return false;
            }

            return true;
        } catch (err) {
            console.error('[Supabase Top10] Erreur inattendue:', err);
            return false;
        }
    },

    /**
     * Supprime un élément du top 10
     * @param {string} userEmail - Email de l'utilisateur
     * @param {string} contentId - ID du contenu
     * @param {string} contentType - Type de contenu
     * @returns {Promise<boolean>} Succès ou échec
     */
    async deleteTop10Item(userEmail, contentId, contentType) {
        try {
            const { error } = await supabase
                .from(TABLES.TOP10)
                .delete()
                .eq('user_email', userEmail)
                .eq('content_id', String(contentId))
                .eq('content_type', contentType);

            if (error) {
                console.error('[Supabase Top10] Erreur lors de la suppression:', error);
                return false;
            }

            return true;
        } catch (err) {
            console.error('[Supabase Top10] Erreur inattendue:', err);
            return false;
        }
    }
};

// Exporter pour utilisation globale
window.supabaseNotesService = supabaseNotesService;
window.supabaseTop10Service = supabaseTop10Service;

