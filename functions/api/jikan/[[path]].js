const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';
const UPSTREAM_TIMEOUT_MS = 10000;

function getUpstreamUrl(requestUrl) {
    const url = new URL(requestUrl);
    const prefix = '/api/jikan/';
    const rawPath = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : '';
    const upstreamPath = rawPath || 'top/manga';
    return `${JIKAN_BASE_URL}/${upstreamPath}${url.search}`;
}

export async function onRequestGet(context) {
    const upstreamUrl = getUpstreamUrl(context.request.url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
        const upstreamResponse = await fetch(upstreamUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: {
                Accept: 'application/json'
            },
            cf: {
                cacheEverything: true,
                cacheTtl: 180
            }
        });

        const headers = new Headers(upstreamResponse.headers);
        headers.set('Cache-Control', 'public, max-age=180');
        headers.set('X-MangaWatch-Proxy', 'jikan');

        return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
            headers
        });
    } catch (error) {
        const isTimeout = error && error.name === 'AbortError';
        return new Response(
            JSON.stringify({
                ok: false,
                source: 'mangawatch-jikan-proxy',
                timeout: isTimeout,
                message: isTimeout ? 'Upstream timeout' : (error?.message || 'Proxy error')
            }),
            {
                status: isTimeout ? 504 : 502,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'no-store',
                    'X-MangaWatch-Proxy': 'jikan'
                }
            }
        );
    } finally {
        clearTimeout(timeoutId);
    }
}
