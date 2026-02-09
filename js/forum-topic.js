// ==========================================================================
// FORUM-TOPIC.JS - Gestion de la page de détail d'un sujet du forum
// ==========================================================================

// Importer les services Supabase
import { forumService, authService } from './supabase.js';

// Vérifier que Supabase est correctement initialisé
if (!window.supabase) {
    console.error('Supabase n\'est pas correctement initialisé');
}

// État global
const state = {
    currentUser: null,
    topic: null,
    replies: [],
    loading: true,
    error: null
};

// Éléments du DOM
const elements = {
    loadingIndicator: document.getElementById('loadingIndicator'),
    errorMessage: document.getElementById('errorMessage'),
    topicHeader: document.getElementById('topicHeader'),
    topicTitle: document.getElementById('topicTitle'),
    topicAuthor: document.getElementById('topicAuthor'),
    topicAuthorAvatar: document.getElementById('topicAuthorAvatar'),
    authorName: document.getElementById('authorName'),
    topicDate: document.getElementById('topicDate'),
    topicCategory: document.getElementById('topicCategory'),
    topicContent: document.getElementById('topicContent'),
    repliesSection: document.getElementById('repliesSection'),
    repliesList: document.getElementById('repliesList'),
    repliesCount: document.getElementById('repliesCount'),
    replyForm: document.getElementById('replyForm'),
    replyContent: document.getElementById('replyContent'),
    replyFormContainer: document.getElementById('replyFormContainer'),
    loginButton: document.getElementById('login-button'),
    userMenu: document.getElementById('user-menu'),
    userAvatar: document.getElementById('user-avatar'),
    usernameDisplay: document.getElementById('username-display'),
    logoutButton: document.getElementById('logout-btn')
};

/**
 * Initialise l'authentification et configure les écouteurs d'événements
 */
