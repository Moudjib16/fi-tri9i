# Fi Tri9i — Covoiturage algérien

Fi Tri9i ("sur ma route", en dialecte algérien) est une application web de covoiturage
wilaya par wilaya : les conducteurs publient leurs trajets en 9 étapes, les passagers
s'inscrivent, se connectent et réservent leurs places.

## Fonctionnalités

- Inscription / connexion avec mot de passe haché (bcrypt) et session persistante
- Assistant de publication en 9 étapes : wilaya et commune de départ, wilaya et
  commune d'arrivée, date, heure, nombre de places, prix, description
- Validation côté serveur à chaque étape + réponses JSON pour les étapes AJAX
- Pages d'erreur dédiées (email existant, utilisateur introuvable, mot de passe erroné, 404)
- Sécurité de base : helmet, limitation de débit sur l'authentification, cookies httpOnly

## Stack technique

Node.js + Express 4, EJS, Mongoose (MongoDB), express-session, bcrypt, helmet,
express-rate-limit, morgan.

## Prérequis

- Node.js >= 18
- MongoDB accessible (local ou conteneur Docker sur le port 27017)

## Installation et lancement

```powershell
npm install
npm start       # http://localhost:3000
npm run dev     # avec rechargement automatique (nodemon)
```

## Configuration (.env)

```ini
PORT=3000
MONGO_URI=mongodb://localhost:27017/MyApp
SESSION_SECRET=change-me-in-production
NODE_ENV=development
```

Voir `.env.example` pour le modèle. Le fichier `.env` local est ignoré par git.

## Parcours de test

1. `/signup` — créer un compte (mot de passe de 6 caractères minimum, Client=1 / Driver=2)
2. `/login` — email inconnu → page « User Not Found », mauvais mot de passe → « Wrong Password »
3. `/publier/page1` → … → `/publier/description` — publier un trajet (les formulaires
   redirigent, les étapes date/heure/places/prix/description sauvegardent en AJAX)
4. Vérifier dans MongoDB : `db.users.find()` et `db.trips.find()` sur la base `MyApp`

## Structure du projet

```text
app.js            # application Express (routes auth + wizard)
db/db.js          # connexion Mongoose (via MONGO_URI)
models/           # schémas User et Trip
views/            # gabarits EJS (home, login, signup, publier/*, partials)
public/           # CSS, JS et images par page
```

## Feuille de route

- Extraction des routes dans des routeurs Express (`routes/`)
- Store de session persistant (connect-mongo) pour la production
- Recherche de trajets, profils, messagerie, paiement (les menus pointent ces
  futures pages)
- Suite de tests automatisés (supertest) et validation avec Joi/Zod
