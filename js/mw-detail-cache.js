/**
 * Cache détail (catalogue) + repli AniList quand Jikan renvoie 504.
 */
(function (global) {
    'use strict';

    const ANILIST_URL = 'https://graphql.anilist.co';
    const PREFETCH_TTL_MS = 30 * 60 * 1000;
    const SNAPSHOT_KEY = 'mw_catalogue_snapshot';
    const ANILIST_REL_TYPES = new Set(['SEQUEL', 'PREQUEL', 'PARENT', 'SIDE_STORY', 'SPIN_OFF', 'ALTERNATIVE']);

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
        const response = await fetch(ANILIST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ query, variables })
        });
        if (!response.ok) throw new Error(`AniList HTTP ${response.status}`);
        const payload = await response.json();
        if (payload.errors?.length) {
            throw new Error(payload.errors[0].message || 'AniList error');
        }
        return payload.data;
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

    function anilistToLegacy(media, mediaType) {
        if (!media) return null;
        const year = media.startDate?.year || null;
        const image = media.coverImage?.extraLarge || media.coverImage?.large || '';
        return {
            mal_id: media.idMal || media.id,
            anilist_id: media.id,
            title: media.title?.english || media.title?.romaji || media.title?.native || 'Sans titre',
            title_english: media.title?.english || null,
            title_japanese: media.title?.native || null,
            images: { jpg: { large_image_url: image, image_url: image } },
            synopsis: stripHtml(media.description) || 'Synopsis indisponible.',
            score: media.averageScore ? media.averageScore / 10 : null,
            genres: (media.genres || []).map((name) => ({ name })),
            type: mediaType === 'manga' ? 'Manga' : 'TV',
            chapters: media.chapters || null,
            volumes: media.volumes || null,
            year,
            published: { prop: { from: { year } } },
            aired: { prop: { from: { year } } },
            popularity: media.popularity || 0,
            _source: 'anilist'
        };
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
                    chapters volumes
                    startDate { year }
                    genres
                    relations {
                        edges {
                            relationType
                            node {
                                id idMal type
                                title { romaji english }
                                coverImage { large }
                                startDate { year }
                            }
                        }
                    }
                }
            }`;

        let media = null;
        try {
            const data = await anilistRequest(detailQuery, { idMal: parseInt(malId, 10), type: gqlType });
            media = data?.Media;
            if (media && titleHint && !titlesRoughlyMatch(media.title?.romaji || media.title?.english, titleHint)) {
                media = null;
            }
        } catch (e) {
            console.warn('[mw-detail-cache] idMal AniList:', e);
        }

        if (!media && titleHint) {
            const searchQuery = `
                query ($search: String, $type: MediaType) {
                    Page(perPage: 12) {
                        media(search: $search, type: $type, sort: SEARCH_MATCH) {
                            id idMal
                            title { romaji english native }
                            description(asHtml: false)
                            coverImage { extraLarge large }
                            averageScore
                            chapters volumes
                            startDate { year }
                            genres
                            relations {
                                edges {
                                    relationType
                                    node {
                                        id idMal type
                                        title { romaji english }
                                        coverImage { large }
                                        startDate { year }
                                    }
                                }
                            }
                        }
                    }
                }`;
            const searchData = await anilistRequest(searchQuery, { search: titleHint, type: gqlType });
            const list = searchData?.Page?.media || [];
            media = list.find((m) => m.idMal === parseInt(malId, 10))
                || list.find((m) => titlesRoughlyMatch(m.title?.romaji, titleHint))
                || list[0];
        }

        if (!media) return null;

        const legacy = anilistToLegacy(media, mediaType);
        if (media.relations?.edges) {
            try {
                sessionStorage.setItem(
                    `mw_anilist_rel_${malId}`,
                    JSON.stringify({ ts: Date.now(), edges: media.relations.edges })
                );
            } catch (e) { /* quota */ }
        }
        return legacy;
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

        for (const edge of edges || []) {
            const rel = String(edge.relationType || '').toUpperCase();
            if (!ANILIST_REL_TYPES.has(rel)) continue;
            const node = edge.node;
            if (!node || node.type !== wantType) continue;
            const malId = node.idMal || node.id;
            if (!malId) continue;
            const title = node.title?.english || node.title?.romaji || '';
            if (areSameSeriesFn && !areSameSeriesFn(title, referenceTitle, seriesCt)) continue;
            const image = node.coverImage?.large || '';
            items.set(String(malId), {
                mal_id: malId,
                title,
                image,
                year: node.startDate?.year || '',
                airedFrom: null,
                relationType: rel.toLowerCase().replace(/_/g, '-')
            });
        }
        return items;
    }

    global.MWDetailCache = {
        saveDetailPrefetch,
        getDetailPrefetch,
        saveCatalogueSnapshot,
        getCatalogueSnapshot,
        fetchAniListByMalId,
        getAniListRelations,
        anilistEdgesToRelatedItems
    };
})(typeof window !== 'undefined' ? window : global);
