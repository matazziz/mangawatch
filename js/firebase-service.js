// Service Firebase pour remplacer supabase.js
// Ce fichier contient tous les services Firebase pour votre site

import { 
  db, 
  auth 
} from './firebase-config.js';

// Ré-exporter db et auth pour les autres modules
export { db, auth };

import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { storage } from './firebase-config.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Collections Firestore
export const COLLECTIONS = {
  FORUM_TOPICS: 'forum_topics',
  FORUM_REPLIES: 'forum_replies',
  MESSAGES: 'messages',
  USER_NOTES: 'user_content_notes',
  USER_TOP10: 'user_top10',
  USER_PROFILES: 'user_profiles',
  USER_LIST: 'user_list',
  SUPPORT_TICKETS: 'support_tickets'
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
        views: topicData.views || 0,
        replies_count: topicData.replies_count || 0
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
      if (replyData.topic_id) {
        const topicRef = doc(db, COLLECTIONS.FORUM_TOPICS, replyData.topic_id);
        const topicSnap = await getDoc(topicRef);
        if (topicSnap.exists()) {
          const currentCount = topicSnap.data().replies_count || 0;
          await updateDoc(topicRef, {
            replies_count: currentCount + 1
          });
        }
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
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

export const authService = {
  /**
   * Se connecter avec Google
   */
  async signInWithGoogle() {
    try {
      console.log('🔐 Firebase auth object:', auth);
      console.log('🔐 Firebase auth domain:', auth?.app?.options?.authDomain);
      
      if (!auth) {
        throw new Error('Firebase auth n\'est pas initialisé. Vérifiez firebase-config.js');
      }
      
      const provider = new GoogleAuthProvider();
      console.log('🔐 GoogleAuthProvider créé');
      
      // Ajouter des scopes si nécessaire
      provider.addScope('profile');
      provider.addScope('email');
      
      console.log('🔐 Tentative de connexion avec popup...');
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Connexion réussie:', result);
      
      return {
        user: result.user,
        credential: GoogleAuthProvider.credentialFromResult(result)
      };
    } catch (error) {
      console.error('❌ Erreur détaillée lors de la connexion Google:', error);
      console.error('❌ Code d\'erreur:', error.code);
      console.error('❌ Message d\'erreur:', error.message);
      console.error('❌ Stack:', error.stack);
      
      // Messages d'erreur plus spécifiques
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('La popup a été fermée. Veuillez réessayer.');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('La popup a été bloquée par le navigateur. Veuillez autoriser les popups pour ce site.');
      } else if (error.code === 'auth/unauthorized-domain') {
        throw new Error('Ce domaine n\'est pas autorisé. Veuillez ajouter ' + window.location.hostname + ' dans Firebase Console > Authentication > Settings > Authorized domains.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Erreur de connexion réseau. Vérifiez votre connexion internet.');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('La connexion Google n\'est pas activée. Activez-la dans Firebase Console > Authentication > Sign-in method.');
      }
      
      throw error;
    }
  },

  /**
   * Se connecter avec Email/Password
   */
  async signInWithEmail(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return {
        user: result.user
      };
    } catch (error) {
      console.error('Erreur lors de la connexion Email:', error);
      throw error;
    }
  },

  /**
   * Créer un compte avec Email/Password
   */
  async signUpWithEmail(email, password) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return {
        user: result.user
      };
    } catch (error) {
      console.error('Erreur lors de la création du compte:', error);
      throw error;
    }
  },

  /**
   * Se déconnecter
   */
  async signOut() {
    try {
      await firebaseSignOut(auth);
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

// ============================================
// SERVICE BANNIÈRES
// ============================================

export const bannerService = {
  /**
   * Sauvegarde une bannière (image ou vidéo) dans Firebase Storage et Firestore
   * @param {string} userEmail - Email de l'utilisateur
   * @param {string} type - 'image' ou 'video'
   * @param {string|File} source - URL (si déjà uploadée) ou File (à uploader)
   * @param {number} volume - Volume de la vidéo (0-100)
   * @returns {Promise<Object>} Données de la bannière sauvegardée
   */
  async saveBanner(userEmail, type, source, volume = 0) {
    try {
      // Vérifier que l'utilisateur est authentifié avec Firebase Auth
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('[Firebase Banner] Utilisateur non authentifié avec Firebase Auth');
        throw new Error('Utilisateur non authentifié. Veuillez vous reconnecter avec Firebase Auth.');
      }
      
      console.log('[Firebase Banner] Utilisateur authentifié:', currentUser.email);
      console.log('[Firebase Banner] UID:', currentUser.uid);
      
      // Vérifier que l'utilisateur a un token valide
      try {
        const token = await currentUser.getIdToken();
        console.log('[Firebase Banner] Token obtenu:', token ? 'Oui' : 'Non');
        console.log('[Firebase Banner] Token (premiers caractères):', token ? token.substring(0, 20) + '...' : 'Aucun');
      } catch (tokenError) {
        console.error('[Firebase Banner] Erreur lors de la récupération du token:', tokenError);
      }
      
      // Récupérer les informations du profil existant pour supprimer l'ancienne bannière plus tard
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userEmail);
      const profileDoc = await getDoc(profileRef);
      
      // Stocker l'URL de l'ancienne bannière pour la supprimer après l'upload
      let oldBannerUrl = null;
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        if (data.banner && data.banner.url) {
          oldBannerUrl = data.banner.url;
        }
      }
      
      let bannerUrl = source;
      
      // Si c'est un File, l'uploader dans Firebase Storage
      if (source instanceof File) {
        const fileExtension = source.name.split('.').pop();
        const fileName = `banners/${userEmail}_${Date.now()}.${fileExtension}`;
        const storageRef = ref(storage, fileName);
        
        try {
          console.log('[Firebase Banner] Début upload:', { fileName, size: source.size, type: source.type });
          // Uploader le fichier
          await uploadBytes(storageRef, source);
          console.log('[Firebase Banner] Upload réussi, récupération de l\'URL...');
          
          // Récupérer l'URL de téléchargement
          bannerUrl = await getDownloadURL(storageRef);
          console.log('[Firebase Banner] URL récupérée:', bannerUrl);
        } catch (storageError) {
          console.error('[Firebase Banner] Erreur upload Storage:', {
            message: storageError.message,
            code: storageError.code,
            name: storageError.name,
            stack: storageError.stack
          });
          // Vérifier si c'est une erreur CORS (plusieurs formats possibles)
          const errorMessage = storageError.message || storageError.toString() || '';
          const errorCode = storageError.code || '';
          // Ne PAS confondre storage/unauthorized avec CORS
          // storage/unauthorized = problème de règles de sécurité
          // CORS = problème de configuration CORS
          const isCorsError = errorMessage.includes('CORS') || 
                            errorMessage.includes('preflight') ||
                            errorMessage.includes('Access-Control') ||
                            errorMessage.includes('blocked') ||
                            errorCode === 'storage/canceled' ||
                            storageError.name === 'NetworkError';
          
          const isPermissionError = errorCode === 'storage/unauthorized' || 
                                   errorCode === 'permission-denied';
          
          if (isPermissionError) {
            console.error('[Firebase Banner] Erreur de permissions Storage:', errorMessage);
            console.error('[Firebase Banner] Vérifiez que :');
            console.error('1. Les règles Storage sont publiées dans Firebase Console → Storage → Rules');
            console.error('2. L\'utilisateur est bien authentifié avec Firebase Auth');
            console.error('3. Les règles permettent l\'écriture pour les utilisateurs authentifiés');
            const permissionError = new Error('PERMISSION_DENIED: ' + errorMessage);
            permissionError.code = errorCode;
            permissionError.originalError = storageError;
            throw permissionError;
          }
          
          if (isCorsError) {
            console.warn('[Firebase Banner] Erreur CORS lors de l\'upload:', errorMessage);
            console.warn('[Firebase Banner] Configurez CORS avec: gsutil cors set cors.json gs://mangawatch-98ed0.firebasestorage.app');
            const corsError = new Error('CORS_ERROR');
            corsError.isCorsError = true;
            corsError.originalError = storageError;
            throw corsError;
          }
          
          throw storageError;
        }
      }
      
      // Sauvegarder les métadonnées dans Firestore
      // IMPORTANT : Sauvegarder même si la suppression de l'ancienne bannière a échoué
      // (profileRef et profileDoc sont déjà définis plus haut)
      
      const bannerDataForFirestore = {
        type: type,
        url: bannerUrl,
        volume: volume,
        updatedAt: serverTimestamp()
      };
      
      // Version pour localStorage (sans serverTimestamp)
      const bannerDataForLocalStorage = {
        type: type,
        url: bannerUrl,
        volume: volume,
        updatedAt: new Date().toISOString()
      };
      
      try {
        if (profileDoc.exists()) {
          // Mettre à jour le profil existant
          await updateDoc(profileRef, {
            banner: bannerDataForFirestore,
            updated_at: serverTimestamp()
          });
          console.log('[Firebase Banner] ✅ Profil mis à jour dans Firestore');
        } else {
          // Créer un nouveau profil avec setDoc
          await setDoc(profileRef, {
            id: userEmail,
            email: userEmail,
            banner: bannerDataForFirestore,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
          console.log('[Firebase Banner] ✅ Nouveau profil créé dans Firestore');
        }
      } catch (firestoreError) {
        console.error('[Firebase Banner] ❌ Erreur lors de la sauvegarde dans Firestore:', firestoreError);
        // Si la sauvegarde dans Firestore échoue, lancer l'erreur pour que l'utilisateur soit informé
        throw new Error('Erreur lors de la sauvegarde dans Firestore: ' + (firestoreError.message || firestoreError));
      }
      
      // Ne PAS sauvegarder dans localStorage - utiliser uniquement Firebase Storage
      // localStorage est utilisé uniquement comme cache de lecture (fallback)
      console.log('[Firebase Banner] ✅ Bannière sauvegardée avec succès dans Firebase Storage et Firestore');
      
      // Supprimer l'ancienne bannière APRÈS avoir sauvegardé la nouvelle
      // Cela garantit que même si la suppression échoue, la nouvelle bannière est déjà sauvegardée
      if (oldBannerUrl && oldBannerUrl.includes('firebasestorage') && oldBannerUrl !== bannerUrl) {
        try {
          // Extraire le chemin du fichier depuis l'URL Firebase
          const urlObj = new URL(oldBannerUrl);
          const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
          if (pathMatch && pathMatch[1]) {
            // Décoder le chemin (les espaces sont encodés en %20)
            const filePath = decodeURIComponent(pathMatch[1]);
            console.log('[Firebase Banner] Suppression de l\'ancienne bannière:', filePath);
            const oldStorageRef = ref(storage, filePath);
            await deleteObject(oldStorageRef);
            console.log('[Firebase Banner] ✅ Ancienne bannière supprimée avec succès');
          }
        } catch (deleteError) {
          // Ne pas bloquer le processus si la suppression échoue
          // L'ancienne bannière peut être déjà supprimée ou avoir des permissions différentes
          // La nouvelle bannière est déjà sauvegardée, donc ce n'est pas critique
          console.warn('[Firebase Banner] ⚠️ Erreur lors de la suppression de l\'ancienne bannière (non bloquant):', deleteError.message || deleteError);
          console.warn('[Firebase Banner] La nouvelle bannière a été sauvegardée avec succès, l\'ancienne sera supprimée manuellement si nécessaire');
        }
      }
      
      return bannerDataForLocalStorage;
    } catch (error) {
      console.error('[Firebase Banner] Erreur lors de la sauvegarde:', error);
      console.error('[Firebase Banner] Détails de l\'erreur:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
      throw error;
    }
  },

  /**
   * Charge la bannière d'un utilisateur depuis Firestore
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<Object|null>} Données de la bannière ou null
   */
  async getBanner(userEmail) {
    try {
      console.log('[Firebase Banner] getBanner appelé pour:', userEmail);
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userEmail);
      // Utiliser getDocFromServer pour forcer une lecture fraîche (éviter le cache Firestore qui renverrait l'ancienne bannière)
      let profileDoc;
      try {
        profileDoc = await getDocFromServer(profileRef);
      } catch (serverErr) {
        // En cas d'erreur réseau, fallback vers getDoc (cache)
        console.warn('[Firebase Banner] Lecture serveur échouée, fallback cache:', serverErr?.message);
        profileDoc = await getDoc(profileRef);
      }
      
      console.log('[Firebase Banner] Document existe:', profileDoc.exists());
      
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        console.log('[Firebase Banner] Données du document:', data);
        if (data.banner) {
          // Convertir le timestamp si nécessaire
          const banner = {
            type: data.banner.type,
            url: data.banner.url,
            volume: data.banner.volume || 0,
            updatedAt: data.banner.updatedAt?.toMillis ? data.banner.updatedAt.toMillis() : Date.now()
          };
          
          console.log('[Firebase Banner] Bannière trouvée dans Firestore:', banner);
          
          // Ne PAS sauvegarder dans localStorage - utiliser uniquement Firebase Storage
          // localStorage est utilisé uniquement comme cache de lecture (fallback)
          
          return banner;
        } else {
          console.log('[Firebase Banner] Pas de bannière dans les données du document');
        }
      } else {
        console.log('[Firebase Banner] Document n\'existe pas dans Firestore');
      }
      
      // Fallback vers localStorage si pas dans Firestore
      console.log('[Firebase Banner] Fallback vers localStorage...');
      const localBanner = localStorage.getItem('profile_banner_' + userEmail);
      if (localBanner) {
        try {
          const parsed = JSON.parse(localBanner);
          console.log('[Firebase Banner] Bannière trouvée dans localStorage:', parsed);
          return parsed;
        } catch (e) {
          console.error('[Firebase Banner] Erreur parsing localStorage:', e);
        }
      } else {
        console.log('[Firebase Banner] Aucune bannière dans localStorage');
      }
      
      return null;
    } catch (error) {
      console.error('[Firebase Banner] Erreur lors du chargement:', error);
      // Fallback vers localStorage
      const localBanner = localStorage.getItem('profile_banner_' + userEmail);
      if (localBanner) {
        try {
          return JSON.parse(localBanner);
        } catch (e) {
          return null;
        }
      }
      return null;
    }
  },

  /**
   * Supprime la bannière d'un utilisateur
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<boolean>} Succès ou échec
   */
  async deleteBanner(userEmail) {
    try {
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userEmail);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        if (data.banner && data.banner.url) {
          // Supprimer le fichier de Storage si c'est une URL Firebase
          if (data.banner.url.includes('firebasestorage')) {
            try {
              // Extraire le chemin du fichier depuis l'URL Firebase
              // Format d'URL: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?alt=media&token=...
              // On doit extraire le PATH
              const urlObj = new URL(data.banner.url);
              const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
              if (pathMatch && pathMatch[1]) {
                // Décoder le chemin (les espaces sont encodés en %20)
                const filePath = decodeURIComponent(pathMatch[1]);
                console.log('[Firebase Banner] Suppression du fichier:', filePath);
                const storageRef = ref(storage, filePath);
                await deleteObject(storageRef);
                console.log('[Firebase Banner] Fichier supprimé avec succès');
              } else {
                console.warn('[Firebase Banner] Impossible d\'extraire le chemin du fichier depuis l\'URL:', data.banner.url);
              }
            } catch (storageError) {
              console.warn('[Firebase Banner] Erreur suppression Storage (peut être déjà supprimé):', storageError);
            }
          }
        }
        
        // Supprimer les métadonnées dans Firestore
        await updateDoc(profileRef, {
          banner: null,
          updated_at: serverTimestamp()
        });
        console.log('[Firebase Banner] Métadonnées supprimées de Firestore');
      }
      
      // Supprimer aussi de localStorage
      localStorage.removeItem('profile_banner_' + userEmail);
      
      return true;
    } catch (error) {
      console.error('[Firebase Banner] Erreur lors de la suppression:', error);
      return false;
    }
  }
};

