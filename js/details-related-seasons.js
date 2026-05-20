/**
 * Section « Autres saisons / volumes » sur les pages détail anime & manga.
 * Peu d'appels API pour éviter les timeouts Jikan (504).
 */
(function (global) {
    'use strict';

    const JIKAN_BASE = 'https://api.jikan.moe/v4';
    const COLLECT_RELATION_TYPES = new Set([
        'sequel', 'prequel', 'parent story', 'side story', 'spin-off', 'spin off',
        'summary', 'full story', 'adaptation', 'alternative version', 'other'
    ]);
    const RELATED_LOAD_DELAY_MS = 0;
    const MAX_LAZY_IMAGES = 16;
    const STRICT_SERIES_FILTER_TYPES = new Set(['side story', 'spin-off', 'spin off', 'alternative']);

    const FRANCHISE_PART_ALIASES = [
        { pattern: /\bphantom blood\b|phantom\s*blood|jonathan joestar|kimyou na bouken(?!\s*:)/i, part: 1 },
        { pattern: /\bbattle tendency\b|battle\s*tendency|joseph joestar/i, part: 2 },
        { pattern: /stardust crusaders/i, part: 3 },
        { pattern: /diamond is unbreakable|diamond.*unbreakable/i, part: 4 },
        { pattern: /\bvento aureo\b|\bgolden wind\b/i, part: 5 },
        { pattern: /stone ocean/i, part: 6 },
        { pattern: /steel ball run/i, part: 7 },
        { pattern: /jojolion/i, part: 8 }
    ];
    const CACHE_TTL_MS = 5 * 60 * 1000;
    const SERIES_REL_CACHE_TTL_MS = 30 * 60 * 1000;
    let activeCarouselCleanup = null;

    function isMangaOnlyMode() {
        return !!(global.MW_API_CONFIG && global.MW_API_CONFIG.isMangaOnly());
    }

    function getApiMediaType(contentType) {
        if (global.MW_API_CONFIG && typeof global.MW_API_CONFIG.getApiMediaType === 'function') {
            return global.MW_API_CONFIG.getApiMediaType(contentType);
        }
        const ct = (contentType || 'anime').toLowerCase();
        return ct === 'manga' ? 'manga' : 'anime';
    }

    function enqueue(fn) {
        if (global.MW_API_CONFIG && typeof global.MW_API_CONFIG.enqueueJikan === 'function') {
            return global.MW_API_CONFIG.enqueueJikan(fn);
        }
        return fn();
    }

    async function fetchWithRetry(url) {
        if (global.MW_API_CONFIG && typeof global.MW_API_CONFIG.fetchWithRetry === 'function') {
            return global.MW_API_CONFIG.fetchWithRetry(url, { headers: { Accept: 'application/json' } });
        }
        return fetch(url, { headers: { Accept: 'application/json' } });
    }

    function delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function getCacheKey(kind, mediaType, id) {
        return `mw_${kind}_${mediaType}_${id}`;
    }

    function readCache(key) {
        try {
            const raw = sessionStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || Date.now() - parsed.ts > CACHE_TTL_MS) {
                sessionStorage.removeItem(key);
                return null;
            }
            return parsed.data;
        } catch (e) {
            return null;
        }
    }

    function writeCache(key, data) {
        try {
            sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
        } catch (e) {
            /* quota */
        }
    }

    function extractBaseTitle(title, contentType) {
        if (!title || typeof title !== 'string') return '';
        const ct = (contentType || 'anime').toLowerCase();
        if (ct !== 'anime' && ct !== 'manga' && ct !== 'film') return title.trim();
        let base = title.trim()
            .replace(/\s+[Ss]eason\s+\d+.*$/gi, '')
            .replace(/\s+[Ss]aison\s+\d+.*$/gi, '')
            .replace(/\s+[Pp]art\s+\d+.*$/gi, '')
            .replace(/\s+[Pp]artie\s+\d+.*$/gi, '')
            .replace(/\s+[Ss]\d+$/g, '')
            .replace(/\s+[Ss]\s+\d+$/g, '')
            .replace(/\s*\d+[nrst][dht]\s*[Ss]eason/gi, '')
            .replace(/\s*\d+[èe]me\s*[Ss]aison/gi, '')
            .replace(/:\s+[Ss]eason\s+\d+.*$/gi, '')
            .replace(/:\s+[Ss]aison\s+\d+.*$/gi, '')
            .replace(/:\s+[Pp]art\s+\d+.*$/gi, '')
            .replace(/:\s+[Pp]artie\s+\d+.*$/gi, '')
            .replace(/\s+[Tt]he\s+[Ff]inal\s+[Ss]eason/gi, '')
            .replace(/\s+[Ff]inal\s+[Ss]eason/gi, '')
            .replace(/\s+[Vv]ol\.?\s+\d+.*$/gi, '')
            .replace(/\s+[Vv]olume\s+\d+.*$/gi, '')
            .replace(/\s+[Tt]ome\s+\d+.*$/gi, '')
            .replace(/:\s+[Rr]e\b.*$/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/:\s*$/, '')
            .trim();
        return base || title.trim();
    }

    function normalizeTitle(s) {
        return String(s || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function detectFranchiseKey(title) {
        const t = normalizeTitle(title);
        if (/jojo|bizarre adventure|steel ball run|stoned ocean|stardust|phantom blood|battle tendency|diamond is unbreakable|golden wind|jojolion/i.test(t)) {
            return 'jojo';
        }
        if (/attack on titan|shingeki no kyojin/i.test(t)) return 'aot';
        if (/naruto|boruto/i.test(t)) return 'naruto';
        if (/one piece/i.test(t)) return 'onepiece';
        if (/dragon ball/i.test(t)) return 'dragonball';
        if (/monogatari/i.test(t)) return 'monogatari';
        if (/fate\/|fate stay|fate zero|fate\/zero/i.test(t)) return 'fate';
        return null;
    }

    function areSameSeries(titleA, titleB, contentType) {
        const baseA = normalizeTitle(extractBaseTitle(titleA, contentType));
        const baseB = normalizeTitle(extractBaseTitle(titleB, contentType));
        if (!baseA || !baseB) return false;
        if (baseA === baseB) return true;
        const franchiseA = detectFranchiseKey(titleA);
        const franchiseB = detectFranchiseKey(titleB);
        if (franchiseA && franchiseA === franchiseB) return true;
        const minLen = 8;
        if (baseA.length >= minLen && baseB.length >= minLen &&
            (baseA.startsWith(baseB) || baseB.startsWith(baseA))) {
            return true;
        }
        const wordsA = baseA.split(' ').filter((w) => w.length > 3);
        const wordsB = baseB.split(' ').filter((w) => w.length > 3);
        if (wordsA.length >= 2 && wordsB.length >= 2) {
            const shared = wordsA.filter((w) => wordsB.includes(w));
            if (shared.length >= 2) return true;
        }
        return false;
    }

    function shouldIncludeRelatedEntry(relType, entryTitle, referenceTitle, contentType) {
        const rel = normalizeRelationType(relType);
        if (rel === 'other' || rel === 'adaptation' || rel === 'summary' || rel === 'full story') {
            return areSameSeries(entryTitle, referenceTitle, contentType)
                || !!detectFranchiseKey(entryTitle) && detectFranchiseKey(entryTitle) === detectFranchiseKey(referenceTitle);
        }
        if (!STRICT_SERIES_FILTER_TYPES.has(rel)) return true;
        return areSameSeries(entryTitle, referenceTitle, contentType);
    }

    const ROMAN_NUMERALS = {
        i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12
    };

    function romanToInt(roman) {
        return ROMAN_NUMERALS[String(roman || '').toLowerCase()] || null;
    }

    function isNonMainSeasonEntry(title, item) {
        const t = String(title || '').toLowerCase();
        if (/break\s*time|picture\s*drama|mini\s*anime|chibi|short\s*anime|petit\s*anime|soseiji|ign\s*x\s*hop|idol\s*days/i.test(t)) {
            return true;
        }
        if (/^re:zero.*break\s*time|break\s*time.*re:zero/i.test(t)) return true;
        if (/special\b|recap|summary|memory\s*snow|highlight/i.test(t) && /break|mini|short|chibi|drama/i.test(t)) {
            return true;
        }
        const rel = normalizeRelationType(item?.relationType || '');
        if (STRICT_SERIES_FILTER_TYPES.has(rel)) return true;
        const eps = item?.episodes;
        if (eps != null && eps > 0 && eps <= 26 &&
            /(?:\d+)(?:st|nd|rd|th)\s+season|season\s*\d/i.test(t) &&
            /break|special|extra|picture|drama|mini|chibi|short|time|pet|side/i.test(t)) {
            return true;
        }
        return false;
    }

    function extractDisambiguatorSuffix(title, contentType, item) {
        const t = title || '';
        if (/break\s*time/i.test(t)) return 'Break Time';
        if (/picture\s*drama/i.test(t)) return 'Picture Drama';
        if (/mini\s*anime|chibi/i.test(t)) return 'Mini anime';
        const colon = t.match(/:\s*([^:]+)$/);
        if (colon) {
            let sub = colon[1].trim()
                .replace(/(\d+)(?:st|nd|rd|th)\s+season/gi, '')
                .replace(/(?:season|saison)\s*\d+/gi, '')
                .trim();
            if (sub.length >= 3 && sub.length <= 42) return truncateSubtitle(sub, 30);
        }
        const partM = t.match(/\bpart\s*(\d+)\b/i);
        if (partM && /season|saison|\d(?:st|nd|rd|th)\s+season/i.test(t)) {
            return `Partie ${partM[1]}`;
        }
        const courM = t.match(/\bcour\s*(\d+)\b/i);
        if (courM) return `Cour ${courM[1]}`;
        if (isNonMainSeasonEntry(t, item)) return 'Extra';
        return '';
    }

    function classifyNonMainSeasonContent(title, item) {
        if (!isNonMainSeasonEntry(title, item)) return null;
        const t = title || '';
        let seasonNum = null;
        let m = t.match(/(\d+)(?:st|nd|rd|th)\s+season/i);
        if (m) seasonNum = m[1];
        else {
            m = t.match(/(?:season|saison)\s*(\d+)/i);
            if (m) seasonNum = m[1];
        }
        const suffix = extractDisambiguatorSuffix(title, 'anime', item) || 'Extra';
        if (seasonNum) return `S${seasonNum} · ${suffix}`;
        return suffix;
    }

    function finalizeSeasonLabel(label, title, contentType, item, labelCounts) {
        if (!label || !labelCounts) return label;
        const suffix = extractDisambiguatorSuffix(title, contentType, item);
        const count = (labelCounts.get(label) || 0) + 1;
        labelCounts.set(label, count);
        if (count > 1 && suffix) return `${label} · ${suffix}`;
        if (isNonMainSeasonEntry(title, item) && suffix && !String(label).includes(suffix)) {
            return `${label} · ${suffix}`;
        }
        return label;
    }

    function extractSeasonPartNumber(title, contentType) {
        if (!title) return null;
        if (isNonMainSeasonEntry(title, null)) return null;
        const t = title.toLowerCase();
        for (const alias of FRANCHISE_PART_ALIASES) {
            if (alias.pattern.test(title)) return alias.part;
        }
        if (detectFranchiseKey(title) === 'jojo') {
            const base = (title || '').trim();
            if (/^jojo'?s bizarre adventure\s*(\(?(?:tv|2012|2015)\)?)?\s*$/i.test(base)) return 1;
            if (/:\s*the animation\s*$/i.test(base) && /jojo/i.test(base)) return 1;
        }
        let m = t.match(/(?:season|saison|cour)\s*(\d+)/i);
        if (m) return parseInt(m[1], 10);
        m = t.match(/(\d+)(?:st|nd|rd|th)\s+season/i);
        if (m) return parseInt(m[1], 10);
        m = t.match(/\bpart\s*(\d+)\b/i);
        if (m) return parseInt(m[1], 10);
        m = t.match(/\bpartie\s*(\d+)\b/i);
        if (m) return parseInt(m[1], 10);
        m = t.match(/(?:vol\.?|volume|tome)\s*(\d+)/i);
        if (m) return parseInt(m[1], 10);
        if (/\b:re\b/i.test(t) || /\bre\b$/i.test(t)) return 2;
        m = t.match(/(?:^|[\s:(-])([ivx]{1,4})(?:[\s):.\-]|$)/i);
        if (m) {
            const v = romanToInt(m[1]);
            if (v) return v;
        }
        m = t.match(/\bs(\d{1,2})\b/);
        if (m) return parseInt(m[1], 10);
        if (/\bsecond\s+season\b|\b2nd\s+season\b|\bdeuxi[eè]me\s+saison\b/i.test(t)) return 2;
        if (/\bthird\s+season\b|\b3rd\s+season\b|\btroisi[eè]me\s+saison\b/i.test(t)) return 3;
        if (/\bfourth\s+season\b|\b4th\s+season\b|\bquatri[eè]me\s+saison\b/i.test(t)) return 4;
        if (/\bfifth\s+season\b|\b5th\s+season\b|\bcinqui[eè]me\s+saison\b/i.test(t)) return 5;
        if (/\bsixth\s+season\b|\b6th\s+season\b/i.test(t)) return 6;
        if (/\bseventh\s+season\b|\b7th\s+season\b/i.test(t)) return 7;
        if (/\bfinal\s+season\b/i.test(t)) return 99;
        return null;
    }

    function usesPartLabel(title, contentType) {
        const ct = (contentType || '').toLowerCase();
        if (ct === 'manga' || ct === 'manhwa' || ct === 'manhua') return true;
        if (/\bpart\s*\d|\bpartie\s*\d/i.test(title || '')) return true;
        const fr = detectFranchiseKey(title);
        return fr === 'jojo' || fr === 'monogatari' || fr === 'fate';
    }

    function getSeasonSortKey(title, item) {
        if (!title) return 100;
        const num = item?._inferredSeason ?? extractSeasonPartNumber(title, 'anime');
        if (num != null) return num === 99 ? 98 : num;
        const extra = inferExtraFromTitle(title);
        if (extra) return extra.tier;
        const rel = normalizeRelationType(item?.relationType || '');
        if (STRICT_SERIES_FILTER_TYPES.has(rel)) return 60;
        return 100;
    }

    function extractExplicitLabelFromTitle(title, contentType, item) {
        if (isNonMainSeasonEntry(title, item)) return null;

        const t = title || '';
        let m = t.match(/(\d+)(?:st|nd|rd|th)\s+season\s+part\s*(\d+)/i);
        if (m) return `Saison ${m[1]} · Partie ${m[2]}`;
        m = t.match(/(?:season|saison)\s*(\d+)\s*[-–:]\s*part\s*(\d+)/i);
        if (m) return `Saison ${m[1]} · Partie ${m[2]}`;

        m = t.match(/(\d+)(?:st|nd|rd|th)\s+season/i);
        if (m) {
            const partM = t.match(/\bpart\s*(\d+)\b/i);
            if (partM) return `Saison ${m[1]} · Partie ${partM[1]}`;
            return `Saison ${m[1]}`;
        }

        m = t.match(/(?:season|saison)\s*(\d+)/i);
        if (m) {
            const partM = t.match(/\bpart(?:ie)?\s*(\d+)\b/i);
            if (partM) return `Saison ${m[1]} · Partie ${partM[1]}`;
            return `Saison ${m[1]}`;
        }

        m = t.match(/\bcour\s*(\d+)/i);
        if (m) return `Saison ${m[1]}`;
        if (/\bfinal\s+season\b/i.test(t)) return 'Saison finale';

        const franchisePart = extractSeasonPartNumber(title, contentType);
        const subPart = t.match(/\bpart\s*(\d+)\b/i);
        if (franchisePart != null && subPart && parseInt(subPart[1], 10) !== franchisePart) {
            return usesPartLabel(t, contentType)
                ? `Partie ${franchisePart} · ${subPart[1]}`
                : `Saison ${franchisePart} · Partie ${subPart[1]}`;
        }

        m = t.match(/(?:part|partie)\s*(\d+)/i);
        if (m) {
            return usesPartLabel(t, contentType) ? `Partie ${m[1]}` : `Saison ${m[1]}`;
        }
        if (franchisePart != null) {
            return usesPartLabel(t, contentType) ? `Partie ${franchisePart}` : `Saison ${franchisePart}`;
        }
        return null;
    }

    function dedupeRelatedItems(items) {
        const map = new Map();
        for (const item of items || []) {
            if (!item?.mal_id) continue;
            const id = String(item.mal_id);
            const prev = map.get(id);
            if (!prev) {
                map.set(id, { ...item });
                continue;
            }
            map.set(id, {
                ...prev,
                ...item,
                title: (item.title || '').length > (prev.title || '').length ? item.title : prev.title,
                image: item.image || prev.image,
                year: item.year || prev.year,
                relationType: item.relationType || prev.relationType
            });
        }
        return Array.from(map.values());
    }

    function assignInferredSeasonNumbers(items, contentType, referenceTitle, currentId) {
        const ct = (contentType || '').toLowerCase();
        if (ct !== 'anime' && ct !== 'film') return;
        if (detectFranchiseKey(referenceTitle)) return;
        const mainEntries = items.filter((item) => {
            if (currentId && String(item.mal_id) === String(currentId)) return false;
            if (isNonMainSeasonEntry(item.title, item)) return false;
            if (extractSeasonPartNumber(item.title, contentType) != null) return false;
            if (inferExtraFromTitle(item.title)) return false;
            const rel = normalizeRelationType(item.relationType || '');
            return !STRICT_SERIES_FILTER_TYPES.has(rel);
        });
        mainEntries.sort((a, b) => {
            const ya = parseInt(a.year, 10) || 9999;
            const yb = parseInt(b.year, 10) || 9999;
            if (ya !== yb) return ya - yb;
            return String(a.title || '').localeCompare(String(b.title || ''), 'fr');
        });
        mainEntries.forEach((item, index) => {
            item._inferredSeason = index + 1;
        });
    }

    function getSeasonLabel(title, contentType, item, labelCounts) {
        const nonMain = classifyNonMainSeasonContent(title, item);
        if (nonMain) return nonMain;

        let label = extractExplicitLabelFromTitle(title, contentType, item);

        if (!label) {
            const extra = inferExtraFromTitle(title);
            if (extra) {
                const t = title || '';
                const sm = t.match(/(\d+)(?:st|nd|rd|th)\s+season|(?:season|saison)\s*(\d+)/i);
                const sn = sm ? (sm[1] || sm[2]) : null;
                label = sn ? `S${sn} · ${extra.badge}` : extra.badge;
            }
        }

        if (!label) {
            const rel = normalizeRelationType(item?.relationType || '');
            if (rel === 'side story') label = 'Side story';
            else if (rel === 'spin-off' || rel === 'spin off') label = 'Spin-off';
            else if (rel === 'alternative' || rel === 'alternative version') label = 'Alternative';
            else if (rel === 'adaptation') label = 'Film / Adaptation';
            else if (rel === 'summary' || rel === 'full story') label = 'Récap / Film';
        }

        if (!label) {
            const ct = (contentType || '').toLowerCase();
            const isManga = ct === 'manga' || ct === 'manhwa' || ct === 'manhua';
            const num = item?._inferredSeason ?? extractSeasonPartNumber(title, contentType);
            if (num === 99) label = 'Saison finale';
            else if (num != null) {
                if (detectFranchiseKey(title) === 'jojo') {
                    label = `Partie ${num}`;
                } else {
                    label = usesPartLabel(title, contentType)
                        ? `Partie ${num}`
                        : (isManga ? `Tome ${num}` : `Saison ${num}`);
                }
            } else {
                label = truncateSubtitle(title, 34) || 'Extra';
            }
        }

        return finalizeSeasonLabel(label, title, contentType, item, labelCounts);
    }

    function normalizeRelationType(rel) {
        return String(rel || '').toLowerCase().replace(/_/g, '-').replace(/\s+/g, ' ').trim();
    }

    function inferExtraFromTitle(title) {
        const t = String(title || '').toLowerCase();
        if (/break\s*time/i.test(t)) return { tier: 56, badge: 'Break Time', badgeClass: 'is-extra' };
        if (/picture\s*drama/i.test(t)) return { tier: 55, badge: 'Picture Drama', badgeClass: 'is-extra' };
        if (/\bfiller\b/.test(t)) return { tier: 55, badge: 'Filler', badgeClass: 'is-extra' };
        if (/spin.?off|gaiden/.test(t)) return { tier: 52, badge: 'Spin-off', badgeClass: 'is-spinoff' };
        if (/\bova\b|\bona\b/.test(t)) return { tier: 50, badge: 'OVA', badgeClass: 'is-extra' };
        if (/\bspecial\b|\bpilot\b/.test(t)) return { tier: 49, badge: 'Spécial', badgeClass: 'is-extra' };
        if (/one.?shot|light novel|\bln\b|novel\b/.test(t)) return { tier: 48, badge: 'One-shot', badgeClass: 'is-extra' };
        if (/memory snow|jack\b|recap|anthology|artbook|guide\b|epilogue|parody/.test(t)) {
            return { tier: 47, badge: 'Extra', badgeClass: 'is-extra' };
        }
        if (/movie|film\b/.test(t)) return { tier: 46, badge: 'Film', badgeClass: 'is-extra' };
        return null;
    }

    function getRelationSortTier(item) {
        const fromTitle = inferExtraFromTitle(item.title);
        if (fromTitle) return fromTitle.tier;

        const rel = normalizeRelationType(item.relationType);
        const relTiers = {
            'parent story': 0,
            parent: 0,
            prequel: 8,
            sequel: 12,
            'side story': 42,
            'spin-off': 52,
            'spin off': 52,
            alternative: 54
        };
        if (relTiers[rel] !== undefined) return relTiers[rel];
        return 15;
    }

    function getMainTypeBadgeLabel(contentType) {
        const ct = (contentType || 'anime').toLowerCase();
        const labels = {
            manga: 'Manga',
            anime: 'Anime',
            manhwa: 'Manhwa',
            manhua: 'Manhua',
            roman: 'Roman',
            doujin: 'Doujin',
            film: 'Film'
        };
        return labels[ct] || 'Série';
    }

    function getRelationBadge(item, contentType) {
        const fromTitle = inferExtraFromTitle(item.title);
        if (fromTitle) return { label: fromTitle.badge, className: fromTitle.badgeClass };

        const rel = normalizeRelationType(item.relationType);
        if (rel === 'side story') return { label: 'Side story', className: 'is-side' };
        if (rel === 'spin-off' || rel === 'spin off') {
            return { label: 'Spin-off', className: 'is-spinoff' };
        }
        if (rel === 'alternative') return { label: 'Alternative', className: 'is-extra' };

        if (rel === 'parent story' || rel === 'parent') {
            const ct = (contentType || 'anime').toLowerCase();
            if (ct === 'anime' || ct === 'film') {
                return { label: 'Anime', className: 'is-main' };
            }
            return { label: 'Série', className: 'is-main' };
        }

        return { label: getMainTypeBadgeLabel(contentType), className: 'is-main' };
    }

    function getSectionHeading(contentType) {
        const ct = (contentType || 'anime').toLowerCase();
        const map = {
            manga: { key: 'details.other_volumes', text: 'Autres volumes' },
            manhwa: { key: 'details.other_volumes_manhwa', text: 'Autres volumes' },
            manhua: { key: 'details.other_volumes_manhua', text: 'Autres volumes' },
            roman: { key: 'details.other_volumes_novel', text: 'Autres tomes' },
            doujin: { key: 'details.other_volumes_doujin', text: 'Autres doujins' },
            film: { key: 'details.other_films', text: 'Autres films' },
            anime: { key: 'details.other_seasons', text: 'Autres saisons' }
        };
        return map[ct] || map.anime;
    }

    function formatDateFr(value) {
        if (!value) return '';
        try {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return '';
            return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            return '';
        }
    }

    function getSeriesCacheKey(referenceTitle, mediaType) {
        const seriesCt = mediaType === 'manga' ? 'manga' : 'anime';
        const franchise = detectFranchiseKey(referenceTitle);
        const slug = franchise || normalizeTitle(extractBaseTitle(referenceTitle, seriesCt)).slice(0, 72);
        return `mw_series_rel_${mediaType}_${slug || 'serie'}`;
    }

    function loadSeriesRelationsCache(key) {
        try {
            const raw = sessionStorage.getItem(key);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!parsed?.items || Date.now() - parsed.ts > SERIES_REL_CACHE_TTL_MS) {
                sessionStorage.removeItem(key);
                return [];
            }
            return parsed.items;
        } catch (e) {
            return [];
        }
    }

    function saveSeriesRelationsCache(key, items) {
        try {
            const merged = new Map();
            loadSeriesRelationsCache(key).forEach((item) => {
                if (item?.mal_id) merged.set(String(item.mal_id), item);
            });
            (items || []).forEach((item) => {
                if (!item?.mal_id) return;
                const id = String(item.mal_id);
                merged.set(id, { ...merged.get(id), ...item });
            });
            sessionStorage.setItem(key, JSON.stringify({
                ts: Date.now(),
                items: Array.from(merged.values())
            }));
        } catch (e) { /* quota */ }
    }

    function mergeSeriesCacheIntoMap(map, key) {
        loadSeriesRelationsCache(key).forEach((item) => {
            if (!item?.mal_id) return;
            const id = String(item.mal_id);
            const prev = map.get(id);
            map.set(id, prev ? { ...prev, ...item, image: prev.image || item.image, title: prev.title || item.title } : item);
        });
    }

    function hasCount(value) {
        return value != null && value !== '' && !Number.isNaN(Number(value));
    }

    function buildPublicationLines(item, contentType) {
        const lines = [];
        const ct = (contentType || '').toLowerCase();
        const isManga = ct === 'manga' || ct === 'manhwa' || ct === 'manhua';
        const start = formatDateFr(item.airedFrom);
        const end = formatDateFr(item.airedTo);

        if (item.year) lines.push({ label: 'Année', value: String(item.year) });
        if (start) lines.push({ label: isManga ? 'Début parution' : 'Début diffusion', value: start });
        if (end) lines.push({ label: isManga ? 'Fin parution' : 'Fin diffusion', value: end });
        if (hasCount(item.volumes)) lines.push({ label: 'Volumes', value: String(item.volumes) });
        if (hasCount(item.chapters)) lines.push({ label: 'Chapitres', value: String(item.chapters) });
        if (hasCount(item.episodes)) lines.push({ label: 'Épisodes', value: String(item.episodes) });
        if (item.status) lines.push({ label: 'Statut', value: String(item.status) });
        if (item.score != null && item.score !== '') {
            lines.push({ label: 'Note', value: `${Number(item.score).toFixed(1)}/10` });
        }
        if (lines.length === 0 && item.title) {
            lines.push({ label: 'Série', value: truncateSubtitle(item.title, 48) });
        }
        return lines;
    }

    /** Garde volumes / chapitres / épisodes visibles même avec année + dates (max 4 lignes). */
    function pickPublicationLines(lines, contentType, maxLines) {
        const limit = maxLines || 4;
        if (!lines?.length) return [];
        const ct = (contentType || '').toLowerCase();
        const isManga = ct === 'manga' || ct === 'manhwa' || ct === 'manhua';
        const priority = isManga
            ? ['Volumes', 'Chapitres', 'Année', 'Début parution', 'Fin parution', 'Épisodes', 'Statut', 'Note', 'Série']
            : ['Épisodes', 'Volumes', 'Chapitres', 'Année', 'Début diffusion', 'Fin diffusion', 'Statut', 'Note', 'Série'];

        const byLabel = new Map(lines.map((line) => [line.label, line]));
        const picked = [];
        for (const label of priority) {
            if (byLabel.has(label) && picked.length < limit) {
                picked.push(byLabel.get(label));
            }
        }
        for (const line of lines) {
            if (picked.length >= limit) break;
            if (!picked.includes(line)) picked.push(line);
        }
        return picked;
    }

    function buildMetaLine(item, contentType) {
        const parts = [];
        if (item.year) parts.push(String(item.year));
        const ct = (contentType || '').toLowerCase();
        const isManga = ct === 'manga' || ct === 'manhwa' || ct === 'manhua';
        if (isManga) {
            if (hasCount(item.volumes)) parts.push(`${item.volumes} vol.`);
            if (hasCount(item.chapters)) parts.push(`${item.chapters} ch.`);
        } else {
            if (hasCount(item.episodes)) parts.push(`${item.episodes} ép.`);
            if (hasCount(item.volumes)) parts.push(`${item.volumes} vol.`);
            if (hasCount(item.chapters)) parts.push(`${item.chapters} ch.`);
        }
        const start = formatDateFr(item.airedFrom);
        if (start && parts.length < 4) parts.push(start);
        return parts.join(' · ');
    }

    function mergeBriefStatsIntoItem(item, brief) {
        if (!brief) return false;
        let changed = false;
        const fields = ['volumes', 'chapters', 'episodes', 'year', 'airedFrom', 'airedTo', 'status', 'score'];
        for (const field of fields) {
            const next = brief[field];
            if ((item[field] == null || item[field] === '') && next != null && next !== '') {
                item[field] = next;
                changed = true;
            }
        }
        return changed;
    }

    function truncateSubtitle(title, max) {
        const t = String(title || '').trim();
        if (t.length <= max) return t;
        return `${t.slice(0, max - 1)}…`;
    }

    function getCanonicalSortIndex(item, contentType) {
        if (isNonMainSeasonEntry(item.title, item)) {
            return 900 + getRelationSortTier(item);
        }
        const num = extractSeasonPartNumber(item.title, contentType);
        if (num != null) return num === 99 ? 98 : num;

        const t = item.title || '';
        const seasonM = t.match(/(\d+)(?:st|nd|rd|th)\s+season|(?:season|saison)\s*(\d+)/i);
        const partM = t.match(/\bpart(?:ie)?\s*(\d+)/i);
        if (seasonM && partM) {
            const s = parseInt(seasonM[1] || seasonM[2], 10);
            const p = parseInt(partM[1], 10);
            return s * 10 + p * 0.1;
        }

        if (item._inferredSeason != null) return item._inferredSeason;
        return 400 + getRelationSortTier(item);
    }

    function sortRelatedItems(items, contentType) {
        const ct = contentType || 'anime';
        return items.slice().sort((a, b) => {
            const idxA = getCanonicalSortIndex(a, ct);
            const idxB = getCanonicalSortIndex(b, ct);
            if (idxA !== idxB) return idxA - idxB;

            const yearA = parseInt(a.year, 10) || 0;
            const yearB = parseInt(b.year, 10) || 0;
            if (yearA > 0 && yearB > 0 && yearA !== yearB) return yearA - yearB;

            const dateA = a.airedFrom ? new Date(a.airedFrom).getTime() : 0;
            const dateB = b.airedFrom ? new Date(b.airedFrom).getTime() : 0;
            if (dateA && dateB && dateA !== dateB) return dateA - dateB;

            return String(a.title || '').localeCompare(String(b.title || ''), 'fr');
        });
    }

    async function fetchRelations(mediaType, id) {
        const cacheKey = getCacheKey('rel', mediaType, id);
        const cached = readCache(cacheKey);
        if (cached) return cached;

        const proxyUrl = new URL('/.netlify/functions/jikan-proxy', window.location.origin);
        proxyUrl.searchParams.set('action', 'relations');
        proxyUrl.searchParams.set('mediaType', mediaType);
        proxyUrl.searchParams.set('id', String(id));

        const load = async () => {
            let response = await fetchWithRetry(proxyUrl.toString());
            if (!response.ok) {
                response = await fetchWithRetry(`${JIKAN_BASE}/${mediaType}/${id}/relations`);
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        };

        const data = await enqueue(load);
        writeCache(cacheKey, data);
        return data;
    }

    /** Une seule requête /relations — pas de parcours récursif (évite la saturation API). */
    function collectRelatedFromRelationsPayload(relationsPayload, mediaType, referenceTitle) {
        const collected = new Map();
        const seriesCt = mediaType === 'manga' ? 'manga' : 'anime';
        const groups = relationsPayload?.data || [];

        for (const group of groups) {
            const relType = normalizeRelationType(group.relation);
            if (!COLLECT_RELATION_TYPES.has(relType)) continue;

            for (const entry of group.entry || []) {
                if (String(entry.type || '').toLowerCase() !== mediaType) continue;
                const malId = String(entry.mal_id);
                if (!malId || collected.has(malId)) continue;
                if (!shouldIncludeRelatedEntry(relType, entry.name, referenceTitle, seriesCt)) continue;

                collected.set(malId, {
                    mal_id: entry.mal_id,
                    title: entry.name,
                    image: '',
                    year: '',
                    relationType: relType
                });
            }
        }

        return collected;
    }

    function buildDetailUrl(malId, contentType) {
        const params = new URLSearchParams({ id: String(malId) });
        const ct = (contentType || 'anime').toLowerCase();
        if (ct === 'manga' || ct === 'manhwa' || ct === 'manhua' || ct === 'roman' || ct === 'doujin') {
            params.set('type', 'manga');
        } else {
            params.set('type', 'anime');
            params.set('season', '1');
        }
        return `anime-details.html?${params.toString()}`;
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function initRelatedSeasonsCarousel(section) {
        if (!section) return null;
        const track = section.querySelector('.related-seasons-track');
        const prevBtn = section.querySelector('.related-seasons-nav--prev');
        const nextBtn = section.querySelector('.related-seasons-nav--next');
        if (!track || !prevBtn || !nextBtn) return null;

        const getScrollStep = () => {
            const card = track.querySelector('.related-season-card');
            const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 14;
            const cardWidth = card ? card.offsetWidth : 200;
            return (cardWidth + gap) * 2;
        };

        const updateNav = () => {
            const cardCount = track.querySelectorAll('.related-season-card').length;
            const maxScroll = track.scrollWidth - track.clientWidth;
            const hasOverflow = maxScroll > 8 || cardCount > 2;
            section.classList.toggle('has-overflow', hasOverflow);
            section.classList.toggle('has-many-cards', cardCount > 2);
            prevBtn.disabled = track.scrollLeft <= 8;
            nextBtn.disabled = track.scrollLeft >= maxScroll - 8;
        };

        let scrollRaf = 0;
        const onScroll = () => {
            if (scrollRaf) return;
            scrollRaf = requestAnimationFrame(() => {
                scrollRaf = 0;
                updateNav();
            });
        };

        const onPrev = () => track.scrollBy({ left: -getScrollStep(), behavior: 'smooth' });
        const onNext = () => track.scrollBy({ left: getScrollStep(), behavior: 'smooth' });

        prevBtn.addEventListener('click', onPrev);
        nextBtn.addEventListener('click', onNext);
        track.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', updateNav);
        requestAnimationFrame(updateNav);
        const layoutTimer = setTimeout(updateNav, 150);

        return () => {
            clearTimeout(layoutTimer);
            if (scrollRaf) cancelAnimationFrame(scrollRaf);
            prevBtn.removeEventListener('click', onPrev);
            nextBtn.removeEventListener('click', onNext);
            track.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', updateNav);
        };
    }

    function updateRelatedSectionCards(items, currentId, contentType, referenceTitle) {
        const section = document.getElementById('related-seasons-section');
        if (!section || section.classList.contains('is-loading')) return;
        const track = section.querySelector('.related-seasons-track');
        if (!track) return;

        const scrollLeft = track.scrollLeft;
        const { cardsHtml } = buildRelatedCardsHtml(items, currentId, contentType, referenceTitle);
        track.innerHTML = cardsHtml;

        if (activeCarouselCleanup) activeCarouselCleanup();
        activeCarouselCleanup = initRelatedSeasonsCarousel(section);
        attachRelatedCardClickHandlers(section, items, contentType, referenceTitle);

        track.scrollLeft = scrollLeft;
        requestAnimationFrame(() => {
            track.scrollLeft = scrollLeft;
        });

        if (window.localization) {
            window.localization.applyLanguage();
        }
    }

    function renderSection(items, currentId, contentType, referenceTitle) {
        const synopsisEl = document.querySelector('.synopsis-section');
        if (!synopsisEl) return null;

        destroyRelatedSeasonsSection();

        const heading = getSectionHeading(contentType);
        const { cardsHtml } = buildRelatedCardsHtml(items, currentId, contentType, referenceTitle);
        const section = document.createElement('section');
        section.id = 'related-seasons-section';
        section.className = 'related-seasons-section';
        section.removeAttribute('aria-busy');
        section.innerHTML = `
            <h2 class="related-seasons-title" data-i18n="${heading.key}">${heading.text}</h2>
            <div class="related-seasons-carousel">
                <button type="button" class="related-seasons-nav related-seasons-nav--prev" aria-label="Volumes précédents">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="related-seasons-track-wrap">
                    <div class="related-seasons-track" role="list">
                        ${cardsHtml}
                    </div>
                </div>
                <button type="button" class="related-seasons-nav related-seasons-nav--next" aria-label="Volumes suivants">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;

        synopsisEl.insertAdjacentElement('afterend', section);
        if (items.length > 2) section.classList.add('has-many-cards', 'has-overflow');
        activeCarouselCleanup = initRelatedSeasonsCarousel(section);
        attachRelatedCardClickHandlers(section, items, contentType, referenceTitle);

        if (window.localization) {
            window.localization.applyLanguage();
        }

        return section;
    }

    async function fetchDetailBrief(mediaType, id) {
        const cacheKey = getCacheKey('det', mediaType, id);
        const cached = readCache(cacheKey);
        if (cached) return cached;

        const proxyUrl = new URL('/.netlify/functions/jikan-proxy', window.location.origin);
        proxyUrl.searchParams.set('action', 'detail');
        proxyUrl.searchParams.set('mediaType', mediaType);
        proxyUrl.searchParams.set('id', String(id));

        const load = async () => {
            let response = await fetchWithRetry(proxyUrl.toString());
            if (!response.ok) {
                response = await fetchWithRetry(`${JIKAN_BASE}/${mediaType}/${id}`);
            }
            if (!response.ok) return null;
            const data = await response.json();
            const item = data?.data || data;
            if (!item) return null;
            const year = item.year ||
                item.aired?.prop?.from?.year ||
                item.published?.prop?.from?.year ||
                (item.aired?.from ? new Date(item.aired.from).getFullYear() : null);
            return {
                mal_id: item.mal_id || item.id,
                title: item.title || item.title_english || '',
                synopsis: item.synopsis || null,
                score: item.score != null ? item.score : null,
                genres: item.genres || [],
                type: item.type || null,
                status: item.status || null,
                image: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
                year: year || '',
                airedFrom: item.aired?.from || item.published?.from || null,
                airedTo: item.aired?.to || item.published?.to || null,
                episodes: item.episodes || null,
                chapters: item.chapters || null,
                volumes: item.volumes || null
            };
        };

        const brief = await enqueue(load);
        if (brief) writeCache(cacheKey, brief);
        return brief;
    }

    async function enrichRelatedItems(items, mediaType, currentId) {
        const need = items.filter((item) => String(item.mal_id) !== String(currentId));
        const batchSize = 3;
        for (let i = 0; i < need.length; i += batchSize) {
            await Promise.all(need.slice(i, i + batchSize).map(async (item) => {
                try {
                    const brief = await fetchDetailBrief(mediaType, item.mal_id);
                    if (!brief) return;
                    Object.assign(item, {
                        title: brief.title || item.title,
                        year: brief.year || item.year,
                        image: brief.image || '',
                        airedFrom: brief.airedFrom || item.airedFrom,
                        airedTo: brief.airedTo || item.airedTo,
                        status: brief.status || item.status,
                        episodes: brief.episodes ?? item.episodes,
                        chapters: brief.chapters ?? item.chapters,
                        volumes: brief.volumes ?? item.volumes,
                        score: brief.score ?? item.score,
                        synopsis: brief.synopsis || item.synopsis
                    });
                } catch (e) { /* ignore */ }
            }));
            if (i + batchSize < need.length) await delay(320);
        }
    }

    async function expandRelationsGraphBfs(relatedMap, mediaType, referenceTitle) {
        const visited = new Set();
        const maxNodes = 52;
        const maxHops = 6;

        for (let hop = 0; hop < maxHops && relatedMap.size < maxNodes; hop += 1) {
            const pending = Array.from(relatedMap.keys()).filter((id) => !visited.has(String(id)));
            if (!pending.length) break;

            const batch = pending.slice(0, hop === 0 ? 6 : 10);
            batch.forEach((id) => visited.add(String(id)));

            await Promise.all(batch.map(async (id) => {
                try {
                    const payload = await fetchRelations(mediaType, id);
                    const fromJikan = collectRelatedFromRelationsPayload(
                        payload, mediaType, referenceTitle
                    );
                    fromJikan.forEach((v, k) => relatedMap.set(k, v));
                } catch (e) {
                    console.warn('[details-related-seasons] expand relations:', id, e?.message || e);
                }
            }));

            if (hop > 0) await delay(180);
        }
    }

    async function lazyLoadImages(items, mediaType, onStatsUpdated) {
        const withoutImage = items.filter((item) => !item.image).slice(0, MAX_LAZY_IMAGES);
        let statsChanged = false;
        const loadOne = async (item) => {
            try {
                const brief = await fetchDetailBrief(mediaType, item.mal_id);
                if (!brief) return;
                if (mergeBriefStatsIntoItem(item, brief)) statsChanged = true;
                if (!brief.image) return;
                item.image = brief.image;
                const cardImg = document.querySelector(
                    `#related-seasons-section img[data-mal-id="${item.mal_id}"]`
                );
                const fallback = cardImg?.nextElementSibling;
                if (cardImg) {
                    cardImg.src = brief.image;
                    cardImg.classList.remove('is-hidden');
                    fallback?.classList.add('is-hidden');
                }
            } catch (err) {
                console.warn('[details-related-seasons] Image lazy:', item.mal_id, err);
            }
        };
        const batchSize = 3;
        for (let i = 0; i < withoutImage.length; i += batchSize) {
            await Promise.all(withoutImage.slice(i, i + batchSize).map(loadOne));
            if (i + batchSize < withoutImage.length) await delay(120);
        }
        if (statsChanged && typeof onStatsUpdated === 'function') {
            onStatsUpdated();
        }
    }

    function collectFromCatalogueSnapshot(referenceTitle, mediaType, currentId) {
        const snapshot = global.MWDetailCache?.getCatalogueSnapshot?.();
        if (!snapshot?.items?.length) return new Map();

        const seriesCt = mediaType === 'manga' ? 'manga' : 'anime';
        const map = new Map();
        for (const item of snapshot.items) {
            if (!item?.mal_id) continue;
            if (!areSameSeries(item.title, referenceTitle, seriesCt)) continue;
            const year = item.year || item.published?.prop?.from?.year || item.aired?.prop?.from?.year || '';
            map.set(String(item.mal_id), {
                mal_id: item.mal_id,
                title: item.title,
                image: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
                year,
                airedFrom: item.aired?.from || item.published?.from || null,
                episodes: item.episodes || null,
                chapters: item.chapters || null,
                volumes: item.volumes || null
            });
        }
        if (!map.has(String(currentId))) {
            map.set(String(currentId), {
                mal_id: currentId,
                title: referenceTitle,
                image: '',
                year: '',
                airedFrom: null
            });
        }
        return map;
    }

    function prepareItemsList(relatedMap, currentEntry, currentId, ct, referenceTitle) {
        relatedMap.set(String(currentId), currentEntry);
        let items = dedupeRelatedItems(Array.from(relatedMap.values()));
        items.forEach((item) => {
            if (String(item.mal_id) === String(currentId)) {
                delete item._inferredSeason;
                if (currentEntry.title) item.title = currentEntry.title;
            } else if (detectFranchiseKey(item.title) === 'jojo') {
                delete item._inferredSeason;
            }
        });
        assignInferredSeasonNumbers(items, ct, referenceTitle, currentId);
        return sortRelatedItems(items, ct);
    }

    function getLabelForItem(item, isCurrent, referenceTitle, contentType, labelCounts) {
        if (isCurrent && referenceTitle) {
            const currentItem = { ...item, title: referenceTitle };
            delete currentItem._inferredSeason;
            return getSeasonLabel(referenceTitle, contentType, currentItem, labelCounts);
        }
        return getSeasonLabel(item.title, contentType, item, labelCounts);
    }

    function destroyRelatedSeasonsSection() {
        if (activeCarouselCleanup) {
            activeCarouselCleanup();
            activeCarouselCleanup = null;
        }
        document.getElementById('related-seasons-section')?.remove();
    }

    function buildInfoDetailsHtml(pubLines, contentType) {
        if (!pubLines || !pubLines.length) return '';
        const rows = pickPublicationLines(pubLines, contentType, 4);
        return `<div class="related-season-details">${rows.map((row) =>
            `<span class="related-season-detail-row"><span class="related-season-detail-label">${escapeHtml(row.label)}</span><span class="related-season-detail-value">${escapeHtml(row.value)}</span></span>`
        ).join('')}</div>`;
    }

    function buildRelatedCardsHtml(items, currentId, contentType, referenceTitle) {
        const ctLower = (contentType || 'anime').toLowerCase();
        const isManga = ctLower === 'manga' || ctLower === 'manhwa' || ctLower === 'manhua';
        const cardIcon = isManga ? 'fa-book' : 'fa-tv';
        const labelCounts = new Map();

        const cardsHtml = items.map((item) => {
            const isCurrent = String(item.mal_id) === String(currentId);
            const label = getLabelForItem(item, isCurrent, referenceTitle, contentType, labelCounts);
            const badge = getRelationBadge(item, contentType);
            const metaLine = buildMetaLine(item, contentType);
            const img = item.image || '';
            const pubLines = buildPublicationLines(item, contentType);
            const badgeHtml = badge
                ? `<span class="related-season-badge ${badge.className}">${escapeHtml(badge.label)}</span>`
                : '';
            const detailsHtml = pubLines.length ? buildInfoDetailsHtml(pubLines, contentType) : '';
            const metaHtml = !detailsHtml && metaLine
                ? `<span class="related-season-meta">${escapeHtml(metaLine)}</span>`
                : '';
            let posterInner;
            let posterClass = 'related-season-poster';
            if (!isCurrent && !img && pubLines.length > 0) {
                posterClass = 'related-season-poster related-season-poster--publication';
                posterInner = `<div class="related-season-pub-info">${pubLines.map((row) => `<span class="related-season-pub-row"><span class="related-season-pub-label">${escapeHtml(row.label)}</span><span class="related-season-pub-value">${escapeHtml(row.value)}</span></span>`).join('')}</div>`;
            } else {
                const imgHtml = img
                    ? `<img src="${escapeHtml(img)}" alt="" loading="lazy" data-mal-id="${item.mal_id}" onerror="this.classList.add('is-hidden'); this.nextElementSibling?.classList.remove('is-hidden');">`
                    : `<img alt="" loading="lazy" data-mal-id="${item.mal_id}" class="is-hidden" onerror="this.classList.add('is-hidden'); this.nextElementSibling?.classList.remove('is-hidden');">`;
                const fallbackClass = img ? 'related-season-poster-fallback is-hidden' : 'related-season-poster-fallback';
                posterInner = `${imgHtml}<div class="${fallbackClass}" aria-hidden="true"><i class="fas ${cardIcon}"></i></div>`;
            }
            return `
                <a href="${buildDetailUrl(item.mal_id, contentType)}"
                   class="related-season-card${isCurrent ? ' is-current' : ''}"
                   title="${escapeHtml(item.title)}"
                   data-mal-id="${item.mal_id}"
                   ${isCurrent ? 'aria-current="page"' : ''}>
                    <div class="${posterClass}">
                        ${badgeHtml}
                        ${posterInner}
                    </div>
                    <div class="related-season-info">
                        <span class="related-season-label">${escapeHtml(label)}</span>
                        <span class="related-season-subtitle" title="${escapeHtml(item.title)}">${escapeHtml(truncateSubtitle(item.title, 36))}</span>
                        ${detailsHtml}
                        ${metaHtml}
                    </div>
                </a>
            `;
        }).join('');

        return { cardsHtml, cardIcon };
    }

    function attachRelatedCardClickHandlers(section, items, contentType, referenceTitle) {
        const mediaType = getApiMediaType(contentType);
        section.querySelectorAll('.related-season-card').forEach((card) => {
            card.addEventListener('click', async (e) => {
                const malId = card.dataset.malId;
                const item = items.find((i) => String(i.mal_id) === String(malId));
                if (!item?.mal_id || card.classList.contains('is-current')) return;
                if (!global.MWDetailCache?.saveDetailPrefetch) return;

                e.preventDefault();
                const targetUrl = card.getAttribute('href');

                try {
                    const brief = await fetchDetailBrief(mediaType, item.mal_id);
                    const payload = brief || item;
                    global.MWDetailCache.saveDetailPrefetch({
                        mal_id: payload.mal_id || item.mal_id,
                        title: payload.title || item.title,
                        synopsis: payload.synopsis || null,
                        score: payload.score != null ? payload.score : null,
                        genres: payload.genres || [],
                        type: payload.type || (mediaType === 'manga' ? 'Manga' : 'TV'),
                        images: (payload.image || item.image)
                            ? { jpg: { large_image_url: payload.image || item.image, image_url: payload.image || item.image } }
                            : undefined,
                        year: payload.year || item.year || null,
                        chapters: payload.chapters || item.chapters || null,
                        volumes: payload.volumes || item.volumes || null,
                        episodes: payload.episodes || item.episodes || null,
                        published: (payload.year || item.year)
                            ? { prop: { from: { year: payload.year || item.year } } }
                            : undefined,
                        aired: (payload.year || item.year)
                            ? { prop: { from: { year: payload.year || item.year } } }
                            : undefined
                    }, contentType);
                    if (referenceTitle) {
                        const seriesKey = getSeriesCacheKey(referenceTitle, mediaType);
                        saveSeriesRelationsCache(seriesKey, items);
                    }
                } catch (prefetchErr) {
                    console.warn('[details-related-seasons] prefetch:', prefetchErr);
                }

                window.location.href = targetUrl;
            });
        });
    }

    function showRelatedSeasonsLoading(contentType) {
        const synopsisEl = document.querySelector('.synopsis-section');
        if (!synopsisEl) return;

        if (activeCarouselCleanup) {
            activeCarouselCleanup();
            activeCarouselCleanup = null;
        }

        const heading = getSectionHeading(contentType);
        const skeletonCards = [0, 1, 2, 3].map(() => `
            <div class="related-season-skeleton-card" aria-hidden="true">
                <div class="related-season-skeleton-poster"></div>
                <div class="related-season-skeleton-line"></div>
                <div class="related-season-skeleton-line short"></div>
            </div>
        `).join('');

        let section = document.getElementById('related-seasons-section');
        if (!section) {
            section = document.createElement('section');
            section.id = 'related-seasons-section';
            synopsisEl.insertAdjacentElement('afterend', section);
        }
        section.className = 'related-seasons-section is-loading';
        section.setAttribute('aria-busy', 'true');
        section.innerHTML = `
            <h2 class="related-seasons-title" data-i18n="${heading.key}">${heading.text}</h2>
            <div class="related-seasons-loading">
                <div class="related-seasons-loading-track">${skeletonCards}</div>
                <p class="related-seasons-loading-text">
                    <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
                    <span>Chargement des saisons et volumes liés…</span>
                </p>
            </div>
        `;
    }

    async function loadAndRender(content, contentType, contentId) {
        const ct = (contentType || 'anime').toLowerCase();
        if (ct !== 'anime' && ct !== 'manga' && ct !== 'film') return;

        showRelatedSeasonsLoading(ct);

        const mediaType = getApiMediaType(ct);
        const referenceTitle = content?.title || '';
        const currentId = String(contentId || content?.mal_id || '');

        const currentEntry = {
            mal_id: content.mal_id || contentId,
            title: referenceTitle,
            image: content.images?.jpg?.large_image_url || content.images?.jpg?.image_url || '',
            year: content.year || content.aired?.prop?.from?.year || content.published?.prop?.from?.year || '',
            airedFrom: content.aired?.from || content.published?.from || null,
            episodes: content.episodes || null,
            chapters: content.chapters || null,
            volumes: content.volumes || null
        };

        const seriesCacheKey = getSeriesCacheKey(referenceTitle, mediaType);
        let relatedMap = collectFromCatalogueSnapshot(referenceTitle, mediaType, currentId);
        mergeSeriesCacheIntoMap(relatedMap, seriesCacheKey);

        const aniPromise = (async () => {
            let aniEdges = global.MWDetailCache?.getAniListRelations?.(currentId);
            if ((!aniEdges || aniEdges.length === 0) && global.MWDetailCache?.fetchAniListByMalId) {
                try {
                    await global.MWDetailCache.fetchAniListByMalId(currentId, referenceTitle, mediaType);
                    aniEdges = global.MWDetailCache.getAniListRelations(currentId);
                } catch (aniErr) {
                    console.warn('[details-related-seasons] AniList:', aniErr?.message || aniErr);
                }
            }
            if (aniEdges?.length && global.MWDetailCache?.anilistEdgesToRelatedItems) {
                const fromAni = global.MWDetailCache.anilistEdgesToRelatedItems(
                    aniEdges, mediaType, referenceTitle, areSameSeries
                );
                fromAni.forEach((v, k) => relatedMap.set(k, v));
            }
        })();

        const jikanPromise = (async () => {
            try {
                const relationsPayload = await fetchRelations(mediaType, currentId);
                const fromJikan = collectRelatedFromRelationsPayload(
                    relationsPayload, mediaType, referenceTitle
                );
                fromJikan.forEach((v, k) => relatedMap.set(k, v));
            } catch (err) {
                console.warn('[details-related-seasons] Jikan relations:', err?.message || err);
            }
        })();

        await Promise.all([aniPromise, jikanPromise]);
        relatedMap.set(String(currentId), currentEntry);
        await expandRelationsGraphBfs(relatedMap, mediaType, referenceTitle);
        mergeSeriesCacheIntoMap(relatedMap, seriesCacheKey);
        if (relatedMap.size < 2) {
            destroyRelatedSeasonsSection();
            return;
        }

        let items = prepareItemsList(relatedMap, currentEntry, currentId, ct, referenceTitle);
        renderSection(items, currentId, ct, referenceTitle);

        enrichRelatedItems(items, mediaType, currentId).then(() => {
            items.forEach((item) => {
                if (String(item.mal_id) === String(currentId)) {
                    delete item._inferredSeason;
                    if (referenceTitle) item.title = referenceTitle;
                }
            });
            assignInferredSeasonNumbers(items, ct, referenceTitle, currentId);
            items = sortRelatedItems(items, ct);
            saveSeriesRelationsCache(seriesCacheKey, items);
            updateRelatedSectionCards(items, currentId, ct, referenceTitle);
            lazyLoadImages(items, mediaType, () => {
                updateRelatedSectionCards(items, currentId, ct, referenceTitle);
            }).catch(() => {});
        }).catch(() => {});
    }

    function scheduleLoadAndRender(content, contentType, contentId) {
        return new Promise((resolve) => {
            setTimeout(() => {
                loadAndRender(content, contentType, contentId)
                    .then(resolve)
                    .catch((err) => {
                        console.warn('[details-related-seasons]', err);
                        resolve();
                    });
            }, RELATED_LOAD_DELAY_MS);
        });
    }

    global.DetailsRelatedSeasons = {
        loadAndRender: scheduleLoadAndRender,
        loadAndRenderNow: loadAndRender,
        initRelatedSeasonsCarousel,
        renderSection,
        sortRelatedItems,
        getSectionHeading,
        extractBaseTitle,
        getSeasonSortKey
    };
})(typeof window !== 'undefined' ? window : global);
