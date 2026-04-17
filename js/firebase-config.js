// Configuration Firebase
// ⚠️ REMPLACEZ LES VALEURS CI-DESSOUS PAR VOS VRAIES CLÉS FIREBASE

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// 🔥 Configuration Firebase pour mangawatch-98ed0
// Clé web : injectée en Base64 au build (évite la clé en clair dans les fichiers — Netlify analyse aussi la sortie du build).
const firebaseConfig = {
  apiKey: atob('__MANGAWATCH_FB_KEY_B64__'),
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
// Utiliser le bucket par défaut de Firebase (créé automatiquement)
// Le bucket par défaut est : mangawatch-98ed0.firebasestorage.app
export const storage = getStorage(app);

// Exposer globalement pour compatibilité avec le code existant
if (typeof window !== 'undefined') {
  window.firebaseDb = db;
  window.firebaseAuth = auth;
}

console.log('[Firebase] Configuration initialisée');

