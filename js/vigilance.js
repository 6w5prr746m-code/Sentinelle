// Vigilance météo nationale (tous départements) — consomme la fonction
// serverless /api/vigilance (voir api/vigilance.js), qui garde la clé
// Météo-France côté serveur. Sur un déploiement 100% statique (GitHub
// Pages), cette route n'existe pas : on le détecte et on l'affiche
// clairement plutôt que de planter.

import { DEPARTMENTS, departmentName, VIGILANCE_HAZARDS, VIGILANCE_LEVEL_LABEL } from './departments.js';
import { escapeHtml } from './utils.js';

const LEVEL_COLOR = ['', 'var(--vert)', 'var(--jaune)', 'var(--orange)', 'var(--rouge)'];

let lastData = null;
let loaded = false;

// Compare sans tenir compte des accents ("rhone" doit trouver "Rhône").
function normalize(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function renderList(filter = '') {
  const el = document.getElementById('vigilanceList');
  if (!el) return;
  const q = normalize(filter.trim());

  const codes = Object.keys(DEPARTMENTS);
  const rows = codes
    .map((code) => {
      const entry = lastData?.departments?.[code];
      const level = entry?.level || 1;
      const name = departmentName(code);
      return { code, name, level, hazards: entry?.hazards || [] };
    })
    .filter((r) => !q || normalize(r.name).includes(q) || r.code.toLowerCase().includes(q))
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, 'fr'));

  if (!rows.length) {
    el.innerHTML = '<div class="vig-empty">Aucun département ne correspond à ce filtre.</div>';
    return;
  }

  el.innerHTML = rows.map((r) => {
    const icons = r.hazards.map((h) => VIGILANCE_HAZARDS[h.code]?.icon || '').join(' ');
    return `<div class="vig-row">
      <div class="vig-color" style="background:${LEVEL_COLOR[r.level] || LEVEL_COLOR[1]}" title="${VIGILANCE_LEVEL_LABEL[r.level] || ''}"></div>
      <div class="vig-name">${escapeHtml(r.name)} <span style="color:var(--muted);font-weight:400;">(${r.code})</span></div>
      <div class="vig-hazards">${icons}</div>
    </div>`;
  }).join('');
}

export async function loadVigilance() {
  const status = document.getElementById('vigilanceSource');
  const badge = document.getElementById('vigilanceLiveBadge');
  loaded = true;
  try {
    const res = await fetch('/api/vigilance');
    if (res.status === 404) {
      if (status) status.textContent = "Fonctionnalité disponible uniquement sur le déploiement complet (Vercel + fonction serverless + clé API Météo-France — voir README).";
      if (badge) badge.style.display = 'none';
      renderList();
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    lastData = await res.json();
    if (status) status.textContent = `Mis à jour ${new Date(lastData.updatedAt).toLocaleString('fr-FR')} — source : Météo-France (vigilance nationale).`;
    renderList(document.getElementById('vigilanceFilter')?.value || '');
  } catch (err) {
    if (status) status.textContent = `Vigilance nationale indisponible (${err.message}).`;
    renderList();
  }
}

export function filterVigilance(query) {
  renderList(query);
}

export function isVigilanceLoaded() {
  return loaded;
}
