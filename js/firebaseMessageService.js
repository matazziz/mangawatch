// Service Firebase pour gérer les messages
// Remplace les fonctions Supabase dans messageService.js

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
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export const firebaseMessageService = {
  /**
   * Obtenir tous les messages (globaux + messages de l'utilisateur)
   * @param {string} userEmail - Email de l'utilisateur actuel
   * @returns {Promise<Array>} Liste des messages
   */
  async getMessages(userEmail) {
    try {
      const messagesRef = collection(db, COLLECTIONS.MESSAGES);
      
      // Récupérer les messages globaux (recipient_email est null)
      const globalQuery = query(
        messagesRef,
        where('recipient_email', '==', null),
        orderBy('created_at', 'desc')
      );
      
      const globalSnapshot = await getDocs(globalQuery);
      const globalMessages = globalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Récupérer les messages privés pour cet utilisateur
      let privateMessages = [];
      if (userEmail) {
        const privateQuery = query(
          messagesRef,
          where('recipient_email', '==', userEmail),
          orderBy('created_at', 'desc')
        );
        
        const privateSnapshot = await getDocs(privateQuery);
        privateMessages = privateSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
      
      // Combiner et trier (les deux requêtes sont déjà triées par Firestore grâce à l'index)
      const allMessages = [...globalMessages, ...privateMessages];
      return allMessages.sort((a, b) => {
        const dateA = a.created_at?.toMillis ? a.created_at.toMillis() : (a.created_at?.seconds ? a.created_at.seconds * 1000 : new Date(a.created_at).getTime());
        const dateB = b.created_at?.toMillis ? b.created_at.toMillis() : (b.created_at?.seconds ? b.created_at.seconds * 1000 : new Date(b.created_at).getTime());
        return dateB - dateA; // Tri décroissant (plus récent en premier)
      });
    } catch (error) {
      // Si l'erreur est liée à un index manquant, afficher un message plus clair avec le lien
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.error('[Firebase Messages] Index composite requis.');
        // Extraire le lien de création d'index depuis l'erreur si disponible
        const indexUrlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
        if (indexUrlMatch) {
          console.error('[Firebase Messages] Cliquez sur ce lien pour créer l\'index automatiquement:');
          console.error(indexUrlMatch[0]);
          // Ouvrir le lien dans un nouvel onglet (optionnel, commenté pour ne pas être intrusif)
          // window.open(indexUrlMatch[0], '_blank');
        } else {
          console.error('[Firebase Messages] Créez un index composite dans Firebase Console:');
          console.error('- Collection: messages');
          console.error('- Champs: recipient_email (Croissant) + created_at (Décroissant)');
        }
        // Retourner un tableau vide pour ne pas bloquer l'application
        return [];
      }
      console.error('[Firebase Messages] Erreur lors de la récupération:', error);
      return [];
    }
  },

  /**
   * Compter les messages non lus
   * @param {string} userEmail - Email de l'utilisateur
   * @param {Array} readMessages - Liste des IDs de messages lus
   * @returns {Promise<number>} Nombre de messages non lus
   */
  async getUnreadCount(userEmail, readMessages = []) {
    try {
      const messages = await this.getMessages(userEmail);
      
      return messages.filter(msg => {
        // Vérifier si le message a le champ is_read
        if (msg.hasOwnProperty('is_read')) {
          return !msg.is_read && !readMessages.includes(msg.id);
        }
        // Sinon, utiliser seulement la liste des messages lus
        return !readMessages.includes(msg.id);
      }).length;
    } catch (error) {
      console.error('[Firebase Messages] Erreur lors du comptage:', error);
      return 0;
    }
  },

  /**
   * Marquer un message comme lu
   * @param {string} messageId - ID du message
   * @returns {Promise<boolean>} Succès ou échec
   */
  async markAsRead(messageId) {
    try {
      const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
      await updateDoc(messageRef, {
        is_read: true,
        updated_at: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('[Firebase Messages] Erreur lors du marquage:', error);
      return false;
    }
  },

  /**
   * Marquer tous les messages comme lus
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<boolean>} Succès ou échec
   */
  async markAllAsRead(userEmail) {
    try {
      const messages = await this.getMessages(userEmail);
      const unreadMessages = messages.filter(m => !m.is_read);
      
      if (unreadMessages.length === 0) {
        return true;
      }
      
      // Mettre à jour tous les messages non lus
      const updatePromises = unreadMessages.map(msg => {
        const messageRef = doc(db, COLLECTIONS.MESSAGES, msg.id);
        return updateDoc(messageRef, {
          is_read: true,
          updated_at: serverTimestamp()
        });
      });
      
      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      console.error('[Firebase Messages] Erreur lors du marquage de tous:', error);
      return false;
    }
  },

  /**
   * Supprimer un message
   * @param {string} messageId - ID du message
   * @returns {Promise<boolean>} Succès ou échec
   */
  async deleteMessage(messageId) {
    try {
      const messageRef = doc(db, COLLECTIONS.MESSAGES, messageId);
      await deleteDoc(messageRef);
      return true;
    } catch (error) {
      console.error('[Firebase Messages] Erreur lors de la suppression:', error);
      return false;
    }
  },

  /**
   * Envoyer un message (admin seulement)
   * @param {Object} messageData - Données du message
   * @returns {Promise<Object|null>} Le message créé ou null
   */
  async sendMessage(messageData) {
    try {
      const { recipientEmail, title, content, messageType, metadata } = messageData;
      const currentUserEmail = this.getCurrentUserEmail();
      
      const message = {
        recipient_email: recipientEmail || null, // null pour global
        title: title || 'Message',
        content: content,
        message_type: messageType || 'info',
        is_read: false,
        created_at: serverTimestamp(),
        created_by: currentUserEmail,
        metadata: metadata || {}
      };

      const messagesRef = collection(db, COLLECTIONS.MESSAGES);
      const docRef = await addDoc(messagesRef, message);
      
      return {
        id: docRef.id,
        ...message
      };
    } catch (error) {
      console.error('[Firebase Messages] Erreur lors de l\'envoi:', error);
      return null;
    }
  },

  /**
   * Obtenir l'email de l'utilisateur actuel
   * @returns {string|null} Email de l'utilisateur
   */
  getCurrentUserEmail() {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.email;
      }
    } catch (e) {
      console.error('Erreur lors de la récupération de l\'email utilisateur:', e);
    }
    return null;
  },

  /**
   * Générer un ID unique
   * @returns {string} ID unique
   */
  generateId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Obtenir les types de messages disponibles
   * @returns {Object} Types de messages
   */
  getMessageTypes() {
    return {
      'info': { label: 'Information', icon: 'fa-info-circle', color: '#3498db' },
      'warning': { label: 'Avertissement', icon: 'fa-exclamation-triangle', color: '#f39c12' },
      'ban': { label: 'Bannissement', icon: 'fa-ban', color: '#e74c3c' },
      'thank': { label: 'Remerciement', icon: 'fa-heart', color: '#2ecc71' },
      'global': { label: 'Annonce globale', icon: 'fa-bullhorn', color: '#9b59b6' }
    };
  },

  /**
   * Obtenir la classe CSS selon le type de message
   * @param {string} messageType - Type de message
   * @returns {string} Classe CSS
   */
  getMessageTypeClass(messageType) {
    const types = {
      'info': 'message-info',
      'warning': 'message-warning',
      'ban': 'message-ban',
      'thank': 'message-thank',
      'global': 'message-global'
    };
    return types[messageType] || 'message-info';
  }
};

// Exporter pour utilisation globale
if (typeof window !== 'undefined') {
  window.firebaseMessageService = firebaseMessageService;
}

