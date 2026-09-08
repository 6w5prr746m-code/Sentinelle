// Géolocalisation & géocodage de communes françaises — 100% client, sans
// clé : API Adresse (api-adresse.data.gouv.fr), service public de la Base
// Adresse Nationale, ouvert et compatible CORS.

const GEOCODE_URL = 'https://api-adresse.data.gouv.fr/search/';

/** Recherche des communes correspondant à une requête libre ("Lyon", "Nice"…). */
export async function searchCommunes(query) {
  const url = `${GEOCODE_URL}?q=${encodeURIComponent(query)}&type=municipality&limit=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  const features = (json && json.features) || [];
  return features.map((f) => ({
    label: f.properties.label,
    citycode: f.properties.citycode,
    postcode: f.properties.postcode,
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
  }));
}

/** Géocodage inverse (lat/lon -> commune) pour la géolocalisation navigateur. */
export async function reverseGeocode(lat, lon) {
  const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}&type=municipality`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  const f = (json && json.features && json.features[0]) || null;
  if (!f) return null;
  return {
    label: f.properties.label,
    citycode: f.properties.citycode,
    postcode: f.properties.postcode,
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
  };
}

/** Déduit le code département (2 chars, ou 3 pour les DOM) depuis un code INSEE commune. */
export function departmentFromCitycode(citycode) {
  if (!citycode) return null;
  if (citycode.startsWith('97') || citycode.startsWith('98')) return citycode.slice(0, 3);
  if (citycode.startsWith('2A') || citycode.startsWith('2B')) return citycode.slice(0, 2);
  return citycode.slice(0, 2);
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Position du navigateur (nécessite HTTPS + autorisation utilisateur). */
export function locateBrowser() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) { reject(new Error('Géolocalisation non supportée par ce navigateur.')); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err.message || 'Géolocalisation refusée.')),
      { timeout: 8000, maximumAge: 300000 }
    );
  });
}
