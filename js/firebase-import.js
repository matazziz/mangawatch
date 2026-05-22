/**
 * Point d'entrée unique pour charger firebase-service.js (cache-bust).
 * Bump FIREBASE_SERVICE_V après chaque correctif critique de ce module.
 */
export const FIREBASE_SERVICE_V = '6febe21';

export const FIREBASE_SERVICE_URL = new URL(
  './firebase-service.js?v=' + FIREBASE_SERVICE_V,
  import.meta.url
).href;

/** @returns {Promise<typeof import('./firebase-service.js')>} */
export function importFirebaseService() {
  return import(FIREBASE_SERVICE_URL);
}
