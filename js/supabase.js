import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { supabaseConfig, TABLES } from './config.js';

let supabase;

// Si la config est vide, fournir un mock inactif pour éviter les erreurs runtime
if (!supabaseConfig.supabaseUrl || !supabaseConfig.supabaseKey) {
    console.warn('[Supabase] Désactivé (config vide). Utilisation locale uniquement.');
    supabase = {
        from() {
            const noop = async () => ({ data: null, error: null });
            return {
                select: noop,
                upsert: noop,
                insert: noop,
                update: noop,
                delete: noop
            };
        },
        auth: {
            onAuthStateChange: () => ({ data: null }),
            getUser: async () => ({ data: { user: null } }),
            signOut: async () => ({})
        }
    };
} else {
    console.log('[Supabase] Initialisation avec l\'URL:', supabaseConfig.supabaseUrl);
    supabase = createClient(
        supabaseConfig.supabaseUrl,
        supabaseConfig.supabaseKey,
        {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        }
    );
}

// Exposer le client et la config pour les scripts non-module
if (typeof window !== 'undefined') {
    window.supabase = supabase;
    window.supabaseConfig = supabaseConfig;
    window.SUPABASE_TABLES = TABLES;
}

export { supabase };

// Fonctions pour gérer les sujets et réponses
export const forumService = {
  // Récupérer tous les sujets
  async getTopics() {
    const { data, error } = await supabase
      .from(TABLES.TOPICS)
      .select(`
        *,
        user:user_id (id, username, avatar_url)
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  },
  
  // Récupérer un sujet par son ID
  async getTopic(id) {
    const { data, error } = await supabase
      .from(TABLES.TOPICS)
      .select(`
        *,
        user:user_id (id, username, avatar_url)
      `)
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  },
  
  // Créer un nouveau sujet
  async createTopic(topicData) {
    const { data, error } = await supabase
      .from(TABLES.TOPICS)
      .insert([topicData])
      .select();
      
    if (error) throw error;
    return data?.[0];
  },
  
  // Mettre à jour un sujet
  async updateTopic(id, updates) {
    const { data, error } = await supabase
      .from(TABLES.TOPICS)
      .update(updates)
      .eq('id', id)
      .select();
      
    if (error) throw error;
    return data?.[0];
  },
  
  // Supprimer un sujet
  async deleteTopic(id) {
    const { error } = await supabase
      .from(TABLES.TOPICS)
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return true;
  },
  
  // Récupérer les réponses d'un sujet
  async getTopicReplies(topicId) {
    const { data, error } = await supabase
      .from(TABLES.REPLIES)
      .select(`
        *,
        user:user_id (id, username, avatar_url)
      `)
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true });
      
    if (error) throw error;
    return data || [];
  },
  
  // Créer une nouvelle réponse
  async createReply(replyData) {
    const { data, error } = await supabase
      .from(TABLES.REPLIES)
      .insert([replyData])
      .select();
      
    if (error) throw error;
    return data?.[0];
  },
  
  // Mettre à jour une réponse
  async updateReply(id, updates) {
    const { data, error } = await supabase
      .from(TABLES.REPLIES)
      .update(updates)
      .eq('id', id)
      .select();
      
    if (error) throw error;
    return data?.[0];
  },
  
  // Supprimer une réponse
  async deleteReply(id) {
    const { error } = await supabase
      .from(TABLES.REPLIES)
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return true;
  }
};

// Gestion de l'authentification
export const authService = {
  // Se connecter avec Google
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    
    if (error) throw error;
    return data;
  },
  
  // Se déconnecter
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  
  // Récupérer l'utilisateur actuel
  getCurrentUser() {
    return supabase.auth.getUser();
  },
  
  // Écouter les changements d'authentification
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session?.user || null);
    });
  }
};
