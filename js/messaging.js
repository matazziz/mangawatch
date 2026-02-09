// Composant UI pour le système de messagerie
import { messageService } from './messageService.js';

function _t(key) {
    return (window.localization && window.localization.get(key)) || key;
}
function _messageLocale() {
    const lang = (window.localization && window.localization.currentLanguage) || localStorage.getItem('mangaWatchLanguage') || 'fr';
    const map = { fr: 'fr-FR', en: 'en-US', de: 'de-DE', es: 'es-ES', it: 'it-IT', ja: 'ja-JP' };
    return map[lang] || 'fr-FR';
}
function _messageTypeLabel(messageType) {
    const key = 'messaging.type.' + (messageType || 'info');
    return _t(key);
}
function _messageDisplayTitle(message) {
    if (message.metadata && message.metadata.type === 'ticket_reply' && message.title) {
        const idx = message.title.indexOf(': ');
        const subject = idx >= 0 ? message.title.slice(idx + 2) : message.title;
        return _t('help.reply_to_your_ticket') + (subject ? ': ' + subject : '');
    }
    return message.title || '';
}

class MessagingUI {
    constructor() {
        this.isOpen = false;
        this.currentMessageId = null;
        this.unreadCount = 0;
        this.updateInterval = null;
        this.init();
    }

    async init() {
        // Créer le HTML du composant
        this.createHTML();
        
        // Attacher les event listeners
        this.attachEventListeners();
        
        // Charger les messages et mettre à jour le compteur
        await this.updateUnreadCount();
        
        // Mettre à jour périodiquement (toutes les 30 secondes)
        this.startAutoUpdate();
    }

