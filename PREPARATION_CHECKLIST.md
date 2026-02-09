# ✅ Checklist de Préparation - Migration Firebase

Utilisez cette checklist pour suivre votre progression dans la préparation de la migration vers Firebase.

## 📋 Phase 1 : Configuration Firebase

### Création du projet
- [ ] Créer un compte Firebase (si pas déjà fait)
- [ ] Créer un nouveau projet Firebase
- [ ] Noter le Project ID

### Configuration Firestore
- [ ] Activer Firestore Database
- [ ] Choisir le mode de production (règles de sécurité strictes)
- [ ] Choisir la région (ex: europe-west1 pour l'Europe)
- [ ] Créer les collections suivantes :
  - [ ] `forum_topics`
  - [ ] `forum_replies`
  - [ ] `messages`
  - [ ] `user_content_notes`
  - [ ] `user_top10`
  - [ ] `user_profiles` (optionnel)

### Configuration Authentication
- [ ] Activer Firebase Authentication
- [ ] Activer le provider Email/Password
- [ ] Activer le provider Google Sign-In
- [ ] Configurer les domaines autorisés pour Google Sign-In

### Récupération des clés
- [ ] Aller dans Paramètres du projet > Vos applications
- [ ] Créer une application Web
- [ ] Copier les valeurs de configuration :
  - [ ] `apiKey`
  - [ ] `authDomain`
  - [ ] `projectId`
  - [ ] `storageBucket`
  - [ ] `messagingSenderId`
  - [ ] `appId`

### Configuration Storage (optionnel)
- [ ] Activer Firebase Storage si nécessaire pour les avatars/images
- [ ] Configurer les règles de sécurité Storage

---

## 📦 Phase 2 : Installation et Configuration du Code

### Installation Firebase SDK
- [ ] Décider de la méthode d'import (CDN ou npm)
- [ ] Si CDN : Ajouter les scripts dans les pages HTML
- [ ] Si npm : Installer `firebase` via npm

### Fichiers de configuration
- [ ] Créer `js/firebase-config.js` (copier depuis `firebase-config.example.js`)
- [ ] Remplir les vraies valeurs de configuration
- [ ] Tester la connexion Firebase (console.log)

### Création des services
- [ ] Créer `js/firebase-service.js` (copier depuis `firebase-service.example.js`)
- [ ] Créer `js/firebaseNotesService.js` (copier depuis `firebaseNotesService.example.js`)
- [ ] Adapter les services selon vos besoins spécifiques

### Tests de base
- [ ] Tester l'initialisation Firebase (pas d'erreurs console)
- [ ] Tester la connexion à Firestore
- [ ] Tester la connexion à Auth

---

## 🔧 Phase 3 : Adaptation du Code Existant

### Authentification
- [ ] Identifier tous les fichiers utilisant `supabase.auth`
- [ ] Adapter `js/auth.js` pour Firebase Auth
- [ ] Adapter `js/acceuil.js` (formulaires de connexion)
- [ ] Tester la connexion Email/Password
- [ ] Tester la connexion Google Sign-In
- [ ] Tester la déconnexion
- [ ] Vérifier la persistance de session

### Forum
- [ ] Adapter `js/forum.js` pour utiliser `firebase-service.js`
- [ ] Adapter `js/forum-topic.js`
- [ ] Adapter `js/forum-service.js`
- [ ] Tester l'affichage des sujets
- [ ] Tester la création d'un sujet
- [ ] Tester l'affichage des réponses
- [ ] Tester la création d'une réponse
- [ ] Tester la modification d'une réponse
- [ ] Tester la suppression d'une réponse

### Messages
- [ ] Adapter `js/messageService.js` pour Firebase
- [ ] Adapter `js/messaging.js`
- [ ] Tester l'affichage des messages
- [ ] Tester l'envoi d'un message
- [ ] Tester le marquage comme lu
- [ ] Tester la suppression d'un message

### Notes utilisateur
- [ ] Adapter `js/profile-anime-cards.js` pour utiliser `firebaseNotesService`
- [ ] Tester l'affichage des notes
- [ ] Tester l'ajout d'une note
- [ ] Tester la modification d'une note
- [ ] Tester la suppression d'une note

### Top 10
- [ ] Adapter le code du top 10 pour utiliser `firebaseTop10Service`
- [ ] Tester l'affichage du top 10
- [ ] Tester l'ajout d'un élément
- [ ] Tester la modification du rang
- [ ] Tester la suppression d'un élément

---

## 🛡️ Phase 4 : Règles de Sécurité

