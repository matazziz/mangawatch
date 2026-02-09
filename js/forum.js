// ==========================================================================
// FORUM.JS - Gestion du forum communautaire
// ==========================================================================

// Import de Supabase
import { supabase } from './supabase.js';

// Fonction utilitaire pour échapper le HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Fonction utilitaire pour tronquer un texte
function truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Fonction utilitaire pour obtenir le libellé d'une catégorie
function getCategoryLabel(category) {
    const categories = {
        'general': 'Général',
        'question': 'Question',
        'discussion': 'Discussion',
        'aide': 'Aide',
        'autre': 'Autre'
    };
    return categories[category] || 'Général';
}

// Variable pour suivre si le forum a déjà été initialisé
let isInitialized = false;

// État global
const forumState = {
    currentUser: null,
    topics: [],
    loading: true,
    error: null
};

// Fonction utilitaire pour afficher des messages de débogage
function debugLog(message, data = null) {
    console.log(`[Forum] ${message}`, data || '');
}

// Fonction utilitaire pour afficher une notification
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Ajouter la notification au DOM
    document.body.appendChild(notification);
    
    // Supprimer la notification après 5 secondes
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Fonction pour afficher la modale de création de sujet
function showNewTopicModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Vérifier si l'utilisateur est connecté
    if (!forumState.currentUser) {
        debugLog('Utilisateur non connecté, affichage du message de connexion');
        showNotification('Veuillez vous connecter pour créer un sujet', 'error');
        
        // Rediriger vers la page de connexion après un court délai
        setTimeout(() => {
            window.location.href = 'profil.html?redirect=forum.html';
        }, 1500);
        return;
    }
    
    const modal = document.getElementById('newTopicModal');
    if (!modal) {
        debugLog('Modale de création de sujet non trouvée');
        showNotification('Erreur: Impossible d\'ouvrir l\'éditeur de sujet', 'error');
        return;
    }
    
    // Réinitialiser le formulaire
    const form = document.getElementById('newTopicForm');
    if (form) form.reset();
    
    // Afficher la modale avec une animation
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Ajouter la classe d'animation après un court délai pour déclencher la transition
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Donner le focus au premier champ
    const firstInput = modal.querySelector('input, textarea');
    if (firstInput) {
        firstInput.focus();
    }
}

// Fonction pour masquer la modale de création de sujet
function hideNewTopicModal() {
    const modal = document.getElementById('newTopicModal');
    if (modal) {
        // Supprimer la classe d'animation
        modal.classList.remove('show');
        
        // Masquer la modale après la fin de l'animation
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 200);
    }
}

// Fonction pour vérifier la connexion à Supabase
async function checkSupabaseConnection() {
    try {
        console.log('[Supabase] Vérification de la connexion...');
        
        // Vérifier d'abord si le client Supabase est correctement initialisé
        if (!supabase) {
            console.error('[Supabase] Erreur: Le client Supabase n\'est pas initialisé');
            return false;
        }
        
        // Vérifier si nous sommes en ligne
        if (!navigator.onLine) {
            console.warn('[Supabase] Mode hors ligne détecté');
            return false;
        }
        
        // Tester une requête simple avec un timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 secondes
        
        try {
            const { data, error, status, statusText } = await supabase
                .from('forum_topics')
                .select('id')
                .limit(1);
                
            clearTimeout(timeoutId);
                
            if (error) {
                console.error('[Supabase] Erreur de requête:', { 
                    message: error.message, 
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    status,
                    statusText
                });
                
                // Si l'erreur est liée à une table inexistante, on peut quand même continuer
                // car la table sera créée lors de la première insertion
                if (error.code === '42P01') { // Table does not exist
                    console.warn('[Supabase] La table forum_topics n\'existe pas encore. Elle sera créée lors de la première insertion.');
                    return true;
                }
                
                return false;
            }
            
            console.log('[Supabase] Connexion réussie');
            return true;
            
        } catch (requestError) {
            clearTimeout(timeoutId);
            
            if (requestError.name === 'AbortError') {
                console.error('[Supabase] La requête a expiré (timeout)');
            } else {
                console.error('[Supabase] Erreur lors de la requête de test:', requestError);
            }
            return false;
        }
        
    } catch (e) {
        console.error('[Supabase] Erreur de connexion inattendue:', {
            message: e.message,
            name: e.name,
            stack: e.stack
        });
        return false;
    }
}

