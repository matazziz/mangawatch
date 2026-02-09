// Service pour gérer les appels à Supabase pour le forum
import { supabase, forumService, authService } from './supabase.js';

// Exposer les services globalement pour le débogage
window.forumService = forumService;
window.authService = authService;

// Fonction utilitaire pour formater la date
function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('fr-FR', options);
    } catch (error) {
        console.error('Erreur de formatage de date:', error);
        return '';
    }
}

// Fonction utilitaire pour afficher un message d'erreur
function showError(message, elementId = 'errorMessage') {
    console.error(message);
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Masquer automatiquement après 5 secondes
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        // Fallback à une alerte si l'élément d'erreur n'existe pas
        alert(message);
    }
}

// Fonction utilitaire pour afficher un message de succès
function showSuccess(message, elementId = 'successMessage') {
    console.log(message);
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        
        // Masquer automatiquement après 3 secondes
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 3000);
    }
}

// Fonction pour gérer le chargement des éléments
function setLoading(loading, elementId = 'loadingIndicator') {
    const loadingElement = document.getElementById(elementId);
    if (loadingElement) {
        loadingElement.style.display = loading ? 'block' : 'none';
    }
}

// Fonction pour initialiser le forum
export async function initForum() {
    console.log('Initialisation du forum...');
    setLoading(true, 'globalLoading');
    
    try {
        // Vérifier la connexion à Supabase
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Erreur de session Supabase:', error);
            showError('Impossible de se connecter au serveur. Veuillez réessayer plus tard.');
            return { success: false, error };
        }
        
        // Mettre à jour l'état de l'utilisateur
        if (data.session?.user) {
            try {
                // Récupérer le profil utilisateur
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.session.user.id)
                    .single();
                
                if (profileError) throw profileError;
                
                window.currentUser = {
                    id: data.session.user.id,
                    email: data.session.user.email,
                    name: profile?.username || data.session.user.user_metadata?.name || data.session.user.email.split('@')[0],
                    avatar_url: profile?.avatar_url
                };
                
                console.log('Utilisateur connecté:', window.currentUser);
                
                // Mettre à jour l'interface utilisateur si nécessaire
                updateUserUI();
                
            } catch (profileError) {
                console.error('Erreur lors du chargement du profil:', profileError);
                // Continuer avec les informations de base si le profil ne peut pas être chargé
                window.currentUser = {
                    id: data.session.user.id,
                    email: data.session.user.email,
                    name: data.session.user.user_metadata?.name || data.session.user.email.split('@')[0]
                };
            }
        } else {
            window.currentUser = null;
            console.log('Aucun utilisateur connecté');
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du forum:', error);
        showError('Une erreur est survenue lors de l\'initialisation du forum.');
        return { success: false, error };
        
    } finally {
        setLoading(false, 'globalLoading');
    }
}

// Mettre à jour l'interface utilisateur en fonction de l'état de connexion
function updateUserUI() {
    const loginButton = document.getElementById('loginButton');
    const logoutButton = document.getElementById('logoutButton');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const replyForm = document.getElementById('replyForm');
    
    if (window.currentUser) {
        // Utilisateur connecté
        if (loginButton) loginButton.style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'block';
        if (userAvatar) {
            userAvatar.src = window.currentUser.avatar_url || 'https://ui-avatars.com/api/?name=' + 
                (window.currentUser.name || 'U').charAt(0).toUpperCase() + '&background=00b894&color=fff';
            userAvatar.style.display = 'block';
        }
        if (userName) {
            userName.textContent = window.currentUser.name || 'Mon compte';
            userName.style.display = 'block';
        }
        if (replyForm) {
            replyForm.style.display = 'block';
        }
    } else {
        // Utilisateur non connecté
        if (loginButton) loginButton.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'none';
        if (userAvatar) userAvatar.style.display = 'none';
        if (userName) userName.style.display = 'none';
        if (replyForm) {
            replyForm.style.display = 'none';
            const loginPrompt = document.getElementById('loginPrompt');
            if (loginPrompt) loginPrompt.style.display = 'block';
        }
    }
}

