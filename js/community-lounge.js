/**
 * Forum communautaire — chat temps réel + salons personnalisés
 */

const BUILTIN_GENERAL = {
    id: 'general',
    name: 'général',
    description: 'Discussions libres',
    builtin: true
};

const DEFAULT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#0a0a0a"/></svg>'
);

const LOGO_FALLBACK = '/images/logo.png';

let currentChannel = 'general';
let unsubscribeMessages = null;
let unsubscribeChannels = null;
let pollVoteUnsubs = [];
let lastChannelMessages = [];
let pendingEditMessage = null;
let pendingDeleteMessage = null;
let customChannels = [];
let channelMap = new Map();
let allMembers = [];
let loungeService = null;

function t(key, fallback) {
    return (window.localization && window.localization.get(key)) || fallback;
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function descLengthClass(text) {
    const len = String(text || '').length;
    if (len > 100) return ' salon-desc-very-long';
    if (len > 45) return ' salon-desc-long';
    return '';
}

function applyChannelDesc(el, text) {
    if (!el) return;
    el.textContent = text;
    el.classList.remove('salon-desc-long', 'salon-desc-very-long');
    const len = String(text || '').length;
    if (len > 100) el.classList.add('salon-desc-very-long');
    else if (len > 45) el.classList.add('salon-desc-long');
}

const POLL_ALLOWED_DURATIONS = [0, 60, 360, 1440, 4320, 10080];
let pollTimerInterval = null;

function isPollClosed(msg) {
    if (!msg || !msg.closes_at) return false;
    return Date.now() >= Number(msg.closes_at);
}

function formatPollRemaining(ms) {
    const totalMin = Math.max(0, Math.ceil(ms / 60000));
    if (totalMin < 60) {
        return totalMin <= 1
            ? '1 min'
            : `${totalMin} min`;
    }
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    if (hours < 24) {
        return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
    }
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours > 0 ? `${days} j ${remHours} h` : `${days} j`;
}

function getPollDurationLabel(msg) {
    if (!msg || !msg.closes_at) return '';
    if (isPollClosed(msg)) {
        return t('salon.poll_closed', 'Sondage terminé');
    }
    const remaining = Number(msg.closes_at) - Date.now();
    return t('salon.poll_ends_in', 'Se termine dans {time}')
        .replace('{time}', formatPollRemaining(remaining));
}

function hasActiveTimedPolls(messages) {
    return (messages || []).some((m) => m.type === 'poll' && m.closes_at && !isPollClosed(m));
}

function startPollTimerIfNeeded(messages) {
    if (pollTimerInterval) {
        clearInterval(pollTimerInterval);
        pollTimerInterval = null;
    }
    if (!hasActiveTimedPolls(messages)) return;
    pollTimerInterval = setInterval(() => {
        if (!lastChannelMessages.length) return;
        if (!hasActiveTimedPolls(lastChannelMessages)) {
            clearInterval(pollTimerInterval);
            pollTimerInterval = null;
            return;
        }
        renderMessages(lastChannelMessages);
    }, 30000);
}

function getPollStats(msg) {
    const options = msg.options || [];
    const counts = options.map(() => 0);
    const votes = msg.poll_votes || {};
    let total = 0;
    Object.values(votes).forEach((idx) => {
        const n = Number(idx);
        if (n >= 0 && n < counts.length) {
            counts[n] += 1;
            total += 1;
        }
    });
    return { counts, total };
}

function renderPollHtml(msg) {
    const user = getLoggedInUser();
    const myEmail = user ? normalizeEmail(user.email) : '';
    const { counts, total } = getPollStats(msg);
    const myVote = myEmail && msg.poll_votes && msg.poll_votes[myEmail] !== undefined
        ? Number(msg.poll_votes[myEmail])
        : null;
    const closed = isPollClosed(msg);
    const voteLabel = total === 1
        ? t('salon.poll_votes_one', '1 vote')
        : t('salon.poll_votes', '{n} votes').replace('{n}', String(total));
    const durationLabel = getPollDurationLabel(msg);
    const durationClass = closed ? ' salon-poll-duration--closed' : ' salon-poll-duration--open';

    const optionsHtml = (msg.options || []).map((opt, i) => {
        const count = counts[i] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const selected = myVote === i ? ' selected' : '';
        const disabled = closed ? ' disabled' : '';
        return `
            <button type="button" class="salon-poll-option${selected}" data-poll-vote="${escapeHtml(msg.id)}" data-poll-opt="${i}"${disabled}>
                <span class="salon-poll-option-text">${escapeHtml(opt)}</span>
                <span class="salon-poll-option-track"><span class="salon-poll-option-fill" style="width:${pct}%"></span></span>
                <span class="salon-poll-option-stat">${pct}% · ${count}</span>
            </button>`;
    }).join('');

    const durationHtml = durationLabel
        ? `<span class="salon-poll-duration${durationClass}"><i class="fas fa-clock"></i> ${escapeHtml(durationLabel)}</span>`
        : '';

    return `
        <div class="salon-poll-card${closed ? ' salon-poll-card--closed' : ''}">
            <div class="salon-poll-meta">
                <div class="salon-poll-label"><i class="fas fa-chart-bar"></i> ${escapeHtml(t('salon.poll_label', 'Sondage'))}</div>
                ${durationHtml}
            </div>
            <p class="salon-poll-question">${escapeHtml(msg.question)}</p>
            <div class="salon-poll-options">${optionsHtml}</div>
            <div class="salon-poll-total">${escapeHtml(voteLabel)}</div>
        </div>`;
}

function isUserVerified(email) {
    const e = normalizeEmail(email);
    if (!e) return false;
    const member = allMembers.find((m) => normalizeEmail(m.email) === e);
    if (member && member.verified === true) return true;
    if (typeof window.isEmailInVerifiedList === 'function') {
        return window.isEmailInVerifiedList(e);
    }
    try {
        const list = JSON.parse(localStorage.getItem('verified_users') || '[]');
        return list.map(normalizeEmail).includes(e);
    } catch (_) {
        return false;
    }
}

function verifiedBadgeHtml() {
    return `<span class="salon-verified-badge" title="${escapeHtml(t('profile.certified_account', 'Compte certifié'))}"><i class="fas fa-check"></i></span>`;
}

function resolveAvatar(url) {
    const v = String(url || '').trim();
    if (!v || v === LOGO_FALLBACK || v.endsWith('/images/logo.png')) {
        return DEFAULT_AVATAR;
    }
    return v;
}

function avatarOnError(el) {
    el.onerror = null;
    el.src = DEFAULT_AVATAR;
    el.classList.add('salon-avatar-default');
}

function getLoggedInUser() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user && user.email) return user;
    } catch (e) { /* ignore */ }
    return null;
}

