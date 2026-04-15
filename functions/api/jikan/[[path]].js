const JIKAN_BASE = 'https://api.jikan.moe/v4';

function buildUpstreamUrl(requestUrl) {
  const url = new URL(requestUrl);
  const prefix = '/api/jikan/';
  const path = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : '';
  const safePath = path || 'top/manga';
  return `${JIKAN_BASE}/${safePath}${url.search}`;
}

export async function onRequestGet(context) {
  const upstreamUrl = buildUpstreamUrl(context.request.url);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cf: {
        cacheEverything: true,
        cacheTtl: 120
      }
    });

    const headers = new Headers(upstreamResponse.headers);
    headers.set('Cache-Control', 'public, max-age=120');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('X-MangaWatch-Proxy', 'jikan');

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        source: 'mangawatch-pages-function',
        message: error && error.message ? error.message : 'Proxy error'
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
          'X-MangaWatch-Proxy': 'jikan'
        }
      }
    );
  }
}
