// Déclaration des variables globales
let catalogDiv = null;

// Données des animes
const animes = [
  {
    id: 1,
    titre: "Attaque des Titans",
    synopsis: "Dans un monde où l'humanité est menacée par des titans mangeurs d'hommes, Eren Yeager et ses amis se battent pour leur survie.",
    genres: ["Action", "Drame", "Fantastique", "Shonen"], // Anime Sama
    image: "https://cdn.myanimelist.net/images/anime/10/47347.jpg",
    rating: null,
    page: "attackontitan.html"
  },
  {
    id: 2,
    titre: "Death Note",
    synopsis: "Un lycéen découvre un carnet qui lui permet de tuer quiconque en écrit le nom.",
    genres: ["Mystère", "Psychologique", "Surnaturel", "Thriller", "Shonen"], // Anime Sama
    image:"",
    rating: null,
    page: "deathnote.html"
  },
  {
    id: 3,
    titre: "Naruto",
    synopsis: "Naruto Uzumaki est un jeune ninja rejeté par son village à cause du démon renard à neuf queues scellé en lui. Il rêve de devenir Hokage pour être reconnu de tous.",
    genres: ["Action", "Aventure", "Comédie", "Drame", "Fantastique", "Shonen"], // Anime Sama
    image: "https://cdn.myanimelist.net/images/anime/13/17405.jpg",
    rating: null,
    page: "naruto.html"
  },
  {
    id: 4,
    titre: "One Piece",
    synopsis: "Monkey D. Luffy, un jeune pirate au corps élastique, part à la recherche du légendaire trésor One Piece afin de devenir le Roi des Pirates. Il se fait des amis et affronte de puissants ennemis lors de son aventure sur les mers.",
    genres: ["Action", "Aventure", "Comédie", "Fantastique", "Shonen"], // Anime Sama
    image: "https://cdn.myanimelist.net/images/anime/6/73245.jpg",
    rating: null,
    page: "onepiece.html"
  }
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

// Remplace la fonction getRatingFromStorage pour prendre en compte la note du profil utilisateur
function getRatingFromStorage(animeId) {
  // Cherche la note dans le profil utilisateur (clé user_anime_notes_<email>)
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user && user.email) {
    const notesKey = 'user_anime_notes_' + user.email;
    try {
      const notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
      // Pour Attaque des Titans, l'id dans le profil est 'attackontitan'
      if (animeId === 1) {
        const found = notes.find(a => a.id === 'attackontitan');
        if (found && found.note) return found.note;
      }
      // Pour Death Note, l'id dans le profil est 'deathnote'
      if (animeId === 2) {
        const found = notes.find(a => a.id === 'deathnote');
        if (found && found.note) return found.note;
      }
      // Ajoutez ici d'autres correspondances si besoin pour d'autres animes
    } catch (e) {}
  }
  // Sinon, fallback sur animeRatings
  const storedRatings = JSON.parse(localStorage.getItem('animeRatings')) || {};
  return storedRatings[animeId] || null;
}

function syncRatingsWithLocalStorage() {
  animes.forEach(anime => {
    const storedRating = getRatingFromStorage(anime.id);
    if (storedRating !== null) {
      anime.rating = storedRating;
    } else {
      anime.rating = null;
    }
  });
}

function createAnimeCard(anime) {
  const animeDiv = document.createElement('div');
  animeDiv.className = "catalogue-card";

  const link = document.createElement('a');
  link.href = anime.page;
  link.className = "anime-link";

  const image = document.createElement('img');
  image.src = anime.image;
  image.alt = anime.titre;
  image.className = "anime-image";
  // L'image prend une largeur un peu plus grande, hauteur auto, pas de crop
  image.style.width = '110%';
  image.style.height = 'auto';
  image.style.maxHeight = '230px';
  image.style.objectFit = 'contain';
  image.style.borderRadius = '6px';

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

  // Toujours récupérer la note la plus à jour depuis localStorage
  const liveRating = getRatingFromStorage(anime.id);
  if (liveRating !== null) {
    const stars = document.createElement('span');
    stars.className = "stars";
    stars.textContent = "★".repeat(liveRating) + "☆".repeat(10 - liveRating);

    const ratingText = document.createElement('span');
    ratingText.className = "rating-text";
    ratingText.textContent = ` (${liveRating}/10)`;

    ratingDiv.appendChild(stars);
    ratingDiv.appendChild(ratingText);
  } else {
    const noRatingText = document.createElement('span');
    noRatingText.className = "no-rating-text";
    noRatingText.textContent = "Pas encore noté";
    ratingDiv.appendChild(noRatingText);
  }

  detailsDiv.appendChild(title);
  detailsDiv.appendChild(synopsis);
  detailsDiv.appendChild(ratingDiv);

  link.appendChild(image);
  link.appendChild(detailsDiv);
  animeDiv.appendChild(link);

  // Ajouter l'attribut data-anime-id pour l'identification
  animeDiv.setAttribute('data-anime-id', anime.id);
  
  // Activer le glisser-déposer sécurisé si la fonction est disponible
  if (typeof secureDragStart === 'function') {
    secureDragStart(animeDiv);
  }

  return animeDiv;
}

