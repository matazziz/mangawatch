const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const rootDir = path.join(__dirname, '..');

// Configuration de multer pour l'upload des fichiers
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'avatars/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Route pour l'upload des avatars
app.post('/upload-avatar', upload.single('avatar'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier n\'a été uploadé' });
        }

        // Créer l'URL de l'avatar
        const avatarUrl = `/avatars/${req.file.filename}`;
        res.json({ url: avatarUrl });
    } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload de l\'avatar' });
    }
});

// Servir les fichiers statiques depuis la racine du projet
app.use(express.static(rootDir));

// Aligner le comportement local avec Netlify (/ -> /pages/acceuil.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(rootDir, 'pages', 'acceuil.html'));
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
