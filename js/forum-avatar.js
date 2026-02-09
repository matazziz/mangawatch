/**
 * Gestion de l'avatar utilisateur pour le forum
 * Ce script gère le chargement et l'affichage de l'avatar utilisateur
 * Version simplifiée avec gestion d'erreur améliorée
 */

// Éviter l'initialisation multiple
if (!window.avatarInitialized) {
    window.avatarInitialized = true;
    
    document.addEventListener('DOMContentLoaded', function() {
        // Configuration
        const DEBUG = false; // Activer/désactiver les logs de débogage
        
        /**
         * Log un message de débogage
         * @param {...any} args - Arguments à logger
         */
        function logDebug(...args) {
            if (DEBUG) {
                console.log('[Avatar]', ...args);
            }
        }
        
        /**
         * Log une erreur
         * @param {...any} args - Arguments à logger
         */
        function logError(...args) {
            console.error('[Avatar]', ...args);
        }
        
        /**
         * Définit l'avatar par défaut
         * @param {HTMLElement} imgElement - L'élément image de l'avatar
         */
        function setDefaultAvatar(imgElement) {
            if (!imgElement) return;
            
            logDebug('Définition de l\'avatar par défaut');
            
            // Éviter les boucles d'erreur
            imgElement.onerror = null;
            
            // Utiliser un SVG en ligne comme fallback ultime
            const fallbackSvg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjNGNhZjUwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRIOGE0IDQgMCAwIDAtNCA0djIiPjwvcGF0aD48Y2lyY2xlIGN4PSIxMiIgY3k9IjciIHI9IjQiPjwvY2lyY2xlPjwvc3ZnPg==';
            
            // Définir directement l'avatar par défaut
            imgElement.onload = function() {
                this.style.opacity = '1';
                this.style.visibility = 'visible';
                logDebug('Avatar par défaut chargé avec succès');
            };
            
            imgElement.onerror = function() {
                logError('Échec du chargement de l\'avatar par défaut, utilisation du fallback SVG');
                this.src = fallbackSvg;
                this.style.opacity = '1';
                this.style.visibility = 'visible';
            };
            
            // Essayer d'abord l'image par défaut locale
            try {
                // Chemin absolu vers l'avatar par défaut
                const defaultAvatarPath = '';
                imgElement.src = defaultAvatarPath;
            } catch (e) {
                // En cas d'erreur avec l'URL, utiliser directement le SVG
                logError('Erreur avec l\'URL de l\'avatar par défaut:', e);
                imgElement.src = fallbackSvg;
            }
        }
    
        /**
         * Vérifie si une URL d'image est valide
         * @param {string} url - L'URL à vérifier
         * @returns {Promise<boolean>} - True si l'image est valide, false sinon
         */
        async function isValidImageUrl(url) {
            if (!url) return false;
            
            // Vérifications basiques de l'URL
            if (typeof url !== 'string' || url.trim() === '') return false;
            
            // Vérifier les schémas autorisés (http, https, data)
            try {
                const urlObj = new URL(url);
                if (!['http:', 'https:', 'data:'].includes(urlObj.protocol)) {
                    logError('Protocole non autorisé:', urlObj.protocol);
                    return false;
                }
            } catch (e) {
                logError('URL invalide:', url, e);
                return false;
            }
            
            // Vérification asynchrone du chargement de l'image
            return new Promise((resolve) => {
                const img = new Image();
                let timer;
                
                const cleanup = () => {
                    clearTimeout(timer);
                    img.onload = null;
                    img.onerror = null;
                    img.src = '';
                };
                
                img.onload = () => {
                    cleanup();
                    // Vérifier que l'image a une taille valide
                    const isValid = img.width > 0 && img.height > 0;
                    logDebug('URL valide, dimensions:', { width: img.width, height: img.height });
                    resolve(isValid);
                };
                
                img.onerror = () => {
                    cleanup();
                    logDebug('Échec du chargement de l\'URL:', url);
                    resolve(false);
                };
                
                // Timeout pour éviter de bloquer trop longtemps
                timer = setTimeout(() => {
                    logDebug('Timeout de validation de l\'URL:', url);
                    cleanup();
                    resolve(false);
                }, 3000); // 3 secondes de timeout
                
                // Démarrer le chargement
                img.src = url;
            });
        }
        
        /**
         * Charge l'image de l'avatar avec gestion des erreurs
         * @param {HTMLElement} imgElement - L'élément image de l'avatar
         * @param {string} newSrc - L'URL de l'image
         */
        async function loadAvatar(imgElement, newSrc) {
            if (!imgElement) {
                logError('Élément image non trouvé');
                return;
            }
            
            // Vérifier si l'URL est valide
            if (!newSrc) {
                logDebug('Aucune URL fournie, utilisation de l\'avatar par défaut');
                setDefaultAvatar(imgElement);
                return;
            }
            
            // Vérifier si l'URL est valide et accessible
            const isValid = await isValidImageUrl(newSrc);
            
            if (!isValid) {
                logError('URL d\'avatar invalide ou inaccessible:', newSrc);
                setDefaultAvatar(imgElement);
                return;
            }
            
            // Configurer l'élément image
            imgElement.style.opacity = '0';
            imgElement.style.visibility = 'hidden';
            
            // Gestionnaire de succès
            imgElement.onload = function() {
                logDebug('Avatar chargé avec succès');
                this.style.opacity = '1';
                this.style.visibility = 'visible';
                this.onerror = null; // Supprimer le gestionnaire d'erreur
            };
            
            // Gestionnaire d'erreur (seulement une tentative)
            imgElement.onerror = function() {
                logError('Échec du chargement de l\'avatar, utilisation du fallback');
                setDefaultAvatar(this);
            };
            
            // Démarrer le chargement
            try {
                imgElement.src = newSrc;
            } catch (e) {
                logError('Erreur lors du chargement de l\'avatar:', e);
                setDefaultAvatar(imgElement);
            }
        };
        
        /**
         * Crée un avatar avec les initiales de l'utilisateur
         * @param {HTMLElement} imgElement - L'élément image de l'avatar
         * @param {Object} user - Les données de l'utilisateur
         */
        function createInitialsAvatar(imgElement, user) {
            if (!imgElement || !user) return;
            
            try {
                // Récupérer le nom d'affichage
                const displayName = (user.user_metadata && (user.user_metadata.name || user.user_metadata.full_name)) || 
                                  user.email?.split('@')[0] || 'U';
                
                // Créer un canvas pour générer l'avatar
                const canvas = document.createElement('canvas');
                const size = 200; // Taille de l'avatar
                canvas.width = size;
                canvas.height = size;
                
                const ctx = canvas.getContext('2d');
                
                // Couleur de fond basée sur le nom d'utilisateur
                const colors = [
                    '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', 
                    '#E91E63', '#00BCD4', '#673AB7', '#FF5722'
                ];
                
                const colorIndex = displayName
                    .split('')
                    .reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
                
                // Dessiner le fond
                ctx.fillStyle = colors[colorIndex];
                ctx.fillRect(0, 0, size, size);
                
                // Dessiner les initiales
                const initials = displayName
                    .split(' ')
                    .map(part => part[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
                
                // Style du texte
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `bold ${size * 0.4}px Arial, sans-serif`;
                
                // Dessiner le texte
                ctx.fillText(initials, size / 2, size / 2);
                
                // Convertir le canvas en URL de données
                const dataUrl = canvas.toDataURL();
                
                // Définir l'image
                imgElement.onload = function() {
                    this.style.opacity = '1';
                    this.style.visibility = 'visible';
                };
                
                imgElement.onerror = function() {
                    logError('Erreur lors du chargement de l\'avatar généré');
                    setDefaultAvatar(this);
                };
                
                imgElement.src = dataUrl;
                
            } catch (e) {
                logError('Erreur lors de la création de l\'avatar avec initiales:', e);
                setDefaultAvatar(imgElement);
            }
        }
        
        /**
         * Initialise l'avatar utilisateur
         */
        function initUserAvatar() {
            // Récupérer les éléments du DOM
            const userAvatar = document.getElementById('user-avatar');
            const logoutBtn = document.getElementById('logout-btn');
            
            if (!userAvatar) {
                logError('Élément user-avatar non trouvé dans le DOM');
                return;
            }
            
            // Masquer par défaut
            userAvatar.style.opacity = '0';
            userAvatar.style.visibility = 'hidden';
            
            // Vérifier si l'utilisateur est connecté
            let userData;
            try {
                userData = localStorage.getItem('user');
            } catch (e) {
                logError('Erreur lors de la lecture du localStorage:', e);
                setDefaultAvatar(userAvatar);
                return;
            }
            
            if (!userData) {
                logDebug('Aucun utilisateur connecté');
                if (logoutBtn) logoutBtn.style.display = 'none';
                userAvatar.style.display = 'none';
                return;
            }
            
            // Parser les données utilisateur
            let currentUser;
            try {
                currentUser = JSON.parse(userData);
            } catch (e) {
                logError('Erreur lors du parsing des données utilisateur:', e);
                setDefaultAvatar(userAvatar);
                return;
            }
            
            // Récupérer l'URL de l'avatar (plusieurs emplacements possibles)
            let avatarUrl = null;
            
            try {
                // Essayer différents chemins pour trouver l'avatar
                if (currentUser.user_metadata) {
                    avatarUrl = currentUser.user_metadata.avatar_url || 
                               currentUser.user_metadata.picture;
                }
                
                if (!avatarUrl && currentUser.identities?.[0]?.identity_data) {
                    avatarUrl = currentUser.identities[0].identity_data.avatar_url ||
                               currentUser.identities[0].identity_data.picture;
                }
                
                // Si on a une URL d'avatar, la charger
                if (avatarUrl) {
                    logDebug('Chargement de l\'avatar depuis:', avatarUrl);
                    loadAvatar(userAvatar, avatarUrl);
                } else {
                    // Sinon, créer un avatar avec les initiales
                    createInitialsAvatar(userAvatar, currentUser);
                }
                
                // Configurer le bouton de déconnexion
                if (logoutBtn) {
                    logoutBtn.style.display = 'block';
                    logoutBtn.onclick = function(e) {
                        e.preventDefault();
                        try {
                            localStorage.removeItem('user');
                            window.location.href = 'index.html';
                        } catch (e) {
                            logError('Erreur lors de la déconnexion:', e);
                        }
                    };
                }
                
            } catch (e) {
                logError('Erreur lors de la configuration de l\'avatar:', e);
                setDefaultAvatar(userAvatar);
            }
        }
        
        // Initialiser l'avatar au chargement de la page
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUserAvatar);
        } else {
            initUserAvatar();
        }
        
        // Gestion du formulaire de recherche
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const searchTerm = searchInput.value.trim();
                    if (searchTerm) {
                        window.location.href = 'recherche.html?q=' + encodeURIComponent(searchTerm);
                    }
                }
            });
        }
    });
}
