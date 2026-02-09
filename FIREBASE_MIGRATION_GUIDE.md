# Guide de Préparation pour la Migration vers Firebase

Ce document vous guide dans la préparation de votre site pour la migration de Supabase vers Firebase Firestore.

## 📋 Table des matières

1. [Vue d'ensemble de la migration](#vue-densemble)
2. [Structure de données Firestore](#structure-données)
3. [Services à créer/adapter](#services)
4. [Authentification](#authentification)
5. [Règles de sécurité](#règles-sécurité)
6. [Migration des données](#migration-données)
7. [Checklist de préparation](#checklist)

---

## 🎯 Vue d'ensemble de la migration

### Données actuellement dans Supabase à migrer :

1. **Forum** (`forum_topics`, `forum_replies`, `forum_users`)
2. **Messages** (`messages`)
3. **Notes utilisateur** (`user_content_notes`)
4. **Top 10 utilisateur** (`user_top10`)

### Données à conserver en local (JSON) :

- `data/questions.json` - Questions de quiz
- `data/auteurs.json` - Données des auteurs
- `data/characters.json` - Données des personnages

---

## 🗂️ Structure de données Firestore

### Collections à créer dans Firestore :

#### 1. **forum_topics** (Collection)
```javascript
{
  id: "auto-generated", // Document ID
  title: "string",
  content: "string",
  category: "string",
  user_id: "string", // Firebase Auth UID
  user_email: "string",
  author_name: "string",
  author_avatar: "string",
  views: number,
  replies_count: number,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

#### 2. **forum_replies** (Collection)
```javascript
{
  id: "auto-generated",
  topic_id: "string", // Référence au topic
  content: "string",
  user_id: "string",
  user_email: "string",
  author_name: "string",
  author_avatar: "string",
  created_at: Timestamp,
  updated_at: Timestamp
}
```

#### 3. **messages** (Collection)
```javascript
{
  id: "auto-generated",
  recipient_email: "string | null", // null = message global
  title: "string",
  content: "string",
  message_type: "string", // 'info', 'warning', 'ban', 'thank', 'global'
  is_read: boolean,
  created_at: Timestamp,
  created_by: "string", // Email de l'admin
  metadata: object
}
```

#### 4. **user_content_notes** (Collection)
```javascript
{
  id: "auto-generated",
  user_email: "string",
  content_id: "string",
  content_type: "string", // 'anime' ou 'manga'
  note: number,
  titre: "string",
  image: "string",
  synopsis: "string",
  genres: array,
  score: number,
  added_at: Timestamp
}
```

#### 5. **user_top10** (Collection)
```javascript
{
  id: "auto-generated",
  user_email: "string",
  content_id: "string",
  content_type: "string",
  rang: number, // 1-10
  titre: "string",
  image: "string",
  synopsis: "string",
  genres: array,
  score: number
}
```

#### 6. **user_profiles** (Collection) - Optionnel
```javascript
{
  id: "string", // Firebase Auth UID
  email: "string",
  username: "string",
  avatar_url: "string",
  langue: "string",
  continent: "string",
  created_at: Timestamp,
  updated_at: Timestamp
}
```

---

## 🔧 Services à créer/adapter

### Fichiers à créer/modifier :

#### 1. **`js/firebase-config.js`** (NOUVEAU)
```javascript
// Configuration Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_AUTH_DOMAIN",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_STORAGE_BUCKET",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId: "VOTRE_APP_ID"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

#### 2. **`js/firebase-service.js`** (NOUVEAU)
Service principal pour remplacer `supabase.js`

#### 3. **`js/firebaseNotesService.js`** (NOUVEAU)
Remplace `supabaseNotesService.js`

#### 4. **`js/firebaseMessageService.js`** (NOUVEAU)
Remplace les fonctions Supabase dans `messageService.js`

#### 5. **`js/firebaseForumService.js`** (NOUVEAU)
Remplace `forum-service.js`

---

## 🔐 Authentification

### Configuration Firebase Auth :

1. **Activer les providers** dans Firebase Console :
   - Email/Password
   - Google Sign-In

2. **Adapter le code d'authentification** :
   - Remplacer `supabase.auth` par `firebase.auth`
   - Adapter les callbacks et listeners

### Exemple de migration :

**Avant (Supabase) :**
```javascript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google'
});
```

**Après (Firebase) :**
```javascript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
```

---

## 🛡️ Règles de sécurité Firestore

### Règles à configurer dans `firestore.rules` :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isOwnerByEmail(userEmail) {
      return isAuthenticated() && request.auth.token.email == userEmail;
    }
    
    // Forum Topics
    match /forum_topics/{topicId} {
      allow read: if true; // Public read
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.user_id);
    }
    
    // Forum Replies
    match /forum_replies/{replyId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.user_id);
    }
    
    // Messages
    match /messages/{messageId} {
      allow read: if isAuthenticated() && 
        (resource.data.recipient_email == null || 
         resource.data.recipient_email == request.auth.token.email ||
         resource.data.created_by == request.auth.token.email);
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        resource.data.recipient_email == request.auth.token.email;
      allow delete: if isAuthenticated() && 
        (resource.data.created_by == request.auth.token.email || 
         request.auth.token.admin == true);
    }
    
    // User Content Notes
    match /user_content_notes/{noteId} {
      allow read: if isOwnerByEmail(resource.data.user_email);
      allow create, update, delete: if isOwnerByEmail(resource.data.user_email);
    }
    
    // User Top 10
    match /user_top10/{itemId} {
      allow read: if isOwnerByEmail(resource.data.user_email);
      allow create, update, delete: if isOwnerByEmail(resource.data.user_email);
    }
    
    // User Profiles
    match /user_profiles/{userId} {
      allow read: if true; // Public profiles
      allow create, update: if isOwner(userId);
    }
  }
}
```

---

## 📦 Migration des données

### Script de migration à créer : `js/migrate-to-firebase.js`

Ce script devra :
1. Se connecter à Supabase (temporairement)
2. Récupérer toutes les données
3. Les convertir au format Firestore
4. Les insérer dans Firestore

**⚠️ Important :** Exécuter ce script une seule fois avant de couper l'accès à Supabase.

---

## ✅ Checklist de préparation

### Phase 1 : Configuration Firebase
- [ ] Créer un projet Firebase
- [ ] Activer Firestore Database
- [ ] Activer Firebase Authentication
- [ ] Configurer les providers d'authentification (Email, Google)
- [ ] Récupérer les clés de configuration
- [ ] Créer les collections dans Firestore
- [ ] Configurer les règles de sécurité

### Phase 2 : Installation des dépendances
- [ ] Ajouter Firebase SDK au projet
- [ ] Créer `js/firebase-config.js`
- [ ] Tester la connexion Firebase

### Phase 3 : Création des services
- [ ] Créer `js/firebase-service.js` (remplace `supabase.js`)
- [ ] Créer `js/firebaseNotesService.js`
- [ ] Créer `js/firebaseMessageService.js`
- [ ] Créer `js/firebaseForumService.js`
- [ ] Adapter `js/auth.js` pour Firebase Auth

### Phase 4 : Migration du code
- [ ] Remplacer les imports Supabase par Firebase
- [ ] Adapter les appels de service dans :
  - `js/forum.js`
  - `js/forum-topic.js`
  - `js/messageService.js`
  - `js/profile-anime-cards.js`
  - `js/messaging.js`
- [ ] Tester chaque fonctionnalité

### Phase 5 : Migration des données
- [ ] Créer le script de migration
- [ ] Sauvegarder les données Supabase
- [ ] Exécuter la migration
- [ ] Vérifier l'intégrité des données

### Phase 6 : Tests et validation
- [ ] Tester l'authentification
- [ ] Tester le forum (création, lecture, modification, suppression)
- [ ] Tester les messages
- [ ] Tester les notes utilisateur
- [ ] Tester le top 10
- [ ] Tester sur différents navigateurs

### Phase 7 : Déploiement
- [ ] Mettre à jour `firestore.rules` en production
- [ ] Déployer les nouvelles règles
- [ ] Mettre à jour les variables d'environnement
- [ ] Retirer les dépendances Supabase
- [ ] Nettoyer le code obsolète

---

## 📝 Notes importantes

### Différences clés Supabase → Firebase :

1. **Queries** :
   - Supabase : `.from('table').select('*').eq('field', value)`
   - Firebase : `collection(db, 'collection').where('field', '==', value)`

2. **Timestamps** :
   - Supabase : `created_at` (string ISO)
   - Firebase : `created_at` (Timestamp object)

3. **IDs** :
   - Supabase : Auto-increment ou UUID
   - Firebase : Auto-generated document IDs

4. **Relations** :
   - Supabase : Foreign keys SQL
   - Firebase : Document references ou IDs en string

### Points d'attention :

- ⚠️ Les timestamps doivent être convertis
- ⚠️ Les relations doivent être adaptées (pas de JOIN)
- ⚠️ Les requêtes complexes peuvent nécessiter plusieurs appels
- ⚠️ Les index Firestore doivent être créés pour les requêtes complexes

---

## 🚀 Prochaines étapes

1. **Commencer par la configuration Firebase** (Phase 1)
2. **Créer les services de base** (Phase 3)
3. **Tester avec des données de test** avant la migration complète
4. **Migrer progressivement** : Forum → Messages → Notes → Top 10

---

## 📚 Ressources

- [Documentation Firebase Firestore](https://firebase.google.com/docs/firestore)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

**Date de création :** $(date)
**Dernière mise à jour :** $(date)

