import { ISLAND_R, PLAZA_R, STATION_R, islandEdge } from './world.js';

const $ = (sel) => document.querySelector(sel);
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

export function createHud(projects, profile) {
  const panel = $('#panel');
  const counter = $('#counter-value');
  const counterBar = $('#counter-bar');
  const toastEl = $('#toast');
  const mini = $('#minimap');
  const mctx = mini.getContext('2d');
  let toastTimer = null;
  let currentId = null;

  function projectHtml(p) {
    const n = projects.indexOf(p) + 1;
    return `
      <div class="panel-kicker" style="--c:${hex(p.color)}">Proyecto ${n} de ${projects.length}</div>
      <h2>${esc(p.name)}</h2>
      <p class="panel-tagline">${esc(p.tagline)}</p>
      <p class="panel-desc">${esc(p.description)}</p>
      <ul class="tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="actions">
        <a class="btn" href="${p.repo}" target="_blank" rel="noopener">Ver código</a>
        ${p.demo ? `<a class="btn btn-ghost" href="${p.demo}" target="_blank" rel="noopener">Abrir demo</a>` : ''}
      </div>
      <p class="panel-hint"><kbd>E</kbd> abre el repositorio</p>`;
  }

  function aboutHtml() {
    return `
      <div class="about-head">
        <img src="${profile.avatar}" alt="" width="64" height="64" />
        <div>
          <div class="panel-kicker" style="--c:#ff7a3d">Sobre mí</div>
          <h2>${esc(profile.name)} <span class="alias">aka ${esc(profile.alias)}</span></h2>
        </div>
      </div>
      <p class="panel-tagline">${esc(profile.bio)}</p>
      <p class="panel-desc">${esc(profile.role)}. Me muevo entre backends en Python y Go, frontends en Vue y React, y la parte de infraestructura: Docker, CI/CD con Jenkins y GitHub Actions, AWS. Cada pedestal con un haz de luz es uno de mis proyectos: ve a por ellos.</p>
      <ul class="tags">${profile.languages.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="actions">
        <a class="btn" href="${profile.github}" target="_blank" rel="noopener">GitHub @dsaub</a>
      </div>
      <p class="panel-hint"><kbd>E</kbd> abre mi GitHub</p>`;
  }

  function buildTextMode() {
    $('#textmode-list').innerHTML = projects
      .map(
        (p) => `
      <article class="tm-card" style="--c:${hex(p.color)}">
        <h3>${esc(p.name)}</h3>
        <p class="panel-tagline">${esc(p.tagline)}</p>
        <p>${esc(p.description)}</p>
        <ul class="tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <div class="actions">
          <a class="btn" href="${p.repo}" target="_blank" rel="noopener">Ver código</a>
          ${p.demo ? `<a class="btn btn-ghost" href="${p.demo}" target="_blank" rel="noopener">Abrir demo</a>` : ''}
        </div>
      </article>`
      )
      .join('');
    $('#textmode-bio').textContent = profile.bio;
  }
  buildTextMode();

  return {
    show(id) {
      if (id === currentId) return;
      currentId = id;
      if (!id) {
        panel.classList.remove('open');
        return;
      }
      panel.innerHTML = id === 'about' ? aboutHtml() : projectHtml(projects.find((p) => p.id === id));
      panel.classList.remove('open');
      void panel.offsetWidth; // reinicia la animación
      panel.classList.add('open');
    },
    setCount(n) {
      counter.textContent = `${n}/${projects.length}`;
      counterBar.style.width = `${(n / projects.length) * 100}%`;
    },
    toast(html, ms = 2600) {
      toastEl.innerHTML = html;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
    },
    drawMinimap(player, stations, discovered, aboutPos, t) {
      const W = mini.width, H = mini.height;
      const scale = (W / 2 - 6) / (ISLAND_R + 3);
      const tx = (x) => W / 2 + x * scale;
      const ty = (z) => H / 2 + z * scale;
      mctx.clearRect(0, 0, W, H);

      mctx.fillStyle = '#3aa7e0';
      mctx.beginPath();
      mctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2);
      mctx.fill();

      mctx.fillStyle = '#f0dca4';
      mctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const r = islandEdge(a);
        mctx.lineTo(tx(Math.sin(a) * r), ty(-Math.cos(a) * r));
      }
      mctx.fill();
      mctx.fillStyle = '#6cc24a';
      mctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const r = islandEdge(a) - 4;
        mctx.lineTo(tx(Math.sin(a) * r), ty(-Math.cos(a) * r));
      }
      mctx.fill();

      mctx.strokeStyle = '#c9c2b4';
      mctx.lineWidth = 3;
      for (const s of stations) {
        mctx.beginPath();
        mctx.moveTo(tx(Math.sin(s.angle) * PLAZA_R), ty(-Math.cos(s.angle) * PLAZA_R));
        mctx.lineTo(tx(Math.sin(s.angle) * (STATION_R - 3)), ty(-Math.cos(s.angle) * (STATION_R - 3)));
        mctx.stroke();
      }
      mctx.fillStyle = '#c9c2b4';
      mctx.beginPath();
      mctx.arc(W / 2, H / 2, PLAZA_R * scale, 0, Math.PI * 2);
      mctx.fill();

      mctx.fillStyle = '#ff7a3d';
      mctx.fillRect(tx(aboutPos[0]) - 3, ty(aboutPos[1]) - 3, 6, 6);

      for (const s of stations) {
        const done = discovered.has(s.project.id);
        const pulse = done ? 0 : Math.sin(t * 5) * 1.2;
        mctx.fillStyle = done ? hex(s.project.color) : '#ffffff';
        mctx.strokeStyle = '#1d1b2a';
        mctx.lineWidth = 2;
        mctx.beginPath();
        mctx.arc(tx(s.x), ty(s.z), 5 + pulse, 0, Math.PI * 2);
        mctx.fill();
        mctx.stroke();
        if (!done) {
          mctx.fillStyle = '#1d1b2a';
          mctx.font = '700 8px sans-serif';
          mctx.textAlign = 'center';
          mctx.textBaseline = 'middle';
          mctx.fillText('?', tx(s.x), ty(s.z) + 0.5);
        }
      }

      // Jugador (flecha)
      mctx.save();
      mctx.translate(tx(player.pos.x), ty(player.pos.z));
      mctx.rotate(-player.facing + Math.PI);
      mctx.fillStyle = '#1d1b2a';
      mctx.beginPath();
      mctx.moveTo(0, -7);
      mctx.lineTo(5, 5);
      mctx.lineTo(0, 2);
      mctx.lineTo(-5, 5);
      mctx.closePath();
      mctx.fill();
      mctx.restore();
    },
  };
}
