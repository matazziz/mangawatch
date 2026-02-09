/**
 * Cloud Function : à chaque nouveau ticket d'aide dans support_tickets,
 * envoie un email de notification à mangawatch.off@gmail.com
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

const ADMIN_EMAIL = 'mangawatch.off@gmail.com';

admin.initializeApp();

function getSendGridConfig() {
  return {
    apikey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.FROM_EMAIL || 'noreply@mangawatch.fr',
  };
}

function escapeHtml(s) {
  if (s == null || typeof s !== 'string') return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

exports.onSupportTicketCreated = functions.firestore
  .document('support_tickets/{ticketId}')
  .onCreate(async (snap, context) => {
    const ticketId = context.params.ticketId;
    const data = snap.data() || {};
    const subject = (data.subject || 'Sans sujet').substring(0, 80);
    const message = data.message || '-';
    const userEmail = data.user_email || 'Non renseigné';
    const userName = data.user_name || 'Anonyme';
    const page = data.page || '-';

    const { apikey, fromEmail } = getSendGridConfig();
    if (!apikey || apikey === 'your_sendgrid_api_key_here') {
      console.warn('[onSupportTicketCreated] SENDGRID_API_KEY non configurée - email non envoyé. Ticket ID:', ticketId);
      return null;
    }

    sgMail.setApiKey(apikey);

    const html = `
      <h2>Nouveau ticket d'aide MangaWatch</h2>
      <p><strong>ID ticket :</strong> ${escapeHtml(ticketId)}</p>
      <p><strong>Sujet :</strong> ${escapeHtml(subject)}</p>
      <p><strong>Message :</strong></p>
      <pre style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:8px;">${escapeHtml(message)}</pre>
      <p><strong>Utilisateur :</strong> ${escapeHtml(userName)}</p>
      <p><strong>Email :</strong> ${escapeHtml(userEmail)}</p>
      <p><strong>Page :</strong> ${escapeHtml(page)}</p>
      <p><em>Reçu le ${new Date().toLocaleString('fr-FR')}</em></p>
    `;

    const msg = {
      to: ADMIN_EMAIL,
      from: { email: fromEmail, name: 'MangaWatch Aide' },
      subject: `[MangaWatch Aide] ${subject}`,
      html,
      text: `Ticket ${ticketId}\nSujet: ${subject}\n\nMessage: ${message}\n\nUtilisateur: ${userName}\nEmail: ${userEmail}\nPage: ${page}`,
    };

    try {
      await sgMail.send(msg);
      console.log('[onSupportTicketCreated] Email envoyé à', ADMIN_EMAIL, 'pour ticket', ticketId);
      return null;
    } catch (err) {
      console.error('[onSupportTicketCreated] Erreur SendGrid:', err);
      throw err;
    }
  });

// Réponse au ticket : envoyée dans la messagerie du site (admin page), pas par email.
// Pas de Cloud Function onSupportTicketUpdated.
