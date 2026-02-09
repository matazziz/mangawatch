const express = require('express');
const multer = require('multer');
const path = require('path');
const http = require('http');
const fs = require('fs');
const app = express();

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

// Servir les fichiers statiques
app.use(express.static(__dirname));

// Créer un serveur HTTP pour servir les fichiers statiques
const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, req.url === '/' ? 'acceuil.html' : req.url);
    
    // Déterminer le type MIME
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    
    switch (ext) {
        case '.js':
            contentType = 'application/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
        case '.jpeg':
            contentType = 'image/jpeg';
            break;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Fichier non trouvé
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - Page non trouvée</h1>');
            } else {
                // Autre erreur
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 - Erreur serveur</h1>');
            }
        } else {
            // Fichier trouvé
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});

// Démarrer le serveur HTTP
server.listen(8080, () => {
    console.log(`Serveur HTTP en cours d'exécution sur le port 8080`);
});