function getUserAvatarForSend(user) {
    if (!user) return null;
    const email = normalizeEmail(user.email);
    const raw = user.customAvatar || user.avatar || user.picture ||
        localStorage.getItem('avatar_' + email) || '';
    const v = String(raw).trim();
    if (!v || v === LOGO_FALLBACK || v.endsWith('/images/logo.png')) return null;
    return v;
}

function getUserName(user) {
    if (!user) return 'Invité';
    return user.name || user.username || user.email.split('@')[0];
}

function getChannelMeta(channelId) {
    return channelMap.get(channelId) || BUILTIN_GENERAL;
}

function channelInitial(name) {
    const n = String(name || '').trim();
    if (!n) return '#';
    return n.charAt(0).toUpperCase();
}

function formatMessageTime(ms) {
    const d = new Date(ms);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' +
        d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateDivider(ms) {
    const d = new Date(ms);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function isCommunityModerator(user) {
    if (!user) return false;
    if (typeof window.isCommunityModeratorEmail === 'function') {
        return window.isCommunityModeratorEmail(user.email);
    }
    const email = normalizeEmail(user.email);
    return email === 'mangawatch.off@gmail.com' || email === 'mathieubroyer190508@gmail.com';
}

function canManageMessage(msg) {
    const user = getLoggedInUser();
    if (!user || !msg) return false;
    if (normalizeEmail(msg.user_email) === normalizeEmail(user.email)) return true;
    return isCommunityModerator(user);
}

function findMemberByMention(token) {
    const q = String(token || '').trim().toLowerCase();
    if (!q) return null;
    return allMembers.find((m) => {
        const name = String(m.name || '').toLowerCase();
        const emailLocal = normalizeEmail(m.email).split('@')[0];
        return name === q || emailLocal === q || name.replace(/\s+/g, '') === q;
    }) || null;
}

function profileUrlByPseudo(pseudo) {
    return 'user-profile.html?pseudo=' + encodeURIComponent(pseudo);
}

function formatMessageText(text) {
    const raw = String(text || '');
    const parts = raw.split(/(@[a-zA-Z0-9_.-]{2,32})/g);
    return parts.map((part) => {
        if (!part.startsWith('@')) return escapeHtml(part);
        const pseudo = part.slice(1);
        const member = findMemberByMention(pseudo);
        if (member) {
            const display = member.name || pseudo;
            return `<a href="${profileUrl(member.email)}" class="salon-mention">@${escapeHtml(display)}</a>`;
        }
        return `<span class="salon-mention">@${escapeHtml(pseudo)}</span>`;
    }).join('');
}

function getMentionCandidates(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    return allMembers
        .filter((m) => {
            const name = String(m.name || '').toLowerCase();
            const emailLocal = normalizeEmail(m.email).split('@')[0];
            return name.includes(q) || emailLocal.includes(q);
        })
        .slice(0, 8);
}

function profileUrl(email) {
    return 'user-profile.html?user=' + encodeURIComponent(email);
}

function openSalonActionModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

function closeSalonActionModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function updateEditCharCount() {
    const textarea = document.getElementById('salon-edit-text');
    const counter = document.getElementById('salon-edit-char-count');
    if (!textarea || !counter) return;
    const max = Number(textarea.maxLength) || 2000;
    const len = textarea.value.length;
    counter.textContent = `${len} / ${max}`;
    counter.classList.toggle('is-near-limit', len >= max * 0.9 && len < max);
    counter.classList.toggle('is-at-limit', len >= max);
}

function truncatePreviewText(text, maxLen = 220) {
    const clean = String(text || '').trim();
    if (!clean) return '';
    if (clean.length <= maxLen) return clean;
    return `${clean.slice(0, maxLen).trimEnd()}…`;
}

function openEditMessageModal(msg) {
    if (!msg || msg.type === 'poll') return;
    pendingEditMessage = msg;
    const textarea = document.getElementById('salon-edit-text');
    const errEl = document.getElementById('salon-edit-error');
    if (textarea) {
        textarea.value = msg.text || '';
        updateEditCharCount();
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }, 50);
    }
    if (errEl) errEl.style.display = 'none';
    openSalonActionModal('salon-edit-modal');
}

function closeEditMessageModal() {
    pendingEditMessage = null;
    closeSalonActionModal('salon-edit-modal');
}

function openDeleteMessageModal(msg) {
    if (!msg) return;
    pendingDeleteMessage = msg;
    const preview = document.getElementById('salon-delete-preview');
    const previewText = document.getElementById('salon-delete-preview-text');
    const snippet = truncatePreviewText(msg.text);
    if (preview && previewText) {
        if (snippet) {
            previewText.textContent = snippet;
            preview.removeAttribute('aria-hidden');
        } else {
            previewText.textContent = '';
            preview.setAttribute('aria-hidden', 'true');
        }
    }
    openSalonActionModal('salon-delete-modal');
}

