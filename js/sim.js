// Simulation en direct : fait vivre la démo avec de nouveaux
// signalements/mises à jour modèle toutes les ~9 secondes.

import { ZONES, HAZARDS, CONTRIBUTORS, IMPACT_TEXT } from './data.js';
import { state, currentHazard, recordUpdate } from './store.js';
import { pushFeed } from './feed.js';

let simOn = true;
let timer = null;

export function toggleSim() {
  simOn = !simOn;
  document.getElementById('simSwitch').classList.toggle('on', simOn);
  document.getElementById('simSwitch').setAttribute('aria-checked', String(simOn));
}

function tick(onZoneChanged) {
  if (!simOn) return;
  const z = ZONES[Math.floor(Math.random() * ZONES.length)];
  const h = HAZARDS[Math.floor(Math.random() * HAZARDS.length)];
  const dir = Math.random() < 0.55 ? 1 : -1;
  const cur = state[z.id][h.id];
  const next = Math.max(0, Math.min(3, cur + dir));
  if (next === cur) return;

  const contributor = Math.random() < 0.7 ? CONTRIBUTORS[Math.floor(Math.random() * CONTRIBUTORS.length)] : null;
  const prefix = contributor ? 'Signalement citoyen — ' : 'Mise à jour modèle — ';
  const item = recordUpdate({
    zoneId: z.id, hazardId: h.id, level: next,
    confidenceDelta: Math.random() < 0.5 ? 3 : -2,
    contributor,
    text: prefix + h.label.toLowerCase() + ' : ' + IMPACT_TEXT[h.id][next](z.name),
  });
  pushFeed(item);

  if (currentHazard === h.id && onZoneChanged) onZoneChanged(z.id);
}

export function startSim(onZoneChanged) {
  if (timer) clearInterval(timer);
  timer = setInterval(() => tick(onZoneChanged), 9000);
}
