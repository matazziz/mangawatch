// Configuration Supabase
export const supabaseConfig = {
  // URL de base de votre projet Supabase
  supabaseUrl: '',
  
  // Clé publique (anonyme) - sûre pour le navigateur
  supabaseKey: '',
  
  // Clé de service (à utiliser uniquement côté serveur)
  serviceRoleKey: '' // À remplir si nécessaire côté serveur
};

// Structure de table pour le forum
export const TABLES = {
  TOPICS: 'forum_topics',
  REPLIES: 'forum_replies',
  USERS: 'forum_users',
  NOTES: 'user_content_notes',
  TOP10: 'user_top10'
};