function closeDeleteMessageModal() {
    pendingDeleteMessage = null;
    closeSalonActionModal('salon-delete-modal');
}

async function editMessage(msg) {
    if (msg.type === 'poll') return;
    const user = getLoggedInUser();
    if (!user || !canManageMessage(msg) || !loungeService) return;
    openEditMessageModal(msg);
}

async function submitEditMessage() {
    const user = getLoggedInUser();
    const msg = pendingEditMessage;
    const textarea = document.getElementById('salon-edit-text');
    const errEl = document.getElementById('salon-edit-error');
    const submitBtn = document.getElementById('salon-edit-submit');
    if (!user || !msg || !loungeService || !textarea) return;

    const text = textarea.value.trim();
    if (!text) {
        if (errEl) {
            errEl.textContent = t('salon.edit_empty', 'Le message ne peut pas être vide.');
            errEl.style.display = 'block';
        }
        return;
    }
    if (errEl) errEl.style.display = 'none';

    if (submitBtn) submitBtn.disabled = true;
    try {
        await loungeService.updateMessage(currentChannel, msg.id, user.email, text);
        closeEditMessageModal();
    } catch (e) {
        if (errEl) {
            errEl.textContent = e.message || t('salon.edit_error', 'Impossible de modifier le message.');
            errEl.style.display = 'block';
        }
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

async function deleteMessage(msg) {
    const user = getLoggedInUser();
    if (!user || !canManageMessage(msg) || !loungeService) return;
    openDeleteMessageModal(msg);
}

async function confirmDeleteMessage() {
    const user = getLoggedInUser();
    const msg = pendingDeleteMessage;
    const confirmBtn = document.getElementById('salon-delete-confirm');
    if (!user || !msg || !loungeService) return;

    if (confirmBtn) confirmBtn.disabled = true;
    try {
        await loungeService.deleteMessage(currentChannel, msg.id, user.email);
        closeDeleteMessageModal();
    } catch (e) {
        alert(e.message || t('salon.delete_error', 'Impossible de supprimer le message.'));
    } finally {
        if (confirmBtn) confirmBtn.disabled = false;
    }
}

function setupMessageActionModals() {
    const editModal = document.getElementById('salon-edit-modal');
    const deleteModal = document.getElementById('salon-delete-modal');
    const editForm = document.getElementById('salon-edit-form');
    const editTextarea = document.getElementById('salon-edit-text');

    editTextarea?.addEventListener('input', updateEditCharCount);

    document.getElementById('salon-edit-modal-close')?.addEventListener('click', closeEditMessageModal);
    document.getElementById('salon-edit-cancel')?.addEventListener('click', closeEditMessageModal);
    document.getElementById('salon-delete-modal-close')?.addEventListener('click', closeDeleteMessageModal);
    document.getElementById('salon-delete-cancel')?.addEventListener('click', closeDeleteMessageModal);
    document.getElementById('salon-delete-confirm')?.addEventListener('click', confirmDeleteMessage);

    editModal && editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditMessageModal();
    });
    deleteModal && deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteMessageModal();
    });

    editForm && editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitEditMessage();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (editModal?.classList.contains('active')) closeEditMessageModal();
        if (deleteModal?.classList.contains('active')) closeDeleteMessageModal();
    });
}

async function deleteCurrentChannel() {
    const user = getLoggedInUser();
    const meta = getChannelMeta(currentChannel);
    if (!user || !loungeService || meta.builtin) return;
    const isOwner = normalizeEmail(meta.created_by) === normalizeEmail(user.email);
    if (!isOwner && !isCommunityModerator(user)) return;
    if (!confirm(t('salon.delete_channel_confirm', 'Supprimer définitivement ce salon et tous ses messages ?'))) return;
    try {
        await loungeService.deleteChannel(currentChannel, user.email);
        switchChannel(BUILTIN_GENERAL.id, true);
    } catch (e) {
        alert(e.message || t('salon.delete_channel_error', 'Impossible de supprimer le salon.'));
    }
}

function updateChannelDeleteButton() {
    const btn = document.getElementById('salon-channel-delete-btn');
    const user = getLoggedInUser();
    const meta = getChannelMeta(currentChannel);
    if (!btn) return;
    if (!user || meta.builtin || currentChannel === BUILTIN_GENERAL.id) {
        btn.style.display = 'none';
        return;
    }
    const isOwner = normalizeEmail(meta.created_by) === normalizeEmail(user.email);
    btn.style.display = (isOwner || isCommunityModerator(user)) ? 'inline-flex' : 'none';
}

function rebuildChannelMap() {
    channelMap = new Map();
    channelMap.set(BUILTIN_GENERAL.id, BUILTIN_GENERAL);
    customChannels.forEach((ch) => {
        channelMap.set(ch.id, ch);
    });
}