// Fonction pour charger les sujets depuis Supabase avec fallback au localStorage
async function loadTopics() {
    const topicsList = document.getElementById('topicsList');
    if (!topicsList) return;
    
    // Afficher un indicateur de chargement
    topicsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Chargement des sujets...</div>';
    
    try {
        // Vérifier la connexion Supabase
        const isSupabaseConnected = await checkSupabaseConnection();
        
        if (!isSupabaseConnected) {
            console.warn('Connexion à Supabase échouée, utilisation du mode hors ligne');
            loadTopicsFromLocalStorage();
            return;
        }
        
        console.log('[Forum] Tentative de chargement des sujets depuis Supabase...');
        
        // Récupérer l'utilisateur actuel pour les avatars
        const userData = localStorage.getItem('user');
        const currentUser = userData ? JSON.parse(userData) : null;
        
        // Charger les sujets depuis Supabase avec gestion d'erreur améliorée
        let topics = [];
        let error = null;
        
        try {
            // Essayer d'abord sans jointure pour éviter les erreurs de relation
            console.log('[Forum] Chargement des sujets sans jointure...');
            
            const simpleResult = await supabase
                .from('forum_topics')
                .select('*')
                .order('created_at', { ascending: false });
                
            topics = simpleResult.data || [];
            error = simpleResult.error;
            
            // Si la table n'existe pas encore, retourner un tableau vide
            if (error?.code === '42P01') { // Table does not exist
                console.warn('[Forum] La table forum_topics n\'existe pas encore. Elle sera créée lors de la première insertion.');
                renderTopics([]);
                return;
            }
            
            // Si la table n'existe pas encore, retourner un tableau vide
            if (error?.code === '42P01') { // Table does not exist
                console.warn('[Forum] La table forum_topics n\'existe pas encore. Elle sera créée lors de la première insertion.');
                renderTopics([]);
                return;
            }
            
            if (error) {
                console.error('[Forum] Erreur lors du chargement des sujets:', error);
                throw error;
            }
        } catch (e) {
            console.error('[Forum] Erreur inattendue lors du chargement des sujets:', e);
            error = e;
        }
        
        console.log(`[Forum] ${topics?.length || 0} sujets chargés`);
        
        // Formater les données pour l'affichage
        const formattedTopics = (topics || []).map((topic) => {
            // Gérer la catégorie (avec une valeur par défaut si elle n'existe pas)
            const category = topic.category || 'general';
            const categoryNames = {
                'news': 'Actualités',
                'manga': 'Mangas',
                'anime': 'Animes',
                'debate': 'Débats',
                'help': 'Aide',
                'general': 'Général'
            };
            
            // Récupérer les informations d'auteur depuis la jointure ou le localStorage
            let authorName = 'Utilisateur Anonyme';
            let authorAvatar = 'https://ui-avatars.com/api/?name=UA&background=4CAF50&color=fff';
            
            // Utiliser les informations de la jointure si disponibles
            if (topic.profiles) {
                authorName = topic.profiles.username || authorName;
                authorAvatar = topic.profiles.avatar_url || authorAvatar;
            } else {
                // Fallback au localStorage si la jointure échoue
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith('topic_author_')) {
                        try {
                            const authorInfo = JSON.parse(localStorage.getItem(key));
                            if (authorInfo && authorInfo.userName) {
                                authorName = authorInfo.userName;
                                authorAvatar = authorInfo.userAvatar || authorAvatar;
                                break;
                            }
                        } catch (e) {
                            console.warn('Erreur lors de la lecture des informations d\'auteur:', e);
                        }
                    }
                }
            }
            
            // Créer un objet avec les champs de base
            const formattedTopic = {
                id: topic.id || `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                title: topic.title || 'Sans titre',
                content: topic.content || '',
                category: category,
                categoryName: categoryNames[category] || 'Général',
                created_at: topic.created_at || new Date().toISOString(),
                updated_at: topic.updated_at || new Date().toISOString(),
                author_name: authorName,
                author_avatar: authorAvatar,
                views: topic.views || 0,
                replies_count: topic.replies_count || 0,
                // Ajouter des champs supplémentaires avec des valeurs par défaut
                is_pinned: topic.is_pinned || false,
                is_locked: topic.is_locked || false,
                // Ajouter les informations de l'utilisateur si disponibles
                user_id: topic.user_id || null,
                // Ajouter les données brutes pour le débogage
                _raw: topic
            };
            
            return formattedTopic;
        });
        
        // Sauvegarder localement pour le mode hors ligne
        localStorage.setItem('forumTopics', JSON.stringify(formattedTopics));
        
        // Afficher les sujets
        renderTopics(formattedTopics);
        
    } catch (error) {
        console.error('Erreur lors du chargement des sujets:', error);
        showNotification('Erreur lors du chargement des sujets. Utilisation du cache local.', 'error');
        loadTopicsFromLocalStorage();
    }
}

// Fonction pour charger les sujets depuis le localStorage
function loadTopicsFromLocalStorage() {
    const topicsList = document.getElementById('topicsList');
    if (!topicsList) return;
    
    try {
        const savedTopics = JSON.parse(localStorage.getItem('forumTopics')) || [];
        
        if (savedTopics.length > 0) {
            showNotification('Mode hors ligne : affichage des sujets en cache', 'warning');
            renderTopics(savedTopics);
        } else {
            topicsList.innerHTML = `
                <div class="no-topics">
                    <p>Aucun sujet trouvé. Essayez de rafraîchir la page ou de vérifier votre connexion Internet.</p>
                    <button id="retryLoadTopics" class="btn btn-primary">
                        <i class="fas fa-sync-alt"></i> Réessayer
                    </button>
                </div>
            `;
            
            // Ajouter un gestionnaire d'événements pour le bouton de réessai
            const retryButton = document.getElementById('retryLoadTopics');
            if (retryButton) {
                retryButton.addEventListener('click', loadTopics);
            }
        }
    } catch (error) {
        console.error('Erreur avec le chargement local:', error);
        topicsList.innerHTML = `
            <div class="error-message">
                <p>Impossible de charger les sujets. Veuillez vérifier votre connexion Internet et réessayer.</p>
                <button id="retryLoadTopics" class="btn btn-primary">
                    <i class="fas fa-sync-alt"></i> Réessayer
                </button>
            </div>
        `;
        
        // Ajouter un gestionnaire d'événements pour le bouton de réessai
        const retryButton = document.getElementById('retryLoadTopics');
        if (retryButton) {
            retryButton.addEventListener('click', loadTopics);
        }
    }
}

// Fonction pour afficher les sujets
function renderTopics(topics) {
    const topicsList = document.getElementById('topicsList');
    if (!topicsList) return;
    
    if (!topics || topics.length === 0) {
        topicsList.innerHTML = `
            <div class="no-topics">
                <i class="far fa-comment-dots"></i>
                <p>Aucun sujet n'a été trouvé.</p>
                <button id="createFirstTopic" class="btn btn-primary" style="cursor: pointer;">
                    <i class="fas fa-plus"></i> Créer le premier sujet
                </button>
            </div>
        `;
        
        return;
    }
    
    // Trier les sujets par date de création (du plus récent au plus ancien)
    const sortedTopics = [...topics].sort((a, b) => 
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
    
    const currentUserId = forumState.currentUser?.id;
    
    // Formater les données pour l'affichage
    const formattedTopics = sortedTopics.map(topic => {
        try {
            // Récupérer le titre (champ obligatoire)
            const title = topic.title || 'Sans titre';
            
            // Récupérer le contenu si disponible
            const content = topic.content || '';
            
            // Valeurs par défaut pour les champs optionnels
            const authorName = 'Utilisateur Anonyme';
            const authorAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName.substring(0, 2))}&background=4CAF50&color=fff`;
            
            // Catégorie par défaut
            const category = 'general';
            
            // Retourner l'objet formaté avec des valeurs par défaut pour tous les champs nécessaires
            return {
                id: topic.id || Date.now().toString(),
                title: title,
                content: content,
                author_name: authorName,
                author_avatar: authorAvatar,
                category: category,
                created_at: topic.created_at || new Date().toISOString(),
                views: 0,
                replies_count: 0
            };
        } catch (error) {
            console.error('Erreur lors du formatage du sujet:', error, topic);
            return null;
        }
        const categoryNames = {
            'news': 'Actualités',
            'manga': 'Mangas',
            'anime': 'Animes',
            'debate': 'Débats',
            'help': 'Aide',
            'general': 'Général'
        };
        
        // Déterminer l'ID de l'auteur pour vérifier les permissions
        const authorId = topic.author_id || topic.user_id?.id || topic.user_id;
        
        return {
            id: topic.id || Date.now().toString(),
            title: topic.title || 'Sans titre',
            content: topic.content || '',
            category: category,
            categoryName: categoryNames[category] || 'Général',
            created_at: topic.created_at || new Date().toISOString(),
            author_name: authorName,
            author_avatar: authorAvatar,
            author_id: authorId,
            views: topic.views || 0,
            replies_count: topic.replies_count || 0,
            updated_at: topic.updated_at || topic.created_at
        };
    });
    
    // Générer le HTML pour chaque sujet
    const topicsHtml = formattedTopics.map(topic => {
        const isAuthor = currentUserId && topic.author_id === currentUserId;
        const isAdmin = forumState.currentUser?.role === 'admin';
        const canDelete = isAuthor || isAdmin;
        
        return `
            <div class="topic-card" data-id="${topic.id}">
                <div class="topic-header">
                    <h3 class="topic-title">${escapeHtml(topic.title)}</h3>
                    <span class="topic-category">${topic.categoryName}</span>
                </div>
                <div class="topic-content">
                    <h3 class="topic-title">
                        <a href="topic.html?id=${topic.id}">${escapeHtml(topic.title)}</a>
                    </h3>
                    <p class="topic-excerpt">${truncate(escapeHtml(topic.content), 150)}</p>
                </div>
                <div class="topic-content">
                    <p>${escapeHtml(topic.content.substring(0, 200))}${topic.content.length > 200 ? '...' : ''}</p>
                </div>
                <div class="topic-meta">
                    <div class="topic-author">
                        <img src="${topic.author_avatar}" alt="${escapeHtml(topic.author_name)}" class="topic-avatar" onerror="this.src='https://ui-avatars.com/api/?name=U&background=4CAF50&color=fff'">
                        <span>${escapeHtml(topic.author_name)}</span>
                    </div>
                    <div class="topic-stats">
                        <span class="topic-stat">
                            <i class="far fa-eye"></i> ${topic.views}
                        </span>
                        <span class="topic-stat">
                            <i class="far fa-comment"></i> ${topic.replies_count}
                        </span>
                        <span class="topic-stat">
                            <i class="far fa-clock"></i> ${new Date(topic.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    topicsList.innerHTML = topicsHtml;
    
    // Ajouter les gestionnaires d'événements pour la navigation vers les sujets
    document.querySelectorAll('.topic-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Ne pas naviguer si l'utilisateur a cliqué sur un bouton de suppression
            if (e.target.closest('.btn-delete-topic')) {
                return;
            }
            
            // Ne pas naviguer si l'utilisateur a cliqué sur un bouton ou un lien
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button, a')) {
                return;
            }
            
            const topicId = card.dataset.id;
            window.location.href = `topic.html?id=${topicId}`;
        });
    });
    
    // Ajouter les gestionnaires d'événements pour les boutons de suppression
    document.querySelectorAll('.btn-delete-topic').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const topicId = button.dataset.id;
            if (!topicId) return;
            
            // Demander confirmation avant suppression
            if (confirm('Êtes-vous sûr de vouloir supprimer ce sujet ? Cette action est irréversible.')) {
                try {
                    const { error } = await supabase
                        .from('topics')
                        .delete()
                        .eq('id', topicId);
                    
                    if (error) throw error;
                    
                    // Recharger la liste des sujets
                    await loadTopics();
                    showNotification('Sujet supprimé avec succès', 'success');
                } catch (error) {
                    console.error('Erreur lors de la suppression du sujet:', error);
                    showNotification('Erreur lors de la suppression du sujet', 'error');
                }
            }
        });
    });
}

// Fonction d'initialisation du forum
function initForum() {
    // Éviter l'initialisation multiple
    if (isInitialized) {
        debugLog('Le forum est déjà initialisé');
        return;
    }
    
    isInitialized = true;
    debugLog('Initialisation du forum...');
    
    // Mettre à jour l'utilisateur actuel à partir du localStorage
    try {
        const userData = localStorage.getItem('user');
        forumState.currentUser = userData ? JSON.parse(userData) : null;
        debugLog('Utilisateur chargé:', forumState.currentUser);
    } catch (e) {
        console.error('Erreur lors du chargement des données utilisateur:', e);
        forumState.currentUser = null;
    }
    
    // Initialiser les éléments du DOM
    const elements = {
        searchInput: document.getElementById('searchInput'),
        sortSelect: document.getElementById('sortSelect'),
        topicsList: document.getElementById('topicsList'),
        newTopicBtn: document.getElementById('newTopicBtn'),
        closeModalBtn: document.querySelector('.close-modal'),
        newTopicForm: document.getElementById('newTopicForm'),
        cancelBtn: document.getElementById('cancelTopic')
    };
    
    // Vérifier que les éléments nécessaires existent
    if (!elements.topicsList) {
        debugLog('Élément topicsList non trouvé, arrêt de l\'initialisation');
        return;
    }
    
    // Configurer les écouteurs d'événements
    if (elements.newTopicBtn) {
        elements.newTopicBtn.addEventListener('click', showNewTopicModal);
    }
    
    // Gestionnaire pour le bouton "Créer le premier sujet"
    const createFirstTopicBtn = document.getElementById('createFirstTopic');
    if (createFirstTopicBtn) {
        createFirstTopicBtn.addEventListener('click', showNewTopicModal);
    }
    
    // Fermer la modale
    if (elements.closeModalBtn) {
        elements.closeModalBtn.addEventListener('click', hideNewTopicModal);
    }
    
    // Bouton d'annulation dans la modale
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', hideNewTopicModal);
    }
    
    // Gérer la soumission du formulaire
    if (elements.newTopicForm) {
        elements.newTopicForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('topicTitle')?.value.trim();
            const content = document.getElementById('topicContent')?.value.trim();
            const category = document.getElementById('topicCategory')?.value || 'general';
            
            if (!title || !content) {
                showNotification('Veuillez remplir tous les champs', 'error');
                return;
            }
            
            // Afficher un indicateur de chargement
            const submitButton = elements.newTopicForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton?.textContent;
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication...';
            }
            
            try {
                // Vérifier d'abord la connexion à Supabase
                console.log('[Forum] Vérification de la connexion à Supabase...');
                const isSupabaseConnected = await checkSupabaseConnection();
                console.log('[Forum] Connexion à Supabase:', isSupabaseConnected ? 'OK' : 'Échec');
                
                if (isSupabaseConnected) {
                    console.log('[Forum] Tentative de création d\'un nouveau sujet...');
                    
                    // Récupérer les valeurs du formulaire
                    const title = document.getElementById('topicTitle')?.value.trim();
                    const content = document.getElementById('topicContent')?.value.trim();
                    const category = document.getElementById('topicCategory')?.value || 'general';
                    
                    console.log('[Forum] Données du formulaire:', { title, content, category });
                    
                    // Récupérer l'utilisateur actuel
                    const user = forumState.currentUser || {};
                    console.log('[Forum] Préparation de l\'insertion dans la base de données...');
                    console.log('[Forum] Utilisateur actuel:', user);
                    
                    // Récupérer l'utilisateur actuel depuis le localStorage
                    const userData = localStorage.getItem('user');
                    const currentUser = userData ? JSON.parse(userData) : null;
                    
                    if (!currentUser) {
                        throw new Error('Vous devez être connecté pour créer un sujet');
                    }
                    
                    // Créer un objet avec uniquement le titre (champ minimal requis)
                    const topicData = {
                        title: title
                    };
                    
                    // Ajouter le contenu uniquement si la colonne existe
                    if (content) {
                        topicData.content = content;
                    }
                    
                    // Ajouter l'ID utilisateur si la colonne existe
                    if (currentUser && currentUser.id) {
                        topicData.user_id = currentUser.id;
                    }
                    
                    // Ajouter la date de création si la colonne existe
                    topicData.created_at = new Date().toISOString();
                    
                    // Nettoyer l'objet pour supprimer les champs undefined
                    Object.keys(topicData).forEach(key => topicData[key] === undefined && delete topicData[key]);
                    
                    console.log('[Forum] Données à envoyer à Supabase:', topicData);
                    
                    // Stocker les informations d'auteur dans le localStorage pour l'affichage
                    const topicAuthorInfo = {
                        userId: currentUser.id,
                        userName: currentUser.name || currentUser.email || 'Utilisateur Anonyme',
                        userAvatar: currentUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent((currentUser.name || currentUser.email || 'UA').substring(0, 2))}&background=4CAF50&color=fff`
                    };
                    localStorage.setItem(`topic_author_${Date.now()}`, JSON.stringify(topicAuthorInfo));
                    
                    // Insérer le sujet dans la base de données avec gestion d'erreur améliorée
                    let newTopic, error;
                    try {
                        // Essayer d'abord avec une insertion standard
                        const result = await supabase
                            .from('forum_topics')
                            .insert([topicData])
                            .select('*');
                            
                        newTopic = result.data?.[0];
                        error = result.error;
                        
                        // Si l'erreur est due à une colonne manquante, essayer de la créer dynamiquement
                        if (error?.code === '42703' || error?.code === '42P01') {
                            console.warn('[Forum] Erreur de colonne manquante, tentative de création dynamique...');
                            
                            // Créer d'abord la colonne si elle n'existe pas
                            const columnName = error.message.match(/column \"(.*?)\"/)?.[1];
                            if (columnName) {
                                console.log(`[Forum] Tentative de création de la colonne: ${columnName}`);
                                // En production, vous devriez utiliser des migrations pour cela
                                // Ici, on va simplement essayer d'insérer à nouveau avec les champs existants
                                delete topicData[columnName];
                                
                                const retryResult = await supabase
                                    .from('forum_topics')
                                    .insert([topicData])
                                    .select('*');
                                    
                                newTopic = retryResult.data?.[0];
                                error = retryResult.error;
                            }
                        }
                    } catch (e) {
                        console.error('[Forum] Erreur inattendue lors de la création du sujet:', e);
                        error = e;
                    }
                    
                    if (error) {
                        console.error('[Forum] Erreur lors de la création du sujet:', error);
                        
                        // Si la table n'existe pas, on essaie de la créer avec la première insertion
                        if (error.code === '42P01') { // Table does not exist
                            console.warn('[Forum] La table forum_topics n\'existe pas. Tentative de création...');
                            
                            // Créer la table avec une première insertion
                            const { data: createdTopic, error: createError } = await supabase
                                .from('forum_topics')
                                .insert([topicData])
                                .select('*');
                            
                            if (createError) {
                                console.error('[Forum] Échec de la création de la table forum_topics:', createError);
                                throw new Error('Impossible de créer la table des sujets. Veuillez réessayer plus tard.');
                            }
                            
                            console.log('[Forum] Table forum_topics créée avec succès');
                            return createdTopic[0];
                        }
                        
                        throw error;
                    }
                    
                    console.log('[Forum] Sujet créé avec succès:', newTopic);
                    
                    // Mettre à jour l'affichage
                    await loadTopics();
                    
                    // Fermer la modale et réinitialiser le formulaire
                    hideNewTopicModal();
                    if (elements.newTopicForm) elements.newTopicForm.reset();
                    
                    showNotification('Sujet créé avec succès !', 'success');
                    return;
                }
                
                // Si nous sommes ici, c'est que la connexion à Supabase a échoué
                throw new Error('Impossible de se connecter au serveur');
                
            } catch (error) {
                console.error('Erreur lors de la création du sujet:', error);
                
                // En cas d'erreur, sauvegarder localement
                try {
                    const savedTopics = JSON.parse(localStorage.getItem('forumTopics') || '[]');
                    const localTopic = {
                        id: 'local-' + Date.now().toString(),
                        title,
                        content,
                        category: category || 'general',
                        author_id: forumState.currentUser?.id || 'anonymous',
                        author_name: forumState.currentUser?.name || 'Utilisateur Anonyme',
                        created_at: new Date().toISOString(),
                        replies_count: 0,
                        views: 0,
                        local: true // Marquer comme sujet local
                    };
                    
                    savedTopics.unshift(localTopic);
                    localStorage.setItem('forumTopics', JSON.stringify(savedTopics));
                    
                    // Mettre à jour l'affichage avec les sujets locaux
                    loadTopicsFromLocalStorage();
                    
                    hideNewTopicModal();
                    if (elements.newTopicForm) elements.newTopicForm.reset();
                    
                    showNotification('Sujet enregistré localement (hors ligne)', 'warning');
                } catch (localError) {
                    console.error('Erreur avec le stockage local:', localError);
                    showNotification('Erreur lors de la sauvegarde locale du sujet', 'error');
                }
            } finally {
                // Réactiver le bouton de soumission
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
            }
        });
    }
    
    // Fermer la modale en cliquant en dehors
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('newTopicModal');
        if (e.target === modal) {
            hideNewTopicModal();
        }
    });
    
    // Gérer la touche Échap pour fermer la modale
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('newTopicModal');
            if (modal && modal.style.display === 'block') {
                hideNewTopicModal();
            }
        }
    });
    
    // Charger les sujets
    loadTopics();
    
    debugLog('Forum initialisé avec succès');
}

