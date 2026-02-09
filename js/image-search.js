// Configuration de l'API Unsplash
const UNSPLASH_CONFIG = {
    ACCESS_KEY: 'BH56gaKVIHupaKI0_-HQssw8YRL0ML-SX2KD-R5QY-4',
    API_URL: 'https://api.unsplash.com',
    DOWNLOAD_URL: 'https://api.unsplash.com/photos',
    APP_NAME: 'MangaWatch',
    APP_URL: 'https://votre-site.com'  // Remplacez par votre URL de production
};

// Récupération des éléments DOM
const searchInput = document.getElementById('imageSearchInput');
const searchBtn = document.getElementById('searchImagesBtn');
const searchResults = document.getElementById('searchResults');
let draggedItem = null;
// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier que les éléments nécessaires existent
    if (!searchInput || !searchBtn || !searchResults) {
        console.error('Impossible de trouver les éléments nécessaires pour la recherche d\'images');
        return;
    }
    
    // Configuration des écouteurs d'événements
    searchBtn.addEventListener('click', searchImages);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchImages();
        }
    });
    
        // Configurer le glisser-déposer pour les éléments existants
    setupDragAndDrop();
    
    // Afficher un message d'aide
    showNotification('Recherchez des images et glissez-les dans votre tier list !');
});

// Fonction appelée au début du glissement
function handleDragStart(e) {
    this.classList.add('dragging');
    draggedItem = this;
    e.dataTransfer.setData('text/plain', this.dataset.imgUrl);
    e.dataTransfer.effectAllowed = 'move';
}

// Fonction appelée à la fin du glissement
function handleDragEnd() {
    this.classList.remove('dragging');
}

// Fonction pour configurer le glisser-déposer
function setupDragAndDrop() {

    // Fonction appelée lorsqu'un élément est survolé pendant le glissement
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    // Fonction appelée lorsqu'un élément entre dans une zone de dépôt
    function handleDragEnter(e) {
        e.preventDefault();
        this.classList.add('drag-over');
    }

    // Fonction appelée lorsqu'un élément quitte une zone de dépôt
    function handleDragLeave() {
        this.classList.remove('drag-over');
    }

    // Fonction appelée lorsqu'un élément est déposé
    async function handleDrop(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        
        if (draggedItem) {
            const imgUrl = draggedItem.dataset.imgUrl;
            const downloadUrl = draggedItem.dataset.downloadUrl;
            const photographerName = draggedItem.dataset.photographerName;
            const photographerUrl = draggedItem.dataset.photographerUrl;
            const unsplashUrl = draggedItem.dataset.unsplashUrl;
            
            // Créer un conteneur pour l'image et son attribution
            const container = document.createElement('div');
            container.className = 'tier-item-container';
            
            // Créer l'élément image
            const imgElement = document.createElement('img');
            imgElement.src = imgUrl;
            imgElement.draggable = true;
            imgElement.className = 'tier-item';
            
            // Créer l'attribution
            const attribution = document.createElement('div');
            attribution.className = 'tier-item-attribution';
            attribution.innerHTML = `
                <span>Photo par </span>
                <a href="${photographerUrl}?utm_source=${encodeURIComponent(UNSPLASH_CONFIG.APP_NAME)}&utm_medium=referral" target="_blank">${photographerName}</a>
                <span> sur </span>
                <a href="${unsplashUrl}" target="_blank">Unsplash</a>
            `;
            
            container.appendChild(imgElement);
            container.appendChild(attribution);
            
            // Ajouter le conteneur à la rangée
            const tierItems = this.querySelector('.tier-items');
            if (tierItems) {
                tierItems.appendChild(container);
                
                // Enregistrer le téléchargement
                if (downloadUrl) {
                    try {
                        await trackDownload(downloadUrl);
                    } catch (error) {
                        console.error('Erreur lors du suivi du téléchargement:', error);
                    }
                }
                
                // Sauvegarder la tier list
                saveTierList();
                
                // Afficher une notification de succès
                showNotification('Image ajoutée à votre tier list !', 'success');
            }
        }
        
        return false;
    }

    // Configuration des événements pour les éléments de la tier list
    const tierRows = document.querySelectorAll('.tier-row');
    
    tierRows.forEach(row => {
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('dragenter', handleDragEnter);
        row.addEventListener('dragleave', handleDragLeave);
        row.addEventListener('drop', handleDrop);
    });
}

// Fonction pour sauvegarder la tier list (à implémenter selon votre logique)
function saveTierList() {
    // Implémentez la logique de sauvegarde ici
    console.log('Tier list sauvegardée');
}

