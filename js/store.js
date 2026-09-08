// État central de la démo (niveaux de risque par quartier/aléa) + rendu
// de la carte schématique, du détail de zone et de la barre d'alerte.
// Point d'entrée unique pour modifier l'état, utilisé à la fois par le
// formulaire de signalement citoyen et par la simulation automatique —
// évite la duplication de logique entre les deux.

import { ZONES, HAZARDS, IMPACT_TEXT, LEVEL_LABEL, buildInitialState } from './data.js';

export const state = buildInitialState();
export let currentHazard = 'inondation';
export let selectedZone = null;

const listeners = new Set();
export function onUpdate(fn) {
  listeners.add(fn);
}
function notify(event) {
  listeners.forEach((fn) => fn(event));
}

/** Applique une mise à jour de niveau de risque pour une zone/aléa donné,
 * ajuste la confiance, et notifie les abonnés (feed, rendu carte, alertes). */
export function recordUpdate({ zoneId, hazardId, level, confidenceDelta = 0, contributor = null, text = null }) {
  const z = ZONES.find((x) => x.id === zoneId);
  const h = HAZARDS.find((x) => x.id === hazardId);
  if (!z || !h) return null;
  state[zoneId][hazardId] = level;
  if (confidenceDelta) {
    state[zoneId].confidence[hazardId] = Math.max(50, Math.min(99, state[zoneId].confidence[hazardId] + confidenceDelta));
  }
  const item = {
    zoneId, zoneName: z.name, hazardId, level, contributor,
    text: text || IMPACT_TEXT[hazardId][level](z.name),
  };
  notify(item);
  return item;
}

export function selectHazard(id) {
  currentHazard = id;
  notify({ type: 'hazard-change' });
}

export function selectZone(id) {
  selectedZone = id;
  notify({ type: 'zone-select' });
}

export function renderHazardChips(el) {
  el.innerHTML = HAZARDS.map((h) => `
    <button type="button" class="chip ${h.id === currentHazard ? 'active' : ''}" data-hazard="${h.id}" aria-pressed="${h.id === currentHazard}">
      ${h.icon} ${h.label}
    </button>`).join('');
}

export function renderGrid(el) {
  el.innerHTML = ZONES.map((z) => {
    const lvl = state[z.id][currentHazard];
    return `<button type="button" class="zone lvl-${lvl}" data-zone="${z.id}" aria-label="${z.name} — ${LEVEL_LABEL[lvl]}">
      <div class="pulse" id="pulse-${z.id}"></div>
      <div class="name">${z.name}</div>
      <div class="val">${LEVEL_LABEL[lvl]}</div>
    </button>`;
  }).join('');
}

export function renderDetail(el) {
  if (!selectedZone) {
    el.innerHTML = `<h3>Sélectionnez un quartier</h3><p>Touchez une tuile de la carte pour voir la prévision d'impact détaillée et les derniers signalements.</p>`;
    return;
  }
  const z = ZONES.find((x) => x.id === selectedZone);
  const s = state[selectedZone];
  const lvl = s[currentHazard];
  const conf = s.confidence[currentHazard];
  const txt = IMPACT_TEXT[currentHazard][lvl](z.name);
  const hazardLabel = HAZARDS.find((h) => h.id === currentHazard).label;
  el.innerHTML = `
    <h3>${z.name} — ${hazardLabel}</h3>
    <p>${txt}</p>
    <div class="confidence"><span>Confiance</span><div class="bar"><div class="fill" style="width:${conf}%"></div></div><span>${conf}%</span></div>
  `;
}

export function pulseZone(zoneId) {
  const tile = document.getElementById('pulse-' + zoneId);
  if (!tile) return;
  tile.parentElement.classList.remove('updated');
  void tile.offsetWidth;
  tile.parentElement.classList.add('updated');
}

export function findWorst() {
  let worst = null;
  ZONES.forEach((z) => {
    HAZARDS.forEach((h) => {
      const lvl = state[z.id][h.id];
      if (lvl >= 2 && (!worst || lvl > worst.lvl)) worst = { lvl, zone: z, hazard: h };
    });
  });
  return worst;
}
