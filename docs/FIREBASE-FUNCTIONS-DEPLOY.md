# Déployer les Cloud Functions (Firebase)

## Erreur : "Unable to retrieve the repository metadata for gcf-artifacts"

Si le déploiement échoue avec une erreur **403** demandant les permissions **artifactregistry.repositories.list** et **artifactregistry.repositories.get**, il faut donner au compte de service Cloud Functions le rôle **Artifact Registry Reader**.

### Étapes dans Google Cloud Console

1. Va sur **[console.cloud.google.com](https://console.cloud.google.com)** et sélectionne le projet **mangawatch-98ed0**.

2. Menu **☰** → **IAM et administration** → **IAM** (ou cherche « IAM » dans la barre de recherche).

3. Dans la liste des principaux, trouve le compte de service **Compte par défaut de Compute Engine** :
   - Adresse du type : `223624179148-compute@developer.gserviceaccount.com`
   - Ou **Compte de service App Engine** : `mangawatch-98ed0@appspot.gserviceaccount.com`

4. Clique sur l’**icône crayon** (Modifier) à droite de ce compte.

5. Clique sur **+ AJOUTER UN AUTRE RÔLE**.

6. Dans la liste des rôles, cherche **Artifact Registry** et sélectionne **Lecteur Artifact Registry** (ou **Artifact Registry Reader**).

7. Clique sur **Enregistrer**.

8. Attends 1 à 2 minutes, puis relance le déploiement depuis la racine du projet :
   ```powershell
   firebase deploy --only functions
   ```

---

## Déploiement normal

Depuis la racine du projet :

```powershell
cd "c:\projet final\projet_fusionne"
firebase use mangawatch-98ed0
firebase deploy --only functions
```

Ensuite, configure les variables d’environnement **SENDGRID_API_KEY** et **FROM_EMAIL** dans la console (voir [SENDGRID-DOMAINE.md](SENDGRID-DOMAINE.md)).

---

## Pas d’email reçu après envoi d’un ticket

1. **Variables d’environnement** : Dans Google Cloud Console → Cloud Functions → **onSupportTicketCreated** → Modifier → Variables d’environnement, vérifie que **SENDGRID_API_KEY** et **FROM_EMAIL** sont bien définis, puis clique sur **Déployer** (sinon les changements ne sont pas pris en compte).
2. **Logs de la fonction** : Google Cloud Console → Cloud Functions → **onSupportTicketCreated** → onglet **Logs**. Regarde si tu vois « SENDGRID_API_KEY non configurée » ou une erreur SendGrid. Si la clé est absente ou invalide, l’email ne part pas.
3. **Spam** : Vérifie les courriers indésirables de **mangawatch.off@gmail.com**.

---

## Page admin : aucun ticket affiché

La section « Tickets d’aide » de la page admin n’affiche les tickets que si tu es connecté avec un compte qui a la **revendication (claim) admin** dans Firebase Auth.

Pour te donner le rôle admin une fois :

1. Firebase Console → **Paramètres du projet** (icône engrenage) → **Comptes de service** → **Générer une nouvelle clé privée** (fichier JSON). Garde ce fichier en lieu sûr.
2. Dans PowerShell, depuis le dossier **functions** du projet :
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\chemin\vers\ta-cle.json"
   node set-admin-claim.js mathieubroyer190508@gmail.com
   ```
3. Déconnecte-toi du site puis reconnecte-toi (ou attends environ 1 heure) pour que le token soit mis à jour. Ensuite, la page admin pourra afficher les tickets.
