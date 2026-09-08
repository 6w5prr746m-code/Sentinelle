// Formulaire de signalement citoyen (bottom sheet).

import { ZONES, HAZARDS, LEVEL_LABEL } from './data.js';
import { state, selectedZone, recordUpdate, pulseZone } from './store.js';
import { pushFeed } from './feed.js';

let selSeverity = 1;

export function openSheet() {
  const zSel = document.getElementById('fZone');
  zSel.innerHTML = ZONES.map((z) => `<option value="${z.id}">${z.name}</option>`).join('');
  if (selectedZone) zSel.value = selectedZone;
  document.getElementById('sheetBackdrop').classList.add('show');
  document.getElementById('sheet').classList.add('show');
  document.getElementById('fZone').focus();
}

export function closeSheet() {
  document.getElementById('sheetBackdrop').classList.remove('show');
  document.getElementById('sheet').classList.remove('show');
}

export function renderSevRow() {
  const row = document.getElementById('fSevRow');
  row.innerHTML = LEVEL_LABEL.map((l, i) => `<button type="button" class="sev-btn ${i === selSeverity ? 'sel-' + i : ''}" data-sev="${i}" aria-pressed="${i === selSeverity}">${l}</button>`).join('');
}

export function pickSeverity(i) {
  selSeverity = i;
  renderSevRow();
}

export function submitReport({ onSubmitted, showToast }) {
  const zid = document.getElementById('fZone').value;
  const hz = document.getElementById('fHazard').value;
  const note = document.getElementById('fNote').value.trim();
  const z = ZONES.find((x) => x.id === zid);
  const hazardLabel = HAZARDS.find((h) => h.id === hz).label;
  const me = { name: 'Vous', trust: 60 };
  const level = Math.max(state[zid][hz], selSeverity);

  const item = recordUpdate({
    zoneId: zid, hazardId: hz, level, confidenceDelta: 4, contributor: me,
    text: note ? `Signalement : ${note}` : `Signalement ${hazardLabel.toLowerCase()} — gravité "${LEVEL_LABEL[selSeverity]}"`,
  });
  pushFeed(item);

  document.getElementById('fNote').value = '';
  closeSheet();
  showToast('Merci ! Votre signalement recalibre la carte en temps réel.');
  pulseZone(zid);
  if (onSubmitted) onSubmitted();
}
