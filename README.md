# Sentinelle — Prototype PWA

Prototype fonctionnel démontrant le concept Sentinelle : prévision d'impact météo (inondation, canicule, orage) + signalement citoyen vérifié, sur une commune fictive de démonstration ("Rivière-sur-Seine").

## Contenu

- `index.html` — l'application (carte schématique des quartiers, flux d'alertes, signalement citoyen, simulation en direct).
- `manifest.json` — manifeste PWA (icône, nom, couleurs).
- `sw.js` — service worker (mise en cache pour un fonctionnement hors-ligne basique).
- `icons/` — icônes de l'application.

## Déployer pour tester l'installation réelle (PWA)

Ce prototype a besoin d'être servi via HTTPS (ou localhost) pour que l'installation sur écran d'accueil (Android/desktop Chrome) fonctionne. Trois options rapides et gratuites :

1. **Netlify Drop** — glissez-déposez ce dossier sur https://app.netlify.com/drop, une URL HTTPS est générée immédiatement.
2. **Vercel** — `npx vercel` depuis ce dossier (nécessite un compte Vercel).
3. **GitHub Pages** — poussez ce dossier dans un dépôt GitHub, activez Pages sur la branche.

Sur iPhone (Safari), l'installation se fait via "Partager → Sur l'écran d'accueil" (Safari ne propose pas l'invite d'installation automatique).

## Carte réelle (données Hub'Eau en direct)

Dans l'onglet "Carte", le bouton **"Carte réelle (Seine)"** bascule vers une vraie carte (Leaflet + fond OpenStreetMap) avec deux stations hydrométriques réelles sur la Seine à Paris (Austerlitz et Pont des Invalides). Les niveaux d'eau et débits affichés sont interrogés en direct sur l'API publique **Hub'Eau** (hubeau.eaufrance.fr/api/v2/hydrometrie), qui est ouverte, gratuite, sans clé et compatible CORS (données mises à jour ~toutes les 5 minutes par le service public).

Cette fonctionnalité a besoin d'un accès réseau sortant vers `cdnjs.cloudflare.com` (bibliothèque Leaflet), `tile.openstreetmap.org` (fond de carte) et `hubeau.eaufrance.fr` (données) — elle fonctionnera normalement une fois déployée sur Netlify/Vercel/GitHub Pages, mais peut être bloquée dans un environnement au réseau restreint (proxy d'entreprise, sandbox fermée).

## Limites du prototype

- La commune, les quartiers et les signalements sont des données fictives générées pour la démonstration ; seule la carte réelle (ci-dessus) utilise des données publiques authentiques.
- La simulation en direct (nouveaux signalements toutes les ~9 secondes) sert à rendre la démo vivante ; elle n'utilise aucune donnée météo réelle.
- Pour une version pleinement connectée, il resterait à brancher l'API APIC de Météo-France (pluies intenses), un modèle de prévision d'impact, et à étendre les stations réelles à la commune pilote choisie (voir la note de concept et le business plan associés).