async function initAuth() {
    try {
        const { data: { user }, error } = await authService.getCurrentUser();
        
        if (error) {
            console.error('Erreur lors de la récupération de l\'utilisateur:', error);
            return null;
        }
        
        if (user) {
            state.currentUser = {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.full_name || user.email,
                avatar: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((user.user_metadata?.full_name || user.email || 'U').substring(0, 2))}&background=4CAF50&color=fff`
            };
            updateUserUI();
        }
        
        // Configurer les écouteurs d'événements
        setupEventListeners();
        
        return user;
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'authentification:', error);
        return null;
    }
}

/**
 * Configure les écouteurs d'événements
 */
function setupEventListeners() {
    // Bouton de déconnexion
    if (elements.logoutButton) {
        elements.logoutButton.addEventListener('click', handleLogout);
    }
    
    // Formulaire de réponse
    if (elements.replyForm) {
        elements.replyForm.addEventListener('submit', handleReplySubmit);
    }
    
    // Bouton de connexion
    if (elements.loginButton) {
        elements.loginButton.addEventListener('click', () => {
            window.location.href = '/login.html';
        });
    }
}

/**
 * Gère la déconnexion de l'utilisateur
 * @param {Event} e - L'événement de clic
 */
async function handleLogout(e) {
    e.preventDefault();
    try {
        const { error } = await authService.signOut();
        if (!error) {
            showNotification('Déconnexion réussie', 'success');
            // Recharger la page pour mettre à jour l'interface
            setTimeout(() => window.location.reload(), 1000);
        } else {
            throw error;
        }
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        showNotification('Erreur lors de la déconnexion', 'error');
    }
}

/**
 * Met à jour l'état de l'utilisateur
 * @param {Object} user - L'objet utilisateur
 */
function updateUserState(user) {
    if (user) {
        state.currentUser = {
            id: user.id,
            name: user.user_metadata?.full_name || 
                  user.user_metadata?.name || 
                  user.email?.split('@')[0] || 
                  'Utilisateur',
            email: user.email,
            avatar: user.user_metadata?.avatar_url || 
                   user.user_metadata?.picture ||
                   `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email?.split('@')[0] || 'U')}&background=00b894&color=fff`
        };
    } else {
        state.currentUser = null;
    }
    
    // Mettre à jour l'interface utilisateur
    updateUserUI();
}

// Mettre à jour l'interface utilisateur en fonction de l'état de connexion
function updateUserUI() {
    if (state.currentUser) {
        // Utilisateur connecté
        if (elements.loginButton) elements.loginButton.style.display = 'none';
        if (elements.userMenu) elements.userMenu.style.display = 'flex';
        
        // Mettre à jour le nom d'utilisateur et l'avatar
        if (elements.usernameDisplay) {
            elements.usernameDisplay.textContent = state.currentUser.name || 'Utilisateur';
        }
        
        if (elements.userAvatar) {
            elements.userAvatar.src = state.currentUser.avatar || 'https://ui-avatars.com/api/?name=U&background=00b894&color=fff';
            elements.userAvatar.alt = state.currentUser.name || 'Avatar utilisateur';
        }
        
        // Afficher le formulaire de réponse
        if (elements.replyFormContainer) {
            elements.replyFormContainer.style.display = 'block';
        }
    } else {
        // Utilisateur non connecté
        if (elements.loginButton) elements.loginButton.style.display = 'block';
        if (elements.userMenu) elements.userMenu.style.display = 'none';
        
        // Cacher le formulaire de réponse
        if (elements.replyFormContainer) {
            elements.replyFormContainer.style.display = 'none';
        }
    }
}

/**
 * Charge les détails d'un sujet depuis Supabase
 * @param {string} topicId - L'identifiant du sujet à charger
 */
async function loadTopic(topicId) {
    try {
        state.loading = true;
        
        // Utiliser le service forumService pour charger le sujet
        const { data: topic, error } = await forumService.getTopic(topicId);
        
        if (error) throw error;
        if (!topic) throw new Error('Sujet non trouvé');
        
        // Mettre à jour l'état avec les données du sujet
        state.topic = {
            ...topic,
            // S'assurer que les champs obligatoires sont définis
            title: topic.title || 'Sans titre',
            content: topic.content || '',
            author_name: topic.author_name || 'Utilisateur anonyme',
            created_at: topic.created_at || new Date().toISOString(),
            category: topic.category || 'general'
        };
        
        return topic;
    } catch (error) {
        console.error('Erreur lors du chargement du sujet:', error);
        state.error = error.message || 'Une erreur est survenue lors du chargement du sujet';
        showError(state.error);
        throw error;
    } finally {
        state.loading = false;
    }
}

/**
 * Charge les réponses d'un sujet depuis Supabase
 * @param {string} topicId - L'identifiant du sujet
 */
async function loadReplies(topicId) {
    try {
        state.loading = true;
        
        // Utiliser le service forumService pour charger les réponses
        const { data: replies, error } = await forumService.getTopicReplies(topicId);
        
        if (error) throw error;
        
        // Mettre à jour l'état avec les réponses formatées
        state.replies = (replies || []).map(reply => ({
            ...reply,
            // S'assurer que les champs obligatoires sont définis
            content: reply.content || '',
            author_name: reply.author_name || 'Utilisateur anonyme',
            created_at: reply.created_at || new Date().toISOString(),
            author_avatar: reply.author_avatar || 
                         `https://ui-avatars.com/api/?name=${encodeURIComponent((reply.author_name || 'U').substring(0, 2))}&background=00b894&color=fff`
        }));
        
        return state.replies;
    } catch (error) {
        console.error('Erreur lors du chargement des réponses:', error);
        state.error = error.message || 'Une erreur est survenue lors du chargement des réponses';
        showError(state.error);
        throw error;
    } finally {
        state.loading = false;
    }
}

/**
 * Met à jour l'interface utilisateur en fonction de l'état actuel
 */
