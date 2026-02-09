export class ErrorHandler {
    static handleApiError(error) {
        if (error.response) {
            // Le serveur a répondu avec un statut d'erreur
            const { status, data } = error.response;
            console.error(`Erreur API (${status}):`, data);
            return {
                error: true,
                message: data.message || 'Une erreur est survenue',
                status
            };
        } else if (error.request) {
            // La requête a été faite mais pas de réponse
            console.error('Erreur de réseau:', error.message);
            return {
                error: true,
                message: 'Impossible de se connecter au serveur',
                status: 0
            };
        } else {
            // Erreur de configuration de la requête
            console.error('Erreur de configuration:', error.message);
            return {
                error: true,
                message: 'Erreur de configuration de la requête',
                status: 0
            };
        }
    }

    static handleFormError(formErrors) {
        if (!formErrors || Object.keys(formErrors).length === 0) return null;

        const errorMessages = Object.entries(formErrors).map(([field, message]) => 
            `${field.charAt(0).toUpperCase() + field.slice(1)}: ${message}`
        );

        return errorMessages.join('\n');
    }

    static handleStorageError(error) {
        console.error('Erreur de stockage:', error);
        return {
            error: true,
            message: 'Erreur lors de l\'accès au stockage local',
            details: error.message
        };
    }

    static handleAuthError(error) {
        console.error('Erreur d\'authentification:', error);
        return {
            error: true,
            message: 'Erreur d\'authentification',
            details: error.message || 'Veuillez vous reconnecter'
        };
    }

    static showNotification(message, type = 'error') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}
