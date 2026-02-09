const sgMail = require('@sendgrid/mail');
const config = require('../config/sendgrid');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
    constructor() {
        this.isProduction = config.mode === 'production';
        this.emailCount = 0;
        this.lastReset = new Date().toDateString();
        
        if (this.isProduction) {
            sgMail.setApiKey(config.sendgrid.apiKey);
        }
        
        // Créer le dossier de logs s'il n'existe pas
        this.ensureLogDirectory();
    }
    
    async ensureLogDirectory() {
        const logDir = path.join(__dirname, '../logs');
        try {
            await fs.access(logDir);
        } catch {
            await fs.mkdir(logDir, { recursive: true });
        }
    }
    
    async logEmail(type, to, subject, content) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type,
            to,
            subject,
            content: content.substring(0, 200) + '...', // Limiter la taille du log
            mode: config.mode
        };
        
        const logFile = path.join(__dirname, '../logs/email-logs.json');
        let logs = [];
        
        try {
            const existingLogs = await fs.readFile(logFile, 'utf8');
            logs = JSON.parse(existingLogs);
        } catch {
            // Fichier n'existe pas encore
        }
        
        logs.push(logEntry);
        
        // Garder seulement les 100 derniers logs
        if (logs.length > 100) {
            logs = logs.slice(-100);
        }
        
        await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
        
        console.log(`📧 [${type}] Email loggé: ${to} - ${subject}`);
    }
    
    async sendEmail(to, subject, htmlContent, textContent = null) {
        // Vérifier les limites
        if (!this.checkLimits()) {
            throw new Error('Limite d\'emails atteinte pour aujourd\'hui');
        }
        
        const emailData = {
            to,
            from: {
                email: config.sendgrid.fromEmail,
                name: config.sendgrid.fromName
            },
            subject,
            html: htmlContent,
            text: textContent || this.htmlToText(htmlContent)
        };
        
        try {
            if (this.isProduction) {
                // Mode production : envoyer avec SendGrid
                const response = await sgMail.send(emailData);
                this.emailCount++;
                await this.logEmail('SENT', to, subject, htmlContent);
                return { success: true, messageId: response[0].headers['x-message-id'] };
            } else {
                // Mode développement : logger seulement
                this.emailCount++;
                await this.logEmail('DEV', to, subject, htmlContent);
                return { success: true, messageId: 'dev-mode', mode: 'development' };
            }
        } catch (error) {
            await this.logEmail('ERROR', to, subject, `Erreur: ${error.message}`);
            throw error;
        }
    }
    
    htmlToText(html) {
        // Conversion simple HTML vers texte
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    checkLimits() {
        const today = new Date().toDateString();
        
        // Réinitialiser le compteur chaque jour
        if (today !== this.lastReset) {
            this.emailCount = 0;
            this.lastReset = today;
        }
        
        return this.emailCount < config.limits.maxEmailsPerDay;
    }
    
    // Méthodes spécifiques pour différents types d'emails
    async sendWelcomeEmail(user) {
        const subject = `Bienvenue sur ${config.app.name}, ${user.username} ! 🎉`;
        const htmlContent = await this.getWelcomeTemplate(user);
        
        return this.sendEmail(user.email, subject, htmlContent);
    }
    
    async sendLoginConfirmationEmail(user) {
        const subject = `Connexion confirmée sur ${config.app.name} 🔐`;
        const htmlContent = await this.getLoginConfirmationTemplate(user);
        
        return this.sendEmail(user.email, subject, htmlContent);
    }
    
    async sendPasswordResetEmail(user, resetToken) {
        const subject = `Réinitialisation de votre mot de passe ${config.app.name} 🔑`;
        const htmlContent = await this.getPasswordResetTemplate(user, resetToken);
        
        return this.sendEmail(user.email, subject, htmlContent);
    }
    
    async getWelcomeTemplate(user) {
        const templatePath = path.join(__dirname, '../templates/welcome.html');
        let template = await fs.readFile(templatePath, 'utf8');
        
        // Remplacer les variables du template
        template = template
            .replace('{{username}}', user.username)
            .replace('{{appName}}', config.app.name)
            .replace('{{appUrl}}', config.app.url)
            .replace('{{logo}}', config.app.logo);
        
        return template;
    }
    
    async getLoginConfirmationTemplate(user) {
        const templatePath = path.join(__dirname, '../templates/login-confirmation.html');
        let template = await fs.readFile(templatePath, 'utf8');
        
        template = template
            .replace('{{username}}', user.username)
            .replace('{{appName}}', config.app.name)
            .replace('{{appUrl}}', config.app.url)
            .replace('{{loginTime}}', new Date().toLocaleString('fr-FR'))
            .replace('{{logo}}', config.app.logo);
        
        return template;
    }
    
    async getPasswordResetTemplate(user, resetToken) {
        const templatePath = path.join(__dirname, '../templates/password-reset.html');
        let template = await fs.readFile(templatePath, 'utf8');
        
        const resetUrl = `${config.app.url}/reset-password?token=${resetToken}`;
        
        template = template
            .replace('{{username}}', user.username)
            .replace('{{appName}}', config.app.name)
            .replace('{{resetUrl}}', resetUrl)
            .replace('{{logo}}', config.app.logo);
        
        return template;
    }
    
    // Obtenir les statistiques d'envoi
    getStats() {
        return {
            mode: config.mode,
            emailsSentToday: this.emailCount,
            limit: config.limits.maxEmailsPerDay,
            remaining: config.limits.maxEmailsPerDay - this.emailCount
        };
    }
}

module.exports = EmailService;
