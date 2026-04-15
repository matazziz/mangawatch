function buildFallbackResponse(isAnime) {
  const nowIso = new Date().toISOString();
  const mangaData = [
    { mal_id: 1, title: "One Piece", type: "Manga", score: 9.2, status: "Publishing", chapters: 1110, volumes: 109, synopsis: "L'aventure de Luffy et de son equipage a travers Grand Line.", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/manga/2/253146.jpg" } }, genres: [{ name: "Action" }, { name: "Adventure" }], published: { prop: { from: { year: 1997 } } } },
    { mal_id: 2, title: "Berserk", type: "Manga", score: 9.4, status: "Publishing", chapters: 376, volumes: 42, synopsis: "Un dark fantasy culte sur la survie et la vengeance.", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/manga/1/157897.jpg" } }, genres: [{ name: "Action" }, { name: "Drama" }], published: { prop: { from: { year: 1989 } } } },
    { mal_id: 3, title: "Monster", type: "Manga", score: 9.1, status: "Finished", chapters: 162, volumes: 18, synopsis: "Le thriller psychologique majeur de Naoki Urasawa.", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/manga/3/258224.jpg" } }, genres: [{ name: "Mystery" }, { name: "Psychological" }], published: { prop: { from: { year: 1994 } } } },
    { mal_id: 4, title: "Vagabond", type: "Manga", score: 9.3, status: "Hiatus", chapters: 327, volumes: 37, synopsis: "La quete de Miyamoto Musashi, entre art et violence.", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/manga/1/259070.jpg" } }, genres: [{ name: "Action" }, { name: "Historical" }], published: { prop: { from: { year: 1998 } } } },
    { mal_id: 5, title: "Vinland Saga", type: "Manga", score: 9.0, status: "Publishing", chapters: 210, volumes: 28, synopsis: "Une saga viking entre vengeance et paix interieure.", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/manga/2/188925.jpg" } }, genres: [{ name: "Action" }, { name: "Historical" }], published: { prop: { from: { year: 2005 } } } }
  ];

  const animeData = [
    { mal_id: 101, title: "Fullmetal Alchemist: Brotherhood", type: "TV", score: 9.1, status: "Finished Airing", episodes: 64, duration: "24 min", synopsis: "Deux freres alchimistes cherchent la verite et la redemption.", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1223/96541.jpg" } }, genres: [{ name: "Action" }, { name: "Adventure" }], aired: { prop: { from: { year: 2009 } } } },
    { mal_id: 102, title: "Attack on Titan", type: "TV", score: 8.8, status: "Finished Airing", episodes: 25, duration: "24 min", synopsis: "L'humanite lutte pour survivre face aux titans.", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/10/47347.jpg" } }, genres: [{ name: "Action" }, { name: "Drama" }], aired: { prop: { from: { year: 2013 } } } },
    { mal_id: 103, title: "Death Note", type: "TV", score: 8.6, status: "Finished Airing", episodes: 37, duration: "23 min", synopsis: "Un duel psychologique autour d'un cahier mortel.", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/9/9453.jpg" } }, genres: [{ name: "Mystery" }, { name: "Supernatural" }], aired: { prop: { from: { year: 2006 } } } },
    { mal_id: 104, title: "Jujutsu Kaisen", type: "TV", score: 8.5, status: "Finished Airing", episodes: 24, duration: "24 min", synopsis: "Des exorcistes combattent des fleaux maudits.", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1171/109222.jpg" } }, genres: [{ name: "Action" }, { name: "Supernatural" }], aired: { prop: { from: { year: 2020 } } } },
    { mal_id: 105, title: "Demon Slayer", type: "TV", score: 8.5, status: "Finished Airing", episodes: 26, duration: "23 min", synopsis: "Tanjiro combat les demons pour sauver sa soeur.", images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg" } }, genres: [{ name: "Action" }, { name: "Fantasy" }], aired: { prop: { from: { year: 2019 } } } }
  ];

  return {
    data: isAnime ? animeData : mangaData,
    pagination: {
      last_visible_page: 1,
      has_next_page: false,
      current_page: 1,
      items: {
        count: isAnime ? animeData.length : mangaData.length,
        total: isAnime ? animeData.length : mangaData.length,
        per_page: 25
      }
    },
    generated_at: nowIso
  };
}

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

          const isAnime = upstreamPath.includes("anime");
          const fallbackPayload = buildFallbackResponse(isAnime);
          const fallbackHeaders = new Headers({
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
            "Access-Control-Allow-Origin": "*",
            "X-MangaWatch-Proxy": "jikan-fallback"
          });
          const fallbackResponse = new Response(JSON.stringify(fallbackPayload), {
            status: 200,
            headers: fallbackHeaders
          });
          await cache.put(cacheKey, fallbackResponse.clone());
          return fallbackResponse;
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