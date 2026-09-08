// Flux d'alertes & signalements (liste bornée à 40 entrées).

import { escapeHtml, timeAgo, trustBadge } from './utils.js';

let feed = [];
let feedSeq = 1;
let feedEl = null;

export function initFeed(el) {
  feedEl = el;
}

export function pushFeed(item) {
  item.id = feedSeq++;
  item.ts = Date.now();
  feed.unshift(item);
  feed = feed.slice(0, 40);
  renderFeed();
}

export function renderFeed() {
  if (!feedEl) return;
  if (feed.length === 0) {
    feedEl.innerHTML = '<p style="padding:14px 0;color:var(--muted);font-size:13px;">Aucun événement pour le moment.</p>';
    return;
  }
  const colors = ['var(--vert)', 'var(--jaune)', 'var(--orange)', 'var(--rouge)'];
  feedEl.innerHTML = feed.map((f) => `
    <div class="feed-item">
      <div class="bar" style="background:${colors[f.level]}"></div>
      <div class="content">
        <div class="row1"><span class="zoneName">${escapeHtml(f.zoneName)}</span><span class="time">${timeAgo(f.ts)}</span></div>
        <div class="txt">${escapeHtml(f.text)}</div>
        ${f.contributor ? trustBadge(f.contributor.trust) + ` <span style="font-size:11px;color:var(--muted);margin-left:4px;">${escapeHtml(f.contributor.name)}</span>` : ''}
      </div>
    </div>`).join('');
}

// Rafraîchit les libellés relatifs ("il y a X min") sans tout re-render.
setInterval(() => { if (feedEl && feed.length) renderFeed(); }, 30000);
