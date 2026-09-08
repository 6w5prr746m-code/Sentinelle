// Données de démonstration : commune fictive, aléas, quartiers, contributeurs.

export const HAZARDS = [
  { id: 'inondation', label: 'Inondation', icon: '🌊' },
  { id: 'canicule', label: 'Canicule', icon: '🌡️' },
  { id: 'orage', label: 'Orage / vent', icon: '⛈️' },
];

export const ZONES = [
  { id: 'centre', name: 'Centre-Ville' },
  { id: 'bord', name: 'Bord-de-Rivière' },
  { id: 'pont', name: 'Vieux-Pont' },
  { id: 'gare', name: 'Quartier Gare' },
  { id: 'indus', name: 'Zone Industrielle' },
  { id: 'coteaux', name: 'Les Coteaux' },
  { id: 'marche', name: 'Vieux-Marché' },
  { id: 'ecoles', name: 'Quartier Écoles' },
  { id: 'parc', name: 'Parc Nord' },
  { id: 'basse', name: 'Ville-Basse' },
  { id: 'plateau', name: 'Le Plateau' },
  { id: 'rocade', name: 'La Rocade' },
];

export const CONTRIBUTORS = [
  { name: 'Marc D.', trust: 88 },
  { name: 'Salima B.', trust: 92 },
  { name: 'Yanis T.', trust: 35 },
  { name: 'Claire M.', trust: 97 },
  { name: 'Contributeur anonyme', trust: 20 },
  { name: 'Nadia F.', trust: 76 },
];

export const LEVEL_LABEL = ['Normal', 'Attention', 'Vigilance', 'Danger'];

export const IMPACT_TEXT = {
  inondation: {
    0: (z) => `Aucun signe de montée des eaux à ${z}. Situation normale.`,
    1: (z) => `Sol saturé à ${z}, petites accumulations possibles en points bas.`,
    2: (z) => `Montée des eaux estimée à ${z} d'ici 2h. Évitez les sous-sols et parkings enterrés.`,
    3: (z) => `Crue rapide en cours à ${z}. Ne vous engagez pas sur les routes immergées, montez en étage si besoin.`,
  },
  canicule: {
    0: (z) => `Températures dans les normales à ${z}.`,
    1: (z) => `Chaleur marquée à ${z}, pensez à vous hydrater et surveiller les personnes fragiles.`,
    2: (z) => `Pic de chaleur attendu à ${z} en après-midi. Limitez les efforts en extérieur entre 12h et 18h.`,
    3: (z) => `Canicule sévère à ${z}. Restez dans un lieu frais, contactez vos proches isolés ou âgés.`,
  },
  orage: {
    0: (z) => `Pas d'activité orageuse prévue à ${z}.`,
    1: (z) => `Orages isolés possibles à ${z} en soirée.`,
    2: (z) => `Rafales fortes et orages attendus à ${z}. Rentrez les objets extérieurs.`,
    3: (z) => `Orage violent en cours à ${z}. Évitez tout déplacement, éloignez-vous des fenêtres.`,
  },
};

export function buildInitialState() {
  const state = {};
  ZONES.forEach((z) => {
    state[z.id] = {
      inondation: z.id === 'bord' ? 2 : z.id === 'pont' ? 1 : Math.random() < 0.15 ? 1 : 0,
      canicule: z.id === 'indus' ? 2 : z.id === 'rocade' ? 2 : Math.random() < 0.2 ? 1 : 0,
      orage: Math.random() < 0.15 ? 1 : 0,
      confidence: {
        inondation: 70 + Math.floor(Math.random() * 20),
        canicule: 60 + Math.floor(Math.random() * 25),
        orage: 55 + Math.floor(Math.random() * 25),
      },
    };
  });
  return state;
}
