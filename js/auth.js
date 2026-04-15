// Configuration Google Sign-In
const googleClientId = window.__GOOGLE_CLIENT_ID__ || 'GOOGLE_CLIENT_ID_NOT_SET';

// Décoder le token JWT
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Erreur de décodage du token:', error);
        return null;
    }
}

// Initialisation Google Sign-In
function initGoogleSignIn() {
    console.log('Initialisation Google Sign-In...');
    
    // Vérifier si l'élément existe
    const googleSignInDiv = document.getElementById('google-signin');
    if (!googleSignInDiv) {
        console.error('Le div google-signin n\'existe pas');
        return;
    }

    // Vérifier si Google Identity Services est chargé
    if (!google?.accounts?.id) {
        console.error('Google Identity Services non chargé');
        return;
    }

    console.log('Google Identity Services chargé');

    // Configuration initiale
    google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleSignIn,
        auto_select: false
    });
    
    console.log('Google Sign-In initialisé');
    
    // Rendu du bouton
    google.accounts.id.renderButton(
        googleSignInDiv,
        {
            type: 'standard',
            shape: 'rectangular',
            theme: 'outline',
            text: 'continue_with',
            size: 'large',
            width: '100%'
        }
    );
    
    console.log('Bouton Google rendu');
}

// Gestionnaire de connexion Google (ancien système - gardé pour compatibilité)
function handleGoogleSignIn(response) {
    console.log('Début de la connexion Google (ancien système)');
    
    try {
        // Vérifier si on a une réponse valide
        if (!response?.credential) {
            throw new Error('Réponse Google invalide');
        }

        console.log('Token reçu');

        // Décoder le token JWT
        const credential = parseJwt(response.credential);
        if (!credential) {
            throw new Error('Impossible de décoder le token');
        }
        
        console.log('Token décodé avec succès');
        
        // Sauvegarder les informations de l'utilisateur
        localStorage.setItem('user', JSON.stringify({
            name: credential.name || credential.given_name + ' ' + credential.family_name,
            email: credential.email,
            picture: credential.picture
        }));

        console.log('Session sauvegardée');

        // Rediriger vers l'accueil
        window.location.href = '/pages/acceuil.html';
    } catch (error) {
        console.error('Erreur lors de la connexion Google:', error);
        alert('Erreur lors de la connexion avec Google. Veuillez réessayer.');
    }
}

// Variable pour éviter les doubles clics
let isGoogleSignInInProgress = false;