function renderChannelSidebar() {
    const container = document.getElementById('salon-channels-list');
    const drawerList = document.getElementById('salon-channels-drawer-list');
    if (!container && !drawerList) return;

    let html = `
        <button type="button" class="salon-channel-btn${currentChannel === BUILTIN_GENERAL.id ? ' active' : ''}"
                data-channel="${BUILTIN_GENERAL.id}" title="# ${escapeHtml(BUILTIN_GENERAL.name)}">
            <i class="fas fa-hashtag"></i>
        </button>`;

    if (customChannels.length) {
        html += '<div class="salon-channels-divider" aria-hidden="true"></div>';
        html += customChannels.map((ch) => `
            <button type="button" class="salon-channel-btn${currentChannel === ch.id ? ' active' : ''}"
                    data-channel="${escapeHtml(ch.id)}" title="# ${escapeHtml(ch.name)}">
                <span class="channel-initial">${escapeHtml(channelInitial(ch.name))}</span>
            </button>`).join('');
    }

    if (container) {
        container.innerHTML = html;
        container.querySelectorAll('.salon-channel-btn[data-channel]').forEach((btn) => {
            btn.addEventListener('click', () => switchChannel(btn.dataset.channel));
        });
    }

    if (drawerList) {
        let drawerHtml = `
            <button type="button" class="salon-drawer-channel${currentChannel === BUILTIN_GENERAL.id ? ' active' : ''}"
                    data-channel="${BUILTIN_GENERAL.id}">
                <span class="salon-drawer-channel-icon"><i class="fas fa-hashtag"></i></span>
                <span class="salon-drawer-channel-info">
                    <span class="salon-drawer-channel-name">${escapeHtml(BUILTIN_GENERAL.name)}</span>
                    <span class="salon-drawer-channel-desc${descLengthClass(BUILTIN_GENERAL.description)}">${escapeHtml(BUILTIN_GENERAL.description)}</span>
                </span>
            </button>`;

        drawerHtml += customChannels.map((ch) => {
            const descText = ch.description || t('salon.channel_default_desc', 'Salon de discussion');
            return `
            <button type="button" class="salon-drawer-channel${currentChannel === ch.id ? ' active' : ''}"
                    data-channel="${escapeHtml(ch.id)}">
                <span class="salon-drawer-channel-icon"><span class="channel-initial">${escapeHtml(channelInitial(ch.name))}</span></span>
                <span class="salon-drawer-channel-info">
                    <span class="salon-drawer-channel-name">${escapeHtml(ch.name)}</span>
                    <span class="salon-drawer-channel-desc${descLengthClass(descText)}">${escapeHtml(descText)}</span>
                </span>
            </button>`;
        }).join('');

        drawerList.innerHTML = drawerHtml;
        drawerList.querySelectorAll('.salon-drawer-channel[data-channel]').forEach((btn) => {
            btn.addEventListener('click', () => {
                switchChannel(btn.dataset.channel);
                closeSalonDrawers();
            });
        });
    }
}

function renderMessages(messages) {
    const container = document.getElementById('salon-messages');
    if (!container) return;

    if (!messages.length) {
        container.innerHTML = `
            <div class="salon-empty-chat">
                <i class="fas fa-comments"></i>
                <p>${escapeHtml(t('salon.empty', 'Aucun message pour l\'instant. Lancez la conversation !'))}</p>
            </div>`;
        return;
    }

    let html = '';
    let lastDate = '';

    messages.forEach((msg) => {
        const dateLabel = formatDateDivider(msg.created_at);
        if (dateLabel !== lastDate) {
            lastDate = dateLabel;
            html += `<div class="salon-date-divider"><span>${escapeHtml(dateLabel)}</span></div>`;
        }
        const avatar = resolveAvatar(msg.user_avatar);
        const verified = isUserVerified(msg.user_email);
        const showActions = canManageMessage(msg);
        const showEdit = showActions && msg.type !== 'poll';
        const editedLabel = msg.edited ? `<span class="salon-message-edited">(${t('salon.edited', 'modifié')})</span>` : '';
        const bodyHtml = msg.type === 'poll'
            ? renderPollHtml(msg)
            : `<div class="salon-message-text">${formatMessageText(msg.text)}</div>`;
        html += `
            <article class="salon-message${msg.type === 'poll' ? ' salon-message--poll' : ''}" data-id="${escapeHtml(msg.id)}">
                <img src="${escapeHtml(avatar)}" alt="" class="salon-message-avatar${avatar === DEFAULT_AVATAR ? ' salon-avatar-default' : ''}"
                     onerror="avatarOnError(this)"
                     onclick="window.location.href='${profileUrl(msg.user_email)}'">
                <div class="salon-message-body">
                    <div class="salon-message-meta">
                        <span class="salon-message-author" onclick="window.location.href='${profileUrl(msg.user_email)}'">${escapeHtml(msg.user_name)}</span>
                        ${verified ? verifiedBadgeHtml() : ''}
                        <time class="salon-message-time">${formatMessageTime(msg.created_at)}</time>
                        ${editedLabel}
                        ${showActions ? `
                        <span class="salon-message-actions">
                            ${showEdit ? `<button type="button" class="salon-msg-action" data-edit-msg="${escapeHtml(msg.id)}" title="${escapeHtml(t('salon.edit', 'Modifier'))}"><i class="fas fa-pen"></i></button>` : ''}
                            <button type="button" class="salon-msg-action danger" data-del-msg="${escapeHtml(msg.id)}" title="${escapeHtml(t('salon.delete', 'Supprimer'))}"><i class="fas fa-trash-alt"></i></button>
                        </span>` : ''}
                    </div>
                    ${bodyHtml}
                </div>
            </article>`;
    });

    container.innerHTML = html;
    container.querySelectorAll('[data-edit-msg]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-edit-msg');
            const msg = messages.find((m) => m.id === id);
            if (msg) editMessage(msg);
        });
    });
    container.querySelectorAll('[data-del-msg]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-del-msg');
            const msg = messages.find((m) => m.id === id);
            if (msg) deleteMessage(msg);
        });
    });
    startPollTimerIfNeeded(messages);
    container.scrollTop = container.scrollHeight;
}

function clearPollVoteListeners() {
    pollVoteUnsubs.forEach((unsub) => {
        try { unsub(); } catch (_) { /* ignore */ }
    });
    pollVoteUnsubs = [];
}

function watchPollVotes(messages) {
    clearPollVoteListeners();
    if (!loungeService || typeof loungeService.subscribeToPollVotes !== 'function') return;

    messages.filter((m) => m.type === 'poll').forEach((m) => {
        const unsub = loungeService.subscribeToPollVotes(currentChannel, m.id, (voteMap) => {
            const target = lastChannelMessages.find((x) => x.id === m.id);
            if (!target) return;
            target.poll_votes = voteMap;
            renderMessages(lastChannelMessages);
        });
        pollVoteUnsubs.push(unsub);
    });
}

