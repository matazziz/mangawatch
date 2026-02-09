document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    if(query) {
      alert('Recherche : ' + query);
      // Ici tu pourrais rediriger ou lancer une recherche sur ton site
    }
  });
  document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
      alert('Recherche : ' + query);
      // Ici tu pourrais rediriger ou lancer une recherche sur ton site
    }
  });
  
  // ANCIEN SYSTÈME DE RECHERCHE DÉSACTIVÉ
  // Ce code créait un ancien système de recherche qui affichait des résultats en décalé
  // Il a été remplacé par le SearchManager dans search.js
  /*
  document.addEventListener('DOMContentLoaded', () => {
    const animes = [
      { titre: "Attack on Titan", genres: ["action", "drame"], image: "https://cdn.myanimelist.net/images/anime/10/47347.jpg" },
      { titre: "Death Note", genres: ["thriller", "drame"], image: "" },
      { titre: "Gintama", genres: ["comedie", "action"], image: "https://cdn.myanimelist.net/images/anime/13/8891.jpg" }
    ];
  
    const searchInput = document.getElementById('searchInput');
  
    const resultsDiv = document.createElement('div');
    resultsDiv.className = "search-results";
    searchInput.parentNode.appendChild(resultsDiv);
  
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase();
      resultsDiv.innerHTML = '';
      if (query.length > 1) {
        const matches = animes.filter(anime =>
          anime.titre.toLowerCase().includes(query)
        );
        matches.forEach(anime => {
          const result = document.createElement('div');
          result.className = "search-result-item";
  
          // Ajout de l'image
          const image = document.createElement('img');
          image.src = anime.image;
          image.alt = anime.titre;
          image.style.width = "50px"; // Taille de l'image
          image.style.marginRight = "10px";
  
          // Ajout des informations (titre et genres)
          const info = document.createElement('div');
          const title = document.createElement('span');
          title.textContent = anime.titre;
          title.style.fontWeight = "bold";
  
          const genres = document.createElement('span');
          genres.textContent = `Genres: ${anime.genres.join(', ')}`;
          genres.style.display = "block";
          genres.style.fontSize = "0.9em";
          genres.style.color = "#aaa";
  
          // Ajout des éléments dans le conteneur
          info.appendChild(title);
          info.appendChild(genres);
          result.appendChild(image);
          result.appendChild(info);
  
          result.onclick = function() {
            window.location.href = `mangas.html?genre=${anime.genres[0]}&anime=${encodeURIComponent(anime.titre)}`;
          };
          resultsDiv.appendChild(result);
        });
      }
    });
  });
  */
  
  // Nettoyage : supprimer tout div avec la classe "search-results" créé par l'ancien système
  document.addEventListener('DOMContentLoaded', () => {
    // Supprimer les anciens divs de résultats de recherche
    const oldSearchResults = document.querySelectorAll('.search-results:not(.search-results-dropdown)');
    oldSearchResults.forEach(div => {
      // Vérifier que ce n'est pas le dropdown officiel
      if (!div.id || div.id !== 'search-results') {
        div.remove();
      }
    });
  });