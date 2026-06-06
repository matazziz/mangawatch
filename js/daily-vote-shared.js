/**
 * Vote du jour — même 3 œuvres pour tous + sélection mainstream (top MAL).
 */
import { db } from './firebase-config.js';
import {
    doc,
    getDoc,
    setDoc,
    onSnapshot,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const STORAGE_KEY = 'dailyVoteContent_v3';
const COLLECTION = 'site_daily_vote';
const SEED_VERSION = 'mainstream_v4';

/** Top anime / manga populaires (MAL) — rotation quotidienne dans ce pool. */
const MAINSTREAM_TOP = {
    anime: [
        5114, 1535, 16498, 30276, 11757, 38000, 9253, 25777, 11061, 22319,
        20, 4224, 40748, 28851, 31240, 29893, 38524, 37450, 32182, 44511,
        1735, 23273, 21939, 9969, 1575, 23283, 28977, 34096, 35180, 40852,
        32281, 31646, 20583, 30694, 28755, 24833, 39535, 42938, 41467, 48583,
        35760, 34599, 37991, 40028, 28171, 22199, 32935, 33206, 36838, 37779
    ],
    manga: [
        13, 1, 42, 3, 656, 12, 44307, 2, 1706, 75125,
        25, 30, 23390, 11734, 263, 11, 1624, 21, 51, 657,
        70345, 101517, 126545, 9674, 16765, 116778, 14483, 33566, 1224, 33327,
        11743, 128496, 119161, 132678, 136496, 113138, 105043, 104, 14467, 44511,
        46282, 132678, 100020, 85781, 116778, 126545, 101517, 70345, 9674, 16765
    ]
};

function hashSeed(str) {
    let h = 5381;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h) ^ s.charCodeAt(i);
    }
    return h >>> 0;
}

function getDayOfYear(date) {
    const d = new Date(date);
    return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
}

export function getDayKey(dateInput) {
    const d = new Date(dateInput);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function getContentTypeForDay(dateString) {
    const dayOfYear = getDayOfYear(dateString);
    return dayOfYear % 2 === 0 ? 'anime' : 'manga';
}

/** Conservé pour compatibilité affichage ; la sélection utilise le pool mainstream. */
export function getGenreForDay(dateString) {
    const dayOfYear = getDayOfYear(dateString);
    const labels = ['action', 'adventure', 'comedy', 'drama', 'fantasy', 'romance'];
    return labels[Math.floor(dayOfYear / 2) % labels.length];
}

export function getVoteSeed(today, contentType) {
    return `${SEED_VERSION}_${getDayKey(today)}_${contentType}`;
}

export function seededShuffle(array, seedStr) {
    const arr = array.slice();
    let seed = hashSeed(seedStr);
    for (let i = arr.length - 1; i > 0; i--) {
        seed = (seed * 1103515245 + 12345) >>> 0;
        const j = seed % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function pickDeterministicThreeIds(idPool, seedStr) {
    const unique = [...new Set(idPool)];
    const shuffled = seededShuffle(unique, seedStr);
    return shuffled.slice(0, 3);
}

export function readLocalDayContent(today, expectedSeed) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        if (saved.date !== today && saved.date !== new Date(today).toDateString()) return null;
        if (saved.seed && saved.seed !== expectedSeed) return null;
        if (!Array.isArray(saved.content) || saved.content.length < 3) return null;
        return saved;
    } catch {
        return null;
    }
}

export function writeLocalDayContent(payload) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.removeItem('dailyVoteContent');
}

export async function loadSharedDay(dayKey) {
    try {
        const snap = await getDoc(doc(db, COLLECTION, dayKey));
        if (snap.exists()) return snap.data();
    } catch (e) {
        console.warn('[DailyVote] Firestore lecture:', e);
    }
    return null;
}

export async function saveSharedDay(dayKey, payload) {
    try {
        await setDoc(doc(db, COLLECTION, dayKey), {
            ...payload,
            updated_at: serverTimestamp()
        }, { merge: true });
        return true;
    } catch (e) {
        console.warn('[DailyVote] Firestore écriture:', e);
        return false;
    }
}

