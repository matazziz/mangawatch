// Service de messagerie pour gérer les messages globaux et privés
// Supporte Firebase, avec fallback vers localStorage pour compatibilité

import { firebaseMessageService } from './firebaseMessageService.js';

class MessageService {
    constructor() {
        // Utiliser Firebase par défaut
        this.useFirebase = true;
        this.storageKey = 'site_messages';
        this.readMessagesKey = 'read_messages';
    }

    // Obtenir l'email de l'utilisateur actuel
    getCurrentUserEmail() {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                return user.email;
            }
        } catch (e) {
            console.error('Erreur lors de la récupération de l\'email utilisateur:', e);
        }
        return null;
    }

    // Obtenir tous les messages (globaux + messages de l'utilisateur)
    async getMessages() {
        const userEmail = this.getCurrentUserEmail();
        
        if (this.useFirebase) {
            try {
                const messages = await firebaseMessageService.getMessages(userEmail);
                // Convertir les timestamps Firestore en dates ISO pour compatibilité
                return messages.map(msg => {
                    if (msg.created_at && (msg.created_at.toMillis || msg.created_at.seconds)) {
                        const timestamp = msg.created_at.toMillis ? msg.created_at.toMillis() : msg.created_at.seconds * 1000;
                        msg.created_at = new Date(timestamp).toISOString();
                    }
                    return msg;
                });
            } catch (error) {
                console.error('Erreur lors de la récupération des messages depuis Firebase:', error);
                // Fallback vers localStorage
                return this.getMessagesFromLocalStorage();
            }
        } else {
            return this.getMessagesFromLocalStorage();
        }
    }

    // Récupérer les messages depuis localStorage
    getMessagesFromLocalStorage() {
        try {
            const messages = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
            const userEmail = this.getCurrentUserEmail();
            
            // Filtrer pour ne retourner que les messages globaux et ceux destinés à l'utilisateur
            return messages.filter(msg => 
                !msg.recipient_email || msg.recipient_email === userEmail
            ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } catch (e) {
            console.error('Erreur lors de la récupération des messages depuis localStorage:', e);
            return [];
        }
    }

    // Compter les messages non lus
    async getUnreadCount() {
        const userEmail = this.getCurrentUserEmail();
        const readMessages = this.getReadMessages();
        
        if (this.useFirebase) {
            try {
                return await firebaseMessageService.getUnreadCount(userEmail, readMessages);
            } catch (error) {
                console.error('Erreur lors du comptage des messages non lus depuis Firebase:', error);
                // Fallback vers méthode locale
                const messages = await this.getMessages();
                return messages.filter(msg => {
                if (msg.hasOwnProperty('is_read')) {
                    return !msg.is_read && !readMessages.includes(msg.id);
                }
                return !readMessages.includes(msg.id);
                }).length;
            }
        } else {
            const messages = await this.getMessages();
            return messages.filter(msg => !readMessages.includes(msg.id)).length;
        }
    }

    // Obtenir la liste des IDs de messages lus
    getReadMessages() {
        try {
            return JSON.parse(localStorage.getItem(this.readMessagesKey) || '[]');
        } catch (e) {
            return [];
        }
    }

    // Marquer un message comme lu
    async markAsRead(messageId) {
        // Toujours mettre à jour localStorage (pour synchronisation)
        this.markAsReadInLocalStorage(messageId);
        
        if (this.useFirebase) {
            try {
                await firebaseMessageService.markAsRead(messageId);
            } catch (error) {
                console.error('Erreur lors du marquage du message comme lu depuis Firebase:', error);
                // localStorage est déjà mis à jour, donc on continue
            }
        }
    }

    // Marquer comme lu dans localStorage
    markAsReadInLocalStorage(messageId) {
        try {
            const readMessages = this.getReadMessages();
            if (!readMessages.includes(messageId)) {
                readMessages.push(messageId);
                localStorage.setItem(this.readMessagesKey, JSON.stringify(readMessages));
            }
        } catch (e) {
            console.error('Erreur lors du marquage du message comme lu:', e);
        }
    }

    // Marquer tous les messages comme lus
    async markAllAsRead() {
        const messages = await this.getMessages();
        const userEmail = this.getCurrentUserEmail();
        const readMessages = this.getReadMessages();
        const allMessageIds = messages.map(m => m.id);
        
        if (this.useFirebase) {
            try {
                // Marquer tous les messages non lus
                const unreadMessages = messages.filter(m => {
                    if (m.hasOwnProperty('is_read')) {
                        return !m.is_read;
                    }
                    return !readMessages.includes(m.id);
                });
                
                // Marquer chaque message comme lu dans Firebase
                for (const msg of unreadMessages) {
                    try {
                        await firebaseMessageService.markAsRead(msg.id);
                    } catch (error) {
                        console.warn(`Erreur lors du marquage du message ${msg.id} comme lu:`, error);
                    }
                }
            } catch (error) {
                console.error('Erreur lors du marquage de tous les messages comme lus:', error);
            }
        }

        // Toujours mettre à jour localStorage pour tous les messages
        allMessageIds.forEach(msgId => {
            if (!readMessages.includes(msgId)) {
                readMessages.push(msgId);
            }
        });
        localStorage.setItem(this.readMessagesKey, JSON.stringify(readMessages));
    }

    // Supprimer un message
    async deleteMessage(messageId) {
        if (this.useFirebase) {
            try {
                await firebaseMessageService.deleteMessage(messageId);
            } catch (error) {
                console.error('Erreur lors de la suppression du message depuis Firebase:', error);
                // Fallback vers localStorage
                this.deleteMessageFromLocalStorage(messageId);
            }
        } else {
            this.deleteMessageFromLocalStorage(messageId);
        }
        
        // Retirer aussi de la liste des messages lus
        const readMessages = this.getReadMessages();
        const index = readMessages.indexOf(messageId);
        if (index > -1) {
            readMessages.splice(index, 1);
            localStorage.setItem(this.readMessagesKey, JSON.stringify(readMessages));
        }
    }

    // Supprimer un message depuis localStorage
    deleteMessageFromLocalStorage(messageId) {
        try {
            const messages = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
            const filteredMessages = messages.filter(msg => msg.id !== messageId);
            localStorage.setItem(this.storageKey, JSON.stringify(filteredMessages));
        } catch (e) {
            console.error('Erreur lors de la suppression du message:', e);
        }
    }

    // Envoyer un message (admin seulement)
    async sendMessage(messageData) {
        const { recipientEmail, title, content, messageType, metadata } = messageData;
        const currentUserEmail = this.getCurrentUserEmail();
        
        const message = {
            recipient_email: recipientEmail || null, // null pour global
            title: title || 'Message',
            content: content,
            message_type: messageType || 'info',
            is_read: false,
            created_by: currentUserEmail,
            metadata: metadata || {}
        };

        if (this.useFirebase) {
            try {
                // firebaseMessageService.sendMessage attend messageData, pas message
                const result = await firebaseMessageService.sendMessage({
                    recipientEmail: message.recipient_email,
                    title: message.title,
                    content: message.content,
                    messageType: message.message_type,
                    metadata: message.metadata
                });
                // Convertir le timestamp Firestore en ISO pour compatibilité
                if (result && result.created_at) {
                    const timestamp = result.created_at.toMillis ? result.created_at.toMillis() : result.created_at.seconds * 1000;
                    result.created_at = new Date(timestamp).toISOString();
                }
                return result;
            } catch (error) {
                console.error('Erreur lors de l\'envoi du message vers Firebase:', error);
                // Fallback vers localStorage seulement en cas d'erreur
                message.id = this.generateId();
                message.created_at = new Date().toISOString();
                return this.sendMessageToLocalStorage(message);
            }
        } else {
            // Utiliser uniquement localStorage
            message.id = this.generateId();
            message.created_at = new Date().toISOString();
            return this.sendMessageToLocalStorage(message);
        }
    }

    // Envoyer un message vers localStorage
    sendMessageToLocalStorage(message) {
        try {
            const messages = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
            messages.push(message);
            localStorage.setItem(this.storageKey, JSON.stringify(messages));
            return message;
        } catch (e) {
            console.error('Erreur lors de l\'envoi du message:', e);
            return null;
        }
    }

    // Générer un ID unique
    generateId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Obtenir les types de messages disponibles
    getMessageTypes() {
        return {
            'info': { label: 'Information', icon: 'fa-info-circle', color: '#3498db' },
            'warning': { label: 'Avertissement', icon: 'fa-exclamation-triangle', color: '#f39c12' },
            'ban': { label: 'Bannissement', icon: 'fa-ban', color: '#e74c3c' },
            'thank': { label: 'Remerciement', icon: 'fa-heart', color: '#2ecc71' },
            'global': { label: 'Annonce globale', icon: 'fa-bullhorn', color: '#9b59b6' }
        };
    }

    // Obtenir la classe CSS selon le type de message
    getMessageTypeClass(messageType) {
        const types = {
            'info': 'message-info',
            'warning': 'message-warning',
            'ban': 'message-ban',
            'thank': 'message-thank',
            'global': 'message-global'
        };
        return types[messageType] || 'message-info';
    }
}

// Exporter une instance unique
export const messageService = new MessageService();