async function voteOnPoll(messageId, optionIndex) {
    const user = getLoggedInUser();
    if (!user) {
        window.location.href = 'profil.html?redirect=salon.html';
        return;
    }
    if (!loungeService || !messageId) return;

    const msg = lastChannelMessages.find((m) => m.id === messageId);
    if (msg && isPollClosed(msg)) {
        alert(t('salon.poll_ended_error', 'Ce sondage est terminé.'));
        return;
    }

    const btn = document.querySelector(`.salon-poll-option[data-poll-vote="${CSS.escape(messageId)}"][data-poll-opt="${optionIndex}"]`);
    if (btn) btn.disabled = true;

    try {
        await loungeService.votePoll(currentChannel, messageId, optionIndex, user.email);
        const msg = lastChannelMessages.find((m) => m.id === messageId);
        if (msg && msg.type === 'poll' && typeof loungeService.fetchPollVotes === 'function') {
            msg.poll_votes = await loungeService.fetchPollVotes(currentChannel, messageId);
            renderMessages(lastChannelMessages);
        }
    } catch (e) {
        console.error('[Forum] Vote sondage:', e);
        const errMsg = e.code === 'auth/not-authenticated' || e.message === 'SESSION_FIREBASE_REQUISE'
            ? t('salon.auth_required', 'Reconnectez-vous pour envoyer un message.')
            : (e.message || t('salon.poll_vote_error', 'Impossible d\'enregistrer votre vote.'));
        alert(errMsg);
    } finally {
        if (btn) btn.disabled = false;
    }
}

function setupPollVoteClicks() {
    const container = document.getElementById('salon-messages');
    if (!container || container.dataset.pollVoteBound === '1') return;
    container.dataset.pollVoteBound = '1';
    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.salon-poll-option[data-poll-vote]');
        if (!btn || btn.disabled) return;
        e.preventDefault();
        e.stopPropagation();
        voteOnPoll(btn.getAttribute('data-poll-vote'), btn.getAttribute('data-poll-opt'));
    });
}

function renderMembers(filter) {
    const list = document.getElementById('salon-members-list');
    if (!list) return;

    const q = (filter || '').trim().toLowerCase();
    let members = allMembers
        .filter((u) => String(u.email || '').includes('@'))
        .map((u) => {
            const email = normalizeEmail(u.email);
            return {
                email,
                name: u.name || email.split('@')[0],
                avatar: resolveAvatar(u.avatar),
                verified: u.verified === true || isUserVerified(email)
            };
        });

    if (q) {
        members = members.filter((m) =>
            m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
        );
    }

    members.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    if (!members.length) {
        list.innerHTML = `<div class="salon-loading">${escapeHtml(t('salon.no_members', 'Aucun membre trouvé'))}</div>`;
        return;
    }

    list.innerHTML = members.map((m) => {
        const av = resolveAvatar(m.avatar);
        return `
            <a href="${profileUrl(m.email)}" class="salon-member">
                <div class="salon-member-avatar-wrap">
                    <img src="${escapeHtml(av)}" alt="" class="salon-member-avatar${av === DEFAULT_AVATAR ? ' salon-avatar-default' : ''}" onerror="avatarOnError(this)">
                </div>
                <div class="salon-member-info">
                    <span class="salon-member-name">${escapeHtml(m.name)}</span>
                    ${m.verified ? verifiedBadgeHtml() : ''}
                </div>
            </a>`;
    }).join('');

    const countEl = document.getElementById('salon-member-count');
    if (countEl) countEl.textContent = members.length;
}

function updateChannelHeader(channelId) {
    const meta = getChannelMeta(channelId);
    const title = document.getElementById('salon-channel-title');
    const desc = document.getElementById('salon-channel-desc');
    const input = document.getElementById('salon-message-input');
    const headerIcon = document.querySelector('.salon-channel-picker-icon');

    if (title) title.textContent = meta.name || channelId;
    if (desc) {
        const parts = [];
        if (meta.description) parts.push(meta.description);
        if (meta.created_by_name && !meta.builtin) {
            parts.push(t('salon.created_by', 'Créé par') + ' ' + meta.created_by_name);
        }
        applyChannelDesc(desc, parts.join(' · ') || t('salon.channel_default_desc', 'Salon de discussion'));
    }
    if (input) input.placeholder = t('salon.placeholder_in', 'Envoyer un message dans') + ' #' + (meta.name || channelId);
    if (headerIcon) {
        headerIcon.className = meta.builtin ? 'fas fa-hashtag' : 'fas fa-comments';
    }
    updateChannelDeleteButton();
}

function switchChannel(channelId, force) {
    if (!loungeService) return;
    const id = String(channelId || BUILTIN_GENERAL.id).trim().toLowerCase();
    if (!force && id === currentChannel) return;

    currentChannel = id;
    renderChannelSidebar();
    updateChannelHeader(id);

    if (unsubscribeMessages) unsubscribeMessages();
    clearPollVoteListeners();
    const messagesEl = document.getElementById('salon-messages');
    if (messagesEl) {
        messagesEl.innerHTML = `<div class="salon-loading"><i class="fas fa-spinner fa-spin"></i></div>`;
    }

    unsubscribeMessages = loungeService.subscribeToChannel(id, (messages) => {
        lastChannelMessages = messages;
        renderMessages(messages);
        watchPollVotes(messages);
    });
}

