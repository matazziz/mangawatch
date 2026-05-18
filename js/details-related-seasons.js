/**
 * Section « Autres saisons / volumes » sur les pages détail anime & manga.
 * Peu d'appels API pour éviter les timeouts Jikan (504).
 */
(function (global) {
    'use strict';

    const JIKAN_BASE = 'https://api.jikan.moe/v4';
    const COLLECT_RELATION_TYPES = new Set([
        'sequel', 'prequel', 'parent story', 'side story', 'spin-off', 'spin off'
    ]);
    const RELATED_LOAD_DELAY_MS = 200;
    const MAX_LAZY_IMAGES = 16;
    const STRICT_SERIES_FILTER_TYPES = new Set(['side story', 'spin-off', 'spin off', 'alternative']);

    const FRANCHISE_PART_ALIASES = [
        { pattern: /phantom blood|phantom\s*blood/i, part: 1 },
        { pattern: /battle tendency/i, part: 2 },
        { pattern: /stardust crusaders/i, part: 3 },
        { pattern: /diamond is unbreakable|diamond.*unbreakable/i, part: 4 },
        { pattern: /vento aureo|golden wind|vento/i, part: 5 },
        { pattern: /stone ocean/i, part: 6 },
        { pattern: /steel ball run/i, part: 7 },
        { pattern: /jojolion/i, part: 8 }
    ];
    const CACHE_TTL_MS = 5 * 60 * 1000;
    const SERIES_REL_CACHE_TTL_MS = 30 * 60 * 1000;

    function isMangaOnlyMode() {
        return !!(global.MW_API_CONFIG && global.MW_API_CONFIG.isMangaOnly());
    }

    function getApiMediaType(contentType) {
        if (global.MW_API_CONFIG && typeof global.MW_API_CONFIG.getApiMediaType === 'function') {
            return global.MW_API_CONFIG.getApiMediaType(contentType);
        }
        const ct = (contentType || 'anime').toLowerCase();
        return ct === 'manga' ? 'manga' : 'anime';
    }

    function enqueue(fn) {
        if (global.MW_API_CONFIG && typeof global.MW_API_CONFIG.enqueueJikan === 'function') {
            return global.MW_API_CONFIG.enqueueJikan(fn);
        }
        return fn();
    }

    async function fetchWithRetry(url) {
        if (global.MW_API_CONFIG && typeof global.MW_API_CONFIG.fetchWithRetry === 'function') {
            return global.MW_API_CONFIG.fetchWithRetry(url, { headers: { Accept: 'application/json' } });
        }
        return fetch(url, { headers: { Accept: 'application/json' } });
    }

    function delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function getCacheKey(kind, mediaType, id) {
        return `mw_${kind}_${mediaType}_${id}`;
    }

    function readCache(key) {
        try {
            const raw = sessionStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || Date.now() - parsed.ts > CACHE_TTL_MS) {
                sessionStorage.removeItem(key);
                return null;
            }
            return parsed.data;
        } catch (e) {
            return null;
        }
    }

    function writeCache(key, data) {
        try {
            sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
        } catch (e) {
            /* quota */
        }
    }

    function extractBaseTitle(title, contentType) {
        if (!title || typeof title !== 'string') return '';
        const ct = (contentType || 'anime').toLowerCase();
        if (ct !== 'anime' && ct !== 'manga' && ct !== 'film') return title.trim();
        let base = title.trim()
            .replace(/\s+[Ss]eason\s+\d+.*$/gi, '')
            .replace(/\s+[Ss]aison\s+\d+.*$/gi, '')
            .replace(/\s+[Pp]art\s+\d+.*$/gi, '')
            .replace(/\s+[Pp]artie\s+\d+.*$/gi, '')
            .replace(/\s+[Ss]\d+$/g, '')
            .replace(/\s+[Ss]\s+\d+$/g, '')
            .replace(/\s*\d+[nrst][dht]\s*[Ss]eason/gi, '')
            .replace(/\s*\d+[èe]me\s*[Ss]aison/gi, '')
            .replace(/:\s+[Ss]eason\s+\d+.*$/gi, '')
            .replace(/:\s+[Ss]aison\s+\d+.*$/gi, '')
            .replace(/:\s+[Pp]art\s+\d+.*$/gi, '')
            .replace(/:\s+[Pp]artie\s+\d+.*$/gi, '')
            .replace(/\s+[Tt]he\s+[Ff]inal\s+[Ss]eason/gi, '')
            .replace(/\s+[Ff]inal\s+[Ss]eason/gi, '')
            .replace(/\s+[Vv]ol\.?\s+\d+.*$/gi, '')
            .replace(/\s+[Vv]olume\s+\d+.*$/gi, '')
            .replace(/\s+[Tt]ome\s+\d+.*$/gi, '')
            .replace(/:\s+[Rr]e\b.*$/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/:\s*$/, '')
            .trim();
        return base || title.trim();
    }

    function normalizeTitle(s) {
        return String(s || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function detectFranchiseKey(title) {
        const t = normalizeTitle(title);
        if (/jojo|bizarre adventure|steel ball run|stoned ocean|stardust|phantom blood|battle tendency|diamond is unbreakable|golden wind|jojolion/i.test(t)) {
            return 'jojo';
        }
        if (/attack on titan|shingeki no kyojin/i.test(t)) return 'aot';
        if (/naruto|boruto/i.test(t)) return 'naruto';
        if (/one piece/i.test(t)) return 'onepiece';
        if (/dragon ball/i.test(t)) return 'dragonball';
        if (/monogatari/i.test(t)) return 'monogatari';
        if (/fate\/|fate stay|fate zero|fate\/zero/i.test(t)) return 'fate';
        return null;
    }

    function areSameSeries(titleA, titleB, contentType) {
        const baseA = normalizeTitle(extractBaseTitle(titleA, contentType));
        const baseB = normalizeTitle(extractBaseTitle(titleB, contentType));
        if (!baseA || !baseB) return false;
        if (baseA === baseB) return true;
        const franchiseA = detectFranchiseKey(titleA);
        const franchiseB = detectFranchiseKey(titleB);
        if (franchiseA && franchiseA === franchiseB) return true;
        const minLen = 8;
        if (baseA.length >= minLen && baseB.length >= minLen &&
            (baseA.startsWith(baseB) || baseB.startsWith(baseA))) {
            return true;
        }
        const wordsA = baseA.split(' ').filter((w) => w.length > 3);
        const wordsB = baseB.split(' ').filter((w) => w.length > 3);
        if (wordsA.length >= 2 && wordsB.length >= 2) {
            const shared = wordsA.filter((w) => wordsB.includes(w));
            if (shared.length >= 2) return true;
        }
        return false;
    }

    function shouldIncludeRelatedEntry(relType, entryTitle, referenceTitle, contentType) {
        const rel = normalizeRelationType(relType);
        if (!STRICT_SERIES_FILTER_TYPES.has(rel)) return true;
        return areSameSeries(entryTitle, referenceTitle, contentType);
    }

    function getSeasonSortKey(title) {
        if (!title) return 100;
        const t = title.toLowerCase();
        for (const alias of FRANCHISE_PART_ALIASES) {
            if (alias.pattern.test(title)) return alias.part;
        }
        let m = t.match(/(\d+)(?:st|nd|rd|th)\s+season/);
        if (m) return parseInt(m[1], 10);
        m = t.match(/season\s+(\d+)/);
        if (m) return parseInt(m[1], 10);
        m = t.match(/saison\s+(\d+)/);
        if (m) return parseInt(m[1], 10);
        m = t.match(/\bpart\s*(\d+)\b/i);
        if (m) return parseInt(m[1], 10);
        m = t.match(/\bpartie\s*(\d+)\b/i);
        if (m) return parseInt(m[1], 10);
        m = t.match(/(?:vol\.?|volume|tome)\s*(\d+)/);
        if (m) return parseInt(m[1], 10);
        if (/\b:re\b|\bre\b$/i.test(t)) return 2;
        m = t.match(/\bs(\d+)\b/);
        if (m) return parseInt(m[1], 10);
        if (/\bseason\s+one\b|\bsaison\s+un\b/.test(t)) return 1;
        if (!/season|saison|part|partie|vol\.?|volume|tome|\d+(?:st|nd|rd|th)|\bs\d+\b|:re\b/i.test(t)) {
            return 1;
        }
        return 50;
    }

    function getSeasonLabel(title, contentType) {
        const t = title || '';
        const ctLabel = (contentType || '').toLowerCase();
        const isManga = ctLabel === 'manga' || ctLabel === 'manhwa' || ctLabel === 'manhua';
        const volMatch = t.match(/(?:vol\.?|volume|tome)\s*(\d+)/i);
        if (volMatch) return `Tome ${volMatch[1]}`;
        if (/\b:re\b/i.test(t) || /\bre\b$/i.test(t)) return 'Partie 2 (:re)';
        const partMatch = t.match(/(?:part|partie)\s*(\d+)/i);
        if (partMatch) return `Partie ${partMatch[1]}`;
        const seasonMatch = t.match(/(?:season|saison)\s*(\d+)|(\d+)(?:st|nd|rd|th)\s+season/i);
        if (seasonMatch) {
            const num = seasonMatch[1] || seasonMatch[2];
            return isManga ? `Volume ${num}` : `Saison ${num}`;
        }
        const key = getSeasonSortKey(t);
        if (key === 1) return isManga ? 'Tome 1' : 'Saison 1';
        if (key < 10 && Number.isInteger(key)) {
            return isManga ? `Tome ${key}` : `Saison ${key}`;
        }
        return t.length > 42 ? `${t.slice(0, 40)}…` : t;
    }

    function normalizeRelationType(rel) {
        return String(rel || '').toLowerCase().replace(/_/g, '-').replace(/\s+/g, ' ').trim();
    }

    function inferExtraFromTitle(title) {
        const t = String(title || '').toLowerCase();
        if (/\bfiller\b/.test(t)) return { tier: 55, badge: 'Filler', badgeClass: 'is-extra' };
        if (/spin.?off|gaiden/.test(t)) return { tier: 52, badge: 'Spin-off', badgeClass: 'is-spinoff' };
        if (/\bova\b|\bona\b/.test(t)) return { tier: 50, badge: 'OVA', badgeClass: 'is-extra' };
        if (/\bspecial\b|\bpilot\b/.test(t)) return { tier: 49, badge: 'Spécial', badgeClass: 'is-extra' };
        if (/one.?shot|light novel|\bln\b|novel\b/.test(t)) return { tier: 48, badge: 'One-shot', badgeClass: 'is-extra' };
        if (/memory snow|jack\b|recap|anthology|artbook|guide\b|epilogue|parody/.test(t)) {
            return { tier: 47, badge: 'Extra', badgeClass: 'is-extra' };
        }
        if (/movie|film\b/.test(t)) return { tier: 46, badge: 'Film', badgeClass: 'is-extra' };
        return null;
    }

    function getRelationSortTier(item) {
        const fromTitle = inferExtraFromTitle(item.title);
        if (fromTitle) return fromTitle.tier;

        const rel = normalizeRelationType(item.relationType);
        const relTiers = {
            'parent story': 0,
            parent: 0,
            prequel: 8,
            sequel: 12,
            'side story': 42,
            'spin-off': 52,
            'spin off': 52,
            alternative: 54
        };
        if (relTiers[rel] !== undefined) return relTiers[rel];
        return 15;
    }

    function getMainTypeBadgeLabel(contentType) {
        const ct = (contentType || 'anime').toLowerCase();
        const labels = {
            manga: 'Manga',
            anime: 'Anime',
            manhwa: 'Manhwa',
            manhua: 'Manhua',
            roman: 'Roman',
            doujin: 'Doujin',
            film: 'Film'
        };
        return labels[ct] || 'Série';
    }

    function getRelationBadge(item, contentType) {
        const fromTitle = inferExtraFromTitle(item.title);
        if (fromTitle) return { label: fromTitle.badge, className: fromTitle.badgeClass };

        const rel = normalizeRelationType(item.relationType);
        if (rel === 'side story') return { label: 'Side story', className: 'is-side' };
        if (rel === 'spin-off' || rel === 'spin off') {
            return { label: 'Spin-off', className: 'is-spinoff' };
        }
        if (rel === 'alternative') return { label: 'Alternative', className: 'is-extra' };

        if (rel === 'parent story' || rel === 'parent') {
            return { label: 'Série', className: 'is-main' };
        }

        return { label: getMainTypeBadgeLabel(contentType), className: 'is-main' };
    }

    function getSectionHeading(contentType) {
        const ct = (contentType || 'anime').toLowerCase();
        const map = {
            manga: { key: 'details.other_volumes', text: 'Autres volumes' },
            manhwa: { key: 'details.other_volumes_manhwa', text: 'Autres volumes' },
            manhua: { key: 'details.other_volumes_manhua', text: 'Autres volumes' },
            roman: { key: 'details.other_volumes_novel', text: 'Autres tomes' },
            doujin: { key: 'details.other_volumes_doujin', text: 'Autres doujins' },
            film: { key: 'details.other_films', text: 'Autres films' },
            anime: { key: 'details.other_seasons', text: 'Autres saisons' }
        };
        return map[ct] || map.anime;
    }

    function formatDateFr(value) {
        if (!value) return '';
        try {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return '';
            return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            return '';
        }
    }

    function getSeriesCacheKey(referenceTitle, mediaType) {
        const seriesCt = mediaType === 'manga' ? 'manga' : 'anime';
        const franchise = detectFranchiseKey(referenceTitle);
        const slug = franchise || normalizeTitle(extractBaseTitle(referenceTitle, seriesCt)).slice(0, 72);
        return `mw_series_rel_${mediaType}_${slug || 'serie'}`;
    }

    function loadSeriesRelationsCache(key) {
        try {
            const raw = sessionStorage.getItem(key);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!parsed?.items || Date.now() - parsed.ts > SERIES_REL_CACHE_TTL_MS) {
                sessionStorage.removeItem(key);
                return [];
            }
            return parsed.items;
        } catch (e) {
            return [];
        }
    }

    function saveSeriesRelationsCache(key, items) {
        try {
            const merged = new Map();
            loadSeriesRelationsCache(key).forEach((item) => {
                if (item?.mal_id) merged.set(String(item.mal_id), item);
            });
            (items || []).forEach((item) => {
                if (!item?.mal_id) return;
                const id = String(item.mal_id);
                merged.set(id, { ...merged.get(id), ...item });
            });
            sessionStorage.setItem(key, JSON.stringify({
                ts: Date.now(),
                items: Array.from(merged.values())
            }));
        } catch (e) { /* quota */ }
    }

    function mergeSeriesCacheIntoMap(map, key) {
        loadSeriesRelationsCache(key).forEach((item) => {
            if (!item?.mal_id) return;
            const id = String(item.mal_id);
            const prev = map.get(id);
            map.set(id, prev ? { ...prev, ...item, image: prev.image || item.image, title: prev.title || item.title } : item);
        });
    }

    function buildPublicationLines(item, contentType) {
        const lines = [];
        const ct = (contentType || '').toLowerCase();
        const isManga = ct === 'manga' || ct === 'manhwa' || ct === 'manhua';
        const start = formatDateFr(item.airedFrom);
        const end = formatDateFr(item.airedTo);

        if (item.year) lines.push({ label: 'Année', value: String(item.year) });
        if (start) lines.push({ label: isManga ? 'Début parution' : 'Début diffusion', value: start });
        if (end) lines.push({ label: isManga ? 'Fin parution' : 'Fin diffusion', value: end });
        if (item.volumes) lines.push({ label: 'Volumes', value: String(item.volumes) });
        if (item.chapters) lines.push({ label: 'Chapitres', value: String(item.chapters) });
        if (item.episodes) lines.push({ label: 'Épisodes', value: String(item.episodes) });
        if (item.status) lines.push({ label: 'Statut', value: String(item.status) });
        if (item.score != null && item.score !== '') {
            lines.push({ label: 'Note', value: `${Number(item.score).toFixed(1)}/10` });
        }
        if (lines.length === 0 && item.title) {
            lines.push({ label: 'Série', value: truncateSubtitle(item.title, 48) });
        }
        return lines;
    }

    function buildMetaLine(item, contentType) {
        const parts = [];
        if (item.year) parts.push(String(item.year));
        const ct = (contentType || '').toLowerCase();
        if (item.episodes) {
            parts.push(`${item.episodes} ép.`);
        } else if (item.chapters) {
            parts.push(`${item.chapters} ch.`);
        } else if (item.volumes) {
            parts.push(`${item.volumes} vol.`);
        }
        const start = formatDateFr(item.airedFrom);
        if (start && parts.length < 3) parts.push(start);
        return parts.join(' · ');
    }

    function truncateSubtitle(title, max) {
        const t = String(title || '').trim();
        if (t.length <= max) return t;
        return `${t.slice(0, max - 1)}…`;
    }

    function sortRelatedItems(items) {
        return items.slice().sort((a, b) => {
            const skA = getSeasonSortKey(a.title);
            const skB = getSeasonSortKey(b.title);
            const mainA = skA < 50;
            const mainB = skB < 50;
            if (mainA && mainB && skA !== skB) return skA - skB;

            const tierDiff = getRelationSortTier(a) - getRelationSortTier(b);
            if (tierDiff !== 0) return tierDiff;

            const seasonDiff = skA - skB;
            if (seasonDiff !== 0) return seasonDiff;

            const yearA = parseInt(a.year, 10) || 9999;
            const yearB = parseInt(b.year, 10) || 9999;
            if (yearA !== yearB) return yearA - yearB;

            const dateA = a.airedFrom ? new Date(a.airedFrom).getTime() : 0;
            const dateB = b.airedFrom ? new Date(b.airedFrom).getTime() : 0;
            if (dateA && dateB && dateA !== dateB) return dateA - dateB;

            return String(a.title || '').localeCompare(String(b.title || ''), 'fr');
        });
    }

    async function fetchRelations(mediaType, id) {
        const cacheKey = getCacheKey('rel', mediaType, id);
        const cached = readCache(cacheKey);
        if (cached) return cached;

        const proxyUrl = new URL('/.netlify/functions/jikan-proxy', window.location.origin);
        proxyUrl.searchParams.set('action', 'relations');
        proxyUrl.searchParams.set('mediaType', mediaType);
        proxyUrl.searchParams.set('id', String(id));

        const load = async () => {
            let response = await fetchWithRetry(proxyUrl.toString());
            if (!response.ok) {
                response = await fetchWithRetry(`${JIKAN_BASE}/${mediaType}/${id}/relations`);
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        };

        const data = await enqueue(load);
        writeCache(cacheKey, data);
        return data;
    }

    /** Une seule requête /relations — pas de parcours récursif (évite la saturation API). */
    function collectRelatedFromRelationsPayload(relationsPayload, mediaType, referenceTitle) {
        const collected = new Map();
        const seriesCt = mediaType === 'manga' ? 'manga' : 'anime';
        const groups = relationsPayload?.data || [];

        for (const group of groups) {
            const relType = normalizeRelationType(group.relation);
            if (!COLLECT_RELATION_TYPES.has(relType)) continue;

            for (const entry of group.entry || []) {
                if (String(entry.type || '').toLowerCase() !== mediaType) continue;
                const malId = String(entry.mal_id);
                if (!malId || collected.has(malId)) continue;
                if (!shouldIncludeRelatedEntry(relType, entry.name, referenceTitle, seriesCt)) continue;

                collected.set(malId, {
                    mal_id: entry.mal_id,
                    title: entry.name,
                    image: '',
                    year: '',
                    relationType: relType
                });
            }
        }

        return collected;
    }

    function buildDetailUrl(malId, contentType) {
        const params = new URLSearchParams({ id: String(malId) });
        const ct = (contentType || 'anime').toLowerCase();
        if (ct === 'manga' || ct === 'manhwa' || ct === 'manhua' || ct === 'roman' || ct === 'doujin') {
            params.set('type', 'manga');
        } else {
            params.set('type', 'anime');
            params.set('season', '1');
        }
        return `anime-details.html?${params.toString()}`;
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function initRelatedSeasonsCarousel(section) {
        if (!section) return;
        const track = section.querySelector('.related-seasons-track');
        const prevBtn = section.querySelector('.related-seasons-nav--prev');
        const nextBtn = section.querySelector('.related-seasons-nav--next');
        if (!track || !prevBtn || !nextBtn) return;

        const getScrollStep = () => {
            const card = track.querySelector('.related-season-card');
            const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 14;
            const cardWidth = card ? card.offsetWidth : 200;
            const isMobile = window.matchMedia('(max-width: 768px)').matches;
            const cardsPerStep = isMobile ? 2 : 2;
            return (cardWidth + gap) * cardsPerStep;
        };

        const updateNav = () => {
            const maxScroll = track.scrollWidth - track.clientWidth;
            const hasOverflow = maxScroll > 8;
            section.classList.toggle('has-overflow', hasOverflow);
            prevBtn.disabled = track.scrollLeft <= 8;
            nextBtn.disabled = track.scrollLeft >= maxScroll - 8;
        };

        prevBtn.addEventListener('click', () => {
            track.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
        });
        nextBtn.addEventListener('click', () => {
            track.scrollBy({ left: getScrollStep(), behavior: 'smooth' });
        });
        track.addEventListener('scroll', updateNav, { passive: true });
        window.addEventListener('resize', updateNav);
        requestAnimationFrame(updateNav);
        setTimeout(updateNav, 150);
    }

    function renderSection(items, currentId, contentType, referenceTitle) {
        const synopsisEl = document.querySelector('.synopsis-section');
        if (!synopsisEl) return null;

        document.getElementById('related-seasons-section')?.remove();

        const ctLower = (contentType || 'anime').toLowerCase();
        const isManga = ctLower === 'manga' || ctLower === 'manhwa' || ctLower === 'manhua';
        const heading = getSectionHeading(contentType);
        const cardIcon = isManga ? 'fa-book' : 'fa-tv';

        const cardsHtml = items.map((item) => {
            const isCurrent = String(item.mal_id) === String(currentId);
            const label = getSeasonLabel(item.title, contentType);
            const badge = getRelationBadge(item, contentType);
            const metaLine = buildMetaLine(item, contentType);
            const img = item.image || '';
            const pubLines = buildPublicationLines(item, contentType);
            const badgeHtml = badge
                ? `<span class="related-season-badge ${badge.className}">${escapeHtml(badge.label)}</span>`
                : '';
            const metaHtml = metaLine
                ? `<span class="related-season-meta">${escapeHtml(metaLine)}</span>`
                : '';
            let posterInner;
            let posterClass = 'related-season-poster';
            if (!isCurrent && !img && pubLines.length > 0) {
                posterClass = 'related-season-poster related-season-poster--publication';
                posterInner = `<div class="related-season-pub-info">${pubLines.map((row) => `<span class="related-season-pub-row"><span class="related-season-pub-label">${escapeHtml(row.label)}</span><span class="related-season-pub-value">${escapeHtml(row.value)}</span></span>`).join('')}</div>`;
            } else {
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="" loading="lazy" data-mal-id="${item.mal_id}" onerror="this.classList.add('is-hidden'); this.nextElementSibling?.classList.remove('is-hidden');">`
                    : `<img alt="" loading="lazy" data-mal-id="${item.mal_id}" class="is-hidden" onerror="this.classList.add('is-hidden'); this.nextElementSibling?.classList.remove('is-hidden');">`;
                const fallbackClass = img ? 'related-season-poster-fallback is-hidden' : 'related-season-poster-fallback';
                posterInner = `${imgHtml}<div class="${fallbackClass}" aria-hidden="true"><i class="fas ${cardIcon}"></i></div>`;
            }

            return `
                <a href="${buildDetailUrl(item.mal_id, contentType)}"
                   class="related-season-card${isCurrent ? ' is-current' : ''}"
                   title="${escapeHtml(item.title)}"
                   data-mal-id="${item.mal_id}"
                   ${isCurrent ? 'aria-current="page"' : ''}>
                    <div class="${posterClass}">
                        ${badgeHtml}
                        ${posterInner}
                    </div>
                    <div class="related-season-info">
                        <span class="related-season-label">${escapeHtml(label)}</span>
                        <span class="related-season-subtitle" title="${escapeHtml(item.title)}">${escapeHtml(truncateSubtitle(item.title, 36))}</span>
                        ${metaHtml}
                    </div>
                </a>
            `;
        }).join('');

        const section = document.createElement('section');
        section.id = 'related-seasons-section';
        section.className = 'related-seasons-section';
        section.innerHTML = `
            <h2 class="related-seasons-title" data-i18n="${heading.key}">${heading.text}</h2>
            <div class="related-seasons-carousel">
                <button type="button" class="related-seasons-nav related-seasons-nav--prev" aria-label="Volumes précédents">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="related-seasons-track-wrap">
                    <div class="related-seasons-track" role="list">
                        ${cardsHtml}
                    </div>
                </div>
                <button type="button" class="related-seasons-nav related-seasons-nav--next" aria-label="Volumes suivants">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;

        synopsisEl.insertAdjacentElement('afterend', section);
        initRelatedSeasonsCarousel(section);

        section.querySelectorAll('.related-season-card').forEach((card) => {
            card.addEventListener('click', async (e) => {
                const malId = card.dataset.malId;
                const item = items.find((i) => String(i.mal_id) === String(malId));
                if (!item?.mal_id || card.classList.contains('is-current')) return;
                if (!global.MWDetailCache?.saveDetailPrefetch) return;

                e.preventDefault();
                const targetUrl = card.getAttribute('href');
                const mediaType = getApiMediaType(contentType);

                try {
                    const brief = await fetchDetailBrief(mediaType, item.mal_id);
                    const payload = brief || item;
                    global.MWDetailCache.saveDetailPrefetch({
                        mal_id: payload.mal_id || item.mal_id,
                        title: payload.title || item.title,
                        synopsis: payload.synopsis || null,
                        score: payload.score != null ? payload.score : null,
                        genres: payload.genres || [],
                        type: payload.type || (mediaType === 'manga' ? 'Manga' : 'TV'),
                        images: (payload.image || item.image)
                            ? { jpg: { large_image_url: payload.image || item.image, image_url: payload.image || item.image } }
                            : undefined,
                        year: payload.year || item.year || null,
                        chapters: payload.chapters || item.chapters || null,
                        volumes: payload.volumes || item.volumes || null,
                        episodes: payload.episodes || item.episodes || null,
                        published: (payload.year || item.year)
                            ? { prop: { from: { year: payload.year || item.year } } }
                            : undefined,
                        aired: (payload.year || item.year)
                            ? { prop: { from: { year: payload.year || item.year } } }
                            : undefined
                    }, contentType);
                    if (referenceTitle) {
                        const seriesKey = getSeriesCacheKey(referenceTitle, getApiMediaType(contentType));
                        saveSeriesRelationsCache(seriesKey, items);
                    }
                } catch (prefetchErr) {
                    console.warn('[details-related-seasons] prefetch:', prefetchErr);
                }

                window.location.href = targetUrl;
            });
        });

        if (window.localization) {
            window.localization.applyLanguage();
        }

        return section;
    }

    async function fetchDetailBrief(mediaType, id) {
        const cacheKey = getCacheKey('det', mediaType, id);
        const cached = readCache(cacheKey);
        if (cached) return cached;

        const proxyUrl = new URL('/.netlify/functions/jikan-proxy', window.location.origin);
        proxyUrl.searchParams.set('action', 'detail');
        proxyUrl.searchParams.set('mediaType', mediaType);
        proxyUrl.searchParams.set('id', String(id));

        const load = async () => {
            let response = await fetchWithRetry(proxyUrl.toString());
            if (!response.ok) {
                response = await fetchWithRetry(`${JIKAN_BASE}/${mediaType}/${id}`);
            }
            if (!response.ok) return null;
            const data = await response.json();
            const item = data?.data || data;
            if (!item) return null;
            const year = item.year ||
                item.aired?.prop?.from?.year ||
                item.published?.prop?.from?.year ||
                (item.aired?.from ? new Date(item.aired.from).getFullYear() : null);
            return {
                mal_id: item.mal_id || item.id,
                title: item.title || item.title_english || '',
                synopsis: item.synopsis || null,
                score: item.score != null ? item.score : null,
                genres: item.genres || [],
                type: item.type || null,
                status: item.status || null,
                image: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
                year: year || '',
                airedFrom: item.aired?.from || item.published?.from || null,
                airedTo: item.aired?.to || item.published?.to || null,
                episodes: item.episodes || null,
                chapters: item.chapters || null,
                volumes: item.volumes || null
            };
        };

        const brief = await enqueue(load);
        if (brief) writeCache(cacheKey, brief);
        return brief;
    }

    async function enrichRelatedItems(items, mediaType, currentId) {
        const need = items.filter((item) => {
            if (String(item.mal_id) === String(currentId)) return false;
            return !item.year || (!item.chapters && !item.volumes && !item.episodes && !item.airedFrom);
        });
        const batchSize = 4;
        for (let i = 0; i < need.length; i += batchSize) {
            await Promise.all(need.slice(i, i + batchSize).map(async (item) => {
                try {
                    const brief = await fetchDetailBrief(mediaType, item.mal_id);
                    if (!brief) return;
                    Object.assign(item, {
                        title: item.title || brief.title,
                        year: item.year || brief.year,
                        image: item.image || brief.image,
                        airedFrom: item.airedFrom || brief.airedFrom,
                        airedTo: item.airedTo || brief.airedTo,
                        status: item.status || brief.status,
                        episodes: item.episodes ?? brief.episodes,
                        chapters: item.chapters ?? brief.chapters,
                        volumes: item.volumes ?? brief.volumes,
                        score: item.score ?? brief.score,
                        synopsis: item.synopsis || brief.synopsis
                    });
                } catch (e) { /* ignore */ }
            }));
            if (i + batchSize < need.length) await delay(280);
        }
    }

    async function lazyLoadImages(items, mediaType) {
        const withoutImage = items.filter((item) => !item.image).slice(0, MAX_LAZY_IMAGES);
        const loadOne = async (item) => {
            try {
                const brief = await fetchDetailBrief(mediaType, item.mal_id);
                if (!brief?.image) return;
                item.image = brief.image;
                const cardImg = document.querySelector(
                    `#related-seasons-section img[data-mal-id="${item.mal_id}"]`
                );
                const fallback = cardImg?.nextElementSibling;
                if (cardImg) {
                    cardImg.src = brief.image;
                    cardImg.classList.remove('is-hidden');
                    fallback?.classList.add('is-hidden');
                }
            } catch (err) {
                console.warn('[details-related-seasons] Image lazy:', item.mal_id, err);
            }
        };
        const batchSize = 3;
        for (let i = 0; i < withoutImage.length; i += batchSize) {
            await Promise.all(withoutImage.slice(i, i + batchSize).map(loadOne));
            if (i + batchSize < withoutImage.length) await delay(350);
        }
    }

    function collectFromCatalogueSnapshot(referenceTitle, mediaType, currentId) {
        const snapshot = global.MWDetailCache?.getCatalogueSnapshot?.();
        if (!snapshot?.items?.length) return new Map();

        const seriesCt = mediaType === 'manga' ? 'manga' : 'anime';
        const map = new Map();
        for (const item of snapshot.items) {
            if (!item?.mal_id) continue;
            if (!areSameSeries(item.title, referenceTitle, seriesCt)) continue;
            const year = item.year || item.published?.prop?.from?.year || item.aired?.prop?.from?.year || '';
            map.set(String(item.mal_id), {
                mal_id: item.mal_id,
                title: item.title,
                image: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
                year,
                airedFrom: item.aired?.from || item.published?.from || null,
                episodes: item.episodes || null,
                chapters: item.chapters || null,
                volumes: item.volumes || null
            });
        }
        if (!map.has(String(currentId))) {
            map.set(String(currentId), {
                mal_id: currentId,
                title: referenceTitle,
                image: '',
                year: '',
                airedFrom: null
            });
        }
        return map;
    }

    async function loadAndRender(content, contentType, contentId) {
        const ct = (contentType || 'anime').toLowerCase();
        if (ct !== 'anime' && ct !== 'manga' && ct !== 'film') return;

        const mediaType = getApiMediaType(ct);
        const referenceTitle = content?.title || '';
        const currentId = String(contentId || content?.mal_id || '');

        const currentEntry = {
            mal_id: content.mal_id || contentId,
            title: referenceTitle,
            image: content.images?.jpg?.large_image_url || content.images?.jpg?.image_url || '',
            year: content.year || content.aired?.prop?.from?.year || content.published?.prop?.from?.year || '',
            airedFrom: content.aired?.from || content.published?.from || null,
            episodes: content.episodes || null,
            chapters: content.chapters || null,
            volumes: content.volumes || null
        };

        const seriesCacheKey = getSeriesCacheKey(referenceTitle, mediaType);
        let relatedMap = collectFromCatalogueSnapshot(referenceTitle, mediaType, currentId);
        mergeSeriesCacheIntoMap(relatedMap, seriesCacheKey);

        let aniEdges = global.MWDetailCache?.getAniListRelations?.(currentId);
        if ((!aniEdges || aniEdges.length === 0) && global.MWDetailCache?.fetchAniListByMalId) {
            try {
                await global.MWDetailCache.fetchAniListByMalId(currentId, referenceTitle, mediaType);
                aniEdges = global.MWDetailCache.getAniListRelations(currentId);
            } catch (aniErr) {
                console.warn('[details-related-seasons] AniList:', aniErr?.message || aniErr);
            }
        }
        if (aniEdges?.length && global.MWDetailCache?.anilistEdgesToRelatedItems) {
            const fromAni = global.MWDetailCache.anilistEdgesToRelatedItems(
                aniEdges, mediaType, referenceTitle, areSameSeries
            );
            fromAni.forEach((v, k) => relatedMap.set(k, v));
        }

        try {
            const relationsPayload = await fetchRelations(mediaType, currentId);
            const fromJikan = collectRelatedFromRelationsPayload(
                relationsPayload, mediaType, referenceTitle
            );
            fromJikan.forEach((v, k) => relatedMap.set(k, v));
        } catch (err) {
            console.warn('[details-related-seasons] Jikan relations:', err?.message || err);
        }

        relatedMap.set(currentId, currentEntry);
        mergeSeriesCacheIntoMap(relatedMap, seriesCacheKey);
        if (relatedMap.size < 2) return;

        let items = sortRelatedItems(Array.from(relatedMap.values()));
        await enrichRelatedItems(items, mediaType, currentId);
        saveSeriesRelationsCache(seriesCacheKey, items);

        renderSection(items, currentId, ct, referenceTitle);
        lazyLoadImages(items, mediaType).catch(() => {});
    }

    function scheduleLoadAndRender(content, contentType, contentId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                loadAndRender(content, contentType, contentId)
                    .then(resolve)
                    .catch((err) => {
                        console.warn('[details-related-seasons]', err);
                        resolve();
                    });
            }, RELATED_LOAD_DELAY_MS);
        });
    }

    global.DetailsRelatedSeasons = {
        loadAndRender: scheduleLoadAndRender,
        loadAndRenderNow: loadAndRender,
        initRelatedSeasonsCarousel,
        renderSection,
        sortRelatedItems,
        getSectionHeading,
        extractBaseTitle,
        getSeasonSortKey
    };
})(typeof window !== 'undefined' ? window : global);
