// Script pour générer des profils utilisateurs fictifs
// Ce script crée des utilisateurs avec des collections et notes réalistes

(function() {
    // Toujours mettre à jour les utilisateurs fictifs pour s'assurer que les données sont à jour
    // (bannières, descriptions, continents)
    const FAKE_USERS_FLAG = 'fake_users_initialized';

    // Animes/Mangas populaires pour les collections et notes
    // Utiliser des synopsis en anglais (originaux) qui seront traduits par l'API
    const popularAnimes = [
        { id: 1535, title: 'Death Note', titleEnglish: 'Death Note', image: 'https://cdn.myanimelist.net/images/anime/9/9453.jpg', type: 'anime', synopsis: 'Light Yagami finds a notebook that can kill anyone whose name is written in it. He decides to use it to rid the world of criminals and become the god of a new world.' },
        { id: 16498, title: 'Attack on Titan', titleEnglish: 'Attack on Titan', image: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg', type: 'anime', synopsis: 'Humanity lives inside cities surrounded by enormous walls that protect them from gigantic man-eating humanoids referred to as Titans.' },
        { id: 11061, title: 'Hunter x Hunter', titleEnglish: 'Hunter x Hunter (2011)', image: 'https://cdn.myanimelist.net/images/anime/11/33657.jpg', type: 'anime', synopsis: 'Gon Freecss wants to become a Hunter like his father. He takes the Hunter Examination and meets new friends along the way.' },
        { id: 1, title: 'Cowboy Bebop', titleEnglish: 'Cowboy Bebop', image: 'https://cdn.myanimelist.net/images/anime/4/19644.jpg', type: 'anime', synopsis: 'The adventures of a group of bounty hunters traveling on their spaceship, the Bebop, in the year 2071.' },
        { id: 21, title: 'One Piece', titleEnglish: 'One Piece', image: 'https://cdn.myanimelist.net/images/anime/6/73245.jpg', type: 'anime', synopsis: 'The adventures of Monkey D. Luffy and his pirate crew as they search for the ultimate treasure known as One Piece.' },
        { id: 20, title: 'Naruto', titleEnglish: 'Naruto', image: 'https://cdn.myanimelist.net/images/anime/13/17405.jpg', type: 'anime', synopsis: 'Naruto Uzumaki wants to become the Hokage, the leader of his village. He trains hard to become a powerful ninja.' },
        { id: 30276, title: 'One Punch Man', titleEnglish: 'One Punch Man', image: 'https://cdn.myanimelist.net/images/anime/12/76049.jpg', type: 'anime', synopsis: 'Saitama can defeat any opponent with a single punch. He becomes bored with his overwhelming power and seeks a worthy opponent.' },
        { id: 31964, title: 'Boku no Hero Academia', titleEnglish: 'My Hero Academia', image: 'https://cdn.myanimelist.net/images/anime/10/78745.jpg', type: 'anime', synopsis: 'In a world where superpowers are the norm, Izuku Midoriya dreams of becoming a hero despite being born without powers.' },
        { id: 22319, title: 'Tokyo Ghoul', titleEnglish: 'Tokyo Ghoul', image: 'https://cdn.myanimelist.net/images/anime/5/64449.jpg', type: 'anime', synopsis: 'Ken Kaneki becomes a half-ghoul after an accident. He must learn to live in both the human and ghoul worlds.' },
        { id: 38000, title: 'Kimetsu no Yaiba', titleEnglish: 'Demon Slayer', image: 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg', type: 'anime', synopsis: 'Tanjiro becomes a demon slayer after his family is killed by demons. He seeks to turn his sister back into a human.' },
        { id: 47, title: 'Fullmetal Alchemist', titleEnglish: 'Fullmetal Alchemist', image: 'https://cdn.myanimelist.net/images/anime/10/75715.jpg', type: 'anime', synopsis: 'The Elric brothers search for the Philosopher\'s Stone to restore their bodies after a failed alchemy experiment.' },
        { id: 20507, title: 'Haikyuu!!', titleEnglish: 'Haikyuu!!', image: 'https://cdn.myanimelist.net/images/anime/7/76014.jpg', type: 'anime', synopsis: 'A high school student passionate about volleyball joins his school\'s team and works hard to become a great player.' },
        { id: 9253, title: 'Steins;Gate', titleEnglish: 'Steins;Gate', image: 'https://cdn.myanimelist.net/images/anime/1935/127974.jpg', type: 'anime', synopsis: 'Rintarou discovers a machine that can send messages to the past. He experiments with time travel and faces dangerous consequences.' },
        { id: 23273, title: 'Shingeki no Kyojin', titleEnglish: 'Attack on Titan: Junior High', image: 'https://cdn.myanimelist.net/images/anime/12/76017.jpg', type: 'anime', synopsis: 'A comedic version of Attack on Titan where the characters attend a normal junior high school.' },
        { id: 1575, title: 'Code Geass', titleEnglish: 'Code Geass', image: 'https://cdn.myanimelist.net/images/anime/12/76941.jpg', type: 'anime', synopsis: 'Lelouch obtains the power of Geass, which allows him to command anyone to do anything. He uses it to rebel against the empire.' },
        { id: 23283, title: 'The Seven Deadly Sins', titleEnglish: 'The Seven Deadly Sins', image: 'https://cdn.myanimelist.net/images/anime/8/65409.jpg', type: 'anime', synopsis: 'The Knights of the Seven Deadly Sins are a group of powerful warriors who must save the kingdom from evil forces.' },
        { id: 1735, title: 'Naruto Shippuden', titleEnglish: 'Naruto Shippuden', image: 'https://cdn.myanimelist.net/images/anime/5/17407.jpg', type: 'anime', synopsis: 'Naruto returns after two years of training. He faces new challenges and stronger enemies in his quest to become Hokage.' },
        { id: 11757, title: 'Fairy Tail', titleEnglish: 'Fairy Tail', image: 'https://cdn.myanimelist.net/images/anime/10/75677.jpg', type: 'anime', synopsis: 'The adventures of the Fairy Tail magic guild. Lucy joins the guild and teams up with Natsu and his friends.' },
        { id: 6702, title: 'Fate/Zero', titleEnglish: 'Fate/Zero', image: 'https://cdn.myanimelist.net/images/anime/2/73249.jpg', type: 'anime', synopsis: 'The fourth Holy Grail War. Seven mages summon seven Servants to fight for the Holy Grail, a wish-granting device.' },
        { id: 28977, title: 'Gintama°', titleEnglish: 'Gintama°', image: 'https://cdn.myanimelist.net/images/anime/3/72078.jpg', type: 'anime', synopsis: 'The comedic adventures of Gintoki, a samurai who works odd jobs in an alternate-history Edo period where aliens have taken over.' }
    ];

    // Statuts possibles pour les collections
    const statuses = ['watching', 'completed', 'on-hold', 'dropped', 'plan-to-watch'];

    // Générer un nombre aléatoire entre min et max
    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Générer une date aléatoire dans les derniers mois
    function randomDate() {
        const now = new Date();
        const monthsAgo = randomInt(1, 12);
        const date = new Date(now.getTime() - (monthsAgo * 30 * 24 * 60 * 60 * 1000));
        return date.toISOString();
    }

    // Images de bannière pour les faux utilisateurs (images locales)
    const bannerImages = [
        '/images/kame_house.png',
        '/images/kame_house.png',
        '/images/kame_house.png',
        '/images/kame_house.png',
        '/images/kame_house.png',
        '/images/kame_house.png',
        '/images/kame_house.png',
        '/images/kame_house.png',
        '/images/kame_house.png',
        '/images/kame_house.png'
    ];
    
    // Descriptions courtes pour les faux utilisateurs
    const descriptions = [
        'Passionné d\'anime et de manga depuis mon enfance.',
        'Fan inconditionnel de culture japonaise.',
        'Otaku depuis 10 ans ! Action, aventure et fantastique.',
        'Amateur de shonen et seinen.',
        'Collectionneur de mangas. One Piece, Naruto, AOT.',
        'Passionné par les animes de sport et les comédies.',
        'Fan de culture pop japonaise depuis l\'adolescence.',
        'Amateur de thriller, mystère et psychologique.',
        'Otaku passionné ! J\'adore découvrir de nouveaux animes.',
        'Fan de shonen. Je collectionne les mangas.'
    ];
    
    // Continents possibles
    const continents = ['europe', 'amerique-nord', 'amerique-sud', 'asie', 'afrique', 'oceanie'];
    
    // Créer un profil utilisateur
    function createFakeUser(email, name, picture = null, continent = null, description = null, bannerImage = null) {
        const joinDate = new Date(2024, randomInt(0, 11), randomInt(1, 28));
        const selectedContinent = continent || continents[randomInt(0, continents.length - 1)];
        const selectedDescription = description || descriptions[randomInt(0, descriptions.length - 1)];
        const selectedBanner = bannerImage || bannerImages[randomInt(0, bannerImages.length - 1)];
        
        return {
            email: email,
            name: name,
            picture: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00b894&color=fff&size=200`,
            originalAvatar: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00b894&color=fff&size=200`,
            customAvatar: null,
            theme: 'dark',
            language: 'fr',
            continent: selectedContinent,
            description: selectedDescription,
            joinDate: joinDate.toISOString(),
            lastLogin: randomDate()
        };
    }

    // Créer une collection pour un utilisateur
    function createUserCollection(email, animes) {
        const collection = [];
        const numItems = randomInt(8, 25); // Entre 8 et 25 items dans la collection
        
        // Sélectionner des animes aléatoires
        const selectedAnimes = [];
        for (let i = 0; i < numItems; i++) {
            const anime = animes[randomInt(0, animes.length - 1)];
            if (!selectedAnimes.find(a => a.id === anime.id)) {
                selectedAnimes.push(anime);
            }
        }

        selectedAnimes.forEach(anime => {
            const status = statuses[randomInt(0, statuses.length - 1)];
            const episodes = anime.type === 'anime' ? randomInt(1, 200) : randomInt(1, 50);
            
            collection.push({
                id: anime.id,
                mal_id: anime.id,
                title: anime.title,
                titleEnglish: anime.titleEnglish,
                image: anime.image,
                imageUrl: anime.image,
                type: anime.type || 'anime',
                status: status,
                episodes: episodes,
                volumes: anime.type === 'manga' ? episodes : null,
                year: randomInt(2000, 2024),
                synopsis: anime.synopsis || 'Aucune description disponible.',
                genres: ['Action', 'Aventure'],
                addedAt: randomDate()
            });
        });

        return collection;
    }

    // Créer des notes d'animes pour un utilisateur
    function createUserNotes(email, animes) {
        const notes = [];
        const numNotes = randomInt(5, 15); // Entre 5 et 15 animes notés
        
        const selectedAnimes = [];
        for (let i = 0; i < numNotes; i++) {
            const anime = animes[randomInt(0, animes.length - 1)];
            if (!selectedAnimes.find(a => a.id === anime.id)) {
                selectedAnimes.push(anime);
            }
        }

        selectedAnimes.forEach(anime => {
            const rating = randomInt(5, 10); // Note entre 5 et 10
            
            notes.push({
                id: anime.id,
                mal_id: anime.id,
                malId: anime.id,
                title: anime.title,
                titleEnglish: anime.titleEnglish,
                titre: anime.title,
                image: anime.image,
                images: {
                    jpg: {
                        image_url: anime.image,
                        large_image_url: anime.image
                    }
                },
                contentType: 'anime',
                note: rating,
                rating: rating,
                synopsis: anime.synopsis || 'Aucune description disponible.',
                addedAt: randomDate()
            });
        });

        return notes;
    }

    // Liste des utilisateurs fictifs à créer avec leurs données
    // Tous les faux comptes ont le badge "Europe"
    const fakeUsers = [
        { email: 'otakuufan2024@example.com', name: 'OtakuuFan2024', continent: 'europe', description: descriptions[0], banner: bannerImages[0] },
        { email: 'mangacolector@example.com', name: 'MangaColector', continent: 'europe', description: descriptions[1], banner: bannerImages[1] },
        { email: 'anime_lover_99@example.com', name: 'AnimeLover99', continent: 'europe', description: descriptions[2], banner: bannerImages[2] },
        { email: 'weeb_master@example.com', name: 'WeebMaster', continent: 'europe', description: descriptions[3], banner: bannerImages[3] },
        { email: 'manga_otaku@example.com', name: 'MangaOtaku', continent: 'europe', description: descriptions[4], banner: bannerImages[4] },
        { email: 'anime_enthusiast@example.com', name: 'AnimeEnthusiast', continent: 'europe', description: descriptions[5], banner: bannerImages[5] },
        { email: 'japan_fan2024@example.com', name: 'JapanFan2024', continent: 'europe', description: descriptions[6], banner: bannerImages[6] },
        { email: 'otaku_collector@example.com', name: 'OtakuCollector', continent: 'europe', description: descriptions[7], banner: bannerImages[7] },
        { email: 'anime_watcher_pro@example.com', name: 'AnimeWatcherPro', continent: 'europe', description: descriptions[8], banner: bannerImages[8] },
        { email: 'manga_reader_x@example.com', name: 'MangaReaderX', continent: 'europe', description: descriptions[9], banner: bannerImages[9] }
    ];

    // Créer tous les utilisateurs fictifs
    fakeUsers.forEach((userData, index) => {
        // Créer le profil avec toutes les informations
        const profile = createFakeUser(
            userData.email, 
            userData.name, 
            null, 
            userData.continent, 
            userData.description, 
            userData.banner
        );
        
        // S'assurer que le profil contient bien le continent et la description
        profile.continent = userData.continent;
        profile.description = userData.description;
        
        localStorage.setItem('profile_' + userData.email, JSON.stringify(profile));

        // Créer l'avatar (optionnel, utiliser un avatar par défaut)
        const avatarKey = 'avatar_' + userData.email;
        if (!localStorage.getItem(avatarKey)) {
            localStorage.setItem(avatarKey, profile.picture);
        }

        // Créer/Mettre à jour la bannière - toujours forcer la mise à jour
        const bannerKey = 'profile_banner_' + userData.email;
        const bannerData = {
            type: 'image',
            url: userData.banner,
            volume: 0
        };
        localStorage.setItem(bannerKey, JSON.stringify(bannerData));

        // Créer/Mettre à jour la description - toujours forcer la mise à jour
        const descriptionKey = 'profile_description_' + userData.email;
        localStorage.setItem(descriptionKey, userData.description);
        
        // S'assurer aussi que le profil contient la description
        profile.description = userData.description;
        localStorage.setItem('profile_' + userData.email, JSON.stringify(profile));

        // Créer ou mettre à jour le compte avec le continent
        const accounts = JSON.parse(localStorage.getItem('accounts') || '[]');
        const accountIndex = accounts.findIndex(acc => acc.email === userData.email);
        if (accountIndex === -1) {
            accounts.push({
                email: userData.email,
                password: 'fake123', // Mot de passe par défaut pour les faux utilisateurs
                continent: userData.continent,
                langue: 'fr',
                username: userData.name
            });
            localStorage.setItem('accounts', JSON.stringify(accounts));
        } else {
            // Mettre à jour le compte existant
            accounts[accountIndex].continent = userData.continent;
            if (!accounts[accountIndex].username) {
                accounts[accountIndex].username = userData.name;
            }
            localStorage.setItem('accounts', JSON.stringify(accounts));
        }

        // Créer la collection
        const collection = createUserCollection(userData.email, popularAnimes);
        localStorage.setItem('user_list_' + userData.email, JSON.stringify(collection));

        // Créer les notes
        const notes = createUserNotes(userData.email, popularAnimes);
        localStorage.setItem('user_content_notes_' + userData.email, JSON.stringify(notes));
    });

    // Marquer comme initialisé (mais on met toujours à jour les données)
    localStorage.setItem(FAKE_USERS_FLAG, 'true');
    
    console.log(`✅ ${fakeUsers.length} utilisateurs fictifs créés/mis à jour avec succès !`);
    console.log('📝 Bannières, descriptions et continents mis à jour pour tous les utilisateurs.');
})();

// Script pour forcer la mise à jour des utilisateurs existants (à exécuter une fois)
(function() {
    // Supprimer cette ligne après la première exécution si nécessaire
    // localStorage.removeItem('fake_users_initialized');
})();

