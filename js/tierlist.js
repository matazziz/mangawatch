// Configuration
const CONFIG = {
  tiers: [
    { id: 's', label: 'S', color: '#ff7675' },
    { id: 'a', label: 'A', color: '#fdcb6e' },
    { id: 'b', label: 'B', color: '#55efc4' },
    { id: 'c', label: 'C', color: '#74b9ff' },
    { id: 'd', label: 'D', color: '#a29bfe' }
  ],
  defaultTier: 'unranked',
  localStorageKey: 'mangawatch_tierlist',
  maxItems: 100,
  imageSize: {
    width: 80,
    height: 100
  }
};

// État de l'application
const state = {
  items: [],
  draggedItem: null,
  selectedImages: [],
  isLoading: false
};

// Éléments du DOM
const dom = {
  container: document.querySelector('.tierlist-container'),
  unrankedItems: document.querySelector('.unranked-items'),
  addImagesBtn: document.getElementById('addImagesBtn'),
  saveBtn: document.getElementById('saveTierListBtn'),
  shareBtn: document.getElementById('shareTierListBtn'),
  resetBtn: document.getElementById('resetTierListBtn'),
  modal: document.getElementById('addImagesModal'),
  closeModal: document.querySelectorAll('.close-modal, #cancelAddImages'),
  imageUpload: document.getElementById('imageUpload'),
  searchImagesBtn: document.getElementById('searchImagesBtn'),
  imageSearchInput: document.getElementById('imageSearchInput'),
  searchResults: document.getElementById('searchResults'),
  searchResultsGrid: document.getElementById('searchResultsGrid'),
  selectedImagesPreview: document.getElementById('selectedImagesPreview'),
  selectedImagesGrid: document.getElementById('selectedImagesGrid'),
  confirmAddImages: document.getElementById('confirmAddImages')
};

// Initialisation de l'application
function init() {
  loadTierList();
  setupEventListeners();
  setupDragAndDrop();
  checkAuthStatus();
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
  // Bouton d'ajout d'images
  if (dom.addImagesBtn) {
    dom.addImagesBtn.addEventListener('click', showAddImagesModal);
  }
  
  // Bouton d'enregistrement
  if (dom.saveBtn) {
    dom.saveBtn.addEventListener('click', saveTierList);
  }
  
  // Bouton de partage
  if (dom.shareBtn) {
    dom.shareBtn.addEventListener('click', shareTierList);
  }
  
  // Bouton de réinitialisation
  if (dom.resetBtn) {
    dom.resetBtn.addEventListener('click', resetTierList);
  }
  
  // Fermeture de la modale
  if (dom.closeModal) {
    dom.closeModal.forEach(btn => {
      btn.addEventListener('click', hideAddImagesModal);
    });
  }
  
  // Téléchargement d'images
  if (dom.imageUpload) {
    dom.imageUpload.addEventListener('change', handleImageUpload);
  }
  
  // Recherche d'images
  if (dom.searchImagesBtn) {
    dom.searchImagesBtn.addEventListener('click', searchImages);
  }
  
  // Confirmation d'ajout d'images
  if (dom.confirmAddImages) {
    dom.confirmAddImages.addEventListener('click', addSelectedImages);
  }
  
  // Recherche au clavier
  if (dom.imageSearchInput) {
    dom.imageSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchImages();
      }
    });
  }
  
  // Clic en dehors de la modale pour la fermer
  window.addEventListener('click', (e) => {
    if (e.target === dom.modal) {
      hideAddImagesModal();
    }
  });
}

// Configuration du glisser-déposer
function setupDragAndDrop() {
  // Écouteurs pour les éléments de la tier list
  document.querySelectorAll('.tier-item').forEach(item => {
    setupDragEvents(item);
  });
  
  // Écouteurs pour les zones de dépôt (tiers et non classé)
  document.querySelectorAll('.tier-content, .unranked-items').forEach(dropZone => {
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragenter', handleDragEnter);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
  });
}

