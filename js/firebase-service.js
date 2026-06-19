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
  increment,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { storage } from './firebase-config.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

/** Appliquer avec : gsutil cors set cors.json gs://mangawatch-98ed0.firebasestorage.app (ou gs://mangawatch-98ed0.appspot.com si c’est le bucket affiché dans la console) */
const STORAGE_CORS_GSUTIL_HINT =
  'Appliquez CORS sur le bucket : téléchargez cors.json du dépôt, puis gsutil cors set cors.json gs://mangawatch-98ed0.firebasestorage.app (Cloud Shell : console.cloud.google.com → activer Cloud Shell).';

function logFirebaseStorageError(label, err) {
  console.error(label, {
    code: err?.code,
    message: err?.message,
    serverResponse: err?.serverResponse,
    customData: err?.customData
  });
  if (err?.serverResponse) {
    console.error(label + ' serverResponse brut:', err.serverResponse);
  }
}

/** Si l’erreur est storage/unknown, log + throw un message avec piste CORS ; sinon ne fait rien. */
function throwIfStorageUnknown(label, storageError) {
  if (storageError?.code !== 'storage/unknown') {
    return;
  }
  logFirebaseStorageError(label, storageError);
  const sr = storageError.serverResponse
    ? String(storageError.serverResponse).slice(0, 600)
    : '';
  const msg = sr
    ? `Firebase Storage: ${sr} — ${STORAGE_CORS_GSUTIL_HINT}`
    : `${storageError.message || 'Erreur inconnue'} — ${STORAGE_CORS_GSUTIL_HINT}`;
  const wrapped = new Error(msg);
  wrapped.code = 'storage/unknown';
  wrapped.originalError = storageError;
  throw wrapped;
}

function normalizeProfileEmail(userEmail) {
  return String(userEmail || '').trim().toLowerCase();
}

/** Variantes d’id / email (casse) pour retrouver les anciens profils Firestore. */
function userProfileEmailVariants(userEmail) {
  const raw = String(userEmail || '').trim();
  const norm = normalizeProfileEmail(raw);
  const out = [];
  if (norm) out.push(norm);
  if (raw && raw !== norm) out.push(raw);
  return out;
}

/**
 * Trouve le document user_profiles (ids en casse mixte + champ email).
 * @returns {Promise<{ snap: import('firebase/firestore').DocumentSnapshot|null, canonicalId: string|null }>}
 */
async function getUserProfileDocSnapshot(userEmail) {
  const variants = userProfileEmailVariants(userEmail);
  if (!variants.length) return { snap: null, canonicalId: null };

  for (let i = 0; i < variants.length; i++) {
    const id = variants[i];
    const ref = doc(db, COLLECTIONS.USER_PROFILES, id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { snap: snap, canonicalId: snap.id };
    }
  }

  for (let j = 0; j < variants.length; j++) {
    const em = variants[j];
    try {
      const q = query(
        collection(db, COLLECTIONS.USER_PROFILES),
        where('email', '==', em),
        limit(1)
      );
      const res = await getDocs(q);
      if (!res.empty) {
        const d = res.docs[0];
        return { snap: d, canonicalId: d.id };
      }
    } catch (e) { /* ignore */ }
  }

  const target = variants[0];
  try {
    const all = await getDocs(collection(db, COLLECTIONS.USER_PROFILES));
    for (let k = 0; k < all.docs.length; k++) {
      const d = all.docs[k];
      const data = d.data() || {};
      if (normalizeProfileEmail(d.id) === target || normalizeProfileEmail(data.email) === target) {
        return { snap: d, canonicalId: d.id };
      }
    }
  } catch (e) {
    console.warn('[Firebase Profile] Recherche profil (fallback):', e);
  }

  return { snap: null, canonicalId: variants[0] };
}

/** Référence Firestore du profil (existant ou id normalisé pour création). */
async function resolveUserProfileDocRef(userEmail) {
  const resolved = await getUserProfileDocSnapshot(userEmail);
  const id = (resolved.snap && resolved.snap.exists())
    ? resolved.snap.id
    : (resolved.canonicalId || normalizeProfileEmail(userEmail));
  return doc(db, COLLECTIONS.USER_PROFILES, id);
}

export { normalizeProfileEmail, userProfileEmailVariants };

function authEmailMatches(user, email) {
  return !!(user && user.email && String(user.email).toLowerCase() === email);
}

function resolveStorageFileExtension(file) {
  const name = String(file && file.name || '');
  const fromName = name.includes('.') ? name.split('.').pop() : '';
  if (fromName && fromName.length <= 5 && !/heic|heif/i.test(fromName)) {
    return fromName.toLowerCase();
  }
  const mime = String(file && file.type || '').toLowerCase();
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  return 'jpg';
}