    createHTML() {
        // Créer le bouton flottant
        const button = document.createElement('button');
        button.className = 'message-button';
        button.id = 'message-button';
        button.setAttribute('aria-label', _t('messaging.aria_label'));
        button.innerHTML = `
            <i class="fas fa-envelope"></i>
            <span class="message-badge hidden" id="message-badge">0</span>
        `;
        document.body.appendChild(button);

        // Créer l'overlay et la popup
        const overlay = document.createElement('div');
        overlay.className = 'message-overlay';
        overlay.id = 'message-overlay';
        overlay.innerHTML = `
            <div class="message-popup">
                <div class="message-popup-header">
                    <h2><i class="fas fa-envelope-open"></i> ${_t('messaging.title')}</h2>
                    <button class="message-popup-close" id="message-popup-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="message-popup-body" id="message-popup-body">
                    <div class="message-empty">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>${_t('messaging.loading')}</p>
                    </div>
                </div>
                <div class="message-actions" id="message-actions" style="display: none;">
                    <button class="message-btn message-btn-secondary" id="message-back-btn">
                        <i class="fas fa-arrow-left"></i> ${_t('messaging.back')}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    attachEventListeners() {
        // Ouvrir/fermer la popup
        document.getElementById('message-button').addEventListener('click', () => {
            this.togglePopup();
        });

        document.getElementById('message-popup-close').addEventListener('click', () => {
            this.closePopup();
        });

        document.getElementById('message-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'message-overlay') {
                this.closePopup();
            }
        });

        // Bouton retour
        document.getElementById('message-back-btn').addEventListener('click', () => {
            this.showMessageList();
        });

        // Raccourci clavier ESC pour fermer
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closePopup();
            }
        });
    }

    async togglePopup() {
        if (this.isOpen) {
            this.closePopup();
        } else {
            await this.openPopup();
        }
    }

    async openPopup() {
        this.isOpen = true;
        document.getElementById('message-overlay').classList.add('active');
        // Rafraîchir les textes statiques (langue courante)
        const headerH2 = document.querySelector('.message-popup-header h2');
        if (headerH2) headerH2.innerHTML = '<i class="fas fa-envelope-open"></i> ' + _t('messaging.title');
        const backBtn = document.getElementById('message-back-btn');
        if (backBtn) backBtn.innerHTML = '<i class="fas fa-arrow-left"></i> ' + _t('messaging.back');
        const msgBtn = document.getElementById('message-button');
        if (msgBtn) msgBtn.setAttribute('aria-label', _t('messaging.aria_label'));
        await this.loadMessages();
    }

    closePopup() {
        this.isOpen = false;
        document.getElementById('message-overlay').classList.remove('active');
        this.showMessageList();
    }

    async loadMessages() {
        const body = document.getElementById('message-popup-body');
        body.innerHTML = '<div class="message-empty"><i class="fas fa-spinner fa-spin"></i><p>' + _t('messaging.loading') + '</p></div>';

        try {
            const messages = await messageService.getMessages();
            const readMessages = messageService.getReadMessages();
            const messageTypes = messageService.getMessageTypes();
            const locale = _messageLocale();

            if (messages.length === 0) {
                body.innerHTML = `
                    <div class="message-empty">
                        <i class="fas fa-inbox"></i>
                        <p>${_t('messaging.empty')}</p>
                    </div>
                `;
                document.getElementById('message-actions').style.display = 'none';
                return;
            }

            // Bouton "Marquer tout comme lu"
            let html = `
                <button class="message-mark-all-read" id="mark-all-read-btn">
                    <i class="fas fa-check-double"></i> ${_t('messaging.mark_all_read')}
                </button>
                <div class="message-list">
            `;

            messages.forEach(message => {
                const useSupabase = !!(typeof supabase !== 'undefined' && supabase);
                const isUnread = useSupabase 
                    ? !message.is_read 
                    : !readMessages.includes(message.id);
                const messageType = messageTypes[message.message_type] || messageTypes.info;
                const typeClass = messageService.getMessageTypeClass(message.message_type);
                const typeLabel = _messageTypeLabel(message.message_type);
                const displayTitle = _messageDisplayTitle(message);
                const date = new Date(message.created_at).toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                html += `
                    <div class="message-item ${typeClass} ${isUnread ? 'unread' : ''}" data-message-id="${message.id}">
                        <div class="message-header">
                            <h3 class="message-title">
                                <i class="fas ${messageType.icon}"></i>
                                ${this.escapeHtml(displayTitle)}
                            </h3>
                            <span class="message-date">${date}</span>
                        </div>
                        <p class="message-content">${this.escapeHtml(message.content.substring(0, 100))}${message.content.length > 100 ? '...' : ''}</p>
                        <span class="message-type-badge type-${message.message_type}">${typeLabel}</span>
                    </div>
                `;
            });

            html += '</div>';
            body.innerHTML = html;

            // Attacher les event listeners aux messages
            const messageItems = document.querySelectorAll('.message-item');
            messageItems.forEach(item => {
                // Créer un nouveau listener à chaque fois pour éviter les doublons
                const clickHandler = async () => {
                    const messageId = item.dataset.messageId;
                    await this.showMessageDetail(messageId);
                    // Mettre à jour le compteur après avoir marqué comme lu
                    await this.updateUnreadCount();
                };
                item.onclick = clickHandler;
            });

            // Bouton "Marquer tout comme lu"
            const markAllReadBtn = document.getElementById('mark-all-read-btn');
            if (markAllReadBtn) {
                markAllReadBtn.onclick = async () => {
                    // Marquer tous les messages comme lus
                    await messageService.markAllAsRead();
                    
                    // Forcer immédiatement le badge à disparaître
                    this.unreadCount = 0;
                    const badge = document.getElementById('message-badge');
                    if (badge) {
                        badge.classList.add('hidden');
                        badge.style.display = 'none';
                        badge.style.visibility = 'hidden';
                    }
                    
                    // Attendre un peu pour que les changements soient synchronisés
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Recharger les messages pour mettre à jour l'affichage
                    await this.loadMessages();
                    
                    // Vérifier une dernière fois le compteur pour s'assurer qu'il est à 0
                    await this.updateUnreadCount();
                };
            }

            document.getElementById('message-actions').style.display = 'none';
        } catch (error) {
            console.error('Erreur lors du chargement des messages:', error);
            body.innerHTML = `
                <div class="message-empty">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${_t('messaging.load_error')}</p>
                </div>
            `;
        }
    }

    async showMessageDetail(messageId) {
        const messages = await messageService.getMessages();
        const message = messages.find(m => m.id === messageId);
        const messageTypes = messageService.getMessageTypes();

        if (!message) return;

        // Marquer comme lu
        await messageService.markAsRead(messageId);
        // Attendre un peu pour que le changement soit pris en compte
        await new Promise(resolve => setTimeout(resolve, 100));
        // Mettre à jour le compteur immédiatement
        await this.updateUnreadCount();

        const messageType = messageTypes[message.message_type] || messageTypes.info;
        const typeLabel = _messageTypeLabel(message.message_type);
        const locale = _messageLocale();
        const date = new Date(message.created_at).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const displayTitle = _messageDisplayTitle(message);
        const body = document.getElementById('message-popup-body');
        body.innerHTML = `
            <div class="message-detail active">
                <div class="message-detail-content">
                    <div class="message-detail-header">
                        <h2 class="message-detail-title">
                            <i class="fas ${messageType.icon}"></i>
                            ${this.escapeHtml(displayTitle)}
                        </h2>
                        <div class="message-detail-meta">
                            ${date} • ${typeLabel}
                        </div>
                    </div>
                    <div class="message-detail-body">
                        ${this.formatMessageContent(message.content)}
                    </div>
                    <div class="message-detail-actions">
                        <button class="message-delete-btn" data-message-id="${messageId}">
                            <i class="fas fa-trash"></i> ${_t('messaging.delete')}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('message-actions').style.display = 'flex';
        
        // Attacher le listener au bouton de suppression
        const deleteBtn = body.querySelector('.message-delete-btn');
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                this.showDeleteConfirmModal(messageId);
            };
        }
    }

    showMessageList() {
        this.loadMessages();
    }

    formatMessageContent(content) {
        // Convertir les retours à la ligne en <br>
        return this.escapeHtml(content).replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async updateUnreadCount() {
        try {
            // Forcer la récupération fraîche des messages pour avoir les données à jour
            const unreadCount = await messageService.getUnreadCount();
            this.unreadCount = unreadCount;
            const badge = document.getElementById('message-badge');
            
            if (!badge) {
                console.warn('Badge de message non trouvé');
                return;
            }
            
            // Si le compteur est à 0, forcer la cache du badge avec toutes les propriétés
            if (this.unreadCount <= 0) {
                this.unreadCount = 0;
                badge.classList.add('hidden');
                badge.style.display = 'none';
                badge.style.visibility = 'hidden';
                badge.style.opacity = '0';
            } else {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount.toString();
                badge.classList.remove('hidden');
                badge.style.display = 'flex';
                badge.style.visibility = 'visible';
                badge.style.opacity = '1';
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour du compteur:', error);
            // En cas d'erreur, cacher le badge par sécurité
            const badge = document.getElementById('message-badge');
            if (badge) {
                badge.classList.add('hidden');
                badge.style.display = 'none';
                badge.style.visibility = 'hidden';
            }
        }
    }

    startAutoUpdate() {
        // Mettre à jour toutes les 30 secondes
        this.updateInterval = setInterval(async () => {
            // Ne mettre à jour que si on n'a pas déjà forcé le compteur à 0
            // (pour éviter que le badge réapparaisse après avoir marqué tout comme lu)
            await this.updateUnreadCount();
            // Si la popup est ouverte, recharger les messages
            if (this.isOpen) {
                await this.loadMessages();
            }
        }, 30000);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    // Méthode publique pour rafraîchir manuellement
    async refresh() {
        await this.updateUnreadCount();
        if (this.isOpen) {
            await this.loadMessages();
        }
    }

    // Afficher le modal de confirmation de suppression
    showDeleteConfirmModal(messageId) {
        // Créer le modal de confirmation
        const overlay = document.createElement('div');
        overlay.className = 'message-delete-modal-overlay';
        overlay.id = 'message-delete-modal-overlay';
        overlay.innerHTML = `
            <div class="message-delete-modal">
                <div class="message-delete-modal-header">
                    <div class="message-delete-modal-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3 class="message-delete-modal-title">${_t('messaging.delete_confirm_title')}</h3>
                </div>
                <div class="message-delete-modal-body">
                    <p>${_t('messaging.delete_confirm_body')}</p>
                    <p class="message-delete-modal-warning">${_t('messaging.delete_irreversible')}</p>
                </div>
                <div class="message-delete-modal-actions">
                    <button class="message-delete-modal-btn cancel" id="message-delete-cancel">
                        <i class="fas fa-times"></i> ${_t('messaging.cancel')}
                    </button>
                    <button class="message-delete-modal-btn confirm" id="message-delete-confirm">
                        <i class="fas fa-trash"></i> ${_t('messaging.delete')}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Afficher avec animation
        setTimeout(() => overlay.classList.add('active'), 10);
        
        // Event listeners
        document.getElementById('message-delete-cancel').onclick = () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        };
        
        document.getElementById('message-delete-confirm').onclick = async () => {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
            await this.deleteMessage(messageId);
        };
        
        // Fermer en cliquant sur l'overlay
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 300);
            }
        };
    }

    // Supprimer un message
    async deleteMessage(messageId) {
        try {
            await messageService.deleteMessage(messageId);
            // Recharger les messages et mettre à jour le compteur
            await this.loadMessages();
            await this.updateUnreadCount();
            // Retourner à la liste si on était en train de voir un détail
            this.showMessageList();
        } catch (error) {
            console.error('Erreur lors de la suppression du message:', error);
            alert(_t('messaging.delete_error'));
        }
    }
}


// Initialiser le composant quand le DOM est prêt
let messagingUI = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        messagingUI = new MessagingUI();
    });
} else {
    messagingUI = new MessagingUI();
}

// Exporter pour utilisation globale
window.messagingUI = messagingUI;