// Fonction pour suivre les téléchargements sur Unsplash
async function trackDownload(downloadLocation) {
    if (!downloadLocation) return;
    
    try {
        const response = await fetch(`${downloadLocation}?client_id=${UNSPLASH_CONFIG.ACCESS_KEY}`);
        if (!response.ok) {
            throw new Error('Erreur lors du suivi du téléchargement');
        }
        return await response.json();
    } catch (error) {
        console.error('Erreur lors du suivi du téléchargement:', error);
        throw error;
    }
}

// Afficher une notification à l'utilisateur
function showNotification(message, type = 'info') {
    // Supprimer les notifications existantes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type} show`;
    notification.textContent = message;
    
    // Ajouter la notification au corps du document
    document.body.appendChild(notification);
    
    // Supprimer la notification après 5 secondes
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Fonction pour rechercher des images sur Unsplash
async function searchImages() {
    const query = searchInput.value.trim();
    
    if (!query) {
        showNotification('Veuillez entrer un terme de recherche', 'error');
        return;
    }
    
    try {
        // Afficher un indicateur de chargement
        searchResults.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Recherche en cours...</div>';
        
        // Paramètres de recherche avancés
        const params = new URLSearchParams({
            query: query,
            client_id: UNSPLASH_CONFIG.ACCESS_KEY,
            per_page: 24, // Plus de résultats
            order_by: 'relevant', // Tri par pertinence
            content_filter: 'high', // Contenu de haute qualité
            orientation: 'squarish', // Format carré pour les vignettes
            color: 'black_and_white', // Optionnel: pour un look plus cohérent
        });
        
        // Appeler l'API Unsplash avec les paramètres
        const response = await fetch(`${UNSPLASH_CONFIG.API_URL}/search/photos?${params}`);
        
        if (!response.ok) {
            throw new Error('Erreur lors de la recherche d\'images');
        }
        
        const data = await response.json();
        
        // Trier les résultats par popularité et pertinence
        const sortedResults = data.results.sort((a, b) => {
            // Priorité aux images populaires et de haute qualité
            const scoreA = (a.likes * 2) + (a.downloads * 0.5) + (a.views * 0.1);
            const scoreB = (b.likes * 2) + (b.downloads * 0.5) + (b.views * 0.1);
            return scoreB - scoreA;
        });
        
        displayResults(sortedResults);
        
    } catch (error) {
        console.error('Erreur:', error);
        searchResults.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Une erreur est survenue lors de la recherche.</p>
                <small>${error.message}</small>
            </div>`;
    }
}

// Fonction pour afficher les résultats de la recherche
function displayResults(images) {
    if (!images || images.length === 0) {
        searchResults.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>Aucun résultat trouvé. Essayez avec d'autres termes de recherche.</p>
            </div>`;
        return;
    }

    // Vider les résultats précédents
    searchResults.innerHTML = '';
    
    // Créer un conteneur de grille pour les images
    const gridContainer = document.createElement('div');
    gridContainer.className = 'image-grid';
    
    // Fonction pour charger une image avec gestion d'erreur
    function loadImage(cardElement, imgUrl, altText) {
        const img = cardElement.querySelector('img');
        if (!img) return;
        
        const tempImg = new Image();
        
        tempImg.onload = function() {
            if (img && img.parentNode) {
                img.src = imgUrl;
                img.alt = altText || 'Image';
                img.style.opacity = '1';
                img.classList.add('loaded');
                
                // Masquer le placeholder une fois l'image chargée
                const placeholder = cardElement.querySelector('.image-placeholder');
                if (placeholder) {
                    placeholder.style.display = 'none';
                }
            }
        };
        
        tempImg.onerror = function() {
            console.error('Erreur de chargement de l\'image:', imgUrl);
            if (img && img.parentNode) {
                img.style.opacity = '1';
                const tFn = window.t || (window.localization ? (key) => window.localization.get(key) : (key) => key);
                const imageNotLoadedText = tFn('common.image_not_loaded');
                const imageUnavailableText = tFn('common.image_unavailable');
                // Encoder le texte pour l'URL
                const encodedText = encodeURIComponent(imageNotLoadedText);
                img.src = `data:image/svg+xml;charset=UTF-8,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='12' text-anchor='middle' dominant-baseline='middle' fill='%23999'%3E${encodedText}%3C/text%3E%3C/svg%3E`;
                img.alt = imageUnavailableText;
            }
        };
        
        tempImg.src = imgUrl;
    }
    
    // Fonction pour charger l'avatar avec gestion d'erreur
    function loadAvatar(cardElement, avatarUrl, altText) {
        const avatarImg = cardElement.querySelector('.avatar');
        if (!avatarImg) return;
        
        if (!avatarUrl) {
            avatarImg.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg width=\'24\' height=\'24\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'12\' fill=\'%23ddd\'/%3E%3C/svg%3E';
            return;
        }
        
        const tempImg = new Image();
        tempImg.onload = function() {
            if (avatarImg && avatarImg.parentNode) {
                avatarImg.src = avatarUrl;
                avatarImg.alt = altText || 'Avatar';
            }
        };
        tempImg.onerror = function() {
            if (avatarImg && avatarImg.parentNode) {
                avatarImg.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg width=\'24\' height=\'24\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'12\' fill=\'%23ddd\'/%3E%3C/svg%3E';
                const tFn = window.t || (window.localization ? (key) => window.localization.get(key) : (key) => key);
                avatarImg.alt = tFn('common.avatar_unavailable');
            }
        };
        tempImg.src = avatarUrl;
    }
    
    // Créer les cartes d'images
    images.forEach((image, index) => {
        // Utiliser des images de meilleure qualité
        const imgUrl = image.urls?.small || image.urls?.thumb || '';
        const fullImgUrl = image.urls?.regular || imgUrl;
        const downloadUrl = image.links?.download_location || '';
        const photographerName = image.user?.name || 'Photographe inconnu';
        const photographerUrl = image.user?.links?.html ? 
            `${image.user.links.html}?utm_source=${encodeURIComponent(UNSPLASH_CONFIG.APP_NAME)}&utm_medium=referral` : 
            'https://unsplash.com';
        const unsplashUrl = 'https://unsplash.com';
        const avatarUrl = image.user?.profile_image?.small;
        const altText = image.alt_description || 'Image sans description';
        
        // Créer un élément de carte pour chaque image
        const cardElement = document.createElement('div');
        cardElement.className = 'image-card';
        cardElement.draggable = true;
        
        // Stocker les données pour le glisser-déposer
        cardElement.dataset.imgUrl = fullImgUrl;
        cardElement.dataset.downloadUrl = downloadUrl;
        cardElement.dataset.photographerName = photographerName;
        cardElement.dataset.photographerUrl = photographerUrl;
        cardElement.dataset.unsplashUrl = unsplashUrl;
        
        // Créer la structure de la carte avec un état de chargement
        cardElement.innerHTML = `
            <div class="image-container">
                <div class="image-placeholder">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <img 
                    src="data:image/svg+xml;charset=UTF-8,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23f5f5f5'/%3E%3C/svg%3E"
                    alt="Chargement..."
                    loading="lazy"
                >
                <div class="image-overlay">
                    <span class="likes"><i class="fas fa-heart"></i> ${image.likes || 0}</span>
                    <span class="downloads"><i class="fas fa-download"></i> ${image.downloads || 0}</span>
                </div>
            </div>
            <div class="image-info">
                <div class="photographer">
                    <img src="data:image/svg+xml;charset=UTF-8,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='12' fill='%23ddd'/%3E%3C/svg%3E" 
                         alt="" 
                         class="avatar"
                         loading="lazy">
                    <span>${photographerName}</span>
                </div>
                <a href="${fullImgUrl}" target="_blank" class="view-full" title="Voir en grand" rel="noopener noreferrer">
                    <i class="fas fa-expand"></i>
                </a>
            </div>
        `;
        
        // Charger l'image après un léger délai pour éviter de surcharger le navigateur
        setTimeout(() => {
            if (imgUrl) {
                loadImage(cardElement, imgUrl, altText);
            }
            if (avatarUrl) {
                loadAvatar(cardElement, avatarUrl, photographerName);
            }
        }, index * 100); // Délai progressif pour chaque image
        
        // Configurer le glisser-déposer
        cardElement.addEventListener('dragstart', handleDragStart);
        cardElement.addEventListener('dragend', handleDragEnd);
        
        // Ajouter un effet au survol
        cardElement.addEventListener('mouseenter', () => {
            const overlay = cardElement.querySelector('.image-overlay');
            if (overlay) overlay.style.opacity = '1';
        });
        cardElement.addEventListener('mouseleave', () => {
            const overlay = cardElement.querySelector('.image-overlay');
            if (overlay) overlay.style.opacity = '0';
        });
        
        gridContainer.appendChild(cardElement);
    });
    
    // Ajouter la grille au conteneur de résultats
    searchResults.appendChild(gridContainer);
}
