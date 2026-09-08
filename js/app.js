// Point d'entrée : wiring DOM (délégation d'événements, pas de onclick
// inline) + orchestration des modules.

import { IMPACT_TEXT } from './data.js';
import {
  state, onUpdate,
  selectHazard, selectZone,
  renderHazardChips, renderGrid, renderDetail, pulseZone, findWorst,
} from './store.js';
import { initFeed, pushFeed, renderFeed } from './feed.js';
import { setMapView, loadStations } from './map.js';
import { openSheet, closeSheet, renderSevRow, pickSeverity, submitReport } from './report.js';
import { toggleSim, startSim } from './sim.js';
import { initTheme, renderThemePicker } from './theme.js';

const $ = (id) => document.getElementById(id);

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

function updateAlertBar() {
  const worst = findWorst();
  const bar = $('alertbar');
  if (worst && !bar.dataset.dismissed) {
    const conf = state[worst.zone.id].confidence[worst.hazard.id];
    $('alertTitle').textContent = `Vigilance ${worst.lvl === 3 ? 'rouge' : 'orange'} — ${worst.hazard.label.toLowerCase()}`;
    $('alertBody').textContent = `${worst.zone.name} : ${IMPACT_TEXT[worst.hazard.id][worst.lvl](worst.zone.name)} (confiance ${conf}%)`;
    bar.classList.add('show');
  } else if (!worst) {
    bar.classList.remove('show');
  }
}
function dismissAlert() {
  const bar = $('alertbar');
  bar.dataset.dismissed = '1';
  bar.classList.remove('show');
  setTimeout(() => { delete bar.dataset.dismissed; }, 20000);
}

function refreshCarte() {
  renderHazardChips($('hazardChips'));
  renderGrid($('zoneGrid'));
  renderDetail($('zoneDetail'));
}

// Toute modification de l'état (signalement citoyen ou simulation) doit
// se répercuter au même endroit : carte, détail, alerte.
onUpdate(() => {
  refreshCarte();
  updateAlertBar();
});

function wireTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      $('view-' + btn.dataset.tab).classList.add('active');
    });
  });
}

function wireCarte() {
  $('hazardChips').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-hazard]');
    if (!btn) return;
    selectHazard(btn.dataset.hazard);
    refreshCarte();
  });
  $('zoneGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-zone]');
    if (!btn) return;
    selectZone(btn.dataset.zone);
    renderDetail($('zoneDetail'));
  });
  $('btnViewSchema').addEventListener('click', () => setMapView('schema'));
  $('btnViewReal').addEventListener('click', () => setMapView('real'));
  $('refreshStationsBtn').addEventListener('click', () => loadStations());
}

function wireAlertBar() {
  $('alertCloseBtn').addEventListener('click', dismissAlert);
}

function wireReportSheet() {
  $('fabReport').addEventListener('click', openSheet);
  $('sheetBackdrop').addEventListener('click', closeSheet);
  $('fSevRow').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sev]');
    if (!btn) return;
    pickSeverity(Number(btn.dataset.sev));
  });
  $('submitBtn').addEventListener('click', () => submitReport({ showToast }));
}

function wireSim() {
  $('simSwitch').addEventListener('click', toggleSim);
  startSim((zoneId) => { refreshCarte(); pulseZone(zoneId); });
}

function wireTheme() {
  renderThemePicker($('themeGrid'));
}

function wireInstallAndSW() {
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $('installBtn').classList.add('show');
  });
  $('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $('installBtn').classList.remove('show');
  });

  const statusEl = $('swStatus');
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(() => { if (statusEl) statusEl.innerHTML = '<span class="status-dot ok"></span>Mode hors-ligne activé'; })
        .catch(() => { if (statusEl) statusEl.innerHTML = '<span class="status-dot bad"></span>Mode hors-ligne indisponible'; });
    });
  } else if (statusEl) {
    statusEl.innerHTML = '<span class="status-dot bad"></span>Service worker non supporté par ce navigateur';
  }
}

function init() {
  initTheme();
  initFeed($('feed'));
  wireTabs();
  wireCarte();
  wireAlertBar();
  wireReportSheet();
  wireSim();
  wireTheme();
  wireInstallAndSW();

  refreshCarte();
  renderFeed();
  renderSevRow();
  updateAlertBar();

  pushFeed({ zoneId: 'bord', zoneName: 'Bord-de-Rivière', hazardId: 'inondation', level: 2, contributor: null, text: 'Mise à jour modèle — inondation : ' + IMPACT_TEXT.inondation[2]('Bord-de-Rivière') });
  pushFeed({ zoneId: 'pont', zoneName: 'Vieux-Pont', hazardId: 'inondation', level: 1, contributor: { name: 'Marc D.', trust: 88 }, text: 'Signalement citoyen — inondation : sol saturé, petites flaques sur le pont.' });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
