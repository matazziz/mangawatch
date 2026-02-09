-- Migration pour créer les tables de notes et top10
-- Ces tables stockent les notes et le top 10 de chaque utilisateur

-- Table pour les notes utilisateur
CREATE TABLE IF NOT EXISTS public.user_content_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL, -- Email de l'utilisateur (compatible avec auth locale)
    content_id TEXT NOT NULL, -- ID du contenu (anime, manga, etc.)
    content_type TEXT NOT NULL, -- 'anime', 'manga', 'roman', 'doujin', 'manhwa', 'manhua', 'film'
    note INTEGER NOT NULL CHECK (note >= 1 AND note <= 10), -- Note entre 1 et 10
    titre TEXT,
    image TEXT,
    synopsis TEXT,
    genres JSONB, -- Tableau de genres
    score NUMERIC(3,2), -- Score du contenu (ex: 8.5)
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte unique : un utilisateur ne peut avoir qu'une note par contenu/type
    UNIQUE(user_email, content_id, content_type)
);

-- Table pour le top 10 utilisateur
CREATE TABLE IF NOT EXISTS public.user_top10 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_email TEXT NOT NULL, -- Email de l'utilisateur
    content_id TEXT NOT NULL, -- ID du contenu
    content_type TEXT NOT NULL, -- Type de contenu
    rang INTEGER NOT NULL CHECK (rang >= 1 AND rang <= 10), -- Position dans le top 10 (1-10)
    titre TEXT,
    image TEXT,
    synopsis TEXT,
    genres JSONB,
    score NUMERIC(3,2),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte unique : un utilisateur ne peut avoir qu'un contenu par rang
    UNIQUE(user_email, rang),
    -- Contrainte unique : un utilisateur ne peut avoir qu'une entrée par contenu/type
    UNIQUE(user_email, content_id, content_type)
);

-- Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_notes_user_email ON public.user_content_notes(user_email);
CREATE INDEX IF NOT EXISTS idx_notes_content_type ON public.user_content_notes(content_type);
CREATE INDEX IF NOT EXISTS idx_notes_user_type ON public.user_content_notes(user_email, content_type);
CREATE INDEX IF NOT EXISTS idx_notes_added_at ON public.user_content_notes(added_at DESC);

CREATE INDEX IF NOT EXISTS idx_top10_user_email ON public.user_top10(user_email);
CREATE INDEX IF NOT EXISTS idx_top10_user_rang ON public.user_top10(user_email, rang);
CREATE INDEX IF NOT EXISTS idx_top10_content_type ON public.user_top10(content_type);

-- Activer Row Level Security (RLS)
ALTER TABLE IF EXISTS public.user_content_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_top10 ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour user_content_notes
-- Les utilisateurs peuvent lire leurs propres notes
CREATE POLICY "Users can read their own notes"
ON public.user_content_notes
FOR SELECT
TO public
USING (true); -- Pour l'instant, on permet la lecture à tous (on peut restreindre plus tard)

-- Les utilisateurs peuvent insérer leurs propres notes
CREATE POLICY "Users can insert their own notes"
ON public.user_content_notes
FOR INSERT
TO public
WITH CHECK (true); -- On vérifiera côté application avec l'email

-- Les utilisateurs peuvent mettre à jour leurs propres notes
CREATE POLICY "Users can update their own notes"
ON public.user_content_notes
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Les utilisateurs peuvent supprimer leurs propres notes
CREATE POLICY "Users can delete their own notes"
ON public.user_content_notes
FOR DELETE
TO public
USING (true);

-- Politiques RLS pour user_top10
-- Les utilisateurs peuvent lire leur propre top 10
CREATE POLICY "Users can read their own top10"
ON public.user_top10
FOR SELECT
TO public
USING (true);

-- Les utilisateurs peuvent insérer dans leur propre top 10
CREATE POLICY "Users can insert their own top10"
ON public.user_top10
FOR INSERT
TO public
WITH CHECK (true);

-- Les utilisateurs peuvent mettre à jour leur propre top 10
CREATE POLICY "Users can update their own top10"
ON public.user_top10
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Les utilisateurs peuvent supprimer de leur propre top 10
CREATE POLICY "Users can delete their own top10"
ON public.user_top10
FOR DELETE
TO public
USING (true);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON public.user_content_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_top10_updated_at
    BEFORE UPDATE ON public.user_top10
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();