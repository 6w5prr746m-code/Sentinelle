// Petits utilitaires partagés, sans dépendance au DOM applicatif.

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  return `il y a ${h} h`;
}

export function trustBadge(trust) {
  if (trust >= 70) return '<span class="badge trust">✓ Fiable</span>';
  if (trust >= 45) return '<span class="badge new">● Nouveau</span>';
  return '<span class="badge check">! À vérifier</span>';
}