// ============================================
// SERVICE AVATARS
// ============================================

export const avatarService = {
  /**
   * Sauvegarde un avatar dans Firebase Storage et Firestore
   * @param {string} userEmail - Email de l'utilisateur
   * @param {File} file - Fichier image à uploader
   * @returns {Promise<string>} URL de l'avatar sauvegardé
   */
  async saveAvatar(userEmail, file) {
    try {
      // Vérifier que l'utilisateur est authentifié avec Firebase Auth
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('[Firebase Avatar] Utilisateur non authentifié avec Firebase Auth');
        throw new Error('Utilisateur non authentifié. Veuillez vous reconnecter avec Firebase Auth.');
      }
      
      console.log('[Firebase Avatar] Utilisateur authentifié:', currentUser.email);
      
      // Récupérer les informations du profil existant pour supprimer l'ancien avatar plus tard
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userEmail);
      const profileDoc = await getDoc(profileRef);
      
      // Stocker l'URL de l'ancien avatar pour la supprimer après l'upload
      let oldAvatarUrl = null;
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        if (data.avatar) {
          oldAvatarUrl = data.avatar;
        }
      }
      
      // Uploader le fichier dans Firebase Storage
      const fileExtension = file.name.split('.').pop();
      const fileName = `avatars/${userEmail}_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, fileName);
      
      try {
        console.log('[Firebase Avatar] Début upload:', { fileName, size: file.size, type: file.type });
        // Uploader le fichier
        await uploadBytes(storageRef, file);
        console.log('[Firebase Avatar] Upload réussi, récupération de l\'URL...');
        
        // Récupérer l'URL de téléchargement
        const avatarUrl = await getDownloadURL(storageRef);
        console.log('[Firebase Avatar] URL récupérée:', avatarUrl);
        
        // Sauvegarder les métadonnées dans Firestore
        try {
          if (profileDoc.exists()) {
            // Mettre à jour le profil existant
            await updateDoc(profileRef, {
              avatar: avatarUrl,
              updated_at: serverTimestamp()
            });
            console.log('[Firebase Avatar] ✅ Profil mis à jour dans Firestore');
          } else {
            // Créer un nouveau profil avec setDoc
            await setDoc(profileRef, {
              id: userEmail,
              email: userEmail,
              avatar: avatarUrl,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp()
            });
            console.log('[Firebase Avatar] ✅ Nouveau profil créé dans Firestore');
          }
        } catch (firestoreError) {
          console.error('[Firebase Avatar] ❌ Erreur lors de la sauvegarde dans Firestore:', firestoreError);
          throw new Error('Erreur lors de la sauvegarde dans Firestore: ' + (firestoreError.message || firestoreError));
        }
        
        console.log('[Firebase Avatar] ✅ Avatar sauvegardé avec succès dans Firebase Storage et Firestore');
        
        // Supprimer l'ancien avatar APRÈS avoir sauvegardé le nouveau
        if (oldAvatarUrl && oldAvatarUrl.includes('firebasestorage') && oldAvatarUrl !== avatarUrl) {
          try {
            // Extraire le chemin du fichier depuis l'URL Firebase
            const urlObj = new URL(oldAvatarUrl);
            const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
            if (pathMatch && pathMatch[1]) {
              // Décoder le chemin (les espaces sont encodés en %20)
              const filePath = decodeURIComponent(pathMatch[1]);
              console.log('[Firebase Avatar] Suppression de l\'ancien avatar:', filePath);
              const oldStorageRef = ref(storage, filePath);
              await deleteObject(oldStorageRef);
              console.log('[Firebase Avatar] ✅ Ancien avatar supprimé avec succès');
            }
          } catch (deleteError) {
            // Ne pas bloquer le processus si la suppression échoue
            console.warn('[Firebase Avatar] ⚠️ Erreur lors de la suppression de l\'ancien avatar (non bloquant):', deleteError.message || deleteError);
          }
        }
        
        return avatarUrl;
      } catch (storageError) {
        console.error('[Firebase Avatar] Erreur upload Storage:', {
          message: storageError.message,
          code: storageError.code,
          name: storageError.name
        });
        const errorMessage = storageError.message || storageError.toString() || '';
        const errorCode = storageError.code || '';
        
        const isPermissionError = errorCode === 'storage/unauthorized' || 
                                 errorCode === 'permission-denied';
        
        if (isPermissionError) {
          const permissionError = new Error('PERMISSION_DENIED: ' + errorMessage);
          permissionError.code = errorCode;
          permissionError.originalError = storageError;
          throw permissionError;
        }
        
        throw storageError;
      }
    } catch (error) {
      console.error('[Firebase Avatar] Erreur lors de la sauvegarde:', error);
      throw error;
    }
  },

  /**
   * Charge l'avatar d'un utilisateur depuis Firestore
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<string|null>} URL de l'avatar ou null
   */
  async getAvatar(userEmail) {
    try {
      console.log('[Firebase Avatar] getAvatar appelé pour:', userEmail);
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userEmail);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        if (data.avatar) {
          console.log('[Firebase Avatar] Avatar trouvé dans Firestore:', data.avatar);
          return data.avatar;
        }
      }
      
      console.log('[Firebase Avatar] Aucun avatar trouvé dans Firestore');
      return null;
    } catch (error) {
      console.error('[Firebase Avatar] Erreur lors du chargement:', error);
      return null;
    }
  },

  /**
   * Supprime l'avatar d'un utilisateur
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<boolean>} Succès ou échec
   */
  async deleteAvatar(userEmail) {
    try {
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userEmail);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        if (data.avatar && data.avatar.includes('firebasestorage')) {
          try {
            // Extraire le chemin du fichier depuis l'URL Firebase
            const urlObj = new URL(data.avatar);
            const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
            if (pathMatch && pathMatch[1]) {
              const filePath = decodeURIComponent(pathMatch[1]);
              console.log('[Firebase Avatar] Suppression du fichier:', filePath);
              const storageRef = ref(storage, filePath);
              await deleteObject(storageRef);
              console.log('[Firebase Avatar] Fichier supprimé avec succès');
            }
          } catch (storageError) {
            console.warn('[Firebase Avatar] Erreur suppression Storage (peut être déjà supprimé):', storageError);
          }
        }
        
        // Supprimer les métadonnées dans Firestore
        await updateDoc(profileRef, {
          avatar: null,
          updated_at: serverTimestamp()
        });
        console.log('[Firebase Avatar] Métadonnées supprimées de Firestore');
      }
      
      return true;
    } catch (error) {
      console.error('[Firebase Avatar] Erreur lors de la suppression:', error);
      return false;
    }
  }
};

// ============================================
// SERVICE CERTIFICATION
// ============================================

export const verificationService = {
  /**
   * Marque un utilisateur comme certifié
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<boolean>} Succès ou échec
   */
  async verifyUser(userEmail) {
    try {
      // Vérifier que l'utilisateur est authentifié
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('[Firebase Verification] Utilisateur non authentifié');
        throw new Error('Utilisateur non authentifié');
      }
      
      console.log('[Firebase Verification] Certification de l\'utilisateur:', userEmail);
      console.log('[Firebase Verification] Utilisateur authentifié:', currentUser.email);
      
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userEmail);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        // Mettre à jour le profil existant
        console.log('[Firebase Verification] Mise à jour du profil existant...');
        await updateDoc(profileRef, {
          verified: true,
          updated_at: serverTimestamp()
        });
        console.log('[Firebase Verification] ✅ Profil mis à jour avec verified: true');
      } else {
        // Créer un nouveau profil avec setDoc
        console.log('[Firebase Verification] Création d\'un nouveau profil...');
        await setDoc(profileRef, {
          id: userEmail,
          email: userEmail,
          verified: true,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        console.log('[Firebase Verification] ✅ Nouveau profil créé avec verified: true');
      }
      
      // Mettre à jour aussi localStorage pour compatibilité
      const verified = JSON.parse(localStorage.getItem('verified_users') || '[]');
      if (!verified.includes(userEmail)) {
        verified.push(userEmail);
        localStorage.setItem('verified_users', JSON.stringify(verified));
      }
      
      console.log('[Firebase Verification] ✅ Utilisateur certifié avec succès:', userEmail);
      return true;
    } catch (error) {
      console.error('[Firebase Verification] ❌ Erreur lors de la certification:', error);
      console.error('[Firebase Verification] Détails:', {
        message: error.message,
        code: error.code,
        name: error.name
      });
      return false;
    }
  },

  /**
   * Retire la certification d'un utilisateur
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<boolean>} Succès ou échec
   */
  async unverifyUser(userEmail) {
    try {
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userEmail);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        // Mettre à jour le profil existant
        await updateDoc(profileRef, {
          verified: false,
          updated_at: serverTimestamp()
        });
      }
      
      // Mettre à jour aussi localStorage pour compatibilité
      const verified = JSON.parse(localStorage.getItem('verified_users') || '[]');
      const index = verified.indexOf(userEmail);
      if (index > -1) {
        verified.splice(index, 1);
        localStorage.setItem('verified_users', JSON.stringify(verified));
      }
      
      console.log('[Firebase Verification] ✅ Certification retirée:', userEmail);
      return true;
    } catch (error) {
      console.error('[Firebase Verification] ❌ Erreur lors du retrait de certification:', error);
      return false;
    }
  },

  /**
   * Vérifie si un utilisateur est certifié
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<boolean>} True si certifié, false sinon
   */
  async isUserVerified(userEmail) {
    try {
      console.log('[Firebase Verification] Vérification du statut pour:', userEmail);
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userEmail);
      const profileDoc = await getDoc(profileRef);
      
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        console.log('[Firebase Verification] Données du profil:', data);
        if (data.verified === true) {
          console.log('[Firebase Verification] ✅ Utilisateur certifié trouvé dans Firestore:', userEmail);
          return true;
        } else {
          console.log('[Firebase Verification] ⚠️ Utilisateur non certifié dans Firestore (verified:', data.verified, ')');
        }
      } else {
        console.log('[Firebase Verification] ⚠️ Profil n\'existe pas dans Firestore');
      }
      
      // Fallback vers localStorage
      const verified = JSON.parse(localStorage.getItem('verified_users') || '[]');
      const isVerified = verified.includes(userEmail);
      console.log('[Firebase Verification] Fallback localStorage:', isVerified);
      return isVerified;
    } catch (error) {
      console.error('[Firebase Verification] ❌ Erreur lors de la vérification:', error);
      // Fallback vers localStorage
      const verified = JSON.parse(localStorage.getItem('verified_users') || '[]');
      return verified.includes(userEmail);
    }
  }
};

// ============================================
// SERVICE PARAMÈTRES PROFIL (confidentialité abonnements)
// ============================================

export const profileSettingsService = {
  /**
   * Récupère le paramètre "masquer abonnements" d'un utilisateur (pour affichage profil public)
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<boolean>} true si masqué, false sinon
   */
  async getHideFollows(userEmail) {
    try {
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userEmail);
      const profileDoc = await getDoc(profileRef);
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        return data.hideFollows === true;
      }
      return false;
    } catch (error) {
      console.warn('[Firebase ProfileSettings] getHideFollows:', error);
      return false;
    }
  },

  /**
   * Enregistre le paramètre "masquer abonnements" (depuis le profil perso)
   * @param {string} userEmail - Email de l'utilisateur
   * @param {boolean} hide - true pour masquer
   * @returns {Promise<void>}
   */
  async setHideFollows(userEmail, hide) {
    try {
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userEmail);
      const profileDoc = await getDoc(profileRef);
      if (profileDoc.exists()) {
        await updateDoc(profileRef, { hideFollows: !!hide, updated_at: serverTimestamp() });
      } else {
        await setDoc(profileRef, { hideFollows: !!hide, updated_at: serverTimestamp() });
      }
    } catch (error) {
      console.error('[Firebase ProfileSettings] setHideFollows:', error);
      throw error;
    }
  }
};

// ============================================
// SERVICE PROFIL COMPTE (pseudo, pays, langue — synchronisation multi-domaines)
// ============================================

export const profileAccountService = {
  /**
   * Récupère les infos compte (pseudo, pays, langue) depuis Firestore pour un email.
   * Utilisé au login Google pour restaurer pseudo/badge pays sur n'importe quel domaine.
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<{ username?: string, country?: string, langue?: string }|null>}
   */
  async getProfileAccountInfo(userEmail) {
    try {
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userEmail);
      const profileDoc = await getDoc(profileRef);
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        return {
          username: data.username || null,
          country: data.country || data.continent || null,
          langue: data.langue || data.language || null,
          avatar: data.avatar || null
        };
      }
      return null;
    } catch (error) {
      console.warn('[Firebase ProfileAccount] getProfileAccountInfo:', error);
      return null;
    }
  },

  /**
   * Met à jour les champs compte (username, country, langue) dans Firestore.
   * Appelé quand l'utilisateur modifie son pseudo ou pays sur la page profil.
   * @param {string} userEmail - Email de l'utilisateur
   * @param {{ username?: string, country?: string, langue?: string }} fields - Champs à mettre à jour
   * @returns {Promise<void>}
   */
  async setProfileAccountInfo(userEmail, fields) {
    try {
      const profileRef = doc(db, COLLECTIONS.USER_PROFILES, userEmail);
      const profileDoc = await getDoc(profileRef);
      const updates = { updated_at: serverTimestamp() };
      if (fields.username !== undefined) updates.username = fields.username;
      if (fields.country !== undefined) updates.country = fields.country;
      if (fields.langue !== undefined) updates.langue = fields.langue;
      if (profileDoc.exists()) {
        await updateDoc(profileRef, updates);
      } else {
        await setDoc(profileRef, {
          id: userEmail,
          email: userEmail,
          ...updates,
          created_at: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('[Firebase ProfileAccount] setProfileAccountInfo:', error);
      throw error;
    }
  }
};

if (typeof window !== 'undefined') {
  window.profileAccountService = profileAccountService;
}

// ============================================
// SERVICE COLLECTION (LISTE UTILISATEUR)
// ============================================

export const collectionService = {
  /**
   * Récupère tous les items de la collection d'un utilisateur
   * @param {string} userEmail - Email de l'utilisateur
   * @returns {Promise<Array>} Liste des items de la collection
   */
  async getAllItems(userEmail) {
    try {
      console.log('[Firebase Collection] Récupération de la collection pour:', userEmail);
      const listRef = collection(db, COLLECTIONS.USER_LIST);
      const q = query(
        listRef,
        where('user_email', '==', userEmail)
      );
      
      const querySnapshot = await getDocs(q);
      
      const items = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.content_id || data.id,
          title: data.title || data.titre,
          type: data.type || data.content_type,
          status: data.status,
          imageUrl: data.image_url || data.image || data.imageUrl,
          synopsis: data.synopsis || '',
          episodes: data.episodes,
          volumes: data.volumes,
          year: data.year,
          genres: data.genres || [],
          score: data.score || 0,
          stoppedAt: data.stopped_at || data.stoppedAt,
          addedDate: data.added_date || data.addedDate,
          dateUpdated: data.date_updated || data.dateUpdated,
          firebaseId: doc.id
        };
      });
      
      console.log('[Firebase Collection] ✅ Collection récupérée:', items.length, 'items');
      return items;
    } catch (error) {
      console.error('[Firebase Collection] ❌ Erreur lors de la récupération:', error);
      // Fallback vers localStorage
      const localList = JSON.parse(localStorage.getItem(`user_list_${userEmail}`) || '[]');
      console.log('[Firebase Collection] Fallback localStorage:', localList.length, 'items');
      return localList;
    }
  },

  /**
   * Ajoute un item à la collection d'un utilisateur
   * @param {string} userEmail - Email de l'utilisateur
   * @param {Object} itemData - Données de l'item à ajouter
   * @returns {Promise<string>} ID du document créé
   */
  async addItem(userEmail, itemData) {
    try {
      console.log('[Firebase Collection] Ajout d\'un item pour:', userEmail, itemData);
      
      // Vérifier si l'item existe déjà
      const existingItem = await this.getItemByContentId(userEmail, itemData.id);
      
      if (existingItem) {
        // Mettre à jour l'item existant
        console.log('[Firebase Collection] Item existant trouvé, mise à jour...');
        return await this.updateItem(userEmail, itemData.id, {
          status: itemData.status,
          stoppedAt: itemData.stoppedAt,
          dateUpdated: new Date().toISOString()
        });
      }
      
      // Créer un nouveau document
      const listRef = collection(db, COLLECTIONS.USER_LIST);
      const newItem = {
        user_email: userEmail,
        content_id: itemData.id.toString(),
        title: itemData.title || itemData.titre,
        type: itemData.type || itemData.content_type,
        status: itemData.status || 'plan-to-watch',
        image_url: itemData.imageUrl || itemData.image || itemData.images?.jpg?.large_image_url || itemData.images?.jpg?.image_url || '',
        synopsis: itemData.synopsis || '',
        episodes: itemData.episodes || null,
        volumes: itemData.volumes || null,
        year: itemData.year || null,
        genres: itemData.genres || [],
        score: itemData.score || 0,
        stopped_at: itemData.stoppedAt || null,
        added_date: serverTimestamp(),
        date_updated: serverTimestamp()
      };
      
      const docRef = await addDoc(listRef, newItem);
      console.log('[Firebase Collection] ✅ Item ajouté avec ID:', docRef.id);
      
      // Synchroniser avec localStorage pour compatibilité
      const localList = JSON.parse(localStorage.getItem(`user_list_${userEmail}`) || '[]');
      const localItem = {
        ...itemData,
        status: itemData.status || 'plan-to-watch',
        addedDate: new Date().toISOString(),
        firebaseId: docRef.id
      };
      localList.push(localItem);
      localStorage.setItem(`user_list_${userEmail}`, JSON.stringify(localList));
      
      return docRef.id;
    } catch (error) {
      console.error('[Firebase Collection] ❌ Erreur lors de l\'ajout:', error);
      // Fallback vers localStorage
      const localList = JSON.parse(localStorage.getItem(`user_list_${userEmail}`) || '[]');
      const existingIndex = localList.findIndex(item => item.id === itemData.id);
      
      if (existingIndex !== -1) {
        localList[existingIndex].status = itemData.status || 'plan-to-watch';
      } else {
        localList.push({
          ...itemData,
          status: itemData.status || 'plan-to-watch',
          addedDate: new Date().toISOString()
        });
      }
      localStorage.setItem(`user_list_${userEmail}`, JSON.stringify(localList));
      return null;
    }
  },

  /**
   * Met à jour un item de la collection
   * @param {string} userEmail - Email de l'utilisateur
   * @param {string} contentId - ID du contenu
   * @param {Object} updateData - Données à mettre à jour
   * @returns {Promise<boolean>} Succès ou échec
   */
  async updateItem(userEmail, contentId, updateData) {
    try {
      console.log('[Firebase Collection] Mise à jour d\'un item:', contentId, updateData);
      
      const item = await this.getItemByContentId(userEmail, contentId);
      if (!item || !item.firebaseId) {
        console.log('[Firebase Collection] Item non trouvé dans Firebase, fallback localStorage');
        // Fallback vers localStorage
        const localList = JSON.parse(localStorage.getItem(`user_list_${userEmail}`) || '[]');
        const itemIndex = localList.findIndex(item => item.id === contentId);
        if (itemIndex !== -1) {
          Object.assign(localList[itemIndex], updateData);
          localStorage.setItem(`user_list_${userEmail}`, JSON.stringify(localList));
        }
        return true;
      }
      
      const itemRef = doc(db, COLLECTIONS.USER_LIST, item.firebaseId);
      const updateFields = {
        date_updated: serverTimestamp()
      };
      
      if (updateData.status !== undefined) updateFields.status = updateData.status;
      if (updateData.stoppedAt !== undefined) {
        updateFields.stopped_at = updateData.stoppedAt;
      } else if (updateData.stoppedAt === null) {
        updateFields.stopped_at = null;
      }
      
      await updateDoc(itemRef, updateFields);
      console.log('[Firebase Collection] ✅ Item mis à jour');
      
      // Synchroniser avec localStorage
      const localList = JSON.parse(localStorage.getItem(`user_list_${userEmail}`) || '[]');
      const itemIndex = localList.findIndex(item => item.id === contentId);
      if (itemIndex !== -1) {
        Object.assign(localList[itemIndex], updateData);
        localStorage.setItem(`user_list_${userEmail}`, JSON.stringify(localList));
      }
      
      return true;
    } catch (error) {
      console.error('[Firebase Collection] ❌ Erreur lors de la mise à jour:', error);
      // Fallback vers localStorage
      const localList = JSON.parse(localStorage.getItem(`user_list_${userEmail}`) || '[]');
      const itemIndex = localList.findIndex(item => item.id === contentId);
      if (itemIndex !== -1) {
        Object.assign(localList[itemIndex], updateData);
        localStorage.setItem(`user_list_${userEmail}`, JSON.stringify(localList));
      }
      return false;
    }
  },

  /**
   * Supprime un item de la collection
   * @param {string} userEmail - Email de l'utilisateur
   * @param {string} contentId - ID du contenu
   * @returns {Promise<boolean>} Succès ou échec
   */
  async removeItem(userEmail, contentId) {
    try {
      console.log('[Firebase Collection] Suppression d\'un item:', contentId);
      
      const item = await this.getItemByContentId(userEmail, contentId);
      if (!item || !item.firebaseId) {
        console.log('[Firebase Collection] Item non trouvé dans Firebase, fallback localStorage');
        // Fallback vers localStorage
        const localList = JSON.parse(localStorage.getItem(`user_list_${userEmail}`) || '[]');
        const filteredList = localList.filter(item => item.id !== contentId);
        localStorage.setItem(`user_list_${userEmail}`, JSON.stringify(filteredList));
        return true;
      }
      
      const itemRef = doc(db, COLLECTIONS.USER_LIST, item.firebaseId);
      await deleteDoc(itemRef);
      console.log('[Firebase Collection] ✅ Item supprimé');
      
      // Synchroniser avec localStorage
      const localList = JSON.parse(localStorage.getItem(`user_list_${userEmail}`) || '[]');
      const filteredList = localList.filter(item => item.id !== contentId);
      localStorage.setItem(`user_list_${userEmail}`, JSON.stringify(filteredList));
      
      return true;
    } catch (error) {
      console.error('[Firebase Collection] ❌ Erreur lors de la suppression:', error);
      // Fallback vers localStorage
      const localList = JSON.parse(localStorage.getItem(`user_list_${userEmail}`) || '[]');
      const filteredList = localList.filter(item => item.id !== contentId);
      localStorage.setItem(`user_list_${userEmail}`, JSON.stringify(filteredList));
      return false;
    }
  },

  /**
   * Récupère un item spécifique par son content_id
   * @param {string} userEmail - Email de l'utilisateur
   * @param {string} contentId - ID du contenu
   * @returns {Promise<Object|null>} L'item ou null
   */
  async getItemByContentId(userEmail, contentId) {
    try {
      const listRef = collection(db, COLLECTIONS.USER_LIST);
      const q = query(
        listRef,
        where('user_email', '==', userEmail),
        where('content_id', '==', contentId.toString())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: data.content_id || data.id,
          title: data.title || data.titre,
          type: data.type || data.content_type,
          status: data.status,
          imageUrl: data.image_url || data.image || data.imageUrl,
          synopsis: data.synopsis || '',
          episodes: data.episodes,
          volumes: data.volumes,
          year: data.year,
          genres: data.genres || [],
          score: data.score || 0,
          stoppedAt: data.stopped_at || data.stoppedAt,
          addedDate: data.added_date || data.addedDate,
          dateUpdated: data.date_updated || data.dateUpdated,
          firebaseId: doc.id
        };
      }
      
      return null;
    } catch (error) {
      console.error('[Firebase Collection] ❌ Erreur lors de la récupération d\'un item:', error);
      // Fallback vers localStorage
      const localList = JSON.parse(localStorage.getItem(`user_list_${userEmail}`) || '[]');
      return localList.find(item => item.id === contentId) || null;
    }
  }
};

// ============================================
// SERVICE SUPPORT TICKETS (Aide)
// ============================================
const ADMIN_EMAIL = 'mangawatch.off@gmail.com';

export const supportTicketService = {
  /**
   * Envoyer un ticket d'aide (création dans Firestore)
   * @param {Object} data - { subject, message, userEmail?, userName?, page? }
   * @returns {Promise<{ id: string }>}
   */
  async createTicket(data) {
    const ticketsRef = collection(db, COLLECTIONS.SUPPORT_TICKETS);
    const docRef = await addDoc(ticketsRef, {
      subject: data.subject || '',
      message: data.message || '',
      user_email: data.userEmail || null,
      user_name: data.userName || null,
      page: data.page || (typeof window !== 'undefined' && window.location ? window.location.href : ''),
      created_at: serverTimestamp(),
      status: 'new',
      messages: [] // thread: { from: 'user'|'admin', body, created_at, created_by? }
    });
    return { id: docRef.id };
  },

  /**
   * Récupérer tous les tickets (réservé admin)
   */
  async getAllTicketsForAdmin() {
    const ticketsRef = collection(db, COLLECTIONS.SUPPORT_TICKETS);
    const q = query(ticketsRef, orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => normalizeTicketDoc(d));
  },

  /**
   * Récupérer les tickets d'un utilisateur (par son email), triés du plus récent au plus ancien
   */
  async getTicketsForUser(userEmail) {
    if (!userEmail) return [];
    const ticketsRef = collection(db, COLLECTIONS.SUPPORT_TICKETS);
    const q = query(ticketsRef, where('user_email', '==', userEmail));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => normalizeTicketDoc(d));
    list.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return list;
  },

  /**
   * Récupérer un ticket par ID (admin ou propriétaire)
   */
  async getTicketById(ticketId) {
    const ticketRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);
    const d = await getDoc(ticketRef);
    if (!d.exists()) return null;
    return normalizeTicketDoc(d);
  },

  /**
   * Ajouter une réponse au thread (user ou admin). Ne fait rien si ticket fermé.
   * @param {string} ticketId
   * @param {string} from - 'user' | 'admin'
   * @param {string} body
   * @param {string} [createdBy] - email (optionnel)
   */
  async addReplyToTicket(ticketId, from, body, createdBy) {
    const ticketRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);
    const snap = await getDoc(ticketRef);
    if (!snap.exists()) throw new Error('Ticket introuvable');
    const data = snap.data();
    if ((data.status || 'new') === 'closed') throw new Error('Ce ticket est fermé');
    const messages = Array.isArray(data.messages) ? [...data.messages] : [];
    messages.push({
      from,
      body: (body || '').trim(),
      created_at: new Date().toISOString(),
      created_by: createdBy || null
    });
    await updateDoc(ticketRef, {
      messages,
      status: messages.length > 0 ? 'open' : (data.status || 'new')
    });
  },

  /**
   * Fermer un ticket (user ou admin)
   * @param {string} ticketId
   * @param {string} closedBy - 'user' | 'admin'
   */
  async closeTicket(ticketId, closedBy) {
    const ticketRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);
    await updateDoc(ticketRef, {
      status: 'closed',
      closed_at: serverTimestamp(),
      closed_by: closedBy
    });
  },

  /**
   * Réponse admin : ajoute au thread + envoie dans la messagerie du site à l'utilisateur
   */
  async adminReplyToTicket(ticketId, body) {
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) throw new Error('Ticket introuvable');
    if (ticket.status === 'closed') throw new Error('Ce ticket est fermé');
    const adminEmail = (typeof window !== 'undefined' && window.localStorage) ? (JSON.parse(window.localStorage.getItem('user') || '{}').email) : null;
    await this.addReplyToTicket(ticketId, 'admin', body, adminEmail);
    return ticket;
  },

  /**
   * Mettre à jour un ticket (legacy / champs libres) – admin uniquement
   */
  async updateTicketForAdmin(ticketId, data) {
    const ticketRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);
    await updateDoc(ticketRef, data);
  },

  /**
   * Supprimer un ticket – réservé admin
   */
  async deleteTicketForAdmin(ticketId) {
    const ticketRef = doc(db, COLLECTIONS.SUPPORT_TICKETS, ticketId);
    await deleteDoc(ticketRef);
  }
};

function normalizeTicketDoc(d) {
  const data = d.data();
  const out = {
    id: d.id,
    ...data,
    created_at: data.created_at && data.created_at.toDate ? data.created_at.toDate().toISOString() : (data.created_at || null),
    closed_at: data.closed_at && data.closed_at.toDate ? data.closed_at.toDate().toISOString() : (data.closed_at || null)
  };
  if (Array.isArray(data.messages) && data.messages.length > 0) {
    out.messages = data.messages.map(m => ({ ...m, created_at: m.created_at || null }));
  } else if (data.admin_reply && (data.admin_reply || '').trim()) {
    out.messages = [{ from: 'admin', body: data.admin_reply, created_at: data.replied_at && data.replied_at.toDate ? data.replied_at.toDate().toISOString() : null, created_by: null }];
  } else {
    out.messages = [];
  }
  if (!out.status) out.status = out.messages.length > 0 ? 'open' : 'new';
  return out;
}

// Exposer globalement pour compatibilité
if (typeof window !== 'undefined') {
  window.forumService = forumService;
  window.authService = authService;
  window.bannerService = bannerService;
  window.avatarService = avatarService;
  window.verificationService = verificationService;
  window.collectionService = collectionService;
  window.supportTicketService = supportTicketService;
  window.FIREBASE_COLLECTIONS = COLLECTIONS;
  window.MANGAWATCH_ADMIN_EMAIL = ADMIN_EMAIL;
}

