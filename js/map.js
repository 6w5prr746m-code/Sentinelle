// Carte réelle — stations Hub'Eau/Vigicrues réelles, sur toute la France.
// Utilise l'API publique Hub'Eau (hydrométrie temps réel), ouverte,
// gratuite, sans clé, compatible CORS. Par défaut on affiche deux stations
// vérifiées sur la Seine à Paris ; une recherche de commune ou la
// géolocalisation interroge ensuite les stations réelles les plus proches
// dans tout le pays (via le référentiel Hub'Eau, filtré par département).

import { searchCommunes, reverseGeocode, departmentFromCitycode, haversineKm, locateBrowser } from './geo.js';

const DEFAULT_STATIONS = [
  { code: 'F700000103', name: 'Seine — Paris Austerlitz', lat: 48.845, lon: 2.366 },
  { code: 'F700000112', name: 'Seine — Pont des Invalides', lat: 48.864, lon: 2.311 },
];
const DEFAULT_CENTER = { lat: 48.853, lon: 2.34, zoom: 12 };
const NEAREST_COUNT = 6;

let realMapInstance = null;
let realMapMarkers = {};
let autoRefreshTimer = null;
let currentStations = DEFAULT_STATIONS;

const BLOCKS = { schema: 'schematicBlock', real: 'realBlock', vigilance: 'vigilanceBlock' };
const BUTTONS = { schema: 'btnViewSchema', real: 'btnViewReal', vigilance: 'btnViewVigilance' };

