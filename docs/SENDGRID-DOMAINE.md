# Configurer SendGrid avec ton domaine (mangawatch.fr)

Ce guide explique comment vérifier ton domaine **mangawatch.fr** dans SendGrid pour envoyer les emails (ticket d'aide, etc.) depuis une adresse **@mangawatch.fr**.

---

## Étape 1 : SendGrid – Domain Authentication

1. Va sur **[sendgrid.com](https://sendgrid.com)** et connecte-toi.
2. Menu de gauche : **Settings** → **Sender Authentication** (ou **Paramètres** → **Authentification de l’expéditeur**).
3. Clique sur **Authenticate Your Domain** (Domain Authentication).
4. Choisis ton **DNS host** : si ton domaine est chez **OVH**, sélectionne **Other Host (Not Listed)** (ou cherche **OVH** s’il apparaît).
5. Indique ton domaine : **mangawatch.fr** (sans www).
6. SendGrid te demande si tu envoies depuis la **racine** (mangawatch.fr) uniquement ou aussi depuis des sous-domaines. Choisis selon ton besoin (souvent **racine + sous-domaines** pour pouvoir utiliser noreply@mangawatch.fr).
7. Clique sur **Next**. SendGrid affiche une liste d’**enregistrements DNS** à ajouter (souvent 3 enregistrements **CNAME** avec un nom et une valeur chacun). **Garde cette page ouverte** ou note les valeurs.

Exemple de ce que SendGrid peut afficher :

| Type | Host / Sous-domaine | Value / Cible |
|------|---------------------|----------------|
| CNAME | s1._domainkey.mangawatch.fr | s1.domainkey.uXXXXX.wl.sendgrid.net |
| CNAME | s2._domainkey.mangawatch.fr | s2.domainkey.uXXXXX.wl.sendgrid.net |
| CNAME | em1234.mangawatch.fr | uXXXXX.wl.sendgrid.net |

*(Les valeurs exactes sont celles affichées par SendGrid.)*

---

## Étape 2 : OVH – Ajouter les enregistrements DNS

1. Va sur **[ovh.com](https://www.ovh.com)** → **Manager** (connecte-toi).
2. **Noms de domaine** → clique sur **mangawatch.fr**.
3. Onglet **Zone DNS** (ou **DNS**).
4. Pour **chaque** ligne donnée par SendGrid :
   - Clique sur **Ajouter une entrée** (ou **Add entry**).
   - **Type** : CNAME (ou ce que SendGrid indique).
   - **Sous-domaine** :  
     SendGrid donne souvent un **Host** du type `s1._domainkey` ou `em1234`.  
     Chez OVH, tu entres **uniquement la partie avant** mangawatch.fr :
     - Si SendGrid dit `s1._domainkey.mangawatch.fr` → sous-domaine : **s1._domainkey**
     - Si SendGrid dit `em1234.mangawatch.fr` → sous-domaine : **em1234**
   - **Cible** (ou Target) : la valeur donnée par SendGrid (ex. `s1.domainkey.uXXXXX.wl.sendgrid.net`).
   - Enregistre.
5. Répète pour les 2 ou 3 enregistrements affichés par SendGrid.
6. **Sauvegarde** la zone DNS si OVH le demande. La propagation peut prendre **quelques minutes à 1–2 heures**.

---

## Étape 3 : SendGrid – Vérifier le domaine

1. Retourne sur SendGrid, page **Sender Authentication** → **Authenticate Your Domain**.
2. Clique sur **Verify** (ou **Vérifier**).
3. Si les DNS sont bien en place, SendGrid affiche **Verified** (Vérifié). Sinon, attends un peu et réessaie.

---

## Étape 4 : Créer un expéditeur (Single Sender) avec ton domaine

1. SendGrid → **Settings** → **Sender Authentication** → **Single Sender Verification**.
2. **Create New Sender** (Créer un nouvel expéditeur).
3. Remplis :
   - **From Name** : `MangaWatch` ou `MangaWatch Aide`
   - **From Email** : **noreply@mangawatch.fr** (ou contact@mangawatch.fr)
   - **Reply To** : ton email où tu veux recevoir les réponses (ex. mangawatch.off@gmail.com)
   - Adresse postale, etc.
4. Valide. SendGrid envoie un **email de vérification** à **noreply@mangawatch.fr**.
5. Pour cliquer sur le lien de vérification, il faut **recevoir** cet email. Deux cas :
   - Si tu as une **boîte mail @mangawatch.fr** (Zimbra ou autre) : ouvre la boîte et clique sur le lien.
   - Si tu n’as **pas** de boîte @mangawatch.fr : tu peux créer un **Forward** (redirection) chez OVH pour que **noreply@mangawatch.fr** redirige vers **mangawatch.off@gmail.com**, puis vérifier depuis Gmail.  
     (OVH → Domaine → Emails / Redirections, selon ton offre.)

Une fois le lien cliqué, l’expéditeur **noreply@mangawatch.fr** est vérifié et tu peux l’utiliser dans SendGrid.

---

## Étape 5 : Firebase / Cloud Function – Utiliser cet expéditeur

La Cloud Function utilise les **variables d’environnement** (plus `functions.config()`, déprécié).

1. **Clé API SendGrid**  
   SendGrid → **Settings** → **API Keys** → **Create API Key** → donne un nom (ex. "Firebase tickets") → **Full Access** ou au minimum **Mail Send** → copie la clé.

2. **Déployer la Cloud Function** (une fois) :
   ```bash
   cd functions
   npm install
   cd ..
   firebase deploy --only functions:onSupportTicketCreated
   ```

3. **Configurer les variables d’environnement** (Google Cloud Console) :
   - Va sur **[console.cloud.google.com](https://console.cloud.google.com)** → sélectionne le projet Firebase (ex. **mangawatch-98ed0**).
   - Menu **Cloud Functions** → clique sur la fonction **onSupportTicketCreated**.
   - **Modifier** (icône crayon) → section **Runtime, build, connexions et sécurité** → **Variables d’environnement**.
   - Ajoute :
     - **SENDGRID_API_KEY** = ta clé API SendGrid (ex. `SG.xxx...`)
     - **FROM_EMAIL** = `noreply@mangawatch.fr`
   - **Déployer** pour enregistrer.

Après ça, les emails de ticket partent depuis **noreply@mangawatch.fr** vers **mangawatch.off@gmail.com**.

---

## Résumé

| Étape | Où | Action |
|-------|-----|--------|
| 1 | SendGrid | Domain Authentication → ajouter le domaine mangawatch.fr |
| 2 | OVH | Zone DNS → ajouter les CNAME donnés par SendGrid |
| 3 | SendGrid | Vérifier le domaine (Verify) |
| 4 | SendGrid | Single Sender : noreply@mangawatch.fr + vérifier par email |
| 5 | Firebase + Google Cloud | Déployer la function, puis dans Cloud Console : variables d’env. `SENDGRID_API_KEY` et `FROM_EMAIL` |

Si tu n’as pas encore de boîte **noreply@mangawatch.fr**, tu peux temporairement laisser la Cloud Function avec **from_email** = une adresse Gmail déjà vérifiée en Single Sender, puis passer à **noreply@mangawatch.fr** une fois la redirection ou la boîte en place.
