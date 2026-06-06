/**
 * Sondage nouveautés — Reddit up/down, podium, propositions Firestore, recherche, pagination.
 */
import { db } from './firebase-config.js';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    deleteDoc,
    runTransaction,
    serverTimestamp,
    query,
    orderBy,
    where,
    limit
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const COUNTS_DOC_ID = 'counts';
const RETIRED_DOC_ID = 'retired';
const PROPOSALS_COL = 'feature_poll_proposals';
const LOCAL_VOTES_KEY = 'mw_feature_poll_votes';
const LOCAL_SCORES_KEY = 'mw_feature_poll_scores';
const PAGE_SIZE = 10;
const PODIUM_LAYOUT = [1, 0, 2]; // colonnes : 2e | 1er | 3e
const PODIUM_HEIGHT_BY_RANK = [
    'feature-poll-podium-slot--gold',
    'feature-poll-podium-slot--silver',
    'feature-poll-podium-slot--bronze'
];
const PODIUM_MEDALS = ['🥇', '🥈', '🥉']; // index 0 = 1er, 1 = 2e, 2 = 3e
const PLACE_KEYS = ['home.feature_poll_place_1', 'home.feature_poll_place_2', 'home.feature_poll_place_3'];

export const PROPOSAL_THEMES = {
    social: { labelKey: 'home.feature_poll_theme_social', icon: 'fa-users', class: 'feature-poll-theme--social' },
    collection: { labelKey: 'home.feature_poll_theme_collection', icon: 'fa-bookmark', class: 'feature-poll-theme--collection' },
    ui: { labelKey: 'home.feature_poll_theme_ui', icon: 'fa-palette', class: 'feature-poll-theme--ui' },
    community: { labelKey: 'home.feature_poll_theme_community', icon: 'fa-people-group', class: 'feature-poll-theme--community' },
    notifications: { labelKey: 'home.feature_poll_theme_notifications', icon: 'fa-bell', class: 'feature-poll-theme--notifications' },
    tech: { labelKey: 'home.feature_poll_theme_tech', icon: 'fa-microchip', class: 'feature-poll-theme--tech' }
};

const SEED_PROPOSALS = [
    { id: 'recommendations', titleKey: 'home.feature_poll_opt_recommendations', descKey: 'home.feature_poll_opt_recommendations_desc', theme: 'ui', icon: 'fa-wand-magic-sparkles', official: true },
    { id: 'calendar', titleKey: 'home.feature_poll_opt_calendar', descKey: 'home.feature_poll_opt_calendar_desc', theme: 'collection', icon: 'fa-calendar-days', official: true },
    { id: 'social', titleKey: 'home.feature_poll_opt_social', descKey: 'home.feature_poll_opt_social_desc', theme: 'social', icon: 'fa-users', official: true },
    { id: 'tierlist', titleKey: 'home.feature_poll_opt_tierlist', descKey: 'home.feature_poll_opt_tierlist_desc', theme: 'community', icon: 'fa-layer-group', official: true },
    { id: 'compare', titleKey: 'home.feature_poll_opt_compare', descKey: 'home.feature_poll_opt_compare_desc', theme: 'ui', icon: 'fa-scale-balanced', official: true },
    { id: 'notifications', titleKey: 'home.feature_poll_opt_notifications', descKey: 'home.feature_poll_opt_notifications_desc', theme: 'notifications', icon: 'fa-bell', official: true }
];

/** Propositions retirées localement (legacy) + liste Firestore `feature_poll/retired`. */
const RETIRED_PROPOSAL_IDS = ['offline'];
let retiredIdsCache = RETIRED_PROPOSAL_IDS.slice();

async function loadRetiredProposalIds() {
    try {
        const snap = await getDoc(doc(db, 'feature_poll', RETIRED_DOC_ID));
        const remote = snap.exists() ? (snap.data().ids || []) : [];
        retiredIdsCache = [...new Set(RETIRED_PROPOSAL_IDS.concat(remote))];
    } catch (e) {
        retiredIdsCache = RETIRED_PROPOSAL_IDS.slice();
    }
    return retiredIdsCache;
}

function withoutRetiredProposals(list) {
    return (list || []).filter(function (p) {
        return retiredIdsCache.indexOf(p.id) === -1;
    });
}

const state = {
    proposals: [],
    scores: {},
    userVotes: {},
    search: '',
    themeFilter: '',
    page: 1,
    isLoggedIn: false,
    canModerateProposals: false
};

const MODERATOR_USERNAMES = ['matazziz'];
const MODERATOR_EMAILS = ['mangawatch.off@gmail.com'];
const MODERATOR_EMAIL_PREFIXES = ['matazziz', 'mathieubroyer'];

function isModeratorEmail(email) {
    const norm = normalizeProfileEmail(email);
    if (!norm) return false;
    if (MODERATOR_EMAILS.indexOf(norm) !== -1) return true;
    const local = norm.split('@')[0];
    return MODERATOR_EMAIL_PREFIXES.indexOf(local) !== -1;
}

function isModeratorUsername(name) {
    const n = String(name || '').trim().toLowerCase();
    return MODERATOR_USERNAMES.indexOf(n) !== -1;
}

