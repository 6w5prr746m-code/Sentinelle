// Gestion des thèmes visuels (identité de marque : couleurs, typo, rayons).
// La sémantique des couleurs de risque (vert/jaune/orange/rouge) ne fait
// jamais partie du thème : elle reste identique partout, par sécurité.

const STORAGE_KEY = 'sentinelle-theme';

export const THEMES = [
  { id: 'sentinelle', name: 'Sentinelle', tagline: 'Thème original — navy & teal', swatch: ['#12213d', '#0e7c7b'] },
  { id: 'netflix', name: 'Netflix', tagline: 'Noir profond, rouge intense', swatch: ['#141414', '#e50914'] },
  { id: 'meta', name: 'Meta', tagline: 'Bleu clair, arrondi, épuré', swatch: ['#0866ff', '#3a86ff'] },
  { id: 'capcut', name: 'CapCut', tagline: 'Sombre néon, dégradé vibrant', swatch: ['#7c4dff', '#ff2e9f'] },
  { id: 'instagram', name: 'Instagram', tagline: 'Dégradé violet → rose → orange', swatch: ['#833ab4', '#fd1d1d'] },
  { id: 'apple', name: 'Apple', tagline: 'Minimal, clair, typo système', swatch: ['#f5f5f7', '#0071e3'] },
];

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'sentinelle';
  } catch {
    return 'sentinelle';
  }
}

export function applyTheme(id) {
  const valid = THEMES.some((t) => t.id === id) ? id : 'sentinelle';
  document.documentElement.setAttribute('data-theme', valid);
  try {
    localStorage.setItem(STORAGE_KEY, valid);
  } catch {
    /* stockage indisponible (navigation privée…) — le thème reste actif pour la session */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--header-1').trim();
    if (c) meta.setAttribute('content', c);
  }
  return valid;
}

export function initTheme() {
  return applyTheme(getStoredTheme());
}

export function renderThemePicker(container, onChange) {
  const current = document.documentElement.getAttribute('data-theme') || 'sentinelle';
  container.innerHTML = THEMES.map((t) => `
    <button type="button" class="theme-card ${t.id === current ? 'active' : ''}" data-theme-id="${t.id}" aria-pressed="${t.id === current}">
      <div class="swatch" style="background:linear-gradient(135deg,${t.swatch[0]},${t.swatch[1]})"></div>
      <div class="tname">${t.name}<span class="check">✓</span></div>
      <div class="ttag">${t.tagline}</div>
    </button>`).join('');

  if (container.dataset.wired) return;
  container.dataset.wired = '1';
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-card');
    if (!btn) return;
    const id = applyTheme(btn.dataset.themeId);
    container.querySelectorAll('.theme-card').forEach((c) => {
      const active = c.dataset.themeId === id;
      c.classList.toggle('active', active);
      c.setAttribute('aria-pressed', String(active));
    });
    if (onChange) onChange(id);
  });
}
