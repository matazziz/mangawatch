// Service pour gérer les auteurs et leurs œuvres
export class AuteurService {
    constructor() {
        this.apiBaseUrl = 'https://api.jikan.moe/v4';
        this.jikanProxyPath = '/.netlify/functions/jikan-proxy';
        this.auteurs = [
            {
                nom: "Naoki Urasawa",
                portrait: "https://via.placeholder.com/200x200/00c45d/ffffff?text=Naoki+Urasawa",
                description: "Naoki Urasawa (né en 1960 à Tokyo) est un mangaka, scénariste et musicien japonais, considéré comme l'un des plus grands auteurs contemporains. Il est célèbre pour ses thrillers psychologiques, ses intrigues complexes et ses personnages profonds. Urasawa a débuté sa carrière en 1983 et s'est imposé avec des œuvres majeures comme Monster, 20th Century Boys et Pluto.",
                oeuvres: [
                    {
                        titre: "Monster",
                        image: "https://via.placeholder.com/200x300/1a1a1a/00c45d?text=Monster",
                        description: "Un thriller haletant sur la traque d'un tueur en série en Allemagne."
                    },
                    {
                        titre: "20th Century Boys",
                        image: "https://via.placeholder.com/200x300/1a1a1a/00c45d?text=20th+Century+Boys",
                        description: "Un récit de science-fiction et de complot, entre enfance et apocalypse."
                    },
                    {
                        titre: "Pluto",
                        image: "https://via.placeholder.com/200x300/1a1a1a/00c45d?text=Pluto",
                        description: "Une relecture mature d'Astro Boy, mêlant enquête et réflexion sur l'humanité."
                    }
                ]
            },
            {
                nom: "Rumiko Takahashi",
                portrait: "https://via.placeholder.com/200x200/00c45d/ffffff?text=Rumiko+Takahashi",
                description: "Rumiko Takahashi est l'une des mangakas les plus populaires au monde, connue pour ses comédies romantiques et fantastiques. Elle est l'auteure de Ranma ½, Maison Ikkoku, InuYasha et Urusei Yatsura.",
                oeuvres: [
                    {
                        titre: "Ranma ½",
                        image: "https://via.placeholder.com/200x300/1a1a1a/00c45d?text=Ranma+1/2",
                        description: "Une comédie d'arts martiaux et de quiproquos autour d'un garçon qui se transforme en fille."
                    },
                    {
                        titre: "InuYasha",
                        image: "https://via.placeholder.com/200x300/1a1a1a/00c45d?text=InuYasha",
                        description: "Un shōnen fantastique mêlant romance, action et folklore japonais."
                    },
                    {
                        titre: "Urusei Yatsura",
                        image: "https://via.placeholder.com/200x300/1a1a1a/00c45d?text=Urusei+Yatsura",
                        description: "Une série culte de science-fiction et d'humour déjanté."
                    }
                ]
            },
            {
                nom: "Akira Toriyama",
                portrait: "https://via.placeholder.com/200x200/00c45d/ffffff?text=Akira+Toriyama",
                description: "Akira Toriyama est le créateur de Dragon Ball, l'un des mangas les plus influents de l'histoire, et de Dr. Slump. Son style dynamique et son humour ont marqué des générations de lecteurs.",
                oeuvres: [
                    {
                        titre: "Dragon Ball",
                        image: "https://via.placeholder.com/200x300/1a1a1a/00c45d?text=Dragon+Ball",
                        description: "L'aventure épique de Son Goku à la recherche des Dragon Balls."
                    },
                    {
                        titre: "Dr. Slump",
                        image: "https://via.placeholder.com/200x300/1a1a1a/00c45d?text=Dr+Slump",
                        description: "Une comédie absurde dans le village du Pingouin avec la petite robot Arale."
                    },
                    {
                        titre: "Sand Land",
                        image: "https://via.placeholder.com/200x300/1a1a1a/00c45d?text=Sand+Land",
                        description: "Un one-shot d'aventure dans un monde désertique."
                    }
                ]
            },
            {
                nom: "CLAMP",
                portrait: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/CLAMP_at_Japan_Expo_2010.jpg/800px-CLAMP_at_Japan_Expo_2010.jpg",
                description: "CLAMP est un collectif féminin d'auteures connu pour ses univers fantastiques, ses personnages attachants et ses crossovers. On leur doit Card Captor Sakura, xxxHolic, Tsubasa Reservoir Chronicle…",
                oeuvres: [
                    {
                        titre: "Card Captor Sakura",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/CardcaptorSakuraVol1Cover.jpg",
                        description: "L'histoire magique de Sakura, chasseuse de cartes."
                    },
                    {
                        titre: "xxxHolic",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/XxxHolic_vol1_cover.jpg",
                        description: "Un manga surnaturel et mystérieux, croisé avec Tsubasa."
                    },
                    {
                        titre: "Tsubasa Reservoir Chronicle",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/Tsubasa_Reservoir_Chronicle_vol01_Cover.jpg",
                        description: "Une aventure à travers les mondes parallèles de CLAMP."
                    }
                ]
            },
            {
                nom: "Takehiko Inoue",
                portrait: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Takehiko_Inoue_at_Japan_Expo_2010.jpg/800px-Takehiko_Inoue_at_Japan_Expo_2010.jpg",
                description: "Takehiko Inoue est célèbre pour ses mangas sportifs et historiques, notamment Slam Dunk, Vagabond et Real. Son dessin réaliste et son sens du mouvement sont salués dans le monde entier.",
                oeuvres: [
                    {
                        titre: "Slam Dunk",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/Slam_Dunk_volume_1_cover.jpg",
                        description: "Le manga de basket qui a révolutionné le genre."
                    },
                    {
                        titre: "Vagabond",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/Vagabond_v1_cover.jpg",
                        description: "Une fresque historique sur le samouraï Miyamoto Musashi."
                    },
                    {
                        titre: "Real",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/Real_manga_vol_1.jpg",
                        description: "Un manga sur le handisport et la résilience."
                    }
                ]
            },
            {
                nom: "Hiromu Arakawa",
                portrait: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Hiromu_Arakawa_at_Japan_Expo_2010.jpg/800px-Hiromu_Arakawa_at_Japan_Expo_2010.jpg",
                description: "Hiromu Arakawa, née en 1973 à Hokkaidō, est une mangaka japonaise mondialement connue pour Fullmetal Alchemist. Issue d'une famille d'agriculteurs, elle a su imposer un style réaliste, dynamique et plein d'humour.",
                oeuvres: [
                    {
                        titre: "Fullmetal Alchemist",
                        image: "https://upload.wikimedia.org/wikipedia/en/5/5e/FullmetalAlchemistCover.jpg",
                        description: "Un shōnen culte mêlant alchimie, aventure et réflexion sur l'humanité."
                    },
                    {
                        titre: "Silver Spoon",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/Silver_Spoon_manga_vol_1.jpg",
                        description: "Une plongée réaliste et drôle dans le monde agricole japonais."
                    },
                    {
                        titre: "Heroic Legend of Arslan",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/Arslan_Senki_vol_1.jpg",
                        description: "Une fresque épique adaptée d'un roman de fantasy historique."
                    }
                ]
            },
            {
                nom: "Masashi Kishimoto",
                portrait: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Masashi_Kishimoto_at_Japan_Expo_2010.jpg/800px-Masashi_Kishimoto_at_Japan_Expo_2010.jpg",
                description: "Masashi Kishimoto, né en 1974 dans la préfecture d'Okayama, est le créateur de Naruto, l'un des mangas les plus populaires de tous les temps. Passionné de dessin depuis l'enfance, il s'inspire d'Akira Toriyama et de la culture japonaise pour créer un univers riche en ninjas.",
                oeuvres: [
                    {
                        titre: "Naruto",
                        image: "https://upload.wikimedia.org/wikipedia/en/9/94/NarutoCoverTankobon1.jpg",
                        description: "L'histoire d'un jeune ninja rejeté qui rêve de devenir Hokage."
                    },
                    {
                        titre: "Boruto",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2c/Boruto_vol_1.jpg",
                        description: "La suite de Naruto, centrée sur la nouvelle génération de ninjas."
                    },
                    {
                        titre: "Samurai 8",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/Samurai_8_vol_1.jpg",
                        description: "Un manga de science-fiction mêlant samouraïs et univers futuriste."
                    }
                ]
            },
            {
                nom: "Yoshihiro Togashi",
                portrait: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Yoshihiro_Togashi_at_Japan_Expo_2010.jpg/800px-Yoshihiro_Togashi_at_Japan_Expo_2010.jpg",
                description: "Yoshihiro Togashi, né en 1966 à Shinjō, est un mangaka japonais célèbre pour Yu Yu Hakusho et Hunter x Hunter. Il est reconnu pour ses intrigues complexes, ses personnages nuancés et sa capacité à surprendre le lecteur.",
                oeuvres: [
                    {
                        titre: "Hunter x Hunter",
                        image: "",
                        description: "L'aventure de Gon à la recherche de son père dans un monde de chasseurs."
                    },
                    {
                        titre: "Yu Yu Hakusho",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/YuYuHakusho_vol01_Cover.jpg",
                        description: "Un shōnen surnaturel où un adolescent devient détective des esprits."
                    },
                    {
                        titre: "Level E",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/Level_E_vol_1.jpg",
                        description: "Une comédie de science-fiction décalée et imprévisible."
                    }
                ]
            },
            {
                nom: "Hajime Isayama",
                portrait: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Hajime_Isayama_at_Japan_Expo_2010.jpg/800px-Hajime_Isayama_at_Japan_Expo_2010.jpg",
                description: "Hajime Isayama, né en 1986 dans la préfecture d'Oita, est l'auteur de L'Attaque des Titans (Shingeki no Kyojin), un phénomène mondial. Son manga, débuté en 2009, a captivé des millions de lecteurs par son univers sombre et ses rebondissements.",
                oeuvres: [
                    {
                        titre: "L'Attaque des Titans",
                        image: "https://upload.wikimedia.org/wikipedia/en/7/7e/Shingeki_no_Kyojin_manga_volume_1.jpg",
                        description: "L'humanité lutte pour sa survie face aux titans dévoreurs d'hommes."
                    },
                    {
                        titre: "Heart Break One",
                        image: "https://upload.wikimedia.org/wikipedia/commons/4/4b/No_Image_Available.jpg",
                        description: "Un one-shot de jeunesse, témoignage des débuts d'Isayama."
                    },
                    {
                        titre: "Orz",
                        image: "https://upload.wikimedia.org/wikipedia/commons/4/4b/No_Image_Available.jpg",
                        description: "Un autre récit court, publié avant le succès des Titans."
                    }
                ]
            },
            {
                nom: "Osamu Tezuka",
                portrait: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Osamu_Tezuka_at_Japan_Expo_2010.jpg/800px-Osamu_Tezuka_at_Japan_Expo_2010.jpg",
                description: "Osamu Tezuka (1928-1989) est considéré comme le « dieu du manga ». Médecin de formation, il révolutionne la bande dessinée japonaise dès les années 1940 avec un style cinématographique, des personnages expressifs et des récits profonds.",
                oeuvres: [
                    {
                        titre: "Astro Boy",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/Astro_Boy_volume_1_cover.jpg",
                        description: "Le robot le plus célèbre du manga, symbole d'humanisme et d'aventure."
                    },
                    {
                        titre: "Black Jack",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/Black_Jack_vol_1.jpg",
                        description: "Un chirurgien de génie, héros de récits médicaux et moraux."
                    },
                    {
                        titre: "Phénix",
                        image: "https://upload.wikimedia.org/wikipedia/en/2/2e/Phoenix_Tezuka_vol_1.jpg",
                        description: "Une fresque philosophique sur la vie, la mort et la réincarnation."
                    }
                ]
            }
        ];
    }

