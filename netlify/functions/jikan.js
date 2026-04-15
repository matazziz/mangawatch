exports.handler = async (event) => {
  const endpointFromQuery = event.queryStringParameters && event.queryStringParameters.endpoint
    ? String(event.queryStringParameters.endpoint)
    : "";
  const path = endpointFromQuery || (event.path || "").replace(/^\/\.netlify\/functions\/jikan\/?/, "");
  const query = event.rawQuery ? `?${event.rawQuery}` : "";
  const upstreamPath = path || "top/manga";
  const upstreamUrl = `https://api.jikan.moe/v4/${upstreamPath}${query}`;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    const bodyText = await upstreamResponse.text();
    return {
      statusCode: upstreamResponse.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=120"
      },
      body: bodyText
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        ok: false,
        source: "netlify-jikan-proxy",
        message: error && error.message ? error.message : "Proxy error"
      })
    };
  }
};