function isMatazzizModerator(user) {
    if (!user) return false;
    if (isModeratorUsername(user.username || user.name || user.pseudo)) return true;
    const email = normalizeProfileEmail(user.email);
    if (isModeratorEmail(email)) return true;
    try {
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        for (let i = 0; i < accounts.length; i++) {
            const acc = accounts[i];
            if (!acc || normalizeProfileEmail(acc.email) !== email) continue;
            if (isModeratorUsername(acc.username || acc.name || acc.pseudo)) return true;
        }
    } catch (e) { /* ignore */ }
    if (email) {
        try {
            const prof = JSON.parse(localStorage.getItem('profile_' + email) || '{}');
            if (isModeratorUsername(prof.username || prof.pseudo || prof.displayName)) return true;
        } catch (e) { /* ignore */ }
    }
    return false;
}

async function resolveMatazzizModerator(user) {
    if (isMatazzizModerator(user)) return true;
    if (!user || !user.email) return false;
    try {
        const profile = await loadAuthorProfile(user.email);
        if (profile && isModeratorUsername(profile.username)) return true;
    } catch (e) { /* ignore */ }
    return false;
}

function tr(key, fallback) {
    if (typeof window.t === 'function') {
        const v = window.t(key);
        if (v && v !== key) return v;
    }
    return fallback;
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
}

function voterDocId(email) {
    return encodeURIComponent(String(email).toLowerCase().trim());
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function defaultAvatar(name, email) {
    return initialsAvatarUrl(name, email);
}

function initialsAvatarUrl(name, email) {
    const raw = String(name || (email && email.split('@')[0]) || 'U').trim();
    const label = raw.substring(0, 2) || 'U';
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(label) +
        '&background=00b894&color=fff&size=400&bold=true';
}

function normalizeProfileEmail(email) {
    return String(email || '').trim().toLowerCase();
}

const STALE_AVATAR_HINTS = ['/images/logo.png', 'logo.png', '/images/default'];

function isValidAvatarUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (url === 'null' || url === 'undefined') return false;
    if (url.startsWith('blob:') || url.startsWith('data:')) return false;
    const lower = url.toLowerCase();
    for (let i = 0; i < STALE_AVATAR_HINTS.length; i++) {
        if (lower === STALE_AVATAR_HINTS[i] || lower.endsWith(STALE_AVATAR_HINTS[i])) return false;
    }
    return url.startsWith('http') || url.startsWith('/');
}

function enhanceAvatarUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (url.includes('googleusercontent.com')) {
        if (/=s\d+(-c)?/.test(url)) {
            return url.replace(/=s\d+(-c)?/g, '=s400-c');
        }
        return url + '=s400-c';
    }
    if (url.includes('ui-avatars.com') && !url.includes('size=')) {
        return url + (url.includes('?') ? '&' : '?') + 'size=400';
    }
    return url;
}

let firebaseServicesCache = null;
async function getFirebaseServices() {
    if (firebaseServicesCache) return firebaseServicesCache;
    try {
        const mod = await import('./firebase-service.js?v=6febe22');
        firebaseServicesCache = {
            avatarService: mod.avatarService || null,
            profileAdminService: mod.profileAdminService || null
        };
    } catch (e) {
        firebaseServicesCache = {
            avatarService: window.avatarService || null,
            profileAdminService: null
        };
    }
    return firebaseServicesCache;
}

async function buildProfileAvatarLookup() {
    const map = new Map();

    function put(email, data) {
        const norm = normalizeProfileEmail(email);
        if (!norm) return;
        const prev = map.get(norm) || {};
        const avatar = data.avatar || prev.avatar || null;
        map.set(norm, {
            username: data.username || data.name || prev.username || null,
            avatar: isValidAvatarUrl(avatar) ? avatar : (prev.avatar || null),
            verified: data.verified === true || prev.verified === true
        });
    }

    try {
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        for (let i = 0; i < accounts.length; i++) {
            const acc = accounts[i];
            if (!acc || !acc.email) continue;
            put(acc.email, {
                username: acc.username || acc.name,
                avatar: acc.customAvatar || acc.avatar || acc.originalAvatar || acc.picture,
                verified: acc.verified
            });
        }
    } catch (e) { /* ignore */ }

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('profile_') || key.startsWith('profile_description_') || key.startsWith('profile_banner_')) continue;
            try {
                const p = JSON.parse(localStorage.getItem(key) || '{}');
                put(p.email || key.replace('profile_', ''), {
                    username: p.username || p.pseudo,
                    avatar: p.customAvatar || p.avatar || p.picture || p.photoURL
                });
            } catch (e) { /* ignore */ }
        }
    } catch (e) { /* ignore */ }

    try {
        for (let k = 0; k < localStorage.length; k++) {
            const lk = localStorage.key(k);
            if (lk && lk.startsWith('avatar_')) {
                const em = lk.slice(7);
                const url = localStorage.getItem(lk);
                if (isValidAvatarUrl(url)) put(em, { avatar: url });
            }
        }
    } catch (e) { /* ignore */ }

    try {
        const services = await getFirebaseServices();
        if (services.profileAdminService && typeof services.profileAdminService.listAllUserProfiles === 'function') {
            const remoteUsers = await services.profileAdminService.listAllUserProfiles();
            if (Array.isArray(remoteUsers)) {
                remoteUsers.forEach(function (u) {
                    put(u.email, {
                        username: u.username || u.name,
                        avatar: u.avatar,
                        verified: u.verified
                    });
                });
            }
        }
    } catch (e) {
        console.warn('[FeaturePoll] Profils Firestore:', e);
    }

    return map;
}

