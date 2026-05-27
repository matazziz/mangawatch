const JIKAN_API_BASE = "https://api.jikan.moe/v4";

function toInt(value, fallback) {
  const n = parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const action = (qs.action || "list").toLowerCase();
  const mediaType = (qs.mediaType || "manga").toLowerCase() === "anime" ? "anime" : "manga";

  const params = new URLSearchParams();
  let upstreamUrl = "";

  if (action === "detail") {
    const id = qs.id;
    if (!id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: "Missing id for detail action" })
      };
    }
    upstreamUrl = `${JIKAN_API_BASE}/${mediaType}/${encodeURIComponent(id)}/full`;
  } else if (action === "relations") {
    const id = qs.id;
    if (!id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: "Missing id for relations action" })
      };
    }
    upstreamUrl = `${JIKAN_API_BASE}/${mediaType}/${encodeURIComponent(id)}/relations`;
  } else {
    const page = Math.max(1, toInt(qs.page, 1));
    const limit = Math.min(25, Math.max(1, toInt(qs.limit, 25)));

    params.set("page", String(page));
    params.set("limit", String(limit));

    if (qs.q) params.set("q", String(qs.q).trim());
    if (qs.type) {
      // Jikan v4 attend les enums exacts (ex. doujinshi, one_shot), pas les libellés UI.
      let t = String(qs.type).toLowerCase().trim();
      if (mediaType === "manga") {
        if (t === "doujin") t = "doujinshi";
        if (t === "one shot" || t === "oneshot") t = "one_shot";
      }
      params.set("type", t);
    }
    if (qs.order_by) params.set("order_by", String(qs.order_by));
    if (qs.sort) params.set("sort", String(qs.sort));
    if (qs.min_score) params.set("min_score", String(qs.min_score));
    if (qs.genres) params.set("genres", String(qs.genres));
    if (qs.status) params.set("status", String(qs.status));
    // Evite le contenu adulte par défaut, sauf override explicite côté client.
    if (typeof qs.sfw !== "undefined" && qs.sfw !== null && String(qs.sfw).trim() !== "") {
      params.set("sfw", String(qs.sfw).toLowerCase());
    } else {
      params.set("sfw", "true");
    }

    upstreamUrl = `${JIKAN_API_BASE}/${mediaType}?${params.toString()}`;
  }

  const fetchWithTimeout = async (url, ms = 25000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let upstream = await fetchWithTimeout(upstreamUrl);
    if ([502, 503, 504, 429].includes(upstream.status)) {
      await new Promise((r) => setTimeout(r, 1500));
      upstream = await fetchWithTimeout(upstreamUrl);
    }

    const text = await upstream.text();
    return {
      statusCode: upstream.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60",
        "Access-Control-Allow-Origin": "*"
      },
      body: text
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        error: "Proxy request failed",
        message: error?.message || "Unknown error"
      })
    };
  }
};
