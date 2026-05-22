// Service Firebase pour gérer les notes et le top 10
// Remplace supabaseNotesService.js

import { db, COLLECTIONS } from './firebase-service.js?v=6febe20';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/**
 * Service pour gérer les notes utilisateur dans Firebase
 */
export const firebaseNotesService = {
  /**
   * Récupère toutes les notes d'un utilisateur
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<Array>} Liste des notes
   */
  async getAllNotes(userEmail) {
    try {
      const notesRef = collection(db, COLLECTIONS.USER_NOTES);
      const q = query(
        notesRef,
        where('user_email', '==', userEmail)
      );
      
      const querySnapshot = await getDocs(q);

      const notes = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const tsMillis = (t) =>
          (t?.toMillis && t.toMillis()) || (typeof t?.seconds === 'number' ? t.seconds * 1000 : null);
        return {
          _docId: doc.id,
          id: data.content_id,
          note: data.note,
          contentType: data.content_type,
          addedAt: tsMillis(data.added_at) || Date.now(),
          updatedAt: tsMillis(data.updated_at),
          titre: data.titre,
          image: data.image,
          synopsis: data.synopsis,
          genres: data.genres || [],
          score: data.score || 0
        };
      });

      notes.sort((a, b) => Number(b.addedAt || 0) - Number(a.addedAt || 0));
      return notes;
    } catch (error) {
      console.error('[Firebase Notes] Erreur lors de la récupération:', error);
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
      const allNotes = await this.getAllNotes(userEmail);
      const found = allNotes.find(
        n => String(n.id) === String(contentId) && String(n.contentType) === String(contentType)
      );
      if (!found) {
        return null;
      }
      return found;
    } catch (error) {
      console.error('[Firebase Notes] Erreur lors de la récupération:', error);
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
      const allNotes = await this.getAllNotes(userEmail);
      const existingNote = allNotes.find(
        n => String(n.id) === String(noteData.id) && String(n.contentType) === String(noteData.contentType)
      );
      
      const noteRecord = {
        user_email: userEmail,
        content_id: String(noteData.id),
        content_type: noteData.contentType,
        note: Number(noteData.note),
        titre: noteData.titre || null,
        image: noteData.image || null,
        synopsis: noteData.synopsis || null,
        genres: Array.isArray(noteData.genres) ? noteData.genres : [],
        score: noteData.score || null,
        updated_at: serverTimestamp()
      };
      
      if (existingNote) {
        if (existingNote._docId) {
          const docRef = doc(db, COLLECTIONS.USER_NOTES, existingNote._docId);
          await updateDoc(docRef, noteRecord);
        }
      } else {
        // Créer une nouvelle note
        const notesRef = collection(db, COLLECTIONS.USER_NOTES);
        await addDoc(notesRef, {
          ...noteRecord,
          added_at: serverTimestamp()
        });
      }
      
      return true;
    } catch (error) {
      console.error('[Firebase Notes] Erreur lors de la sauvegarde:', error);
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
  async deleteNote(userEmail, contentId, contentType = null) {
    try {
      const notesRef = collection(db, COLLECTIONS.USER_NOTES);
      const q = query(
        notesRef,
        where('user_email', '==', userEmail)
      );
      
      const querySnapshot = await getDocs(q);
      const hasExplicitType = contentType !== null && contentType !== undefined && String(contentType).trim() !== '';
      const normalizedTargetType = hasExplicitType ? String(contentType).trim().toLowerCase() : null;
      const matches = querySnapshot.docs.filter(d => {
        const data = d.data();
        if (String(data.content_id) !== String(contentId)) return false;
        if (!hasExplicitType) return true;
        return String(data.content_type || '').trim().toLowerCase() === normalizedTargetType;
      });
      if (matches.length === 0) return false;

      const deletePromises = matches.map(d => deleteDoc(d.ref));
      
      await Promise.all(deletePromises);
      return true;
    } catch (error) {
      console.error('[Firebase Notes] Erreur lors de la suppression:', error);
      return false;
    }
  },

  /**
   * Migre les notes du localStorage vers Firebase
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<number>} Nombre de notes migrées
   */
  async migrateFromLocalStorage(userEmail) {
    try {
      const notesKey = 'user_content_notes_' + userEmail;
      const localNotes = JSON.parse(localStorage.getItem(notesKey) || '[]');

      if (!Array.isArray(localNotes) || localNotes.length === 0) {
        console.log('[Firebase Notes] Aucune note locale à migrer');
        return 0;
      }

      console.log(`[Firebase Notes] Migration de ${localNotes.length} notes...`);

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

      console.log(`[Firebase Notes] ${migrated}/${localNotes.length} notes migrées`);

      if (migrated > 0) {
        localStorage.setItem(`notes_migrated_${userEmail}`, 'true');
      }

      return migrated;
    } catch (error) {
      console.error('[Firebase Notes] Erreur lors de la migration:', error);
      return 0;
    }
  }
};

function normalizeTop10GenreKey(genre) {
  if (!genre || !String(genre).trim()) return '';
  return String(genre).toLowerCase().replace(/\s+/g, '_').replace(/,/g, '_');
}

function top10ItemMatchesType(itemContentType, selectedType) {
  if (!selectedType) return true;
  const ct = String(itemContentType || '').toLowerCase().trim();
  const st = String(selectedType || '').toLowerCase().trim();
  if (st === 'manga') return ['manga', 'doujin', 'doujinshi', 'manhwa', 'manhua', 'one_shot', 'one shot'].includes(ct);
  if (st === 'anime') return ['anime', 'tv', 'ova', 'ona', 'special', 'music'].includes(ct);
  if (st === 'film') return ['film', 'movie'].includes(ct);
  if (st === 'roman') return ['roman', 'novel', 'light novel', 'light_novel'].includes(ct);
  return ct === st;
}

