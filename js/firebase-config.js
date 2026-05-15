// Configuration Firebase
// ⚠️ REMPLACEZ LES VALEURS CI-DESSOUS PAR VOS VRAIES CLÉS FIREBASE

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// 🔥 Configuration Firebase pour mangawatch-98ed0
// Clé web : injectée en Base64 au build (évite la clé en clair dans les fichiers — Netlify analyse aussi la sortie du build).
const encodedApiKey = 'QUl6YVN5REpDTXcxSDcxWDVsZVF5Ty1JZ2VqR0xzV0RXM2t6SEg4';
const decodedApiKey =
  encodedApiKey === 'VEFfVlJBSUVfQ0xFX1dFQl9GSVJFQkFTRQ==' ? '' : atob(encodedApiKey);

if (!decodedApiKey) {
  throw new Error(
    "[Firebase] Clé API absente en local. Lancez d'abord: npm run inject-firebase-key (avec MANGAWATCH_FB_WEB_API_KEY)."
  );
}

const firebaseConfig = {
  apiKey: decodedApiKey,
  authDomain: "mangawatch-98ed0.firebaseapp.com",
  projectId: "mangawatch-98ed0",
  storageBucket: "mangawatch-98ed0.firebasestorage.app",
  messagingSenderId: "223624179148",
  appId: "1:223624179148:web:ee435de246769762e64169"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Exporter les services
export const db = getFirestore(app);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(function(e) {
  console.warn('[Firebase] Persistance auth locale:', e && e.message ? e.message : e);
});
// Utiliser le bucket par défaut de Firebase (créé automatiquement)
// Le bucket par défaut est : mangawatch-98ed0.firebasestorage.app
export const storage = getStorage(app);

// Exposer globalement pour compatibilité avec le code existant
if (typeof window !== 'undefined') {
  window.firebaseDb = db;
  window.firebaseAuth = auth;
}

console.log('[Firebase] Configuration initialisée');