// Nouvelle fonction pour Firebase Auth Google Sign-In
async function handleFirebaseGoogleSignIn() {
    // Empêcher les doubles clics
    if (isGoogleSignInInProgress) {
        console.log('⚠️ Connexion Google déjà en cours...');
        return;
    }
    
    isGoogleSignInInProgress = true;
    console.log('🔥 Début de la connexion Google avec Firebase');
    
    try {
        // Vérifier que Firebase est bien configuré
        console.log('📦 Import du service Firebase...');
        const { authService } = await import('./firebase-service.js');
        console.log('✅ Service Firebase importé');
        
        // Vérifier que authService existe
        if (!authService) {
            throw new Error('authService non disponible');
        }
        
        console.log('🔐 Ouverture de la popup Google...');
        // Se connecter avec Google via Firebase
        // Cette ligne ouvre la popup et attend que l'utilisateur choisisse son compte
        const result = await authService.signInWithGoogle();
        const user = result.user;
        
        // Si on arrive ici, c'est que l'utilisateur a vraiment choisi son compte et s'est connecté
        console.log('✅ Connexion Google réussie:', user);
        console.log('📧 Email:', user.email);
        console.log('👤 Nom:', user.displayName);
        
        // Compte local + Firestore : le pseudo choisi sur le site (Firestore / accounts) prime toujours sur le nom Google
        let accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        let existingAccount = accounts.find(acc => acc.email === user.email);
        const prevUser = JSON.parse(localStorage.getItem('user') || 'null');

        let firestoreProfile = null;
        if (typeof window.profileAccountService !== 'undefined' && window.profileAccountService.getProfileAccountInfo) {
            try {
                firestoreProfile = await window.profileAccountService.getProfileAccountInfo(user.email);
            } catch (e) {
                console.warn('Chargement profil Firestore:', e);
            }
        }

        if (firestoreProfile) {
            const idx = accounts.findIndex(acc => acc.email === user.email);
            if (idx >= 0) {
                const acc = accounts[idx];
                if (firestoreProfile.username) acc.username = firestoreProfile.username;
                if (firestoreProfile.country) {
                    acc.country = firestoreProfile.country;
                    acc.continent = firestoreProfile.country;
                }
                if (firestoreProfile.langue) acc.langue = firestoreProfile.langue;
                if (firestoreProfile.avatar) {
                    acc.avatar = firestoreProfile.avatar;
                    acc.customAvatar = firestoreProfile.avatar;
                }
                existingAccount = acc;
                localStorage.setItem('accounts', JSON.stringify(accounts));
                if (firestoreProfile.username) {
                    console.log('✅ Pseudo site (Firestore) appliqué au compte local:', firestoreProfile.username);
                }
            } else if (firestoreProfile.username || firestoreProfile.country || firestoreProfile.langue || firestoreProfile.avatar) {
                const syncedAccount = {
                    email: user.email,
                    username: firestoreProfile.username || user.email?.split('@')[0] || 'Utilisateur',
                    country: firestoreProfile.country || 'fr',
                    langue: firestoreProfile.langue || 'fr',
                    continent: firestoreProfile.country || 'fr',
                    avatar: firestoreProfile.avatar || null,
                    customAvatar: firestoreProfile.avatar || null,
                    provider: 'google'
                };
                accounts.push(syncedAccount);
                localStorage.setItem('accounts', JSON.stringify(accounts));
                existingAccount = syncedAccount;
                console.log('✅ Profil restauré depuis Firestore:', syncedAccount.username);
            }
        }

        const emailPart = user.email?.split('@')[0] || 'Utilisateur';
        let userName =
            firestoreProfile?.username ||
            (existingAccount && existingAccount.username) ||
            (prevUser && prevUser.email === user.email ? (prevUser.username || prevUser.name) : null) ||
            user.displayName ||
            emailPart;
        console.log('✅ Nom affiché (priorité pseudo site):', userName);
        
        // Sauvegarder les informations de l'utilisateur (inclure avatar Firestore si présent)
        const userData = {
            name: userName,
            email: user.email,
            picture: user.photoURL || 'https://via.placeholder.com/150',
            uid: user.uid,
            provider: 'google',
            langue: existingAccount?.langue || 'fr',
            country: existingAccount?.country || existingAccount?.continent || 'fr',
            isMinor: existingAccount?.isMinor || false
        };
        if (existingAccount?.username) {
            userData.username = existingAccount.username;
        } else if (firestoreProfile?.username) {
            userData.username = firestoreProfile.username;
        }
        if (existingAccount?.avatar || existingAccount?.customAvatar) {
            userData.avatar = existingAccount.avatar || existingAccount.customAvatar;
            userData.customAvatar = existingAccount.avatar || existingAccount.customAvatar;
        }
        
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isLoggedIn', 'true');
        // Activer automatiquement "rester connecté" pour les connexions Google
        localStorage.setItem('rememberMe', 'true');
        console.log('✅ Session sauvegardée dans localStorage avec pseudo:', userName);
        console.log('✅ Option "rester connecté" activée automatiquement pour Google');
        
        // Fermer le popup d'authentification si ouvert
        if (typeof closeAuthPopup === 'function') {
            closeAuthPopup();
        }
        
        // Mettre à jour l'interface
        if (typeof updateUI === 'function') {
            updateUI(userData);
        }
        
        // Afficher un message de succès SEULEMENT après la vraie connexion
        if (typeof showAuthSuccessModal === 'function') {
            showAuthSuccessModal('Connexion réussie ! Bienvenue ' + userData.name + ' !');
        }
        
        // Recharger les sections dynamiques immédiatement
        if (typeof window.reloadDynamicSections === 'function') {
            setTimeout(async () => {
                await window.reloadDynamicSections();
            }, 500);
        }
        
        // Rediriger ou recharger la page après un court délai
        setTimeout(() => {
            if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
                window.location.href = '/pages/acceuil.html';
            } else {
                window.location.reload();
            }
        }, 2000);
        
    } catch (error) {
        console.error('❌ Erreur complète lors de la connexion Google Firebase:', error);
        console.error('❌ Code d\'erreur:', error.code);
        console.error('❌ Message d\'erreur:', error.message);
        console.error('❌ Stack:', error.stack);
        
        // Messages d'erreur plus détaillés
        let errorMessage = error.message || 'Erreur lors de la connexion avec Google. Veuillez réessayer.';
        
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Connexion annulée. Veuillez réessayer.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'La popup a été bloquée. Veuillez autoriser les popups pour ce site dans les paramètres de votre navigateur.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Erreur de connexion réseau. Vérifiez votre connexion internet.';
        } else if (error.code === 'auth/unauthorized-domain') {
            const currentDomain = window.location.hostname;
            errorMessage = `Domaine non autorisé: ${currentDomain}. Veuillez ajouter ce domaine dans Firebase Console > Authentication > Settings > Authorized domains.`;
        } else if (error.code === 'auth/operation-not-allowed') {
            errorMessage = 'La connexion Google n\'est pas activée. Activez-la dans Firebase Console > Authentication > Sign-in method.';
        } else if (error.message && error.message.includes('Firebase auth n\'est pas initialisé')) {
            errorMessage = 'Erreur de configuration Firebase. Vérifiez que firebase-config.js est correctement configuré.';
        } else if (error.message) {
            errorMessage = 'Erreur : ' + error.message;
        }
        
        console.error('❌ Message d\'erreur affiché:', errorMessage);
        
        if (typeof showAuthErrorModal === 'function') {
            showAuthErrorModal(errorMessage);
        } else {
            alert(errorMessage);
        }
    } finally {
        // Réinitialiser le flag même en cas d'erreur
        isGoogleSignInInProgress = false;
    }
}