/**
 * Service pour gérer le top 10 utilisateur dans Firebase
 */
export const firebaseTop10Service = {
  normalizeGenreKey: normalizeTop10GenreKey,

  /**
   * Récupère le top 10 d'un utilisateur
   * @param {string} userEmail - Email de l'utilisateur
   * @param {{ genreKey?: string|null, type?: string|null }} [options]
   * @returns {Promise<Array>} Liste du top 10 triée par rang
   */
  async getTop10(userEmail, options = {}) {
    const genreScope = normalizeTop10GenreKey(options.genreKey || options.genre || '');
    const typeFilter = options.type ? String(options.type).toLowerCase().trim() : null;
    try {
      const top10Ref = collection(db, COLLECTIONS.USER_TOP10);
      const q = query(
        top10Ref,
        where('user_email', '==', userEmail)
      );
      
      const querySnapshot = await getDocs(q);

      const items = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          _docId: doc.id,
          id: data.content_id,
          contentType: data.content_type,
          genreKey: normalizeTop10GenreKey(data.genre_key || ''),
          rang: data.rang,
          titre: data.titre,
          image: data.image,
          synopsis: data.synopsis,
          genres: data.genres || [],
          score: data.score || 0
        };
      }).filter(item => {
        if (normalizeTop10GenreKey(item.genreKey) !== genreScope) return false;
        if (typeFilter && !top10ItemMatchesType(item.contentType, typeFilter)) return false;
        return true;
      });
      items.sort((a, b) => Number(a.rang || 99) - Number(b.rang || 99));
      return items;
    } catch (error) {
      console.error('[Firebase Top10] Erreur lors de la récupération:', error);
      return [];
    }
  },

  /**
   * Retourne un tableau de 10 slots (null = vide) pour un scope genre/type.
   */
  async getTop10Slots(userEmail, options = {}) {
    const items = await this.getTop10(userEmail, options);
    const top10 = new Array(10).fill(null);
    for (const item of items) {
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
    return top10;
  },

  /**
   * Supprime tous les éléments d'un scope (global ou par genre + type optionnel).
   */
  async deleteTop10Scope(userEmail, { genreKey = '', type = null } = {}) {
    try {
      const top10Ref = collection(db, COLLECTIONS.USER_TOP10);
      const q = query(top10Ref, where('user_email', '==', userEmail));
      const querySnapshot = await getDocs(q);
      const scopeGenre = normalizeTop10GenreKey(genreKey);
      const typeFilter = type ? String(type).toLowerCase().trim() : null;
      const toDelete = querySnapshot.docs.filter(d => {
        const data = d.data();
        if (normalizeTop10GenreKey(data.genre_key || '') !== scopeGenre) return false;
        if (typeFilter && !top10ItemMatchesType(data.content_type, typeFilter)) return false;
        return true;
      });
      if (toDelete.length === 0) return true;
      await Promise.all(toDelete.map(d => deleteDoc(d.ref)));
      return true;
    } catch (error) {
      console.error('[Firebase Top10] Erreur lors de la suppression du scope:', error);
      return false;
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
      const top10Ref = collection(db, COLLECTIONS.USER_TOP10);
      const scopeGenreKey = normalizeTop10GenreKey(itemData.genreKey || itemData.genre_key || '');
      const allItems = await this.getTop10(userEmail);
      const existingItem = allItems.find(
        i => String(i.id) === String(itemData.id) &&
          String(i.contentType) === String(itemData.contentType) &&
          normalizeTop10GenreKey(i.genreKey) === scopeGenreKey
      );
      
      const itemRecord = {
        user_email: userEmail,
        content_id: String(itemData.id),
        content_type: itemData.contentType,
        genre_key: scopeGenreKey || null,
        rang: itemData.rang,
        titre: itemData.titre || null,
        image: itemData.image || null,
        synopsis: itemData.synopsis || null,
        genres: Array.isArray(itemData.genres) ? itemData.genres : [],
        score: itemData.score || null,
        updated_at: serverTimestamp()
      };
      
      if (existingItem && existingItem._docId) {
        const docRef = doc(db, COLLECTIONS.USER_TOP10, existingItem._docId);
        await updateDoc(docRef, itemRecord);
      } else {
        await addDoc(top10Ref, {
          ...itemRecord,
          created_at: serverTimestamp()
        });
      }
      
      return true;
    } catch (error) {
      console.error('[Firebase Top10] Erreur lors de la sauvegarde:', error);
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
  async deleteTop10Item(userEmail, contentId, contentType = null) {
    try {
      const top10Ref = collection(db, COLLECTIONS.USER_TOP10);
      const q = query(
        top10Ref,
        where('user_email', '==', userEmail)
      );
      
      const querySnapshot = await getDocs(q);
      const hasExplicitType = contentType !== null && contentType !== undefined && String(contentType).trim() !== '';
      const normalizedTargetType = hasExplicitType ? String(contentType).trim().toLowerCase() : null;
      const matches = querySnapshot.docs.filter(d => {
        const data = d.data();
        if (String(data.content_id) !== String(contentId)) return false;
        if (!hasExplicitType) return true;
        return String(data.content_type || '').trim().toLowerCase() === normalizedTargetType;
      });
      if (matches.length === 0) return false;
      const deletePromises = matches.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      return true;
    } catch (error) {
      console.error('[Firebase Top10] Erreur lors de la suppression:', error);
      return false;
    }
  }
};

// Exporter pour utilisation globale
if (typeof window !== 'undefined') {
  window.firebaseNotesService = firebaseNotesService;
  window.firebaseTop10Service = firebaseTop10Service;
}

