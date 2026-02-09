// socialService.js - Gestion des fonctionnalités sociales avec Supabase
import { supabase } from './supabase.js';

// Récupérer les nouveaux membres (derniers inscrits)
export const getNewMembers = async (limit = 6) => {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    // Formater les données pour l'affichage
    return profiles.map(profile => ({
      id: profile.id,
      pseudo: profile.username || 'Utilisateur Anonyme',
      avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}`,
      joinedDate: new Date(profile.created_at).toLocaleDateString()
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des nouveaux membres:', error);
    return [];
  }
};

// Voter pour un anime
export const voteForAnime = async (animeId, userId) => {
  try {
    // Vérifier si l'utilisateur a déjà voté aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const { data: existingVote, error: voteError } = await supabase
      .from('user_votes')
      .select('id')
      .eq('user_id', userId)
      .eq('voted_date', today)
      .single();

    if (voteError && voteError.code !== 'PGRST116') { // PGRST116 = aucun résultat
      throw voteError;
    }

    if (existingVote) {
      // Mettre à jour le vote existant
      const { error: updateError } = await supabase
        .from('user_votes')
        .update({ anime_id: animeId, updated_at: new Date().toISOString() })
        .eq('id', existingVote.id);

      if (updateError) throw updateError;
    } else {
      // Créer un nouveau vote
      const { error: insertError } = await supabase
        .from('user_votes')
        .insert([
          { 
            user_id: userId, 
            anime_id: animeId, 
            voted_date: today 
          }
        ]);

      if (insertError) throw insertError;
    }

    // Récupérer le nombre total de votes pour cet anime
    const { count, error: countError } = await supabase
      .from('user_votes')
      .select('*', { count: 'exact', head: true })
      .eq('anime_id', animeId);

    if (countError) throw countError;

    return { success: true, votes: count };
  } catch (error) {
    console.error('Erreur lors du vote:', error);
    return { success: false, error: error.message };
  }
};

// Récupérer les tendances (animes les plus populaires)
export const getTrendingAnimes = async (limit = 5) => {
  try {
    const { data, error } = await supabase
      .rpc('get_trending_animes', { limit_count: limit });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des tendances:', error);
    return [];
  }
};

// Récupérer les commentaires récents
export const getRecentComments = async (limit = 5) => {
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        user:user_id (
          id,
          username,
          avatar_url
        ),
        anime:anime_id (
          id,
          title
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      date: new Date(comment.created_at).toLocaleString(),
      user: {
        id: comment.user.id,
        username: comment.user.username || 'Utilisateur Anonyme',
        avatar: comment.user.avatar_url || 'https://ui-avatars.com/api/?name=U'
      },
      anime: {
        id: comment.anime.id,
        title: comment.anime.title
      }
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des commentaires:', error);
    return [];
  }
};

export default {
  getNewMembers,
  voteForAnime,
  getTrendingAnimes,
  getRecentComments
};