async function sendCurrentMessage() {
    const user = getLoggedInUser();
    if (!user) {
        window.location.href = 'profil.html?redirect=salon.html';
        return;
    }

    const input = document.getElementById('salon-message-input');
    const btn = document.getElementById('salon-send-btn');
    const text = (input && input.value || '').trim();
    if (!text || !loungeService) return;

    if (btn) btn.disabled = true;
    try {
        await loungeService.sendMessage(currentChannel, {
            user_email: user.email,
            user_name: getUserName(user),
            user_avatar: getUserAvatarForSend(user),
            text
        });
        input.value = '';
        input.style.height = 'auto';
    } catch (e) {
        console.error('[Forum] Envoi message:', e);
        const msg = e.code === 'auth/not-authenticated' || e.message === 'SESSION_FIREBASE_REQUISE'
            ? t('salon.auth_required', 'Reconnectez-vous pour envoyer un message.')
            : (e.message || t('salon.send_error', 'Impossible d\'envoyer le message.'));
        alert(msg);
    } finally {
        if (btn) btn.disabled = false;
        if (input) input.focus();
    }
}

function setupMentionAutocomplete(input) {
    const suggest = document.getElementById('salon-mention-suggest');
    if (!input || !suggest) return;

    let activeIndex = 0;
    let candidates = [];

    function hideSuggest() {
        suggest.style.display = 'none';
        suggest.innerHTML = '';
        candidates = [];
        activeIndex = 0;
    }

    function insertMention(name) {
        const val = input.value;
        const pos = input.selectionStart || val.length;
        const before = val.slice(0, pos);
        const after = val.slice(pos);
        const at = before.lastIndexOf('@');
        if (at < 0) return;
        const pseudo = String(name || '').replace(/\s+/g, '');
        input.value = before.slice(0, at) + '@' + pseudo + ' ' + after;
        hideSuggest();
        input.focus();
    }

    function renderSuggest(list) {
        candidates = list;
        if (!list.length) {
            hideSuggest();
            return;
        }
        suggest.innerHTML = list.map((m, i) => `
            <button type="button" class="salon-mention-item${i === activeIndex ? ' active' : ''}" data-idx="${i}">
                <img src="${escapeHtml(resolveAvatar(m.avatar))}" alt="" onerror="avatarOnError(this)">
                <span>${escapeHtml(m.name || m.email)}</span>
            </button>`).join('');
        suggest.style.display = 'block';
        suggest.querySelectorAll('.salon-mention-item').forEach((btn) => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const idx = Number(btn.getAttribute('data-idx'));
                if (candidates[idx]) insertMention(candidates[idx].name || candidates[idx].email.split('@')[0]);
            });
        });
    }

    input.addEventListener('input', () => {
        const val = input.value;
        const pos = input.selectionStart || val.length;
        const before = val.slice(0, pos);
        const at = before.lastIndexOf('@');
        if (at < 0 || (at > 0 && /\S/.test(before.charAt(at - 1)))) {
            hideSuggest();
            return;
        }
        const query = before.slice(at + 1);
        if (/\s/.test(query)) {
            hideSuggest();
            return;
        }
        renderSuggest(getMentionCandidates(query));
    });

    input.addEventListener('keydown', (e) => {
        if (suggest.style.display === 'none' || !candidates.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % candidates.length;
            renderSuggest(candidates);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + candidates.length) % candidates.length;
            renderSuggest(candidates);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            const m = candidates[activeIndex];
            if (m) insertMention(m.name || m.email.split('@')[0]);
        } else if (e.key === 'Escape') {
            hideSuggest();
        }
    });

    input.addEventListener('blur', () => {
        setTimeout(hideSuggest, 150);
    });
}

function setupCompose() {
    const user = getLoggedInUser();
    const compose = document.getElementById('salon-compose');
    const loginPrompt = document.getElementById('salon-login-prompt');

    if (!user) {
        if (compose) compose.style.display = 'none';
        if (loginPrompt) loginPrompt.style.display = 'block';
        return;
    }

    if (compose) compose.style.display = 'block';
    if (loginPrompt) loginPrompt.style.display = 'none';

    const input = document.getElementById('salon-message-input');
    const btn = document.getElementById('salon-send-btn');

    if (input) {
        setupMentionAutocomplete(input);
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 150) + 'px';
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendCurrentMessage();
            }
        });
    }
    if (btn) btn.addEventListener('click', sendCurrentMessage);
}

function isMobileSalonLayout() {
    return window.matchMedia('(max-width: 900px)').matches;
}

function closeSalonDrawers() {
    document.getElementById('salon-channels-drawer')?.classList.remove('open');
    document.getElementById('salon-members')?.classList.remove('open');
    document.getElementById('salon-drawer-overlay')?.classList.remove('visible');
    document.body.classList.remove('salon-drawer-open');
}

function openChannelsDrawer() {
    if (!isMobileSalonLayout()) return;
    closeSalonDrawers();
    document.getElementById('salon-channels-drawer')?.classList.add('open');
    document.getElementById('salon-drawer-overlay')?.classList.add('visible');
    document.body.classList.add('salon-drawer-open');
}

function openMembersDrawer() {
    if (!isMobileSalonLayout()) return;
    closeSalonDrawers();
    document.getElementById('salon-members')?.classList.add('open');
    document.getElementById('salon-drawer-overlay')?.classList.add('visible');
    document.body.classList.add('salon-drawer-open');
}