function displayAnimes(filteredAnimes = animes) {
  if (!catalogDiv) return; // N'affiche rien si pas de catalogue sur la page
  catalogDiv.innerHTML = '';
  
  // Filtrer les contenus interdits pour les mineurs
  let animesToDisplay = filteredAnimes;
  if (typeof filterForbiddenContent === 'function') {
    animesToDisplay = filterForbiddenContent(filteredAnimes);
  }
  
  animesToDisplay.forEach(anime => {
    catalogDiv.appendChild(createAnimeCard(anime));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  catalogDiv = document.getElementById('manga-catalogue');
  const searchInput = document.getElementById('searchInput');
  const genreButtons = document.querySelectorAll('.genre-card'); // Boutons de genres existants

  // Vérifiez que searchInput existe avant de continuer
  if (!searchInput) {
    console.warn('L\'élément avec id="searchInput" est introuvable dans le DOM.');
    return;
  }

  // Ajout d'un conteneur pour les résultats de recherche sous la barre de recherche
  let searchResultsDiv = document.getElementById('search-results');
  if (!searchResultsDiv) {
    searchResultsDiv = document.createElement('div');
    searchResultsDiv.id = 'search-results';
    // Style de base pour la visibilité
    searchResultsDiv.style.position = 'absolute';
    searchResultsDiv.style.background = '#fff';
    searchResultsDiv.style.border = '1px solid #ccc';
    searchResultsDiv.style.width = searchInput.offsetWidth + 'px';
    searchResultsDiv.style.maxHeight = '300px';
    searchResultsDiv.style.overflowY = 'auto';
    searchResultsDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    searchResultsDiv.style.zIndex = '1000';
    searchResultsDiv.style.display = 'none';
    // Insère juste après searchInput
    searchInput.parentNode.insertBefore(searchResultsDiv, searchInput.nextSibling);
  }

  // Fonction pour afficher les animes filtrés
  function displayAnimes(filteredAnimes = animes) {
    if (!catalogDiv) return; // N'affiche rien si pas de catalogue sur la page
    catalogDiv.innerHTML = '';
    filteredAnimes.forEach(anime => {
      catalogDiv.appendChild(createAnimeCard(anime));
    });
  }

  // Fonction pour filtrer les animes par genres sélectionnés
  function filterByGenres() {
    const selectedGenres = Array.from(document.querySelectorAll('.genre-card.active')).map(btn => btn.getAttribute('data-genre').toLowerCase());
    
    // Filtrer les genres interdits pour les mineurs
    let availableGenres = selectedGenres;
    if (typeof filterForbiddenGenres === 'function') {
      const genreButtons = Array.from(document.querySelectorAll('.genre-card'));
      const allGenres = genreButtons.map(btn => btn.getAttribute('data-genre'));
      const filteredGenres = filterForbiddenGenres(allGenres);
      availableGenres = selectedGenres.filter(genre => 
        filteredGenres.some(g => g.toLowerCase() === genre)
      );
    }
    
    if (availableGenres.length > 0) {
      const filteredAnimes = animes.filter(anime =>
        availableGenres.every(genre => anime.genres.map(g => g.toLowerCase()).includes(genre))
      );
      displayAnimes(filteredAnimes);
    } else {
      displayAnimes(); // Affiche tous les animes si aucun genre n'est sélectionné
    }
  }

  // Fonction pour afficher les résultats de recherche sous la barre de recherche - DÉSACTIVÉ
  // Cette fonction est maintenant gérée par le SearchManager dans search.js
  /*
  function displaySearchResults(filteredAnimes) {
    // Si on est sur la page catalogue (catalogDiv existe), ne rien afficher dans la barre de recherche
    if (catalogDiv) {
      searchResultsDiv.style.display = 'none';
      return;
    }
    searchResultsDiv.innerHTML = '';
    if (filteredAnimes.length === 0 || searchInput.value.trim() === '') {
      searchResultsDiv.style.display = 'none';
      return;
    }
    filteredAnimes.forEach(anime => {
      const resultCard = document.createElement('div');
      resultCard.className = 'search-result-card';
      resultCard.style.display = 'flex';
      resultCard.style.alignItems = 'center';
      resultCard.style.gap = '10px';
      resultCard.style.padding = '8px 0';

      const img = document.createElement('img');
      img.src = anime.image;
      img.alt = anime.titre;
      img.style.width = '40px';
      img.style.height = '60px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '4px';

      const infoDiv = document.createElement('div');
      infoDiv.style.display = 'flex';
      infoDiv.style.flexDirection = 'column';

      const titleRow = document.createElement('div');
      titleRow.style.display = 'flex';
      titleRow.style.alignItems = 'center';
      titleRow.style.gap = '8px';

      const title = document.createElement('span');
      title.textContent = anime.titre;
      title.style.fontWeight = 'bold';

      // Genres à côté du titre
      const genresSpan = document.createElement('span');
      genresSpan.className = "anime-genres";
      genresSpan.style.fontSize = '0.9em';
      genresSpan.style.color = '#888';
      genresSpan.textContent = anime.genres.join(', ');

      // Note à côté
      const ratingSpan = document.createElement('span');
      ratingSpan.style.marginLeft = '8px';
      if (anime.rating !== null) {
        ratingSpan.textContent = `★ ${anime.rating}/10`;
        ratingSpan.style.color = '#f5b50a';
        ratingSpan.style.fontWeight = 'bold';
      } else {
        ratingSpan.textContent = 'Pas encore noté';
        ratingSpan.style.color = '#aaa';
      }

      titleRow.appendChild(title);
      titleRow.appendChild(genresSpan);
      titleRow.appendChild(ratingSpan);

      infoDiv.appendChild(titleRow);

      resultCard.appendChild(img);
      resultCard.appendChild(infoDiv);

      resultCard.addEventListener('click', () => {
        window.location.href = anime.page;
      });

      searchResultsDiv.appendChild(resultCard);
    });
    searchResultsDiv.style.display = 'block';
  }
  */

  // Gestion des événements pour les boutons de genres
  genreButtons.forEach(button => {
    button.addEventListener('click', () => {
      button.classList.toggle('active'); // Ajoute ou retire la classe active
      filterByGenres(); // Filtre les animes en fonction des genres sélectionnés
    });
  });

  // Gestion de la recherche - DÉSACTIVÉ pour utiliser le nouveau système dans search.js
  // Cette ancienne logique est maintenant gérée par le SearchManager dans search.js
  /*
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const selectedGenres = Array.from(document.querySelectorAll('.genre-card.active')).map(btn => btn.getAttribute('data-genre').toLowerCase());

    const filteredAnimes = animes.filter(anime => {
      const matchesSearch = anime.titre.toLowerCase().includes(query);
      const matchesGenres = selectedGenres.length === 0 || selectedGenres.every(genre => anime.genres.map(g => g.toLowerCase()).includes(genre));
      return matchesSearch && matchesGenres;
    });

    if (catalogDiv) {
      displayAnimes(filteredAnimes);
    }

    displaySearchResults(filteredAnimes);
  });
  */

  // Cacher les résultats quand on clique ailleurs - DÉSACTIVÉ car géré par search.js maintenant
  /*
  document.addEventListener('click', (e) => {
    if (!searchResultsDiv.contains(e.target) && e.target !== searchInput) {
      searchResultsDiv.style.display = 'none';
    }
  });
  */

  // Synchronisation des notes avec localStorage
  syncRatingsWithLocalStorage();

  // Affichage initial
  if (catalogDiv) {
    displayAnimes();
  }

  // Met à jour le catalogue quand la page devient visible (ex: retour depuis une fiche)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      syncRatingsWithLocalStorage();
      if (catalogDiv) displayAnimes();
    }
  });

  // Mettre à jour en temps réel lors d'un changement de note dans localStorage (autre onglet)
  window.addEventListener('storage', (event) => {
    if (event.key === 'animeRatings') {
      syncRatingsWithLocalStorage();
      if (catalogDiv) displayAnimes();
    }
  });

  // Mettre à jour en temps réel lors d'un changement de note dans ce même onglet
  setInterval(() => {
    let changed = false;
    animes.forEach(anime => {
      const current = getRatingFromStorage(anime.id);
      if (anime.rating !== current) {
        anime.rating = current;
        changed = true;
      }
    });
    if (changed && catalogDiv) {
      displayAnimes();
    }
  }, 1000);
});

// Synchronisation automatique des notes définies dans les pages HTML individuelles
window.addEventListener('load', () => {
  syncRatingsWithLocalStorage();
  displayAnimes();
});