// Vérifier si l'utilisateur est connecté
function checkAuth() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user || !user.email) {
            return;
        }

        // Mettre à jour le lien du profil - garder juste "Profil"
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            const profileLink = navLinks.querySelector('a[href="profil.html"]');
            if (profileLink) {
                profileLink.textContent = 'Profil';
            }
        }
        
        // Afficher le bouton de déconnexion
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
        }
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
    }
}

// Gestionnaire de déconnexion
async function handleLogout() {
    try {
        // Déconnecter de Firebase si connecté
        try {
            const { authService } = await import('./firebase-service.js');
            await authService.signOut();
            console.log('✅ Déconnexion Firebase réussie');
        } catch (error) {
            console.warn('⚠️ Erreur lors de la déconnexion Firebase (peut être normal si pas connecté):', error);
        }
        
        // Nettoyer complètement localStorage
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('rememberMe'); // Important : supprimer aussi "rester connecté"
        console.log('✅ Toutes les données de session ont été supprimées');
        
        // Rediriger
        window.location.href = '/pages/acceuil.html';
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        // Nettoyer quand même localStorage complètement
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('rememberMe');
        window.location.href = '/pages/acceuil.html';
    }
}

// Initialisation des gestionnaires d'événements
document.addEventListener('DOMContentLoaded', function() {
        });
    
    
    // Vérifier et mettre à jour l'état de la session
    checkSession();


// Vérifier l'état de la session
function checkSession() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user && user.email) {
            // Mettre à jour l'interface utilisateur
            updateUI(user);
            
            // Afficher le bouton de déconnexion
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.style.display = 'block';
            }
            
            // Cacher le formulaire de connexion
            const loginForm = document.querySelector('.email-login');
            if (loginForm) {
                loginForm.style.display = 'none';
            }
            
            // Cacher le bouton Google
            const googleSignInDiv = document.getElementById('g_id_signin');
            if (googleSignInDiv) {
                googleSignInDiv.style.display = 'none';
            }
            
            // Cacher le lien "Créer un compte"
            const registerLink = document.querySelector('.register-link');
            if (registerLink) {
                registerLink.style.display = 'none';
            }
            
            // Afficher les sections du profil
            const profileSections = document.getElementById('profile-sections');
            if (profileSections) {
                profileSections.style.display = 'block';
            }
        } else {
            // Cacher le bouton de déconnexion
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
            }
            
            // Afficher le formulaire de connexion
            const loginForm = document.querySelector('.email-login');
            if (loginForm) {
                loginForm.style.display = 'block';
            }
            
            // Afficher le bouton Google
            const googleSignInDiv = document.getElementById('g_id_signin');
            if (googleSignInDiv) {
                googleSignInDiv.style.display = 'block';
            }
            
            // Afficher le lien "Créer un compte"
            const registerLink = document.querySelector('.register-link');
            if (registerLink) {
                registerLink.style.display = 'block';
            }
            
            // Cacher les sections du profil
            const profileSections = document.getElementById('profile-sections');
            if (profileSections) {
                profileSections.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Erreur lors de la vérification de la session:', error);
        // Nettoyer la session en cas d'erreur
        localStorage.removeItem('user');
    }
}

