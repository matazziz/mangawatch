/**
 * Configuration API centralisee.
 */
(function (global) {
    'use strict';

    let jikanChain = Promise.resolve();
    let anilistChain = Promise.resolve();
    let lastAniListAt = 0;
    // AniList est souvent limite a ~30 req/min : espacer les appels.
    const ANILIST_MIN_INTERVAL_MS = 2100;

    function delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    global.MW_API_CONFIG = {
        /** true = tous les appels Jikan passent par /manga/ uniquement */
        mangaOnly: false,

        isMangaOnly() {
            return !!this.mangaOnly;
        },

        getDefaultContentType() {
            return this.mangaOnly ? 'manga' : 'anime';
        },

        getApiMediaType(contentType) {
            const ct = (contentType || '').toLowerCase();
            if (ct === 'anime' || ct === 'film') return 'anime';
            if (ct === 'manga' || ct === 'manhwa' || ct === 'manhua' || ct === 'roman' || ct === 'doujin') {
                return 'manga';
            }
            if (this.mangaOnly) return 'manga';
            return 'anime';
        },

        /** Un seul appel Jikan a la fois (evite les 504 par surcharge) */
        enqueueJikan(fn) {
            const run = jikanChain.then(() => fn());
            jikanChain = run.catch(() => {});
            return run;
        },

        /** File d'attente AniList avec espacement anti rate-limit */
        enqueueAniList(fn) {
            const run = anilistChain.then(async () => {
                const wait = Math.max(0, ANILIST_MIN_INTERVAL_MS - (Date.now() - lastAniListAt));
                if (wait > 0) await delay(wait);
                lastAniListAt = Date.now();
                return fn();
            });
            anilistChain = run.catch(() => {});
            return run;
        },

        async fetchWithRetry(url, options = {}, maxRetries = 3) {
            const retryStatuses = new Set([429, 502, 503, 504]);
            const waits = [0, 1500, 3000];

            for (let attempt = 0; attempt < maxRetries; attempt += 1) {
                if (waits[attempt]) {
                    await new Promise((resolve) => setTimeout(resolve, waits[attempt]));
                }
                try {
                    const response = await fetch(url, options);
                    if (response.ok || !retryStatuses.has(response.status) || attempt === maxRetries - 1) {
                        return response;
                    }
                } catch (error) {
                    if (attempt === maxRetries - 1) throw error;
                }
            }
            throw new Error('fetchWithRetry: echec apres plusieurs tentatives');
        }
    };
})(typeof window !== 'undefined' ? window : global);