// Gestion du glisser-déposer
function setupDragEvents(element) {
  element.setAttribute('draggable', true);
  
  element.addEventListener('dragstart', (e) => {
    state.draggedItem = element;
    element.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', element.dataset.id);
  });
  
  element.addEventListener('dragend', () => {
    element.classList.remove('dragging');
    state.draggedItem = null;
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('dragover');
}

function handleDragEnter(e) {
  e.preventDefault();
  this.classList.add('dragover');
}

function handleDragLeave() {
  this.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('dragover');
  
  if (state.draggedItem) {
    const itemId = state.draggedItem.dataset.id;
    const targetTier = this.closest('.tier-content') ? 
      this.closest('.tier-content').dataset.tier : 'unranked';
    
    // Mettre à jour la position de l'élément
    moveItem(itemId, targetTier);
  }
}

// Déplacer un élément entre les tiers
function moveItem(itemId, targetTier) {
  const item = state.items.find(item => item.id === itemId);
  if (!item) return;
  
  // Mettre à jour le tier de l'élément
  item.tier = targetTier;
  
  // Mettre à jour l'interface utilisateur
  renderTierList();
  
  // Sauvegarder les changements
  saveToLocalStorage();
}

// Afficher la modale d'ajout d'images
function showAddImagesModal() {
  if (dom.modal) {
    dom.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Réinitialiser la sélection
    state.selectedImages = [];
    updateSelectedImagesPreview();
    
    // Réinitialiser le champ de téléchargement
    if (dom.imageUpload) {
      dom.imageUpload.value = '';
    }
    
    // Cacher les résultats de recherche
    if (dom.searchResults) {
      dom.searchResults.style.display = 'none';
    }
  }
}

// Masquer la modale d'ajout d'images
function hideAddImagesModal() {
  if (dom.modal) {
    dom.modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Gérer le téléchargement d'images
function handleImageUpload(e) {
  const files = Array.from(e.target.files);
  
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const imageUrl = event.target.result;
      
      // Ajouter l'image à la sélection
      state.selectedImages.push({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: imageUrl,
        source: 'upload',
        name: file.name
      });
      
      updateSelectedImagesPreview();
    };
    
    reader.readAsDataURL(file);
  });
}

// Mettre à jour l'aperçu des images sélectionnées
function updateSelectedImagesPreview() {
  if (!dom.selectedImagesGrid) return;
  
  // Vider la grille
  dom.selectedImagesGrid.innerHTML = '';
  
  if (state.selectedImages.length === 0) {
    if (dom.selectedImagesPreview) {
      dom.selectedImagesPreview.style.display = 'none';
    }
    if (dom.confirmAddImages) {
      dom.confirmAddImages.disabled = true;
      dom.confirmAddImages.textContent = 'Ajouter (0)';
    }
    return;
  }
  
  // Afficher la section d'aperçu
  if (dom.selectedImagesPreview) {
    dom.selectedImagesPreview.style.display = 'block';
  }
  
  // Activer le bouton de confirmation
  if (dom.confirmAddImages) {
    dom.confirmAddImages.disabled = false;
    dom.confirmAddImages.textContent = `Ajouter (${state.selectedImages.length})`;
  }
  
  // Ajouter les images à l'aperçu
  state.selectedImages.forEach((image, index) => {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'selected-image';
    imgContainer.style.position = 'relative';
    imgContainer.style.width = '60px';
    imgContainer.style.height = '60px';
    imgContainer.style.borderRadius = '4px';
    imgContainer.style.overflow = 'hidden';
    imgContainer.style.flexShrink = '0';
    
    const img = document.createElement('img');
    img.src = image.url;
    img.alt = image.name || 'Image sélectionnée';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-selected-image';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = 'Supprimer';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      state.selectedImages.splice(index, 1);
      updateSelectedImagesPreview();
    };
    
    imgContainer.appendChild(img);
    imgContainer.appendChild(removeBtn);
    dom.selectedImagesGrid.appendChild(imgContainer);
  });
}

// Rechercher des images en ligne
async function searchImages() {
  const query = dom.imageSearchInput ? dom.imageSearchInput.value.trim() : '';
  
  if (!query) {
    showNotification('Veuillez entrer un terme de recherche', 'warning');
    return;
  }
  
  // Afficher l'indicateur de chargement
  if (dom.searchImagesBtn) {
    const originalText = dom.searchImagesBtn.innerHTML;
    dom.searchImagesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recherche...';
    dom.searchImagesBtn.disabled = true;
    
    // Réinitialiser après un délai
    setTimeout(() => {
      if (dom.searchImagesBtn) {
        dom.searchImagesBtn.innerHTML = originalText;
        dom.searchImagesBtn.disabled = false;
      }
    }, 2000);
  }
  
  try {
    // Simuler une recherche (à remplacer par un appel API réel)
    await simulateSearch(query);
  } catch (error) {
    console.error('Erreur lors de la recherche d\'images:', error);
    showNotification('Erreur lors de la recherche d\'images', 'error');
  }
}

