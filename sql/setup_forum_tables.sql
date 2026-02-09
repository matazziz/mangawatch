-- Script de configuration des tables du forum pour Supabase

-- 1. Créer la table forum_topics si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.forum_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    views INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Activer les RLS (Row Level Security) pour la table
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;

-- 3. Créer les politiques RLS pour la sécurité
-- Autoriser la lecture à tous
CREATE POLICY "Allow public read access" 
ON public.forum_topics 
FOR SELECT 
USING (true);

-- Autoriser l'insertion aux utilisateurs authentifiés
CREATE POLICY "Allow insert for authenticated users" 
ON public.forum_topics 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Autoriser la mise à jour uniquement aux créateurs ou aux admins
CREATE POLICY "Allow update for topic owners" 
ON public.forum_topics 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

-- 4. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_forum_topics_created_at ON public.forum_topics(created_at);
CREATE INDEX IF NOT EXISTS idx_forum_topics_user_id ON public.forum_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_category ON public.forum_topics(category);

-- 5. Créer une fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Créer un déclencheur pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS update_forum_topics_updated_at ON public.forum_topics;
CREATE TRIGGER update_forum_topics_updated_at
BEFORE UPDATE ON public.forum_topics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 7. Donner les permissions nécessaires
GRANT ALL ON public.forum_topics TO service_role;
GRANT SELECT ON public.forum_topics TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.forum_topics TO authenticated;

-- 8. Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
