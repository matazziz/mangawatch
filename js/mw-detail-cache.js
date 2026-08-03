/**
 * Cache détail (catalogue) + repli AniList quand Jikan renvoie 504.
 */
(function (global) {
    'use strict';

    const ANILIST_PROXY = '/.netlify/functions/anilist-proxy';
    const PREFETCH_TTL_MS = 30 * 60 * 1000;
    const SNAPSHOT_KEY = 'mw_catalogue_snapshot';
    const ANILIST_REL_TYPES = new Set([
        'SEQUEL', 'PREQUEL', 'PARENT', 'SIDE_STORY', 'SPIN_OFF', 'ALTERNATIVE',
        'SUMMARY', 'OTHER', 'COMPILATION'
    ]);
    const ANILIST_STRICT_FILTER_TYPES = new Set(['SIDE_STORY', 'SPIN_OFF', 'ALTERNATIVE', 'OTHER']);

    function stripHtml(html) {
        if (!html) return '';
        const div = document.createElement('div');
        div.innerHTML = html;
        return (div.textContent || div.innerText || '').trim();
    }

    function prefetchKey(malId, contentType) {
        return `mw_detail_${(contentType || 'manga').toLowerCase()}_${malId}`;
    }

    function saveDetailPrefetch(content, contentType) {
        if (!content || !content.mal_id) return;
        try {
            sessionStorage.setItem(
                prefetchKey(content.mal_id, contentType),
                JSON.stringify({ ts: Date.now(), contentType, data: content })
            );
        } catch (e) { /* quota */ }
    }

    function getDetailPrefetch(malId, contentType) {
        try {
            const raw = sessionStorage.getItem(prefetchKey(malId, contentType));
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed?.data || Date.now() - parsed.ts > PREFETCH_TTL_MS) {
                sessionStorage.removeItem(prefetchKey(malId, contentType));
                return null;
            }
            return parsed;
        } catch (e) {
            return null;
        }
    }

    function saveCatalogueSnapshot(items, contentType) {
        if (!Array.isArray(items) || items.length === 0) return;
        try {
            const slim = items.slice(0, 120).map((item) => ({
                mal_id: item.mal_id,
                title: item.title,
                synopsis: item.synopsis,
                score: item.score,
                images: item.images,
                genres: item.genres,
                type: item.type,
                year: item.year,
                chapters: item.chapters,
                volumes: item.volumes,
                episodes: item.episodes,
                published: item.published,
                aired: item.aired
            }));
            sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify({
                ts: Date.now(),
                contentType: contentType || 'manga',
                items: slim
            }));
        } catch (e) { /* quota */ }
    }

    function getCatalogueSnapshot() {
        try {
            const raw = sessionStorage.getItem(SNAPSHOT_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed?.items || Date.now() - parsed.ts > PREFETCH_TTL_MS) {
                sessionStorage.removeItem(SNAPSHOT_KEY);
                return null;
            }
            return parsed;
        } catch (e) {
            return null;
        }
    }

    async function anilistRequest(query, variables) {
        const doFetch = async () => {
            const response = await fetch(ANILIST_PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ query, variables })
            });
            if (response.status === 429) {
                const retryAfter = Number(response.headers.get('Retry-After') || 2);
                const err = new Error(`AniList HTTP 429`);
                err.status = 429;
                err.retryAfter = retryAfter;
                throw err;
            }
            if (!response.ok) throw new Error(`AniList HTTP ${response.status}`);
            const payload = await response.json();
            if (payload.errors?.length) {
                const first = payload.errors[0];
                const err = new Error(first.message || 'AniList error');
                err.status = first.status || 400;
                throw err;
            }
            return payload.data;
        };

        const runner = global.MW_API_CONFIG?.enqueueAniList
            ? (fn) => global.MW_API_CONFIG.enqueueAniList(fn)
            : (fn) => fn();

        let lastError = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                return await runner(doFetch);
            } catch (error) {
                lastError = error;
                const status = error?.status;
                if (status === 429 || status === 502 || status === 503 || status === 504) {
                    const waitMs = Math.max(1500, (error.retryAfter || 2) * 1000) + attempt * 800;
                    await new Promise((resolve) => setTimeout(resolve, waitMs));
                    continue;
                }
                throw error;
            }
        }
        throw lastError || new Error('AniList request failed');
    }

    function normalizeTitleForMatch(s) {
        return String(s || '').toLowerCase().normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    }

    function titlesRoughlyMatch(a, b) {
        const na = normalizeTitleForMatch(a);
        const nb = normalizeTitleForMatch(b);
        if (!na || !nb) return true;
        return na === nb || na.includes(nb) || nb.includes(na);
    }

    function mapAniListFormatToLegacy(mediaType, format) {
        const normalized = String(format || '').toUpperCase();
        if (mediaType === 'anime') {
            if (normalized === 'MOVIE') return 'Movie';
            if (normalized === 'OVA') return 'OVA';
            if (normalized === 'ONA') return 'ONA';
            if (normalized === 'SPECIAL') return 'Special';
            if (normalized === 'MUSIC') return 'Music';
            return 'TV';
        }
        if (normalized === 'NOVEL' || normalized === 'LIGHT_NOVEL') return 'Novel';
        if (normalized === 'ONE_SHOT') return 'One Shot';
        if (normalized === 'MANHWA') return 'Manhwa';
        if (normalized === 'MANHUA') return 'Manhua';
        return 'Manga';
    }

    function anilistToLegacy(media, mediaType) {
        if (!media || !media.idMal) return null;
        const year = media.startDate?.year || null;
        const image = media.coverImage?.extraLarge || media.coverImage?.large || '';
        const airedFrom = startDateToIso(media.startDate);
        return {
            mal_id: media.idMal,
            anilist_id: media.id,
            title: media.title?.english || media.title?.romaji || media.title?.native || 'Sans titre',
            title_english: media.title?.english || null,
            title_japanese: media.title?.native || null,
            images: { jpg: { large_image_url: image, image_url: image } },
            synopsis: stripHtml(media.description) || 'Synopsis indisponible.',
            score: media.averageScore ? media.averageScore / 10 : null,
            genres: (media.genres || []).map((name) => ({ name })),
            type: mapAniListFormatToLegacy(mediaType, media.format),
            rawFormat: media.format || null,
            chapters: media.chapters || null,
            volumes: media.volumes || null,
            episodes: media.episodes || null,
            duration: media.duration ? `${media.duration} min` : null,
            year,
            startMonth: media.startDate?.month || null,
            startDay: media.startDate?.day || null,
            airedFrom,
            published: { prop: { from: { year } }, from: airedFrom },
            aired: { prop: { from: { year } }, from: airedFrom },
            popularity: media.popularity || 0,
            _source: 'anilist'
        };
    }

    const RELATION_NODE_FIELDS = `
        id idMal type format
        title { romaji english }
        coverImage { extraLarge large }
        startDate { year month day }
    `;

    function startDateToIso(startDate) {
        const y = Number(startDate?.year);
        if (!Number.isFinite(y) || y <= 0) return null;
        const m = Number(startDate?.month);
        const d = Number(startDate?.day);
        const month = Number.isFinite(m) && m >= 1 && m <= 12 ? m : 1;
        const day = Number.isFinite(d) && d >= 1 && d <= 31 ? d : 1;
        return `${String(y).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    function relationNodeToItem(node, relationType) {
        if (!node?.idMal) return null;
        const title = node.title?.english || node.title?.romaji || '';
        const image = node.coverImage?.extraLarge || node.coverImage?.large || '';
        const year = node.startDate?.year || '';
        return {
            mal_id: node.idMal,
            title,
            image,
            year,
            startMonth: node.startDate?.month || null,
            startDay: node.startDate?.day || null,
            airedFrom: startDateToIso(node.startDate),
            relationType: String(relationType || 'related').toLowerCase().replace(/_/g, '-')
        };
    }

    function flattenRelationEdges(edges, acc = [], seen = new Set(), depth = 0, maxDepth = 2) {
        for (const edge of edges || []) {
            const node = edge?.node;
            if (!node?.idMal) continue;
            const key = `${String(edge.relationType || '').toUpperCase()}:${node.idMal}`;
            if (!seen.has(key)) {
                seen.add(key);
                acc.push({
                    relationType: edge.relationType,
                    node: {
                        id: node.id,
                        idMal: node.idMal,
                        type: node.type,
                        format: node.format,
                        title: node.title,
                        coverImage: node.coverImage,
                        startDate: node.startDate
                    }
                });
            }
            if (depth < maxDepth && Array.isArray(node.relations?.edges) && node.relations.edges.length) {
                flattenRelationEdges(node.relations.edges, acc, seen, depth + 1, maxDepth);
            }
        }
        return acc;
    }

    function storeAniListRelations(malId, edges) {
        if (!malId || !edges) return;
        try {
            const flat = flattenRelationEdges(edges, [], new Set(), 0, 2);
            sessionStorage.setItem(
                `mw_anilist_rel_${malId}`,
                JSON.stringify({ ts: Date.now(), edges: flat })
            );
        } catch (e) { /* quota */ }
    }

    async function fetchAniListByMalId(malId, titleHint, mediaType) {
        const gqlType = mediaType === 'manga' ? 'MANGA' : 'ANIME';
        const detailQuery = `
            query ($idMal: Int, $type: MediaType) {
                Media(idMal: $idMal, type: $type) {
                    id idMal
                    title { romaji english native }
                    description(asHtml: false)
                    coverImage { extraLarge large }
                    averageScore
                    status
                    format
                    chapters volumes
                    episodes
                    duration
                    startDate { year month day }
                    genres
                    relations {
                        edges {
                            relationType
                            node {
                                ${RELATION_NODE_FIELDS}
                                relations {
                                    edges {
                                        relationType
                                        node { ${RELATION_NODE_FIELDS} }
                                    }
                                }
                            }
                        }
                    }
                }
            }`;

        let media = null;
        try {
            const wantedMal = parseInt(malId, 10);
            const data = await anilistRequest(detailQuery, { idMal: wantedMal, type: gqlType });
            media = data?.Media;
            if (media && media.idMal !== wantedMal) {
                media = null;
            } else if (media && titleHint && !titlesRoughlyMatch(
                media.title?.romaji || media.title?.english, titleHint
            )) {
                console.warn('[mw-detail-cache] titre AniList différent, idMal conservé:', malId);
            }
        } catch (e) {
            console.warn('[mw-detail-cache] idMal AniList:', e);
        }

        if (!media && titleHint) {
            try {
            const searchQuery = `
                query ($search: String, $type: MediaType) {
                    Page(perPage: 12) {
                        media(search: $search, type: $type, sort: SEARCH_MATCH) {
                            id idMal
                            title { romaji english native }
                            description(asHtml: false)
                            coverImage { extraLarge large }
                            averageScore
                            status
                            format
                            chapters volumes
                            episodes
                            duration
                            startDate { year month day }
                            genres
                            relations {
                                edges {
                                    relationType
                                    node {
                                        ${RELATION_NODE_FIELDS}
                                        relations {
                                            edges {
                                                relationType
                                                node { ${RELATION_NODE_FIELDS} }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }`;
            const searchData = await anilistRequest(searchQuery, { search: titleHint, type: gqlType });
            const list = searchData?.Page?.media || [];
            const wantedMal = parseInt(malId, 10);
            media = list.find((m) => m.idMal === wantedMal)
                || list.find((m) => m.idMal && titlesRoughlyMatch(
                    m.title?.romaji || m.title?.english, titleHint
                ));
            } catch (searchErr) {
                console.warn('[mw-detail-cache] recherche AniList:', searchErr);
            }
        }

        if (!media) return null;

        const legacy = anilistToLegacy(media, mediaType);
        if (media.relations?.edges) {
            storeAniListRelations(malId, media.relations.edges);
        }
        return legacy;
    }

    async function searchFranchiseCluster(baseTitle, mediaType, referenceTitle, areSameSeriesFn) {
        const search = String(baseTitle || '').trim();
        if (search.length < 3) return new Map();

        const gqlType = mediaType === 'manga' ? 'MANGA' : 'ANIME';
        const seriesCt = mediaType === 'manga' ? 'manga' : 'anime';
        const query = `
            query ($search: String, $type: MediaType, $page: Int) {
                Page(page: $page, perPage: 50) {
                    pageInfo { hasNextPage }
                    media(search: $search, type: $type, sort: START_DATE, isAdult: false) {
                        ${RELATION_NODE_FIELDS}
                        relations {
                            edges {
                                relationType
                                node { ${RELATION_NODE_FIELDS} }
                            }
                        }
                    }
                }
            }`;

        const mediaList = [];
        try {
            for (let page = 1; page <= 2; page += 1) {
                const data = await anilistRequest(query, { search, type: gqlType, page });
                const batch = data?.Page?.media || [];
                mediaList.push(...batch);
                if (!data?.Page?.pageInfo?.hasNextPage) break;
            }
        } catch (error) {
            console.warn('[mw-detail-cache] franchise search:', error?.message || error);
            if (!mediaList.length) return new Map();
        }

        const items = new Map();
        const edgeBag = [];
        const refTitle = referenceTitle || search;

        for (const media of mediaList) {
            if (!media?.idMal) continue;
            const title = media.title?.english || media.title?.romaji || '';
            if (!areSameSeriesFn || !areSameSeriesFn(title, refTitle, seriesCt)) continue;

            const mapped = relationNodeToItem(media, 'franchise');
            if (mapped) items.set(String(media.idMal), mapped);

            if (media.relations?.edges?.length) {
                edgeBag.push(...media.relations.edges);
            }
        }

        const fromEdges = anilistEdgesToRelatedItems(edgeBag, mediaType, refTitle, areSameSeriesFn);
        fromEdges.forEach((value, key) => {
            const prev = items.get(key);
            items.set(key, prev
                ? {
                    ...prev,
                    ...value,
                    image: value.image || prev.image,
                    title: value.title || prev.title,
                    airedFrom: value.airedFrom || prev.airedFrom,
                    year: value.year || prev.year,
                    startMonth: value.startMonth || prev.startMonth,
                    startDay: value.startDay || prev.startDay
                }
                : value);
        });

        return items;
    }

    function getAniListRelations(malId) {
        try {
            const raw = sessionStorage.getItem(`mw_anilist_rel_${malId}`);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (Date.now() - parsed.ts > PREFETCH_TTL_MS) return null;
            return parsed.edges || null;
        } catch (e) {
            return null;
        }
    }

    function anilistEdgesToRelatedItems(edges, mediaType, referenceTitle, areSameSeriesFn) {
        const items = new Map();
        const wantType = mediaType === 'manga' ? 'MANGA' : 'ANIME';
        const seriesCt = mediaType === 'manga' ? 'manga' : 'anime';
        const flatEdges = flattenRelationEdges(edges || [], [], new Set(), 0, 2);

        for (const edge of flatEdges) {
            const rel = String(edge.relationType || '').toUpperCase();
            if (!ANILIST_REL_TYPES.has(rel)) continue;
            const node = edge.node;
            if (!node || node.type !== wantType) continue;
            if (!node.idMal) continue;
            const title = node.title?.english || node.title?.romaji || '';
            if (ANILIST_STRICT_FILTER_TYPES.has(rel) && areSameSeriesFn
                && !areSameSeriesFn(title, referenceTitle, seriesCt)) {
                continue;
            }
            const mapped = relationNodeToItem(node, rel);
            if (mapped) items.set(String(node.idMal), mapped);
        }
        return items;
    }

    global.MWDetailCache = {
        saveDetailPrefetch,
        getDetailPrefetch,
        saveCatalogueSnapshot,
        getCatalogueSnapshot,
        fetchAniListByMalId,
        searchFranchiseCluster,
        getAniListRelations,
        anilistEdgesToRelatedItems
    };
})(typeof window !== 'undefined' ? window : global);