function resolveAuthorAvatarFromLocal(email) {
    const norm = normalizeProfileEmail(email);
    if (!norm) return null;
    try {
        const fromKey = localStorage.getItem('avatar_' + norm);
        if (isValidAvatarUrl(fromKey)) return fromKey;
    } catch (e) { /* ignore */ }
    try {
        const prof = JSON.parse(localStorage.getItem('profile_' + norm) || '{}');
        const fromProf = prof.customAvatar || prof.avatar || prof.picture || prof.photoURL;
        if (isValidAvatarUrl(fromProf)) return fromProf;
    } catch (e) { /* ignore */ }
    try {
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        for (let i = 0; i < accounts.length; i++) {
            const acc = accounts[i];
            if (acc && normalizeProfileEmail(acc.email) === norm) {
                const url = acc.customAvatar || acc.avatar || acc.originalAvatar || acc.picture;
                if (isValidAvatarUrl(url)) return url;
            }
        }
    } catch (e) { /* ignore */ }
    return null;
}

function resolveAuthorAvatar(user, profile) {
    if (profile) {
        const fromProfile = profile.avatar || profile.customAvatar || profile.photoURL || profile.picture;
        if (isValidAvatarUrl(fromProfile)) return enhanceAvatarUrl(fromProfile);
    }
    if (!user) return null;
    const norm = normalizeProfileEmail(user.email);
    const fromLocal = resolveAuthorAvatarFromLocal(norm);
    if (fromLocal) return enhanceAvatarUrl(fromLocal);
    const fromStorage = norm ? localStorage.getItem('avatar_' + norm) : null;
    const url = user.customAvatar || user.avatar || user.originalAvatar || user.picture || fromStorage;
    if (isValidAvatarUrl(url)) return enhanceAvatarUrl(url);
    return null;
}

async function resolveProposalAvatar(p, lookup, avatarService) {
    if (!p.author_email || p.official) return p;

    const norm = normalizeProfileEmail(p.author_email);
    const fromLookup = lookup.get(norm);
    const current = getCurrentUser();
    const sameUser = current && normalizeProfileEmail(current.email) === norm;
    const pseudoUser = sameUser ? current : { email: p.author_email };
    const displayName = (fromLookup && fromLookup.username) || p.author_username;

    let avatar = null;

    if (fromLookup && isValidAvatarUrl(fromLookup.avatar)) {
        avatar = fromLookup.avatar;
    }

    if (!avatar) {
        avatar = resolveAuthorAvatar(pseudoUser, fromLookup);
    }

    if (!avatar) {
        avatar = resolveAuthorAvatarFromLocal(p.author_email);
    }

    if (!avatar && avatarService && typeof avatarService.getAvatar === 'function') {
        try {
            const remote = await avatarService.getAvatar(p.author_email);
            if (isValidAvatarUrl(remote)) avatar = remote;
        } catch (e) { /* ignore */ }
    }

    if (!avatar && isValidAvatarUrl(p.author_avatar)) {
        avatar = p.author_avatar;
    }

    if (!avatar) {
        avatar = initialsAvatarUrl(displayName, p.author_email);
    }

    return {
        ...p,
        author_avatar: enhanceAvatarUrl(avatar),
        author_username: displayName || p.author_username,
        author_verified: p.author_verified || (fromLookup && fromLookup.verified === true)
    };
}

async function enrichProposalAvatars(proposals) {
    const list = proposals || [];
    const services = await getFirebaseServices();
    const lookup = await buildProfileAvatarLookup();
    return Promise.all(list.map(function (p) {
        return resolveProposalAvatar(p, lookup, services.avatarService);
    }));
}

function isUserVerified(email) {
    if (!email) return false;
    try {
        const list = JSON.parse(localStorage.getItem('verified_users') || '[]');
        if (list.includes(email)) return true;
    } catch (e) { /* ignore */ }
    return false;
}

async function loadAuthorProfile(email) {
    if (!email) return null;
    const raw = String(email).trim();
    const variants = [];
    const norm = normalizeProfileEmail(raw);
    if (norm) variants.push(norm);
    if (raw && raw !== norm) variants.push(raw);

    for (let i = 0; i < variants.length; i++) {
        try {
            const snap = await getDoc(doc(db, 'user_profiles', variants[i]));
            if (snap.exists()) {
                const d = snap.data();
                return {
                    username: d.username || d.pseudo || d.displayName || null,
                    avatar: d.avatar || d.customAvatar || d.photoURL || d.picture || null,
                    verified: d.verified === true
                };
            }
        } catch (e) { /* ignore */ }
    }

    for (let j = 0; j < variants.length; j++) {
        try {
            const res = await getDocs(query(
                collection(db, 'user_profiles'),
                where('email', '==', variants[j]),
                limit(1)
            ));
            if (!res.empty) {
                const d = res.docs[0].data();
                return {
                    username: d.username || d.pseudo || d.displayName || null,
                    avatar: d.avatar || d.customAvatar || d.photoURL || d.picture || null,
                    verified: d.verified === true
                };
            }
        } catch (e) { /* ignore */ }
    }

    const local = resolveAuthorAvatarFromLocal(email);
    if (local) {
        return { username: null, avatar: local, verified: false };
    }
    return null;
}

/**
 * Ajoute une proposition au sondage.
 * @param {Object} info
 * @param {string} info.title - Titre affiché
 * @param {string} info.description - Description
 * @param {string} info.theme - Clé thème (social, collection, ui, community, notifications, tech)
 * @param {string} [info.icon] - Classe Font Awesome (ex: fa-star)
 * @returns {Promise<string>} id Firestore de la proposition
 */
