import { CONFIG } from '../config.js';

export class MangaService {
    constructor() {
        this.cache = new Map();
    }

    async getMangas(page = 1, limit = 10) {
        try {
            const cacheKey = `mangas_${page}_${limit}`;
            const cachedData = this.cache.get(cacheKey);
            
            if (cachedData && Date.now() - cachedData.timestamp < 300000) { // 5 minutes
                return cachedData.data;
            }

            const response = await fetch(`${CONFIG.API_URL}/mangas?page=${page}&limit=${limit}`);
            const data = await response.json();

            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('Erreur lors de la récupération des mangas:', error);
            return [];
        }
    }

    async getMangaDetails(id) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/mangas/${id}`);
            if (!response.ok) throw new Error('Manga non trouvé');
            return await response.json();
        } catch (error) {
            console.error('Erreur lors de la récupération des détails du manga:', error);
            return null;
        }
    }

    async searchMangas(query, page = 1, limit = 10) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/mangas/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
            return await response.json();
        } catch (error) {
            console.error('Erreur lors de la recherche des mangas:', error);
            return [];
        }
    }

    async getTiers() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/tiers`);
            return await response.json();
        } catch (error) {
            console.error('Erreur lors de la récupération des tiers:', error);
            return [];
        }
    }

    async updateTier(mangaId, tier) {
        try {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER) || 'null');
            if (!user) return false;

            const response = await fetch(`${CONFIG.API_URL}/tiers/${mangaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ tier })
            });

            return response.ok;
        } catch (error) {
            console.error('Erreur lors de la mise à jour du tier:', error);
            return false;
        }
    }

    async getUserTierList() {
        try {
            const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER) || 'null');
            if (!user) return null;

            const response = await fetch(`${CONFIG.API_URL}/tiers/user`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`
                }
            });

            return await response.json();
        } catch (error) {
            console.error('Erreur lors de la récupération de la liste des tiers:', error);
            return null;
        }
    }
}