### Configuration des règles Firestore
- [ ] Copier les règles depuis `FIREBASE_MIGRATION_GUIDE.md`
- [ ] Adapter selon vos besoins
- [ ] Tester les règles en mode test
- [ ] Déployer les règles en production

### Index Firestore
- [ ] Identifier les requêtes avec `where()` et `orderBy()`
- [ ] Créer les index composites nécessaires
- [ ] Vérifier que tous les index sont créés

### Tests de sécurité
- [ ] Tester qu'un utilisateur non connecté ne peut pas créer de données
- [ ] Tester qu'un utilisateur ne peut modifier que ses propres données
- [ ] Tester que les messages privés sont bien protégés

---

## 📊 Phase 5 : Migration des Données

### Préparation
- [ ] Sauvegarder toutes les données Supabase (export SQL ou JSON)
- [ ] Créer un script de migration (`js/migrate-to-firebase.js`)
- [ ] Tester le script avec quelques données de test

### Migration
- [ ] Migrer les profils utilisateurs (si applicable)
- [ ] Migrer les sujets du forum
- [ ] Migrer les réponses du forum
- [ ] Migrer les messages
- [ ] Migrer les notes utilisateur
- [ ] Migrer les top 10 utilisateur

### Vérification
- [ ] Compter les documents dans chaque collection Firestore
- [ ] Comparer avec les données Supabase
- [ ] Vérifier l'intégrité des relations (topic_id, etc.)
- [ ] Vérifier les timestamps sont corrects

---

## 🧪 Phase 6 : Tests Complets

### Tests fonctionnels
- [ ] **Authentification**
  - [ ] Inscription avec email
  - [ ] Connexion avec email
  - [ ] Connexion Google
  - [ ] Déconnexion
  - [ ] Persistance de session

- [ ] **Forum**
  - [ ] Liste des sujets
  - [ ] Affichage d'un sujet
  - [ ] Création d'un sujet
  - [ ] Modification d'un sujet (auteur)
  - [ ] Suppression d'un sujet (auteur)
  - [ ] Affichage des réponses
  - [ ] Création d'une réponse
  - [ ] Modification d'une réponse
  - [ ] Suppression d'une réponse

- [ ] **Messages**
  - [ ] Affichage des messages globaux
  - [ ] Affichage des messages privés
  - [ ] Envoi d'un message (admin)
  - [ ] Marquage comme lu
  - [ ] Suppression d'un message

- [ ] **Notes**
  - [ ] Affichage des notes
  - [ ] Ajout d'une note
  - [ ] Modification d'une note
  - [ ] Suppression d'une note

- [ ] **Top 10**
  - [ ] Affichage du top 10
  - [ ] Ajout d'un élément
  - [ ] Modification du rang
  - [ ] Suppression d'un élément

### Tests de performance
- [ ] Temps de chargement des sujets du forum
- [ ] Temps de chargement des notes utilisateur
- [ ] Temps de chargement des messages
- [ ] Vérifier qu'il n'y a pas de requêtes inutiles

### Tests multi-navigateurs
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (si applicable)
- [ ] Mobile (Chrome mobile)

---

## 🚀 Phase 7 : Déploiement

### Pré-déploiement
- [ ] Retirer les dépendances Supabase du code
- [ ] Nettoyer les imports Supabase non utilisés
- [ ] Mettre à jour les variables d'environnement
- [ ] Vérifier que `.env` ne contient plus les clés Supabase

### Déploiement
- [ ] Déployer les règles Firestore en production
- [ ] Déployer le code mis à jour
- [ ] Vérifier que le site fonctionne en production

### Post-déploiement
- [ ] Surveiller les erreurs dans la console Firebase
- [ ] Vérifier les logs d'utilisation
- [ ] Tester les fonctionnalités critiques en production
- [ ] Informer les utilisateurs si nécessaire

---

## 📝 Notes et Observations

### Problèmes rencontrés
```
[Noter ici les problèmes rencontrés et leurs solutions]
```

### Améliorations à faire
```
[Noter ici les améliorations futures]
```

### Dates importantes
- **Début de la migration :** _______________
- **Fin de la migration :** _______________
- **Date de déploiement :** _______________

---

## ⚠️ Points d'Attention

- ⚠️ Ne pas supprimer Supabase avant d'avoir migré toutes les données
- ⚠️ Tester en local avant de déployer
- ⚠️ Faire des sauvegardes régulières
- ⚠️ Communiquer avec les utilisateurs si interruption de service prévue
- ⚠️ Surveiller les coûts Firebase (quotas gratuits)

---

**Dernière mise à jour :** _______________