// Gérer la déconnexion
export async function handleLogout() {
    try {
        setLoading(true, 'globalLoading');
        const { error } = await authService.signOut();
        
        if (error) throw error;
        
        window.currentUser = null;
        updateUserUI();
        showSuccess('Déconnexion réussie !');
        
        // Recharger la page pour mettre à jour l'interface
        window.location.reload();
        
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        showError('Une erreur est survenue lors de la déconnexion.');
    } finally {
        setLoading(false, 'globalLoading');
    }
}

// Fonction pour charger un sujet par son ID
export async function loadTopic(topicId) {
    if (!topicId) {
        const error = new Error('ID de sujet manquant');
        showError('Impossible de charger le sujet : ID manquant');
        throw error;
    }
    
    setLoading(true, 'topicLoading');
    
    try {
        console.log(`Chargement du sujet ${topicId}...`);
        const topic = await forumService.getTopic(topicId);
        
        if (!topic) {
            const error = new Error('Sujet non trouvé');
            showError('Le sujet demandé est introuvable ou a été supprimé.');
            throw error;
        }
        
        console.log('Sujet chargé:', topic);
        return topic;
        
    } catch (error) {
        console.error('Erreur lors du chargement du sujet:', error);
        showError('Une erreur est survenue lors du chargement du sujet. Veuillez réessayer plus tard.');
        throw error;
        
    } finally {
        setLoading(false, 'topicLoading');
    }
}

// Fonction pour charger les réponses d'un sujet
export async function loadReplies(topicId) {
    if (!topicId) {
        console.error('ID de sujet manquant pour charger les réponses');
        showError('Impossible de charger les réponses : ID de sujet manquant');
        return [];
    }
    
    setLoading(true, 'repliesLoading');
    
    try {
        console.log(`Chargement des réponses pour le sujet ${topicId}...`);
        const replies = await forumService.getTopicReplies(topicId);
        console.log(`${replies.length} réponses chargées`);
        return replies || [];
        
    } catch (error) {
        console.error('Erreur lors du chargement des réponses:', error);
        showError('Une erreur est survenue lors du chargement des réponses.');
        return [];
        
    } finally {
        setLoading(false, 'repliesLoading');
    }
}

// Fonction pour créer une nouvelle réponse
export async function handleReplySubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const content = form.content?.value.trim();
    const topicId = form.dataset.topicId;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton?.textContent;
    
    // Validation
    if (!content) {
        showError('Veuillez saisir une réponse avant de l\'envoyer.');
        return;
    }
    
    if (!topicId) {
        showError('Impossible d\'envoyer la réponse : sujet introuvable.');
        return;
    }
    
    if (!window.currentUser) {
        showError('Veuvez-vous vous connecter pour répondre à ce sujet.');
        return;
    }
    
    // Désactiver le bouton pendant l'envoi
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Envoi en cours...';
    }
    
    setLoading(true, 'replyLoading');
    
    try {
        console.log('Envoi de la réponse...');
        const replyData = {
            topic_id: topicId,
            content: content,
            user_id: window.currentUser.id
        };
        
        const { data: reply, error } = await forumService.createReply(replyData);
        
        if (error) throw error;
        
        console.log('Réponse créée avec succès:', reply);
        form.reset();
        showSuccess('Votre réponse a été publiée avec succès !');
        
        // Recharger les réponses
        const replies = await loadReplies(topicId);
        updateRepliesUI(replies);
        
        // Faire défiler vers la nouvelle réponse
        setTimeout(() => {
            const replyElement = document.querySelector(`[data-reply-id="${reply.id}"]`);
            if (replyElement) {
                replyElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                // Ajouter une classe de surbrillance temporaire
                replyElement.classList.add('new-reply');
                setTimeout(() => {
                    replyElement.classList.remove('new-reply');
                }, 2000);
            }
        }, 300);
        
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la réponse:', error);
        showError('Une erreur est survenue lors de l\'envoi de votre réponse. ' + 
                 (error.message || 'Veuillez réessayer plus tard.'));
        
    } finally {
        // Réactiver le bouton
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText || 'Répondre';
        }
        setLoading(false, 'replyLoading');
    }
}

