// acceuil.js - Version simplifiée avec seulement "À la une" et "Quiz du jour"
// Script dédié à la page d'accueil (acceuil.html)

// Importer le service social
import { getNewMembers, voteForAnime, getRecentComments } from './socialService.js';
import { supabase } from './supabase.js';
import { AuteurService } from './auteurService.js';

// Fonction de traduction qui utilise le système de localisation
function t(key) {
    if (window.localization) {
        return window.localization.get(key);
    }
    // Fallback si le système n'est pas encore chargé
    return key;
}

// Fonction pour traduire les questions du quiz avec l'API
async function translateQuizQuestion(question) {
    const currentLang = localStorage.getItem('mangaWatchLanguage') || 'fr';
    
    // Si c'est déjà en français, pas besoin de traduire
    if (currentLang === 'fr') {
        return question;
    }
    
    try {
        // Utiliser l'API de traduction automatique
        const translatedQuestion = await translateWithCache(question, currentLang);
        return translatedQuestion;
    } catch (error) {
        console.error('Erreur lors de la traduction de la question:', error);
        return question; // Retourner la question originale en cas d'erreur
    }
}

// Fonction pour traduire les choix du quiz avec l'API
async function translateQuizChoice(choice) {
    const currentLang = localStorage.getItem('mangaWatchLanguage') || 'fr';
    
    // Si c'est déjà en français, pas besoin de traduire
    if (currentLang === 'fr') {
        return choice;
    }
    
    // Liste des noms japonais qui ne doivent pas être traduits (sauf en japonais)
    const japaneseNames = [
        'Isaac Netero', 'Don Freecss', 'Zigg Zoldyck', 'Maha Zoldyck',
        'Edward Newgate', 'Portgas D. Ace', 'Marshall D. Teach', 'Rocks D. Xebec',
        'Hideki Ryuga', 'Nate River', 'Mello', 'L Lawliet',
        'King Bradley', 'Van Hohenheim', 'Scar', 'Maes Hughes',
        'Senju', 'Aburame', 'Hyuga', 'Uchiha',
        'Norman', 'Emma', 'Ray', 'Isabella', 'Ging Freecss', 'Pariston Hill', 'Silva Zoldyck'
    ];
    
    // Si c'est un nom japonais et qu'on n'est pas en japonais, on garde le nom original
    if (japaneseNames.includes(choice) && currentLang !== 'ja') {
        return choice;
    }
    
    try {
        // Utiliser l'API de traduction automatique pour les autres choix
        const translatedChoice = await translateWithCache(choice, currentLang);
        return translatedChoice;
    } catch (error) {
        console.error('Erreur lors de la traduction du choix:', error);
        return choice; // Retourner le choix original en cas d'erreur
    }
}

// Fonction pour créer une image de fallback
function createFallbackImage(itemCard, item) {
    const fallbackDiv = document.createElement('div');
    fallbackDiv.style.cssText = `
        width: 100%;
        height: 200px;
        background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
        border: 2px solid #00c45d;
        border-radius: 8px;
        margin-bottom: 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #00c45d;
        font-size: 0.9rem;
        position: relative;
        overflow: hidden;
    `;
    
    // Icône d'image
    const iconDiv = document.createElement('div');
    iconDiv.style.cssText = `
        font-size: 2rem;
        margin-bottom: 0.5rem;
        opacity: 0.7;
    `;
    iconDiv.textContent = item.type === 'anime' ? '🎬' : '📚';
    
    // Texte
    const textDiv = document.createElement('div');
    textDiv.style.cssText = `
        text-align: center;
        line-height: 1.2;
    `;
    textDiv.textContent = `${item.titre}`;
    
    fallbackDiv.appendChild(iconDiv);
    fallbackDiv.appendChild(textDiv);
    itemCard.insertBefore(fallbackDiv, itemCard.firstChild);
}

