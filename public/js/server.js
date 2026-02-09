const express = require('express');
const path = require('path');
const app = express();
const port = 8080;

// Servir les fichiers statiques depuis le répertoire racine
app.use(express.static(path.join(__dirname)));

// Rediriger la racine vers la page d'accueil
app.get('/', (req, res) => {
    res.redirect('/pages/acceuil.html');
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
    console.log(`Page d'accueil: http://localhost:${port}/pages/acceuil.html`);
});
