// Fonction serverless (Vercel, runtime Node) : proxy vers l'API de
// vigilance météo nationale de Météo-France.
//
// POURQUOI UN PROXY : l'API vigilance de Météo-France (portail-api.meteofrance.fr)
// exige des identifiants (client_id/client_secret, échangés contre un jeton
// OAuth2) — un secret qui ne doit jamais être exposé dans du code client. Ce
// fichier tourne côté serveur (Vercel) et garde le secret dans des variables
// d'environnement ; le front n'appelle que /api/vigilance, sans jamais voir
// la clé.
//
// ⚠️ À VÉRIFIER / ADAPTER AVANT PRODUCTION :
// Ce fichier n'a pas pu être testé contre l'API réelle depuis l'environnement
// de développement (accès réseau sortant restreint vers meteofrance.fr).
// L'URL du endpoint de jeton, le chemin exact de l'API vigilance (nom/version
// de la ressource sur le portail), et la forme précise de la réponse JSON
// doivent être confirmés sur https://portail-api.meteofrance.fr une fois que
// vous avez créé un compte et une application, puis ajustés ici si besoin
// (voir parseVigilanceResponse ci-dessous, écrite de façon défensive pour
// tolérer de petites différences de schéma).
//
// Variables d'environnement requises (à définir dans le dashboard Vercel) :
//   METEOFRANCE_CLIENT_ID
//   METEOFRANCE_CLIENT_SECRET

const TOKEN_URL = 'https://portail-api.meteofrance.fr/token';
const VIGILANCE_URL = 'https://portail-api.meteofrance.fr/DPVigilance/v1/cartevigilance/encours';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = { data: null, expiresAt: 0 };

async function getAccessToken() {
  const id = process.env.METEOFRANCE_CLIENT_ID;
  const secret = process.env.METEOFRANCE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error('METEOFRANCE_CLIENT_ID / METEOFRANCE_CLIENT_SECRET absents des variables d\'environnement.');
  }
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Échec de l'authentification Météo-France (HTTP ${res.status}).`);
  const json = await res.json();
  if (!json.access_token) throw new Error('Réponse de jeton Météo-France inattendue (pas de access_token).');
  return json.access_token;
}

/** Normalise la réponse "carte de vigilance" vers { departments: { "01": { level, hazards: [...] } } }.
 * Écrite défensivement : la forme exacte de la réponse Météo-France peut varier. */
function parseVigilanceResponse(raw) {
  const departments = {};
  const periods = raw?.product?.periods || raw?.periods || [];
  // On prend la période "aujourd'hui" (échéance J), sinon la première disponible.
  const period = periods.find((p) => p?.echeance === 'J') || periods[0];
  const zones = period?.per_zone_data || period?.timelaps?.per_zone_data || [];

  zones.forEach((zone) => {
    const code = String(zone.domain_id || zone.dept || '').trim();
    if (!code || code === 'FRA') return;
    const level = Number(zone.max_color_id ?? zone.color_id ?? 1);
    const hazardEntries = zone.timelaps_risk || zone.risks || [];
    const hazards = hazardEntries
      .filter((h) => Number(h.risk_color_id ?? h.color_id ?? 1) >= 2)
      .map((h) => ({ code: Number(h.risk_id ?? h.id), level: Number(h.risk_color_id ?? h.color_id) }));
    departments[code] = { level, hazards };
  });

  return { updatedAt: raw?.update_time || raw?.product?.update_time || new Date().toISOString(), departments };
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non supportée.' });
    return;
  }

  if (cache.data && cache.expiresAt > Date.now()) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json(cache.data);
    return;
  }

  try {
    const token = await getAccessToken();
    const vigRes = await fetch(VIGILANCE_URL, { headers: { Authorization: `Bearer ${token}` } });
    if (!vigRes.ok) throw new Error(`API vigilance Météo-France : HTTP ${vigRes.status}.`);
    const raw = await vigRes.json();
    const normalized = parseVigilanceResponse(raw);

    cache = { data: normalized, expiresAt: Date.now() + CACHE_TTL_MS };
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json(normalized);
  } catch (err) {
    res.status(502).json({ error: err.message || 'Vigilance nationale indisponible.' });
  }
};