export async function addFeatureProposal(info) {
    const title = String(info.title || '').trim();
    const description = String(info.description || '').trim();
    const theme = PROPOSAL_THEMES[info.theme] ? info.theme : 'ui';
    const icon = info.icon || PROPOSAL_THEMES[theme].icon;

    if (title.length < 3) throw new Error('title_too_short');
    if (description.length < 10) throw new Error('description_too_short');

    const user = getCurrentUser();
    if (!user || !user.email) throw new Error('login_required');

    const profile = await loadAuthorProfile(user.email);
    const verified = profile ? profile.verified : isUserVerified(user.email);
    const username = (profile && profile.username) || user.username || user.name || user.email.split('@')[0];

    const payload = {
        title: title,
        description: description,
        theme: theme,
        icon: icon,
        author_email: user.email,
        author_username: username,
        author_avatar: resolveAuthorAvatar(user, profile) || initialsAvatarUrl(username, user.email),
        author_verified: verified,
        official: false,
        created_at: serverTimestamp()
    };

    const ref = await addDoc(collection(db, PROPOSALS_COL), payload);

    const countsRef = doc(db, 'feature_poll', COUNTS_DOC_ID);
    const countsSnap = await getDoc(countsRef);
    const scores = countsSnap.exists()
        ? Object.assign(emptyScoresFromIds([ref.id]), countsSnap.data().scores || {})
        : emptyScoresFromIds([ref.id]);
    scores[ref.id] = scores[ref.id] || { up: 0, down: 0 };
    await setDoc(countsRef, { scores: scores, updated_at: serverTimestamp() }, { merge: true });

    return ref.id;
}

window.addFeatureProposal = addFeatureProposal;

function emptyScoresFromIds(ids) {
    const scores = {};
    (ids || []).forEach(function (id) {
        scores[id] = { up: 0, down: 0 };
    });
    return scores;
}

function normalizeScores(raw, proposalIds) {
    const scores = {};
    (proposalIds || []).forEach(function (id) {
        const entry = raw && raw[id];
        if (entry && typeof entry === 'object') {
            scores[id] = {
                up: Math.max(0, Number(entry.up) || 0),
                down: Math.max(0, Number(entry.down) || 0)
            };
        } else if (typeof entry === 'number') {
            scores[id] = { up: Math.max(0, entry), down: 0 };
        } else {
            scores[id] = { up: 0, down: 0 };
        }
    });
    return scores;
}

function getNetScore(id) {
    const s = state.scores[id] || { up: 0, down: 0 };
    return (Number(s.up) || 0) - (Number(s.down) || 0);
}

function proposalTitle(p) {
    if (p.titleKey) return tr(p.titleKey, p.id);
    return p.title || p.id;
}

function proposalDesc(p) {
    if (p.descKey) return tr(p.descKey, '');
    return p.description || '';
}

function getSearchBlob(p) {
    const theme = PROPOSAL_THEMES[p.theme];
    const themeLabel = theme ? tr(theme.labelKey, p.theme) : p.theme;
    return [
        proposalTitle(p),
        proposalDesc(p),
        p.author_username,
        p.author_email,
        themeLabel,
        p.theme
    ].join(' ').toLowerCase();
}

function filterProposals(list) {
    const q = state.search.trim().toLowerCase();
    return list.filter(function (p) {
        if (state.themeFilter && p.theme !== state.themeFilter) return false;
        if (!q) return true;
        return getSearchBlob(p).includes(q);
    });
}

function getSorted(list) {
    return list.slice().sort(function (a, b) {
        const diff = getNetScore(b.id) - getNetScore(a.id);
        if (diff !== 0) return diff;
        return (b.created_at || 0) - (a.created_at || 0);
    });
}

async function seedDefaultProposalsIfEmpty() {
    try {
        const snap = await getDocs(collection(db, PROPOSALS_COL));
        if (!snap.empty) return;

        for (const seed of SEED_PROPOSALS) {
            await setDoc(doc(db, PROPOSALS_COL, seed.id), {
                title: tr(seed.titleKey, seed.id),
                description: tr(seed.descKey, ''),
                titleKey: seed.titleKey,
                descKey: seed.descKey,
                theme: seed.theme,
                icon: seed.icon,
                author_email: null,
                author_username: tr('home.feature_poll_author_official', 'MangaWatch'),
                author_avatar: '/images/porte-torii.png',
                author_verified: true,
                official: true,
                created_at: serverTimestamp()
            });
        }
    } catch (err) {
        console.warn('[FeaturePoll] Seed:', err);
    }
}

function mapProposalDoc(d) {
    const data = d.data();
    return {
        id: d.id,
        title: data.title,
        description: data.description,
        titleKey: data.titleKey,
        descKey: data.descKey,
        theme: data.theme || 'ui',
        icon: data.icon || 'fa-lightbulb',
        author_email: data.author_email,
        author_username: data.author_username || tr('home.feature_poll_author_official', 'MangaWatch'),
        author_avatar: isValidAvatarUrl(data.author_avatar) ? data.author_avatar : null,
        author_verified: data.author_verified === true || data.official === true,
        official: data.official === true,
        created_at: data.created_at && data.created_at.toMillis ? data.created_at.toMillis() : Date.now()
    };
}

function fallbackProposals() {
    return SEED_PROPOSALS.map(function (s) {
        return {
            id: s.id,
            titleKey: s.titleKey,
            descKey: s.descKey,
            theme: s.theme,
            icon: s.icon,
            author_username: tr('home.feature_poll_author_official', 'MangaWatch'),
            author_avatar: '/images/porte-torii.png',
            author_verified: true,
            official: true,
            created_at: 0
        };
    });
}