/** Session Firebase Auth requise pour Storage — restaure ou reconnecte si besoin (mobile / onglet long). */
export async function ensureAuthenticatedForStorage(userEmail, options) {
  options = options || {};
  const maxWaitMs = options.maxWaitMs || 10000;
  const email = normalizeProfileEmail(userEmail);
  if (!email) {
    const err = new Error('SESSION_FIREBASE_REQUISE');
    err.code = 'auth/not-authenticated';
    throw err;
  }

  if (auth.currentUser && authEmailMatches(auth.currentUser, email)) {
    try { await auth.currentUser.getIdToken(true); } catch (_) { /* ignore */ }
    return auth.currentUser;
  }

  const restored = await new Promise(function(resolve) {
    let settled = false;
    function finish(user) {
      if (settled) return;
      settled = true;
      try { unsub(); } catch (_) { /* ignore */ }
      clearTimeout(timer);
      resolve(user || null);
    }
    const timer = setTimeout(function() { finish(null); }, maxWaitMs);
    const unsub = onAuthStateChanged(auth, function(u) {
      if (authEmailMatches(u, email)) finish(u);
    });
    if (authEmailMatches(auth.currentUser, email)) finish(auth.currentUser);
  });

  if (restored) {
    try { await restored.getIdToken(true); } catch (_) { /* ignore */ }
    return restored;
  }

  if (options.allowCredentialRelogin !== false) {
    try {
      const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
      const acc = accounts.find(function(a) {
        return normalizeProfileEmail(a && a.email) === email;
      });
      if (acc && acc.password) {
        const result = await signInWithEmailAndPassword(auth, email, acc.password);
        return result.user;
      }
    } catch (reloginErr) {
      console.warn('[Firebase Auth] Reconnexion silencieuse impossible:', reloginErr && reloginErr.code ? reloginErr.code : reloginErr);
    }
  }

  const err = new Error('SESSION_FIREBASE_REQUISE');
  err.code = 'auth/not-authenticated';
  throw err;
}

/** Attend la restauration Firebase Auth (connexion Google / persistance locale). */
async function waitForAuthUser(userEmail, maxWaitMs) {
  const email = normalizeProfileEmail(userEmail);
  if (!email) return null;
  if (authEmailMatches(auth.currentUser, email)) {
    return auth.currentUser;
  }
  return new Promise(function(resolve) {
    let settled = false;
    function finish(user) {
      if (settled) return;
      settled = true;
      try { unsub(); } catch (_) { /* ignore */ }
      clearTimeout(timer);
      resolve(user || null);
    }
    const timer = setTimeout(function() { finish(null); }, maxWaitMs || 8000);
    const unsub = onAuthStateChanged(auth, function(u) {
      if (authEmailMatches(u, email)) finish(u);
    });
    if (authEmailMatches(auth.currentUser, email)) finish(auth.currentUser);
  });
}

function normalizeAvatarUrlForCompare(url) {
  if (!url) return '';
  try {
    const parsed = new URL(String(url));
    return parsed.origin + parsed.pathname;
  } catch (_) {
    return String(url).split('?')[0].split('#')[0];
  }
}

function readLocalAvatarUrl(email) {
  try {
    const dedicated = localStorage.getItem('avatar_' + email);
    if (dedicated && String(dedicated).trim()) return String(dedicated).trim();
  } catch (_) { /* ignore */ }
  try {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      const u = JSON.parse(userRaw);
      if (u && normalizeProfileEmail(u.email) === email) {
        const fromUser = u.customAvatar || u.avatar;
        if (fromUser) return String(fromUser).trim();
      }
    }
  } catch (_) { /* ignore */ }
  return '';
}