// Simuler une recherche d'images (à remplacer par un appel API réel)
async function simulateSearch(query) {
  // Afficher un message de simulation
  showNotification('Fonctionnalité de recherche à implémenter', 'info');
  
  // Simuler un délai de chargement
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Ici, vous pourriez appeler une API comme Unsplash, Pexels, etc.
  // Par exemple:
  // const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=VOTRE_CLE_API`);
  // const data = await response.json();
  // processSearchResults(data.results);
  
  // Pour l'instant, on affiche un message
  if (dom.searchResults) {
    dom.searchResults.style.display = 'block';
    dom.searchResultsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">
        <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
        <p>La recherche d'images nécessite une clé API (Unsplash, Pexels, etc.).</p>
        <p>Pour l'instant, vous pouvez télécharger des images depuis votre appareil.</p>
      </div>
    `;
  }
}

// Ajouter les images sélectionnées à la tier list
function addSelectedImages() {
  if (state.selectedImages.length === 0) {
    showNotification('Aucune image sélectionnée', 'warning');
    return;
  }
  
  // Ajouter chaque image à la zone non classée
  state.selectedImages.forEach(image => {
    addItemToTier(image.url, 'unranked', image.name);
  });
  
  // Sauvegarder les changements
  saveToLocalStorage();
  
  // Cacher la modale
  hideAddImagesModal();
  
  // Afficher une notification
  showNotification(`${state.selectedImages.length} image(s) ajoutée(s)`, 'success');
  
  // Réinitialiser la sélection
  state.selectedImages = [];
}

// Ajouter un élément à un tier spécifique
function addItemToTier(imageUrl, tierId, name = '') {
  // Vérifier si on n'a pas dépassé le nombre maximum d'éléments
  if (state.items.length >= CONFIG.maxItems) {
    showNotification(`Limite de ${CONFIG.maxItems} éléments atteinte`, 'warning');
    return null;
  }
  
  // Créer un nouvel élément
  const newItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    imageUrl,
    tier: tierId,
    name: name || `Image ${state.items.length + 1}`,
    createdAt: new Date().toISOString()
  };
  
  // Ajouter à l'état
  state.items.push(newItem);
  
  // Mettre à jour l'interface utilisateur
  renderTierList();
  
  return newItem;
}

// Afficher la tier list
function renderTierList() {
  // Vider tous les conteneurs
  document.querySelectorAll('.tier-content').forEach(container => {
    container.innerHTML = '';
  });
  
  if (dom.unrankedItems) {
    dom.unrankedItems.innerHTML = '';
  }
  
  // Si aucun élément, afficher un message dans la zone non classée
  if (state.items.length === 0 && dom.unrankedItems) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'Glissez des images ici ou cliquez sur "Ajouter des images"';
    dom.unrankedItems.appendChild(emptyMessage);
    return;
  }
  
  // Trier les éléments par tier
  const itemsByTier = {};
  CONFIG.tiers.forEach(tier => {
    itemsByTier[tier.id] = [];
  });
  itemsByTier.unranked = [];
  
  state.items.forEach(item => {
    if (itemsByTier.hasOwnProperty(item.tier)) {
      itemsByTier[item.tier].push(item);
    } else {
      itemsByTier.unranked.push(item);
    }
  });
  
  // Remplir chaque tier
  CONFIG.tiers.forEach(tier => {
    const container = document.querySelector(`.tier-content[data-tier="${tier.id}"]`);
    if (!container) return;
    
    const items = itemsByTier[tier.id] || [];
    
    items.forEach(item => {
      const itemElement = createTierItemElement(item);
      container.appendChild(itemElement);
    });
  });
  
  // Remplir la zone non classée
  if (dom.unrankedItems) {
    const unrankedItems = itemsByTier.unranked || [];
    
    if (unrankedItems.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent = 'Glissez des images ici';
      dom.unrankedItems.appendChild(emptyMessage);
    } else {
      unrankedItems.forEach(item => {
        const itemElement = createTierItemElement(item);
        dom.unrankedItems.appendChild(itemElement);
      });
    }
  }
}

// Créer un élément de tier
function createTierItemElement(item) {
  const itemElement = document.createElement('div');
  itemElement.className = 'tier-item';
  itemElement.dataset.id = item.id;
  
  const img = document.createElement('img');
  img.src = item.imageUrl;
  img.alt = item.name;
  
  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-btn';
  removeBtn.innerHTML = '&times;';
  removeBtn.title = 'Supprimer';
  removeBtn.onclick = (e) => {
    e.stopPropagation();
    removeItem(item.id);
  };
  
  itemElement.appendChild(img);
  itemElement.appendChild(removeBtn);
  
  // Configurer le glisser-déposer
  setupDragEvents(itemElement);
  
  return itemElement;
}

// Supprimer un élément
function removeItem(itemId) {
  const index = state.items.findIndex(item => item.id === itemId);
  if (index === -1) return;
  
  // Supprimer l'élément du tableau
  state.items.splice(index, 1);
  
  // Mettre à jour l'interface utilisateur
  renderTierList();
  
  // Sauvegarder les changements
  saveToLocalStorage();
  
  // Afficher une notification
  showNotification('Élément supprimé', 'success');
}

// Charger la tier list depuis le stockage local
function loadTierList() {
  const savedData = localStorage.getItem(CONFIG.localStorageKey);
  
  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData);
      state.items = parsedData.items || [];
      showNotification('Tier list chargée', 'success');
    } catch (error) {
      console.error('Erreur lors du chargement de la tier list:', error);
      state.items = [];
    }
  }
  
  // Afficher la tier list
  renderTierList();
}

// Enregistrer la tier list dans le stockage local
function saveTierList() {
  saveToLocalStorage();
  showNotification('Tier list enregistrée', 'success');
}

// Sauvegarder dans le stockage local
function saveToLocalStorage() {
  const dataToSave = {
    items: state.items,
    lastUpdated: new Date().toISOString()
  };
  
  try {
    localStorage.setItem(CONFIG.localStorageKey, JSON.stringify(dataToSave));
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la tier list:', error);
    showNotification('Erreur lors de la sauvegarde', 'error');
    return false;
  }
}

// Partager la tier list
function shareTierList() {
  // Vérifier si l'API Web Share est disponible
  if (navigator.share) {
    navigator.share({
      title: 'Ma Tier List MangaWatch',
      text: 'Découvrez ma tier list de mangas préférés !',
      url: window.location.href
    })
    .then(() => showNotification('Partage réussi', 'success'))
    .catch((error) => {
      console.error('Erreur lors du partage:', error);
      showNotification('Erreur lors du partage', 'error');
    });
  } else {
    // Fallback pour les navigateurs qui ne supportent pas l'API Web Share
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        showNotification('Lien copié dans le presse-papier', 'success');
      })
      .catch(() => {
        // Fallback si l'API Clipboard n'est pas disponible
        prompt('Copiez ce lien pour partager votre tier list:', shareUrl);
      });
  }
}

// Réinitialiser la tier list
function resetTierList() {
  if (confirm('Êtes-vous sûr de vouloir réinitialiser la tier list ? Toutes les données seront perdues.')) {
    state.items = [];
    saveToLocalStorage();
    renderTierList();
    showNotification('Tier list réinitialisée', 'success');
  }
}

// Vérifier l'état d'authentification
function checkAuthStatus() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginBtn = document.getElementById('loginBtn');
  
  if (user) {
    // Mettre à jour l'avatar si disponible
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar && user.photoURL) {
      userAvatar.src = user.photoURL;
      userAvatar.style.display = 'block';
    }
    
    // Afficher le bouton de déconnexion
    if (logoutBtn) {
      logoutBtn.style.display = 'block';
      logoutBtn.onclick = handleLogout;
    }
    
    // Cacher le bouton de connexion
    if (loginBtn) {
      loginBtn.style.display = 'none';
    }
  } else {
    // Cacher le bouton de déconnexion
    if (logoutBtn) {
      logoutBtn.style.display = 'none';
    }
    
    // Afficher le bouton de connexion
    if (loginBtn) {
      loginBtn.style.display = 'block';
      loginBtn.onclick = redirectToLogin;
    }
  }
}

// Gérer la déconnexion
function handleLogout() {
  localStorage.removeItem('user');
  window.location.href = 'index.html';
}

// Rediriger vers la page de connexion
function redirectToLogin() {
  window.location.href = 'login.html';
}

// Afficher une notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type} show`;
  
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'exclamation-circle';
  if (type === 'warning') icon = 'exclamation-triangle';
  
  notification.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
    <button class="notification-close">&times;</button>
  `;
  
  // Ajouter la notification au DOM
  document.body.appendChild(notification);
  
  // Fermer la notification au clic sur le bouton de fermeture
  const closeBtn = notification.querySelector('.notification-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      notification.remove();
    });
  }
  
  // Supprimer automatiquement après 5 secondes
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

// Démarrer l'application lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', init);