// Fonction pour attacher les gestionnaires d'événements
function attachEventHandlers() {
    // Gestionnaire pour le bouton "Nouveau sujet"
    const newTopicBtn = document.getElementById('newTopicBtn');
    if (newTopicBtn) {
        newTopicBtn.addEventListener('click', showNewTopicModal);
    }
    
    // Utiliser la délégation d'événements au niveau du document pour gérer les clics
    // sur le bouton "Créer le premier sujet" qui peut être recréé dynamiquement
    document.addEventListener('click', (event) => {
        if (event.target.closest('#createFirstTopic')) {
            event.preventDefault();
            showNewTopicModal(event);
        }
    });
    
    debugLog('Gestionnaires d\'événements attachés');
}

// Ne pas initialiser automatiquement si c'est un module ES
// L'initialisation est gérée par le module dans forum.html
if (!window.isModule && !window.forumInitialized) {
    const init = () => {
        if (!window.forumInitialized) {
            window.forumInitialized = true;
            initForum();
            attachEventHandlers();
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}

// Formater la date en "il y a..."
function getTimeAgo(dateString) {
    if (!dateString) return 'à l\'instant';
    
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
        'année': 31536000,
        'mois': 2592000,
        'semaine': 604800,
        'jour': 86400,
        'heure': 3600,
        'minute': 60,
        'seconde': 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `il y a ${interval} ${unit}${interval > 1 ? 's' : ''}`;
        }
    }
    
    return 'à l\'instant';
}

