// Service Firebase pour gérer les notes et le top 10
// Remplace supabaseNotesService.js

import { db, COLLECTIONS } from './firebase-service.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
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
        where('user_email', '==', userEmail),
        orderBy('added_at', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.content_id,
          note: data.note,
          contentType: data.content_type,
          addedAt: data.added_at?.toMillis ? data.added_at.toMillis() : (data.added_at?.seconds ? data.added_at.seconds * 1000 : Date.now()),
          titre: data.titre,
          image: data.image,
          synopsis: data.synopsis,
          genres: data.genres || [],
          score: data.score || 0
        };
      });
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
      const notesRef = collection(db, COLLECTIONS.USER_NOTES);
      const q = query(
        notesRef,
        where('user_email', '==', userEmail),
        where('content_id', '==', String(contentId)),
        where('content_type', '==', contentType)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const docData = querySnapshot.docs[0];
      const data = docData.data();
      
      return {
        id: data.content_id,
        note: data.note,
        contentType: data.content_type,
        addedAt: data.added_at?.toMillis ? data.added_at.toMillis() : (data.added_at?.seconds ? data.added_at.seconds * 1000 : Date.now()),
        titre: data.titre,
        image: data.image,
        synopsis: data.synopsis,
        genres: data.genres || [],
        score: data.score || 0
      };
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
      // Vérifier si la note existe déjà
      const existingNote = await this.getNote(
        userEmail,
        noteData.id,
        noteData.contentType
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
        // Mettre à jour la note existante
        const notesRef = collection(db, COLLECTIONS.USER_NOTES);
        const q = query(
          notesRef,
          where('user_email', '==', userEmail),
          where('content_id', '==', String(noteData.id)),
          where('content_type', '==', noteData.contentType)
        );
        
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docRef = doc(db, COLLECTIONS.USER_NOTES, querySnapshot.docs[0].id);
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
  async deleteNote(userEmail, contentId, contentType) {
    try {
      const notesRef = collection(db, COLLECTIONS.USER_NOTES);
      const q = query(
        notesRef,
        where('user_email', '==', userEmail),
        where('content_id', '==', String(contentId)),
        where('content_type', '==', contentType)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return false;
      }
      
      // Supprimer tous les documents correspondants (normalement un seul)
      const deletePromises = querySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
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

/**
 * Service pour gérer le top 10 utilisateur dans Firebase
 */
export const firebaseTop10Service = {
  /**
   * Récupère le top 10 d'un utilisateur
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<Array>} Liste du top 10 triée par rang
   */
  async getTop10(userEmail) {
    try {
      const top10Ref = collection(db, COLLECTIONS.USER_TOP10);
      const q = query(
        top10Ref,
        where('user_email', '==', userEmail),
        orderBy('rang', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.content_id,
          contentType: data.content_type,
          rang: data.rang,
          titre: data.titre,
          image: data.image,
          synopsis: data.synopsis,
          genres: data.genres || [],
          score: data.score || 0
        };
      });
    } catch (error) {
      console.error('[Firebase Top10] Erreur lors de la récupération:', error);
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
      // Vérifier si l'élément existe déjà
      const top10Ref = collection(db, COLLECTIONS.USER_TOP10);
      const q = query(
        top10Ref,
        where('user_email', '==', userEmail),
        where('content_id', '==', String(itemData.id)),
        where('content_type', '==', itemData.contentType)
      );
      
      const querySnapshot = await getDocs(q);
      
      const itemRecord = {
        user_email: userEmail,
        content_id: String(itemData.id),
        content_type: itemData.contentType,
        rang: itemData.rang,
        titre: itemData.titre || null,
        image: itemData.image || null,
        synopsis: itemData.synopsis || null,
        genres: Array.isArray(itemData.genres) ? itemData.genres : [],
        score: itemData.score || null,
        updated_at: serverTimestamp()
      };
      
      if (!querySnapshot.empty) {
        // Mettre à jour
        const docRef = doc(db, COLLECTIONS.USER_TOP10, querySnapshot.docs[0].id);
        await updateDoc(docRef, itemRecord);
      } else {
        // Créer
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
  async deleteTop10Item(userEmail, contentId, contentType) {
    try {
      const top10Ref = collection(db, COLLECTIONS.USER_TOP10);
      const q = query(
        top10Ref,
        where('user_email', '==', userEmail),
        where('content_id', '==', String(contentId)),
        where('content_type', '==', contentType)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return false;
      }
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
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