// Mettre à jour l'interface utilisateur
function updateUI(profile) {
    try {
        // Mettre à jour les informations de profil
        const userName = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');
        const googleBtn = document.getElementById('google-signin');
        const logoutBtn = document.getElementById('logout-btn');

        if (userName) {
            userName.textContent = profile.name || profile.email;
        }
        if (userAvatar) {
            userAvatar.src = profile.picture || 'https://via.placeholder.com/150';
        }

        // Afficher le bouton Google en mode connexion
        if (googleBtn) {
            googleBtn.style.display = 'block';
        }

        // Afficher le bouton de déconnexion
        if (logoutBtn) {
            logoutBtn.style.display = 'block';
        }

        // Mettre à jour le lien du profil - garder juste "Profil"
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            const profileLink = navLinks.querySelector('a[href="profil.html"]');
            if (profileLink) {
                profileLink.textContent = 'Profil';
            }
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'interface:', error);
    }
}

// Vérifier l'état d'authentification
function checkAuthStatus() {
    // Ici vous devriez vérifier si l'utilisateur est déjà connecté
    // Pour le moment, on simule une déconnexion
    const isLoggedIn = false;
    if (isLoggedIn) {
        updateUI({
            name: 'Utilisateur Test',
            email: 'test@example.com',
            picture: 'https://via.placeholder.com/150'
        });
    } else {
        handleEmailLogin();
    }
}

// Afficher les erreurs
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style = 'color: #ff4444; margin: 1rem 0; text-align: center;';
    document.querySelector('.auth-buttons').insertBefore(errorDiv, document.querySelector('.email-login'));
    
    // Supprimer l'erreur après 3 secondes
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Fonction pour l'inscription avec Google (avec complément d'informations)
async function handleFirebaseGoogleSignUp() {
    // Empêcher les doubles clics
    if (isGoogleSignInInProgress) {
        console.log('⚠️ Inscription Google déjà en cours...');
        return;
    }
    
    isGoogleSignInInProgress = true;
    console.log('🔥 Début de l\'inscription Google avec Firebase');
    
    try {
        // Vérifier que Firebase est bien configuré
        console.log('📦 Import du service Firebase...');
        const { authService } = await import('./firebase-service.js');
        console.log('✅ Service Firebase importé');
        
        // Vérifier que authService existe
        if (!authService) {
            throw new Error('authService non disponible');
        }
        
        console.log('🔐 Ouverture de la popup Google pour inscription...');
        // Se connecter avec Google via Firebase
        const result = await authService.signInWithGoogle();
        const user = result.user;
        
        console.log('✅ Connexion Google réussie:', user);
        
        // Vérifier si l'utilisateur existe déjà dans localStorage
        const existingAccounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        const existingAccount = existingAccounts.find(acc => acc.email === user.email);
        
        if (existingAccount) {
            // L'utilisateur existe déjà, juste se connecter
            console.log('✅ Compte existant, connexion directe');
            const userData = {
                name: existingAccount.username || user.displayName || user.email?.split('@')[0] || 'Utilisateur',
                username: existingAccount.username,
                email: user.email,
                picture: user.photoURL || 'https://via.placeholder.com/150',
                uid: user.uid,
                provider: 'google',
                langue: existingAccount.langue || 'fr',
                country: existingAccount.country || existingAccount.continent || 'fr'
            };
            
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('isLoggedIn', 'true');
            // Activer automatiquement "rester connecté" pour les connexions Google (utilisateur existant)
            localStorage.setItem('rememberMe', 'true');
            console.log('✅ Option "rester connecté" activée automatiquement pour la connexion Google');
            
            if (typeof closeAuthPopup === 'function') {
                closeAuthPopup();
            }
            
            if (typeof showAuthSuccessModal === 'function') {
                showAuthSuccessModal('Connexion réussie ! Bienvenue ' + userData.name + ' !');
            }
            
            // Recharger les sections dynamiques immédiatement
            if (typeof window.reloadDynamicSections === 'function') {
                setTimeout(async () => {
                    await window.reloadDynamicSections();
                }, 500);
            }
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            // Nouvel utilisateur, afficher le formulaire de complément
            console.log('📝 Nouvel utilisateur, affichage du formulaire de complément');
            showGoogleSignUpCompletionForm(user);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'inscription Google Firebase:', error);
        
        let errorMessage = 'Erreur lors de l\'inscription avec Google. Veuillez réessayer.';
        
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Inscription annulée. Veuillez réessayer.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'La popup a été bloquée. Veuillez autoriser les popups pour ce site.';
        } else if (error.message) {
            errorMessage = 'Erreur : ' + error.message;
        }
        
        if (typeof showAuthErrorModal === 'function') {
            showAuthErrorModal(errorMessage);
        } else {
            alert(errorMessage);
        }
    } finally {
        isGoogleSignInInProgress = false;
    }
}