// Filtrer les sujets
function filterTopics() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const topicsList = document.getElementById('topicsList');
    const topics = topicsList.querySelectorAll('.topic-card');
    
    topics.forEach(topic => {
        const title = topic.querySelector('.topic-title')?.textContent.toLowerCase() || '';
        const content = topic.querySelector('.topic-excerpt')?.textContent.toLowerCase() || '';
        const author = topic.querySelector('.topic-author')?.textContent.toLowerCase() || '';
        
        if (title.includes(searchTerm) || content.includes(searchTerm) || author.includes(searchTerm)) {
            topic.style.display = '';
        } else {
            topic.style.display = 'none';
        }
    });
}

// Trier les sujets
function sortTopics() {
    const sortSelect = document.getElementById('sortSelect');
    if (!sortSelect) return;
    
    const sortBy = sortSelect.value;
    const topicsList = document.getElementById('topicsList');
    if (!topicsList) return;
    
    const topics = Array.from(topicsList.querySelectorAll('.topic-card'));
    
    topics.sort((a, b) => {
        const aTitle = a.querySelector('.topic-title')?.textContent || '';
        const bTitle = b.querySelector('.topic-title')?.textContent || '';
        const aDate = a.querySelector('.topic-date')?.dataset.timestamp || 0;
        const bDate = b.querySelector('.topic-date')?.dataset.timestamp || 0;
        const aReplies = parseInt(a.querySelector('.topic-replies')?.textContent) || 0;
        const bReplies = parseInt(b.querySelector('.topic-replies')?.textContent) || 0;
        
        switch (sortBy) {
            case 'recent':
                return new Date(bDate) - new Date(aDate);
            case 'title':
                return aTitle.localeCompare(bTitle);
            case 'replies':
                return bReplies - aReplies;
            default:
                return 0;
        }
    });
    
    // Réorganiser les sujets dans le DOM
    topics.forEach(topic => topicsList.appendChild(topic));
}

