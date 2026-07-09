const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const rootDir = path.join(__dirname, '..');
const jikanProxyHandler = require(path.join(rootDir, 'netlify', 'functions', 'jikan-proxy'));
const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
    const livereload = require('livereload');
    const connectLiveReload = require('connect-livereload');
    const liveReloadServer = livereload.createServer();
    liveReloadServer.watch([
        path.join(rootDir, 'pages'),
        path.join(rootDir, 'css'),
        path.join(rootDir, 'js'),
        path.join(rootDir, 'images'),
        path.join(rootDir, 'public')
    ]);
    app.use(connectLiveReload());
}

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

// Proxy Jikan (même route qu'en production Netlify)
app.get('/.netlify/functions/jikan-proxy', async (req, res) => {
    try {
        const result = await jikanProxyHandler.handler({
            httpMethod: 'GET',
            queryStringParameters: req.query
        });
        if (result.headers) {
            Object.entries(result.headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });
        }
        res.status(result.statusCode).send(result.body);
    } catch (error) {
        console.error('Erreur proxy Jikan:', error);
        res.status(502).json({
            error: 'Proxy request failed',
            message: error?.message || 'Unknown error'
        });
    }
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    if (isDev) {
        console.log('Mode dev : rechargement auto du navigateur à chaque modification (HTML/CSS/JS)');
        console.log(`→ http://localhost:${PORT}/`);
    }
});