    // Obtenir l'auteur de la semaine
    getAuteurDeLaSemaine() {
        const now = new Date();
        const year = now.getFullYear();
        const week = this.getWeekNumber(now);
        
        // Persistance auteur de la semaine
        const auteurStorageKey = 'mangawatch_auteur_semaine_' + year + '-' + week;
        let auteurIndex = localStorage.getItem(auteurStorageKey);
        
        auteurIndex = week % this.auteurs.length;
        localStorage.setItem(auteurStorageKey, String(auteurIndex));
        return this.auteurs[auteurIndex];
    }

    // Obtenir tous les auteurs
    getAllAuteurs() {
        return this.auteurs;
    }

    // Obtenir un auteur par nom
    getAuteurByName(nom) {
        return this.auteurs.find(auteur => auteur.nom === nom);
    }

    // Obtenir le numéro de semaine
    getWeekNumber(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return weekNo;
    }

    // Récupérer les vraies images depuis l'API Jikan
    isUsableCoverUrl(url) {
        if (!url || typeof url !== 'string') return false;
        if (!url.startsWith('http')) return false;
        if (url.includes('placeholder') || url.includes('via.placeholder')) return false;
        return true;
    }

    async fetchMangaImages(mangaTitle) {
        try {
            const proxyUrl = new URL(this.jikanProxyPath, window.location.origin);
            proxyUrl.searchParams.set('action', 'list');
            proxyUrl.searchParams.set('mediaType', 'manga');
            proxyUrl.searchParams.set('q', mangaTitle);
            proxyUrl.searchParams.set('limit', '5');
            proxyUrl.searchParams.set('sfw', 'true');

            const fetchFn = window.MW_API_CONFIG?.fetchWithRetry || fetch;
            const response = await fetchFn(proxyUrl.toString(), { headers: { Accept: 'application/json' } });
            if (!response.ok) return null;

            const data = await response.json();
            if (data.data && data.data.length > 0) {
                const q = mangaTitle.toLowerCase().trim();
                const manga = data.data.find(function (m) {
                    const t = (m.title || '').toLowerCase();
                    const te = (m.title_english || '').toLowerCase();
                    return t === q || te === q || t.includes(q) || q.includes(t);
                }) || data.data[0];
                return manga.images?.jpg?.large_image_url ||
                       manga.images?.jpg?.image_url ||
                       manga.images?.webp?.large_image_url ||
                       manga.images?.webp?.image_url;
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des images:', error);
        }
        return null;
    }

    // Créer l'élément HTML pour l'auteur de la semaine
    async createAuteurSection(auteur) {
        console.log('📚 createAuteurSection appelée pour:', auteur.nom);
        const auteurSection = document.createElement('section');
        auteurSection.className = 'section auteur-section';
        auteurSection.style.marginTop = '2rem';

        // Titre de la section
        const auteurTitle = document.createElement('h2');
        auteurTitle.className = 'section-title';
        auteurTitle.setAttribute('data-i18n', 'home.author_featured');
        // Utiliser window.t si disponible, sinon fonction locale
        const tFn = window.t || (window.localization ? (key) => window.localization.get(key) : (key) => key);
        auteurTitle.textContent = `${tFn('home.author_featured')} ${auteur.nom}`;
        auteurSection.appendChild(auteurTitle);

        // Contenu principal (portrait + description)
        const auteurContent = document.createElement('div');
        auteurContent.className = 'auteur-content';
        auteurContent.style.display = 'flex';
        auteurContent.style.alignItems = 'flex-start';
        auteurContent.style.gap = '2rem';
        auteurContent.style.flexWrap = 'wrap';
        auteurContent.style.marginBottom = '2rem';

        // Portrait de l'auteur (utiliser une image de placeholder stylisée)
        const portrait = document.createElement('div');
        portrait.style.width = '200px';
        portrait.style.height = '200px';
        portrait.style.background = 'linear-gradient(135deg, #00c45d, #00e06d)';
        portrait.style.borderRadius = '12px';
        portrait.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        portrait.style.border = '3px solid #00c45d';
        portrait.style.display = 'flex';
        portrait.style.alignItems = 'center';
        portrait.style.justifyContent = 'center';
        portrait.style.fontSize = '1.2rem';
        portrait.style.fontWeight = 'bold';
        portrait.style.color = '#fff';
        portrait.style.textAlign = 'center';
        portrait.style.padding = '1rem';
        portrait.innerHTML = auteur.nom;
        auteurContent.appendChild(portrait);

        // Description de l'auteur
        const descWrap = document.createElement('div');
        descWrap.style.flex = '1';
        descWrap.style.minWidth = '300px';

        const desc = document.createElement('p');
        desc.style.fontSize = '1.1rem';
        desc.style.lineHeight = '1.6';
        desc.style.color = '#e0e0e0';
        desc.style.margin = '0';
        
        // Utiliser la traduction automatique de la description de l'auteur
        let currentLang = localStorage.getItem('mangaWatchLanguage');
        // Vérifier aussi dans user.language si mangaWatchLanguage n'est pas défini
        if (!currentLang) {
            try {
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                if (user && user.language) {
                    currentLang = user.language;
                    localStorage.setItem('mangaWatchLanguage', currentLang);
                } else if (user && user.langue) {
                    currentLang = user.langue;
                    localStorage.setItem('mangaWatchLanguage', currentLang);
                }
            } catch (e) {
                console.warn('Erreur lors de la lecture de user.language:', e);
            }
        }
        currentLang = currentLang || 'fr';
        console.log(`🌍 Traduction de la description de l'auteur en ${currentLang}`);
        
        if (currentLang === 'fr') {
            desc.textContent = auteur.description;
        } else {
            try {
                // Attendre que translateWithCache soit disponible
                let translateFn = window.translateWithCache;
                let attempts = 0;
                while (!translateFn && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    translateFn = window.translateWithCache;
                    attempts++;
                }
                
                if (typeof translateFn === 'function') {
                    console.log(`🔄 Traduction de la description de l'auteur: "${auteur.description.substring(0, 50)}..." vers ${currentLang}`);
                    try {
                        const translatedDesc = await translateFn(auteur.description, currentLang);
                        console.log(`📝 Résultat de traduction: "${translatedDesc ? translatedDesc.substring(0, 50) : 'null'}..."`);
                        
                        if (translatedDesc && translatedDesc.trim() !== '' && translatedDesc !== auteur.description) {
                            desc.textContent = translatedDesc;
                            console.log(`✅ Description de l'auteur traduite avec succès (${translatedDesc.length} caractères)`);
                        } else {
                            console.warn(`⚠️ Traduction invalide: vide=${!translatedDesc}, identique=${translatedDesc === auteur.description}`);
                            desc.textContent = auteur.description;
                        }
                    } catch (translationError) {
                        console.error('❌ Erreur lors de l\'appel à translateWithCache:', translationError);
                        desc.textContent = auteur.description;
                    }
                } else {
                    console.error('❌ translateWithCache non disponible après attente');
                    console.log('window.translateWithCache:', typeof window.translateWithCache);
                    desc.textContent = auteur.description;
                }
            } catch (error) {
                console.error('❌ Erreur lors de la traduction de la description:', error);
                desc.textContent = auteur.description;
            }
        }
        descWrap.appendChild(desc);

        auteurContent.appendChild(descWrap);
        auteurSection.appendChild(auteurContent);

        // Section des œuvres majeures
        const oeuvresTitle = document.createElement('h3');
        oeuvresTitle.style.fontSize = '1.5rem';
        oeuvresTitle.style.color = '#00c45d';
        oeuvresTitle.style.marginBottom = '1rem';
        oeuvresTitle.setAttribute('data-i18n', 'home.author_major_works');
        // Utiliser window.t si disponible, sinon fonction locale
        const tFn = window.t || (window.localization ? (key) => window.localization.get(key) : (key) => key);
        oeuvresTitle.textContent = tFn('home.author_major_works');
        auteurSection.appendChild(oeuvresTitle);

        // Grille des œuvres
        const oeuvresGrid = document.createElement('div');
        oeuvresGrid.style.display = 'grid';
        oeuvresGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
        oeuvresGrid.style.gap = '1.5rem';

        // Créer les cartes d'œuvres avec vraies images
        for (const oeuvre of auteur.oeuvres) {
            const oeuvreCard = document.createElement('div');
            oeuvreCard.className = 'oeuvre-card';
            oeuvreCard.style.background = '#2a2a2a';
            oeuvreCard.style.borderRadius = '12px';
            oeuvreCard.style.padding = '1rem';
            oeuvreCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            oeuvreCard.style.transition = 'transform 0.3s, box-shadow 0.3s';
            oeuvreCard.style.cursor = 'pointer';

            // Effet hover
            oeuvreCard.addEventListener('mouseenter', () => {
                oeuvreCard.style.transform = 'translateY(-5px)';
                oeuvreCard.style.boxShadow = '0 8px 20px rgba(0,196,93,0.3)';
            });

            oeuvreCard.addEventListener('mouseleave', () => {
                oeuvreCard.style.transform = 'translateY(0)';
                oeuvreCard.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            });

            // Image de l'œuvre (récupérer depuis l'API)
            const oeuvreImage = document.createElement('img');
            oeuvreImage.alt = oeuvre.titre;
            oeuvreImage.style.cssText = `
                width: 100%;
                height: 200px;
                object-fit: cover;
                border-radius: 8px;
                margin-bottom: 0.8rem;
                transition: transform 0.3s ease;
                border: 2px solid #444;
            `;
            
            if (this.isUsableCoverUrl(oeuvre.image)) {
                oeuvreImage.src = oeuvre.image;
                oeuvreImage.style.display = 'block';
            }

            const realImage = this.isUsableCoverUrl(oeuvre.image)
                ? oeuvre.image
                : await this.fetchMangaImages(oeuvre.titre);
            if (realImage) {
                oeuvreImage.src = realImage;
                
                // Effet de zoom au hover
                oeuvreImage.addEventListener('mouseenter', () => {
                    oeuvreImage.style.transform = 'scale(1.05)';
                });
                oeuvreImage.addEventListener('mouseleave', () => {
                    oeuvreImage.style.transform = 'scale(1)';
                });
                
                // Gestion d'erreur de chargement d'image
                oeuvreImage.onerror = function() {
                    this.style.display = 'none';
                    const fallbackDiv = document.createElement('div');
                    fallbackDiv.style.cssText = `
                        width: 100%;
                        height: 200px;
                        background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
                        border: 2px solid #00c45d;
                        border-radius: 8px;
                        margin-bottom: 0.8rem;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        color: #00c45d;
                        font-size: 1rem;
                        text-align: center;
                        padding: 1rem;
                    `;
                    
                    const iconDiv = document.createElement('div');
                    iconDiv.style.cssText = `
                        font-size: 2rem;
                        margin-bottom: 0.5rem;
                        opacity: 0.7;
                    `;
                    iconDiv.textContent = '📚';
                    
                    const textDiv = document.createElement('div');
                    textDiv.style.cssText = `
                        line-height: 1.2;
                    `;
                    textDiv.textContent = oeuvre.titre;
                    
                    fallbackDiv.appendChild(iconDiv);
                    fallbackDiv.appendChild(textDiv);
                    oeuvreCard.insertBefore(fallbackDiv, oeuvreCard.firstChild);
                };
            } else {
                // Fallback avec placeholder stylisé
                oeuvreImage.style.display = 'none';
                const fallbackDiv = document.createElement('div');
                fallbackDiv.style.cssText = `
                    width: 100%;
                    height: 200px;
                    background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
                    border: 2px solid #00c45d;
                    border-radius: 8px;
                    margin-bottom: 0.8rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: #00c45d;
                    font-size: 1rem;
                    text-align: center;
                    padding: 1rem;
                `;
                
                const iconDiv = document.createElement('div');
                iconDiv.style.cssText = `
                    font-size: 2rem;
                    margin-bottom: 0.5rem;
                    opacity: 0.7;
                `;
                iconDiv.textContent = '📚';
                
                const textDiv = document.createElement('div');
                textDiv.style.cssText = `
                    line-height: 1.2;
                `;
                textDiv.textContent = oeuvre.titre;
                
                fallbackDiv.appendChild(iconDiv);
                fallbackDiv.appendChild(textDiv);
                oeuvreCard.insertBefore(fallbackDiv, oeuvreCard.firstChild);
            }

            // Titre de l'œuvre (cliquable)
            const oeuvreTitre = document.createElement('h4');
            oeuvreTitre.style.fontSize = '1.2rem';
            oeuvreTitre.style.color = '#00c45d';
            oeuvreTitre.style.margin = '0 0 0.5rem 0';
            oeuvreTitre.style.cursor = 'pointer';
            oeuvreTitre.style.transition = 'color 0.3s ease';
            oeuvreTitre.textContent = oeuvre.titre;
            
            // Effet hover pour le titre
            oeuvreTitre.addEventListener('mouseenter', () => {
                oeuvreTitre.style.color = '#00ff7f';
            });
            oeuvreTitre.addEventListener('mouseleave', () => {
                oeuvreTitre.style.color = '#00c45d';
            });
            
            // Redirection vers la page manga
            oeuvreTitre.addEventListener('click', async () => {
                // Rechercher l'ID via l'API
                const mangaId = await this.searchMangaIdByTitle(oeuvre.titre);
                
                if (mangaId) {
                    window.location.href = `anime-details.html?id=${mangaId}&type=manga`;
                } else {
                    // Fallback : redirection vers la page manga avec le titre en paramètre
                    window.location.href = `anime-details.html?search=${encodeURIComponent(oeuvre.titre)}&type=manga`;
                }
            });

            // Description de l'œuvre
            const oeuvreDesc = document.createElement('p');
            oeuvreDesc.style.fontSize = '0.9rem';
            oeuvreDesc.style.color = '#b0b0b0';
            oeuvreDesc.style.margin = '0';
            oeuvreDesc.style.lineHeight = '1.4';
            
            // Utiliser la traduction automatique de la description de l'œuvre
            let currentLang = localStorage.getItem('mangaWatchLanguage');
            // Vérifier aussi dans user.language si mangaWatchLanguage n'est pas défini
            if (!currentLang) {
                try {
                    const user = JSON.parse(localStorage.getItem('user') || 'null');
                    if (user && user.language) {
                        currentLang = user.language;
                        localStorage.setItem('mangaWatchLanguage', currentLang);
                    } else if (user && user.langue) {
                        currentLang = user.langue;
                        localStorage.setItem('mangaWatchLanguage', currentLang);
                    }
                } catch (e) {
                    console.warn('Erreur lors de la lecture de user.language:', e);
                }
            }
            currentLang = currentLang || 'fr';
            console.log(`🌍 Traduction de la description de l'œuvre "${oeuvre.titre}" en ${currentLang}`);
            
            if (currentLang === 'fr') {
                oeuvreDesc.textContent = oeuvre.description;
            } else {
                try {
                    // Attendre que translateWithCache soit disponible
                    let translateFn = window.translateWithCache;
                    let attempts = 0;
                    while (!translateFn && attempts < 10) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        translateFn = window.translateWithCache;
                        attempts++;
                    }
                    
                    if (typeof translateFn === 'function') {
                        console.log(`🔄 Traduction de la description de l'œuvre "${oeuvre.titre}": "${oeuvre.description.substring(0, 50)}..." vers ${currentLang}`);
                        try {
                            const translatedWorkDesc = await translateFn(oeuvre.description, currentLang);
                            console.log(`📝 Résultat de traduction: "${translatedWorkDesc ? translatedWorkDesc.substring(0, 50) : 'null'}..."`);
                            
                            if (translatedWorkDesc && translatedWorkDesc.trim() !== '' && translatedWorkDesc !== oeuvre.description) {
                                oeuvreDesc.textContent = translatedWorkDesc;
                                console.log(`✅ Description de l'œuvre "${oeuvre.titre}" traduite avec succès (${translatedWorkDesc.length} caractères)`);
                            } else {
                                console.warn(`⚠️ Traduction invalide pour "${oeuvre.titre}": vide=${!translatedWorkDesc}, identique=${translatedWorkDesc === oeuvre.description}`);
                                oeuvreDesc.textContent = oeuvre.description;
                            }
                        } catch (translationError) {
                            console.error(`❌ Erreur lors de l'appel à translateWithCache pour "${oeuvre.titre}":`, translationError);
                            oeuvreDesc.textContent = oeuvre.description;
                        }
                    } else {
                        console.error(`❌ translateWithCache non disponible après attente pour "${oeuvre.titre}"`);
                        oeuvreDesc.textContent = oeuvre.description;
                    }
                } catch (error) {
                    console.error('❌ Erreur lors de la traduction de la description de l\'œuvre:', error);
                    oeuvreDesc.textContent = oeuvre.description;
                }
            }

            oeuvreCard.appendChild(oeuvreImage);
            oeuvreCard.appendChild(oeuvreTitre);
            oeuvreCard.appendChild(oeuvreDesc);
            oeuvresGrid.appendChild(oeuvreCard);
        }

        auteurSection.appendChild(oeuvresGrid);
        return auteurSection;
    }