function setupMobileDrawers() {
    const membersBtn = document.getElementById('salon-mobile-members-btn');
    const membersClose = document.getElementById('salon-members-close');
    const channelsClose = document.getElementById('salon-channels-close');
    const channelPicker = document.getElementById('salon-channel-picker');
    const overlay = document.getElementById('salon-drawer-overlay');
    const membersList = document.getElementById('salon-members-list');
    const createDrawerBtn = document.getElementById('salon-create-channel-btn-drawer');

    membersBtn && membersBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const panel = document.getElementById('salon-members');
        if (panel?.classList.contains('open')) {
            closeSalonDrawers();
        } else {
            openMembersDrawer();
        }
    });

    channelPicker && channelPicker.addEventListener('click', () => {
        if (!isMobileSalonLayout()) return;
        const drawer = document.getElementById('salon-channels-drawer');
        if (drawer?.classList.contains('open')) {
            closeSalonDrawers();
        } else {
            openChannelsDrawer();
        }
    });

    membersClose && membersClose.addEventListener('click', closeSalonDrawers);
    channelsClose && channelsClose.addEventListener('click', closeSalonDrawers);
    overlay && overlay.addEventListener('click', closeSalonDrawers);

    membersList && membersList.addEventListener('click', (e) => {
        if (e.target.closest('.salon-member') && isMobileSalonLayout()) closeSalonDrawers();
    });

    createDrawerBtn && createDrawerBtn.addEventListener('click', () => {
        closeSalonDrawers();
        openCreateModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSalonDrawers();
    });
}

function setupMobileViewport() {
    const compose = document.getElementById('salon-compose');
    const messages = document.getElementById('salon-messages');
    if (!compose || !messages || !window.visualViewport) return;

    function adjustForKeyboard() {
        if (!window.matchMedia('(max-width: 768px)').matches) {
            compose.style.paddingBottom = '';
            return;
        }
        const vv = window.visualViewport;
        const keyboardOffset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        if (keyboardOffset > 50) {
            compose.style.paddingBottom = `calc(0.65rem + ${keyboardOffset}px)`;
            requestAnimationFrame(() => {
                messages.scrollTop = messages.scrollHeight;
            });
        } else {
            compose.style.paddingBottom = '';
        }
    }

    window.visualViewport.addEventListener('resize', adjustForKeyboard);
    window.visualViewport.addEventListener('scroll', adjustForKeyboard);
}

function openCreateModal() {
    const user = getLoggedInUser();
    if (!user) {
        window.location.href = 'profil.html?redirect=salon.html';
        return;
    }
    const modal = document.getElementById('salon-create-modal');
    const form = document.getElementById('salon-create-form');
    if (form) form.reset();
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.getElementById('salon-create-name')?.focus();
    }
}

