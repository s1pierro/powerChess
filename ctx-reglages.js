// ctx-reglages.js — onglet « Réglages » : affichage (plein écran), application (installation, état, version).

class ReglagesContext extends Context {
  build(el) {
    el.appendChild(mkWaveHeader(uiSvg('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>')));
    this.list = document.createElement('div');
    this.list.style.paddingBottom = '1.5em';
    el.appendChild(this.list);
    this.refresh();
    if (window.PWA) PWA.on(() => { if (this.el.classList.contains('ctx-active')) this.refresh(); });
  }

  onShow() { if (this.built) this.refresh(); }

  _row(icon, label, sub, onTap) {
    const row = document.createElement('div');
    row.className = 'ui-row';
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    row.innerHTML = uiSvg(icon);
    const t = document.createElement('span');
    t.append(label);
    if (sub) { const s = document.createElement('small'); s.textContent = sub; t.appendChild(s); }
    row.appendChild(t);
    if (onTap) {
      row.insertAdjacentHTML('beforeend', uiSvg('<path d="M9 5l7 7-7 7"/>', 'ui-chev'));
      row.addEventListener('click', onTap);
      row.addEventListener('keydown', ev => { if (ev.key === 'Enter') onTap(); });
    }
    return row;
  }

  _group(title, rows) {
    const g = document.createDocumentFragment();
    const h = document.createElement('div');
    h.className = 'ui-h';
    h.textContent = title;
    const box = document.createElement('div');
    box.className = 'ui-list';
    rows.filter(Boolean).forEach(r => box.appendChild(r));
    g.append(h, box);
    return g;
  }

  refresh() {
    const groups = [];
    if (window.PWA && PWA.fullscreenSupported()) {
      groups.push(this._group('Affichage', [
        this._row('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', 'Plein écran',
          PWA.isFullscreen() ? 'Activé · toucher pour quitter' : 'Désactivé · toucher pour activer', () => PWA.toggleFullscreen())
      ]));
    }
    const mode = window.PWA ? PWA.displayMode() : 'browser';
    groups.push(this._group('Application', [
      this._row('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>', 'Installation et état',
        (mode === 'browser' ? 'Dans le navigateur' : 'Installée') + (window.PWA && PWA.updateReady() ? ' · mise à jour disponible' : '') + ' · réinitialisation',
        () => { if (window.PWA) PWA.openPanel(); }),
      this._row('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>', APP.fullName, 'Version ' + APP.version, null)
    ]));
    this.list.replaceChildren(...groups);
  }
}

window.ReglagesContext = ReglagesContext;
