/**
 * catalogue.js - Gestion du catalogue d'animes
 */

// Variables globales
let catalogDiv = null;
const animes = [
  {
    id: 1,
    titre: "Attaque des Titans",
    synopsis: "Dans un monde où l'humanité est menacée par des titans mangeurs d'hommes, Eren Yeager et ses amis se battent pour leur survie.",
    genres: ["Action", "Drame", "Fantastique", "Shonen"],
    image: "https://cdn.myanimelist.net/images/anime/10/47347.jpg",
    rating: null,
    page: "attackontitan.html"
  },
  {
    id: 2,
    titre: "Death Note",
    synopsis: "Un lycéen découvre un carnet qui lui permet de tuer quiconque en écrit le nom.",
    genres: ["Mystère", "Psychologique", "Surnaturel", "Thriller", "Shonen"],
    image: "",
    rating: null,
    page: "deathnote.html"
  }
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

// Fonction utilitaire pour récupérer les notes
function getRatingFromStorage(animeId) {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.email) {
      const notesKey = 'user_anime_notes_' + user.email;
      const notes = JSON.parse(localStorage.getItem(notesKey) || '[]');
      const animeKeys = {1: 'attackontitan', 2: 'deathnote'};
      if (animeKeys[animeId]) {
        const found = notes.find(a => a.id === animeKeys[animeId]);
        if (found?.note) return found.note;
      }
    }
    const storedRatings = JSON.parse(localStorage.getItem('animeRatings') || '{}');
    return storedRatings[animeId] ?? null;
  } catch (e) {
    console.error('Erreur de lecture du stockage:', e);
    return null;
  }
}

// Synchronise les notes avec le stockage local
function syncRatings() {
  animes.forEach(anime => {
    try {
      anime.rating = getRatingFromStorage(anime.id);
    } catch (e) {
      anime.rating = null;
    }
  });
}

// Crée une carte d'anime
function createAnimeCard(anime) {
  const card = document.createElement('div');
  card.className = 'catalogue-card';
  card.innerHTML = `
    <a href="${anime.page}" class="anime-link">
      <img src="${anime.image}" alt="${anime.titre}" class="anime-image">
      <div class="anime-details">
        <h3>${anime.titre}</h3>
        <p>${truncateSynopsisAtNearestPeriod(anime.synopsis)}</p>
        <div class="anime-rating">
          ${anime.rating !== null ? 
            '★'.repeat(anime.rating) + '☆'.repeat(10 - anime.rating) + 
            ` (${anime.rating}/10)` : 'Pas encore noté'}
        </div>
      </div>
    </a>
  `;
  return card;
}

// Affiche les animes dans le catalogue
function displayAnimes(animesToShow = animes) {
  if (!catalogDiv) return;
  
  catalogDiv.innerHTML = '';
  animesToShow.forEach(anime => {
    try {
      catalogDiv.appendChild(createAnimeCard(anime));
    } catch (e) {
      console.error('Erreur d\'affichage:', e);
    }
  });
}

// Initialisation
function init() {
  catalogDiv = document.getElementById('manga-catalogue');
  if (!catalogDiv) return;
  
  syncRatings();
  displayAnimes();
  
  // Met à jour périodiquement les notes
  setInterval(syncRatings, 1000);
  
  // Écoute les changements de stockage
  window.addEventListener('storage', () => {
    syncRatings();
    displayAnimes();
  });
}

// Démarrage
document.addEventListener('DOMContentLoaded', init);
