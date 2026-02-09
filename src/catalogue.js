// Données des animes
const animes = [
    {
        id: 1,
        titre: "Attack on Titan",
        synopsis: "Dans un monde où l'humanité est menacée par des titans mangeurs d'hommes, Eren Yeager et ses amis se battent pour leur survie.",
        genres: ["action", "drame"],
        image: "https://cdn.myanimelist.net/images/anime/10/47347.jpg",
        rating: null
    },
    {
        id: 2,
        titre: "Death Note",
        synopsis: "Un lycéen découvre un carnet qui lui permet de tuer quiconque en écrit le nom.",
        genres: ["thriller", "psychologique", "surnaturel", "shonen"],
        image: "",
        rating: null
    },
    // Ajoutez d'autres animes ici...
];

// Fonction pour nettoyer les espaces doubles dans le texte
function cleanSpaces(text) {
    if (!text) return '';
    // Remplacer les espaces doubles par des espaces simples
    return text.replace(/\s+/g, ' ').trim();
}

// Fonction pour tronquer le synopsis à exactement 5 lignes
function truncateSynopsisAtNearestPeriod(synopsis) {
    if (!synopsis) return '';
    
    // Nettoyer les espaces doubles
    let text = cleanSpaces(synopsis);
    
    // Calculer approximativement la longueur pour 5 lignes
    // Avec line-height: 1.6 et font-size: 0.95rem, environ 180 caractères pour 5 lignes
    const maxLength = 180;
    
    if (text.length <= maxLength) {
        return text;
    }
    
    // Tronquer brutalement à 5 lignes maximum
    return text.substring(0, maxLength);
}

// Fonction pour récupérer la note depuis localStorage
function getRatingFromStorage(animeId) {
    const storedRatings = JSON.parse(localStorage.getItem('animeRatings')) || {};
    return storedRatings[animeId] || null;
}

// Fonction pour sauvegarder la note dans localStorage
function saveRatingToStorage(animeId, rating) {
    const storedRatings = JSON.parse(localStorage.getItem('animeRatings')) || {};
    storedRatings[animeId] = rating;
    localStorage.setItem('animeRatings', JSON.stringify(storedRatings));
}

// Fonction pour créer une carte d'anime
function createAnimeCard(anime) {
    const animeDiv = document.createElement('div');
    animeDiv.className = "catalogue-card";

    const link = document.createElement('a');
    link.href = `pages/deathnote.html?id=${anime.id}`;
    link.className = "anime-link";

    const image = document.createElement('img');
    image.src = anime.image;
    image.alt = anime.titre;
    image.className = "anime-image";

    const detailsDiv = document.createElement('div');
    detailsDiv.className = "anime-details";

    const title = document.createElement('h3');
    title.className = "anime-title";
    title.textContent = anime.titre;

    const synopsis = document.createElement('p');
    synopsis.className = "anime-synopsis";
    synopsis.textContent = truncateSynopsisAtNearestPeriod(anime.synopsis);

    const ratingDiv = document.createElement('div');
    ratingDiv.className = "anime-rating";

    // Système de notation
    const starsDiv = document.createElement('div');
    starsDiv.className = "stars-input";
    
    for (let i = 1; i <= 10; i++) {
        const star = document.createElement('span');
        star.textContent = '★';
        star.dataset.value = i;
        star.addEventListener('click', () => rateAnime(anime.id, i));
        starsDiv.appendChild(star);
    }

    const ratingResult = document.createElement('p');
    ratingResult.id = `rating-result-${anime.id}`;
    ratingResult.className = "rating-result";
    
    // Afficher la note si elle existe
    const storedRating = getRatingFromStorage(anime.id);
    if (storedRating) {
        updateStars(starsDiv, storedRating);
        ratingResult.textContent = `Votre note : ${storedRating}/10`;
    } else {
        ratingResult.textContent = 'Votre note : Pas encore notée';
    }

    ratingDiv.appendChild(starsDiv);
    ratingDiv.appendChild(ratingResult);

    detailsDiv.appendChild(title);
    detailsDiv.appendChild(synopsis);
    detailsDiv.appendChild(ratingDiv);

    link.appendChild(image);
    link.appendChild(detailsDiv);
    animeDiv.appendChild(link);

    return animeDiv;
}

// Fonction pour mettre à jour les étoiles
function updateStars(starsDiv, rating) {
    const stars = starsDiv.querySelectorAll('span');
    stars.forEach((star, index) => {
        star.classList.toggle('selected', index < rating);
    });
}

// Fonction pour noter un anime
function rateAnime(animeId, rating) {
    const starsDiv = document.querySelector(`.stars-input[data-anime-id="${anime.id}"]`);
    if (starsDiv) {
        updateStars(starsDiv, rating);
        saveRatingToStorage(anime.id, rating);
        const resultDiv = document.querySelector(`#rating-result-${anime.id}`);
        resultDiv.textContent = `Votre note : ${rating}/10`;
    }
}

// Fonction pour afficher les animes
function displayAnimes(animesList = animes) {
    const catalogue = document.getElementById('manga-catalogue');
    catalogue.innerHTML = '';
    
    animesList.forEach(anime => {
        const card = createAnimeCard(anime);
        catalogue.appendChild(card);
    });
}

// Fonction de filtrage des animes
function filterAnimes() {
    const activeGenres = Array.from(document.querySelectorAll('.genre-card.active'))
        .map(button => button.dataset.genre);
        
    const filteredAnimes = animes.filter(anime => {
        if (activeGenres.length === 0) return true;
        return anime.genres.some(genre => activeGenres.includes(genre));
    });

    displayAnimes(filteredAnimes);
}

// Gestion de la recherche
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchTerm = searchInput.value.toLowerCase();
    const filteredAnimes = animes.filter(anime => 
        anime.titre.toLowerCase().includes(searchTerm) ||
        anime.genres.some(genre => genre.toLowerCase().includes(searchTerm))
    );
    displayAnimes(filteredAnimes);
});

// Initialisation
window.addEventListener('load', () => {
    // Afficher tous les animes au chargement
    displayAnimes();
    
    // Gestion des boutons de genres
    document.querySelectorAll('.genre-card').forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active');
            filterAnimes();
        });
    });
});