// Fonction pour mettre à jour l'interface des réponses
function updateRepliesUI(replies) {
    const repliesContainer = document.getElementById('repliesContainer');
    const repliesCountElement = document.getElementById('repliesCount');
    
    if (!repliesContainer) return;
    
    // Mettre à jour le compteur de réponses
    if (repliesCountElement) {
        const count = replies?.length || 0;
        repliesCountElement.textContent = count === 0 ? 'Aucune réponse' : 
                                       count === 1 ? '1 réponse' : 
                                       `${count} réponses`;
    }
    
    if (!replies || replies.length === 0) {
        repliesContainer.innerHTML = `
            <div class="no-replies">
                <i class="far fa-comment-dots"></i>
                <p>Aucune réponse pour le moment. Soyez le premier à répondre !</p>
            </div>`;
        return;
    }
    
    // Trier les réponses par date (les plus anciennes en premier)
    const sortedReplies = [...replies].sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
    );
    
    // Générer le HTML des réponses
    repliesContainer.innerHTML = sortedReplies.map(reply => `
        <div class="reply-card" data-reply-id="${reply.id}">
            <div class="reply-header">
                <div class="reply-author">
                    <img src="${reply.author_avatar || 'https://ui-avatars.com/api/?name=' + (reply.author_name || 'U').charAt(0) + '&background=00b894&color=fff'}" 
                         alt="${reply.author_name || 'Utilisateur'}" 
                         class="reply-avatar"
                         onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=U&background=00b894&color=fff'">
                    <span class="reply-author-name">${reply.author_name || 'Utilisateur anonyme'}</span>
                </div>
                <span class="reply-date" title="${new Date(reply.created_at).toLocaleString('fr-FR')}">
                    <i class="far fa-clock"></i> ${formatDate(reply.created_at)}
                </span>
            </div>
            <div class="reply-content">${reply.content || ''}</div>
            ${window.currentUser?.id === reply.user_id ? `
                <div class="reply-actions">
                    <button class="btn-edit-reply" data-reply-id="${reply.id}">
                        <i class="far fa-edit"></i> Modifier
                    </button>
                    <button class="btn-delete-reply" data-reply-id="${reply.id}">
                        <i class="far fa-trash-alt"></i> Supprimer
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
    
    // Ajouter les écouteurs d'événements pour les actions sur les réponses
    setupRepliesActions();
}