    // Obtenir la clé de traduction pour un auteur
    getAuthorTranslationKey(authorName) {
        const authorMap = {
            'Naoki Urasawa': 'author.naoki_urasawa',
            'Rumiko Takahashi': 'author.rumiko_takahashi',
            'Akira Toriyama': 'author.akira_toriyama',
            'CLAMP': 'author.clamp',
            'Takehiko Inoue': 'author.takehiko_inoue',
            'Hiromu Arakawa': 'author.hiromu_arakawa',
            'Masashi Kishimoto': 'author.masashi_kishimoto',
            'Yoshihiro Togashi': 'author.yoshihiro_togashi',
            'Hajime Isayama': 'author.hajime_isayama',
            'Osamu Tezuka': 'author.osamu_tezuka'
        };
        return authorMap[authorName] || null;
    }

    // Obtenir la clé de traduction pour une œuvre
    getWorkTranslationKey(workTitle) {
        const workMap = {
            'Monster': 'work.monster',
            '20th Century Boys': 'work.20th_century_boys',
            'Pluto': 'work.pluto',
            'Ranma ½': 'work.ranma',
            'InuYasha': 'work.inuyasha',
            'Urusei Yatsura': 'work.urusei_yatsura',
            'Dragon Ball': 'work.dragon_ball',
            'Dr. Slump': 'work.dr_slump',
            'Sand Land': 'work.sand_land',
            'Card Captor Sakura': 'work.card_captor_sakura',
            'xxxHolic': 'work.xxxholic',
            'Tsubasa Reservoir Chronicle': 'work.tsubasa',
            'Slam Dunk': 'work.slam_dunk',
            'Vagabond': 'work.vagabond',
            'Real': 'work.real',
            'Fullmetal Alchemist': 'work.fullmetal_alchemist',
            'Silver Spoon': 'work.silver_spoon',
            'Heroic Legend of Arslan': 'work.arslan',
            'Naruto': 'work.naruto',
            'Boruto': 'work.boruto',
            'Samurai 8': 'work.samurai_8',
            'Hunter x Hunter': 'work.hunter_x_hunter',
            'Yu Yu Hakusho': 'work.yu_yu_hakusho',
            'Level E': 'work.level_e',
            'L\'Attaque des Titans': 'work.attack_on_titan',
            'Heart Break One': 'work.heart_break_one',
            'Orz': 'work.orz',
            'Astro Boy': 'work.astro_boy',
            'Black Jack': 'work.black_jack',
            'Phénix': 'work.phoenix'
        };
        return workMap[workTitle] || null;
    }



    // Rechercher l'ID MAL d'un manga par son titre via l'API
    async searchMangaIdByTitle(title) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/manga?q=${encodeURIComponent(title)}&limit=1`);
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                return data.data[0].mal_id;
            }
        } catch (error) {
            console.error('Erreur lors de la recherche du manga:', error);
        }
        return null;
    }
} 