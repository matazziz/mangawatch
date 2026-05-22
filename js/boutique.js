(function () {
    const PARTNER_STORES = [
        {
            id: 'tokyo-corner',
            name: 'Tokyo Corner',
            city: 'Paris',
            region: 'ile-de-france',
            address: '12 Rue Sainte-Anne, 75001 Paris',
            hours: 'Mar–Sam 10h–19h · Dim 14h–18h',
            lat: 48.8658,
            lng: 2.3352,
            badge: 'verified',
            description: 'Librairie spécialisée manga, artbooks et goodies. Espace dédicaces le week-end.',
            logo: '/images/boutique/tokyo-corner.svg',
            categories: ['manga', 'figurine'],
            tags: ['Manga', 'Figurines', 'Goodies'],
            promoCode: 'MWATCH-TOKYO10',
            promoLabel: '-10 % sur la manga zone',
            promoValidUntil: '2026-06-30',
            website: 'https://example.com',
            mapsUrl: 'https://www.google.com/maps/search/12+Rue+Sainte-Anne+75001+Paris'
        },
        {
            id: 'figurart-lyon',
            name: "Figur'Art Lyon",
            city: 'Lyon',
            region: 'auvergne-rhone-alpes',
            address: '8 Rue de la République, 69002 Lyon',
            hours: 'Lun–Sam 10h–19h',
            lat: 45.7606,
            lng: 4.8357,
            badge: 'verified',
            description: 'Boutique de figurines anime, statues et produits dérivés collector.',
            logo: '/images/boutique/figurart-lyon.svg',
            categories: ['figurine'],
            tags: ['Figurines', 'Statues', 'Collector'],
            promoCode: 'MWATCH-FIG15',
            promoLabel: '-15 % sur figurines sélectionnées',
            promoValidUntil: '2026-07-15',
            website: 'https://example.com',
            mapsUrl: 'https://www.google.com/maps/search/8+Rue+de+la+République+69002+Lyon'
        },
        {
            id: 'manga-planet',
            name: 'Manga Planet',
            city: 'Marseille',
            region: 'provence-alpes-cote-azur',
            address: '45 La Canebière, 13001 Marseille',
            hours: 'Mar–Dim 10h–19h',
            lat: 43.2969,
            lng: 5.3811,
            badge: 'new',
            description: 'Grand choix de mangas neufs et occasion, blind boxes et cartes à collectionner.',
            logo: '/images/boutique/manga-planet.svg',
            categories: ['manga'],
            tags: ['Manga', 'Occasion', 'TCG'],
            promoCode: 'MWATCH-PLANET5',
            promoLabel: '-5 % sur tout le magasin',
            promoValidUntil: '2026-05-31',
            website: 'https://example.com',
            mapsUrl: 'https://www.google.com/maps/search/45+La+Canebière+13001+Marseille'
        },
        {
            id: 'otaku-nest',
            name: 'Otaku Nest',
            city: 'Bordeaux',
            region: 'nouvelle-aquitaine',
            address: '22 Rue Sainte-Catherine, 33000 Bordeaux',
            hours: 'Mar–Sam 10h–19h · Ven jusqu\'à 20h',
            lat: 44.8412,
            lng: -0.5745,
            badge: 'verified',
            description: 'Concept store manga & anime : vêtements, peluches, posters et figurines.',
            logo: '/images/boutique/otaku-nest.svg',
            categories: ['manga', 'figurine'],
            tags: ['Manga', 'Figurines', 'Mode'],
            promoCode: 'MWATCH-NEST12',
            promoLabel: '-12 % avec ce code MangaWatch',
            promoValidUntil: '2026-08-31',
            website: 'https://example.com',
            mapsUrl: 'https://www.google.com/maps/search/22+Rue+Sainte-Catherine+33000+Bordeaux'
        },
        {
            id: 'shonen-store',
            name: 'Shonen Store',
            city: 'Lille',
            region: 'hauts-de-france',
            address: '5 Rue Faidherbe, 59000 Lille',
            hours: 'Mar–Sam 10h–18h30',
            lat: 50.6366,
            lng: 3.0635,
            badge: 'new',
            description: 'Références shonen, seinen et manhwa. Précommandes et réservations manga.',
            logo: '/images/boutique/shonen-store.svg',
            categories: ['manga'],
            tags: ['Manga', 'Précommandes'],
            promoCode: 'MWATCH-SHONEN8',
            promoLabel: '-8 % sur les précommandes',
            promoValidUntil: '2026-09-30',
            website: 'https://example.com',
            mapsUrl: 'https://www.google.com/maps/search/5+Rue+Faidherbe+59000+Lille'
        },
        {
            id: 'geek-gallery',
            name: 'Geek Gallery',
            city: 'Toulouse',
            region: 'occitanie',
            address: '14 Rue d\'Alsace-Lorraine, 31000 Toulouse',
            hours: 'Mar–Sam 10h–19h',
            lat: 43.6045,
            lng: 1.444,
            badge: 'verified',
            description: 'Figurines Funko, Nendoroid, scale figures et vitrines expositions.',
            logo: '/images/boutique/geek-gallery.svg',
            categories: ['figurine'],
            tags: ['Figurines', 'Funko', 'Expo'],
            promoCode: 'MWATCH-GEEK20',
            promoLabel: '-20 % sur une figurine au choix',
            promoValidUntil: '2026-07-31',
            website: 'https://example.com',
            mapsUrl: 'https://www.google.com/maps/search/14+Rue+d\'Alsace-Lorraine+31000+Toulouse'
        },
        {
            id: 'nakama-books',
            name: 'Nakama Books',
            city: 'Nantes',
            region: 'pays-de-la-loire',
            address: '3 Rue Crébillon, 44000 Nantes',
            hours: 'Mar–Sam 10h–19h · Sam 10h–18h',
            lat: 47.2136,
            lng: -1.5609,
            badge: 'verified',
            description: 'Librairie indépendante, conseils personnalisés et coin lecture manga.',
            logo: '/images/boutique/nakama-books.svg',
            categories: ['manga'],
            tags: ['Manga', 'Indépendant'],
            promoCode: 'MWATCH-NAKAMA10',
            promoLabel: '-10 % pour les membres MangaWatch',
            promoValidUntil: '2026-12-31',
            website: 'https://example.com',
            mapsUrl: 'https://www.google.com/maps/search/3+Rue+Crébillon+44000+Nantes'
        },
        {
            id: 'sakura-figures',
            name: 'Sakura Figures',
            city: 'Nice',
            region: 'provence-alpes-cote-azur',
            address: '18 Avenue Jean Médecin, 06000 Nice',
            hours: 'Mar–Sam 10h–19h',
            lat: 43.701,
            lng: 7.2684,
            badge: 'new',
            description: 'Import direct Japon : figurines limitées, artbooks et goodies exclusifs.',
            logo: '/images/boutique/sakura-figures.svg',
            categories: ['figurine'],
            tags: ['Figurines', 'Import Japon'],
            promoCode: 'MWATCH-SAKURA15',
            promoLabel: '-15 % sur les imports',
            promoValidUntil: '2026-10-15',
            website: 'https://example.com',
            mapsUrl: 'https://www.google.com/maps/search/18+Avenue+Jean+Médecin+06000+Nice'
        }
    ];

    const STATS_LOCAL_KEY = 'boutique_stats_local';
    const STATS_PENDING_KEY = 'boutique_stats_pending';
    const FLOAT_GAP = 16;
    const FLOAT_DEFAULT_BOTTOM = 20;

    const state = {
        userLocation: null,
        view: 'list',
        map: null,
        markersLayer: null,
        userMarker: null
    };

    const els = {
        search: document.getElementById('boutique-search'),
        region: document.getElementById('boutique-region'),
        category: document.getElementById('boutique-category'),
        sort: document.getElementById('boutique-sort'),
        sortDistance: document.getElementById('boutique-sort-distance'),
        grid: document.getElementById('boutique-grid'),
        count: document.getElementById('boutique-count'),
        nearMe: document.getElementById('boutique-near-me'),
        geoStatus: document.getElementById('boutique-geo-status'),
        mapWrap: document.getElementById('boutique-map-wrap'),
        mapEl: document.getElementById('boutique-map'),
        viewBtns: document.querySelectorAll('.boutique-view-btn'),
        panel: document.getElementById('boutique-panel'),
        filtersToggle: document.getElementById('boutique-filters-toggle'),
        searchSubmit: document.querySelector('.boutique-search-submit'),
        partnerFab: document.getElementById('boutique-partner-fab'),
        partnerModal: document.getElementById('boutique-partner-modal'),
        partnerForm: document.getElementById('boutique-partner-form'),
        partnerFeedback: document.getElementById('boutique-partner-feedback'),
        partnerSubmit: document.getElementById('boutique-partner-submit')
    };

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    function isUserLoggedIn() {
        try {
            if (localStorage.getItem('isLoggedIn') === 'true') return true;
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            return !!(user && user.email);
        } catch (e) {
            return false;
        }
    }

    function haversineKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function formatDistance(km) {
        if (km < 1) return Math.round(km * 1000) + ' m';
        return km.toFixed(1).replace('.', ',') + ' km';
    }

    function getStoreDistance(store) {
        if (!state.userLocation || store.lat == null || store.lng == null) return null;
        return haversineKm(state.userLocation.lat, state.userLocation.lng, store.lat, store.lng);
    }

    function getFilters() {
        return {
            q: (els.search?.value || '').trim().toLowerCase(),
            region: els.region?.value || '',
            category: els.category?.value || '',
            sort: els.sort?.value || 'name'
        };
    }

    function matchesStore(store, filters) {
        if (filters.region && store.region !== filters.region) return false;
        if (filters.category && !store.categories.includes(filters.category)) return false;
        if (!filters.q) return true;
        const haystack = [
            store.name,
            store.city,
            store.address,
            store.hours,
            store.description,
            store.promoCode,
            ...(store.tags || [])
        ].join(' ').toLowerCase();
        return haystack.includes(filters.q);
    }

    function sortStores(stores, sortBy) {
        const list = stores.map(function (s) {
            return { store: s, distance: getStoreDistance(s) };
        });

        if (sortBy === 'distance' && state.userLocation) {
            list.sort(function (a, b) {
                const da = a.distance == null ? Infinity : a.distance;
                const db = b.distance == null ? Infinity : b.distance;
                return da - db || a.store.name.localeCompare(b.store.name, 'fr');
            });
        } else if (sortBy === 'city') {
            list.sort(function (a, b) {
                return a.store.city.localeCompare(b.store.city, 'fr') ||
                    a.store.name.localeCompare(b.store.name, 'fr');
            });
        } else {
            list.sort(function (a, b) {
                return a.store.name.localeCompare(b.store.name, 'fr');
            });
        }

        return list.map(function (item) {
            return Object.assign({}, item.store, { _distanceKm: item.distance });
        });
    }

    function formatPromoValidUntil(iso) {
        if (!iso) return '';
        const d = new Date(iso + 'T23:59:59');
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    function isPromoExpired(iso) {
        if (!iso) return false;
        const end = new Date(iso + 'T23:59:59');
        return !isNaN(end.getTime()) && Date.now() > end.getTime();
    }

    function renderPromoValidity(store) {
        if (!store.promoValidUntil) return '';
        const label = formatPromoValidUntil(store.promoValidUntil);
        if (!label) return '';
        const expired = isPromoExpired(store.promoValidUntil);
        const cls = expired ? 'boutique-promo-validity boutique-promo-validity--expired' : 'boutique-promo-validity';
        const text = expired ? 'Offre expirée le ' + label : 'Valable jusqu\'au ' + label;
        return '<span class="' + cls + '"><i class="fas fa-calendar-days"></i> ' + escapeHtml(text) + '</span>';
    }

    function readLocalStats() {
        try {
            return JSON.parse(localStorage.getItem(STATS_LOCAL_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function writeLocalStat(storeId, field) {
        const all = readLocalStats();
        if (!all[storeId]) all[storeId] = { promo_copies: 0, site_clicks: 0 };
        all[storeId][field] = (all[storeId][field] || 0) + 1;
        localStorage.setItem(STATS_LOCAL_KEY, JSON.stringify(all));
    }

    function pushPendingStat(storeId, field) {
        try {
            const pending = JSON.parse(localStorage.getItem(STATS_PENDING_KEY) || '[]');
            pending.push({ storeId: storeId, field: field, at: Date.now() });
            localStorage.setItem(STATS_PENDING_KEY, JSON.stringify(pending));
        } catch (e) { /* ignore */ }
    }

    async function syncPendingStats() {
        let pending;
        try {
            pending = JSON.parse(localStorage.getItem(STATS_PENDING_KEY) || '[]');
        } catch (e) {
            return;
        }
        if (!pending.length) return;
        try {
            const { boutiqueStatsService } = await import('/js/firebase-service.js?v=6febe20');
            const remaining = [];
            for (let i = 0; i < pending.length; i++) {
                const item = pending[i];
                if (!item.storeId || !item.field) continue;
                try {
                    await boutiqueStatsService.increment(item.storeId, item.field);
                } catch (err) {
                    remaining.push(item);
                }
            }
            localStorage.setItem(STATS_PENDING_KEY, JSON.stringify(remaining));
        } catch (e) { /* Firebase indisponible */ }
    }

    async function trackStat(storeId, field) {
        if (!storeId || !field) return;
        writeLocalStat(storeId, field);
        try {
            const { boutiqueStatsService } = await import('/js/firebase-service.js?v=6febe20');
            await boutiqueStatsService.increment(storeId, field);
            await syncPendingStats();
        } catch (e) {
            pushPendingStat(storeId, field);
        }
    }

    async function handleSiteLinkClick(e) {
        const link = e.target.closest('.boutique-btn-site');
        if (!link) return;
        e.preventDefault();
        const storeId = link.getAttribute('data-store-id');
        const href = link.getAttribute('href');
        if (storeId) {
            await Promise.race([
                trackStat(storeId, 'site_clicks'),
                new Promise(function (resolve) { setTimeout(resolve, 1500); })
            ]);
        }
        if (href) {
            window.open(href, '_blank', 'noopener,noreferrer');
        }
    }

    function updateFloatingButtons() {
        const footer = document.querySelector('.footer-unified');
        let bottom = FLOAT_DEFAULT_BOTTOM;
        if (footer) {
            const footerTop = footer.getBoundingClientRect().top;
            const vh = window.innerHeight;
            if (footerTop < vh) {
                bottom = Math.max(FLOAT_DEFAULT_BOTTOM, vh - footerTop + FLOAT_GAP);
            }
        }
        const bottomPx = bottom + 'px';
        document.documentElement.style.setProperty('--boutique-fab-bottom', bottomPx);
        document.documentElement.style.setProperty('--message-btn-bottom', bottomPx);
        const msgBtn = document.getElementById('message-button');
        if (msgBtn) {
            msgBtn.style.bottom = bottomPx;
        }
        if (els.partnerFab) {
            els.partnerFab.style.bottom = bottomPx;
        }
    }

    function watchFloatingButtons() {
        updateFloatingButtons();
        let ticks = 0;
        const interval = setInterval(function () {
            updateFloatingButtons();
            ticks++;
            if (ticks >= 8) clearInterval(interval);
        }, 400);
        if (typeof MutationObserver !== 'undefined') {
            const obs = new MutationObserver(function () {
                if (document.getElementById('message-button')) updateFloatingButtons();
            });
            obs.observe(document.body, { childList: true, subtree: true });
        }
    }

    function renderBadge(badge) {
        if (badge === 'verified') {
            return '<span class="boutique-badge boutique-badge--verified"><i class="fas fa-circle-check"></i> Partenaire vérifié</span>';
        }
        if (badge === 'new') {
            return '<span class="boutique-badge boutique-badge--new"><i class="fas fa-star"></i> Nouveau partenaire</span>';
        }
        return '';
    }

    function renderPromo(store) {
        const validityHtml = renderPromoValidity(store);
        const expired = isPromoExpired(store.promoValidUntil);
        if (!isUserLoggedIn()) {
            return [
                '<div class="boutique-promo boutique-promo--locked">',
                '<div>',
                '<span class="boutique-promo-label">', escapeHtml(store.promoLabel), '</span>',
                validityHtml,
                '<span class="boutique-promo-locked"><i class="fas fa-lock"></i> Code réservé aux membres connectés</span>',
                '</div>',
                '<a href="profil.html" class="boutique-login-btn">Se connecter</a>',
                '</div>'
            ].join('');
        }
        if (expired) {
            return [
                '<div class="boutique-promo boutique-promo--expired">',
                '<div>',
                '<span class="boutique-promo-label">', escapeHtml(store.promoLabel), '</span>',
                validityHtml,
                '<span class="boutique-promo-expired-msg">Code non disponible</span>',
                '</div>',
                '</div>'
            ].join('');
        }
        return [
            '<div class="boutique-promo">',
            '<div>',
            '<span class="boutique-promo-label">', escapeHtml(store.promoLabel), '</span>',
            validityHtml,
            '<span class="boutique-promo-code">', escapeHtml(store.promoCode), '</span>',
            '</div>',
            '<button type="button" class="boutique-copy-btn" data-code="', escapeHtml(store.promoCode),
            '" data-store-id="', escapeHtml(store.id), '">',
            'Copier</button></div>'
        ].join('');
    }

    function renderCard(store) {
        const tagsHtml = (store.tags || [])
            .map(function (t) { return '<span class="boutique-tag">' + escapeHtml(t) + '</span>'; })
            .join('');
        const catTags = store.categories
            .map(function (c) {
                return '<span class="boutique-tag ' + categoryClass(c) + '">' + categoryLabel(c) + '</span>';
            })
            .join('');
        const logo = store.logo || '/images/porte-torii.png';
        const distanceHtml = store._distanceKm != null
            ? '<p class="boutique-card-distance"><i class="fas fa-route"></i> ' + formatDistance(store._distanceKm) + '</p>'
            : '';

        return [
            '<article class="boutique-card" data-store-id="', escapeHtml(store.id), '">',
            '<div class="boutique-card-header">',
            '<img class="boutique-card-logo" src="', escapeHtml(logo), '" alt="Logo ', escapeHtml(store.name), '">',
            '<div class="boutique-card-head-text">',
            '<div class="boutique-card-title-row">',
            '<h2 class="boutique-card-title">', escapeHtml(store.name), '</h2>',
            renderBadge(store.badge),
            '</div>',
            '<p class="boutique-card-location"><i class="fas fa-map-marker-alt"></i> ', escapeHtml(store.city), '</p>',
            distanceHtml,
            '</div></div>',
            '<div class="boutique-card-info">',
            '<p class="boutique-card-address"><i class="fas fa-location-dot"></i> ', escapeHtml(store.address || ''), '</p>',
            '<p class="boutique-card-hours"><i class="fas fa-clock"></i> ', escapeHtml(store.hours || ''), '</p>',
            '</div>',
            '<div class="boutique-card-body">',
            '<p class="boutique-card-desc">', escapeHtml(store.description), '</p>',
            '<div class="boutique-tags">', catTags, tagsHtml, '</div>',
            '</div>',
            renderPromo(store),
            '<div class="boutique-card-footer">',
            '<a href="', escapeHtml(store.website), '" class="boutique-btn-site" data-store-id="', escapeHtml(store.id),
            '" target="_blank" rel="noopener noreferrer">',
            'Site web</a>',
            '<a href="', escapeHtml(store.mapsUrl), '" class="boutique-btn-map" target="_blank" rel="noopener noreferrer">',
            'Itinéraire</a>',
            '</div></article>'
        ].join('');
    }

    function categoryClass(cat) {
        return cat === 'figurine' ? 'boutique-tag--figurine' : 'boutique-tag--manga';
    }

    function categoryLabel(cat) {
        return cat === 'figurine' ? 'Figurines' : 'Manga';
    }

    function getFilteredStores() {
        const filters = getFilters();
        let stores = PARTNER_STORES.filter(function (s) { return matchesStore(s, filters); });
        return sortStores(stores, filters.sort);
    }

    function renderList() {
        const stores = getFilteredStores();

        if (els.count) {
            let text = stores.length === 1 ? '1 magasin partenaire' : stores.length + ' magasins partenaires';
            if (state.userLocation && els.sort?.value === 'distance') {
                text += ' · triés par distance';
            }
            els.count.textContent = text;
        }

        if (!els.grid) return;

        if (stores.length === 0) {
            els.grid.innerHTML = [
                '<div class="boutique-empty">',
                '<i class="fas fa-store-slash"></i>',
                '<p>Aucun magasin ne correspond à votre recherche.</p>',
                '<p>Essayez une autre ville, région ou catégorie.</p>',
                '</div>'
            ].join('');
            return;
        }

        els.grid.innerHTML = stores.map(renderCard).join('');
    }

    function buildMapPopup(store) {
        const dist = store._distanceKm != null ? '<br><small>' + formatDistance(store._distanceKm) + '</small>' : '';
        return '<strong>' + escapeHtml(store.name) + '</strong><br>' +
            escapeHtml(store.address || store.city) + dist +
            '<br><a href="' + escapeHtml(store.mapsUrl) + '" target="_blank" rel="noopener">Itinéraire</a>';
    }

    function initMap() {
        if (!els.mapEl || typeof L === 'undefined') return;
        if (state.map) return;

        state.map = L.map(els.mapEl, { scrollWheelZoom: true }).setView([46.6, 2.4], 6);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(state.map);

        state.markersLayer = L.layerGroup().addTo(state.map);
    }

    function updateMapMarkers() {
        if (!state.map || !state.markersLayer) return;

        state.markersLayer.clearLayers();
        const stores = getFilteredStores();
        const bounds = [];

        stores.forEach(function (store) {
            if (store.lat == null || store.lng == null) return;
            const marker = L.marker([store.lat, store.lng]);
            marker.bindPopup(buildMapPopup(store));
            marker.on('click', function () {
                const card = document.querySelector('[data-store-id="' + store.id + '"]');
                if (card && state.view === 'list') {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            state.markersLayer.addLayer(marker);
            bounds.push([store.lat, store.lng]);
        });

        if (state.userLocation) {
            if (state.userMarker) {
                state.map.removeLayer(state.userMarker);
            }
            state.userMarker = L.circleMarker([state.userLocation.lat, state.userLocation.lng], {
                radius: 8,
                color: '#00c45d',
                fillColor: '#00a84d',
                fillOpacity: 0.9,
                weight: 2
            }).bindPopup('Votre position');
            state.userMarker.addTo(state.map);
            bounds.push([state.userLocation.lat, state.userLocation.lng]);
        }

        if (bounds.length === 1) {
            state.map.setView(bounds[0], 13);
        } else if (bounds.length > 1) {
            state.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
        }
    }

    function setView(view) {
        state.view = view;
        els.viewBtns?.forEach(function (btn) {
            const active = btn.dataset.view === view;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });

        els.panel?.classList.toggle('boutique-panel--map', view === 'map');

        if (view === 'map') {
            els.grid?.setAttribute('hidden', '');
            els.count?.setAttribute('hidden', '');
            els.mapWrap?.removeAttribute('hidden');
            initMap();
            setTimeout(function () {
                state.map?.invalidateSize();
                updateMapMarkers();
            }, 150);
        } else {
            els.mapWrap?.setAttribute('hidden', '');
            els.grid?.removeAttribute('hidden');
            els.count?.removeAttribute('hidden');
        }
    }

    function openPartnerModal() {
        if (!els.partnerModal) return;
        els.partnerModal.hidden = false;
        els.partnerModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('boutique-modal-open');
        els.partnerForm?.querySelector('input, textarea, select')?.focus();
    }

    function closePartnerModal() {
        if (!els.partnerModal) return;
        els.partnerModal.hidden = true;
        els.partnerModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('boutique-modal-open');
    }

    function render() {
        renderList();
        if (state.view === 'map' && state.map) {
            updateMapMarkers();
        }
    }

    function enableDistanceSort() {
        if (els.sortDistance) {
            els.sortDistance.hidden = false;
        }
        if (els.sort && els.sort.value !== 'distance') {
            els.sort.value = 'distance';
        }
    }

    function setGeoStatus(message, isError) {
        if (!els.geoStatus) return;
        els.geoStatus.hidden = !message;
        els.geoStatus.textContent = message || '';
        els.geoStatus.classList.toggle('boutique-geo-status--error', !!isError);
    }

    function requestNearMe() {
        if (!navigator.geolocation) {
            setGeoStatus('La géolocalisation n\'est pas supportée par votre navigateur.', true);
            return;
        }

        setGeoStatus('Localisation en cours…', false);
        els.nearMe?.setAttribute('disabled', 'disabled');

        navigator.geolocation.getCurrentPosition(
            function (pos) {
                state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                enableDistanceSort();
                setGeoStatus('Magasins triés par distance depuis votre position.', false);
                els.nearMe?.classList.add('active');
                els.nearMe?.removeAttribute('disabled');
                render();
            },
            function (err) {
                let msg = 'Impossible d\'obtenir votre position.';
                if (err.code === 1) msg = 'Autorisez la géolocalisation dans votre navigateur pour utiliser « Près de moi ».';
                setGeoStatus(msg, true);
                els.nearMe?.removeAttribute('disabled');
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
        );
    }

    function onGridClick(e) {
        if (e.target.closest('.boutique-btn-site')) {
            handleSiteLinkClick(e);
            return;
        }
        onCopyClick(e);
    }

    async function onCopyClick(e) {
        const btn = e.target.closest('.boutique-copy-btn');
        if (!btn) return;
        const code = btn.getAttribute('data-code');
        if (!code) return;
        const storeId = btn.getAttribute('data-store-id');
        if (storeId) await trackStat(storeId, 'promo_copies');

        navigator.clipboard.writeText(code).then(function () {
            const original = btn.innerHTML;
            btn.classList.add('copied');
            btn.innerHTML = '<i class="fas fa-check"></i> Copié !';
            setTimeout(function () {
                btn.classList.remove('copied');
                btn.innerHTML = original;
            }, 2000);
        }).catch(function () {
            window.prompt('Copiez ce code promo :', code);
        });
    }

    function showPartnerFeedback(message, isError) {
        if (!els.partnerFeedback) return;
        els.partnerFeedback.hidden = false;
        els.partnerFeedback.textContent = message;
        els.partnerFeedback.classList.toggle('boutique-partner-feedback--error', !!isError);
        els.partnerFeedback.classList.toggle('boutique-partner-feedback--success', !isError);
    }

    async function submitPartnerForm(e) {
        e.preventDefault();
        const form = els.partnerForm;
        if (!form) return;

        const shopName = form.elements.shopName?.value?.trim();
        const city = form.elements.city?.value?.trim();
        const contactName = form.elements.contactName?.value?.trim();
        const email = form.elements.email?.value?.trim();
        const phone = form.elements.phone?.value?.trim();
        const message = form.elements.message?.value?.trim();

        if (!shopName || !city || !contactName || !email) {
            showPartnerFeedback('Veuillez remplir tous les champs obligatoires.', true);
            return;
        }

        const body = [
            'Candidature partenaire boutique MangaWatch',
            '',
            'Magasin : ' + shopName,
            'Ville : ' + city,
            'Contact : ' + contactName,
            'E-mail : ' + email,
            'Téléphone : ' + (phone || '—'),
            '',
            'Informations complémentaires :',
            message || '—'
        ].join('\n');

        els.partnerSubmit?.setAttribute('disabled', 'disabled');
        showPartnerFeedback('Envoi en cours…', false);

        try {
            const { supportTicketService } = await import('/js/firebase-service.js?v=6febe20');
            await supportTicketService.createTicket({
                subject: '[Partenariat boutique] ' + shopName,
                message: body,
                userEmail: email,
                userName: contactName,
                page: window.location.href
            });
            form.reset();
            showPartnerFeedback('Merci ! Votre candidature a été envoyée. Nous vous recontacterons rapidement.', false);
            setTimeout(closePartnerModal, 2200);
        } catch (err) {
            console.error('Partenariat boutique:', err);
            try {
                const key = 'boutique_partner_applications';
                const pending = JSON.parse(localStorage.getItem(key) || '[]');
                pending.push({
                    shopName, city, contactName, email, phone, message,
                    createdAt: new Date().toISOString()
                });
                localStorage.setItem(key, JSON.stringify(pending));
                form.reset();
                showPartnerFeedback('Candidature enregistrée localement (connexion indisponible). Nous la traiterons dès que possible.', false);
                setTimeout(closePartnerModal, 2800);
            } catch (e2) {
                showPartnerFeedback('Erreur lors de l\'envoi. Réessayez ou contactez-nous via l\'aide du site.', true);
            }
        }

        els.partnerSubmit?.removeAttribute('disabled');
    }

    function init() {
        ['input', 'change'].forEach(function (ev) {
            els.search?.addEventListener(ev, render);
            els.region?.addEventListener(ev, render);
            els.category?.addEventListener(ev, render);
            els.sort?.addEventListener(ev, render);
        });

        els.nearMe?.addEventListener('click', requestNearMe);

        els.filtersToggle?.addEventListener('click', function () {
            const open = els.panel?.classList.toggle('filters-open');
            els.filtersToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        els.searchSubmit?.addEventListener('click', function () {
            els.search?.focus();
            render();
        });

        els.viewBtns?.forEach(function (btn) {
            btn.addEventListener('click', function () {
                setView(btn.dataset.view || 'list');
            });
        });

        els.grid?.addEventListener('click', onGridClick);
        els.partnerForm?.addEventListener('submit', submitPartnerForm);

        els.partnerFab?.addEventListener('click', openPartnerModal);
        document.querySelectorAll('[data-close-partner-modal]').forEach(function (el) {
            el.addEventListener('click', closePartnerModal);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && els.partnerModal && !els.partnerModal.hidden) {
                closePartnerModal();
            }
        });

        window.addEventListener('storage', function (e) {
            if (e.key === 'user' || e.key === 'isLoggedIn') render();
        });

        syncPendingStats().finally(function () {
            render();
            watchFloatingButtons();
        });

        window.addEventListener('scroll', updateFloatingButtons, { passive: true });
        window.addEventListener('resize', updateFloatingButtons);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