/** Charge avatar + bannière depuis Firestore et met à jour le cache local (sync PC ↔ téléphone). */
export async function syncRemoteProfileMedia(userEmail, options) {
  const opts = (options && typeof options === 'object') ? options : {};
  const forceServer = opts.forceServer !== false;
  const email = normalizeProfileEmail(userEmail);
  if (!email) return { avatar: null, banner: null, avatarChanged: false };

  const localAvatarBefore = readLocalAvatarUrl(email);
  let avatar = null;
  let banner = null;

  try {
    if (avatarService && typeof avatarService.getAvatar === 'function') {
      avatar = await avatarService.getAvatar(email, { forceServer });
    }
  } catch (e) {
    console.warn('[Profile Media] Avatar distant:', e && e.message ? e.message : e);
  }

  try {
    if (bannerService && typeof bannerService.getBanner === 'function') {
      banner = await bannerService.getBanner(email, forceServer ? { forceServer: true } : undefined);
    }
  } catch (e) {
    console.warn('[Profile Media] Bannière distante:', e && e.message ? e.message : e);
  }

  const avatarChanged = !!(avatar && /^https?:\/\//i.test(avatar) &&
    normalizeAvatarUrlForCompare(avatar) !== normalizeAvatarUrlForCompare(localAvatarBefore));

  if (avatar && /^https?:\/\//i.test(avatar)) {
    try { localStorage.setItem('avatar_' + email, avatar); } catch (_) { /* ignore */ }
    try {
      const userRaw = localStorage.getItem('user');
      if (userRaw) {
        const u = JSON.parse(userRaw);
        if (u && normalizeProfileEmail(u.email) === email) {
          u.avatar = avatar;
          u.customAvatar = avatar;
          localStorage.setItem('user', JSON.stringify(u));
        }
      }
    } catch (_) { /* ignore */ }
    try {
      const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
      const idx = accounts.findIndex(function(a) { return normalizeProfileEmail(a && a.email) === email; });
      if (idx >= 0) {
        accounts[idx].avatar = avatar;
        accounts[idx].customAvatar = avatar;
        localStorage.setItem('accounts', JSON.stringify(accounts));
      }
    } catch (_) { /* ignore */ }
    try {
      const profileKey = 'profile_' + email;
      const prof = JSON.parse(localStorage.getItem(profileKey) || '{}');
      prof.avatar = avatar;
      prof.customAvatar = avatar;
      prof.email = email;
      localStorage.setItem(profileKey, JSON.stringify(prof));
    } catch (_) { /* ignore */ }
  }

  if (banner && banner.url) {
    try {
      localStorage.setItem('profile_banner_' + email, JSON.stringify({
        type: banner.type || 'image',
        url: banner.url,
        volume: banner.volume !== undefined ? banner.volume : 35
      }));
    } catch (_) { /* ignore */ }
  }

  if (avatarChanged && typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('profileAvatarUpdated', { detail: { url: avatar } }));
    } catch (_) { /* ignore */ }
  }

  return { avatar: avatar || null, banner: banner || null, avatarChanged };
}