async function fetchProposals() {
    try {
        await seedDefaultProposalsIfEmpty();
        let snap;
        try {
            snap = await getDocs(query(collection(db, PROPOSALS_COL), orderBy('created_at', 'desc')));
        } catch (orderErr) {
            snap = await getDocs(collection(db, PROPOSALS_COL));
        }
        if (snap.empty) return withoutRetiredProposals(fallbackProposals());
        return withoutRetiredProposals(snap.docs.map(mapProposalDoc).sort(function (a, b) {
            return (b.created_at || 0) - (a.created_at || 0);
        }));
    } catch (err) {
        console.warn('[FeaturePoll] fetchProposals:', err);
        return withoutRetiredProposals(fallbackProposals());
    }
}

async function fetchScores(ids) {
    const countsRef = doc(db, 'feature_poll', COUNTS_DOC_ID);
    try {
        const snap = await getDoc(countsRef);
        const remote = snap.exists() ? (snap.data().scores || snap.data().votes) : {};
        return normalizeScores(remote, ids);
    } catch (err) {
        console.warn('[FeaturePoll] scores:', err);
        try {
            return normalizeScores(JSON.parse(localStorage.getItem(LOCAL_SCORES_KEY) || '{}'), ids);
        } catch (e) {
            return normalizeScores({}, ids);
        }
    }
}

function loadLocalUserVotes() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_VOTES_KEY) || '{}') || {};
    } catch {
        return {};
    }
}

function saveLocalUserVotes(v) {
    localStorage.setItem(LOCAL_VOTES_KEY, JSON.stringify(v));
}

async function fetchUserVotes(email) {
    const local = loadLocalUserVotes();
    if (!email) return local;
    try {
        const snap = await getDoc(doc(db, 'feature_poll_voters', voterDocId(email)));
        if (snap.exists()) {
            const merged = Object.assign({}, local, snap.data().votes || {});
            saveLocalUserVotes(merged);
            return merged;
        }
    } catch (e) { /* ignore */ }
    return local;
}

function adjustScoreForVote(scores, optionId, prev, next) {
    if (!scores[optionId]) scores[optionId] = { up: 0, down: 0 };
    if (prev === 'up') scores[optionId].up = Math.max(0, scores[optionId].up - 1);
    else if (prev === 'down') scores[optionId].down = Math.max(0, scores[optionId].down - 1);
    if (next === 'up') scores[optionId].up += 1;
    else if (next === 'down') scores[optionId].down += 1;
}

async function applyVote(optionId, direction) {
    const user = getCurrentUser();
    if (!user || !user.email) throw new Error('login_required');

    const localVotes = loadLocalUserVotes();
    const prev = localVotes[optionId] || null;
    const remove = prev === direction;
    const next = remove ? null : direction;

    const voterRef = doc(db, 'feature_poll_voters', voterDocId(user.email));
    const countsRef = doc(db, 'feature_poll', COUNTS_DOC_ID);

    try {
        await runTransaction(db, async function (transaction) {
            const voterSnap = await transaction.get(voterRef);
            const countsSnap = await transaction.get(countsRef);
            const userVotes = voterSnap.exists() ? Object.assign({}, voterSnap.data().votes || {}) : {};
            const prevRemote = userVotes[optionId] || null;
            const ids = state.proposals.map(function (p) { return p.id; });
            const scores = countsSnap.exists()
                ? normalizeScores(countsSnap.data().scores || {}, ids)
                : normalizeScores({}, ids);

            if (prevRemote === direction) {
                adjustScoreForVote(scores, optionId, prevRemote, null);
                delete userVotes[optionId];
            } else {
                adjustScoreForVote(scores, optionId, prevRemote, direction);
                userVotes[optionId] = direction;
            }

            transaction.set(voterRef, { votes: userVotes, email: user.email, updated_at: serverTimestamp() }, { merge: true });
            transaction.set(countsRef, { scores: scores, updated_at: serverTimestamp() }, { merge: true });
        });
    } catch (err) {
        console.warn('[FeaturePoll] vote local fallback:', err);
        const ids = state.proposals.map(function (p) { return p.id; });
        const scores = normalizeScores(JSON.parse(localStorage.getItem(LOCAL_SCORES_KEY) || '{}'), ids);
        adjustScoreForVote(scores, optionId, prev, next);
        if (remove) delete localVotes[optionId];
        else localVotes[optionId] = direction;
        localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(scores));
        saveLocalUserVotes(localVotes);
    }

    const u = loadLocalUserVotes();
    if (remove) delete u[optionId];
    else u[optionId] = direction;
    saveLocalUserVotes(u);
    return { changed: true };
}

function renderThemeBadge(themeId) {
    const t = PROPOSAL_THEMES[themeId] || PROPOSAL_THEMES.ui;
    return (
        '<span class="feature-poll-theme-badge ' + t.class + '">' +
            '<i class="fas ' + t.icon + '" aria-hidden="true"></i> ' +
            escapeHtml(tr(t.labelKey, themeId)) +
        '</span>'
    );
}

function authorProfileUrl(p) {
    if (!p.author_email || p.official) return null;
    return 'user-profile.html?user=' + encodeURIComponent(p.author_email);
}

