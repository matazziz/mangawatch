const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

function buildUpstreamUrl(requestUrl) {
    const url = new URL(requestUrl);
    const prefix = '/api/jikan/';
    let upstreamPath = url.pathname.startsWith(prefix)
        ? url.pathname.slice(prefix.length)
        : '';

    if (!upstreamPath) {
        upstreamPath = 'top/anime';
    }

    // Sécuriser le chemin pour éviter les caractères inattendus
    const safePath = upstreamPath
        .split('/')
        .map(segment => encodeURIComponent(segment))
        .join('/');

    const upstreamUrl = new URL(`${JIKAN_BASE_URL}/${safePath}`);
    upstreamUrl.search = url.search;
    return upstreamUrl.toString();
}

export async function onRequestGet(context) {
    const upstreamUrl = buildUpstreamUrl(context.request.url);

    try {
        const upstreamResponse = await fetch(upstreamUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'MangaWatch-Cloudflare-Proxy/1.0'
            },
            cf: {
                cacheTtl: 120,
                cacheEverything: true
            }
        });

        const responseHeaders = new Headers(upstreamResponse.headers);
        responseHeaders.set('Cache-Control', 'public, max-age=120');
        responseHeaders.set('X-MangaWatch-Proxy', 'jikan');

        return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
            headers: responseHeaders
        });
    } catch (error) {
        return new Response(JSON.stringify({
            status: 503,
            type: 'Service Unavailable',
            message: 'Jikan proxy unavailable',
            error: error?.message || 'Unknown error'
        }), {
            status: 503,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-store'
            }
        });
    }
}
