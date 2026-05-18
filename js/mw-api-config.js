/**
 * Configuration temporaire API — passer mangaOnly à false quand l'API anime est rétablie.
 */
(function (global) {
    'use strict';

    let jikanChain = Promise.resolve();

    global.MW_API_CONFIG = {
        /** true = tous les appels Jikan passent par /manga/ uniquement */
        mangaOnly: true,

        isMangaOnly() {
            return !!this.mangaOnly;
        },

        getDefaultContentType() {
            return this.mangaOnly ? 'manga' : 'anime';
        },

        getApiMediaType(contentType) {
            if (this.mangaOnly) return 'manga';
            const ct = (contentType || 'anime').toLowerCase();
            return ct === 'manga' ? 'manga' : 'anime';
        },

        /** Un seul appel Jikan à la fois (évite les 504 par surcharge) */
        enqueueJikan(fn) {
            const run = jikanChain.then(() => fn());
            jikanChain = run.catch(() => {});
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
            throw new Error('fetchWithRetry: échec après plusieurs tentatives');
        }
    };
})(typeof window !== 'undefined' ? window : global);
