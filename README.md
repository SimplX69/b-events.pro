# B-Events.pro — Site vitrine

Site statique pour **B-Events**, plateforme de networking B2B & B2G par l'expérience (sport, culture, visites insolites) en Auvergne-Rhône-Alpes.

## Structure

```
b-events-site/
├── index.html          # Page principale
├── style.css           # Styles (séparés)
├── script.js           # Interactivité (menu mobile, scroll reveal, formulaire)
├── images/
│   └── hero-bg.svg     # Fond du hero
├── .gitignore
└── README.md
```

## Déploiement sur GitHub Pages

### 1. Créer le dépôt

```bash
cd b-events-site
git init
git add .
git commit -m "Initial commit — site B-Events.pro"
```

### 2. Pousser sur GitHub

```bash
git remote add origin https://github.com/VOTRE-USER/b-events-site.git
git branch -M main
git push -u origin main
```

### 3. Activer GitHub Pages

1. Aller dans **Settings** > **Pages** du dépôt
2. Source : **Deploy from a branch**
3. Branch : `main` / dossier `/ (root)`
4. Sauvegarder

Le site sera accessible à : `https://VOTRE-USER.github.io/b-events-site/`

### 4. Domaine personnalisé (optionnel)

Pour utiliser `www.b-events.pro` :

1. Ajouter un fichier `CNAME` à la racine contenant : `www.b-events.pro`
2. Chez votre registrar DNS, ajouter :
   - Un enregistrement **CNAME** : `www` → `VOTRE-USER.github.io`
   - Quatre enregistrements **A** vers les IP GitHub Pages :
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```
3. Dans Settings > Pages, renseigner le domaine et cocher **Enforce HTTPS**

## Personnalisation

- **Couleurs** : modifier les variables CSS dans `:root` en haut de `style.css`
- **Événements** : ajouter/modifier les blocs `.event-card` dans `index.html`
- **Formulaire** : connecter à un backend (Formspree, Google Forms, Netlify Forms) en ajoutant l'attribut `action` au `<form>`
- **Images** : remplacer `images/hero-bg.svg` par une photo ou ajouter des photos dans `images/`

## Technologies

- HTML5 / CSS3 / JavaScript vanilla
- Google Fonts (DM Serif Display + DM Sans)
- Aucune dépendance, aucun framework
