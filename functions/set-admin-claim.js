/**
 * Script one-shot : définir la revendication "admin" pour un ou plusieurs utilisateurs Firebase Auth.
 *
 * Usage (depuis le dossier functions/) :
 *   node set-admin-claim.js EMAIL1 "chemin/vers/cle.json"
 *   node set-admin-claim.js EMAIL1 EMAIL2 "chemin/vers/cle.json"
 *
 * Tous les arguments qui ne se terminent pas par .json sont des emails à passer en admin.
 */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const keyPath = args.find((x) => x.endsWith('.json'));
const emails = args.filter((x) => x !== keyPath);

if (emails.length === 0) {
  console.error('Usage : node set-admin-claim.js EMAIL1 [EMAIL2 ...] "chemin/vers/mangawatch-key.json"');
  process.exit(1);
}

if (!admin.apps.length) {
  if (keyPath) {
    const fullPath = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
    if (!fs.existsSync(fullPath)) {
      console.error('Fichier introuvable :', fullPath);
      process.exit(1);
    }
    const serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    admin.initializeApp();
  }
}

async function setAdminClaimForEmail(email) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log('OK : admin défini pour', email, '(uid:', user.uid, ')');
}

async function main() {
  let hasError = false;
  for (const email of emails) {
    try {
      await setAdminClaimForEmail(email);
    } catch (err) {
      console.error('Erreur pour', email, ':', err.message);
      if (err.code === 'auth/user-not-found') {
        console.error('  -> Inscrivez-vous d\'abord sur le site avec cet email.');
      }
      hasError = true;
    }
  }
  console.log('Les utilisateurs doivent se déconnecter puis se reconnecter (ou attendre ~1h) pour que le token soit mis à jour.');
  process.exit(hasError ? 1 : 0);
}

main();
