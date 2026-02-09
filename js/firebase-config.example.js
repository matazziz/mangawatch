// Configuration Firebase - EXEMPLE
// Copiez ce fichier vers firebase-config.js et remplissez vos vraies valeurs

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// ⚠️ REMPLACEZ CES VALEURS PAR VOS VRAIES CONFIGURATIONS FIREBASE
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT_ID.appspot.com",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId: "VOTRE_APP_ID"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Exporter les services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Exposer globalement pour compatibilité avec le code existant
if (typeof window !== 'undefined') {
  window.firebaseDb = db;
  window.firebaseAuth = auth;
}

console.log('[Firebase] Configuration initialisée');

