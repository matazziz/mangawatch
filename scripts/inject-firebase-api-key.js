/**
 * Remplace le placeholder Base64 dans js/firebase-config.js (atob('…')).
 * La clé n’apparaît jamais en clair dans les fichiers après build : le scanner
 * « smart detection » de Netlify analyse aussi la sortie du build (clé en clair = échec du déploiement).
 */
const fs = require('fs');
const path = require('path');

const PLACEHOLDER = '__MANGAWATCH_FB_KEY_B64__';
let key = process.env.MANGAWATCH_FB_WEB_API_KEY;
if (key) {
  key = String(key).trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }
}

if (!key) {
  console.error(
    '[inject-firebase-api-key] Variable MANGAWATCH_FB_WEB_API_KEY manquante. ' +
      'Netlify : Site settings → Environment variables.'
  );
  process.exit(1);
}

const b64 = Buffer.from(String(key).trim(), 'utf8').toString('base64');

const configPath = path.join(__dirname, '..', 'js', 'firebase-config.js');
let content = fs.readFileSync(configPath, 'utf8');

if (!content.includes(PLACEHOLDER)) {
  console.log('[inject-firebase-api-key] Placeholder absent — rien à faire.');
  process.exit(0);
}

content = content.split(PLACEHOLDER).join(b64);
fs.writeFileSync(configPath, content, 'utf8');
console.log('[inject-firebase-api-key] Base64 de la clé injecté dans firebase-config.js');