function renderAuthor(p) {
    const displayName = p.author_username || '—';
    const avatarSrc = enhanceAvatarUrl(p.author_avatar || initialsAvatarUrl(displayName, p.author_email));
    const av = escapeHtml(avatarSrc);
    const name = escapeHtml(displayName);
    const ver = p.author_verified
        ? '<span class="feature-poll-verified" title="Compte certifié"><i class="fas fa-check"></i></span>'
        : '';
    const profileUrl = authorProfileUrl(p);
    const fallback = escapeHtml(initialsAvatarUrl(displayName, p.author_email));
    const avatarHtml = '<img class="feature-poll-author-avatar" src="' + av + '" alt="" width="52" height="52" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src=\'' + fallback + '\'">';
    const nameHtml = name + ver;

    if (profileUrl) {
        const safeUrl = escapeHtml(profileUrl);
        return (
            '<div class="feature-poll-author">' +
                '<a href="' + safeUrl + '" class="feature-poll-author-avatar-link">' + avatarHtml + '</a>' +
                '<a href="' + safeUrl + '" class="feature-poll-author-link">' + nameHtml + '</a>' +
            '</div>'
        );
    }

    return (
        '<div class="feature-poll-author">' +
            avatarHtml +
            '<span class="feature-poll-author-name">' + nameHtml + '</span>' +
        '</div>'
    );
}

function renderVoteControls(optionId, userVote) {
    const upA = userVote === 'up' ? ' feature-poll-vote-btn--active-up' : '';
    const downA = userVote === 'down' ? ' feature-poll-vote-btn--active-down' : '';
    const dis = state.isLoggedIn ? '' : ' disabled';
    return (
        '<div class="feature-poll-votes" role="group">' +
            '<button type="button" class="feature-poll-vote-btn feature-poll-vote-btn--up' + upA + '"' + dis +
                ' data-option-id="' + optionId + '" data-direction="up" aria-label="' + escapeHtml(tr('home.feature_poll_up', 'Monter')) + '">' +
                '<i class="fas fa-chevron-up"></i></button>' +
            '<button type="button" class="feature-poll-vote-btn feature-poll-vote-btn--down' + downA + '"' + dis +
                ' data-option-id="' + optionId + '" data-direction="down" aria-label="' + escapeHtml(tr('home.feature_poll_down', 'Descendre')) + '">' +
                '<i class="fas fa-chevron-down"></i></button>' +
        '</div>'
    );
}

function renderDeleteButton(proposalId) {
    if (!state.canModerateProposals) return '';
    return (
        '<button type="button" class="feature-poll-delete-btn" data-delete-proposal="' + escapeHtml(proposalId) + '"' +
            ' title="' + escapeHtml(tr('home.feature_poll_delete', 'Supprimer cette idée')) + '"' +
            ' aria-label="' + escapeHtml(tr('home.feature_poll_delete', 'Supprimer cette idée')) + '">' +
            '<i class="fas fa-trash-alt" aria-hidden="true"></i>' +
        '</button>'
    );
}

function renderPodium(top3) {
    const el = document.getElementById('featurePollPodium');
    if (!el) return;

    const slots = PODIUM_LAYOUT.map(function (rankIndex) {
        const p = top3[rankIndex];
        const heightClass = PODIUM_HEIGHT_BY_RANK[rankIndex];
        const medal = PODIUM_MEDALS[rankIndex];
        const placeLabel = tr(PLACE_KEYS[rankIndex], String(rankIndex + 1));
        if (!p) {
            return '<div class="feature-poll-podium-slot feature-poll-podium-slot--empty ' + heightClass + '">' +
                '<span class="feature-poll-podium-medal" aria-hidden="true">' + medal + '</span>' +
                '<span class="feature-poll-podium-place">' + escapeHtml(placeLabel) + '</span></div>';
        }
        return (
            '<div class="feature-poll-podium-slot ' + heightClass + '" data-option-id="' + escapeHtml(p.id) + '">' +
                renderDeleteButton(p.id) +
                '<span class="feature-poll-podium-medal" aria-hidden="true">' + medal + '</span>' +
                '<span class="feature-poll-podium-place">' + escapeHtml(placeLabel) + '</span>' +
                '<div class="feature-poll-podium-icon"><i class="fas ' + p.icon + '"></i></div>' +
                '<div class="feature-poll-podium-content">' +
                    '<h4 class="feature-poll-podium-name">' + escapeHtml(proposalTitle(p)) + '</h4>' +
                    renderThemeBadge(p.theme) +
                '</div>' +
            '</div>'
        );
    });

    el.innerHTML = '<div class="feature-poll-podium-stage">' + slots.join('') + '</div>';
}

function renderCard(p, rank) {
    const userVote = state.userVotes[p.id] || null;
    const inTop = rank <= 3 ? ' feature-poll-item--podium' : '';
    return (
        '<article class="feature-poll-item' + inTop + '" role="listitem" data-option-id="' + p.id + '">' +
            renderVoteControls(p.id, userVote) +
            '<div class="feature-poll-card-main">' +
                '<div class="feature-poll-card-top">' +
                    renderAuthor(p) +
                    '<div class="feature-poll-badges">' +
                        renderThemeBadge(p.theme) +
                        renderDeleteButton(p.id) +
                    '</div>' +
                '</div>' +
                '<h3 class="feature-poll-name">' + escapeHtml(proposalTitle(p)) + '</h3>' +
                '<p class="feature-poll-desc">' + escapeHtml(proposalDesc(p)) + '</p>' +
            '</div>' +
        '</article>'
    );
}

