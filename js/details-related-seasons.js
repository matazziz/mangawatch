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
    const RELATED_LOAD_DELAY_MS = 400;
    const LAZY_IMAGE_DELAY_MS = 900;
    const MAX_LAZY_IMAGES = 3;
    const CACHE_TTL_MS = 5 * 60 * 1000;

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

    function areSameSeries(titleA, titleB, contentType) {
        const baseA = normalizeTitle(extractBaseTitle(titleA, contentType));
        const baseB = normalizeTitle(extractBaseTitle(titleB, contentType));
        if (!baseA || !baseB) return false;
        if (baseA === baseB) return true;
        const minLen = 8;
        if (baseA.length >= minLen && baseB.length >= minLen &&
            (baseA.startsWith(baseB) || baseB.startsWith(baseA))) {
            return true;
        }
        return false;
    }

    function getSeasonSortKey(title) {
        if (!title) return 100;
        const t = title.toLowerCase();
        let m = t.match(/(\d+)(?:st|nd|rd|th)\s+season/);
        if (m) return parseInt(m[1], 10);
        m = t.match(/season\s+(\d+)/);
        if (m) return parseInt(m[1], 10);
        m = t.match(/saison\s+(\d+)/);
        if (m) return parseInt(m[1], 10);
        m = t.match(/part\s+(\d+)/);
        if (m) return 10 + parseInt(m[1], 10) * 0.1;
        m = t.match(/partie\s+(\d+)/);
        if (m) return 10 + parseInt(m[1], 10) * 0.1;
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
        } else if (ct === 'manga' && item.relationType) {
            /* rien */
        }
        return parts.join(' · ');
    }

    function truncateSubtitle(title, max) {
        const t = String(title || '').trim();
        if (t.length <= max) return t;
        return `${t.slice(0, max - 1)}…`;
    }

    function sortRelatedItems(items) {
        return items.slice().sort((a, b) => {
            const tierDiff = getRelationSortTier(a) - getRelationSortTier(b);
            if (tierDiff !== 0) return tierDiff;

            const seasonDiff = getSeasonSortKey(a.title) - getSeasonSortKey(b.title);
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
                if (!areSameSeries(entry.name, referenceTitle, seriesCt)) continue;

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

    function renderSection(items, currentId, contentType) {
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
            const badgeHtml = badge
                ? `<span class="related-season-badge ${badge.className}">${escapeHtml(badge.label)}</span>`
                : '';
            const metaHtml = metaLine
                ? `<span class="related-season-meta">${escapeHtml(metaLine)}</span>`
                : (item.year ? `<span class="related-season-meta">${escapeHtml(item.year)}</span>` : '');
            const imgHtml = img
                ? `<img src="${escapeHtml(img)}" alt="" loading="lazy" data-mal-id="${item.mal_id}"
                    onerror="this.classList.add('is-hidden'); this.nextElementSibling?.classList.remove('is-hidden');">`
                : `<img alt="" loading="lazy" data-mal-id="${item.mal_id}" class="is-hidden"
                    onerror="this.classList.add('is-hidden'); this.nextElementSibling?.classList.remove('is-hidden');">`;
            const fallbackClass = img ? 'related-season-poster-fallback is-hidden' : 'related-season-poster-fallback';

            return `
                <a href="${buildDetailUrl(item.mal_id, contentType)}"
                   class="related-season-card${isCurrent ? ' is-current' : ''}"
                   title="${escapeHtml(item.title)}"
                   data-mal-id="${item.mal_id}"
                   ${isCurrent ? 'aria-current="page"' : ''}>
                    <div class="related-season-poster">
                        ${badgeHtml}
                        ${imgHtml}
                        <div class="${fallbackClass}" aria-hidden="true">
                            <i class="fas ${cardIcon}"></i>
                        </div>
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
            card.addEventListener('click', () => {
                const malId = card.dataset.malId;
                const item = items.find((i) => String(i.mal_id) === String(malId));
                if (!item?.mal_id || !global.MWDetailCache?.saveDetailPrefetch) return;
                global.MWDetailCache.saveDetailPrefetch({
                    mal_id: item.mal_id,
                    title: item.title,
                    images: item.image
                        ? { jpg: { large_image_url: item.image, image_url: item.image } }
                        : undefined,
                    year: item.year || null,
                    chapters: item.chapters || null,
                    volumes: item.volumes || null,
                    episodes: item.episodes || null,
                    published: item.year ? { prop: { from: { year: item.year } } } : undefined,
                    aired: item.year ? { prop: { from: { year: item.year } } } : undefined
                }, contentType);
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
                image: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
                year: year || '',
                airedFrom: item.aired?.from || item.published?.from || null,
                episodes: item.episodes || null,
                chapters: item.chapters || null,
                volumes: item.volumes || null
            };
        };

        const brief = await enqueue(load);
        if (brief) writeCache(cacheKey, brief);
        return brief;
    }

    async function lazyLoadImages(items, mediaType) {
        const withoutImage = items.filter((item) => !item.image).slice(0, MAX_LAZY_IMAGES);
        for (const item of withoutImage) {
            await delay(LAZY_IMAGE_DELAY_MS);
            try {
                const brief = await fetchDetailBrief(mediaType, item.mal_id);
                if (!brief?.image) continue;
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

        let relatedMap = collectFromCatalogueSnapshot(referenceTitle, mediaType, currentId);

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

        if (relatedMap.size < 2) {
            try {
                const relationsPayload = await fetchRelations(mediaType, currentId);
                const fromJikan = collectRelatedFromRelationsPayload(
                    relationsPayload, mediaType, referenceTitle
                );
                fromJikan.forEach((v, k) => relatedMap.set(k, v));
            } catch (err) {
                console.warn('[details-related-seasons] Jikan relations:', err?.message || err);
            }
        }

        relatedMap.set(currentId, currentEntry);
        if (relatedMap.size < 2) return;

        const items = sortRelatedItems(Array.from(relatedMap.values()));

        renderSection(items, currentId, ct);
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