function updateUI() {
    // Gestion de l'état de chargement
    if (state.loading) {
        if (elements.loadingIndicator) elements.loadingIndicator.style.display = 'block';
        if (elements.errorMessage) elements.errorMessage.style.display = 'none';
        return;
    } else if (elements.loadingIndicator) {
        elements.loadingIndicator.style.display = 'none';
    }

    // Afficher les erreurs s'il y en a
    if (state.error) {
        showError(state.error);
        return;
    }

    // Afficher les détails du sujet si disponible
    if (state.topic) {
        if (elements.topicTitle) elements.topicTitle.textContent = state.topic.title || 'Sans titre';
        if (elements.authorName) elements.authorName.textContent = state.topic.author_name || 'Utilisateur';
        if (elements.topicDate) elements.topicDate.textContent = formatDate(state.topic.created_at);
        if (elements.topicCategory) elements.topicCategory.textContent = state.topic.category || 'Général';
        if (elements.topicContent) {
            elements.topicContent.innerHTML = state.topic.content 
                ? state.topic.content.replace(/\n/g, '<br>') 
                : '<em>Aucun contenu</em>';
        }
        
        // Mettre à jour l'avatar de l'auteur avec gestion d'erreur
        if (elements.topicAuthorAvatar) {
            elements.topicAuthorAvatar.src = state.topic.author_avatar || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent((state.topic.author_name || 'U').substring(0, 2))}&background=00b894&color=fff`;
            elements.topicAuthorAvatar.alt = state.topic.author_name || 'Auteur';
            elements.topicAuthorAvatar.onerror = () => {
                elements.topicAuthorAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((state.topic.author_name || 'U').substring(0, 2))}&background=00b894&color=fff`;
            };
        }
        
        // Afficher la section du sujet
        if (elements.topicHeader) elements.topicHeader.style.display = 'block';
        if (elements.topicContent) elements.topicContent.style.display = 'block';
    }
    
    // Afficher les réponses
    renderReplies();
    
    // Afficher le nombre de réponses
    if (elements.repliesCount) {
        const replyCount = state.replies?.length || 0;
        elements.repliesCount.textContent = `${replyCount} ${replyCount > 1 ? 'réponses' : 'réponse'}`;
    }
    if (elements.repliesSection) elements.repliesSection.style.display = 'block';
    
    // Mettre à jour l'état du formulaire de réponse
    updateReplyFormState();
}

/**
 * Met à jour l'état du formulaire de réponse en fonction de l'état de connexion
 */
function updateReplyFormState() {
    if (!elements.replyFormContainer || !elements.replyForm) return;
    
    if (state.currentUser) {
        // Utilisateur connecté - afficher le formulaire
        elements.replyFormContainer.style.display = 'block';
        
        // Réinitialiser le formulaire
        if (elements.replyContent) {
            elements.replyContent.value = '';
            elements.replyContent.disabled = false;
        }
        
        // Mettre à jour le bouton de soumission
        const submitButton = elements.replyForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Publier la réponse';
        }
    } else {
        // Utilisateur non connecté - cacher le formulaire ou afficher un message
        elements.replyFormContainer.style.display = 'none';
        // Vous pourriez ajouter un message invitant à se connecter pour répondre
    }
}

/**
 * Affiche les réponses du sujet
 */
