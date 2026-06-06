/**
 * Recommandations personnalisées — questionnaire → 2 titres choisis par profil explicite.
 */
const QUIZ_STORAGE_KEY = 'mw_rec_quiz_answers_v11';

function getDefaultCoverPath() {
    const path = window.location.pathname || '';
    if (path.indexOf('/pages/') !== -1) return '../images/default-anime.svg';
    return '/images/default-anime.svg';
}
const RESULT_COUNT = 2;
const DAILY_POOL_SIZE = 18;

function tr(key, fallback) {
    if (typeof window.t === 'function') {
        const v = window.t(key);
        if (v && v !== key) return v;
    }
    return fallback;
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getDetailUrl(malId, mediaType) {
    const params = new URLSearchParams({ id: String(malId) });
    if (mediaType === 'manga') params.set('type', 'manga');
    else {
        params.set('type', 'anime');
        params.set('season', '1');
    }
    return 'anime-details.html?' + params.toString();
}

const QUIZ_QUESTIONS = [
    {
        id: 'media',
        titleKey: 'home.rec_quiz_q_media',
        hintKey: 'home.rec_quiz_q_media_hint',
        multiple: false,
        options: [
            { id: 'anime', labelKey: 'home.rec_quiz_opt_anime', icon: 'fa-tv' },
            { id: 'manga', labelKey: 'home.rec_quiz_opt_manga', icon: 'fa-book' },
            { id: 'both', labelKey: 'home.rec_quiz_opt_both', icon: 'fa-layer-group' }
        ]
    },
    {
        id: 'genres',
        titleKey: 'home.rec_quiz_q_genres',
        hintKey: 'home.rec_quiz_q_genres_hint',
        multiple: false,
        options: [
            { id: 'action', labelKey: 'home.rec_quiz_genre_action', icon: 'fa-bolt' },
            { id: 'romance', labelKey: 'home.rec_quiz_genre_romance', icon: 'fa-heart' },
            { id: 'fantasy', labelKey: 'home.rec_quiz_genre_fantasy', icon: 'fa-hat-wizard' },
            { id: 'drama', labelKey: 'home.rec_quiz_genre_drama', icon: 'fa-masks-theater' },
            { id: 'comedy', labelKey: 'home.rec_quiz_genre_comedy', icon: 'fa-face-laugh-beam' },
            { id: 'horror', labelKey: 'home.rec_quiz_genre_horror', icon: 'fa-ghost' },
            { id: 'mystery', labelKey: 'home.rec_quiz_genre_mystery', icon: 'fa-magnifying-glass' },
            { id: 'slice_of_life', labelKey: 'home.rec_quiz_genre_slice', icon: 'fa-mug-hot' },
            { id: 'scifi', labelKey: 'home.rec_quiz_genre_scifi', icon: 'fa-rocket' },
            { id: 'sports', labelKey: 'home.rec_quiz_genre_sports', icon: 'fa-futbol' },
            { id: 'supernatural', labelKey: 'home.rec_quiz_genre_supernatural', icon: 'fa-wand-magic-sparkles' },
            { id: 'psychological', labelKey: 'home.rec_quiz_genre_psychological', icon: 'fa-brain' },
            { id: 'mecha', labelKey: 'home.rec_quiz_genre_mecha', icon: 'fa-robot' },
            { id: 'music', labelKey: 'home.rec_quiz_genre_music', icon: 'fa-music' },
            { id: 'isekai', labelKey: 'home.rec_quiz_genre_isekai', icon: 'fa-door-open' },
            { id: 'school', labelKey: 'home.rec_quiz_genre_school', icon: 'fa-graduation-cap' },
            { id: 'historical', labelKey: 'home.rec_quiz_genre_historical', icon: 'fa-landmark' },
            { id: 'martial_arts', labelKey: 'home.rec_quiz_genre_martial_arts', icon: 'fa-hand-back-fist' },
            { id: 'military', labelKey: 'home.rec_quiz_genre_military', icon: 'fa-shield-halved' },
            { id: 'adventure', labelKey: 'home.rec_quiz_genre_adventure', icon: 'fa-compass' }
        ]
    },
    {
        id: 'mood',
        titleKey: 'home.rec_quiz_q_mood',
        hintKey: 'home.rec_quiz_q_mood_hint',
        multiple: false,
        options: [
            { id: 'intense', labelKey: 'home.rec_quiz_mood_intense', icon: 'fa-fire' },
            { id: 'emotional', labelKey: 'home.rec_quiz_mood_emotional', icon: 'fa-heart-pulse' },
            { id: 'feelgood', labelKey: 'home.rec_quiz_mood_feelgood', icon: 'fa-sun' },
            { id: 'dark', labelKey: 'home.rec_quiz_mood_dark', icon: 'fa-moon' },
            { id: 'relaxing', labelKey: 'home.rec_quiz_mood_relaxing', icon: 'fa-cloud' },
            { id: 'humorous', labelKey: 'home.rec_quiz_mood_humorous', icon: 'fa-face-grin-squint' },
            { id: 'thrilling', labelKey: 'home.rec_quiz_mood_thrilling', icon: 'fa-bolt-lightning' },
            { id: 'epic', labelKey: 'home.rec_quiz_mood_epic', icon: 'fa-crown' },
            { id: 'tender', labelKey: 'home.rec_quiz_mood_tender', icon: 'fa-heart' },
            { id: 'inspirational', labelKey: 'home.rec_quiz_mood_inspirational', icon: 'fa-star' },
            { id: 'melancholic', labelKey: 'home.rec_quiz_mood_melancholic', icon: 'fa-cloud-rain' },
            { id: 'chaotic', labelKey: 'home.rec_quiz_mood_chaotic', icon: 'fa-explosion' },
            { id: 'nostalgic', labelKey: 'home.rec_quiz_mood_nostalgic', icon: 'fa-clock-rotate-left' }
        ]
    },
    {
        id: 'length',
        titleKey: 'home.rec_quiz_q_length',
        hintKey: 'home.rec_quiz_q_length_hint',
        multiple: false,
        options: [
            { id: 'short', labelKey: 'home.rec_quiz_len_short', icon: 'fa-hourglass-start' },
            { id: 'medium', labelKey: 'home.rec_quiz_len_medium', icon: 'fa-hourglass-half' },
            { id: 'long', labelKey: 'home.rec_quiz_len_long', icon: 'fa-hourglass-end' }
        ]
    },
    {
        id: 'focus',
        titleKey: 'home.rec_quiz_q_focus',
        hintKey: 'home.rec_quiz_q_focus_hint',
        multiple: false,
        options: [
            { id: 'fights', labelKey: 'home.rec_quiz_focus_fights', icon: 'fa-hand-fist' },
            { id: 'plot', labelKey: 'home.rec_quiz_focus_plot', icon: 'fa-puzzle-piece' },
            { id: 'characters', labelKey: 'home.rec_quiz_focus_characters', icon: 'fa-users' },
            { id: 'world', labelKey: 'home.rec_quiz_focus_world', icon: 'fa-globe' },
            { id: 'humor', labelKey: 'home.rec_quiz_focus_humor', icon: 'fa-face-laugh' },
            { id: 'art', labelKey: 'home.rec_quiz_focus_art', icon: 'fa-palette' },
            { id: 'music', labelKey: 'home.rec_quiz_focus_music', icon: 'fa-compact-disc' },
            { id: 'twists', labelKey: 'home.rec_quiz_focus_twists', icon: 'fa-shuffle' },
            { id: 'strategy', labelKey: 'home.rec_quiz_focus_strategy', icon: 'fa-chess' },
            { id: 'dialogue', labelKey: 'home.rec_quiz_focus_dialogue', icon: 'fa-comments' },
            { id: 'atmosphere', labelKey: 'home.rec_quiz_focus_atmosphere', icon: 'fa-wind' },
            { id: 'chemistry', labelKey: 'home.rec_quiz_focus_chemistry', icon: 'fa-people-arrows' }
        ]
    }
];

/** Métadonnées des titres (id MAL vérifiés). format/episodes/volumes = durée réelle. */
const TITLE_META = {
    '16498': { mediaType: 'anime', title: 'Attack on Titan', format: 'tv', episodes: 87, genres: ['action', 'fantasy'], mood: ['intense', 'dark'], focus: ['fights', 'plot'] },
    '5114': { mediaType: 'anime', title: 'Fullmetal Alchemist: Brotherhood', format: 'tv', episodes: 64, genres: ['action', 'fantasy'], mood: ['intense', 'emotional'], focus: ['fights', 'plot'] },
    '40748': { mediaType: 'anime', title: 'Jujutsu Kaisen', format: 'tv', episodes: 24, genres: ['action', 'fantasy', 'horror'], mood: ['intense', 'dark'], focus: ['fights'] },
    '38000': { mediaType: 'anime', title: 'Demon Slayer', format: 'tv', episodes: 26, genres: ['action', 'fantasy'], mood: ['intense', 'emotional'], focus: ['fights', 'characters'] },
    '30276': { mediaType: 'anime', title: 'One Punch Man', format: 'tv', episodes: 12, genres: ['action', 'comedy'], mood: ['intense', 'feelgood'], focus: ['fights'] },
    '44042': { mediaType: 'anime', title: 'Chainsaw Man', format: 'tv', episodes: 12, genres: ['action', 'horror'], mood: ['intense', 'dark'], focus: ['fights'] },
    '22319': { mediaType: 'anime', title: 'Toradora!', format: 'tv', episodes: 25, genres: ['romance', 'comedy', 'slice_of_life'], mood: ['feelgood', 'emotional'], focus: ['characters'] },
    '32615': { mediaType: 'anime', title: 'Your Name', format: 'movie', genres: ['romance', 'fantasy'], mood: ['emotional'], focus: ['characters'] },
    '39535': { mediaType: 'anime', title: 'Horimiya', format: 'tv', episodes: 13, genres: ['romance', 'comedy', 'slice_of_life'], mood: ['feelgood', 'emotional'], focus: ['characters'] },
    '14467': { mediaType: 'anime', title: 'Kaguya-sama: Love is War', format: 'tv', episodes: 37, genres: ['romance', 'comedy'], mood: ['feelgood'], focus: ['characters'] },
    '52991': { mediaType: 'anime', title: 'Frieren', format: 'tv', episodes: 28, genres: ['fantasy', 'slice_of_life'], mood: ['emotional', 'feelgood'], focus: ['characters', 'world'] },
    '34599': { mediaType: 'anime', title: 'Made in Abyss', format: 'tv', episodes: 13, genres: ['fantasy'], mood: ['dark', 'emotional'], focus: ['world', 'characters'] },
    '1535': { mediaType: 'anime', title: 'Death Note', format: 'tv', episodes: 37, genres: ['horror', 'scifi'], mood: ['dark', 'intense'], focus: ['plot'] },
    '21329': { mediaType: 'anime', title: 'Parasyte', format: 'tv', episodes: 24, genres: ['horror', 'action', 'scifi'], mood: ['dark', 'intense'], focus: ['plot', 'fights'] },
    '9253': { mediaType: 'anime', title: 'Steins;Gate', format: 'tv', episodes: 24, genres: ['scifi'], mood: ['emotional', 'dark'], focus: ['plot', 'characters'] },
    '33486': { mediaType: 'anime', title: 'Erased', format: 'tv', episodes: 12, genres: ['scifi', 'horror'], mood: ['dark', 'emotional'], focus: ['plot'] },
    '14719': { mediaType: 'anime', title: 'Nichijou', format: 'tv', episodes: 26, genres: ['comedy', 'slice_of_life'], mood: ['feelgood'], focus: ['characters'] },
    '31964': { mediaType: 'anime', title: 'Bocchi the Rock!', format: 'tv', episodes: 12, genres: ['comedy', 'slice_of_life'], mood: ['feelgood', 'emotional'], focus: ['characters'] },
    '34798': { mediaType: 'anime', title: 'Yuru Camp', format: 'tv', episodes: 12, genres: ['slice_of_life', 'comedy'], mood: ['feelgood'], focus: ['characters'] },
    '50265': { mediaType: 'anime', title: 'Spy x Family', format: 'tv', episodes: 25, genres: ['action', 'comedy'], mood: ['feelgood'], focus: ['characters'] },
    '20583': { mediaType: 'anime', title: 'Haikyu!!', format: 'tv', episodes: 85, genres: ['sports', 'comedy'], mood: ['feelgood', 'emotional'], focus: ['characters', 'fights'] },
    '11771': { mediaType: 'anime', title: 'Kuroko no Basket', format: 'tv', episodes: 75, genres: ['sports', 'comedy'], mood: ['intense', 'feelgood'], focus: ['fights', 'characters'] },
    '11061': { mediaType: 'anime', title: 'Hunter x Hunter', format: 'tv', episodes: 148, genres: ['action', 'fantasy'], mood: ['intense'], focus: ['fights', 'world'] },
    '19815': { mediaType: 'anime', title: 'No Game No Life', format: 'tv', episodes: 12, genres: ['fantasy', 'comedy', 'scifi'], mood: ['feelgood'], focus: ['plot', 'world'] },
    '32995': { mediaType: 'anime', title: 'Yuri on Ice', format: 'tv', episodes: 12, genres: ['sports', 'romance'], mood: ['intense', 'emotional'], focus: ['characters', 'fights'] },
    '9919': { mediaType: 'anime', title: 'Chihayafuru', format: 'tv', episodes: 75, genres: ['sports', 'romance', 'slice_of_life'], mood: ['intense', 'emotional'], focus: ['characters'] },
    '747': { mediaType: 'anime', title: 'Cross Game', format: 'tv', episodes: 50, genres: ['sports', 'romance'], mood: ['intense', 'emotional'], focus: ['characters', 'plot'] },
    '3179': { mediaType: 'anime', title: 'Baby Steps', format: 'tv', episodes: 50, genres: ['sports', 'romance'], mood: ['intense', 'feelgood'], focus: ['characters', 'fights'] },
    '263': { mediaType: 'anime', title: 'Hajime no Ippo', format: 'tv', episodes: 75, genres: ['sports', 'action', 'romance'], mood: ['intense', 'emotional'], focus: ['fights', 'characters'] },
    '3701': { mediaType: 'anime', title: 'Slam Dunk', format: 'tv', episodes: 101, genres: ['sports', 'comedy', 'romance'], mood: ['intense', 'feelgood'], focus: ['characters', 'fights'] },
    '28891': { mediaType: 'anime', title: 'A Silent Voice', format: 'movie', genres: ['romance', 'slice_of_life'], mood: ['emotional'], focus: ['characters'] },
    '37987': { mediaType: 'anime', title: 'Weathering With You', format: 'movie', genres: ['romance', 'fantasy'], mood: ['emotional'], focus: ['characters', 'world'] },
    '52347': { mediaType: 'anime', title: 'Jujutsu Kaisen 0', format: 'movie', genres: ['action', 'fantasy', 'horror'], mood: ['intense', 'dark'], focus: ['fights'] },
    '437': { mediaType: 'anime', title: 'Perfect Blue', format: 'movie', genres: ['horror'], mood: ['dark', 'intense'], focus: ['plot', 'characters'] },
    '199': { mediaType: 'anime', title: 'Spirited Away', format: 'movie', genres: ['fantasy'], mood: ['emotional', 'feelgood'], focus: ['world', 'characters'] },
    '35860': { mediaType: 'anime', title: 'Demon Slayer: Mugen Train', format: 'movie', genres: ['action', 'fantasy'], mood: ['intense', 'emotional'], focus: ['fights'] },
    '44511': { mediaType: 'anime', title: 'The First Slam Dunk', format: 'movie', genres: ['sports', 'action'], mood: ['intense', 'emotional'], focus: ['fights', 'characters'] },
    '34542': { mediaType: 'anime', title: 'I Want to Eat Your Pancreas', format: 'movie', genres: ['romance', 'slice_of_life'], mood: ['emotional'], focus: ['characters'] },
    '10620': { mediaType: 'anime', title: 'Summer Wars', format: 'movie', genres: ['scifi', 'comedy', 'slice_of_life'], mood: ['feelgood', 'emotional'], focus: ['characters', 'world'] },
    '22729': { mediaType: 'anime', title: 'Grave of the Fireflies', format: 'movie', genres: ['slice_of_life', 'horror'], mood: ['dark', 'emotional'], focus: ['characters'] },
    '53888': { mediaType: 'anime', title: 'Spy x Family Code: White', format: 'movie', genres: ['action', 'comedy'], mood: ['feelgood'], focus: ['characters'] },
    '47': { mediaType: 'anime', title: 'Akira', format: 'movie', genres: ['action', 'scifi', 'horror'], mood: ['intense', 'dark'], focus: ['fights', 'world'] },
    '28977': { mediaType: 'anime', title: 'Gintama: The Final', format: 'movie', genres: ['action', 'comedy'], mood: ['intense', 'feelgood'], focus: ['fights', 'characters'] },
    '100166': { mediaType: 'anime', title: 'Promare', format: 'movie', genres: ['action', 'scifi'], mood: ['intense', 'feelgood'], focus: ['fights'] },
    '13': { mediaType: 'manga', title: 'One Piece', volumes: 110, genres: ['action', 'comedy', 'fantasy'], mood: ['intense', 'feelgood'], focus: ['fights', 'world'] },
    '44347': { mediaType: 'manga', title: 'Chainsaw Man', volumes: 16, genres: ['action', 'horror'], mood: ['intense', 'dark'], focus: ['fights'] },
    '117796': { mediaType: 'manga', title: 'Solo Leveling', volumes: 14, genres: ['action', 'fantasy'], mood: ['intense'], focus: ['fights', 'world'] },
    '72467': { mediaType: 'manga', title: 'Horimiya', volumes: 16, genres: ['romance', 'comedy', 'slice_of_life'], mood: ['feelgood', 'emotional'], focus: ['characters'] },
    '122': { mediaType: 'manga', title: 'Fruits Basket', volumes: 23, genres: ['romance', 'slice_of_life', 'fantasy'], mood: ['emotional', 'feelgood'], focus: ['characters'] },
    '128583': { mediaType: 'manga', title: 'Oshi no Ko', volumes: 16, genres: ['romance', 'comedy'], mood: ['dark', 'emotional'], focus: ['plot', 'characters'] },
    '113138': { mediaType: 'manga', title: 'Frieren', volumes: 14, genres: ['fantasy', 'slice_of_life'], mood: ['emotional', 'feelgood'], focus: ['characters', 'world'] },
    '2': { mediaType: 'manga', title: 'Berserk', volumes: 42, genres: ['action', 'fantasy', 'horror'], mood: ['dark', 'intense'], focus: ['fights', 'world'] },
    '712': { mediaType: 'manga', title: 'Death Note', volumes: 12, genres: ['horror', 'scifi'], mood: ['dark', 'intense'], focus: ['plot'] },
    '11': { mediaType: 'manga', title: 'Monster', volumes: 18, genres: ['horror', 'scifi'], mood: ['dark', 'emotional'], focus: ['plot', 'characters'] },
    '656': { mediaType: 'manga', title: 'Uzumaki', volumes: 3, genres: ['horror'], mood: ['dark'], focus: ['plot', 'world'] },
    '111043': { mediaType: 'manga', title: 'Tokyo Ghoul', volumes: 14, genres: ['action', 'horror'], mood: ['dark', 'intense'], focus: ['fights', 'characters'] },
    '70345': { mediaType: 'manga', title: 'Mob Psycho 100', volumes: 16, genres: ['action', 'comedy'], mood: ['feelgood', 'emotional'], focus: ['characters', 'fights'] },
    '116778': { mediaType: 'manga', title: 'Spy x Family', volumes: 14, genres: ['action', 'comedy'], mood: ['feelgood'], focus: ['characters'] },
    '642': { mediaType: 'manga', title: 'Hajime no Ippo', volumes: 145, genres: ['sports', 'action', 'romance'], mood: ['intense', 'emotional'], focus: ['fights', 'characters'] },
    '145863': { mediaType: 'manga', title: 'Blue Lock', volumes: 32, genres: ['sports', 'action'], mood: ['intense'], focus: ['fights', 'characters'] },
    '14483': { mediaType: 'manga', title: 'Haikyu!!', volumes: 45, genres: ['sports', 'comedy'], mood: ['feelgood', 'emotional'], focus: ['characters'] },
    '1224': { mediaType: 'manga', title: '20th Century Boys', volumes: 22, genres: ['scifi', 'horror'], mood: ['dark', 'intense'], focus: ['plot', 'world'] },
    '104': { mediaType: 'manga', title: 'Vinland Saga', volumes: 28, genres: ['action', 'fantasy'], mood: ['intense', 'emotional'], focus: ['fights', 'plot'] },
    '10109': { mediaType: 'manga', title: 'Chihayafuru', volumes: 50, genres: ['sports', 'romance', 'slice_of_life'], mood: ['intense', 'emotional'], focus: ['characters'] },
    '7634': { mediaType: 'manga', title: 'Cross Game', volumes: 17, genres: ['sports', 'romance'], mood: ['intense', 'emotional'], focus: ['characters', 'plot'] },
    '12402': { mediaType: 'manga', title: 'Baby Steps', volumes: 47, genres: ['sports', 'romance'], mood: ['intense', 'feelgood'], focus: ['characters', 'fights'] },
    '7519': { mediaType: 'manga', title: 'Slam Dunk', volumes: 31, genres: ['sports', 'comedy', 'romance'], mood: ['intense', 'emotional'], focus: ['characters', 'fights'] },
    '101219': { mediaType: 'manga', title: 'Yuru Camp', volumes: 14, genres: ['slice_of_life', 'comedy'], mood: ['feelgood'], focus: ['characters'] },
    '9674': { mediaType: 'manga', title: 'Toradora!', volumes: 10, genres: ['romance', 'comedy', 'slice_of_life'], mood: ['feelgood', 'emotional'], focus: ['characters'] },
    '102': { mediaType: 'manga', title: 'Your Lie in April', volumes: 11, genres: ['romance', 'slice_of_life'], mood: ['emotional'], focus: ['characters'] },
    '24705': { mediaType: 'manga', title: 'Solanin', volumes: 2, genres: ['slice_of_life', 'romance'], mood: ['emotional'], focus: ['characters'] },
    '23390': { mediaType: 'manga', title: 'All You Need Is Kill', volumes: 2, genres: ['action', 'scifi'], mood: ['intense'], focus: ['fights', 'plot'] },
    '30': { mediaType: 'anime', title: 'Neon Genesis Evangelion', format: 'tv', episodes: 26, genres: ['mecha', 'psychological', 'scifi'], mood: ['intense', 'dark'], focus: ['plot', 'characters'] },
    '23273': { mediaType: 'anime', title: 'Your Lie in April', format: 'tv', episodes: 22, genres: ['music', 'drama', 'romance'], mood: ['emotional', 'tender'], focus: ['music', 'characters'] },
    '38524': { mediaType: 'anime', title: 'Violet Evergarden', format: 'tv', episodes: 13, genres: ['drama', 'slice_of_life', 'fantasy'], mood: ['emotional', 'tender'], focus: ['characters', 'art'] },
    '1575': { mediaType: 'anime', title: 'Code Geass', format: 'tv', episodes: 25, genres: ['mecha', 'action', 'drama'], mood: ['intense', 'thrilling'], focus: ['plot', 'twists'] },
    '918': { mediaType: 'anime', title: 'Gintama', format: 'tv', episodes: 201, genres: ['comedy', 'action'], mood: ['humorous', 'feelgood'], focus: ['humor', 'characters'] },
    '21': { mediaType: 'anime', title: 'One Piece', format: 'tv', episodes: 1000, genres: ['action', 'adventure', 'comedy', 'fantasy'], mood: ['intense', 'feelgood', 'epic'], focus: ['fights', 'world', 'characters'] },
    '1735': { mediaType: 'anime', title: 'Naruto', format: 'tv', episodes: 220, genres: ['action', 'adventure', 'martial_arts'], mood: ['intense', 'inspirational'], focus: ['fights', 'characters'] },
    '40052': { mediaType: 'anime', title: 'Tokyo Ghoul', format: 'tv', episodes: 12, genres: ['action', 'horror', 'supernatural'], mood: ['dark', 'intense'], focus: ['fights', 'plot'] },
    '30831': { mediaType: 'anime', title: 'KonoSuba', format: 'tv', episodes: 20, genres: ['comedy', 'fantasy', 'isekai', 'adventure'], mood: ['humorous', 'chaotic', 'feelgood'], focus: ['humor', 'characters'] },
    '29831': { mediaType: 'anime', title: 'Re:Zero', format: 'tv', episodes: 25, genres: ['fantasy', 'drama', 'isekai', 'psychological'], mood: ['dark', 'thrilling', 'emotional'], focus: ['plot', 'twists', 'characters'] },
    '11757': { mediaType: 'anime', title: 'Sword Art Online', format: 'tv', episodes: 25, genres: ['action', 'fantasy', 'isekai', 'romance'], mood: ['intense', 'emotional'], focus: ['fights', 'world'] },
    '32182': { mediaType: 'anime', title: 'JoJo\'s Bizarre Adventure', format: 'tv', episodes: 26, genres: ['action', 'adventure', 'supernatural'], mood: ['intense', 'chaotic', 'epic'], focus: ['fights', 'characters', 'art'] },
    '47194': { mediaType: 'anime', title: 'Summertime Rendering', format: 'tv', episodes: 25, genres: ['mystery', 'supernatural', 'horror', 'school'], mood: ['thrilling', 'dark'], focus: ['twists', 'plot'] },
    '28171': { mediaType: 'anime', title: 'Food Wars', format: 'tv', episodes: 24, genres: ['comedy', 'school', 'sports'], mood: ['intense', 'humorous'], focus: ['fights', 'characters'] },
    '5680': { mediaType: 'anime', title: 'K-On!', format: 'tv', episodes: 14, genres: ['music', 'comedy', 'school', 'slice_of_life'], mood: ['feelgood', 'relaxing', 'nostalgic'], focus: ['music', 'characters', 'atmosphere'] },
    '35247': { mediaType: 'anime', title: 'Look Back', format: 'movie', genres: ['drama', 'school'], mood: ['emotional', 'melancholic', 'inspirational'], focus: ['art', 'characters', 'atmosphere'] },
    '28623': { mediaType: 'anime', title: 'Kuroko no Basket: Last Game', format: 'movie', genres: ['sports', 'school'], mood: ['intense', 'inspirational'], focus: ['fights', 'chemistry'] },
    '9969': { mediaType: 'anime', title: 'Gintama Movie: The Final Chapter', format: 'movie', genres: ['action', 'comedy'], mood: ['humorous', 'epic'], focus: ['humor', 'fights'] },
    '48569': { mediaType: 'anime', title: '86', format: 'tv', episodes: 23, genres: ['action', 'drama', 'military', 'scifi'], mood: ['intense', 'emotional', 'melancholic'], focus: ['plot', 'atmosphere', 'characters'] },
    '40776': { mediaType: 'anime', title: 'Haikyu!! To the Top', format: 'tv', episodes: 25, genres: ['sports', 'school', 'comedy'], mood: ['intense', 'inspirational', 'feelgood'], focus: ['fights', 'chemistry', 'characters'] },
    '4224': { mediaType: 'anime', title: 'Toriko', format: 'tv', episodes: 147, genres: ['action', 'adventure', 'comedy'], mood: ['intense', 'feelgood'], focus: ['fights', 'world'] },
    '2904': { mediaType: 'anime', title: 'Code Geass: Hangyaku no Lelouch R2', format: 'tv', episodes: 25, genres: ['mecha', 'military', 'drama'], mood: ['intense', 'thrilling', 'epic'], focus: ['strategy', 'plot', 'twists'] },
    '44307': { mediaType: 'manga', title: 'Jujutsu Kaisen', volumes: 30, genres: ['action', 'horror', 'supernatural', 'school'], mood: ['intense', 'dark'], focus: ['fights', 'art'] },
    '43': { mediaType: 'manga', title: 'Dragon Ball', volumes: 42, genres: ['action', 'adventure', 'comedy', 'martial_arts'], mood: ['intense', 'feelgood', 'humorous'], focus: ['fights', 'characters'] },
    '65761': { mediaType: 'manga', title: 'Mushoku Tensei', volumes: 22, genres: ['fantasy', 'isekai', 'adventure', 'drama'], mood: ['emotional', 'intense'], focus: ['world', 'characters', 'plot'] },
    '87609': { mediaType: 'manga', title: 'That Time I Got Reincarnated as a Slime', volumes: 28, genres: ['fantasy', 'isekai', 'adventure', 'comedy'], mood: ['feelgood', 'intense'], focus: ['world', 'strategy', 'characters'] },
    '99891': { mediaType: 'manga', title: 'Dandadan', volumes: 20, genres: ['action', 'comedy', 'supernatural', 'romance'], mood: ['chaotic', 'humorous', 'intense'], focus: ['fights', 'humor', 'art'] },
    '128545': { mediaType: 'manga', title: 'Tokyo Revengers', volumes: 31, genres: ['action', 'drama', 'school', 'supernatural'], mood: ['intense', 'emotional', 'thrilling'], focus: ['plot', 'characters', 'chemistry'] },
    '89185': { mediaType: 'manga', title: 'Grand Blue', volumes: 22, genres: ['comedy', 'school', 'slice_of_life'], mood: ['humorous', 'chaotic', 'feelgood'], focus: ['humor', 'characters', 'atmosphere'] },
    '90172': { mediaType: 'manga', title: 'Komi Can\'t Communicate', volumes: 37, genres: ['comedy', 'romance', 'school', 'slice_of_life'], mood: ['feelgood', 'tender', 'humorous'], focus: ['characters', 'chemistry', 'dialogue'] },
    '107562': { mediaType: 'manga', title: 'Blue Period', volumes: 13, genres: ['drama', 'school', 'slice_of_life'], mood: ['inspirational', 'emotional', 'melancholic'], focus: ['art', 'characters', 'atmosphere'] },
    '133703': { mediaType: 'manga', title: 'Look Back', volumes: 1, genres: ['drama', 'school'], mood: ['emotional', 'melancholic', 'inspirational'], focus: ['art', 'characters', 'atmosphere'] },
    '128537': { mediaType: 'manga', title: 'Takopi\'s Original Sin', volumes: 1, genres: ['drama', 'psychological', 'school'], mood: ['dark', 'emotional', 'melancholic'], focus: ['characters', 'dialogue', 'atmosphere'] },
    '65693': { mediaType: 'manga', title: 'Kingdom', volumes: 75, genres: ['action', 'historical', 'military', 'drama'], mood: ['intense', 'epic', 'inspirational'], focus: ['strategy', 'fights', 'plot'] },
    '51': { mediaType: 'manga', title: 'Fullmetal Alchemist', volumes: 27, genres: ['action', 'adventure', 'fantasy', 'drama'], mood: ['intense', 'emotional', 'epic'], focus: ['fights', 'plot', 'characters'] },
    '90123': { mediaType: 'manga', title: 'Kaguya-sama: Love is War', volumes: 28, genres: ['romance', 'comedy', 'school', 'psychological'], mood: ['humorous', 'tender'], focus: ['strategy', 'dialogue', 'chemistry'] },
    '971': { mediaType: 'manga', title: 'JoJo\'s Bizarre Adventure', volumes: 131, genres: ['action', 'adventure', 'supernatural'], mood: ['intense', 'chaotic', 'epic'], focus: ['fights', 'characters', 'art'] },
    '3': { mediaType: 'manga', title: 'Naruto', volumes: 72, genres: ['action', 'adventure', 'martial_arts'], mood: ['intense', 'inspirational'], focus: ['fights', 'characters', 'chemistry'] },
    '118586': { mediaType: 'manga', title: 'Summertime Rendering', volumes: 13, genres: ['mystery', 'supernatural', 'horror', 'school'], mood: ['thrilling', 'dark'], focus: ['twists', 'plot', 'atmosphere'] }
};

function mergeTags(existing, extra) {
    const out = (existing || []).slice();
    (extra || []).forEach(function (t) {
        if (out.indexOf(t) === -1) out.push(t);
    });
    return out;
}

/** Enrichit le catalogue avec les nouveaux genres / ambiances / priorités. */
const META_TAG_PATCH = {
    '16498': { mood: ['epic'], genres: ['drama', 'military'], focus: ['atmosphere'] },
    '5114': { mood: ['epic'], genres: ['drama'] },
    '1535': { genres: ['psychological', 'mystery'], mood: ['thrilling'], focus: ['twists'] },
    '712': { genres: ['psychological', 'mystery'], mood: ['thrilling'], focus: ['twists'] },
    '9253': { genres: ['mystery', 'psychological'], mood: ['thrilling'], focus: ['twists', 'plot'] },
    '33486': { genres: ['mystery'], mood: ['thrilling'], focus: ['twists'] },
    '11': { genres: ['psychological', 'mystery', 'drama'], mood: ['thrilling'], focus: ['plot', 'twists'] },
    '21329': { genres: ['psychological', 'supernatural'], mood: ['thrilling'] },
    '40748': { genres: ['supernatural'] },
    '34599': { mood: ['epic'], focus: ['art', 'world'] },
    '34798': { mood: ['relaxing'] },
    '101219': { mood: ['relaxing'] },
    '14719': { mood: ['humorous'], focus: ['humor'] },
    '14467': { mood: ['humorous'], focus: ['humor'] },
    '30276': { mood: ['humorous'], focus: ['humor'] },
    '31964': { genres: ['music'], mood: ['humorous', 'emotional'], focus: ['music', 'art'] },
    '102': { genres: ['music', 'drama'], mood: ['tender'], focus: ['music'] },
    '22319': { mood: ['tender'] },
    '39535': { mood: ['tender'], genres: ['school'], focus: ['chemistry', 'dialogue'] },
    '9674': { genres: ['school'], mood: ['tender'], focus: ['chemistry', 'dialogue'] },
    '111043': { genres: ['supernatural', 'psychological'], mood: ['melancholic'], focus: ['atmosphere'] },
    '22319': { genres: ['school'], focus: ['chemistry', 'dialogue'] },
    '5680': { mood: ['nostalgic'], focus: ['atmosphere'] },
    '21': { genres: ['adventure'], mood: ['epic', 'inspirational'] },
    '13': { genres: ['adventure'], mood: ['epic'] },
    '29831': { focus: ['atmosphere'] },
    '48569': { focus: ['dialogue'] },
    '35247': { mood: ['inspirational', 'melancholic'] },
    '133703': { mood: ['inspirational', 'melancholic'] },
    '28891': { mood: ['tender'], focus: ['art'] },
    '32615': { genres: ['supernatural'], mood: ['tender'], focus: ['art'] },
    '437': { genres: ['psychological'], mood: ['thrilling'], focus: ['twists'] },
    '44042': { genres: ['supernatural'], focus: ['art'] },
    '28977': { mood: ['humorous', 'epic'], focus: ['humor'] },
    '50265': { focus: ['humor'] },
    '53888': { focus: ['humor'] },
    '52991': { mood: ['relaxing', 'epic'] },
    '104': { genres: ['drama'], mood: ['epic'] },
    '1224': { genres: ['mystery'], focus: ['twists'] },
    '128583': { genres: ['drama', 'mystery'], focus: ['twists'] }
};

Object.keys(META_TAG_PATCH).forEach(function (id) {
    const meta = TITLE_META[id];
    const patch = META_TAG_PATCH[id];
    if (!meta || !patch) return;
    if (patch.genres) meta.genres = mergeTags(meta.genres, patch.genres);
    if (patch.mood) meta.mood = mergeTags(meta.mood, patch.mood);
    if (patch.focus) meta.focus = mergeTags(meta.focus, patch.focus);
});

function hashSeed(str) {
    let h = 2166136261;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function getDailySeed(suffix) {
    const d = new Date();
    const day = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return hashSeed(day + '|' + suffix);
}

function mulberry32(a) {
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function seededShuffle(list, seed) {
    const rng = mulberry32(seed);
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

const quizState = { step: 0, answers: {}, phase: 'quiz', lastItems: null, lastAnswers: null };

function resetQuizState() {
    quizState.step = 0;
    quizState.answers = {};
    quizState.phase = 'quiz';
    quizState.lastItems = null;
    quizState.lastAnswers = null;
}

function getSiteLanguage() {
    let lang = (localStorage.getItem('mangaWatchLanguage') || 'fr').toLowerCase();
    if (lang.length > 2) lang = lang.substring(0, 2);
    return lang;
}

async function translateRecSynopses(container) {
    if (!container) return;
    const lang = getSiteLanguage();
    const elements = container.querySelectorAll('.rec-premium-synopsis');
    if (!elements.length) return;

    const translateFn = typeof window.translateWithCache === 'function' ? window.translateWithCache : null;

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        let original = el.getAttribute('data-original-text');
        if (!original) {
            original = el.textContent.trim();
            if (original) el.setAttribute('data-original-text', original);
        }
        if (!original) continue;

        if (lang === 'en') {
            el.textContent = original;
            continue;
        }
        if (!translateFn) continue;

        try {
            const translated = await translateFn(original, lang);
            if (translated && translated.trim()) {
                el.textContent = translated;
            }
        } catch (e) { /* ignore */ }
    }
}

function getSelectedForQuestion(question) {
    const val = quizState.answers[question.id];
    if (question.multiple) return Array.isArray(val) ? val : [];
    return val ? [val] : [];
}

function isOptionSelected(question, optionId) {
    return getSelectedForQuestion(question).indexOf(optionId) !== -1;
}

function toggleOption(question, optionId) {
    if (question.multiple) {
        let selected = getSelectedForQuestion(question).slice();
        const idx = selected.indexOf(optionId);
        if (idx !== -1) selected.splice(idx, 1);
        else if (selected.length < (question.max || 3)) selected.push(optionId);
        quizState.answers[question.id] = selected;
    } else {
        quizState.answers[question.id] = optionId;
    }
}

function canProceed(question) {
    const selected = getSelectedForQuestion(question);
    return question.multiple ? selected.length > 0 : selected.length === 1;
}

function buildEntry(malId) {
    const meta = TITLE_META[String(malId)];
    if (!meta) return null;
    return Object.assign({ malId: String(malId) }, meta);
}

/** Court = film (anime) / ≤5 vol (manga) · Moyen = 8–26 ép / 6–20 vol · Long = 27+ ép / 21+ vol */
function getLengthCategory(entry) {
    if (entry.mediaType === 'anime') {
        if (entry.format === 'movie') return 'short';
        if (typeof entry.episodes === 'number') {
            if (entry.episodes <= 26) return 'medium';
            return 'long';
        }
    }
    if (entry.mediaType === 'manga') {
        if (typeof entry.volumes === 'number') {
            if (entry.volumes <= 5) return 'short';
            if (entry.volumes <= 20) return 'medium';
            return 'long';
        }
    }
    return null;
}

function matchesLengthPreference(entry, lengthChoice) {
    if (!lengthChoice) return true;
    if (entry.mediaType === 'anime' && lengthChoice === 'short') {
        return entry.format === 'movie';
    }
    const cat = getLengthCategory(entry);
    if (!cat) return false;
    return cat === lengthChoice;
}

function jikanDataMatchesLength(data, mediaType, lengthChoice) {
    if (!lengthChoice || !data) return true;
    if (mediaType === 'anime') {
        const type = String(data.type || '').toLowerCase();
        const eps = Number(data.episodes) || 0;
        if (lengthChoice === 'short') return type === 'movie';
        if (type === 'movie') return false;
        if (lengthChoice === 'medium') return eps > 0 && eps <= 26;
        if (lengthChoice === 'long') return eps >= 27;
    }
    if (mediaType === 'manga') {
        const vols = Number(data.volumes) || 0;
        if (lengthChoice === 'short') return vols > 0 && vols <= 5;
        if (lengthChoice === 'medium') return vols >= 6 && vols <= 20;
        if (lengthChoice === 'long') return vols >= 21;
    }
    return true;
}

function getUserGenres(answers) {
    const g = answers && answers.genres;
    if (!g) return [];
    if (Array.isArray(g)) return g.length ? [String(g[0])] : [];
    return [String(g)];
}

function scoreCandidate(entry, answers) {
    const userGenres = getUserGenres(answers);
    let genreMatches = 0;
    if (userGenres.length && entry.genres.indexOf(userGenres[0]) !== -1) {
        genreMatches = 1;
    }

    let score = 0;
    if (userGenres.length) {
        if (genreMatches) score += 50;
        else score -= 60;
    }

    if (answers.mood && entry.mood.indexOf(answers.mood) !== -1) score += 22;
    else if (answers.mood) score -= 48;

    const lengthCat = getLengthCategory(entry);
    if (answers.length) {
        if (lengthCat === answers.length) {
            score += 35;
            if (answers.length === 'medium' && entry.mediaType === 'anime' && typeof entry.episodes === 'number') {
                score += Math.max(0, 14 - Math.abs(entry.episodes - 12));
            }
            if (answers.length === 'medium' && entry.mediaType === 'manga' && typeof entry.volumes === 'number') {
                score += Math.max(0, 10 - Math.abs(entry.volumes - 12));
            }
        } else if (lengthCat) {
            score -= 55;
        }
    }

    if (answers.focus && entry.focus.indexOf(answers.focus) !== -1) score += 18;
    else if (answers.focus) score -= 28;

    return { score: score, genreMatches: genreMatches };
}

function rankForMedia(answers, mediaType, minGenreMatches, requireMood, requireFocus) {
    const userGenres = getUserGenres(answers);
    return Object.keys(TITLE_META)
        .map(function (id) { return buildEntry(id); })
        .filter(function (e) { return e && e.mediaType === mediaType; })
        .map(function (entry) {
            const r = scoreCandidate(entry, answers);
            return { entry: entry, score: r.score, genreMatches: r.genreMatches };
        })
        .filter(function (row) {
            if (answers.length && !matchesLengthPreference(row.entry, answers.length)) return false;
            if (requireMood && answers.mood && row.entry.mood.indexOf(answers.mood) === -1) return false;
            if (requireFocus && answers.focus && row.entry.focus.indexOf(answers.focus) === -1) return false;
            if (minGenreMatches > 0 && row.genreMatches < minGenreMatches) return false;
            if (userGenres.length && row.genreMatches < 1) return false;
            return row.score > 0;
        })
        .sort(function (a, b) {
            if (b.score !== a.score) return b.score - a.score;
            if (b.genreMatches !== a.genreMatches) return b.genreMatches - a.genreMatches;
            return a.entry.title.localeCompare(b.entry.title);
        });
}

function buildRankedPool(answers, mediaType) {
    const tiers = [
        { min: 1, mood: true, focus: true },
        { min: 1, mood: true, focus: false },
        { min: 1, mood: false, focus: true },
        { min: 1, mood: false, focus: false }
    ];

    let ranked = [];
    for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];
        ranked = rankForMedia(answers, mediaType, tier.min, tier.mood, tier.focus);
        if (ranked.length >= RESULT_COUNT) break;
    }

    return ranked.filter(function (row) {
        return matchesLengthPreference(row.entry, answers.length);
    });
}

function pickFromPool(answers, mediaType, maxCount) {
    const limit = maxCount || RESULT_COUNT;
    const ranked = buildRankedPool(answers, mediaType);
    if (!ranked.length) return [];

    const topScore = ranked[0].score;
    const elite = ranked.filter(function (row) {
        return row.score >= topScore - 12;
    });
    const pool = elite.slice(0, Math.max(DAILY_POOL_SIZE, limit));
    const userGenres = getUserGenres(answers);
    const seedKey = [
        mediaType,
        userGenres.join('+'),
        answers.mood || '',
        answers.length || '',
        answers.focus || ''
    ].join('|');

    const shuffled = seededShuffle(pool, getDailySeed(seedKey));
    return shuffled.slice(0, limit).map(function (row) { return row.entry; });
}

async function fetchJikanDetail(item) {
    const proxyUrl = new URL('/.netlify/functions/jikan-proxy', window.location.origin);
    proxyUrl.searchParams.set('action', 'detail');
    proxyUrl.searchParams.set('mediaType', item.mediaType);
    proxyUrl.searchParams.set('id', item.malId);
    let res = await fetch(proxyUrl.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) {
        res = await fetch('https://api.jikan.moe/v4/' + item.mediaType + '/' + item.malId, { headers: { Accept: 'application/json' } });
    }
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
}

async function pickValidatedRecommendations(answers) {
    const media = answers.media || 'anime';
    const specs = media === 'both'
        ? [{ mediaType: 'anime', count: 1 }, { mediaType: 'manga', count: 1 }]
        : [{ mediaType: media === 'manga' ? 'manga' : 'anime', count: RESULT_COUNT }];

    const results = [];
    for (let s = 0; s < specs.length; s++) {
        const spec = specs[s];
        const ranked = buildRankedPool(answers, spec.mediaType);
        if (!ranked.length) continue;

        const topScore = ranked[0].score;
        const minScore = topScore - 15;
        const userGenres = getUserGenres(answers);
        const seedKey = [
            spec.mediaType,
            userGenres.join('+'),
            answers.mood || '',
            answers.length || '',
            answers.focus || ''
        ].join('|');
        const elite = ranked.filter(function (row) { return row.score >= minScore; });
        const shuffled = seededShuffle(elite, getDailySeed(seedKey));

        let picked = 0;
        for (let i = 0; i < shuffled.length && picked < spec.count; i++) {
            if (i > 0) await new Promise(function (r) { setTimeout(r, 350); });
            const row = shuffled[i];
            const item = row.entry;
            if (item.mediaType !== spec.mediaType) continue;
            try {
                const data = await fetchJikanDetail(item);
                if (!data) continue;
                if (!jikanDataMatchesLength(data, spec.mediaType, answers.length)) continue;
                const cover = await resolveCoverImages(data, item);
                results.push(Object.assign({}, item, {
                    title: data?.title || item.title,
                    image: cover.image,
                    imageFallbacks: cover.imageFallbacks,
                    matchScore: row.score,
                    score: Number(data?.score) || item.score,
                    synopsis: truncateText(data?.synopsis, 140)
                }));
                picked += 1;
            } catch (e) {
                const cover = await resolveCoverImages(null, item);
                results.push(Object.assign({}, item, {
                    image: cover.image,
                    imageFallbacks: cover.imageFallbacks,
                    matchScore: row.score,
                    synopsis: ''
                }));
                picked += 1;
            }
        }
    }
    return results;
}

function pickRecommendations(answers) {
    const media = answers.media || 'anime';
    if (media === 'both') {
        const anime = pickFromPool(answers, 'anime');
        const manga = pickFromPool(answers, 'manga');
        return [anime[0], manga[0]].filter(Boolean);
    }
    return pickFromPool(answers, media === 'manga' ? 'manga' : 'anime');
}

function optionLabel(questionId, optionId) {
    const q = QUIZ_QUESTIONS.find(function (x) { return x.id === questionId; });
    if (!q) return optionId;
    const opt = q.options.find(function (o) { return o.id === optionId; });
    return opt ? tr(opt.labelKey, optionId) : optionId;
}

function buildMatchReason(item, answers) {
    const matchedGenres = getUserGenres(answers).filter(function (g) {
        return item.genres.indexOf(g) !== -1;
    }).map(function (g) { return optionLabel('genres', g); });

    const parts = matchedGenres.slice();
    if (answers.mood && item.mood.indexOf(answers.mood) !== -1) {
        parts.push(optionLabel('mood', answers.mood));
    }
    if (answers.length && getLengthCategory(item) === answers.length) {
        parts.push(optionLabel('length', answers.length));
    }
    if (answers.focus && item.focus.indexOf(answers.focus) !== -1) {
        parts.push(optionLabel('focus', answers.focus));
    }
    if (!parts.length) {
        return tr('home.rec_quiz_match_default', 'Correspond à votre profil');
    }
    return tr('home.rec_quiz_match_because', 'Choisi pour : {profile}').replace('{profile}', parts.join(' · '));
}

function truncateText(text, max) {
    const s = String(text || '').trim();
    if (s.length <= max) return s;
    return s.slice(0, max).trim() + '…';
}

function uniqueUrls(urls) {
    const out = [];
    (urls || []).forEach(function (u) {
        const url = String(u || '').trim();
        if (url && out.indexOf(url) === -1) out.push(url);
    });
    return out;
}

function isValidCoverUrl(url) {
    const u = String(url || '').trim();
    if (!u.startsWith('http')) return false;
    if (u.indexOf('questionmark') !== -1) return false;
    if (u.indexOf('apple-touch-icon') !== -1) return false;
    if (u.indexOf('/img/sp/icon/') !== -1) return false;
    return true;
}

function extractCoverUrlsFromJikan(data) {
    if (!data || !data.images) return [];
    const jpg = data.images.jpg || {};
    const webp = data.images.webp || {};
    return uniqueUrls([
        jpg.image_url,
        jpg.large_image_url,
        jpg.small_image_url,
        webp.image_url,
        webp.large_image_url,
        webp.small_image_url
    ]).filter(isValidCoverUrl);
}

async function fetchJikanPictures(item) {
    try {
        const proxyUrl = new URL('/.netlify/functions/jikan-proxy', window.location.origin);
        proxyUrl.searchParams.set('action', 'pictures');
        proxyUrl.searchParams.set('mediaType', item.mediaType);
        proxyUrl.searchParams.set('id', item.malId);
        let res = await fetch(proxyUrl.toString(), { headers: { Accept: 'application/json' } });
        if (!res.ok) {
            res = await fetch('https://api.jikan.moe/v4/' + item.mediaType + '/' + item.malId + '/pictures', { headers: { Accept: 'application/json' } });
        }
        if (!res.ok) return [];
        const json = await res.json();
        const urls = [];
        (json.data || []).forEach(function (pic) {
            if (pic.jpg?.image_url) urls.push(pic.jpg.image_url);
        });
        return uniqueUrls(urls).filter(isValidCoverUrl);
    } catch (e) {
        return [];
    }
}

async function resolveCoverImages(data, item) {
    let candidates = extractCoverUrlsFromJikan(data);
    if (!candidates.length) {
        candidates = await fetchJikanPictures(item);
    }
    const fallback = getDefaultCoverPath();
    if (!candidates.length) {
        candidates = [fallback];
    } else {
        candidates.push(fallback);
    }
    return { image: candidates[0], imageFallbacks: candidates };
}

function recPremiumImgFallback(img) {
    if (!img) return;
    let list = [];
    const encoded = img.getAttribute('data-fallbacks-encoded');
    if (encoded) {
        try {
            list = JSON.parse(decodeURIComponent(encoded));
        } catch (e) { list = []; }
    }
    if (!list.length) {
        try {
            list = JSON.parse(img.getAttribute('data-fallbacks') || '[]');
        } catch (e2) {
            list = String(img.getAttribute('data-fallbacks') || '').split('|').filter(Boolean);
        }
    }
    let idx = parseInt(img.getAttribute('data-fb-idx') || '0', 10) + 1;
    while (idx < list.length) {
        img.setAttribute('data-fb-idx', String(idx));
        img.src = list[idx];
        return;
    }
    img.onerror = null;
    img.src = getDefaultCoverPath();
}

async function enrichWithJikan(items) {
    const out = items.slice();
    for (let i = 0; i < out.length; i++) {
        const item = out[i];
        try {
            const proxyUrl = new URL('/.netlify/functions/jikan-proxy', window.location.origin);
            proxyUrl.searchParams.set('action', 'detail');
            proxyUrl.searchParams.set('mediaType', item.mediaType);
            proxyUrl.searchParams.set('id', item.malId);
            let res = await fetch(proxyUrl.toString(), { headers: { Accept: 'application/json' } });
            if (!res.ok) {
                res = await fetch('https://api.jikan.moe/v4/' + item.mediaType + '/' + item.malId, { headers: { Accept: 'application/json' } });
            }
            if (!res.ok) continue;
            const data = (await res.json()).data;
            if (!data) continue;
            out[i] = Object.assign({}, item, {
                title: data.title || item.title,
                image: data.images?.jpg?.large_image_url || data.images?.jpg?.image_url || item.image,
                score: Number(data.score) || item.score,
                synopsis: truncateText(data.synopsis, 140)
            });
        } catch (e) { /* ignore */ }
    }
    return out;
}

function renderResultCard(item, answers) {
    const typeLabel = item.mediaType === 'manga'
        ? tr('home.personalized_recs_type_manga', 'Manga')
        : tr('home.personalized_recs_type_anime', 'Anime');
    const url = getDetailUrl(item.malId, item.mediaType);
    const fallbacks = uniqueUrls((item.imageFallbacks || []).concat([item.image, getDefaultCoverPath()]));
    const img = fallbacks[0] || getDefaultCoverPath();
    const reason = buildMatchReason(item, answers);
    const synopsis = item.synopsis || '';
    const fallbacksEnc = encodeURIComponent(JSON.stringify(fallbacks));

    return (
        '<a class="rec-premium-card" href="' + escapeHtml(url) + '" role="listitem">' +
            '<div class="rec-premium-cover">' +
                '<img src="' + escapeHtml(img) + '" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer"' +
                    ' data-fallbacks-encoded="' + fallbacksEnc + '" data-fb-idx="0"' +
                    ' onerror="window.recPremiumImgFallback&&window.recPremiumImgFallback(this)">' +
                '<div class="rec-premium-cover-shade"></div>' +
                '<span class="rec-premium-type">' + escapeHtml(typeLabel) + '</span>' +
            '</div>' +
            '<div class="rec-premium-body">' +
                '<p class="rec-premium-kicker">' + escapeHtml(reason) + '</p>' +
                '<h3 class="rec-premium-title">' + escapeHtml(item.title) + '</h3>' +
                (synopsis ? '<p class="rec-premium-synopsis" data-original-text="' + escapeHtml(synopsis) + '">' + escapeHtml(synopsis) + '</p>' : '') +
                '<div class="rec-premium-footer">' +
                    (item.score ? '<span class="rec-premium-score"><i class="fas fa-star" aria-hidden="true"></i> ' + Number(item.score).toFixed(1) + '</span>' : '') +
                    '<span class="rec-premium-cta">' + escapeHtml(tr('home.rec_quiz_view', 'Voir la fiche')) + ' <i class="fas fa-arrow-right" aria-hidden="true"></i></span>' +
                '</div>' +
            '</div>' +
        '</a>'
    );
}

function renderQuizStep(container) {
    const q = QUIZ_QUESTIONS[quizState.step];
    const total = QUIZ_QUESTIONS.length;
    const progress = Math.round(((quizState.step + 1) / total) * 100);

    const optionsClass = 'rec-quiz-options' + (q.options.length > 8 ? ' rec-quiz-options--scroll' : '');

    container.innerHTML =
        '<div class="rec-quiz">' +
            '<div class="rec-quiz-progress-wrap"><div class="rec-quiz-progress-bar" style="width:' + progress + '%"></div></div>' +
            '<p class="rec-quiz-step-label">' + escapeHtml(tr('home.rec_quiz_step', 'Question {current} / {total}').replace('{current}', String(quizState.step + 1)).replace('{total}', String(total))) + '</p>' +
            '<h3 class="rec-quiz-question">' + escapeHtml(tr(q.titleKey, q.id)) + '</h3>' +
            (q.hintKey ? '<p class="rec-quiz-hint">' + escapeHtml(tr(q.hintKey, '')) + '</p>' : '') +
            (q.multiple ? '<p class="rec-quiz-multi-hint">' + escapeHtml(tr('home.rec_quiz_multi_hint', 'Choisissez jusqu\'à {max} options.').replace('{max}', String(q.max || 3))) + '</p>' : '') +
            '<div class="' + optionsClass + '">' +
                q.options.map(function (opt) {
                    const active = isOptionSelected(q, opt.id) ? ' rec-quiz-option--active' : '';
                    return '<button type="button" class="rec-quiz-option' + active + '" data-option-id="' + escapeHtml(opt.id) + '">' +
                        '<i class="fas ' + escapeHtml(opt.icon) + '" aria-hidden="true"></i>' +
                        '<span>' + escapeHtml(tr(opt.labelKey, opt.id)) + '</span></button>';
                }).join('') +
            '</div>' +
            '<div class="rec-quiz-nav">' +
                '<button type="button" class="rec-quiz-btn rec-quiz-btn--ghost" id="recQuizPrev"' + (quizState.step === 0 ? ' disabled' : '') + '>' + escapeHtml(tr('home.rec_quiz_prev', 'Précédent')) + '</button>' +
                '<button type="button" class="rec-quiz-btn rec-quiz-btn--primary" id="recQuizNext"' + (canProceed(q) ? '' : ' disabled') + '>' +
                    escapeHtml(quizState.step === total - 1 ? tr('home.rec_quiz_submit', 'Voir mes recommandations') : tr('home.rec_quiz_next', 'Suivant')) +
                '</button>' +
            '</div>' +
        '</div>';

    container.querySelectorAll('.rec-quiz-option').forEach(function (btn) {
        btn.addEventListener('click', function () {
            toggleOption(q, btn.getAttribute('data-option-id'));
            renderQuizStep(container);
        });
    });
    document.getElementById('recQuizPrev')?.addEventListener('click', function () {
        if (quizState.step > 0) { quizState.step -= 1; renderQuizStep(container); }
    });
    document.getElementById('recQuizNext')?.addEventListener('click', function () {
        if (!canProceed(q)) return;
        if (quizState.step < total - 1) { quizState.step += 1; renderQuizStep(container); }
        else submitQuiz(container);
    });
}

async function submitQuiz(container) {
    quizState.phase = 'loading';
    try { localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(quizState.answers)); } catch (e) { /* ignore */ }

    container.innerHTML = '<div class="personalized-recs-loading"><div class="loading-spinner"></div><p>' +
        escapeHtml(tr('home.rec_quiz_computing', 'Sélection de vos animes et mangas…')) + '</p></div>';

    const picks = await pickValidatedRecommendations(quizState.answers);
    if (!picks.length) {
        container.innerHTML =
            '<div class="personalized-recs-empty">' +
                '<p>' + escapeHtml(tr('home.rec_quiz_no_match', 'Aucun titre ne combine tous vos genres. Essayez une sélection un peu plus large.')) + '</p>' +
                '<button type="button" class="rec-quiz-btn rec-quiz-btn--primary" id="recQuizRestartEmpty">' +
                    escapeHtml(tr('home.rec_quiz_restart', 'Refaire le questionnaire')) +
                '</button>' +
            '</div>';
        document.getElementById('recQuizRestartEmpty')?.addEventListener('click', function () {
            resetQuizState();
            renderQuizStep(container);
        });
        return;
    }

    await renderResults(container, picks, quizState.answers);
}