function closeCreateModal() {
    const modal = document.getElementById('salon-create-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function setupCreateSalon() {
    const openBtn = document.getElementById('salon-create-channel-btn');
    const closeBtn = document.getElementById('salon-create-modal-close');
    const cancelBtn = document.getElementById('salon-create-cancel');
    const form = document.getElementById('salon-create-form');
    const modal = document.getElementById('salon-create-modal');

    openBtn && openBtn.addEventListener('click', openCreateModal);
    closeBtn && closeBtn.addEventListener('click', closeCreateModal);
    cancelBtn && cancelBtn.addEventListener('click', closeCreateModal);

    modal && modal.addEventListener('click', (e) => {
        if (e.target === modal) closeCreateModal();
    });

    form && form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = getLoggedInUser();
        if (!user || !loungeService) return;

        const nameInput = document.getElementById('salon-create-name');
        const descInput = document.getElementById('salon-create-desc');
        const msgInput = document.getElementById('salon-create-message');
        const submitBtn = document.getElementById('salon-create-submit');

        const name = (nameInput && nameInput.value || '').trim();
        const description = (descInput && descInput.value || '').trim();
        const firstMessage = (msgInput && msgInput.value || '').trim();

        if (!name || name.length < 2) {
            alert(t('salon.create_name_short', 'Le nom doit contenir au moins 2 caractères.'));
            return;
        }
        if (!firstMessage) {
            alert(t('salon.create_message_required', 'Écrivez un premier message pour créer le salon.'));
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        try {
            const created = await loungeService.createChannel({
                name,
                description,
                first_message: firstMessage,
                user_email: user.email,
                user_name: getUserName(user),
                user_avatar: getUserAvatarForSend(user)
            });
            closeCreateModal();
            switchChannel(created.id, true);
        } catch (err) {
            console.error('[Forum] Création salon:', err);
            const msg = err.code === 'auth/not-authenticated' || err.message === 'SESSION_FIREBASE_REQUISE'
                ? t('salon.auth_required', 'Reconnectez-vous pour créer un salon.')
                : (err.message || t('salon.create_error', 'Impossible de créer le salon.'));
            alert(msg);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

const POLL_OPTION_DEFAULTS = 3;
const POLL_OPTION_MAX = 6;
const POLL_OPTION_MIN = 2;

function getPollOptionValues() {
    return [...document.querySelectorAll('.salon-poll-option-input')].map((input) => input.value);
}

function renderPollOptionFields(optionValues) {
    const list = document.getElementById('salon-poll-options-list');
    if (!list) return;

    let values = Array.isArray(optionValues) ? optionValues.slice() : [];
    if (values.length < POLL_OPTION_MIN) {
        while (values.length < POLL_OPTION_DEFAULTS) values.push('');
    }
    if (values.length > POLL_OPTION_MAX) {
        values = values.slice(0, POLL_OPTION_MAX);
    }

    const canRemove = values.length > POLL_OPTION_MIN;
    list.innerHTML = values.map((value, i) => `
        <div class="salon-poll-option-field">
            <input type="text" class="salon-poll-option-input" maxlength="120" required
                   value="${escapeHtml(value)}"
                   placeholder="${escapeHtml(t('salon.poll_option_ph', 'Option'))} ${i + 1}">
            <button type="button" class="salon-poll-remove-option-btn"
                    data-poll-remove-option="${i}"
                    title="${escapeHtml(t('salon.poll_remove_option', 'Retirer cette option'))}"
                    aria-label="${escapeHtml(t('salon.poll_remove_option', 'Retirer cette option'))}"
                    ${canRemove ? '' : 'disabled'}>
                <i class="fas fa-minus"></i>
            </button>
        </div>
    `).join('');

    const addBtn = document.getElementById('salon-poll-add-option');
    if (addBtn) addBtn.style.display = values.length >= POLL_OPTION_MAX ? 'none' : '';
}

function addPollOptionField() {
    const values = getPollOptionValues();
    if (values.length >= POLL_OPTION_MAX) return;
    values.push('');
    renderPollOptionFields(values);
}

function removePollOptionField(index) {
    const values = getPollOptionValues();
    if (values.length <= POLL_OPTION_MIN) return;
    values.splice(index, 1);
    renderPollOptionFields(values);
}

function openPollModal() {
    const user = getLoggedInUser();
    if (!user) {
        window.location.href = 'profil.html?redirect=salon.html';
        return;
    }
    const modal = document.getElementById('salon-poll-modal');
    const form = document.getElementById('salon-poll-form');
    if (form) form.reset();
    renderPollOptionFields(Array(POLL_OPTION_DEFAULTS).fill(''));
    const durationSelect = document.getElementById('salon-poll-duration');
    if (durationSelect) durationSelect.value = '1440';
    if (modal) {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.getElementById('salon-poll-question')?.focus();
    }
}

function closePollModal() {
    const modal = document.getElementById('salon-poll-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
}

function setupCreatePoll() {
    const openBtn = document.getElementById('salon-create-poll-btn');
    const closeBtn = document.getElementById('salon-poll-modal-close');
    const cancelBtn = document.getElementById('salon-poll-cancel');
    const addBtn = document.getElementById('salon-poll-add-option');
    const form = document.getElementById('salon-poll-form');
    const modal = document.getElementById('salon-poll-modal');

    renderPollOptionFields(Array(POLL_OPTION_DEFAULTS).fill(''));

    openBtn && openBtn.addEventListener('click', openPollModal);
    closeBtn && closeBtn.addEventListener('click', closePollModal);
    cancelBtn && cancelBtn.addEventListener('click', closePollModal);

    addBtn && addBtn.addEventListener('click', addPollOptionField);

    const optionsList = document.getElementById('salon-poll-options-list');
    optionsList && optionsList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-poll-remove-option]');
        if (!btn || btn.disabled) return;
        const index = parseInt(btn.getAttribute('data-poll-remove-option'), 10);
        if (!Number.isNaN(index)) removePollOptionField(index);
    });

    modal && modal.addEventListener('click', (e) => {
        if (e.target === modal) closePollModal();
    });

    form && form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = getLoggedInUser();
        if (!user || !loungeService) return;

        const questionInput = document.getElementById('salon-poll-question');
        const durationSelect = document.getElementById('salon-poll-duration');
        const submitBtn = document.getElementById('salon-poll-submit');
        const question = (questionInput && questionInput.value || '').trim();
        const durationMinutes = parseInt(durationSelect && durationSelect.value, 10) || 0;
        const options = [...document.querySelectorAll('.salon-poll-option-input')]
            .map((input) => input.value.trim())
            .filter(Boolean);

        if (!question || question.length < 3) {
            alert(t('salon.poll_question', 'Question') + ' : 3 caractères minimum.');
            return;
        }
        if (options.length < 2) {
            alert(t('salon.poll_min_options', 'Ajoutez au moins 2 options.'));
            return;
        }
        if (!POLL_ALLOWED_DURATIONS.includes(durationMinutes)) {
            alert(t('salon.poll_error', 'Impossible de créer le sondage.'));
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        try {
            await loungeService.createPoll(currentChannel, {
                question,
                options,
                duration_minutes: durationMinutes,
                user_email: user.email,
                user_name: getUserName(user),
                user_avatar: getUserAvatarForSend(user)
            });
            closePollModal();
        } catch (err) {
            console.error('[Forum] Création sondage:', err);
            const msg = err.code === 'auth/not-authenticated' || err.message === 'SESSION_FIREBASE_REQUISE'
                ? t('salon.auth_required', 'Reconnectez-vous pour envoyer un message.')
                : (err.message || t('salon.poll_error', 'Impossible de créer le sondage.'));
            alert(msg);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

async function loadAllMembers() {
    try {
        const { profileAdminService } = await import('/js/firebase-service.js?v=salon3');
        if (profileAdminService && typeof profileAdminService.listAllUserProfiles === 'function') {
            allMembers = await profileAdminService.listAllUserProfiles();
        }
    } catch (e) {
        console.warn('[Forum] Chargement membres:', e);
        allMembers = [];
    }
    renderMembers(document.getElementById('salon-members-search')?.value || '');
}

export async function initCommunityLounge() {
        const { communityLoungeService, isCommunityModeratorEmail } = await import('/js/firebase-service.js?v=salon5');
    loungeService = communityLoungeService;
    if (typeof isCommunityModeratorEmail === 'function') {
        window.isCommunityModeratorEmail = isCommunityModeratorEmail;
    }

    rebuildChannelMap();
    renderChannelSidebar();

    const searchInput = document.getElementById('salon-members-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderMembers(searchInput.value));
    }

    setupCompose();
    setupPollVoteClicks();
    setupMessageActionModals();
    setupMobileDrawers();
    setupMobileViewport();
    setupCreateSalon();
    setupCreatePoll();

    const deleteChannelBtn = document.getElementById('salon-channel-delete-btn');
    deleteChannelBtn && deleteChannelBtn.addEventListener('click', deleteCurrentChannel);

    await loadAllMembers();

    unsubscribeChannels = loungeService.subscribeToChannels((channels) => {
        customChannels = channels.filter((c) => c.id !== BUILTIN_GENERAL.id && !c.builtin);
        rebuildChannelMap();
        renderChannelSidebar();
        updateChannelHeader(currentChannel);
    });

    switchChannel(BUILTIN_GENERAL.id, true);
}

document.addEventListener('DOMContentLoaded', () => {
    window.avatarOnError = avatarOnError;
    initCommunityLounge().catch((e) => console.error('[Forum] Init:', e));
});