// Fonction pour afficher le formulaire de complément d'informations après inscription Google
function showGoogleSignUpCompletionForm(googleUser) {
    // Fermer le popup d'authentification
    if (typeof closeAuthPopup === 'function') {
        closeAuthPopup();
    }
    
    // Créer un nouveau popup pour compléter les informations
    const overlay = document.createElement('div');
    overlay.id = 'google-signup-completion-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.95) 100%);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    `;
    
    const popup = document.createElement('div');
    popup.style.cssText = `
        background: linear-gradient(135deg, #0a0a0a, #1a1a1a, #2a2a2a);
        border-radius: 32px;
        box-shadow: 0 25px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(0, 196, 93, 0.2);
        padding: 3rem;
        text-align: center;
        max-width: 500px;
        width: 90vw;
        color: white;
        position: relative;
    `;
    
    popup.innerHTML = `
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #00c45d, #00e06d); border-radius: 50%; margin: 0 auto 1.5rem auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(0, 196, 93, 0.3);">
            <i class="fas fa-user-plus" style="font-size: 2rem; color: white;"></i>
        </div>
        
        <h2 style="color: #00c45d; margin-bottom: 1rem; font-size: 2rem; font-weight: 700;">Complétez votre profil</h2>
        <p style="color: #ccc; margin-bottom: 2rem; line-height: 1.6;">Quelques informations supplémentaires pour finaliser votre inscription</p>
        
        <form id="google-signup-completion-form">
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.8rem; color: #00e06d; font-weight: 700; text-align: left; font-size: 1.05rem;">Pseudo *</label>
                <input type="text" id="google-signup-pseudo" required 
                    value="${googleUser.displayName?.split(' ')[0] || googleUser.email?.split('@')[0] || ''}"
                    placeholder="Ex: mon-pseudo-123"
                    pattern="[a-zA-Z0-9_-]+"
                    title="Le pseudo ne peut contenir que des lettres, chiffres, tirets (-) et underscores (_). Les espaces sont interdits."
                    style="width: 100%; padding: 16px 20px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 16px; color: white; font-size: 16px; box-sizing: border-box;">
                <small id="google-signup-pseudo-error" style="display: none; color: #ff4444; margin-top: 0.5rem; text-align: left; font-size: 0.9rem;"></small>
                <small style="display: block; color: #999; margin-top: 0.5rem; text-align: left; font-size: 0.85rem;">
                    ⚠️ Le pseudo ne peut contenir que des lettres, chiffres, tirets (-) et underscores (_). Les espaces sont interdits.
                </small>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.8rem; color: #00e06d; font-weight: 700; text-align: left; font-size: 1.05rem;">Langue *</label>
                <select id="google-signup-langue" required style="width: 100%; padding: 16px 20px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 16px; color: white; font-size: 16px; box-sizing: border-box; cursor: pointer;">
                    <option value="fr" selected>🇫🇷 Français</option>
                    <option value="en">🇺🇸 English</option>
                    <option value="de">🇩🇪 Deutsch</option>
                    <option value="es">🇪🇸 Español</option>
                    <option value="it">🇮🇹 Italiano</option>
                    <option value="ja">🇯🇵 日本語</option>
                </select>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.8rem; color: #00e06d; font-weight: 700; text-align: left; font-size: 1.05rem;">Pays *</label>
                <select id="google-signup-country" required style="width: 100%; padding: 16px 20px; background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); border-radius: 16px; color: white; font-size: 16px; box-sizing: border-box; cursor: pointer;">
                    <option value="" disabled selected>Choisissez votre pays</option>
                </select>
            </div>
            
            <div style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 8px; text-align: left;">
                <input type="checkbox" id="google-signup-is-minor" style="width: 18px; height: 18px; cursor: pointer;">
                <label for="google-signup-is-minor" style="color: #ccc; cursor: pointer; font-size: 0.95rem;">
                    Je suis mineur (moins de 18 ans) - Les contenus à caractère sexuel seront masqués
                </label>
            </div>
            
            <div style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 8px; text-align: left;">
                <input type="checkbox" id="google-signup-terms" required style="width: 18px; height: 18px; cursor: pointer;">
                <label for="google-signup-terms" style="color: #ccc; cursor: pointer; font-size: 0.9rem;">
                    J'accepte les <a href="conditions-utilisation.html" target="_blank" style="color: #00e06d; text-decoration: none; font-weight: 600;">conditions d'utilisation</a> et la <a href="politique-confidentialite.html" target="_blank" style="color: #00e06d; text-decoration: none; font-weight: 600;">politique de confidentialité</a>
                </label>
            </div>
            
            <button type="submit" style="width: 100%; background: linear-gradient(135deg, #00c45d, #00e06d); color: white; border: none; padding: 1.2rem; border-radius: 16px; font-size: 1.1rem; font-weight: 600; cursor: pointer; box-shadow: 0 6px 20px rgba(0, 196, 93, 0.4); transition: all 0.3s ease;">
                Finaliser mon inscription
            </button>
        </form>
        
        <button onclick="closeGoogleSignUpCompletion()" style="position: absolute; top: 1.5rem; right: 1.5rem; background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #ccc; font-size: 1.5rem; cursor: pointer; padding: 0.5rem; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            ×
        </button>
    `;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Remplir le select pays depuis COUNTRY_LIST (localization.js)
    var countrySelect = document.getElementById('google-signup-country');
    if (countrySelect && window.COUNTRY_LIST) {
        var lang = (localStorage.getItem('mangaWatchLanguage') || 'fr').toLowerCase();
        window.COUNTRY_LIST.forEach(function(c) {
            countrySelect.appendChild(new Option(c[lang] || c.fr, c.code));
        });
        if (typeof window.attachCountrySearch === 'function') {
            window.attachCountrySearch('google-signup-country', countrySelect.parentNode);
        }
    }
    
    // Validation du pseudo en temps réel
    const pseudoInput = document.getElementById('google-signup-pseudo');
    const pseudoError = document.getElementById('google-signup-pseudo-error');
    
    if (pseudoInput) {
        pseudoInput.addEventListener('input', function() {
            const pseudo = this.value.trim();
            const errorElement = document.getElementById('google-signup-pseudo-error');
            
            // Vérifier les espaces
            if (pseudo.includes(' ')) {
                errorElement.textContent = '❌ Les espaces sont interdits. Utilisez des tirets (-) ou underscores (_) à la place.';
                errorElement.style.display = 'block';
                this.style.borderColor = '#ff4444';
                return;
            }
            
            // Vérifier les caractères autorisés (lettres, chiffres, tirets, underscores)
            const validPattern = /^[a-zA-Z0-9_-]+$/;
            if (pseudo && !validPattern.test(pseudo)) {
                errorElement.textContent = '❌ Caractères invalides. Utilisez uniquement des lettres, chiffres, tirets (-) et underscores (_).';
                errorElement.style.display = 'block';
                this.style.borderColor = '#ff4444';
                return;
            }
            
            // Vérifier si le pseudo est déjà pris
            const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
            const pseudoExists = accounts.some(acc => acc.username && acc.username.toLowerCase() === pseudo.toLowerCase());
            
            if (pseudoExists) {
                errorElement.textContent = '❌ Ce pseudo est déjà pris. Veuillez en choisir un autre.';
                errorElement.style.display = 'block';
                this.style.borderColor = '#ff4444';
                return;
            }
            
            // Tout est bon
            errorElement.style.display = 'none';
            this.style.borderColor = 'rgba(255,255,255,0.15)';
        });
    }
    
    // Gérer la soumission du formulaire
    const form = document.getElementById('google-signup-completion-form');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const pseudo = document.getElementById('google-signup-pseudo').value.trim();
        const langue = document.getElementById('google-signup-langue').value;
        const country = document.getElementById('google-signup-country').value;
        const isMinor = document.getElementById('google-signup-is-minor').checked;
        const termsAccepted = document.getElementById('google-signup-terms').checked;
        
        // Validation des champs obligatoires
        if (!pseudo || !langue || !country || !termsAccepted) {
            if (typeof showAuthErrorModal === 'function') {
                showAuthErrorModal('Veuillez remplir tous les champs obligatoires et accepter les conditions.');
            } else {
                alert('Veuillez remplir tous les champs obligatoires et accepter les conditions.');
            }
            return;
        }
        
        // Validation du pseudo (pas d'espaces, caractères valides)
        if (pseudo.includes(' ')) {
            if (typeof showAuthErrorModal === 'function') {
                showAuthErrorModal('❌ Les espaces sont interdits dans le pseudo. Utilisez des tirets (-) ou underscores (_) à la place.');
            } else {
                alert('❌ Les espaces sont interdits dans le pseudo. Utilisez des tirets (-) ou underscores (_) à la place.');
            }
            return;
        }
        
        const validPattern = /^[a-zA-Z0-9_-]+$/;
        if (!validPattern.test(pseudo)) {
            if (typeof showAuthErrorModal === 'function') {
                showAuthErrorModal('❌ Le pseudo contient des caractères invalides. Utilisez uniquement des lettres, chiffres, tirets (-) et underscores (_).');
            } else {
                alert('❌ Le pseudo contient des caractères invalides. Utilisez uniquement des lettres, chiffres, tirets (-) et underscores (_).');
            }
            return;
        }
        
        // Vérifier si le pseudo est déjà pris
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        const pseudoExists = accounts.some(acc => acc.username && acc.username.toLowerCase() === pseudo.toLowerCase());
        
        if (pseudoExists) {
            if (typeof showAuthErrorModal === 'function') {
                showAuthErrorModal('❌ Ce pseudo est déjà pris. Veuillez en choisir un autre.');
            } else {
                alert('❌ Ce pseudo est déjà pris. Veuillez en choisir un autre.');
            }
            return;
        }
        
        // Sauvegarder le compte (accounts est déjà déclaré plus haut)
        const newAccount = {
            username: pseudo,
            email: googleUser.email,
            password: 'google_oauth', // Pas de mot de passe pour les comptes Google
            langue: langue,
            country: country,
            isMinor: isMinor,
            provider: 'google',
            createdAt: new Date().toISOString()
        };
        
        accounts.push(newAccount);
        localStorage.setItem('accounts', JSON.stringify(accounts));
        
        // Synchroniser pseudo/pays/langue vers Firestore (disponibles sur tous les domaines)
        if (typeof window.profileAccountService !== 'undefined') {
            try {
                await window.profileAccountService.setProfileAccountInfo(googleUser.email, { username: pseudo, country: country, langue: langue });
            } catch (e) { console.warn('Firestore signup sync:', e); }
        }
        
        // Sauvegarder les informations utilisateur (username + name = pseudo affiché partout, évite écrasement par Google JWT)
        const userData = {
            name: pseudo,
            username: pseudo,
            email: googleUser.email,
            picture: googleUser.photoURL || 'https://via.placeholder.com/150',
            uid: googleUser.uid,
            provider: 'google',
            langue: langue,
            country: country,
            isMinor: isMinor
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isLoggedIn', 'true');
        // Activer automatiquement "rester connecté" pour les inscriptions Google
        localStorage.setItem('rememberMe', 'true');
        console.log('✅ Option "rester connecté" activée automatiquement pour l\'inscription Google');
        
        // Fermer le popup
        closeGoogleSignUpCompletion();
        
        // Afficher le message de succès
        if (typeof showAuthSuccessModal === 'function') {
            showAuthSuccessModal('Inscription réussie ! Bienvenue ' + pseudo + ' !');
        }
        
        // Recharger les sections dynamiques immédiatement
        if (typeof window.reloadDynamicSections === 'function') {
            setTimeout(async () => {
                await window.reloadDynamicSections();
            }, 500);
        }
        
        // Recharger la page
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    });
}

// Fonction pour fermer le popup de complément
function closeGoogleSignUpCompletion() {
    const overlay = document.getElementById('google-signup-completion-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Exporter les fonctions pour utilisation globale
if (typeof window !== 'undefined') {
    window.handleFirebaseGoogleSignIn = handleFirebaseGoogleSignIn;
    window.handleFirebaseGoogleSignUp = handleFirebaseGoogleSignUp;
    window.handleLogout = handleLogout;
    window.closeGoogleSignUpCompletion = closeGoogleSignUpCompletion;
}