async function renderResults(container, items, answers) {
    quizState.phase = 'results';
    quizState.lastItems = items;
    quizState.lastAnswers = answers;
    const introEl = document.getElementById('personalizedRecsIntro');
    if (introEl) {
        const media = answers.media || 'anime';
        if (media === 'both') {
            introEl.textContent = tr('home.rec_quiz_results_both', 'Votre anime et votre manga du jour (renouvelés chaque jour) :');
        } else if (media === 'manga') {
            introEl.textContent = tr('home.rec_quiz_results_manga', 'Vos 2 mangas du jour (renouvelés chaque jour) :');
        } else {
            introEl.textContent = tr('home.rec_quiz_results_daily', 'Vos 2 animes du jour (renouvelés chaque jour) :');
        }
    }

    container.innerHTML =
        '<div class="rec-quiz-results">' +
            '<div class="rec-premium-grid" role="list">' +
                items.map(function (item) { return renderResultCard(item, answers); }).join('') +
            '</div>' +
            '<div class="rec-quiz-results-actions">' +
                '<button type="button" class="rec-quiz-btn rec-quiz-btn--ghost" id="recQuizRestart">' +
                    escapeHtml(tr('home.rec_quiz_restart', 'Refaire le questionnaire')) +
                '</button>' +
            '</div>' +
        '</div>';

    document.getElementById('recQuizRestart')?.addEventListener('click', function () {
        resetQuizState();
        if (introEl) introEl.textContent = tr('home.personalized_recs_intro', 'Répondez à quelques questions pour découvrir des animes et mangas faits pour vous.');
        renderQuizStep(container);
    });

    await translateRecSynopses(container);
}

function renderQuiz(container) {
    resetQuizState();
    renderQuizStep(container);
}

export function loadPersonalizedRecommendations() {
    const container = document.getElementById('personalizedRecsContainer');
    if (!container || !document.getElementById('personalizedRecsSection')) return;
    renderQuiz(container);
}

function init() {
    if (!document.getElementById('personalizedRecsSection')) return;
    window.recPremiumImgFallback = recPremiumImgFallback;
    loadPersonalizedRecommendations();
    document.addEventListener('languageChanged', async function () {
        const container = document.getElementById('personalizedRecsContainer');
        if (!container) return;
        if (quizState.phase === 'quiz') renderQuizStep(container);
        else if (quizState.phase === 'results' && quizState.lastItems) {
            await renderResults(container, quizState.lastItems, quizState.lastAnswers);
        }
    });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

window.loadPersonalizedRecommendations = loadPersonalizedRecommendations;