// Fonction pour configurer les actions sur les réponses
function setupRepliesActions() {
    // Écouteurs pour les boutons de modification
    document.querySelectorAll('.btn-edit-reply').forEach(button => {
        button.addEventListener('click', async (e) => {
            const replyId = e.currentTarget.dataset.replyId;
            if (!replyId) return;
            
            try {
                // Récupérer le contenu actuel de la réponse
                const replyCard = e.currentTarget.closest('.reply-card');
                const contentElement = replyCard?.querySelector('.reply-content');
                if (!contentElement) return;
                
                const currentContent = contentElement.textContent;
                
                // Créer un formulaire d'édition
                const editForm = document.createElement('form');
                editForm.className = 'edit-reply-form';
                editForm.innerHTML = `
                    <textarea class="edit-reply-content" required>${currentContent}</textarea>
                    <div class="edit-actions">
                        <button type="button" class="btn-cancel-edit">Annuler</button>
                        <button type="submit" class="btn-save-edit">Enregistrer</button>
                    </div>
                `;
                
                // Remplacer le contenu par le formulaire d'édition
                contentElement.replaceWith(editForm);
                
                // Gestion de l'annulation
                const cancelButton = editForm.querySelector('.btn-cancel-edit');
                cancelButton.addEventListener('click', () => {
                    editForm.replaceWith(contentElement);
                });
                
                // Gestion de la soumission
                editForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const newContent = editForm.querySelector('.edit-reply-content').value.trim();
                    if (!newContent) return;
                    
                    try {
                        const { error } = await forumService.updateReply(replyId, {
                            content: newContent,
                            updated_at: new Date().toISOString()
                        });
                        
                        if (error) throw error;
                        
                        // Mettre à jour le contenu affiché
                        contentElement.textContent = newContent;
                        editForm.replaceWith(contentElement);
                        showSuccess('Votre réponse a été mise à jour avec succès !');
                        
                    } catch (error) {
                        console.error('Erreur lors de la mise à jour de la réponse:', error);
                        showError('Une erreur est survenue lors de la mise à jour de votre réponse.');
                    }
                });
                
            } catch (error) {
                console.error('Erreur lors de la préparation de l\'édition:', error);
                showError('Une erreur est survenue lors de la préparation de l\'édition.');
            }
        });
    });
    
    // Écouteurs pour les boutons de suppression
    document.querySelectorAll('.btn-delete-reply').forEach(button => {
        button.addEventListener('click', async (e) => {
            const replyId = e.currentTarget.dataset.replyId;
            if (!replyId) return;
            
            if (!confirm('Êtes-vous sûr de vouloir supprimer cette réponse ? Cette action est irréversible.')) {
                return;
            }
            
            try {
                const { error } = await forumService.deleteReply(replyId);
                if (error) throw error;
                
                // Supprimer la carte de réponse du DOM
                const replyCard = e.currentTarget.closest('.reply-card');
                if (replyCard) {
                    replyCard.style.opacity = '0.5';
                    setTimeout(() => {
                        replyCard.remove();
                        // Mettre à jour le compteur de réponses
                        const replies = document.querySelectorAll('.reply-card');
                        updateRepliesUI(Array.from(replies).map(el => ({
                            id: el.dataset.replyId,
                            content: el.querySelector('.reply-content')?.textContent || '',
                            author_name: el.querySelector('.reply-author-name')?.textContent || 'Utilisateur anonyme',
                            created_at: el.querySelector('.reply-date')?.dataset.timestamp || new Date().toISOString()
                        })));
                    }, 300);
                }
                
                showSuccess('Votre réponse a été supprimée avec succès.');
                
            } catch (error) {
                console.error('Erreur lors de la suppression de la réponse:', error);
                showError('Une erreur est survenue lors de la suppression de votre réponse.');
            }
        });
    });
}

// Fonction pour afficher les détails d'un sujet
function displayTopic(topic) {
    const topicTitle = document.getElementById('topicTitle');
    const topicAuthor = document.getElementById('topicAuthor');
    const topicDate = document.getElementById('topicDate');
    const topicContent = document.getElementById('topicContent');
    const topicCategory = document.getElementById('topicCategory');
    const topicViews = document.getElementById('topicViews');
    const topicReplies = document.getElementById('topicReplies');
    
    // Mettre à jour les éléments du DOM
    if (topicTitle) topicTitle.textContent = topic.title || 'Sans titre';
    
    if (topicAuthor) {
        topicAuthor.innerHTML = `
            <img src="${topic.author_avatar || 'https://ui-avatars.com/api/?name=' + (topic.author_name || 'U').charAt(0) + '&background=00b894&color=fff'}" 
                 alt="${topic.author_name || 'Auteur'}" 
                 class="author-avatar"
                 onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=U&background=00b894&color=fff'">
            <span>${topic.author_name || 'Auteur inconnu'}</span>
        `;
    }
    
    if (topicDate) {
        topicDate.innerHTML = `<i class="far fa-clock"></i> ${formatDate(topic.created_at)}`;
        topicDate.title = new Date(topic.created_at).toLocaleString('fr-FR');
    }
    
    if (topicContent) {
        // Échapper le HTML pour la sécurité et convertir les sauts de ligne en <br>
        const escapedContent = (topic.content || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
        topicContent.innerHTML = escapedContent;
    }
    
    // Mettre à jour les métadonnées optionnelles
    if (topicCategory) {
        topicCategory.textContent = topic.category_name || 'Général';
    }
    
    if (topicViews) {
        topicViews.textContent = topic.views || '0';
    }
    
    if (topicReplies) {
        topicReplies.textContent = topic.replies_count || '0';
    }
    
    // Ajouter des boutons d'action si l'utilisateur est l'auteur ou un modérateur
    const topicActions = document.getElementById('topicActions');
    if (topicActions && window.currentUser) {
        const isAuthor = window.currentUser.id === topic.user_id;
        const isAdmin = window.currentUser.role === 'admin' || window.currentUser.role === 'moderator';
        
        if (isAuthor || isAdmin) {
            topicActions.innerHTML = `
                <button id="editTopic" class="btn-edit">
                    <i class="far fa-edit"></i> Modifier
                </button>
                <button id="deleteTopic" class="btn-delete">
                    <i class="far fa-trash-alt"></i> Supprimer
                </button>
            `;
            
            // Ajouter les écouteurs d'événements
            const editButton = document.getElementById('editTopic');
            const deleteButton = document.getElementById('deleteTopic');
            
            if (editButton) {
                editButton.addEventListener('click', () => {
                    // Implémenter la logique d'édition
                    console.log('Édition du sujet:', topic.id);
                });
            }
            
            if (deleteButton) {
                deleteButton.addEventListener('click', async () => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer ce sujet ? Cette action est irréversible.')) {
                        try {
                            const { error } = await forumService.deleteTopic(topic.id);
                            if (error) throw error;
                            
                            showSuccess('Le sujet a été supprimé avec succès.');
                            setTimeout(() => {
                                window.location.href = '/forum.html';
                            }, 1500);
                            
                        } catch (error) {
                            console.error('Erreur lors de la suppression du sujet:', error);
                            showError('Une erreur est survenue lors de la suppression du sujet.');
                        }
                    }
                });
            }
        }
    }
}