// Collections Firestore
export const COLLECTIONS = {
  FORUM_TOPICS: 'forum_topics',
  FORUM_REPLIES: 'forum_replies',
  MESSAGES: 'messages',
  USER_NOTES: 'user_content_notes',
  USER_TOP10: 'user_top10',
  USER_PROFILES: 'user_profiles',
  USER_LIST: 'user_list',
  SUPPORT_TICKETS: 'support_tickets',
  BOUTIQUE_STATS: 'boutique_stats',
  PROFILE_RATING_VOTES: 'profile_rating_votes',
  PROFILE_RATING_STATS: 'profile_rating_stats',
  USER_REPORTS: 'user_reports'
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
  signInWithCredential,
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
   * Connexion Google via le jeton JWT renvoyé par Google Identity Services (One Tap / bouton FedCM).
   * Nécessaire pour que Storage/Firestore voient un utilisateur authentifié (même session que la popup Firebase).
   */
  async signInWithGoogleIdToken(idToken) {
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Jeton Google invalide');
    }
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    return {
      user: result.user,
      credential: GoogleAuthProvider.credentialFromResult(result)
    };
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

const bannerSaveQueues = new Map();
const avatarSaveQueues = new Map();

function runQueuedProfileMediaSave(queues, userEmail, task) {
  const key = normalizeProfileEmail(userEmail) || '_';
  const prev = queues.get(key) || Promise.resolve();
  const next = prev.catch(function () {}).then(task);
  queues.set(key, next);
  return next;
}

function runQueuedBannerSave(userEmail, task) {
  return runQueuedProfileMediaSave(bannerSaveQueues, userEmail, task);
}

function runQueuedAvatarSave(userEmail, task) {
  return runQueuedProfileMediaSave(avatarSaveQueues, userEmail, task);
}

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
    return runQueuedBannerSave(userEmail, () => this._saveBannerImpl(userEmail, type, source, volume));
  },

  async _saveBannerImpl(userEmail, type, source, volume = 0) {
    try {
      const currentUser = await ensureAuthenticatedForStorage(userEmail);
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
      const profileRef = await resolveUserProfileDocRef(userEmail);
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
        const fileExtension = resolveStorageFileExtension(source);
        const fileName = `banners/${normalizeProfileEmail(userEmail)}_${Date.now()}.${fileExtension}`;
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
          throwIfStorageUnknown('[Firebase Banner]', storageError);
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
            id: normalizeProfileEmail(userEmail),
            email: normalizeProfileEmail(userEmail),
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
  async getBanner(userEmail, options) {
    const opts = (options && typeof options === 'object') ? options : {};
    const forceServer = opts.forceServer === true;
    try {
      console.log('[Firebase Banner] getBanner appelé pour:', userEmail);
      const resolved = await getUserProfileDocSnapshot(userEmail);
      const profileRef = resolved.snap && resolved.snap.exists()
        ? doc(db, COLLECTIONS.USER_PROFILES, resolved.snap.id)
        : doc(db, COLLECTIONS.USER_PROFILES, normalizeProfileEmail(userEmail));
      let profileDoc;
      if (forceServer) {
        try {
          profileDoc = await getDocFromServer(profileRef);
        } catch (serverErr) {
          console.warn('[Firebase Banner] Lecture serveur échouée, fallback cache:', serverErr?.message);
          profileDoc = await getDoc(profileRef);
        }
      } else {
        profileDoc = await getDoc(profileRef);
      }
      if (!profileDoc.exists() && resolved.snap && resolved.snap.exists()) {
        profileDoc = resolved.snap;
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
      const profileRef = await resolveUserProfileDocRef(userEmail);
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
    return runQueuedAvatarSave(userEmail, () => this._saveAvatarImpl(userEmail, file));
  },

  async _saveAvatarImpl(userEmail, file) {
    try {
      const currentUser = await ensureAuthenticatedForStorage(userEmail);
      console.log('[Firebase Avatar] Utilisateur authentifié:', currentUser.email);
      
      // Récupérer les informations du profil existant pour supprimer l'ancien avatar plus tard
      const profileRef = await resolveUserProfileDocRef(userEmail);
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
      const fileExtension = resolveStorageFileExtension(file);
      const fileName = `avatars/${normalizeProfileEmail(userEmail)}_${Date.now()}.${fileExtension}`;
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
              id: normalizeProfileEmail(userEmail),
              email: normalizeProfileEmail(userEmail),
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
        throwIfStorageUnknown('[Firebase Avatar]', storageError);
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
  async getAvatar(userEmail, options) {
    const opts = (options && typeof options === 'object') ? options : {};
    const forceServer = opts.forceServer === true;
    try {
      console.log('[Firebase Avatar] getAvatar appelé pour:', userEmail, forceServer ? '(serveur)' : '');
      const resolved = await getUserProfileDocSnapshot(userEmail);
      const profileRef = resolved.snap && resolved.snap.exists()
        ? doc(db, COLLECTIONS.USER_PROFILES, resolved.snap.id)
        : doc(db, COLLECTIONS.USER_PROFILES, normalizeProfileEmail(userEmail));
      let profileDoc;
      if (forceServer) {
        try {
          profileDoc = await getDocFromServer(profileRef);
        } catch (serverErr) {
          console.warn('[Firebase Avatar] Lecture serveur échouée, fallback cache:', serverErr?.message);
          profileDoc = await getDoc(profileRef);
        }
      } else {
        profileDoc = await getDoc(profileRef);
      }
      if (!profileDoc.exists() && resolved.snap && resolved.snap.exists()) {
        profileDoc = resolved.snap;
      }
      
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
      const profileRef = await resolveUserProfileDocRef(userEmail);
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
      
      const profileRef = await resolveUserProfileDocRef(userEmail);
      const profileDoc = await getDoc(profileRef);
      const normEmail = normalizeProfileEmail(userEmail);
      
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
          id: normEmail,
          email: normEmail,
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
      const profileRef = await resolveUserProfileDocRef(userEmail);
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
      const resolved = await getUserProfileDocSnapshot(userEmail);
      const profileDoc = resolved.snap && resolved.snap.exists()
        ? resolved.snap
        : null;
      
      if (profileDoc && profileDoc.exists()) {
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
      
      return isEmailInVerifiedList(userEmail);
    } catch (error) {
      console.error('[Firebase Verification] ❌ Erreur lors de la vérification:', error);
      return isEmailInVerifiedList(userEmail);
    }
  }
};

function isEmailInVerifiedList(userEmail) {
  const norm = normalizeProfileEmail(userEmail);
  if (!norm) return false;
  try {
    const verified = JSON.parse(localStorage.getItem('verified_users') || '[]');
    return verified.some(function (e) {
      return normalizeProfileEmail(e) === norm;
    });
  } catch (e) {
    return false;
  }
}

function syncVerifiedToLocalList(userEmail, isVerified) {
  const norm = normalizeProfileEmail(userEmail);
  if (!norm) return;
  try {
    let verified = JSON.parse(localStorage.getItem('verified_users') || '[]');
    const idx = verified.findIndex(function (e) {
      return normalizeProfileEmail(e) === norm;
    });
    if (isVerified && idx === -1) {
      verified.push(userEmail);
      localStorage.setItem('verified_users', JSON.stringify(verified));
    } else if (!isVerified && idx > -1) {
      verified.splice(idx, 1);
      localStorage.setItem('verified_users', JSON.stringify(verified));
    }
  } catch (e) { /* ignore */ }
}

/**
 * Affiche ou masque le badge certifié (#verified-badge par défaut).
 * Lit Firestore + met à jour le cache local verified_users.
 */
export async function updateVerifiedBadgeForEmail(userEmail, options) {
  const opts = options || {};
  const badgeId = opts.badgeId || 'verified-badge';
  const badge = document.getElementById(badgeId);
  if (!badge || !userEmail) return false;

  let isVerified = opts.initialVerified === true || isEmailInVerifiedList(userEmail);

  const apply = function (value) {
    badge.style.display = value ? 'inline-flex' : 'none';
    badge.hidden = !value;
    badge.setAttribute('aria-hidden', value ? 'false' : 'true');
  };

  apply(isVerified);

  try {
    const fromFirestore = await verificationService.isUserVerified(userEmail);
    isVerified = fromFirestore;
    apply(isVerified);
    syncVerifiedToLocalList(userEmail, isVerified);
  } catch (err) {
    console.warn('[VerifiedBadge] Firestore:', err);
  }

  return isVerified;
}

// ============================================
// ADMIN — liste des profils Firestore (même source que la prod)
// ============================================

export const profileAdminService = {
  /**
   * Tous les documents user_profiles (email = id du document).
   * Lecture publique autorisée par les règles Firestore du projet.
   */
  async listAllUserProfiles() {
    const colRef = collection(db, COLLECTIONS.USER_PROFILES);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => {
      const data = d.data();
      const email = d.id;
      const timestampToMs = (value) => {
        if (!value) return null;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const ms = Date.parse(value);
          return Number.isNaN(ms) ? null : ms;
        }
        if (value && typeof value.toMillis === 'function') return value.toMillis();
        if (value && typeof value.seconds === 'number') return value.seconds * 1000;
        return null;
      };
      const name =
        (typeof data.username === 'string' && data.username.trim()) ||
        (typeof data.pseudo === 'string' && data.pseudo.trim()) ||
        (typeof data.displayName === 'string' && data.displayName.trim()) ||
        (typeof data.name === 'string' && data.name.trim()) ||
        (email.includes('@') ? email.split('@')[0] : email);
      return {
        email,
        name,
        username:
          (typeof data.username === 'string' && data.username.trim()) ||
          (typeof data.pseudo === 'string' && data.pseudo.trim()) ||
          null,
        avatar: data.avatar || data.customAvatar || data.photoURL || data.picture || null,
        verified: data.verified === true,
        country: data.country || data.continent || null,
        created_at: timestampToMs(data.created_at || data.createdAt || data.createdAtMs),
        updated_at: timestampToMs(data.updated_at || data.updatedAt || data.updatedAtMs)
      };
    });
  }
};

// ============================================
// SERVICE NOTATION PROFIL UTILISATEUR
// ============================================

function profileRatingVoteId(voterEmail, profileEmail) {
  const voter = normalizeProfileEmail(voterEmail);
  const profile = normalizeProfileEmail(profileEmail);
  return voter + '__' + profile;
}

export const profileRatingService = {
  async getStats(profileEmail) {
    const profile = normalizeProfileEmail(profileEmail);
    if (!profile) return { average: 0, count: 0, sum: 0 };
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.PROFILE_RATING_STATS, profile));
      if (!snap.exists()) return { average: 0, count: 0, sum: 0 };
      const data = snap.data() || {};
      return {
        average: typeof data.average === 'number' ? data.average : 0,
        count: typeof data.count === 'number' ? data.count : 0,
        sum: typeof data.sum === 'number' ? data.sum : 0
      };
    } catch (e) {
      console.warn('[ProfileRating] getStats:', e);
      return { average: 0, count: 0, sum: 0 };
    }
  },

  async getStatsBulk(profileEmails) {
    const out = {};
    const emails = [...new Set((profileEmails || []).map(normalizeProfileEmail).filter(Boolean))];
    await Promise.all(emails.map(async (email) => {
      out[email] = await this.getStats(email);
    }));
    return out;
  },

  async getMyVote(profileEmail, voterEmail) {
    const voter = normalizeProfileEmail(voterEmail);
    const profile = normalizeProfileEmail(profileEmail);
    if (!voter || !profile) return null;
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.PROFILE_RATING_VOTES, profileRatingVoteId(voter, profile)));
      if (!snap.exists()) return null;
      const score = Number(snap.data().score);
      return Number.isFinite(score) ? score : null;
    } catch (e) {
      return null;
    }
  },

  async setRating(profileEmail, voterEmail, score) {
    const voter = normalizeProfileEmail(voterEmail);
    const profile = normalizeProfileEmail(profileEmail);
    if (!voter || !profile || voter === profile) {
      throw new Error('Notation invalide');
    }
    const normalizedScore = Math.max(1, Math.min(10, Math.round(Number(score))));
    const voteRef = doc(db, COLLECTIONS.PROFILE_RATING_VOTES, profileRatingVoteId(voter, profile));
    const statsRef = doc(db, COLLECTIONS.PROFILE_RATING_STATS, profile);
    const oldVoteSnap = await getDoc(voteRef);
    const oldScore = oldVoteSnap.exists() ? Number(oldVoteSnap.data().score) || 0 : 0;
    const isNew = !oldVoteSnap.exists();

    await setDoc(voteRef, {
      voter_email: voter,
      profile_email: profile,
      score: normalizedScore,
      updated_at: serverTimestamp()
    });

    const statsSnap = await getDoc(statsRef);
    let sum = normalizedScore;
    let count = 1;
    if (statsSnap.exists()) {
      const d = statsSnap.data() || {};
      const prevSum = Number(d.sum) || 0;
      const prevCount = Number(d.count) || 0;
      sum = prevSum - (isNew ? 0 : oldScore) + normalizedScore;
      count = isNew ? prevCount + 1 : prevCount;
    }
    const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
    await setDoc(statsRef, {
      profile_email: profile,
      sum,
      count,
      average,
      updated_at: serverTimestamp()
    }, { merge: true });

    return { average, count, sum, myScore: normalizedScore };
  },

  /**
   * Ajuste la note moyenne affichée sur le profil (action admin).
   * Recalcule sum pour rester cohérent avec count existant.
   */
  async adminSetAverage(profileEmail, newAverage) {
    const profile = normalizeProfileEmail(profileEmail);
    if (!profile) throw new Error('Email profil invalide');
    const score = Math.max(1, Math.min(10, Math.round(Number(newAverage) * 10) / 10));
    const statsRef = doc(db, COLLECTIONS.PROFILE_RATING_STATS, profile);
    const statsSnap = await getDoc(statsRef);
    let count = 1;
    if (statsSnap.exists()) {
      const d = statsSnap.data() || {};
      count = Math.max(1, Number(d.count) || 1);
    }
    const sum = Math.round(score * count * 10) / 10;
    const payload = {
      profile_email: profile,
      average: score,
      count,
      sum,
      admin_adjusted: true,
      updated_at: serverTimestamp()
    };
    await setDoc(statsRef, payload, { merge: true });
    return { average: score, count, sum };
  },

  /**
   * Ajoute plusieurs notes admin (votes synthétiques) pour faire remonter la moyenne.
   * @param {string} profileEmail
   * @param {number} quantity - nombre de notes à ajouter (1–1000)
   * @param {number} score - note de chaque vote (1–10)
   */
  async adminAddVotes(profileEmail, quantity, score) {
    const profile = normalizeProfileEmail(profileEmail);
    if (!profile) throw new Error('Email profil invalide');

    const qty = Math.max(1, Math.min(1000, Math.round(Number(quantity))));
    const normalizedScore = Math.max(1, Math.min(10, Math.round(Number(score))));

    const statsRef = doc(db, COLLECTIONS.PROFILE_RATING_STATS, profile);
    const statsSnap = await getDoc(statsRef);
    let prevSum = 0;
    let prevCount = 0;
    if (statsSnap.exists()) {
      const d = statsSnap.data() || {};
      prevSum = Number(d.sum) || 0;
      prevCount = Number(d.count) || 0;
    }

    const baseTs = Date.now();
    const voteWrites = [];
    for (let i = 0; i < qty; i++) {
      const voterId = `__admin_${baseTs}_${i}`;
      voteWrites.push({
        ref: doc(db, COLLECTIONS.PROFILE_RATING_VOTES, profileRatingVoteId(voterId, profile)),
        data: {
          voter_email: voterId,
          profile_email: profile,
          score: normalizedScore,
          admin_vote: true,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        }
      });
    }

    const CHUNK = 450;
    for (let start = 0; start < voteWrites.length; start += CHUNK) {
      const batch = writeBatch(db);
      voteWrites.slice(start, start + CHUNK).forEach(({ ref, data }) => batch.set(ref, data));
      await batch.commit();
    }

    const newCount = prevCount + qty;
    const newSum = prevSum + normalizedScore * qty;
    const average = newCount > 0 ? Math.round((newSum / newCount) * 10) / 10 : 0;

    await setDoc(statsRef, {
      profile_email: profile,
      sum: newSum,
      count: newCount,
      average,
      admin_adjusted: true,
      updated_at: serverTimestamp()
    }, { merge: true });

    return { average, count: newCount, sum: newSum, added: qty, score: normalizedScore };
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
      const resolved = await getUserProfileDocSnapshot(userEmail);
      const profileDoc = resolved.snap && resolved.snap.exists() ? resolved.snap : null;
      if (profileDoc && profileDoc.exists()) {
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
      const profileRef = await resolveUserProfileDocRef(userEmail);
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
      const resolved = await getUserProfileDocSnapshot(userEmail);
      if (resolved.snap && resolved.snap.exists()) {
        const data = resolved.snap.data();
        return {
          email: normalizeProfileEmail(resolved.snap.id || data.email || userEmail),
          username: data.username || null,
          name: data.name || data.displayName || null,
          country: data.country || data.continent || null,
          langue: data.langue || data.language || null,
          avatar: data.avatar || data.photoURL || data.picture || null,
          picture: data.picture || data.avatar || null,
          verified: data.verified === true
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
    return this.ensureProfileRegistered(userEmail, fields || {});
  },

  /**
   * Crée ou met à jour le profil public Firestore (visible par tous les visiteurs).
   * @param {string} userEmail
   * @param {{ username?: string, name?: string, country?: string, langue?: string, avatar?: string, picture?: string, provider?: string, uid?: string }} fields
   */
  async ensureProfileRegistered(userEmail, fields) {
    fields = fields || {};
    const norm = normalizeProfileEmail(userEmail);
    if (!norm) return false;

    const authed = await waitForAuthUser(userEmail, 10000);
    if (!authed) {
      console.warn('[Firebase ProfileAccount] ensureProfileRegistered: session Firebase Auth absente pour', norm);
      return false;
    }

    try {
      const profileRef = await resolveUserProfileDocRef(userEmail);
      const profileDoc = await getDoc(profileRef);
      const payload = {
        email: norm,
        updated_at: serverTimestamp()
      };
      if (fields.username) payload.username = fields.username;
      if (fields.name) payload.name = fields.name;
      if (fields.country) payload.country = fields.country;
      if (fields.langue) payload.langue = fields.langue;
      if (fields.avatar) payload.avatar = fields.avatar;
      if (fields.picture) payload.picture = fields.picture;
      if (fields.provider) payload.provider = fields.provider;
      if (fields.uid) payload.uid = fields.uid;

      if (profileDoc.exists()) {
        await updateDoc(profileRef, payload);
      } else {
        await setDoc(profileRef, {
          id: norm,
          ...payload,
          created_at: serverTimestamp()
        });
      }

      try {
        const username = fields.username || fields.name || norm.split('@')[0];
        const cache = {
          email: norm,
          username: username,
          name: fields.name || username,
          avatar: fields.avatar || fields.picture || null,
          picture: fields.picture || fields.avatar || null,
          country: fields.country || null,
          continent: fields.country || null,
          provider: fields.provider || null
        };
        localStorage.setItem('profile_' + norm, JSON.stringify(cache));
        if (cache.avatar) localStorage.setItem('avatar_' + norm, cache.avatar);

        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        const idx = accounts.findIndex(function(a) {
          return normalizeProfileEmail(a && a.email) === norm;
        });
        const accPatch = {
          email: userEmail,
          username: username,
          country: fields.country || 'fr',
          langue: fields.langue || 'fr',
          provider: fields.provider || 'google',
          avatar: cache.avatar,
          customAvatar: cache.avatar
        };
        if (idx >= 0) {
          accounts[idx] = Object.assign({}, accounts[idx], accPatch);
        } else {
          accounts.push(Object.assign({
            password: fields.provider === 'google' ? 'google_oauth' : '',
            createdAt: new Date().toISOString()
          }, accPatch));
        }
        localStorage.setItem('accounts', JSON.stringify(accounts));
      } catch (cacheErr) { /* ignore */ }

      console.log('[Firebase ProfileAccount] ✅ Profil public enregistré:', norm);
      return true;
    } catch (error) {
      console.error('[Firebase ProfileAccount] ensureProfileRegistered:', error);
      return false;
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
      const emails = userProfileEmailVariants(userEmail);
      const seenIds = new Set();
      const docList = [];

      for (let i = 0; i < emails.length; i++) {
        const q = query(listRef, where('user_email', '==', emails[i]));
        const querySnapshot = await getDocs(q);
        querySnapshot.docs.forEach(function(d) {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            docList.push(d);
          }
        });
      }
      
      const items = docList.map(doc => {
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
      const contentIdAsString = contentId != null ? String(contentId) : '';
      const contentIdAsNumber = Number(contentId);
      let resolvedDoc = null;
      
      // 1) Recherche principale : content_id stocke en string (format attendu).
      const stringQuery = query(
        listRef,
        where('user_email', '==', userEmail),
        where('content_id', '==', contentIdAsString)
      );
      const stringSnapshot = await getDocs(stringQuery);
      if (!stringSnapshot.empty) {
        resolvedDoc = stringSnapshot.docs[0];
      }
      
      // 2) Fallback legacy : certains docs historiques peuvent stocker content_id en number.
      if (!resolvedDoc && Number.isFinite(contentIdAsNumber)) {
        const numberQuery = query(
          listRef,
          where('user_email', '==', userEmail),
          where('content_id', '==', contentIdAsNumber)
        );
        const numberSnapshot = await getDocs(numberQuery);
        if (!numberSnapshot.empty) {
          resolvedDoc = numberSnapshot.docs[0];
        }
      }
      
      if (resolvedDoc) {
        const doc = resolvedDoc;
        const data = doc.data();
        return {
          id: String(data.content_id || data.id),
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
// SERVICE SIGNALEMENTS UTILISATEUR
// ============================================

function normalizeUserReportDoc(d) {
  const data = d.data();
  const created = data.created_at;
  let dateIso = data.date || null;
  if (created && typeof created.toDate === 'function') {
    dateIso = created.toDate().toISOString();
  } else if (created && typeof created === 'string') {
    dateIso = created;
  }
  return {
    id: d.id,
    reportedBy: data.reported_by || data.reportedBy || '',
    reportedUser: data.reported_user || data.reportedUser || '',
    reason: data.reason || 'other',
    comment: data.comment || '',
    date: dateIso || new Date().toISOString()
  };
}

export const userReportService = {
  /**
   * Enregistre un signalement (Firestore — visible par l'admin sur tous les appareils).
   */
  async submitReport(report) {
    const reporter = normalizeProfileEmail(report.reportedBy || report.reported_by);
    const reported = normalizeProfileEmail(report.reportedUser || report.reported_user);
    if (!reporter || !reported) {
      throw new Error('Emails de signalement invalides');
    }
    if (reporter === reported) {
      throw new Error('Impossible de se signaler soi-même');
    }

    await ensureAuthenticatedForStorage(reporter);

    const reportsRef = collection(db, COLLECTIONS.USER_REPORTS);
    await addDoc(reportsRef, {
      reported_by: reporter,
      reported_user: reported,
      reason: String(report.reason || 'other').slice(0, 64),
      comment: String(report.comment || '').slice(0, 500),
      created_at: serverTimestamp()
    });
  },

  /** Liste tous les signalements (admin connecté avec le compte site). */
  async getAllReportsForAdmin() {
    const reportsRef = collection(db, COLLECTIONS.USER_REPORTS);
    const q = query(reportsRef, orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(normalizeUserReportDoc);
  },

  /** Supprime tous les signalements concernant un utilisateur (action admin « ignorer »). */
  async deleteReportsForUser(reportedUserEmail) {
    const reported = normalizeProfileEmail(reportedUserEmail);
    if (!reported) return;
    const reportsRef = collection(db, COLLECTIONS.USER_REPORTS);
    const q = query(reportsRef, where('reported_user', '==', reported));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
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

// ============================================
// STATISTIQUES BOUTIQUE (codes promo / clics site)
// ============================================
export const boutiqueStatsService = {
  /**
   * Incrémente un compteur pour un magasin partenaire.
   * @param {string} storeId
   * @param {'promo_copies'|'site_clicks'} field
   */
  async increment(storeId, field) {
    if (!storeId || !field) return;
    const statRef = doc(db, COLLECTIONS.BOUTIQUE_STATS, storeId);
    await setDoc(statRef, {
      [field]: increment(1),
      updated_at: serverTimestamp()
    }, { merge: true });
  },

  /** Tous les compteurs (admin / affichage boutique) */
  async getAll() {
    const ref = collection(db, COLLECTIONS.BOUTIQUE_STATS);
    const snap = await getDocs(ref);
    const out = {};
    snap.docs.forEach(function (d) {
      const data = d.data();
      out[d.id] = {
        promo_copies: Number(data.promo_copies) || 0,
        site_clicks: Number(data.site_clicks) || 0
      };
    });
    return out;
  }
};

// Exposer globalement pour compatibilité
if (typeof window !== 'undefined') {
  window.forumService = forumService;
  window.authService = authService;
  window.bannerService = bannerService;
  window.avatarService = avatarService;
  window.ensureAuthenticatedForStorage = ensureAuthenticatedForStorage;
  window.syncRemoteProfileMedia = syncRemoteProfileMedia;
  window.verificationService = verificationService;
  window.updateVerifiedBadgeForEmail = updateVerifiedBadgeForEmail;
  window.isEmailInVerifiedList = isEmailInVerifiedList;
  window.profileAdminService = profileAdminService;
  window.collectionService = collectionService;
  window.supportTicketService = supportTicketService;
  window.boutiqueStatsService = boutiqueStatsService;
  window.profileRatingService = profileRatingService;
  window.userReportService = userReportService;
  window.FIREBASE_COLLECTIONS = COLLECTIONS;
  window.MANGAWATCH_ADMIN_EMAIL = ADMIN_EMAIL;
}