export function watchSharedDay(dayKey, onData) {
    try {
        return onSnapshot(doc(db, COLLECTION, dayKey), function (snap) {
            if (snap.exists()) onData(snap.data());
        }, function (err) {
            console.warn('[DailyVote] Firestore watch:', err);
        });
    } catch (e) {
        console.warn('[DailyVote] Firestore watch init:', e);
        return function () {};
    }
}

export async function fetchJikanDetail(contentType, id) {
    const mediaType = contentType === 'anime' ? 'anime' : 'manga';
    const url = new URL('/.netlify/functions/jikan-proxy', window.location.origin);
    url.searchParams.set('action', 'detail');
    url.searchParams.set('mediaType', mediaType);
    url.searchParams.set('id', String(id));

    const fetchFn = window.MW_API_CONFIG?.fetchWithRetry || fetch;
    const response = await fetchFn(url.toString(), { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const data = await response.json();
    return data.data || null;
}

export function mapApiItemToVote(content, contentType) {
    const imageUrl = content.images?.jpg?.large_image_url ||
        content.images?.jpg?.image_url ||
        content.images?.webp?.large_image_url ||
        null;
    if (!content.mal_id || !content.title || !imageUrl) return null;
    if (imageUrl.includes('1749/128927.jpg')) return null;
    const score = Number(content.score) || 0;
    const members = Number(content.members) || 0;
    if (score > 0 && score < 6.5) return null;
    if (members > 0 && members < 50000) return null;

    return {
        id: content.mal_id,
        title: content.title,
        titleEnglish: content.title_english || content.title,
        genres: Array.isArray(content.genres) ? content.genres.map(function (g) { return g.name || g; }) : [],
        image: imageUrl,
        score: score,
        type: contentType
    };
}

async function fetchMainstreamVoteOptions(contentType, seed) {
    const pool = MAINSTREAM_TOP[contentType] || MAINSTREAM_TOP.manga;
    const pickedIds = pickDeterministicThreeIds(pool, seed);
    const voteOptions = [];

    for (let i = 0; i < pickedIds.length; i++) {
        if (i > 0) await new Promise(function (r) { setTimeout(r, 350); });
        try {
            const detail = await fetchJikanDetail(contentType, pickedIds[i]);
            if (!detail) continue;
            const mapped = mapApiItemToVote(detail, contentType);
            if (mapped) voteOptions.push(mapped);
        } catch (e) {
            console.warn('[DailyVote] détail ID', pickedIds[i], e);
        }
    }

    return voteOptions;
}

export async function buildDailyVoteContent(today, contentType, genre, seed) {
    const voteSeed = seed || getVoteSeed(today, contentType);
    let voteOptions = await fetchMainstreamVoteOptions(contentType, voteSeed);

    if (voteOptions.length < 3) {
        const extraIds = pickDeterministicThreeIds(pool, voteSeed + '_extra');
        for (const id of extraIds) {
            if (voteOptions.length >= 3) break;
            if (voteOptions.some(function (v) { return v.id === id; })) continue;
            await new Promise(function (r) { setTimeout(r, 350); });
            const detail = await fetchJikanDetail(contentType, id);
            const mapped = detail ? mapApiItemToVote(detail, contentType) : null;
            if (mapped) voteOptions.push(mapped);
        }
    }

    if (voteOptions.length >= 3) {
        return {
            date: today,
            dayKey: getDayKey(today),
            seed: voteSeed,
            contentType: contentType,
            genre: genre || 'mainstream',
            content: voteOptions.slice(0, 3),
            votes: {}
        };
    }

    return null;
}

const api = {
    STORAGE_KEY,
    MAINSTREAM_TOP,
    getDayKey,
    getContentTypeForDay,
    getGenreForDay,
    getVoteSeed,
    seededShuffle,
    pickDeterministicThreeIds,
    readLocalDayContent,
    writeLocalDayContent,
    loadSharedDay,
    saveSharedDay,
    watchSharedDay,
    fetchJikanDetail,
    mapApiItemToVote,
    buildDailyVoteContent,
    hashSeed
};

if (typeof window !== 'undefined') {
    window.MWDailyVote = api;
}

export default api;
