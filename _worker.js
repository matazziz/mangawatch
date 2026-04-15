export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy Jikan API côté serveur pour éviter les blocages CORS navigateur
    if (url.pathname.startsWith("/api/jikan/")) {
      const upstreamPath = url.pathname.slice("/api/jikan/".length);
      const upstreamUrl = `https://api.jikan.moe/v4/${upstreamPath}${url.search}`;
      const cache = caches.default;
      const cacheKey = new Request(url.toString(), { method: "GET" });

      try {
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
          return cachedResponse;
        }

        const upstreamResponse = await fetch(upstreamUrl, {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        });

        // Jikan peut répondre 429; si on a un cache, on le renvoie
        if (upstreamResponse.status === 429) {
          const stale = await cache.match(cacheKey);
          if (stale) return stale;
        }

        const headers = new Headers(upstreamResponse.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Cache-Control", "public, max-age=600");
        headers.set("X-MangaWatch-Proxy", "jikan");
        const proxiedResponse = new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers
        });

        // Mettre en cache uniquement les réponses valides
        if (upstreamResponse.ok) {
          await cache.put(cacheKey, proxiedResponse.clone());
        }

        return proxiedResponse;
      } catch (_) {
        return new Response(
          JSON.stringify({
            ok: false,
            source: "mangawatch-worker-proxy",
            message: "Proxy error"
          }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store",
              "Access-Control-Allow-Origin": "*",
              "X-MangaWatch-Proxy": "jikan"
            }
          }
        );
      }
    }

    if (url.pathname === "/") {
      const rewritten = new Request(new URL("/pages/acceuil.html", url), request);
      return env.ASSETS.fetch(rewritten);
    }

    return env.ASSETS.fetch(request);
  },
};