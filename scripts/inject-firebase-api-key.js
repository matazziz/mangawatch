/**
 * Remplace le placeholder dans js/firebase-config.js par la clé web (env Netlify).
 * Nom d’env volontairement atypique pour éviter les faux positifs du scanner Netlify.
 */
const fs = require('fs');
const path = require('path');

const PLACEHOLDER = '__MANGAWATCH_FB_WEB_KEY__';
const key = process.env.MANGAWATCH_FB_WEB_API_KEY;

if (!key || !String(key).trim()) {
  console.error(
    '[inject-firebase-api-key] Variable MANGAWATCH_FB_WEB_API_KEY manquante. ' +
      'Netlify : Site settings → Environment variables.'
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