function renderPagination(totalPages) {
    const nav = document.getElementById('featurePollPagination');
    if (!nav) return;
    if (totalPages <= 1) {
        nav.hidden = true;
        return;
    }
    nav.hidden = false;
    const page = state.page;
    nav.innerHTML =
        '<button type="button" class="feature-poll-page-btn" data-page="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>' +
            escapeHtml(tr('home.feature_poll_page_prev', 'Précédent')) +
        '</button>' +
        '<span class="feature-poll-page-info">' +
            escapeHtml(tr('home.feature_poll_page_info', 'Page {page} / {total}')
                .replace('{page}', String(page))
                .replace('{total}', String(totalPages))) +
        '</span>' +
        '<button type="button" class="feature-poll-page-btn" data-page="' + (page + 1) + '"' + (page >= totalPages ? ' disabled' : '') + '>' +
            escapeHtml(tr('home.feature_poll_page_next', 'Suivant')) +
        '</button>';

    nav.querySelectorAll('.feature-poll-page-btn:not([disabled])').forEach(function (btn) {
        btn.addEventListener('click', function () {
            state.page = parseInt(btn.getAttribute('data-page'), 10);
            renderAll();
            document.getElementById('featurePollList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function renderAll() {
    const listEl = document.getElementById('featurePollList');
    const emptyEl = document.getElementById('featurePollEmpty');
    const loginHint = document.getElementById('featurePollLoginHint');
    if (!listEl) return;

    if (loginHint) loginHint.hidden = state.isLoggedIn;

    const sorted = getSorted(state.proposals);
    const filtered = filterProposals(sorted);
    const top3 = sorted.slice(0, 3);

    renderPodium(top3);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    if (pageItems.length === 0) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.hidden = false;
    } else {
        if (emptyEl) emptyEl.hidden = true;
        listEl.innerHTML = pageItems.map(function (p) {
            const rank = sorted.findIndex(function (x) { return x.id === p.id; }) + 1;
            return renderCard(p, rank);
        }).join('');
    }

    renderPagination(totalPages);

    listEl.querySelectorAll('.feature-poll-vote-btn:not([disabled])').forEach(function (btn) {
        btn.addEventListener('click', onVoteClick);
    });

    listEl.querySelectorAll('.feature-poll-delete-btn').forEach(function (btn) {
        btn.addEventListener('click', onDeleteClick);
    });

    const podiumEl = document.getElementById('featurePollPodium');
    if (podiumEl) {
        podiumEl.querySelectorAll('.feature-poll-delete-btn').forEach(function (btn) {
            btn.addEventListener('click', onDeleteClick);
        });
    }
}

function populateThemeSelects() {
    const filterSel = document.getElementById('featurePollThemeFilter');
    const addSel = document.getElementById('featurePollAddTheme');
    const opts = Object.keys(PROPOSAL_THEMES).map(function (key) {
        const t = PROPOSAL_THEMES[key];
        return '<option value="' + key + '">' + escapeHtml(tr(t.labelKey, key)) + '</option>';
    }).join('');

    if (filterSel && filterSel.options.length <= 1) {
        filterSel.innerHTML = '<option value="">' + escapeHtml(tr('home.feature_poll_theme_all', 'Tous les thèmes')) + '</option>' + opts;
    }
    if (addSel && !addSel.options.length) {
        addSel.innerHTML = opts;
    }
}

async function refresh() {
    const user = getCurrentUser();
    state.isLoggedIn = !!(user && user.email);
    state.canModerateProposals = await resolveMatazzizModerator(user);
    await loadRetiredProposalIds();
    state.proposals = await enrichProposalAvatars(await fetchProposals());
    const ids = state.proposals.map(function (p) { return p.id; });
    state.scores = await fetchScores(ids);
    state.userVotes = await fetchUserVotes(user && user.email);
    renderAll();
}

async function onDeleteClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!state.canModerateProposals) return;

    const btn = ev.currentTarget;
    const proposalId = btn.getAttribute('data-delete-proposal');
    if (!proposalId) return;

    const proposal = state.proposals.find(function (p) { return p.id === proposalId; });
    const title = proposal ? proposalTitle(proposal) : proposalId;
    const msg = tr('home.feature_poll_delete_confirm', 'Supprimer « {title} » pour tous les utilisateurs ?')
        .replace('{title}', title);

    if (!window.confirm(msg)) return;

    btn.disabled = true;
    try {
        await retireFeatureProposal(proposalId);
        state.page = 1;
        if (typeof window.showElegantPopup === 'function') {
            window.showElegantPopup('✓', tr('home.feature_poll_delete_success', 'Idée supprimée.'), '✓');
        }
        await refresh();
    } catch (err) {
        console.error('[FeaturePoll] delete:', err);
        alert(tr('home.feature_poll_delete_error', 'Impossible de supprimer cette idée.'));
        btn.disabled = false;
    }
}

async function onVoteClick(ev) {
    const btn = ev.currentTarget;
    const optionId = btn.getAttribute('data-option-id');
    const direction = btn.getAttribute('data-direction');
    if (!optionId || !direction) return;

    if (!state.isLoggedIn) {
        if (typeof window.showElegantPopup === 'function') {
            window.showElegantPopup(tr('home.feature_poll_login', 'Connectez-vous pour voter.'), tr('home.feature_poll_login', 'Connectez-vous pour voter.'), '🔒');
        }
        return;
    }

    btn.disabled = true;
    try {
        const r = await applyVote(optionId, direction);
        if (r.changed) {
            const ids = state.proposals.map(function (p) { return p.id; });
            state.scores = await fetchScores(ids);
            state.userVotes = await fetchUserVotes(getCurrentUser().email);
            renderAll();
        }
    } catch (err) {
        console.error('[FeaturePoll]', err);
    } finally {
        btn.disabled = false;
    }
}

function bindToolbar() {
    const search = document.getElementById('featurePollSearch');
    const themeFilter = document.getElementById('featurePollThemeFilter');
    const addToggle = document.getElementById('featurePollAddToggle');
    const addForm = document.getElementById('featurePollAddForm');
    const addCancel = document.getElementById('featurePollAddCancel');

    if (search) {
        search.addEventListener('input', function () {
            state.search = search.value;
            state.page = 1;
            renderAll();
        });
    }
    if (themeFilter) {
        themeFilter.addEventListener('change', function () {
            state.themeFilter = themeFilter.value;
            state.page = 1;
            renderAll();
        });
    }
    if (addToggle && addForm) {
        addToggle.addEventListener('click', function () {
            if (!state.isLoggedIn) {
                if (typeof window.showElegantPopup === 'function') {
                    window.showElegantPopup(
                        tr('home.feature_poll_add_login', 'Connectez-vous pour proposer une idée.'),
                        tr('home.feature_poll_add_login', 'Connectez-vous pour proposer une idée.'),
                        '🔒'
                    );
                }
                return;
            }
            addForm.hidden = !addForm.hidden;
        });
    }
    if (addCancel && addForm) {
        addCancel.addEventListener('click', function () {
            addForm.hidden = true;
        });
    }
    if (addForm) {
        addForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!state.isLoggedIn) return;
            const title = document.getElementById('featurePollAddTitle')?.value;
            const description = document.getElementById('featurePollAddDesc')?.value;
            const theme = document.getElementById('featurePollAddTheme')?.value;
            try {
                await addFeatureProposal({ title: title, description: description, theme: theme });
                addForm.reset();
                addForm.hidden = true;
                state.page = 1;
                if (typeof window.showElegantPopup === 'function') {
                    window.showElegantPopup('✓', tr('home.feature_poll_add_success', 'Votre idée a été publiée !'), '✓');
                }
                await refresh();
            } catch (err) {
                console.error('[FeaturePoll] add:', err);
            }
        });
    }
}

