export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy Jikan API côté serveur pour éviter les blocages CORS navigateur
    if (url.pathname.startsWith("/api/jikan/")) {
      const upstreamPath = url.pathname.slice("/api/jikan/".length);
      const upstreamUrl = `https://api.jikan.moe/v4/${upstreamPath}${url.search}`;

      try {
        const upstreamResponse = await fetch(upstreamUrl, {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        });

        const headers = new Headers(upstreamResponse.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Cache-Control", "public, max-age=120");
        headers.set("X-MangaWatch-Proxy", "jikan");

        return new Response(upstreamResponse.body, {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          headers
        });
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