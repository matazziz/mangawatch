-- Créer la table des messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email TEXT, -- NULL pour messages globaux, email pour messages privés
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'ban', 'thank', 'global'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT, -- Email de l'admin qui a créé le message
    metadata JSONB -- Pour stocker des infos supplémentaires (raison du bannissement, etc.)
);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_messages_recipient_email ON public.messages(recipient_email);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(message_type);

-- Activer RLS
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

-- Politique: Tous les utilisateurs peuvent lire leurs propres messages et les messages globaux
CREATE POLICY "Users can read their own messages and global messages"
ON public.messages
FOR SELECT
TO public
USING (
    recipient_email IS NULL -- Messages globaux
    OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
);

-- Politique: Seuls les admins peuvent insérer des messages
-- Note: Cette politique nécessite une fonction pour vérifier si l'utilisateur est admin
-- Pour l'instant, on permet l'insertion à tous les utilisateurs authentifiés
-- Vous devrez créer une table admin_users ou une fonction pour vérifier les admins
CREATE POLICY "Authenticated users can insert messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Politique: Les utilisateurs peuvent marquer leurs messages comme lus
CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
    recipient_email IS NULL OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
)
WITH CHECK (
    recipient_email IS NULL OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1)
);