function renderReplies() {
    if (!elements.repliesList) return;
    
    // Vérifier s'il y a des réponses à afficher
    const hasReplies = state.replies && state.replies.length > 0;
    
    // Afficher un message si aucune réponse n'est disponible
    if (!hasReplies) {
        elements.repliesList.innerHTML = `
            <div class="empty-state">
                <i class="far fa-comment-dots"></i>
                <p>Aucune réponse pour le moment. Soyez le premier à répondre !</p>
            </div>
        `;
        return;
    }
    
    try {
        // Générer le HTML pour chaque réponse
        elements.repliesList.innerHTML = state.replies
            .map(reply => {
                // Vérifier si l'utilisateur actuel est l'auteur de la réponse
                const isCurrentUser = state.currentUser && state.currentUser.id === reply.author_id;
                const authorName = reply.author_name || 'Utilisateur';
                const avatarUrl = reply.author_avatar || 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName.substring(0, 2))}&background=00b894&color=fff`;
                
                return `
                    <div class="reply-card" data-reply-id="${reply.id}">
                        <div class="reply-header">
                            <div class="reply-author">
                                <img src="${avatarUrl}" 
                                     alt="${authorName}" 
                                     class="reply-avatar"
                                     onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=U&background=00b894&color=fff'">
                                <span class="author-name">${authorName}</span>
                                ${isCurrentUser ? '<span class="badge you-badge">Vous</span>' : ''}
                            </div>
                            <span class="reply-date" title="${new Date(reply.created_at).toLocaleString()}">
                                ${formatDate(reply.created_at)}
                            </span>
                        </div>
                        <div class="reply-content">
                            ${(reply.content || '').replace(/\n/g, '<br>')}
                        </div>
                        ${isCurrentUser ? `
                            <div class="reply-actions">
                                <button class="btn-icon edit-reply" title="Modifier">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon delete-reply" title="Supprimer">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            })
            .join('');
            
/**
 * Configure les écouteurs d'événements pour les actions des réponses (modifier, supprimer)
 */
function setupReplyActions() {
    if (!elements.repliesList) return;
    
    // Gestion de la suppression d'une réponse
    const deleteButtons = elements.repliesList.querySelectorAll('.delete-reply');
    deleteButtons.forEach(button => {
        button.removeEventListener('click', handleDeleteReply);
        button.addEventListener('click', handleDeleteReply);
    });
    
    // Gestion de l'édition d'une réponse
    const editButtons = elements.repliesList.querySelectorAll('.edit-reply');
    editButtons.forEach(button => {
        button.removeEventListener('click', handleEditReply);
        button.addEventListener('click', handleEditReply);
    });
}

/**
 * Gère la suppression d'une réponse
 * @param {Event} e - L'événement de clic
 */
async function handleDeleteReply(e) {
    const replyCard = e.target.closest('.reply-card');
    if (!replyCard) return;
    
    const replyId = replyCard.dataset.replyId;
    if (!replyId) return;
    
    try {
        // Demander confirmation avant suppression
        const confirmDelete = confirm('Êtes-vous sûr de vouloir supprimer cette réponse ?');
        if (!confirmDelete) return;
        
        // Appeler le service pour supprimer la réponse
        const { error } = await forumService.deleteReply(replyId);
        
        if (error) throw error;
        
        // Mettre à jour l'interface
        replyCard.remove();
        showNotification('Réponse supprimée avec succès', 'success');
        
        // Mettre à jour le compteur de réponses
        if (elements.repliesCount) {
            const replyCount = document.querySelectorAll('.reply-card').length;
            elements.repliesCount.textContent = `${replyCount} ${replyCount > 1 ? 'réponses' : 'réponse'}`;
        }
    } catch (error) {
        console.error('Erreur lors de la suppression de la réponse:', error);
        showError('Une erreur est survenue lors de la suppression de la réponse');
    }
}

/**
 * Gère l'édition d'une réponse
 * @param {Event} e - L'événement de clic
 */
function handleEditReply(e) {
    const replyCard = e.target.closest('.reply-card');
    if (!replyCard) return;
    
    const replyId = replyCard.dataset.replyId;
    const replyContent = replyCard.querySelector('.reply-content');
    
    if (!replyId || !replyContent) return;
    
    // Récupérer le contenu actuel
    const currentContent = replyContent.textContent.trim();
    
    // Créer un formulaire d'édition
    const editForm = document.createElement('form');
    editForm.className = 'edit-reply-form';
    editForm.innerHTML = `
        <div class="form-group">
            <textarea class="form-control" rows="3" required>${currentContent}</textarea>
        </div>
        <div class="form-actions">
            <button type="button" class="btn btn-outline-secondary btn-cancel-edit">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
        </div>
    `;
    
    // Remplacer le contenu par le formulaire d'édition
    replyContent.style.display = 'none';
    replyCard.insertBefore(editForm, replyContent.nextSibling);
    
    // Focus sur le textarea
    const textarea = editForm.querySelector('textarea');
    if (textarea) textarea.focus();
    
    // Gestion de la soumission du formulaire
    editForm.onsubmit = async (e) => {
        e.preventDefault();
        const newContent = textarea.value.trim();
        
        if (!newContent || newContent === currentContent) {
            cancelEdit(replyCard, replyContent);
            return;
        }
        
        try {
            // Mettre à jour la réponse via le service
            const { data: updatedReply, error } = await forumService.updateReply(replyId, newContent);
            
            if (error) throw error;
            
            // Mettre à jour l'affichage
            replyContent.innerHTML = updatedReply.content.replace(/\n/g, '<br>');
            cancelEdit(replyCard, replyContent);
            
            // Afficher une notification
            showNotification('Réponse mise à jour avec succès', 'success');
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la réponse:', error);
            showError('Une erreur est survenue lors de la mise à jour de la réponse');
        }
    };
    
    // Gestion de l'annulation
    const cancelButton = editForm.querySelector('.btn-cancel-edit');
    if (cancelButton) {
        cancelButton.onclick = () => cancelEdit(replyCard, replyContent);
    }
}

/**
 * Annule le mode d'édition d'une réponse
 * @param {HTMLElement} replyCard - L'élément de la carte de réponse
 * @param {HTMLElement} replyContent - L'élément de contenu de la réponse
 */
function cancelEdit(replyCard, replyContent) {
    const editForm = replyCard.querySelector('.edit-reply-form');
    if (editForm) {
        replyCard.removeChild(editForm);
    }
    replyContent.style.display = '';
}

        // Ajouter les écouteurs d'événements pour les actions des réponses
        setupReplyActions();
    } catch (error) {
        console.error('Erreur lors du rendu des réponses:', error);
        elements.repliesList.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Une erreur est survenue lors du chargement des réponses.</p>
            </div>
        `;
    }
}

/**
 * Gère la soumission d'une nouvelle réponse
 * @param {Event} event - L'événement de soumission du formulaire
 */
async function handleReplySubmit(event) {
    event.preventDefault();
    
    // Vérifier que l'utilisateur est connecté
    if (!state.currentUser) {
        showNotification('Veuillez vous connecter pour répondre', 'error');
        return;
    }
    
    const content = elements.replyContent ? elements.replyContent.value.trim() : '';
    
    // Valider le contenu
    if (!content) {
        showNotification('Veuillez saisir une réponse', 'error');
        return;
    }
    
    // Vérifier que le sujet est chargé
    if (!state.topic || !state.topic.id) {
        showNotification('Impossible de trouver le sujet de discussion', 'error');
        return;
    }
    
    let submitButton = null;
    let originalButtonText = '';
    
    try {
        // Désactiver le bouton de soumission
        if (elements.replyForm) {
            submitButton = elements.replyForm.querySelector('button[type="submit"]');
            if (submitButton) {
                originalButtonText = submitButton.innerHTML;
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication en cours...';
            }
        }
        
        // Créer l'objet de la réponse
        const replyData = {
            topic_id: state.topic.id,
            content,
            author_id: state.currentUser.id,
            author_name: state.currentUser.name || 'Utilisateur',
            author_avatar: state.currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent((state.currentUser.name || 'U').substring(0, 2))}&background=00b894&color=fff`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Utiliser le service pour créer la réponse
        const { data: newReply, error } = await forumService.createReply(replyData);
            
        if (error) throw error;
        
        // Ajouter la nouvelle réponse à la liste
        state.replies = [...(state.replies || []), newReply];
        
        // Mettre à jour l'interface
        await renderReplies();
        
        // Mettre à jour le compteur de réponses
        if (elements.repliesCount) {
            const replyCount = state.replies.length;
            elements.repliesCount.textContent = `${replyCount} ${replyCount > 1 ? 'réponses' : 'réponse'}`;
        }
        
        // Réinitialiser le formulaire
        if (elements.replyForm) {
            elements.replyForm.reset();
        }
        
        // Faire défiler vers la nouvelle réponse
        if (newReply && newReply.id) {
            setTimeout(() => {
                const newReplyElement = document.querySelector(`[data-reply-id="${newReply.id}"]`);
                if (newReplyElement) {
                    newReplyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    newReplyElement.style.animation = 'highlight 2s';
                    
                    // Supprimer l'animation après son exécution
                    setTimeout(() => {
                        newReplyElement.style.animation = '';
                    }, 2000);
                }
            }, 100);
        }
        
        // Afficher une notification de succès
        showNotification('Votre réponse a été publiée avec succès !', 'success');
        
    } catch (error) {
        console.error('Erreur lors de la publication de la réponse:', error);
        
        // Afficher un message d'erreur plus détaillé si disponible
        const errorMessage = error.message || 'Une erreur est survenue lors de la publication de votre réponse';
        showError(errorMessage);
        
    } finally {
        // Réactiver le bouton de soumission
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText || '<i class="fas fa-paper-plane"></i> Publier la réponse';
        }
    }
}

// Afficher une notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Afficher la notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Masquer automatiquement après 5 secondes
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Afficher une erreur
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
}

// Formater la date
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
        return 'Aujourd\'hui';
    } else if (diffInDays === 1) {
        return 'Hier';
    } else if (diffInDays < 7) {
        return `Il y a ${diffInDays} jours`;
    } else {
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}
