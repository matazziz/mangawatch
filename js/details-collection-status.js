/**
 * Gestion du statut de collection sur les pages détails (anime / manga).
 * Réutilise localStorage (+ sync Firebase optionnelle) comme manga-database.js.
 */
(function () {
    const STATUS_META = {
        watching: { icon: 'fas fa-play', color: '#2196f3', i18n: 'collection.status.watching', fallback: 'En cours' },
        completed: { icon: 'fas fa-check-circle', color: '#4caf50', i18n: 'collection.status.completed', fallback: 'Terminé' },
        'on-hold': { icon: 'fas fa-pause', color: '#ff9800', i18n: 'collection.status.on_hold', fallback: 'En pause' },
        dropped: { icon: 'fas fa-times-circle', color: '#f44336', i18n: 'collection.status.dropped', fallback: 'Abandonné' },
        'plan-to-watch': { icon: 'fas fa-eye', color: '#9c27b0', i18n: 'collection.status.plan_to_watch', fallback: 'À voir' }
    };

    function t(key, fallback) {
        if (window.localization) {
            const value = window.localization.get(key);
            if (value && value !== key) return value;
        }
        return fallback;
    }

    function normalizeStatus(status) {
        const raw = String(status || '').toLowerCase().trim();
        if (!raw) return null;
        const compact = raw.replace(/\s+/g, '-').replace(/_/g, '-');
        const aliases = {
            watching: 'watching', 'en-cours': 'watching',
            completed: 'completed', complete: 'completed', finished: 'completed',
            'on-hold': 'on-hold', onhold: 'on-hold', paused: 'on-hold', 'en-pause': 'on-hold',
            dropped: 'dropped', abandoned: 'dropped', abandonne: 'dropped',
            'plan-to-watch': 'plan-to-watch', 'plan-to-read': 'plan-to-watch',
            plan_to_watch: 'plan-to-watch', 'to-watch': 'plan-to-watch', 'a-voir': 'plan-to-watch'
        };
        return aliases[compact] || compact;
    }

    function getListKey() {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user?.email) return null;
        return 'user_list_' + user.email;
    }

    let collectionCache = null;
    let collectionLoadPromise = null;

    function readLocalCollectionList() {
        const listKey = getListKey();
        if (!listKey) return [];
        try {
            return JSON.parse(localStorage.getItem(listKey) || '[]');
        } catch (_) {
            return [];
        }
    }

    function typesCompatible(itemType, contentType) {
        const a = normalizeItemType(itemType);
        const b = normalizeItemType(contentType);
        if (!b) return true;
        if (!a) return true;
        if ((a === 'anime' || a === 'film') && (b === 'anime' || b === 'film')) return true;
        return a === b;
    }

    function pickBestMatch(matches, contentType) {
        if (!matches.length) return null;
        const typed = contentType
            ? matches.filter(item => typesCompatible(item?.type || item?.content_type || item?.contentType, contentType))
            : matches;
        const pool = typed.length ? typed : matches;
        return pool.find(item => normalizeStatus(item?.status)) || pool[0] || null;
    }

    function findItemInList(list, malId, contentType) {
        const targetId = String(malId || '').trim();
        if (!targetId || !Array.isArray(list)) return null;
        const targetDigits = targetId.replace(/[^\d]/g, '');
        const matches = list.filter(item => {
            const ids = [item?.id, item?.mal_id, item?.malId]
                .map(v => String(v || '').trim())
                .filter(Boolean);
            if (ids.includes(targetId)) return true;
            if (!targetDigits) return false;
            return ids.some(id => id.replace(/[^\d]/g, '') === targetDigits);
        });
        return pickBestMatch(matches, contentType);
    }

    async function ensureCollectionLoaded() {
        if (collectionCache) return collectionCache;
        if (collectionLoadPromise) return collectionLoadPromise;

        collectionLoadPromise = (async () => {
            let list = readLocalCollectionList();
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            const email = String(user?.email || '').trim();
            if (email) {
                try {
                    const { collectionService } = await import('./firebase-service.js?v=6febe20');
                    const firebaseItems = await collectionService.getAllItems(email);
                    if (Array.isArray(firebaseItems) && firebaseItems.length) {
                        const seen = new Set();
                        const merged = [];
                        [...list, ...firebaseItems].forEach(item => {
                            const id = String(item?.id || item?.mal_id || item?.malId || '').trim();
                            const type = normalizeItemType(item?.type || item?.content_type || item?.contentType || '');
                            const key = `${id}:${type}`;
                            if (!id || seen.has(key)) return;
                            seen.add(key);
                            merged.push(item);
                        });
                        list = merged;
                    }
                } catch (err) {
                    console.warn('[DetailsCollectionStatus] Firebase indisponible, localStorage seul:', err);
                }
            }
            collectionCache = list;
            return list;
        })();

        return collectionLoadPromise;
    }

    function invalidateCollectionCache() {
        collectionCache = null;
        collectionLoadPromise = null;
    }

    function findItem(malId, contentType) {
        const list = collectionCache || readLocalCollectionList();
        return findItemInList(list, malId, contentType);
    }

    function getStatusMeta(status) {
        const key = normalizeStatus(status);
        const meta = STATUS_META[key];
        if (!meta) {
            return { icon: 'fas fa-bookmark', color: '#607d8b', text: t('collection.status.unknown', 'Inconnu') };
        }
        return { icon: meta.icon, color: meta.color, text: t(meta.i18n, meta.fallback) };
    }

    function normalizeItemType(type) {
        const raw = String(type || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/_/g, '-');
        if (!raw) return 'anime';
        if (['manga', 'doujin', 'doujinshi', 'one-shot', 'one-shots', 'oneshot'].includes(raw)) return 'manga';
        if (['novel', 'light-novel', 'roman'].includes(raw)) return 'novel';
        if (raw === 'manhwa') return 'manhwa';
        if (raw === 'manhua') return 'manhua';
        if (['movie', 'film'].includes(raw)) return 'film';
        if (['anime', 'tv', 'ova', 'ona', 'special', 'music'].includes(raw)) return 'anime';
        return raw;
    }

    function isAnimeLikeType(type) {
        const n = normalizeItemType(type);
        return n === 'anime' || n === 'film';
    }

    function findItemIndex(userList, itemId) {
        const targetId = String(itemId || '').trim();
        if (!targetId) return -1;
        const targetDigits = targetId.replace(/[^\d]/g, '');
        return userList.findIndex(i => {
            const ids = [i?.id, i?.mal_id, i?.malId]
                .map(v => String(v || '').trim())
                .filter(Boolean);
            if (ids.includes(targetId)) return true;
            if (!targetDigits) return false;
            return ids.some(id => id.replace(/[^\d]/g, '') === targetDigits);
        });
    }

    function buildEditingItem(content, contentType) {
        const imageUrl = content.images?.jpg?.large_image_url
            || content.images?.jpg?.image_url
            || content.imageUrl
            || '';
        const year = content.year
            || content.aired?.prop?.from?.year
            || content.published?.prop?.from?.year
            || null;
        return {
            id: String(content.mal_id),
            title: content.title,
            type: normalizeItemType(contentType || content.type),
            imageUrl,
            synopsis: content.synopsis || '',
            episodes: content.episodes ?? content.volumes ?? null,
            volumes: content.volumes ?? null,
            year,
            status: 'watching',
            dateAdded: new Date().toISOString()
        };
    }

    function broadcastCollectionUpdate(malId, status, type, stoppedAt) {
        const detail = {
            malId: String(malId),
            status,
            type,
            stoppedAt: stoppedAt ?? null,
            ts: Date.now()
        };
        try {
            localStorage.setItem('mw_collection_last_update', JSON.stringify(detail));
        } catch (_) { /* ignore */ }
        window.dispatchEvent(new CustomEvent('mwCollectionUpdated', { detail }));
    }

    function showToast(message, type) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        if (window.MWToast?.show) {
            window.MWToast.show(message, type);
            return;
        }
        console.log(`[${type}] ${message}`);
    }

    function showStoppedAtPopup(item, callback) {
        const normalizedType = normalizeItemType(item.type);
        const isAnime = isAnimeLikeType(normalizedType);
        const labelText = isAnime
            ? t('collection.stopped_at.episode', 'épisode')
            : t('collection.stopped_at.volume', 'volume');
        const titleText = t('collection.stopped_at.label', 'Où vous êtes-vous arrêté ?');
        const hintText = t('collection.stopped_at.hint', 'Indiquez le numéro où vous vous êtes arrêté');
        const confirmText = t('collection.confirm_status', 'Confirmer');
        const cancelText = t('collection.delete.cancel', 'Annuler');

        const popup = document.createElement('div');
        popup.className = 'details-stopped-at-popup';
        popup.innerHTML = `
            <div class="details-stopped-at-content">
                <h3>${titleText}</h3>
                <div class="details-stopped-at-controls">
                    <button type="button" class="details-stopped-at-btn decrement-btn">−</button>
                    <div class="details-stopped-at-input-wrap">
                        <input type="number" id="details-popup-stopped-at" min="1" placeholder="0">
                        <span>${labelText}</span>
                    </div>
                    <button type="button" class="details-stopped-at-btn increment-btn">+</button>
                </div>
                <p class="details-stopped-at-hint">${hintText}</p>
                <div class="details-stopped-at-actions">
                    <button type="button" class="details-stopped-at-cancel">${cancelText}</button>
                    <button type="button" class="details-stopped-at-confirm">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);

        const input = popup.querySelector('#details-popup-stopped-at');
        const confirm = () => {
            const value = input.value.trim();
            const stoppedAt = value && !isNaN(value) && parseInt(value, 10) > 0
                ? parseInt(value, 10) : null;
            popup.remove();
            callback(stoppedAt);
        };

        popup.querySelector('.increment-btn').addEventListener('click', () => {
            input.value = Math.max(1, (parseInt(input.value, 10) || 0) + 1);
        });
        popup.querySelector('.decrement-btn').addEventListener('click', () => {
            input.value = Math.max(1, (parseInt(input.value, 10) || 2) - 1);
        });
        popup.querySelector('.details-stopped-at-confirm').addEventListener('click', confirm);
        popup.querySelector('.details-stopped-at-cancel').addEventListener('click', () => popup.remove());
        popup.addEventListener('click', (e) => { if (e.target === popup) popup.remove(); });
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') confirm(); });
        setTimeout(() => input.focus(), 100);
    }

    async function saveStatus(status, stoppedAt) {
        const item = window.currentEditingItem;
        if (!item) return;

        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user?.email) {
            alert(t('collection.login_required', 'Veuillez vous connecter pour gérer votre collection.'));
            return;
        }

        const listKey = 'user_list_' + user.email;
        let userList = [];
        try {
            userList = JSON.parse(localStorage.getItem(listKey) || '[]');
        } catch (_) {
            userList = [];
        }

        const existingIndex = findItemIndex(userList, item.id);
        let savedItem;
        if (existingIndex !== -1) {
            userList[existingIndex].status = status;
            userList[existingIndex].dateUpdated = new Date().toISOString();
            if (stoppedAt) userList[existingIndex].stoppedAt = stoppedAt;
            else delete userList[existingIndex].stoppedAt;
            savedItem = userList[existingIndex];
        } else {
            item.status = status;
            item.dateAdded = new Date().toISOString();
            item.dateUpdated = item.dateAdded;
            if (stoppedAt) item.stoppedAt = stoppedAt;
            userList.push(item);
            savedItem = item;
        }

        localStorage.setItem(listKey, JSON.stringify(userList));
        invalidateCollectionCache();
        collectionCache = userList;

        try {
            const { collectionService } = await import('/js/firebase-service.js?v=6febe20');
            await collectionService.addItem(user.email, {
                id: savedItem.id,
                title: savedItem.title,
                type: savedItem.type,
                status,
                imageUrl: savedItem.imageUrl || savedItem.image,
                synopsis: savedItem.synopsis,
                episodes: savedItem.episodes,
                volumes: savedItem.volumes,
                year: savedItem.year,
                genres: savedItem.genres || [],
                score: savedItem.score || 0,
                stoppedAt: stoppedAt ?? null
            });
        } catch (err) {
            console.warn('[DetailsCollectionStatus] Sync Firebase échouée (localStorage ok):', err);
        }

        broadcastCollectionUpdate(savedItem.id, status, savedItem.type, stoppedAt);
        showToast(t('collection.status_updated', 'Statut mis à jour !'), 'success');
        refreshSection(savedItem.id);
        window.currentEditingItem = null;
    }

    function openModalForContent(content, contentType) {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user?.email) {
            alert(t('collection.login_required', 'Veuillez vous connecter pour ajouter à votre collection.'));
            return;
        }

        const existing = findItem(content.mal_id, contentType);
        window.currentEditingItem = existing || buildEditingItem(content, contentType);

        const modal = document.getElementById('detailsStatusModal');
        if (!modal) return;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const modal = document.getElementById('detailsStatusModal');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    function updateStatus(status) {
        if (!window.currentEditingItem) return;
        closeModal();
        if (status === 'on-hold' || status === 'dropped') {
            showStoppedAtPopup(window.currentEditingItem, (stoppedAt) => {
                saveStatus(status, stoppedAt);
            });
        } else {
            saveStatus(status, null);
        }
    }

    function renderButtonHtml(content, contentType) {
        const existing = findItem(content.mal_id, contentType);
        const status = normalizeStatus(existing?.status);
        const addLabel = t('collection.add_to_collection', 'Ajouter');
        const label = t('collection.my_status', 'Statut');

        if (status) {
            const meta = getStatusMeta(status);
            let stoppedHtml = '';
            if ((status === 'on-hold' || status === 'dropped') && existing?.stoppedAt) {
                const isAnime = isAnimeLikeType(content.type || contentType);
                const unit = isAnime
                    ? t('collection.stopped_at.episode', 'ép.')
                    : t('collection.stopped_at.volume', 'vol.');
                stoppedHtml = `<span class="details-collection-stopped">${existing.stoppedAt} ${unit}</span>`;
            }
            return `
                <div class="details-collection-row">
                    <span class="details-collection-label" data-i18n="collection.my_status">${label}</span>
                    <button type="button" class="details-collection-pill details-collection-pill--${status}" data-action="change-status" title="${t('collection.change_status', 'Changer le statut')}">
                        <i class="${meta.icon}"></i>
                        <span>${meta.text}</span>
                    </button>
                    ${stoppedHtml}
                </div>
            `;
        }

        return `
            <div class="details-collection-row">
                <span class="details-collection-label" data-i18n="collection.my_status">${label}</span>
                <button type="button" class="details-collection-pill details-collection-pill--empty" data-action="change-status">
                    <i class="fas fa-plus"></i>
                    <span data-i18n="collection.add_to_collection">${addLabel}</span>
                </button>
            </div>
        `;
    }

    function bindSection(section, content, contentType) {
        section.dataset.malId = String(content.mal_id);
        section._detailsContent = content;
        section._detailsContentType = contentType;

        section.querySelectorAll('[data-action="change-status"]').forEach(btn => {
            btn.addEventListener('click', () => openModalForContent(content, contentType));
        });
    }

    async function renderSection(content, contentType) {
        const section = document.getElementById('details-collection-section');
        if (!section || !content?.mal_id) return;
        await ensureCollectionLoaded();
        section.innerHTML = renderButtonHtml(content, contentType);
        bindSection(section, content, contentType);
        if (window.localization) window.localization.applyLanguage();
    }

    async function refreshSection(malId) {
        const section = document.getElementById('details-collection-section');
        if (!section || !section._detailsContent) return;
        if (String(section._detailsContent.mal_id) !== String(malId)) return;
        invalidateCollectionCache();
        await renderSection(section._detailsContent, section._detailsContentType);
    }

    function initModal() {
        const modal = document.getElementById('detailsStatusModal');
        if (!modal || modal.dataset.bound === '1') return;
        modal.dataset.bound = '1';

        modal.querySelector('.close-modal')?.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        modal.querySelectorAll('.status-option').forEach(opt => {
            opt.addEventListener('click', () => updateStatus(opt.dataset.status));
        });
    }

    window.DetailsCollectionStatus = {
        init: initModal,
        renderSection,
        refresh: refreshSection,
        openModalForContent,
        closeModal,
        updateStatus,
        findItem,
        getStatusMeta
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModal);
    } else {
        initModal();
    }

    window.addEventListener('mwCollectionUpdated', function () {
        invalidateCollectionCache();
        const section = document.getElementById('details-collection-section');
        if (section?._detailsContent) {
            renderSection(section._detailsContent, section._detailsContentType);
        }
    });
    window.addEventListener('storage', function (e) {
        if (e.key && e.key.startsWith('user_list_')) {
            invalidateCollectionCache();
            const section = document.getElementById('details-collection-section');
            if (section?._detailsContent) {
                renderSection(section._detailsContent, section._detailsContentType);
            }
        }
    });
})();