// Fonction pour mettre à jour tous les textes traduits dynamiquement
function updateDynamicTranslations() {
    // Mettre à jour le popup d'authentification s'il existe
    const popupTitle = document.querySelector('h2[style*="color: #00c45d"]');
    if (popupTitle && popupTitle.textContent.includes('MangaWatch')) {
        popupTitle.textContent = t('home.welcome_title');
        const popupSubtitle = popupTitle.nextElementSibling;
        if (popupSubtitle) {
            popupSubtitle.textContent = t('home.hero_subtitle');
        }
        // Mettre à jour les boutons
        const buttons = popupTitle.closest('div')?.querySelectorAll('button');
        if (buttons && buttons.length >= 2) {
            buttons[0].textContent = t('home.welcome_login');
            buttons[1].textContent = t('home.welcome_register');
        }
    }
    
    // Mettre à jour les titres de sections
    const quizTitle = document.querySelector('.quiz-section .section-title');
    if (quizTitle) {
        quizTitle.textContent = t('home.quiz_title');
    }
    
    const newMembersTitle = document.querySelector('.nouveaux-membres-section .section-title');
    if (newMembersTitle) {
        newMembersTitle.textContent = t('home.new_members');
    }
    
    // Mettre à jour les boutons de vote
    document.querySelectorAll('.vote-button').forEach(btn => {
        if (btn.textContent.includes('Voter') || btn.textContent.includes('Vote')) {
            btn.textContent = t('home.vote_button');
        }
    });
    
    // Mettre à jour les titres de vote
    const voteTitle = document.querySelector('.vote-section .section-title');
    if (voteTitle) {
        const isAnimeDay = new Date().getDate() % 2 === 0;
        voteTitle.textContent = t(isAnimeDay ? 'home.vote_title' : 'home.vote_title_manga');
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Bienvenue sur la page d\'accueil !');
    
    // Écouter les changements de langue
    document.addEventListener('languageChanged', function() {
        console.log('🔄 Langue changée, mise à jour des traductions...');
        updateDynamicTranslations();
    });

    // --- CORRECTION : la logique du pop-up ne bloque plus le reste du script ---
    let afficherPopup = true;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev') === '1' || localStorage.getItem('mangawatch_dev') === '1') {
        afficherPopup = false;
    }
    if (localStorage.getItem('mangawatch_connected') === '1') {
        afficherPopup = false;
    }

    // --- POP-UP CONNEXION/INSCRIPTION AU PREMIER ACCÈS ---
    function showAuthPopup() {
        // Fond semi-transparent
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0,0,0,0.65)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.animation = 'fadeInOverlay 0.5s';

        // Animation CSS globale (injection)
        if (!document.getElementById('auth-popup-animations')) {
            const style = document.createElement('style');
            style.id = 'auth-popup-animations';
            style.textContent = `
            @keyframes fadeInOverlay {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes zoomInPop {
                from { opacity: 0; transform: scale(0.85); }
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes fadeInContinentImg {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
            }
            .auth-anim-input:focus {
                box-shadow: 0 0 0 3px #00c45d88;
                transform: translateY(-2px) scale(1.03);
                transition: box-shadow 0.2s, transform 0.2s;
            }
            .auth-anim-btn {
                transition: box-shadow 0.18s, transform 0.18s, background 0.18s;
            }
            .auth-anim-btn:hover {
                box-shadow: 0 4px 18px #00c45d55, 0 2px 8px #0002;
                background: #00e06d;
                transform: translateY(-2px) scale(1.04);
            }
            .auth-anim-label {
                transition: text-shadow 0.18s, color 0.18s;
            }
            .auth-anim-label:hover {
                text-shadow: 0 0 8px #00ffb0, 0 0 2px #00c45d;
                color: #00ffb0;
                animation: pulseLabel 0.7s;
            }
            @keyframes pulseLabel {
                0% { color: #00c45d; }
                50% { color: #00ffb0; }
                100% { color: #00c45d; }
            }
            .auth-anim-img {
                animation: fadeInContinentImg 0.4s;
            }
            `;
            document.head.appendChild(style);
        }

        // Pop-up principal
        const popup = document.createElement('div');
        popup.style.background = '#222';
        popup.style.borderRadius = '24px';
        popup.style.boxShadow = '0 8px 32px rgba(0,0,0,0.45)';
        popup.style.padding = '3.5rem 3rem 2.5rem 3rem';
        popup.style.display = 'flex';
        popup.style.flexDirection = 'column';
        popup.style.alignItems = 'center';
        popup.style.maxWidth = '520px';
        popup.style.width = '95vw';
        popup.style.minHeight = '340px';
        popup.style.animation = 'zoomInPop 0.5s';

        // Contenu du pop-up
        popup.innerHTML = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <h2 style="color: #00c45d; font-size: 2rem; margin: 0 0 1rem 0; font-weight: 700;">${t('home.welcome_title')}</h2>
                <p style="color: #ccc; font-size: 1.1rem; line-height: 1.5; margin: 0;">${t('home.hero_subtitle')}</p>
            </div>
            
            <div style="display: flex; gap: 1rem; width: 100%;">
                <button class="auth-anim-btn" onclick="window.location.href='connexion.html'" style="flex: 1; background: #00c45d; color: white; border: none; padding: 1rem; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                    ${t('home.welcome_login')}
                </button>
                <button class="auth-anim-btn" onclick="window.location.href='inscription.html'" style="flex: 1; background: transparent; color: #00c45d; border: 2px solid #00c45d; padding: 1rem; border-radius: 12px; font-size: 1rem; font-weight: 600; cursor: pointer;">
                    ${t('home.welcome_register')}
                </button>
            </div>
            
            <button onclick="closeAuthPopup()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #666; font-size: 1.5rem; cursor: pointer; padding: 0.5rem;">×</button>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Marquer comme connecté pour éviter de re-afficher
        localStorage.setItem('mangawatch_connected', '1');
    }

    // Fonction pour fermer le pop-up
    window.closeAuthPopup = function() {
        const overlay = document.querySelector('div[style*="position: fixed"]');
        if (overlay) {
                overlay.remove();
        }
    };

    // Afficher le pop-up si nécessaire
    if (afficherPopup) {
        setTimeout(showAuthPopup, 1000);
    }

    // --- SECTION AUTEUR DE MANGAS (À LA UNE) ---
    // Après la section "Pourquoi choisir MangaWatch ?"
    const refSection = document.querySelector('.section');
    console.log('🔍 refSection trouvée:', !!refSection);
    
    let auteurSection = null;
    let currentAuteur = null;
    let auteurService = null;
    
    // Fonction pour créer/mettre à jour la section auteur
    async function createOrUpdateAuteurSection() {
        console.log('📚 Début de createOrUpdateAuteurSection()');
        
        if (!auteurService) {
            console.log('📚 Création du service auteur...');
            auteurService = new AuteurService();
        }
        
        if (!currentAuteur) {
            console.log('📚 Récupération de l\'auteur de la semaine...');
            currentAuteur = auteurService.getAuteurDeLaSemaine();
            console.log('📚 Auteur récupéré:', currentAuteur.nom);
        }
        
        // Si la section existe déjà, la supprimer
        const existingSection = document.querySelector('.auteur-section');
        if (existingSection) {
            console.log('📚 Suppression de l\'ancienne section auteur...');
            existingSection.remove();
        }
        
        // Créer la section auteur avec le nouveau service (async)
        console.log('📚 Création de la section auteur avec traduction...');
        auteurSection = await auteurService.createAuteurSection(currentAuteur);
        console.log('✅ Section auteur créée avec succès');
        
        // Insérer la section après la section de référence
        if (refSection && refSection.parentNode) {
            refSection.parentNode.insertBefore(auteurSection, refSection.nextSibling);
            console.log('✅ Section auteur insérée dans le DOM');
        } else {
            console.error('❌ Impossible d\'insérer la section auteur: refSection ou parentNode manquant');
        }
    }
    
    if (refSection) {
        console.log('✅ refSection trouvée, création de la section auteur dans 500ms...');
        // Attendre un peu pour s'assurer que localization.js est chargé
        setTimeout(async () => {
            console.log('📚 Création de la section auteur...');
            const langBefore = localStorage.getItem('mangaWatchLanguage');
            console.log(`🌍 Langue avant création: ${langBefore}`);
            await createOrUpdateAuteurSection();
        }, 500);
        
        // Écouter les changements de langue pour retraduire la section auteur
        document.addEventListener('languageChanged', async function() {
            console.log('🔄 Langue changée, retraduction de la section auteur...');
            // Réinitialiser l'auteur pour forcer la retraduction
            currentAuteur = null;
            await createOrUpdateAuteurSection();
        });
        
        // Écouter aussi l'événement translationsApplied
        document.addEventListener('translationsApplied', async function(event) {
            console.log('🔄 Traductions appliquées, vérification de la section auteur...', event.detail);
            const currentLang = localStorage.getItem('mangaWatchLanguage') || 'fr';
            console.log(`🌍 Langue actuelle: ${currentLang}`);
            if (currentLang !== 'fr') {
                // Réinitialiser l'auteur pour forcer la retraduction
                currentAuteur = null;
                await createOrUpdateAuteurSection();
            }
        });
    }

    // --- CRÉATION DE LA SECTION "QUIZ DU JOUR" ---
    const quizSection = document.createElement('section');
    quizSection.className = 'section quiz-section';
    quizSection.style.marginTop = '2rem';
    quizSection.innerHTML = `
        <h2 class="section-title" data-i18n="home.quiz_title">Quiz du jour</h2>
        <div class="quiz-container">
            <div class="quiz-card" id="quizCard">
                <!-- Le contenu du quiz sera chargé dynamiquement -->
            </div>
        </div>
    `;

    // --- SECTION NOUVEAUX MEMBRES ---
    const nouveauxMembresSection = document.createElement('section');
    nouveauxMembresSection.className = 'section nouveaux-membres-section';
    nouveauxMembresSection.style.cssText = `
        margin-top: 2rem;
        margin-bottom: 2rem;
    `;

    const nouveauxMembresTitle = document.createElement('h2');
    nouveauxMembresTitle.className = 'section-title';
    nouveauxMembresTitle.style.cssText = `
        color: #00c45d;
        font-size: 2rem;
        margin-bottom: 1.5rem;
        text-align: center;
        position: relative;
    `;
    nouveauxMembresTitle.setAttribute('data-i18n', 'home.new_members');
    nouveauxMembresTitle.textContent = t('home.new_members');

    // Ligne décorative sous le titre
    const titleLine = document.createElement('div');
    titleLine.style.cssText = `
        width: 100px;
        height: 2px;
        background: #00c45d;
        margin: 0 auto 2rem auto;
    `;

    const nouveauxMembresContainer = document.createElement('div');
    nouveauxMembresContainer.style.cssText = `
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
    `;

    const nouveauxMembresGrid = document.createElement('div');
    nouveauxMembresGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        max-width: 800px;
        margin: 0 auto;
    `;

    // Liste des faux membres avec images de personnages de manga du dossier images
    const fauxMembres = [
        { pseudo: 'OtakuSensei', avatar: '' }, // Kakashi (Naruto)
        { pseudo: 'MangaQueen', avatar: '' }, // Mikasa (Attack on Titan)
        { pseudo: 'ShonenKing', avatar: '' }, // Luffy (One Piece)
        { pseudo: 'AnimeAddict', avatar: '' }, // Sailor Moon
        { pseudo: 'KawaiiNeko', avatar: '' }, // Punpun (Oyasumi Punpun)
        { pseudo: 'Senpai42', avatar: '' }  // Saitama (One Punch Man)
    ];

    // Créer les cartes de membres
    fauxMembres.forEach(membre => {
        const membreCard = document.createElement('div');
        membreCard.style.cssText = `
            background: #2a2a2a;
            border: 1px solid #00c45d;
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        `;

        // Effet de glow au hover
        membreCard.addEventListener('mouseenter', () => {
            membreCard.style.boxShadow = '0 0 20px rgba(0, 196, 93, 0.3)';
            membreCard.style.transform = 'translateY(-5px)';
        });

        membreCard.addEventListener('mouseleave', () => {
            membreCard.style.boxShadow = 'none';
            membreCard.style.transform = 'translateY(0)';
        });

        // Avatar avec image de personnage
        const avatarPlaceholder = document.createElement('div');
        avatarPlaceholder.style.cssText = `
            width: 120px;
            height: 120px;
            border: 3px solid #00c45d;
            border-radius: 50%;
            margin: 0 auto 1.5rem auto;
            background: #1a1a1a;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 196, 93, 0.2);
        `;

        // Image du personnage
        const avatarImage = document.createElement('img');
        avatarImage.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
            transition: transform 0.3s ease;
        `;
        avatarImage.src = membre.avatar;
        avatarImage.alt = `${t('common.avatar_of')} ${membre.pseudo}`;

        // Effet de zoom au hover sur l'image
        avatarPlaceholder.addEventListener('mouseenter', () => {
            avatarImage.style.transform = 'scale(1.1)';
        });
        avatarPlaceholder.addEventListener('mouseleave', () => {
            avatarImage.style.transform = 'scale(1)';
        });

        // Fallback en cas d'erreur de chargement d'image
        avatarImage.onerror = function() {
            this.onerror = null;
            this.src = '';
        };

        // Nom d'utilisateur
        const username = document.createElement('h3');
        username.style.cssText = `
            color: #00c45d;
            font-size: 1.1rem;
            margin: 0;
            font-weight: 600;
        `;
        username.textContent = membre.pseudo;

        // Assembler la carte
        avatarPlaceholder.appendChild(avatarImage);
        membreCard.appendChild(avatarPlaceholder);
        membreCard.appendChild(username);
        nouveauxMembresGrid.appendChild(membreCard);
    });

    // Assembler la section
    nouveauxMembresSection.appendChild(nouveauxMembresTitle);
    nouveauxMembresSection.appendChild(titleLine);
    nouveauxMembresSection.appendChild(nouveauxMembresContainer);
    nouveauxMembresContainer.appendChild(nouveauxMembresGrid);

    // Insérer la section nouveaux membres après la section auteur
    // Attendre que auteurSection soit créée (elle est créée de manière asynchrone)
    setTimeout(() => {
        const auteurSectionElement = document.querySelector('.auteur-section');
        if (auteurSectionElement) {
            auteurSectionElement.parentNode.insertBefore(nouveauxMembresSection, auteurSectionElement.nextSibling);
        }
    }, 1000);

    // --- SECTION VOTE DU JOUR ---
    const voteSection = document.createElement('section');
    voteSection.className = 'section vote-section';
    voteSection.style.cssText = `
        margin-top: 2rem;
        margin-bottom: 2rem;
    `;

    const voteTitle = document.createElement('h2');
    voteTitle.className = 'section-title';
    voteTitle.style.cssText = `
        color: #00c45d;
        font-size: 2rem;
        margin-bottom: 1rem;
        text-align: center;
        position: relative;
    `;

    // Déterminer le type du jour (anime ou manga) et le titre
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const isAnimeDay = dayOfYear % 2 === 0; // Alternance anime/manga
    const typeDuJour = isAnimeDay ? 'anime' : 'manga';
    const typeDuJourCapitalized = isAnimeDay ? 'Anime' : 'Manga';
    
    voteTitle.setAttribute('data-i18n', isAnimeDay ? 'home.vote_title' : 'home.vote_title_manga');
    voteTitle.textContent = t(isAnimeDay ? 'home.vote_title' : 'home.vote_title_manga');

    // Indicateur du type du jour
    const typeIndicator = document.createElement('div');
    typeIndicator.style.cssText = `
        background: ${isAnimeDay ? '#ff6b6b' : '#4ecdc4'};
        color: #fff;
        padding: 0.5rem 1.5rem;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 600;
        display: inline-block;
        margin: 0 auto 1.5rem auto;
        text-align: center;
    `;
    typeIndicator.setAttribute('data-i18n', isAnimeDay ? 'home.vote_type_anime' : 'home.vote_type_manga');
    typeIndicator.textContent = t(isAnimeDay ? 'home.vote_type_anime' : 'home.vote_type_manga');

    // Ligne décorative sous le titre
    const voteTitleLine = document.createElement('div');
    voteTitleLine.style.cssText = `
        width: 100px;
        height: 2px;
        background: #00c45d;
        margin: 0 auto 2rem auto;
    `;

    const voteContainer = document.createElement('div');
    voteContainer.style.cssText = `
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 1rem;
    `;

    const voteGrid = document.createElement('div');
    voteGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
        max-width: 1000px;
        margin: 0 auto;
    `;

    // Fonction pour charger les données depuis l'API
    async function loadVoteData() {
        // Forcer l'utilisation des données de fallback pour tester
        const forceFallback = false;
        
        if (forceFallback) {
            console.log('🔄 Forçage de l\'utilisation des données de fallback pour test');
            const today = new Date();
            const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
            const startIndex = (dayOfYear * 3) % 12;
            
            if (isAnimeDay) {
                console.log('🔄 Utilisation des données de fallback (anime)');
                const fallbackAnimes = [
                    {
                        id: 'anime-fallback-1',
                        titre: 'Attack on Titan',
                        image: '',
                        genres: ['Action', 'Aventure', 'Drame'],
                        description: 'L\'humanité lutte pour sa survie contre des titans géants.',
                        type: 'anime',
                        votes: 0
                    },
                    {
                        id: 'anime-fallback-2',
                        titre: 'Death Note',
                        image: '',
                        genres: ['Mystère', 'Psychologique', 'Thriller'],
                        description: 'Light Yagami trouve un carnet qui peut tuer quiconque.',
                        type: 'anime',
                        votes: 0
                    },
                    {
                        id: 'anime-fallback-3',
                        titre: 'One Punch Man',
                        image: '',
                        genres: ['Action', 'Comédie', 'Super Pouvoir'],
                        description: 'Saitama, le héros le plus puissant, s\'ennuie de sa force.',
                        type: 'anime',
                        votes: 0
                    }
                ];
                return [
                    fallbackAnimes[startIndex % 3],
                    fallbackAnimes[(startIndex + 1) % 3],
                    fallbackAnimes[(startIndex + 2) % 3]
                ];
            } else {
                console.log('🔄 Utilisation des données de fallback (manga)');
                const fallbackMangas = [
                    {
                        id: 'manga-fallback-1',
                        titre: 'One Piece',
                        image: '',
                        genres: ['Action', 'Aventure', 'Comédie'],
                        description: 'L\'équipage de Luffy part à la recherche du One Piece.',
                        type: 'manga',
                        votes: 0
                    },
                    {
                        id: 'manga-fallback-2',
                        titre: 'Naruto',
                        image: '',
                        genres: ['Action', 'Aventure', 'Fantastique'],
                        description: 'Naruto Uzumaki rêve de devenir Hokage de son village.',
                        type: 'manga',
                        votes: 0
                    },
                    {
                        id: 'manga-fallback-3',
                        titre: 'Sailor Moon',
                        image: '',
                        genres: ['Magical Girl', 'Romance', 'Action'],
                        description: 'Usagi devient Sailor Moon pour protéger la Terre.',
                        type: 'manga',
                        votes: 0
                    }
                ];
                return [
                    fallbackMangas[startIndex % 3],
                    fallbackMangas[(startIndex + 1) % 3],
                    fallbackMangas[(startIndex + 2) % 3]
                ];
            }
        }
        
        try {
            const apiBaseUrl = 'https://api.jikan.moe/v4';
            let voteData = [];

            if (isAnimeDay) {
                // Charger plus d'animes populaires pour plus de variété
                const response = await fetch(`${apiBaseUrl}/top/anime?limit=100`);
                const data = await response.json();
                const topAnimes = data.data;
                
                // Sélectionner 3 animes basés sur la date du jour (pas aléatoire)
                const today = new Date();
                const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
                const startIndex = (dayOfYear * 3) % topAnimes.length;
                
                const selectedAnimes = [];
                for (let i = 0; i < 3; i++) {
                    const index = (startIndex + i) % topAnimes.length;
                    selectedAnimes.push(topAnimes[index]);
                }
                
                voteData = selectedAnimes.map((anime, index) => {
                    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || anime.images?.webp?.large_image_url || anime.images?.webp?.image_url;
                    console.log(`🎬 Image pour ${anime.title}:`, imageUrl);
                    
                    return {
                        id: `anime-${anime.mal_id}`,
                        titre: anime.title,
                        image: imageUrl,
                        genres: anime.genres.slice(0, 3).map(g => g.name),
                        description: anime.synopsis ? anime.synopsis.substring(0, 100) + '...' : t('common.description_unavailable'),
                        type: 'anime',
                        mal_id: anime.mal_id,
                        votes: 0
                    };
                });
            } else {
                // Charger plus de mangas populaires pour plus de variété
                const response = await fetch(`${apiBaseUrl}/top/manga?limit=100`);
                const data = await response.json();
                const topMangas = data.data;
                
                // Sélectionner 3 mangas basés sur la date du jour (pas aléatoire)
                const today = new Date();
                const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
                const startIndex = (dayOfYear * 3) % topMangas.length;
                
                const selectedMangas = [];
                for (let i = 0; i < 3; i++) {
                    const index = (startIndex + i) % topMangas.length;
                    selectedMangas.push(topMangas[index]);
                }
                
                voteData = selectedMangas.map((manga, index) => {
                    const imageUrl = manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url || manga.images?.webp?.large_image_url || manga.images?.webp?.image_url;
                    console.log(`📚 Image pour ${manga.title}:`, imageUrl);
                    
                    return {
                        id: `manga-${manga.mal_id}`,
                        titre: manga.title,
                        image: imageUrl,
                        genres: manga.genres.slice(0, 3).map(g => g.name),
                        description: manga.synopsis ? manga.synopsis.substring(0, 100) + '...' : 'Description non disponible.',
                        type: 'manga',
                        mal_id: manga.mal_id,
                        votes: 0
                    };
                });
            }
            
            console.log('✅ Données récupérées depuis l\'API:', voteData);
            return voteData;
        } catch (error) {
            console.error('❌ Erreur lors du chargement des données de vote:', error);
            
            // Fallback avec données statiques - sélection basée sur la date
            const today = new Date();
            const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
            const startIndex = (dayOfYear * 3) % 12; // 12 éléments dans chaque fallback
            
            if (isAnimeDay) {
                const fallbackAnimes = [
                    {
                        id: 'anime-fallback-1',
                        titre: 'Attack on Titan',
                        image: '',
                        genres: ['Action', 'Aventure', 'Drame'],
                        description: 'L\'humanité lutte pour sa survie contre des titans géants.',
                        type: 'anime',
                        votes: 0
                    },
                    {
                        id: 'anime-fallback-2',
                        titre: 'Death Note',
                        image: '',
                        genres: ['Mystère', 'Psychologique', 'Thriller'],
                        description: 'Light Yagami trouve un carnet qui peut tuer quiconque.',
                        type: 'anime',
                        votes: 0
                    },
                    {
                        id: 'anime-fallback-3',
                        titre: 'One Punch Man',
                        image: '',
                        genres: ['Action', 'Comédie', 'Super Pouvoir'],
                        description: 'Saitama, le héros le plus puissant, s\'ennuie de sa force.',
                        type: 'anime',
                        votes: 0
                    },
                    {
                        id: 'anime-fallback-4',
                        titre: 'One Piece',
                        image: '',
                        genres: ['Action', 'Aventure', 'Comédie'],
                        description: 'L\'équipage de Luffy part à la recherche du One Piece.',
                        type: 'anime',
                        votes: 0
                    },
                    {
                        id: 'anime-fallback-5',
                        titre: 'Naruto',
                        image: '',
                        genres: ['Action', 'Aventure', 'Fantastique'],
                        description: 'Naruto Uzumaki rêve de devenir Hokage de son village.',
                        type: 'anime',
                        votes: 0
                    },
                    {
                        id: 'anime-fallback-6',
                        titre: 'Sailor Moon',
                        image: '',
                        genres: ['Magical Girl', 'Romance', 'Action'],
                        description: 'Usagi devient Sailor Moon pour protéger la Terre.',
                        type: 'anime',
                        votes: 0
                    },
                    {
                        id: 'anime-fallback-7',
                        titre: 'Death Note',
                        image: 'https://cdn.myanimelist.net/images/anime/9/9453l.jpg',
                        genres: ['Mystère', 'Psychologique', 'Thriller'],
                        description: 'Light Yagami trouve un carnet qui peut tuer quiconque.',
                        type: 'anime',
                        votes: 0
                    },
                    {
                        id: 'anime-fallback-8',
                        titre: 'Fullmetal Alchemist: Brotherhood',
                        image: 'https://cdn.myanimelist.net/images/anime/1223/96541l.jpg',
                        genres: ['Action', 'Aventure', 'Drame'],
                        description: 'Les frères Elric cherchent la pierre philosophale.',
                        type: 'anime',
                        votes: 0
                    },
                    {
                        id: 'anime-fallback-9',
                        titre: 'Hunter x Hunter (2011)',
                        image: 'https://cdn.myanimelist.net/images/anime/11/73674l.jpg',
                        genres: ['Action', 'Aventure', 'Fantastique'],
                        description: 'Gon part à l\'aventure pour devenir un Hunter.',
                        type: 'anime',
                        votes: 0
                    },
                    {
                        id: 'anime-fallback-10',
                        titre: 'Bleach',
                        image: 'https://cdn.myanimelist.net/images/anime/3/40451l.jpg',
                        genres: ['Action', 'Aventure', 'Fantastique'],
                        description: 'Ichigo Kurosaki devient un Shinigami pour protéger les humains.',
                        type: 'anime',
                        votes: 0
                    },
                    {
                        id: 'anime-fallback-11',
                        titre: 'Tokyo Revengers',
                        image: 'https://cdn.myanimelist.net/images/anime/1245/106576l.jpg',
                        genres: ['Action', 'Aventure', 'Comédie'],
                        description: 'Takemichi Hanagaki revient 12 ans dans le passé pour sauver Hinata Tachibana.',
                        type: 'anime',
                        votes: 0
                    },
                    {
                        id: 'anime-fallback-12',
                        titre: 'Jujutsu Kaisen',
                        image: 'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg',
                        genres: ['Action', 'Fantastique', 'Horreur'],
                        description: 'Yuji Itadori devient exorciste pour combattre les fléaux.',
                        type: 'anime',
                        votes: 0
                    }
                ];
                
                console.log('🔄 Utilisation des données de fallback (anime)');
                return [
                    fallbackAnimes[startIndex],
                    fallbackAnimes[(startIndex + 1) % 12],
                    fallbackAnimes[(startIndex + 2) % 12]
                ];
            } else {
                console.log('🔄 Utilisation des données de fallback (manga)');
                const fallbackMangas = [
                    {
                        id: 'manga-fallback-1',
                        titre: 'One Piece',
                        image: '',
                        genres: ['Action', 'Aventure', 'Comédie'],
                        description: 'L\'équipage de Luffy part à la recherche du One Piece.',
                        type: 'manga',
                        votes: 0
                    },
                    {
                        id: 'manga-fallback-2',
                        titre: 'Naruto',
                        image: '',
                        genres: ['Action', 'Aventure', 'Fantastique'],
                        description: 'Naruto Uzumaki rêve de devenir Hokage de son village.',
                        type: 'manga',
                        votes: 0
                    },
                    {
                        id: 'manga-fallback-3',
                        titre: 'Sailor Moon',
                        image: '',
                        genres: ['Magical Girl', 'Romance', 'Action'],
                        description: 'Usagi devient Sailor Moon pour protéger la Terre.',
                        type: 'manga',
                        votes: 0
                    },
                    {
                        id: 'manga-fallback-4',
                        titre: 'Death Note',
                        image: 'https://cdn.myanimelist.net/images/manga/8/73245l.jpg',
                        genres: ['Mystère', 'Psychologique', 'Thriller'],
                        description: 'Light Yagami trouve un carnet qui peut tuer quiconque.',
                        type: 'manga',
                        votes: 0
                    },
                    {
                        id: 'manga-fallback-5',
                        titre: 'Attack on Titan',
                        image: 'https://cdn.myanimelist.net/images/manga/10/73245l.jpg',
                        genres: ['Action', 'Aventure', 'Drame'],
                        description: 'L\'humanité lutte pour sa survie contre des titans géants.',
                        type: 'manga',
                        votes: 0
                    },
                    {
                        id: 'manga-fallback-6',
                        titre: 'Demon Slayer',
                        image: 'https://cdn.myanimelist.net/images/manga/1286/99889l.jpg',
                        genres: ['Action', 'Fantastique', 'Horreur'],
                        description: 'Tanjiro devient un chasseur de démons pour sauver sa sœur.',
                        type: 'manga',
                        votes: 0
                    },
                    {
                        id: 'manga-fallback-7',
                        titre: 'My Hero Academia',
                        image: 'https://cdn.myanimelist.net/images/manga/10/78745l.jpg',
                        genres: ['Action', 'Comédie', 'Super Pouvoir'],
                        description: 'Izuku Midoriya rêve de devenir un héros malgré son absence de pouvoir.',
                        type: 'manga',
                        votes: 0
                    },
                    {
                        id: 'manga-fallback-8',
                        titre: 'Fullmetal Alchemist',
                        image: 'https://cdn.myanimelist.net/images/manga/25/73245l.jpg',
                        genres: ['Action', 'Aventure', 'Drame'],
                        description: 'Les frères Elric cherchent la pierre philosophale.',
                        type: 'manga',
                        votes: 0
                    },
                    {
                        id: 'manga-fallback-9',
                        titre: 'Hunter x Hunter',
                        image: 'https://cdn.myanimelist.net/images/manga/11/73245l.jpg',
                        genres: ['Action', 'Aventure', 'Fantastique'],
                        description: 'Gon part à l\'aventure pour devenir un Hunter.',
                        type: 'manga',
                        votes: 0
                    },
                    {
                        id: 'manga-fallback-10',
                        titre: 'Bleach',
                        image: 'https://cdn.myanimelist.net/images/manga/12/73245l.jpg',
                        genres: ['Action', 'Aventure', 'Fantastique'],
                        description: 'Ichigo Kurosaki devient un Shinigami pour protéger les humains.',
                        type: 'manga',
                        votes: 0
                    },
                    {
                        id: 'manga-fallback-11',
                        titre: 'Berserk',
                        image: 'https://cdn.myanimelist.net/images/manga/13/73245l.jpg',
                        genres: ['Action', 'Aventure', 'Horreur'],
                        description: 'Guts, un mercenaire, est un guerrier qui porte une épée géante.',
                        type: 'manga',
                        votes: 0
                    },
                    {
                        id: 'manga-fallback-12',
                        titre: 'Vinland Saga',
                        image: 'https://cdn.myanimelist.net/images/manga/14/73245l.jpg',
                        genres: ['Action', 'Aventure', 'Drame'],
                        description: 'Thorfinn, un jeune guerrier, part à la recherche de son père.',
                        type: 'manga',
                        votes: 0
                    }
                ];
                
                return [
                    fallbackMangas[startIndex],
                    fallbackMangas[(startIndex + 1) % 12],
                    fallbackMangas[(startIndex + 2) % 12]
                ];
            }
        }
    }

    // Fonction pour créer les cartes de vote
    async function createVoteCards() {
        const animesVote = await loadVoteData();

        // Charger les votes existants depuis localStorage
        const votesKey = `vote_du_jour_${typeDuJour}_${new Date().toDateString()}`;
        const votesExistants = JSON.parse(localStorage.getItem(votesKey) || '{}');
        const userVoteKey = `user_vote_${typeDuJour}_${new Date().toDateString()}`;
        const userVote = localStorage.getItem(userVoteKey);

        // Initialiser les votes
        animesVote.forEach(item => {
            item.votes = votesExistants[item.id] || 0;
        });

        // Créer les cartes de vote
        for (const item of animesVote) {
            // Traduire la description et les genres automatiquement
            const currentLang = localStorage.getItem('mangaWatchLanguage') || 'fr';
            let translatedDescription = item.description;
            let translatedGenres = [...item.genres];
            
            if (currentLang !== 'fr') {
                try {
                    // Traduire la description
                    translatedDescription = await translateWithCache(item.description, currentLang);
                    
                    // Traduire les genres en parallèle
                    translatedGenres = await Promise.all(
                        item.genres.map(genre => translateWithCache(genre, currentLang))
                    );
                } catch (error) {
                    console.error('Erreur lors de la traduction:', error);
                    translatedDescription = item.description;
                    translatedGenres = [...item.genres];
                }
            }

            const itemCard = document.createElement('div');
            itemCard.style.cssText = `
                background: #2a2a2a;
                border: 1px solid #00c45d;
                border-radius: 12px;
                padding: 1.5rem;
                text-align: center;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            `;

            // Effet de glow au hover
            itemCard.addEventListener('mouseenter', () => {
                itemCard.style.boxShadow = '0 0 20px rgba(0, 196, 93, 0.3)';
                itemCard.style.transform = 'translateY(-5px)';
            });

            itemCard.addEventListener('mouseleave', () => {
                itemCard.style.boxShadow = 'none';
                itemCard.style.transform = 'translateY(0)';
            });

            // Image de l'anime/manga
            const itemImage = document.createElement('img');
            itemImage.style.cssText = `
                width: 100%;
                height: 200px;
                object-fit: cover;
                border-radius: 8px;
                margin-bottom: 1rem;
                border: 2px solid #444;
                transition: transform 0.3s ease;
            `;
            console.log(`🖼️ Chargement de l'image pour ${item.titre}:`, item.image);
            
            // Vérifier si l'image existe
            if (!item.image) {
                console.log(`⚠️ Pas d'image pour ${item.titre}, utilisation du fallback`);
                createFallbackImage(itemCard, item);
            } else {
                console.log(`🖼️ Tentative de chargement de l'image: ${item.image}`);
                itemImage.src = item.image;
                
                // Ajouter un timeout pour détecter si l'image ne charge pas
                setTimeout(() => {
                    if (itemImage.naturalWidth === 0) {
                        console.log(`⏰ Timeout - Image non chargée pour ${item.titre}`);
                        itemImage.style.display = 'none';
                        this.createFallbackImage(itemCard, item);
                    }
                }, 3000);
            }
            itemImage.alt = `${t('common.poster_of')} ${item.titre}`;

            // Effet de zoom au hover
            itemImage.addEventListener('mouseenter', () => {
                itemImage.style.transform = 'scale(1.05)';
            });
            itemImage.addEventListener('mouseleave', () => {
                itemImage.style.transform = 'scale(1)';
            });

            // Gestion du succès de chargement
            itemImage.onload = function() {
                console.log(`✅ Image chargée avec succès pour ${item.titre}`);
            };

            // Fallback amélioré pour l'image
            itemImage.onerror = function() {
                console.log(`❌ Erreur de chargement de l'image pour ${item.titre}:`, item.image);
                this.style.display = 'none';
                createFallbackImage(itemCard, item);
            };

            // Titre de l'anime/manga (cliquable)
            const itemTitle = document.createElement('h3');
            itemTitle.style.cssText = `
                color: #00c45d;
                font-size: 1.3rem;
                margin-bottom: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: color 0.3s ease;
            `;
            itemTitle.textContent = item.titre;
            
            // Effet hover pour le titre
            itemTitle.addEventListener('mouseenter', () => {
                itemTitle.style.color = '#00ff7f';
            });
            itemTitle.addEventListener('mouseleave', () => {
                itemTitle.style.color = '#00c45d';
            });
            
            // Redirection vers la page de détails
            itemTitle.addEventListener('click', () => {
                // Utiliser directement le mal_id s'il est disponible
                let malId = item.mal_id;
                if (!malId && item.id.includes('-')) {
                    malId = item.id.split('-')[1]; // Fallback : extraire l'ID après le tiret
                }
                
                if (malId) {
                    const itemType = item.type || 'anime';
                    window.location.href = `anime-details.html?id=${malId}&type=${itemType}`;
                } else {
                    console.error('Impossible de trouver l\'ID MAL pour:', item.titre);
                    // Fallback vers le catalogue avec recherche
                    window.location.href = `manga-database.html?search=${encodeURIComponent(item.titre)}`;
                }
            });

            // Tags de genres
            const genresContainer = document.createElement('div');
            genresContainer.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                justify-content: center;
                margin-bottom: 1rem;
            `;

            translatedGenres.forEach(genre => {
                const genreTag = document.createElement('span');
                genreTag.style.cssText = `
                    background: #00c45d;
                    color: #000;
                    padding: 0.3rem 0.8rem;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 500;
                `;
                genreTag.textContent = genre;
                genresContainer.appendChild(genreTag);
            });

            // Description
            const itemDescription = document.createElement('p');
            itemDescription.style.cssText = `
                color: #e0e0e0;
                font-size: 0.9rem;
                line-height: 1.4;
                margin-bottom: 1.5rem;
                min-height: 40px;
            `;
            
            // Utiliser la description traduite
            itemDescription.textContent = translatedDescription;

            // Bouton de vote
            const voteButton = document.createElement('button');
            voteButton.style.cssText = `
                background: #00c45d;
                color: #000;
                border: none;
                padding: 0.8rem 2rem;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                width: 100%;
            `;
            voteButton.textContent = t('home.vote_button');

            // Vérifier si l'utilisateur a déjà voté
            const hasVoted = userVote !== null;
            const hasVotedForThis = userVote === item.id;

            if (hasVoted) {
                if (hasVotedForThis) {
                    voteButton.style.background = '#00c45d';
                    voteButton.textContent = t('home.vote_voted');
                    voteButton.style.cursor = 'default';
                } else {
                    voteButton.style.background = '#666';
                    voteButton.textContent = t('home.vote_already_voted');
                    voteButton.style.cursor = 'default';
                }
            }

            // Gestionnaire de vote
            voteButton.addEventListener('click', () => {
                if (hasVoted) {
                    alert(t('home.vote_already_voted_message'));
                    return;
                }

                // Incrémenter le vote
                item.votes++;
                
                // Sauvegarder le vote
                const votesToSave = {};
                animesVote.forEach(a => {
                    votesToSave[a.id] = a.votes;
                });
                localStorage.setItem(votesKey, JSON.stringify(votesToSave));
                localStorage.setItem(userVoteKey, item.id);

                // Mettre à jour l'affichage
                updateVoteResults();
                
                // Désactiver tous les boutons
                document.querySelectorAll('.vote-button').forEach(btn => {
                    btn.style.background = '#666';
                    btn.textContent = t('home.vote_already_voted');
                    btn.style.cursor = 'default';
                });

                // Marquer le bouton voté
                voteButton.style.background = '#00c45d';
                voteButton.textContent = t('home.vote_voted');
                voteButton.style.cursor = 'default';
            });

            voteButton.className = 'vote-button';

            // Résultats de vote (initialement cachés)
            const voteResults = document.createElement('div');
            voteResults.className = 'vote-results';
            voteResults.style.cssText = `
                margin-top: 1rem;
                padding: 1rem;
                background: #1a1a1a;
                border-radius: 8px;
                border: 1px solid #444;
                display: none;
            `;

            const voteCount = document.createElement('div');
            voteCount.style.cssText = `
                color: #00c45d;
                font-size: 1.1rem;
                font-weight: 600;
                margin-bottom: 0.5rem;
            `;
            voteCount.textContent = `${item.votes} ${item.votes > 1 ? t('home.vote_votes_plural') : t('home.vote_votes')}`;

            const votePercentage = document.createElement('div');
            votePercentage.style.cssText = `
                color: #e0e0e0;
                font-size: 0.9rem;
            `;
            votePercentage.textContent = '0%';

            voteResults.appendChild(voteCount);
            voteResults.appendChild(votePercentage);

            // Assembler la carte
            itemCard.appendChild(itemImage);
            itemCard.appendChild(itemTitle);
            itemCard.appendChild(genresContainer);
            itemCard.appendChild(itemDescription);
            itemCard.appendChild(voteButton);
            itemCard.appendChild(voteResults);
            voteGrid.appendChild(itemCard);
        }

        // Fonction pour mettre à jour les résultats
        function updateVoteResults() {
            const totalVotes = animesVote.reduce((sum, item) => sum + item.votes, 0);
            
            if (totalVotes > 0) {
                document.querySelectorAll('.vote-results').forEach((result, index) => {
                    const item = animesVote[index];
                    const percentage = totalVotes > 0 ? Math.round((item.votes / totalVotes) * 100) : 0;
                    
                    result.style.display = 'block';
                    result.querySelector('div:first-child').textContent = `${item.votes} ${item.votes > 1 ? t('home.vote_votes_plural') : t('home.vote_votes')}`;
                    result.querySelector('div:last-child').textContent = `${percentage}%`;
                });
            }
        }

        // Afficher les résultats si des votes existent
        if (Object.values(votesExistants).some(votes => votes > 0)) {
            updateVoteResults();
        }
    }

    // Assembler la section
    voteSection.appendChild(voteTitle);
    voteSection.appendChild(typeIndicator);
    voteSection.appendChild(voteTitleLine);
    voteSection.appendChild(voteContainer);
    voteContainer.appendChild(voteGrid);

    // Charger les données et créer les cartes
    createVoteCards();

    // Insérer les sections après la section auteur (attendre que auteurSection soit créée)
    setTimeout(() => {
        const auteurSectionElement = document.querySelector('.auteur-section');
        if (auteurSectionElement) {
            // Insérer la section vote après la section auteur
            auteurSectionElement.parentNode.insertBefore(voteSection, auteurSectionElement.nextSibling);
            
            // Insérer la section nouveaux membres après la section vote
            auteurSectionElement.parentNode.insertBefore(nouveauxMembresSection, voteSection.nextSibling);
            
            // Insérer la section quiz après la section nouveaux membres
            auteurSectionElement.parentNode.insertBefore(quizSection, auteurSectionElement.nextSibling.nextSibling.nextSibling);
        }
    }, 1000);

    // --- CHARGEMENT DU QUIZ ---
    const quizCard = document.getElementById('quizCard');
    if (quizCard) {
        await loadQuizQuestion();
    }

    // --- FONCTION POUR CHARGER LE QUIZ ---
    async function loadQuizQuestion() {
        try {
            const response = await fetch('../data/questions.json');
            const questions = await response.json();
            
            // Sélectionner une question basée sur la date (pour qu'elle change chaque jour)
            const today = new Date();
            const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
            const questionIndex = dayOfYear % questions.length;
            const currentQuestion = questions[questionIndex];

            // Afficher la question
            const quizQuestion = document.createElement('h3');
            
            // Traduire la question si possible
            const translatedQuestion = await translateQuizQuestion(currentQuestion.question);
            quizQuestion.textContent = translatedQuestion;

            const quizOptions = document.createElement('div');
            quizOptions.className = 'quiz-options';

            let selectedOption = null;

            // Traduire tous les choix en parallèle
            const translatedChoices = await Promise.all(
                currentQuestion.choices.map(choice => translateQuizChoice(choice))
            );
            
            currentQuestion.choices.forEach((choice, index) => {
                const optionBtn = document.createElement('button');
                
                // Utiliser le choix traduit
                optionBtn.textContent = translatedChoices[index];
                optionBtn.className = 'quiz-option';

                optionBtn.addEventListener('click', () => {
                    // Désélectionner l'option précédente
                    if (selectedOption) {
                        selectedOption.classList.remove('selected');
                    }

                    // Sélectionner la nouvelle option
                    selectedOption = optionBtn;
                    optionBtn.classList.add('selected');
                });

                quizOptions.appendChild(optionBtn);
            });

            const quizSubmitBtn = document.createElement('button');
            quizSubmitBtn.textContent = t('home.quiz_validate');
            quizSubmitBtn.style.background = '#00c45d';
            quizSubmitBtn.style.color = '#fff';
            quizSubmitBtn.style.border = 'none';
            quizSubmitBtn.style.padding = '1rem 2rem';
            quizSubmitBtn.style.borderRadius = '8px';
            quizSubmitBtn.style.fontSize = '1.1rem';
            quizSubmitBtn.style.cursor = 'pointer';
            quizSubmitBtn.style.transition = 'background 0.3s, transform 0.3s';
            quizSubmitBtn.style.display = 'block';
            quizSubmitBtn.style.margin = '0 auto';
            quizSubmitBtn.style.width = 'fit-content';

                                    quizSubmitBtn.addEventListener('click', () => {
                            if (selectedOption) {
                                const userAnswer = currentQuestion.choices.indexOf(selectedOption.textContent);
                                const isCorrect = userAnswer === currentQuestion.answer;
                                
                                // Créer le résultat visuel
                                const resultDiv = document.createElement('div');
                                resultDiv.className = 'quiz-result';
                                resultDiv.style.cssText = `
                                    position: absolute;
                                    top: 0;
                                    left: 0;
                                    right: 0;
                                    bottom: 0;
                                    background: rgba(0, 0, 0, 0.95);
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    justify-content: center;
                                    border-radius: 8px;
                                    z-index: 10;
                                    animation: fadeIn 0.3s ease;
                                `;
                                
                                // Icône de résultat
                                const resultIcon = document.createElement('div');
                                resultIcon.style.cssText = `
                                    font-size: 4rem;
                                    margin-bottom: 1rem;
                                    animation: bounceIn 0.6s ease;
                                `;
                                resultIcon.textContent = isCorrect ? '🎉' : '❌';
                                
                                // Message de résultat
                                const resultMessage = document.createElement('h3');
                                resultMessage.style.cssText = `
                                    color: ${isCorrect ? '#00c45d' : '#ff6b6b'};
                                    font-size: 1.5rem;
                                    margin-bottom: 0.5rem;
                                    text-align: center;
                                    animation: slideInUp 0.4s ease 0.2s both;
                                `;
                                resultMessage.textContent = isCorrect ? t('home.quiz_correct') : t('home.quiz_incorrect');
                                
                                // Détail de la réponse
                                const resultDetail = document.createElement('p');
                                resultDetail.style.cssText = `
                                    color: #ffffff;
                                    font-size: 1.1rem;
                                    text-align: center;
                                    margin-bottom: 2rem;
                                    animation: slideInUp 0.4s ease 0.3s both;
                                `;
                                resultDetail.textContent = `${t('home.quiz_correct_answer')} "${currentQuestion.choices[currentQuestion.answer]}"`;
                                
                                // Bouton pour continuer
                                const continueBtn = document.createElement('button');
                                continueBtn.style.cssText = `
            background: #00c45d;
            color: #fff;
            border: none;
                                    padding: 0.8rem 2rem;
                                    border-radius: 6px;
                                    font-size: 1rem;
            cursor: pointer;
                                    transition: all 0.3s ease;
                                    animation: slideInUp 0.4s ease 0.4s both;
                                `;
                                continueBtn.textContent = t('home.quiz_continue');
                                
                                continueBtn.addEventListener('mouseenter', () => {
                                    continueBtn.style.background = '#00e06d';
                                    continueBtn.style.transform = 'translateY(-2px)';
                                });
                                
                                continueBtn.addEventListener('mouseleave', () => {
                                    continueBtn.style.background = '#00c45d';
                                    continueBtn.style.transform = 'translateY(0)';
                                });
                                
                                continueBtn.addEventListener('click', () => {
                                    resultDiv.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
                                        resultDiv.remove();
                                    }, 300);
                                });
                                
                                // Assembler le résultat
                                resultDiv.appendChild(resultIcon);
                                resultDiv.appendChild(resultMessage);
                                resultDiv.appendChild(resultDetail);
                                resultDiv.appendChild(continueBtn);
                                
                                // Ajouter au quiz card
                                quizCard.style.position = 'relative';
                                quizCard.appendChild(resultDiv);
                                
                                // Ajouter les styles d'animation
                                if (!document.getElementById('quiz-animations')) {
            const style = document.createElement('style');
                                    style.id = 'quiz-animations';
            style.textContent = `
                                        @keyframes fadeIn {
                                            from { opacity: 0; }
                                            to { opacity: 1; }
                                        }
                                        @keyframes fadeOut {
                                            from { opacity: 1; }
                                            to { opacity: 0; }
                                        }
                                        @keyframes bounceIn {
                                            0% { transform: scale(0); }
                                            50% { transform: scale(1.2); }
                                            100% { transform: scale(1); }
                                        }
                                        @keyframes slideInUp {
                                            from { 
                                                opacity: 0; 
                                                transform: translateY(20px); 
                                            }
                                            to { 
                                                opacity: 1; 
                                                transform: translateY(0); 
                                            }
            }
            `;
            document.head.appendChild(style);
        }

                            } else {
                                // Message d'erreur si aucune option sélectionnée
                                const errorMessage = document.createElement('div');
                                errorMessage.style.cssText = `
                                    background: #ff6b6b;
                                    color: #fff;
                                    padding: 0.8rem;
                                    border-radius: 6px;
                                    margin-top: 1rem;
                                    text-align: center;
                                    animation: slideInUp 0.3s ease;
                                `;
                                errorMessage.textContent = t('home.quiz_select_answer');
                                
                                // Supprimer le message d'erreur après 3 secondes
                                setTimeout(() => {
                                    if (errorMessage.parentNode) {
                                        errorMessage.style.animation = 'fadeOut 0.3s ease';
                                        setTimeout(() => {
                                            if (errorMessage.parentNode) {
                                                errorMessage.remove();
                                            }
                                        }, 300);
                                    }
                                }, 3000);
                                
                                quizCard.appendChild(errorMessage);
                            }
                        });

            // Ajouter un indicateur de progression
            const progressInfo = document.createElement('div');
            progressInfo.style.fontSize = '0.9rem';
            progressInfo.style.color = '#888';
            progressInfo.style.marginTop = '1rem';
            progressInfo.style.textAlign = 'center';
            progressInfo.textContent = t('home.quiz_question_progress').replace('{current}', questionIndex + 1).replace('{total}', questions.length);

            quizCard.appendChild(quizQuestion);
            quizCard.appendChild(quizOptions);
            quizCard.appendChild(quizSubmitBtn);
            quizCard.appendChild(progressInfo);

        } catch (error) {
            console.error('Erreur lors du chargement du quiz:', error);
            
            // Fallback en cas d'erreur
            const errorMessage = document.createElement('p');
            errorMessage.style.color = '#ff6b6b';
            errorMessage.textContent = t('home.quiz_error');
            quizCard.appendChild(errorMessage);
        }
    }



    // --- GESTIONNAIRE DE DÉCONNEXION ---
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('user');
            window.location.href = 'acceuil.html';
        });
    }
    
    // --- INITIALISATION DE GOOGLE SIGN-IN ---
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "669862191301-acapu82b61jp8tpnt3noet0lbsk6lk30.apps.googleusercontent.com",
            callback: handleCredentialResponse
        });
        
        // Afficher le bouton Google si nécessaire
        if (document.getElementById('google-signin')) {
            google.accounts.id.renderButton(
                document.getElementById('google-signin'),
                {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    width: '100%',
                    text: 'continue_with',
                    shape: 'rectangular'
                }
            );
        }
    }
    
    // --- GESTIONNAIRE DE RÉPONSE GOOGLE SIGN-IN ---
    function handleCredentialResponse(response) {
        const responsePayload = parseJwt(response.credential);
        
        const user = {
            name: responsePayload.name,
            email: responsePayload.email,
            picture: responsePayload.picture,
            token: response.credential
        };
        
        localStorage.setItem('user', JSON.stringify(user));
        window.location.reload();
    }
    
    // --- DÉCODER LE TOKEN JWT ---
    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Erreur lors du décodage du token JWT:', e);
            return null;
        }
    }
}); 