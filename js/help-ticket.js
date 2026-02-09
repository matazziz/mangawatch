/**
 * Module Aide / Support - Ouverture du modal et envoi du ticket
 * Utilise Firestore pour stocker le ticket.
 */
(function() {
  const ADMIN_EMAIL = 'mangawatch.off@gmail.com';

  function t(key) {
    return (window.localization && window.localization.get(key)) || key;
  }
  function getHelpLocale() {
    const lang = (window.localization && window.localization.currentLanguage) || localStorage.getItem('mangaWatchLanguage') || 'fr';
    const map = { fr: 'fr-FR', en: 'en-US', de: 'de-DE', es: 'es-ES', it: 'it-IT', ja: 'ja-JP' };
    return map[lang] || 'fr-FR';
  }

  function getModalHTML() {
    return `
    <div id="help-ticket-overlay" class="help-ticket-overlay">
      <div class="help-ticket-modal">
        <div class="help-ticket-header">
          <h2><i class="fas fa-circle-question"></i> ${t('help.ticket_title')}</h2>
          <button type="button" class="help-ticket-close" aria-label="${t('help.close')}">&times;</button>
        </div>
        <div class="help-ticket-tabs">
          <button type="button" class="help-ticket-tab active" data-tab="new">${t('help.new_ticket')}</button>
          <button type="button" class="help-ticket-tab" data-tab="list">${t('help.my_tickets')}</button>
        </div>
        <div id="help-ticket-panel-new" class="help-ticket-panel active">
          <form id="help-ticket-form" class="help-ticket-form">
            <label for="help-ticket-subject">${t('help.ticket_subject')} *</label>
            <input type="text" id="help-ticket-subject" name="subject" required placeholder="${t('help.placeholder_subject')}" maxlength="200">
            <label for="help-ticket-message">${t('help.ticket_message')} *</label>
            <textarea id="help-ticket-message" name="message" required rows="5" placeholder="${t('help.placeholder_message')}" maxlength="2000"></textarea>
            <div class="help-ticket-actions">
              <button type="button" class="help-ticket-btn help-ticket-cancel">${t('help.ticket_cancel')}</button>
              <button type="submit" class="help-ticket-btn help-ticket-submit"><i class="fas fa-paper-plane"></i> ${t('help.ticket_send')}</button>
            </div>
          </form>
        </div>
        <div id="help-ticket-panel-list" class="help-ticket-panel">
          <div id="help-ticket-list-content"><p class="help-ticket-loading">${t('help.loading')}</p></div>
        </div>
      </div>
    </div>`;
  }

  function injectStyles() {
    if (document.getElementById('help-ticket-styles')) return;
    const style = document.createElement('style');
    style.id = 'help-ticket-styles';
    style.textContent = `
      .help-ticket-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10100;
        padding: 20px;
        box-sizing: border-box;
      }
      .help-ticket-modal {
        background: linear-gradient(180deg, #1a1d2e 0%, #23262f 100%);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      }
      .help-ticket-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .help-ticket-header h2 {
        margin: 0;
        font-size: 1.25rem;
        color: #00c45d;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .help-ticket-close {
        background: none;
        border: none;
        color: #aaa;
        font-size: 1.75rem;
        cursor: pointer;
        line-height: 1;
        padding: 0 0.25rem;
      }
      .help-ticket-close:hover { color: #fff; }
      .help-ticket-tabs {
        display: flex;
        gap: 0;
        padding: 0 1.25rem;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .help-ticket-tab {
        padding: 0.75rem 1rem;
        background: none;
        border: none;
        color: #888;
        font-size: 0.95rem;
        cursor: pointer;
        border-bottom: 2px solid transparent;
      }
      .help-ticket-tab:hover { color: #ddd; }
      .help-ticket-tab.active { color: #00c45d; border-bottom-color: #00c45d; }
      .help-ticket-panel { display: none; padding: 1.25rem; }
      .help-ticket-panel.active { display: block; }
      .help-ticket-loading { color: #888; margin: 0; }
      .help-ticket-list { list-style: none; margin: 0; padding: 0; }
      .help-ticket-list li {
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        background: rgba(255,255,255,0.06);
        border-radius: 8px;
        cursor: pointer;
        border-left: 3px solid #00c45d;
      }
      .help-ticket-list li:hover { background: rgba(255,255,255,0.1); }
      .help-ticket-list li.closed { border-left-color: #666; opacity: 0.85; }
      .help-ticket-thread-view { margin-top: 0; }
      .help-ticket-thread-view .back { margin-bottom: 1rem; color: #00c45d; cursor: pointer; font-size: 0.9rem; }
      .help-ticket-thread-view .thread-msg { padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 8px; font-size: 0.9rem; }
      .help-ticket-thread-view .thread-msg.user { background: rgba(116,185,255,0.15); border-left: 3px solid #74b9ff; }
      .help-ticket-thread-view .thread-msg.admin { background: rgba(0,196,93,0.12); border-left: 3px solid #00c45d; }
      .help-ticket-closed-box {
        margin-top: 1rem;
        padding: 1rem;
        background: rgba(149, 165, 166, 0.12);
        border: 1px solid rgba(149, 165, 166, 0.25);
        border-radius: 12px;
        color: #b2bec3;
        text-align: center;
      }
      .help-ticket-closed-box i { font-size: 1.5rem; margin-bottom: 0.5rem; display: block; color: #95a5a6; }
      .help-ticket-closed-box strong { color: #dfe6e9; }
      .help-ticket-close-confirm-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10600;
        padding: 20px;
      }
      .help-ticket-close-confirm-box {
        background: linear-gradient(180deg, #1a1d2e 0%, #23262f 100%);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        padding: 1.5rem;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      }
      .help-ticket-close-confirm-box h4 { margin: 0 0 0.5rem 0; color: #00c45d; font-size: 1.15rem; display: flex; align-items: center; gap: 0.5rem; }
      .help-ticket-close-confirm-box p { margin: 0; color: #aaa; font-size: 0.95rem; line-height: 1.5; }
      .help-ticket-close-confirm-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; justify-content: flex-end; }
      .help-ticket-close-confirm-actions button { padding: 0.6rem 1.2rem; border-radius: 10px; font-weight: 600; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 0.5rem; }
      .help-ticket-close-confirm-actions .cancel { background: rgba(255,255,255,0.1); color: #ddd; }
      .help-ticket-close-confirm-actions .confirm { background: linear-gradient(135deg, #95a5a6, #7f8c8d); color: #fff; }
      .help-ticket-form {
        padding: 0;
      }
      .help-ticket-form label {
        display: block;
        margin-bottom: 0.35rem;
        color: #ddd;
        font-size: 0.9rem;
      }
      .help-ticket-form input,
      .help-ticket-form textarea {
        width: 100%;
        padding: 0.75rem;
        margin-bottom: 1rem;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 8px;
        color: #fff;
        font-family: inherit;
        font-size: 1rem;
        box-sizing: border-box;
      }
      .help-ticket-form textarea { resize: vertical; min-height: 100px; }
      .help-ticket-form input::placeholder,
      .help-ticket-form textarea::placeholder { color: #888; }
      .help-ticket-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        margin-top: 1rem;
      }
      .help-ticket-btn {
        padding: 0.6rem 1.2rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.95rem;
        border: none;
        transition: all 0.2s ease;
      }
      .help-ticket-cancel {
        background: rgba(255,255,255,0.1);
        color: #ddd;
      }
      .help-ticket-cancel:hover { background: rgba(255,255,255,0.15); color: #fff; }
      .help-ticket-submit {
        background: #00c45d;
        color: #0a0a0a;
      }
      .help-ticket-submit:hover { background: #00ffb0; }
      .help-ticket-submit:disabled { opacity: 0.6; cursor: not-allowed; }
      @keyframes helpTicketFadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes helpTicketFadeOut { from { opacity: 1; } to { opacity: 0; } }
    `;
    document.head.appendChild(style);
  }

  function showToast(message, type) {
    const notification = document.createElement('div');
    notification.className = 'help-ticket-toast ' + (type || 'success');
    notification.style.cssText = 'position:fixed;top:90px;right:20px;padding:14px 20px;border-radius:8px;color:#fff;font-weight:600;z-index:10200;box-shadow:0 4px 12px rgba(0,0,0,0.3);animation:helpTicketFadeIn 0.3s ease;';
    if (type === 'error') notification.style.background = '#e17055';
    else notification.style.background = '#00b894';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(function() {
      notification.style.animation = 'helpTicketFadeOut 0.3s ease';
      setTimeout(function() { notification.remove(); }, 300);
    }, 4000);
  }

  function showCloseTicketConfirmModal(ticket, getTicketService, loadMyTickets, showToast) {
    const overlay = document.createElement('div');
    overlay.className = 'help-ticket-close-confirm-overlay';
    overlay.innerHTML = '<div class="help-ticket-close-confirm-box"><h4><i class="fas fa-lock"></i> ' + t('help.close_ticket_confirm_title') + '</h4><p>' + t('help.close_ticket_confirm_desc') + '</p><div class="help-ticket-close-confirm-actions"><button type="button" class="cancel"><i class="fas fa-times"></i> ' + t('help.ticket_cancel') + '</button><button type="button" class="confirm"><i class="fas fa-lock"></i> ' + t('help.close_ticket_confirm_btn') + '</button></div></div>';
    document.body.appendChild(overlay);
    function close() {
      overlay.remove();
    }
    overlay.querySelector('.cancel').addEventListener('click', close);
    overlay.querySelector('.confirm').addEventListener('click', function() {
      overlay.querySelector('.confirm').disabled = true;
      (async function() {
        try {
          const svc = await getTicketService();
          await svc.closeTicket(ticket.id, 'user');
          close();
          showToast(t('help.ticket_closed_toast'), 'success');
          loadMyTickets();
        } catch (err) {
          console.error(err);
          showToast(t('help.close_error'), 'error');
          overlay.querySelector('.confirm').disabled = false;
        }
      })();
    });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) close();
    });
  }

  function openHelpModal() {
    injectStyles();
    let overlay = document.getElementById('help-ticket-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      return;
    }
    const wrap = document.createElement('div');
    wrap.innerHTML = getModalHTML();
    overlay = wrap.firstElementChild;
    document.body.appendChild(overlay);

    const form = document.getElementById('help-ticket-form');
    const closeBtn = overlay.querySelector('.help-ticket-close');
    const cancelBtn = overlay.querySelector('.help-ticket-cancel');

    function closeModal() {
      overlay.style.display = 'none';
    }

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });

    async function getTicketService() {
      if (window.supportTicketService) return window.supportTicketService;
      var firebasePath = (window.location && window.location.pathname && window.location.pathname.indexOf('/pages/') !== -1) ? '../js/firebase-service.js' : 'js/firebase-service.js';
      try {
        var mod = await import(firebasePath);
        if (mod && mod.supportTicketService) return mod.supportTicketService;
      } catch (e) {
        try {
          var m = await import('/js/firebase-service.js');
          if (m && m.supportTicketService) return m.supportTicketService;
        } catch (_) {}
      }
      return null;
    }

    function switchTab(tabName) {
      overlay.querySelectorAll('.help-ticket-tab').forEach(function(t) { t.classList.toggle('active', t.getAttribute('data-tab') === tabName); });
      overlay.querySelectorAll('.help-ticket-panel').forEach(function(p) { p.classList.toggle('active', (tabName === 'new' ? p.id === 'help-ticket-panel-new' : p.id === 'help-ticket-panel-list')); });
      if (tabName === 'list') loadMyTickets();
    }

    overlay.querySelectorAll('.help-ticket-tab').forEach(function(btn) {
      btn.addEventListener('click', function() { switchTab(this.getAttribute('data-tab')); });
    });

    async function loadMyTickets() {
      const container = document.getElementById('help-ticket-list-content');
      if (!container) return;
      let userEmail = null;
      try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user && user.email) userEmail = user.email;
      } catch (_) {}
      if (!userEmail) {
        container.innerHTML = '<p style="color:#888;">' + t('help.login_to_see') + '</p>';
        return;
      }
      container.innerHTML = '<p class="help-ticket-loading">' + t('help.loading_tickets') + '</p>';
      try {
        const svc = await getTicketService();
        if (!svc || typeof svc.getTicketsForUser !== 'function') {
          container.innerHTML = '<p style="color:#888;">' + t('help.service_unavailable') + '</p>';
          return;
        }
        const tickets = await svc.getTicketsForUser(userEmail);
        if (!tickets || tickets.length === 0) {
          container.innerHTML = '<p style="color:#888;">' + t('help.no_tickets') + '</p>';
          return;
        }
        const locale = getHelpLocale();
        container.innerHTML = '<ul class="help-ticket-list">' + tickets.map(function(tkt) {
          const status = tkt.status || 'new';
          const closed = status === 'closed';
          const date = tkt.created_at ? new Date(tkt.created_at).toLocaleString(locale) : '';
          const subj = (tkt.subject || t('help.no_subject')).replace(/</g, '&lt;');
          return '<li class="' + (closed ? 'closed' : '') + '" data-ticket-id="' + tkt.id + '"><strong>' + subj + '</strong><br><span style="color:#888;font-size:0.85rem;">' + date + ' · ' + (closed ? t('help.closed') : t('help.in_progress')) + '</span></li>';
        }).join('') + '</ul>';
        container.querySelectorAll('.help-ticket-list li').forEach(function(li) {
          li.addEventListener('click', function() {
            const ticketId = this.getAttribute('data-ticket-id');
            const ticket = tickets.find(function(t) { return t.id === ticketId; });
            if (ticket) showTicketThread(ticket, container, tickets, userEmail, loadMyTickets, getTicketService, showToast);
          });
        });
      } catch (err) {
        console.error('Erreur chargement tickets:', err);
        let errMsg = t('help.load_error');
        if (err && err.message) {
          if (err.message.indexOf('index') !== -1 || err.code === 'failed-precondition') {
            errMsg = t('help.load_error_index');
          } else if (err.code === 'permission-denied' || (err.message && err.message.indexOf('permission') !== -1)) {
            errMsg = t('help.load_error_permission');
          }
        }
        container.innerHTML = '<p style="color:#e74c3c;">' + errMsg + '</p>';
      }
    }

    function showTicketThread(ticket, container, tickets, userEmail, loadMyTickets, getTicketService, showToast) {
      const closed = (ticket.status || '') === 'closed';
      const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
      const subject = (ticket.subject || t('help.no_subject')).replace(/</g, '&lt;');
      const initialMsg = (ticket.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      const locale = getHelpLocale();
      let threadHtml = '<div class="help-ticket-thread-view"><div class="back" data-action="back">&larr; ' + t('help.back_to_list') + '</div><h3 style="margin:0 0 0.75rem 0;color:#00c45d;">' + subject + '</h3><div class="thread-msg user"><strong>' + t('help.your_message') + '</strong><br>' + initialMsg + '</div>';
      messages.forEach(function(m) {
        const body = (m.body || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        const date = m.created_at ? new Date(m.created_at).toLocaleString(locale) : '';
        const cls = m.from === 'admin' ? 'admin' : 'user';
        const who = m.from === 'admin' ? t('help.support') : t('help.you');
        threadHtml += '<div class="thread-msg ' + cls + '"><strong>' + who + '</strong>' + (date ? ' · ' + date : '') + '<br>' + body + '</div>';
      });
      threadHtml += '</div>';
      if (!closed) {
        threadHtml += '<div style="margin-top:1rem;"><label style="display:block;margin-bottom:0.5rem;color:#ddd;">' + t('help.your_reply') + '</label><textarea id="help-ticket-reply-body" rows="3" style="width:100%;padding:0.75rem;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;box-sizing:border-box;font-family:inherit;"></textarea><div style="margin-top:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap;"><button type="button" class="help-ticket-btn help-ticket-submit" id="help-ticket-reply-btn"><i class="fas fa-reply"></i> ' + t('help.send_reply') + '</button><button type="button" class="help-ticket-btn help-ticket-cancel" id="help-ticket-close-ticket-btn"><i class="fas fa-lock"></i> ' + t('help.close_ticket_btn') + '</button></div></div>';
      } else {
        threadHtml += '<div class="help-ticket-closed-box"><i class="fas fa-lock"></i><p><strong>' + t('help.conversation_closed') + '</strong></p><p>' + t('help.conversation_closed_desc') + '</p></div>';
      }
      container.innerHTML = threadHtml;
      container.querySelector('.back[data-action="back"]').addEventListener('click', function() { loadMyTickets(); });
      if (!closed) {
        document.getElementById('help-ticket-reply-btn').addEventListener('click', async function() {
          const textarea = document.getElementById('help-ticket-reply-body');
          const body = textarea ? textarea.value.trim() : '';
          if (!body) return;
          var btn = this;
          btn.disabled = true;
          try {
            const svc = await getTicketService();
            await svc.addReplyToTicket(ticket.id, 'user', body, userEmail);
            showToast(t('help.reply_sent'), 'success');
            var t = tickets.find(function(x) { return x.id === ticket.id; });
            if (t) { t.messages = t.messages || []; t.messages.push({ from: 'user', body: body, created_at: new Date().toISOString() }); }
            showTicketThread(t, container, tickets, userEmail, loadMyTickets, getTicketService, showToast);
          } catch (err) {
            console.error(err);
            showToast(t('help.reply_error'), 'error');
          }
          btn.disabled = false;
        });
        document.getElementById('help-ticket-close-ticket-btn').addEventListener('click', function() {
          showCloseTicketConfirmModal(ticket, getTicketService, loadMyTickets, showToast);
        });
      }
    }

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const subject = (document.getElementById('help-ticket-subject').value || '').trim();
      const message = (document.getElementById('help-ticket-message').value || '').trim();
      if (!subject || !message) return;

      const submitBtn = form.querySelector('.help-ticket-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = '…';

      try {
        let userEmail = null;
        let userName = null;
        try {
          const user = JSON.parse(localStorage.getItem('user') || 'null');
          if (user && user.email) {
            userEmail = user.email;
            userName = user.displayName || user.username || user.pseudo || user.email;
          }
        } catch (_) {}

        let ticketService = window.supportTicketService;
        if (!ticketService) {
          var firebasePath = '/js/firebase-service.js';
          if (typeof window !== 'undefined' && window.location && window.location.pathname) {
            if (window.location.pathname.indexOf('/pages/') !== -1) {
              firebasePath = '../js/firebase-service.js';
            } else if (!window.location.pathname.startsWith('/') || window.location.pathname === '/' || window.location.pathname.lastIndexOf('/') <= 0) {
              firebasePath = 'js/firebase-service.js';
            }
          }
          try {
            var mod = await import(firebasePath);
            if (mod && mod.supportTicketService) ticketService = mod.supportTicketService;
          } catch (e) {
            try {
              mod = await import('/js/firebase-service.js');
              if (mod && mod.supportTicketService) ticketService = mod.supportTicketService;
            } catch (_) {}
          }
        }
        if (!ticketService || typeof ticketService.createTicket !== 'function') {
          throw new Error('Firebase non disponible. Chargez firebase-service.js sur cette page (lien Aide).');
        }
        await ticketService.createTicket({
          subject,
          message,
          userEmail,
          userName,
          page: window.location ? window.location.href : ''
        });

        closeModal();
        form.reset();
        const t = window.localization ? window.localization.get.bind(window.localization) : function(k) { return k; };
        showToast(t('help.ticket_success'), 'success');
      } catch (err) {
        console.error('Erreur envoi ticket:', err);
        const t = window.localization ? window.localization.get.bind(window.localization) : function(k) { return k; };
        var isPermissionError = (err && (err.code === 'permission-denied' || (err.message && (err.message.indexOf('permission') !== -1 || err.message.indexOf('insufficient permissions') !== -1))));
        if (isPermissionError) {
          closeModal();
          var mailSubject = encodeURIComponent(subject || 'Aide MangaWatch');
          var mailBody = encodeURIComponent((message || '') + '\n\n--\nPage: ' + (window.location ? window.location.href : ''));
          var mailto = 'mailto:' + ADMIN_EMAIL + '?subject=' + mailSubject + '&body=' + mailBody;
          if (confirm(t('help.tickets_not_enabled_confirm'))) {
            window.location.href = mailto;
          }
        } else {
          showToast(t('help.ticket_error'), 'error');
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> ' + t('help.ticket_send');
      }
    });
  }

  function initHelpLinks() {
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a[data-help-ticket], .footer-help-link, [href="#help-ticket"]');
      if (link) {
        e.preventDefault();
        openHelpModal();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHelpLinks);
  } else {
    initHelpLinks();
  }

  window.openHelpTicketModal = openHelpModal;
})();
