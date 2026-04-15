export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy Jikan pour éviter le blocage CORS côté navigateur
    if (url.pathname.startsWith("/api/jikan/")) {
      const upstreamPath = url.pathname.slice("/api/jikan/".length);
      const upstreamUrl = `https://api.jikan.moe/v4/${upstreamPath}${url.search}`;
      try {
        const res = await fetch(upstreamUrl, {
          method: "GET",
          headers: { Accept: "application/json" }
        });
        const headers = new Headers(res.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Cache-Control", "public, max-age=120");
        headers.set("X-MangaWatch-Proxy", "jikan");
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers
        });
      } catch (e) {
        return new Response(
          JSON.stringify({
            ok: false,
            message: "Proxy error"
          }),
          {
            status: 502,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store",
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