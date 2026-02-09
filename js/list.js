// Gestion de la page List
// Import du service Firebase pour la collection
import { collectionService } from './firebase-service.js';

document.addEventListener('DOMContentLoaded', function() {
    const listItems = document.getElementById('list-items');
    const emptyList = document.getElementById('empty-list');
    const statusFilters = document.querySelectorAll('.status-filter');
    const typeFilters = document.querySelectorAll('.type-filter');
    const statusModal = document.getElementById('status-modal');
    const closeModal = document.querySelector('.close-modal');
    const statusOptions = document.querySelectorAll('.status-option');
    
    // Variables de pagination
    const paginationContainer = document.getElementById('pagination-container');
    const paginationText = document.getElementById('pagination-text');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageNumbersContainer = document.getElementById('page-numbers');
    
    let currentFilter = 'all';
    let currentTypeFilter = 'all';
    let currentItemId = null;
    let currentPage = 1;
    let itemsPerPage = 120; // 4 cartes par ligne × 30 lignes
    let allItems = []; // Tous les items filtrés
    let currentPageItems = []; // Items de la page actuelle
    
    // Initialiser la page
    initList();
    
    // Mettre à jour les cartes (badges type + épisodes/volumes) au changement de langue
    document.addEventListener('languageChanged', function() {
        updateCollectionCardsLabels();
    });
    
    // Rafraîchir l'affichage quand la page devient visible
    document.addEventListener('visibilitychange', async function() {
        if (!document.hidden) {
            // Recharger complètement la liste
            await loadUserList();
            await updateStats();
            
            // Réappliquer le filtre actuel
            if (currentFilter && currentFilter !== 'all') {
                await filterItems(currentFilter);
            } else {
                // S'assurer que tous les éléments sont visibles
                const items = document.querySelectorAll('.list-item');
                items.forEach(item => {
                    item.style.display = 'flex';
                });
                emptyList.style.display = 'none';
            }
        }
    });
    
    // Gestionnaires d'événements pour les filtres de statut
    statusFilters.forEach(filter => {
        filter.addEventListener('click', async function() {
            const status = this.dataset.status;
            setActiveFilter(status);
            await filterItems(status);
        });
    });
    
    // Gestionnaires d'événements pour les filtres de type
    typeFilters.forEach(filter => {
        filter.addEventListener('click', async function() {
            const type = this.dataset.type;
            setActiveTypeFilter(type);
            await filterItems(currentFilter);
        });
    });
    
    // Gestionnaires d'événements pour le modal
    closeModal.addEventListener('click', closeStatusModal);
    statusModal.addEventListener('click', function(e) {
        if (e.target === statusModal) {
            closeStatusModal();
        }
    });
    
    let selectedStatus = null;
    
    // Fonction pour afficher le popup "où vous êtes-vous arrêté"
    async function showStoppedAtPopup(itemId, status, callback) {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user || !user.email) return;
        
        const item = await collectionService.getItemByContentId(user.email, itemId);
        
        if (!item) return;
        
        const normalizedType = normalizeItemType(item.type);
        const isAnime = normalizedType === 'anime';
        
        // Créer le popup
        const popup = document.createElement('div');
        popup.className = 'stopped-at-popup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            backdrop-filter: blur(5px);
            animation: fadeIn 0.3s ease;
        `;
        
        // Utiliser "volume" pour les mangas au lieu de "chapitre"
        const labelText = isAnime ? 
            (window.localization ? window.localization.get('collection.stopped_at.episode') : 'épisode') :
            (window.localization ? window.localization.get('collection.stopped_at.volume') : 'volume');
        
        const titleText = window.localization ? window.localization.get('collection.stopped_at.label') : 'Où vous êtes-vous arrêté ?';
        const hintText = window.localization ? window.localization.get('collection.stopped_at.hint') : 'Indiquez le numéro d\'épisode ou de volume où vous vous êtes arrêté';
        const confirmText = window.localization ? window.localization.get('collection.confirm_status') : 'Confirmer';
        const cancelText = window.localization ? window.localization.get('collection.delete.cancel') : 'Annuler';
        
        popup.innerHTML = `
            <div class="popup-content" style="
                background: var(--dark, #1a1a1a);
                border-radius: 12px;
                padding: 30px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.1);
                animation: slideIn 0.3s ease;
            ">
                <h3 style="color: var(--light, #fff); margin-bottom: 20px; font-size: 1.3rem;">${titleText}</h3>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px; justify-content: center;">
                    <button class="decrement-btn" style="
                        width: 45px;
                        height: 45px;
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        color: var(--light, #fff);
                        font-size: 20px;
                        font-weight: bold;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">−</button>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1;">
                        <input 
                            type="number" 
                            id="popup-stopped-at-input" 
                            min="1" 
                            placeholder="0" 
                            value="${item.stoppedAt || ''}"
                            style="
                                width: 100%;
                                padding: 12px;
                                background: rgba(255, 255, 255, 0.1);
                                border: 1px solid rgba(255, 255, 255, 0.2);
                                border-radius: 8px;
                                color: var(--light, #fff);
                                font-size: 24px;
                                font-weight: bold;
                                text-align: center;
                            "
                        >
                        <span style="color: var(--light-gray, #aaa); font-size: 0.9rem;">${labelText}</span>
                    </div>
                    <button class="increment-btn" style="
                        width: 45px;
                        height: 45px;
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        color: var(--light, #fff);
                        font-size: 20px;
                        font-weight: bold;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">+</button>
                </div>
                <p style="color: var(--light-gray, #aaa); font-size: 0.85rem; margin-bottom: 20px; text-align: left;">${hintText}</p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button class="cancel-popup-btn" style="
                        padding: 12px 25px;
                        background: rgba(255, 255, 255, 0.1);
                        color: var(--light, #fff);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.3s ease;
                    ">${cancelText}</button>
                    <button class="confirm-popup-btn" style="
                        padding: 12px 25px;
                        background: #00b894;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.3s ease;
                    ">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        const input = popup.querySelector('#popup-stopped-at-input');
        const confirmBtn = popup.querySelector('.confirm-popup-btn');
        const cancelBtn = popup.querySelector('.cancel-popup-btn');
        const incrementBtn = popup.querySelector('.increment-btn');
        const decrementBtn = popup.querySelector('.decrement-btn');
        
        // Gestion des boutons +/-
        incrementBtn.addEventListener('click', () => {
            const currentValue = parseInt(input.value) || 0;
            input.value = Math.max(1, currentValue + 1);
            input.dispatchEvent(new Event('input'));
        });
        
        decrementBtn.addEventListener('click', () => {
            const currentValue = parseInt(input.value) || 0;
            input.value = Math.max(1, currentValue - 1);
            input.dispatchEvent(new Event('input'));
        });
        
        // Empêcher les valeurs négatives
        input.addEventListener('input', () => {
            if (input.value < 1) {
                input.value = 1;
            }
        });
        
        // Focus sur l'input
        setTimeout(() => input.focus(), 100);
        
        // Confirmer
        const confirm = () => {
            const value = input.value.trim();
            const stoppedAt = value && !isNaN(value) && parseInt(value) > 0 ? parseInt(value) : null;
            popup.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(popup);
                if (callback) callback(stoppedAt);
            }, 300);
        };
        
        confirmBtn.addEventListener('click', confirm);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') confirm();
        });
        
        // Annuler
        cancelBtn.addEventListener('click', () => {
            popup.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(popup);
            }, 300);
        });
        
        // Fermer en cliquant à l'extérieur
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    document.body.removeChild(popup);
                }, 300);
            }
        });
        
        // Fermer avec Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                popup.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    document.body.removeChild(popup);
                }, 300);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    // Gestionnaires d'événements pour les options de statut
    statusOptions.forEach(option => {
        option.addEventListener('click', async function() {
            const status = this.dataset.status;
            selectedStatus = status;
            
            if (status === 'on-hold' || status === 'dropped') {
                // Fermer le modal et afficher le popup
                closeStatusModal();
                await showStoppedAtPopup(currentItemId, status, async (stoppedAt) => {
                    // Mettre à jour le statut avec la valeur stoppedAt
                    await updateItemStatusWithStoppedAt(currentItemId, status, stoppedAt);
                });
            } else {
                // Pour les autres statuts, appliquer directement
                await updateItemStatus(currentItemId, status);
                closeStatusModal();
            }
        });
    });
    
    // Gestionnaire pour le bouton de confirmation
    const confirmBtn = document.getElementById('confirm-status-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async function() {
            if (selectedStatus) {
                await updateItemStatus(currentItemId, selectedStatus);
                closeStatusModal();
            }
        });
    }
    
    // Permettre de confirmer avec Enter dans le champ de saisie
    const stoppedAtInput = document.getElementById('stopped-at-input');
    if (stoppedAtInput) {
        stoppedAtInput.addEventListener('keypress', async function(e) {
            if (e.key === 'Enter' && selectedStatus) {
                await updateItemStatus(currentItemId, selectedStatus);
                closeStatusModal();
            }
        });
    }
    
    // Fermer le modal avec Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && statusModal.classList.contains('show')) {
            closeStatusModal();
        }
    });
    
    // Gestionnaires d'événements pour la pagination
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayCurrentPage();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(allItems.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayCurrentPage();
        }
    });
    
    // Fonction pour afficher la page actuelle
    function displayCurrentPage() {
        console.log('=== AFFICHAGE PAGE ===');
        console.log('Page actuelle:', currentPage);
        console.log('Items par page:', itemsPerPage);
        console.log('Total items disponibles:', allItems.length);
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        currentPageItems = allItems.slice(startIndex, endIndex);
        
        console.log('Index de début:', startIndex, 'Index de fin:', endIndex);
        console.log('Items à afficher:', currentPageItems.length);
        currentPageItems.forEach(item => {
            console.log(`  - ${item.title} (${item.type}) - status: ${item.status}`);
        });
        
        // Afficher les items de la page actuelle
        displayListItems(currentPageItems);
        
        // Mettre à jour la pagination
        updatePagination();
    }
    
    // Fonction pour mettre à jour la pagination
    function updatePagination() {
        const totalItems = allItems.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startItem = (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);
        
        // Mettre à jour le texte d'information
        const displayText = window.localization ? 
            window.localization.get('collection.pagination.display')
                .replace('{start}', startItem)
                .replace('{end}', endItem)
                .replace('{total}', totalItems) :
            `Affichage de ${startItem}-${endItem} sur ${totalItems} items`;
        paginationText.textContent = displayText;
        
        // Mettre à jour les boutons précédent/suivant
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
        
        // Générer les numéros de page
        generatePageNumbers(totalPages);
        
        // Afficher/masquer la pagination
        if (totalItems > itemsPerPage) {
            paginationContainer.style.display = 'flex';
        } else {
            paginationContainer.style.display = 'none';
        }
    }
    
    // Fonction pour générer les numéros de page
    function generatePageNumbers(totalPages) {
        pageNumbersContainer.innerHTML = '';
        
        // Afficher maximum 5 pages autour de la page actuelle
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        
        // Ajuster pour toujours afficher 5 pages si possible
        if (endPage - startPage < 4) {
            if (startPage === 1) {
                endPage = Math.min(totalPages, startPage + 4);
            } else {
                startPage = Math.max(1, endPage - 4);
            }
        }
        
        // Bouton "Première page" si nécessaire
        if (startPage > 1) {
            const firstPageBtn = document.createElement('button');
            firstPageBtn.className = 'page-number';
            firstPageBtn.textContent = '1';
            firstPageBtn.addEventListener('click', () => {
                currentPage = 1;
                displayCurrentPage();
            });
            pageNumbersContainer.appendChild(firstPageBtn);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'page-number disabled';
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
        }
        
        // Pages numérotées
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                displayCurrentPage();
            });
            pageNumbersContainer.appendChild(pageBtn);
        }
        
        // Bouton "Dernière page" si nécessaire
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'page-number disabled';
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
            
            const lastPageBtn = document.createElement('button');
            lastPageBtn.className = 'page-number';
            lastPageBtn.textContent = totalPages;
            lastPageBtn.addEventListener('click', () => {
                currentPage = totalPages;
                displayCurrentPage();
            });
            pageNumbersContainer.appendChild(lastPageBtn);
        }
    }
    
    // Fonction d'initialisation
    async function initList() {
        await loadUserList();
        await updateStats();
    }
    
    // Charger la liste de l'utilisateur
    async function loadUserList() {
        console.log('=== LOAD USER LIST ===');
        console.log('Filtre actuel:', currentFilter);
        console.log('Filtre de type actuel:', currentTypeFilter);
        
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user || !user.email) {
            console.log('Aucun utilisateur connecté');
            showEmptyList();
            return;
        }
        
        try {
            let userList = await collectionService.getAllItems(user.email);
            console.log('Liste complète chargée depuis Firebase:', userList.length, 'items');
            
            // Si Firebase est vide mais localStorage a des données (déconnexion/reconnexion),
            // synchroniser localStorage → Firebase pour ne pas perdre la collection
            if (userList.length === 0) {
                const localKey = `user_list_${user.email}`;
                const localList = JSON.parse(localStorage.getItem(localKey) || '[]');
                if (localList.length > 0) {
                    console.log('[List] Synchronisation localStorage → Firebase:', localList.length, 'items');
                    for (const item of localList) {
                        try {
                            const itemId = item.id ?? item.content_id ?? item.mal_id;
                            if (!itemId) continue;
                            await collectionService.addItem(user.email, {
                                id: itemId,
                                title: item.title || item.titre,
                                type: item.type || item.content_type,
                                status: item.status || 'plan-to-watch',
                                imageUrl: item.imageUrl || item.image || item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
                                synopsis: item.synopsis,
                                episodes: item.episodes,
                                volumes: item.volumes,
                                year: item.year,
                                genres: item.genres || [],
                                score: item.score || 0,
                                stoppedAt: item.stoppedAt ?? item.stopped_at
                            });
                        } catch (addErr) {
                            console.warn('[List] Erreur sync item:', addErr);
                        }
                    }
                    userList = await collectionService.getAllItems(user.email);
                    console.log('[List] Sync terminée, collection:', userList.length, 'items');
                }
            }
            
            if (userList.length === 0) {
                console.log('Liste vide, affichage liste vide');
                showEmptyList();
            } else {
                // Filtrer les items selon le statut et le type actuels
                let filteredItems = userList;
                
                if (currentFilter !== 'all') {
                    filteredItems = filteredItems.filter(item => item.status === currentFilter);
                    console.log(`Filtre statut "${currentFilter}" - items trouvés:`, filteredItems.length);
                }
                
                if (currentTypeFilter !== 'all') {
                    filteredItems = filteredItems.filter(item => {
                        const normalizedItemType = normalizeItemType(item.type);
                        const normalizedFilterType = normalizeItemType(currentTypeFilter);
                        
                        // Cas spécial : si le filtre est "film", accepter aussi "Movie" (normalisé en "anime")
                        // et si l'item est "Movie" (normalisé en "anime"), accepter aussi le filtre "film"
                        const itemTypeLower = (item.type || '').toLowerCase();
                        const filterTypeLower = currentTypeFilter.toLowerCase();
                        
                        let matches = normalizedItemType === normalizedFilterType;
                        
                        // Gestion spéciale pour "film" et "Movie"
                        if (!matches) {
                            if (filterTypeLower === 'film' && (itemTypeLower === 'movie' || itemTypeLower === 'film')) {
                                matches = true;
                            } else if (itemTypeLower === 'movie' && filterTypeLower === 'film') {
                                matches = true;
                            } else if (itemTypeLower === 'movie' && filterTypeLower === 'anime') {
                                matches = true; // Movie peut être considéré comme anime
                            }
                        }
                        
                        return matches;
                    });
                    console.log(`Filtre type "${currentTypeFilter}" - items trouvés:`, filteredItems.length);
                }
                
                allItems = filteredItems;
                console.log('Items finaux après filtrage:', allItems.length);
                
                // Réinitialiser à la première page
                currentPage = 1;
                
                // Afficher la page actuelle
                console.log('Affichage de la page actuelle');
                displayCurrentPage();
            }
        } catch (error) {
            console.error('Erreur lors du chargement de la liste:', error);
            showEmptyList();
        }
    }
    
    // Afficher les items de la liste
    function displayListItems(items) {
        console.log('=== DISPLAY LIST ITEMS ===');
        console.log('Items à afficher:', items.length);
        
        listItems.innerHTML = '';
        
        items.forEach(item => {
            const itemElement = createListItem(item);
            listItems.appendChild(itemElement);
        });
        
        // S'assurer que tous les éléments sont visibles
        const allItemElements = document.querySelectorAll('.list-item');
        allItemElements.forEach(item => {
            item.style.display = 'flex';
        });
        
        // Masquer le message "liste vide" car on a des items à afficher
        emptyList.style.display = 'none';
        console.log('Message "liste vide" masqué');
        
        // Appliquer la traduction automatique aux nouveaux éléments + libellés épisodes/volumes
        setTimeout(() => {
            const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
            if (window.translateCollectionPage) {
                window.translateCollectionPage(currentLanguage);
            }
            updateCollectionCardsLabels();
        }, 200);
    }
    
    // Fonction pour normaliser le type d'item (convertir "TV", "Movie", etc. en "anime")
    function normalizeItemType(type) {
        if (!type) return 'anime'; // Par défaut
        
        const typeLower = type.toLowerCase();
        
        // Normaliser "doujinshi" et "doujin" en "doujin"
        if (typeLower === 'doujinshi' || typeLower === 'doujin') {
            return 'doujin';
        }
        
        // Normaliser "novel" et "light novel" en "roman"
        if (typeLower === 'novel' || typeLower === 'light novel') {
            return 'roman';
        }
        
        // Normaliser "one shot" en "manga"
        if (typeLower === 'one shot') {
            return 'manga';
        }
        
        // Gérer "film" - si le filtre est "film", on veut que "Movie" corresponde aussi
        // Mais si le filtre est "anime", on veut que "Movie" corresponde aussi
        // Pour l'instant, on garde "film" tel quel et "Movie" devient "anime"
        // Si le filtre est "film", il faudra aussi accepter "Movie" (géré dans le filtrage)
        
        // Types d'anime de l'API Jikan (sauf Movie qui peut être film)
        if (typeLower === 'tv' || typeLower === 'ova' || 
            typeLower === 'ona' || typeLower === 'special' || typeLower === 'music') {
            return 'anime';
        }
        
        // "Movie" peut être "anime" ou "film" selon le contexte
        // Pour le filtrage, on va accepter les deux
        if (typeLower === 'movie') {
            return 'anime'; // Par défaut, Movie = anime, mais on gérera "film" dans le filtrage
        }
        
        // Types de manga restants
        if (typeLower === 'manga' || typeLower === 'manhwa' || typeLower === 'manhua') {
            return typeLower;
        }
        
        // Si c'est déjà "anime", "manga", "roman", "doujin", "manhwa", "manhua", "film", le retourner tel quel
        return typeLower;
    }
    
    // Clé i18n pour le type (Movie → film pour la traduction)
    function getCollectionTypeKey(normalizedType, itemType) {
        const raw = (itemType || '').toString().toLowerCase();
        if (raw === 'movie') return 'film';
        return normalizedType ? normalizedType.toLowerCase() : 'anime';
    }
    
    // Libellé traduit du type pour les cartes collection
    function getCollectionTypeLabel(normalizedType, itemType, t) {
        const key = getCollectionTypeKey(normalizedType, itemType);
        return t('collection.type.' + key, normalizedType ? normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1) : 'Anime');
    }
    
    // Mettre à jour les libellés épisodes/volumes et badges type des cartes après changement de langue
    function updateCollectionCardsLabels() {
        const t = (key, fallback) => (window.localization && window.localization.get(key)) || fallback;
        document.querySelectorAll('.list-item span[data-episodes-count]').forEach(span => {
            const count = span.getAttribute('data-episodes-count');
            const type = span.getAttribute('data-episodes-type');
            const label = type === 'anime' ? t('collection.label_episodes', 'épisodes') : t('collection.label_volumes', 'volumes');
            span.textContent = count + ' ' + label;
        });
        document.querySelectorAll('.list-item .item-type[data-i18n]').forEach(span => {
            const key = span.getAttribute('data-i18n');
            if (key) {
                const label = t(key, span.textContent);
                if (label) span.textContent = label;
            }
        });
    }
    
    // Créer un élément de liste
    function createListItem(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'list-item';
        itemDiv.dataset.status = item.status;
        itemDiv.dataset.itemId = item.id; // Ajouter l'ID de l'item
        
        const statusText = getStatusText(item.status);
        const statusClass = item.status;
        
        // Normaliser le type : convertir "TV", "Movie", etc. en "anime" pour l'affichage
        const normalizedType = normalizeItemType(item.type);
        
        // Libellés traduits pour épisodes/volumes et type
        const t = (key, fallback) => (window.localization && window.localization.get(key)) || fallback;
        const typeLabel = getCollectionTypeLabel(normalizedType, item.type, t);
        const episodesLabel = normalizedType === 'anime' ? t('collection.label_episodes', 'épisodes') : t('collection.label_volumes', 'volumes');
        
        // Formater les informations - gérer les différents formats de données
        // Gérer les valeurs 'null' (chaîne) vs null (valeur)
        const episodesValue = item.episodes === 'null' || item.episodes === null ? '?' : item.episodes;
        const volumesValue = item.volumes === 'null' || item.volumes === null ? '?' : item.volumes;
        const yearValue = item.year === 'null' || item.year === null ? '?' : item.year;
        
        const episodesText = episodesValue || volumesValue || '?';
        const yearText = yearValue || '?';
        
        // Détecter si le nombre d'épisodes est trop long et nécessite une réduction de police
        const episodesFullText = `${episodesText} ${episodesLabel}`;
        // Réduire la taille si plus de 12 caractères (pour gérer les nombres > 100)
        const isLongEpisodes = episodesFullText.length > 12 || (episodesValue && parseInt(episodesValue) > 99);
        
        // Fonction pour tronquer le texte à la fin d'une phrase
        function truncateAtSentence(text, maxLength) {
            if (text.length <= maxLength) return text;
            
            // Tronquer à maxLength
            let truncated = text.substring(0, maxLength);
            
            // Chercher le dernier point, point d'exclamation ou point d'interrogation
            const lastSentenceEnd = Math.max(
                truncated.lastIndexOf('.'),
                truncated.lastIndexOf('!'),
                truncated.lastIndexOf('?')
            );
            
            // Si on trouve une fin de phrase, tronquer là
            if (lastSentenceEnd > maxLength * 0.7) { // Au moins 70% de la longueur max
                return truncated.substring(0, lastSentenceEnd + 1);
            }
            
            // Sinon, chercher le dernier espace
            const lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > maxLength * 0.8) { // Au moins 80% de la longueur max
                return truncated.substring(0, lastSpace);
            }
            
            // Sinon, tronquer à maxLength
            return truncated;
        }
        
        const synopsisText = truncateAtSentence(item.synopsis || 'Aucune description disponible.', 120);
        
        // Gérer l'image - essayer différentes propriétés possibles
        let imageUrl = item.imageUrl || item.image || item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '';
        
        const htmlContent = `
            <div class="item-image">
                <img src="${imageUrl}" 
                     alt="${item.title}" 
                     onerror="this.onerror=null; this.src='';"
                     loading="lazy">
                <div class="item-status ${statusClass}">${statusText}</div>
            </div>
        `;
        
        // Créer l'élément image d'abord
        itemDiv.innerHTML = htmlContent;
        
        // Créer l'élément content séparément
        const contentDiv = document.createElement('div');
        contentDiv.className = 'item-content';
        contentDiv.style.cssText = `
            padding: 20px;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(10px);
            border-radius: 0 0 12px 12px;
            display: flex !important;
            flex-direction: column !important;
            visibility: visible !important;
            opacity: 1 !important;
            min-height: 200px;
            flex: 1;
            position: relative;
            z-index: 1;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        `;
        // Afficher où l'utilisateur s'est arrêté si applicable
        let stoppedAtText = '';
        if ((item.status === 'on-hold' || item.status === 'dropped') && item.stoppedAt) {
            const isAnime = normalizedType === 'anime';
            let stoppedLabel;
            if (window.localization) {
                const labelKey = isAnime ? 'collection.stopped_at.episode' : 'collection.stopped_at.volume';
                stoppedLabel = window.localization.get(labelKey);
            } else {
                stoppedLabel = isAnime ? 'épisode' : 'volume';
            }
            
            // Gérer le pluriel (simple pour français, mais peut être amélioré pour d'autres langues)
            const plural = item.stoppedAt > 1 ? 's' : '';
            stoppedAtText = `<div class="item-stopped-at" style="
                margin-top: 8px;
                margin-bottom: 12px;
                display: inline-block;
            ">
                <span style="
                    display: inline-block;
                    padding: 3px 8px;
                    background: rgba(225, 112, 85, 0.2);
                    border: 1px solid rgba(225, 112, 85, 0.4);
                    border-radius: 10px;
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.62rem;
                    font-weight: 500;
                ">
                    <i class="fas fa-bookmark" style="font-size: 0.55rem; margin-right: 4px; opacity: 0.7;"></i>
                    Arrêté(e) à ${item.stoppedAt} ${stoppedLabel}${plural}
                </span>
            </div>`;
        }
        
        contentDiv.innerHTML = `
            <h3 class="item-title" onclick="window.location.href='anime-details.html?id=${item.id}'" style="cursor: pointer;">${item.title || 'Titre inconnu'}</h3>
            <div class="item-meta">
                <span class="item-type" data-i18n-type="${normalizedType.toLowerCase()}" data-i18n="collection.type.${getCollectionTypeKey(normalizedType, item.type)}">${typeLabel}</span>
                <span>•</span>
                <span class="${isLongEpisodes ? 'episodes-long' : ''}" data-episodes-count="${episodesText}" data-episodes-type="${normalizedType === 'anime' ? 'anime' : 'manga'}">${episodesText} ${episodesLabel}</span>
                <span>•</span>
                <span>${yearText}</span>
            </div>
            <p class="item-synopsis">${synopsisText}</p>
            ${stoppedAtText}
            <div class="item-actions">
                <button class="change-status-btn" onclick="openStatusModal('${item.id}')">
                    <i class="fas fa-edit"></i>
                    <span data-i18n="collection.change_status">Changer statut</span>
                </button>
                <button class="remove-btn" onclick="removeFromList('${item.id}')" title="Retirer de la liste">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Ajouter l'élément content à l'item
        itemDiv.appendChild(contentDiv);
        
        // Debug: vérifier si l'élément .item-content existe après création
        const contentElement = itemDiv.querySelector('.item-content');
        console.log('Élément .item-content trouvé:', contentElement);
        if (contentElement) {
            console.log('Contenu de .item-content:', contentElement.innerHTML);
        } else {
            console.error('ERREUR: .item-content non trouvé dans l\'élément créé');
        }
        
        return itemDiv;
    }
    
    // Obtenir le texte du statut
    function getStatusText(status) {
        const statusMap = {
            'watching': 'collection.status.watching',
            'completed': 'collection.status.completed',
            'on-hold': 'collection.status.on_hold',
            'dropped': 'collection.status.dropped',
            'plan-to-watch': 'collection.status.plan_to_watch'
        };
        const key = statusMap[status] || 'collection.status.unknown';
        return window.localization ? window.localization.get(key) : status;
    }
    
    // Filtrer les items
    async function filterItems(status) {
        console.log('=== FILTRAGE ===');
        console.log('Statut demandé:', status);
        console.log('Type demandé:', currentTypeFilter);
        
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user || !user.email) {
            console.log('Aucun utilisateur connecté');
            showEmptyList();
            return;
        }
        
        try {
            const userList = await collectionService.getAllItems(user.email);
            console.log('Liste complète depuis Firebase:', userList.length, 'items');
            
            // Filtrer les items selon le statut
            let filteredItems = userList;
            if (status !== 'all') {
                filteredItems = userList.filter(item => item.status === status);
                console.log(`Filtre statut "${status}" - items trouvés:`, filteredItems.length);
            }
            
            // Filtrer les items selon le type (en normalisant les types)
            if (currentTypeFilter !== 'all') {
                filteredItems = filteredItems.filter(item => {
                    const normalizedItemType = normalizeItemType(item.type);
                    const normalizedFilterType = normalizeItemType(currentTypeFilter);
                    
                    // Cas spécial : si le filtre est "film", accepter aussi "Movie" (normalisé en "anime")
                    // et si l'item est "Movie" (normalisé en "anime"), accepter aussi le filtre "film"
                    const itemTypeLower = (item.type || '').toLowerCase();
                    const filterTypeLower = currentTypeFilter.toLowerCase();
                    
                    let matches = normalizedItemType === normalizedFilterType;
                    
                    // Gestion spéciale pour "film" et "Movie"
                    if (!matches) {
                        if (filterTypeLower === 'film' && (itemTypeLower === 'movie' || itemTypeLower === 'film')) {
                            matches = true;
                        } else if (itemTypeLower === 'movie' && filterTypeLower === 'film') {
                            matches = true;
                        } else if (itemTypeLower === 'movie' && filterTypeLower === 'anime') {
                            matches = true; // Movie peut être considéré comme anime
                        }
                    }
                    
                    if (!matches) {
                        console.log(`  Item "${item.title}" rejeté: type "${item.type}" (normalisé: "${normalizedItemType}") !== filtre "${currentTypeFilter}" (normalisé: "${normalizedFilterType}")`);
                    }
                    return matches;
                });
                console.log(`Filtre type "${currentTypeFilter}" - items trouvés:`, filteredItems.length);
            }
            
            allItems = filteredItems;
            console.log('Items finaux après filtrage:', allItems.length);
            allItems.forEach(item => {
                console.log(`  - ${item.title} (${item.type}) - status: ${item.status}`);
            });
            
            // Réinitialiser à la première page
            currentPage = 1;
            
            // Mettre à jour le filtre actuel
            currentFilter = status;
            console.log('Filtre actuel mis à jour:', currentFilter);
            
            // Afficher la page actuelle
            if (allItems.length === 0) {
                console.log('Aucun item trouvé, affichage liste vide');
                showEmptyList();
            } else {
                console.log('Affichage de la page actuelle');
                displayCurrentPage();
            }
        } catch (error) {
            console.error('Erreur lors du filtrage:', error);
            showEmptyList();
        }
    }
    
    // Définir le filtre actif
    function setActiveFilter(status) {
        console.log('=== SET ACTIVE FILTER ===');
        console.log('Nouveau statut:', status);
        
        statusFilters.forEach(filter => {
            filter.classList.remove('active');
        });
        
        const activeFilter = document.querySelector(`[data-status="${status}"]`);
        if (activeFilter) {
            activeFilter.classList.add('active');
            console.log('Filtre actif mis à jour dans le DOM');
        }
        
        currentFilter = status;
        console.log('Filtre actuel mis à jour:', currentFilter);
    }
    
    // Définir le filtre de type actif
    function setActiveTypeFilter(type) {
        console.log('=== SET ACTIVE TYPE FILTER ===');
        console.log('Nouveau type:', type);
        
        typeFilters.forEach(filter => {
            filter.classList.remove('active');
        });
        
        const activeTypeFilter = document.querySelector(`[data-type="${type}"]`);
        if (activeTypeFilter) {
            activeTypeFilter.classList.add('active');
            console.log('Filtre de type actif mis à jour dans le DOM');
        }
        
        currentTypeFilter = type;
        console.log('Filtre de type actuel mis à jour:', currentTypeFilter);
    }
    
    // Mettre à jour les statistiques
    async function updateStats() {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user || !user.email) return;
        
        try {
            const userList = await collectionService.getAllItems(user.email);
            const stats = {
                watching: 0,
                completed: 0,
                'on-hold': 0,
                dropped: 0,
                'plan-to-watch': 0
            };
            
            userList.forEach(item => {
                if (stats.hasOwnProperty(item.status)) {
                    stats[item.status]++;
                }
            });
            
            // Mettre à jour les compteurs
            document.getElementById('watching-count').textContent = stats.watching;
            document.getElementById('completed-count').textContent = stats.completed;
            document.getElementById('on-hold-count').textContent = stats['on-hold'];
            document.getElementById('dropped-count').textContent = stats.dropped;
            document.getElementById('plan-to-watch-count').textContent = stats['plan-to-watch'];
        } catch (error) {
            console.error('Erreur lors de la mise à jour des statistiques:', error);
        }
    }
    
    // Ouvrir le modal de statut
    window.openStatusModal = function(itemId) {
        currentItemId = itemId;
        selectedStatus = null;
        
        // Réinitialiser le champ de saisie
        const stoppedAtContainer = document.getElementById('stopped-at-container');
        const stoppedAtInput = document.getElementById('stopped-at-input');
        const confirmBtn = document.getElementById('confirm-status-btn');
        
        if (stoppedAtContainer) stoppedAtContainer.style.display = 'none';
        if (stoppedAtInput) stoppedAtInput.value = '';
        if (confirmBtn) confirmBtn.style.display = 'none';
        
        // Retirer la sélection des options
        statusOptions.forEach(opt => opt.classList.remove('selected'));
        
        statusModal.classList.add('show');
    };
    
    // Fermer le modal de statut
    function closeStatusModal() {
        statusModal.classList.remove('show');
        currentItemId = null;
        selectedStatus = null;
        
        // Réinitialiser le champ de saisie
        const stoppedAtContainer = document.getElementById('stopped-at-container');
        const stoppedAtInput = document.getElementById('stopped-at-input');
        const confirmBtn = document.getElementById('confirm-status-btn');
        
        if (stoppedAtContainer) stoppedAtContainer.style.display = 'none';
        if (stoppedAtInput) stoppedAtInput.value = '';
        if (confirmBtn) confirmBtn.style.display = 'none';
        
        // Retirer la sélection des options
        statusOptions.forEach(opt => opt.classList.remove('selected'));
    }
    
    // Mettre à jour le statut d'un item avec stoppedAt
    async function updateItemStatusWithStoppedAt(itemId, newStatus, stoppedAt) {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user || !user.email) return;
        
        try {
            await collectionService.updateItem(user.email, itemId, {
                status: newStatus,
                stoppedAt: stoppedAt
            });
            
            // Mettre à jour l'élément dans le DOM directement
            const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
            if (itemElement) {
                itemElement.dataset.status = newStatus;
                const statusElement = itemElement.querySelector('.item-status');
                if (statusElement) {
                    statusElement.textContent = getStatusText(newStatus);
                    statusElement.className = `item-status ${newStatus}`;
                }
            }
            
            // Mettre à jour les statistiques
            await updateStats();
            
            // Recharger la liste pour mettre à jour la pagination
            await loadUserList();
            
            // Rafraîchir l'affichage des cartes sur la page manga-database
            if (typeof window.refreshCardsDisplay === 'function') {
                window.refreshCardsDisplay();
            }
            
            // Appliquer la traduction automatique après la mise à jour
            setTimeout(() => {
                const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
                if (window.translateCollectionPage) {
                    window.translateCollectionPage(currentLanguage);
                }
                updateCollectionCardsLabels();
            }, 200);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du statut:', error);
        }
    }
    
    // Mettre à jour le statut d'un item
    function updateItemStatus(itemId, newStatus) {
        updateItemStatusWithStoppedAt(itemId, newStatus, null);
    }
    
    // Retirer un item de la liste
    window.removeFromList = function(itemId) {
        // Créer le popup de confirmation
        const popup = document.createElement('div');
        popup.className = 'delete-popup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
            animation: fadeIn 0.3s ease;
        `;
        
        popup.innerHTML = `
            <div class="popup-content" style="
                background: var(--dark);
                border-radius: 12px;
                padding: 30px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.1);
                animation: slideIn 0.3s ease;
            ">
                <div style="font-size: 3rem; color: #e17055; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 style="color: var(--light); margin-bottom: 15px; font-size: 1.3rem;" data-i18n="collection.delete.confirm_title">
                    Confirmer la suppression
                </h3>
                <p style="color: var(--light-gray); margin-bottom: 25px; line-height: 1.5;" data-i18n="collection.delete.confirm_message">
                    Êtes-vous sûr de vouloir retirer cet item de votre liste ?<br>
                    Cette action ne peut pas être annulée.
                </p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button class="cancel-btn" style="
                        padding: 12px 25px;
                        background: rgba(255, 255, 255, 0.1);
                        color: var(--light);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.3s ease;
                    " data-i18n="collection.delete.cancel">Annuler</button>
                    <button class="confirm-btn" style="
                        padding: 12px 25px;
                        background: #e17055;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.3s ease;
                    " data-i18n="collection.delete.confirm">Supprimer</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Appliquer les traductions au popup
        if (window.localization) {
            const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
            const titleElement = popup.querySelector('[data-i18n="collection.delete.confirm_title"]');
            const messageElement = popup.querySelector('[data-i18n="collection.delete.confirm_message"]');
            const cancelElement = popup.querySelector('[data-i18n="collection.delete.cancel"]');
            const confirmElement = popup.querySelector('[data-i18n="collection.delete.confirm"]');
            
            if (titleElement) titleElement.textContent = window.localization.get('collection.delete.confirm_title');
            if (messageElement) messageElement.textContent = window.localization.get('collection.delete.confirm_message');
            if (cancelElement) cancelElement.textContent = window.localization.get('collection.delete.cancel');
            if (confirmElement) confirmElement.textContent = window.localization.get('collection.delete.confirm');
        }
        
        // Gestionnaires d'événements pour les boutons
        const cancelBtn = popup.querySelector('.cancel-btn');
        const confirmBtn = popup.querySelector('.confirm-btn');
        
        cancelBtn.addEventListener('click', function() {
            popup.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(popup);
            }, 300);
        });
        
        confirmBtn.addEventListener('click', async function() {
            // Animation de suppression
            popup.style.animation = 'fadeOut 0.3s ease';
            setTimeout(async () => {
                document.body.removeChild(popup);
                
                // Supprimer l'item
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                if (!user || !user.email) return;
                
                try {
                    await collectionService.removeItem(user.email, itemId);
                    
                    // Animation de suppression de l'élément
                    const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
                    if (itemElement) {
                        itemElement.style.animation = 'slideOut 0.5s ease';
                        setTimeout(() => {
                            itemElement.remove();
                        }, 500);
                    }
                    
                    // Mettre à jour les statistiques
                    await updateStats();
                    
                    // Recharger la liste pour mettre à jour la pagination
                    await loadUserList();
                    
                    // Rafraîchir l'affichage des cartes sur la page manga-database
                    if (typeof window.refreshCardsDisplay === 'function') {
                        window.refreshCardsDisplay();
                    }
                    
                    // Afficher une notification de succès
                    showNotification('Item retiré de votre liste !', 'success');
                } catch (error) {
                    console.error('Erreur lors de la suppression:', error);
                    showNotification('Erreur lors de la suppression', 'error');
                }
            }, 300);
        });
        
        // Fermer avec Escape
        document.addEventListener('keydown', function closePopup(e) {
            if (e.key === 'Escape') {
                popup.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    document.body.removeChild(popup);
                }, 300);
                document.removeEventListener('keydown', closePopup);
            }
        });
        
        // Fermer en cliquant à l'extérieur
        popup.addEventListener('click', function(e) {
            if (e.target === popup) {
                popup.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    document.body.removeChild(popup);
                }, 300);
            }
        });
    };
    
    // Afficher la liste vide
    async function showEmptyList() {
        console.log('=== SHOW EMPTY LIST ===');
        
        // Ne vider le contenu que si vraiment aucune donnée
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (!user || !user.email) {
            console.log('Aucun utilisateur connecté');
            listItems.innerHTML = '';
            emptyList.style.display = 'block';
            paginationContainer.style.display = 'none';
            return;
        }
        
        try {
            const userList = await collectionService.getAllItems(user.email);
            console.log('Liste complète depuis Firebase:', userList.length, 'items');
            
            if (userList.length === 0) {
                console.log('Liste vraiment vide, affichage message vide');
                listItems.innerHTML = '';
                emptyList.style.display = 'block';
                paginationContainer.style.display = 'none';
            } else {
                // Si il y a des données mais qu'elles sont cachées par le filtre
                console.log('Liste non vide mais filtrée, affichage message vide pour ce filtre');
                listItems.innerHTML = '';
                emptyList.style.display = 'block';
                paginationContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de la liste vide:', error);
            listItems.innerHTML = '';
            emptyList.style.display = 'block';
            paginationContainer.style.display = 'none';
        }
    }
});

// Fonction globale pour ajouter un item à la liste (appelée depuis d'autres pages)
window.addToList = function(itemData) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) {
        alert('Veuillez vous connecter pour ajouter des items à votre liste.');
        return;
    }
    
    // Ouvrir le modal de statut pour choisir le statut initial
    const statusModal = document.getElementById('status-modal');
    if (statusModal) {
        // Stocker temporairement les données de l'item
        localStorage.setItem('temp_item_data', JSON.stringify(itemData));
        
        // Modifier le modal pour l'ajout initial
        const modalTitle = statusModal.querySelector('.modal-header h3');
        modalTitle.textContent = 'Ajouter à ma liste';
        
        // Afficher le modal
        statusModal.classList.add('show');
        
        // Gérer la sélection du statut pour l'ajout
        const statusOptions = statusModal.querySelectorAll('.status-option');
        statusOptions.forEach(option => {
            option.onclick = function() {
                const status = this.dataset.status;
                addItemToList(itemData, status);
                statusModal.classList.remove('show');
                
                // Restaurer le titre original
                modalTitle.textContent = 'Changer le statut';
                
                // Restaurer les gestionnaires d'événements originaux
                statusOptions.forEach(opt => {
                    opt.onclick = null;
                });
            };
        });
    }
};

// Fonction pour ajouter un item à la liste
async function addItemToList(itemData, status) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.email) return;
    
    try {
        await collectionService.addItem(user.email, {
            ...itemData,
            status: status
        });
        
        // Afficher une confirmation
        showNotification('Item ajouté à votre liste !', 'success');
        
        // Appliquer la traduction automatique après l'ajout
        setTimeout(() => {
            const currentLanguage = localStorage.getItem('mangaWatchLanguage') || 'fr';
            if (window.translateCollectionPage) {
                window.translateCollectionPage(currentLanguage);
            }
        }, 300);
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'item:', error);
        showNotification('Erreur lors de l\'ajout', 'error');
    }
}

// Fonction pour afficher une notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10100;
        animation: slideIn 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.background = '#00b894';
    } else if (type === 'error') {
        notification.style.background = '#e17055';
    } else {
        notification.style.background = '#74b9ff';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Styles CSS pour les animations de notification et popup
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
    
    /* Masquer les spinners natifs des inputs number */
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    
    input[type="number"] {
        -moz-appearance: textfield;
    }
`;
document.head.appendChild(notificationStyles); 