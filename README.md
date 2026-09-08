# Sentinelle — Prototype PWA

Prototype fonctionnel démontrant le concept Sentinelle : prévision d'impact météo (inondation, canicule, orage) + signalement citoyen vérifié, sur une commune fictive de démonstration ("Rivière-sur-Seine"), avec des couches de données réelles couvrant toute la France (crues Hub'Eau, vigilance météo nationale).

## Contenu

- `index.html` — structure de l'application.
- `css/base.css` — styles structurels (mise en page, composants), indépendants du thème.
- `css/themes.css` — jeux de variables de couleurs/typo/rayons pour chaque thème visuel.
- `js/` — logique applicative en modules ES :
  - `data.js` — données de démonstration (quartiers, aléas, textes d'impact).
  - `store.js` — état central des niveaux de risque + rendu de la carte/détail/alerte.
  - `theme.js` — registre des thèmes et sélecteur.
  - `feed.js` — flux d'alertes & signalements.
  - `geo.js` — géocodage/géolocalisation (API Adresse, sans clé).
  - `departments.js` — référentiel des départements français + types d'aléas de vigilance.
  - `map.js` — carte réelle des crues, France entière (Leaflet + API Hub'Eau).
  - `vigilance.js` — vue "Vigilance France" (consomme `/api/vigilance`).
  - `report.js` — formulaire de signalement citoyen.
  - `sim.js` — simulation d'événements en direct.
  - `app.js` — point d'entrée, wiring des événements DOM.
- `api/vigilance.js` — fonction serverless (Vercel) : proxy sécurisé vers l'API de vigilance Météo-France (garde la clé côté serveur).
- `manifest.json` — manifeste PWA (icône, nom, couleurs).
- `sw.js` — service worker (mise en cache pour un fonctionnement hors-ligne basique ; ne met jamais en cache `/api/*`).
- `icons/` — icônes de l'application.

## Thèmes visuels

L'onglet **Réglages** permet de changer l'habillage de l'application parmi 6 thèmes (Sentinelle, Netflix, Meta, CapCut, Instagram, Apple), chacun avec ses propres couleurs, typographie et rayons de bordure. Le choix est mémorisé (localStorage) et réappliqué au chargement suivant, sans flash visuel.

Les couleurs de niveau de risque (vert/jaune/orange/rouge) restent volontairement identiques dans tous les thèmes : ce sont des codes de sécurité, pas une variable de marque.

## Deux façons de déployer — statique (GitHub Pages) vs complet (Vercel)

L'application a deux niveaux de fonctionnalités selon l'hébergement, parce que la vigilance météo nationale a besoin d'un secret (clé API Météo-France) qui ne peut pas vivre dans du code client :

| | GitHub Pages (statique) | Vercel (avec fonction serverless) |
|---|---|---|
| Carte schématique, signalement, thèmes, simulation | ✅ | ✅ |
| Crues réelles Hub'Eau (recherche commune, France entière) | ✅ (100% client, sans clé) | ✅ |
| Vigilance météo nationale (tous aléas, tous départements) | ❌ (message explicite affiché) | ✅ (si les identifiants sont configurés) |

### Option A — GitHub Pages (le plus simple)

Repo → **Settings → Pages → Source : Deploy from a branch → `main` / `(root)`**. Le lien apparaît sous `https://<user>.github.io/<repo>/`. L'onglet "Vigilance France" affichera un message indiquant que cette fonctionnalité nécessite le déploiement complet.

### Option B — Vercel (fonctionnalités complètes)

1. Connectez ce dépôt à Vercel (dashboard Vercel → *Add New → Project* → importez le repo), ou lancez `npx vercel` depuis ce dossier.
2. Créez un compte gratuit sur **https://portail-api.meteofrance.fr**, puis une application pour l'API de vigilance (nom exact de la ressource à repérer dans leur documentation — a évolué au fil du temps).
3. Dans Vercel → *Settings → Environment Variables*, ajoutez `METEOFRANCE_CLIENT_ID` et `METEOFRANCE_CLIENT_SECRET` (voir `.env.example`).
4. Redéployez. `/api/vigilance` sera alors actif.

⚠️ `api/vigilance.js` a été écrit sans accès réseau vers meteofrance.fr (environnement de développement au réseau restreint) : l'URL exacte du endpoint de vigilance et la forme de sa réponse JSON doivent être vérifiées/ajustées une fois que vous avez un compte sur le portail — voir les commentaires en tête du fichier.

Sur iPhone (Safari), l'installation se fait via "Partager → Sur l'écran d'accueil" (Safari ne propose pas l'invite d'installation automatique).

Pour tester en local (sans la vigilance nationale) : `python3 -m http.server 8080` depuis le dossier, puis ouvrir `http://localhost:8080`. Pour tester avec la fonction serverless en local : `npx vercel dev`.

## Crues réelles, France entière (Hub'Eau)

Dans l'onglet "Carte", **"🌊 Crues réelles"** affiche une vraie carte (Leaflet + fond OpenStreetMap). Par défaut : deux stations vérifiées sur la Seine à Paris (Austerlitz, Pont des Invalides). Un champ de recherche permet de taper n'importe quelle commune française (ou d'utiliser 📍 pour se géolocaliser) : l'app géocode la commune (API Adresse, data.gouv.fr, sans clé), déduit son département, puis interroge le référentiel Hub'Eau pour afficher les stations hydrométriques réelles les plus proches, n'importe où en France.

Les niveaux d'eau et débits affichés sont interrogés en direct sur l'API publique **Hub'Eau** (hubeau.eaufrance.fr/api/v2/hydrometrie), ouverte, gratuite, sans clé et compatible CORS (données mises à jour ~toutes les 5 minutes par le service public). Une flèche de tendance (hausse/baisse) est calculée à partir des dernières observations réelles, et la liste se rafraîchit automatiquement toutes les 5 minutes.

Cette fonctionnalité a besoin d'un accès réseau sortant vers `cdnjs.cloudflare.com` (Leaflet), `tile.openstreetmap.org` (fond de carte), `api-adresse.data.gouv.fr` (recherche de commune) et `hubeau.eaufrance.fr` (données) — elle fonctionne une fois déployée, mais peut être bloquée dans un environnement au réseau restreint (proxy d'entreprise, sandbox fermée), auquel cas un message explicite s'affiche au lieu de planter.

## Vigilance météo nationale (Météo-France)

**"🇫🇷 Vigilance France"** liste les départements triés par niveau de vigilance (vert/jaune/orange/rouge) avec les aléas actifs (crue, canicule, orage, vent, neige-verglas, grand-froid, avalanches, submersion), filtrables par nom/numéro. Nécessite le déploiement Vercel avec la fonction serverless configurée (voir ci-dessus) — sur GitHub Pages, un message l'indique clairement.

## Limites du prototype

- La commune fictive "Rivière-sur-Seine", ses quartiers et ses signalements restent des données de démonstration ; les couches "Crues réelles" et "Vigilance France" utilisent, elles, des données publiques authentiques.
- La simulation en direct (nouveaux signalements toutes les ~9 secondes) sert à rendre la démo vivante ; elle n'utilise aucune donnée météo réelle.
- Pour une version pleinement connectée, il resterait à brancher l'API APIC de Météo-France (pluies intenses fortes, alertes infra-communales), un vrai modèle de prévision d'impact croisant vigilance + vulnérabilité locale + signalements citoyens, avec un vrai backend de modération anti-abus — voir la note de concept et le business plan associés.
