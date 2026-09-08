// Carte réelle — stations Hub'Eau/Vigicrues réelles (Seine à Paris).
// Utilise l'API publique Hub'Eau (hydrométrie temps réel), ouverte,
// gratuite, sans clé. Aucune donnée n'est ici simulée : seules les
// stations dont le code a pu être vérifié sont listées — mieux vaut
// deux stations fiables que des codes non vérifiés qui échoueraient
// silencieusement.

const REAL_STATIONS = [
  { code: 'F700000103', name: 'Seine — Paris Austerlitz', lat: 48.845, lon: 2.366 },
  { code: 'F700000112', name: 'Seine — Pont des Invalides', lat: 48.864, lon: 2.311 },
];

let realMapInstance = null;
const realMapMarkers = {};
let autoRefreshTimer = null;

export function setMapView(mode) {
  const schema = mode === 'schema';
  document.getElementById('schematicBlock').style.display = schema ? '' : 'none';
  document.getElementById('realBlock').style.display = schema ? 'none' : '';
  document.getElementById('btnViewSchema').classList.toggle('active', schema);
  document.getElementById('btnViewReal').classList.toggle('active', !schema);
  document.getElementById('btnViewSchema').setAttribute('aria-pressed', String(schema));
  document.getElementById('btnViewReal').setAttribute('aria-pressed', String(!schema));

  if (!schema) {
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
  realMapInstance = L.map('realMap', { zoomControl: true }).setView([48.853, 2.34], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(realMapInstance);
  REAL_STATIONS.forEach((st) => {
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

function trendArrow(series) {
  if (series.length < 2) return '';
  const delta = series[0].resultat_obs - series[series.length - 1].resultat_obs;
  if (Math.abs(delta) < series[0].resultat_obs * 0.01) return '<span title="Stable">→</span>';
  return delta > 0 ? '<span title="En hausse" style="color:var(--rouge)">↗</span>' : '<span title="En baisse" style="color:var(--vert)">↘</span>';
}

export async function loadStations() {
  const list = document.getElementById('stationList');
  list.dataset.loaded = '1';
  list.innerHTML = REAL_STATIONS.map((st) => `
    <div class="stationCard" id="scard-${st.code}">
      <div><div class="sname">${st.name}</div><div class="scode">${st.code}</div></div>
      <div class="svals">Chargement…</div>
    </div>`).join('');

  for (const st of REAL_STATIONS) {
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
