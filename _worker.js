export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

    // Proxy API Jikan côté serveur pour éviter les erreurs CORS côté navigateur
      if (url.pathname.startsWith("/api/jikan/")) {
        const upstreamPath = url.pathname.replace("/api/jikan/", "");
        const upstreamUrl = `https://api.jikan.moe/v4/${upstreamPath}${url.search}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const upstreamResponse = await fetch(upstreamUrl, {
            method: "GET",
            signal: controller.signal,
            headers: {
              Accept: "application/json"
            }
          });

          const headers = new Headers(upstreamResponse.headers);
          headers.set("Cache-Control", "public, max-age=180");
          headers.set("X-MangaWatch-Proxy", "jikan");

          return new Response(upstreamResponse.body, {
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
            headers
          });
        } catch (error) {
          const isTimeout = !!(error && error.name === "AbortError");
          const message = isTimeout
            ? "Upstream timeout"
            : ((error && error.message) ? error.message : "Proxy error");
          return new Response(
            JSON.stringify({
              ok: false,
              source: "mangawatch-worker-proxy",
              timeout: isTimeout,
              message
            }),
            {
              status: isTimeout ? 504 : 502,
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store",
                "X-MangaWatch-Proxy": "jikan"
              }
            }
          );
        } finally {
          clearTimeout(timeoutId);
        }
      }

      if (url.pathname === "/") {
        const rewritten = new Request(new URL("/pages/acceuil.html", url), request);
        return env.ASSETS.fetch(rewritten);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      return new Response("Worker runtime error", { status: 500 });
    }
  },
};