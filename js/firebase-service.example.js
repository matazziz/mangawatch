// Service Firebase pour remplacer supabase.js
// EXEMPLE - À adapter selon vos besoins

import { 
  db, 
  auth 
} from './firebase-config.js';

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
  limit,
  Timestamp,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Collections Firestore
export const COLLECTIONS = {
  FORUM_TOPICS: 'forum_topics',
  FORUM_REPLIES: 'forum_replies',
  MESSAGES: 'messages',
  USER_NOTES: 'user_content_notes',
  USER_TOP10: 'user_top10',
  USER_PROFILES: 'user_profiles'
};

// ============================================
// SERVICE FORUM
// ============================================

export const forumService = {
  /**
   * Récupérer tous les sujets
   */
  async getTopics() {
    try {
      const topicsRef = collection(db, COLLECTIONS.FORUM_TOPICS);
      const q = query(topicsRef, orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des sujets:', error);
      throw error;
    }
  },

  /**
   * Récupérer un sujet par ID
   */
  async getTopic(topicId) {
    try {
      const topicRef = doc(db, COLLECTIONS.FORUM_TOPICS, topicId);
      const topicSnap = await getDoc(topicRef);
      
      if (!topicSnap.exists()) {
        return null;
      }
      
      return {
        id: topicSnap.id,
        ...topicSnap.data()
      };
    } catch (error) {
      console.error('Erreur lors de la récupération du sujet:', error);
      throw error;
    }
  },

  /**
   * Créer un nouveau sujet
   */
  async createTopic(topicData) {
    try {
      const topicsRef = collection(db, COLLECTIONS.FORUM_TOPICS);
      const newTopic = {
        ...topicData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        views: 0,
        replies_count: 0
      };
      
      const docRef = await addDoc(topicsRef, newTopic);
      return {
        id: docRef.id,
        ...newTopic
      };
    } catch (error) {
      console.error('Erreur lors de la création du sujet:', error);
      throw error;
    }
  },

  /**
   * Mettre à jour un sujet
   */
  async updateTopic(topicId, updates) {
    try {
      const topicRef = doc(db, COLLECTIONS.FORUM_TOPICS, topicId);
      await updateDoc(topicRef, {
        ...updates,
        updated_at: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du sujet:', error);
      throw error;
    }
  },

  /**
   * Supprimer un sujet
   */
  async deleteTopic(topicId) {
    try {
      const topicRef = doc(db, COLLECTIONS.FORUM_TOPICS, topicId);
      await deleteDoc(topicRef);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du sujet:', error);
      throw error;
    }
  },

  /**
   * Récupérer les réponses d'un sujet
   */
  async getTopicReplies(topicId) {
    try {
      const repliesRef = collection(db, COLLECTIONS.FORUM_REPLIES);
      const q = query(
        repliesRef,
        where('topic_id', '==', topicId),
        orderBy('created_at', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des réponses:', error);
      throw error;
    }
  },

  /**
   * Créer une réponse
   */
  async createReply(replyData) {
    try {
      const repliesRef = collection(db, COLLECTIONS.FORUM_REPLIES);
      const newReply = {
        ...replyData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };
      
      const docRef = await addDoc(repliesRef, newReply);
      
      // Mettre à jour le compteur de réponses du sujet
      const topicRef = doc(db, COLLECTIONS.FORUM_TOPICS, replyData.topic_id);
      const topicSnap = await getDoc(topicRef);
      if (topicSnap.exists()) {
        const currentCount = topicSnap.data().replies_count || 0;
        await updateDoc(topicRef, {
          replies_count: currentCount + 1
        });
      }
      
      return {
        id: docRef.id,
        ...newReply
      };
    } catch (error) {
      console.error('Erreur lors de la création de la réponse:', error);
      throw error;
    }
  },

  /**
   * Mettre à jour une réponse
   */
  async updateReply(replyId, updates) {
    try {
      const replyRef = doc(db, COLLECTIONS.FORUM_REPLIES, replyId);
      await updateDoc(replyRef, {
        ...updates,
        updated_at: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la réponse:', error);
      throw error;
    }
  },

  /**
   * Supprimer une réponse
   */
  async deleteReply(replyId) {
    try {
      const replyRef = doc(db, COLLECTIONS.FORUM_REPLIES, replyId);
      const replySnap = await getDoc(replyRef);
      
      if (replySnap.exists()) {
        const replyData = replySnap.data();
        
        // Décrémenter le compteur de réponses du sujet
        if (replyData.topic_id) {
          const topicRef = doc(db, COLLECTIONS.FORUM_TOPICS, replyData.topic_id);
          const topicSnap = await getDoc(topicRef);
          if (topicSnap.exists()) {
            const currentCount = topicSnap.data().replies_count || 0;
            await updateDoc(topicRef, {
              replies_count: Math.max(0, currentCount - 1)
            });
          }
        }
        
        await deleteDoc(replyRef);
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de la réponse:', error);
      throw error;
    }
  }
};

// ============================================
// SERVICE AUTHENTIFICATION
// ============================================

import {
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

export const authService = {
  /**
   * Se connecter avec Google
   */
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return {
        user: result.user,
        credential: GoogleAuthProvider.credentialFromResult(result)
      };
    } catch (error) {
      console.error('Erreur lors de la connexion Google:', error);
      throw error;
    }
  },

  /**
   * Se déconnecter
   */
  async signOut() {
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      throw error;
    }
  },

  /**
   * Récupérer l'utilisateur actuel
   */
  async getCurrentUser() {
    try {
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve({ data: { user }, error: null });
        });
      });
    } catch (error) {
      return { data: { user: null }, error };
    }
  },

  /**
   * Écouter les changements d'authentification
   */
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, (user) => {
      callback('SIGNED_IN', user);
    });
  }
};

// Exposer globalement pour compatibilité
if (typeof window !== 'undefined') {
  window.forumService = forumService;
  window.authService = authService;
}