// Mettre à jour l'interface utilisateur avec les informations de l'utilisateur
function updateUserUI() {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const newTopicBtn = document.getElementById('newTopicBtn');
    
    if (forumState.currentUser) {
        // Mettre à jour l'avatar et le nom d'utilisateur
        if (userAvatar) {
            userAvatar.src = forumState.currentUser.avatar || 'https://ui-avatars.com/api/?name=U&background=00b894&color=fff';
            userAvatar.alt = forumState.currentUser.name || 'Utilisateur';
            userAvatar.style.display = 'block';
        }
        
        if (userName) {
            userName.textContent = forumState.currentUser.name || 'Utilisateur';
            userName.style.display = 'inline';
        }
        
        // Afficher le bouton de déconnexion et masquer le bouton de connexion
        if (loginButton) loginButton.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'block';
        if (newTopicBtn) newTopicBtn.style.display = 'block';
    } else {
        // Réinitialiser l'interface utilisateur pour un utilisateur non connecté
        if (userAvatar) userAvatar.style.display = 'none';
        if (userName) userName.style.display = 'none';
        if (loginButton) loginButton.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'none';
        if (newTopicBtn) newTopicBtn.style.display = 'none';
    }
}

// Initialiser le forum une fois le DOM chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForum);
} else {
    // Si le DOM est déjà chargé, initialiser immédiatement
    initForum();
}

// Exporter uniquement les fonctions nécessaires
export { initForum, attachEventHandlers };

// Exposer la fonction initForum globalement pour la rétrocompatibilité
// Note: À supprimer une fois que tout le code utilise les imports ES6
if (typeof window !== 'undefined') {
    window.initForum = initForum;
}