// Fonction pour initialiser la page de sujet
export async function initTopicPage() {
    try {
        console.log('Initialisation de la page de sujet...');
        
        // Afficher l'indicateur de chargement global
        setLoading(true, 'globalLoading');
        
        // Récupérer l'ID du sujet depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const topicId = urlParams.get('id');
        
        if (!topicId) {
            const error = new Error('Aucun ID de sujet spécifié dans l\'URL');
            showError('Sujet introuvable : aucun identifiant fourni.');
            throw error;
        }
        
        // Charger le sujet
        const topic = await loadTopic(topicId);
        if (!topic) {
            showError('Impossible de charger le sujet demandé. Veuillez réessayer plus tard.');
            return;
        }
        
        // Afficher le sujet
        displayTopic(topic);
        
        // Charger les réponses
        const replies = await loadReplies(topicId);
        updateRepliesUI(replies);
        
        // Initialiser le formulaire de réponse
        const replyForm = document.getElementById('replyForm');
        if (replyForm) {
            replyForm.dataset.topicId = topicId;
            replyForm.addEventListener('submit', handleReplySubmit);
            
            // Vérifier si l'utilisateur est connecté
            if (window.currentUser) {
                replyForm.style.display = 'block';
                const loginPrompt = document.getElementById('loginPrompt');
                if (loginPrompt) loginPrompt.style.display = 'none';
            } else {
                replyForm.style.display = 'none';
                const loginPrompt = document.getElementById('loginPrompt');
                if (loginPrompt) loginPrompt.style.display = 'block';
            }
        }
        
        // Mettre à jour le titre de la page
        document.title = `${topic.title} | Forum`;
        
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la page de sujet:', error);
        
        // Afficher un message d'erreur plus convivial
        if (!document.querySelector('.error-message')) {
            const mainContent = document.querySelector('main') || document.body;
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Une erreur est survenue</h3>
                    <p>Impossible de charger le sujet demandé. Veuillez vérifier votre connexion et réessayer.</p>
                    <a href="/forum.html" class="btn btn-primary">
                        <i class="fas fa-arrow-left"></i> Retour au forum
                    </a>
                </div>
            `;
            mainContent.innerHTML = '';
            mainContent.appendChild(errorMessage);
        }
        
    } finally {
        // Masquer l'indicateur de chargement global
        setLoading(false, 'globalLoading');
    }
}

// Exporter les fonctions pour une utilisation dans d'autres fichiers
export default {
    initForum,
    loadTopic,
    loadReplies,
    handleReplySubmit
};
