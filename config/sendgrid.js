// Configuration SendGrid pour MangaWatch
const config = {
    // Configuration SendGrid
    sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY || 'your_sendgrid_api_key_here',
        fromEmail: process.env.FROM_EMAIL || 'noreply@mangawatch.com',
        fromName: process.env.FROM_NAME || 'MangaWatch',
        templates: {
            welcome: process.env.WELCOME_TEMPLATE_ID || 'd-welcome-template-id',
            confirmation: process.env.CONFIRMATION_TEMPLATE_ID || 'd-confirmation-template-id',
            passwordReset: process.env.PASSWORD_RESET_TEMPLATE_ID || 'd-password-reset-template-id'
        }
    },
    
    // Configuration de l'application
    app: {
        name: 'MangaWatch',
        url: process.env.APP_URL || 'http://localhost:3000',
        logo: process.env.APP_LOGO || 'https://mangawatch.com/logo.png'
    },
    
    // Mode de fonctionnement
    mode: process.env.NODE_ENV || 'development', // 'development' ou 'production'
    
    // Limites d'envoi
    limits: {
        maxEmailsPerDay: 100, // Limite gratuite SendGrid
        maxEmailsPerHour: 10
    }
};

module.exports = config;
