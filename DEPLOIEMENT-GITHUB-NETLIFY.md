# Déployer MangaWatch avec GitHub + Netlify (mise à jour automatique)

Suis ces étapes dans l’ordre.

---

## Étape 1 : Créer un compte GitHub (si tu n’en as pas)

1. Va sur **https://github.com**
2. Clique sur **Sign up**
3. Renseigne email, mot de passe, nom d’utilisateur
4. Valide ton email si demandé

---

## Étape 2 : Créer un nouveau dépôt (repository)

1. Connecte-toi sur GitHub
2. Clique sur le **+** en haut à droite → **New repository**
3. **Repository name** : par ex. `mangawatch` ou `projet_fusionne`
4. **Description** : optionnel (ex. "Site MangaWatch")
5. Choisis **Public**
6. **Ne coche pas** "Add a README" (ton projet en a déjà)
7. Clique sur **Create repository**

Tu verras une page avec des commandes ; on les utilisera à l’étape 4.

---

## Étape 3 : Installer Git sur ton PC (si ce n’est pas fait)

1. Télécharge Git pour Windows : **https://git-scm.com/download/win**
2. Installe en gardant les options par défaut
3. Ouvre un **nouveau** terminal (PowerShell ou CMD) après l’installation

Vérifier que Git est installé :
```bash
git --version
```

---

## Étape 4 : Envoyer ton projet sur GitHub

Ouvre un terminal dans le dossier du projet :

- Dans Cursor : menu **Terminal** → **New Terminal**
- Ou : `cd "c:\projet final\projet_fusionne"`

Puis exécute **une par une** ces commandes (remplace `TON-USERNAME` et `mangawatch` par ton nom d’utilisateur GitHub et le nom du repo si différent) :

```bash
git init
```
*(Si tu as déjà un dépôt Git, cette commande peut indiquer qu’il existe déjà, c’est normal.)*

```bash
git add .
```

```bash
git status
```
*(Tu dois voir la liste des fichiers ajoutés.)*

```bash
git commit -m "Premier déploiement MangaWatch"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/TON-USERNAME/mangawatch.git
```
*(Remplace TON-USERNAME par ton pseudo GitHub et mangawatch par le nom de ton repo.)*

```bash
git push -u origin main
```

- Si on te demande de te connecter : utilise ton **compte GitHub** (ou un **Personal Access Token** si l’authentification par mot de passe est désactivée).
- Pour créer un token : GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Generate new token** → coche au moins `repo` → utilise le token comme mot de passe quand Git le demande.

Quand le `git push` se termine sans erreur, ton code est sur GitHub.

---

## Étape 5 : Connecter Netlify à GitHub

1. Va sur **https://www.netlify.com**
2. Clique sur **Sign up** → **Sign up with GitHub** (connexion avec ton compte GitHub)
3. Une fois connecté : **Add new site** → **Import an existing project**
4. Choisis **Deploy with GitHub**
5. Autorise Netlify à accéder à GitHub si demandé
6. Dans la liste des dépôts, sélectionne **mangawatch** (ou le nom de ton repo)
7. **Branch to deploy** : `main`
8. **Build command** : laisse vide (site statique)
9. **Publish directory** : laisse **vide** ou mets un point **`.`** (racine du projet)
10. Clique sur **Deploy site**

Netlify va déployer ton site. À la fin tu auras une URL du type :  
**https://quelque-chose-123.netlify.app**

En ouvrant cette URL, tu dois arriver sur la page d’accueil (grâce au `index.html` à la racine qui redirige vers `pages/acceuil.html`).

---

## Étape 6 : Mises à jour automatiques (à chaque modification)

Désormais, à chaque fois que tu modifies ton site sur ton PC :

1. Ouvre un terminal dans le dossier du projet :  
   `c:\projet final\projet_fusionne`
2. Lance :

```bash
git add .
git commit -m "Description de ta modif"
git push
```

3. Netlify détecte le push et **redéploie tout seul** (en général 1 à 2 minutes).
4. Tu rafraîchis le site sur ton téléphone ou ton PC pour voir les changements.

Tu n’as plus besoin de re-téléverser les fichiers à la main : **push = mise à jour du site**.

---

## Récap

| Étape | Action |
|-------|--------|
| 1 | Compte GitHub |
| 2 | Nouveau repo (ex. `mangawatch`) |
| 3 | Installer Git sur le PC |
| 4 | `git init` → `git add .` → `git commit` → `git remote` → `git push` |
| 5 | Netlify : Import from GitHub → choisir le repo → Deploy |
| 6 | Plus tard : `git add .` → `git commit -m "..."` → `git push` pour mettre à jour le site |

Si une commande ou une étape bloque, note le message d’erreur exact et on pourra le corriger.
