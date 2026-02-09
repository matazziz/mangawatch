# Cloud Functions MangaWatch

## Notification email ticket d'aide

Quand un utilisateur envoie un ticket depuis le lien **Aide** du footer, un email est envoyé à **mangawatch.off@gmail.com** avec le sujet, le message, l'utilisateur et la page.

## Configuration

### 1. Clé SendGrid

Une fois la clé API SendGrid obtenue, configure-la pour les Cloud Functions :

```bash
firebase functions:config:set sendgrid.apikey="TA_CLE_SENDGRID"
```

(Optionnel) Email expéditeur :

```bash
firebase functions:config:set sendgrid.from_email="noreply@ton-domaine.com"
```

### 2. Déployer les functions

À la racine du projet :

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Ou déployer uniquement la function ticket :

```bash
firebase deploy --only functions:onSupportTicketCreated
```

## Prérequis

- Projet Firebase sur le **plan Blaze** (facturation à l'usage) pour utiliser Cloud Functions.
- Compte SendGrid avec une clé API.