export function setMapView(mode) {
  Object.entries(BLOCKS).forEach(([key, id]) => {
    document.getElementById(id).style.display = key === mode ? '' : 'none';
  });
  Object.entries(BUTTONS).forEach(([key, id]) => {
    const btn = document.getElementById(id);
    btn.classList.toggle('active', key === mode);
    btn.setAttribute('aria-pressed', String(key === mode));
  });

  if (mode === 'real') {
    if (!realMapInstance) initRealMap();
    setTimeout(() => { if (realMapInstance) realMapInstance.invalidateSize(); }, 50);
    if (!document.getElementById('stationList').dataset.loaded) loadStations();
    if (!autoRefreshTimer) autoRefreshTimer = setInterval(loadStations, 5 * 60 * 1000);
  } else if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

function initRealMap() {
  if (typeof L === 'undefined') {
    document.getElementById('realMap').innerHTML = '<div class="offline-msg">Bibliothèque cartographique indisponible hors-ligne. Reconnectez-vous pour afficher la carte réelle.</div>';
    return;
  }
  realMapInstance = L.map('realMap', { zoomControl: true }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lon], DEFAULT_CENTER.zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(realMapInstance);
  placeMarkers();
}

function placeMarkers() {
  if (!realMapInstance) return;
  Object.values(realMapMarkers).forEach((m) => realMapInstance.removeLayer(m));
  realMapMarkers = {};
  currentStations.forEach((st) => {
    const marker = L.marker([st.lat, st.lon]).addTo(realMapInstance);
    marker.bindPopup(`<b>${st.name}</b><br>Chargement des données…`);
    realMapMarkers[st.code] = marker;
  });
}

async function fetchSeries(code, grandeur) {
  const url = `https://hubeau.eaufrance.fr/api/v2/hydrometrie/observations_tr?code_entite=${code}&grandeur_hydro=${grandeur}&size=20&fields=date_obs,resultat_obs&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  const rows = (json && json.data) || [];
  rows.sort((a, b) => new Date(b.date_obs) - new Date(a.date_obs));
  return rows;
}

/** Interroge le référentiel Hub'Eau pour un département, et renvoie les
 * stations les plus proches d'un point donné (calcul de distance côté
 * client — l'API ne garantit pas un tri géographique fiable partout). */
async function fetchNearestStations(deptCode, lat, lon) {
  const url = `https://hubeau.eaufrance.fr/api/v2/hydrometrie/referentiel/stations?code_departement=${deptCode}&format=json&size=200&fields=code_station,libelle_station,longitude_station,latitude_station,en_service`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  const rows = ((json && json.data) || []).filter((r) => r.en_service !== false && r.latitude_station && r.longitude_station);
  rows.forEach((r) => { r._dist = haversineKm(lat, lon, r.latitude_station, r.longitude_station); });
  rows.sort((a, b) => a._dist - b._dist);
  return rows.slice(0, NEAREST_COUNT).map((r) => ({
    code: r.code_station,
    name: r.libelle_station,
    lat: r.latitude_station,
    lon: r.longitude_station,
    distanceKm: r._dist,
  }));
}

async function applyArea(label, lat, lon, citycode) {
  const status = document.getElementById('stationSearchStatus');
  if (status) status.textContent = `Recherche des stations proches de ${label}…`;
  try {
    const dept = departmentFromCitycode(citycode);
    const stations = dept ? await fetchNearestStations(dept, lat, lon) : [];
    currentStations = stations.length ? stations : DEFAULT_STATIONS;
    const areaLabel = stations.length ? label : `${label} — aucune station Hub'Eau active trouvée à proximité, stations par défaut affichées`;
    if (status) status.textContent = areaLabel;
    if (realMapInstance) {
      realMapInstance.setView([lat, lon], 11);
      placeMarkers();
    }
    await loadStations();
  } catch (err) {
    if (status) status.textContent = `Recherche indisponible (${err.message}). Vérifiez votre connexion.`;
  }
}

export async function searchArea(query) {
  const status = document.getElementById('stationSearchStatus');
  if (!query || !query.trim()) return;
  try {
    if (status) status.textContent = 'Recherche de la commune…';
    const results = await searchCommunes(query.trim());
    if (!results.length) { if (status) status.textContent = `Aucune commune trouvée pour "${query}".`; return; }
    const c = results[0];
    await applyArea(c.label, c.lat, c.lon, c.citycode);
  } catch (err) {
    if (status) status.textContent = `Recherche indisponible (${err.message}). Vérifiez votre connexion.`;
  }
}

export async function locateAndSearch() {
  const status = document.getElementById('stationSearchStatus');
  try {
    if (status) status.textContent = 'Localisation en cours…';
    const { lat, lon } = await locateBrowser();
    const commune = await reverseGeocode(lat, lon);
    const label = commune ? commune.label : 'ma position';
    await applyArea(label, lat, lon, commune ? commune.citycode : null);
  } catch (err) {
    if (status) status.textContent = err.message || 'Géolocalisation indisponible.';
  }
}

function trendArrow(series) {
  if (series.length < 2) return '';
  const delta = series[0].resultat_obs - series[series.length - 1].resultat_obs;
  if (Math.abs(delta) < series[0].resultat_obs * 0.01) return '<span title="Stable">→</span>';
  return delta > 0 ? '<span title="En hausse" style="color:var(--rouge)">↗</span>' : '<span title="En baisse" style="color:var(--vert)">↘</span>';
}

export async function loadStations() {
  const list = document.getElementById('stationList');
  list.dataset.loaded = '1';
  list.innerHTML = currentStations.map((st) => `
    <div class="stationCard" id="scard-${st.code}">
      <div><div class="sname">${st.name}</div><div class="scode">${st.code}${st.distanceKm != null ? ' · ' + st.distanceKm.toFixed(1) + ' km' : ''}</div></div>
      <div class="svals">Chargement…</div>
    </div>`).join('');

  for (const st of currentStations) {
    try {
      const [hSeries, qSeries] = await Promise.all([fetchSeries(st.code, 'H'), fetchSeries(st.code, 'Q')]);
      const h = hSeries[0], q = qSeries[0];
      const hCm = h ? (h.resultat_obs / 10).toFixed(0) : null; // mm -> cm
      const qM3 = q ? (q.resultat_obs / 1000).toFixed(1) : null; // L/s -> m3/s
      const ts = (h && h.date_obs) || (q && q.date_obs);
      const arrow = hSeries.length ? trendArrow(hSeries) : '';
      const el = document.getElementById('scard-' + st.code);
      if (el) {
        el.querySelector('.svals').innerHTML = `
          <b>${hCm !== null ? hCm + ' cm ' + arrow : '—'}</b>
          ${qM3 !== null ? qM3 + ' m³/s · ' : ''}${ts ? new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
        `;
      }
      const marker = realMapMarkers[st.code];
      if (marker) {
        marker.setPopupContent(`<b>${st.name}</b><br>Hauteur : ${hCm !== null ? hCm + ' cm' : 'indisponible'}<br>Débit : ${qM3 !== null ? qM3 + ' m³/s' : 'indisponible'}${ts ? '<br><small>' + new Date(ts).toLocaleString('fr-FR') + '</small>' : ''}`);
      }
    } catch (err) {
      const el = document.getElementById('scard-' + st.code);
      if (el) el.querySelector('.svals').innerHTML = '<span style="color:var(--muted)">Indisponible</span>';
      const marker = realMapMarkers[st.code];
      if (marker) marker.setPopupContent(`<b>${st.name}</b><br>Données momentanément indisponibles.`);
    }
  }
}
