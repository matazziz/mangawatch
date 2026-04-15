const MAL_API_BASE = "https://api.myanimelist.net/v2";

function toInt(value, fallback) {
  const n = parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

exports.handler = async (event) => {
  const clientId = process.env.MAL_CLIENT_ID;
  if (!clientId) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "MAL_CLIENT_ID missing" })
    };
  }

  const qs = event.queryStringParameters || {};
  const action = qs.action || "list";
  const mediaType = (qs.mediaType || "manga").toLowerCase() === "anime" ? "anime" : "manga";

  let upstreamUrl = "";
  const params = new URLSearchParams();

  if (action === "detail") {
    const id = qs.id;
    if (!id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: "Missing id for detail action" })
      };
    }
    params.set(
      "fields",
      mediaType === "anime"
        ? "id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_list_users,num_scoring_users,nsfw,created_at,updated_at,media_type,status,genres,num_episodes,start_season,broadcast,source,average_episode_duration,rating,pictures,background,studios"
        : "id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_list_users,num_scoring_users,nsfw,created_at,updated_at,media_type,status,genres,num_volumes,num_chapters,authors,pictures,background"
    );
    upstreamUrl = `${MAL_API_BASE}/${mediaType}/${encodeURIComponent(id)}?${params.toString()}`;
  } else if (action === "search") {
    const q = (qs.q || "").trim();
    if (!q) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: "Missing q for search action" })
      };
    }
    params.set("q", q);
    params.set("limit", String(Math.min(100, Math.max(1, toInt(qs.limit, 25)))));
    params.set(
      "fields",
      mediaType === "anime"
        ? "id,title,main_picture,start_date,synopsis,mean,media_type,status,genres,num_episodes"
        : "id,title,main_picture,start_date,synopsis,mean,media_type,status,genres,num_volumes,num_chapters"
    );
    params.set("nsfw", "false");
    upstreamUrl = `${MAL_API_BASE}/${mediaType}?${params.toString()}`;
  } else {
    const limit = Math.min(100, Math.max(1, toInt(qs.limit, 25)));
    const page = Math.max(1, toInt(qs.page, 1));
    const offset = (page - 1) * limit;
    const rankingType = qs.ranking_type || "all";
    params.set("ranking_type", rankingType);
    params.set("limit", String(limit));
    params.set("offset", String(offset));
    params.set(
      "fields",
      mediaType === "anime"
        ? "id,title,main_picture,start_date,synopsis,mean,media_type,status,genres,num_episodes"
        : "id,title,main_picture,start_date,synopsis,mean,media_type,status,genres,num_volumes,num_chapters"
    );
    params.set("nsfw", "false");
    upstreamUrl = `${MAL_API_BASE}/${mediaType}/ranking?${params.toString()}`;
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        "X-MAL-CLIENT-ID": clientId,
        Accept: "application/json"
      }
    });

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
