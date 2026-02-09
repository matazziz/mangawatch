# 📧 Système d'Emails MangaWatch

Ce document explique comment configurer et utiliser le système d'emails automatiques de MangaWatch.

## 🚀 **Fonctionnalités**

### **Types d'emails supportés :**
- ✅ **Email de bienvenue** après inscription
- ✅ **Email de confirmation** de connexion  
- ✅ **Email de récupération** de mot de passe
- ✅ **Templates HTML** professionnels et responsifs
- ✅ **Mode développement** (logs) et **production** (vrais emails)

## 🔧 **Installation**

### **1. Installer les dépendances :**
```bash
npm install
```

### **2. Configurer les variables d'environnement :**
Copiez le fichier `env.example` vers `.env` et configurez :
```bash
cp env.example .env
```

### **3. Configurer SendGrid (optionnel pour le développement) :**
- Créez un compte sur [sendgrid.com](https://sendgrid.com)
- Obtenez votre clé API
- Ajoutez-la dans le fichier `.env`

## ⚙️ **Configuration**

### **Variables d'environnement :**
```env
# Mode de fonctionnement
NODE_ENV=development  # ou 'production'

# Configuration SendGrid
SENDGRID_API_KEY=your_api_key_here
FROM_EMAIL=noreply@mangawatch.com
FROM_NAME=MangaWatch

# Configuration de l'application
APP_URL=http://localhost:3000
APP_LOGO=https://mangawatch.com/logo.png
```

## 🎯 **Utilisation**

### **1. Envoi d'email de bienvenue :**
```javascript
const EmailService = require('./services/emailService');
const emailService = new EmailService();

// Après inscription d'un utilisateur
await emailService.sendWelcomeEmail({
    username: 'JohnDoe',
    email: 'john@example.com'
});
```

### **2. Envoi d'email de confirmation de connexion :**
```javascript
await emailService.sendLoginConfirmationEmail({
    username: 'JohnDoe',
    email: 'john@example.com'
});
```

### **3. Envoi d'email de récupération de mot de passe :**
```javascript
await emailService.sendPasswordResetEmail({
    username: 'JohnDoe',
    email: 'john@example.com'
}, 'reset_token_here');
```

## 🔍 **Mode Développement vs Production**

### **Mode Développement (NODE_ENV=development) :**
- ✅ **Aucun email réel** n'est envoyé
- ✅ **Tous les emails sont loggés** dans `logs/email-logs.json`
- ✅ **Console logs** pour le débogage
- ✅ **Pas de coût** SendGrid

### **Mode Production (NODE_ENV=production) :**
- ✅ **Vrais emails** envoyés via SendGrid
- ✅ **Logs complets** de tous les envois
- ✅ **Gestion des erreurs** et retry automatique
- ✅ **Limites d'envoi** respectées

## 📊 **Monitoring et Logs**

### **Fichier de logs :**
- **Emplacement :** `logs/email-logs.json`
- **Contenu :** Timestamp, type, destinataire, sujet, contenu
- **Rétention :** 100 derniers emails

### **Statistiques en temps réel :**
```javascript
const stats = emailService.getStats();
console.log(stats);
// {
//   mode: 'development',
//   emailsSentToday: 5,
//   limit: 100,
//   remaining: 95
// }
```

## 🛡️ **Sécurité**

### **Limites d'envoi :**
- **Gratuit :** 100 emails/jour
- **Limite horaire :** 10 emails/heure
- **Réinitialisation :** Chaque jour à minuit

### **Validation :**
- ✅ Vérification des adresses email
- ✅ Protection contre le spam
- ✅ Gestion des erreurs d'envoi

## 🎨 **Personnalisation des Templates**

### **Localisation des templates :**
- **Bienvenue :** `templates/welcome.html`
- **Connexion :** `templates/login-confirmation.html`
- **Mot de passe :** `templates/password-reset.html`

### **Variables disponibles :**
- `{{username}}` - Nom d'utilisateur
- `{{appName}}` - Nom de l'application
- `{{appUrl}}` - URL de l'application
- `{{logo}}` - Logo de l'application
- `{{loginTime}}` - Heure de connexion
- `{{resetUrl}}` - URL de réinitialisation

## 🚨 **Dépannage**

### **Erreurs courantes :**

#### **1. "Limite d'emails atteinte" :**
- Vérifiez votre plan SendGrid
- Attendez la réinitialisation quotidienne
- Vérifiez les logs pour plus de détails

#### **2. "Clé API invalide" :**
- Vérifiez votre clé API SendGrid
- Assurez-vous que la clé a les bonnes permissions
- Vérifiez le fichier `.env`

#### **3. "Template non trouvé" :**
- Vérifiez que les fichiers de templates existent
- Vérifiez les chemins dans `emailService.js`
- Vérifiez les permissions de fichiers

## 📞 **Support**

Pour toute question ou problème :
- 📧 **Email :** support@mangawatch.com
- 💬 **Discord :** [Lien Discord]
- 📱 **GitHub :** [Issues GitHub]

## 🔄 **Mise à jour**

### **Mettre à jour SendGrid :**
```bash
npm update @sendgrid/mail
```

### **Mettre à jour les templates :**
- Modifiez les fichiers HTML dans `templates/`
- Testez en mode développement
- Déployez en production

---

**🎉 Votre système d'emails MangaWatch est maintenant prêt !**
