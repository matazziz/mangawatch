const ANILIST_URL = 'https://graphql.anilist.co';

const CORS_HEADERS = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (e) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Invalid JSON body' })
        };
    }

    if (!payload.query) {
        return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Missing GraphQL query' })
        };
    }

    const fetchWithTimeout = async (url, body, ms = 20000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        try {
            return await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            });
        } finally {
            clearTimeout(timer);
        }
    };

    try {
        let upstream = await fetchWithTimeout(ANILIST_URL, {
            query: payload.query,
            variables: payload.variables || {}
        });
        if ([429, 502, 503, 504].includes(upstream.status)) {
            await new Promise((r) => setTimeout(r, 1200));
            upstream = await fetchWithTimeout(ANILIST_URL, {
                query: payload.query,
                variables: payload.variables || {}
            });
        }

        const text = await upstream.text();
        return {
            statusCode: upstream.status,
            headers: {
                ...CORS_HEADERS,
                'Cache-Control': 'public, max-age=120'
            },
            body: text
        };
    } catch (error) {
        return {
            statusCode: 502,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                errors: [{ message: error?.message || 'AniList proxy failed' }]
            })
        };
    }
};
