-- Script pour vérifier et mettre à jour la structure des tables du forum

-- 1. Vérifier si la table forum_topics existe
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_name = 'forum_topics';

-- 2. Vérifier si la colonne category existe dans forum_topics
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'forum_topics' 
    AND column_name = 'category'
) AS has_category_column;

-- 3. Vérifier si la clé étrangère vers profiles existe
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'forum_topics';

-- 4. Script pour ajouter la colonne category si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'forum_topics' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE forum_topics 
        ADD COLUMN category VARCHAR(50) DEFAULT 'general';
        RAISE NOTICE 'Colonne category ajoutée à forum_topics';
    ELSE
        RAISE NOTICE 'La colonne category existe déjà dans forum_topics';
    END IF;
END $$;

-- 5. Script pour ajouter la clé étrangère vers profiles si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'forum_topics' 
        AND constraint_name = 'forum_topics_user_id_fkey'
    ) THEN
        -- D'abord, s'assurer que la colonne user_id existe
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'forum_topics' 
            AND column_name = 'user_id'
        ) THEN
            ALTER TABLE forum_topics 
            ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
            
            -- Mettre à jour avec une valeur par défaut si nécessaire
            -- UPDATE forum_topics SET user_id = [valeur_par_défaut] WHERE user_id IS NULL;
        ELSE
            -- Si la colonne existe déjà mais pas la contrainte
            ALTER TABLE forum_topics 
            ADD CONSTRAINT forum_topics_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
        END IF;
        RAISE NOTICE 'Clé étrangère user_id ajoutée à forum_topics';
    ELSE
        RAISE NOTICE 'La clé étrangère user_id existe déjà dans forum_topics';
    END IF;
END $$;