function init() {
    if (!document.getElementById('featurePollSection')) return;
    populateThemeSelects();
    bindToolbar();
    refresh();
    document.addEventListener('languageChanged', function () {
        populateThemeSelects();
        refresh();
    });
    window.addEventListener('storage', function (e) {
        if (e.key === 'user' || e.key === LOCAL_VOTES_KEY) refresh();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

/**
 * Supprime une idée du sondage pour tous les utilisateurs (admin).
 * — Ajoute l'id à feature_poll/retired
 * — Retire les scores agrégés
 * — Supprime le document proposition si possible
 */
export async function retireFeatureProposal(proposalId) {
    const id = String(proposalId || '').trim();
    if (!id) throw new Error('missing_id');

    const retiredRef = doc(db, 'feature_poll', RETIRED_DOC_ID);
    const countsRef = doc(db, 'feature_poll', COUNTS_DOC_ID);
    const proposalRef = doc(db, PROPOSALS_COL, id);

    await runTransaction(db, async function (transaction) {
        const retiredSnap = await transaction.get(retiredRef);
        const ids = retiredSnap.exists() ? (retiredSnap.data().ids || []).slice() : [];
        if (ids.indexOf(id) === -1) ids.push(id);
        transaction.set(retiredRef, { ids: ids, updated_at: serverTimestamp() }, { merge: true });

        const countsSnap = await transaction.get(countsRef);
        if (countsSnap.exists()) {
            const scores = Object.assign({}, countsSnap.data().scores || countsSnap.data().votes || {});
            delete scores[id];
            transaction.set(countsRef, { scores: scores, updated_at: serverTimestamp() }, { merge: true });
        }
    });

    try {
        await deleteDoc(proposalRef);
    } catch (e) {
        console.warn('[FeaturePoll] retireFeatureProposal deleteDoc:', e);
    }

    if (retiredIdsCache.indexOf(id) === -1) retiredIdsCache.push(id);
}

/** Liste complète pour l'admin (y compris idées déjà retirées côté affichage public). */
export async function listFeaturePollProposalsForAdmin() {
    await loadRetiredProposalIds();
    await seedDefaultProposalsIfEmpty();
    let snap;
    try {
        snap = await getDocs(query(collection(db, PROPOSALS_COL), orderBy('created_at', 'desc')));
    } catch (e) {
        snap = await getDocs(collection(db, PROPOSALS_COL));
    }
    let proposals = snap.docs.map(mapProposalDoc);
    if (!proposals.length) {
        proposals = fallbackProposals();
    }
    const ids = proposals.map(function (p) { return p.id; });
    const scores = await fetchScores(ids);
    return proposals.map(function (p) {
        const s = scores[p.id] || { up: 0, down: 0 };
        const net = (Number(s.up) || 0) - (Number(s.down) || 0);
        return Object.assign({}, p, {
            title: p.title || proposalTitle(p),
            description: p.description || proposalDesc(p),
            scores: s,
            netScore: net,
            isRetired: retiredIdsCache.indexOf(p.id) !== -1
        });
    });
}

window.retireFeatureProposal = retireFeatureProposal;
window.listFeaturePollProposalsForAdmin = listFeaturePollProposalsForAdmin;
