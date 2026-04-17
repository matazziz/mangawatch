/**
 * Remplace le placeholder dans js/firebase-config.js par FIREBASE_API_KEY.
 * Utilisé par Netlify (variable d’environnement) pour éviter de committer la clé.
 */
const fs = require('fs');
const path = require('path');

const PLACEHOLDER = '__FIREBASE_API_KEY_INJECT__';
const key = process.env.FIREBASE_API_KEY;

if (!key || !String(key).trim()) {
  console.error(
    '[inject-firebase-api-key] FIREBASE_API_KEY est manquant. ' +
      'Définissez-la dans Netlify : Site settings → Environment variables.'
  );
  process.exit(1);
}

const configPath = path.join(__dirname, '..', 'js', 'firebase-config.js');
let content = fs.readFileSync(configPath, 'utf8');

if (!content.includes(PLACEHOLDER)) {
  console.log('[inject-firebase-api-key] Placeholder absent — rien à faire.');
  process.exit(0);
}

content = content.split(PLACEHOLDER).join(key);
fs.writeFileSync(configPath, content, 'utf8');
console.log('[inject-firebase-api-key] Clé injectée dans firebase-config.js');
